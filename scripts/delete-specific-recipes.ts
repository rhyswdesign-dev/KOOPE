/**
 * Delete Specific Recipes
 * Run: npx tsx scripts/delete-specific-recipes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Recipe IDs to delete
const recipesToDelete = [
  'dark-n-stormy',     // Dark 'N' Stormy
  'dry-martini',       // Dry Martini
  'bee-knees',         // Bee's Knees
  'old-fashioned'      // Old Fashioned
];

async function deleteRecipes() {
  console.log('🗑️  Deleting specified recipes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const recipeId of recipesToDelete) {
    try {
      // First, check if the recipe exists and get its title
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select('id, title')
        .eq('id', recipeId)
        .maybeSingle();

      if (fetchError) {
        console.error(`❌ Error fetching ${recipeId}:`, fetchError.message);
        errorCount++;
        continue;
      }

      if (!recipe) {
        console.log(`⚠️  Recipe not found: ${recipeId}`);
        continue;
      }

      // Delete the recipe
      const { error: deleteError } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (deleteError) {
        console.error(`❌ Failed to delete ${recipe.title}:`, deleteError.message);
        errorCount++;
      } else {
        console.log(`✅ Deleted: ${recipe.title} (${recipeId})`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${recipeId}:`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Deleted: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All specified recipes deleted successfully!');
  }
}

deleteRecipes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
