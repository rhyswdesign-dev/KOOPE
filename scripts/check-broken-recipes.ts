/**
 * Check Broken Recipes
 * Run: npx tsx scripts/check-broken-recipes.ts
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

// List of recipes user mentioned as broken
const brokenRecipeNames = [
  'Bellini',
  'Bloody Mary',
  'Casino',
  'Champagne Cocktail',
  'Derby',
  'Fernandito',
  'French Connection',
  'French Martini',
  'Gibson',
  'Gin Fizz',
  'Godfather',
  'Godmother',
  'Gold Rush',
  'Hemingway Special',
  'Horse\'s Neck',
  'Hot Toddy',
  'Irish Coffee',
  'Kamikaze',
  'Kir',
  'Kir Royale',
  'Lemon Drop',
  'Long Island Iced Tea',
  'Lynchburg Lemonade',
  'Mary Pickford',
  'Mezcal Mule',
  'Naked and Famous',
  'New York Sour',
  'Oaxaca Old Fashioned',
  'Old Cuban',
  'Planter\'s Punch',
  'Pornstar Martini',
  'Rob Roy',
  'Russian Spring Punch',
  'Rusty Nail',
  'Screwdriver',
  'Sea Breeze',
  'Sex on the Beach',
  'Tequila Sunrise',
  'Trinidad Sour',
  'Vodka Martini',
  'White Lady'
];

async function checkBrokenRecipes() {
  console.log('🔍 Checking broken recipes...\n');

  const notFound: string[] = [];
  const missingFields: Array<{ title: string; issues: string[] }> = [];
  const valid: string[] = [];

  for (const recipeName of brokenRecipeNames) {
    try {
      // Search for recipe by title (case-insensitive)
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', recipeName)
        .maybeSingle();

      if (error) {
        console.error(`❌ Error checking ${recipeName}:`, error.message);
        continue;
      }

      if (!data) {
        notFound.push(recipeName);
        console.log(`⚠️  NOT FOUND: ${recipeName}`);
        continue;
      }

      // Check for missing required fields
      const issues: string[] = [];

      if (!data.title) issues.push('missing title');
      if (!data.ingredients || data.ingredients.length === 0) issues.push('missing ingredients');
      if (!data.instructions || data.instructions.length === 0) issues.push('missing instructions');
      if (!data.category) issues.push('missing category');
      if (!data.difficulty) issues.push('missing difficulty');

      if (issues.length > 0) {
        missingFields.push({ title: data.title, issues });
        console.log(`⚠️  INCOMPLETE: ${data.title} (${data.id}) - ${issues.join(', ')}`);
      } else {
        valid.push(data.title);
        console.log(`✅ VALID: ${data.title} (${data.id})`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${recipeName}:`, err);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Valid recipes: ${valid.length}`);
  console.log(`⚠️  Incomplete recipes: ${missingFields.length}`);
  console.log(`❌ Not found: ${notFound.length}`);

  if (missingFields.length > 0) {
    console.log('\n📋 Recipes with missing fields:');
    missingFields.forEach(recipe => {
      console.log(`  - ${recipe.title}: ${recipe.issues.join(', ')}`);
    });
  }

  if (notFound.length > 0) {
    console.log('\n❌ Recipes not found in database:');
    notFound.forEach(name => {
      console.log(`  - ${name}`);
    });
  }

  // Now check for "shots" category
  console.log('\n🔍 Checking shots...');
  const { data: shots, error: shotsError } = await supabase
    .from('recipes')
    .select('id, title, ingredients, instructions')
    .eq('category', 'shot')
    .order('title');

  if (shotsError) {
    console.error('❌ Error fetching shots:', shotsError.message);
  } else if (shots) {
    console.log(`\nFound ${shots.length} shot recipes:`);
    shots.forEach(shot => {
      const hasIngredients = shot.ingredients && shot.ingredients.length > 0;
      const hasInstructions = shot.instructions && shot.instructions.length > 0;
      const status = hasIngredients && hasInstructions ? '✅' : '⚠️';
      console.log(`  ${status} ${shot.title} (${shot.id})`);
      if (!hasIngredients) console.log(`      - Missing ingredients`);
      if (!hasInstructions) console.log(`      - Missing instructions`);
    });
  }
}

checkBrokenRecipes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
