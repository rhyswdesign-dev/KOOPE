/**
 * Vault Transaction Repository - Supabase Implementation
 * Handles all vault economy write operations
 */

import { supabase } from '../../lib/supabase';
import { log } from '../../lib/logger';
import { UserVaultProfile, UnlockedVaultItem } from '../../types/vault';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface VaultProfileRow {
  user_id: string;
  xp_balance: number;
  keys_balance: number;
  vault_cash_balance: number;
  total_xp_earned: number;
  total_xp_spent: number;
  total_keys_earned: number;
  total_keys_spent: number;
  total_cash_spent: number;
  unlocked_items: any[];
  created_at: string;
  updated_at: string;
}

interface VaultTransactionRow {
  id: string;
  user_id: string;
  transaction_type: 'unlock' | 'purchase' | 'refund';
  item_id: string;
  item_name: string | null;
  cycle_id: string | null;
  xp_spent: number;
  keys_spent: number;
  cash_spent: number;
  stripe_payment_intent_id: string | null;
  shipping_address: any;
  fulfillment_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null;
  tracking_number: string | null;
  created_at: string;
}

interface XPTransactionRow {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'spent' | 'bonus' | 'refund';
  amount: number;
  source: string;
  source_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

// ============================================
// USER VAULT PROFILE OPERATIONS
// ============================================

/**
 * Get user's vault profile
 */
export async function getUserVaultProfile(userId: string): Promise<UserVaultProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_vault_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile exists - create one
        return await createUserVaultProfile(userId);
      }
      throw error;
    }

    if (!data) return null;

    const row = data as VaultProfileRow;
    return {
      userId: row.user_id,
      xpBalance: row.xp_balance,
      keysBalance: row.keys_balance,
      vaultCashBalance: row.vault_cash_balance,
      totalXpEarned: row.total_xp_earned,
      totalXpSpent: row.total_xp_spent,
      totalKeysEarned: row.total_keys_earned,
      totalKeysSpent: row.total_keys_spent,
      totalCashSpent: row.total_cash_spent,
      unlockedItems: row.unlocked_items || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to get vault profile', error);
    throw new Error('Failed to get vault profile');
  }
}

/**
 * Create new user vault profile
 * Uses RPC function with SECURITY DEFINER to bypass RLS
 */
