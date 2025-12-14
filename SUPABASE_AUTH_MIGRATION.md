# Supabase Auth Migration Plan

## Overview
Migrate from Firebase Auth (email/password) to Supabase Auth (Apple + Google OAuth only)

## Current State
- ✅ Supabase client configured ([src/lib/supabase.ts](src/lib/supabase.ts))
- ✅ Supabase data layer working (recipes, vault, curriculum)
- ❌ Firebase Auth currently in use
- ❌ Email/password sign-in/sign-up screens active
- ❌ Apple/Google OAuth shows "Coming Soon" placeholders

## Target State
- ✅ Supabase Auth with Apple Sign-In
- ✅ Supabase Auth with Google Sign-In
- ❌ NO email/password authentication
- ✅ Unified auth context using Supabase
- ✅ User profiles stored in Supabase

---

## Migration Steps

### Phase 1: Supabase Auth Setup (Dashboard Configuration)

#### 1.1 Enable Apple OAuth in Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/srbvekhupzoajedpyepr/auth/providers
2. Enable "Apple" provider
3. Configure:
   - **Services ID**: Your Apple Services ID (e.g., `com.homegameadvantage.signin`)
   - **Team ID**: Your Apple Developer Team ID
   - **Key ID**: Your Apple Sign In key ID
   - **Private Key**: Your Apple p8 key content
4. Copy the redirect URL provided (e.g., `https://srbvekhupzoajedpyepr.supabase.co/auth/v1/callback`)
5. Add redirect URL to Apple Developer portal

#### 1.2 Enable Google OAuth in Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/srbvekhupzoajedpyepr/auth/providers
2. Enable "Google" provider
3. Configure:
   - **Client ID**: Your Google OAuth Client ID (for iOS)
   - **Client Secret**: Your Google OAuth Client Secret
4. Copy the redirect URL provided
5. Add redirect URLs to Google Cloud Console

#### 1.3 Create User Profiles Table
Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  provider TEXT, -- 'apple' or 'google'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger to auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### Phase 2: Install Dependencies

```bash
# Install required packages
npm install @supabase/supabase-js
npm install expo-apple-authentication  # For Apple Sign-In
npm install @react-native-google-signin/google-signin  # For Google Sign-In
npm install expo-auth-session  # For OAuth flows
npm install expo-web-browser  # Required for OAuth

# Optional: Remove Firebase dependencies (do this AFTER migration is complete)
# npm uninstall firebase @firebase/auth @firebase/firestore @firebase/functions @firebase/storage
```

---

### Phase 3: Code Implementation

#### 3.1 Update Supabase Client with Auth Storage

**File: [src/lib/supabase.ts](src/lib/supabase.ts)**

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,  // ✅ Persist auth session
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### 3.2 Create Supabase Auth Context

