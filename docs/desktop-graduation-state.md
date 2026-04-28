# LazyTopper Desktop Graduation State

Last updated: 2026-04-28

This document is the durable handoff and operating-rule document for LazyTopper desktop graduation. Read this from GitHub at the start of every GPT session or Replit task, then verify live GitHub state directly before acting.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base after PR-C2 / PR #29 merge: `9670db2618f376544c93c890abe5f67f7eb8be3a`
- Final locked desktop prototype repo: `https://github.com/chetan-anand-hub/topic-focus-lite`
- Historical desktop Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Historical mobile Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-navigator`

GitHub origin is the source of truth. Replit local workspace, local checkpoint commits, preview-only edits, task snapshots, and Replit “Ready for review” state are not product state unless pushed to GitHub and reviewed as a PR.

## Current status summary

- PR-B2 / PR #28 is merged. Desktop Home has been corrected against the locked `topic-focus-lite/src/pages/HomePage.tsx` target and real production data/services.
- PR-C2 / PR #29 is merged. Desktop Practice has been corrected against the locked `topic-focus-lite/src/pages/PracticePage.tsx` target, including the PR-C2.1 journey correction: in-page Quick Practice panel, real `generatePracticeQuestions`, real `getHighlyProbableQuestions`, honest downstream handoffs, and real-data-only Mistake Intelligence.
- PR-D / PR #22, PR-LANDING / PR #26, PR-B2 / PR #28, and PR-C2 / PR #29 together form the current Home + Practice + Worksheet + Landing foundation.
- PR #17 / Task #362 remains draft/preservation only. Do not merge it or import from it.
- PR-E must not start until this docs update is merged and the next task explicitly starts PR-E.

Recommended next actions:

1. Optional: run a Replit main sync/reset checkpoint if a clean preview/publish workspace is needed.
2. Run a short shared desktop data/service/route audit checkpoint before PR-E.
3. Start PR-E — Exam Trends locked-prototype + functional parity.

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

## PR-C2 lesson: visual shell is not enough

PR-C2 exposed an important product risk: a page can look close to the locked prototype while still failing the student journey if primary CTAs immediately hand the learner to an old-looking production flow.

Durable rule:

- A locked-prototype hub is not enough if the first core action immediately exits into an old product surface.
- For hub pages, at least the primary learner action should either stay inside a prototype-aligned production surface or be honestly labelled as an existing-engine handoff.
- Visual parity, functional parity, journey parity, and data honesty must be checked together before merge.
- Real data must be preferred over illustrative copy. If exact real data is unavailable, show an honest empty state, not fake learner or fake prediction data.

For Practice, this rule produced the PR-C2.1 correction:

- Quick Practice primary action opens an in-page generated practice panel.
- The panel uses real `generatePracticeQuestions` data or an honest empty state.
- The legacy `/practice/:grade/:subject` route is secondary only through “Continue in full practice engine”.
- HPQ tabs use real `getHighlyProbableQuestions` data or honest empty states.
- Worksheet/mock/chapter/paper handoffs are explicitly labelled as existing builders/engines when downstream pages are not yet locked-prototype aligned.

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

For PR-B2 / PR #28, validation passed; live QA was not fully captured in the PR body, so future Home polish should be screenshot-led if Home changes again.

For PR-C2 / PR #29, the Practice shell was live-checked and the first-click journey issue was corrected before merge. Future Practice changes must preserve the in-page Quick Practice panel and honest existing-engine handoffs.

## Replit workflow rule

Use Replit background tasks for implementation work. Background tasks must work from a fresh isolated clone or clean branch and push to GitHub.

Do not click `Apply changes to main version` for PR branch work unless the task is explicitly to sync/reset Replit main.

Before deploying or publishing from Replit, run a dedicated sync/reset task so Replit main exactly matches GitHub `origin/base/approved-thru-437`. Publishing from stale Replit main is unsafe.

### Replit main / main-repl rebase warning

During PR-C2, a system-triggered rebase onto `main-repl/main` polluted the PR branch with unrelated files because `main-repl/main` was behind `base/approved-thru-437`. The branch had to be repaired by rewinding to the clean PR head and reapplying only `DesktopPracticePage.tsx`.

Durable rule:

- Do not rebase PR branches onto Replit main or `main-repl/main`.
- Replit main is not source of truth.
- PR branches should be based on latest `origin/base/approved-thru-437`, unless a task explicitly pins a SHA.
- If a Replit system step tries to rebase onto main and pollutes the branch, stop immediately, create a backup branch, restore the clean PR/base lineage, and verify final GitHub diff against `origin/base/approved-thru-437`.
- Screenshot artifacts must not be committed unless explicitly requested.

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
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B2 / PR #28 merged at `64214acc162b09c2b40c436f955bc5a225e0fd50`. Home locked prototype + functional parity correction complete. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C2 / PR #29 merged at `9670db2618f376544c93c890abe5f67f7eb8be3a`. Practice locked prototype + PR-C2.1 journey correction complete. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 merged at `415386853661fdb831b5615cdcb64dcd8800172c`. Live preview gate waived by user. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | Future PR-E, after shared desktop data/service/route audit checkpoint. |
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

Final-stage audit note: PR-B was truthful but did not meet locked prototype + functional parity. PR-B2 completed the correction.

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Scope: graduated desktop Practice Hub to the Level 2 workspace with existing production routes and no Task #362 dependencies.

Final-stage audit note: PR-C was useful as an intent hub but did not meet locked prototype + functional parity. PR-C2 completed the correction.

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

### PR-B2 / PR #28 — Home locked prototype parity

- Status: merged
- Branch: `feat/desktop-pr-b2-home-locked-parity`
- Merge/squash SHA: `64214acc162b09c2b40c436f955bc5a225e0fd50`
- Final head before merge: `db40cb98b25eeb90d1624c32994b48c75a55c16e`
- Changed file:
  - `M lazytopper/src/pages/desktop/DesktopHome.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/HomePage.tsx` plus supporting prototype components/context.
- Scope: corrected Home against the locked prototype while preserving real production routes and real data.
- Real data/services used:
  - `useAuth()`
  - `useSubscription()`
  - `landingMemory.ts`
  - saved worksheet memory (`lazytopper.desktop.savedWorksheets.v1`)
  - `getMistakeLogs(uid, 7)` with local four-bucket aggregation
- No fake score / attempt / progress data was introduced.
- PR #17 / Task #362 remained untouched.
- Validation reported:
  - `pnpm --filter lazytopper exec tsc --noEmit` PASS
  - `NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build` PASS
  - `node scripts/verify-production-build.mjs` PASS

Final-stage audit note: Home is now on the corrected locked-prototype path. If Home is touched again, require fresh screenshots because PR-B2 live QA was not fully captured in the PR body.

### PR-C2 / PR #29 — Practice locked prototype parity + honest end-to-end journey

- Status: merged
- Branch: `feat/desktop-pr-c2-practice-locked-parity`
- Merge/squash SHA: `9670db2618f376544c93c890abe5f67f7eb8be3a`
- Final head before merge: `12555a5500b644fc408a3307c942fc273e923230`
- Changed file:
  - `M lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/PracticePage.tsx` plus supporting prototype components/context.
- Scope: corrected Practice against the locked prototype and then corrected the first-click journey issue found during live preview.
- Final PR diff was repaired to a single file after a bad Replit rebase temporarily polluted the branch.

Key implementation details:

- Page-local visual components preserve the locked prototype shape:
  - `PracticeContextBar`
  - `PracticeScopeBuilder`
  - `PracticePaperBlueprint`
- Quick Practice primary action now opens an in-page Generated quick practice panel instead of immediately routing to old `/practice/:grade/:subject` UI.
- Generated quick practice uses real `generatePracticeQuestions` data from `lazytopper/src/data/predictionDataService.ts` or an honest empty state.
- The legacy `/practice` engine is secondary only through “Continue in full practice engine”.
- Predicted/HPQ tabs use real `getHighlyProbableQuestions` data from `lazytopper/src/data/highlyProbableQuestions.ts` or honest empty states.
- Topic reference copy is clearly labelled as curated study cues, not generated/predicted questions.
- Worksheet opens the existing worksheet builder with honest copy.
- Full Mock, Chapter Test, and Practice Paper are labelled as existing engines/builders.
- Mistake Intelligence remains visible and real-data-only through `getMistakeLogs(user.uid, 7)`.
- PR #17 / Task #362 remained untouched.
- No screenshots, docs, `App.tsx`, `DesktopShell`, mobile files, package files, artifacts, or `opengraph.jpg` were included in the final diff.

Validation reported:

- `pnpm --filter lazytopper exec tsc --noEmit` PASS
- `NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build` PASS
- `node scripts/verify-production-build.mjs` PASS

Final-stage audit note: Practice now satisfies the core visual + journey + data-honesty standard for PR-C2. Future downstream pages still need their own locked-prototype passes; Practice now honestly labels existing-engine handoffs when the downstream surface is not yet updated.

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
- Starting PR-E from pre-PR-B2/PR-C2 base
- Recreating `DesktopShell`, DesktopHome Level 1, or `MistakeIntelCard`
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome changes
- Broken PR-B v1 local implementation that imported Task #362-only code
- Replit local main workspace if it does not match GitHub origin
- Replit `main-repl/main` as a base for feature branches
- Any branch state polluted by screenshot artifacts or unrelated ancestral files

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
10. PR-B2 / PR #28 — Home locked prototype + functional parity correction
11. PR-C2 / PR #29 — Practice locked prototype + PR-C2.1 honest end-to-end correction

Open:

- PR #17 / Task #362 — draft preservation only; do not merge or import from.

Next recommended actions:

1. Merge this docs-only update.
2. Optional Replit main sync/reset checkpoint if a clean preview/publish workspace is needed.
3. Shared desktop data/service/route audit checkpoint for PR-E/F/G/H.
4. PR-E — Exam Trends locked prototype + functional parity.

Future sequence:

- PR-E — Desktop Exam Trends Graduation
- PR-F — Topic Hub Lite Graduation
- PR-G — Desktop Check & Improve Graduation
- PR-H — Desktop Me / Progress Graduation
- PR-I — source/returnTo hardening
- PR-J — final desktop parity polish
- Mandatory Replit main sync/reset before publish

Do not start PR-E until PR-C2 and this docs update are merged, and the user explicitly approves starting PR-E.

## Shared desktop data/service/route audit checkpoint

Before PR-E, run a short audit-only checkpoint. No product code unless a tiny helper gap is explicitly approved.

Audit these sources:

- `lazytopper/src/App.tsx`
- `lazytopper/src/lib/desktop/navigation.ts`
- `lazytopper/src/lib/desktop/topics.ts`
- `lazytopper/src/lib/desktop/topicHubContent.ts`
- `lazytopper/src/data/highlyProbableQuestions.ts`
- prediction/practice generators, including `predictionDataService.ts`
- worksheet generation and saved worksheet helpers
- `mistakeLogService`
- Check & Improve page/service
- Me/Profile/progress sources
- login prompt helpers
- landing memory helpers

Expected output:

| Domain | Source of truth | Used by pages | Gaps |
| --- | --- | --- | --- |
| Topic identity | TBD | Practice, Trends, Topic Hub, Worksheet | TBD |
| HPQ / prediction | TBD | Practice, Trends, Topic Hub | TBD |
| Mistakes | `mistakeLogService` | Home, Practice, Worksheet, Check, Me | TBD |
| Saved worksheets | `savedWorksheets` / local storage | Home, Worksheet, Me | TBD |
| Auth/login | AuthContext + login prompts | All gated CTAs | TBD |

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
   ```

