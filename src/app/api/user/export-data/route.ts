import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

// GDPR Art. 15 — Right of access: the user can download all personal data
// the platform stores about them in a machine-readable format.
// Returns a JSON bundle with rows from every user-owned table.

const USER_TABLES = [
  "profiles",
  "campaigns",
  "assets",
  "client_portal_links",
  "bio_links",
  "hashtag_sets",
  "research_leads",
  "agent_runs",
  "agency_clients",
  "agency_contracts",
  "agency_onboarding",
  "affiliate_links",
  "trending_alert_config",
  "trending_alerts",
  "instagram_connections",
  "youtube_connections",
  "tiktok_connections",
  "scheduled_posts",
  "ai_credits",
  "api_cost_logs",
  "abuse_flags",
  "audit_logs",
  "discount_codes",
  "stripe_webhook_events",
  "team_members",
  "proposals",
  "time_entries",
  "referrals",
  "agency_settings",
  "api_keys",
  "email_campaigns",
  "social_mentions",
  "listening_config",
  "publish_log",
  "influencers",
  "security_events",
];

// Some tables key by user_id, some by id (for profiles), some by different FK.
const USER_ID_COLUMN: Record<string, string> = {
  profiles: "id",
  // everything else uses user_id by default
};

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const bundle: Record<string, unknown[]> = {};

  for (const table of USER_TABLES) {
    const column = USER_ID_COLUMN[table] ?? "user_id";
    const { data, error } = await supa
      .from(table)
      .select("*")
      .eq(column, auth.userId);
    if (!error && data) bundle[table] = data;
  }

  await logAudit({
    action: "gdpr_data_export",
    actor_id: auth.userId,
    entity_type: "user",
    details: { tables_exported: Object.keys(bundle).length },
    ip: getIpFromHeaders(req.headers),
  });

  const filename = `markethub-data-export-${auth.userId}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
