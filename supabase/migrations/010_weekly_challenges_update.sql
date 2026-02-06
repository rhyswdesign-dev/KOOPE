-- Update Challenges: Convert Daily to Weekly + Add More Variety
-- This ensures we have enough weekly challenges for 52 weeks without repetition

-- First, delete existing daily challenges (they were placeholder)
DELETE FROM public.challenges WHERE frequency = 'daily';

-- Insert 52+ Weekly Challenges for year-round variety
INSERT INTO public.challenges (
  title, description, category, frequency, difficulty,
  xp_reward, keys_reward, badge_reward,
  requirement_type, requirement_count,
  icon, color, expires_at
) VALUES

-- SKILL CHALLENGES (Lesson-based) - 15 variations
('Quick Learner', 'Complete 3 lessons this week', 'skill', 'weekly', 'easy', 100, NULL, NULL, 'lesson_complete', 3, 'book-outline', '#4CAF50', NOW() + INTERVAL '7 days'),
('Dedicated Student', 'Complete 5 lessons this week', 'skill', 'weekly', 'medium', 200, 2, NULL, 'lesson_complete', 5, 'school-outline', '#FF9800', NOW() + INTERVAL '14 days'),
('Weekly Warrior', 'Complete 10 lessons this week', 'skill', 'weekly', 'hard', 400, 4, NULL, 'lesson_complete', 10, 'trophy-outline', '#E91E63', NOW() + INTERVAL '21 days'),
('Knowledge Sprint', 'Complete 7 lessons this week', 'skill', 'weekly', 'medium', 280, 3, NULL, 'lesson_complete', 7, 'flash-outline', '#00BCD4', NOW() + INTERVAL '28 days'),
('Lesson Champion', 'Complete 12 lessons this week', 'skill', 'weekly', 'hard', 500, 5, NULL, 'lesson_complete', 12, 'medal-outline', '#9C27B0', NOW() + INTERVAL '35 days'),
('Study Session', 'Complete 4 lessons this week', 'skill', 'weekly', 'easy', 150, 1, NULL, 'lesson_complete', 4, 'reader-outline', '#3F51B5', NOW() + INTERVAL '42 days'),
('Bartender Basics', 'Complete 2 lessons this week', 'skill', 'weekly', 'easy', 75, NULL, NULL, 'lesson_complete', 2, 'beer-outline', '#795548', NOW() + INTERVAL '49 days'),
('Course Crusher', 'Complete 8 lessons this week', 'skill', 'weekly', 'medium', 320, 3, NULL, 'lesson_complete', 8, 'rocket-outline', '#FF5722', NOW() + INTERVAL '56 days'),
('Weekly Wisdom', 'Complete 6 lessons this week', 'skill', 'weekly', 'medium', 240, 2, NULL, 'lesson_complete', 6, 'bulb-outline', '#FFC107', NOW() + INTERVAL '63 days'),
('Learn & Grow', 'Complete 9 lessons this week', 'skill', 'weekly', 'hard', 360, 4, NULL, 'lesson_complete', 9, 'trending-up-outline', '#4CAF50', NOW() + INTERVAL '70 days'),
('Skill Builder', 'Complete 11 lessons this week', 'skill', 'weekly', 'hard', 450, 5, NULL, 'lesson_complete', 11, 'construct-outline', '#2196F3', NOW() + INTERVAL '77 days'),
('Education First', 'Complete 1 lesson this week', 'skill', 'weekly', 'easy', 50, NULL, NULL, 'lesson_complete', 1, 'cafe-outline', '#9E9E9E', NOW() + INTERVAL '84 days'),
('Power Learner', 'Complete 15 lessons this week', 'skill', 'weekly', 'epic', 600, 6, 'power_learner', 'lesson_complete', 15, 'flash-outline', '#FFD700', NOW() + INTERVAL '91 days'),

