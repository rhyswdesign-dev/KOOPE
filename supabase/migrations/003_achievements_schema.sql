-- ACHIEVEMENTS SCHEMA MIGRATION
-- Creates tables for tracking user achievements and badges

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lessons', 'recipes', 'streaks', 'social', 'special')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('count', 'streak', 'perfect', 'collection', 'special')),
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  badge_icon TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (read-only for all authenticated users)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON user_achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for achievements table
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_achievements table
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default achievements
INSERT INTO achievements (key, title, description, icon, category, requirement_type, requirement_value, xp_reward, badge_icon, rarity)
VALUES
  -- Lesson Achievements
  ('first_lesson', 'First Steps', 'Complete your first lesson', 'school', 'lessons', 'count', 1, 50, 'medal', 'common'),
  ('lesson_master_5', 'Quick Learner', 'Complete 5 lessons', 'book', 'lessons', 'count', 5, 100, 'medal', 'common'),
  ('lesson_master_10', 'Dedicated Student', 'Complete 10 lessons', 'library', 'lessons', 'count', 10, 200, 'trophy', 'rare'),
  ('lesson_master_25', 'Knowledge Seeker', 'Complete 25 lessons', 'school-outline', 'lessons', 'count', 25, 500, 'trophy', 'epic'),
  ('lesson_master_50', 'Lesson Master', 'Complete 50 lessons', 'star', 'lessons', 'count', 50, 1000, 'trophy', 'legendary'),
  ('perfect_quiz', 'Perfect Score', 'Get 100% on a quiz', 'checkmark-circle', 'lessons', 'perfect', 1, 100, 'ribbon', 'rare'),
  ('perfect_quiz_5', 'Quiz Champion', 'Get 100% on 5 quizzes', 'ribbon-outline', 'lessons', 'perfect', 5, 250, 'ribbon', 'epic'),

  -- Recipe Achievements
  ('first_recipe', 'Recipe Explorer', 'View your first recipe', 'restaurant', 'recipes', 'count', 1, 25, 'medal', 'common'),
  ('recipe_collector_10', 'Recipe Enthusiast', 'View 10 different recipes', 'book-outline', 'recipes', 'count', 10, 100, 'medal', 'rare'),
  ('recipe_collector_25', 'Recipe Connoisseur', 'View 25 different recipes', 'library-outline', 'recipes', 'count', 25, 250, 'trophy', 'epic'),
  ('recipe_collector_50', 'Recipe Master', 'View 50 different recipes', 'medal-outline', 'recipes', 'count', 50, 500, 'trophy', 'legendary'),

  -- Streak Achievements
  ('streak_3', 'Getting Started', 'Maintain a 3-day streak', 'flame', 'streaks', 'streak', 3, 75, 'flame', 'common'),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak', 'flame', 'streaks', 'streak', 7, 200, 'flame', 'rare'),
  ('streak_14', 'Two Week Champion', 'Maintain a 14-day streak', 'flame', 'streaks', 'streak', 14, 400, 'flame', 'epic'),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day streak', 'flame', 'streaks', 'streak', 30, 1000, 'flame', 'legendary'),
  ('streak_100', 'Unstoppable', 'Maintain a 100-day streak', 'flame', 'streaks', 'streak', 100, 5000, 'flame', 'legendary'),

  -- XP Achievements
  ('xp_1000', 'Rising Star', 'Earn 1,000 total XP', 'flash', 'special', 'count', 1000, 100, 'star', 'common'),
  ('xp_5000', 'XP Collector', 'Earn 5,000 total XP', 'flash-outline', 'special', 'count', 5000, 500, 'star', 'rare'),
  ('xp_10000', 'XP Master', 'Earn 10,000 total XP', 'flash', 'special', 'count', 10000, 1000, 'star', 'epic'),
  ('xp_25000', 'XP Legend', 'Earn 25,000 total XP', 'flash', 'special', 'count', 25000, 2500, 'star', 'legendary'),

  -- Special Achievements
  ('bar_visitor', 'Bar Explorer', 'Visit the Bar section', 'beer', 'special', 'count', 1, 50, 'medal', 'common'),
  ('vault_unlock', 'Vault Breaker', 'Unlock a vault recipe', 'key', 'special', 'count', 1, 100, 'key', 'rare'),
  ('module_complete', 'Module Master', 'Complete an entire module', 'folder-open', 'special', 'count', 1, 500, 'trophy', 'epic')
ON CONFLICT (key) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON achievements TO authenticated;
GRANT ALL ON user_achievements TO authenticated;
