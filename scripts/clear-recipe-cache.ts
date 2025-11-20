/**
 * Clear AsyncStorage recipe cache
 * Run this to force fresh data load with updated local images
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearRecipeCache() {
  try {
    console.log('🗑️  Clearing recipe cache...');

    const keys = [
      '@recipes_cache',
      '@recipes_cache_timestamp',
      '@cocktail_of_the_week',
      '@cocktail_of_the_week_date',
    ];

    await AsyncStorage.multiRemove(keys);

    console.log('✅ Recipe cache cleared successfully!');
    console.log('📱 Please reload your app to see the changes.');
    console.log('   iOS: Cmd+R');
    console.log('   Android: RR (press R twice)');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

clearRecipeCache().then(() => process.exit(0));
