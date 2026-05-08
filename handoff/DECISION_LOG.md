## 2026-05-08T18:33:03Z - Manual authenticated QA may substitute for Browser Agent when HPQ preview is gated

Decision:
Manual authenticated QA may substitute for Browser Agent when the premium/trial gate blocks HPQ preview and Browser Agent cannot complete magic-link email authentication.

Details:
- Browser Agent saw the Premium Feature interstitial for HPQ / Exam Trends in guest state.
- Browser Agent cannot access the user's authenticated trial session or magic-link inbox.
- Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.
- Manual QA must include screenshots or explicit QA evidence and be recorded in handoff.
- This substitution does not remove the need for final GPT GitHub diff audit.

Implication:
Classify HPQ Browser Agent QA as inconclusive due to auth/paywall limitation, not as a product failure, when manual authenticated QA covers the gated HPQ preview.

## 2026-05-08T18:33:03Z - Post-PR #72 sequence is Practice details, Mock pages, then question/solution quality

Decision:
After PR #72 merges, the next product sequence is Practice Level-3 detail finalisation, then Mock pages Level-3 detail finalisation, then HPQ question/solution quality work.

Details:
- PR #72 should not expand into question-bank or solution-quality repair.
- Practice detail pass happens next after merge.
- Mock page detail pass follows Practice.
- HPQ question/solution quality begins only after Practice and Mock Level-3 surfaces are finalised, unless the product owner explicitly reprioritises.
- Science/Maths structured MCQ options normalization remains later data-quality work.

Implication:
Do not start question-bank, diagram, solution-cache, or MCQ data normalization work before Practice and Mock pages unless the product owner changes priority.

## 2026-05-08T15:37:18Z - PR #72 HPQ prediction-first execution doctrine

Decision:
HPQ is prediction-first, not a generic Practice mode page. Competency questions belong inside predicted topic-wise stacks, not in a separate top-level exam-format mode.

Details:
- HPQ should lead with predicted/high-probability topic stacks.
- Competency visibility may appear as stack counts and question labels.
- Do not add a main exam-format switch to HPQ.
- Do not surface internal prediction rationale, raw confidence percentages, or guaranteed-style claims to students.

Implication:
Future HPQ work should reinforce prediction-first revision, not convert HPQ into a generic filtering/practice surface.

## 2026-05-08T15:37:18Z - PR #72 HPQ execution-loop data honesty

Decision:
Add to mock remains planning-only until an actual graded mock flow exists. Check my answer and Show steps / Show logic are mutually exclusive per question. MCQ / Assertion-Reason wrong clicks do not log Mistake Intelligence in PR #72.

Details:
- Check my answer is the real checking path for non-MCQ HPQ questions.
- Show steps and Show logic are learning support only.
- Add to mock means local basket/planning only.
- MCQ clicks are immediate feedback only and are not saved as real mistake evidence.
- Mistake Intelligence remains fed only by real checked/grading evidence.

Implication:
Do not claim progress, mastery, score, mock grading, profile save, or Mistake Intelligence from HPQ solution reveal, MCQ clicks, or basket actions.

## 2026-05-08T15:37:18Z - Student-facing API errors are forbidden

Decision:
Raw API/server errors must not be shown to students. HPQ step-solution UI should render student-safe fallback copy and keep technical details to developer logging only.

