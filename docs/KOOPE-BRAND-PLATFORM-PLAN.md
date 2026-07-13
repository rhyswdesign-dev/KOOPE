# KŌOPE Brand Platform Plan — Category of the Month & the Ad Platform Rails

**Status:** CANONICAL for brand-revenue execution (sponsorship slots, measurement, compliance, sales motion). Where this conflicts with strategy, [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md) wins on *what we build* and [KOOPE-BUSINESS-PLAYBOOK.md](KOOPE-BUSINESS-PLAYBOOK.md) wins on *deal pricing*. This doc wins on *how the brand platform ships and sells*.
**Author:** Office of the CPO — Marketplace & Ad Platform
**Date:** 2026-07-05 · v1.0
**Companions:** [KOOPE-PRODUCT-BIBLE.md](KOOPE-PRODUCT-BIBLE.md) (Principle 9, the covenant) · [KOOPE-MARKETING-OS.md](KOOPE-MARKETING-OS.md) (the budget truth) · [monetization-gap-matrix-step1.md](monetization-gap-matrix-step1.md)

---

## 0. Operating Thesis

KŌOPE's brand platform is a **two-sided marketplace**:

- **Supply** = user attention on *labeled* surfaces (Category of the Month, sponsored drops, challenges, bottle-page enrichment). Scarce by design: one slot per category per month.
- **Demand** = spirits brands, importers, and distributors who cannot buy targeted reach to engaged spirits enthusiasts anywhere else.
- **The exchange rate** = measurement. Brands don't buy MAUs; they buy *category-engaged reach with proof*. The renewal is sold by the report, not the slot.
- **Trust & safety** = the covenant. Sponsored slots inside recommendation surfaces = **0, forever** (Product Bible Principle 9). This is not a constraint on the ad platform — it *is* the ad platform's moat, because honest placement survives brand due diligence and corrupted placement doesn't.

**The four laws of this plan:**

1. **Slots are the door, not the business.** ~12 categories × 12 months ≈ 144 sellable units/year — a hard ceiling near $500–700k/yr fully sold. Insight reports have no inventory limit. Every slot deal exists to upsell into reports, enrichment, and challenge sponsorship.
2. **Measurement ships before the first pitch.** No attribution chain, no case study, no deal. The first three "of the month" features run unpaid and fully instrumented — they are the media kit.
3. **The slot must be good content or it burns the asset.** The bar version worked because staff genuinely endorsed the bottle. The app version is a curated editorial drop — tasting notes, three recipes, where to find it — with a stated right to decline any brand.
4. **$0 brand revenue below 5k MAU** (Business Playbook). Until then, everything in this plan is rails, proof, and pipeline — not selling.

### Current state of the rails (audited 2026-07-05)

Already built:
- `featured_brands`, `brand_impressions`, `brand_cart_adds`, `brand_selections` tables ([012_brand_selections.sql](../supabase/migrations/012_brand_selections.sql), [014_brand_insights.sql](../supabase/migrations/014_brand_insights.sql))
- [brandPartnershipService.ts](../src/services/brandPartnershipService.ts) — monthly per-category featured-brand fetch with cache, FTC badge label field, impression + cart-add recording, category inference from ingredient names
- Age gate (`ageVerificationService`), Mixpanel analytics layer ([analytics.ts](../src/lib/analytics.ts)), GitHub Actions automation habit (challenge rotation)

Gaps:
- `BRAND_OF_MONTH` in [SpiritsLandingScreen.tsx](../src/screens/SpiritsLandingScreen.tsx) is **hardcoded mock data**, not wired to the service
- Only consumer of the service is `GroceryListModal` — no flagship slot surface
- No click/tap event (impressions and cart-adds only — the middle of the funnel is missing)
- No report generation, no admin runbook, no media kit, no compliance one-pager, no covenant enforcement in code

---

## 1. Phase Gates

| Phase | MAU gate | Objective | Revenue |
|---|---|---|---|
| **0 — Rails & Covenant** | now | Finish the platform; enforce the covenant in code; write compliance + deal paper | $0 |
| **1 — Editorial Proof** | ~500+ | Run 3 unpaid, instrumented Category of the Month cycles; auto-report; media kit from real data | $0 |
| **2 — First Dollars** | 5–10k | 2–3 pilot deals at $3–5k/mo framed as insight partnerships; rate card; deal mechanics | $6–15k/mo |
| **3 — Scale** | 15k+ | Standalone insights product; bottle-page enrichment; portfolio deals | Reports uncapped |

