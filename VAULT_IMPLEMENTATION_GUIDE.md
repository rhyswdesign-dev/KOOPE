# Vault & XP Ecosystem - Implementation Guide

This guide explains the complete Vault & XP ecosystem implementation for KOOPE.

---

## 📁 File Structure

```
src/
├── config/
│   ├── vaultTypes.ts          # All TypeScript types & interfaces
│   ├── vaultData.ts            # Mock data for all Vault items
│   └── vaultIndex.ts           # Central export file
├── state/
│   └── vaultState.ts           # State management & logic functions
├── components/vault/
│   ├── VaultItemCard.tsx       # Generic card component for Vault items
│   └── VaultKeyInfoModal.tsx   # Modal explaining Vault Keys
└── screens/Vault/
    ├── VaultScreen.tsx         # Main Vault hub (EXISTING - see notes below)
    └── VaultCategoryScreen.tsx # Category view screen (NEW)
```

---

## 🎯 Core Philosophy

### What the Vault IS:
- **Advanced techniques** (Ice Strategy, Acid Control, Batch Math, Speed Systems)
- **Pro variations** (Smoked Old Fashioned, Clarified Whiskey Sour)
- **Bar culture** (Curated profiles of legendary bars)
- **Seasonal drops** (Time-limited bundles)

### What the Vault is NOT:
- NOT base classics (those are in Classic Pool)
- NOT glassware skins or cosmetic items
- NOT simple flavoring changes

### Currency Rules:
- **XP** = earned from lessons & challenges, used to unlock content
- **Vault Keys** = premium currency for instant access / early seasonal drops
- **Tiers** = FREE, PLUS, PRO (control access to certain content)

---

## 🔧 Integration Steps

### Step 1: Add Navigation Types

Add these to your `RootStackParamList` in `src/navigation/RootNavigator.ts`:

```typescript
export type RootStackParamList = {
  // ... existing routes
  Vault: undefined;
  VaultCategory: {
    category: VaultCategory; // Import from vaultTypes
  };
};
```

### Step 2: Add Navigation Routes

In your navigator file (e.g., `src/navigation/RootNavigator.tsx`), add:

```typescript
import { VaultCategory } from '../config/vaultTypes';
import VaultCategoryScreen from '../screens/Vault/VaultCategoryScreen';

// Inside your Stack.Navigator:
<Stack.Screen
  name="VaultCategory"
  component={VaultCategoryScreen}
  options={{ headerShown: false }}
/>
```

### Step 3: Use the Vault State Hook

In any component that needs Vault data:

```typescript
import { useVaultState } from '../state/vaultState';

function MyComponent() {
  const {
    userState,           // Current user XP, keys, tier, owned items
    allItems,            // All vault items
    availableItems,      // Items available to this user (filtered by tier + time)
    unlockWithXP,        // Function to unlock with XP
    unlockWithKey,       // Function to unlock with Key
    getItemsByCategory,  // Get items for specific category
    isOwned,             // Check if item is owned
    canUnlockWithXP,     // Check if can unlock with XP
    canUnlockWithKey,    // Check if can unlock with Key
  } = useVaultState();

  // Example: Unlock an item with XP
  const handleUnlock = (itemId: string) => {
    const result = unlockWithXP(itemId);
    if (result.success) {
      console.log('Unlocked!', result.newState);
    }
  };
}
```

### Step 4: Navigate to Vault Category Screen

From any screen, navigate to a category:

```typescript
import { VaultCategory } from '../config/vaultTypes';

navigation.navigate('VaultCategory', {
  category: 'COCKTAIL_VARIATION' as VaultCategory,
});
```

---

## 📊 Mock Data Overview

### Cocktail Variations (6 items)
- Smoked Old Fashioned (PRO, 2200 XP)
- Spicy Margarita (simple, 600 XP)
- Clarified Whiskey Sour (PRO, 1800 XP)
- Split-Base Negroni (seasonal, 1100 XP)
- Nitro Espresso Martini (PRO, KEY_OR_XP, 2000 XP)
- Honey Ginger Daiquiri (seasonal, limited-time)

### Technique Playbooks (4 items)
- Ice Strategy Playbook (800 XP)
- Acid Control Playbook (650 XP)
- Batch Math Playbook (900 XP, PLUS tier)
- Speed Systems Playbook (1200 XP, PRO tier)

### Bar Features (3 items)
- Attaboy NYC (1500 XP, PLUS tier)
- Employees Only NYC (1400 XP, PLUS tier)
- Bar Raval Toronto (KEY_OR_XP, PRO tier)

### Seasonal Drops (1 item)
- Winter Techniques 2026 (2500 XP, limited-time)

### Vault Key Bundles (2 items)
- Single Vault Key (1 key, $2.99)
- 3-Key Bundle (3 keys, $6.99)

---

## 🎨 UI Components

### VaultItemCard

Generic card component that displays any Vault item with appropriate badges, pricing, and unlock CTAs.

```typescript
<VaultItemCard
  item={vaultItem}
  userState={userVaultState}
  isOwned={isOwned(item.id)}
  canUnlockWithXP={canUnlockWithXP(item)}
  canUnlockWithKey={canUnlockWithKey(item)}
  onUnlockWithXP={() => handleUnlockXP(item)}
  onUnlockWithKey={() => handleUnlockKey(item)}
/>
```

### VaultKeyInfoModal

Educational modal explaining what Vault Keys unlock and how to use them strategically.

```typescript
<VaultKeyInfoModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  currentKeys={userState.vaultKeys}
/>
```

---

