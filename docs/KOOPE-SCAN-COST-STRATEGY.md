# KŌOPE Scan Cost Strategy — running a free scanner without the bill scaling with it

**Date:** 2026-07-18
**Relates to:** [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md) §3.1 ("scanning is **never** gated — every scan feeds the database; gating the wedge starves the flywheel"), [KOOPE-SCANNER-ANSWER-CARD-SPEC.md](KOOPE-SCANNER-ANSWER-CARD-SPEC.md) §A.3/A.5, [KOOPE-ENGINEERING-WORKPLAN.md](KOOPE-ENGINEERING-WORKPLAN.md) §1.3.
**Pricing as of this writing** — Google Vision and Anthropic prices change; re-verify before making budget decisions on these numbers.

---

## 1. The constraint

Scanning is free and unlimited for every user, forever — that's product law, not a
cost decision to revisit. The scanner is the wedge: every scan feeds
`spirits_cache`/`scan_corrections`, and that database _is_ the compounding asset
(Master Plan §2, Scanner Spec §A.5). So the question is never "should we limit
scans" — it's **"how do we make the marginal scan cost trend toward zero as usage
grows."**

The good news: the architecture was already designed for exactly this. The levers
below are mostly about _turning on things that already exist_ rather than building
new systems.

---

## 2. Anatomy of a scan: where money is spent

Every camera scan runs through `bottle-recognize`
(`supabase/functions/bottle-recognize/index.ts`). The pipeline, with per-step cost:

| Step                   | What runs                                           | Cost per scan | Notes                                                                                                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Auth + rate limit   | Supabase RPC `increment_scan_count`                 | ~$0           | Live as of 2026-07-18 (migration 020 applied). FREE: 30/day, paid: 200/day                                                                                                                                                                                                                      |
| 2. **Google Vision**   | TEXT_DETECTION + LABEL_DETECTION (2 billable units) | **~$0.003**   | Runs on **every** scan, unconditionally. $1.50/1,000 units × 2 features. First 1,000 units/feature/month free → first ~1,000 scans/month have $0 Vision cost. **Requires billing enabled on the GCP project** (the 403 blocker found 2026-07-18) — enabling billing does not skip the free tier |
| 3. Spirit-image gate   | Local check (`_shared/matchSpirit.ts`)              | $0            | Rejects non-bottle photos before spending anything further                                                                                                                                                                                                                                      |
| 4. Catalog match       | Postgres query against `spirits_catalog`            | ~$0           | **Currently 0 rows** — never hits (see L1)                                                                                                                                                                                                                                                      |
| 5. **Claude fallback** | `claude-haiku-4-5` vision call                      | **~$0.005**   | Runs on every catalog miss — today, that's every scan. ~2,900 image tokens + ~600 prompt tokens in ($1/MTok), ~400 tokens out ($5/MTok)                                                                                                                                                         |
| 6. Cache write         | `spirits_cache` upsert (confidence ≥ 0.8)           | ~$0           | Written but **never read back** by this function (documented scope cut in the file header)                                                                                                                                                                                                      |

**Marginal cost per scan today: ~$0.008 — under one cent.** But 100% of scans pay
the full Claude cost because the two free paths (catalog, cache) aren't
operational. The barcode path (`barcodeService.ts`) costs $0 (on-device decode +
free public APIs + own DB) but is opt-in fallback only.

### Why the Claude image costs what it does

The client crops to 60%×70% center and re-encodes (`compress: 0.6`) but does **not
downscale pixels** (`googleVisionService.ts:convertImageToBase64`). Anthropic
auto-resizes anything above 1568px on the long edge, so a typical phone capture
lands at ~1568×1372 → image tokens ≈ (1568 × 1372) / 750 ≈ **2,900 tokens** ≈
$0.003 of the ~$0.005 Claude cost. (Haiku 4.5 caps at 1568px — the 2576px
high-res tier is Opus/Sonnet-5 only, irrelevant here.)

---

## 3. Monthly cost projections

Assumes ~10 scans/user/month (early-stage estimate; the Bible's day-30 target is a
5+ bottle shelf, so early users scan in a burst then taper). "Free-path %" = scans
resolved by catalog/cache/barcode with no Claude call.

