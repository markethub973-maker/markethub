/**
 * Uniqueness Engine — ensures all AI-generated content is unique per user.
 *
 * Stores SHA-256 hashes of normalized content in `content_hashes` table.
 * Works in both browser (Web Crypto API) and Node.js environments.
 */

import { createClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentType =
  | "caption"
  | "title"
  | "sound_id"
  | "strategy_pattern"
  | "image_style";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize content: lowercase, trim, collapse whitespace. */
function normalize(content: string): string {
  return content.toLowerCase().trim().replace(/\s+/g, " ");
}

/** SHA-256 hash using Web Crypto API (works in browser + Node 18+). */
export async function hashContent(content: string): Promise<string> {
  const normalized = normalize(content);
  const encoded = new TextEncoder().encode(normalized);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Detect environment — browser uses anon client, server uses service client
// ---------------------------------------------------------------------------

function getClient() {
  if (typeof window !== "undefined") {
    return createClient();
  }
  return createServiceClient();
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Check whether content (of a given type) is unique for a user.
 * Returns true if no matching hash exists in the last 30 days.
 */
export async function isUnique(
  content: string,
  type: ContentType,
  userId: string
): Promise<boolean> {
  const hash = await hashContent(content);
  const db = getClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await db
    .from("content_hashes")
    .select("id")
    .eq("hash", hash)
    .eq("content_type", type)
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo)
    .limit(1);

  if (error) {
    console.error("[uniqueness-engine] isUnique error:", error.message);
    // Fail-open: treat as unique so generation isn't blocked
    return true;
  }

  return !data || data.length === 0;
}

/**
 * Register a piece of content so future duplicates are detected.
 */
export async function registerContent(
  content: string,
  type: ContentType,
  userId: string
): Promise<void> {
  const hash = await hashContent(content);
  const db = getClient();

  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await db.from("content_hashes").insert({
    hash,
    content_type: type,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[uniqueness-engine] registerContent error:", error.message);
  }
}

/**
 * Generate content that passes uniqueness check.
 * Calls `generateFn` up to `maxAttempts` times (default 5).
 * Automatically registers the final unique result.
 */
export async function generateUniqueContent(
  generateFn: () => Promise<string>,
  type: ContentType,
  userId: string,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await generateFn();

    if (await isUnique(content, type, userId)) {
      await registerContent(content, type, userId);
      return content;
    }

    console.warn(
      `[uniqueness-engine] Attempt ${attempt}/${maxAttempts} produced duplicate — retrying`
    );
  }

  // Last resort: generate one more time and accept it regardless
  const fallback = await generateFn();
  console.warn(
    "[uniqueness-engine] Max attempts reached — accepting content as-is"
  );
  await registerContent(fallback, type, userId);
  return fallback;
}

/**
 * Delete expired hashes (server-side only). Returns count of deleted rows.
 */
export async function cleanExpiredHashes(): Promise<number> {
  const db = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("content_hashes")
    .delete()
    .lt("expires_at", now)
    .select("id");

  if (error) {
    console.error("[uniqueness-engine] cleanExpiredHashes error:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}
