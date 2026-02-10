-- Seed Active Challenges
-- Run this to populate the challenges table with active challenges

-- First, add missing columns to user_challenge_progress if they don't exist
ALTER TABLE public.user_challenge_progress
ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_challenge_progress
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Clear existing challenges (optional - comment out if you want to keep existing)
-- DELETE FROM public.challenges;

-- Insert Daily Challenges (expire end of day, 30 days from now for testing)
INSERT INTO public.challenges (
  title, description, category, frequency, difficulty,
  xp_reward, keys_reward, badge_reward,
  requirement_type, requirement_count,
  icon, color, expires_at
) VALUES
-- Daily Easy
(
  'Quick Learner',
  'Complete 1 lesson today',
  'skill', 'daily', 'easy',
  50, NULL, NULL,
  'lesson_complete', 1,
  'book-outline', '#4CAF50',
  NOW() + INTERVAL '30 days'
),
(
  'Recipe Explorer',
  'View 3 cocktail recipes',
  'exploration', 'daily', 'easy',
  30, NULL, NULL,
  'recipe_view', 3,
  'wine-outline', '#2196F3',
  NOW() + INTERVAL '30 days'
),
-- Daily Medium
(
  'Dedicated Student',
  'Complete 3 lessons today',
  'skill', 'daily', 'medium',
  100, 1, NULL,
  'lesson_complete', 3,
  'school-outline', '#FF9800',
  NOW() + INTERVAL '30 days'
),
(
  'XP Hunter',
  'Earn 200 XP today',
  'progress', 'daily', 'medium',
  75, NULL, NULL,
  'xp_earn', 200,
  'star-outline', '#9C27B0',
  NOW() + INTERVAL '30 days'
),

-- Weekly Challenges (expire in 30 days for testing)
(
  'Weekly Warrior',
  'Complete 10 lessons this week',
  'skill', 'weekly', 'medium',
  300, 3, NULL,
  'lesson_complete', 10,
  'trophy-outline', '#E91E63',
  NOW() + INTERVAL '30 days'
),
(
  'Streak Keeper',
  'Maintain a 7-day streak',
  'progress', 'weekly', 'hard',
  500, 5, 'streak_master',
  'streak_maintain', 7,
  'flame-outline', '#FF5722',
  NOW() + INTERVAL '30 days'
),
(
  'Recipe Collector',
  'View 20 different recipes',
  'exploration', 'weekly', 'medium',
  250, 2, NULL,
  'recipe_view', 20,
  'library-outline', '#00BCD4',
  NOW() + INTERVAL '30 days'
),
(
  'Perfect Score',
  'Get 100% on 3 quizzes',
  'skill', 'weekly', 'hard',
  400, 4, 'perfectionist',
  'quiz_perfect', 3,
  'checkmark-circle-outline', '#8BC34A',
  NOW() + INTERVAL '30 days'
),

-- Monthly Challenges (expire in 30 days)
(
  'Mixology Master',
  'Complete 30 lessons this month',
  'skill', 'monthly', 'hard',
  1000, 10, 'mixology_master',
  'lesson_complete', 30,
  'medal-outline', '#FFD700',
  NOW() + INTERVAL '30 days'
),
(
  'Knowledge Seeker',
  'Complete 5 full modules',
  'progress', 'monthly', 'epic',
  2000, 20, 'knowledge_seeker',
  'module_complete', 5,
  'ribbon-outline', '#673AB7',
  NOW() + INTERVAL '30 days'
),
(
  'Bar Explorer',
  'Visit 10 featured bars',
  'exploration', 'monthly', 'medium',
  500, 5, NULL,
  'bar_visit', 10,
  'business-outline', '#795548',
  NOW() + INTERVAL '30 days'
),
(
  'Vault Collector',
  'Unlock 5 vault items',
  'progress', 'monthly', 'hard',
  750, 8, 'collector',
  'vault_unlock', 5,
  'lock-open-outline', '#607D8B',
  NOW() + INTERVAL '30 days'
)
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT
  frequency,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as titles
FROM public.challenges
WHERE expires_at > NOW()
GROUP BY frequency
ORDER BY frequency;
