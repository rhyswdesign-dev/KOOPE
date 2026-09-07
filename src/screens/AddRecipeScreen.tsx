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
  Image,
} from 'react-native';
import { colors, spacing, radii } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useUserRecipes } from '../store/useUserRecipes';
import { log } from '../lib/logger';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useScrollHaptic, withHaptic } from '../lib/haptics';
import PressableScale from '../components/animations/PressableScale';
import { IngredientLeaderList } from '../components/recipe/IngredientLeaderRow';

type RecipeType = 'cocktail' | 'syrup' | 'bitter' | 'infusion' | 'shrub' | 'cordial' | 'tincture';
type RecipeMethod = 'shake' | 'stir' | 'build' | 'blend' | 'muddle' | 'layer' | 'swizzle' | 'throw';

type ManualRecipe = {
  title: string;
  description: string;
  ingredients: {
    name: string;
    amount: string;
  }[];
  instructions: string[];
  garnish: string;
  glassware: string;
  time: string;
  servings: number;
  tags: string[];
  recipeType?: RecipeType;
  method?: RecipeMethod;
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

const AMOUNT_PREFIX_REGEX = /^\s*(\d*\.?\d+)\s*(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts)?\s+/i;
const RECIPE_MEDIA_DIR = `${FileSystem.documentDirectory || ''}recipe_media/`;

const normalizeAmount = (raw: string): string => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/\b(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts)\b/i.test(trimmed)) return trimmed;
  if (/^\d*\.?\d+$/.test(trimmed)) return `${trimmed} oz`;
  return trimmed;
};

const ensureRecipeMediaDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(RECIPE_MEDIA_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECIPE_MEDIA_DIR, { intermediates: true });
  }
};

