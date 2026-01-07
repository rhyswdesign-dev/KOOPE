import React, { useState, useLayoutEffect, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
  Keyboard,
  FlatList,
  Dimensions,
  ListRenderItem,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SectionHeader from '../components/SectionHeader';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSavedItems } from '../hooks/useSavedItems';
import { recipeService } from '../lib/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import GroceryListModal from '../components/GroceryListModal';
import { getPersonalizedFeed, RecommendationEngine } from '../services/recommendationEngine';
import { AIRecipeFormatter, FormattedRecipe } from '../services/aiRecipeFormatter';
import { searchService, type SearchableItem, FilterOptions } from '../services/searchService';
import AIRecipeSearch from '../components/AIRecipeSearch';
import AIRecipeModal from '../components/AIRecipeModal';
import AICreditsPurchaseModal from '../components/AICreditsPurchaseModal';
import { useAICredits } from '../store/useAICredits';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { StatusBar } from 'expo-status-bar';
import { log } from '../lib/logger';
import { RecipesRepository } from '../repos/supabase';
import { getCocktailImage } from '../../assets/images/cocktails';
import { usePersonalization } from '../store/usePersonalization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserRecipes } from '../store/useUserRecipes';
import RecipePreferencesModal from '../components/RecipePreferencesModal';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import RecipeCardSkeleton from '../components/RecipeCardSkeleton';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import ForYouFeed from '../components/ForYouFeed';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible, FREE_TIER_COCKTAILS, getUpgradeMessage } from '../config/tierAccess';
import LockedRecipeCard from '../components/LockedRecipeCard';
import { useXPSystem } from '../store/useXPSystem';
import CocktailUnlockSheet from '../components/CocktailUnlockSheet';
import XPBalanceModal from '../components/XPBalanceModal';
import { useEngagement } from '../store/useEngagement';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const GUTTER = 12;
const GOLD = '#C9A15A'; // spotlight color


/* ------------------------- DATA ------------------------- */

// Featured Cocktail of the Week
const COCKTAIL_OF_THE_WEEK = {
  id: 'old-fashioned',
  name: 'Old Fashioned',
  subtitle: 'Cocktail of the Week',
  image: getCocktailImage('old-fashioned'),
  description: 'A timeless classic that defined the cocktail era.',
  badge: 'GOLD' as const
};

// Mood-based categories with comprehensive cocktail listings
const COCKTAIL_MOODS = [
  {
    title: 'Bold & Serious',
    subtitle: 'Spirit-forward, strong, timeless',
    image: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&w=800&q=60',
    category: 'bold_serious',
    cocktails: ['old-fashioned', 'negroni', 'martinez', 'sazerac', 'manhattan', 'boulevardier', 'vesper-martini', 'rob-roy', 'brooklyn', 'el-presidente']
  },
  {
    title: 'Romantic & Elegant',
    subtitle: 'Refined, sparkling, or delicate — ideal for celebrations & dates',
    image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?auto=format&fit=crop&w=800&q=60',
    category: 'romantic_elegant',
    cocktails: ['french-75', 'bellini', 'aviation', 'kir-royale', 'cosmopolitan', 'champagne-cocktail', 'mimosa']
  },
  {
    title: 'Playful & Fun',
    subtitle: 'Colorful, lively, perfect for social energy',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=60',
    category: 'playful_fun',
    cocktails: ['margarita', 'mojito', 'aperol-spritz', 'pornstar-martini', 'bramble', 'lemon-drop', 'woo-woo-shot', 'melon-ball-shot']
  },
  {
    title: 'Tropical Escape',
    subtitle: 'Exotic, fruity, a trip to the islands',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=60',
    category: 'tropical_escape',
    cocktails: ['mai-tai', 'pina-colada', 'zombie', 'painkiller', 'jungle-bird', 'navy-grog', 'fog-cutter', 'blue-hawaii', 'hurricane', 'singapore-sling', 'surfer-on-acid', 'scooby-snack']
  },
  {
    title: 'Cozy & Comforting',
    subtitle: 'Warm, creamy, nostalgic — feels like home',
    image: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=60',
    category: 'cozy_comforting',
    cocktails: ['irish-coffee', 'white-russian', 'hot-toddy', 'amaretto-sour', 'brandy-alexander', 'cinnamon-toast-crunch-shot', 'apple-pie-shot', 'chocolate-cake-shot']
  },
  {
    title: 'Late-Night Energy',
    subtitle: 'Edgy, caffeinated, or party-fueled',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=60',
    category: 'late_night_energy',
    cocktails: ['espresso-martini', 'paper-plane', 'naked-famous', 'jagerbomb', 'espresso-shot-cocktail']
  },
  {
    title: 'Mystery & Depth',
    subtitle: 'Complex, layered, contemplative',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=60',
    category: 'mystery_depth',
    cocktails: ['vieux-carre', 'last-word', 'oaxaca-old-fashioned', 'rusty-nail', 'corpse-reviver-2', 'martinez', 'sidecar', 'between-the-sheets', 'naked-famous', 'mezcal-negroni']
  },
  {
    title: 'Party Crowd-Pleasers',
    subtitle: 'Refreshing, simple, loved by everyone',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=60',
    category: 'party_crowd_pleasers',
    cocktails: ['moscow-mule', 'cuba-libre', 'paloma', 'spritz-veneziano', 'dark-n-stormy', 'tom-collins', 'gin-tonic', 'highball', 'caipirinha', 'pickleback', 'washington-apple', 'alabama-slammer-shot', 'red-headed-slut']
  },
  {
    title: 'After-Dinner Indulgence',
    subtitle: 'Dessert-like, rich, and satisfying',
    image: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=800&q=60',
    category: 'after_dinner_indulgence',
    cocktails: ['grasshopper', 'b-52', 'black-russian', 'baby-guinness', 'slippery-nipple', 'buttery-nipple', 'brain-hemorrhage', 'sambuca-con-la-mosca']
  },
];

