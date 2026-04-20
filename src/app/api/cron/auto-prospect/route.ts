/**
 * GET /api/cron/auto-prospect — Autonomous prospecting cron
 *
 * Runs daily via GHA. Automatically:
 * 1. Searches Google for Tier 1 businesses (restaurants, dental, beauty, etc.)
 * 2. Reads each website to verify it's NOT a tech company
 * 3. Extracts email + phone
 * 4. Adds to brain_global_prospects if qualified
 * 5. Triggers outreach pipeline for new prospects
 *
 * Targets: Romania (Cluj, Bucuresti, Timisoara) + NYC
 * Budget: max 10 Serper searches + 20 web-reads per run
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { webSearch, webRead, classifyProspect } from "@/lib/webSearch";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

function authOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!h || !cronSecret) return false;
  return h === `Bearer ${cronSecret}`;
}

// Rotate through search queries daily
const SEARCH_QUERIES_RO = [
  "restaurante Cluj Instagram",
  "salon beauty Cluj",
  "cabinet stomatologic Cluj",
  "hotel boutique Cluj",
  "restaurant Bucuresti Instagram",
  "salon beauty Bucuresti",
  "cabinet stomatologic Bucuresti",
  "sala fitness Cluj",
  "clinica estetica Bucuresti",
  "restaurant Timisoara",
  "florarie Cluj online",
  "cofetarie Bucuresti Instagram",
  "spa wellness Cluj",
  "cabinet veterinar Cluj",
  "pizzerie Cluj livrare",
];

const SEARCH_QUERIES_NY = [
  "restaurant Manhattan Instagram",
  "dental practice NYC",
  "boutique hotel Brooklyn",
  "fitness studio Manhattan",
  "beauty salon NYC Instagram",
  "bakery Brooklyn social media",
  "yoga studio NYC",
  "pet grooming Manhattan",
  "flower shop NYC",
  "nail salon NYC Instagram",
];

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();

  // Get existing domains to avoid duplicates
  const { data: existingRows } = await svc
    .from("brain_global_prospects")
    .select("domain")
    .limit(500);

  const existingDomains = new Set((existingRows || []).map((r) => r.domain));

  // Pick 2 random queries (1 RO + 1 NY) to stay within budget
  const roQuery = SEARCH_QUERIES_RO[Math.floor(Math.random() * SEARCH_QUERIES_RO.length)];
  const nyQuery = SEARCH_QUERIES_NY[Math.floor(Math.random() * SEARCH_QUERIES_NY.length)];

  const results: Array<{
    domain: string;
    name: string;
    status: string;
    email?: string;
  }> = [];

  let added = 0;
  let skipped = 0;
  let blocked = 0;

  for (const query of [roQuery, nyQuery]) {
    const isRO = SEARCH_QUERIES_RO.includes(query);
    const country = isRO ? "ro" : "us";
    const lang = isRO ? "ro" : "en";

    let searchResults;
    try {
      searchResults = await webSearch(query, { num: 9, country, lang });
    } catch {
      results.push({ domain: query, name: "search_failed", status: "error" });
      continue;
    }

    for (const sr of searchResults.results.slice(0, 5)) {
      // Extract domain
      let domain = "";
      try {
        domain = new URL(sr.link).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }

      // Skip if already in DB
      if (existingDomains.has(domain)) {
        skipped++;
        continue;
      }

      // Skip obvious non-targets
      if (
        domain.includes("google.") || domain.includes("facebook.") ||
        domain.includes("instagram.") || domain.includes("yelp.") ||
        domain.includes("tripadvisor.") || domain.includes("wikipedia.") ||
        domain.includes("linkedin.") || domain.includes("clutch.co") ||
        domain.includes("g2.com")
      ) {
        skipped++;
        continue;
      }

      // Read the website
      let readResult;
      try {
        readResult = await webRead(sr.link);
      } catch {
        continue;
      }

      if (!readResult.success) continue;

      // Classify — we want NON-marketing businesses (end clients)
      const classification = classifyProspect(readResult.text, readResult.title);

      // BLOCK if it's a tech/software/marketing company
      if (classification.isMarketingAgency) {
        blocked++;
        results.push({ domain, name: readResult.title, status: "blocked_marketing_or_tech" });
        continue;
      }

      // Check for tech keywords that classifyProspect might miss
      const lowerText = (readResult.text + readResult.title).toLowerCase();
      if (
        lowerText.includes("software development") ||
        lowerText.includes("web development") ||
        lowerText.includes("it consulting") ||
        lowerText.includes("saas") ||
        lowerText.includes("programare")
      ) {
        blocked++;
        results.push({ domain, name: readResult.title, status: "blocked_tech" });
        continue;
      }

      // Extract best email
      const email = readResult.emails.find((e) =>
        !e.includes("noreply") && !e.includes("no-reply") && !e.includes("example.com")
      ) || readResult.emails[0] || null;

      // Add to prospects
      const { error } = await svc.from("brain_global_prospects").insert({
        domain,
        business_name: (readResult.title || sr.title || domain).slice(0, 200),
        country_code: isRO ? "RO" : "US",
        vertical: "end_client_business",
        intermediary_type: "end_client",
        website: sr.link,
        email,
        phone: readResult.phones[0] || null,
        snippet: sr.snippet?.slice(0, 300) || readResult.text.slice(0, 300),
        detected_needs: ["social-media-content"],
        outreach_status: "prospect",
      });

      if (!error) {
        added++;
        existingDomains.add(domain);
        results.push({ domain, name: readResult.title, status: "added", email: email || undefined });
      } else {
        results.push({ domain, name: readResult.title, status: `db_error: ${error.message.slice(0, 50)}` });
      }
    }
  }

  // Log
  await svc.from("cron_logs").upsert({
    job: "auto-prospect",
    ran_at: new Date().toISOString(),
    result: { queries: [roQuery, nyQuery], added, skipped, blocked, total_results: results.length },
  });

  // Telegram notification if we found new prospects
  if (added > 0) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (token && chatId) {
      const newList = results
        .filter((r) => r.status === "added")
        .map((r) => `  • ${r.name} (${r.domain}) — ${r.email || "no email"}`)
        .join("\n");
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔍 Auto-Prospect: ${added} noi gasiti!\n\nCautari: ${roQuery} + ${nyQuery}\n\n${newList}\n\nTotal DB: ${existingDomains.size} prospecti`,
        }),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    queries: [roQuery, nyQuery],
    added,
    skipped,
    blocked,
    results,
  });
}
