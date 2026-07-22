# KŌOPE Collector Blueprint — "The Cellar"

**The build:** the Bloomberg terminal for the bottles you own.
**The credibility thesis:** collectors don't trust features — they trust **sources, methodology, and names**. Every design decision below exists to make a skeptical collector say "this number is real, and these people are serious." Feature parity is copyable; earned authority is not. In every collecting hobby, the community anoints *one* authority (PSA for cards, Rare Whisky 101 for whisky indices, Kelley Blue Book for cars). This blueprint is how KŌOPE becomes that authority for spirits.
**Companion docs:** [KOOPE-PRODUCT-BIBLE.md](KOOPE-PRODUCT-BIBLE.md) · [KOOPE-COMPETITOR-REDTEAM.md](KOOPE-COMPETITOR-REDTEAM.md)

---

## 1. The Six-Layer Stack

```
6. Community        — trade matching, release calendar, verified collectors
5. Trust & Authority— advisory board, market report, valuation covenant
4. Financial Services— insurance, appraisals, consignment, estate
3. Product Tools    — portfolio terminal, alerts, exports, privacy
2. Authentication   — condition scale, provenance passport, counterfeit registry
1. Data & Valuation — licensed auction data, indices, published methodology
```

Each layer is only as credible as the one beneath it. Build bottom-up; market top-down.

---

## 2. Layer 1 — Data & Valuation (the foundation everything rests on)

### Candidate data sources & partners

| Category | Candidates | What they provide | Deal shape |
|---|---|---|---|
| Online spirits auctions | **Whisky Auctioneer, Scotch Whisky Auctions, Whisky Hammer, Unicorn Auctions** | Hammer prices at volume — the backbone of the price series | Licensed data feed + consignment affiliate (both sides of the deal) |
| Prestige auction houses | **Sotheby's, Bonhams, Christie's** spirits departments | High-end results, headline credibility, co-branded reports | Results licensing + consignment referral |
| Marketplaces/vaulting | **BAXUS** (vaulted, authenticated bottles) | Asking + transaction prices, authentication precedent | Data exchange or partnership |
| Index/analytics | **Rare Whisky 101, WhiskyStats, Noble & Co.** market reports | Established indices to benchmark against (and eventually co-publish with) | License, partner, or —long-term— acquire |
| Retail price discovery | **Wine-Searcher / spirits search engines** | Current retail asks for the non-auction majority of bottles | API license |
| First-party | **KŌOPE's own graph** | Wishlist "spotted prices," scan volume by SKU, community-reported purchases (moderated) | Already owned — the compounding advantage |

**Non-negotiable rule: licensed feeds only, never scraping.** The first time an auction house discovers scraped data, the partnership door closes forever — and (red-team §5.3) data supply is this market's choke point. Lock partnerships *first*; exclusivity-ish deals with two of the big four online auctioneers effectively deny a fast-follower the foundation layer.

### The valuation engine

- **Entity resolution is the hard, moat-building problem:** a "Blanton's" is not a "Blanton's Gold" is not a "Blanton's Straight From The Barrel," and 2019 vs 2023 bottlings differ in value. Extend the scan stack to **edition-level recognition**: label variant, age statement, proof, batch, bottling year (including laser/lot-code reading where printed). Getting this right is what separates a real valuation from a Google search — and it reuses KŌOPE's core scan asset.
- **KŌOPE Bottle Index:** per-bottle price history charts plus category indices (Bourbon 50, Scotch 100, Japanese 25). Every data point on the chart is **click-through-sourced** — "hammer price, Whisky Auctioneer, 14 Jun 2026." No orphaned numbers, ever.
- **Ranges, never false precision.** "Estimated $210–260 (confidence: high, 23 sales in 12 mo)" beats "$237." Collectors instantly distrust fake exactness — the Zestimate lesson. Thin data says so: "2 recorded sales — treat as indicative."
- **Published methodology.** A public, versioned document: how prices are weighted, how condition adjusts value, how outliers are handled, what triggers a re-rate. Changes are changelogged. This single artifact does more credibility work than any feature.

---

