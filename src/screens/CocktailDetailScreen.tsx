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
import { useSavedItems } from '../hooks/useSavedItems';
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
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { hasIngredient, parseIngredients } from '../utils/recipeMatching';
import { getSpiritSubstitutions, getSubstitutionMessage } from '../utils/spiritSubstitutions';
import type { UserInventoryItem } from '../types/database';
import { logRecipeCompletion, updateCompletionRating } from '../services/recipeCompletionService';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';
import type { RecipeCompletionDetails } from '../types/userProfile';

type CocktailDetailScreenRouteProp = {
  params: {
    cocktailId: string;
    cocktail?: any; // Optional: Pass full cocktail object for local recipes
  };
};

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
        ingredients: ['1.5 oz Seedlip Garden 108', '3 oz Elderflower sparkling water', '0.5 oz Fresh lime juice', 'Rosemary sprig', 'Grapefruit peel'],
        instructions: 'Combine in wine glass over ice. Stir gently. Express grapefruit oils and garnish with rosemary.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '3 min'
      },
      {
        name: 'Garden Gimlet',
        ingredients: ['2 oz Seedlip Garden 108', '0.75 oz Fresh lime juice', '0.75 oz Simple syrup', 'Cucumber wheel', 'Fresh basil'],
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
        ingredients: ['2 oz Lyre\'s American Malt', '0.25 oz Maple syrup', '2 dashes Orange bitters', '1 dash Angostura bitters', 'Orange peel', 'Luxardo cherry'],
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
        ingredients: ['2 oz Lyre\'s American Malt', '0.75 oz Fresh lemon juice', '0.5 oz Maple syrup', '1 Egg white', 'Lemon wheel'],
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
        ingredients: ['6 oz GT\'s Gingerade', '1 oz Fresh lime juice', '0.5 oz Agave syrup', 'Mint sprig', 'Candied ginger', 'Lime wheel'],
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
        ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh cucumber juice', '0.5 oz Mint simple syrup', 'Cucumber ribbons', 'Fresh mint'],
        instructions: 'Combine cucumber juice and syrup in glass. Add ice and Recess water. Garnish with cucumber and mint.',
        glassware: 'Wine glass',
        difficulty: 'Easy',
        time: '4 min'
      },
      {
        name: 'Hemp Citrus Cooler',
        ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh lemon juice', '0.5 oz Simple syrup', 'Fresh thyme', 'Lemon wheel'],
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
        ingredients: ['2.5 oz Ritual Gin Alternative', '0.5 oz Dry vermouth', '2 dashes Orange bitters', 'Lemon twist'],
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
        ingredients: ['2 oz Wilderton Earthen', '0.5 oz Honey syrup', '0.5 oz Fresh lemon juice', 'Sage sprig', 'Lavender garnish'],
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
        ingredients: ['4 oz Athletic Cold Brew', '2 oz Sparkling water', '0.5 oz Vanilla syrup', 'Orange peel', 'Coffee beans'],
        instructions: 'Combine cold brew and vanilla syrup in glass. Add ice and top with sparkling water. Garnish with orange peel and coffee beans.',
        glassware: 'Highball glass',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Espresso Martini Zero',
        ingredients: ['3 oz Athletic Cold Brew', '1 oz Coffee liqueur alternative', '0.5 oz Simple syrup', '3 Coffee beans'],
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
        ingredients: ['2 oz Seedlip Spice 94', '0.5 oz Fresh lime juice', '4 oz Ginger beer', 'Lime wheel', 'Candied ginger'],
        instructions: 'Build in copper mug over ice. Stir gently. Garnish with lime and candied ginger.',
        glassware: 'Copper mug',
        difficulty: 'Easy',
        time: '2 min'
      },
      {
        name: 'Spice Route',
        ingredients: ['1.5 oz Seedlip Spice 94', '1 oz Apple juice', '0.5 oz Honey syrup', '0.25 oz Lemon juice', 'Cinnamon stick'],
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
        ingredients: ['2 oz Lyre\'s Italian Orange', '1 oz Fresh grapefruit juice', '0.5 oz Honey syrup', '3 oz Sparkling water', 'Grapefruit twist'],
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
        ingredients: ['6 oz Health-Ade Ginger Lemon', '1 oz Fresh lime juice', '0.5 oz Agave nectar', 'Mint sprig', 'Crystallized ginger'],
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
        ingredients: ['6 oz REBBL Ashwagandha Chai', '2 oz Steamed oat milk', '0.5 oz Vanilla syrup', 'Cinnamon stick', 'Star anise'],
        instructions: 'Heat chai drink. Steam oat milk and vanilla syrup. Combine in mug. Garnish with cinnamon and star anise.',
        glassware: 'Coffee mug',
        difficulty: 'Easy',
        time: '4 min'
      },
      {
        name: 'Spiced Chai Fizz',
        ingredients: ['4 oz REBBL Ashwagandha Chai', '2 oz Sparkling water', '0.5 oz Maple syrup', 'Orange peel', 'Cardamom pod'],
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
      { name: '1.5 oz Vodka', note: 'Premium vodka preferred' },
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
  const { toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { toast, showToast, hideToast } = useToast();
  const { isPro, isPrestige } = useSubscription();
  const { gateWithTrigger: saveGate } = useFeatureAccess('saved_cocktails_unlimited');
  const { earnCocktailLoggedXP, earnRecipeRatingXP } = useXPSystem();
  const { user } = useAuth();
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

    // If it already has properly formatted ingredients, use as-is
    if (raw.ingredients && Array.isArray(raw.ingredients) && raw.ingredients.length > 0 && typeof raw.ingredients[0] === 'object' && raw.ingredients[0].name) {
      return raw;
    }

    // If it has string ingredients, transform them
    if (raw.ingredients && Array.isArray(raw.ingredients) && raw.ingredients.length > 0) {
      return {
        ...raw,
        ingredients: raw.ingredients.map((ing: any) => {
          if (typeof ing === 'string') {
            return { name: ing, note: undefined };
          }
          return ing;
        })
      };
    }

    // If no ingredients, use the transformer to get them from centralized data
    return getDetailedCocktail(raw.id) || raw;
  })() : null;

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
    return firebaseCocktail || passedCocktail || null;
  })();

  // Calculate ingredient ownership stats
  const ingredientStats = React.useMemo(() => {
    if (!cocktail || !cocktail.ingredients || cocktail.ingredients.length === 0) {
      return { owned: 0, total: 0, missing: [] as string[] };
    }

    let owned = 0;
    const missing: string[] = [];

    // Handle different ingredient formats
    let ingredientList: string[];
    if (typeof cocktail.ingredients === 'string') {
      // Supabase format: comma-separated string
      ingredientList = parseIngredients(cocktail.ingredients);
      log.debug('CocktailDetailScreen', 'Parsed Supabase ingredients', {
        originalString: cocktail.ingredients,
        parsedList: ingredientList,
      });
    } else if (Array.isArray(cocktail.ingredients)) {
      // Firebase format: array of objects with .name property
      ingredientList = cocktail.ingredients.map((ing: any) => ing.name);
      log.debug('CocktailDetailScreen', 'Parsed Firebase ingredients', {
        parsedList: ingredientList,
      });
    } else {
      log.warn('CocktailDetailScreen', 'Unknown ingredients format', {
        ingredientsType: typeof cocktail.ingredients,
      });
      return { owned: 0, total: 0, missing: [] };
    }

    log.debug('CocktailDetailScreen', 'Calculating ingredient stats', {
      cocktailName: cocktail.title,
      totalIngredients: ingredientList.length,
      inventorySize: userInventory.length,
      hasUser: !!user,
      inventoryItems: userInventory.map(i => i.item_name).slice(0, 5),
    });

    ingredientList.forEach((ingredientName) => {
      const hasIt = hasIngredient(userInventory, ingredientName);

      log.debug('CocktailDetailScreen', `Checking ingredient: "${ingredientName}"`, {
        hasIt,
      });

      if (hasIt) {
        owned++;
      } else {
        missing.push(ingredientName);
      }
    });

    log.debug('CocktailDetailScreen', 'Ingredient stats result', {
      owned,
      total: ingredientList.length,
      missingCount: missing.length,
    });

    return {
      owned,
      total: ingredientList.length,
      missing,
    };
  }, [cocktail, userInventory, user]);

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
      return ingredientStrings.map(name => ({ name, note: undefined }));
    } else if (Array.isArray(cocktail.ingredients)) {
      // Firebase format: already an array of objects
      return cocktail.ingredients;
    }

    return [];
  }, [cocktail]);

  const makeFlowIngredients = React.useMemo(
    () =>
      parsedIngredients.map((ingredient: any, index: number) => ({
        key: `${index}_${String(ingredient.name || '').toLowerCase()}`,
        name: String(ingredient.name || ''),
        amount: String(ingredient.note || ''),
      })),
    [parsedIngredients]
  );

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
        ingredientBrands,
        substitutions: substitutions.trim() || undefined,
        techniqueVariations: techniqueVariations.trim() || undefined,
        personalModifications: personalModifications.trim() || undefined,
      });
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
      return steps;
    } else if (Array.isArray(cocktail.instructions)) {
      // Firebase format: already an array
      return cocktail.instructions;
    }

    return [];
  }, [cocktail]);

  // Parse tips into consistent format for rendering
  const parsedTips = React.useMemo(() => {
    if (!cocktail || !cocktail.tips) return [];

    if (typeof cocktail.tips === 'string') {
      // String format: split by newlines or bullet points
      const tips = cocktail.tips
        .split(/\n+|•/)
        .map(tip => tip.trim())
        .filter(tip => tip.length > 0);
      return tips;
    } else if (Array.isArray(cocktail.tips)) {
      // Array format: already parsed
      return cocktail.tips;
    }

    return [];
  }, [cocktail]);

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
  const resolvedImage = cocktail ? getCocktailImage(cocktail.id, cocktail.img) : null;

  const isSaved = isCocktailSaved(route.params.cocktailId);

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

    // T3: Gate save attempts for free users (unsaving is always allowed)
    if (!wasSaved && !saveGate('T3')) return;

    toggleSavedCocktail({
      id: route.params.cocktailId,
      name: cocktail.title,
      subtitle: cocktail.subtitle,
      image: cocktail.img
    });

    // Track achievement for favorites
    if (!wasSaved) {
      await achievementService.trackAction('favoriteCount', 1);
    }

    // Show toast notification
    if (wasSaved) {
      showToast(`${cocktail.title} removed from saved`, 'info');
    } else {
      showToast(`${cocktail.title} saved!`, 'success');
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
            colors={['transparent', 'transparent', 'rgba(26, 18, 13, 0.8)', '#1A120D']}
            style={styles.heroGradient}
          >
            <Text style={[styles.heroTitle, { fontFamily: serifFont }]}>
              {cocktail.title}
            </Text>

            {/* Metadata Row */}
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
                    <Text style={styles.metaText}>{cocktail.glassware || cocktail.glass}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Ingredient Ownership Indicator */}
            {ingredientStats.total > 0 && (
              <View style={styles.ingredientStatsRow}>
                <MaterialCommunityIcons
                  name="checkbox-marked-circle-outline"
                  size={16}
                  color={ingredientStats.owned === ingredientStats.total ? colors.success : colors.accent}
                />
                <Text style={[
                  styles.ingredientStatsText,
                  ingredientStats.owned === ingredientStats.total && { color: colors.success }
                ]}>
                  You have {ingredientStats.owned}/{ingredientStats.total} ingredients
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Back Button (Absolute) */}
          <TouchableOpacity style={styles.backButtonAbsolute} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          {/* Actions (Absolute Top Right) */}
          <View style={styles.topActionsAbsolute}>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleSave}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Action Buttons --- */}
        <View style={styles.actionButtonsContainer}>
          {cocktail.kitAvailable ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddToCart}>
              <Text style={styles.primaryButtonText}>
                {ingredientStats.missing.length === 0
                  ? 'Add All Ingredients to Cart'
                  : ingredientStats.missing.length === ingredientStats.total
                  ? 'Add All Ingredients to Cart'
                  : `Add Missing Ingredients (${ingredientStats.missing.length})`}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleMadeIt} disabled={hasMadeIt}>
              <Text style={styles.primaryButtonText}>{hasMadeIt ? "You Made It!" : "Make this drink"}</Text>
            </TouchableOpacity>
          )}

          {cocktail.kitAvailable && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleMadeIt} disabled={hasMadeIt}>
              <Text style={styles.secondaryButtonText}>{hasMadeIt ? "You Made It!" : "How did you make it?"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- AI Recipe Customize Button --- */}
        {cocktail.is_ai_generated && (
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => nav.navigate('RecipeEditor', { recipe: cocktail })}
          >
            <Ionicons name="create-outline" size={20} color={colors.gold} />
            <Text style={styles.customizeButtonText}>Customize this recipe</Text>
          </TouchableOpacity>
        )}

        {/* --- Ingredients --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { fontFamily: serifFont }]}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {parsedIngredients && parsedIngredients.length > 0 ? (
              parsedIngredients.map((ingredient, index) => {
                const userHasIt = hasIngredient(userInventory, ingredient.name);
                const name = ingredient.name;
                const note = ingredient.note;

                // Simple icon logic based on keywords
                let iconName: any = 'bottle-tonic-plus';
                const lowerName = name.toLowerCase();
                if (lowerName.includes('gin')) iconName = 'bottle-tonic';
                else if (lowerName.includes('vermouth')) iconName = 'bottle-wine';
                else if (lowerName.includes('campari')) iconName = 'bottle-wine';
                else if (lowerName.includes('orange') || lowerName.includes('lemon') || lowerName.includes('lime')) iconName = 'fruit-citrus';
                else if (lowerName.includes('ice')) iconName = 'cube-outline';
                else if (lowerName.includes('syrup')) iconName = 'water-outline';
                else if (lowerName.includes('garnish')) iconName = 'leaf';
                else if (lowerName.includes('bitters')) iconName = 'water';

                return (
                  <View key={`ingredient-${index}`} style={styles.ingredientRow}>
                    <View style={styles.ingredientIconBox}>
                      <MaterialCommunityIcons name={iconName} size={20} color={userHasIt ? colors.success : colors.accent} />
                    </View>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{name}</Text>
                      {note && <Text style={styles.ingredientDetail}>{note}</Text>}
                    </View>
                    {userHasIt && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginLeft: 8 }} />
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={{ color: colors.subtext }}>No ingredients listed.</Text>
            )}
          </View>
        </View>

        {/* --- Instructions --- */}
        {parsedInstructions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { fontFamily: serifFont }]}>Instructions</Text>
            <View style={styles.instructionsList}>
              {parsedInstructions.map((step, index) => (
                <View key={`step-${index}`} style={styles.instructionRow}>
                  <Text style={[styles.stepNumber, { fontFamily: serifFont }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* --- Pro Tips --- */}
        {parsedTips.length > 0 && (
          <View style={styles.section}>
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
              <Text style={styles.modalTitle}>What brands did you use?</Text>
              <TouchableOpacity onPress={() => setMakeFlowVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
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
                <Text style={styles.modalSectionTitle}>Substitutions made</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput]}
                  placeholder="Any ingredient substitutions?"
                  placeholderTextColor={colors.subtext}
                  value={substitutions}
                  onChangeText={setSubstitutions}
                  multiline
                />
              </View>

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
  heroTitle: {
    fontSize: 36,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(2),
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(1),
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
  metaDot: {
    color: colors.subtext,
    fontSize: 14,
    marginHorizontal: 4,
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
  topActionsAbsolute: {
    position: 'absolute',
    top: 60,
    right: spacing(3),
    flexDirection: 'row',
    gap: spacing(2),
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
    marginTop: spacing(2),
    gap: spacing(2),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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

  // Section
  section: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(4),
  },
  sectionHeader: {
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing(2.5),
    fontWeight: '600',
  },

  // Ingredients
  ingredientsList: {
    gap: spacing(1.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261C16',
    padding: spacing(2),
    borderRadius: radii.xl,
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
    gap: spacing(3),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    color: colors.textMuted,
    lineHeight: 24,
    paddingTop: 8,
  },

  // Pro Tips
  proTipsContainer: {
    backgroundColor: '#261C16',
    padding: spacing(3),
    borderRadius: radii.lg,
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
    backgroundColor: '#261C16',
    borderRadius: radii.xl,
    padding: spacing(2.5),
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    borderRadius: radii.md,
    alignSelf: 'center',
  },
  ingredientStatsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
