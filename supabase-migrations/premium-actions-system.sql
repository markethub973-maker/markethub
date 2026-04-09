-- Premium AI Actions tracking on profiles
-- Idempotent: safe to re-run
-- Applied to prod 2026-04-09 via `npx supabase db query --linked --file <this> --yes`
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS premium_actions_used INT NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS premium_actions_reset_at TIMESTAMPTZ NOT NULL
  DEFAULT (date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month');

-- Atomic increment + monthly auto-reset RPC.
-- Returns the row AFTER decrement so the caller knows remaining quota.
-- Locks the profile row with FOR UPDATE to prevent races on simultaneous calls.
CREATE OR REPLACE FUNCTION public.consume_premium_action(
  p_user_id UUID,
  p_limit   INT
) RETURNS TABLE (
  allowed   BOOLEAN,
  used      INT,
  remaining INT,
  resets_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used      INT;
  v_resets_at TIMESTAMPTZ;
  v_now       TIMESTAMPTZ := now();
  v_next_reset TIMESTAMPTZ;
BEGIN
  -- Lock the row to prevent races
  SELECT premium_actions_used, premium_actions_reset_at
    INTO v_used, v_resets_at
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, v_now;
    RETURN;
  END IF;

  -- Auto-reset if past the reset boundary (idempotent — handles missed crons)
  IF v_now >= v_resets_at THEN
    v_next_reset := date_trunc('month', v_now AT TIME ZONE 'UTC') + interval '1 month';
    UPDATE profiles
       SET premium_actions_used = 0,
           premium_actions_reset_at = v_next_reset
     WHERE id = p_user_id;
    v_used := 0;
    v_resets_at := v_next_reset;
  END IF;

  -- Unlimited plans (-1 limit)
  IF p_limit = -1 THEN
    RETURN QUERY SELECT TRUE, v_used, -1, v_resets_at;
    RETURN;
  END IF;

  -- Quota exhausted
  IF v_used >= p_limit THEN
    RETURN QUERY SELECT FALSE, v_used, 0, v_resets_at;
    RETURN;
  END IF;

  -- Decrement (i.e. increment used counter)
  UPDATE profiles
     SET premium_actions_used = premium_actions_used + 1
   WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_used + 1, p_limit - v_used - 1, v_resets_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_premium_action(UUID, INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