-- EXPLORATION CHALLENGES (Recipe viewing) - 13 variations
('Recipe Explorer', 'View 5 cocktail recipes', 'exploration', 'weekly', 'easy', 80, NULL, NULL, 'recipe_view', 5, 'wine-outline', '#2196F3', NOW() + INTERVAL '7 days'),
('Recipe Collector', 'View 15 different recipes', 'exploration', 'weekly', 'medium', 200, 2, NULL, 'recipe_view', 15, 'library-outline', '#00BCD4', NOW() + INTERVAL '14 days'),
('Cocktail Curator', 'View 25 cocktail recipes', 'exploration', 'weekly', 'hard', 350, 3, NULL, 'recipe_view', 25, 'albums-outline', '#9C27B0', NOW() + INTERVAL '21 days'),
('Menu Browser', 'View 10 cocktail recipes', 'exploration', 'weekly', 'easy', 120, 1, NULL, 'recipe_view', 10, 'list-outline', '#4CAF50', NOW() + INTERVAL '28 days'),
('Drink Detective', 'View 20 cocktail recipes', 'exploration', 'weekly', 'medium', 280, 3, NULL, 'recipe_view', 20, 'search-outline', '#FF9800', NOW() + INTERVAL '35 days'),
('Recipe Enthusiast', 'View 30 cocktail recipes', 'exploration', 'weekly', 'hard', 400, 4, NULL, 'recipe_view', 30, 'heart-outline', '#E91E63', NOW() + INTERVAL '42 days'),
('Curious Mixologist', 'View 8 cocktail recipes', 'exploration', 'weekly', 'easy', 100, NULL, NULL, 'recipe_view', 8, 'eye-outline', '#607D8B', NOW() + INTERVAL '49 days'),
('Recipe Hunter', 'View 12 cocktail recipes', 'exploration', 'weekly', 'medium', 160, 2, NULL, 'recipe_view', 12, 'compass-outline', '#795548', NOW() + INTERVAL '56 days'),
('Drink Scholar', 'View 18 cocktail recipes', 'exploration', 'weekly', 'medium', 240, 2, NULL, 'recipe_view', 18, 'school-outline', '#3F51B5', NOW() + INTERVAL '63 days'),
('Library Master', 'View 35 cocktail recipes', 'exploration', 'weekly', 'epic', 500, 5, 'library_master', 'recipe_view', 35, 'book-outline', '#FFD700', NOW() + INTERVAL '70 days'),
('Recipe Rookie', 'View 3 cocktail recipes', 'exploration', 'weekly', 'easy', 50, NULL, NULL, 'recipe_view', 3, 'wine-outline', '#9E9E9E', NOW() + INTERVAL '77 days'),
('Cocktail Connoisseur', 'View 40 cocktail recipes', 'exploration', 'weekly', 'epic', 600, 6, 'connoisseur', 'recipe_view', 40, 'diamond-outline', '#E91E63', NOW() + INTERVAL '84 days'),

-- PROGRESS CHALLENGES (XP earning) - 13 variations
('XP Hunter', 'Earn 100 XP this week', 'progress', 'weekly', 'easy', 75, NULL, NULL, 'xp_earn', 100, 'star-outline', '#9C27B0', NOW() + INTERVAL '7 days'),
('XP Collector', 'Earn 250 XP this week', 'progress', 'weekly', 'medium', 150, 2, NULL, 'xp_earn', 250, 'star-half-outline', '#FF9800', NOW() + INTERVAL '14 days'),
('XP Champion', 'Earn 500 XP this week', 'progress', 'weekly', 'hard', 300, 3, NULL, 'xp_earn', 500, 'star', '#FFD700', NOW() + INTERVAL '21 days'),
('Rising Star', 'Earn 150 XP this week', 'progress', 'weekly', 'easy', 100, 1, NULL, 'xp_earn', 150, 'sunny-outline', '#FFC107', NOW() + INTERVAL '28 days'),
('XP Warrior', 'Earn 400 XP this week', 'progress', 'weekly', 'medium', 250, 3, NULL, 'xp_earn', 400, 'flash-outline', '#E91E63', NOW() + INTERVAL '35 days'),
('Point Master', 'Earn 750 XP this week', 'progress', 'weekly', 'hard', 400, 4, NULL, 'xp_earn', 750, 'trophy-outline', '#9C27B0', NOW() + INTERVAL '42 days'),
('XP Starter', 'Earn 50 XP this week', 'progress', 'weekly', 'easy', 40, NULL, NULL, 'xp_earn', 50, 'play-outline', '#4CAF50', NOW() + INTERVAL '49 days'),
('XP Grinder', 'Earn 300 XP this week', 'progress', 'weekly', 'medium', 180, 2, NULL, 'xp_earn', 300, 'barbell-outline', '#00BCD4', NOW() + INTERVAL '56 days'),
('Experience Expert', 'Earn 600 XP this week', 'progress', 'weekly', 'hard', 350, 4, NULL, 'xp_earn', 600, 'ribbon-outline', '#3F51B5', NOW() + INTERVAL '63 days'),
('XP Legend', 'Earn 1000 XP this week', 'progress', 'weekly', 'epic', 600, 6, 'xp_legend', 'xp_earn', 1000, 'medal-outline', '#FFD700', NOW() + INTERVAL '70 days'),
('Point Pusher', 'Earn 200 XP this week', 'progress', 'weekly', 'easy', 120, 1, NULL, 'xp_earn', 200, 'arrow-up-outline', '#795548', NOW() + INTERVAL '77 days'),
('XP Maximizer', 'Earn 850 XP this week', 'progress', 'weekly', 'epic', 500, 5, NULL, 'xp_earn', 850, 'rocket-outline', '#FF5722', NOW() + INTERVAL '84 days'),

