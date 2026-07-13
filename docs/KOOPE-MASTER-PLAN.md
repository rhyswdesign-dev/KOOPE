# KŌOPE Master Plan — Own Spirit Identification

**Status:** CANONICAL. Where this conflicts with earlier docs, this wins.
**Date:** 2026-07-02
**Supersedes:** Product Bible Part III navigation & tier structure (Parts I–II principles and §9 financial model remain in force) · Growth Roadmap financials (already superseded) · the two-paid-tier model everywhere it appears.
**Companions:** [KOOPE-PRODUCT-BIBLE.md](KOOPE-PRODUCT-BIBLE.md) (principles, covenant, corrected model) · [KOOPE-COMPETITOR-REDTEAM.md](KOOPE-COMPETITOR-REDTEAM.md) (the threat we pre-empt) · [KOOPE-COLLECTOR-BLUEPRINT.md](KOOPE-COLLECTOR-BLUEPRINT.md) (the Phase-4 option) · [KOOPE-ENGINEERING-AUDIT.md](KOOPE-ENGINEERING-AUDIT.md) (the debt this plan retires).

---

## 1. The Thesis

**Vivino owns wine. Untappd owns beer. Nobody owns spirits. KŌOPE takes the open slot.**

The category-defining move is not "cocktail app with a scanner." It is **the spirits identification layer**: point your camera at any bottle on Earth and get, in under three seconds, the answer to the decision you're standing in front of —