// Fun Party Shots (25 shots)
const PARTY_SHOTS = [
  {
    id: 'lemon-drop-shot',
    name: 'Lemon Drop Shot',
    title: 'Lemon Drop Shot',
    subtitle: 'Party Shot • Vodka-based',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.3,
    ingredients: [
      { name: '1 oz Vodka', note: 'Citrus vodka preferred' },
      { name: '1/2 oz Fresh Lemon Juice', note: 'Fresh only' },
      { name: '1/2 oz Simple Syrup', note: 'To sweeten' },
      { name: 'Sugar Rim', note: 'For glass' }
    ],
    description: 'Sweet and sour crowd favorite.',
  },
  {
    id: 'washington-apple',
    name: 'Washington Apple',
    title: 'Washington Apple',
    subtitle: 'Party Shot • Whiskey-based',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.4,
    ingredients: [
      { name: '1/2 oz Canadian Whisky', note: 'Crown Royal' },
      { name: '1/2 oz Apple Schnapps', note: 'Sour Apple Pucker' },
      { name: 'Splash Cranberry Juice', note: 'For color' }
    ],
    description: 'Sweet apple-flavored shot.',
  },
  {
    id: 'buttery-nipple',
    name: 'Buttery Nipple',
    title: 'Buttery Nipple',
    subtitle: 'Party Shot • Layered',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.1,
    ingredients: [
      { name: '1/2 oz Butterscotch Schnapps', note: 'Bottom layer' },
      { name: '1/2 oz Irish Cream', note: 'Float on top' }
    ],
    description: 'Sweet layered shot with butterscotch and cream.',
  },
  {
    id: 'green-tea-shot',
    name: 'Green Tea Shot',
    title: 'Green Tea Shot',
    subtitle: 'Party Shot • Whiskey-based',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.3,
    ingredients: [
      { name: '1/2 oz Jameson Irish Whiskey', note: 'Base spirit' },
      { name: '1/2 oz Peach Schnapps', note: 'Sweet element' },
      { name: '1/2 oz Sour Mix', note: 'Tart balance' },
      { name: 'Splash Sprite', note: 'For fizz' }
    ],
    description: 'Surprisingly doesn\'t taste like tea, but it\'s delicious.',
  },
  {
    id: 'pickleback',
    name: 'Pickleback',
    title: 'Pickleback',
    subtitle: 'Party Shot • Whiskey chase',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 3.9,
    ingredients: [
      { name: '1 oz Whiskey', note: 'Any whiskey works' },
      { name: '1 oz Pickle Juice', note: 'Dill pickle brine chaser' }
    ],
    description: 'Brooklyn bar classic - whiskey followed by pickle juice.',
  },
  {
    id: 'redheaded-slut',
    name: 'Redheaded Slut',
    title: 'Redheaded Slut',
    subtitle: 'Party Shot • Fruit-forward',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.0,
    ingredients: [
      { name: '1/2 oz Peach Schnapps', note: 'Sweet base' },
      { name: '1/2 oz Jägermeister', note: 'Herbal complexity' },
      { name: 'Splash Cranberry Juice', note: 'For color and tartness' }
    ],
    description: 'Sweet and herbal party favorite.',
  },
  {
    id: 'baby-guinness',
    name: 'Baby Guinness',
    title: 'Baby Guinness',
    subtitle: 'Party Shot • Layered',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '2 min',
    rating: 4.2,
    ingredients: [
      { name: '3/4 oz Kahlúa', note: 'Dark bottom layer' },
      { name: '1/4 oz Irish Cream', note: 'Float to create "foam"' }
    ],
    description: 'Looks like a tiny pint of Guinness.',
  },
  {
    id: 'scooby-snack',
    name: 'Scooby Snack',
    title: 'Scooby Snack',
    subtitle: 'Party Shot • Tropical',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.1,
    ingredients: [
      { name: '1/2 oz Coconut Rum', note: 'Malibu works well' },
      { name: '1/2 oz Banana Liqueur', note: 'Crème de Banane' },
      { name: '1/2 oz Pineapple Juice', note: 'Fresh preferred' },
      { name: 'Splash Lime Juice', note: 'Just a touch' }
    ],
    description: 'Tropical fruity shot that\'s always a hit.',
  },
  {
    id: 'slippery-nipple',
    name: 'Slippery Nipple',
    title: 'Slippery Nipple',
    subtitle: 'Party Shot • Layered',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '2 min',
    rating: 3.8,
    ingredients: [
      { name: '1/2 oz Sambuca', note: 'Clear anise liqueur' },
      { name: '1/2 oz Irish Cream', note: 'Float on top' },
      { name: 'Drop Grenadine', note: 'Sink to bottom' }
    ],
    description: 'Three-layer shot with interesting flavor profile.',
  },
  {
    id: 'birthday-cake-shot',
    name: 'Birthday Cake Shot',
    title: 'Birthday Cake Shot',
    subtitle: 'Party Shot • Sweet',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.4,
    ingredients: [
      { name: '1/2 oz Vanilla Vodka', note: 'Cake flavor base' },
      { name: '1/2 oz Amaretto', note: 'Almond sweetness' },
      { name: 'Splash Cranberry Juice', note: 'For color' },
      { name: 'Vanilla Frosting Rim', note: 'With rainbow sprinkles' }
    ],
    description: 'Tastes like birthday cake in a shot glass.',
  },
  {
    id: 'duck-fart',
    name: 'Duck Fart',
    title: 'Duck Fart',
    subtitle: 'Party Shot • Layered',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '2 min',
    rating: 3.7,
    ingredients: [
      { name: '1/3 oz Kahlúa', note: 'Bottom layer' },
      { name: '1/3 oz Crown Royal', note: 'Middle layer' },
      { name: '1/3 oz Irish Cream', note: 'Top layer' }
    ],
    description: 'Alaskan favorite with unfortunate name but great taste.',
  },
  {
    id: 'mind-eraser',
    name: 'Mind Eraser',
    title: 'Mind Eraser',
    subtitle: 'Party Shot • Strong',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 3.9,
    ingredients: [
      { name: '1/2 oz Vodka', note: 'Quality vodka' },
      { name: '1/2 oz Kahlúa', note: 'Coffee liqueur' },
      { name: 'Splash Soda Water', note: 'To top' }
    ],
    description: 'Strong shot meant to be consumed through a straw.',
  },
  {
    id: 'porn-star-martini-shot',
    name: 'Porn Star Martini Shot',
    title: 'Porn Star Martini Shot',
    subtitle: 'Party Shot • Passion fruit',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '2 min',
    rating: 4.5,
    ingredients: [
      { name: '1/2 oz Vanilla Vodka', note: 'Premium preferred' },
      { name: '1/4 oz Passoã', note: 'Passion fruit liqueur' },
      { name: '1/4 oz Lime Juice', note: 'Fresh squeezed' },
      { name: 'Splash Prosecco', note: 'Side shot glass' }
    ],
    description: 'Shot version of the famous cocktail.',
  },
  {
    id: 'jolly-rancher-shot',
    name: 'Jolly Rancher Shot',
    title: 'Jolly Rancher Shot',
    subtitle: 'Party Shot • Candy-flavored',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.2,
    ingredients: [
      { name: '1/2 oz Vodka', note: 'Neutral base' },
      { name: '1/2 oz Apple Schnapps', note: 'Green apple flavor' },
      { name: 'Splash Cranberry Juice', note: 'For color and tartness' }
    ],
    description: 'Tastes like the green apple candy.',
  },
  {
    id: 'alien-brain-hemorrhage',
    name: 'Alien Brain Hemorrhage',
    title: 'Alien Brain Hemorrhage',
    subtitle: 'Party Shot • Gross-looking',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Hard',
    time: '3 min',
    rating: 3.5,
    ingredients: [
      { name: '1/2 oz Peach Schnapps', note: 'Base layer' },
      { name: '1/2 oz Irish Cream', note: 'Pour slowly to curdle' },
      { name: 'Drop Grenadine', note: 'For "blood" effect' },
      { name: 'Drop Blue Curaçao', note: 'For alien color' }
    ],
    description: 'Disgusting looking but surprisingly tasty Halloween shot.',
  },
  {
    id: 'chocolate-cake-shot',
    name: 'Chocolate Cake Shot',
    title: 'Chocolate Cake Shot',
    subtitle: 'Party Shot • Dessert-like',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.3,
    ingredients: [
      { name: '1/2 oz Vanilla Vodka', note: 'Cake base' },
      { name: '1/2 oz Frangelico', note: 'Hazelnut liqueur' },
      { name: 'Sugar Rim', note: 'With cocoa powder' },
      { name: 'Lemon Wedge', note: 'Bite after shot' }
    ],
    description: 'Magically tastes like chocolate cake when done right.',
  },
  {
    id: 'pineapple-upside-down-cake',
    name: 'Pineapple Upside Down Cake',
    title: 'Pineapple Upside Down Cake',
    subtitle: 'Party Shot • Tropical dessert',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.1,
    ingredients: [
      { name: '1/2 oz Vanilla Vodka', note: 'Cake element' },
      { name: '1/4 oz Pineapple Juice', note: 'Fruit flavor' },
      { name: '1/4 oz Grenadine', note: 'Cherry topping' },
      { name: 'Whipped Cream', note: 'Float on top' }
    ],
    description: 'Dessert shot that tastes like the classic cake.',
  },
  {
    id: 'blow-job-shot',
    name: 'Blow Job Shot',
    title: 'Blow Job Shot',
    subtitle: 'Party Shot • No hands',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 3.6,
    ingredients: [
      { name: '1/2 oz Kahlúa', note: 'Coffee base' },
      { name: '1/4 oz Vodka', note: 'Middle layer' },
      { name: '1/4 oz Whipped Cream', note: 'Generous top layer' }
    ],
    description: 'Must be consumed without using hands - party challenge shot.',
  },
  {
    id: 'fuzzy-navel-shot',
    name: 'Fuzzy Navel Shot',
    title: 'Fuzzy Navel Shot',
    subtitle: 'Party Shot • Peachy',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.0,
    ingredients: [
      { name: '1/2 oz Peach Schnapps', note: 'Fuzzy peach flavor' },
      { name: '1/2 oz Orange Juice', note: 'Fresh preferred' },
      { name: 'Splash Cranberry Juice', note: 'For color' }
    ],
    description: 'Shot version of the classic fuzzy navel cocktail.',
  },
  {
    id: 'leg-spreader',
    name: 'Leg Spreader',
    title: 'Leg Spreader',
    subtitle: 'Party Shot • Fruity',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 3.8,
    ingredients: [
      { name: '1/3 oz Vodka', note: 'Base spirit' },
      { name: '1/3 oz Peach Schnapps', note: 'Sweet element' },
      { name: '1/3 oz Cranberry Juice', note: 'Tart balance' },
      { name: 'Splash Lime Juice', note: 'Citrus finish' }
    ],
    description: 'Dangerously smooth and fruity party shot.',
  },
  {
    id: 'brain-hemorrhage',
    name: 'Brain Hemorrhage',
    title: 'Brain Hemorrhage',
    subtitle: 'Party Shot • Halloween favorite',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '2 min',
    rating: 3.4,
    ingredients: [
      { name: '1/2 oz Peach Schnapps', note: 'Base layer' },
      { name: '1/2 oz Irish Cream', note: 'Pour slowly to create brain effect' },
      { name: 'Few drops Grenadine', note: 'For hemorrhage effect' }
    ],
    description: 'Looks disturbing but tastes great - perfect for Halloween.',
  },
  {
    id: 'liquid-cocaine',
    name: 'Liquid Cocaine',
    title: 'Liquid Cocaine',
    subtitle: 'Party Shot • High energy',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.0,
    ingredients: [
      { name: '1/4 oz Vodka', note: 'Base spirit' },
      { name: '1/4 oz Rum', note: 'White rum' },
      { name: '1/4 oz Amaretto', note: 'Almond flavor' },
      { name: '1/4 oz Southern Comfort', note: 'Peach liqueur' },
      { name: 'Splash Pineapple Juice', note: 'Tropical element' }
    ],
    description: 'High-octane party shot with multiple spirits.',
  },
  {
    id: 'surfer-on-acid',
    name: 'Surfer on Acid',
    title: 'Surfer on Acid',
    subtitle: 'Party Shot • Tropical',
    category: 'Shots',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '1 min',
    rating: 4.2,
    ingredients: [
      { name: '1/3 oz Jägermeister', note: 'Herbal base' },
      { name: '1/3 oz Coconut Rum', note: 'Tropical element' },
      { name: '1/3 oz Pineapple Juice', note: 'Fresh preferred' }
    ],
    description: 'Surprisingly delicious combination of herbal and tropical.',
  },
];

