-- Scan rate limiting table
-- Tracks per-user daily scan counts to protect Google Vision API costs.
-- One row per (user, date). Rows older than 7 days are safe to prune.

create table if not exists scan_rate_limits (
  user_id   uuid    not null references auth.users(id) on delete cascade,
  scan_date date    not null default current_date,
  count     integer not null default 0,
  primary key (user_id, scan_date)
);

create index if not exists idx_scan_rate_limits_date
  on scan_rate_limits (scan_date);

-- RLS: users can only read their own row; the edge function uses service role so bypasses RLS
alter table scan_rate_limits enable row level security;

create policy "Users can view own scan counts"
  on scan_rate_limits for select
  using (auth.uid() = user_id);

-- Atomic increment function used by the edge function (runs as service role)
-- Returns the new count after incrementing so the caller can check against the limit.
create or replace function increment_scan_count(p_user_id uuid, p_date date)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into scan_rate_limits (user_id, scan_date, count)
    values (p_user_id, p_date, 1)
  on conflict (user_id, scan_date)
    do update set count = scan_rate_limits.count + 1
  returning count into new_count;

  return new_count;
end;
$$;
