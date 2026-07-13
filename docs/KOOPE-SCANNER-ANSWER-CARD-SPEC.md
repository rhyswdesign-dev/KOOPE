KŌOPE Scanner Stack &amp; Answer Card — Target Spec vs. Current Build
====================================================================

**Status:** DRAFT — for review before execution.
**Date:** 2026-07-04 · **Revised:** 2026-07-08 (founder decision, see A.0)
**Relates to:** [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md) §2.2 (Answer Card), §2.3 (4-layer scan stack), §5 (scan → resolved decision < 3s, >95% success), Phase 1 exit gate.
**Method:** Current-state claims below are sourced from direct code reads with file:line citations. The target design is a recommendation, not yet built.

### A.0 UX decision (2026-07-08): the user scans the bottle, never the barcode

Founder decision overriding the earlier "barcode-first" framing (and diverging from the Master Plan §2.3 wording, which should be updated to match): **the presented experience is always "point the camera at the bottle."** No barcode reticle, no barcode mode, no mode switch, and the app never instructs the user to find or aim at a UPC. A barcode scan reads as grocery checkout; whole-bottle recognition reads as the product. The sub-3-second answer stays — but it must *feel* like the app recognized the bottle, not scanned a SKU.

What this changes and what it doesn't:

- **Barcode decode survives as invisible plumbing only.** A silent, continuous on-device decode still runs on every frame — it costs nothing, and when a barcode happens to pass through frame it can resolve the answer instantly. But it never drives UI: no barcode overlay, no "align the barcode" prompt, no indication of which path produced the answer. The user's mental model is "it saw the bottle."
- **"Barcode wins by default" → "first confident answer wins, silently."** The pipeline is a race; the user never learns who won.
- **The barcode fallback modal is cut.** Today's "bottle not found → switch to barcode mode" flow (the `barcodeOnly` route param path) asks the user to flip the bottle and hunt for a UPC — exactly the feel this decision rejects. Last-resort fallback is a retry hint or manual search, never a barcode instruction.
- **Vision becomes the primary latency budget.** Since front-of-bottle framing rarely has a barcode visible, the vision path (one-pass recognition, downscaled payload, label-text-hash caching) is now the critical path for the 3-second target, not an edge case. The A.3/A.4 targets below are written accordingly.

---

## Part A — The Scanner Stack: what "near-100% accurate in 3 seconds" actually requires

### A.1 What's built today, and why it can't hit the target

The current pipeline is **AI-vision-first with barcode as an opt-in fallback** — the inverse of the Master Plan's "barcode-first" requirement:

- `SmartScanScreen.tsx:78` hardcodes `aiScanEnabled = true`, and line 570-572 contains an explicit code comment: *"Never wire barcode in normal AI photo mode — causes auto-fire on any barcode that appears in frame."* Barcode scanning only activates via an explicit `barcodeOnly` route param or the "bottle not found" fallback modal.
- On a cache miss, the photo path is **two sequential external AI calls, not one**: `vision-analyze` (proxies to Google Cloud Vision for text/label/web detection) runs, and only if the local `SPIRITS_DATABASE` match fails does `spirit-lookup` fire a *second*, separate round trip to Claude Haiku with the image. These are chained `await`s (`SmartScanScreen.tsx` `handleImageCaptured`), not parallelized.
- The barcode path, when it does run, queries three free public grocery-UPC APIs (Open Food Facts, UPCItemDB, LCBO) in parallel with a 6-second timeout each (`barcodeService.ts:166-170`) — none of these are tuned for spirits/wine coverage, and the project's *own* curated table for this (`bottle_barcode_mappings`) is wired only into the post-scan **correction** flow (`scanCorrectionService.ts:82`), not the initial lookup. The one asset that could make barcode scanning near-100% accurate (a first-party, weighted-vote-corrected SKU table) currently sits downstream of the fast path instead of powering it.
- Images are captured at full quality (`quality: 0.8`, no `base64`) and only reduced via a 60%/70% center-crop + `compress: 0.6` re-encode before upload — there's no explicit pixel-dimension downscale, so upload payload is larger than a label-reading model needs.

**Net effect:** the "3-second, near-100%-accurate" bar is achievable today only in the barcode-fallback path (which is disabled by default), and unreachable in the default AI-photo path on a cache miss, where two chained vendor API calls (Google Vision → Claude) plus upload of a near-full-resolution image can easily exceed 3 seconds on real store wifi/cellular.

