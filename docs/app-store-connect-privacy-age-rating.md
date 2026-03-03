# App Store Connect Privacy + Age Rating Worksheet

Updated: 2026-02-23
Owner: Product + Legal

This is the source-of-truth worksheet before entering App Store Connect metadata.

## 1) App category + age posture

- App category target: Food & Drink (or Lifestyle if positioning requires)
- Minimum audience: legal drinking age users only
- In-app age gate: implemented (`/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/AgeGateScreen.tsx`)
- Terms language updated for 21+ in U.S. (`/Users/frodobagginz/Documents/test-project/HomeGameAdvantage/src/screens/TermsScreen.tsx`)

## 2) Privacy labels (draft)

Validate each item with final backend behavior before submission:

- Contact info
  - Email (support/feedback): Collected if user submits support/feedback
- User content
  - Photos (optional uploads/imports)
  - Recipe notes/reviews (if submitted)
- Identifiers
  - User ID/account ID
  - Device push token (if notifications enabled)
- Purchases
  - Subscription entitlement state via RevenueCat
- Usage data
  - Feature interactions/analytics events
- Diagnostics
  - Crash/error logs (if enabled)
- Precise location
  - Only if user grants permission for alcohol-help nearest resource lookup

## 3) Required policy links

- Privacy Policy URL: `TODO`
- Terms of Service URL: `TODO`
- Support URL: `TODO`

## 4) Compliance checks before submit

1. Ensure screenshots do not depict underage drinking.
2. Ensure store copy does not promise unsupported features.
3. Ensure subscription pricing/terms in store listing match in-app paywall copy.
4. Ensure all data collection disclosures match actual runtime behavior.