Never let phase N+1 corrupt phase N. Pilots do not get recommendation placement at any price.

---

## 2. Phase 0 — Rails & Covenant (ship this quarter, $0 spend)

### 2.1 Product & engineering backlog

1. **Wire the flagship surface.** Replace hardcoded `BRAND_OF_MONTH` in `SpiritsLandingScreen` with `getFeaturedBrandForCategory()`. Render nothing when no active row exists (empty state = no ad, never a placeholder).
2. **Category of the Month component.** One reusable labeled card: brand image, `badgeLabel` ("Featured" / "Sponsored") always visible, tasting notes, 3 linked recipes, "find it near you" affiliate hook. Placement: Spirits landing per-category headers + a single Featured screen rail. **Never** For You, What Can I Make, or substitutions.
3. **Complete the funnel events.** Add `recordBrandClick` (slot tap → brand/bottle page) to the service; mirror all three events (`impression`, `click`, `cart_add`) to Mixpanel (`Brand Slot Viewed/Tapped/Converted`) so funnels are queryable without SQL. Extend contexts: `spirits_landing`, `featured_rail`.
4. **Attribution chain.** Define the canonical funnel and make every step emit: `slot_impression → slot_click → bottle_page_view → wishlist/shelf_add → recipe_made → cart_add`. Wishlist/shelf and recipe-made events already exist — add the `brand_id` attribution param when the session originated from a slot.
5. **Category taxonomy freeze.** Sellable categories (v1, 12): gin, vodka, rum, tequila, mezcal, bourbon, rye, scotch, brandy/cognac, liqueur, amaro/aperitif, non-alcoholic. One slot each per month. Vermouth folds into aperitif; new categories require a pricing decision, not a code change.
6. **Admin runbook, not admin UI.** A documented Supabase insert + `invalidateFeaturedBrandsCache()` flow is enough for years. Do not build a dashboard for 12 rows/month.
7. **Covenant enforcement as code.** A CI test asserting that recommendation modules (`aiRecommendationEngine`, `moodBasedRecommendations`, `recipeMatching`, substitution logic) never import `brandPartnershipService` and never read `featured_brands`. The KPI "sponsored slots in recommendations = 0" becomes a failing build, not a vibe.

### 2.2 Trust, legal & compliance (one-pager, written before any pitch)

- **Age gating proof:** document the age-gate flow with screenshots; brands' legal will ask.
- **Responsible-marketing codes:** DISCUS Code (US) and Ad Standards / provincial rules (Canada) — sponsored content must not target under-LDA audiences, imply health benefits, or depict overconsumption. Editorial checklist per slot.
- **Disclosure:** `badgeLabel` visible on every sponsored surface, every context — FTC / Competition Bureau compliant. No unlabeled anything (Product Bible §"brands cannot buy").
- **Geo:** no geo-targeted paid placement in v1 (sidesteps US three-tier and provincial variance). Revisit at Phase 3.
- **App Store:** sponsored content in an age-gated app is fine; document the position for review responses.

### 2.3 Deal paper (templates, drafted now, used in Phase 2)

Insertion-order template covering: term (monthly, seasonal multipliers), **category exclusivity** (slot is exclusive within its category for its month; no adjacency guarantee against competitors in *other* months — sell ROFR on renewal instead), **make-goods** (if delivered category-engaged reach < 80% of media-kit figure, extend the slot one month free), **right to decline** (KŌOPE curates eligibility; payment does not guarantee acceptance), **portfolio rule** (one parent company may hold max 3 category slots per month — protects marketplace diversity from a Diageo-style buyout), and reporting cadence (monthly automated report; quarterly insights upsell path).

**Exit criteria for Phase 0:** flagship surface live off real table data · full funnel events verified in Mixpanel · covenant CI test green · compliance one-pager and IO template written.

---

## 3. Phase 1 — Editorial Proof (~500+ MAU, 3 months)

Run **Category of the Month as an unpaid editorial program** — KŌOPE picks the brands (craft/interesting bottles, no payment, no permission needed to feature honestly), labeled "Featured," fully instrumented.

