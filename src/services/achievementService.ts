/**
 * MILESTONE SERVICE
 *
 * Phase 0.6 (gamification spine): achievements-as-separate-track are
 * folded into XP-level milestones, per KOOPE-MASTER-PLAN.md — "Gamification
 * collapses to one spine: XP -> Level -> Unlocks... achievements-as-
 * separate-track (fold into XP milestones)."
 *
 * What changed from the old AchievementService:
 * - No more 42-badge, 8-stat, 5-category tracking system fed by trackAction()
 *   calls scattered across a dozen screens. A milestone is reached purely by
 *   crossing an XP-level threshold — the same balance shown everywhere else
 *   in the app (useXPSystem.balance).
 * - No more parallel XP/level bookkeeping. The old service maintained its
 *   own `userStats.totalXP`, incremented by `achievement.xpReward` on
 *   unlock — a second, disconnected ledger that `syncXP()` only ever pulled
 *   FROM the real balance, never reconciled back INTO it. A user could
 *   unlock an achievement, see "+50 XP" in a toast, and that XP would never
 *   appear in the real balance or the level bar on the same screen. Fixed:
 *   milestones are recognition only now, no bonus XP of their own.
 *
 * The exported member name `achievementService` and type alias `Achievement`
 * are kept so existing imports (AchievementCard, AchievementUnlockModal)
 * don't need renaming — only their field usage changed (see those files).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

export type MilestoneRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Milestone {
  id: string;
  level: number;
  title: string;
  description: string;
  icon: string;
  rarity: MilestoneRarity;
  /** Current total XP (hydrated at read time, not persisted here). */
  progress: number;
  /** Total XP required to reach `level` — (level - 1) * 100. */
  requirement: number;
  unlocked: boolean;
  unlockedAt?: number;
}

// Back-compat alias: callers (AchievementCard, AchievementUnlockModal,
// AchievementsScreen) import `Achievement` — the shape is now a level
// milestone rather than a stat-tracked badge.
export type Achievement = Milestone;

const STORAGE_KEY = '@milestones_unlocked_at';

/** XP required for a given level. Level 1 is the floor (0 XP). */
export function xpForLevel(level: number): number {
  return Math.max(0, level - 1) * 100;
}

/**
 * Level for a given total XP. Matches the formula already live elsewhere
 * in the app (AchievementsScreen's hero display, the old
 * AchievementService.syncXP) — kept identical so nothing about how a
 * "level" is computed changes, only what happens at each one.
 */
export function levelForXP(totalXP: number): number {
  return Math.floor(totalXP / 100) + 1;
}

type MilestoneDef = Omit<Milestone, 'progress' | 'requirement' | 'unlocked' | 'unlockedAt'>;

const MILESTONE_DEFINITIONS: MilestoneDef[] = [
  {
    id: 'level_2',
    level: 2,
    title: 'First Pour',
    description: "You've started building your bar.",
    icon: 'wine-outline',
    rarity: 'common',
  },
  {
    id: 'level_5',
    level: 5,
    title: 'Building Habits',
    description: 'This is becoming a ritual, not a one-off.',
    icon: 'flame-outline',
    rarity: 'common',
  },
  {
    id: 'level_10',
    level: 10,
    title: 'Home Bartender',
    description: 'Real practice, real range behind the bar.',
    icon: 'wine',
    rarity: 'rare',
  },
  {
    id: 'level_15',
    level: 15,
    title: 'Recipe Explorer',
    description: "You've gone deep into the library.",
    icon: 'compass-outline',
    rarity: 'rare',
  },
  {
    id: 'level_20',
    level: 20,
    title: 'Seasoned Mixologist',
    description: 'Your shelf and your skill are catching up to each other.',
    icon: 'flask-outline',
    rarity: 'epic',
  },
  {
    id: 'level_25',
    level: 25,
    title: 'Spirit Archivist',
    description: 'Deep, deliberate knowledge of what you own.',
    icon: 'archive-outline',
    rarity: 'epic',
  },
  {
    id: 'level_30',
    level: 30,
    title: 'Master Mixologist',
    description: 'Craft as identity, not just a hobby.',
    icon: 'trophy-outline',
    rarity: 'legendary',
  },
  {
    id: 'level_40',
    level: 40,
    title: 'Century Club',
    description: 'Consistency most people never reach.',
    icon: 'bonfire-outline',
    rarity: 'legendary',
  },
  {
    id: 'level_50',
    level: 50,
    title: 'Recipe Legend',
    description: 'The top of the KŌOPE ladder — for now.',
    icon: 'star',
    rarity: 'legendary',
  },
];

