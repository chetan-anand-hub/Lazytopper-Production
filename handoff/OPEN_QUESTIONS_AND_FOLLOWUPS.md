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
