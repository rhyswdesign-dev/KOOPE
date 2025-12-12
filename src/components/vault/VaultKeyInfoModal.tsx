/**
 * VAULT KEY INFO MODAL
 *
 * Explains what Vault Keys unlock and how to use them.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../../theme/tokens';

interface VaultKeyInfoModalProps {
  visible: boolean;
  onClose: () => void;
  currentKeys: number;
}

export function VaultKeyInfoModal({
  visible,
  onClose,
  currentKeys,
}: VaultKeyInfoModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.keyIconContainer}>
              <Ionicons name="key" size={32} color={colors.accent} />
            </View>
            <Text style={styles.title}>Vault Keys</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Keys */}
            <View style={styles.keyCountSection}>
              <Text style={styles.keyCountLabel}>You have</Text>
              <Text style={styles.keyCount}>{currentKeys}</Text>
              <Text style={styles.keyCountLabel}>
                {currentKeys === 1 ? 'Key' : 'Keys'}
              </Text>
            </View>

            {/* What Keys Unlock */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What Vault Keys Unlock</Text>
              <Text style={styles.sectionText}>
                Vault Keys give you instant access to premium content without
                spending XP. Use them strategically for:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Ionicons name="timer" size={20} color={colors.accent} />
                  <Text style={styles.bulletText}>
                    <Text style={styles.bulletBold}>Early seasonal drops</Text>
                    {'\n'}Get limited-time content before it's available to
                    others
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Ionicons name="star" size={20} color={colors.accent} />
                  <Text style={styles.bulletText}>
                    <Text style={styles.bulletBold}>Curated Pro bundles</Text>
                    {'\n'}Access exclusive collections of advanced techniques
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Ionicons name="location" size={20} color={colors.accent} />
                  <Text style={styles.bulletText}>
                    <Text style={styles.bulletBold}>
                      Bar features ahead of release
                    </Text>
                    {'\n'}Discover legendary bars before they're widely
                    available
                  </Text>
                </View>

                <View style={styles.bulletItem}>
                  <Ionicons name="book" size={20} color={colors.accent} />
                  <Text style={styles.bulletText}>
                    <Text style={styles.bulletBold}>
                      Premium playbooks instantly
                    </Text>
                    {'\n'}Skip the XP grind for high-value educational content
                  </Text>
                </View>
              </View>
            </View>

            {/* Strategy Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strategy Tips</Text>
              <View style={styles.tipContainer}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
                <Text style={styles.tipText}>
                  Save keys for limited-time items that may not return
                </Text>
              </View>
              <View style={styles.tipContainer}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
                <Text style={styles.tipText}>
                  Use keys when you're low on XP but need specific content now
                </Text>
              </View>
              <View style={styles.tipContainer}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
                <Text style={styles.tipText}>
                  PRO tier members can use keys on exclusive early releases
                </Text>
              </View>
            </View>

            {/* How to Get More Keys */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Get More Keys</Text>
              <Text style={styles.sectionText}>
                Vault Keys can be purchased individually or in bundles. Check
                the Vault Keys section for current offers.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.modalBg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  keyIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
  },
  content: {
    padding: spacing(2),
  },
  keyCountSection: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(3),
  },
  keyCountLabel: {
    fontSize: fonts.body,
    color: colors.subtext,
  },
  keyCount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.accent,
    marginVertical: spacing(0.5),
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  sectionText: {
    fontSize: fonts.body,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: spacing(1.5),
  },
  bulletList: {
    gap: spacing(2),
  },
  bulletItem: {
    flexDirection: 'row',
    gap: spacing(1.5),
    alignItems: 'flex-start',
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.body,
    color: colors.subtext,
    lineHeight: 22,
  },
  bulletBold: {
    fontWeight: '700',
    color: colors.text,
  },
  tipContainer: {
    flexDirection: 'row',
    gap: spacing(1),
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },
  tipText: {
    flex: 1,
    fontSize: fonts.small,
    color: colors.subtext,
    lineHeight: 20,
  },
  footer: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
});
