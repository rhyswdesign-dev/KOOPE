import * as React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/tokens';
import SplashScreen from './src/screens/SplashScreen';
import BartendingWelcomeScreen from './src/screens/BartendingWelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import XPReminderScreen from './src/screens/XPReminderScreen';
import WelcomeCarouselScreen from './src/screens/WelcomeCarouselScreen';
import SurveyScreen from './src/screens/onboarding/SurveyScreen';
import { useSimpleOnboarding as useOnboarding } from './src/hooks/useSimpleOnboarding';
import { UserProvider } from './src/contexts/UserContext';
import { VaultProvider } from './src/contexts/VaultContext';
import { PostsProvider } from './src/contexts/PostsContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { FirebaseProvider } from './src/context/FirebaseContext';
import { AnalyticsProvider } from './src/context/AnalyticsContext';
import { MonetizationProvider } from './src/context/MonetizationContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { isNetworkError } from './src/config/firebase';
import { initializeUserRecipes } from './src/store/useUserRecipes';
import { streakService } from './src/services/streakService';
import { useAchievementNotifications } from './src/hooks/useAchievementNotifications';
import AchievementUnlockModal from './src/components/AchievementUnlockModal';
import { initAnalytics } from './src/lib/analytics';

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

  // Filter out RevenueCat analytics bug (known issue with event tracking)
  if (
    typeof message === 'string' && (
      message.includes('[RevenueCat] [Purchases] Error while tracking event') ||
      message.includes("Cannot read property 'search' of undefined")
    )
  ) {
    // Silently ignore RevenueCat analytics errors
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

export default function App() {
  const { appState, handleSplashFinish, completeBartendingWelcome, completeWelcome, completeOnboarding, completeSurvey, skipToXPReminder, completeXPReminder, goBackToOnboarding } = useOnboarding();
  const { unlockedAchievement, clearUnlockedAchievement } = useAchievementNotifications();

  // Initialize user recipes store and record daily streak on app startup
  React.useEffect(() => {
    // Initialize Mixpanel analytics
    initAnalytics('df3cfbf07c1d857a1ff9c78fc44c274a');

    initializeUserRecipes();

    // Record daily activity for streak tracking
    streakService.recordActivity('app_open').then((result) => {
      if (result.streakIncreased) {
        console.log(`🔥 Streak increased to ${result.currentStreak} days!`);
        if (result.isNewRecord) {
          console.log(`🎉 New record streak!`);
        }
      }
    });
  }, []);

  console.log('App state:', appState);

  // Show splash screen
  if (appState === 'loading' || appState === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // Show bartending welcome (first step)
  if (appState === 'bartending_welcome') {
    return <BartendingWelcomeScreen onComplete={completeBartendingWelcome} />;
  }

  // Show welcome carousel
  if (appState === 'welcome') {
    return <WelcomeCarouselScreen onComplete={completeWelcome} />;
  }

  // Show sign-up screen after welcome carousel
  if (appState === 'onboarding') {
    return <AuthScreen onComplete={completeOnboarding} onSkip={skipToXPReminder} />;
  }

  // Show XP reminder after skipping account setup
  if (appState === 'xp_reminder') {
    return <XPReminderScreen onComplete={completeXPReminder} onGoBack={goBackToOnboarding} />;
  }

  // Show survey before main app
  if (appState === 'survey') {
    return <SurveyScreen onComplete={completeSurvey} />;
  }

  // Show main app
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <FirebaseProvider>
          <SubscriptionProvider>
            <MonetizationProvider>
              <UserProvider>
                <VaultProvider>
                  <PostsProvider>
                    <NavigationContainer theme={KOOPETheme}>
                      <RootNavigator />
                    </NavigationContainer>

                    {/* Global Achievement Unlock Modal */}
                    <AchievementUnlockModal
                      visible={!!unlockedAchievement}
                      achievement={unlockedAchievement}
                      onClose={clearUnlockedAchievement}
                    />
                  </PostsProvider>
                </VaultProvider>
              </UserProvider>
            </MonetizationProvider>
          </SubscriptionProvider>
        </FirebaseProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}