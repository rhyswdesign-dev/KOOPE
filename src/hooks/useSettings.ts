import { useState } from 'react';

export interface SettingsState {
  showPrizes: boolean;
  notifications: {
    events: boolean;
    marketing: boolean;
    updates: boolean;
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>({
    showPrizes: true,
    notifications: {
      events: true,
      marketing: false,
      updates: true,
    },
  });

  const updateShowPrizes = (value: boolean) => {
    setSettings(prev => ({
      ...prev,
      showPrizes: value,
    }));
  };

  const updateNotifications = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  return {
    settings,
    updateShowPrizes,
    updateNotifications,
  };
}
