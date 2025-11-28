# Day 7: Analytics Implementation Summary

## Overview

Implemented comprehensive analytics tracking layer for subscription funnel and engagement metrics using Mixpanel.

---

## What Was Implemented

### 1. Analytics Wrapper Library
**File:** [src/lib/analytics.ts](./src/lib/analytics.ts)

- Created centralized analytics wrapper with Mixpanel integration
- Implemented core functions:
  - `initAnalytics(token)` - Initialize Mixpanel SDK
  - `trackEvent(name, props)` - Track events with properties
  - `setUserId(userId)` - Identify user
  - `setUserProperties(props)` - Set user attributes
  - `resetUser()` - Reset on logout

- Defined event naming conventions:
  - **Onboarding:** Started, Step Completed, Completed
  - **Paywall:** Viewed, CTA Clicked, Purchase Started/Completed/Failed/Cancelled
  - **Purchases:** Restore Tapped/Success/Failed
  - **Engagement:** Lesson Started/Completed, Vault Item Opened, Recipe Saved/Unsaved, Save Limit Reached

- Defined property naming conventions:
  - `source`, `tier`, `billing_mode`, `lesson_id`, `vault_item_id`, `recipe_id`, etc.

### 2. Onboarding Analytics
**File:** [src/hooks/useSimpleOnboarding.ts](./src/hooks/useSimpleOnboarding.ts)

- Tracks `ONBOARDING_STARTED` when new user begins onboarding
- Tracks `ONBOARDING_STEP_COMPLETED` for each step:
  - Step 1: Bartending Welcome
  - Step 2: Welcome Carousel
  - Step 3: Account Setup
- Tracks `ONBOARDING_COMPLETED` when survey finished

### 3. Paywall & Purchase Analytics
**File:** [src/screens/PaywallScreen.tsx](./src/screens/PaywallScreen.tsx)

- **Added `source` parameter** to PaywallScreenProps interface
- Tracks `PAYWALL_VIEWED` on mount with source attribution
- Tracks full purchase funnel:
  1. `PAYWALL_CTA_CLICKED` - When subscribe button tapped
  2. `PURCHASE_STARTED` - Purchase initiated
  3. `PURCHASE_COMPLETED` - Successful purchase (with tier, billing mode, source)
  4. `PURCHASE_FAILED` - Failed purchase (with error details)
  5. `PURCHASE_CANCELLED` - User cancelled
- Tracks restore purchases flow:
  - `RESTORE_PURCHASES_TAPPED`
  - `RESTORE_PURCHASES_SUCCESS` (with had_active_entitlements flag)
  - `RESTORE_PURCHASES_FAILED` (with error)

### 4. User Identity Tracking
**File:** [src/contexts/SubscriptionContext.tsx](./src/contexts/SubscriptionContext.tsx)

- Automatically identifies users with RevenueCat customer ID
- Updates user properties on subscription state changes:
  - `subscription_tier` - 'free', 'plus', 'pro', 'prestige'
  - `subscription_status` - 'active', 'inactive'
  - `customer_id` - RevenueCat original app user ID

### 5. Source Parameter Implementation
**Updated Files:**
- [src/components/RequirePro.tsx](./src/components/RequirePro.tsx) - Source: `pro_gate`
- [src/components/RequirePrestige.tsx](./src/components/RequirePrestige.tsx) - Source: `prestige_gate`

**Remaining Files to Update:**
- `src/screens/CocktailDetailScreen.tsx` - Add source: `cocktail_detail`
- `src/utils/recipeActions.ts` - Add source: `recipe_save_limit`
- `src/screens/vault/components/VaultItemCard.tsx` - Add source: `vault`
- Other navigation points

### 6. Integration Guide
**File:** [ANALYTICS_INTEGRATION_GUIDE.md](./ANALYTICS_INTEGRATION_GUIDE.md)

- Comprehensive guide for implementing engagement tracking
- Code examples for:
  - Lessons (started, completed)
  - Vault items (opened)
  - Recipe saves/unsaves
  - Passing source parameters
- Testing instructions
- Available events and properties reference

---

## What You Need to Install

### 1. Mixpanel SDK
```bash
npm install mixpanel-react-native
```

