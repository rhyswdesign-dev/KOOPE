/**
 * Fix Syrup Recipe Ingredients
 * Run: npx tsx scripts/fix-syrup-recipes.ts
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

// Fixed syrup recipes with proper ingredient format
const syrupRecipes: Record<string, any> = {
  'simple-syrup': {
    ingredients: [
      { item: 'Sugar', amount: '1 cup', type: 'other' },
      { item: 'Water', amount: '1 cup', type: 'other' }
    ],
    instructions: [
      'Combine sugar and water in a saucepan',
      'Heat over medium heat, stirring until sugar dissolves',
      'Remove from heat once sugar is fully dissolved',
      'Let cool to room temperature',
      'Store in the refrigerator for up to 1 month'
    ]
  },
  'demerara-syrup': {
    ingredients: [
      { item: 'Demerara Sugar', amount: '1 cup', type: 'other' },
      { item: 'Water', amount: '1 cup', type: 'other' }
    ],
    instructions: [
      'Combine demerara sugar and water in a saucepan',
      'Heat over medium heat, stirring until sugar dissolves',
      'Remove from heat once sugar is fully dissolved',
      'Let cool to room temperature',
      'Store in the refrigerator for up to 1 month'
    ]
  },
  'honey-syrup': {
    ingredients: [
      { item: 'Honey', amount: '1 cup', type: 'other' },
      { item: 'Water', amount: '1 cup', type: 'other' }
    ],
    instructions: [
      'Combine honey and water in a bowl or jar',
      'Stir or shake vigorously until honey is fully dissolved',
      'No heat required - room temperature water works fine',
      'Store in the refrigerator for up to 2 weeks'
    ]
  },
  'grenadine': {
    ingredients: [
      { item: 'Pomegranate Juice', amount: '2 cups', type: 'other' },
      { item: 'Sugar', amount: '2 cups', type: 'other' },
      { item: 'Pomegranate Molasses', amount: '2 tbsp', type: 'other' },
      { item: 'Orange Flower Water', amount: '1 tsp', type: 'other' }
    ],
    instructions: [
      'Combine pomegranate juice and sugar in a saucepan',
      'Heat over medium heat, stirring until sugar dissolves',
      'Simmer for 5 minutes to reduce slightly',
      'Remove from heat and stir in pomegranate molasses and orange flower water',
      'Let cool completely',
      'Store in the refrigerator for up to 2 weeks'
    ]
  },
  'rosemary-syrup': {
    ingredients: [
      { item: 'Sugar', amount: '1 cup', type: 'other' },
      { item: 'Water', amount: '1 cup', type: 'other' },
      { item: 'Fresh Rosemary', amount: '4 sprigs', type: 'garnish' }
    ],
    instructions: [
      'Combine sugar and water in a saucepan',
      'Heat over medium heat, stirring until sugar dissolves',
      'Add rosemary sprigs and remove from heat',
      'Let steep for 30 minutes',
      'Strain out rosemary and let cool',
      'Store in the refrigerator for up to 2 weeks'
    ]
  }
};

async function fixSyrupRecipes() {
  console.log('🔧 Fixing syrup recipe ingredients...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const [recipeId, updates] of Object.entries(syrupRecipes)) {
    try {
      // Check if recipe exists
      const { data: existing } = await supabase
        .from('recipes')
        .select('id, title')
        .eq('id', recipeId)
        .maybeSingle();

      if (!existing) {
        console.log(`⚠️  Recipe not found: ${recipeId}`);
        continue;
      }

      // Update with fixed ingredients and instructions
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', recipeId);

      if (error) {
        console.error(`❌ Failed to update ${existing.title}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Fixed: ${existing.title}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${recipeId}:`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All syrup recipes fixed successfully!');
  }
}

fixSyrupRecipes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
