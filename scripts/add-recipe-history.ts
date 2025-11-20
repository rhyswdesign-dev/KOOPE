/**
 * Add History Data to Classic Cocktails
 * Run: npx tsx scripts/add-recipe-history.ts
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

// Historical data for classic cocktails
const cocktailHistories: Record<string, any> = {
  'old-fashioned': {
    era: 'Golden Age',
    year: 1880,
    yearEstimate: '1880s',
    origin: 'Louisville, Kentucky',
    establishment: 'Pendennis Club',
    creator: 'Unknown bartender',
    story: 'The Old Fashioned is considered one of the first cocktails ever created, representing the original definition of a "cocktail" - spirit, sugar, water, and bitters. The drink gained its name when patrons would request their whiskey cocktail prepared the "old-fashioned" way, as new-fangled cocktails with additional ingredients became popular.\n\nThe drink became closely associated with bourbon whiskey and American culture, particularly in Kentucky. It experienced a major resurgence in the 2000s with the craft cocktail movement and gained massive popularity through the TV show Mad Men, where Don Draper\'s preferred drink introduced a new generation to this timeless classic.',
    notableFigures: ['Don Draper (fictional)', 'Frank Sinatra', 'Mark Twain'],
    culturalContext: 'Represents American cocktail culture at its finest. The Old Fashioned was one of the first cocktails to be called a "cocktail" in the modern sense.',
    evolution: 'Originally made with any spirit, it became synonymous with whiskey (particularly bourbon) in the 20th century. The muddled fruit version popular in the 1970s-80s has been largely replaced by the classic preparation.',
    trivia: [
      'Wisconsin has a unique brandy Old Fashioned tradition',
      'The Pendennis Club in Louisville claims to have invented it',
      'It became the official cocktail of Louisville in 2015',
      'Don Draper\'s favorite drink in Mad Men sparked a global revival'
    ]
  },
  'manhattan': {
    era: 'Golden Age',
    year: 1874,
    yearEstimate: '1870s',
    origin: 'New York City',
    establishment: 'Manhattan Club',
    story: 'The Manhattan is one of the five borough cocktails of New York and one of the most iconic whiskey cocktails in history. According to legend, it was invented at the Manhattan Club in the 1870s for a banquet hosted by Lady Randolph Churchill (Winston Churchill\'s mother), though this story has been disputed by historians.\n\nRegardless of its true origin, the Manhattan became a staple of New York\'s cocktail culture and spread across America during the late 1800s. The drink represents the golden age of American cocktails and has remained consistently popular for over 140 years.',
    notableFigures: ['Lady Randolph Churchill (disputed)', 'Winston Churchill'],
    culturalContext: 'Symbolizes New York sophistication and the golden age of American cocktails',
    evolution: 'Originally made with rye whiskey, bourbon became common during the mid-20th century. The Perfect Manhattan (equal parts sweet and dry vermouth) and Dry Manhattan (with dry vermouth) are popular variations.',
    trivia: [
      'One of the five cocktails named after New York boroughs',
      'The Rob Roy is a Scottish variation made with Scotch whisky',
      'Supposedly created for a political banquet',
      'Became the model for countless stirred spirit-forward cocktails'
    ]
  },
  'margarita': {
    era: 'Modern Classic',
    yearEstimate: 'Late 1930s-1940s',
    origin: 'Mexico (disputed)',
    story: 'The Margarita is one of the most popular cocktails worldwide, though its exact origin remains a delicious mystery. Multiple bartenders and socialites have claimed to have invented it, with stories ranging from Tijuana to Acapulco to Ciudad Juarez.\n\nThe most widely accepted theory credits Carlos "Danny" Herrera who created it in 1938 at his Rancho La Gloria restaurant in Tijuana for customer Marjorie King, who was allergic to all alcohol except tequila. Another popular origin story involves Texas socialite Margarita Sames, who claimed to have invented it in 1948 at a party in Acapulco. Regardless of the true origin, the Margarita became an international sensation and remains the most popular tequila cocktail in the world.',
    culturalContext: 'Represents the rise of tequila in international cocktail culture and Mexican-American culinary fusion',
    evolution: 'Evolved from a simple mix to countless variations including frozen margaritas (popularized in the 1970s), fruit-flavored versions, and premium craft margaritas.',
    trivia: [
      'National Margarita Day is February 22',
      'The frozen margarita machine was invented in Dallas in 1971',
      'May be a descendant of the Prohibition-era "Daisy" cocktail',
      'Lime juice and salt rim are non-negotiable for purists'
    ]
  },
  'mojito': {
    era: 'Classic',
    year: 1586,
    yearEstimate: '16th century origins, modern form 1920s',
    origin: 'Havana, Cuba',
    establishment: 'La Bodeguita del Medio',
    story: 'The Mojito has ancient roots dating back to the 16th century when Sir Francis Drake\'s crew created a medicinal drink called "El Draque" with aguardiente, sugar, lime, and mint. The modern Mojito emerged in Havana in the 1920s-30s, becoming famous at La Bodeguita del Medio bar.\n\nThe cocktail gained international fame through Ernest Hemingway, who was a regular at La Bodeguita and helped popularize the drink among American visitors to Cuba. After falling out of fashion, it experienced a major revival in the 2000s and is now one of the most popular cocktails worldwide.',
    notableFigures: ['Ernest Hemingway', 'Sir Francis Drake'],
    establishment: 'La Bodeguita del Medio (made famous)',
    culturalContext: 'Represents Cuban cocktail culture and the romance of pre-Revolution Havana',
    evolution: 'Evolved from medicinal aguardiente punch to refined rum cocktail. Modern versions use white rum instead of the historical aguardiente.',
    trivia: [
      'Hemingway famously said "My mojito in La Bodeguita, my daiquiri in El Floridita"',
      'The name may come from "mojo," a Cuban seasoning with lime',
      'Requires gentle muddling to avoid bitter mint',
      'Peak popularity in the 2000s made it the "it" cocktail of the decade'
    ]
  },
  'dry-martini': {
    era: 'Golden Age',
    yearEstimate: '1860s-1880s',
    origin: 'San Francisco or New York (disputed)',
    story: 'The Martini is perhaps the most iconic cocktail in history, with a disputed origin that adds to its mystique. Some credit Jerry Thomas in San Francisco in the 1860s, while others point to the Knickerbocker Hotel in New York in the 1910s. The name possibly derives from Martini & Rossi vermouth, the town of Martinez, California, or the Martini cocktail made with Old Tom Gin.\n\nThe drink evolved dramatically over the 20th century, from an equal-parts gin and vermouth cocktail to increasingly dry versions. The "three Martini lunch" became synonymous with Mad Men-era business culture. James Bond\'s "shaken, not stirred" vodka Martini brought the drink to global pop culture prominence.',
    notableFigures: ['James Bond', 'Winston Churchill', 'Ernest Hemingway', 'Frank Sinatra', 'Dorothy Parker'],
    culturalContext: 'Symbol of sophistication, power, and the American cocktail hour',
    evolution: 'Started as sweet gin cocktail with Old Tom Gin and sweet vermouth, evolved to dry London Dry Gin with minimal dry vermouth. Vodka martinis gained popularity in the 1950s-60s.',
    trivia: [
      'Winston Churchill allegedly just glanced at vermouth bottles',
      'The "Gibson" is a martini garnished with cocktail onions',
      'Dorothy Parker quipped: "I like to have a martini, two at the very most"',
      'James Bond\'s preference for shaken martinis is technically incorrect'
    ]
  },
  'daiquiri': {
    era: 'Classic',
    year: 1898,
    origin: 'Daiquirí, Cuba',
    creator: 'Jennings Cox',
    story: 'The Daiquiri was invented by American mining engineer Jennings Cox in 1898 in the small Cuban mining town of Daiquirí. Running short on gin for guests, Cox mixed local Bacardi rum with lime and sugar, creating what would become one of the most influential cocktails in history.\n\nThe drink gained international fame through President John F. Kennedy and especially Ernest Hemingway, who preferred his Daiquiris at El Floridita bar in Havana. Hemingway\'s variation (the "Hemingway Daiquiri" or "Papa Doble") added grapefruit juice and maraschino liqueur while omitting sugar. Unfortunately, the frozen fruit Daiquiri popularized in the 1950s-80s overshadowed the elegant classic, though craft cocktail culture has restored the original\'s reputation.',
    notableFigures: ['Ernest Hemingway', 'JFK', 'Jennings Cox'],
    establishment: 'El Floridita (made famous)',
    culturalContext: 'Represents Cuban-American cocktail fusion and the golden age of Havana tourism',
    evolution: 'Started as simple rum sour, spawned the Hemingway variation, degraded into frozen blended drinks, revived by craft cocktail movement.',
    trivia: [
      'Hemingway once drank 16 Daiquiris in one sitting at El Floridita',
      'JFK\'s favorite cocktail',
      'The frozen blender Daiquiri was invented in the 1940s',
      'July 19 is National Daiquiri Day'
    ]
  },
  'negroni': {
    era: 'Classic',
    year: 1919,
    origin: 'Florence, Italy',
    establishment: 'Caffè Casoni',
    creator: 'Count Camillo Negroni',
    story: 'The Negroni was born in 1919 when Count Camillo Negroni asked bartender Forsco Scarselli at Caffè Casoni in Florence to strengthen his favorite cocktail, the Americano, by replacing soda water with gin. Scarselli added an orange garnish instead of the lemon to signify the new drink, and a legend was born.\n\nThe Negroni remained primarily an Italian aperitivo until experiencing a massive global resurgence in the 2000s-2010s. It became the signature drink of the craft cocktail revival, with "Negroni Week" becoming an international charitable event. The drink\'s perfect balance of bitter, sweet, and botanical has made it a bartender\'s favorite and a symbol of Italian cocktail culture.',
    notableFigures: ['Count Camillo Negroni', 'Orson Welles'],
    culturalContext: 'Epitomizes Italian aperitivo culture and the bitter cocktail renaissance',
    evolution: 'Spawned countless variations including the Boulevardier (whiskey), White Negroni (Suze/Lillet), and Negroni Sbagliato (prosecco).',
    trivia: [
      'Orson Welles called it "the bitterest, most brutal, and most arrogant drink"',
      'Negroni Week raises money for charity worldwide',
      'Equal parts formula makes it easy to scale',
      'The "Negroni Sbagliato" means "broken Negroni" in Italian'
    ]
  },
  'mai-tai': {
    era: 'Tiki Renaissance',
    year: 1944,
    origin: 'Oakland, California',
    establishment: 'Trader Vic\'s',
    creator: 'Victor J. Bergeron (Trader Vic)',
    story: 'The Mai Tai was created in 1944 by Victor J. Bergeron (Trader Vic) at his Oakland restaurant. The story goes that after creating the drink for Tahitian friends, one exclaimed "Maita\'i roa ae!" (Tahitian for "Out of this world!"), giving the cocktail its name.\n\nThe original recipe featured premium aged Jamaican rum, but the drink\'s popularity led to countless inferior imitations using cheap rum and artificial flavors. This degraded the Mai Tai\'s reputation until the modern tiki revival restored Trader Vic\'s original sophisticated recipe. Today, the authentic Mai Tai is recognized as one of the finest examples of tiki cocktail craft.',
    notableFigures: ['Trader Vic', 'Don the Beachcomber (rival creator claim)'],
    culturalContext: 'Symbol of post-WWII American tiki culture and exotic escapism',
    evolution: 'Degraded from premium rum cocktail to sugary tourist drink, restored by tiki revival movement.',
    trivia: [
      'Trader Vic and Don the Beachcomber feuded over who invented it',
      'The original used 17-year-old J. Wray & Nephew rum',
      'National Mai Tai Day is August 30',
      'Elvis Presley ordered them constantly while filming Blue Hawaii'
    ]
  },
  'cosmopolitan': {
    era: 'Modern Classic',
    yearEstimate: 'Late 1980s',
    origin: 'Miami or San Francisco (disputed)',
    creator: 'Cheryl Cook or Toby Cecchini (disputed)',
    story: 'The Cosmopolitan emerged in the late 1980s, with bartenders Cheryl Cook in Miami and Toby Cecchini in New York both claiming to have created the modern recipe. The drink gained cult status among gay clubgoers in the 1990s before exploding into mainstream consciousness.\n\nThe Cosmopolitan became a global phenomenon in the late 1990s-2000s thanks to HBO\'s "Sex and the City," where it was the signature drink of the four main characters. Sarah Jessica Parker\'s Carrie Bradshaw sipping pink Cosmopolitans at Manhattan hotspots made the drink synonymous with urban female sophistication and changed cocktail culture forever.',
    notableFigures: ['Madonna', 'Carrie Bradshaw (fictional)'],
    culturalContext: 'Represents 1990s-2000s urban sophistication and the rise of vodka cocktails',
    evolution: 'Evolved from unknown citrus vodka drink to global cultural icon through popular media.',
    trivia: [
      'Originally popular in gay clubs and bars',
      'Madonna helped popularize it before Sex and the City',
      'Nearly disappeared after the show ended but has recently revived',
      'Inspired countless pink vodka cocktails'
    ]
  },
  'moscow-mule': {
    era: 'Modern Classic',
    year: 1941,
    origin: 'Los Angeles, California',
    establishment: 'Cock \'n\' Bull Pub',
    creator: 'John G. Martin, Jack Morgan, and Sophie Berezinski',
    story: 'The Moscow Mule was invented in 1941 as a marketing ploy to sell three struggling products: Smirnoff vodka, ginger beer, and copper mugs. John G. Martin (Smirnoff), Jack Morgan (Cock \'n\' Bull Pub owner), and Sophie Berezinski (copper mug manufacturer) collaborated to create the drink and its signature presentation.\n\nThe trio traveled to bars across America with a Polaroid camera, photographing bartenders holding copper mugs and posting the photos to create buzz. The campaign was wildly successful and helped establish vodka in American cocktail culture. The Moscow Mule\'s popularity ebbed and flowed over decades but experienced a major revival in the 2000s-2010s craft cocktail movement.',
    notableFigures: ['John G. Martin', 'Jack Morgan'],
    culturalContext: 'Represents the rise of vodka in American cocktail culture and clever marketing',
    evolution: 'Spawned countless "mule" variations with different spirits (Kentucky Mule with bourbon, Mexican Mule with tequila).',
    trivia: [
      'Created specifically as a marketing campaign',
      'The copper mug supposedly enhances the drink\'s temperature and taste',
      'Helped establish vodka in America during the 1950s',
      'The Polaroid marketing campaign was revolutionary for its time'
    ]
  }
};

async function addHistoryColumn() {
  console.log('📚 Adding history data to classic cocktails...\n');

  // First, ensure the history column exists (it should accept JSONB)
  // Note: This assumes the column already exists in the database
  // If not, you'll need to add it via Supabase dashboard or SQL migration

  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  for (const [recipeId, history] of Object.entries(cocktailHistories)) {
    try {
      // Check if recipe exists
      const { data: existing } = await supabase
        .from('recipes')
        .select('id, title')
        .eq('id', recipeId)
        .maybeSingle();

      if (!existing) {
        console.log(`⚠️  Recipe not found: ${recipeId}`);
        notFoundCount++;
        continue;
      }

      // Update with history data
      const { error } = await supabase
        .from('recipes')
        .update({ history })
        .eq('id', recipeId);

      if (error) {
        console.error(`❌ Failed to update ${existing.title}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Added history to: ${existing.title}`);
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
  console.log(`⚠️  Not found: ${notFoundCount}`);
  console.log(`📚 Total processed: ${Object.keys(cocktailHistories).length}`);

  if (errorCount === 0 && notFoundCount === 0) {
    console.log('\n🎉 All cocktail histories added successfully!');
  } else if (notFoundCount > 0) {
    console.log('\n⚠️  Some recipes were not found in the database.');
    console.log('Make sure the recipe IDs match the database.');
  }
}

addHistoryColumn().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