const persistRecipeImage = async (sourceUri: string, suffix: 'original' | 'thumb' | 'header') => {
  if (!sourceUri) return sourceUri;
  if (sourceUri.startsWith(RECIPE_MEDIA_DIR)) return sourceUri;
  await ensureRecipeMediaDir();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${suffix}.jpg`;
  const destinationUri = `${RECIPE_MEDIA_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
};

export default function AddRecipeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { addRecipe, updateRecipe, getRecipeById } = useUserRecipes();
  const editingRecipe = (route.params as { recipe?: any; isEdit?: boolean } | undefined)?.recipe;
  const isEditMode = Boolean(editingRecipe?.id);
  const onScrollHaptic = useScrollHaptic('selection', 800);
  const [loading, setLoading] = useState(false);
  const [showGlasswareModal, setShowGlasswareModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [recipeMedia, setRecipeMedia] = useState<{
    original?: string;
    thumbnail?: string;
    header?: string;
  }>({});

  const [recipe, setRecipe] = useState<ManualRecipe>({
    title: '',
    description: '',
    ingredients: [{ name: '', amount: '' }],
    instructions: [''],
    garnish: '',
    glassware: 'Rocks Glass',
    time: '5',
    servings: 1,
    tags: ['Easy'],
    recipeType: 'cocktail',
    method: undefined,
  });

  React.useEffect(() => {
    if (!isEditMode || !editingRecipe) return;

    const normalizeIngredients = (ingredients: any[] = []) => {
      if (!Array.isArray(ingredients) || ingredients.length === 0)
        return [{ name: '', amount: '' }];
      return ingredients.map((ing: any) => {
        if (typeof ing === 'string') {
          const stringMatch = ing.match(AMOUNT_PREFIX_REGEX);
          if (stringMatch) {
            const amountRaw = `${stringMatch[1]} ${stringMatch[2] || ''}`.trim();
            return {
              amount: normalizeAmount(amountRaw),
              name: ing.replace(AMOUNT_PREFIX_REGEX, '').trim(),
            };
          }
          return { amount: '', name: ing };
        }
        const amountRaw = String(ing?.amount || '').trim();
        let name = String(ing?.name || '').trim();
        name = name.replace(AMOUNT_PREFIX_REGEX, '').trim();
        const amount = normalizeAmount(amountRaw);
        if (amount || name) return { amount, name };
        return { amount: '', name: String(ing || '') };
      });
    };

    const normalizeInstructions = (instructions: any[] = []) => {
      if (!Array.isArray(instructions) || instructions.length === 0) return [''];
      return instructions.map((inst: any) => String(inst || '')).filter(Boolean);
    };

    setRecipe({
      title: editingRecipe.name || editingRecipe.title || '',
      description: editingRecipe.description || '',
      ingredients: normalizeIngredients(editingRecipe.ingredients),
      instructions: normalizeInstructions(editingRecipe.instructions),
      garnish: editingRecipe.garnish || '',
      glassware: editingRecipe.glassware || 'Rocks Glass',
      time:
        String(editingRecipe.prepTime || editingRecipe.time || '5').replace(/[^\d]/g, '') || '5',
      servings: Number(editingRecipe.servings || 1),
      tags: editingRecipe.tags?.length ? editingRecipe.tags : ['Easy'],
      recipeType: 'cocktail',
      method: undefined,
    });

    setRecipeMedia({
      original: editingRecipe.image || editingRecipe.thumbnailImage || editingRecipe.headerImage,
      thumbnail: editingRecipe.thumbnailImage || editingRecipe.image,
      header: editingRecipe.headerImage || editingRecipe.image,
    });
  }, [isEditMode, editingRecipe]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: isEditMode ? 'Edit Recipe' : 'Create Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [nav, isEditMode]);

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setRecipe({ ...recipe, ingredients: updatedIngredients });
  };

  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { name: '', amount: '' }],
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
    const updatedInstructions = [...recipe.instructions];
    updatedInstructions[index] = value;
    setRecipe({ ...recipe, instructions: updatedInstructions });
  };

  const addInstruction = () => {
    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, ''],
    });
  };

  const processRecipeImage = async (uri: string) => {
    const base = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const sourceWidth = base.width;
    const sourceHeight = base.height;

    const cropToRatio = async (targetRatio: number, outputWidth: number, outputHeight: number) => {
      const sourceRatio = sourceWidth / sourceHeight;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      if (sourceRatio > targetRatio) {
        cropWidth = Math.floor(sourceHeight * targetRatio);
      } else {
        cropHeight = Math.floor(sourceWidth / targetRatio);
      }

      const originX = Math.max(0, Math.floor((sourceWidth - cropWidth) / 2));
      const originY = Math.max(0, Math.floor((sourceHeight - cropHeight) / 2));

      return ImageManipulator.manipulateAsync(
        uri,
        [
          { crop: { originX, originY, width: cropWidth, height: cropHeight } },
          { resize: { width: outputWidth, height: outputHeight } },
        ],
        {
          compress: 0.88,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
    };

    const [thumb, header] = await Promise.all([
      cropToRatio(4 / 5, 1080, 1350),
      cropToRatio(16 / 9, 1600, 900),
    ]);

    setRecipeMedia({
      original: base.uri,
      thumbnail: thumb.uri,
      header: header.uri,
    });
  };

  const handleUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to upload recipe images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    await processRecipeImage(result.assets[0].uri);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take recipe photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    await processRecipeImage(result.assets[0].uri);
  };

  const removeInstruction = (index: number) => {
    if (recipe.instructions.length > 1) {
      setRecipe({
        ...recipe,
        instructions: recipe.instructions.filter((_, i) => i !== index),
      });
    }
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

  const applyMethodSuggestions = (method: RecipeMethod) => {
    const suggestions = getStepSuggestions(method, recipe.recipeType || 'cocktail');
    setRecipe({ ...recipe, method, instructions: suggestions });
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
      const [persistentOriginal, persistentThumbnail, persistentHeader] = await Promise.all([
        recipeMedia.original
          ? persistRecipeImage(recipeMedia.original, 'original')
          : Promise.resolve(undefined),
        recipeMedia.thumbnail
          ? persistRecipeImage(recipeMedia.thumbnail, 'thumb')
          : Promise.resolve(undefined),
        recipeMedia.header
          ? persistRecipeImage(recipeMedia.header, 'header')
          : Promise.resolve(undefined),
      ]);

      const mappedDifficulty: 'Easy' | 'Medium' | 'Hard' =
        recipe.tags[0] === 'Intermediate'
          ? 'Medium'
          : recipe.tags[0] === 'Advanced'
            ? 'Hard'
            : 'Easy';

      const payload = {
        name: recipe.title.trim(),
        type: 'created' as const,
        description: recipe.description.trim() || 'Custom cocktail recipe',
        ingredients: recipe.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            name: ing.name.trim().replace(AMOUNT_PREFIX_REGEX, '').trim(),
            amount: normalizeAmount(ing.amount),
            unit: '',
          })),
        instructions: recipe.instructions.filter((inst) => inst.trim()),
        tags: recipe.tags,
        difficulty: mappedDifficulty,
        prepTime: parseInt(recipe.time) || 5,
        servings: recipe.servings,
        image: persistentThumbnail,
        thumbnailImage: persistentThumbnail,
        headerImage: persistentHeader || persistentOriginal,
        notes: `Garnish: ${recipe.garnish || 'None'}, Glass: ${recipe.glassware}`,
      };

      const canUpdateExisting = Boolean(
        isEditMode && editingRecipe?.id && getRecipeById(editingRecipe.id),
      );

      if (canUpdateExisting && editingRecipe?.id) {
        await updateRecipe(editingRecipe.id, payload);
      } else {
        await addRecipe(payload);
      }

      Alert.alert(
        'Success!',
        canUpdateExisting ? 'Your recipe has been updated' : 'Your recipe has been saved',
        isEditMode
          ? [{ text: 'Done', onPress: () => nav.goBack() }]
          : [
              { text: 'Create Another', onPress: resetForm },
              { text: 'View My Collection', onPress: () => nav.navigate('ProfileSavedItems') },
            ],
      );
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
      tags: ['Easy'],
      recipeType: 'cocktail',
      method: undefined,
    });
    setRecipeMedia({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={onScrollHaptic}
      >
        <View style={styles.minimalContainer}>
          {/* Title - Large and prominent */}
          <TextInput
            style={styles.minimalTitle}
            placeholder="Recipe Name"
            placeholderTextColor={colors.muted}
            value={recipe.title}
            onChangeText={(text) => setRecipe({ ...recipe, title: text })}
            keyboardAppearance="dark"
          />

          {/* Meta Info */}
          <View style={styles.mediaCard}>
            <Text style={styles.mediaTitle}>Recipe Cover</Text>
            <Text style={styles.mediaHint}>
              Keep the drink centered in the frame. We auto-generate thumbnail (4:5) + header
              (16:9).
            </Text>
            <View style={styles.mediaPreviewWrap}>
              {recipeMedia.thumbnail ? (
                <Image source={{ uri: recipeMedia.thumbnail }} style={styles.mediaPreview} />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={colors.subtext} />
                  <Text style={styles.mediaPlaceholderText}>No image selected</Text>
                </View>
              )}
              <View style={styles.mediaFrameGuide} />
            </View>
            <View style={styles.mediaActionsRow}>
              <TouchableOpacity
                style={styles.mediaActionButton}
                onPress={withHaptic(handleTakePhoto, 'selection')}
              >
                <Ionicons name="camera-outline" size={16} color={colors.gold} />
                <Text style={styles.mediaActionText}>Take Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaActionButton}
                onPress={withHaptic(handleUploadImage, 'selection')}
              >
                <Ionicons name="images-outline" size={16} color={colors.gold} />
                <Text style={styles.mediaActionText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.minimalMeta}>
            <TouchableOpacity
              style={styles.minimalMetaItem}
              onPress={withHaptic(() => setShowGlasswareModal(true), 'selection')}
            >
              <Text style={styles.minimalMetaLabel}>Glass</Text>
              <Text style={styles.minimalMetaValue}>{recipe.glassware}</Text>
            </TouchableOpacity>

            <View style={styles.minimalMetaDivider} />

            <TouchableOpacity
              style={styles.minimalMetaItem}
              onPress={withHaptic(() => setShowDifficultyModal(true), 'selection')}
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
                  onChangeText={(text) => setRecipe({ ...recipe, time: text })}
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
            onChangeText={(text) => setRecipe({ ...recipe, description: text })}
            multiline
            numberOfLines={2}
            keyboardAppearance="dark"
          />

          {/* Recipe Type Selection */}
          <Text style={styles.minimalLabel}>What are you making?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeChipsContainer}
            style={styles.typeChipsScroll}
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
              const isSelected = recipe.recipeType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                  onPress={withHaptic(
                    () =>
                      setRecipe({
                        ...recipe,
                        recipeType: type.key as RecipeType,
                        method: undefined,
                      }),
                    'selection',
                  )}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={16}
                    color={isSelected ? colors.gold : colors.subtext}
                  />
                  <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Divider */}
          <View style={styles.minimalDivider} />

          {/* Ingredients Section */}
          <Text style={styles.minimalSectionTitle}>Ingredients</Text>
          <IngredientLeaderList
            items={recipe.ingredients}
            readOnly={false}
            keyPrefix="add-ingredient"
            iconSize={16}
            iconColor={colors.muted}
            namePlaceholder="Ingredient name"
            amountPlaceholder="2 oz"
            placeholderTextColor={colors.muted}
            rowStyle={styles.minimalIngredientRow}
            iconStyle={styles.minimalIngredientLeaderIcon}
            nameStyle={styles.minimalNameInput}
            dotsStyle={styles.minimalIngredientLeaderDots}
            amountStyle={styles.minimalAmountInput}
            onChangeName={(index, text) => updateIngredient(index, 'name', text)}
            onChangeAmount={(index, text) => updateIngredient(index, 'amount', text)}
            renderRemoveAction={(_item, index) =>
              recipe.ingredients.length > 1 ? (
                <TouchableOpacity
                  onPress={withHaptic(() => removeIngredient(index), 'selection')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.minimalIngredientRemoveButton}
                >
                  <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
                </TouchableOpacity>
              ) : null
            }
          />
          <TouchableOpacity
            onPress={withHaptic(addIngredient, 'selection')}
            style={styles.minimalAddLink}
          >
            <Ionicons name="add" size={16} color={colors.gold} />
            <Text style={styles.minimalAddLinkText}>Add ingredient</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.minimalDivider} />

          {/* Method Selection (only for cocktails) */}
          {recipe.recipeType === 'cocktail' && (
            <>
              <Text style={styles.minimalSectionTitle}>Preparation Method</Text>
              <Text style={styles.minimalHelperText}>
                Select a method to get step-by-step guidance
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.methodScroll}
                contentContainerStyle={styles.methodScrollContent}
              >
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
                  const isSelected = recipe.method === method.key;
                  return (
                    <TouchableOpacity
                      key={method.key}
                      style={[styles.methodOption, isSelected && styles.methodOptionSelected]}
                      onPress={withHaptic(
                        () => applyMethodSuggestions(method.key as RecipeMethod),
                        'selection',
                      )}
                    >
                      <Ionicons
                        name={method.icon as any}
                        size={24}
                        color={isSelected ? colors.bg : colors.gold}
                      />
                      <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {recipe.method && (
                <View style={styles.methodHint}>
                  <Ionicons name="information-circle" size={16} color={colors.gold} />
                  <Text style={styles.methodHintText}>
                    Suggested steps added below. Customize as needed!
                  </Text>
                </View>
              )}

              <View style={styles.minimalDivider} />
            </>
          )}

          {/* Instructions Section */}
          <Text style={styles.minimalSectionTitle}>Instructions</Text>
          {!recipe.method && recipe.recipeType === 'cocktail' && (
            <View style={styles.selectMethodPrompt}>
              <Ionicons name="arrow-up" size={18} color={colors.gold} />
              <Text style={styles.selectMethodPromptText}>
                Select a method above to get suggested steps!
              </Text>
            </View>
          )}
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
                    onPress={withHaptic(() => removeInstruction(index), 'selection')}
                    style={styles.minimalRemoveStep}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            onPress={withHaptic(addInstruction, 'selection')}
            style={styles.minimalAddLink}
          >
            <Ionicons name="add" size={16} color={colors.gold} />
            <Text style={styles.minimalAddLinkText}>Add step</Text>
          </TouchableOpacity>

          {/* Garnish */}
          {recipe.garnish || (
            <TouchableOpacity
              style={styles.minimalAddLink}
              onPress={withHaptic(() => {
                if (!recipe.garnish) {
                  setRecipe({ ...recipe, garnish: '' });
                }
              }, 'selection')}
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
                onChangeText={(text) => setRecipe({ ...recipe, garnish: text })}
                placeholder="e.g., Orange twist"
                placeholderTextColor={colors.muted}
                keyboardAppearance="dark"
              />
            </View>
          )}
        </View>

        {/* Save Button */}
        <PressableScale
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={withHaptic(saveRecipe, 'medium')}
          disabled={loading}
          haptic={null}
          scaleTo={0.97}
        >
          <Ionicons name="checkmark-circle" size={24} color={colors.bg} />
          <Text style={styles.saveButtonText}>{loading ? 'Saving Recipe...' : 'Save Recipe'}</Text>
        </PressableScale>

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
                onPress={withHaptic(() => setShowGlasswareModal(false), 'selection')}
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
                    recipe.glassware === item && styles.modalOptionSelected,
                  ]}
                  onPress={withHaptic(() => {
                    setRecipe({ ...recipe, glassware: item });
                    setShowGlasswareModal(false);
                  }, 'selection')}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      recipe.glassware === item && styles.modalOptionTextSelected,
                    ]}
                  >
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
                onPress={withHaptic(() => setShowDifficultyModal(false), 'selection')}
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
                    recipe.tags[0] === item && styles.modalOptionSelected,
                  ]}
                  onPress={withHaptic(() => {
                    setRecipe({ ...recipe, tags: [item] });
                    setShowDifficultyModal(false);
                  }, 'selection')}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      recipe.tags[0] === item && styles.modalOptionTextSelected,
                    ]}
                  >
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
  mediaCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(2.5),
    gap: spacing(1),
  },
  mediaTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  mediaHint: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  mediaPreviewWrap: {
    marginTop: spacing(0.5),
    height: 140,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
  },
  mediaPlaceholderText: {
    color: colors.subtext,
    fontSize: 12,
  },
  mediaFrameGuide: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radii.md,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginTop: spacing(1),
  },
  mediaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    backgroundColor: colors.bg,
  },
  mediaActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
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
  // No `gap` here: the dot leader is what fills the row, so the pieces rely
  // on their own margins instead.
  minimalIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  minimalIngredientLeaderIcon: {
    marginRight: spacing(1),
  },
  minimalIngredientLeaderDots: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: spacing(1),
    fontSize: 15,
    letterSpacing: 1.5,
    color: colors.line,
  },
  minimalIngredientRemoveButton: {
    marginLeft: spacing(1),
  },
  // Unused, kept intentionally: the fixed-width wrapper the amount field sat
  // in before the amount input took its own width.
  minimalIngredientLeft: {
    width: 80,
  },
  minimalAmountInput: {
    width: 80,
    textAlign: 'right',
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },
  minimalNameInput: {
    flexShrink: 1,
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

  // Recipe Type Chips
  typeChipsScroll: {
    marginBottom: spacing(2),
  },
  typeChipsContainer: {
    flexDirection: 'row',
    gap: spacing(1.5),
    paddingVertical: spacing(1),
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2.5),
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
  },
  typeChipSelected: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}15`,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  typeChipTextSelected: {
    color: colors.gold,
  },

  // Method Selection
  minimalHelperText: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(2),
    fontStyle: 'italic',
  },
  methodScroll: {
    marginBottom: spacing(2),
    marginHorizontal: -spacing(2.5),
  },
  methodScrollContent: {
    paddingHorizontal: spacing(2.5),
    gap: spacing(1.5),
  },
  methodOption: {
    width: 90,
    height: 90,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    gap: spacing(0.75),
    backgroundColor: colors.bg,
  },
  methodOptionSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  methodTextSelected: {
    color: colors.bg,
  },
  methodHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: `${colors.gold}15`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(2),
  },
  methodHintText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  selectMethodPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: `${colors.gold}10`,
    borderWidth: 2,
    borderColor: `${colors.gold}30`,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    marginBottom: spacing(3),
  },
  selectMethodPromptText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold,
  },

  bottomSpacing: {
    height: spacing(4),
  },
});
