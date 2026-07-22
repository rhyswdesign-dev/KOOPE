-- Check current status of vault tables and policies

-- 1. Check if tables exist
SELECT
  'TABLES' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  )
ORDER BY table_name;

-- 2. Check RLS status
SELECT
  'RLS STATUS' as check_type,
  tablename as table_name,
  CASE
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  )
ORDER BY tablename;

-- 3. Check existing policies
SELECT
  'POLICIES' as check_type,
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename IN (
  'user_vault_profiles',
  'vault_transactions',
  'xp_transactions',
  'vault_carts'
)
ORDER BY tablename, policyname;

-- 4. Check RPC functions
SELECT
  'RPC FUNCTIONS' as check_type,
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'activate_user_booster',
    'check_booster_expiry',
    'decrement_booster_uses'
  )
ORDER BY routine_name;

-- 5. Check triggers
SELECT
  'TRIGGERS' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_timing || ' ' || event_manipulation as trigger_event
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  )
ORDER BY event_object_table, trigger_name;
