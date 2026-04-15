/**
 * GET /api/brain/telegram-setup?token=<BRAIN_CRON_SECRET>&action=...
 *
 * One-shot setup helper for the 24/7 Telegram link between Eduard and Alex.
 * Actions:
 *   - register-webhook: tells Telegram where to push updates
 *   - get-chat-id     : polls updates, returns the chat id of whoever just messaged
 *   - status          : shows current state (webhook + allowed chat + bot info)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("token");
  if (!secret || secret !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }
  const action = req.nextUrl.searchParams.get("action") ?? "status";
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN missing" }, { status: 500 });
  const TG = `https://api.telegram.org/bot${botToken}`;

  if (action === "register-webhook") {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "alex-webhook-2026";
    const url = "https://markethubpromo.com/api/telegram/webhook";
    // Force-delete first so Telegram accepts a new secret (setWebhook with
    // same URL but different secret silently returns "already set").
    await fetch(`${TG}/deleteWebhook`, { method: "POST" });
    const r = await fetch(`${TG}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: webhookSecret,
        allowed_updates: ["message"],
        drop_pending_updates: false,
      }),
    });
    return NextResponse.json({ action, tg_response: await r.json(), secret_len: webhookSecret.length });
  }

  if (action === "auto-setup") {
    // Read the most recent chat id from DB (captured by the webhook when
    // someone first messages the bot), then upsert it on Vercel env.
    const svc = createServiceClient();
    const { data } = await svc
      .from("telegram_messages")
      .select("chat_id,from_user,created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    const chat = (data ?? [])[0];
    if (!chat) {
      return NextResponse.json({
        ok: false,
        hint: `Nu am găsit niciun mesaj în DB. Trimite un salut botului @markethub_reports_bot, apoi rulează din nou.`,
      });
    }
    // Upsert on Vercel env via API
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const teamId = "team_rbNwqamitZzxEBwrd9UMDlxk";
    const projectId = "prj_HHkmEIEiIRuoyCFT22KAobqzUwaH";
    if (!vercelToken) {
      return NextResponse.json({
        ok: false,
        captured_chat_id: chat.chat_id,
        hint: "VERCEL_API_TOKEN lipsește din env. Pune manual TELEGRAM_ALLOWED_CHAT_ID = " + chat.chat_id,
      });
    }
    const upsertRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            key: "TELEGRAM_ALLOWED_CHAT_ID",
            value: String(chat.chat_id),
            type: "encrypted",
            target: ["production", "preview", "development"],
          },
        ]),
      },
    );
    const upsertJson = await upsertRes.json();
    return NextResponse.json({
      ok: upsertRes.ok,
      captured_chat_id: chat.chat_id,
      from_user: chat.from_user,
      vercel_response: upsertJson,
      next: upsertRes.ok
        ? "Chat id setat. Urmează redeploy automat (sau next deploy) ca să-l citească runtime-ul."
        : "Vercel API nu a acceptat. Set manual env var TELEGRAM_ALLOWED_CHAT_ID = " + chat.chat_id,
    });
  }

  if (action === "get-chat-id") {
    // Fetch last updates; return any chat ids we see
    const r = await fetch(`${TG}/getUpdates?limit=10&offset=-10`);
    const d = (await r.json()) as {
      ok?: boolean;
      result?: Array<{ message?: { chat?: { id?: number; type?: string }; from?: { username?: string } } }>;
    };
    const chats = (d.result ?? [])
      .map((u) => u.message?.chat)
      .filter(Boolean)
      .map((c) => ({ id: c!.id, type: c!.type }));
    return NextResponse.json({
      action,
      hint: "Trimite orice mesaj bot-ului de pe telefon, apoi reîmprospătează. Chat id apare aici.",
      chats,
      tg_response: d,
    });
  }

  // status
  const me = await (await fetch(`${TG}/getMe`)).json();
  const wh = await (await fetch(`${TG}/getWebhookInfo`)).json();
  return NextResponse.json({
    bot: me.result,
    webhook: wh.result,
    env: {
      TELEGRAM_BOT_TOKEN: botToken ? "set" : "missing",
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET ? "set" : "missing",
      TELEGRAM_ALLOWED_CHAT_ID: process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "missing",
    },
    next_steps: process.env.TELEGRAM_ALLOWED_CHAT_ID
      ? "Gata 24/7 — Alex poate scrie și primi mesaje."
      : "1. /register-webhook · 2. Mesaj pe bot · 3. /get-chat-id · 4. pune chat id în Vercel TELEGRAM_ALLOWED_CHAT_ID",
  });
}
