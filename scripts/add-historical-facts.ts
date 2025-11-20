/**
 * Add Historical Facts to Recipe Tags
 * Adds interesting historical/cultural facts alongside pro tips
 * Run: npx tsx scripts/add-historical-facts.ts
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

// Historical facts for cocktails (will be added to existing tags)
const historicalFacts: Record<string, string[]> = {
  'manhattan': [
    'Allegedly created for Winston Churchill\'s mother at the Manhattan Club in 1874',
    'One of the five borough cocktails of New York City',
    'The first recorded mention was in 1882'
  ],
  'margarita': [
    'Origin disputed - claimed by bartenders in Mexico, Texas, and California',
    'Named after a woman named Margarita in the 1930s or 1940s',
    'The salt rim was revolutionary when introduced'
  ],
  'mojito': [
    'Ernest Hemingway famously said "My mojito in La Bodeguita"',
    'Originated in Havana, Cuba in the 16th century',
    'Originally made with aguardiente, not rum'
  ],
  'negroni': [
    'Created in Florence in 1919 for Count Camillo Negroni',
    'He requested a stronger version of the Americano',
    'Became the symbol of Italian aperitivo culture'
  ],
  'mai-tai': [
    'Created by Trader Vic in 1944',
    'The name means "the best" in Tahitian',
    'Sparked the Tiki cocktail craze of the 1950s-60s'
  ],
  'cosmopolitan': [
    'Popularized by Sex and the City in the late 1990s',
    'Created in the 1980s, exact origin disputed',
    'Defined the cocktail culture of the 2000s'
  ],
  'moscow-mule': [
    'Created in 1941 to sell vodka and ginger beer',
    'Launched the vodka craze in America',
    'The copper mug became iconic branding'
  ],
  'whiskey-sour': [
    'First published recipe appeared in 1862',
    'Egg white addition came later in the 1900s',
    'One of the classic sour cocktails'
  ],
  'daiquiri': [
    'Created in Cuba near the Daiquirí mines',
    'Hemingway\'s favorite at El Floridita bar',
    'JFK\'s favorite cocktail'
  ],
  'pina-colada': [
    'Puerto Rico\'s national drink since 1978',
    'Created at the Caribe Hilton in 1954',
    'The song "Escape" made it world-famous'
  ],
  'aperol-spritz': [
    'Aperol was created in 1919 in Padua, Italy',
    'Became trendy worldwide in the 2010s',
    'The perfect Italian summer drink'
  ],
  'espresso-martini': [
    'Created by Dick Bradsell in London in the 1980s',
    'Originally called the Vodka Espresso',
    'Experiencing a major revival in the 2020s'
  ],
  'aviation': [
    'Created in the early 1900s at Hotel Wallick, NYC',
    'Named for the golden age of aviation',
    'Nearly lost until the craft cocktail revival'
  ],
  'french-75': [
    'Named after the French 75mm field gun from WWI',
    'Created at Harry\'s New York Bar in Paris',
    'The champagne gives it an explosive kick'
  ],
  'sazerac': [
    'One of America\'s oldest cocktails (1850s)',
    'The official cocktail of New Orleans',
    'Originally made with cognac, not rye'
  ],
  'boulevardier': [
    'Created in 1920s Paris for expat Erskine Gwynne',
    'The whiskey version of a Negroni',
    'Named after a French literary magazine'
  ],
  'zombie': [
    'Created by Don the Beachcomber in the 1930s',
    'So strong, customers were limited to two',
    'The recipe was kept secret for decades'
  ],
  'singapore-sling': [
    'Created at Raffles Hotel Singapore in 1915',
    'Originally pink from cherry brandy and grenadine',
    'Singapore\'s most famous cocktail export'
  ],
  'irish-coffee': [
    'Created in 1943 at Foynes Airport, Ireland',
    'Invented to warm up cold passengers',
    'Brought to America by San Francisco\'s Buena Vista Cafe'
  ],
  'white-russian': [
    'Made famous by The Big Lebowski (1998)',
    'Based on the Black Russian from the 1940s',
    'The Dude\'s preferred beverage'
  ],
  'mint-julep': [
    'The official drink of the Kentucky Derby since 1938',
    '120,000 are served at Churchill Downs each Derby',
    'Dates back to the 1700s in the American South'
  ],
  'caipirinha': [
    'Brazil\'s national cocktail',
    'Made with cachaça, Brazil\'s most popular spirit',
    'Name means "little countryside drink"'
  ],
  'bramble': [
    'Created in London in the 1980s',
    'One of the few modern classics from the UK',
    'Named for the blackberry bushes (brambles)'
  ]
};

async function addHistoricalFacts() {
  console.log('📚 Adding historical facts to recipe tags...\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const [recipeId, facts] of Object.entries(historicalFacts)) {
    try {
      // Get current recipe with existing tags
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select('id, title, tags')
        .eq('id', recipeId)
        .maybeSingle();

      if (fetchError) {
        console.error(`❌ Error fetching ${recipeId}:`, fetchError.message);
        errorCount++;
        continue;
      }

      if (!recipe) {
        console.log(`⚠️  Recipe not found: ${recipeId}`);
        skippedCount++;
        continue;
      }

      // Merge existing tags with new historical facts
      const existingTags = recipe.tags || [];
      const mergedTags = [...existingTags, ...facts];

      // Update with merged tags
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ tags: mergedTags })
        .eq('id', recipeId);

      if (updateError) {
        console.error(`❌ Failed to update ${recipe.title}:`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ ${recipe.title}: Added ${facts.length} historical facts (total: ${mergedTags.length} tags)`);
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
  console.log(`⚠️  Skipped: ${skippedCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All historical facts added successfully!');
  }
}

addHistoricalFacts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
