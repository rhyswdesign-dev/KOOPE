# Backup & Recovery Runbook

## Architecture overview

| Layer | What | Where | Frequency |
|-------|------|-------|-----------|
| **Platform backup** | Full Postgres snapshot (Supabase Pro) | Supabase-managed S3 | Daily (7-day PITR on Pro, 30-day on Enterprise) |
| **Export backup** | NDJSON table dumps | `backups/daily/<date>/` in Supabase Storage | Daily at 02:00 UTC (pg_cron → Edge Function) |
| **Audit log** | Backup run outcomes | `public.backup_log` table | Each run |

**Retention policy:** 30 days of export backups. Supabase Pro provides 7-day PITR.

---

## Daily backup verification (< 2 minutes)

1. Open [Supabase dashboard](https://app.supabase.com) → your project.
2. Go to **Storage → backups → daily**.
3. Confirm a folder for today's date exists with a `backup_manifest.json`.
4. Click the manifest — check `"status"` for each table. Any `"error"` key = investigate.

Alternatively, query the audit log:

```sql
SELECT backup_date, status, created_at
FROM public.backup_log
ORDER BY created_at DESC
LIMIT 7;
```

---

## Manual trigger (run a backup right now)

```bash
curl -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-backup" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response 200 = success. 207 = partial (some tables failed, check manifest). 401 = wrong key.

---

## Restore scenarios

### Scenario A: Accidental row deletion (< 1 table, < 30 rows)

**Use:** Supabase PITR (fastest, point-in-time precision).

1. Go to **Supabase dashboard → Settings → Backups**.
2. Click **Restore** → select a timestamp before the incident.
3. Supabase spins up a recovery instance. Download / query what you need.
4. Insert the missing rows back into production.

**Time:** ~10–20 minutes.

---

### Scenario B: Bad migration (schema corruption)

**Use:** PITR — restore to the commit before the migration was applied.

1. Identify the exact UTC timestamp of the bad migration run (check your deploy logs).
2. PITR restore to 1 minute before that timestamp.
3. Extract the affected schema and data from the recovery instance.
4. Write a corrective migration to fix production.
5. Re-deploy with the corrected migration.

**Time:** ~30–60 minutes.

---

### Scenario C: Bulk data loss (entire table wiped)

**Use:** Export backup (NDJSON) — faster than PITR for a single table.

1. Find the most recent clean backup in Storage: `backups/daily/<date>/`.
2. Download `<table>.ndjson`.
3. Parse and re-insert via psql or a script:

```bash
# Using psql with \copy
psql $DATABASE_URL -c "\copy <table> FROM '<file>.ndjson' (FORMAT text)"
```

Or use a restore script:

```typescript
// scripts/restore-table.ts
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const rows = fs.readFileSync('profiles.ndjson', 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map(JSON.parse);

const { error } = await supabase.from('profiles').upsert(rows, { onConflict: 'id' });
if (error) console.error(error);
else console.log(`Restored ${rows.length} rows`);
```

**Time:** ~15–30 minutes depending on table size.

---

### Scenario D: Full disaster (database destroyed)

**Use:** PITR full restore.

1. Contact Supabase support immediately if dashboard is inaccessible.
2. Otherwise, use **Settings → Backups → Restore** with the most recent snapshot.
3. Update connection strings if the project URL changes.
4. Re-deploy the application.

**Time:** ~1–2 hours. **RTO target: 2 hours. RPO target: 24 hours.**

---

## Monthly restore test (critical — do this)

> "An untested backup is not a backup."

1. Note today's date and pick last night's backup folder.
2. Download `profiles.ndjson` from Storage.
3. Count the rows: `wc -l profiles.ndjson` — must be > 0.
4. Pick 3 random rows. Verify they match production via Supabase Table Editor.
5. Record the result in your ops log: date, row count, pass/fail.
6. If fail → investigate immediately before the next deploy.

---

## Failure cases

| Failure | Detection | Action |
|---------|-----------|--------|
| Edge Function not running | No new folder in Storage today | Check pg_cron job in SQL editor: `SELECT * FROM cron.job;`. Re-enable if disabled. |
| Partial table export | `"error"` key in manifest | Check function logs in Supabase dashboard → Edge Functions. Usually a timeout on a large table — add pagination or increase timeout. |
| Storage bucket full | Upload error in logs | Delete oldest backup folders manually, or raise storage quota. |
| PITR window expired | Need data older than 7 days | Use NDJSON export backups (30-day retention). |
| Backup bucket accidentally deleted | Storage shows no `backups/` bucket | Re-run backup manually — it auto-creates the bucket. Increase Storage RLS vigilance. |

---

## pg_cron setup (one-time)

After running migration `023_backup_schedule.sql`, set the GUC variables:

```sql
-- Run as superuser (Supabase SQL editor with service-role)
ALTER DATABASE postgres SET app.supabase_url = 'https://<PROJECT_REF>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<YOUR_SERVICE_ROLE_KEY>';
```

Verify the jobs are scheduled:

```sql
SELECT jobname, schedule, command FROM cron.job;
```

Expected output:
```
koope-daily-backup   | 0 2 * * * | SELECT net.http_post(...)
koope-backup-cleanup | 0 3 * * * | SELECT public.cleanup_old_backups(30)
```
