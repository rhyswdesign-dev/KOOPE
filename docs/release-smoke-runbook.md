# Release Smoke Runbook

Updated: 2026-02-23
Owner: QA

Run on iOS TestFlight build and Android release-like build.

Legend:
- `PASS`
- `FAIL`
- `N/A`

## Build + launch

| Check | Result |
|---|---|
| App installs cleanly | |
| Cold start succeeds | |
| No redscreen/crash on launch | |

## Onboarding + safety

| Check | Result |
|---|---|
| Age gate blocks underage DOB | |
| Age gate allows 21+ DOB | |
| Terms/consent flow completes | |

## Core navigation + tutorial

| Check | Result |
|---|---|
| Lessons tab loads | |
| Discover tab loads | |
| Camera tab loads | |
| Inventory tab loads | |
| Profile tab loads | |
| Settings -> Tutorials opens | |
| Tour replay works for all entries | |

## Monetization

| Check | Result |
|---|---|
| Paywall opens from upgrade entry points | |
| Plus monthly purchase works | |
| Plus yearly purchase works | |
| Pro monthly purchase works | |
| Pro yearly purchase works | |
| Restore purchases works | |

## Notifications + support

| Check | Result |
|---|---|
| Push permission prompt shown | |
| Push token registers (valid EAS project ID) | |
| Help & Support actions open correctly | |
| Send feedback flow submits successfully | |

## Account + data

| Check | Result |
|---|---|
| Edit profile save works | |
| Account deletion flow succeeds | |
| User data removed/invalidated post-deletion | |

## Sign-off

- Build version: `TODO`
- Date tested: `TODO`
- QA owner: `TODO`
- Final release decision: `GO / NO-GO`
