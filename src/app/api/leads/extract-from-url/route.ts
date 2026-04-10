import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAndExtract } from "@/lib/leadScraper";
import { requireAuth } from "@/lib/route-helpers";

// Bulk scraper used by Research Hub when saving Google search results.
// The actual fetch + parse + libphonenumber validation lives in lib/leadScraper.ts
// so the per-row Enrich button can reuse the exact same code path.
// Per-URL timeout 8s, total batch capped to 30 URLs to avoid runaway.

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const body = await req.json();
  const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
  if (!urls.length) return NextResponse.json({ error: "urls array required" }, { status: 400 });

  const capped = urls.slice(0, 30);

  // Fetch in parallel batches of 6 to avoid hammering
  const results: Awaited<ReturnType<typeof fetchAndExtract>>[] = [];
  for (let i = 0; i < capped.length; i += 6) {
    const batch = capped.slice(i, i + 6);
    const settled = await Promise.all(batch.map(u => fetchAndExtract(u).catch(() => ({
      url: u, ok: false, emails: [] as string[], phones: [] as string[], error: "exception",
    }))));
    results.push(...settled);
  }

  return NextResponse.json({ results, total: results.length });
}
