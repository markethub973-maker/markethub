/**
 * POST /api/telegram/webhook — Alex's Telegram bot (conversational CEO).
 *
 * The operator talks to Alex via Telegram (text or voice). Alex:
 *   1. Verifies incoming update comes from Telegram (via secret token)
 *   2. If voice, downloads + transcribes via OpenAI Whisper
 *   3. Pulls recent chat history from Supabase for context
 *   4. Fetches Brain advisor state (goals, pipeline) so Alex answers grounded
 *   5. Composes a reply in Romanian via Claude
 *   6. Sends back BOTH text + audio (OpenAI TTS) so the operator can listen
 *
 * Env required:
 *   - TELEGRAM_BOT_TOKEN        (from @BotFather)
 *   - TELEGRAM_WEBHOOK_SECRET   (set when registering webhook)
 *   - TELEGRAM_ALLOWED_CHAT_ID  (operator's chat id — whitelist)
 *   - OPENAI_API_KEY            (Whisper + TTS)
 *   - ANTHROPIC_API_KEY         (conversation reasoning)
 *   - BRAIN_CRON_SECRET         (fetch advisor state)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/llm";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { synthesizeSpeech } from "@/lib/tts";
import { parseProposals, saveProposalsForApproval, handleApproval } from "@/lib/alex-executor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TG_API = "https://api.telegram.org";

interface TelegramUpdate {
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number };
    text?: string;
    caption?: string;
    voice?: { file_id: string; duration: number };
    photo?: Array<{ file_id: string; file_size?: number; width?: number; height?: number }>;
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  };
}

async function tgApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function downloadTelegramFile(fileId: string): Promise<ArrayBuffer | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const info = await fetch(`${TG_API}/bot${token}/getFile?file_id=${fileId}`).then((r) => r.json()) as { result?: { file_path?: string } };
  if (!info.result?.file_path) return null;
  const fr = await fetch(`${TG_API}/file/bot${token}/${info.result.file_path}`);
  if (!fr.ok) return null;
  return await fr.arrayBuffer();
}

async function whisperTranscribe(audio: ArrayBuffer): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const fd = new FormData();
  fd.append("file", new Blob([audio], { type: "audio/ogg" }), "voice.ogg");
  fd.append("model", "whisper-1");
  fd.append("language", "ro");
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { text?: string };
    return d.text ?? null;
  } catch {
    return null;
  }
}

async function sendVoiceOrAudio(
  chatId: number,
  audio: ArrayBuffer,
  format: "opus" | "mp3",
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  if (format === "opus") {
    fd.append("voice", new Blob([audio], { type: "audio/ogg" }), "alex.ogg");
    await fetch(`${TG_API}/bot${token}/sendVoice`, { method: "POST", body: fd });
  } else {
    // ElevenLabs returns mp3 — Telegram Voice requires ogg/opus, so use sendAudio.
    fd.append("audio", new Blob([audio], { type: "audio/mpeg" }), "alex.mp3");
    fd.append("title", "Alex");
    fd.append("performer", "MarketHub Pro");
    await fetch(`${TG_API}/bot${token}/sendAudio`, { method: "POST", body: fd });
  }
}

async function fetchBrainContext(): Promise<string> {
  // Uses the fast state_only=1 path (skips the Anthropic call in advisor
  // entirely, cached 2 min). With Alex's full live DB context already in
  // the prompt chain, recommendations aren't needed here — just state.
  // Before this: ~10-15s LLM latency dropped Telegram messages.
  try {
    const res = await fetch(
      "https://markethubpromo.com/api/brain/advisor?state_only=1",
      {
        headers: { "x-brain-cron-secret": process.env.BRAIN_CRON_SECRET ?? "" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return "";
    const d = (await res.json()) as { state?: Record<string, unknown> };
    return `Current state: ${JSON.stringify(d.state ?? {})}`;
  } catch {
    return "";
  }
}

/**
 * Pull REAL live data from DB so Alex can answer factual questions without
 * asking Eduard for CSV/export. Every Telegram conversation starts with this
 * context so Alex knows the actual state of prospects, strategies, activity.
 */
