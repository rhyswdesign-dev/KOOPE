/**
 * REFERRAL SERVICE
 * Manages referral codes, tracking, and rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Platform } from 'react-native';
import { log } from '../lib/logger';

// Storage keys
const STORAGE_KEYS = {
  REFERRAL_CODE: '@referral_code',
  REFERRAL_STATS: '@referral_stats',
} as const;

// Reward tier interface
export interface RewardTier {
  id: string;
  referralsRequired: number;
  reward: string;
  description: string;
  icon: string;
  claimed: boolean;
}

// Referral stats interface
export interface ReferralStats {
  total: number;
  pending: number;
  confirmed: number;
  referrals: Array<{
    id: string;
    username: string;
    status: 'pending' | 'confirmed';
    date: string;
  }>;
}

// Default reward tiers
const REWARD_TIERS: RewardTier[] = [
  {
    id: 'tier_1',
    referralsRequired: 1,
    reward: '1 Week KOOPE+ Free',
    description: 'Get 1 week of KOOPE+ for free when your first friend joins',
    icon: 'gift-outline',
    claimed: false,
  },
  {
    id: 'tier_2',
    referralsRequired: 3,
    reward: '1 Month KOOPE+ Free',
    description: 'Unlock a full month of KOOPE+ with 3 referrals',
    icon: 'star-outline',
    claimed: false,
  },
  {
    id: 'tier_3',
    referralsRequired: 5,
    reward: '1 Week KOOPE PRO Free',
    description: 'Try KOOPE PRO free for a week with 5 referrals',
    icon: 'diamond-outline',
    claimed: false,
  },
  {
    id: 'tier_4',
    referralsRequired: 10,
    reward: 'Ambassador Badge',
    description: 'Earn the exclusive Ambassador badge and recognition',
    icon: 'ribbon-outline',
    claimed: false,
  },
];

/**
 * Generate a unique referral code
 */
const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'KOOPE-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Main referral service class
 */
class ReferralService {
  private static instance: ReferralService;
  private referralCode: string | null = null;
  private stats: ReferralStats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    referrals: [],
  };

  private constructor() {
    this.loadData();
  }

  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  /**
   * Load stored data
   */
  private async loadData(): Promise<void> {
    try {
      const [storedCode, storedStats] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.REFERRAL_CODE),
        AsyncStorage.getItem(STORAGE_KEYS.REFERRAL_STATS),
      ]);

      if (storedCode) {
        this.referralCode = storedCode;
      }

      if (storedStats) {
        this.stats = JSON.parse(storedStats);
      }
    } catch (error) {
      log.error('ReferralService', 'Failed to load referral data', { error });
    }
  }

  /**
   * Save stats to storage
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_STATS, JSON.stringify(this.stats));
    } catch (error) {
      log.error('ReferralService', 'Failed to save referral stats', { error });
    }
  }

  /**
   * Get or create a referral code
   */
  async getOrCreateReferralCode(): Promise<string> {
    if (this.referralCode) {
      return this.referralCode;
    }

    // Generate new code
    this.referralCode = generateReferralCode();

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, this.referralCode);
      log.info('ReferralService', 'Generated new referral code', { code: this.referralCode });
    } catch (error) {
      log.error('ReferralService', 'Failed to save referral code', { error });
    }

    return this.referralCode;
  }

  /**
   * Get current referral stats
   */
  async getReferralStats(): Promise<ReferralStats> {
    // In a real app, you would fetch this from a server
    // For now, return cached stats
    return this.stats;
  }

  /**
   * Get reward tiers with current progress
   */
  getRewardTiers(): RewardTier[] {
    return REWARD_TIERS.map((tier) => ({
      ...tier,
      claimed: this.stats.confirmed >= tier.referralsRequired,
    }));
  }

  /**
   * Get the next unclaimed reward tier
   */
  getNextRewardTier(): RewardTier | null {
    const tiers = this.getRewardTiers();
    return tiers.find((tier) => !tier.claimed) || null;
  }

  /**
   * Share referral code via system share sheet
   */
  async shareReferralCode(): Promise<boolean> {
    const code = await this.getOrCreateReferralCode();

    const message = Platform.select({
      ios: `Join me on KOOPE - the ultimate cocktail companion app! Use my referral code ${code} to get started. Download now: https://koope.app/invite/${code}`,
      android: `Join me on KOOPE - the ultimate cocktail companion app! Use my referral code ${code} to get started. Download now: https://koope.app/invite/${code}`,
      default: `Join me on KOOPE! Use code ${code} to get started.`,
    });

    try {
      const result = await Share.share({
        message,
        title: 'Invite Friends to KOOPE',
      });

      if (result.action === Share.sharedAction) {
        log.info('ReferralService', 'Referral code shared', { code });
        return true;
      }

      return false;
    } catch (error) {
      log.error('ReferralService', 'Failed to share referral code', { error });
      return false;
    }
  }

  /**
   * Record a new referral (called when someone uses your code)
   * In a real app, this would be called from a server webhook
   */
  async recordReferral(userId: string, username: string): Promise<void> {
    const newReferral = {
      id: userId,
      username,
      status: 'pending' as const,
      date: new Date().toISOString(),
    };

    this.stats.referrals.push(newReferral);
    this.stats.total++;
    this.stats.pending++;

    await this.saveStats();
    log.info('ReferralService', 'Recorded new referral', { userId, username });
  }

  /**
   * Confirm a pending referral
   * In a real app, this would be called from a server webhook
   */
  async confirmReferral(userId: string): Promise<void> {
    const referral = this.stats.referrals.find((r) => r.id === userId);
    if (referral && referral.status === 'pending') {
      referral.status = 'confirmed';
      this.stats.pending--;
      this.stats.confirmed++;

      await this.saveStats();
      log.info('ReferralService', 'Confirmed referral', { userId });
    }
  }

  /**
   * Get progress toward next reward
   */
  getProgressToNextReward(): { current: number; required: number; percentage: number } | null {
    const nextTier = this.getNextRewardTier();
    if (!nextTier) return null;

    return {
      current: this.stats.confirmed,
      required: nextTier.referralsRequired,
      percentage: Math.min((this.stats.confirmed / nextTier.referralsRequired) * 100, 100),
    };
  }
}

// Export singleton instance
export const referralService = ReferralService.getInstance();

/**
 * React hook for referral management
 */
export function useReferrals() {
  const [referralCode, setReferralCode] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<ReferralStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    referrals: [],
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [code, referralStats] = await Promise.all([
          referralService.getOrCreateReferralCode(),
          referralService.getReferralStats(),
        ]);
        setReferralCode(code);
        setStats(referralStats);
      } catch (error) {
        log.error('useReferrals', 'Failed to load referral data', { error });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const referralStats = await referralService.getReferralStats();
      setStats(referralStats);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    referralCode,
    stats,
    isLoading,
    rewardTiers: referralService.getRewardTiers(),
    nextReward: referralService.getNextRewardTier(),
    progress: referralService.getProgressToNextReward(),
    shareCode: referralService.shareReferralCode.bind(referralService),
    refresh,
  };
}

// Need to import React for the hook
import React from 'react';

export default referralService;
