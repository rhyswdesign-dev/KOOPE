-- =====================================================================
-- Migration 037: subscriber_events — RevenueCat's webhook, made durable
-- =====================================================================
--
-- Today the only record that a user ever paid lives in two places, both
-- of them off our servers: Apple/Google's receipt, and RevenueCat's copy
-- of it. The app reads entitlements through the RevenueCat SDK at runtime
-- (src/contexts/SubscriptionContext.tsx), which works fine — but it means
-- KŌOPE itself holds no history. We cannot answer "when did this person
-- subscribe", "how many cancelled last month", or "why does support say
-- they paid" without logging into someone else's dashboard.
--
-- This table is the append-only ledger that fixes that. It is written
-- exclusively by the `revenuecat-webhook` Edge Function
-- (supabase/functions/revenuecat-webhook/index.ts), which RevenueCat calls
-- on every subscription lifecycle event.
--
-- Deliberately NOT in the entitlement path: SubscriptionContext keeps
-- asking RevenueCat directly for live tier state. Webhooks can be delayed
-- or retried, and a gate that waits on one would flicker. This is the
-- record, not the gate — but it is a complete enough record to rebuild
-- tier state from if RevenueCat were ever lost or the app moved off it.
--
-- Idempotency: RevenueCat retries failed deliveries, so the same event can
-- arrive more than once. `event_id` is UNIQUE and the function upserts on
-- it, making redelivery a no-op rather than a duplicate row.
--
-- Shape, RLS and index strategy follow 030-035 exactly.
--
-- HOW TO APPLY: reviewed-and-ready migration file, NOT applied by this
-- commit and NOT applied by any agent. Paste into the Supabase Dashboard
-- SQL Editor after taking a backup, same as 030-036. (This project's
-- migration history tracking is unreliable — do NOT run
-- `supabase db push` or `supabase migration repair` here.)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscriber_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       TEXT NOT NULL,
  user_id        UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  app_user_id    TEXT NOT NULL,
  event_type     TEXT NOT NULL,
  product_id     TEXT NULL,
  entitlement_id TEXT NULL,
  entitlement_ids TEXT[] NULL,
  store          TEXT NULL,
  environment    TEXT NULL,
  period_type    TEXT NULL,
  price_cents    INTEGER NULL,
  currency       TEXT NULL,
  event_at       TIMESTAMPTZ NOT NULL,
  expires_at     TIMESTAMPTZ NULL,
  payload        JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriber_events_event_id_unique UNIQUE (event_id)
);

COMMENT ON TABLE public.subscriber_events IS
  'Append-only ledger of RevenueCat subscription lifecycle events (Phase 2.1), written by the revenuecat-webhook Edge Function. Purpose is durability: tier truth survives an app reinstall, a lost RevenueCat account, or a support dispute. Not consulted for live entitlement gating — the RevenueCat SDK still does that.';
COMMENT ON COLUMN public.subscriber_events.event_id IS
  'RevenueCat''s own event.id. UNIQUE so redelivered webhooks upsert instead of duplicating — RevenueCat retries on any non-2xx response.';
COMMENT ON COLUMN public.subscriber_events.user_id IS
  'Resolved from app_user_id when it is a valid auth.users UUID. NULL for anonymous RevenueCat IDs ($RCAnonymousID:...) — the event is still recorded, and can be attributed later via app_user_id once the user signs in and RevenueCat aliases the IDs.';
COMMENT ON COLUMN public.subscriber_events.app_user_id IS
  'RevenueCat''s app_user_id verbatim, always stored even when user_id resolves. This is the join key back to RevenueCat''s dashboard.';
COMMENT ON COLUMN public.subscriber_events.event_type IS
  'RevenueCat event type: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, UNCANCELLATION, BILLING_ISSUE, PRODUCT_CHANGE, SUBSCRIPTION_PAUSED, TRANSFER, TEST. Stored as free TEXT rather than an enum on purpose — RevenueCat adds event types, and an unknown one must never cost us the row.';
COMMENT ON COLUMN public.subscriber_events.environment IS
  'SANDBOX or PRODUCTION. Sandbox events are recorded too (they are how the purchase flow gets tested) — always filter on this before reporting revenue.';
COMMENT ON COLUMN public.subscriber_events.payload IS
  'The full webhook event object as received. The typed columns above are conveniences; this is the source of truth and the reason a schema change here is never urgent.';

-- The real query shapes: "this user's subscription history" (support, and
-- rebuilding tier state) and "what happened recently" (ops report).
CREATE INDEX IF NOT EXISTS idx_subscriber_events_user_event_at
  ON public.subscriber_events (user_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriber_events_app_user_id
  ON public.subscriber_events (app_user_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriber_events_event_at
  ON public.subscriber_events (event_at DESC);

-- ---------------------------------------------------------------------
-- RLS: service-role writes (the Edge Function), users read their own.
-- No INSERT/UPDATE/DELETE policy for authenticated — a client must never
-- be able to forge a purchase record. Same posture as 036.
-- ---------------------------------------------------------------------
ALTER TABLE public.subscriber_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriber_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriber_events', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "subscriber_events_select_own" ON public.subscriber_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "subscriber_events_service_all" ON public.subscriber_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration)
-- =====================================================================
--
-- One user's whole subscription history (support requests):
--   SELECT event_at, event_type, product_id, environment
--     FROM public.subscriber_events
--    WHERE user_id = $1
--    ORDER BY event_at DESC;
--
-- Rebuild "is this user paid right now" from the ledger alone — the
-- reinstall-survival case this table exists for:
--   SELECT DISTINCT ON (user_id) user_id, event_type, expires_at
--     FROM public.subscriber_events
--    WHERE environment = 'PRODUCTION'
--    ORDER BY user_id, event_at DESC;
--
-- New paid subscribers this week (weekly ops report):
--   SELECT COUNT(*) FROM public.subscriber_events
--    WHERE event_type = 'INITIAL_PURCHASE'
--      AND environment = 'PRODUCTION'
--      AND event_at > NOW() - INTERVAL '7 days';
--
-- Churn signal — cancellations not followed by an uncancellation:
--   SELECT COUNT(DISTINCT app_user_id) FROM public.subscriber_events
--    WHERE event_type = 'CANCELLATION'
--      AND environment = 'PRODUCTION'
--      AND event_at > NOW() - INTERVAL '30 days';
-- =====================================================================
