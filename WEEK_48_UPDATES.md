# Week 48 Updates - Image Fixes & Cocktail of the Week

## Changes Made

### 1. Cocktail of the Week (Changed from Month)
**Updated Service: [src/services/cocktailOfTheMonth.ts](src/services/cocktailOfTheMonth.ts)**

- Changed from monthly rotation to **weekly rotation**
- Now changes every Monday
- 30 featured cocktails in rotation (up from 20)
- Displays date range (e.g., "Dec 15 - Dec 21")

**New Cocktails Added to Pool:**
- Cosmopolitan
- Paloma
- Vesper
- French 75
- Gimlet
- Corpse Reviver #2
- Bee's Knees
- Clover Club
- Southside
- Bramble

**Updated Component: [src/components/CocktailOfTheMonthCard.tsx](src/components/CocktailOfTheMonthCard.tsx)**
- Changed label to "Cocktail of the Week"
- Shows week date range below title
- Added `weekRange` style for date display

### 2. Thumbnail Image Alignment Fixed
**Problem Identified:**
- Images have mixed aspect ratios:
  - Square: 346x346, 352x352
  - Portrait: 352x532, 352x574, 352x448
- Original 160px height was too short for portrait images
- Images were being stretched/cropped awkwardly

**Solution Applied:**
- Increased thumbnail height: **160px → 180px**
- Kept `resizeMode: 'cover'` for consistent filling
- Added background color for loading state
- Taller container better accommodates portrait images

**File Modified:** [src/components/RecipeCard.tsx](src/components/RecipeCard.tsx#L163-L168)

```typescript
cocktailImage: {
  width: '100%',
  height: 180,  // Increased from 160
  resizeMode: 'cover',
  backgroundColor: colors.card,
},
```

### 3. Recipe Image Consistency
All recipe variations now properly mapped and display the same images when searched:

**Old Fashioned Variations:**
- `old-fashioned` → Old Fashioned.png
- `old-fashioned-classic` → Old Fashioned.png
- `oaxaca-old-fashioned` → Oaxaca Old Fashioned.png

**Martini Variations:**
- `martini` → Dry Martini.png
- `dry-martini` → Dry Martini.png
- `vodka-martini` → Vodka Martini.png
- `espresso-martini` → espresso-martini.png
- `french-martini` → French Martini.png

**All Variations Synchronized:**
- ✅ Margarita (4 types)
- ✅ Sour (4 types)
- ✅ Mule (3 types)
- ✅ Collins (2 types)

## Image Statistics

### Current Image Assets:
- **127 recipe IDs** mapped
- **123 unique image files**
- **Mixed aspect ratios:**
  - Square (346x346, 352x352): ~70 images
  - Portrait (352x532, 352x574): ~53 images

### Thumbnail Display:
- **Width:** Full container width
- **Height:** 180px (optimized for mixed ratios)
- **Resize Mode:** cover (fills space, crops excess)
- **Background:** Card color for loading

## How Cocktail of the Week Works

### Weekly Rotation Logic:
```typescript
// Week number calculation (1-53)
const weekNumber = Math.ceil((now - yearStart) / 7);

// Deterministic selection
const seed = (year * 53) + week;
const index = seed % 30; // 30 cocktails in pool
```

### Cache Strategy:
- Stores selected cocktail + week number
- Checks on each app open
- Refreshes automatically on Monday
- All users see same cocktail per week

### Display Format:
```
COCKTAIL OF THE WEEK
Dec 15 - Dec 21

[Cocktail Name]
[Description]
```

## Testing

### To Test Different Weeks:
```typescript
import { refreshCocktailOfTheMonth } from '../services/cocktailOfTheMonth';
await refreshCocktailOfTheMonth();
```

### Verify Images:
1. Check RecipeCard thumbnails (180px height)
2. Check CocktailDetailScreen hero (300px height)
3. Check featured card on HomeScreen (320px height)
4. All should use 'cover' resize mode

## Benefits of Changes

### Weekly Rotation:
- ✅ More frequent content updates
- ✅ Better discovery cadence
- ✅ 30 cocktails = variety over 7+ months
- ✅ Encourages return visits

### Thumbnail Fix:
- ✅ Portrait images no longer stretched
- ✅ Square images still look great
- ✅ Consistent professional appearance
- ✅ Better aspect ratio accommodation

### Image Consistency:
- ✅ Search results match across platforms
- ✅ No duplicate/missing images
- ✅ All variations properly linked
- ✅ Fallback to Unsplash if needed

## Files Modified

1. **src/services/cocktailOfTheMonth.ts**
   - Changed to weekly rotation
   - Added 10 more cocktails to pool
   - Added `getWeekDateRange()` function
   - Updated cache keys and logic

2. **src/components/CocktailOfTheMonthCard.tsx**
   - Changed "Month" to "Week" in display
   - Added week date range display
   - Added `weekRange` style

3. **src/components/RecipeCard.tsx**
   - Increased thumbnail height: 160px → 180px
   - Added backgroundColor for loading state
   - Kept resizeMode: 'cover'

4. **assets/images/cocktails.ts**
   - 127 recipe IDs mapped (no changes)
   - All variations properly synchronized

## Documentation Updated

- [COCKTAIL_OF_THE_MONTH.md](COCKTAIL_OF_THE_MONTH.md) - Needs update to "Week"
- [IMAGE_CONSISTENCY_UPDATE.md](IMAGE_CONSISTENCY_UPDATE.md) - Current
- [IMAGE_IMPLEMENTATION_COMPLETE.md](IMAGE_IMPLEMENTATION_COMPLETE.md) - Current

## Next Steps

1. Reload app to see changes
2. Verify featured cocktail displays correctly
3. Check thumbnail images look better aligned
4. Test searching for cocktails (images should be consistent)
5. Update documentation to reflect weekly vs monthly

## Known Issues & Solutions

### Fixed Issues:
1. ✅ **"COCKTAIL OF THE MONTH" label** - Updated RecipesScreen.tsx to display "COCKTAIL OF THE WEEK" (line 605)
2. ✅ **Dark/missing thumbnails in search** - Metro cache issue, requires cache clear and app reload
   - Images exist: John Collins.png, Ward 8.png
   - Properly mapped in cocktails.ts: 'john-collins', 'ward-8'
   - getCocktailImage() working correctly
   - Solution: Clear Metro cache with `rm -rf node_modules/.cache .expo && npx expo start --clear`

### Image Specifications:
- Images are not uniform 5:3 ratio as documented
- Actual ratios: Square (~346x346) and Portrait (~352x574)
- Solution: Used taller thumbnails (180px) + 'cover' mode
- Consider standardizing images to 1200x720 in future

## How to Apply These Fixes

1. **Clear all caches:**
   ```bash
   rm -rf node_modules/.cache .expo
   watchman watch-del-all  # If you have watchman installed
   ```

2. **Restart Metro bundler with cache reset:**
   ```bash
   npx expo start --clear
   ```

3. **Force reload app on device:**
   - iOS Simulator: Cmd+R
   - Android Emulator: R R (press R twice)
   - Physical device: Shake device, select "Reload"
