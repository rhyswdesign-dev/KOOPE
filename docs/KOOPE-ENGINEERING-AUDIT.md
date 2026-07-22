KŌOPE Engineering Audit
========================

Author: Principal Software Architect review (Claude)
Date: 2026-07-02
Scope: Full repository — architecture, folder structure, naming, dependencies, database, security, authentication, performance, state management, developer experience, testing, deployment, CI/CD, dead code, duplicate logic, technical debt, documentation, scalability.
Method: Static review of the working tree (no runtime penetration testing, no production data access). Findings are evidence-based with file:line citations. This is a snapshot — verify before acting since the codebase is under active development.

---

## Executive Summary

KŌOPE is a functioning, feature-rich product built fast. That speed shows up as real technical debt now sitting directly under the money paths (payments, entitlements) and the data-integrity paths (recipes, vault). Nothing found here is unfixable, and several subsystems (Supabase edge-function auth, backup/DR, OAuth) are actually well built. But the repo is not yet "world-class" — it's a startup-speed codebase that has never had a cleanup pass.

**The five things that matter most, in order:**

1. **A Supabase RLS policy lets any logged-in user overwrite or delete the entire `recipes` table** (`USING (true)` with no ownership check). This is live data-integrity exposure, not theoretical.
2. **The Stripe webhook doesn't actually fulfill payments** — its success/failure handlers are `console.log` stubs with the DB-write logic commented out as a TODO. Combined with an RLS gap on the vault/money tables (documented by the team itself in `supabase/VAULT_MIGRATION_STATUS.md` as `USING (true)`), the entire in-app-currency path is unverified end-to-end.
3. **Firebase was never fully removed.** Despite a documented Firebase→Supabase migration, `FirebaseProvider` is still mounted in `App.tsx`, and recommendation/tracking code still imports Firestore. This is a dual-backend correctness risk, not just clutter.
4. **Analytics SDKs initialize before consent is captured.** `AnalyticsContext` bypasses the app's own `analyticsGuard`/consent-gating utility, so PostHog/Segment likely start tracking before the user answers the consent modal — a privacy-compliance gap.
5. **The repo has no linting, no formatting, no pre-commit hooks, and ~2% test file coverage**, with CI only running typecheck + unit tests. There is currently nothing mechanical stopping the debt above from getting worse.

None of these require a rewrite. They require a focused, prioritized cleanup — laid out below.

---

## 1. Architecture Report

### 1.1 Layering is real but inconsistently followed
- A repository-pattern abstraction exists (`src/repos/interfaces.ts` defines `ContentRepository`/`ProgressRepository`/`UserRepository`) and is correctly implemented for both Supabase and in-memory variants (`src/repos/memory/*`, `src/repos/supabase/contentRepository.ts:116`). The in-memory repos are **not dead** — they're actively used by `LessonEngine.tsx`, `scheduler.ts`, `monetization.ts`.
- But `VaultRepository`, `CurriculumRepository`, and `RecipesRepository` (`src/repos/supabase/recipesRepo.ts:24`) have **no interface at all** — they're concrete Supabase classes, unswappable and untestable in isolation, breaking the pattern the rest of the layer follows.
- 7 screens call `supabase.from/auth/storage/rpc` directly instead of going through services/repos (`SmartScanScreen.tsx`, `BottleDetailScreen.tsx`, `RecipeEditorScreen.tsx`, `EditProfileScreen.tsx`, `SettingsScreen.tsx`, and others) — bypassing whatever centralized caching/error-handling the repo layer provides.
- `recipesRepo.ts` (lines 24–529) is not a thin repo — it embeds a three-layer cache (in-memory `Map`, AsyncStorage with 24h TTL, offline-service fallback) plus background refresh and DB→view-model mapping all in one file. Data access, caching policy, and offline strategy are fused together.

### 1.2 God files
Several files have grown well past a maintainable size, mixing UI, business logic, and direct backend calls:

| File | Lines |
|---|---|
| `src/screens/CocktailDetailScreen.tsx` | 3,872 |
| `src/screens/RecipesScreen.tsx` | 3,622 |
| `src/data/spiritsDatabase.ts` | 3,642 |
| `src/screens/HomeBarScreen.tsx` | 3,332 |
| `src/screens/BottleDetailScreen.tsx` | 3,219 |
| `src/content/unlockDecks.ts` | 2,207 |
| `src/screens/OnboardingQuestionnaireScreen.tsx` | 2,742 |
| `src/screens/LessonsScreen.tsx` | 2,363 |
| `src/screens/HostingScreen.tsx` | 2,046 |

These are the biggest blast-radius risk in the codebase: every change to one of them is high-risk-of-regression by construction, and no one can safely review a diff to a 3,800-line screen in a normal PR review.

