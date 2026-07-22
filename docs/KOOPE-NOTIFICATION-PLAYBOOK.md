# KŌOPE Notification Playbook — Retention & Habit Architecture

**Status:** CANONICAL for push/in-app notification strategy, cadence, and copy voice. Product priorities defer to [KOOPE-MASTER-PLAN.md](KOOPE-MASTER-PLAN.md); brand voice defers to [KOOPE-MARKETING-OS.md](KOOPE-MARKETING-OS.md).
**Author:** Office of the CPO
**Date:** 2026-07-08 · v1.0
**Companions:** [KOOPE-PRODUCT-BIBLE.md](KOOPE-PRODUCT-BIBLE.md) (the three moments) · [KOOPE-BRAND-PLATFORM-PLAN.md](KOOPE-BRAND-PLATFORM-PLAN.md)

---

## 0. Operating Thesis

**The North Star is Weekly Makers, so the notification system's only job is to cause makes and gatherings — not opens.** An open that doesn't lead toward *"I made this," "I made this for you,"* or *"make me something"* is spent permission capital with no return.

**The four laws:**

1. **Permission is capital.** Every notification spends it; only a completed action refills it. Hard weekly budget, enforced in code — not judgment.
2. **Every notification deep-links to one action.** No "come back!" pings. If there is no screen the user should land on, the notification doesn't exist.
3. **Anchor to real rhythms, not app rhythms.** Hosting is a weekend behavior; restocking is a shopping-day behavior; gifting is seasonal. The calendar below follows the user's week, not our content pipeline.
4. **Voice is the quiet confidence of the host** (Marketing OS §1.2) — anticipation and pride, never guilt or FOMO. We are the friend who reminds you the party's Friday, not the app that's sad you left.

### Current state of the rails (audited 2026-07-08)

Built: [notificationService.ts](../src/services/notificationService.ts) — expo-notifications, preferences with quiet hours, in-app inbox, badge counts; trial lifecycle sequence (4 sends), low-stock alerts, XP/cert celebrations, streak + lesson reminder scaffolding.

