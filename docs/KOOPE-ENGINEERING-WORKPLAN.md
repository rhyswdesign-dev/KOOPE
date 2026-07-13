# KŌOPE Engineering Work Plan — Phases 0–4

**Status:** Execution companion to [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md) (canonical strategy).
**Date:** 2026-07-02
**Grounding:** every task below names real files/tables verified in the working tree on this date. Sizes assume a solo founder + Claude Code: **S** ≤ half day · **M** 1–2 days · **L** 3–5 days · **XL** 1–2 weeks.
**Rule:** phases have exit gates, not deadlines. A phase is done when its acceptance checks pass, not when its time runs out. God files (`CocktailDetailScreen.tsx` 3.9k lines, `RecipesScreen.tsx` 3.6k, `HomeBarScreen.tsx` 3.3k, `BottleDetailScreen.tsx` 3.2k) are decomposed **opportunistically**: any task that touches one extracts what it touches — no big-bang rewrite.

---

## Phase 0 — Foundation & the Cut (~4 weeks)

Everything here either closes a live security/compliance hole, deletes weight, or installs the North Star sensor. Order within the phase matters and is given.

### 0.1 Security: RLS on the money and data-integrity paths — **M, do first**
- New migration `027_fix_recipes_rls.sql`: replace the permissive policies at `supabase/migrations/002_create_recipes_table.sql:35` and `:42` (`USING (true)` on UPDATE/DELETE). Public recipes: `SELECT` for all; write/delete only `auth.uid() = created_by` (add/backfill `created_by` if absent); catalog rows owned by a service role only.
- New migration `028_vault_rls.sql`: apply the ownership policies the team already documented as missing in `supabase/VAULT_MIGRATION_STATUS.md` (vault profiles, transactions). `VAULT_NO_RLS.sql` must stop being the deployed state.
- Sweep the ~35 ad-hoc SQL files in `supabase/` root (`ADD_RLS_POLICIES*.sql`, `VAULT_*.sql`, `FIX_*.sql`, `STEP*.sql`): anything live gets a numbered migration; everything else moves to `supabase/archive/` so the migrations dir is the single source of truth.
- **Accept:** a second test user cannot modify/delete another user's rows or the shared catalog, proven by a small SQL test script committed to `supabase/__tests__/`.

### 0.2 Payments: one system (RevenueCat) — **M**
- Delete the Stripe vault-cash path: edge functions `supabase/functions/stripe-webhook/` (its fulfillment handlers are `console.log` stubs — nothing real is lost), `create-payment-intent/`, `confirm-payment-intent/`; app code `src/lib/stripeApi.ts`, `src/config/stripe.ts`; dead `StripeProvider` scaffolding in `App.tsx`; `@stripe/stripe-react-native` from `package.json`; `docs/DEPLOY_STRIPE_FUNCTIONS.md` → archive.
- Delete `react-native-iap`: `src/services/iap.ts`, the Expo config plugin entry in `app.json`, the dependency.
- **Accept:** `react-native-purchases` (+`-ui`) is the only payment dependency; grep for `stripe|react-native-iap` in `src/` returns nothing; app builds.

