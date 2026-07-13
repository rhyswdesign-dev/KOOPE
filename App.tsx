import * as React from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform, Keyboard, LayoutAnimation, UIManager } from 'react-native';
import Constants from 'expo-constants';
import RootNavigator from './src/navigation/RootNavigator';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import { useKillSwitch } from './src/hooks/useKillSwitch';
import { colors } from './src/theme/tokens';
import SplashScreen from './src/screens/SplashScreen';
import BartendingWelcomeScreen from './src/screens/BartendingWelcomeScreen';
import OAuthSignInScreen from './src/screens/OAuthSignInScreen';
import XPReminderScreen from './src/screens/XPReminderScreen';
import WelcomeCarouselScreen from './src/screens/WelcomeCarouselScreen';
import SurveyScreen from './src/screens/onboarding/SurveyScreen';
import AgeGateScreen from './src/screens/AgeGateScreen';
import OnboardingQuestionnaireScreen from './src/screens/onboarding/OnboardingQuestionnaireScreen';
import { useSimpleOnboarding as useOnboarding } from './src/hooks/useSimpleOnboarding';
import { UserProvider } from './src/contexts/UserContext';
import { VaultProvider } from './src/contexts/VaultContext';
import { PostsProvider } from './src/contexts/PostsContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ChallengeProvider } from './src/contexts/ChallengeContext';
import { FirebaseProvider } from './src/context/FirebaseContext';
import { AnalyticsProvider } from './src/context/AnalyticsContext';
import { MonetizationProvider } from './src/context/MonetizationContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { isNetworkError } from './src/config/firebase';
import { initializeUserRecipes } from './src/store/useUserRecipes';
import { streakService } from './src/services/streakService';
import { useXPSystem } from './src/store/useXPSystem';
import { useAchievementNotifications } from './src/hooks/useAchievementNotifications';
import AchievementUnlockModal from './src/components/AchievementUnlockModal';
import { initAnalytics } from './src/services/analytics';
import { initAnalytics as initMixpanel } from './src/lib/analytics';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import KeyboardDismissBar from './src/components/KeyboardDismissBar';
import AppAlertRenderer, { installAppAlert } from './src/components/AppAlertRenderer';
import { notificationService } from './src/services/notificationService';
import { setupDeepLinking } from './src/lib/deepLinking';
import { useShareIntent } from 'expo-share-intent';
import type { AgeVerificationPayload } from './src/services/ageVerificationService';
// import { StripeProvider } from './src/providers/StripeProvider'; // Disabled until Xcode is installed

// Override native Alert.alert with branded modals
installAppAlert();

// Override console.error to filter out Firebase offline errors and RevenueCat analytics bugs
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];

  // Filter out Firebase offline/network related errors
  if (
    typeof message === 'string' && (
      message.includes('Failed to get document because the client is offline') ||
      message.includes('Firebase connection failed') ||
      message.includes('FirebaseError: Failed to get document because the client is offline')
    )
  ) {
    // Silently ignore offline errors
    return;
  }

  // Filter out RevenueCat errors (expected in Expo Go - requires dev build for native IAP)
  if (
    typeof message === 'string' && (
      message.includes('[RevenueCat]') ||
      message.includes('Error configuring Purchases') ||
      message.includes('Invalid API key') ||
      message.includes('native store is not available') ||
      message.includes("Cannot read property 'search' of undefined")
    )
  ) {
    // Silently ignore RevenueCat errors in development
    return;
  }

  // Filter out tasteProfile errors (handled gracefully in code)
  if (
    typeof message === 'string' && (
      message.includes("Cannot read property 'tequila' of undefined") ||
      message.includes("Cannot read property 'spiritWeights' of undefined") ||
      message.includes("Cannot read property 'flavorWeights' of undefined")
    )
  ) {
    console.log('[Handled] tasteProfile initialization error - using defaults');
    return;
  }

  // Filter out Expo auto-refresh / disk-space transient errors
  if (
    typeof message === 'string' && (
      message.includes('Auto refresh tick failed') ||
      message.includes('out of space') ||
      message.includes('Failed to write value')
    )
  ) {
    return;
  }

  // Check if it's a Firebase error object
  if (args.length > 0 && isNetworkError(args[0])) {
    return;
  }

  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// KOOPE Dark Theme for React Navigation
const KOOPETheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,        // Amber gold for interactive elements
    background: colors.bg,          // Espresso brown background
    card: colors.card,              // Darker brown for cards/headers
    text: colors.text,              // Soft cream text
    border: colors.line,            // Subtle borders
    notification: colors.accent,    // Amber for notifications
  },
};

