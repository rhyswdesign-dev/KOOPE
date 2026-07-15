-- STEP 5: RPC Functions
-- Copy ONLY this SQL

-- Function to activate booster
CREATE OR REPLACE FUNCTION activate_user_booster(
  p_user_id UUID,
  p_booster_type TEXT,
  p_multiplier NUMERIC,
  p_duration_hours INTEGER,
  p_remaining_uses INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  UPDATE user_vault_profiles
  SET
    booster_type = p_booster_type,
    booster_multiplier = p_multiplier,
    booster_expires_at = v_expires_at,
    booster_remaining_uses = p_remaining_uses,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booster_type', p_booster_type,
    'multiplier', p_multiplier,
    'expires_at', v_expires_at,
    'remaining_uses', p_remaining_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check booster expiry
CREATE OR REPLACE FUNCTION check_booster_expiry(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booster_expires_at TIMESTAMPTZ;
  v_remaining_uses INTEGER;
BEGIN
  SELECT booster_expires_at, booster_remaining_uses
  INTO v_booster_expires_at, v_remaining_uses
  FROM user_vault_profiles
  WHERE user_id = p_user_id;

  IF v_booster_expires_at IS NOT NULL AND v_booster_expires_at < NOW() THEN
    UPDATE user_vault_profiles
    SET booster_type = NULL, booster_multiplier = NULL,
        booster_expires_at = NULL, booster_remaining_uses = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  IF v_remaining_uses IS NOT NULL AND v_remaining_uses <= 0 THEN
    UPDATE user_vault_profiles
    SET booster_type = NULL, booster_multiplier = NULL,
        booster_expires_at = NULL, booster_remaining_uses = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement booster uses
CREATE OR REPLACE FUNCTION decrement_booster_uses(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_vault_profiles
  SET booster_remaining_uses = CASE
      WHEN booster_remaining_uses IS NOT NULL THEN booster_remaining_uses - 1
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id AND booster_remaining_uses > 0;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booster_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_booster_uses(UUID) TO authenticated;
