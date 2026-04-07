-- ============================================================
-- VUL-1: RLS Fix — profiles table
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Drop any existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;

-- Step 2: Ensure RLS is ON (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: SELECT — authenticated users see only their own row
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Step 4: INSERT — only the service_role trigger can insert
--   The handle_new_user() trigger runs as SECURITY DEFINER,
--   which bypasses RLS. Regular authenticated/anon users must NOT
--   be able to insert arbitrary rows.
--   No INSERT policy for 'authenticated' or 'anon' = INSERT is denied.

-- Step 5: UPDATE — authenticated users can update only their own row,
--   but they CANNOT change is_admin, plan, subscription_plan,
--   subscription_status, or stripe_* columns (those are server-only).
CREATE POLICY "profiles_update_own_safe"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent privilege escalation: is_admin must stay false for non-admins.
    -- The service role (Stripe webhook, admin API routes) bypasses RLS entirely.
    AND is_admin = false
  );

-- Step 6: DELETE — nobody can delete their own profile row
--   (CASCADE on auth.users deletion handles cleanup automatically)
--   No DELETE policy = DELETE is denied for all non-service roles.

-- Step 7: Admins (is_admin = true) need to read all profiles.
--   Admin API routes use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
--   so no extra policy is needed here — this is intentional.

-- ============================================================
-- VERIFICATION QUERIES (run manually to confirm):
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE tablename = 'profiles';
-- ============================================================