### 2. Mixpanel Project Token
1. Sign up at [mixpanel.com](https://mixpanel.com)
2. Create a new project
3. Copy the Project Token from Settings → Project Settings

### 3. Initialize in App.tsx
```typescript
import { initAnalytics } from './src/lib/analytics';

// In your App component, before rendering
useEffect(() => {
  initAnalytics('YOUR_MIXPANEL_PROJECT_TOKEN');
}, []);
```

---

## What's Already Working

✅ **Onboarding Funnel Tracking**
- Onboarding Started → Step Completed (x3) → Onboarding Completed

✅ **Purchase Funnel Tracking**
- Paywall Viewed → CTA Clicked → Purchase Started → Purchase Completed/Failed/Cancelled
- Full source attribution (where user came from)

✅ **Restore Purchases Tracking**
- Restore tapped → Success/Failed with details

✅ **User Identity & Properties**
- Automatic user identification via RevenueCat customer ID
- Real-time subscription tier and status updates

✅ **Source Parameter Infrastructure**
- PaywallScreen accepts and tracks source parameter
- Pro and Prestige gates pass source parameters

---

## What Still Needs Implementation

### Engagement Events (Manual Integration Required)

You'll need to add tracking to these features yourself:

#### 1. Lessons
**File:** Your lesson detail/progress screens

```typescript
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';

// When lesson starts
trackEvent(ANALYTICS_EVENTS.LESSON_STARTED, {
  [ANALYTICS_PROPS.LESSON_ID]: lesson.id,
  [ANALYTICS_PROPS.LESSON_TITLE]: lesson.title,
  [ANALYTICS_PROPS.LESSON_CATEGORY]: lesson.category,
});

// When lesson completes
trackEvent(ANALYTICS_EVENTS.LESSON_COMPLETED, {
  [ANALYTICS_PROPS.LESSON_ID]: lesson.id,
  [ANALYTICS_PROPS.LESSON_TITLE]: lesson.title,
  [ANALYTICS_PROPS.LESSON_CATEGORY]: lesson.category,
});
```

#### 2. Vault Items
**File:** Vault item screens

```typescript
// When vault item opened
trackEvent(ANALYTICS_EVENTS.VAULT_ITEM_OPENED, {
  [ANALYTICS_PROPS.VAULT_ITEM_ID]: item.id,
  [ANALYTICS_PROPS.VAULT_ITEM_TITLE]: item.title,
  [ANALYTICS_PROPS.VAULT_ITEM_CATEGORY]: item.category,
});
```

#### 3. Recipe Saves
**File:** Recipe save/unsave functionality

```typescript
// When recipe saved
trackEvent(ANALYTICS_EVENTS.RECIPE_SAVED, {
  [ANALYTICS_PROPS.RECIPE_ID]: recipe.id,
  [ANALYTICS_PROPS.RECIPE_NAME]: recipe.name,
  [ANALYTICS_PROPS.RECIPE_CATEGORY]: recipe.category,
  [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length,
});

// When save limit reached (free users)
trackEvent(ANALYTICS_EVENTS.RECIPE_SAVE_LIMIT_REACHED, {
  [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length,
  [ANALYTICS_PROPS.SAVE_LIMIT]: 5,
});

// When recipe unsaved
trackEvent(ANALYTICS_EVENTS.RECIPE_UNSAVED, {
  [ANALYTICS_PROPS.RECIPE_ID]: recipe.id,
  [ANALYTICS_PROPS.RECIPE_NAME]: recipe.name,
  [ANALYTICS_PROPS.RECIPE_CATEGORY]: recipe.category,
  [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length - 1,
});
```

### Source Parameters

Update remaining Paywall navigation calls to include source:

- [ ] `src/screens/CocktailDetailScreen.tsx` - Add `{ source: 'cocktail_detail' }`
- [ ] `src/utils/recipeActions.ts` - Add `{ source: 'recipe_save_limit' }`
- [ ] `src/screens/vault/components/VaultItemCard.tsx` - Add `{ source: 'vault' }`
- [ ] `src/screens/ProfileScreen.tsx` - Add `{ source: 'profile' }`
- [ ] `src/screens/SettingsScreen.tsx` - Add `{ source: 'settings' }`

---

## Testing

### Development
Analytics events are logged to console:
```
[Analytics] Event tracked: Paywall Viewed { source: 'pro_gate' }
[Analytics] User identified: abc123
[Analytics] User properties set: { subscription_tier: 'pro', ... }
```

### Production
1. Log into Mixpanel dashboard
2. Go to **Events** to see tracked events
3. Go to **Users** to see user profiles and properties
4. Create **Funnels** to analyze conversion:
   - Paywall Viewed → Purchase Started → Purchase Completed
   - Onboarding Started → Onboarding Completed

---

## File Structure

```
src/
  lib/
    analytics.ts              ✅ Analytics wrapper library
  hooks/
    useSimpleOnboarding.ts    ✅ Onboarding tracking integrated
  screens/
    PaywallScreen.tsx         ✅ Paywall & purchase tracking integrated
  contexts/
    SubscriptionContext.tsx   ✅ User identity tracking integrated
  components/
    RequirePro.tsx            ✅ Source parameter added
    RequirePrestige.tsx       ✅ Source parameter added

ANALYTICS_INTEGRATION_GUIDE.md  ✅ Integration documentation
DAY_7_ANALYTICS_SUMMARY.md      ✅ This file
```

---

## Next Steps

1. ✅ Install Mixpanel SDK: `npm install mixpanel-react-native`
2. ✅ Get Mixpanel Project Token from mixpanel.com
3. ✅ Initialize analytics in App.tsx with your token
4. Add engagement tracking:
   - [ ] Lessons (started, completed)
   - [ ] Vault items (opened)
   - [ ] Recipe saves/unsaves
5. Update remaining Paywall navigation calls with source parameters
6. Test in development (check console logs)
7. Deploy and monitor in Mixpanel dashboard

---

## Questions?

- Review [ANALYTICS_INTEGRATION_GUIDE.md](./ANALYTICS_INTEGRATION_GUIDE.md)
- Check [src/lib/analytics.ts](./src/lib/analytics.ts) for all events
- See [Mixpanel React Native Docs](https://docs.mixpanel.com/docs/tracking/reference/react-native)
