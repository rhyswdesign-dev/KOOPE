/**
 * Recipe Editor Screen
 * Full-screen editor for customizing AI-generated recipes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Cocktail } from '../types/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  recipe: Cocktail;
}

export default function RecipeEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { recipe } = route.params as RouteParams;

  // Editable fields
  const [name, setName] = useState(recipe.name || '');
  const [ingredients, setIngredients] = useState(recipe.ingredients || '');
  const [instructions, setInstructions] = useState(recipe.instructions || '');
  const [glassType, setGlassType] = useState(recipe.glass_type || '');
  const [garnish, setGarnish] = useState(recipe.garnish || '');
  const [category, setCategory] = useState(recipe.category || '');
  const [tips, setTips] = useState(recipe.tips || '');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a recipe name');
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert('Missing Ingredients', 'Please enter ingredients');
      return;
    }
    if (!instructions.trim()) {
      Alert.alert('Missing Instructions', 'Please enter instructions');
      return;
    }

    setSaving(true);

    try {
      // Create updated recipe object
      const updatedRecipe: Cocktail = {
        ...recipe,
        name,
        ingredients,
        instructions,
        glass_type: glassType,
        garnish,
        category,
        tips,
      };

      // TODO: Save to Supabase (update cocktails table)
      // await supabase.from('cocktails').update(updatedRecipe).eq('id', recipe.id);

      Alert.alert(
        'Recipe Saved! ✨',
        'Your customized recipe has been saved.',
        [
          {
            text: 'View Recipe',
            onPress: () => {
              navigation.replace('CocktailDetail', {
                cocktailId: recipe.id,
                cocktail: updatedRecipe,
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      Alert.alert('Save Failed', error.message || 'Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleDiscard}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customize Recipe</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipe Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Tropical Sunset"
              placeholderTextColor={colors.subtext}
              maxLength={50}
            />
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.label}>Ingredients *</Text>
            <Text style={styles.helperText}>
              Format: "2 oz vodka, 1 oz lime juice, 0.5 oz simple syrup"
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="List ingredients with measurements"
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.label}>Instructions *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Step-by-step preparation instructions"
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Glass Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Glass Type</Text>
            <TextInput
              style={styles.input}
              value={glassType}
              onChangeText={setGlassType}
              placeholder="e.g., Coupe Glass, Rocks Glass"
              placeholderTextColor={colors.subtext}
              maxLength={30}
            />
          </View>

          {/* Garnish */}
          <View style={styles.section}>
            <Text style={styles.label}>Garnish</Text>
            <TextInput
              style={styles.input}
              value={garnish}
              onChangeText={setGarnish}
              placeholder="e.g., Lime wheel, Mint sprig"
              placeholderTextColor={colors.subtext}
              maxLength={50}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g., refreshing, tropical, classic"
              placeholderTextColor={colors.subtext}
              maxLength={30}
            />
          </View>

          {/* Bartender Tips */}
          <View style={styles.section}>
            <Text style={styles.label}>Bartender Tips</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={tips}
              onChangeText={setTips}
              placeholder="Optional tips for making this cocktail"
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* AI Badge Info */}
          <View style={styles.aiBadgeInfo}>
            <Ionicons name="sparkles" size={16} color={colors.gold} />
            <Text style={styles.aiBadgeInfoText}>
              This recipe was AI-generated and can be fully customized
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
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
    width: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(3),
    paddingBottom: spacing(6),
  },
  section: {
    marginBottom: spacing(4),
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  helperText: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(1),
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing(1.5),
  },
  aiBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}15`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    marginTop: spacing(2),
  },
  aiBadgeInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
  },
});
