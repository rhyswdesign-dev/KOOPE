-- =====================================================================
-- 026_dedupe_blast_radius.sql — read-only check for migration 026's
-- one-time challenge dedupe DELETE
-- =====================================================================
--
-- PURPOSE (Phase 0.9 guardrail): migration 026_challenge_rotation_recovery.sql
-- (lines 10-22) deleted duplicate `challenges` rows (same title+frequency,
-- keeping only the newest by expires_at/updated_at/created_at/id) to add a
-- UNIQUE(title, frequency) constraint. `user_challenge_progress.challenge_id`
-- has `REFERENCES public.challenges(id) ON DELETE CASCADE`
-- (001_challenges_schema.sql:42) — so any user who had progress recorded
-- against one of the *deleted* duplicate rows lost that progress row via
-- cascade, silently, with no reassignment to the surviving row for the
-- same challenge. That DELETE already ran and cannot be undone. This
-- script only tells you the blast radius: whether it actually happened,
-- and roughly how many users it touched.
--
-- This is NOT wired into CI / vitest — read-only, but still needs a live
-- Supabase project with real historical data to mean anything. Run it by
-- hand (Supabase SQL Editor or `psql`) against production. Nothing here
-- writes to any table.
--
-- HOW TO READ THE RESULTS:
--   Section 1 tells you whether Postgres still has the deleted rows'
--   ghost in any audit/log table you may have (most projects don't keep
--   one — if you don't have point-in-time recovery or a WAL-based audit
--   trail covering the day 026 was applied, sections 2-3 are the only
--   signal available; the deleted rows themselves are gone for good).
--   Section 2 estimates possible impact retroactively: it can't prove a
--   user's progress was cascade-deleted (that data no longer exists to
--   query), but it CAN tell you whether the *shape* of the current data
--   is consistent with it having happened — i.e. whether any users today
--   have zero progress rows for challenges they otherwise show engagement
--   with. Treat this as a lower-bound signal, not a precise count.
--
-- =====================================================================

-- ---------------------------------------------------------------------
-- SECTION 1 — does this project have point-in-time recovery / an audit
-- log covering the date 026 was applied? If yes, that's the only way to
-- get an exact answer (query `user_challenge_progress` as of just before
-- the migration ran vs. just after, on a PITR branch/restore).
-- EXPECTED: informational only — no pass/fail. If PITR is available on
-- this project, restoring a branch to just before 026 landed and diffing
-- user_challenge_progress row counts per user is the only way to get an
-- exact (not estimated) blast-radius number.
-- ---------------------------------------------------------------------
SELECT
  current_setting('server_version') AS pg_version,
  now() AS checked_at;

-- ---------------------------------------------------------------------
-- SECTION 2 — current duplicate state: are there still title+frequency
-- collisions today? (Should be zero if the UNIQUE constraint from 026
-- is in place and holding — confirms the dedupe's *end state* is intact,
-- even though it can't tell you what was lost getting here.)
-- EXPECTED: 0 rows. If this returns rows, the unique constraint from 026
-- (challenges_title_frequency_key) is missing or was dropped — a
-- separate, more urgent problem than the historical blast-radius question.
-- ---------------------------------------------------------------------
SELECT title, frequency, COUNT(*) AS duplicate_count
  FROM public.challenges
 GROUP BY title, frequency
HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------
-- SECTION 3 — rough lower-bound signal: users whose earliest
-- user_challenge_progress row is dated AFTER migration 026 ran, but who
-- have activity elsewhere (XP transactions, made_events, etc.) dated
-- BEFORE that date. This does not prove cascade-deleted progress (no way
-- to prove a negative on deleted data) — it flags accounts whose
-- challenge-progress history has a suspicious gap worth a manual look.
--
-- Fill in :migration_026_date before running — check
-- `supabase migration list` or the deploy log for the actual date 026
-- was applied to this project.
-- EXPECTED: informational. A non-empty result is NOT proof of data loss
-- by itself (a user could legitimately have joined/gone quiet around that
-- date) — cross-reference a handful of matches manually before concluding
-- anything.
-- ---------------------------------------------------------------------
-- \set migration_026_date '2026-01-01'  -- <-- fill in the real date

-- SELECT ucp.user_id,
--        MIN(ucp.started_at) AS earliest_progress_row,
--        (SELECT MIN(xt.created_at) FROM public.xp_transactions xt WHERE xt.user_id = ucp.user_id) AS earliest_xp_activity
--   FROM public.user_challenge_progress ucp
--  GROUP BY ucp.user_id
-- HAVING MIN(ucp.started_at) > :'migration_026_date'::timestamptz
--    AND (SELECT MIN(xt.created_at) FROM public.xp_transactions xt WHERE xt.user_id = ucp.user_id) < :'migration_026_date'::timestamptz;

-- ---------------------------------------------------------------------
-- SECTION 4 — going forward: confirm no other migration touching
-- challenges.id deletes without reassigning progress first (the standing
-- rule the workplan sets for this class of bug). Quick manual grep, not a
-- SQL check — run against the repo, not the database:
--
--   grep -rn "DELETE FROM public.challenges" supabase/migrations/
--
-- Any hit after 026 should UPDATE user_challenge_progress.challenge_id to
-- the surviving row *before* the DELETE, never rely on the CASCADE.
-- ---------------------------------------------------------------------
