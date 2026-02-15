import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, components } from '../theme/tokens';
import { OfflineBanner } from '../components/OfflineBanner';
import Tabs from './Tabs';
import BarsScreen from '../screens/BarsScreen';
import AccountSetupScreen from '../screens/AccountSetupScreen';
import SpiritsScreen from '../screens/SpiritsScreen';
import EventsScreen from '../screens/EventsScreen';
import GamesScreen from '../screens/GamesScreen';
import BrandScreen from '../screens/BrandScreen';
import BarThemeScreen from '../screens/BarThemeScreen';
import BarDetailsScreen from '../screens/BarDetailsScreen';
import UntitledLoungeScreen from '../screens/bars/UntitledLoungeScreen';
import TheAlchemistScreen from '../screens/bars/TheAlchemistScreen';
import TheVelvetCurtainScreen from '../screens/bars/TheVelvetCurtainScreen';
import TheGildedLilyScreen from '../screens/bars/TheGildedLilyScreen';
import TheIronFlaskScreen from '../screens/bars/TheIronFlaskScreen';
import TheVelvetNoteScreen from '../screens/bars/TheVelvetNoteScreen';
import SkylineLoungeScreen from '../screens/bars/SkylineLoungeScreen';
import TheTikiHutScreen from '../screens/bars/TheTikiHutScreen';
import TheWineCellarScreen from '../screens/bars/TheWineCellarScreen';
import TheHiddenFlaskScreen from '../screens/bars/TheHiddenFlaskScreen';
import KingsCupScreen from '../screens/KingsCupScreen';
import GameDetailsScreen from '../screens/GameDetailsScreen';
import MixologyMasterClassScreen from '../screens/MixologyMasterClassScreen';
import BrandDetailScreen from '../screens/BrandDetailScreen';
import FeaturedSpiritScreen from '../screens/FeaturedSpiritScreen';
import XPTransactionScreen from '../screens/XPTransactionScreen';
import XPReminderScreen from '../screens/XPReminderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import CocktailDetailScreen from '../screens/CocktailDetailScreen';
import CocktailListScreen from '../screens/CocktailListScreen';
import WhatCanIMakeScreen from '../screens/WhatCanIMakeScreen';

import EditProfileScreen from '../screens/EditProfileScreen';
import NonAlcoholicScreen from '../screens/NonAlcoholicScreen';
import VaultScreen from '../screens/vault/VaultScreen';
// Vault screens
import VaultOrderDetailsScreen from '../screens/vault/VaultOrderDetailsScreen';
import VaultOrderHistoryScreen from '../screens/vault/VaultOrderHistoryScreen';
import VaultEarnXPScreen from '../screens/vault/VaultEarnXPScreen';
import VaultCategoryScreen from '../screens/vault/VaultCategoryScreen';
import CategoriesListScreen from '../screens/CategoriesListScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import FeaturedBarsScreen from '../screens/FeaturedBarsScreen';
import MapsDemo from '../screens/MapsDemo';
import CopperMoonScreen from '../screens/CopperMoonScreen';
import NeonNightsScreen from '../screens/NeonNightsScreen';
import WhiskeyDenScreen from '../screens/WhiskeyDenScreen';
import CrystalPalaceScreen from '../screens/CrystalPalaceScreen';
import SunsetTerraceScreen from '../screens/SunsetTerraceScreen';
import MidnightLoungeScreen from '../screens/MidnightLoungeScreen';
import GoldenEraScreen from '../screens/GoldenEraScreen';
// Onboarding screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ConsentScreen from '../screens/onboarding/ConsentScreen';
import SurveyScreen from '../screens/onboarding/SurveyScreen';
import SurveyResultsScreen from '../screens/onboarding/SurveyResultsScreen';
import RefineYourTasteScreen from '../screens/RefineYourTasteScreen';
// Lesson screens
import LessonEngineScreen from '../screens/lessons/LessonEngineScreen';
import LessonSummaryScreen from '../screens/lessons/LessonSummaryScreen';
// Commerce screens
import PricingScreen from '../screens/commerce/PricingScreen';
// Auth screens
import OAuthSignInScreen from '../screens/OAuthSignInScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import RecipeEditorScreen from '../screens/RecipeEditorScreen';
import AIRecipeGeneratorScreen from '../screens/AIRecipeGeneratorScreen';
import CartScreen from '../screens/commerce/CartScreen';
import CheckoutScreen from '../screens/commerce/CheckoutScreen';
import OrderConfirmationScreen from '../screens/commerce/OrderConfirmationScreen';
import OrderHistoryScreen from '../screens/commerce/OrderHistoryScreen';
import AddRecipeScreen from '../screens/AddRecipeScreen';

