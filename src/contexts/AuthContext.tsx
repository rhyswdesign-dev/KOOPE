import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Google OAuth configuration - make optional for development
  const googleConfig = {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'placeholder-ios-client-id',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'placeholder-android-client-id',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'placeholder-web-client-id',
  };

  const [_request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  // Listen for auth state changes
  useEffect(() => {
    log.info('AuthContext', 'Setting up auth state listener');
    console.log('🔐 AuthContext: Setting up auth state listener');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      log.info('AuthContext', 'Initial session loaded', { userId: session?.user?.id || 'No user' });
      console.log('🔐 AuthContext: Initial session loaded', {
        hasSession: !!session,
        userId: session?.user?.id || 'No user',
        userEmail: session?.user?.email || 'No email'
      });
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      log.info('AuthContext', 'Auth state changed', {
        event: _event,
        userId: session?.user?.id || 'No user'
      });
      console.log('🔐 AuthContext: Auth state changed!', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id || 'No user',
        userEmail: session?.user?.email || 'No email'
      });
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      log.info('AuthContext', 'Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        signInWithGoogleIdToken(authentication.idToken);
      }
    }
  }, [response]);

  const signInWithGoogleIdToken = async (idToken: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      log.info('AuthContext', 'Google sign-in successful', { userId: data.user?.id });
    } catch (error) {
      log.error('AuthContext', 'Google sign-in failed', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      log.info('AuthContext', 'Apple Sign-In initiated');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;

        log.info('AuthContext', 'Apple sign-in successful', { userId: data.user?.id });
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        log.info('AuthContext', 'Apple sign-in cancelled by user');
        // Re-throw so caller knows sign-in didn't complete
        throw new Error('Sign-in cancelled');
      } else {
        log.error('AuthContext', 'Apple sign-in failed', error);
        throw error;
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      log.info('AuthContext', 'Google Sign-In initiated');
      await promptAsync();
    } catch (error) {
      log.error('AuthContext', 'Google sign-in failed', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      log.info('AuthContext', 'Email Sign-In initiated');
      console.log('📧 Starting Email Sign-In...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      log.info('AuthContext', 'Email sign-in successful', { userId: data.user?.id });
      console.log('✅ Email Sign-In successful!', { userId: data.user?.id });
    } catch (error) {
      log.error('AuthContext', 'Email sign-in failed', error);
      console.log('❌ Email Sign-In failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      log.info('AuthContext', 'Sign out initiated');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      log.info('AuthContext', 'Sign out successful');
    } catch (error) {
      log.error('AuthContext', 'Sign out failed', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signOut,
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