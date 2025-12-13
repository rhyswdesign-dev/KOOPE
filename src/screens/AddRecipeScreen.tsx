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

const measurementOptions = ['BS', '0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '2.25', '2.5'];

const spiritsOptions = [
  'Bourbon Whiskey',
  'Rye Whiskey',
  'Scottish Whisky',
  'Irish Whiskey',
  'London Dry Gin',
  'Navy Strength Gin',
  'Barrel Aged Gin',
  'Premium Vodka',
  'White Rum',
  'Dark Rum',
  'Aged Rum',
  'Blanco Tequila',
  'Reposado Tequila',
  'Añejo Tequila',
  'Highland Crown',
  'Botanical Crown',
  'Crystal Peak',
  'Agave Real',
  'MixMind Rum'
];

const juicesOptions = [
  'Fresh Lemon Juice',
  'Fresh Lime Juice',
  'Fresh Orange Juice',
  'Fresh Grapefruit Juice',
  'Cranberry Juice',
  'Pineapple Juice',
  'Apple Juice',
  'Pomegranate Juice',
  'Fresh Ginger Juice',
  'Tomato Juice'
];

const syrupsOptions = [
  'Simple Syrup',
  'Honey Syrup',
  'Agave Syrup',
  'Demerara Syrup',
  'Maple Syrup',
  'Ginger Syrup',
  'Cinnamon Syrup',
  'Vanilla Syrup',
  'Grenadine',
  'Orgeat Syrup'
];

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
  'Shot Glass',
  'Collins Glass',
  'Nick & Nora Glass',
  'Snifter',
  'Tiki Mug'
];

const difficultyOptions = [
  'Beginner',
  'Easy',
  'Intermediate',
  'Advanced',
  'Expert'
];

