/**
 * Bottle Detail Screen
 * Shows detailed information about a scanned spirit bottle
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { CameraStackParamList } from '../navigation/CameraStack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Spirit } from '../data/spiritsDatabase';
import { getPriceTierDisplay } from '../data/spiritsDatabase';
import { useXPSystem } from '../store/useXPSystem';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import type { Cocktail } from '../types/supabase';
import { InventoryService } from '../services/inventoryService';
import { useUser } from '../store/useUser';
import { matchRecipe, sortByMatch, getMatchMessage } from '../utils/recipeMatching';
import type { RecipeMatch } from '../utils/recipeMatching';
import { RecipesRepository } from '../repos/supabase';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible } from '../config/tierAccess';

type BottleDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CameraStackParamList, 'BottleDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function BottleDetailScreen() {
  const navigation = useNavigation<BottleDetailScreenNavigationProp>();
  const route = useRoute<RouteProp<CameraStackParamList, 'BottleDetail'>>();
  const { earnInventoryXP } = useXPSystem();
  const { user } = useUser();
  const { tier } = useUserTier();
  const { bottle, imageUri } = route.params;
  const [userCurrency, setUserCurrency] = useState<'USD' | 'CAD' | 'GBP'>('USD');
  const [userRegion, setUserRegion] = useState<string>('');
  const [suggestedCocktails, setSuggestedCocktails] = useState<Array<Cocktail & { match: RecipeMatch }>>([]);
  const [loadingCocktails, setLoadingCocktails] = useState(true);
  const [scanId, setScanId] = useState<string | null>(null);

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
    // Fetch cocktails: 2 classics + 3 based on user's inventory (80% match)
    const fetchCocktails = async () => {
      setLoadingCocktails(true);
      try {
        // 1. Fetch user's inventory
        const userInventory = user ? await InventoryService.getUserInventory(user.id) : [];

        // 1.5. Create combined inventory including the scanned bottle
        // This allows match calculation to consider cocktails you can make WITH this bottle
        const combinedInventory = [
          ...userInventory,
          {
            id: 'temp-scanned-bottle',
            user_id: user?.id || '',
            item_name: bottle.name,
            item_type: 'spirit' as const,
            category: bottle.category,
            created_at: new Date().toISOString(),
          },
        ];

        // 2. Load recipes that match this spirit
        const recipesData = await RecipesRepository.getInitialRecipes(150);

        // 3. Filter recipes by this spirit (using base_spirit or category)
        let spiritName = bottle.category?.toLowerCase().trim() || '';

        // Fallback: Extract spirit type from bottle name if category is missing
        if (!spiritName && bottle.name) {
          const bottleName = bottle.name.toLowerCase();
          const spiritTypes = ['vodka', 'gin', 'rum', 'tequila', 'whiskey', 'whisky', 'bourbon', 'scotch', 'brandy', 'cognac', 'mezcal', 'rye'];

          for (const spirit of spiritTypes) {
            if (bottleName.includes(spirit)) {
              spiritName = spirit;
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

        let matchedData = recipesData.filter(recipe => {
          // Check if recipe uses this spirit
          const baseSpirit = recipe.baseSpirit?.toLowerCase() || '';
          const category = recipe.category?.toLowerCase() || '';
          const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ').toLowerCase() : '';

          // Escape special regex characters and use word boundary matching
          // For example: "rum" should match "rum" or "white rum" but not "forum"
          try {
            const escapedSpiritName = spiritName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const spiritRegex = new RegExp(`\\b${escapedSpiritName}\\b`, 'i');

            return spiritRegex.test(baseSpirit) ||
                   spiritRegex.test(category) ||
                   spiritRegex.test(tags);
          } catch (e) {
            // Fallback to simple includes if regex fails
            console.error('Regex error, using fallback:', e);
            return baseSpirit.includes(spiritName) ||
                   category.includes(spiritName) ||
                   tags.includes(spiritName);
          }
        });

        console.log(`BottleDetailScreen: Found ${matchedData.length} recipes matching "${spiritName}"`);
        if (matchedData.length > 0 && matchedData.length <= 3) {
          console.log('Sample matched recipes:', matchedData.slice(0, 3).map(r => ({ name: r.name, baseSpirit: r.baseSpirit })));
        }

        // 3.5. Filter by tier access (FREE users only see unlocked recipes)
        if (tier === 'FREE') {
          matchedData = matchedData.filter(recipe =>
            isCocktailAccessible(recipe.id, tier)
          );
        }

        // 4. Sort by match percentage with combined inventory (includes scanned bottle)
        const cocktailsWithMatch = sortByMatch(matchedData as any[], combinedInventory);
        const topMatches = cocktailsWithMatch.slice(0, 5);

        setSuggestedCocktails(topMatches);
      } catch (error) {
        console.error('Error fetching cocktails:', error);
        setSuggestedCocktails([]);
      } finally {
        setLoadingCocktails(false);
      }
    };

    fetchCocktails();
  }, [bottle.category, user, tier]);

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

    // Add bottle to Supabase inventory
    const result = await InventoryService.addToInventory({
      userId: user.id,
      itemType: 'spirit',
      itemName: bottle.name,
      category: bottle.category,
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

    // Award XP for adding to inventory
    earnInventoryXP(bottle.name);

    Alert.alert(
      'Added to Inventory!',
      `${bottle.name} has been added to your inventory.\n\n+5 XP earned`,
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <Text style={styles.cocktailsTitle}>Cocktails You Can Make</Text>
            </View>
            <View style={styles.cocktailsList}>
              {suggestedCocktails.map((cocktail, index) => {
                const isClassic = index < 2; // First 2 are classics
                return (
                  <TouchableOpacity
                    key={cocktail.id}
                    style={styles.cocktailCard}
                    onPress={() => navigation.navigate('CocktailDetail', { cocktailId: cocktail.id })}
                  >
                    <View style={styles.cocktailIcon}>
                      <Ionicons name="wine" size={24} color={colors.gold} />
                    </View>
                    <View style={styles.cocktailInfo}>
                      <View style={styles.cocktailNameRow}>
                        <Text style={styles.cocktailName}>{cocktail.name}</Text>
                        {isClassic && (
                          <View style={styles.classicBadge}>
                            <Text style={styles.classicBadgeText}>CLASSIC</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cocktailCategory}>{cocktail.category}</Text>

                      {/* Match Status */}
                      {cocktail.match && (
                        <View style={styles.matchInfo}>
                          {cocktail.match.canMake ? (
                            <View style={styles.matchBadge}>
                              <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                              <Text style={styles.matchText}>You can make this!</Text>
                            </View>
                          ) : cocktail.match.almostCanMake ? (
                            <View style={styles.missingBadge}>
                              <Ionicons name="cart-outline" size={14} color={colors.accent} />
                              <Text style={styles.missingText}>
                                {getMatchMessage(cocktail.match)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}

                      <View style={styles.cocktailMeta}>
                        <Text style={styles.cocktailDifficulty}>{cocktail.difficulty?.toUpperCase()}</Text>
                        {cocktail.rating && (
                          <>
                            <Ionicons name="star" size={12} color={colors.gold} />
                            <Text style={styles.cocktailRating}>{cocktail.rating}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
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

        {/* Bottom Spacing */}
        <View style={{ height: spacing(4) }} />
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
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  cocktailsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cocktailsList: {
    gap: spacing(2),
  },
  cocktailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(2),
  },
  cocktailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cocktailInfo: {
    flex: 1,
    gap: spacing(0.5),
  },
  cocktailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  cocktailName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  classicBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
  },
  classicBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.goldText,
  },
  cocktailCategory: {
    fontSize: 13,
    color: colors.subtext,
  },
  matchInfo: {
    marginTop: spacing(0.5),
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  missingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  cocktailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },
  cocktailDifficulty: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },
  cocktailRating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
