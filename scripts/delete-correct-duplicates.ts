/**
 * Delete Correct Duplicate Recipes
 * Run: npx tsx scripts/delete-correct-duplicates.ts
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

// The CORRECT recipe IDs to delete (the ones from "classics" category)
const recipesToDelete = [
  'bee-sting',            // Bee's Knees (keeping bee-knees)
  'dark-n-stormy',        // Dark 'N' Stormy (keeping dark-stormy)
  'martini-dry',          // Dry Martini (keeping dry-martini)
  'old-fashioned'         // Old Fashioned (keeping old-fashioned-classic)
];

async function deleteRecipes() {
  console.log('🗑️  Deleting correct duplicate recipes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const recipeId of recipesToDelete) {
    try {
      // First, check if the recipe exists and get its title
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select('id, title, category')
        .eq('id', recipeId)
        .maybeSingle();

      if (fetchError) {
        console.error(`❌ Error fetching ${recipeId}:`, fetchError.message);
        errorCount++;
        continue;
      }

      if (!recipe) {
        console.log(`⚠️  Recipe not found: ${recipeId} (already deleted)`);
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
        console.log(`✅ Deleted: ${recipe.title} (${recipeId}, category: ${recipe.category})`);
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
    console.log('\n🎉 All duplicate recipes deleted successfully!');
    console.log('📚 You should now have 135 unique recipes.');
  }
}

deleteRecipes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
