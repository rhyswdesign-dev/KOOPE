-- Kill Switch: global remote config table
-- Controls maintenance mode, message content, and operator notes.
-- Single-row table: id = 'global' is the sentinel row.

CREATE TABLE IF NOT EXISTS public.app_config (
  id                   TEXT PRIMARY KEY DEFAULT 'global',
  kill_switch_enabled  BOOLEAN      NOT NULL DEFAULT false,
  message_title        TEXT         NOT NULL DEFAULT 'Under Maintenance',
  message_body         TEXT         NOT NULL DEFAULT 'We''re making KŌOPE better. Check back soon.',
  support_email        TEXT,
  retry_after_minutes  INTEGER,
  operator_note        TEXT,         -- internal-only note, never sent to client
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by           TEXT
);

-- Seed the single global config row
INSERT INTO public.app_config (id, kill_switch_enabled)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- Row-level security: anonymous users can SELECT, nobody can INSERT/UPDATE/DELETE via anon key.
-- Operators use the Supabase dashboard or service-role key to toggle the switch.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read"
  ON public.app_config
  FOR SELECT
  USING (true);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.app_config IS
  'Global remote config. Row id=''global'' controls kill switch + maintenance messaging.';
COMMENT ON COLUMN public.app_config.kill_switch_enabled IS
  'Set true to block the app and show the maintenance screen for all users.';
COMMENT ON COLUMN public.app_config.operator_note IS
  'Internal note — reason for enabling, ETA, incident number. Never exposed to the app.';
