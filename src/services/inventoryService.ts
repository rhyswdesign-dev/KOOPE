/**
 * Inventory Service
 * Handles user inventory management and scan tracking
 */

import { supabase } from '../lib/supabase';
import type { UserInventoryItem, ItemType, ScanType } from '../types/database';
import * as Localization from 'expo-localization';
import { log } from '../lib/logger';
import { formatIngredientName } from '../utils/recipeMatching';
import { submitWeightedCorrection, submitNewBottle } from './scanCorrectionService';

export class InventoryService {
  /**
   * Get the user's current monthly scan count
   */
  static async getMonthlyScanCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_scan_count', { p_user_id: userId });

      if (error) {
        log.error('InventoryService', 'Error getting scan count', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      log.error('InventoryService', 'Exception getting scan count', error);
      return 0;
    }
  }

  /**
   * Check if a user can scan.
   * Scan count is no longer a hard gate.
   * All tiers use the full smart-scan waterfall:
   *   barcode -> OCR/label analysis -> visual recognition -> manual fallback
   * This method now always returns canScan: true; inventory capacity and
   * downstream feature access are the relevant monetization checks.
   * getMonthlyScanCount is preserved for analytics/brand-data purposes.
   */
  static async canUserScan(_userId: string | null, _isPaidUser: boolean = false): Promise<{
    canScan: boolean;
    scansRemaining: number;
    isGuest: boolean;
  }> {
    const isGuest = !_userId;
    return { canScan: true, scansRemaining: -1, isGuest };
  }

  /**
   * Record a scan for brand data tracking
   */
  static async recordScan(params: {
    userId: string | null;
    scanType: ScanType;
    itemName?: string;
    brandName?: string;
    imageUrl?: string;
    confidence?: number;
    addedToInventory?: boolean;
  }): Promise<void> {
    try {
      const locale = Localization.getLocales()[0];
      const userLocation = locale.regionCode || null;

      const { error } = await supabase
        .from('user_scans')
        .insert({
          user_id: params.userId,
          scan_type: params.scanType,
          item_name: params.itemName || null,
          brand_name: params.brandName || null,
          image_url: params.imageUrl || null,
          detection_confidence: params.confidence || null,
          user_location: userLocation,
          added_to_inventory: params.addedToInventory || false,
        });

      if (error) {
        log.error('InventoryService', 'Error recording scan', error);
      }
    } catch (error) {
      log.error('InventoryService', 'Exception recording scan', error);
    }
  }

