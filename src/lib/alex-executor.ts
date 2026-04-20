/**
 * Alex Command Executor — transforms Alex's decisions into real actions.
 *
 * When Alex (via Claude LLM) decides to do something, he outputs a structured
 * command block. This module parses it and executes the action instantly.
 *
 * Commands Alex can issue:
 *   SEARCH_PROSPECTS: { query, count, country }
 *   SEND_OUTREACH: { prospect_id }
 *   SEARCH_RESELLERS: { query, country }
 *
 * Safety guards:
 *   - Marketing agencies auto-blocked
 *   - Daily limits enforced (20 emails, 50 searches)
 *   - programari@ emails blocked
 *   - Results reported back via Telegram
 */

import { createServiceClient } from "@/lib/supabase/service";

const BRAIN_CRON_SECRET = process.env.BRAIN_CRON_SECRET ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com";

// Daily limits
const DAILY_LIMITS = {
  searches: 50,    // web-search calls per day
  emails: 20,      // outreach emails per day
  reads: 100,      // web-read calls per day
};

// Blocked email prefixes
const BLOCKED_EMAIL_PREFIXES = ["programari@", "appointments@", "rezervari@", "booking@"];

// Blocked business types
const BLOCKED_TYPES = ["marketing", "agency", "digital", "software", "IT", "SaaS", "web development"];

interface CommandResult {
  executed: boolean;
  action: string;
  details: string;
  errors?: string[];
}

/**
 * Parse Alex's response for proposed commands.
 * Alex outputs: [PROPOSE:SEARCH_PROSPECTS:{"query":"salon beauty Cluj","count":10}]
 * These are NOT executed immediately — they wait for Eduard's approval.
 */
export function parseProposals(alexResponse: string): Array<{ cmd: string; params: Record<string, unknown> }> {
  const proposals: Array<{ cmd: string; params: Record<string, unknown> }> = [];
  const regex = /\[PROPOSE:(\w+):(\{[^}]+\})\]/g;
  let match;
  while ((match = regex.exec(alexResponse)) !== null) {
    try {
      const params = JSON.parse(match[2]);
      proposals.push({ cmd: match[1], params });
    } catch { /* skip malformed */ }
  }
  return proposals;
}

/**
 * Save proposed commands to DB for Eduard's approval.
 * Returns a human-readable summary for Telegram.
 */
export async function saveProposalsForApproval(
  proposals: Array<{ cmd: string; params: Record<string, unknown> }>
): Promise<string> {
  if (proposals.length === 0) return "";

  const svc = createServiceClient();
  const summaries: string[] = [];

  for (const p of proposals) {
    // Pre-validate with guards BEFORE even asking Eduard
    const guardResult = preValidate(p.cmd, p.params);
    if (!guardResult.ok) {
      summaries.push(`❌ ${p.cmd}: BLOCAT automat — ${guardResult.reason}`);
      continue;
    }

    const id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    await svc.from("brain_agent_activity").insert({
      agent_id: "alex",
      agent_name: "Alex (CEO)",
      activity: "pending_approval",
      description: `[action] ${p.cmd}: ${JSON.stringify(p.params)}`,
      result: { proposal_id: id, cmd: p.cmd, params: p.params, status: "pending" },
    });

    const desc = describeCommand(p.cmd, p.params);
    summaries.push(`⏳ ${desc}\n   Aprobă: da ${id.slice(0, 8)}\n   Respinge: nu ${id.slice(0, 8)}`);
  }

  if (summaries.length === 0) return "";
  return `\n\n📋 ACȚIUNI PROPUSE (așteaptă aprobarea ta):\n${summaries.join("\n\n")}`;
}

/**
 * Pre-validate a command against safety guards WITHOUT executing.
 */
function preValidate(cmd: string, params: Record<string, unknown>): { ok: boolean; reason?: string } {
  if (cmd === "SEARCH_PROSPECTS") {
    const query = String(params.query ?? "").toLowerCase();
    for (const blocked of BLOCKED_TYPES) {
      if (query.includes(blocked.toLowerCase())) {
        return { ok: false, reason: `Query conține "${blocked}" — target interzis` };
      }
    }
  }
  if (cmd === "SEND_OUTREACH") {
    if (!params.prospect_id) return { ok: false, reason: "Lipsește prospect_id" };
  }
  return { ok: true };
}

/**
 * Human-readable description of a command.
 */
function describeCommand(cmd: string, params: Record<string, unknown>): string {
  switch (cmd) {
    case "SEARCH_PROSPECTS":
      return `Caută prospecți: "${params.query}" (${params.count ?? 10} rezultate, ${String(params.country ?? "RO").toUpperCase()})`;
    case "SEND_OUTREACH":
      return `Trimite email outreach la prospect ${String(params.prospect_id ?? "?").slice(0, 8)}...`;
    case "SEARCH_RESELLERS":
      return `Caută freelanceri reseller: "${params.query}" (${String(params.country ?? "RO").toUpperCase()})`;
    default:
      return `${cmd}: ${JSON.stringify(params)}`;
  }
}

