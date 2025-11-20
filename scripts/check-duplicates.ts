/**
 * Check for Duplicate Recipes
 * Run: npx tsx scripts/check-duplicates.ts
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

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate recipes...\n');

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, category')
    .eq('is_public', true)
    .order('title');

  if (error) {
    console.error('❌ Error fetching recipes:', error);
    return;
  }

  console.log(`📚 Total recipes: ${recipes?.length || 0}\n`);

  // Check for duplicate titles
  const titleMap = new Map<string, Array<{ id: string; category: string }>>();

  recipes?.forEach(recipe => {
    const normalizedTitle = recipe.title.toLowerCase().trim();
    if (!titleMap.has(normalizedTitle)) {
      titleMap.set(normalizedTitle, []);
    }
    titleMap.get(normalizedTitle)!.push({
      id: recipe.id,
      category: recipe.category
    });
  });

  // Find duplicates
  const duplicates = Array.from(titleMap.entries())
    .filter(([, instances]) => instances.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate recipe titles found!');
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicate recipe titles:\n`);

    duplicates.forEach(([title, instances]) => {
      console.log(`📋 "${title}" (${instances.length} instances):`);
      instances.forEach(instance => {
        console.log(`   - ID: ${instance.id}, Category: ${instance.category}`);
      });
      console.log('');
    });
  }

  // Check category inconsistencies
  console.log('\n📊 Category analysis:');
  const categoryMap = new Map<string, number>();
  recipes?.forEach(recipe => {
    const cat = recipe.category || 'uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  // Check for classic vs classics
  const classicCount = categoryMap.get('classic') || 0;
  const classicsCount = categoryMap.get('classics') || 0;

  if (classicCount > 0 && classicsCount > 0) {
    console.log(`\n⚠️  Category inconsistency detected:`);
    console.log(`   "classic": ${classicCount} recipes`);
    console.log(`   "classics": ${classicsCount} recipes`);
    console.log(`   💡 Consider standardizing to one category name`);
  }
}

checkDuplicates().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
