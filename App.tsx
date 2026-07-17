import * as React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { KeyboardAvoidingView, Platform, Keyboard, LayoutAnimation, UIManager } from 'react-native';
import Constants from 'expo-constants';
import RootNavigator from './src/navigation/RootNavigator';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import { useKillSwitch } from './src/hooks/useKillSwitch';
import { colors } from './src/theme/tokens';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeCarouselScreen from './src/screens/WelcomeCarouselScreen';
import AgeGateScreen from './src/screens/AgeGateScreen';
import { useSimpleOnboarding as useOnboarding } from './src/hooks/useSimpleOnboarding';
import { UserProvider } from './src/contexts/UserContext';
import { VaultProvider } from './src/contexts/VaultContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ChallengeProvider } from './src/contexts/ChallengeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { isNetworkError } from './src/lib/networkErrors';
import { initializeUserRecipes } from './src/store/useUserRecipes';
import { streakService } from './src/services/streakService';
import { useXPSystem } from './src/store/useXPSystem';
import { useAchievementNotifications } from './src/hooks/useAchievementNotifications';
import AchievementUnlockModal from './src/components/AchievementUnlockModal';
import { initAnalyticsWithConsent } from './src/lib/analytics';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import KeyboardDismissBar from './src/components/KeyboardDismissBar';
import AppAlertRenderer, { installAppAlert } from './src/components/AppAlertRenderer';
import { notificationService } from './src/services/notificationService';
import { setupDeepLinking } from './src/lib/deepLinking';
import { useShareIntent } from 'expo-share-intent';
import type { AgeVerificationPayload } from './src/services/ageVerificationService';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Override native Alert.alert with branded modals
installAppAlert();

// Override console.error to filter out noisy/expected errors (RevenueCat
// dev-mode warnings, transient Supabase offline errors, etc.)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];

  // Filter out RevenueCat errors (expected in Expo Go - requires dev build for native IAP)
  if (
    typeof message === 'string' &&
    (message.includes('[RevenueCat]') ||
      message.includes('Error configuring Purchases') ||
      message.includes('Invalid API key') ||
      message.includes('native store is not available') ||
      message.includes("Cannot read property 'search' of undefined"))
  ) {
    // Silently ignore RevenueCat errors in development
    return;
  }

  // Filter out tasteProfile errors (handled gracefully in code)
  if (
    typeof message === 'string' &&
    (message.includes("Cannot read property 'tequila' of undefined") ||
      message.includes("Cannot read property 'spiritWeights' of undefined") ||
      message.includes("Cannot read property 'flavorWeights' of undefined"))
  ) {
    console.log('[Handled] tasteProfile initialization error - using defaults');
    return;
  }

  // Filter out Expo auto-refresh / disk-space transient errors
  if (
    typeof message === 'string' &&
    (message.includes('Auto refresh tick failed') ||
      message.includes('out of space') ||
      message.includes('Failed to write value'))
  ) {
    return;
  }

  // Supabase unreachable-backend noise (audit/sprint-1 device-test fix):
  // when the backend is offline or the project URL is unreachable, GoTrue's
  // auto-refresh loop and edge-function calls emit AuthRetryableFetchError /
  // "Network request failed" / FunctionsFetchError repeatedly. These are
  // expected degradation (the app runs signed-out), not bugs — and in dev
  // each one paints a red LogBox error over the app, which reads as a crash.
  // Downgrade to a quiet log so genuine errors stay visible.
  const errorText =
    typeof message === 'string' ? message : `${message?.name ?? ''} ${message?.message ?? ''}`;
  if (
    errorText.includes('AuthRetryableFetchError') ||
    errorText.includes('Network request failed') ||
    errorText.includes('FunctionsFetchError')
  ) {
    console.log('[Handled] Supabase backend unreachable — continuing in offline/signed-out mode');
    return;
  }

  // Check if it's a generic network error object
  if (args.length > 0 && isNetworkError(args[0])) {
    return;
  }

  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// Global safety net for unhandled promise rejections (audit/sprint-1
