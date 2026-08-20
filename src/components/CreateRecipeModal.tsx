// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { uploadService, RecipeSubmission, UploadedFile } from '../services/uploadService';

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (recipeId: string) => void;
}

type RecipeType = 'cocktail' | 'syrup' | 'bitter' | 'infusion' | 'shrub' | 'cordial' | 'tincture';
type RecipeMethod = 'shake' | 'stir' | 'build' | 'blend' | 'muddle' | 'layer' | 'swizzle' | 'throw';

export default function CreateRecipeModal({ visible, onClose, onSuccess }: CreateRecipeModalProps) {
  const [recipe, setRecipe] = useState<Partial<RecipeSubmission>>({
    title: '',
    description: '',
    difficulty: 'medium',
    prepTime: 15,
    servings: 1,
    ingredients: [{ name: '', amount: '' }],
    instructions: [''],
    tags: [],
    images: [],
    videos: [],
    notes: [],
    author: { name: '' },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [recipeType, setRecipeType] = useState<RecipeType>('cocktail');
  const [recipeMethod, setRecipeMethod] = useState<RecipeMethod | null>(null);

  const updateField = <K extends keyof RecipeSubmission>(key: K, value: RecipeSubmission[K]) => {
    setRecipe((prev) => ({ ...prev, [key]: value }));
  };

  const addIngredient = () => {
    const newIngredients = [...(recipe.ingredients || []), { name: '', amount: '' }];
    updateField('ingredients', newIngredients);
  };

  const updateIngredient = (index: number, field: 'name' | 'amount' | 'optional', value: any) => {
    const updated = [...(recipe.ingredients || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField('ingredients', updated);
  };

  const removeIngredient = (index: number) => {
    const updated = (recipe.ingredients || []).filter((_, i) => i !== index);
    updateField('ingredients', updated);
  };

  const addInstruction = () => {
    const newInstructions = [...(recipe.instructions || []), ''];
    updateField('instructions', newInstructions);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...(recipe.instructions || [])];
    updated[index] = value;
    updateField('instructions', updated);
  };

  const removeInstruction = (index: number) => {
    const updated = (recipe.instructions || []).filter((_, i) => i !== index);
    updateField('instructions', updated);
  };

  const addTag = () => {
    if (currentTag.trim() && !(recipe.tags || []).includes(currentTag.trim())) {
      const newTags = [...(recipe.tags || []), currentTag.trim()];
      updateField('tags', newTags);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    const updated = (recipe.tags || []).filter((t) => t !== tag);
    updateField('tags', updated);
  };

  // Get step suggestions based on method and type
  const getStepSuggestions = (method: RecipeMethod | null, type: RecipeType): string[] => {
    if (!method) return [];

    const suggestions: Record<RecipeMethod, string[]> = {
      shake: [
        'Add all ingredients to a cocktail shaker',
        'Add ice and shake vigorously for 10-15 seconds',
        'Double strain into a chilled glass',
        'Garnish and serve',
      ],
      stir: [
        'Add all ingredients to a mixing glass',
        'Add ice and stir gently for 20-30 seconds',
        'Strain into a chilled glass',
        'Garnish and serve',
      ],
      build: [
        'Add ingredients directly to the serving glass',
        'Fill with ice',
        'Stir gently to combine',
        'Garnish and serve',
      ],
      blend: [
        'Add all ingredients to a blender',
        'Add ice and blend until smooth',
        'Pour into serving glass',
        'Garnish and serve',
      ],
      muddle: [
        'Add fresh ingredients to the bottom of the glass',
        'Muddle gently to release flavors',
        'Add remaining ingredients and ice',
        'Stir to combine',
        'Garnish and serve',
      ],
      layer: [
        'Pour the heaviest ingredient first',
        'Slowly layer each ingredient over a bar spoon',
        'Layer from heaviest to lightest',
        'Serve without stirring',
      ],
      swizzle: [
        'Add ingredients to a tall glass',
        'Fill glass with crushed ice',
        'Swizzle with a bar spoon or swizzle stick',
        'Top with more crushed ice',
        'Garnish and serve',
      ],
      throw: [
        'Pour ingredients into one tin',
        'Pour mixture back and forth between tins from a height',
        'Repeat 4-5 times to aerate and chill',
        'Strain into serving glass',
        'Garnish and serve',
      ],
    };

    // Adjust suggestions for non-cocktail types
    if (type === 'syrup') {
      return [
        'Combine ingredients in a pot',
        'Heat gently until sugar dissolves',
        'Simmer for recommended time',
        'Remove from heat and let cool',
        'Strain and bottle',
      ];
    } else if (type === 'bitter' || type === 'tincture') {
      return [
        'Combine ingredients in a sterilized jar',
        'Seal tightly and shake well',
        'Store in a cool, dark place',
        'Shake daily for recommended infusion period',
        'Strain and bottle',
      ];
    } else if (type === 'infusion') {
      return [
        'Add flavoring ingredients to the spirit',
        'Seal container and store in a cool place',
        'Taste daily until desired flavor is reached',
        'Strain out solids',
        'Bottle and label',
      ];
    }

    return suggestions[method] || [];
  };

  const handleAddImage = async () => {
    try {
      const images = await uploadService.pickImage({
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (images.length > 0) {
        const updated = [...(recipe.images || []), ...images];
        updateField('images', updated);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add images');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await uploadService.takePhoto();
      if (photo) {
        const updated = [...(recipe.images || []), photo];
        updateField('images', updated);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleAddVideo = async () => {
    try {
      const video = await uploadService.pickVideo();
      if (video) {
        const updated = [...(recipe.videos || []), video];
        updateField('videos', updated);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add video');
    }
  };

  const removeMedia = (type: 'images' | 'videos', index: number) => {
    const updated = (recipe[type] || []).filter((_, i) => i !== index);
    updateField(type, updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await uploadService.submitRecipe(recipe as RecipeSubmission);
      if (result.success) {
        Alert.alert('Success!', 'Your recipe has been submitted successfully.');
        onSuccess?.(result.id!);
        onClose();
        // Reset form
        setRecipe({
          title: '',
          description: '',
          difficulty: 'medium',
          prepTime: 15,
          servings: 1,
          ingredients: [{ name: '', amount: '' }],
          instructions: [''],
          tags: [],
          images: [],
          videos: [],
          notes: [],
          author: { name: '' },
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to submit recipe');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit recipe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyOptions = [
    { key: 'easy', label: 'Easy', icon: 'checkmark-circle', color: '#4CAF50' },
    { key: 'medium', label: 'Medium', icon: 'remove-circle', color: '#FF9800' },
    { key: 'hard', label: 'Hard', icon: 'close-circle', color: '#F44336' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Recipe</Text>
          <Pressable
            style={[styles.headerButton, styles.submitButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Recipe Title *</Text>
              <TextInput
                style={styles.textInput}
                value={recipe.title}
                onChangeText={(value) => updateField('title', value)}
                placeholder="Enter recipe title"
                placeholderTextColor={colors.subtext}
                keyboardAppearance="dark"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={recipe.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Describe your recipe..."
                placeholderTextColor={colors.subtext}
                multiline
                numberOfLines={3}
                keyboardAppearance="dark"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Author Name *</Text>
              <TextInput
                style={styles.textInput}
                value={recipe.author?.name}
                onChangeText={(value) => updateField('author', { ...recipe.author, name: value })}
                placeholder="Your name"
                placeholderTextColor={colors.subtext}
                keyboardAppearance="dark"
              />
            </View>

            {/* Recipe Type */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>What are you making? *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeOptions}
              >
                {[
                  { key: 'cocktail', label: 'Cocktail', icon: 'wine' },
                  { key: 'syrup', label: 'Syrup', icon: 'water' },
                  { key: 'bitter', label: 'Bitter', icon: 'flask' },
                  { key: 'infusion', label: 'Infusion', icon: 'beaker' },
                  { key: 'shrub', label: 'Shrub', icon: 'leaf' },
                  { key: 'cordial', label: 'Cordial', icon: 'sparkles' },
                  { key: 'tincture', label: 'Tincture', icon: 'eyedropper' },
                ].map((type) => {
                  const isSelected = recipeType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                      onPress={() => setRecipeType(type.key as RecipeType)}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={isSelected ? colors.gold : colors.text}
                      />
                      <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Prep Time (min) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={recipe.prepTime?.toString()}
                  onChangeText={(value) => updateField('prepTime', parseInt(value) || 0)}
                  placeholder="15"
                  keyboardType="numeric"
                  placeholderTextColor={colors.subtext}
                  keyboardAppearance="dark"
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Servings</Text>
                <TextInput
                  style={styles.textInput}
                  value={recipe.servings?.toString()}
                  onChangeText={(value) => updateField('servings', parseInt(value) || 1)}
                  placeholder="1"
                  keyboardType="numeric"
                  placeholderTextColor={colors.subtext}
                  keyboardAppearance="dark"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Difficulty *</Text>
              <View style={styles.difficultyOptions}>
                {difficultyOptions.map((option) => {
                  const isSelected = recipe.difficulty === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.difficultyOption,
                        isSelected && { backgroundColor: option.color, borderColor: option.color },
                      ]}
                      onPress={() => updateField('difficulty', option.key as any)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={isSelected ? colors.white : option.color}
                      />
                      <Text style={[styles.difficultyText, isSelected && { color: colors.white }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Pressable style={styles.addButton} onPress={addIngredient}>
                <Ionicons name="add" size={20} color={colors.accent} />
              </Pressable>
            </View>

            {(recipe.ingredients || []).map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={ingredient.amount}
                  onChangeText={(value) => updateIngredient(index, 'amount', value)}
                  placeholder="1 oz"
                  placeholderTextColor={colors.subtext}
                  keyboardAppearance="dark"
                />
                <TextInput
                  style={[styles.textInput, { flex: 2 }]}
                  value={ingredient.name}
                  onChangeText={(value) => updateIngredient(index, 'name', value)}
                  placeholder="Ingredient name"
                  placeholderTextColor={colors.subtext}
                  keyboardAppearance="dark"
                />
                {(recipe.ingredients || []).length > 1 && (
                  <Pressable onPress={() => removeIngredient(index)}>
                    <Ionicons name="trash" size={20} color={colors.error} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {/* Method Selection (only for cocktails) */}
          {recipeType === 'cocktail' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preparation Method</Text>
              <Text style={styles.helperText}>Select a method to get step-by-step guidance</Text>

              <View style={styles.methodGrid}>
                {[
                  { key: 'shake', label: 'Shake', icon: 'flash' },
                  { key: 'stir', label: 'Stir', icon: 'repeat' },
                  { key: 'build', label: 'Build', icon: 'layers' },
                  { key: 'blend', label: 'Blend', icon: 'thunderstorm' },
                  { key: 'muddle', label: 'Muddle', icon: 'leaf' },
                  { key: 'layer', label: 'Layer', icon: 'reorder-four' },
                  { key: 'swizzle', label: 'Swizzle', icon: 'sync' },
                  { key: 'throw', label: 'Throw', icon: 'return-up-forward' },
                ].map((method) => {
                  const isSelected = recipeMethod === method.key;
                  return (
                    <Pressable
                      key={method.key}
                      style={[styles.methodOption, isSelected && styles.methodOptionSelected]}
                      onPress={() => {
                        const selectedMethod = method.key as RecipeMethod;
                        setRecipeMethod(selectedMethod);
                        // Auto-apply suggestions
                        const suggestions = getStepSuggestions(selectedMethod, recipeType);
                        updateField('instructions', suggestions);
                      }}
                    >
                      <Ionicons
                        name={method.icon as any}
                        size={24}
                        color={isSelected ? colors.white : colors.accent}
                      />
                      <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                        {method.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {recipeMethod && (
                <View style={styles.methodHint}>
                  <Ionicons name="information-circle" size={16} color={colors.accent} />
                  <Text style={styles.methodHintText}>
                    Suggested steps have been added below. Feel free to customize them!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Pressable style={styles.addButton} onPress={addInstruction}>
                <Ionicons name="add" size={20} color={colors.accent} />
              </Pressable>
            </View>

            {!recipeMethod && recipeType === 'cocktail' && (
              <View style={styles.selectMethodHint}>
                <Ionicons name="arrow-up" size={20} color={colors.gold} />
                <Text style={styles.selectMethodHintText}>
                  Select a method above to get suggested steps!
                </Text>
              </View>
            )}

            {(recipe.instructions || []).map((instruction, index) => (
              <View key={index} style={styles.instructionRow}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <TextInput
                  style={[styles.textInput, styles.instructionInput]}
                  value={instruction}
                  onChangeText={(value) => updateInstruction(index, value)}
                  placeholder={`Step ${index + 1} instructions`}
                  placeholderTextColor={colors.subtext}
                  multiline
                  keyboardAppearance="dark"
                />
                {(recipe.instructions || []).length > 1 && (
                  <Pressable onPress={() => removeInstruction(index)}>
                    <Ionicons name="trash" size={20} color={colors.error} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {/* Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos & Videos</Text>

            <View style={styles.mediaButtons}>
              <Pressable style={styles.mediaButton} onPress={handleAddImage}>
                <Ionicons name="images" size={20} color={colors.accent} />
                <Text style={styles.mediaButtonText}>Add Photos</Text>
              </Pressable>

              <Pressable style={styles.mediaButton} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color={colors.accent} />
                <Text style={styles.mediaButtonText}>Take Photo</Text>
              </Pressable>

              <Pressable style={styles.mediaButton} onPress={handleAddVideo}>
                <Ionicons name="videocam" size={20} color={colors.accent} />
                <Text style={styles.mediaButtonText}>Add Video</Text>
              </Pressable>
            </View>

            {/* Media Preview */}
            {recipe.images && recipe.images.length > 0 && (
              <View style={styles.mediaGrid}>
                {recipe.images.map((image, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image source={{ uri: image.uri }} style={styles.mediaPreview} />
                    <Pressable
                      style={styles.removeMedia}
                      onPress={() => removeMedia('images', index)}
                    >
                      <Ionicons name="close" size={16} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>

            <View style={styles.tagInput}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={currentTag}
                onChangeText={setCurrentTag}
                placeholder="Add a tag"
                placeholderTextColor={colors.subtext}
                onSubmitEditing={addTag}
                keyboardAppearance="dark"
              />
              <Pressable style={styles.addButton} onPress={addTag}>
                <Ionicons name="add" size={20} color={colors.accent} />
              </Pressable>
            </View>

            {recipe.tags && recipe.tags.length > 0 && (
              <View style={styles.tagsList}>
                {recipe.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <Pressable onPress={() => removeTag(tag)}>
                      <Ionicons name="close" size={14} color={colors.accent} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: spacing(8) }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  headerButton: {
    padding: spacing(1),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(3),
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  field: {
    marginBottom: spacing(3),
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  difficultyOptions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  difficultyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radii.md,
    gap: spacing(1),
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    padding: spacing(1),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: colors.accent,
    borderRadius: 12,
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing(2.5),
  },
  instructionInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    gap: spacing(1),
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  mediaItem: {
    position: 'relative',
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
  },
  removeMedia: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    gap: spacing(1),
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: spacing(2),
    paddingVertical: spacing(1),
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radii.md,
    gap: spacing(1),
    minWidth: 100,
  },
  typeOptionSelected: {
    backgroundColor: `${colors.gold}20`,
    borderColor: colors.gold,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  typeTextSelected: {
    color: colors.gold,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  methodOption: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(3),
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    gap: spacing(1),
  },
  methodOptionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  methodTextSelected: {
    color: colors.white,
  },
  methodHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: `${colors.accent}15`,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderRadius: radii.md,
    marginTop: spacing(3),
  },
  methodHintText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  selectMethodHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: `${colors.gold}15`,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(3),
    borderWidth: 2,
    borderColor: `${colors.gold}30`,
    borderStyle: 'dashed',
  },
  selectMethodHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },
});
