# KŌOPE Business Playbook — Company, Capital & Deals

**Status:** Operating playbook. Product/strategy stays canonical in [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md); this doc covers everything *around* the product — the legal entity, money, partnerships, and outreach.
**Date:** 2026-07-02
**Rule inherited from the Master Plan:** never show superseded numbers externally. The only model you pitch is Bible §9 (4–8% MAU→paid, brand pilots $3–5k/mo at 5–10k MAU).

---

## Part 1 — The Business Structure (start here, in order)

You are a solo founder with a shipped app. Do these in sequence; each unlocks the next. Total cost to be fully legitimate: roughly $1,500–3,000 and 2–4 weeks of admin.

### Step 1. Incorporate — the decision tree

Incorporate **where you live**, unless you plan to raise from US venture investors, in which case a **Delaware C-Corp** is the standard (every accelerator and US angel expects it; Stripe Atlas or Clerky sets one up in days for ~$500).

| If you're based in… | Default entity | Upgrade path if raising VC |
|---|---|---|
| **USA** | Delaware C-Corp from day one (skip LLC if you'll ever raise — converting later costs $5–15k in legal) | Already there |
| **Canada** | Federal corporation (CBCA) via Corporations Canada, ~$200 online | Keep it — Canadian corps raise fine; flip to Delaware only if a US lead demands it |
| **UK** | Ltd company via Companies House, £50, same day | SEIS/EIS registration makes UK angels *cheaper* than US ones — do this before talking to any UK angel |

**Why a company at all:** Apple and Google developer accounts, RevenueCat payouts, affiliate program approvals, and any brand contract all want an entity, a business bank account, and (in the US) an EIN. Liability protection matters extra for an alcohol-adjacent app.

### Step 2. The boring stack (one afternoon each)

1. **EIN / business number** — free, from IRS / CRA / HMRC directly. Never pay a third party for this.
2. **Business bank account** — Mercury (US, free, startup-native) or your local equivalent. All revenue and expenses flow through here from day one; never commingle.
3. **Bookkeeping** — QuickBooks or Xero (~$30/mo), or just Mercury + a spreadsheet until revenue. Get an accountant at first revenue, not before.
4. **Apple Developer Program** as an *organization* ($99/yr — requires a D-U-N-S number, free from Dun & Bradstreet, takes ~2 weeks; start this early) + Google Play ($25 once).
5. **Trademark "KŌOPE"** — word mark, class 9 (software) and class 42 (SaaS). ~$250–350 per class DIY via USPTO/CIPO/UKIPO. Do this *before* any press. Search first for conflicts.
6. **Founder IP assignment** — a one-page document assigning the code/brand from you personally to the company. Every investor asks for this; it costs nothing today and thousands to fix later.
7. **Insurance (defer until brand contracts):** general liability + E&O + cyber, ~$1–2k/yr bundled (Vouch, Embroker). Brands' procurement teams will require it before a pilot — budget it for Phase 4, not now.

### Step 3. Compliance specific to KŌOPE

- **You are not selling alcohol.** You're a software/media company. No liquor license needed. Keep it that way: affiliate links out, never checkout in-app (the Master Plan kill list already deletes mock checkout — that's also the legal firewall).
- **Age gate** stays load-bearing: App Store 17+ rating, age screen before content, and it's also what brand legal teams check first.
- **Affiliate disclosure** — FTC (US) / ASA (UK) / Competition Bureau (Canada) all require visible "we may earn a commission" disclosure near affiliate links. One settings/legal page + inline label. Cheap now, expensive as a retrofit.
- **Privacy** — the consent-gated analytics work in Phase 0 *is* the compliance program. The scan-data brand product is aggregate-only per the covenant; write that into the privacy policy explicitly, because it becomes a sales asset ("here's our public data policy") during brand due diligence.

### Step 4. Operating cadence (solo founder)

- **Weekly:** metrics snapshot (the Master Plan §5 tree), one outreach block (Part 4), ship.
- **Monthly:** books reconciled, runway number written down, one grant/competition application (Part 2).
- **Quarterly:** the two-taps rule audit from the Master Plan + a "who did I promise what" partner review.

---

## Part 2 — Where the Money Is (mapped honestly)

Ordered by realism for KŌOPE's profile: solo founder, consumer app, pre-revenue → early revenue, alcohol-adjacent.

### Tier 0 — Free money you qualify for *today* (do all of these this month)

