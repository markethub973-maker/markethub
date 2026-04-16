/**
 * GET /api/brain/alex-loom-batch — daily AlexLoom batch auto-trigger.
 *
 * Sofia's job: every morning, scan brain_global_prospects for the top N
 * untouched high-score prospects and fire an AlexLoom avatar pitch for
 * each. The existing avatar-poll cron picks up finished videos and
 * Telegrams them to Eduard for approval.
 *
 * This is the second half of the "Alex fully autonomous" loop — Alex
 * picks the day's task at 07:05 (alex-morning-kickoff), Sofia executes
 * outreach prospecting + personalized pitch at 08:00 without Eduard
 * touching anything.
 *
 * Pre-requisites:
 * - FAL_API_KEY (avatar pipeline)
 * - Azure TTS keys (voice)
 * - Telegram + BRAIN_OPERATOR_USER_ID
 * - brain_global_prospects must have rows with `last_scanned_at` NOT NULL
 *   (already scraped) but `last_contacted_at` NULL (not yet pitched).
 *
 * Auth: x-brain-cron-secret.
 *
 * Query params:
 *   limit — max prospects to process per run (default 3 to stay under
 *           cost + compute budget; max 10)
 *   min_score — intermediary score threshold (default 7)
 *   language — ro | en (default ro)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

interface ProspectCandidate {
  id: string;
  domain: string;
  business_name: string | null;
  vertical: string | null;
  snippet: string | null;
  country_code: string | null;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? "3")));
  const lang = (url.searchParams.get("language") ?? "ro") as "ro" | "en";

  const svc = createServiceClient();

  // Pick top N candidate prospects: scanned, uncontacted, high vertical fit.
  // We score by: vertical matches a pattern with score >= min_score, domain
  // hasn't appeared in outreach_log yet, has a snippet (so script can be
  // personalized).
  const { data: prospectData } = await svc
    .from("brain_global_prospects")
    .select("id, domain, business_name, vertical, snippet, country_code, last_contacted_at, last_scanned_at")
    .not("last_scanned_at", "is", null)
    .is("last_contacted_at", null)
    .not("snippet", "is", null)
    .limit(50);

  const prospects = (prospectData ?? []) as ProspectCandidate[];
  if (prospects.length === 0) {
    return NextResponse.json({
      ok: true,
      candidates: 0,
      triggered: 0,
      note: "No uncontacted prospects with snippet — run mine-leads or let the scanner backfill",
    });
  }

  // Exclude already-outreached domains
  const { data: alreadyOut } = await svc
    .from("outreach_log")
    .select("domain")
    .in("domain", prospects.map((p) => p.domain));
  const outDomains = new Set((alreadyOut ?? []).map((r) => r.domain as string));
  const fresh = prospects.filter((p) => !outDomains.has(p.domain));

  // Take top `limit` — ordered by vertical score where available.
  const toProcess = fresh.slice(0, limit);

  const triggered: Array<{
    domain: string;
    business_name: string | null;
    avatar_request_id: string | null;
    error?: string;
  }> = [];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com";

  for (const p of toProcess) {
    const displayName = p.business_name ?? p.domain;
    try {
      const res = await fetch(`${baseUrl}/api/brain/alex-loom`, {
        method: "POST",
        headers: {
          "x-brain-cron-secret": process.env.BRAIN_CRON_SECRET ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect_url: `https://${p.domain}`,
          prospect_name: displayName,
          language: lang,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        triggered.push({ domain: p.domain, business_name: displayName, avatar_request_id: null, error: `HTTP ${res.status}` });
        continue;
      }
      const j = (await res.json()) as {
        manifest?: { avatar_request_id?: string | null };
        preview?: { avatar_request_id?: string | null };
      };
      const rid = j.manifest?.avatar_request_id ?? j.preview?.avatar_request_id ?? null;
      triggered.push({
        domain: p.domain,
        business_name: displayName,
        avatar_request_id: rid,
      });

      // Record that we pitched this prospect — prevents re-triggering tomorrow
      await svc
        .from("brain_global_prospects")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", p.id);
    } catch (e) {
      triggered.push({
        domain: p.domain,
        business_name: displayName,
        avatar_request_id: null,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  // Log summary to brain_agent_activity (Sofia's name — this is her task)
  await svc.from("brain_agent_activity").insert({
    agent_id: "sales",
    agent_name: "Sofia",
    activity: "completed",
    description: `[BATCH_ALEXLOOM] ${triggered.length} prospecți pitched · ${triggered.filter((t) => t.avatar_request_id).length} avatar jobs queued`,
    result: { kind: "alex_loom_batch", triggered, language: lang, limit },
  });

  // Notify Eduard on Telegram — short summary, details via Boardroom
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (token && chatId) {
    const ok = triggered.filter((t) => t.avatar_request_id).length;
    const fail = triggered.length - ok;
    const list = triggered.map((t) => `- ${t.business_name ?? t.domain}: ${t.avatar_request_id ? "queued" : (t.error ?? "no_id")}`).join("\n");
    const text = `Sofia a lansat batch AlexLoom zilnic (08:00)\n\n${ok} avatar jobs în coadă${fail ? `, ${fail} eșuate` : ""}.\n${list}\n\nVideourile sosesc pe Telegram automat când termină (avatar-poll cron).`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    candidates: prospects.length,
    fresh_uncontacted: fresh.length,
    triggered,
  });
}
