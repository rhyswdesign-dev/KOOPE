-- =====================================================================
-- Migration 036: founders_claims — founders pricing, counted server-side
-- =====================================================================
--
-- Founders pricing ($29/yr KŌOPE+ to the first 300 subscribers) has been
-- cosmetic since it shipped. The client held the whole truth:
-- PRICING_DISPLAY.FOUNDERS in src/constants/subscriptions.ts for the copy,
-- and a `founderCount` in SubscriptionContext that was seeded from a
-- `supabase.from('auth.users')` count — a query PostgREST cannot serve, so
-- it silently failed and left the count at 0. Result: the "You're Founder
-- #1 of 300" banner rendered for everyone, forever, and the offer could
-- never sunset.
--
-- This migration moves the count where it belongs. The workplan (§2.1) is
-- explicit: "implement the counter server-side (Supabase table + RPC), not
-- client constants; sunset is automatic."
--
-- Two functions, both SECURITY DEFINER so the client never needs read
-- access to other users' claims:
--   - founders_pricing_status()   — read-only: is the offer still open?
--   - claim_founders_pricing()    — atomically takes the next slot.
--
-- Atomicity: claim_founders_pricing() takes a transaction-scoped advisory
-- lock before it counts, so two simultaneous purchases cannot both read
-- "299 claimed" and both become founder #300. The lock is released when
-- the transaction ends, no matter how it ends.
--
-- Idempotency: a user who already claimed gets their original founder
-- number back rather than a second slot. Restores and reinstalls re-call
-- this, and must not consume the offer twice.
--
-- Shape, RLS and index strategy follow 030/031/032/033/035 exactly.
--
-- HOW TO APPLY: reviewed-and-ready migration file, NOT applied by this
-- commit and NOT applied by any agent. Paste into the Supabase Dashboard
-- SQL Editor after taking a backup, same as 030-035. (This project's
-- migration history tracking is unreliable — do NOT run
-- `supabase db push` or `supabase migration repair` here.)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.founders_claims (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_number INTEGER NOT NULL,
  price_cents    INTEGER NULL,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT founders_claims_number_unique UNIQUE (founder_number),
  CONSTRAINT founders_claims_number_positive CHECK (founder_number > 0)
);

COMMENT ON TABLE public.founders_claims IS
  'One row per user who claimed founders pricing (Phase 2.1). The row count IS the counter — there is no separate tally to drift out of sync. Written only by claim_founders_pricing(); the table is not directly writable by authenticated users.';
COMMENT ON COLUMN public.founders_claims.founder_number IS
  'The user''s place in line, 1-based. Unique, so the "Founder #N of 300" copy is a real, stable number rather than a client-side guess.';
COMMENT ON COLUMN public.founders_claims.price_cents IS
  'The locked-in price at claim time, in cents, as reported by the client from the RevenueCat product. Recorded for support/audit ("what was this person actually promised"), not used for billing — the store is the billing authority.';

-- The only two query shapes: "did this user claim?" (PK, covered) and
-- "how many claims so far?" (COUNT(*), covered by the PK index).
-- claimed_at is indexed for the ops report's founders-over-time rollup.
CREATE INDEX IF NOT EXISTS idx_founders_claims_claimed_at
  ON public.founders_claims (claimed_at DESC);

-- ---------------------------------------------------------------------
-- The cap. Kept in one function so the number lives in exactly one place
-- server-side; src/constants/subscriptions.ts FOUNDERS_LIMIT mirrors it
-- for display copy only and never gates anything on its own.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founders_pricing_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 300; $$;

COMMENT ON FUNCTION public.founders_pricing_limit() IS
  'The founders pricing cap (300). A function rather than a constant so the number can be raised or the offer closed (RETURN 0) with a single CREATE OR REPLACE, no app release required.';

