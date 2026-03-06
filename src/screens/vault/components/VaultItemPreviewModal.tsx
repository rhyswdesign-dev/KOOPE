/**
 * Vault Item Preview Modal
 * Shows detailed preview of vault items before unlocking
 * Includes images, descriptions, benefits, and unlock requirements
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface PreviewBenefit {
  icon: string;
  title: string;
  description: string;
}

interface VaultItemPreviewModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUnlock: () => void;
  item: {
    title: string;
    description: string;
    imageSource: ImageSourcePropType;
    category: string;
    xpCost?: number;
    requiredTier?: 'FREE' | 'PLUS' | 'PRO';
    benefits?: PreviewBenefit[];
    isUnlocked?: boolean;
  } | null;
  userXP: number;
  userKeys?: number;
  userTier: 'FREE' | 'PLUS' | 'PRO';
}

export default function VaultItemPreviewModal({
  visible,
  onDismiss,
  onUnlock,
  item,
  userXP,
  userTier,
}: VaultItemPreviewModalProps) {
  if (!item) return null;

  // Debug log
  console.log('VaultItemPreviewModal rendering with item:', {
    title: item.title,
    description: item.description,
    benefits: item.benefits?.length,
    imageSource: item.imageSource,
  });

  const canAfford = item.xpCost ? userXP >= item.xpCost : true;

  const tierAccess = !item.requiredTier ||
                     (item.requiredTier === 'FREE') ||
                     (item.requiredTier === 'PLUS' && (userTier === 'PLUS' || userTier === 'PRO')) ||
                     (item.requiredTier === 'PRO' && userTier === 'PRO');

  const canUnlock = canAfford && tierAccess && !item.isUnlocked;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.modalContainer}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Hero Image */}
            <View style={styles.heroContainer}>
              <Image
                source={item.imageSource}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', colors.bg]}
                style={styles.heroGradient}
              />

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={36} color={colors.text} />
              </TouchableOpacity>

              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Title */}
              <Text style={styles.title}>{item.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{item.description}</Text>

              {/* Benefits Section */}
              {item.benefits && item.benefits.length > 0 && (
                <View style={styles.benefitsSection}>
                  <Text style={styles.sectionTitle}>What You Get</Text>
                  {item.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <View style={styles.benefitIcon}>
                        <MaterialCommunityIcons
                          name={benefit.icon as any}
                          size={24}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.benefitContent}>
                        <Text style={styles.benefitTitle}>{benefit.title}</Text>
                        <Text style={styles.benefitDescription}>{benefit.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Unlock Requirements */}
              <View style={styles.requirementsSection}>
                <Text style={styles.sectionTitle}>Unlock Requirements</Text>

                {/* XP Cost */}
                {item.xpCost && (
                  <View style={styles.requirementRow}>
                    <View style={styles.requirementLeft}>
                      <Ionicons name="star" size={20} color={colors.gold} />
                      <Text style={styles.requirementLabel}>XP Cost</Text>
                    </View>
                    <View style={styles.requirementRight}>
                      <Text style={[
                        styles.requirementValue,
                        userXP >= item.xpCost && styles.requirementMet
                      ]}>
                        {item.xpCost.toLocaleString()}
                      </Text>
                      {userXP >= item.xpCost ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      ) : (
                        <Text style={styles.requirementBalance}>
                          (You have: {userXP.toLocaleString()})
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Tier Requirement */}
                {item.requiredTier && item.requiredTier !== 'FREE' && (
                  <View style={styles.requirementRow}>
                    <View style={styles.requirementLeft}>
                      <MaterialCommunityIcons name="crown" size={20} color={colors.gold} />
                      <Text style={styles.requirementLabel}>Required Tier</Text>
                    </View>
                    <View style={styles.requirementRight}>
                      <Text style={[
                        styles.requirementValue,
                        tierAccess && styles.requirementMet
                      ]}>
                        {item.requiredTier}+
                      </Text>
                      {tierAccess ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      ) : (
                        <Text style={styles.requirementBalance}>
                          (You have: {userTier})
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Already Unlocked State */}
              {item.isUnlocked && (
                <View style={styles.unlockedBanner}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                  <Text style={styles.unlockedText}>Already Unlocked</Text>
                </View>
              )}

              {/* Insufficient Funds Warning */}
              {!canAfford && !item.isUnlocked && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={24} color="#FF6B6B" />
                  <Text style={styles.warningText}>
                    Insufficient XP
                  </Text>
                </View>
              )}

              {/* Tier Restriction Warning */}
              {!tierAccess && !item.isUnlocked && (
                <View style={styles.warningBanner}>
                  <MaterialCommunityIcons name="crown" size={24} color={colors.gold} />
                  <Text style={styles.warningText}>
                    Requires {item.requiredTier}+ Subscription
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.unlockButton,
                (!canUnlock || item.isUnlocked) && styles.buttonDisabled
              ]}
              onPress={canUnlock ? onUnlock : undefined}
              activeOpacity={0.8}
              disabled={!canUnlock || item.isUnlocked}
            >
              <MaterialCommunityIcons
                name={item.isUnlocked ? "check" : "lock-open-variant"}
                size={20}
                color={canUnlock && !item.isUnlocked ? colors.bg : colors.subtext}
              />
              <Text style={[
                styles.unlockButtonText,
                (!canUnlock || item.isUnlocked) && styles.buttonTextDisabled
              ]}>
                {item.isUnlocked ? 'Unlocked' : 'Unlock Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width * 0.92,
    maxWidth: 480,
    height: height * 0.85,
    borderRadius: radii.xl,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'column',
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  heroContainer: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  closeButton: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 18,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing(2),
    left: spacing(2),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing(3),
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(1.5),
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(2),
  },
  benefitsSection: {
    marginBottom: spacing(3),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing(2),
    borderRadius: radii.lg,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  requirementsSection: {
    marginBottom: spacing(2),
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radii.md,
    marginBottom: spacing(1.5),
  },
  requirementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  requirementLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  requirementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  requirementValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.subtext,
  },
  requirementMet: {
    color: colors.accent,
  },
  requirementBalance: {
    fontSize: 13,
    color: colors.subtext,
    opacity: 0.7,
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.accent + '20',
    padding: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
  },
  unlockedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(2),
  },
  warningText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing(2),
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    borderRadius: radii.lg,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  unlockButton: {
    backgroundColor: colors.accent,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: colors.subtext,
  },
});
