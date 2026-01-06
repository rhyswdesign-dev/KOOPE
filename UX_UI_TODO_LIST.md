# KOOPE - Comprehensive UX/UI Todo List

**App**: KOOPE (formerly HomeGameAdvantage)
**Type**: React Native/Expo Bartending Education App
**Total Issues Identified**: 61
**Date**: 2025-12-31

---

## NAVIGATION & FLOW ISSUES

### Critical Navigation Gaps

**#1 - Missing Events Screen** ⚠️ CRITICAL
- **Issue**: Navigation references 'Events' throughout the app (ExploreScreen, FeaturedScreen, SpiritsScreen) but no EventsScreen.tsx exists
- **Impact**: Users clicking "Events" chips will encounter errors
- **Files**: `ExploreScreen.tsx`, `FeaturedScreen.tsx`, `SpiritsScreen.tsx`
- **Fix**: Create EventsScreen or remove event navigation references

**#2 - Missing Auth Screen** ⚠️ CRITICAL
- **Issue**: ProfileScreen references navigation to 'OAuthSignIn' but screen doesn't exist in navigation stack
- **Impact**: Auth flow may be broken for sign-in
- **Files**: `ProfileScreen.tsx`, `RootNavigator.tsx`
- **Fix**: Add OAuthSignInScreen to navigation stack or update ProfileScreen logic

**#3 - Incomplete Bar/Spirit Details Flow**
- **Issue**: Multiple bar screens have basic structure but minimal content
- **Screens**: CopperMoonScreen, NeonNightsScreen, VelvetLoungeScreen, etc.
- **Fix**: Complete bar detail screens or consolidate into single dynamic screen

**#4 - "Coming Soon" Placeholders**
- GameDetailsScreen - placeholder text
- BrandScreen - "coming soon" message
- BarThemeScreen - "coming soon" message
- CategoryDetailScreen - "Coming Soon" empty state
- Spirit Recognition manual entry - "coming soon" alert
- ShoppingCartScreen sort options - "coming soon"
- **Fix**: Either implement features or remove from UI

---

## DESIGN SYSTEM INCONSISTENCIES

**#5 - Hardcoded Colors Throughout Screens** 🎨 HIGH PRIORITY
- **Issue**: Despite comprehensive design system in `/src/theme/tokens.ts`, many screens use hardcoded hex values
- **Examples**:
  - `#FF6B6B` (red) instead of `colors.error`
  - `#4285F4` (Google blue) in OAuthSignInScreen
  - `rgba()` values scattered throughout
  - Card component uses `#2A2622` instead of `colors.card`
  - Multiple `#FFF`, `#000` instead of `colors.white`
- **Impact**: Breaking design system, harder to maintain, can't theme easily
- **Fix**: Global find/replace hardcoded colors with theme tokens

**#6 - Inconsistent Typography** 🎨
- **Issue**: Many components define custom fontSize/fontWeight instead of using theme
- **Count**: 50+ instances of inline font styling
- **Fix**: Use `textStyles.h1`, `textStyles.body`, etc. from theme tokens

**#7 - Inconsistent Spacing**
- **Issue**: Hardcoded numbers (8, 16, 24) instead of `spacing()` function
- **Fix**: Replace with `spacing.xs`, `spacing.sm`, `spacing.md`, etc.

**#8 - Multiple Pill Button Implementations**
- **Issue**: At least 3 different pill button components
- **Files**:
  - `/components/PillButton.tsx`
  - `/components/ui/PillButton.tsx`
  - `/components/ui/BrandPillButton.tsx`
- **Fix**: Consolidate to single PillButton component with variants

---

## ACCESSIBILITY ISSUES ♿

**#9 - Limited Accessibility Support** ⚠️ CRITICAL
- **Issue**: Only 22 files use accessibility props
- **Missing**:
  - TouchableOpacity/Pressable buttons lack `accessibilityLabel`
  - Images lack `accessibilityLabel` descriptions
  - Complex components lack `accessibilityRole`
  - No screen reader testing evident
- **Fix**: Add accessibility props to all interactive elements (buttons, images, inputs)

**#10 - No Focus Management**
- **Issue**: No visible focus indicators for keyboard navigation
- **Fix**: Add focus styles to all interactive elements

**#11 - Color Contrast Issues**
- **Issue**: `colors.muted` (rgba with 35% opacity) for text may fail WCAG AA
- **Fix**: Audit contrast ratios, ensure minimum 4.5:1 for text

---

## EMPTY STATES & ERROR HANDLING

**#12 - Inconsistent Empty States** 🎨
- **Issue**: Different empty state implementations across screens
- **Examples**:
  - RecipesScreen: Sophisticated EmptyState component
  - SavedItemsScreen: Basic empty state
  - MyRecipesScreen: Custom empty state
