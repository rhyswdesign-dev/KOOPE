# Debugging Ingredient Matching Issue

## What Was Fixed

### 1. Improved Normalization
- Added better whitespace handling (multiple spaces → single space)
- Added "ginger beer" to synonyms list
- More robust case-insensitive matching

### 2. Enhanced Logging
Console now shows:
- ✓ Exact matches: `"Ginger Beer" === "ginger beer"`
- ✓ Partial matches: `"Premium Ginger Beer" includes "ginger beer"`
- ✗ No matches with reason

### 3. Better Debug Card
Shows:
- Each inventory item with exact name and quotes
- Item type (spirit/ingredient)
- Link to console logs

## How to Test Ginger Beer

### Step 1: Check Your Inventory
1. Open any cocktail detail screen
2. Look at the debug card at the top
3. Find your ginger beer entry
4. **Note the EXACT name** (including capitals, spaces)

Example:
```
Your Inventory:
• "Ginger Beer" (type: ingredient)
• "vodka" (type: spirit)
• "lime juice" (type: ingredient)
```

### Step 2: Open Console
Open your browser/debugger console to see matching logs

### Step 3: Check a Recipe with Ginger Beer
1. Find a cocktail that uses ginger beer (Moscow Mule, Dark & Stormy)
2. Scroll to ingredients section
3. Look for console logs like:

**If it's working:**
```
✓ EXACT MATCH: "Ginger Beer" === "ginger beer"
[CocktailDetail] Checking ingredient: "ginger beer", userHasIt: true
```

**If it's NOT working:**
```
✗ NO MATCH for "ginger beer" in inventory of 5 items
[CocktailDetail] Checking ingredient: "ginger beer", userHasIt: false
```

## Common Issues & Fixes

### Issue: Different Capitalization
**Inventory**: "Ginger Beer" (capital G, capital B)
**Recipe**: "ginger beer" (lowercase)
**Status**: ✓ Should work (case-insensitive)

### Issue: Extra Words
**Inventory**: "Premium Ginger Beer"
**Recipe**: "ginger beer"
**Status**: ✓ Should work (partial matching)

### Issue: Hyphenated
**Inventory**: "ginger-beer"
**Recipe**: "ginger beer"
**Status**: ✗ Might not work
**Fix**: Add to synonyms or change inventory name

### Issue: Different Type
**Inventory**: "Ginger Ale"
**Recipe**: "Ginger Beer"
**Status**: ✓ Should work (added to synonyms)

### Issue: Trailing Spaces
**Inventory**: "Ginger Beer " (note trailing space)
**Recipe**: "ginger beer"
**Status**: ✓ Should work (trim added)

### Issue: Multiple Spaces
**Inventory**: "Ginger  Beer" (two spaces)
**Recipe**: "ginger beer"
**Status**: ✓ Should work (space normalization added)

## What to Look For

### In Debug Card:
```
🐛 Debug: Inventory & Matching
User: ✓ Signed In
Items in Inventory: 5
Your Inventory:
• "Ginger Beer" (type: ingredient)    ← Check this exact string
• "Vodka" (type: spirit)
• "Lime Juice" (type: ingredient)
💡 Check console logs for detailed matching
```

### In Console:
```
// When ingredient matching runs:
[CocktailDetail] Checking ingredient: "ginger beer", userHasIt: true, inventory count: 5
✓ EXACT MATCH: "Ginger Beer" === "ginger beer"

// OR if not matching:
[CocktailDetail] Checking ingredient: "ginger beer", userHasIt: false, inventory count: 5
✗ NO MATCH for "ginger beer" in inventory of 5 items
```

### In Recipe Ingredients:
- ✓ Green checkmark = You have it
- ○ Hollow circle = You don't have it

## Test Scenarios

### Scenario 1: Exact Match
```
Inventory: "ginger beer"
Recipe needs: "ginger beer"
Expected: ✓ Match
```

### Scenario 2: Case Difference
```
Inventory: "Ginger Beer"
Recipe needs: "ginger beer"
Expected: ✓ Match (case-insensitive)
```

### Scenario 3: Partial Match
```
Inventory: "Fever-Tree Ginger Beer"
Recipe needs: "ginger beer"
Expected: ✓ Match (partial matching)
```

### Scenario 4: Synonym
```
Inventory: "Ginger Ale"
Recipe needs: "ginger beer"
Expected: ✓ Match (added to synonyms)
```

## Steps to Debug Your Specific Issue

1. **Open a cocktail that needs ginger beer** (e.g., Moscow Mule)

2. **Look at debug card** - what does it show for ginger beer?
   - Is it there?
   - What's the exact spelling?
   - What type is it (spirit or ingredient)?

3. **Check the console** - what matching logs appear?
   - Does it say "✓ EXACT MATCH"?
   - Does it say "✓ PARTIAL MATCH"?
   - Does it say "✗ NO MATCH"?

4. **Look at the ingredient** - does it have a checkmark?
   - ✓ Green = Working!
   - ○ Hollow = Not matching

5. **Share the results**:
   - Debug card text
   - Console log messages
   - Screenshot of ingredient list

## Quick Fixes

### If ginger beer isn't in your inventory:
1. Go to Home Bar screen
2. Tap "+" to add ingredient
3. Type "ginger beer" (lowercase is fine)
4. Save
5. Test again

### If it's there but not matching:
1. Check console logs for the exact error
2. Check debug card for exact spelling
3. Try removing and re-adding with exact name "ginger beer"

### If nothing works:
Check that you're:
1. ✓ Signed in (debug card will show)
2. ✓ Have items in inventory (count > 0)
3. ✓ Looking at the right recipe (one that uses ginger beer)

## Filter Location (Reminder)

The ingredient **filter/toggle** is NOT on the inventory page. It's here:

```
Home Bar (inventory)
  ↓ tap "See What You Can Make →"
What Can I Make? screen
  ↓ tap filter icon (⚙️ top right)
Filter panel appears with ingredient chips
```

The inventory page just shows all items - there's no filter there.
