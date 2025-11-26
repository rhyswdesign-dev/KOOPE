import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
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
import { isNetworkError } from './src/config/firebase';
import { initializeUserRecipes } from './src/store/useUserRecipes';
import { streakService } from './src/services/streakService';
import { useAchievementNotifications } from './src/hooks/useAchievementNotifications';
import AchievementUnlockModal from './src/components/AchievementUnlockModal';

// Override console.error to filter out Firebase offline errors
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
  
  // Check if it's a Firebase error object
  if (args.length > 0 && isNetworkError(args[0])) {
    return;
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

export default function App() {
  const { appState, handleSplashFinish, completeBartendingWelcome, completeWelcome, completeOnboarding, completeSurvey, skipToXPReminder, completeXPReminder, goBackToOnboarding } = useOnboarding();
  const { unlockedAchievement, clearUnlockedAchievement } = useAchievementNotifications();

  // Initialize user recipes store and record daily streak on app startup
  React.useEffect(() => {
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
          <MonetizationProvider>
            <UserProvider>
              <VaultProvider>
                <PostsProvider>
                  <NavigationContainer>
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
        </FirebaseProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}