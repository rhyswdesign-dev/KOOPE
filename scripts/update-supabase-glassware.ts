/**
 * Update Glassware in Supabase
 *
 * This script updates the glassware field for recipes in Supabase
 * to match the local cocktails.ts file
 *
 * Usage: npx tsx scripts/update-supabase-glassware.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Map of recipe IDs to glassware
const glasswareUpdates: Record<string, string> = {
  'bee-knees': 'Coupe Glass',
  'bees-knees': 'Coupe Glass',
  // Add more as needed
};

async function updateGlassware() {
  console.log('🔄 Updating glassware in Supabase...\n');

  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  for (const [recipeId, glassware] of Object.entries(glasswareUpdates)) {
    console.log(`Updating: ${recipeId} → ${glassware}`);

    // First check if recipe exists
    const { data: existing, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, glassware')
      .eq('id', recipeId)
      .maybeSingle();

    if (fetchError) {
      console.error(`  ❌ Error fetching: ${fetchError.message}`);
      errorCount++;
      continue;
    }

    if (!existing) {
      console.log(`  ⚠️  Recipe not found in database`);
      notFoundCount++;
      continue;
    }

    console.log(`  Found: ${existing.title}`);
    console.log(`  Current glassware: ${existing.glassware || 'null'}`);

    // Update the glassware
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ glassware })
      .eq('id', recipeId);

    if (updateError) {
      console.error(`  ❌ Error updating: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Updated to: ${glassware}`);
      successCount++;
    }

    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('Summary:');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⚠️  Not found: ${notFoundCount}`);
  console.log('━'.repeat(60));

  if (successCount > 0) {
    console.log('\n💡 Remember to clear app cache to see changes:');
    console.log('   - Close and restart the app');
    console.log('   - Or navigate away and back to the recipe');
  }
}

async function listRecipesWithoutGlassware() {
  console.log('\n🔍 Checking for recipes without glassware in Supabase...\n');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, glassware, category')
    .is('glassware', null)
    .order('title');

  if (error) {
    console.error('❌ Error fetching recipes:', error.message);
    return;
  }

  if (!recipes || recipes.length === 0) {
    console.log('✅ All recipes have glassware defined!');
    return;
  }

  console.log(`Found ${recipes.length} recipes without glassware:\n`);
  recipes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title} (${r.id})`);
    console.log(`   Category: ${r.category || 'N/A'}`);
  });
}

async function main() {
  console.log('🍸 Supabase Glassware Updater\n');

  // First list recipes without glassware
  await listRecipesWithoutGlassware();

  console.log('\n');

  // Then update the ones we have mappings for
  await updateGlassware();
}

main().catch(console.error);
