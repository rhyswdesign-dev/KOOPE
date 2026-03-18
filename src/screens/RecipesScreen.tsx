import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  SafeAreaView,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SectionHeader from '../components/SectionHeader';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { FREE_RECIPE_LIMIT, useSavedItems } from '../hooks/useSavedItems';
import { recipeService } from '../lib/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import GroceryListModal from '../components/GroceryListModal';
import { AIRecipeFormatter, FormattedRecipe } from '../services/aiRecipeFormatter';
import { searchService, type FilterOptions } from '../services/searchService';
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
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import LockedRecipeCard from '../components/LockedRecipeCard';
import { useXPSystem } from '../store/useXPSystem';
import CocktailUnlockSheet from '../components/CocktailUnlockSheet';
import XPBalanceModal from '../components/XPBalanceModal';
import { useEngagement } from '../store/useEngagement';
import { getCocktailsOfTheWeek } from '../utils/weeklyRotation';
import MainPageHeader from '../components/ui/MainPageHeader';
import { cocktailVariations } from '../config/vaultContent';
import { getVaultVariationThumbnail } from '../data/vaultImages';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import { ingredientListToSearchText } from '../utils/ingredientFormatting';
import { curriculumData } from '../utils/curriculumAdapter';
import { getCurriculumUnlockForRecipeId } from '../config/unlockContent';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const GUTTER = 12;
const GOLD = '#C9A15A'; // spotlight color


/* ------------------------- DATA ------------------------- */

