# KOOPE Implementation Plan — 2026
**Goal:** Make KOOPE the only app people think about for bartending, bottle scanning, and exploring spirits.
**Last Updated:** 2026-03-25
**Basis:** Tier Feature Matrix v2 + codebase audit March 2026

---

## Three Pillars

| Pillar | What it means |
|---|---|
| **Scan is the hook** | Pointing your phone at a bottle is the highest-leverage moment. That moment must be so useful it becomes habit. |
| **The bar grows with you** | Free gets you started. Plus runs your bar. Pro makes you a craftsperson. Every tier must feel like a real upgrade, not just a bigger version of the last. |
| **It knows you** | The app should feel like it's watching what you drink and getting smarter — not a static catalog. |

---

## Master Priority Table

| # | Task | Pillar | Wave | Status |
|---|---|---|---|---|
| 1 | Post-scan recipe suggestions — Free sees 3 + greyed 4th teaser | Scan is the hook | 1 | ✅ Done |
| 2 | Optimize My Bar live screen (Plus) | Bar grows with you | 1 | ✅ Done |
| 3 | Predictive engine wired into Pro For You feed | It knows you | 1 | ✅ Done |
| 4 | Weekly drops rendered in ForYouFeed | It knows you | 1 | ✅ Done |
| 5 | "Add to Cellar" flow from HomeBar | Bar grows with you | 2 | ✅ Done |
| 6 | Cellar Supabase sync (migrate from AsyncStorage) | Bar grows with you | 2 | ✅ Done |
| 7 | Bottle identity guarantee on every scan | Scan is the hook | 2 | ✅ Done |
| 8 | Taste graph shapes all recipe discovery (not just For You) | It knows you | 2 | ✅ Done |
| 9 | Occasion modes feed into recommendations | It knows you | 2 | ✅ Done |
| 10 | Upgrade trigger copy + timing aligned to revised tier strategy | Bar grows with you | 2 | ✅ Done |
| 11 | Certification unlock moments (animation, shareable card, notification) | Bar grows with you | 3 | ✅ Done |
| 12 | Scan-and-share card ("Found on KOOPE") | Scan is the hook | 3 | ✅ Done |
| 13 | Cellar share with portfolio value brag | Bar grows with you | 2 | ✅ Done |
| 14 | Scan history and bottle journal | Scan is the hook | 3 | ✅ Done |
| 15 | Mixpanel token configured + funnel events verified | Production | Now | ✅ Done |
| 16 | RevenueCat + subscriptions tested in real build | Production | Now | 🔲 Held — activate when payments go live |
| 17 | Low stock alerts | Bar grows with you | 4A | ✅ Done |
| 18 | EAS Project ID wired (push notifications in production) | Production | 4A | 🔲 Open — fill EXPO_PUBLIC_EAS_PROJECT_ID in .env |
| 19 | Guest menu output surface | Bar grows with you | 4B | 🔲 Open |
| 20 | Prep timeline with shareable export | Bar grows with you | 4B | 🔲 Open |
| 21 | Batch optimizer deeper integration into Hosting | Bar grows with you | 4B | 🔲 Open |
| 22 | Vault repositioning — master recipes + elite drops | It knows you | 4C | 🔲 Open |
| 23 | Occasion-based persistent profiles | It knows you | 4C | 🔲 Open |
| 24 | Weekly drop content refresh (sustain 8+ weeks rolling) | It knows you | 4C | 🔲 Open |
| 25 | Brand intelligence — substitutes + upgrade suggestions | Bar grows with you | 5 | ⏸ Held — needs commercial partnerships |
| 26 | Creator tools | Bar grows with you | 5 | ⏸ Deferred — post-community launch |

---

## Wave 1–3 — Complete ✅

All 15 active items shipped. Key outcomes:
- Every tier delivers on its promise at the highest-leverage moments (scan, recipe discovery, For You feed)
- Cellar Mode fully wired: intake → Supabase sync → share
- Pro identity track live: certifications, XP multiplier, weekly drops, taste graph
- Funnel analytics instrumented: scan → recipe view → paywall → purchase
- Scan history journal live with bottle photos + quick add-to-inventory

---

## Wave 4A — Retention Hooks

**Goal:** Make the app feel alive even when the user isn't actively using it.

### 🔲 17. Low stock alerts
**Files to change:**
- `src/services/notificationService.ts` — add `scheduleLowStockAlert(itemName)` method
- `src/services/inventoryService.ts` — call on quantity update to 'low' or 'empty'
- `src/screens/HomeBarScreen.tsx` — trigger on quantity change in detail panel

**Behaviour:**
- When a bottle is marked 'low' or 'empty' (in the Cellar intake modal or any quantity update), schedule a local push notification: "Running low on [Bottle] — time to restock."
- Notification fires 24h later if user hasn't already restocked
- Tapping the notification opens HomeBar with that item highlighted
- Gate: available to all tiers (free retention hook)

**Definition of done:** User marks a bottle 'low' → 24h later receives push notification → taps → lands on HomeBar.

---

### 🔲 18. EAS Project ID
**Files to change:**
- `.env` — set `EXPO_PUBLIC_EAS_PROJECT_ID` to real EAS project ID

**Why:** Push notification tokens can't register in production builds without a valid EAS project ID. Certification unlock and low stock notifications will silently fail without this.

**Definition of done:** `EXPO_PUBLIC_EAS_PROJECT_ID` set to real value; `notificationService.initialize()` registers a push token in a TestFlight build.

---

## Wave 4B — Hosting Completion

**Goal:** Close the Hosting loop — recommendations exist, but there's no output users can act on in the moment.

