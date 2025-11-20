/**
 * Check Recipe Images and Descriptions
 * Run: npx tsx scripts/check-recipe-images.ts
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

async function checkRecipes() {
  console.log('🔍 Checking recipe images and descriptions...\n');

  // Check sample recipes from screenshot
  const { data: sampleRecipes } = await supabase
    .from('recipes')
    .select('id, title, image_url, description')
    .in('title', ['Brandy Crusta', 'Brandy Milk Punch', 'Brooklyn', 'Caipirinha'])
    .order('title');

  console.log('📋 Sample recipes from screenshot:\n');
  sampleRecipes?.forEach(recipe => {
    console.log(`${recipe.title}:`);
    console.log(`  Image: ${recipe.image_url || '❌ MISSING'}`);
    console.log(`  Description: ${recipe.description?.substring(0, 100)}...`);
    console.log('');
  });

  // Check overall image status
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('id, title, image_url')
    .eq('is_public', true);

  const withImages = allRecipes?.filter(r => r.image_url && r.image_url.trim()) || [];
  const withoutImages = allRecipes?.filter(r => !r.image_url || !r.image_url.trim()) || [];

  console.log(`\n📊 Image Status Summary:`);
  console.log(`  ✅ With images: ${withImages.length}`);
  console.log(`  ❌ Without images: ${withoutImages.length}`);
  console.log(`  📚 Total recipes: ${allRecipes?.length || 0}`);

  if (withoutImages.length > 0) {
    console.log(`\n⚠️  Recipes missing images (first 10):`);
    withoutImages.slice(0, 10).forEach(r => {
      console.log(`  - ${r.title} (${r.id})`);
    });
  }
}

checkRecipes();