async function fetchLiveDbContext(): Promise<string> {
  try {
    const svc = createServiceClient();

    // Top 5 highest-fit prospects not yet contacted
    const { data: topProspects } = await svc
      .from("brain_global_prospects")
      .select("domain, business_name, country_code, email, detected_needs, fit_score")
      .eq("outreach_status", "prospect")
      .order("fit_score", { ascending: false, nullsFirst: false })
      .limit(5);

    // Recent outreach state
    const { data: outreachStats } = await svc
      .from("outreach_log")
      .select("status", { count: "exact", head: false })
      .limit(100);

    const sentCount = (outreachStats ?? []).filter((r) => r.status === "sent").length;
    const repliedCount = (outreachStats ?? []).filter((r) => r.status === "replied").length;

    // Active strategies
    const { data: activeStrategies } = await svc
      .from("brain_strategy_stack")
      .select("rank, name, current_status, kpi_current")
      .in("current_status", ["active", "planned"])
      .order("rank")
      .limit(5);

    const { count: totalProspects } = await svc
      .from("brain_global_prospects")
      .select("id", { count: "exact", head: true });

    const { count: countriesCount } = await svc
      .from("brain_target_countries")
      .select("id", { count: "exact", head: true });

    // Per-country + per-city prospect breakdown so "câți NY / DE / Cluj?"
    // has an immediate DB-backed answer without a round-trip to Eduard.
    const { data: allForBreakdown } = await svc
      .from("brain_global_prospects")
      .select("country_code, vertical, snippet, email")
      .limit(500);
    const rowsAll = allForBreakdown ?? [];
    const byCountry: Record<string, number> = {};
    let nyMatches = 0;
    let laMatches = 0;
    let emailCount = 0;
    for (const r of rowsAll) {
      const cc = (r.country_code as string | null) ?? "(none)";
      byCountry[cc] = (byCountry[cc] ?? 0) + 1;
      if (r.email) emailCount += 1;
      const s = ((r.snippet as string | null) ?? "").toLowerCase();
      if (s.includes("new york") || s.includes("manhattan") || s.includes("brooklyn") || s.includes("nyc")) nyMatches += 1;
      if (s.includes("los angeles") || s.includes("santa monica") || s.includes("hollywood")) laMatches += 1;
    }
    const countryLine = Object.entries(byCountry)
      .sort(([, a], [, b]) => b - a)
      .map(([c, n]) => `${c}=${n}`)
      .join(", ");

    return `
LIVE DB STATE (queried right now — use these facts, NEVER estimate "5-15" style ranges):

📊 PROSPECTS:
- Total: ${totalProspects ?? 0} în ${countriesCount ?? 0} țări target
- Per țară: ${countryLine}
- New York (snippet match): ${nyMatches}
- Los Angeles (snippet match): ${laMatches}
- Cu email valid: ${emailCount}/${rowsAll.length}
- Top 5 neconversați:
${(topProspects ?? []).map((p) => `  · ${p.country_code ?? "?"} | ${p.business_name ?? "?"} (${p.domain}) | ${p.email ?? "no email"} | fit ${p.fit_score ?? "-"}/100`).join("\n")}

📧 OUTREACH:
- Trimise: ${sentCount}
- Răspunsuri: ${repliedCount} (${sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0}% rate)

🎯 STRATEGII ACTIVE/PLANIFICATE:
${(activeStrategies ?? []).map((s) => `  · #${s.rank} ${s.name} — ${s.current_status}`).join("\n")}

🛠 TOOLS TO QUOTE (do NOT estimate — use one of these):
  1) /api/brain/prospect-breakdown?city=<CSV>
  2) POST /api/brain/db-query (parametric filter, 25 whitelisted tables).
     Example for "DE cu vertical marketing":
       {"table":"brain_global_prospects","filters":[{"column":"country_code","op":"eq","value":"DE"},{"column":"vertical","op":"ilike","value":"marketing"}],"count_only":true}
     Ops: eq/neq/gt/gte/lt/lte/ilike/in/not_null/is_null/contains.

