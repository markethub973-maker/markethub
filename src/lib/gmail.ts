/**
 * Gmail API helper — auto-refresh access tokens from the stored refresh_token.
 * All reads go through this so tokens are always fresh.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    mimeType?: string;
    body?: { data?: string; size?: number };
    parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
  };
  internalDate?: string;
  labelIds?: string[];
}

async function getFreshAccessToken(email: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("gmail_tokens")
    .select("refresh_token, access_token, expires_at")
    .eq("email", email)
    .maybeSingle();
  if (!data) return null;

  const now = Date.now();
  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  // If we have a valid access_token with > 60s remaining, reuse it
  if (data.access_token && expiresAt > now + 60_000) {
    return data.access_token;
  }

  // Otherwise refresh
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) return null;
  const tok = (await res.json()) as { access_token: string; expires_in: number };
  await svc
    .from("gmail_tokens")
    .update({
      access_token: tok.access_token,
      expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);
  return tok.access_token;
}

/**
 * List newest messages from INBOX matching an optional query.
 * Examples: `is:unread`, `from:sentry.io`, `newer_than:1h`.
 */
export async function listMessages(
  email: string,
  query = "is:unread newer_than:1h",
  maxResults = 25,
): Promise<Array<{ id: string; threadId: string }>> {
  const token = await getFreshAccessToken(email);
  if (!token) return [];
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(email)}/messages`);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const d = (await res.json()) as { messages?: Array<{ id: string; threadId: string }> };
  return d.messages ?? [];
}

export async function getMessage(email: string, id: string): Promise<GmailMessage | null> {
  const token = await getFreshAccessToken(email);
  if (!token) return null;
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(email)}/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return (await res.json()) as GmailMessage;
}

export function headerOf(msg: GmailMessage, name: string): string | null {
  const h = msg.payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

export function extractBody(msg: GmailMessage): string {
  const decode = (b64url: string): string => {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return "";
    }
  };
  const walk = (part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] } | undefined): string => {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) return decode(part.body.data);
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) {
        const text = walk(p as typeof part);
        if (text) return text;
      }
    }
    return "";
  };
  if (msg.payload?.body?.data) {
    return Buffer.from(msg.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  }
  return walk(msg.payload);
}

export async function markAsRead(email: string, id: string): Promise<void> {
  const token = await getFreshAccessToken(email);
  if (!token) return;
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(email)}/messages/${id}/modify`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    },
  );
}
