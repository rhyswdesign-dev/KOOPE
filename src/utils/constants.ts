/**
 * App-wide constants and configuration values
 * Centralized place for XP rewards, unlock thresholds, and app settings
 */

// XP System Configuration
export const XP_CONFIG = {
  LESSON_COMPLETION_REWARD: 15,    // XP gained per lesson completion
  VAULT_UNLOCK_THRESHOLD: 1000,   // XP needed to unlock Vault
} as const;

// App Metadata
export const APP_CONFIG = {
  NAME: 'HomeGameAdvantage',
  COMPANY: 'MixedMindStudios',
  VERSION: '1.0.0',
} as const;

// Legacy collection/table name constants (unused; kept for reference)
export const COLLECTIONS = {
  USERS: 'users',
  LESSONS: 'lessons', 
  VAULT_ITEMS: 'vaultItems',
  USER_PROGRESS: 'userProgress',
} as const;

// UI Constants
export const COLORS = {
  PRIMARY: '#6366F1',      // Indigo - main brand color
  SECONDARY: '#EC4899',    // Pink - accent color  
  SUCCESS: '#10B981',      // Green - XP gains, success states
  WARNING: '#F59E0B',      // Amber - caution, locked content
  ERROR: '#EF4444',        // Red - errors, failed attempts
  BACKGROUND: '#FFFFFF',   // White - main background
  SURFACE: '#F9FAFB',      // Gray 50 - cards, sections
  TEXT_PRIMARY: '#111827', // Gray 900 - main text
  TEXT_SECONDARY: '#6B7280', // Gray 500 - secondary text
} as const;

// Screen Names (for navigation)
export const SCREENS = {
  HOME: 'Home',
  LESSONS: 'Lessons', 
  VAULT: 'Vault',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  // Auth screens (will be added later)
  LOGIN: 'Login',
  REGISTER: 'Register',
  ONBOARDING: 'Onboarding',
} as const;