### 1.3 Dual backend — Firebase is not actually gone
Contrary to what `FIREBASE_TO_SUPABASE_MIGRATION.md` / `MIGRATION_COMPLETE.md` imply, Firebase code is still live:
- `FirebaseProvider` (`src/context/FirebaseContext.tsx`) is imported and mounted in **`App.tsx:23, 422, 463`**, with active console-error filtering for Firebase errors (`App.tsx:57-58`).
- `src/hooks/useFirestore.ts`, `src/repos/firestore/firestoreRepositories.ts`, `src/lib/testFirestore.ts`, `recommendationTrackingService.ts`, and `behavioralLearning.ts` all still import Firestore — and the latter two are consumed by live UI (`AIRecommendations.tsx`, `RecommendationFeedbackModal.tsx`).
- However, `firebase`/`@firebase/*` packages are **absent from `package.json`** — meaning these code paths may not actually build/run cleanly today (they may be dead-but-uncompiled, or relying on a transitive install). This is worth a direct build check, not an assumption either way.
- **Verdict:** this is a genuine dual-backend hazard — either finish the migration (delete the Firebase paths) or explicitly document why they're still needed.

### 1.4 State management architecture has no single rule
- Auth lives only in `AuthContext` (fine in isolation).
- **Subscription/tier state is duplicated across two systems with a one-way imperative sync**: `SubscriptionContext.tsx` (RevenueCat-backed, plain `useState`) reaches into the Zustand `useUserTier` store via `.getState()` and manually calls `setTier`/`setSubscriptionStatus`/`startTrial` in 5 places (lines 258, 262, 484, 518, 600–601, 668–669). Two consumer hooks (`useSubscription()` vs `useUserTier()`) can disagree transiently — e.g. during a RevenueCat init failure or the dev-tier-override path.
- 15 Zustand stores in `src/store/` generally hold persisted domain data reasonably. But `src/state/vaultState.ts` is a lone outlier file that should just live in `src/store/`, and there may be a *second* vault state source since `contexts/VaultContext.tsx` also exists — worth reconciling.
- `src/context/` (3 files, Firebase-era: Analytics, Firebase, Monetization) vs `src/contexts/` (7 files, current: Auth, Cart, Challenge, Posts, Subscription, User, Vault) is a historical split with no functional reason to remain separate.

### 1.5 Provider nesting and re-renders
- `App.tsx:419–458` nests **9 context providers** at the root (`Analytics → Auth → Challenge → Firebase → Subscription → Monetization → User → Vault → Posts`), all wrapping `NavigationContainer` — well past the ~5-6 smell threshold, and none scoped to subtrees that actually need them.
- **4+ of these providers pass a freshly-created object literal as `value={}` with zero `useMemo`** (`CartContext.tsx:185`, `PostsContext.tsx:67`, `VaultContext.tsx:269`, `UserContext.tsx:81`, and `AuthContext.tsx:195-204`/`SubscriptionContext.tsx:687-711` build unmemoized `value` objects too). Because of the 9-provider stack, a single `setState` deep in one provider (e.g. `setIsPurchasing(true)`) forces a re-render pass through everything nested below it.
- `StripeProvider` is commented out in `App.tsx` (dead scaffolding, lines ~418/467).

### 1.6 Three overlapping payment systems, four analytics SDKs
- **Payments**: RevenueCat (`react-native-purchases`, subscriptions — 3 usage sites), Stripe (`@stripe/stripe-react-native` + `src/lib/stripeApi.ts`, scoped to vault/cash transactions — 1-2 usage sites), and `react-native-iap` (1 usage site plus an Expo config plugin) are **all live simultaneously**, none is dead code, but the boundaries between them (why IAP exists alongside RevenueCat, which itself wraps StoreKit/Play Billing) are undocumented and worth consolidating.
- **Analytics**: `mixpanel-react-native`, `posthog-react-native`, and `@segment/analytics-react-native` are live; `mixpanel-browser` (a **web-only** SDK) has zero import sites anywhere in `src/` — pure dead weight in `dependencies`.

---

## 2. Technical Debt Report

### 2.1 Confirmed dead / orphaned code
| Item | Evidence | Action |
|---|---|---|
| `MixMind/` and `MixedMindsRecipes/` (top-level dirs, the latter ships its own nested `node_modules/`) | Zero import references from `src/` or `App.tsx`; only referenced via `tsconfig.json:32` / `tsconfig.app.json:22` include globs — meaning they're still type-checked despite being orphaned | Delete both dirs and remove the tsconfig globs |
| `App.test-backup.tsx`, `VAULT_EXAMPLE_USAGE.tsx` (repo root) | Zero references anywhere | Delete |
| `EXAMPLE_WHAT_CAN_I_MAKE_BUTTON.tsx` (root) | Only appears in tsconfig include globs, never imported | Delete + remove glob |
| `src/components/ForYouFeed_OLD_BAR_MATCH_STYLE.tsx` | Zero importers | Delete |
| `src/services/recommendationEngine.old.ts` (724 lines, sits beside the 646-line active `recommendationEngine.ts`) | Zero importers | Delete |
| `restore-old-except-featured.js` (root) | Orphaned one-off script | Delete |
| `src/lib/storage.ts` (a central AsyncStorage abstraction) | **Zero internal consumers** — nobody adopted it; meanwhile 49 other files hit `AsyncStorage` directly | Either delete it or make it mandatory and migrate the 49 call sites |
| `@types/jest` devDependency | No jest config exists; project runs on vitest exclusively | Remove |

