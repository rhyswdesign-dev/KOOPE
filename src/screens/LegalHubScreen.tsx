/**
 * LEGAL HUB SCREEN
 * Central hub for all legal and privacy-related content
 * Entry point from Settings → Legal & Policies
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii } from '../theme/tokens';
import { useConsent } from '../hooks/useConsent';
import { privacyConfig } from '../../config/privacy';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Legal hub with cards/rows linking to policy documents and consent center
 */
export default function LegalHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { needsPrompt, hasSeenCurrentPrivacy, hasAcceptedCurrentTerms } = useConsent();

  type LegalItem = {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge: string | null;
    onPress: () => void;
  };

  const legalItems: LegalItem[] = [
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'How we collect, use, and protect your data',
      icon: 'shield-checkmark-outline' as const,
      badge: !hasSeenCurrentPrivacy ? 'Updated' : null,
      onPress: () => navigation.navigate('PrivacyPolicy' as never),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      subtitle: 'Rules and agreements for using our app',
      icon: 'document-text-outline' as const,
      badge: !hasAcceptedCurrentTerms ? 'Action Required' : null,
      onPress: () => navigation.navigate('TermsOfService' as never),
    },
    {
      id: 'consent',
      title: 'Tracking & Preferences',
      subtitle: 'Control your privacy and data sharing preferences',
      icon: 'settings-outline' as const,
      badge: needsPrompt ? 'Review Needed' : null,
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  // Add CPRA-specific item if California compliance is enabled
  if (privacyConfig.enforceCPRA) {
    legalItems.push({
      id: 'cpra',
      title: 'Do Not Sell My Info',
      subtitle: 'California privacy rights and data sale opt-out',
      icon: 'ban-outline' as const,
      badge: null,
      onPress: () => {
        // Navigate to CPRA-specific form or section
        navigation.navigate('PrivacyPolicy');
      },
    });
  }

  const renderLegalItem = (item: LegalItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.legalItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemIcon}>
        <Ionicons name={item.icon} size={24} color={colors.accent} />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.badge && (
            <View style={[
              styles.badge,
              item.badge === 'Action Required' && styles.badgeError,
              item.badge === 'Updated' && styles.badgeWarning,
            ]}>
              <Text style={[
                styles.badgeText,
                item.badge === 'Action Required' && styles.badgeTextError,
                item.badge === 'Updated' && styles.badgeTextWarning,
              ]}>
                {item.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Legal & Policies</Text>
          <Text style={styles.subtitle}>
            Your privacy rights and app policies in one place
          </Text>
        </View>

        {/* Legal Items */}
        <View style={styles.section}>
          {legalItems.map(renderLegalItem)}
        </View>

        {/* Regional Notice */}
        {(privacyConfig.enforceQuebecLaw25 || privacyConfig.enforceGDPR) && (
          <View style={styles.regionalNotice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.regionalNoticeText}>
              {privacyConfig.enforceQuebecLaw25 && (
                'This app complies with Quebec Law 25 privacy requirements. '
              )}
              {privacyConfig.enforceGDPR && (
                'GDPR compliance enabled for EU residents. '
              )}
              You have enhanced privacy rights and controls.
            </Text>
          </View>
        )}

        {/* Contact Information */}
        {privacyConfig.contact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>

            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>Privacy Questions</Text>
              <Text style={styles.contactEmail}>
                {privacyConfig.contact.dataProtectionEmail}
              </Text>

              {privacyConfig.contact.privacyOfficer && privacyConfig.enforceQuebecLaw25 && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>
                    Personne responsable de la protection des renseignements personnels:
                  </Text>
                  <Text style={styles.contactName}>
                    {privacyConfig.contact.privacyOfficer.name}
                  </Text>
                  <Text style={styles.contactEmail}>
                    {privacyConfig.contact.privacyOfficer.email}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: September 2025
          </Text>
          <Text style={styles.footerText}>
            Policies may be updated periodically. We'll notify you of significant changes.
          </Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(4),
  },

  // Header
  header: {
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 22,
  },

  // Sections
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },

  // Legal Items
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(1.5),
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 18,
  },

  // Badges
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.25),
    borderRadius: radii.sm,
    marginLeft: spacing(1),
  },
  badgeError: {
    backgroundColor: '#ef4444',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  badgeTextError: {
    color: colors.white,
  },
  badgeTextWarning: {
    color: colors.white,
  },

  // Regional Notice
  regionalNotice: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(1.5),
    marginBottom: spacing(3),
    borderWidth: 1,
    borderColor: colors.accent,
  },
  regionalNoticeText: {
    flex: 1,
    marginLeft: spacing(1),
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  // Contact
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  contactItem: {
    marginTop: spacing(1.5),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  contactEmail: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'monospace',
  },

  // Footer
  footer: {
    marginTop: spacing(2),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerText: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(0.5),
    lineHeight: 16,
  },
});
