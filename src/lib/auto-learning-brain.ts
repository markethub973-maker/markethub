/**
 * Auto-Learning Brain — stores META-PATTERNS (tone, format, timing),
 * NOT content. Claude generates fresh text each time via uniqueness engine.
 *
 * Two knowledge layers:
 *   1. Personal (user_brain_profiles) — per-user running averages
 *   2. Platform (platform_brain)      — anonymous aggregate across all users
 *
 * All DB operations use the service client (server-side only).
 */

import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignResult {
  platform: string;
  niche: string;
  geo?: string;
  tone: string;
  format: string;
  postTime: string; // HH:MM
  engagementRate: number; // 0-100
  impressions: number;
  clicks: number;
  saves: number;
  shares: number;
  hashtags?: string[];
  contentLength?: number;
}

export interface UserBrainProfile {
  user_id: string;
  avg_engagement: number;
  best_tone: string;
  best_format: string;
  best_time: string;
  top_hashtags: string[];
  total_campaigns: number;
  successful_campaigns: number;
  updated_at: string;
}

export interface PlatformBrainData {
  platform: string;
  niche: string;
  geo: string | null;
  avg_engagement: number;
  best_tone: string;
  best_format: string;
  best_time: string;
  sample_size: number;
  confidence: number; // 0-1
  updated_at: string;
}

