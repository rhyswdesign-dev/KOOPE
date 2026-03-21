/**
 * Bottle Detail Screen
 * Shows detailed information about a scanned spirit bottle
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getPriceTierDisplay } from '../data/spiritsDatabase';
import { useXPSystem } from '../store/useXPSystem';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import { InventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { RecipeMatch } from '../utils/recipeMatching';
import { RecipesRepository } from '../repos/supabase';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible, TIER_LIMITS } from '../config/tierAccess';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import type { UserInventoryItem } from '../types/database';
import { BottleServeService } from '../services/bottleServeService';
import { useEngagement } from '../store/useEngagement';
import { getCocktailImage } from '../../assets/images/cocktails';
import RecipeCard from '../components/RecipeCard';

type BottleDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CameraStackParamList, 'BottleDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SPIRIT_ALIAS_MAP: Record<string, string> = {
  whisky: 'whiskey',
  bourbon: 'whiskey',
  scotch: 'whiskey',
  rye: 'whiskey',
  cognac: 'brandy',
};

function normalizeSpiritToken(value: string | undefined | null): string {
  const token = (value || '').toLowerCase().trim();
  if (!token) return '';
  return SPIRIT_ALIAS_MAP[token] || token;
}

function getRespectThisBottleScore(
  recipe: any,
  spiritName: string,
  bottle: any,
  serveRecommendation: ReturnType<typeof BottleServeService.getRecommendation>
): number {
  const tags = Array.isArray(recipe.tags) ? recipe.tags.map((tag: string) => String(tag).toLowerCase()) : [];
  const category = String(recipe.category || '').toLowerCase();
  const name = String(recipe.name || '').toLowerCase();
  const description = String(recipe.description || '').toLowerCase();
  const difficulty = String(recipe.difficulty || '').toLowerCase();
  const ingredientsCount = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.length
    : typeof recipe.ingredients === 'string'
      ? recipe.ingredients.split(/[,|]/).filter(Boolean).length
      : 0;

  let score = 0;

  if (tags.includes('classic')) score += 10;
  if (tags.includes('stirred')) score += 12;
  if (tags.includes('spirit-forward')) score += 18;
  if (tags.includes('smoky') && serveRecommendation.spiritFamily === 'scotch') score += 10;
  if (tags.includes('agave') && serveRecommendation.spiritFamily === 'tequila') score += 10;
  if (['old fashioned', 'manhattan', 'sazerac'].some((needle) => name.includes(needle))) score += 18;
  if (['boozy', 'spirit-forward', 'minimal dilution'].some((needle) => description.includes(needle))) score += 10;
  if (category.includes('old fashioned') || category.includes('martini')) score += 8;
  if (difficulty === 'easy') score += 4;
  if (ingredientsCount > 0 && ingredientsCount <= 4) score += 10;
  if (ingredientsCount >= 7) score -= 15;
  if (tags.includes('tiki')) score -= 25;
  if (tags.includes('tropical')) score -= 20;
  if (tags.includes('creamy')) score -= 18;
  if (tags.includes('frozen')) score -= 25;
  if (tags.includes('brunch')) score -= 10;
  if (tags.includes('dessert')) score -= 12;
  if (tags.includes('equal-parts')) score -= 8;
  if (tags.includes('sour')) score -= 6;
  if (tags.includes('highball')) score -= 4;

  if (spiritName === 'whiskey' && tags.includes('whiskey')) score += 6;
  if (spiritName === 'tequila' && tags.includes('tequila')) score += 6;
  if (spiritName === 'mezcal' && tags.includes('mezcal')) score += 8;
  if (spiritName === 'brandy' && (tags.includes('cognac') || tags.includes('brandy'))) score += 8;
  if (String(bottle.name || '').toLowerCase().includes('scotch') && tags.includes('scotch')) score += 10;

  return score;
}

export default function BottleDetailScreen() {
  const navigation = useNavigation<BottleDetailScreenNavigationProp>();
  const route = useRoute<RouteProp<CameraStackParamList, 'BottleDetail'>>();
  const insets = useSafeAreaInsets();
  const { earnScanXP, isCocktailUnlockedWithXP } = useXPSystem();
  const { isRecipeUnlocked: isRecipeUnlockedWithEngagement } = useEngagement();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const { gateWithTrigger: inventoryGate } = useFeatureAccess('inventory_unlimited');
  const { hasAccess: hasPremiumServeEducation } = useFeatureAccess('premium_serve_education');
  const { hasAccess: hasPremiumServePersonalization } = useFeatureAccess('premium_serve_personalization');
  const { bottle, imageUri } = route.params;
  const [userCurrency, setUserCurrency] = useState<'USD' | 'CAD' | 'GBP'>('USD');
  const [userRegion, setUserRegion] = useState<string>('');
  const [suggestedCocktails, setSuggestedCocktails] = useState<Array<any & { match: RecipeMatch }>>([]);
  const [loadingCocktails, setLoadingCocktails] = useState(true);
  const serveRecommendation = useMemo(
    () => BottleServeService.getRecommendation(bottle, tier),
    [bottle, tier]
  );

  useEffect(() => {
    // Detect user's currency based on locale
    const locale = Localization.getLocales()[0];
    const region = locale.regionCode || '';
    setUserRegion(region);

    // Map region to currency
    if (region === 'CA') {
      setUserCurrency('CAD');
    } else if (region === 'GB' || region === 'UK') {
      setUserCurrency('GBP');
    } else {
      setUserCurrency('USD'); // Default to USD
    }
  }, []);

  useEffect(() => {
    // Show recipes relevant to the scanned bottle from the user's currently
    // accessible pool. Free sees up to 3 suggestions; paid tiers see more.
    const fetchCocktails = async () => {
      setLoadingCocktails(true);
      try {
        // 1. Fetch user's inventory
        const userInventory = user ? await InventoryService.getUserInventory(user.id) : [];

        // 1.5. Create combined inventory including the scanned bottle
        // This allows match calculation to consider cocktails you can make WITH this bottle
        const combinedInventory: UserInventoryItem[] = [
          ...userInventory,
          {
            id: 'temp-scanned-bottle',
            user_id: user?.id || '',
            item_name: bottle.name,
            item_type: 'spirit' as const,
            category: bottle.type || null,
            image_url: null,
            added_at: new Date().toISOString(),
            scanned_at: new Date().toISOString(),
            user_searched_nearby: false,
            last_used_at: null,
          },
        ];

        // 2. Load full recipes so ingredient-based match scoring is accurate.
        // Using initial/lite recipes can produce empty-ingredient ties and poor ranking.
        const recipesData = await RecipesRepository.getAllRecipes(0, 300);

        // 3. Resolve scanned spirit (canonical token)
        let spiritName = normalizeSpiritToken((bottle as any).type || (bottle as any).category);

        // Fallback: Extract spirit type from bottle name if category is missing
        if (!spiritName && bottle.name) {
          const bottleName = bottle.name.toLowerCase();
          const spiritTypes = ['vodka', 'gin', 'rum', 'tequila', 'whiskey', 'whisky', 'bourbon', 'scotch', 'brandy', 'cognac', 'mezcal', 'rye'];

          for (const spirit of spiritTypes) {
            if (bottleName.includes(spirit)) {
              spiritName = normalizeSpiritToken(spirit);
              console.log(`BottleDetailScreen: Extracted spirit "${spiritName}" from bottle name "${bottle.name}"`);
              break;
            }
          }
        }

        // If no spirit category detected, show no suggestions
        if (!spiritName) {
          console.log('BottleDetailScreen: No spirit name detected from category or name');
          setSuggestedCocktails([]);
          setLoadingCocktails(false);
          return;
        }

        console.log('BottleDetailScreen: Filtering cocktails for spirit:', spiritName);
        console.log('BottleDetailScreen: Total recipes to check:', recipesData.length);
        if (recipesData.length > 0) {
          console.log('Sample recipe structure:', {
            name: recipesData[0].name,
            baseSpirit: recipesData[0].baseSpirit,
            category: recipesData[0].category,
            tags: recipesData[0].tags
          });
        }

        let matchedData = recipesData.filter((recipe) => {
          const baseSpirit = normalizeSpiritToken(recipe.baseSpirit);
          const spiritsUsed = (recipe.spiritsUsed || []).map((s) => normalizeSpiritToken(s));

          if (baseSpirit === spiritName) return true;
          if (spiritsUsed.includes(spiritName)) return true;

          // Fallback only for legacy/incomplete rows where spirit fields are empty
          if (!baseSpirit && spiritsUsed.length === 0) {
            const tags = Array.isArray(recipe.tags)
              ? recipe.tags.map((t) => normalizeSpiritToken(t))
              : [];
            const category = normalizeSpiritToken(recipe.category);
            return tags.includes(spiritName) || category === spiritName;
          }

          return false;
        });

        console.log(`BottleDetailScreen: Found ${matchedData.length} recipes matching "${spiritName}"`);
        if (matchedData.length > 0 && matchedData.length <= 3) {
          console.log('Sample matched recipes:', matchedData.slice(0, 3).map(r => ({ name: r.name, baseSpirit: r.baseSpirit })));
        }

        // 3.5. Filter by the user's accessible recipe pool.
        if (tier === 'FREE') {
          matchedData = matchedData.filter(recipe =>
            isCocktailAccessible(recipe.id, tier) ||
            isCocktailUnlockedWithXP(recipe.id) ||
            isRecipeUnlockedWithEngagement(recipe.id)
          );
        }

        // 4. Sort by match percentage, then favor "respectful" cocktails for serve-first bottles
        const cocktailsWithMatch = sortByMatch(matchedData as any[], combinedInventory);
        const rankedMatches = [...cocktailsWithMatch].sort((a, b) => {
          if (serveRecommendation.cocktailPlacement !== 'secondary') {
            return b.match.matchPercentage - a.match.matchPercentage;
          }

          const aRespect = getRespectThisBottleScore(a, spiritName, bottle, serveRecommendation);
          const bRespect = getRespectThisBottleScore(b, spiritName, bottle, serveRecommendation);

          if (bRespect !== aRespect) return bRespect - aRespect;
          if (b.match.matchPercentage !== a.match.matchPercentage) {
            return b.match.matchPercentage - a.match.matchPercentage;
          }

          return String(a.name || '').localeCompare(String(b.name || ''));
        });
        const topMatches = rankedMatches.slice(0, tier === 'FREE' ? 3 : 5);

        setSuggestedCocktails(topMatches);
      } catch (error) {
        console.error('Error fetching cocktails:', error);
        setSuggestedCocktails([]);
      } finally {
        setLoadingCocktails(false);
      }
    };

    fetchCocktails();
  }, [bottle, bottle.type, bottle.name, user, tier, isCocktailUnlockedWithXP, isRecipeUnlockedWithEngagement, serveRecommendation]);

  const handleAddToInventory = async () => {
    // Check if user is signed in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add bottles to your inventory.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Settings') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // T1: Check inventory limit for free users
    if (tier === 'FREE') {
      const count = await InventoryService.getInventoryCount(user.id);
      if (count >= TIER_LIMITS.FREE.maxBottles) {
        inventoryGate('T1');
        return;
      }
    }

    // Add bottle to Supabase inventory
    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: 'spirit',
      itemName: bottle.name,
      category: bottle.type,
      imageUrl: imageUri || undefined,
    });

    if (result.duplicate) {
      Alert.alert(
        'Already in Inventory',
        `${bottle.name} is already in your inventory!`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!result.success) {
      Alert.alert(
        'Error',
        'Failed to add to inventory. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Award XP for scanning/adding this bottle (50 XP first time, 5 XP repeats)
    const { xpEarned } = earnScanXP(bottle.id);
    const xpLine = xpEarned > 0 ? `\n\n+${xpEarned} XP earned` : '';

    Alert.alert(
      'Added to Inventory!',
      `${bottle.name} has been added to your inventory.${xpLine}`,
      [
        {
          text: 'View Inventory',
          onPress: () => navigation.navigate('HomeBar'),
        },
        {
          text: 'Scan Another',
          onPress: () => navigation.navigate('SmartScan'),
        },
        {
          text: 'OK',
        },
      ]
    );
  };

  const handleFindNearby = async () => {
    // Track brand data: user clicked "Find Nearby"
    if (user) {
      // Mark in inventory that user searched nearby for this item
      await InventoryService.markSearchedNearby(user.id, bottle.name);

      // Find and update the most recent scan for this bottle
      try {
        const { data: recentScan } = await supabase
          .from('user_scans')
          .select('id')
          .eq('user_id', user.id)
          .eq('item_name', bottle.name)
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentScan) {
          await InventoryService.trackFindStoresClick(recentScan.id);
        }
      } catch (error) {
        // Non-critical error, just log it
        console.error('Error tracking find stores click:', error);
      }
    }

    // Open Google Maps search for the bottle
    const searchQuery = encodeURIComponent(`${bottle.name} near me`);
    const url = `https://www.google.com/maps/search/${searchQuery}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps');
    });
  };

  const handleLearnMore = () => {
    // Search for the bottle online
    const searchQuery = encodeURIComponent(bottle.name);
    const url = `https://www.google.com/search?q=${searchQuery}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open browser');
    });
  };

  const handleTryAnother = () => {
    // Navigate back to SmartScan to scan another bottle
    navigation.navigate('SmartScan');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing(3)) + spacing(8) },
        ]}
      >
        {/* Header Badge */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Ionicons name="checkmark-circle" size={24} color={colors.gold} />
            <Text style={styles.headerBadgeText}>Identified</Text>
          </View>
        </View>

        {/* Captured Image - for verification and data collection */}
        {imageUri && (
          <View style={styles.capturedImageContainer}>
            <Image source={{ uri: imageUri }} style={styles.capturedImage} />
          </View>
        )}

        {/* Bottle Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBadge}>
            <Ionicons name="wine" size={60} color={colors.gold} />
          </View>
        </View>

        {/* Bottle Name */}
        <Text style={styles.bottleName}>{bottle.name}</Text>
        <Text style={styles.bottleBrand}>{bottle.brand}</Text>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{bottle.abv}%</Text>
            <Text style={styles.statLabel}>ABV</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="location" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{bottle.origin}</Text>
            <Text style={styles.statLabel}>Origin</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="pricetag" size={20} color={colors.gold} />
            <Text style={styles.statValue}>{getPriceTierDisplay(bottle.priceTier)}</Text>
            <Text style={styles.statLabel}>Price Tier</Text>
          </View>
        </View>

        {/* Price Estimate */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <Ionicons name="cash-outline" size={20} color={colors.accent} />
            <Text style={styles.priceTitle}>Typical Price Range</Text>
            {userRegion && (
              <Text style={styles.regionBadge}>{userRegion}</Text>
            )}
          </View>
          <Text style={styles.priceText}>
            {userCurrency === 'GBP' ? '£' : '$'}
            {bottle.priceEstimate[userCurrency].min} - {userCurrency === 'GBP' ? '£' : '$'}
            {bottle.priceEstimate[userCurrency].max} {userCurrency}
          </Text>
          <Text style={styles.priceDisclaimer}>
            * Prices vary by location and retailer
          </Text>
        </View>

        <View style={[
          styles.serveCard,
          serveRecommendation.isPremiumExperience && styles.serveCardPremium,
        ]}>
          <View style={styles.serveHeader}>
            <View style={styles.serveHeaderCopy}>
              <Text style={styles.serveEyebrow}>
                {serveRecommendation.isPremiumExperience ? 'Premium Bottle Guidance' : 'Serve Guidance'}
              </Text>
              <Text style={styles.serveTitle}>{serveRecommendation.heroTitle}</Text>
              <Text style={styles.serveSubtitle}>{serveRecommendation.heroSubtitle}</Text>
            </View>
            <View style={styles.firstPourBadge}>
              <Text style={styles.firstPourLabel}>Start With</Text>
              <Text style={styles.firstPourValue}>
                {serveRecommendation.serveModes.find((mode) => mode.mode === serveRecommendation.firstPour)?.label || 'Neat'}
              </Text>
            </View>
          </View>

          <Text style={styles.serveWhy}>{serveRecommendation.why}</Text>

          <FlatList
            horizontal
            data={serveRecommendation.serveModes}
            keyExtractor={(mode) => mode.mode}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serveModesRail}
            ItemSeparatorComponent={() => <View style={styles.serveModeSeparator} />}
            renderItem={({ item: mode }) => (
              <View style={styles.serveModeCard}>
                <View style={styles.serveModeIcon}>
                  <Ionicons
                    name={
                      mode.mode === 'neat'
                        ? 'wine-outline'
                        : mode.mode === 'water-drops'
                          ? 'water-outline'
                          : mode.mode === 'large-rock'
                            ? 'cube-outline'
                            : 'sparkles-outline'
                    }
                    size={18}
                    color={colors.gold}
                  />
                </View>
                <Text style={styles.serveModeLabel}>{mode.label}</Text>
                <Text style={styles.serveModeDescription}>{mode.description}</Text>
              </View>
            )}
          />

          <View style={styles.serveFootnote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={styles.serveFootnoteText}>{serveRecommendation.cocktailUse}</Text>
          </View>

          {serveRecommendation.upgradePrompt && (
            <Text style={styles.serveUpgradeText}>
              {hasPremiumServePersonalization
                ? 'Personalized bottle guidance is active for your profile.'
                : hasPremiumServeEducation
                  ? 'PLUS tasting education is active. Upgrade to PRO for personalization.'
                  : serveRecommendation.upgradePrompt}
            </Text>
          )}
        </View>

        {/* Flavor Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flavor Profile</Text>
          <View style={styles.flavorTags}>
            {bottle.flavorProfile.map((flavor, index) => (
              <View key={index} style={styles.flavorTag}>
                <Text style={styles.flavorText}>{flavor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tasting Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasting Notes</Text>
          <Text style={styles.tastingNotes}>{bottle.tastingNotes}</Text>
        </View>

        {/* Cocktails You Can Make */}
        {!loadingCocktails && suggestedCocktails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.cocktailsHeader}>
              <Ionicons name="sparkles" size={24} color={colors.gold} />
              <View style={styles.cocktailsHeaderCopy}>
                <Text style={styles.cocktailsTitle}>
                  {serveRecommendation.cocktailPlacement === 'secondary'
                    ? 'Cocktails That Respect This Bottle'
                    : 'Cocktails You Can Make'}
                </Text>
                <Text style={styles.cocktailsSubtitle}>
                  {tier === 'FREE'
                    ? 'Up to 3 matches from your free and unlocked recipe pool.'
                    : 'Best matches from your current recipe access.'}
                </Text>
              </View>
            </View>
            <FlatList
              horizontal
              data={suggestedCocktails}
              keyExtractor={(cocktail) => cocktail.id}
              renderItem={({ item: cocktail }) => {
                const displayRecipe = {
                  ...cocktail,
                  image: getCocktailImage(cocktail.id, cocktail.image),
                  subtitle: cocktail.match?.canMake
                    ? 'You can make this'
                    : cocktail.match?.almostCanMake
                      ? getMatchMessage(cocktail.match)
                      : cocktail.subtitle || 'Worth a closer look',
                };

                return (
                  <RecipeCard
                    recipe={displayRecipe}
                    onPress={() => navigation.navigate('CocktailDetail', { cocktailId: cocktail.id })}
                    showSaveButton={false}
                    showCartButton={false}
                    showDeleteButton={false}
                    style={styles.discoveryRecipeCard}
                  />
                );
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cocktailsRail}
              ItemSeparatorComponent={() => <View style={styles.cocktailRailSeparator} />}
              nestedScrollEnabled
              removeClippedSubviews={false}
            />
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actions, { marginBottom: Math.max(insets.bottom, spacing(2)) }]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddToInventory}
          >
            <Ionicons name="add-circle" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>Add to Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tryAnotherButton}
            onPress={handleTryAnother}
          >
            <Ionicons name="camera" size={20} color={colors.text} />
            <Text style={styles.tryAnotherButtonText}>Try Another</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleFindNearby}
            >
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Find Nearby</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLearnMore}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing(3),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
  },
  capturedImageContainer: {
    marginBottom: spacing(3),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.gold}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gold,
  },
  bottleName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(0.5),
  },
  bottleBrand: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  priceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  regionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  priceText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(0.5),
  },
  priceDisclaimer: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: spacing(1),
    fontStyle: 'italic',
  },
  serveCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1.5),
  },
  serveCardPremium: {
    backgroundColor: `${colors.gold}10`,
    borderColor: `${colors.gold}35`,
  },
  serveHeader: {
    flexDirection: 'row',
    gap: spacing(2),
    alignItems: 'flex-start',
  },
  serveHeaderCopy: {
    flex: 1,
    gap: spacing(0.5),
  },
  serveEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  serveSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  firstPourBadge: {
    minWidth: 92,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    backgroundColor: `${colors.gold}18`,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    alignItems: 'flex-start',
  },
  firstPourLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
  },
  firstPourValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(0.25),
  },
  serveWhy: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  serveModesRail: {
    paddingRight: spacing(1),
  },
  serveModeSeparator: {
    width: spacing(1.5),
  },
  serveModeCard: {
    width: 188,
    backgroundColor: `${colors.bg}90`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  serveModeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.gold}12`,
    marginBottom: spacing(0.5),
  },
  serveModeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  serveModeDescription: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  serveFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  serveFootnoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
  },
  serveUpgradeText: {
    fontSize: 12,
    color: colors.accent,
    lineHeight: 17,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  flavorTag: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },
  flavorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.goldText,
  },
  tastingNotes: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  cocktailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  cocktailsHeaderCopy: {
    flex: 1,
  },
  cocktailsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cocktailsSubtitle: {
    marginTop: spacing(0.5),
    fontSize: 12,
    color: colors.subtext,
  },
  cocktailsRail: {
    paddingLeft: spacing(0.25),
    paddingRight: spacing(2),
  },
  cocktailRailSeparator: {
    width: spacing(2),
  },
  discoveryRecipeCard: {
    width: 240,
  },
  actions: {
    gap: spacing(2),
    marginTop: spacing(2),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing(2),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  tryAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 2,
    borderColor: colors.accent,
  },
  tryAnotherButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
