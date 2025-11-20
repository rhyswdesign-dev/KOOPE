/**
 * List Cocktails Missing Local Images
 * Run: npx tsx scripts/list-missing-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const hasLocalImage = [
  'espresso-martini',
  'margarita',
  'mimosa',
  'mojito',
  'negroni',
  'pina-colada',
  'aperol-spritz',
  'dark-stormy',
  'boulevardier'
];

async function listMissingImages() {
  console.log('📸 Checking which cocktails need images...\n');

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, title, category')
    .eq('is_public', true)
    .order('title');

  const needsImage = recipes?.filter(r => !hasLocalImage.includes(r.id)) || [];

  console.log(`✅ Cocktails WITH local images (${hasLocalImage.length}):`);
  hasLocalImage.forEach(id => {
    const recipe = recipes?.find(r => r.id === id);
    if (recipe) {
      console.log(`  • ${recipe.title}`);
    }
  });

  console.log(`\n❌ Cocktails NEEDING images (${needsImage.length}):\n`);

  // Group by category
  const byCategory: Record<string, any[]> = {};
  needsImage.forEach(r => {
    const cat = r.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  Object.entries(byCategory).forEach(([category, cocktails]) => {
    console.log(`\n${category.toUpperCase()} (${cocktails.length}):`);
    cocktails.forEach(r => console.log(`  • ${r.title} (${r.id})`));
  });

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Has images: ${hasLocalImage.length}`);
  console.log(`  ❌ Needs images: ${needsImage.length}`);
  console.log(`  📚 Total: ${recipes?.length || 0}`);
}

listMissingImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