import AIRecipeFormatScreen from '../screens/AIRecipeFormatScreen';
import OCRCaptureScreen from '../screens/OCRCaptureScreen';
import URLRecipeInputScreen from '../screens/URLRecipeInputScreen';
import VoiceRecipeScreen from '../screens/VoiceRecipeScreen';
import HomeBarScreen from '../screens/HomeBarScreen';
import SpiritRecognitionScreen from '../screens/SpiritRecognitionScreen';
import ShoppingCartScreen from '../screens/ShoppingCartScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SubscriptionDebugScreen from '../screens/SubscriptionDebugScreen';
import PaywallScreen from '../screens/PaywallScreen';
import CustomerCenterScreen from '../screens/CustomerCenterScreen';
import RequirePro from '../components/RequirePro';
import { VaultCategory } from '../config/vaultTypes';

import ProfileSavedItemsScreen from '../screens/ProfileSavedItemsScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import ReferralScreen from '../screens/ReferralScreen';

export type RootStackParamList = {
  Main: undefined;
  Bars: undefined;
  Events: undefined;
  Games: undefined;
  GamesScreen: undefined;
  Brand: { brand: string };
  BarTheme: { theme: string };
  BarDetails: { name: string; subtitle: string; image: string; city?: string; address?: string };
  UntitledLounge: undefined;
  TheAlchemist: undefined;
  TheVelvetCurtain: undefined;
  TheGildedLily: undefined;
  TheIronFlask: undefined;
  TheVelvetNote: undefined;
  SkylineLounge: undefined;
  TheTikiHut: undefined;
  TheWineCellar: undefined;
  TheHiddenFlask: undefined;
  CopperMoon: undefined;
  NeonNights: undefined;
  WhiskeyDen: undefined;
  CrystalPalace: undefined;
  SunsetTerrace: undefined;
  MidnightLounge: undefined;
  GoldenEra: undefined;
  KingsCup: undefined;
  GameDetails: { id: string };
  AccountSetup: undefined;
  XPReminder: undefined;
  MixologyMasterClass: undefined;
  BrandDetail: { brandId: string };
  FeaturedSpirit: { spiritId: string; tier: 'bronze' | 'silver' | 'gold' };
  XPTransaction: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Feedback: undefined;
  CocktailDetail: { cocktailId: string };
  CocktailList: { title: string; cocktailIds: string[]; category: string };
  WhatCanIMake: undefined;

  EditProfile: undefined;
  Profile: undefined;
  OAuthSignIn: undefined;
  NonAlcoholic: undefined;
  Vault: undefined;
  VaultOrderDetails: { orderId: string };
  VaultOrderHistory: undefined;
  VaultEarnXP: undefined;
  VaultCategory: { category: VaultCategory };
  CategoriesList: undefined;
  CategoryDetail: { categoryId: string; categoryName: string };
  FeaturedBar: { barId: string };
  MapsDemo: undefined;
  // Onboarding screens
  Welcome: undefined;
  Consent: undefined;
  Survey: undefined;
  SurveyResults: { answers: any };
  RefineYourTaste: undefined;
  // Commerce screens
  Pricing: undefined;
  Cart: undefined;
  Checkout: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  OrderConfirmation: { orderId: string };
  OrderDetails: { orderId: string };
  OrderHistory: undefined;
  Billing: undefined;
  AddAddress: { addressId?: string };
  AddRecipe: undefined;

  RecipeDetail: { recipe: any };
  RecipeEditor: { recipe: any };
  AIRecipeGenerator: { userInventory: any[]; selectedItems: Set<string> };
  AIRecipeFormat: { recipe?: any; recipeUrl?: string; startWithManual?: boolean };
  OCRCapture: undefined;
  URLRecipeInput: undefined;
  VoiceRecipe: undefined;
  HomeBar: undefined;
  SpiritRecognition: undefined;
  ShoppingCart: undefined;
  Achievements: undefined;
  SubscriptionDebug: undefined;
  Paywall: { offering?: string | null; displayCloseButton?: boolean };
  CustomerCenter: undefined;

  ProfileSavedItems: undefined;
  ManageSubscription: undefined;
  NotificationCenter: undefined;
  Referral: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRouteName?: keyof RootStackParamList;
  onHiddenFlaskComplete?: () => void;
}

