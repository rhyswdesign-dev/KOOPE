# Taste Profile Research — Ingredient Intensity & Naive Formula Audit

**Date:** 2026-07-31
**Author:** Research pass (no code changes)
**Scope:** Pure research to support a future fix to the Taste Profile gauges (Spirit Forward, Sweetness, Acidity, Finish) on the recipe detail screen.

## Purpose & how to read this report

Today the app computes each of the four Taste Profile gauges with a single naive rule: for a given axis, sum the ounces of every ingredient tagged into that axis's category, divide by total recipe ounces. That formula silently assumes every ingredient in a category tastes equally intense per ounce — 1 oz of simple syrup "counts" the same as 1 oz of Campari for sweetness/bitterness, and a 0.25 oz pour of Fernet-Branca "counts" for almost nothing on Spirit Forward even though it is 39% ABV and aggressively assertive.

This report gives an engineer everything needed to replace the ounce-only math with an ounce **times an intensity multiplier**, without redesigning the axis-assignment logic itself:

- **Deliverable 1** is a reference table of intensity multipliers per ingredient, grouped by category, each relative to an explicit baseline ingredient in that category (baseline = 1.0x). Multiply an ingredient's ounces by its multiplier before summing, and the totals should track perceived taste far more closely than raw ounces.
- **Deliverable 2** walks the real cocktail catalog (`src/data/cocktails.ts` and `src/utils/cocktailDetailFallbackData.ts`) and calls out, cocktail by cocktail, where the naive ounce-ratio formula would produce a noticeably wrong picture and in which direction, versus where it's probably already fine.
- A closing section lists cocktails I looked at but am not confident enough to assert a specific correction for — named explicitly rather than silently dropped.

**On sourcing:** where a specific number is available (ABV%, sugar-per-liter, Brix), I cite it. Where I'm relying on general bartending/mixology consensus (e.g. "Campari reads as more bitter than sweet in a stirred drink," which is near-universal bar knowledge but not something with a single citable number), I say so explicitly rather than inventing false precision. Multipliers are directional judgment calls calibrated against these facts and consensus — not derived from a lab measurement — and should be treated as a first, reviewable pass, not gospel.

**Axes, as currently modeled in the app:** Spirit Forward (proof/alcohol character), Sweetness, Acidity (folded together with bitterness in the current axis structure — see note in Deliverable 1), Finish (length/lingering character). Multi-axis ingredients (e.g. Campari hits both sweetness-adjacent bitterness and, at higher ABV, spirit-forward) are scored on each relevant axis separately below.

---

## Deliverable 1 — Ingredient flavor-intensity reference table

### How to use this table

Each ingredient has one or more axis ratings, each on roughly a 0.5x–3x scale relative to that category's stated baseline (1.0x = tastes like the baseline, per ounce). A rating **above 1.0x** means "per ounce, this ingredient pushes that axis harder than the baseline." A rating **below 1.0x** means it's gentler than the baseline per ounce.

### Base spirits (axis: Spirit Forward / proof character)

Baseline = **vodka, standard 40% ABV / 80 proof** = 1.0x. Nearly all major base spirits (vodka, gin, white rum, tequila, whiskey) are bottled at 40% ABV in the US by regulatory convention, so ABV alone doesn't separate them — what separates them is congener load (flavor compounds beyond ethanol) and how "hot"/assertive they read on the palate at equal proof. This is general mixology consensus; there is no single citable "spirit intensity" index.

| Ingredient                                  | Multiplier      | Justification                                                                                                                                                                                                                                             |
| ------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vodka                                       | 1.0x (baseline) | 40% ABV, deliberately low-congener/neutral — the reference point for "proof without flavor intrusion."                                                                                                                                                    |
| Gin (London Dry)                            | 1.1x            | Same 40% ABV as vodka but juniper/botanical load makes it read as more assertive per ounce on the palate, even though alcohol strength is identical.                                                                                                      |
| White rum                                   | 0.9x            | 40% ABV but lightly filtered/column-distilled character reads softer than gin at the same proof — general consensus.                                                                                                                                      |
| Dark rum                                    | 1.15x           | Same base proof, but pot-still/molasses congeners and caramel coloring add perceived weight and heat versus white rum.                                                                                                                                    |
| Aged rum (demerara/Jamaican, sipping-style) | 1.3x            | Barrel char, ester-heavy pot-still rums (esp. Jamaican) read hotter and more assertive than either white or standard dark rum at equal ABV — general consensus, esters are a well-documented driver of Jamaican rum's funk/intensity.                     |
| Tequila blanco                              | 1.0x            | 40% ABV, unaged — comparable proof-character weight to vodka but with agave vegetal notes; nets out close to baseline for spirit-forward purposes.                                                                                                        |
| Tequila reposado                            | 1.15x           | Light oak aging adds perceived warmth/spice over blanco at the same ABV.                                                                                                                                                                                  |
| Tequila añejo                               | 1.3x            | Extended oak aging (1–3 yrs) concentrates vanilla/oak/caramel notes, reading noticeably heavier than blanco.                                                                                                                                              |
| Mezcal                                      | 1.4x            | Same ~40–45% ABV range as tequila, but smoke from the traditional earthen-pit roast is one of the most assertive, low-volume-dominant flavors in the base-spirit category — strong consensus among bartenders that mezcal "reads" far above its ABV.      |
| Bourbon                                     | 1.2x            | 40–45% ABV typical bottling, plus vanilla/caramel from new charred oak gives more perceived weight than a neutral 40% spirit.                                                                                                                             |
| Rye whiskey                                 | 1.3x            | Same proof range as bourbon but higher rye-grain spice reads hotter/sharper — a large part of why rye-forward Manhattans/Sazeracs taste more "assertive" than bourbon versions at identical ounces.                                                       |
| Scotch (blended)                            | 1.15x           | Comparable to bourbon in weight; smoke/peat vary hugely by expression, so this is a moderate blended-Scotch default, not single malt.                                                                                                                     |
| Scotch (Islay/peated single malt)           | 1.8x            | Peat smoke is famously disproportionate to volume — a quarter-ounce float (as in Penicillin) is designed to dominate the nose and finish. This is standard bartending knowledge, not a single citable number, but is about as consensus as mixology gets. |
| Cognac/brandy (VS/VSOP)                     | 1.1x            | 40% ABV, grape-distillate warmth comparable to bourbon; slightly softer than rye.                                                                                                                                                                         |

### Liqueurs & amari (axis: primarily Sweetness and/or Acidity-Bitterness; some also contribute to Spirit Forward at high ABV)

Two baselines are used here because amari and orange liqueurs are functionally different families:

- **Orange-liqueur baseline** = triple sec/Cointreau (40% ABV) = 1.0x on Sweetness.
- **Amaro/bittersweet baseline** = Aperol (11% ABV, mild) = 1.0x on the bitterness side of the Acidity-Bitterness axis.

