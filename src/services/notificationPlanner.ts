/**
 * NOTIFICATION PLANNER — the single frequency governor
 *
 * KOOPE-NOTIFICATION-PLAYBOOK.md §3 Phase A, step 2:
 *   "On every app open (and on significant state change): compute the user's
 *    next 7 days of L2/L3/L4 sends from local state, apply the budget rules
 *    (≤4/wk, ≤1/day, none-if-active-today via cancel-on-open), cancel-and-
 *    reschedule the whole window. One planner, one place where budget is
 *    enforced; individual features stop calling scheduleNotificationAsync
 *    directly."
 *
 * Standing decision 1: "The frequency governor is code, not policy. Features
 * request sends; the planner decides."
 *
 * Scope boundary — L1 transactional sends (trial lifecycle, low stock, XP/cert
 * celebrations, hosting countdown) are uncapped and stay on
 * `notificationService` directly. They are never planned here and the planner's
 * cancel pass never touches them (it only cancels its own `plan_` prefix).
 *
 * Phase A limitation, accepted in the Playbook: a user who never opens the app
 * runs dry after ~7 days. Server push (Phase B) is deliberately NOT built.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { log } from '../lib/logger';
import {
  applyBudget,
  nextTimeOfDay,
  nextWeekdayAt,
  toLocalDayKey,
  type BudgetContext,
  type PlannedSend,
} from './notificationBudget';
import { notificationService, type NotificationType } from './notificationService';
import { HomeBarService, type BarIngredient } from './homeBarService';
import { streakService } from './streakService';
import { hasMadeSomethingThisWeek } from './makeLogService';
import { HOSTING_PLANS_STORAGE_KEY } from './hostingPlannerService';

/** Identifier prefix owned by the planner — the cancel pass keys off this. */
const PLAN_PREFIX = 'plan_';

