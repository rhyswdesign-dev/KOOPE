-- =====================================================================
-- Migration 030: made_events — the North Star sensor (Phase 0.8)
-- =====================================================================
--
-- One durable, queryable table for "a user made a cocktail." This is the
-- single event every "I made this" tap writes to, replacing nothing
-- (recipe_completion_logs stays local/AsyncStorage-only and
-- brand_selections stays its own thing for the brand-partnership
-- pipeline) but giving the app its first real behavioral signal:
--   - Weekly Makers: users with >=1 made_events row in the trailing 7 days.
--   - Repeat-make: the strongest taste signal there is (stronger than a
--     view or a save) — feeds useTasteModel client-side.
--   - "Made 2x" card scaffolding for Phase 3 (COUNT(*) per user+recipe).
--
-- NOTE: the workplan (docs/KOOPE-ENGINEERING-WORKPLAN.md §0.8) names this
-- file 029_made_events.sql, but 029 was already used by
-- 029_fix_rls_recipes_and_vault.sql (Phase 0.1, landed first per the
-- plan's own ordering). Numbered 030 to keep migrations strictly
-- sequential — never renumber a migration once another has been
-- written on top of it.
--
-- HOW TO APPLY: same as 029 — this is an unapplied, reviewed-and-ready
-- migration file. Run via `supabase db push` (tracked) or paste into
-- the SQL Editor after a backup. Not applied by this commit.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'made_event_source') THEN
    CREATE TYPE made_event_source AS ENUM (
      'recipe_detail',
      'tonights_pick',
      'hosting',
      'whatcanimake'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.made_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id           TEXT NOT NULL,
  made_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source              made_event_source NOT NULL DEFAULT 'recipe_detail',
  substitutions_used  JSONB NULL,
  rating              SMALLINT NULL CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.made_events IS
  'The North Star sensor (Phase 0.8): one row per "I made this" tap. Weekly Makers, repeat-make taste signal, and made-count scaffolding for recipe cards all read from here.';
COMMENT ON COLUMN public.made_events.recipe_id IS
  'Matches recipes.id (TEXT, kebab-case) — not a foreign key because the live recipes table shape is still ambiguous per 029''s header warning; validate at the app layer instead.';
COMMENT ON COLUMN public.made_events.substitutions_used IS
  'Optional JSON payload describing ingredient substitutions used this time (feeds 2.2 Make It Anyway once it exists). Null = made as written.';

-- Index for the two real query shapes: "this user's history" and
-- "who made something this week" (Weekly Makers).
CREATE INDEX IF NOT EXISTS idx_made_events_user_made_at
  ON public.made_events (user_id, made_at DESC);

CREATE INDEX IF NOT EXISTS idx_made_events_recipe_id
  ON public.made_events (recipe_id);

-- ---------------------------------------------------------------------
-- RLS: owner-only. A user can log and read their own made_events; the
-- service role (Edge Functions / admin) retains full access.
-- ---------------------------------------------------------------------
ALTER TABLE public.made_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'made_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.made_events', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "made_events_select_own" ON public.made_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "made_events_insert_own" ON public.made_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "made_events_update_own" ON public.made_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "made_events_delete_own" ON public.made_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "made_events_service_all" ON public.made_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- REFERENCE QUERIES (not part of the migration — for the accept check
-- "Weekly Makers is a computable query" and app-side use):
-- =====================================================================
--
-- Weekly Makers (distinct users who made >=1 thing in the trailing 7 days):
--   SELECT COUNT(DISTINCT user_id) AS weekly_makers
--     FROM public.made_events
--    WHERE made_at >= NOW() - INTERVAL '7 days';
--
-- Per-user weekly streak input ("made something this week"):
--   SELECT user_id, COUNT(*) AS makes_this_week
--     FROM public.made_events
--    WHERE made_at >= date_trunc('week', NOW())
--    GROUP BY user_id;
--
-- "Made Nx" scaffold for a recipe card (per user+recipe count):
--   SELECT COUNT(*) AS times_made
--     FROM public.made_events
--    WHERE user_id = $1 AND recipe_id = $2;
-- =====================================================================