-- STREAK CHALLENGES - 7 variations
('Streak Starter', 'Maintain a 3-day streak', 'progress', 'weekly', 'easy', 100, 1, NULL, 'streak_maintain', 3, 'flame-outline', '#FF5722', NOW() + INTERVAL '7 days'),
('Streak Keeper', 'Maintain a 5-day streak', 'progress', 'weekly', 'medium', 200, 2, NULL, 'streak_maintain', 5, 'flame-outline', '#FF9800', NOW() + INTERVAL '14 days'),
('Streak Master', 'Maintain a 7-day streak', 'progress', 'weekly', 'hard', 400, 4, 'streak_master', 'streak_maintain', 7, 'flame', '#E91E63', NOW() + INTERVAL '21 days'),
('Consistency King', 'Maintain a 4-day streak', 'progress', 'weekly', 'easy', 150, 1, NULL, 'streak_maintain', 4, 'calendar-outline', '#4CAF50', NOW() + INTERVAL '28 days'),
('Daily Dedication', 'Maintain a 6-day streak', 'progress', 'weekly', 'medium', 300, 3, NULL, 'streak_maintain', 6, 'time-outline', '#2196F3', NOW() + INTERVAL '35 days'),
('Habit Builder', 'Maintain a 2-day streak', 'progress', 'weekly', 'easy', 60, NULL, NULL, 'streak_maintain', 2, 'checkmark-outline', '#9E9E9E', NOW() + INTERVAL '42 days'),

-- QUIZ CHALLENGES - 6 variations
('Quiz Starter', 'Get 100% on 1 quiz', 'skill', 'weekly', 'easy', 100, 1, NULL, 'quiz_perfect', 1, 'checkmark-circle-outline', '#4CAF50', NOW() + INTERVAL '7 days'),
('Quiz Pro', 'Get 100% on 2 quizzes', 'skill', 'weekly', 'medium', 200, 2, NULL, 'quiz_perfect', 2, 'checkmark-done-outline', '#FF9800', NOW() + INTERVAL '14 days'),
('Perfect Score', 'Get 100% on 3 quizzes', 'skill', 'weekly', 'hard', 350, 4, 'perfectionist', 'quiz_perfect', 3, 'ribbon-outline', '#8BC34A', NOW() + INTERVAL '21 days'),
('Quiz Master', 'Get 100% on 5 quizzes', 'skill', 'weekly', 'epic', 600, 6, 'quiz_master', 'quiz_perfect', 5, 'trophy-outline', '#FFD700', NOW() + INTERVAL '28 days'),
('Accuracy Ace', 'Get 100% on 4 quizzes', 'skill', 'weekly', 'hard', 450, 5, NULL, 'quiz_perfect', 4, 'analytics-outline', '#9C27B0', NOW() + INTERVAL '35 days')

ON CONFLICT DO NOTHING;

-- Verify the update
SELECT
  frequency,
  COUNT(*) as challenge_count
FROM public.challenges
WHERE expires_at > NOW()
GROUP BY frequency
ORDER BY
  CASE frequency
    WHEN 'weekly' THEN 1
    WHEN 'monthly' THEN 2
  END;
