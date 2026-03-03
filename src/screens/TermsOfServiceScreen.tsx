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
            Effective Date: March 1, 2024
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Section
            title="Agreement to Terms"
            content="By accessing and using the Home Game Advantage mobile application ('App'), you agree to be bound by these Terms of Service ('Terms'). If you disagree with any part of these terms, you may not access the App."
          />

          <Section
            title="Description of Service"
            content="Home Game Advantage is a mobile application that helps users discover bars, learn about spirits, participate in events, and improve home bartending skills."
            subsections={[
              {
                subtitle: "Core Features",
                content: "• Bar discovery and recommendations\n• Spirit education and tasting notes\n• Event registration and participation\n• Personalized recipe and inventory tools\n• XP and tier progression system"
              },
              {
                subtitle: "User-Generated Content",
                content: "• Reviews and ratings of bars and spirits\n• Recipe logs, ratings, and notes\n• Profile information and preferences\n• Event feedback and participation history"
              }
            ]}
          />

          <Section
            title="User Accounts and Responsibilities"
            content="To access certain features of the App, you must create an account. You are responsible for maintaining the confidentiality of your account information."
            subsections={[
              {
                subtitle: "Account Requirements",
                content: "• You must be at least 21 years of age to use this App\n• You must provide accurate and complete information\n• You are responsible for all activities under your account\n• You must notify us immediately of any unauthorized use"
              },
              {
                subtitle: "Prohibited Activities",
                content: "• Providing false or misleading information\n• Using the App for illegal activities\n• Harassing, threatening, or intimidating other users\n• Attempting to gain unauthorized access to the App\n• Distributing spam, malware, or other harmful content"
              }
            ]}
          />

          <Section
            title="Content and Conduct"
            content="Users may contribute content to the App, including reviews, comments, and profile information. All user-generated content must comply with our community guidelines."
            subsections={[
              {
                subtitle: "Content Standards",
                content: "• Content must be accurate and not misleading\n• No hate speech, harassment, or discriminatory language\n• No promotion of illegal activities\n• Respect intellectual property rights\n• No spam or commercial solicitation"
              },
              {
                subtitle: "Content Ownership",
                content: "• You retain ownership of content you create\n• You grant us a license to use, display, and distribute your content\n• We may moderate and remove content that violates these terms\n• We are not responsible for user-generated content"
              }
            ]}
          />

          <Section
            title="Privacy and Data Protection"
            content="Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference."
          />

          <Section
            title="Events and Third-Party Services"
            content="The App may facilitate registration for events and connect you with third-party venues and services. Your participation in such events and use of third-party services is subject to their own terms and conditions."
            subsections={[
              {
                subtitle: "Event Participation",
                content: "• Event registration may require additional agreements\n• We are not responsible for event cancellations or changes\n• Refund policies are determined by event organizers\n• You participate in events at your own risk"
              },
              {
                subtitle: "Third-Party Integrations",
                content: "• We may integrate with payment, authentication, and support providers\n• Third-party services have their own terms and privacy policies\n• We are not responsible for third-party service availability or functionality\n• Your use of third-party services is at your own discretion"
              }
            ]}
          />

          <Section
            title="Intellectual Property"
            content="The App and its original content, features, and functionality are owned by Home Game Advantage and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws."
            subsections={[
              {
                subtitle: "Our Rights",
                content: "• All App content, design, and functionality\n• Home Game Advantage trademarks and branding\n• Proprietary algorithms and recommendation systems\n• Original educational content and materials"
              },
              {
                subtitle: "User Rights",
                content: "• Limited license to use the App for personal purposes\n• Right to create and share user-generated content\n• Right to access and download your own data\n• Right to terminate your account at any time"
              }
            ]}
          />

          <Section
            title="Disclaimers and Limitations"
            content="The App is provided 'as is' without warranties of any kind. We disclaim all warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement."
            subsections={[
              {
                subtitle: "Service Availability",
                content: "• We do not guarantee uninterrupted service availability\n• Maintenance and updates may temporarily disrupt service\n• We may modify or discontinue features at any time\n• Technical issues may affect App performance"
              },
              {
                subtitle: "Content Accuracy",
                content: "• Information in the App may not always be current or accurate\n• User reviews and ratings reflect individual opinions\n• We do not verify all user-generated content\n• You should verify information independently"
              }
            ]}
          />

          <Section
            title="Liability and Indemnification"
            content="To the maximum extent permitted by law, Home Game Advantage shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the App."
            subsections={[
              {
                subtitle: "User Indemnification",
                content: "You agree to indemnify and hold harmless Home Game Advantage from any claims, losses, damages, or expenses arising from your use of the App, violation of these Terms, or infringement of any rights of others."
              },
              {
                subtitle: "Limitation of Liability",
                content: "Our total liability to you for all claims arising out of or relating to the App shall not exceed the amount you have paid us in the twelve months preceding the claim, or $100, whichever is greater."
              }
            ]}
          />

          <Section
            title="Termination"
            content="We may terminate or suspend your account and access to the App at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties."
            subsections={[
              {
                subtitle: "Your Rights Upon Termination",
                content: "• You may terminate your account at any time\n• Upon termination, you may request a copy of your data\n• Some provisions of these Terms survive termination\n• You remain responsible for any outstanding obligations"
              },
              {
                subtitle: "Effect of Termination",
                content: "• Your right to use the App immediately ceases\n• We may delete your account and associated data\n• You must cease all use of our intellectual property\n• Surviving provisions remain in effect"
              }
            ]}
          />

          <Section
            title="Governing Law and Disputes"
            content="These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions."
            subsections={[
              {
                subtitle: "Dispute Resolution",
                content: "• We encourage resolving disputes through direct communication\n• Binding arbitration may be required for certain disputes\n• Class action waivers may apply\n• Jurisdiction and venue provisions apply to legal proceedings"
              }
            ]}
          />

          <Section
            title="Changes to Terms"
            content="We reserve the right to modify these Terms at any time. We will notify users of material changes through the App or by email. Your continued use of the App after such changes constitutes acceptance of the new Terms."
          />

          <Section
            title="Severability and Entire Agreement"
            content="If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect. These Terms, together with our Privacy Policy, constitute the entire agreement between you and Home Game Advantage."
          />

          <Section
            title="Contact Information"
            content="If you have any questions about these Terms of Service, please contact us:"
            subsections={[
              {
                subtitle: "Contact Details",
                content: "Email: legal@homegameadvantage.com\nAddress: [Company Address]\nPhone: [Phone Number]\n\nWe will respond to your inquiries within 30 days."
              }
            ]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Home Game Advantage, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