8. Run the production verifier:

   ```bash
   node scripts/verify-production-build.mjs
   ```

9. Run TypeScript when the prompt requires it or TypeScript changed:

   ```bash
   pnpm --filter lazytopper exec tsc --noEmit
   ```

10. Push to GitHub.
11. Return PR URL, base SHA, head SHA, changed files, build/verifier/typecheck results, screenshot paths, and PASS / PASS WITH FOLLOW-UP / HOLD classification.

## Replit main sync/reset checkpoint

Use this only when explicitly requested, usually after a stable checkpoint or before publish.

Purpose: make Replit main exactly match GitHub `origin/base/approved-thru-437`.

Required behavior:

1. Do not implement features.
2. Do not manually edit product code.
3. Do not open a product PR.
4. Show current local branch and HEAD.
5. Show local status and untracked files.
6. Fetch origin.
7. Show `origin/base/approved-thru-437` SHA.
8. List local-only/untracked files before deleting anything.
9. Stop if any local-only file looks like valuable product work.
10. Hard reset only after the user approves or the prompt explicitly authorizes it.
11. Clean stale artifacts only after listing them.
12. Confirm local HEAD equals `origin/base/approved-thru-437`.
13. Run build, verifier, and typecheck.
14. Return confirmation that Replit main is ready for preview/publish.