const navigationRef = createNavigationContainerRef<any>();
const HTTP_URL_PATTERN = /(https?:\/\/[^\s"'<>]+)/i;

export default function App() {
  const { isEnabled: killSwitchEnabled, config: killSwitchConfig } = useKillSwitch();

  const {
    appState,
    handleSplashFinish,
    completeAgeGate,
    completeBartendingWelcome,
    completeWelcome,
    completeOnboarding,
    completeQuestionnaire,
    completeSurvey,
    skipToXPReminder,
    completeXPReminder,
    goBackToOnboarding,
  } = useOnboarding();
  const { unlockedAchievement, clearUnlockedAchievement } = useAchievementNotifications();
  const deepLinkCleanupRef = React.useRef<null | (() => void)>(null);
  const lastHandledSharedUrlRef = React.useRef<string | null>(null);
  const [pendingSharedRecipeUrl, setPendingSharedRecipeUrl] = React.useState<string | null>(null);
  const [launchSmartScanAfterOnboarding, setLaunchSmartScanAfterOnboarding] = React.useState(false);
  const keyboardAvoidingStyle = React.useMemo(
    () => ({ flex: 1, backgroundColor: colors.bg }),
    []
  );
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

    const ease = LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);
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
    // Initialize analytics with memory sink for development
    initAnalytics({ provider: 'memory' });

    // Initialize Mixpanel for funnel analytics when token is configured
    const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    if (mixpanelToken) {
      initMixpanel(mixpanelToken).catch(() => {});
    }
    notificationService.initialize().catch((error) => {
      console.warn('Notification service initialization failed', error);
    });

    initializeUserRecipes();

    // Record daily activity for streak tracking + award daily login XP
    streakService.recordActivity('app_open').then((result) => {
      if (result.streakIncreased) {
        // First app open of the day — award 10 XP daily login bonus
        useXPSystem.getState().earnXP(10, 'daily-login', 'Daily login bonus');
        console.log(`🔥 Streak increased to ${result.currentStreak} days!`);
        if (result.isNewRecord) {
          console.log(`🎉 New record streak!`);
        }
      }
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

    const incomingUrl =
      shareIntent?.webUrl ||
      extractSharedUrl(shareIntent?.text) ||
      null;

    if (incomingUrl) {
      if (incomingUrl !== lastHandledSharedUrlRef.current) {
        setPendingSharedRecipeUrl(incomingUrl);
      }
    } else {
      console.log('[ShareIntent] Shared payload received without URL. Media-only handling is pending.');
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

  // Show bartending welcome (first step)
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

  // Show bartending welcome (first step)
  if (appState === 'bartending_welcome') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <BartendingWelcomeScreen onComplete={completeBartendingWelcome} />
      </KeyboardAvoidingView>
    );
  }

  // Show welcome carousel
  if (appState === 'welcome') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <WelcomeCarouselScreen onComplete={completeWelcome} />
      </KeyboardAvoidingView>
    );
  }

  // Show OAuth sign-in screen after welcome carousel
  if (appState === 'onboarding') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <OAuthSignInScreen onComplete={completeOnboarding} onSkip={skipToXPReminder} />
      </KeyboardAvoidingView>
    );
  }

  // Show XP reminder after skipping account setup
  if (appState === 'xp_reminder') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <XPReminderScreen onComplete={completeXPReminder} onGoBack={goBackToOnboarding} />
      </KeyboardAvoidingView>
    );
  }

  // Show onboarding questionnaire flow (required + optional + trial + payoff)
  if (appState === 'questionnaire') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <OnboardingQuestionnaireScreen
          onComplete={(action) => {
            if (action === 'scan') {
              setLaunchSmartScanAfterOnboarding(true);
            }
            completeQuestionnaire();
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  // Show survey before main app
  if (appState === 'survey') {
    return (
      <KeyboardAvoidingView
        style={keyboardAvoidingStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <SurveyScreen onComplete={completeSurvey} />
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
      {/* <StripeProvider> Disabled until Xcode is installed */}
        <AnalyticsProvider>
          <AuthProvider>
            <ChallengeProvider>
              <FirebaseProvider>
                <SubscriptionProvider>
                  <MonetizationProvider>
                    <UserProvider>
                      <VaultProvider>
                        <PostsProvider>
                          <NavigationContainer
                            ref={navigationRef}
                            theme={KOOPETheme}
                            onReady={() => {
                              if (!navigationRef.isReady()) return;

                              deepLinkCleanupRef.current?.();
                              deepLinkCleanupRef.current = setupDeepLinking({
                                navigate: (...args: any[]) => navigationRef.navigate(...args as any),
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
                        </PostsProvider>
                      </VaultProvider>
                    </UserProvider>
                  </MonetizationProvider>
                </SubscriptionProvider>
              </FirebaseProvider>
            </ChallengeProvider>
          </AuthProvider>
        </AnalyticsProvider>
      {/* </StripeProvider> */}
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}
