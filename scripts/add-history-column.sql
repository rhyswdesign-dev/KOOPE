-- Add history column to recipes table
-- This column will store historical information about classic cocktails

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS history JSONB;

-- Add comment to document the column
COMMENT ON COLUMN recipes.history IS 'Historical context for classic cocktails including origin, creator, cultural significance, and trivia';

-- Create an index for queries that filter by recipes with history
CREATE INDEX IF NOT EXISTS idx_recipes_has_history ON recipes ((history IS NOT NULL));
