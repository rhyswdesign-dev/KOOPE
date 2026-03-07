import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import GroceryListModal from '../components/GroceryListModal';
import { useChallengeProgress } from '../hooks/useChallengeProgress';
import { useUserTier } from '../store/useUserTier';
import { useXPSystem } from '../store/useXPSystem';
import { canAccessContent } from '../utils/tierAccess';
import { log } from '../lib/logger';
import type { FlavorProfile } from '../types/userProfile';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { logRecipeCompletion, updateCompletionRating, syncCompletionToSupabase } from '../services/recipeCompletionService';
import { getCompletionPromptConfig, tierToCompletionPlan } from '../lib/completions/brandCapture';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';
import type { RecipeCompletionDetails } from '../types/userProfile';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { recipeService as supabaseRecipeService } from '../lib/supabaseData';
import RatioBalanceEditor from '../components/ratio/RatioBalanceEditor';
import {
  applyRatioProfileToIngredients,
  RatioEditorState,
  RatioProfile,
} from '../utils/ratioEngine';

interface RecipeIngredientEntry {
  key: string;
  name: string;
  amount: string;
}

export default function RecipeDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { user } = useAuth();
  const recipe = (route.params as any)?.recipe;
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const { trackRecipeViewed } = useChallengeProgress();
  const { earnRecipeViewedXP, earnCocktailLoggedXP, earnRecipeRatingXP } = useXPSystem();
  const [proTipsOpen, setProTipsOpen] = useState(false);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const { tier } = useUserTier();
  const [makeFlowVisible, setMakeFlowVisible] = useState(false);
  const [ratingFlowVisible, setRatingFlowVisible] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [isSavingRatios, setIsSavingRatios] = useState(false);
  const [inventoryOptions, setInventoryOptions] = useState<string[]>([]);
  const [brandSelections, setBrandSelections] = useState<Record<string, string>>({});
  const [substitutions, setSubstitutions] = useState('');
  const [techniqueVariations, setTechniqueVariations] = useState('');
  const [personalModifications, setPersonalModifications] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [lastCompletionId, setLastCompletionId] = useState<string | null>(null);
  const [ratioProfile, setRatioProfile] = useState<RatioProfile | null>(
    (recipe?.ratio_profile as RatioProfile | null) || null
  );
  const [ratioEstimated, setRatioEstimated] = useState(Boolean(recipe?.ratio_estimated));
  const [ratioEditorState, setRatioEditorState] = useState<RatioEditorState>(
    (recipe?.ratio_editor_state as RatioEditorState) || {
      spirit: 50,
      sweet: 50,
      acid: 50,
      dilution: 50,
    }
  );
  const [showRatioEditor, setShowRatioEditor] = useState(false);
  const completionConfig = getCompletionPromptConfig(tierToCompletionPlan(tier));
  const hasBatching = canAccessContent(tier, 'PLUS');
  const showFlavorTags = canAccessContent(tier, 'PLUS');
  const showTasteMatch = canAccessContent(tier, 'PLUS');
  const { gate: flavorTagsGate } = useFeatureAccess('flavor_tags_visible');
  const { gateWithTrigger: hostingBasicGate } = useFeatureAccess('party_scaling');
  const { gateWithTrigger: hostingAdvancedGate } = useFeatureAccess('hosting_advanced');

  // Extract flavor tags and taste match from recipe data
  const flavorTags: FlavorProfile[] = useMemo(() => {
    if (!recipe) return [];
    return recipe.flavorProfiles || recipe.flavorTags || [];
  }, [recipe]);

  const recipeIngredients = useMemo<RecipeIngredientEntry[]>(
    () =>
      (recipe?.ingredients || recipe?.tags || []).map((item: any, index: number) => {
        const ingredient = typeof item === 'string' ? item : (item.name || item);
        const amount = typeof item === 'string' ? '' : (item.amount || '');
        return {
          key: `${index}_${String(ingredient).toLowerCase()}`,
          name: String(ingredient),
          amount: String(amount || ''),
        };
      }),
    [recipe]
  );

  const tasteMatchPercent: number | undefined = recipe?.tasteMatchPercent;

  // Serif font family helper
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

  // Track recipe view for challenges + award XP (10 XP, capped at 5 views/day)
  useEffect(() => {
    if (recipe?.id) {
      trackRecipeViewed(recipe.id).catch(error => {
        log.error('RecipeDetailScreen', 'Error tracking recipe view', error);
      });
      earnRecipeViewedXP();
    }
  }, [recipe?.id]);

  if (!recipe) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => nav.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      let message = `Check out this ${recipe.name || recipe.title} recipe!`;
      if (recipe.description) message += ` ${recipe.description}`;
      if (recipe.sourceUrl) message += ` Source: ${recipe.sourceUrl}`;

      await Share.share({
        message,
        title: `${recipe.name || recipe.title} Recipe`,
      });
    } catch (error) {
      log.error('RecipeDetailScreen', 'Error sharing recipe', error, { recipeTitle: recipe.title });
    }
  };

  const handleSaveRatioBalance = async (nextProfile: RatioProfile, nextEditorState: RatioEditorState) => {
    if (!recipe?.id) {
      Alert.alert('Not Available', 'This recipe cannot be updated yet.');
      return;
    }

    const originalIngredients = recipeIngredients.map((item) => ({
      name: item.name,
      amount: item.amount,
    }));
    const updatedIngredients = applyRatioProfileToIngredients(originalIngredients, nextProfile);

    try {
      setIsSavingRatios(true);
      const success = await supabaseRecipeService.update(recipe.id, {
        ingredients: updatedIngredients.map((item) => `${item.amount} ${item.name}`),
        ratio_profile: nextProfile,
        ratio_estimated: false,
        ratio_editor_state: nextEditorState,
      });

      if (!success) {
        throw new Error('Failed to save balance changes');
      }

      setRatioProfile(nextProfile);
      setRatioEditorState(nextEditorState);
      setRatioEstimated(false);
      setShowRatioEditor(false);

      (nav as any).setParams({
        recipe: {
          ...recipe,
          ingredients: updatedIngredients,
          ratio_profile: nextProfile,
          ratio_estimated: false,
          ratio_editor_state: nextEditorState,
        },
      });
      Alert.alert('Saved', 'Recipe balance has been updated.');
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Could not save ratio balance.');
    } finally {
      setIsSavingRatios(false);
    }
  };

  const handleFlavorTagsLockedPress = () => {
    flavorTagsGate();
  };

  const handleBatchMultiplierPress = (mult: number) => {
    if (mult > 4) {
      hostingAdvancedGate('T7', () => setBatchMultiplier(mult));
      return;
    }
    setBatchMultiplier(mult);
  };

  const handleBatchLockedPress = () => {
    hostingBasicGate('T6');
  };

  const normalizeText = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const getSuggestionsForIngredient = (ingredientName: string): string[] => {
    const needle = normalizeText(ingredientName);
    if (!needle) return [];

    const tokens = needle.split(' ').filter(Boolean);
    return inventoryOptions
      .filter((option) => {
        const normalizedOption = normalizeText(option);
        if (normalizedOption.includes(needle)) return true;
        return tokens.some((token) => token.length >= 3 && normalizedOption.includes(token));
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
      if (!user?.id || !recipe?.id) return;

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
          .findIndex((entry) => entry.recipeId === recipe.id);

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
        } else {
          interactionHistory.completedRecipes.push({
            recipeId: recipe.id,
            timestamp: new Date(),
            rating: rating || undefined,
            feedback: rating ? (rating >= 4 ? 'loved' : rating >= 3 ? 'liked' : 'disliked') : undefined,
            completionId: completionId || undefined,
            completionDetails: completionDetails || undefined,
          });
        }
      } else {
        interactionHistory.completedRecipes.push({
          recipeId: recipe.id,
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
      log.warn('RecipeDetailScreen', 'Failed to sync completion to profile (non-blocking)', error);
    }
  };

  const loadInventoryOptions = async () => {
    if (!user?.id) {
      setInventoryOptions([]);
      return;
    }

    try {
      setInventoryLoading(true);
      const inventory = await InventoryService.getUserInventory(user.id);
      const options = Array.from(
        new Set(
          inventory
            .map((item) => item.item_name)
            .filter((name): name is string => Boolean(name))
            .map((name) => name.trim())
            .filter(Boolean)
        )
      );
      setInventoryOptions(options);
    } catch (error) {
      log.error('RecipeDetailScreen', 'Failed to load inventory options', error);
      setInventoryOptions([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const openMakeFlow = async () => {
    setBrandSelections({});
    setSubstitutions('');
    setTechniqueVariations('');
    setPersonalModifications('');
    setCompletionNotes('');
    setSelectedRating(0);
    setMakeFlowVisible(true);
    await loadInventoryOptions();
  };

  const handleSelectSuggestion = (ingredientKey: string, suggestion: string) => {
    setBrandSelections((prev) => ({ ...prev, [ingredientKey]: suggestion }));
  };

  const handleLogCompletion = async () => {
    if (!recipe) return;

    try {
      setIsSavingCompletion(true);

      const ingredientBrands = recipeIngredients.map((ingredient) => ({
        ingredient: ingredient.name,
        amount: ingredient.amount || undefined,
        brandUsed: (brandSelections[ingredient.key] || '').trim() || 'Not specified',
      }));

      const completion = await logRecipeCompletion({
        userId: user?.id,
        recipeId: recipe.id,
        recipeName: recipe.name || recipe.title || 'Recipe',
        userTier: tierToCompletionPlan(tier),
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

      const isDetailed =
        ingredientBrands.some((item) => item.brandUsed !== 'Not specified') ||
        Boolean(substitutions.trim()) ||
        Boolean(techniqueVariations.trim()) ||
        Boolean(personalModifications.trim());

      earnCocktailLoggedXP(isDetailed, recipe.name || recipe.title || 'Recipe');
      await syncRecipeCompletionToProfile(undefined, false, completionDetails, completion.id);

      setMakeFlowVisible(false);
      Alert.alert(
        'Logged',
        `${recipe.name || recipe.title} added to your made drinks.`,
        [
          { text: 'Done', style: 'cancel' },
          { text: 'How was it?', onPress: () => setRatingFlowVisible(true) },
        ]
      );
    } catch (error) {
      log.error('RecipeDetailScreen', 'Failed to log recipe completion', error);
      Alert.alert('Error', 'Could not log this drink. Please try again.');
    } finally {
      setIsSavingCompletion(false);
    }
  };

  const handleSaveRating = async () => {
    if (!lastCompletionId || selectedRating <= 0) {
      setRatingFlowVisible(false);
      return;
    }

    try {
      await updateCompletionRating(lastCompletionId, selectedRating, completionNotes.trim() || undefined);
      earnRecipeRatingXP(recipe?.name || recipe?.title || 'Recipe');
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
      setRatingFlowVisible(false);
      Alert.alert('Thanks', 'Your feedback was saved.');
    } catch (error) {
      log.error('RecipeDetailScreen', 'Failed to save completion rating', error);
      Alert.alert('Error', 'Could not save rating. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>

        {/* --- Hero Section --- */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: recipe.image || recipe.imageUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop' }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(26, 18, 13, 0.8)', '#1A120D']}
            style={styles.heroGradient}
          >
            <Text style={[styles.heroTitle, { fontFamily: serifFont }]}>
              {recipe.name || recipe.title}
            </Text>

            {/* Metadata Row */}
            <View style={styles.metaRow}>
              {recipe.time && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={colors.subtext} />
                  <Text style={styles.metaText}>{recipe.time}</Text>
                </View>
              )}
              {recipe.difficulty && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="chart-bar" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>{recipe.difficulty}</Text>
                  </View>
                </>
              )}
              {recipe.glassware && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="glass-cocktail" size={16} color={colors.subtext} />
                    <Text style={styles.metaText}>{recipe.glassware || 'Coupe'}</Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>

          {/* Back Button (Absolute) */}
          <TouchableOpacity style={styles.backButtonAbsolute} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          {/* Share Button (Absolute) */}
          <TouchableOpacity style={styles.shareButtonAbsolute} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* --- Action Buttons --- */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={openMakeFlow}>
            <Text style={styles.primaryButtonText}>I Made This</Text>
          </TouchableOpacity>
          {ratioProfile ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowRatioEditor(true)}
              disabled={isSavingRatios}
            >
              <Text style={styles.secondaryButtonText}>
                {ratioEstimated ? 'Adjust Estimated Ratio' : 'Edit Ratio Balance'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* --- Taste Match & Flavor Tags (PLUS+ only) --- */}
        {showTasteMatch && tasteMatchPercent !== undefined && (
          <View style={styles.tasteMatchSection}>
            <View style={styles.tasteMatchRow}>
              <Ionicons name="heart" size={18} color={getTasteMatchColor(tasteMatchPercent)} />
              <Text style={[styles.tasteMatchLabel, { color: getTasteMatchColor(tasteMatchPercent) }]}>
                {tasteMatchPercent}% Taste Match
              </Text>
            </View>
            <Text style={styles.tasteMatchDesc}>
              {tasteMatchPercent >= 80
                ? 'Great match for your palate'
                : tasteMatchPercent >= 60
                ? 'Good match — worth trying'
                : 'Something different for you'}
            </Text>
          </View>
        )}

        {showFlavorTags && flavorTags.length > 0 && (
          <View style={styles.flavorTagSection}>
            {flavorTags.map((tag) => (
              <View key={tag} style={styles.flavorTagChip}>
                <Text style={styles.flavorTagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {!showFlavorTags && flavorTags.length > 0 && (
          <TouchableOpacity
            style={styles.flavorTagLockedRow}
            activeOpacity={0.8}
            onPress={handleFlavorTagsLockedPress}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.gold} />
            <Text style={styles.flavorTagLockedText}>
              {flavorTags.length} flavor tags — unlock with KOOPE+
            </Text>
          </TouchableOpacity>
        )}

        {/* --- Ingredients --- */}
        <View style={styles.section}>
          <View style={styles.ingrHeader}>
            <Text style={[styles.sectionHeader, { fontFamily: serifFont, marginBottom: 0 }]}>Ingredients</Text>
            <View style={styles.ingrCountBadge}>
              <Text style={styles.ingrCountText}>
                {(recipe.ingredients || recipe.tags || []).length}
              </Text>
            </View>
          </View>
          <View style={styles.ingrContainer}>
            {(recipe.ingredients || recipe.tags || []).map((item: any, index: number) => {
              const name = typeof item === 'string' ? item : (item.name || item);
              const amount = typeof item === 'string' ? '' : item.amount;
              const notes = typeof item === 'string' ? '' : item.notes;
              const total = (recipe.ingredients || recipe.tags || []).length;
              const isLast = index === total - 1;

              return (
                <View key={index}>
                  <View style={styles.ingrRow}>
                    <View style={styles.ingrAmountPill}>
                      <Text style={styles.ingrAmountText} numberOfLines={2} adjustsFontSizeToFit>
                        {amount || '—'}
                      </Text>
                    </View>
                    <View style={styles.ingrInfo}>
                      <Text style={styles.ingrName}>{name}</Text>
                      {notes ? <Text style={styles.ingrNotes}>{notes}</Text> : null}
                    </View>
                  </View>
                  {!isLast && <View style={styles.ingrDivider} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* --- Instructions --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { fontFamily: serifFont }]}>Instructions</Text>
          <View style={styles.instructionsList}>
            {/* If instructions is an array */}
            {Array.isArray(recipe.instructions) ? (
              recipe.instructions.map((step: string, index: number) => (
                <View key={index} style={styles.instructionRow}>
                  <Text style={[styles.stepNumber, { fontFamily: serifFont }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            ) : recipe.description ? (
              // Fallback if no structured instructions, try to split description or just show it
              <View style={styles.instructionRow}>
                <Text style={[styles.stepNumber, { fontFamily: serifFont }]}>01</Text>
                <Text style={styles.stepText}>{recipe.description}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* --- Batch Calculator (PLUS/PRO only) --- */}
        {hasBatching && (recipe.ingredients || recipe.tags) && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { fontFamily: serifFont }]}>Batch Calculator</Text>
            <View style={styles.batchChips}>
              {[1, 2, 4, 8].map((mult) => (
                <TouchableOpacity
                  key={mult}
                  style={[
                    styles.batchChip,
                    batchMultiplier === mult && styles.batchChipActive,
                  ]}
                  onPress={() => handleBatchMultiplierPress(mult)}
                >
                  <Text style={[
                    styles.batchChipText,
                    batchMultiplier === mult && styles.batchChipTextActive,
                  ]}>
                    {mult === 1 ? 'Single' : `${mult}x`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {batchMultiplier > 1 && (
              <View style={styles.batchResult}>
                {(recipe.ingredients || recipe.tags || []).map((item: any, index: number) => {
                  const name = typeof item === 'string' ? item : (item.name || item);
                  const amount = typeof item === 'string' ? '' : item.amount;

                  // Try to scale numeric amounts
                  let scaledAmount = amount;
                  if (amount) {
                    const numericMatch = String(amount).match(/^([\d.\/]+)\s*(.*)/);
                    if (numericMatch) {
                      let numVal = 0;
                      const rawNum = numericMatch[1];
                      if (rawNum.includes('/')) {
                        const parts = rawNum.split('/');
                        numVal = Number(parts[0]) / Number(parts[1]);
                      } else {
                        numVal = Number(rawNum);
                      }
                      if (!isNaN(numVal)) {
                        const scaled = numVal * batchMultiplier;
                        const unit = numericMatch[2] || '';
                        scaledAmount = `${scaled % 1 === 0 ? scaled : scaled.toFixed(1)} ${unit}`.trim();
                      }
                    }
                  }

                  return (
                    <View key={index} style={styles.batchRow}>
                      <Text style={styles.batchIngredient}>{name}</Text>
                      <Text style={styles.batchAmount}>
                        {scaledAmount || `${batchMultiplier}x`}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.batchNote}>
                  Serves ~{batchMultiplier} {batchMultiplier === 1 ? 'drink' : 'drinks'}
                </Text>
              </View>
            )}
          </View>
        )}

        {!hasBatching && (recipe.ingredients || recipe.tags) && (
          <TouchableOpacity
            style={styles.batchLockedSection}
            activeOpacity={0.8}
            onPress={handleBatchLockedPress}
          >
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.gold} />
            <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
              <Text style={styles.batchLockedTitle}>Batch Calculator</Text>
              <Text style={styles.batchLockedSub}>Upgrade to KOOPE+ to scale recipes for parties</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        )}

        {/* --- Pro Tips (Accordion) --- */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.proTipsHeader}
            onPress={() => setProTipsOpen(!proTipsOpen)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.accent} />
              <Text style={[styles.proTipsTitle, { fontFamily: serifFont }]}>Pro Tips</Text>
            </View>
            <Ionicons name={proTipsOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.subtext} />
          </TouchableOpacity>

          {proTipsOpen && (
            <View style={styles.proTipsContent}>
              <Text style={styles.proTipsText}>
                Use large-format ice to minimize dilution while keeping the drink freezing cold.
                {'\n\n'}
                Expressing the orange twist over the glass adds essential aromatic oils that enhance the first sip.
              </Text>
            </View>
          )}
        </View>

        {/* --- AI Support --- */}
        <View style={styles.aiSupportSection}>
          <Text style={styles.aiSupportHeader}>AI SUPPORT</Text>
          <View style={styles.aiButtonsRow}>
            <TouchableOpacity style={styles.aiButton}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.accent} />
              <Text style={styles.aiButtonTitle}>Find Ingredient Substitutes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.aiButton}>
              <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
              <Text style={styles.aiButtonTitle}>Customize This Recipe</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra bottom padding */}
        <View style={{ height: 40 }} />

      </ScrollView>

      {/* Grocery List Modal */}
      {(recipe.ingredients || recipe.tags) && (
        <GroceryListModal
          visible={groceryListVisible}
          onClose={() => setGroceryListVisible(false)}
          recipeName={recipe.name || recipe.title || 'Recipe'}
          ingredients={
            (recipe.ingredients || recipe.tags || []).map((item: any) =>
              typeof item === 'string'
                ? item
                : `${item.amount ? item.amount + ' ' : ''}${item.name || item}`
            )
          }
          recipeId={recipe.id}
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
              {inventoryLoading && (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.inlineLoadingText}>Loading inventory brands...</Text>
                </View>
              )}

              {recipeIngredients.map((ingredient) => {
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
                            onPress={() => handleSelectSuggestion(ingredient.key, suggestion)}
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

      <Modal
        visible={showRatioEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatioEditor(false)}
      >
        <View style={styles.ratioModalBackdrop}>
          <View style={styles.ratioModalCard}>
            {ratioProfile ? (
              <RatioBalanceEditor
                profile={ratioProfile}
                initialState={ratioEditorState}
                onCancel={() => setShowRatioEditor(false)}
                onSave={handleSaveRatioBalance}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getTasteMatchColor(percent: number): string {
  if (percent >= 80) return '#4CAF50';
  if (percent >= 60) return '#FFC107';
  return '#FF9800';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  // Hero
  heroContainer: {
    width: '100%',
    height: 480, // Tall hero image
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
    // fontWeight is handled by font family usually, but adding weight for fallback
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
  shareButtonAbsolute: {
    position: 'absolute',
    top: 60,
    right: spacing(3),
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
    color: '#FFF', // Always white on gold
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

  // Ingredients — "Bar Measure" layout
  ingrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  ingrCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent + '1A',
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ingrCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  ingrContainer: {
    backgroundColor: '#201510',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent + '55',
    overflow: 'hidden',
  },
  ingrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    paddingRight: spacing(2.5),
    paddingLeft: spacing(2),
    gap: spacing(2),
  },
  ingrAmountPill: {
    width: 62,
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: colors.accent + '16',
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  ingrAmountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  ingrInfo: {
    flex: 1,
  },
  ingrName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
  },
  ingrNotes: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    lineHeight: 16,
  },
  ingrDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing(2),
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: spacing(2),
  },
  // Legacy ingredient styles (kept for batch calculator)
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
    // fontStyle: 'italic', // Optional
    lineHeight: 40,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    paddingTop: 8, // Align with number visually
  },

  // Pro Tips
  proTipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#261C16',
    padding: spacing(2.5),
    borderRadius: radii.lg,
  },
  proTipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  proTipsContent: {
    backgroundColor: '#261C16',
    marginTop: 2, // Tiny gap
    padding: spacing(2.5),
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  proTipsText: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
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
    height: 120, // Taller cards
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

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginTop: spacing(2),
  },
  backButton: {
    marginTop: spacing(3),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
  },
  backButtonText: {
    color: colors.bg,
    fontWeight: '700',
  },

  // Batch Calculator
  batchChips: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  batchChip: {
    flex: 1,
    paddingVertical: spacing(1.5),
    backgroundColor: '#261C16',
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  batchChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batchChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.subtext,
  },
  batchChipTextActive: {
    color: '#FFF',
  },
  batchResult: {
    backgroundColor: '#261C16',
    borderRadius: radii.lg,
    padding: spacing(2),
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  batchIngredient: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  batchAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'right',
  },
  batchNote: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(1.5),
    textAlign: 'center',
  },
  batchLockedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing(3),
    marginTop: spacing(4),
    backgroundColor: '#261C16',
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  batchLockedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  batchLockedSub: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 2,
  },

  // Taste Match
  tasteMatchSection: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(3),
  },
  tasteMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  tasteMatchLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  tasteMatchDesc: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
  },

  // Flavor Tags
  flavorTagSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
  },
  flavorTagChip: {
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
  },
  flavorTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'capitalize',
  },
  flavorTagLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
  },
  flavorTagLockedText: {
    fontSize: 13,
    color: colors.subtext,
  },

  // Make flow modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing(2),
  },
  ratioModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing(2),
  },
  ratioModalCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
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
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  inlineLoadingText: {
    fontSize: 12,
    color: colors.subtext,
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

  // Rating modal
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
});
