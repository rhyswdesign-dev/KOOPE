# KOOPE Growth Roadmap & Financial Outlook by MAU

> ⚠️ **SUPERSEDED (July 2026).** The financial projections in this document use a 15% MAU→paid conversion assumption and sponsorship rates that do not survive diligence, and reference Drizly (shut down March 2024). The canonical strategy, corrected financial model, tier structure, and pricing now live in **[KOOPE-PRODUCT-BIBLE.md](KOOPE-PRODUCT-BIBLE.md)** (Parts II–III). Do not pitch, plan, or model from the numbers below. Kept for historical reference only.

**Last updated:** 2026-04-01
**Status:** ~~v1 scope locked. App built. Launching April 2026.~~ **Superseded by the Product Bible.**

---

## Where We Are Now (April 2026)

The app is complete. All scanning layers, Pro features, Vault, Hosting Planner, Cellar Mode, For You Feed, weekly drops, lessons, and certifications are shipped. RevenueCat is integrated but not activated (pending payment go-live). Push notifications are wired — one `.env` line away from working in production.

**Already live at launch:**
- Barcode → OCR → Visual AI → manual fallback (4-layer scan stack)
- 3-tier system: FREE / PLUS ($6.99/mo or $59/yr) / PRO ($12.99/mo or $99/yr)
- My Bar, Cellar Mode, Hosting Planner, Batch Calculator, Guest Menu
- Vault with XP economy, weekly drops (content through July 2026)
- Lessons, certifications, taste profile, For You Feed
- Scan history, bottle journal, share cards
- Mixpanel analytics wired

**Not yet active:**
- RevenueCat (activate when payments go live)
- Push notifications in TestFlight (needs `EXPO_PUBLIC_EAS_PROJECT_ID`)
- Brand partnerships (needs 5k MAU)

---

## Quick Reference

| MAU | Timeline | Annual Revenue | Key Unlock | Team | Monthly Profit |
|-----|----------|----------------|------------|------|----------------|
| 300 | Month 1–2 | $2,800 | Founders pricing ends | 1 founder | -$1,000 |
| 500 | Month 3–4 | $6,200 | Affiliate partnerships | 1 founder | -$500 |
| 1,000 | Month 5–7 | $15,800 | Breakeven | 1 + agent stack | $0 |
| 2,500 | Month 8–10 | $47,500 | Database value builds | 2–3 | +$2,000 |
| **5,000** | **Month 11–13** | **$133,500** | **Brand partnerships begin** | 3–4 | **+$8,000** |
| **10,000** | **Month 14–18** | **$1,023,000** | **Multi-category sponsorships** | 5–6 | **+$53,000** |
| **15,000** | **Month 19–24** | **$1,872,500** | **Insights as standalone product** | 8–10 | **+$96,000** |
| **25,000** | **Month 25–36** | **$3,051,500** | **Global expansion / acquisition-ready** | 12–15 | **+$151,000** |

---

## Detailed Breakdown by Stage

### 300 MAU — Month 1–2: Launch Validation

**Users:** 255 free, 45 paying (15% conversion)
**Paying:** 30 KOOPE+ Founders ($29), 15 Pro Founders ($79)

**Revenue:**
- Subscriptions: $2,205/year ($184/mo)
- Affiliate: $600–1,200/year ($50–100/mo)
- **Total: ~$2,800–3,400/year**

**Costs:** $1,260/year ($105/mo)

| Line item | Monthly |
|-----------|---------|
| Supabase Pro | $25 |
| Expo EAS Production | $29 |
| Apple Developer Program | $8 |
| Google Cloud Vision API (low scan volume) | $15 |
| Domain + transactional email (Resend) | $10 |
| Mixpanel | $0 (free tier) |
| RevenueCat | $0 (free <$2.5k MRR) |
| Misc (TestFlight, tools) | $18 |
| **Total** | **~$105/mo** |

**Focus:**
- Trial conversion holding at 35%+
- Founders pricing active — ends at user #300
- Watch crash rates and scan success in Mixpanel
- Don't pitch brands yet — sample size is meaningless

**Already shipped that helps here:** Full scan stack, recipe suggestions, tier gating all working at launch.

---

### 500 MAU — Month 3–4: Product-Market Fit Signal

