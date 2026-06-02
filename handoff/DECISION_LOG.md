## 2026-06-02 - PR #176 merged (scope:guard re-armed) + owner product decisions

Decision:
PR #176 (`fix: restore repo_boundary_policy.json`) is merged into `base/approved-thru-437`,
re-arming the scope guards. Several owner product decisions were locked today.

Details:
- PR #176 merged 2026-06-02. Base before merge: `1e9bd04` is the merge commit / new trunk SHA.
  Commit `c7d742f`. Changed file: `lazytopper/docs/project_memory/governance/repo_boundary_
  policy.json` (restored from history `d4ed284`; ONE file, no code). Vercel GREEN before merge.
- The break was the untrack in `2081003`, not the `.gitignore` rule — re-tracking is the
  durable fix (`git check-ignore` reports no-match for a tracked file). No `.gitignore` edit.

Decisions (owner, 2026-06-02):
- **3/19 acceptance regressions — DEFER ALL THREE; mark known-red-by-decision.** Investigation
  (report-3of19-regression-intent) proved all 3 are INTENTIONAL product changes, zero accidental:
  - SES-04 (dashboard session player) — session-player arch deliberately deleted (`b891597`),
    replaced by `/daily-mix`. Check is stale.
  - PRG-03 (dashboard "Performance Matrix") — Dashboard rebuilt (`c1afcd3`); matrix →
    `TopicMasteryGrid` (alive). Check is stale.
  - PRG-02 (TopicHub competency) — dropped in the 8025→700 rewrite (`428e3ac`); TopicHub is the
    locked Track A redesign target.
  - Do NOT update/fix any now. SES-04 + PRG-03 resolve as part of the Dashboard→Home/Me-Progress
    consolidation; PRG-02 resolves in the Track A TopicHub redesign. Not to be re-investigated.
