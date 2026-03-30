-- ai_response_cache
-- Single cache table for all structured AI features.
-- The ai-proxy edge function checks this before calling OpenAI/Claude,
-- and writes results back after a cache miss so the same question is
-- never sent to an LLM twice.
--
-- NOT used for bartender_chat (conversational — every message is unique).
-- ALL other features (taste_match, remix_engine, optimize_my_bar,
-- flavor_pairing, recipe_generation, hosting_planner, etc.) are cacheable.
--
-- Cache key format: "{feature}:{sorted_normalized_inputs}"
-- Example: "taste_match:spirit=whiskey,tier=premium"
-- Example: "remix_engine:bottle_id=woodford-reserve,type=whiskey"
-- Example: "optimize_my_bar:inventory=campari,gin,sweet-vermouth"

create table if not exists public.ai_response_cache (
  id              uuid primary key default gen_random_uuid(),

  -- Which feature generated this response
  feature         text not null,

  -- Deterministic key derived from normalized inputs (see format above)
  cache_key       text not null,

  -- The full AI response text
  response_text   text not null,

  -- Which model was used (for debugging / cost tracking)
  model           text not null,

  -- Token usage for cost tracking
  prompt_tokens     integer,
  completion_tokens integer,

  -- Metadata
  created_at    timestamptz not null default now(),
  last_hit_at   timestamptz not null default now(),
  hit_count     integer not null default 1,

  unique (feature, cache_key)
);

-- Fast lookup by feature + key
create index if not exists ai_response_cache_feature_key_idx
  on public.ai_response_cache (feature, cache_key);

-- Allow cost analysis queries by feature
create index if not exists ai_response_cache_feature_idx
  on public.ai_response_cache (feature);

-- RLS: all authenticated users can read; only service role writes
alter table public.ai_response_cache enable row level security;

create policy "ai_cache_read"
  on public.ai_response_cache for select
  using (true);

-- ── Usage tracking view ────────────────────────────────────────────────────────
-- Useful for monitoring which features are hitting vs. missing cache,
-- and estimating how much the cache is saving in API costs.

create or replace view public.ai_cache_stats as
select
  feature,
  count(*)                                          as unique_responses,
  sum(hit_count)                                    as total_hits,
  sum(hit_count) - count(*)                         as cache_saves,
  round(
    (sum(hit_count) - count(*))::numeric
    / nullif(sum(hit_count), 0) * 100, 1
  )                                                 as hit_rate_pct,
  sum(prompt_tokens)                                as total_prompt_tokens,
  sum(completion_tokens)                            as total_completion_tokens,
  min(created_at)                                   as oldest_entry,
  max(last_hit_at)                                  as last_used
from public.ai_response_cache
group by feature
order by total_hits desc;
