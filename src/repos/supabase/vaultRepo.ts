/**
 * Vault Repository - Supabase
 * Fetches vault data from Supabase instead of local data
 */

import { supabase } from '../../lib/supabase';
import { VaultItem, VaultCycle, MonetizationItem, UserVaultProfile } from '../../types/vault';
import { log } from '../../lib/logger';

export class VaultRepository {
  /**
   * Get current active vault cycle
   */
  static async getCurrentCycle(): Promise<VaultCycle | null> {
    const { data, error } = await supabase
      .from('vault_cycles')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      log.error('VaultRepo', 'Error fetching vault cycle', error);
      return null;
    }

    return data ? this.mapCycleFromDatabase(data) : null;
  }

  /**
   * Get all active vault items
   */
  static async getActiveVaultItems(): Promise<VaultItem[]> {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('is_active', true)
      .order('rarity');

    if (error) {
      log.error('VaultRepo', 'Error fetching vault items', error);
      return [];
    }

    return (data || []).map(this.mapItemFromDatabase);
  }

  /**
   * Get vault items by rarity
   */
  static async getVaultItemsByRarity(rarity: string): Promise<VaultItem[]> {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('is_active', true)
      .eq('rarity', rarity)
      .order('name');

    if (error) {
      log.error('VaultRepo', 'Error fetching vault items by rarity', error);
      return [];
    }

    return (data || []).map(this.mapItemFromDatabase);
  }

  /**
   * Get vault item by ID
   */
  static async getVaultItemById(id: string): Promise<VaultItem | null> {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      log.error('VaultRepo', 'Error fetching vault item', error);
      return null;
    }

    return data ? this.mapItemFromDatabase(data) : null;
  }

  /**
   * Get all monetization items
   */
  static async getMonetizationItems(): Promise<MonetizationItem[]> {
    const { data, error } = await supabase
      .from('monetization_items')
      .select('*')
      .eq('in_stock', true)
      .order('price');

    if (error) {
      log.error('VaultRepo', 'Error fetching monetization items', error);
      return [];
    }

    return (data || []).map(this.mapMonetizationItemFromDatabase);
  }

  /**
   * Get user vault profile
   */
  static async getUserVaultProfile(userId: string): Promise<UserVaultProfile | null> {
    const { data, error } = await supabase
      .from('user_vault_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Profile might not exist yet
      if (error.code === 'PGRST116') {
        return null;
      }
      log.error('VaultRepo', 'Error fetching user vault profile', error);
      return null;
    }

    return data ? this.mapUserVaultProfileFromDatabase(data) : null;
  }

  /**
   * Decrement vault item stock atomically
   */
  static async decrementItemStock(itemId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('decrement_vault_item_stock', {
      item_id: itemId
    });

    if (error) {
      log.error('VaultRepo', 'Error decrementing item stock', error);
      return false;
    }

    if (data && !data.success) {
      log.warn('VaultRepo', 'Stock decrement failed', { itemId, error: data.error });
      return false;
    }

    return true;
  }

  /**
   * Create or update user vault profile
   */
  static async upsertUserVaultProfile(profile: UserVaultProfile): Promise<boolean> {
    const { error } = await supabase
      .from('user_vault_profiles')
      .upsert({
        user_id: profile.userId,
        xp_balance: profile.xpBalance,
        keys_balance: profile.keysBalance,
        total_xp_earned: profile.totalXpEarned,
        total_keys_earned: profile.totalKeysEarned,
        total_xp_spent: profile.totalXpSpent,
        total_keys_spent: profile.totalKeysSpent,
        booster_type: profile.activeBooster?.type || null,
        booster_multiplier: profile.activeBooster?.multiplier || null,
        booster_expires_at: profile.activeBooster?.expiresAt || null,
        booster_remaining_uses: profile.activeBooster?.remainingUses || null
      });

    if (error) {
      log.error('VaultRepo', 'Error upserting user vault profile', error);
      return false;
    }

    return true;
  }

  /**
   * Map database cycle to VaultCycle type
   */
  private static mapCycleFromDatabase(data: any): VaultCycle {
    return {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      featuredItemIds: data.featured_item_ids || [],
      mysteryDropPool: data.mystery_drop_pool || [],
      totalItemsReleased: data.total_items_released,
      totalUnlocks: data.total_unlocks,
      createdAt: data.created_at
    };
  }

  /**
   * Map database item to VaultItem type
   */
  private static mapItemFromDatabase(data: any): VaultItem {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      image: data.image,
      category: data.category,
      type: data.type,
      rarity: data.rarity,
      xpCost: data.xp_cost,
      keysCost: data.keys_cost,
      discountOption: data.discount_reduced_xp ? {
        reducedXP: data.discount_reduced_xp,
        cashPrice: data.discount_cash_price / 100 // Convert cents to dollars
      } : undefined,
      totalStock: data.total_stock,
      currentStock: data.current_stock,
      cycleId: data.cycle_id,
      contents: data.contents || [],
      estimatedValue: data.estimated_value,
      partner: data.partner,
      isActive: data.is_active,
      releaseDate: data.release_date,
      expiryDate: data.expiry_date,
      mysteryPool: data.mystery_pool || [],
      mysteryTags: data.mystery_tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Map database monetization item
   */
  private static mapMonetizationItemFromDatabase(data: any): MonetizationItem {
    return {
      id: data.id,
      type: data.type,
      name: data.name,
      description: data.description,
      image: data.image,
      price: data.price, // Already in cents
      originalPrice: data.original_price,
      keysGranted: data.keys_granted,
      boosterEffect: data.booster_type ? {
        type: data.booster_type,
        multiplier: data.booster_multiplier ? parseFloat(data.booster_multiplier) : undefined,
        duration: data.booster_duration,
        description: `${data.booster_multiplier}x ${data.booster_type} for ${data.booster_duration} hours`
      } : undefined,
      isBundle: data.is_bundle,
      bundleItems: data.bundle_items ? JSON.parse(data.bundle_items) : undefined,
      inStock: data.in_stock,
      stockLimit: data.stock_limit,
      stripePriceId: data.stripe_price_id,
      stripeProductId: data.stripe_product_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Map database user vault profile
   */
  private static mapUserVaultProfileFromDatabase(data: any): UserVaultProfile {
    return {
      userId: data.user_id,
      xpBalance: data.xp_balance,
      keysBalance: data.keys_balance,
      totalXpEarned: data.total_xp_earned,
      totalKeysEarned: data.total_keys_earned,
      totalXpSpent: data.total_xp_spent,
      totalKeysSpent: data.total_keys_spent,
      unlockedItems: [], // Load separately if needed
      activeBooster: data.booster_type ? {
        type: data.booster_type,
        multiplier: data.booster_multiplier ? parseFloat(data.booster_multiplier) : undefined,
        expiresAt: data.booster_expires_at,
        remainingUses: data.booster_remaining_uses
      } : undefined,
      updatedAt: data.updated_at
    };
  }
}

// ============================================
// RE-EXPORT TRANSACTION FUNCTIONS
// ============================================
export {
  getUserVaultProfile as getVaultProfileWithTransactions,
  createUserVaultProfile,
  updateVaultBalances,
  addUnlockedItem,
  logVaultTransaction,
  updateTransactionFulfillment,
  logXPTransaction,
  awardXP,
  getActiveCart,
  upsertCart,
  completeCart,
  activateBooster,
  checkBoosterExpiry,
  decrementBoosterUses,
} from './vaultTransactionRepo';
