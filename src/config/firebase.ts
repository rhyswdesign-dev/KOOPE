/**
 * Firebase/Supabase Configuration Utilities
 *
 * This file provides compatibility utilities for legacy Firebase code
 * while using Supabase as the backend.
 */

import Constants from 'expo-constants';

/**
 * Validate Firebase/Supabase configuration
 */
export function validateFirebaseConfig(): boolean {
  const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  return !!(supabaseUrl && supabaseAnonKey);
}

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

/**
 * Check Firebase/Supabase connection
 */
export async function checkFirebaseConnection(maxRetries: number = 3): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    if (!validateFirebaseConfig()) {
      return {
        connected: false,
        error: 'Configuration is invalid'
      };
    }

    const startTime = Date.now();

    // Simple connection check - just validate config for now
    // In a real implementation, you'd ping Supabase here
    const latency = Date.now() - startTime;

    return {
      connected: true,
      latency
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get Firebase config (compatibility layer)
 */
export function getFirebaseConfig() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  };
}

/**
 * Mock Firestore database instance (compatibility)
 * NOTE: This is a stub - the app should use Supabase repositories instead
 */
export const db = null;

/**
 * Safe Firestore operation wrapper (compatibility)
 */
export async function safeFirestoreOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logFirebaseError(error, errorContext);
    return null;
  }
}

/**
 * Log Firebase errors (compatibility)
 */
export function logFirebaseError(error: any, context: string) {
  console.error(`[Firebase Error] ${context}:`, error);
}

export default {
  validateFirebaseConfig,
  isNetworkError,
  getErrorType,
  getUserFriendlyErrorMessage,
  checkFirebaseConnection,
  getFirebaseConfig,
  db,
  safeFirestoreOperation,
  logFirebaseError,
};
