/**
 * FeedbackPromptModal — "Would this feature be useful to you?"
 *
 * Used for held features (Lessons, Cellar Mode) to gather interest signal
 * without showing a paywall. Shows once per feature key (AsyncStorage gated).
 *
 * Usage:
 *   <FeedbackPromptModal
 *     featureKey="lessons"
 *     title="Would mastery lessons be useful?"
 *     body="We're building in-depth technique lessons for KŌOPE. Would this be something you'd actually use?"
 *     visible={visible}
 *     onDismiss={() => setVisible(false)}
 *   />
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent } from '../lib/analytics';

const AMBER = '#D68A38';
const STORAGE_PREFIX = '@KOOPE:feature_feedback_';

interface FeedbackPromptModalProps {
  /** Unique key used for AsyncStorage dedup and analytics event names */
  featureKey: string;
  /** Short question headline */
  title: string;
  /** Longer context sentence */
  body: string;
  visible: boolean;
  onDismiss: () => void;
}

export function FeedbackPromptModal({
  featureKey,
  title,
  body,
  visible,
  onDismiss,
}: FeedbackPromptModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(onDismiss);
  }, [slideAnim, onDismiss]);

  const handleResponse = useCallback(
    async (response: 'yes' | 'no') => {
      // Mark as seen so this doesn't re-trigger
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${featureKey}`, response);
      trackEvent('Feature Interest Response', {
        feature: featureKey,
        response,
      });
      dismiss();
    },
    [featureKey, dismiss]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={dismiss}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          // Prevent overlay tap from closing when tapping the sheet itself
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="flask-outline" size={22} color={AMBER} />
          </View>

          {/* Copy */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.yesBtn}
              onPress={() => handleResponse('yes')}
              activeOpacity={0.85}
            >
              <Text style={styles.yesBtnText}>Yes, I'd use this</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.noBtn}
              onPress={() => handleResponse('no')}
              activeOpacity={0.7}
            >
              <Text style={styles.noBtnText}>Not really</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

/**
 * Check if the user has already responded to a feature feedback prompt.
 * Returns the prior response ('yes' | 'no') or null if not yet seen.
 */
export async function getFeatureFeedbackResponse(
  featureKey: string
): Promise<'yes' | 'no' | null> {
  const val = await AsyncStorage.getItem(`${STORAGE_PREFIX}${featureKey}`);
  return (val as 'yes' | 'no' | null) ?? null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A120D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 44,
    paddingHorizontal: 24,
    gap: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(242,229,213,0.1)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(214,138,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F2E5D5',
    lineHeight: 26,
  },
  body: {
    fontSize: 14,
    color: '#C7B8A5',
    lineHeight: 20,
  },
  buttons: {
    gap: 10,
    marginTop: 6,
  },
  yesBtn: {
    backgroundColor: AMBER,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  yesBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A120D',
  },
  noBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noBtnText: {
    fontSize: 14,
    color: '#C7B8A5',
    fontWeight: '600',
  },
});

export default FeedbackPromptModal;
