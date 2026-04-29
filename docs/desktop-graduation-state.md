# LazyTopper Desktop Graduation State

Last updated: 2026-04-29

This document is the durable handoff and operating-rule document for LazyTopper desktop graduation. Read this from GitHub at the start of every GPT session or Replit task, then verify live GitHub state directly before acting.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base after PR-I1 / PR #36 merge: `328667b8f58314e0142cc7c4351187cb6b3e796c`
- Previous confirmed product base after PR-I0 / PR #35 merge: `7cf979ee95998fc96f610d0e1cbf1cb5035ebe20`
- Final locked desktop prototype repo: `https://github.com/chetan-anand-hub/topic-focus-lite`
- Historical desktop shell prototype repo: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Historical mobile Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-navigator`
- Locked Lovable prototype project: `https://lovable.dev/projects/621ea8b2-041a-4c1a-a1c9-fae3cf9b8a59`
- Locked Lovable prototype preview: `https://id-preview--621ea8b2-041a-4c1a-a1c9-fae3cf9b8a59.lovable.app/app/`
- Public possible Lovable prototype URL to verify later: `https://light-topic-pilot.lovable.app`

GitHub origin is the source of truth. Replit local workspace, local checkpoint commits, preview-only edits, task snapshots, and Replit "Ready for review" state are not product state unless pushed to GitHub and reviewed as a PR.

## Current status summary

- PR-I1 / PR #36 is merged. Desktop Topic Hub is now at locked-prototype feature + content parity, including the `ActionableTopicHubContent` contract, BoardConcept rows, FormulaUseCard, TopicSnapshot, common-mistake/examiner-warning copy, and `isSamplePreview` labelling. 14 priority topics are hand-seeded; the remaining catalogue topics fall back to clearly labelled sample-preview content. CTAs preserve `source=topicHub` and `returnTo`. BackToParent honours `?returnTo=...`. The HPQ compact card and personal mistake rows are driven only by real `getHighlyProbableQuestions` and real `getMistakeLogs` respectively. Verdict: PASS WITH FOLLOW-UP.
- PR-I0 / PR #35 is merged. Desktop topic catalogue is now at locked-prototype parity: 13 Maths + 13 Science = 26 topics, with aliases for `trigonometry-heights-distances`, `light-reflection-refraction`, and `acids-bases-salts`.
- PR-H / PR #34 is merged. Desktop Me / Progress is on real auth + real `loadInsights` attempts + real `getMistakeLogs`, with all fake metrics removed. Verdict: PASS WITH FOLLOW-UP — time-on-practice, last-5-mock-score, and trend deltas still lack real data paths.
- PR-G / PR #33 is merged. Desktop Check & Improve uses the real `checkSolutionImage` workflow plus real `logMistakes`. The unknown login reason `save-mistake-history` was repaired to `grade-answer`.
- PR-F / PR #32 was a first parity pass for Desktop Topic Hub. A later audit showed it was not fully prototype-complete; PR-I1 / PR #36 completed feature/content parity.
- PR-E / PR #31 is merged. Desktop Exam Trends is at locked-prototype parity, removing fake "96% likely / 10 years of papers" certainty claims and using `desktopTopicsBySubject` plus HPQ matching.
- PR-LANDING / PR #26, PR-B2 / PR #28, PR-C2 / PR #29 form the Landing + Home + Practice foundation. Login visual parity is still pending and is scheduled for PR-I2.
- PR #17 / Task #362 remains draft / preservation only. Do not merge it or import from it.
- The rendered Lovable prototype side-by-side comparison was deferred to PR-J because the implementing agent could not authenticate into the locked Lovable prototype.

Recommended next actions:

1. Merge this docs-only update (post-PR-I1).
2. PR-I2 — Login visual parity preserving real Clerk auth.
3. PR-I3 — Shell/sidebar honest Mistake Intel.
4. PR-I4 — Cross-route hardening.
5. PR-J — Final desktop polish/parity sweep, including the rendered Lovable side-by-side comparison.
6. Replit main sync/reset only after a stable checkpoint or before publishing.

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

