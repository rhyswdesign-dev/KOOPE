-- List all functions in the public schema to see which ones need fixing
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    'ALTER FUNCTION public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') SET search_path = public;' as fix_command
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_updated_at',
    'handle_new_user',
    'decrement_booster_uses',
    'update_updated_at_column',
    'handle_new_user_vault_profile',
    'activate_user_booster',
    'check_booster_expiry'
  )
ORDER BY p.proname;
