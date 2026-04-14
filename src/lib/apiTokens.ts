/**
 * User API tokens — generate, verify, revoke.
 *
 * Format: `mkt_live_<32 bytes hex>` (43 chars total after prefix).
 * Display: only prefix + last 4 shown after generation is acknowledged.
 * Storage: sha256 hash of the full token; the full value is shown
 * exactly once on creation and never again.
 *
 * Verification flow (used by /api route handlers that want to accept
 * either Supabase session OR API token auth):
 *   1. Header `Authorization: Bearer mkt_live_...`
 *   2. hash the token
 *   3. look up user_api_tokens WHERE token_hash = ? AND revoked_at IS NULL
 *      AND (expires_at IS NULL OR expires_at > now())
 *   4. return user_id; update last_used_at asynchronously
 */

import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const TOKEN_PREFIX = "mkt_live_";

export interface IssueResult {
  ok: boolean;
  token?: string;          // plaintext — shown ONCE
  prefix?: string;         // for UI display
  id?: string;
  error?: string;
}

export interface TokenInfo {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  last_used_ip: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export async function issueToken(
  userId: string,
  name: string,
  opts: { scopes?: string[]; expiresInDays?: number } = {},
): Promise<IssueResult> {
  const service = createServiceClient();
  // 32 bytes entropy → 64 hex chars
  const secret = randomBytes(32).toString("hex");
  const token = `${TOKEN_PREFIX}${secret}`;
  const token_hash = createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 12); // "mkt_live_aaa"

  const expires_at = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 3600 * 1000).toISOString()
    : null;

  const { data, error } = await service
    .from("user_api_tokens")
    .insert({
      user_id: userId,
      name: name.trim().slice(0, 64),
      token_prefix: prefix,
      token_hash,
      scopes: opts.scopes ?? ["read"],
      expires_at,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create token" };
  }
  return { ok: true, token, prefix, id: data.id as string };
}

/**
 * Verify an Authorization Bearer token.
 * Returns the user_id if valid, null otherwise.
 * Does NOT check scopes — caller decides what scope is needed per route.
 */
export async function verifyToken(authHeader: string | null, ip?: string | null): Promise<{
  user_id: string;
  token_id: string;
  scopes: string[];
} | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const token_hash = createHash("sha256").update(token).digest("hex");
  const service = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data } = await service
    .from("user_api_tokens")
    .select("id,user_id,scopes,expires_at,revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && (data.expires_at as string) < nowIso) return null;

  // Async heartbeat — fire-and-forget; we don't block the API response
  void service
    .from("user_api_tokens")
    .update({ last_used_at: nowIso, last_used_ip: ip ?? null })
    .eq("id", data.id);

  return {
    user_id: data.user_id as string,
    token_id: data.id as string,
    scopes: (data.scopes as string[]) ?? [],
  };
}

export async function revokeToken(userId: string, tokenId: string): Promise<boolean> {
  const service = createServiceClient();
  const { error } = await service
    .from("user_api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId);
  return !error;
}

export async function listTokens(userId: string): Promise<TokenInfo[]> {
  const service = createServiceClient();
  const { data } = await service
    .from("user_api_tokens")
    .select("id,name,token_prefix,scopes,last_used_at,last_used_ip,created_at,expires_at,revoked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as TokenInfo[];
}
