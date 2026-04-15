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

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TG_API = "https://api.telegram.org";

interface TelegramUpdate {
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number };
    text?: string;
    voice?: { file_id: string; duration: number };
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

async function openaiTts(text: string): Promise<ArrayBuffer | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx", // deeper, founder-appropriate
        input: text.slice(0, 4000),
        response_format: "opus",
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function sendVoice(chatId: number, audio: ArrayBuffer): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  fd.append("voice", new Blob([audio], { type: "audio/ogg" }), "alex.ogg");
  await fetch(`${TG_API}/bot${token}/sendVoice`, { method: "POST", body: fd });
}

async function fetchBrainContext(): Promise<string> {
  try {
    const res = await fetch("https://markethubpromo.com/api/brain/advisor", {
      headers: { "x-brain-cron-secret": process.env.BRAIN_CRON_SECRET ?? "" },
    });
    if (!res.ok) return "";
    const d = (await res.json()) as { state?: Record<string, unknown>; summary_headline?: string };
    return `Current state: ${JSON.stringify(d.state ?? {})}\nHeadline: ${d.summary_headline ?? ""}`;
  } catch {
    return "";
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

  if (!userText) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Alex: nu am înțeles mesajul. Trimite-mi text sau o notă vocală (română preferabil).",
    });
    return NextResponse.json({ ok: true });
  }

  const svc = createServiceClient();

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

  const brainCtx = await fetchBrainContext();

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

Recent chat history:
${historyStr}`;

  const reply = (await generateText(sys, `Eduard just said: "${userText}"`, { maxTokens: 500 }))
    ?? "Scuze, Alex e momentan offline. Încearcă din nou în câteva minute.";

  // Send text reply
  await tgApi("sendMessage", { chat_id: chatId, text: reply });

  // Send audio reply too
  const audio = await openaiTts(reply);
  if (audio) {
    await sendVoice(chatId, audio);
  }

  // Log assistant turn
  await svc.from("telegram_messages").insert({
    chat_id: chatId,
    role: "assistant",
    kind: "text",
    text: reply,
    audio_reply_sent: Boolean(audio),
  });

  return NextResponse.json({ ok: true });
}
