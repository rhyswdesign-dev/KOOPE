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

export default function CreateRecipeModal({
  visible,
  onClose,
  onSuccess,
}: CreateRecipeModalProps) {
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

  const updateField = <K extends keyof RecipeSubmission>(
    key: K,
    value: RecipeSubmission[K]
  ) => {
    setRecipe(prev => ({ ...prev, [key]: value }));
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
    const updated = (recipe.tags || []).filter(t => t !== tag);
    updateField('tags', updated);
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
            <Text style={styles.submitText}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
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
                        isSelected && { backgroundColor: option.color, borderColor: option.color }
                      ]}
                      onPress={() => updateField('difficulty', option.key as any)}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={isSelected ? colors.white : option.color} 
                      />
                      <Text style={[
                        styles.difficultyText,
                        isSelected && { color: colors.white }
                      ]}>
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

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Pressable style={styles.addButton} onPress={addInstruction}>
                <Ionicons name="add" size={20} color={colors.accent} />
              </Pressable>
            </View>

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
            {(recipe.images && recipe.images.length > 0) && (
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

            {(recipe.tags && recipe.tags.length > 0) && (
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
});