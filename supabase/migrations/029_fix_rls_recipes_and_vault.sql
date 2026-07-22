-- =====================================================================
-- Migration 029: Lock down Row Level Security on recipes + vault tables
-- =====================================================================
--
-- PLAIN-LANGUAGE SUMMARY (read this before applying):
--
--   Today, two sets of tables in the database have their "door left unlocked."
--
--   1. `recipes` — the shared cocktail catalog. A policy shipped in migration
--      002_create_recipes_table.sql (`USING (true)` + `WITH CHECK (true)`) lets
--      ANY signed-in user INSERT, UPDATE, or DELETE ANY row — i.e. any user could
--      wipe or rewrite the entire recipe catalog for everyone. This migration
--      closes that: everyone can still READ the catalog, but only the backend
--      (the Supabase "service role" your Edge Functions and admin scripts use)
--      can change it. If your live `recipes` table is instead the per-user table
--      (the one with a `user_id` column, from 002_app_data_schema.sql), this
--      migration detects that and instead scopes every write to the row's owner.
--
--   2. Vault / in-app-currency tables (`user_vault_profiles`, `vault_transactions`,
--      `xp_transactions`, `vault_carts`) — created in 006_vault_tables_only.sql
--      with `GRANT ALL ... TO authenticated` and NO row-level security enabled.
--      That means any signed-in user can read and modify every other user's XP,
--      keys, cash balance, and cart. This migration turns on row-level security
--      and restricts each user to only their own rows, while leaving the backend
--      service role full access so payments/fulfillment still work server-side.
--
-- !!! READ THIS BEFORE APPLYING — RISK FLAGGED IN THE audit/sprint-1 REVIEW !!!
--
--   This migration's `recipes` fix has TWO different behaviors depending on
--   whether the LIVE `recipes` table has a `user_id` column, and picking the
--   wrong one SILENTLY BREAKS THE APP:
--
--     - No user_id  -> "shared catalog" branch: everyone keeps public READ
--       access. This is the behavior the plain-language summary above promises.
--     - Has user_id -> "per-user" branch: SELECT becomes OWNER-ONLY
--       (`USING (auth.uid() = user_id)`). If the live table is actually the
--       SHARED catalog and merely happens to have a `user_id` column (e.g. a
--       "created_by" audit column, not an ownership column), this branch will
--       make every user's recipe browsing return ONLY rows they authored —
--       i.e. it HIDES THE CATALOG from everyone else. That is the opposite of
--       what this migration is supposed to do, and it will not throw an error;
--       it will just silently return empty/partial results.
--
--   The Engineering Audit (§3.1) already flags that TWO competing `recipes`
--   migrations exist (002_create_recipes_table.sql, catalog-shaped, no
--   user_id vs. 002_app_data_schema.sql, per-user-shaped, has user_id) and it
--   is NOT knowable from the repo alone which one is live in production.
--
--   THE REVIEWER APPLYING THIS MUST, BEFORE RUNNING IT:
--     1. Run against the LIVE database:
--          SELECT column_name FROM information_schema.columns
--           WHERE table_schema = 'public' AND table_name = 'recipes';
--     2. Confirm which shape is live: no `user_id` => shared catalog (the
--        common case, since the app's `recipesRepo.ts` reads/caches a shared
--        recipe list) vs. has `user_id` => confirm with the table's actual
--        data (do rows belong to many different users, or is `user_id` unused
--        metadata on an otherwise-shared catalog?) which behavior is correct.
--     3. If the live table has `user_id` AND is meant to stay a shared,
--        publicly-browsable catalog, DO NOT apply this file as-is — it needs
--        a manual policy change (e.g. keep public SELECT, only scope
--        INSERT/UPDATE/DELETE to the owner) before it is safe to run.
--
-- WHY THIS IS A SEPARATE, UNAPPLIED FILE:
--   The Engineering Audit (§2.4, §3.1) warns that the tracked migrations do NOT
--   reliably reflect the LIVE database — roughly 30 ad-hoc `.sql` files were run
--   by hand directly against production over time. So DO NOT assume this file's
--   starting point matches production. This file is written defensively (it drops
--   whatever permissive policies currently exist by name-agnostic enumeration and
--   recreates the correct ones), but it must still be reviewed against the live
--   schema before it is applied.
--
-- HOW TO APPLY (founder/architect, after review):
--   Option A (recommended, tracked): `supabase db push` from the repo root with
--     the project linked, so this lands as a numbered migration.
--   Option B (manual): open the Supabase dashboard → SQL Editor, paste this file,
--     run it. Then run 029_VERIFY at the bottom to confirm the result.
--   Before EITHER: take a database backup/snapshot. This changes access control.
--
-- WHAT TO CHECK AFTER APPLYING:
--   - The app can still READ recipes for a signed-out AND signed-in user.
--   - The app can still read/write the CURRENT user's own vault/XP rows.
--   - A user can NO LONGER read another user's vault rows, and can no longer
--     write to the recipe catalog from the client SDK.
--   - Edge Functions (which use the service role key) can still write everything.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. RECIPES
--    Branch on whether the live `recipes` table has a `user_id` column.
--    - No user_id  => shared catalog: public read, service-role-only writes.
--    - Has user_id => per-user table: owner-scoped read + write.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  pol        record;
  has_user_id boolean;