Details:
- Do not render strings such as `AI API request failed`, `API request failed`, `server error`, `fetch failed`, endpoint names, or stack traces.
- Local HPQ step-solution QA requires both frontend and backend gateway.
- Vite proxies `/api` to `API_SERVER_PORT`; local QA uses port `8080`.
- If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`.

Implication:
Future QA must start the gateway when testing step-solution paths locally and must audit student-facing error copy.

## 2026-05-07T08:00:00Z - Manual QA substitutes for Browser Agent on magic-link auth; Practice/HPQ design grammar issue identified

Decision:
Manual 7-day trial entitlement QA may substitute for Browser Agent when Browser Agent cannot complete auth due to email magic-link inbox access limitation. Trial entitlement is considered manually verified for this K2E checkpoint. Practice and HPQ old-format surfaces require Level-3 / desktop design grammar alignment before final desktop graduation sign-off. PR #69/K2D remains draft and must not be treated as merged.

Details:
- PR #70 / K2E trial entitlement audit merged at 807ca666fd414fc5ce37778ade34479d46013544
- Manual 7-day trial QA passed after magic-link login
- Browser Agent couldn't automate magic-link login; no inbox access
- Trial unlock itself is functioning correctly and is not a blocker
- New product issue: Practice and HPQ pages render in older format, lack updated Level-3 desktop design grammar
- This is classified as visual/design parity issue, not data-honesty failure
- PR #69/K2D remains open, draft, and behind current base

Implication:
- For future trial entitlement testing: consider passwordless/test account for Browser Agent, or use manual QA.
- Practice/HPQ design grammar alignment is now an explicit pre-graduation follow-up.
- PR #69 must be rebased and re-evaluated before merge decision.

Current base:
807ca666fd414fc5ce37778ade34479d46013544

## 2026-05-06T12:00:00Z - PR #66 merged; Vercel production setup verified

Decision:
PR #66 / Vercel SPA rewrite config is merged. Vercel production setup is now verified. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/66
- Final head: 4b37d099447903951d6a44bd623b580a86c330e0
- Merge commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Vercel production deploy source branch: base/approved-thru-437
- Vercel production deploy source commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Production deployment status: PASS / Ready
- Production app route: PASS
- Root redirect: PASS
- Clerk login/auth return: PASS after PR #66
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/
- QA rule: Browser Agent should use Vercel production/preview URLs with /app/ appended. Do not use the bare root URL except when specifically testing the root redirect.

Implication:
- K2D has not started. Next safe action: confirm future PR branches generate usable Vercel Preview URLs with /app/ appended for Browser Agent QA, then begin PR-K2D planning only after live base verification.

Current base:
fe065fb0d9eb10d134d2baaa29b1010a54007966
## 2026-05-06T00:00:00Z - PR-K2C / PR #62 merged; post-K2C handoff repair

Decision:
PR-K2C / PR #62 is merged. Handoff is now current through K2C. Next stage is post-K2C handoff repair and Vercel-Codex setup. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/62
- Final head: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- Merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Browser QA: PASS
- Changed files: 5

Implication:
- Do not treat K2C as pending.
- Next safe action: finish and merge this docs-only handoff repair PR, then complete Vercel setup and verify /app/ deployment, then start PR-K2D only after live base verification.
- K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873
# LazyTopper Decision Log

## 2026-05-06T04:32:03Z - PR #64 merged; Vercel/Codex verification is next

Decision:
The docs-only post-K2C handoff repair PR #64 is merged.

Evidence:
- PR #64 head SHA: 3a6f7f097e84e130e2cb5e8be2ca4cc011bd8dbc
- PR #64 merge commit: bbd4d457a2349cf34b8ab335e45123f8b306868c
- PR #62 / K2C merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873

Implication:
K2C is complete. The next safe action is Vercel/Codex setup verification before PR-K2D. Future sessions must verify live `origin/base/approved-thru-437` before starting implementation because docs-only handoff PRs can advance the base after the last recorded checkpoint.

Supersedes:
Any older instruction saying to finish/merge the post-K2C handoff repair PR.

## 2026-05-05T00:00:00Z - K2A and K2B are merged; K2C is next (historical, superseded)

Decision:
PR-K2A and PR-K2B are complete. The next implementation stage is PR-K2C.

Implication:
Future sessions must not treat K2A or K2B as pending. K2C should build worksheet learner-loop entry points using real Check & Improve for grading, while preserving no-fake-data rules.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873

This file records permanent or semi-permanent project decisions that future GPT sessions must not rediscover from scratch.

Newest decisions should be added at the top with UTC timestamp.

## 2026-05-04 — Repo-native handoff system is mandatory

Decision:
The GitHub repo handoff folder is now the primary continuity bridge between GPT sessions.

Implication:
Future GPT sessions must read the handoff folder first and update it before ending.

Files:
- handoff/README.md
- handoff/CURRENT_STATE.md
- handoff/SESSION_LOG.md
- handoff/NEXT_ACTION.md
- handoff/IMPLEMENTATION_ROADMAP.md
- handoff/DECISION_LOG.md
- handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md
- handoff/templates/session-update-template.md

## 2026-05-04 — GitHub is source of truth

Decision:
GitHub origin is the source of truth for base SHA, PR state, changed files, merge status, and current handoff.

Do not trust:
- stale Replit state
- stale Codespaces state
- old screenshots
- previous GPT memory
- Browser Agent claims without GitHub diff validation

## 2026-05-04 — Codespaces terminal is default executor

Decision:
Use Codespaces terminal-controlled method for implementation unless explicitly changed.

Codex is installed and signed in, but is not primary executor yet.

Codex can be used only when explicitly approved, preferably for:
- read-only code review
- risk checking
- test suggestions
- diff review

## 2026-05-04 — Browser Agent is QA, not source of truth

Decision:
Browser Agent is useful for visual/click QA but cannot override GitHub source/diff validation.

If Browser Agent cannot access Codespaces preview due to certificate, forwarding, port, login, or safe-browsing restriction, classify as:

INCONCLUSIVE — preview access limitation

Do not treat it as a product failure unless the LazyTopper app itself loads and fails.

## 2026-05-04 — Revised Level 3 improvements do not have a canonical finalized prototype

Decision:
There is no finalized canonical prototype for the revised Level 3 improvements.

Use:
- Level 1/2 locked references for visual grammar and route continuity
- historical Level 3 references for behaviour inspiration only
- product-native implementation specs and QA gates for K2 onward

Do not use discarded prototypes as canonical without explicit re-approval.

## 2026-05-04 — Data honesty is non-negotiable

Decision:
Never claim:
- fake mastery
- fake score
- fake saved progress
- fake weak areas
- fake Mistake Intelligence
- fake generated question content
- fake solution content
- fake AI grading
- fake prediction certainty
- hidden persistence

Worksheet generated/saved is not mastery.
Worksheet attempted is not checked.
Checked answer is not mistake logged unless real Check & Improve path logs it.
Mistake Intelligence and Me / Progress require saved checked evidence only.

## 2026-05-04 — K2A must be contract/helper before UI

Decision:
K2A must first create the worksheet profile-save contract/helper.

It must not begin with DesktopWorksheetsPage UI changes.

Rationale:
The current worksheet save is local-only and honestly labelled. A signed-in profile path must exist before the UI can claim profile save, progress, or Mistake Intelligence.
