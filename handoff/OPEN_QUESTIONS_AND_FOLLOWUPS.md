## 2026-05-08 - PR #72 Vercel / Browser QA pending

Status:
Active follow-up before PR #72 merge.

Observation:
PR #72 local repair has passed source validation and local product-owner screenshot audit, but the updated branch still needs Vercel preview deployment and Browser Agent QA on `/app/`.

Action:
After push, wait for Vercel preview, test the preview URL with `/app/`, run Browser Agent QA for guest and signed-in visual states that do not require inbox access, and use manual QA for magic-link-gated trial states if needed.

## 2026-05-08 - Science / Maths HPQ MCQ structured options normalization

Status:
Future data-only PR.

Observation:
Codex read-only Science audit found 29 Science MCQ / AssertionReason items. Structured `options` / `aROptions` exist for 14, and `correctOption` exists for 14. Missing structured option examples include `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, and `sci-light-hpq-1`.

Action:
Create a separate data-only normalization PR for Science and Maths MCQ / Assertion-Reason structured options. Do not invent options in UI and do not modify grading/checking APIs.

## 2026-05-08 - Local gateway and env requirements for HPQ step-solution QA

Status:
Document for future QA.

Observation:
Frontend Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally. If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`. Running `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server. Without `DATABASE_URL` and provider API keys, cache/generation may be limited or stubbed.

Action:
Future local QA for HPQ solution logic must start both frontend and backend gateway and must not treat missing local env as production proof.

## 2026-05-08 - Mock grading to Mistake Intelligence and Me / Progress

Status:
Future product work.

Observation:
PR #72 keeps Add to mock as basket/planning-only. Actual written-and-graded mocks should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Action:
Plan a later evidence-path PR for mock grading output to Mistake Intelligence and Me / Progress. Do not claim this in PR #72.

## 2026-05-08 - PR #69 / K2D remains separate

Status:
Still draft/open/not merged unless live GitHub verification later says otherwise.

Observation:
PR #69 / K2D remains separate from PR #72 and must not be merged blindly. PR #72 must not cherry-pick or absorb K2D code unless explicitly approved.

Action:
Verify live GitHub state before acting on PR #69. Rebase/update and audit separately if it is revived.

## 2026-05-06T00:00:00Z - K2D normalization after K2C

Status:
K2D is the next stage after post-K2C handoff repair and Vercel-Codex setup.

Observation:
K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Action:
Do not start K2D until Vercel setup is complete and /app/ deployment is verified on base d9d0d5df1e9de45df4e555b186903070e7b0e873.
# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

## 2026-05-07 — Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 — Browser Agent cannot complete magic-link auth without inbox access

Status:
Permanent QA caution for trial entitlement testing.

Observation:
Browser Agent could not automate the magic-link email login flow because it lacks access to the email inbox. This blocked Browser Agent from completing full trial entitlement QA for trial/expired/premium states. Manual human QA substituted successfully after signing in with a real magic link.

Action:
For future Browser Agent trial entitlement testing, either: (1) set up a passwordless or test-account-based QA flow for Browser Agent, or (2) document that manual QA is required for magic-link-gated trial testing.

## Active follow-ups after K1B / K1C / handoff setup

### K1B Practice query polish

Status:
Follow-up only.

Observation:
Browser QA reported that one K1B query route may sometimes require one click on the Trigonometry chip before the context bar reflects Trigonometry.

Action:
Re-check later during route/context hardening. Do not block K2A.

### /app/me shell consistency

Status:
Follow-up only.

Observation:
K1C QA noted /app/me sometimes rendered without DesktopShell when directly loaded, while still honest and usable.

Action:
Track for later shell-route consistency pass. Do not block K2A.

### Codespaces Browser Agent access

Status:
Permanent QA caution.

Observation:
Browser Agent can sometimes access Codespaces previews, but can also fail due to certificate, forwarding, port, login, or safe-browsing issues.

Action:
Prefer deployed public preview for Browser Agent. Use manual human QA for Codespaces-only URLs when needed.

### Revised Level 3 improvement prototype

Status:
No canonical finalized prototype.

Observation:
The revised Level 3 improvement prototype could not be finalized. Some experimental prototypes were discarded or considered non-canonical.

Action:
For K2 onward, use product-native specs and QA gates. Use Level 1/2 references for visual grammar and historical Level 3 for behaviour inspiration only.

### AI fallback solution

Status:
Future PR-K2D.

Observation:
A student should not feel a solution availability gap. If stored solution is missing, product should generate a board-style solution through AI, matching the stored solution format.

Action:
Do not implement in K2A. Plan as a separate later PR.

### Tutor and examiner quality polish

Status:
Future K6.

Observation:
Product should be useful from student, tutor, and CBSE board examiner lenses.

Action:
Add tutor/examiner wording and quality checks later, after real worksheet/check/progress paths are grounded.
