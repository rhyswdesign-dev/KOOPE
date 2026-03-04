import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, serif, spacing } from '../theme/tokens';
import MainPageHeader from '../components/ui/MainPageHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { InventoryService } from '../services/inventoryService';
import { type BarIngredient, type HomeBar, HomeBarService } from '../services/homeBarService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { ShoppingListStore } from '../services/shoppingListStore';
import { useUserTier } from '../store/useUserTier';
import { isCocktailAccessible } from '../config/tierAccess';
import { trackEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { getCocktailImage } from '../../assets/images/cocktails';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EventVibe = 'casual' | 'dinner' | 'party';
type WizardStep = 0 | 1 | 2;

interface HostingPlan {
  id: string;
  guestCount: number;
  vibe: EventVibe;
  preferences: {
    lowABV: boolean;
    noCitrus: boolean;
    spiritForward: boolean;
  };
  selectedRecipeName?: string;
  createdAt: string;
}

interface MenuCocktail {
  name: string;
  ingredients: string[];
  missingIngredients: string[];
  canMake: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  id: string;
  unlocked: boolean;
  confidence: 'high' | 'medium';
  why: string;
}

const HOSTING_PLANS_KEY = '@koope_hosting_plans';

function slugifyCocktailName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getHostingThumbnail(cocktailName: string) {
  const id = slugifyCocktailName(cocktailName);
  const aliases: Record<string, string> = {
    'rum-punch': 'planters-punch',
    martini: 'dry-martini',
  };
  const aliasId = aliases[id];
  return getCocktailImage(id) || (aliasId ? getCocktailImage(aliasId) : null) || getCocktailImage('old-fashioned');
}

function mapItemToBarIngredient(item: any, index: number): BarIngredient {
  return {
    id: item?.id || `inventory-${index}`,
    name: item?.item_name || item?.name || 'Unknown',
    category:
      item?.item_type === 'spirit' || item?.category === 'spirit'
        ? 'spirit'
        : item?.category === 'mixer'
          ? 'mixer'
          : item?.category === 'garnish'
            ? 'garnish'
            : item?.category === 'bitters'
              ? 'bitters'
              : item?.category === 'syrup'
                ? 'syrup'
                : item?.category === 'liqueur'
                  ? 'liqueur'
                  : 'ingredient',
    subcategory: item?.subcategory || undefined,
    brand: item?.brand || undefined,
    addedAt: item?.added_at ? new Date(item.added_at) : new Date(),
    isFavorite: false,
    tags: [],
  };
}

function inferGroceryCategory(name: string): 'spirits_liquors' | 'mixers' | 'garnish' | 'bitters' | 'syrup' | 'other' {
  const n = name.toLowerCase();
  if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|vermouth|liqueur|cointreau|campari|brandy)/.test(n)) return 'spirits_liquors';
  if (/(bitters|angostura|peychaud)/.test(n)) return 'bitters';
  if (/(syrup|grenadine|orgeat|agave|falernum)/.test(n)) return 'syrup';
  if (/(lime|lemon|orange|mint|olive|cherry|salt|sugar|peel)/.test(n)) return 'garnish';
  if (/(juice|soda|tonic|ginger beer|cola|water)/.test(n)) return 'mixers';
  return 'other';
}

function estimateIngredientOz(name: string): number {
  const n = name.toLowerCase();
  if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|vermouth|campari|liqueur|cointreau)/.test(n)) return 1.5;
  if (/(juice|soda|tonic|ginger beer|cola|water)/.test(n)) return 2.0;
  if (/(bitters)/.test(n)) return 0.05;
  if (/(syrup|grenadine|agave|orgeat|falernum)/.test(n)) return 0.5;
  if (/(lime|lemon|orange)/.test(n)) return 0.5;
  return 0.25;
}