  /**
   * Track when user clicks "Find Nearby" for brand partnership data
   */
  static async trackFindStoresClick(scanId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_scans')
        .update({
          clicked_find_stores: true,
          clicked_find_stores_at: new Date().toISOString(),
        })
        .eq('id', scanId);

      if (error) {
        log.error('InventoryService', 'Error tracking find stores click', error);
      }
    } catch (error) {
      log.error('InventoryService', 'Exception tracking find stores click', error);
    }
  }

  /**
   * Check if item already exists in user's inventory
   */
  static async checkDuplicate(userId: string, itemName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('id')
        .eq('user_id', userId)
        .ilike('item_name', itemName)
        .maybeSingle();

      if (error) {
        log.error('InventoryService', 'Error checking duplicate', error);
        return false;
      }

      return !!data;
    } catch (error) {
      log.error('InventoryService', 'Exception checking duplicate', error);
      return false;
    }
  }

  /**
   * Add item to user's inventory
   */
  static async addToInventory(params: {
    userId: string;
    itemType: ItemType;
    itemName: string;
    category?: string;
    imageUrl?: string;
    subcategory?: string;
    brand?: string;
    abv?: number;
    volume?: number;
    region?: string;
    flavorTags?: string[];
    tastingNotes?: string;
    serveGuidance?: string;
    notes?: string;
  }): Promise<{ success: boolean; duplicate: boolean }> {
    try {
      // Format ingredient name for consistency (Title Case)
      // "ginger beer" → "Ginger Beer", "VODKA" → "Vodka"
      const formattedName = formatIngredientName(params.itemName);

      // Check for duplicate (using formatted name)
      const isDuplicate = await this.checkDuplicate(params.userId, formattedName);
      if (isDuplicate) {
        return { success: false, duplicate: true };
      }

      const insertPayload: Record<string, any> = {
        user_id: params.userId,
        item_type: params.itemType,
        item_name: formattedName, // Use formatted name
        category: params.category || null,
        image_url: params.imageUrl || null,
        subcategory: params.subcategory || null,
        brand: params.brand || null,
        abv: params.abv ?? null,
        volume: params.volume ?? null,
        region: params.region || null,
        flavor_tags: params.flavorTags || null,
        tasting_notes: params.tastingNotes || null,
        serve_guidance: params.serveGuidance || null,
        notes: params.notes || null,
      };

      let error: any = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const result = await supabase
          .from('user_inventory')
          .insert(insertPayload);
        error = result.error;
        if (!error) break;

        // Schema compatibility fallback:
        // Some environments are missing optional columns (e.g. notes, brand).
        if (error?.code === 'PGRST204') {
          const optionalColumns = [
            'brand',
            'notes',
            'flavor_tags',
            'tasting_notes',
            'serve_guidance',
            'region',
            'subcategory',
            'image_url',
            'category',
          ];

          const missingColumnMatch =
            typeof error?.message === 'string'
              ? error.message.match(/Could not find the [`'"]?([^`'"]+)[`'"]? column/i)
              : null;

          const missingColumn = missingColumnMatch?.[1];

          // Remove only the reported column if we can parse it; otherwise, strip all optional columns and retry.
          const columnsToStrip = missingColumn
            ? [missingColumn]
            : optionalColumns.filter((col) => Object.prototype.hasOwnProperty.call(insertPayload, col));

          let stripped = false;
          for (const col of columnsToStrip) {
            if (Object.prototype.hasOwnProperty.call(insertPayload, col)) {
              if (col === 'brand' && params.brand) {
                const currentName = String(insertPayload.item_name || formattedName).trim();
                if (!currentName.includes(' - ')) {
                  insertPayload.item_name = `${params.brand.trim()} - ${currentName}`;
                }
              }
              delete insertPayload[col];
              stripped = true;
            }
          }

          if (stripped) continue;
        }
        break;
      }

      if (error) {
        log.error('InventoryService', 'Error adding to inventory', error);
        return { success: false, duplicate: false };
      }

      return { success: true, duplicate: false };
    } catch (error) {
      log.error('InventoryService', 'Exception adding to inventory', error);
      return { success: false, duplicate: false };
    }
  }

  /**
   * Add multiple items to inventory (batch operation)
   */
  static async addMultipleToInventory(
    userId: string,
    items: Array<{
      itemType: ItemType;
      itemName: string;
      category?: string;
      imageUrl?: string;
      subcategory?: string;
      brand?: string;
      notes?: string;
    }>
  ): Promise<{ successCount: number; duplicates: string[] }> {
    let successCount = 0;
    const duplicates: string[] = [];

    for (const item of items) {
      const result = await this.addToInventory({
        userId,
        ...item,
      });

      if (result.success) {
        successCount++;
      } else if (result.duplicate) {
        duplicates.push(item.itemName);
      }
    }

    return { successCount, duplicates };
  }

  /**
   * Get user's inventory
   */
  static async getUserInventory(userId: string): Promise<UserInventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        log.error('InventoryService', 'Error getting inventory', error);
        return [];
      }

      return data || [];
    } catch (error) {
      log.error('InventoryService', 'Exception getting inventory', error);
      return [];
    }
  }

  /**
   * Get user's inventory count
   */
  static async getInventoryCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        log.error('InventoryService', 'Error getting inventory count', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      log.error('InventoryService', 'Exception getting inventory count', error);
      return 0;
    }
  }

  /**
   * Remove item from inventory
   */
  static async removeFromInventory(userId: string, itemName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .ilike('item_name', itemName);

      if (error) {
        log.error('InventoryService', 'Error removing from inventory', error);
        return false;
      }

      return true;
    } catch (error) {
      log.error('InventoryService', 'Exception removing from inventory', error);
      return false;
    }
  }

  /**
   * Update optional inventory metadata for an existing item.
   * Falls back gracefully if some environments are missing columns.
   */
  static async updateInventoryItem(
    itemId: string,
    updates: {
      isFavorite?: boolean;
      notes?: string;
      quantity?: string;
      expiryDate?: string;
      purchasePrice?: number | null;
      acquiredAt?: string | null;
      drinkingWindowStart?: string | null;
      drinkingWindowEnd?: string | null;
      cellarNotes?: string | null;
      valuationEstimate?: number | null;
    }
  ): Promise<boolean> {
    try {
      const updatePayload: Record<string, any> = {};

      if (updates.isFavorite !== undefined) {
        updatePayload.is_favorite = updates.isFavorite;
      }
      if (updates.notes !== undefined) {
        updatePayload.notes = updates.notes || null;
      }
      if (updates.quantity !== undefined) {
        updatePayload.quantity = updates.quantity || null;
      }
      if (updates.expiryDate !== undefined) {
        updatePayload.expiry_date = updates.expiryDate || null;
      }
      if (updates.purchasePrice !== undefined) {
        updatePayload.purchase_price = updates.purchasePrice ?? null;
      }
      if (updates.acquiredAt !== undefined) {
        updatePayload.acquired_at = updates.acquiredAt || null;
      }
      if (updates.drinkingWindowStart !== undefined) {
        updatePayload.drinking_window_start = updates.drinkingWindowStart || null;
      }
      if (updates.drinkingWindowEnd !== undefined) {
        updatePayload.drinking_window_end = updates.drinkingWindowEnd || null;
      }
      if (updates.cellarNotes !== undefined) {
        updatePayload.cellar_notes = updates.cellarNotes || null;
      }
      if (updates.valuationEstimate !== undefined) {
        updatePayload.valuation_estimate = updates.valuationEstimate ?? null;
      }

      if (Object.keys(updatePayload).length === 0) {
        return true;
      }

      let error: any = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const result = await supabase
          .from('user_inventory')
          .update(updatePayload)
          .eq('id', itemId);

        error = result.error;
        if (!error) break;

        const missingColumnMatch =
          error?.code === 'PGRST204' &&
          typeof error?.message === 'string'
            ? error.message.match(/Could not find the '([^']+)' column/i)
            : null;

        const missingColumn = missingColumnMatch?.[1];
        if (missingColumn && Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)) {
          delete updatePayload[missingColumn];
          if (Object.keys(updatePayload).length === 0) return true;
          continue;
        }
        break;
      }

      if (error) {
        log.error('InventoryService', 'Error updating inventory item', error, { itemId });
        return false;
      }

      return true;
    } catch (error) {
      log.error('InventoryService', 'Exception updating inventory item', error, { itemId });
      return false;
    }
  }

  /**
   * Submit a scan correction using the weighted voting anti-fraud system.
   * Routes through scanCorrectionService to ensure:
   * - Votes are weighted by user accuracy score
   * - New bottle submissions go through moderation for untrusted users
   * - Trusted users (accuracy > 0.7) get auto-approved
   */
  static async submitScanCorrection(params: {
    userId: string;
    barcode: string;
    correctBottleId: string | null;
    newBottleData?: Record<string, unknown>;
  }): Promise<'voted' | 'added' | 'queued'> {
    const { userId, barcode, correctBottleId, newBottleData } = params;

    if (correctBottleId) {
      await submitWeightedCorrection({ userId, barcode, correctBottleId });
      return 'voted';
    } else if (newBottleData) {
      const result = await submitNewBottle(newBottleData, userId, barcode);
      return result;
    }

    return 'voted';
  }

  /**
   * Mark item as "user searched nearby" for brand data
   */
  static async markSearchedNearby(userId: string, itemName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({ user_searched_nearby: true })
        .eq('user_id', userId)
        .ilike('item_name', itemName);

      if (error) {
        log.error('InventoryService', 'Error marking searched nearby', error);
      }
    } catch (error) {
      log.error('InventoryService', 'Exception marking searched nearby', error);
    }
  }
}
