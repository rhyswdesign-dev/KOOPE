/**
 * USE ACHIEVEMENT NOTIFICATIONS HOOK
 * Listens for achievement unlocks and shows toast notifications
 */

import { useEffect, useState } from 'react';
import { achievementService, Achievement } from '../services/achievementService';
import { useToast } from './useToast';

/**
 * Hook to listen for achievement unlocks and show toasts
 * Also returns the latest unlocked achievement for modal display
 *
 * @example
 * ```tsx
 * const { unlockedAchievement, clearUnlockedAchievement } = useAchievementNotifications();
 *
 * <AchievementUnlockModal
 *   visible={!!unlockedAchievement}
 *   achievement={unlockedAchievement}
 *   onClose={clearUnlockedAchievement}
 * />
 * ```
 */
export function useAchievementNotifications() {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Subscribe to achievement unlocks
    const unsubscribe = achievementService.addAchievementListener((achievement) => {
      // Show toast notification
      showToast(`🏆 ${achievement.title} unlocked! +${achievement.xpReward} XP`, 'success');

      // Set for modal display
      setUnlockedAchievement(achievement);

      // Auto-clear after modal auto-closes (4 seconds)
      setTimeout(() => {
        setUnlockedAchievement(null);
      }, 4000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const clearUnlockedAchievement = () => {
    setUnlockedAchievement(null);
  };

  return {
    unlockedAchievement,
    clearUnlockedAchievement,
  };
}
