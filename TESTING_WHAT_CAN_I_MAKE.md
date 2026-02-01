# Testing "What Can I Make?" Feature

## Issues Fixed

### 1. ✅ Wrong Navigation
**Problem**: "See What You Can Make" button was navigating to generic Recipes screen
**Fixed**: Now navigates to the new `WhatCanIMakeScreen`
**File**: `src/screens/HomeBarScreen.tsx:620`

### 2. ✅ Ingredient Selection Added
**Problem**: Couldn't select which ingredients to use
**Fixed**: Filter panel added with toggleable ingredient chips
**File**: `src/screens/WhatCanIMakeScreen.tsx`

### 3. ✅ Ingredient Highlighting Added
**Problem**: Recipes didn't show which ingredients you have
**Fixed**: Added checkmarks and highlighting for owned ingredients
**File**: `src/screens/CocktailDetailScreen.tsx:1332-1375`

## How to Test

### Test 1: Navigation
```
1. Go to "Home Bar" screen (your inventory)
2. Tap "See What You Can Make →" button at bottom
3. ✓ Should navigate to "What Can I Make?" screen (NOT Recipes)
```

### Test 2: Ingredient Selection
```
1. In "What Can I Make?" screen
2. Tap the filter button (top right)
3. ✓ Should see horizontal scrolling chips for each inventory item
4. Tap any ingredient chip to toggle it on/off
5. ✓ Results should update immediately
6. Tap "Select All" / "Clear"
7. ✓ All items should select/deselect
```

### Test 3: Ingredient Highlighting in Recipe
```
1. Go to any cocktail detail screen
2. Look at the "Ingredients" section
3. ✓ Should see green checkmarks next to ingredients you have
4. ✓ Should see hollow circles next to missing ingredients
5. ✓ Owned ingredients should be gold color
```

### Test 4: Debug Info (Development Mode Only)
```
1. Open any cocktail detail screen
2. At the top, look for a debug card (only shows in development)
3. ✓ Should show:
   - User: ✓ Signed In (or ✗ Not Signed In)
   - Items in Inventory: X
   - List of your inventory items
4. Check browser console for ingredient matching logs
```

## Troubleshooting

### Problem: No ingredients highlighted
**Possible causes**:
1. Not signed in → Sign in first
2. Empty inventory → Add items via scanning or manual entry
3. Ingredient names don't match → Check debug card

**Check the debug card** (top of cocktail detail screen):
- Shows if you're signed in
- Shows how many items in inventory
- Shows exact names of inventory items

### Problem: Wrong ingredients matched
**Possible causes**:
- Ingredient names are close but not exact
- Need to check fuzzy matching logic

**Example**:
```
Inventory has: "Vodka"
Recipe needs: "Grey Goose Vodka"
Should match: ✓ (fuzzy matching includes partial matches)
```

### Problem: Can't see filter panel
**Steps**:
1. Make sure you're on "What Can I Make?" screen
2. Tap the options icon (top right)
3. Filter panel should slide in below header

## Debug Console Logs

When in development mode, check console for:
```
[CocktailDetail] Checking ingredient: "vodka", userHasIt: true, inventory count: 5
[CocktailDetail] Checking ingredient: "lime juice", userHasIt: false, inventory count: 5
```

This tells you:
- Which ingredient is being checked
- Whether the system thinks you have it
- How many items total in your inventory

## What to Look For

### In "What Can I Make?" Screen:
- [ ] Stats cards show correct counts
- [ ] Cocktails are sorted by match % (100% first)
- [ ] Green badges for 100% match
- [ ] Blue badges for 80%+ match
- [ ] "Missing X ingredients" shown for incomplete matches
- [ ] Filter panel toggles on/off
- [ ] Ingredient chips update results immediately

### In Cocktail Detail Screen:
- [ ] Debug card shows inventory (dev mode only)
- [ ] Green checkmarks next to owned ingredients
- [ ] Hollow circles next to missing ingredients
- [ ] Substitution suggestions shown for missing ingredients
- [ ] Console logs show ingredient matching (dev mode only)

## Next Steps After Testing

1. **If everything works**:
   - Remove debug card from CocktailDetailScreen
   - Remove console.log statements
   - Deploy feature

2. **If ingredients not highlighting**:
   - Check debug card to verify inventory is loading
   - Check console logs to see matching results
   - Verify ingredient names match between database and inventory

3. **If filter not working**:
   - Check that WhatCanIMakeScreen is receiving inventory
   - Verify selectedItems state is updating
   - Check that matchCocktails() is being called

## Remove Debug Code Later

After testing, remove these debug additions:
```typescript
// In CocktailDetailScreen.tsx around line 1252:
// Delete the entire debug card section (lines with "🐛 Debug: Inventory Status")

// In CocktailDetailScreen.tsx around line 1338:
// Delete the console.log lines
```

## Expected Behavior Summary

**Flow**:
```
Home Bar Screen
  ↓ tap "See What You Can Make →"
What Can I Make? Screen
  - Shows sorted cocktails
  - Filter to select ingredients
  - Tap filter button → chips appear
  - Toggle chips → results update
  ↓ tap any cocktail
Cocktail Detail Screen
  - ✓ Checkmarks for owned ingredients
  - ○ Circles for missing ingredients
  - Substitution suggestions shown
```

**Match Percentages**:
- 100% = Green "You can make this!"
- 80-99% = Blue "Missing 1 ingredient"
- <80% = Gray "Missing X ingredients"
