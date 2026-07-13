import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, fonts, serif } from '../theme/tokens';
import { usePersonalization } from '../store/usePersonalization';
import { useAuth } from '../contexts/AuthContext';
import { useUserTier } from '../store/useUserTier';
import { trackEvent } from '../lib/analytics';
import { log } from '../lib/logger';
import { ALL_COCKTAILS } from '../data/cocktails';
import RecipeCard from '../components/RecipeCard';
import { createRecipeCardProps, handleRecipeView } from '../utils/recipeActions';
import { createDefaultUserProfile, getABVRangeForPreference } from '../types/userProfile';
import {
  clearOverrides,
  generateRadarChart,
  getEffectiveTasteProfile,
  initializeTasteGraph,
  setFlavorOverride,
  setSpiritOverride,
} from '../services/tasteGraphService';
import { detectSeason, detectTimeOfDay, getPredictiveRecommendations } from '../services/predictiveEngine';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';

type Props = NativeStackScreenProps<RootStackParamList, 'RefineYourTaste'>;

const FLAVOR_KEYS = [
  { key: 'citrus', label: 'Citrus' },
  { key: 'herbal', label: 'Herbal' },
  { key: 'bitter', label: 'Bitter' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'smoky', label: 'Smoky' },
  { key: 'floral', label: 'Floral' },
  { key: 'spiced', label: 'Spiced' },
];

const SPIRIT_KEYS = [
  { key: 'tequila', label: 'Tequila' },
  { key: 'whiskey', label: 'Whiskey' },
  { key: 'rum', label: 'Rum' },
  { key: 'gin', label: 'Gin' },
  { key: 'vodka', label: 'Vodka' },
  { key: 'brandy', label: 'Brandy' },
  { key: 'liqueurs', label: 'Liqueurs' },
];

const OCCASION_MODES = [
  { key: 'casual', title: 'Casual', body: 'Easygoing picks for a normal night in.' },
  { key: 'hosting', title: 'Hosting', body: 'Recommendations that play well for guests and shared menus.' },
  { key: 'adventurous', title: 'Adventurous', body: 'Pushes the feed toward bolder, more surprising builds.' },
];

