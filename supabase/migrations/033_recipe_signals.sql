-- =====================================================================
-- Migration 033: recipe_signals — recipe engagement short of a make
-- =====================================================================
--
-- The third and last taste-signal stream. The other two already exist and
-- are deliberately NOT replaced by this table:
--   - made_events (030)  — "I made this," plus a 1-5 rating. The strongest
--                          taste signal there is.
--   - scan_events (032)  — bottle scans with context (store/home/gift) and
--                          outcome (owned/wanted/passed).
--
-- Neither captures recipe engagement that stops short of making the drink:
-- viewing it, saving it, thumbing it up or down. That is the highest-volume
-- signal the app produces and it currently goes nowhere durable — the only
-- consumer was usePersonalization's in-memory 0-100 score store, which is a
-- second profile on a different scale that nothing treats as authoritative.
--
-- Read together, the three tables are the event log that
-- services/tasteVectorService.ts computes the canonical taste vector from,
-- with recency weighting. That is what finally gives tasteGraphService's
-- decay and confidence maths real data — see
-- MixedMindOS/Products/KOOPE/Product/Taste-Learning-Redesign-2026-07.md.
--
-- Shape, RLS and index strategy follow 030/032 exactly.
--
-- NOTE on 'dismiss': the enum carries it, but no dismiss / "not interested"
-- affordance exists in the UI yet. It ships here so the vocabulary is stable
-- when Phase 3 adds the control — writing it now costs nothing and avoids an
-- enum migration later.
--
-- HOW TO APPLY: reviewed-and-ready migration file, not applied by this
-- commit. Paste into the Supabase Dashboard SQL Editor after a backup, same
-- as 030/031/032. (This project's migration history tracking is unreliable —
-- do not run `supabase db push` here.)
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_signal_type') THEN
    CREATE TYPE recipe_signal_type AS ENUM (
      'view',
      'save',
      'unsave',
      'thumbs_up',
      'thumbs_down',
      'dismiss'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.recipe_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id   TEXT NOT NULL,
  signal      recipe_signal_type NOT NULL,
  source      TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.recipe_signals IS
  'Recipe engagement short of a make (view/save/unsave/thumbs/dismiss). Third of the three taste-signal streams alongside made_events (030) and scan_events (032); read together by tasteVectorService to compute the canonical taste vector.';
COMMENT ON COLUMN public.recipe_signals.recipe_id IS
  'Matches recipes.id (TEXT, kebab-case) — not a foreign key, matching made_events'' precedent: the live recipes table shape is still ambiguous, so validate at the app layer.';
COMMENT ON COLUMN public.recipe_signals.signal IS
  'Negative signals (thumbs_down, unsave, dismiss) carry real weight in the taste vector — dislike was previously almost never captured.';
COMMENT ON COLUMN public.recipe_signals.source IS
  'Where the interaction happened, reusing recipeActions.ts''s existing RecipeViewSource labels (featured | search | home_bar | vault | saved | category | ...). Null when the call site has no source context.';

-- Index shapes for the two real query needs: "this user's recent signals"
-- (the taste-vector recompute) and per-recipe rollups.
CREATE INDEX IF NOT EXISTS idx_recipe_signals_user_created_at
  ON public.recipe_signals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_signals_recipe_id
  ON public.recipe_signals (recipe_id);

-- ---------------------------------------------------------------------
-- RLS: owner-only, same shape as 030_made_events.sql / 032_scan_context.sql.
-- ---------------------------------------------------------------------
ALTER TABLE public.recipe_signals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recipe_signals'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recipe_signals', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "recipe_signals_select_own" ON public.recipe_signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "recipe_signals_insert_own" ON public.recipe_signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipe_signals_update_own" ON public.recipe_signals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipe_signals_delete_own" ON public.recipe_signals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "recipe_signals_service_all" ON public.recipe_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration)
-- =====================================================================
--
-- The taste-vector recompute input — a user's recent signals, newest first:
--   SELECT recipe_id, signal, created_at
--     FROM public.recipe_signals
--    WHERE user_id = $1
--    ORDER BY created_at DESC
--    LIMIT 200;
--
-- Save-through rate for a recipe (how often a view becomes a save):
--   SELECT
--     recipe_id,
--     COUNT(*) FILTER (WHERE signal = 'view')                      AS views,
--     COUNT(*) FILTER (WHERE signal = 'save')                      AS saves,
--     ROUND(100.0 * COUNT(*) FILTER (WHERE signal = 'save')
--           / NULLIF(COUNT(*) FILTER (WHERE signal = 'view'), 0), 1) AS save_through_pct
--   FROM public.recipe_signals
--   GROUP BY recipe_id
--   ORDER BY views DESC;
--
-- Recipes a user has actively rejected (feeds negative weighting):
--   SELECT DISTINCT recipe_id
--     FROM public.recipe_signals
--    WHERE user_id = $1
--      AND signal IN ('thumbs_down', 'dismiss', 'unsave');
-- =====================================================================
