import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { AIRecipeFormatter, FormattedRecipe } from '../services/aiRecipeFormatter';
import { useUserRecipes } from '../store/useUserRecipes';
import { log } from '../lib/logger';
import { IngredientLeaderList } from '../components/recipe/IngredientLeaderRow';

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

type EditableRecipe = {
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  garnish: string;
  glassware: string;
  time: string;
  servings: number;
};

const EMPTY_RECIPE: EditableRecipe = {
  title: '',
  description: '',
  ingredients: [{ name: '', amount: '' }],
  instructions: [''],
  garnish: '',
  glassware: 'Rocks Glass',
  time: '5',
  servings: 1,
};

export default function AIRecipeFormatScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const params = (route.params || {}) as { recipe?: any; startWithManual?: boolean };
  const sourceRecipe = params.recipe;
  const startWithManual = params.startWithManual;

  const { addRecipe } = useUserRecipes();

  const [loading, setLoading] = useState(!startWithManual && !!sourceRecipe?.extractedText);
  const [saving, setSaving] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [recipe, setRecipe] = useState<EditableRecipe>(EMPTY_RECIPE);
  const [showGlasswareModal, setShowGlasswareModal] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Format Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontFamily: serif },
      headerShadowVisible: false,
    });
  }, [nav]);

  useEffect(() => {
    if (startWithManual || !sourceRecipe?.extractedText) {
      setLoading(false);
      return;
    }
    formatWithAI();
  }, []);

  // Parse raw OCR text into form fields when AI is unavailable.
  // Handles two formats:
  //   Measured:  "2 oz Tanqueray Gin, 0.5 oz Aperol" (standard recipe)
  //   Menu-style: "Tanqueray Gin, Aperol, Sherry Fino, rosemary" (comma-separated, no measurements)
  const parseOCRFallback = (text: string): EditableRecipe => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const MEASURE_RE =
      /\d+(\.\d+)?\s*(oz|ml|dash|dashes|tsp|tbsp|cl|cup|part|parts|barspoon|drop|drops|rinse)/i;
    const PRICE_RE = /\$[\d.]+/;
    const NOISE_RE = /^[A-Z][A-Z\s]{3,}$/;

    let title = '';
    const measuredIngredients: { name: string; amount: string }[] = [];
    const instructions: string[] = [];
    let menuIngredientLine = '';

    lines.forEach((line, i) => {
      if (NOISE_RE.test(line)) return;
      if (PRICE_RE.test(line)) return; // skip price lines like "$19.00/2"

      // First short non-numeric line = title
      if (!title && i < 6 && line.split(/\s+/).length <= 8 && !/\d/.test(line)) {
        title = line;
        return;
      }

      const m = MEASURE_RE.exec(line);
      if (m) {
        const amountEnd = m.index + m[0].length;
        const amount = line.slice(0, amountEnd).trim();
        const name = line.slice(amountEnd).trim();
        measuredIngredients.push({ amount, name: name || amount });
      } else if (line.includes(',') && line.split(',').length >= 2) {
        // Comma-separated ingredient list (menu style) — keep the longest one
        if (line.length > menuIngredientLine.length) menuIngredientLine = line;
      } else if (measuredIngredients.length > 0 || menuIngredientLine) {
        instructions.push(line);
      }
    });

    // Parse menu-style comma list into individual ingredients
    const menuIngredients: { name: string; amount: string }[] = menuIngredientLine
      ? menuIngredientLine
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name, amount: '' }))
      : [];

    const ingredients = measuredIngredients.length
      ? measuredIngredients
      : menuIngredients.length
        ? menuIngredients
        : [{ name: '', amount: '' }];

    return {
      title: title || 'Scanned Recipe',
      description: '',
      ingredients,
      instructions: instructions.length ? instructions : [''],
      garnish: '',
      glassware: 'Rocks Glass',
      time: '5',
      servings: 1,
    };
  };

  const formatWithAI = async () => {
    try {
      setLoading(true);
      setAiFailed(false);
      const result: FormattedRecipe = await AIRecipeFormatter.formatRecipe({
        title: sourceRecipe?.title || 'Scanned Recipe',
        imageUrl: sourceRecipe?.imageUrl,
        extractedText: sourceRecipe.extractedText,
        userNotes: sourceRecipe?.userNotes,
        fromMenu: sourceRecipe?.fromMenu ?? false,
      });
      setRecipe({
        title: result.title || '',
        description: result.description || '',
        ingredients: (result.ingredients || []).map((i) => ({
          name: i.name || '',
          amount: i.amount || '',
        })),
        instructions: result.instructions?.length ? result.instructions : [''],
        garnish: result.garnish || '',
        glassware: result.glassware || 'Rocks Glass',
        time: result.time?.replace(/[^\d]/g, '') || '5',
        servings: result.servings || 1,
      });
    } catch (err: any) {
      log.warn('AIRecipeFormatScreen', 'AI format failed, falling back to OCR parse', {
        message: err?.message,
      });
      // Fall back to parsing raw OCR text — never show an error screen
      setAiFailed(true);
      if (sourceRecipe?.extractedText) {
        setRecipe(parseOCRFallback(sourceRecipe.extractedText));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...recipe.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipe({ ...recipe, ingredients: updated });
  };

  const addIngredient = () => {
    setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { name: '', amount: '' }] });
  };

  const removeIngredient = (index: number) => {
    if (recipe.ingredients.length > 1) {
      setRecipe({ ...recipe, ingredients: recipe.ingredients.filter((_, i) => i !== index) });
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...recipe.instructions];
    updated[index] = value;
    setRecipe({ ...recipe, instructions: updated });
  };

  const addInstruction = () => {
    setRecipe({ ...recipe, instructions: [...recipe.instructions, ''] });
  };

  const removeInstruction = (index: number) => {
    if (recipe.instructions.length > 1) {
      setRecipe({ ...recipe, instructions: recipe.instructions.filter((_, i) => i !== index) });
    }
  };

  const handleSave = async () => {
    if (!recipe.title.trim()) {
      Alert.alert('Required', 'Please add a recipe name');
      return;
    }
    if (!recipe.ingredients[0]?.name.trim()) {
      Alert.alert('Required', 'Please add at least one ingredient');
      return;
    }

    setSaving(true);
    try {
      await addRecipe({
        name: recipe.title.trim(),
        type: 'created',
        description: recipe.description.trim() || '',
        ingredients: recipe.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), unit: '' })),
        instructions: recipe.instructions.filter((s) => s.trim()),
        tags: [],
        difficulty: 'Easy',
        prepTime: parseInt(recipe.time) || 5,
        servings: recipe.servings,
        image: sourceRecipe?.imageUrl || undefined,
        thumbnailImage: sourceRecipe?.imageUrl || undefined,
        notes: [
          recipe.garnish ? `Garnish: ${recipe.garnish}` : '',
          recipe.glassware ? `Glass: ${recipe.glassware}` : '',
        ]
          .filter(Boolean)
          .join(', '),
      });

      Alert.alert('Saved!', 'Recipe added to your collection.', [
        { text: 'Done', onPress: () => nav.navigate('Main') },
      ]);
    } catch (err: any) {
      log.error('AIRecipeFormatScreen', 'Save error', err);
      Alert.alert('Error', 'Could not save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <View style={styles.loadingIconRing}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
          <Text style={styles.loadingTitle}>Formatting recipe...</Text>
          <Text style={styles.loadingSubtitle}>AI is structuring your scan</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI banner */}
        {!startWithManual && (
          <View style={[styles.aiBanner, aiFailed && styles.aiBannerFallback]}>
            <Ionicons
              name={aiFailed ? 'create-outline' : 'sparkles'}
              size={13}
              color={aiFailed ? colors.subtext : colors.gold}
            />
            <Text style={[styles.aiBannerText, aiFailed && styles.aiBannerTextFallback]}>
              {aiFailed
                ? 'Extracted from scan · Review and edit before saving'
                : 'AI-formatted from your scan · Edit anything below'}
            </Text>
          </View>
        )}

        {/* Scanned image thumbnail */}
        {sourceRecipe?.imageUrl ? (
          <View style={styles.imageThumb}>
            <Image
              source={{ uri: sourceRecipe.imageUrl }}
              style={styles.imageThumbImg}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Recipe Name"
          placeholderTextColor={colors.muted}
          value={recipe.title}
          onChangeText={(t) => setRecipe({ ...recipe, title: t })}
          keyboardAppearance="dark"
        />

        {/* Meta row: glass / time */}
        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.metaItem} onPress={() => setShowGlasswareModal(true)}>
            <Text style={styles.metaLabel}>Glass</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {recipe.glassware}
            </Text>
          </TouchableOpacity>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={styles.metaInput}
                value={recipe.time}
                onChangeText={(t) => setRecipe({ ...recipe, time: t })}
                keyboardType="number-pad"
                keyboardAppearance="dark"
                placeholder="5"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.metaUnit}> min</Text>
            </View>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Serves</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={styles.metaInput}
                value={String(recipe.servings)}
                onChangeText={(t) => setRecipe({ ...recipe, servings: parseInt(t) || 1 })}
                keyboardType="number-pad"
                keyboardAppearance="dark"
                placeholder="1"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
        </View>

        {/* Description */}
        <TextInput
          style={styles.descInput}
          placeholder="Describe this recipe..."
          placeholderTextColor={colors.muted}
          value={recipe.description}
          onChangeText={(t) => setRecipe({ ...recipe, description: t })}
          multiline
          numberOfLines={2}
          keyboardAppearance="dark"
        />

        <View style={styles.divider} />

        {/* Ingredients */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <IngredientLeaderList
          items={recipe.ingredients}
          readOnly={false}
          keyPrefix="ai-ingredient"
          iconSize={16}
          iconColor={colors.muted}
          namePlaceholder="Ingredient"
          amountPlaceholder="2 oz"
          placeholderTextColor={colors.muted}
          rowStyle={styles.ingredientRow}
          iconStyle={styles.ingredientLeaderIcon}
          nameStyle={styles.nameInput}
          dotsStyle={styles.ingredientLeaderDots}
          amountStyle={styles.amountInput}
          onChangeName={(i, t) => updateIngredient(i, 'name', t)}
          onChangeAmount={(i, t) => updateIngredient(i, 'amount', t)}
          renderRemoveAction={(_item, i) =>
            recipe.ingredients.length > 1 ? (
              <TouchableOpacity
                onPress={() => removeIngredient(i)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.ingredientRemoveButton}
              >
                <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
              </TouchableOpacity>
            ) : null
          }
        />
        <TouchableOpacity onPress={addIngredient} style={styles.addLink}>
          <Ionicons name="add" size={16} color={colors.gold} />
          <Text style={styles.addLinkText}>Add ingredient</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.instructions.map((step, i) => (
          <View key={i} style={styles.instructionRow}>
            <Text style={styles.stepLabel}>Step {i + 1}</Text>
            <View style={styles.stepContent}>
              <TextInput
                style={styles.stepInput}
                value={step}
                onChangeText={(t) => updateInstruction(i, t)}
                placeholder="Describe this step..."
                placeholderTextColor={colors.muted}
                multiline
                keyboardAppearance="dark"
              />
              {recipe.instructions.length > 1 && (
                <TouchableOpacity onPress={() => removeInstruction(i)} style={styles.stepRemove}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={addInstruction} style={styles.addLink}>
          <Ionicons name="add" size={16} color={colors.gold} />
          <Text style={styles.addLinkText}>Add step</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Garnish */}
        <Text style={styles.sectionTitle}>Garnish</Text>
        <TextInput
          style={styles.garnishInput}
          value={recipe.garnish}
          onChangeText={(t) => setRecipe({ ...recipe, garnish: t })}
          placeholder="e.g., Orange twist, cherry (optional)"
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Ionicons name="checkmark-circle" size={22} color={colors.bg} />
          )}
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Recipe'}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Glassware modal */}
      <Modal
        visible={showGlasswareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGlasswareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Glassware</Text>
              <TouchableOpacity onPress={() => setShowGlasswareModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
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
                  onPress={() => {
                    setRecipe({ ...recipe, glassware: item });
                    setShowGlasswareModal(false);
                  }}
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
                    <Ionicons name="checkmark" size={18} color={colors.gold} />
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
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing(3), paddingTop: spacing(2) },

  // Loading / error
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(1.5),
  },
  loadingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  loadingTitle: { fontFamily: serif, fontSize: 20, fontWeight: '700', color: colors.text },
  loadingSubtitle: { fontSize: 14, color: colors.subtext, textAlign: 'center' },
  // AI banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}12`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.gold}25`,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    marginBottom: spacing(2),
  },
  aiBannerFallback: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.line,
  },
  aiBannerText: { fontSize: 12, color: colors.gold, fontWeight: '500', flex: 1 },
  aiBannerTextFallback: { color: colors.subtext },

  // Thumbnail
  imageThumb: {
    height: 120,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  imageThumbImg: { width: '100%', height: '100%' },

  // Title
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
    paddingHorizontal: 0,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing(1.5),
    marginBottom: spacing(2.5),
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 11, color: colors.subtext, marginBottom: 3 },
  metaValue: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: 90 },
  metaInput: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
    width: 28,
    textAlign: 'center',
  },
  metaUnit: { fontSize: 12, color: colors.subtext },
  metaDivider: { width: 1, height: 30, backgroundColor: colors.line },

  // Description
  descInput: {
    fontSize: 15,
    color: colors.subtext,
    fontStyle: 'italic',
    marginBottom: spacing(2),
    paddingHorizontal: 0,
  },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing(3) },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing(2) },

  // Ingredients
  // No `gap` here: the dot leader is what fills the row, so the pieces rely
  // on their own margins instead.
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  ingredientLeaderIcon: { marginRight: spacing(1) },
  ingredientLeaderDots: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: spacing(1),
    fontSize: 15,
    letterSpacing: 1.5,
    color: colors.line,
  },
  ingredientRemoveButton: { marginLeft: spacing(1) },
  // Unused, kept intentionally: the fixed-width wrapper the amount field sat
  // in before the amount input took its own width.
  amountWrap: { width: 76 },
  amountInput: {
    width: 76,
    textAlign: 'right',
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },
  nameInput: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
  },

  // Instructions
  instructionRow: { marginBottom: spacing(2.5) },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  stepContent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1.5) },
  stepInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
    minHeight: 52,
    textAlignVertical: 'top',
  },
  stepRemove: { paddingTop: spacing(1.5) },

  // Garnish
  garnishInput: {
    fontSize: 15,
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing(1),
    marginBottom: spacing(1),
  },

  // Add links
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing(1) },
  addLinkText: { fontSize: 14, color: colors.gold, fontWeight: '600' },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.25),
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing(2.25),
    marginTop: spacing(4),
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.bg },

  // Glassware modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2.5),
    paddingBottom: spacing(4),
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.75),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalOptionSelected: {},
  modalOptionText: { fontSize: 16, color: colors.text },
  modalOptionTextSelected: { color: colors.gold, fontWeight: '600' },
});
