#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const cwd = process.cwd();
const appJsonPath = path.join(cwd, 'app.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
}

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasRevenueCatKey(key, prefix) {
  return hasString(key) && key.startsWith(prefix) && !key.includes('your-') && !key.includes('000000');
}

const appJson = readJson(appJsonPath);
const expo = appJson.expo || {};
const iosInfo = expo.ios?.infoPlist || {};
const failures = [];
const warnings = [];

function pass(label, value) {
  console.log(`[pass] ${label}: ${value}`);
}

function fail(label, value) {
  console.log(`[fail] ${label}: ${value}`);
  failures.push(label);
}

function warn(label, value) {
  console.log(`[warn] ${label}: ${value}`);
  warnings.push(label);
}

const atsArbitraryLoads = iosInfo?.NSAppTransportSecurity?.NSAllowsArbitraryLoads;
if (atsArbitraryLoads === true) {
  fail('ATS', 'NSAllowsArbitraryLoads=true must be removed for submission');
} else {
  pass('ATS', 'No broad NSAllowsArbitraryLoads override');
}

if (hasString(iosInfo.NSCameraUsageDescription)) {
  pass('iOS camera permission copy', 'present');
} else {
  fail('iOS camera permission copy', 'missing NSCameraUsageDescription');
}

if (hasString(iosInfo.NSPhotoLibraryUsageDescription)) {
  pass('iOS photo library permission copy', 'present');
} else {
  fail('iOS photo library permission copy', 'missing NSPhotoLibraryUsageDescription');
}

if (hasString(iosInfo.NSPhotoLibraryAddUsageDescription)) {
  pass('iOS photo library add permission copy', 'present');
} else {
  warn('iOS photo library add permission copy', 'missing NSPhotoLibraryAddUsageDescription');
}

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
if (hasRevenueCatKey(iosKey, 'appl_')) {
  pass('RevenueCat iOS key', 'valid prefix');
} else {
  fail('RevenueCat iOS key', 'missing/placeholder or invalid prefix');
}

if (hasRevenueCatKey(androidKey, 'goog_')) {
  pass('RevenueCat Android key', 'valid prefix');
} else {
  fail('RevenueCat Android key', 'missing/placeholder or invalid prefix');
}

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || expo.extra?.eas?.projectId;
if (isUuid(easProjectId)) {
  pass('EAS project id', easProjectId);
} else {
  fail('EAS project id', 'missing or invalid UUID');
}

const requiredDocs = [
  'docs/release-submission-checklist.md',
  'docs/paywall-qa-matrix.md',
  'docs/app-store-connect-privacy-age-rating.md',
  'docs/app-review-notes.md',
  'docs/release-smoke-runbook.md',
];

for (const relPath of requiredDocs) {
  const fullPath = path.join(cwd, relPath);
  if (fs.existsSync(fullPath)) {
    pass('Release doc', relPath);
  } else {
    fail('Release doc', `${relPath} missing`);
  }
}

console.log('\nSummary');
console.log(`- Failures: ${failures.length}`);
console.log(`- Warnings: ${warnings.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
