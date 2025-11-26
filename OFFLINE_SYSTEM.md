# Offline Support System

This app now includes comprehensive offline support, allowing users to browse recipes and queue actions even without internet connectivity.

## Architecture Overview

### 1. **OfflineService** (`src/services/offlineService.ts`)
Singleton service that manages:
- Network status monitoring using `@react-native-community/netinfo`
- Offline action queue with persistence
- Automatic sync when connection is restored
- Recipe caching for offline access
- Favorites and home bar caching

### 2. **OfflineIndicator** (`src/components/OfflineIndicator.tsx`)
UI component that displays:
- Banner when device is offline
- Pending sync count when actions are queued
- "Sync Now" button to manually trigger sync
- Smooth slide-in/out animations

### 3. **useOffline Hook** (`src/hooks/useOffline.ts`)
React hook providing:
- Current network status (`isOnline`, `isOffline`)
- Queue size
- Methods to add actions to queue and sync

### 4. **Enhanced RecipesRepository** (`src/repos/supabase/recipesRepo.ts`)
Updated with offline support:
- Checks network status before fetching
- Falls back to offline cache when offline
- Caches fetched recipes for offline use
- Background refresh when online

## Features

### Network Detection
- Real-time monitoring of network connectivity
- Automatic status updates
- Distinguishes between connected and internet reachable

### Offline Queue
Actions performed while offline are queued and synced when connection returns:
- Favorite/unfavorite recipes
- Add/remove items from home bar
- Create/update recipes

### Data Persistence
- Recipes cached in AsyncStorage
- Favorites and home bar cached separately
- 24-hour cache expiration
- Background refresh when online

### User Experience
- Offline indicator banner at top of screen
- Visual feedback for queued actions
- Manual sync button
- Seamless transition between online/offline

## Usage Examples

### Using the useOffline Hook

```tsx
import { useOffline } from '../hooks/useOffline';

function MyComponent() {
  const { isOnline, isOffline, queueSize, addToQueue } = useOffline();

  const handleFavorite = async (recipeId: string) => {
    if (isOffline) {
      // Queue action for later
      await addToQueue({
        type: 'favorite',
        data: { recipeId }
      });
      showToast('Action queued - will sync when online');
    } else {
      // Execute immediately
      await favoriteRecipe(recipeId);
    }
  };

  return (
    <View>
      {isOffline && <Text>You're offline</Text>}
      {queueSize > 0 && <Text>{queueSize} actions pending</Text>}
    </View>
  );
}
```

### Accessing OfflineService Directly

```tsx
import { offlineService } from '../services/offlineService';

// Check status
if (offlineService.isOffline()) {
  // Use cached data
  const recipes = await offlineService.getCachedRecipes();
}

// Add to queue
await offlineService.addToQueue({
  type: 'add_to_bar',
  data: { ingredientId: '123' }
});

// Manual sync
await offlineService.syncOfflineQueue();
```

### Adding OfflineIndicator

Already integrated in `src/navigation/Tabs.tsx`:

```tsx
import OfflineIndicator from '../components/OfflineIndicator';

<View style={{ flex: 1 }}>
  <Tab.Navigator>
    {/* tabs */}
  </Tab.Navigator>
  <SafeAreaView edges={['top']}>
    <OfflineIndicator />
  </SafeAreaView>
</View>
```

## Storage Keys

The offline system uses the following AsyncStorage keys:

- `@offline_queue` - Queued actions
- `@last_sync` - Last sync timestamp
- `@offline_recipes` - Cached recipes
- `@offline_favorites` - Cached favorites
- `@offline_home_bar` - Cached home bar items

## Action Types

Supported offline action types:

1. **favorite** - Favorite a recipe
2. **unfavorite** - Unfavorite a recipe
3. **add_to_bar** - Add ingredient to home bar
4. **remove_from_bar** - Remove ingredient from home bar
5. **create_recipe** - Create new recipe
6. **update_recipe** - Update existing recipe

## Sync Behavior

- Automatic sync triggered when connection is restored
- Failed actions retry up to 3 times
- Actions persisted across app restarts
- Manual sync available via "Sync Now" button

## Future Enhancements

Potential improvements:

1. **Image Caching** - Download and cache recipe images for fully offline browsing
2. **Conflict Resolution** - Handle conflicts when syncing changes
3. **Selective Sync** - Allow users to choose which recipes to cache
4. **Sync Settings** - WiFi-only sync option
5. **Offline Analytics** - Track offline usage patterns

## Technical Details

### Network Status Types

```typescript
interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null; // wifi, cellular, ethernet, etc.
}
```

### Offline Action Structure

```typescript
interface OfflineAction {
  id: string;
  type: 'favorite' | 'unfavorite' | 'add_to_bar' | 'remove_from_bar' | 'create_recipe' | 'update_recipe';
  data: any;
  timestamp: number;
  retryCount: number;
}
```

## Testing Offline Mode

### iOS Simulator
1. Toggle "Airplane Mode" in simulator settings
2. Or disconnect network from Mac

### Android Emulator
1. Go to Extended Controls (...)
2. Navigate to "Cellular" tab
3. Select "Data status: Denied"

### Physical Device
1. Enable Airplane Mode
2. Or disconnect WiFi/cellular data

## Dependencies

- `@react-native-community/netinfo@11.4.1` - Network status monitoring
- `@react-native-async-storage/async-storage@^2.2.0` - Data persistence

## Error Handling

The system gracefully handles:
- Network timeouts
- Failed sync attempts
- Storage errors
- Invalid cached data

All errors are logged but don't crash the app, ensuring a smooth user experience.
