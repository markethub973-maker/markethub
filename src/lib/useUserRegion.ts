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

// In-memory cache so we don't re-fetch on every component mount
let cached: RegionConfig | null = null;
let cacheTs = 0;
const TTL = 60_000; // 1 min

export function useUserRegion() {
  const [config, setConfig] = useState<RegionConfig>(cached ?? DEFAULT);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached && Date.now() - cacheTs < TTL) {
      setConfig(cached);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("preferred_region, local_market_enabled")
        .eq("id", user.id)
        .single();
      const result: RegionConfig = {
        preferred_region: data?.preferred_region ?? null,
        local_market_enabled: data?.local_market_enabled ?? false,
      };
      cached = result;
      cacheTs = Date.now();
      setConfig(result);
      setLoading(false);
    });
  }, []);

  const refresh = () => {
    cached = null;
    cacheTs = 0;
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("preferred_region, local_market_enabled")
        .eq("id", user.id)
        .single();
      const result: RegionConfig = {
        preferred_region: data?.preferred_region ?? null,
        local_market_enabled: data?.local_market_enabled ?? false,
      };
      cached = result;
      cacheTs = Date.now();
      setConfig(result);
      setLoading(false);
    });
  };

  return { ...config, loading, refresh };
}