// device-test fix). React's ErrorBoundary only catches render-phase errors —
// an async supabase/fetch call that rejects with no .catch() bypasses it
// entirely and surfaces as a red screen in dev. Known chains have been given
// explicit .catch() handlers; this tracker is the backstop for any path we
// missed: network-type rejections are logged and swallowed (the app degrades
// gracefully offline), everything else is re-reported so real bugs still show.
const installUnhandledRejectionSafetyNet = () => {
  const hermes = (global as any)?.HermesInternal;
  if (!hermes?.enablePromiseRejectionTracker) return;
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id: number, error: any) => {
      const text = `${error?.name ?? ''} ${error?.message ?? String(error)}`;
      if (
        isNetworkError(error) ||
        text.includes('AuthRetryableFetchError') ||
        text.includes('Network request failed') ||
        text.includes('FunctionsFetchError')
      ) {
        console.log('[Handled] Unhandled network rejection — continuing offline', text.trim());
        return;
      }
      // Non-network rejection: surface it like the default tracker would.
      console.error(`Possible unhandled promise rejection (id: ${id}):`, error);
    },
    onHandled: () => {},
  });
};
installUnhandledRejectionSafetyNet();

// KOOPE Dark Theme for React Navigation
const KOOPETheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent, // Amber gold for interactive elements
    background: colors.bg, // Espresso brown background
    card: colors.card, // Darker brown for cards/headers
    text: colors.text, // Soft cream text
    border: colors.line, // Subtle borders
    notification: colors.accent, // Amber for notifications
  },
};

