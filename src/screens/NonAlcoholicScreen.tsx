/**
 * NON-ALCOHOLIC SCREEN
 * Zero Proof, Full Flavor - Premium non-alcoholic beverage discovery
 */

import React, { useLayoutEffect, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii } from '../theme/tokens';
import PillButton from '../components/PillButton';
import { useSavedItems } from '../hooks/useSavedItems';
import InPageTabBar from '../components/ui/InPageTabBar';

const { width } = Dimensions.get('window');

interface NonAlcoholicBeverage {
  id: string;
  name: string;
  category: string;
  region: string;
  tier: 'gold' | 'silver' | 'bronze';
  image: string;
  tagline: string;
  description: string;
  abv: string;
  flavorNotes: string[];
  useCase: string;
  buyLink?: string;
  recipes: Recipe[];
}

interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string;
  glassware: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time: string;
}

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  type: 'brand' | 'recipe' | 'seasonal';
  ctaText: string;
}

const heroBanners: HeroBanner[] = [
  {
    id: 'seedlip-hero',
    title: 'Seedlip Garden 108',
    subtitle: 'Sophisticated botanical complexity in every sip',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop',
    type: 'brand',
    ctaText: 'Explore Collection'
  },
  {
    id: 'summer-mocktails',
    title: 'Summer Refresh Collection',
    subtitle: 'Beat the heat with premium zero-proof cocktails',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=1200&auto=format&fit=crop',
    type: 'seasonal',
    ctaText: 'View Recipes'
  },
  {
    id: 'lyre-s-hero',
    title: "Lyre's American Malt",
    subtitle: 'Whiskey complexity without the alcohol',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    type: 'brand',
    ctaText: 'Shop Now'
  }
];

const nonAlcoholicBeverages: NonAlcoholicBeverage[] = [
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
  },
];

