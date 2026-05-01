# PR-K0 Final Readiness Audit

Base audited:

`base/approved-thru-437 @ fd4c70b89df02dc1b5a2426d3f7f9ed53267a188`

## Purpose

This is the final readiness audit before PR-K0 implementation.

It combines:

- merged PR #46 audit package
- production engine/file inspection
- Level-3 Lovable prototype direction
- strict no-fake-data guardrails

PR-K0 should define the learning-signal and Level-3 mode contracts before PR-K1 / PR-K2 / PR-K3 change visible execution flows.

## Reference prototypes

Locked Level 1/2 Lovable reference:

`https://light-topic-pilot.lovable.app/`

New Level 3 Lovable prototype:

`https://scope-to-learn.lovable.app/`

Product interpretation:

- Level 1/2 defines the learner decision journey: scope, choose mode, pick action.
- Level 3 defines the execution journey: attempt, check, solution, learning signal, next action.
- Production remains the implementation truth.
- Lovable remains the UX / journey north star.
- Production engines and real data must be adapted and connected, not discarded.

## Implementation boundary recommendation

PR-K0 should be contract-first.

Allowed PR-K0 scope:

- `docs/audits/pr-k0-readiness-final.md`
- likely next implementation file: `lazytopper/src/lib/desktop/learningSignals.ts`

PR-K0 should not:

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

## Production readiness map

| Area | Production file | Readiness implication |
|---|---|---|
| Desktop Practice shell | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | Existing desktop practice surface is large and real; PR-K1 should adapt it, not replace it blindly. |
| Legacy/mobile Practice | `lazytopper/src/pages/PracticePage.tsx` | Existing practice behaviour must not be broken by desktop work. |
| Practice question builder | `lazytopper/src/components/practice/practiceQuestionBuilder.ts` | Central for question construction; future Level-3 Quick Practice should use this path. |
| Practice set generator | `lazytopper/src/data/practiceSetGenerator.ts` | Central for scoped/generated practice sets. |
| Practice question card/list | `lazytopper/src/components/practice/PracticeQuestionCard.tsx`, `lazytopper/src/components/practice/PracticeQuestionList.tsx` | Existing answer/solution UI should be inspected before creating new execution UI. |
| More Like This | `lazytopper/server/routes/moreLikeThis.cjs` | Real Gemini-backed similar-question path exists; must require complete question/answer/solution before student-facing use. |
| Generated question pool | `lazytopper/server/services/generatedQuestionPool.cjs` | Generated questions can be stored/reused; PR-K0 must define how generated content becomes a signal, if at all. |
| Question completeness | `lazytopper/server/services/questionCompleteness.cjs` | Completeness checks are central to safe Level-3 display. |
| Warm question pool | `lazytopper/server/services/warmQuestionPool.cjs` | Existing warming logic should be preserved; future UI should not bypass completeness rules. |
| Step solution | `lazytopper/server/routes/stepSolution.cjs` | Real solution generation/caching path exists; solution reveal should use this, not duplicate logic. |
| Generated solution backfill | `lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs` | Important for generated-question solution coverage. |
| Worksheet generator | `lazytopper/src/components/practice/worksheetGenerator.ts` | Existing worksheet output must be preserved and reorganised under Lovable flow. |
| Desktop worksheets | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | Future PR-K2 should adapt this surface to Level-3 worksheet flow. |
| Saved worksheets | `lazytopper/src/lib/desktop/savedWorksheets.ts` | Save semantics already exist and must be separated from mastery/progress claims. |
| Check & Improve | `lazytopper/server/routes/checkSolution.cjs`, `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | Strongest real mistake/progress signal source. |
| User progress | `lazytopper/server/routes/userProgress.cjs` | Consumer/source for saved progress; must not receive fake local/demo signals. |
| Me / Progress | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | Should consume only saved real signals. |
| Mistake Intel | `lazytopper/src/components/desktop/MistakeIntelCard.tsx` | Should show honest empty state unless real mistake logs exist. |

## Recommended LearningSignal contract

PR-K0 should define signal sources and signal kinds before UI execution work.

### Signal sources

```ts
type LearningSignalSource =
  | "practice"
  | "worksheet"
  | "check-improve"
  | "hpq"
  | "mock"
  | "chapter-test"
  | "timed-drill"
  | "topic-hub"
  | "solution";
