/**
 * Interactive Recipe Editor
 *
 * Allows you to view and edit recipe cards with a simple interface
 *
 * Usage: npx tsx scripts/edit-recipes-interactive.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const cocktailsPath = path.join(__dirname, '../src/data/cocktails.ts');

const GLASSWARE_OPTIONS = [
  'Coupe Glass',
  'Rocks Glass',
  'Highball Glass',
  'Collins Glass',
  'Martini Glass',
  'Hurricane Glass',
  'Wine Glass',
  'Champagne Flute',
  'Copper Mug',
  'Margarita Glass',
  'Shot Glass',
  'Punch Bowl',
  'Nick & Nora Glass',
  'Snifter',
  'Irish Coffee Glass',
  'Heatproof Mug',
];

interface RecipeInfo {
  id: string;
  name: string;
  glassware?: string;
  line: number;
}

function parseRecipesFromFile(fileContent: string): RecipeInfo[] {
  const recipes: RecipeInfo[] = [];
  const lines = fileContent.split('\n');

  let currentRecipe: Partial<RecipeInfo> = {};
  let inRecipeObject = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Start of recipe object
    if (trimmed === '{' || trimmed.startsWith('{')) {
      inRecipeObject = true;
      currentRecipe = { line: index };
    }

    // Extract fields
    if (inRecipeObject) {
      const idMatch = trimmed.match(/id:\s*['"]([^'"]+)['"]/);
      if (idMatch) currentRecipe.id = idMatch[1];

      const nameMatch = trimmed.match(/name:\s*['"]([^'"]+)['"]/);
      if (nameMatch) currentRecipe.name = nameMatch[1];

      const glasswareMatch = trimmed.match(/glassware:\s*['"]([^'"]+)['"]/);
      if (glasswareMatch) currentRecipe.glassware = glasswareMatch[1];
    }

    // End of recipe object
    if (trimmed === '},' || trimmed === '}') {
      if (currentRecipe.id && currentRecipe.name) {
        recipes.push(currentRecipe as RecipeInfo);
      }
      inRecipeObject = false;
      currentRecipe = {};
    }
  });

  return recipes;
}

function updateRecipeGlassware(id: string, glassware: string): boolean {
  let fileContent = fs.readFileSync(cocktailsPath, 'utf-8');

  // Find and replace glassware for this recipe
  const recipeRegex = new RegExp(
    `(id:\\s*['"]${id}['"][^}]*)(glassware:\\s*['"])([^'"]+)(['"])`,
    'g'
  );

  const hasGlassware = recipeRegex.test(fileContent);
  fileContent = fs.readFileSync(cocktailsPath, 'utf-8'); // Re-read after test

  if (hasGlassware) {
    // Update existing glassware
    fileContent = fileContent.replace(recipeRegex, `$1$2${glassware}$4`);
  } else {
    // Add glassware field
    const addGlasswareRegex = new RegExp(
      `(id:\\s*['"]${id}['"][^}]*base:\\s*['"][^'"]+['"])`,
      'g'
    );

    fileContent = fileContent.replace(
      addGlasswareRegex,
      `$1,\n    glassware: '${glassware}'`
    );
  }

  fs.writeFileSync(cocktailsPath, fileContent, 'utf-8');
  return true;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  console.log('🍸 Recipe Card Editor\n');

  const fileContent = fs.readFileSync(cocktailsPath, 'utf-8');
  const recipes = parseRecipesFromFile(fileContent);

  console.log(`Found ${recipes.length} recipes\n`);

  // Show recipes with missing glassware
  const missingGlassware = recipes.filter(r => !r.glassware);
  console.log(`❌ ${missingGlassware.length} recipes missing glassware:`);
  missingGlassware.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name} (${r.id})`);
  });

  if (missingGlassware.length > 10) {
    console.log(`  ... and ${missingGlassware.length - 10} more\n`);
  }

  console.log('\nCommands:');
  console.log('  list [filter] - List recipes (filter: all, missing, glass-type)');
  console.log('  edit <id>     - Edit a recipe by ID');
  console.log('  search <name> - Search recipes by name');
  console.log('  fix-missing   - Fix all missing glassware interactively');
  console.log('  exit          - Exit the editor\n');

  while (true) {
    const input = await question('> ');
    const [command, ...args] = input.trim().split(' ');

    if (command === 'exit' || command === 'quit') {
      console.log('Goodbye!');
      rl.close();
      break;
    }

    if (command === 'list') {
      const filter = args[0] || 'all';
      let filtered = recipes;

      if (filter === 'missing') {
        filtered = recipes.filter(r => !r.glassware);
      } else if (filter !== 'all') {
        filtered = recipes.filter(r => r.glassware === filter);
      }

      console.log(`\nShowing ${filtered.length} recipes:`);
      filtered.slice(0, 20).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name.padEnd(30)} | ${r.glassware || 'MISSING'} | ${r.id}`);
      });
      if (filtered.length > 20) {
        console.log(`  ... and ${filtered.length - 20} more`);
      }
      console.log('');
    }

    if (command === 'search') {
      const searchTerm = args.join(' ').toLowerCase();
      const results = recipes.filter(r =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.id.toLowerCase().includes(searchTerm)
      );

      console.log(`\nFound ${results.length} matches:`);
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name.padEnd(30)} | ${r.glassware || 'MISSING'} | ${r.id}`);
      });
      console.log('');
    }

    if (command === 'edit') {
      const id = args[0];
      const recipe = recipes.find(r => r.id === id);

      if (!recipe) {
        console.log(`❌ Recipe not found: ${id}\n`);
        continue;
      }

      console.log(`\nEditing: ${recipe.name}`);
      console.log(`Current glassware: ${recipe.glassware || 'NONE'}\n`);

      console.log('Available glassware:');
      GLASSWARE_OPTIONS.forEach((g, i) => {
        console.log(`  ${i + 1}. ${g}`);
      });

      const choice = await question('\nSelect glassware (number or name): ');

      let newGlassware: string | undefined;
      const choiceNum = parseInt(choice);

      if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= GLASSWARE_OPTIONS.length) {
        newGlassware = GLASSWARE_OPTIONS[choiceNum - 1];
      } else {
        newGlassware = GLASSWARE_OPTIONS.find(g =>
          g.toLowerCase().includes(choice.toLowerCase())
        );
      }

      if (newGlassware) {
        updateRecipeGlassware(id, newGlassware);
        recipe.glassware = newGlassware;
        console.log(`✅ Updated ${recipe.name} → ${newGlassware}\n`);
      } else {
        console.log(`❌ Invalid choice\n`);
      }
    }

    if (command === 'fix-missing') {
      const missing = recipes.filter(r => !r.glassware);

      console.log(`\n🔧 Fixing ${missing.length} recipes with missing glassware\n`);

      for (const recipe of missing) {
        console.log(`\nRecipe: ${recipe.name} (${recipe.id})`);
        console.log('Available glassware:');
        GLASSWARE_OPTIONS.forEach((g, i) => {
          console.log(`  ${i + 1}. ${g}`);
        });

        const choice = await question('Select glassware (number, name, or "skip"): ');

        if (choice.toLowerCase() === 'skip' || choice.toLowerCase() === 's') {
          console.log('Skipped');
          continue;
        }

        let newGlassware: string | undefined;
        const choiceNum = parseInt(choice);

        if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= GLASSWARE_OPTIONS.length) {
          newGlassware = GLASSWARE_OPTIONS[choiceNum - 1];
        } else {
          newGlassware = GLASSWARE_OPTIONS.find(g =>
            g.toLowerCase().includes(choice.toLowerCase())
          );
        }

        if (newGlassware) {
          updateRecipeGlassware(recipe.id, newGlassware);
          recipe.glassware = newGlassware;
          console.log(`✅ Updated → ${newGlassware}`);
        } else {
          console.log(`❌ Invalid choice, skipped`);
        }
      }

      console.log('\n✨ Done fixing missing glassware!\n');
    }
  }
}

main().catch(console.error);
