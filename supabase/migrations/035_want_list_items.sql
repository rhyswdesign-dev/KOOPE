-- =====================================================================
-- Migration 035: want_list_items — the want-list, made durable
-- =====================================================================
--
-- The want-list ("bottles I've spotted but don't own yet") has been 100%
-- local since it shipped: zustand + AsyncStorage in src/store/useWishlist.ts.
-- That means a reinstall wipes it, a second device never sees it, and — the
-- reason this migration exists — none of it is query-able for the
-- brand-insights product. "How many people wanted brand X but didn't buy
-- it" is one of the most commercially interesting questions the app can
-- answer, and today the answer lives only on the handset.
--
-- Relationship to the tables that already exist:
--   - scan_events (032)   — one row per Answer Card visit, with an outcome
--                           of owned/wanted/passed. That's the *moment* of
--                           wanting. This table is the *standing list*.
--   - spotted_prices (031) — price sightings. Deliberately NOT duplicated
--                           into this table: a want-list row and its price
--                           sightings join on (user_id, bottle_id). One
--                           write path for prices, as before.
--
-- Shape mirrors WishlistItem in src/store/useWishlist.ts one-for-one, minus
-- priceEntries (see above). AsyncStorage stays the offline-first source of
-- truth; this table is a best-effort mirror written alongside each local
-- mutation and pulled-and-merged on sign-in (src/services/wantListService.ts).
--
-- Shape, RLS and index strategy follow 030/031/032/033 exactly.
--
-- HOW TO APPLY: reviewed-and-ready migration file, NOT applied by this
-- commit and NOT applied by any agent. Paste into the Supabase Dashboard
-- SQL Editor after taking a backup, same as 030/031/032/033. (This
-- project's migration history tracking is unreliable — do NOT run
-- `supabase db push` or `supabase migration repair` here.)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.want_list_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bottle_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  brand       TEXT NULL,
  type        TEXT NULL,
  image_uri   TEXT NULL,
  date_saved  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT want_list_items_user_bottle_unique UNIQUE (user_id, bottle_id)
);

COMMENT ON TABLE public.want_list_items IS
  'Durable mirror of the local want-list (src/store/useWishlist.ts). One row per (user, bottle) the user has saved but does not own. Joins to spotted_prices (031) on (user_id, bottle_id) for price sightings, and complements scan_events (032), which records the moment of wanting rather than the standing list.';
COMMENT ON COLUMN public.want_list_items.bottle_id IS
  'Matches the client-side wishlist id: bottle.id when the catalog knows the bottle, otherwise a slug of "<name>_<brand>". Not a foreign key — same precedent as made_events.recipe_id and scan_events.bottle_id; validate at the app layer.';
COMMENT ON COLUMN public.want_list_items.date_saved IS
  'When the user first saved it locally, carried over from the client so a late first sync does not backdate to the sync time.';

-- The two real query needs: "this user's want-list" (the pull-and-merge on
-- sign-in) and per-bottle demand rollups for brand insights.
CREATE INDEX IF NOT EXISTS idx_want_list_items_user_date_saved
  ON public.want_list_items (user_id, date_saved DESC);

CREATE INDEX IF NOT EXISTS idx_want_list_items_bottle_id
  ON public.want_list_items (bottle_id);

-- ---------------------------------------------------------------------
-- RLS: owner-only, same shape as 031_bottle_prices.sql / 033_recipe_signals.sql.
-- ---------------------------------------------------------------------
ALTER TABLE public.want_list_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'want_list_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.want_list_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "want_list_items_select_own" ON public.want_list_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "want_list_items_insert_own" ON public.want_list_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "want_list_items_update_own" ON public.want_list_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "want_list_items_delete_own" ON public.want_list_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "want_list_items_service_all" ON public.want_list_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration)
-- =====================================================================
--
-- The pull-and-merge input on sign-in — a user's whole want-list:
--   SELECT bottle_id, name, brand, type, image_uri, date_saved
--     FROM public.want_list_items
--    WHERE user_id = $1
--    ORDER BY date_saved DESC;
--
-- Demand for a brand — the number brand pitches actually care about:
--   SELECT brand, COUNT(DISTINCT user_id) AS people_wanting
--     FROM public.want_list_items
--    GROUP BY brand
--    ORDER BY people_wanting DESC;
--
-- Wanted-but-not-owned, the conversion gap (needs user_inventory):
--   SELECT w.bottle_id, w.name, COUNT(*) AS wanters
--     FROM public.want_list_items w
--     LEFT JOIN public.user_inventory i
--       ON i.user_id = w.user_id AND LOWER(i.item_name) = LOWER(w.name)
--    WHERE i.id IS NULL
--    GROUP BY w.bottle_id, w.name
--    ORDER BY wanters DESC;
--
-- A want-list row joined to what people paid attention to price-wise:
--   SELECT w.bottle_id, w.name,
--          COUNT(p.id) AS price_sightings,
--          MIN(p.price) AS lowest_seen
--     FROM public.want_list_items w
--     LEFT JOIN public.spotted_prices p
--       ON p.user_id = w.user_id AND p.bottle_id = w.bottle_id
--    GROUP BY w.bottle_id, w.name;
-- =====================================================================
