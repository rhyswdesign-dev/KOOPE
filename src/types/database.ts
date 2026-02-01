/**
 * Database types for Supabase tables
 */

export type ItemType = 'spirit' | 'ingredient';
export type ScanType = 'bottle' | 'ingredient' | 'recipe';

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
    };
  };
}
