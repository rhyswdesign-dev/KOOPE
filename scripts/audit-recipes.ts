/**
 * Audit All Recipes
 * Run: npx tsx scripts/audit-recipes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditRecipes() {
  console.log('🔍 Auditing ALL public recipes in Supabase...\n');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, ingredients, instructions, category, difficulty, base_spirit')
    .eq('is_public', true)
    .order('title');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!recipes) {
    console.log('No recipes found');
    return;
  }

  const incomplete: Array<{ id: string; title: string; issues: string[] }> = [];
  const complete: string[] = [];

  recipes.forEach(recipe => {
    const issues: string[] = [];

    const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
    const hasInstructions = recipe.instructions && recipe.instructions.length > 0;

    if (!hasIngredients) issues.push('no ingredients');
    if (!hasInstructions) issues.push('no instructions');

    if (issues.length > 0) {
      incomplete.push({ id: recipe.id, title: recipe.title, issues });
    } else {
      complete.push(recipe.title);
    }
  });

  console.log(`📊 Total public recipes: ${recipes.length}`);
  console.log(`✅ Complete: ${complete.length}`);
  console.log(`⚠️  Incomplete: ${incomplete.length}\n`);

  if (incomplete.length > 0) {
    console.log('📋 Incomplete recipes:');
    incomplete.forEach(r => {
      console.log(`  ❌ ${r.title} (${r.id}) - ${r.issues.join(', ')}`);
    });
  } else {
    console.log('✅ All recipes have ingredients and instructions!');
  }

  // Show categories breakdown
  console.log('\n📁 Recipes by category:');
  const categories: Record<string, number> = {};
  recipes.forEach(r => {
    const cat = r.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

auditRecipes().catch(console.error);
