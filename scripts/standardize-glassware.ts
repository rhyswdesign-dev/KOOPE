/**
 * Standardize Glassware Names in Supabase
 *
 * This script standardizes glassware names to proper capitalization
 * (e.g., "coupe" → "Coupe Glass", "martini" → "Martini Glass")
 *
 * Usage: npx tsx scripts/standardize-glassware.ts
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapping of old glassware names to standardized names
const glasswareMapping: Record<string, string> = {
  // Lowercase variants
  'coupe': 'Coupe Glass',
  'martini': 'Martini Glass',
  'rocks': 'Rocks Glass',
  'highball': 'Highball Glass',
  'collins': 'Collins Glass',
  'wine': 'Wine Glass',
  'champagne-flute': 'Champagne Flute',
  'copper-mug': 'Copper Mug',
  'hurricane': 'Hurricane Glass',
  'julep-cup': 'Julep Cup',
  'shot': 'Shot Glass',
  'punch-bowl': 'Punch Bowl',
  'snifter': 'Snifter',

  // Variants with inconsistent casing
  'coupe glass': 'Coupe Glass',
  'Coupe glass': 'Coupe Glass',
  'martini glass': 'Martini Glass',
  'Martini glass': 'Martini Glass',
  'rocks glass': 'Rocks Glass',
  'Rocks glass': 'Rocks Glass',
  'highball glass': 'Highball Glass',
  'Highball glass': 'Highball Glass',
  'collins glass': 'Collins Glass',
  'Collins glass': 'Collins Glass',
  'wine glass': 'Wine Glass',
  'Wine glass': 'Wine Glass',
  'hurricane glass': 'Hurricane Glass',
  'Hurricane glass': 'Hurricane Glass',
  'copper mug': 'Copper Mug',
  'Copper mug': 'Copper Mug',

  // Already standardized (will skip these)
  'Coupe Glass': 'Coupe Glass',
  'Martini Glass': 'Martini Glass',
  'Rocks Glass': 'Rocks Glass',
  'Highball Glass': 'Highball Glass',
  'Collins Glass': 'Collins Glass',
  'Wine Glass': 'Wine Glass',
  'Champagne Flute': 'Champagne Flute',
  'Copper Mug': 'Copper Mug',
  'Hurricane Glass': 'Hurricane Glass',
  'Julep Cup': 'Julep Cup',
  'Shot Glass': 'Shot Glass',
  'Punch Bowl': 'Punch Bowl',
  'Snifter': 'Snifter',
  'Nick & Nora Glass': 'Nick & Nora Glass',
  'Irish Coffee Glass': 'Irish Coffee Glass',
  'Heatproof Mug': 'Heatproof Mug',
  'Margarita Glass': 'Margarita Glass',
};

async function standardizeGlassware() {
  console.log('🍸 Standardizing Glassware Names in Supabase\n');
  console.log('━'.repeat(60));

  // Get all recipes with glassware
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, glassware')
    .not('glassware', 'is', null)
    .order('title');

  if (error) {
    console.error('❌ Error fetching recipes:', error.message);
    return;
  }

  if (!recipes || recipes.length === 0) {
    console.log('No recipes found with glassware');
    return;
  }

  console.log(`Found ${recipes.length} recipes with glassware\n`);
  console.log('━'.repeat(60));
  console.log('🔄 Standardizing...\n');

  let updated = 0;
  let alreadyStandard = 0;
  let unknown = 0;

  for (const recipe of recipes) {
    const currentGlassware = recipe.glassware;
    const standardGlassware = glasswareMapping[currentGlassware];

    if (!standardGlassware) {
      console.log(`⚠️  Unknown glassware: "${currentGlassware}" in ${recipe.title}`);
      unknown++;
      continue;
    }

    if (currentGlassware === standardGlassware) {
      alreadyStandard++;
      continue;
    }

    console.log(`📝 Updating: ${recipe.title}`);
    console.log(`   "${currentGlassware}" → "${standardGlassware}"`);

    const { error: updateError } = await supabase
      .from('recipes')
      .update({ glassware: standardGlassware })
      .eq('id', recipe.id);

    if (updateError) {
      console.log(`   ❌ Error: ${updateError.message}`);
    } else {
      console.log(`   ✅ Updated`);
      updated++;
    }
    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('📊 STANDARDIZATION SUMMARY\n');
  console.log(`✅ Updated: ${updated}`);
  console.log(`✓  Already standard: ${alreadyStandard}`);
  console.log(`⚠️  Unknown glassware: ${unknown}`);
  console.log('━'.repeat(60));

  if (updated > 0) {
    console.log('\n💡 Restart your app to see the standardized glassware names!\n');
  }
}

standardizeGlassware().catch(console.error);