-- ---------------------------------------------------------------------
-- Read-only status. Safe to call from the paywall on every mount.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founders_pricing_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed INTEGER;
  v_limit   INTEGER := public.founders_pricing_limit();
  v_mine    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_claimed FROM public.founders_claims;

  SELECT founder_number INTO v_mine
    FROM public.founders_claims
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'claimed',         v_claimed,
    'limit',           v_limit,
    'remaining',       GREATEST(v_limit - v_claimed, 0),
    'available',       v_claimed < v_limit,
    -- The number this caller would get if they subscribed right now, so
    -- the paywall banner can say "You're Founder #N of 300" truthfully.
    'next_number',     LEAST(v_claimed + 1, v_limit),
    'already_claimed', v_mine IS NOT NULL,
    'my_number',       v_mine
  );
END;
$$;

COMMENT ON FUNCTION public.founders_pricing_status() IS
  'Read-only founders pricing state for the paywall. SECURITY DEFINER so callers can learn the aggregate count without being able to read other users'' claim rows.';

-- ---------------------------------------------------------------------
-- The claim. Called after a successful purchase, never before.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_founders_pricing(p_price_cents INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit   INTEGER := public.founders_pricing_limit();
  v_claimed INTEGER;
  v_number  INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason',  'not_authenticated'
    );
  END IF;

  -- Idempotent: an existing claim wins, and does not consume a second slot.
  SELECT founder_number INTO v_number
    FROM public.founders_claims
   WHERE user_id = v_user_id;

  IF v_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'claimed',        true,
      'founder_number', v_number,
      'limit',          v_limit,
      'already_held',   true
    );
  END IF;

  -- Transaction-scoped lock: serializes the count-then-insert below so two
  -- concurrent purchases cannot be handed the same founder number or both
  -- squeeze past the cap. Released automatically at COMMIT or ROLLBACK.
  PERFORM pg_advisory_xact_lock(hashtext('koope.founders_pricing'));

  SELECT COUNT(*) INTO v_claimed FROM public.founders_claims;

  IF v_claimed >= v_limit THEN
    RETURN jsonb_build_object(
      'claimed',   false,
      'reason',    'sold_out',
      'limit',     v_limit,
      'remaining', 0
    );
  END IF;

  v_number := v_claimed + 1;

  INSERT INTO public.founders_claims (user_id, founder_number, price_cents)
  VALUES (v_user_id, v_number, p_price_cents);

  RETURN jsonb_build_object(
    'claimed',        true,
    'founder_number', v_number,
    'limit',          v_limit,
    'remaining',      GREATEST(v_limit - v_number, 0),
    'already_held',   false
  );
END;
$$;

COMMENT ON FUNCTION public.claim_founders_pricing(INTEGER) IS
  'Atomically claims a founders pricing slot for auth.uid(). Returns {claimed:false, reason:"sold_out"} once the cap is reached — this is how the offer sunsets, with no app release and no client-side date check. Idempotent: re-calling returns the caller''s existing founder number.';

-- ---------------------------------------------------------------------
-- RLS: read-your-own only. All writes go through claim_founders_pricing()
-- (SECURITY DEFINER), so no INSERT/UPDATE/DELETE policy exists for
-- authenticated — a client cannot mint itself a founder number. Same
-- money-adjacent posture as 011_tier_enforcement_tables.sql.
-- ---------------------------------------------------------------------
ALTER TABLE public.founders_claims ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'founders_claims'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.founders_claims', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "founders_claims_select_own" ON public.founders_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "founders_claims_service_all" ON public.founders_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON FUNCTION public.claim_founders_pricing(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.founders_pricing_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.founders_pricing_limit() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.founders_pricing_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_founders_pricing(INTEGER) TO authenticated, service_role;

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration)
-- =====================================================================
--
-- How many slots are left:
--   SELECT public.founders_pricing_limit() - COUNT(*) FROM public.founders_claims;
--
-- Founders over time (weekly ops report):
--   SELECT DATE_TRUNC('week', claimed_at) AS week, COUNT(*)
--     FROM public.founders_claims
--    GROUP BY 1 ORDER BY 1;
--
-- Close the offer early, without an app release:
--   CREATE OR REPLACE FUNCTION public.founders_pricing_limit()
--   RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 0; $$;
-- =====================================================================