### 0.3 Analytics: one SDK, consent-first — **M**
- Keep **Mixpanel** (funnels already wired and verified per implementation-plan item 15). Delete `posthog-react-native`, `@segment/analytics-react-native`, `@segment/sovran-react-native`, and the web-only `mixpanel-browser`; remove `src/services/analytics.posthog.ts`, `analytics.segment.ts`.
- Fix the compliance gap (Audit finding #4): `src/context/AnalyticsContext.tsx` must route through the existing consent guard — no SDK init, no event, no device ID until the `ConsentModal` answer is stored. Add a queued-events buffer for pre-consent taps that are dropped (not sent) if consent is declined.
- **Accept:** fresh install with network inspector shows zero analytics traffic before consent; single `analytics.ts` facade is the only import site (`grep -rn "mixpanel\|posthog\|segment" src/` hits one service).

### 0.4 Firebase excision — **M**
- Unmount `FirebaseProvider` from `App.tsx` (lines ~23/422/463) and delete `src/context/FirebaseContext.tsx`, `src/hooks/useFirestore.ts`, `src/repos/firestore/`, `src/lib/testFirestore.ts`, `src/config/firebase.ts`, `src/config/firestoreSchema.md`, `src/components/debug/FirebaseStatus.tsx`, and the Firebase console-error filters in `App.tsx:57-58`.
- `recommendationTrackingService.ts` and `behavioralLearning.ts` (Firestore importers consumed by live UI — `AIRecommendations.tsx`, `RecommendationFeedbackModal.tsx`): port their write paths to Supabase tables (`014_brand_insights.sql` area) or stub to the local `useTasteModel` store if the data isn't read anywhere yet — check readers first.
- **Accept:** `grep -rn "firebase\|firestore" src/ App.tsx` → 0 hits; migration docs updated to say DONE truthfully.

### 0.5 The Kill List: screens, dirs, dead code — **M**
Delete, including nav registrations in `src/navigation/RootNavigator.tsx` (Events at :247, KingsCup at :347) and `Tabs.tsx`:
- `EventsScreen.tsx`, `KingsCupScreen.tsx`, `GameDetailsScreen.tsx`, `CommunityScreen.tsx` (stub), `MapScreen.tsx`, `MapsScreen.tsx`, duplicate `TermsScreen.tsx` (keep `TermsOfServiceScreen.tsx`), `src/components/ForYouFeed_OLD_BAR_MATCH_STYLE.tsx`, `src/services/recommendationEngine.old.ts`.
- Root-level: `MixMind/`, `MixedMindsRecipes/` (ships nested `node_modules`), `App.test-backup.tsx`, `VAULT_EXAMPLE_USAGE.tsx`, `EXAMPLE_WHAT_CAN_I_MAKE_BUTTON.tsx`, `restore-old-except-featured.js`; remove their `tsconfig.json`/`tsconfig.app.json` include globs **and** the `src/**/*OLD*` exclude (dead code gets deleted, never masked).
- Commerce mocks: `src/screens/commerce/CartScreen.tsx`, `CheckoutScreen.tsx`, `ShoppingCartScreen.tsx`, `src/store/useShoppingCart.ts`, `src/contexts/CartContext.tsx` (commerce returns in Phase 3 as affiliate links out — no fake checkout ships).
- Also deletable with their features: `react-native-google-mobile-ads` + `src/services/ads.ts` if unused by any live surface (verify), `src/store/useLives.ts` (Duolingo-remnant daily mechanic — see 0.6), `@types/jest` devDep (project is vitest).
- **Accept:** typecheck passes; screen count measurably down; `npx tsc --noEmit` clean; no route in RootNavigator points at a deleted screen.

### 0.6 Gamification → one spine, weekly cadence — **L**
- `src/store/useXPSystem.ts`: remove daily XP caps; convert streak logic (lines ~282–305) from daily to **weekly** ("made something this week"); XP → Level → Unlocks is the only progression math left.
- Vault keys die as a currency: `src/config/vaultTypes.ts` / `vaultData.ts` / `vaultBenefits.ts` / `vaultContent.ts` / `vaultIndex.ts` — vault items become **level-gated** (reuse `recipeUnlocks.ts` pattern). Reconcile the duplicate state: keep `src/contexts/VaultContext.tsx` or `src/state/vaultState.ts`, not both (audit flag); whichever survives moves to `src/store/`.
- Achievements fold into XP milestones: `achievementService.ts` + `achievementServiceSupabase.ts` reduce to milestone definitions feeding the spine; `AchievementsScreen.tsx` becomes a section of the You tab, not a system.
- Challenges survive untouched as the verb layer (`challengeService.ts`, rotation migrations 024/026 stay).
- **Accept:** a new user can be told the whole system in one sentence ("do things → XP → level up → unlock recipes"); no parallel currencies in any UI copy.

### 0.7 Tier collapse: FREE / KŌOPE+ — **L**
- `src/config/tierAccess.ts` + `featureRegistry.ts`: two tiers. Everything currently PLUS **or** PRO → KŌOPE+ (full catalog, Make It Anyway flag, hosting suite, cellar analytics, unlimited bottles). FREE keeps: unlimited scan, 10 bottles, 9 classics + XP unlocks, 3 post-scan matches, all network-view surfaces.
- `src/constants/subscriptions.ts`: products reduce to `plus_monthly` / `plus_yearly` ($7.99 / $59.99); `src/store/useUserTier.ts` maps legacy `pro` → `plus` for any persisted state; `SubscriptionContext.tsx` entitlement mapping updated — and while in there, fix the audit's state-duplication flag by making `useUserTier` derive from the RevenueCat customer-info listener instead of 5 imperative `.getState()` sync sites.
- `src/config/paywallTriggers.ts`: T1–T13 reduce to **three** desire-peak triggers (greyed 4th post-scan recipe · almost-makeable recipe · hosting gate) + the bottle-cap trigger. All other `navigate('Paywall')` call sites route through these or are removed.
- `PaywallScreen.tsx`: single-tier layout, annual-first, hardcoded plans replaced by RevenueCat offering metadata (activation itself is Phase 2).
- **Accept:** `grep -rn "'pro'" src/config src/constants` → only the legacy-mapping shim; every paywall presentation logs which of the 3 triggers fired.

### 0.8 Made It logging — the North Star sensor — **M, ships before Phase 0 exits**
- Migration `029_made_events.sql`: `made_events(id, user_id, recipe_id, made_at, source enum('recipe_detail','tonights_pick','hosting','whatcanimake'), substitutions_used jsonb null, rating smallint null)` + RLS (owner-only) + index on `(user_id, made_at)`.
- `src/services/makeLogService.ts`: one write path; fires XP into the spine; updates `useTasteModel` (repeat-make = strongest taste signal); emits the `made_it` analytics event.
- UI: one-tap **"I made this"** button at the end of the recipe flow in `CocktailDetailScreen.tsx` and `RecipeDetailScreen.tsx` (extract a shared `MadeItButton` component — first bite out of the god files). Weekly streak reads from this table.
- **Accept:** Weekly Makers is a computable query; the event flows to Mixpanel; making twice shows "made 2×" on the recipe card (scaffold data for Phase 3).

### 0.9 Guardrails so the debt never returns — **S–M**
- Add ESLint + Prettier + a pre-commit hook (typecheck + lint on staged files); CI gains lint. Vitest coverage requirement scoped to the money paths only (`tierAccess`, `SubscriptionContext` entitlement mapping, `makeLogService`).
- Provider stack: with Cart/Firebase/Monetization contexts deleted, `App.tsx` drops to ~6 providers; memoize `value={}` in the survivors (`AuthContext.tsx:195`, `SubscriptionContext.tsx:687`, `UserContext.tsx:81`, `VaultContext` survivor, `PostsContext` — or delete PostsContext too if Community died with 0.5; verify importers).
- Challenge-rotation cron has no failure alerting: `refresh-challenges.yml` runs daily with no `on: failure` step and no confirmation GitHub's default failure-email is reaching anyone — same class of silent-cron risk already flagged for `pg_cron`/backups in Audit §3.9. Add a failure notification step. Separately, confirm in production whether migration `026_challenge_rotation_recovery.sql`'s one-time dedupe DELETE (lines 10–22) orphaned any `user_challenge_progress` rows via its `ON DELETE CASCADE` FK (`001_challenges_schema.sql:42`) — it deleted duplicate `challenges` rows without reassigning progress first. Can't undo, but worth knowing the blast radius. Standing rule going forward: any future delete touching `challenges.id` reassigns progress via `UPDATE` before deleting, never relies on cascade.

### 0.10 Fix the recipe-URL-import path — **M**
Audit-adjacent finding, not in the original audit: pasting a recipe URL currently does nothing useful.
- Two screens do this job. `URLRecipeInputScreen.tsx` (305 lines, registered in `RootNavigator.tsx:446`) has **zero navigate-to call sites anywhere in `src/`** — pure dead code, delete it and its route (folds into 0.5's kill list). `RecipeURLImportScreen.tsx` (537 lines) is the live one, reached from `CameraHubScreen.tsx:277` and `deepLinking.ts:170`.
- Both screens navigate with `nav.navigate('AIRecipeFormat', { recipeUrl: url })`. But `AIRecipeFormatScreen.tsx` (613 lines) only ever reads `route.params.recipe` and `route.params.startWithManual` — `recipeUrl` is never referenced anywhere in the file. Confirmed by direct grep, not inference. Net effect: paste a URL → land on Format Recipe → see a blank manual-entry form, no error, no indication the paste did anything.
- Fix: add one new edge function, `recipe-url-fetch` — server-side GET of the URL (avoids client CORS and keeps any future scraping-service key server-only), extract via schema.org `Recipe` JSON-LD first, plain-text fallback. Returns `{ extractedText, title, imageUrl }`. Have `RecipeURLImportScreen` call it, then navigate with `{ recipe: { extractedText, sourceUrl, imageUrl } }` — reuse the exact contract `OCRCaptureScreen.tsx:220` already uses successfully, don't invent a second shape.
- **Accept:** pasting a real recipe URL lands on Format Recipe pre-filled with title/ingredients, not a blank form; `grep -rn "URLRecipeInputScreen" src/` returns nothing.

**PHASE 0 EXIT:** RLS test script green · one payment system · one analytics SDK, consent-first · zero Firebase · kill list merged · one XP spine · two tiers · Made It live and reporting. *App Store submission-ready at every merge.*

---

## Phase 1 — The Wedge (~6 weeks)

### 1.1 The Answer Card — **XL, the flagship build**
New `src/screens/scan/AnswerCardScreen.tsx` (replaces the post-scan portion of `SmartScanScreen.tsx`; extract shared pieces from `BottleDetailScreen.tsx` rather than duplicating it — second bite of the god file):
- **Identity block** (guarantee): name, style, proof, "what it tastes like," 1-line story. Backed by `supabase/functions/spirit-lookup` + `018_spirits_cache.sql`; add a fallback chain so *every* scan renders the full package (cache → edge lookup → AI-proxy enrichment → honest "help us identify this" manual path that feeds `025_scan_corrections.sql`).
- **Value line**: see 1.2.
- **The hook**: "Owning this unlocks N cocktails with your shelf" — compute N from `missingIngredientService.ts` against `useMultiBar` inventory; render 3 free-pool recipe cards + greyed 4th (trigger #1). The 3-free rule partially exists (implementation-plan item 1 ✅) — this formalizes it as the card's contract.
- **Actions row**: Add to Bar (Owned) · Want it (price capture inline — seeds the price journal) · **Gift mode** toggle ("scanning for someone?") → good-gift verdict + what *they* could make (v1: taste-profile questionnaire-lite, 2 taps).
- **Accept:** every scan path (barcode/OCR/visual/manual) terminates at the Answer Card; card renders < 3s from capture on a mid-tier device (measured, see 1.3); zero scans dead-end in a bare catalog entry.

### 1.2 Value-on-scan v1 — **L**
- Migration `030_bottle_prices.sql`: `bottle_prices(sku_id, price_low, price_high, currency, confidence, source, as_of)` — seeded for the **top ~2,000 scanned SKUs** from retail price data (licensed/API source per Collector Blueprint rules — never scraped; MSRP + user-reported spotted prices from the existing Want price journal as the bootstrap).
- UI: range + "you saw $X → good buy / typical / high" when a spotted price exists. Ranges with confidence, never point estimates. Sourced tooltip on every number.
- **Accept:** ≥60% of real-world scans (top-SKU-weighted) show a value line; every value shows its source.

### 1.3 Aisle-grade scan performance — **L**
- Instrument the 4-layer pipeline (`barcodeService.ts`, `ocrService.ts`, `googleVisionService.ts`, manual): per-layer latency + success into a `scan_events` extension (see 1.5). Barcode-first fast path; pre-warm camera on tab focus; degrade gracefully offline (`offlineService.ts`): identity from local cache, queue enrichment.
- Dashboard query: scan success rate and p50/p95 time-to-answer become standing metrics.
- **Accept:** p50 < 3s barcode path; success > 90% now (95% is the standing company KPI); metrics visible in Mixpanel.

### 1.4 Navigation restructure — **L**
- `src/navigation/Tabs.tsx`: `Recipes/Shelf/Camera/Lessons/Profile` → **Tonight / Bar / Scan(center, camera-instant) / Drinks / You**.
- **Tonight** = evolved `HomeScreen.tsx` (What Can I Make card already at `HomeScreen.tsx:82` — becomes the hero) + Tonight's Pick v1 (one recipe chosen by `recommendationEngine.ts` from shelf ∩ taste; simple heuristic is fine) + weekly drop + browse/search rails absorbed from `RecipesScreen.tsx`.
- **Bar** = merge `HomeBarScreen.tsx` (Owned) + `useWishlist` (Want) + `cellarService`/`TheCellarScreen` (Cellared) into one screen with a three-state segmented control. Copy honors the locked Shelf=owned/Wishlist=spotted distinction as states. `CellarWatchlistScreen` folds into Want.
- **Drinks** = saved (`useSavedItems`) + Made It history + imports. **You** = `ProfileScreen` + archived learning library (`LessonsScreen` content reachable, tab gone).
- Deep-link/route aliases for old screen names so stored navigation state and notifications don't crash.
- **Accept:** two-taps-from-root audit passes; old tab routes redirect; Lessons content still reachable under You.

### 1.5 Scan-context data schema (the brand asset — cannot be retrofitted) — **M**
- Migration `031_scan_context.sql` extending the `013`/`020`/`025` scan tables: `context enum('store','home','gift', 'unknown')` (inferred: gift-mode toggle, price-capture present ⇒ store; add-to-owned ⇒ home), `price_seen numeric null`, `outcome enum('owned','wanted','passed') null`, `resolved_at`. Aggregate-only exposure; consent-gated (0.3 makes this legal).
- Wire the Answer Card actions to write outcomes.
- **Accept:** the query "brand X: scans, store-context %, want-conversion %, top alternative scanned in same session" runs today — that query *is* the future brand product.

### 1.6 Onboarding inversion — **M**
- Flow in `RootNavigator.tsx`: AgeGate → one carousel card → **camera**. `OnboardingQuestionnaireScreen.tsx` (2.7k lines) exits the critical path; `RefineYourTasteScreen.tsx` is offered after the first suggested recipe.
- **Accept:** median install→first-scan < 60s in analytics; activation funnel (install → scan → Made It ≤ 24h) is a saved Mixpanel funnel.

**PHASE 1 EXIT:** scan→resolved-decision rate measured and climbing · week-1 Made It rate for new users is a known number (this number steers Phases 2–4).

---

## Phase 2 — Monetize (~5 weeks)

### 2.1 RevenueCat activation & hardening — **L** *(honors the standing "when payments go live" gate — this is that moment)*
- Production keys enforced non-placeholder for release builds (monetization-audit P0); single offering `default` with `plus_monthly`/`plus_yearly`; `PaywallScreen` prices from offering metadata; purchase/restore/receipt-edge-cases pass in sandbox; `SubscriptionDebugScreen` gated out of release builds.
- Founders pricing ($29/$79 to user #300): implement the counter server-side (Supabase table + RPC), not client constants (`subscriptions.ts` founders state is currently unwired); sunset is automatic.
- RevenueCat webhooks → Supabase (subscriber events table) so tier truth survives app reinstalls.
- **Accept:** end-to-end sandbox purchase/restore on iOS build; tier flips everywhere within one app session; founders counter decrements server-side. *(Per standing decision, live testing timing stays deferred until payments actually go live — build it ready.)*

### 2.2 Make It Anyway v1 (substitutions) — **L**
- `src/services/substitutionService.ts` implementing `SUBSTITUTION_BLUEPRINT.md` exactly: same-family → flavor-role → shelf-first ranking; 1 primary + ≤2 secondary; confidence labels; garnish/citrus guardrails. Data: the blueprint's starter matrix as a typed table + `ingredientNormalizationService.ts` for matching.
- UI contract per the blueprint (`Try: <primary>` rows) on recipe ingredient lists and on every almost-makeable card in `WhatCanIMakeScreen.tsx`. KŌOPE+ gated (trigger #2 fires here for free users).
- **Accept:** an almost-makeable recipe with 1 missing bottle shows a working swap; "made with substitution" flows into `made_events.substitutions_used`.

### 2.3 Web landings v1 + Wishlist links (ship before Q4) — **XL**
- New `web/` workspace (Next.js or Astro, server-rendered, Supabase read-only anon role): `koope.app/r/[recipeId]` (share-card landing: recipe + "see what *you* can make" install CTA) and `koope.app/w/[wishlistId]` (Want-list registry: bottles + spotted prices + affiliate buy links). Public read requires new sanitized views + RLS for anon `SELECT` on shared objects only (`share_enabled` flag the user toggles).
- App side: "Share my Want list" from Bar; share cards (`scan-and-share`, cellar, certification — all shipped) get their image + link swapped to the web URLs.
- **Accept:** a logged-out phone browser renders both pages fast; link-open → install attribution events recorded; nothing private leaks (RLS test extended).

### 2.4 Paywall timing audit — **S**
- Verify the only three triggers fire (0.7), each logs `trigger_id`, and conversion-by-trigger is a saved report.

**PHASE 2 EXIT:** trial→paid ≥ 35% in sandbox-cohort math becomes measurable on real users when payments flip on · Wishlist links live before Q4 · conversion-by-trigger reporting exists.

---

## Phase 3 — Spread & Brand Groundwork (months 5–9)

### 3.1 Guest Menu live links + RSVP — **XL**
- `web/` gains `koope.app/m/[menuId]`: the Guest Menu (shipped, implementation-plan item 19 ✅) rendered as a live page; guests RSVP a drink preference with zero signup. Migration `032_guest_rsvps.sql` (`menu_id, guest_name, preference jsonb, created_at` — taste signal from non-users, aggregate into the host's party plan via `hostingPlannerService.ts`).
- Post-party: "make it again at home" link per drink (recipe landing from 2.3) — the install pitch waits until after the party.
- **Accept:** guest→install attribution measurable; RSVP preferences appear in the host's planner.

### 3.2 Party Cart (affiliate v1) — **M**
- `affiliateService.ts` gets real partner tags (Total Wine / ReserveBar / Curiada / Instacart — whichever program approves first); Hosting shopping list and Want-list rows become tagged outbound links. No in-app checkout.
- **Accept:** outbound clicks tracked with partner + surface; first attributable click-through revenue possible.

### 3.3 Web bottle pages (SEO flywheel) — **XL, rolling**
- `koope.app/b/[sku-slug]`: canonical page per bottle — identity package, value range (sourced), "what you can make with it," install CTA. Generated from `spirits_cache` + `bottle_prices`, top-scanned SKUs first; sitemap + structured data (Product schema); slugs stable forever.
- **Accept:** first 1,000 pages indexed; Search Console wired; page → install attribution.

### 3.4 Fading scaffolds + contextual education — **L**
- Recipe card renders by make-count from `made_events`: full walkthrough (0 makes) → condensed steps (2+) → spec card (5+), with a "show me everything" escape hatch. Micro-lesson/Bartender Hack cards (28 exist per `bartender-hacks-roadmap.md`) surface **post-make** and on first appearance of a technique — delivery replaces the dead Lessons tab.
- **Accept:** a 5th make renders the spec card; hack impressions tracked.

### 3.5 KŌOPE Wrapped (December) — **M**
- Aggregate `made_events` + scans + taste profile into a shareable year recap (share card → web landing). Ship by Dec 1.

### 3.6 Brand Intelligence Agent + covenant — **M**
- Per the Growth Roadmap spec (kept): weekly cron edge function → scan/context aggregates (the 1.5 query) → Claude API → opportunity-brand briefs + drafted outreach into an `outreach_drafts` table; Slack digest; shared `agent_runs` table with cost tracking; human gate on all outbound. Turn on at ~2.5k MAU.
- Brand covenant published as a page on `koope.app` (from Bible §8.4) — filed before the first dollar.
- **Accept:** Monday digest arrives with real numbers; covenant URL is public.

**PHASE 3 EXIT:** guest→install and gift-link→install rates are real numbers · 25k+ bottle DB · bottle pages indexing · internal brand briefs generating automatically.

---

## Phase 4 — The Second Engine (data decides, ~5k+ MAU)

Gate: Phase 1–3 telemetry says which audience actually showed up. Build **one** first.

### Option A — Collector add-on ($99/yr) — **XL+**
Per [KOOPE-COLLECTOR-BLUEPRINT.md](KOOPE-COLLECTOR-BLUEPRINT.md) Phase 1: licensed price-history feed for the ~5,000 most-collected SKUs (partnership deals signed **before** code — the choke point; two online auction houses) → time-series price store + ingestion connectors → portfolio dashboard on the existing Cellar state (cost basis, range, confidence) → insurance-schedule PDF export (`pdfService.ts` exists) → public methodology page v1. New RevenueCat add-on product `collector_yearly`.

### Option B — Bartender drops — **L**
`weeklyForYouDrops.ts` structure gains the planned `source` field (`koope|bartender|brand`) end-to-end (per standing decision); bartender profile records + a lightweight submission flow (form + review, no creator dashboard yet); revenue-share ledger table; 3–5 launch bartenders. Drops UI shows attribution.

### Both options ride on
- **Brand pilot infrastructure — L:** the Data Analyst Agent (roadmap spec): quarterly brand report = strict-schema JSON from scan-context aggregates → PDF template (Puppeteer) → human review → send. First pilots priced $3–5k/mo per the honest model (Bible §9). Sponsored-slot-in-recommendations counter: **0, asserted in code** (no code path exists that can inject brand content into `recommendationEngine.ts` surfaces — enforce by review + a covenant unit test on the ranking inputs).
- **EN internationalization groundwork — M:** unit localization (oz/ml/cl via `expo-localization` + `useCurrencyPreference` pattern), UK/CA/AU bottle-DB coverage check.

**PHASE 4 EXIT:** first brand check clears under the covenant · second engine chosen and compounding.

---

## Cross-cutting standing rules

1. **God-file rule:** touching `CocktailDetailScreen`, `RecipesScreen`, `HomeBarScreen`, or `BottleDetailScreen` means extracting the touched section into a component/service in the same PR.
2. **Repo-pattern completion, opportunistic:** when `recipesRepo.ts`/vault/curriculum repos are touched, give them the interface the Content/Progress/User repos already have.
3. **Migrations only** — no more ad-hoc SQL in `supabase/` root, ever.
4. **Every phase merge is App-Store-submittable.** No long-lived branches; kill-list and restructure land behind small sequential PRs.
5. **Metrics before features:** a task isn't done until its acceptance metric is visible in Mixpanel or a saved Supabase query.

## Dependency spine (what blocks what)

```
0.1 RLS ─┐
0.2/0.3/0.4 cleanup ─┼─→ 0.7 tier collapse ─→ 2.1 RevenueCat live
0.6 one spine ───────┘         │
0.8 Made It ─→ 1.4 Tonight ─→ 3.4 fading scaffolds, 3.5 Wrapped
1.1 Answer Card ─→ 1.2 value ─→ 3.3 bottle pages ─→ 4 collector option
1.5 scan context ─→ 3.6 brand agent ─→ 4 brand pilots
2.3 web workspace ─→ 3.1 guest links, 3.3 bottle pages
```
