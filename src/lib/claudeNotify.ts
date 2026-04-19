/**
 * Claude → Telegram + DB notification helper.
 *
 * PROBLEM SOLVED: When Claude sends messages via bot.sendMessage,
 * Alex (webhook handler) doesn't see them because they don't go
 * through the webhook flow and aren't saved to telegram_messages.
 *
 * This helper sends to Telegram AND saves to telegram_messages DB,
 * so Alex sees Claude's messages as part of the conversation history.
 */

import { createServiceClient } from "@/lib/supabase/service";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID;

export async function notifyTelegramAndDB(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;

  // 1. Send to Telegram
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch {
    return false;
  }

  // 2. Save to telegram_messages so Alex sees it
  try {
    const svc = createServiceClient();
    await svc.from("telegram_messages").insert({
      chat_id: Number(CHAT_ID),
      role: "assistant",
      kind: "text",
      text: `[CLAUDE] ${text}`,
    });
  } catch {
    // Non-fatal — Telegram was sent even if DB fails
  }

  return true;
}
