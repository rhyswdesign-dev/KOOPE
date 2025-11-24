/**
 * Complete glassware audit - compare database against authoritative list
 */

import * as fs from 'fs';
import * as path from 'path';

// Authoritative glassware list (from user)
const AUTHORITATIVE_LIST: Record<string, string> = {
  'Alexander': 'Coupe Glass',
  'Amaretto Sour': 'Rocks Glass',
  'Americano': 'Collins Glass',
  'Aviation': 'Coupe Glass',
  "Bee's Knees": 'Coupe Glass',
  'Bellini': 'Champagne Flute',
  'Bloody Mary': 'Highball Glass',
  'Blue Hawaiian': 'Hurricane Glass',
  'Bramble': 'Rocks Glass',
  'Casino': 'Coupe Glass',
  'Champagne Cocktail': 'Champagne Flute',
  'Classic Daiquiri': 'Coupe Glass',
  'Daiquiri': 'Coupe Glass',
  'Classic Margarita': 'Coupe Glass',
  'Margarita': 'Coupe Glass',
  'Clover Club': 'Coupe Glass',
  'Corpse Reviver #2': 'Coupe Glass',
  'Cosmopolitan': 'Coupe Glass',
  'Derby': 'Coupe Glass',
  'Fernandito': 'Highball Glass',
  'French Connection': 'Rocks Glass',
  'French Martini': 'Coupe Glass',
  'Frozen Margarita': 'Margarita Glass',
  'Gibson': 'Martini Glass',
  'Gin & Tonic': 'Highball Glass',
  'Gin Fizz': 'Collins Glass',
  'Godfather': 'Rocks Glass',
  'Godmother': 'Rocks Glass',
  'Gold Rush': 'Rocks Glass',
  'Hemingway Special': 'Coupe Glass',
  "Horse's Neck": 'Highball Glass',
  'Hot Toddy': 'Heatproof Mug',
  'Irish Coffee': 'Irish Coffee Glass',
  'Kamikaze': 'Shot Glass',
  'Kir': 'Wine Glass',
  'Kir Royale': 'Champagne Flute',
  'Last Word': 'Coupe Glass',
  'Lemon Drop': 'Coupe Glass',
  'Long Island Iced Tea': 'Highball Glass',
  'Lynchburg Lemonade': 'Highball Glass',
  'Mai Tai': 'Rocks Glass',
  'Manhattan': 'Coupe Glass',
  'Mary Pickford': 'Coupe Glass',
  'Mezcal Mule': 'Copper Mug',
  'Mint Julep': 'Rocks Glass',
  'Moscow Mule': 'Copper Mug',
  'Naked & Famous': 'Coupe Glass',
  'New York Sour': 'Rocks Glass',
  'Oaxaca Old Fashioned': 'Rocks Glass',
  'Old Cuban': 'Coupe Glass',
  'Paloma': 'Highball Glass',
  'Penicillin': 'Rocks Glass',
  'Pisco Sour': 'Coupe Glass',
  "Planter's Punch": 'Highball Glass',
  'Pornstar Martini': 'Coupe Glass',
  'Porto Flip': 'Coupe Glass',
  'Ranch Water': 'Highball Glass',
  'Revolver': 'Coupe Glass',
  'Rob Roy': 'Coupe Glass',
  'Russian Spring Punch': 'Highball Glass',
  'Rusty Nail': 'Rocks Glass',
  'Saturn': 'Rocks Glass',
  'Sazerac': 'Rocks Glass',
  'Screwdriver': 'Highball Glass',
  'Sea Breeze': 'Highball Glass',
  'Sex on the Beach': 'Highball Glass',
  'Sidecar': 'Coupe Glass',
  'Singapore Sling': 'Highball Glass',
  'South Side Fizz': 'Highball Glass',
  'Southside': 'Coupe Glass',
  'Spritz Veneziano': 'Wine Glass',
  'Aperol Spritz': 'Wine Glass',
  'Stinger': 'Coupe Glass',
  'Tequila Sunrise': 'Highball Glass',
  'Test Pilot': 'Hurricane Glass',
  'Three Dots & a Dash': 'Hurricane Glass',
  'Tom Collins': 'Collins Glass',
  "Tommy's Margarita": 'Rocks Glass',
  "Trader Vic's Grog": 'Rocks Glass',
  'Trinidad Sour': 'Coupe Glass',
  'Vesper': 'Martini Glass',
  'Vieux Carré': 'Rocks Glass',
  'Vodka Martini': 'Martini Glass',
  'Vodka Soda': 'Highball Glass',
  'Ward 8': 'Coupe Glass',
  'Whiskey Smash': 'Rocks Glass',
  'Whiskey Sour': 'Rocks Glass',
  'White Lady': 'Coupe Glass',
  'White Russian': 'Rocks Glass',
  'Zombie': 'Hurricane Glass',
};

function main() {
  const cocktailsPath = path.join(__dirname, '../src/data/cocktails.ts');
  const fileContent = fs.readFileSync(cocktailsPath, 'utf-8');

  console.log('🔍 COMPLETE GLASSWARE AUDIT\n');
  console.log('Comparing database against authoritative list...\n');

  // Extract all cocktails with their glassware
  const cocktailRegex = /name:\s*['"]([^'"]+)['"][^}]*glassware:\s*['"]([^'"]+)['"]/g;

  const errors: Array<{ name: string; current: string; correct: string }> = [];
  const correct: string[] = [];
  const notInList: string[] = [];

  let match;
  while ((match = cocktailRegex.exec(fileContent)) !== null) {
    const name = match[1];
    const currentGlass = match[2];

    if (AUTHORITATIVE_LIST[name]) {
      const correctGlass = AUTHORITATIVE_LIST[name];

      if (currentGlass !== correctGlass) {
        errors.push({ name, current: currentGlass, correct: correctGlass });
      } else {
        correct.push(name);
      }
    } else {
      notInList.push(name);
    }
  }

  // Print results
  console.log('═'.repeat(80));
  console.log('📊 AUDIT RESULTS');
  console.log('═'.repeat(80) + '\n');

  if (errors.length > 0) {
    console.log(`❌ FOUND ${errors.length} ERRORS:\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.name}`);
      console.log(`   Current:  ${err.current}`);
      console.log(`   Correct:  ${err.correct}`);
      console.log('');
    });
  } else {
    console.log('✅ NO ERRORS FOUND!\n');
  }

  console.log(`✅ ${correct.length} cocktails have correct glassware\n`);

  if (notInList.length > 0) {
    console.log(`ℹ️  ${notInList.length} cocktails not in authoritative list (may be custom):\n`);
    notInList.slice(0, 10).forEach(name => console.log(`   - ${name}`));
    if (notInList.length > 10) {
      console.log(`   ... and ${notInList.length - 10} more`);
    }
  }

  console.log('\n' + '═'.repeat(80));
}

main();
