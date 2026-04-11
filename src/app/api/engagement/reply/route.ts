/**
 * Engagement — reply to a social_messages row.
 *
 * POST /api/engagement/reply { id, reply_text }
 *
 * Looks up the message, resolves the correct platform access token, calls
 * the platform's reply API (Instagram Graph /{comment-id}/replies for
 * comments; extends to other platforms in follow-ups), then stores
 * reply_text + replied_at + sets status='replied'.
 *
 * For IG comments, the Graph API endpoint used is:
 *   POST /{ig-comment-id}/replies?message=...&access_token=...
 * which creates a reply INSIDE the same comment thread.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveIGToken } from "@/lib/igToken";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface MessageRow {
  id: string;
  platform: string;
  kind: string;
  external_id: string;
  media_external_id: string | null;
  thread_id: string | null;
  status: string;
}

async function replyInstagramComment(
  userId: string,
  commentId: string,
  replyText: string,
): Promise<{ ok: true; reply_id: string } | { ok: false; error: string }> {
  const supa = createServiceClient();

  // Fetch the IG account + token (same resolution as sync route)
  const { data: conn } = await supa
    .from("instagram_connections")
    .select("instagram_id, page_access_token")
    .eq("user_id", userId)
    .not("page_access_token", "is", null)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  let igId: string | null = null;
  let token: string | null = null;

  if (conn?.instagram_id && conn.page_access_token) {
    igId = conn.instagram_id as string;
    token = conn.page_access_token as string;
  } else {
    const { data: profile } = await supa
      .from("profiles")
      .select("instagram_user_id, instagram_access_token, enc_instagram_access_token")
      .eq("id", userId)
      .maybeSingle();
    const p = profile as
      | {
          instagram_user_id: string | null;
          instagram_access_token: string | null;
          enc_instagram_access_token: string | null;
        }
      | null;
    if (!p?.instagram_user_id) return { ok: false, error: "No Instagram account connected" };
    igId = p.instagram_user_id;
    token = p.instagram_access_token;
    if (!token && p.enc_instagram_access_token?.startsWith("enc:v1:")) {
      try {
        const { decryptField } = await import("@/lib/fieldCrypto");
        token = decryptField(p.enc_instagram_access_token) ?? null;
      } catch {
        /* ignore */
      }
    }
  }

  if (!igId || !token) return { ok: false, error: "Missing Instagram token" };

  try {
    token = await resolveIGToken(token, igId);
  } catch (e) {
    return { ok: false, error: `Token resolution failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // POST /{comment_id}/replies with message + access_token
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${commentId}/replies?message=${encodeURIComponent(replyText)}&access_token=${encodeURIComponent(token)}`,
    { method: "POST", signal: AbortSignal.timeout(15000) },
  );
  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || json.error) {
    return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, reply_id: json.id ?? "" };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    reply_text?: string;
  } | null;

  if (!body?.id || !body.reply_text?.trim()) {
    return NextResponse.json({ error: "id and reply_text required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // 1. Load the message
  const { data: msgRaw, error: lookupErr } = await supa
    .from("social_messages")
    .select("id, platform, kind, external_id, media_external_id, thread_id, status")
    .eq("id", body.id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupErr || !msgRaw) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  const msg = msgRaw as MessageRow;

  // 2. Platform-specific reply
  let sendResult: { ok: true; reply_id: string } | { ok: false; error: string };
  switch (msg.platform) {
    case "instagram":
      if (msg.kind !== "comment" && msg.kind !== "reply") {
        return NextResponse.json(
          { error: `Only instagram comments can be replied to via API (kind=${msg.kind})` },
          { status: 400 },
        );
      }
      sendResult = await replyInstagramComment(auth.userId, msg.external_id, body.reply_text.trim());
      break;

    default:
      return NextResponse.json(
        { error: `Reply API not yet implemented for platform=${msg.platform}` },
        { status: 501 },
      );
  }

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  // 3. Persist the reply on our side
  const { error: upErr } = await supa
    .from("social_messages")
    .update({
      reply_text: body.reply_text.trim(),
      replied_at: new Date().toISOString(),
      replied_by: auth.userId,
      status: "replied",
    })
    .eq("id", msg.id)
    .eq("user_id", auth.userId);

  if (upErr) {
    // Non-fatal — the reply already went through on the platform
    return NextResponse.json({
      ok: true,
      warning: `Reply sent but DB update failed: ${upErr.message}`,
      reply_id: sendResult.reply_id,
    });
  }

  return NextResponse.json({ ok: true, reply_id: sendResult.reply_id });
}
