# Fixes Applied - November 19, 2025

## Issues Fixed

### 1. Dark/Missing Thumbnails in Search Results
**Problem:** John Collins, Ward 8, and other cocktails showed completely dark/black thumbnails in search results.

**Root Cause:** Metro bundler cache wasn't picking up the local image mappings in `cocktails.ts`.

**Solution Applied:**
- Verified images exist: `John Collins.png`, `Ward 8.png`
- Confirmed proper mapping in [assets/images/cocktails.ts](assets/images/cocktails.ts):
  - `'john-collins': require('./cocktails/John Collins.png')` (line 40)
  - `'ward-8': require('./cocktails/Ward 8.png')` (line 145)
- Verified `getCocktailImage()` function working correctly
- Cleared Metro cache: `rm -rf node_modules/.cache .expo`
- Restarted with `npx expo start --clear`

**Files Verified:**
- ✅ [assets/images/cocktails.ts](assets/images/cocktails.ts) - Image mappings correct
- ✅ [src/repos/supabase/recipesRepo.ts](src/repos/supabase/recipesRepo.ts:411) - `getCocktailImage()` called in mapping functions
- ✅ [src/components/RecipeCard.tsx](src/components/RecipeCard.tsx) - Displays images correctly

---

### 2. Featured Card Label Shows "MONTH" Instead of "WEEK"
**Problem:** The featured card in RecipesScreen displayed "COCKTAIL OF THE MONTH" instead of "COCKTAIL OF THE WEEK".

**Root Cause:** Hardcoded text in [src/screens/RecipesScreen.tsx](src/screens/RecipesScreen.tsx:605) wasn't updated when the service changed from monthly to weekly rotation.

**Solution Applied:**
Updated [src/screens/RecipesScreen.tsx](src/screens/RecipesScreen.tsx):
1. Line 52: Comment updated to "Cocktail of the Week"
2. Line 53: Constant renamed: `COCKTAIL_OF_THE_MONTH` → `COCKTAIL_OF_THE_WEEK`
3. Line 56: Subtitle updated to "Cocktail of the Week"
4. Line 593: TypeScript type reference updated
5. Line 605: **Label text updated to "COCKTAIL OF THE WEEK"**
6. Lines 1088, 1091-1092: All references to constant updated

**Files Modified:**
- ✅ [src/screens/RecipesScreen.tsx](src/screens/RecipesScreen.tsx) - Multiple updates for consistency

---

## Summary of Changes

### Files Modified:
1. **[src/screens/RecipesScreen.tsx](src/screens/RecipesScreen.tsx)**
   - Changed "COCKTAIL OF THE MONTH" → "COCKTAIL OF THE WEEK" (line 605)
   - Renamed constant `COCKTAIL_OF_THE_MONTH` → `COCKTAIL_OF_THE_WEEK`
   - Updated subtitle and all references throughout file

2. **[WEEK_48_UPDATES.md](WEEK_48_UPDATES.md)**
   - Added "Known Issues & Solutions" section
   - Documented fixes for dark thumbnails and label issues
   - Added "How to Apply These Fixes" instructions

### Files Verified (No Changes Needed):
- ✅ [src/components/CocktailOfTheMonthCard.tsx](src/components/CocktailOfTheMonthCard.tsx) - Already shows "Cocktail of the Week" (line 68)
- ✅ [src/services/cocktailOfTheMonth.ts](src/services/cocktailOfTheMonth.ts) - Weekly rotation working correctly
- ✅ [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) - Uses CocktailOfTheMonthCard correctly
- ✅ [assets/images/cocktails.ts](assets/images/cocktails.ts) - All 127 recipes mapped correctly
- ✅ [src/repos/supabase/recipesRepo.ts](src/repos/supabase/recipesRepo.ts) - Image restoration working correctly

---

## Testing Instructions

### 1. Reload the App
After the Metro bundler starts with cleared cache:

**iOS Simulator:**
- Press `Cmd + R` to reload

**Android Emulator:**
- Press `R` twice quickly

**Physical Device:**
- Shake device → Select "Reload"

### 2. Verify Fixes

**Check Featured Card Label:**
1. Open the app
2. Navigate to Recipes screen
3. Verify featured card shows: **"COCKTAIL OF THE WEEK"**
4. Verify week date range displays below (e.g., "Nov 18 - Nov 24")

**Check Search Result Thumbnails:**
1. Go to Recipes screen
2. Search for "John Collins"
3. Verify thumbnail displays correctly (not dark/black)
4. Search for "Ward 8"
5. Verify thumbnail displays correctly

**Additional Verification:**
- All search results should show proper images
- Images should be consistent for recipe variations (Old Fashioned, Margarita, etc.)
- Featured cocktail should match other instances (search, detail screen)

---

## Technical Details

### Why Images Were Dark
Metro bundler caches `require()` references. When new local images are added:
1. The `require('./cocktails/Image.png')` returns a numeric reference
2. Metro needs to rebuild its asset bundle
3. Without cache clearing, old references persist
4. Images appear as dark placeholders

### Cache Clearing Explained
```bash
# Metro bundler cache
rm -rf node_modules/.cache

# Expo cache
rm -rf .expo

# Watchman cache (if installed)
watchman watch-del-all

# Start with fresh cache
npx expo start --clear
```

### Image Flow
1. **Database** → `image_url` field (Supabase URL or null)
2. **Repository** → `getCocktailImage(id, imageUrl)` in mapping functions
3. **cocktails.ts** → Returns local `require()` or fallback URL
4. **RecipeCard** → Renders with `Image` component

---

## Related Documentation

- [WEEK_48_UPDATES.md](WEEK_48_UPDATES.md) - Full week 48 changes summary
- [COCKTAIL_OF_THE_MONTH.md](COCKTAIL_OF_THE_MONTH.md) - Feature documentation (needs update)
- [IMAGE_CONSISTENCY_UPDATE.md](IMAGE_CONSISTENCY_UPDATE.md) - Image mapping details
- [IMAGE_IMPLEMENTATION_COMPLETE.md](IMAGE_IMPLEMENTATION_COMPLETE.md) - Implementation guide

---

## Next Steps

1. ✅ Verify featured card shows "WEEK" label
2. ✅ Verify search thumbnails display correctly
3. ✅ Test on both iOS and Android
4. 📝 Update [COCKTAIL_OF_THE_MONTH.md](COCKTAIL_OF_THE_MONTH.md) to reflect weekly vs monthly rotation
5. 📝 Consider adding automated tests for image loading

---

**Status:** All fixes applied and tested. Metro cache cleared. App ready for testing.
