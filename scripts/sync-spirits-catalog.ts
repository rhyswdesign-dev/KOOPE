/**
 * Sync Spirits Catalog to Supabase
 *
 * Pushes src/data/spiritsDatabase.ts (the app's bundled local spirits
 * database) into the spirits_catalog table so the bottle-recognize edge
 * function can score OCR text against known bottles server-side, in the
 * same request that calls Google Vision.
 *
 * src/data/spiritsDatabase.ts remains the git source of truth — this script
 * is the one-way sync, run manually after editing that file. See also
 * `npm run catalog:verify`, which checks for drift without writing anything.
 *
 * Run: npm run catalog:sync
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SPIRITS_DATABASE } from '../src/data/spiritsDatabase';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncCatalog() {
  console.log(`📦 Syncing ${SPIRITS_DATABASE.length} spirits to spirits_catalog...\n`);

  const rows = SPIRITS_DATABASE.map((spirit) => ({
    id: spirit.id,
    name: spirit.name,
    brand: spirit.brand,
    spirit_type: spirit.type,
    abv: spirit.abv,
    price_tier: spirit.priceTier,
    price_usd_min: spirit.priceEstimate?.USD?.min ?? null,
    price_usd_max: spirit.priceEstimate?.USD?.max ?? null,
    price_cad_min: spirit.priceEstimate?.CAD?.min ?? null,
    price_cad_max: spirit.priceEstimate?.CAD?.max ?? null,
    price_gbp_min: spirit.priceEstimate?.GBP?.min ?? null,
    price_gbp_max: spirit.priceEstimate?.GBP?.max ?? null,
    flavor_profile: spirit.flavorProfile,
    tasting_notes: spirit.tastingNotes,
    origin: spirit.origin,
    search_terms: spirit.searchTerms,
    synced_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 200;
  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('spirits_catalog').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }
    synced += batch.length;
    console.log(`  ✓ Synced ${synced}/${rows.length}`);
  }

  // Remove catalog rows for bottles that no longer exist locally.
  const localIds = new Set(SPIRITS_DATABASE.map((s) => s.id));
  const { data: existing, error: fetchError } = await supabase.from('spirits_catalog').select('id');
  if (fetchError) {
    console.error('⚠️  Could not check for stale rows:', fetchError.message);
  } else {
    const staleIds = (existing || []).map((r) => r.id).filter((id) => !localIds.has(id));
    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase.from('spirits_catalog').delete().in('id', staleIds);
      if (deleteError) {
        console.error('⚠️  Could not remove stale rows:', deleteError.message);
      } else {
        console.log(`  ✓ Removed ${staleIds.length} stale row(s) no longer in spiritsDatabase.ts`);
      }
    }
  }

  console.log('\n✅ Catalog sync complete.');
}

syncCatalog().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