GPT is the product thinker and auditor. Replit Agent Mode is the executor and can run live browser screenshots/clicks. GitHub is the source of truth. This file is the persistent memory/rulebook.

## Permanent rules

These rules apply to every LazyTopper desktop graduation task. They are durable and supersede ad-hoc task wording when in conflict.

- GitHub origin is the source of truth.
- Replit main is not source of truth.
- Every visible task must ask for a public preview URL that the auditor / Agent can open, screenshot, and click.
- GPT audits GitHub source. Agent Mode can do live browser screenshots and clicks.
- Do not classify a visible PR as `PASS` unless GitHub diff, validations, data honesty, and live output/click evidence all pass — unless the user explicitly waives the gate.
- The locked prototype is the target, not inspiration.
- Production must preserve real auth, services, data, routes, and honest empty states.
- No fake scores, fake progress, fake prediction certainty, fake mistake intelligence, or fake activity.
- The mobile app is a later phase. Current work is desktop unless explicitly scoped.
- The rendered Lovable side-by-side comparison is currently deferred to PR-J because of an auth / unsafe-browser issue. Acceptable resolutions: (a) public read-only Lovable preview, (b) running the exact `topic-focus-lite` source in an accessible preview, or (c) user-provided authenticated screenshots.
- PR #17 / Task #362 remains preservation-only. Do not import `aggregateErrorCategories`, `readLocalMistakeLogsSince`, or `ErrorCategory`.

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

The Level 1 prototypes are historical references. Do not use them as the current desktop target. The current desktop target is the Level 2 `topic-focus-lite` prototype, with the Lovable preview as the rendered visual reference.

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

Do not accept vague "topic-focus-lite-style" language. The expected standard is page-by-page parity as closely as production routes and truthful data allow.

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
- The legacy `/practice/:grade/:subject` route is secondary only through "Continue in full practice engine".
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
7. Do not present static reference data as the learner's own data.

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

1. **A public preview URL the auditor / Agent can open in a normal browser.** This is a hard requirement for every visible task. The URL must serve the PR branch and head SHA. If the URL is a Replit dev preview, note that the underlying container can idle and the URL must be re-warmed before each audit window.
2. Desktop viewport at least 1440px wide.
3. Screenshots for the initial page and each key state change. Pure-state expansions (More menus, accordions, panel toggles) that cannot be reached by the static screenshot tool must be flagged so the auditor captures them manually from the public URL.
4. Click-through / navigation checks for every visible CTA, with the observed URL or in-page state recorded.
5. Confirmation that production routes are used rather than prototype `/app/*` routes unless explicitly scoped. The browser URL may include `/app/` because of `BASE_PATH=/app/`; the React route literals in code must not.
6. Confirmation that mobile width below 1024px still renders the existing mobile flow when the PR claims mobile is untouched.
7. Build result.
8. Verifier result.
9. Typecheck result when TypeScript changed or when the prompt requires it.

A user may explicitly waive the live-preview gate. If waived, record that in the PR / state audit.

For PR-D / PR #22, the user explicitly waived the live-preview gate before merge.

For PR-LANDING / PR #26, live visual/navigation QA was completed before merge.

For PR-B2 / PR #28, validation passed; live QA was not fully captured in the PR body, so future Home polish should be screenshot-led if Home changes again.

For PR-C2 / PR #29, the Practice shell was live-checked and the first-click journey issue was corrected before merge. Future Practice changes must preserve the in-page Quick Practice panel and honest existing-engine handoffs.

For PR-E / PR #31, PR-G / PR #33, and PR-H / PR #34, validation and data-honesty audits passed; live preview screenshots are recommended for any follow-up polish.

For PR-I1 / PR #36, live preview / click audit was completed against the dev preview URL. Default-state screenshots, narrow-viewport non-overflow, sample-preview labelling, alias-route resolution, and BackToParent override were captured. Pure-state interactive panels (More menu, formula-use map expansion, Quick-hand panels) require manual click capture by the auditor.

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
- Replit's automatic checkpoint commits may add `.agents/`, `screenshots/`, `opengraph.jpg`, or other non-product files to the local branch. These must not be pushed. Verify the GitHub PR file list still shows only the intended product/docs files before requesting an audit.

