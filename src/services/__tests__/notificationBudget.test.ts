/**
 * The Notification Playbook scorecard requires the frequency governor to be
 * CI-tested: "Non-transactional sends/user/week ≤4, CI-tested in planner"
 * (§5). These tests are that check — the budget rules from §1 are pinned here
 * so no future feature can quietly widen them.
 */

import { describe, it, expect } from 'vitest';
import {
  applyBudget,
  nextTimeOfDay,
  nextWeekdayAt,
  toLocalDayKey,
  NOTIFICATION_BUDGET,
  type BudgetContext,
  type PlannedSend,
} from '../notificationBudget';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed reference point: Monday 2026-08-03, 09:00 local. */
const MONDAY_9AM = new Date(2026, 7, 3, 9, 0, 0, 0).getTime();

function send(
  overrides: Partial<PlannedSend> & Pick<PlannedSend, 'key' | 'layer' | 'fireAt'>,
): PlannedSend {
  return {
    type: 'friday_maker_prompt',
    slot: 'test',
    title: 'title',
    body: 'body',
    actionUrl: 'koope://what-can-i-make',
    ...overrides,
  } as PlannedSend;
}

function ctx(overrides: Partial<BudgetContext> = {}): BudgetContext {
  return { now: MONDAY_9AM, activeDays: [], ...overrides };
}

describe('applyBudget — global governor', () => {
  it('never schedules more than 4 non-transactional sends in the window', () => {
    // Ten L2 candidates, one per day, all inside the window.
    const candidates = Array.from({ length: 10 }, (_, i) =>
      send({ key: `k${i}`, layer: 'L2', fireAt: MONDAY_9AM + (i + 1) * DAY_MS + 3600_000 }),
    );

    const accepted = applyBudget(candidates, ctx());

    expect(accepted.length).toBeLessThanOrEqual(NOTIFICATION_BUDGET.WEEKLY_NON_TRANSACTIONAL_MAX);
  });

  it('allows at most one send per calendar day', () => {
    const sameDay = MONDAY_9AM + DAY_MS;
    const candidates = [
      send({ key: 'a', layer: 'L2', fireAt: sameDay + 1 * 3600_000 }),
      send({ key: 'b', layer: 'L2', fireAt: sameDay + 5 * 3600_000 }),
      send({ key: 'c', layer: 'L3', fireAt: sameDay + 8 * 3600_000 }),
    ];

    const accepted = applyBudget(candidates, ctx());

    expect(accepted).toHaveLength(1);
  });

  it('skips a day the user already opened the app', () => {
    const today = MONDAY_9AM + 6 * 3600_000; // still Monday
    const tomorrow = MONDAY_9AM + DAY_MS + 6 * 3600_000;

    const accepted = applyBudget(
      [
        send({ key: 'today', layer: 'L2', fireAt: today }),
        send({ key: 'tomorrow', layer: 'L2', fireAt: tomorrow }),
      ],
      ctx({ activeDays: [toLocalDayKey(MONDAY_9AM)] }),
    );

    expect(accepted.map((s) => s.key)).toEqual(['tomorrow']);
  });

  it('drops candidates outside the 7-day window and in the past', () => {
    const accepted = applyBudget(
      [
        send({ key: 'past', layer: 'L2', fireAt: MONDAY_9AM - DAY_MS }),
        send({ key: 'far', layer: 'L2', fireAt: MONDAY_9AM + 9 * DAY_MS }),
        send({ key: 'ok', layer: 'L2', fireAt: MONDAY_9AM + 2 * DAY_MS }),
      ],
      ctx(),
    );

    expect(accepted.map((s) => s.key)).toEqual(['ok']);
  });
});

