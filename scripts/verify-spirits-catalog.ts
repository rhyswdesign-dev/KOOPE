/**
 * Verify Spirits Catalog Sync
 *
 * Read-only check for drift between src/data/spiritsDatabase.ts and the
 * spirits_catalog table (which bottle-recognize queries server-side). Run
 * this after any edit to spiritsDatabase.ts — a stale catalog means a bottle
 * matches locally in the app bundle but not in the edge function, or the
 * reverse, which is a silent regression.
 *
 * Run: npm run catalog:verify
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SPIRITS_DATABASE } from '../src/data/spiritsDatabase';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCatalog() {
  console.log('🔍 Verifying spirits_catalog against src/data/spiritsDatabase.ts...\n');

  const { data: rows, error } = await supabase.from('spirits_catalog').select('id, name, brand, abv, synced_at');
  if (error) {
    console.error('❌ Could not read spirits_catalog:', error.message);
    process.exit(1);
  }

  const catalogById = new Map((rows || []).map((r) => [r.id, r]));
  const localIds = new Set(SPIRITS_DATABASE.map((s) => s.id));

  const missingFromCatalog = SPIRITS_DATABASE.filter((s) => !catalogById.has(s.id));
  const staleInCatalog = (rows || []).filter((r) => !localIds.has(r.id));
  const mismatched = SPIRITS_DATABASE.filter((s) => {
    const row = catalogById.get(s.id);
    return row && (row.name !== s.name || row.brand !== s.brand || Number(row.abv) !== s.abv);
  });

  console.log(`Local database: ${SPIRITS_DATABASE.length} spirits`);
  console.log(`Catalog table:  ${rows?.length ?? 0} rows\n`);

  if (missingFromCatalog.length === 0 && staleInCatalog.length === 0 && mismatched.length === 0) {
    console.log('✅ In sync — no drift detected.');
    return;
  }

  if (missingFromCatalog.length > 0) {
    console.log(`⚠️  ${missingFromCatalog.length} local spirit(s) missing from catalog:`);
    missingFromCatalog.slice(0, 10).forEach((s) => console.log(`   - ${s.id} (${s.name})`));
  }
  if (staleInCatalog.length > 0) {
    console.log(`⚠️  ${staleInCatalog.length} catalog row(s) no longer in spiritsDatabase.ts:`);
    staleInCatalog.slice(0, 10).forEach((r) => console.log(`   - ${r.id} (${r.name})`));
  }
  if (mismatched.length > 0) {
    console.log(`⚠️  ${mismatched.length} spirit(s) with mismatched name/brand/abv:`);
    mismatched.slice(0, 10).forEach((s) => console.log(`   - ${s.id} (${s.name})`));
  }
  console.log('\nRun `npm run catalog:sync` to fix.');
  process.exit(1);
}

verifyCatalog().catch((err) => {
  console.error('❌ Verify failed:', err);
  process.exit(1);
});
