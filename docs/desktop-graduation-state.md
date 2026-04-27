# LazyTopper Desktop Graduation State

Last updated: 2026-04-27

This document is the durable handoff and operating-rule document for LazyTopper desktop graduation. Read it from GitHub at the start of every GPT session or Replit task, then verify live GitHub state directly before acting.

## Source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed base after PR-D merge: `415386853661fdb831b5615cdcb64dcd8800172c`
- Final locked desktop prototype repo: `https://github.com/chetan-anand-hub/topic-focus-lite`
- Historical desktop Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Historical mobile Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-navigator`

GitHub origin is the source of truth. Replit local workspace, local checkpoint commits, preview-only edits, task snapshots, and Replit "Ready for review" state are not product state unless pushed to GitHub and reviewed as a PR.

## How to use this document

At the start of every LazyTopper desktop task:

1. Read this file from GitHub, not from stale Replit local state.
2. Verify live GitHub state directly: base SHA, PR states, draft status, merged status, changed files, head SHAs.
3. Inspect the exact locked prototype file in `topic-focus-lite`.
4. Write or review the Replit prompt.
5. Run implementation in background/fresh clone, not Replit main, unless the task is explicitly a main-workspace sync.
6. Audit GitHub diff, not Replit summary alone.
7. Classify the result: `PASS`, `PASS WITH FOLLOW-UP`, or `HOLD`.
8. Update this document through a docs-only PR whenever project state or durable rules change.

GPT is the product thinker and auditor. Replit is the executor. GitHub is the source of truth. This file is the persistent memory/rulebook.

## Durable docs update rule

Update this file whenever any of these happen:

- a desktop graduation PR is merged,
- a major rule changes,
- a stale-state issue is discovered,
- a permanent audit rule is introduced,
- a prototype-to-production mapping changes,
- an open PR materially changes status,
- the recommended next step changes.

Use a docs-only branch and PR. Do not edit product code while updating this file.

## Locked Prototype Parity Rule

The final desktop prototype is not inspiration. It is the target. For each desktop graduation PR, the implementing agent must inspect the exact corresponding file in `topic-focus-lite` before coding.

Locked prototype parity means:

1. Visual parity: production preserves the prototype page shape, hierarchy, and key affordances.
2. Journey parity: the same user intent and flow are available in production, mapped to production routes.
3. Functional parity: visible actions do real work where production has or can safely build the functionality.
4. Real-data parity: production uses real LazyTopper data/services, not fake prototype data.

Every implementation prompt and PR report must identify:

- prototype file inspected,
- production file or files changed,
- section-by-section prototype to production mapping,
- intentional differences,
- any omitted section and why,
- real production data/service used,
- honest fallback copy if a service is temporarily unavailable,
- final classification: `PASS`, `PASS WITH FOLLOW-UP`, or `HOLD`.

Do not accept vague "topic-focus-lite-style" language. The expected standard is page-by-page parity as closely as production routes and truthful data allow.

Honest fallback copy is not the destination in final-stage product development. If missing functionality is practical to build by reorganizing or reusing existing LazyTopper functionality, build it or classify the PR as `HOLD`.

## Existing-product-first rule

Desktop graduation is not a product rebuild. Most functionality already exists in the product repo and should be reorganized, adapted, and wired into the locked desktop prototype experience.

For every page or correction PR:

1. Inspect the locked prototype file.
2. Search production for the existing implementation.
3. Reuse or adapt existing production functionality before writing new logic.
4. Build only small glue where needed: adapters, route helpers, view-model mappers, source/return helpers, local-save helpers.
5. Do not replace mature production behavior with shallow prototype imitation.
6. Do not invent fake learner data.
7. Do not present static reference data as the learner's own data.

## Live visual and navigation QA rule

A static source review plus a passing build is not enough to classify a visible desktop PR as fully merge-ready.

Before a visible desktop graduation PR can be classified `PASS — mergeable`, it should have a live preview QA pass from the PR branch, not Replit main/base state, including:

- preview URL or exact local preview command and branch,
- desktop viewport at least 1440px wide,
- screenshots for initial page and key state changes,
- click-through/navigation checks for visible CTAs,
- confirmation that production routes are used rather than prototype `/app/*` routes unless explicitly scoped,
- mobile-width unchanged confirmation when mobile is out of scope,
- build, verifier, and typecheck results where applicable.

A user may explicitly waive the live-preview gate. If waived, record that in the PR/state audit.

For PR-D / PR #22, the user explicitly waived the live-preview gate before merge.

## Replit workflow rule

Use Replit background tasks for implementation work. Background tasks must work from a fresh isolated clone or clean branch and push to GitHub.

Do not click `Apply changes to main version` for PR branch work unless the task is explicitly to sync/reset Replit main.

Before deploying or publishing from Replit, run a dedicated sync/reset task so Replit main exactly matches GitHub `origin/base/approved-thru-437`. Publishing from stale Replit main is unsafe.

## Landing and login prompting parity rule

The locked prototype includes public landing and reason-aware login prompting. This is part of the desktop product journey and remains missing from production.

Locked prototype files:

- `topic-focus-lite/src/pages/PublicLanding.tsx`
- `topic-focus-lite/src/pages/LoginGate.tsx`
- `topic-focus-lite/src/context/LazyTopperContext.tsx`

Production should preserve route conventions instead of blindly copying prototype `/app/*` routes.

Expected production mapping:

| Prototype behavior | Production equivalent |
| --- | --- |
| `/` public landing | production public landing / `Welcome` route unless explicitly changed |
| `/app/login?reason=...&redirect=...` | `/login?reason=...&redirect=...` |
| `/app` cockpit | production desktop Home / cockpit route according to current routing |
| `/app/practice/worksheet` | `/practice/worksheets` |
| `/app/check` | `/check-improve` |
| `/app/me` | `/me` |

Reason-aware login should support actions such as `start-trial`, `login`, `save-worksheet`, `upload-answers`, `grade-answer`, `open-progress`, `mistake-aware`, `mistake-aware-worksheet`, `start-full-mock`, and `open-check`, while preserving real Clerk auth and backward compatibility with existing `location.state.from` behavior unless explicitly changed.

## Prototype route/file mapping

| Prototype route/file | Production route/file | Status |
| --- | --- | --- |
| Public landing: `topic-focus-lite/src/pages/PublicLanding.tsx` | `lazytopper/src/pages/Welcome.tsx` and `lazytopper/src/pages/Login.tsx` | Future PR-LANDING. Required before final desktop completion. |
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B merged, but locked prototype and functional parity gap remains. Add PR-B2. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C merged, but locked prototype and functional parity gap remains. Add PR-C2. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 merged at `415386853661fdb831b5615cdcb64dcd8800172c`. Live preview gate waived by user. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | Future PR-E, after PR-LANDING / PR-B2 / PR-C2 unless user explicitly changes sequence. |
| Topic Hub: `topic-focus-lite/src/pages/TopicHubPage.tsx` | `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` | Future PR-F. |
| Check & Improve: `topic-focus-lite/src/pages/CheckPage.tsx` | `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | Future PR-G or parity-correction pass. |
| Me / Progress: `topic-focus-lite/src/pages/MePage.tsx` | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | Future PR-H or parity-correction pass. |

## Completed work

### Mobile Level 1

Mobile Level 1 has already been implemented. Do not touch mobile unless explicitly scoped.

### Desktop Level 1 / Phases 1-7

Desktop Level 1 / Phases 1-7 have already been implemented. Do not revive stale Phase 1 tasks.

### PR-A / PR #18 — Desktop Level 2 Foundation

- Status: merged
- Branch: `feat/desktop-pr-a-l2-foundation`
- Merge/squash SHA: `99da42d01385084dbda16b9d95fcae8b10d2663e`
- Scope: shared Level 2 foundation under `lazytopper/src/components/desktop/l2/*` and `lazytopper/src/lib/desktop/*`.

Final-stage audit note: acceptable foundation work, but future visible pages must not present static desktop mistake/reference data as learner history, and bridge topic catalogues must not claim full syllabus coverage unless wired to canonical production data.

### PR-B / PR #19 — Desktop Home Graduation

- Status: merged
- Branch: `feat/desktop-pr-b-home-graduation`
- Merge/squash SHA: `fde4ad3ce0dbfd665871454a55dfed9142687efa`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`

Final-stage audit note: truthful but not locked prototype + functional parity. Add PR-B2.

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`

Final-stage audit note: useful intent hub but not locked prototype + functional parity. Add PR-C2.

### PR #21 — Desktop graduation state docs handoff

- Status: merged
- Merge SHA: `fc6d9ba8e448aa6b4da5548c92ddd74888775b34`
- Scope: docs-only handoff.

### PR #23 — Locked Prototype Parity Rule docs

- Status: merged
- Merge SHA: `0aac23af7aa23823eb070925fa462621f0302dfa`
- Scope: docs-only locked prototype parity rule and mapping table.

### PR #24 — Desktop graduation QA and state rules docs

- Status: merged
- Merge SHA: `9fdc2e83ae4e5847d93183e7233a4974c97a9e65`
- Scope: docs-only addendum for QA/state rules.

### PR-D / PR #22 — Desktop Worksheet Workspace

- Status: merged
- Merge SHA: `415386853661fdb831b5615cdcb64dcd8800172c`
- Branch: `feat/desktop-pr-d-worksheet-workspace`
- Final head before merge: `aa8a67f517fccbe81855ee80cca0aa02774abb96`
- Full PR diff: 3 files
  - `M lazytopper/src/App.tsx`
  - `A lazytopper/src/lib/desktop/savedWorksheets.ts`
  - `A lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx`
- `opengraph.jpg` absent from final diff.
- PR #17 untouched.
- Live preview gate waived by user before merge.

## Open / do not merge without separate review

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

Do not use these as implementation instructions:

- Desktop Phase 1 / Shell + Home tasks
- starting from old SHA `93e739c`
- starting PR-D from old SHA `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- recreating `DesktopShell`, DesktopHome Level 1, or `MistakeIntelCard`
- branch `feat/desktop-phase-1-shell-home` as a current base
- local Replit checkpoint commits
- preview-only local DesktopHome changes
- broken PR-B v1 local implementation that imported Task #362-only code
- Replit local main workspace if it does not match GitHub origin

## Current implementation sequence

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation
3. PR-C — Desktop Practice Hub Graduation
4. PR #21 — docs handoff
5. PR #23 — locked prototype parity docs
6. PR #24 — QA/state rules docs
7. PR-D / PR #22 — Desktop Worksheet Workspace

Next recommended actions:

1. PR-LANDING — locked public landing and reason-aware login prompting.
2. PR-B2 — Home locked prototype + functional parity correction.
3. PR-C2 — Practice locked prototype + functional parity correction.
4. Then resume PR-E onward.

Future sequence:

- PR-E — Desktop Exam Trends Graduation
- PR-F — Topic Hub Lite Graduation
- PR-G — Desktop Check & Improve Graduation
- PR-H — Desktop Me / Progress Graduation
- PR-I — source/returnTo hardening
- PR-J — final desktop parity polish

Do not start PR-E until PR-LANDING, PR-B2, and PR-C2 decisions are resolved or the user explicitly changes the sequence.

## Mandatory Git sync rule

Every implementation task must end in GitHub, not just a Replit checkpoint.

For every implementation task:

1. Start from a fresh isolated clone or clean branch from latest `origin/base/approved-thru-437` unless the task explicitly pins a SHA.
2. Verify latest base SHA directly from GitHub before coding.
3. Create a task-specific feature branch.
4. Inspect the exact corresponding file in `topic-focus-lite` and include the Locked Prototype Parity Rule mapping.
5. Search production for existing real functionality before building new logic.
6. Make only scoped changes.
7. Run the real product build: `NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build`.
8. Run the verifier: `node scripts/verify-production-build.mjs`.
9. Run typecheck when TypeScript changed or the prompt requires it.
10. Push the feature branch to GitHub.
11. Open a PR into `base/approved-thru-437`.
12. Return PR URL, compare URL, base/head SHA, exact changed files, build/verifier/typecheck results, parity mapping, and confirmations of untouched files.
13. Do not merge unless the user explicitly asks after GPT/user audit.

## Route and product boundaries

Do not copy prototype `/app/*` route names into the React route system unless explicitly requested.

Preserve production route conventions:

- `/`
- `/practice-hub`
- `/practice/worksheets`
- `/practice/worksheets/ready`
- `/exam-trends`
- `/topic-hub`
- `/topic-hub/*`
- `/check-improve`
- `/me`

Mobile remains separate. Do not change mobile files, mobile nav, mobile routes, or landing/welcome unless explicitly instructed.

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

Do not add Tailwind, shadcn, Radix, lucide-react, or new npm packages. Use inline styles and inline SVG for desktop graduation work unless explicitly changed.

## Topic data warning

`lazytopper/src/lib/desktop/topics.ts` contains a small desktop Level 2 bridge catalogue. Before visible pages use it for broad topic selection or syllabus-wide claims, either wire it to canonical production topic/syllabus data or clearly label the UI as suggested/starter/temporary bridge data.
