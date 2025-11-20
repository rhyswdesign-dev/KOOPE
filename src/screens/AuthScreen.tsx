import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { signInAnonymous } from '../lib/auth';

interface AuthScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function AuthScreen({ onComplete, onSkip }: AuthScreenProps = {}) {
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNavigateToTerms = () => {
    Alert.alert('Terms of Service', 'Terms of Service will be available once you sign in.');
  };

  const handleNavigateToPrivacy = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy will be available once you sign in.');
  };

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll use anonymous sign-in as a placeholder
      await signInAnonymous();
      Alert.alert('Success', 'Signed in successfully!');
      // Call onComplete if provided (for onboarding flow)
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleContinue = async () => {
    setLoading(true);
    try {
      // Placeholder for Google sign-in
      await signInAnonymous();
      Alert.alert('Success', 'Signed in with Google!');
      // Call onComplete if provided (for onboarding flow)
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleContinue = async () => {
    setLoading(true);
    try {
      // Placeholder for Apple sign-in
      await signInAnonymous();
      Alert.alert('Success', 'Signed in with Apple!');
      // Call onComplete if provided (for onboarding flow)
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successSection}>
            <MaterialCommunityIcons name="check-circle" size={60} color={colors.accent} />
            <Text style={styles.successTitle}>Welcome!</Text>
            <Text style={styles.successSubtitle}>You're now signed in</Text>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="person-outline" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
              <Text style={styles.actionButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800' }}
        style={styles.backgroundImage}
        blurRadius={8}
      >
        <View style={styles.overlay} />

        {/* Skip Button */}
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.gold} />
          </TouchableOpacity>
        )}

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.welcomeTitle}>Welcome to KŌOPE</Text>
              <Text style={styles.welcomeSubtitle}>
                Your personal bartender. Learn, build, and discover cocktails tailored to you.
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.signInButton, loading && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={loading}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[styles.createAccountButton, loading && styles.buttonDisabled]}
                disabled={loading}
              >
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerSection}>
                <Text style={styles.dividerText}>or continue with</Text>
              </View>

              {/* Social Buttons */}
              <View style={styles.socialSection}>
                <TouchableOpacity
                  style={[styles.socialButton, loading && styles.buttonDisabled]}
                  onPress={handleAppleContinue}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, loading && styles.buttonDisabled]}
                  onPress={handleGoogleContinue}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="google" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By signing in you agree to our{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={handleNavigateToTerms}
                  >
                    Terms
                  </Text>
                  {' & '}
                  <Text
                    style={styles.termsLink}
                    onPress={handleNavigateToPrivacy}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(32, 21, 15, 0.75)', // colors.bg with transparency
  },
  skipButton: {
    position: 'absolute',
    top: spacing(6),
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(8),
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing(2),
  },
  formSection: {
    gap: spacing(2),
  },
  inputGroup: {
    gap: spacing(1),
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
  },
  signInButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
  },
  signInButtonText: {
    color: colors.goldText,
    fontSize: 18,
    fontWeight: '700',
  },
  createAccountButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  createAccountButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerSection: {
    alignItems: 'center',
    marginVertical: spacing(3),
  },
  dividerText: {
    color: colors.subtle,
    fontSize: 14,
  },
  socialSection: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  socialButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1.5),
  },
  socialButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: spacing(3),
  },
  termsText: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.gold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
  },
  actionsSection: {
    gap: spacing(2),
  },
  actionButton: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(2),
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});