/**
 * Data Consent Dialog
 * Explains data collection and gets user consent for scan data tracking
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';

interface DataConsentDialogProps {
  visible: boolean;
  onAccept: () => void;
  onDecline?: () => void;
  isPaidUser?: boolean;
}

export default function DataConsentDialog({
  visible,
  onAccept,
  onDecline,
  isPaidUser = false,
}: DataConsentDialogProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={40} color={colors.accent} />
              </View>
              <Text style={styles.title}>Help Us Suggest Better Products</Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.description}>
                We'd like to use your scan data to:
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                  <Text style={styles.benefitText}>
                    Recommend cocktails you'll love based on what you scan
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                  <Text style={styles.benefitText}>
                    Show you where to find the best deals on spirits nearby
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                  <Text style={styles.benefitText}>
                    Improve our ingredient database and recipe suggestions
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                  <Text style={styles.benefitText}>
                    Partner with brands to offer exclusive discounts
                  </Text>
                </View>
              </View>

              <View style={styles.privacyNote}>
                <Ionicons name="lock-closed" size={16} color={colors.subtext} />
                <Text style={styles.privacyText}>
                  Your data is anonymized and never sold to third parties.
                  {isPaidUser && ' As a premium member, you can opt out anytime in Settings.'}
                </Text>
              </View>

              {!isPaidUser && (
                <View style={styles.requirementNote}>
                  <Ionicons name="information-circle" size={16} color={colors.accent} />
                  <Text style={styles.requirementText}>
                    Data sharing is required for free tier users. Upgrade to Premium for
                    unlimited scans and optional data sharing.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                <Text style={styles.acceptButtonText}>
                  {isPaidUser ? 'Allow' : 'Accept & Continue'}
                </Text>
              </TouchableOpacity>

              {isPaidUser && onDecline && (
                <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
                  <Text style={styles.declineButtonText}>No Thanks</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    alignItems: 'center',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    padding: spacing(3),
    maxHeight: 400,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing(2),
    lineHeight: 22,
  },
  benefitsList: {
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  benefitItem: {
    flexDirection: 'row',
    gap: spacing(1.5),
    alignItems: 'flex-start',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    gap: spacing(1),
    backgroundColor: `${colors.subtext}10`,
    padding: spacing(2),
    borderRadius: radii.md,
    marginBottom: spacing(2),
    alignItems: 'flex-start',
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
  },
  requirementNote: {
    flexDirection: 'row',
    gap: spacing(1),
    backgroundColor: `${colors.accent}10`,
    padding: spacing(2),
    borderRadius: radii.md,
    alignItems: 'flex-start',
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    color: colors.accent,
    lineHeight: 16,
    fontWeight: '500',
  },
  actions: {
    padding: spacing(3),
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subtext,
  },
});
