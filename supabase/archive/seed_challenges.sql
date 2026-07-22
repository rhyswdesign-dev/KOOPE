-- Seed Challenge Data
-- Sample challenges for daily, weekly, and monthly rotation

-- Daily Challenges (expire at midnight tonight)
INSERT INTO public.challenges (
  title,
  description,
  category,
  frequency,
  difficulty,
  xp_reward,
  requirement_type,
  requirement_count,
  icon,
  color,
  expires_at
) VALUES
  (
    'Quick Study',
    'Complete 3 lessons today',
    'progress',
    'daily',
    'easy',
    50,
    'lesson_complete',
    3,
    'book-outline',
    '#E58B2B',
    (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::timestamptz
  ),
  (
    'Perfect Score',
    'Get 100% on any quiz',
    'skill',
    'daily',
    'medium',
    75,
    'quiz_perfect',
    1,
    'trophy-outline',
    '#D4AF37',
    (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::timestamptz
  ),
  (
    'Streak Keeper',
    'Maintain your daily streak',
    'progress',
    'daily',
    'easy',
    30,
    'streak_maintain',
    1,
    'flame-outline',
    '#FF6B6B',
    (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::timestamptz
  );

-- Weekly Challenges (expire next Monday)
INSERT INTO public.challenges (
  title,
  description,
  category,
  frequency,
  difficulty,
  xp_reward,
  keys_reward,
  requirement_type,
  requirement_count,
  icon,
  color,
  expires_at
) VALUES
  (
    'Recipe Explorer',
    'View 10 new cocktail recipes this week',
    'exploration',
    'weekly',
    'medium',
    150,
    1,
    'recipe_view',
    10,
    'search-outline',
    '#9B59B6',
    (CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1) % 7)::INTEGER + INTERVAL '23 hours 59 minutes 59 seconds')::timestamptz
  ),
  (
    'XP Grinder',
    'Earn 500 XP this week',
    'progress',
    'weekly',
    'hard',
    200,
    1,
    'xp_earn',
    500,
    'analytics-outline',
    '#3498DB',
    (CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1) % 7)::INTEGER + INTERVAL '23 hours 59 minutes 59 seconds')::timestamptz
  ),
  (
    'Bar Crawler',
    'Visit 5 different bars in your area',
    'exploration',
    'weekly',
    'medium',
    120,
    NULL,
    'bar_visit',
    5,
    'location-outline',
    '#16A085',
    (CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1) % 7)::INTEGER + INTERVAL '23 hours 59 minutes 59 seconds')::timestamptz
  );

-- Monthly Challenge (expire at end of month)
INSERT INTO public.challenges (
  title,
  description,
  category,
  frequency,
  difficulty,
  xp_reward,
  keys_reward,
  badge_reward,
  requirement_type,
  requirement_count,
  icon,
  color,
  expires_at
) VALUES
  (
    'Master Mixologist',
    'Complete all spirit education modules',
    'skill',
    'monthly',
    'epic',
    500,
    3,
    'master_mixologist',
    'module_complete',
    5,
    'star-outline',
    '#E74C3C',
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second')::timestamptz
  ),
  (
    'Vault Raider',
    'Unlock 10 premium recipes using vault keys',
    'exploration',
    'monthly',
    'hard',
    400,
    2,
    NULL,
    'vault_unlock',
    10,
    'lock-open-outline',
    '#F39C12',
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 second')::timestamptz
  );

-- Additional challenge ideas (commented out)
-- Uncomment and customize as needed

/*
-- Social Challenges
INSERT INTO public.challenges (
  title, description, category, frequency, difficulty,
  xp_reward, keys_reward, requirement_type, requirement_count,
  icon, color, expires_at
) VALUES
  (
    'Share the Knowledge',
    'Share 3 cocktail recipes with friends',
    'social',
    'weekly',
    'easy',
    80,
    NULL,
    'recipe_share',
    3,
    'share-social-outline',
    '#8E44AD',
    (CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1) % 7)::INTEGER)::timestamptz
  );

-- Advanced Skill Challenges
INSERT INTO public.challenges (
  title, description, category, frequency, difficulty,
  xp_reward, keys_reward, requirement_type, requirement_count,
  icon, color, expires_at
) VALUES
  (
    'Technique Master',
    'Complete all technique lessons',
    'skill',
    'monthly',
    'hard',
    350,
    2,
    'lesson_complete',
    15,
    'construct-outline',
    '#2C3E50',
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz
  );
*/