Gaps:
- **Local-only.** Push token never leaves the device; no server-initiated sends possible.
- **Deep links stubbed** — `actionUrl` is logged, not navigated ([notificationService.ts:260](../src/services/notificationService.ts#L260)).
- **Barely wired** — only ProfileScreen, HomeBarScreen, and useStartTrial call the service; streak/lesson reminders exist but nothing schedules them in the core loops.
- **No frequency governor** — every schedule call fires independently; nothing prevents 6 notifications landing in one day.
- **No measurement** — sends/opens are not mirrored to Mixpanel; retention impact is invisible.
- **Off-brand copy** — "🔥 Don't break your streak!" is Duolingo guilt, not KŌOPE (rewrite in §4).

---

## 1. The Taxonomy — four layers, one budget

| Layer | Purpose | Trigger | Budget class |
|---|---|---|---|
| **L1 Transactional** | Finish what the user started | User action (trial, low stock, hearts, celebration, hosting countdown) | Uncapped (earned) |
| **L2 Habit loop** | Build the weekly make/host rhythm | Time + behavior state | Max 3/week |
| **L3 Appointment content** | Same slot weekly/monthly → appointment behavior | Content calendar | Max 1/week |
| **L4 Lifecycle** | Onboard, win back, seasonal | Cohort state | Max 1/week, pauses L2 |

**Global governor: a user receives at most 4 non-transactional notifications per week, max 1 per day, and none on a day they already opened the app** (they're here; don't knock). Priority when over budget: L1 > L4 winback > L3 > L2. This governor is a code path, not a guideline (§3).

### L1 — Transactional (mostly built, needs wiring)

| Notification | Trigger | Deep link | Status |
|---|---|---|---|
| Trial lifecycle ×4 | Trial start | Paywall/features | ✅ built |
| Low stock | User marks bottle low | Home bar | ✅ built |
| XP / cert celebration | Milestone | Profile | ✅ built |
| Hearts refilled | Refill timer | Lessons | ✅ built |
| **Hosting T-72h** | Event in planner | Party cart / shopping list | ❌ build — *the highest-value send in the app: it triggers the $150–300 party cart at peak intent* |
| **Hosting T-24h** | Event in planner | Prep timeline | ❌ build |
| **Hosting day-of** | Event in planner | Guest menu | ❌ build |
| **Post-event next morning** | Event + 1 day | Log makes / rate recipes | ❌ build — closes the loop, feeds the taste graph |

The hosting countdown sequence is the flagship: it's pure service (law 4), it monetizes (party cart), and it lands at the exact moment hosting anxiety peaks — the emotional territory the brand owns.

### L2 — Habit loop (the Weekly Maker engine)

| Notification | When | Logic | Deep link |
|---|---|---|---|
| **Friday maker prompt** | Fri 4:30pm local | Only if no make logged this week; personalized from shelf: *"You have gin and Campari — a Negroni is 30 seconds away."* | What Can I Make |
| **Weekend host seed** | Thu 6pm | Only if user has hosted before or browsed Hosting; *"Having anyone over this weekend?"* | Hosting Planner |
| Streak protector | 7pm on last streak day | Only for users with streak ≥ 3 (a streak of 1 isn't worth guarding) | Lessons |
| Lesson nudge | User's historical active hour | Only if lesson in progress | Resume lesson |

The Friday maker prompt is the single most important habit send — it directly manufactures the North Star metric using data we already have (shelf + recipe matching).

### L3 — Appointment content (same slot every time)

| Notification | Slot | Source |
|---|---|---|
| Weekly For You drop | Wed 5pm | `weeklyForYouDrops` config (exists) |
| Monthly challenge | 1st of month, 10am | Challenge rotation (exists, auto-rotates via Actions) |
| Category of the Month | 1st Friday, 4pm | `featured_brands` (Brand Platform Plan Phase 1+) — labeled "Featured," counts as the marketing-class send |
| Vault drop | On drop | Vault system |

One L3 send per week maximum — they rotate, they don't stack. Fixed slots are the point: Wednesday drop + Friday prompt = the KŌOPE week.

### L4 — Lifecycle

- **Onboarding:** D1 ("your bar is set up — here's what it can make"), D3 (first lesson or first scan nudge, whichever is untouched), D7 (weekly drop enrollment). Suppresses L2/L3 during week 1.
- **Winback:** lapsed 7d ("3 new recipes match your shelf"), 14d (best unexplored feature for their profile), 30d (one seasonal/occasion send, then stop — a 30-day-lapsed user pinged monthly is churn theater). Never more than 3 winback sends per lapse.
- **Seasonal (matches the party-cart calendar):** NYE, Super Bowl, Derby, Cinco, Halloween, Thanksgiving, December gifting (Want-list registry — acquisition season per Master Plan). Pre-written once, reused annually.

---

## 2. The permission ask (opt-in rate is upstream of everything)

Never ask on first launch. Ask **after the first value moment** — first successful scan, first What Can I Make result, or first hosting plan — with a primer screen before the OS dialog: *"Want us to remind you when your party's coming up, or when your shelf can make something new?"* Framed as service, tied to what they just did. If declined, re-prime exactly once, at the next hosting plan (the moment reminders are self-evidently useful). Target: >60% opt-in (utility apps that ask at the right moment clear this; ask-on-launch apps sit near 30%).

Preference categories shown to users map to the taxonomy: **My events** (L1 hosting), **My progress** (L1 celebrations + L2), **Weekly drops** (L3), **Occasions & featured** (L4 seasonal + Category of the Month) — the last one default **off**, consistent with the existing `marketing: false` default.

---

## 3. Engineering plan (local-first, then server)

### Phase A — now, zero infra (2–3 weeks of work)

Local scheduling covers ~90% of the taxonomy because almost every send is either user-triggered (L1) or predictable-at-app-open (L2/L3 slots, onboarding):

1. **Wire deep links.** Connect `actionUrl` to the navigation service — until then every notification under-delivers. Replace `homegameadvantage://` scheme references app-wide check with current scheme in [deepLinking.ts](../src/lib/deepLinking.ts).
2. **`NotificationPlanner` module** — the frequency governor. On every app open (and on significant state change): compute the user's next 7 days of L2/L3/L4 sends from local state, apply the budget rules (≤4/wk, ≤1/day, none-if-active-today via cancel-on-open), cancel-and-reschedule the whole window. One planner, one place where budget is enforced; individual features stop calling `scheduleNotificationAsync` directly.
3. **Hosting countdown sequence** (T-72h/T-24h/day-of/post-event) scheduled at event creation in the Hosting Planner — pure L1, no planner arbitration needed.
4. **Friday maker prompt** — planner-scheduled, body personalized from shelf + recipe matching at scheduling time.
5. **Measurement:** mirror `Notification Scheduled / Received / Tapped` to Mixpanel with `{type, layer, slot}`; dashboard = tap rate by type + D7/D28 retention, opt-in cohort vs. not. **Kill rule: any recurring notification whose tap rate falls below 2% for two consecutive months is cut or rewritten — no zombie sends.**
6. **Copy pass** (§4) + preference categories remapped to the four user-facing groups.

Limitation accepted in Phase A: a user who never opens the app stops getting fresh L2/L3 content once the scheduled window runs dry (~7 days). That is nearly acceptable behavior for winback anyway — schedule the three winback sends as part of every planner run (they self-cancel on next open because the planner reschedules everything).

### Phase B — server push (when: content ops matter, ~1–2k MAU)

1. Store Expo push tokens in Supabase (table + upsert on registration; token currently dies in AsyncStorage).
2. **GitHub Actions cron → Expo Push API** for L3 content sends and true winback — the same pattern as challenge rotation; no new infra vendor.
3. Server-side segmentation (category-engaged, lapsed cohorts) reusing the Brand Platform Plan's segment definitions.
4. Revisit OneSignal/Braze only if send volume or experimentation needs outgrow a cron + SQL — not before (Marketing OS budget test).

---

## 4. Voice — the copy covenant

The reference feeling: **a good friend who remembers your party is Friday.** Rewrites of what's shipped:

| Current | Rewrite | Why |
|---|---|---|
| 🔥 Don't break your streak! | *Day 12. The Old Fashioned isn't going to stir itself.* | Pride and momentum, not loss-aversion guilt |
| Time for your bartending lesson! | *Your next technique is a 4-minute read: the dry shake.* | Specific value, named payoff |
| (new, Friday prompt) | *Friday. You've got gin, sweet vermouth, and Campari — that's a Negroni, and you know it.* | The shelf did the personalizing; warmth does the selling |
| (new, T-72h) | *Saturday's party: your list is 9 items. Order it all in one tap.* | Anxiety → handled, in one line |
| (new, post-event) | *How'd last night pour? Log what you made — your taste graph is listening.* | Closes the loop, no rating-beg |

Banned moves: guilt ("we miss you"), fake urgency ("last chance!" on non-expiring things), streak-shaming, emoji walls, and any send whose honest summary is "please open the app."

---

## 5. Scorecard

| Dimension | KPI | Target |
|---|---|---|
| Permission | Opt-in rate at primer | >60% |
| Discipline | Non-transactional sends/user/week | ≤4, CI-tested in planner |
| Effectiveness | Tap rate, Friday maker prompt | >8% (it's personalized; generic push benchmarks ~2–3%) |
| North Star | Make logged within 24h of maker-prompt tap | >30% |
| Retention | D28 retention, notified vs. control cohort | +5pts or the system isn't paying rent |
| Health | Notification-driven opt-outs/month | <1% of opted-in base |

**Kill criteria:** if 60 days of measurement show no D28 retention lift from L2/L3, cut volume in half rather than adding sends — the failure mode of every notification system is *more*.

---

## 6. Standing decisions

1. The frequency governor is code (`NotificationPlanner`), not policy. Features request sends; the planner decides.
2. The hosting countdown is the flagship sequence — it ships before any L2 send because it's service first, monetization second, and brand-emotion third, all in one.
3. Local-first until ~1–2k MAU; server push via the existing GitHub Actions pattern, not a new vendor.
4. "Occasions & featured" preference defaults off; Category of the Month sends always ride that channel, never the habit channels — the covenant extends to the notification tray.
