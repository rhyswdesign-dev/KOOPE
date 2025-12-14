import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { log } from '../lib/logger';

interface XPReminderScreenProps {
  onComplete?: () => void;
  onGoBack?: () => void;
}

export default function XPReminderScreen({ onComplete, onGoBack }: XPReminderScreenProps) {

  const handleCreateAccount = () => {
    if (onGoBack) {
      // Go back to the account setup screen
      onGoBack();
    } else if (onComplete) {
      // Fallback to completing if no go back function provided
      onComplete();
    } else {
      // When used within NavigationContainer, navigation would be available
      log.warn('XPReminderScreen', 'Navigation not available in onboarding mode');
    }
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    } else {
      // When used within NavigationContainer, navigation would be available
      log.warn('XPReminderScreen', 'Navigation not available in onboarding mode');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="trophy-outline" size={80} color={colors.accent} />
        </View>

        {/* Title */}
        <Text style={styles.title}>You're Missing Out on XP!</Text>

        {/* Description */}
        <Text style={styles.description}>
          Without an account, you won't be able to:
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="star" size={20} color={colors.accent} />
            <Text style={styles.featureText}>Earn XP from activities</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trophy" size={20} color={colors.accent} />
            <Text style={styles.featureText}>Unlock spirit tier upgrades</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={20} color={colors.accent} />
            <Text style={styles.featureText}>Register for premium events</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="gift" size={20} color={colors.accent} />
            <Text style={styles.featureText}>Access exclusive rewards</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="stats-chart" size={20} color={colors.accent} />
            <Text style={styles.featureText}>Track your progress</Text>
          </View>
        </View>

        {/* XP Progress Example */}
        <View style={styles.xpExample}>
          <Text style={styles.xpTitle}>What You're Missing:</Text>
          <View style={styles.xpBar}>
            <View style={styles.xpProgress} />
            <Text style={styles.xpText}>0 XP without account</Text>
          </View>
          <Text style={styles.xpSubtext}>
            Users with accounts average 150+ XP in their first week
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
          <Text style={styles.createAccountText}>Create Account & Start Earning</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue Without Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(3),
    paddingTop: spacing(4),
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing(3),
    padding: spacing(2),
    backgroundColor: colors.card,
    borderRadius: 50,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  description: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(3),
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: spacing(4),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1),
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: spacing(2),
    fontWeight: '500',
  },
  xpExample: {
    width: '100%',
    backgroundColor: colors.card,
    padding: spacing(2.5),
    borderRadius: radii.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  xpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  xpBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.chipBg,
    borderRadius: 4,
    position: 'relative',
    marginBottom: spacing(1),
  },
  xpProgress: {
    width: '0%',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  xpText: {
    position: 'absolute',
    top: -2,
    left: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
  },
  xpSubtext: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },
  createAccountButton: {
    backgroundColor: colors.accent,
    padding: spacing(2),
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  continueButton: {
    padding: spacing(2),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
});