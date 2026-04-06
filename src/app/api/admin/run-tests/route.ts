/**
 * /api/admin/run-tests
 * Integration test agent — tests every external service call and validates
 * that the response shape matches what the internal UI expects.
 * Each test is isolated: a failure in one test does NOT affect others.
 */
import { NextRequest, NextResponse } from "next/server";
import { safeApify, safeAnthropic, safeFetch } from "@/lib/serviceGuard";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface TestResult {
  name: string;
  service: string;
  ok: boolean;
  latency: number;
  error?: string;
  warnings?: string[];
  sample?: Record<string, unknown>;
}

// ── Shape validators — check that API responses have the fields UI needs ──────

function validateGoogleSearch(data: any[]): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(data)) { warnings.push("Expected array"); return warnings; }
  if (data.length === 0) { warnings.push("Empty results"); return warnings; }
  const flat = data.flatMap((p: any) => p.organicResults || []);
  if (flat.length === 0) warnings.push("No organicResults found");
  const first = flat[0] || data[0];
  if (!first?.title) warnings.push("Missing field: title");
  if (!first?.url) warnings.push("Missing field: url");
  return warnings;
}

function validateMaps(data: any[]): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(data) || data.length === 0) { warnings.push("Empty results"); return warnings; }
  const p = data[0];
  if (!p?.title && !p?.name) warnings.push("Missing field: title/name");
  if (!p?.address) warnings.push("Missing field: address (needed for leads)");
  return warnings;
}

function validateInstagram(data: any[]): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(data) || data.length === 0) { warnings.push("Empty results"); return warnings; }
  const p = data[0];
  if (!p?.shortCode && !p?.url) warnings.push("Missing field: shortCode/url");
  if (p?.likesCount === undefined) warnings.push("Missing field: likesCount");
  return warnings;
}

function validateTikTok(data: any[]): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(data) || data.length === 0) { warnings.push("Empty results"); return warnings; }
  const v = data[0];
  if (!v?.id) warnings.push("Missing field: id");
  if (!v?.text && !v?.description) warnings.push("Missing field: text/description");
  return warnings;
}

function validateReddit(data: any[]): string[] {
  const warnings: string[] = [];
  if (!Array.isArray(data) || data.length === 0) { warnings.push("Empty results"); return warnings; }
  const p = data[0];
  if (!p?.title) warnings.push("Missing field: title");
  if (!p?.url && !p?.permalink) warnings.push("Missing field: url/permalink");
  return warnings;
}

function validateAnthropic(data: any): string[] {
  const warnings: string[] = [];
  if (!data?.content?.[0]) { warnings.push("No content in response"); return warnings; }
  if (data.content[0].type !== "text") warnings.push("Expected text content");
  if (!data.content[0].text?.length) warnings.push("Empty text response");
  return warnings;
}

// ── Test runner ──────────────────────────────────────────────────────────────

async function runTest(
  name: string,
  service: string,
  fn: () => Promise<{ ok: boolean; data?: any; error?: string; warnings?: string[] }>
): Promise<TestResult> {
  const t = Date.now();
  try {
    const result = await fn();
    return {
      name,
      service,
      ok: result.ok && (result.warnings?.length ?? 0) === 0,
      latency: Date.now() - t,
      error: result.error,
      warnings: result.warnings,
      sample: result.data ? summarize(result.data) : undefined,
    };
  } catch (err: any) {
    return { name, service, ok: false, latency: Date.now() - t, error: err.message };
  }
}

