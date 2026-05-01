# PR-K0 Lovable Practice / Worksheet Flow Audit

Generated: 2026-05-01

Prototype audited:

`chetan-anand-hub/topic-focus-lite`

## Purpose

This audit captures the Lovable Level-2 Practice and Worksheet structure. Lovable does not fully define Level-3 execution screens, but it does define the learner decision flow.

## Prototype files inspected

| File | Exists | Lines | Scope refs | Mistake refs | Navigation refs |
| --- | --- | --- | --- | --- | --- |
| `src/pages/PracticePage.tsx` | YES | 290 | YES | YES | YES |
| `src/pages/WorksheetPage.tsx` | YES | 194 | YES | YES | YES |
| `src/pages/HomePage.tsx` | YES | 152 | YES | YES | YES |
| `src/pages/TopicHubPage.tsx` | YES | 603 | YES | YES | YES |
| `src/pages/CheckPage.tsx` | YES | 145 | YES | YES | YES |
| `src/pages/MePage.tsx` | YES | 366 | YES | YES | YES |
| `src/components/ScopeBuilder.tsx` | YES | 177 | YES | NO | NO |
| `src/components/MistakeIntelligencePanel.tsx` | YES | 113 | YES | YES | YES |
| `src/components/PaperBlueprint.tsx` | YES | 42 | NO | NO | NO |
| `src/components/ContextBar.tsx` | YES | 48 | YES | YES | NO |
| `src/components/BackToParent.tsx` | YES | 63 | NO | NO | YES |
| `src/lib/navigation.ts` | YES | 86 | YES | YES | YES |
| `src/context/LazyTopperContext.tsx` | YES | 294 | YES | YES | YES |

## Practice prototype flow

Lovable Practice appears to define this learner journey:

1. Read route/query context.
2. Show BackToParent.
3. Show compact ContextBar.
4. Show ScopeBuilder.
5. Ask learner to choose what to do.
6. Primary modes:
   - Quick Practice
   - Worksheet
   - Predicted / HPQs
   - Full Mock
7. More options:
   - Timed Drill
   - Chapter Test
   - Practice Paper
8. Show PaperBlueprint.
9. Show predicted tabs:
   - Topic HPQs
   - Selected topics
   - Full subject
10. Show sample preview.
11. Show right rail:
   - Mistake Intelligence
   - Quick links to worksheet, Check, Me

Presence check:

| Prototype element | Present |
| --- | --- |
| ScopeBuilder | YES |
| Choose what to do | YES |
| Quick Practice | YES |
| Worksheet | YES |
| Predicted / HPQs | YES |
| Full Mock | YES |
| More practice options | YES |
| Timed Drill | YES |
| Chapter Test | YES |
| Practice Paper | YES |
| PaperBlueprint | YES |
| Predicted questions | YES |
| Sample preview | YES |
| MistakeIntelligencePanel | YES |

## Worksheet prototype flow

Lovable Worksheet appears to define this learner journey:

1. Read route/query context.
2. Show BackToParent.
3. Show compact ContextBar.
4. Show mistake-aware mini-section toggle.
5. Show ScopeBuilder.
6. Show worksheet preview.
7. Let learner choose sections A-E.
8. Show format chips.
9. Show mistake-focus mini-section when enabled.
10. Provide actions:
    - Generate worksheet
    - Save worksheet
    - Upload your answers
11. Show right rail:
    - Mistake Intelligence
    - Tip

Presence check:

| Prototype element | Present |
| --- | --- |
| ScopeBuilder | YES |
| Worksheet preview | YES |
| Section A | YES |
| Section B | YES |
| Section C | YES |
| Section D | YES |
| Section E | YES |
| Formats | YES |
| Mistake-focus mini-section | YES |
| Generate mistake-aware worksheet | YES |
| Save worksheet | YES |
| Upload your answers | YES |
| MistakeIntelligencePanel | YES |

## Lovable decision model

| Lovable mode | Learner meaning | Production implication |
|---|---|---|
| Quick Practice | Short focused question set based on scope | Should enter real practice engine |
| Worksheet | Sectioned worksheet for screen/print | Should enter real worksheet builder |
| Predicted / HPQs | Highly probable questions for scope | Should use real HPQ/prediction data with honest labels |
| Full Mock | Full 80-mark mock | Should use real mock engine only if output/saving is ready |
| Timed Drill | Short focused timed set | Should expose only if timer/result story is real |
| Chapter Test | Chapter or multi-chapter test | Should define save/score/mistake output |
| Practice Paper | 20/40 mark paper | Should map to real section/marks generator or stay future |
| Mistake mini-section | Add weak-area section without replacing paper | Should require real mistake signal |

## What Lovable does not define

Lovable does not fully define:

- actual question attempt screen
- answer capture
- self-assessment
- solution reveal sequence
- CBSE marking rubric display
- timer behaviour
- saved attempt persistence
- Me / Progress aggregation
- generated question validation
- Gemini fallback rules

Therefore Level 3 should be product-native, but organized under Lovable's learner flow.

