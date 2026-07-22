-- Verify complete vault setup

-- 1. Check tables exist
SELECT 'TABLES' as check_type, tablename, 'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')
ORDER BY tablename;

-- 2. Check RLS is enabled
SELECT 'RLS ENABLED' as check_type, tablename, 
  CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')
ORDER BY tablename;

-- 3. Check policies
SELECT 'POLICIES' as check_type, tablename, policyname, cmd as command
FROM pg_policies
WHERE tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')
ORDER BY tablename, cmd, policyname;

-- 4. Check RPC functions
SELECT 'RPC FUNCTIONS' as check_type, routine_name, 'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('activate_user_booster', 'check_booster_expiry', 'decrement_booster_uses')
ORDER BY routine_name;

-- 5. Summary
SELECT 
  'SUMMARY' as check_type,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' 
   AND tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')) as tables_count,
  (SELECT count(*) FROM pg_policies 
   WHERE tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')) as policies_count,
  (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public'
   AND routine_name IN ('activate_user_booster', 'check_booster_expiry', 'decrement_booster_uses')) as functions_count;
