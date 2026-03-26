import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export interface CellarRecord {
  inventoryItemId: string;
  itemName: string;
  createdAt: string;
  imageUrl?: string | null;
  brand?: string | null;
  type?: string | null;
  abv?: number | null;
  region?: string | null;
  flavorProfile?: string[] | null;
  tastingNotes?: string | null;
  serveGuidance?: string | null;
  quantity?: string | null;
  purchasePrice?: number | null;
  valuationEstimate?: number | null;
  drinkingWindowStart?: string | null;
  drinkingWindowEnd?: string | null;
  cellarNotes?: string | null;
}

// ─── internal helpers ────────────────────────────────────────────────────────

const CACHE_KEY = 'koope_cellar_records';
const MIGRATED_KEY = 'koope_cellar_migrated_v1';

function toRow(record: CellarRecord, userId: string) {
  return {
    user_id: userId,
    inventory_item_id: record.inventoryItemId,
    item_name: record.itemName,
    created_at: record.createdAt,
    image_url: record.imageUrl ?? null,
    brand: record.brand ?? null,
    type: record.type ?? null,
    abv: record.abv ?? null,
    region: record.region ?? null,
    flavor_profile: record.flavorProfile ?? null,
    tasting_notes: record.tastingNotes ?? null,
    serve_guidance: record.serveGuidance ?? null,
    quantity: record.quantity ?? null,
    purchase_price: record.purchasePrice ?? null,
    valuation_estimate: record.valuationEstimate ?? null,
    drinking_window_start: record.drinkingWindowStart ?? null,
    drinking_window_end: record.drinkingWindowEnd ?? null,
    cellar_notes: record.cellarNotes ?? null,
  };
}

function fromRow(row: any): CellarRecord {
  return {
    inventoryItemId: row.inventory_item_id,
    itemName: row.item_name,
    createdAt: row.created_at,
    imageUrl: row.image_url,
    brand: row.brand,
    type: row.type,
    abv: row.abv,
    region: row.region,
    flavorProfile: row.flavor_profile,
    tastingNotes: row.tasting_notes,
    serveGuidance: row.serve_guidance,
    quantity: row.quantity,
    purchasePrice: row.purchase_price,
    valuationEstimate: row.valuation_estimate,
    drinkingWindowStart: row.drinking_window_start,
    drinkingWindowEnd: row.drinking_window_end,
    cellarNotes: row.cellar_notes,
  };
}

async function readCache(): Promise<Record<string, CellarRecord>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeCache(records: Record<string, CellarRecord>): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(records));
  } catch (error) {
    log.warn('CellarService', 'Failed to write local cache', error);
  }
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// ─── one-time migration from old AsyncStorage-only records ───────────────────

async function maybeMigrateToSupabase(userId: string): Promise<void> {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATED_KEY);
    if (alreadyMigrated) return;

    const cached = await readCache();
    const records = Object.values(cached);
    if (records.length === 0) {
      await AsyncStorage.setItem(MIGRATED_KEY, '1');
      return;
    }

    const rows = records.map((r) => toRow(r, userId));
    const { error } = await supabase
      .from('cellar_records')
      .upsert(rows, { onConflict: 'user_id,inventory_item_id', ignoreDuplicates: true });

    if (error) {
      log.warn('CellarService', 'Migration to Supabase partially failed', error);
    } else {
      await AsyncStorage.setItem(MIGRATED_KEY, '1');
      log.info('CellarService', `Migrated ${records.length} cellar records to Supabase`);
    }
  } catch (error) {
    log.warn('CellarService', 'Migration attempt failed, will retry next session', error);
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

export class CellarService {
  /**
   * Fetch all cellar records for the current user.
   * Reads from Supabase and refreshes the local cache.
   * Falls back to cache if the user is offline or unauthenticated.
   */
  static async getRecords(): Promise<Record<string, CellarRecord>> {
    const userId = await getUserId();

    if (!userId) {
      return readCache();
    }

    await maybeMigrateToSupabase(userId);

    try {
      const { data, error } = await supabase
        .from('cellar_records')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const records: Record<string, CellarRecord> = {};
      for (const row of data ?? []) {
        const record = fromRow(row);
        records[record.inventoryItemId] = record;
      }

      // Refresh cache from remote
      await writeCache(records);
      return records;
    } catch (error) {
      log.warn('CellarService', 'Supabase fetch failed, serving from cache', error);
      return readCache();
    }
  }

  /**
   * Save (upsert) a single cellar record.
   * Writes to Supabase and updates the local cache.
   */
  static async saveRecord(record: CellarRecord): Promise<void> {
    const userId = await getUserId();

    // Always update local cache immediately for responsive UI
    const cached = await readCache();
    cached[record.inventoryItemId] = record;
    await writeCache(cached);

    if (!userId) return;

    try {
      const { error } = await supabase
        .from('cellar_records')
        .upsert(toRow(record, userId), { onConflict: 'user_id,inventory_item_id' });

      if (error) throw error;
    } catch (error) {
      log.error('CellarService', 'Failed to save record to Supabase', error, {
        inventoryItemId: record.inventoryItemId,
      });
      throw error;
    }
  }

  /**
   * Fetch a single cellar record by inventory item ID.
   * Reads from local cache; refresh via getRecords() for authoritative data.
   */
  static async getRecord(inventoryItemId: string): Promise<CellarRecord | null> {
    const records = await readCache();
    if (records[inventoryItemId]) return records[inventoryItemId];

    // Cache miss: try Supabase directly
    const userId = await getUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('cellar_records')
        .select('*')
        .eq('user_id', userId)
        .eq('inventory_item_id', inventoryItemId)
        .maybeSingle();

      if (error || !data) return null;

      const record = fromRow(data);
      records[inventoryItemId] = record;
      await writeCache(records);
      return record;
    } catch {
      return null;
    }
  }

  /**
   * Delete a cellar record by inventory item ID.
   * Removes from Supabase and local cache.
   */
  static async deleteRecord(inventoryItemId: string): Promise<void> {
    // Remove from local cache immediately
    const cached = await readCache();
    delete cached[inventoryItemId];
    await writeCache(cached);

    const userId = await getUserId();
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('cellar_records')
        .delete()
        .eq('user_id', userId)
        .eq('inventory_item_id', inventoryItemId);

      if (error) throw error;
    } catch (error) {
      log.error('CellarService', 'Failed to delete record from Supabase', error, { inventoryItemId });
      throw error;
    }
  }
}