**Users:** 425 free, 75 paying (15%)

**Revenue:**
- Subscriptions: $4,425/year
- Affiliate: $1,800–3,000/year
- **Total: ~$6,200–7,400/year**

**Costs:** $1,500/year ($125/mo)

| Line item | Monthly |
|-----------|---------|
| Supabase Pro | $25 |
| Expo EAS Production | $29 |
| Apple Developer Program | $8 |
| Google Cloud Vision API (growing scan volume) | $25 |
| Domain + transactional email | $10 |
| Mixpanel | $0 (free tier) |
| RevenueCat | $0 (free <$2.5k MRR) |
| Misc | $28 |
| **Total** | **~$125/mo** |

**What changes:**
- Affiliate partnerships formalised (spirits delivery, barware)
- Begin tracking 90-day retention — need 40%+
- Database crosses 5,000 scanned bottles (brand data starts to mean something)

**Don't do yet:**
- Featured placement (audience too small)
- Hire full-time (not enough revenue)

---

### 1,000 MAU — Month 5–7: Breakeven

**Users:** 850 free, 150 paying (15%)

**Revenue:**
- Subscriptions: $11,025/year
- Affiliate: $4,800–7,200/year
- **Total: ~$15,800–18,200/year**

**Costs:** $6,000/year ($500/mo)

| Line item | Monthly |
|-----------|---------|
| Supabase Pro | $25 |
| Expo EAS Production | $29 |
| Apple Developer Program | $8 |
| Google Cloud Vision API (1k MAU scan volume) | $60 |
| Mixpanel Growth | $25 |
| RevenueCat | $0 (free <$2.5k MRR) |
| Claude API — Support Agent | $50 |
| Transactional email + domain | $20 |
| Part-time bounties / bug fixes | $233 |
| Misc (tools, storage) | $50 |
| **Total** | **~$500/mo** |

**BREAKEVEN**

**What changes:**
- Brand capture firing for all tiers (scan data accumulating)
- Database: 15,000+ bottles
- 1,000+ brand captures/month — data collection starts to matter
- Deploy first agent: **Support Agent** (handles L1 tickets, deflects ~75% of volume)

**Key metric to watch:** Pro adoption — needs to be 10%+ of paid users

---

### 2,500 MAU — Month 8–10: Momentum

**Users:** 2,125 free, 375 paying (15%)

**Revenue:**
- Subscriptions: $33,150/year
- Affiliate: $14,400–21,600/year
- **Total: ~$47,500–54,700/year**

**Costs:** $25,000/year ($2,083/mo)

| Line item | Monthly |
|-----------|---------|
| Supabase Pro | $25 |
| Expo EAS | $29 |
| Apple Developer | $8 |
| Google Cloud Vision API (2.5k MAU volume) | $100 |
| Mixpanel Growth | $25 |
| RevenueCat (~1% of ~$2,762 MRR) | $28 |
| Claude API — Support + Brand Intelligence agents | $150 |
| Part-time contractor (dev/support, ~20hrs/mo) | $1,000 |
| Email marketing + CRM tools | $100 |
| Growth / marketing spend | $400 |
| Misc | $218 |
| **Total** | **~$2,083/mo** |

**What changes:**
- Database: 25,000+ bottles — entering real value territory
- 2,500+ brand captures/month
- Begin drafting brand reports internally — don't sell yet
- Start brand outreach conversations (plant seeds for 5k)
- Deploy **Brand Intelligence Agent** to pull weekly scan data and draft outreach decks

**Prepare for:** Featured placement launch at 5k MAU

---

### 5,000 MAU — Month 11–13: 🔑 Brand Partnerships Begin

**Users:** 4,250 free, 750 paying (15%)

**Revenue:**
- Subscriptions: $73,500/year
- Affiliate: $30,000–42,000/year
- **Featured Placement: $30,000/year** (1 brand × $2,500/mo)
- **Total: ~$133,500–145,500/year**

**Costs:** $40,000/year ($3,333/mo — 3–4 people)

