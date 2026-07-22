# Contributing to KŌOPE

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production. Protected. No direct pushes. |
| `feat/<short-description>` | New features |
| `fix/<short-description>` | Bug fixes |
| `chore/<short-description>` | Tooling, deps, refactors |
| `hotfix/<short-description>` | Urgent production fixes |

Keep branch names lowercase with hyphens. Examples:
- `feat/kill-switch-ui`
- `fix/vault-count-overflow`
- `hotfix/auth-token-expiry`

## Workflow

1. **Branch off `main`** — always start from the latest main.
2. **Keep PRs small** — one feature / one fix per PR. Reviewers have lives.
3. **Open a draft PR early** if you want early feedback.
4. **Assign at least one reviewer** — do not merge your own PR.
5. **Squash on merge** — keeps main history linear and readable.

## Before opening a PR

Run these locally and fix anything that breaks:

```bash
npm run typecheck   # zero type errors required
npm run test:run    # all tests must pass
```

## Supabase / database changes

- Every schema change **must** have a migration file in `supabase/migrations/`.
- Number sequentially: `023_my_change.sql`.
- Include RLS policies in the same migration.
- Never alter the production database directly — always via migration.

## Secrets

- **Never commit secrets.** `.env` is gitignored.
- Add new env vars to `.env.example` with a placeholder value and a comment.
- EAS secrets are managed via the Expo dashboard.

## Commit messages

Use the imperative mood. Examples:
- `feat: add kill switch maintenance screen`
- `fix: vault cap not enforced for free users`
- `chore: upgrade supabase-js to 2.77`

## GitHub branch protection settings (set once, by the owner)

Go to **Settings → Branches → Add rule** for `main`:

- [x] Require a pull request before merging
- [x] Require approvals: **1**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - Add check: `Type check & tests` (from CI workflow)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

## Code review etiquette

- **Approving** = you're comfortable this ships to production.
- **Requesting changes** = block with a clear explanation.
- **Comments** = non-blocking suggestions; author decides.
- Aim to review within 24 hours during active sprints.
