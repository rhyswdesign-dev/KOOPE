-- scan_corrections
-- Records user-submitted corrections when the bottle identification is wrong.
-- Each row captures what we identified, what the user says it actually is,
-- and the image URI so patterns can inform future Vision model improvements.

create table if not exists public.scan_corrections (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- What the app identified (may be null if Claude returned no match)
  identified_name text,
  identified_brand text,

  -- What the user says it actually is
  corrected_name  text not null,
  corrected_brand text,

  -- Optional: the original image URI passed through from the scan session
  image_uri       text,

  -- Anonymous device signal — not linked to auth.users intentionally
  -- so corrections are collected even from signed-out users
  device_hint     text
);

-- Only the service role can read corrections (used for model review)
alter table public.scan_corrections enable row level security;

create policy "service role full access"
  on public.scan_corrections
  for all
  using (auth.role() = 'service_role');

-- Allow inserts from any authenticated or anon client (write-only for app)
create policy "anyone can insert correction"
  on public.scan_corrections
  for insert
  with check (true);
