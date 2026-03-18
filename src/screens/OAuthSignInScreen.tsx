/**
 * OAuth Sign-In Screen
 * Apple and Google OAuth only - no email/password
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../theme/tokens';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
interface OAuthSignInProps {
  onComplete?: () => void;
  onSkip?: () => void;
  previewMode?: boolean;
}

const { width } = Dimensions.get('window');

export default function OAuthSignInScreen({ onComplete, onSkip, previewMode = false }: OAuthSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithApple, signInWithGoogle, signInWithEmail } = useAuth();

  // Safely get navigation - may be undefined when not in NavigationContainer (during onboarding)
  let navigation;
  try {
    navigation = useNavigation();
  } catch (e) {
    navigation = null;
  }

  // Use navigation if callbacks aren't provided (when used as a navigation screen)
  const handleComplete = onComplete || (() => navigation?.canGoBack() && navigation.goBack());
  const handleSkip = onSkip || (() => navigation?.canGoBack() && navigation.goBack());

  const handleTestSignIn = async () => {
    if (previewMode) {
      Alert.alert('Preview mode', 'This is only a demo of the sign-in step. No account action was taken.', [
        { text: 'Continue', onPress: handleComplete },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔧 Test Sign-In initiated');
      await signInWithEmail('test@koope.app', 'TestPassword123!');
      console.log('✅ Test Sign-In successful!');
      Alert.alert('Success!', 'Signed in with test account', [
        { text: 'OK', onPress: handleComplete }
      ]);
    } catch (error: any) {
      console.log('❌ Test Sign-In failed:', error);
      Alert.alert('Sign In Failed', `Could not sign in: ${error.message}. Make sure you created the test user in Supabase.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (previewMode) {
      Alert.alert('Preview mode', 'Apple sign-in is disabled in preview. Advancing to the next onboarding step.', [
        { text: 'Continue', onPress: handleComplete },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      log.info('OAuthSignInScreen', 'Apple Sign-In initiated');
      console.log('🔵 Starting Apple Sign-In...');
      await signInWithApple();
      console.log('✅ Apple Sign-In successful!');
      log.info('OAuthSignInScreen', 'Apple Sign-In completed');
      Alert.alert('Success!', 'Signed in successfully', [
        { text: 'OK', onPress: handleComplete }
      ]);
    } catch (error: any) {
      console.log('❌ Apple Sign-In failed:', error);
      log.error('OAuthSignInScreen', 'Apple Sign-In failed', error);
      // Always show error message
      Alert.alert('Sign In Failed', `Could not sign in with Apple: ${error.message}. Please try again or skip to continue.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (previewMode) {
      Alert.alert('Preview mode', 'Google sign-in is disabled in preview. Advancing to the next onboarding step.', [
        { text: 'Continue', onPress: handleComplete },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      log.info('OAuthSignInScreen', 'Google Sign-In initiated');
      await signInWithGoogle();
      log.info('OAuthSignInScreen', 'Google Sign-In completed');
      handleComplete();
    } catch (error: any) {
      log.error('OAuthSignInScreen', 'Google Sign-In failed', error);

      // Check if it's a configuration error
      if (error?.message?.includes('400') || error?.message?.includes('malformed')) {
        Alert.alert(
          'Google Sign-In Unavailable',
          'Google authentication is not configured yet. Please use Apple Sign-In or skip to continue.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Sign In Failed', 'Could not sign in with Google. Please try again or use Apple Sign-In.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={[colors.bg, '#1A0F0B', colors.card]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Ambient lighting effects */}
      <View style={[styles.lightOrb, styles.lightOrbTop]} />
      <View style={[styles.lightOrb, styles.lightOrbBottom]} />

      {/* Skip Button */}
      {(onSkip || (navigation && navigation.canGoBack())) && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            console.log('🔵 Skip button pressed, calling handleSkip...');
            handleSkip();
          }}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.gold} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow}>
              <MaterialCommunityIcons name="glass-cocktail" size={48} color={colors.gold} />
            </View>
          </View>

          <Text style={styles.title}>Sign in to KŌOPE</Text>

          <Text style={styles.subtitle}>
            Save your progress, sync across devices, and unlock your full bartending potential
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {[
            { icon: 'save-outline', text: 'Save your learning progress' },
            { icon: 'trophy-outline', text: 'Track XP, streaks & achievements' },
            { icon: 'lock-open-outline', text: 'Access your premium content' },
          ].map((benefit, index) => (
            <View key={index} style={styles.benefit}>
              <View style={styles.benefitIconPlaceholder}>
                <Ionicons name={benefit.icon as any} size={22} color={colors.gold} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* OAuth Buttons */}
        <View style={styles.authButtons}>
          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                console.log('🍎 Apple button pressed!');
                handleAppleSignIn();
              }}
              disabled={isLoading}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              accessibilityHint="Sign in to your account using Apple ID"
              accessibilityState={{ disabled: isLoading }}
            >
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons name="apple" size={24} color={colors.text} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={() => {
              console.log('🔵 Google button pressed!');
              handleGoogleSignIn();
            }}
            disabled={isLoading}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityHint="Sign in to your account using Google"
            accessibilityState={{ disabled: isLoading }}
          >
            <View style={styles.buttonContent}>
              <MaterialCommunityIcons name="google" size={24} color={colors.text} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Test Sign-In (Development Only) */}
          {(__DEV__ || previewMode) && (
            <TouchableOpacity
              style={[styles.testButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                console.log('🔧 Test button pressed!');
                handleTestSignIn();
              }}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Ionicons name={previewMode ? 'eye-outline' : 'flask'} size={24} color={colors.gold} />
                <Text style={styles.testButtonText}>
                  {previewMode ? 'Preview Continue' : 'Sign In with Test Account'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Terms */}
        <View style={styles.footer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' and '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(4),
    paddingTop: Platform.OS === 'ios' ? spacing(8) : spacing(6),
    paddingBottom: spacing(6),
    justifyContent: 'space-between',
  },
  lightOrb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.gold,
    opacity: 0.03,
  },
  lightOrbTop: {
    top: -width * 0.4,
    right: -width * 0.3,
  },
  lightOrbBottom: {
    bottom: -width * 0.3,
    left: -width * 0.4,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? spacing(6) : spacing(4),
    right: spacing(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    zIndex: 10,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing(4),
  },
  logoContainer: {
    marginBottom: spacing(4),
  },
  logoGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gold,
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(2),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  benefits: {
    gap: spacing(2),
    marginVertical: spacing(4),
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    opacity: 0.15,
  },
  benefitIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  benefitText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  authButtons: {
    gap: spacing(2),
  },
  appleButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  googleButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
  },
  appleButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: colors.gold + '20',
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    borderWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  testButtonText: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing(4),
  },
  termsText: {
    fontSize: 13,
    color: colors.subtle,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.gold,
    fontWeight: '600',
  },
});
