/**
 * KOOPE PAYWALL TRIGGERS HOOK
 * Production-ready subscription gating system
 *
 * Provides modular gate functions for all KOOPE features
 * Each gate checks entitlement and shows paywall if needed
 */

import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Alert } from 'react-native';

interface PaywallTriggers {
  aiGate: (onSuccess?: () => void) => boolean;
  lessonGate: (lessonIndex: number, onSuccess?: () => void) => boolean;
  inventoryGate: (currentCount: number, onSuccess?: () => void) => boolean;
  scanGate: (monthlyScans: number, onSuccess?: () => void) => boolean;
  saveGate: (savedCount: number, onSuccess?: () => void) => boolean;
  filterGate: (onSuccess?: () => void) => boolean;
  tasteMatchGate: (onSuccess?: () => void) => boolean;
  hostingGate: (onSuccess?: () => void) => boolean;
  batchGate: (onSuccess?: () => void) => boolean;
  vaultGate: (isPro?: boolean, onSuccess?: () => void) => boolean;
  seasonalGate: (onSuccess?: () => void) => boolean;
  proGate: (featureName: string, onSuccess?: () => void) => boolean;
  xpGate: (currentXP: number, onSuccess?: () => void) => boolean;
}

interface UserTierData {
  tier: 'free' | 'koope_plus' | 'koope_pro';
  freeAIUses?: number;
  inventoryCount?: number;
  xp?: number;
}

const XP_LEVEL_4_THRESHOLD = 1250;
const FREE_AI_LIMIT = 3;
const FREE_INVENTORY_LIMIT = 10;
const FREE_SCANS_PER_MONTH = Infinity;
const FREE_SAVED_COCKTAILS_LIMIT = 0;
const FREE_LESSON_LIMIT = 1; // Only Intro lesson (index 0, 1)

/**
 * Hook that provides all paywall gate functions
 *
 * @returns Object with gate functions for each feature
 */
