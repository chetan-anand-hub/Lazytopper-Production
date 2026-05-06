# PR-K2D audit: missing-solution AI fallback provenance

## Objective
Implement narrow K2D provenance for step solutions so stored and generated outputs are visibly distinguished.

## Files changed
- lazytopper/src/ai/aiClient.ts
- lazytopper/server/routes/stepSolution.cjs
- lazytopper/src/components/question/SolutionSourceNotice.tsx
- lazytopper/src/components/practice/PracticeQuestionCard.tsx
- lazytopper/src/pages/HighlyProbableQuestions.tsx
- lazytopper/src/pages/TopicHub.tsx
- handoff/SESSION_LOG.md

## Solution provenance model
- stored: question-bank/prewritten solution steps.
- ai_generated: model-generated board-style guidance.
- answer_fallback: generated from answer/explanation context.
- cache: cached generated response normalized conservatively when metadata missing.
- stub: sample structure in stub/no-provider cases.

## Examples
- Stored: label “Stored board-style solution”, no generated warning.
- AI generated: label “AI-generated board-style solution” + guidance notice.
- Fallback: label “Generated from available answer” + review-with-teacher notice.

## Removed official-claim wording
Server prompt now uses board-style guide wording and explicitly avoids official CBSE marking scheme claims.

## Data-honesty audit
No grading-path, progress, mastery, score, mistake-log, or persistence features added/changed.

## QA steps
- Type-check + build + production build verification.
- Manual UI checks for Practice, HPQ, TopicHub solution panels and labels.

## Known limitations
- Existing cached rows without provenance are normalized as conservative generated cache responses.

## Intentionally not changed
- checkSolution route and grading flow.
- mastery/mistake services and unrelated product routes.


## Cache-version repair

`CACHE_VERSION` was bumped from `v2` to `v3` because the step-solution prompt wording changed away from prior official-CBSE overclaims.

Purpose:
- bypass stale generated cache entries from the previous prompt generation path
- keep stored/prewritten question-bank solutions separate from generated guidance
- avoid re-serving older generated wording that may have implied official marking-scheme status

## PR audit status

PR:
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/69

Current base before PR #69:
`93add323809ae3d17f6fc4f1bc627c9efa7c13cd`

Status:
Draft implementation pending GPT/user audit, required pnpm validation evidence, and Vercel preview QA.


## Global cache-version repair

`CACHE_VERSION` is now applied to all step-solution question hashes, not only objective/MCQ questions.

This means K2D bypasses older cached generated outputs for all question types, including multi-mark questions, so stale generated responses from the previous overclaiming prompt path are not reused.
