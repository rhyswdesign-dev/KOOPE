/**
 * scheduled-backup — Supabase Edge Function
 *
 * Exports critical user-data tables as NDJSON to Supabase Storage.
 * Called daily by pg_cron (see migration 023_backup_schedule.sql).
 * Can also be triggered manually via the Supabase dashboard.
 *
 * Storage layout:
 *   backups/
 *     daily/
 *       2025-06-01/
 *         profiles.ndjson
 *         user_inventory.ndjson
 *         vault_transactions.ndjson
 *         cellar_records.ndjson
 *         ai_recipes.ndjson
 *         backup_manifest.json
 *
 * Retention: managed by the cron job (deletes folders older than 30 days).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'backups';

// Tables exported in order of importance.
const TABLES = [
  'profiles',
  'user_inventory',
  'vault_transactions',
  'cellar_records',
  'ai_recipes',
  'user_achievements',
  'scan_rate_limits',
] as const;

Deno.serve(async (req) => {
  // Allow manual POST triggers from the dashboard (no auth header required
  // when invoked by pg_cron via net.http_post with the service-role key).
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const folder = `daily/${dateStr}`;

  const results: Record<string, { rows: number; error?: string }> = {};
  const startedAt = new Date().toISOString();

  // Ensure the bucket exists
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});

  for (const table of TABLES) {
    try {
      // Paginate in 1 000-row chunks to stay within memory limits
      let offset = 0;
      const PAGE = 1_000;
      const lines: string[] = [];

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(offset, offset + PAGE - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        for (const row of data) {
          lines.push(JSON.stringify(row));
        }

        if (data.length < PAGE) break;
        offset += PAGE;
      }

      const ndjson = lines.join('\n');
      const path = `${folder}/${table}.ndjson`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([ndjson], { type: 'application/x-ndjson' }), {
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      results[table] = { rows: lines.length };
    } catch (err) {
      results[table] = { rows: 0, error: String(err) };
    }
  }

  // Write manifest
  const manifest = {
    backup_date: dateStr,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    tables: results,
  };

  await supabase.storage
    .from(BUCKET)
    .upload(
      `${folder}/backup_manifest.json`,
      new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
      { upsert: true }
    );

  const hasErrors = Object.values(results).some((r) => r.error);

  return new Response(JSON.stringify(manifest, null, 2), {
    status: hasErrors ? 207 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
