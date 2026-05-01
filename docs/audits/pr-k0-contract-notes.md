# PR-K0 Learning Signal Contract Notes

Base:

`base/approved-thru-437 @ 90fd499cd2c6162f562c9d8ba7b89ac43dbdb2f5`

## Purpose

PR-K0 introduces a contract-only Learning Signal model for future Level-3 work.

This PR does not change Practice, Worksheet, Check & Improve, Mistake Intel, Me / Progress, question banks, Gemini routes, solution generation, or grading.

## Source audits

This PR follows the merged audit sequence:

- `docs/audits/pr-k0-production-practice-worksheet-engine-audit.md`
- `docs/audits/pr-k0-lovable-practice-worksheet-flow-audit.md`
- `docs/audits/pr-k0-reconciliation-and-product-decisions.md`
- `docs/audits/pr-k0-readiness-final.md`

## Product doctrine

Level 2 remains the decision layer.

Level 3 becomes the execution layer:

`Scope -> Mode -> Execution -> Answer / Check / Solution -> Learning Signal -> Next Action`

Production engines remain implementation truth.

Lovable remains the UX / journey north star.

## Contract file

PR-K0 adds:

`lazytopper/src/lib/desktop/learningSignals.ts`

It defines:

- `LearningSignalSource`
- `LearningSignalKind`
- `LearningSignalEvidenceType`
- `LearningSignalMode`
- `LearningSignalConsumer`
- `LearningSignal`
- `LearningSignalEmitterContext`
- mode-to-signal maps
- consumer permission maps
- honesty rules

## Signal kinds

- `question_answered`
- `answer_checked`
- `self_assessed`
- `solution_viewed`
- `worksheet_generated`
- `worksheet_saved`
- `answer_uploaded`
- `mistake_logged`
- `next_action_clicked`

## Honesty rules

- `question_answered` is activity evidence, not mastery.
- `solution_viewed` is a learning event, not mastery.
- `worksheet_generated` is a content event, not progress.
- `worksheet_saved` is saved content, not mastery.
- `answer_uploaded` is input evidence, not a grade.
- `mistake_logged` must come from a real checking/grading path.
- Signed-out signals are local-only unless later saved after authentication.
- Mistake Intel should not consume local-only signals for durable claims.
- Me / Progress should not show durable history from fake or local-only data.
- Generated questions must pass completeness requirements before student-facing display.
- HPQ and prediction surfaces must not imply certainty without real evidence.

## PR-K0 non-goals

PR-K0 must not:

- redesign Practice UI
- redesign Worksheet UI
- change question banks
- change Gemini prompts
- change Check & Improve grading
- change Me / Progress UI
- add fake learner history
- add fake mastery
- add fake scores
- add fake weak areas
- add fake prediction certainty
- add fake mistake intelligence
- implement persistence

## Follow-up sequence

1. PR-K1 — Practice Level-3 execution loop using this contract.
2. PR-K2 — Worksheet Level-3 execution/save/upload loop using this contract.
3. PR-K3 — Check & Improve / `mistake_logged` integration.
4. PR-K4 — Mistake Intel + Next Action consumption.
5. PR-K5 — Me / Progress aggregation from real saved signals.
6. PR-J — final Lovable side-by-side polish and visual regression sweep.