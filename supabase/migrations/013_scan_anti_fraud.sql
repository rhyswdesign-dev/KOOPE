-- ============================================================================
-- Migration 013: Scan Correction Anti-Fraud — Weighted Voting System
-- Prevents database poisoning from malicious scan corrections.
-- Uses user accuracy scores to weight votes, making bad-faith actors irrelevant.
-- (Update 3 from strategy addendum)
-- ============================================================================

-- User correction accuracy tracking
-- Starts neutral (0.5), increases with confirmed correct corrections,
-- decreases with confirmed wrong corrections.
CREATE TABLE IF NOT EXISTS user_correction_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_corrections INTEGER NOT NULL DEFAULT 0,
  confirmed_correct INTEGER NOT NULL DEFAULT 0,
  confirmed_wrong INTEGER NOT NULL DEFAULT 0,
  accuracy_score DECIMAL(4,3) NOT NULL DEFAULT 0.500
    CHECK (accuracy_score BETWEEN 0.001 AND 1.000),
  is_flagged BOOLEAN NOT NULL DEFAULT false,      -- Flagged when score < 0.15
  flag_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_correction_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own stats
CREATE POLICY "Users can read own correction stats"
  ON user_correction_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can upsert their own stats (via RPC — not direct)
CREATE POLICY "Service role can manage correction stats"
  ON user_correction_stats FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Bottle barcode vote table
-- Each (barcode, bottle_id) pair accumulates weighted votes.
-- The winner is the bottle_id with the highest vote_count for that barcode.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bottle_barcode_mappings (
  barcode TEXT NOT NULL,
  bottle_id UUID,                    -- NULL = "this is a new/unknown bottle"
  vote_count DECIMAL(8,3) NOT NULL DEFAULT 0,
  voter_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (barcode, COALESCE(bottle_id::TEXT, 'unknown'))
);

CREATE INDEX IF NOT EXISTS bottle_barcode_idx ON bottle_barcode_mappings(barcode);
CREATE INDEX IF NOT EXISTS bottle_barcode_winner_idx ON bottle_barcode_mappings(barcode, vote_count DESC);

ALTER TABLE bottle_barcode_mappings ENABLE ROW LEVEL SECURITY;

-- Service role manages vote tallies
CREATE POLICY "Service role can manage barcode mappings"
  ON bottle_barcode_mappings FOR ALL
  USING (auth.role() = 'service_role');

-- Anyone can read (needed for scanner to look up current winner)
CREATE POLICY "Anyone can read barcode mappings"
  ON bottle_barcode_mappings FOR SELECT
  USING (true);

-- ============================================================================
-- Moderation queue for new bottle submissions from low-accuracy users
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  barcode TEXT,
  bottle_data JSONB NOT NULL,           -- Proposed bottle data
  user_accuracy_score DECIMAL(4,3),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,                     -- Admin user who reviewed
  review_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS scan_moderation_pending_idx ON scan_moderation_queue(status, submitted_at)
  WHERE status = 'pending';

ALTER TABLE scan_moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit to moderation queue"
  ON scan_moderation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read own submissions"
  ON scan_moderation_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage queue"
  ON scan_moderation_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RPC: Submit a weighted correction vote
-- Called by the app after a user corrects a scan.
-- Atomically updates the vote tally and user accuracy tracking.
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_weighted_correction(
  p_user_id UUID,
  p_barcode TEXT,
  p_correct_bottle_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accuracy DECIMAL(4,3);
  v_weight DECIMAL(4,3);
BEGIN
  -- Get user's current accuracy score (default 0.5 for new users)
  SELECT COALESCE(accuracy_score, 0.500) INTO v_accuracy
  FROM user_correction_stats
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_accuracy := 0.500;
    -- Initialize stats row for new user
    INSERT INTO user_correction_stats (user_id, accuracy_score)
    VALUES (p_user_id, 0.500)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  v_weight := v_accuracy;

  -- Upsert vote for this barcode → bottle mapping
  INSERT INTO bottle_barcode_mappings (barcode, bottle_id, vote_count, voter_count, last_updated)
  VALUES (p_barcode, p_correct_bottle_id, v_weight, 1, now())
  ON CONFLICT (barcode, COALESCE(bottle_id::TEXT, 'unknown'))
  DO UPDATE SET
    vote_count = bottle_barcode_mappings.vote_count + v_weight,
    voter_count = bottle_barcode_mappings.voter_count + 1,
    last_updated = now();

  -- Increment total_corrections counter
  INSERT INTO user_correction_stats (user_id, total_corrections, accuracy_score)
  VALUES (p_user_id, 1, 0.500)
  ON CONFLICT (user_id) DO UPDATE SET
    total_corrections = user_correction_stats.total_corrections + 1,
    updated_at = now();
END;
$$;

-- ============================================================================
-- RPC: Get winning bottle for a barcode (highest weighted vote sum)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_barcode_winner(p_barcode TEXT)
RETURNS UUID
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

-- ============================================================================
-- RPC: Update user accuracy after peer validation
-- Called when subsequent users confirm or deny a prior correction.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_correction_accuracy(
  p_user_id UUID,
  p_was_correct BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current DECIMAL(4,3);
  v_new DECIMAL(4,3);
BEGIN
  SELECT accuracy_score INTO v_current
  FROM user_correction_stats
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Bayesian-style update: move score toward 0 (wrong) or 1 (correct)
  IF p_was_correct THEN
    v_new := LEAST(v_current + 0.1, 1.000);
    UPDATE user_correction_stats
    SET accuracy_score = v_new,
        confirmed_correct = confirmed_correct + 1,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    v_new := GREATEST(v_current - 0.2, 0.001);
    UPDATE user_correction_stats
    SET accuracy_score = v_new,
        confirmed_wrong = confirmed_wrong + 1,
        -- Flag user if accuracy drops below 0.15
        is_flagged = (v_new < 0.150),
        flag_reason = CASE WHEN v_new < 0.150 THEN 'Low accuracy score' ELSE flag_reason END,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;
