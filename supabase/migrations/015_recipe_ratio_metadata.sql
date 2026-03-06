-- Recipe ratio metadata for inferred defaults + guided balance editor
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS ratio_profile jsonb,
  ADD COLUMN IF NOT EXISTS ratio_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ratio_editor_state jsonb;

