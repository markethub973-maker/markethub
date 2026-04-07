import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

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
  if (!error) return true;
  // Supabase returns different error messages for missing tables:
  // "relation does not exist", "schema cache", "Could not find the table"
  const msg = error.message || "";
  if (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("Could not find")) return false;
  return true; // other errors (RLS, etc.) mean table exists
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

  // ── 13. audit_logs table ─────────────────────────────────────────────────
  if (await tableExists(supa, "audit_logs")) {
    results["audit_logs_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action      TEXT NOT NULL,
        actor_id    TEXT,
        target_id   TEXT,
        entity_type TEXT,
        details     JSONB,
        ip          TEXT,
        user_agent  TEXT,
        created_at  TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target     ON audit_logs(target_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
    results["audit_logs_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 14. instagram_connections table (multi-account) ─────────────────────
  if (await tableExists(supa, "instagram_connections")) {
    // Table exists — ensure multi-account columns are present
    const hasLabel = await columnExists(supa, "instagram_connections", "account_label");
    if (!hasLabel) {
      const r = await runSQL(`
        ALTER TABLE instagram_connections
          ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT '',
          ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS page_id TEXT DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS page_name TEXT DEFAULT NULL;
        -- Drop old single-account unique constraint if exists, add multi-account one
        ALTER TABLE instagram_connections DROP CONSTRAINT IF EXISTS instagram_connections_user_id_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_conn_user_ig ON instagram_connections(user_id, instagram_id);
      `);
      results["instagram_connections_multi"] = r.ok ? "applied" : `error: ${r.error}`;
    } else {
      results["instagram_connections_table"] = "already_exists";
    }
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS instagram_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        instagram_id TEXT NOT NULL,
        instagram_username TEXT DEFAULT '',
        instagram_name TEXT DEFAULT '',
        account_label TEXT DEFAULT '',
        is_primary BOOLEAN DEFAULT false,
        page_id TEXT DEFAULT NULL,
        page_name TEXT DEFAULT NULL,
        access_token TEXT,
        enc_access_token TEXT,
        token_type TEXT DEFAULT 'bearer',
        connected_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, instagram_id)
      );
      CREATE INDEX IF NOT EXISTS idx_instagram_conn_user ON instagram_connections(user_id);
      CREATE INDEX IF NOT EXISTS idx_instagram_conn_ig_id ON instagram_connections(instagram_id);
    `);
    results["instagram_connections_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 15. discount_codes table ────────────────────────────────────────────
  if (await tableExists(supa, "discount_codes")) {
    results["discount_codes_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        discount_percent INTEGER NOT NULL DEFAULT 0,
        discount_amount INTEGER DEFAULT 0,
        max_uses INTEGER DEFAULT NULL,
        uses_count INTEGER DEFAULT 0,
        valid_from TIMESTAMPTZ DEFAULT now(),
        valid_until TIMESTAMPTZ DEFAULT NULL,
        applicable_plans TEXT[] DEFAULT NULL,
        created_by TEXT DEFAULT 'admin',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
      CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(active);
    `);
    results["discount_codes_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 15. Encrypted token columns in profiles ──────────────────────────────
  // Add encrypted_* shadow columns — the app writes encrypted values here
  // while keeping the original columns for backward-compat during rollout.
  if (await columnExists(supa, "profiles", "enc_instagram_access_token")) {
    results["encrypted_token_columns"] = "already_exists";
  } else {
    const r = await runSQL(`
      ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS enc_instagram_access_token TEXT,
        ADD COLUMN IF NOT EXISTS enc_youtube_access_token   TEXT,
        ADD COLUMN IF NOT EXISTS enc_youtube_refresh_token  TEXT;
    `);
    results["encrypted_token_columns"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 16. api_cost_logs — real API cost tracking ──────────────────────────
  if (await tableExists(supa, "api_cost_logs")) {
    results["api_cost_logs_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS api_cost_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        service TEXT NOT NULL,
        operation TEXT NOT NULL,
        model TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd NUMERIC(12,8) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_cost_logs_user ON api_cost_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_cost_logs_session ON api_cost_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_cost_logs_created ON api_cost_logs(created_at DESC);
    `);
    results["api_cost_logs_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  // ── 17. platform_settings — markup % and other admin configs ─────────────
  if (await tableExists(supa, "platform_settings")) {
    results["platform_settings_table"] = "already_exists";
  } else {
    const r = await runSQL(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      INSERT INTO platform_settings (key, value) VALUES ('api_markup_percent', '20') ON CONFLICT DO NOTHING;
    `);
    results["platform_settings_table"] = r.ok ? "applied" : `error: ${r.error}`;
  }

  await logAudit({
    action: "migration_run",
    actor_id: "admin",
    details: { steps: Object.keys(results), applied: Object.values(results).filter(v => v === "applied").length },
    ip: getIpFromHeaders(req.headers),
  });

  return NextResponse.json({ results });
}