| Scenario                   | Scans/mo | Vision | Claude @ 0% free-path | Claude @ 70% free-path | Total (0% → 70%)   |
| -------------------------- | -------- | ------ | --------------------- | ---------------------- | ------------------ |
| 500 MAU                    | 5,000    | $12    | $25                   | $8                     | **$37 → $20/mo**   |
| 1,000 MAU                  | 10,000   | $27    | $50                   | $15                    | **$77 → $42/mo**   |
| 2,500 MAU (breakeven zone) | 25,000   | $72    | $125                  | $38                    | **$197 → $110/mo** |
| 5,000 MAU                  | 50,000   | $147   | $250                  | $75                    | **$397 → $222/mo** |

Context: the workplan puts solo-founder breakeven at ~2.5–3k MAU with 4% paid
conversion → ~100 KŌOPE+ subscribers ≈ $500/mo revenue. Even at the *worst case*
(0% free path), scan cost at that scale is ~$200/mo — significant but not
existential, and every lever below pushes it down.

**Abuse ceiling:** the rate limit (now live) caps a FREE user at 30 scans/day =
900/mo = ~$7/mo absolute worst case per abusive user. Note this is an abuse
ceiling, not a product gate — median real usage is far below it, and "unlimited
scanning" stays true in every honest sense.

---

## 4. The levers, ranked by leverage

### L0 — Enable GCP billing _(the current blocker — do first)_

Vision returns 403 on every call until billing is enabled on the GCP project
behind `GOOGLE_VISION_API_KEY`. Enabling billing does **not** mean paying
immediately — the 1,000-units/feature/month free tier still applies. Set a
**budget alert** (e.g. $50/mo) in the same sitting.
**Effort: 5 minutes · Savings: n/a (unblocks the scanner entirely)**

### L1 — Sync `spirits_catalog` _(biggest immediate win, zero code)_

The table now exists (created 2026-07-18) but has **0 rows**. `npm run
catalog:sync` pushes the 190-bottle local database
(`src/data/spiritsDatabase.ts`) up. Every scan of a known bottle then resolves at
step 4 for ~$0 — no Claude call. The 190 bottles skew toward exactly what people
scan (common gins, bourbons, tequilas), so the free-path share from this alone is
meaningful from day one.
**Effort: one command · Savings: kills the $0.005 Claude cost for every known-bottle scan**

### L2 — Add the `spirits_cache` pre-check to `bottle-recognize` _(the compounding flywheel)_

The function's own header documents this as a deliberate v1 scope cut: results are
_written_ to `spirits_cache` but never _read_ before falling through to Claude. So
today, 1,000 users scanning the same unknown bottle = 1,000 Claude calls.
With the pre-check: **any bottle correctly identified once, by any user, anywhere,
is free for every subsequent scan by everyone.** This is the exact mechanism the
Scanner Spec §A.5 names as the real path to ">95% success" — cache compounding,
not a better model. Requires porting the OCR→canonical-name key extraction
(`GoogleVisionService.extractBottleNameFromOCR`) server-side; the spec's
longer-term version is a label-text-hash key (§A.3 "continuous learning").
**Effort: M (one edge-function change + one ported heuristic) · Savings: converts per-scan Claude cost into once-per-bottle-ever**

### L3 — Downscale images to ~1024px before upload

Anthropic resizes to 1568px anyway, so pixels above that are pure upload waste;
1024px is generous for label OCR (spec §A.3). At 1024px long edge: ~1,220 image
tokens vs ~2,900 → saves ~$0.0017 per Claude call **and** cuts the upload leg of
the 3-second latency budget — the latency win matters more than the money.
One-line change in `convertImageToBase64` (`ImageManipulator` already in use).
**Effort: S · Savings: ~35% of Claude cost per call + faster scans**

### L4 — Rate limits ✅ _(done 2026-07-18)_