1. **Three cycles, 3–5 categories each.** Enough volume to produce believable funnel numbers without demanding content you can't produce solo. AI-drafted, founder-edited tasting notes and recipe pairings (Marketing OS tool-stack discipline: one person, <$100/mo).
2. **Auto-report generator.** SQL over `brand_impressions`/`brand_cart_adds` + Mixpanel funnel → monthly Markdown/PDF per featured brand: impressions, CTR, wishlist adds, top cocktail made, share of category scans. Ship as a GitHub Action (the challenge-rotation pattern). **This artifact is the product brands renew on — build it as product, not as a favor.**
3. **Media kit from real data.** After cycle 2: category-engaged user counts (not raw MAU), funnel benchmarks, one case-study page per featured brand. AI + locked brand kit, zero spend.
4. **Category-engagement segmentation.** Define "gin-active user" (scanned/wishlisted/made with gin in 30d) as a queryable segment — this is the number on the rate card.
5. **Pipeline building (not selling).** Map 20 target buyers per the Playbook Part 4 warm-intro motion. Prioritize **importers/distributors and craft brands** over major-brand marketing teams: faster cycles, monthly push priorities, regional budgets. Log in the CRM base; first outreach only when Phase 2 gate is crossed.

**Exit criteria:** 3 cycles shipped · auto-report generating monthly without manual work · media kit with real funnel numbers · ≥20-name pipeline with warmth ratings.

---

## 4. Phase 2 — First Dollars (5–10k MAU)

1. **Pilot framing (Playbook-canonical):** 3-month pilot, **$3–5k/mo**, positioned as an *insight partnership* — one labeled Category of the Month slot + monthly report + quarterly insight review. Lead the pitch with the covenant: "recommendation slots are not for sale at any price, which is why our engagement data is real."
2. **Rate card with seasonal multipliers.** Base by category-engaged reach; gin/tequila/rum premium May–Aug, whiskey/cognac/liqueur premium Oct–Dec (gifting), NA premium in January. A flat rate card leaves the best inventory underpriced.
3. **Sell 2–3 pilots maximum.** Keep ≥half the calendar editorial — the marketplace stays credible only while the majority of "of the month" features are unpaid picks. Scarcity is also the pricing story.
4. **Renewal engine.** Month-2 report review call per pilot; renewal offer = slot + **quarterly insight report upsell** ($2–3k/quarter). The slot-to-reports upsell is the entire point of Phase 2.
5. **Ops discipline.** Every deal on the IO template; make-good ledger; a single `docs/brand-deals/` folder as the system of record until deal volume justifies more.

**Exit criteria (mirrors Product Bible):** 2–3 pilots signed and renewed once · brand revenue growing toward ≤20% of total · **zero recommendation-integrity incidents** · report generation still zero-touch.

---

## 5. Phase 3 — Scale (15k+ MAU)

- **Insights as standalone product** — quarterly category demand reports sold without a slot attached; no inventory limit, this is the scale curve.
- **Bottle-page enrichment** (Amazon A+ model): brands pay to enrich their own canonical, labeled page. Honest retail media; never touches ranking.
- **Challenge sponsorship** bundles via the existing challenge system (`source: brand` drops).
- **Portfolio deals** with the 3-slot/parent-company cap held.
- Revisit geo-targeting with proper legal review; consider a lightweight self-serve report portal only when manual delivery breaks.

---

## 6. Scorecard

| Dimension | KPI | Target |
|---|---|---|
| Integrity | Sponsored slots inside recommendation surfaces | **0, forever (CI-enforced)** |
| Supply | Category of the Month cycles shipped on time | 12/yr |
| Demand | Pilot pipeline → signed → renewed | 20 → 3 → 2 |
| Measurement | Funnel events flowing end-to-end; reports auto-generated | 100% zero-touch |
| Economics | Slot revenue vs. insight-report revenue mix | Reports ≥ 50% of brand revenue by Phase 3 |
| Health | Slot CTR (trust proxy — falling CTR = burning the asset) | No 2-month decline >30% |

**Kill criteria:** any pressure — internal or from a buyer — to place paid content in For You, What Can I Make, or substitutions is refused at any price; a buyer who walks over this was buying the corruption, not the audience. If slot CTR collapses, pause selling and fix editorial quality before discounting.

---

## 7. Standing decisions

1. Brand platform revenue is **layer 3** of the stack (subscriptions → affiliate → brand → insights → B2B). It never jumps the queue.
2. MAU is our internal metric; **category-engaged reach** is the only number on the rate card.
3. The unpaid editorial program is permanent, not a bootstrap hack — it is what keeps "of the month" meaning something.
4. One person + AI runs this entire plan. Any workstream that needs a hire before Phase 3 is out of scope by definition (Marketing OS budget test).