1. **What is this?** (identity, style, taste, story)
2. **Is this price fair?** (value-on-scan)
3. **What does it become in *my* life?** ("Buy this and you unlock 11 cocktails with what's already on your shelf")
4. **Is it a good gift?** (gift mode — the non-drinker's entire use case)

Answers 1–2 are the Vivino playbook, executed in a category that is *easier* than wine (tens of thousands of stable SKUs, not millions of producer×vintage combinations — the database compounds faster). Answers 3–4 are structurally impossible for anyone who doesn't know your shelf. That's the moat.

**The flywheel:**

```
Scan (aisle + home + gift)          → bottle DB + shelf graph deepen
→ better answers (identity, value, recipes-vs-your-shelf)
→ more scans, and "Tonight" retention between purchases
→ shelf-decision data no one else on Earth has
→ brand insights + bottle-page platform (covenant-bound)
→ revenue funds DB depth and data partnerships
→ repeat, faster than any fast-follower can bootstrap
```

Scan **acquires**. Making **retains**. The "unlocks N recipes" answer is the doorway between them. The brand infrastructure monetizes the graph the flywheel builds.

**Two-front discipline:** the consumer app is the data engine; the brand platform is the scale business. Neither is optional, and the covenant (Bible §8.4) keeps the second from poisoning the first.

---

## 2. The Simple App

### 2.1 Navigation — five slots, frozen

| Slot | Tab | What lives there |
|---|---|---|
| 1 | **Tonight** (home, default landing after first session) | What Can I Make (hero) · Tonight's Pick (one drink chosen for you) · weekly drop · almost-makeable teaser (paywall hook) · search & browse rails · "Having people over?" → Hosting suite |
| 2 | **Bar** | ONE collection, three states: **Owned / Want / Cellared** (replaces Shelf + Wishlist + Cellar + Watchlist as separate rooms) · bar health · Optimize My Bar · shareable Want-list (gifting registry) · cellar value view |
| 3 | **Scan** (center, camera opens instantly — the sacred slot) | The 4-layer stack. Post-scan **Answer Card** (see 2.2) |
| 4 | **Drinks** | Your library: saved recipes · Made It history · imports · fading-scaffold progress ("you've made this 4×") |
| 5 | **You** | Profile · one XP spine · certifications (credential shelf) · learning library (archived Lessons content, contextual delivery is primary) · taste profile · settings · subscription |

Rules: no feature more than two taps from a tab root. Hosting does **not** get a tab yet — it earns one with usage data (it would replace Drinks). Lessons loses its tab permanently; education moves into the act of making.

### 2.2 The Answer Card — the single most important screen in the company

Every scan ends here, and it must resolve a decision, never file a catalog entry:

```
[ Bottle identity — name, style, proof, "what it tastes like", 1-line story ]
[ Value line — "Fair price: $32–38. You saw $32. ✓ Good buy."          ]
[ THE HOOK — "Owning this unlocks 11 cocktails with your shelf"        ]
[   → 3 recipe cards free (from the free pool), 4th greyed = paywall   ]
[ Actions: Add to Bar (Owned) · Want it · 🎁 Scanning for someone?     ]
```

- **Identity guarantee:** every scan returns the full "what it is / how it's made / flavor notes" package (tier matrix Wave-2 item — now P0).
- **Value-on-scan ships free.** This deletes DRAM's entire wedge (Red Team §6.2) before DRAM exists. Ranges, never false precision; sourced numbers only (Collector Blueprint rules apply from day one).
- **Gift mode:** "scanning for someone else?" → good-gift verdict + what *they* could make. The gift buyer is the most anxious person in the aisle and our cheapest new audience.
- **Aisle-grade performance is a company KPI:** barcode-first, < 3s to answer, tolerant of bad store lighting and weak signal. Scan success > 95%.

### 2.3 What stays (earned its place)

4-layer scan stack · bottle database · one-Bar collection with the owned/spotted distinction preserved as states (locked copy honored) · price journal on Want items · What Can I Make (exact matches FREE per locked plan) · **Make It Anyway** substitution engine (SUBSTITUTION_BLUEPRINT.md is the spec — it ships, it's the #1 paid-tier justification) · **Made It** one-tap logging (the North Star sensor — build first) · fading recipe scaffolds (card shows less detail each repeat make — real skill acquisition, and the anti-ChatGPT stickiness) · Tonight's Pick · weekly drops with the `source` field (bartender/brand primitive) · Hosting Planner + Guest Menu (inside the paid tier; first small party free) · share cards → **web landing pages** (shares must be loops, not dead-end exports) · taste questionnaire (moved post-first-scan) · certifications (kept as credentials, out of the game economy) · referral program · push notifications (occasion-based only) · the 28 Bartender Hacks (delivered contextually post-make, not via a Lessons tab).

### 2.4 The Kill List — executed, not debated

**Screens/surfaces (delete from nav and tree):**
- Events screen (paid gate on 3 mock events — worst trust pattern in the app; RootNavigator.tsx:247)
- King's Cup + GameDetails (drinking games — off-brand, App Store risk; RootNavigator.tsx:347)
- Community "Coming Soon" stub
- MapScreen / MapsScreen stubs · duplicate Terms screens · ForYouFeed_OLD · `MixMind/` + `MixedMindsRecipes/` dirs · `recommendationEngine.old.ts` · all root-level example/backup files (per Engineering Audit §2.1)
- Lessons **tab** (content archives under You; contextual micro-lessons are the delivery system)
- Cart/Checkout mock screens (commerce = affiliate links out; no fake checkout ships)

**Systems:**
- Gamification collapses to **one spine: XP → Level → Unlocks.** Weekly cadence. Kill: daily XP caps, daily streaks (daily mechanics on an alcohol app are an ethical and App Store error — weekly rituals only), Vault keys as parallel currency (Vault items become level-gated), achievements-as-separate-track (fold into XP milestones). Challenges survive as the verb layer feeding the spine.
- **Payments: RevenueCat only.** Delete the Stripe vault-cash path (its webhook never fulfilled anyway — Audit §3.2) and `react-native-iap`. One system, one truth.
- **Analytics: one SDK** (keep PostHog or Mixpanel — pick one, delete the other two + `mixpanel-browser`), initialized **after consent** (closes the compliance gap, Audit finding #4).
- **Firebase: excised completely** (FirebaseProvider unmounted, Firestore imports deleted — Audit §1.3).
- **Recipe input sprawl → two paths:** Scan (bottles) and one **Import** flow (URL / photo / voice / AI-format become input methods inside a single flow, not four screens).
- **Two paid tiers → one** (§3).

**Engineering debt retired in the same pass (non-negotiable, they sit under the money path):** recipes-table RLS (`USING (true)` — any user can delete the catalog) · vault-table RLS · provider stack pruned as contexts die with their features.

---

## 3. Monetization Restructure

### 3.1 One paid tier until 1,000 payers

Two paid tiers below ~1k payers splits a tiny base, doubles paywall complexity, and forces every feature into a three-way sort. Collapse to:

| | **FREE** | **KŌOPE+** — $7.99/mo · **$59.99/yr** (annual-first, 7-day trial on annual) |
|---|---|---|
| Promise | *Know every bottle* | *Everything your shelf can do — and Friday handled* |
| Scanning + Answer Card + value-on-scan | **Unlimited, forever** | Unlimited |
| Bar | 10 bottles | Unlimited + cellar analytics |
| Recipes | 9 classics + XP unlocks; 3 post-scan matches (+1 greyed teaser) | Full catalog; full post-scan library per bottle |
| Make It Anyway (substitutions) | — | ✔ |
| Hosting | First party free (≤4 guests, basic menu) | Full suite: planner, Guest Menu link, batch calc, prep timeline |
| Network surfaces (view any shared menu/wishlist/card) | ✔ always | ✔ |

Rules held: scanning is **never** gated (every scan feeds the database — gating the wedge starves the flywheel) · receiving ends of viral loops never gated · Founders $29/$79 runs to user #300 then sunsets forever · no lifetime deals · no purchasable XP · paywalls fire at three desire peaks only: **the greyed 4th recipe post-scan · the almost-makeable drink · "people coming Friday."** Never at curiosity peaks.

Later tiers, added only when their audience is proven in the data: **PRO/Host** re-splits when hosting depth justifies it · **COLLECTOR add-on $99/yr** per the Collector Blueprint (converts 15–25%, like a trading tool) · **BARTENDER PRO $149/yr** in Year 2.

### 3.2 The revenue stack (honest model — Bible §9 stands)

1. **Subscriptions** — the floor. 4% base / 8% upside MAU→paid. Breakeven ~2.5–3k MAU solo.
2. **Commerce** — affiliate on post-scan "buy near me" and bottle pages (living partners: Total Wine, ReserveBar, Curiada, Instacart/Uber Eats) · **party carts** ($150–300 baskets the Hosting Planner already assembles) · **gifting** (Want-list = registry; ship links before Q4 — December is our acquisition season).
3. **Brand platform** — §4. Pilots $3–5k/mo at 5–10k MAU; insights product from ~15k. This is the scale revenue and the reason the data schema ships in Phase 1.
4. **Collector financial services** — Phase 4 option: insurance referrals, consignment share, appraisals (Blueprint Layers 3–4).

---

## 4. The Brand Infrastructure — built to own the category

The unique asset: **shelf-decision data.** Vivino knows ratings. Nielsen knows checkout. Nobody knows *the moment of decision in the aisle* — what got scanned, at what seen price, what it was compared against, whether it converted to Want/Owned, and what got made with it afterward. KŌOPE will. That is the product brands buy.

### 4.1 Instrument now (Phase 1, before scale — retrofitting is impossible)

Scan-event schema captures, with consent: SKU + edition · context (store / home / gift-mode) · price seen (the Want-list price journal generalized) · decision outcome (owned / wanted / passed) · downstream behavior (recipes viewed, Made It events, repeat makes). Aggregate-only exposure, per the covenant. Consent-gated analytics is a legal prerequisite — fixed in Phase 0.

### 4.2 The sellable surfaces (all labeled, per the covenant)

| Product | What the brand gets | Gate |
|---|---|---|
| **Bottle-page enrichment** (Amazon A+ model) | Their own canonical page, enriched: story, serve suggestions, video | Web bottle pages live |
| **Sponsored drops & challenges** | Labeled placement in the drop system (`source: brand`) | 5k MAU |
| **Insight reports** | "Scanned 4,000× in-store this quarter · 34% → wishlist · #1 alternative considered: X · top cocktail made: Y" — automated, quarterly, no slot limit so it scales where placements can't | Pilots 5–10k MAU, standalone product 15k |
| **Co-branded events** | Real supply for the Events resurrection (Act 2) | Post-supply |

**The covenant is a KPI, not a vibe: sponsored slots inside recommendations / What Can I Make / substitutions = 0, forever.** It is also the sales pitch: honest aggregate data survives brand due diligence; corrupted placement doesn't.

### 4.3 The agent stack (Growth Roadmap's best section — kept)

Support Agent (launch) → **Brand Intelligence Agent** (2.5k MAU: weekly scan-data pulls, opportunity-brand flags, drafted outreach with real numbers) → Data Analyst Agent (5k+: cohort reports, automated brand PDFs) → Content Agent (15k+). Shared `agent_runs` infra, human gate on all outbound. The lean company runs on 1–3 humans + agents to 10k MAU.

### 4.4 Category ownership — the moves that make first-mover stick

1. **Database depth as war:** SKU coverage % and scan success rate reported like revenue. Edition-level entity resolution (Blueprint §2) is the hard, moat-building problem — start it early on the top 5,000 collected SKUs.
2. **Lock the data choke point first:** licensed price feeds (two of the four big online whisky auctioneers + a retail price API) are exclusive-ish; the first credible partner wins them and denies every fast-follower the foundation layer. Licensed only, never scraped.
3. **Web bottle pages** — a canonical, SEO-indexed page per bottle ("what is it, what's it worth, what can you make"). Deny the SEO field to any DRAM; inherit the searches collectors and gift-buyers make daily; this is also the brand-enrichment surface.
4. **Published methodology + covenant** = authority. In every scan category, the community anoints one authority (PSA, Kelley Blue Book, Vivino). Authority is earned with sourced numbers, visible corrections, and recommendations that are never for sale.
5. **Speed.** The slot is open today. Every quarter of sprawl is a quarter a funded team could take the aisle.

---

## 5. Metrics — two dials and a tree

- **Front door:** scan → resolved decision rate (an action taken on the Answer Card), scan success > 95%, answer < 3s.
- **Living room (North Star):** **Weekly Makers** — Made It logging is the sensor and ships before anything else is measured.

| Layer | Metric |
|---|---|
| Activation | First scan < 60s from install · first Made It < 24h · 5 bottles by day 30 |
| Habit | Weekly Makers / WAU · Tonight's Pick open→make · drop-day return |
| Conversion | Trial→paid ≥ 35% · MAU→paid in the honest 4–8% band · paywall fires at desire peaks only |
| Data engine | Scans/week · SKU coverage % · scan-context capture rate · consented-analytics rate |
| Spread | Guest-menu → install · Want-list links shared · gift-mode scans |
| Integrity | Sponsored slots in recommendations = **0** · valuation sources cited = 100% |

---

## 6. Execution Plan — phases with exit gates, not dates

### Phase 0 — Earn the right (≈ weeks 1–4): *Foundation & the Cut*
1. Security: recipes + vault RLS fixed; Stripe vault path deleted (with its dead webhook) or the webhook completed — deleted is the default.
2. The Kill List executed in full (§2.4) — screens, systems, Firebase, dead dirs, analytics consolidation behind consent.
3. Gamification collapsed to the one spine; weekly cadence.
4. Tier config collapsed to FREE / KŌOPE+.
5. **Made It logging shipped.**
- **Exit:** nothing in the app lies to a user; one payment system; one analytics SDK firing after consent; the North Star sensor is live.

### Phase 1 — The Wedge (≈ weeks 5–10): *Win the aisle*
1. Answer Card v2: identity guarantee · value-on-scan (top ~2,000 SKUs to start) · "unlocks N recipes" hook with 3-free + greyed-4th · gift mode.
2. Aisle performance: barcode-first path < 3s, offline-tolerant.
3. Navigation restructure to Tonight · Bar · Scan · Drinks · You; four inventory rooms merge into Bar.
4. Onboarding inversion: age gate → one card → camera; first scan < 60s; questionnaire post-first-recipe.
5. Scan-context data schema live (§4.1).
- **Exit:** scan→resolved-decision rate measured and climbing; X% of new users log a Made It in week 1 — **this number decides everything after.**

### Phase 2 — Monetize (≈ weeks 11–16): *Desire peaks only*
1. RevenueCat activated (per standing go-live plan); single tier; production keys hardened (monetization audit P0).
2. Make It Anyway v1 (blueprint matrix, shelf-first ranking) behind the paywall, surfaced on every almost-makeable recipe.
3. Founders pricing runs to #300, then sunsets.
4. Web landing pages behind every share card; **Want-list links ship before Q4.**
- **Exit:** trial→paid ≥ 35%; first honest conversion data; gifting live for December.

### Phase 3 — Spread & brand groundwork (months 5–9)
1. Guest Menu as live web link + RSVP taste poll (taste signal from non-users); party cart affiliate.
2. Web bottle pages begin indexing (top-scanned SKUs first).
3. KŌOPE Wrapped (December) + gifting campaign.
4. Affiliate v1 with living partners; Brand Intelligence Agent on at ~2.5k MAU; brand covenant filed as a public document.
5. Fading scaffolds v1 + contextual micro-lessons/hacks post-make.
- **Exit:** measurable guest→install and gift→install rates; 25k+ bottle DB; internal brand reports drafting automatically.

### Phase 4 — The second engine (data decides, ~5k+ MAU)
Two candidates, funded by what Phases 1–3 revealed about the audience mix:
- **Collector add-on** ($99/yr): licensed price feeds (lock the partnerships first), portfolio terminal on Cellar state, insurance export, release calendar. Runs the full Collector Blueprint.
- **Bartender drops** (`source` field vision): 3–5 bartenders, revenue share — the supply-side handshake toward community and trade.
Plus: first brand pilots at honest prices ($3–5k/mo, framed as insight partnerships) · EN-market internationalization groundwork.
- **Exit:** first brand check clears under the covenant; second engine chosen and compounding.

### The endgame (unchanged from the Bible, now reachable)
Act 2 gathering layer → Act 3 trade bridge → Act 4 the hospitality graph. The identification wedge is how we get the density those acts require.

---

## 7. Operating Rules for the Lead

1. **Nothing advances past Phase 1 until the Made It sensor has data.** The make rate decides the roadmap; conviction doesn't.
2. **The Answer Card gets a quality bar like a payments flow.** It is the product.
3. **Every feature request answers one question: does it deepen the database, the make rate, or the covenant-bound brand asset?** If none — it's sprawl, and this document is the license to cut it.
4. **Never present superseded numbers** (15% conversion, Drizly, $1M@10k MAU) to anyone, ever. Bible §9 is the only model shown externally.
5. **Two-taps-from-tab-root** rule enforced quarterly; the screen count goes down every quarter until further notice.

**The one-line test:** *does this make the scan answer better, the drink more makeable, or the data more valuable under the covenant?* Yes → build. No → cut.
