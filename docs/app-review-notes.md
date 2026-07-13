# App Review Notes Template

Updated: 2026-02-23
Owner: Release Manager

Paste this into App Store Connect "Notes for Review".

## Reviewer quick path

1. Launch app.
2. Complete age gate (21+ required for U.S. users).
3. Sign in with review credentials below.
4. Navigate tabs: Lessons, Discover, Camera, Inventory, Profile.
5. Open Settings -> Tutorials to replay feature tours.
6. Trigger upgrade entry point and open paywall.
7. Validate purchase/restore flow in sandbox account.

## Test account

- Email: `test@koope.app`
- Password: `TestPassword123!`
- 2FA: `None`
- Notes: account is pre-provisioned in Supabase auth for reviewer sign-in.

## Subscription test notes

- RevenueCat offering: `default` (must include plus/pro monthly/yearly products)
- Expected packages:
  - `plus_monthly`
  - `plus_yearly`
  - `pro_monthly`
  - `pro_yearly`

## AI disclosure

- KOOPE includes AI-assisted features for recipe generation, recipe formatting, and voice-to-recipe transcription.
- AI output is clearly labeled in relevant screens (for example: AI-generated recipe messaging in recipe creation/edit flows).
- Users can edit AI-generated outputs before saving.

## Safety and support

- Age-gated onboarding blocks underage users.
- Help & Support includes alcohol-help resources and external hotline links.
- Notifications are opt-in only.