export function usePaywallTriggers(): PaywallTriggers {
  const navigation = useNavigation<any>();
  const { isKoopePro, isPro } = useSubscription();

  /**
   * Determine user tier based on subscription status
   */
  const getUserTier = (): 'free' | 'koope_plus' | 'koope_pro' => {
    if (isPro) return 'koope_pro';
    if (isKoopePro) return 'koope_plus';
    return 'free';
  };

  /**
   * Show paywall with custom message
   */
  const showPaywall = (title: string, message: string, tier: 'koope_plus' | 'koope_pro' = 'koope_plus') => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: tier === 'koope_pro' ? 'Upgrade to PRO' : 'Upgrade to KOOPE+',
          onPress: () => {
            navigation.navigate('Paywall', {
              displayCloseButton: true,
              offering: tier === 'koope_pro' ? 'pro' : null
            });
          },
        },
      ]
    );
  };

  /**
   * 1. AI GATE (Highest Conversion)
   * FREE users get 3 AI messages/day
   * After that, block and show paywall
   */
  const aiGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    // KOOPE+ and PRO have unlimited AI
    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    // For FREE users, check AI usage
    // Note: You'll need to pass freeAIUses from your state
    // This is a placeholder - integrate with your actual AI usage counter
    showPaywall(
      'Unlock Unlimited AI',
      'Unlock unlimited AI bartender insight with KOOPE+.'
    );
    return false;
  };

  /**
   * 2. LESSON UNLOCK GATE
   * FREE users only get Intro lessons (index 0, 1)
   * Any attempt to open Lesson #2+ triggers paywall
   */
  const lessonGate = (lessonIndex: number, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    // KOOPE+ and PRO have all lessons
    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    // FREE users only get lessons 0 and 1 (Intro)
    if (lessonIndex > FREE_LESSON_LIMIT) {
      showPaywall(
        'Premium Lesson',
        'Unlock all advanced lessons and masterclasses with KOOPE+.'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 3. INVENTORY LIMIT TRIGGER
   * FREE = 15 bottles max
   * KOOPE+ = unlimited
   * PRO = unlimited
   */
  const inventoryGate = (currentCount: number, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    if (currentCount >= FREE_INVENTORY_LIMIT) {
      showPaywall(
        'Inventory Full',
        `You've hit your ${FREE_INVENTORY_LIMIT}-bottle limit. Upgrade to KŌOPE+ for unlimited inventory.`
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 3b. SCAN LIMIT TRIGGER
   * FREE = 15 scans/month
   * KOOPE+ = unlimited
   * PRO = unlimited
   */
  const scanGate = (monthlyScans: number, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    if (monthlyScans >= FREE_SCANS_PER_MONTH) {
      showPaywall(
        'Scan Limit Reached',
        `Starter Bar includes ${FREE_SCANS_PER_MONTH} scans per month. Upgrade to KOOPE+ for unlimited scanning.`
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 3c. SAVE LIMIT TRIGGER
   * FREE = 5 saved cocktails
   * KOOPE+ = unlimited
   * PRO = unlimited
   */
  const saveGate = (savedCount: number, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    if (savedCount >= FREE_SAVED_COCKTAILS_LIMIT) {
      showPaywall(
        'Save Cocktails',
        'Saving cocktails is a KŌOPE+ feature. Upgrade to save unlimited favorites.'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 3d. ADVANCED FILTER GATE
   * FREE = spirit filter only
   * KOOPE+ = advanced filters (≤5 ingredients, low sugar, spirit-forward)
   * PRO = advanced + predictive
   */
  const filterGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    showPaywall(
      'Advanced Filters',
      'Filter by ingredient count, low sugar, and spirit-forward. Upgrade to KOOPE+.'
    );
    return false;
  };

  /**
   * 3e. TASTE MATCH GATE
   * FREE = no Taste Match %
   * KOOPE+ = basic Taste Match %
   * PRO = full Taste Graph
   */
  const tasteMatchGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'free') {
      onSuccess?.();
      return true;
    }

    showPaywall(
      'Unlock Taste Match',
      'See how well each cocktail matches your palate. Upgrade to KOOPE+.'
    );
    return false;
  };

  /**
   * 3f. HOSTING GATE
   * FREE = manual scaling only
   * KOOPE+ = party scaling calculator
   * PRO = full hosting planner
   */
  const hostingGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier === 'free') {
      showPaywall(
        'Party Planning',
        'Scale recipes for any crowd and export shopping lists. Upgrade to KOOPE+.'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 3g. BATCH OPTIMIZER GATE (PRO only)
   * FREE = no
   * KOOPE+ = no
   * PRO = batch optimizer, guest menu, prep timeline
   */
  const batchGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'koope_pro') {
      showPaywall(
        'Hosting Intelligence',
        'Smart batch optimization, guest-based menus, and prep timelines. Upgrade to KOOPE PRO.',
        'koope_pro'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 4. VAULT ACCESS TRIGGER
   * FREE = Earn-only (always blocked)
   * KOOPE+ = Standard Vault access
   * PRO = Early Access + free monthly key
   *
   * @param isPro - If true, requires PRO tier
   */
  const vaultGate = (isProOnly: boolean = false, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    // FREE users can't access Vault at all
    if (tier === 'free') {
      showPaywall(
        'Unlock the Vault',
        'The Vault is exclusive to KOOPE+ members. Unlock rare recipes and seasonal content.'
      );
      return false;
    }

    // PRO-only items require PRO tier
    if (isProOnly && tier !== 'koope_pro') {
      showPaywall(
        'PRO Exclusive',
        'This Vault item is PRO exclusive. Upgrade to KOOPE PRO for early access and a free monthly key.',
        'koope_pro'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 5. SEASONAL DROP TRIGGER
   * Seasonal cocktails & themes require at least KOOPE+
   */
  const seasonalGate = (onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier === 'free') {
      showPaywall(
        'Seasonal Content',
        'Unlock monthly seasonal drops with exclusive cocktails and themes. Upgrade to KOOPE+.'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 6. PRO-ONLY TOOLS TRIGGER
   * Features that require PRO:
   * - Smart inventory suggestions
   * - Advanced AI (memory)
   * - Creator tools
   * - Menu exporter
   * - Custom themes
   */
  const proGate = (featureName: string, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier !== 'koope_pro') {
      showPaywall(
        'PRO Feature',
        `${featureName} is a KOOPE PRO exclusive feature. Upgrade to unlock advanced tools and creator features.`,
        'koope_pro'
      );
      return false;
    }

    onSuccess?.();
    return true;
  };

  /**
   * 7. XP LEVEL GATE (Delayed Upsell)
   * When user hits Level 4, show upgrade encouragement
   * This is a "soft" gate - shows modal but doesn't block
   */
  const xpGate = (currentXP: number, onSuccess?: () => void): boolean => {
    const tier = getUserTier();

    if (tier === 'free' && currentXP >= XP_LEVEL_4_THRESHOLD) {
      Alert.alert(
        'You\'ve Leveled Up!',
        'You\'ve reached a new level. Unlock deeper mastery with KOOPE+.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => onSuccess?.(),
          },
          {
            text: 'Upgrade to KOOPE+',
            onPress: () => {
              navigation.navigate('Paywall', {
                displayCloseButton: true
              });
            },
          },
        ]
      );
      // Don't block - this is a soft upsell
      return true;
    }

    onSuccess?.();
    return true;
  };

  return {
    aiGate,
    lessonGate,
    inventoryGate,
    scanGate,
    saveGate,
    filterGate,
    tasteMatchGate,
    hostingGate,
    batchGate,
    vaultGate,
    seasonalGate,
    proGate,
    xpGate,
  };
}

/**
 * HELPER: Check AI usage limit
 * Call this before sending AI message
 *
 * @param freeAIUses - Current AI usage count for FREE users
 * @returns true if user can proceed, false if blocked
 */
export function checkAIUsageLimit(freeAIUses: number, tier: 'free' | 'koope_plus' | 'koope_pro'): boolean {
  if (tier !== 'free') return true;
  return freeAIUses < FREE_AI_LIMIT;
}

/**
 * HELPER: Check inventory capacity
 * Call this before adding inventory item
 *
 * @param inventoryCount - Current inventory count
 * @param tier - User tier
 * @returns true if user can add item, false if at limit
 */
export function checkInventoryCapacity(inventoryCount: number, tier: 'free' | 'koope_plus' | 'koope_pro'): boolean {
  if (tier !== 'free') return true;
  return inventoryCount < FREE_INVENTORY_LIMIT;
}

/**
 * CONSTANTS EXPORT
 * Use these in your UI to show limits
 */
/**
 * HELPER: Check scan capacity
 */
export function checkScanCapacity(monthlyScans: number, tier: 'free' | 'koope_plus' | 'koope_pro'): boolean {
  if (tier !== 'free') return true;
  return monthlyScans < FREE_SCANS_PER_MONTH;
}

/**
 * HELPER: Check save capacity
 */
export function checkSaveCapacity(savedCount: number, tier: 'free' | 'koope_plus' | 'koope_pro'): boolean {
  if (tier !== 'free') return true;
  return savedCount < FREE_SAVED_COCKTAILS_LIMIT;
}

/**
 * CONSTANTS EXPORT
 * Use these in your UI to show limits
 */
export const SUBSCRIPTION_LIMITS = {
  FREE_AI_LIMIT,
  FREE_INVENTORY_LIMIT,
  FREE_SCANS_PER_MONTH,
  FREE_SAVED_COCKTAILS_LIMIT,
  FREE_LESSON_LIMIT,
  XP_LEVEL_4_THRESHOLD,
} as const;
