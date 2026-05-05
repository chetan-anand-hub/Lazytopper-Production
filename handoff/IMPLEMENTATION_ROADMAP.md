# LazyTopper Implementation Roadmap

This roadmap preserves the staged implementation plan from the current post-K1C / pre-K2A checkpoint onward.

Current base:
47d53aa9baa5f106dc349a35cb739f8e52e5d240

Current stage:
Ready for PR-K2C - Worksheet learner loop entry points

## Roadmap rule

Do not treat this roadmap as permission to skip audits.

Before each stage:
- verify GitHub base
- inspect relevant files
- create a narrow branch
- preserve allowed-file scope
- validate
- QA visible work
- audit in GitHub before merge
- update handoff folder

## Prototype/reference rule for roadmap

For visual grammar:
Use locked Level 1/2 references and production desktop shell conventions.

For Level 3 behaviour:
Use historical Level 3 behaviour as inspiration only.

For revised Level 3 improvements:
There is no finalized canonical prototype. Implement through product-native PR specs and QA gates.

Do not pixel-match discarded experimental prototypes.

## Stage 0 — Clean start / verify base

Purpose:
Ensure each session starts from the correct repo state.

Required checks:
- git fetch origin
- git rev-parse origin/base/approved-thru-437
- git status --short

Exit gate:
Base SHA matches latest handoff and GitHub.

QA:
None.

Dependency:
Required before every stage.

## PR-K2A — Worksheet profile-save contract/helper

Purpose:
Create signed-in worksheet profile-save and worksheet activity contract.

Likely files:
- lazytopper/src/services/worksheetProfileService.ts
- docs/audits/pr-k2a-worksheet-profile-save-contract.md

Forbidden:
- DesktopWorksheetsPage.tsx
- WorksheetReady.tsx
- DesktopMePage.tsx
- DesktopPracticePage.tsx
- UI changes
- worksheet generator changes
- question bank changes
- mistake service changes
- package files

Data-honesty gates:
- saved worksheet is not mastery
- generated worksheet is not progress
- attempted worksheet is not checked
- checked answer is not mistake logged unless real mistake log exists
- no Me / Progress aggregation
- no Mistake Intelligence claim

Exit gate:
- service compiles
- contract documented
- build passes
- verifier passes
- GitHub diff only allowed files

QA:
No Browser QA required if no UI is touched.

Dependency:
Required before K2B.

## PR-K2B — Wire worksheet save to profile

Purpose:
Connect signed-in worksheet save to the K2A helper while preserving local-only fallback for signed-out users.

Likely files:
- DesktopWorksheetsPage.tsx
- worksheetProfileService.ts only if small contract refinement is required
- possible docs/audits note

Forbidden:
- Me / Progress aggregation
- Mistake Intelligence claims
- AI fallback solution
- broad worksheet UI rewrite
- question bank changes

Data-honesty gates:
- signed-out save remains “Saved on this device”
- signed-in profile save must be clearly labelled as saved to profile only if helper succeeds
- failed cloud save must not pretend success
- profile-saved worksheet still does not count as mastery

Exit gate:
- save path works signed-in and signed-out
- no fake progress
- validations pass
- QA confirms copy is clear

QA:
Browser/manual QA required because UI copy and save behaviour are visible.

Dependency:
Requires K2A.

## PR-K2C — Worksheet Level-3 learner loop UI

Purpose:
Create the smooth learner journey:
Generate worksheet → attempt → check my answer → see mistakes → practice similar questions.

Likely files:
- DesktopWorksheetsPage.tsx
- WorksheetReady / desktop equivalent if needed
- Check & Improve route context helpers if needed

Forbidden:
- fake AI grading
- fake checked answers
- fake mistake logs
- fake progress
- fake mastery

Data-honesty gates:
- attempt is local/working until checked
- Check & Improve is the real grading/check path
- mistake_logged only through real mistake logging
- next practice recommendation must be honest

Exit gate:
- context preserved from worksheet to check
- source=worksheet and returnTo are preserved
- Browser QA passes

QA:
Browser Agent or manual QA mandatory.

