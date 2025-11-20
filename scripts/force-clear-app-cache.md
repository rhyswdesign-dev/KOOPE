# Force Clear App Cache - Fix Search Results

## The Problem

When you search for cocktails, you're seeing old images because:
1. **AsyncStorage** on the device cached recipe data with OLD image URLs
2. The cache clearing code in RecipesScreen only runs when the screen mounts
3. **Just reloading (Cmd+R) doesn't restart the app** - it keeps the same AsyncStorage

## The Solution

You need to **fully restart the app** to trigger the cache clearing code.

---

## Method 1: Full App Restart (Recommended)

### iOS Simulator:
```bash
# 1. Stop the app completely
# Device menu → Stop (or Cmd+.)

# 2. Delete the app from simulator
# Long press app icon → Delete App

# 3. Clear Metro cache
rm -rf node_modules/.cache .expo

# 4. Restart Metro
npx expo start --clear

# 5. Press 'i' to reinstall on iOS
```

### Android Emulator:
```bash
# 1. Stop the app completely
# Settings → Apps → Home Game Advantage → Force Stop

# 2. Clear app data
# Settings → Apps → Home Game Advantage → Storage → Clear Data

# 3. Clear Metro cache
rm -rf node_modules/.cache .expo

# 4. Restart Metro
npx expo start --clear

# 5. Press 'a' to reinstall on Android
```

---

## Method 2: Add Dev Menu Cache Clear

I can add a button to the app that clears AsyncStorage cache on demand.

Would you like me to:
1. Add a "Clear Cache" button in the app settings/dev menu?
2. Or just follow Method 1 above to fully restart?

---

## Why This Happens

**AsyncStorage Cache Flow:**
```
1. First load → Supabase fetches recipes with Unsplash URLs
2. Save to AsyncStorage cache → { image: "https://unsplash.com/..." }
3. App reload → Reads from AsyncStorage (still has old URLs)
4. getCocktailImage() never runs because cache is used
```

**After full restart:**
```
1. RecipesScreen mounts → Clears AsyncStorage cache (line 666)
2. Fresh fetch from Supabase
3. getCocktailImage() applied → { image: require('./Mai Tai.png') }
4. Save to AsyncStorage with NEW local images
5. Future searches show correct thumbnails ✅
```

---

## Temporary Cache Clearing Code

The code in [RecipesScreen.tsx:666](src/screens/RecipesScreen.tsx#L666) is intentionally clearing cache:

```typescript
// TEMPORARY: Clear cache to force reload with local images
await AsyncStorage.multiRemove(['@recipes_cache', '@recipes_cache_timestamp']);
```

This runs **only when the screen first mounts**, which happens when you:
- ✅ Fully restart the app
- ❌ NOT when you just reload (Cmd+R)

---

## Quick Fix Commands

```bash
# Kill everything
pkill -9 -f "expo"

# Delete app data (iOS)
xcrun simctl uninstall booted com.yourapp.HomeGameAdvantage

# Delete app data (Android)
adb shell pm clear com.yourapp.HomeGameAdvantage

# Clear Metro
rm -rf node_modules/.cache .expo

# Fresh start
npx expo start --clear

# Reinstall app
# Press 'i' for iOS or 'a' for Android
```

---

## After Full Restart

1. ✅ Search for "Mai Tai" → See new thumbnail
2. ✅ Search for "Simple Syrup" → See new thumbnail
3. ✅ All cocktails show local images
4. ✅ AsyncStorage now cached with correct images

---

## Make It Permanent (Optional)

Once you verify images are working, you can:

1. **Remove** the temporary cache clearing code (line 666-667)
2. **Add** a dev menu option to clear cache on demand
3. **Keep** the auto-fix and verification scripts for future updates

Let me know if you want me to add a cache clear button to the app!