BEGIN
  IF to_regclass('public.recipes') IS NULL THEN
    RAISE NOTICE 'public.recipes does not exist; skipping recipes RLS fix.';
    RETURN;
  END IF;

  -- Make sure RLS is actually enforced.
  EXECUTE 'ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY';

  -- Drop EVERY existing policy on recipes so no permissive `USING (true)`
  -- policy can survive under a name we did not anticipate.
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recipes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recipes', pol.policyname);
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'user_id'
  ) INTO has_user_id;

  IF has_user_id THEN
    -- Per-user recipes table: owner-scoped access.
    EXECUTE $p$
      CREATE POLICY "recipes_select_own" ON public.recipes
        FOR SELECT USING (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "recipes_insert_own" ON public.recipes
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "recipes_update_own" ON public.recipes
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $p$;
    EXECUTE $p$
      CREATE POLICY "recipes_delete_own" ON public.recipes
        FOR DELETE USING (auth.uid() = user_id)
    $p$;
    RAISE NOTICE 'recipes: applied owner-scoped policies (user_id column present).';
  ELSE
    -- Shared catalog: everyone reads, only the backend service role writes.
    EXECUTE $p$
      CREATE POLICY "recipes_public_read" ON public.recipes
        FOR SELECT TO public USING (true)
    $p$;
    EXECUTE $p$
      CREATE POLICY "recipes_service_write" ON public.recipes
        FOR ALL TO service_role USING (true) WITH CHECK (true)
    $p$;
    RAISE NOTICE 'recipes: applied catalog policies (public read, service-role write).';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. VAULT / IN-APP-CURRENCY TABLES
--    All four have a `user_id UUID` column referencing auth.users(id).
--    Enable RLS, drop any pre-existing (possibly permissive) policies,
--    then restrict each authenticated user to their own rows. The backend
--    service role retains full access for payments/fulfillment.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  tbl  text;
  pol  record;
  vault_tables text[] := ARRAY[
    'user_vault_profiles',
    'vault_transactions',
    'xp_transactions',
    'vault_carts'
  ];
BEGIN
  FOREACH tbl IN ARRAY vault_tables LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE NOTICE '%: table missing, skipping.', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Remove every existing policy so no `USING (true)` leftover survives.
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    -- Owner-scoped access for authenticated users. user_id is UUID and
    -- auth.uid() returns UUID, so no text cast is needed here.
    EXECUTE format($p$
      CREATE POLICY "%1$s_select_own" ON public.%1$I
        FOR SELECT TO authenticated USING (auth.uid() = user_id)
    $p$, tbl);
    EXECUTE format($p$
      CREATE POLICY "%1$s_insert_own" ON public.%1$I
        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)
    $p$, tbl);
    EXECUTE format($p$
      CREATE POLICY "%1$s_update_own" ON public.%1$I
        FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $p$, tbl);
    EXECUTE format($p$
      CREATE POLICY "%1$s_delete_own" ON public.%1$I
        FOR DELETE TO authenticated USING (auth.uid() = user_id)
    $p$, tbl);

    -- Backend service role keeps full access (Edge Functions, admin scripts).
    EXECUTE format($p$
      CREATE POLICY "%1$s_service_all" ON public.%1$I
        FOR ALL TO service_role USING (true) WITH CHECK (true)
    $p$, tbl);

    RAISE NOTICE '%: RLS enabled, owner-scoped + service-role policies applied.', tbl;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- 029_VERIFY (run manually AFTER applying; not part of the migration).
-- Expected: recipes has rowsecurity = true; each vault table has
-- rowsecurity = true and its four *_own policies plus one *_service_all.
-- =====================================================================
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public'
--    AND tablename IN ('recipes','user_vault_profiles','vault_transactions','xp_transactions','vault_carts');
--
-- SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN ('recipes','user_vault_profiles','vault_transactions','xp_transactions','vault_carts')
--  ORDER BY tablename, policyname;
