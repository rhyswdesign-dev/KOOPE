-- Referral backend schema for KOOPE
-- Run in Supabase SQL editor if referral tables are not yet provisioned.

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_codes_user_id on public.referral_codes(user_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null,
  referred_user_id uuid,
  referred_username text,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_referrer_user_id on public.referrals(referrer_user_id);
create index if not exists idx_referrals_referred_user_id on public.referrals(referred_user_id);
