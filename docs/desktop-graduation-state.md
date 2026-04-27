# LazyTopper Desktop Graduation State

Last updated: 2026-04-27

This document is the durable handoff and operating-rule document for LazyTopper desktop graduation. Read this from GitHub at the start of every GPT session or Replit task, then verify live GitHub state directly before acting.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base after PR-LANDING / PR #26 merge: `5ee8568a330adb931521e6e770d798ae7d2f8671`
- Final locked desktop prototype repo: `https://github.com/chetan-anand-hub/topic-focus-lite`
- Historical desktop Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Historical mobile Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-navigator`

GitHub origin is the source of truth. Replit local workspace, local checkpoint commits, preview-only edits, task snapshots, and Replit “Ready for review” state are not product state unless pushed to GitHub and reviewed as a PR.

## How to use this document

At the start of every LazyTopper desktop task:

1. Read this file from GitHub, not from stale Replit local state.
2. Verify live GitHub state directly:
   - current `base/approved-thru-437` SHA
   - PR states
   - draft status
   - merged status
   - changed files
   - head SHAs
3. Inspect the exact locked prototype file in `topic-focus-lite`.
4. Write or review the Replit prompt.
5. Run implementation in Replit background/fresh clone, not Replit main, unless the task is explicitly a main-workspace sync.
6. Audit GitHub diff, not Replit summary alone.
7. Classify the result:
   - `PASS`
   - `PASS WITH FOLLOW-UP`
   - `HOLD`
8. Update this document through a docs-only PR whenever project state or durable rules change.

GPT is the product thinker and auditor. Replit is the executor. GitHub is the source of truth. This file is the persistent memory/rulebook.

## Durable docs update rule

Update this file whenever any of these happen:

- a desktop graduation PR is merged
- a major rule changes
- a stale-state issue is discovered
- a permanent audit rule is introduced
- a prototype-to-production mapping changes
- an open PR materially changes status
- the recommended next step changes

Use a docs-only branch and PR. Do not edit product code while updating this file.

## Historical prototypes

- Desktop Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Mobile Level 1 baseline: `https://github.com/chetan-anand-hub/lazytopper-navigator`

The Level 1 prototypes are historical references. Do not use them as the current desktop target. The current desktop target is the Level 2 `topic-focus-lite` prototype.

## Locked Prototype Parity Rule

The final desktop prototype is not inspiration. It is the target. For each desktop graduation PR, the implementing agent must inspect the exact corresponding file in `topic-focus-lite` before coding.

Locked prototype parity means:

1. Visual parity — production preserves the prototype page shape, hierarchy, and key affordances.
2. Journey parity — the same user intent and flow are available in production, mapped to production routes.
3. Functional parity — visible actions do real work where production has or can safely build the functionality.
4. Real-data parity — production uses real LazyTopper data/services, not fake prototype data.

Every implementation prompt and PR report must identify:

1. Prototype file inspected.
2. Production file(s) changed.
3. Section-by-section mapping:
   - prototype section
   - production implementation section
   - intentional difference, if any
4. Any section omitted because production lacks the required data/service.
5. Real production data/service used for each functional section.
6. Honest fallback copy used for omitted/unavailable data.
7. Whether the PR is:
   - `PASS — mergeable`
   - `PASS WITH FOLLOW-UP — acceptable but needs later polish`
   - `HOLD — do not merge; correction required`

Do not accept vague “topic-focus-lite-style” language. The expected standard is page-by-page parity as closely as production routes and truthful data allow.

If exact parity is impossible, preserve the prototype section shape and use honest empty-state copy only as a temporary bridge. In final-stage product development, fallback copy is not the destination. If a missing function is practical to build by reusing existing product functionality, build it or classify the PR as `HOLD`.

## Existing-product-first rule

Desktop graduation is not a rebuild from scratch.

Most functionality already exists in the product repo and should be reorganized, adapted, and wired into the locked desktop prototype experience.

For every desktop page or correction PR:

