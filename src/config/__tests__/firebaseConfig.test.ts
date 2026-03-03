/**
 * Firebase compatibility config tests
 */

import { describe, it, expect } from 'vitest';
import {
  getFirebaseConfig,
  getErrorType,
  getUserFriendlyErrorMessage,
  isNetworkError,
} from '../firebase';

describe('firebase config compatibility helpers', () => {
  it('returns firebase config shape', () => {
    const config = getFirebaseConfig();
    expect(config).toHaveProperty('apiKey');
    expect(config).toHaveProperty('authDomain');
    expect(config).toHaveProperty('projectId');
    expect(config).toHaveProperty('storageBucket');
    expect(config).toHaveProperty('messagingSenderId');
    expect(config).toHaveProperty('appId');
  });

  it('detects network errors', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('unauthorized'))).toBe(false);
  });

  it('maps known error types to friendly copy', () => {
    expect(getErrorType(new Error('permission denied'))).toBe('permission');
    expect(getUserFriendlyErrorMessage(new Error('timeout'))).toContain('internet connection');
  });
});
