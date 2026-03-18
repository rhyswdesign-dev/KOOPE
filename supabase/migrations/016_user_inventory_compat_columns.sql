-- Compatibility migration for inventory writes from older app builds.
-- Some clients still send `brand`; newer flows also rely on `subcategory` and `notes`.
ALTER TABLE user_inventory
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
