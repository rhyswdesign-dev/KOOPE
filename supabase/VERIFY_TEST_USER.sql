-- Verify test user exists and check authentication
SELECT
  id,
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE email = 'test@koope.app';

-- Also check if we can authenticate (this won't actually sign in, just checks the user exists)
SELECT
  'Test user exists: ' || email as status
FROM auth.users
WHERE email = 'test@koope.app';
