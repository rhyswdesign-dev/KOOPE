import AsyncStorage from '@react-native-async-storage/async-storage';
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

export class CellarService {
  private static STORAGE_KEY = 'koope_cellar_records';

  static async getRecords(): Promise<Record<string, CellarRecord>> {
    try {
      const raw = await AsyncStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      log.error('CellarService', 'Failed to load cellar records', error);
      return {};
    }
  }

  static async saveRecord(record: CellarRecord): Promise<void> {
    try {
      const records = await this.getRecords();
      records[record.inventoryItemId] = record;
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      log.error('CellarService', 'Failed to save cellar record', error, { inventoryItemId: record.inventoryItemId });
      throw error;
    }
  }

  static async getRecord(inventoryItemId: string): Promise<CellarRecord | null> {
    const records = await this.getRecords();
    return records[inventoryItemId] || null;
  }

  static async deleteRecord(inventoryItemId: string): Promise<void> {
    try {
      const records = await this.getRecords();
      delete records[inventoryItemId];
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      log.error('CellarService', 'Failed to delete cellar record', error, { inventoryItemId });
      throw error;
    }
  }
}
