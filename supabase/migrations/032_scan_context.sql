-- =====================================================================
-- Migration 032: scan_events — scan-context data schema (Phase 1.5)
-- =====================================================================
--
-- The workplan (docs/KOOPE-ENGINEERING-WORKPLAN.md §1.5) calls this
-- "031_scan_context.sql," extending the "013/020/025 scan tables." Both
-- of those are wrong once you actually read the schema:
--   - 031 is taken by 031_bottle_prices.sql (Phase 1.2) — numbered 032
--     per the same never-renumber rule 030's header already established.
--   - 013_scan_anti_fraud.sql (user_correction_stats, bottle_barcode_mappings,
--     scan_moderation_queue), 020_scan_rate_limits.sql (one row per user
--     PER DAY, not per scan), and 025_scan_corrections.sql (deliberately
--     NOT linked to auth.users, by design) have no per-scan-session row
--     to extend. scanTelemetry.ts's SCAN_ATTEMPT/RESOLVED/FAILED events
--     write only to Mixpanel — no Supabase table backs them at all.
--     There was genuinely nothing to extend, so this is a new table.
--
-- One row per resolved scan, created when BottleDetailScreen (the de
-- facto "Answer Card" — there is no separate AnswerCardScreen.tsx) mounts,
-- then updated as the user acts on it:
--   - Add to Bar          -> outcome='owned',  context='home'
--   - Want it (price seen)-> outcome='wanted', context='store', price_seen=$
--   - Gift mode toggled on-> context='gift' (a modifier, not an outcome)
--   - Leaves without acting-> outcome='passed' (set client-side on
--     navigation away, via a beforeRemove listener)
--
-- Scoped to signed-in users only (user_id NOT NULL), matching
-- made_events's existing pattern — unlike scan_corrections, which
-- intentionally supports anonymous rows so a fraud signal survives
-- logout. Guest scans simply don't get a scan_events row.
--
-- Consent-gated client-side (Phase 0.3's consent guard) before every
-- write — no DB-level consent precedent exists in this codebase, so this
-- reuses the same app-level gate analytics.ts already uses for Mixpanel
-- (src/lib/consentStore.ts's hasStoredConsentChoices/getConsentChoices).
--
-- HOW TO APPLY: reviewed-and-ready migration file, not applied by this
-- commit. Run via `supabase db push` (tracked) or paste into the SQL
-- Editor after a backup, same as 030/031.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_context_type') THEN
    CREATE TYPE scan_context_type AS ENUM (
      'store',
      'home',
      'gift',
      'unknown'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_outcome_type') THEN
    CREATE TYPE scan_outcome_type AS ENUM (
      'owned',
      'wanted',
      'passed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.scan_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bottle_id    TEXT NULL,
  bottle_name  TEXT NOT NULL,
  brand_name   TEXT NULL,
  scan_source  TEXT NULL,
  context      scan_context_type NOT NULL DEFAULT 'unknown',
  price_seen   NUMERIC NULL,
  outcome      scan_outcome_type NULL,
  resolved_at  TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.scan_events IS
  'The scan-context data schema (Phase 1.5): one row per resolved scan (created when the Answer Card / BottleDetailScreen mounts), updated with context + outcome as the user acts on it. Aggregate-only exposure — this is the brand-insight asset the workplan calls "cannot be retrofitted."';
COMMENT ON COLUMN public.scan_events.bottle_id IS
  'Matches the scanned Spirit''s id when available (catalog/cache-resolved scans). Nullable — some resolution paths only carry a name.';
COMMENT ON COLUMN public.scan_events.scan_source IS
  'Resolution path label already carried by BottleDetail''s route params (catalog | cache | claude-vision | null=catalog) — reused as-is, not reinvented.';
COMMENT ON COLUMN public.scan_events.context IS
  'Inferred, not asked: gift-mode toggle -> gift; price-capture present -> store; add-to-owned -> home; otherwise unknown.';
COMMENT ON COLUMN public.scan_events.outcome IS
  'Exactly one of owned/wanted/passed, eventually, for every scan by a signed-in user. passed is inferred client-side when the user leaves the Answer Card without acting.';

-- Index shapes for the two real query needs: "this user's scan history"
-- and "brand X" aggregate rollups.
CREATE INDEX IF NOT EXISTS idx_scan_events_user_created_at
  ON public.scan_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_events_brand_name
  ON public.scan_events (brand_name);

-- ---------------------------------------------------------------------
-- RLS: owner-only, same shape as 030_made_events.sql. A user can log and
-- update their own scan_events; the service role (aggregate/brand-insight
-- queries, Edge Functions) retains full access.
-- ---------------------------------------------------------------------
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scan_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scan_events', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "scan_events_select_own" ON public.scan_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "scan_events_insert_own" ON public.scan_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scan_events_update_own" ON public.scan_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scan_events_service_all" ON public.scan_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration — for the accept check
-- "brand X: scans, store-context %, want-conversion %, top alternative
-- scanned in same session" and app-side/BI use):
-- =====================================================================
--
-- Brand rollup — scans, store-context %, want-conversion %:
--   SELECT
--     brand_name,
--     COUNT(*)                                              AS total_scans,
--     ROUND(100.0 * COUNT(*) FILTER (WHERE context = 'store') / COUNT(*), 1)
--                                                            AS store_context_pct,
--     ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'wanted') / COUNT(*), 1)
--                                                            AS want_conversion_pct
--   FROM public.scan_events
--   WHERE brand_name = $1
--   GROUP BY brand_name;
--
-- Top alternative scanned in the same session — no session_id column
-- needed: "session" is a created_at-proximity self-join (scans by the
-- same user within a 30-minute window of a brand-X scan), same pattern
-- a retail "market basket" analysis would use:
--   SELECT b.brand_name, COUNT(*) AS times_scanned_alongside
--     FROM public.scan_events a
--     JOIN public.scan_events b
--       ON a.user_id = b.user_id
--      AND b.brand_name IS DISTINCT FROM a.brand_name
--      AND b.created_at BETWEEN a.created_at - INTERVAL '30 minutes'
--                            AND a.created_at + INTERVAL '30 minutes'
--    WHERE a.brand_name = $1
--    GROUP BY b.brand_name
--    ORDER BY times_scanned_alongside DESC
--    LIMIT 5;
-- =====================================================================
