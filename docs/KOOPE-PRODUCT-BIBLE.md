# KŌOPE Product Bible

**Author:** Office of the CPO
**Date:** July 2026
**Mandate:** Design the best possible product on the path to becoming the world's leading hospitality platform. First principles. Implementation constraints ignored; sequencing logic kept.

---

## 0. The Thesis

KŌOPE today is a very good home-bar companion. Its bones are correct: the camera is the front door, the shelf is the anchor, taste is the memory. That is not a hospitality platform yet — it is the *seed* of one.

The first-principles insight: **hospitality is not drinks. Hospitality is the act of taking care of someone through what you serve them.** Every great feature KŌOPE will ever ship is a version of one of three moments:

1. **"I made this"** — craft, for yourself.
2. **"I made this for you"** — hosting, for someone.
3. **"Make me something"** — being taken care of, by a pro or a place.

Today KŌOPE serves moment 1 well, moment 2 partially (Hosting Planner, Guest Menu), and moment 3 not at all. The five-year arc is to own all three — home, gathering, and trade — on top of the two assets no competitor has: **the inventory graph** (what bottles actually sit on real shelves) and **the taste graph** (what real people actually like). Everything in this document ladders to building and defending those two graphs.

---

## 1. North Star

### North Star Metric: **Weekly Makers**
> Users who make or serve at least one drink with KŌOPE's help in a given week.

Not scans, not opens, not XP. Scanning is the hook; *making* is the value. A user who scans ten bottles and never makes a drink is a leading indicator of churn. A user who makes one drink a week is building a life ritual with us — and every made drink deepens the taste graph.

### Input Metric Tree

| Layer | Metric | Target instinct |
|---|---|---|
| Activation | Time to first scan | < 60 seconds from install |
| Activation | First made drink | < 24 hours from install |
| Habit | Drop-day return rate | Weekly drop becomes appointment behavior |
| Depth | Shelf size at day 30 | ≥ 5 bottles = data gravity achieved |
| Spread | Guest-menu recipients who install | The hosting viral loop, our only free growth channel |
| Economics | Free → Plus conversion at the moment of making | Paywalls fire at desire peaks, never at curiosity peaks |

### North Star Statement
> **KŌOPE helps anyone turn the bottles they own into moments they're proud of — and remembers their taste everywhere drinks are made.**

---

## 2. Product Principles

These are decision rules, not slogans. When two features conflict, the higher principle wins.

1. **The bottle is the atom.** Every feature must trace back to a real bottle in the user's world. Features that float free of the shelf (generic content, abstract games) decay into noise.
2. **Scan is the front door; the drink is the destination.** The camera-first tab layout is correct and sacred. But every scan must end in a suggested *action* — a drink to make tonight — not just a catalog entry.
3. **Every interaction must teach the taste graph.** A tap, a skip, a rating, a repeat-make — all of it is training data. If a feature generates no taste signal, it must justify itself some other way.
4. **Teach at the moment of doing.** Education embedded in the act (why you stir a Manhattan, *while making one*) beats education in a classroom tab. The Lessons tab is a library; the kitchen is the school.
5. **One ladder, one currency.** FREE "Home Bar" → PLUS "Bartender" → PRO "Mixologist" is an identity ladder, and XP is its single currency. Every new gamification mechanic must fold into this ladder or not ship.
6. **Gates create desire, not resentment.** The free tier must be genuinely excellent — 9 classics, XP unlocks, unlimited scans is the right shape. We gate *depth and convenience*, never *dignity*.
7. **Never ship a dead room.** No "coming soon" screens, no mock data, no paywalled stubs. An empty room tells the user the party is elsewhere. (Today we violate this in three places — see §4.)
8. **Earn the right to social.** Social objects (share cards, guest menus, wishlists) before social spaces (feeds, communities). A community launched before density is a ghost town that costs trust.
9. **Recommendations are never for sale.** Brand money buys labeled placement and sponsored drops — it never buys a slot in "For You" or a substitution suggestion. The day the taste graph lies, the moat drains.
10. **Premium craft, not party fuel.** KŌOPE's brand is craftsmanship and care. Features that read as drinking-to-get-drunk (drinking games) are off-brand and off-strategy, whatever their engagement numbers.

---

## 3. First-Principles Evaluation

Grades are against "best possible product," not against effort. What's shipped is often impressive; the grade asks whether it's *right*.

### 3.1 Onboarding — B
**What exists:** Welcome carousel → age gate → consent → taste questionnaire (spirits, flavors, budget, occasions, dislikes) → survey results → preview.
**Assessment:** The questionnaire is a genuinely good taste-graph bootstrap, but it stands *between* the user and the magic moment. The scan is the best onboarding we have — it's personal, it's instant, and it proves the app's core promise.
**Verdict:** Invert it. Age gate → one carousel card → **camera**. First scan within 60 seconds. The questionnaire becomes a post-scan "refine your taste" moment (the RefineYourTaste screen already exists for this) offered after the first suggested recipe, when the user has a reason to care. Every question we ask before the first scan should be treated as a tax and defended line by line.

### 3.2 Navigation — B−
**What exists:** Five tabs — Discover, Your Shelf, Camera (center, default), Lessons, Profile. Camera-center is exactly right.
**Assessment:** The tab architecture is correct. The problem is beneath it: ~75 screens with visible sprawl — duplicate map screens (`MapScreen`, `MapsScreen`, both stubs), duplicate terms screens, an orphaned `ForYouFeed_OLD` component, and features reachable only through deep paths.
**Verdict:** Keep the five tabs frozen for years. Prune the screen graph ruthlessly (see §4 Remove). Adopt a rule: any feature more than two taps from a tab root must earn its depth with usage data or die.

