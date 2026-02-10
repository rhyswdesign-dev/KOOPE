-- Create user_inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('spirit', 'ingredient')),
  item_name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_searched_nearby BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_name ON user_inventory(item_name);

-- Create user_scans table
CREATE TABLE IF NOT EXISTS user_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('bottle', 'ingredient', 'recipe')),
  item_name TEXT,
  brand_name TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicked_find_stores BOOLEAN DEFAULT FALSE,
  clicked_find_stores_at TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  detection_confidence DECIMAL(5,2),
  user_location TEXT,
  added_to_inventory BOOLEAN DEFAULT FALSE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_scans_user_id ON user_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scans_scanned_at ON user_scans(scanned_at);

-- Create cocktails table
CREATE TABLE IF NOT EXISTS cocktails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ingredients TEXT NOT NULL, -- Comma-separated list of ingredients
  instructions TEXT,
  category TEXT,
  glass_type TEXT,
  garnish TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cocktails_name ON cocktails(name);
CREATE INDEX IF NOT EXISTS idx_cocktails_category ON cocktails(category);

-- Create function to get monthly scan count
CREATE OR REPLACE FUNCTION get_monthly_scan_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  scan_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO scan_count
  FROM user_scans
  WHERE user_id = p_user_id
    AND scanned_at >= date_trunc('month', NOW())
    AND scanned_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  RETURN COALESCE(scan_count, 0);
END;
$$;

-- Enable Row Level Security
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktails ENABLE ROW LEVEL SECURITY;

-- Create policies for user_inventory
CREATE POLICY "Users can view their own inventory"
  ON user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own inventory"
  ON user_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON user_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own inventory"
  ON user_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for user_scans
CREATE POLICY "Users can view their own scans"
  ON user_scans FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own scans"
  ON user_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own scans"
  ON user_scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for cocktails (public read, admin write)
CREATE POLICY "Anyone can view cocktails"
  ON cocktails FOR SELECT
  TO authenticated, anon
  USING (true);

-- Note: You'll need to add admin-only policies for cocktails INSERT/UPDATE/DELETE
-- or use the Supabase dashboard to manage cocktail data
