-- Migration 024: Self-rotating challenge system
--
-- Problem: all existing challenge rows used NOW() + INTERVAL at seed time,
--   so they expire permanently. There is no rotation mechanism.
--
-- Solution:
--   1. Unique constraint on (title, frequency) so we can upsert rather than insert.
--   2. refresh_active_challenges() upserts the full challenge pool with rolling
--      expiry dates and resets user progress when a new period begins.
--   3. pg_cron schedule runs this at 00:01 UTC daily (idempotent — weekly/monthly
--      challenges just have their expiry recalculated, no duplicate rows created).

-- ─── 1. Unique constraint ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'challenges_title_frequency_key'
      AND conrelid = 'public.challenges'::regclass
  ) THEN
    ALTER TABLE public.challenges
      ADD CONSTRAINT challenges_title_frequency_key UNIQUE (title, frequency);
  END IF;
END;
$$;

-- ─── 2. Rotation function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_active_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_start    TIMESTAMPTZ := date_trunc('day',   NOW() AT TIME ZONE 'UTC');
  weekly_start   TIMESTAMPTZ := date_trunc('week',  NOW() AT TIME ZONE 'UTC');
  monthly_start  TIMESTAMPTZ := date_trunc('month', NOW() AT TIME ZONE 'UTC');

  daily_expiry   TIMESTAMPTZ := daily_start   + INTERVAL '1 day'   - INTERVAL '1 second';
  weekly_expiry  TIMESTAMPTZ := weekly_start  + INTERVAL '1 week'  - INTERVAL '1 second';
  monthly_expiry TIMESTAMPTZ := monthly_start + INTERVAL '1 month' - INTERVAL '1 second';
