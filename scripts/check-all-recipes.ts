/**
 * Check All Recipes for Issues
 * Run: npx tsx scripts/check-all-recipes.ts
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

async function checkAllRecipes() {
  console.log('🔍 Checking all recipes for potential issues...\n');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('title');

  if (error) {
    console.error('❌ Error fetching recipes:', error);
    return;
  }

  console.log(`📚 Total public recipes: ${recipes?.length || 0}\n`);

  const issuesByCategory: Record<string, number> = {};
  const recipesWithIssues: Array<{ id: string; title: string; issues: string[] }> = [];

  recipes?.forEach(recipe => {
    const issues: string[] = [];

    // Check for potential parsing issues
    if (typeof recipe.ingredients === 'string') {
      try {
        JSON.parse(recipe.ingredients);
      } catch (e) {
        issues.push('ingredients JSON parse error');
      }
    } else if (!recipe.ingredients || recipe.ingredients.length === 0) {
      issues.push('empty ingredients');
    }

    if (!recipe.instructions || recipe.instructions.length === 0) {
      issues.push('empty instructions');
    }

    if (!recipe.image_url) {
      issues.push('no image');
    }

    if (!recipe.category) {
      issues.push('no category');
    }

    if (!recipe.difficulty) {
      issues.push('no difficulty');
    }

    if (issues.length > 0) {
      recipesWithIssues.push({
        id: recipe.id,
        title: recipe.title,
        issues
      });
    }

    // Count by category
    const cat = recipe.category || 'uncategorized';
    issuesByCategory[cat] = (issuesByCategory[cat] || 0) + 1;
  });

  console.log('📊 Recipes by category:');
  Object.entries(issuesByCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  if (recipesWithIssues.length > 0) {
    console.log(`\n⚠️  Found ${recipesWithIssues.length} recipes with potential issues:\n`);
    recipesWithIssues.forEach(recipe => {
      console.log(`  ❌ ${recipe.title} (${recipe.id})`);
      recipe.issues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    });
  } else {
    console.log('\n✅ All recipes appear valid!');
  }

  // Check for specific categories that might be problematic
  console.log('\n🔍 Checking for shot category...');
  const { data: shots } = await supabase
    .from('recipes')
    .select('id, title, category')
    .eq('category', 'shot')
    .order('title');

  if (shots && shots.length > 0) {
    console.log(`Found ${shots.length} shots:`);
    shots.forEach(shot => console.log(`  - ${shot.title} (${shot.id})`));
  } else {
    console.log('No recipes with category "shot" found.');
    console.log('Checking for "shots" (plural)...');
    const { data: shotsPlural } = await supabase
      .from('recipes')
      .select('id, title, category')
      .eq('category', 'shots')
      .order('title');

    if (shotsPlural && shotsPlural.length > 0) {
      console.log(`Found ${shotsPlural.length} shots (plural):`);
      shotsPlural.forEach(shot => console.log(`  - ${shot.title} (${shot.id})`));
    } else {
      console.log('No recipes with category "shots" found either.');
    }
  }
}

checkAllRecipes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
