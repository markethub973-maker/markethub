import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results: Record<string, { ok: boolean; latency: number; detail: string }> = {};

  // ── 1. Supabase ─────────────────────────────────────────────────────────────
  {
    const t = Date.now();
    try {
      const supa = createServiceClient();
      const { error } = await supa.from("profiles").select("id").limit(1);
      results.supabase = { ok: !error, latency: Date.now() - t, detail: error ? error.message : "Connected" };
    } catch (e: any) {
      results.supabase = { ok: false, latency: Date.now() - t, detail: e.message };
    }
  }

  // ── 2. Supabase tables ──────────────────────────────────────────────────────
  {
    const t = Date.now();
    try {
      const supa = createServiceClient();
      const tables = ["research_leads", "agent_runs", "cron_logs", "discount_codes"];
      const missing: string[] = [];
      for (const table of tables) {
        const { error } = await supa.from(table as any).select("id").limit(0);
        if (error) missing.push(table);
      }
      results.supabase_tables = {
        ok: missing.length === 0,
        latency: Date.now() - t,
        detail: missing.length === 0 ? "All 4 tables present" : `Missing: ${missing.join(", ")}`,
      };
    } catch (e: any) {
      results.supabase_tables = { ok: false, latency: Date.now() - t, detail: e.message };
    }
  }

  // ── 3. Anthropic API ────────────────────────────────────────────────────────
  {
    const t = Date.now();
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      results.anthropic = { ok: false, latency: 0, detail: "ANTHROPIC_API_KEY not set" };
    } else {
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
          signal: AbortSignal.timeout(8000),
        });
        results.anthropic = {
          ok: res.status === 200,
          latency: Date.now() - t,
          detail: res.status === 200 ? "Key valid" : `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.anthropic = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  // ── 4. Apify ────────────────────────────────────────────────────────────────
  {
    const t = Date.now();
    const key = process.env.APIFY_TOKEN;
    if (!key) {
      results.apify = { ok: false, latency: 0, detail: "APIFY_TOKEN not set" };
    } else {
      try {
        const res = await fetch(`https://api.apify.com/v2/users/me`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();
        results.apify = {
          ok: res.status === 200,
          latency: Date.now() - t,
          detail: res.status === 200 ? `User: ${data.data?.username || "ok"}` : `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.apify = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  // ── 5. Resend ───────────────────────────────────────────────────────────────
  {
    const t = Date.now();
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      results.resend = { ok: false, latency: 0, detail: "RESEND_API_KEY not set" };
    } else {
      try {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        results.resend = {
          ok: res.status === 200,
          latency: Date.now() - t,
          detail: res.status === 200 ? "Key valid" : `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.resend = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  // ── 6. YouTube API ──────────────────────────────────────────────────────────
  {
    const t = Date.now();
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      results.youtube = { ok: false, latency: 0, detail: "YOUTUBE_API_KEY not set" };
    } else {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`,
          { signal: AbortSignal.timeout(8000) }
        );
        results.youtube = {
          ok: res.status === 200,
          latency: Date.now() - t,
          detail: res.status === 200 ? "Key valid" : `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.youtube = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  // ── 7. Instagram / Meta ─────────────────────────────────────────────────────
  {
    const t = Date.now();
    const supa = createServiceClient();
    const { data } = await supa
      .from("profiles")
      .select("instagram_access_token")
      .not("instagram_access_token", "is", null)
      .limit(1)
      .single();
    const token = data?.instagram_access_token;
    if (!token) {
      results.instagram = { ok: false, latency: 0, detail: "No connected Instagram account" };
    } else {
      try {
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`, {
          signal: AbortSignal.timeout(8000),
        });
        const body = await res.json();
        results.instagram = {
          ok: res.status === 200 && !body.error,
          latency: Date.now() - t,
          detail: res.status === 200 && !body.error ? `@${body.username}` : body.error?.message || `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.instagram = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  // ── 8. Stripe ───────────────────────────────────────────────────────────────
  {
    const t = Date.now();
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      results.stripe = { ok: false, latency: 0, detail: "STRIPE_SECRET_KEY not set" };
    } else {
      try {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        results.stripe = {
          ok: res.status === 200,
          latency: Date.now() - t,
          detail: res.status === 200 ? "Key valid" : `HTTP ${res.status}`,
        };
      } catch (e: any) {
        results.stripe = { ok: false, latency: Date.now() - t, detail: e.message };
      }
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ ok: allOk, checked_at: new Date().toISOString(), services: results });
}