### A.2 The design principle

**One presented experience (scan the bottle), multiple silent resolution paths racing underneath — first confident answer wins, and the user never learns which path answered.**

The user-facing product is whole-bottle recognition, full stop (see A.0). Under the hood, a correctly-resolved barcode is still a database key lookup against a known SKU — *definitionally* ~100% accurate and resolvable in well under a second — so when a barcode happens to be visible in frame, the silent decoder should be allowed to win the race. But because the framing the UX asks for (front of bottle, label facing camera) rarely includes a barcode, AI vision recognition (OCR + label matching against a cached SKU index, cloud multimodal as fallthrough) is the *primary* path in practice and must be engineered to hit the 3-second budget on its own, not treated as the slow fallback.

### A.3 Recommended stack

| Layer | Today | Target |
|---|---|---|
| **Presented scan UX** | AI photo mode by default, plus an explicit barcode mode (`barcodeOnly` route param) and a "bottle not found → try barcode" fallback modal | **One mode: point at the bottle.** No barcode reticle, no mode switch, no UPC instruction anywhere (A.0). Delete the `barcodeOnly` entry points and the barcode fallback modal; last-resort fallback is a retry hint ("try more light / get closer") or manual search. |
| **Vision recognition (primary path)** | Sequential: Google Vision → (on local-match miss) → Claude Haiku vision | **One recognition pass, not two chained vendor calls.** Either (a) on-device OCR (Apple Vision framework via a native module, or ML Kit) to extract label text with near-zero latency, then a fast fuzzy-match against a cached local SKU index, falling through to a single cloud multimodal call only when local match confidence is low — or (b) if on-device OCR isn't worth the native-module investment yet, collapse the two cloud calls into **one** multimodal LLM call that does OCR + entity match + confidence in a single round trip, rather than "get raw labels from Vision, then ask Claude to guess" as two separate vendor hops. The current two-hop design pays for two network round trips and two vendor bills to do a job one well-prompted multimodal call can do in one. This path carries the 3-second target now (A.0), so it gets the engineering attention first. |
| **Barcode capture (silent accelerant)** | Off by default; user must switch modes | **Always-on, silent, continuous** on-device decode running on every camera frame in the background of the one scan screen — zero UI, zero taps, zero user awareness. Decoding is free (no network), so it costs nothing to leave running; when a barcode happens to pass through frame (user picks the bottle up, back label rotates into view), it can resolve the answer instantly. |
| **Barcode resolution** | 3 free public grocery APIs, 6s timeout, no use of the project's own curated table at scan time | **Race, first-good-result-wins, not waterfall**: query `bottle_barcode_mappings` (your own corrected, spirits-tuned table) and `spirits_cache` in parallel with the public APIs; take whichever resolves first with adequate confidence, cancel the rest. Over time, as `scanCorrectionService.ts`'s weighted-voting table fills in, your own table should win the race on an increasing share of scans — this *is* the flywheel the Master Plan describes ("database compounds faster"), so this table deserves promotion from "correction sink" to "primary source," not just semantically but in call order. |
| **On a confident silent-barcode hit** | N/A (path usually skipped) | **Skip AI vision entirely and show the Answer Card immediately** — but with no indication a barcode was involved. To the user it reads as instant bottle recognition. |
| **Image payload** | Full-quality capture, crop + quality-compress only | Downscale to the actual resolution a label-reading model needs (roughly 1024px on the long edge is generous for OCR) *before* upload, on top of the existing crop. Smaller payload directly reduces the upload leg of the latency budget, which matters most on the weak/bad store wifi the Master Plan explicitly calls out as a target condition. |
| **Bad-photo handling** | A local image-quality gate exists before the network call | Keep it, but pair it with on-device brightness/blur heuristics that produce specific retry guidance ("move closer," "more light") *before* a network call is attempted — a doomed request shouldn't spend any of the 3-second budget. |
| **Cold-start latency** | Supabase Edge Functions (Deno) — can have cold-start tax on the hot path | Keep the identification-critical functions warm (scheduled pings, or evaluate moving just the hot path to a runtime with better cold-start characteristics if this becomes measurable in production telemetry — don't guess, measure first). |
| **Continuous learning** | `spirits_cache` keyed by Claude-lookup results and barcode matches; corrections feed `bottle_barcode_mappings` | Extend the same weighted-correction principle to vision matches: cache by a hash of extracted label text, not just barcode, so a bottle correctly identified once (anywhere, by any user) gets faster and more certain on every subsequent scan — this is the actual mechanism behind ">95% success," not a better single model. |

### A.4 Target latency budget (P95, under 3s with real headroom)

```
Common case — bottle framed, on-device OCR available:
  capture + crop + resize + compress      ~150–250ms
  on-device OCR                           ~0–100ms
  edge fuzzy-match against cached index   ~150–300ms
  → Answer Card renders                   < 700ms total (most cases)

No local match, cold cache (worst case):
  capture + crop + resize + compress      ~150–250ms
  upload (downscaled image)               ~200–400ms
  single multimodal recognition call      ~800–1500ms
  → Answer Card renders                   ~1.3–2.2s total

Bonus case — barcode happened to pass through frame (silent decode):
  decode (on-device, continuous)         ~0–100ms
  own-DB lookup (indexed Postgres)        ~150–300ms
  → Answer Card renders                   < 500ms total
```

Every branch has real headroom inside 3 seconds, including the worst case — which is the point: today's worst case (Vision → Claude chained, near-full-res upload) has no such headroom.

### A.5 Why this gets you to "near-100%," specifically

Model quality is not the lever here — **correction-loop maturity and cache compounding are.** With whole-bottle scanning as the presented experience (A.0), the primary accuracy flywheel is the label-text-hash cache: every bottle correctly identified once (by any user, anywhere) becomes a fast, near-certain local match for every subsequent scan, and every user correction permanently upgrades that entry. The silent barcode decode adds exact, key-lookup accuracy for free whenever a barcode drifts through frame — `bottle_barcode_mappings` still belongs in the hot path, it just no longer defines the UX. The fastest path to ">95% success" is (1) collapsing the two-hop cloud recognition into one pass so the primary path is fast enough to actually run to completion, (2) putting the project's own curated tables (label-hash cache *and* barcode table) in the hot path instead of only the correction path, and (3) treating every user correction as a permanent accuracy gain for every future scan of that bottle — not picking a fancier vision model.

---

## Part B — The Answer Card: exact target vs. what's actually rendered today

### B.1 Target (Master Plan §2.2, verbatim structure)

```
[ Bottle identity — name, style, proof, "what it tastes like", 1-line story ]
[ Value line — "Fair price: $32–38. You saw $32. ✓ Good buy."          ]
[ THE HOOK — "Owning this unlocks 11 cocktails with your shelf"        ]
[   → 3 recipe cards free (from the free pool), 4th greyed = paywall   ]
[ Actions: Add to Bar (Owned) · Want it · 🎁 Scanning for someone?     ]
```

Five blocks. Nothing else, above the fold. It "must resolve a decision, never file a catalog entry."

### B.2 What's actually rendered (`src/screens/BottleDetailScreen.tsx`, 3,219 lines), top to bottom

| # | Section | Lines | Note |
|---|---|---|---|
| 1 | Hero image + confidence badge + ABV/origin/price-tier pills | 952–1015 | Identity, partially |
| 2 | Scan-feedback strip ("Is this the right bottle?" + correction flow) | 1020–1123 | Not in target spec |
| 3 | Flavor profile + tasting notes (swipeable carousel) | 1125–1171 | Identity, continued |
| 4 | "Typical Price Range" card | 1174–1208 | **Static estimate only — no comparison to a seen price** |
| 5 | Serve guidance card | 1246–1301 | Not in target spec (nice-to-have, wrong position) |
| 6 | "Cocktails You Can Make" rail (3 free / 5 paid) + one locked-teaser footer card | 1303–1379 | The Hook, present but demoted |
| 7 | "About This Spirit" panel | 1382–1389 | Identity, continued (story) |
| 8 | Scan Again / Find Nearby / Share | 1392–1416 | Not in target spec |
| 9 | "Wrong bottle? Clear result" link | 1418–1421 | Not in target spec |
| 10 | Wishlist text link (small, secondary styling) | 1423–1441 | This is "Want it" — demoted to a text link |
| 11 | Cellar Mode card | 1444–1578 | **Dead code — wrapped in `{false && ...}`, never renders** |
| 12 | Sticky bottom bar: single **"Add to Shelf"** button | 1584–1607 | This is "Add to Bar" — the only primary action |
| 13 | Price-prompt modal (post-wishlist-save: "Seen a price? Log it") | 1611+ | Feeds a personal price journal, not a scan-time verdict |

No gift-mode / "scanning for someone else?" toggle exists anywhere in the codebase (confirmed by repo-wide search).

### B.3 Gap analysis, block by block

**1. Identity** — the content mostly exists, but it's spread across three non-adjacent sections (hero pills, flavor carousel, "About This Spirit" panel at the bottom) rather than one glanceable block. A user has to scroll through pricing, serve guidance, and the recipe rail to reach the "story" line the target spec puts in block one.

**2. Value line** — **built wrong, not just misplaced.** What exists is a static `priceEstimate` range (sourced from the local `SPIRITS_DATABASE` or, on a cloud lookup, invented by Claude at prompt-time — there is no licensed pricing feed yet, and the Master Plan itself scopes that as a Phase-4 "lock the data choke point" project). There is no code path that compares an observed/seen price against that range to produce "✓ Good buy" — the only "you saw a price" mechanic is the price-journal modal, which fires *after* saving to wishlist, for the user's own later reference, not as an at-scan verdict. This is the single highest-leverage gap: it's the exact mechanic the Master Plan says "deletes DRAM's entire wedge," and it doesn't exist as a comparison today, only as an estimate.

**3. The Hook** — closest of the five blocks to spec, and the least effort to fix. The recipe rail and locked-teaser card both exist. The gaps are positional and cosmetic, not architectural: (a) it's the 6th thing on the screen, well past a 3-second glance; (b) the "4th greyed card" the plan describes (a card visually present in the row, blurred/locked) is currently a single footer teaser card appended *after* the row, not a fourth card inside it; (c) the plan wants one big-number headline ("unlocks 11 cocktails") — current copy is distributed per-card rather than leading with the count.

**4. Actions** — **built wrong.** The plan wants three peer actions presented together. Today there is one primary action (sticky "Add to Shelf" button) and "Want it" is a de-emphasized text link, not a button of equal weight. Gift mode doesn't exist.

**5. Everything else** — scan-feedback correction, serve guidance, Scan Again/Find Nearby/Share, and the dead Cellar Mode block add real scroll distance before the decision-relevant content appears. None of this content is bad — serve guidance in particular is genuinely useful — but its position works directly against "resolve a decision in three seconds." The current screen reads as a catalog/spec-sheet page with 13 stacked sections; the target is a single decision card with a "see more" beneath it.

### B.4 Recommended rebuild shape

Keep everything genuinely useful; **reorder and compress**, don't necessarily delete:

1. **Identity block** — merge hero + flavor summary + one-line story into a single compact card. Full tasting-notes detail can live in the "see more" fold.
2. **Value line** — ships in two possible versions depending on how far the pricing-data problem has progressed: *range-only* ("Fair price: $32–38") is shippable now with what exists; the full "you saw $32 ✓ good buy" comparison requires capturing an observed price *at scan time* (not post-wishlist) and a real range to compare against — this is a product decision, not just a UI reorder (see B.5).
3. **The Hook, promoted to position 2/3** — single big-number headline, true 4-card row with a visually locked 4th card, not a footer teaser.
4. **Actions row** — Add to Bar / Want it / 🎁 gift toggle as three visual peers.
5. **Below a "see more" fold** — serve guidance, full tasting notes, "About This Spirit," scan-correction affordance, Scan Again/Share. Delete the dead Cellar Mode block outright (it's unreachable code — Engineering Audit territory, not a design decision).

### B.5 The one open product question this spec surfaces

The Master Plan's exact copy — *"Fair price: $32–38. You saw $32. ✓ Good buy."* — requires two things that don't exist yet: (1) an observed-price capture **at scan time**, before any save action, not the current post-wishlist price-journal modal; and (2) a fair-price range with a credible source, not a Claude-invented estimate. Shipping the *range* half now is low-risk and matches "value-on-scan ships free" from the plan. Shipping the *comparison* half either means adding a lightweight "seen a price?" prompt directly into the scan flow (cheap, ships now) while treating the range itself as an estimate until licensed pricing data lands later (per the plan's own Phase-4 sequencing) — or holding the full comparison copy until sourced ranges exist. This is worth a decision before building, not an assumption.

---

## Next step

This document is the spec. Turning it into working code touches: the camera/scan screen, two edge functions (`vision-analyze`, `spirit-lookup`), the barcode-lookup service, and a full restructure of a 3,219-line production screen — real scope, not a quick patch. Recommend sequencing this as its own plan before writing code.
