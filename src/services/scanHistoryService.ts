import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const SCAN_HISTORY_KEY = 'koope_scan_history';
const MAX_HISTORY_RECORDS = 100;
const DOCUMENT_DIRECTORY = (FileSystem as unknown as { documentDirectory?: string }).documentDirectory ?? '';

export interface ScanRecord {
  bottleId: string;
  bottleName: string;
  bottleBrand: string;
  bottleType: string;
  firstScannedAt: string;
  lastScannedAt: string;
  scanCount: number;
  /** Local camera URI captured at scan time. May be stale after reinstall. */
  imageUri?: string;
}

class ScanHistoryServiceClass {
  private cache: ScanRecord[] | null = null;

  async recordScan(bottle: {
    id?: string;
    name?: string;
    brand?: string;
    type?: string;
    category?: string;
  }, imageUri?: string): Promise<void> {
    if (!bottle.name) return;

    const bottleId = bottle.id || `${bottle.name}_${bottle.brand || ''}`.toLowerCase().replace(/\s+/g, '_');
    const now = new Date().toISOString();

    const records = await this._load();
    const existing = records.find(r => r.bottleId === bottleId);

    if (existing) {
      existing.lastScannedAt = now;
      existing.scanCount += 1;
      // Update imageUri if we have a fresh one
      if (imageUri) existing.imageUri = imageUri;
    } else {
      records.unshift({
        bottleId,
        bottleName: bottle.name,
        bottleBrand: bottle.brand || '',
        bottleType: bottle.type || bottle.category || 'other',
        firstScannedAt: now,
        lastScannedAt: now,
        scanCount: 1,
        imageUri,
      });
    }

    // Keep most-recently-scanned records first; cap at max
    const sorted = records.sort(
      (a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime()
    );
    const evicted = sorted.slice(MAX_HISTORY_RECORDS);
    const trimmed = sorted.slice(0, MAX_HISTORY_RECORDS);

    // Delete persisted thumbnails for evicted records so the scans/ folder stays bounded
    for (const r of evicted) {
      if (r.imageUri?.startsWith(DOCUMENT_DIRECTORY)) {
        FileSystem.deleteAsync(r.imageUri, { idempotent: true }).catch(() => {});
      }
    }

    this.cache = trimmed;
    await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(trimmed));
  }

  async getScanHistory(): Promise<ScanRecord[]> {
    return this._load();
  }

  async clearHistory(): Promise<void> {
    // Delete all persisted thumbnails
    const scansDir = `${DOCUMENT_DIRECTORY}scans/`;
    FileSystem.deleteAsync(scansDir, { idempotent: true }).catch(() => {});
    this.cache = [];
    await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
  }

  private async _load(): Promise<ScanRecord[]> {
    if (this.cache !== null) return [...this.cache];
    try {
      const raw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      const parsed: ScanRecord[] = raw ? JSON.parse(raw) : [];
      this.cache = parsed;
      return [...parsed];
    } catch {
      return [];
    }
  }
}

export const ScanHistoryService = new ScanHistoryServiceClass();