const navigationRef = createNavigationContainerRef<any>();
const HTTP_URL_PATTERN = /(https?:\/\/[^\s"'<>]+)/i;

export default function App() {
  // SafeAreaProvider must wrap every render branch: the pre-main screens
  // (splash / age gate / welcome) render outside NavigationContainer, and
  // AgeGateScreen's useSafeAreaInsets throws without a provider above it.
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const { isEnabled: killSwitchEnabled, config: killSwitchConfig } = useKillSwitch();

  const { appState, handleSplashFinish, completeAgeGate, completeWelcome } = useOnboarding();
  const { unlockedAchievement, clearUnlockedAchievement } = useAchievementNotifications();
  const deepLinkCleanupRef = React.useRef<null | (() => void)>(null);
  const lastHandledSharedUrlRef = React.useRef<string | null>(null);
  const [pendingSharedRecipeUrl, setPendingSharedRecipeUrl] = React.useState<string | null>(null);
  const [launchSmartScanAfterOnboarding, setLaunchSmartScanAfterOnboarding] = React.useState(false);
  const keyboardAvoidingStyle = React.useMemo(() => ({ flex: 1, backgroundColor: colors.bg }), []);
  const {
    isReady: isShareIntentReady,
    hasShareIntent,
    shareIntent,
    resetShareIntent,
    error: shareIntentError,
  } = useShareIntent({
    debug: __DEV__,
    disabled: Constants.appOwnership === 'expo',
  });

  // Smooth keyboard transitions
  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const ease = LayoutAnimation.create(
      200,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    );
    const onShow = () => LayoutAnimation.configureNext(ease);
    const onHide = () => LayoutAnimation.configureNext(ease);

    const showSub = Keyboard.addListener('keyboardWillShow', onShow);
    const hideSub = Keyboard.addListener('keyboardWillHide', onHide);
    const showSubFallback = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSubFallback = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      showSubFallback.remove();
      hideSubFallback.remove();
    };
  }, []);

  const extractSharedUrl = React.useCallback((text: string | null | undefined): string | null => {
    if (!text) return null;
    const match = text.match(HTTP_URL_PATTERN);
    return match?.[1] || null;
  }, []);

  // Initialize user recipes store and record daily streak on app startup
  React.useEffect(() => {
    // Consent-gated Mixpanel bootstrap: does NOT initialize the SDK (no
    // device ID, no events) until an explicit analytics consent choice
    // is stored. See src/lib/analytics.ts initAnalyticsWithConsent.
    const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    if (mixpanelToken) {
      initAnalyticsWithConsent(mixpanelToken).catch(() => {});
    }
    notificationService.initialize().catch((error) => {
      console.warn('Notification service initialization failed', error);
    });

    initializeUserRecipes();

    // Record daily activity for streak tracking + award daily login XP.
    // .catch() required (audit/sprint-1 device-test fix): this chain runs at
    // startup and previously had no rejection handler — any failure became an
    // unhandled promise rejection instead of a skipped streak tick.
    streakService
      .recordActivity('app_open')
      .then((result) => {
        if (result.streakIncreased) {
          // First app open of the day — award 10 XP daily login bonus
          useXPSystem.getState().earnXP(10, 'daily-login', 'Daily login bonus');
          console.log(`🔥 Streak increased to ${result.currentStreak} days!`);
          if (result.isNewRecord) {
            console.log(`🎉 New record streak!`);
          }
        }
      })
      .catch((error) => {
        console.warn('Streak tracking failed at startup (non-fatal)', error?.message ?? error);
      });
  }, []);

  React.useEffect(() => {
    return () => {
      deepLinkCleanupRef.current?.();
      deepLinkCleanupRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (shareIntentError) {
      console.warn('[ShareIntent] Error reading shared payload', shareIntentError);
    }
  }, [shareIntentError]);

  React.useEffect(() => {
    if (!isShareIntentReady || !hasShareIntent) return;

    const incomingUrl = shareIntent?.webUrl || extractSharedUrl(shareIntent?.text) || null;

    if (incomingUrl) {
      if (incomingUrl !== lastHandledSharedUrlRef.current) {
        setPendingSharedRecipeUrl(incomingUrl);
      }
    } else {
      console.log(
        '[ShareIntent] Shared payload received without URL. Media-only handling is pending.',
      );
    }

    resetShareIntent();
  }, [
    isShareIntentReady,
    hasShareIntent,
    shareIntent?.webUrl,
    shareIntent?.text,
    extractSharedUrl,
    resetShareIntent,
  ]);

  React.useEffect(() => {
    if (appState !== 'main') return;
    if (!pendingSharedRecipeUrl) return;
    if (!navigationRef.isReady()) return;

    lastHandledSharedUrlRef.current = pendingSharedRecipeUrl;
    navigationRef.navigate('Main', {
      screen: 'Camera',
      params: {
        screen: 'RecipeURLImport',
        params: { url: pendingSharedRecipeUrl },
      },
    } as any);
    setPendingSharedRecipeUrl(null);
  }, [appState, pendingSharedRecipeUrl]);

  React.useEffect(() => {
    if (appState !== 'main') return;
    if (!launchSmartScanAfterOnboarding) return;
    if (!navigationRef.isReady()) return;

    navigationRef.navigate('Main', {
      screen: 'Camera',
      params: {
        screen: 'SmartScan',
      },
    } as any);
    setLaunchSmartScanAfterOnboarding(false);
  }, [appState, launchSmartScanAfterOnboarding]);

  console.log('App state:', appState);

  // Kill switch — blocks the entire app regardless of onboarding state.
  if (killSwitchEnabled) {
    return <MaintenanceScreen config={killSwitchConfig} />;
  }

  // Show splash screen
  if (appState === 'loading' || appState === 'splash') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <SplashScreen onFinish={handleSplashFinish} />
      </KeyboardAvoidingView>
    );
  }

  // Age gate — legal access check, the first and only mandatory gate.
  if (appState === 'age_gate') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <AgeGateScreen onVerified={(payload: AgeVerificationPayload) => completeAgeGate(payload)} />
      </KeyboardAvoidingView>
    );
  }

  // Single welcome card (Master Plan Phase 1.4): age gate -> one card -> camera.
  // Completing it finishes onboarding and hands off straight to the camera
  // (SmartScan) via the effect above. Sign-in, questionnaire, and survey are no
  // longer pre-camera gates — the questionnaire runs post-first-value through the
  // RefineYourTaste screen, and sign-in moves to the first save/sync moment.
  if (appState === 'welcome') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <WelcomeCarouselScreen
          onComplete={() => {
            setLaunchSmartScanAfterOnboarding(true);
            completeWelcome();
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  // Show main app
  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <AuthProvider>
          <ChallengeProvider>
            <SubscriptionProvider>
              <UserProvider>
                <VaultProvider>
                  <>
                    <NavigationContainer
                      ref={navigationRef}
                      theme={KOOPETheme}
                      onReady={() => {
                        if (!navigationRef.isReady()) return;

                        deepLinkCleanupRef.current?.();
                        deepLinkCleanupRef.current = setupDeepLinking({
                          navigate: (...args: any[]) => navigationRef.navigate(...(args as any)),
                        });
                      }}
                    >
                      <RootNavigator />
                    </NavigationContainer>

                    {/* Global Achievement Unlock Modal */}
                    <AchievementUnlockModal
                      visible={!!unlockedAchievement}
                      achievement={unlockedAchievement}
                      onClose={clearUnlockedAchievement}
                    />

                    {/* Offline Indicator */}
                    <OfflineBanner />

                    {/* Global Keyboard Dismiss Bar */}
                    <KeyboardDismissBar />

                    {/* Global Branded Alert Renderer */}
                    <AppAlertRenderer />
                  </>
                </VaultProvider>
              </UserProvider>
            </SubscriptionProvider>
          </ChallengeProvider>
        </AuthProvider>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}
