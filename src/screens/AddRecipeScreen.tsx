import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useUserRecipes } from '../store/useUserRecipes';
import { log } from '../lib/logger';

type ManualRecipe = {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
  }>;
  instructions: string[];
  garnish: string;
  glassware: string;
  time: string;
  servings: number;
  tags: string[];
};

const glasswareOptions = [
  'Rocks Glass',
  'Highball Glass',
  'Coupe Glass',
  'Martini Glass',
  'Copa Glass',
  'Champagne Flute',
  'Hurricane Glass',
  'Copper Mug',
  'Wine Glass',
  'Collins Glass',
  'Nick & Nora Glass',
];

const difficultyOptions = ['Easy', 'Intermediate', 'Advanced'];

export default function AddRecipeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addRecipe } = useUserRecipes();
  const [loading, setLoading] = useState(false);
  const [showGlasswareModal, setShowGlasswareModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);

  const [recipe, setRecipe] = useState<ManualRecipe>({
    title: '',
    description: '',
    ingredients: [{ name: '', amount: '' }],
    instructions: [''],
    garnish: '',
    glassware: 'Rocks Glass',
    time: '5',
    servings: 1,
    tags: ['Easy']
  });

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Create Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [nav]);

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setRecipe({ ...recipe, ingredients: updatedIngredients });
  };

  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { name: '', amount: '' }]
    });
  };

  const removeIngredient = (index: number) => {
    if (recipe.ingredients.length > 1) {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((_, i) => i !== index)
      });
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updatedInstructions = [...recipe.instructions];
    updatedInstructions[index] = value;
    setRecipe({ ...recipe, instructions: updatedInstructions });
  };

  const addInstruction = () => {
    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, '']
    });
  };

  const removeInstruction = (index: number) => {
    if (recipe.instructions.length > 1) {
      setRecipe({
        ...recipe,
        instructions: recipe.instructions.filter((_, i) => i !== index)
      });
    }
  };

  const saveRecipe = async () => {
    if (!recipe.title.trim()) {
      Alert.alert('Required Field', 'Please provide a recipe name');
      return;
    }

    if (recipe.ingredients.length === 0 || !recipe.ingredients[0].name.trim()) {
      Alert.alert('Required Field', 'Please add at least one ingredient');
      return;
    }

    if (recipe.instructions.length === 0 || !recipe.instructions[0].trim()) {
      Alert.alert('Required Field', 'Please add at least one instruction');
      return;
    }

    setLoading(true);
    try {
      await addRecipe({
        name: recipe.title.trim(),
        type: 'created',
        description: recipe.description.trim() || 'Custom cocktail recipe',
        ingredients: recipe.ingredients
          .filter(ing => ing.name.trim())
          .map(ing => ({
            name: `${ing.amount.trim()} ${ing.name.trim()}`.trim(),
            amount: ing.amount.trim(),
            unit: '',
            notes: ''
          })),
        instructions: recipe.instructions.filter(inst => inst.trim()),
        tags: recipe.tags,
        difficulty: recipe.tags[0] || 'Easy',
        prepTime: parseInt(recipe.time) || 5,
        servings: recipe.servings,
        notes: `Garnish: ${recipe.garnish || 'None'}, Glass: ${recipe.glassware}`
      });

      Alert.alert('Success!', 'Your recipe has been saved', [
        { text: 'Create Another', onPress: resetForm },
        { text: 'View My Recipes', onPress: () => nav.navigate('MyRecipes') }
      ]);
    } catch (error: any) {
      log.error('AddRecipeScreen', 'Save error', error, { recipeName: recipe.title });
      Alert.alert('Error', `Failed to save recipe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecipe({
      title: '',
      description: '',
      ingredients: [{ name: '', amount: '' }],
      instructions: [''],
      garnish: '',
      glassware: 'Rocks Glass',
      time: '5',
      servings: 1,
      tags: ['Easy']
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="create-outline" size={32} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Create Your Recipe</Text>
          <Text style={styles.heroSubtitle}>
            Design your perfect cocktail with custom ingredients and instructions
          </Text>
        </View>

        {/* Recipe Name */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wine" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Recipe Name</Text>
          </View>
          <TextInput
            style={styles.titleInput}
            placeholder="e.g., Smoky Old Fashioned"
            placeholderTextColor={colors.muted}
            value={recipe.title}
            onChangeText={(text) => setRecipe({...recipe, title: text})}
            keyboardAppearance="dark"
          />
        </View>

        {/* Description */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Description</Text>
          </View>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe your cocktail's flavor profile and inspiration..."
            placeholderTextColor={colors.muted}
            value={recipe.description}
            onChangeText={(text) => setRecipe({...recipe, description: text})}
            multiline
            numberOfLines={3}
            keyboardAppearance="dark"
          />
        </View>

        {/* Recipe Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Details</Text>
          </View>

          <View style={styles.detailsGrid}>
            {/* Glassware */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Glassware</Text>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => setShowGlasswareModal(true)}
              >
                <Text style={styles.detailButtonText}>{recipe.glassware}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.gold} />
              </TouchableOpacity>
            </View>

            {/* Difficulty */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Difficulty</Text>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => setShowDifficultyModal(true)}
              >
                <Text style={styles.detailButtonText}>{recipe.tags[0] || 'Easy'}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.gold} />
              </TouchableOpacity>
            </View>

            {/* Prep Time */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Prep Time</Text>
              <View style={styles.detailButton}>
                <TextInput
                  style={styles.detailInput}
                  value={recipe.time}
                  onChangeText={(text) => setRecipe({...recipe, time: text})}
                  placeholder="5"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                />
                <Text style={styles.detailUnitText}>min</Text>
              </View>
            </View>

            {/* Servings */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Servings</Text>
              <View style={styles.detailButton}>
                <TextInput
                  style={styles.detailInput}
                  value={recipe.servings.toString()}
                  onChangeText={(text) => setRecipe({...recipe, servings: parseInt(text) || 1})}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                />
              </View>
            </View>
          </View>

          {/* Garnish */}
          <View style={styles.garnishSection}>
            <Text style={styles.detailLabel}>Garnish (Optional)</Text>
            <TextInput
              style={styles.garnishInput}
              value={recipe.garnish}
              onChangeText={(text) => setRecipe({...recipe, garnish: text})}
              placeholder="e.g., Orange twist, Luxardo cherry"
              placeholderTextColor={colors.muted}
              keyboardAppearance="dark"
            />
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Ingredients</Text>
          </View>

          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.ingredientNumber}>
                <Text style={styles.ingredientNumberText}>{index + 1}</Text>
              </View>

              <View style={styles.ingredientInputs}>
                <TextInput
                  style={styles.ingredientAmountInput}
                  value={ingredient.amount}
                  onChangeText={(text) => updateIngredient(index, 'amount', text)}
                  placeholder="2 oz"
                  placeholderTextColor={colors.muted}
                  keyboardAppearance="dark"
                />
                <TextInput
                  style={styles.ingredientNameInput}
                  value={ingredient.name}
                  onChangeText={(text) => updateIngredient(index, 'name', text)}
                  placeholder="Bourbon Whiskey"
                  placeholderTextColor={colors.muted}
                  keyboardAppearance="dark"
                />
              </View>

              {recipe.ingredients.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error || '#ff4444'} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color={colors.gold} />
            <Text style={styles.addButtonText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-circle-outline" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Instructions</Text>
          </View>

          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>

              <TextInput
                style={styles.instructionInput}
                value={instruction}
                onChangeText={(text) => updateInstruction(index, text)}
                placeholder="Combine all ingredients in a mixing glass with ice..."
                placeholderTextColor={colors.muted}
                multiline
                keyboardAppearance="dark"
              />

              {recipe.instructions.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeInstruction(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error || '#ff4444'} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color={colors.gold} />
            <Text style={styles.addButtonText}>Add Step</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveRecipe}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={24} color={colors.bg} />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving Recipe...' : 'Save Recipe'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Glassware Selection Modal */}
      <Modal
        visible={showGlasswareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGlasswareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Glassware</Text>
              <TouchableOpacity
                onPress={() => setShowGlasswareModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {glasswareOptions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.modalOption,
                    recipe.glassware === item && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setRecipe({ ...recipe, glassware: item });
                    setShowGlasswareModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    recipe.glassware === item && styles.modalOptionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {recipe.glassware === item && (
                    <Ionicons name="checkmark" size={20} color={colors.gold} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Difficulty Selection Modal */}
      <Modal
        visible={showDifficultyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Difficulty</Text>
              <TouchableOpacity
                onPress={() => setShowDifficultyModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {difficultyOptions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.modalOption,
                    recipe.tags[0] === item && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setRecipe({ ...recipe, tags: [item] });
                    setShowDifficultyModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    recipe.tags[0] === item && styles.modalOptionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {recipe.tags[0] === item && (
                    <Ionicons name="checkmark" size={20} color={colors.gold} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    marginBottom: spacing(2),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
    borderWidth: 2,
    borderColor: colors.gold,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    paddingHorizontal: spacing(4),
  },

  // Card Styles
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(1),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  // Title Input
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },

  // Description Input
  descriptionInput: {
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.line,
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  detailInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    padding: 0,
  },
  detailUnitText: {
    fontSize: 15,
    color: colors.subtext,
    marginLeft: spacing(1),
  },

  // Garnish Section
  garnishSection: {
    marginTop: spacing(1),
  },
  garnishInput: {
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },
  ingredientNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bg,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  ingredientAmountInput: {
    flex: 0.3,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  ingredientNameInput: {
    flex: 0.7,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },

  // Instructions
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(1),
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bg,
  },
  instructionInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.line,
  },

  // Buttons
  removeButton: {
    padding: spacing(1),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gold,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    paddingVertical: spacing(3),
    marginTop: spacing(2),
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '60%',
    paddingBottom: spacing(4),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing(1),
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalOptionSelected: {
    backgroundColor: colors.bg,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: colors.gold,
  },

  bottomSpacing: {
    height: spacing(4),
  },
});
