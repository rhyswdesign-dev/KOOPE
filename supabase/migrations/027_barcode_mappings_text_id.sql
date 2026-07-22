-- Widen bottle_barcode_mappings.bottle_id from UUID to TEXT.
--
-- The scan pipeline is being changed so the community-voted winner for a
-- barcode (this table) is checked as part of the *primary* lookup path,
-- not just the correction flow. Locally-known bottles (src/data/spiritsDatabase.ts)
-- use string slug ids (e.g. 'tanqueray-london-dry'), not UUIDs — only
-- spirits_cache rows have real UUIDs. A UUID-typed bottle_id would reject
-- votes for the common case (a locally-known bottle), so this widens the
-- column to TEXT, which can hold either a slug or a stringified UUID.
--
-- The composite primary key already does COALESCE(bottle_id::TEXT, 'unknown'),
-- so widening to TEXT is a safe, non-breaking change to the key shape.

ALTER TABLE bottle_barcode_mappings
  ALTER COLUMN bottle_id TYPE TEXT USING bottle_id::TEXT;

-- Recreate both RPCs with a TEXT parameter (Postgres does not allow silently
-- widening a function's parameter type — CREATE OR REPLACE is required).

CREATE OR REPLACE FUNCTION submit_weighted_correction(
  p_user_id UUID,
  p_barcode TEXT,
  p_correct_bottle_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accuracy DECIMAL(4,3);
  v_weight DECIMAL(4,3);
BEGIN
  SELECT COALESCE(accuracy_score, 0.500) INTO v_accuracy
  FROM user_correction_stats
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_accuracy := 0.500;
    INSERT INTO user_correction_stats (user_id, accuracy_score)
    VALUES (p_user_id, 0.500)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  v_weight := v_accuracy;

  INSERT INTO bottle_barcode_mappings (barcode, bottle_id, vote_count, voter_count, last_updated)
  VALUES (p_barcode, p_correct_bottle_id, v_weight, 1, now())
  ON CONFLICT (barcode, COALESCE(bottle_id::TEXT, 'unknown'))
  DO UPDATE SET
    vote_count = bottle_barcode_mappings.vote_count + v_weight,
    voter_count = bottle_barcode_mappings.voter_count + 1,
    last_updated = now();

  INSERT INTO user_correction_stats (user_id, total_corrections, accuracy_score)
  VALUES (p_user_id, 1, 0.500)
  ON CONFLICT (user_id) DO UPDATE SET
    total_corrections = user_correction_stats.total_corrections + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION get_barcode_winner(p_barcode TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT bottle_id
  FROM bottle_barcode_mappings
  WHERE barcode = p_barcode
  ORDER BY vote_count DESC
  LIMIT 1;
$$;
