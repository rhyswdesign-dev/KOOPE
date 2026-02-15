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
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import GroceryListModal from '../components/GroceryListModal';
import { useChallengeProgress } from '../hooks/useChallengeProgress';
import { useUserTier } from '../store/useUserTier';
import { canAccessContent } from '../utils/tierAccess';
import { log } from '../lib/logger';
import type { FlavorProfile } from '../types/userProfile';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const recipe = (route.params as any)?.recipe;
  const [groceryListVisible, setGroceryListVisible] = useState(false);
  const { trackRecipeViewed } = useChallengeProgress();
  const [proTipsOpen, setProTipsOpen] = useState(false);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const { tier } = useUserTier();
  const hasBatching = canAccessContent(tier, 'PLUS');
  const showFlavorTags = canAccessContent(tier, 'PLUS');
  const showTasteMatch = canAccessContent(tier, 'PLUS');

  // Extract flavor tags and taste match from recipe data
  const flavorTags: FlavorProfile[] = useMemo(() => {
    if (!recipe) return [];
    return recipe.flavorProfiles || recipe.flavorTags || [];
  }, [recipe]);

  const tasteMatchPercent: number | undefined = recipe?.tasteMatchPercent;

  // Serif font family helper
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

  // Track recipe view for challenges
  useEffect(() => {
    if (recipe?.id) {
      trackRecipeViewed(recipe.id).catch(error => {
        log.error('RecipeDetailScreen', 'Error tracking recipe view', error);
      });
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
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Make This Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>I Made This</Text>
          </TouchableOpacity>
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
            onPress={() => nav.navigate('Paywall' as any, { source: 'flavor_tags' })}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.gold} />
            <Text style={styles.flavorTagLockedText}>
              {flavorTags.length} flavor tags — unlock with KOOPE+
            </Text>
          </TouchableOpacity>
        )}

        {/* --- Ingredients --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { fontFamily: serifFont }]}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {(recipe.ingredients || recipe.tags || []).map((item: any, index: number) => {
              const name = typeof item === 'string' ? item : (item.name || item);
              const amount = typeof item === 'string' ? '' : item.amount;
              const notes = typeof item === 'string' ? '' : item.notes;

              // Simple icon logic based on keywords
              let iconName: any = 'bottle-tonic-plus';
              const lowerName = name.toLowerCase();
              if (lowerName.includes('gin')) iconName = 'bottle-tonic';
              else if (lowerName.includes('vermouth')) iconName = 'bottle-wine';
              else if (lowerName.includes('campari')) iconName = 'bottle-wine'; // or a generic bottle
              else if (lowerName.includes('orange') || lowerName.includes('lemon') || lowerName.includes('lime')) iconName = 'fruit-citrus';
              else if (lowerName.includes('ice')) iconName = 'cube-outline';
              else if (lowerName.includes('syrup')) iconName = 'water-outline';
              else if (lowerName.includes('garnish')) iconName = 'leaf';
              else if (lowerName.includes('bitters')) iconName = 'water';

              return (
                <View key={index} style={styles.ingredientRow}>
                  <View style={styles.ingredientIconBox}>
                    <MaterialCommunityIcons name={iconName} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{name}</Text>
                    {(amount || notes) && (
                      <Text style={styles.ingredientDetail}>
                        {amount}{amount && notes ? ' • ' : ''}{notes}
                      </Text>
                    )}
                  </View>
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
                  onPress={() => setBatchMultiplier(mult)}
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
            onPress={() => nav.navigate('Paywall' as any, { source: 'batch_calculator' })}
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
              <MaterialCommunityIcons name="wand" size={20} color={colors.accent} />
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

  // Ingredients
  ingredientsList: {
    gap: spacing(1.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261C16', // Slightly lighter than bg, matches mock
    padding: spacing(2),
    borderRadius: radii.xl, // Pill-ish shape
  },
  ingredientIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(214, 138, 56, 0.15)', // low opacity gold
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
});