-- =====================================================================
-- Migration 031: value-on-scan v1 — spotted_prices + bottle_prices
-- (Phase 1.2, docs/KOOPE-ENGINEERING-WORKPLAN.md §1.2)
-- =====================================================================
--
-- Two tables:
--
--   spotted_prices — raw user-reported "I saw this bottle for $X at Y"
--   entries, synced up from the client price journal (useSpottedPrices /
--   spottedPriceService). This is the community price signal the workplan
--   names as the bootstrap for real pricing data ("MSRP + user-reported
--   spotted prices from the existing Want price journal"). Owner-only
--   RLS: a user reads/writes their own rows; aggregation across users
--   happens via the service role only, so no individual's shopping
--   pattern is ever exposed to another client.
--
--   bottle_prices — the served aggregate ranges the workplan specifies
--   (price_low/high, currency, confidence, source, as_of). Seeded below
--   from spirits_catalog's MSRP-style estimate columns. In v1 the client
--   does NOT read this table (the scan result already carries a range);
--   it exists so community + licensed sources accumulate into one served
--   shape for the later client-read pass. source values:
--   'msrp_estimate' | 'user_reported' | 'licensed'. Never scraped.
--
-- NOTE: the workplan names this 030_bottle_prices.sql, but 030 was taken
-- by 030_made_events.sql — numbered 031 per 030's own precedent (never
-- renumber; take the next free integer).
--
-- HOW TO APPLY: reviewed-and-ready migration file. Run via
-- `supabase db push` (tracked) or `supabase db query --linked -f` after
-- a backup, same as 020/028 were applied on 2026-07-18.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- spotted_prices — raw community price reports
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.spotted_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bottle_id       TEXT NOT NULL,
  price           NUMERIC(8,2) NOT NULL CHECK (price > 0),
  currency        TEXT NOT NULL,
  location_label  TEXT NULL,
  seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.spotted_prices IS
  'Value-on-scan v1 (Phase 1.2): raw user-reported spotted prices, synced from the client price journal. The community bootstrap for bottle_prices aggregation. Aggregate-only exposure — reads are owner-scoped.';
COMMENT ON COLUMN public.spotted_prices.bottle_id IS
  'Matches Spirit.id (TEXT, kebab-case) — not a foreign key (bottles can be cache/Claude-identified before existing in spirits_catalog); validate at the app layer, same reasoning as made_events.recipe_id.';
COMMENT ON COLUMN public.spotted_prices.currency IS
  'Client SupportedCurrency code (USD/GBP/CAD/AUD/EUR/NZD). Free text by design — aggregation normalizes.';

-- The two real query shapes: "recent reports for a bottle" (aggregation)
-- and "this user's journal" (sync reconciliation).
CREATE INDEX IF NOT EXISTS idx_spotted_prices_bottle_seen
  ON public.spotted_prices (bottle_id, seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_spotted_prices_user
  ON public.spotted_prices (user_id);

ALTER TABLE public.spotted_prices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'spotted_prices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.spotted_prices', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "spotted_prices_select_own" ON public.spotted_prices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "spotted_prices_insert_own" ON public.spotted_prices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spotted_prices_delete_own" ON public.spotted_prices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "spotted_prices_service_all" ON public.spotted_prices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- bottle_prices — served aggregate ranges
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bottle_prices (
  bottle_id   TEXT NOT NULL,
  currency    TEXT NOT NULL,
  price_low   INTEGER NOT NULL,
  price_high  INTEGER NOT NULL,
  confidence  NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  source      TEXT NOT NULL CHECK (source IN ('msrp_estimate', 'user_reported', 'licensed')),
  as_of       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bottle_id, currency, source)
);

COMMENT ON TABLE public.bottle_prices IS
  'Value-on-scan v1 (Phase 1.2): served price ranges per bottle/currency/source. Ranges with confidence, never point estimates; every row names its source (never scraped). Seeded from spirits_catalog MSRP estimates; user_reported rows land via service-role aggregation of spotted_prices in a later pass.';

CREATE INDEX IF NOT EXISTS idx_bottle_prices_bottle
  ON public.bottle_prices (bottle_id);

ALTER TABLE public.bottle_prices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bottle_prices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bottle_prices', pol.policyname);
  END LOOP;
END $$;

-- Read-only reference data, same posture as spirits_catalog.
CREATE POLICY "bottle_prices_read" ON public.bottle_prices
  FOR SELECT USING (true);

CREATE POLICY "bottle_prices_service_all" ON public.bottle_prices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- Seed from spirits_catalog MSRP-style estimates (one row per bottle
-- per currency that has data). Idempotent: re-running refreshes rows.
-- ---------------------------------------------------------------------

INSERT INTO public.bottle_prices (bottle_id, currency, price_low, price_high, confidence, source, as_of)
SELECT id, 'USD', price_usd_min, price_usd_max, 0.5, 'msrp_estimate', NOW()
  FROM public.spirits_catalog
 WHERE price_usd_min IS NOT NULL AND price_usd_max IS NOT NULL
ON CONFLICT (bottle_id, currency, source)
  DO UPDATE SET price_low = EXCLUDED.price_low, price_high = EXCLUDED.price_high, as_of = EXCLUDED.as_of;

INSERT INTO public.bottle_prices (bottle_id, currency, price_low, price_high, confidence, source, as_of)
SELECT id, 'CAD', price_cad_min, price_cad_max, 0.5, 'msrp_estimate', NOW()
  FROM public.spirits_catalog
 WHERE price_cad_min IS NOT NULL AND price_cad_max IS NOT NULL
ON CONFLICT (bottle_id, currency, source)
  DO UPDATE SET price_low = EXCLUDED.price_low, price_high = EXCLUDED.price_high, as_of = EXCLUDED.as_of;

INSERT INTO public.bottle_prices (bottle_id, currency, price_low, price_high, confidence, source, as_of)
SELECT id, 'GBP', price_gbp_min, price_gbp_max, 0.5, 'msrp_estimate', NOW()
  FROM public.spirits_catalog
 WHERE price_gbp_min IS NOT NULL AND price_gbp_max IS NOT NULL
ON CONFLICT (bottle_id, currency, source)
  DO UPDATE SET price_low = EXCLUDED.price_low, price_high = EXCLUDED.price_high, as_of = EXCLUDED.as_of;

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration):
--
-- Community range candidate for a bottle (the future aggregation shape —
-- percentile band over recent reports, service-role only):
--   SELECT bottle_id, currency,
--          percentile_cont(0.25) WITHIN GROUP (ORDER BY price) AS p25,
--          percentile_cont(0.75) WITHIN GROUP (ORDER BY price) AS p75,
--          COUNT(*) AS reports
--     FROM public.spotted_prices
--    WHERE seen_at >= NOW() - INTERVAL '180 days'
--    GROUP BY bottle_id, currency
--   HAVING COUNT(*) >= 5;
--
-- Value-line coverage check (acceptance: >=60% of scans show a value):
--   handled in Mixpanel as VALUE_LINE_SHOWN / SCAN_SUCCESS.
-- =====================================================================