`tsconfig.json`/`tsconfig.app.json` explicitly exclude `src/**/*OLD*` — this is a working *masking* mechanism for dead code, not a fix. It hides these files from typecheck rather than removing them, and normalizes leaving dead code in the tree going forward.

### 2.2 Duplicate / fragmented logic
- **Recommendation & tracking logic is split across 6 files**: `aiRecommendationEngine.ts`, `behavioralLearning.ts`, `moodBasedRecommendations.ts`, `recommendationEngine.ts`, `recommendationEngine.old.ts`, `recommendationTrackingService.ts` — overlapping responsibility, worth a dedicated consolidation pass.
- **Near-duplicate detail screens**: `BottleDetailScreen.tsx` (3,219 lines) vs `CellarBottleDetailScreen.tsx` (1,014 lines) — both render bottle detail views for different contexts (general catalog vs. owned cellar item); the 3x size disparity strongly suggests copy-pasted rather than shared logic.
- **Repo-layer duplication is structural**, not copy-paste: Content/Progress/User repos correctly share an interface across memory/Supabase implementations; Vault/Curriculum/Recipes repos don't, so the "swap backend for testing" pattern only half-exists (see §1.1).

### 2.3 Technical debt markers
- 33 `TODO`, 5 `HACK`, 1 `XXX`, 1 `@deprecated` (`src/services/vaultService.ts`) across 16 distinct files in `src/`.
- The most consequential TODO in the repo isn't tagged as one in spirit but functionally is: **`stripe-webhook/index.ts`'s payment success/failure handlers are commented-out DB writes** — see Security §3.2.

### 2.4 Database migration chaos
- 38 files in `supabase/migrations/`, nominally numbered `001`–`026`, but with real collisions: **four different `001_*` files** and **seven different `006_vault_*` variants** (`006_vault_cleanup_and_create.sql`, `006_vault_exact_match.sql`, `006_vault_tables_only.sql`, `006_vault_transactions_schema.sql`, `006_vault_transactions_schema_fixed.sql`, `006_vault_transactions_schema_v2.sql`, and `006_vault_with_explicit_casts.sql` — the last of which is a **9-byte file containing the literal text `image.png`**, an accidental paste left in the migration history).
- `supabase/` root additionally holds ~30 ad hoc, non-sequential SQL/MD files (`ADD_RLS_POLICIES.sql`/`_V2`/`_V3`, `VAULT_NO_RLS.sql`, `ENABLE_RLS_ALL_TABLES.sql`, `FIX_FUNCTION_SEARCH_PATH.sql`/`_V2`, `CHECK_RLS_STATUS.sql`, `DIAGNOSTIC_CHECK.sql`, `RUN_ALL_MIGRATIONS.sql`) — clear evidence of manual hotfixing directly against production, outside the tracked migration pipeline. There is currently **no reliable way to determine from the repo alone which policy set is actually live in production.**
- Duplicate-looking tables coexist: `profiles` vs `users_profiles`, `cocktails` vs `recipes` — likely legacy renames that were never cleaned up.
- **Recommendation:** squash the migration history to a single authoritative sequence (via `supabase db diff` against the real production schema), delete the superseded numbered variants, and stop hand-editing SQL outside `migrations/`.

### 2.5 Root-level documentation clutter
67 markdown files sit at the repo root (vs. 22 well-organized files in `docs/`, which is clearly the canonical, actively maintained source — `docs/KOOPE-PRODUCT-BIBLE.md` reads as a live strategy document). Root files cluster into:
- **Image/asset progress logs (11)**: `IMAGE_*` — sequential point-in-time status reports from one asset-fixing effort, several explicitly suffixed `_COMPLETE`/`_SUMMARY`.
- **Vault/tier docs (7-8)**: `VAULT_*` — per project memory, Vault Bars was removed pending commercial partnerships, so most of this cluster documents a rolled-back feature state.
- **"Complete"/"Summary" changelog artifacts (~15)**: `PHASE2_COMPLETE.md`, `MIGRATION_COMPLETE.md`, `CACHE_FIX_COMPLETE.md`, `FIXES_APPLIED.md`, `DAY_7_ANALYTICS_SUMMARY.md`, `WEEK_48_UPDATES.md`, etc. — historical, not living reference material.
- **Setup/integration guides (10-13)**: `SUPABASE_SETUP.md`, `API_SETUP_GUIDE.md`, `REVENUECAT_SETUP.md`, `STRIPE_BACKEND_SETUP.md`, etc. — currency unverified, several are superseded by newer pairs (`PAYWALL_STRATEGY.md` vs `PAYWALL_STRATEGY_REVISED.md`; three overlapping migration docs: `MIGRATION_GUIDE.md`, `FIREBASE_TO_SUPABASE_MIGRATION.md`, `SUPABASE_AUTH_MIGRATION.md`).
- None of these 67 files are cross-referenced from `README.md`, `CONTRIBUTING.md`, or `docs/KOOPE-PRODUCT-BIBLE.md` — the root and `docs/` have grown as two disconnected documentation systems.
- **Recommendation:** archive root `.md` files into `docs/archive/` (or delete outright if superseded), leaving `docs/` as the single canonical source and root holding only `README.md`/`CONTRIBUTING.md`.

