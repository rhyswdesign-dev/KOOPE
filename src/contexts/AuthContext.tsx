import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { log } from '../lib/logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    log.info('AuthContext', 'Setting up auth state listener');

    const unsubscribe = auth.onAuthStateChanged((user) => {
      log.info('AuthContext', 'Auth state changed', { userId: user?.uid || 'No user' });
      setUser(user);
      setIsLoading(false);
    });

    return () => {
      log.info('AuthContext', 'Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};