Dependency:
Requires K2A and preferably K2B.

## PR-K2D — Missing solution AI fallback

Purpose:
If stored solution is missing, provide an AI-generated board-style solution with uniform format.

Likely files:
- solution helper/service
- relevant solution rendering surfaces
- docs/audits note

Required solution format:
- Step 1
- Step 2
- Step 3
- Final answer
- Common mistake
- Examiner tip

Data-honesty gates:
- clearly distinguish generated solution from stored verified solution
- do not claim official CBSE answer unless verified
- do not invent database solution
- do not grade learner answer unless real check path is used

Exit gate:
- missing stored solution path is honest
- generated output format is consistent
- error/fallback state is clear

QA:
Browser QA required if visible.

Dependency:
After K2C or alongside it only if scope remains small.

## PR-K3 — Check & Improve source-context integration

Purpose:
Ensure Check & Improve carries source/context from worksheets, practice, topic hub, and other routes.

Likely files:
- DesktopCheckImprovePage.tsx
- desktop navigation/study context helpers
- possible docs/audits note

Data-honesty gates:
- no fake source
- no fake grading
- real mistake logs only after real check

Exit gate:
- source=worksheet/practice/topicHub works
- returnTo works
- checked result writes only real evidence

QA:
Browser QA required.

Dependency:
After worksheet context path exists.

## PR-K4 — Mistake Intelligence from saved checked evidence only

Purpose:
Make Mistake Intelligence depend only on real saved checked answers and mistake logs.

Likely files:
- MistakeIntel components/services
- DesktopShell or relevant panels
- mistake data helpers

Data-honesty gates:
- no signed-out personalized Mistake Intel
- no fake top mistake
- no fake marks at risk
- no fake weak area
- empty states must be honest

Exit gate:
- signed-out/no-data state honest
- signed-in with real logs shows grounded insight only

QA:
Browser QA required.

Dependency:
Requires real check/mistake path.

## PR-K5 — Me / Progress real aggregation

Purpose:
Aggregate real saved evidence into Me / Progress.

Likely files:
- DesktopMePage.tsx
- progress services
- worksheet/practice activity read helpers

Data-honesty gates:
- no fake time-on-practice
- no fake score trend
- no fake mastery percentage
- no fake weak areas
- show honest empty/trial state if insufficient data

Exit gate:
- Me page reflects real saved evidence only
- no local-only events represented as cloud/profile truth unless synced

QA:
Browser QA required.

Dependency:
Requires K2/K3/K4 evidence paths.

## PR-K6 — Tutor / examiner quality polish

Purpose:
Improve product language and learning guidance from:
- CBSE Class 10 student lens
- tutor lens
- board examiner lens

Likely files:
- copy/content helpers
- worksheet/check result surfaces
- topic guidance surfaces

Data-honesty gates:
- no official CBSE claim unless verified
- examiner tips should be framed as guidance, not official marking scheme unless sourced

Exit gate:
- student instructions are clearer
- tutor/examiner utility improved
- no technical internal language in student UI

QA:
Browser/manual QA required depending visible scope.

Dependency:
After core worksheet/check/progress loops exist.

## PR-K7 — HPQ / Chapter Test / Mock output loop

Purpose:
Connect HPQ, Chapter Test, and Mock execution outputs into real evidence pathways.

Likely files:
- practice/mock pages
- HPQ execution surfaces
- result/output helpers

Data-honesty gates:
- no fake prediction certainty
- no fake board probability
- no fake scores
- no fake saved history

Exit gate:
- output paths are honest
- saved evidence only when real

QA:
Browser QA required.

Dependency:
After check/progress evidence model is stable.

## PR-J — Final desktop polish / parity sweep

Purpose:
Final side-by-side sweep across production and locked references.

Scope:
- visual drift
- route consistency
- login/source/returnTo
- data honesty
- responsive behaviour
- prototype/reference consistency

Data-honesty gates:
All no-fake rules remain active.

Exit gate:
- production build passes
- verifier passes
- Browser QA / manual QA passes
- docs and handoff updated

QA:
Mandatory.

Dependency:
After K-series work.