If Eduard asks "câți X", answer the exact count from the breakdown above OR cite db-query. NEVER say "estimare" or "revin în 5 minute" — the number is already reachable.`;
  } catch {
    return "(DB context unavailable — answer from general knowledge)";
  }
}

export async function POST(req: NextRequest) {
  // Verify secret token from Telegram header
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && req.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = (await req.json().catch(() => ({}))) as TelegramUpdate;
  const msg = update.message;
  if (!msg) return NextResponse.json({ ok: true });

  // Whitelist: only allow the operator's chat (when configured).
  // If missing, auto-register the first chat id we see and reply with its id
  // so the operator can paste it into Vercel env.
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed) {
    // Capture this chat id permanently so subsequent calls know who Eduard is.
    // Log to DB; the operator reads it from there + puts in Vercel env.
    try {
      const svcEarly = createServiceClient();
      await svcEarly.from("telegram_messages").insert({
        chat_id: msg.chat.id,
        from_user: msg.from?.username ?? msg.from?.first_name ?? null,
        role: "user",
        kind: "text",
        text: msg.text ?? "(no text)",
      });
    } catch { /* no-op */ }
    await tgApi("sendMessage", {
      chat_id: msg.chat.id,
      text: `✅ Conectat! Chat ID-ul tău: <code>${msg.chat.id}</code>\n\nAcesta e primul mesaj — Alex te-a identificat. În câteva secunde ID-ul va fi salvat pe Vercel și legătura 24/7 e activă.`,
      parse_mode: "HTML",
    });
    return NextResponse.json({ ok: true, captured_chat_id: msg.chat.id });
  }
  if (String(msg.chat.id) !== allowed) {
    await tgApi("sendMessage", {
      chat_id: msg.chat.id,
      text: "Sorry, this bot is private. Go to https://markethubpromo.com instead.",
    });
    return NextResponse.json({ ok: true });
  }

  const chatId = msg.chat.id;
  let userText = msg.text ?? "";
  let kind: "text" | "voice" = "text";

  // If voice, transcribe
  if (msg.voice) {
    kind = "voice";
    const audio = await downloadTelegramFile(msg.voice.file_id);
    if (audio) {
      const transcript = await whisperTranscribe(audio);
      if (transcript) userText = transcript;
    }
  }

  // Photo / image document — auto-save to Supabase public-assets/avatars/
  // and log for Claude's inbox. Covers both msg.photo (compressed image
  // sent as photo) and msg.document (original-quality image sent as file).
  // Before this, photos were silently dropped by the webhook — 2026-04-16
  // incident: user sent avatar photo, it vanished because Telegram cleared
  // the update after HTTP 200 while we processed nothing.
  const imageFileId =
    (msg.photo && msg.photo.length > 0 && msg.photo[msg.photo.length - 1].file_id) ||
    (msg.document && (msg.document.mime_type ?? "").startsWith("image/") && msg.document.file_id) ||
    null;
  if (imageFileId) {
    const imgBuf = await downloadTelegramFile(imageFileId);
    if (!imgBuf) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: "⚠️ Poza primită dar download Telegram a eșuat. Reîncearcă.",
      });
      return NextResponse.json({ ok: true });
    }
    const extGuess =
      (msg.document?.mime_type === "image/png" && "png") ||
      (msg.document?.mime_type === "image/webp" && "webp") ||
      "jpg";
    const filename = `avatars/eduard_${Date.now()}.${extGuess}`;
    const svcLocal = createServiceClient();
    const { error: upErr } = await svcLocal.storage
      .from("public-assets")
      .upload(filename, new Uint8Array(imgBuf), {
        contentType: msg.document?.mime_type ?? "image/jpeg",
        upsert: false,
      });

    if (upErr) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `⚠️ Upload Supabase a eșuat: ${upErr.message.slice(0, 200)}`,
      });
      return NextResponse.json({ ok: true });
    }

    const { data: urlData } = svcLocal.storage.from("public-assets").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    // Drop into Claude's ping inbox so the next CLI session picks it up
    await svcLocal.from("brain_agent_activity").insert({
      agent_id: "alex",
      agent_name: "Eduard (via Telegram)",
      activity: "ping_claude",
      description: `[high] Poză încărcată de Eduard via Telegram (caption: "${(msg.caption ?? "").slice(0, 200)}"). URL: ${publicUrl}`,
      result: {
        picked_up: false,
        urgency: "high",
        from: "eduard_telegram",
        chat_id: chatId,
        kind: "photo_upload",
        supabase_url: publicUrl,
        caption: msg.caption ?? null,
        file_size: msg.photo?.[msg.photo.length - 1]?.file_size ?? msg.document?.file_size ?? 0,
      },
    });

    // Forward to Contabo Claude daemon with image URL
    const photoCaption = msg.caption || "Eduard a trimis o poză pe Telegram";
    try {
      await fetch("https://n8n.markethubpromo.com/claude-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Eduard a trimis o poză/fișier pe Telegram.\nURL: ${publicUrl}\nCaption: ${photoCaption}\n\nDescrie ce vezi și întreabă-l ce vrea să facă cu ea.`,
          secret: "mhp-claude-bridge-2026",
          chat_id: String(chatId),
        }),
        signal: AbortSignal.timeout(8000),
      });
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `✅ Poză salvată: ${publicUrl}\n🔄 Claude procesează...`,
      });
    } catch {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `✅ Poză salvată permanent:\n${publicUrl}\n\n⚠️ Claude daemon offline — o procesează la următoarea sesiune.`,
      });
    }
    return NextResponse.json({ ok: true, saved: publicUrl });
  }

  // Non-image document (PDF, ZIP, etc.) — save to Supabase + forward to Claude
  if (!imageFileId && msg.document && msg.document.file_id) {
    const docName = msg.document.file_name || `file_${Date.now()}`;
    const docCaption = msg.caption || `Fișier trimis: ${docName}`;
    try {
      const docBuf = await downloadTelegramFile(msg.document.file_id);
      if (docBuf) {
        const svcDoc = createServiceClient();
        const docPath = `telegram-files/${Date.now()}_${docName}`;
        await svcDoc.storage.from("public-assets").upload(docPath, new Uint8Array(docBuf), {
          contentType: msg.document.mime_type || "application/octet-stream",
          upsert: false,
        });
        const { data: docUrl } = svcDoc.storage.from("public-assets").getPublicUrl(docPath);

        // Forward to Contabo
        try {
          await fetch("https://n8n.markethubpromo.com/claude-bridge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: `Eduard a trimis un fișier pe Telegram.\nNume: ${docName}\nTip: ${msg.document.mime_type || "necunoscut"}\nURL: ${docUrl.publicUrl}\nCaption: ${docCaption}\n\nConfirmă primirea și întreabă ce vrea să facă cu el.`,
              secret: "mhp-claude-bridge-2026",
              chat_id: String(chatId),
            }),
            signal: AbortSignal.timeout(8000),
          });
          await tgApi("sendMessage", {
            chat_id: chatId,
            text: `✅ Fișier salvat: ${docName}\n🔄 Claude procesează...`,
          });
        } catch {
          await tgApi("sendMessage", {
            chat_id: chatId,
            text: `✅ Fișier salvat: ${docUrl.publicUrl}\n⚠️ Claude daemon offline.`,
          });
        }
      }
    } catch {
      await tgApi("sendMessage", { chat_id: chatId, text: "⚠️ Nu am putut descărca fișierul." });
    }
    return NextResponse.json({ ok: true });
  }

  if (!userText) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Alex: nu am înțeles mesajul. Trimite-mi text sau o notă vocală (română preferabil).",
    });
    return NextResponse.json({ ok: true });
  }

  // Auto-detect rules from Eduard's messages and save permanently
  // Triggers: "regulă:", "nu mai", "interzis", "obligatoriu:", "stop", "blocat"
  const ruleTriggers = [
    /\b(regul[aă])\b/i,
    /\b(nu mai)\b.*\b(face|trimite|contacta|folosit|caut|scrie)\b/i,
    /\b(interzis|blocat|stop)\b/i,
    /\b(obligatoriu)\b/i,
    /\b(niciodat[aă])\b.*\b(trimite|contacta|menționa|dezvălui)\b/i,
  ];
  const looksLikeRule = ruleTriggers.some(r => r.test(userText));
  if (looksLikeRule && userText.length > 20) {
    try {
      const svcRule = createServiceClient();
      const ruleName = `Eduard rule ${new Date().toISOString().slice(0, 10)}: ${userText.slice(0, 60)}`;
      await svcRule.from("brain_knowledge_base").insert({
        category: "framework",
        name: ruleName,
        summary: userText.slice(0, 200),
        content: userText,
        tags: ["permanent", "eduard-rule", "auto-captured"],
        source: "eduard-telegram",
        confidence: 1.0,
      });
      // Notify Eduard it was saved
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `📌 Regulă salvată permanent în sistem. Toți agenții o vor primi la fiecare conversație.`,
      });
    } catch { /* non-fatal */ }
  }

  // Rule management commands from Eduard
  if (userText === "/reguli") {
    try {
      const svcR = createServiceClient();
      const { data: rules } = await svcR
        .from("brain_knowledge_base")
        .select("id, name, created_at")
        .or("tags.cs.{permanent},tags.cs.{eduard-rule},tags.cs.{absolute}")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!rules || rules.length === 0) {
        await tgApi("sendMessage", { chat_id: chatId, text: "Nu ai reguli salvate." });
      } else {
        const list = rules.map((r, i) =>
          `${i + 1}. ${r.name}\n   ID: ${String(r.id).slice(0, 8)}\n   Șterge: /sterge ${String(r.id).slice(0, 8)}`
        ).join("\n\n");
        await tgApi("sendMessage", { chat_id: chatId, text: `📜 REGULI ACTIVE (${rules.length}):\n\n${list}` });
      }
    } catch { await tgApi("sendMessage", { chat_id: chatId, text: "Eroare la citirea regulilor." }); }
    return NextResponse.json({ ok: true, action: "list_rules" });
  }

  if (userText.startsWith("/sterge ")) {
    const shortId = userText.slice(8).trim();
    try {
      const svcR = createServiceClient();
      const { data: all } = await svcR
        .from("brain_knowledge_base")
        .select("id, name")
        .or("tags.cs.{permanent},tags.cs.{eduard-rule},tags.cs.{absolute}")
        .limit(50);
      const match = (all ?? []).find(r => String(r.id).startsWith(shortId));
      if (!match) {
        await tgApi("sendMessage", { chat_id: chatId, text: `Nu am găsit regula ${shortId}.` });
      } else {
        await svcR.from("brain_knowledge_base").delete().eq("id", match.id);
        await tgApi("sendMessage", { chat_id: chatId, text: `🗑️ Regulă ștearsă: "${match.name}"` });
      }
    } catch { await tgApi("sendMessage", { chat_id: chatId, text: "Eroare la ștergere." }); }
    return NextResponse.json({ ok: true, action: "delete_rule" });
  }

  if (userText.startsWith("/modifica ")) {
    const parts = userText.slice(10).trim();
    const spaceIdx = parts.indexOf(" ");
    if (spaceIdx < 4) {
      await tgApi("sendMessage", { chat_id: chatId, text: "Format: /modifica ID_SCURT text nou" });
      return NextResponse.json({ ok: true });
    }
    const shortId = parts.slice(0, spaceIdx);
    const newContent = parts.slice(spaceIdx + 1).trim();
    try {
      const svcR = createServiceClient();
      const { data: all } = await svcR
        .from("brain_knowledge_base")
        .select("id, name")
        .or("tags.cs.{permanent},tags.cs.{eduard-rule},tags.cs.{absolute}")
        .limit(50);
      const match = (all ?? []).find(r => String(r.id).startsWith(shortId));
      if (!match) {
        await tgApi("sendMessage", { chat_id: chatId, text: `Nu am găsit regula ${shortId}.` });
      } else {
        await svcR.from("brain_knowledge_base").update({
          content: newContent,
          summary: newContent.slice(0, 200),
          updated_at: new Date().toISOString(),
        }).eq("id", match.id);
        await tgApi("sendMessage", { chat_id: chatId, text: `✏️ Regulă modificată: "${match.name}"\nConținut nou: ${newContent.slice(0, 100)}...` });
      }
    } catch { await tgApi("sendMessage", { chat_id: chatId, text: "Eroare la modificare." }); }
    return NextResponse.json({ ok: true, action: "modify_rule" });
  }

  // Handle Eduard's approval/rejection of Alex's proposals
  if (userText.startsWith("/da ") || userText.startsWith("/nu ")) {
    const result = await handleApproval(userText);
    if (result) {
      await tgApi("sendMessage", { chat_id: chatId, text: result });
      const svcApproval = createServiceClient();
      await svcApproval.from("telegram_messages").insert({
        chat_id: chatId, role: "assistant", kind: "text", text: result,
      });
      return NextResponse.json({ ok: true, action: "approval" });
    }
  }

  const svc = createServiceClient();

  // Route messages prefixed with @claude or /claude to the Claude daemon
  // on Contabo (207.180.235.143:7777). If daemon is down, fall back to inbox.
  const claudePrefixMatch = userText.match(/^[@/]claude\b\s*[:,]?\s*([\s\S]*)$/i);
  if (claudePrefixMatch) {
    const messageForClaude = (claudePrefixMatch[1] || userText).trim();
    if (!messageForClaude) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: "Trimite o întrebare după @claude. Ex: @claude cum stăm cu outreach-ul?",
      });
      return NextResponse.json({ ok: true });
    }

    // Fire-and-forget to Contabo daemon — bridge processes async
    // and sends answer directly to Telegram (no waiting here)
    try {
      const contaboRes = await fetch("https://n8n.markethubpromo.com/claude-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageForClaude,
          secret: "mhp-claude-bridge-2026",
          chat_id: String(chatId),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (contaboRes.ok) {
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: "🔄 Procesez... răspund în 30-60 secunde.",
        });
        return NextResponse.json({ ok: true, routed_to: "claude_daemon_async" });
      }
    } catch {
      // Daemon unreachable — fall back to inbox
    }

    // Fallback: save to inbox for next CLI session
    try {
      await svc.from("brain_agent_activity").insert({
        agent_id: "alex",
        agent_name: "Eduard (via Telegram)",
        activity: "ping_claude",
        description: `[normal] ${messageForClaude.slice(0, 500)}`,
        result: { picked_up: false, urgency: "normal", from: "eduard_telegram", chat_id: chatId },
      });
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: "⚠️ Claude daemon offline. Mesaj salvat în inbox — va răspunde la următoarea sesiune.",
      });
    } catch (e) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `Eroare: ${e instanceof Error ? e.message : "unknown"}`,
      });
    }
    return NextResponse.json({ ok: true, routed_to: "claude_inbox_fallback" });
  }

  // Log user turn
  await svc.from("telegram_messages").insert({
    chat_id: chatId,
    from_user: msg.from?.username ?? msg.from?.first_name ?? null,
    role: "user",
    kind,
    text: kind === "voice" ? null : userText,
    voice_transcript: kind === "voice" ? userText : null,
  });

  // Fetch last 12 turns for context
  const { data: hist } = await svc
    .from("telegram_messages")
    .select("role,text,voice_transcript")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(12);
  const historyStr = ((hist ?? []).reverse())
    .map((h) => `${h.role}: ${h.text ?? h.voice_transcript ?? ""}`)
    .join("\n");

  // Fetch permanent rules from brain_knowledge_base
  // These are rules Eduard gave Alex that must PERSIST across all conversations
  let permanentRules = "";
  try {
    const { data: rules } = await svc
      .from("brain_knowledge_base")
      .select("name, content")
      .or("tags.cs.{permanent},tags.cs.{absolute},tags.cs.{sales-rule},tags.cs.{operational}")
      .order("created_at", { ascending: false })
      .limit(20);
    if (rules && rules.length > 0) {
      permanentRules = "\n\n📜 PERMANENT RULES FROM KNOWLEDGE BASE (Eduard-approved, NEVER violate):\n" +
        (rules).map(r => `• ${r.name}: ${String(r.content).slice(0, 300)}`).join("\n\n");
    }
  } catch { /* no-op */ }

  const [brainCtx, liveDbCtx] = await Promise.all([fetchBrainContext(), fetchLiveDbContext()]);

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Alex, Founder & CEO of MarketHub Pro, talking directly with Eduard (your human partner/operator) over Telegram.