const ABV_MODES = [
  { key: 'zero-proof', title: 'Zero-Proof' },
  { key: 'low-abv', title: 'Low ABV' },
  { key: 'alcoholic', title: 'Standard' },
];

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function orderedTopKeys(weights: Record<string, number>, limit: number) {
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function abvPreferenceFromRange(range: { min: number; max: number }) {
  if (range.max <= 0.5) return 'zero-proof';
  if (range.max <= 15) return 'low-abv';
  return 'alcoholic';
}

function isZeroProofRecipe(recipe: any) {
  const description = String(recipe?.description || '').toLowerCase();
  const subtitle = String(recipe?.subtitle || '').toLowerCase();
  const base = String(recipe?.base || recipe?.baseSpirit || '').toLowerCase();
  const recipeType = String(recipe?.recipeType || '').toLowerCase();
  const tags = Array.isArray(recipe?.tags) ? recipe.tags.map((tag: string) => String(tag).toLowerCase()) : [];
  const abv = typeof recipe?.abv === 'number' ? recipe.abv : null;

  return (
    base === 'zero-proof' ||
    recipeType === 'mocktail' ||
    tags.includes('mocktail') ||
    description.includes('zero-proof') ||
    description.includes('non-alcoholic') ||
    description.includes('alcohol-free') ||
    subtitle.includes('zero-proof') ||
    abv === 0
  );
}

function describeBias(label: string, value: number, isOverridden: boolean) {
  const percent = Math.round(value * 100);
  const prefix = isOverridden ? 'Manual bias.' : 'Learned signal.';

  if (percent >= 80) return `${prefix} ${percent}% ${label.toLowerCase()} means KOOPE should lean hard into drinks where ${label.toLowerCase()} leads the experience.`;
  if (percent >= 60) return `${prefix} ${percent}% ${label.toLowerCase()} means you consistently respond well when ${label.toLowerCase()} is a clear note, not just a background accent.`;
  if (percent >= 40) return `${prefix} ${percent}% ${label.toLowerCase()} means you like some presence here, but it does not need to dominate the drink.`;
  if (percent >= 20) return `${prefix} ${percent}% ${label.toLowerCase()} means this works best as a supporting note rather than the main identity.`;
  return `${prefix} ${percent}% ${label.toLowerCase()} means KOOPE should keep this restrained unless the rest of the profile strongly supports it.`;
}

function buildGraphFromPersonalization(profile: any) {
  return initializeTasteGraph({
    flavorWeights: {
      citrus: (profile?.flavorScores?.citrus || 35) / 100,
      herbal: (profile?.flavorScores?.herbal || 35) / 100,
      bitter: (profile?.flavorScores?.bitter || 35) / 100,
      sweet: (profile?.flavorScores?.sweet || 35) / 100,
      smoky: (profile?.flavorScores?.smoky || 35) / 100,
      floral: (profile?.flavorScores?.floral || 35) / 100,
      spiced: (profile?.flavorScores?.spiced || 35) / 100,
    },
    spiritWeights: {
      tequila: (profile?.spiritScores?.tequila || 25) / 100,
      whiskey: (profile?.spiritScores?.whiskey || 25) / 100,
      rum: (profile?.spiritScores?.rum || 25) / 100,
      gin: (profile?.spiritScores?.gin || 25) / 100,
      vodka: (profile?.spiritScores?.vodka || 25) / 100,
      brandy: (profile?.spiritScores?.brandy || 25) / 100,
      liqueurs: (profile?.spiritScores?.liqueurs || 25) / 100,
      'gin-alternative': 0,
      'rum-alternative': 0,
      none: 0,
    },
    preferredABV: getABVRangeForPreference(profile?.preferredABV || 'alcoholic'),
    preferredComplexity: clamp((profile?.complexityScore || 55) / 100),
  });
}

export default function RefineYourTasteScreen({ navigation }: Props) {
  const { profile, updateProfile } = usePersonalization();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const [graphData, setGraphData] = useState<any | null>(null);
  const [occasionMode, setOccasionMode] = useState('casual');
  const [abvPreference, setAbvPreference] = useState<'zero-proof' | 'low-abv' | 'alcoholic'>('alcoholic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const dbProfile = user?.id ? await loadUserProfile(user.id).catch(() => null) : null;
        const baseGraph =
          dbProfile?.tasteProfile
            ? initializeTasteGraph(dbProfile.tasteProfile)
            : buildGraphFromPersonalization(profile);

        if (!mounted) return;
        setGraphData(baseGraph);
        setOccasionMode('casual');
        setAbvPreference(
          dbProfile?.tasteProfile?.preferredABV
            ? abvPreferenceFromRange(dbProfile.tasteProfile.preferredABV)
            : (profile?.preferredABV || 'alcoholic')
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile, user?.id]);

  const radar = useMemo(() => (graphData ? generateRadarChart(graphData) : null), [graphData]);
  const effectiveProfile = useMemo(() => (graphData ? getEffectiveTasteProfile(graphData) : null), [graphData]);

  const previewCocktails = useMemo(() => {
    if (!graphData || !effectiveProfile) return [];

    const previewProfile = createDefaultUserProfile(user?.id || 'guest');
    previewProfile.tasteProfile = effectiveProfile;
    previewProfile.preferredABVRange = effectiveProfile.preferredABV;
    previewProfile.favoriteSpirit = orderedTopKeys(effectiveProfile.spiritWeights, 1)[0] as any;
    previewProfile.spiritPreferences = orderedTopKeys(effectiveProfile.spiritWeights, 3) as any;
    previewProfile.flavorProfiles = orderedTopKeys(effectiveProfile.flavorWeights, 3) as any;

    const candidateRecipes = ALL_COCKTAILS.filter((recipe: any) => {
      if (abvPreference === 'zero-proof') return isZeroProofRecipe(recipe);
      if (abvPreference === 'low-abv') return !isZeroProofRecipe(recipe);
      return true;
    });

    const predictions = getPredictiveRecommendations(
      candidateRecipes as any,
      previewProfile as any,
      graphData,
      {
        timeOfDay: detectTimeOfDay(),
        season: detectSeason(),
        inventory: [],
        recentScans: [],
      },
      8
    );

    const ranked = predictions.slice().sort((a, b) => {
      const aOccasionBoost = String(a.description || '').toLowerCase().includes(occasionMode) ? 1 : 0;
      const bOccasionBoost = String(b.description || '').toLowerCase().includes(occasionMode) ? 1 : 0;
      return bOccasionBoost - aOccasionBoost;
    });

    return ranked.slice(0, 4);
  }, [graphData, effectiveProfile, user?.id, occasionMode, abvPreference]);

  const topFlavors = useMemo(
    () => (effectiveProfile ? orderedTopKeys(effectiveProfile.flavorWeights, 3) : []),
    [effectiveProfile]
  );

  const topSpirits = useMemo(
    () => (effectiveProfile ? orderedTopKeys(effectiveProfile.spiritWeights, 3) : []),
    [effectiveProfile]
  );

  const setFlavorValue = (flavor: string, value: number) => {
    if (!graphData) return;
    setGraphData(setFlavorOverride(graphData, flavor as any, clamp(value)));
  };

  const setSpiritValue = (spirit: string, value: number) => {
    if (!graphData) return;
    setGraphData(setSpiritOverride(graphData, spirit as any, clamp(value)));
  };

  const handleSave = async () => {
    if (!graphData || !effectiveProfile) return;
    setSaving(true);

    try {
      const nextABV = getABVRangeForPreference(abvPreference);
      const finalTasteProfile = {
        ...effectiveProfile,
        preferredABV: nextABV,
      };

      const favoriteSpirits = orderedTopKeys(finalTasteProfile.spiritWeights, 3);
      const flavorPreferences = orderedTopKeys(finalTasteProfile.flavorWeights, 4);
      const flavorScores = Object.fromEntries(
        Object.entries(finalTasteProfile.flavorWeights).map(([key, value]) => [key, Math.round((value as number) * 100)])
      );
      const spiritScores = Object.fromEntries(
        Object.entries(finalTasteProfile.spiritWeights).map(([key, value]) => [key, Math.round((value as number) * 100)])
      );

      await updateProfile({
        favoriteSpirits,
        flavorPreferences,
        flavorScores,
        spiritScores,
        preferredABV: abvPreference,
        complexityScore: Math.round(finalTasteProfile.preferredComplexity * 100),
      });

      if (user?.id) {
        await updateUserProfileFields(user.id, {
          tasteProfile: finalTasteProfile as any,
          preferredABVRange: nextABV as any,
          favoriteSpirit: favoriteSpirits[0] as any,
          spiritPreferences: favoriteSpirits as any,
          flavorProfiles: flavorPreferences as any,
          moodPreferences: {
            forYouOccasionMode: occasionMode,
          } as any,
        } as any);
      }

      trackEvent('taste_graph_updated', {
        occasion_mode: occasionMode,
        top_spirit: favoriteSpirits[0],
        top_flavor: flavorPreferences[0],
        abv_preference: abvPreference,
      });

      navigation.goBack();
    } catch (error) {
      log.error('RefineYourTasteScreen', 'Failed to save Pro taste settings', error as Error);
      Alert.alert('Error', 'We could not save your Pro taste settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !graphData || !radar) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Building your Taste Graph...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Taste Graph</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{tier === 'PRO' ? 'Mixologist' : 'Profile'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>KOOPE Pro</Text>
          <Text style={styles.heroTitle}>Shape how KOOPE thinks your palate works.</Text>
          <Text style={styles.heroBody}>
            Adjust your flavor graph, choose the mode you are drinking for, and your For You feed will lean into that identity.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Confidence</Text>
              <Text style={styles.heroStatValue}>{Math.round(radar.dataConfidence * 100)}%</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Engagement</Text>
              <Text style={styles.heroStatValue}>{radar.engagementScore}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>ABV Mode</Text>
              <Text style={styles.heroStatValueSmall}>{ABV_MODES.find((item) => item.key === abvPreference)?.title}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tonight's Mode</Text>
          <Text style={styles.sectionSubtitle}>Use occasion modes to shift the tone of your recommendations before you even search.</Text>
          {OCCASION_MODES.map((mode) => {
            const active = occasionMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => setOccasionMode(mode.key)}
              >
                <View style={styles.modeHeader}>
                  <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{mode.title}</Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                </View>
                <Text style={styles.modeBody}>{mode.body}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flavor Sliders</Text>
          <Text style={styles.sectionSubtitle}>Manual controls sit on top of what KOOPE has learned, so your graph stays personal instead of generic.</Text>
          {FLAVOR_KEYS.map((item) => {
            const point = radar.flavorPoints.find((entry) => entry.label.toLowerCase() === item.label.toLowerCase());
            const overrideValue = graphData?.overrides?.flavors?.[item.key];
            const value = typeof overrideValue === 'number'
              ? overrideValue
              : (graphData?.rawProfile?.flavorWeights?.[item.key] || 0);
            return (
              <View key={item.key} style={styles.sliderCard}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>{item.label}</Text>
                  <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${Math.max(6, Math.round(value * 100))}%` }]} />
                </View>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={value}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={`${colors.line}`}
                  thumbTintColor={colors.accent}
                  onValueChange={(nextValue) => setFlavorValue(item.key, nextValue)}
                />
                <Text style={styles.sliderHint}>{describeBias(item.label, value, !!point?.isOverridden)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spirit Bias</Text>
          <Text style={styles.sectionSubtitle}>Give more weight to the spirits you want KOOPE to privilege in your feed.</Text>
          {SPIRIT_KEYS.map((item) => {
            const point = radar.spiritPoints.find((entry) => entry.label.toLowerCase() === item.label.toLowerCase());
            const overrideValue = graphData?.overrides?.spirits?.[item.key];
            const value = typeof overrideValue === 'number'
              ? overrideValue
              : (graphData?.rawProfile?.spiritWeights?.[item.key] || 0);
            return (
              <View key={item.key} style={styles.sliderCard}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>{item.label}</Text>
                  <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${Math.max(6, Math.round(value * 100))}%` }]} />
                </View>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={value}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={`${colors.line}`}
                  thumbTintColor={colors.accent}
                  onValueChange={(nextValue) => setSpiritValue(item.key, nextValue)}
                />
                <Text style={styles.sliderHint}>{describeBias(item.label, value, !!point?.isOverridden)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABV Preference</Text>
          <View style={styles.abvRow}>
            {ABV_MODES.map((item) => {
              const active = abvPreference === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.abvChip, active && styles.abvChipActive]}
                  onPress={() => setAbvPreference(item.key as any)}
                >
                  <Text style={[styles.abvChipText, active && styles.abvChipTextActive]}>{item.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Current Identity</Text>
          <View style={styles.identityCard}>
            <Text style={styles.identityLine}>Top spirits: {topSpirits.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(', ') || 'Still learning'}</Text>
            <Text style={styles.identityLine}>Top flavors: {topFlavors.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(', ') || 'Still learning'}</Text>
            <Text style={styles.identityLine}>Occasion mode: {occasionMode.charAt(0).toUpperCase() + occasionMode.slice(1)}</Text>
          </View>
        </View>

        {previewCocktails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview Your Next For You Drop</Text>
            <Text style={styles.sectionSubtitle}>These are the kinds of cocktails your current graph is pushing to the top.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
              {(previewCocktails as any[]).map((cocktail, index) => (
                <View key={cocktail.id || index} style={styles.previewCardWrap}>
                  <RecipeCard
                    {...createRecipeCardProps(cocktail as any, navigation, {
                      showSaveButton: false,
                      showCartButton: false,
                      showDeleteButton: false,
                    })}
                    onPress={() => handleRecipeView(cocktail as any, navigation)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setGraphData(clearOverrides(graphData))}>
            <Text style={styles.secondaryButtonText}>Reset Overrides</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Save Taste Graph</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
  },
  loadingText: {
    color: colors.subtext,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(1),
  },
  headerTitle: {
    fontSize: fonts.h3,
    fontWeight: '800',
    color: colors.text,
  },
  headerPill: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.65),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: `${colors.accent}55`,
    backgroundColor: `${colors.accent}12`,
  },
  headerPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing(2),
    gap: spacing(2.25),
    paddingBottom: spacing(6),
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    padding: spacing(2.5),
    gap: spacing(1.25),
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: serif,
    lineHeight: 34,
  },
  heroBody: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 21,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroStatLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(0.5),
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatValueSmall: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  section: {
    gap: spacing(1),
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
  },
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.75),
    gap: spacing(0.5),
  },
  modeCardActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}12`,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modeTitleActive: {
    color: colors.accent,
  },
  modeBody: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
  },
  sliderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
    gap: spacing(0.9),
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sliderValue: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  sliderTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  sliderControl: {
    width: '100%',
    height: 30,
    marginTop: -spacing(0.4),
    marginBottom: -spacing(0.4),
  },
  sliderHint: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: spacing(0.15),
  },
  abvRow: {
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  abvChip: {
    flex: 1,
    paddingVertical: spacing(1.1),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  abvChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  abvChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  abvChipTextActive: {
    color: colors.white,
  },
  identityCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.75),
    gap: spacing(0.75),
  },
  identityLine: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  previewScroll: {
    gap: spacing(1.5),
    paddingRight: spacing(1),
  },
  previewCardWrap: {
    width: 270,
    marginRight: spacing(1.5),
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1),
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    backgroundColor: colors.card,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1.3,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
