/**
 * CONSENT CENTER SCREEN
 * Central hub for managing privacy preferences and tracking consent
 * Supports Quebec Law 25, GDPR, and CPRA compliance requirements
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PreferenceToggle from '../components/PreferenceToggle';
import { useConsent } from '../hooks/useConsent';
import { colors, spacing, radii } from '../theme/tokens';
import { CONSENT_CATEGORIES, privacyConfig } from '../../config/privacy';
import type { ConsentCategory } from '../types/consent';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * Consent center with toggles for tracking preferences and data rights
 */
export default function ConsentCenterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    choices,
    loading,
    error,
    updateConsent,
    acceptAllConsent,
    rejectAllConsent,
    hasConsent,
  } = useConsent();

  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle individual consent toggle
   */
  const handleToggleConsent = async (category: ConsentCategory, enabled: boolean) => {
    if (category === 'essential') {
      Alert.alert(
        'Required Feature',
        'Essential features are required for the app to function and cannot be disabled.'
      );
      return;
    }

    try {
      await updateConsent(category, enabled);
    } catch (err) {
      Alert.alert('Error', 'Failed to update your preference. Please try again.');
    }
  };

  /**
   * Handle "Accept All" button
   */
  const handleAcceptAll = async () => {
    try {
      setIsSaving(true);
      await acceptAllConsent();

      Alert.alert(
        'Preferences Saved',
        'All tracking preferences have been enabled.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
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
      await rejectAllConsent();

      Alert.alert(
        'Preferences Saved',
        'Non-essential tracking has been disabled. Essential features remain enabled.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle "Learn More" link for privacy policy sections
   */
  const handleLearnMore = (category: ConsentCategory) => {
    // Navigate to privacy policy (anchor routing can be added when route type supports it)
    navigation.navigate('PrivacyPolicy');
  };

  /**
   * Handle data export request
   */
  const handleExportData = () => {
    Alert.alert(
      'Export Your Data',
      'We will prepare a copy of your data and send it to your registered email address within 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: () => {
            // In a real app, this would trigger a backend API call
            Alert.alert('Request Submitted', 'Your data export request has been submitted.');
          },
        },
      ]
    );
  };

  /**
   * Handle data deletion request
   */
  const handleDeleteData = () => {
    Alert.alert(
      'Delete Your Data',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Data',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Are you absolutely sure? This will delete your account permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    // In a real app, this would trigger account deletion
                    Alert.alert('Request Submitted', 'Your data deletion request has been submitted.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      title: 'Tracking & Preferences',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '900' },
    });
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Privacy Choices</Text>
          <Text style={styles.subtitle}>
            Control how we collect and use your information. You can change these settings at any time.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.acceptAllButton]}
              onPress={handleAcceptAll}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={20} color={colors.white} />
              <Text style={styles.acceptAllText}>Accept All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionButton, styles.rejectAllButton]}
              onPress={handleRejectAll}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={20} color={colors.white} />
              <Text style={styles.rejectAllText}>Reject All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Consent Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Categories</Text>

          {(Object.keys(CONSENT_CATEGORIES) as ConsentCategory[]).map((category) => {
            const categoryInfo = CONSENT_CATEGORIES[category];
            return (
              <PreferenceToggle
                key={category}
                title={categoryInfo.title}
                description={categoryInfo.description}
                examples={[...categoryInfo.examples]}
                value={hasConsent(category)}
                disabled={loading}
                required={categoryInfo.required}
                onValueChange={(enabled) => handleToggleConsent(category, enabled)}
                onLearnMore={() => handleLearnMore(category)}
              />
            );
          })}
        </View>

        {/* Regional Compliance */}
        {(privacyConfig.enforceGDPR || privacyConfig.enforceQuebecLaw25 || privacyConfig.enforceCPRA) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rights</Text>

            <View style={styles.rightsCard}>
              <Text style={styles.rightsTitle}>Data Protection Rights</Text>
              <Text style={styles.rightsDescription}>
                You have rights regarding your personal information:
              </Text>

              <View style={styles.rightsList}>
                <View style={styles.rightItem}>
                  <Ionicons name="eye-outline" size={16} color={colors.accent} />
                  <Text style={styles.rightText}>Access your data</Text>
                </View>
                <View style={styles.rightItem}>
                  <Ionicons name="create-outline" size={16} color={colors.accent} />
                  <Text style={styles.rightText}>Correct inaccuracies</Text>
                </View>
                <View style={styles.rightItem}>
                  <Ionicons name="download-outline" size={16} color={colors.accent} />
                  <Text style={styles.rightText}>Export your data</Text>
                </View>
                <View style={styles.rightItem}>
                  <Ionicons name="trash-outline" size={16} color={colors.accent} />
                  <Text style={styles.rightText}>Delete your data</Text>
                </View>
              </View>

              <View style={styles.dataActions}>
                <TouchableOpacity
                  style={styles.dataActionButton}
                  onPress={handleExportData}
                  activeOpacity={0.7}
                >
                  <Ionicons name="download-outline" size={18} color={colors.accent} />
                  <Text style={styles.dataActionText}>Export My Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dataActionButton, styles.deleteActionButton]}
                  onPress={handleDeleteData}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.dataActionText, styles.deleteActionText]}>
                    Delete My Data
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* CPRA Specific */}
        {privacyConfig.enforceCPRA && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>California Privacy Rights</Text>

            <View style={styles.cpraCard}>
              <Text style={styles.cpraTitle}>Do Not Sell or Share My Personal Information</Text>
              <Text style={styles.cpraDescription}>
                Under the California Consumer Privacy Act (CPRA), you have the right to opt out of the sale or sharing of your personal information.
              </Text>

              <TouchableOpacity
                style={styles.cpraButton}
                onPress={() => Alert.alert('CPRA Request', 'Your opt-out request has been recorded.')}
                activeOpacity={0.7}
              >
                <Text style={styles.cpraButtonText}>Submit Opt-Out Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Contact Information */}
        {privacyConfig.contact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Questions?</Text>

            <View style={styles.contactCard}>
              <Text style={styles.contactText}>
                If you have questions about your privacy rights or want to exercise them, contact us:
              </Text>

              <Text style={styles.contactEmail}>
                {privacyConfig.contact.dataProtectionEmail}
              </Text>

              {privacyConfig.contact.privacyOfficer && privacyConfig.enforceQuebecLaw25 && (
                <View style={styles.privacyOfficer}>
                  <Text style={styles.privacyOfficerTitle}>
                    Personne responsable de la protection des renseignements personnels:
                  </Text>
                  <Text style={styles.privacyOfficerName}>
                    {privacyConfig.contact.privacyOfficer.name}
                  </Text>
                  <Text style={styles.privacyOfficerEmail}>
                    {privacyConfig.contact.privacyOfficer.email}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
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

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  loadingText: {
    marginTop: spacing(2),
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
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

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    gap: spacing(1),
  },
  acceptAllButton: {
    backgroundColor: colors.accent,
  },
  rejectAllButton: {
    backgroundColor: colors.subtext,
  },
  acceptAllText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  rejectAllText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Rights Card
  rightsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  rightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  rightsDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(1.5),
  },
  rightsList: {
    marginBottom: spacing(2),
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(0.75),
  },
  rightText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing(1),
  },

  // Data Actions
  dataActions: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  dataActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing(0.75),
  },
  deleteActionButton: {
    borderColor: '#ef4444',
  },
  dataActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  deleteActionText: {
    color: '#ef4444',
  },

  // CPRA Card
  cpraCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  cpraTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  cpraDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  cpraButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    alignItems: 'center',
  },
  cpraButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Contact Card
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  contactText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(1.5),
  },
  contactEmail: {
    fontSize: 16,
    color: colors.accent,
    fontFamily: 'monospace',
    marginBottom: spacing(1.5),
  },
  privacyOfficer: {
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  privacyOfficerTitle: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  privacyOfficerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  privacyOfficerEmail: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: 'monospace',
  },
});
