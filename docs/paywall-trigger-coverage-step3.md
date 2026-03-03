# Paywall Trigger Coverage — Step 3 (P1.3)

Date: 2026-02-20
Scope: T1–T13 coverage audit + trigger hookup closure pass.

## What was implemented in this pass

1. Added default trigger mapping by feature in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/hooks/useFeatureAccess.ts` so gated features can resolve to a deterministic trigger even when callers do not pass one.
2. Wired shopping list export share action to T5 in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/components/GroceryListModal.tsx`.
3. Wired recipe batch gates to hosting triggers in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipeDetailScreen.tsx`:
   - T6 for locked batch calculator access (PLUS gate)
   - T7 for 5+ guest scaling path (8x batch selection)
4. Wired remaining strategy triggers to concrete UI actions:
   - T4 in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/HomeBarScreen.tsx`
   - T8/T9/T12 in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx`
   - T10 in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/LessonsScreen.tsx`
   - T13 in `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/HomeBarScreen.tsx`

## Trigger coverage status

| Trigger | Strategy intent | Current status | Code path |
|---|---|---|---|
| T1 | Inventory cap | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/BottleDetailScreen.tsx`, `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/ManualBottleEntryScreen.tsx` |
| T2 | Advanced filters | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/FeaturedScreen.tsx` |
| T3 | Save attempt | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx`, `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/CocktailDetailScreen.tsx` |
| T4 | Optimize My Bar | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/HomeBarScreen.tsx` |
| T5 | Export shopping list | Wired in this pass | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/components/GroceryListModal.tsx` |
| T6 | Host/party basic gate | Wired in this pass | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipeDetailScreen.tsx` |
| T7 | 5+ guests / advanced hosting | Wired in this pass | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipeDetailScreen.tsx` |
| T8 | Bring to Party | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` |
| T9 | Predictive engine | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` |
| T10 | Mastery lessons | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/LessonsScreen.tsx` |
| T11 | Vault PRO drops | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/vault/VaultScreen.tsx` |
| T12 | Flavor sliders | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/RecipesScreen.tsx` |
| T13 | Predictive restock (soft) | Wired | `/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/HomeBarScreen.tsx` |

## Remaining closure items

1. Add smoke checklist in QA runbook validating one real path for each trigger.
2. Verify analytics payloads include `trigger_id` and expected funnel events for each wired trigger.