## 🔒 Unlock Logic

### XP Unlock Rules
An item can be unlocked with XP if:
1. User doesn't already own it
2. Item's `unlockMethod` supports XP (`XP_ONLY`, `XP_OR_MONEY`, `KEY_OR_XP`)
3. Item has an `xpCost` defined
4. User has enough XP (`userState.xp >= item.xpCost`)

### Key Unlock Rules
An item can be unlocked with a Key if:
1. User doesn't already own it
2. Item's `unlockMethod` supports Keys (`KEY_ONLY`, `KEY_OR_XP`, `KEY_OR_MONEY`)
3. User has at least 1 Vault Key (`userState.vaultKeys >= 1`)

### Tier Requirements
Items with `requiresTier` are filtered based on user's tier:
- FREE tier: Can only access items with no tier requirement
- PLUS tier: Can access FREE + PLUS items
- PRO tier: Can access all items

### Time Availability
Items with `isLimitedTime: true` are filtered by:
- `availableFrom`: Item not shown before this date
- `availableUntil`: Item not shown after this date

---

## 🔄 State Management

### Current Implementation
The `useVaultState` hook uses local React state for testing. In production, you'll want to:

1. **Replace with backend API calls**:
```typescript
// vaultState.ts
const fetchUserVaultState = async (userId: string): Promise<UserVaultState> => {
  const response = await fetch(`/api/vault/user/${userId}`);
  return response.json();
};
```

2. **Persist unlocks to backend**:
```typescript
const unlockWithXP = async (itemId: string) => {
  const response = await fetch(`/api/vault/unlock`, {
    method: 'POST',
    body: JSON.stringify({ itemId, method: 'XP' }),
  });
  return response.json();
};
```

3. **Use async storage for offline support**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('vault_state', JSON.stringify(userState));
```

---

## 🎯 Testing the Implementation

### Test User States

Mock different user states to test all scenarios:

```typescript
// FREE tier, low XP
{
  userId: 'test_free',
  tier: 'FREE',
  xp: 500,
  vaultKeys: 0,
  ownedItemIds: [],
}

// PLUS tier, medium XP
{
  userId: 'test_plus',
  tier: 'PLUS',
  xp: 1800,
  vaultKeys: 2,
  ownedItemIds: ['spicy_margarita'],
}

// PRO tier, high XP
{
  userId: 'test_pro',
  tier: 'PRO',
  xp: 5000,
  vaultKeys: 5,
  ownedItemIds: ['smoked_old_fashioned', 'ice_strategy_playbook'],
}
```

### Test Scenarios

1. **Unlock with XP**:
   - Navigate to COCKTAIL_VARIATION category
   - Find "Spicy Margarita" (600 XP)
   - Click "Unlock with XP"
   - Verify XP deduction and ownership

2. **Unlock with Key**:
   - Find item with `KEY_OR_XP` unlock method
   - Click "Use Key"
   - Verify key deduction and ownership

3. **Tier Restrictions**:
   - Set user to FREE tier
   - Verify PRO-tier items show as locked

4. **Time-Limited Items**:
   - Check that seasonal items only appear during their date range

---

## 🚀 Next Steps

### Phase 1: Core Integration (Current)
- ✅ Types defined
- ✅ Mock data created
- ✅ State management implemented
- ✅ UI components built
- ⏳ Add to navigation
- ⏳ Test all unlock flows

### Phase 2: Backend Integration
- Connect to real user XP system
- Store unlocks in database
- Implement purchase flow for Vault Keys
- Add analytics tracking

### Phase 3: Content Expansion
- Add more cocktail variations
- Create detailed playbook content
- Add bar feature photography
- Design seasonal drop campaigns

### Phase 4: Advanced Features
- XP earning from lessons
- Achievement system
- Friend sharing of unlocks
- PRO-tier early access system

---

## 📝 Notes on Existing VaultScreen

I noticed there's already a `VaultScreen.tsx` in your codebase. To avoid conflicts:

1. **Option A**: Replace the existing VaultScreen with the new implementation
2. **Option B**: Rename the new implementation (e.g., `VaultHubScreen.tsx`)
3. **Option C**: Merge the best parts of both implementations

The existing VaultScreen appears to be connected to:
- `VaultContext`
- `useUser` hook
- `useAICredits`
- Various modals and components

You'll want to decide how to integrate or replace these systems.

---

## 🤝 Support

For questions or issues with the Vault implementation:
1. Check this guide for integration steps
2. Review the inline code comments
3. Test with different user states
4. Verify navigation setup

---

## 📚 Type Reference

### Main Types
- `UserTier`: `"FREE" | "PLUS" | "PRO"`
- `VaultCategory`: 5 categories (see vaultTypes.ts)
- `UnlockMethod`: 5 methods (XP_ONLY, KEY_OR_XP, etc.)
- `VaultItem`: Union type of all item types
- `UserVaultState`: User's current state (XP, keys, tier, owned items)

### Helper Functions
- `getVaultItemsByCategory(items, category)`: Filter by category
- `getAvailableVaultItemsForUser(items, userState, now)`: Filter by tier + time
- `isItemOwned(userState, itemId)`: Check ownership
- `canUnlockWithXP(userState, item)`: Check XP unlock eligibility
- `canUnlockWithKey(userState, item)`: Check Key unlock eligibility
- `unlockItemWithXP(userState, item)`: Pure function to unlock with XP
- `unlockItemWithKey(userState, item)`: Pure function to unlock with Key

---

**Last Updated**: December 2025
**Version**: 1.0
**Status**: Ready for integration
