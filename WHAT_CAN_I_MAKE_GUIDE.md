# "What Can I Make?" Feature Guide

## Overview
The "What Can I Make?" feature allows users to:
- See all cocktails they can make with their current inventory
- Filter which ingredients to use for the search
- View match percentages for each recipe
- Discover new cocktails they're "almost" able to make (80%+ match)

## How It Works

### 1. **User Journey**
```
Scan ingredients/bottles
    ↓
Build inventory
    ↓
Tap "What Can I Make?"
    ↓
See sorted list of cocktails by match %
    ↓
(Optional) Filter which ingredients to use
    ↓
Tap on a cocktail to view details
```

### 2. **Smart Matching**
The system calculates match percentages based on:
- **100% Match** = User has ALL ingredients ("You can make this!")
- **80-99% Match** = User is missing 1-2 ingredients ("Almost there!")
- **< 80% Match** = Still shown but lower in the list

### 3. **Ingredient Selection**
Users can customize their search by:
- **Select All** - Use entire inventory
- **Deselect** - Exclude ingredients they don't want to use
- **Filter on-the-fly** - Results update immediately

## Features

### Main Screen Components

1. **Header**
   - Shows selected ingredient count
   - Filter button to toggle ingredient selection

2. **Filter Panel** (toggleable)
   - Horizontal scrolling chips for each inventory item
   - Checkmark indicates selected
   - "Select All" / "Clear" quick actions

3. **Stats Cards**
   - **Can Make**: Recipes with 100% match
   - **Almost There**: Recipes with 80-99% match
   - **Total Recipes**: All recipes found

4. **Cocktail Cards**
   - Match percentage badge (color-coded)
   - Status message ("You can make this!" or "Missing X ingredients")
   - Ingredients summary (Have: X / Y)

### Example Use Cases

**Scenario 1: See everything I can make**
```
User inventory: vodka, lime juice, simple syrup, cranberry juice
Results shown:
- Cosmopolitan (100%) - "You can make this!"
- Moscow Mule (75%) - "Missing 1 ingredient: ginger beer"
- Vodka Martini (100%) - "You can make this!"
```

**Scenario 2: Using specific ingredients**
```
User selects only: bourbon, lemon juice
Results shown:
- Whiskey Sour (100%) - "You can make this!"
- Old Fashioned (67%) - "Missing 2 ingredients"
```

**Scenario 3: Discovering new recipes**
```
User has 5 ingredients
System shows: "You can make 3 cocktails!"
             "Almost there: 7 more cocktails"
Encourages: "Add gin to make 5 more cocktails"
```

## How to Access

The screen is accessible via:
```typescript
navigation.navigate('WhatCanIMake')
```

### Recommended Placement Options:

1. **Top of Recipes Screen** (Hero Card)
   - Most prominent
   - Shows feature to all users browsing recipes
   - See `EXAMPLE_WHAT_CAN_I_MAKE_BUTTON.tsx` for code

2. **Floating Action Button**
   - Always accessible
   - Doesn't take up screen space
   - Good for frequent users

3. **Quick Actions Grid**
   - Alongside other discovery features
   - Can show count: "12 cocktails you can make"

4. **Tab Navigation**
   - Dedicated tab in bottom navigation
   - Makes it a primary feature

## Technical Details

### Files Created
- `/src/screens/WhatCanIMakeScreen.tsx` - Main screen
- `/src/utils/recipeMatching.ts` - Matching algorithm
- `EXAMPLE_WHAT_CAN_I_MAKE_BUTTON.tsx` - Button components

### Navigation
Added to `RootStackParamList`:
```typescript
WhatCanIMake: undefined;
```

### Dependencies
- User must be signed in
- User must have items in inventory
- Requires Supabase cocktails table

## Testing the Feature

### Test Scenario 1: Empty Inventory
```
1. Sign in
2. Navigate to "What Can I Make?"
Expected: "No Inventory Yet" message with "Start Scanning" button
```

