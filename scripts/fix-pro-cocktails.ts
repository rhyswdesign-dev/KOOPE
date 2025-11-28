import * as fs from 'fs';
import * as path from 'path';

/**
 * Fixed script to properly add requiresPro field to cocktails
 * Fixes the syntax error from the previous script
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

async function fixProCocktails() {
  console.log('Reading cocktails.ts file...');

  // Read the file
  let content = fs.readFileSync(COCKTAILS_FILE_PATH, 'utf-8');

  let modified = 0;
  let skipped = 0;
  let fixed = 0;

  // First, remove all existing requiresPro fields (both correct and incorrect)
  content = content.replace(/,?\s*requiresPro: true,?\s*/g, '');
  console.log('Removed all existing requiresPro fields');

  // Match all cocktail objects - improved regex
  // This matches from "id: 'xxx'" to the closing brace before the next object
  const lines = content.split('\n');
  const newLines: string[] = [];

  let inCocktail = false;
  let currentCocktailId = '';
  let currentCocktail: string[] = [];
  let isSyrup = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're starting a new cocktail object
    const idMatch = line.match(/id: '([^']+)'/);
    if (idMatch && line.trim().startsWith('id:')) {
      inCocktail = true;
      currentCocktailId = idMatch[1];
      currentCocktail = [line];
      isSyrup = false;
      continue;
    }

    if (inCocktail) {
      currentCocktail.push(line);

      // Check if this cocktail is a syrup
      if (line.includes("category: 'Syrups'")) {
        isSyrup = true;
      }

      // Check if we've reached the end of this object
      if (line.trim() === '},') {
        // We've completed this cocktail object
        // Determine if we need to add requiresPro
        const needsProFlag = !FREE_COCKTAIL_IDS.includes(currentCocktailId) && !isSyrup;

        if (needsProFlag) {
          // Find the last line before the closing brace
          const lastLineIndex = currentCocktail.length - 2; // -1 for closing brace, -1 for 0-index
          const lastPropertyLine = currentCocktail[lastLineIndex];

          // Add comma if missing
          if (!lastPropertyLine.trim().endsWith(',')) {
            currentCocktail[lastLineIndex] = lastPropertyLine + ',';
            fixed++;
          }

          // Insert requiresPro before closing brace
          const indentation = currentCocktail[lastLineIndex].match(/^(\s*)/)?.[1] || '    ';
          currentCocktail.splice(currentCocktail.length - 1, 0, `${indentation}requiresPro: true,`);
          modified++;
          console.log(`Added requiresPro to: ${currentCocktailId}`);
        } else {
          skipped++;
        }

        // Add all lines from this cocktail
        newLines.push(...currentCocktail);

        inCocktail = false;
        currentCocktail = [];
        currentCocktailId = '';
        continue;
      }
    } else {
      // Not in a cocktail, just add the line
      newLines.push(line);
    }
  }

  // Write the modified content back
  const newContent = newLines.join('\n');
  fs.writeFileSync(COCKTAILS_FILE_PATH, newContent, 'utf-8');

  console.log('\n✅ Done!');
  console.log(`Fixed: ${fixed} syntax errors (missing commas)`);
  console.log(`Modified: ${modified} cocktails marked as Pro-only`);
  console.log(`Skipped: ${skipped} free cocktails`);
}

fixProCocktails().catch(console.error);
