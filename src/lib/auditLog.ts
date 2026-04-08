/**
 * Audit log helper.
 *
 * Writes immutable audit entries to the `audit_logs` table.
 * Call this for any sensitive action: admin login, block/unblock user,
 * plan changes, credential updates, migration runs, etc.
 *
 * Non-blocking — errors are swallowed so a log failure never breaks the request.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type AuditAction =
  | "admin_login"
  | "admin_logout"
  | "user_blocked"
  | "user_unblocked"
  | "plan_changed"
  | "migration_run"
  | "credential_updated"
  | "token_refreshed"
  | "abuse_flag_created"
  | "user_registered"
  | "user_deleted"
  | "discount_code_created"
  | "discount_code_deleted"
  | "pricing_updated"
  | "feature_flag_updated"
  | "youtube_connected";

export interface AuditEntry {
  action:       AuditAction;
  actor_id?:    string;          // who performed the action (user_id or "admin")
  target_id?:   string;          // who/what was affected (user_id, entity id)
  entity_type?: string;          // "user" | "plan" | "credential" | etc.
  details?:     Record<string, unknown>; // extra context (redact secrets)
  ip?:          string;
  user_agent?:  string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supa = createServiceClient();
    await supa.from("audit_logs").insert({
      action:      entry.action,
      actor_id:    entry.actor_id    ?? null,
      target_id:   entry.target_id   ?? null,
      entity_type: entry.entity_type ?? null,
      details:     entry.details     ?? null,
      ip:          entry.ip          ?? null,
      user_agent:  entry.user_agent  ?? null,
      created_at:  new Date().toISOString(),
    });
  } catch {
    // Never throw — audit failure must not break the main request
  }
}

/** Extract IP from a Next.js request (server-side). */
export function getIpFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
}
