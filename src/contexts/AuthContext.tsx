import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { useWishlist } from '../store/useWishlist';

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
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'placeholder-android-client-id',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'placeholder-web-client-id',
  };

  const [_request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  // Listen for auth state changes
  useEffect(() => {
    log.info('AuthContext', 'Setting up auth state listener');
    console.log('🔐 AuthContext: Setting up auth state listener');

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        log.info('AuthContext', 'Initial session loaded', {
          userId: session?.user?.id || 'No user',
        });
        console.log('🔐 AuthContext: Initial session loaded', {
          hasSession: !!session,
          userId: session?.user?.id || 'No user',
          userEmail: session?.user?.email || 'No email',
        });
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        // Degrade to signed-out instead of crashing (audit/sprint-1 device-test
        // fix): when the Supabase backend is unreachable — offline, or the
        // project URL itself is dead — a stored session that needs a token
        // refresh makes getSession() reject with AuthRetryableFetchError. This
        // chain previously had no .catch(), so that rejection went unhandled
        // and surfaced as a crash/red screen on-device instead of a friendly
        // signed-out state. The app works signed-out by design, so that is the
        // safe fallback; onAuthStateChange will restore the session if the
        // backend comes back.
        log.warn('AuthContext', 'Could not load initial session (backend unreachable?)', {
          error: error?.message,
        });
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      log.info('AuthContext', 'Auth state changed', {
        event: _event,
        userId: session?.user?.id || 'No user',
      });
      console.log('🔐 AuthContext: Auth state changed!', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id || 'No user',
        userEmail: session?.user?.email || 'No email',
      });
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      log.info('AuthContext', 'Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  // Pull-and-merge the want-list from Supabase once per signed-in user
  // (migration 035 / wantListService). AsyncStorage stays the source of
  // truth — this only restores items the server has that this device
  // doesn't, and pushes up anything saved while offline or signed out.
  // Best-effort: a failure here must never affect auth state.
  const wantListSyncedForRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id;
    if (!userId || wantListSyncedForRef.current === userId) return;
    wantListSyncedForRef.current = userId;
    useWishlist
      .getState()
      .syncFromServer(userId)
      .catch((error) => {
        log.warn('AuthContext', 'Want-list sync failed (non-fatal)', { error });
      });
  }, [user?.id]);

  // Moved above the "Handle Google OAuth response" effect below (Phase 0.9):
  // that effect's dependency array now references this function, and a
  // `const` declared later in the same scope isn't accessible from an
  // earlier dependency array (temporal dead zone).
  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
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
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        signInWithGoogleIdToken(authentication.idToken);
      }
    }
  }, [response, signInWithGoogleIdToken]);

  const signInWithApple = useCallback(async () => {
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
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      log.info('AuthContext', 'Google Sign-In initiated');
      await promptAsync();
    } catch (error) {
      log.error('AuthContext', 'Google sign-in failed', error);
      throw error;
    }
  }, [promptAsync]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    try {
      log.info('AuthContext', 'Sign out initiated');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      log.info('AuthContext', 'Sign out successful');
    } catch (error) {
      log.error('AuthContext', 'Sign out failed', error);
      throw error;
    }
  }, []);

  // Phase 0.9 guardrail: memoize the context value so consumers don't
  // re-render on every AuthProvider render (e.g. the Google auth response
  // effect above) when nothing they actually read has changed.
  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [user, session, isLoading, signInWithApple, signInWithGoogle, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
