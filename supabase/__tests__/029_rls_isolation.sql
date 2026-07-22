-- =====================================================================
-- 029_rls_isolation.sql — manual RLS verification for migration 029
-- =====================================================================
--
-- PURPOSE: proves a second, unrelated authenticated user cannot read,
-- modify, or delete another user's vault rows, and cannot write to the
-- shared recipes catalog, once migration 029 is applied.
--
-- This is NOT wired into CI / vitest — it depends on a live Supabase
-- project with two real auth users and must be run by hand (Supabase
-- SQL Editor or `psql`) against a project where 029 has already been
-- applied. It is deliberately written so a human reviewer can read the
-- expected result next to each query.
--
-- HOW TO RUN:
--   1. Create two throwaway auth users in the target project (Dashboard
--      -> Authentication -> Users -> Add user), or use existing test
--      accounts. Note both UUIDs.
--   2. Fill in :user_a and :user_b below (psql variables) or find/replace
--      the placeholder UUIDs if running in the SQL Editor.
--   3. Run each numbered section in order. Each has an EXPECTED comment.
--   4. This script only SELECTs and attempts writes that MUST fail; it
--      does not mutate real data if RLS is working. If a "should fail"
--      statement instead succeeds, RLS is broken — stop and fix before
--      shipping.
--
-- =====================================================================

-- Fill these in before running (throwaway/test auth.users UUIDs):
-- \set user_a '00000000-0000-0000-0000-000000000001'
-- \set user_b '00000000-0000-0000-0000-000000000002'

-- ---------------------------------------------------------------------
-- SECTION 0 — sanity: RLS is actually enabled on the tables in question
-- EXPECTED: rowsecurity = true for every row returned.
-- ---------------------------------------------------------------------
SELECT tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('recipes', 'user_vault_profiles', 'vault_transactions', 'xp_transactions', 'vault_carts');

-- ---------------------------------------------------------------------
-- SECTION 1 — recipes catalog: public read still works
-- Run as: anon or any authenticated role.
-- EXPECTED: rows come back (catalog is still publicly browsable).
-- ---------------------------------------------------------------------
SELECT count(*) AS recipe_count FROM public.recipes;

-- ---------------------------------------------------------------------
-- SECTION 2 — recipes catalog: authenticated client cannot write
-- Run as: any authenticated (non-service-role) user, e.g. via
-- `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', :'user_a', true);`
-- or by testing through the app's anon/authenticated client, not the
-- service role key.
-- EXPECTED: every statement below FAILS with a policy violation
-- (`new row violates row-level security policy` / 0 rows affected).
-- ---------------------------------------------------------------------
-- INSERT INTO public.recipes (id, name, category, difficulty, prep_time, ingredients, instructions)
--   VALUES ('rls-test-recipe', 'RLS Test', 'classics', 'easy', 1, '[]'::jsonb, ARRAY['n/a']);
-- UPDATE public.recipes SET name = 'hacked' WHERE id = (SELECT id FROM public.recipes LIMIT 1);
-- DELETE FROM public.recipes WHERE id = (SELECT id FROM public.recipes LIMIT 1);

-- ---------------------------------------------------------------------
-- SECTION 3 — vault tables: user A cannot read user B's rows
-- Run authenticated AS user_a (request.jwt.claim.sub = :user_a).
-- EXPECTED: 0 rows returned for user_b's id, even though the row exists
-- (proven by section 4 run as user_b, or by a service-role check).
-- ---------------------------------------------------------------------
-- SELECT * FROM public.user_vault_profiles WHERE user_id = :'user_b';
-- SELECT * FROM public.vault_transactions WHERE user_id = :'user_b';
-- SELECT * FROM public.xp_transactions WHERE user_id = :'user_b';
-- SELECT * FROM public.vault_carts WHERE user_id = :'user_b';

-- ---------------------------------------------------------------------
-- SECTION 4 — vault tables: user A cannot write/delete user B's rows
-- Run authenticated AS user_a.
-- EXPECTED: every statement below FAILS or affects 0 rows.
-- ---------------------------------------------------------------------
-- UPDATE public.user_vault_profiles SET xp_balance = 999999 WHERE user_id = :'user_b';
-- DELETE FROM public.vault_transactions WHERE user_id = :'user_b';
-- INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (:'user_b', 999999, 'rls-test-exploit');

-- ---------------------------------------------------------------------
-- SECTION 5 — vault tables: user A CAN read/write their own rows
-- Run authenticated AS user_a.
-- EXPECTED: succeeds (proves the policy isn't accidentally locking
-- everyone out, only cross-user access).
-- ---------------------------------------------------------------------
-- SELECT * FROM public.user_vault_profiles WHERE user_id = :'user_a';

-- ---------------------------------------------------------------------
-- SECTION 6 — service role retains full access (Edge Functions path)
-- Run with the service_role key (server-side only, never shipped to
-- the client).
-- EXPECTED: succeeds — service role must still be able to fulfill
-- purchases / admin-write the catalog.
-- ---------------------------------------------------------------------
-- SELECT * FROM public.user_vault_profiles WHERE user_id = :'user_a';
-- SELECT * FROM public.user_vault_profiles WHERE user_id = :'user_b';

-- =====================================================================
-- PASS CRITERIA: sections 1, 5, 6 succeed; sections 2, 3, 4 fail/return
-- zero rows. If any "should fail" statement succeeds, migration 029 is
-- not correctly enforcing isolation — do not ship until fixed.
-- =====================================================================