// All shots for easy access
const ALL_SHOTS = [...PARTY_SHOTS];

const sampleRecipes = [
  {
    id: 'virgin-mojito',
    name: 'Virgin Mojito',
    title: 'Virgin Mojito',
    subtitle: 'Non-Alcoholic • Refreshing',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1497534547324-0ebb3f052e88?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    ingredients: [
      { name: 'Fresh Lime Juice', note: '1 oz freshly squeezed' },
      { name: 'Mint Leaves', note: '8-10 fresh leaves' },
      { name: 'Simple Syrup', note: '1/2 oz to taste' },
      { name: 'Soda Water', note: '4 oz chilled' }
    ],
    description: 'Refreshing non-alcoholic version of the classic mojito.',
  },
  {
    id: 'garden-108-tonic',
    name: 'Garden 108 & Tonic',
    title: 'Garden 108 & Tonic',
    subtitle: 'Zero-Proof • Herbal & Garden Fresh',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.7,
    ingredients: ['2 oz Seedlip Garden 108', '4 oz Premium tonic water', '3 cucumber slices', 'Fresh mint sprig', 'Lime wheel'],
    description: 'Herbal and garden fresh zero-proof G&T.',
  },
  {
    id: 'herbaceous-spritz',
    name: 'Herbaceous Spritz',
    title: 'Herbaceous Spritz',
    subtitle: 'Zero-Proof • Garden Fresh',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['1.5 oz Seedlip Garden 108', '3 oz Elderflower sparkling water', '0.5 oz Fresh lime juice', 'Rosemary sprig', 'Grapefruit peel'],
    description: 'Sophisticated spritz with herbal complexity.',
  },
  {
    id: 'garden-gimlet',
    name: 'Garden Gimlet',
    title: 'Garden Gimlet',
    subtitle: 'Zero-Proof • Classic Style',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['2 oz Seedlip Garden 108', '0.75 oz Fresh lime juice', '0.75 oz Simple syrup', 'Cucumber wheel', 'Fresh basil'],
    description: 'Zero-proof take on the classic gimlet.',
  },
  {
    id: 'smokeless-old-fashioned',
    name: 'Smokeless Old Fashioned',
    title: 'Smokeless Old Fashioned',
    subtitle: 'Zero-Proof • Rich & Smoky',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.8,
    ingredients: ['2 oz Lyre\'s American Malt', '0.25 oz Maple syrup', '2 dashes Orange bitters', '1 dash Angostura bitters', 'Orange peel', 'Luxardo cherry'],
    description: 'Classic Old Fashioned without the alcohol.',
  },
  {
    id: 'zero-proof-manhattan',
    name: 'Zero Proof Manhattan',
    title: 'Zero Proof Manhattan',
    subtitle: 'Zero-Proof • Whiskey Style',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['2 oz Lyre\'s American Malt', '1 oz Sweet vermouth', '2 dashes Angostura bitters', 'Maraschino cherry'],
    description: 'Sophisticated zero-proof Manhattan.',
  },
  {
    id: 'maple-whiskey-sour',
    name: 'Maple Whiskey Sour',
    title: 'Maple Whiskey Sour',
    subtitle: 'Zero-Proof • Sour & Sweet',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '4 min',
    rating: 4.8,
    ingredients: ['2 oz Lyre\'s American Malt', '0.75 oz Fresh lemon juice', '0.5 oz Maple syrup', '1 Egg white', 'Lemon wheel'],
    description: 'Zero-proof whiskey sour with maple sweetness.',
  },
  {
    id: 'zero-proof-gin-tonic',
    name: 'Zero Proof Gin & Tonic',
    title: 'Zero Proof Gin & Tonic',
    subtitle: 'Zero-Proof • Juniper Forward',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    ingredients: ['2 oz Monday Gin', '4 oz Tonic water', 'Lime wheel', 'Juniper berries'],
    description: 'Classic G&T without the alcohol.',
  },
  {
    id: 'ghia-spritz',
    name: 'Ghia Spritz',
    title: 'Ghia Spritz',
    subtitle: 'Zero-Proof • Mediterranean Botanicals',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.7,
    ingredients: ['2 oz Ghia Aperitif', '3 oz Sparkling water', '1 oz Fresh grapefruit juice', 'Rosemary sprig', 'Grapefruit wheel'],
    description: 'Perfect aperitif hour spritz.',
  },
  {
    id: 'ginger-kombucha-mule',
    name: 'Ginger Kombucha Mule',
    title: 'Ginger Kombucha Mule',
    subtitle: 'Wellness • Probiotic & Refreshing',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['6 oz GT\'s Gingerade', '1 oz Fresh lime juice', '0.5 oz Agave syrup', 'Mint sprig', 'Candied ginger', 'Lime wheel'],
    description: 'Probiotic-rich mule with fresh ginger.',
  },
  {
    id: 'zen-garden-spritz',
    name: 'Zen Garden Spritz',
    title: 'Zen Garden Spritz',
    subtitle: 'Wellness • Calm & Focused',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '4 min',
    rating: 4.7,
    ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh cucumber juice', '0.5 oz Mint simple syrup', 'Cucumber ribbons', 'Fresh mint'],
    description: 'Mindful drinking with hemp and adaptogens.',
  },
  {
    id: 'hemp-citrus-cooler',
    name: 'Hemp Citrus Cooler',
    title: 'Hemp Citrus Cooler',
    subtitle: 'Wellness • Refreshing',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['8 oz Recess Hemp Water', '1 oz Fresh lemon juice', '0.5 oz Simple syrup', 'Fresh thyme', 'Lemon wheel'],
    description: 'Citrus-forward wellness cocktail.',
  },
  {
    id: 'zero-proof-negroni',
    name: 'Zero Proof Negroni',
    title: 'Zero Proof Negroni',
    subtitle: 'Zero-Proof • Botanical Excellence',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.8,
    ingredients: ['1 oz Ritual Gin Alternative', '1 oz Seedlip Spice 94', '1 oz Sweet vermouth', 'Orange peel'],
    description: 'Classic Negroni flavor without alcohol.',
  },
  {
    id: 'garden-martini',
    name: 'Garden Martini',
    title: 'Garden Martini',
    subtitle: 'Zero-Proof • Classic Style',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['2.5 oz Ritual Gin Alternative', '0.5 oz Dry vermouth', '2 dashes Orange bitters', 'Lemon twist'],
    description: 'Elegant zero-proof martini.',
  },
  {
    id: 'forest-floor',
    name: 'Forest Floor',
    title: 'Forest Floor',
    subtitle: 'Zero-Proof • Earthy Botanicals',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['2 oz Wilderton Earthen', '0.5 oz Honey syrup', '0.5 oz Fresh lemon juice', 'Sage sprig', 'Lavender garnish'],
    description: 'Contemplative sipping with forest botanicals.',
  },
  {
    id: 'coffee-spritz',
    name: 'Coffee Spritz',
    title: 'Coffee Spritz',
    subtitle: 'Wellness • Performance & Flavor',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    ingredients: ['4 oz Athletic Cold Brew', '2 oz Sparkling water', '0.5 oz Vanilla syrup', 'Orange peel', 'Coffee beans'],
    description: 'Energy-focused coffee cocktail.',
  },
  {
    id: 'espresso-martini-zero',
    name: 'Espresso Martini Zero',
    title: 'Espresso Martini Zero',
    subtitle: 'Wellness • Coffee Cocktail',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Medium',
    time: '4 min',
    rating: 4.8,
    ingredients: ['3 oz Athletic Cold Brew', '1 oz Coffee liqueur alternative', '0.5 oz Simple syrup', '3 Coffee beans'],
    description: 'Zero-proof espresso martini with clean energy.',
  },
  {
    id: 'high-rhode-spritz',
    name: 'High Rhode Spritz',
    title: 'High Rhode Spritz',
    subtitle: 'Low-ABV • Mood-Elevating',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['2 oz Kin High Rhode', '3 oz Sparkling wine', '1 oz Fresh grapefruit juice', 'Grapefruit wheel', 'Rosemary sprig'],
    description: 'Euphoric blend of adaptogens and botanicals.',
  },
  {
    id: 'spiced-mule',
    name: 'Spiced Mule',
    title: 'Spiced Mule',
    subtitle: 'Zero-Proof • Warm & Spiced',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    ingredients: ['2 oz Seedlip Spice 94', '0.5 oz Fresh lime juice', '4 oz Ginger beer', 'Lime wheel', 'Candied ginger'],
    description: 'Warming spiced mule perfect for winter.',
  },
  {
    id: 'spice-route',
    name: 'Spice Route',
    title: 'Spice Route',
    subtitle: 'Zero-Proof • Aromatic Spice',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['1.5 oz Seedlip Spice 94', '1 oz Apple juice', '0.5 oz Honey syrup', '0.25 oz Lemon juice', 'Cinnamon stick'],
    description: 'Complex spiced cocktail with apple notes.',
  },
  {
    id: 'zero-proof-aperol-spritz',
    name: 'Zero Proof Aperol Spritz',
    title: 'Zero Proof Aperol Spritz',
    subtitle: 'Zero-Proof • Italian Aperitivo',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.7,
    ingredients: ['3 oz Lyre\'s Italian Orange', '3 oz Prosecco', '1 oz Soda water', 'Orange slice'],
    description: 'Italian aperitif hour without the alcohol.',
  },
  {
    id: 'italian-sunset',
    name: 'Italian Sunset',
    title: 'Italian Sunset',
    subtitle: 'Zero-Proof • Citrus & Herbs',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['2 oz Lyre\'s Italian Orange', '1 oz Fresh grapefruit juice', '0.5 oz Honey syrup', '3 oz Sparkling water', 'Grapefruit twist'],
    description: 'Refreshing Italian-style spritz.',
  },
  {
    id: 'curious-spritz',
    name: 'Curious Spritz',
    title: 'Curious Spritz',
    subtitle: 'Low-ABV • Negroni Inspired',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    ingredients: ['4 oz Curious Elixir No. 2', '2 oz Sparkling water', 'Orange peel', 'Fresh rosemary'],
    description: 'Ready-to-drink Negroni alternative.',
  },
  {
    id: 'ginger-lemon-mule',
    name: 'Ginger Lemon Mule',
    title: 'Ginger Lemon Mule',
    subtitle: 'Wellness • Probiotic Power',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    ingredients: ['6 oz Health-Ade Ginger Lemon', '1 oz Fresh lime juice', '0.5 oz Agave nectar', 'Mint sprig', 'Crystallized ginger'],
    description: 'Digestive health with refreshing taste.',
  },
  {
    id: 'wellness-spritzer',
    name: 'Wellness Spritzer',
    title: 'Wellness Spritzer',
    subtitle: 'Wellness • Probiotic',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['4 oz Health-Ade Ginger Lemon', '2 oz Sparkling water', '1 oz Fresh cucumber juice', 'Cucumber ribbon', 'Lemon wheel'],
    description: 'Light and refreshing wellness drink.',
  },
  {
    id: 'golden-hour-latte',
    name: 'Golden Hour Latte',
    title: 'Golden Hour Latte',
    subtitle: 'Wellness • Adaptogenic Blend',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '4 min',
    rating: 4.7,
    ingredients: ['6 oz REBBL Ashwagandha Chai', '2 oz Steamed oat milk', '0.5 oz Vanilla syrup', 'Cinnamon stick', 'Star anise'],
    description: 'Evening relaxation with stress support.',
  },
  {
    id: 'spiced-chai-fizz',
    name: 'Spiced Chai Fizz',
    title: 'Spiced Chai Fizz',
    subtitle: 'Wellness • Adaptogenic',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    ingredients: ['4 oz REBBL Ashwagandha Chai', '2 oz Sparkling water', '0.5 oz Maple syrup', 'Orange peel', 'Cardamom pod'],
    description: 'Sparkling chai with stress-relieving adaptogens.',
  },
];

