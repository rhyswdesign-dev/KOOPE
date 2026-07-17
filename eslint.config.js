// Phase 0.9 guardrail: ESLint wasn't wired up at all before this — no config,
// no CI step, no pre-commit hook. Rolling a linter onto a ~3-year-old
// unlinted codebase all at once means either (a) fixing hundreds of
// pre-existing findings unrelated to the change that triggered this pass
// (a drive-by refactor, explicitly out of scope), or (b) leaving the rule
// set so loose it catches nothing. This takes a third path: rules that
// catch real bugs stay at `error` and block CI; a short, explicit
// per-file grandfather list exempts the known pre-existing violations so
// today's baseline is green *without* silencing the rule for new code.
// Anything genuinely stylistic/cosmetic or still-experimental is `warn` or
// off, with the reasoning inline below. Tighten incrementally later —
// don't relitigate this file to add one new rule.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'android/**',
      'ios/**',
      'backups/**',
      'MixMind/**',
      'MixedMindsRecipes/**',
      'scripts/**', // one-off/maintenance Node scripts, not shipped app code
      'skills/**', // Claude Code skill assets (e.g. p5.js templates with their own globals), not app code
      'supabase/functions/**', // Deno runtime, not the Node/TS project — separate lint surface
      'supabase/.temp/**',
      '.expo/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // React Compiler eligibility rules (refs/immutability/purity/
      // set-state-in-effect/preserve-manual-memoization/static-components),
      // bundled on by default in eslint-config-expo as of Expo 54+. They
      // assume the codebase is being written for React Compiler adoption,
      // which this app hasn't opted into — enabling them here produced
      // ~460 pre-existing findings across files this task never touched.
      // Real guardrail candidate once/if the team turns the compiler on;
      // not a Phase 0 concern.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',

      // Existing codebase leans on console.log/log.* heavily and has a lot
      // of intentionally-unused destructured params (React Navigation
      // screen props, context defaults). Not a correctness signal here.
      'no-unused-vars': 'off',

      // Content-heavy screens have lots of apostrophes/quotes in copy —
      // real finding in principle, too noisy to block CI on today.
      'react/no-unescaped-entities': 'warn',

      // ESLint's static resolver doesn't understand this project's Metro
      // path/extension resolution (asset barrel folders, .ios/.android
      // variants) — tsc (already a separate blocking CI step) is the
      // authoritative "does this import resolve" check.
      'import/no-unresolved': 'off',

      // Cosmetic / import-hygiene, not correctness.
      'react/display-name': 'warn',
      'import/no-duplicates': 'warn',
    },
  },
  {
    // TypeScript-plugin-specific rules — scoped separately from the block
    // above because @typescript-eslint is only registered for ts/tsx/d.ts
    // files upstream; referencing its rules from a .js-inclusive `files`
    // glob throws "could not find plugin".
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      // Style preference, not a bug catcher.
      '@typescript-eslint/array-type': 'warn',
    },
  },
  {
    // Grandfathered: react-hooks/rules-of-hooks is a real bug class
    // (conditional hook calls) — kept at `error` globally. These two
    // screens hit it today; flagged to the founder in the 0.9 report
    // rather than fixed here (fixing them risks changing auth/nav
    // behavior, out of scope for a lint-guardrail pass).
    files: ['src/screens/AccountSetupScreen.tsx', 'src/screens/OAuthSignInScreen.tsx'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    // Grandfathered: no-dupe-keys is real (a later key silently wins) but
    // low-risk style-object duplicates — fixing them means touching
    // screens outside this pass's scope.
    files: [
      'src/screens/RecipeDetailScreen.tsx',
      'src/screens/vault/VaultEarnXPScreen.tsx',
      'scripts/add-recipe-history.ts',
    ],
    rules: { 'no-dupe-keys': 'off' },
  },
  {
    // Grandfathered: genuine duplicate type export, but a content-types
    // file outside this pass's scope.
    files: ['src/types/domain.ts'],
    rules: { 'import/export': 'off' },
  },
  {
    // Grandfathered: `documentDirectory` flagged as missing from the
    // FileSystem namespace — may be a real expo-file-system API-version
    // issue, may be a resolver limitation. Worth a founder look; not
    // guessed at here.
    files: ['src/services/pdfService.ts', 'src/services/uploadService.ts'],
    rules: { 'import/namespace': 'off' },
  },
]);