**New File: [src/contexts/SupabaseAuthContext.tsx](src/contexts/SupabaseAuthContext.tsx)**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within SupabaseAuthProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const SupabaseAuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      log.info('SupabaseAuthContext', 'Auth state changed', {
        event: _event,
        userId: session?.user?.id || 'No user'
      });
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      log.info('SupabaseAuthContext', 'Apple credential received', {
        user: credential.user
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          throw error;
        }

        log.info('SupabaseAuthContext', 'Apple sign-in successful', {
          userId: data.user?.id
        });
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        log.info('SupabaseAuthContext', 'Apple sign-in canceled by user');
      } else {
        log.error('SupabaseAuthContext', 'Apple sign-in error', error);
        throw error;
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Configure Google Sign-In
      Google.GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });

      await Google.GoogleSignin.hasPlayServices();
      const userInfo = await Google.GoogleSignin.signIn();

      log.info('SupabaseAuthContext', 'Google credential received', {
        user: userInfo.user.id
      });

      if (userInfo.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.idToken,
        });

        if (error) {
          throw error;
        }

        log.info('SupabaseAuthContext', 'Google sign-in successful', {
          userId: data.user?.id
        });
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      log.error('SupabaseAuthContext', 'Google sign-in error', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      log.info('SupabaseAuthContext', 'User signed out');
    } catch (error) {
      log.error('SupabaseAuthContext', 'Sign out error', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!session,
        signInWithApple,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

#### 3.3 Create New OAuth-Only Sign-In Screen

**New File: [src/screens/OAuthSignInScreen.tsx](src/screens/OAuthSignInScreen.tsx)**

```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { log } from '../lib/logger';
import * as AppleAuthentication from 'expo-apple-authentication';

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OAuthSignInScreen({ onComplete, onSkip }: Props) {
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      log.info('OAuthSignInScreen', 'Apple sign-in completed');
      if (onComplete) onComplete();
    } catch (error: any) {
      log.error('OAuthSignInScreen', 'Apple sign-in failed', error);
      Alert.alert('Sign In Failed', 'Could not sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      log.info('OAuthSignInScreen', 'Google sign-in completed');
      if (onComplete) onComplete();
    } catch (error: any) {
      log.error('OAuthSignInScreen', 'Google sign-in failed', error);
      Alert.alert('Sign In Failed', 'Could not sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Home Game Advantage</Text>
      <Text style={styles.subtitle}>Sign in to access all features</Text>

      <View style={styles.buttonContainer}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={5}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <Ionicons name="logo-google" size={24} color="#fff" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.terms}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  skipButton: {
    padding: 15,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  terms: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
```

---

### Phase 4: Update Existing Files

#### Files to Update:
1. **[App.tsx](App.tsx)** - Replace AuthProvider with SupabaseAuthProvider
2. **[src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)** - Delete or deprecate
3. **[src/screens/SignInScreen.tsx](src/screens/SignInScreen.tsx)** - Delete
4. **[src/screens/SignUpScreen.tsx](src/screens/SignUpScreen.tsx)** - Delete
5. **[src/screens/ForgotPasswordScreen.tsx](src/screens/ForgotPasswordScreen.tsx)** - Delete
6. **[src/lib/auth.ts](src/lib/auth.ts)** - Update to use Supabase
7. All screens/components using `useAuth()` - Update imports

#### Example App.tsx update:
```typescript
// OLD:
import { AuthProvider } from './src/contexts/AuthContext';

// NEW:
import { SupabaseAuthProvider } from './src/contexts/SupabaseAuthContext';

// Inside component:
<SupabaseAuthProvider>
  {/* app content */}
</SupabaseAuthProvider>
```

---

### Phase 5: Environment Variables

Update **.env** file:

```bash
# Supabase Configuration (already exists)
EXPO_PUBLIC_SUPABASE_URL=https://srbvekhupzoajedpyepr.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Apple Sign-In (NEW)
EXPO_PUBLIC_APPLE_SERVICES_ID=com.homegameadvantage.signin
EXPO_PUBLIC_APPLE_TEAM_ID=YOUR_TEAM_ID

# Google Sign-In (NEW)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Firebase (REMOVE AFTER MIGRATION)
# EXPO_PUBLIC_FIREBASE_API_KEY=...
# EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.
```

---

### Phase 6: Apple/Google Configuration

#### Apple Developer Portal Setup:
1. Create App ID with Sign In with Apple capability
2. Create Services ID for web authentication
3. Generate Sign In with Apple key (.p8 file)
4. Add authorized domains and redirect URLs

#### Google Cloud Console Setup:
1. Create OAuth 2.0 Client IDs:
   - iOS client ID
   - Web client ID (for expo)
   - Android client ID (if needed)
2. Add authorized redirect URIs
3. Configure OAuth consent screen

---

### Phase 7: Data Migration

#### User Data Migration Strategy:
- **Option 1**: Fresh start (users sign up again)
- **Option 2**: Migration script (map Firebase UIDs to Supabase)

#### User Profiles Table:
```sql
-- Check existing user profiles
SELECT * FROM user_profiles;

-- Example: Manual user migration (if needed)
INSERT INTO user_profiles (id, email, display_name, provider)
VALUES
  ('uuid-from-supabase', 'user@example.com', 'John Doe', 'apple');
```

---

### Phase 8: Testing Checklist

- [ ] Apple Sign-In works on iOS device
- [ ] Apple Sign-In creates user profile in Supabase
- [ ] Google Sign-In works on iOS/Android
- [ ] Google Sign-In creates user profile
- [ ] Session persists after app restart
- [ ] Sign-out clears session properly
- [ ] Protected routes redirect to sign-in
- [ ] User profile data accessible after auth
- [ ] Auth state changes propagate correctly
- [ ] No Firebase dependencies remain

---

### Phase 9: Cleanup

```bash
# Remove Firebase packages
npm uninstall firebase @firebase/auth @firebase/firestore @firebase/functions @firebase/storage

# Delete unused files
rm src/config/firebase.ts
rm src/screens/SignInScreen.tsx
rm src/screens/SignUpScreen.tsx
rm src/screens/ForgotPasswordScreen.tsx
rm src/contexts/AuthContext.tsx (if not used elsewhere)

# Update imports across codebase
# Search for: import { auth } from '../config/firebase'
# Replace with: import { useAuth } from '../contexts/SupabaseAuthContext'
```

---

## Migration Timeline

### Week 1: Setup & Configuration
- [ ] Configure Apple OAuth in Supabase Dashboard
- [ ] Configure Google OAuth in Supabase Dashboard
- [ ] Create user profiles table
- [ ] Install dependencies

### Week 2: Implementation
- [ ] Create SupabaseAuthContext
- [ ] Create OAuthSignInScreen
- [ ] Update App.tsx provider
- [ ] Test auth flows in development

### Week 3: Migration & Testing
- [ ] Update all screens/components
- [ ] Remove Firebase dependencies
- [ ] End-to-end testing
- [ ] Production deployment

---

## Rollback Plan

If migration fails, you can rollback by:

1. Revert git commits to before migration
2. Re-enable Firebase Auth
3. Keep Supabase for data layer only
4. Fix issues and retry migration

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Apple Sign-In Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google Sign-In Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

## Support

For issues during migration:
- Supabase Discord: https://discord.supabase.com
- Stack Overflow: Tag `supabase` + `react-native`
- Create issue in project repo
