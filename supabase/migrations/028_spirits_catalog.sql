-- spirits_catalog
-- Server-side mirror of src/data/spiritsDatabase.ts (the app's bundled local
-- spirits database). Exists so the bottle-recognize edge function can score
-- OCR/label text against known bottles in the SAME request that calls Google
-- Vision, instead of requiring a separate client round trip after a local
-- (client-side) database match fails. src/data/spiritsDatabase.ts remains the
-- git source of truth; this table is kept in sync via
-- `npm run catalog:sync` (scripts/sync-spirits-catalog.ts).

create table if not exists public.spirits_catalog (
  id            text primary key,       -- matches Spirit.id (kebab-case slug)

  name          text not null,
  brand         text not null,
  spirit_type   text not null,
  abv           numeric(5,2) not null,

  price_tier    text not null,
  price_usd_min integer,
  price_usd_max integer,
  price_cad_min integer,
  price_cad_max integer,
  price_gbp_min integer,
  price_gbp_max integer,

  flavor_profile  text[] not null default '{}',
  tasting_notes   text not null default '',
  origin          text not null default '',
  search_terms    text[] not null default '{}',

  synced_at     timestamptz not null default now()
);

create index if not exists spirits_catalog_type_idx on spirits_catalog(spirit_type);

alter table spirits_catalog enable row level security;

-- Read-only reference data — safe to expose to any authenticated request.
-- Writes only via the service role (the sync script).
create policy "Anyone can read spirits catalog"
  on spirits_catalog for select
  using (true);

create policy "Service role manages spirits catalog"
  on spirits_catalog for all
  using (auth.role() = 'service_role');