describe('applyBudget — per-layer caps and priority', () => {
  it('caps L3 at one per week', () => {
    const accepted = applyBudget(
      [
        send({ key: 'l3a', layer: 'L3', fireAt: MONDAY_9AM + 1 * DAY_MS }),
        send({ key: 'l3b', layer: 'L3', fireAt: MONDAY_9AM + 3 * DAY_MS }),
        send({ key: 'l3c', layer: 'L3', fireAt: MONDAY_9AM + 5 * DAY_MS }),
      ],
      ctx(),
    );

    expect(accepted).toHaveLength(1);
  });

  it('caps L2 at three per week', () => {
    const accepted = applyBudget(
      Array.from({ length: 6 }, (_, i) =>
        send({ key: `l2_${i}`, layer: 'L2', fireAt: MONDAY_9AM + (i + 1) * DAY_MS }),
      ),
      ctx(),
    );

    expect(accepted).toHaveLength(NOTIFICATION_BUDGET.PER_LAYER_WEEKLY_MAX.L2);
  });

  it('prefers L4 winback over L3 over L2 when they collide on one day', () => {
    const collision = MONDAY_9AM + DAY_MS + 3600_000;
    const accepted = applyBudget(
      [
        send({ key: 'l2', layer: 'L2', fireAt: collision }),
        send({ key: 'l3', layer: 'L3', fireAt: collision }),
        send({ key: 'l4', layer: 'L4', kind: 'winback', fireAt: collision }),
      ],
      ctx(),
    );

    expect(accepted.map((s) => s.key)).toEqual(['l4']);
  });

  it('an accepted lifecycle send pauses the L2 habit loop', () => {
    const accepted = applyBudget(
      [
        send({ key: 'winback', layer: 'L4', kind: 'winback', fireAt: MONDAY_9AM + 1 * DAY_MS }),
        send({ key: 'friday', layer: 'L2', fireAt: MONDAY_9AM + 4 * DAY_MS }),
        send({ key: 'drop', layer: 'L3', fireAt: MONDAY_9AM + 2 * DAY_MS }),
      ],
      ctx(),
    );

    expect(accepted.map((s) => s.key).sort()).toEqual(['drop', 'winback']);
  });

  it('a seasonal send does NOT pause L2 (it rides the opt-in channel)', () => {
    const accepted = applyBudget(
      [
        send({ key: 'seasonal', layer: 'L4', kind: 'seasonal', fireAt: MONDAY_9AM + 1 * DAY_MS }),
        send({ key: 'friday', layer: 'L2', fireAt: MONDAY_9AM + 4 * DAY_MS }),
      ],
      ctx(),
    );

    expect(accepted.map((s) => s.key).sort()).toEqual(['friday', 'seasonal']);
  });

  it('onboarding week 1 suppresses L2 and L3 entirely', () => {
    const accepted = applyBudget(
      [
        send({ key: 'onb', layer: 'L4', kind: 'onboarding', fireAt: MONDAY_9AM + 1 * DAY_MS }),
        send({ key: 'friday', layer: 'L2', fireAt: MONDAY_9AM + 4 * DAY_MS }),
        send({ key: 'drop', layer: 'L3', fireAt: MONDAY_9AM + 2 * DAY_MS }),
      ],
      ctx({ suppressHabitLayers: true }),
    );

    expect(accepted.map((s) => s.key)).toEqual(['onb']);
  });
});

describe('slot helpers', () => {
  it('nextWeekdayAt finds the coming Friday 16:30', () => {
    const friday = nextWeekdayAt(MONDAY_9AM, 5, 16, 30);
    const asDate = new Date(friday);

    expect(asDate.getDay()).toBe(5);
    expect(asDate.getHours()).toBe(16);
    expect(asDate.getMinutes()).toBe(30);
    expect(friday).toBeGreaterThan(MONDAY_9AM);
  });

  it('nextWeekdayAt rolls forward a week when the slot has already passed today', () => {
    const fridayNoon = new Date(2026, 7, 7, 12, 0, 0, 0).getTime();
    const next = nextWeekdayAt(fridayNoon, 5, 10, 0); // 10am Friday, already past

    expect(next).toBeGreaterThan(fridayNoon + 6 * DAY_MS);
    expect(new Date(next).getDay()).toBe(5);
  });

  it('nextTimeOfDay rolls to tomorrow when the hour has passed', () => {
    const next = nextTimeOfDay(MONDAY_9AM, 7, 0); // 7am, already past at 9am

    expect(new Date(next).getDate()).toBe(new Date(MONDAY_9AM).getDate() + 1);
  });
});
