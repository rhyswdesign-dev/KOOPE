/**
 * Test setup file for Vitest
 * Configure global test environment and utilities
 */

import { vi } from 'vitest';

// Provide React Native style global in Node-based test runs
if (typeof globalThis.__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = true;
}

// Avoid loading Expo native Constants module in node environment tests
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
    easConfig: {},
  },
}));

// Mock Date.now for consistent test results
export const mockCurrentTime = (timestamp: number) => {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
};

// Mock Math.random for predictable test results
export const mockRandom = (value: number) => {
  vi.spyOn(Math, 'random').mockReturnValue(value);
};

// Reset all mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});
