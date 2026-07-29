import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { usePersonalization } from '../store/usePersonalization';
import { useAuth } from '../contexts/AuthContext';
import { log } from '../lib/logger';
import { recipePrefsFlavorToCanonical } from '../utils/flavorTaxonomy';
import {
  hydrateTasteGraph,
  setFlavorOverride,
  setSpiritOverride,
  toPersistedTasteProfile,
  type TasteGraphData,
} from '../services/tasteGraphService';
import { loadUserProfile, updateUserProfileFields } from '../services/userProfileService';

interface RecipePreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

const SPIRITS = [
  { key: 'vodka', label: 'Vodka', icon: '🍸' },
  { key: 'gin', label: 'Gin', icon: '🌿' },
  { key: 'rum', label: 'Rum', icon: '🥃' },
  { key: 'tequila', label: 'Tequila', icon: '🌵' },
  { key: 'whiskey', label: 'Whiskey', icon: '🥃' },
  { key: 'bourbon', label: 'Bourbon', icon: '🥃' },
];

const SKILL_LEVELS = [
  { key: 'beginner', label: 'Beginner', description: 'Just getting started' },
  { key: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { key: 'advanced', label: 'Advanced', description: 'Confident mixer' },
] as const;

const FLAVOR_PROFILES = [
  { key: 'sweet', label: 'Sweet', icon: '🍯' },
  { key: 'sour', label: 'Sour', icon: '🍋' },
  { key: 'bitter', label: 'Bitter', icon: '🌿' },
  { key: 'spicy', label: 'Spicy', icon: '🌶️' },
  { key: 'fruity', label: 'Fruity', icon: '🍓' },
  { key: 'herbaceous', label: 'Herbaceous', icon: '🌱' },
];

// This screen used to write flat scores (spiritScores[spirit] = 100) straight
// into usePersonalization every time it was opened — the same destructive
// pattern the PRO sliders had before this session's mirror/steering split:
// nothing stopped a repeat edit from permanently erasing behavior. It now
// reuses that same steering mechanism (setSpiritOverride/setFlavorOverride)
// instead of inventing a second one. skillLevel isn't taste — it stays a
// plain declarative setting in usePersonalization.
export default function RecipePreferencesModal({ visible, onClose }: RecipePreferencesModalProps) {
  const { user } = useAuth();
  const { profile, updateProfile } = usePersonalization();
  const [graphData, setGraphData] = useState<TasteGraphData | null>(null);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let cancelled = false;
    loadUserProfile(user.id)
      .then((p) => {
        if (!cancelled) setGraphData(hydrateTasteGraph(p?.tasteProfile));
      })
      .catch((error) => {
        log.warn('RecipePreferencesModal', 'Failed to load taste profile', { error });
      });
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id]);

  const skillLevel = profile?.skillLevel || 'beginner';
  const spiritOverrides = graphData?.overrides?.spirits ?? {};
  const flavorOverrides = graphData?.overrides?.flavors ?? {};

  const persistGraph = async (next: TasteGraphData) => {
    setGraphData(next);
    if (!user?.id) return;
    try {
      await updateUserProfileFields(user.id, {
        tasteProfile: toPersistedTasteProfile(next) as any,
      });
    } catch (error) {
      log.error('RecipePreferencesModal', 'Failed to save taste preference', error);
    }
  };

  const handleSpiritSelect = async (spiritKey: string) => {
    if (!graphData) return;
    // 'bourbon' is a UI convenience, not a canonical Spirit — bourbon is a
    // whiskey, so it steers the same axis.
    const spirit = spiritKey === 'bourbon' ? 'whiskey' : spiritKey;
    await persistGraph(setSpiritOverride(graphData, spirit as any, 1));
  };

  const handleSkillLevelSelect = async (level: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      const difficultyMap: Record<string, string[]> = {
        beginner: ['Easy'],
        intermediate: ['Easy', 'Medium'],
        advanced: ['Medium', 'Hard'],
      };

      await updateProfile({
        skillLevel: level,
        preferredDifficulty: difficultyMap[level] || ['Easy'],
      });
    } catch (error) {
      log.error('RecipePreferencesModal', 'Error updating skill level', error);
    }
  };

  const handleFlavorToggle = async (flavorKey: string) => {
    if (!graphData) return;
    const axis = recipePrefsFlavorToCanonical(flavorKey);
    if (!axis) return;

    const isSelected = flavorOverrides[axis] === 1;
    await persistGraph(setFlavorOverride(graphData, axis, isSelected ? null : 1));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Recipe Preferences</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Favorite Spirit Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Spirit</Text>
            <Text style={styles.sectionSubtitle}>
              Choose your preferred spirit for personalized recommendations
            </Text>

            <View style={styles.optionsGrid}>
              {SPIRITS.map((spirit) => {
                const axisKey = spirit.key === 'bourbon' ? 'whiskey' : spirit.key;
                const isSelected = spiritOverrides[axisKey as keyof typeof spiritOverrides] === 1;
                return (
                  <TouchableOpacity
                    key={spirit.key}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => handleSpiritSelect(spirit.key)}
                  >
                    <Text style={styles.optionIcon}>{spirit.icon}</Text>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {spirit.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Skill Level Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill Level</Text>
            <Text style={styles.sectionSubtitle}>We'll match recipes to your experience</Text>

            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.key}
                style={[styles.settingItem, skillLevel === level.key && styles.settingItemActive]}
                onPress={() => handleSkillLevelSelect(level.key)}
              >
                <View style={styles.settingItemLeft}>
                  <View>
                    <Text
                      style={[
                        styles.settingItemText,
                        skillLevel === level.key && styles.settingItemTextActive,
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text style={styles.settingItemSubtext}>{level.description}</Text>
                  </View>
                </View>
                {skillLevel === level.key && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Flavor Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flavor Preferences</Text>
            <Text style={styles.sectionSubtitle}>
              Select your favorite flavor profiles (multiple allowed)
            </Text>

            <View style={styles.optionsGrid}>
              {FLAVOR_PROFILES.map((flavor) => {
                const axis = recipePrefsFlavorToCanonical(flavor.key);
                const isSelected = axis ? flavorOverrides[axis] === 1 : false;
                return (
                  <TouchableOpacity
                    key={flavor.key}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => handleFlavorToggle(flavor.key)}
                  >
                    <Text style={styles.optionIcon}>{flavor.icon}</Text>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {flavor.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  section: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(3),
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  optionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    position: 'relative',
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: spacing(1),
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  optionLabelActive: {
    color: colors.accent,
  },
  checkmark: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginBottom: spacing(1.5),
    borderWidth: 2,
    borderColor: colors.line,
  },
  settingItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing(2),
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingItemTextActive: {
    color: colors.accent,
  },
  settingItemSubtext: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
});
