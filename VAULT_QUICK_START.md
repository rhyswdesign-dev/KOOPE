# Vault & XP Ecosystem - Quick Start Guide

Get the Vault system running in your app in 15 minutes.

---

## ⚡ 5-Minute Test (No Navigation)

Test the Vault system without adding navigation:

```typescript
// In any existing screen (e.g., HomeScreen.tsx)
import { useVaultState } from './src/state/vaultState';
import { VaultItemCard } from './src/components/vault/VaultItemCard';

export default function HomeScreen() {
  const {
    userState,
    allItems,
    isOwned,
    canUnlockWithXP,
    canUnlockWithKey,
    unlockWithXP,
    unlockWithKey,
  } = useVaultState();

  // Get first item to test
  const testItem = allItems[0];

  return (
    <View>
      <Text>XP: {userState.xp} | Keys: {userState.vaultKeys}</Text>

      <VaultItemCard
        item={testItem}
        userState={userState}
        isOwned={isOwned(testItem.id)}
        canUnlockWithXP={canUnlockWithXP(testItem)}
        canUnlockWithKey={canUnlockWithKey(testItem)}
        onUnlockWithXP={() => {
          unlockWithXP(testItem.id);
          Alert.alert('Unlocked!');
        }}
        onUnlockWithKey={() => {
          unlockWithKey(testItem.id);
          Alert.alert('Unlocked with Key!');
        }}
      />
    </View>
  );
}
```

✅ You should see:
- XP and Key balance displayed
- A Vault item card
- Unlock buttons (if eligible)

---

## 🚀 15-Minute Full Integration

### Step 1: Update Navigation Types (2 min)

In `src/navigation/RootNavigator.ts`:

```typescript
import { VaultCategory } from '../config/vaultTypes';

export type RootStackParamList = {
  // ... existing routes
  VaultCategory: {
    category: VaultCategory;
  };
};
```

### Step 2: Add Screen to Navigator (3 min)

In your navigator file (e.g., `src/navigation/RootNavigator.tsx`):

```typescript
import VaultCategoryScreen from '../screens/Vault/VaultCategoryScreen';

// Inside Stack.Navigator:
<Stack.Screen
  name="VaultCategory"
  component={VaultCategoryScreen}
  options={{ headerShown: false }}
/>
```

### Step 3: Add Navigation Button (5 min)

In any screen where you want to access the Vault:

```typescript
import { VaultCategory } from '../config/vaultTypes';

<Pressable
  onPress={() =>
    navigation.navigate('VaultCategory', {
      category: 'COCKTAIL_VARIATION' as VaultCategory,
    })
  }
>
  <Text>View Cocktail Variations</Text>
</Pressable>
```

### Step 4: Test It (5 min)

1. Run your app: `npm start`
2. Navigate to the screen with your button
3. Click the button to open the Vault Category screen
4. Try unlocking items with XP
5. Adjust your starting XP in `src/state/vaultState.ts` (line 147) if needed

✅ You should see:
- Category screen with filtered items
- XP/Key balance in header
- Unlock/Locked badges on items
- Working unlock flows

---

## 🎯 Common Scenarios

### Change Starting XP/Keys for Testing

Edit `src/state/vaultState.ts`, line 147:

```typescript
const [userState, setUserState] = useState<UserVaultState>({
  userId: 'mock_user_123',
  tier: 'PRO',        // ← Change tier: FREE, PLUS, or PRO
  xp: 5000,           // ← Change XP amount
  vaultKeys: 10,      // ← Change key count
  ownedItemIds: [],
});
```

### Test Different Categories

```typescript
// Cocktail Variations
navigation.navigate('VaultCategory', { category: 'COCKTAIL_VARIATION' });

// Technique Playbooks
navigation.navigate('VaultCategory', { category: 'TECHNIQUE_PLAYBOOK' });

// Bar Features
navigation.navigate('VaultCategory', { category: 'BAR_FEATURE' });

// Seasonal Drops
navigation.navigate('VaultCategory', { category: 'SEASONAL_DROP' });

// Vault Keys
navigation.navigate('VaultCategory', { category: 'VAULT_KEY_BUNDLE' });
```

### Add XP Display to Header

```typescript
import { useVaultState } from '../state/vaultState';

export function AppHeader() {
  const { userState } = useVaultState();

  return (
    <View style={{ flexDirection: 'row' }}>
      <Text>⚡ {userState.xp} XP</Text>
      <Text>🔑 {userState.vaultKeys}</Text>
    </View>
  );
}
```

---

## 🐛 Troubleshooting

### "Cannot find module 'vaultTypes'"
- ✅ Check import path: `import { VaultCategory } from '../config/vaultTypes'`
- ✅ Adjust `..` based on your file location

### "Navigation.navigate is not a function"
- ✅ Ensure you're using React Navigation
- ✅ Import: `import { useNavigation } from '@react-navigation/native'`

### "Items not showing"
- ✅ Check your user tier - FREE users can't see PRO items
- ✅ Check date ranges - seasonal items may not be available
- ✅ Check filters - toggle "Locked" filter on

### "XP/Keys not changing after unlock"
- ✅ This is expected - state is local for testing
- ✅ In production, persist to backend after unlock
- ✅ Refresh app to reset to initial state

---

## 📊 Test Checklist

Use this checklist to verify everything works:

- [ ] Can see Vault items in category screen
- [ ] XP balance displays correctly
- [ ] Key balance displays correctly
- [ ] Can unlock item with XP (if enough XP)
- [ ] XP decreases after unlock
- [ ] Item shows "Unlocked" badge after unlock
- [ ] Can't unlock same item twice
- [ ] Can unlock item with Key (if have keys)
- [ ] Keys decrease after unlock
- [ ] Tier restrictions work (FREE can't unlock PRO items)
- [ ] Filters work (Show Owned / Show Locked)
- [ ] Empty state shows when no items match
- [ ] Back button navigates correctly

---

## 🎓 Next Steps

Once basic integration works:

1. **Connect to Your User System**
   - See `VAULT_EXAMPLE_USAGE.tsx` example 10
   - Sync `tier`, `xp`, `vaultKeys`, `ownedItemIds` with your user state

2. **Add Backend Persistence**
   - Replace `unlockWithXP` with API call
   - Save unlock to database
   - Fetch owned items on app load

3. **Implement XP Earning**
   - Award XP after lesson completion
   - Award XP after challenge completion
   - Update XP balance in real-time

4. **Add Purchase Flow for Keys**
   - Integrate with payment provider (Stripe, Apple Pay, etc.)
   - Update key balance after purchase
   - Store purchase receipt

---

## 📚 Documentation Files

- `VAULT_SUMMARY.md` - What was built and why
- `VAULT_IMPLEMENTATION_GUIDE.md` - Complete integration guide
- `VAULT_EXAMPLE_USAGE.tsx` - 10 code examples
- `VAULT_QUICK_START.md` - This file

---

## 💬 Questions?

Common questions answered in the full guide:

- "How do I change the mock data?" → Edit `src/config/vaultData.ts`
- "How do I add a new category?" → See vaultTypes.ts + update metadata
- "How do I add new items?" → Add to arrays in vaultData.ts
- "How do I integrate with backend?" → See Phase 2 in implementation guide
- "How do I award XP?" → See example 6 in usage file

---

**Ready to build? Start with the 5-minute test above! 🚀**
