import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';

type RouteParams = RouteProp<RootStackParamList, 'GuestMenu'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Scaling ──────────────────────────────────────────────────────────────────
// Standard assumptions: 1.5 servings/guest (dinner), 2 servings/guest (party/casual).
// Each cocktail build uses one "unit" of the base spirit (~2 oz) and various modifiers.
// We show scaled serving counts rather than exact volumes since recipes vary.

function getServingsPerGuest(vibe: string): number {
  return vibe === 'dinner' ? 1.5 : 2;
}

function getTotalServings(guestCount: number, vibe: string): number {
  return Math.ceil(guestCount * getServingsPerGuest(vibe));
}

// ─── Prep timeline logic ──────────────────────────────────────────────────────
// Groups prep tasks by lead time based on cocktail difficulty and category.

interface PrepTask {
  timing: 'ahead' | 'arrival' | 'order';
  label: string;
}

function getPrepTasks(
  cocktailName: string,
  ingredients: string[],
  difficulty: string,
  category: string,
  servings: number
): PrepTask[] {
  const tasks: PrepTask[] = [];
  const cat = category.toLowerCase();
  const lower = cocktailName.toLowerCase();

  // Make-ahead tasks
  const needsSyrup = ingredients.some((i) =>
    /syrup|honey|agave|grenadine|orgeat/i.test(i)
  );
  const isBatch =
    difficulty === 'easy' ||
    cat.includes('punch') ||
    cat.includes('sangria') ||
    lower.includes('punch') ||
    lower.includes('sangria');

  if (isBatch && servings >= 6) {
    tasks.push({ timing: 'ahead', label: `Batch ${servings} servings of ${cocktailName} in a pitcher` });
  }
  if (needsSyrup) {
    tasks.push({ timing: 'ahead', label: 'Prepare any homemade syrups (simple, honey, etc.)' });
  }
  if (servings >= 8) {
    tasks.push({ timing: 'ahead', label: 'Pre-measure and batch spirit + modifiers into a bottle' });
  }

  // On-arrival tasks
  tasks.push({ timing: 'arrival', label: 'Fill ice bucket and chill glassware' });
  const needsGarnish = ingredients.some((i) =>
    /lemon|lime|orange|cherry|mint|cucumber|olive|twist/i.test(i)
  );
  if (needsGarnish) {
    tasks.push({ timing: 'arrival', label: 'Cut and prep garnishes' });
  }
  if (cat.includes('punch') || isBatch) {
    tasks.push({ timing: 'arrival', label: 'Set out punch bowl or pitcher station' });
  }

  // Made-to-order tasks
  const isShaken = cat.includes('sour') || /sour|margarita|daiquiri|cosmo/i.test(lower);
  const isStirred = /old fashioned|manhattan|negroni|martini/i.test(lower);
  if (isShaken) {
    tasks.push({ timing: 'order', label: `Shake each ${cocktailName} to order` });
  } else if (isStirred) {
    tasks.push({ timing: 'order', label: `Stir each ${cocktailName} for ~20 seconds over ice` });
  } else if (!isBatch) {
    tasks.push({ timing: 'order', label: `Build each ${cocktailName} to order` });
  }

  return tasks;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TIMING_LABELS: Record<PrepTask['timing'], { label: string; icon: string; color: string }> = {
  ahead: { label: 'Make Ahead', icon: 'time-outline', color: '#B8860B' },
  arrival: { label: 'On Arrival', icon: 'checkmark-circle-outline', color: colors.accent },
  order: { label: 'Made to Order', icon: 'flash-outline', color: '#5DA0D0' },
};

export default function GuestMenuScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const {
    cocktailName,
    ingredients,
    missingIngredients,
    guestCount,
    vibe,
    difficulty,
    why,
    category,
  } = route.params;

  const totalServings = getTotalServings(guestCount, vibe);
  const missingSet = new Set(missingIngredients.map((i) => i.toLowerCase().trim()));

  const prepTasks = useMemo(
    () => getPrepTasks(cocktailName, ingredients, difficulty, category, totalServings),
    [cocktailName, ingredients, difficulty, category, totalServings]
  );

  const aheadTasks = prepTasks.filter((t) => t.timing === 'ahead');
  const arrivalTasks = prepTasks.filter((t) => t.timing === 'arrival');
  const orderTasks = prepTasks.filter((t) => t.timing === 'order');

  const vibeLabel = vibe.charAt(0).toUpperCase() + vibe.slice(1);

  const handleShare = async () => {
    const servingLine = `${totalServings} servings for ${guestCount} guests`;
    const ingredientLines = ingredients
      .map((i) => `  ${missingSet.has(i.toLowerCase().trim()) ? '⚠ ' : '✓ '}${i}`)
      .join('\n');
    const aheadLines = aheadTasks.map((t) => `  • ${t.label}`).join('\n');
    const arrivalLines = arrivalTasks.map((t) => `  • ${t.label}`).join('\n');
    const orderLines = orderTasks.map((t) => `  • ${t.label}`).join('\n');

    const message = [
      `🍹 ${cocktailName} — ${vibeLabel} Night for ${guestCount}`,
      `${servingLine}`,
      '',
      'INGREDIENTS',
      ingredientLines,
      missingIngredients.length > 0
        ? `\n⚠ Still need: ${missingIngredients.join(', ')}`
        : '',
      '',
      'PREP PLAN',
      aheadTasks.length > 0 ? `Make Ahead:\n${aheadLines}` : '',
      arrivalTasks.length > 0 ? `On Arrival:\n${arrivalLines}` : '',
      orderTasks.length > 0 ? `Made to Order:\n${orderLines}` : '',
      '',
      'Built with KOOPE — the bartender\'s app.',
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({ message });
  };

  return (
    <LinearGradient colors={['rgba(0,0,0,0)', '#1A120D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Guest Menu</Text>
            <Text style={styles.headerSub}>{vibeLabel} · {guestCount} guests</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cocktail Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Tonight's Cocktail</Text>
            <Text style={styles.heroName}>{cocktailName}</Text>
            {why ? <Text style={styles.heroWhy}>{why}</Text> : null}
            <View style={styles.heroPills}>
              <View style={styles.pill}>
                <Ionicons name="people-outline" size={13} color={colors.accent} />
                <Text style={styles.pillText}>{totalServings} servings</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="barbell-outline" size={13} color={colors.accent} />
                <Text style={styles.pillText}>{difficulty}</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="wine-outline" size={13} color={colors.accent} />
                <Text style={styles.pillText}>{vibeLabel}</Text>
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What You Need</Text>
            <Text style={styles.sectionSub}>
              Quantities are for {totalServings} servings · scale per batch as needed
            </Text>
            {ingredients.map((ingredient, i) => {
              const isMissing = missingSet.has(ingredient.toLowerCase().trim());
              return (
                <View key={i} style={[styles.ingredientRow, isMissing && styles.ingredientRowMissing]}>
                  <Ionicons
                    name={isMissing ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={isMissing ? colors.gold : colors.accent}
                  />
                  <Text style={[styles.ingredientText, isMissing && styles.ingredientTextMissing]}>
                    {ingredient}
                  </Text>
                  {isMissing && <Text style={styles.ingredientMissingBadge}>Need to buy</Text>}
                </View>
              );
            })}
            {/* Kill List (Master Plan §2.4): "Add missing items to cart" removed
                (audit/sprint-1 review) — it navigated to the killed ShoppingCart
                screen. The "Need to buy" badges above still flag missing items;
                the missing-ingredients list is affiliate-out territory once that
                surface ships, not an in-app cart. */}
          </View>

          {/* Prep Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prep Timeline</Text>
            {([
              { tasks: aheadTasks, timing: 'ahead' as const },
              { tasks: arrivalTasks, timing: 'arrival' as const },
              { tasks: orderTasks, timing: 'order' as const },
            ]).map(({ tasks, timing }) =>
              tasks.length > 0 ? (
                <View key={timing} style={styles.prepGroup}>
                  <View style={styles.prepGroupHeader}>
                    <Ionicons
                      name={TIMING_LABELS[timing].icon as any}
                      size={14}
                      color={TIMING_LABELS[timing].color}
                    />
                    <Text style={[styles.prepGroupLabel, { color: TIMING_LABELS[timing].color }]}>
                      {TIMING_LABELS[timing].label}
                    </Text>
                  </View>
                  {tasks.map((task, i) => (
                    <Text key={i} style={styles.prepTask}>· {task.label}</Text>
                  ))}
                </View>
              ) : null
            )}
          </View>

          {/* Share CTA */}
          <TouchableOpacity style={styles.shareCard} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={colors.accent} />
            <View style={styles.shareCardText}>
              <Text style={styles.shareCardTitle}>Share this menu</Text>
              <Text style={styles.shareCardSub}>Send to guests or save for yourself</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    padding: spacing(0.5),
    marginRight: spacing(1),
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  headerSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 1,
  },
  shareButton: {
    padding: spacing(0.5),
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(6),
    gap: spacing(3),
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(0.5),
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    marginBottom: spacing(1),
  },
  heroWhy: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(1.5),
  },
  heroPills: {
    flexDirection: 'row',
    gap: spacing(1),
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.accent + '18',
    borderRadius: radii.pill,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
  },
  pillText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    gap: spacing(1),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(0.75),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ingredientRowMissing: {
    opacity: 0.85,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  ingredientTextMissing: {
    color: colors.subtext,
  },
  ingredientMissingBadge: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '600',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(0.75),
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignSelf: 'flex-start',
  },
  addToCartText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  prepGroup: {
    gap: spacing(0.5),
    paddingBottom: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  prepGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    marginBottom: spacing(0.25),
  },
  prepGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  prepTask: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    paddingLeft: spacing(1.5),
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareCardText: { flex: 1 },
  shareCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  shareCardSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
});