## 3. Layer 2 — Authentication & Provenance

- **The KŌOPE Condition Scale.** A published grading standard for fill level (neck/high-shoulder/mid-shoulder…), label, capsule/seal, tax strip, and box/papers — the PSA move: whoever writes the grading language owns the conversation. Photo-guided grading in-app; the scale becomes how listings everywhere describe bottles.
- **Bottle Passport.** Per-bottle provenance record: timestamped scans, purchase receipt vault, photo documentation, ownership history within KŌOPE. Exportable. When a passported bottle sells, the passport transfers — provenance becomes a *reason to insist the buyer uses KŌOPE*.
- **Counterfeit registry.** A maintained database of known-fake batches, refill red flags, and suspect lot codes, with in-scan warnings ("this edition is frequently counterfeited — check these three markers"). Sourced from auction-house rejection data, brand security teams, and vetted community reports.
- **Vision-based checks.** The scan stack learns fill-level estimation and label-anomaly detection (font drift, print quality, capsule inconsistencies). Framed honestly as *screening, not certification* — "3 risk markers detected; recommend expert authentication" — with referral to human experts for high-value calls.
- **NFC / smart-capsule integration.** Read brand-embedded NFC authentication (increasingly common on premium bottlings) so verified-by-brand status lands in the passport.

---

## 4. Layer 3 — Product Tools (the terminal)

- **Portfolio dashboard:** cost basis vs. current range, unrealized gain, allocation by category/distillery/region/age, performance vs. the KŌOPE indices. The screenshot collectors show friends.
- **Price alerts & watchlist:** movement on owned and hunted bottles; "your Weller lot re-rated +18% on new auction data."
- **Drink-or-Keep signal:** value trajectory vs. drinking honesty — "this bottle has been flat for 3 years; it was made to be opened." *This feature is a trust weapon:* a valuation platform that sometimes tells you to drink the asset proves it isn't farming your greed. (It also feeds Weekly Makers — the collector who opens the bottle is still KŌOPE's core user.)
- **Exports:** insurance-schedule PDF (in insurer-accepted format), estate/CSV export, annual portfolio statement. Boring, and exactly what a serious tool has.
- **Privacy by default.** Collections are valuable and theft-attractive: private by default, no geolocation on shared cards, share sheets show value only when the owner opts in, encrypted at rest. Say this loudly — security posture *is* a collector feature.

---

## 5. Layer 4 — Financial Services (where the revenue lives)

| Service | Partner candidates | Mechanics | Revenue |
|---|---|---|---|
| **Collection insurance** | Chubb, AXA XL, American Collectors, specialty collectibles brokers | One-tap: portfolio → insurer-formatted schedule → referred quote | Referral fee per bound policy; renewal share |
| **Certified appraisals** | ISA/ASA-credentialed appraiser network, USPAP-compliant reports | For estates, insurance, divorce, donation — KŌOPE data pre-fills, human signs | Marketplace take on appraisal fee |
| **Auction consignment concierge** | The Layer-1 auction partners | "Consign this bottle" in-app: estimate → photograph via guided flow → ship label → settlement tracking | Share of seller's commission (the same houses providing data — the flywheel) |
| **Estate & legacy tools** | Estate attorneys, the appraiser network | Beneficiary export, valuation-at-date reports | Included in Collector tier; drives appraisal volume |

Sequencing: insurance referrals first (pure referral, no ops), consignment second (deepens the auction partnerships), appraisals third (needs the network).

---

## 6. Layer 5 — Trust & Authority (how it *feels* like the best on the market)

This layer is the actual answer to "how do collectors feel this is #1." Tools and tactics:

1. **Named advisory board.** 4–6 people the community already trusts: a Keeper of the Quaich, a retired master blender or distillery director, a senior spirits auctioneer, a known bourbon writer/reviewer, a credentialed appraiser. Their names sit on the methodology page. Compensation in equity/retainer — their credibility is the product.
2. **The KŌOPE Market Report** — quarterly, free, genuinely good. Index movements, category rotation, release-season analysis, counterfeit trends. The Rare Whisky 101 playbook: become the source journalists cite, and the app underneath inherits the authority. This is the single highest-leverage credibility artifact on this list.
3. **The Valuation Covenant** (extends the Bible's brand covenant): *valuations, condition grades, and drink-or-keep signals are never sponsored, never brand-influenced, never pay-to-adjust.* A distillery cannot buy a better index position. Published, versioned, enforced as a KPI (violations = 0).
4. **Corrections policy.** When the data was wrong, say so, visibly, with a changelog. Financial-grade tools earn trust through visible error-handling, not claimed perfection.
5. **Conflict disclosure.** KŌOPE earns consignment fees from auction partners — disclose it on every consignment estimate, and show the *same* valuation whether or not the user consigns. The moment sell-side incentives leak into valuations, the authority dies.
6. **Verified collector program.** Identity-verified collectors with graded, passported collections get a badge that means something because it's hard to get — the community's status currency, minted by KŌOPE.
7. **Editorial voice.** Collector-facing copy drops the gamification register entirely. No XP confetti on a $3,000 bottle. The Cellar speaks like a private bank, not a game — tone is a credibility tool.

---

## 7. Layer 6 — Community (scarcity is social)

- **Release calendar + allocation trackers:** BTAC, Pappy season, Birthday Bourbon, lottery windows — dates, historical odds, drop alerts. The highest-engagement weeks in the hobby, currently scattered across Reddit threads. Cheap to build, habit-forming, and the *right* first community surface (per the Bible's social sequencing — it's a utility that happens to be communal).
- **Trade-intent matching:** "have / want" lists matched privately between verified collectors. KŌOPE facilitates discovery, not the transaction (legal posture: introduction, not marketplace).
- **Hunt boards:** regional finds and shelf-spotting with prices — feeds the Wishlist price journal and the retail price layer of the valuation engine (community data feeding Layer 1: the flywheel closes).

---

## 8. Internal Build Stack

Extends what exists — no parallel platform:

- **Scan stack extension:** edition-level classifier + laser/lot-code OCR + fill-level estimation (the existing 4-layer pipeline gains a "collector head").
- **Entity graph:** bottle → expression → edition → bottling resolution layer over the existing bottle DB (this *is* the valuation engine's core IP).
- **Time-series price store + ingestion pipeline:** licensed-feed connectors, normalization (currency, buyer's premium in/out, condition adjustment), outlier handling per the published methodology.
- **Report generation:** the same automated-insights machinery the Bible's brand-insights product needs (§8.2 stream 3) — build once, sell twice.
- Supabase remains the system of record; Cellar Mode's existing sync is the substrate.

---

## 9. Packaging & Pricing

**KŌOPE COLLECTOR** — an add-on tier above Pro (or standalone for pure collectors who never mix):

| | Price | Contains |
|---|---|---|
| Collector add-on | **$99/yr** (on any tier) | Terminal, valuations, alerts, condition grading, exports, release calendar |
| Collector+Concierge | **$199/yr** | + consignment concierge, appraisal credits, insurance white-glove, verified badge fast-track |

Collector conversion behaves like a trading tool, not a recipe app — expect 15–25% of the collector audience, not 4%. Revenue mix at maturity: subscriptions ≈ 40%, consignment share ≈ 30%, insurance/appraisal referrals ≈ 20%, data/report licensing ≈ 10%.

---

## 10. Sequencing

**Phase 1 (90 days):** licensed price history for the ~5,000 most-collected SKUs (two online auction partners) · portfolio dashboard on existing Cellar Mode · insurance PDF export · methodology page v1 · ranges-with-confidence UI.
**Phase 2 (month 4–9):** Condition Scale published · price alerts · release calendar + drop alerts · first quarterly Market Report · insurance referral partner live · advisory board announced.
**Phase 3 (month 9–18):** consignment concierge with auction partners · Bottle Passport · counterfeit registry · verified collector program · trade-intent matching · appraiser network.

**The one-line test for this product:** *would a collector who owns a $40,000 cellar trust this number enough to insure against it?* Every layer above exists to make that answer yes — and the collector who says yes never churns.