### Test Scenario 2: With Inventory
```
1. Sign in
2. Scan/add 3-5 ingredients to inventory
3. Navigate to "What Can I Make?"
Expected:
- See stats: "X can make, Y almost there"
- See cocktail list sorted by match %
- Can tap cocktails to view details
```

### Test Scenario 3: Filtering
```
1. In "What Can I Make?" screen
2. Tap filter button
3. Deselect some ingredients
Expected:
- Filter panel appears
- Cocktail list updates immediately
- Stats update to reflect filtered results
```

### Test Scenario 4: Match Percentages
```
Given inventory: vodka, lime, simple syrup
Expected results:
- Vodka Soda (100%) - if ingredients match
- Cosmopolitan (80%) - missing triple sec
- Moscow Mule (67%) - missing ginger beer + mint
```

## User Benefits

### For Free Users
- Discover recipes with what they have
- See what 1-2 ingredients they're missing
- Drive purchases ("Missing: Cointreau - $19.99")

### For Paid Users
- Same benefits
- Can opt-out of data sharing
- No scan limits

### For Brands (Your Data)
- See which ingredients drive cocktail discovery
- Understand "missing ingredient" patterns
- Optimize recommendations based on user inventory

## Future Enhancements

Potential additions:
1. **Shopping List**: "Buy these 2 items to make 5 more cocktails"
2. **Difficulty Filter**: Only show "Easy" cocktails
3. **Time Filter**: Recipes under 5 minutes
4. **Social**: Share "I can make 15 cocktails!" to social media
5. **Challenges**: "Make 10 different cocktails this month"
6. **Inventory Suggestions**: "Add gin to unlock 12 new recipes"

## Questions to Consider

1. **Should users be able to select what items they want to use?**
   ✅ **Yes - Already Implemented!**
   - Users can toggle ingredients on/off
   - Helps them experiment: "What if I only use whiskey?"
   - Useful for theme nights: "Only tequila cocktails"

2. **Should we show all matches or just high matches?**
   - Currently: Shows ALL, sorted by match %
   - Alternative: Filter to only 50%+ matches
   - Recommendation: Keep showing all, let users decide

3. **Should we limit results?**
   - Currently: Shows up to 100 cocktails
   - Could paginate or lazy load
   - For MVP: 100 is fine

4. **How to handle zero results?**
   - Currently: Shows empty state with suggestions
   - Could suggest: "Add X ingredient to make Y cocktails"
   - Could show: "Similar recipes you're close to"

## Example Flow Diagram

```
┌─────────────────┐
│  User Inventory │
│  - Vodka        │
│  - Lime         │
│  - Syrup        │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  What Can I Make?       │
│  ┌───────────────────┐  │
│  │ 🎯 Can Make: 3    │  │
│  │ 📍 Almost: 7      │  │
│  │ 📚 Total: 45      │  │
│  └───────────────────┘  │
└────────┬────────────────┘
         │
         ↓
┌───────────────────────────┐
│  Cosmopolitan         100%│
│  ✓ You can make this!     │
│  Have: 3/3                │
├───────────────────────────┤
│  Moscow Mule           75%│
│  ℹ Missing: ginger beer   │
│  Have: 3/4                │
├───────────────────────────┤
│  Vodka Martini        100%│
│  ✓ You can make this!     │
│  Have: 2/2                │
└───────────────────────────┘
```

## Answering Your Question

**"Should users be able to select what items they want to use?"**

✅ **YES - and they can!**

The feature includes an optional filter panel where users can:
- Select/deselect specific ingredients
- See results update in real-time
- Experiment with different combinations
- Filter by what they're "in the mood for"

**Example use cases:**
- "Only show bourbon cocktails" (deselect other spirits)
- "I don't want to use my premium tequila" (deselect it)
- "What can I make with JUST these 3 items?" (select only those)

This gives users control while maintaining the "magic" of auto-discovery!
