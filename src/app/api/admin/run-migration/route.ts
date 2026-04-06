import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";

// Run raw SQL via Supabase pg-meta API (no custom RPC function needed)
async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "Supabase not configured" };

  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (res.ok) return { ok: true };

  // Fallback: try pg-meta endpoint
  const res2 = await fetch(`${url.replace(".supabase.co", ".supabase.co")}/pg-meta/v1/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-connection-encrypted": key,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res2.ok) return { ok: true };

  const body = await res.text().catch(() => "");
  return { ok: false, error: body || `HTTP ${res.status}` };
}

// Check table/column existence via Supabase REST (no SQL needed)
async function tableExists(supa: ReturnType<typeof createServiceClient>, table: string): Promise<boolean> {
  const { error } = await supa.from(table as any).select("*").limit(0);
  return !error || !error.message.includes("does not exist");
}

async function columnExists(supa: ReturnType<typeof createServiceClient>, table: string, column: string): Promise<boolean> {
  const { data, error } = await supa.from(table as any).select(column).limit(1);
  if (error && (error.message.includes("does not exist") || error.message.includes("column"))) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await req.json().catch(() => {});

  const supa = createServiceClient();
  const results: Record<string, string> = {};

  // ── 1. client_portal_links ───────────────────────────────────────────────
  if (await tableExists(supa, "client_portal_links")) {
    results["client_portal_links_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS client_portal_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        token UUID UNIQUE DEFAULT gen_random_uuid(),
        client_name TEXT NOT NULL,
        ig_username TEXT DEFAULT '',
        tt_username TEXT DEFAULT '',
        data JSONB DEFAULT '{}',
        view_count INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_portal_links_token ON client_portal_links(token);
      CREATE INDEX IF NOT EXISTS idx_portal_links_user ON client_portal_links(user_id);
    `);
    results["client_portal_links_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 2. scheduled_posts columns ───────────────────────────────────────────
  if (await columnExists(supa, "scheduled_posts", "image_url")) {
    results["scheduled_posts_image_url"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
      ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;
      ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS post_result JSONB DEFAULT NULL;
    `);
    results["scheduled_posts_image_url"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 3. profiles columns ──────────────────────────────────────────────────
  if (await columnExists(supa, "profiles", "email_digest_enabled")) {
    results["profiles_digest_columns"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT true;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT NULL;
    `);
    results["profiles_digest_columns"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 4. profiles region columns ───────────────────────────────────────────
  if (await columnExists(supa, "profiles", "preferred_region")) {
    results["profiles_region_columns"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_market_enabled BOOLEAN DEFAULT false;
    `);
    results["profiles_region_columns"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 5. research_leads ────────────────────────────────────────────────────
  if (await tableExists(supa, "research_leads")) {
    results["research_leads_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS research_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        agent_session_id TEXT, goal TEXT, source TEXT, lead_type TEXT,
        name TEXT, category TEXT, address TEXT, city TEXT, phone TEXT,
        website TEXT, email TEXT, rating NUMERIC, reviews_count INTEGER,
        url TEXT, extra_data JSONB, contacted BOOLEAN DEFAULT false,
        notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_leads_user ON research_leads(user_id);
      CREATE INDEX IF NOT EXISTS idx_leads_type ON research_leads(lead_type);
    `);
    results["research_leads_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 6. agent_runs ────────────────────────────────────────────────────────
  if (await tableExists(supa, "agent_runs")) {
    results["agent_runs_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        session_id TEXT, goal TEXT, step_label TEXT, actor_type TEXT,
        apify_run_id TEXT, apify_actor_id TEXT, status TEXT DEFAULT 'running',
        input_params JSONB, raw_data JSONB, leads_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_runs_user ON agent_runs(user_id);
      CREATE INDEX IF NOT EXISTS idx_runs_apify ON agent_runs(apify_run_id);
    `);
    results["agent_runs_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 7. cron_logs ─────────────────────────────────────────────────────────
  if (await tableExists(supa, "cron_logs")) {
    results["cron_logs_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS cron_logs (
        job TEXT PRIMARY KEY,
        ran_at TIMESTAMPTZ,
        result JSONB
      );
    `);
    results["cron_logs_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 8. scheduled_posts.first_comment ────────────────────────────────────
  if (await columnExists(supa, "scheduled_posts", "first_comment")) {
    results["scheduled_posts_first_comment"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS first_comment TEXT DEFAULT NULL;
    `);
    results["scheduled_posts_first_comment"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 9. bio_links ─────────────────────────────────────────────────────────
  if (await tableExists(supa, "bio_links")) {
    results["bio_links_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS bio_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        bg_color TEXT DEFAULT '#FFF8F0',
        accent_color TEXT DEFAULT '#F59E0B',
        links JSONB DEFAULT '[]',
        views INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_bio_links_slug ON bio_links(slug);
      CREATE INDEX IF NOT EXISTS idx_bio_links_user ON bio_links(user_id);
    `);
    results["bio_links_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 10. hashtag_sets ─────────────────────────────────────────────────────
  if (await tableExists(supa, "hashtag_sets")) {
    results["hashtag_sets_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS hashtag_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        hashtags TEXT NOT NULL DEFAULT '',
        platform TEXT DEFAULT 'instagram',
        category TEXT DEFAULT '',
        tags_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_hashtag_sets_user ON hashtag_sets(user_id);
    `);
    results["hashtag_sets_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 11. Anti-abuse columns on profiles ──────────────────────────────────
  if (await columnExists(supa, "profiles", "is_blocked")) {
    results["profiles_abuse_columns"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_ip TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS normalized_email TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_fingerprint TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tokens_used_month INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_profiles_ip ON profiles(registration_ip);
      CREATE INDEX IF NOT EXISTS idx_profiles_norm_email ON profiles(normalized_email);
      CREATE INDEX IF NOT EXISTS idx_profiles_device ON profiles(device_fingerprint);
    `);
    results["profiles_abuse_columns"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 12. abuse_flags table ────────────────────────────────────────────────
  if (await tableExists(supa, "abuse_flags")) {
    results["abuse_flags_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS abuse_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        resolved BOOLEAN DEFAULT false,
        detected_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, reason)
      );
      CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON abuse_flags(user_id);
      CREATE INDEX IF NOT EXISTS idx_abuse_flags_resolved ON abuse_flags(resolved);
    `);
    results["abuse_flags_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  return NextResponse.json({ results });
}
