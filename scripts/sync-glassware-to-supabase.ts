/**
 * Sync Glassware from cocktails.ts to Supabase
 *
 * This script reads all glassware from the local cocktails.ts file
 * and updates the corresponding recipes in Supabase
 *
 * Usage: npx tsx scripts/sync-glassware-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

interface LocalRecipe {
  id: string;
  name: string;
  glassware?: string;
  category?: string;
}

/**
 * Parse recipes from cocktails.ts
 */
function parseLocalRecipes(): LocalRecipe[] {
  const cocktailsPath = path.join(__dirname, '../src/data/cocktails.ts');
  const content = fs.readFileSync(cocktailsPath, 'utf-8');

  const recipes: LocalRecipe[] = [];
  const lines = content.split('\n');
  let currentRecipe: any = {};
  let inRecipe = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('{') && !trimmed.startsWith('{/*')) {
      if (braceDepth === 0) {
        inRecipe = true;
        currentRecipe = {};
      }
      braceDepth++;
    }

    if (inRecipe) {
      const idMatch = trimmed.match(/id:\s*['"]([^'"]+)['"]/);
      if (idMatch) currentRecipe.id = idMatch[1];

      const nameMatch = trimmed.match(/name:\s*['"]([^'"]+)['"]/);
      if (nameMatch) currentRecipe.name = nameMatch[1];

      const glasswareMatch = trimmed.match(/glassware:\s*['"]([^'"]+)['"]/);
      if (glasswareMatch) currentRecipe.glassware = glasswareMatch[1];

      const categoryMatch = trimmed.match(/category:\s*['"]([^'"]+)['"]/);
      if (categoryMatch) currentRecipe.category = categoryMatch[1];
    }

    if (trimmed.includes('}')) {
      braceDepth--;
      if (braceDepth === 0 && inRecipe) {
        if (currentRecipe.id && currentRecipe.name) {
          recipes.push({ ...currentRecipe });
        }
        inRecipe = false;
        currentRecipe = {};
      }
    }
  }

  return recipes;
}

/**
 * Get recipes from Supabase that need glassware updates
 */
async function getSupabaseRecipesNeedingUpdate() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, glassware, category')
    .order('title');

  if (error) {
    console.error('❌ Error fetching Supabase recipes:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Main sync function
 */
async function syncGlassware() {
  console.log('🍸 Syncing Glassware from cocktails.ts to Supabase\n');
  console.log('━'.repeat(60));

  // Parse local recipes
  console.log('📖 Reading local cocktails.ts...');
  const localRecipes = parseLocalRecipes();
  const localCocktails = localRecipes.filter(r =>
    r.category !== 'Syrups' &&
    r.category !== 'Syrup' &&
    !r.id.includes('syrup')
  );
  const localWithGlassware = localCocktails.filter(r => r.glassware);

  console.log(`   Found ${localRecipes.length} total recipes`);
  console.log(`   Found ${localCocktails.length} cocktails`);
  console.log(`   Found ${localWithGlassware.length} cocktails with glassware\n`);

  // Get Supabase recipes
  console.log('☁️  Fetching Supabase recipes...');
  const supabaseRecipes = await getSupabaseRecipesNeedingUpdate();
  console.log(`   Found ${supabaseRecipes.length} recipes in Supabase\n`);

  console.log('━'.repeat(60));
  console.log('🔄 Starting sync...\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;
  let alreadySet = 0;

  // Create a map of local recipes by ID
  const localMap = new Map(localWithGlassware.map(r => [r.id, r]));

  for (const supabaseRecipe of supabaseRecipes) {
    const localRecipe = localMap.get(supabaseRecipe.id);

    if (!localRecipe) {
      // Recipe exists in Supabase but not in local file
      if (!supabaseRecipe.glassware && supabaseRecipe.category !== 'Syrups') {
        console.log(`⚠️  ${supabaseRecipe.title} (${supabaseRecipe.id})`);
        console.log(`   Not found in local cocktails.ts`);
        notFound++;
      }
      continue;
    }

    // Check if update is needed
    if (supabaseRecipe.glassware === localRecipe.glassware) {
      alreadySet++;
      continue;
    }

    // Skip syrups
    if (supabaseRecipe.category === 'Syrups' || localRecipe.category === 'Syrups') {
      skipped++;
      continue;
    }

    // Update glassware
    console.log(`📝 Updating: ${supabaseRecipe.title}`);
    console.log(`   Current: ${supabaseRecipe.glassware || 'null'}`);
    console.log(`   New: ${localRecipe.glassware}`);

    const { error } = await supabase
      .from('recipes')
      .update({ glassware: localRecipe.glassware })
      .eq('id', supabaseRecipe.id);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      errors++;
    } else {
      console.log(`   ✅ Updated`);
      updated++;
    }
    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('📊 SYNC SUMMARY\n');
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`✓  Already correct: ${alreadySet}`);
  console.log(`⊘  Skipped (syrups): ${skipped}`);
  console.log(`⚠️  Not in local file: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('━'.repeat(60));

  if (updated > 0) {
    console.log('\n💡 Next steps:');
    console.log('   1. Close and restart your app to clear cache');
    console.log('   2. Or navigate away and back to recipes');
    console.log('   3. Glassware should now appear on all cocktails!\n');
  }
}

syncGlassware().catch(console.error);
