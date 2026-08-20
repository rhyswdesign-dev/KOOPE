/**
 * Database types for Supabase tables
 */

import { FlavorProfile } from './userProfile';

export type ItemType = 'spirit' | 'ingredient';
export type ScanType = 'bottle' | 'ingredient' | 'recipe';
export type BottleCategory =
  | 'spirit'
  | 'liqueur'
  | 'wine'
  | 'mixer'
  | 'bitters'
  | 'syrup'
  | 'garnish'
  | 'ingredient'
  | 'other';
export type PriceRange = 'budget' | 'mid' | 'premium' | 'luxury';
export type BottleQuantity = 'full' | 'half' | 'low' | 'empty';

/**
 * Canonical Bottle type — unified model for all bottle/ingredient data.
 * Use this as the single source of truth for inventory items.
 */
export interface Bottle {
  id: string;
  userId: string;
  name: string;
  category: BottleCategory;
  subcategory?: string; // e.g. 'bourbon', 'london dry', 'reposado'
  brand?: string;
  abv?: number; // Alcohol by volume percentage
  volume?: number; // Volume in ml
  priceRange?: PriceRange;
  region?: string; // e.g. 'Kentucky', 'Jalisco', 'Scotland'
  flavorTags: FlavorProfile[];
  quantity: BottleQuantity;
  imageUrl?: string;
  addedAt: string;
  lastUsedAt?: string;
  expiryDate?: string;
  scanCount: number;
  lastScannedAt?: string;
  isFavorite: boolean;
  notes?: string;
}

/**
 * Convert a UserInventoryItem (DB row) to a Bottle
 */
export function toBottle(item: UserInventoryItem, extra?: Partial<Bottle>): Bottle {
  return {
    id: item.id,
    userId: item.user_id,
    name: item.item_name,
    category:
      (item.category as BottleCategory) || (item.item_type === 'spirit' ? 'spirit' : 'ingredient'),
    flavorTags: [],
    quantity: 'full',
    imageUrl: item.image_url ?? undefined,
    addedAt: item.added_at,
    lastUsedAt: item.last_used_at ?? undefined,
    lastScannedAt: item.scanned_at,
    scanCount: 1,
    isFavorite: false,
    ...extra,
  };
}

/**
 * Legacy DB row type — kept for backward compatibility with existing queries
 */
export interface UserInventoryItem {
  id: string;
  user_id: string;
  item_type: ItemType;
  item_name: string;
  category: string | null;
  image_url: string | null;
  added_at: string;
  scanned_at: string;
  user_searched_nearby: boolean;
  last_used_at: string | null;
  // New columns (nullable for backward compat with existing rows)
  subcategory?: string | null;
  brand?: string | null;
  abv?: number | null;
  volume?: number | null;
  price_range?: string | null;
  region?: string | null;
  flavor_tags?: string[] | null;
  tasting_notes?: string | null;
  serve_guidance?: string | null;
  quantity?: string | null;
  scan_count?: number | null;
  is_favorite?: boolean | null;
  notes?: string | null;
  expiry_date?: string | null;
  purchase_price?: number | null;
  acquired_at?: string | null;
  drinking_window_start?: string | null;
  drinking_window_end?: string | null;
  cellar_notes?: string | null;
  valuation_estimate?: number | null;
}

export interface UserScan {
  id: string;
  user_id: string | null;
  scan_type: ScanType;
  item_name: string | null;
  brand_name: string | null;
  scanned_at: string;
  clicked_find_stores: boolean;
  clicked_find_stores_at: string | null;
  image_url: string | null;
  detection_confidence: number | null;
  user_location: string | null;
  added_to_inventory: boolean;
}

export interface Database {
  public: {
    Tables: {
      user_inventory: {
        Row: UserInventoryItem;
        Insert: Omit<UserInventoryItem, 'id' | 'added_at' | 'scanned_at'> & {
          id?: string;
          added_at?: string;
          scanned_at?: string;
        };
        Update: Partial<Omit<UserInventoryItem, 'id' | 'user_id'>>;
      };
      user_scans: {
        Row: UserScan;
        Insert: Omit<UserScan, 'id' | 'scanned_at'> & {
          id?: string;
          scanned_at?: string;
        };
        Update: Partial<Omit<UserScan, 'id' | 'user_id'>>;
      };
    };
    Functions: {
      get_monthly_scan_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_inventory_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
  };
}
