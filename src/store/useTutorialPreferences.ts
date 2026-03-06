import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TutorialPreferencesState {
  showTutorialIcons: boolean;
  setShowTutorialIcons: (value: boolean) => void;
}

export const useTutorialPreferences = create<TutorialPreferencesState>()(
  persist(
    (set) => ({
      showTutorialIcons: true,
      setShowTutorialIcons: (value) => set({ showTutorialIcons: value }),
    }),
    {
      name: 'tutorial-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
