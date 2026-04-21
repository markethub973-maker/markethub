import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();

  try {
    // Total campaigns processed
    const { count: totalCampaigns } = await supa
      .from("campaign_results")
      .select("id", { count: "exact" });

    // Niches learned (distinct niche from platform_brain)
    const { data: nicheRows } = await supa
      .from("platform_brain")
      .select("niche");
    const uniqueNiches = new Set(
      (nicheRows ?? []).map((r: { niche: string }) => r.niche).filter(Boolean)
    );
    const nichesLearned = uniqueNiches.size;

    // Average confidence from platform_brain
    const { data: confRows } = await supa
      .from("platform_brain")
      .select("confidence");
    const confidences = (confRows ?? [])
      .map((r: { confidence: number | null }) => r.confidence)
      .filter((c): c is number => c !== null && c !== undefined);
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    // Last learning cycle (max updated_at from platform_brain)
    const { data: lastRow } = await supa
      .from("platform_brain")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    const lastLearningCycle = lastRow?.[0]?.updated_at ?? null;

    // Active content hashes (expires_at > now)
    const { count: activeHashes } = await supa
      .from("content_hashes")
      .select("id", { count: "exact" })
      .gt("expires_at", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      totalCampaigns: totalCampaigns ?? 0,
      nichesLearned,
      avgConfidence: parseFloat(avgConfidence.toFixed(2)),
      lastLearningCycle,
      activeHashes: activeHashes ?? 0,
    });
  } catch (error) {
    console.error("Brain status error:", error);
    // Tables may not exist yet — return zeros gracefully
    return NextResponse.json({
      ok: true,
      totalCampaigns: 0,
      nichesLearned: 0,
      avgConfidence: 0,
      lastLearningCycle: null,
      activeHashes: 0,
    });
  }
}
