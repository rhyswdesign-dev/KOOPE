-- VAULT RPC FUNCTIONS
-- Database functions for atomic vault operations

-- Function to decrement vault item stock atomically
CREATE OR REPLACE FUNCTION decrement_vault_item_stock(item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_current_stock INTEGER;
  v_result JSONB;
BEGIN
  -- Get current stock and lock the row
  SELECT current_stock INTO v_current_stock
  FROM vault_items
  WHERE id = item_id
  FOR UPDATE;

  -- Check if item exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'item_not_found'
    );
  END IF;

  -- Check if stock is available
  IF v_current_stock <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'out_of_stock',
      'current_stock', v_current_stock
    );
  END IF;

  -- Decrement stock
  UPDATE vault_items
  SET
    current_stock = current_stock - 1,
    updated_at = NOW()
  WHERE id = item_id;

  -- Return success with new stock level
  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_current_stock - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate booster for a user
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
  v_result JSONB;
BEGIN
  -- Calculate expiration time
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  -- Update user vault profile with active booster
  UPDATE user_vault_profiles
  SET
    booster_type = p_booster_type,
    booster_multiplier = p_multiplier,
    booster_expires_at = v_expires_at,
    booster_remaining_uses = p_remaining_uses,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'booster_type', p_booster_type,
    'multiplier', p_multiplier,
    'expires_at', v_expires_at,
    'remaining_uses', p_remaining_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and expire boosters (called periodically or on XP award)
CREATE OR REPLACE FUNCTION check_booster_expiry(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booster_expires_at TIMESTAMPTZ;
  v_remaining_uses INTEGER;
BEGIN
  -- Get booster info
  SELECT booster_expires_at, booster_remaining_uses
  INTO v_booster_expires_at, v_remaining_uses
  FROM user_vault_profiles
  WHERE user_id = p_user_id;

  -- Check if booster has expired
  IF v_booster_expires_at IS NOT NULL AND v_booster_expires_at < NOW() THEN
    -- Clear expired booster
    UPDATE user_vault_profiles
    SET
      booster_type = NULL,
      booster_multiplier = NULL,
      booster_expires_at = NULL,
      booster_remaining_uses = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN true; -- Booster was expired and cleared
  END IF;

  -- Check if use-based booster is depleted
  IF v_remaining_uses IS NOT NULL AND v_remaining_uses <= 0 THEN
    -- Clear depleted booster
    UPDATE user_vault_profiles
    SET
      booster_type = NULL,
      booster_multiplier = NULL,
      booster_expires_at = NULL,
      booster_remaining_uses = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN true; -- Booster was depleted and cleared
  END IF;

  RETURN false; -- Booster is still active
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement booster uses (called when XP is awarded with a use-based booster)
CREATE OR REPLACE FUNCTION decrement_booster_uses(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_vault_profiles
  SET
    booster_remaining_uses = CASE
      WHEN booster_remaining_uses IS NOT NULL THEN booster_remaining_uses - 1
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND booster_remaining_uses > 0;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION decrement_vault_item_stock(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booster_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_booster_uses(UUID) TO authenticated;
