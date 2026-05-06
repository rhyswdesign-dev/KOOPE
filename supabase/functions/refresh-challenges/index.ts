/**
 * refresh-challenges — Supabase Edge Function
 *
 * Calls refresh_active_challenges() to upsert the full challenge pool
 * with rolling expiry dates and reset stale user progress.
 *
 * Triggered daily by the GitHub Actions cron workflow
 * (.github/workflows/refresh-challenges.yml).
 * Can also be triggered manually via the Supabase dashboard.
 *
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY (set as a GitHub Actions secret).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.rpc('refresh_active_challenges');

  if (error) {
    console.error('refresh_active_challenges failed:', error.message);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = {
    ok: true,
    refreshed_at: new Date().toISOString(),
  };

  console.log('Challenges refreshed:', result);

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
