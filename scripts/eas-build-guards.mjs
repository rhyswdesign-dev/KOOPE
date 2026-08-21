#!/usr/bin/env node
/**
 * EAS build guard — runs on the EAS build machine via the
 * `eas-build-post-install` lifecycle hook (package.json).
 *
 * Phase 2.1: a release must not be able to ship with placeholder RevenueCat
 * keys. `npm run validate:revenuecat` has existed for a while but nothing
 * ever called it, so the check was decorative. This wires it into the one
 * place that matters — the production build — and fails the build if the
 * keys are missing or still placeholders.
 *
 * Only the `production` profile is gated. `development` and `preview` builds
 * legitimately run without real RevenueCat keys (see .env.example's
 * EXPO_PUBLIC_DEV_TIER_OVERRIDE note) and must keep working.
 *
 * `post-install` rather than `pre-install`: validate:revenuecat runs through
 * tsx, which only exists after `npm ci` has finished.
 */

import { execSync } from 'node:child_process';

// EAS sets this to the profile name from eas.json. Undefined locally, which
// is what makes this a no-op outside EAS.
const profile = process.env.EAS_BUILD_PROFILE;

if (profile !== 'production') {
  console.log(
    `[eas-build-guards] profile "${profile ?? 'none'}" — skipping production-only checks.`,
  );
  process.exit(0);
}

console.log('[eas-build-guards] production build — running release guards.');

try {
  execSync('npm run validate:revenuecat', { stdio: 'inherit' });
} catch {
  console.error(
    '\n[eas-build-guards] BUILD STOPPED: RevenueCat keys are missing or are placeholders.\n' +
      'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_KEY as EAS\n' +
      'environment variables on the production profile (they are read at build time,\n' +
      'so a local .env does not reach the build machine). Shipping without them would\n' +
      'produce a build where no one can purchase anything.\n',
  );
  process.exit(1);
}

console.log('[eas-build-guards] all release guards passed.');
