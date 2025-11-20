/**
 * Check Historical Data in Recipes
 * Run: npx tsx scripts/check-history-data.ts
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

async function checkHistory() {
  console.log('🔍 Checking historical data in recipes...\n');

  // Check sample recipes from screenshot
  const { data: sampleRecipes } = await supabase
    .from('recipes')
    .select('id, title, history')
    .in('title', ['Brandy Crusta', 'Brandy Milk Punch', 'Brooklyn', 'Caipirinha', 'Old Fashioned', 'Dry Martini'])
    .order('title');

  console.log('📋 Sample recipes:\n');
  sampleRecipes?.forEach(recipe => {
    console.log(`${recipe.title}:`);
    if (recipe.history) {
      const history = typeof recipe.history === 'string' ? JSON.parse(recipe.history) : recipe.history;
      console.log(`  ✅ Has history data`);
      console.log(`  Era: ${history.era || 'N/A'}`);
      console.log(`  Origin: ${history.origin || 'N/A'}`);
      if (history.trivia && history.trivia.length > 0) {
        console.log(`  Trivia (${history.trivia.length} facts):`);
        history.trivia.forEach((fact: string, i: number) => {
          console.log(`    ${i + 1}. ${fact.substring(0, 80)}...`);
        });
      }
    } else {
      console.log(`  ❌ No history data`);
    }
    console.log('');
  });

  // Check overall status
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('id, title, history')
    .eq('is_public', true);

  const withHistory = allRecipes?.filter(r => r.history) || [];
  const withoutHistory = allRecipes?.filter(r => !r.history) || [];

  console.log(`\n📊 Historical Data Summary:`);
  console.log(`  ✅ With history: ${withHistory.length}`);
  console.log(`  ❌ Without history: ${withoutHistory.length}`);
  console.log(`  📚 Total recipes: ${allRecipes?.length || 0}`);

  if (withoutHistory.length > 0 && withoutHistory.length < 20) {
    console.log(`\n⚠️  Recipes without history:`);
    withoutHistory.forEach(r => {
      console.log(`  - ${r.title} (${r.id})`);
    });
  }
}

checkHistory();