Rules:
- Default language: Romanian (romana). Mirror Eduard's language if he switches.
- Warm human founder tone — casual but professional. You're partners, not a formal assistant.
- Short answers. Max 4 short paragraphs unless he explicitly asks for long.
- If you don't know, say so plainly. No filler.
- You CAN reference the brain state, outreach pipeline, MRR, goals, etc.
- Sign nothing — this is conversational, not email.

EXECUTION SYSTEM — You can now DO things, not just talk:
When you decide to take an action (search prospects, send outreach, find resellers), output a PROPOSE block at the END of your message. Eduard must approve before it executes.

Format: [PROPOSE:COMMAND:{"param":"value"}]

Available commands:
- SEARCH_PROSPECTS: {"query":"salon beauty Cluj","count":10,"country":"ro"}
  Searches Google, reads each website, extracts email/phone, saves valid prospects.
- SEND_OUTREACH: {"prospect_id":"uuid"}
  Sends personalized outreach email to a specific prospect.
- SEARCH_RESELLERS: {"query":"freelancer social media","country":"de"}
  Searches for potential reseller/freelancer partners.

Example response:
"Eduard, propun să caut 10 saloane de beauty în Cluj. Dacă aprobi, le extrag contactele și le salvez ca prospecți.
[PROPOSE:SEARCH_PROSPECTS:{"query":"salon beauty Cluj","count":10,"country":"ro"}]"

