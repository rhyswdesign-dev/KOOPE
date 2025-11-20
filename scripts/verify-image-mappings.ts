#!/usr/bin/env npx tsx

/**
 * Image Mapping Verification Script
 *
 * Run this before committing any changes to assets/images/cocktails.ts
 * to ensure all mapped files actually exist on disk.
 *
 * Usage:
 *   npx tsx scripts/verify-image-mappings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const COCKTAILS_DIR = path.join(__dirname, '../assets/images/cocktails');
const TS_FILE = path.join(__dirname, '../assets/images/cocktails.ts');

interface VerificationResult {
  totalMapped: number;
  totalOnDisk: number;
  existsCount: number;
  missing: string[];
  unmapped: string[];
  errors: string[];
}

function extractMappedFiles(tsContent: string): string[] {
  // Match both single and double quoted require() statements
  const singleQuotePattern = /require\('\.\/cocktails\/([^']+)'\)/g;
  const doubleQuotePattern = /require\("\.\/cocktails\/([^"]+)"\)/g;

  const mapped: string[] = [];
  let match;

  while ((match = singleQuotePattern.exec(tsContent)) !== null) {
    mapped.push(match[1]);
  }

  while ((match = doubleQuotePattern.exec(tsContent)) !== null) {
    mapped.push(match[1]);
  }

  return [...new Set(mapped)]; // Remove duplicates
}

function validateTypescriptSyntax(tsContent: string): string[] {
  const errors: string[] = [];

  // Check for Unicode apostrophes in single-quoted strings
  const lines = tsContent.split('\n');
  lines.forEach((line, index) => {
    // Match require() with single quotes containing Unicode apostrophe (U+2019)
    if (line.includes("require('") && line.includes('\u2019')) {
      errors.push(
        `Line ${index + 1}: Unicode apostrophe (') in single-quoted string will cause syntax error.\n` +
        `  Fix: Change to double quotes: require("...") instead of require('...')\n` +
        `  ${line.trim()}`
      );
    }
  });

  return errors;
}

function verifyImageMappings(): VerificationResult {
  const result: VerificationResult = {
    totalMapped: 0,
    totalOnDisk: 0,
    existsCount: 0,
    missing: [],
    unmapped: [],
    errors: []
  };

  try {
    // Read TS file
    const tsContent = fs.readFileSync(TS_FILE, 'utf-8');

    // Validate TypeScript syntax first
    const syntaxErrors = validateTypescriptSyntax(tsContent);
    if (syntaxErrors.length > 0) {
      result.errors.push('🚨 SYNTAX ERRORS FOUND:');
      result.errors.push(...syntaxErrors);
    }

    const mappedFiles = extractMappedFiles(tsContent);
    result.totalMapped = mappedFiles.length;

    // Get all PNG files on disk
    const filesOnDisk = glob.sync('*.png', { cwd: COCKTAILS_DIR })
      .map(f => path.basename(f));
    result.totalOnDisk = filesOnDisk.length;

    // Check each mapped file exists
    for (const filename of mappedFiles) {
      const fullPath = path.join(COCKTAILS_DIR, filename);
      if (fs.existsSync(fullPath)) {
        result.existsCount++;
      } else {
        result.missing.push(filename);
        result.errors.push(`❌ MISSING FILE: ${filename}`);
      }
    }

    // Find unmapped files
    const mappedSet = new Set(mappedFiles);
    for (const filename of filesOnDisk) {
      if (!mappedSet.has(filename) && filename !== 'composite.png') {
        result.unmapped.push(filename);
      }
    }

  } catch (error: any) {
    result.errors.push(`ERROR: ${error.message}`);
  }

  return result;
}

function printResults(result: VerificationResult): void {
  console.log('='.repeat(70));
  console.log('IMAGE MAPPING VERIFICATION');
  console.log('='.repeat(70));
  console.log();
  console.log(`📁 Total PNG files on disk:  ${result.totalOnDisk}`);
  console.log(`📝 Total files mapped in TS:  ${result.totalMapped}`);
  console.log(`✅ Files that exist:          ${result.existsCount}`);
  console.log(`❌ Missing files:             ${result.missing.length}`);
  console.log(`⚠️  Unmapped files:            ${result.unmapped.length}`);
  console.log();

  if (result.missing.length > 0) {
    console.log('='.repeat(70));
    console.log('❌ MISSING FILES (mapped but not on disk):');
    console.log('='.repeat(70));
    result.missing.forEach(f => console.log(`  ${f}`));
    console.log();
    console.log('These mappings MUST be fixed before deploying!');
    console.log();
  }

  if (result.unmapped.length > 0) {
    console.log('='.repeat(70));
    console.log('⚠️  UNMAPPED FILES (on disk but not mapped):');
    console.log('='.repeat(70));
    result.unmapped.forEach(f => console.log(`  ${f}`));
    console.log();
    console.log('Consider adding mappings for these files or removing them.');
    console.log();
  }

  if (result.missing.length === 0 && result.unmapped.length <= 5) {
    console.log('='.repeat(70));
    console.log('✅ SUCCESS: All mapped files exist!');
    console.log('='.repeat(70));
    console.log();
    console.log('Safe to commit and deploy.');
    console.log();
  }

  if (result.errors.length > 0) {
    console.log('='.repeat(70));
    console.log('ERRORS:');
    console.log('='.repeat(70));
    result.errors.forEach(e => console.log(e));
  }
}

function main(): void {
  console.clear();
  const result = verifyImageMappings();
  printResults(result);

  // Exit with error code if there are missing files or syntax errors
  if (result.missing.length > 0 || result.errors.some(e => e.includes('SYNTAX'))) {
    console.log('\n❌ VERIFICATION FAILED\n');
    process.exit(1);
  }
}

main();
