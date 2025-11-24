/**
 * Apply correct glassware based on authoritative list
 *
 * Usage: npx tsx scripts/apply-glassware-corrections.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Authoritative glassware mapping
const CORRECT_GLASSWARE: Record<string, string> = {
  // A
  'alexander': 'Coupe Glass',
  'amaretto-sour': 'Rocks Glass',
  'americano': 'Collins Glass',
  'aviation': 'Coupe Glass',

  // B
  'bees-knees': 'Coupe Glass',
  'bellini': 'Champagne Flute',
  'bloody-mary': 'Highball Glass',
  'blue-hawaiian': 'Hurricane Glass',
  'bramble': 'Rocks Glass',

  // C
  'casino': 'Coupe Glass',
  'champagne-cocktail': 'Champagne Flute',
  'daiquiri': 'Coupe Glass',
  'margarita': 'Coupe Glass', // or Margarita Glass
  'clover-club': 'Coupe Glass',
  'corpse-reviver-2': 'Coupe Glass',
  'cosmopolitan': 'Coupe Glass',

  // D-F
  'derby': 'Coupe Glass',
  'fernandito': 'Highball Glass',
  'french-connection': 'Rocks Glass',
  'french-martini': 'Coupe Glass',
  'frozen-margarita': 'Margarita Glass',

  // G
  'gibson': 'Martini Glass', // or Coupe
  'gin-tonic': 'Highball Glass',
  'gin-fizz': 'Collins Glass',
  'godfather': 'Rocks Glass',
  'godmother': 'Rocks Glass',
  'gold-rush': 'Rocks Glass',

  // H-K
  'hemingway-daiquiri': 'Coupe Glass',
  'horses-neck': 'Highball Glass',
  'hot-toddy': 'Heatproof Mug',
  'irish-coffee': 'Irish Coffee Glass',
  'kamikaze': 'Shot Glass',
  'kir': 'Wine Glass',
  'kir-royale': 'Champagne Flute',

  // L
  'last-word': 'Coupe Glass',
  'lemon-drop': 'Coupe Glass', // or Martini
  'long-island-iced-tea': 'Highball Glass',
  'lynchburg-lemonade': 'Highball Glass',

  // M
  'mai-tai': 'Rocks Glass', // Double rocks
  'manhattan': 'Coupe Glass',
  'mary-pickford': 'Coupe Glass',
  'mezcal-mule': 'Copper Mug',
  'mint-julep': 'Rocks Glass', // or Julep cup
  'moscow-mule': 'Copper Mug',

  // N-O
  'naked-and-famous': 'Coupe Glass',
  'new-york-sour': 'Rocks Glass',
  'oaxaca-old-fashioned': 'Rocks Glass',
  'old-cuban': 'Coupe Glass',

  // P
  'paloma': 'Highball Glass',
  'penicillin': 'Rocks Glass',
  'pisco-sour': 'Coupe Glass',
  'planters-punch': 'Highball Glass', // or Hurricane
  'pornstar-martini': 'Coupe Glass',
  'porto-flip': 'Coupe Glass',

  // R
  'ranch-water': 'Highball Glass',
  'revolver': 'Coupe Glass',
  'rob-roy': 'Coupe Glass',
  'russian-spring-punch': 'Highball Glass',
  'rusty-nail': 'Rocks Glass',

  // S
  'saturn': 'Rocks Glass', // or Tiki mug
  'sazerac': 'Rocks Glass',
  'screwdriver': 'Highball Glass',
  'sea-breeze': 'Highball Glass',
  'sex-on-the-beach': 'Highball Glass',
  'sidecar': 'Coupe Glass',
  'singapore-sling': 'Highball Glass',
  'southside-fizz': 'Highball Glass',
  'southside': 'Coupe Glass',
  'aperol-spritz': 'Wine Glass',
  'stinger': 'Coupe Glass',

  // T
  'tequila-sunrise': 'Highball Glass',
  'test-pilot': 'Hurricane Glass', // or Tiki mug
  'three-dots-and-a-dash': 'Hurricane Glass',
  'tom-collins': 'Collins Glass',
  'tommys-margarita': 'Rocks Glass',
  'trader-vics-grog': 'Rocks Glass',
  'trinidad-sour': 'Coupe Glass',

  // V-W
  'vesper': 'Martini Glass',
  'vieux-carre': 'Rocks Glass',
  'vodka-martini': 'Martini Glass',
  'vodka-soda': 'Highball Glass',
  'ward-8': 'Coupe Glass',
  'whiskey-smash': 'Rocks Glass',
  'whiskey-sour': 'Rocks Glass',
  'white-lady': 'Coupe Glass',
  'white-russian': 'Rocks Glass',

  // Z
  'zombie': 'Hurricane Glass',
};

function main() {
  const cocktailsPath = path.join(__dirname, '../src/data/cocktails.ts');
  let fileContent = fs.readFileSync(cocktailsPath, 'utf-8');

  console.log('🔧 Applying glassware corrections...\n');

  let changeCount = 0;

  for (const [cocktailId, correctGlass] of Object.entries(CORRECT_GLASSWARE)) {
    // Find the cocktail and its current glassware
    const cocktailRegex = new RegExp(
      `(id:\\s*['"]${cocktailId}['"][^}]*glassware:\\s*['"])([^'"]+)(['"])`,
      'g'
    );

    const match = cocktailRegex.exec(fileContent);
    if (match) {
      const currentGlass = match[2];

      if (currentGlass !== correctGlass) {
        console.log(`${cocktailId}:`);
        console.log(`  ${currentGlass} → ${correctGlass}`);

        fileContent = fileContent.replace(
          cocktailRegex,
          `$1${correctGlass}$3`
        );

        changeCount++;
      }
    }
  }

  // Write back to file
  fs.writeFileSync(cocktailsPath, fileContent, 'utf-8');

  console.log(`\n✅ Applied ${changeCount} glassware corrections`);
}

main();
