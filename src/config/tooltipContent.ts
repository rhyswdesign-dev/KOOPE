/**
 * Tooltip Content Configuration
 * Defines educational overlay content for each page/feature
 */

import { TooltipStep } from '../components/FeatureTooltipOverlay';

export const TOOLTIP_CONFIGS: Record<string, { title: string; steps: TooltipStep[] }> = {
  // Lessons Page
  lessons: {
    title: 'Welcome to Lessons!',
    steps: [
      {
        icon: 'trophy-outline',
        title: 'Earn XP',
        description: 'Complete lessons to earn XP. Use XP to unlock premium content in the Vault.',
      },
      {
        icon: 'bar-chart-outline',
        title: 'Track Progress',
        description: 'Choose from Beginner, Intermediate, or Advanced lessons based on your skill level.',
      },
      {
        icon: 'flame-outline',
        title: 'Build Streaks',
        description: 'Complete lessons daily to maintain your learning streak and earn bonus XP.',
      },
    ],
  },

  // Vault Page
  vault: {
    title: 'The Vault',
    steps: [
      {
        icon: 'diamond-outline',
        title: 'Unlock with XP',
        description: 'Spend XP earned from lessons to unlock exclusive cocktail recipes and techniques.',
      },
      {
        icon: 'key-outline',
        title: 'Use Keys',
        description: 'Keys unlock rare seasonal content. Earn Keys through special challenges.',
      },
      {
        icon: 'star-outline',
        title: 'Premium Content',
        description: 'Some content requires KOOPE+ or PRO subscription for early access.',
      },
    ],
  },

  // Recipe/For You Page
  recipes: {
    title: 'Personalized For You',
    steps: [
      {
        icon: 'sparkles-outline',
        title: 'AI Recommendations',
        description: 'Our AI learns your preferences to suggest cocktails tailored to your taste.',
      },
      {
        icon: 'person-outline',
        title: 'Complete Your Profile',
        description: 'Take the taste profile survey to get even better personalized recommendations.',
      },
      {
        icon: 'bookmark-outline',
        title: 'Save & Share',
        description: 'Bookmark your favorite recipes and add ingredients to your shopping cart.',
      },
    ],
  },

  // AI Coach (Lives System)
  ai_coach: {
    title: 'AI Bartending Coach',
    steps: [
      {
        icon: 'chatbubble-ellipses-outline',
        title: 'Ask Questions',
        description: 'Get instant answers about cocktails, techniques, and ingredients from our AI coach.',
      },
      {
        icon: 'heart-outline',
        title: 'Lives System',
        description: 'Each question uses 1 Life. Lives regenerate daily. FREE: 3/day, PLUS: unlimited.',
      },
      {
        icon: 'bulb-outline',
        title: 'Learn Faster',
        description: 'Use the AI coach to clarify lessons, get recipe suggestions, or troubleshoot techniques.',
      },
    ],
  },

  // Home Bar
  home_bar: {
    title: 'Your Home Bar',
    steps: [
      {
        icon: 'list-outline',
        title: 'Track Inventory',
        description: 'Add spirits, mixers, and ingredients you have at home to your virtual bar.',
      },
      {
        icon: 'search-outline',
        title: 'Recipe Matching',
        description: 'See which cocktails you can make with the ingredients you already have.',
      },
      {
        icon: 'cart-outline',
        title: 'Shopping List',
        description: 'Add missing ingredients to your shopping list for easy grocery trips.',
      },
    ],
  },

  // Explore/Discover
  explore: {
    title: 'Explore & Discover',
    steps: [
      {
        icon: 'location-outline',
        title: 'Find Bars',
        description: 'Discover curated bars near you with signature cocktails and insider tips.',
      },
      {
        icon: 'game-controller-outline',
        title: 'Drinking Games',
        description: 'Learn the official rules for classic party games like King\'s Cup and Beer Pong.',
      },
      {
        icon: 'calendar-outline',
        title: 'Events',
        description: 'Stay updated on cocktail competitions, masterclasses, and local bar events.',
      },
    ],
  },
};
