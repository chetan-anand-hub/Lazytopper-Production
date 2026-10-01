# AGENTS.md — rules for any coding agent or human contractor

This file is tool-neutral. It is for anyone changing this repository with any editor or coding
assistant. `CLAUDE.md` holds the full rules; this is the short version.

## 1. What this is

LazyTopper is a CBSE Class 10 board-preparation web app. It is **live with students**, so a broken
change reaches real learners. It is a pnpm monorepo: `lazytopper/` is the app (React + TypeScript +
Vite in `lazytopper/src/`, its Node/Express server in `lazytopper/server/`); `artifacts/api-server/`
is the API front door; `lib/` holds shared packages; `scripts/` holds the root guard suite;
`firestore.rules` is the database security rules; `handoff/` and `ops/` are project docs.

## 2. Before you change anything

- Read `CLAUDE.md` first. It is the full rule set and it wins on any conflict with this file.
- Branch from the trunk, `base/approved-thru-437`.
- **PRs only — never push to trunk.** Open a pull request against `base/approved-thru-437`.
- CI (`quality-gate`, in `.github/workflows/quality-gate.yml`, including the two extra test-clock
  runs) must pass before anything merges.

## 3. Protected files

Do not change these unless your task explicitly allows that exact file:

- `lazytopper/src/pages/Welcome.tsx`
- `lazytopper/src/App.tsx`
- `lazytopper/src/components/DesktopShell.tsx`
- `lazytopper/src/main.tsx`
- `vite.config.ts`
- `firebase.json`
- `firestore.rules`
- Any file under `lazytopper/src/data/`
- and any file your task does not explicitly allow

## 4. Never

- Never put secrets, API keys or tokens in code or in commits.
- Never leave `console.log` in production code.
- Payment keys: test-mode keys only, and only on your own machine. Keep them in `lazytopper/.env`,
  which is git-ignored (`lazytopper/.gitignore` has `**/.env`). A `.env` at the repo root is NOT
  git-ignored — do not create one.

## 5. Live-product rules

- Production switches belong to the owner. Never set or change `PAYMENTS_ENABLED`,
  `VITE_PAYMENTS_ENABLED` or `FAIR_USE_ENFORCE`.
- Every behaviour change ships behind a switch until the owner turns it on.
- Payments code lives in:
  - `lazytopper/server/routes/payments.cjs`
  - `lazytopper/server/services/passGrant.cjs`
  - `lazytopper/src/services/checkout.ts`
  - `lazytopper/src/components/pricing/PassCheckout.tsx`

## 6. Product wording

- Premium is a one-time purchase. Say "Premium"; never "subscription", never "/month".
- Prices come only from `lazytopper/src/config/pricing.ts` (for example `MONTHLY_INLINE`, the
  "for a month" inline price). Never hard-code a price anywhere else.

## 7. How to test

Install once (pnpm workspace; `npm install` is blocked):

```bash
corepack pnpm install --frozen-lockfile
```

Then, from `lazytopper/`:

```bash
npx tsc -p tsconfig.app.json --noEmit         # app typecheck
pnpm run typecheck:test                       # test-file typecheck (a separate CI gate)
pnpm run build
node scripts/verify-production-build.mjs
pnpm run check:mojibake
pnpm run scope:guard --mode product           # or --mode mixed
pnpm run test:matrix:all                      # lazytopper ops matrix
pnpm test                                     # vitest suites
```

And the root guard matrix, from `scripts/`:

```bash
pnpm run test:matrix:all
```

Finally, from the repo root: `git diff --check`. Run all of them; a red result means stop.

## 8. Questions

Ask the owner (Chetan) before touching anything outside your task.