class MilestoneService {
  private static instance: MilestoneService;
  // level -> unix ms timestamp the milestone was first crossed.
  private unlockedAt: Record<number, number> = {};
  private listeners: ((milestone: Milestone) => void)[] = [];
  private lastCheckedLevel = 1;
  private hydrated = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): MilestoneService {
    if (!MilestoneService.instance) {
      MilestoneService.instance = new MilestoneService();
    }
    return MilestoneService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.unlockedAt = JSON.parse(data);
      }
    } catch (error) {
      log.error('MilestoneService', 'Failed to load milestone unlock history', error);
    } finally {
      this.hydrated = true;
    }
  }

  /**
   * Called from useXPSystem.earnXP() with the new real balance — the only
   * place milestone-crossing is evaluated. Fire-and-forget by design (the
   * call site doesn't await it), matching the previous syncXP's contract.
   */
  public syncXP(totalXP: number): void {
    const currentLevel = levelForXP(totalXP);
    if (currentLevel <= this.lastCheckedLevel) {
      this.lastCheckedLevel = currentLevel;
      return;
    }

    const previousLevel = this.lastCheckedLevel;
    this.lastCheckedLevel = currentLevel;

    // Storage hasn't loaded yet (cold start racing the first earnXP call) —
    // skip firing unlock listeners this time rather than risk re-firing
    // already-seen milestones once `unlockedAt` loads.
    if (!this.hydrated) return;

    const newlyCrossed = MILESTONE_DEFINITIONS.filter(
      (m) => m.level > previousLevel && m.level <= currentLevel && !this.unlockedAt[m.level],
    );
    if (newlyCrossed.length === 0) return;

    const now = Date.now();
    for (const def of newlyCrossed) {
      this.unlockedAt[def.level] = now;
      const milestone = this.hydrate(def, totalXP);

      trackEvent(ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCKED, {
        [ANALYTICS_PROPS.ACHIEVEMENT_ID]: milestone.id,
        [ANALYTICS_PROPS.ACHIEVEMENT_TITLE]: milestone.title,
        [ANALYTICS_PROPS.ACHIEVEMENT_RARITY]: milestone.rarity,
        level: milestone.level,
        total_xp: totalXP,
      });

      log.info('MilestoneService', 'Milestone reached', {
        level: milestone.level,
        title: milestone.title,
      });

      this.listeners.forEach((listener) => listener(milestone));
    }

    this.save();
  }

  private hydrate(def: MilestoneDef, totalXP: number): Milestone {
    const requirement = xpForLevel(def.level);
    return {
      ...def,
      requirement,
      progress: Math.min(totalXP, requirement),
      unlocked: totalXP >= requirement,
      unlockedAt: this.unlockedAt[def.level],
    };
  }

  /** All milestones, hydrated against the given XP balance. */
  public getMilestones(totalXP: number): Milestone[] {
    return MILESTONE_DEFINITIONS.map((def) => this.hydrate(def, totalXP));
  }

  public addAchievementListener(listener: (milestone: Milestone) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlockedAt));
    } catch (error) {
      log.error('MilestoneService', 'Failed to save milestone unlock history', error);
    }
  }

  /** Reset (for testing). */
  public async resetAll(): Promise<void> {
    this.unlockedAt = {};
    this.lastCheckedLevel = 1;
    await this.save();
  }
}

export const achievementService = MilestoneService.getInstance();
