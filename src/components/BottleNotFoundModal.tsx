/**
 * BottleNotFoundModal
 *
 * Replaces the native Alert.alert() for the "bottle not recognised" scanner failure state.
 * Bottom sheet with spring animation, full-width action buttons, and KŌOPE design tokens.
 *
 * Actions:
 *   1. Try Again   — retakes the scan (primary)
 *   2. Scan Barcode — switches to barcode mode (secondary)
 *   3. Search Library — navigates to BottleSearch (secondary)
 *   4. Cancel — dismisses and goes back (ghost link)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  onTryAgain: () => void;
  onScanBarcode: () => void;
  onSearchLibrary: () => void;
  onCancel: () => void;
}

export default function BottleNotFoundModal({
  visible,
  onTryAgain,
  onScanBarcode,
  onSearchLibrary,
  onCancel,
}: Props) {
  const slideAnim = useRef(new Animated.Value(360)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 52,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 360,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconRing}>
              <Ionicons name="scan-outline" size={26} color={colors.accent} />
            </View>
          </View>

          {/* Copy */}
          <Text style={styles.title}>Bottle Not Recognised</Text>
          <Text style={styles.body}>
            We couldn't read the label clearly. Try scanning again with the label fully in frame, or use the barcode on the back.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Primary */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onTryAgain}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={17} color={colors.goldText} style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>

            {/* Secondary row */}
            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onScanBarcode}
                activeOpacity={0.8}
              >
                <Ionicons name="barcode-outline" size={16} color={colors.accent} style={styles.btnIcon} />
                <Text style={styles.secondaryBtnText}>Scan Barcode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSearchLibrary}
                activeOpacity={0.8}
              >
                <Ionicons name="search-outline" size={16} color={colors.accent} style={styles.btnIcon} />
                <Text style={styles.secondaryBtnText}>Search Library</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel ghost */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(214,138,56,0.15)',
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginBottom: spacing(1),
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: spacing(0.5),
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(214,138,56,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  body: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing(1),
  },
  actions: {
    gap: spacing(1.5),
    marginTop: spacing(0.5),
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    paddingVertical: spacing(1.875),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(0.75),
  },
  btnIcon: {
    marginTop: 1,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.goldText,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    borderWidth: 1.5,
    borderColor: 'rgba(214,138,56,0.35)',
    borderRadius: radii.xl,
    paddingVertical: spacing(1.75),
    backgroundColor: 'rgba(214,138,56,0.06)',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing(1),
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
  },
});
