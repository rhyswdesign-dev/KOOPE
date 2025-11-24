/**
 * Script to identify and update glassware from cocktail images using AI vision
 *
 * This script will:
 * 1. Read each cocktail's image (local or URL)
 * 2. Use AI to identify the glass type in the image
 * 3. Generate updates for the glassware field
 *
 * Usage: npx tsx scripts/identify-glassware.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Glass types to match against
const GLASS_TYPES = [
  'Coupe Glass',
  'Rocks Glass',
  'Highball Glass',
  'Collins Glass',
  'Martini Glass',
  'Hurricane Glass',
  'Wine Glass',
  'Champagne Flute',
  'Copper Mug',
  'Punch Bowl'
];

interface Cocktail {
  id: string;
  name: string;
  image?: string;
  glassware?: string;
}

/**
 * Analyze an image to identify the glassware type
 */
async function identifyGlassware(imageUrl: string, cocktailName: string): Promise<string> {
  try {
    console.log(`Analyzing ${cocktailName}...`);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Look at this cocktail image for "${cocktailName}". What type of glass is it served in?

Please identify the glass type from this list:
- Coupe Glass (shallow, wide bowl, stem)
- Rocks Glass (short, wide, no stem, for drinks on ice)
- Highball Glass (tall, straight sides, for mixed drinks)
- Collins Glass (taller than highball, straight sides)
- Martini Glass (V-shaped, stem)
- Hurricane Glass (curved, tropical drink glass)
- Wine Glass (wine glass shape, for spritzes)
- Champagne Flute (tall, narrow, for champagne cocktails)
- Copper Mug (for Moscow Mule style drinks)
- Punch Bowl (large bowl for batch drinks)

Respond with ONLY the glass type name from the list above, nothing else.`
            }
          ],
        },
      ],
    });

    const response = message.content[0];
    if (response.type === 'text') {
      const identified = response.text.trim();
      console.log(`  → Identified: ${identified}`);
      return identified;
    }

    return 'Coupe Glass'; // Default fallback
  } catch (error) {
    console.error(`  ✗ Error analyzing ${cocktailName}:`, error);
    return 'Coupe Glass'; // Default fallback
  }
}

/**
 * Read cocktails data from the cocktails.ts file
 */
function readCocktailsFile(): string {
  const cocktailsPath = path.join(__dirname, '../src/data/cocktails.ts');
  return fs.readFileSync(cocktailsPath, 'utf-8');
}

/**
 * Extract cocktail data from the file content
 */
function extractCocktails(fileContent: string): Cocktail[] {
  const cocktails: Cocktail[] = [];

  // Match cocktail objects with id, name, image, and glassware
  const cocktailRegex = /{\s*id:\s*['"]([^'"]+)['"],[^}]*name:\s*['"]([^'"]+)['"],[^}]*image:\s*['"]([^'"]+)['"],[^}]*glassware:\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = cocktailRegex.exec(fileContent)) !== null) {
    cocktails.push({
      id: match[1],
      name: match[2],
      image: match[3],
      glassware: match[4],
    });
  }

  return cocktails;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting glassware identification...\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set your Anthropic API key:');
    console.error('export ANTHROPIC_API_KEY=your_api_key_here');
    process.exit(1);
  }

  // Read cocktails file
  const fileContent = readCocktailsFile();
  const cocktails = extractCocktails(fileContent);

  console.log(`Found ${cocktails.length} cocktails with images\n`);

  // Process each cocktail
  const updates: { id: string; name: string; current: string; suggested: string }[] = [];

  for (const cocktail of cocktails) {
    if (!cocktail.image || !cocktail.image.startsWith('http')) {
      console.log(`⊘ Skipping ${cocktail.name} (no URL image)`);
      continue;
    }

    const suggestedGlass = await identifyGlassware(cocktail.image, cocktail.name);

    if (suggestedGlass !== cocktail.glassware) {
      updates.push({
        id: cocktail.id,
        name: cocktail.name,
        current: cocktail.glassware || 'none',
        suggested: suggestedGlass,
      });
    }

    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print results
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ANALYSIS COMPLETE');
  console.log('='.repeat(80) + '\n');

  if (updates.length === 0) {
    console.log('✅ All glassware appears correct!');
  } else {
    console.log(`Found ${updates.length} cocktails with potentially incorrect glassware:\n`);

    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.name} (${update.id})`);
      console.log(`   Current:   ${update.current}`);
      console.log(`   Suggested: ${update.suggested}`);
      console.log('');
    });

    console.log('\nTo apply these changes, you can manually update the cocktails.ts file,');
    console.log('or create a follow-up script to automate the replacements.');
  }
}

// Run the script
main().catch(console.error);