export interface Recommendations {
  tone: string;
  format: string;
  bestTime: string;
  confidence: number;
  source: "personal" | "platform" | "default";
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_RECOMMENDATIONS: Recommendations = {
  tone: "professional",
  format: "carousel",
  bestTime: "10:00",
  confidence: 0,
  source: "default",
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Save a campaign result for future learning.
 */
export async function saveCampaignResult(
  userId: string,
  sessionId: string,
  result: CampaignResult
): Promise<void> {
  const db = createServiceClient();

  const { error } = await db.from("campaign_results").insert({
    user_id: userId,
    session_id: sessionId,
    platform: result.platform,
    niche: result.niche,
    geo: result.geo ?? null,
    tone: result.tone,
    format: result.format,
    post_time: result.postTime,
    engagement_rate: result.engagementRate,
    impressions: result.impressions,
    clicks: result.clicks,
    saves: result.saves,
    shares: result.shares,
    hashtags: result.hashtags ?? [],
    content_length: result.contentLength ?? null,
  });

  if (error) {
    console.error("[auto-learning-brain] saveCampaignResult error:", error.message);
  }
}

/**
 * Update the user's personal brain profile with running averages.
 */
export async function updateUserProfile(
  userId: string,
  result: CampaignResult,
  isSuccess: boolean
): Promise<void> {
  const db = createServiceClient();

  // Read existing profile
  const { data: existing } = await db
    .from("user_brain_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const totalCampaigns = (existing?.total_campaigns ?? 0) + 1;
  const successfulCampaigns =
    (existing?.successful_campaigns ?? 0) + (isSuccess ? 1 : 0);

  // Running average for engagement
  const prevAvg = existing?.avg_engagement ?? 0;
  const prevCount = existing?.total_campaigns ?? 0;
  const newAvgEngagement =
    prevCount === 0
      ? result.engagementRate
      : (prevAvg * prevCount + result.engagementRate) / totalCampaigns;

  // Best tone/format/time: keep whichever correlates with higher engagement
  const bestTone =
    isSuccess && result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.tone
      : existing?.best_tone ?? result.tone;

  const bestFormat =
    isSuccess && result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.format
      : existing?.best_format ?? result.format;

  const bestTime =
    isSuccess && result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.postTime
      : existing?.best_time ?? result.postTime;

  // Merge top hashtags (keep top 20 by frequency — simple append + dedupe)
  const prevHashtags: string[] = existing?.top_hashtags ?? [];
  const merged = [...prevHashtags, ...(result.hashtags ?? [])];
  const freq = new Map<string, number>();
  for (const h of merged) freq.set(h, (freq.get(h) ?? 0) + 1);
  const topHashtags = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

  const row = {
    user_id: userId,
    avg_engagement: Math.round(newAvgEngagement * 100) / 100,
    best_tone: bestTone,
    best_format: bestFormat,
    best_time: bestTime,
    top_hashtags: topHashtags,
    total_campaigns: totalCampaigns,
    successful_campaigns: successfulCampaigns,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from("user_brain_profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("[auto-learning-brain] updateUserProfile error:", error.message);
  }
}

/**
 * Update the anonymous platform-wide brain aggregate.
 */
export async function updatePlatformBrain(
  result: CampaignResult
): Promise<void> {
  const db = createServiceClient();
  const key = `${result.platform}:${result.niche}:${result.geo ?? "global"}`;

  const { data: existing } = await db
    .from("platform_brain")
    .select("*")
    .eq("lookup_key", key)
    .maybeSingle();

  const sampleSize = (existing?.sample_size ?? 0) + 1;
  const prevAvg = existing?.avg_engagement ?? 0;
  const prevCount = existing?.sample_size ?? 0;
  const newAvg =
    prevCount === 0
      ? result.engagementRate
      : (prevAvg * prevCount + result.engagementRate) / sampleSize;

  // Confidence: logistic-ish curve — reaches ~0.9 at 50 samples
  const confidence = Math.min(1, 1 - 1 / (1 + sampleSize / 25));

  const bestTone =
    result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.tone
      : existing?.best_tone ?? result.tone;

  const bestFormat =
    result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.format
      : existing?.best_format ?? result.format;

  const bestTime =
    result.engagementRate > (existing?.avg_engagement ?? 0)
      ? result.postTime
      : existing?.best_time ?? result.postTime;

  const row = {
    lookup_key: key,
    platform: result.platform,
    niche: result.niche,
    geo: result.geo ?? "global",
    avg_engagement: Math.round(newAvg * 100) / 100,
    best_tone: bestTone,
    best_format: bestFormat,
    best_time: bestTime,
    sample_size: sampleSize,
    confidence: Math.round(confidence * 1000) / 1000,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from("platform_brain")
    .upsert(row, { onConflict: "lookup_key" });

  if (error) {
    console.error("[auto-learning-brain] updatePlatformBrain error:", error.message);
  }
}

/**
 * Read a user's brain profile.
 */
export async function getUserProfile(
  userId: string
): Promise<UserBrainProfile | null> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("user_brain_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auto-learning-brain] getUserProfile error:", error.message);
    return null;
  }

  return data as UserBrainProfile | null;
}

/**
 * Read platform-wide intelligence for a niche/platform combo.
 */
export async function getPlatformIntelligence(
  niche: string,
  platform: string,
  geo?: string
): Promise<PlatformBrainData | null> {
  const db = createServiceClient();
  const key = `${platform}:${niche}:${geo ?? "global"}`;

  const { data, error } = await db
    .from("platform_brain")
    .select("*")
    .eq("lookup_key", key)
    .maybeSingle();

  if (error) {
    console.error(
      "[auto-learning-brain] getPlatformIntelligence error:",
      error.message
    );
    return null;
  }

  return data as PlatformBrainData | null;
}

/**
 * Combine personal + platform intelligence into smart recommendations.
 * Priority: personal (if enough data) > platform > defaults.
 */
export async function getSmartRecommendations(
  userId: string,
  niche: string,
  platform: string
): Promise<Recommendations> {
  const [userProfile, platformData] = await Promise.all([
    getUserProfile(userId),
    getPlatformIntelligence(niche, platform),
  ]);

  // Personal data available and has enough campaigns (>=5)
  if (userProfile && userProfile.total_campaigns >= 5) {
    return {
      tone: userProfile.best_tone,
      format: userProfile.best_format,
      bestTime: userProfile.best_time,
      confidence:
        Math.min(1, userProfile.successful_campaigns / userProfile.total_campaigns),
      source: "personal",
    };
  }

  // Platform aggregate available with decent confidence
  if (platformData && platformData.confidence >= 0.3) {
    return {
      tone: platformData.best_tone,
      format: platformData.best_format,
      bestTime: platformData.best_time,
      confidence: platformData.confidence,
      source: "platform",
    };
  }

  return DEFAULT_RECOMMENDATIONS;
}

/**
 * Recalculate confidence scores for all platform_brain rows.
 * Called by the brain-cleanup cron. Returns count of updated rows.
 */
export async function recalculatePlatformConfidence(): Promise<number> {
  const db = createServiceClient();

  const { data: rows, error } = await db
    .from("platform_brain")
    .select("lookup_key, sample_size");

  if (error || !rows) {
    console.error(
      "[auto-learning-brain] recalculatePlatformConfidence error:",
      error?.message
    );
    return 0;
  }

  let updated = 0;
  for (const row of rows) {
    const confidence = Math.min(1, 1 - 1 / (1 + (row.sample_size ?? 0) / 25));
    const { error: updateError } = await db
      .from("platform_brain")
      .update({
        confidence: Math.round(confidence * 1000) / 1000,
        updated_at: new Date().toISOString(),
      })
      .eq("lookup_key", row.lookup_key);

    if (!updateError) updated++;
  }

  return updated;
}
