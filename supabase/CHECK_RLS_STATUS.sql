-- Check RLS and table details
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
