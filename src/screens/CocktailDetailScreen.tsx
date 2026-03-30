// @ts-nocheck
import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Share, Alert, Pressable, RefreshControl,
  Platform, Dimensions, StatusBar, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { FREE_RECIPE_LIMIT, useSavedItems } from '../hooks/useSavedItems';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { RecipesRepository } from '../repos/supabase';
import type { Recipe } from '../types/recipe';
import { ShoppingListStore } from '../services/shoppingListStore';
import { GroceryListService } from '../services/groceryListService';
import { getDetailedCocktail } from '../utils/cocktailDataTransformer';
import GroceryListModal from '../components/GroceryListModal';
import { getCocktailImage } from '../../assets/images/cocktails';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import CocktailDetailSkeleton from '../components/CocktailDetailSkeleton';
import { achievementService } from '../services/achievementService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { log } from '../lib/logger';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { useXPSystem } from '../store/useXPSystem';
import { useUserTier } from '../store/useUserTier';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { hasIngredient, parseIngredients } from '../utils/recipeMatching';
import { getSpiritSubstitutions, getSubstitutionMessage } from '../utils/spiritSubstitutions';
import type { UserInventoryItem } from '../types/database';
import { logRecipeCompletion, updateCompletionRating, syncCompletionToSupabase } from '../services/recipeCompletionService';
import { getCompletionPromptConfig } from '../lib/completions/brandCapture';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';
import type { RecipeCompletionDetails } from '../types/userProfile';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { useUserRecipes } from '../store/useUserRecipes';
import { formatIngredientAmount, formatIngredientDisplay } from '../utils/ingredientFormatting';

type CocktailDetailScreenRouteProp = {
  params: {
    cocktailId: string;
    cocktail?: any; // Optional: Pass full cocktail object for local recipes
  };
};

const REFERENCE_DEVICE_WIDTH = 390;
const REFERENCE_SCALE = Math.min(Dimensions.get('window').width / REFERENCE_DEVICE_WIDTH, 1.02);
const rs = (value: number) => Math.round(value * REFERENCE_SCALE);
const referenceDisplayFont = Platform.select({
  ios: 'Georgia-Bold',
  android: 'serif',
  default: 'serif',
});
const referenceSerifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