- **Dashboard is being retired → Home + Me/Progress** (owner-stated product direction). The
  product has NO Dashboard. BUT the repo still hardcodes `/dashboard` as the post-login landing
  in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`, `RootEntry` mobile). Desktop `/`
  correctly lands signed-in users on DesktopHome; login-fallback + mobile still go to
  `/dashboard`. → A **Dashboard→Home/Me-Progress consolidation** (fix the 3 hardcoded landings)
  is a tracked Track A / cleanup task. NOT done today.
- **Post-login redirect:** the `?redirect=` / `location.state.from` priority correctly returns a
  gated-mid-action user to where they were (matches "gate at save, return after"). Only the
  bare-login FALLBACK wrongly defaults to `/dashboard` — fixed by the consolidation above.
- **Mistake Intelligence: NOT yet integrated.** Me/Progress does not yet wire to real
  mistake-intelligence data — a separate future PR. "Me/Progress shows real memory-intelligence
  data" is the INTENDED state, not the current one.
- **Daily Mix:** alive + premium-gated (`/daily-mix/:grade/:subject`, "Daily Focus Mix"). It is a
  daily-habit PRACTICE surface (streak/resume/mastery), NOT one of the four hooks (Exam Trends,
  Predicted, Check & Improve, Mistake Intelligence) and NOT mistake/spaced-repetition-driven. →
  Flagged for an explicit owner KEEP/CUT decision (candidate to retire like the session-player).
  Undecided.

Implication:
Next is this docs PR → PR B (Part 1) grading-prompt tightening (sync `feat/check-solution-
grading-prompt` `204ac7c` onto `1e9bd04`, then merge) → Track A PR-1 tutor wiring → PR B2
teach-prompt tightening → Railway deploy. Future implementation starts from `1e9bd04` or
whatever live GitHub later confirms.

## 2026-06-01T16:59:01Z - PR #174 merged; check-solution parse fix + AI gateway live (local) + two-track doctrine

Decision:
PR #174 (`fix: check-solution parse reliability`) is merged into `base/approved-thru-437`.
The AI gateway is now LIVE on local dev (non-stub, direct Gemini key). Owner locked several
product clarifications and a two-track build plan.

Details:
- PR #174 merged at `2026-06-01T16:59:01Z`. Base before merge: `8c161739f7ba7bc8faed897970665e0d94c1eee1`.
- Merge commit / new base SHA: `5ad359c42127ac89056002c226828297ead7c98b`.
- Changed file: `lazytopper/server/routes/checkSolution.cjs` (force JSON + raise token cap).
- QA: PASS (npm run build exit 0; measured before/after on real handwritten image).

Doctrine / decisions:
- Force JSON mode (`responseMimeType:'application/json'`) on any Gemini call that must
  return structured data; give thinking models token headroom. (See D20.)
- Trial = ALL features for 7 days, then free Basic. Gate is trial-not-paywall during the 7
  days. Trial/premium state still server/admin-sourced only — NEVER client-activated.
- Redesign target is FULLY responsive at every width (one fluid layout), not a 1024px
  desktop/mobile twin switch.
- Launch domain = `lazytopper.in` (NOT `.app`).
- PR numbering follows git (#175+); "PR-1..8" Track A labels map to real git numbers.
- Two-track build LOCKED: Track A (design/UI fluid responsive) + Track B (content:
  interactives via Claude, proofs, formula sheets, pre-gen PDFs) with robust content QA.
  Source specs (Learn Flow Spec, Track A PR Breakdown) are owner/architect-held, not yet
  committed to this repo.

Implication:
Next is PR B — grading + teach prompt tightening, MEASURED against a mistake-scenario test
matrix (fixes D21 over-classification) — then a check-solution eval set, then Railway deploy
(now in scope; owner needs a live link for students to test tutor+checker quality). Deploy
ONLY after the checker reliably returns good grades locally. Future implementation starts
from `5ad359c42127ac89056002c226828297ead7c98b` or whatever live GitHub later confirms.

## 2026-05-16T18:55:00Z - PR #80 merged; frozen landing and Explore-first doctrine locked

Decision:
PR #80 is merged into `base/approved-thru-437` as PR-K2H-4. It implements the frozen public landing page and Explore-first browse entry. The landing is now frozen and should not be redesigned casually.

Details:
- PR #80 title: `PR-K2H-4: Frozen landing page and explore-first entry`
- Merged at: `2026-05-16T18:43:48Z`
- Base before merge: `18e6e111884b05795882da75ba4c65f034d9d4e9`
- Head branch: `feat/desktop-pr-k2h-4-frozen-landing-explore-entry`
- Final PR head: `045ffa00a3894405f67a5ceda778f313c693fa0f`
- Merge commit / new base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Changed files: 3
- Changed files: `lazytopper/src/App.tsx`, `lazytopper/src/components/desktop/DesktopShell.tsx`, `lazytopper/src/pages/Welcome.tsx`
- QA result: PASS

Doctrine:
- Public landing is now frozen from PR #80.
- Landing has one primary action only: Explore.
- Explore CTA sits after the four-card story and before Mistake Intelligence.
- No Start free trial CTA on public landing.
- No Explore as Guest on landing.
- Browse mode is for product inspection only and must not create a fake guest learner.
- Real learning actions must still require auth/trial gate where already implemented.
- Future changes to `Welcome.tsx` should be small fixes only unless owner explicitly approves a landing redesign.

Implication:
Next implementation should be PR-K2H-5 - Login visual parity + auth gate polish. It must preserve real Clerk auth, no guest mode, reason/redirect handling, safe redirects, and the PR #80 Explore/sign-in funnel. Future implementation must start from `018c95b11f5168d27fb93bb3a2cae3859b682627` or whatever live GitHub later confirms.

## 2026-05-16T02:31:24Z - PR #78 merged; auth/session doctrine and next owner choice

Decision:
PR #78 is merged into `base/approved-thru-437` as PR-K2H-3. It hardens the auth/session shell and pricing honesty while preserving real Clerk authentication. PR #77 is already merged. No open implementation PR should be assumed unless live GitHub says so.

Details:
- PR #78 title: `PR-K2H-3: Auth/session shell hardening`
- Merged at: `2026-05-16T02:26:54Z`
- Base before merge: `0ed0871f3166e647fb5b3e36fb0c1e543df0c145`
- Final PR head: `2067fa5079161c8a888398683d35c3bac59429b0`
- Merge commit / new base SHA: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Changed files: 11
- QA result: PASS WITH FOLLOW-UP

Doctrine:
- LazyTopper is browse-first and action-gated.
- No real-app guest mode.
- Every real learner should authenticate before real learning actions.
- Sign-in is needed to save attempts, mistakes, progress, and power Mistake Intelligence.
- Do not store credentials, passwords, OTPs, Google tokens, Clerk tokens, or secrets.
- Payment gateway is deferred.
- No fake premium, fake payment, or normal client-side premium activation.
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Use source and returnTo for parent-aware navigation and preserve PR #77 route-context behavior.

Implication:
Next implementation should be chosen by the owner from Login visual parity polish, frozen landing page redesign, or Home continue-card route repair. Future implementation must start from `0addba3f0208c7610d02ab1b1753923fdf0790db` or whatever live GitHub later confirms.

## 2026-05-13T14:49:10Z - PR #75 merged; PR-K2H-1 checked-evidence doctrine

Decision:
PR #75 is merged into `base/approved-thru-437` as PR-K2H-1. It hardens Practice checked-evidence states while preserving PR #73 Practice Level-3 visuals. PR #75 is closed/merged and must not be reopened.

Details:
- PR #75 title: `PR-K2H-1: Harden Practice checked-evidence states`
- PR #75 URL: `https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75`
- Final PR head: `1745ca6f93a73b245f8024a3663318fe9aa0d5f6`
- Merge commit / new base SHA: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- Changed files: 3
- Commits: 5
- Completed: checked-answer evidence state hardening, improved SolutionChecker status labels, safer Practice footer/session copy, removal of student-hostile MCQ copy, removal of the MCQ "S" session badge, trusted MCQ click handling as a real answer attempt, wrong trusted MCQ mistake-history logging for eligible signed-in non-local-session learners, and safe CBSE-style step-mark chips for written multi-mark Practice Show Steps when step marks match total question marks.
- Product PR exclusions: no HPQ files, no TopicHub files, no server/API/package/data/env/docs changes.

Data-honesty doctrine:
- MCQ click is a real answer attempt when a trusted key exists.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history is still deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

Implication:
- Next sequence is docs-only handoff update, then PR-K2H-2 route/context repair, PR-K2H-3 durable MCQ answer-attempt model, PR-K2H-4 advanced Practice filters and selection quality, sign-in/trial enforcement pass, Mock Level-3 detail finalisation, HPQ quality work, then broader production-readiness polish.
- PR #69 / K2D remains separate. Do not merge blindly and do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12T08:16:56Z - PR #73 merged; K2G closeout and K2H graded evidence separation

Decision:
PR #73 is merged into `base/approved-thru-437` as a Practice visual/shell/routing/CTA closeout only. Practice evidence, Mistake Intelligence, and graded answer bridge work must be handled in a separate PR-K2H stage.

Details:
- PR #73 final head: `54638b25c6cf2ca88c1f336a91712e2d1d0108ad`
- Merge commit / new base SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Completed scope: Practice Hub entry, direct full Practice routing, DesktopShell full Practice rendering, HPQ-like visual grammar, CTA mutual exclusion, local-only session honesty.
- Not completed: graded Practice evidence, Mistake Intelligence bridge, saved answer quality, filters, solution-quality audit.
- Manual Browser/owner visual QA broadly accepted.

Implication:
- PR-K2H must be the next active implementation stage.
- Practice local MCQ clicks, self-assessment, and Show steps remain learning support, not saved evidence.
- Do not treat PR #73 as the full graded evidence completion.

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
