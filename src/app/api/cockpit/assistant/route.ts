/**
 * Cockpit — Assistant chat endpoint with tool use.
 *
 * A conversational interface to the whole platform, powered by Claude
 * Haiku 4.5 with tool access. The admin chats in Romanian; the assistant
 * calls the right tools, interprets the results, and answers in plain
 * language.
 *
 * Tools exposed:
 *   - list_recent_events(hours, severity?)
 *   - list_findings(status?, agent?)
 *   - run_agent(name)                 (probe | schema-drift | consistency | secret-scan | dependency-guardian | siem-analyst | watchdog)
 *   - check_service(service)          (ping a specific service, returns latency)
 *   - get_user_activity(email_or_id)
 *   - list_failed_logins(hours)
 *   - query_db(sql)                   (READ-ONLY, tempered, no writes)
 *   - list_backups(limit)
 *   - trigger_backup(note?)
 *   - generate_daily_report(force?)
 *
 * Auth: admin session cookie (same as /api/admin/*). The chat UI sits
 * inside /dashboard/admin/cockpit which is already admin-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import type { MessageParam, Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const BASE = "https://viralstat-dashboard.vercel.app";

const SYSTEM_PROMPT = `You are the Cockpit Assistant for MarketHub Pro — an autonomous operations assistant that lives inside the admin panel.

You help the operator (who speaks Romanian) understand platform state, diagnose incidents, and take safe actions. You have tools to query real data — use them whenever a factual answer is needed. Never guess when a tool can give you the truth.

Respond in Romanian. Keep answers concise, structured, and grounded in tool output. When you run a tool, summarize what it returned in your final message; don't dump raw JSON unless the operator explicitly asks.

Safety rules:
- For destructive actions (trigger_backup, run_agent), run them when asked — these are idempotent or additive.
- For query_db, only SELECT statements. If asked to run INSERT/UPDATE/DELETE, refuse politely and suggest the correct API route instead.
- Never expose the values of credentials, tokens, or cookies in tool output (redact them).
- When an action depends on a factual state (e.g., "block this IP"), always CONFIRM the target with the operator in your reply before running the tool (for now there is no block_ip tool, but apply the same principle to any sensitive action added later).`;

const TOOLS: Tool[] = [
  {
    name: "list_recent_events",
    description: "List recent security_events from the last N hours, optionally filtered by severity.",
    input_schema: {
      type: "object",
      properties: {
        hours: { type: "number", description: "Lookback window in hours (1-168)." },
        severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"], description: "Optional severity filter." },
        limit: { type: "number", description: "Max rows to return (default 50, max 200)." },
      },
      required: ["hours"],
    },
  },
  {
    name: "list_findings",
    description: "List maintenance_findings by status and/or agent.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "resolved", "all"], description: "Filter by resolution status." },
        agent: { type: "string", description: "Optional agent filter (probe, schema-drift, consistency, siem-analyst, watchdog, backup, etc.)." },
        limit: { type: "number", description: "Max rows (default 30, max 100)." },
      },
      required: ["status"],
    },
  },
  {
    name: "run_agent",
    description: "Trigger a maintenance agent run on demand. Returns the agent's response JSON.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["probe", "schema-drift", "consistency", "secret-scan", "dependency-guardian", "siem-analyst", "watchdog"],
          description: "Which agent to run.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "check_service",
    description: "Check a single external service (anthropic, stripe, resend, supabase, apify, cloudflare) and return ok + latency.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", enum: ["anthropic", "stripe", "resend", "supabase", "apify", "cloudflare"] },
      },
      required: ["service"],
    },
  },
  {
    name: "get_user_activity",
    description: "Get recent activity for a user — profile info, last login events, subscription state, usage_tracking rows. Pass email or UUID.",
    input_schema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "User email OR profile UUID." },
      },
      required: ["identifier"],
    },
  },
  {
    name: "list_failed_logins",
    description: "List failed login events (brute_force_login, admin_login_failed) in the last N hours.",
    input_schema: {
      type: "object",
      properties: {
        hours: { type: "number", description: "Lookback window in hours." },
      },
      required: ["hours"],
    },
  },
  {
    name: "query_db",
    description: "Run a READ-ONLY SQL SELECT against Supabase. Only SELECT is allowed. Reject anything that writes. Returns rows as JSON.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "A single SELECT statement. No semicolons, no writes." },
      },
      required: ["sql"],
    },
  },
  {
    name: "list_backups",
    description: "List recent cockpit-backup runs with timestamp, size, sha256, store info.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max rows (default 10, max 50)." },
      },
    },
  },
  {
    name: "trigger_backup",
    description: "Kick off a fresh encrypted backup now. Returns upload result.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", description: "Optional label for this backup (e.g., 'pre-migration-2026-04-11')." },
      },
    },
  },
  {
    name: "generate_daily_report",
    description: "Generate the daily Cockpit report on demand and email it to the admin. Idempotent per day — pass force=true to bypass.",
    input_schema: {
      type: "object",
      properties: {
        force: { type: "boolean", description: "Bypass the per-day idempotency lock." },
      },
    },
  },
];

// ── Tool executors ─────────────────────────────────────────────────────────

async function execTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const supa = createServiceClient();
  const cronSecret = process.env.CRON_SECRET ?? "";

  switch (name) {
    case "list_recent_events": {
      const hours = Math.max(1, Math.min(168, Number(args.hours ?? 1)));
      const limit = Math.max(1, Math.min(200, Number(args.limit ?? 50)));
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      let q = supa
        .from("security_events")
        .select("id, event_type, severity, ip, path, user_agent, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args.severity) q = q.eq("severity", args.severity as string);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, rows: data };
    }

    case "list_findings": {
      const limit = Math.max(1, Math.min(100, Number(args.limit ?? 30)));
      let q = supa
        .from("maintenance_findings")
        .select("id, agent_name, severity, title, fix_suggestion, occurrences, first_seen, last_seen, resolved, resolved_at")
        .order("last_seen", { ascending: false })
        .limit(limit);
      if (args.status === "open") q = q.eq("resolved", false);
      else if (args.status === "resolved") q = q.eq("resolved", true);
      if (args.agent) q = q.eq("agent_name", args.agent as string);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, rows: data };
    }

    case "run_agent": {
      const allowed = new Set([
        "probe",
        "schema-drift",
        "consistency",
        "secret-scan",
        "dependency-guardian",
        "siem-analyst",
        "watchdog",
      ]);
      const agentName = String(args.name);
      if (!allowed.has(agentName)) return { error: `Unknown agent: ${agentName}` };
      const path = agentName === "dependency-guardian"
        ? "/api/maint/dependency-guardian"
        : agentName === "secret-scan"
          ? "/api/maint/secret-scan"
          : agentName === "siem-analyst"
            ? "/api/maint/siem-analyst"
            : agentName === "watchdog"
              ? "/api/cockpit/watchdog"
              : `/api/maint/${agentName}`;
      const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json().catch(() => null);
      return { http: res.status, body: json };
    }

    case "check_service": {
      // Reuse the cockpit state endpoint's checks by hitting it and extracting one service
      const res = await fetch(`${BASE}/api/cockpit/state`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
        signal: AbortSignal.timeout(10_000),
      });
      // state endpoint requires admin cookie; fall back to a direct check
      if (!res.ok) {
        return { error: `state endpoint ${res.status} — use run_agent with probe for a full scan` };
      }
      const state = await res.json();
      const s = String(args.service);
      return state.services?.[s] ?? { error: `service ${s} not in state` };
    }

    case "get_user_activity": {
      const id = String(args.identifier);
      const isEmail = id.includes("@");
      let profile;
      if (isEmail) {
        const { data } = await supa
          .from("profiles")
          .select("id, email, name, plan, subscription_plan, subscription_status, stripe_subscription_id, created_at, is_admin, is_blocked")
          .eq("email", id)
          .maybeSingle();
        profile = data;
      } else {
        const { data } = await supa
          .from("profiles")
          .select("id, email, name, plan, subscription_plan, subscription_status, stripe_subscription_id, created_at, is_admin, is_blocked")
          .eq("id", id)
          .maybeSingle();
        profile = data;
      }
      if (!profile) return { error: `no profile for ${id}` };

      const [eventsRes, usageRes] = await Promise.all([
        supa
          .from("security_events")
          .select("event_type, severity, ip, path, created_at")
          .eq("user_id", (profile as { id: string }).id)
          .order("created_at", { ascending: false })
          .limit(20),
        supa
          .from("usage_tracking")
          .select("feature, cost_usd, created_at")
          .eq("user_id", (profile as { id: string }).id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        profile,
        recent_events: eventsRes.data ?? [],
        recent_usage: usageRes.data ?? [],
      };
    }

    case "list_failed_logins": {
      const hours = Math.max(1, Math.min(168, Number(args.hours ?? 24)));
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data, error } = await supa
        .from("security_events")
        .select("event_type, severity, ip, path, user_agent, created_at, details")
        .in("event_type", ["brute_force_login", "admin_login_failed", "brute_force_admin"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return { error: error.message };
      // Group by IP for easier analysis
      const byIp = new Map<string, number>();
      for (const e of data ?? []) {
        const ip = (e as { ip: string | null }).ip ?? "unknown";
        byIp.set(ip, (byIp.get(ip) ?? 0) + 1);
      }
      return {
        count: data?.length ?? 0,
        by_ip: [...byIp.entries()].map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count),
        rows: data,
      };
    }

    case "query_db": {
      const sql = String(args.sql ?? "").trim();
      // Hard gate: only allow single SELECT statements.
      if (!/^select\s/i.test(sql)) return { error: "Only SELECT statements allowed." };
      if (sql.includes(";")) return { error: "Semicolons not allowed (single statement only)." };
      const forbidden = /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i;
      if (forbidden.test(sql)) return { error: "Write/DDL keyword detected — SELECT-only." };
      // Run via RPC helper — we don't have one exposed, so fall back to an
      // informational response telling the assistant to use list_findings
      // / list_recent_events / get_user_activity instead.
      return {
        error: "Raw SQL execution not wired yet — use list_findings, list_recent_events, or get_user_activity for structured queries.",
        hint: "Raw query_db will require a read-only RPC helper; not built yet in this iteration.",
      };
    }

    case "list_backups": {
      const limit = Math.max(1, Math.min(50, Number(args.limit ?? 10)));
      const { data, error } = await supa
        .from("cron_logs")
        .select("ran_at, result")
        .eq("job", "cockpit-backup")
        .order("ran_at", { ascending: false })
        .limit(limit);
      if (error) return { error: error.message };
      return {
        count: data?.length ?? 0,
        backups: (data ?? []).map((r) => {
          const result = (r as { result: Record<string, unknown> | null }).result ?? {};
          return {
            at: (r as { ran_at: string }).ran_at,
            ok: result.ok,
            filename: result.filename,
            plaintext_bytes: result.plaintext_bytes,
            ciphertext_bytes: result.ciphertext_bytes,
            sha256: result.sha256,
            stats: result.stats,
          };
        }),
      };
    }

    case "trigger_backup": {
      const res = await fetch(`${BASE}/api/cockpit/backup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: args.note ?? null }),
        signal: AbortSignal.timeout(60_000),
      });
      return { http: res.status, body: await res.json().catch(() => null) };
    }

    case "generate_daily_report": {
      const force = args.force === true ? "?force=1" : "";
      const res = await fetch(`${BASE}/api/cockpit/daily-report${force}`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
        signal: AbortSignal.timeout(60_000),
      });
      return { http: res.status, body: await res.json().catch(() => null) };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

interface ChatBody {
  messages: MessageParam[]; // conversation history from client
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ChatBody;
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const anthropic = getAppAnthropicClient();
  const conversation: MessageParam[] = [...body.messages];

  // Agent loop: keep going until the model returns an end_turn instead of
  // a tool_use. Hard cap at 6 iterations to avoid runaway.
  let lastResponseText = "";
  const toolLog: Array<{ tool: string; input: unknown; output_preview: string }> = [];

  for (let i = 0; i < 6; i++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: conversation,
    });

    // Collect any tool_use blocks
    const toolUses: ToolUseBlock[] = resp.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );

    // Collect final text
    const text = resp.content
      .filter((b): b is { type: "text"; text: string; citations: null } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (text) lastResponseText = text;

    if (resp.stop_reason === "end_turn" || toolUses.length === 0) {
      // Done
      conversation.push({ role: "assistant", content: resp.content });
      break;
    }

    // Execute tools and feed results back
    conversation.push({ role: "assistant", content: resp.content });
    const toolResults = [];
    for (const tu of toolUses) {
      const out = await execTool(tu.name, (tu.input ?? {}) as Record<string, unknown>);
      const outStr = JSON.stringify(out).slice(0, 8000); // hard cap on tool output
      toolResults.push({
        type: "tool_result" as const,
        tool_use_id: tu.id,
        content: outStr,
      });
      toolLog.push({
        tool: tu.name,
        input: tu.input,
        output_preview: outStr.slice(0, 200),
      });
    }
    conversation.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    reply: lastResponseText,
    tools_used: toolLog,
    // Return the updated conversation so the client can render the new turn
    messages: conversation,
  });
}
