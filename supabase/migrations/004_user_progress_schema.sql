-- USER PROGRESS SCHEMA MIGRATION
-- Creates tables for tracking user lesson/module completion and quiz scores

-- Create user_lesson_progress table
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  module_id TEXT,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Performance metrics
  items_attempted INTEGER NOT NULL DEFAULT 0,
  items_correct INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5, 2) DEFAULT 0,
  best_accuracy NUMERIC(5, 2) DEFAULT 0,

  -- XP and rewards
  xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,

  -- Attempts tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, lesson_id)
);

-- Create user_module_progress table
CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,

  -- Completion tracking
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Progress metrics
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  completion_percentage NUMERIC(5, 2) DEFAULT 0,

  -- XP tracking
  total_xp_earned INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, module_id)
);

-- Create user_quiz_attempts table (detailed attempt history)
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,

  -- Attempt details
  items_attempted INTEGER NOT NULL,
  items_correct INTEGER NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL,

  -- XP awarded
  xp_earned INTEGER NOT NULL DEFAULT 0,

  -- Time metrics
  time_spent_seconds INTEGER,

  -- Attempt metadata
  is_perfect BOOLEAN NOT NULL DEFAULT false,
  is_best_score BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for querying user attempts
  CONSTRAINT fk_lesson_progress
    FOREIGN KEY (user_id, lesson_id)
    REFERENCES user_lesson_progress(user_id, lesson_id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_module_id ON user_lesson_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_completed ON user_lesson_progress(user_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module_id ON user_module_progress(module_id);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_lesson_id ON user_quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_attempted_at ON user_quiz_attempts(attempted_at DESC);

-- Enable RLS
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_lesson_progress
CREATE POLICY "Users can view their own lesson progress"
  ON user_lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson progress"
  ON user_lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson progress"
  ON user_lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_module_progress
CREATE POLICY "Users can view their own module progress"
  ON user_module_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own module progress"
  ON user_module_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module progress"
  ON user_module_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_quiz_attempts
CREATE POLICY "Users can view their own quiz attempts"
  ON user_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON user_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger for user_lesson_progress table
CREATE TRIGGER update_user_lesson_progress_updated_at
  BEFORE UPDATE ON user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_module_progress table
CREATE TRIGGER update_user_module_progress_updated_at
  BEFORE UPDATE ON user_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update module progress when lesson is completed
CREATE OR REPLACE FUNCTION update_module_progress_on_lesson_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_module_id TEXT;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
BEGIN
  -- Only proceed if lesson was just completed
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    -- Get module_id from lesson
    SELECT module_id INTO v_module_id
    FROM lessons
    WHERE id = NEW.lesson_id;

    IF v_module_id IS NOT NULL THEN
      -- Count total lessons in module
      SELECT COUNT(*) INTO v_total_lessons
      FROM lessons
      WHERE module_id = v_module_id;

      -- Count completed lessons by user in module
      SELECT COUNT(*) INTO v_completed_lessons
      FROM user_lesson_progress
      WHERE user_id = NEW.user_id
        AND module_id = v_module_id
        AND is_completed = true;

      -- Update or insert module progress
      INSERT INTO user_module_progress (
        user_id,
        module_id,
        lessons_completed,
        total_lessons,
        completion_percentage,
        is_completed,
        completed_at,
        total_xp_earned
      )
      VALUES (
        NEW.user_id,
        v_module_id,
        v_completed_lessons,
        v_total_lessons,
        (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100,
        v_completed_lessons >= v_total_lessons,
        CASE WHEN v_completed_lessons >= v_total_lessons THEN NOW() ELSE NULL END,
        NEW.total_xp
      )
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET
        lessons_completed = v_completed_lessons,
        total_lessons = v_total_lessons,
        completion_percentage = (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100,
        is_completed = v_completed_lessons >= v_total_lessons,
        completed_at = CASE WHEN v_completed_lessons >= v_total_lessons THEN NOW() ELSE user_module_progress.completed_at END,
        total_xp_earned = user_module_progress.total_xp_earned + NEW.xp_earned,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update module progress
CREATE TRIGGER trigger_update_module_progress
  AFTER INSERT OR UPDATE ON user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_progress_on_lesson_complete();

-- Grant necessary permissions
GRANT ALL ON user_lesson_progress TO authenticated;
GRANT ALL ON user_module_progress TO authenticated;
GRANT ALL ON user_quiz_attempts TO authenticated;
