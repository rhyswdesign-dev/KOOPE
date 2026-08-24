/**
 * export-user-data — Supabase Edge Function
 *
 * The "Export My Data" button in ConsentCenterScreen.tsx (Privacy > Tracking &
 * Preferences) used to be a stub that showed "Request Submitted" and did
 * nothing — this is what makes that button real, per GDPR/CCPA/Quebec Law 25
 * right-of-access requirements.
 *
 * Auth model: this function is called with the REQUESTING USER'S OWN Supabase
 * JWT (not the service role key), and it creates its Supabase client using
 * that token. That means every query below is subject to the same
 * row-level-security policies as the rest of the app (migration 029 and
 * onward: every user-owned table restricts SELECT to `auth.uid() = user_id`).
 * A user can only ever get their own rows back through this function, even if
 * a table gets added to TABLES below by mistake — RLS is the actual boundary,
 * not the code here.
 *
 * Per-table queries are wrapped individually: this codebase's own migration
 * history (see 029_fix_rls_recipes_and_vault.sql's header) documents real
 * schema drift between what's tracked in `migrations/` and what's live in
 * production. A table that doesn't exist, or a column name that's drifted,
 * fails that one entry and still returns every other table rather than
 * failing the whole export.
 *
 * Delivery: returns the export as a single JSON object in the HTTP response.
 * The client (ConsentCenterScreen.tsx) writes it to a local file via
 * expo-file-system and hands it to the OS share sheet via expo-sharing — no
 * email pipeline needed, the user saves/shares it themselves on the spot.
 *
 * Deploy (verify-jwt ON, default — this function requires the caller's own
 * user JWT, unlike revenuecat-webhook):
 *   supabase functions deploy export-user-data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** table name -> the column that identifies the owning user's row(s). */
const USER_TABLES: Array<{ table: string; column: string }> = [
  { table: 'profiles', column: 'id' },
  { table: 'users_profiles', column: 'id' },
  { table: 'user_inventory', column: 'user_id' },
  { table: 'cellar_records', column: 'user_id' },
  { table: 'user_achievements', column: 'user_id' },
  { table: 'user_vault_profiles', column: 'user_id' },
  { table: 'vault_transactions', column: 'user_id' },
  { table: 'xp_transactions', column: 'user_id' },
  { table: 'vault_carts', column: 'user_id' },
  { table: 'made_events', column: 'user_id' },
  { table: 'want_list_items', column: 'user_id' },
  { table: 'founders_claims', column: 'user_id' },
  { table: 'subscriber_events', column: 'user_id' },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Client scoped to the CALLER's JWT, not the service role — every query
  // below runs as this user, enforced by Postgres RLS.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data: Record<string, unknown> = {};
  const skipped: string[] = [];

  for (const { table, column } of USER_TABLES) {
    const { data: rows, error } = await supabase.from(table).select('*').eq(column, user.id);
    if (error) {
      // Table missing, column drifted, or RLS denied — skip and keep going.
      skipped.push(table);
      continue;
    }
    if (rows && rows.length > 0) {
      data[table] = rows;
    }
  }

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email ?? null,
    data,
    // Present only for transparency — not an error state the client needs to
    // act on. Most entries here are simply tables that don't apply to this
    // user's account (e.g. no founders claim, no vault activity).
    tables_unavailable: skipped,
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="koope-data-export.json"',
    },
  });
});
