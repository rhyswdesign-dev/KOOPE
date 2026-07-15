-- Fix vault profile creation by adding RPC function with SECURITY DEFINER
-- This allows the app to create vault profiles when the trigger doesn't fire

CREATE OR REPLACE FUNCTION create_user_vault_profile_rpc(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Insert vault profile (SECURITY DEFINER bypasses RLS)
  INSERT INTO user_vault_profiles (user_id, created_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Return the profile
  RETURN (
    SELECT jsonb_build_object(
      'user_id', user_id,
      'xp_balance', xp_balance,
      'keys_balance', keys_balance,
      'vault_cash_balance', vault_cash_balance,
      'total_xp_earned', total_xp_earned,
      'total_xp_spent', total_xp_spent,
      'total_keys_earned', total_keys_earned,
      'total_keys_spent', total_keys_spent,
      'total_cash_spent', total_cash_spent,
      'unlocked_items', unlocked_items,
      'created_at', created_at,
      'updated_at', updated_at
    )
    FROM user_vault_profiles
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_vault_profile_rpc(UUID) TO authenticated;

SELECT 'Vault profile creation RPC function added' as status;