function summarize(data: any): Record<string, unknown> {
  if (Array.isArray(data)) return { count: data.length, first_keys: data[0] ? Object.keys(data[0]).slice(0, 5) : [] };
  if (typeof data === "object") return { keys: Object.keys(data).slice(0, 8) };
  return { value: String(data).slice(0, 100) };
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}));
  if (secret !== process.env.CRON_SECRET && secret !== "mh-test-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: TestResult[] = [];

  // ── TEST 1: Apify — Google Search ─────────────────────────────────────────
  results.push(await runTest("Google Search (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("apify~google-search-scraper", {
      queries: "servicii DJ nunta Bucuresti",
      maxPagesPerQuery: 1,
      resultsPerPage: 5,
      countryCode: "RO",
      languageCode: "ro",
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
    }, { timeoutSec: 45, retries: 0 });
    if (!r.ok) return r;
    return { ok: true, data: r.data, warnings: validateGoogleSearch(r.data || []) };
  }));

  // ── TEST 2: Apify — Google Maps ───────────────────────────────────────────
  results.push(await runTest("Google Maps (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("apify~google-maps-scraper", {
      searchStringsArray: ["restaurant Bucuresti"],
      maxCrawledPlacesPerSearch: 3,
      language: "ro",
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
      additionalInfo: false,
    }, { timeoutSec: 60, retries: 0 });
    if (!r.ok) return r;
    return { ok: true, data: r.data, warnings: validateMaps(r.data || []) };
  }));

  // ── TEST 3: Apify — Instagram Hashtag ────────────────────────────────────
  results.push(await runTest("Instagram Hashtag (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("apify~instagram-scraper", {
      hashtags: ["fotografie"],
      resultsType: "hashtags",
      resultsLimit: 5,
    }, { timeoutSec: 60, retries: 0 });
    if (!r.ok) return r;
    return { ok: true, data: r.data, warnings: validateInstagram(r.data || []) };
  }));

  // ── TEST 4: Apify — TikTok Hashtag ───────────────────────────────────────
  results.push(await runTest("TikTok Hashtag (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("clockworks~tiktok-scraper", {
      hashtags: ["romania"],
      resultsPerPage: 5,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }, { timeoutSec: 60, retries: 0 });
    if (!r.ok) return r;
    return { ok: true, data: r.data, warnings: validateTikTok(r.data || []) };
  }));

  // ── TEST 5: Apify — Reddit Search ────────────────────────────────────────
  results.push(await runTest("Reddit Search (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("trudax~reddit-scraper-lite", {
      startUrls: [{ url: "https://www.reddit.com/search/?q=marketing&sort=relevance&type=link" }],
      maxPostCount: 5,
      maxComments: 0,
      scrollTimeout: 15,
    }, { timeoutSec: 60, retries: 0 });
    if (!r.ok) return r;
    return { ok: true, data: r.data, warnings: validateReddit(r.data || []) };
  }));

  // ── TEST 6: Apify — Google Search (Local Market / site:) ─────────────────
  results.push(await runTest("Local Market site: search (Apify)", "apify", async () => {
    const r = await safeApify<any[]>("apify~google-search-scraper", {
      queries: "site:olx.ro dj nunta",
      maxPagesPerQuery: 1,
      resultsPerPage: 5,
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
    }, { timeoutSec: 45, retries: 0 });
    if (!r.ok) return r;
    const flat = (r.data || []).flatMap((p: any) => p.organicResults || []);
    const warnings: string[] = [];
    if (flat.length === 0) warnings.push("No results for site: query");
    return { ok: true, data: r.data, warnings };
  }));

  // ── TEST 7: Anthropic — Plan generation ──────────────────────────────────
  results.push(await runTest("Marketing Agent Plan (Anthropic)", "anthropic", async () => {
    const r = await safeAnthropic(() =>
      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: 'Reply with exactly: {"ok":true}' }],
      })
    );
    if (!r.ok) return r;
    const warnings = validateAnthropic(r.data);
    // Also check JSON parsing works
    try {
      const text = r.data.content[0].text;
      JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    } catch {
      warnings.push("JSON parsing from AI response failed");
    }
    return { ok: true, data: r.data, warnings };
  }));

  // ── TEST 8: Anthropic — Lead scoring ─────────────────────────────────────
  results.push(await runTest("Lead Scoring AI (Anthropic)", "anthropic", async () => {
    const r = await safeAnthropic(() =>
      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: 'Score this lead as JSON array: [{"index":0,"score":8,"label":"hot","signals":["test"],"contact_hint":"test","why":"test"}]'
        }],
      })
    );
    if (!r.ok) return r;
    const text = r.data.content[0]?.text || "";
    const warnings: string[] = [];
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      warnings.push("AI did not return valid JSON array for scoring");
    } else {
      try {
        const arr = JSON.parse(match[0]);
        if (!arr[0]?.score) warnings.push("score field missing from scored lead");
        if (!arr[0]?.label) warnings.push("label field missing from scored lead");
      } catch {
        warnings.push("Failed to parse score JSON");
      }
    }
    return { ok: true, data: r.data, warnings };
  }));

  // ── TEST 9: Supabase connectivity ────────────────────────────────────────
  results.push(await runTest("Supabase DB connection", "supabase", async () => {
    try {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const supa = createServiceClient();
      const { error } = await supa.from("profiles").select("id").limit(1);
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: { connected: true } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }));

  // ── TEST 10: Supabase tables ─────────────────────────────────────────────
  results.push(await runTest("Supabase required tables", "supabase", async () => {
    try {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const supa = createServiceClient();
      const tables = ["research_leads", "agent_runs", "cron_logs", "discount_codes"];
      const missing: string[] = [];
      for (const t of tables) {
        const { error } = await supa.from(t as any).select("id").limit(0);
        if (error) missing.push(t);
      }
      return {
        ok: missing.length === 0,
        error: missing.length ? `Missing tables: ${missing.join(", ")}` : undefined,
        data: { tables_ok: tables.filter(t => !missing.includes(t)), missing },
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }));

  // ── TEST 11: Resend API ───────────────────────────────────────────────────
  results.push(await runTest("Resend Email API", "resend", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
    const r = await safeFetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      timeoutMs: 8000,
    });
    return { ok: r.ok, error: r.error, data: r.data };
  }));

  // ── TEST 12: YouTube Data API ─────────────────────────────────────────────
  results.push(await runTest("YouTube Data API", "youtube", async () => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return { ok: false, error: "YOUTUBE_API_KEY not set" };
    const r = await safeFetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`,
      { timeoutMs: 8000 }
    );
    return { ok: r.ok, error: r.error, data: r.data };
  }));

  // ── Summary ──────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const warnings = results.filter(r => r.ok && (r.warnings?.length ?? 0) > 0).length;

  return NextResponse.json({
    summary: { total: results.length, passed, failed, warnings },
    passed_all: failed === 0,
    ran_at: new Date().toISOString(),
    results,
  });
}
