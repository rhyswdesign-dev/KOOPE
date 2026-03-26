-- spirits_cache
-- Stores AI-generated bottle profiles so each unique bottle is only looked up once.
-- Populated by the spirit-lookup edge function when a scan returns a bottle
-- not found in the local spirits database.

create table if not exists public.spirits_cache (
  id            uuid primary key default gen_random_uuid(),

  -- Normalised lookup key: lowercase bottle name stripped of extra whitespace
  lookup_key    text not null unique,

  -- Core identity
  name          text not null,
  brand         text not null,
  spirit_type   text not null,   -- gin | vodka | rum | whiskey | tequila | mezcal | brandy | liqueur | other
  abv           numeric(5,2),

  -- Price
  price_tier    text,            -- budget | mid-range | premium | ultra-premium
  price_usd_min integer,
  price_usd_max integer,
  price_cad_min integer,
  price_cad_max integer,
  price_gbp_min integer,
  price_gbp_max integer,

  -- Profile
  flavor_profile  text[],        -- e.g. ['Juniper','Citrus','Spice']
  tasting_notes   text,
  origin          text,
  search_terms    text[],

  -- Meta
  confidence      numeric(4,3),  -- 0–1, how confident the LLM was
  source          text default 'claude',
  created_at      timestamptz not null default now(),
  last_hit_at     timestamptz not null default now(),
  hit_count       integer not null default 1
);

-- Index for fast lookup_key queries
create index if not exists spirits_cache_lookup_key_idx on public.spirits_cache (lookup_key);

-- RLS: readable by all authenticated users; only service role can write
alter table public.spirits_cache enable row level security;

create policy "spirits_cache_read"
  on public.spirits_cache for select
  using (true);

-- Edge functions run as service role and bypass RLS, so no insert policy needed.