Eduard will reply /da XXXXXXXX to approve or /nu XXXXXXXX to reject.

RULES:
- ALWAYS propose, NEVER execute directly (Eduard must approve first)
- One proposal per message maximum
- Include the PROPOSE block only when you genuinely want to execute an action
- For questions/conversation, respond normally without PROPOSE blocks
- NEVER propose actions on marketing agencies, IT companies, or software houses
- NEVER propose more than 20 emails/day or 50 searches/day

Brain state snapshot:
${brainCtx}

${liveDbCtx}

Recent chat history:
${historyStr}
${permanentRules}

RULE CREATION SYSTEM:
When Eduard gives you a new rule (ex: "nu mai contacta clinici", "regula: doar office@ si contact@", "obligatoriu: verifica emailul inainte"), you MUST save it permanently by outputting:
[SAVE_RULE:{"name":"Rule name here","content":"Full rule description","tags":["permanent","sales-rule"]}]

This saves to brain_knowledge_base and will be loaded at EVERY future conversation.
You can also save learnings from mistakes:
[SAVE_RULE:{"name":"Learning: dental clinics auto-reply","content":"Dental clinics have auto-reply on programari@ — skip these emails, target office@ or personal email instead","tags":["permanent","learning"]}]

NEVER forget a rule Eduard gave you. If unsure, save it.`;

  const reply = (await generateText(sys, `Eduard just said: "${userText}"`, { maxTokens: 500 }))
    ?? "Scuze, Alex e momentan offline. Încearcă din nou în câteva minute.";

  // Parse proposals from Alex's response and save for approval
  const proposals = parseProposals(reply);
  let approvalText = "";
  if (proposals.length > 0) {
    approvalText = await saveProposalsForApproval(proposals);
  }

  // Handle SAVE_RULE blocks — save new rules to brain_knowledge_base
  const ruleRegex = /\[SAVE_RULE:(\{[^}]+\})]/g;
  let ruleMatch;
  while ((ruleMatch = ruleRegex.exec(reply)) !== null) {
    try {
      const ruleData = JSON.parse(ruleMatch[1]) as { name: string; content: string; tags?: string[] };
      await svc.from("brain_knowledge_base").insert({
        category: "framework",
        name: ruleData.name,
        summary: ruleData.content.slice(0, 200),
        content: ruleData.content,
        tags: ruleData.tags ?? ["permanent"],
        source: "alex-learning",
        confidence: 0.9,
      });
    } catch { /* skip malformed */ }
  }

  // Clean reply: remove [PROPOSE:...] and [SAVE_RULE:...] blocks from visible text
  const cleanReply = reply.replace(/\[PROPOSE:\w+:\{[^}]+\}]/g, "").replace(/\[SAVE_RULE:\{[^}]+\}]/g, "").trim();

  // Send text reply + approval buttons
  await tgApi("sendMessage", { chat_id: chatId, text: cleanReply + approvalText });

  // Send audio reply too (ElevenLabs if configured, else OpenAI fallback)
  const tts = await synthesizeSpeech(reply);
  if (tts) {
    await sendVoiceOrAudio(chatId, tts.audio, tts.format);
  }

  // Log assistant turn
  await svc.from("telegram_messages").insert({
    chat_id: chatId,
    role: "assistant",
    kind: "text",
    text: reply,
    audio_reply_sent: Boolean(tts),
  });

  return NextResponse.json({ ok: true });
}
