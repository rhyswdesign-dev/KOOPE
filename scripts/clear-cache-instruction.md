# Clear App Cache

The app caches recipe data in AsyncStorage for performance. To see the updated recipe list (without duplicates and with new historical facts), you need to clear the cache.

## Option 1: Force Reload (Easiest)
1. In the app, shake your device (or press Cmd+D in simulator)
2. Tap "Reload"

## Option 2: Delete and Reinstall App
1. Delete the app from your device/simulator
2. Run `npx expo start` again
3. Reinstall on device

## Option 3: Wait for Auto-Refresh
The app automatically refreshes the cache in the background after 24 hours.

## What Changed
- ✅ Removed 4 duplicate recipes (bee-sting, dark-n-stormy, martini-dry, old-fashioned)
- ✅ Added historical facts to 23 classic cocktails
- ✅ Recipe thumbnails now show random facts instead of ingredient lists
- ✅ Total recipes: 135 (down from 139)
