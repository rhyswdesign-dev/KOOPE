-- Migration 008: Add AI Recipe Generation Support
-- Extends cocktails table to support AI-generated recipes

-- Add AI-specific columns to cocktails table
ALTER TABLE cocktails
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generated_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'expert')),
ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
ADD COLUMN IF NOT EXISTS inventory_snapshot JSONB,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cocktails_ai_generated ON cocktails(is_ai_generated, generated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cocktails_difficulty ON cocktails(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_cocktails_generation_timestamp ON cocktails(generation_timestamp);

-- Row Level Security Policies for AI Recipes

-- Users can view all curated cocktails + their own AI recipes
DROP POLICY IF EXISTS "Users can view their own AI recipes" ON cocktails;
CREATE POLICY "Users can view their own AI recipes"
  ON cocktails FOR SELECT
  USING (
    is_ai_generated = FALSE OR
    (is_ai_generated = TRUE AND generated_by_user_id = auth.uid())
  );

-- Users can insert their own AI recipes
DROP POLICY IF EXISTS "Users can insert their own AI recipes" ON cocktails;
CREATE POLICY "Users can insert their own AI recipes"
  ON cocktails FOR INSERT
  WITH CHECK (
    is_ai_generated = TRUE AND
    generated_by_user_id = auth.uid()
  );

-- Users can update their own AI recipes
DROP POLICY IF EXISTS "Users can update their own AI recipes" ON cocktails;
CREATE POLICY "Users can update their own AI recipes"
  ON cocktails FOR UPDATE
  USING (
    is_ai_generated = TRUE AND
    generated_by_user_id = auth.uid()
  );

-- Users can delete their own AI recipes
DROP POLICY IF EXISTS "Users can delete their own AI recipes" ON cocktails;
CREATE POLICY "Users can delete their own AI recipes"
  ON cocktails FOR DELETE
  USING (
    is_ai_generated = TRUE AND
    generated_by_user_id = auth.uid()
  );

-- Add column comments for documentation
COMMENT ON COLUMN cocktails.is_ai_generated IS 'Whether this recipe was AI-generated (true) or curated (false)';
COMMENT ON COLUMN cocktails.generated_by_user_id IS 'User who generated this AI recipe';
COMMENT ON COLUMN cocktails.difficulty_level IS 'Recipe difficulty: beginner, intermediate, expert';
COMMENT ON COLUMN cocktails.generation_prompt IS 'The full prompt used to generate this recipe';
COMMENT ON COLUMN cocktails.inventory_snapshot IS 'User inventory items at time of generation (JSON array)';
COMMENT ON COLUMN cocktails.ai_model IS 'AI model used for generation (e.g., gpt-4o, gpt-3.5-turbo)';
COMMENT ON COLUMN cocktails.generation_timestamp IS 'When this AI recipe was generated';
