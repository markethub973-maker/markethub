/**
 * Brain agent activity tracker — wires backend jobs to boardroom live pulse.
 *
 * When a real operation starts (lead mining, outreach batch, demo generation),
 * the relevant agent gets logged as "started". When done, "completed" with
 * result summary. The boardroom UI polls /api/brain/activity to show live
 * pulsing on the corresponding seat + real message in the transcript.
 *
 * This is NOT decoration — every row here represents a real backend task.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type AgentId =
  | "alex"         // CEO
  | "cmo"          // Vera — Marketing
  | "content"      // Marcus — Content
  | "sales"        // Sofia — Sales
  | "analyst"      // Ethan — Growth
  | "researcher"   // Nora — Research
  | "competitive"  // Kai — Competitive
  | "copywriter"   // Iris — Copy
  | "strategist"   // Leo — Strategy
  | "finance"      // Dara — Finance
  | "legal"        // Theo — Legal
  | "dev";         // Claude (dev/CLI session) — code changes, ops, files

const AGENT_NAMES: Record<AgentId, string> = {
  alex: "Alex",
  cmo: "Vera",
  content: "Marcus",
  sales: "Sofia",
  analyst: "Ethan",
  researcher: "Nora",
  competitive: "Kai",
  copywriter: "Iris",
  strategist: "Leo",
  finance: "Dara",
  legal: "Theo",
  dev: "Claude (dev)",
};

export interface ActivityHandle {
  id: string;
  agent_id: AgentId;
  started_at: number;
}

/**
 * Mark an agent as actively working. Returns a handle you pass to completeActivity
 * when the job finishes (success or failure).
 */
export async function startActivity(
  agent_id: AgentId,
  description: string,
): Promise<ActivityHandle | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("brain_agent_activity")
      .insert({
        agent_id,
        agent_name: AGENT_NAMES[agent_id],
        activity: "started",
        description,
      })
      .select("id")
      .single();
    if (!data) return null;
    return { id: data.id, agent_id, started_at: Date.now() };
  } catch {
    return null;
  }
}

export async function completeActivity(
  handle: ActivityHandle | null,
  description: string,
  result?: Record<string, unknown>,
): Promise<void> {
  if (!handle) return;
  try {
    const svc = createServiceClient();
    await svc.from("brain_agent_activity").insert({
      agent_id: handle.agent_id,
      agent_name: AGENT_NAMES[handle.agent_id],
      activity: "completed",
      description,
      duration_ms: Date.now() - handle.started_at,
      result: result ?? null,
    });
  } catch { /* no-op */ }
}

export async function failActivity(
  handle: ActivityHandle | null,
  description: string,
  error?: string,
): Promise<void> {
  if (!handle) return;
  try {
    const svc = createServiceClient();
    await svc.from("brain_agent_activity").insert({
      agent_id: handle.agent_id,
      agent_name: AGENT_NAMES[handle.agent_id],
      activity: "failed",
      description,
      duration_ms: Date.now() - handle.started_at,
      result: { error: error ?? "unknown" },
    });
  } catch { /* no-op */ }
}