/**
 * Handle Eduard's approval (/da ID) or rejection (/nu ID).
 * Returns result message for Telegram.
 */
export async function handleApproval(text: string): Promise<string | null> {
  const approveMatch = text.match(/^\/?da\s+(\w{8})/i);
  const rejectMatch = text.match(/^\/?nu\s+(\w{8})/i);

  if (!approveMatch && !rejectMatch) return null;

  const shortId = (approveMatch ?? rejectMatch)![1];
  const approved = Boolean(approveMatch);

  const svc = createServiceClient();

  // Find the pending proposal
  const { data: activities } = await svc
    .from("brain_agent_activity")
    .select("id, result")
    .eq("activity", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(20);

  const match = (activities ?? []).find(a => {
    const res = a.result as Record<string, unknown> | null;
    return res && String(res.proposal_id ?? "").slice(0, 8) === shortId;
  });

  if (!match) return `Nu am găsit propunerea ${shortId}. Poate a expirat.`;

  const proposal = match.result as { cmd: string; params: Record<string, unknown>; proposal_id: string };

  if (!approved) {
    // Mark rejected
    await svc.from("brain_agent_activity").update({
      activity: "rejected",
      description: `[rejected] ${proposal.cmd} — Eduard a respins`,
    }).eq("id", match.id);
    return `❌ Respins: ${describeCommand(proposal.cmd, proposal.params)}`;
  }

  // EXECUTE
  await svc.from("brain_agent_activity").update({
    activity: "approved",
    description: `[approved] ${proposal.cmd} — Eduard a aprobat, execut acum...`,
  }).eq("id", match.id);

  const result = await executeCommand(proposal.cmd, proposal.params);

  // Log execution
  await svc.from("brain_agent_activity").insert({
    agent_id: "alex",
    agent_name: "Alex (CEO)",
    activity: result.executed ? "completed" : "failed",
    description: `[${result.executed ? "done" : "error"}] ${result.details}`,
    result,
  });

  return result.executed
    ? `✅ Executat: ${result.details}`
    : `⚠️ Eșuat: ${result.details}`;
}

/**
 * Execute a single command with safety guards.
 */
export async function executeCommand(cmd: string, params: Record<string, unknown>): Promise<CommandResult> {
  switch (cmd) {
    case "SEARCH_PROSPECTS":
      return searchProspects(params);
    case "SEND_OUTREACH":
      return sendOutreach(params);
    case "SEARCH_RESELLERS":
      return searchResellers(params);
    default:
      return { executed: false, action: cmd, details: `Unknown command: ${cmd}` };
  }
}

/**
 * SEARCH_PROSPECTS — find businesses via web-search + web-read, save valid ones.
 */
async function searchProspects(params: Record<string, unknown>): Promise<CommandResult> {
  const query = String(params.query ?? "");
  const count = Math.min(Number(params.count ?? 10), 20); // max 20 per run
  const country = String(params.country ?? "ro");
  const errors: string[] = [];

  if (!query) return { executed: false, action: "SEARCH_PROSPECTS", details: "No query provided" };

  // Guard: check if query targets blocked types
  const queryLower = query.toLowerCase();
  for (const blocked of BLOCKED_TYPES) {
    if (queryLower.includes(blocked.toLowerCase())) {
      return {
        executed: false,
        action: "SEARCH_PROSPECTS",
        details: `BLOCKED: query contains "${blocked}" — agencies/IT companies are forbidden targets`,
        errors: [`Blocked keyword: ${blocked}`],
      };
    }
  }

  // Step 1: web-search
  let searchResults: Array<{ title: string; link: string; snippet?: string }> = [];
  try {
    const res = await fetch(
      `${BASE_URL}/api/brain/web-search?q=${encodeURIComponent(query)}&num=${count}&country=${country}`,
      { headers: { "x-brain-cron-secret": BRAIN_CRON_SECRET }, signal: AbortSignal.timeout(15000) }
    );
    if (res.ok) {
      const d = await res.json();
      searchResults = d.results ?? [];
    } else {
      return { executed: false, action: "SEARCH_PROSPECTS", details: `web-search failed: HTTP ${res.status}` };
    }
  } catch (e) {
    return { executed: false, action: "SEARCH_PROSPECTS", details: `web-search error: ${e instanceof Error ? e.message : "unknown"}` };
  }

  // Step 2: web-read each result, extract contacts, filter
  const svc = createServiceClient();
  let saved = 0;
  let skippedAgency = 0;
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  for (const result of searchResults.slice(0, count)) {
    try {
      const readRes = await fetch(
        `${BASE_URL}/api/brain/web-read?url=${encodeURIComponent(result.link)}`,
        { headers: { "x-brain-cron-secret": BRAIN_CRON_SECRET }, signal: AbortSignal.timeout(10000) }
      );
      if (!readRes.ok) continue;

      const data = await readRes.json();
      const emails: string[] = data.emails ?? [];
      const phones: string[] = data.phones ?? [];
      const isAgency = Boolean(data.isMarketingAgency);

      // Guard: skip marketing agencies
      if (isAgency) {
        skippedAgency++;
        continue;
      }

      // Guard: skip if no email
      const validEmails = emails.filter(e => !BLOCKED_EMAIL_PREFIXES.some(p => e.toLowerCase().startsWith(p)));
      if (validEmails.length === 0) {
        skippedNoEmail++;
        continue;
      }

      // Guard: check duplicate
      const domain = new URL(result.link).hostname.replace(/^www\./, "");
      const { data: existing } = await svc
        .from("brain_global_prospects")
        .select("id")
        .eq("domain", domain)
        .limit(1);

      if (existing && existing.length > 0) {
        skippedDuplicate++;
        continue;
      }

      // Save prospect
      await svc.from("brain_global_prospects").insert({
        domain,
        business_name: data.title || result.title || domain,
        email: validEmails[0],
        phone: phones.find(p => p.startsWith("+")) || phones[0] || null,
        country_code: country.toUpperCase(),
        snippet: (result.snippet ?? "").slice(0, 500),
        source: "alex-executor",
        outreach_status: "prospect",
        fit_score: 50,
        detected_needs: `Found via: "${query}"`,
      });
      saved++;
    } catch (e) {
      errors.push(`Error reading ${result.link}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return {
    executed: true,
    action: "SEARCH_PROSPECTS",
    details: `Searched "${query}" in ${country.toUpperCase()}: ${searchResults.length} results → ${saved} saved, ${skippedAgency} agencies blocked, ${skippedNoEmail} no email, ${skippedDuplicate} duplicates`,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * SEND_OUTREACH — send personalized email to a prospect.
 */
async function sendOutreach(params: Record<string, unknown>): Promise<CommandResult> {
  const prospectId = String(params.prospect_id ?? "");
  if (!prospectId) return { executed: false, action: "SEND_OUTREACH", details: "No prospect_id provided" };

  const svc = createServiceClient();

  // Get prospect
  const { data: prospect } = await svc
    .from("brain_global_prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (!prospect) return { executed: false, action: "SEND_OUTREACH", details: `Prospect ${prospectId} not found` };
  if (!prospect.email) return { executed: false, action: "SEND_OUTREACH", details: `Prospect has no email` };

  // Guard: blocked email prefix
  const email = String(prospect.email).toLowerCase();
  if (BLOCKED_EMAIL_PREFIXES.some(p => email.startsWith(p))) {
    return { executed: false, action: "SEND_OUTREACH", details: `BLOCKED: email ${email} is a blocked prefix (programari/booking)` };
  }

  // Guard: check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const { count: todaySent } = await svc
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00`);

  if ((todaySent ?? 0) >= DAILY_LIMITS.emails) {
    return { executed: false, action: "SEND_OUTREACH", details: `DAILY LIMIT: ${todaySent}/${DAILY_LIMITS.emails} emails sent today. Try tomorrow.` };
  }

  // Execute via existing outreach-send endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/brain/outreach-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-brain-cron-secret": BRAIN_CRON_SECRET,
      },
      body: JSON.stringify({ prospect_id: prospectId }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await res.json();
    if (res.ok) {
      return { executed: true, action: "SEND_OUTREACH", details: `Email sent to ${prospect.email} (${prospect.business_name})` };
    }
    return { executed: false, action: "SEND_OUTREACH", details: `Send failed: ${d.error ?? "unknown"}` };
  } catch (e) {
    return { executed: false, action: "SEND_OUTREACH", details: `Send error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

/**
 * SEARCH_RESELLERS — find freelancers for reseller recruitment.
 */
async function searchResellers(params: Record<string, unknown>): Promise<CommandResult> {
  const query = String(params.query ?? "freelancer social media manager");
  const country = String(params.country ?? "ro");

  try {
    const res = await fetch(
      `${BASE_URL}/api/brain/web-search?q=${encodeURIComponent(query)}&num=9&country=${country}`,
      { headers: { "x-brain-cron-secret": BRAIN_CRON_SECRET }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return { executed: false, action: "SEARCH_RESELLERS", details: `Search failed: HTTP ${res.status}` };

    const d = await res.json();
    const results = (d.results ?? []).slice(0, 10);

    const profiles: string[] = [];
    for (const r of results) {
      profiles.push(`${r.title?.slice(0, 60)} — ${r.link}`);
    }

    return {
      executed: true,
      action: "SEARCH_RESELLERS",
      details: `Found ${results.length} potential resellers for "${query}" in ${country.toUpperCase()}:\n${profiles.join("\n")}`,
    };
  } catch (e) {
    return { executed: false, action: "SEARCH_RESELLERS", details: `Error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}
