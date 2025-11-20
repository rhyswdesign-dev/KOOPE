# Recipe Cache Fix - Complete Solution

## The Problem

Search results were showing **old Unsplash images** instead of new local images because:

1. **AsyncStorage** had cached recipe data with old image URLs
2. **RecipesRepository** had in-memory cache (`persistentCache`) that persisted even after AsyncStorage was cleared
3. The `isInitialized` flag prevented re-initialization
4. Just reloading the app (Cmd+R) didn't clear the in-memory caches

## The Root Cause

```typescript
// RecipesRepository flow:
1. App loads → initializeCache() runs
2. Loads from AsyncStorage → Sets persistentCache in memory
3. Sets isInitialized = true
4. RecipesScreen clears AsyncStorage
5. BUT persistentCache still in memory with old data!
6. Search uses old cached data ❌
```

## The Solution

### 1. Added `clearAllCaches()` Method

**File:** [src/repos/supabase/recipesRepo.ts](src/repos/supabase/recipesRepo.ts#L31)

```typescript
/**
 * Force clear all caches (both AsyncStorage and in-memory)
 */
static async clearAllCaches(): Promise<void> {
  console.log('🗑️ Clearing all recipe caches...');

  // Clear AsyncStorage
  await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  // Clear in-memory caches
  this.persistentCache = null;
  this.memoryCache.clear();
  this.isInitialized = false;

  console.log('✅ All caches cleared');
}
```

### 2. Updated RecipesScreen to Use New Method

**File:** [src/screens/RecipesScreen.tsx](src/screens/RecipesScreen.tsx#L666)

```typescript
// BEFORE (didn't work):
await AsyncStorage.multiRemove(['@recipes_cache', '@recipes_cache_timestamp']);

// AFTER (works!):
await RecipesRepository.clearAllCaches();
```

---

## How It Works Now

### Cache Clearing Flow:

```
1. RecipesScreen mounts
2. clearAllCaches() runs:
   ✅ Clears AsyncStorage
   ✅ Clears persistentCache (in-memory)
   ✅ Clears memoryCache
   ✅ Resets isInitialized flag
3. getInitialRecipes() called
4. initializeCache() runs (no cache found)
5. Fresh fetch from Supabase
6. getCocktailImage() applied to each recipe
7. Recipes saved with LOCAL image references
8. Search results show correct thumbnails! ✅
```

---

## Testing Instructions

### Step 1: Fully Restart the App

**Important:** You MUST fully restart, not just reload!

**iOS:**
1. **Stop the app** (Device menu → Stop, or Cmd+.)
2. **Delete the app** from simulator (long press → Delete App)
3. In Metro terminal, press **'i'** to reinstall

**Android:**
1. Settings → Apps → Home Game Advantage → **Force Stop**
2. Settings → Apps → Home Game Advantage → Storage → **Clear Data**
3. In Metro terminal, press **'a'** to reinstall

### Step 2: Verify Images

After the app restarts:

1. ✅ Search for "mai" → Should show Mai Tai with local image (not mojito)
2. ✅ Search for "brooklyn" → Should show Brooklyn with local image
3. ✅ Search for "hanky" → Should show Hanky Panky with correct image
4. ✅ All cocktails show proper local thumbnails

### Step 3: Check Console Logs

You should see:
```
🗑️ Clearing all recipe caches...
✅ All caches cleared
🔄 Cleared ALL recipe caches - will reload with local images
✅ Loaded 150 recipes from Supabase
```

---

## Files Modified

### 1. RecipesRepository - Added Cache Clearing
**File:** `src/repos/supabase/recipesRepo.ts`

**Changes:**
- Added `clearAllCaches()` method (lines 27-43)
- Clears both AsyncStorage and in-memory caches
- Resets initialization flag

### 2. RecipesScreen - Use New Method
**File:** `src/screens/RecipesScreen.tsx`

**Changes:**
- Line 666: Changed from `AsyncStorage.multiRemove()` to `RecipesRepository.clearAllCaches()`
- Now properly clears ALL caches before loading recipes

---

## Why Previous Fix Didn't Work

### Previous Attempt:
```typescript
// Only cleared AsyncStorage
await AsyncStorage.multiRemove(['@recipes_cache', '@recipes_cache_timestamp']);

// BUT repository already had data in memory:
this.persistentCache = [...old recipes with old images...]
this.isInitialized = true // Prevented re-initialization
```

### New Fix:
```typescript
// Clears EVERYTHING
await RecipesRepository.clearAllCaches();
// ✅ AsyncStorage cleared
// ✅ persistentCache = null
// ✅ memoryCache.clear()
// ✅ isInitialized = false
```

---

## Temporary vs Permanent

### Current (Temporary):
The cache clearing runs **every time** RecipesScreen mounts during development.

### Future (Permanent):
Once images are working:
1. **Remove** the cache clearing code (line 666-667)
2. **Keep** the `clearAllCaches()` method for future use
3. **Add** a dev menu button to manually clear cache if needed

---

## Quick Commands

```bash
# Verify all images mapped correctly
npm run images:verify

# Check Metro is running
curl http://localhost:8081/status

# Full clean restart
pkill -9 -f "expo" && rm -rf node_modules/.cache .expo && npx expo start --clear
```

---

## Next Steps

1. **Fully restart your app** (don't just reload!)
2. **Search for "mai"** - should show Mai Tai local image
3. **Verify all thumbnails** are showing local images
4. **Once confirmed working** - we can remove the temporary cache clearing code

---

**Status:** ✅ Solution implemented and ready for testing

**Expected Result:** All search results will show local image thumbnails after full app restart

**Date:** November 19, 2025
