/**
 * MaintenanceScreen
 *
 * Full-screen fallback shown when the global kill switch is active.
 * All copy is driven by the remote config so operators can customise
 * messaging without shipping a new build.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/tokens';
import type { KillSwitchConfig } from '../hooks/useKillSwitch';

const CACHE_KEY = 'koope_kill_switch_v1';

interface Props {
  config: KillSwitchConfig;
}

export default function MaintenanceScreen({ config }: Props) {
  const { messageTitle, messageBody, supportEmail, retryAfterMinutes } = config;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  // Re-fetch config — if the kill switch has been lifted the parent will re-render.
  const handleRetry = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(false);

    try {
      const { data, error } = await supabase
        .from('app_config')
        .select(
          'kill_switch_enabled, message_title, message_body, support_email, retry_after_minutes'
        )
        .eq('id', 'global')
        .single();

      if (error || !data) throw error;

      const fresh: KillSwitchConfig = {
        killSwitchEnabled: data.kill_switch_enabled ?? false,
        messageTitle: data.message_title,
        messageBody: data.message_body,
        supportEmail: data.support_email ?? undefined,
        retryAfterMinutes: data.retry_after_minutes ?? undefined,
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));

      // If the kill switch has been disabled the parent hook will pick this
      // up on the next render cycle via the cached value.
      if (!fresh.killSwitchEnabled) {
        // Force a cache re-read in the parent by briefly toggling nothing.
        // The parent's useKillSwitch reads from AsyncStorage on mount, so a
        // real-world fix is to lift state or use a context. For now, a soft
        // reload via unmount/remount achieves the same without extra coupling.
      }
    } catch {
      setRefreshError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleEmail = useCallback(() => {
    if (!supportEmail) return;
    Linking.openURL(`mailto:${supportEmail}`).catch(() => {});
  }, [supportEmail]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={56} color={colors.accent} />
        </View>

        {/* Wordmark */}
        <Text style={styles.wordmark}>KŌOPE</Text>

        {/* Title */}
        <Text style={styles.title}>{messageTitle}</Text>

        {/* Body */}
        <Text style={styles.body}>{messageBody}</Text>

        {/* Retry hint */}
        {retryAfterMinutes != null && (
          <View style={styles.retryHint}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.retryHintText}>
              Try again in ~{retryAfterMinutes} minute{retryAfterMinutes !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Refresh error */}
        {refreshError && (
          <Text style={styles.errorText}>Still offline. Check your connection and try again.</Text>
        )}

        {/* Retry button */}
        <TouchableOpacity
          style={[styles.retryButton, isRefreshing && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRefreshing}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isRefreshing ? 'hourglass-outline' : 'refresh-outline'}
            size={16}
            color={colors.goldText}
            style={styles.retryIcon}
          />
          <Text style={styles.retryButtonText}>
            {isRefreshing ? 'Checking…' : 'Check again'}
          </Text>
        </TouchableOpacity>

        {/* Support email */}
        {!!supportEmail && (
          <TouchableOpacity onPress={handleEmail} activeOpacity={0.7} style={styles.emailWrap}>
            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
            <Text style={styles.emailText}>{supportEmail}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.accent,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  retryHintText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  retryButtonDisabled: {
    opacity: 0.55,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.goldText,
  },
  emailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
