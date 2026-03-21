# KOOPE Tier Feature Matrix (Scanner / Bar Builder / Craft Identity)

Date: 2026-03-20
Scope: Current app code mapped against the revised tier model.

## Locked Decisions

- Free inventory stays at `10` items, not `5`.
- Free includes `9` standard unlocked recipes.
- After scanning a bottle/item, Free should show relevant recipe options from the free-access pool:
  up to `3` matches from the base 9 and any additional recipes already unlocked by XP or other unlock systems.
- Scanning should be full smart scan for all tiers.
- Plus remains the "Bar Builder" tier.
- Pro remains the "Craft Identity" tier.

## Status Legend

| Status | Meaning |
|---|---|
| Exists | Implemented and roughly aligned with the revised tier model |
| Partial | Implemented, but incomplete, not fully wired, or mismatched in UX |
| Missing | Not meaningfully implemented yet |
| Wrong Tier | Exists, but entitlement or positioning should move |

## Feature Matrix

| Tier | Feature | Current Status | What Exists Today | Gap vs Revised Model | Recommended Build Order |
|---|---|---:|---|---|---:|
| Free | Full smart scan | Partial | Smart scan screen and scanner config present for all tiers in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/SmartScanScreen.tsx` and `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/scannerAccess.ts` | Messaging is inconsistent because `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/inventoryService.ts` still documents Free as barcode/manual only | Wave 1 |
| Free | 10-item inventory cap | Exists | Free cap is already `10` in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts` and enforced in Home Bar/manual add flows | No product change needed; copy should reflect "10-item inventory" consistently | Wave 1 |
| Free | 9 standard unlocked recipes | Exists | Free currently exposes a fixed starter recipe set in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts` | Count and messaging should be reframed explicitly as the 9 Free recipes, not a vague "limited classics" concept | Wave 1 |
| Free | Scan result shows up to 3 relevant recipe options from Free-access pool | Missing | Bottle detail and recipe surfaces exist, but there is no scan-specific "up to 3 relevant options from currently unlocked free pool" rule wired in | This is now the core Free wedge and should be a first-class post-scan UX rule | Wave 1 |
| Free | Basic spirit profile | Partial | Scanned bottle detail exists in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/BottleDetailScreen.tsx` | Needs a cleaner guarantee that every scan returns the expected "what it is / how it's made / flavor notes" package | Wave 2 |
| Free | XP and early progression visibility | Exists | XP, level, streak, and affordability surfaces are live in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/ProfileScreen.tsx` and `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/store/useXPSystem.ts` | Align copy with "show the system exists" rather than implying full mastery depth | Wave 2 |
| Free | Save favorites | Wrong Tier | Free users can currently save up to 5 cocktails in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/hooks/useSavedItems.ts` | Revised model wants unlimited saves in Plus; Free save allowance needs a deliberate decision and consistent config | Wave 2 |
| Free | Recipe access model based on 9 free recipes plus unlocked extras | Wrong Tier | Current config emphasizes fixed classic access in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts`; XP unlocks also exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` | Needs to be expressed as: 9 base free recipes + any recipes unlocked by XP/engagement, with scan suggestions drawn from that pool | Wave 1 |
| Plus | Unlimited inventory / home bar | Exists | Plus has unlimited inventory in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts` and active gating flows | Mostly copy/QA work | Wave 1 |
| Plus | Full recipe library per bottle | Partial | Plus has broad recipe access in config and Discover; unlock systems already work | The "per bottle full library" behavior is not clearly modeled as a scan-to-library rule | Wave 2 |
| Plus | Advanced filters | Exists | Advanced filter gating and entry points already exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/featureRegistry.ts` and `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` | Needs product copy cleanup to match new tier language | Wave 2 |
| Plus | Unlimited favorites | Exists | Paid users are effectively unlimited in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/hooks/useSavedItems.ts` | Config and hook should stop disagreeing about Free save counts | Wave 2 |
| Plus | Bar health score | Exists | Live screen and gate exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/InventoryInsightsScreen.tsx` | Could use stronger explanation and upgrade teaser moments | Wave 2 |
| Plus | Optimize My Bar | Partial | Core service exists in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/optimizeMyBarService.ts` | No live screen appears to use the report; this is the most important Plus feature to wire into product | Wave 1 |
| Plus | Expiry alerts | Exists | Live screen and gate exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/InventoryInsightsScreen.tsx` | "Low stock alerts" are still missing as a companion signal | Wave 2 |
| Plus | Low stock alerts | Missing | No meaningful low-stock tracking surfaced in current UX | Needed to complete the "run your bar through the app" promise | Wave 3 |
| Plus | Tasting notes and personal ratings per bottle | Partial | Completion notes/ratings and brand capture exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/lib/completions/brandCapture.ts` | Current implementation is recipe-completion-centric, not clearly bottle-centric | Wave 3 |
| Plus | Basic hosting tools (1-4 guests) | Exists | Hosting screen and scaling logic are live in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/HostingScreen.tsx` and `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/batchCalculatorService.ts` | Needs tighter positioning around 1-4 guests and shopping export/scaling value | Wave 2 |
| Plus | Shopping list export | Partial | Shopping list flows exist, but export/share positioning is not very explicit | Needs a clearer Plus moment and export UX | Wave 3 |
| Plus | Full XP progression | Wrong Tier | XP/level dashboard is broadly visible already in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/ProfileScreen.tsx`, while some lesson/mastery depth is Pro-gated | Revised model wants full progression in Plus, with Pro adding multiplier/prestige/certifications | Wave 2 |
| Pro | Full predictive engine and Taste Graph | Partial | Real services exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/predictiveEngine.ts` and `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/tasteGraphService.ts` | The actual Discover "For You" feed still uses simpler personalization helpers in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` | Wave 1 |
| Pro | Weekly "For You" drops | Missing | No weekly predicted-drop product surface found | Needed for recurring Pro identity/retention | Wave 4 |
| Pro | Flavor sliders | Partial | Gates and copy exist, but not a real slider dashboard experience | Needs an actual control surface backed by Taste Graph overrides | Wave 3 |
| Pro | Occasion-based preferences | Missing | Hosting and mood systems exist separately, but not persistent occasion profiles | Should extend predictive context for hosting vs casual vs adventurous modes | Wave 4 |
| Pro | Brand capture / favorite-brand intelligence | Partial | Brand capture exists today in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/lib/completions/brandCapture.ts` | Revised model wants richer Pro brand tracking, alternatives, and upgrade suggestions | Wave 3 |
| Pro | Vault / master recipes | Partial | Vault exists and has tiered content in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/vault/VaultScreen.tsx` | Needs repositioning toward canonical/master specs and rotating elite drops | Wave 4 |
| Pro | Advanced hosting (5+ guests) | Partial | Feature gates and a hosting screen exist; Pro gates for 5+ guests are wired | The deeper planner service in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/hostingPlannerService.ts` does not appear fully wired into the live hosting UX | Wave 2 |
| Pro | Batch optimizer | Partial | Core service exists in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/batchCalculatorService.ts` | Needs stronger integration into advanced hosting flows | Wave 2 |
| Pro | Guest menus | Partial | Service-level concept exists in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/hostingPlannerService.ts` | No obvious polished guest-menu output surface found | Wave 3 |
| Pro | Prep timeline generator | Partial | Timeline generation exists in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/hostingPlannerService.ts` | Needs live UI and shareable output | Wave 3 |
| Pro | Cellar mode | Missing | No meaningful bottle valuation / purchase price / drinking window feature found | This is net-new Pro differentiation | Wave 5 |
| Pro | Certifications | Missing | Pro lessons are gated, but certification product surfaces are not meaningfully shipped | High-value identity layer still missing | Wave 4 |
| Pro | XP multiplier / prestige acceleration | Missing | XP system exists, but no real Pro multiplier behavior surfaced | Needed to complete the Pro identity loop | Wave 4 |
| Pro | Early access / beta drops | Partial | Vault Pro drop gating exists in feature registry and vault flows | Needs explicit user-facing early-access mechanics, not just content locks | Wave 4 |

## Biggest Product Truths From The Matrix

1. The revised strategy is already closest to the existing code in three areas:
   `Free smart scan`, `Plus inventory intelligence`, and `Pro predictive intelligence`.
2. The biggest Plus gap is not invention, it is wiring:
   `Optimize My Bar` exists as service logic but is not clearly live in UX.
3. The biggest Pro gap is the same pattern:
   the predictive and hosting-planner engines exist, but the shipping surfaces still feel simpler than the tier promise.
4. The biggest Free gap is post-scan payoff:
   the scan needs to turn into a tight, obvious "here are up to 3 things you can make from your free-access recipe pool" moment.

## Implementation Waves

### Wave 1: Re-baseline the Core Tier Contract

Goal: make the app behavior match the revised strategy at the highest-leverage moments.

- Normalize scanning everywhere to full smart scan for all tiers.
- Update scan-related docs, comments, and entitlement copy to remove the old Free barcode/manual framing.
- Keep Free inventory at `10`.
- Formalize the Free recipe model as:
  `9 standard free recipes + unlocked extras`.
- Add post-scan recipe suggestions:
  after a bottle/item scan, show up to 3 relevant recipes from the user's current accessible pool.
- Wire `Optimize My Bar` into a live Plus surface.
- Replace the current Pro "For You" feed logic with the real predictive engine pipeline.

Definition of done:

- No source file contradicts the "full smart scan for all tiers" rule.
- A Free user can scan, land on bottle detail, and see up to 3 relevant accessible recipes.
- Plus users can open a real `Optimize My Bar` view backed by report data.
- Pro users get recommendations generated by the predictive engine, not only lightweight personalization helpers.

### Wave 2: Strengthen the Plus Habit Loop

Goal: make KOOPE+ feel like the bar-management tier, not just a bigger free plan.

- Clean up save-limit and progression entitlement inconsistencies.
- Make Plus explicitly own full progression surfaces.
- Tighten bar health, expiry, and hosting-basic copy and upgrade cues.
- Wire advanced hosting boundaries clearly:
  Plus owns 1-4 guests, Pro owns 5+ guests.
- Improve bottle detail and recipe detail surfaces so "full recipe library per bottle" feels real.

Definition of done:

- No tier config disagrees with hook behavior for saves/progression.
- Plus surfaces clearly reinforce inventory, organization, and optimization.
- Upgrade triggers from Free to Plus align to the new strategy moments.

### Wave 3: Turn Partial Pro Features Into Product

Goal: ship the first complete version of the Pro identity layer.

- Build the real flavor-slider dashboard on top of Taste Graph overrides.
- Expand brand capture into Pro-grade brand intelligence:
  favorite brands, substitutes, upgrades, and history.
- Finish advanced hosting outputs:
  guest menu, prep timeline, stronger batch optimizer presentation.
- Add low-stock signals and richer bottle-level notes.

Definition of done:

- Pro users can directly manipulate taste controls.
- Hosting outputs feel like planning artifacts, not just calculations.
- Brand and bottle intelligence feel persistent and personal.

### Wave 4: Ship the Identity Layer

Goal: make Pro feel like membership in a serious enthusiast system.

- Add certifications and certification UI.
- Add XP multiplier and prestige-style progression rewards.
- Add weekly "For You" drops.
- Add occasion-based preference modes.
- Reposition Vault toward master recipes and elite drops.

Definition of done:

- Pro has at least one visible recurring reward loop and one visible status/credential loop.
- Upgrade prompts from Plus to Pro are tied to identity moments, not generic feature locks.

### Wave 5: Add Differentiated Pro Expansion

Goal: ship features competitors are less likely to have.

- Cellar mode:
  valuation, purchase tracking, drinking window notes for relevant bottles.
- Advanced collector/enthusiast tooling where it strengthens retention without diluting the core app.

Definition of done:

- Pro has a differentiated enthusiast feature set beyond recommendations and hosting.

## Suggested Immediate Next Tasks

1. Update tier copy and source comments to reflect the new locked decisions.
2. Implement the post-scan recipe suggestion rule for Free.
3. Create and wire a real `Optimize My Bar` screen.
4. Swap Pro "For You" feed generation to the predictive engine.

