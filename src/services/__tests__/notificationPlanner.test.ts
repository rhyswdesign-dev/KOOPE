/**
 * Covers the planner's pure halves: the Friday maker prompt's shelf
 * personalization (Playbook §1 L2 — "the single most important habit send")
 * and the candidate set it hands to the budget.
 *
 * The native/IO edges are mocked; `notificationBudget.test.ts` owns the budget
 * rules themselves.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildCandidates,
  buildFridayBody,
  pickShelfMatch,
  type PlannerState,
} from '../notificationPlanner';

// vi.mock calls are hoisted above the imports above by vitest's transform.
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) },
}));

vi.mock('../notificationService', () => ({
  notificationService: {
    getPreferences: () => ({ enabled: true }),
    hasPermission: async () => false,
    scheduleSend: vi.fn(async () => true),
    cancelScheduledByPrefix: vi.fn(async () => 0),
  },
}));

vi.mock('../homeBarService', () => ({ HomeBarService: { getStoredIngredients: async () => [] } }));
vi.mock('../streakService', () => ({ streakService: { getCurrentStreak: () => 0 } }));
vi.mock('../makeLogService', () => ({ hasMadeSomethingThisWeek: async () => false }));
vi.mock('../hostingPlannerService', () => ({ HOSTING_PLANS_STORAGE_KEY: '@koope_hosting_plans' }));

/** Monday 2026-08-03, 09:00 local. */
const MONDAY_9AM = new Date(2026, 7, 3, 9, 0, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function state(overrides: Partial<PlannerState> = {}): PlannerState {
  return {
    now: MONDAY_9AM,
    // Well outside onboarding week so habit candidates are in play.
    firstOpenAt: MONDAY_9AM - 60 * DAY_MS,
    activeDays: [],
    madeSomethingThisWeek: false,
    currentStreak: 0,
    hasHosted: false,
    shelf: [],
    ...overrides,
  };
}

describe('pickShelfMatch', () => {
  it('names the Negroni for a gin / Campari / sweet vermouth shelf', () => {
    const match = pickShelfMatch(['Beefeater Gin', 'Campari', 'Carpano Sweet Vermouth']);
    expect(match?.drink).toBe('Negroni');
  });

  it('prefers the most distinctive match when several are possible', () => {
    // Shelf covers both Negroni and Martini; Negroni is listed first.
    const match = pickShelfMatch(['gin', 'campari', 'sweet vermouth', 'dry vermouth']);
    expect(match?.drink).toBe('Negroni');
  });

  it('returns null for an empty or unmatched shelf', () => {
    expect(pickShelfMatch([])).toBeNull();
    expect(pickShelfMatch(['blue curacao'])).toBeNull();
  });
});

describe('buildFridayBody', () => {
  it('reproduces the Playbook §4 reference line from the shelf', () => {
    const body = buildFridayBody(['gin', 'campari', 'sweet vermouth']);
    expect(body).toBe(
      "You've got gin, campari, and sweet vermouth — that's a Negroni, and you know it.",
    );
  });

  it('falls back without guilt when nothing matches', () => {
    const body = buildFridayBody([]);
    expect(body).not.toMatch(/streak|miss you|last chance/i);
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('buildCandidates', () => {
  it('schedules the Friday maker prompt for Friday 4:30pm when no make is logged', () => {
    const friday = buildCandidates(state()).find((c) => c.type === 'friday_maker_prompt');

    expect(friday).toBeDefined();
    expect(friday!.layer).toBe('L2');
    expect(friday!.slot).toBe('fri_1630');
    const at = new Date(friday!.fireAt);
    expect(at.getDay()).toBe(5);
    expect(at.getHours()).toBe(16);
    expect(at.getMinutes()).toBe(30);
  });

  it('suppresses the Friday prompt once a make is logged this week', () => {
    const candidates = buildCandidates(state({ madeSomethingThisWeek: true }));
    expect(candidates.some((c) => c.type === 'friday_maker_prompt')).toBe(false);
  });

  it('only seeds the weekend host prompt for users who have hosted', () => {
    expect(buildCandidates(state()).some((c) => c.type === 'weekend_host_seed')).toBe(false);
    expect(
      buildCandidates(state({ hasHosted: true })).some((c) => c.type === 'weekend_host_seed'),
    ).toBe(true);
  });

  it('only guards a streak worth guarding (>= 3 days)', () => {
    expect(
      buildCandidates(state({ currentStreak: 2 })).some((c) => c.type === 'streak_reminder'),
    ).toBe(false);
    expect(
      buildCandidates(state({ currentStreak: 5 })).some((c) => c.type === 'streak_reminder'),
    ).toBe(true);
  });

  it('never emits banned copy moves (guilt, streak-shaming, fake urgency)', () => {
    const banned = /don't break|we miss you|last chance|🔥/i;
    const candidates = buildCandidates(
      state({ currentStreak: 12, hasHosted: true, shelf: ['gin', 'campari', 'sweet vermouth'] }),
    );

    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(`${c.title} ${c.body}`).not.toMatch(banned);
    }
  });

  it('gives every candidate a deep link — no "come back!" pings', () => {
    const candidates = buildCandidates(state({ currentStreak: 4, hasHosted: true }));
    for (const c of candidates) {
      expect(c.actionUrl).toMatch(/^koope:\/\//);
    }
  });

  it('emits the onboarding sequence only inside week 1', () => {
    const fresh = buildCandidates(state({ firstOpenAt: MONDAY_9AM - 2 * DAY_MS }));
    expect(fresh.filter((c) => c.type === 'onboarding')).toHaveLength(3);

    const settled = buildCandidates(state());
    expect(fresh.length).toBeGreaterThan(0);
    expect(settled.some((c) => c.type === 'onboarding')).toBe(false);
  });
});
