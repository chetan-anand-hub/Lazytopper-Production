# LazyTopper Desktop Graduation State

Last updated: 2026-04-27

This document is the durable handoff for GPT, Replit, and future agents working on the LazyTopper desktop graduation. Read this before starting any desktop implementation task.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base after PR-D merge: `415386853661fdb831b5615cdcb64dcd8800172c`
- Final desktop Level 2 prototype: `https://github.com/chetan-anand-hub/topic-focus-lite`

GitHub origin is the source of truth. Local Replit checkpoint commits, preview-only edits, staged leftovers, and task snapshots are not product state unless they have been pushed to GitHub and reviewed as a PR.

## Historical prototypes

- Desktop Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Mobile Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-navigator`

The Level 1 prototypes are historical references. Do not use them as the current desktop target. The current desktop target is the Level 2 `topic-focus-lite` prototype.

## Locked Prototype Parity Rule

The final desktop prototype is not merely inspiration. For each desktop graduation PR, the implementing agent must inspect the exact corresponding file in `topic-focus-lite` before coding.

The implementation prompt and PR report must identify:

1. Prototype file inspected.
2. Production file(s) changed.
3. Section-by-section mapping:
   - prototype section
   - production implementation section
   - intentional difference, if any
4. Any section omitted because production lacks the required data/service.
5. Honest fallback copy used for omitted/unavailable data.
6. Whether the PR is:
   - PASS — mergeable
   - PASS WITH FOLLOW-UP — acceptable but needs later polish
   - HOLD — do not merge; correction required

Do not accept vague "topic-focus-lite-style" language. The expected standard is page-by-page parity as closely as production routes and truthful data allow.

If exact parity is impossible, preserve the prototype section shape and use honest empty-state copy rather than fake data.

### Prototype route/file mapping

| Prototype route/file | Production route/file | Status |
| --- | --- | --- |
| Public landing: `topic-focus-lite/src/pages/PublicLanding.tsx` | Not part of current desktop app graduation unless explicitly scoped. | Out of current scope. |
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B merged, but parity gap exists; consider PR-B2 Home Lovable Parity Alignment. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C merged; may need PR-C2 parity audit/polish. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 open draft; do not merge until scope drift is removed and parity is reviewed. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | Future PR-E. |
| Topic Hub: `topic-focus-lite/src/pages/TopicHubPage.tsx` | `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` | Future PR-F. |
| Check & Improve: `topic-focus-lite/src/pages/CheckPage.tsx` | `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | Future PR-G or parity-correction pass. |
| Me / Progress: `topic-focus-lite/src/pages/MePage.tsx` | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | Future PR-H or parity-correction pass. |

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
- Current parity note: parity gap exists against `topic-focus-lite/src/pages/HomePage.tsx`; consider PR-B2 Home Lovable Parity Alignment.

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Scope: graduated desktop Practice Hub to the Level 2 workspace with existing production routes and no Task #362 dependencies.
- Current parity note: may need PR-C2 parity audit/polish against `topic-focus-lite/src/pages/PracticePage.tsx`.

### PR #21 — Desktop graduation state docs handoff

- Status: merged
- Branch: `docs/desktop-graduation-state`
- Merge SHA: `fc6d9ba8e448aa6b4da5548c92ddd74888775b34`
- Changed file: `docs/desktop-graduation-state.md`
- Scope: docs-only handoff for desktop graduation state and workflow rules.

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

### PR-D / PR #22 — Desktop Worksheet Workspace

- Status: merged
- Branch: `feat/desktop-pr-d-worksheet-workspace`
- Merge SHA: `415386853661fdb831b5615cdcb64dcd8800172c`
- Final head before merge: `aa8a67f517fccbe81855ee80cca0aa02774abb96`
- Final diff:
  - `M lazytopper/src/App.tsx`
  - `A lazytopper/src/lib/desktop/savedWorksheets.ts`
  - `A lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx`
- `artifacts/lazytopper-app/public/opengraph.jpg` was removed from the PR diff before merge.
- PR #17 / Task #362 remained untouched.
- Live preview QA gate was explicitly waived by the user before merge.
- ### PR-LANDING — Locked Public Landing + Reason-Aware Login Prompting

- Status: next recommended implementation PR
- Prototype files:
  - `topic-focus-lite/src/pages/PublicLanding.tsx`
  - `topic-focus-lite/src/pages/LoginGate.tsx`
  - `topic-focus-lite/src/context/LazyTopperContext.tsx`
- Production files likely involved:
  - `lazytopper/src/pages/Welcome.tsx`
  - `lazytopper/src/pages/Login.tsx`
  - optional helper files under `lazytopper/src/lib/desktop/*`
- Goal: implement locked public landing behavior, memory/resume prompts, and reason-aware login URLs such as `/login?reason=save-worksheet&redirect=/practice/worksheets`.
- Preserve real Clerk auth and existing `location.state.from` behavior unless explicitly changed.
- Do not blindly copy prototype `/app/*` routes into production.

## Obsolete work and stale states

The following are obsolete and must not be used as implementation instructions:

- Desktop Phase 1 / Shell + Home tasks
- Starting from old SHA `93e739c`
- Recreating `DesktopShell`, `DesktopHome` Level 1, or `MistakeIntelCard`
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome changes
- Broken PR-B v1 local implementation that imported Task #362-only code

Desktop Phase 1 tasks from `93e739c` remain obsolete.

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation
3. PR-C — Desktop Practice Hub Graduation
4. PR #21 — docs handoff
5. PR #23 — locked prototype parity docs
6. PR #24 — desktop graduation QA/state rules docs
7. PR-D / PR #22 — Desktop Worksheet Workspace

Open:

- PR #17 / Task #362 — draft preservation only; do not merge or import from.

Next recommended actions:

1. PR-LANDING — implement locked public landing and reason-aware login prompting.
2. PR-B2 — Home locked prototype + functional parity correction.
3. PR-C2 — Practice locked prototype + functional parity correction.
4. Then resume PR-E onward.

Future sequence after PR-D / parity corrections:

- PR-E — Desktop Exam Trends Graduation
- PR-F — Topic Hub Lite Graduation
- PR-G — Desktop Check & Improve Graduation
- PR-H — Desktop Me / Progress Graduation
- PR-I — source/returnTo hardening
- PR-J — final desktop parity polish

Do not start PR-E until PR-LANDING, PR-B2, and PR-C2 are resolved or the user explicitly changes the sequence.
## Mandatory Git sync rule

Every implementation task must end in GitHub, not just a Replit checkpoint.

For every implementation task:

1. Start from a fresh isolated clone or clean branch from the latest `origin/base/approved-thru-437` unless the task explicitly pins a SHA.
2. Create a task-specific feature branch, for example `feat/desktop-pr-c-practice-hub-graduation`.
3. Make only the scoped changes.
4. Inspect the exact corresponding file in `topic-focus-lite` and include the Locked Prototype Parity Rule mapping in the implementation prompt and PR report.
5. Make only the scoped changes.
6. Run the real product build:

   ```bash
   NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
   ```

7. Run the verifier:

   ```bash
   node scripts/verify-production-build.mjs
   ```

8. Push the feature branch to GitHub.
9. Open a PR into `base/approved-thru-437`.
10. Return an audit-ready report with PR URL, compare URL, base/head SHA, exact changed files, build result, verifier result, parity mapping, and explicit confirmations of files not touched.
11. Do not merge the PR unless the user explicitly asks after GPT/user audit.

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