const STORAGE_KEYS = {
  /** Local yyyy-mm-dd days the user opened the app (last 14 kept). */
  ACTIVE_DAYS: 'notification_planner_active_days',
  /** First app open we ever saw — drives the onboarding L4 sequence. */
  FIRST_OPEN: 'notification_planner_first_open',
  /** Last completed planner run, for the "significant state change" throttle. */
  LAST_RUN: 'notification_planner_last_run',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_DAYS_KEPT = 14;

/** Local state the candidate builder reads. Pure input — easy to fake in tests. */
export interface PlannerState {
  now: number;
  firstOpenAt: number;
  activeDays: string[];
  /** made_events says the user has logged a make since Monday. */
  madeSomethingThisWeek: boolean;
  /** Current lesson streak — the protector only fires at >= 3. */
  currentStreak: number;
  /** Has the user ever saved a hosting plan? Gates the weekend host seed. */
  hasHosted: boolean;
  /** The user's shelf, for the Friday prompt's personalization. */
  shelf: string[];
}

// ============================================================================
// FRIDAY MAKER PROMPT — personalization
// ============================================================================

/**
 * Classic three-or-fewer-bottle cocktails, matched against the user's shelf at
 * scheduling time. Deliberately a small local table rather than a catalog
 * fetch: the planner runs on app open and must not depend on the network to
 * produce a body line. Ordered most-distinctive first — the first full match
 * wins, so "Negroni" beats "Gin & Tonic" for a shelf that has both.
 */
const SHELF_MATCHES: { drink: string; needs: string[] }[] = [
  { drink: 'Negroni', needs: ['gin', 'campari', 'sweet vermouth'] },
  { drink: 'Boulevardier', needs: ['bourbon', 'campari', 'sweet vermouth'] },
  { drink: 'Manhattan', needs: ['rye', 'sweet vermouth'] },
  { drink: 'Martini', needs: ['gin', 'dry vermouth'] },
  { drink: 'Old Fashioned', needs: ['bourbon', 'bitters'] },
  { drink: 'Daiquiri', needs: ['rum', 'lime'] },
  { drink: 'Margarita', needs: ['tequila', 'triple sec', 'lime'] },
  { drink: 'Whiskey Sour', needs: ['bourbon', 'lemon'] },
  { drink: 'Gimlet', needs: ['gin', 'lime'] },
  { drink: 'Moscow Mule', needs: ['vodka', 'ginger beer', 'lime'] },
  { drink: 'Americano', needs: ['campari', 'sweet vermouth'] },
];

function shelfHas(shelf: string[], ingredient: string): boolean {
  return shelf.some((item) => item.includes(ingredient));
}

/**
 * Find the best drink the user's shelf already covers, or null.
 * Exported for tests — this is the line that makes the Friday send work.
 */
export function pickShelfMatch(shelf: string[]): { drink: string; needs: string[] } | null {
  const normalized = shelf.map((item) => item.toLowerCase().trim()).filter(Boolean);
  if (normalized.length === 0) return null;
  return (
    SHELF_MATCHES.find((match) => match.needs.every((need) => shelfHas(normalized, need))) ?? null
  );
}

/**
 * The Friday body line. Playbook §4's reference rewrite:
 * "Friday. You've got gin, sweet vermouth, and Campari — that's a Negroni,
 *  and you know it."
 */
export function buildFridayBody(shelf: string[]): string {
  const match = pickShelfMatch(shelf);
  if (!match) {
    return "Two bottles and five minutes is usually all it takes. Here's what your shelf can do.";
  }

  const listed =
    match.needs.length > 1
      ? `${match.needs.slice(0, -1).join(', ')}, and ${match.needs[match.needs.length - 1]}`
      : match.needs[0];

  return `You've got ${listed} — that's a ${match.drink}, and you know it.`;
}

// ============================================================================
// CANDIDATES
// ============================================================================

/**
 * Build every send the app would *like* to make over the next seven days.
 * Pure: no IO, no clock reads beyond `state.now`. The budget then decides
 * which of these actually get scheduled.
 */
export function buildCandidates(state: PlannerState): PlannedSend[] {
  const candidates: PlannedSend[] = [];
  const daysSinceFirstOpen = Math.floor((state.now - state.firstOpenAt) / DAY_MS);
  const inOnboardingWeek = daysSinceFirstOpen < 7;

  // --- L4 lifecycle -------------------------------------------------------
  // Onboarding D1 / D3 / D7, anchored to first open. The budget's per-layer
  // cap keeps at most one of these per week.
  if (inOnboardingWeek) {
    candidates.push({
      key: `${PLAN_PREFIX}onboarding_d1`,
      type: 'onboarding',
      layer: 'L4',
      kind: 'onboarding',
      slot: 'onboarding_d1',
      fireAt: state.firstOpenAt + 1 * DAY_MS,
      title: 'Your bar is set up',
      body: "Here's what it can already make — no shopping required.",
      actionUrl: 'koope://what-can-i-make',
    });
    candidates.push({
      key: `${PLAN_PREFIX}onboarding_d3`,
      type: 'onboarding',
      layer: 'L4',
      kind: 'onboarding',
      slot: 'onboarding_d3',
      fireAt: state.firstOpenAt + 3 * DAY_MS,
      title: 'One more bottle on the shelf',
      body: 'Scan what you already own and watch the makeable list grow.',
      actionUrl: 'koope://shelf',
    });
    candidates.push({
      key: `${PLAN_PREFIX}onboarding_d7`,
      type: 'onboarding',
      layer: 'L4',
      kind: 'onboarding',
      slot: 'onboarding_d7',
      fireAt: state.firstOpenAt + 7 * DAY_MS,
      title: 'Wednesdays, from now on',
      body: 'Your weekly drop picks recipes off your own shelf. First one lands this week.',
      actionUrl: 'koope://vault',
    });
  }

  // Winback: scheduled forward from *this* open, so it only ever fires if the
  // user stops opening the app (each open reschedules the whole window).
  // Playbook: never more than 3 winback sends per lapse; the 14d and 30d steps
  // fall outside the 7-day window and are re-derived on the next run.
  candidates.push({
    key: `${PLAN_PREFIX}winback_d7`,
    type: 'winback',
    layer: 'L4',
    kind: 'winback',
    slot: 'winback_d7',
    fireAt: state.now + 7 * DAY_MS,
    title: 'Three new recipes match your shelf',
    body: 'Nothing to buy. Your bottles already cover them.',
    actionUrl: 'koope://what-can-i-make',
  });

  // --- L3 appointment content --------------------------------------------
  // Wed 5pm, same slot every week — the appointment half of the KOOPE week.
  candidates.push({
    key: `${PLAN_PREFIX}weekly_drop`,
    type: 'weekly_drop',
    layer: 'L3',
    slot: 'wed_1700',
    fireAt: nextWeekdayAt(state.now, 3, 17, 0),
    title: 'This week’s drop',
    body: 'New recipes picked against your shelf. Wednesday, as always.',
    actionUrl: 'koope://vault',
  });

  // --- L2 habit loop ------------------------------------------------------
  // The Friday maker prompt: the single most important habit send, because it
  // manufactures the Weekly Makers North Star directly.
  if (!state.madeSomethingThisWeek) {
    candidates.push({
      key: `${PLAN_PREFIX}friday_maker`,
      type: 'friday_maker_prompt',
      layer: 'L2',
      slot: 'fri_1630',
      fireAt: nextWeekdayAt(state.now, 5, 16, 30),
      title: 'Friday',
      body: buildFridayBody(state.shelf),
      actionUrl: 'koope://what-can-i-make',
    });
  }

  // Weekend host seed — only for people who have actually hosted.
  if (state.hasHosted) {
    candidates.push({
      key: `${PLAN_PREFIX}weekend_host_seed`,
      type: 'weekend_host_seed',
      layer: 'L2',
      slot: 'thu_1800',
      fireAt: nextWeekdayAt(state.now, 4, 18, 0),
      title: 'Having anyone over this weekend?',
      body: 'Pick a night and the menu, list, and timeline build themselves.',
      actionUrl: 'koope://hosting',
    });
  }

  // Streak protector — only worth guarding at 3+ days. Playbook §4 rewrite of
  // "🔥 Don't break your streak!": pride and momentum, not loss-aversion guilt.
  if (state.currentStreak >= 3) {
    candidates.push({
      key: `${PLAN_PREFIX}streak_protector`,
      type: 'streak_reminder',
      layer: 'L2',
      slot: 'evening_1900',
      fireAt: nextTimeOfDay(state.now, 19, 0),
      title: `Day ${state.currentStreak}`,
      body: "The Old Fashioned isn't going to stir itself.",
      actionUrl: 'koope://lessons',
    });
  }

  return candidates;
}

// ============================================================================
// PLANNER
// ============================================================================

// Below this, a run is a no-op rather than doing the full AsyncStorage +
// Supabase + native cancel/reschedule chain again. Without it, rapid AppState
// oscillation (e.g. a simulator losing/regaining focus every few seconds while
// alt-tabbing to a log viewer) fires that whole chain on every single
// transition — the reentrancy guard below only stops overlapping runs, not
// frequent sequential ones, and enough of those stacked up visibly janks the
// JS thread and the native notifications bridge.
const MIN_RERUN_INTERVAL_MS = 60_000;

class NotificationPlanner {
  private running = false;
  private lastRunAt = 0;

  /**
   * Record that the user opened the app today. Feeds the governor's
   * "none on a day they already opened the app" rule.
   */
  private async recordActiveDay(now: number): Promise<string[]> {
    const today = toLocalDayKey(now);
    let days: string[] = [];
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_DAYS);
      days = raw ? JSON.parse(raw) : [];
    } catch {
      days = [];
    }

    if (!days.includes(today)) days.unshift(today);
    days = days.slice(0, ACTIVE_DAYS_KEPT);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_DAYS, JSON.stringify(days)).catch(() => {});
    return days;
  }

  private async getFirstOpenAt(now: number): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_OPEN);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // fall through and seed
    }
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_OPEN, String(now)).catch(() => {});
    return now;
  }

  private async hasSavedHostingPlan(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(HOSTING_PLANS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }

  /** Flatten the local shelf into lowercase match tokens for the Friday body. */
  private async readShelf(): Promise<string[]> {
    try {
      const items: BarIngredient[] = await HomeBarService.getStoredIngredients();
      return items.flatMap((item) =>
        [item.name, item.subcategory, item.brand]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase()),
      );
    } catch {
      return [];
    }
  }

  /**
   * Gather local state. Everything here is best-effort: any failing source
   * degrades to a conservative default rather than blocking the run.
   */
  private async gatherState(now: number, userId?: string | null): Promise<PlannerState> {
    const [activeDays, firstOpenAt, hasHosted, shelf] = await Promise.all([
      this.recordActiveDay(now),
      this.getFirstOpenAt(now),
      this.hasSavedHostingPlan(),
      this.readShelf(),
    ]);

    let madeSomethingThisWeek = false;
    if (userId) {
      madeSomethingThisWeek = await hasMadeSomethingThisWeek(userId).catch(() => false);
    }

    let currentStreak = 0;
    try {
      currentStreak = streakService.getCurrentStreak();
    } catch {
      currentStreak = 0;
    }

    return { now, firstOpenAt, activeDays, madeSomethingThisWeek, currentStreak, hasHosted, shelf };
  }

  /**
   * Recompute and reschedule the whole 7-day L2/L3/L4 window.
   *
   * Call on every app open and after any significant state change (a make
   * logged, a hosting plan saved, a shelf edit). Safe to call repeatedly —
   * it cancels its own previously scheduled sends first, so re-running never
   * stacks notifications.
   */
  public async run(
    options: { userId?: string | null; reason?: string } = {},
  ): Promise<PlannedSend[]> {
    if (this.running) return [];
    if (Date.now() - this.lastRunAt < MIN_RERUN_INTERVAL_MS) {
      log.info('NotificationPlanner', 'Skipping run: below minimum rerun interval', {
        reason: options.reason ?? 'app_open',
        msSinceLastRun: Date.now() - this.lastRunAt,
      });
      return [];
    }
    this.running = true;
    this.lastRunAt = Date.now();

    try {
      if (!notificationService.getPreferences().enabled) {
        await notificationService.cancelScheduledByPrefix([PLAN_PREFIX]);
        return [];
      }

      // No permission means no OS-level send is possible; skip quietly rather
      // than raising a dialog here (the ask belongs at a value moment, §2).
      if (!(await notificationService.hasPermission())) {
        log.info('NotificationPlanner', 'Skipping run: notification permission not granted');
        return [];
      }

      const now = Date.now();
      const state = await this.gatherState(now, options.userId);

      const ctx: BudgetContext = {
        now,
        activeDays: state.activeDays,
        // Onboarding week 1 suppresses the habit and appointment layers.
        suppressHabitLayers: now - state.firstOpenAt < 7 * DAY_MS,
      };

      const accepted = applyBudget(buildCandidates(state), ctx);

      // Cancel-and-reschedule the whole window. Only planner-owned identifiers
      // are touched — L1 sends (hosting countdown, trial, low stock) survive.
      const cancelled = await notificationService.cancelScheduledByPrefix([PLAN_PREFIX]);

      for (const send of accepted) {
        const seconds = Math.floor((send.fireAt - Date.now()) / 1000);
        if (seconds <= 0) continue;

        await notificationService.scheduleSend({
          identifier: send.key,
          type: send.type as NotificationType,
          layer: send.layer,
          slot: send.slot,
          title: send.title,
          body: send.body,
          actionUrl: send.actionUrl,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
          },
        });
      }

      await AsyncStorage.setItem(STORAGE_KEYS.LAST_RUN, String(now)).catch(() => {});

      log.info('NotificationPlanner', 'Planning window rebuilt', {
        reason: options.reason ?? 'app_open',
        cancelled,
        scheduled: accepted.length,
        slots: accepted.map((s) => s.slot),
      });

      return accepted;
    } catch (error) {
      log.error('NotificationPlanner', 'Planner run failed', error);
      return [];
    } finally {
      this.running = false;
    }
  }

  /** Drop every planner-owned scheduled send (e.g. on sign-out). */
  public async clear(): Promise<void> {
    await notificationService.cancelScheduledByPrefix([PLAN_PREFIX]).catch(() => {});
  }
}

export const notificationPlanner = new NotificationPlanner();
export default notificationPlanner;
