-- Check vault table policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')
ORDER BY tablename, policyname;