/* ------------------------- UI PIECES ------------------------- */

function MoodCard({ title, image, subtitle, onPress, index = 0 }: { title: string; image: string; subtitle?: string; onPress?: () => void; index?: number }) {
  const w = Math.min(0.78 * width, 300);
  const h = Math.round(w * 0.66);
  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500).springify()}>
      <Pressable onPress={onPress} style={{ width: w, marginRight: spacing(1.25) }}>
        <Image source={{ uri: image }} style={{ width: '100%', height: h, borderRadius: radii.lg }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{title}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} style={{ marginLeft: 4 }} />
        </View>
        {subtitle ? <Text style={{ color: colors.muted }}>{subtitle}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

function HeroCard({ cocktail, onPress }: { cocktail: typeof COCKTAIL_OF_THE_WEEK; onPress: () => void }) {
  const cardW = width - spacing(2) * 2;
  const cardH = Math.round(cardW * 0.56);

  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ marginHorizontal: spacing(2), borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.card, marginBottom: spacing(1.5) }}>
      <Pressable onPress={onPress} style={{ width: cardW, height: cardH }}>
        <Image
          source={typeof cocktail.image === 'string' ? { uri: cocktail.image } : cocktail.image}
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      {/* gold label */}
      <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
        <Text style={{ color: '#120D07', fontWeight: '900' }}>COCKTAIL OF THE WEEK</Text>
      </View>

      <View style={{ padding: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{cocktail.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 18, marginTop: 4 }}>{cocktail.description}</Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------- SCREEN ------------------------- */

export default function RecipesScreen() {
  const navigation = useNavigation<Nav>();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { credits, isPremium, getActionCost } = useAICredits();
  const { getPersonalizedMoodOrder, getFeaturedCocktails, scoreMoodCategory, recordInteraction, profile } = usePersonalization();
  const { recipes: userRecipes, loadRecipes } = useUserRecipes();
  const { toast, showToast, hideToast } = useToast();

  // Tier-based access control
  const tier = useUserTier((state) => state.tier);

  // XP System
  const {
    balance: xpBalance,
    getCocktailCost,
    canAffordCocktail,
    unlockCocktail,
    isCocktailUnlockedWithXP,
    checkDailyLogin,
    unlockedCocktails,
  } = useXPSystem();

  // Engagement System
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();

  // Check daily login on mount
  useEffect(() => {
    checkDailyLogin();
  }, []);

  // Unlock sheet state
  const [unlockSheetVisible, setUnlockSheetVisible] = useState(false);
  const [selectedCocktailForUnlock, setSelectedCocktailForUnlock] = useState<any>(null);

  // XP Balance modal state
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);

  // Supabase recipes state
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode toggle - Browse All vs For You
  const [viewMode, setViewMode] = useState<'browse' | 'personalized'>('browse');
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);

  // Modal states
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  // AI-related states
  const [aiRecipeModalVisible, setAiRecipeModalVisible] = useState(false);
  const [currentAiRecipe, setCurrentAiRecipe] = useState<FormattedRecipe | null>(null);
  const [creditsPurchaseVisible, setCreditsPurchaseVisible] = useState(false);
  const [creditsInfoVisible, setCreditsInfoVisible] = useState(false);

  // Preferences modal
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

  // Load recipes from cache/network (instant with cache)
  useEffect(() => {
    async function loadRecipes() {
      try {
        // TEMPORARY: Force clear ALL caches to reload with local images
        // Remove this after images are working correctly
        await RecipesRepository.clearAllCaches();
        log.info('RecipesScreen', 'Cleared ALL recipe caches - will reload with local images');

        // This will fetch fresh data since cache is cleared
        const recipes = await RecipesRepository.getInitialRecipes(150);
        setAllRecipes(recipes);
        setRecipesLoading(false);
      } catch (error) {
        log.error('RecipesScreen', 'Error loading recipes', error);
        setRecipesLoading(false);
        showToast('Failed to load recipes. Please check your connection.', 'error');
      }
    }
    loadRecipes();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await RecipesRepository.clearAllCaches();
      const recipes = await RecipesRepository.getInitialRecipes(150);
      setAllRecipes(recipes);
      showToast('Recipes refreshed!', 'success');
    } catch (error) {
      log.error('RecipesScreen', 'Error refreshing recipes', error);
      showToast('Failed to refresh recipes', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  // Separate syrups and cocktails
  const ESSENTIAL_SYRUPS = allRecipes.filter(r => r.category?.toLowerCase() === 'syrups');
  const ALL_COCKTAILS = allRecipes.filter(r => r.category?.toLowerCase() !== 'syrups');

  // AI recipe handler
  const handleAiRecipeFound = useCallback((recipe: FormattedRecipe) => {
    setCurrentAiRecipe(recipe);
    setAiRecipeModalVisible(true);
  }, []);

  const handleSaveAiRecipe = useCallback(async (recipe: FormattedRecipe) => {
    try {
      // Save AI recipe to user's local store
      const { addRecipe } = useUserRecipes.getState();

      await addRecipe({
        name: recipe.title,
        type: 'ai_generated',
        description: recipe.description || 'AI-generated cocktail recipe',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        image: recipe.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
        tags: recipe.tags || [],
      });

      log.info('RecipesScreen', 'AI recipe saved successfully', { title: recipe.title });

      // Refresh the recipes list to show the new recipe
      loadRecipes();
    } catch (error) {
      log.error('RecipesScreen', 'Error saving AI recipe', error, { title: recipe.title });
      showToast('Failed to save AI recipe', 'error');
    }
  }, [loadRecipes]);

  // Handler for when user needs more credits
  const handleCreditsNeeded = useCallback(() => {
    setCreditsPurchaseVisible(true);
  }, []);

  // Handlers for ForYouFeed component
  const handleCocktailPress = useCallback((cocktail: any) => {
    navigation.navigate('CocktailDetail', { cocktailId: cocktail.id });
  }, [navigation]);

  const handleSaveRecipe = useCallback((cocktail: any) => {
    toggleSavedCocktail(cocktail.id);
    showToast(
      isCocktailSaved(cocktail.id) ? 'Removed from saved' : 'Saved!',
      'success'
    );
  }, [toggleSavedCocktail, isCocktailSaved, showToast]);

  const handleAddToGroceryList = useCallback((cocktail: any) => {
    setSelectedRecipe(cocktail);
    setGroceryListVisible(true);
  }, []);

  // Get saved recipe IDs for ForYouFeed (as a Set for efficient lookup)
  const savedRecipeIds = useMemo(() => {
    if (!Array.isArray(savedItems)) return new Set<string>();
    return new Set(savedItems.map(item => item.id));
  }, [savedItems]);

  // Search functionality with debouncing and fallback
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Primary search using search service
        try {
          const results = await searchService.search(query, currentFilters);
          let recipeResults = results
            .filter(item => item.category === 'recipe')
            .map(item => {
              // Find the actual recipe object from our arrays
              return ALL_COCKTAILS.find(cocktail =>
                cocktail.id === item.id ||
                cocktail.name.toLowerCase() === item.title.toLowerCase()
              ) || item.data;
            })
            .filter(Boolean)
            .filter(recipe => recipe.category?.toLowerCase() !== 'syrups')
            .filter(recipe => {
              // Filter by tier access for FREE users
              if (tier === 'FREE') {
                const isTierAccessible = isCocktailAccessible(recipe.id, tier);
                const isXPUnlocked = isCocktailUnlockedWithXP(recipe.id);
                const isEngagementUnlocked = isRecipeUnlockedWithEngagement(recipe.id);
                return isTierAccessible || isXPUnlocked || isEngagementUnlocked;
              }
              // PLUS and PRO users can see all results
              return true;
            });

          // AI Enhancement: Get personalized recommendations to boost relevant results
          try {
            const context = {
              timeOfDay: new Date().getHours() < 12 ? 'morning' as const :
                       new Date().getHours() < 17 ? 'afternoon' as const :
                       new Date().getHours() < 22 ? 'evening' as const : 'night' as const,
              dayOfWeek: new Date().getDay(),
              recentActivity: [query] // Include current search as recent activity
            };

            const recommendations = await recommendationEngine.getRecommendations(context);

            // Boost search results that align with AI recommendations
            if (recommendations.personalized.length > 0) {
              const recommendedIds = new Set(recommendations.personalized.map(r => r.item.id));
              recipeResults = recipeResults.sort((a, b) => {
                const aRecommended = recommendedIds.has(a.id) ? 1 : 0;
                const bRecommended = recommendedIds.has(b.id) ? 1 : 0;
                return bRecommended - aRecommended; // Recommended items first
              });
            }
          } catch (aiError) {
            log.warn('RecipesScreen', 'AI enhancement failed, continuing with basic search', { query });
          }

          setSearchResults(recipeResults);
        } catch (searchError) {
          log.warn('RecipesScreen', 'Search service error, using fallback', { query });
          // Fallback: Direct string matching
          const queryLower = query.toLowerCase();
          const directResults = ALL_COCKTAILS.filter(cocktail => {
            const searchText = `${cocktail.name} ${cocktail.subtitle || ''} ${cocktail.description || ''} ${(cocktail.ingredients || []).join(' ')}`.toLowerCase();
            if (!searchText.includes(queryLower)) return false;

            // Filter by tier access for FREE users
            if (tier === 'FREE') {
              const isTierAccessible = isCocktailAccessible(cocktail.id, tier);
              const isXPUnlocked = isCocktailUnlockedWithXP(cocktail.id);
              const isEngagementUnlocked = isRecipeUnlockedWithEngagement(cocktail.id);
              return isTierAccessible || isXPUnlocked || isEngagementUnlocked;
            }
            return true;
          });
          setSearchResults(directResults);
        }
      } catch (error) {
        log.error('RecipesScreen', 'Search error', error, { query });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
  }, [currentFilters]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Load personalized recommendations when switching to "For You" mode
  useEffect(() => {
    if (viewMode === 'personalized') {
      try {
        // Get featured cocktails from personalization store
        const featured = getFeaturedCocktails();
        const moodOrder = getPersonalizedMoodOrder();

        // Format recommendations into sections
        const formattedSections: Array<{
          title: string;
          reason: string;
          cocktails: any[];
        }> = [];

        // Add top picks section if we have featured cocktails
        if (featured && featured.length > 0) {
          formattedSections.push({
            title: 'Top Picks For You',
            reason: 'Based on your taste profile and preferences',
            cocktails: featured.slice(0, 8)
          });
        }

        // Add mood-based sections based on personalized mood order
        if (moodOrder && moodOrder.length > 0) {
          // Get top 3 mood categories
          moodOrder.slice(0, 3).forEach(moodTitle => {
            const mood = COCKTAIL_MOODS.find(m => m.title === moodTitle);
            if (mood) {
              const cocktails = mood.cocktails
                .slice(0, 6)
                .map(id => ALL_COCKTAILS.find(c => c.id === id))
                .filter(Boolean);

              if (cocktails.length > 0) {
                formattedSections.push({
                  title: `${moodTitle} Favorites`,
                  reason: `Based on your preference for ${moodTitle.toLowerCase()} cocktails`,
                  cocktails
                });
              }
            }
          });
        }

        // If no personalized content, show some general recommendations
        if (formattedSections.length === 0) {
          // Show top rated cocktails as fallback
          const topRated = [...ALL_COCKTAILS]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8);

          if (topRated.length > 0) {
            formattedSections.push({
              title: 'Popular Picks',
              reason: 'Highly rated cocktails to try',
              cocktails: topRated
            });
          }
        }

        setPersonalizedRecommendations(formattedSections);
      } catch (error) {
        log.error('RecipesScreen', 'Error loading personalized recommendations', error);
        setPersonalizedRecommendations([]);
      }
    }
  }, [viewMode, getFeaturedCocktails, getPersonalizedMoodOrder]);

  // Get current displayed recipes
  const getCurrentRecipes = () => {
    if (searchQuery.trim()) {
      return searchResults;
    }

    // Apply current filters to ALL_COCKTAILS
    let recipes = [...ALL_COCKTAILS];

    // Filter by ingredients/spirits
    if (currentFilters.ingredients && currentFilters.ingredients.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeText = `${recipe.name} ${recipe.subtitle || ''} ${recipe.description || ''} ${(recipe.ingredients || []).join(' ')}`.toLowerCase();
        return currentFilters.ingredients.some(ingredient =>
          recipeText.includes(ingredient.toLowerCase())
        );
      });
    }

    // Filter by difficulty
    if (currentFilters.difficulty && currentFilters.difficulty.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeDifficulty = recipe.difficulty?.toLowerCase();
        return currentFilters.difficulty.some(diff => diff === recipeDifficulty);
      });
    }

    // Filter by category
    if (currentFilters.category && currentFilters.category.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeCategory = recipe.category?.toLowerCase();
        const recipeSubtitle = recipe.subtitle?.toLowerCase() || '';
        const recipeDescription = recipe.description?.toLowerCase() || '';

        return currentFilters.category.some(cat => {
          const categoryLower = cat.toLowerCase();
          // Check if category matches the recipe's category field or appears in subtitle/description
          return recipeCategory === categoryLower ||
                 recipeSubtitle.includes(categoryLower) ||
                 recipeDescription.includes(categoryLower);
        });
      });
    }

    // Filter by unlocked status (only applies for FREE tier)
    if (showOnlyUnlocked && tier === 'FREE') {
      recipes = recipes.filter(recipe => {
        const isTierAccessible = isCocktailAccessible(recipe.id, tier);
        const isXPUnlocked = isCocktailUnlockedWithXP(recipe.id);
        const isEngagementUnlocked = isRecipeUnlockedWithEngagement(recipe.id);
        return isTierAccessible || isXPUnlocked || isEngagementUnlocked;
      });
    }

    // Sort recipes
    if (currentFilters.sortOrder === 'alphabetical-asc') {
      recipes = recipes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentFilters.sortOrder === 'alphabetical-desc') {
      recipes = recipes.sort((a, b) => b.name.localeCompare(a.name));
    } else if (currentFilters.sortOrder === 'rating-desc') {
      recipes = recipes.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentFilters.sortOrder === 'rating-asc') {
      recipes = recipes.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    return recipes;
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Recipes',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, gap: 12 }}>
          {/* AI Credits */}
          <Pressable
            hitSlop={12}
            onPress={() => setCreditsPurchaseVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons
              name={isPremium ? "diamond" : "sparkles"}
              size={20}
              color={isPremium ? colors.gold : colors.accent}
            />
            <Text style={{
              color: colors.text,
              fontWeight: '600',
              fontSize: 16
            }}>
              {isPremium ? '∞' : credits.toLocaleString()}
            </Text>
          </Pressable>

          {/* XP Balance */}
          <Pressable
            hitSlop={12}
            onPress={() => setXpBalanceModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons
              name="star"
              size={20}
              color={colors.gold}
            />
            <Text style={{
              color: colors.text,
              fontWeight: '600',
              fontSize: 16
            }}>
              {xpBalance.toLocaleString()}
            </Text>
          </Pressable>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16, marginRight: 16 }}>
          <Pressable hitSlop={12} onPress={() => navigation.navigate('AddRecipe')}>
            <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          </Pressable>
          <Pressable hitSlop={12} onPress={() => navigation.navigate('HomeBar')}>
            <Ionicons name="library" size={24} color={colors.accent} />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => navigation.navigate('ShoppingCart')}
          >
            <Ionicons name="cart-outline" size={24} color={colors.accent} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, credits, isPremium, xpBalance, setCreditsPurchaseVisible, setCreditsInfoVisible, setViewMode]);

  const renderRecipeItem: ListRenderItem<any> = ({ item, index }) => {
    // Check if this cocktail is accessible for current tier, unlocked with XP, or unlocked with engagement
    const isTierAccessible = isCocktailAccessible(item.id, tier);
    const isXPUnlocked = isCocktailUnlockedWithXP(item.id);
    const isEngagementUnlocked = isRecipeUnlockedWithEngagement(item.id);
    const isAccessible = isTierAccessible || isXPUnlocked || isEngagementUnlocked;

    // If locked, show LockedRecipeCard with thumbnail only (no name) and XP unlock option
    if (!isAccessible) {
      const xpCost = getCocktailCost(item.id);
      const canAfford = canAffordCocktail(item.id);

      const handleUpgradePress = () => {
        // Show unlock sheet with XP and subscription options
        setSelectedCocktailForUnlock(item);
        setUnlockSheetVisible(true);
      };

      return (
        <Animated.View entering={FadeInDown.delay((index || 0) * 80).duration(500).springify()}>
          <LockedRecipeCard
            image={typeof item.image === 'string' ? { uri: item.image } : item.image}
            onPress={handleUpgradePress}
            style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}
            xpCost={tier === 'FREE' ? xpCost : undefined} // Only show XP for FREE tier
            canAfford={canAfford}
          />
        </Animated.View>
      );
    }

    // If accessible, show normal RecipeCard
    const cardProps = createRecipeCardProps(item, navigation, {
      toggleSavedCocktail,
      isCocktailSaved,
      setSelectedRecipe,
      setGroceryListVisible,
      showToast,
      showSaveButton: false,
      showCartButton: false,
      showDeleteButton: false,
    });

    return (
      <Animated.View entering={FadeInDown.delay((index || 0) * 80).duration(500).springify()}>
        <RecipeCard
          {...cardProps}
          style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}
        />
      </Animated.View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const currentRecipes = getCurrentRecipes() || [];
    const hasFilters = (currentFilters.ingredients && currentFilters.ingredients.length > 0) ||
                      (currentFilters.difficulty && currentFilters.difficulty.length > 0) ||
                      (currentFilters.category && currentFilters.category.length > 0);

    if (searchQuery.trim()) {
      return (
        <EmptyState
          icon="magnify"
          title="No Results Found"
          message={`No cocktails found for "${searchQuery}". Try a different search term.`}
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      );
    }

    if (hasFilters && currentRecipes.length === 0) {
      return (
        <EmptyState
          icon="filter-off"
          title="No Matching Cocktails"
          message="No cocktails match your current filters. Try adjusting your filter settings."
          actionLabel="Clear Filters"
          onAction={() => {
            setCurrentFilters({
              ingredients: [],
              difficulty: [],
              category: [],
              sortOrder: 'alphabetical-asc',
            });
          }}
        />
      );
    }

    return null;
  };

  // Show loading state while recipes load
  if (recipesLoading) {
    const skeletonCardWidth = (width - spacing(2) * 2 - GUTTER) / 2;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing(2),
          paddingTop: spacing(2),
          gap: GUTTER
        }}>
          {[...Array(8)].map((_, i) => (
            <RecipeCardSkeleton key={i} style={{ width: skeletonCardWidth }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <FlatList
        data={viewMode === 'browse' ? (getCurrentRecipes() || []) : []}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing(8), flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View>

            {/* View Mode Toggle */}
            {(
              <Animated.View entering={FadeIn.duration(400)} style={{
                marginHorizontal: spacing(2),
                marginTop: spacing(2),
                marginBottom: spacing(1.5),
                flexDirection: 'row',
                backgroundColor: colors.card,
                borderRadius: radii.lg,
                padding: 4,
              }}>
                <Pressable
                  onPress={() => setViewMode('browse')}
                  style={{
                    flex: 1,
                    paddingVertical: spacing(1),
                    borderRadius: radii.md,
                    backgroundColor: viewMode === 'browse' ? colors.accent : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: viewMode === 'browse' ? colors.bg : colors.muted,
                    fontWeight: viewMode === 'browse' ? '700' : '600',
                    fontSize: 15,
                  }}>
                    Browse
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('personalized')}
                  style={{
                    flex: 1,
                    paddingVertical: spacing(1),
                    borderRadius: radii.md,
                    backgroundColor: viewMode === 'personalized' ? colors.accent : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: viewMode === 'personalized' ? colors.bg : colors.muted,
                    fontWeight: viewMode === 'personalized' ? '700' : '600',
                    fontSize: 15,
                  }}>
                    For You
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Search Bar with Filters */}
            <View style={{ marginHorizontal: spacing(2), marginBottom: spacing(2), flexDirection: 'row', gap: spacing(1.5) }}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Search recipes, ingredients..."
                  debounceMs={0}
                />
              </View>

              {/* My Unlocked Filter (only show for FREE tier) */}
              {tier === 'FREE' && unlockedCocktails.length > 0 && (
                <TouchableOpacity
                  style={{
                    height: 48,
                    paddingHorizontal: spacing(2),
                    borderRadius: radii.lg,
                    backgroundColor: showOnlyUnlocked ? colors.gold : colors.card,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: spacing(1),
                    borderWidth: 1.5,
                    borderColor: showOnlyUnlocked ? colors.gold : colors.line,
                  }}
                  onPress={() => setShowOnlyUnlocked(!showOnlyUnlocked)}
                >
                  <Ionicons
                    name={showOnlyUnlocked ? "star" : "star-outline"}
                    size={18}
                    color={showOnlyUnlocked ? colors.bg : colors.text}
                  />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: showOnlyUnlocked ? colors.bg : colors.text,
                  }}>
                    Unlocked
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radii.lg,
                  backgroundColor: Object.keys(currentFilters).length > 0 ? colors.accent : colors.card,
                  borderWidth: 2,
                  borderColor: Object.keys(currentFilters).length > 0 ? colors.accent : colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons
                  name="filter"
                  size={22}
                  color={Object.keys(currentFilters).length > 0 ? colors.bg : colors.text}
                />
                {Object.keys(currentFilters).length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: colors.bg,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>
                      {Object.keys(currentFilters).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Browse All Content */}
            {viewMode === 'browse' && (
              <>
                {/* Only show featured content when not searching */}
                {!searchQuery.trim() && (
                  <>
                    {/* Cocktail of the Week */}
                    <View style={{ marginTop: spacing(1) }}>
              <HeroCard
                cocktail={COCKTAIL_OF_THE_WEEK}
                onPress={() => navigation.navigate('CocktailDetail', { cocktailId: COCKTAIL_OF_THE_WEEK.id })}
              />
            </View>

            {/* Shots */}
            <SectionHeader
              title="Shots"
              onPress={() => {
                // Ensure we only pass string IDs
                const shotIds = ALL_SHOTS.map(shot => shot.id).filter(id => typeof id === 'string');
                navigation.navigate('CocktailList', {
                  title: 'Shots',
                  cocktailIds: shotIds,
                  category: 'shots'
                });
              }}
            />
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
              {PARTY_SHOTS?.slice(0, 5).map((shot, index) => {
                const cardProps = createRecipeCardProps(shot, navigation, {
                  toggleSavedCocktail,
                  isCocktailSaved,
                  setSelectedRecipe,
                  setGroceryListVisible,
                  showToast,
                  showSaveButton: false,
                  showCartButton: false,
                  showDeleteButton: false,
                });
                return (
                  <Animated.View key={shot.id} entering={FadeInRight.delay(index * 100).duration(500).springify()}>
                    <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                  </Animated.View>
                );
              })}
            </ScrollView>

            {/* Mocktails */}
            <SectionHeader
              title="Mocktails"
              onPress={() => {
                // Ensure we only pass string IDs
                const mocktailIds = sampleRecipes.map(recipe => recipe.id).filter(id => typeof id === 'string');
                navigation.navigate('CocktailList', {
                  title: 'Mocktails',
                  cocktailIds: mocktailIds,
                  category: 'mocktails'
                });
              }}
            />
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
              {sampleRecipes?.map((mocktail, index) => {
                const cardProps = createRecipeCardProps(mocktail, navigation, {
                  toggleSavedCocktail,
                  isCocktailSaved,
                  setSelectedRecipe,
                  setGroceryListVisible,
                  showToast,
                  showSaveButton: false,
                  showCartButton: false,
                  showDeleteButton: false,
                });
                return (
                  <Animated.View key={mocktail.id} entering={FadeInRight.delay(index * 100).duration(500).springify()}>
                    <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                  </Animated.View>
                );
              })}
            </ScrollView>

            {/* Essential Syrups */}
            <SectionHeader
              title="Essential Syrups"
            />
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
              {ESSENTIAL_SYRUPS.map((syrup, index) => {
                const cardProps = createRecipeCardProps(syrup, navigation, {
                  toggleSavedCocktail,
                  isCocktailSaved,
                  setSelectedRecipe,
                  setGroceryListVisible,
                  showToast,
                  showSaveButton: true,
                  showCartButton: false,
                  showDeleteButton: false,
                });
                return (
                  <Animated.View
                    key={syrup.id}
                    entering={FadeInRight.delay(index * 100).duration(500).springify()}
                    style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginRight: 16 }}
                  >
                    <RecipeCard {...cardProps} />
                  </Animated.View>
                );
              })}
            </ScrollView>

            {/* My Recipes */}
            <SectionHeader
              title="My Recipes"
              onPress={() => navigation.navigate('MyRecipes')}
            />
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
              {userRecipes.length > 0 ? (
                userRecipes.slice(0, 5).map((recipe, index) => {
                  // Convert UserRecipe to cocktail format for createRecipeCardProps
                  const cocktailData = {
                    id: recipe.id,
                    name: recipe.name,
                    subtitle: recipe.type === 'ai_generated' ? 'AI Generated' : recipe.type === 'modified' ? 'Modified Recipe' : 'My Creation',
                    description: recipe.description || 'Custom recipe',
                    image: recipe.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
                    tags: recipe.tags || [],
                  };

                  const cardProps = createRecipeCardProps(cocktailData, navigation, {
                    toggleSavedCocktail,
                    isCocktailSaved,
                    setSelectedRecipe,
                    setGroceryListVisible,
                    showToast,
                    showSaveButton: false,
                    showCartButton: false,
                    showDeleteButton: false,
                  });

                  // Override the onPress to navigate to RecipeDetail with user recipe data
                  cardProps.onPress = () => {
                    navigation.navigate('RecipeDetail', { recipe });
                  };

                  return (
                    <Animated.View key={recipe.id} entering={FadeInRight.delay(index * 100).duration(500).springify()}>
                      <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                    </Animated.View>
                  );
                })
              ) : (
                <Pressable
                  style={{
                    width: 240,
                    height: 160,
                    marginRight: 16,
                    backgroundColor: colors.card,
                    borderRadius: radii.lg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.border,
                    borderStyle: 'dashed'
                  }}
                  onPress={() => navigation.navigate('AddRecipe')}
                >
                  <Ionicons name="add-circle-outline" size={32} color={colors.muted} />
                  <Text style={{ color: colors.muted, marginTop: 8, textAlign: 'center' }}>
                    Create your first{'\n'}custom recipe
                  </Text>
                </Pressable>
              )}
            </ScrollView>










                  </>
                )}
              </>
            )}

            {/* Personalized Feed - For You View */}
            {viewMode === 'personalized' && (
              <ForYouFeed
                onCocktailPress={handleCocktailPress}
                onSaveCocktail={handleSaveRecipe}
                onAddToCart={handleAddToGroceryList}
                savedRecipeIds={savedRecipeIds}
                onRefineProfile={() => navigation.navigate('RefineYourTaste')}
              />
            )}

            {/* All Cocktails Header - Only show in Browse mode or when searching */}
            {(searchQuery.trim() || viewMode === 'browse') && (
              <View style={{
                marginHorizontal: spacing(2),
                marginTop: spacing(2),
                marginBottom: spacing(1.5)
              }}>
                <Text style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: '900',
                  marginBottom: spacing(1.5)
                }}>
                  All Cocktails
                </Text>

                {/* Horizontal Filter Buttons */}
                {!searchQuery.trim() && !showSearchInput && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing(1) }}
                  >
                    <Pressable
                      onPress={() => setShowSearchInput(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.card,
                        paddingHorizontal: spacing(1.5),
                        paddingVertical: spacing(1),
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                    >
                      <Ionicons name="search" size={16} color={colors.accent} style={{ marginRight: spacing(0.5) }} />
                      <Text style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '500'
                      }}>
                        Search
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowFilterModal(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.card,
                        paddingHorizontal: spacing(1.5),
                        paddingVertical: spacing(1),
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                    >
                      <Ionicons name="filter" size={16} color={colors.accent} style={{ marginRight: spacing(0.5) }} />
                      <Text style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '500'
                      }}>
                        Filter
                      </Text>
                    </Pressable>

                    {tier === 'FREE' && (
                      <Pressable
                        onPress={() => setShowOnlyUnlocked(!showOnlyUnlocked)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: showOnlyUnlocked ? colors.accent : colors.card,
                          paddingHorizontal: spacing(1.5),
                          paddingVertical: spacing(1),
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: showOnlyUnlocked ? colors.accent : colors.border
                        }}
                      >
                        <Ionicons
                          name={showOnlyUnlocked ? "checkmark-circle" : "lock-open"}
                          size={16}
                          color={showOnlyUnlocked ? colors.white : colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text style={{
                          color: showOnlyUnlocked ? colors.white : colors.text,
                          fontSize: 14,
                          fontWeight: '500'
                        }}>
                          Unlocked
                        </Text>
                      </Pressable>
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Filter Modal */}
            <Modal visible={showFilterModal} transparent animationType="fade">
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: spacing(4)
              }}>
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: radii.lg,
                  padding: spacing(4),
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: '85%'
                }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing(3),
                    paddingBottom: spacing(2),
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border
                  }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '600',
                      color: colors.text
                    }}>Filters</Text>
                    <Pressable onPress={() => setShowFilterModal(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Spirit Filter */}
                    <View style={{ marginBottom: spacing(3) }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing(2)
                      }}>Spirit</Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing(2) }}>
                        <View style={{
                          flexDirection: 'row',
                          gap: spacing(1),
                          paddingRight: spacing(2)
                        }}>
                        {['All', 'Brandy', 'Cognac', 'Gin', 'Mezcal', 'Rum', 'Tequila', 'Vodka', 'Whiskey'].map((spirit) => {
                          const isSelected = currentFilters.ingredients?.includes(spirit.toLowerCase()) || (spirit === 'All' && !currentFilters.ingredients?.length);
                          return (
                            <Pressable
                              key={spirit}
                              onPress={() => {
                                if (spirit === 'All') {
                                  setCurrentFilters({ ...currentFilters, ingredients: [] });
                                } else {
                                  const ingredients = currentFilters.ingredients || [];
                                  const newIngredients = ingredients.includes(spirit.toLowerCase())
                                    ? ingredients.filter(i => i !== spirit.toLowerCase())
                                    : [spirit.toLowerCase()];
                                  setCurrentFilters({ ...currentFilters, ingredients: newIngredients });
                                }
                              }}
                              style={{
                                backgroundColor: isSelected ? colors.accent : colors.card,
                                paddingHorizontal: spacing(2),
                                paddingVertical: spacing(1.5),
                                borderRadius: radii.md,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.accent : colors.border
                              }}
                            >
                              <Text style={{
                                color: isSelected ? colors.white : colors.text,
                                fontSize: 16,
                                fontWeight: isSelected ? '600' : '400'
                              }}>
                                {spirit}
                              </Text>
                            </Pressable>
                          );
                        })}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Difficulty Filter */}
                    <View style={{ marginBottom: spacing(3) }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing(2)
                      }}>Difficulty</Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{
                          flexDirection: 'row',
                          gap: spacing(1),
                          paddingRight: spacing(2)
                        }}>
                          {['All', 'Easy', 'Medium', 'Hard'].map((difficulty) => {
                            const isSelected = currentFilters.difficulty?.includes(difficulty.toLowerCase()) || (difficulty === 'All' && !currentFilters.difficulty?.length);
                            return (
                              <Pressable
                                key={difficulty}
                                onPress={() => {
                                  if (difficulty === 'All') {
                                    setCurrentFilters({ ...currentFilters, difficulty: [] });
                                  } else {
                                    const difficulties = currentFilters.difficulty || [];
                                    const newDifficulties = difficulties.includes(difficulty.toLowerCase())
                                      ? difficulties.filter(d => d !== difficulty.toLowerCase())
                                      : [difficulty.toLowerCase()];
                                    setCurrentFilters({ ...currentFilters, difficulty: newDifficulties });
                                  }
                                }}
                                style={{
                                  backgroundColor: isSelected ? colors.accent : colors.card,
                                  paddingHorizontal: spacing(2),
                                  paddingVertical: spacing(1.5),
                                  borderRadius: radii.md,
                                  borderWidth: 1,
                                  borderColor: isSelected ? colors.accent : colors.border
                                }}
                              >
                                <Text style={{
                                  color: isSelected ? colors.white : colors.text,
                                  fontSize: 16,
                                  fontWeight: isSelected ? '600' : '400'
                                }}>
                                  {difficulty}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Category Filter */}
                    <View style={{ marginBottom: spacing(3) }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing(2)
                      }}>Category</Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{
                          flexDirection: 'row',
                          gap: spacing(1),
                          paddingRight: spacing(2)
                        }}>
                          {['All', 'Bitter', 'Classic', 'Coffee', 'Creamy', 'Fizzy', 'Fruity', 'Herbal', 'Italian', 'Minty', 'Mocktails', 'Modern', 'Refreshing', 'Shots', 'Sour', 'Spicy', 'Sweet', 'Tiki', 'Tropical'].map((category) => {
                            const isSelected = currentFilters.category?.includes(category.toLowerCase()) || (category === 'All' && !currentFilters.category?.length);
                            return (
                              <Pressable
                                key={category}
                                onPress={() => {
                                  if (category === 'All') {
                                    setCurrentFilters({ ...currentFilters, category: [] });
                                  } else {
                                    const categories = currentFilters.category || [];
                                    const newCategories = categories.includes(category.toLowerCase())
                                      ? categories.filter(c => c !== category.toLowerCase())
                                      : [category.toLowerCase()];
                                    setCurrentFilters({ ...currentFilters, category: newCategories });
                                  }
                                }}
                                style={{
                                  backgroundColor: isSelected ? colors.accent : colors.card,
                                  paddingHorizontal: spacing(2),
                                  paddingVertical: spacing(1.5),
                                  borderRadius: radii.md,
                                  borderWidth: 1,
                                  borderColor: isSelected ? colors.accent : colors.border
                                }}
                              >
                                <Text style={{
                                  color: isSelected ? colors.white : colors.text,
                                  fontSize: 16,
                                  fontWeight: isSelected ? '600' : '400'
                                }}>
                                  {category}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Sort Options */}
                    <View style={{ marginBottom: spacing(3) }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing(2)
                      }}>Sort By</Text>

                      <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing(1)
                      }}>
                        {[
                          { label: 'A → Z', value: 'alphabetical-asc' },
                          { label: 'Z → A', value: 'alphabetical-desc' },
                          { label: 'Rating ↑', value: 'rating-desc' },
                          { label: 'Rating ↓', value: 'rating-asc' },
                        ].map((sortOption) => {
                          const isSelected = currentFilters.sortOrder === sortOption.value;
                          return (
                            <Pressable
                              key={sortOption.value}
                              onPress={() => {
                                setCurrentFilters({
                                  ...currentFilters,
                                  sortOrder: isSelected ? undefined : sortOption.value
                                });
                              }}
                              style={{
                                backgroundColor: isSelected ? colors.accent : colors.card,
                                paddingHorizontal: spacing(2),
                                paddingVertical: spacing(1.5),
                                borderRadius: radii.md,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.accent : colors.border
                              }}
                            >
                              <Text style={{
                                color: isSelected ? colors.white : colors.text,
                                fontSize: 16,
                                fontWeight: isSelected ? '600' : '400'
                              }}>
                                {sortOption.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Clear All Button */}
                    <Pressable
                      style={{
                        backgroundColor: colors.card,
                        paddingVertical: spacing(1.5),
                        borderRadius: radii.md,
                        alignItems: 'center',
                        marginBottom: spacing(2),
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                      onPress={() => setCurrentFilters({})}
                    >
                      <Text style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '600'
                      }}>Clear All Filters</Text>
                    </Pressable>
                  </ScrollView>

                  <Pressable
                    style={{
                      backgroundColor: colors.accent,
                      paddingVertical: spacing(1.5),
                      borderRadius: radii.md,
                      alignItems: 'center',
                      marginTop: spacing(2)
                    }}
                    onPress={() => setShowFilterModal(false)}
                  >
                    <Text style={{
                      color: colors.white,
                      fontSize: 16,
                      fontWeight: '600'
                    }}>Apply Filters</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        columnWrapperStyle={{ paddingHorizontal: spacing(2), columnGap: GUTTER }}
      />

      {/* Modals */}

      <GroceryListModal
        visible={groceryListVisible}
        recipeName={selectedRecipe?.name || selectedRecipe?.title || 'Recipe'}
        ingredients={selectedRecipe?.ingredients || []}
        recipeId={selectedRecipe?.id}
        onClose={() => {
          setGroceryListVisible(false);
          setSelectedRecipe(null);
        }}
      />

      {/* AI Recipe Modal */}
      <AIRecipeModal
        visible={aiRecipeModalVisible}
        onClose={() => {
          setAiRecipeModalVisible(false);
          setCurrentAiRecipe(null);
        }}
        recipe={currentAiRecipe}
        onSave={handleSaveAiRecipe}
        navigation={navigation}
      />

      {/* AI Credits Purchase Modal */}
      <AICreditsPurchaseModal
        visible={creditsPurchaseVisible}
        onClose={() => setCreditsPurchaseVisible(false)}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={currentFilters}
        onApplyFilters={(filters) => {
          setCurrentFilters(filters);
          // Re-trigger search with new filters if there's a query
          if (searchQuery.trim()) {
            handleSearch(searchQuery);
          }
        }}
      />

      {/* AI Credits Info Modal */}
      <Modal
        visible={creditsInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreditsInfoVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing(4)
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing(4),
            width: '100%',
            maxWidth: 350,
            maxHeight: '80%'
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing(3),
              paddingBottom: spacing(2),
              borderBottomWidth: 1,
              borderBottomColor: colors.border
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: colors.text,
                fontFamily: fonts.heading
              }}>AI Credits Usage</Text>
              <Pressable
                onPress={() => setCreditsInfoVisible(false)}
                style={{
                  padding: spacing(1),
                  borderRadius: radii.md
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{
                fontSize: 14,
                color: colors.subtext,
                marginBottom: spacing(3),
                lineHeight: 20
              }}>
                Credits are used for AI-powered features. Each action consumes different amounts:
              </Text>

              {/* AI Action Costs */}
              <View style={{ gap: spacing(2) }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.md
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="restaurant" size={16} color={colors.accent} style={{ marginRight: spacing(1.5) }} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Recipe Generation</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>Create custom cocktail recipes</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {getActionCost('recipe_generation')} credits
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.md
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: spacing(1.5) }} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>AI Recommendations</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>Personalized cocktail suggestions</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {getActionCost('recommendation')} credits
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.md
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="search" size={16} color={colors.accent} style={{ marginRight: spacing(1.5) }} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Search Enhancement</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>Improved search results</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {getActionCost('search_enhancement')} credit
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.md
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="camera" size={16} color={colors.accent} style={{ marginRight: spacing(1.5) }} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Image Analysis</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>Cocktail photo recognition</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {getActionCost('image_analysis')} credits
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing(1.5),
                  paddingHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.md
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="document-text" size={16} color={colors.accent} style={{ marginRight: spacing(1.5) }} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Text Recognition</Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>Extract text from images</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {getActionCost('ocr_processing')} credits
                  </Text>
                </View>
              </View>

              <View style={{
                marginTop: spacing(3),
                paddingTop: spacing(3),
                borderTopWidth: 1,
                borderTopColor: colors.border
              }}>
                <Text style={{
                  fontSize: 14,
                  color: colors.subtext,
                  lineHeight: 20,
                  textAlign: 'center'
                }}>
                  💡 You receive 5 free credits daily{isPremium ? '' : ', or upgrade to Premium for unlimited usage'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recipe Preferences Modal */}
      <RecipePreferencesModal
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
      />

      {/* Floating Search Bar */}
      {showSearchInput && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.bg,
          paddingTop: spacing(2),
          paddingHorizontal: spacing(2),
          paddingBottom: spacing(2),
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radii.lg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing(1.5),
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Ionicons name="search" size={20} color={colors.muted} style={{ marginRight: spacing(1) }} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search cocktails by name, spirit, or ingredient..."
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 16,
                paddingVertical: spacing(1.5),
              }}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardAppearance="dark"
            />
            {searchQuery ? (
              <Pressable onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            ) : (
              <Pressable onPress={() => {
                setShowSearchInput(false);
                setSearchQuery('');
                setSearchResults([]);
              }} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            )}
          </View>
          {searchQuery.trim() && (
            <View style={{ marginTop: spacing(1) }}>
              <Text style={{
                color: colors.muted,
                fontSize: 14
              }}>
                {isSearching ? 'Searching...' : `Found ${searchResults.length} cocktail${searchResults.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Cocktail Unlock Sheet */}
      <CocktailUnlockSheet
        visible={unlockSheetVisible}
        onClose={() => {
          setUnlockSheetVisible(false);
          setSelectedCocktailForUnlock(null);
        }}
        cocktailName={selectedCocktailForUnlock?.name || 'This Cocktail'}
        xpCost={selectedCocktailForUnlock ? getCocktailCost(selectedCocktailForUnlock.id) : 0}
        currentXP={xpBalance}
        canAfford={selectedCocktailForUnlock ? canAffordCocktail(selectedCocktailForUnlock.id) : false}
        onUnlockWithXP={() => {
          if (selectedCocktailForUnlock) {
            const cost = getCocktailCost(selectedCocktailForUnlock.id);
            const success = unlockCocktail(selectedCocktailForUnlock.id, cost);
            if (success) {
              showToast(`Unlocked ${selectedCocktailForUnlock.name}!`, 'success');
              setUnlockSheetVisible(false);
              setSelectedCocktailForUnlock(null);
            } else {
              showToast('Not enough XP to unlock', 'error');
            }
          }
        }}
        onUpgradeSubscription={() => {
          setUnlockSheetVisible(false);
          setSelectedCocktailForUnlock(null);
          navigation.navigate('Paywall', { offering: null, displayCloseButton: true });
        }}
      />

      {/* XP Balance Modal */}
      <XPBalanceModal
        visible={xpBalanceModalVisible}
        onClose={() => setXpBalanceModalVisible(false)}
      />

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