// Get the featured cocktail of the week (first cocktail from weekly rotation)
// This rotates automatically each week and matches the FeaturedScreen
const weeklyCocktails = getCocktailsOfTheWeek(1);
const COCKTAIL_OF_THE_WEEK = {
  id: weeklyCocktails[0].id,
  name: weeklyCocktails[0].title,
  subtitle: 'Cocktail of the Week',
  image: weeklyCocktails[0].img,
  description: weeklyCocktails[0].description,
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
    image: require('../../assets/images/mocktails/virgin_mojito.png'),
    img: require('../../assets/images/mocktails/virgin_mojito.png'),
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.6,
    glass: 'Highball',
    ice: 'Crushed',
    method: 'Build',
    ingredients: [
      { name: 'Fresh Lime Juice', note: '3/4 oz freshly squeezed' },
      { name: 'Simple Syrup', note: '1/2 oz' },
      { name: 'Fresh Mint Leaves', note: '8-10 leaves' },
      { name: 'Non-Alcoholic Rum', note: '1 1/2 oz (optional)' },
      { name: 'Soda Water', note: 'top' },
    ],
    garnish: 'Mint bouquet + lime wheel',
    instructions: [
      'Add lime juice, simple syrup, and mint leaves to a highball glass',
      'Gently press mint leaves with a muddler or spoon (never shred)',
      'Add optional non-alcoholic rum if desired',
      'Fill glass with crushed ice',
      'Top with soda water and stir gently',
      'Garnish with a mint bouquet and lime wheel',
    ],
    description: 'Refreshing non-alcoholic version of the classic mojito.',
    tips: [
      'Never shred mint—gentle press only to avoid bitterness',
      'Use fresh lime juice for best flavor',
      'Build directly in the glass to preserve carbonation',
    ],
  },
  {
    id: 'garden-108-tonic',
    name: 'Garden 108 & Tonic',
    title: 'Garden 108 & Tonic',
    subtitle: 'Zero-Proof • Herbal & Garden Fresh',
    category: 'Mocktails',
    image: require('../../assets/images/mocktails/garden_108_tonic.png'),
    img: require('../../assets/images/mocktails/garden_108_tonic.png'),
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.7,
    glass: 'G&T bowl or wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Seedlip Garden 108', note: '2 oz' },
      { name: 'Premium Tonic Water', note: '4 oz chilled' },
      { name: 'Cucumber Slices', note: '3 slices' },
      { name: 'Fresh Mint Sprig', note: 'for garnish' },
      { name: 'Lime Wheel', note: 'for garnish' },
    ],
    garnish: 'Cucumber slices + mint sprig + lime wheel',
    instructions: [
      'Fill a G&T bowl or wine glass with cubed ice',
      'Add Seedlip Garden 108',
      'Add cucumber slices to the glass',
      'Top with chilled premium tonic water',
      'Stir gently to combine',
      'Garnish with mint sprig and lime wheel',
    ],
    description: 'Herbal and garden fresh zero-proof G&T.',
    tips: [
      'Use premium tonic water for best flavor',
      'Chill the glass beforehand for extra refreshment',
      'The cucumber adds a crisp, garden-fresh element',
    ],
  },
  {
    id: 'herbaceous-spritz',
    name: 'Herbaceous Spritz',
    title: 'Herbaceous Spritz',
    subtitle: 'Zero-Proof • Garden Fresh',
    category: 'Mocktails',
    image: require('../../assets/images/mocktails/herbaceous_spritz.png'),
    img: require('../../assets/images/mocktails/herbaceous_spritz.png'),
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Seedlip Garden 108', note: '2 oz' },
      { name: 'Elderflower Tonic or Sparkling Water', note: '3 oz' },
      { name: 'Fresh Lemon Juice', note: '1/2 oz' },
      { name: 'Rosemary Sprig', note: 'for garnish' },
      { name: 'Grapefruit Twist', note: 'for garnish' },
    ],
    garnish: 'Rosemary sprig + grapefruit twist',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add Seedlip Garden 108 and lemon juice',
      'Top with elderflower tonic or sparkling water',
      'Stir gently to combine',
      'Express grapefruit twist over the drink and drop in',
      'Garnish with a fresh rosemary sprig',
    ],
    description: 'Sophisticated spritz with herbal complexity.',
    tips: [
      'Lightly torch rosemary to release aromatic oils',
      'Use elderflower tonic for extra botanical depth',
      'Express citrus oils from the grapefruit twist over the drink',
    ],
  },
  {
    id: 'garden-gimlet',
    name: 'Garden Gimlet',
    title: 'Garden Gimlet',
    subtitle: 'Zero-Proof • Classic Style',
    category: 'Mocktails',
    image: require('../../assets/images/mocktails/garden_gimlet.png'),
    img: require('../../assets/images/mocktails/garden_gimlet.png'),
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    glass: 'Coupe',
    ice: 'Shaken',
    method: 'Shake',
    ingredients: [
      { name: 'Seedlip Garden 108', note: '2 oz' },
      { name: 'Fresh Lime Juice', note: '3/4 oz' },
      { name: 'Simple Syrup', note: '1/2 oz' },
      { name: 'Cucumber Wheel', note: 'for garnish' },
      { name: 'Fresh Basil Leaf', note: 'for garnish' },
    ],
    garnish: 'Cucumber wheel + basil leaf',
    instructions: [
      'Add Seedlip Garden 108, lime juice, and simple syrup to a shaker',
      'Fill shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Fine strain into a chilled coupe glass',
      'Slap basil leaf between hands to release aromatics',
      'Garnish with cucumber wheel and basil leaf',
    ],
    description: 'Zero-proof take on the classic gimlet.',
    tips: [
      'Slap basil between hands before garnishing to release oils',
      'Chill coupe in freezer for 10 minutes before serving',
      'Double strain for crystal-clear presentation',
    ],
  },
  {
    id: 'smokeless-old-fashioned',
    name: 'Smokeless Old Fashioned',
    title: 'Smokeless Old Fashioned',
    subtitle: 'Zero-Proof • Rich & Smoky',
    category: 'Mocktails',
    image: require('../../assets/images/mocktails/smokeless_old_fashioned.png'),
    img: require('../../assets/images/mocktails/smokeless_old_fashioned.png'),
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.8,
    glass: 'Rocks',
    ice: 'Large cube',
    method: 'Stir',
    ingredients: [
      { name: 'Lyre\'s American Malt', note: '2 oz' },
      { name: 'Maple Syrup', note: '1/4 oz (or 1 sugar cube)' },
      { name: 'Angostura Bitters', note: '2 dashes' },
      { name: 'Orange Bitters', note: '1 dash' },
      { name: 'Orange Peel', note: 'for garnish' },
      { name: 'Luxardo Cherry', note: 'for garnish (optional)' },
    ],
    garnish: 'Orange peel + Luxardo cherry',
    instructions: [
      'In a mixing glass, combine Lyre\'s American Malt, maple syrup, and bitters',
      'Add ice and stir for 20-30 seconds',
      'Strain into a rocks glass over a large ice cube',
      'Express orange peel oils over the drink',
      'Garnish with orange peel and optional Luxardo cherry',
    ],
    description: 'Classic Old Fashioned without the alcohol.',
    tips: [
      'The large ice cube melts slowly, preventing dilution',
      'Stir thoroughly to integrate the maple and bitters',
      'Express orange oils generously for aromatic depth',
    ],
  },
  {
    id: 'zero-proof-manhattan',
    name: 'Zero Proof Manhattan',
    title: 'Zero Proof Manhattan',
    subtitle: 'Zero-Proof • Whiskey Style',
    category: 'Mocktails',
    image: require('../../assets/images/mocktails/zero_proof_manhattan.png'),
    img: require('../../assets/images/mocktails/zero_proof_manhattan.png'),
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.7,
    glass: 'Coupe',
    ice: 'Stirred',
    method: 'Stir',
    ingredients: [
      { name: 'Lyre\'s American Malt', note: '2 oz' },
      { name: 'Lyre\'s Aperitif Rosso', note: '1 oz (sweet vermouth alternative)' },
      { name: 'Angostura Bitters', note: '2 dashes' },
      { name: 'Luxardo Cherry', note: 'for garnish' },
    ],
    garnish: 'Luxardo cherry',
    instructions: [
      'Add Lyre\'s American Malt, Aperitif Rosso, and bitters to a mixing glass',
      'Fill with ice and stir for 20-30 seconds',
      'Strain into a chilled coupe glass',
      'Garnish with a Luxardo cherry',
    ],
    description: 'Sophisticated zero-proof Manhattan.',
    tips: [
      'Stir, don\'t shake, for a silky texture',
      'Chill the coupe beforehand for best results',
      'Use Luxardo cherries for authentic flavor',
    ],
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
    glass: 'Rocks',
    ice: 'Cubed',
    method: 'Shake',
    ingredients: [
      { name: 'Lyre\'s American Malt', note: '2 oz' },
      { name: 'Fresh Lemon Juice', note: '3/4 oz' },
      { name: 'Maple Syrup', note: '1/2 oz' },
      { name: 'Egg White', note: '1 (or 1/2 oz aquafaba for vegan)' },
      { name: 'Angostura Bitters', note: '3 drops for garnish' },
    ],
    garnish: 'Angostura bitters (3-drop pattern on foam)',
    instructions: [
      'Add all ingredients to a shaker without ice (dry shake)',
      'Shake vigorously for 15 seconds to emulsify egg white',
      'Add ice and shake again for 10-15 seconds',
      'Strain into a rocks glass over fresh ice',
      'Let foam settle, then garnish with 3 drops of Angostura bitters in a pattern on the foam',
    ],
    description: 'Zero-proof whiskey sour with maple sweetness.',
    tips: [
      'Dry shake first (no ice) to create silky foam',
      'Use aquafaba (chickpea liquid) as vegan egg white alternative',
      'Draw a toothpick through the bitters drops for decorative patterns',
    ],
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
    glass: 'G&T bowl or wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Non-Alcoholic Gin', note: '2 oz (Monday Gin or similar)' },
      { name: 'Premium Tonic Water', note: '4 oz' },
      { name: 'Lime Peel', note: 'for garnish' },
      { name: 'Juniper Berries', note: 'optional, cracked for garnish' },
    ],
    garnish: 'Lime peel or lemon peel + optional cracked juniper berries',
    instructions: [
      'Fill a G&T bowl or wine glass with cubed ice',
      'Add non-alcoholic gin',
      'Top with premium tonic water',
      'Gently stir to combine',
      'Garnish with lime or lemon peel and optional juniper berries',
    ],
    description: 'Classic G&T without the alcohol.',
    tips: [
      'Use a neutral tonic to keep juniper clean and dry',
      'Crack juniper berries before adding to release aromatics',
      'Quality non-alcoholic gin makes all the difference',
    ],
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
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Non-Alcoholic Aperitivo', note: '2 oz (bitter-sweet, herbal)' },
      { name: 'Soda Water', note: '3 oz' },
      { name: 'Orange Slice', note: 'for garnish' },
      { name: 'Rosemary Sprig', note: 'for garnish' },
    ],
    garnish: 'Orange slice + rosemary sprig',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add non-alcoholic aperitivo',
      'Top with soda water',
      'Single lift stir to combine',
      'Garnish with orange slice and rosemary sprig',
    ],
    description: 'Perfect aperitif hour spritz.',
    tips: [
      'Serve very cold—this drink relies on bitterness, not sweetness',
      'Quality non-alcoholic aperitivo like Ghia makes a difference',
      'Keep it simple to let the botanicals shine',
    ],
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
    glass: 'Copper mug',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'GT\'s Gingerade Kombucha', note: '6 oz' },
      { name: 'Fresh Lime Juice', note: '1/2 oz' },
      { name: 'Agave Syrup', note: '1/4 oz (optional, to taste)' },
      { name: 'Fresh Mint Sprig', note: 'for garnish' },
      { name: 'Candied Ginger', note: 'for garnish' },
      { name: 'Lime Wheel', note: 'for garnish' },
    ],
    garnish: 'Mint sprig + candied ginger + lime wheel',
    instructions: [
      'Fill a copper mug with cubed ice',
      'Add lime juice and optional agave syrup',
      'Top with GT\'s Gingerade Kombucha',
      'Stir gently to combine',
      'Garnish with mint sprig, candied ginger, and lime wheel',
    ],
    description: 'Probiotic-rich mule with fresh ginger.',
    tips: [
      'Kombucha provides natural probiotics for gut health',
      'Adjust sweetness to taste—kombucha is naturally tangy',
      'Don\'t over-stir to preserve kombucha carbonation',
    ],
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
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Non-Alcoholic Gin', note: '1 1/2 oz' },
      { name: 'Chamomile Tea', note: '3 oz (strong, chilled)' },
      { name: 'Soda Water', note: '2 oz' },
      { name: 'Edible Flower', note: 'for garnish' },
      { name: 'Lemon Peel', note: 'for garnish (alternative)' },
    ],
    garnish: 'Edible flower or lemon peel',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add non-alcoholic gin and chilled chamomile tea',
      'Top with soda water',
      'Stir gently',
      'Garnish with edible flower or lemon peel',
    ],
    description: 'Mindful drinking with hemp and adaptogens.',
    tips: [
      'Brew chamomile strong, then chill—dilute later for balance',
      'Chamomile adds natural calm without overwhelming',
      'Use cold-brew chamomile for smoother flavor',
    ],
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
    glass: 'Highball',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Hemp Syrup', note: '1/2 oz' },
      { name: 'Fresh Lemon Juice', note: '3/4 oz' },
      { name: 'Soda Water', note: '4 oz' },
      { name: 'Lemon Wheel', note: 'for garnish' },
    ],
    garnish: 'Lemon wheel',
    instructions: [
      'Add hemp syrup and lemon juice to a highball glass',
      'Fill glass with cubed ice',
      'Top with soda water',
      'Stir gently to combine',
      'Garnish with lemon wheel',
    ],
    description: 'Citrus-forward wellness cocktail.',
    tips: [
      'Keep hemp subtle—this is about refreshment, not heaviness',
      'Adjust syrup to taste based on desired sweetness',
      'Serve immediately while bubbles are fresh',
    ],
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
    glass: 'Rocks',
    ice: 'Large cube',
    method: 'Stir',
    ingredients: [
      { name: 'Ritual Gin Alternative', note: '1 oz' },
      { name: 'Lyre\'s Aperitif Rosso', note: '1 oz (sweet vermouth alternative)' },
      { name: 'Lyre\'s Aperitif Dry', note: '1 oz (Campari alternative)' },
      { name: 'Orange Peel', note: 'for garnish' },
    ],
    garnish: 'Orange peel',
    instructions: [
      'Add all ingredients to a mixing glass with ice',
      'Stir for 20-30 seconds until well-chilled',
      'Strain into a rocks glass over a large ice cube',
      'Express orange peel oils over the drink',
      'Garnish with the orange peel',
    ],
    description: 'Classic Negroni flavor without alcohol.',
    tips: [
      'Equal parts is key to Negroni balance',
      'Stir thoroughly to achieve proper dilution',
      'Express orange oils generously for aromatic impact',
    ],
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
    glass: 'Coupe',
    ice: 'Stirred',
    method: 'Stir',
    ingredients: [
      { name: 'Ritual Gin Alternative', note: '2 1/2 oz' },
      { name: 'Dry Vermouth', note: '1/2 oz' },
      { name: 'Orange Bitters', note: '2 dashes' },
      { name: 'Lemon Twist', note: 'for garnish' },
    ],
    garnish: 'Lemon twist',
    instructions: [
      'Add Ritual Gin Alternative, dry vermouth, and orange bitters to a mixing glass',
      'Fill mixing glass with ice',
      'Stir gently for 20-30 seconds until well-chilled',
      'Strain into a chilled coupe glass',
      'Express lemon twist over the drink',
      'Garnish with the lemon twist',
    ],
    description: 'Elegant zero-proof martini.',
    tips: [
      'Stir, don\'t shake, for a silky texture',
      'Chill the coupe glass in the freezer beforehand',
      'Express the lemon oils over the drink before garnishing',
    ],
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
    glass: 'Rocks',
    ice: 'Large cube',
    method: 'Stir',
    ingredients: [
      { name: 'Wilderton Earthen', note: '2 oz' },
      { name: 'Honey Syrup', note: '1/2 oz (2:1 honey to water)' },
      { name: 'Fresh Lemon Juice', note: '1/2 oz' },
      { name: 'Sage Leaf', note: 'for garnish' },
      { name: 'Dried Lavender', note: 'pinch for garnish' },
    ],
    garnish: 'Sage leaf + dried lavender',
    instructions: [
      'Add Wilderton Earthen, honey syrup, and lemon juice to a mixing glass',
      'Fill with ice and stir for 15-20 seconds',
      'Strain into a rocks glass over a large ice cube',
      'Lightly slap sage leaf to release aromatics',
      'Garnish with sage leaf and a pinch of dried lavender',
    ],
    description: 'Contemplative sipping with forest botanicals.',
    tips: [
      'Use a 2:1 honey-to-water ratio for honey syrup',
      'Slap sage gently between hands before garnishing',
      'The large ice cube melts slowly, preserving flavors',
    ],
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
    glass: 'Collins',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Cold Brew Coffee', note: '2 oz' },
      { name: 'Vanilla Syrup', note: '1/4 oz' },
      { name: 'Soda Water', note: '3 oz' },
      { name: 'Coffee Beans', note: 'for garnish' },
      { name: 'Orange Peel', note: 'for garnish (optional)' },
    ],
    garnish: 'Coffee beans or orange peel',
    instructions: [
      'Fill a Collins glass with cubed ice',
      'Add cold brew coffee and vanilla syrup',
      'Top with soda water',
      'Stir gently',
      'Garnish with coffee beans or orange peel',
    ],
    description: 'Energy-focused coffee cocktail.',
    tips: [
      'Use smooth, low-acid cold brew to avoid bitterness',
      'Orange peel adds unexpected citrus brightness',
      'Serve immediately for maximum carbonation',
    ],
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
    glass: 'Coupe',
    ice: 'Shaken',
    method: 'Shake',
    ingredients: [
      { name: 'Cold Brew Coffee', note: '2 oz' },
      { name: 'Coffee Syrup', note: '3/4 oz' },
      { name: 'Aquafaba', note: '3/4 oz (chickpea liquid)' },
      { name: 'Coffee Beans', note: '3 for garnish' },
    ],
    garnish: 'Three coffee beans',
    instructions: [
      'Add cold brew, coffee syrup, and aquafaba to shaker without ice (dry shake)',
      'Shake hard for 15 seconds to emulsify',
      'Add ice and shake again vigorously for 10-15 seconds',
      'Double strain into a chilled coupe glass',
      'Garnish with three coffee beans on the foam',
    ],
    description: 'Zero-proof espresso martini with clean energy.',
    tips: [
      'Fine strain for silky foam and clean presentation',
      'Dry shake first to create maximum foam',
      'Use quality cold brew for best flavor',
    ],
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
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Aromatized Wine or Verjus Aperitif', note: '2 oz' },
      { name: 'Soda Water', note: '2 oz' },
      { name: 'Lemon Peel', note: 'for garnish' },
    ],
    garnish: 'Lemon peel',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add aromatized wine or verjus aperitif',
      'Top with soda water',
      'Stir gently',
      'Garnish with lemon peel',
    ],
    description: 'Euphoric blend of adaptogens and botanicals.',
    tips: [
      'Keep ABV clearly labeled on menu for transparency',
      'Aromatized wines add complexity without high alcohol',
      'Serve well-chilled for best flavor',
    ],
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
    glass: 'Copper mug',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Seedlip Spice 94', note: '2 oz' },
      { name: 'Fresh Lime Juice', note: '1/2 oz' },
      { name: 'Ginger Beer', note: '4-5 oz (top)' },
      { name: 'Lime Wheel', note: 'for garnish' },
      { name: 'Candied Ginger', note: 'for garnish' },
    ],
    garnish: 'Lime wheel + candied ginger',
    instructions: [
      'Fill a copper mug with cubed ice',
      'Add Seedlip Spice 94 and lime juice',
      'Top with ginger beer',
      'Stir gently to combine',
      'Garnish with lime wheel and candied ginger',
    ],
    description: 'Warming spiced mule perfect for winter.',
    tips: [
      'Copper mug keeps the drink extra cold',
      'Use a spicy ginger beer for more kick',
      'Add fresh grated ginger for extra heat',
    ],
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
    glass: 'Rocks',
    ice: 'Cubed',
    method: 'Shake',
    ingredients: [
      { name: 'Spiced Botanical Tea', note: '2 oz (clove, cinnamon, cardamom, chilled)' },
      { name: 'Honey Syrup', note: '1/2 oz' },
      { name: 'Lemon Juice', note: '3/4 oz' },
      { name: 'Star Anise', note: 'for garnish' },
      { name: 'Cinnamon Stick', note: 'for garnish (alternative)' },
    ],
    garnish: 'Star anise or cinnamon stick',
    instructions: [
      'Add chilled spiced botanical tea, honey syrup, and lemon juice to shaker',
      'Fill with ice and shake hard for 10-15 seconds',
      'Strain over fresh ice in a rocks glass',
      'Garnish with star anise or cinnamon stick',
    ],
    description: 'Complex spiced cocktail with apple notes.',
    tips: [
      'Hard shake blooms spice aromatics',
      'Brew tea with clove, cinnamon, and cardamom, then chill',
      'Adjust honey to balance spice intensity',
    ],
  },
  {
    id: 'zero-proof-aperol-spritz',
    name: 'Aperitivo Spritz',
    title: 'Aperitivo Spritz',
    subtitle: 'Zero-Proof • Italian Aperitivo',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '2 min',
    rating: 4.7,
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Lyre\'s Italian Orange', note: '3 oz' },
      { name: 'Sparkling Wine or Prosecco (NA)', note: '2 oz' },
      { name: 'Soda Water', note: 'splash' },
      { name: 'Orange Slice', note: 'for garnish' },
    ],
    garnish: 'Orange slice',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add Lyre\'s Italian Orange',
      'Top with non-alcoholic sparkling wine and a splash of soda water',
      'Stir gently to combine',
      'Garnish with an orange slice',
    ],
    description: 'Italian aperitif hour without the alcohol.',
    tips: [
      'Use non-alcoholic prosecco for authentic Aperol Spritz experience',
      'The classic ratio is 3-2-1 (Aperitif-Prosecco-Soda)',
      'Serve immediately while bubbles are fresh',
    ],
  },
  {
    id: 'italian-sunset',
    name: 'Italian Sunset',
    title: 'Italian Sunset',
    subtitle: 'Low-ABV • Citrus & Herbs',
    category: 'Mocktails',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'Easy',
    time: '3 min',
    rating: 4.6,
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Lyre\'s Italian Orange', note: '2 oz' },
      { name: 'Fresh Grapefruit Juice', note: '1 oz' },
      { name: 'Honey Syrup', note: '1/2 oz' },
      { name: 'Sparkling Water', note: 'top' },
      { name: 'Grapefruit Twist', note: 'for garnish' },
    ],
    garnish: 'Grapefruit twist',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add Lyre\'s Italian Orange, grapefruit juice, and honey syrup',
      'Stir gently to combine',
      'Top with sparkling water',
      'Express grapefruit twist over the drink',
      'Garnish with the grapefruit twist',
    ],
    description: 'Refreshing Italian-style spritz.',
    tips: [
      'Fresh grapefruit juice makes all the difference',
      'Adjust honey syrup to taste based on grapefruit sweetness',
      'Express the citrus oils before garnishing',
    ],
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
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Bitter Orange Shrub or Aperitif', note: '2 oz' },
      { name: 'Soda Water', note: '3 oz' },
      { name: 'Orange Twist', note: 'for garnish' },
    ],
    garnish: 'Orange twist',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add bitter orange shrub or aperitif',
      'Top with soda water',
      'Stir gently',
      'Garnish with orange twist',
    ],
    description: 'Ready-to-drink Negroni alternative.',
    tips: [
      'Balance bitterness before service—shrubs vary',
      'Adjust soda water to taste based on shrub intensity',
      'Express orange oils over the drink before garnishing',
    ],
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
    glass: 'Copper mug',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Ginger Kombucha', note: '4 oz' },
      { name: 'Fresh Lemon Juice', note: '1/2 oz' },
      { name: 'Lemon Wheel', note: 'for garnish' },
      { name: 'Ginger Slice', note: 'for garnish' },
    ],
    garnish: 'Lemon wheel + ginger slice',
    instructions: [
      'Fill a copper mug with cubed ice',
      'Add fresh lemon juice',
      'Top with ginger kombucha',
      'Stir gently',
      'Garnish with lemon wheel and ginger slice',
    ],
    description: 'Digestive health with refreshing taste.',
    tips: [
      'Copper heightens cold + spice',
      'Alternative: Wine glass or rocks glass',
      'Don\'t over-stir to preserve kombucha probiotics',
    ],
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
    glass: 'Wine glass',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Apple Cider Shrub', note: '1 oz' },
      { name: 'Soda Water', note: '4 oz' },
      { name: 'Apple Fan', note: 'for garnish' },
      { name: 'Thyme Sprig', note: 'for garnish (alternative)' },
    ],
    garnish: 'Apple fan or thyme sprig',
    instructions: [
      'Fill a wine glass with cubed ice',
      'Add apple cider shrub',
      'Top with soda water',
      'Stir gently',
      'Garnish with apple fan or thyme sprig',
    ],
    description: 'Light and refreshing wellness drink.',
    tips: [
      'Great as a palate reset between courses',
      'Adjust shrub amount to taste—they vary in intensity',
      'Apple cider vinegar base adds digestive benefits',
    ],
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
    glass: 'Mug',
    ice: 'None',
    method: 'Heat / Steam',
    ingredients: [
      { name: 'Oat Milk', note: '6 oz' },
      { name: 'Turmeric Blend', note: '0.5 tsp' },
      { name: 'Honey', note: '1/2 oz' },
      { name: 'Cinnamon Dust', note: 'for garnish' },
    ],
    garnish: 'Cinnamon dust',
    instructions: [
      'Gently heat oat milk (do not boil)',
      'Whisk in turmeric blend and honey until fully combined',
      'Pour into a mug',
      'Garnish with cinnamon dust on top',
    ],
    description: 'Evening relaxation with stress support.',
    tips: [
      'Avoid boiling—heat kills aromatics',
      'Whisk vigorously to prevent turmeric clumps',
      'Add black pepper to enhance turmeric absorption',
    ],
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
    glass: 'Collins',
    ice: 'Cubed',
    method: 'Build',
    ingredients: [
      { name: 'Chai Concentrate', note: '2 oz' },
      { name: 'Soda Water', note: '3 oz' },
      { name: 'Cinnamon Stick', note: 'for garnish' },
    ],
    garnish: 'Cinnamon stick',
    instructions: [
      'Fill a Collins glass with cubed ice',
      'Add chai concentrate',
      'Top with soda water',
      'Stir gently',
      'Garnish with cinnamon stick',
    ],
    description: 'Sparkling chai with stress-relieving adaptogens.',
    tips: [
      'Works hot or cold depending on season',
      'For hot version, use warm chai and skip ice',
      'Quality chai concentrate makes all the difference',
    ],
  },
];

