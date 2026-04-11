/**
 * Shared helper for the maintenance agent team. Each agent (probe, schema
 * drift, consistency, etc.) imports `reportFinding` to upsert issues into
 * the `maintenance_findings` table. The daily digest reads unresolved rows
 * and emails admin a summary.
 *
 * Dedup works via (agent_name, fingerprint). Fingerprint is a stable string
 * the agent picks per issue kind, e.g. `probe:/api/cron/auto-post` or
 * `schema-drift:profiles.engagement_alert_threshold`. Repeated detections
 * bump occurrences + last_seen instead of inserting new rows.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  agent: string;
  severity: Severity;
  fingerprint: string;
  title: string;
  details?: Record<string, unknown>;
  fix_suggestion?: string;
}

export async function reportFinding(f: Finding): Promise<void> {
  const supa = createServiceClient();

  const { data: existing } = await supa
    .from("maintenance_findings")
    .select("id, occurrences")
    .eq("agent_name", f.agent)
    .eq("fingerprint", f.fingerprint)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    // Already known — bump occurrences + last_seen, un-resolve if was resolved.
    // Update severity/title/details in case the finding payload changed.
    await supa
      .from("maintenance_findings")
      .update({
        last_seen: now,
        occurrences: (existing.occurrences ?? 1) + 1,
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        details: f.details ?? {},
        severity: f.severity,
        title: f.title,
        fix_suggestion: f.fix_suggestion ?? null,
      })
      .eq("id", existing.id);
    return;
  }

  await supa.from("maintenance_findings").insert({
    agent_name: f.agent,
    severity: f.severity,
    fingerprint: f.fingerprint,
    title: f.title,
    details: f.details ?? {},
    fix_suggestion: f.fix_suggestion ?? null,
    first_seen: now,
    last_seen: now,
    occurrences: 1,
    resolved: false,
  });
}

/**
 * Marks a finding as resolved. Called by an agent when its next run
 * confirms the issue is gone (e.g., probe returns expected status again).
 */
export async function markResolved(
  agent: string,
  fingerprint: string,
  resolved_by: string = "agent-autoresolved",
): Promise<void> {
  const supa = createServiceClient();
  await supa
    .from("maintenance_findings")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by,
    })
    .eq("agent_name", agent)
    .eq("fingerprint", fingerprint)
    .eq("resolved", false); // don't re-update already-resolved rows
}

/**
 * Convenience: auto-resolve any finding from an agent that no longer matches
 * the "active fingerprints" set the agent just produced. Call at the end of
 * each agent run so cleared issues get marked resolved without manual work.
 *
 * Example:
 *   const active = new Set<string>();
 *   for (const probe of probes) { if (failing) { await reportFinding({...}); active.add(fp); } }
 *   await autoResolveStale("probe-agent", active);
 */
export async function autoResolveStale(
  agent: string,
  activeFingerprints: Set<string>,
): Promise<void> {
  const supa = createServiceClient();
  const { data: unresolved } = await supa
    .from("maintenance_findings")
    .select("id, fingerprint")
    .eq("agent_name", agent)
    .eq("resolved", false);

  const stale = (unresolved ?? [])
    .filter((r) => !activeFingerprints.has(r.fingerprint as string))
    .map((r) => r.id as string);

  if (stale.length === 0) return;

  await supa
    .from("maintenance_findings")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: "agent-autoresolved",
    })
    .in("id", stale);
}
