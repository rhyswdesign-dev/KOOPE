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
    <View style={styles.minimalContainer}>
      {/* Title - Large and prominent */}
      <TextInput
        style={styles.minimalTitle}
        placeholder="Recipe Name"
        placeholderTextColor={colors.muted}
        value={recipe.title}
        onChangeText={(text) => setRecipe({...recipe, title: text})}
        keyboardAppearance="dark"
      />

      {/* Meta Info */}
      <View style={styles.minimalMeta}>
        <TouchableOpacity
          style={styles.minimalMetaItem}
          onPress={() => setShowGlasswareModal(true)}
        >
          <Text style={styles.minimalMetaLabel}>Glass</Text>
          <Text style={styles.minimalMetaValue}>{recipe.glassware}</Text>
        </TouchableOpacity>

        <View style={styles.minimalMetaDivider} />

        <TouchableOpacity
          style={styles.minimalMetaItem}
          onPress={() => setShowDifficultyModal(true)}
        >
          <Text style={styles.minimalMetaLabel}>Level</Text>
          <Text style={styles.minimalMetaValue}>{recipe.tags[0]}</Text>
        </TouchableOpacity>

        <View style={styles.minimalMetaDivider} />

        <View style={styles.minimalMetaItem}>
          <Text style={styles.minimalMetaLabel}>Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={styles.minimalMetaInput}
              value={recipe.time}
              onChangeText={(text) => setRecipe({...recipe, time: text})}
              placeholder="5"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              keyboardAppearance="dark"
            />
            <Text style={styles.minimalMetaUnit}>min</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <TextInput
        style={styles.minimalDescription}
        placeholder="Describe this cocktail..."
        placeholderTextColor={colors.muted}
        value={recipe.description}
        onChangeText={(text) => setRecipe({...recipe, description: text})}
        multiline
        numberOfLines={2}
        keyboardAppearance="dark"
      />

      {/* Divider */}
      <View style={styles.minimalDivider} />

      {/* Ingredients Section */}
      <Text style={styles.minimalSectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ingredient, index) => (
        <View key={index} style={styles.minimalIngredientRow}>
          <View style={styles.minimalIngredientLeft}>
            <TextInput
              style={styles.minimalAmountInput}
              value={ingredient.amount}
              onChangeText={(text) => updateIngredient(index, 'amount', text)}
              placeholder="2 oz"
              placeholderTextColor={colors.muted}
              keyboardAppearance="dark"
            />
          </View>
          <TextInput
            style={styles.minimalNameInput}
            value={ingredient.name}
            onChangeText={(text) => updateIngredient(index, 'name', text)}
            placeholder="Ingredient name"
            placeholderTextColor={colors.muted}
            keyboardAppearance="dark"
          />
          {recipe.ingredients.length > 1 && (
            <TouchableOpacity
              onPress={() => removeIngredient(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={addIngredient} style={styles.minimalAddLink}>
        <Ionicons name="add" size={16} color={colors.gold} />
        <Text style={styles.minimalAddLinkText}>Add ingredient</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.minimalDivider} />

      {/* Instructions Section */}
      <Text style={styles.minimalSectionTitle}>Instructions</Text>
      {recipe.instructions.map((instruction, index) => (
        <View key={index} style={styles.minimalInstructionRow}>
          <Text style={styles.minimalStepLabel}>Step {index + 1}</Text>
          <View style={styles.minimalInstructionContent}>
            <TextInput
              style={styles.minimalInstructionInput}
              value={instruction}
              onChangeText={(text) => updateInstruction(index, text)}
              placeholder="Describe this step..."
              placeholderTextColor={colors.muted}
              multiline
              keyboardAppearance="dark"
            />
            {recipe.instructions.length > 1 && (
              <TouchableOpacity
                onPress={() => removeInstruction(index)}
                style={styles.minimalRemoveStep}
              >
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      <TouchableOpacity onPress={addInstruction} style={styles.minimalAddLink}>
        <Ionicons name="add" size={16} color={colors.gold} />
        <Text style={styles.minimalAddLinkText}>Add step</Text>
      </TouchableOpacity>

      {/* Garnish */}
      {recipe.garnish || (
        <TouchableOpacity
          style={styles.minimalAddLink}
          onPress={() => {}}
        >
          <Ionicons name="add" size={16} color={colors.gold} />
          <Text style={styles.minimalAddLinkText}>Add garnish (optional)</Text>
        </TouchableOpacity>
      )}
      {recipe.garnish && (
        <View style={styles.minimalGarnishSection}>
          <Text style={styles.minimalLabel}>Garnish</Text>
          <TextInput
            style={styles.minimalGarnishInput}
            value={recipe.garnish}
            onChangeText={(text) => setRecipe({...recipe, garnish: text})}
            placeholder="e.g., Orange twist"
            placeholderTextColor={colors.muted}
            keyboardAppearance="dark"
          />
        </View>
      )}
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

      {/* Modals remain the same */}
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

  // MINIMAL LAYOUT
  minimalContainer: {
    paddingVertical: spacing(3),
  },
  minimalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
    paddingHorizontal: 0,
  },
  minimalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  minimalMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  minimalMetaLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  minimalMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  minimalMetaInput: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
    width: 30,
    textAlign: 'center',
  },
  minimalMetaUnit: {
    fontSize: 12,
    color: colors.subtext,
    marginLeft: spacing(0.5),
  },
  minimalMetaDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.line,
  },
  minimalDescription: {
    fontSize: 15,
    color: colors.subtext,
    fontStyle: 'italic',
    marginBottom: spacing(3),
    paddingHorizontal: 0,
  },
  minimalDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing(3),
  },
  minimalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  minimalIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  minimalIngredientLeft: {
    width: 80,
  },
  minimalAmountInput: {
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },
  minimalNameInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },
  minimalInstructionRow: {
    marginBottom: spacing(3),
  },
  minimalStepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  minimalInstructionContent: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  minimalInstructionInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
    minHeight: 60,
  },
  minimalRemoveStep: {
    padding: spacing(1),
  },
  minimalAddLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
  },
  minimalAddLinkText: {
    fontSize: 15,
    color: colors.gold,
    fontWeight: '500',
  },
  minimalGarnishSection: {
    marginTop: spacing(2),
  },
  minimalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  minimalGarnishInput: {
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },

  // Save Button (shared)
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

  // Modal Styles (shared)
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