### Replit main stale-workspace warning

Replit main is occasionally far behind `origin/base/approved-thru-437` (for example, after a sequence of feature merges has happened entirely through GitHub). When Replit main is stale:

- Publishing from Replit will ship stale code and is unsafe.
- A Replit Deployment from a feature-branch container will deploy the current container's working directory, not stale main, but it will still overwrite the live deployment slot. Use this only when the user has explicitly approved overwriting production.
- The safe path is to first run a Replit main sync/reset task so Replit main exactly matches `origin/base/approved-thru-437`, then publish.

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

Do not introduce new login `reason` values without checking that the production login page recognises them. The PR-G `save-mistake-history` → `grade-answer` repair shows what happens when an unknown reason is shipped.

Implementation must preserve real Clerk auth and backward compatibility with existing `location.state.from` behavior unless explicitly changed.

PR-LANDING / PR #26 implemented this foundation. Future pages should use this reason-aware login contract instead of creating ad hoc login prompts. PR-I2 will complete the visual parity pass for the Login surface itself.

## Prototype route/file mapping

| Prototype route/file | Production route/file | Status |
| --- | --- | --- |
| Public landing: `topic-focus-lite/src/pages/PublicLanding.tsx` | `lazytopper/src/pages/Welcome.tsx` and `lazytopper/src/pages/Login.tsx` | PR-LANDING / PR #26 merged at `5ee8568a330adb931521e6e770d798ae7d2f8671`. Public landing and reason-aware login prompting are implemented. Login visual parity is pending in PR-I2. |
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B2 / PR #28 merged at `64214acc162b09c2b40c436f955bc5a225e0fd50`. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C2 / PR #29 merged at `9670db2618f376544c93c890abe5f67f7eb8be3a`. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 merged at `415386853661fdb831b5615cdcb64dcd8800172c`. Live preview gate waived by user. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | PR-E / PR #31 merged. Fake certainty claims removed; uses `desktopTopicsBySubject` and HPQ matching. |
| Topic Hub: `topic-focus-lite/src/pages/TopicHubPage.tsx` | `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` and `lazytopper/src/lib/desktop/topicHubContent.ts` | PR-F / PR #32 first parity pass; PR-I1 / PR #36 completed feature/content parity at `328667b8f58314e0142cc7c4351187cb6b3e796c`. PASS WITH FOLLOW-UP — rendered Lovable side-by-side comparison deferred to PR-J. |
| Topic catalogue (data layer) | `lazytopper/src/lib/desktop/topics.ts` | PR-I0 / PR #35 merged at `7cf979ee95998fc96f610d0e1cbf1cb5035ebe20`. 13 Maths + 13 Science = 26 topics with three slug aliases. |
| Check & Improve: `topic-focus-lite/src/pages/CheckPage.tsx` | `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | PR-G / PR #33 merged. Real `checkSolutionImage` workflow + real `logMistakes`. Login reason `save-mistake-history` repaired to `grade-answer`. |
| Me / Progress: `topic-focus-lite/src/pages/MePage.tsx` | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | PR-H / PR #34 merged. Real auth + real `loadInsights` + real `getMistakeLogs`. PASS WITH FOLLOW-UP — time-on-practice, last-5-mock-score, and trend deltas still lack real data paths. |
| Shell / sidebar Mistake Intel | `lazytopper/src/components/desktop/...` (shell components) | Pending PR-I3. |
| Cross-route source/returnTo hardening | App-wide | Pending PR-I4. |
| Final desktop polish + Lovable side-by-side | App-wide | Pending PR-J. |

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
- Scope: additive Level 2 foundation under `lazytopper/src/components/desktop/l2/*` and `lazytopper/src/lib/desktop/*`.

PR-A added shared foundation. It did not mount visible pages.

Final-stage audit note: PR-A is acceptable foundation work, but future visible pages must not present static desktop mistake/reference data as learner history, and bridge topic catalogues must not claim full syllabus coverage unless wired to canonical production data.

### PR-B / PR #19 — Desktop Home Graduation

- Status: merged, superseded by PR-B2 / PR #28
- Branch: `feat/desktop-pr-b-home-graduation`
- Merge/squash SHA: `fde4ad3ce0dbfd665871454a55dfed9142687efa`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`

Final-stage audit note: PR-B was truthful but did not meet locked prototype + functional parity. PR-B2 completed the correction.

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged, superseded by PR-C2 / PR #29
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`

Final-stage audit note: PR-C was useful as an intent hub but did not meet locked prototype + functional parity. PR-C2 completed the correction.

### PR #21 — Desktop graduation state docs handoff

- Status: merged
- Branch: `docs/desktop-graduation-state`
- Merge SHA: `fc6d9ba8e448aa6b4da5548c92ddd74888775b34`
- Changed file: `docs/desktop-graduation-state.md`

### PR #23 — Locked Prototype Parity Rule docs

- Status: merged
- Branch: `docs/locked-prototype-parity-rule`
- Merge SHA: `0aac23af7aa23823eb070925fa462621f0302dfa`
- Changed file: `docs/desktop-graduation-state.md`

### PR #24 — Desktop graduation QA and state rules docs

- Status: merged
- Branch: `docs/desktop-graduation-qa-rules`
- Merge SHA: `9fdc2e83ae4e5847d93183e7233a4974c97a9e65`

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

### PR #25 — Post-PR-D desktop state docs

- Status: merged
- Branch: `docs/post-pr-d-desktop-state-1`
- Merge SHA: `6248823b9e533a3079926365a0a19824eb4d9b9f`
- Changed file: `docs/desktop-graduation-state.md`

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
- Live visual/navigation QA completed. QA verdict: `PASS`.
- Production reason-aware login route contract implemented: `/login?reason=...&redirect=...`.
- Real Clerk auth preserved. Existing `location.state.from` fallback preserved.
- Login visual parity (against the locked prototype) is still pending — scheduled for PR-I2.
- PR #17 / Task #362 remained untouched.

### PR-B2 / PR #28 — Home locked prototype parity

- Status: merged
- Branch: `feat/desktop-pr-b2-home-locked-parity`
- Merge/squash SHA: `64214acc162b09c2b40c436f955bc5a225e0fd50`
- Final head before merge: `db40cb98b25eeb90d1624c32994b48c75a55c16e`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/HomePage.tsx` plus supporting prototype components/context.
- Real data only: `useAuth()`, `useSubscription()`, `landingMemory.ts`, saved-worksheet memory, `getMistakeLogs(uid, 7)` with local four-bucket aggregation.
- No fake score / attempt / progress data introduced.
- PR #17 / Task #362 remained untouched.
- Validation: `pnpm --filter lazytopper exec tsc --noEmit` PASS, production build PASS, `node scripts/verify-production-build.mjs` PASS.

Final-stage audit note: Home is now on the corrected locked-prototype path. If Home is touched again, require fresh screenshots because PR-B2 live QA was not fully captured in the PR body.

### PR-C2 / PR #29 — Practice locked prototype parity + honest end-to-end journey

- Status: merged
- Branch: `feat/desktop-pr-c2-practice-locked-parity`
- Merge/squash SHA: `9670db2618f376544c93c890abe5f67f7eb8be3a`
- Final head before merge: `12555a5500b644fc408a3307c942fc273e923230`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/PracticePage.tsx`.
- Final PR diff was repaired to a single file after a bad Replit rebase temporarily polluted the branch.

Key implementation details:

- Page-local visual components preserve the locked prototype shape (`PracticeContextBar`, `PracticeScopeBuilder`, `PracticePaperBlueprint`).
- Quick Practice primary action opens an in-page Generated quick practice panel.
- Generated quick practice uses real `generatePracticeQuestions` data or an honest empty state.
- The legacy `/practice` engine is secondary only through "Continue in full practice engine".
- Predicted/HPQ tabs use real `getHighlyProbableQuestions` data or honest empty states.
- Topic reference copy is clearly labelled as curated study cues, not generated/predicted questions.
- Mistake Intelligence remains visible and real-data-only through `getMistakeLogs(user.uid, 7)`.
- PR #17 / Task #362 remained untouched.
- Validation: tsc PASS, production build PASS, verifier PASS.

### Docs PR #30 — Post-PR-B2/PR-C2 docs update

- Status: merged
- Changed file: `docs/desktop-graduation-state.md`
- Scope: docs-only update after PR-B2 and PR-C2.
- Superseded by this post-PR-I1 update.

### PR-E / PR #31 — Desktop Exam Trends locked prototype parity

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/TrendsPage.tsx`.
- Removed fake certainty claims such as "96% likely / 10 years of papers".
- Uses `desktopTopicsBySubject` and HPQ matching for real predicted-question counts.
- PR #17 / Task #362 remained untouched.

### PR-F / PR #32 — Desktop Topic Hub first parity pass

- Status: merged, superseded for feature/content parity by PR-I1 / PR #36
- Changed file: `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/TopicHubPage.tsx`.
- A later audit showed PR-F was not fully prototype-complete; PR-I1 / PR #36 completed feature/content parity.

### PR-G / PR #33 — Desktop Check & Improve real grading workflow

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/CheckPage.tsx`.
- Replaced fake graded preview with the real `checkSolutionImage` workflow plus real `logMistakes`.
- Repaired unknown login reason `save-mistake-history` → `grade-answer`.
- PR #17 / Task #362 remained untouched.

### PR-H / PR #34 — Desktop Me / Progress real-data + honest states

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopMePage.tsx`
- Prototype inspected: `topic-focus-lite/src/pages/MePage.tsx`.
- Removed fake metrics: `72/100`, `78%`, `9h24m`, fake weak areas, fake recent activity.
- Uses real auth, `loadInsights` attempts, and `getMistakeLogs`.
- Verdict: `PASS WITH FOLLOW-UP` — time-on-practice, last-5-mock-score, and trend deltas still lack real data paths and currently render honest empty/labelled states.
- PR #17 / Task #362 remained untouched.

### PR-I0 / PR #35 — Desktop topic catalogue parity

- Status: merged at `7cf979ee95998fc96f610d0e1cbf1cb5035ebe20`
- Changed file: `lazytopper/src/lib/desktop/topics.ts`
- Expanded the catalogue to 13 Maths + 13 Science = 26 topics.
- Added slug aliases:
  - `trigonometry-heights-distances` → `trigonometry`
  - `light-reflection-refraction` → `light-reflection-and-refraction`
  - `acids-bases-salts` → `acids-bases-and-salts`
- PR #17 / Task #362 remained untouched.

### PR-I1 / PR #36 — Desktop Topic Hub feature/content parity

- Status: merged at `328667b8f58314e0142cc7c4351187cb6b3e796c`
- Changed files:
  - `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
  - `lazytopper/src/lib/desktop/topicHubContent.ts`
- Prototype inspected: `topic-focus-lite/src/pages/TopicHubPage.tsx` and `topic-focus-lite/src/lib/topicHubContent.ts`.

Key implementation details:

- New `ActionableTopicHubContent` contract: `BoardConcept`, `FormulaUseCard`, `TopicSnapshot`, `commonMistake`, `examinerWarning`, `isSamplePreview`.
- 14 priority topics hand-seeded.
- Remaining catalogue topics use clearly-labelled sample-preview fallback content.
- BackToParent honours `?returnTo=...` and falls back to `/exam-trends?subject=...` otherwise.
- TopicStrip surfaces the `Sample preview` chip when applicable.
- Compact action bar: Practice / Worksheet / Predicted Qs / Add to selection / More.
- More menu includes Chapter Test, Check answer, and Mistake-aware worksheet.
- Board Essentials open by default with concept rows, marks-band pills, and Practise-this CTAs.
- "How boards use it" includes a marquee formula card, the full formula-use map (whenToUse / directUse / hiddenUse / combinedUse / commonTrap), and an HPQ compact card driven only by real `getHighlyProbableQuestions`.
- "Mistakes & next action" uses reference common-mistake / examiner warning copy plus personal mistake rows, where personal rows only render when real `getMistakeLogs(uid, 7)` returns entries.
- Right rail Topic snapshot rewired (Subject / Trend / Weight / Marks band / Likely section / Examiner notes), with sample-preview disclaimers when applicable.
- "Need a quick hand" exposes Explain concept / Show visual / Mini check as static reference support, explicitly labelled as "Static reference content — not generated tutor output".
- All CTAs preserve `source=topicHub` and a URL-encoded `returnTo`.
- No `/app/*` route literals introduced in code.
- PR #17 / Task #362 remained untouched.
- Validation reported green.
- Agent production browser/click audit passed with follow-up.
- Rendered Lovable prototype side-by-side comparison was deferred to PR-J because the Agent could not authenticate into the locked Lovable prototype.
- Verdict: `PASS WITH FOLLOW-UP`.

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
- Starting PR-I1 from pre-PR-I0 base
- Recreating `DesktopShell`, DesktopHome Level 1, or `MistakeIntelCard`
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome changes
- Broken PR-B v1 local implementation that imported Task #362-only code
- Replit local main workspace if it does not match GitHub origin
- Replit `main-repl/main` as a base for feature branches
- Any branch state polluted by screenshot artifacts, `.agents/` files, `opengraph.jpg`, or unrelated ancestral files
- The pre-PR-I1 first-pass Topic Hub content layer, which lacked the `ActionableTopicHubContent` contract

Desktop Phase 1 tasks from `93e739c` remain obsolete.

## Current implementation sequence

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation (superseded by PR-B2)
3. PR-C — Desktop Practice Hub Graduation (superseded by PR-C2)
4. PR #21 — docs handoff
5. PR #23 — locked prototype parity docs
6. PR #24 — QA/state rules docs
7. PR-D / PR #22 — Desktop Worksheet Workspace
8. PR #25 — post-PR-D state docs
9. PR-LANDING / PR #26 — Public Landing + Reason-Aware Login Prompting
10. PR-B2 / PR #28 — Home locked prototype + functional parity correction
11. PR-C2 / PR #29 — Practice locked prototype + PR-C2.1 honest end-to-end correction
12. Docs PR #30 — post-PR-B2/PR-C2 state docs
13. PR-E / PR #31 — Desktop Exam Trends locked prototype parity
14. PR-F / PR #32 — Desktop Topic Hub first parity pass (superseded for feature/content parity by PR-I1)
15. PR-G / PR #33 — Desktop Check & Improve real grading workflow
16. PR-H / PR #34 — Desktop Me / Progress real-data + honest states (PASS WITH FOLLOW-UP)
17. PR-I0 / PR #35 — Desktop topic catalogue parity
18. PR-I1 / PR #36 — Desktop Topic Hub feature/content parity (PASS WITH FOLLOW-UP)

Open:

- PR #17 / Task #362 — draft preservation only; do not merge or import from.

Next recommended actions:

1. Merge this docs-only update.
2. PR-I2 — Login visual parity preserving real Clerk auth.
3. PR-I3 — Shell/sidebar honest Mistake Intel.
4. PR-I4 — Cross-route source/returnTo hardening.
5. PR-J — Final desktop polish/parity sweep, including the rendered Lovable side-by-side comparison.
6. Replit main sync/reset only after a stable checkpoint or before publishing.

Do not start PR-I2 until this docs update is merged and the user explicitly approves starting PR-I2.

## Shared desktop data/service/route audit checkpoint

Run a short audit-only checkpoint whenever a new desktop graduation arc begins or a major data-source change is suspected. No product code unless a tiny helper gap is explicitly approved.

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
| Topic identity | `lib/desktop/topics.ts` (PR-I0) | Practice, Trends, Topic Hub, Worksheet | none known |
| Topic Hub content | `lib/desktop/topicHubContent.ts` (PR-I1) | Topic Hub | sample-preview topics outside the 14 hand-seeded; rendered Lovable side-by-side deferred to PR-J |
| HPQ / prediction | `data/highlyProbableQuestions.ts`, `predictionDataService.ts` | Practice, Trends, Topic Hub | none known |
| Mistakes | `services/mistakeLogService` | Home, Practice, Worksheet, Check, Me, Topic Hub | shell/sidebar Mistake Intel pending PR-I3 |
| Saved worksheets | `lib/desktop/savedWorksheets` (local storage) | Home, Worksheet, Me | none known |
| Auth/login | AuthContext + `lib/desktop/loginPrompts` | All gated CTAs | login visual parity pending PR-I2 |
| Time-on-practice / last-5-mock-score / trend deltas | not yet wired | Me | follow-up from PR-H |

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
11. Provide a public preview URL for visible PRs and confirm what branch/SHA it serves.
12. Return PR URL, base SHA, head SHA, changed files, build/verifier/typecheck results, screenshot paths, observed-CTA URLs, and PASS / PASS WITH FOLLOW-UP / HOLD classification.

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

### PR-I2 — Login visual parity

Locked prototype:

- `topic-focus-lite/src/pages/LoginGate.tsx` and supporting components.

Production target:

- `lazytopper/src/pages/Login.tsx` (and, if needed, the supporting `lib/desktop/loginPrompts.ts`).

Current audit expectation:

- Visual parity pass over the Login surface: layout, typography, social/OAuth providers (preserve real Clerk providers), reason-aware copy presentation, redirect handling, and error states.
- Must preserve the existing `/login?reason=...&redirect=...` route contract introduced in PR-LANDING.
- Must preserve real Clerk auth and existing `location.state.from` fallback.
- Do not introduce new login `reason` values that the production page does not recognise.
- Do not regress the reason-aware copy already wired by PR-G's `grade-answer` repair.

### PR-I3 — Shell/sidebar honest Mistake Intel

Production target:

- The desktop shell/sidebar Mistake Intel surface (under `lazytopper/src/components/desktop/...`).

Current audit expectation:

- The shell/sidebar Mistake Intel must use real `getMistakeLogs(uid, 7)` only.
- Signed-out and no-data states must be honest — no fake counts, no fake "X of last Y errors" claims, no fake learner trends.
- Match the locked prototype's shell/sidebar Mistake Intel layout where production has the data; otherwise show a labelled empty/sign-in state.
- Do not import PR #17-only symbols.

### PR-I4 — Cross-route source/returnTo hardening

Production target:

- App-wide route helpers and CTA wiring.

Current audit expectation:

- Audit every desktop CTA that crosses pages (Home, Practice, Worksheet, Trends, Topic Hub, Check, Me, Login).
- Confirm `source=...` and `returnTo=...` are preserved end-to-end and URL-encoded consistently.
- Confirm BackToParent on every hub honours an explicit `?returnTo=...` and falls back to a sensible parent route.
- Confirm no React route literal includes `/app/*` (React routes must be production routes; the browser URL gets `/app/` only via `BASE_PATH`).
- Add a small shared helper if the same source/returnTo composition is being repeated across files.

### PR-J — Final desktop polish + Lovable side-by-side

Production target:

- All desktop graduation pages.

Current audit expectation:

- Run the rendered Lovable prototype side-by-side comparison that was deferred from PR-I1.
- Resolve through one of: (a) public read-only Lovable preview, (b) running the exact `topic-focus-lite` source in an accessible preview, (c) user-provided authenticated screenshots.
- Capture any final visual / copy / spacing gaps and resolve them.
- Confirm PASS-WITH-FOLLOW-UP carry-overs from PR-H (time-on-practice, last-5-mock-score, trend deltas) and PR-I1 (sample-preview topics outside the 14 hand-seeded) are either resolved, scoped to a follow-up PR, or explicitly accepted as final empty/labelled states.
- Mandatory Replit main sync/reset before publish.
