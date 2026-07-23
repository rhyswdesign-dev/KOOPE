/**
 * "I made it" logging modal for CocktailDetailScreen — extracted
 * verbatim (Phase 5, god-file breakup). Purely presentational: all state
 * and the submit handler live in useMadeItFlow, this just renders it.
 */
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { styles } from '../screens/CocktailDetailScreen.styles';
import type { CompletionPromptConfig } from '../lib/completions/brandCapture';
import type { MadeItFlowIngredient } from '../hooks/useMadeItFlow';

interface MakeItModalProps {
  visible: boolean;
  onClose: () => void;
  completionConfig: CompletionPromptConfig;
  ingredients: MadeItFlowIngredient[];
  getSuggestionsForIngredient: (ingredientName: string) => string[];
  brandSelections: Record<string, string>;
  onBrandSelectionChange: (key: string, value: string) => void;
  substitutions: string;
  onSubstitutionsChange: (value: string) => void;
  techniqueVariations: string;
  onTechniqueVariationsChange: (value: string) => void;
  personalModifications: string;
  onPersonalModificationsChange: (value: string) => void;
  isSaving: boolean;
  onSubmit: () => void;
}

export default function MakeItModal({
  visible,
  onClose,
  completionConfig,
  ingredients,
  getSuggestionsForIngredient,
  brandSelections,
  onBrandSelectionChange,
  substitutions,
  onSubstitutionsChange,
  techniqueVariations,
  onTechniqueVariationsChange,
  personalModifications,
  onPersonalModificationsChange,
  isSaving,
  onSubmit,
}: MakeItModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{completionConfig.promptText}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                +{completionConfig.xpReward} XP
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ingredients.map((ingredient) => {
              const suggestions = getSuggestionsForIngredient(ingredient.name);
              return (
                <View key={ingredient.key} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {ingredient.name}
                    {ingredient.amount ? ` (${ingredient.amount})` : ''}
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Type brand used or choose below"
                    placeholderTextColor={colors.subtext}
                    value={brandSelections[ingredient.key] || ''}
                    onChangeText={(value) => onBrandSelectionChange(ingredient.key, value)}
                  />

                  {suggestions.length > 0 && (
                    <View style={styles.suggestionRow}>
                      {suggestions.map((suggestion) => (
                        <TouchableOpacity
                          key={`${ingredient.key}_${suggestion}`}
                          style={styles.suggestionChip}
                          onPress={() => onBrandSelectionChange(ingredient.key, suggestion)}
                        >
                          <Text style={styles.suggestionChipText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Quick note{completionConfig.showDetailedNotes ? '' : ' (50 chars)'}
              </Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput]}
                placeholder={completionConfig.notesPlaceholder}
                placeholderTextColor={colors.subtext}
                value={substitutions}
                onChangeText={(v) =>
                  onSubstitutionsChange(v.slice(0, completionConfig.notesCharLimit))
                }
                multiline
                maxLength={completionConfig.notesCharLimit}
              />
            </View>

            {completionConfig.showDetailedNotes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Technique variations</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput]}
                  placeholder="Shaken vs stirred, dilution, garnish technique..."
                  placeholderTextColor={colors.subtext}
                  value={techniqueVariations}
                  onChangeText={onTechniqueVariationsChange}
                  multiline
                />
              </View>
            )}

            {completionConfig.showDetailedNotes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal modifications</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput]}
                  placeholder="Any tweaks to sweetness, bitter balance, ratios..."
                  placeholderTextColor={colors.subtext}
                  value={personalModifications}
                  onChangeText={onPersonalModificationsChange}
                  multiline
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, isSaving && styles.modalPrimaryButtonDisabled]}
              onPress={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryButtonText}>I made it!</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
