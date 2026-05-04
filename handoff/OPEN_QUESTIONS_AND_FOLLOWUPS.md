# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

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
Future K2D / K2C depending final naming.

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
