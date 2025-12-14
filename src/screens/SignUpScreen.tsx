import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { colors, spacing, radii, textStyles } from '../theme/tokens';
import { log } from '../lib/logger';

interface SignUpScreenProps {
  onComplete?: () => void;
  onSignIn?: () => void;
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}

export default function SignUpScreen({ onComplete, onSignIn, onTermsPress, onPrivacyPress }: SignUpScreenProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPassword = (password: string) => {
    // At least 8 characters, one letter, one number
    return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  };

  const handleSignUp = async () => {
    const { name, email, password, confirmPassword } = formData;

    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters with letters and numbers');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the Terms and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });

      log.info('SignUpScreen', 'Sign up successful', { userId: userCredential.user.uid });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      log.error('SignUpScreen', 'Sign up error', error);

      let errorMessage = 'Please try again';

      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
      }

      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      // TODO: Implement Apple Sign Up
      log.info('SignUpScreen', 'Apple Sign Up requested');
      Alert.alert('Coming Soon', 'Apple Sign Up will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Apple Sign Up failed');
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // TODO: Implement Google Sign Up
      log.info('SignUpScreen', 'Google Sign Up requested');
      Alert.alert('Coming Soon', 'Google Sign Up will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Google Sign Up failed');
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Home Game Advantage community</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.subtle}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  keyboardAppearance="dark"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.subtle}
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardAppearance="dark"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a password"
                  placeholderTextColor={colors.subtle}
                  value={formData.password}
                  onChangeText={(text) => updateFormData('password', text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  keyboardAppearance="dark"
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  hitSlop={8}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.subtext} 
                  />
                </Pressable>
              </View>
              <Text style={styles.passwordHint}>
                At least 8 characters with letters and numbers
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.subtle}
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  keyboardAppearance="dark"
                />
                <Pressable 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                  hitSlop={8}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={colors.subtext} 
                  />
                </Pressable>
              </View>
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <Pressable 
                onPress={() => setAgreeToTerms(!agreeToTerms)}
                style={styles.checkbox}
                hitSlop={4}
              >
                {agreeToTerms ? (
                  <Ionicons name="checkbox" size={24} color={colors.accent} />
                ) : (
                  <Ionicons name="checkbox-outline" size={24} color={colors.subtext} />
                )}
              </Pressable>
              <View style={styles.termsText}>
                <Text style={styles.termsTextBase}>I agree to the </Text>
                <TouchableOpacity onPress={onTermsPress} activeOpacity={0.7}>
                  <Text style={styles.termsLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.termsTextBase}> and </Text>
                <TouchableOpacity onPress={onPrivacyPress} activeOpacity={0.7}>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <Pressable 
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Sign Up */}
          <View style={styles.socialContainer}>
            {/* Apple Sign Up */}
            <Pressable style={styles.socialButton} onPress={handleAppleSignUp}>
              <Ionicons name="logo-apple" size={24} color={colors.text} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </Pressable>

            {/* Google Sign Up */}
            <Pressable style={styles.socialButton} onPress={handleGoogleSignUp}>
              <MaterialCommunityIcons name="google" size={24} color={colors.text} />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>
          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSignIn} activeOpacity={0.7}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(4),
    paddingBottom: spacing(6),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  title: {
    fontSize: 32,
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
  form: {
    marginBottom: spacing(3),
  },
  inputGroup: {
    marginBottom: spacing(2.5),
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    minHeight: 54,
  },
  inputIcon: {
    marginRight: spacing(1.5),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing(2),
  },
  passwordInput: {
    paddingRight: spacing(1),
  },
  passwordToggle: {
    padding: spacing(1),
  },
  passwordHint: {
    fontSize: 12,
    color: colors.subtle,
    marginTop: spacing(0.5),
    marginLeft: spacing(0.5),
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing(2),
  },
  checkbox: {
    marginRight: spacing(1.5),
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsTextBase: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    lineHeight: 20,
  },
  signUpButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(1),
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  signUpButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.goldText,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing(3),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    fontSize: 14,
    color: colors.subtext,
    marginHorizontal: spacing(2),
  },
  socialContainer: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing(2.5),
    gap: spacing(1.5),
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  signInText: {
    fontSize: 16,
    color: colors.subtext,
  },
  signInLink: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '700',
  },
});