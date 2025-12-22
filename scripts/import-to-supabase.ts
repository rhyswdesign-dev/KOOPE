/**
 * Supabase Data Import Script
 *
 * USAGE:
 * 1. Ensure you have exported Firebase data using export-firebase-data.js
 * 2. Configure your .env file with Supabase credentials
 * 3. Run: npx ts-node scripts/import-to-supabase.ts
 *
 * This script imports Firebase data into Supabase PostgreSQL.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for imports

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const exportsDir = path.join(__dirname, '..', 'exports');

/**
 * Read JSON export file
 */
function readExport(filename: string): any[] {
  try {
    const filePath = path.join(exportsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename} - Skipping`);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Import data to Supabase table in batches
 */
async function importToTable(
  tableName: string,
  data: any[],
  batchSize: number = 100
): Promise<number> {
  if (!data || data.length === 0) {
    console.log(`⚠️  No data to import for ${tableName}`);
    return 0;
  }

  console.log(`\n📦 Importing ${data.length} records to ${tableName}...`);

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Batch ${i / batchSize + 1} error:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        process.stdout.write(`  Progress: ${Math.min(i + batchSize, data.length)}/${data.length}\r`);
      }
    } catch (error: any) {
      console.error(`❌ Batch ${i / batchSize + 1} exception:`, error.message);
      errors += batch.length;
    }
  }

  console.log(`\n✅ Imported ${imported} records to ${tableName} (${errors} errors)`);
  return imported;
}

/**
 * Main import function
 */
async function importAllData() {
  console.log('🚀 Starting Supabase data import...\n');
  console.log(`Reading from: ${exportsDir}\n`);

  try {
    // Import profiles (users)
    const users = readExport('users.json');
    if (users.length > 0) {
      await importToTable('profiles', users);
    }

    // Import recipes
    const recipes = readExport('recipes.json');
    if (recipes.length > 0) {
      await importToTable('recipes', recipes);
    }

    // Import feedback
    const feedback = readExport('feedback.json');
    if (feedback.length > 0) {
      await importToTable('feedback', feedback);
    }

    // Import user preferences
    const preferences = readExport('users_preferences.json');
    if (preferences.length > 0) {
      await importToTable('user_preferences', preferences);
    }

    // Import challenges if they exist
    const challenges = readExport('challenges.json');
    if (challenges.length > 0) {
      await importToTable('challenges', challenges);
    }

    console.log('\n✨ Import complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify data in Supabase Dashboard > Table Editor');
    console.log('2. Test the app to ensure everything works');
    console.log('3. Check Row Level Security policies are working');
    console.log('4. Once verified, you can safely remove Firebase dependencies');

  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importAllData();