### 3.3 Discovery (general) — B+
**What exists:** For You feed, weekly drops, taste-graph-shaped recommendations, occasion modes, category browsing.
**Assessment:** Strong engine, fragmented surfaces. The single highest-leverage discovery feature — **What Can I Make** — is not yet on the home surface (the plan to add it exists and is right: exact matches free, almost-makeable for Plus+).
**Verdict:** "What Can I Make" is not a feature; it is *the answer to the question every user opens the app with*. Promote it to the top of Home. Every discovery surface (feed, drops, categories, search) should be a different lens on the same unified recommendation engine, not separate engines.

### 3.4 Education — B
**What exists:** Lessons tab, lesson engine, certifications, Mixology MasterClass, tutorials, spirit education panels, curriculum unlock plan.
**Assessment:** A real curriculum with real unlock mechanics — rare and valuable. But it lives in a silo. The user making their first Negroni *right now* is infinitely more teachable than the user browsing a lessons tab.
**Verdict:** Keep the tab as the library. Expand **micro-lessons at the moment of action**: 20-second "why" cards inside recipe steps, spirit education on the post-scan screen, technique videos triggered by the first appearance of a technique. Long-term, certifications become the credential layer of the platform (§3.17).

### 3.5 Inventory — A−
**What exists:** Shelf (owned, powers recipes), Wishlist (spotted, price journal), Cellar (collection/value tracking with analytics), 4-layer scan stack (barcode → OCR → visual AI → manual), bottle-level tracking, expiry alerts, bar health score, Optimize My Bar.
**Assessment:** This is the crown jewel and the moat. The Shelf/Wishlist distinction (owned vs. spotted) is well-reasoned. The risk is conceptual load: Shelf, Wishlist, Cellar, Watchlist are four containers the user must model.
**Verdict:** Expand investment, simplify the model. One mental object — **"your collection"** — with states (on my shelf / want it / cellared) rather than four rooms. The scan stack should be treated as core infrastructure with its own quality bar (scan success rate is a company-level KPI). Inventory is also the data asset that makes every future act possible: gifting, commerce, brand insights, restaurant integration all read from this graph.

### 3.6 Events — D (as shipped) / B+ (as opportunity)
**What exists:** A screen with three hardcoded mock events, gated behind the paywall.
**Assessment:** This is the worst pattern in the app: a paid gate in front of fake data. A Plus subscriber who taps in finds a Potemkin village. It violates Principles 6 and 7 simultaneously.
**Verdict:** **Remove now.** Reintroduce in Act 2 (§7) when we have supply: real tastings, brand-sponsored masterclasses, and — the genuinely differentiated version — *user-hosted gatherings*. KŌOPE's native event is not a ticketed masterclass; it's your friend's cocktail night, planned in Hosting, with a Guest Menu.

### 3.7 Community — Incomplete (correctly)
**What exists:** A 40-line "Coming Soon" stub.
**Assessment:** Holding was the right call. But a coming-soon screen is still a dead room.
**Verdict:** Remove the stub from navigation until the real thing ships. Sequence per Principle 8: (1) share cards — shipped; (2) guest menus as social objects — shipped, under-leveraged; (3) shareable wishlists and shelves; (4) bartender profiles with sourced drops; (5) *then* community spaces, seeded by bartenders, not empty for consumers. Community's first citizens should be the supply side.

### 3.8 Cocktail Discovery — A−
**What exists:** Full catalog with XP-progressive unlocks (clear thumbnails, "Unlock at Level X" — no blur; a genuinely respectful gating design), AI recipe generation, URL import, voice recipe, substitution blueprint, recipe cards.
**Assessment:** The unlock design is best-in-class free-tier psychology. AI generation is table stakes now; the differentiation is *grounding* — AI that knows your shelf, your taste, your skill level.
**Verdict:** Expand the substitution engine into a first-class feature ("you don't have Cointreau; triple sec works, here's what changes"). Substitutions convert almost-makeable into makeable — a direct Weekly Makers lever and the single best justification for the Plus tier.

### 3.9 Bottle Discovery — B+
**What exists:** Bottle search, bottle detail, spirit recognition, brand screens, cellar watchlist with price journaling.
**Assessment:** Good in-app. The unbuilt opportunity is *outside* the app: every bottle page is a canonical SKU page that could be the web's best answer to "what is this bottle and what can I make with it."
**Verdict:** Expand into web bottle pages (Act 2). This is the SEO flywheel: scan data → richest bottle database → web pages → installs. It's also the surface brands will eventually pay to enrich (labeled, per Principle 9).

