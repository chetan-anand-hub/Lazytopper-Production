# LazyTopper Desktop Graduation State

Last updated: 2026-04-27

This document is the durable handoff for GPT, Replit, and future agents working on the LazyTopper desktop graduation. Read this before starting any desktop implementation task.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base at the time this document was created: `fde4ad3ce0dbfd665871454a55dfed9142687efa`
- Final desktop Level 2 prototype: `https://github.com/chetan-anand-hub/topic-focus-lite`

GitHub origin is the source of truth. Local Replit checkpoint commits, preview-only edits, staged leftovers, and task snapshots are not product state unless they have been pushed to GitHub and reviewed as a PR.

## Historical prototypes

- Desktop Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Mobile Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-navigator`

The Level 1 prototypes are historical references. Do not use them as the current desktop target. The current desktop target is the Level 2 `topic-focus-lite` prototype.

## Already completed

### Mobile Level 1

Mobile Level 1 has already been implemented in the product repo. Do not touch mobile unless a task explicitly asks for mobile work.

### Desktop Level 1 / Phases 1-7

Desktop Level 1 / Phases 1-7 have already been implemented in the product repo. The desktop shell and desktop pages already exist.

Do not revive stale Desktop Phase 1 / Shell + Home tasks.

### PR-A / PR #18 — Desktop Level 2 Foundation

- Status: merged
- Branch: `feat/desktop-pr-a-l2-foundation`
- Merge/squash SHA: `99da42d01385084dbda16b9d95fcae8b10d2663e`
- Scope: additive Level 2 foundation under:
  - `lazytopper/src/components/desktop/l2/*`
  - `lazytopper/src/lib/desktop/*`

PR-A added shared foundation. It did not mount visible pages.

### PR-B / PR #19 — Desktop Home Graduation

- Status: merged
- Branch: `feat/desktop-pr-b-home-graduation`
- Merge/squash SHA: `fde4ad3ce0dbfd665871454a55dfed9142687efa`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`
- Scope: graduated desktop Home to a topic-focus-lite-style workspace with honest copy and no Task #362 dependencies.

## Not merged / do not use without separate review

### PR #17 / Task #362 — Diagnostic categories preservation

- Status: open, draft, preservation only
- Branch: `chore/task-362-error-categories`
- Head SHA: `14024f4a1ec0234f915b7d56da0d25b7824f8f48`
- Files in preservation branch:
  - `lazytopper/src/ai/aiClient.ts`
  - `lazytopper/src/services/errorCategories.ts`
  - `lazytopper/src/services/mistakeLogService.ts`

Do not import from PR #17. Do not merge PR #17. Do not use Task #362-only symbols such as `aggregateErrorCategories`, `readLocalMistakeLogsSince`, or `ErrorCategory` unless PR #17 is separately reviewed, approved, and merged.

## Obsolete work and stale states

The following are obsolete and must not be used as implementation instructions:

- Desktop Phase 1 / Shell + Home tasks
- Starting from old SHA `93e739c`
- Recreating `DesktopShell`, `DesktopHome` Level 1, or `MistakeIntelCard`
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome changes
- Broken PR-B v1 local implementation that imported Task #362-only code

## Current implementation sequence

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation

Next planned desktop work:

3. PR-C — Desktop Practice Hub Graduation
4. PR-D — Desktop Worksheet Workspace
5. PR-E — Desktop Exam Trends Graduation
6. PR-F — Topic Hub Lite Graduation
7. PR-G — Desktop Check & Improve Graduation
8. PR-H — Desktop Me / Progress Graduation
9. PR-I — source/returnTo hardening
10. PR-J — final desktop parity polish

## Mandatory Git sync rule

Every implementation task must end in GitHub, not just a Replit checkpoint.

For every implementation task:

1. Start from a fresh isolated clone or clean branch from the latest `origin/base/approved-thru-437` unless the task explicitly pins a SHA.
2. Create a task-specific feature branch, for example `feat/desktop-pr-c-practice-hub-graduation`.
3. Make only the scoped changes.
4. Run the real product build:

   ```bash
   NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
   ```

5. Run the verifier:

   ```bash
   node scripts/verify-production-build.mjs
   ```

6. Push the feature branch to GitHub.
7. Open a PR into `base/approved-thru-437`.
8. Return an audit-ready report with PR URL, compare URL, base/head SHA, exact changed files, build result, verifier result, and explicit confirmations of files not touched.
9. Do not merge the PR unless the user explicitly asks after GPT/user audit.

An implementation task is not audit-complete until the GitHub PR exists.

## Preview, audit, and planning exception

Preview-only, audit-only, and planning-only tasks do not need to push code or open a PR. They must explicitly report:

> Preview/audit/planning only. No GitHub state changed.

Preview-only local changes are not product state.

## Build command rule

Use the real product package build:

```bash
NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
```

Do not use `pnpm --filter @workspace/lazytopper-app run build` as the acceptance build for desktop graduation PRs; that can build the artifact stub rather than the real product package.

## Route and product boundaries

Production route names should remain coherent and auditable. Do not copy `/app/*` prototype route names into the React route system unless explicitly requested.

Preserve the existing production route conventions:

- `/`
- `/practice-hub`
- `/exam-trends`
- `/topic-hub`
- `/topic-hub/*`
- `/check-improve`
- `/me`

Mobile remains separate. Do not change mobile files, mobile nav, mobile routes, or landing/welcome unless explicitly instructed.

## Topic data warning

`lazytopper/src/lib/desktop/topics.ts` currently contains a small desktop Level 2 bridge catalogue. Before visible pages use it for broad topic selection or syllabus-wide claims, either:

1. wire it to the production canonical topic/syllabus source, or
2. clearly label the UI as suggested/starter/temporary bridge data and avoid claims of full syllabus coverage.

## Standard forbidden changes unless explicitly allowed

Do not touch these unless the task explicitly permits it:

- `lazytopper/src/App.tsx`
- route wiring
- mobile files/nav/screens
- landing/welcome files
- `lazytopper/src/components/desktop/DesktopShell.tsx`
- `lazytopper/src/components/desktop/MistakeIntelCard.tsx`
- `lazytopper/src/hooks/useIsDesktop.ts`
- package files
- PR #17 / Task #362 files

Do not add Tailwind, shadcn, Radix, lucide-react, or new npm packages. Use inline styles and inline SVG for desktop graduation work unless a task explicitly changes this rule.

## Future task reminder

Before acting, agents should read this document and compare it against GitHub origin. If local Replit state disagrees with this document and GitHub origin, stop and report the mismatch instead of coding.
