import React, { useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';

interface TermsOfServiceScreenProps {
  onBack?: () => void;
}

export default function TermsOfServiceScreen({ onBack }: TermsOfServiceScreenProps) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Terms of Service',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [navigation, onBack]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>
            Last Updated: 31 May 2026
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Section
            title="Acceptance"
            content="By accessing or using KŌOPE, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app."
          />

          <Section
            title="Eligibility"
            content="You must be of legal drinking age in your jurisdiction to access alcohol-related content within KŌOPE. By using the app, you confirm that you meet this requirement."
          />

          <Section
            title="Accounts"
            content="You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorised use."
          />

          <Section
            title="User-Generated Content"
            content="KŌOPE allows you to create and store content such as bottle scans and inventory data. You retain ownership of your content. By submitting content, you grant KŌOPE a limited licence to store and process it solely to provide the service."
          />

          <Section
            title="Subscriptions and Billing"
            content="Certain features require a paid subscription. Pricing, billing periods, and renewal terms are displayed before purchase. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are handled in accordance with applicable app store policies (Apple App Store or Google Play). To cancel, manage your subscription through your device’s app store settings."
          />

          <Section
            title="Intellectual Property"
            content="All KŌOPE branding, content, software, graphics, and educational materials are the property of KŌOPE or its licensors. You may not reproduce, distribute, or create derivative works without prior written permission."
          />

          <Section
            title="Responsible Consumption"
            content="KŌOPE promotes the responsible enjoyment of alcoholic beverages. You are solely responsible for your consumption decisions. Nothing in the app constitutes professional advice regarding alcohol consumption."
          />

          <Section
            title="Disclaimer and Limitation of Liability"
            content="KŌOPE is provided on an “as is” and “as available” basis without warranties of any kind. To the maximum extent permitted by law, KŌOPE shall not be liable for indirect, incidental, or consequential damages arising from use of the service."
          />

          <Section
            title="Governing Law"
            content="These Terms are governed by and construed in accordance with the laws of the Province of Ontario, Canada. Any disputes arising from these Terms shall be resolved in the courts of Ontario, Canada."
          />

          <Section
            title="Changes to These Terms"
            content="We may update these Terms periodically. We will notify you of material changes via the app or email. Continued use of KŌOPE after changes take effect constitutes acceptance of the revised Terms."
          />

          <Section
            title="Contact"
            content="Questions regarding these Terms may be directed to legal@koope.com."
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using KŌOPE, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionProps {
  title: string;
  content: string;
  subsections?: Array<{
    subtitle: string;
    content: string;
  }>;
}

function Section({ title, content, subsections }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionContent}>{content}</Text>
      
      {subsections && subsections.map((subsection, index) => (
        <View key={index} style={styles.subsection}>
          <Text style={styles.subsectionTitle}>{subsection.subtitle}</Text>
          <Text style={styles.subsectionContent}>{subsection.content}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(4),
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing(3),
  },
  section: {
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  sectionContent: {
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    marginBottom: spacing(1),
  },
  subsection: {
    marginTop: spacing(2),
    marginLeft: spacing(2),
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  subsectionContent: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    backgroundColor: colors.card,
    marginHorizontal: spacing(3),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  footerText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