1. Inspect the locked prototype file to understand the target page shape and journey.
2. Search the production repo for the existing LazyTopper implementation.
3. Reuse, adapt, or recompose existing production functionality before writing new logic.
4. Build only the smallest glue needed, such as:
   - desktop adapters
   - route helpers
   - view-model mappers
   - source/return helpers
   - local-save helpers
   - login/reason prompt helpers
5. Do not replace mature production behavior with shallow prototype imitation.
6. Do not invent fake learner data.
7. Do not present static reference data as the learner’s own data.

Examples of existing production systems to prefer before building new code:

- worksheet generation
- HPQs and predicted questions
- practice/question generation
- Check & Improve
- mistake logs
- auth / Clerk
- trial or premium gates
- progress / saved attempts
- mocks / chapter tests
- Topic Hub data
- route helpers and source/returnTo handling

## Live visual and navigation QA rule

A static source review plus a passing build is not enough to classify a visible desktop graduation PR as fully merge-ready.

Before a visible desktop graduation PR can be classified `PASS — mergeable`, it should have a live preview QA pass from the PR branch, not Replit main/base state.

The live QA pass should include:

1. Preview URL or exact local preview command and branch.
2. Desktop viewport at least 1440px wide.
3. Screenshots for initial page and key state changes.
4. Click-through/navigation checks for visible CTAs.
5. Confirmation that production routes are used rather than prototype `/app/*` routes unless explicitly scoped.
6. Confirmation that mobile width below 1024px still renders the existing mobile flow when the PR claims mobile is untouched.
7. Build result.
8. Verifier result.
9. Typecheck result when TypeScript changed or when the prompt requires it.

A user may explicitly waive the live-preview gate. If waived, record that in the PR/state audit.

For PR-D / PR #22, the user explicitly waived the live-preview gate before merge.

For PR-LANDING / PR #26, live visual/navigation QA was completed before merge.

## Replit workflow rule

Use Replit background tasks for implementation work. Background tasks must work from a fresh isolated clone or clean branch and push to GitHub.

Do not click `Apply changes to main version` for PR branch work unless the task is explicitly to sync/reset Replit main.

Before deploying or publishing from Replit, run a dedicated sync/reset task so Replit main exactly matches GitHub `origin/base/approved-thru-437`. Publishing from stale Replit main is unsafe.

## Landing and login prompting parity rule

The locked prototype includes public landing and reason-aware login prompting. This behavior is part of the desktop product journey.

Locked prototype files:

- `topic-focus-lite/src/pages/PublicLanding.tsx`
- `topic-focus-lite/src/pages/LoginGate.tsx`
- `topic-focus-lite/src/context/LazyTopperContext.tsx`

Production must preserve production route conventions rather than blindly copying prototype `/app/*` routes.

Expected production mapping:

| Prototype behavior | Production equivalent |
| --- | --- |
| `/` public landing | production public landing / `Welcome` route unless explicitly changed |
| `/app/login?reason=...&redirect=...` | `/login?reason=...&redirect=...` |
| `/app` cockpit | production desktop Home / cockpit route according to current routing |
| `/app/practice/worksheet` | `/practice/worksheets` |
| `/app/check` | `/check-improve` |
| `/app/me` | `/me` |

Production login prompting should support reason-aware copy and redirects for actions such as:

- `start-trial`
- `login`
- `save-worksheet`
- `upload-answers`
- `grade-answer`
- `open-progress`
- `mistake-aware`
- `mistake-aware-worksheet`
- `start-full-mock`
- `open-check`

Implementation must preserve real Clerk auth and backward compatibility with existing `location.state.from` behavior unless explicitly changed.

PR-LANDING / PR #26 implemented this foundation. Future pages should use this reason-aware login contract instead of creating ad hoc login prompts.

## Prototype route/file mapping