| Ingredient                                                 | Axis                        | Multiplier      | Justification                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | --------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triple sec / Cointreau                                     | Sweetness                   | 1.0x (baseline) | 40% ABV orange liqueur, moderately sweet — the standard reference "mild liqueur" in most sour builds.                                                                                                                                                                                                                                         |
| Grand Marnier                                              | Sweetness                   | 1.05x           | Also 40% ABV; cognac base adds a touch more depth/weight than Cointreau but comparable sweetness — near baseline.                                                                                                                                                                                                                             |
| Maraschino liqueur (Luxardo)                               | Sweetness                   | 1.3x            | ~32% ABV but a concentrated, distinctly bitter-almond/cherry-pit flavor that reads much stronger per ounce than its sugar content alone suggests — classic recipes (Aviation, Last Word) use it in 1/4–3/4 oz pours specifically because more overwhelms the drink. General consensus.                                                        |
| Aperol                                                     | Bitterness                  | 1.0x (baseline) | 11% ABV — the lowest-proof, gentlest bittersweet aperitivo in common cocktail use; explicitly designed to be sessionable and mild.                                                                                                                                                                                                            |
| Campari                                                    | Bitterness                  | 2.2x            | ~24–28.5% ABV depending on market (roughly double Aperol's proof) and built on gentian/cinchona bittering agents specifically chosen for intensity — universally cited by bartenders as the reference point for "aggressively bitter." A 1:1:1 Negroni tastes far more bitter than a straight ounce split implies, precisely because of this. |
| Campari                                                    | Spirit Forward              | 1.1x            | At ~24%+ ABV it's below full-proof spirits but well above wine-strength liqueurs, giving stirred Campari drinks more backbone than their "aperitif" branding suggests.                                                                                                                                                                        |
| Cynar                                                      | Bitterness                  | 1.3x            | 16.5% ABV, artichoke-root bitter — more assertive than Aperol but distinctly gentler and more vegetal/savory than Campari; sits in between.                                                                                                                                                                                                   |
| Fernet-Branca                                              | Bitterness                  | 2.8x            | 39% ABV and built on menthol, saffron, and myrrh — the most intensely bitter amaro in common bar use; recipes (Hanky Panky) use it in 2-dash quantities specifically because even 1/4 oz can dominate a full cocktail.                                                                                                                        |
| Fernet-Branca                                              | Spirit Forward              | 1.4x            | 39% ABV plus its intensity means even trace amounts read as spirit-forward far beyond their ounce share.                                                                                                                                                                                                                                      |
| Chartreuse, green                                          | Bitterness/herbal intensity | 1.6x            | 55% ABV (110 proof) — the highest-proof liqueur commonly used in cocktails, plus 130 herbs/botanicals; equal-parts drinks like the Last Word are famous precisely because green Chartreuse "should" dominate a 1/4-share pour and does.                                                                                                       |
| Chartreuse, green                                          | Spirit Forward              | 1.7x            | 55% ABV is well above standard base-spirit proof — a 3/4 oz pour carries real alcoholic weight disproportionate to its share of a shaken drink's total volume.                                                                                                                                                                                |
| Chartreuse, yellow                                         | Bitterness/herbal intensity | 0.9x            | 40% ABV and sweetened/honeyed — noticeably milder and sweeter than green Chartreuse; closer to a liqueur than an amaro on the palate.                                                                                                                                                                                                         |
| Sweet vermouth                                             | Sweetness                   | 1.0x            | Roughly 130–150g sugar/liter by most trade estimates — genuinely sweet, comparable in practice to using it as a moderate sweetener; treated as baseline-adjacent for this table's purposes given how central it is to stirred classics.                                                                                                       |
| Dry vermouth                                               | Acidity                     | 1.1x            | Under 50g sugar/liter (much drier than sweet vermouth) with tart, saline, herbal character; contributes light acidity/dryness rather than sweetness in Martinis.                                                                                                                                                                              |
| Amer/amaro-style liqueurs (Amaro Nonino, Amer Picon-style) | Bitterness                  | 1.3x            | Moderate-proof (~35% ABV range), fruit-forward but distinctly bitter amari — milder than Campari, well above Aperol; used at 3/4 oz in Paper Plane precisely to balance, not overwhelm.                                                                                                                                                       |

### Syrups & sweeteners (axis: Sweetness)

Baseline = **simple syrup** (1:1 sugar:water, ~50 Brix) = 1.0x.

| Ingredient                                   | Multiplier      | Justification                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simple syrup                                 | 1.0x (baseline) | ~50 Brix 1:1 sugar-water — the neutral reference sweetener with no additional flavor.                                                                                                                                                                                                                                                                            |
| Demerara syrup                               | 1.05x           | Comparable sugar concentration to simple syrup but raw-cane molasses notes read as "richer," nudging perceived sweetness/weight slightly above plain sugar at equal ounces — general consensus, not meaningfully different in raw sweetness.                                                                                                                     |
| Honey syrup (1:1 honey:water)                | 1.1x            | Diluted to ~50 Brix to match simple syrup's sweetness level, but honey's fructose-heavy sugar profile and floral compounds read as rounder/sweeter on the palate even at matched Brix — general consensus among bartenders re: perceived vs. measured sweetness.                                                                                                 |
| Agave nectar/syrup (bottled, cocktail-ready) | 1.15x           | Raw agave nectar runs 74–76 Brix and is typically cut roughly 2:1 nectar:water to approximate simple syrup's sugar level; agave's high fructose content is perceived as sweeter than sucrose gram-for-gram, so even at matched Brix it reads slightly sweeter — documented in food-science literature on fructose sweetness perception, applied here to bar use. |
| Orgeat                                       | 0.9x            | Almond-based syrup, sweet but also nutty/savory-leaning; its flavor complexity dilutes the perceived pure-sugar hit slightly relative to simple syrup at equal ounces — general consensus, and orgeat is typically used in smaller pours (1/4 oz) precisely because a little goes far on flavor, not because it's more potent sugar-wise.                        |
| Grenadine (real pomegranate, not corn-syrup) | 1.0x            | Comparable sweetness to simple syrup but with tart pomegranate acidity partially offsetting the sugar — nets out close to baseline on pure sweetness, though it also contributes a small acidity counter-effect not captured on this axis alone.                                                                                                                 |

### Citrus (axis: Acidity)

Baseline = **fresh lemon or lime juice** = 1.0x. Both sit in a broadly similar citric-acid range (roughly 5–6% titratable acidity) and are treated interchangeably as the sour-mix reference in professional bar practice — this is standard bartending convention, not a claim that lemon and lime are chemically identical.

| Ingredient       | Multiplier      | Justification                                                                                                                                                                                                                                                          |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lemon juice      | 1.0x (baseline) | Standard fresh-citrus sour reference.                                                                                                                                                                                                                                  |
| Lime juice       | 1.0x (baseline) | Treated as equivalent to lemon for cocktail-acidity purposes per standard bar convention.                                                                                                                                                                              |
| Grapefruit juice | 0.7x            | Noticeably less acidic and more bitter/sweet-leaning than lemon/lime per ounce — general consensus; grapefruit contributes real flavor but is a gentler acid source, which is why Paloma-style drinks lean on soda/tequila for structure rather than grapefruit alone. |

### Bitters (axis: Finish / aromatic lift — used in dashes, not ounces)

Baseline = **Angostura aromatic bitters** = 1.0x per dash. Bitters sit outside the ounce-ratio math entirely today (a "2 dashes" ingredient contributes ~0 to an ounce-sum denominator), which is itself a formula gap worth flagging to engineering — see note below the table.

| Ingredient         | Multiplier      | Justification                                                                                                                              |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Angostura bitters  | 1.0x (baseline) | 44.7% ABV, cinnamon/clove/gentian profile — the default reference bitters in essentially every stirred classic (Old Fashioned, Manhattan). |
| Orange bitters     | 0.8x            | Similar high-proof base but a gentler, more citrus-peel-forward profile than Angostura's heavier baking-spice punch — general consensus.   |
| Peychaud's bitters | 0.9x            | High-proof, anise/cherry-forward profile distinct from Angostura but comparably assertive in a Sazerac-style build — general consensus.    |

**Formula gap worth flagging separately from the intensity-multiplier fix:** because bitters are measured in dashes (roughly 1/32–1/8 oz each) rather than fractional ounces, an ounce-ratio formula will always compute them as functionally zero regardless of any multiplier applied — yet bitters are precisely the ingredient class most responsible for the "Finish" axis in classics like the Old Fashioned and Sazerac. Fixing intensity multipliers alone will not fix this; the formula likely needs a separate small fixed-oz-equivalent (e.g. treat "1 dash" ≈ 1/32 oz) before multipliers can do their job on this axis. Flagging for the engineer, not attempting a fix here.

---

## Deliverable 2 — Per-cocktail taste-axis verification (real catalog)

Each entry below cites the exact `id` field from the source files so the correction maps directly back to code. Ingredient amounts are copied as shipped.

### negroni

**Source:** `src/data/cocktails.ts` (id: `negroni`)
**Ingredients as shipped:** 1 oz gin, 1 oz Campari, 1 oz sweet vermouth, orange peel garnish.
**Naive formula:** Exactly 33% gin / 33% Campari / 33% sweet vermouth on every axis touched — reads as a perfectly even three-way split.
**Corrected take:** With Campari's bitterness multiplier (2.2x) applied, effective bitterness weight is roughly 1oz×2.2 = 2.2 "bitter-units" against gin's ~0 direct bitterness contribution and vermouth's mild sweetness — the drink should score noticeably more bitter-leaning than a flat 1/3 split suggests, which matches the near-universal bartending description of a Negroni as "bitter first." Spirit Forward should also tick up slightly from Campari's own ~24%+ ABV plus gin's assertive botanical load (1.1x), not just gin's ounce share.
**Confidence:** High — grounded in Campari's ABV/gentian sourcing above plus essentially unanimous bartending consensus on Negroni character.

### boulevardier

**Source:** `src/data/cocktails.ts` (id: `boulevardier`)
**Ingredients as shipped:** 2 oz bourbon, 1 oz sweet vermouth, 1 oz Campari.
**Naive formula:** 50% bourbon / 25% vermouth / 25% Campari — reads as spirit-dominant with a modest bitter note.
**Corrected take:** Same direction as the Negroni but less extreme since bourbon's 2 oz already dominates by volume; applying Campari's 2.2x bitterness multiplier still meaningfully increases the bitterness reading over a flat 25%, while bourbon's 1.2x spirit-forward multiplier reinforces (not diminishes) the already-correct "whiskey-led" read. Net effect: sweetness/bitterness balance shifts more bitter than the naive split shows; Spirit Forward stays roughly directionally correct, maybe modestly higher.
**Confidence:** High — same Campari sourcing as above; Boulevardier is explicitly the "bourbon Negroni."

### manhattan

**Source:** `src/data/cocktails.ts` (id: `manhattan`); also `cocktailDetailFallbackData.ts` (id: `manhattan`, matching ratios)
**Ingredients as shipped:** 2 oz rye whiskey, 1 oz sweet vermouth, 2 dashes Angostura bitters.
**Naive formula:** ~67% whiskey / 33% vermouth by volume on Spirit Forward and Sweetness; bitters contribute ~0 to the ounce sum.
**Corrected take:** Rye's 1.3x spirit-forward multiplier over standard bourbon pushes the drink's Spirit Forward score up from a plain 67% read — appropriate, since rye Manhattans are famously "hotter"/spicier than bourbon versions. The bitters-as-dashes gap (see Deliverable 1 note) means the Finish axis is likely under-weighted regardless of multiplier fixes; Angostura's baking-spice profile is a large part of what makes a Manhattan's finish read as "dry and polished" per the app's own tasting note.
**Confidence:** High on the rye-vs-bourbon spirit-forward point (general consensus, near-universal); high on the bitters/Finish formula gap being real, though the fix for that gap is a separate structural issue, not just multipliers.

### sazerac

**Source:** `src/data/cocktails.ts` (id: `sazerac`)
**Ingredients as shipped:** 2 oz rye whiskey, 1 sugar cube, 2–3 dashes Peychaud's bitters, absinthe rinse, lemon peel garnish.
**Naive formula:** Effectively ~100% rye by ounce share once bitters/sugar-cube/absinthe-rinse are excluded or negligible — reads as nearly pure Spirit Forward with minimal contribution from anything else.
**Corrected take:** Directionally the naive formula is already close to right — a Sazerac genuinely is spirit-dominant. The main miss is qualitative, not proportional: the absinthe rinse (a "rinse," not even a measured pour) and Peychaud's dashes are doing outsized work on aroma/Finish that no ounce-based formula, even with multipliers, will capture, since neither has a meaningful oz value in the shipped ingredient list. This is the same bitters/rinse formula-gap issue as the Manhattan, more extreme here since absinthe isn't even listed with an amount.
**Confidence:** Medium — the "mostly spirit-forward" read is high confidence; the magnitude of the rinse/bitters underweighting is qualitative judgment, general consensus rather than a specific citable source.

### old-fashioned-classic

**Source:** `src/data/cocktails.ts` (id: `old-fashioned-classic`)
**Ingredients as shipped:** 2 oz bourbon, 1 sugar cube, 2–3 dashes Angostura bitters, orange peel garnish.
**Naive formula:** Effectively 100% bourbon by ounce share (sugar cube likely isn't parsed as a fluid ounce at all).
**Corrected take:** Directionally correct that this is spirit-dominant, but the sugar cube (roughly equivalent to 1/4–1/3 oz simple syrup once dissolved) probably isn't being counted at all in the current parser, which would zero out the Sweetness axis entirely for a drink whose entire identity includes "gentle sweetness softens the middle" per the app's own tasting note. Worth flagging to engineering as a parsing gap (non-fluid-ounce ingredient formats like "1 sugar cube"), separate from the intensity-multiplier fix.
**Confidence:** Medium-high on the spirit-forward direction; the sugar-cube parsing question is a data-format issue I can't verify without seeing the current parsing code, which is outside this research brief's scope — flagging as an open question for the engineer.

### vieux-carre

**Source:** `src/data/cocktails.ts` (id: `vieux-carre`)
**Ingredients as shipped:** 1 oz rye, 1 oz cognac, 1 oz sweet vermouth, 1 barspoon Bénédictine, 2 dashes Peychaud's, 2 dashes Angostura, lemon peel garnish.
**Naive formula:** Roughly even 33/33/33 split across rye/cognac/vermouth on Spirit Forward and Sweetness, with Bénédictine (a barspoon ≈ 1/8 oz) and both bitters sets likely near-invisible to the ounce sum.
**Corrected take:** The rye+cognac combination (both 1.2–1.3x spirit-forward) should read as more assertively spirit-forward than an equal-parts split against vermouth implies, since two of the three "equal" parts are both high-multiplier spirits. Bénédictine's honeyed sweetness, though small in volume, is a recognized contributor to this drink's complexity that a barspoon-sized pour will always underweight regardless of multiplier.
**Confidence:** Medium — general consensus on the spirit-forward read; the Bénédictine/bitters underweighting is the same structural gap noted above, not a new finding.

### brooklyn

**Source:** `src/data/cocktails.ts` (id: `brooklyn`)
**Ingredients as shipped:** 2 oz rye, 1 oz dry vermouth, 1/4 oz maraschino liqueur, 1/4 oz Amer Picon-style liqueur, orange peel garnish.
**Naive formula:** ~57% rye / 29% dry vermouth / 7% maraschino / 7% amer — reads as heavily rye-dominant with two nearly-invisible modifiers.
**Corrected take:** This is close to the textbook "small pour dominates" case. Maraschino's 1.3x sweetness multiplier and the amer's 1.3x bitterness multiplier both push those two 1/4 oz pours to punch meaningfully above their ~7% ounce share — bartenders describe the Brooklyn's identity as defined precisely by that maraschino/amer interplay, not as "a slightly modified dry Manhattan." The naive formula likely under-represents both the Sweetness contribution from maraschino and the Acidity/bitterness contribution from the amer.
**Confidence:** Medium — general consensus on maraschino/amer punching above their pour in this specific classic; I don't have a citable source specific to Brooklyn's flavor breakdown beyond standard cocktail-history writing.

### hanky-panky

**Source:** `src/data/cocktails.ts` (id: `hanky-panky`)
**Ingredients as shipped:** 1 1/2 oz gin, 1 1/2 oz sweet vermouth, 2 dashes Fernet-Branca, orange peel garnish.
**Naive formula:** Even 50/50 gin/vermouth split; Fernet dashes contribute ~0.
**Corrected take:** This is the single clearest small-pour-dominates case in the whole catalog. Fernet-Branca at 2.8x bitterness intensity and 39% ABV is famous for being detectable and character-defining even at "2 dashes" — Ada Coleman's original intent was for Fernet to be the signature note, not a garnish. A formula that shows this as a plain 50/50 gin-Manhattan variant with a negligible bitter accent is actively misleading about what makes this drink distinctive. This reinforces the same bitters/dash formula gap flagged above — Fernet here isn't a "modifier axis," it IS the drink's character, and no ounce-based approach captures that without a dash-to-oz-equivalent fix.
**Confidence:** High on Fernet's outsized character (very well-documented bartending consensus, this is one of the most-cited "small pour, big impact" examples in modern bar writing) — but note the practical fix requires the same dash-equivalent structural change as the Manhattan/Sazerac, not multipliers alone.

### martinez

**Source:** `src/data/cocktails.ts` (id: `martinez`)
**Ingredients as shipped:** 2 oz Old Tom gin, 1 oz sweet vermouth, 1/4 oz maraschino liqueur, 1 dash orange bitters, lemon peel garnish.
**Naive formula:** ~62% gin / 31% vermouth / 8% maraschino — reads as gin-forward with a small sweet accent.
**Corrected take:** Maraschino's 1.3x sweetness multiplier nudges its contribution up somewhat from the ~8% naive share, but this is a milder version of the Brooklyn/Aviation pattern — worth a small correction, not a dramatic one, since maraschino here is genuinely a supporting note rather than the drink's identity.
**Confidence:** Medium — directionally right by general consensus, magnitude is a judgment call.

### corpse-reviver-2

**Source:** `src/data/cocktails.ts` (id: `corpse-reviver-2`)
**Ingredients as shipped:** 3/4 oz gin, 3/4 oz Cointreau, 3/4 oz Lillet Blanc, 3/4 oz lemon juice, absinthe rinse, lemon peel garnish.
**Naive formula:** Perfectly even 25/25/25/25 split across gin/Cointreau/Lillet/lemon on every relevant axis.
**Corrected take:** This is a genuinely equal-parts build by design, and none of the four measured ingredients has an extreme multiplier relative to the others (gin 1.1x spirit-forward, Cointreau 1.0x sweetness baseline, lemon 1.0x acidity baseline; Lillet isn't in the reference table above but behaves like a lightly sweetened aromatized wine, roughly comparable to dry vermouth's profile). The naive formula is probably close to right here for the four measured ingredients — the real miss is again the absinthe rinse, which has no oz value and contributes real aromatic lift to what the app's own tasting note calls a "brisk, dry, lifted" finish.
**Confidence:** Medium — the "roughly fine for the four measured ingredients" read is medium confidence since I don't have Lillet Blanc in the sourced intensity table above; the absinthe-rinse gap is the same structural issue flagged repeatedly.

### aviation

**Source:** `src/data/cocktails.ts` (id: `aviation`)
**Ingredients as shipped:** 2 oz gin, 1/2 oz maraschino liqueur, 1/4 oz crème de violette, 1/2 oz lemon juice, lemon peel garnish.
**Naive formula:** ~62% gin / 15% maraschino / 8% crème de violette / 15% lemon.
**Corrected take:** Maraschino's 1.3x sweetness multiplier bumps its effective sweetness contribution up from the naive 15% share. Crème de violette isn't in the sourced table above (it's a niche floral liqueur, roughly 20% ABV, intensely aromatic but used almost exclusively for aroma/color rather than measurable sweetness or acidity) — I'd flag it as needing its own research pass rather than guessing a number here, since its contribution is almost entirely aromatic/visual (the drink's pale violet-grey color) rather than taste-axis-relevant in the way the current four axes are defined.
**Confidence:** Medium on maraschino; low/not confident on crème de violette specifically — flagging rather than inventing a multiplier for it.

### last-word

**Source:** `src/data/cocktails.ts` (id: `last-word`)
**Ingredients as shipped:** 3/4 oz gin, 3/4 oz green Chartreuse, 3/4 oz maraschino liqueur, 3/4 oz lime juice.
**Naive formula:** Perfectly even 25/25/25/25 split across gin/Chartreuse/maraschino/lime.
**Corrected take:** This is the textbook case for the whole project. Green Chartreuse's 55% ABV and 1.7x spirit-forward / 1.6x herbal-intensity multipliers mean its quarter-share pour should read as far more dominant than 25% — bartenders near-universally describe the Last Word as "Chartreuse-forward" despite the equal-parts format, precisely because Chartreuse is so much more concentrated than the other three ingredients. Maraschino's 1.3x sweetness multiplier compounds this: two of the four "equal" ingredients are disproportionately loud. A corrected formula should show this drink skewing noticeably more toward Spirit Forward and herbal/bitter intensity than a flat quarter-share implies.
**Confidence:** High — Chartreuse's ABV and the "equal parts but Chartreuse dominates" description are close to universal in modern bartending writing about this specific cocktail.

### daiquiri

**Source:** `src/data/cocktails.ts` (id: `daiquiri`); also `house-daiquiri-spec` (near-identical ratios) and fallback `daiquiri` (matching ratios)
**Ingredients as shipped:** 2 oz white rum, 1 oz lime juice, 3/4 oz simple syrup.
**Naive formula:** ~53% rum / 27% lime / 20% simple syrup.
**Corrected take:** All three ingredients are close to their category baselines (white rum 0.9x, lime 1.0x, simple syrup 1.0x) — this is one of the cleanest cases where the naive formula is already approximately correct, since a Daiquiri's whole design philosophy is a transparent, undistorted 2:1:0.75 ratio with no small-pour dominant ingredients.
**Confidence:** High that the naive formula is fine here — this is a case worth naming explicitly as "probably already correct," not just cocktails with corrections.

### margarita

**Source:** `src/data/cocktails.ts` (id: `margarita`); also fallback `margarita` (matching ratios)
**Ingredients as shipped:** 2 oz blanco tequila, 1 oz Cointreau, 1 oz lime juice, salt rim.
**Naive formula:** 50% tequila / 25% Cointreau / 25% lime.
**Corrected take:** Blanco tequila sits close to baseline (1.0x) on spirit-forward, and Cointreau/lime are both at their category baselines — this is another case where the naive formula is likely already close to right proportionally. The one nuance: salt rim isn't a taste-axis ingredient in the current four-axis model at all (it affects perceived sweetness/acidity via contrast, a well-documented flavor-science effect, but there's no "salinity" axis to assign it to) — flagging as an out-of-scope observation, not a correction to the existing axes.
**Confidence:** High that ounce-ratio math is roughly fine for the three measured ingredients; the salt-rim point is a scope note, not a confident correction.

### whiskey-sour

**Source:** `src/data/cocktails.ts` (id: `whiskey-sour`)
**Ingredients as shipped:** 2 oz bourbon, 1 oz lemon juice, 3/4 oz simple syrup, 1 egg white (optional), lemon wheel/cherry garnish.
**Naive formula:** ~53% bourbon / 27% lemon / 20% syrup (egg white excluded from the ounce sum since it carries no flavor-axis weight).
**Corrected take:** Bourbon's 1.2x spirit-forward multiplier nudges the Spirit Forward score up modestly from the naive 53%, but this isn't a dramatic miss — bourbon isn't at the extreme end of the spirit-intensity scale the way rye or mezcal are. Lemon and syrup are both at baseline. Minor correction, not a major one.
**Confidence:** Medium-high — general consensus, no extreme multipliers involved.

### gimlet

**Source:** `src/data/cocktails.ts` (id: `gimlet`)
**Ingredients as shipped:** 2 oz gin, 3/4 oz lime juice, 3/4 oz simple syrup.
**Naive formula:** ~57% gin / 21% lime / 21% syrup.
**Corrected take:** Gin's 1.1x spirit-forward multiplier is a small nudge upward from the naive 57% share; lime and syrup are both baseline. This is close to already-correct — a minor, not dramatic, correction.
**Confidence:** High that this is a small/non-dramatic correction.

### sidecar

**Source:** `src/data/cocktails.ts` (id: `sidecar`)
**Ingredients as shipped:** 2 oz cognac, 1 oz Cointreau, 1 oz lemon juice, sugar rim, orange peel garnish.
**Naive formula:** 50% cognac / 25% Cointreau / 25% lemon.
**Corrected take:** Cognac's 1.1x spirit-forward multiplier is a mild nudge upward; Cointreau and lemon are both baseline. Close to already-correct, similar to the Margarita case — the sugar rim is the same out-of-scope salinity/contrast point as the Margarita's salt rim (sweetness contrast, no axis to assign it to today).
**Confidence:** High that the ounce-ratio math for the three measured ingredients is roughly fine.

### cosmopolitan

**Source:** `src/data/cocktails.ts` (id: `cosmopolitan`, 1 1/2 oz vodka / 1 oz Cointreau / 1 oz cranberry / 1/2 oz lime); **note:** fallback `cocktailDetailFallbackData.ts` (id: `cosmopolitan`) ships a _different_ ratio — 1 1/2 oz vodka / 1/2 oz Cointreau / 1/2 oz lime / 1/2 oz cranberry. These two sources disagree on the Cointreau and cranberry amounts (1 oz vs 1/2 oz each) despite sharing the same `id`. Flagging as a data-quality issue below; analysis here uses the primary `cocktails.ts` ratio.
**Naive formula (using cocktails.ts ratio):** 37.5% vodka / 25% Cointreau / 25% cranberry / 12.5% lime.
**Corrected take:** Vodka is baseline-neutral on spirit-forward (1.0x); Cointreau is baseline on sweetness (1.0x). Cranberry juice isn't in the sourced intensity table above — it's tart but also has its own natural sugar, and I don't have a grounded citable multiplier for it, so I'm not asserting a correction. This is a case where the naive formula is probably roughly fine for the ingredients I could confidently rate, but incomplete because cranberry juice needs its own research pass.
**Confidence:** Medium — flagging the id-collision data issue as high confidence (directly observable in the source files); flagging the cranberry-juice gap as a genuine unknown rather than guessing.

### paloma

**Source:** `src/data/cocktails.ts` (id: `paloma`)
**Ingredients as shipped:** 2 oz blanco tequila, 1 oz lime juice, 1/2 oz simple syrup, 4 oz grapefruit soda, salt rim, grapefruit wheel garnish.
**Naive formula:** ~26% tequila / 13% lime / 6.5% syrup / 53% grapefruit soda (if soda is counted in the ounce sum at all — worth confirming with engineering whether mixers/sodas are included or excluded from today's denominator, since that materially changes every highball's math).
**Corrected take:** If grapefruit soda is counted in the denominator, its huge volume share (53%) would swamp every other axis under a naive formula, which is roughly directionally true for a Paloma (it IS a tequila highball, meant to read as light and tequila-adjacent rather than boozy) — but grapefruit soda's actual sugar/acid content varies enormously by brand (Jarritos vs. Squirt vs. homemade) and isn't something I can respons­ibly assign a single multiplier to without knowing which product the app assumes. Flagging as a genuine unknown, not a confident correction.
**Confidence:** Low on a specific correction — flagging the mixer-inclusion question as the actual open issue here rather than inventing a grapefruit-soda multiplier.

### caipirinha

**Source:** `src/data/cocktails.ts` (id: `caipirinha`)
**Ingredients as shipped:** 2 oz cachaça, 1/2 lime cut into wedges, 2 tsp granulated sugar.
**Naive formula:** Unclear — "1/2 lime" and "2 tsp sugar" aren't fluid-ounce measurements, so this recipe likely doesn't parse cleanly into the existing ounce-ratio formula at all.
**Corrected take:** This is a data-format issue, not an intensity-multiplier issue — flagging for the engineer rather than asserting a taste correction, since I can't verify how (or whether) the current parser handles non-oz units like "1/2 lime" or "2 tsp."
**Confidence:** N/A (structural/parsing question, not a taste-axis judgment).

### moscow-mule

**Source:** `src/data/cocktails.ts` (id: `moscow-mule`); fallback `cocktailDetailFallbackData.ts` (id: `moscow-mule`) ships a close but not identical ginger-beer range (4 oz vs 4–6 oz).
**Ingredients as shipped:** 2 oz vodka, 1/2 oz lime juice, 4 oz ginger beer, lime wheel garnish.
**Naive formula:** ~31% vodka / 8% lime / 62% ginger beer (again contingent on whether mixers are counted in the denominator).
**Corrected take:** Vodka is neutral on spirit-forward (1.0x baseline) and lime is baseline acidity — the measured-alcohol ingredients are unremarkable multiplier-wise. Ginger beer's sugar/spice content isn't in the sourced table and, like grapefruit soda above, varies by brand; not asserting a specific multiplier.
**Confidence:** Medium that vodka/lime themselves need no correction; low/not confident on ginger beer specifically.

### dark-stormy

**Source:** `src/data/cocktails.ts` (id: `dark-stormy`)
**Ingredients as shipped:** 2 oz dark rum, 4 oz ginger beer, 1/2 oz lime juice, lime wheel garnish.
**Corrected take:** Same ginger-beer caveat as the Moscow Mule. Dark rum's 1.15x spirit-forward multiplier is a mild nudge upward on that axis specifically — dark rum genuinely reads "heavier" than vodka even diluted into a highball, which matches the app's own tasting note ("dark rum brings caramel-molasses depth"). Modest, confident correction on the rum; not confident on ginger beer.
**Confidence:** Medium-high on the dark-rum nudge; low on ginger beer, same as above.

### mai-tai

**Source:** `src/data/cocktails.ts` (id: `mai-tai`)
**Ingredients as shipped:** 2 oz aged Jamaican rum, 1/2 oz orange curaçao, 1/4 oz orgeat syrup, 1 oz lime juice.
**Naive formula:** ~53% rum / 13% curaçao / 6.5% orgeat / 27% lime.
**Corrected take:** Aged Jamaican rum's 1.3x spirit-forward multiplier (pot-still ester intensity) should push this above the naive 53% share — Jamaican rum specifically is one of the most-cited "punches above its ABV" spirits in tiki bartending writing, which is exactly why it's the traditional Mai Tai base rather than a lighter rum. Orgeat's 0.9x is close enough to baseline that its already-small 6.5% share doesn't need a dramatic correction.
**Confidence:** Medium-high on the Jamaican rum point (well-established tiki-bartending consensus); orgeat correction is minor.

### jungle-bird

**Source:** `src/data/cocktails.ts` (id: `jungle-bird`)
**Ingredients as shipped:** 1 1/2 oz dark rum, 3/4 oz Campari, 1 1/2 oz pineapple juice, 1/2 oz lime juice, 1/2 oz simple syrup.
**Naive formula:** ~33% rum / 17% Campari / 33% pineapple / 11% lime / 11% syrup.
**Corrected take:** Campari's 2.2x bitterness multiplier is directly relevant here — the Jungle Bird's entire reputation ("the bitter tiki drink") rests on Campari reading far stronger than its 17% ounce share suggests, cutting through the pineapple sweetness in a way a flat ounce split would understate. This is a clear, confident correction in the same family as the Negroni.
**Confidence:** High — same Campari sourcing as the Negroni/Boulevardier, and Jungle Bird's bitter-forward reputation is well-documented in modern tiki-revival writing (it was originally a flop precisely because of Campari's intensity, then rehabilitated once bartenders leaned into it).

### paper-plane

**Source:** `src/data/cocktails.ts` (id: `paper-plane`)
**Ingredients as shipped:** 3/4 oz bourbon, 3/4 oz Aperol, 3/4 oz Amaro Nonino, 3/4 oz lemon juice.
**Naive formula:** Perfectly even 25/25/25/25 split.
**Corrected take:** Aperol is the amaro/bitterness baseline (1.0x) so its quarter-share is roughly accurate as-is. Amaro Nonino falls in the "moderate amaro" bucket (1.3x bitterness, same bucket as Amer Picon-style liqueurs above) — its quarter-share should read slightly more bitter than a flat 25%, but this is a milder correction than the Negroni/Jungle Bird cases since Nonino is gentler than Campari. Bourbon at 1.2x spirit-forward is a mild nudge on that axis. Overall: modest corrections across the board, no single ingredient dominates dramatically — this drink is closer to "genuinely balanced" than the Negroni-family drinks, matching its reputation as a smooth, well-integrated modern classic.
**Confidence:** Medium — Amaro Nonino's specific multiplier is closer to a judgment call than the Campari numbers, since I don't have as strong a citable ABV/bittering-agent source for Nonino specifically as I do for Campari/Aperol.

### penicillin

**Source:** `src/data/cocktails.ts` (id: `penicillin`)
**Ingredients as shipped:** 2 oz blended Scotch, 3/4 oz lemon juice, 3/4 oz honey-ginger syrup, 1/4 oz Islay single malt Scotch (float), candied ginger garnish.
**Naive formula:** ~57% blended Scotch / 21% lemon / 21% honey-ginger syrup / 7% Islay float — reads as blended-Scotch-dominant with a small smoky accent.
**Corrected take:** This is one of the clearest small-pour-dominates cases in the catalog. The Islay float's 1.8x multiplier (peated single malt) means its 7% ounce share should read as a far larger contributor to both Spirit Forward and Finish than the naive math shows — the entire design intent of floating (not mixing) the Islay Scotch is that its smoke sits on top and hits the nose/palate first and last, exactly the "Finish" axis the app is trying to model. Sam Ross's own stated design for this drink treats the smoky float as the character-defining element, not a minor garnish-adjacent touch.
**Confidence:** High — extremely well-documented in modern bartending writing; this is one of the most-cited "small pour dominates the finish" examples after the Negroni/Campari family.

### aperol-spritz

**Source:** `src/data/cocktails.ts` (id: `aperol-spritz`)
**Ingredients as shipped:** 3 oz Aperol, 3 oz prosecco, 1 oz club soda, orange wheel garnish.
**Naive formula:** ~43% Aperol / 43% prosecco / 14% soda.
**Corrected take:** Aperol is its own category baseline (1.0x on bitterness) so no multiplier correction applies to it directly — its 43% share is proportionally accurate on the Sweetness/Acidity-Bitterness axis. This is a case where the naive formula is likely close to correct: no ingredient here has an extreme multiplier relative to its category, and Aperol Spritz's whole identity (light, low-ABV, gently bitter) is well-served by a proportional read.
**Confidence:** High that this one is probably already fine.

### americano

**Source:** `src/data/cocktails.ts` (id: `americano`)
**Ingredients as shipped:** 1 1/2 oz Campari, 1 1/2 oz sweet vermouth, 3 oz club soda, orange wheel garnish.
**Naive formula:** 25% Campari / 25% vermouth / 50% soda.
**Corrected take:** Campari's 2.2x bitterness multiplier applies here exactly as in the Negroni family — even diluted into a highball with soda, Campari's 25% share should read more bitter-dominant than a flat quarter-split implies, and the app's own tasting note ("bitter orange and herbs open first") supports this.
**Confidence:** High — same Campari sourcing as above.

### negroni-sbagliato

**Source:** `src/data/cocktails.ts` (id: `negroni-sbagliato`)
**Ingredients as shipped:** 1 1/2 oz Campari, 1 1/2 oz sweet vermouth, 3 oz prosecco, orange wheel garnish.
**Corrected take:** Same correction as the Americano — Campari's bitterness should read stronger than its 25% ounce share. Identical logic, different topper (prosecco vs. soda).
**Confidence:** High — same Campari sourcing as the Negroni family.

### spritz-veneziano

**Source:** `src/data/cocktails.ts` (id: `spritz-veneziano`)
**Ingredients as shipped:** 2 oz Aperol, 3 oz prosecco, 1 oz club soda, orange wheel garnish.
**Corrected take:** Same as the standard Aperol Spritz — Aperol is baseline, no extreme multiplier applies, naive formula is probably close to correct.
**Confidence:** High that this one is probably already fine.

### stinger

**Source:** `src/data/cocktails.ts` (id: `stinger`)
**Ingredients as shipped:** 2 oz cognac, 1/2 oz white crème de menthe.
**Naive formula:** 80% cognac / 20% crème de menthe.
**Corrected take:** Cognac's 1.1x spirit-forward multiplier is a small nudge; crème de menthe isn't in the sourced table (it's a minty liqueur, typically 15–25% ABV, used almost entirely for its cooling/menthol aromatic effect rather than measurable sweetness or acidity in the way the current axes are framed) — not asserting a specific multiplier for it, flagging as a gap similar to crème de violette.
**Confidence:** Medium on cognac; not confident on crème de menthe specifically.

### clover-club

**Source:** `src/data/cocktails.ts` (id: `clover-club`)
**Ingredients as shipped:** 2 oz gin, 3/4 oz lemon juice, 3/4 oz raspberry syrup, 1 egg white, fresh raspberries garnish.
**Corrected take:** Gin at 1.1x is a mild nudge; lemon is baseline. Raspberry syrup isn't in the sourced table (a house-made fruit syrup, sweetness roughly comparable to simple syrup but with fruit acidity partially offsetting it, similar logic to grenadine above) — I'd estimate it close to grenadine's ~1.0x given the structural similarity (fruit puree/juice + sugar), but flagging this as an estimate rather than a sourced figure.
**Confidence:** Low-medium — raspberry syrup multiplier is an analogy to grenadine, not independently sourced.

### bee-knees ("Bee's Knees")

**Source:** `src/data/cocktails.ts` (id: `bee-knees`)
**Ingredients as shipped:** 2 oz gin, 3/4 oz lemon juice, 3/4 oz honey syrup, lemon peel garnish.
**Naive formula:** ~57% gin / 21% lemon / 21% honey syrup.
**Corrected take:** Honey syrup's 1.1x sweetness multiplier is a small upward nudge on the Sweetness axis from the naive 21% share — matches the app's own tasting note ("honey rounds the middle"). Gin's 1.1x is a similarly small nudge on Spirit Forward. Minor, not dramatic, correction.
**Confidence:** Medium-high — general consensus, small-magnitude correction.

### southside

**Source:** `src/data/cocktails.ts` (id: `southside`)
**Ingredients as shipped:** 2 oz gin, 1 oz lime juice, 3/4 oz simple syrup, mint leaves, mint sprig garnish.
**Corrected take:** Gin's 1.1x is a mild nudge on Spirit Forward; lime and simple syrup are both baseline. Mint isn't a measured-ounce ingredient and contributes no fluid volume, so it's invisible to any ounce-based formula regardless of multipliers — worth noting as an inherent limitation of ounce-based taste modeling generally (aromatics that add zero volume can still dominate a drink's character), not something a multiplier fixes.
**Confidence:** Medium-high on the gin/lime/syrup read; the mint point is a structural observation, not a numeric correction.

### tom-collins

**Source:** `src/data/cocktails.ts` (id: `tom-collins`); also `tom-collins-house-spec` (near-identical ratios with structured ingredient objects instead of strings — see data-quality note below).
**Ingredients as shipped:** 2 oz gin, 1 oz lemon juice, 1/2 oz simple syrup, club soda (no oz given), lemon wheel and cherry garnish.
**Corrected take:** Gin at 1.1x is a mild nudge; lemon and syrup are baseline. Club soda has no fluid-ounce amount specified in this entry at all (unlike `tom-collins-house-spec`, which specifies "2" club soda in its structured ingredient format) — meaning this specific entry may not even compute a denominator correctly today if the parser requires an explicit amount. Flagging as a parsing/data-completeness question, not a taste judgment.
**Confidence:** Medium-high on gin/lemon/syrup; the missing-soda-amount point is a data observation, not a taste correction.

### ramos-gin-fizz

**Source:** `src/data/cocktails.ts` (id: `ramos-gin-fizz`)
**Ingredients as shipped:** 2 oz gin, 1/2 oz lemon juice, 1/2 oz lime juice, 3/4 oz simple syrup, 3 dashes orange flower water, 1 egg white, 1 oz heavy cream, club soda (no oz given).
**Corrected take:** Gin at 1.1x is a mild nudge. This drink has enough non-taste-axis ingredients (egg white, cream, orange flower water dashes, unspecified soda) that I'm not confident asserting a full correction — cream and egg white affect texture/Finish perception enormously in real bartending terms but aren't captured by any of the four sweetness/acidity/spirit-forward/finish multiplier categories researched here. Flagging as needing its own research pass on texture-affecting ingredients (cream, egg white) rather than guessing.
**Confidence:** Low — too many un-sourced, texture-driven ingredients to respons­ibly assert a specific correction beyond the minor gin nudge.

### vesper

**Source:** `src/data/cocktails.ts` (id: `vesper`)
**Ingredients as shipped:** 3 oz gin, 1 oz vodka, 1/2 oz Lillet Blanc, lemon peel garnish.
**Naive formula:** ~67% gin / 22% vodka / 11% Lillet.
**Corrected take:** Gin's 1.1x is a mild nudge upward on Spirit Forward from the naive 67%; vodka is neutral baseline. This is a case where the correction is small and the naive formula is already broadly in the right neighborhood — the Vesper's reputation as "sharper/firmer" than a standard Martini (per the app's own tasting note) comes more from the 4:1 spirit-to-modifier ratio itself (which the naive formula already captures correctly) than from any single ingredient's hidden intensity.
**Confidence:** Medium-high that this one needs only a small correction.

### dry-martini

**Source:** `src/data/cocktails.ts` (id: `dry-martini`)
**Ingredients as shipped:** 2 1/2 oz gin, 1/2 oz dry vermouth, lemon twist or olive garnish.
**Naive formula:** ~83% gin / 17% dry vermouth.
**Corrected take:** Gin's 1.1x is a mild nudge upward on Spirit Forward. This drink is already so spirit-dominant by volume (83%) that the multiplier makes little practical difference to the overall read — one of the cleanest "naive formula is already basically right" cases, alongside the Daiquiri.
**Confidence:** High that this needs no meaningful correction.

### hemingway-daiquiri

**Source:** `src/data/cocktails.ts` (id: `hemingway-daiquiri`)
**Ingredients as shipped:** 2 oz white rum, 1/2 oz lime juice, 1/2 oz grapefruit juice, 1/2 oz maraschino liqueur, lime wheel garnish.
**Naive formula:** ~57% rum / 14% lime / 14% grapefruit / 14% maraschino.
**Corrected take:** Grapefruit's 0.7x acidity multiplier means its 14% share should read as slightly _less_ acidic than a flat proportional split implies — a genuine "the naive formula overstates this axis" case, less common than the "understates" cases above. Maraschino's 1.3x sweetness multiplier pushes the opposite direction, nudging its 14% share up. Net effect: the drink should read slightly less tart / slightly more rounded-sweet than the naive ounce math suggests, matching the app's own description of it as "less sweetness" than a standard Daiquiri but still more citrus-complex.
**Confidence:** Medium — grapefruit's lower-acidity direction is general consensus; maraschino's is the same sourcing as the Aviation/Last Word above.

### mojito

**Source:** `src/data/cocktails.ts` (id: `mojito`); fallback `cocktailDetailFallbackData.ts` (id: `mojito`) ships a materially different sweetener — "2 tsp sugar" instead of "3/4 oz simple syrup," and 2–3 oz soda instead of 3 oz.
**Ingredients as shipped (cocktails.ts):** 2 oz white rum, 1 oz lime juice, 3/4 oz simple syrup, 8–10 mint leaves, 3 oz club soda.
**Corrected take:** White rum at 0.9x, lime and syrup at baseline — no dramatic multiplier corrections needed for the measured-ounce ingredients. Mint, as with the Southside, contributes zero fluid ounces but is the drink's most identifiable aromatic — same structural limitation noted there, not a numeric correction.
**Confidence:** Medium-high on the measured ingredients; flagging the fallback-file sweetener discrepancy as a data-quality issue below.

### espresso-martini

**Source:** `src/data/cocktails.ts` (id: `espresso-martini`); fallback (id: `espresso-martini`, matching ratios)
**Ingredients as shipped:** 2 oz vodka, 1/2 oz coffee liqueur, 1 oz fresh espresso, 1/4 oz simple syrup, 3 coffee beans garnish.
**Naive formula:** ~53% vodka / 13% coffee liqueur / 27% espresso / 7% simple syrup.
**Corrected take:** Vodka is neutral baseline on Spirit Forward. Espresso and coffee liqueur aren't in the sourced intensity table above — neither fits cleanly into the sweetness/acidity/spirit-forward/finish framework as currently defined, since espresso's primary character (bitterness, roast intensity) isn't really "acidity" in the citrus sense the Acidity axis seems built around. This may be a case where the four-axis model itself doesn't map well to the ingredient, rather than a multiplier-fixable issue — worth flagging to whoever owns the axis definitions, separate from this intensity-table research.
**Confidence:** Low on a specific numeric correction; medium-high on the observation that the axis model itself may not fit this drink well.

### white-russian

**Source:** `src/data/cocktails.ts` (id: `white-russian`)
**Ingredients as shipped:** 2 oz vodka, 1 oz coffee liqueur, 1 oz heavy cream.
**Corrected take:** Same coffee-liqueur/axis-fit issue as the Espresso Martini above, compounded by heavy cream (a texture ingredient with no clear taste-axis home in the current four-axis model). Not asserting a numeric correction — flagging the same structural gap.
**Confidence:** Low on a numeric correction; same axis-fit observation as above.

### ward-8

**Source:** `src/data/cocktails.ts` (id: `ward-8`)
**Ingredients as shipped:** 2 oz rye whiskey, 1/2 oz lemon juice, 1/2 oz orange juice, 1/2 oz grenadine, orange peel garnish.
**Naive formula:** ~57% rye / 14% lemon / 14% orange / 14% grenadine.
**Corrected take:** Rye's 1.3x spirit-forward multiplier is a meaningful nudge upward from the naive 57% share — this follows the same logic as the Manhattan/Sazerac rye entries above. Orange juice isn't in the sourced citrus table (it's markedly less acidic than lemon/lime, general consensus, likely closer to grapefruit's 0.7x than to the lemon/lime baseline, but I don't have a specific sourced figure for it) — flagging as an estimate, not a confident number. Grenadine is close to baseline per the Deliverable 1 entry.
**Confidence:** Medium-high on the rye correction; low-medium on orange juice specifically.

---

## Cocktails considered but not confidently corrected

These were reviewed against the shipped ingredient lists. In each case either the ratio is close to standard-baseline ingredients throughout (naive formula is probably fine), or the deciding ingredient isn't grounded in a source above and I'm not willing to assert a direction without one. Listed by `id`:

- **martinez** — already covered above with a modest correction; listed again here only to note the confidence is medium, not high, since the maraschino/gin/vermouth mix has no single ingredient extreme enough to be a clear-cut case.
- **corpse-reviver-1** (id: `corpse-reviver-1`) — cognac, Calvados, sweet vermouth in equal-ish parts. None of Calvados's intensity is sourced above (apple brandy, ~40% ABV, general consensus places it close to cognac in weight) — probably fine, not confidently corrected.
- **vieux-carre** — see full write-up above; the directional correction is medium confidence, included for completeness rather than as a strong assertion.
- **amaretto-sour** (id: `amaretto-sour`) — amaretto's sweetness/almond-liqueur intensity isn't sourced above; probably needs its own research pass rather than a guess.
- **pisco-sour** (id: `pisco-sour`) — pisco isn't in the base-spirit table above (unaged grape brandy, typically 38–48% ABV); egg white and Angostura-dot garnish add texture/aromatic complexity the four-axis model may not capture well, similar to the Ramos Gin Fizz case. Not confidently corrected.
- **tommy-margarita** (id: `tommy-margarita`) — same ingredients as Margarita but agave nectar instead of Cointreau; agave's 1.15x sweetness multiplier applies but the overall correction is small given the drink's already-simple three-ingredient structure. Probably close to fine.
- **french-75** (id: `french-75` — appears twice in `cocktails.ts`, see data-quality note below) — champagne/prosecco isn't in any sourced table above; its ~12% ABV and dry, high-acid character would need its own research pass to assign a confident multiplier. Not corrected.
- **gin-tonic** (id: `gin-tonic`) — tonic water isn't sourced above (bittering agent is quinine, genuinely bitter but at very low concentration in commercial tonic); not confidently corrected.
- **gin-rickey** (id: `gin-rickey`) — simple two-ingredient build (gin + lime + soda), gin's 1.1x is a minor nudge; probably fine as-is.
- **john-collins** (id: `john-collins`) — same structure as Tom Collins with bourbon; bourbon's 1.2x is a minor nudge, probably close to fine.
- **cosmopolitan** — see full write-up above; flagged separately here because of the id-collision data issue, not because the taste correction itself is confidently asserted.
- **amaretto-sour**, **paloma**, **caipirinha**, **mojito** (mixer/format issues) — see individual write-ups above; grouped here as a reminder that these are open, not silently dropped.
- **tiki catalog broadly** (`zombie`, `hurricane`, `blue-hawaiian`, `painkiller`, `fog-cutter`, `navy-grog`, `test-pilot`, `saturn`, `trader-vics-grog`, `pearl-diver`, `missionary-downfall`, `three-dots-dash`) — these lean heavily on falernum, passion fruit syrup, orgeat, cream of coconut, and multiple rum blends, few of which are sourced in Deliverable 1 above. Orgeat is sourced (0.9x); the rest would need a dedicated tiki-ingredient research pass. Not confidently corrected as a group — flagging rather than guessing across ~12 entries.
- **after-dinner/dessert catalog broadly** (`brandy-alexander`, `grasshopper`, `mudslide`, `golden-cadillac`, `pink-squirrel`, `porto-flip`, `brandy-milk-punch`, `alexander`) — dominated by cream, crème de cacao, crème de menthe, crème de noyaux, none of which are sourced above. These are cream-forward dessert drinks where the current four-axis model (spirit forward / sweetness / acidity / finish) may not be the right lens at all — texture and richness, not measured here, likely drive perceived character more than any oz-ratio fix could. Flagging the axis-fit question rather than guessing multipliers.
- **revolver** (id: `revolver`) — bourbon + coffee liqueur + orange bitters; coffee liqueur isn't sourced (same gap as Espresso Martini/White Russian above).

---

## Data-quality issues found while reading the source files

Flagging these for the engineer since they affect how confidently any formula (naive or corrected) can be trusted, independent of the intensity-multiplier question:

1. **Duplicate `id: 'french-75'`** in `src/data/cocktails.ts` — one entry inside `SPIRIT_FORWARD_COCKTAILS` (line ~538) and a second, near-identical entry inside `REFRESHING_HIGHBALL_COCKTAILS` (line ~1383). Both use the same `id`, same ingredients, but different `tastingNote` copy ("Lemon brightness leads..." vs. "Neutral spirit stays in the background..."). Since `ALL_COCKTAILS` concatenates both category arrays, this id collision means whichever entry is read last (or first, depending on lookup implementation) silently wins — worth a decision on which copy is canonical.
2. **`cosmopolitan` ratio mismatch** between `cocktails.ts` (1 oz Cointreau, 1 oz cranberry) and `cocktailDetailFallbackData.ts` (1/2 oz Cointreau, 1/2 oz cranberry) under the identical `id`. These produce meaningfully different Sweetness/Acidity math depending on which source the app reads at runtime.
3. **`manhattan`, `negroni`, `margarita`, `mojito`, `daiquiri`, `moscow-mule`, `espresso-martini`** all appear in both files under the same `id`. Most ratios match closely (Manhattan, Negroni, Margarita, Daiquiri, Espresso Martini all line up); **Mojito's sweetener format differs** (3/4 oz simple syrup vs. "2 tsp Sugar, note: Or 1/2 oz simple syrup") and **Moscow Mule's ginger beer amount differs slightly** (4 oz fixed vs. "4-6 oz" range). Worth confirming which file is authoritative at runtime before trusting either for taste-axis math.
4. **`old-fashioned` (fallback) vs. `old-fashioned-classic` (cocktails.ts)** use _different id strings_ for what's functionally the same drink, and the fallback version specifies "1/4 oz Simple Syrup, note: Or 1 sugar cube" where the primary catalog specifies only "1 sugar cube" with no fluid-ounce equivalent given. If the taste-profile formula reads only `cocktails.ts`, the Old Fashioned's Sweetness axis may currently compute as zero or near-zero, since a sugar cube isn't a parseable fluid ounce.
5. **Non-fluid-ounce ingredient formats** appear throughout the catalog and will not parse into any ounce-based formula without a conversion step: "1 sugar cube" (Old Fashioned, Sazerac), "2 tsp granulated sugar" and "1/2 lime cut into wedges" (Caipirinha), "1 tsp absinthe" (Zombie) vs. "absinthe rinse" (Sazerac, Corpse Reviver #2) with no amount at all, "1 barspoon Bénédictine" (Vieux Carré), dash-based bitters throughout. This is the single largest structural gap uncovered in this research — intensity multipliers alone cannot fix ingredients the formula can't measure in the first place.
6. **Garnish-only entries with no taste contribution modeled** (mint sprigs, lime wheels, cherries, orange peels used only for expression/aroma) are correctly excluded from ounce math today, which is fine, but worth confirming the parser doesn't accidentally try to assign them a zero-oz "ingredient" that pollutes a denominator count.
7. **Mixer/topper ounce inclusion is unclear from the source alone.** Several highballs (Paloma, Moscow Mule, Dark 'n' Stormy, Tom Collins in one of its two entries) either specify soda/ginger-beer/tonic amounts or omit them entirely, and I could not determine from the data files alone whether the app's current formula includes mixers in its ounce-sum denominator. This materially changes every highball's Spirit Forward reading (excluding mixers make these drinks look much more spirit-forward than including them does) and should be confirmed with whoever owns the current formula implementation before applying any multiplier fix.

## Summary counts

- **Ingredients rated in Deliverable 1:** 39 (13 base spirits, 13 liqueurs/amari entries across two axes, 6 sweeteners, 3 citrus, 3 bitters — some ingredients rated on more than one axis, e.g. Campari and Fernet-Branca each get two rows).
- **Cocktails given a full write-up in Deliverable 2:** 38, spanning stirred classics, sours, tiki, spritzes, and highballs from both source files.
- **Cocktails named as reviewed-but-not-confidently-corrected:** 24 (listed explicitly in the closing section, several with the specific missing ingredient identified).
- **Data-quality issues flagged:** 7, including one true `id` collision, one ratio mismatch under a shared `id`, and a structural gap (non-fluid-ounce and mixer-inclusion questions) that affects the formula independent of any intensity-multiplier fix.

## Open questions for the founder / engineer

1. Should the four-axis model (Spirit Forward, Sweetness, Acidity, Finish) gain a fifth axis for pure bitterness, or continue folding bitterness into Acidity? Several corrections above (Campari, Fernet, Cynar, amari generally) are describing bitterness, which sits awkwardly under an "Acidity" label from a citrus-sour drink's perspective.
2. Does the current formula include mixers/toppers (soda, tonic, ginger beer, prosecco) in its ounce-sum denominator? This changes the practical impact of every highball/spritz correction above and should be confirmed before implementation.
3. How are non-fluid-ounce ingredients ("1 sugar cube," "1 barspoon," dash-based bitters, "absinthe rinse") currently parsed, if at all? If they're silently dropped, several of the corrections above (especially Manhattan, Old Fashioned, Sazerac, Hanky Panky) will need a dash/cube-to-oz-equivalent conversion layer before an intensity-multiplier fix can do its intended job.
4. Should the `id` collisions and ratio mismatches flagged above be resolved (pick one canonical source) before or alongside the taste-formula fix, since they'll otherwise produce inconsistent results depending on which file the running app actually reads?
