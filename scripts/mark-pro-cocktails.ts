import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to mark cocktails with requiresPro field
 *
 * Free tier cocktails (20 total):
 * 1. Margarita
 * 2. Old Fashioned
 * 3. Daiquiri
 * 4. Martini (Gin or Vodka)
 * 5. Negroni
 * 6. Whiskey Sour
 * 7. Mojito
 * 8. Cosmopolitan
 * 9. Moscow Mule
 * 10. Aperol Spritz
 * 11. Espresso Martini
 * 12. Tom Collins
 * 13. Paloma
 * 14. Pina Colada
 * 15. French 75
 * 16. Mai Tai
 * 17. Manhattan
 * 18. Gimlet
 * 19. Sidecar
 * 20. Dark & Stormy
 *
 * All others require KOOPE PRO subscription
 */

// IDs of cocktails that should remain free
const FREE_COCKTAIL_IDS = [
  'margarita',
  'margarita-classic',
  'old-fashioned',
  'old-fashioned-classic',
  'daiquiri',
  'martini',
  'dry-martini',
  'vodka-martini',
  'negroni',
  'whiskey-sour',
  'mojito',
  'cosmopolitan',
  'moscow-mule',
  'aperol-spritz',
  'espresso-martini',
  'tom-collins',
  'paloma',
  'pina-colada',
  'french-75',
  'mai-tai',
  'manhattan',
  'gimlet',
  'sidecar',
  'dark-stormy',
];

const COCKTAILS_FILE_PATH = path.join(__dirname, '../src/data/cocktails.ts');

async function markProCocktails() {
  console.log('Reading cocktails.ts file...');

  // Read the file
  let content = fs.readFileSync(COCKTAILS_FILE_PATH, 'utf-8');

  let modified = 0;
  let skipped = 0;

  // For each free cocktail, ensure it does NOT have requiresPro: true
  FREE_COCKTAIL_IDS.forEach(id => {
    // Look for this ID in the file
    const idPattern = new RegExp(`(\\{[\\s\\S]*?id: '${id}'[\\s\\S]*?\\})(?=,\\s*\\{|\\s*\\];)`, 'g');

    content = content.replace(idPattern, (match) => {
      // If it already has requiresPro: true, remove it
      if (match.includes('requiresPro: true')) {
        console.log(`Removing requiresPro from free cocktail: ${id}`);
        return match.replace(/,?\s*requiresPro: true,?/g, '');
      }
      return match;
    });
  });

  // Now add requiresPro: true to all cocktails that are NOT in the free list
  // Match all cocktail objects
  const cocktailPattern = /\{\s*id: '([^']+)',[\s\S]*?\}(?=,\s*\{|\s*\];)/g;

  content = content.replace(cocktailPattern, (match, id) => {
    // Skip syrups
    if (match.includes("category: 'Syrups'")) {
      return match;
    }

    // Skip free cocktails
    if (FREE_COCKTAIL_IDS.includes(id)) {
      skipped++;
      return match;
    }

    // Skip if already has requiresPro
    if (match.includes('requiresPro: true')) {
      return match;
    }

    // Add requiresPro: true before the closing brace
    modified++;
    console.log(`Marking as Pro-only: ${id}`);

    // Insert before the last closing brace
    return match.replace(/(\s*)(\})$/, '$1  requiresPro: true,\n$1$2');
  });

  // Write the modified content back
  fs.writeFileSync(COCKTAILS_FILE_PATH, content, 'utf-8');

  console.log('\n✅ Done!');
  console.log(`Modified: ${modified} cocktails marked as Pro-only`);
  console.log(`Skipped: ${skipped} free cocktails`);
}

markProCocktails().catch(console.error);
