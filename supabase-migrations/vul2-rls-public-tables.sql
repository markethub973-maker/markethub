-- ============================================================
-- VUL-2: Enable RLS on the 14 public tables flagged by Supabase Security Advisor
-- (19 errors total: 14× "RLS Disabled in Public" + 5× "Sensitive Columns Exposed")
--
-- Strategy:
--   • USER-OWNED tables (have user_id column) → RLS ON + policy "auth.uid() = user_id"
--     for SELECT/INSERT/UPDATE/DELETE. Service role (used by most server routes)
--     bypasses RLS entirely, so this only constrains direct PostgREST clients.
--
--   • SYSTEM tables (audit_logs, cron_logs, discount_codes, stripe_webhook_events)
--     → RLS ON with ZERO policies = deny-all to anon/authenticated. The few
--     server routes that touch them already use the service role client, which
--     bypasses RLS.
--
-- Idempotent: drops policies before recreate, uses IF EXISTS / IF NOT EXISTS.
-- Safe to re-run.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- Helper: clean policy reset for a user-owned table
-- (DROP POLICY IF EXISTS keeps the script idempotent)
-- ──────────────────────────────────────────────────────────────

-- ===== 1. abuse_flags (user_id) — admin-read via service role =====
DROP POLICY IF EXISTS "abuse_flags_select_own" ON public.abuse_flags;
DROP POLICY IF EXISTS "abuse_flags_modify_own" ON public.abuse_flags;
ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;
-- The flagged user can see their own flag (rare flow); admin uses service role.
CREATE POLICY "abuse_flags_select_own" ON public.abuse_flags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE: service role only (no policy = deny).

-- ===== 2. agent_runs (user_id) =====
DROP POLICY IF EXISTS "agent_runs_select_own" ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs_insert_own" ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs_update_own" ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs_delete_own" ON public.agent_runs;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs_select_own" ON public.agent_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "agent_runs_insert_own" ON public.agent_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_runs_update_own" ON public.agent_runs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_runs_delete_own" ON public.agent_runs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 3. api_cost_logs (user_id) — read-only for owner, writes via service role =====
DROP POLICY IF EXISTS "api_cost_logs_select_own" ON public.api_cost_logs;
ALTER TABLE public.api_cost_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_cost_logs_select_own" ON public.api_cost_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE: service role only (logApiCost uses createServiceClient).