export default function NonAlcoholicScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const { toggleSavedDrink, isDrinkSaved } = useSavedItems();

  // Auto-rotate hero banners
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => 
        prevIndex === heroBanners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Non-Alcoholic',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return colors.gold;
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return colors.subtext;
    }
  };

  const getFilteredBeverages = (): NonAlcoholicBeverage[] => {
    if (selectedCategory === 'all') return nonAlcoholicBeverages;
    if (selectedCategory === 'spirits') {
      return nonAlcoholicBeverages.filter(beverage => beverage.category === 'Zero-Proof Spirits');
    }
    if (selectedCategory === 'low-abv') {
      return nonAlcoholicBeverages.filter(beverage => beverage.category === 'Low-ABV Options');
    }
    if (selectedCategory === 'wellness') {
      return nonAlcoholicBeverages.filter(beverage => beverage.category === 'Wellness Drinks');
    }
    return nonAlcoholicBeverages;
  };

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'spirits', label: 'Zero-Proof Spirits' },
    { key: 'low-abv', label: 'Low-ABV Options' },
    { key: 'wellness', label: 'Wellness Drinks' },
  ];

  // Get recipes organized by category for the "all" view
  const getRecipesByCategory = () => {
    const categories = [
      { key: 'spirits', label: 'Zero-Proof Spirits', beverages: nonAlcoholicBeverages.filter(b => b.category === 'Zero-Proof Spirits') },
      { key: 'low-abv', label: 'Low-ABV Options', beverages: nonAlcoholicBeverages.filter(b => b.category === 'Low-ABV Options') },
      { key: 'wellness', label: 'Wellness Drinks', beverages: nonAlcoholicBeverages.filter(b => b.category === 'Wellness Drinks') }
    ];
    
    return categories.map(category => ({
      ...category,
      recipes: category.beverages.flatMap(beverage => 
        beverage.recipes.map(recipe => ({
          id: `${beverage.id}-${recipe.name}`,
          title: recipe.name,
          subtitle: `${beverage.name}`,
          img: beverage.image,
          difficulty: recipe.difficulty,
          time: recipe.time,
          recipe,
          beverage
        }))
      )
    }));
  };

  // Create individual recipe cards for specific category filter
  const getCategoryRecipeCards = () => {
    const filteredBeverages = getFilteredBeverages();
    const recipeCards = [];
    
    for (const beverage of filteredBeverages) {
      for (const recipe of beverage.recipes) {
        recipeCards.push({
          id: `${beverage.id}-${recipe.name}`,
          title: recipe.name,
          subtitle: `${beverage.name}`,
          img: beverage.image,
          difficulty: recipe.difficulty,
          time: recipe.time,
          recipe,
          beverage
        });
      }
    }
    return recipeCards;
  };

  const renderHeroSection = () => {
    const currentBanner = heroBanners[currentBannerIndex];
    
    return (
      <View style={styles.heroSection}>
        {/* Main Hero */}
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Zero Proof, Full Flavor</Text>
          <Text style={styles.heroSubtitle}>
            Sophisticated non-alcoholic spirits and wellness drinks that don't compromise on taste or experience
          </Text>
        </View>
        
        {/* Rotating Banner */}
        <View style={styles.heroBannerContainer}>
          <TouchableOpacity style={styles.heroBanner} activeOpacity={0.9}>
            <Image source={{ uri: currentBanner.image }} style={styles.heroBannerImage} />
            <View style={styles.heroBannerOverlay}>
              <View style={styles.heroBannerContent}>
                <View style={styles.bannerTypeIndicator}>
                  <Text style={styles.bannerTypeText}>
                    {currentBanner.type === 'brand' ? 'FEATURED BRAND' : 
                     currentBanner.type === 'seasonal' ? 'SEASONAL' : 'FEATURED RECIPE'}
                  </Text>
                </View>
                <Text style={styles.heroBannerTitle}>{currentBanner.title}</Text>
                <Text style={styles.heroBannerSubtitle}>{currentBanner.subtitle}</Text>
                
                <TouchableOpacity style={styles.heroBannerCTA}>
                  <Text style={styles.heroBannerCTAText}>{currentBanner.ctaText}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Banner Indicators */}
          <View style={styles.bannerIndicators}>
            {heroBanners.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.bannerIndicator,
                  index === currentBannerIndex && styles.activeBannerIndicator
                ]}
                onPress={() => setCurrentBannerIndex(index)}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Memoize the category tabs to prevent re-render when banner changes
  const categoryTabs = useMemo(() => (
    <View style={styles.tabsContainer}>
      <InPageTabBar
        items={categories}
        activeKey={selectedCategory}
        onChange={setSelectedCategory}
        scrollable
      />
    </View>
  ), [selectedCategory]);

  const renderHeader = () => (
    <View>
      {/* Hero Section */}
      {renderHeroSection()}

      {/* Category Tabs */}
      {categoryTabs}
    </View>
  );

  const renderRecipeCard = (recipe: any, isGrid: boolean = false) => (
    <TouchableOpacity 
      key={recipe.id} 
      style={isGrid ? styles.cocktailCardGrid : styles.cocktailCard} 
      onPress={() => nav.navigate('CocktailDetail', { cocktailId: recipe.id })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: recipe.img }} style={isGrid ? styles.cocktailImageGrid : styles.cocktailImage}/>
      <View style={isGrid ? styles.cocktailInfoGrid : styles.cocktailInfo}>
        <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">{recipe.title}</Text>
        <Text style={styles.cardSub}>{recipe.subtitle}</Text>
        <View style={styles.cocktailMeta}>
          <Text style={styles.cocktailDifficulty}>{recipe.difficulty}</Text>
          <Text style={styles.cocktailTime}>{recipe.time}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.saveButton} 
        activeOpacity={0.7}
        onPress={(e) => {
          e.stopPropagation();
          toggleSavedDrink({
            id: recipe.id,
            name: recipe.title,
            subtitle: `${recipe.beverage.name} recipe`,
            image: recipe.img,
            type: 'recipe'
          });
        }}
      >
        <Ionicons 
          name={isDrinkSaved(recipe.id) ? "bookmark" : "bookmark-outline"} 
          size={20} 
          color={isDrinkSaved(recipe.id) ? colors.accent : colors.text} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFeaturedBrand = () => (
    <View style={styles.featuredBrandSection}>
      <View style={styles.featuredBrandCard}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop' }} 
          style={styles.featuredBrandImage} 
        />
        <View style={styles.featuredBrandOverlay}>
          <View style={styles.featuredBrandContent}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>FEATURED BRAND</Text>
            </View>
            <Text style={styles.featuredBrandTitle}>Starbucks</Text>
            <Text style={styles.featuredBrandSubtitle}>Non-Alcoholic Espresso Martini Month</Text>
            <Text style={styles.featuredBrandDescription}>
              Discover premium coffee cocktails crafted with Starbucks signature blends. Zero alcohol, full flavor.
            </Text>
            
            <TouchableOpacity style={styles.featuredBrandCTA}>
              <Text style={styles.featuredBrandCTAText}>Explore Collection</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (selectedCategory === 'all') {
      // Show all categories with sections
      const recipesByCategory = getRecipesByCategory();
      return (
        <>
          {/* Featured Brand Section */}
          {renderFeaturedBrand()}
          
          {/* Recipe Categories */}
          {recipesByCategory.map(categorySection => (
            categorySection.recipes.length > 0 && (
              <View key={categorySection.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{categorySection.label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipesHorizontalContainer}>
                  {categorySection.recipes.map(renderRecipeCard)}
                </ScrollView>
              </View>
            )
          ))}
        </>
      );
    } else {
      // Show specific category with stacked/grid layout
      const categoryRecipes = getCategoryRecipeCards();
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {categories.find(c => c.key === selectedCategory)?.label || 'Recipes'}
          </Text>
          <View style={styles.recipesGridContainer}>
            {categoryRecipes.map(recipe => renderRecipeCard(recipe, true))}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.listContent}>
        {/* Navigation Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipsContainer} 
          contentContainerStyle={styles.chipsRow}
        >
          {[
            { key: 'Home', label: 'Home' },
            { key: 'Spirits', label: 'Spirits' },
            { key: 'NonAlcoholic', label: 'Non-Alcoholic' },
            { key: 'Bars', label: 'Bars' },
            { key: 'Events', label: 'Events' },
            { key: 'Games', label: 'Games' },
            { key: 'Vault', label: 'Vault' },
          ].map(chip => {
            const isActive = chip.key === 'NonAlcoholic';
            return (
              <PillButton
                key={chip.key}
                title={chip.label}
                onPress={() => {
                  if (chip.key === 'Home') nav.navigate('Main', { screen: 'Featured' });
                  else if (chip.key === 'Spirits') nav.navigate('Recipes');
                  else if (chip.key === 'Bars') nav.navigate('HomeBar');
                  else if (chip.key === 'Events') nav.navigate('Events');
                  else if (chip.key === 'Games') nav.navigate('Games');
                  else if (chip.key === 'Vault') nav.navigate('Vault');
                }}
                style={!isActive ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line } : undefined}
                textStyle={!isActive ? { color: colors.text } : undefined}
              />
            );
          })}
        </ScrollView>

        {/* Hero Section */}
        {renderHeroSection()}

        {/* Category Tabs */}
        {categoryTabs}

        {/* Recipe Content */}
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  mainScroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing(4),
  },
  
  section: {
    paddingHorizontal: spacing(2),
    marginTop: spacing(2),
  },
  
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing(1),
  },
  
  recipesHorizontalContainer: {
    gap: spacing(2),
    paddingHorizontal: spacing(2),
  },
  
  recipesGridContainer: {
    gap: spacing(1.5),
    marginHorizontal: 0, // Remove extra margins - let section padding handle it
  },
  
  // Cocktail Cards (matching Featured Cocktails exactly)
  cocktailCard: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing(2),
  },
  
  // Grid layout cocktail cards (matching Starbucks slide width)
  cocktailCardGrid: {
    width: '100%', // Fill container width (which has spacing(2) margins)
    backgroundColor: colors.card,
    borderRadius: radii.lg, // Restore border radius to match Starbucks slide
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing(1.5),
    height: 320, // Fixed height instead of minHeight to prevent stretching
  },
  
  cocktailImage: {
    width: '100%',
    height: 160,
  },
  
  // Double-size image for grid cards
  cocktailImageGrid: {
    width: '100%',
    height: 240, // 1.5x larger for better proportions
  },
  
  cocktailInfo: {
    padding: spacing(2),
  },
  
  // Double-size info section for grid cards
  cocktailInfoGrid: {
    padding: spacing(3), // More padding for larger cards
  },
  
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: spacing(0.25),
  },
  
  cardSub: {
    color: colors.subtext,
    fontSize: 13,
    marginBottom: spacing(1),
  },
  
  cocktailMeta: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  
  cocktailDifficulty: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  
  cocktailTime: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },
  
  saveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero Section
  heroSection: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  
  heroContent: {
    padding: spacing(2),
    alignItems: 'center',
  },
  
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
    letterSpacing: -0.5,
  },
  
  heroSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: width * 0.8,
  },
  
  // Hero Banner
  heroBannerContainer: {
    padding: spacing(2),
    paddingTop: spacing(1.5),
  },
  
  heroBanner: {
    height: 200,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing(1.5),
  },
  
  heroBannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  
  heroBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  
  heroBannerContent: {
    padding: spacing(2),
  },
  
  bannerTypeIndicator: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    alignSelf: 'flex-start',
    marginBottom: spacing(1),
  },
  
  bannerTypeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  
  heroBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.white,
    marginBottom: spacing(0.5),
  },
  
  heroBannerSubtitle: {
    fontSize: 13,
    color: colors.white,
    marginBottom: spacing(2),
    opacity: 0.9,
  },
  
  heroBannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(1),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  heroBannerCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(1),
  },
  
  bannerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  
  activeBannerIndicator: {
    backgroundColor: colors.accent,
  },
  
  // Navigation Chips (matching FeaturedScreen)
  chipsContainer: {
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    gap: spacing(1),
  },

  // Tabs
  tabsScrollView: {
    backgroundColor: colors.bg,
  },
  
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(1),
  },
  
  // Beverage Card
  beverageCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing(2),
    marginBottom: spacing(1.5),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  
  beverageImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bg,
  },
  
  tierBadge: {
    position: 'absolute',
    top: spacing(1),
    left: spacing(1),
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  
  tierText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  
  saveButton: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Featured Brand Section
  featuredBrandSection: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(3),
  },
  
  featuredBrandCard: {
    height: 200,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  
  featuredBrandImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  
  featuredBrandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  
  featuredBrandContent: {
    padding: spacing(2),
  },
  
  brandBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    alignSelf: 'flex-start',
    marginBottom: spacing(1),
  },
  
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  
  featuredBrandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.white,
    marginBottom: spacing(0.5),
  },
  
  featuredBrandSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing(1.5),
    opacity: 0.9,
  },
  
  featuredBrandDescription: {
    fontSize: 13,
    color: colors.white,
    lineHeight: 18,
    marginBottom: spacing(2),
    opacity: 0.85,
  },
  
  featuredBrandCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(1),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  featuredBrandCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});
