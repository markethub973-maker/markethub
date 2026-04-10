/**
 * Helper: resolve Instagram/platform token for the current request.
 * Priority:
 *   1. Admin cookie present → fetch token from admin_platform_config (service role)
 *   2. Regular Supabase user → fetch token from profiles table
 */

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type IGAuth = {
  token: string;
  igId: string;
  username: string;
  isAdmin: boolean;
};

export type PlatformAuth = {
  token: string;
  extraData: Record<string, string>;
  isAdmin: boolean;
};

async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get("admin_session_token")?.value;
}

// ── Instagram ──────────────────────────────────────────────────────────────
export async function resolveIGAuth(): Promise<IGAuth | null> {
  // 1. Admin path
  if (await isAdminRequest()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_platform_config")
      .select("token, extra_data")
      .eq("platform", "instagram")
      .single();

    if (data?.token) {
      return {
        token: data.token,
        igId: data.extra_data?.instagram_id || "",
        username: data.extra_data?.username || "",
        isAdmin: true,
      };
    }
    return null;
  }

  // 2. Regular user path — instagram_connections holds metadata (one row per
  // connected IG account), profiles.instagram_access_token holds the Graph
  // API token shared across all accounts under the same Business Manager.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_username")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) return null;

  // Prefer the primary instagram_connections row for the igId/username so the
  // response reflects whatever the user picked in the settings UI. If there
  // are no connections yet, fall back to the legacy fields on profiles.
  const { data: conn } = await supabase
    .from("instagram_connections")
    .select("instagram_id, instagram_username")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    token: profile.instagram_access_token,
    igId: (conn?.instagram_id as string) || profile.instagram_user_id,
    username: (conn?.instagram_username as string) || profile.instagram_username || "",
    isAdmin: false,
  };
}

// ── Facebook Pages ─────────────────────────────────────────────────────────
export async function resolveFacebookAuth(): Promise<PlatformAuth | null> {
  if (await isAdminRequest()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_platform_config")
      .select("token, extra_data")
      .eq("platform", "facebook")
      .single();

    if (data?.token) {
      return { token: data.token, extraData: data.extra_data || {}, isAdmin: true };
    }
    return null;
  }
  return null;
}

// ── YouTube ────────────────────────────────────────────────────────────────
export async function resolveYouTubeChannelId(): Promise<string | null> {
  if (await isAdminRequest()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_platform_config")
      .select("token")
      .eq("platform", "youtube")
      .single();
    return data?.token || null;
  }

  // Regular user: read from profiles
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_channel_id")
    .eq("id", user.id)
    .single();

  return profile?.youtube_channel_id || null;
}