- **Fix**: Standardize using single EmptyState component

**#13 - Alert-Heavy Error Handling**
- **Issue**: 25+ `Alert.alert()` calls for errors instead of toast notifications
- **Impact**: Disruptive user experience
- **Fix**: Replace with toast notifications or inline error messages

**#14 - No Offline State Indicators**
- **Issue**: While OfflineIndicator component exists, screens don't handle offline gracefully
- **Fix**: Add offline state handling to all network-dependent screens

---

## LOADING & SKELETON STATES

**#15 - Inconsistent Loading States** 🎨 HIGH PRIORITY
- **Current**:
  - Some screens: ActivityIndicator
  - RecipesScreen: RecipeCardSkeleton
  - CocktailDetailScreen: CocktailDetailSkeleton
  - Many screens: No loading state
- **Fix**: Implement consistent skeleton loaders for all list/detail views

**#16 - No Optimistic UI Updates**
- **Issue**: No optimistic updates for save/favorite actions
- **Impact**: Feels slow/unresponsive
- **Fix**: Add optimistic UI for common actions (like, save, favorite)

---

## ONBOARDING & FIRST-TIME USER EXPERIENCE

**#17 - Complex Onboarding Flow** 🚀 HIGH PRIORITY
- **Issue**: Too many onboarding screens
- **Current Flow**: WelcomeScreen → BartendingWelcomeScreen → WelcomeCarouselScreen → SurveyScreen → ConsentScreen
- **Fix**: Streamline to 3-4 screens maximum, combine redundant screens

**#18 - No Tooltips/Feature Discovery**
- **Issue**: FeatureTooltip component exists but rarely used
- **Missing Explanations**:
  - Vault system
  - XP earning mechanics
  - Lesson hearts system
  - AI features
- **Fix**: Add contextual tooltips for first-time feature encounters

**#19 - Paywall Timing Unclear**
- **Issue**: PaywallScreen exists but trigger timing unclear
- **Impact**: May interrupt user flow poorly
- **Fix**: Define clear paywall trigger points and A/B test timing

---

## CONTENT & VISUAL POLISH

**#20 - Placeholder Images**
- **Issue**: VaultScreen and VaultCategoryScreen use PLACEHOLDER_IMAGES
- **Fix**: Replace with actual images or remove placeholders

**#21 - Inconsistent Card Designs** 🎨
- **Issue**: Multiple card styles throughout app
- **Components**: Card, RecipeCard, AchievementCard, CocktailOfTheMonthCard
- **Fix**: Create unified card system with variants

**#22 - No Image Loading States**
- **Issue**: Images load without placeholders/shimmer effects
- **Fix**: Add loading placeholders for all images

**#23 - Missing Profile Pictures**
- **Issue**: ProfileScreen uses generic cocktail icon instead of user avatars
- **Fix**: Implement avatar system with upload capability

---

## INTERACTION & FEEDBACK

**#24 - Limited Haptic Feedback**
- **Issue**: Only WelcomeScreen implements haptics
- **Missing From**:
  - Button presses
  - Achievement unlocks
  - XP gains
  - Lesson completion
- **Fix**: Add haptics to all major interactions

**#25 - No Micro-interactions**
- **Issue**: Buttons lack hover states, press animations beyond activeOpacity
- **Fix**: Add subtle animations to buttons, cards, and interactive elements

**#26 - Achievement Modal Inconsistency**
- **Issue**: AchievementUnlockModal exists but integration unclear
- **Fix**: Standardize achievement celebrations across app

---

## SCREEN-SPECIFIC ISSUES

### HomeScreen
**#27** - Minimal content (just cocktail of month + demo button)
**#28** - Should showcase personalized content, recommendations

### RecipesScreen
**#29** - Very long file (2000+ lines) - needs component extraction
**#30** - Mood-based categorization confusing without explanation

### LessonsScreen
**#31** - Two different challenge views (ChallengesView, Challenges2View) - unclear which is active
**#32** - Hearts system not explained to users

### VaultScreen
**#33** - XP/Keys economy not clearly explained
**#34** - Placeholder images for all vault items
**#35** - No tutorial for first-time visitors

### ProfileScreen
**#36** - Limited personalization options
**#37** - No profile customization (avatars, themes, preferences)

### SpiritsScreen/BarsScreen
**#38** - Heavy reliance on search/filter modals - could use inline filtering
**#39** - No recently viewed or recommendations sections

---

## FORMS & INPUT

**#40 - Inconsistent Input Styling**
- **Issue**: TextInput components vary across screens
- **Fix**: Create standardized Input component

**#41 - No Input Validation Feedback**
- **Issue**: Forms lack inline validation errors
- **Screens**: EditProfileScreen, ConsentCenterScreen
- **Fix**: Add real-time validation with inline error messages

