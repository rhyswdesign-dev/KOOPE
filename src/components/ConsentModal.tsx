// @ts-nocheck
/**
 * CONSENT MODAL COMPONENT
 * First-run or re-consent modal for privacy compliance
 * Shows blocking modal until user makes consent choices
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PreferenceToggle from './PreferenceToggle';
import { colors, spacing, radii } from '../theme/tokens';
import { CONSENT_CATEGORIES, isStrictPrivacyRegion } from '../../config/privacy';
import type { ConsentChoices, ConsentCategory } from '../types/consent';
import { log } from '../lib/logger';

interface ConsentModalProps {
  visible: boolean;
  onAcceptAll: () => Promise<void>;
  onRejectAll: () => Promise<void>;
  onSaveChoices: (choices: ConsentChoices) => Promise<void>;
  onClose?: () => void;
  reasons?: string[];
}

/**
 * Modal for collecting initial consent or re-consent on policy updates
 */
export default function ConsentModal({
  visible,
  onAcceptAll,
  onRejectAll,
  onSaveChoices,
  onClose,
  reasons = [],
}: ConsentModalProps) {
  const [choices, setChoices] = useState<ConsentChoices>({
    essential: true,
    analytics: !isStrictPrivacyRegion(), // Default OFF for strict regions
    crash: true, // Generally acceptable
    marketing: false, // Always require explicit opt-in
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Handle individual consent toggle
   */
  const handleToggleConsent = (category: ConsentCategory, enabled: boolean) => {
    if (category === 'essential') {
      return; // Cannot modify essential
    }

    setChoices(prev => ({
      ...prev,
      [category]: enabled,
    }));
  };

  /**
   * Handle "Accept All" button
   */
  const handleAcceptAll = async () => {
    try {
      setIsSaving(true);
      await onAcceptAll();
    } catch (err) {
      log.error('ConsentModal', 'Failed to accept all', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle "Reject All" button
   */
  const handleRejectAll = async () => {
    try {
      setIsSaving(true);
      await onRejectAll();
    } catch (err) {
      log.error('ConsentModal', 'Failed to reject all', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle "Save Choices" button
   */
  const handleSaveChoices = async () => {
    try {
      setIsSaving(true);
      await onSaveChoices(choices);
    } catch (err) {
      log.error('ConsentModal', 'Failed to save choices', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Get modal title based on reasons
   */
  const getModalTitle = () => {
    if (reasons.includes('first_run')) {
      return 'Welcome to Home Game Advantage';
    }
    if (reasons.includes('terms_updated')) {
      return 'Updated Terms & Conditions';
    }
    if (reasons.includes('privacy_updated')) {
      return 'Updated Privacy Policy';
    }
    return 'Privacy Preferences';
  };

  /**
   * Get modal description based on reasons
   */
  const getModalDescription = () => {
    if (reasons.includes('first_run')) {
      return 'We respect your privacy. Please review and choose your privacy preferences to continue using our bartending education app.';
    }
    if (reasons.includes('terms_updated')) {
      return "We've updated our Terms & Conditions. Please review and accept the new terms to continue.";
    }
    if (reasons.includes('privacy_updated')) {
      return "We've updated our Privacy Policy. Please review your privacy preferences.";
    }
    return 'Please review and update your privacy preferences.';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{getModalTitle()}</Text>
            <Text style={styles.description}>{getModalDescription()}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {!showDetails ? (
            // Simple view with quick actions
            <View style={styles.simpleView}>
              <View style={styles.summaryCard}>
                <Ionicons name="shield-checkmark" size={48} color={colors.accent} />
                <Text style={styles.summaryTitle}>Your Privacy Matters</Text>
                <Text style={styles.summaryText}>
                  We use cookies and similar technologies to enhance your learning experience,
                  analyze app performance, and provide personalized content.
                </Text>

                <View style={styles.highlights}>
                  <View style={styles.highlight}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success || '#10b981'} />
                    <Text style={styles.highlightText}>Essential features always enabled</Text>
                  </View>
                  <View style={styles.highlight}>
                    <Ionicons name="settings" size={20} color={colors.accent} />
                    <Text style={styles.highlightText}>You control your preferences</Text>
                  </View>
                  <View style={styles.highlight}>
                    <Ionicons name="time" size={20} color={colors.accent} />
                    <Text style={styles.highlightText}>Change settings anytime</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => setShowDetails(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsButtonText}>Customize Settings</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            // Detailed view with individual toggles
            <View style={styles.detailedView}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowDetails(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
                <Text style={styles.backButtonText}>Back to Summary</Text>
              </TouchableOpacity>

              <Text style={styles.detailsTitle}>Privacy Preferences</Text>
              <Text style={styles.detailsSubtitle}>
                Choose what data we can collect to improve your experience.
              </Text>

              {(Object.keys(CONSENT_CATEGORIES) as ConsentCategory[]).map((category) => {
                const categoryInfo = CONSENT_CATEGORIES[category];
                return (
                  <PreferenceToggle
                    key={category}
                    title={categoryInfo.title}
                    description={categoryInfo.description}
                    examples={categoryInfo.examples}
                    value={choices[category]}
                    required={categoryInfo.required}
                    onValueChange={(enabled) => handleToggleConsent(category, enabled)}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {!showDetails ? (
            // Simple actions
            <View style={styles.simpleActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRejectAll}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.rejectButtonText}>Reject All</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAcceptAll}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.acceptButtonText}>Accept All</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Detailed actions
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveChoices}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>Save My Choices</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.footerNote}>
            You can change these preferences anytime in Settings → Legal & Policies.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.card,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  description: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing(2),
  },

  // Simple View
  simpleView: {
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    alignItems: 'center',
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(2),
  },
  highlights: {
    width: '100%',
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
  },
  highlightText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing(1),
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginRight: spacing(0.5),
  },

  // Detailed View
  detailedView: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing(1),
    marginBottom: spacing(2),
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginLeft: spacing(0.5),
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  detailsSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: spacing(2),
  },

  // Footer
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  simpleActions: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  rejectButton: {
    backgroundColor: colors.subtext,
  },
  acceptButton: {
    backgroundColor: colors.accent,
  },
  saveButton: {
    backgroundColor: colors.accent,
    marginBottom: spacing(2),
  },
  rejectButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Colors (fallbacks if not in theme)
  success: '#10b981',
});