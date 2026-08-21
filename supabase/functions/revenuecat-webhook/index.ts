/**
 * revenuecat-webhook — Supabase Edge Function
 *
 * Receives RevenueCat subscription lifecycle events and records them in
 * public.subscriber_events (migration 037), giving KŌOPE a durable,
 * server-side record of who paid and when. Without this, the only proof a
 * subscription ever existed lives in RevenueCat's dashboard and the store
 * receipt — nothing we own, and nothing that survives losing that account.
 *
 * Explicitly NOT part of live entitlement gating: SubscriptionContext keeps
 * reading tier from the RevenueCat SDK directly. Webhooks retry and can lag,
 * and a gate that waited on one would flicker. This is the ledger, not the gate.
 *
 * Auth: RevenueCat sends the value configured in its dashboard under
 * "Integrations → Webhooks → Authorization header" verbatim in the
 * `Authorization` header. We compare it to the REVENUECAT_WEBHOOK_SECRET
 * secret. This is a shared-secret check, not a signature — it is only as
 * good as the secret's entropy, so generate a long random one.
 *
 * SETUP (RevenueCat dashboard → Integrations → Webhooks):
 *   URL:            https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization:  the same value stored as REVENUECAT_WEBHOOK_SECRET
 *
 * Secrets (set with `supabase secrets set`, never committed):
 *   REVENUECAT_WEBHOOK_SECRET  — shared secret, must match the dashboard
 *   SUPABASE_SERVICE_ROLE_KEY  — provided by the platform
 *   SUPABASE_URL               — provided by the platform
 *
 * Deploy with JWT verification off, since RevenueCat sends its own shared
 * secret rather than a Supabase JWT:
 *   supabase functions deploy revenuecat-webhook --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** RevenueCat's webhook envelope. Only the fields we read are typed. */
interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  store?: string;
  environment?: string;
  period_type?: string;
  price_in_purchased_currency?: number;
  currency?: string;
  event_timestamp_ms?: number;
  expiration_at_ms?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Constant-time string compare. A plain `!==` on a secret leaks its prefix
 * length through response timing; cheap to avoid, so avoid it.
 */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * RevenueCat's app_user_id is our Supabase user id when the app has called
 * Purchases.logIn(), and an anonymous `$RCAnonymousID:...` when it hasn't.
 * Only the former can be stored as user_id; anonymous events are still
 * recorded, attributable later via app_user_id.
 */
function resolveUserId(appUserId: string | undefined): string | null {
  if (!appUserId) return null;
  return UUID_RE.test(appUserId) ? appUserId : null;
}

function msToIso(ms: number | null | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';

  // Fail closed: an unset secret must reject everything, not accept
  // everything. Getting this backwards would make the endpoint a public
  // write into a money-adjacent table.
  if (!expectedSecret || !secretsMatch(authHeader, expectedSecret)) {
    console.warn('revenuecat-webhook: unauthorized request rejected');
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { event?: RevenueCatEvent; api_version?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const event = body?.event;
  if (!event || typeof event !== 'object') {
    return new Response(JSON.stringify({ ok: false, error: 'Missing event object' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const appUserId = event.app_user_id ?? event.original_app_user_id;
  if (!appUserId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing app_user_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : null;

  const row = {
    // RevenueCat always sends an id; synthesize a stable-enough fallback so a
    // malformed event is still recorded rather than dropped on the floor.
    event_id:
      event.id ??
      `${appUserId}:${event.type ?? 'UNKNOWN'}:${event.event_timestamp_ms ?? Date.now()}`,
    user_id: resolveUserId(appUserId),
    app_user_id: appUserId,
    event_type: event.type ?? 'UNKNOWN',
    product_id: event.product_id ?? null,
    entitlement_id: event.entitlement_id ?? entitlementIds?.[0] ?? null,
    entitlement_ids: entitlementIds,
    store: event.store ?? null,
    environment: event.environment ?? null,
    period_type: event.period_type ?? null,
    price_cents:
      typeof event.price_in_purchased_currency === 'number'
        ? Math.round(event.price_in_purchased_currency * 100)
        : null,
    currency: event.currency ?? null,
    event_at: msToIso(event.event_timestamp_ms) ?? new Date().toISOString(),
    expires_at: msToIso(event.expiration_at_ms),
    payload: event,
  };

  // Upsert rather than insert: RevenueCat retries any non-2xx response, so
  // the same event_id can arrive several times. Redelivery must be a no-op.
  const { error } = await supabase
    .from('subscriber_events')
    .upsert(row, { onConflict: 'event_id' });

  if (error) {
    // 500 so RevenueCat retries — a dropped event is a hole in the ledger.
    console.error('revenuecat-webhook: upsert failed:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('revenuecat-webhook: recorded', {
    event_id: row.event_id,
    event_type: row.event_type,
    environment: row.environment,
    attributed: row.user_id !== null,
  });

  return new Response(
    JSON.stringify({ ok: true, event_id: row.event_id, event_type: row.event_type }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
