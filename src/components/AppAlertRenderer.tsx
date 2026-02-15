/**
 * Global branded alert renderer
 * Replaces native Alert.alert() with on-brand modals automatically.
 * Mounted once in App.tsx — no per-screen changes needed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, radii } from '../theme/tokens';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

// Singleton reference for the renderer
let _showAlert: ((config: AlertConfig) => void) | null = null;

function getAlertIcon(title: string, buttons?: AlertButton[]): { name: string; color: string } {
  const hasDestructive = buttons?.some(b => b.style === 'destructive');
  const t = title.toLowerCase();

  if (hasDestructive || t.includes('delete') || t.includes('sign out') || t.includes('reset')) {
    return { name: 'alert-circle', color: '#F59E0B' };
  }
  if (t.includes('error') || t.includes('failed') || t.includes('oops')) {
    return { name: 'close-circle', color: colors.error };
  }
  if (t.includes('success') || t.includes('imported') || t.includes('complete') || t.includes('added') || t.includes('saved')) {
    return { name: 'checkmark-circle', color: colors.success };
  }
  return { name: 'information-circle', color: colors.accent };
}

function getButtonStyle(style?: string) {
  switch (style) {
    case 'cancel':
      return { bg: colors.chipBg, text: colors.text, border: true };
    case 'destructive':
      return { bg: '#EF4444', text: '#FFFFFF', border: false };
    default:
      return { bg: colors.accent, text: colors.goldText, border: false };
  }
}

export default function AppAlertRenderer() {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const show = useCallback((c: AlertConfig) => {
    setConfig(c);
  }, []);

  const hide = useCallback(() => {
    setConfig(null);
  }, []);

  useEffect(() => {
    _showAlert = show;
    return () => { _showAlert = null; };
  }, [show]);

  if (!config) return null;

  const buttons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: 'OK', style: 'default' as const }];

  // Sort: cancel buttons first (left side), then default, then destructive
  const sortedButtons = [...buttons].sort((a, b) => {
    if (a.style === 'cancel') return -1;
    if (b.style === 'cancel') return 1;
    return 0;
  });

  const isStacked = buttons.length > 2;
  const icon = getAlertIcon(config.title, config.buttons);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={hide}>
        <BlurView intensity={15} style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialog}>
              <View style={styles.iconWrap}>
                <Ionicons name={icon.name as any} size={48} color={icon.color} />
              </View>
              <Text style={styles.title}>{config.title}</Text>
              {config.message ? (
                <Text style={styles.message}>{config.message}</Text>
              ) : null}
              <View style={[styles.actions, isStacked && styles.actionsStacked]}>
                {sortedButtons.map((btn, i) => {
                  const s = getButtonStyle(btn.style);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.button,
                        { backgroundColor: s.bg },
                        s.border && styles.buttonBorder,
                        isStacked && styles.buttonStacked,
                      ]}
                      onPress={() => { hide(); btn.onPress?.(); }}
                    >
                      <Text style={[styles.buttonText, { color: s.text }]}>
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Call this once in App.tsx to override native Alert.alert globally.
 */
export function installAppAlert() {
  Alert.alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    if (_showAlert) {
      _showAlert({ title, message, buttons });
    }
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
    width: '100%',
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(3),
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing(2),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  message: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing(3),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(1.5),
    width: '100%',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonBorder: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonStacked: {
    flex: 0,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
