-- Run this first to check your auth setup
SELECT
  'auth.uid() type check' as test,
  pg_typeof(auth.uid()) as uid_type;

-- Check if auth schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'auth';

-- Check auth.users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name = 'id';