| Program | What you get | Catch |
|---|---|---|
| **AWS Activate / Google for Startups Cloud / Microsoft Founders Hub** | $1k–$25k+ in cloud credits each; stackable | Application is a form; Supabase also has a startup credits program |
| **Expo / RevenueCat / PostHog startup tiers** | Waived or discounted fees at your scale | Ask; these companies want case studies |
| **Pitch competitions** (local chamber, university if you're an alum, demo days) | $1–25k, no equity | Time cost; treat as pitch practice with a lottery ticket attached |

### Tier 1 — Non-dilutive government money (jurisdiction decides everything)

**Honest framing first:** most government R&D grants favor deep tech, and many explicitly exclude alcohol-related businesses. Your winning angle is never "cocktail app" — it's **computer vision / product identification / consumer price-transparency data platform**. That's also true, and it's the fundable half of the Master Plan.

- **Canada (strongest non-dilutive landscape):**
  - **SR&ED tax credit** — up to ~35% refundable on R&D salaries/contracts (the scan stack, entity resolution, and substitution engine all plausibly qualify). File with your first tax return; use a SR&ED consultant on contingency.
  - **NRC IRAP** — advisory + project grants for tech SMEs; the scan/CV work is the pitch. Start with a free IRAP advisor call.
  - **Futurpreneur** (if 39 or under) — up to $75k loan + mentorship, BDC co-funded.
- **UK:**
  - **R&D tax relief (HMRC)** — same logic as SR&ED, claim on CV/ML work.
  - **Innovate UK Smart Grants** — competitive, but "spirits identification layer / edition-level entity resolution" is a legitimately novel data problem; frame it as such.
  - **Start Up Loans** (British Business Bank) — up to £25k personal-guarantee loan at 6%, forgiving underwriting.
  - **SEIS** — not a grant, but it makes your first £250k from UK angels 50%-tax-relieved for them. It is *the* reason UK angel rounds close.
- **US:**
  - **SBIR/STTR** — Phase I $200–305k. Real, but a consumer app is a weak fit; only pursue if you frame a genuine CV/data-research thesis (NSF "seed fund"). Expect months of process. Low priority.
  - **State/city small-business grants + Amber Grant / FedEx contest-type programs** — small checks, easy applications, fine as a monthly-application habit.

### Tier 2 — Accelerators (money + network + forcing function)

| Program | Terms (2026) | Fit for KŌOPE |
|---|---|---|
| **Y Combinator** | $500k ($125k for 7% + $375k uncapped MFN SAFE). **Fall 2026 deadline: July 27, 2026** | Real shot *if* you pitch the Vivino-for-spirits data thesis, not "cocktail app." Solo founder is a handicap, shipped product + any Made-It retention data is the counter. Apply — the application itself sharpens the pitch and costs a weekend. |
| **Techstars** | ~$220k for 5% + uncapped MFN. Applications due Aug 15, 2026 | Vertical programs matter — look for retail-tech / consumer / food-and-bev-adjacent batches |
| **500 Global** | ~$150k pre-seed checks | Consumer-friendly |

### Tier 3 — Strategic / industry money (the sleeper option)

The spirits industry runs its own venture arms, and KŌOPE's data product is exactly what they buy:

- **Distill Ventures** (Diageo-backed) — invests in drinks and drinks-adjacent; a data platform that tells brands what happens in the aisle is on-thesis.
- **Pernod Ricard – Convivialité Ventures** — SF-based, explicitly invests in consumer *experience* startups adjacent to drinks, not just liquids.
- **Constellation Brands Ventures** — same logic.
- ⚠️ **Rule:** strategic money later is stronger than strategic money now. Take their *pilot revenue* (Part 4) before their equity — a brand pilot at $3–5k/mo validates you for everyone, while an early strategic investor can scare off their competitors as customers. Talk to them; sell them data first.

### Tier 4 — Angels & pre-seed VC

- Timing per the Master Plan: raise **after Phase 2's exit gate** (trial→paid ≥ 35%, honest conversion data). Numbers close rounds; decks don't.
- Target angels who *get* the category: ex-Vivino/Untappd/Delectable people, drinks-industry operators, marketplace/scan-app founders.
- The pitch is the Master Plan §1 verbatim: *"Vivino owns wine, Untappd owns beer, nobody owns spirits."* One line, instantly legible to any consumer investor.

### The funding sequence (what to actually do)

1. **This week:** cloud/startup credits applications (Tier 0) + start D-U-N-S.
2. **Before July 27:** YC Fall application (even a rejection buys you a written, sharpened pitch).
3. **This month:** book the IRAP advisor call / Innovate UK scoping / SBIR feasibility read — *whichever matches where you incorporate* — and set the monthly grant-application habit.
4. **Phase 2 exit (per Master Plan):** angel conversations open, armed with conversion data.
5. **Phase 3–4:** brand pilots become revenue *and* the Series-seed story. Strategics buy data; investors buy the data business.

---

## Part 3 — Revenue Infrastructure (the "leaks," built as systems)

Each stream from Master Plan §3.2, turned into a checklist with an owner (you) and a trigger.

### 3.1 Affiliate program — build order

**Trigger:** Phase 3 ("Affiliate v1 with living partners").

1. **Sign up (in this order of ease):**
   - **Instacart / Uber Eats** — open affiliate programs via Impact/partner platforms; approve small partners readily. Start here to prove the pipe.
   - **Total Wine** — affiliate program via commission platforms; needs the entity + a live privacy policy.
   - **ReserveBar & Curiada** — smaller, gifting-strong; often direct-partner rather than network. Use the outreach template (5.1) — they say yes to niche apps with intent-rich audiences.
2. **Plumbing:** one internal `affiliateLink(sku, partner, context)` resolver so partners are swappable; UTM/click-ID on every link; a `affiliate_clicks` table (context: post-scan / bottle page / party cart / gift) so you can *show partners their numbers* at renewal.
3. **Disclosure** shipped with v1 (Part 1, Step 3).
4. **Report monthly:** clicks → estimated conversions per partner. This table is also your negotiation leverage for better rates at renewal.

### 3.2 Party carts ($150–300 baskets)

**Trigger:** Hosting Planner live (Phase 3, guest menu work).

- The Hosting Planner already computes the shopping list; the party cart is that list × affiliate deep-links + one "order it all" screen.
- Deal to pitch retailers (template 5.2): *"We hand you a $200+ pre-built basket at the moment of highest intent — someone hosting in 72 hours."* Ask for elevated commission on basket-level orders; Instacart-style partners can quote this.
- Seasonal pushes: December (KŌOPE Wrapped + gifting, per Master Plan), Super Bowl, Derby, Cinco, Halloween, NYE. Pre-build one themed cart per occasion.

### 3.3 Gifting / Want-list registry

**Trigger:** before Q4 2026 (hard deadline in the Master Plan — December is acquisition season).

- Want-list share link = registry; every item carries an affiliate link; the *recipient* of the link is a non-user seeing KŌOPE for the first time (never gate this view).
- Gift-mode scans get a "where to buy for them" row — same affiliate resolver, gift context.

### 3.4 Brand platform (the scale business)

Already specced in Master Plan §4. What Part 4 below adds is *how to sell it*. Pricing discipline: **pilots $3–5k/mo at 5–10k MAU, framed as insight partnerships. Sponsored slots in recommendations = 0, forever — and you say so in the pitch, because it's why their due diligence passes you.**

### 3.5 Bartender drops (supply-side, Phase 4 candidate)

- 3–5 named bartenders, revenue share on drop-driven conversions, `source: bartender` field already planned.
- This is also a *marketing* channel: each bartender promotes their drop to their following. Template 5.4.

---

## Part 4 — Talking to Brands & Closing Deals

**Honesty first: there is no fail-proof close.** What exists is a process where no single "no" can kill you — enough qualified conversations, a pitch that survives due diligence, and follow-up discipline. In practice partnership outreach converts low-single-digit percent cold and 10× that via warm intro. The plan below is built around those numbers, so it doesn't *need* luck.

### 4.1 Who to talk to (in order of receptiveness)

1. **Challenger/craft brands** (regional distilleries, new RTD lines) — starving for data, fast decisions, small checks. Your first 3 pilots come from here.
2. **Brand managers at mid-size portfolios** — own a single brand's budget, can sign a $3–5k/mo pilot without committee.
3. **Distributor trade-marketing teams** (Southern Glazer's, Breakthru, RNDC in the US) — they *sell with data* to retailers; your aisle-moment data is literally their pitch material.
4. **Agencies of record** for spirits brands — one agency intro = many brands.
5. **Retail media teams** (Total Wine etc.) — later; they'll want the affiliate relationship first.

Find them: LinkedIn (title search: "brand manager" + brand name), trade press bylines (Shanken News Daily, The Spirits Business, VinePair), and conferences — **Bar Convent Brooklyn, Tales of the Cocktail, WSWA Access** — where a single trip fills a quarter's pipeline.

### 4.2 What you're selling (say it in this order)

1. **The moment nobody else has:** "Vivino knows ratings. Nielsen knows checkout. We know the 30 seconds *in the aisle* — what got scanned, at what price, what it was compared against, and whether it converted."
2. **The proof:** one redacted sample insight report (the Brand Intelligence Agent drafts these from 2.5k MAU — this is why that agent is on the roadmap). *"Your brand was scanned N times in-store this quarter; 34% → wishlist; #1 alternative considered: X; top cocktail made with it: Y."*
3. **The covenant as the differentiator:** "We never sell placement inside recommendations — which is exactly why our data is clean enough for you to act on."
4. **The ask:** a 3-month pilot, $3–5k/mo, quarterly insight report + one labeled sponsored drop.

### 4.3 The pipeline (run it like the app roadmap — gates, not vibes)

| Stage | Definition | Exit criteria |
|---|---|---|
| 1. List | 50 named humans (not companies) meeting §4.1 | Name, title, email, one personal hook each |
| 2. Contact | Template sent + 2 follow-ups (day 4, day 10), then stop | Reply, or 3 touches done |
| 3. Call | 25 min: 5 discovery / 10 demo (live scan of *their* bottle → Answer Card → the insight sample) / 5 pilot pitch / 5 next step | A named next step with a date |
| 4. Proposal | One-pager: what they get, what it costs, 3-month term, start date | Sent within 24h of the call |
| 5. Close | Follow up day 3, day 8; offer a start date, not a discount | Signed, or a dated "not now" |
| 6. Renew | Month 2 of 3: show the report, propose annual | The real revenue is here |

**Weekly quota that makes it fail-resistant:** 10 new contacts, 5 follow-ups, aim for 2 calls. At realistic cold rates that's ~1–2 pilots per quarter of consistent effort — which at $3–5k/mo is a meaningful business at your stage. Track it in a spreadsheet or free CRM; the metric that predicts revenue is *calls per week*, nothing else.

**Negotiation rules (memorize these five):**
1. Price the *pilot*, never discount the *product* — "the pilot is $4k/mo; the annual is where pricing improves."
2. Silence after the price. Whoever talks first concedes.
3. "We need to think about it" → "Totally — what specifically would you need to see to be a yes?" (surfaces the real objection).
4. Never accept "send me more info" without a booked follow-up date.
5. Every concession trades for something: a case study right, an intro to a sister brand, an annual term.

**Objection cheat-sheet:**
- *"Your audience is too small."* → "5–10k of the most intent-rich spirits buyers alive — every one of them physically in an aisle holding a bottle. Nielsen sells you a rearview mirror; this is the moment before the purchase."
- *"How do I know the data's real?"* → methodology page + covenant + consented-analytics rate (Master Plan integrity metrics — this is why they're KPIs).
- *"We already buy Nielsen/IWSR."* → "Keep them. They tell you what sold. We tell you what *almost* sold and lost to whom — that's the gap your trade spend is guessing at."

---

## Part 5 — Outreach Email Templates

Rules for all of them: under 150 words · one ask · no attachments on first touch · subject lines lowercase and specific · send Tue–Thu mornings recipient-time · follow-up twice (day 4 nudge, day 10 breakup), then stop.

### 5.1 Affiliate partnership (ReserveBar / Curiada / direct retailers)

> **Subject:** high-intent bottle buyers → {Partner} — affiliate partnership
>
> Hi {Name},
>
> I'm the founder of KŌOPE, a spirits app where people point their camera at a bottle and instantly see what it is, whether the price is fair, and what they can make with it.
>
> Every scan ends at a purchase decision — which makes our "buy it" link unusually high-intent traffic: someone literally holding (or wishing for) the bottle. Our gifting registry adds Q4 volume on premium SKUs, {Partner}'s sweet spot.
>
> I'd like to set KŌOPE up as an affiliate partner and route our {bottle page / gift registry / party cart} demand to you. Happy to share our audience and category mix on a 15-minute call — are you free this week or next?
>
> {Your name} — Founder, KŌOPE
> {app store link} · {one-line traction stat}

### 5.2 Party cart / retailer basket deal

> **Subject:** $200 pre-built carts from people hosting this weekend
>
> Hi {Name},
>
> KŌOPE's hosting planner builds a complete shopping list — bottles, mixers, quantities — for anyone throwing a party. We want to hand that list to {Partner} as a one-tap, pre-filled cart.
>
> The customer is someone hosting within 72 hours with an average basket we design to land at $150–300. It's the highest-intent, highest-basket moment in our app, and we'd route it to you exclusively for the pilot.
>
> Worth a 15-minute call to scope commission structure on basket-level orders?
>
> {Your name} — Founder, KŌOPE

### 5.3 Brand pilot (the money email)

> **Subject:** what happened when 4,000 people scanned {Brand} in-store
>
> Hi {Name},
>
> Quick question: when someone stands in the aisle holding {Brand} and doesn't buy it — do you know what they bought instead?
>
> We do. KŌOPE is a spirits-scanning app: users point their camera at bottles in-store and we see the moment of decision — scan, price seen, alternatives compared, whether it converted, and what they made with it at home. Ratings apps see opinions; checkout data sees winners. We see the decision itself.
>
> I've attached nothing — instead, here's one real (aggregated, anonymized) row: *{one genuinely interesting stat about their brand or category from your data}*.
>
> We run 3-month insight pilots with a small number of brands: quarterly report on your brand and category, plus one labeled placement in our weekly drops. 20 minutes to show you the full sample report?
>
> {Your name} — Founder, KŌOPE
> P.S. We never sell placement inside our recommendations — that policy is public, and it's why the data stays clean enough to act on.

### 5.4 Bartender drop partnership

> **Subject:** your signature drink, in {N} home bars next Friday
>
> Hi {Name},
>
> I run KŌOPE — a spirits app where {N} home bartenders get one featured drop each week and make it that weekend. Users tell us who they trust: working bartenders, not brands.
>
> I'd love to feature a {Name} drop — your recipe, your name and bar on the card, your story in the write-up, revenue share on any bottle sales it drives, and a link to wherever you want traffic sent.
>
> It's about 30 minutes of your time for the recipe and a few photos. Interested?
>
> {Your name} — Founder, KŌOPE

### 5.5 Follow-ups (universal)

> **Day 4 — Subject:** re: {original}
> Hi {Name} — floating this up. The short version: {one-sentence restatement of the value}. Worth 15 minutes? {Two specific time slots.}

> **Day 10 — the breakup:**
> Hi {Name} — I'll assume the timing's off and close the loop. If {the pain — e.g., aisle-level data on {Brand}} becomes a priority, I'm easy to find. Either way — {genuine one-line compliment about their brand}.

*(The breakup email routinely gets the highest reply rate of the three. Send it.)*

### 5.6 Warm-intro request (use before any cold email when possible)

> **Subject:** intro to {Name} at {Company}?
> Hi {Mutual} — I'm trying to reach {Name} ({title}, {Company}) about {one line}. Would you be comfortable forwarding this? Forwardable blurb below — feel free to edit or say no!
> ---
> {3-sentence version of the relevant template above}

---

## Part 6 — The 90-Day Sequence (everything above, ordered)

**Days 1–14 — Entity + free money**
☐ Incorporate (Part 1 decision tree) ☐ EIN/BN → bank account ☐ D-U-N-S started ☐ Cloud/startup credit applications ☐ Trademark search + filing ☐ IP assignment signed

**Days 1–25 — YC window**
☐ YC Fall 2026 application (deadline **July 27**) — write it around the Master Plan §1 thesis; the writing is valuable even if the answer is no

**Days 15–45 — Compliance + plumbing (parallel with Phase 0/1 build)**
☐ Affiliate disclosure page ☐ Privacy policy updated with aggregate-only data covenant ☐ `affiliateLink()` resolver + click tracking designed ☐ Grant lane picked (IRAP / Innovate UK / SBIR) and first call booked ☐ Techstars application if YC passes (Aug 15)

**Days 45–90 — Pipeline zero**
☐ 50-person outreach list built (§4.1) ☐ Instacart/Uber Eats affiliate approved ☐ First 10 affiliate/retailer emails out (templates 5.1–5.2) ☐ One redacted sample insight report mocked up (even from small data — it's the sales asset) ☐ Bartender shortlist of 5 for Phase 4

Brand-pilot outreach (5.3) waits for its Master Plan gate (~2.5k MAU, Brand Intelligence Agent drafting real numbers) — sending it early with weak data burns names you'll want later. Everything else starts now.

---

*Sources for funding data: [YC application terms & deadlines](https://www.ycombinator.com/apply), [accelerator deadline roundup, June 2026](https://startupcorners.com/digest/accelerator-deadlines-digest-2026-W25), [top accelerators 2026](https://www.peony.ink/blog/top-20-startup-accelerators-worldwide), [non-dilutive funding guide 2026](https://waveup.com/blog/non-dilutive-funding/), [tech startup grants 2026](https://creditforstartups.com/resources/tech-startup-grants), [non-dilutive funding database](https://www.thevccorner.com/p/non-dilutive-funding-sources-startups-database). Program terms change — verify each before applying.*
