import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LessonBriefPreferencesState {
  seenModuleBriefs: string[];
  seenLessonBriefs: string[];
  alwaysSkipBriefs: boolean;
  markModuleBriefSeen: (moduleId: string) => void;
  markLessonBriefSeen: (lessonId: string) => void;
  setAlwaysSkipBriefs: (value: boolean) => void;
  resetBriefPreferences: () => void;
}

export const useLessonBriefPreferences = create<LessonBriefPreferencesState>()(
  persist(
    (set, get) => ({
      seenModuleBriefs: [],
      seenLessonBriefs: [],
      alwaysSkipBriefs: false,
      markModuleBriefSeen: (moduleId) => {
        const { seenModuleBriefs } = get();
        if (seenModuleBriefs.includes(moduleId)) return;
        set({ seenModuleBriefs: [...seenModuleBriefs, moduleId] });
      },
      markLessonBriefSeen: (lessonId) => {
        const { seenLessonBriefs } = get();
        if (seenLessonBriefs.includes(lessonId)) return;
        set({ seenLessonBriefs: [...seenLessonBriefs, lessonId] });
      },
      setAlwaysSkipBriefs: (value) => set({ alwaysSkipBriefs: value }),
      resetBriefPreferences: () =>
        set({
          seenModuleBriefs: [],
          seenLessonBriefs: [],
          alwaysSkipBriefs: false,
        }),
    }),
    {
      name: 'lesson-brief-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
