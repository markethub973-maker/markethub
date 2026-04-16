/**
 * GET /api/brain/activity — real events feed for Boardroom live panel.
 *
 * Pulls recent actual events (outreach sent/replied, ops incidents,
 * delegate decisions, boardroom sessions) from Supabase. No synthetic
 * data. Shown in the brain boardroom as "Activity Live".
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}

export async function GET(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = createServiceClient();
  const events: Array<{ t: Date; line: string }> = [];

  // 1. Recent outreach sent (last 24h)
  try {
    const { data: sent } = await svc
      .from("outreach_log")
      .select("created_at,domain")
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(8);
    (sent ?? []).forEach((r) => {
      events.push({
        t: new Date(r.created_at as string),
        line: `${fmtTime(r.created_at as string)} · Sofia a trimis outreach la ${r.domain}`,
      });
    });
  } catch { /* no-op */ }

  // 2. Replied outreach (last 48h)
  try {
    const { data: replied } = await svc
      .from("outreach_log")
      .select("replied_at,domain")
      .not("replied_at", "is", null)
      .gte("replied_at", new Date(Date.now() - 48 * 3600_000).toISOString())
      .order("replied_at", { ascending: false })
      .limit(5);
    (replied ?? []).forEach((r) => {
      events.push({
        t: new Date(r.replied_at as string),
        line: `${fmtTime(r.replied_at as string)} · ✨ ${r.domain} a RĂSPUNS`,
      });
    });
  } catch { /* no-op */ }

  // 3. Critical ops incidents (last 24h)
  try {
    const { data: incidents } = await svc
      .from("ops_incidents")
      .select("created_at,source,severity,subject")
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .in("severity", ["critical", "warning"])
      .order("created_at", { ascending: false })
      .limit(5);
    (incidents ?? []).forEach((r) => {
      const icon = r.severity === "critical" ? "🚨" : "⚠️";
      events.push({
        t: new Date(r.created_at as string),
        line: `${fmtTime(r.created_at as string)} · ${icon} ${String(r.source).toUpperCase()}: ${String(r.subject).slice(0, 60)}`,
      });
    });
  } catch { /* no-op */ }

  // 4. Delegate decisions (last 24h)
  try {
    const { data: decisions } = await svc
      .from("delegate_decisions")
      .select("created_at,question")
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    (decisions ?? []).forEach((r) => {
      events.push({
        t: new Date(r.created_at as string),
        line: `${fmtTime(r.created_at as string)} · 🛡️ Delegate a decis: ${String(r.question).slice(0, 55)}`,
      });
    });
  } catch { /* delegate_decisions table may not exist yet */ }

  // 4b. Agent activity events (brain_agent_activity) — powers live pulse
  try {
    const { data: acts } = await svc
      .from("brain_agent_activity")
      .select("agent_id,agent_name,activity,description,created_at")
      .gte("created_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);
    (acts ?? []).forEach((r) => {
      const icon = r.activity === "started" ? "🔴" : r.activity === "failed" ? "❌" : "✅";
      events.push({
        t: new Date(r.created_at as string),
        line: `${fmtTime(r.created_at as string)} · ${icon} ${String(r.description ?? "").slice(0, 100)}`,
      });
    });
  } catch { /* no-op */ }

  // 5. Telegram messages (last 6h — just conversation metadata, not content)
  try {
    const { data: tg } = await svc
      .from("telegram_messages")
      .select("created_at,role,kind")
      .gte("created_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(3);
    (tg ?? []).forEach((r) => {
      const who = r.role === "user" ? "Eduard" : "Alex";
      const kind = r.kind === "voice" ? "voice" : "text";
      events.push({
        t: new Date(r.created_at as string),
        line: `${fmtTime(r.created_at as string)} · 💬 ${who} → Telegram (${kind})`,
      });
    });
  } catch { /* no-op */ }

  // Sort all events by time desc, cap to 8
  events.sort((a, b) => b.t.getTime() - a.t.getTime());
  const lines = events.slice(0, 8).map((e) => e.line);

  // Active agents — anyone with a "started" event in last 5 min without a
  // later "completed" or "failed" event. This drives the live pulse in the
  // Boardroom UI (matching seat gets highlighted in real time).
  const active_agents: string[] = [];
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: recent } = await svc
      .from("brain_agent_activity")
      .select("agent_id,activity,created_at")
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(30);
    const byAgent: Record<string, string> = {};
    (recent ?? []).forEach((r) => {
      // The most recent event per agent wins (list is desc)
      if (!(r.agent_id as string in byAgent)) {
        byAgent[r.agent_id as string] = r.activity as string;
      }
    });
    for (const [id, act] of Object.entries(byAgent)) {
      if (act === "started") active_agents.push(id);
    }
  } catch { /* no-op */ }

  return NextResponse.json({
    ok: true,
    events: lines,
    count: lines.length,
    active_agents,
    note: lines.length === 0 ? "No activity in the last 24h" : undefined,
  });
}
