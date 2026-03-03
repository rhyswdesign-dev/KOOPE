import { Ionicons } from '@expo/vector-icons';

export type ScreenTourId =
  | 'tab_lessons'
  | 'tab_discover'
  | 'tab_camera'
  | 'tab_inventory'
  | 'tab_profile'
  | 'feature_lesson_engine'
  | 'feature_smart_scan'
  | 'feature_recipe_detail';

export interface ScreenTourSlide {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SCREEN_TOURS: Record<ScreenTourId, ScreenTourSlide[]> = {
  tab_lessons: [
    {
      title: 'Lessons Tab',
      body: 'Start with guided bartending lessons and track your progress with XP and streaks.',
      icon: 'school-outline',
    },
    {
      title: 'Challenges',
      body: 'Complete weekly and monthly challenges to unlock more rewards and recipes.',
      icon: 'trophy-outline',
    },
    {
      title: 'Level Up',
      body: 'Use this tab to build your skills before jumping into advanced recipes.',
      icon: 'bar-chart-outline',
    },
  ],
  tab_discover: [
    {
      title: 'Discover Tab',
      body: 'Browse recipes, moods, and personalized recommendations from your activity.',
      icon: 'compass-outline',
    },
    {
      title: 'Save + Build Lists',
      body: 'Save cocktails you like and turn ingredients into a shopping list quickly.',
      icon: 'bookmark-outline',
    },
    {
      title: 'Upgrade Features',
      body: 'Some advanced recommendations and controls are unlocked through paid tiers.',
      icon: 'diamond-outline',
    },
  ],
  tab_camera: [
    {
      title: 'Camera Tab',
      body: 'Scan bottles, labels, and recipe clues to add items faster to your bar.',
      icon: 'camera-outline',
    },
    {
      title: 'Smart Scan',
      body: 'Use Smart Scan for barcode-first lookup and AI-assisted recognition paths.',
      icon: 'scan-outline',
    },
    {
      title: 'Manual Fallback',
      body: 'If a bottle is not found, you can still add it manually to keep moving.',
      icon: 'create-outline',
    },
  ],
  tab_inventory: [
    {
      title: 'Inventory Tab',
      body: 'Manage bottles and ingredients in your home bar with searchable categories.',
      icon: 'wine-outline',
    },
    {
      title: 'Optimize + Restock',
      body: 'Use optimization and restock nudges to decide what to buy next.',
      icon: 'sparkles-outline',
    },
    {
      title: 'Shopping Cart',
      body: 'Move missing items to shopping lists and plan future purchases.',
      icon: 'cart-outline',
    },
  ],
  tab_profile: [
    {
      title: 'Profile Tab',
      body: 'Track XP, streaks, unlocked content, and saved items in one place.',
      icon: 'person-outline',
    },
    {
      title: 'Settings + Support',
      body: 'Open settings to manage account, subscriptions, notifications, and support.',
      icon: 'settings-outline',
    },
    {
      title: 'Keep It Current',
      body: 'Revisit this tab to manage your preferences and review your app progress.',
      icon: 'refresh-outline',
    },
  ],
  feature_lesson_engine: [
    {
      title: 'Lesson Engine',
      body: 'Each lesson is interactive and tracks your correct answers and mastery gains.',
      icon: 'reader-outline',
    },
    {
      title: 'Completion Summary',
      body: 'When you finish, you will see XP awarded and your skill progression details.',
      icon: 'checkmark-done-outline',
    },
  ],
  feature_smart_scan: [
    {
      title: 'Smart Scan Flow',
      body: 'Scan starts with barcode matching, then falls back to additional recognition paths.',
      icon: 'barcode-outline',
    },
    {
      title: 'Consent + Tier Rules',
      body: 'Free and paid tiers may see different scan behavior depending on consent and features.',
      icon: 'shield-checkmark-outline',
    },
  ],
  feature_recipe_detail: [
    {
      title: 'Recipe Detail',
      body: 'Review ingredients, steps, and batch options before making the drink.',
      icon: 'restaurant-outline',
    },
    {
      title: 'Log What You Used',
      body: 'Use the make flow to capture brands, substitutions, and personal modifications.',
      icon: 'clipboard-outline',
    },
    {
      title: 'Rate + Learn',
      body: 'After completion, add rating and notes to improve future recommendations.',
      icon: 'star-outline',
    },
  ],
};
