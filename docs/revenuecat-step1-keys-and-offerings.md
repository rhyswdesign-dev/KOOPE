# Step 1 - RevenueCat Keys + Offerings Setup

Updated: 2026-02-21

This is the exact setup required to unblock release checklist item P0.1/P0.2.

## 1) Set local environment values

Add these keys to `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_STRICT_MODE=true
```

Notes:
- iOS key must start with `appl_`.
- Android key must start with `goog_`.
- Keep keys out of git.

## 2) Configure RevenueCat dashboard to match app constants

Entitlements expected by app:
- `KOOPE+`
- `KOOPE - Pro`
- `KOOPE Pro` (legacy/alt)
- `prestige`

Products expected by app paywall:
- `plus_monthly`
- `plus_yearly`
- `pro_monthly`
- `pro_yearly`

Current app behavior:
- Paywall reads from RevenueCat `current offering`.
- If `current offering` is missing or package/product IDs mismatch, purchase will fail with "Package not found".

## 3) Current offering requirements

In RevenueCat, set a **current offering** that includes packages mapped to:
- `plus_monthly`
- `plus_yearly`
- `pro_monthly`
- `pro_yearly`

## 4) Validate locally

Run:

```bash
npm run validate:revenuecat
npm run validate:revenuecat:readiness
```

Expected:
- `validate:revenuecat` => `OK`
- `validate:revenuecat:readiness` => keys valid and product/entitlement summary output

## 5) Validate in app (native build)

Do this in a dev build or TestFlight (not Expo Go):
- Open paywall as free user.
- Attempt each plan: Plus monthly/yearly, Pro monthly/yearly.
- Confirm purchase success updates tier.
- Confirm restore purchases works.
- Confirm cancel flow returns gracefully.

## 6) CI / build environment parity

Mirror the same env vars in CI/EAS secrets:
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_REVENUECAT_STRICT_MODE=true`

If local passes but build fails, CI secrets are likely missing/mismatched.
