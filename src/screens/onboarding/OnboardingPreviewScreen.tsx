// @ts-nocheck
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AgeGateScreen from '../AgeGateScreen';
import WelcomeCarouselScreen from '../WelcomeCarouselScreen';
import OAuthSignInScreen from '../OAuthSignInScreen';
import XPReminderScreen from '../XPReminderScreen';
import BartendingWelcomeScreen from '../BartendingWelcomeScreen';
import OnboardingQuestionnaireScreen from './OnboardingQuestionnaireScreen';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radii, spacing } from '../../theme/tokens';
import type { AgeVerificationPayload } from '../../services/ageVerificationService';

type PreviewStep = 'age_gate' | 'welcome' | 'oauth' | 'xp_reminder' | 'bartending_welcome' | 'questionnaire';

export default function OnboardingPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [step, setStep] = React.useState<PreviewStep>('age_gate');

  const handleFinish = React.useCallback(() => {
    Alert.alert('Preview complete', 'Returning to Settings.');
    navigation.goBack();
  }, [navigation]);

  const handleViewMasteryLessons = React.useCallback(() => {
    navigation.navigate('Main' as never, { screen: 'Lessons' } as never);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.bannerWrap}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Preview Mode</Text>
          <Text style={styles.bannerText}>You are viewing the onboarding flow safely. No account, profile, XP, or trial changes will be saved.</Text>
        </View>
      </View>

      {step === 'age_gate' ? (
        <AgeGateScreen onVerified={(_payload: AgeVerificationPayload) => setStep('welcome')} />
      ) : null}

      {step === 'welcome' ? (
        <WelcomeCarouselScreen onComplete={() => setStep('oauth')} />
      ) : null}

      {step === 'oauth' ? (
        <OAuthSignInScreen
          previewMode
          onComplete={() => setStep('bartending_welcome')}
          onSkip={() => setStep('xp_reminder')}
        />
      ) : null}

      {step === 'xp_reminder' ? (
        <XPReminderScreen
          onGoBack={() => setStep('oauth')}
          onComplete={() => setStep('questionnaire')}
        />
      ) : null}

      {step === 'bartending_welcome' ? (
        <BartendingWelcomeScreen onComplete={() => setStep('questionnaire')} />
      ) : null}

      {step === 'questionnaire' ? (
        <OnboardingQuestionnaireScreen
          previewMode
          onViewMasteryLessons={handleViewMasteryLessons}
          onComplete={handleFinish}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bannerWrap: {
    position: 'absolute',
    top: spacing(2),
    left: spacing(2),
    right: spacing(2),
    zIndex: 20,
  },
  banner: {
    backgroundColor: 'rgba(26, 18, 13, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.4)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  bannerTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bannerText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
