-- =====================================================================
-- Migration 034: structured ingredients for AI-generated recipes
-- =====================================================================
--
-- cocktails.ingredients has always been a single comma-separated TEXT
-- column (see 001_create_tables.sql), unlike the curated `recipes` table's
-- Ingredient[] shape (name/amount/unit). That mismatch means an
-- AI-generated recipe can't plug into the same inventory-matching or
-- grocery-list machinery the rest of the app uses for curated recipes.
--
-- This is purely additive: a new nullable JSONB column alongside the
-- existing TEXT column. Existing rows (and any code still reading
-- `ingredients` as a string) are untouched — `ingredients_structured` is
-- only populated going forward, by the AI recipe generation service.

ALTER TABLE cocktails
ADD COLUMN IF NOT EXISTS ingredients_structured JSONB;

COMMENT ON COLUMN cocktails.ingredients_structured IS
  'Structured ingredient list ([{name, amount, unit}, ...]) for AI-generated recipes, mirroring the recipes table''s Ingredient[] shape. NULL for curated rows and any recipe generated before this migration — those still only have the legacy comma-separated `ingredients` text column.';