export default function HostingScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { tier } = useUserTier();

  const { hasAccess: hasAdvancedHosting, gateWithTrigger: advancedHostingGate } = useFeatureAccess('hosting_advanced');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<BarIngredient[]>([]);
  const [savedPlans, setSavedPlans] = useState<HostingPlan[]>([]);

  const [step, setStep] = useState<WizardStep>(0);
  const [selectedRecipe, setSelectedRecipe] = useState<MenuCocktail | null>(null);
  const [guestCount, setGuestCount] = useState(4);
  const [vibe, setVibe] = useState<EventVibe>('casual');
  const [preferences, setPreferences] = useState({
    lowABV: false,
    noCitrus: false,
    spiritForward: false,
  });
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError(null);
      try {
        const stored = await HomeBarService.getStoredIngredients();
        let mergedInventory: BarIngredient[] = [...stored];

        if (user?.id) {
          const userInventory = await InventoryService.getUserInventory(user.id);
          const mapped = userInventory.map(mapItemToBarIngredient);
          const deduped = new Map<string, BarIngredient>();
          [...stored, ...mapped].forEach((item) => deduped.set(item.name.toLowerCase(), item));
          mergedInventory = Array.from(deduped.values());
        }

        const rawPlans = await AsyncStorage.getItem(HOSTING_PLANS_KEY);
        const parsedPlans: HostingPlan[] = rawPlans ? JSON.parse(rawPlans) : [];

        if (mounted) {
          setInventory(mergedInventory);
          setSavedPlans(parsedPlans.slice(0, 8));
        }
      } catch {
        if (mounted) setError('Could not load hosting planner data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    trackEvent(ANALYTICS_EVENTS.HOSTING_MODE_OPENED, { source: 'hosting_screen' });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const homeBar: HomeBar = useMemo(
    () => ({
      id: 'hosting',
      userId: user?.id || 'local',
      name: 'My Bar',
      ingredients: inventory,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
    }),
    [inventory, user?.id]
  );

  const buildRankedMenu = (
    nextPreferences: HostingPlan['preferences'],
    nextVibe: EventVibe,
    nextRejectedIds: Set<string>
  ): MenuCocktail[] => {
    const all = HomeBarService.getAvailableCocktails(homeBar);
    const preferredCategories: Record<EventVibe, string[]> = {
      casual: ['Gin Cocktails', 'Vodka Cocktails', 'Rum Cocktails'],
      dinner: ['Whiskey Cocktails', 'Gin Cocktails'],
      party: ['Vodka Cocktails', 'Rum Cocktails', 'Tequila Cocktails'],
    };

    const filtered = all.filter((c) => {
      if (nextPreferences.noCitrus) {
        const hasCitrus = c.ingredients.some((i) => /(lime|lemon|orange|citrus)/i.test(i));
        if (hasCitrus) return false;
      }
      if (nextPreferences.lowABV) {
        const strong = c.ingredients.filter((i) =>
          /(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur)/i.test(i)
        ).length;
        if (strong > 2) return false;
      }
      if (nextPreferences.spiritForward) {
        const spiritCount = c.ingredients.filter((i) =>
          /(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur)/i.test(i)
        ).length;
        if (spiritCount < 2) return false;
      }
      return true;
    });

    return filtered
      .map((c) => {
        const id = slugifyCocktailName(c.name);
        const unlocked = tier !== 'FREE' ? true : isCocktailAccessible(id, tier);
        const categoryPref = preferredCategories[nextVibe].includes(c.category) ? 12 : 0;
        const nearBonus = c.canMake ? 24 : Math.max(0, 16 - c.missingIngredients.length * 4);
        const difficultyBonus = c.difficulty === 'easy' ? 6 : c.difficulty === 'medium' ? 3 : 0;
        const score = categoryPref + nearBonus + difficultyBonus;
        const confidence: 'high' | 'medium' = c.canMake ? 'high' : 'medium';
        const why = [
          c.canMake ? 'Ready with current inventory' : `${c.missingIngredients.length} missing ingredient${c.missingIngredients.length === 1 ? '' : 's'}`,
          preferredCategories[nextVibe].includes(c.category) ? `Fits ${nextVibe} vibe` : 'Good alternate fit',
          c.difficulty === 'easy' ? 'Low prep complexity' : 'Moderate prep complexity',
        ].join(' • ');

        return { ...c, id, unlocked, confidence, why, _score: score } as MenuCocktail & { _score: number };
      })
      .filter((c) => !nextRejectedIds.has(c.id))
      .sort((a, b) => b._score - a._score)
      .slice(0, 10)
      .map(({ _score, ...rest }) => rest);
  };

  const menu = useMemo<MenuCocktail[]>(() => {
    return buildRankedMenu(preferences, vibe, rejectedIds);
  }, [homeBar, preferences, vibe, rejectedIds, tier]);

  const shoppingGaps = useMemo(() => {
    const almost = menu.filter((c) => c.unlocked && !c.canMake).slice(0, 6);
    const allMissing = almost.flatMap((c) => c.missingIngredients);
    const countMap = new Map<string, number>();
    allMissing.forEach((ing) => {
      const key = ing.toLowerCase();
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [menu]);

  const checklist = useMemo(() => {
    if (!selectedRecipe) return [];
    return [
      { title: '24h before', steps: ['Confirm guest count', 'Check ice and glassware', 'Buy missing ingredients'] },
      { title: '2h before', steps: ['Pre-batch non-carbonated components', 'Prep garnishes', 'Chill mixers and glassware'] },
      { title: 'Serve time', steps: ['Add ice fresh per round', 'Top with carbonated mixers last', 'Taste first pour before serving all'] },
    ];
  }, [selectedRecipe]);

  const baseServings = Math.max(guestCount, 1);
  const batchMultiplier = Math.max(1, Math.ceil(guestCount / 2));
  const safetyNetGuests = guestCount + 2;

  const selectedRecipeIngredients = useMemo(() => {
    if (!selectedRecipe) return [];
    return selectedRecipe.ingredients.map((name) => {
      const perServeOz = estimateIngredientOz(name);
      return {
        name,
        perServeOz,
        totalOz: perServeOz * baseServings,
        totalMl: perServeOz * baseServings * 29.57,
      };
    });
  }, [selectedRecipe, baseServings]);

  const servingsPerBottle = useMemo(() => {
    if (!selectedRecipe) return null;
    const spiritPerServeOz = selectedRecipe.ingredients.reduce((sum, ing) => {
      const n = ing.toLowerCase();
      if (/(vodka|gin|rum|whiskey|bourbon|rye|tequila|mezcal|brandy|cognac|campari|liqueur|vermouth)/.test(n)) {
        return sum + estimateIngredientOz(ing);
      }
      return sum;
    }, 0);
    if (spiritPerServeOz <= 0) return null;
    const totalBottleOz = 750 / 29.57;
    return Math.floor(totalBottleOz / spiritPerServeOz);
  }, [selectedRecipe]);

  const dilutionEstimate = useMemo(() => {
    if (!selectedRecipe) return null;
    const hasJuiceOrEgg = selectedRecipe.ingredients.some((ing) =>
      /(juice|egg|pineapple|orange|lemon|lime|cream)/i.test(ing)
    );
    const dilutionPerServeOz = hasJuiceOrEgg ? 0.8 : 0.5;
    const totalDilutionOz = dilutionPerServeOz * baseServings;
    const totalDilutionMl = totalDilutionOz * 29.57;
    return { dilutionPerServeOz, totalDilutionOz, totalDilutionMl };
  }, [selectedRecipe, baseServings]);

  const totalsEstimate = useMemo(() => {
    const preDilutionOz = selectedRecipeIngredients.reduce((sum, ing) => sum + ing.totalOz, 0);
    const dilutionOz = dilutionEstimate?.totalDilutionOz || 0;
    const finalOz = preDilutionOz + dilutionOz;
    return {
      preDilutionOz,
      finalOz,
      preDilutionMl: preDilutionOz * 29.57,
      finalMl: finalOz * 29.57,
    };
  }, [selectedRecipeIngredients, dilutionEstimate]);

  const savePlan = async () => {
    try {
      const plan: HostingPlan = {
        id: `plan_${Date.now()}`,
        guestCount,
        vibe,
        preferences: { ...preferences },
        selectedRecipeName: selectedRecipe?.name,
        createdAt: new Date().toISOString(),
      };
      const next = [plan, ...savedPlans].slice(0, 8);
      setSavedPlans(next);
      await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify(next));
      Alert.alert('Plan Saved', 'Saved to your hosting plans.');
    } catch {
      Alert.alert('Could Not Save', 'Please try again.');
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const next = savedPlans.filter((p) => p.id !== planId);
      setSavedPlans(next);
      await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify(next));
    } catch {
      Alert.alert('Could Not Delete', 'Please try again.');
    }
  };

  const clearAllPlans = () => {
    Alert.alert('Delete Saved Plans', 'Remove all saved hosting plans?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            setSavedPlans([]);
            await AsyncStorage.setItem(HOSTING_PLANS_KEY, JSON.stringify([]));
          } catch {
            Alert.alert('Could Not Delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  const applyPlan = (plan: HostingPlan) => {
    const planRejected = new Set<string>();
    const planMenu = buildRankedMenu(plan.preferences, plan.vibe, planRejected);
    const savedMatch = plan.selectedRecipeName
      ? planMenu.find((item) => item.name.toLowerCase() === plan.selectedRecipeName!.toLowerCase())
      : null;

    setRejectedIds(planRejected);
    setGuestCount(plan.guestCount);
    setVibe(plan.vibe);
    setPreferences(plan.preferences);

    if (savedMatch) {
      if (!savedMatch.unlocked) {
        setSelectedRecipe(null);
        setStep(2);
        Alert.alert('Recipe Locked', 'This saved menu is currently locked on your tier.');
        return;
      }
      setSelectedRecipe(savedMatch);
      setStep(2);
      return;
    }

    setSelectedRecipe(null);
    setStep(2);
    if (plan.selectedRecipeName) {
      Alert.alert('Saved Menu Unavailable', 'That saved recipe is not currently in your top menu matches. You can reselect it from Step 3.');
    }
  };

  const rejectCocktail = (cocktail: MenuCocktail) => {
    setRejectedIds((prev) => new Set(prev).add(cocktail.id));
    trackEvent('Hosting Recipe Rejected', { cocktail_id: cocktail.id, cocktail_name: cocktail.name, vibe });
  };

  const chooseCocktail = (cocktail: MenuCocktail) => {
    if (!cocktail.unlocked) {
      Alert.alert('Locked Recipe', 'This recipe is locked on your current tier.');
      return;
    }
    setSelectedRecipe(cocktail);
    trackEvent('Hosting Recipe Selected', { cocktail_id: cocktail.id, cocktail_name: cocktail.name, guest_count: guestCount });
  };

  const updateGuestCount = (next: number) => {
    if (next <= 4) {
      setGuestCount(Math.max(1, next));
      trackEvent(ANALYTICS_EVENTS.PARTY_SCALED, { guest_count: Math.max(1, next), tier });
      return;
    }
    advancedHostingGate('T7', () => {
      setGuestCount(Math.max(1, next));
      trackEvent(ANALYTICS_EVENTS.PARTY_SCALED, { guest_count: Math.max(1, next), tier });
    });
  };

  const addMissingToCart = async () => {
    if (shoppingGaps.length === 0) {
      Alert.alert('No Missing Items', 'You already have what you need for top suggestions.');
      return;
    }

    try {
      const consolidated = await ShoppingListStore.getConsolidatedShoppingItems();
      const existing = new Set(consolidated.allItems.map((i) => i.name.toLowerCase()));

      const starterSuggestions = HomeBarService.getStarterBarIngredients();
      const brandMap = new Map<string, string>();
      starterSuggestions.forEach((s) => {
        if (s.commonBrands?.[0]) {
          brandMap.set(s.name.toLowerCase(), s.commonBrands[0]);
        }
      });

      let added = 0;
      for (const gap of shoppingGaps) {
        if (existing.has(gap.name.toLowerCase())) continue;
        await ShoppingListStore.addItemToShoppingList(
          {
            name: gap.name.replace(/\b\w/g, (m) => m.toUpperCase()),
            category: inferGroceryCategory(gap.name),
            brand: brandMap.get(gap.name.toLowerCase()),
            size: inferGroceryCategory(gap.name) === 'spirits_liquors' ? '750ml' : undefined,
            checked: false,
          } as any,
          'Hosting Planner',
          user?.id || 'default'
        );
        added += 1;
      }
      Alert.alert('Shopping List Updated', added > 0 ? `Added ${added} item${added === 1 ? '' : 's'}.` : 'All missing items are already in your cart.');
    } catch {
      Alert.alert('Could Not Add', 'Please try again.');
    }
  };

  const renderWizard = () => {
    if (step === 0) {
      return (
        <View style={[styles.sectionCard, styles.wizardCardCentered]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.sectionTitle}>Step 1: Guest Count</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Target {safetyNetGuests}-{guestCount + 3}</Text>
            </View>
          </View>
          <Text style={styles.stepSubtitle}>Set your expected guest count, then pad for party pace.</Text>

          <View style={styles.guestRow}>
            <TouchableOpacity style={styles.adjustButton} onPress={() => updateGuestCount(guestCount - 1)}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.guestPill}>
              <Text style={styles.guestValue}>{guestCount}</Text>
              <Text style={styles.guestLabel}>people</Text>
            </View>
            <TouchableOpacity style={styles.adjustButton} onPress={() => updateGuestCount(guestCount + 1)}>
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.batchHint}>Batch baseline: {batchMultiplier}x</Text>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
            <Text style={styles.noticeText}>
              Party rule: guests rarely stop at one drink. Plan for 2-3 extra people as a safety net.
            </Text>
          </View>

          {!hasAdvancedHosting && (
            <View style={styles.lockRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.accent} />
              <Text style={styles.lockText}>5+ guests requires PRO (advanced hosting).</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryCta} onPress={() => setStep(1)}>
            <Text style={styles.primaryCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={[styles.sectionCard, styles.wizardCardCentered]}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.sectionTitle}>Step 2: Vibe & Preferences</Text>
          </View>
          <Text style={styles.stepSubtitle}>Choose the mood, then tune how the menu gets ranked.</Text>

          <View style={styles.groupCard}>
            <Text style={styles.groupTitle}>Event Vibe</Text>
            <View style={styles.vibeRow}>
              {([
                { key: 'casual', label: 'Casual', icon: 'cafe-outline' },
                { key: 'dinner', label: 'Dinner', icon: 'restaurant-outline' },
                { key: 'party', label: 'Party', icon: 'sparkles-outline' },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.vibeChip, vibe === option.key && styles.vibeChipActive]}
                  onPress={() => setVibe(option.key)}
                >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={vibe === option.key ? colors.bg : colors.subtext}
                    style={styles.vibeIcon}
                  />
                  <Text style={[styles.vibeText, vibe === option.key && styles.vibeTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.groupCard}>
            <Text style={styles.groupTitle}>Preference Filters</Text>
            <View style={styles.prefGroup}>
              {[
                { key: 'lowABV', label: 'Lower ABV', hint: 'Prioritize lighter drinks' },
                { key: 'noCitrus', label: 'No Citrus', hint: 'Avoid lemon/lime-forward drinks' },
                { key: 'spiritForward', label: 'Spirit-Forward', hint: 'Prioritize bolder builds' },
              ].map((pref) => {
                const active = (preferences as any)[pref.key];
                return (
                  <TouchableOpacity
                    key={pref.key}
                    style={[styles.prefChip, active && styles.prefChipActive]}
                    onPress={() => setPreferences((prev) => ({ ...prev, [pref.key]: !active }))}
                  >
                    <View style={styles.prefTextWrap}>
                      <Text style={[styles.prefText, active && styles.prefTextActive]}>{pref.label}</Text>
                      <Text style={styles.prefHint}>{pref.hint}</Text>
                    </View>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={active ? colors.accent : colors.subtext}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.selectionSummaryCard}>
            <Text style={styles.selectionSummaryTitle}>Current Selection</Text>
            <Text style={styles.selectionSummaryText}>Guests: {guestCount}</Text>
            <Text style={styles.selectionSummaryText}>Vibe: {vibe.charAt(0).toUpperCase() + vibe.slice(1)}</Text>
            <Text style={styles.selectionSummaryText}>
              Filters:{' '}
              {preferences.lowABV || preferences.noCitrus || preferences.spiritForward
                ? [
                    preferences.lowABV ? 'Lower ABV' : null,
                    preferences.noCitrus ? 'No Citrus' : null,
                    preferences.spiritForward ? 'Spirit-Forward' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : 'None'}
            </Text>
          </View>

          <View style={styles.wizardActions}>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => setStep(0)}>
              <Text style={styles.secondaryCtaText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryCtaCompact} onPress={() => setStep(2)}>
              <Text style={styles.primaryCtaText}>See Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Step 3: Menu You Can Make</Text>
        <Text style={styles.stepSubtitleCentered}>
          {guestCount} guests • {vibe.charAt(0).toUpperCase() + vibe.slice(1)} vibe •{' '}
          {preferences.lowABV || preferences.noCitrus || preferences.spiritForward
            ? [
                preferences.lowABV ? 'Lower ABV' : null,
                preferences.noCitrus ? 'No Citrus' : null,
                preferences.spiritForward ? 'Spirit-Forward' : null,
              ]
                .filter(Boolean)
                .join(', ')
            : 'No filters'}
        </Text>
        <Text style={styles.ingredientLegend}>Green = ingredients already in your bar</Text>
        {menu.length === 0 ? (
          <Text style={styles.emptyText}>No menu matches yet. Try changing vibe or preferences.</Text>
        ) : (
          menu.map((c) => (
            <View key={c.id} style={[styles.menuCard, !c.unlocked && styles.menuCardLocked]}>
              <TouchableOpacity onPress={() => chooseCocktail(c)} activeOpacity={0.85}>
                {(() => {
                  const missingSet = new Set(c.missingIngredients.map((i) => i.toLowerCase()));
                  const topIngredients = c.ingredients.slice(0, 6);
                  return (
                    <>
                      <View style={styles.menuBodyRow}>
                        <Image source={getHostingThumbnail(c.name)} style={styles.menuThumb} />
                        <View style={styles.menuContent}>
                          <View style={styles.menuHeaderRow}>
                            <Text style={styles.menuName}>{c.name}</Text>
                            {!c.unlocked && <Text style={styles.lockBadge}>Locked</Text>}
                          </View>
                          <Text style={styles.menuMeta}>{c.category} • {c.difficulty} • {c.confidence} confidence</Text>
                          <Text style={styles.whyText}>{c.why}</Text>
                        </View>
                      </View>
                      <View style={styles.ingredientRow}>
                        {topIngredients.map((ing) => {
                          const hasIngredient = !missingSet.has(ing.toLowerCase());
                          return (
                            <View key={`${c.id}-${ing}`} style={[styles.ingredientChip, hasIngredient && styles.ingredientChipOwned]}>
                              <Text style={[styles.ingredientChipText, hasIngredient && styles.ingredientChipTextOwned]} numberOfLines={1}>
                                {ing}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}
              </TouchableOpacity>
              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.rejectButton} onPress={() => rejectCocktail(c)}>
                  <Text style={styles.rejectButtonText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectButton} onPress={() => chooseCocktail(c)}>
                  <Text style={styles.selectButtonText}>Choose</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={styles.wizardActions}>
          <TouchableOpacity style={styles.secondaryCta} onPress={() => setStep(1)}>
            <Text style={styles.secondaryCtaText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryCtaCompact} onPress={savePlan}>
            <Text style={styles.primaryCtaText}>Save Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCalculator = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Batch Calculator</Text>
        <TouchableOpacity
          style={styles.editSetupButton}
          onPress={() => {
            setSelectedRecipe(null);
            setStep(0);
          }}
        >
          <Ionicons name="create-outline" size={14} color={colors.bg} />
          <Text style={styles.editSetupButtonText}>Edit Setup</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{selectedRecipe?.name}</Text>
        <Text style={styles.heroSubtitle}>{guestCount} guests • {batchMultiplier}x batch baseline</Text>
        <Text style={styles.heroSubtitle}>Safer prep target: {safetyNetGuests}-{guestCount + 3} guests</Text>
        {servingsPerBottle ? (
          <Text style={styles.bottleEstimate}>~{servingsPerBottle} servings per 750ml spirit bottle</Text>
        ) : null}
      </View>

      {selectedRecipeIngredients.map((ing) => (
        <View key={ing.name} style={styles.calcRow}>
          <Text style={styles.calcName}>{ing.name}</Text>
          <Text style={styles.calcAmount}>{ing.totalOz.toFixed(1)} oz ({Math.round(ing.totalMl)} ml)</Text>
        </View>
      ))}

      {dilutionEstimate && (
        <>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Dilution (water from shaking/stirring)</Text>
            <Text style={styles.calcAmount}>
              {dilutionEstimate.totalDilutionOz.toFixed(1)} oz ({Math.round(dilutionEstimate.totalDilutionMl)} ml)
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Pre-dilution batch total</Text>
            <Text style={styles.calcAmount}>
              {totalsEstimate.preDilutionOz.toFixed(1)} oz ({Math.round(totalsEstimate.preDilutionMl)} ml)
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcName}>Final batch volume (with dilution)</Text>
            <Text style={styles.calcAmount}>
              {totalsEstimate.finalOz.toFixed(1)} oz ({Math.round(totalsEstimate.finalMl)} ml)
            </Text>
          </View>
          <Text style={styles.dilutionNote}>
            Dilution estimate uses ~{dilutionEstimate.dilutionPerServeOz.toFixed(1)} oz water per drink.
          </Text>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prep Checklist</Text>
        {checklist.map((block) => (
          <View key={block.title} style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>{block.title}</Text>
            {block.steps.map((s) => (
              <Text key={`${block.title}-${s}`} style={styles.checklistStep}>• {s}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.wizardActions}>
        <TouchableOpacity style={styles.secondaryCta} onPress={() => setSelectedRecipe(null)}>
          <Text style={styles.secondaryCtaText}>Choose Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryCtaCompact} onPress={savePlan}>
          <Text style={styles.primaryCtaText}>Save Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader title="Hosting Planner" subtitle="Loading..." showBackButton onBackPress={() => nav.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <MainPageHeader title="Hosting Planner" subtitle="Could not load data" showBackButton onBackPress={() => nav.goBack()} />
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.primaryCtaCompact} onPress={() => nav.goBack()}>
            <Text style={styles.primaryCtaText}>Back to Inventory</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowMissingItems = selectedRecipe !== null || step === 2;
  const showSavedPlans = savedPlans.length > 0 && !selectedRecipe && step === 0;
  const isCenteredWizard = !selectedRecipe && (step === 0 || step === 1);

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Hosting Planner"
        subtitle={selectedRecipe ? 'Recipe Batch Mode' : `Step ${step + 1} of 3`}
        showBackButton
        onBackPress={() => nav.goBack()}
        rightActions={[{ icon: 'cart-outline', onPress: () => nav.navigate('ShoppingCart'), accessibilityLabel: 'Open shopping cart' }]}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {!selectedRecipe ? (
          <View style={isCenteredWizard ? styles.centerStage : undefined}>{renderWizard()}</View>
        ) : (
          renderCalculator()
        )}

        {shouldShowMissingItems && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Missing Items To Host Better</Text>
              <TouchableOpacity style={styles.addAllButton} onPress={addMissingToCart}>
                <Ionicons name="cart-outline" size={14} color={colors.bg} />
                <Text style={styles.addAllText}>Add All</Text>
              </TouchableOpacity>
            </View>
            {shoppingGaps.length === 0 ? (
              <Text style={styles.emptyText}>No critical gaps. Your bar is in strong shape for this plan.</Text>
            ) : (
              shoppingGaps.map((gap) => (
                <View key={gap.name} style={styles.gapRow}>
                  <View style={styles.gapLeft}>
                    <Ionicons name="alert-circle-outline" size={15} color={colors.accent} />
                    <Text style={styles.gapName}>{gap.name.replace(/\b\w/g, (m) => m.toUpperCase())}</Text>
                  </View>
                  <Text style={styles.gapCount}>Needed in {gap.count}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {showSavedPlans && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Hosting Plans</Text>
              <TouchableOpacity style={styles.clearPlansButton} onPress={clearAllPlans}>
                <Ionicons name="trash-outline" size={14} color={colors.subtext} />
                <Text style={styles.clearPlansText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.savedPlansDescription}>
              Reuse previous setups quickly. Tap a saved plan to restore guest count, vibe, filters, and jump straight into its saved batch recipe.
            </Text>
            <View style={styles.savedPlanGrid}>
              {savedPlans.map((plan) => (
                <View key={plan.id} style={styles.savedPlanCard}>
                  <TouchableOpacity style={styles.savedPlanBody} onPress={() => applyPlan(plan)}>
                    <Text style={styles.savedPlanTitle}>{plan.guestCount} guests • {plan.vibe}</Text>
                    <Text style={styles.savedPlanRecipe}>
                      Menu: {plan.selectedRecipeName || 'No recipe saved'}
                    </Text>
                    <Text style={styles.savedPlanMeta}>{new Date(plan.createdAt).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.savedPlanDelete}
                    onPress={() => deletePlan(plan.id)}
                    accessibilityLabel="Delete saved plan"
                  >
                    <Ionicons name="close" size={14} color={colors.subtext} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(5),
    paddingTop: spacing(2),
    flexGrow: 1,
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(3),
    gap: spacing(1.25),
  },
  skeletonCard: {
    width: '100%',
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  section: { marginBottom: spacing(2.5) },
  sectionCard: {
    marginBottom: spacing(2.5),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(1.4),
  },
  wizardCardCentered: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 560,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(1),
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: spacing(1),
    fontFamily: serif,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  stepSubtitle: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(1.25),
    textAlign: 'center',
  },
  stepSubtitleCentered: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(1.25),
    textAlign: 'center',
  },
  ingredientLegend: {
    color: '#A7EDB0',
    fontSize: 11,
    marginTop: -spacing(0.35),
    marginBottom: spacing(0.9),
    textAlign: 'center',
    fontWeight: '600',
  },
  stepBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.4)',
    backgroundColor: 'rgba(214,138,56,0.14)',
    paddingHorizontal: spacing(0.9),
    paddingVertical: spacing(0.35),
    marginBottom: spacing(1),
  },
  stepBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  heroTitle: { color: colors.text, fontSize: 22, fontFamily: serif, fontWeight: '700' },
  heroSubtitle: { color: colors.subtext, fontSize: 13, marginTop: spacing(0.5), lineHeight: 18 },
  bottleEstimate: { color: colors.accent, fontSize: 12, marginTop: spacing(0.75), fontWeight: '600' },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPill: {
    minWidth: 110,
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  guestValue: { fontSize: 20, color: colors.text, fontWeight: '800' },
  guestLabel: { fontSize: 11, color: colors.subtext },
  batchHint: { marginTop: spacing(1), textAlign: 'center', color: colors.subtext, fontSize: 12 },
  noticeCard: {
    marginTop: spacing(1),
    flexDirection: 'row',
    gap: spacing(0.7),
    alignItems: 'flex-start',
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderColor: 'rgba(214,138,56,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.8),
  },
  noticeText: { color: colors.subtext, fontSize: 12, lineHeight: 17, flex: 1 },
  lockRow: {
    marginTop: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.6),
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderColor: 'rgba(214,138,56,0.35)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.2),
    paddingVertical: spacing(0.8),
  },
  lockText: { color: colors.subtext, fontSize: 12 },
  groupCard: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1),
    marginBottom: spacing(1),
  },
  groupTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing(0.8),
    letterSpacing: 0.3,
  },
  vibeRow: { flexDirection: 'row', gap: spacing(0.8) },
  vibeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: spacing(0.85),
    paddingHorizontal: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  vibeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  vibeIcon: { marginRight: spacing(0.4) },
  vibeText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  vibeTextActive: { color: colors.bg },
  prefGroup: { gap: spacing(0.7) },
  prefChip: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(214,138,56,0.18)' },
  prefTextWrap: { flex: 1, paddingRight: spacing(1) },
  prefText: { color: colors.subtext, fontSize: 12, fontWeight: '700' },
  prefTextActive: { color: colors.text },
  prefHint: { color: colors.subtext, fontSize: 11, marginTop: 2, opacity: 0.92 },
  selectionSummaryCard: {
    marginBottom: spacing(0.6),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(214,138,56,0.08)',
    padding: spacing(1),
  },
  selectionSummaryTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing(0.45),
  },
  selectionSummaryText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  wizardActions: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.25) },
  primaryCta: {
    marginTop: spacing(1.5),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.2),
    alignItems: 'center',
  },
  primaryCtaCompact: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.1),
    alignItems: 'center',
  },
  primaryCtaText: { color: colors.bg, fontSize: 13, fontWeight: '700' },
  secondaryCta: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.1),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryCtaText: { color: colors.subtext, fontSize: 13, fontWeight: '700' },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing(1.4),
    marginBottom: spacing(1),
  },
  menuCardLocked: { opacity: 0.55 },
  menuBodyRow: { flexDirection: 'row', gap: spacing(1), alignItems: 'center' },
  menuThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#120B07',
  },
  menuContent: { flex: 1 },
  menuHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  lockBadge: {
    fontSize: 10,
    color: colors.bg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(0.8),
    paddingVertical: spacing(0.3),
    borderRadius: radii.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  menuMeta: { color: colors.subtext, fontSize: 12, marginTop: spacing(0.25) },
  whyText: { color: colors.subtext, fontSize: 12, marginTop: spacing(0.6), lineHeight: 18 },
  ingredientRow: {
    marginTop: spacing(0.9),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.5),
  },
  ingredientChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(0.8),
    paddingVertical: spacing(0.35),
    maxWidth: '48%',
  },
  ingredientChipOwned: {
    backgroundColor: 'rgba(60, 181, 75, 0.2)',
    borderColor: 'rgba(60, 181, 75, 0.65)',
  },
  ingredientChipText: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '600',
  },
  ingredientChipTextOwned: {
    color: '#A7EDB0',
  },
  menuActions: { marginTop: spacing(1), flexDirection: 'row', gap: spacing(0.8), justifyContent: 'flex-end' },
  rejectButton: {
    paddingHorizontal: spacing(1.3),
    paddingVertical: spacing(0.7),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  rejectButtonText: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
  selectButton: {
    paddingHorizontal: spacing(1.3),
    paddingVertical: spacing(0.7),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  selectButtonText: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    marginBottom: spacing(0.75),
  },
  calcName: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: spacing(1) },
  calcAmount: { color: colors.subtext, fontSize: 12 },
  dilutionNote: {
    color: colors.subtext,
    fontSize: 11,
    marginBottom: spacing(1.1),
    marginTop: spacing(0.2),
  },
  checklistCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing(1.2),
    marginBottom: spacing(0.8),
  },
  checklistTitle: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: spacing(0.45) },
  checklistStep: { color: colors.subtext, fontSize: 12, lineHeight: 18 },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.6),
    borderRadius: radii.pill,
  },
  addAllText: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  editSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.45),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.55),
    borderRadius: radii.pill,
  },
  editSetupButtonText: { color: colors.bg, fontSize: 11, fontWeight: '700' },
  gapRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(1),
    marginBottom: spacing(0.75),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gapLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75), flex: 1 },
  gapName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  gapCount: { color: colors.subtext, fontSize: 11, marginLeft: spacing(1) },
  emptyText: { color: colors.subtext, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  clearPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
  },
  clearPlansText: { color: colors.subtext, fontSize: 11, fontWeight: '700' },
  savedPlansDescription: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing(0.9),
  },
  savedPlanGrid: { gap: spacing(0.8) },
  savedPlanCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedPlanBody: {
    flex: 1,
    paddingHorizontal: spacing(1.1),
    paddingVertical: spacing(0.9),
  },
  savedPlanTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  savedPlanRecipe: { color: colors.subtext, fontSize: 11, marginTop: 2 },
  savedPlanMeta: { color: colors.subtext, fontSize: 11, marginTop: 2 },
  savedPlanDelete: {
    width: 36,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
});