/* ------------------------- UI PIECES ------------------------- */

function MoodCard({ title, image, subtitle, onPress, index = 0 }: { title: string; image: string; subtitle?: string; onPress?: () => void; index?: number }) {
  const w = Math.min(0.78 * width, 300);
  const h = Math.round(w * 0.66);
  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
      <Pressable onPress={onPress ? withHaptic(onPress) : undefined} style={{ width: w, marginRight: spacing(1.25) }}>
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

  const resolvedImage = typeof cocktail.image === 'string' 
    ? getCocktailImage(cocktail.id, cocktail.image) 
    : cocktail.image;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ marginHorizontal: spacing(2), borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.card, marginBottom: spacing(1.5) }}>
      <Pressable onPress={withHaptic(onPress)} style={{ width: cardW, height: cardH }}>
        <Image
          source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
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
  const { savedItems, toggleSavedCocktail, isCocktailSaved, savedCocktailCount, canSaveMoreCocktails } = useSavedItems();
  const { credits, isPremium, getActionCost } = useAICredits();
  const { getPersonalizedMoodOrder, getFeaturedCocktails, scoreMoodCategory, recordInteraction, profile } = usePersonalization();
  const { recipes: userRecipes, loadRecipes } = useUserRecipes();
  const { toast, showToast, hideToast } = useToast();
  const onScrollHaptic = useScrollHaptic('selection', 800);

  // Tier-based access control
  const tier = useUserTier((state) => state.tier);
  const { gateWithTrigger: saveGate } = useFeatureAccess('saved_cocktails_unlimited');
  const { gateWithTrigger: bringToPartyGate } = useFeatureAccess('bring_to_party');
  const { gateWithTrigger: predictiveEngineGate } = useFeatureAccess('predictive_engine');
  const { gateWithTrigger: flavorControlsGate } = useFeatureAccess('adjustable_flavor_controls');
  const { gateWithTrigger: advancedFilterGate } = useFeatureAccess('advanced_filters');

  // XP System
  const {
    balance: xpBalance,
    getCocktailCost,
    canAffordCocktail,
    unlockCocktail,
    isCocktailUnlockedWithXP,
    checkDailyLogin,
    unlockedCocktails,
    unlockedVaultItems,
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
  const [currentFilters, setCurrentFilters] = useState<Partial<FilterOptions>>({
    sortOrder: 'alphabetical-asc',
  });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBasicFilterModal, setShowBasicFilterModal] = useState(false);
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);
  const [browseQuickFilter, setBrowseQuickFilter] = useState<'all' | 'variations'>('all');

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
  const VARIATION_BASE_RECIPE_ALIASES: Record<string, string[]> = {
    old_fashioned: ['old-fashioned', 'old-fashioned-classic'],
    whiskey_sour: ['whiskey-sour'],
    espresso_martini: ['espresso-martini'],
    daiquiri: ['daiquiri'],
    negroni: ['negroni'],
    manhattan: ['manhattan'],
    margarita: ['margarita', 'margarita-classic'],
  };
  const VARIATION_DETAIL_OVERRIDES: Record<string, { time: string; ingredients: string[]; instructions: string[] }> = {
    var_smoked_old_fashioned: {
      time: '6 min',
      ingredients: ['2 oz bourbon or rye whiskey', '1/4 oz rich simple syrup', '2 dashes Angostura bitters', 'Orange peel', 'Smoking wood chip (cherry or oak)'],
      instructions: ['Stir whiskey, syrup, and bitters with ice.', 'Strain over a large cube in a rocks glass.', 'Express orange peel over drink.', 'Trap smoke in glass with wood chip and cover for 10-15 seconds, then serve.'],
    },
    var_spicy_margarita: {
      time: '5 min',
      ingredients: ['2 oz blanco tequila', '3/4 oz fresh lime juice', '1/2 oz orange liqueur', '1/2 oz agave syrup', '2-3 jalapeno slices'],
      instructions: ['Lightly muddle jalapeno in shaker.', 'Add tequila, lime, orange liqueur, and agave with ice.', 'Shake hard and double strain over fresh ice.', 'Garnish with jalapeno slice or chili salt rim.'],
    },
    var_brown_butter_old_fashioned: {
      time: '8 min',
      ingredients: ['2 oz brown-butter-washed bourbon', '1/4 oz demerara syrup', '2 dashes Angostura bitters', 'Orange peel'],
      instructions: ['Combine all ingredients with ice in a mixing glass.', 'Stir until chilled and properly diluted.', 'Strain over a large cube.', 'Express orange peel and garnish.'],
    },
    var_clarified_whiskey_sour: {
      time: '12 min',
      ingredients: ['2 oz bourbon', '3/4 oz lemon juice', '1/2 oz simple syrup', '1/2 oz whole milk', 'Optional: 1 egg white (pre-clarification style)'],
      instructions: ['Build whiskey sour base and add milk for clarification.', 'Let curds form, then fine strain through coffee filter.', 'Serve over ice or up in coupe.', 'Garnish with lemon oil.'],
    },
    var_nitro_espresso_martini: {
      time: '7 min',
      ingredients: ['1 1/2 oz vodka', '1 oz fresh espresso', '3/4 oz coffee liqueur', '1/4 oz simple syrup', 'Nitro charger system'],
      instructions: ['Shake ingredients hard with ice.', 'Fine strain into nitro vessel and charge.', 'Dispense into chilled coupe.', 'Finish with espresso crema and coffee bean garnish.'],
    },
    var_oleo_saccharum_daiquiri: {
      time: '8 min',
      ingredients: ['2 oz white rum', '3/4 oz lime juice', '1/2 oz oleo saccharum syrup', '1/4 oz simple syrup (optional)'],
      instructions: ['Add all ingredients to shaker with ice.', 'Shake until cold and diluted.', 'Double strain into chilled coupe.', 'Adjust sweetness with simple if needed.'],
    },
    var_split_base_negroni: {
      time: '5 min',
      ingredients: ['3/4 oz gin', '3/4 oz mezcal or aged rum', '1 oz sweet vermouth', '1 oz Campari', 'Orange peel'],
      instructions: ['Add all liquid ingredients to mixing glass with ice.', 'Stir until chilled.', 'Strain over large cube in rocks glass.', 'Express orange peel and garnish.'],
    },
    var_aged_manhattan: {
      time: '5 min',
      ingredients: ['2 oz barrel-aged Manhattan blend', '1 dash Angostura bitters', '1 dash orange bitters', 'Brandied cherry'],
      instructions: ['Stir blend and bitters with ice.', 'Strain into chilled coupe.', 'Garnish with brandied cherry.', 'If needed, add 1/4 oz water to open aromatics.'],
    },
    var_fermented_pineapple_margarita: {
      time: '7 min',
      ingredients: ['1 1/2 oz tequila', '1/2 oz mezcal', '3/4 oz lime juice', '3/4 oz fermented pineapple syrup', 'Pinch of salt'],
      instructions: ['Shake all ingredients with ice.', 'Double strain over fresh ice.', 'Add pinch of salt to sharpen fruit.', 'Garnish with pineapple leaf or lime wheel.'],
    },
    var_winter_spiced_negroni: {
      time: '5 min',
      ingredients: ['1 oz gin', '1 oz Campari', '1 oz spiced sweet vermouth', 'Orange peel', 'Optional star anise'],
      instructions: ['Stir gin, Campari, and spiced vermouth with ice.', 'Strain over large cube.', 'Express orange peel.', 'Optional: torch star anise briefly for aroma.'],
    },
    var_summer_berry_daiquiri: {
      time: '5 min',
      ingredients: ['2 oz white rum', '3/4 oz lime juice', '1/2 oz berry syrup', '1/4 oz simple syrup', 'Fresh berries'],
      instructions: ['Shake ingredients with ice.', 'Double strain into chilled coupe.', 'Taste and adjust acid-sweet balance.', 'Garnish with fresh berry.'],
    },
  };
  const discoverVariationRecipes = useMemo(() => {
    const unlockedSet = new Set(unlockedVaultItems || []);
    return cocktailVariations
      .filter((variation) => unlockedSet.has(variation.id))
      .map((variation) => {
        const baseRecipeId = variation.baseClassicId.replace(/_/g, '-');
        const candidateIds = VARIATION_BASE_RECIPE_ALIASES[variation.baseClassicId] || [baseRecipeId];
        const baseRecipe = ALL_COCKTAILS.find((cocktail) => candidateIds.includes(cocktail.id));
        const override = VARIATION_DETAIL_OVERRIDES[variation.id];
        const difficultyLabel =
          variation.difficulty === 'technique_forward'
            ? 'Technique-Forward'
            : variation.difficulty === 'pro'
              ? 'Pro'
              : 'Simple';

        return {
          id: variation.id,
          name: variation.title,
          title: variation.title,
          subtitle: `Vault Variation • ${difficultyLabel}`,
          description: variation.shortDescription,
          image: getVaultVariationThumbnail(variation.id),
          difficulty: difficultyLabel,
          time: override?.time || baseRecipe?.time || '5 min',
          rating: baseRecipe?.rating || 4.8,
          category: 'Variations',
          tags: ['variation', ...(variation.tags || [])],
          ingredients: override?.ingredients?.length
            ? override.ingredients
            : (baseRecipe?.ingredients || []),
          instructions: override?.instructions?.length
            ? override.instructions
            : (baseRecipe?.instructions || [variation.shortDescription]),
          glassware: baseRecipe?.glassware || 'Coupe',
          sourceRecipeId: baseRecipe?.id || baseRecipeId,
          isVaultVariation: true,
          baseClassicId: baseRecipeId,
        };
      });
  }, [unlockedVaultItems, ALL_COCKTAILS]);
  const DISCOVER_COCKTAILS = useMemo(
    () => [...discoverVariationRecipes, ...ALL_COCKTAILS],
    [discoverVariationRecipes, ALL_COCKTAILS]
  );

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
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
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
    const wasSaved = isCocktailSaved(cocktail.id);

    // Soft cap: FREE can save first 5 cocktails, 6th save triggers T3 paywall.
    if (!wasSaved && !canSaveMoreCocktails) {
      saveGate('T3');
      return;
    }

    const cocktailData = {
      id: cocktail.id,
      name: cocktail.name || cocktail.title || 'Untitled Recipe',
      subtitle: cocktail.description || cocktail.subtitle || '',
      image: getCocktailImage(cocktail.id, cocktail.image),
    };
    const result = toggleSavedCocktail(cocktailData);
    if (result === 'limit_reached') {
      saveGate('T3');
      return;
    }
    showToast(wasSaved ? 'Removed from saved' : 'Saved!', 'success');
  }, [toggleSavedCocktail, isCocktailSaved, showToast, saveGate, canSaveMoreCocktails]);

  const handleAddToGroceryList = useCallback((cocktail: any) => {
    setSelectedRecipe(cocktail);
    setGroceryListVisible(true);
  }, []);

  const isRecipeVisibleInSearch = useCallback((recipe: any) => {
    return true;
  }, []);

  const getRecipeUnlockHint = useCallback((recipe: any) => {
    if (!recipe?.id) return 'Unlock to view the full recipe';

    if (recipe.isVaultVariation) {
      return 'Unlock in Vault';
    }

    const curriculumUnlock = getCurriculumUnlockForRecipeId(recipe.id);
    if (curriculumUnlock) {
      const lesson = curriculumData.lessons.find((entry) => entry.id === curriculumUnlock.lessonId);
      return lesson ? `Unlock in ${lesson.title}` : `Unlock in ${curriculumUnlock.lessonId}`;
    }

    const xpCost = getCocktailCost(recipe.id);
    if (xpCost > 0) {
      return `Unlock with ${xpCost} XP or KOOPE+`;
    }

    return 'Unlock with KOOPE+';
  }, [getCocktailCost]);

  // Get saved recipe IDs for ForYouFeed (as a Set for efficient lookup)
  const savedRecipeIds = useMemo(() => {
    const cocktails = savedItems.savedCocktails || [];
    return new Set(cocktails.map((item: any) => item.id));
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
              return DISCOVER_COCKTAILS.find(cocktail =>
                cocktail.id === item.id ||
                cocktail.name.toLowerCase() === item.title.toLowerCase()
              ) || item.data;
            })
            .filter(Boolean)
            .filter(recipe => recipe.category?.toLowerCase() !== 'syrups')
            .filter(isRecipeVisibleInSearch);

          setSearchResults(recipeResults);
        } catch (searchError) {
          log.warn('RecipesScreen', 'Search service error, using fallback', { query });
          // Fallback: Direct string matching
          const queryLower = query.toLowerCase();
          const directResults = DISCOVER_COCKTAILS.filter(cocktail => {
            const searchText = `${cocktail.name} ${cocktail.subtitle || ''} ${cocktail.description || ''} ${ingredientListToSearchText(cocktail.ingredients || [])}`.toLowerCase();
            if (!searchText.includes(queryLower)) return false;
            return isRecipeVisibleInSearch(cocktail);
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
  }, [currentFilters, DISCOVER_COCKTAILS, isRecipeVisibleInSearch]);

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
    const toFilterArray = (value?: string[] | string): string[] => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string' && value.trim()) return [value.trim()];
      return [];
    };

    if (searchQuery.trim()) {
      return searchResults;
    }

    // Apply current filters to ALL_COCKTAILS
    let recipes = [...DISCOVER_COCKTAILS];

    // Filter by ingredients/spirits
    const selectedIngredients = toFilterArray(currentFilters.ingredients);
    if (selectedIngredients.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeText = `${recipe.name} ${recipe.subtitle || ''} ${recipe.description || ''} ${ingredientListToSearchText(recipe.ingredients || [])}`.toLowerCase();
        return selectedIngredients.some(ingredient =>
          recipeText.includes(ingredient.toLowerCase())
        );
      });
    }

    // Filter by difficulty
    const selectedDifficulties = toFilterArray(currentFilters.difficulty ?? currentFilters.difficulties);
    if (selectedDifficulties.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeDifficulty = recipe.difficulty?.toLowerCase();
        return selectedDifficulties.some(diff => diff === recipeDifficulty);
      });
    }

    // Filter by category
    const selectedCategories = toFilterArray(currentFilters.category ?? currentFilters.categories);
    if (selectedCategories.length > 0) {
      recipes = recipes.filter(recipe => {
        const recipeCategory = recipe.category?.toLowerCase();
        const recipeSubtitle = recipe.subtitle?.toLowerCase() || '';
        const recipeDescription = recipe.description?.toLowerCase() || '';

        return selectedCategories.some(cat => {
          const categoryLower = cat.toLowerCase();
          if (categoryLower === 'variations') {
            return !!recipe.isVaultVariation || recipeCategory === 'variations';
          }
          // Check if category matches the recipe's category field or appears in subtitle/description
          return recipeCategory === categoryLower ||
            recipeSubtitle.includes(categoryLower) ||
            recipeDescription.includes(categoryLower);
        });
      });
    }

    if (browseQuickFilter === 'variations') {
      recipes = recipes.filter((recipe) => !!recipe.isVaultVariation || recipe.category?.toLowerCase() === 'variations');
    }

    // Filter by mood
    const selectedMoods = toFilterArray(currentFilters.mood);
    if (selectedMoods.length > 0) {
      recipes = recipes.filter(recipe => {
        // Find which moods this recipe belongs to
        const recipeMoods = COCKTAIL_MOODS.filter(moodCategory =>
          moodCategory.cocktails.includes(recipe.id)
        ).map(m => m.title);

        // Check if recipe belongs to any of the selected moods
        return selectedMoods.some(selectedMood =>
          recipeMoods.includes(selectedMood)
        );
      });
    }

    // Filter by unlocked status (only applies for FREE tier)
    if (showOnlyUnlocked && tier === 'FREE') {
      recipes = recipes.filter(recipe => {
        const isUnlockedVariation = unlockedVaultItems?.includes(recipe.id);
        if (isUnlockedVariation) return true;
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

  const renderRecipeItem: ListRenderItem<any> = ({ item, index }) => {
    // Check if this cocktail is accessible for current tier, unlocked with XP, or unlocked with engagement
    const isTierAccessible = isCocktailAccessible(item.id, tier);
    const isXPUnlocked = isCocktailUnlockedWithXP(item.id);
    const isEngagementUnlocked = isRecipeUnlockedWithEngagement(item.id);
    const isUnlockedVariation = unlockedVaultItems?.includes(item.id);
    const isAccessible = isUnlockedVariation || isTierAccessible || isXPUnlocked || isEngagementUnlocked;

    // If locked, show LockedRecipeCard with unlock context
    if (!isAccessible) {
      const xpCost = getCocktailCost(item.id);
      const canAfford = canAffordCocktail(item.id);

      const handleUpgradePress = () => {
        // Show unlock sheet with XP and subscription options
        setSelectedCocktailForUnlock(item);
        setUnlockSheetVisible(true);
      };

      return (
        <Animated.View entering={FadeInDown.delay((index || 0) * 80).duration(500)}>
          <LockedRecipeCard
            image={typeof item.image === 'string' ? { uri: item.image } : item.image}
            onPress={handleUpgradePress}
            style={{ width: (width - spacing(2) * 2 - GUTTER) / 2, marginBottom: spacing(2) }}
            xpCost={tier === 'FREE' ? xpCost : undefined} // Only show XP for FREE tier
            canAfford={canAfford}
            title={searchQuery.trim() ? (item.name || item.title) : undefined}
            subtitle={searchQuery.trim() ? getRecipeUnlockHint(item) : undefined}
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
    if (item.isVaultVariation) {
      cardProps.onPress = () => {
        navigation.navigate('CocktailDetail', { cocktailId: item.id, cocktail: item } as any);
      };
    }

    return (
      <Animated.View entering={FadeInDown.delay((index || 0) * 80).duration(500)}>
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
    const toFilterArray = (value?: string[] | string): string[] => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string' && value.trim()) return [value.trim()];
      return [];
    };
    const hasFilters = toFilterArray(currentFilters.ingredients).length > 0 ||
      toFilterArray(currentFilters.difficulty ?? currentFilters.difficulties).length > 0 ||
      toFilterArray(currentFilters.category ?? currentFilters.categories).length > 0 ||
      toFilterArray(currentFilters.mood).length > 0;

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
              mood: [],
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <MainPageHeader
        title="Discover"
        subtitle="Cocktails & recipes"
        rightActions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('AddRecipe'),
            accessibilityLabel: 'Add new recipe',
          },
        ]}
      />
      <FlatList
        data={viewMode === 'browse' ? (getCurrentRecipes() || []) : []}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollHaptic}
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
                  onPress={withHaptic(() => setViewMode('browse'), 'selection')}
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
                  onPress={withHaptic(() => predictiveEngineGate('T9', () => setViewMode('personalized')), 'selection')}
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

            {/* Simplified Search/Filter Row - Hidden by default, accessible via header icons */}

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
                        onPress={withHaptic(() => navigation.navigate('CocktailDetail', { cocktailId: COCKTAIL_OF_THE_WEEK.id }))}
                      />
                    </View>

                    {/* Shots */}
                    <SectionHeader
                      title="Shots"
                      onPress={() => {
                        // Ensure we only pass string IDs
                        const shotIds = ALL_SHOTS.map(shot => shot.id).filter(id => typeof id === 'string');
                        bringToPartyGate('T8', () => {
                          navigation.navigate('CocktailList', {
                            title: 'Shots',
                            cocktailIds: shotIds,
                            category: 'shots'
                          });
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
                          <Animated.View key={shot.id} entering={FadeInRight.delay(index * 100).duration(500)}>
                            <RecipeCard {...cardProps} style={{ width: 240, marginRight: 16 }} />
                          </Animated.View>
                        );
                      })}
                    </ScrollView>

                    {/* Mocktails */}
                    <SectionHeader
                      title="Mocktails"
                      onPress={() => {
                        // Pass the actual mocktail recipes
                        navigation.navigate('CocktailList', {
                          title: 'Mocktails',
                          cocktailIds: sampleRecipes.map(recipe => recipe.id),
                          category: 'mocktails'
                        });
                      }}
                    />

                    {/* Mocktails Horizontal Scroll Preview */}
                    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
                      {sampleRecipes.slice(0, 6).map((mocktail, index) => {
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
                          <Animated.View key={mocktail.id} entering={FadeInRight.delay(index * 100).duration(500)}>
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
                            entering={FadeInRight.delay(index * 100).duration(500)}
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
                      onPress={() => navigation.navigate('ProfileSavedItems' as any)}
                    />
                    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing(2), marginBottom: spacing(2) }}>
                      {userRecipes.length > 0 ? (
                        userRecipes.slice(0, 5).map((recipe, index) => {
                          const firstAmount = recipe.ingredients?.[0]?.amount?.trim?.() || '';
                          const amountLabel = firstAmount
                            ? /\b(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts)\b/i.test(firstAmount)
                              ? firstAmount
                              : `${firstAmount} oz`
                            : '';
                          // Convert UserRecipe to cocktail format for createRecipeCardProps
                          const cocktailData = {
                            id: recipe.id,
                            name: recipe.name,
                            subtitle: amountLabel
                              ? `${amountLabel} • ${recipe.type === 'ai_generated' ? 'AI Generated' : recipe.type === 'modified' ? 'Modified Recipe' : 'My Creation'}`
                              : recipe.type === 'ai_generated' ? 'AI Generated' : recipe.type === 'modified' ? 'Modified Recipe' : 'My Creation',
                            description: recipe.description || 'Custom recipe',
                            image: recipe.thumbnailImage || recipe.headerImage || recipe.image || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop',
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

                          // Keep user-created recipes on the unified CocktailDetail template
                          cardProps.onPress = () => {
                            navigation.navigate('CocktailDetail', { cocktailId: recipe.id, cocktail: recipe } as any);
                          };

                          return (
                            <Animated.View key={recipe.id} entering={FadeInRight.delay(index * 100).duration(500)}>
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
                          onPress={withHaptic(() => navigation.navigate('AddRecipe'))}
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
                onRefineProfile={() => flavorControlsGate('T12', () => navigation.navigate('RefineYourTaste'))}
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
                      onPress={withHaptic(() => setShowSearchInput(true), 'selection')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.bg,
                        paddingHorizontal: spacing(2),
                        paddingVertical: spacing(1),
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: colors.line
                      }}
                    >
                      <Ionicons name="search" size={16} color={colors.accent} style={{ marginRight: spacing(0.5) }} />
                      <Text style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600'
                      }}>
                        Search
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={withHaptic(() => setShowBasicFilterModal(true), 'selection')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.bg,
                        paddingHorizontal: spacing(2),
                        paddingVertical: spacing(1),
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: colors.line
                      }}
                    >
                      <Ionicons name="filter" size={16} color={colors.accent} style={{ marginRight: spacing(0.5) }} />
                      <Text style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600'
                      }}>
                        Basic Filter
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={withHaptic(() => advancedFilterGate('T2', () => setShowAdvancedFilterModal(true)), 'selection')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.bg,
                        paddingHorizontal: spacing(2),
                        paddingVertical: spacing(1),
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: colors.line
                      }}
                    >
                      <Ionicons
                        name={tier === 'FREE' ? 'lock-closed' : 'options'}
                        size={16}
                        color={colors.accent}
                        style={{ marginRight: spacing(0.5) }}
                      />
                      <Text style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '600'
                      }}>
                        Advanced
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={withHaptic(() => setBrowseQuickFilter(prev => prev === 'variations' ? 'all' : 'variations'), 'selection')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: browseQuickFilter === 'variations' ? colors.gold : colors.bg,
                        paddingHorizontal: spacing(2),
                        paddingVertical: spacing(1),
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: browseQuickFilter === 'variations' ? colors.gold : colors.line
                      }}
                    >
                      <Ionicons
                        name={browseQuickFilter === 'variations' ? 'sparkles' : 'sparkles-outline'}
                        size={16}
                        color={browseQuickFilter === 'variations' ? colors.bg : colors.accent}
                        style={{ marginRight: spacing(0.5) }}
                      />
                      <Text style={{
                        color: browseQuickFilter === 'variations' ? colors.bg : colors.text,
                        fontSize: 14,
                        fontWeight: '600'
                      }}>
                        Variation{discoverVariationRecipes.length > 0 ? ` (${discoverVariationRecipes.length})` : ''}
                      </Text>
                    </Pressable>

                    {tier === 'FREE' && (
                      <Pressable
                        onPress={withHaptic(() => setShowOnlyUnlocked(!showOnlyUnlocked), 'selection')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: showOnlyUnlocked ? colors.accent : colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: showOnlyUnlocked ? colors.accent : colors.line
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
                          fontWeight: '600'
                        }}>
                          Unlocked
                        </Text>
                      </Pressable>
                    )}

                    {tier === 'FREE' && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.bg,
                          paddingHorizontal: spacing(2),
                          paddingVertical: spacing(1),
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.line
                        }}
                      >
                        <Ionicons
                          name="bookmark-outline"
                          size={16}
                          color={colors.accent}
                          style={{ marginRight: spacing(0.5) }}
                        />
                        <Text style={{
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: '600'
                        }}>
                          Saves {savedCocktailCount}/{FREE_RECIPE_LIMIT}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Advanced Filter Modal */}
            <Modal visible={showAdvancedFilterModal} transparent animationType="fade">
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
                    }}>Advanced Filters</Text>
                    <Pressable onPress={() => setShowAdvancedFilterModal(false)}>
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
                          {['All', 'Variations', 'Bitter', 'Classic', 'Coffee', 'Creamy', 'Fizzy', 'Fruity', 'Herbal', 'Italian', 'Minty', 'Mocktails', 'Modern', 'Refreshing', 'Shots', 'Sour', 'Spicy', 'Sweet', 'Tiki', 'Tropical'].map((category) => {
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

                    {/* Moods */}
                    <View style={{ marginBottom: spacing(3) }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: spacing(2)
                      }}>Your Moods</Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: -spacing(2) }}
                        contentContainerStyle={{ paddingHorizontal: spacing(2) }}
                      >
                        <View style={{
                          flexDirection: 'row',
                          gap: spacing(1)
                        }}>
                          {['All', 'Bold & Serious', 'Romantic & Elegant', 'Fun & Playful', 'Adventurous & Exotic', 'Chill & Refreshing', 'Cozy & Warm'].map((mood) => {
                            const isSelected = currentFilters.mood?.includes(mood) || (mood === 'All' && !currentFilters.mood?.length);
                            return (
                              <Pressable
                                key={mood}
                                onPress={() => {
                                  if (mood === 'All') {
                                    setCurrentFilters({ ...currentFilters, mood: [] });
                                  } else {
                                    const moods = currentFilters.mood || [];
                                    const newMoods = moods.includes(mood)
                                      ? moods.filter(m => m !== mood)
                                      : [mood];
                                    setCurrentFilters({ ...currentFilters, mood: newMoods });
                                  }
                                }}
                                style={{
                                  backgroundColor: isSelected ? colors.gold : colors.card,
                                  paddingHorizontal: spacing(2),
                                  paddingVertical: spacing(1.5),
                                  borderRadius: radii.md,
                                  borderWidth: 1,
                                  borderColor: isSelected ? colors.gold : colors.border
                                }}
                              >
                                <Text style={{
                                  color: isSelected ? colors.goldText : colors.text,
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '400'
                                }}>
                                  {mood}
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
                                  sortOrder: isSelected ? undefined : (sortOption.value as FilterOptions['sortOrder'])
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
                      onPress={() => setCurrentFilters({ sortOrder: 'alphabetical-asc' })}
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
                    onPress={() => setShowAdvancedFilterModal(false)}
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
        visible={showBasicFilterModal}
        onClose={() => setShowBasicFilterModal(false)}
        filters={currentFilters}
        onApplyFilters={(filters) => {
          setCurrentFilters((prev) => ({ ...prev, ...filters }));
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
          top: 86,
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
        unlockHint={selectedCocktailForUnlock ? getRecipeUnlockHint(selectedCocktailForUnlock) : undefined}
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

    </SafeAreaView>
  );
}