export async function createUserVaultProfile(userId: string): Promise<UserVaultProfile> {
  try {
    // Direct insert as fallback - RPC function may not exist
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_vault_profiles')
      .insert({
        user_id: userId,
        xp_balance: 0,
        keys_balance: 0,
        vault_cash_balance: 0,
        total_xp_earned: 0,
        total_xp_spent: 0,
        total_keys_earned: 0,
        total_keys_spent: 0,
        total_cash_spent: 0,
        unlocked_items: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      log.error('VaultTransactionRepo', 'Failed to create vault profile', error);
      throw error;
    }

    if (!data) throw new Error('No data returned from insert');

    const row = data as VaultProfileRow;
    return {
      userId: row.user_id,
      xpBalance: row.xp_balance || 0,
      keysBalance: row.keys_balance || 0,
      vaultCashBalance: row.vault_cash_balance || 0,
      totalXpEarned: row.total_xp_earned || 0,
      totalXpSpent: row.total_xp_spent || 0,
      totalKeysEarned: row.total_keys_earned || 0,
      totalKeysSpent: row.total_keys_spent || 0,
      totalCashSpent: row.total_cash_spent || 0,
      unlockedItems: row.unlocked_items || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to create vault profile', error);
    throw new Error('Failed to create vault profile');
  }
}

/**
 * Update user vault balances (for unlock transactions)
 */
export async function updateVaultBalances(
  userId: string,
  xpDelta: number,
  keysDelta: number,
  cashDelta: number
): Promise<void> {
  try {
    // Get current balances
    const { data: current } = await supabase
      .from('user_vault_profiles')
      .select('xp_balance, keys_balance, vault_cash_balance, total_xp_spent, total_keys_spent, total_cash_spent')
      .eq('user_id', userId)
      .single();

    if (!current) throw new Error('Vault profile not found');

    // Calculate new balances
    const newXP = current.xp_balance + xpDelta;
    const newKeys = current.keys_balance + keysDelta;
    const newCash = current.vault_cash_balance + cashDelta;

    // Update totals if spending (negative deltas)
    const newTotalXPSpent = xpDelta < 0 ? current.total_xp_spent + Math.abs(xpDelta) : current.total_xp_spent;
    const newTotalKeysSpent = keysDelta < 0 ? current.total_keys_spent + Math.abs(keysDelta) : current.total_keys_spent;
    const newTotalCashSpent = cashDelta < 0 ? current.total_cash_spent + Math.abs(cashDelta) : current.total_cash_spent;

    const { error } = await supabase
      .from('user_vault_profiles')
      .update({
        xp_balance: newXP,
        keys_balance: newKeys,
        vault_cash_balance: newCash,
        total_xp_spent: newTotalXPSpent,
        total_keys_spent: newTotalKeysSpent,
        total_cash_spent: newTotalCashSpent,
      })
      .eq('user_id', userId);

    if (error) throw error;

    log.info('VaultTransactionRepo', 'Vault balances updated', {
      userId,
      xpDelta,
      keysDelta,
      cashDelta,
    });
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to update vault balances', error);
    throw new Error('Failed to update vault balances');
  }
}

/**
 * Add unlocked item to user's profile
 */
export async function addUnlockedItem(userId: string, unlockedItem: UnlockedVaultItem): Promise<void> {
  try {
    // Get current unlocked items
    const { data: profile } = await supabase
      .from('user_vault_profiles')
      .select('unlocked_items')
      .eq('user_id', userId)
      .single();

    if (!profile) throw new Error('Vault profile not found');

    const unlockedItems = profile.unlocked_items || [];
    unlockedItems.push(unlockedItem);

    const { error } = await supabase
      .from('user_vault_profiles')
      .update({ unlocked_items: unlockedItems })
      .eq('user_id', userId);

    if (error) throw error;

    log.info('VaultTransactionRepo', 'Unlocked item added', { userId, itemId: unlockedItem.itemId });
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to add unlocked item', error);
    throw new Error('Failed to add unlocked item');
  }
}

// ============================================
// VAULT TRANSACTION LOGGING
// ============================================

/**
 * Log vault unlock transaction
 */
export async function logVaultTransaction(params: {
  userId: string;
  transactionType?: 'unlock' | 'purchase_keys' | 'refund';
  itemId: string;
  itemName?: string;
  cycleId?: string;
  xpCost?: number;
  keysCost?: number;
  cashCost?: number;
  stripePaymentIntentId?: string;
  shippingAddress?: any;
}): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('vault_transactions')
      .insert({
        user_id: params.userId,
        transaction_type: params.transactionType || 'unlock',
        item_id: params.itemId,
        item_name: params.itemName || '',
        cycle_id: params.cycleId || null,
        xp_spent: params.xpCost || 0,
        keys_spent: params.keysCost || 0,
        cash_spent: params.cashCost || 0,
        stripe_payment_intent_id: params.stripePaymentIntentId || null,
        shipping_address: params.shippingAddress || null,
        fulfillment_status: params.shippingAddress ? 'pending' : null,
      })
      .select('id')
      .single();

    if (error) throw error;

    log.info('VaultTransactionRepo', 'Vault transaction logged', {
      transactionId: data.id,
      userId: params.userId,
      itemId: params.itemId,
    });

    return data.id;
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to log vault transaction', error);
    throw new Error('Failed to log vault transaction');
  }
}

/**
 * Update transaction fulfillment status
 */
export async function updateTransactionFulfillment(
  transactionId: string,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  trackingNumber?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('vault_transactions')
      .update({
        fulfillment_status: status,
        tracking_number: trackingNumber,
      })
      .eq('id', transactionId);

    if (error) throw error;

    log.info('VaultTransactionRepo', 'Transaction fulfillment updated', {
      transactionId,
      status,
    });
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to update transaction fulfillment', error);
    throw new Error('Failed to update transaction fulfillment');
  }
}

// ============================================
// XP TRANSACTION LOGGING
// ============================================

/**
 * Log XP transaction (earned or spent)
 */
export async function logXPTransaction(params: {
  userId: string;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  amount: number;
  source: string;
  sourceId?: string;
  description?: string;
  metadata?: any;
}): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('xp_transactions')
      .insert({
        user_id: params.userId,
        transaction_type: params.type,
        amount: params.amount,
        source: params.source,
        source_id: params.sourceId,
        description: params.description,
        metadata: params.metadata,
      })
      .select('id')
      .single();

    if (error) throw error;

    log.info('VaultTransactionRepo', 'XP transaction logged', {
      transactionId: data.id,
      userId: params.userId,
      amount: params.amount,
      source: params.source,
    });

    return data.id;
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to log XP transaction', error);
    throw new Error('Failed to log XP transaction');
  }
}

