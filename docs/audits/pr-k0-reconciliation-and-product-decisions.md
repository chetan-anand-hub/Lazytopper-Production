# PR-K0 Reconciliation and Product Decisions

Generated: 2026-05-01

Base audited:

`base/approved-thru-437 @ eb1c09cae8a1231214c5976d683b61f96109c989`

## Core framing

This is not a UI-only phase.

PR-K0 must reconcile:

1. Lovable Level-2 learner flow.
2. Production question / worksheet / solution / mistake engines.
3. The future Level-3 execution and learning-signal loop.

## Doctrine

- Lovable is the north-star UX / journey reference.
- Production is not disposable.
- Existing engines should be adapted and connected.
- Existing production flow should not be preserved blindly if Lovable defines a clearer learner decision structure.
- Prototype demo data must not become fake production learner data.

## Reconciliation matrix

| Mode / surface | Lovable intent | Production capability to audit | Likely decision |
|---|---|---|---|
| Quick Practice | Primary Practice card | Existing practice engines / builders | Use Lovable as entry; run production engine |
| Worksheet | Primary Worksheet card and Worksheet page | Existing worksheet builder / saved worksheets | Use Lovable builder; preserve real generation / save / upload |
| Predicted / HPQs | Practice card and predicted tabs | Prediction / HPQ banks | Expose only honest predictions |
| Full Mock | Primary Full Mock card | Mock / paper generation if complete | Audit before first-class Level 3 |
| Timed Drill | More options | Practice engine + timer if present | Expose only if timer/result/save story is real |
| Chapter Test | More options | Scoped practice/test generation | Define save/score/mistake output first |
| Practice Paper | More options | Marks/section filtered generation | Map to production paper generator or label future |
| Mistake mini-section | Practice/Worksheet toggles | Mistake logs / MistakeIntel | Enable only from real saved signals |
| Upload answers | Worksheet to Check | Check & Improve grading | Preserve source/returnTo and feed mistake logs |
| Me / Progress | Quick link/right rail | DesktopMePage / loadInsights / getMistakeLogs | Consume only real signals |

## PR-K0 should define

For each Level-3 mode:

- input context
- route
- question source
- solution source
- learner output
- saved signal
- mistake signal
- Me / Progress consumer
- honest empty state
- follow-up action

## Suggested K-series sequence

1. PR-K0: Learning Signal / Me / Mistake Intel data contract.
2. PR-K1: Practice Level-3 execution loop.
3. PR-K2: Worksheet Level-3 execution loop.
4. PR-K3: Topic Hub quick-hand / Tutor Drawer.
5. PR-K4: HPQ / Chapter Test / Mock execution loop.
6. PR-K5: Me / Progress aggregation.

## Open product questions

1. Should Quick Practice open a focused execution surface or the existing full PracticePage?
2. Should Worksheet generation create printable output, interactive attempt, or both?
3. Should solution reveal be tracked?
4. How should self-assessment differ from Check & Improve grading?
5. Which mistake taxonomy is canonical?
6. What minimum signal is required before Me recommends a next action?
7. Should Gemini questions appear in mocks or only practice/worksheet top-ups?
8. Should HPQs require prewritten answers before Level-3 display?

## Guardrail

Do not implement PR-K1/K2/K3 before PR-K0 answers:

- what real signal is emitted
- where it is stored
- how it is displayed later
- what happens when it does not exist

