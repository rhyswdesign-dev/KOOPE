/**
 * Ingredient Scan Screen
 * Uses camera to identify ingredients and add them to inventory
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { GoogleVisionService } from '../services/googleVisionService';
import CameraCapture from '../components/camera/CameraCapture';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';
import { useXPSystem } from '../store/useXPSystem';
import { InventoryService } from '../services/inventoryService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { RecipesRepository } from '../repos/supabase';
import { sortByMatch } from '../utils/recipeMatching';
import { isCocktailAccessible } from '../config/tierAccess';
import { useUserTier } from '../store/useUserTier';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { useSavedItems } from '../hooks/useSavedItems';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function IngredientScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { earnScanXP } = useXPSystem();
  const { user } = useAuth();
  const { isSubscriber } = useSubscription();
  const { tier } = useUserTier();
  const { toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scannedIngredients, setScannedIngredients] = useState<Array<{
    name: string;
    category: string;
    confidence: number;
    imageUri: string;
  }>>([]);
  const [currentIngredients, setCurrentIngredients] = useState<Array<{
    name: string;
    category: string;
    confidence: number;
  }>>([]);
  const [scansRemaining, setScansRemaining] = useState<number>(10);
  const [suggestedCocktails, setSuggestedCocktails] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleCameraCapture = async (uri: string) => {
    setCameraVisible(false);
    setImageUri(uri);
    setAnalyzing(true);

    try {
      log.info('IngredientScanScreen', 'Analyzing ingredient image');

      // Analyze image with Google Vision
      const visionResult = await GoogleVisionService.analyzeImage(uri);

      // Match all ingredients from this single photo (up to 6)
      const detectedIngredients = GoogleVisionService.matchIngredients(visionResult, 6);
      const primaryIngredient = detectedIngredients[0];

      // Record scan for brand data
      if (user) {
        await InventoryService.recordScan({
          userId: user.id,
          scanType: 'ingredient',
          itemName: primaryIngredient?.name,
          imageUrl: uri,
          confidence: primaryIngredient?.confidence,
          addedToInventory: false,
        });

        // Update scan count
        const scanStatus = await InventoryService.canUserScan(user.id, isSubscriber);
        setScansRemaining(scanStatus.scansRemaining);
      }

      if (detectedIngredients.length > 0) {
        setCurrentIngredients(detectedIngredients);
        log.info('IngredientScanScreen', 'Ingredients detected', {
          count: detectedIngredients.length,
          names: detectedIngredients.map((i) => i.name),
        });
        // Fetch cocktail suggestions
        await fetchCocktailSuggestions(detectedIngredients.map((i) => i.name));
      } else {
        Alert.alert(
          'No Ingredient Detected',
          'Could not identify an ingredient. Try taking a clearer photo with good lighting.',
          [
            { text: 'Try Again', onPress: () => handleScanMore() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setImageUri(null);
      }
    } catch (error) {
      log.error('IngredientScanScreen', 'Error analyzing ingredient', error);
      Alert.alert(
        'Analysis Failed',
        'Failed to analyze the image. Please try again.',
        [{ text: 'OK' }]
      );
      setImageUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchCocktailSuggestions = async (scannedIngredientNames: string[]) => {
    if (!user) return;

    setLoadingSuggestions(true);
    try {
      // Get user's current inventory
      const userInventory = await InventoryService.getUserInventory(user.id);

      // Create a combined inventory including the newly scanned ingredient
      const tempScannedItems = scannedIngredientNames.map((name, index) => ({
        id: `temp-scanned-${index}`,
        user_id: user.id,
        item_name: name,
        item_type: 'ingredient' as const,
        category: 'ingredient',
        image_url: null,
        added_at: new Date().toISOString(),
        scanned_at: new Date().toISOString(),
        user_searched_nearby: false,
        last_used_at: null,
      }));

      const combinedInventory = [
        ...userInventory,
        ...tempScannedItems,
      ];

      // Load recipes
      const recipesData = await RecipesRepository.getInitialRecipes(150);

      if (recipesData) {
        // Filter by tier access first
        let accessibleRecipes = recipesData;
        if (tier === 'FREE') {
          accessibleRecipes = recipesData.filter(cocktail =>
            isCocktailAccessible(cocktail.id, tier)
          );
        }

        // Sort by match percentage with combined inventory
        const matched = sortByMatch(accessibleRecipes as any[], combinedInventory);

        // Take top 3 suggestions
        const topSuggestions = matched.slice(0, 3);
        setSuggestedCocktails(topSuggestions);

        log.info('IngredientScanScreen', 'Cocktail suggestions fetched', {
          count: topSuggestions.length,
        });
      }
    } catch (error) {
      log.error('IngredientScanScreen', 'Error fetching cocktail suggestions', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleScanMore = () => {
    // Add all ingredients detected in current image to accumulated list
    if (currentIngredients.length > 0 && imageUri) {
      setScannedIngredients(prev => [
        ...prev,
        ...currentIngredients.map((ingredient) => ({ ...ingredient, imageUri })),
      ]);
    }

    // Reset for next scan
    setImageUri(null);
    setCurrentIngredients([]);
    setSuggestedCocktails([]);
    setCameraVisible(true);
  };

  const handleAddToInventory = async () => {
    // Check if user is signed in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add ingredients to your inventory.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Settings') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // Add current ingredient to list if exists
    const allIngredients = currentIngredients.length > 0 && imageUri
      ? [...scannedIngredients, ...currentIngredients.map((ingredient) => ({ ...ingredient, imageUri }))]
      : scannedIngredients;

    if (allIngredients.length === 0) return;

    const dedupedIngredients = Array.from(
      new Map(
        allIngredients.map((ingredient) => [
          `${ingredient.name.toLowerCase()}|${ingredient.category.toLowerCase()}`,
          ingredient,
        ])
      ).values()
    );

    // Add ingredients to Supabase inventory
    const result = await InventoryService.addMultipleToInventory(
      user.id,
      dedupedIngredients.map(ing => ({
        itemType: 'ingredient' as const,
        itemName: ing.name,
        category: ing.category,
        imageUrl: ing.imageUri,
      }))
    );

    // Award XP for each successfully added ingredient (50 XP first time, 5 XP repeat)
    let totalXP = 0;
    for (let i = 0; i < result.successCount; i++) {
      const { xpEarned } = earnScanXP(dedupedIngredients[i].name);
      totalXP += xpEarned;
    }
    const successfulNames = dedupedIngredients
      .filter((_, idx) => !result.duplicates.includes(dedupedIngredients[idx].name))
      .map(i => i.name)
      .join(', ');

    // Build alert message
    let message = `${result.successCount} ingredient${result.successCount !== 1 ? 's' : ''} added to your inventory`;
    if (result.successCount > 0) {
      message += `:\n\n${successfulNames}\n\n+${totalXP} XP earned`;
    }
    if (result.duplicates.length > 0) {
      message += `\n\nAlready in inventory: ${result.duplicates.join(', ')}`;
    }

    Alert.alert(
      result.successCount > 0 ? 'Added to Inventory!' : 'Already in Inventory',
      message,
      [
        {
          text: 'View Inventory',
          onPress: () => navigation.navigate('HomeBar'),
        },
        {
          text: 'Scan More',
          onPress: () => {
            setScannedIngredients([]);
            setImageUri(null);
            setCurrentIngredients([]);
            setSuggestedCocktails([]);
            setCameraVisible(true);
          },
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]
    );

    log.info('IngredientScanScreen', 'Ingredients added to inventory', {
      successCount: result.successCount,
      duplicates: result.duplicates,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!imageUri && !cameraVisible && (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf-outline" size={64} color={colors.gold} />
            </View>
            <Text style={styles.emptyTitle}>Scan Ingredient</Text>
            <Text style={styles.emptyDescription}>
              Take a photo of any ingredient to identify it and add it to your inventory
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setCameraVisible(true)}
            >
              <Ionicons name="camera" size={24} color={colors.goldText} />
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={20} color={colors.accent} />
              <Text style={styles.tipText}>
                Works best with: Fresh herbs, citrus fruits, vegetables, garnishes
              </Text>
            </View>
          </View>
        )}

        {analyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.analyzingText}>Analyzing ingredient...</Text>
          </View>
        )}

        {imageUri && currentIngredients.length > 0 && !analyzing && (
          <View style={styles.resultContainer}>
            {/* Show previously scanned ingredients */}
            {scannedIngredients.length > 0 && (
              <View style={styles.scannedList}>
                <Text style={styles.scannedListTitle}>
                  Scanned ({scannedIngredients.length})
                </Text>
                <View style={styles.scannedItems}>
                  {scannedIngredients.map((ingredient, index) => (
                    <View key={index} style={styles.scannedItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                      <Text style={styles.scannedItemText}>{ingredient.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Image source={{ uri: imageUri }} style={styles.resultImage} />

            <View style={styles.detectionCard}>
              <View style={styles.detectionHeader}>
                <Ionicons name="checkmark-circle" size={32} color={colors.gold} />
                <Text style={styles.detectionTitle}>
                  {currentIngredients.length > 1 ? 'Ingredients Detected!' : 'Ingredient Detected!'}
                </Text>
              </View>

              <View style={styles.detectionDetails}>
                {currentIngredients.map((ingredient, index) => (
                  <View key={`${ingredient.name}-${index}`} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {ingredient.name} ({ingredient.category})
                    </Text>
                    <Text style={styles.detailValue}>
                      {Math.round(ingredient.confidence * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Cocktail Suggestions Section */}
            {loadingSuggestions && (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={styles.suggestionsLoadingText}>Finding cocktails...</Text>
              </View>
            )}

            {!loadingSuggestions && suggestedCocktails.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Ionicons name="sparkles" size={20} color={colors.gold} />
                  <Text style={styles.suggestionsTitle}>
                    {tier === 'FREE' ? 'Classic Cocktails' : 'You Can Make'}
                  </Text>
                </View>
                <Text style={styles.suggestionsSubtitle}>
                  {tier === 'FREE'
                    ? `With ${currentIngredients.map((ingredient) => ingredient.name).join(', ')} + your inventory`
                    : `Top suggestions with ${currentIngredients.map((ingredient) => ingredient.name).join(', ')}`}
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {suggestedCocktails.map((cocktail, index) => {
                    const cardProps = createRecipeCardProps(cocktail as any, navigation, {
                      toggleSavedCocktail,
                      isCocktailSaved,
                      showSaveButton: false,
                      showCartButton: false,
                      source: 'ingredient_scan',
                    });

                    return (
                      <View key={index} style={styles.suggestionCard}>
                        <RecipeCard
                          {...cardProps}
                          style={{ width: width * 0.6 }}
                        />
                        {cocktail.match && (
                          <View style={styles.matchBadge}>
                            <Text style={styles.matchText}>
                              {Math.round(cocktail.match.matchPercentage * 100)}% Match
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {tier === 'FREE' && (
                  <TouchableOpacity
                    style={styles.upgradePrompt}
                    onPress={() =>
                      navigation.navigate('Paywall', {
                        offering: null,
                        displayCloseButton: true,
                      })
                    }
                  >
                    <Ionicons name="lock-closed" size={16} color={colors.gold} />
                    <Text style={styles.upgradeText}>
                      Upgrade to unlock all cocktails
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleScanMore}
              >
                <Ionicons name="camera" size={24} color={colors.goldText} />
                <Text style={styles.primaryButtonText}>Scan More</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleAddToInventory}>
                <Ionicons name="add-circle" size={20} color={colors.text} />
                <Text style={styles.secondaryButtonText}>
                  Add to Inventory ({scannedIngredients.length + currentIngredients.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onImageCaptured={handleCameraCapture}
        title="Scan Ingredient"
        allowGallery={true}
        scansRemaining={scansRemaining}
        isPaidUser={isSubscriber}
        isGuest={!user}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing(4),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    gap: spacing(1.5),
    minWidth: 200,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.goldText,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    gap: spacing(1.5),
    minWidth: 200,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.md,
    padding: spacing(2),
    marginTop: spacing(4),
    gap: spacing(1.5),
    maxWidth: 340,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  analyzingText: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(2),
  },
  resultContainer: {
    padding: spacing(3),
  },
  scannedList: {
    backgroundColor: `${colors.gold}10`,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  scannedListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  scannedItems: {
    gap: spacing(1),
  },
  scannedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  scannedItemText: {
    fontSize: 14,
    color: colors.text,
    textTransform: 'capitalize',
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: radii.lg,
    marginBottom: spacing(3),
  },
  detectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(3),
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  detectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  detectionDetails: {
    gap: spacing(1.5),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: colors.subtext,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  buttonGroup: {
    gap: spacing(2),
  },
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    padding: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(3),
  },
  suggestionsLoadingText: {
    fontSize: 14,
    color: colors.subtext,
  },
  suggestionsContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    marginBottom: spacing(3),
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(0.5),
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionsSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(2),
  },
  suggestionsScroll: {
    paddingRight: spacing(2),
    gap: spacing(2),
  },
  suggestionCard: {
    position: 'relative',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    zIndex: 10,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldText,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}15`,
    borderRadius: radii.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    marginTop: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
});