### 2.6 Scripts sprawl
`scripts/` holds 66 files; only 13 are wired into `package.json` npm scripts. The remaining ~53 are one-off/dead-pattern scripts — recipe data-fix scripts (`fix-cocktails-properly.py`, `fix-pro-cocktails.ts`, `standardize-glassware.ts`, `delete-duplicates.ts`, `delete-correct-duplicates.ts`), one-time migration scripts (`migrate-recipes-to-supabase.ts`, `create-app-tables.ts`, `run-migrations.ts`), and ad hoc audits (8 `check-*.ts` files). These are historical data-repair artifacts consistent with the recent recipe-audit work (commit `71c486e`) that were never archived. No `scripts/README.md` explains any of them.

### 2.7 Dependency debt
- `mixpanel-browser` — dead, remove (§1.6).
- Meaningfully behind current: `openai` (5.23.0 vs. 6.45.0, major version behind), `react-native-purchases`/`react-native-purchases-ui` (9.6.8 vs. latest major 10.4.1), `react-native-iap` (resolves 12.16.4 vs. latest major 15.3.6), `posthog-react-native` (4.6.0 vs. 4.54.2), `@supabase/supabase-js` (2.76.1 vs. 2.110.0), `eas-cli` (18.0.3 vs. 20.5.1). None of these are blocking, but the payment/data-critical ones (RevenueCat, IAP, Supabase JS) deserve scheduled upgrades rather than indefinite drift.
- `npm audit --production`: **2 critical, 10 high, 25 moderate, 1 low** findings. Critical: `@segment/sovran-react-native`, `shell-quote`. High includes `undici`, `ws`, `tar`, `node-forge`, `markdown-it`. Not remediated as part of this audit — needs a dedicated triage pass, prioritizing `shell-quote` (command-injection class) and the network-facing `undici`/`ws`.

### 2.8 TypeScript hygiene gaps
- `tsconfig.json` has `strict: true` and all the strong sub-flags (`strictNullChecks`, `noImplicitAny`, etc.) — genuinely strict on paper.
- But `noUnusedLocals`/`noUnusedParameters` are both explicitly `false`, meaning unused-variable/import dead code is invisible to typecheck. This is very likely masking cruft beyond what was found by grep in this audit.
- `npm run typecheck` currently **passes cleanly with zero errors** — a good foundation to tighten from.

---

## 3. Security Report

Findings are ranked by severity. This is the most consequential section — several of these are live, not theoretical.

