/**
 * AI Cocktail Prompt Modal
 * Let users ask for cocktail suggestions and earn rewards
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { log } from '../lib/logger';

interface AICocktailPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  remainingPrompts: number;
  isPremium: boolean;
}

const QUICK_PROMPTS = [
  { emoji: '🌊', text: 'Something refreshing and citrusy' },
  { emoji: '🌶️', text: 'Spicy with mezcal' },
  { emoji: '🍯', text: 'Sweet and fruity' },
  { emoji: '🌙', text: 'Smooth nightcap' },
  { emoji: '🎉', text: 'Party crowd-pleaser' },
  { emoji: '☕', text: 'Coffee or espresso based' },
];

export default function AICocktailPromptModal({
  visible,
  onClose,
  onSubmit,
  remainingPrompts,
  isPremium,
}: AICocktailPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPrompt('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      await onSubmit(prompt.trim());
      setPrompt('');
    } catch (error) {
      log.error('AICocktailPromptModal', 'Error submitting prompt', error);
    } finally{
      setLoading(false);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const canSubmit = prompt.trim().length > 0 && !loading && (isPremium || remainingPrompts > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerEmoji}>✨</Text>
              <View>
                <Text style={styles.headerTitle}>AI Cocktail Creator</Text>
                <Text style={styles.headerSubtitle}>
                  {isPremium ? 'Unlimited prompts' : `${remainingPrompts} prompt${remainingPrompts !== 1 ? 's' : ''} left today`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Rewards Banner */}
          <View style={styles.rewardsBanner}>
            <Ionicons name="gift" size={20} color={colors.gold} />
            <Text style={styles.rewardText}>
              Earn +50 XP per prompt! Save the cocktail for +1 Life
            </Text>
          </View>

          {/* Main Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Input Section */}
            <Text style={styles.sectionTitle}>What are you in the mood for?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Something tropical with rum..."
              placeholderTextColor={colors.subtext}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={3}
              autoFocus
              keyboardAppearance="dark"
            />

            {/* Quick Prompts */}
            <Text style={styles.sectionTitle}>Quick Ideas</Text>
            <View style={styles.quickPromptsGrid}>
              {QUICK_PROMPTS.map((qp, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickPromptButton}
                  onPress={() => handleQuickPrompt(qp.text)}
                >
                  <Text style={styles.quickPromptEmoji}>{qp.emoji}</Text>
                  <Text style={styles.quickPromptText}>{qp.text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Usage Limit Warning */}
            {!isPremium && remainingPrompts === 0 && (
              <View style={styles.limitWarning}>
                <Ionicons name="lock-closed" size={24} color={colors.gold} />
                <View style={styles.limitWarningText}>
                  <Text style={styles.limitWarningTitle}>Out of prompts for today</Text>
                  <Text style={styles.limitWarningSubtitle}>
                    Get unlimited AI prompts with Premium
                  </Text>
                </View>
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Premium Upsell */}
            {!isPremium && remainingPrompts > 0 && (
              <View style={styles.upsellBanner}>
                <Text style={styles.upsellText}>
                  💎 Want unlimited prompts? Upgrade to Premium for $9.99/month
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color={colors.goldText} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {isPremium || remainingPrompts > 0 ? 'Generate Cocktails' : 'Upgrade for More'}
                  </Text>
                  <Ionicons name="sparkles" size={20} color={colors.goldText} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    paddingBottom: spacing(3),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: spacing(0.25),
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.gold + '20',
    padding: spacing(1.5),
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  rewardText: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '600',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing(3),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
    marginTop: spacing(2),
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  quickPromptButton: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    minWidth: '47%',
  },
  quickPromptEmoji: {
    fontSize: 20,
  },
  quickPromptText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.card,
    padding: spacing(2),
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    marginTop: spacing(3),
  },
  limitWarningText: {
    flex: 1,
  },
  limitWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  limitWarningSubtitle: {
    fontSize: 12,
    color: colors.subtext,
  },
  upgradeButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.md,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldText,
  },
  upsellBanner: {
    backgroundColor: colors.gold + '15',
    padding: spacing(2),
    borderRadius: radii.md,
    marginTop: spacing(3),
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  upsellText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
  },
  footer: {
    padding: spacing(3),
    paddingTop: spacing(2),
  },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
  },
});
