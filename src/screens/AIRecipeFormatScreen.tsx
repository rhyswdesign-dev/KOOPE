import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { AIRecipeFormatter, FormattedRecipe, RecipeInput } from '../services/aiRecipeFormatter';
import VideoRecipeAnalyzer from '../services/videoRecipeAnalyzer';
import { RecipeIntelligenceService, RecipeIntelligence } from '../services/recipeIntelligenceService';
import { recipeService } from '../lib/supabaseData';
import { useAuth } from '../contexts/AuthContext';
import { log } from '../lib/logger';
import InPageTabBar from '../components/ui/InPageTabBar';

export default function AIRecipeFormatScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  // Safely parse route parameters
  const params = (route.params || {}) as { recipe?: any; startWithManual?: boolean; recipeUrl?: string };
  const recipe = params.recipe;
  const startWithManual = params.startWithManual;
  const recipeUrl = params.recipeUrl;
  const { user, isAuthenticated } = useAuth();

  // If no recipe, URL, or manual mode is provided, show error
  if (!recipe && !startWithManual && !recipeUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>No Recipe Data</Text>
          <Text style={styles.errorText}>No recipe data was provided for formatting.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => nav.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formattedRecipe, setFormattedRecipe] = useState<FormattedRecipe | null>(null);
  const [recipeIntelligence, setRecipeIntelligence] = useState<RecipeIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(startWithManual ? 'manual' : 'ai');
  const [manualRecipe, setManualRecipe] = useState<FormattedRecipe>({
    title: '',
    description: '',
    ingredients: [
      { name: '', amount: '', notes: '' }
    ],
    instructions: [''],
    garnish: '',
    glassware: '',
    time: '',
    servings: 1,
    tags: []
  });
  // Removed recipe type selection - AI will auto-detect

  useLayoutEffect(() => {
    nav.setOptions({
      title: activeTab === 'ai' ? '✨ AI Recipe Formatting' : '📝 Create Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
      headerShadowVisible: false,
    });
  }, [nav, activeTab]);

  useEffect(() => {
    // Auto-format immediately if we have recipe data or URL and are in AI mode
    if ((recipe || recipeUrl) && activeTab === 'ai') {
      formatRecipeWithAI();
    } else if (activeTab === 'manual' || startWithManual) {
      // For manual mode, set loading to false immediately
      setLoading(false);
    }
  }, [activeTab]);

  // Enhanced helper function to detect if URL is a video
  const isVideoUrl = (url: string): boolean => {
    const normalizedUrl = url.toLowerCase();

    // Social media video platforms
    const videoIndicators = [
      // TikTok
      'tiktok.com',
      'vm.tiktok.com',

      // YouTube
      'youtube.com',
      'youtu.be',
      'm.youtube.com',

      // Instagram
      'instagram.com/reel',
      'instagram.com/p/',
      'instagram.com/tv/',
      'www.instagram.com/reel',
      'www.instagram.com/p/',
      'www.instagram.com/tv/',

      // Twitter/X
      'twitter.com',
      'x.com',
      'mobile.twitter.com',

      // Facebook
      'facebook.com/watch',
      'fb.watch',
      'www.facebook.com/watch',

      // Snapchat
      'snapchat.com/t/',

      // General video indicators
      '/video',
      '/watch',
      '/reel',
      '/reels',
      '/tv',
      '/shorts'
    ];

    // Check for video file extensions
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const hasVideoExtension = videoExtensions.some(ext => normalizedUrl.includes(ext));

    // Check for video indicators or file extensions
    const hasVideoIndicator = videoIndicators.some(indicator => normalizedUrl.includes(indicator));

    return hasVideoIndicator || hasVideoExtension;
  };

  const formatRecipeWithAI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine the URL to use - either from recipe object or direct URL parameter
      const urlToProcess = recipe?.sourceUrl || recipeUrl;

      if (!urlToProcess) {
        throw new Error('No URL provided for recipe extraction');
      }

      // Check if this is a video URL and use video analyzer
      if (isVideoUrl(urlToProcess)) {
        log.info('AIRecipeFormatScreen', 'Detected video URL, using VideoRecipeAnalyzer', { url: urlToProcess });
        try {
          const result = await VideoRecipeAnalyzer.analyzeVideoFromURL(urlToProcess);
          setFormattedRecipe(result);
          return;
        } catch (videoError) {
          log.warn('AIRecipeFormatScreen', 'Video analysis failed, falling back to standard URL extraction', { url: urlToProcess });
          // Fall through to standard processing
        }
      }

      // Standard processing for non-video URLs
      const input: RecipeInput = {
        title: recipe?.title || recipe?.name || '',
        sourceUrl: urlToProcess,
        imageUrl: recipe?.imageUrl,
        userNotes: `Recipe from ${urlToProcess}`,
        // recipeType will be auto-detected by AI
      };

      // Extract text from URL if available
      try {
        const extractedText = await AIRecipeFormatter.extractTextFromUrl(urlToProcess);
        input.extractedText = extractedText;
      } catch (error) {
        log.info('AIRecipeFormatScreen', 'Could not extract URL text', { url: urlToProcess });
      }

      // Format with AI
      const result = await AIRecipeFormatter.formatRecipe(input);
      setFormattedRecipe(result);

      // Generate recipe intelligence in the background
      RecipeIntelligenceService.analyzeRecipe(result)
        .then(intelligence => {
          setRecipeIntelligence(intelligence);
        })
        .catch(error => {
          log.warn('AIRecipeFormatScreen', 'Recipe intelligence analysis failed', { recipeTitle: result.title });
          // Don't show error to user, intelligence is optional
        });

    } catch (error: any) {
      setError(error.message || 'Failed to format recipe with AI');
      log.error('AIRecipeFormatScreen', 'AI formatting error', error, { recipeUrl: urlToProcess });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const recipeToSave = activeTab === 'manual' ? manualRecipe : formattedRecipe;

    if (!recipeToSave) {
      Alert.alert('Error', 'No recipe data available');
      return;
    }

    if (activeTab === 'manual' && (!recipeToSave.title.trim() || recipeToSave.ingredients.length === 0)) {
      Alert.alert('Required Fields', 'Please provide at least a title and one ingredient');
      return;
    }

    log.info('AIRecipeFormatScreen', 'Starting save process', {
      hasRecipe: !!recipe,
      hasFormattedRecipe: !!formattedRecipe,
      isAuthenticated,
      userId: user?.id
    });

    if (!isAuthenticated || !user) {
      Alert.alert('Authentication Error', 'Please sign in to save recipes');
      return;
    }

    try {
      setSaving(true);

      // Check if this is a new recipe (from OCR/Vision) or existing recipe
      const isNewRecipe = !recipe || !recipe.id ||
                         recipe.id.startsWith('ocr-') ||
                         recipe.id.startsWith('vision-') ||
                         recipe.id.startsWith('manual-') ||
                         recipe.id.startsWith('temp-') ||
                         startWithManual;

      log.info('AIRecipeFormatScreen', 'Recipe save check', { recipeId: recipe?.id, isNewRecipe });

      if (isNewRecipe) {
        // Create new recipe in Supabase
        const recipeData = {
          user_id: user.id,
          name: recipeToSave.title,
          description: recipeToSave.description || '',
          ingredients: recipeToSave.ingredients?.map(ing => `${ing.amount} ${ing.name}`) || [],
          instructions: recipeToSave.instructions || [],
          category: activeTab === 'ai' ? 'AI Generated' : 'Manual Entry',
          difficulty: 'medium',
          prep_time: null,
          cook_time: null,
          servings: recipeToSave.servings || 1,
          image_url: recipe?.imageUrl || null,
          is_favorite: false,
        };

        log.info('AIRecipeFormatScreen', 'Creating new recipe', { title: recipeData.name, activeTab });
        const recipeId = await recipeService.create(recipeData);

        if (!recipeId) {
          throw new Error('Failed to create recipe');
        }

        log.info('AIRecipeFormatScreen', 'Recipe created successfully', { recipeId, title: recipeData.name });

        Alert.alert(
          'Success!',
          'Recipe has been created and saved with AI-generated structure.',
          [
            {
              text: 'Done',
              onPress: () => {
                // Navigate back to main tab and then to recipes
                nav.navigate('Main');
                // Navigate to recipes tab would need to be handled by the tab navigator
              },
            },
          ]
        );

      } else {
        // Update existing recipe in Supabase
        const updateData = {
          name: recipeToSave.title,
          description: recipeToSave.description || '',
          ingredients: recipeToSave.ingredients?.map(ing => `${ing.amount} ${ing.name}`) || [],
          instructions: recipeToSave.instructions || [],
          category: activeTab === 'ai' ? 'AI Generated' : 'Manual Entry',
          servings: recipeToSave.servings || 1,
        };

        log.info('AIRecipeFormatScreen', 'Updating existing recipe', { recipeId: recipe?.id, title: updateData.name, activeTab });
        const success = await recipeService.update(recipe!.id, updateData);

        if (!success) {
          throw new Error('Failed to update recipe');
        }

        log.info('AIRecipeFormatScreen', 'Recipe updated successfully', { recipeId: recipe?.id });

        Alert.alert(
          'Success!',
          'Recipe has been updated with AI-generated structure.',
          [
            {
              text: 'Done',
              onPress: () => nav.goBack(),
            },
          ]
        );
      }

    } catch (error: any) {
      log.error('AIRecipeFormatScreen', 'Save error', error, { recipeTitle: recipeToSave?.title, activeTab });
      Alert.alert('Error', error.message || 'Failed to save formatted recipe');
    } finally {
      setSaving(false);
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'amount' | 'notes', value: string) => {
    if (!formattedRecipe) return;

    const updatedIngredients = [...formattedRecipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };

    setFormattedRecipe({
      ...formattedRecipe,
      ingredients: updatedIngredients,
    });
  };

  const updateInstruction = (index: number, value: string) => {
    if (activeTab === 'manual') {
      const updatedInstructions = [...manualRecipe.instructions];
      updatedInstructions[index] = value;
      setManualRecipe({
        ...manualRecipe,
        instructions: updatedInstructions,
      });
    } else if (formattedRecipe) {
      const updatedInstructions = [...formattedRecipe.instructions];
      updatedInstructions[index] = value;
      setFormattedRecipe({
        ...formattedRecipe,
        instructions: updatedInstructions,
      });
    }
  };

  // Manual recipe helper functions
  const updateManualIngredient = (index: number, field: 'name' | 'amount' | 'notes', value: string) => {
    const updatedIngredients = [...manualRecipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setManualRecipe({
      ...manualRecipe,
      ingredients: updatedIngredients,
    });
  };

  const addManualIngredient = () => {
    setManualRecipe({
      ...manualRecipe,
      ingredients: [...manualRecipe.ingredients, { name: '', amount: '', notes: '' }],
    });
  };

  const removeManualIngredient = (index: number) => {
    if (manualRecipe.ingredients.length > 1) {
      setManualRecipe({
        ...manualRecipe,
        ingredients: manualRecipe.ingredients.filter((_, i) => i !== index),
      });
    }
  };

  const addManualInstruction = () => {
    setManualRecipe({
      ...manualRecipe,
      instructions: [...manualRecipe.instructions, ''],
    });
  };

  const removeManualInstruction = (index: number) => {
    if (manualRecipe.instructions.length > 1) {
      setManualRecipe({
        ...manualRecipe,
        instructions: manualRecipe.instructions.filter((_, i) => i !== index),
      });
    }
  };

  // Recipe type selection removed - AI auto-detects type from content

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>AI is formatting your recipe...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Formatting Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={formatRecipeWithAI}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualButton} onPress={() => nav.goBack()}>
            <Text style={styles.manualButtonText}>Manual Format Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render recipe content if we're in AI mode but don't have formatted recipe yet
  if (activeTab === 'ai' && !formattedRecipe) {
    return null;
  }

  const currentRecipe = activeTab === 'manual' ? manualRecipe : formattedRecipe;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <InPageTabBar
            items={[
              { key: 'ai', label: 'AI Generated', icon: 'sparkles' },
              { key: 'manual', label: 'Manual Entry', icon: 'create-outline' },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'ai' | 'manual')}
          />
        </View>

        {/* Enhanced Header with Recipe Preview */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {activeTab === 'ai' ? 'Recipe Card Preview' : 'Create Recipe'}
          </Text>
          <Text style={styles.subtitle}>
            {activeTab === 'ai'
              ? 'Review and refine your AI-generated recipe'
              : 'Manually create your cocktail recipe'
            }
          </Text>

          {/* Recipe Type Badge - only show for AI tab */}
          {activeTab === 'ai' && formattedRecipe?.tags && formattedRecipe.tags.length > 0 && (
            <View style={styles.tagContainer}>
              {formattedRecipe.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recipe Card Container */}
        <View style={styles.recipeCard}>
          {/* Recipe Title */}
          <View style={styles.titleSection}>
            <Text style={styles.label}>Recipe Title</Text>
            <TextInput
              style={[styles.input, styles.titleInput]}
              value={currentRecipe?.title || ''}
              onChangeText={(text) => {
                if (activeTab === 'manual') {
                  setManualRecipe({...manualRecipe, title: text});
                } else if (formattedRecipe) {
                  setFormattedRecipe({...formattedRecipe, title: text});
                }
              }}
              placeholder="Recipe title..."
              keyboardAppearance="dark"
            />
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={currentRecipe?.description || ''}
              onChangeText={(text) => {
                if (activeTab === 'manual') {
                  setManualRecipe({...manualRecipe, description: text});
                } else if (formattedRecipe) {
                  setFormattedRecipe({...formattedRecipe, description: text});
                }
              }}
              placeholder="What makes this recipe special?"
              multiline
              numberOfLines={3}
              keyboardAppearance="dark"
            />
          </View>

          {/* Ingredients */}
          <View style={styles.ingredientsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.sectionHeaderRight}>
                <Text style={styles.ingredientCount}>{currentRecipe?.ingredients.length || 0} items</Text>
                {activeTab === 'manual' && (
                  <TouchableOpacity onPress={addManualIngredient} style={styles.addButton}>
                    <Ionicons name="add" size={16} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.ingredientsContainer}>
              {currentRecipe?.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientCard}>
                  <View style={styles.ingredientNumber}>
                    <Text style={styles.ingredientNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.ingredientInputs}>
                    <TextInput
                      style={[styles.input, styles.ingredientAmount]}
                      value={ingredient.amount}
                      onChangeText={(text) => {
                        if (activeTab === 'manual') {
                          updateManualIngredient(index, 'amount', text);
                        } else {
                          updateIngredient(index, 'amount', text);
                        }
                      }}
                      placeholder="2 oz"
                      keyboardAppearance="dark"
                    />
                    <TextInput
                      style={[styles.input, styles.ingredientName]}
                      value={ingredient.name}
                      onChangeText={(text) => {
                        if (activeTab === 'manual') {
                          updateManualIngredient(index, 'name', text);
                        } else {
                          updateIngredient(index, 'name', text);
                        }
                      }}
                      placeholder="Ingredient name"
                      keyboardAppearance="dark"
                    />
                  </View>
                  {activeTab === 'manual' && currentRecipe.ingredients.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeManualIngredient(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <View style={styles.sectionHeaderRight}>
                <Text style={styles.stepCount}>{currentRecipe?.instructions.length || 0} steps</Text>
                {activeTab === 'manual' && (
                  <TouchableOpacity onPress={addManualInstruction} style={styles.addButton}>
                    <Ionicons name="add" size={16} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.instructionsContainer}>
              {currentRecipe?.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>Step {index + 1}</Text>
                    </View>
                    {activeTab === 'manual' && currentRecipe.instructions.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeManualInstruction(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.input, styles.instructionInput]}
                    value={instruction}
                    onChangeText={(text) => updateInstruction(index, text)}
                    placeholder={`Describe step ${index + 1}...`}
                    multiline
                    keyboardAppearance="dark"
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Recipe Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Recipe Details</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Garnish</Text>
                <TextInput
                  style={[styles.input, styles.detailInput]}
                  value={currentRecipe?.garnish || ''}
                  onChangeText={(text) => {
                    if (activeTab === 'manual') {
                      setManualRecipe({...manualRecipe, garnish: text});
                    } else if (formattedRecipe) {
                      setFormattedRecipe({...formattedRecipe, garnish: text});
                    }
                  }}
                  placeholder="Cherry, lemon twist..."
                  keyboardAppearance="dark"
                />
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Glassware</Text>
                <TextInput
                  style={[styles.input, styles.detailInput]}
                  value={currentRecipe?.glassware || ''}
                  onChangeText={(text) => {
                    if (activeTab === 'manual') {
                      setManualRecipe({...manualRecipe, glassware: text});
                    } else if (formattedRecipe) {
                      setFormattedRecipe({...formattedRecipe, glassware: text});
                    }
                  }}
                  placeholder="Rocks glass, coupe..."
                  keyboardAppearance="dark"
                />
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Prep Time</Text>
                <TextInput
                  style={[styles.input, styles.detailInput]}
                  value={currentRecipe?.time || ''}
                  onChangeText={(text) => {
                    if (activeTab === 'manual') {
                      setManualRecipe({...manualRecipe, time: text});
                    } else if (formattedRecipe) {
                      setFormattedRecipe({...formattedRecipe, time: text});
                    }
                  }}
                  placeholder="5 minutes"
                  keyboardAppearance="dark"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : activeTab === 'manual' ? 'Save Recipe' : 'Save Formatted Recipe'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => nav.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(3),
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    marginTop: spacing(3),
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    marginTop: spacing(2),
  },
  manualButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing(4),
  },
  title: {
    fontSize: fonts.h1,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  section: {
    marginBottom: spacing(3),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: spacing(1),
    marginBottom: spacing(1),
  },
  ingredientAmount: {
    width: 80,
  },
  ingredientName: {
    flex: 1,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  instructionInput: {
    flex: 1,
    minHeight: 50,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  halfSection: {
    flex: 1,
  },

  // Button container for proper spacing
  buttonContainer: {
    marginTop: spacing(4),
    marginBottom: spacing(4),
    gap: spacing(3),
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    gap: spacing(1.5),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  cancelButtonText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced recipe card styles
  tagContainer: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(2),
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
  },
  tagText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  recipeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  titleSection: {
    marginBottom: spacing(3),
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
  },

  descriptionSection: {
    marginBottom: spacing(3),
  },

  ingredientsSection: {
    marginBottom: spacing(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  ingredientCount: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '600',
  },
  stepCount: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '600',
  },

  ingredientsContainer: {
    gap: spacing(2),
  },
  ingredientCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  ingredientNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing(1.5),
  },

  instructionsSection: {
    marginBottom: spacing(3),
  },
  instructionsContainer: {
    gap: spacing(3),
  },
  instructionCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    alignSelf: 'flex-start',
    marginBottom: spacing(1.5),
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  detailsSection: {
    marginBottom: spacing(2),
  },
  detailsGrid: {
    gap: spacing(2),
    marginTop: spacing(2),
  },
  detailCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  detailInput: {
    fontSize: 14,
  },

  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(0.5),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  activeTab: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activeTabText: {
    color: colors.white,
  },

  // Section header improvements
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(1.5),
  },
});