| Prototype route/file | Production route/file | Status |
| --- | --- | --- |
| Public landing: `topic-focus-lite/src/pages/PublicLanding.tsx` | `lazytopper/src/pages/Welcome.tsx` and `lazytopper/src/pages/Login.tsx` | PR-LANDING / PR #26 merged at `5ee8568a330adb931521e6e770d798ae7d2f8671`. Public landing and reason-aware login prompting are implemented. |
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B merged, but locked prototype + functional parity gap remains. Add PR-B2. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C merged, but locked prototype + functional parity gap remains. Add PR-C2. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 merged at `415386853661fdb831b5615cdcb64dcd8800172c`. Live preview gate waived by user. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | Future PR-E, after PR-B2 / PR-C2 unless user explicitly changes sequence. |
| Topic Hub: `topic-focus-lite/src/pages/TopicHubPage.tsx` | `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` | Future PR-F. |
| Check & Improve: `topic-focus-lite/src/pages/CheckPage.tsx` | `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | Future PR-G or parity-correction pass. |
| Me / Progress: `topic-focus-lite/src/pages/MePage.tsx` | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | Future PR-H or parity-correction pass. |

## Completed work

### Mobile Level 1

Mobile Level 1 has already been implemented. Do not touch mobile unless explicitly scoped.

### Desktop Level 1 / Phases 1-7

Desktop Level 1 / Phases 1-7 have already been implemented. The desktop shell and desktop pages already exist.

Do not revive stale Desktop Phase 1 / Shell + Home tasks.

### PR-A / PR #18 — Desktop Level 2 Foundation

- Status: merged
- Branch: `feat/desktop-pr-a-l2-foundation`
- Merge/squash SHA: `99da42d01385084dbda16b9d95fcae8b10d2663e`
- Scope: additive Level 2 foundation under:
  - `lazytopper/src/components/desktop/l2/*`
  - `lazytopper/src/lib/desktop/*`

PR-A added shared foundation. It did not mount visible pages.

Final-stage audit note: PR-A is acceptable foundation work, but future visible pages must not present static desktop mistake/reference data as learner history, and bridge topic catalogues must not claim full syllabus coverage unless wired to canonical production data.

### PR-B / PR #19 — Desktop Home Graduation

- Status: merged
- Branch: `feat/desktop-pr-b-home-graduation`
- Merge/squash SHA: `fde4ad3ce0dbfd665871454a55dfed9142687efa`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`
- Scope: graduated desktop Home to a topic-focus-lite-style workspace with honest copy and no Task #362 dependencies.

Final-stage audit note: PR-B is truthful but does not meet locked prototype + functional parity. Add PR-B2.

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Scope: graduated desktop Practice Hub to the Level 2 workspace with existing production routes and no Task #362 dependencies.

Final-stage audit note: PR-C is useful as an intent hub but does not meet locked prototype + functional parity. Add PR-C2.

### PR #21 — Desktop graduation state docs handoff

- Status: merged
- Branch: `docs/desktop-graduation-state`
- Merge SHA: `fc6d9ba8e448aa6b4da5548c92ddd74888775b34`
- Changed file: `docs/desktop-graduation-state.md`
- Scope: docs-only handoff for desktop graduation state and workflow rules.

### PR #23 — Locked Prototype Parity Rule docs

- Status: merged
- Branch: `docs/locked-prototype-parity-rule`
- Merge SHA: `0aac23af7aa23823eb070925fa462621f0302dfa`
- Changed file: `docs/desktop-graduation-state.md`
- Scope: docs-only addition of the locked prototype parity rule and prototype mapping table.

### PR #24 — Desktop graduation QA and state rules docs

- Status: merged
- Branch: `docs/desktop-graduation-qa-rules`
- Merge SHA: `9fdc2e83ae4e5847d93183e7233a4974c97a9e65`
- Scope: docs-only addendum for QA/state rules.

### PR-D / PR #22 — Desktop Worksheet Workspace

- Status: merged
- Branch: `feat/desktop-pr-d-worksheet-workspace`
- Merge SHA: `415386853661fdb831b5615cdcb64dcd8800172c`
- Final head before merge: `aa8a67f517fccbe81855ee80cca0aa02774abb96`
- Full PR diff: 3 files
  - `M lazytopper/src/App.tsx`
  - `A lazytopper/src/lib/desktop/savedWorksheets.ts`
  - `A lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx`
- `artifacts/lazytopper-app/public/opengraph.jpg` was removed from the PR diff before merge.
- PR #17 / Task #362 remained untouched.
- Live preview QA gate was explicitly waived by the user before merge.

PR-D implemented desktop Worksheet workspace parity, including real multi-topic/full-subject generation, local saved worksheets, and additive mistake-aware mini-section behavior.

### PR #25 — Post-PR-D desktop state docs

- Status: merged
- Branch: `docs/post-pr-d-desktop-state-1`
- Merge SHA: `6248823b9e533a3079926365a0a19824eb4d9b9f`
- Changed file: `docs/desktop-graduation-state.md`
- Scope: docs-only update after PR-D.

### PR-LANDING / PR #26 — Public Landing + Reason-Aware Login Prompting

- Status: merged
- Branch: `feat/desktop-pr-landing-public-landing`
- Merge SHA: `5ee8568a330adb931521e6e770d798ae7d2f8671`
- Final head before merge: `fba814476ecda38593ac4e9e5d95f8275ba31c79`
- Changed files:
  - `M lazytopper/src/pages/Welcome.tsx`
  - `M lazytopper/src/pages/Login.tsx`
  - `A lazytopper/src/lib/desktop/landingMemory.ts`
  - `A lazytopper/src/lib/desktop/loginPrompts.ts`
- Live visual/navigation QA completed.
- QA verdict: `PASS`.
- Minor deviation accepted: `Start fresh` routes through `/onboarding`, which is production-appropriate because it preserves the existing onboarding/profile setup flow.
- Real Clerk auth preserved.
- Existing `location.state.from` fallback preserved.
- Production reason-aware login route contract implemented:
  - `/login?reason=...&redirect=...`
- Prototype `/app/*` routes were not copied into production.
- PR #17 / Task #362 remained untouched.

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
- Starting from old SHA `93e739c`
- Starting PR-D from old SHA `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Recreating `DesktopShell`, DesktopHome Level 1, or `MistakeIntelCard`
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome changes
- Broken PR-B v1 local implementation that imported Task #362-only code
- Replit local main workspace if it does not match GitHub origin

Desktop Phase 1 tasks from `93e739c` remain obsolete.

## Current implementation sequence

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation
3. PR-C — Desktop Practice Hub Graduation
4. PR #21 — docs handoff
5. PR #23 — locked prototype parity docs
6. PR #24 — QA/state rules docs
7. PR-D / PR #22 — Desktop Worksheet Workspace
8. PR #25 — post-PR-D state docs
9. PR-LANDING / PR #26 — Public Landing + Reason-Aware Login Prompting

Open:

- PR #17 / Task #362 — draft preservation only; do not merge or import from.

Next recommended actions:

1. PR-B2 — Home locked prototype + functional parity correction.
2. PR-C2 — Practice locked prototype + functional parity correction.
3. Then resume PR-E onward.

Future sequence:

- PR-E — Desktop Exam Trends Graduation
- PR-F — Topic Hub Lite Graduation
- PR-G — Desktop Check & Improve Graduation
- PR-H — Desktop Me / Progress Graduation
- PR-I — source/returnTo hardening
- PR-J — final desktop parity polish

Do not start PR-E until PR-B2 and PR-C2 are resolved or the user explicitly changes the sequence.

## Mandatory Git sync rule

Every implementation task must end in GitHub, not just a Replit checkpoint.

For every implementation task:

1. Start from a fresh isolated clone or clean branch from the latest `origin/base/approved-thru-437` unless the task explicitly pins a SHA.
2. Verify the latest base SHA directly from GitHub before coding.
3. Create a task-specific feature branch.
4. Inspect the exact corresponding file in `topic-focus-lite` and include the Locked Prototype Parity Rule mapping in the implementation prompt and PR report.
5. Search the product repo for existing real functionality before building new logic.
6. Make only the scoped changes.
7. Run the real product build:

   ```bash
   NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
