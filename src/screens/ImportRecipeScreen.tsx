/**
 * Import Recipe Screen
 * Review and edit recipes extracted from social media URLs
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useUserRecipes } from '../store/useUserRecipes';
import { useRecipeImports } from '../hooks/useRecipeImports';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  extractRecipeFromUrl,
  ExtractedRecipe,
  ExtractedIngredient,
  detectPlatform,
  getPlatformDisplayName,
  getPlatformIcon,
} from '../services/recipeImportService';
import { log } from '../lib/logger';

type ImportRecipeRouteProp = RouteProp<RootStackParamList, 'ImportRecipe'>;

export default function ImportRecipeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ImportRecipeRouteProp>();
  const { url } = route.params || {};

  const { addRecipe } = useUserRecipes();
  const {
    canImport,
    recordImport,
    getRemainingImports,
    hasImportedUrl,
    isPremium,
    FREE_IMPORT_LIMIT,
  } = useRecipeImports();
  const { isKoopePlus, isKoopePro } = useSubscription();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState(url || '');

  const [recipe, setRecipe] = useState<ExtractedRecipe>({
    name: '',
    description: '',
    ingredients: [{ name: '', amount: '', unit: '' }],
    instructions: [''],
    sourceUrl: url || '',
    sourcePlatform: 'other',
  });

  const platform = detectPlatform(inputUrl || url || '');
  const platformName = getPlatformDisplayName(platform);
  const platformIcon = getPlatformIcon(platform);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Import Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [nav]);

  // Check if can import on mount
  useEffect(() => {
    if (!canImport()) {
      Alert.alert(
        'Import Limit Reached',
        `Free users can import ${FREE_IMPORT_LIMIT} recipes per month. Upgrade to KOOPE+ for unlimited imports.`,
        [
          { text: 'Cancel', onPress: () => nav.goBack() },
          { text: 'Upgrade', onPress: () => nav.navigate('Paywall') },
        ]
      );
      return;
    }

    if (url) {
      extractRecipe(url);
    } else {
      setIsLoading(false);
    }
  }, []);

  const extractRecipe = async (urlToExtract: string) => {
    if (!urlToExtract.trim()) {
      setExtractionError('Please enter a URL');
      setIsLoading(false);
      return;
    }

    // Check if already imported
    if (hasImportedUrl(urlToExtract)) {
      Alert.alert(
        'Already Imported',
        'You have already imported a recipe from this URL.',
        [{ text: 'OK' }]
      );
    }

    setIsLoading(true);
    setExtractionError(null);

    try {
      const extracted = await extractRecipeFromUrl(urlToExtract);
      setRecipe(extracted);
      log.info('ImportRecipeScreen', 'Recipe extracted', { name: extracted.name });
    } catch (error) {
      log.error('ImportRecipeScreen', 'Extraction failed', error as Error);
      setExtractionError('Failed to extract recipe. Please fill in the details manually.');
      // Set up empty template
      setRecipe({
        name: '',
        description: '',
        ingredients: [{ name: '', amount: '', unit: '' }],
        instructions: [''],
        sourceUrl: urlToExtract,
        sourcePlatform: detectPlatform(urlToExtract),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof ExtractedIngredient,
    value: string
  ) => {
    const updated = [...recipe.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipe({ ...recipe, ingredients: updated });
  };

  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { name: '', amount: '', unit: '' }],
    });
  };

  const removeIngredient = (index: number) => {
    if (recipe.ingredients.length > 1) {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((_, i) => i !== index),
      });
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...recipe.instructions];
    updated[index] = value;
    setRecipe({ ...recipe, instructions: updated });
  };

  const addInstruction = () => {
    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, ''],
    });
  };

  const removeInstruction = (index: number) => {
    if (recipe.instructions.length > 1) {
      setRecipe({
        ...recipe,
        instructions: recipe.instructions.filter((_, i) => i !== index),
      });
    }
  };

  const handleSave = async () => {
    if (!recipe.name.trim()) {
      Alert.alert('Required', 'Please provide a recipe name');
      return;
    }

    if (!recipe.ingredients.some((ing) => ing.name.trim())) {
      Alert.alert('Required', 'Please add at least one ingredient');
      return;
    }

    if (!recipe.instructions.some((inst) => inst.trim())) {
      Alert.alert('Required', 'Please add at least one instruction');
      return;
    }

    setIsSaving(true);

    try {
      // Generate unique ID
      const recipeId = `imported-${Date.now()}`;

      // Save to user recipes
      await addRecipe({
        name: recipe.name.trim(),
        type: 'imported' as any, // Add 'imported' type
        description: recipe.description?.trim() || `Imported from ${platformName}`,
        ingredients: recipe.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            name: ing.name.trim(),
            amount: ing.amount.trim(),
            unit: ing.unit.trim(),
          })),
        instructions: recipe.instructions.filter((inst) => inst.trim()),
        tags: ['imported', platform],
        difficulty: recipe.difficulty || 'Medium',
        prepTime: recipe.prepTime || 5,
        notes: `Source: ${recipe.sourceUrl}`,
      });

      // Record the import
      await recordImport(recipe.sourceUrl, recipeId, platform);

      Alert.alert('Success!', 'Recipe imported successfully', [
        { text: 'View My Recipes', onPress: () => nav.navigate('MyRecipes') },
        { text: 'Import Another', onPress: () => resetForm() },
      ]);
    } catch (error) {
      log.error('ImportRecipeScreen', 'Save failed', error as Error);
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setInputUrl('');
    setRecipe({
      name: '',
      description: '',
      ingredients: [{ name: '', amount: '', unit: '' }],
      instructions: [''],
      sourceUrl: '',
      sourcePlatform: 'other',
    });
    setExtractionError(null);
  };

  const openSourceUrl = () => {
    if (recipe.sourceUrl) {
      Linking.openURL(recipe.sourceUrl);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Extracting recipe...</Text>
          <Text style={styles.loadingSubtext}>
            Analyzing content from {platformName}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input (if no URL provided) */}
        {!url && (
          <View style={styles.urlSection}>
            <Text style={styles.urlLabel}>Paste Recipe URL</Text>
            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.urlInput}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="https://instagram.com/p/..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={styles.extractButton}
                onPress={() => extractRecipe(inputUrl)}
              >
                <Ionicons name="download-outline" size={20} color={colors.bg} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Source Badge */}
        {recipe.sourceUrl && (
          <TouchableOpacity style={styles.sourceBadge} onPress={openSourceUrl}>
            <Ionicons name={platformIcon as any} size={16} color={colors.accent} />
            <Text style={styles.sourceText}>Imported from {platformName}</Text>
            <Ionicons name="open-outline" size={14} color={colors.muted} />
          </TouchableOpacity>
        )}

        {/* Extraction Error */}
        {extractionError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text style={styles.errorText}>{extractionError}</Text>
          </View>
        )}

        {/* Import Limit Banner (for free users) */}
        {!isPremium && (
          <View style={styles.limitBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.limitText}>
              {getRemainingImports()} of {FREE_IMPORT_LIMIT} free imports remaining this month
            </Text>
          </View>
        )}

        {/* Recipe Form */}
        <View style={styles.formContainer}>
          {/* Name */}
          <TextInput
            style={styles.titleInput}
            placeholder="Recipe Name"
            placeholderTextColor={colors.muted}
            value={recipe.name}
            onChangeText={(text) => setRecipe({ ...recipe, name: text })}
          />

          {/* Description */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Brief description..."
            placeholderTextColor={colors.muted}
            value={recipe.description}
            onChangeText={(text) => setRecipe({ ...recipe, description: text })}
            multiline
            numberOfLines={2}
          />

          <View style={styles.divider} />

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="2 oz"
                placeholderTextColor={colors.muted}
                value={ingredient.amount}
                onChangeText={(text) => updateIngredient(index, 'amount', text)}
              />
              <TextInput
                style={styles.ingredientNameInput}
                placeholder="Ingredient name"
                placeholderTextColor={colors.muted}
                value={ingredient.name}
                onChangeText={(text) => updateIngredient(index, 'name', text)}
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
          <TouchableOpacity onPress={addIngredient} style={styles.addLink}>
            <Ionicons name="add" size={16} color={colors.accent} />
            <Text style={styles.addLinkText}>Add ingredient</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Instructions */}
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.stepLabel}>Step {index + 1}</Text>
              <View style={styles.instructionContent}>
                <TextInput
                  style={styles.instructionInput}
                  placeholder="Describe this step..."
                  placeholderTextColor={colors.muted}
                  value={instruction}
                  onChangeText={(text) => updateInstruction(index, text)}
                  multiline
                />
                {recipe.instructions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstruction(index)}
                    style={styles.removeStep}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={addInstruction} style={styles.addLink}>
            <Ionicons name="add" size={16} color={colors.accent} />
            <Text style={styles.addLinkText}>Add step</Text>
          </TouchableOpacity>

          {/* Garnish (optional) */}
          {recipe.garnish && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Garnish</Text>
              <TextInput
                style={styles.garnishInput}
                placeholder="e.g., Orange twist"
                placeholderTextColor={colors.muted}
                value={recipe.garnish}
                onChangeText={(text) => setRecipe({ ...recipe, garnish: text })}
              />
            </>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="checkmark-circle" size={24} color={colors.bg} />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  loadingText: {
    fontSize: fonts.h3,
    fontWeight: '600',
    color: colors.text,
  },
  loadingSubtext: {
    fontSize: fonts.body,
    color: colors.subtext,
  },

  // URL Input
  urlSection: {
    marginBottom: spacing(3),
  },
  urlLabel: {
    fontSize: fonts.caption,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  urlInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: fonts.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  extractButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Source Badge
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.card,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: spacing(2),
  },
  sourceText: {
    fontSize: fonts.caption,
    color: colors.subtext,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: radii.md,
    padding: spacing(2),
    marginBottom: spacing(2),
  },
  errorText: {
    flex: 1,
    fontSize: fonts.caption,
    color: colors.warning,
  },

  // Limit Banner
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.accentBg,
    borderRadius: radii.md,
    padding: spacing(2),
    marginBottom: spacing(3),
  },
  limitText: {
    flex: 1,
    fontSize: fonts.caption,
    color: colors.accent,
  },

  // Form
  formContainer: {
    paddingVertical: spacing(2),
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  descriptionInput: {
    fontSize: fonts.body,
    color: colors.subtext,
    fontStyle: 'italic',
    marginBottom: spacing(2),
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing(3),
  },
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  amountInput: {
    width: 80,
    fontSize: fonts.body,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },
  ingredientNameInput: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },

  // Instructions
  instructionRow: {
    marginBottom: spacing(3),
  },
  stepLabel: {
    fontSize: fonts.caption,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionContent: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  instructionInput: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
    minHeight: 60,
  },
  removeStep: {
    padding: spacing(1),
  },

  // Add Link
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
  },
  addLinkText: {
    fontSize: fonts.body,
    color: colors.accent,
    fontWeight: '500',
  },

  // Garnish
  garnishInput: {
    fontSize: fonts.body,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.accent,
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

  bottomSpacing: {
    height: spacing(4),
  },
});
