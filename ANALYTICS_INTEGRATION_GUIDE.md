# Analytics Integration Guide

This guide shows how to integrate analytics tracking for engagement events (lessons, vault, recipe saves).

## Setup

1. Install Mixpanel SDK:
```bash
npm install mixpanel-react-native
```

2. Get your Mixpanel Project Token from [mixpanel.com](https://mixpanel.com)

3. Initialize analytics in [App.tsx](./App.tsx):
```typescript
import { initAnalytics } from './src/lib/analytics';

// In your App component, before rendering
useEffect(() => {
  initAnalytics('YOUR_MIXPANEL_PROJECT_TOKEN');
}, []);
```

---

## Lessons Tracking

### Import
```typescript
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
```

### When Lesson Starts
Track when a user opens/begins a lesson:

```typescript
// Example: LessonDetailScreen.tsx
useEffect(() => {
  if (lesson) {
    trackEvent(ANALYTICS_EVENTS.LESSON_STARTED, {
      [ANALYTICS_PROPS.LESSON_ID]: lesson.id,
      [ANALYTICS_PROPS.LESSON_TITLE]: lesson.title,
      [ANALYTICS_PROPS.LESSON_CATEGORY]: lesson.category,
    });
  }
}, [lesson]);
```

### When Lesson Completes
Track when a user finishes a lesson:

```typescript
// Example: When user taps "Mark as Complete" button
const handleCompleteLesson = async () => {
  trackEvent(ANALYTICS_EVENTS.LESSON_COMPLETED, {
    [ANALYTICS_PROPS.LESSON_ID]: lesson.id,
    [ANALYTICS_PROPS.LESSON_TITLE]: lesson.title,
    [ANALYTICS_PROPS.LESSON_CATEGORY]: lesson.category,
  });

  // ... rest of your completion logic
};
```

---

## Vault Item Tracking

### When Vault Item Opened
Track when a user opens a vault item:

```typescript
// Example: VaultItemDetailScreen.tsx or when navigating to vault item
const handleOpenVaultItem = (item: VaultItem) => {
  trackEvent(ANALYTICS_EVENTS.VAULT_ITEM_OPENED, {
    [ANALYTICS_PROPS.VAULT_ITEM_ID]: item.id,
    [ANALYTICS_PROPS.VAULT_ITEM_TITLE]: item.title,
    [ANALYTICS_PROPS.VAULT_ITEM_CATEGORY]: item.category,
  });

  navigation.navigate('VaultItemDetail', { itemId: item.id });
};
```

---

## Recipe Save/Unsave Tracking

### When Recipe Saved
Track when a user saves a recipe:

```typescript
// Example: RecipeDetailScreen.tsx or RecipeCard.tsx
const handleSaveRecipe = async (recipe: Recipe) => {
  try {
    // Check if at save limit (for free users)
    if (!isPro && savedRecipeIds.length >= 5) {
      trackEvent(ANALYTICS_EVENTS.RECIPE_SAVE_LIMIT_REACHED, {
        [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length,
        [ANALYTICS_PROPS.SAVE_LIMIT]: 5,
      });

      // Show upgrade prompt
      navigation.navigate('Paywall', { source: 'recipe_save_limit' });
      return;
    }

    // Save recipe
    await saveRecipe(recipe.id);

    trackEvent(ANALYTICS_EVENTS.RECIPE_SAVED, {
      [ANALYTICS_PROPS.RECIPE_ID]: recipe.id,
      [ANALYTICS_PROPS.RECIPE_NAME]: recipe.name,
      [ANALYTICS_PROPS.RECIPE_CATEGORY]: recipe.category,
      [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length + 1,
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
  }
};
```

### When Recipe Unsaved
Track when a user removes a saved recipe:

```typescript
const handleUnsaveRecipe = async (recipe: Recipe) => {
  try {
    await unsaveRecipe(recipe.id);

    trackEvent(ANALYTICS_EVENTS.RECIPE_UNSAVED, {
      [ANALYTICS_PROPS.RECIPE_ID]: recipe.id,
      [ANALYTICS_PROPS.RECIPE_NAME]: recipe.name,
      [ANALYTICS_PROPS.RECIPE_CATEGORY]: recipe.category,
      [ANALYTICS_PROPS.TOTAL_SAVED]: savedRecipeIds.length - 1,
    });
  } catch (error) {
    console.error('Error unsaving recipe:', error);
  }
};
```

---

## Passing `source` Parameter to Paywall

When navigating to the Paywall, always pass a `source` parameter to track where users are coming from:

### From Gating Components
```typescript
// Example: RequirePro.tsx or RequirePrestige.tsx
navigation.navigate('Paywall', { source: 'pro_gate' });
```

### From Home Bar Screen
```typescript
navigation.navigate('Paywall', { source: 'home_bar' });
```

### From Cocktail Detail
```typescript
navigation.navigate('Paywall', { source: 'cocktail_detail' });
```

### From Vault Screen
```typescript
navigation.navigate('Paywall', { source: 'vault_gate' });
```

### From Recipe Save Limit
```typescript
navigation.navigate('Paywall', { source: 'recipe_save_limit' });
```

### From Lessons
```typescript
navigation.navigate('Paywall', { source: 'lessons' });
```

---

## Available Analytics Events

All events are defined in [src/lib/analytics.ts](./src/lib/analytics.ts):

### Onboarding
- `ONBOARDING_STARTED`
- `ONBOARDING_STEP_COMPLETED`
- `ONBOARDING_COMPLETED`

### Paywall & Purchases
- `PAYWALL_VIEWED`
- `PAYWALL_CTA_CLICKED`
- `PURCHASE_STARTED`
- `PURCHASE_COMPLETED`
- `PURCHASE_FAILED`
- `PURCHASE_CANCELLED`
- `RESTORE_PURCHASES_TAPPED`
- `RESTORE_PURCHASES_SUCCESS`
- `RESTORE_PURCHASES_FAILED`

### Engagement
- `LESSON_STARTED`
- `LESSON_COMPLETED`
- `VAULT_ITEM_OPENED`
- `RECIPE_SAVED`
- `RECIPE_UNSAVED`
- `RECIPE_SAVE_LIMIT_REACHED`

---

## Available Analytics Properties

All properties are defined in [src/lib/analytics.ts](./src/lib/analytics.ts):

- `source` - Where the event originated
- `step_number` - Onboarding step number
- `step_name` - Onboarding step name
- `tier` - Subscription tier (pro, prestige)
- `billing_mode` - Billing mode (monthly, yearly)
- `product_id` - Product identifier
- `lesson_id` - Lesson ID
- `lesson_title` - Lesson title
- `lesson_category` - Lesson category
- `vault_item_id` - Vault item ID
- `vault_item_title` - Vault item title
- `vault_item_category` - Vault item category
- `recipe_id` - Recipe ID
- `recipe_name` - Recipe name
- `recipe_category` - Recipe category
- `total_saved` - Total saved recipes
- `save_limit` - Save limit for free users

---

## Testing Analytics

### In Development
Analytics events are logged to the console with `[Analytics]` prefix. Check your terminal/console for:
```
[Analytics] Event tracked: Lesson Started { lesson_id: '...', lesson_title: '...', ... }
[Analytics] User identified: abc123
[Analytics] User properties set: { subscription_tier: 'pro', ... }
```

### In Production
1. Log into Mixpanel dashboard
2. Go to **Events** tab to see all tracked events
3. Go to **Users** tab to see user properties and profiles
4. Create funnels to analyze conversion rates (e.g., Paywall Viewed → Purchase Completed)

---

## Next Steps

1. ✅ Install Mixpanel SDK
2. ✅ Add Mixpanel token to your app
3. ✅ Initialize analytics in App.tsx
4. Add tracking to:
   - [ ] Lesson screens (started, completed)
   - [ ] Vault item screens (opened)
   - [ ] Recipe save/unsave functionality
   - [ ] Update all `navigation.navigate('Paywall')` calls to include `source` parameter

---

## Questions?

- Check [Mixpanel Docs](https://docs.mixpanel.com/docs/tracking/reference/react-native)
- Review [src/lib/analytics.ts](./src/lib/analytics.ts) for all available events and properties