export default function RootNavigator({ initialRouteName = 'Main', onHiddenFlaskComplete }: RootNavigatorProps = {}) {
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="Main" component={Tabs} />
      <Stack.Screen name="Bars" component={BarsScreen} options={{ headerShown: true, title: 'Featured Bars' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: true, title: 'Events' }} />
      <Stack.Screen name="Games" component={GamesScreen} options={{ headerShown: true, title: 'Games' }} />
      <Stack.Screen name="Brand" component={BrandScreen} options={({ route }) => ({ headerShown: true, title: route.params.brand })} />
      <Stack.Screen name="BarTheme" component={BarThemeScreen} options={({ route }) => ({ headerShown: true, title: route.params.theme })} />
      <Stack.Screen name="BarDetails" component={BarDetailsScreen} options={({ route }) => ({ headerShown: true, title: route.params.name })} />
      <Stack.Screen name="UntitledLounge" component={UntitledLoungeScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'Untitled Champagne Lounge',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
        headerRight: () => (
          <Pressable hitSlop={12} onPress={() => { /* Save bar functionality will be handled in screen */ }}>
            <Ionicons name="bookmark-outline" size={24} color={colors.headerText} />
          </Pressable>
        ),
      })} />
      <Stack.Screen name="TheAlchemist" component={TheAlchemistScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Alchemist',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheVelvetCurtain" component={TheVelvetCurtainScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Velvet Curtain',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheGildedLily" component={TheGildedLilyScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Gilded Lily',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheIronFlask" component={TheIronFlaskScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Iron Flask',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheVelvetNote" component={TheVelvetNoteScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Velvet Note',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="SkylineLounge" component={SkylineLoungeScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'Skyline Lounge',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheTikiHut" component={TheTikiHutScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Tiki Hut',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheWineCellar" component={TheWineCellarScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: 'The Wine Cellar',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })} />
      <Stack.Screen name="TheHiddenFlask" options={({ navigation }) => ({
        headerShown: true,
        title: 'The Hidden Flask',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
      })}>
        {(props) => <TheHiddenFlaskScreen {...props} onComplete={onHiddenFlaskComplete} />}
      </Stack.Screen>
      <Stack.Screen name="CopperMoon" component={CopperMoonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NeonNights" component={NeonNightsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WhiskeyDen" component={WhiskeyDenScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CrystalPalace" component={CrystalPalaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SunsetTerrace" component={SunsetTerraceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MidnightLounge" component={MidnightLoungeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoldenEra" component={GoldenEraScreen} options={{ headerShown: false }} />
      <Stack.Screen name="KingsCup" component={KingsCupScreen} options={({ navigation }) => ({ 
        headerShown: true, 
        title: "King's Cup",
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
        headerRight: () => (
          <Pressable hitSlop={12} onPress={() => { /* Save game */ }}>
            <Ionicons name="bookmark-outline" size={24} color={colors.headerText} />
          </Pressable>
        ),
      })} />
      <Stack.Screen name="GameDetails" component={GameDetailsScreen} options={({ route, navigation }) => ({ 
        headerShown: true, 
        title: 'Game Details',
        headerStyle: components.header,
        headerTintColor: colors.headerText,
        headerTitleStyle: components.headerText,
        headerShadowVisible: false,
        headerLeft: () => null,
        headerRight: () => (
          <Pressable hitSlop={12} onPress={() => { /* Save game */ }}>
            <Ionicons name="bookmark-outline" size={24} color={colors.headerText} />
          </Pressable>
        ),
      })} />
      <Stack.Screen name="AccountSetup" component={AccountSetupScreen} options={{ headerShown:false }} />
      <Stack.Screen name="XPReminder" component={XPReminderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MixologyMasterClass" component={MixologyMasterClassScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="BrandDetail"
        component={BrandDetailScreen}
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: '#FFFFFF',
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen
        name="FeaturedSpirit"
        component={FeaturedSpiritScreen}
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: '#FFFFFF',
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen name="XPTransaction" component={XPTransactionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: true, title: 'Help & Support' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: 'Privacy Policy' }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: true, title: 'Terms of Service' }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: true, title: 'Feedback' }} />
      <Stack.Screen name="CocktailDetail" component={CocktailDetailScreen} options={{ headerShown: true, title: 'Cocktail' }} />
      <Stack.Screen name="CocktailList" component={CocktailListScreen} options={{ headerShown: true, title: 'Cocktails' }} />
      <Stack.Screen name="WhatCanIMake" component={WhatCanIMakeScreen} options={{ headerShown: false }} />

      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
      <Stack.Screen name="OAuthSignIn" component={OAuthSignInScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NonAlcoholic" component={NonAlcoholicScreen} options={{ headerShown: true, title: 'Non-Alcoholic' }} />
    <Stack.Screen name="Vault" component={VaultScreen} options={{ headerShown: true, title: 'Vault' }} />
    {/* Vault Economy Screens */}
    <Stack.Screen name="VaultOrderDetails" component={VaultOrderDetailsScreen} options={{ headerShown: true, title: 'Order Details' }} />
    <Stack.Screen name="VaultOrderHistory" component={VaultOrderHistoryScreen} options={{ headerShown: true, title: 'Order History' }} />
    <Stack.Screen name="VaultEarnXP" component={VaultEarnXPScreen} options={{ headerShown: true, title: 'Earn XP' }} />
    <Stack.Screen name="VaultCategory" component={VaultCategoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="CategoriesList" component={CategoriesListScreen} options={{ headerShown: true, title: 'Categories' }} />
    <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ headerShown: true, title: 'Category' }} />
    <Stack.Screen name="FeaturedBar" component={FeaturedBarsScreen} options={{ headerShown: true, title: 'Featured Bar' }} />
    <Stack.Screen name="MapsDemo" component={MapsDemo} options={{ headerShown: true, title: 'Maps Demo' }} />
    {/* Onboarding screens */}
    <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Consent" component={ConsentScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Survey" component={SurveyScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SurveyResults" component={SurveyResultsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RefineYourTaste" component={RefineYourTasteScreen} options={{ headerShown: false }} />
    {/* Lesson screens */}
    {/* Commerce screens */}
    <Stack.Screen name="Pricing" component={PricingScreen} options={{ headerShown: true, title: 'Premium' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: true, title: 'Cart' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout' }} />
    <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ headerShown: true, title: 'Order Confirmed' }} />
    <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ headerShown: true, title: 'Order History' }} />
    <Stack.Screen name="AddRecipe" component={AddRecipeScreen} options={{ headerShown: true, title: 'Add Recipe' }} />

    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ headerShown: true, title: 'Recipe' }} />
    <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} options={{ headerShown: false, presentation: 'modal' }} />
    <Stack.Screen name="AIRecipeGenerator" component={AIRecipeGeneratorScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AIRecipeFormat" options={{ headerShown: true, title: 'AI Recipe Formatting' }}>
      {(props) => (
        <RequirePro>
          <AIRecipeFormatScreen {...props} />
        </RequirePro>
      )}
    </Stack.Screen>
    <Stack.Screen name="OCRCapture" component={OCRCaptureScreen} options={{ headerShown: true, title: 'Scan Recipe' }} />
    <Stack.Screen name="URLRecipeInput" component={URLRecipeInputScreen} options={{ headerShown: true, title: 'Add from URL' }} />
    <Stack.Screen name="VoiceRecipe" component={VoiceRecipeScreen} options={{ headerShown: true, title: 'Voice Recipe Input' }} />
    <Stack.Screen name="HomeBar" component={HomeBarScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SpiritRecognition" component={SpiritRecognitionScreen} options={{ headerShown: true, title: 'Scan Spirit' }} />
    <Stack.Screen name="ShoppingCart" component={ShoppingCartScreen} options={{ headerShown: true, title: 'Shopping Cart' }} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: true, title: 'Achievements' }} />
      <Stack.Screen name="SubscriptionDebug" component={SubscriptionDebugScreen} options={{ headerShown: true, title: 'Subscription Debug' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="CustomerCenter" component={CustomerCenterScreen} options={{ headerShown: false, presentation: 'modal' }} />

      <Stack.Screen name="ProfileSavedItems" component={ProfileSavedItemsScreen} options={{ headerShown: true, title: 'My Collection' }} />
      <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} options={{ headerShown: true, title: 'Subscription' }} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, title: 'Invite Friends' }} />
    </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});