function trimSentence(value: string, maxLength: number): string {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).match(/^(.*?[.!?])\s/);
  if (sentenceBreak?.[1]) return sentenceBreak[1];

  const truncated = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}...`;
}

const DETAIL_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=80';
const DETAIL_AMOUNT_PREFIX_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+)\s*(?:oz|ml|dash(?:es)?|drop(?:s)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?)?)\s+(.+)$/i;
const DETAIL_AMOUNT_ONLY_REGEX =
  /^\s*((?:\d+\s+)?(?:\d+\/\d+|\d*\.?\d+)\s*(?:oz|ml|dash(?:es)?|drop(?:s)?|tsp|tbsp|cl|cup(?:s)?|part(?:s)?|top)?)\s*$/i;

function slugifyRecipeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitIngredientAmount(displayName: string): { amount: string; name: string } | null {
  const match = String(displayName || '').trim().match(DETAIL_AMOUNT_PREFIX_REGEX);
  if (!match) return null;

  return {
    amount: formatIngredientAmount(match[1]),
    name: match[2].trim(),
  };
}

function splitAmountOnlyNote(note: string): { amount: string; note?: string } | null {
  const trimmed = String(note || '').trim();
  if (!trimmed) return null;

  const amountOnly = trimmed.match(DETAIL_AMOUNT_ONLY_REGEX);
  if (amountOnly) {
    return { amount: formatIngredientAmount(amountOnly[1]) };
  }

  const prefixed = trimmed.match(DETAIL_AMOUNT_PREFIX_REGEX);
  if (!prefixed) return null;

  return {
    amount: formatIngredientAmount(prefixed[1]),
    note: prefixed[2].trim() || undefined,
  };
}

function normalizeDetailIngredient(item: any) {
  const formatted = formatIngredientDisplay(item);
  const splitName = splitIngredientAmount(formatted.name);
  const splitNote = !splitName ? splitAmountOnlyNote(String(formatted.note || '')) : null;

  return {
    name: splitName?.name || formatted.name || '',
    amount: splitName?.amount || splitNote?.amount || '',
    note: splitName ? formatted.note : splitNote?.note || formatted.note || '',
    matchName: splitName?.name || formatted.name || '',
  };
}

function isWeakTastingNote(value: string): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  if (/\d/.test(normalized)) return true; // likely a spec or numbered instruction

  const methodyWords = [
    'recipe',
    'spec',
    'build',
    'built',
    'shaken',
    'shake',
    'stirred',
    'stir',
    'strain',
    'double strain',
    'garnish',
    'serve',
    'pour',
    'finish',
  ];

  if (methodyWords.some((needle) => normalized.includes(needle))) return true;

  return [
    'a classic cocktail recipe.',
    'a classic cocktail recipe',
    'custom cocktail recipe',
    'custom recipe',
    'ai generated',
    'classic',
    'modern',
  ].includes(normalized);
}

function titleCaseLabel(value: string): string {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildHeroKicker(cocktail: any): string {
  if (!cocktail) return 'Curated Pour';
  if (cocktail.isNonAlcoholic) return 'Mocktails';
  if (cocktail.category) return String(cocktail.category);

  const era = String(cocktail.era || '').trim();
  const base = String(cocktail.base || cocktail.baseSpirit || '').trim();
  if (era && base) {
    return `${titleCaseLabel(era)} • ${titleCaseLabel(base)}-based`;
  }

  const subtitle = String(cocktail.subtitle || '').trim();
  if (subtitle && !isWeakTastingNote(subtitle)) return subtitle;

  return 'Curated Pour';
}

function ensureSentenceEnding(value: string): string {
  const trimmed = String(value || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function sentenceCase(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function normalizeMethodStep(step: string): string {
  const cleaned = sentenceCase(String(step || '').replace(/^\d+[\.\)]\s*/, '').trim());
  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();
  if (lower === 'shake vigorously') {
    return 'Shake vigorously with ice until the drink is thoroughly chilled.';
  }
  if (lower === 'stir gently') {
    return 'Stir gently just to combine and keep the texture clean.';
  }
  if (lower === 'top with club soda') {
    return 'Top with club soda and stir lightly to preserve the lift.';
  }
  if (lower === 'top with prosecco') {
    return 'Top with prosecco and keep the stir light so the bubbles stay lively.';
  }
  if (lower === 'top with soda water') {
    return 'Top with soda water and give it a short, gentle stir.';
  }

  if (/^strain into .*glass$/i.test(cleaned) && !/chilled/i.test(cleaned)) {
    return ensureSentenceEnding(cleaned.replace(/glass$/i, 'glass for a cleaner serve'));
  }

  if (/^garnish with /i.test(cleaned) && !/before serving/i.test(cleaned)) {
    return ensureSentenceEnding(`${cleaned} before serving`);
  }

  return ensureSentenceEnding(cleaned);
}

function hasAnyText(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function deriveTastingNote(cocktail: any, parsedIngredients: any[], parsedInstructions: string[], parsedTips: string[]): string {
  const infoText = [
    cocktail?.title,
    cocktail?.subtitle,
    cocktail?.description,
    ...(parsedIngredients || []).map((ingredient: any) => `${ingredient.name} ${ingredient.amount} ${ingredient.note}`),
    ...(parsedInstructions || []),
    ...(parsedTips || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hasAnyText(infoText, ['campari', 'aperol', 'vermouth', 'aperitif'])) {
    return 'Bitter citrus leads up front, a softer sweet middle follows, and the finish stays brisk and appetite-sharpening.';
  }
  if (hasAnyText(infoText, ['mint', 'lime', 'mojito'])) {
    return 'Bright lime lands first, fresh mint keeps the middle cool, and the finish stays crisp, lifted, and clean.';
  }
  if (hasAnyText(infoText, ['cream', 'crème', 'cacao', 'nutmeg'])) {
    return 'Silky and dessert-leaning up front, with a rounded middle and a soft, lingering finish.';
  }
  if (hasAnyText(infoText, ['coffee', 'espresso'])) {
    return 'Roasted coffee opens first, balanced by gentle sweetness and a smooth, lingering finish.';
  }
  if (hasAnyText(infoText, ['pineapple', 'coconut', 'tropical', 'rum'])) {
    return 'Tropical fruit arrives first, sweetness stays rounded through the middle, and the finish remains bright rather than heavy.';
  }
  if (hasAnyText(infoText, ['gin', 'juniper'])) {
    return 'Botanical lift opens the drink, citrus keeps the middle focused, and the finish lands crisp and structured.';
  }
  if (hasAnyText(infoText, ['whiskey', 'bourbon', 'rye', 'cognac', 'brandy'])) {
    return 'Warm spirit character leads, the middle stays rounded and composed, and the finish lands dry and polished.';
  }
  if (hasAnyText(infoText, ['sparkling', 'soda', 'prosecco', 'tonic'])) {
    return 'Light aromatics show first, a clean middle keeps the drink easygoing, and the finish stays lifted and refreshing.';
  }

  return `${cocktail?.title || 'This drink'} lands balanced, polished, and easy to come back to.`;
}

function enhanceTips(cocktail: any, parsedIngredients: any[], parsedInstructions: string[], parsedTips: string[]): string[] {
  const existing = (parsedTips || [])
    .map((tip) => ensureSentenceEnding(sentenceCase(String(tip || ''))))
    .filter(Boolean);

  const infoText = [
    cocktail?.title,
    cocktail?.subtitle,
    ...(parsedIngredients || []).map((ingredient: any) => `${ingredient.name} ${ingredient.amount} ${ingredient.note}`),
    ...(parsedInstructions || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const suggestions: string[] = [];

  if (hasAnyText(infoText, ['shake'])) {
    suggestions.push('Shake until the tin feels cold and tight so the drink lands properly chilled and diluted.');
  }
  if (hasAnyText(infoText, ['stir'])) {
    suggestions.push('Stir only until chilled and integrated so the texture stays clean instead of overworked.');
  }
  if (hasAnyText(infoText, ['club soda', 'soda water', 'prosecco', 'tonic', 'sparkling'])) {
    suggestions.push('Add sparkling ingredients last and stir lightly so you keep the lift in the glass.');
  }
  if (hasAnyText(infoText, ['lime', 'lemon', 'grapefruit', 'orange juice', 'fresh citrus'])) {
    suggestions.push('Fresh citrus will make the drink brighter and more precise than bottled juice.');
  }
  if (hasAnyText(infoText, ['mint'])) {
    suggestions.push('Handle mint gently so it stays aromatic and fresh instead of turning bitter.');
  }
  if (hasAnyText(infoText, ['cream', 'egg white'])) {
    suggestions.push('A colder shake and a well-chilled glass will help creamy builds land smoother and more refined.');
  }
  if (hasAnyText(infoText, ['coupe', 'martini glass'])) {
    suggestions.push('Chill the glass before pouring so the drink stays colder and more polished from the first sip.');
  }

  const combined = [...existing, ...suggestions];
  const seen = new Set<string>();
  return combined.filter((tip) => {
    const key = tip.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

// Non-alcoholic beverages data (complete dataset matching NonAlcoholicScreen)
const nonAlcoholicBeverages = [
  {
    id: 'seedlip-garden-108',
    name: 'Seedlip Garden 108',
    category: 'Zero-Proof Spirits',
    region: 'United Kingdom',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Herbal & Garden Fresh',
    description: 'A complex blend of peas, hay, spearmint, rosemary, and thyme creating a fresh garden experience.',
    abv: '0.0%',
    flavorNotes: ['Fresh herbs', 'Garden peas', 'Mint', 'Rosemary'],
    useCase: 'Perfect for G&T-style serves and herb-forward cocktails',
    buyLink: 'https://seedlipdrinks.com',
    recipes: [
      {
        name: 'Garden 108 & Tonic',
        ingredients: ['2 oz Seedlip Garden 108', '4 oz Premium tonic water', '3 cucumber slices', 'Fresh mint sprig', 'Lime wheel'],
        instructions: 'Fill glass with ice. Add Seedlip Garden 108. Top with tonic water. Garnish with cucumber, mint, and lime.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Herbaceous Spritz',
        ingredients: ['1 1/2 oz Seedlip Garden 108', '3 oz Elderflower sparkling water', '1/2 oz Fresh lime juice', 'Rosemary sprig', 'Grapefruit peel'],
        instructions: 'Combine in wine glass over ice. Stir gently. Express grapefruit oils and garnish with rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Garden Gimlet',
        ingredients: ['2 oz Seedlip Garden 108', '3/4 oz Fresh lime juice', '3/4 oz Simple syrup', 'Cucumber wheel', 'Fresh basil'],
        instructions: 'Shake ingredients with ice. Double strain into chilled coupe. Garnish with cucumber and basil.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'lyre-s-american-malt',
    name: "Lyre's American Malt",
    category: 'Zero-Proof Spirits',
    region: 'Australia',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Rich & Smoky',
    description: 'Generous flavors of honey and vanilla with a gentle smoky finish, perfect for classic cocktails.',
    abv: '0.0%',
    flavorNotes: ['Honey', 'Vanilla', 'Oak', 'Smoke'],
    useCase: 'Ideal for whiskey cocktails like Old Fashioned and Manhattan',
    buyLink: 'https://lyres.com',
    recipes: [
      {
        name: 'Smokeless Old Fashioned',
        ingredients: ['2 oz Lyre\'s American Malt', '1/4 oz Maple syrup', '2 dashes Orange bitters', '1 dash Angostura bitters', 'Orange peel', 'Luxardo cherry'],
        instructions: 'Stir all ingredients with ice. Strain over large ice cube. Express orange oils and garnish with cherry.',
        glassware: 'Old Fashioned glass',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Zero Proof Manhattan',
        ingredients: ['2 oz Lyre\'s American Malt', '1 oz Sweet vermouth', '2 dashes Angostura bitters', 'Maraschino cherry'],
        instructions: 'Stir ingredients with ice for 30 seconds. Strain into chilled coupe. Garnish with cherry.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Maple Whiskey Sour',
        ingredients: ['2 oz Lyre\'s American Malt', '3/4 oz Fresh lemon juice', '1/2 oz Maple syrup', '1 Egg white', 'Lemon wheel'],
        instructions: 'Dry shake without ice. Shake again with ice. Double strain into coupe. Garnish with lemon wheel.',
        glassware: 'Coupe glass',
        difficulty: 'Medium',
        time: '4 min'
      }
    ]
  },
  {
    id: 'monday-gin',
    name: 'Monday Zero Alcohol Gin',
    category: 'Zero-Proof Spirits',
    region: 'Canada',
    tier: 'silver',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Juniper Forward',
    description: 'Classic gin botanicals with zero alcohol - juniper, coriander, and citrus in perfect balance.',
    abv: '0.0%',
    flavorNotes: ['Juniper', 'Citrus', 'Coriander', 'Angelica'],
    useCase: 'Classic gin cocktails and modern mixed drinks',
    recipes: [
      {
        name: 'Zero Proof Gin & Tonic',
        ingredients: ['2 oz Monday Gin', '4 oz Tonic water', 'Lime wheel', 'Juniper berries'],
        instructions: 'Build in glass over ice. Stir gently. Garnish with lime and juniper berries.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min'
      }
    ]
  },
  {
    id: 'ghia-aperitif',
    name: 'Ghia Aperitif',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Mediterranean Botanicals',
    description: 'A sophisticated aperitif with rosemary, ginger, and elderflower for the perfect pre-dinner drink.',
    abv: '0.0%',
    flavorNotes: ['Rosemary', 'Ginger', 'Elderflower', 'Citrus'],
    useCase: 'Perfect for aperitif hour and spritz-style cocktails',
    recipes: [
      {
        name: 'Ghia Spritz',
        ingredients: ['2 oz Ghia Aperitif', '3 oz Sparkling water', '1 oz Fresh grapefruit juice', 'Rosemary sprig', 'Grapefruit wheel'],
        instructions: 'Build in wine glass over ice. Top with sparkling water. Garnish with grapefruit and rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min'
      }
    ]
  },
  {
    id: 'gt-s-gingerade',
    name: "GT's Gingerade Kombucha",
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Probiotic & Refreshing',
    description: 'Living kombucha with organic ginger providing digestive benefits and refreshing taste.',
    abv: '<0.5%',
    flavorNotes: ['Ginger', 'Fermented tea', 'Probiotics', 'Tangy'],
    useCase: 'Great for wellness cocktails and digestive health',
    recipes: [
      {
        name: 'Ginger Kombucha Mule',
        ingredients: ['6 oz GT\'s Gingerade', '1 oz Fresh lime juice', '1/2 oz Agave syrup', 'Mint sprig', 'Candied ginger', 'Lime wheel'],
        instructions: 'Combine lime juice and agave in mug. Add ice and kombucha. Stir gently. Garnish with mint, ginger, and lime.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'recess-hemp-sparkling-water',
    name: 'Recess Hemp Sparkling Water',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'silver',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Calm & Focused',
    description: 'Sparkling water infused with hemp extract and adaptogens for relaxation and focus.',
    abv: '0.0%',
    flavorNotes: ['Light hemp', 'Citrus', 'Adaptogenic herbs', 'Clean finish'],
    useCase: 'Perfect for mindful drinking and wellness-focused cocktails',
    recipes: [
      {
        name: 'Zen Garden Spritz',
        ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh cucumber juice', '1/2 oz Mint simple syrup', 'Cucumber ribbons', 'Fresh mint'],
        instructions: 'Combine cucumber juice and syrup in glass. Add ice and Recess water. Garnish with cucumber and mint.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '4 min'
      },
      {
        name: 'Hemp Citrus Cooler',
        ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh lemon juice', '1/2 oz Simple syrup', 'Fresh thyme', 'Lemon wheel'],
        instructions: 'Muddle thyme gently in glass. Add lemon juice and syrup. Fill with ice. Top with Recess water. Garnish with lemon wheel.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'ritual-zero-proof-gin',
    name: 'Ritual Zero Proof Gin Alternative',
    category: 'Zero-Proof Spirits',
    region: 'United States',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Botanical Excellence',
    description: 'Distilled with juniper, coriander, and angelica root for an authentic gin experience without alcohol.',
    abv: '0.0%',
    flavorNotes: ['Juniper', 'Angelica root', 'Coriander', 'Citrus'],
    useCase: 'Perfect for classic gin cocktails and modern zero-proof mixology',
    recipes: [
      {
        name: 'Zero Proof Negroni',
        ingredients: ['1 oz Ritual Gin Alternative', '1 oz Seedlip Spice 94', '1 oz Sweet vermouth', 'Orange peel'],
        instructions: 'Stir all ingredients with ice. Strain over fresh ice. Express orange oils and garnish with peel.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Garden Martini',
        ingredients: ['2 1/2 oz Ritual Gin Alternative', '1/2 oz Dry vermouth', '2 dashes Orange bitters', 'Lemon twist'],
        instructions: 'Stir ingredients with ice until well chilled. Strain into chilled coupe. Garnish with lemon twist.',
        glassware: 'Coupe glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'wilderton-earthen',
    name: 'Wilderton Earthen',
    category: 'Zero-Proof Spirits',
    region: 'United States',
    tier: 'silver',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Forest Floor',
    description: 'Crafted with Douglas fir, sage, and lavender for an earthy, complex botanical experience.',
    abv: '0.0%',
    flavorNotes: ['Douglas fir', 'Sage', 'Lavender', 'Earthy botanicals'],
    useCase: 'Ideal for contemplative sipping and herbal cocktails',
    recipes: [
      {
        name: 'Forest Floor',
        ingredients: ['2 oz Wilderton Earthen', '1/2 oz Honey syrup', '1/2 oz Fresh lemon juice', 'Sage sprig', 'Lavender garnish'],
        instructions: 'Shake ingredients with ice. Strain into rocks glass over fresh ice. Garnish with sage and lavender.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'athletic-brewing-coffee',
    name: 'Athletic Brewing Cold Brew Coffee',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Performance & Flavor',
    description: 'Premium cold brew coffee crafted for athletes and coffee enthusiasts seeking clean energy.',
    abv: '0.0%',
    flavorNotes: ['Rich coffee', 'Chocolate notes', 'Smooth finish', 'No sugar crash'],
    useCase: 'Perfect for coffee cocktails and energy-focused beverages',
    recipes: [
      {
        name: 'Coffee Spritz',
        ingredients: ['4 oz Athletic Cold Brew', '2 oz Sparkling water', '1/2 oz Vanilla syrup', 'Orange peel', 'Coffee beans'],
        instructions: 'Combine cold brew and vanilla syrup in glass. Add ice and top with sparkling water. Garnish with orange peel and coffee beans.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Espresso Martini Zero',
        ingredients: ['3 oz Athletic Cold Brew', '1 oz Coffee liqueur alternative', '1/2 oz Simple syrup', '3 Coffee beans'],
        instructions: 'Shake all ingredients vigorously with ice. Double strain into chilled coupe. Float 3 coffee beans on foam.',
        glassware: 'Coupe glass',
        difficulty: 'Medium',
        time: '4 min'
      }
    ]
  },
  {
    id: 'kin-euphorics-high-rhode',
    name: 'Kin Euphorics High Rhode',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Mood-Elevating',
    description: 'A euphoric blend of adaptogens, nootropics, and botanicals designed to elevate your mood naturally.',
    abv: '<0.5%',
    flavorNotes: ['Hibiscus', 'Orange bitters', 'Licorice root', 'Cardamom'],
    useCase: 'Perfect for social occasions and mood enhancement',
    recipes: [
      {
        name: 'High Rhode Spritz',
        ingredients: ['2 oz Kin High Rhode', '3 oz Sparkling wine', '1 oz Fresh grapefruit juice', 'Grapefruit wheel', 'Rosemary sprig'],
        instructions: 'Combine High Rhode and grapefruit juice in wine glass. Add ice and top with sparkling wine. Garnish with grapefruit and rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'seedlip-spice-94',
    name: 'Seedlip Spice 94',
    category: 'Zero-Proof Spirits',
    region: 'United Kingdom',
    tier: 'gold',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Warm & Spiced',
    description: 'A warm, aromatic blend of allspice and cardamom with a complex spice profile.',
    abv: '0.0%',
    flavorNotes: ['Allspice', 'Cardamom', 'Oak', 'Citrus peel'],
    useCase: 'Perfect for spiced cocktails and warming winter drinks',
    recipes: [
      {
        name: 'Spiced Mule',
        ingredients: ['2 oz Seedlip Spice 94', '1/2 oz Fresh lime juice', '4 oz Ginger beer', 'Lime wheel', 'Candied ginger'],
        instructions: 'Build in copper mug over ice. Stir gently. Garnish with lime and candied ginger.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Spice Route',
        ingredients: ['1 1/2 oz Seedlip Spice 94', '1 oz Apple juice', '1/2 oz Honey syrup', '1/4 oz Lemon juice', 'Cinnamon stick'],
        instructions: 'Shake ingredients with ice. Strain into rocks glass over fresh ice. Garnish with cinnamon stick.',
        glassware: 'Rocks glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'aperol-spritz-zero',
    name: 'Lyre\'s Italian Orange',
    category: 'Low-ABV Options',
    region: 'Australia',
    tier: 'silver',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Italian Aperitivo',
    description: 'Zero-proof alternative to Italian orange aperitif with bitter orange and herbal complexity.',
    abv: '0.0%',
    flavorNotes: ['Bitter orange', 'Herbs', 'Rhubarb', 'Vanilla'],
    useCase: 'Perfect for aperitif hour and Italian-style spritzes',
    recipes: [
      {
        name: 'Zero Proof Aperol Spritz',
        ingredients: ['3 oz Lyre\'s Italian Orange', '3 oz Prosecco', '1 oz Soda water', 'Orange slice'],
        instructions: 'Build in wine glass over ice. Top with soda water. Garnish with orange slice.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Italian Sunset',
        ingredients: ['2 oz Lyre\'s Italian Orange', '1 oz Fresh grapefruit juice', '1/2 oz Honey syrup', '3 oz Sparkling water', 'Grapefruit twist'],
        instructions: 'Shake orange liqueur, grapefruit juice, and honey with ice. Strain into highball over ice. Top with sparkling water.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'curious-elixir-no2',
    name: 'Curious Elixir No. 2',
    category: 'Low-ABV Options',
    region: 'United States',
    tier: 'bronze',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Negroni Inspired',
    description: 'A sophisticated blend inspired by the classic Negroni with bitter and sweet botanicals.',
    abv: '<0.5%',
    flavorNotes: ['Bitter orange', 'Juniper', 'Gentian', 'Rosemary'],
    useCase: 'Ready-to-drink alternative to classic bitter cocktails',
    recipes: [
      {
        name: 'Curious Spritz',
        ingredients: ['4 oz Curious Elixir No. 2', '2 oz Sparkling water', 'Orange peel', 'Fresh rosemary'],
        instructions: 'Pour over ice in wine glass. Top with sparkling water. Express orange oils and garnish with rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '2 min'
      }
    ]
  },
  {
    id: 'health-ade-kombucha',
    name: 'Health-Ade Ginger Lemon Kombucha',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'bronze',
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Probiotic Power',
    description: 'Organic kombucha with real ginger and lemon for digestive health and refreshing taste.',
    abv: '<0.5%',
    flavorNotes: ['Fresh ginger', 'Lemon', 'Fermented tea', 'Tangy'],
    useCase: 'Great for wellness cocktails and digestive support',
    recipes: [
      {
        name: 'Ginger Lemon Mule',
        ingredients: ['6 oz Health-Ade Ginger Lemon', '1 oz Fresh lime juice', '1/2 oz Agave nectar', 'Mint sprig', 'Crystallized ginger'],
        instructions: 'Combine lime juice and agave in mug. Add ice and kombucha. Stir gently. Garnish with mint and ginger.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Wellness Spritzer',
        ingredients: ['4 oz Health-Ade Ginger Lemon', '2 oz Sparkling water', '1 oz Fresh cucumber juice', 'Cucumber ribbon', 'Lemon wheel'],
        instructions: 'Combine cucumber juice with kombucha in glass. Add ice and top with sparkling water. Garnish with cucumber and lemon.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  },
  {
    id: 'rebbl-ashwagandha-chai',
    name: 'REBBL Ashwagandha Chai',
    category: 'Wellness Drinks',
    region: 'United States',
    tier: 'silver',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    tagline: 'Adaptogenic Blend',
    description: 'Plant-based superfood drink with ashwagandha, reishi, and warming spices for stress support.',
    abv: '0.0%',
    flavorNotes: ['Chai spices', 'Coconut', 'Ashwagandha', 'Cinnamon'],
    useCase: 'Perfect for evening relaxation and stress relief cocktails',
    recipes: [
      {
        name: 'Golden Hour Latte',
        ingredients: ['6 oz REBBL Ashwagandha Chai', '2 oz Steamed oat milk', '1/2 oz Vanilla syrup', 'Cinnamon stick', 'Star anise'],
        instructions: 'Heat chai drink. Steam oat milk and vanilla syrup. Combine in mug. Garnish with cinnamon and star anise.',
        glassware: 'Coffee mug',
        difficulty: 'Easy',
        time: '4 min'
      },
      {
        name: 'Spiced Chai Fizz',
        ingredients: ['4 oz REBBL Ashwagandha Chai', '2 oz Sparkling water', '1/2 oz Maple syrup', 'Orange peel', 'Cardamom pod'],
        instructions: 'Combine chai and maple syrup in glass. Add ice and top with sparkling water. Garnish with orange peel and cardamom.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '3 min'
      }
    ]
  }
];

const cocktailData = {
  'old-fashioned': {
    id: 'old-fashioned',
    title: 'Old Fashioned',
    subtitle: 'Classic • Whiskey-based',
    description: 'A timeless cocktail made with whiskey, sugar, bitters, and an orange twist. This drink represents the essence of what a cocktail should be - simple, balanced, and perfectly executed.',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz Whiskey', note: 'Bourbon or Rye preferred' },
      { name: '1/4 oz Simple Syrup', note: 'Or 1 sugar cube' },
      { name: '2 dashes Angostura Bitters', note: 'Essential for flavor' },
      { name: 'Orange Peel', note: 'For garnish and aroma' },
      { name: 'Ice', note: 'Large cube preferred' }
    ],
    instructions: [
      'Add simple syrup and bitters to rocks glass',
      'Add whiskey and stir to combine',
      'Add ice (preferably one large cube)',
      'Stir gently to chill and dilute',
      'Express orange peel oils over drink',
      'Garnish with orange peel'
    ],
    tips: [
      'Use a large ice cube to minimize dilution',
      'Express the orange peel properly for best aroma',
      'Quality whiskey makes a big difference'
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 49.99
  },
  'manhattan': {
    id: 'manhattan',
    title: 'Manhattan',
    subtitle: 'Classic • Whiskey-based',
    description: 'An elegant mix of whiskey, sweet vermouth, and bitters, garnished with a cherry. The Manhattan is the sophisticated sibling of the Old Fashioned.',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Rye Whiskey', note: 'Bourbon also works well' },
      { name: '1 oz Sweet Vermouth', note: 'Quality matters here' },
      { name: '2 dashes Angostura Bitters', note: 'Classic choice' },
      { name: 'Maraschino Cherry', note: 'For garnish' }
    ],
    instructions: [
      'Add whiskey, vermouth, and bitters to mixing glass',
      'Add ice and stir for 30 seconds',
      'Strain into chilled Coupe glass',
      'Garnish with cherry'
    ],
    tips: [
      'Stir, don\'t shake - keeps it clear',
      'Chill your glass beforehand',
      'Good vermouth is crucial'
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 54.99
  },
  'negroni': {
    id: 'negroni',
    title: 'Negroni',
    subtitle: 'Classic • Gin-based',
    description: 'A bitter and sweet Italian cocktail with gin, Campari, and sweet vermouth. Perfect for those who appreciate complex, bitter flavors.',
    img: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '1 oz Gin', note: 'London Dry style preferred' },
      { name: '1 oz Campari', note: 'The signature bitter element' },
      { name: '1 oz Sweet Vermouth', note: 'Balances the bitterness' },
      { name: 'Orange Peel', note: 'Essential garnish' }
    ],
    instructions: [
      'Add gin, Campari, and vermouth to rocks glass',
      'Add ice and stir to combine',
      'Express orange peel over drink',
      'Drop peel into glass'
    ],
    tips: [
      'Equal parts - the perfect balance',
      'Build in glass for simplicity',
      'Orange peel oils are essential'
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 64.99
  },
  'espresso-martini': {
    id: 'espresso-martini',
    title: 'Espresso Martini',
    subtitle: 'Modern • Vodka-based',
    description: 'A sophisticated coffee cocktail with vodka, coffee liqueur, and fresh espresso. The perfect pick-me-up cocktail.',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?auto=format&fit=crop&w=1200&q=60',
    difficulty: 'Medium',
    time: '5 min',
    ingredients: [
      { name: '2 oz Vodka', note: 'Premium vodka recommended' },
      { name: '1/2 oz Coffee Liqueur', note: 'Kahlúa or similar' },
      { name: '1 shot Fresh Espresso', note: 'Must be fresh and hot' },
      { name: '1/4 oz Simple Syrup', note: 'Optional, to taste' }
    ],
    instructions: [
      'Brew fresh espresso shot',
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 15 seconds',
      'Double strain into chilled coupe',
      'Garnish with 3 coffee beans'
    ],
    tips: [
      'Fresh espresso is non-negotiable',
      'Shake hard to create foam',
      'Serve immediately while hot'
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 39.99
  },
  'classic-martini': {
    id: 'classic-martini',
    title: 'Classic Martini',
    subtitle: 'Classic • Gin-based',
    description: 'A timeless classic cocktail with gin and dry vermouth. The epitome of cocktail elegance and sophistication.',
    img: 'https://images.unsplash.com/photo-1541976076758-347942db1978?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Gin', note: 'London Dry preferred' },
      { name: '1/2 oz Dry Vermouth', note: 'Quality matters' },
      { name: 'Olive or Lemon Twist', note: 'For garnish' }
    ],
    instructions: [
      'Add gin and vermouth to mixing glass with ice',
      'Stir for 30 seconds until well chilled',
      'Strain into chilled Coupe glass',
      'Garnish with olive or lemon twist'
    ],
    tips: [
      'Stir, don\'t shake for clarity',
      'Chill your glass beforehand',
      'Less vermouth for a drier martini'
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 44.99
  },
  'virgin-mojito': {
    id: 'virgin-mojito',
    title: 'Virgin Mojito',
    subtitle: 'Non-Alcoholic • Refreshing',
    description: 'Refreshing non-alcoholic version of the classic mojito with fresh mint, lime, and sparkling water.',
    img: 'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: 'Fresh Lime Juice', note: '1 oz freshly squeezed' },
      { name: 'Mint Leaves', note: '8-10 fresh leaves' },
      { name: 'Simple Syrup', note: '1/2 oz to taste' },
      { name: 'Soda Water', note: '4 oz chilled' },
      { name: 'Ice', note: 'Crushed preferred' }
    ],
    instructions: [
      'Muddle mint leaves gently in glass',
      'Add lime juice and simple syrup',
      'Fill glass with crushed ice',
      'Top with soda water',
      'Stir gently and garnish with mint sprig'
    ],
    tips: [
      'Don\'t over-muddle the mint',
      'Use fresh lime juice only',
      'Adjust sweetness to taste'
    ],
    glassware: 'Highball Glass',
    kitAvailable: false,
    kitPrice: 0
  },
  'mojito': {
    id: 'mojito',
    title: 'Mojito',
    subtitle: 'Classic • Rum-based',
    description: 'A refreshing Cuban cocktail with white rum, fresh mint, lime juice, sugar, and soda water. The perfect summer drink.',
    img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz White Rum', note: 'Light rum preferred' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '2 tsp Sugar', note: 'Or 1/2 oz simple syrup' },
      { name: '8-10 Mint Leaves', note: 'Fresh mint only' },
      { name: 'Soda Water', note: '2-3 oz to top' },
      { name: 'Ice', note: 'Crushed preferred' }
    ],
    instructions: [
      'Gently muddle mint leaves with sugar in glass',
      'Add lime juice and rum',
      'Fill glass with crushed ice',
      'Top with soda water',
      'Stir gently and garnish with mint sprig'
    ],
    tips: [
      'Don\'t over-muddle the mint - bruise, don\'t tear',
      'Use fresh lime juice only',
      'Adjust sweetness to taste'
    ],
    glassware: 'Highball Glass',
    kitAvailable: true,
    kitPrice: 34.99
  },
  'daiquiri': {
    id: 'daiquiri',
    title: 'Daiquiri',
    subtitle: 'Classic • Rum-based',
    description: 'A simple yet perfect cocktail with white rum, lime juice, and simple syrup. The essence of Caribbean elegance.',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz White Rum', note: 'Quality white rum' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '3/4 oz Simple Syrup', note: 'Adjust to taste' }
    ],
    instructions: [
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Double strain into chilled Coupe glass',
      'Garnish with lime wheel if desired'
    ],
    tips: [
      'Balance is key - adjust sweetness to taste',
      'Shake hard for proper dilution',
      'Serve immediately while cold'
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 29.99
  },
  'margarita': {
    id: 'margarita',
    title: 'Margarita',
    subtitle: 'Classic • Tequila-based',
    description: 'The quintessential tequila cocktail with lime juice, orange liqueur, and a salted rim. Perfect balance of sweet, sour, and salty.',
    img: 'https://images.unsplash.com/photo-1541976076758-347942db1978?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    ingredients: [
      { name: '2 oz Blanco Tequila', note: '100% agave preferred' },
      { name: '1 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '1 oz Orange Liqueur', note: 'Cointreau or Triple Sec' },
      { name: 'Salt', note: 'For rim' },
      { name: 'Lime Wheel', note: 'For garnish' }
    ],
    instructions: [
      'Rim glass with salt using lime wheel',
      'Add tequila, lime juice, and orange liqueur to shaker',
      'Add ice and shake vigorously',
      'Strain into salt-rimmed rocks glass over ice',
      'Garnish with lime wheel'
    ],
    tips: [
      'Use 100% agave tequila for best flavor',
      'Fresh lime juice is essential',
      'Salt rim is traditional but optional'
    ],
    glassware: 'Rocks Glass',
    kitAvailable: true,
    kitPrice: 39.99
  },
  'cosmopolitan': {
    id: 'cosmopolitan',
    title: 'Cosmopolitan',
    subtitle: 'Modern • Vodka-based',
    description: 'A glamorous pink cocktail with vodka, cranberry juice, lime juice, and orange liqueur. Made famous in the 90s.',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '1 1/2 oz Vodka', note: 'Premium vodka preferred' },
      { name: '1/2 oz Orange Liqueur', note: 'Cointreau or Triple Sec' },
      { name: '1/2 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '1/2 oz Cranberry Juice', note: 'For color and flavor' },
      { name: 'Lime Wheel', note: 'For garnish' }
    ],
    instructions: [
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Double strain into chilled Coupe glass',
      'Garnish with lime wheel on rim'
    ],
    tips: [
      'Use just enough cranberry for pink color',
      'Fresh lime juice makes all the difference',
      'Serve in a chilled glass'
    ],
    glassware: 'Coupe Glass',
    kitAvailable: true,
    kitPrice: 34.99
  },
  'moscow-mule': {
    id: 'moscow-mule',
    title: 'Moscow Mule',
    subtitle: 'Classic • Vodka-based',
    description: 'A refreshing cocktail with vodka, ginger beer, and lime juice, traditionally served in a copper mug.',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    ingredients: [
      { name: '2 oz Vodka', note: 'Quality vodka' },
      { name: '1/2 oz Fresh Lime Juice', note: 'Freshly squeezed' },
      { name: '4-6 oz Ginger Beer', note: 'Spicy ginger beer preferred' },
      { name: 'Lime Wedge', note: 'For garnish' },
      { name: 'Ice', note: 'Cubed ice' }
    ],
    instructions: [
      'Fill copper mug or highball glass with ice',
      'Add vodka and lime juice',
      'Top with ginger beer',
      'Stir gently to combine',
      'Garnish with lime wedge'
    ],
    tips: [
      'Copper mug keeps drink colder longer',
      'Good quality ginger beer is key',
      'Don\'t over-stir to preserve carbonation'
    ],
    glassware: 'Copper Mug',
    kitAvailable: true,
    kitPrice: 32.99
  }
};

// Function to get non-alcoholic recipe data
const getNonAlcoholicRecipeData = (recipeId: string) => {
  for (const beverage of nonAlcoholicBeverages) {
    for (const recipe of beverage.recipes) {
      const fullRecipeId = `${beverage.id}-${recipe.name}`;
      if (fullRecipeId === recipeId) {
        return {
          id: fullRecipeId,
          title: recipe.name,
          subtitle: `${beverage.category} • ${beverage.name}`,
          description: `${beverage.description} ${beverage.useCase}`,
          img: beverage.image,
          difficulty: recipe.difficulty,
          time: recipe.time,
          ingredients: recipe.ingredients.map(ingredient => ({
            name: ingredient,
            note: beverage.name
          })),
          instructions: recipe.instructions.split('. ').filter(step => step.trim()),
          tips: beverage.flavorNotes.map(note => `Features ${note.toLowerCase()} notes`),
          glassware: recipe.glassware,
          kitAvailable: false,
          kitPrice: 0,
          isNonAlcoholic: true,
          beverage
        };
      }
    }
  }
  return null;
};

export default function CocktailDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CocktailDetailScreenRouteProp>();
  const { toggleSavedCocktail, isCocktailSaved, savedCocktailCount, canSaveMoreCocktails } = useSavedItems();
  const { toast, showToast, hideToast } = useToast();
  const { isPro, isPrestige } = useSubscription();
  const completionConfig = getCompletionPromptConfig(isPro || isPrestige ? 'pro' : 'free');
  const { gateWithTrigger: saveGate } = useFeatureAccess('saved_cocktails_unlimited');
  const tier = useUserTier((state) => state.tier);
  const { earnCocktailLoggedXP, earnRecipeRatingXP } = useXPSystem();
  const { user } = useAuth();
  const getUserRecipeById = useUserRecipes((state) => state.getRecipeById);
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

  const [firebaseRecipe, setFirebaseRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [hasMadeIt, setHasMadeIt] = useState(false);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [missingIngredientNames, setMissingIngredientNames] = useState<string[]>([]);
  const [makeFlowVisible, setMakeFlowVisible] = useState(false);
  const [ratingFlowVisible, setRatingFlowVisible] = useState(false);
  const [brandSelections, setBrandSelections] = useState<Record<string, string>>({});
  const [substitutions, setSubstitutions] = useState('');
  const [techniqueVariations, setTechniqueVariations] = useState('');
  const [personalModifications, setPersonalModifications] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [lastCompletionId, setLastCompletionId] = useState<string | null>(null);
  const onScrollHaptic = useScrollHaptic('selection', 800);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const viewStartTime = React.useRef<number>(Date.now());

  // Fetch user inventory for substitution suggestions
  useEffect(() => {
    const loadInventory = async () => {
      if (user) {
        log.info('CocktailDetailScreen', 'Loading user inventory', { userId: user.id });
        const inventory = await InventoryService.getUserInventory(user.id);
        log.info('CocktailDetailScreen', 'Inventory loaded', {
          inventoryCount: inventory.length,
          items: inventory.map(i => i.item_name).slice(0, 10),
        });
        setUserInventory(inventory);
      } else {
        log.warn('CocktailDetailScreen', 'No user found - cannot load inventory');
      }
    };
    loadInventory();
  }, [user]);

  // Always fetch full recipe from Supabase to get complete data (ingredients, instructions)
  // Passed cocktail object may be lite-loaded with empty ingredients
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        // Always fetch from Supabase to get complete data
        const recipe = await RecipesRepository.getRecipeById(route.params.cocktailId);
        if (recipe) {
          setFirebaseRecipe(recipe);
        }

        // Track recipe view for achievements
        await achievementService.trackAction('recipesViewed', 1);
      } catch (error) {
        log.error('CocktailDetailScreen', 'Error loading recipe', error);
        // Only show error if we don't have fallback data
        if (!route.params.cocktail) {
          showToast('Failed to load recipe details', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [route.params.cocktailId]);

  // Track engagement time when user leaves the screen
  useEffect(() => {
    viewStartTime.current = Date.now();

    return () => {
      const viewDurationSeconds = Math.round((Date.now() - viewStartTime.current) / 1000);

      // Only track if user spent meaningful time (at least 3 seconds)
      if (viewDurationSeconds >= 3) {
        trackEvent(ANALYTICS_EVENTS.RECIPE_ENGAGEMENT, {
          [ANALYTICS_PROPS.RECIPE_ID]: route.params.cocktailId,
          [ANALYTICS_PROPS.RECIPE_NAME]: route.params.cocktail?.title || route.params.cocktail?.name || 'Unknown',
          [ANALYTICS_PROPS.VIEW_DURATION_SECONDS]: viewDurationSeconds,
        });
      }
    };
  }, [route.params.cocktailId]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const recipe = await RecipesRepository.getRecipeById(route.params.cocktailId);
      setFirebaseRecipe(recipe);
      showToast('Recipe refreshed!', 'success');
    } catch (error) {
      log.error('CocktailDetailScreen', 'Error refreshing recipe', error);
      showToast('Failed to refresh recipe', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Check data sources in priority order:
  // 1. Passed cocktail object (for local recipes like mocktails)
  // 2. Non-alcoholic recipes
  // 3. Firebase user-created recipes
  // 4. Hardcoded premium cocktails (original 11)
  // 5. Transformed centralized cocktails (new 81)

  // Transform passed cocktail if it exists and needs transformation
  const passedCocktail = route.params.cocktail ? (() => {
    const raw = route.params.cocktail;
    const normalizedBase = {
      ...raw,
      title: raw.title || raw.name || 'Custom Recipe',
      subtitle: raw.subtitle || 'Custom Recipe',
      img: raw.img || raw.image || raw.thumbnailImage || raw.headerImage || 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
      difficulty: raw.difficulty || 'Easy',
      time: raw.time || (raw.prepTime ? `${raw.prepTime} min` : '5 min'),
    };

    // If it already has properly formatted ingredients, use as-is
    if (raw.ingredients && Array.isArray(raw.ingredients) && raw.ingredients.length > 0 && typeof raw.ingredients[0] === 'object' && raw.ingredients[0].name) {
      return normalizedBase;
    }

    // If it has string ingredients, transform them
    if (raw.ingredients && Array.isArray(raw.ingredients) && raw.ingredients.length > 0) {
      return {
        ...normalizedBase,
        ingredients: raw.ingredients.map((ing: any) => {
          if (typeof ing === 'string') {
            return { name: ing, note: undefined };
          }
          return ing;
        })
      };
    }

    // If no ingredients, use the transformer to get them from centralized data
    return getDetailedCocktail(raw.id) || normalizedBase;
  })() : null;
  const localUserRecipe = getUserRecipeById(route.params.cocktailId);
  const localUserRecipeCocktail = localUserRecipe ? {
    id: localUserRecipe.id,
    title: localUserRecipe.name,
    subtitle: localUserRecipe.type === 'ai_generated' ? 'AI Generated' : 'Custom Recipe',
    description: localUserRecipe.description || 'Custom cocktail recipe',
    img: localUserRecipe.image || localUserRecipe.thumbnailImage || localUserRecipe.headerImage || 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
    image: localUserRecipe.image || localUserRecipe.thumbnailImage || localUserRecipe.headerImage,
    difficulty: localUserRecipe.difficulty || 'Easy',
    time: localUserRecipe.prepTime ? `${localUserRecipe.prepTime} min` : '5 min',
    ingredients: localUserRecipe.ingredients || [],
    instructions: localUserRecipe.instructions || [],
    tips: localUserRecipe.tags || [],
    isLocalUserRecipe: true,
  } : null;

  const nonAlcoholicRecipe = getNonAlcoholicRecipeData(route.params.cocktailId);
  const hardcodedCocktail = cocktailData[route.params.cocktailId as keyof typeof cocktailData];
  const transformedCocktail = getDetailedCocktail(route.params.cocktailId);

  // Convert Supabase/Firebase recipe to cocktail format if available
  const firebaseCocktail = firebaseRecipe ? (() => {
    // Check if it's an AI-formatted recipe first
    if (firebaseRecipe.aiFormattedData) {
      return {
        id: firebaseRecipe.id,
        title: firebaseRecipe.aiFormattedData.title || firebaseRecipe.title || 'Untitled Recipe',
        subtitle: `Custom Recipe • ${firebaseRecipe.aiFormattedData.tags?.[0] || 'Mixed'}`,
        description: firebaseRecipe.aiFormattedData.description || 'Custom recipe created with AI assistance',
        img: firebaseRecipe.imageUrl || 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
        difficulty: firebaseRecipe.aiFormattedData.difficulty || 'Medium',
        time: firebaseRecipe.aiFormattedData.time || '5 min',
        ingredients: firebaseRecipe.aiFormattedData.ingredients?.map((ing: any) => ({
          name: `${ing.amount || ''} ${ing.name || ''}`.trim(),
          note: ing.notes || ''
        })) || [],
        instructions: firebaseRecipe.aiFormattedData.instructions || [],
        tips: firebaseRecipe.aiFormattedData.tags?.map((tag: string) => `Tagged as: ${tag}`) || [],
        glassware: firebaseRecipe.aiFormattedData.glassware,
        kitAvailable: false,
        kitPrice: 0,
        isFirebaseRecipe: true
      };
    }

    // Otherwise, it's a Supabase recipe - convert it to display format
    return {
      id: firebaseRecipe.id,
      title: firebaseRecipe.title || 'Untitled Recipe',
      subtitle: `${firebaseRecipe.category || 'Classic'} • ${firebaseRecipe.baseSpirit || 'Mixed'}-based`,
      description: firebaseRecipe.description && firebaseRecipe.description.length > 50 ? firebaseRecipe.description : `A classic ${firebaseRecipe.baseSpirit || 'cocktail'} recipe.`,
      img: firebaseRecipe.image || firebaseRecipe.imageUrl || 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1200&q=60',
      difficulty: firebaseRecipe.difficulty === 'beginner' ? 'Easy' : firebaseRecipe.difficulty === 'intermediate' ? 'Medium' : firebaseRecipe.difficulty === 'advanced' ? 'Hard' : 'Medium',
      time: firebaseRecipe.time || `${firebaseRecipe.preparationTime || 5} min`,
      ingredients: firebaseRecipe.ingredients?.map((ing: any) => {
        // Handle different ingredient formats
        if (typeof ing === 'string') {
          return { name: ing, note: undefined };
        }
        // Supabase format: { item: "White Rum", amount: "1 oz", type: "spirit" }
        if (ing.item && ing.amount) {
          return {
            name: `${ing.amount} ${ing.item}`,
            note: ing.notes || undefined
          };
        }
        // Legacy format with amount: { name: "White Rum", amount: "1 oz" }
        if (ing.name && ing.amount && ing.amount.trim()) {
          return {
            name: `${ing.amount} ${ing.name}`,
            note: ing.notes || undefined
          };
        }
        // Format where full ingredient is in name field: { name: "1 oz White Rum", amount: "" }
        if (ing.name && (!ing.amount || !ing.amount.trim())) {
          return {
            name: ing.name,
            note: ing.notes || undefined
          };
        }
        // Fallback - try to convert to string safely
        if (typeof ing === 'object' && ing !== null) {
          return { name: ing.name || JSON.stringify(ing), note: undefined };
        }
        return { name: String(ing), note: undefined };
      }) || [],
      instructions: firebaseRecipe.instructions || [],
      tips: firebaseRecipe.tags?.slice(0, 3) || [],
      glassware: firebaseRecipe.glassware,
      kitAvailable: true,
      kitPrice: undefined,
      isSupabaseRecipe: true
    };
  })() : null;

  // Priority order: Prefer complete data sources (with ingredients)
  // 1. Non-alcoholic recipes (local, always complete)
  // 2. Firebase/Supabase data (if it has ingredients)
  // 3. Passed cocktail (only if it has ingredients)
  // 4. Hardcoded cocktails
  // 5. Transformed centralized cocktails
  const cocktail = (() => {
    if (localUserRecipeCocktail) return localUserRecipeCocktail;
    // Non-alcoholic recipes are always complete
    if (nonAlcoholicRecipe) return nonAlcoholicRecipe;

    // Check if firebase data is complete (has ingredients)
    if (firebaseCocktail) {
      const hasValidIngredients = firebaseCocktail.ingredients && firebaseCocktail.ingredients.length > 0;
      const hasValidInstructions = firebaseCocktail.instructions && firebaseCocktail.instructions.length > 0;

      // If firebase data is complete, use it (this is the primary source of truth)
      if (hasValidIngredients && hasValidInstructions) {
        return firebaseCocktail;
      }

      // If firebase data is incomplete, try to merge with transformed data
      if (transformedCocktail) {
        return {
          ...firebaseCocktail,
          // Use firebase data for basic info, but get ingredients/instructions from local if missing
          ingredients: hasValidIngredients ? firebaseCocktail.ingredients : transformedCocktail.ingredients,
          instructions: hasValidInstructions ? firebaseCocktail.instructions : transformedCocktail.instructions,
          tips: firebaseCocktail.tips?.length > 0 ? firebaseCocktail.tips : transformedCocktail.tips,
          glassware: firebaseCocktail.glassware || transformedCocktail.glassware,
        };
      }
    }

    // Only use passed cocktail if it has actual ingredients (not lite-loaded)
    if (passedCocktail && passedCocktail.ingredients && passedCocktail.ingredients.length > 0) {
      return passedCocktail;
    }

    // Fallback to hardcoded or transformed local data
    if (hardcodedCocktail) return hardcodedCocktail;
    if (transformedCocktail) return transformedCocktail;

    // Last resort: return firebase data even if incomplete, or passed cocktail
    return firebaseCocktail || passedCocktail || localUserRecipeCocktail || null;
  })();

  // Parse ingredients into consistent format for rendering
  const parsedIngredients = React.useMemo(() => {
    if (!cocktail || !cocktail.ingredients) return [];

    if (typeof cocktail.ingredients === 'string') {
      // Supabase format: split string but preserve original formatting for display
      const separator = cocktail.ingredients.includes('|') ? '|' : ',';
      const ingredientStrings = cocktail.ingredients
        .split(separator)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      return ingredientStrings.map((name) => normalizeDetailIngredient(name));
    } else if (Array.isArray(cocktail.ingredients)) {
      return cocktail.ingredients.map((ingredient) => normalizeDetailIngredient(ingredient));
    }

    return [];
  }, [cocktail]);

  // Calculate ingredient ownership stats from normalized ingredient rows
  const ingredientStats = React.useMemo(() => {
    if (!parsedIngredients.length) {
      return { owned: 0, total: 0, missing: [] as string[] };
    }

    let owned = 0;
    const missing: string[] = [];

    parsedIngredients.forEach((ingredient: any) => {
      const ingredientName = String(ingredient.matchName || ingredient.name || '').trim();
      if (!ingredientName) return;

      const hasIt = hasIngredient(userInventory, ingredientName);
      if (hasIt) {
        owned++;
      } else {
        missing.push(ingredientName);
      }
    });

    return {
      owned,
      total: parsedIngredients.length,
      missing,
    };
  }, [parsedIngredients, userInventory]);

  const makeFlowIngredients = React.useMemo(
    () =>
      parsedIngredients.map((ingredient: any, index: number) => ({
        key: `${index}_${String(ingredient.matchName || ingredient.name || '').toLowerCase()}`,
        name: String(ingredient.name || ''),
        amount: String(ingredient.amount || ''),
      })),
    [parsedIngredients]
  );

  const ownedIngredientNames = React.useMemo(() => {
    return new Set(
      parsedIngredients
        .filter((ingredient: any) => hasIngredient(userInventory, String(ingredient.matchName || ingredient.name || '')))
        .map((ingredient: any) => String(ingredient.matchName || ingredient.name || ''))
    );
  }, [parsedIngredients, userInventory]);

  const normalizeText = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const getSuggestionsForIngredient = (ingredientName: string): string[] => {
    const needle = normalizeText(ingredientName);
    if (!needle) return [];
    const tokens = needle.split(' ').filter(Boolean);

    return userInventory
      .map((item) => item.item_name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => {
        const normalizedName = normalizeText(name);
        if (normalizedName.includes(needle)) return true;
        return tokens.some((token) => token.length >= 3 && normalizedName.includes(token));
      })
      .slice(0, 5);
  };

  const syncRecipeCompletionToProfile = async (
    rating?: number,
    isRatingUpdate: boolean = false,
    completionDetails?: RecipeCompletionDetails,
    completionId?: string
  ) => {
    try {
      if (!user?.id || !cocktail?.id) return;

      const profile = await loadUserProfile(user.id);
      if (!profile) return;

      const interactionHistory = profile.interactionHistory || {
        viewedRecipes: [],
        savedRecipes: [],
        completedRecipes: [],
        searchQueries: [],
        lastUpdated: new Date(),
      };

      if (isRatingUpdate) {
        const latestIdx = [...interactionHistory.completedRecipes]
          .reverse()
          .findIndex((entry) => entry.recipeId === cocktail.id);

        if (latestIdx >= 0) {
          const actualIdx = interactionHistory.completedRecipes.length - 1 - latestIdx;
          interactionHistory.completedRecipes[actualIdx] = {
            ...interactionHistory.completedRecipes[actualIdx],
            rating: rating || undefined,
            feedback: rating ? (rating >= 4 ? 'loved' : rating >= 3 ? 'liked' : 'disliked') : undefined,
            completionId: completionId || interactionHistory.completedRecipes[actualIdx].completionId,
            completionDetails: completionDetails || interactionHistory.completedRecipes[actualIdx].completionDetails,
            timestamp: new Date(),
          };
        }
      } else {
        interactionHistory.completedRecipes.push({
          recipeId: cocktail.id,
          timestamp: new Date(),
          rating: rating || undefined,
          feedback: rating ? (rating >= 4 ? 'loved' : rating >= 3 ? 'liked' : 'disliked') : undefined,
          completionId: completionId || undefined,
          completionDetails: completionDetails || undefined,
        });
      }

      interactionHistory.lastUpdated = new Date();
      await updateUserProfileFields(user.id, { interactionHistory });
    } catch (error) {
      log.warn('CocktailDetailScreen', 'Failed to sync completion to profile (non-blocking)', error);
    }
  };

  const openMadeItFlow = () => {
    if (!cocktail || hasMadeIt) return;
    setBrandSelections({});
    setSubstitutions('');
    setTechniqueVariations('');
    setPersonalModifications('');
    setCompletionNotes('');
    setSelectedRating(0);
    setMakeFlowVisible(true);
  };

  const handleLogCompletion = async () => {
    if (!cocktail) return;

    try {
      setIsSavingCompletion(true);
      const ingredientBrands = makeFlowIngredients.map((ingredient) => ({
        ingredient: ingredient.name,
        amount: ingredient.amount || undefined,
        brandUsed: (brandSelections[ingredient.key] || '').trim() || 'Not specified',
      }));

      const completion = await logRecipeCompletion({
        userId: user?.id,
        recipeId: cocktail.id,
        recipeName: cocktail.title,
        userTier: isPro || isPrestige ? 'pro' : 'free',
        ingredientBrands,
        substitutions: substitutions.trim() || undefined,
        techniqueVariations: techniqueVariations.trim() || undefined,
        personalModifications: personalModifications.trim() || undefined,
      });

      // Sync brand data to Supabase for all tiers (feeds the brand partnership pipeline)
      syncCompletionToSupabase(completion);
      const completionDetails: RecipeCompletionDetails = {
        ingredientBrands,
        substitutions: substitutions.trim() || undefined,
        techniqueVariations: techniqueVariations.trim() || undefined,
        personalModifications: personalModifications.trim() || undefined,
      };

      setLastCompletionId(completion.id);
      setHasMadeIt(true);
      setMakeFlowVisible(false);

      const isDetailed =
        ingredientBrands.some((item) => item.brandUsed !== 'Not specified') ||
        Boolean(substitutions.trim()) ||
        Boolean(techniqueVariations.trim()) ||
        Boolean(personalModifications.trim());

      trackEvent(ANALYTICS_EVENTS.RECIPE_MADE, {
        [ANALYTICS_PROPS.RECIPE_ID]: cocktail.id,
        [ANALYTICS_PROPS.RECIPE_NAME]: cocktail.title,
        [ANALYTICS_PROPS.RECIPE_CATEGORY]: cocktail.subtitle,
      });

      await achievementService.trackAction('cocktailsMade', 1);
      earnCocktailLoggedXP(isDetailed, cocktail.title);
      await syncRecipeCompletionToProfile(undefined, false, completionDetails, completion.id);

      showToast(`Great job making ${cocktail.title}! +${isDetailed ? 75 : 50} XP`, 'success');
      Alert.alert('Logged', `${cocktail.title} added to your made drinks.`, [
        { text: 'Done', style: 'cancel' },
        { text: 'How was it?', onPress: () => setRatingFlowVisible(true) },
      ]);
    } catch (error) {
      log.error('CocktailDetailScreen', 'Failed to log completion', error);
      Alert.alert('Error', 'Could not log this drink. Please try again.');
    } finally {
      setIsSavingCompletion(false);
    }
  };

  const handleSaveRating = async () => {
    if (!lastCompletionId || selectedRating <= 0 || !cocktail) {
      setRatingFlowVisible(false);
      return;
    }

    try {
      await updateCompletionRating(lastCompletionId, selectedRating, completionNotes.trim() || undefined);
      await syncRecipeCompletionToProfile(
        selectedRating,
        true,
        completionNotes.trim()
          ? {
              notes: completionNotes.trim(),
            }
          : undefined,
        lastCompletionId
      );
      earnRecipeRatingXP(cocktail.title);
      setRatingFlowVisible(false);
      showToast('Feedback saved. Thanks!', 'success');
    } catch (error) {
      log.error('CocktailDetailScreen', 'Failed to save completion rating', error);
      Alert.alert('Error', 'Could not save rating. Please try again.');
    }
  };

  // Parse instructions into consistent format for rendering
  const parsedInstructions = React.useMemo(() => {
    if (!cocktail || !cocktail.instructions) return [];

    if (typeof cocktail.instructions === 'string') {
      // Supabase format: split string into array of steps
      // Split by period followed by space, newline, or numbered steps
      const steps = cocktail.instructions
        .split(/\.\s+|\n+/)
        .map(step => step.trim())
        .filter(step => step.length > 0)
        .map(step => {
          // Remove leading numbers like "1. ", "2) ", etc.
          return step.replace(/^\d+[\.\)]\s*/, '');
        });
      return steps.map((step) => normalizeMethodStep(step)).filter(Boolean);
    } else if (Array.isArray(cocktail.instructions)) {
      // Firebase format: already an array
      return cocktail.instructions.map((step) => normalizeMethodStep(String(step || ''))).filter(Boolean);
    }

    return [];
  }, [cocktail]);

  // Parse tips into consistent format for rendering
  const parsedTips = React.useMemo(() => {
    if (!cocktail) return [];

    let rawTips: string[] = [];
    if (typeof cocktail.tips === 'string') {
      rawTips = cocktail.tips
        .split(/\n+|•/)
        .map(tip => tip.trim())
        .filter(tip => tip.length > 0);
    } else if (Array.isArray(cocktail.tips)) {
      rawTips = cocktail.tips.map((tip) => String(tip || '').trim()).filter(Boolean);
    }

    return enhanceTips(cocktail, parsedIngredients, parsedInstructions, rawTips);
  }, [cocktail, parsedIngredients, parsedInstructions]);

  // Debug log to check cocktail data
  useEffect(() => {
    if (cocktail) {
      log.debug('CocktailDetailScreen', 'Cocktail data loaded', {
        id: cocktail.id,
        title: cocktail.title,
        hasIngredients: !!cocktail.ingredients,
        ingredientsLength: cocktail.ingredients?.length || 0,
        ingredientsType: typeof cocktail.ingredients,
        firstIngredient: cocktail.ingredients?.[0],
        source: passedCocktail ? 'passed' : nonAlcoholicRecipe ? 'nonAlcoholic' : firebaseCocktail ? 'firebase' : hardcodedCocktail ? 'hardcoded' : 'transformed'
      });
    }
  }, [cocktail]);

  // Check subscription requirement and redirect if needed
  useEffect(() => {
    if (!loading && cocktail) {
      // Check if cocktail requires Pro subscription
      const requiresProAccess = (cocktail as any).requiresPro && !isPro && !isPrestige;

      if (requiresProAccess) {
        log.info('CocktailDetailScreen', 'Pro subscription required - redirecting to Paywall');
        nav.navigate('Paywall');
      }
    }
  }, [loading, cocktail, isPro, isPrestige, nav]);

  // GLOBAL IMAGE RESOLVER: Use local images if available
  const resolvedImage = React.useMemo(() => {
    if (!cocktail) return { uri: DETAIL_FALLBACK_IMAGE };

    const candidateKeys = [
      route.params.cocktailId,
      cocktail.id,
      slugifyRecipeKey(cocktail.id),
      slugifyRecipeKey(cocktail.title),
      slugifyRecipeKey(String(cocktail.title || '').replace(/\s+shot$/i, '-shot')),
    ].filter(Boolean) as string[];

    for (const key of candidateKeys) {
      const localImage = getCocktailImage(key);
      if (localImage) return localImage;
    }

    const remoteImage =
      cocktail.img || cocktail.image || cocktail.thumbnailImage || cocktail.headerImage || '';
    return remoteImage ? { uri: remoteImage } : { uri: DETAIL_FALLBACK_IMAGE };
  }, [cocktail, route.params.cocktailId]);

  const isSaved = isCocktailSaved(route.params.cocktailId);
  const isFreeTier = tier === 'FREE';
  const showProTips = !isFreeTier;
  const useRecipeCardLayout = true;
  const detailEyebrow = cocktail?.isVaultVariation
    ? 'Variation'
    : cocktail?.isNonAlcoholic
    ? 'Zero-Proof Recipe'
    : 'Recipe';
  const heroKicker = React.useMemo(() => buildHeroKicker(cocktail), [cocktail]);
  const tastingNote = React.useMemo(() => {
    const description = String(cocktail?.description || '').trim();
    if (!isWeakTastingNote(description)) return description;

    const subtitle = String(cocktail?.subtitle || '').trim();
    if (subtitle && !isWeakTastingNote(subtitle)) {
      return `${subtitle}.`;
    }

    return deriveTastingNote(cocktail, parsedIngredients, parsedInstructions, parsedTips);
  }, [cocktail, parsedIngredients, parsedInstructions, parsedTips]);
  const displayedInstructions = React.useMemo(() => {
    if (!isFreeTier) return parsedInstructions;

    return parsedInstructions
      .slice(0, 2)
      .map((step) => trimSentence(String(step || ''), 96))
      .filter(Boolean);
  }, [isFreeTier, parsedInstructions]);
  const displayedTastingNote = React.useMemo(() => {
    if (!tastingNote) return '';
    return isFreeTier ? trimSentence(tastingNote, 120) : tastingNote;
  }, [isFreeTier, tastingNote]);

  const handleShare = async () => {
    if (!cocktail) return;
    try {
      const result = await Share.share({
        message: `Check out this amazing ${cocktail.title} recipe! Perfect for any occasion.`,
        title: `${cocktail.title} - Cocktail Recipe`,
      });

      // Track share event
      if (result.action === Share.sharedAction) {
        trackEvent(ANALYTICS_EVENTS.RECIPE_SHARED, {
          [ANALYTICS_PROPS.RECIPE_ID]: cocktail.id,
          [ANALYTICS_PROPS.RECIPE_NAME]: cocktail.title,
          [ANALYTICS_PROPS.SHARE_METHOD]: result.activityType || 'unknown',
        });

        // Track for achievements
        await achievementService.trackAction('recipesShared', 1);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleSave = async () => {
    if (!cocktail) return;

    const wasSaved = isCocktailSaved(route.params.cocktailId);

    // Soft cap: FREE can save first 5 cocktails, 6th save triggers T3 paywall.
    if (!wasSaved && !canSaveMoreCocktails) {
      saveGate('T3');
      showToast(`Free tier allows ${FREE_RECIPE_LIMIT} saved cocktails.`, 'info');
      return;
    }

    const result = toggleSavedCocktail({
      id: route.params.cocktailId,
      name: cocktail.title,
      subtitle: cocktail.subtitle,
      image: cocktail.img
        || cocktail.image
        || cocktail.thumbnailImage
        || cocktail.headerImage
    });
    if (result === 'limit_reached') {
      saveGate('T3');
      showToast(`Free tier allows ${FREE_RECIPE_LIMIT} saved cocktails.`, 'info');
      return;
    }

    // Track achievement for favorites
    if (!wasSaved) {
      await achievementService.trackAction('favoriteCount', 1);
    }

    // Show toast notification
    if (wasSaved) {
      showToast(`${cocktail.title} removed from saved`, 'info');
    } else {
      const nextCount = savedCocktailCount + 1;
      showToast(
        tier === 'FREE'
          ? `${cocktail.title} saved! (${nextCount}/${FREE_RECIPE_LIMIT} free)`
          : `${cocktail.title} saved!`,
        'success'
      );
    }
  };

  const handleAddToCart = () => {
    if (!cocktail || !cocktail.kitAvailable) return;

    // Check if ingredients exist
    const ingredients = cocktail.ingredients || [];
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'This cocktail has no ingredients listed.');
      return;
    }

    // Set missing ingredients for pre-selection in modal
    setMissingIngredientNames(ingredientStats.missing);

    // Show the grocery list modal
    setGroceryListVisible(true);
  };

  const handleDownload = () => {
    if (!cocktail) return;
    Alert.alert('Download Recipe', `${cocktail.title} recipe downloaded!`);
  };

  const handleMadeIt = () => {
    openMadeItFlow();
  };

  useLayoutEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  if (loading) {
    return <CocktailDetailSkeleton />;
  }

  if (!cocktail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <Text style={styles.errorSubtext}>
            This recipe may have been deleted or moved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollHaptic}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* --- Hero Section --- */}
        <View style={styles.heroContainer}>
          <Image
            source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={
              ['transparent', 'transparent', 'rgba(26, 18, 13, 0.8)', '#1A120D']
            }
            style={styles.heroGradient}
          >
            <View style={styles.heroLabelRow}>
              <View style={styles.heroTypePill}>
                <Ionicons
                  name={cocktail.isVaultVariation ? 'sparkles-outline' : 'ribbon-outline'}
                  size={12}
                  color={colors.accent}
                />
                <Text style={styles.heroTypePillText}>
                  {detailEyebrow}
                </Text>
              </View>
              <Text style={styles.heroWatermark}>KOOPE</Text>
            </View>

            <Text
              style={[
                styles.heroKicker,
                { fontFamily: serifFont },
              ]}
            >
              {heroKicker}
            </Text>
            <Text
              style={[
                styles.heroTitle,
                { fontFamily: serifFont },
              ]}
            >
              {cocktail.title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.subtext} />
                <Text style={styles.metaText}>{cocktail.time}</Text>
              </View>

              <Text style={styles.metaDot}>•</Text>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="chart-bar" size={16} color={colors.subtext} />
                <Text style={styles.metaText}>{cocktail.difficulty}</Text>
              </View>

              {(cocktail.glassware || cocktail.glass) && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="glass-cocktail" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>
                      {cocktail.glassware || cocktail.glass}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {ingredientStats.total > 0 && (
              <View style={styles.ingredientStatsRow}>
                <MaterialCommunityIcons
                  name="checkbox-marked-circle-outline"
                  size={16}
                  color={ingredientStats.owned === ingredientStats.total ? colors.success : colors.accent}
                />
                <Text
                  style={[
                    styles.ingredientStatsText,
                    ingredientStats.owned === ingredientStats.total && { color: colors.success },
                  ]}
                >
                  You have {ingredientStats.owned}/{ingredientStats.total} ingredients
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Back Button (Absolute) */}
          <TouchableOpacity
            style={styles.backButtonAbsolute}
            onPress={withHaptic(() => nav.goBack(), 'selection')}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          {/* Actions (Absolute Top Right) */}
          <View style={styles.topActionsAbsolute}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={withHaptic(handleShare)}
            >
              <Ionicons name="share-outline" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={withHaptic(handleSave)}
            >
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={colors.white} />
            </TouchableOpacity>
            {Boolean((route.params as any)?.cocktail?.id?.startsWith?.('recipe_') || (route.params as any)?.cocktail?.type) && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={withHaptic(() => nav.navigate('AddRecipe', { recipe: (route.params as any)?.cocktail || cocktail, isEdit: true }))}
              >
                <Ionicons name="create-outline" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={useRecipeCardLayout && styles.referenceContentShell}>
          {/* --- Action Buttons --- */}
          <View style={[styles.actionButtonsContainer, useRecipeCardLayout && styles.referenceActionButtonsContainer]}>
            {cocktail.kitAvailable ? (
              <TouchableOpacity style={[styles.primaryButton, useRecipeCardLayout && styles.referencePrimaryButton]} onPress={handleAddToCart}>
                <Text style={[styles.primaryButtonText, useRecipeCardLayout && styles.referencePrimaryButtonText]}>
                  {ingredientStats.missing.length === 0
                    ? 'Add All Ingredients to Cart'
                    : ingredientStats.missing.length === ingredientStats.total
                    ? 'Add All Ingredients to Cart'
                    : `Add Missing Ingredients (${ingredientStats.missing.length})`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, useRecipeCardLayout && styles.referencePrimaryButton]}
                onPress={handleMadeIt}
                disabled={hasMadeIt}
              >
                <Text style={[styles.primaryButtonText, useRecipeCardLayout && styles.referencePrimaryButtonText]}>
                  {hasMadeIt ? "You Made It!" : "I made this drink"}
                </Text>
              </TouchableOpacity>
            )}

            {cocktail.kitAvailable && (
              <TouchableOpacity
                style={[styles.secondaryButton, useRecipeCardLayout && styles.referenceSecondaryButton]}
                onPress={handleMadeIt}
                disabled={hasMadeIt}
              >
                <Text style={[styles.secondaryButtonText, useRecipeCardLayout && styles.referenceSecondaryButtonText]}>
                  {hasMadeIt ? "You Made It!" : "How did you make it?"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.recipeEditorialShell, useRecipeCardLayout && styles.referenceRecipeEditorialShell]}>
            <View style={[styles.recipeEditorialInner, useRecipeCardLayout && styles.referenceRecipeEditorialInner]}>
              {useRecipeCardLayout ? (
                <View style={styles.referenceSectionHeaderRow}>
                  <Text style={styles.referenceSectionEyebrow}>Ingredients</Text>
                  <View style={styles.referenceSectionRule} />
                </View>
              ) : null}
              <View style={[styles.specTable, useRecipeCardLayout && styles.referenceSpecTable]}>
                {parsedIngredients && parsedIngredients.length > 0 ? (
                  parsedIngredients.map((ingredient, index) => {
                    const isOwnedIngredient = ownedIngredientNames.has(String(ingredient.matchName || ingredient.name || ''));
                    const rightSideValue = String(ingredient.amount || ingredient.note || '').trim();
                    return (
                    <View
                      key={`ingredient-${index}`}
                      style={[
                        styles.specRow,
                        useRecipeCardLayout && styles.referenceSpecRow,
                        isOwnedIngredient && styles.specRowOwned,
                        isOwnedIngredient && useRecipeCardLayout && styles.referenceSpecRowOwned,
                        index === parsedIngredients.length - 1 && styles.specRowLast,
                      ]}
                    >
                      <View style={styles.specNameWrap}>
                        <Text
                          style={[
                            styles.specName,
                            useRecipeCardLayout && styles.referenceSpecName,
                            isOwnedIngredient && styles.specNameOwned,
                            isOwnedIngredient && useRecipeCardLayout && styles.referenceSpecNameOwned,
                          ]}
                        >
                          {ingredient.name}
                        </Text>
                        {isOwnedIngredient ? (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={16}
                            color={colors.success}
                            style={styles.specOwnedIcon}
                          />
                        ) : null}
                      </View>
                      <View style={styles.specAmountWrap}>
                        <Text
                          style={[
                            styles.specAmount,
                            useRecipeCardLayout && styles.referenceSpecAmount,
                            isOwnedIngredient && styles.specAmountOwned,
                            isOwnedIngredient && useRecipeCardLayout && styles.referenceSpecAmountOwned,
                          ]}
                        >
                          {rightSideValue}
                        </Text>
                      </View>
                    </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyRecipeCardText}>No ingredients listed.</Text>
                )}
              </View>

              {displayedInstructions.length > 0 && (
                <View style={[styles.recipeEditorialSection, useRecipeCardLayout && styles.referenceRecipeEditorialSection]}>
                  <Text
                    style={[
                      styles.recipeEditorialTitle,
                      { fontFamily: useRecipeCardLayout ? referenceSerifFont : serifFont },
                      useRecipeCardLayout && styles.referenceRecipeEditorialTitle,
                    ]}
                  >
                    Method
                  </Text>
                  <View style={[styles.methodList, useRecipeCardLayout && styles.referenceMethodList]}>
                    {displayedInstructions.map((step, index) => (
                      <View key={`step-${index}`} style={[styles.methodRow, useRecipeCardLayout && styles.referenceMethodRow]}>
                        <Text
                          style={[
                            styles.methodIndex,
                            { fontFamily: useRecipeCardLayout ? referenceDisplayFont : serifFont },
                            useRecipeCardLayout && styles.referenceMethodIndex,
                          ]}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.methodText, useRecipeCardLayout && styles.referenceMethodText]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {displayedTastingNote ? (
                <View style={[styles.recipeEditorialSection, styles.recipeEditorialSectionLast]}>
                  <Text
                    style={[
                      styles.recipeEditorialTitle,
                      { fontFamily: useRecipeCardLayout ? referenceSerifFont : serifFont },
                      useRecipeCardLayout && styles.referenceRecipeEditorialTitle,
                    ]}
                  >
                    Tasting Note
                  </Text>
                  <Text style={[styles.tastingNoteText, useRecipeCardLayout && styles.referenceTastingNoteText]}>{displayedTastingNote}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* --- Pro Tips --- */}
        {showProTips && parsedTips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Notes</Text>
            <View style={styles.proTipsContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.accent} />
                <Text style={[styles.proTipsTitle, { fontFamily: serifFont }]}>
                  {cocktail.isNonAlcoholic ? 'Flavor Profile' : 'Pro Tips'}
                </Text>
              </View>
              {parsedTips.map((tip, idx) => (
                <Text key={idx} style={styles.proTipsText}>• {tip}</Text>
              ))}
            </View>
          </View>
        )}

        {/* --- AI Support --- */}
        <View style={styles.aiSupportSection}>
          <Text style={styles.aiSupportHeader}>AI SUPPORT</Text>
          <View style={styles.aiButtonsRow}>
            <TouchableOpacity style={styles.aiButton} onPress={() => Alert.alert('Coming Soon', 'AI Substitutes')}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.accent} />
              <Text style={styles.aiButtonTitle}>Find Ingredient Substitutes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.aiButton} onPress={() => Alert.alert('Coming Soon', 'AI Customization')}>
              <MaterialCommunityIcons name="wand" size={20} color={colors.accent} />
              <Text style={styles.aiButtonTitle}>Customize This Recipe</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Grocery List Modal */}
      {cocktail && (
        <GroceryListModal
          visible={groceryListVisible}
          onClose={() => setGroceryListVisible(false)}
          recipeName={cocktail.title}
          ingredients={parsedIngredients}
          recipeId={cocktail.id}
          preSelectedIngredients={missingIngredientNames}
        />
      )}

      <Modal visible={makeFlowVisible} animationType="slide" transparent onRequestClose={() => setMakeFlowVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{completionConfig.promptText}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>+{completionConfig.xpReward} XP</Text>
                <TouchableOpacity onPress={() => setMakeFlowVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {makeFlowIngredients.map((ingredient) => {
                const suggestions = getSuggestionsForIngredient(ingredient.name);
                return (
                  <View key={ingredient.key} style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      {ingredient.name}
                      {ingredient.amount ? ` (${ingredient.amount})` : ''}
                    </Text>

                    <TextInput
                      style={styles.modalInput}
                      placeholder="Type brand used or choose below"
                      placeholderTextColor={colors.subtext}
                      value={brandSelections[ingredient.key] || ''}
                      onChangeText={(value) =>
                        setBrandSelections((prev) => ({ ...prev, [ingredient.key]: value }))
                      }
                    />

                    {suggestions.length > 0 && (
                      <View style={styles.suggestionRow}>
                        {suggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={`${ingredient.key}_${suggestion}`}
                            style={styles.suggestionChip}
                            onPress={() => setBrandSelections((prev) => ({ ...prev, [ingredient.key]: suggestion }))}
                          >
                            <Text style={styles.suggestionChipText}>{suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Quick note{completionConfig.showDetailedNotes ? '' : ' (50 chars)'}
                </Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput]}
                  placeholder={completionConfig.notesPlaceholder}
                  placeholderTextColor={colors.subtext}
                  value={substitutions}
                  onChangeText={(v) => setSubstitutions(v.slice(0, completionConfig.notesCharLimit))}
                  multiline
                  maxLength={completionConfig.notesCharLimit}
                />
              </View>

              {completionConfig.showDetailedNotes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Technique variations</Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="Shaken vs stirred, dilution, garnish technique..."
                    placeholderTextColor={colors.subtext}
                    value={techniqueVariations}
                    onChangeText={setTechniqueVariations}
                    multiline
                  />
                </View>
              )}

              {completionConfig.showDetailedNotes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Personal modifications</Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="Any tweaks to sweetness, bitter balance, ratios..."
                    placeholderTextColor={colors.subtext}
                    value={personalModifications}
                    onChangeText={setPersonalModifications}
                    multiline
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setMakeFlowVisible(false)}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, isSavingCompletion && styles.modalPrimaryButtonDisabled]}
                onPress={handleLogCompletion}
                disabled={isSavingCompletion}
              >
                {isSavingCompletion ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>I made it!</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={ratingFlowVisible} animationType="fade" transparent onRequestClose={() => setRatingFlowVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.ratingCard}>
            <Text style={styles.modalTitle}>How was it?</Text>
            <Text style={styles.ratingSubtitle}>Optional rating to improve recommendations</Text>

            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity key={rating} onPress={() => setSelectedRating(rating)}>
                  <Ionicons
                    name={rating <= selectedRating ? 'star' : 'star-outline'}
                    size={32}
                    color={rating <= selectedRating ? colors.gold : colors.subtext}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalInput, styles.multilineInput]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.subtext}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
            />

            <View style={styles.ratingActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setRatingFlowVisible(false)}>
                <Text style={styles.modalSecondaryButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSaveRating}>
                <Text style={styles.modalPrimaryButtonText}>Save Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero
  heroContainer: {
    width: '100%',
    height: 480,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
  },
  referenceHeroContainer: {
    height: rs(450),
    backgroundColor: '#120D0A',
  },
  referenceHeroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  referenceHeroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 10, 7, 0.12)',
  },
  referenceHeroGradient: {
    height: rs(238),
    justifyContent: 'flex-end',
    paddingBottom: rs(28),
    paddingHorizontal: rs(20),
  },
  referenceEditionRow: {
    marginBottom: rs(8),
  },
  referenceEditionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(999),
    backgroundColor: 'rgba(18, 12, 9, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(214, 165, 102, 0.14)',
  },
  referenceEditionChipText: {
    color: '#CFA66E',
    fontSize: rs(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  referenceHeroLabelRow: {
    marginBottom: rs(10),
    alignItems: 'center',
  },
  heroTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    backgroundColor: 'rgba(20,15,12,0.76)',
    alignSelf: 'flex-start',
  },
  referenceHeroTypePill: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(7),
    borderRadius: 999,
    borderColor: 'rgba(214,165,102,0.3)',
    backgroundColor: 'rgba(22, 16, 13, 0.82)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  referenceHeroTypePillText: {
    fontSize: rs(11),
    letterSpacing: 0.9,
    color: '#D8A45D',
  },
  heroWatermark: {
    fontSize: 10,
    color: colors.text,
    opacity: 0.78,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  referenceHeroWatermark: {
    fontSize: rs(11),
    letterSpacing: rs(1.6),
    opacity: 0.62,
  },
  heroKicker: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1),
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  referenceHeroKicker: {
    fontSize: rs(13),
    lineHeight: rs(18),
    color: 'rgba(246, 235, 221, 0.82)',
    letterSpacing: 1.2,
    marginBottom: rs(6),
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 46,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing(2.5),
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  referenceHeroTitle: {
    fontSize: rs(37),
    lineHeight: rs(41),
    letterSpacing: -0.5,
    marginBottom: rs(10),
    color: '#F2E6D8',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(1),
  },
  referenceMetaRow: {
    marginBottom: rs(12),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  referenceMetaText: {
    fontSize: rs(14),
    color: '#E0D2C1',
  },
  metaDot: {
    color: colors.subtext,
    fontSize: 14,
    marginHorizontal: 4,
  },
  referenceMetaDot: {
    fontSize: rs(13),
    color: '#C2B09C',
  },
  referenceBackButtonAbsolute: {
    top: rs(58),
    left: rs(14),
  },
  backButtonAbsolute: {
    position: 'absolute',
    top: 60,
    left: spacing(3),
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  referenceTopIconButton: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: 'rgba(7, 7, 8, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  topActionsAbsolute: {
    position: 'absolute',
    top: 60,
    right: spacing(3),
    flexDirection: 'row',
    gap: spacing(2),
  },
  referenceTopActionsAbsolute: {
    top: rs(58),
    right: rs(14),
    gap: rs(8),
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },

  // Actions
  actionButtonsContainer: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(2.5),
    gap: spacing(2),
  },
  referenceContentShell: {
    marginTop: rs(-2),
    paddingTop: rs(4),
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    backgroundColor: '#17100D',
  },
  referenceActionButtonsContainer: {
    marginTop: 0,
    paddingHorizontal: rs(16),
    gap: rs(6),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  referencePrimaryButton: {
    height: rs(58),
    borderRadius: rs(18),
    backgroundColor: '#D89A46',
    borderWidth: 0,
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '700',
  },
  referencePrimaryButtonText: {
    fontSize: rs(15),
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#19110C',
  },
  secondaryButton: {
    backgroundColor: 'rgba(242,229,213,0.03)',
    borderRadius: radii.pill,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
  },
  referenceSecondaryButton: {
    height: rs(54),
    borderRadius: rs(18),
    backgroundColor: 'rgba(31, 21, 16, 0.88)',
    borderColor: 'rgba(177,123,64,0.28)',
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  referenceSecondaryButtonText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: '#EADCCB',
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    marginTop: spacing(3),
    marginHorizontal: spacing(3),
  },
  customizeButtonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },

  recipeEditorialShell: {
    paddingHorizontal: spacing(2.5),
    marginTop: spacing(3.25),
    marginBottom: spacing(1),
  },
  referenceRecipeEditorialShell: {
    paddingHorizontal: rs(14),
    marginTop: rs(10),
  },
  recipeEditorialInner: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(0.75),
    paddingBottom: spacing(0.5),
  },
  referenceRecipeEditorialInner: {
    paddingHorizontal: rs(14),
    paddingTop: rs(8),
    paddingBottom: rs(16),
    borderRadius: rs(22),
    backgroundColor: '#1A1310',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.035)',
  },
  referenceSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(8),
    paddingTop: rs(2),
  },
  referenceSectionEyebrow: {
    color: '#AF8150',
    fontSize: rs(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  referenceSectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,165,102,0.08)',
  },
  recipeEditorialSection: {
    paddingTop: spacing(2.9),
  },
  referenceRecipeEditorialSection: {
    paddingTop: rs(14),
  },
  recipeEditorialSectionLast: {
    paddingBottom: 0,
  },
  recipeEditorialTitle: {
    fontSize: 31,
    lineHeight: 36,
    color: '#F6EBDD',
    marginBottom: spacing(1.5),
    fontWeight: '500',
  },
  referenceRecipeEditorialTitle: {
    fontSize: rs(22),
    lineHeight: rs(26),
    marginBottom: rs(8),
    color: '#EEDFCF',
  },
  specTable: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 209, 189, 0.09)',
    overflow: 'hidden',
    backgroundColor: '#34241C',
  },
  referenceSpecTable: {
    borderRadius: rs(22),
    backgroundColor: '#261A15',
    borderColor: 'rgba(214,165,102,0.08)',
  },
  specRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
    paddingHorizontal: spacing(1.95),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 209, 189, 0.06)',
  },
  specRowOwned: {
    backgroundColor: 'rgba(74, 122, 89, 0.08)',
  },
  referenceSpecRow: {
    minHeight: rs(66),
    paddingHorizontal: rs(14),
    borderBottomColor: 'rgba(214,165,102,0.06)',
  },
  referenceSpecRowOwned: {
    backgroundColor: 'rgba(74, 122, 89, 0.1)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  specAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing(0.75),
    marginLeft: spacing(1),
  },
  specOwnedIcon: {
    marginTop: 1,
  },
  specName: {
    flexShrink: 1,
    color: '#F5EBDC',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '400',
  },
  specNameOwned: {
    color: '#DDF3E1',
  },
  referenceSpecName: {
    fontSize: rs(18),
    lineHeight: rs(22),
    color: '#EADDCF',
  },
  referenceSpecNameOwned: {
    color: '#E2F4E6',
  },
  specAmount: {
    color: '#F5EBDC',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'right',
  },
  specAmountOwned: {
    color: '#DDF3E1',
  },
  referenceSpecAmount: {
    fontSize: rs(18),
    lineHeight: rs(22),
    color: '#F0E4D6',
  },
  referenceSpecAmountOwned: {
    color: '#E2F4E6',
  },
  emptyRecipeCardText: {
    color: '#D6C3AE',
    fontSize: 16,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },
  methodList: {
    gap: spacing(2.5),
  },
  referenceMethodList: {
    gap: rs(10),
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.7),
  },
  referenceMethodRow: {
    gap: rs(12),
  },
  methodIndex: {
    width: 44,
    color: '#D59C58',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
  },
  referenceMethodIndex: {
    width: rs(36),
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#C98E4B',
  },
  methodText: {
    flex: 1,
    color: '#EDE0D0',
    fontSize: 20,
    lineHeight: 31,
    fontWeight: '400',
  },
  referenceMethodText: {
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#DDD0C1',
  },
  tastingNoteText: {
    color: '#E7D7C7',
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '400',
  },
  referenceTastingNoteText: {
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#DDD0C1',
  },

  // Section
  section: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(4),
  },
  sectionEyebrow: {
    fontSize: 11,
    color: colors.subtext,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  sectionHeader: {
    fontSize: 32,
    color: colors.text,
    marginBottom: spacing(2),
    fontWeight: '600',
  },

  // Ingredients
  ingredientsList: {
    gap: spacing(1.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38,28,22,0.88)',
    padding: spacing(2),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
  },
  ingredientIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  ingredientDetail: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 2,
  },

  // Instructions
  instructionsList: {
    gap: spacing(2),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(38,28,22,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.1)',
    padding: spacing(2),
  },
  stepNumber: {
    fontSize: 32,
    color: colors.accent,
    width: 50,
    lineHeight: 40,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    paddingTop: 8,
  },

  // Pro Tips
  proTipsContainer: {
    backgroundColor: 'rgba(38,28,22,0.84)',
    padding: spacing(3),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  proTipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  proTipsText: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: 8,
  },
  proTipsGate: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  proTipsGateContent: {
    width: '100%',
    borderRadius: 20,
    padding: spacing(2.5),
    alignItems: 'center',
    backgroundColor: 'rgba(20,15,12,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.16)',
  },
  proTipsGateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.75),
    textAlign: 'center',
  },
  proTipsGateBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  proTipsGateButton: {
    minHeight: 42,
    paddingHorizontal: spacing(2.5),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTipsGateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldText,
  },

  // AI Support
  aiSupportSection: {
    marginTop: spacing(5),
    paddingHorizontal: spacing(3),
  },
  aiSupportHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.subtext,
    marginBottom: spacing(2),
    textTransform: 'uppercase',
  },
  aiButtonsRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  aiButton: {
    flex: 1,
    backgroundColor: 'rgba(38,28,22,0.84)',
    borderRadius: 22,
    padding: spacing(2.5),
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.1)',
  },
  aiButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(1),
  },

  // Make flow modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing(2),
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: colors.bg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1),
  },
  modalSection: {
    marginBottom: spacing(2),
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  modalInput: {
    backgroundColor: '#261C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
    marginTop: spacing(1),
  },
  suggestionChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  suggestionChipText: {
    fontSize: 12,
    color: colors.text,
  },
  modalActions: {
    padding: spacing(2.5),
    gap: spacing(1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalPrimaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.xl,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing(0.5),
    marginBottom: spacing(2),
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
    paddingHorizontal: spacing(1),
  },
  ratingActions: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1),
  },

  // Ingredient Stats
  ingredientStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginTop: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  referenceIngredientStatsRow: {
    minHeight: rs(44),
    borderRadius: rs(18),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    backgroundColor: 'rgba(116, 71, 27, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
  },
  ingredientStatsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  referenceIngredientStatsText: {
    fontSize: rs(14),
    lineHeight: rs(18),
  },
});