### 3.1 CRITICAL — Recipes table is writable by any authenticated user
`supabase/migrations/002_create_recipes_table.sql:38-43`:
```sql
CREATE POLICY "Allow authenticated users to manage recipes"
  ON recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
Every logged-in user can INSERT/UPDATE/DELETE **any row** in `recipes`, not just their own content — not just a read exposure, a full write/delete exposure on the entire catalog. This policy is never dropped in later migrations. (A separate, correctly `auth.uid() = user_id`-scoped policy set targeting a table also named `recipes` exists in `002_app_data_schema.sql` — there appear to be two competing migrations for a `recipes` table, and it's unclear from the repo alone which one is authoritative in production. This needs to be resolved by inspecting the live schema directly, not assumed from file order.)
**Impact:** any authenticated user (i.e., any signed-up user) can vandalize or wipe the recipe catalog.
**Fix:** drop the permissive policy, replace with read-for-all / write-for-owner-or-service-role, and verify against the live database which policy is actually active.

### 3.2 CRITICAL — Vault/money tables have an RLS gap, and Stripe fulfillment is a stub
- `supabase/migrations/006_vault_tables_only.sql` creates `user_vault_profiles`, `vault_transactions`, `xp_transactions`, `vault_carts` and grants `GRANT ALL ... TO authenticated` with **no RLS enabled in the tracked migration**.
- The team's own `supabase/VAULT_MIGRATION_STATUS.md` documents that a follow-up fix shipped `USING (true)` — i.e. every authenticated user can read/write every user's vault/XP rows — due to a `uuid = text` cast bug encountered while trying to scope by `auth.uid() = user_id`.
- A corrected version (`supabase/ADD_RLS_POLICIES_V3.sql`, casting both sides to `::text`) exists **outside** `migrations/`, with a comment noting "if this doesn't work, policies must be added via Dashboard UI" — there's no migration-tracked proof correct RLS is live today.
- Separately, `supabase/functions/stripe-webhook/index.ts:59-107` correctly verifies the Stripe signature, but **all three event handlers (`payment_intent.succeeded/failed/canceled`) only `console.log` — the actual write to `vault_transactions` is a commented-out TODO.** Purchases currently don't get fulfilled through this path.
- `create-payment-intent/index.ts:37-44` validates `amount` is a positive integer but never checks it against a real server-side price for the vault item being purchased — the client supplies the charge amount directly.
**Impact:** the entire in-app-currency/vault money path has an open read/write RLS gap on top of unimplemented fulfillment logic and a client-trusted charge amount. This is the highest-priority backend item in the whole audit.
**Fix:** confirm and lock down RLS on all four vault tables against the live DB, implement the Stripe webhook handlers for real, and add server-side price verification to `create-payment-intent`.

### 3.3 HIGH — Analytics SDKs likely initialize before consent is captured
`AnalyticsContext.tsx:31` calls `useAnalytics()`, which unconditionally runs `initializeAnalytics()` in a `useEffect` on mount (`useAnalytics.ts:37-38`) — with **no consent check**. A separate, well-built consent-gating utility exists (`src/lib/analyticsGuard.ts`, wrapping `useConsent()`) but `AnalyticsProvider` — mounted at the app root in `App.tsx:419` on every launch — uses the unguarded hook instead. `ConsentModal.tsx` itself is well designed (essential can't be disabled, marketing defaults off, analytics defaults off in strict-privacy regions per `isStrictPrivacyRegion()`), but that design isn't wired to the SDK init path.
**Impact:** PostHog/Segment SDKs likely begin session/device tracking before the user answers the consent modal — a GDPR/CCPA/App Store privacy-disclosure gap.
**Fix:** route `AnalyticsContext` through `analyticsGuard` so `.init()` itself, not just event tracking, is deferred until consent is captured.

### 3.4 HIGH — Age verification is entirely client-side
`src/screens/AgeGateScreen.tsx`: user types a DOB, `evaluateAgeEligibility()` runs locally, `onVerified()` fires with no server round-trip and no persisted verification record tied to the authenticated user visible in this screen. Nothing stops re-entering the screen with a different DOB or bypassing it via client state manipulation.
**Impact:** for an alcohol-content app, this is a legal/compliance risk, not just a technical one, if age-gating is meant to be an actual control rather than a UX nicety.
**Fix:** if age verification needs to be a real control (vs. informational UX), persist the verified DOB/flag server-side tied to the user record, and gate alcohol content server-side too.

### 3.5 MEDIUM — Session tokens stored in AsyncStorage, not SecureStore
`src/lib/supabase.ts:18`: Supabase auth session (access/refresh tokens) persists via `AsyncStorage` — unencrypted on-device storage. `expo-secure-store` is already a project dependency but isn't used for this.
**Fix:** swap the Supabase client's storage adapter to `expo-secure-store`.

### 3.6 MEDIUM — Tier/entitlement has two sources of truth in edge functions
`recipe-format` derives tier from `user.user_metadata?.tier` (a JWT claim), while `ai-proxy` and `vision-analyze` query the `user_subscriptions` table directly. If `user_metadata.tier` isn't kept in lockstep with `user_subscriptions` (e.g. on downgrade/cancellation), `recipe-format`'s gate could be stale.
**Fix:** pick one source of truth (the `user_subscriptions` table is the safer one, since it isn't client-cacheable via JWT) and use it everywhere.

### 3.7 MEDIUM — Free-tier count limits appear to be UI-only
`src/config/tierAccess.ts` defines caps like `maxSavedCocktails`/`inventoryLimit`, but these were only confirmed as UI-level gates. RLS as reviewed enforces row *ownership*, not row *count* — no DB trigger/function enforcing "FREE tier: 10 bottles" was found. Combined with the RLS gaps above, this needs a dedicated check: can a user with direct Supabase client access exceed their tier's row caps by calling the SDK directly?

### 3.8 LOW severity items
- `confirm-payment-intent/index.ts:46` doesn't verify the caller owns the `paymentIntentId` before confirming it (low practical risk — Stripe also requires the client secret).
- `vision-analyze/index.ts:60-63`: the rate-limit check fails open on RPC error — a DB hiccup could let a user bypass daily scan caps.
- `.env.example` still declares a client-exposed `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` even though the real key is correctly server-only (`GOOGLE_VISION_API_KEY`, used only in the `vision-analyze` edge function). The unused client-prefixed var is a landmine for a future developer who might wire it into the client bundle by mistake — remove it from `.env.example`.

### 3.9 What's actually solid (don't touch without reason)
- OAuth (Google/Apple) correctly exchanges provider tokens via `supabase.auth.signInWithIdToken()` — server-side validated, not client-trusted.
- Edge function JWT verification is consistently implemented across `ai-proxy`, `vision-analyze`, `recipe-format`, `voice-transcribe`, `spirit-lookup`, `create-payment-intent`, `confirm-payment-intent`.
- `stripe-webhook` signature verification is correct.
- Dev-tier override (`EXPO_PUBLIC_DEV_TIER_OVERRIDE`) is gated behind `__DEV__` everywhere it's used, and RevenueCat strict mode fails closed in production rather than silently granting a tier.
- Backup/DR (`docs/BACKUP_RUNBOOK.md`, `scheduled-backup` edge function, `pg_cron` via migration `023_backup_schedule.sql`, a `backup_log` audit table) is a genuine, well-specified plan with real RTO/RPO targets — not just a document. The one open risk is whether the `pg_cron` GUC variables (`app.supabase_url`, `app.service_role_key`) were actually set post-migration, which the runbook itself flags as an easy-to-forget manual step.

---

## 4. Performance & State Management Findings (supporting detail for §1.4–1.5)

- **Memoization adoption is sparse**: across ~293 component/screen files, only 3 use `React.memo`, 37 use `useMemo`, 27 use `useCallback` (~10-13% of files). List-item components rendered inside `.map()`/`FlatList` are almost never memoized, meaning a single keystroke in a search box likely re-renders the full visible list.
- **List virtualization is inconsistent**: `BottleSearchScreen.tsx` correctly uses `FlatList` with `keyExtractor`; `CocktailListScreen.tsx` and `CategoriesListScreen.tsx` use `ScrollView` + `.map()` with no virtualization. Across the codebase, 55 screens use `ScrollView`+`.map()` vs. only 9 using `FlatList`, and 0 using `SectionList` — no apparent rule for when virtualization is required.
- **Animation components bypass Reanimated entirely**: `CompletionAnimation.tsx` and `QuickFeedbackAnimation.tsx` use the legacy RN `Animated` API exclusively, despite `react-native-reanimated ~4.1.1` being a declared dependency. `useNativeDriver: true` is set consistently (so not full JS-thread jank), but `CompletionAnimation.tsx:264-268` computes `Math.random()` inline in render for sparkle positions — recalculated every render, not just on animation start.
- **AsyncStorage is used directly by 49 files** with no central abstraction actually adopted (`src/lib/storage.ts` exists but has zero consumers — see §2.1). Risk: key collisions, inconsistent serialization, and no single place to clear storage correctly on logout, which matters given the dual auth/subscription state described in §1.4.
- **No code-splitting**: all 101 screens are statically imported in `RootNavigator.tsx`/`Tabs.tsx` (68 top-level imports confirmed in `RootNavigator`). This is standard for React Native (Metro doesn't support route-based code-splitting the way web bundlers do), so it's lower-severity than it sounds, but worth knowing as a fixed cost of the current navigation structure.

---

## 5. Developer Experience & Testing Report

- **No linting or formatting anywhere.** No `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` in the repo. No `lint`/`format` npm script. CI does not run one. Combined with `noUnusedLocals`/`noUnusedParameters` disabled (§2.8), there is **no automated code-hygiene enforcement at all** beyond raw type structure.
- **No pre-commit hooks.** No `.husky/`, no `prepare` script, no lint-staged config — nothing blocks a bad commit locally before CI (and CI itself only runs typecheck + tests).
- **Test coverage is roughly 2% by file count**: 11 test files against 481 non-test `.ts`/`.tsx` files in `src/`. `npm run test:run` passes cleanly (136 tests, 1.27s) and the tests that exist are genuine (real fixtures, real assertions — not smoke tests), but there are **zero screen tests and effectively zero component tests** for a 101-screen, 147-component app.
- **No E2E/integration tooling** — no Detox, Maestro, Playwright, or Appium anywhere. `src/tests/surveyFlow.e2e.test.ts` is misleadingly named — it's a vitest unit test, not a device-level E2E test.
- **CI (`ci.yml`) is minimal**: checkout → `npm ci` → stub env vars → `typecheck` → `test:run`. No lint gate, no build verification, no E2E gate, no deployment step.
- **README.md is stale and actively misleading**: it still describes a Firebase-based MVP ("Backend: Firebase (Auth + Firestore)", pending items that are actually long since built), with a "Getting Started" section that's just `npm install && npm start` and references placeholder Expo boilerplate text that doesn't exist in the app anymore. It omits the actual Supabase setup, the 12 env-var groups in `.env.example`, and EAS/native build requirements entirely.
- **`CONTRIBUTING.md` is the actually-current, useful document** (branch strategy, PR checklist, Supabase migration conventions, secrets handling) — but it assumes local setup already works, which nothing else in the repo actually explains end-to-end.
- **Scripts have no discoverability layer**: of 20 npm scripts, only `typecheck`/`test:run` are referenced anywhere in `CONTRIBUTING.md`. The other ~14 (`validate:revenuecat`, `supabase:migrate`, `recipes:upload-missing`, `images:fix`, etc.) have no documentation of when/why to run them — pure tribal knowledge.

---

## 6. Deployment & CI/CD Report

- **No deployment automation exists.** `.github/workflows/` has `ci.yml` (typecheck + test only) and `refresh-challenges.yml` (a correctly-secured daily cron hitting a Supabase edge function via `${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}` — no leakage). Neither triggers `eas build`/`eas submit` or any native build/deploy step. Release is entirely manual, presumably via local `eas-cli` invocations.
- **Release process is documented but unenforced.** `docs/release-submission-checklist.md` and `docs/release-smoke-runbook.md` are current (dated 2026-02-23), structured with P0/P1/P2 priorities, and honestly self-report unresolved blockers (RevenueCat production keys missing from `.env`, real-device IAP untested, account deletion unverified). This is genuinely good practice — the gap is that nothing in CI ties a release to this checklist being green; it's a manual walkthrough.
- **Minor naming inconsistency**: the iOS native project directory is `ios/KOPE` (not `ios/KOOPE`) — `ios/KOPE.xcodeproj`, `ios/KOPE/Info.plist`. The bundle ID (`com.koope.app`) and display name inside the plist are correct; this is cosmetic, likely a leftover from an early working name, but confusing for onboarding engineers and worth a rename when convenient.
- `eas.json` is minimal but clean — no embedded secrets, `production.autoIncrement: true`, an empty `submit.production` profile (no auto-submit configured).

---

## 7. Prioritized Improvements

**P0 — fix before the next release, security/data-integrity blocking:**
1. Verify the live Supabase schema and lock down the `recipes` table RLS policy (§3.1) — confirm which of the two competing `recipes` migrations is actually applied, then drop the `USING (true)` write policy.
2. Verify and correct RLS on `user_vault_profiles`, `vault_transactions`, `xp_transactions`, `vault_carts` against the live DB (§3.2).
3. Implement the Stripe webhook's actual `vault_transactions` writes (currently `console.log` stubs) and add server-side price verification to `create-payment-intent` (§3.2).
4. Route analytics SDK initialization through the existing `analyticsGuard`/consent gate instead of the unguarded `useAnalytics()` path (§3.3).
5. Resolve the Firebase-vs-Supabase dual-backend state: either finish deleting Firebase code paths or explicitly document why they remain (§1.3).

**P1 — high-value, not urgent-urgent:**
6. Move Supabase session storage from AsyncStorage to `expo-secure-store` (§3.5).
7. Reconcile the tier/entitlement source of truth across edge functions (`user_metadata` vs. `user_subscriptions`) (§3.6).
8. Verify whether free-tier count limits (saved cocktails, inventory) are enforced anywhere below the UI layer; add DB-level enforcement if not (§3.7).
9. Triage `npm audit` findings (2 critical, 10 high), prioritizing `shell-quote` and `undici`/`ws` (§2.7).
10. Squash the `supabase/migrations/` history into one authoritative, non-colliding sequence; delete the ~30 ad hoc SQL files at `supabase/` root once reconciled into tracked migrations (§2.4).
11. Add ESLint + Prettier + a CI lint gate; add a pre-commit hook (Husky + lint-staged) for typecheck/lint on staged files (§5).
12. Reconcile `SubscriptionContext` and `useUserTier` into a single source of truth for tier state (§1.4).

**P2 — meaningful cleanup, schedule deliberately:**
13. Wrap all Context `value={}` props in `useMemo`; consider collapsing/scoping the 9-provider stack in `App.tsx` (§1.5).
14. Delete confirmed dead code: `MixMind/`, `MixedMindsRecipes/`, `App.test-backup.tsx`, `VAULT_EXAMPLE_USAGE.tsx`, `EXAMPLE_WHAT_CAN_I_MAKE_BUTTON.tsx`, `ForYouFeed_OLD_BAR_MATCH_STYLE.tsx`, `recommendationEngine.old.ts`, `restore-old-except-featured.js`, and the corresponding tsconfig include globs (§2.1).
15. Either delete `src/lib/storage.ts` or make it mandatory and migrate the 49 direct-AsyncStorage call sites onto it (§2.1, §4).
16. Archive the 67 root `.md` files into `docs/archive/`, leaving `docs/` as the sole canonical documentation source; rewrite `README.md` to reflect the actual current stack (Supabase, not Firebase) and real setup steps (§2.5, §5).
17. Remove `mixpanel-browser` and `@types/jest`; schedule upgrades for `openai`, `react-native-purchases`, `react-native-iap`, `@supabase/supabase-js` (§1.6, §2.7).
18. Consolidate the 6-file recommendation/tracking logic cluster (§2.2).
19. Break up the largest god files (`CocktailDetailScreen.tsx`, `RecipesScreen.tsx`, `spiritsDatabase.ts`, `HomeBarScreen.tsx`, `BottleDetailScreen.tsx`) into smaller composable pieces, starting with whichever is touched most often in upcoming feature work (§1.2).
20. Merge `src/context`→`src/contexts`, `src/state`→`src/store`, `src/modals`→`src/components/modals` (§1.4, folder hygiene).

**P3 — quality-of-life, do opportunistically:**
21. Add `React.memo` to list-item components rendered inside `.map()`/`FlatList`; standardize on `FlatList` for any list that can exceed ~20 items.
22. Migrate `CompletionAnimation.tsx`/`QuickFeedbackAnimation.tsx` from the legacy `Animated` API to Reanimated worklets; fix the inline `Math.random()` in render.
23. Archive the ~53 orphaned one-off scripts in `scripts/` into a `scripts/archive/` folder or delete them; add a `scripts/README.md` for the ones that remain.
24. Rename `ios/KOPE` → `ios/KOOPE` when a native project touch is otherwise scheduled anyway.
25. Add basic screen-level smoke tests before adding E2E tooling; evaluate Maestro (lighter-weight than Detox for Expo apps) once smoke coverage exists.

---

## 8. Refactoring Roadmap

This is sequenced so each phase reduces risk for the next, rather than doing the flashiest fix first.

**Phase 0 — Stop the bleeding (days, not weeks)**
Verify and lock down RLS on `recipes` and the vault tables against the *live* database (not just the migration files, which are known to be unreliable — §2.4). This is the only phase where the fix is "flip a policy," and it closes the two CRITICAL findings.

**Phase 1 — Make the money path trustworthy**
Implement real Stripe webhook fulfillment, add server-side price verification, reconcile the tier-source-of-truth split between edge functions, and confirm free-tier limits are enforced below the UI. Ship this before scaling paid acquisition — an unverified payment/entitlement path is a cost center, not just a bug.

**Phase 2 — Finish the Supabase migration for real**
Delete the Firebase code paths (`FirebaseProvider`, `useFirestore`, `firestoreRepositories`) or replace their remaining consumers (`recommendationTrackingService.ts`, `behavioralLearning.ts`) with Supabase equivalents. This removes a whole class of "which backend actually wrote this" bugs and lets you delete the `firebase`/`@firebase` root directories outright.

**Phase 3 — Put a floor under the codebase**
Add ESLint + Prettier + pre-commit hooks + a CI lint gate. Enable `noUnusedLocals`/`noUnusedParameters`. This phase doesn't fix anything by itself, but it stops every subsequent phase's cleanup from silently regressing.

**Phase 4 — Consolidate state**
Collapse the Context/Zustand duplication for subscription/tier state into one source of truth; memoize the 9 root providers; merge the duplicate folder pairs (`context`/`contexts`, `state`/`store`, `modals`/`components/modals`).

**Phase 5 — Break up the god files**
Start with whichever of `CocktailDetailScreen.tsx`/`RecipesScreen.tsx`/`BottleDetailScreen.tsx` is scheduled for feature work next — refactor opportunistically as part of real feature PRs rather than as a standalone rewrite project (lower risk, and the diff review value is immediate).

**Phase 6 — Repository & documentation hygiene**
Delete confirmed dead code, squash the migration history, archive root markdown into `docs/archive/`, rewrite `README.md`, prune `scripts/`. Do this after Phases 0-2 so you're not archiving docs about a migration that isn't actually finished yet.

**Phase 7 — Testing investment**
Once Phase 3's lint/format floor exists and the god files from Phase 5 are smaller, testing ROI goes up sharply — a 3,800-line screen is nearly untestable; a decomposed one isn't. Add screen-level smoke tests for the top 10 highest-traffic screens, then evaluate Maestro for real E2E coverage of the purchase and onboarding flows specifically (the two flows where a regression is most expensive).

---

## 9. Developer Roadmap

Process and team-facing changes, distinct from the code-level refactoring roadmap above:

1. **Definition of Done should require passing lint once §3 (Phase 3) ships** — currently "typecheck + tests pass" is the only bar (per `CONTRIBUTING.md`), and neither typecheck nor tests catch the dead-code/duplication patterns found throughout this audit.
2. **New CI gate before merge**: lint, then typecheck, then test — in that order so cheap checks fail fast.
3. **A "no new root `.md` files" convention**: all new documentation goes into `docs/`, following the pattern `docs/KOOPE-PRODUCT-BIBLE.md` already establishes. This is a one-line rule that prevents the 67-file sprawl from recurring.
4. **A "no migrations outside `supabase/migrations/`" convention**: the ~30 ad hoc SQL files at `supabase/` root are the direct cause of the current RLS uncertainty. Any hotfix, however urgent, should land as a numbered migration, not a loose `.sql` file.
5. **Rewrite `README.md` as the very first Phase-6 task** — right now it actively misleads a new contributor about the backend the app uses.
6. **Consider a lightweight architecture decision record (ADR) habit** for exactly the kind of choice that caused the current mess — "why do we have RevenueCat *and* Stripe *and* react-native-iap" is a one-paragraph ADR that would have saved this audit an investigation.
7. **Assign explicit ownership for the vault/payments subsystem** — it's the one area of the codebase where "move fast" has already produced a live security gap (§3.2); it's the area that most needs a named owner and a slower change process going forward.

---

## Appendix — Methodology note

This audit was produced by parallel static review across six domains (architecture/dead-code, dependencies/CI-CD, database/backend, security/auth, state/performance, testing/DX/docs), each independently verifying claims against the actual file contents (not just filenames or assumptions) before reporting. Two findings were independently corroborated by separate reviewers (the Firebase dual-backend issue, found by both the architecture and database passes), which increases confidence in those specific findings. All file:line references reflect the state of the repository at the time of this review (2026-07-02) — verify currency before acting, especially for the Supabase RLS findings, which depend on the *live* database state, not just the migration files in this repo.
