-- Backup schedule: daily automated export + 30-day retention cleanup.
-- Requires pg_cron and pg_net extensions (both available on Supabase Pro).
-- Run this migration AFTER deploying the scheduled-backup Edge Function.

-- Enable required extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Audit log: record every backup run outcome
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backup_log (
  id          BIGSERIAL PRIMARY KEY,
  backup_date DATE        NOT NULL,
  status      TEXT        NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  manifest    JSONB,
  triggered_by TEXT       NOT NULL DEFAULT 'cron',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_log ENABLE ROW LEVEL SECURITY;
-- Only service role can read/write backup logs
-- No public policy → anon + authenticated users cannot access this table

-- ============================================================
-- Daily backup at 02:00 UTC
-- ============================================================
SELECT cron.schedule(
  'koope-daily-backup',            -- job name (idempotent)
  '0 2 * * *',                     -- every day at 02:00 UTC
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/scheduled-backup',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ============================================================
-- Retention cleanup at 03:00 UTC (delete backups older than 30 days)
-- Implemented as a stored procedure so it can also be called manually.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_backups(retain_days INT DEFAULT 30)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cutoff DATE := CURRENT_DATE - retain_days;
BEGIN
  DELETE FROM public.backup_log WHERE backup_date < cutoff;
  -- Storage cleanup is handled by the Edge Function; this only prunes the log.
  RAISE NOTICE 'Removed backup_log rows older than %', cutoff;
END;
$$;

SELECT cron.schedule(
  'koope-backup-cleanup',
  '0 3 * * *',
  'SELECT public.cleanup_old_backups(30);'
);

-- ============================================================
-- Store Supabase URL + service-role key as GUC settings so the
-- cron SQL above can reference them. Set these in the Supabase
-- dashboard under Settings → Database → Extensions → pg_cron,
-- OR run these manually with the service-role key:
--
--   ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
--
-- These are server-side settings, never exposed to the client.
-- ============================================================

COMMENT ON TABLE public.backup_log IS
  'Audit trail for every scheduled backup run. Service-role access only.';