`increment_scan_count` + `scan_rate_limits` now live. Nothing further to do
except revisit the 30/day FREE ceiling if telemetry ever shows legitimate users
hitting it (it shouldn't).

### L5 — Silent barcode path (Scanner Spec Part A — separate plan)

A barcode decode is on-device and free; resolution against
`bottle_barcode_mappings`/public APIs is ~$0. The spec's always-on silent decode
(§A.0) means any scan where a barcode drifts through frame skips Vision *and*
Claude entirely. This is scoped as its own scanner-stack plan (native camera
work) — noting it here because it's also a cost lever, not just UX.
**Effort: part of the Part-A plan · Savings: $0.008 → $0 for every barcode-resolved scan**

### L6 — On-device OCR (the endgame)

Spec §A.3 option (a): Apple Vision framework / ML Kit OCR on-device ($0), fuzzy
match against a cached SKU index, cloud only on low confidence. This is the only
lever that kills the **Vision** cost (which otherwise runs on 100% of scans
forever). Mature state: known bottles cost literally $0 marginal. Not urgent at
current scale — becomes worth the native-module investment when Vision spend
alone clears ~$100/mo (~35k scans/mo).

### Optional — drop LABEL_DETECTION (not recommended yet)

Halves Vision cost ($0.003 → $0.0015/scan) but weakens the spirit-image gate that
prevents wasting Claude calls on non-bottle photos. The gate also checks OCR text
for ABV patterns, so it wouldn't break outright — but don't take this until
telemetry shows what share of the gate's rejections come from labels vs. text.

### Explicitly not worth doing

- **Anthropic prompt caching** — the static prompt is ~500 tokens ($0.0005); images
  are unique per scan and can't share cache. Complexity for ~nothing.
- **A cheaper/smaller model** — Haiku 4.5 is already the cheapest vision-capable
  Claude tier; accuracy is the flywheel's seed data, don't degrade it to save
  fractions of a cent.
- **Gating scans** — never. Product law, and the math above shows it's unnecessary.

---

## 5. Cost trajectory (why this gets _cheaper_ per scan as you grow)

```
Launch (today):        catalog empty, no cache read        → ~$0.008/scan, 100% paid path
+ L0/L1 (this week):   190-bottle catalog live             → common bottles free; ~$0.005 avg
+ L2 (Phase 1):        cache pre-check shipped             → each bottle paid once ever, globally
+ L5 (Part-A plan):    silent barcode                      → barcode-visible scans fully free
Mature flywheel:       80–90% free-path                    → ~$0.001–0.002/scan average
+ L6 (later):          on-device OCR                       → known bottles: $0 marginal
```

This is the inverse of most API-backed features: because every paid scan
permanently enriches the shared cache, **cost per scan falls as scan volume
rises**. The more users scan, the cheaper each scan gets — the flywheel pays for
itself.

---

## 6. Guardrails & monitoring

1. **GCP budget alert** on the Vision project (do with L0) — e.g. alert at $25,
   cap-review at $100.
2. **Anthropic Console spend limit** on the workspace holding the
   `ANTHROPIC_API_KEY` used by edge functions.
3. **Track the source mix in Mixpanel** — `bottle-recognize` already returns
   `source: 'catalog' | 'claude-vision'` and the client logs it
   (`GoogleVisionService.recognizeBottle` → `log.info`). Wire `source` into the
   scan analytics event so "free-path %" is a standing dashboard number. This is
   the single KPI for this whole strategy — it should climb every month.
4. **Workplan 1.3 telemetry** (per-layer latency + success into `scan_events`)
   doubles as the cost dashboard — same instrumentation, second read.
5. **Weekly sanity number:** `SELECT count(*) FROM spirits_cache` — the cache
   should grow monotonically; if it stalls while scan volume grows, L2 regressed.

---

## 7. Summary

|                                           |                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Marginal scan cost today                  | ~$0.008 (¢0.8) — all paid path                                             |
| At breakeven scale (2.5k MAU), worst case | ~$200/mo                                                                   |
| Same scale, levers applied                | ~$110/mo falling toward ~$50                                               |
| Absolute per-user abuse ceiling           | ~$7/mo (rate limit, live)                                                  |
| The one KPI                               | **Free-path % of scans** (catalog+cache+barcode) — should rise every month |
| Do this week                              | L0 (enable GCP billing + budget alert) · L1 (`npm run catalog:sync`)       |
| Do in Phase 1                             | L2 (cache pre-check) · L3 (1024px downscale) · source-mix dashboard        |
| Do later / separate plans                 | L5 (silent barcode, Part-A plan) · L6 (on-device OCR at ~35k scans/mo)     |

Free scanning is not a cost problem — it's a ~$0.008/scan cost with a designed-in
decay curve. The architecture already contains its own cost reduction; the work is
switching the free paths on and watching one number go up.

---

_Pricing sources (as of 2026-07-18): Google Cloud Vision $1.50/1,000 units per
feature (units 1,001–5M/mo), first 1,000 units/feature/month free; Claude Haiku
4.5 $1.00/MTok input, $5.00/MTok output; Anthropic image tokens ≈ (w×h)/750,
auto-resized to ≤1568px long edge on Haiku-tier models._