**#42 - No Auto-save**
- **Issue**: Long forms (AddRecipeScreen) lack auto-save
- **Fix**: Implement draft saving for long forms

**#43 - Keyboard Handling**
- **Issue**: No keyboard avoidance in scrollable forms
- **Fix**: Use KeyboardAvoidingView for all forms

---

## PERFORMANCE & OPTIMIZATION

**#44 - Large Images Not Optimized**
- **Issue**: Using full-size Unsplash URLs without resize parameters
- **Fix**: Add `?w=800&q=60` to image URLs

**#45 - No Image Caching Strategy**
- **Fix**: Configure expo-image caching

**#46 - Heavy Screens Not Code-Split**
- **Issue**: RecipesScreen, FeaturedScreen are 2000+ line files
- **Fix**: Extract components, lazy load where possible

---

## VAULT ECONOMY (Gamification)

**#47 - Confusing XP/Keys System** 🚀 HIGH PRIORITY
- **Issue**: Two currencies without clear explanation
- **Fix**: Add onboarding tutorial explaining economy

**#48 - No Progress Visualization**
- **Issue**: Missing progress bars for vault unlocks
- **Fix**: Add visual progress indicators

**#49 - Unclear Value Proposition**
- **Issue**: What users get for XP vs Keys not obvious
- **Fix**: Show clear benefits/previews of locked content

---

## SEARCH & DISCOVERY

**#50 - Search Not Persistent**
- **Issue**: Search history not saved
- **Fix**: Save recent searches locally

**#51 - No Search Suggestions**
- **Issue**: Search inputs lack autocomplete
- **Fix**: Add search suggestions based on popular searches

**#52 - Filter Complexity**
- **Issue**: FilterModal has many options but no presets
- **Fix**: Add saved filter presets

---

## SETTINGS & PREFERENCES

**#53 - Settings Screen Minimal**
- **Issue**: Limited customization options
- **Fix**: Expand settings (theme, notifications, privacy)

**#54 - No Appearance Settings**
- **Issue**: No dark/light mode toggle (app is dark-only)
- **Fix**: Implement light mode or add theme customization

**#55 - No Notification Preferences**
- **Issue**: Push notification settings missing
- **Fix**: Add notification preferences screen

**#56 - No Language Settings**
- **Issue**: App appears English-only
- **Fix**: Add i18n support for multi-language

---

## BRANDING & POLISH

**#57 - App Name Inconsistency** ⚠️
- **Issue**: Code says "HomeGameAdvantage", docs say "KOOPE"
- **Fix**: Complete rebrand to KOOPE throughout codebase

**#58 - No Launch Screen**
- **Issue**: SplashScreen exists but unclear if proper native splash implemented
- **Fix**: Implement proper native splash screens (iOS/Android)

**#59 - Status Bar Inconsistency**
- **Issue**: Some screens set StatusBar, others don't
- **Fix**: Set StatusBar globally or per-screen consistently

---

## DOCUMENTATION FOR USERS

**#60 - No Help Tooltips**
- **Issue**: Complex features lack contextual help
- **Fix**: Add "?" icons with helpful tooltips

**#61 - No Tutorials**
- **Issue**: First-time flows need guided tutorials
- **Fix**: Implement interactive tutorials for key features

**#62 - HelpSupportScreen Unclear**
- **Issue**: Purpose and implementation unclear
- **Fix**: Create comprehensive help center with FAQs

---

## PRIORITIZATION

### 🔴 P0 (Must Fix - Blocking)
- #1 Missing Events Screen
- #2 Missing Auth Screen
- #5 Hardcoded colors breaking design system
- #9 Accessibility basics

### 🟡 P1 (High Priority - UX Issues)
- #4 "Coming Soon" placeholders
- #12 Empty states standardization
- #15 Loading states consistency
- #17 Onboarding streamlining
- #47 Vault economy explanation

### 🟢 P2 (Medium Priority - Polish)
- #6 Typography consistency
- #13 Error handling improvements
- #21 Card design system
- #26 Achievement celebrations
- #50-52 Search improvements
- #53-56 Settings expansion

### 🔵 P3 (Nice to Have)
- #24 Haptic feedback
- #25 Micro-interactions
- #44 Image optimization
- #42 Auto-save

---

## METRICS TO TRACK

After implementing fixes, measure:
- Time to complete onboarding
- Feature discovery rate
- Error rate reduction
- Accessibility audit score
- User retention (D1, D7, D30)
- NPS score improvement

---

**Next Steps**:
1. Review and prioritize with team
2. Create JIRA/Linear tickets for each item
3. Estimate effort for each priority group
4. Create design mockups for major UX changes
5. Set up analytics to measure impact
