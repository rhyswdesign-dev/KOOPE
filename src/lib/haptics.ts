import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

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
