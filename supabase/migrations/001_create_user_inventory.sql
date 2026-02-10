-- Create user_inventory table for tracking scanned items
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('spirit', 'ingredient')),
  item_name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_searched_nearby BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Ensure no duplicates per user
  UNIQUE(user_id, item_name)
);

-- Create index for faster queries
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_item_type ON user_inventory(item_type);
CREATE INDEX idx_user_inventory_added_at ON user_inventory(added_at DESC);

-- Enable Row Level Security
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own inventory
CREATE POLICY "Users can view their own inventory"
  ON user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON user_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON user_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON user_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- Create user_scans table for tracking scan usage and brand data
CREATE TABLE IF NOT EXISTS user_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('bottle', 'ingredient', 'recipe')),
  item_name TEXT,
  brand_name TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  clicked_find_stores BOOLEAN DEFAULT FALSE,
  clicked_find_stores_at TIMESTAMP WITH TIME ZONE,
  image_url TEXT,

  -- For brand partnership data
  detection_confidence DECIMAL(3,2),
  user_location TEXT, -- Region code for geographic heatmaps
  added_to_inventory BOOLEAN DEFAULT FALSE
);

-- Create indexes for scan tracking
CREATE INDEX idx_user_scans_user_id ON user_scans(user_id);
CREATE INDEX idx_user_scans_scanned_at ON user_scans(scanned_at DESC);
CREATE INDEX idx_user_scans_brand_name ON user_scans(brand_name);
CREATE INDEX idx_user_scans_scan_type ON user_scans(scan_type);

-- Enable Row Level Security
ALTER TABLE user_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_scans
CREATE POLICY "Users can view their own scans"
  ON user_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
  ON user_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON user_scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to count user scans in current month
CREATE OR REPLACE FUNCTION get_monthly_scan_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_scans
    WHERE user_id = p_user_id
      AND scanned_at >= DATE_TRUNC('month', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_scan_count(UUID) TO authenticated;
