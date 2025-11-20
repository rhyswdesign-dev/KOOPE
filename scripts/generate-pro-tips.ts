/**
 * Generate Pro Tips for All Recipes
 * Run: npx tsx scripts/generate-pro-tips.ts
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

/**
 * Generate pro tips based on recipe characteristics
 */
function generateProTips(recipe: any): string[] {
  const tips: string[] = [];

  // Handle ingredients - might be string, array, or JSON string
  let ingredientsList = '';
  try {
    if (typeof recipe.ingredients === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(recipe.ingredients);
        if (Array.isArray(parsed)) {
          ingredientsList = parsed.map((ing: any) =>
            (typeof ing === 'string' ? ing : ing.item || ing.name || '').toLowerCase()
          ).join(' ');
        } else {
          ingredientsList = recipe.ingredients.toLowerCase();
        }
      } catch {
        ingredientsList = recipe.ingredients.toLowerCase();
      }
    } else if (Array.isArray(recipe.ingredients)) {
      ingredientsList = recipe.ingredients.map((ing: any) =>
        (typeof ing === 'string' ? ing : ing.item || ing.name || '').toLowerCase()
      ).join(' ');
    }
  } catch (err) {
    console.log(`Warning: Could not parse ingredients for ${recipe.title}`);
  }

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.join(' ').toLowerCase()
    : (recipe.instructions || '').toString().toLowerCase();
  const baseSpirit = recipe.base_spirit?.toLowerCase() || '';

  // Spirit-specific tips
  if (baseSpirit === 'whiskey' || ingredientsList.includes('whiskey') || ingredientsList.includes('bourbon') || ingredientsList.includes('rye')) {
    tips.push('Quality whiskey makes a significant difference - choose a good bourbon or rye');
  }
  if (baseSpirit === 'gin' || ingredientsList.includes('gin')) {
    tips.push('London Dry gin provides the best botanical balance for classic recipes');
  }
  if (baseSpirit === 'vodka' || ingredientsList.includes('vodka')) {
    tips.push('Premium vodka ensures a smoother finish and cleaner taste');
  }
  if (baseSpirit === 'rum' || ingredientsList.includes('rum')) {
    tips.push('Quality rum is essential - aged rum adds complexity, white rum adds brightness');
  }
  if (baseSpirit === 'tequila' || ingredientsList.includes('tequila')) {
    tips.push('Always use 100% agave tequila for authentic flavor');
  }

  // Technique tips based on preparation method
  if (instructions.includes('stir') && !instructions.includes('shake')) {
    tips.push('Stir gently for 30 seconds to maintain clarity and silky texture');
  }
  if (instructions.includes('shake')) {
    tips.push('Shake vigorously with ice for 10-15 seconds to properly chill and dilute');
  }
  if (instructions.includes('muddle')) {
    tips.push('Muddle gently - pressing too hard releases bitter oils');
  }
  if (instructions.includes('strain') || instructions.includes('double strain')) {
    tips.push('Double strain for the smoothest texture and no ice shards');
  }

  // Ingredient-specific tips
  if (ingredientsList.includes('vermouth')) {
    tips.push('Store vermouth in the fridge after opening - it oxidizes like wine');
  }
  if (ingredientsList.includes('lime') || ingredientsList.includes('lemon')) {
    tips.push('Always use freshly squeezed citrus juice - bottled juice ruins cocktails');
  }
  if (ingredientsList.includes('simple syrup') || ingredientsList.includes('sugar')) {
    tips.push('Make simple syrup at home: equal parts sugar and hot water, stir until dissolved');
  }
  if (ingredientsList.includes('bitters')) {
    tips.push('A few dashes of bitters go a long way - start with less and adjust');
  }
  if (ingredientsList.includes('egg white')) {
    tips.push('Dry shake first (without ice) to emulsify the egg white, then shake with ice');
  }
  if (ingredientsList.includes('champagne') || ingredientsList.includes('prosecco') || ingredientsList.includes('sparkling')) {
    tips.push('Add sparkling wine last and stir gently to preserve carbonation');
  }

  // Ice tips
  if (recipe.glassware === 'rocks' || ingredientsList.includes('ice')) {
    if (!tips.some(t => t.includes('ice'))) {
      tips.push('Use large ice cubes or spheres to minimize dilution while chilling');
    }
  }

  // Garnish tips
  if (ingredientsList.includes('peel') || ingredientsList.includes('twist')) {
    tips.push('Express citrus peel oils over the drink by twisting over the surface');
  }

  // Temperature tips
  if (recipe.glassware === 'coupe' || recipe.glassware === 'martini') {
    tips.push('Chill your glassware in the freezer for at least 15 minutes before serving');
  }

  // Default tip if we don't have enough
  if (tips.length < 2) {
    tips.push('Use quality ice - clear ice cubes melt slower and taste better');
  }

  // Return maximum 3 tips
  return tips.slice(0, 3);
}

async function addProTips() {
  console.log('💡 Generating pro tips for all recipes...\n');

  // Fetch all recipes
  const { data: recipes, error: fetchError } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('title');

  if (fetchError) {
    console.error('❌ Error fetching recipes:', fetchError);
    return;
  }

  console.log(`📚 Processing ${recipes?.length || 0} recipes\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const recipe of recipes || []) {
    try {
      // Generate tips
      const tips = generateProTips(recipe);

      if (tips.length === 0) {
        console.log(`⚠️  Skipped ${recipe.title}: No tips generated`);
        skippedCount++;
        continue;
      }

      // Update recipe with tips
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ tags: tips })
        .eq('id', recipe.id);

      if (updateError) {
        console.error(`❌ Failed to update ${recipe.title}:`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ ${recipe.title}: Added ${tips.length} tips`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${recipe.title}:`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`📚 Total processed: ${recipes?.length || 0}`);

  if (errorCount === 0 && skippedCount === 0) {
    console.log('\n🎉 All pro tips generated successfully!');
  }
}

addProTips().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
