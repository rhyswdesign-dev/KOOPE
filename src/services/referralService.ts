/**
 * REFERRAL SERVICE
 * Manages referral codes, tracking, and rewards.
 *
 * Backend strategy:
 * - Prefer Supabase tables when available
 * - Fall back to local storage if referral tables are not yet provisioned
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Platform } from 'react-native';
import { log } from '../lib/logger';
import { supabase } from '../lib/supabase';

// Storage keys
const STORAGE_KEYS = {
  REFERRAL_CODE: '@referral_code',
  REFERRAL_STATS: '@referral_stats',
} as const;

const REFERRAL_TABLES = {
  CODES: 'referral_codes',
  EVENTS: 'referrals',
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

function isTableMissingError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('relation')
  );
}

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
  private backendAvailable = true;

  private constructor() {
    this.loadData();
  }

  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return data.user.id;
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

  private async saveCode(code: string): Promise<void> {
    this.referralCode = code;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, code);
    } catch (error) {
      log.error('ReferralService', 'Failed to persist referral code', { error });
    }
  }

  private markBackendUnavailable(error: any) {
    if (isTableMissingError(error)) {
      this.backendAvailable = false;
      log.warn('ReferralService', 'Referral tables unavailable; using local fallback');
    }
  }

  /**
   * Get or create a referral code
   */
  async getOrCreateReferralCode(): Promise<string> {
    if (this.referralCode) {
      return this.referralCode;
    }

    const userId = await this.getCurrentUserId();

    if (this.backendAvailable && userId) {
      try {
        const { data, error } = await supabase
          .from(REFERRAL_TABLES.CODES)
          .select('code')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data?.code) {
          await this.saveCode(data.code);
          return data.code;
        }

        const generated = generateReferralCode();
        const { error: insertError } = await supabase
          .from(REFERRAL_TABLES.CODES)
          .insert({
            user_id: userId,
            code: generated,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        await this.saveCode(generated);
        log.info('ReferralService', 'Created referral code in backend', { userId });
        return generated;
      } catch (error) {
        this.markBackendUnavailable(error);
        log.warn('ReferralService', 'Falling back to local referral code generation', { error });
      }
    }

    const generated = generateReferralCode();
    await this.saveCode(generated);
    log.info('ReferralService', 'Generated local referral code', { code: generated });
    return generated;
  }

  /**
   * Get current referral stats
   */
  async getReferralStats(): Promise<ReferralStats> {
    const userId = await this.getCurrentUserId();

    if (this.backendAvailable && userId) {
      try {
        const { data, error } = await supabase
          .from(REFERRAL_TABLES.EVENTS)
          .select('id,referred_username,status,created_at')
          .eq('referrer_user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const referrals = (data || []).map((row: any) => ({
          id: row.id,
          username: row.referred_username || 'New User',
          status: row.status === 'confirmed' ? 'confirmed' : 'pending',
          date: row.created_at || new Date().toISOString(),
        }));

        const confirmed = referrals.filter((r) => r.status === 'confirmed').length;
        const pending = referrals.filter((r) => r.status === 'pending').length;

        this.stats = {
          total: referrals.length,
          pending,
          confirmed,
          referrals,
        };

        await this.saveStats();
        return this.stats;
      } catch (error) {
        this.markBackendUnavailable(error);
        log.warn('ReferralService', 'Falling back to local referral stats', { error });
      }
    }

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

    const currentUserId = await this.getCurrentUserId();
    if (this.backendAvailable && currentUserId) {
      try {
        const { error } = await supabase.from(REFERRAL_TABLES.EVENTS).insert({
          referrer_user_id: currentUserId,
          referred_user_id: userId,
          referred_username: username,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      } catch (error) {
        this.markBackendUnavailable(error);
        log.warn('ReferralService', 'Failed to persist referral event to backend', { error });
      }
    }

    log.info('ReferralService', 'Recorded referral', { userId, username });
  }

  /**
   * Confirm a pending referral
   */
  async confirmReferral(userId: string): Promise<void> {
    const referral = this.stats.referrals.find((r) => r.id === userId);
    if (referral && referral.status === 'pending') {
      referral.status = 'confirmed';
      this.stats.pending--;
      this.stats.confirmed++;
      await this.saveStats();
    }

    if (this.backendAvailable) {
      try {
        const { error } = await supabase
          .from(REFERRAL_TABLES.EVENTS)
          .update({ status: 'confirmed' })
          .eq('referred_user_id', userId)
          .eq('status', 'pending');

        if (error) throw error;
      } catch (error) {
        this.markBackendUnavailable(error);
        log.warn('ReferralService', 'Failed to confirm referral in backend', { error });
      }
    }

    log.info('ReferralService', 'Confirmed referral', { userId });
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

export default referralService;
