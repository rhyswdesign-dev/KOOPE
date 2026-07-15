/**
 * Generic network/error classification utilities.
 *
 * Extracted from src/config/firebase.ts during Phase 0.4 (Firebase
 * excision) — these had nothing to do with Firebase, they're generic
 * error-shape helpers App.tsx uses to filter noisy console errors and
 * classify Supabase/network failures for user-friendly messaging.
 */

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error.message || error.toString();

  return (
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('timeout')
  );
}

/**
 * Get error type from error object
 */
export function getErrorType(error: any): 'network' | 'permission' | 'configuration' | 'unknown' {
  if (!error) return 'unknown';

  const message = error.message || error.toString();

  if (isNetworkError(error)) {
    return 'network';
  }

  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'permission';
  }

  if (message.includes('configuration') || message.includes('config') || message.includes('not configured')) {
    return 'configuration';
  }

  return 'unknown';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const errorType = getErrorType(error);

  switch (errorType) {
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection.';
    case 'permission':
      return 'You do not have permission to access this resource.';
    case 'configuration':
      return 'The app is not properly configured. Please contact support.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