| Line item | Monthly |
|-----------|---------|
| Infrastructure (Supabase, EAS, Vision API, scaled) | $350 |
| Apple Developer | $8 |
| RevenueCat (~1% of ~$6,125 MRR) | $61 |
| Claude API — all agents | $200 |
| Brand Partnerships Lead (part-time contractor) | $2,000 |
| CRM + outreach tools (HubSpot starter, Apollo) | $200 |
| Email marketing | $50 |
| Mixpanel Growth | $25 |
| Legal (contracts, first brand deal review) | $200 |
| Misc / growth | $239 |
| **Total** | **~$3,333/mo** |

**Monthly profit: ~$8,000**

**THIS IS THE CRITICAL UNLOCK**

**What to launch:**
1. Featured placement UI in app
2. Close first deal: $2,500/mo (Tanqueray, Bulleit, Casamigos, or similar)
3. Hire Brand Partnerships Lead (human — relationship-driven role, can't be fully agented)
4. Automated monthly brand reports (agent-generated)
5. Database: 35,000 bottles

**Brand strategy:**
- Month 11: Close first brand ($2,500/mo)
- Month 12: Add second brand, different category ($3,500/mo)
- Month 13: Raise pricing to $5,000/mo for new deals

**Key milestone:** First brand check clears = business model proven

---

### 10,000 MAU — Month 14–18: 🚀 Multi-Category

**Users:** 8,500 free, 1,500 paying (15%)

**Revenue:**
- Subscriptions: $147,000/year
- Affiliate: $60,000–84,000/year
- Multi-Category Sponsorships: $720,000/year ($60,000/mo)
- Vault Sponsorships: $60,000/year ($5,000/mo)
- Challenge Sponsorships: $36,000/year ($3,000/mo)
- **Total: ~$1,023,000/year**

**Costs:** $392,000/year ($32,667/mo — 5–6 people)

| Line item | Monthly |
|-----------|---------|
| Infrastructure (Supabase, Vision API, EAS, CDN) | $2,000 |
| RevenueCat (~1% of ~$12,250 MRR) | $123 |
| Claude API — all agents at scale | $500 |
| Brand Partnerships Lead (FTE) | $10,000 |
| Developer (FTE) | $9,000 |
| Customer Success (contractor) | $4,500 |
| Founder salary (modest) | $5,000 |
| CRM + sales tools | $500 |
| Mixpanel + analytics stack | $200 |
| Legal (ongoing brand contracts) | $500 |
| Marketing / growth | $1,344 |
| **Total** | **~$32,667/mo** |

**Monthly profit: ~$53,000**

**BRAND REVENUE OVERTAKES SUBSCRIPTIONS**

**What to launch:**
1. Multi-category rotation (4 brands/month, different categories)
2. Upgrade Brand Partnerships Lead to FTE
3. Sponsored Vault drops (1–2/month at $5k each)
4. Sponsored challenges (1/month at $3k)
5. Database: 50,000 bottles

---

### 15,000 MAU — Month 19–24: 📊 Insights as Standalone Product

**Revenue: ~$1,872,500/year**
**Costs:** $720,000/year ($60,000/mo — 8–10 people)

| Line item | Monthly |
|-----------|---------|
| Infrastructure (Supabase, scaled Vision API, CDN) | $3,000 |
| RevenueCat (~1% of ~$18,375 MRR) | $184 |
| Claude API — all agents (reduced with on-device AI) | $300 |
| PDF report generation (Docmosis or Puppeteer infra) | $200 |
| Brand Partnerships Lead (FTE) | $12,000 |
| Developer (FTE) | $9,000 |
| Second Developer / contractor | $5,000 |
| Customer Success (FTE) | $5,000 |
| Data Analyst (FTE) | $7,000 |
| Content Creator (contractor) | $5,000 |
| Founder salary | $10,000 |
| CRM + sales + analytics tools | $1,000 |
| Legal / compliance | $1,316 |
| Misc | $1,000 |
| **Total** | **~$60,000/mo** |

**Monthly profit: ~$96,000**

**What to launch:**
1. Quarterly insights as standalone product ($10k/quarter per brand)
2. Close 3–5 insights-only deals (no placement required)
3. Automated quarterly reports (agent-generated)
4. On-device visual AI deployed (reduces API costs near zero)
5. Database: 75,000 bottles

---

### 25,000 MAU — Month 25–36: 🌍 Global / Acquisition-Ready

**Revenue: ~$3,051,500/year**
**Costs:** $1,236,000/year ($103,000/mo — 12–15 people)

| Line item | Monthly |
|-----------|---------|
| Infrastructure (global CDN, Supabase scaled, on-device AI) | $5,000 |
| RevenueCat (~1% of ~$30,625 MRR) | $306 |
| Claude API — agents (mostly replaced by on-device AI) | $200 |
| Brand Partnerships Lead (FTE) | $12,000 |
| Brand Partnerships Manager (FTE) | $8,000 |
| Developer × 2 (FTE) | $18,000 |
| Customer Success × 2 (FTE) | $10,000 |
| Data Analyst (FTE) | $7,000 |
| Content Creator (FTE) | $5,500 |
| Marketing Manager (FTE) | $8,000 |
| Founder salary | $12,000 |
| CRM + sales + analytics + reporting stack | $2,000 |
| Legal / international compliance | $5,000 |
| Misc / G&A | $9,994 |
| **Total** | **~$103,000/mo** |

**Monthly profit: ~$151,000**

**Acquisition readiness:**
- $3M ARR
- 60%+ margins
- Growth: 50%+ YoY
- Valuation: $15–36M (5–12× revenue)
- Decision: continue scaling to $6M+ or take the exit

---

## When to Hire — with AI Agent Coverage

The agent stack lets KOOPE run lean. Most roles can be partially or fully covered by agents until the revenue justifies a human. The table below shows what an agent handles, what requires a human, and when to make the call.

| Role | MAU Threshold | What an Agent Handles | What Requires a Human | Est. Cost |
|------|--------------|-----------------------|-----------------------|-----------|
| **Support** | Launch | L1 tickets (FAQs, billing, how-to), churn detection alerts, onboarding nudges, crash triage routing — ~75% deflection | Edge cases, app store reviews, angry users, escalations | Agent: ~$50/mo |
| **First contractor (Dev)** | 1,000 | PR review summaries, test generation, regression flagging, documentation drafts | Feature work, architecture decisions, real bugs | $3k/mo |
| **Brand Intelligence** | 2,500 | Weekly scan data pulls, brand report drafts, outreach email personalisation, pitch deck data population, competitive scans | Relationship building, deal negotiation, closing | Agent: ~$100/mo |
| **Brand Partnerships Lead** | 5,000 | Agent handles data and decks — human closes deals | Calls, demos, contract negotiation, partnerships | $5–7k/mo |
| **Customer Success** | 7,500 | 80% of ticket volume, re-engagement campaigns, NPS collection, subscription save flows | Complex complaints, refunds, high-value user retention | Agent: ~$100/mo |
| **Developer (FTE)** | 10,000 | PR review, test suites, code documentation, bug investigation briefs | Product velocity, architecture, new features | $8–10k/mo |
| **Data Analyst** | 15,000 | Weekly cohort reports, monthly brand dashboards, quarterly insights packages, anomaly detection | Interpreting unexpected signals, brand calls, strategy | Agent: ~$200/mo until 15k |
| **Content Creator** | 15,000 | Weekly drop copy, Vault item descriptions, push notification copy, social captions, A/B test variants | Brand voice decisions, campaign strategy, creative direction | Agent: ~$50/mo |

---

## Agent Stack by Stage

### Launch → 1,000 MAU: Support Agent

**What it replaces:** A part-time support hire. Deflects ~75% of ticket volume.

**Triggers:**
- New app store review posted (poll App Store Connect API or scrape daily)
- In-app feedback form submission (webhook from Supabase `feedback` table)
- Crash rate spike detected (Mixpanel event threshold)

**What it does:**
1. Classifies each input: FAQ / bug report / billing / feature request / churn signal
2. For FAQs: generates a reply using a pre-approved answer bank + KOOPE feature context
3. For bugs: creates a GitHub issue with device info, OS, tier, and reproduction steps extracted from the report
4. For churn signals (cancellation, complaint, low NPS): flags for human follow-up with a drafted save offer
5. Weekly: sends a Slack/email digest — top 5 issues, sentiment score, scan complaints, tier distribution of complainers

**Build spec:**
```
Stack: Claude claude-sonnet-4-6 + Supabase + GitHub API + cron (daily)
Input: feedback rows from Supabase, App Store review RSS
System prompt: KOOPE feature list, tier breakdown, common issue templates
Output: reply drafts → Supabase `support_responses` table | GitHub issues | weekly digest email
Est. cost: ~$30–60/mo at launch volume
```

**Key prompt pattern:** Feed the agent the full tier feature list from `tierAccess.ts` so it can answer "why can't I do X" questions without hallucinating features.

---

### 1,000 → 5,000 MAU: Brand Intelligence Agent

**What it replaces:** A contractor doing manual outreach prep. Runs fully automated.

**Triggers:** Weekly cron (Monday morning, so the founder has data before any brand calls that week)

**What it does:**
1. Queries Supabase: top 20 scanned brands by week, grouped by spirit category, with scan velocity delta vs prior week
2. Flags "opportunity brands": high scan frequency + no current partnership + brand in a sellable category (gin, bourbon, tequila, rum, amaro)
3. For each flagged brand, generates a one-page data brief: scan rank, category rank, week-over-week trend, user tier breakdown (are Pro users scanning them?), estimated monthly scan impressions
4. Drafts a cold outreach email personalised to each brand's data footprint: "Your brand appeared in X scans this month, ranking #Y in the bourbon category among users who describe themselves as home entertainers..."
5. Outputs a pipeline digest to Slack: ranked list of opportunity brands with brief link + draft email link

**Build spec:**
```
Stack: Claude claude-sonnet-4-6 + Supabase (scan_events, brand_captures tables) + cron
Input: SQL query results → JSON → agent context
Output: Notion/Google Doc per brand brief | draft emails in Supabase `outreach_drafts` table | Slack digest
Est. cost: ~$80–120/mo
```

**Key prompt pattern:** Give the agent a "brand persona template" — what a spirits brand marketing manager cares about (reach, demographics, purchase intent signal, competitive context). The agent writes to that reader, not to a generic audience.

---

### 5,000 → 15,000 MAU: Data Analyst Agent

**What it replaces:** A full-time data analyst hire (saves $6–8k/mo until 20k+ MAU).

**Triggers:**
- Weekly: cohort health report (Mondays)
- Monthly: retention curves + tier mix analysis (1st of month)
- Quarterly: brand insight packages (January, April, July, October)
- On-demand: anomaly alert if conversion rate drops >15% week-over-week

**What it does:**

*Weekly:*
- Pulls cohort data from Supabase: new users, activations (first scan), Day 7 retention, Day 30 retention by tier
- Flags anything outside normal range with a plain-English explanation
- Sends a one-paragraph summary to Slack with a link to the full data

*Monthly:*
- Retention curves by acquisition cohort
- Tier mix shift (are free users converting to paid at the expected rate?)
- Scan success rate by layer (barcode vs OCR vs visual)
- Top-scanned bottles gaining velocity (potential Vault drop candidates)

*Quarterly (for brands):*
- Pulls all scan data for that brand's bottles for the quarter
- Computes: scan volume, user demographics (self-reported), scan context (before purchase vs at home), repeat scan rate, correlation with recipe saves
- Generates a structured JSON report → feeds a PDF template (Puppeteer or Docmosis)
- Human reviews PDF, adds cover letter, sends to brand contact

**Build spec:**
```
Stack: Claude claude-opus-4-6 (for quarterly reports) / claude-sonnet-4-6 (weekly) + Supabase + PDF generator + cron
Input: Supabase analytics queries → structured JSON
Output: Slack digests | Supabase `analytics_snapshots` table | PDF brand reports
Est. cost: ~$150–250/mo
```

**Key prompt pattern:** For brand reports, give the agent a strict output schema (JSON) and render it separately. Don't ask the agent to write the final PDF prose — ask it to populate a structured object, then feed that into a template. This keeps reports consistent and reviewable.

---

### 15,000+ MAU: Content Agent

**What it replaces:** A content creator hire ($4–6k/mo). Handles Vault drops, push copy, and social captions.

**Triggers:**
- Weekly: new Vault drop copy (Thursday, for Sunday drop)
- On-demand: push notification drafts when a campaign is planned
- On-demand: social caption variants when content is approved

**What it does:**
1. Reads the upcoming drop config from `weeklyForYouDrops` (recipe ID, spirit, flavour profile, unlock theme)
2. Pulls the recipe card data (ingredients, technique, garnish, story)
3. Generates: drop teaser copy (push notification, 60 chars), Vault card headline (12 words), Vault card body (40 words), 3 social caption variants (Instagram, Twitter/X lengths)
4. Pulls the top taste profiles of users scheduled to receive this drop — personalises the "why you'll love this" angle if the drop is targeted
5. Outputs all variants to a `content_drafts` table — human picks one variant per slot, approves, publishes

**Build spec:**
```
Stack: Claude claude-sonnet-4-6 + Supabase (weeklyDrops, tasteProfiles tables) + cron + editorial review step (Notion or simple web UI)
Input: drop config JSON + recipe data + taste profile aggregates
Output: `content_drafts` table rows with status `pending_review`
Est. cost: ~$40–80/mo
```

**Key prompt pattern:** Give the agent the brand voice guide as a system prompt constant. Include 5 examples of approved copy (good and bad). This is what prevents generic AI aesthetics — the examples do more work than any description.

---

## Agent Architecture: Common Patterns

All four agents share the same underlying pattern. Build them once as a template, then fork.

```
1. Trigger (cron / webhook / threshold alert)
2. Data pull (Supabase query → structured JSON)
3. Claude API call (system prompt = KOOPE context + role + output schema)
4. Output routing (Supabase table / Slack / GitHub / PDF pipeline)
5. Human review gate (optional — required for outbound brand comms, optional for internal digests)
```

**Shared infrastructure to build once:**
- A `agent_runs` table in Supabase: `id, agent_name, triggered_at, status, input_summary, output_summary, cost_usd`
- A cost tracking wrapper around each Claude API call (log `input_tokens + output_tokens × model_rate`)
- A Slack webhook for all agent digests (one channel: `#agent-output`)
- An `.env` variable: `KOOPE_AGENT_ENV=production|staging` so agents don't fire outbound in dev

**Model selection guide:**
- Haiku (`claude-haiku-4-5`): classification, tagging, short replies — <$10/mo
- Sonnet (`claude-sonnet-4-6`): weekly reports, outreach drafts, content copy — most agents
- Opus (`claude-opus-4-6`): quarterly brand insight reports only — slower and more expensive, but the output quality justifies it when a brand is paying $10k/quarter for the report

---

## Critical Path

**Everything hinges on 5,000 MAU.**

Before 5k MAU — agents do the heavy lifting on support and brand research, keeping headcount at 1–2. Focus entirely on retention and growth.

After 5k MAU — the business model flips. Brand revenue starts compounding. The agent stack handles reporting and content; the human team closes deals and builds relationships.

**The lean version of this company runs on 3 humans and an agent stack until 10,000 MAU.**

---

## Growth Scenarios

### Conservative
Apr 2026 → 300 MAU · Jun 2026 → 500 MAU · Sep 2026 → 1,000 MAU · Dec 2026 → 2,500 MAU · **Mar 2027 → 5,000 MAU (brands start)** · Sep 2027 → 10,000 MAU · Mar 2028 → 15,000 MAU · Mar 2029 → 25,000 MAU

### Aggressive (viral / press moment)
Apr 2026 → 1,000 MAU · Jun 2026 → 2,500 MAU · **Sep 2026 → 5,000 MAU (brands start)** · Feb 2027 → 10,000 MAU · Aug 2027 → 15,000 MAU · Apr 2028 → 25,000 MAU

---

## Critical Success Metrics by Stage

| MAU | Must-Have |
|-----|-----------|
| 300 | Trial conversion 35%+, scan success 90%+ |
| 1,000 | Pro adoption 10%+ of paid, 90-day retention 40%+ |
| 2,500 | 2,500+ brand captures/month, database 25k bottles |
| **5,000** | **Close first brand deal, database 35k+, brand captures 3k+/mo** |
| 10,000 | $60k/mo brand revenue sustained 3+ months, 4+ active brands |
| 15,000 | 5+ insights customers, statistical significance on brand data |
| 25,000 | 25+ brand partners, 60%+ margins, acquisition-ready metrics |
