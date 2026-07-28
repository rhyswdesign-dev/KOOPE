/**
 * Cocktail Hook Rail — "Owning this unlocks N cocktails with your shelf"
 *
 * The Answer Card's Hook block (spec §B.1 line 3, §B.4 item 3), extracted
 * from BottleDetailScreen per the god-file standing rule.
 *
 * The locked card is a **real item in the horizontal row**, not a
 * ListFooterComponent appended after it — the spec asks for "3 recipe cards
 * free, 4th greyed = paywall" as one row of four peers, so it rides the
 * same `data` array and the same ItemSeparatorComponent gap as the free
 * cards and can never drift out of the row's rhythm.
 *
 * Pure presentation: ranking, tier gating and paywall triggering all stay
 * in the screen and arrive here as props.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import RecipeCard from '../RecipeCard';
import LockedRecipeCard from '../LockedRecipeCard';
import { getCocktailImage } from '../../../assets/images/cocktails';
import { getMatchMessage } from '../../utils/recipeMatching';
import type { RecipeMatch } from '../../utils/recipeMatching';
import { ANSWER_CARD_FREE_RECIPE_COUNT } from '../../config/tierAccess';

type HookRecipe = any & { match?: RecipeMatch };

type RailItem =
  | { kind: 'recipe'; key: string; recipe: HookRecipe }
  | { kind: 'locked'; key: string; recipe: HookRecipe };

interface CocktailHookRailProps {
  /** Already ranked + tier-gated free/accessible recipes. */
  cocktails: HookRecipe[];
  /** How many matched recipes the user can't reach on their tier. */
  lockedCount: number;
  /** Best locked recipe, rendered as the greyed 4th card. */
  lockedTeaser: HookRecipe | null;
  /** Show the locked card at all (free tier only). */
  showLockedCard: boolean;
  /** Gift mode has a recipient hint — retitles the block. */
  hasGiftHint: boolean;
  /** Sipping bottles lead with "respect this bottle" copy instead. */
  respectFirst: boolean;
  onPressRecipe: (cocktailId: string) => void;
  onPressLocked: () => void;
}

export default function CocktailHookRail({
  cocktails,
  lockedCount,
  lockedTeaser,
  showLockedCard,
  hasGiftHint,
  respectFirst,
  onPressRecipe,
  onPressLocked,
}: CocktailHookRailProps) {
  const railItems = useMemo<RailItem[]>(() => {
    const items: RailItem[] = cocktails.map((recipe) => ({
      kind: 'recipe',
      key: recipe.id,
      recipe,
    }));
    if (showLockedCard && lockedCount > 0 && lockedTeaser) {
      items.push({ kind: 'locked', key: `locked-${lockedTeaser.id}`, recipe: lockedTeaser });
    }
    return items;
  }, [cocktails, showLockedCard, lockedCount, lockedTeaser]);

  if (cocktails.length === 0) return null;

  // Big-number headline: the whole point of the Hook is the count, so lead
  // with it whenever there's a locked pool to count toward.
  const title = hasGiftHint
    ? `They could make ${cocktails.length} cocktails with this bottle`
    : showLockedCard && lockedCount > 0
      ? `Owning this unlocks ${cocktails.length + lockedCount} cocktails with your shelf`
      : respectFirst
        ? 'Cocktails That Respect This Bottle'
        : 'Cocktails You Can Make';

  const subtitle = hasGiftHint
    ? 'Matched to how they like it'
    : showLockedCard
      ? lockedCount > 0
        ? `${ANSWER_CARD_FREE_RECIPE_COUNT} free now — the rest with KŌOPE+`
        : 'From your free and unlocked recipe pool.'
      : 'Best matches from your current recipe access.';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.gold} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={railItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.kind === 'locked') {
            return (
              <LockedRecipeCard
                image={getCocktailImage(item.recipe.id, item.recipe.image)}
                title={item.recipe.name}
                subtitle={
                  lockedCount > 1 ? `+${lockedCount - 1} more with KŌOPE+` : 'Unlock with KŌOPE+'
                }
                onPress={onPressLocked}
                style={styles.lockedCard}
              />
            );
          }

          const cocktail = item.recipe;
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
              onPress={() => onPressRecipe(cocktail.id)}
              showSaveButton={false}
              showCartButton={false}
              showDeleteButton={false}
              style={styles.recipeCard}
            />
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        nestedScrollEnabled
        removeClippedSubviews={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
    marginBottom: spacing(2),
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing(0.5),
    fontSize: 12,
    color: colors.subtext,
  },
  rail: {
    paddingLeft: spacing(0.25),
    paddingRight: spacing(2),
  },
  separator: {
    width: spacing(2),
  },
  recipeCard: {
    width: 240,
  },
  lockedCard: {
    width: 240,
    height: 320,
  },
});
