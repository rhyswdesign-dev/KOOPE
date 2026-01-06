# Testing Checklist - UX/UI Improvements

## 🎯 Testing Session - January 2026

**Changes Made:**
- Events Screen (new feature)
- Auth Screen integration
- Empty states standardization
- Vault help button
- Settings expansion
- Accessibility improvements
- Design system compliance

---

## ✅ Critical Tests

### 1. Events Screen
**Location:** Navigate to Events from main navigation

- [ ] **FREE tier user**
  - Should see "Events Access Required" empty state
  - "View Plans" button visible
  - No events displayed

- [ ] **KOOPE+ tier user**
  - Should see "Upcoming Events" title
  - Should see "Core Tier Events" subtitle
  - Events list displays with dates/times/locations
  - "Learn More" button on each event works
  - NO "PRO Discount" badge shown

- [ ] **PRO tier user**
  - Should see "PRO Priority Access" subtitle
  - PRO badge at top: "As a PRO member, you get early access..."
  - "PRO Discount" badge on each event card
  - All events display correctly

**Accessibility Test:**
- [ ] VoiceOver (iOS) reads event details correctly
- [ ] TalkBack (Android) announces "Tap to view event details"

---

### 2. Auth/Sign-In Screen
**Location:** Navigate to OAuthSignIn (may need to sign out first)

- [ ] **iOS:**
  - "Continue with Apple" button visible
  - "Continue with Google" button visible
  - Both buttons use theme colors (not black/blue)
  - Buttons have subtle border and shadow

- [ ] **Android:**
  - Only "Continue with Google" button visible
  - Uses theme colors

- [ ] **Loading State:**
  - Tap a button → buttons become 60% opacity
  - Buttons disabled during sign-in

**Accessibility Test:**
- [ ] VoiceOver announces "Sign in to your account using Apple ID"
- [ ] Disabled state announced correctly

---

### 3. Empty States - "Coming Soon" Screens

**GameDetailsScreen:**
- [ ] Navigate to a game → tap for details
- [ ] Shows hourglass icon
- [ ] Title: "Game Details"
- [ ] Message: "Detailed game instructions, rules..."

**BrandScreen:**
- [ ] Tap any brand from spirits
- [ ] Shows brand name as title
- [ ] Message: "Brand stories, featured products..."

**BarThemeScreen:**
- [ ] Tap a bar theme
- [ ] Shows theme name as title
- [ ] Message: "We're curating the perfect collection..."

**All Empty States:**
- [ ] Hourglass icon displayed
- [ ] Centered layout
- [ ] Proper spacing
- [ ] Readable text

---

### 4. Vault Screen - Help Button
**Location:** Navigate to Vault

- [ ] Look for info icon (help-circle-outline) in header
- [ ] Tap the help icon
- [ ] Alert appears: "How the Vault Works"
- [ ] Alert explains:
  - XP (Experience Points) - earn by lessons, use to unlock
  - Keys - premium currency, purchase in store
  - Tip about daily lessons
- [ ] "Got it!" button dismisses alert

**Accessibility Test:**
- [ ] VoiceOver announces "Learn how the Vault economy works"

---

### 5. Settings Screen - Appearance Section
**Location:** Navigate to Settings

- [ ] **New "Appearance" section** visible after Notifications
- [ ] **Theme option:**
  - Icon: moon-outline
  - Title: "Theme"
  - Subtitle: "Dark Mode"
  - Tap → Alert with Dark/Light/Auto options
  - Chevron right arrow visible

- [ ] **Text Size option:**
  - Icon: text-outline
  - Title: "Text Size"
  - Subtitle: "Medium"
  - Tap → Alert with Small/Medium/Large options
  - Chevron right arrow visible

**Accessibility Test:**
- [ ] VoiceOver announces "Change app theme"
- [ ] VoiceOver announces "Adjust text size"

---

### 6. Card Component - Design System
**Location:** Any screen with cards (Vault, Categories, etc.)

- [ ] Cards use consistent background color (dark brown)
- [ ] Cards have consistent border radius (18px)
- [ ] Cards have subtle shadow
- [ ] No bright/harsh colors (no #2A2622 hardcoded)

---

### 7. Shopping Cart - Sort Button
**Location:** Navigate to Shopping Cart

- [ ] "Sort by" button visible in header area
- [ ] Tap "Sort by"
- [ ] Alert shows: "Sort Options"
- [ ] Message: "Sort by: Price, Name, Category, or Recently Added"
- [ ] OK button dismisses

**Accessibility Test:**
- [ ] VoiceOver announces "Sort shopping cart items"

---

### 8. Spirit Recognition - Manual Entry
**Location:** Home Bar → Add Spirit → Manual Entry

- [ ] Tap "Manual Entry" button
- [ ] Alert appears: "Manual Entry"
- [ ] Message explains manual entry feature
- [ ] "Got it" button (not "coming soon")

---

## 🔍 Regression Tests

### Navigation
- [ ] All navigation still works (no crashes)
- [ ] Back buttons work correctly
- [ ] Deep linking still functional

### Existing Features
- [ ] Lessons still load
- [ ] Vault store still works
- [ ] Saved items still save
- [ ] Profile editing still works
- [ ] Search still functions

### Visual
- [ ] No layout breaks on different screen sizes
- [ ] Text is readable on all backgrounds
- [ ] Icons render correctly
- [ ] Images load properly

---

## 🎨 Visual Polish Check

### Colors
- [ ] No bright blue or black out of place
- [ ] Consistent gold accent (#D68A38)
- [ ] Dark theme consistent throughout
- [ ] Text contrast is good (readable)

### Spacing
- [ ] Consistent padding/margins
- [ ] No cramped UI elements
- [ ] No excessive whitespace

### Typography
- [ ] Font sizes feel consistent
- [ ] Font weights appropriate
- [ ] Line heights readable

---

## 📱 Device Testing

### iOS Simulator/Device
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPad (tablet layout)

### Android Emulator/Device
- [ ] Pixel 5 (standard)
- [ ] Galaxy S21 (different aspect ratio)

---

## 🐛 Known Issues to Watch For

1. **Vault Profile Creation:**
   - Check if new users get vault profiles automatically
   - Error: "Failed to get user vault profile" should NOT appear

2. **Git/Keychain:**
   - macOS keychain may still be locked
   - File access errors possible

3. **Expo Server:**
   - If changes don't appear, reload with 'r' key
   - Clear cache if needed: Cmd+D → "Reload"

---

## ✅ Sign-Off

**Tester:** ___________________
**Date:** ___________________
**Build:** ___________________

**Overall Status:**
- [ ] All tests passing - Ready to commit
- [ ] Minor issues found - Fix before commit
- [ ] Major issues found - Do not commit

**Notes:**
_________________________________________
_________________________________________
_________________________________________
