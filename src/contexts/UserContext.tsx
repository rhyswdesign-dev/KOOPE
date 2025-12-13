import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

interface UserState {
  xp: number;
  level: number;
  streak: number;
  badges: number;
}

interface UserContextType {
  user: UserState;
  addXP: (amount: number) => void;
  updateStreak: () => void;
  getUserLevel: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'userState';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState>({
    xp: 950, // Starting XP from our vault screen
    level: 5,
    streak: 3,
    badges: 4,
  });

  // Load user data from storage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
      }
    } catch (error) {
      log.error('UserContext', 'Error loading user data', error);
    }
  };

  const saveUserData = async (newUserData: UserState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUserData));
    } catch (error) {
      log.error('UserContext', 'Error saving user data', error);
    }
  };

  const addXP = (amount: number) => {
    setUser(prev => {
      const newXP = prev.xp + amount;
      const newLevel = getUserLevel(newXP);
      const updated = { ...prev, xp: newXP, level: newLevel };
      saveUserData(updated);
      return updated;
    });
  };

  const updateStreak = () => {
    setUser(prev => {
      const updated = { ...prev, streak: prev.streak + 1 };
      saveUserData(updated);
      return updated;
    });
  };

  const getUserLevel = (xp?: number) => {
    const currentXP = xp || user.xp;
    // Simple level calculation: every 500 XP = 1 level
    return Math.floor(currentXP / 500) + 1;
  };

  return (
    <UserContext.Provider value={{
      user,
      addXP,
      updateStreak,
      getUserLevel,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}