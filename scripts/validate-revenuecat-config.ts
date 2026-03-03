import { config as loadEnv } from 'dotenv';

loadEnv();

function isInvalidRevenueCatKey(value: string | undefined, platform: 'ios' | 'android'): boolean {
  if (!value) return true;
  const key = value.trim();
  const requiredPrefix = platform === 'ios' ? 'appl_' : 'goog_';
  if (!key.startsWith(requiredPrefix)) return true;

  const blockedFragments = ['PLACEHOLDER', 'REPLACE_ME', 'appl_your', 'goog_your'];
  return blockedFragments.some((fragment) => key.includes(fragment));
}

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

const iosValid = !isInvalidRevenueCatKey(iosKey, 'ios');
const androidValid = !isInvalidRevenueCatKey(androidKey, 'android');

if (!iosValid || !androidValid) {
  const issues: string[] = [];
  if (!iosValid) issues.push('Invalid EXPO_PUBLIC_REVENUECAT_IOS_KEY (must start with appl_ and not be placeholder).');
  if (!androidValid) issues.push('Invalid EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (must start with goog_ and not be placeholder).');

  console.error('[validate:revenuecat] FAILED');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log('[validate:revenuecat] OK');