BEGIN

  -- ── Daily challenges ──────────────────────────────────────────────────────
  INSERT INTO public.challenges (
    title, description, category, frequency, difficulty,
    xp_reward, badge_reward,
    requirement_type, requirement_count,
    icon, color, expires_at, data_collected
  ) VALUES
  ('Recipe Explorer', 'View 3 cocktail recipes',                     'exploration', 'daily', 'easy',   30,  NULL,             'recipe_view',      3, 'restaurant-outline',    '#2196F3', daily_expiry, NULL),
  ('XP Hunter',       'Earn 200 XP today',                           'progress',    'daily', 'medium',  75, NULL,             'xp_earn',        200, 'star-outline',          '#9C27B0', daily_expiry, NULL),
  ('First Scan',      'Scan a bottle to add it to your bar',         'exploration', 'daily', 'easy',   50,  NULL,             'scan_bottle',      1, 'scan-outline',          '#43A047', daily_expiry, ARRAY['bottle_id','spirit_category','brand']),
  ('Bar Builder',     'Add 3 bottles to your inventory today',       'progress',    'daily', 'medium', 100, NULL,             'add_to_inventory', 3, 'add-circle-outline',    '#FF9800', daily_expiry, ARRAY['bottle_id','item_type','category']),
  ('Save a Recipe',   'Save a cocktail recipe to your collection',   'exploration', 'daily', 'easy',   30,  NULL,             'save_recipe',      1, 'bookmark-outline',      '#2196F3', daily_expiry, ARRAY['recipe_id']),
  ('Share Your Find', 'Share a bottle or cocktail discovery',        'social',      'daily', 'easy',   40,  NULL,             'share_moment',     1, 'share-social-outline',  '#E91E63', daily_expiry, ARRAY['recipe_id','bottle_id'])
  ON CONFLICT (title, frequency) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  -- ── Weekly challenges ─────────────────────────────────────────────────────
  INSERT INTO public.challenges (
    title, description, category, frequency, difficulty,
    xp_reward, badge_reward,
    requirement_type, requirement_count,
    icon, color, expires_at, data_collected
  ) VALUES
  ('Streak Keeper',      'Maintain a 7-day streak',                                   'progress',    'weekly', 'hard',   500, 'streak_master',  'streak_maintain',    7, 'flame-outline',             '#FF5722', weekly_expiry, NULL),
  ('Recipe Collector',   'View 20 different recipes',                                 'exploration', 'weekly', 'medium', 250, NULL,             'recipe_view',       20, 'library-outline',           '#00BCD4', weekly_expiry, NULL),
  ('Category Explorer',  'Scan bottles from 3 different spirit categories this week', 'exploration', 'weekly', 'medium', 250, NULL,             'scan_new_category',  3, 'compass-outline',           '#9C27B0', weekly_expiry, ARRAY['spirit_category','bottle_id']),
  ('Stocked Up',         'Add 10 items to your inventory this week',                  'progress',    'weekly', 'medium', 300, NULL,             'add_to_inventory',  10, 'wine-outline',              '#00BCD4', weekly_expiry, ARRAY['bottle_id','item_type','category']),
  ('Recipe Librarian',   'Save 5 cocktail recipes this week',                         'exploration', 'weekly', 'medium', 200, NULL,             'save_recipe',        5, 'library-outline',           '#8BC34A', weekly_expiry, ARRAY['recipe_id']),
  ('Made It',            'Log 3 cocktails you made at home this week',                'skill',       'weekly', 'hard',   400, 'home_bartender', 'log_make',           3, 'beaker-outline',            '#FF5722', weekly_expiry, ARRAY['recipe_id','timestamp']),
  ('Rate Your Drinks',   'Rate 5 recipes you have tried',                             'skill',       'weekly', 'medium', 200, NULL,             'rate_recipe',        5, 'star-outline',              '#FFC107', weekly_expiry, ARRAY['recipe_id','rating']),
  ('Spread the Word',    'Share 3 finds with friends this week',                      'social',      'weekly', 'medium', 250, NULL,             'share_moment',       3, 'megaphone-outline',         '#F06292', weekly_expiry, ARRAY['recipe_id','bottle_id'])
  ON CONFLICT (title, frequency) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  -- ── Monthly challenges ────────────────────────────────────────────────────
  INSERT INTO public.challenges (
    title, description, category, frequency, difficulty,
    xp_reward, badge_reward,
    requirement_type, requirement_count,
    icon, color, expires_at, data_collected
  ) VALUES
  ('Vault Collector',  'Unlock 5 vault items',                              'progress',    'monthly', 'hard',  750, 'collector',       'vault_unlock',       5, 'lock-open-outline',  '#607D8B', monthly_expiry, NULL),
  ('Spirit Curious',   'Scan bottles from 6 different spirit categories',   'exploration', 'monthly', 'hard',  750, 'spirit_curious',  'scan_new_category',  6, 'flask-outline',      '#673AB7', monthly_expiry, ARRAY['spirit_category','bottle_id']),
  ('Home Bar Pro',     'Add 25 bottles to your inventory this month',       'progress',    'monthly', 'epic', 1500, 'home_bar_pro',    'add_to_inventory',  25, 'home-outline',       '#FFD700', monthly_expiry, ARRAY['bottle_id','item_type','category']),
  ('The Host',         'Log 10 cocktails you made at home this month',      'skill',       'monthly', 'hard', 1000, 'the_host',        'log_make',          10, 'people-outline',     '#795548', monthly_expiry, ARRAY['recipe_id','timestamp'])
  ON CONFLICT (title, frequency) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  -- ── Reset stale user progress when a new period begins ───────────────────
  -- Deletes progress rows whose last activity predates the start of the
  -- current period, so users start fresh each day/week/month.
  DELETE FROM public.user_challenge_progress ucp
  USING public.challenges c
  WHERE ucp.challenge_id = c.id
    AND (
      (c.frequency = 'daily'   AND ucp.updated_at < daily_start)
      OR (c.frequency = 'weekly'  AND ucp.updated_at < weekly_start)
      OR (c.frequency = 'monthly' AND ucp.updated_at < monthly_start)
    );

END;
$$;

-- ─── 3. Run immediately to fix current state ─────────────────────────────────
SELECT public.refresh_active_challenges();

-- ─── 4. Scheduling ───────────────────────────────────────────────────────────
-- Handled by GitHub Actions (.github/workflows/refresh-challenges.yml).
-- The workflow calls the refresh-challenges Edge Function daily at 00:05 UTC,
-- which in turn calls SELECT public.refresh_active_challenges().
