/**
 * GET /api/brain/cross-sell
 *
 * Surfaces pairs/clusters of clients with overlapping needs — candidates
 * for bundle pricing, referral loops, or adjacent-service upsells.
 *
 * Example output: "If we built an 'ads + content' combo, these 12
 * clients all have both needs — bundle them."
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1" &&
      req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minOverlap = Math.max(2, Number(req.nextUrl.searchParams.get("min") ?? "2"));
  const svc = createServiceClient();

  // Get all clients with their needs
  const { data: clients } = await svc
    .from("brain_client_needs")
    .select("domain, business_name, vertical, needs, match_score")
    .limit(500);

  if (!clients || clients.length < 2) {
    return NextResponse.json({ ok: true, total_clients: 0, clusters: [], note: "Not enough data yet" });
  }

  // Build need → domain[] map
  const needIndex: Record<string, string[]> = {};
  clients.forEach((c) => {
    (c.needs as string[] ?? []).forEach((n) => {
      if (!needIndex[n]) needIndex[n] = [];
      needIndex[n].push(c.domain as string);
    });
  });

  // Clusters: needs with ≥ minOverlap clients sharing them
  const clusters = Object.entries(needIndex)
    .filter(([, domains]) => domains.length >= minOverlap)
    .map(([need, domains]) => ({ need, client_count: domains.length, clients: domains.slice(0, 20) }))
    .sort((a, b) => b.client_count - a.client_count)
    .slice(0, 30);

  // Pairs of domains sharing ≥ 3 needs (high-value bundle candidates)
  const pairs: Array<{ a: string; b: string; shared_needs: string[] }> = [];
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const a = clients[i];
      const b = clients[j];
      const aNeeds = new Set<string>(a.needs as string[] ?? []);
      const shared = ((b.needs as string[] ?? []).filter((n) => aNeeds.has(n)));
      if (shared.length >= 3) {
        pairs.push({ a: a.domain as string, b: b.domain as string, shared_needs: shared });
      }
      if (pairs.length > 30) break;
    }
    if (pairs.length > 30) break;
  }

  return NextResponse.json({
    ok: true,
    total_clients: clients.length,
    unique_needs: Object.keys(needIndex).length,
    clusters, // group by need
    high_overlap_pairs: pairs.slice(0, 20), // pairs sharing ≥ 3 needs
  });
}