```

### Signal kinds

```ts
type LearningSignalKind =
  | "question_answered"
  | "answer_checked"
  | "self_assessed"
  | "solution_viewed"
  | "worksheet_generated"
  | "worksheet_saved"
  | "answer_uploaded"
  | "mistake_logged"
  | "next_action_clicked";
```

### Minimum fields to decide

A future `LearningSignal` should likely include:

- `id`
- `kind`
- `source`
- `userId`
- `sessionId`
- `subject`
- `topicSlug`
- `topicSlugs`
- `mode`
- `questionId`
- `worksheetId`
- `attemptId`
- `marksAvailable`
- `marksAwarded`
- `difficulty`
- `section`
- `skillTags`
- `mistakeTags`
- `evidenceType`
- `isLocalOnly`
- `createdAt`
- `returnTo`
- `sourceRoute`

## Signal rules

| Signal | Emitter | Saved/local rule | Consumer rule |
|---|---|---|---|
| `question_answered` | Practice, timed drill, chapter test, HPQ | Local-only when signed out; saved only with user/session support | May feed Me only after saved; not enough alone for mistake claim. |
| `answer_checked` | Check & Improve or future auto-check path | Saved when authenticated and backend returns result | Can feed Mistake Intel if mistake tags are real. |
| `self_assessed` | Practice self-check | Lower confidence than Check & Improve | Can inform local next action; saved use must be labelled. |
| `solution_viewed` | Solution reveal | Local or saved as learning event | Must not count as mastery or mistake. |
| `worksheet_generated` | Worksheet generator | Content event | Must not count as progress or mastery. |
| `worksheet_saved` | Saved worksheet path | Saved content when authenticated | Not mastery; can appear in history. |
| `answer_uploaded` | Check & Improve upload | Input event only | Not a grade until checked. |
| `mistake_logged` | Real grading/checking path | Saved authenticated signal | Primary Mistake Intel input. |
| `next_action_clicked` | Any next-action card | Optional journey signal | Useful for flow, not performance. |

## Mode output map

| Mode | Production engine(s) | Possible signals | Honesty rule |
|---|---|---|---|
| Quick Practice | `practiceQuestionBuilder`, `practiceSetGenerator` | `question_answered`, `self_assessed`, `solution_viewed` | Do not claim mastery from displayed or answered questions alone. |
| Timed Drill | Practice engine plus timer state if real | `question_answered` plus timing only if real | Do not fake time or performance. |
| Chapter Test | Scoped practice/test generation | `question_answered`, `self_assessed`, maybe `answer_checked` | Score only if real scoring exists. |
| Practice Paper | Marks/section generation | `question_answered`, possible paper-generated event | Avoid fake board score. |
| Worksheet | `worksheetGenerator`, `savedWorksheets` | `worksheet_generated`, `worksheet_saved` | Generated or saved worksheet is not mastery. |
| More Like This | `moreLikeThis`, generated pool, completeness checks | question-generated event if needed | Must require complete answer/solution before student-facing display. |
| Solution Reveal | `stepSolution`, cached solution fields | `solution_viewed` | Learning event only. |
| Check & Improve | `checkSolution` | `answer_uploaded`, `answer_checked`, `mistake_logged` | Strongest real mistake signal. |
| Me / Progress | `userProgress`, `DesktopMePage`, `MistakeIntelCard` | consumer only | Consume only saved real signals. |

## Honest-state rules

- Signed-out signals are local-only unless later saved after authentication.
- `solution_viewed` is a learning event, not mastery.
- `worksheet_generated` is a content event, not progress.
- `worksheet_saved` is saved content, not mastery.
- `question_answered` without checking is not a mistake signal.
- `self_assessed` is lower-confidence than Check & Improve.
- `mistake_logged` should only come from a real grading/checking path.
- Me / Progress must consume only saved real signals.
- Mistake Intel must not infer weak areas from sample/prototype content.
- Generated questions must not be student-facing unless they pass completeness requirements.
- HPQs and predictions must not imply certainty unless the production engine provides an honest confidence basis.
- Prototype sample content must never become production learner history.

## Level-3 product flow accepted for future work

The accepted Level-3 flow is:

`Scope → Mode → Execution → Answer / Check / Solution → Learning Signal → Next Action`

Interpretation:

- Level 2 remains the decision layer.
- Level 3 becomes the execution layer.
- Quick Practice should run production question engines.
- Worksheet should run production worksheet engines.
- Solution reveal should use production solution generation/cached solutions.
- Check & Improve should remain the strongest source of real mistake signals.
- Me / Progress and Mistake Intel should consume only real saved signals.

## PR-K0 acceptance criteria

PR-K0 can proceed only if it:

- defines signal sources and signal kinds
- defines local-only vs saved behaviour
- defines which modes emit which signals
- defines which consumers may use which signals
- preserves production engines
- does not alter UI execution flows
- does not add fake data
- does not touch question banks
- does not touch Gemini generation
- does not touch grading behaviour
- does not change Me / Progress display logic yet

## PR-K0 likely implementation shape

Recommended PR-K0 files:

- `lazytopper/src/lib/desktop/learningSignals.ts`
- optionally `docs/audits/pr-k0-contract-notes.md` or an update to this readiness file

The TypeScript contract file should likely export:

- `LearningSignalSource`
- `LearningSignalKind`
- `LearningSignalEvidenceType`
- `LearningSignalMode`
- `LearningSignal`
- `LearningSignalEmitterContext`
- `LearningSignalConsumer`
- helper lists/maps for allowed emitters and consumers
- no runtime fake data
- no persistence implementation yet

PR-K0 should be safe to merge if it only creates contract definitions and docs.

## Recommended follow-up sequence

1. PR-K0 — Learning Signal contract and Level-3 mode map.
2. PR-K1 — Practice Level-3 execution loop using the contract.
3. PR-K2 — Worksheet Level-3 execution loop using the contract.
4. PR-K3 — Topic Hub quick-hand / Tutor Drawer integration.
5. PR-K4 — HPQ / Chapter Test / Mock execution loop.
6. PR-K5 — Me / Progress aggregation from real saved signals.
7. PR-J — final Lovable side-by-side polish and visual regression sweep.

## Risks to keep visible

| Risk | Severity | Mitigation |
|---|---|---|
| Treating generated worksheet as progress | Major | Contract must classify it as content event only. |
| Treating solution view as mastery | Major | Contract must classify it as learning event only. |
| Inferring mistake weakness from sample data | Blocker | Mistake Intel consumes only real saved mistake signals. |
| Rebuilding Practice from scratch | Major | PR-K1 must adapt production engines. |
| Rebuilding Worksheet from scratch | Major | PR-K2 must adapt production worksheet generator/saved worksheet path. |
| Fake scores or fake mastery | Blocker | No display without real saved evidence. |
| Gemini-generated incomplete questions | Blocker | Must pass completeness checks before display. |
| Signed-out saved-state ambiguity | Major | Signals must clearly mark `isLocalOnly`. |

## Final readiness verdict

PASS WITH FOLLOW-UP for implementation planning.

Reason:

Production has the needed engines and files, and the Level-3 Lovable prototype provides a useful learner-flow direction. But PR-K0 must stay contract-first. Visible Practice/Worksheet restructuring should wait until the contract is in place.

Final decision:

- Proceed with PR-K0 only as a contract/docs implementation.
- Do not begin PR-K1 or PR-K2 UI restructuring until PR-K0 is merged.