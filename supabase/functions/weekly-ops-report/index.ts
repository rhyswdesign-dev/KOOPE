/**
 * weekly-ops-report — Supabase Edge Function
 *
 * Aggregates the last 7 days of activity (signups, makes, scans, price
 * spotting) and posts a summary to Slack via an Incoming Webhook.
 *
 * Triggered weekly by the GitHub Actions cron workflow
 * (.github/workflows/weekly-ops-report.yml).
 * Can also be triggered manually via the Supabase dashboard.
 *
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY (same pattern as
 * refresh-challenges / scheduled-backup).
 *
 * Scan-related sections degrade gracefully (rather than failing the
 * whole report) if `scan_events` (migration 032) hasn't been applied yet.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WINDOW_DAYS = 7;
const ROW_CAP = 5_000; // generous for pre-launch/early-growth volume

interface MadeEventRow {
  recipe_id: string;
  user_id: string;
}

interface ScanEventRow {
  brand_name: string | null;
  bottle_name: string;
  context: 'store' | 'home' | 'gift' | 'unknown';
  outcome: 'owned' | 'wanted' | 'passed' | null;
}

function topN(counts: Record<string, number>, n: number): Array<[string, number]> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function formatTopList(entries: Array<[string, number]>): string {
  if (entries.length === 0) return 'none';
  return entries.map(([name, count]) => `${name} (${count})`).join(' · ');
}

function summarizeMadeEvents(rows: MadeEventRow[]) {
  const byRecipe: Record<string, number> = {};
  const users = new Set<string>();
  for (const row of rows) {
    byRecipe[row.recipe_id] = (byRecipe[row.recipe_id] || 0) + 1;
    users.add(row.user_id);
  }
  return {
    total: rows.length,
    uniqueUsers: users.size,
    top: topN(byRecipe, 5),
  };
}

function summarizeScanEvents(rows: ScanEventRow[]) {
  const byBrand: Record<string, number> = {};
  const byContext: Record<string, number> = { store: 0, home: 0, gift: 0, unknown: 0 };
  let wanted = 0;
  let resolved = 0;

  for (const row of rows) {
    const label = row.brand_name || row.bottle_name;
    byBrand[label] = (byBrand[label] || 0) + 1;
    byContext[row.context] = (byContext[row.context] || 0) + 1;
    if (row.outcome) {
      resolved += 1;
      if (row.outcome === 'wanted') wanted += 1;
    }
  }

  const total = rows.length;
  const pct = (n: number) => (total > 0 ? Math.round((100 * n) / total) : 0);

  return {
    total,
    contextPct: {
      store: pct(byContext.store),
      home: pct(byContext.home),
      gift: pct(byContext.gift),
    },
    wantConversionPct: resolved > 0 ? Math.round((100 * wanted) / resolved) : 0,
    topBrands: topN(byBrand, 5),
  };
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey, {
    auth: { persistSession: false },
  });

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rangeLabel = `${since.slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}`;

  const lines: string[] = [`*KŌOPE Weekly Report* — ${rangeLabel}`];

  // Growth: new signups
  const { count: newSignups, error: signupsError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  lines.push('');
  lines.push('*Growth*');
  lines.push(
    signupsError
      ? `• new signups: unavailable (${signupsError.message})`
      : `• ${newSignups ?? 0} new signups`,
  );

  // Made It
  const { data: madeRows, error: madeError } = await supabase
    .from('made_events')
    .select('recipe_id, user_id')
    .gte('created_at', since)
    .limit(ROW_CAP);

  lines.push('');
  lines.push('*Made It*');
  if (madeError) {
    lines.push(`• unavailable (${madeError.message})`);
  } else {
    const made = summarizeMadeEvents((madeRows ?? []) as MadeEventRow[]);
    lines.push(`• ${made.total} drinks made by ${made.uniqueUsers} unique users`);
    lines.push(`• top: ${formatTopList(made.top)}`);
  }

  // Scans (degrades gracefully if scan_events / migration 032 isn't live yet)
  const { data: scanRows, error: scanError } = await supabase
    .from('scan_events')
    .select('brand_name, bottle_name, context, outcome')
    .gte('created_at', since)
    .limit(ROW_CAP);

  lines.push('');
  lines.push('*Scans*');
  if (scanError) {
    lines.push(
      `• unavailable — ${
        scanError.message.includes('scan_events')
          ? 'migration 032 (scan_events) not applied yet'
          : scanError.message
      }`,
    );
  } else {
    const scans = summarizeScanEvents((scanRows ?? []) as ScanEventRow[]);
    lines.push(`• ${scans.total} scans logged`);
    if (scans.total > 0) {
      lines.push(
        `• context: ${scans.contextPct.store}% store · ${scans.contextPct.home}% home · ${scans.contextPct.gift}% gift`,
      );
      lines.push(`• want-conversion: ${scans.wantConversionPct}%`);
      lines.push(`• top scanned: ${formatTopList(scans.topBrands)}`);
    }
  }

  // Price spotting
  const { count: pricesLogged, error: pricesError } = await supabase
    .from('spotted_prices')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  lines.push('');
  lines.push('*Price Spotting*');
  lines.push(
    pricesError
      ? `• unavailable (${pricesError.message})`
      : `• ${pricesLogged ?? 0} new prices logged by the community`,
  );

  // All-time popularity proxy (spirits_cache has no weekly delta, so this
  // is cumulative, not "this week" — labeled as such to avoid confusion).
  const { data: popularRows, error: popularError } = await supabase
    .from('spirits_cache')
    .select('name, hit_count')
    .order('hit_count', { ascending: false })
    .limit(5);

  lines.push('');
  lines.push('*All-Time Popularity* (spirits_cache, cumulative — not a weekly delta)');
  if (popularError) {
    lines.push(`• unavailable (${popularError.message})`);
  } else {
    const popular: Array<[string, number]> = (popularRows ?? []).map((r: any) => [
      r.name,
      r.hit_count ?? 0,
    ]);
    lines.push(`• ${formatTopList(popular)}`);
  }

  const text = lines.join('\n');

  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  let slackOk = true;
  let slackError: string | undefined;

  if (slackWebhookUrl) {
    try {
      const slackResponse = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!slackResponse.ok) {
        slackOk = false;
        slackError = `Slack webhook returned ${slackResponse.status}`;
      }
    } catch (error) {
      slackOk = false;
      slackError = error instanceof Error ? error.message : String(error);
    }
  } else {
    slackOk = false;
    slackError = 'SLACK_WEBHOOK_URL not configured';
  }

  const result = {
    ok: slackOk,
    slack_error: slackError,
    report: text,
    generated_at: new Date().toISOString(),
  };

  console.log('Weekly ops report:', result);

  return new Response(JSON.stringify(result), {
    status: slackOk ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
});
