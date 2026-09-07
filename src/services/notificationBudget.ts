/**
 * NOTIFICATION BUDGET — the frequency governor's pure core
 *
 * Notification Playbook §1: "Global governor: a user receives at most 4
 * non-transactional notifications per week, max 1 per day, and none on a day
 * they already opened the app. Priority when over budget: L1 > L4 winback >
 * L3 > L2. This governor is a code path, not a guideline."
 *
 * This module is deliberately dependency-free (no expo, no storage, no
 * network) so the budget rules can be unit-tested directly in CI — the
 * Playbook scorecard requires "≤4, CI-tested in planner". `notificationPlanner`
 * owns everything impure: reading local state, building candidates, and
 * cancel-and-reschedule against expo-notifications.
 *
 * L1 (transactional: trial lifecycle, low stock, celebrations, hosting
 * countdown) never reaches this module — it is uncapped by design.
 */

/** The four layers of the Playbook taxonomy. */
export type NotificationLayer = 'L1' | 'L2' | 'L3' | 'L4';

/** L4 splits by cohort intent; winback outranks L3/L2, seasonal does not. */
export type LifecycleKind = 'onboarding' | 'winback' | 'seasonal';

/**
 * A send the planner would like to make. `key` doubles as the OS notification
 * identifier, so re-planning replaces rather than stacks.
 */
export interface PlannedSend {
  key: string;
  /** NotificationType from notificationService — kept as a string here to stay dependency-free. */
  type: string;
  layer: Exclude<NotificationLayer, 'L1'>;
  /** Human-readable cadence slot for Mixpanel, e.g. 'fri_1630'. */
  slot: string;
  /** Epoch ms, local time already resolved by the caller. */
  fireAt: number;
  title: string;
  body: string;
  actionUrl: string;
  kind?: LifecycleKind;
}

export interface BudgetContext {
  now: number;
  /**
   * Local `yyyy-mm-dd` days the user already opened the app. The Playbook's
   * "don't knock when they're already here" rule — in practice this is today,
   * because the planner runs on app open.
   */
  activeDays: string[];
  /**
   * Onboarding week 1 suppresses L2/L3 entirely (Playbook §1, L4 section).
   */
  suppressHabitLayers?: boolean;
}

export const NOTIFICATION_BUDGET = {
  /** Rolling planning window. Phase A schedules locally, 7 days at a time. */
  WINDOW_DAYS: 7,
  /** Global governor: non-transactional sends per rolling week. */
  WEEKLY_NON_TRANSACTIONAL_MAX: 4,
  /** Global governor: at most one non-transactional send per calendar day. */
  PER_DAY_MAX: 1,
  /** Per-layer weekly ceilings from the §1 taxonomy table. */
  PER_LAYER_WEEKLY_MAX: { L2: 3, L3: 1, L4: 1 } as const,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Priority ladder from §1: lower number wins when over budget. */
function priorityOf(send: PlannedSend): number {
  if (send.layer === 'L4') {
    if (send.kind === 'seasonal') return 3; // rides the opt-in "Occasions & featured" channel
    return 0; // onboarding + winback
  }
  if (send.layer === 'L3') return 1;
  return 2; // L2
}

/** Local `yyyy-mm-dd` key — the unit the per-day and active-day rules use. */
export function toLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Apply the global governor to a set of candidate sends.
 *
 * Returns the accepted subset, in fire order. Everything not returned is
 * simply not scheduled this run — the planner re-runs on the next app open,
 * so a dropped candidate gets reconsidered rather than lost.
 */
export function applyBudget(candidates: PlannedSend[], ctx: BudgetContext): PlannedSend[] {
  const windowEnd = ctx.now + NOTIFICATION_BUDGET.WINDOW_DAYS * DAY_MS;
  const activeDays = new Set(ctx.activeDays);

  let eligible = candidates.filter((send) => send.fireAt > ctx.now && send.fireAt <= windowEnd);

  if (ctx.suppressHabitLayers) {
    eligible = eligible.filter((send) => send.layer === 'L4');
  }

  const ordered = [...eligible].sort((a, b) => {
    const byPriority = priorityOf(a) - priorityOf(b);
    if (byPriority !== 0) return byPriority;
    return a.fireAt - b.fireAt;
  });

  const accepted: PlannedSend[] = [];
  const perDay = new Map<string, number>();
  const perLayer: Record<'L2' | 'L3' | 'L4', number> = { L2: 0, L3: 0, L4: 0 };
  let lifecyclePauseActive = false;

  for (const send of ordered) {
    if (accepted.length >= NOTIFICATION_BUDGET.WEEKLY_NON_TRANSACTIONAL_MAX) break;

    // "L4 ... pauses L2": an accepted onboarding/winback send silences the
    // habit loop for the window. Seasonal sorts after L2 and never pauses it.
    if (send.layer === 'L2' && lifecyclePauseActive) continue;

    if (perLayer[send.layer] >= NOTIFICATION_BUDGET.PER_LAYER_WEEKLY_MAX[send.layer]) continue;

    const dayKey = toLocalDayKey(send.fireAt);
    if (activeDays.has(dayKey)) continue; // they're here; don't knock
    if ((perDay.get(dayKey) ?? 0) >= NOTIFICATION_BUDGET.PER_DAY_MAX) continue;

    accepted.push(send);
    perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1);
    perLayer[send.layer] += 1;
    if (send.layer === 'L4' && send.kind !== 'seasonal') lifecyclePauseActive = true;
  }

  return accepted.sort((a, b) => a.fireAt - b.fireAt);
}

/**
 * Next occurrence of a weekday/time in local time, strictly after `from`.
 * `weekday` follows Date#getDay (0 = Sunday).
 */
export function nextWeekdayAt(from: number, weekday: number, hour: number, minute = 0): number {
  const candidate = new Date(from);
  candidate.setHours(hour, minute, 0, 0);
  const dayDelta = (weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + dayDelta);
  if (candidate.getTime() <= from) candidate.setDate(candidate.getDate() + 7);
  return candidate.getTime();
}

/** Today (or the next day) at a given local time, strictly after `from`. */
export function nextTimeOfDay(from: number, hour: number, minute = 0): number {
  const candidate = new Date(from);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= from) candidate.setDate(candidate.getDate() + 1);
  return candidate.getTime();
}
