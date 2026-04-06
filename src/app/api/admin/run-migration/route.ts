import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

const MIGRATIONS = [
  {
    name: "profiles_region_columns",
    check: `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_region'`,
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT NULL; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_market_enabled BOOLEAN DEFAULT false;`,
  },
  {
    name: "research_leads_table",
    check: `SELECT table_name FROM information_schema.tables WHERE table_name='research_leads'`,
    sql: `CREATE TABLE IF NOT EXISTS research_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      agent_session_id TEXT,
      goal TEXT,
      source TEXT,
      lead_type TEXT,
      name TEXT,
      category TEXT,
      address TEXT,
      city TEXT,
      phone TEXT,
      website TEXT,
      email TEXT,
      rating NUMERIC,
      reviews_count INTEGER,
      url TEXT,
      extra_data JSONB,
      contacted BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_user ON research_leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_type ON research_leads(lead_type);`,
  },
  {
    name: "agent_runs_table",
    check: `SELECT table_name FROM information_schema.tables WHERE table_name='agent_runs'`,
    sql: `CREATE TABLE IF NOT EXISTS agent_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      session_id TEXT,
      goal TEXT,
      step_label TEXT,
      actor_type TEXT,
      apify_run_id TEXT,
      apify_actor_id TEXT,
      status TEXT DEFAULT 'running',
      input_params JSONB,
      raw_data JSONB,
      leads_count INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT now(),
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_runs_user ON agent_runs(user_id);
    CREATE INDEX IF NOT EXISTS idx_runs_apify ON agent_runs(apify_run_id);`,
  },
  {
    name: "cron_logs_table",
    check: `SELECT table_name FROM information_schema.tables WHERE table_name='cron_logs'`,
    sql: `CREATE TABLE IF NOT EXISTS cron_logs (
      job TEXT PRIMARY KEY,
      ran_at TIMESTAMPTZ,
      result JSONB
    );`,
  },
];

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await req.json().catch(() => {}); // consume body

  const supa = createServiceClient();
  const results: Record<string, string> = {};

  for (const m of MIGRATIONS) {
    try {
      // Check if already applied
      const { data: checkData } = await supa.rpc("query_raw" as any, { sql: m.check }).single();

      // Run migration
      const { error } = await supa.rpc("query_raw" as any, { sql: m.sql });
      if (error) throw error;
      results[m.name] = "applied";
    } catch (err: any) {
      // Try direct approach for column additions
      if (m.name === "profiles_region_columns") {
        try {
          await supa.from("profiles").select("preferred_region").limit(1);
          results[m.name] = "already_exists";
        } catch {
          results[m.name] = `error: ${err.message}`;
        }
      } else {
        results[m.name] = `error: ${err.message}`;
      }
    }
  }

  return NextResponse.json({ results });
}