export default function AddRecipeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addRecipe } = useUserRecipes();
  const [loading, setLoading] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showGlasswareModal, setShowGlasswareModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number>(0);
  const [ingredientModalType, setIngredientModalType] = useState<'spirits' | 'juices' | 'syrups'>('spirits');

  const [recipe, setRecipe] = useState<ManualRecipe>({
    title: '',
    description: '',
    ingredients: [{ name: '', amount: '' }],
    instructions: [''],
    garnish: '',
    glassware: '',
    time: '',
    servings: 1,
    tags: []
  });

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Create Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
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
      Alert.alert('Required Field', 'Please provide a recipe title');
      return;
    }

    if (recipe.ingredients.length === 0 || !recipe.ingredients[0].name.trim()) {
      Alert.alert('Required Field', 'Please provide at least one ingredient');
      return;
    }

    if (recipe.instructions.length === 0 || !recipe.instructions[0].trim()) {
      Alert.alert('Required Field', 'Please provide at least one instruction');
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
            name: ing.name.trim(),
            amount: ing.amount.trim(),
            unit: '',
            notes: ''
          })),
        instructions: recipe.instructions.filter(inst => inst.trim()),
        tags: recipe.tags,
        difficulty: recipe.tags.length ? recipe.tags[0] : 'Easy',
        prepTime: parseInt(recipe.time) || 5,
        servings: recipe.servings,
        notes: `Garnish: ${recipe.garnish}, Glass: ${recipe.glassware}`
      });

      Alert.alert('Success', 'Recipe saved successfully!', [
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
      glassware: '',
      time: '',
      servings: 1,
      tags: []
    });
  };

  const openMeasurementModal = (index: number) => {
    setSelectedIngredientIndex(index);
    setShowMeasurementModal(true);
  };

  const selectMeasurement = (measurement: string) => {
    updateIngredient(selectedIngredientIndex, 'amount', measurement + ' oz');
    setShowMeasurementModal(false);
  };

  const openIngredientModal = (index: number, type: 'spirits' | 'juices' | 'syrups') => {
    setSelectedIngredientIndex(index);
    setIngredientModalType(type);
    setShowIngredientModal(true);
  };

  const selectIngredient = (ingredient: string) => {
    // If it's the last ingredient and it's empty, use it
    const targetIndex = selectedIngredientIndex;
    if (targetIndex < recipe.ingredients.length && !recipe.ingredients[targetIndex].name) {
      updateIngredient(targetIndex, 'name', ingredient);
    } else {
      // Add a new ingredient
      setRecipe({
        ...recipe,
        ingredients: [...recipe.ingredients, { name: ingredient, amount: '' }]
      });
    }
    setShowIngredientModal(false);
  };

  const getIngredientOptions = () => {
    switch (ingredientModalType) {
      case 'spirits': return spiritsOptions;
      case 'juices': return juicesOptions;
      case 'syrups': return syrupsOptions;
      default: return [];
    }
  };

  const selectGlassware = (glassware: string) => {
    setRecipe({ ...recipe, glassware });
    setShowGlasswareModal(false);
  };

  const selectDifficulty = (difficulty: string) => {
    setRecipe({ ...recipe, tags: [difficulty] });
    setShowDifficultyModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recipe Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Classic Negroni"
            placeholderTextColor={colors.subtext}
            value={recipe.title}
            onChangeText={(text) => setRecipe({...recipe, title: text})}
            keyboardAppearance="dark"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="A brief, inviting description of your cocktail."
            placeholderTextColor={colors.subtext}
            value={recipe.description}
            onChangeText={(text) => setRecipe({...recipe, description: text})}
            multiline
            numberOfLines={3}
            keyboardAppearance="dark"
          />
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailHalf}>
              <Text style={styles.detailLabel}>Garnish</Text>
              <TextInput
                style={styles.input}
                value={recipe.garnish}
                onChangeText={(text) => setRecipe({...recipe, garnish: text})}
                placeholder="Orange Twist"
                placeholderTextColor={colors.subtext}
                keyboardAppearance="dark"
              />
            </View>
            <View style={styles.detailHalf}>
              <Text style={styles.detailLabel}>Glassware</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownButton]}
                onPress={() => setShowGlasswareModal(true)}
              >
                <Text style={[styles.dropdownText, !recipe.glassware && styles.placeholderText]}>
                  {recipe.glassware || 'Rocks'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.subtext} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailHalf}>
              <Text style={styles.detailLabel}>Prep Time</Text>
              <TextInput
                style={styles.input}
                value={recipe.time}
                onChangeText={(text) => setRecipe({...recipe, time: text})}
                placeholder="2 mins"
                placeholderTextColor={colors.subtext}
                keyboardAppearance="dark"
              />
            </View>
            <View style={styles.detailHalf}>
              <Text style={styles.detailLabel}>Servings</Text>
              <TextInput
                style={styles.input}
                value={recipe.servings.toString()}
                onChangeText={(text) => setRecipe({...recipe, servings: parseInt(text) || 1})}
                placeholder="1"
                placeholderTextColor={colors.subtext}
                keyboardType="number-pad"
                keyboardAppearance="dark"
              />
            </View>
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.label}>Difficulty</Text>
          <TouchableOpacity
            style={[styles.input, styles.dropdownButton]}
            onPress={() => setShowDifficultyModal(true)}
          >
            <Text style={[styles.dropdownText, !recipe.tags.length && styles.placeholderText]}>
              {recipe.tags.length ? recipe.tags[0] : 'Easy'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.label}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={[styles.input, styles.ingredientInput]}
                value={`${ingredient.amount} ${ingredient.name}`}
                onChangeText={(text) => {
                  const parts = text.split(' ');
                  const amount = parts[0];
                  const name = parts.slice(1).join(' ');
                  updateIngredient(index, 'amount', amount);
                  updateIngredient(index, 'name', name);
                }}
                placeholder="1 oz Gin"
                placeholderTextColor={colors.subtext}
                keyboardAppearance="dark"
              />
              {recipe.ingredients.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeIngredient(index)}
                  style={styles.removeIconButton}
                >
                  <Ionicons name="remove-circle-outline" size={22} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addIngredient} style={styles.addItemButton}>
            <Ionicons name="add" size={16} color={colors.subtext} />
            <Text style={styles.addItemText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.label}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <TextInput
                style={[styles.input, styles.instructionInput]}
                value={instruction}
                onChangeText={(text) => updateInstruction(index, text)}
                placeholder="Combine all ingredients in a mixing glass..."
                placeholderTextColor={colors.subtext}
                multiline
                keyboardAppearance="dark"
              />
              {recipe.instructions.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeInstruction(index)}
                  style={styles.removeIconButton}
                >
                  <Ionicons name="remove-circle-outline" size={22} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addInstruction} style={styles.addItemButton}>
            <Ionicons name="add" size={16} color={colors.subtext} />
            <Text style={styles.addItemText}>Add Step</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveRecipe}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Recipe'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Measurement Modal */}
      <Modal
        visible={showMeasurementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMeasurementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Amount</Text>
              <TouchableOpacity
                onPress={() => setShowMeasurementModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={measurementOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.measurementOption}
                  onPress={() => selectMeasurement(item)}
                >
                  <Text style={styles.measurementText}>{item} oz</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Ingredient Selection Modal */}
      <Modal
        visible={showIngredientModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIngredientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {ingredientModalType.charAt(0).toUpperCase() + ingredientModalType.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowIngredientModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getIngredientOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.measurementOption}
                  onPress={() => selectIngredient(item)}
                >
                  <Text style={styles.measurementText}>{item}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

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
            <FlatList
              data={glasswareOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.measurementOption}
                  onPress={() => selectGlassware(item)}
                >
                  <Text style={styles.measurementText}>{item}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
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
            <FlatList
              data={difficultyOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.measurementOption}
                  onPress={() => selectDifficulty(item)}
                >
                  <Text style={styles.measurementText}>{item}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
  },
  section: {
    marginBottom: spacing(4),
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing(2),
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginTop: spacing(1),
  },
  detailHalf: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.subtext,
    marginBottom: spacing(1.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  ingredientInput: {
    flex: 1,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    marginTop: spacing(2),
    width: 24,
  },
  instructionInput: {
    flex: 1,
    minHeight: 60,
  },
  removeIconButton: {
    padding: spacing(0.5),
    marginTop: spacing(1.5),
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    marginTop: spacing(1),
  },
  addItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.subtext,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.subtext,
  },
  saveButton: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    marginTop: spacing(3),
    marginBottom: spacing(6),
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '50%',
    paddingBottom: spacing(4),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing(1),
  },
  measurementOption: {
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  measurementText: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'center',
  },
});