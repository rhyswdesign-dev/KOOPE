# KOOPE Monetization Step 1 Audit (v1 + v2 Strategy vs Code)

Date: 2026-02-20
Scope: Strategy docs in `/Users/frodobagginz/Downloads/KOOPE_Monetization_Strategy.docx` and `/Users/frodobagginz/Downloads/KOOPE_Strategy_v2.docx` mapped against current app code.

## Summary
- Overall: **Partial implementation**.
- Strong areas: paywall screen exists, many upgrade entry points route to paywall, tier registry + trigger framework exist, RevenueCat integration scaffold exists.
- Biggest gaps: production monetization readiness (keys/offering wiring), navigation architecture mismatch, mastery visibility rules mismatch, commerce checkout realism, and trigger coverage consistency.

## Doc-to-Code Matrix

| Strategy Area | Expected (v1/v2) | Status | Evidence |
|---|---|---|---|
| Shopping cart open to all tiers | Commerce never gated | **Done** | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts`, `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/featureRegistry.ts` |
| Paywall exists and is reachable | All upgrade CTAs should land on subscription screen | **Partial** | Paywall route/screen in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/navigation/RootNavigator.tsx`, `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/PaywallScreen.tsx`; many routes call `navigate('Paywall')` |
| RevenueCat purchase/restore flow | Live subscription purchase + restore | **Partial** | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/contexts/SubscriptionContext.tsx` |
| RevenueCat production config | Real keys and offerings configured | **Missing / env-dependent** | Placeholder guard in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/contexts/SubscriptionContext.tsx`, keys defined in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/constants/subscriptions.ts` |
| Paywall pricing source | Live price/package metadata from store/RevenueCat | **Partial** | Hardcoded plans in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/PaywallScreen.tsx` |
| Trigger map T1–T13 | Triggered at specific intent points | **Partial** | Definitions in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/paywallTriggers.ts`; usage spread via `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/hooks/useFeatureAccess.ts` and selective screens |
| Feature gating registry | Centralized gate definitions | **Done** | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/featureRegistry.ts` |
| Tier limits model | FREE 10-bottle cap, PLUS/PRO unlocks | **Done** | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/tierAccess.ts` |
| Navigation architecture | Scan / Bar / Discover / Host / Profile | **Missing** | Current tabs are `Lessons / Recipes / Camera / Inventory / Profile` in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/navigation/Tabs.tsx` |
| Host tab preview gate for Free | Dedicated Host tab with preview->upgrade | **Missing/Partial** | Host gates exist in registry/triggers, but no dedicated Host tab in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/navigation/Tabs.tsx` |
| Mastery visibility rules | Free/Plus should not see full mastery system surfaces | **Mismatch** | Lessons tab globally present in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/navigation/Tabs.tsx`; profile shows levels/xp UI in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/ProfileScreen.tsx` |
| Vault gating by tier | Free basic vs Pro drops, trigger-based upsell | **Partial** | Vault has tier checks and paywall routes in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/vault/VaultScreen.tsx` |
| Affiliate commerce layer | Partner links with attribution tags | **Partial** | Service exists but tags default empty in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/affiliateService.ts` |
| Checkout realism | Functional store-backed purchase flow | **Missing (mock)** | Mock checkout flow in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/commerce/CheckoutScreen.tsx` and mock promo in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/commerce/CartScreen.tsx` |
| Founders pricing operations | Backend/remote-config controlled founders offer | **Partial/Unwired** | Founders constants/state exist in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/constants/subscriptions.ts`, `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/store/useUserTier.ts`; no end-to-end offer flow found |
| Brand capture -> personalization | Completion brand data influences recommendations | **Partial** | Completion capture implemented; recommendation boost added in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/services/recommendationEngine.ts`, but broader cross-surface usage still limited |

## Prioritized Backlog (P0/P1/P2)

## P0 (Revenue-critical, must complete before growth work)

1. Production subscription configuration hardening
- Problem: purchase stack can silently run in free mode when keys are placeholders.
- Deliverables:
  - Enforce non-placeholder RevenueCat keys for release profiles.
  - Validate product IDs/entitlements/offering mappings per platform.
  - Add startup health check + logging for subscription readiness.
- Acceptance criteria:
  - iOS and Android sandbox users can purchase and restore successfully.
  - Release build fails CI if placeholder keys are present.
  - Entitlements map to tier state (`FREE/PLUS/PRO`) deterministically.
- Dependencies: app store products + RevenueCat dashboard configuration.

2. Paywall package sourcing from live offerings
- Problem: paywall plan cards are hardcoded and may drift from app store pricing.
- Deliverables:
  - Bind paywall plan UI to `offerings.current.availablePackages`.
  - Keep hardcoded values as fallback only if offerings unavailable.
  - Show package identifier + period mapping explicitly.
- Acceptance criteria:
  - Price and billing period match store metadata in runtime logs/UI.
  - All purchase buttons resolve to a package present in current offering.
- Dependencies: P0.1.

## P1 (Conversion and strategy alignment)

1. Navigation architecture alignment to strategy
- Problem: current tabs still include `Lessons` and `Inventory`; strategy requires `Scan / Bar / Discover / Host / Profile`.
- Deliverables:
  - Replace tab set and map stacks accordingly.
  - Move lessons/mastory entry behind profile-tier logic.
- Acceptance criteria:
  - Main tab bar matches strategy nav exactly.
  - Free user sees Host preview gate; Plus/Pro see host workflows.

2. Mastery visibility policy fix
- Problem: free-facing mastery signals are currently visible (e.g., level/xp UI, lessons tab presence).
- Deliverables:
  - Hide/replace mastery surfaces for Free/Plus with single unlock CTA where specified.
  - Keep XP earning if required, but suppress full mastery dashboard for non-Pro.
- Acceptance criteria:
  - Free and Plus never see full mastery dashboard components.
  - Pro sees full mastery stack (levels, lessons, certifications).

3. Trigger coverage audit and closure (T1–T13)
- Problem: trigger definitions exist but not fully enforced across all intended entry points.
- Deliverables:
  - Map each trigger to concrete screen actions.
  - Add missing trigger hookups and analytics validation.
- Acceptance criteria:
  - Every strategy trigger has at least one deterministic code path.
  - Funnel analytics exist: viewed -> cta_clicked -> purchase_started/completed/cancelled/failed.

4. Affiliate activation
- Problem: affiliate system is scaffolded but partner tags are not configured.
- Deliverables:
  - Configure provider tags via secure env/remote config.
  - Validate click tracking payloads and outbound URLs.
- Acceptance criteria:
  - Outbound links include partner tags in production.
  - Affiliate click events captured with provider + source context.

## P2 (Monetization depth and data moat)

1. Real commerce backend parity
- Problem: commerce cart/checkout currently uses mock data flows.
- Deliverables:
  - Replace mock checkout with actual provider flow or clearly decouple from monetization KPI path.
  - Ensure order history reflects real transactions.
- Acceptance criteria:
  - End-to-end checkout test covers create order -> confirmation -> history.

2. Founders offer infrastructure
- Problem: founders fields/constants exist without complete operational flow.
- Deliverables:
  - Implement offer eligibility, exposure rules, and audit logging.
  - Ensure founders pricing cannot leak to ineligible users.
- Acceptance criteria:
  - Eligibility-tested founders cohort sees correct offer; others never do.

3. Brand capture and recommendation expansion
- Problem: brand capture now exists but is not yet leveraged across all recommendation/shopping surfaces.
- Deliverables:
  - Feed completion metadata into broader ranking and shopping recommendations.
  - Add explainability snippets in recommendations.
- Acceptance criteria:
  - Recommendation order measurably shifts after logged completions.
  - At least one shopping suggestion uses captured brand preference.

## Dependencies and Sequencing
1. P0.1 -> P0.2 (live offerings depend on valid RC configuration)
2. P0 complete before P1 conversion optimization
3. P1 nav/mastery alignment before P2 experimentation (Founders/A-B)

## Immediate next execution recommendation
- Start with **P0.1** and **P0.2** as one implementation track, then run a short regression on paywall trigger routes.
