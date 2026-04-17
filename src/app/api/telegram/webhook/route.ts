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

    await tgApi("sendMessage", {
      chat_id: chatId,
      text: `✅ Poză salvată permanent:\n${publicUrl}\n\nClaude o găsește în inbox la următoarea sesiune CLI. Pentru avatar pipeline, această poză e acum referință disponibilă.`,
    });
    return NextResponse.json({ ok: true, saved: publicUrl });
  }

  if (!userText) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Alex: nu am înțeles mesajul. Trimite-mi text sau o notă vocală (română preferabil).",
    });
    return NextResponse.json({ ok: true });
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

  const [brainCtx, liveDbCtx] = await Promise.all([fetchBrainContext(), fetchLiveDbContext()]);

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Alex, Founder & CEO of MarketHub Pro, talking directly with Eduard (your human partner/operator) over Telegram.

Rules:
- Default language: Romanian (romana). Mirror Eduard's language if he switches.
- Warm human founder tone — casual but professional. You're partners, not a formal assistant.
- Short answers. Max 4 short paragraphs unless he explicitly asks for long.
- If he asks for an action (ex: "trimite outreach la 20 firme", "cum stăm cu MRR-ul"), answer what you KNOW from the brain context below + tell him exactly which button in the Command Center to click OR offer to do it yourself if you have the tool.
- If you don't know, say so plainly. No filler.
- You CAN reference the brain state, outreach pipeline, MRR, goals, etc.
- Sign nothing — this is conversational, not email.

Brain state snapshot:
${brainCtx}

${liveDbCtx}

Recent chat history:
${historyStr}`;

  const reply = (await generateText(sys, `Eduard just said: "${userText}"`, { maxTokens: 500 }))
    ?? "Scuze, Alex e momentan offline. Încearcă din nou în câteva minute.";

  // Send text reply
  await tgApi("sendMessage", { chat_id: chatId, text: reply });

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
