import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { FormattedRecipe } from '../services/aiRecipeFormatter';
import GroceryListModal from './GroceryListModal';
import IngredientLeaderRow from './recipe/IngredientLeaderRow';

interface AIRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: FormattedRecipe | null;
  onSave?: (recipe: FormattedRecipe) => void;
  navigation: any;
}

export default function AIRecipeModal({
  visible,
  onClose,
  recipe,
  onSave,
  navigation,
}: AIRecipeModalProps) {
  const [groceryListVisible, setGroceryListVisible] = useState(false);

  if (!recipe) return null;

  const handleSaveRecipe = () => {
    if (onSave) {
      onSave(recipe);
    }
    Alert.alert('Recipe Saved', 'This AI-generated recipe has been saved to your collection.', [
      { text: 'OK' },
    ]);
  };

  const handleMakeRecipe = () => {
    // Navigate to the cocktail detail screen or close and navigate
    onClose();
    // Could navigate to a detail screen if we had one for AI recipes
    // navigation.navigate('CocktailDetail', { cocktailId: 'ai-recipe', aiRecipe: recipe });
  };

  const handleShoppingList = () => {
    setGroceryListVisible(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return colors.success || '#22c55e';
      case 'medium':
        return colors.warning || '#f59e0b';
      case 'hard':
        return colors.error || '#ef4444';
      default:
        return colors.accent;
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="sparkles" size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>AI Recipe</Text>
            </View>
            <TouchableOpacity onPress={handleSaveRecipe} style={styles.saveButton}>
              <Ionicons name="bookmark-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Recipe Title & Description */}
            <View style={styles.titleSection}>
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <Text style={styles.recipeDescription}>{recipe.description}</Text>

              <View style={styles.metaInfo}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.muted} />
                  <Text style={styles.metaText}>{recipe.time}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="wine-outline" size={16} color={colors.muted} />
                  <Text style={styles.metaText}>{recipe.glassware}</Text>
                </View>
                <View
                  style={[
                    styles.metaItem,
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(recipe.difficulty || 'Medium') + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.metaText,
                      { color: getDifficultyColor(recipe.difficulty || 'Medium') },
                    ]}
                  >
                    {recipe.difficulty}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientBlock,
                    index === recipe.ingredients.length - 1 && styles.ingredientBlockLast,
                  ]}
                >
                  <IngredientLeaderRow
                    name={ingredient.name}
                    amount={ingredient.amount}
                    iconSize={16}
                    iconColor={colors.muted}
                    trailingIcon={null}
                    rowStyle={styles.ingredientRow}
                    iconStyle={styles.ingredientLeaderIcon}
                    nameStyle={styles.ingredientName}
                    dotsStyle={styles.ingredientLeaderDots}
                    amountStyle={styles.ingredientAmount}
                  />
                  {/* Notes stay a footnote under the row rather than row
                      content — they are prose, not part of the spec line. */}
                  {ingredient.notes && (
                    <Text style={styles.ingredientNotes}>💡 {ingredient.notes}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {recipe.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>

            {/* Garnish */}
            {recipe.garnish && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Garnish</Text>
                <Text style={styles.garnishText}>🍋 {recipe.garnish}</Text>
              </View>
            )}

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {recipe.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleShoppingList}
            >
              <Ionicons name="basket-outline" size={20} color={colors.accent} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Shopping List
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleMakeRecipe}
            >
              <Ionicons name="play" size={20} color={colors.white} />
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Make Recipe</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Grocery List Modal */}
      <GroceryListModal
        visible={groceryListVisible}
        onClose={() => setGroceryListVisible(false)}
        recipeName={recipe.title}
        ingredients={recipe.ingredients.map((ing) => ({ name: ing.name, note: ing.notes }))}
        recipeId={`ai-recipe-${Date.now()}`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeButton: {
    padding: spacing(1),
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  saveButton: {
    padding: spacing(1),
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
  },
  titleSection: {
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  recipeTitle: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  recipeDescription: {
    fontSize: fonts.body,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  metaText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  section: {
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  // --- Unused, kept intentionally (not deleted) ---
  // The previous bullet-dot + stacked amount/name ingredient layout, replaced
  // by the shared icon + dot-leader row below.
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 8,
    marginRight: spacing(2),
  },
  ingredientContent: {
    flex: 1,
  },
  // --- Dot-leader ingredient rows ---
  // The divider lives on the wrapper block, not the row, so an ingredient
  // with a note keeps its note above the hairline rather than below it.
  ingredientBlock: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ingredientBlockLast: {
    borderBottomWidth: 0,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
  },
  ingredientLeaderIcon: {
    marginRight: spacing(1),
  },
  ingredientLeaderDots: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: spacing(1),
    fontSize: fonts.body,
    letterSpacing: 1.5,
    color: colors.line,
  },
  ingredientAmount: {
    flexShrink: 0,
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.accent,
  },
  ingredientName: {
    flexShrink: 1,
    fontSize: fonts.body,
    color: colors.text,
  },
  ingredientNotes: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: spacing(1.5),
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  instructionText: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.text,
    lineHeight: 20,
    paddingTop: 2,
  },
  garnishText: {
    fontSize: fonts.body,
    color: colors.text,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  tag: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  tagText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing(2),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionButtonText: {
    fontSize: fonts.body,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.accent,
  },
});