### 3.10 Hosting — A− (the sleeper strategic asset)
**What exists:** A deep Hosting Planner (guest count → cocktail picks → scaled ingredients → prep timeline), batch calculator, Guest Menu, shareable prep timeline. Clearly heavy investment.
**Assessment:** This is the most under-valued asset in the product. Hosting is the *only* feature that is inherently multiplayer: every planned party has 8 guests who experience KŌOPE's output without owning the app. The Guest Menu is a viral loop wearing a utility costume.
**Verdict:** Expand aggressively. Guest Menu becomes a rich shared link: guests see the menu, RSVP a drink preference (taste signal! from people who don't have the app!), and get a "make it again at home" link after the party. Hosting is the bridge from Act 1 (home bar) to Act 2 (gatherings) — it *is* the hospitality in the hospitality platform.

### 3.11 Gifting — F (doesn't exist) / A (opportunity)
**What exists:** Nothing explicit. But the Wishlist — bottles spotted, wanted, price-tracked — is a gifting registry that doesn't know it yet.
**Assessment:** Spirits are one of the most gifted categories on earth, and gifting is the highest-intent commerce moment that exists. Nobody owns "what bottle should I get them?"
**Verdict:** Build. V1 is nearly free: a shareable Wishlist link ("here's what I'm hunting"). V2: occasion reminders + "gift guide from their taste graph" for connected friends. V3: fulfillment partnerships. Gifting also solves the December problem every subscription app has — Q4 becomes our acquisition season.

### 3.12 Recommendations — B+
**What exists:** Taste graph shaping all discovery, predictive engine in the Pro feed, occasion modes, recommendation feedback modal.
**Assessment:** The architecture (taste graph everywhere, not just For You) is right. The gap is signal breadth: we learn from taps and ratings, but the richest signals are *repeat makes* (revealed preference) and *guest reactions* (hosting).
**Verdict:** Expand signal capture: "made it again" is worth ten ratings. Unify every surface on one engine with one explanation layer — recommendations that can say *why* ("citrus-forward, like the Daiquiri you make weekly") build trust and teach taste vocabulary simultaneously, which serves both discovery and education.

### 3.13 Monetization — B+
**What exists:** FREE / PLUS $6.99–$59 / PRO $12.99–$99, founders pricing, XP-unlock free tier, RevenueCat integrated (activation deferred until payments go live), cart/checkout screens built, affiliate plans at 500 MAU, brand partnerships planned at 5k MAU.
**Assessment:** The subscription ladder is well-designed — each tier is an identity, not a feature bag. The long-term risk is subscription-only thinking: a hospitality platform monetizes *flows* (commerce take rate, brand insights, B2B tools), not just access.
**Verdict:** Hold the line on subscription discipline now. Sequence the revenue stack: subscriptions (now) → affiliate commerce (500+ MAU) → labeled brand drops and sponsored placements (5k+ MAU, per the roadmap) → aggregated insights (15k+) → B2B/pro tools (Act 3). Never let layer N+1 corrupt layer N: brand money must not distort recommendations (Principle 9).

### 3.14 Retention — B+
**What exists:** Streaks, daily-rotating challenges, weekly drops, XP daily caps, push notifications live, expiry/low-stock alerts.
**Assessment:** Solid mechanics, but the durable retention is structural, not mechanical: **data gravity** (a 30-bottle shelf is a moat against switching) and **ritual** (drop day, hosting cadence, the Friday drink).
**Verdict:** Treat mechanics as seasoning, structure as the meal. The retention roadmap is: get 5+ bottles on the shelf fast (activation), make drop day an appointment, and make hosting recurring ("your holiday party menu, one year later"). Alerts should feel like a butler, not a slot machine.

### 3.15 Gamification — C+
**What exists:** XP with levels and daily caps, achievements, challenges, streaks, certifications, Vault with unlock keys, tier badges, unlock celebrations — at least seven interlocking systems.
**Assessment:** Each system is individually reasonable; together they're a Rube Goldberg machine. New users face XP *and* levels *and* keys *and* streaks *and* challenge progress *and* achievement tracks. Over-gamification reads as manipulation to exactly the premium, craft-minded user we want.
**Verdict:** **Simplify to one spine:** XP → Level → Unlocks, with the tier ladder as identity. Achievements fold in as XP milestones. Vault keys become level-gated access, not a parallel currency. Challenges remain as the *verb layer* (things to do) feeding the one spine. Certifications stay separate — they're credentials, not game pieces (§3.17). Kill any mechanic that can't explain itself in one sentence.

### 3.16 Learning (skills) — B
**What exists:** Lesson engine, curriculum with unlock plan, certifications with shareable cards, hacks & tips library.
**Assessment:** See §3.4 for delivery. The strategic question is what learning *becomes*: content is copyable; credentials are not.
**Verdict:** Expand toward credibility. KŌOPE certifications should become the thing a home enthusiast puts in an Instagram bio and — in Act 3 — the entry rung of a real professional ladder (industry-recognized, bartender-endorsed). The taste graph plus a verified skill graph is a résumé no competitor can fake.

### 3.17 Social Features — C (present state) / sequenced correctly
**What exists:** Scan-and-share cards, cellar share with portfolio value, shareable certification cards, referral program, guest menus.
**Assessment:** The social *objects* exist and are good. They're under-leveraged: shares are exports, not loops — a share card should land somewhere that pulls the viewer in.
**Verdict:** Every shared artifact gets a web landing page with one clear action (see the recipe → install to see what *you* can make). Then follow the §3.7 sequence. The end-state social graph is unique: not "friends," but *taste affinity* — people whose shelves and palates rhyme with yours.

### 3.18 Brand Partnerships — Held (correctly), design now
**What exists:** Nothing live (gated to 5k MAU per the growth roadmap). Brand intelligence and upgrade-suggestion UI built but hidden. Vault Bars category removed pending partnerships. Drop data structure planned with a `source` field for bartender/bar-sourced content.
**Assessment:** The discipline here is commendable. The `source` field decision is exactly right — it makes drops a *platform primitive* (KŌOPE-sourced, bartender-sourced, brand-sourced) rather than a content type.
**Verdict:** Hold the timing. But write the brand covenant *now*, before the first dollar arrives: brands can sponsor labeled drops, enrich their bottle pages, and buy aggregated insight reports. They can never buy recommendation slots, taste-graph placement, or substitution suggestions. The pitch to brands is honest and strong without corruption: *we know which shelves your bottle sits on, what gets made with it, and what nearly got bought instead.*

### 3.19 Restaurant & Bar Integrations — Not started / Act 3
**Assessment:** The bridge between moments 1–2 (home) and moment 3 (trade). The naive version (reservations, menus) is owned by incumbents. The KŌOPE version is the *taste layer*: scan a cocktail menu and see what matches your palate; order something great out, then "make it at home" the next weekend; your home taste graph following you into the room.
**Verdict:** Delay until the taste graph is dense and the bartender supply side exists (bartender drops are the natural first handshake with the trade). Pilot in Act 3 with menu scanning — it needs no bar's permission and uses the scan stack we already own.

### 3.20 Travel — Not started / Act 3
**Assessment:** High-affinity, low-urgency. Spirits people travel for spirits: distillery trails, duty-free hunting, "drink like a local."
**Verdict:** Delay, but note the cheap early wins that ride existing rails: Wishlist as duty-free hunting list (price journal already fits), city spirit guides as drop content with a location tag. Full travel product (itineraries, distillery partnerships) is a Year 4–5 expansion once international density exists.

### 3.21 International Expansion — Not started / sequence defined
**Assessment:** Cocktail culture is global but *canon is local* — a straight catalog translation fails. Requirements: unit localization (oz/ml/cl), local spirit taxonomies (shochu, soju, baijiu, cachaça, pisco, aquavit), local bottle databases for the scan stack, legal drinking-age and advertising-law variance per market.
**Verdict:** Phase 1 (Act 2): English-speaking markets — UK, Canada, Australia — where canon overlaps and only units/bottles change. Phase 2: EU (Germany, France, Spain, Italy) with localized canon and local bartender drops as the localization *content* strategy — local pros teaching local drinks is better than translation. Phase 3: Japan, Korea, Brazil, Mexico — markets with deep native spirit cultures where KŌOPE must arrive as a student, not a missionary.

### 3.22 The Party Games Problem — Remove
**What exists:** King's Cup and Game Details screens — drinking games.
**Assessment:** Directly off-brand (Principle 10). "World's leading hospitality platform" and "app with drinking games" cannot coexist in App Store review, in brand-partner due diligence, or in the user's mental model. The engagement they buy is the wrong engagement.
**Verdict:** Remove. If party entertainment matters, the on-brand version is hosting content: icebreaker menus, tasting-night formats, "guess the spirit" *tasting* games — care, not consumption.

---

## 4. The Ledger: Remove / Simplify / Delay / Expand

### Remove (now)
| Item | Why |
|---|---|
| Events screen (mock data behind paywall) | Paid gate on fake content — the single worst trust pattern in the app |
| Community "Coming Soon" stub | Dead room; remove from nav until real |
| King's Cup + drinking-game screens | Off-brand, App Store risk, wrong engagement |
| `MapScreen` / `MapsScreen` stubs (17 and 9 lines) | Dead code shipping in the bundle |
| Duplicate Terms screens, `ForYouFeed_OLD` | Sprawl; every dead screen taxes every future change |

### Simplify
| Item | To what |
|---|---|
| Gamification stack (7 systems) | One spine: XP → Level → Unlocks; challenges as the verb layer; certifications set apart as credentials |
| Inventory containers (Shelf/Wishlist/Cellar/Watchlist) | One "Collection" mental model with states: on my shelf / want it / cellared |
| Onboarding | Age gate → camera in <60s; taste questionnaire moves post-first-scan |
| Recommendation surfaces | One engine, one explanation layer, many lenses |
| Screen graph (~75 screens) | Two-taps-from-tab-root rule; prune quarterly |

### Delay (deliberately, with triggers)
| Item | Until |
|---|---|
| Community spaces | Bartender supply side live + social objects generating pull |
| Brand partnerships | 5k MAU (per existing roadmap) — but write the brand covenant now |
| Restaurant/bar integrations | Taste graph density + trade relationships via bartender drops |
| Travel product | International density (Year 4+); cheap wins on existing rails allowed earlier |
| Creator tools | Post-community, per existing plan |
| Real Events | Supply exists: brand masterclasses + user-hosted gatherings |

### Expand (the conviction bets)
| Item | Why it compounds |
|---|---|
| **What Can I Make → top of Home** | The question every user opens the app with; already planned — do it first |
| **Hosting → Guest Menu loop** | The only inherently multiplayer feature; taste signal from non-users; the growth engine |
| **Substitution engine** | Converts almost-makeable → makeable; the best Plus justification in the product |
| **Wishlist → Gifting** | Highest-intent commerce moment; Q4 acquisition season; V1 is one shareable link |
| **Web bottle pages** | SEO flywheel from scan-stack data; future brand surface |
| **Micro-lessons in the moment** | Education where it converts to skill; feeds pride, feeds retention |
| **Bartender drops** (`source` field vision) | The supply-side handshake that unlocks community, trade, and Act 3 |
| **Scan stack as infrastructure** | Scan success rate = company-level KPI; every future act reads from it |

---

## 5. Feature Prioritization

Framework (implementation cost ignored per mandate; *sequence* still matters because trust and data compound):

> **Priority = North Star impact × taste-graph learning × strategic optionality**, ordered by dependency.

### P0 — The Maker Loop (do before anything else)
1. Remove the four dead surfaces (Events, Community stub, games, map stubs) — trust repair costs nothing and pays forever.
2. What Can I Make on Home (exact matches FREE, almost-makeable Plus+, per existing plan).
3. Onboarding inversion — scan in 60 seconds, questionnaire after first recipe.
4. Substitution engine v1 surfaced on every almost-makeable recipe.
5. "Made it" logging as a first-class action (the North Star's sensor — one tap, at the end of every recipe).
6. Gamification consolidation to the single XP spine.

### P1 — The Spread Loop
7. Guest Menu as a live web link with guest drink-preference RSVP.
8. Shareable Wishlist (gifting v1) with a web landing page.
9. Web landing pages behind every share card (recipe, cellar, certification).
10. Payments activation + paywall timing audit (fire at desire peaks: post-make, post-scan-of-11th-bottle, pre-party).

### P2 — The Supply Loop
11. Bartender drops: sourced weekly drops with bartender profiles (the `source` field vision).
12. Web bottle pages (public, canonical, SEO-indexed).
13. Micro-lessons embedded in recipe steps.
14. English-market internationalization (UK/CA/AU: units, bottle DBs, spellings).

### P3 — The Platform Loop (triggers, not dates)
15. Community spaces seeded by bartenders (trigger: bartender supply live).
16. Brand drop platform + covenant (trigger: 5k MAU).
17. Gifting v2: occasion engine + friend taste-graph gift guides.
18. Cocktail-menu scanning (the restaurant handshake that needs no restaurant's permission).

---

## 6. Launch Roadmap

Four acts. Dates are planning fictions; triggers are real.

### Act 1 — **The Best Home Bar App on Earth** (now → mid-2027)
Theme: perfect the single-player game.
- P0 complete: maker loop tight, dead rooms gone, one gamification spine.
- Payments live; founders pricing sunset per plan.
- Weekly Makers replaces MAU as the headline metric.
- Exit criteria: 40%+ of WAU are Weekly Makers; day-30 shelf ≥ 5 bottles; scan success >95%.

### Act 2 — **The Gathering Layer** (2027 → 2028)
Theme: from me to us. Hosting is the wedge.
- Guest Menu loop live; guest → install conversion is the growth KPI.
- Gifting v1–v2; first Q4 gifting season as an acquisition campaign.
- Bartender drops launch — first supply-side citizens.
- Web surface: bottle pages + share landings; Android parity if not already.
- EN-market international launch.
- Exit criteria: measurable K-factor from hosting/gifting; 100+ active bartender contributors.

### Act 3 — **The Trade Bridge** (2028 → 2029)
Theme: home and industry connect.
- Community spaces open, bartender-seeded.
- Brand platform live under the covenant (labeled drops, bottle-page enrichment, insight reports).
- Cocktail-menu scanning pilot; "make it at home" from a night out.
- Certifications v2: industry-endorsed credential track.
- EU localization with local-bartender content strategy.
- Exit criteria: brand revenue ≥ 20% of total without any recommendation-integrity incident; first trade partnerships signed.

### Act 4 — **The Hospitality Graph** (2029 → 2031)
Theme: your taste, everywhere.
- Taste graph portable across contexts: home, friend's party, bar, restaurant, travel, duty-free.
- B2B: bar-program tools for venues (menu design from aggregate taste data), pro tier for working bartenders.
- Travel product: distillery trails, city guides, wishlist-driven duty-free.
- Deep-culture international markets (Japan, Korea, Brazil, Mexico) entered as a student.
- Exit criteria: KŌOPE identity used in at least one *physical* hospitality context at meaningful scale.

---

## 7. Five-Year Product Vision

**2031: KŌOPE is the taste layer of hospitality.**

A member's KŌOPE identity carries three graphs no one else has:
- **Inventory graph** — what they own, cellared, and want (the world's best real-shelf dataset).
- **Taste graph** — what they actually like, learned from thousands of makes, ratings, and gatherings, not surveys.
- **Skill graph** — what they can do, credentialed from home enthusiast to working professional.

On those graphs, the three moments run end to end:

**"I made this."** Anyone with three bottles opens KŌOPE and knows exactly what to make tonight, learns while making it, and gets measurably better every month. The scan stack recognizes any bottle on the planet.

**"I made this for you."** Hosting is a full ritual: plan, invite, learn guests' tastes before they arrive, serve a menu scaled and timed to the minute, and leave every guest with a "make it again" memory — and, often, a new KŌOPE membership.

**"Make me something."** Out in the world, KŌOPE travels with you: the menu that highlights your matches, the bartender who can see (with your consent) that you love spirit-forward and bitter, the bottle shop that knows your wishlist, the distillery trail routed through what you cellar. For the trade, KŌOPE is the platform where bartenders build reputations, publish drops, hold credentials, and read the world's honest demand signal.

The business by then has four honest engines — memberships, commerce flows, a covenant-bound brand platform, and B2B tools — none of which requires lying to a user about what they'd love to drink.

The one-line test for every decision between now and then:

> **Does this help someone take better care of the people they pour for — and does it teach us their taste while they do it?**

If yes, it belongs. If no, it's sprawl — and this document is the license to cut it.

---

# PART II — MONETIZATION

## 8. Business Model Chapter

### 8.1 The Frame: Assets, Not Streams

The revenue-capabilities analysis (23 streams, 6 categories) treats revenue as a checklist. That framing is backwards. Revenue streams are downstream of **assets**, and KŌOPE has exactly four:

| Asset | What it is | Streams it powers |
|---|---|---|
| **Scan stack** | 4-layer bottle recognition + the bottle database it builds | Affiliate, bottle pages, API/IP licensing (far future) |
| **Inventory graph** | What bottles actually sit on real shelves | Brand insights, gifting, restock commerce, collector economy |
| **Taste graph** | What real people actually like, learned from makes | Recommendations, gift guides, brand insights, B2B taste layer |
| **Hosting network** | Parties, guests, menus — the only multiplayer surface | Party commerce, events, guest acquisition, corporate |

**Rule: every revenue stream must read from an asset and, ideally, feed one back.** Streams that read from no asset (XP packs, private label spirits) are distractions regardless of margin. Streams that feed assets while monetizing (party carts generate taste + inventory signal) are compounding and get priority.

### 8.2 The Revenue Stack (in order of activation)

1. **Subscriptions** — the floor. Real, high-margin, but structurally capped (~$70–150k/yr at 25k MAU under honest conversion — see §9). Validates willingness to pay; funds nothing ambitious alone.
2. **Commerce flows** — the growth engine. Affiliate on bottles, **party carts** (the $150–300 basket the Hosting Planner already assembles), and **gifting** (wishlist-as-registry). High intent, zero trust cost when it's the user's own list.
3. **Brand platform** — the scale revenue. Labeled sponsored drops, challenge sponsorships, **bottle-page enrichment** (Amazon A+ model — brands pay to enrich their own canonical page), and the **insights product** (aggregated demand reports; no slot limit, so it scales where placements can't).
4. **Supply-side & B2B** — the platform economics. Bartender Pro tier, drop revenue share, then venue tools. Arrives Year 2+, *after* bartender drops establish trade relationships.

### 8.3 Corrections to the Revenue Capabilities Doc

**Factual/stale:**
- **Drizly shut down (March 2024).** Affiliate plan rebuilds around Total Wine, ReserveBar, Curiada/Caskers, Instacart & Uber Eats alcohol delivery.
- **Pricing conflict:** doc says Plus $49/yr, Pro $14.99/$119; the shipped app says $6.99/$59 and $12.99/$99. Canonical pricing is set in §10.5.
- **15% MAU→paid conversion** is baked into every projection. Freemium utility reality: 2–5%, best-in-class ~8%. Model corrected in §9.
- **$15–25k/mo multi-category sponsorships at 10k MAU** = ~$72/user/yr in brand spend, 10–30× normal ad ARPU. Honest expectation: $2–5k/mo pilot deals at 5–10k MAU; the doc's $1.4M sponsorship line is a 50k+ MAU number.

**Cut permanently:**
| Stream | Why |
|---|---|
| Premium XP packs | Converts the identity ladder into a slot machine for ~$18k/yr; violates Principles 5, 6, 10 |
| Private label spirits | Competes with the brands we want partnership revenue from; brand risk for $12.5k/yr |
| Anonymized data *sales* | Trust headline waiting to happen; same revenue exists safely as the covenant-bound insights product |
| Licensed spirits marketplace | State-by-state legal minefield; stay affiliate/referral permanently |

**Missing from the doc entirely (the biggest gaps):**
1. **Hosting commerce** — party carts. Every affiliate projection assumes $60 single-bottle orders; a party order is $150–300 and the planner already builds the list. One party = five bottle referrals.
2. **Bottle gifting** — the doc has gift *subscriptions*; it misses gift *bottles*. Wishlist is a registry that doesn't know it yet. Q4 becomes acquisition season.
3. **Bartender creator economy** — drops with revenue share, paid signature recipe packs, Bartender Pro tier. The doc monetizes content and data but never *people*; talent is the moat (the MasterClass insight).
4. **Retail media on bottle pages** — the honest replacement for "featured placement": brands enrich their own labeled page instead of buying recommendation slots.
5. **Collector economy** — Cellar Mode already tracks value; insurance referrals, auction affiliates, premium collector analytics. Highest-LTV users, unserved.
6. **Local store lead-gen** — inventory-aware "buy near me"; small but defensible.

### 8.4 The Brand Covenant (written before the first dollar)

Brands **can** buy: labeled sponsored drops, labeled challenge sponsorships, enrichment of their own bottle pages, aggregated insight reports, co-branded events.
Brands **cannot** buy — at any price, at any revenue stage: For You placement, What Can I Make ranking, substitution suggestions, taste-graph position, or unlabeled anything.
Enforcement metric: **sponsored slots inside recommendation surfaces = 0, forever.** This is a KPI, not a vibe.

### 8.5 Answers to the Standing Strategic Questions

- **What is never paywalled (acquisition surfaces):** scanning, bottle pages, exact-match What Can I Make, the 9 classics + XP unlocks, and *all network surfaces* — viewing a guest menu, a shared wishlist, a share card. Gating the receiving end of a viral loop kills the loop.
- **What makes users pay monthly:** two moments. *"Unlock everything my shelf can do"* (full catalog + substitutions → Plus) and *"I have people coming Friday and want to look good"* (hosting suite → Pro). Paywalls fire at those desire peaks, never at curiosity peaks.
- **What would make brands pay:** we know which shelves their bottle sits on, what gets made with it, what nearly got bought instead, and what taste-adjacent buyers want next. Honest aggregate data beats corrupted placement — and it's the only version that survives due diligence.
- **What KŌOPE must avoid becoming:** a cheap affiliate app (commerce only on the user's own lists and parties), a content farm (education stays contextual), a casino (one XP spine, no purchasable progress), or an ad network wearing an app (the covenant).

---

## 9. Corrected Financial Model

### 9.1 Assumptions (replacing the 15%-conversion model)

| Assumption | Base | Upside | Rationale |
|---|---|---|---|
| MAU → paid conversion | 4% | 8% | Freemium utility norms; 8% is best-in-class |
| Payer mix | 70% Plus / 30% Pro | same | Matches tier value ladder |
| Blended sub ARPU/payer/yr | ~$72 | ~$72 | 0.7×$60 + 0.3×$100, annual-weighted |
| Commerce per MAU/yr | $0.60 early → $1.40 at scale | ~2× | Affiliate 6–8% on $65 baskets; party carts ($200+ × 6%) and gifting layer in from 10k MAU |
| Brand revenue | $0 below 5k MAU | — | Pilots $3–5k/mo at 5–10k; insights product from 15k |
| Bartender Pro | from Year 2 | — | $180/yr; 1–2% of MAU-equivalent pro audience |

### 9.2 Revenue by Stage (annual, USD)

| MAU | Subscriptions | Commerce | Brand | Supply-side | **Base total** | **Upside** | Old plan claimed |
|---|---|---|---|---|---|---|---|
| 1,000 | $2.9k | $0.6k | — | — | **~$3.5k** | ~$7k | $15.8k |
| 5,000 | $14.4k | $4k | $36k (2 pilots) | — | **~$54k** | ~$95k | $133.5k |
| 10,000 | $28.8k | $12k | $120k | $18k | **~$179k** | ~$290k | $1.02M |
| 25,000 | $72k | $35k | $450k | $54k | **~$611k** | ~$1.03M | $3.05–5.2M |

### 9.3 What the Corrected Model Changes Strategically

1. **The old revenue targets require ~75–100k MAU, not 25k.** The $3M+ numbers aren't wrong as ambitions — they're wrong as Month-30 line items. Either the timeline extends or ARPU must rise through commerce.
2. **Growth loops are existential, not decorative.** At 4% conversion, paid acquisition never pencils at these price points. Guest-menu spread and gifting links are the *only* channels that make the MAU-gated streams reachable. This is why Hosting and Gifting are P1 in the roadmap, ahead of anything that merely monetizes.
3. **Breakeven still arrives early.** Costs remain ~$105–500/mo through 5k MAU; the corrected model breaks even around 2.5–3k MAU as a solo operation. The honest model changes the ceiling story, not the survival story.
4. **Brand insights is the scale unlock, not sponsorship slots.** Slots cap at inventory; reports don't. Build automated insight generation as *product*, starting the day the first pilot brand signs.
5. **Never present the old model to investors or partners.** A diligence pass finds the 15% assumption and the dead affiliate partner in minutes, and the credibility loss costs more than the smaller numbers do.

---

# PART III — KŌOPE RESTRUCTURED

*The ground-up redesign: if we rebuilt KŌOPE today around the four assets and the North Star, keeping what's earned its place.*

## 10. The Restructure

### 10.1 The Organizing Idea

Every screen in the app answers one of three user questions. If a screen answers none of them, it doesn't ship:

1. **"What can I make tonight?"** — craft
2. **"What should I buy or gift next?"** — acquisition of bottles
3. **"How do I take care of my people?"** — hosting

### 10.2 Navigation: Five New Tabs

| Tab | Replaces | What lives there |
|---|---|---|
| **Tonight** | Discover/Home | What Can I Make (hero), Tonight's Pick (one drink chosen for you), weekly drop, almost-makeable teaser (Plus hook), occasion rails |
| **Bar** | Shelf + Cellar + Watchlist | One collection, three states: *Owned / Want / Cellared*. Bar health, Optimize My Bar, value analytics, shareable wishlist |
| **Scan** (center, default) | Camera | Unchanged and sacred. Post-scan action sheet: Make something · Add to Bar · Want it · Price-check for gifting |
| **Host** | *(new tab — the strategic bet)* | Party planner, live Guest Menu links with RSVP taste polls, Party Cart, prep timeline, occasions calendar (parties *and* gifting dates), post-party recap |
| **You** | Profile + Lessons | Progress (one XP spine), credentials, learning library, saved drinks, taste profile, subscription |

**The two structural moves:** Hosting gains a tab (it's the multiplayer surface, the growth loop, and the Pro anchor — it can't live buried in a stack), and **Lessons loses its tab** (education becomes contextual micro-lessons at the moment of making, with the library archived under You). Events, Community stub, games, and map stubs are gone per §4.

### 10.3 Feature Architecture — Kept, Merged, New

**Kept as-is (earned their place):** 4-layer scan stack · XP-unlock recipe catalog with clear thumbnails · taste questionnaire (moved post-first-scan) · weekly drops · certifications · referral program · share cards.

**Merged/simplified:** four inventory containers → one Bar · seven gamification systems → one spine (XP → Level → Unlocks; challenges as the verb layer; certifications as credentials) · all recommendation surfaces → one engine with one explanation layer.

**New features, ranked by (North Star impact × asset feeding):**

| # | Feature | What it is | Tier | Why it wins |
|---|---|---|---|---|
| 1 | **Make It Anyway** | Substitution engine surfaced on every almost-makeable recipe: "No Cointreau — triple sec works; here's what changes" | Plus | Converts almost-makeable → made; the single best Plus justification |
| 2 | **Tonight's Pick** | One drink, chosen for you, every evening — from your shelf, your taste, the weather, the day | Free (from classics) / full catalog Plus | Turns opens into makes; daily ritual |
| 3 | **Made It** | One-tap logging at the end of every recipe; streaks, taste learning, and Wrapped all feed from it | Free | The North Star's sensor; costs the user one tap |
| 4 | **Party Cart** | The Hosting shopping list becomes an orderable basket (affiliate) | Pro | $150–300 baskets; commerce at peak desire |
| 5 | **Guest RSVP** | Guest Menu links where guests pick preferences before the party | Free to receive, Pro to send | Taste signal from *non-users*; the viral loop |
| 6 | **Wishlist Links** | Shareable want-list with prices — a gifting registry | Free | Q4 acquisition season; V1 is one link |
| 7 | **Bottle Pages (web)** | Public, canonical, SEO-indexed page per bottle | Public | The SEO flywheel + future brand enrichment surface |
| 8 | **Bartender Drops** | Sourced weekly drops with bartender profiles and revenue share (the `source` field vision) | All tiers see; Pro gets early | Supply side; unlocks community and trade |
| 9 | **AI Bar Director** | Conversational "make me something" grounded in shelf + taste + skill — not a generic chatbot | Pro | The Pro anchor beyond hosting; defensible because it's grounded |
| 10 | **KŌOPE Wrapped** | Annual taste recap, shareable | Free | December conversion + gifting trigger |
| 11 | **Post-Party Recap** | What got made, what guests loved, "host it again" in one tap | Pro | Makes hosting recurring; retention structure |
| 12 | **Taste Passport** | Portable taste profile — the Act 3/4 bridge to bars, restaurants, travel | Pro (later) | The hospitality-graph endgame |

### 10.4 Subscription Restructure

Tiers become *identities with a moment*, not feature bags:

| | **FREE — "Home Bar"** | **KŌOPE+ — "Bartender"** | **KŌOPE PRO — "Host"** |
|---|---|---|---|
| The promise | *Know what you own* | *Make everything your shelf can make* | *Take care of your people* |
| Scanning | Unlimited | Unlimited | Unlimited |
| Bottles | 10 | Unlimited | Unlimited |
| Recipes | 9 classics + XP unlocks | Full catalog | Full catalog + Vault drops early |
| Make It Anyway | — | ✔ | ✔ |
| Smart inventory | — | ✔ | ✔ + cellar analytics, predictive restock |
| Hosting | **First party free** (≤4 guests, basic menu) | Basic (calculator, shopping list) | Full suite: planner, Guest Menu + RSVP, Party Cart, prep timeline, recap |
| AI Bar Director | — | — | ✔ |
| Builder/remix | — | — | ✔ |
| Network surfaces (view menus, wishlists, shares) | ✔ always | ✔ | ✔ |

**"First party free"** is the one deliberate loosening: hosting is the growth loop, and a user who has never felt the magic of a planned party will never pay for the full suite. One taste, then the gate.

**Year 2 addition — BARTENDER PRO** ($19.99/mo or $149/yr): spec library, menu costing, drop publishing with revenue share, public profile, credential track. B2B-lite that builds the trade relationships enterprise licensing would someday require.

### 10.5 Pricing (canonical — resolves the doc conflict)

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| KŌOPE+ | **$7.99** | **$59.99** | Annual-first presentation (~37% discount); 7-day trial on annual |
| KŌOPE PRO | **$14.99** | **$99.99** | Anchored against Plus annual: "the price of one cocktail out, per month" |
| Founders (first 300) | — | $29 / $79 | Per existing plan; sunset at user #300, never repeated |
| Bartender Pro (Yr 2) | $19.99 | $149 | Verified working bartenders |

Rules: no lifetime deals (they cap the ceiling and attract deal-hunters, not makers) · no purchasable XP ever · regional pricing at international launch · price increases grandfather existing annuals for one cycle.

### 10.6 North Star & Restructured KPI Tree

North Star unchanged: **Weekly Makers**. The tree gains the commerce and network layers:

| Layer | Metric | Why it's on the tree |
|---|---|---|
| Activation | First scan < 60s · first made drink < 24h · 5 bottles by day 30 | Data gravity threshold |
| Habit | Weekly Makers / WAU · drop-day return · Tonight's Pick open→make rate | The ritual |
| Conversion | Free→paid at desire peaks (post-make, 11th bottle, pre-party) · trial→paid ≥ 35% | Honest 4–8% MAU band |
| Commerce | Party carts/quarter · gift links → purchases · attach rate on shopping lists | The ARPU lift the model needs |
| Network | Guest → install rate · wishlist links created/shared · bartender drops published | The only free growth channels |
| Integrity | Sponsored slots in recommendations = **0** · scan success > 95% | The covenant and the front door |

### 10.7 Roadmaps

**90 days:**
1. Payments live (RevenueCat activation per go-live plan) + paywall timing audit to desire peaks
2. Remove the four dead surfaces; consolidate gamification to one spine
3. What Can I Make on Home (per locked plan: exact FREE, almost-makeable Plus+)
4. Make It Anyway v1 + "Made It" logging
5. Wishlist Links shipped **before Q4** (gifting season)
6. Affiliate v1 with living partners (post-Drizly)
7. Brand covenant written and filed; financial model corrected (§9 replaces old projections)

**12 months:**
1. Navigation restructure to Tonight · Bar · Scan · Host · You
2. Guest Menu live links + RSVP taste polls; Party Cart
3. Tonight's Pick; post-party recap
4. Bartender drop pilot (3–5 bartenders, revenue share, `source` field)
5. Web bottle pages live and indexing; share cards land on web pages
6. KŌOPE Wrapped (December) + first full gifting season campaign
7. First brand pilots at honest prices ($3–5k/mo), framed as insight partnerships
8. EN-market internationalization groundwork (units, bottle DBs)

**5 years:** the four Acts of §6 stand, now with the revenue stack layered on: Act 1 runs on subscriptions; Act 2 adds commerce flows and the bartender supply side; Act 3 adds the brand platform under the covenant plus Bartender Pro; Act 4 adds B2B venue tools, Taste Passport integrations, and travel. Exit criteria unchanged.

### 10.8 The Business Model in One Sentence

> **Subscriptions are the floor, commerce through hosting and gifting is the growth engine, and brand insights plus the bartender supply side are the platform economics — all durable only because recommendations are never for sale.**

---

*Appendix: standing decisions honored here — RevenueCat activation deferred until payment go-live; brand partnerships gated to 5k MAU; drop `source` field as the bartender-content primitive; Shelf=owned / Wishlist=spotted copy locked (the Bar merge in §10.2 preserves the owned/spotted distinction as states); WhatCanIMake Home placement with FREE exact-match access.*
