/**
 * Network error classification helper tests
 * (formerly src/config/__tests__/firebaseConfig.test.ts — these
 * utilities were never Firebase-specific; see src/lib/networkErrors.ts)
 */

import { describe, it, expect } from 'vitest';
import { getErrorType, getUserFriendlyErrorMessage, isNetworkError } from '../networkErrors';

describe('network error classification helpers', () => {
  it('detects network errors', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('unauthorized'))).toBe(false);
  });

  it('maps known error types to friendly copy', () => {
    expect(getErrorType(new Error('permission denied'))).toBe('permission');
    expect(getUserFriendlyErrorMessage(new Error('timeout'))).toContain('internet connection');
  });
});