## Next PR planning notes

### PR-E — Exam Trends

Locked prototype:

- `topic-focus-lite/src/pages/TrendsPage.tsx`

Production target:

- `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx`

Current audit expectation:

- The existing desktop Exam Trends page may be an older static priority board.
- The locked prototype expects a filterable topic workflow with selected-topic tray, topic cards, and action routing.
- Reuse `desktopTopicsBySubject`, `desktopTopicBySlug`, HPQ/prediction data, and route helpers.
- Do not use hard-coded certainty claims like “96% likely” unless backed and honestly labelled.
- Plan PR-E and PR-F together at the data-contract level, but implement separately.

### PR-F — Topic Hub

Locked prototype:

- `topic-focus-lite/src/pages/TopicHubPage.tsx`

Production target:

- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`

Current audit expectation:

- Rebuild page shape around the locked prototype, not the older tabbed desktop surface if it diverges.
- Reuse `desktopTopicHubContentBySlug`, `desktopTopicBySlug`, HPQ routes, worksheet/practice/check links, and real `getMistakeLogs` only when signed in.
- Do not show fake topic-specific mistake claims such as “5 of last 8 errors” unless sourced from real logs.

### PR-G — Check & Improve

Locked prototype:

- `topic-focus-lite/src/pages/CheckPage.tsx`

Production target:

- `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx`

Current audit expectation:

- Reuse the real production/mobile Check & Improve grading service and result model where applicable.
- The desktop page must not keep static/fake graded results as product truth.
- This page should create/enrich real mistake data that Home, Practice, Worksheet, and Me can read.
- Do not import PR #17-only symbols.

### PR-H — Me / Progress

Locked prototype:

- `topic-focus-lite/src/pages/MePage.tsx`

Production target:

- `lazytopper/src/pages/desktop/DesktopMePage.tsx`

Current audit expectation:

- Highest data-honesty risk.
- Use real auth/subscription/profile state, saved worksheets, mistake logs, and any real attempt/progress sources.
- If real score/progress history does not exist, show honest empty states or labelled previews — do not invent average score, accuracy, weak areas, time-on-practice, or recent activity.
