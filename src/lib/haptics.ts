import * as Haptics from 'expo-haptics';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useCallback, useRef } from 'react';

export type HapticType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

export function triggerHaptic(type: HapticType = 'selection') {
  const isIOS = Platform.OS === 'ios';

  switch (type) {
    case 'light':
      Haptics.impactAsync(isIOS ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      return;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      return;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      return;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    case 'selection':
    default:
      Haptics.selectionAsync().catch(() => {});
  }
}

export function withHaptic<T extends (...args: any[]) => any>(fn: T | undefined, type: HapticType = 'medium') {
  return (...args: Parameters<T>) => {
    triggerHaptic(type);
    fn?.(...args);
  };
}

export function useScrollHaptic(type: HapticType = 'selection', minIntervalMs = 700) {
  const lastTriggerRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerRef.current < minIntervalMs) return;
    lastTriggerRef.current = now;
    triggerHaptic(type);
  }, [type, minIntervalMs]);
}

type DialScrollHapticOptions = {
  minIntervalMs?: number;
  stepPx?: number;
  axis?: 'x' | 'y';
  pulseOnDragStart?: boolean;
};

export function useDialScrollHaptics(
  type: HapticType = 'selection',
  options: DialScrollHapticOptions = {}
) {
  const {
    minIntervalMs = 65,
    stepPx = 28,
    axis = 'y',
    pulseOnDragStart = false,
  } = options;

  const lastTriggerRef = useRef(0);
  const lastOffsetRef = useRef<number | null>(null);
  const accumulatedDeltaRef = useRef(0);

  const onScrollBeginDrag = useCallback(() => {
    lastOffsetRef.current = null;
    accumulatedDeltaRef.current = 0;
    if (pulseOnDragStart) {
      triggerHaptic(type);
      lastTriggerRef.current = Date.now();
    }
  }, [pulseOnDragStart, type]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = axis === 'x'
      ? event.nativeEvent.contentOffset.x
      : event.nativeEvent.contentOffset.y;

    if (lastOffsetRef.current == null) {
      lastOffsetRef.current = offset;
      return;
    }

    const delta = Math.abs(offset - lastOffsetRef.current);
    lastOffsetRef.current = offset;
    if (delta <= 0.1) return;

    accumulatedDeltaRef.current += delta;

    const now = Date.now();
    if (
      accumulatedDeltaRef.current >= stepPx &&
      now - lastTriggerRef.current >= minIntervalMs
    ) {
      lastTriggerRef.current = now;
      accumulatedDeltaRef.current = 0;
      triggerHaptic(type);
    }
  }, [axis, minIntervalMs, stepPx, type]);

  const onScrollEndDrag = useCallback(() => {
    lastOffsetRef.current = null;
    accumulatedDeltaRef.current = 0;
  }, []);

  return {
    onScrollBeginDrag,
    onScroll,
    onScrollEndDrag,
  };
}
