# Paywall QA Matrix (T1-T13)

Updated: 2026-02-23
Owner: QA + Product

Legend:
- `PASS` verified on device
- `FAIL` does not gate/navigate correctly
- `BLOCKED` cannot validate due missing RevenueCat offering/key/build

Prerequisites:
- Test user in FREE tier
- RevenueCat keys configured
- Current offering contains `plus_monthly`, `plus_yearly`, `pro_monthly`, `pro_yearly`
- Native dev client/TestFlight build (not Expo Go)

| Trigger | Scenario | Expected | Current |
|---|---|---|---|
| T1 | Add bottle beyond free cap | Hard gate to Paywall | BLOCKED |
| T2 | Use advanced filter as free user | Hard gate to Paywall | BLOCKED |
| T3 | Save cocktail as free user after cap | Hard gate to Paywall | BLOCKED |
| T4 | Tap "Optimize My Bar" | Hard gate to Paywall | BLOCKED |
| T5 | Export shopping list | Hard gate to Paywall | BLOCKED |
| T6 | Open host feature from free user path | Soft/hard gate per config | BLOCKED |
| T7 | Group mode with 5+ users | Hard gate to Paywall | BLOCKED |
| T8 | "Bring to Party" action | Soft gate to Paywall | BLOCKED |
| T9 | Predictive cocktail suggestions | Soft gate to Paywall | BLOCKED |
| T10 | Open mastery lesson | Hard gate to Paywall | BLOCKED |
| T11 | Open Pro vault drop | Hard gate to Paywall | BLOCKED |
| T12 | Adjust flavor sliders | Soft/hard gate per config | BLOCKED |
| T13 | Predictive restock action | Soft gate to Paywall | BLOCKED |

Code-level mapping reference:
- `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/docs/paywall-trigger-coverage-step3.md`
- `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/config/paywallTriggers.ts`
- `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/hooks/useFeatureAccess.ts`

Execution notes:
1. Record screen capture for each trigger.
2. Confirm `trigger_id` is present in analytics payload.
3. Confirm paywall CTA enters purchase flow (or shows offer loading state) rather than dead-end.
