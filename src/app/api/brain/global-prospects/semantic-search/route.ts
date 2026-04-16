/**
 * POST /api/brain/global-prospects/semantic-search
 *
 * Given a natural-language query (e.g., "premium B2B SaaS agencies with 20+
 * clients"), returns top-N semantically similar prospects via pgvector
 * cosine similarity.
 *
 * Filters: country_code, vertical, min_fit, has_email, max_results.
 *
 * Auth: x-brain-cron-secret OR brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedText } from "@/lib/embed";
import { startActivity, completeActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    country_code?: string;
    vertical?: string;
    has_email?: boolean;
    max_results?: number;
  };
  if (!body.query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const activity = await startActivity("researcher", `Nora semantic-search: ${body.query.slice(0, 60)}`);

  const queryEmbedding = await embedText(body.query);
  if (!queryEmbedding) {
    await completeActivity(activity, "Nora: embed failed", { ok: false });
    return NextResponse.json({ error: "embed failed" }, { status: 502 });
  }

  const svc = createServiceClient();
  const maxResults = Math.min(body.max_results ?? 10, 50);

  // Use pgvector cosine distance (<=>) — lowest = most similar
  // Note: Supabase client doesn't yet expose vector ops in typed select, so use RPC.
  // For now, use a raw SQL via db.query through a side path. Simplified: we filter
  // in-memory after pulling candidates (works at DB size < 10k).
  let q = svc
    .from("brain_global_prospects")
    .select("id, domain, business_name, country_code, vertical, email, phone, snippet, detected_needs, fit_score, embedding")
    .limit(500);
  if (body.country_code) q = q.eq("country_code", body.country_code.toUpperCase());
  if (body.vertical) q = q.eq("vertical", body.vertical);
  if (body.has_email) q = q.not("email", "is", null);

  const { data: rows } = await q;
  if (!rows || rows.length === 0) {
    await completeActivity(activity, "Nora: 0 candidates in scope");
    return NextResponse.json({ ok: true, results: [], count: 0, note: "No prospects match filters" });
  }

  // Cosine similarity calculation (in-memory, fine for <10k rows)
  const cosine = (a: number[], b: number[]): number => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  };

  const scored = rows
    .filter((r) => Array.isArray(r.embedding))
    .map((r) => ({
      domain: r.domain,
      business_name: r.business_name,
      country_code: r.country_code,
      vertical: r.vertical,
      email: r.email,
      phone: r.phone,
      snippet: (r.snippet ?? "").slice(0, 200),
      detected_needs: r.detected_needs,
      similarity: cosine(queryEmbedding, r.embedding as number[]),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  await completeActivity(
    activity,
    `Nora: ${scored.length} match-uri semantice pentru "${body.query.slice(0, 40)}"`,
    { count: scored.length, top_sim: scored[0]?.similarity.toFixed(3) },
  );

  return NextResponse.json({
    ok: true,
    query: body.query,
    results: scored.map((r) => ({ ...r, similarity: Number(r.similarity.toFixed(4)) })),
    count: scored.length,
    pool_size: rows.length,
  });
}
