-- Cellar records: collector tracking for high-value bottles (PRO feature).
-- Each row represents one bottle a user has promoted into Cellar Mode.

CREATE TABLE IF NOT EXISTS cellar_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_item_id   TEXT NOT NULL,
  item_name           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url           TEXT,
  brand               TEXT,
  type                TEXT,
  abv                 NUMERIC(5, 2),
  region              TEXT,
  flavor_profile      TEXT[],
  tasting_notes       TEXT,
  serve_guidance      TEXT,
  quantity            TEXT,
  purchase_price      NUMERIC(10, 2),
  valuation_estimate  NUMERIC(10, 2),
  drinking_window_start TEXT,
  drinking_window_end TEXT,
  cellar_notes        TEXT,

  UNIQUE (user_id, inventory_item_id)
);

-- Automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_cellar_records_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cellar_records_updated_at
  BEFORE UPDATE ON cellar_records
  FOR EACH ROW EXECUTE FUNCTION update_cellar_records_updated_at();

-- Row-level security: users can only read/write their own records
ALTER TABLE cellar_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cellar_records_select_own"
  ON cellar_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cellar_records_insert_own"
  ON cellar_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cellar_records_update_own"
  ON cellar_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cellar_records_delete_own"
  ON cellar_records FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS cellar_records_user_id_idx ON cellar_records (user_id);