### 🔲 19. Guest menu output surface
**Files to change:**
- New: `src/screens/GuestMenuScreen.tsx` — formatted menu card showing selected cocktails, serves, and ingredients needed
- `src/screens/HostingScreen.tsx` — add "Create Guest Menu" CTA
- `src/navigation/RootNavigator.tsx` — add route

**Behaviour:**
- Takes the user's current hosting selection (cocktails + guest count) and renders a clean shareable menu card
- Shows: cocktail names, brief description, what's needed from the bar
- Share via native Share API (no server round-trip)
- Gate: `useFeatureAccess('hosting_basic')` — Plus+

**Definition of done:** Plus user in Hosting mode → "Create Guest Menu" → sees formatted menu → shares it.

---

### 🔲 20. Prep timeline with shareable export
**Files to change:**
- `src/screens/HostingScreen.tsx` or new `src/screens/PrepTimelineScreen.tsx`
- Uses selected cocktails + guest count to generate a prep checklist ordered by lead time (batch ahead → make-to-order → garnish)

**Behaviour:**
- Groups tasks: "Make ahead" (syrups, batches), "On arrival" (ice, garnish prep), "To order" (shaken/stirred builds)
- Shareable as text list via native Share
- Gate: Plus+

**Definition of done:** Hosting user sees a time-ordered prep checklist and can share it.

---

### 🔲 21. Batch optimizer deeper integration
**Files to change:**
- `src/screens/HostingScreen.tsx` — surface batch calculator inline when a batch-friendly recipe is selected
- Currently batch math exists but isn't surfaced at the moment it's needed

**Behaviour:**
- When user adds a batch-friendly cocktail to their hosting session, a "Scale for [N] guests" inline action appears
- Result shows total volumes per ingredient, single-tap add to shopping list

**Definition of done:** User selects Negroni for 12 guests → sees scaled volumes inline → adds missing bottles to shopping list in one tap.

---

## Wave 4C — Pro Depth (to be broken down)

High-level scope — detail sprint plan to be written before starting:

- **Vault repositioning** — shift Vault toward master recipes and elite drops rather than just content unlocks; give Pro users a reason to come back to it weekly
- **Occasion-based persistent profiles** — move beyond the current session toggle; let users save named profiles ("Friday hosting", "Sunday casual") that persist and pre-configure the For You feed
- **Weekly drop content refresh** — sustain 8+ weeks of rolling content; build a lightweight internal tool or config pattern to add new drops without a code deploy

---

## Production Checklist (Before Wider Push)

| Item | Status |
|---|---|
| Mixpanel funnel events wired | ✅ Done |
| RevenueCat tested in real build | 🔲 Held — activate when payments go live |
| EAS Project ID set | 🔲 Open (#18) |
| Push notification token registers in TestFlight | 🔲 Blocked on #18 |
| console.error RevenueCat filter removed before going live | 🔲 Do when RevenueCat goes live |

---

## Completed Work Log

| Date | Item | Notes |
|---|---|---|
| 2026-03-25 | Wave 4A–4B plan written | Low stock alerts, guest menu, prep timeline, batch optimizer |
| 2026-03-25 | Scan history + bottle journal | `scanHistoryService.ts`, `ProfileScreen.tsx`, `BottleDetailScreen.tsx` |
| 2026-03-25 | Certification unlock modal | `ProfileScreen.tsx` — animated modal, share sheet, local push |
| 2026-03-25 | Mixpanel token + SCAN_SUCCESS event | `App.tsx`, `BottleDetailScreen.tsx`, `.env` |
| 2026-03-25 | Add to Cellar intake form | `HomeBarScreen.tsx` — modal with price/window/notes/quantity |
| 2026-03-25 | Post-scan recipe suggestions + 4th teaser card | `tierAccess.ts`, `BottleDetailScreen.tsx` |
| 2026-03-25 | Cellar share with portfolio value | `TheCellarScreen.tsx` |
| 2026-03-25 | Optimize My Bar screen | `BarOptimizerScreen.tsx` — confirmed wired |
| 2026-03-20 | Occasion modes in For You feed | `usePersonalization.ts`, `ForYouFeed.tsx` |
| 2026-03-20 | Upgrade trigger copy + T3b/T14 nudges | `paywallTriggers.ts`, `featureRegistry.ts` |
| 2026-03-20 | Taste graph in Recipes + Vault | `RecipesScreen.tsx`, `VaultScreen.tsx` |
| 2026-03-20 | Bottle identity fallbacks | `BottleDetailScreen.tsx` — SPIRIT_CATEGORY_DEFAULTS |
| 2026-03-20 | Scan-and-share card | `BottleDetailScreen.tsx` — Share API |
| 2026-03-20 | Cellar Supabase sync | `cellarService.ts` — Supabase primary + AsyncStorage cache |
| 2026-03-20 | Cellar Mode (Wave 5) | Full PRO feature — screens, service, navigation |
| 2026-03-20 | Pro Identity + Certifications | 3-tier system wired to ProfileScreen |
| 2026-03-20 | XP Multiplier for Pro (1.25×) | `useXPSystem.ts` |
| 2026-03-20 | Weekly For You Drops config + data | Config + recipes + ForYouFeed rendering |
| 2026-03-20 | Flavor sliders + RefineYourTaste | Full UI backed by Taste Graph |
| 2026-03-20 | 97-feature gating registry | Centralised `featureRegistry.ts` |

---

## Deliberately Deferred

| Item | Reason |
|---|---|
| Brand intelligence (substitutes, upgrade suggestions) | Needs commercial partnerships — promoting brands for free has no upside |
| Creator tools | Post-community launch |
| Low stock alerts (Wave 4-5 original list) | Moved to Wave 4A — now active |
| Guest menu output (Wave 4-5 original list) | Moved to Wave 4B — now active |
