"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RegionConfig = {
  preferred_region: string | null;   // "RO", "US", "DE", etc. or null = international
  local_market_enabled: boolean;
};

const DEFAULT: RegionConfig = {
  preferred_region: null,
  local_market_enabled: false,
};

// In-memory cache keyed by user ID to prevent cross-user data leaks
const cache = new Map<string, { data: RegionConfig; ts: number }>();
const TTL = 60_000; // 1 min

// Legacy shims kept for compatibility — do not use directly
let cached: RegionConfig | null = null;
let cacheTs = 0;

export function useUserRegion() {
  const [config, setConfig] = useState<RegionConfig>(cached ?? DEFAULT);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) { setLoading(false); return; }
      const hit = cache.get(user.id);
      if (hit && Date.now() - hit.ts < TTL) {
        if (!cancelled) { setConfig(hit.data); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("preferred_region, local_market_enabled")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const result: RegionConfig = {
        preferred_region: data?.preferred_region ?? null,
        local_market_enabled: data?.local_market_enabled ?? false,
      };
      cache.set(user.id, { data: result, ts: Date.now() });
      setConfig(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const refresh = () => {
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      cache.delete(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("preferred_region, local_market_enabled")
        .eq("id", user.id)
        .single();
      const result: RegionConfig = {
        preferred_region: data?.preferred_region ?? null,
        local_market_enabled: data?.local_market_enabled ?? false,
      };
      cache.set(user.id, { data: result, ts: Date.now() });
      setConfig(result);
      setLoading(false);
    });
  };

  return { ...config, loading, refresh };
}