-- ===== 4. bio_links (user_id) — owner CRUD; public reads via service role =====
DROP POLICY IF EXISTS "bio_links_select_own" ON public.bio_links;
DROP POLICY IF EXISTS "bio_links_insert_own" ON public.bio_links;
DROP POLICY IF EXISTS "bio_links_update_own" ON public.bio_links;
DROP POLICY IF EXISTS "bio_links_delete_own" ON public.bio_links;
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bio_links_select_own" ON public.bio_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bio_links_insert_own" ON public.bio_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bio_links_update_own" ON public.bio_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bio_links_delete_own" ON public.bio_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 5. client_portal_links (user_id) — owner CRUD; public reads via service role =====
DROP POLICY IF EXISTS "client_portal_links_select_own" ON public.client_portal_links;
DROP POLICY IF EXISTS "client_portal_links_insert_own" ON public.client_portal_links;
DROP POLICY IF EXISTS "client_portal_links_update_own" ON public.client_portal_links;
DROP POLICY IF EXISTS "client_portal_links_delete_own" ON public.client_portal_links;
ALTER TABLE public.client_portal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_portal_links_select_own" ON public.client_portal_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "client_portal_links_insert_own" ON public.client_portal_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "client_portal_links_update_own" ON public.client_portal_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "client_portal_links_delete_own" ON public.client_portal_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 6. hashtag_sets (user_id) =====
DROP POLICY IF EXISTS "hashtag_sets_select_own" ON public.hashtag_sets;
DROP POLICY IF EXISTS "hashtag_sets_insert_own" ON public.hashtag_sets;
DROP POLICY IF EXISTS "hashtag_sets_update_own" ON public.hashtag_sets;
DROP POLICY IF EXISTS "hashtag_sets_delete_own" ON public.hashtag_sets;
ALTER TABLE public.hashtag_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hashtag_sets_select_own" ON public.hashtag_sets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hashtag_sets_insert_own" ON public.hashtag_sets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hashtag_sets_update_own" ON public.hashtag_sets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hashtag_sets_delete_own" ON public.hashtag_sets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 7. research_leads (user_id) =====
DROP POLICY IF EXISTS "research_leads_select_own" ON public.research_leads;
DROP POLICY IF EXISTS "research_leads_insert_own" ON public.research_leads;
DROP POLICY IF EXISTS "research_leads_update_own" ON public.research_leads;
DROP POLICY IF EXISTS "research_leads_delete_own" ON public.research_leads;
ALTER TABLE public.research_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "research_leads_select_own" ON public.research_leads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "research_leads_insert_own" ON public.research_leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "research_leads_update_own" ON public.research_leads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "research_leads_delete_own" ON public.research_leads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 8. scheduled_posts (user_id) =====
DROP POLICY IF EXISTS "scheduled_posts_select_own" ON public.scheduled_posts;
DROP POLICY IF EXISTS "scheduled_posts_insert_own" ON public.scheduled_posts;
DROP POLICY IF EXISTS "scheduled_posts_update_own" ON public.scheduled_posts;
DROP POLICY IF EXISTS "scheduled_posts_delete_own" ON public.scheduled_posts;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_posts_select_own" ON public.scheduled_posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scheduled_posts_insert_own" ON public.scheduled_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scheduled_posts_update_own" ON public.scheduled_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scheduled_posts_delete_own" ON public.scheduled_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 9. tiktok_connections (user_id, access_token) — SENSITIVE =====
DROP POLICY IF EXISTS "tiktok_connections_select_own" ON public.tiktok_connections;
DROP POLICY IF EXISTS "tiktok_connections_insert_own" ON public.tiktok_connections;
DROP POLICY IF EXISTS "tiktok_connections_update_own" ON public.tiktok_connections;
DROP POLICY IF EXISTS "tiktok_connections_delete_own" ON public.tiktok_connections;
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiktok_connections_select_own" ON public.tiktok_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tiktok_connections_insert_own" ON public.tiktok_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tiktok_connections_update_own" ON public.tiktok_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tiktok_connections_delete_own" ON public.tiktok_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 10. youtube_connections (user_id, access_token) — SENSITIVE =====
DROP POLICY IF EXISTS "youtube_connections_select_own" ON public.youtube_connections;
DROP POLICY IF EXISTS "youtube_connections_insert_own" ON public.youtube_connections;
DROP POLICY IF EXISTS "youtube_connections_update_own" ON public.youtube_connections;
DROP POLICY IF EXISTS "youtube_connections_delete_own" ON public.youtube_connections;
ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "youtube_connections_select_own" ON public.youtube_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "youtube_connections_insert_own" ON public.youtube_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "youtube_connections_update_own" ON public.youtube_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "youtube_connections_delete_own" ON public.youtube_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- SYSTEM tables — service role only (RLS ON, zero policies = deny-all)
-- ──────────────────────────────────────────────────────────────

-- ===== 11. audit_logs — admin trail, service role only =====
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- (no policies → only service_role can read/write)

-- ===== 12. cron_logs — system internal =====
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- ===== 13. discount_codes — admin-managed; redemption goes through server route =====
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- ===== 14. stripe_webhook_events — webhook idempotency, service role only =====
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE. Verify with:
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace
--     AND relname IN ('abuse_flags','agent_runs','api_cost_logs','audit_logs',
--       'bio_links','client_portal_links','cron_logs','discount_codes',
--       'hashtag_sets','research_leads','scheduled_posts','stripe_webhook_events',
--       'tiktok_connections','youtube_connections');
-- ============================================================
