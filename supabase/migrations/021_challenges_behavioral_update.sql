-- Migration 021: Challenges behavioral update
-- 1. Remove dead keys_reward column
-- 2. Extend requirement_type to include behavioral action types
-- 3. Add data_collected column for analytics annotation
-- 4. Seed behavioral challenges for scan, inventory, recipe, and share actions

-- ─── 1. Remove keys_reward ───────────────────────────────────────────────────
ALTER TABLE public.challenges DROP COLUMN IF EXISTS keys_reward;

-- ─── 2. Extend requirement_type check constraint ─────────────────────────────
-- Drop old constraint and replace with extended version
ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_requirement_type_check;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_requirement_type_check CHECK (requirement_type IN (
    'lesson_complete',
    'xp_earn',
    'streak_maintain',
    'recipe_view',
    'bar_visit',
    'vault_unlock',
    'quiz_perfect',
    'module_complete',
    'scan_bottle',
    'scan_new_category',
    'log_make',
    'rate_recipe',
    'add_to_inventory',
    'save_recipe',
    'explore_spirit',
    'complete_profile',
    'share_moment'
  ));

-- ─── 3. Add data_collected column ────────────────────────────────────────────
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS data_collected TEXT[];

-- ─── 4. Seed behavioral challenges ───────────────────────────────────────────

-- Daily: Scan challenges
INSERT INTO public.challenges (
  title, description, category, frequency, difficulty,
  xp_reward, badge_reward,
  requirement_type, requirement_count,
  icon, color, expires_at, data_collected
) VALUES
(
  'First Scan',
  'Scan a bottle to add it to your bar',
  'exploration', 'daily', 'easy',
  50, NULL,
  'scan_bottle', 1,
  'scan-outline', '#4CAF50',
  NOW() + INTERVAL '30 days',
  ARRAY['bottle_id', 'spirit_category', 'brand']
),
(
  'Bar Builder',
  'Add 3 bottles to your inventory today',
  'progress', 'daily', 'medium',
  100, NULL,
  'add_to_inventory', 3,
  'add-circle-outline', '#FF9800',
  NOW() + INTERVAL '30 days',
  ARRAY['bottle_id', 'item_type', 'category']
),
(
  'Save a Recipe',
  'Save a cocktail recipe to your collection',
  'exploration', 'daily', 'easy',
  30, NULL,
  'save_recipe', 1,
  'bookmark-outline', '#2196F3',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id']
),
(
  'Share Your Find',
  'Share a bottle or cocktail discovery',
  'social', 'daily', 'easy',
  40, NULL,
  'share_moment', 1,
  'share-social-outline', '#E91E63',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id', 'bottle_id']
),

-- Weekly: Scan and inventory challenges
(
  'Category Explorer',
  'Scan bottles from 3 different spirit categories this week',
  'exploration', 'weekly', 'medium',
  250, NULL,
  'scan_new_category', 3,
  'compass-outline', '#9C27B0',
  NOW() + INTERVAL '30 days',
  ARRAY['spirit_category', 'bottle_id']
),
(
  'Stocked Up',
  'Add 10 items to your inventory this week',
  'progress', 'weekly', 'medium',
  300, NULL,
  'add_to_inventory', 10,
  'wine-outline', '#00BCD4',
  NOW() + INTERVAL '30 days',
  ARRAY['bottle_id', 'item_type', 'category']
),
(
  'Recipe Librarian',
  'Save 5 cocktail recipes this week',
  'exploration', 'weekly', 'medium',
  200, NULL,
  'save_recipe', 5,
  'library-outline', '#8BC34A',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id']
),
(
  'Made It',
  'Log 3 cocktails you made at home this week',
  'skill', 'weekly', 'hard',
  400, 'home_bartender',
  'log_make', 3,
  'beaker-outline', '#FF5722',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id', 'timestamp']
),
(
  'Rate Your Drinks',
  'Rate 5 recipes you have tried',
  'skill', 'weekly', 'medium',
  200, NULL,
  'rate_recipe', 5,
  'star-outline', '#FFC107',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id', 'rating']
),

-- Weekly: Social / share
(
  'Spread the Word',
  'Share 3 finds with friends this week',
  'social', 'weekly', 'medium',
  250, NULL,
  'share_moment', 3,
  'megaphone-outline', '#F06292',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id', 'bottle_id']
),

-- Monthly: Depth challenges
(
  'Spirit Curious',
  'Scan bottles from 6 different spirit categories',
  'exploration', 'monthly', 'hard',
  750, 'spirit_curious',
  'scan_new_category', 6,
  'flask-outline', '#673AB7',
  NOW() + INTERVAL '30 days',
  ARRAY['spirit_category', 'bottle_id']
),
(
  'Home Bar Pro',
  'Add 25 bottles to your inventory',
  'progress', 'monthly', 'epic',
  1500, 'home_bar_pro',
  'add_to_inventory', 25,
  'home-outline', '#FFD700',
  NOW() + INTERVAL '30 days',
  ARRAY['bottle_id', 'item_type', 'category']
),
(
  'The Host',
  'Log 10 cocktails you made at home this month',
  'skill', 'monthly', 'hard',
  1000, 'the_host',
  'log_make', 10,
  'people-outline', '#795548',
  NOW() + INTERVAL '30 days',
  ARRAY['recipe_id', 'timestamp']
)
ON CONFLICT DO NOTHING;
