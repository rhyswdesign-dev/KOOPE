/**
 * Ingredient Scan Screen
 * Identifies ingredients and shows bartending context — how to use them.
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
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
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

// ─── Bartending context per ingredient category ──────────────────────────────

interface BartendingContext {
  role: string;
  techniques: string[];
  tip: string;
}

const BARTENDING_CONTEXT: Record<string, BartendingContext> = {
  citrus: {
    role: 'Acid & Brightness',
    techniques: ['Fresh juice only — bottle juice is flat', 'Zest expresses oils for garnish or fat-washing', 'Oleo saccharum: peel + sugar = intense citrus syrup'],
    tip: 'Always juice to order. Citrus oxidises fast — juice older than 30 min turns flat and bitter.',
  },
  herbs: {
    role: 'Aromatics & Garnish',
    techniques: ['Muddle gently — bruise, don\'t shred', 'Clap between palms to release oils before garnishing', 'Herb syrups: simmer with equal-weight sugar + water'],
    tip: 'Add herbs last when possible. Heat and ice both kill delicate aromatics.',
  },
  fruits: {
    role: 'Flavour & Sweetness',
    techniques: ['Puree and strain for a clean fruit base', 'Macerate in sugar to draw out juice naturally', 'Sous vide infusion into spirit for intensity without cooking'],
    tip: 'Ripe fruit = more sugar, less acid. Adjust your citrus balance accordingly.',
  },
  vegetables: {
    role: 'Savoury & Umami',
    techniques: ['Juice for clean vegetal base (cucumber, celery)', 'Infuse into vodka or gin for 24–48h', 'Fermented veg brine (kimchi, pickle) as a seasoning'],
    tip: 'A pinch of salt enhances vegetal flavours. Use sparingly — it\'s a seasoning, not an ingredient.',
  },
  garnishes: {
    role: 'Aroma & Presentation',
    techniques: ['Express citrus peel over the glass before placing', 'Dehydrate slices for shelf-stable garnish', 'Flame orange peel for caramelised oils'],
    tip: 'Garnish should be functional — it should add something the drink doesn\'t already have.',
  },
  spices: {
    role: 'Bitters & Infusions',
    techniques: ['Tincture: steep in high-proof spirit (1–2 weeks)', 'Oleo saccharum with spice for complex syrups', 'Toast whole spices before steeping to deepen flavour'],
    tip: 'Start light. Spice infusions are hard to dilute — taste every 24h and strain when it\'s right.',
  },
  sweeteners: {
    role: 'Balance & Texture',
    techniques: ['1:1 simple syrup (equal parts sugar + water)', '2:1 rich syrup for more viscosity and less dilution', 'Flavoured syrups: add herbs/spices to base before cooling'],
    tip: 'Rich 2:1 syrup changes texture not just sweetness. Use half the volume of a 1:1 recipe.',
  },
};

const DEFAULT_CONTEXT: BartendingContext = {
  role: 'Cocktail Ingredient',
  techniques: ['Taste before using — fresh quality matters', 'Consider whether it adds acid, sweet, bitter, or texture', 'Experiment with small infusions in a neutral spirit first'],
  tip: 'Unknown ingredients often work best as small-batch infusions. Start with 24h and adjust.',
};

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
  const [currentIngredients, setCurrentIngredients] = useState<Array<{
    name: string;
    category: string;
    confidence: number;
  }>>([]);
  const [scannedIngredients, setScannedIngredients] = useState<Array<{
    name: string;
    category: string;
    confidence: number;
    imageUri: string;
  }>>([]);
  const [scansRemaining, setScansRemaining] = useState<number>(10);
  const [suggestedCocktails, setSuggestedCocktails] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [resultModal, setResultModal] = useState<{
    type: 'added' | 'duplicate';
    added: number;
    duplicates: string[];
    xp: number;
    addedNames: string[];
  } | null>(null);

  const handleCameraCapture = async (uri: string) => {
    setCameraVisible(false);
    setImageUri(uri);
    setAnalyzing(true);

    try {
      const visionResult = await GoogleVisionService.analyzeImage(uri);
      const detectedIngredients = GoogleVisionService.matchIngredients(visionResult, 6);
      const primaryIngredient = detectedIngredients[0];

      if (user) {
        await InventoryService.recordScan({
          userId: user.id,
          scanType: 'ingredient',
          itemName: primaryIngredient?.name,
          imageUrl: uri,
          confidence: primaryIngredient?.confidence,
          addedToInventory: false,
        });
        const scanStatus = await InventoryService.canUserScan(user.id, isSubscriber);
        setScansRemaining(scanStatus.scansRemaining);
      }

      if (detectedIngredients.length > 0) {
        setCurrentIngredients(detectedIngredients);
        await fetchCocktailSuggestions(detectedIngredients.map(i => i.name));
      } else {
        Alert.alert(
          'Nothing Detected',
          'Could not identify an ingredient. Try a clearer photo with better lighting.',
          [
            { text: 'Try Again', onPress: () => handleScanMore() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setImageUri(null);
      }
    } catch (error) {
      log.error('IngredientScanScreen', 'Error analysing ingredient', error);
      Alert.alert('Analysis Failed', 'Failed to analyse the image. Please try again.', [{ text: 'OK' }]);
      setImageUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchCocktailSuggestions = async (ingredientNames: string[]) => {
    // FREE users don't get catalog suggestions — the feature only makes sense
    // with the full recipe catalog (PLUS/PRO). Show upgrade prompt instead.
    if (tier === 'FREE') return;

    setLoadingSuggestions(true);
    try {
      const recipesData = await RecipesRepository.getInitialRecipes(150);
      if (!recipesData) return;

      const accessible = recipesData;

      // Normalise scanned names for fuzzy matching
      const scannedNormalised = ingredientNames.map(n => n.toLowerCase().trim());

      // Keep only recipes that actually contain the scanned ingredient
      const containing = accessible.filter(recipe => {
        const recipeIngredients = recipe.ingredients || [];
        const ingredientText = Array.isArray(recipeIngredients)
          ? recipeIngredients.map((i: any) =>
              typeof i === 'string' ? i : (i.name || i.item || '')
            ).join(' ').toLowerCase()
          : String(recipeIngredients).toLowerCase();

        return scannedNormalised.some(scanned =>
          ingredientText.includes(scanned) ||
          // handle short names like "lemon" matching "lemon juice"
          scanned.split(' ').some(word => word.length > 3 && ingredientText.includes(word))
        );
      });

      setSuggestedCocktails(containing.slice(0, 6) as any[]);
    } catch (error) {
      log.error('IngredientScanScreen', 'Error fetching suggestions', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleScanMore = () => {
    if (currentIngredients.length > 0 && imageUri) {
      setScannedIngredients(prev => [
        ...prev,
        ...currentIngredients.map(i => ({ ...i, imageUri: imageUri! })),
      ]);
    }
    setImageUri(null);
    setCurrentIngredients([]);
    setSuggestedCocktails([]);
    setCameraVisible(true);
  };

  const handleAddToInventory = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add ingredients to your inventory.', [
        { text: 'Sign In', onPress: () => navigation.navigate('Settings') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    const allIngredients = currentIngredients.length > 0 && imageUri
      ? [...scannedIngredients, ...currentIngredients.map(i => ({ ...i, imageUri: imageUri! }))]
      : scannedIngredients;

    if (allIngredients.length === 0) return;

    const deduped = Array.from(
      new Map(allIngredients.map(i => [`${i.name}|${i.category}`, i])).values()
    );

    const result = await InventoryService.addMultipleToInventory(
      user.id,
      deduped.map(ing => ({
        itemType: 'ingredient' as const,
        itemName: ing.name,
        category: ing.category,
        imageUrl: ing.imageUri,
      }))
    );

    let totalXP = 0;
    for (let i = 0; i < result.successCount; i++) {
      const { xpEarned } = earnScanXP(deduped[i].name);
      totalXP += xpEarned;
    }

    const successNames = deduped
      .filter((_, idx) => !result.duplicates.includes(deduped[idx].name))
      .map(i => i.name).join(', ');

    const addedNames = deduped
      .filter((_, idx) => !result.duplicates.includes(deduped[idx].name))
      .map(i => i.name);

    setResultModal({
      type: result.successCount > 0 ? 'added' : 'duplicate',
      added: result.successCount,
      duplicates: result.duplicates,
      xp: totalXP,
      addedNames,
    });
  };

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!imageUri && !cameraVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyHero}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="leaf" size={32} color={colors.gold} />
            </View>
            <Text style={styles.emptyTitle}>Scan Ingredient</Text>
            <Text style={styles.emptySubtitle}>
              Point at any ingredient — citrus, herbs, spices, garnishes. We'll tell you how to use it.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setCameraVisible(true)} activeOpacity={0.82}>
            <Ionicons name="camera" size={20} color={colors.goldText} />
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <View style={styles.worksWithCard}>
            <Text style={styles.worksWithLabel}>Works best with</Text>
            <View style={styles.worksWithRow}>
              {['Citrus', 'Herbs', 'Spices', 'Garnishes', 'Fruits'].map(item => (
                <View key={item} style={styles.worksWithChip}>
                  <Text style={styles.worksWithChipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <CameraCapture
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onImageCaptured={handleCameraCapture}
          title="Scan Ingredient"
          allowGallery
          scansRemaining={scansRemaining}
          isPaidUser={isSubscriber}
          isGuest={!user}
        />
      </SafeAreaView>
    );
  }

  // ─── Analysing state ─────────────────────────────────────────────────────
  if (analyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.analyzingTitle}>Identifying ingredient...</Text>
          <Text style={styles.analyzingSubtitle}>Matching against our bartending library</Text>
        </View>
        <CameraCapture
          visible={false}
          onClose={() => {}}
          onImageCaptured={handleCameraCapture}
          isPaidUser={isSubscriber}
          isGuest={!user}
        />
      </SafeAreaView>
    );
  }

  // ─── Result state ─────────────────────────────────────────────────────────
  const primaryIngredient = currentIngredients[0];
  const bartendingContext = primaryIngredient
    ? (BARTENDING_CONTEXT[primaryIngredient.category.toLowerCase()] || DEFAULT_CONTEXT)
    : DEFAULT_CONTEXT;
  const confidencePct = primaryIngredient ? Math.round(primaryIngredient.confidence * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultContent}>

        {/* Image + detection overlay */}
        {imageUri && (
          <View style={styles.resultImageWrap}>
            <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', colors.bg]}
              style={styles.resultImageFade}
            />
          </View>
        )}

        {/* Previously scanned pill strip */}
        {scannedIngredients.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scannedStrip}
            style={styles.scannedStripWrap}
          >
            {scannedIngredients.map((ing, i) => (
              <View key={i} style={styles.scannedPill}>
                <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                <Text style={styles.scannedPillText}>{ing.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.resultBody}>
          {/* Detection card */}
          <View style={styles.detectionCard}>
            <View style={styles.detectionTop}>
              <View>
                <Text style={styles.detectionEyebrow}>Ingredient Detected</Text>
                <Text style={styles.detectionName}>
                  {currentIngredients.map(i => i.name).join(', ')}
                </Text>
                <Text style={styles.detectionCategory}>
                  {primaryIngredient?.category} · {confidencePct}% confidence
                </Text>
              </View>
              <View style={[
                styles.confidenceBadge,
                confidencePct >= 75 ? styles.confidenceHigh : styles.confidenceMed,
              ]}>
                <Text style={styles.confidenceBadgeText}>{confidencePct}%</Text>
              </View>
            </View>
          </View>

          {/* Bartending context */}
          <View style={styles.contextCard}>
            <View style={styles.contextHeader}>
              <View style={styles.contextRolePill}>
                <Text style={styles.contextRoleText}>{bartendingContext.role}</Text>
              </View>
            </View>

            <View style={styles.techniquesSection}>
              <Text style={styles.techniquesLabel}>Techniques</Text>
              {bartendingContext.techniques.map((technique, i) => (
                <View key={i} style={styles.techniqueRow}>
                  <View style={styles.techniqueDot} />
                  <Text style={styles.techniqueText}>{technique}</Text>
                </View>
              ))}
            </View>

            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.gold} />
              <Text style={styles.tipText}>{bartendingContext.tip}</Text>
            </View>
          </View>

          {/* Cocktail suggestions — PLUS/PRO only */}
          {tier === 'FREE' ? (
            <TouchableOpacity
              style={styles.upgradePrompt}
              onPress={() => navigation.navigate('Paywall', { offering: null, displayCloseButton: true })}
              activeOpacity={0.82}
            >
              <Ionicons name="lock-closed" size={16} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradePromptTitle}>See every cocktail this works in</Text>
                <Text style={styles.upgradePromptSub}>Upgrade to KŌOPE+ to browse the full recipe catalog by ingredient</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gold} />
            </TouchableOpacity>
          ) : (
            <>
              {loadingSuggestions && (
                <View style={styles.suggestionsLoading}>
                  <ActivityIndicator size="small" color={colors.gold} />
                  <Text style={styles.suggestionsLoadingText}>Finding cocktails...</Text>
                </View>
              )}

              {!loadingSuggestions && suggestedCocktails.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <View style={styles.suggestionsTitleRow}>
                    <Text style={styles.suggestionsTitle}>Cocktails Using This</Text>
                    <Text style={styles.suggestionsSubtitle}>
                      {currentIngredients.map(i => i.name).join(' + ')}
                    </Text>
                  </View>

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
                        <View key={index} style={styles.suggestionCardWrap}>
                          <RecipeCard {...cardProps} style={{ width: width * 0.58 }} />
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {!loadingSuggestions && suggestedCocktails.length === 0 && (
                <View style={styles.suggestionsEmpty}>
                  <Text style={styles.suggestionsEmptyText}>No recipes found using this ingredient</Text>
                </View>
              )}
            </>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddToInventory} activeOpacity={0.82}>
              <Ionicons name="add-circle" size={20} color={colors.goldText} />
              <Text style={styles.primaryButtonText}>
                Add to Inventory ({scannedIngredients.length + currentIngredients.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleScanMore} activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={18} color={colors.gold} />
              <Text style={styles.secondaryButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onImageCaptured={handleCameraCapture}
        title="Scan Ingredient"
        allowGallery
        scansRemaining={scansRemaining}
        isPaidUser={isSubscriber}
        isGuest={!user}
      />

      {/* ── Result modal ── */}
      <Modal
        visible={!!resultModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setResultModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Icon */}
            <View style={[
              styles.modalIconRing,
              resultModal?.type === 'added' ? styles.modalIconRingSuccess : styles.modalIconRingInfo,
            ]}>
              <Ionicons
                name={resultModal?.type === 'added' ? 'checkmark' : 'layers-outline'}
                size={26}
                color={colors.gold}
              />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>
              {resultModal?.type === 'added' ? 'Added to Your Bar' : 'Already Logged'}
            </Text>

            {/* XP badge */}
            {resultModal?.type === 'added' && resultModal.xp > 0 && (
              <View style={styles.modalXPBadge}>
                <Ionicons name="flash" size={12} color={colors.goldText} />
                <Text style={styles.modalXPText}>+{resultModal.xp} XP earned</Text>
              </View>
            )}

            {/* Added pills */}
            {resultModal?.addedNames && resultModal.addedNames.length > 0 && (
              <View style={styles.modalPills}>
                {resultModal.addedNames.map((name, i) => (
                  <View key={i} style={styles.modalPill}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.gold} />
                    <Text style={styles.modalPillText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Duplicate note */}
            {resultModal?.duplicates && resultModal.duplicates.length > 0 && (
              <Text style={styles.modalDuplicateNote}>
                {resultModal.type === 'duplicate'
                  ? `${resultModal.duplicates.join(', ')} ${resultModal.duplicates.length === 1 ? 'is' : 'are'} already in your inventory.`
                  : `${resultModal.duplicates.join(', ')} already logged.`
                }
              </Text>
            )}

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Actions */}
            <TouchableOpacity
              style={styles.modalActionPrimary}
              onPress={() => {
                setResultModal(null);
                navigation.navigate('HomeBar');
              }}
              activeOpacity={0.82}
            >
              <Ionicons name="wine-outline" size={17} color={colors.goldText} />
              <Text style={styles.modalActionPrimaryText}>View Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSecondary}
              onPress={() => {
                setResultModal(null);
                setScannedIngredients([]);
                setImageUri(null);
                setCurrentIngredients([]);
                setSuggestedCocktails([]);
                setCameraVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={17} color={colors.gold} />
              <Text style={styles.modalActionSecondaryText}>Scan More</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionGhost}
              onPress={() => {
                setResultModal(null);
                navigation.goBack();
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.modalActionGhostText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Empty
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(5),
    paddingBottom: spacing(6),
    alignItems: 'center',
  },
  emptyHero: { alignItems: 'center', marginBottom: spacing(5) },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2.5),
  },
  emptyTitle: {
    fontFamily: serif,
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  worksWithCard: {
    marginTop: spacing(4),
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
  },
  worksWithLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(1.5),
  },
  worksWithRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  worksWithChip: {
    backgroundColor: `${colors.gold}15`,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderWidth: 1,
    borderColor: `${colors.gold}25`,
  },
  worksWithChipText: { fontSize: 13, color: colors.gold, fontWeight: '600' },

  // Analysing
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
  },
  analyzingTitle: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  analyzingSubtitle: { fontSize: 14, color: colors.subtext },

  // Result
  resultContent: { paddingBottom: spacing(8) },
  resultImageWrap: { height: 240, position: 'relative' },
  resultImage: { width: '100%', height: '100%' },
  resultImageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  resultBody: { paddingHorizontal: spacing(3), paddingTop: spacing(2) },

  scannedStripWrap: { marginBottom: spacing(1) },
  scannedStrip: {
    paddingHorizontal: spacing(3),
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  scannedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: `${colors.gold}15`,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderWidth: 1,
    borderColor: `${colors.gold}25`,
  },
  scannedPillText: { fontSize: 12, color: colors.gold, fontWeight: '600' },

  detectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(2),
  },
  detectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  detectionName: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: spacing(0.25),
  },
  detectionCategory: { fontSize: 13, color: colors.subtext, textTransform: 'capitalize' },
  confidenceBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
  },
  confidenceHigh: { backgroundColor: `${colors.gold}20`, borderWidth: 1, borderColor: `${colors.gold}40` },
  confidenceMed: { backgroundColor: `${colors.subtext}15`, borderWidth: 1, borderColor: `${colors.subtext}25` },
  confidenceBadgeText: { fontSize: 13, fontWeight: '700', color: colors.gold },

  contextCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(3),
    gap: spacing(2.5),
  },
  contextHeader: { flexDirection: 'row', alignItems: 'center' },
  contextRolePill: {
    backgroundColor: `${colors.gold}18`,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  contextRoleText: { fontSize: 13, fontWeight: '700', color: colors.gold },
  techniquesSection: { gap: spacing(1.5) },
  techniquesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing(0.5),
  },
  techniqueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1.25) },
  techniqueDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
    marginTop: 7,
    flexShrink: 0,
  },
  techniqueText: { fontSize: 14, color: colors.text, lineHeight: 20, flex: 1 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.25),
    backgroundColor: `${colors.gold}0C`,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.gold}18`,
  },
  tipText: { fontSize: 13, color: colors.subtext, lineHeight: 19, flex: 1 },

  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingVertical: spacing(2),
    justifyContent: 'center',
  },
  suggestionsLoadingText: { fontSize: 14, color: colors.subtext },
  suggestionsSection: { marginBottom: spacing(3) },
  suggestionsTitleRow: { marginBottom: spacing(2) },
  suggestionsTitle: {
    fontFamily: serif,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionsSubtitle: { fontSize: 13, color: colors.subtext, marginTop: 2, textTransform: 'capitalize' },
  suggestionsScroll: { gap: spacing(2), paddingRight: spacing(1) },
  suggestionCardWrap: { position: 'relative' },
  matchBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.4),
    zIndex: 10,
  },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: colors.goldText },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(2),
    backgroundColor: `${colors.gold}12`,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: `${colors.gold}25`,
  },
  upgradeText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.gold },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(3),
    marginBottom: spacing(1),
    backgroundColor: `${colors.gold}10`,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
  },
  upgradePromptTitle: { fontSize: 14, fontWeight: '700', color: colors.gold, marginBottom: 2 },
  upgradePromptSub: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  suggestionsEmpty: { paddingVertical: spacing(3), alignItems: 'center' },
  suggestionsEmptyText: { color: colors.muted, fontSize: 13 },

  actions: { gap: spacing(2), marginTop: spacing(1) },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    gap: spacing(1.25),
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.goldText },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.gold,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    gap: spacing(1.25),
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.gold },

  // Result modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
    padding: spacing(3),
    alignItems: 'center',
    // Elevation shadow
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  modalIconRingSuccess: {
    backgroundColor: 'rgba(214,138,56,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.35)',
  },
  modalIconRingInfo: {
    backgroundColor: 'rgba(214,138,56,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
  },
  modalTitle: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  modalXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    marginBottom: spacing(2),
  },
  modalXPText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.goldText,
    letterSpacing: 0.3,
  },
  modalPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.22)',
  },
  modalPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  modalDuplicateNote: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing(2),
    paddingHorizontal: spacing(1),
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.line,
    marginBottom: spacing(2),
  },
  modalActionPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.75),
    marginBottom: spacing(1.25),
  },
  modalActionPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
  },
  modalActionSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    paddingVertical: spacing(1.75),
    borderWidth: 1.5,
    borderColor: colors.gold,
    marginBottom: spacing(1.25),
  },
  modalActionSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold,
  },
  modalActionGhost: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
  },
  modalActionGhostText: {
    fontSize: 15,
    color: colors.subtext,
    fontWeight: '500',
  },
});
