import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { logSecurityEvent } from "@/lib/siem";

// External API endpoint — secured by API key in Authorization header
// Usage: GET /api/external/analytics?type=campaigns
// Header: Authorization: Bearer mhp_xxxxx

async function authenticateApiKey(req: NextRequest): Promise<{ userId: string; plan: string } | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.replace("Bearer ", "").trim();
  if (!rawKey.startsWith("mhp_")) return null;

  const hash = createHash("sha256").update(rawKey).digest("hex");
  const supa = createServiceClient();

  const { data: keyRow } = await supa.from("api_keys")
    .select("user_id, active, expires_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!keyRow?.active) return null;
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) return null;

  // Update last_used
  supa.from("api_keys").update({ last_used: new Date().toISOString() }).eq("key_hash", hash).then(() => {});

  const { data: profile } = await supa.from("profiles").select("plan").eq("id", keyRow.user_id).single();
  return { userId: keyRow.user_id, plan: profile?.plan ?? "free" };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    void logSecurityEvent({
      event_type: "api_key_invalid",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
      user_agent: req.headers.get("user-agent") ?? undefined,
      path: req.nextUrl.pathname,
    });
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "summary";
  const supa = createServiceClient();

  if (type === "campaigns") {
    const { data } = await supa.from("campaigns").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(50);
    return NextResponse.json({ data, meta: { user_id: auth.userId, fetched_at: new Date().toISOString() } });
  }

  if (type === "leads") {
    const { data } = await supa.from("research_leads").select("id,name,category,city,website,pipeline_status,created_at").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(100);
    return NextResponse.json({ data, meta: { user_id: auth.userId, fetched_at: new Date().toISOString() } });
  }

  if (type === "influencers") {
    const { data } = await supa.from("influencers").select("*").eq("user_id", auth.userId).order("followers_ig", { ascending: false });
    return NextResponse.json({ data, meta: { user_id: auth.userId, fetched_at: new Date().toISOString() } });
  }

  // Default: summary
  const [campaigns, leads, influencers] = await Promise.all([
    supa.from("campaigns").select("id,name,status,monthly_value:budget", { count: "exact" }).eq("user_id", auth.userId),
    supa.from("research_leads").select("id", { count: "exact" }).eq("user_id", auth.userId),
    supa.from("influencers").select("id", { count: "exact" }).eq("user_id", auth.userId),
  ]);

  return NextResponse.json({
    summary: {
      campaigns: campaigns.count ?? 0,
      leads: leads.count ?? 0,
      influencers: influencers.count ?? 0,
    },
    meta: { user_id: auth.userId, plan: auth.plan, fetched_at: new Date().toISOString() },
  });
}