/**
 * Award XP to user (convenience method)
 */
export async function awardXP(
  userId: string,
  amount: number,
  source: string,
  sourceId?: string,
  multiplier: number = 1
): Promise<void> {
  try {
    const finalAmount = Math.floor(amount * multiplier);

    // Update user's XP balance
    const { data: current } = await supabase
      .from('user_vault_profiles')
      .select('xp_balance, total_xp_earned')
      .eq('user_id', userId)
      .single();

    if (!current) throw new Error('Vault profile not found');

    await supabase
      .from('user_vault_profiles')
      .update({
        xp_balance: current.xp_balance + finalAmount,
        total_xp_earned: current.total_xp_earned + finalAmount,
      })
      .eq('user_id', userId);

    // Log the transaction
    await logXPTransaction({
      userId,
      type: 'earned',
      amount: finalAmount,
      source,
      sourceId,
      description: multiplier > 1 ? `${amount} XP × ${multiplier}x multiplier` : undefined,
      metadata: { multiplier },
    });

    log.info('VaultTransactionRepo', 'XP awarded', { userId, amount: finalAmount, source });
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to award XP', error);
    throw new Error('Failed to award XP');
  }
}

// ============================================
// CART OPERATIONS
// ============================================

/**
 * Get active cart for user
 */
export async function getActiveCart(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('vault_carts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to get active cart', error);
    return null;
  }
}

/**
 * Create or update cart
 */
export async function upsertCart(
  userId: string,
  items: any[],
  totals: { subtotal: number; tax: number; total: number }
): Promise<string> {
  try {
    const existingCart = await getActiveCart(userId);

    if (existingCart) {
      // Update existing cart
      await supabase
        .from('vault_carts')
        .update({
          items,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
        })
        .eq('id', existingCart.id);

      return existingCart.id;
    } else {
      // Create new cart
      const { data, error } = await supabase
        .from('vault_carts')
        .insert({
          user_id: userId,
          items,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    }
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to upsert cart', error);
    throw new Error('Failed to upsert cart');
  }
}

/**
 * Mark cart as completed
 */
export async function completeCart(cartId: string): Promise<void> {
  try {
    await supabase
      .from('vault_carts')
      .update({ status: 'completed' })
      .eq('id', cartId);
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to complete cart', error);
    throw new Error('Failed to complete cart');
  }
}

// ============================================
// BOOSTER OPERATIONS
// ============================================

/**
 * Activate a booster for a user
 */
export async function activateBooster(
  userId: string,
  boosterType: string,
  multiplier: number,
  durationHours: number,
  remainingUses?: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('activate_user_booster', {
      p_user_id: userId,
      p_booster_type: boosterType,
      p_multiplier: multiplier,
      p_duration_hours: durationHours,
      p_remaining_uses: remainingUses || null
    });

    if (error) {
      log.error('VaultTransactionRepo', 'Error activating booster', error);
      return false;
    }

    if (data && !data.success) {
      log.warn('VaultTransactionRepo', 'Booster activation failed', { userId, error: data.error });
      return false;
    }

    log.info('VaultTransactionRepo', 'Booster activated', {
      userId,
      boosterType,
      multiplier,
      expiresAt: data.expires_at
    });

    return true;
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to activate booster', error);
    return false;
  }
}

/**
 * Check if user's booster has expired and clear it
 */
export async function checkBoosterExpiry(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_booster_expiry', {
      p_user_id: userId
    });

    if (error) {
      log.error('VaultTransactionRepo', 'Error checking booster expiry', error);
      return false;
    }

    return data || false; // Returns true if booster was expired/cleared
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to check booster expiry', error);
    return false;
  }
}

/**
 * Decrement booster uses (for use-based boosters)
 */
export async function decrementBoosterUses(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('decrement_booster_uses', {
      p_user_id: userId
    });

    if (error) {
      log.error('VaultTransactionRepo', 'Error decrementing booster uses', error);
      return false;
    }

    return data || false;
  } catch (error) {
    log.error('VaultTransactionRepo', 'Failed to decrement booster uses', error);
    return false;
  }
}
