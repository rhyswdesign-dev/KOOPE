#!/usr/bin/env npx tsx

/**
 * Auto-Fix Image Mappings Script
 *
 * Automatically fixes common image mapping issues:
 * - Unicode apostrophes in single-quoted strings → Changes to double quotes
 * - Missing file mappings → Suggests recipe IDs
 * - Incorrect filenames → Auto-corrects to match disk
 *
 * Usage:
 *   npx tsx scripts/auto-fix-image-mappings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const COCKTAILS_DIR = path.join(__dirname, '../assets/images/cocktails');
const TS_FILE = path.join(__dirname, '../assets/images/cocktails.ts');

interface Fix {
  type: 'syntax' | 'missing' | 'filename';
  line?: number;
  description: string;
  oldCode?: string;
  newCode?: string;
}

function detectUnicodeSyntaxErrors(content: string): Fix[] {
  const fixes: Fix[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for Unicode apostrophe (U+2019) in single-quoted require()
    if (line.includes("require('") && line.includes('\u2019')) {
      const lineNum = index + 1;
      // Extract the filename
      const match = line.match(/require\('\.\/cocktails\/([^']+)'\)/);
      if (match) {
        const filename = match[1];
        const newLine = line.replace(
          `require('./cocktails/${filename}')`,
          `require("./cocktails/${filename}")`
        );

        fixes.push({
          type: 'syntax',
          line: lineNum,
          description: `Unicode apostrophe in single quotes causes syntax error`,
          oldCode: line.trim(),
          newCode: newLine.trim()
        });
      }
    }
  });

  return fixes;
}

function detectFilenameMismatches(content: string): Fix[] {
  const fixes: Fix[] = [];
  const lines = content.split('\n');

  // Get all files on disk
  const filesOnDisk = glob.sync('*.png', { cwd: COCKTAILS_DIR });
  const fileMap = new Map<string, string>();

  // Create case-insensitive map
  filesOnDisk.forEach(file => {
    const lower = file.toLowerCase().replace(/['\s-]/g, '');
    fileMap.set(lower, file);
  });

  lines.forEach((line, index) => {
    const singleMatch = line.match(/require\('\.\/cocktails\/([^']+)'\)/);
    const doubleMatch = line.match(/require\("\.\/cocktails\/([^"]+)"\)/);
    const match = singleMatch || doubleMatch;

    if (match) {
      const mappedFilename = match[1];
      const fullPath = path.join(COCKTAILS_DIR, mappedFilename);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        // Try to find a similar file
        const searchKey = mappedFilename.toLowerCase().replace(/['\s-]/g, '');
        const actualFile = fileMap.get(searchKey);

        if (actualFile && actualFile !== mappedFilename) {
          const quoteStyle = line.includes('require("') ? '"' : "'";
          const newLine = line.replace(mappedFilename, actualFile);

          fixes.push({
            type: 'filename',
            line: index + 1,
            description: `Filename mismatch: "${mappedFilename}" → "${actualFile}"`,
            oldCode: line.trim(),
            newCode: newLine.trim()
          });
        } else {
          fixes.push({
            type: 'missing',
            line: index + 1,
            description: `File not found: ${mappedFilename}`,
            oldCode: line.trim()
          });
        }
      }
    }
  });

  return fixes;
}

function applyFixes(content: string, fixes: Fix[]): string {
  let fixedContent = content;

  // Apply syntax fixes (Unicode apostrophes)
  fixes
    .filter(f => f.type === 'syntax' && f.oldCode && f.newCode)
    .forEach(fix => {
      fixedContent = fixedContent.replace(fix.oldCode!, fix.newCode!);
    });

  // Apply filename fixes
  fixes
    .filter(f => f.type === 'filename' && f.oldCode && f.newCode)
    .forEach(fix => {
      fixedContent = fixedContent.replace(fix.oldCode!, fix.newCode!);
    });

  return fixedContent;
}

function main(): void {
  console.clear();
  console.log('='.repeat(70));
  console.log('AUTO-FIX IMAGE MAPPINGS');
  console.log('='.repeat(70));
  console.log();

  // Read file
  const content = fs.readFileSync(TS_FILE, 'utf-8');

  // Detect issues
  const syntaxFixes = detectUnicodeSyntaxErrors(content);
  const filenameFixes = detectFilenameMismatches(content);
  const allFixes = [...syntaxFixes, ...filenameFixes];

  if (allFixes.length === 0) {
    console.log('✅ No issues found! All mappings are correct.\n');
    return;
  }

  // Display fixes
  console.log(`Found ${allFixes.length} issue(s) to fix:\n`);

  let fixCount = 0;
  allFixes.forEach((fix, i) => {
    console.log(`${i + 1}. Line ${fix.line}: ${fix.description}`);
    if (fix.oldCode) {
      console.log(`   ❌ ${fix.oldCode}`);
    }
    if (fix.newCode) {
      console.log(`   ✅ ${fix.newCode}`);
      fixCount++;
    }
    console.log();
  });

  if (fixCount === 0) {
    console.log('⚠️  No automatic fixes available. Manual intervention required.\n');
    process.exit(1);
  }

  // Apply fixes
  const fixedContent = applyFixes(content, allFixes);

  // Create backup
  const backupFile = TS_FILE + '.backup';
  fs.writeFileSync(backupFile, content);
  console.log(`📦 Backup created: ${backupFile}`);

  // Write fixed content
  fs.writeFileSync(TS_FILE, fixedContent);
  console.log(`✅ Fixed ${fixCount} issue(s) in cocktails.ts`);
  console.log();

  console.log('='.repeat(70));
  console.log('NEXT STEPS:');
  console.log('='.repeat(70));
  console.log('1. Run: npm run images:verify');
  console.log('2. Clear Metro cache: rm -rf node_modules/.cache .expo');
  console.log('3. Restart: npx expo start --clear');
  console.log();
}

main();
