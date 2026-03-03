import { config as loadEnv } from 'dotenv';

loadEnv();

const REQUIRED_ENTITLEMENTS = ['KOOPE+', 'KOOPE - Pro', 'KOOPE Pro', 'prestige'];
const REQUIRED_PRODUCTS = ['plus_monthly', 'plus_yearly', 'pro_monthly', 'pro_yearly'];

function isInvalidRevenueCatKey(value, platform) {
  if (!value) return true;
  const key = value.trim();
  const requiredPrefix = platform === 'ios' ? 'appl_' : 'goog_';
  if (!key.startsWith(requiredPrefix)) return true;
  const blockedFragments = ['PLACEHOLDER', 'REPLACE_ME', 'appl_your', 'goog_your'];
  return blockedFragments.some((fragment) => key.includes(fragment));
}

function mask(value) {
  if (!value) return '<missing>';
  if (value.length < 8) return '<set>';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const iosValid = !isInvalidRevenueCatKey(iosKey, 'ios');
const androidValid = !isInvalidRevenueCatKey(androidKey, 'android');

console.log('[revenuecat:readiness] Key validation');
console.log(`- iOS key: ${mask(iosKey)} (${iosValid ? 'valid' : 'invalid'})`);
console.log(`- Android key: ${mask(androidKey)} (${androidValid ? 'valid' : 'invalid'})`);
console.log('');

console.log('[revenuecat:readiness] Required entitlements (dashboard)');
REQUIRED_ENTITLEMENTS.forEach((item) => console.log(`- ${item}`));
console.log('');

console.log('[revenuecat:readiness] Required products (dashboard)');
REQUIRED_PRODUCTS.forEach((item) => console.log(`- ${item}`));
console.log('');

console.log('[revenuecat:readiness] Offering guidance');
console.log('- Ensure a current offering exists in RevenueCat.');
console.log('- Ensure current offering includes all four required products above.');
console.log('- Ensure package product identifiers exactly match those IDs.');
console.log('');

if (!iosValid || !androidValid) {
  console.error('[revenuecat:readiness] BLOCKED: keys are not valid yet.');
  process.exit(1);
}

console.log('[revenuecat:readiness] Keys look valid. Next: verify offerings in RevenueCat dashboard.');
