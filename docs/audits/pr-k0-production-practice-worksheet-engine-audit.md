# PR-K0 Production Practice / Worksheet / Question Engine Audit

Generated: 2026-05-01

Base audited:

`base/approved-thru-437 @ eb1c09cae8a1231214c5976d683b61f96109c989`

## Purpose

This is a read-only audit before PR-K0. It exists because production already has real practice questions, question generation, solution generation, worksheet flows, mistake logging, and progress surfaces.

PR-K0 must connect and standardize existing engines. It must not rebuild from scratch or discard working production features.

## Audit doctrine

- Production repo is implementation truth.
- Lovable prototype is UX / journey reference.
- Production engines and data are not disposable.
- No fake progress, fake saved attempts, fake marks, fake mistake intelligence, fake scores, or fake prediction certainty.
- Level 3 must have a real output story: attempt, answer, solution, mistake signal, saved worksheet, or honest no-signal state.

## Important production files


## Audit note: corrected implementation paths

The first generated pass looked for several practice/solution files under older guessed paths. This repair updates the important-file table to use the actual production paths found by repo scan:

- `lazytopper/src/components/practice/practiceQuestionBuilder.ts`
- `lazytopper/src/data/practiceSetGenerator.ts`
- `lazytopper/server/routes/moreLikeThis.cjs`
- `lazytopper/server/routes/stepSolution.cjs`
- `lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs`

These files are central to the PR-K0 audit because they contain the real practice-question building, practice-set generation, Gemini More Like This, step-solution generation, and generated-question solution backfill logic.


| File | Exists | Lines | Question refs | Solution refs | Gemini refs | Mistake refs |
| --- | --- | --- | --- | --- | --- | --- |
| `lazytopper/src/pages/PracticePage.tsx` | YES | 1130 | YES | YES | YES | YES |
| `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | YES | 3328 | YES | YES | YES | YES |
| `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | YES | 2039 | YES | NO | YES | YES |
| `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | YES | 1588 | YES | YES | YES | YES |
| `lazytopper/src/pages/desktop/DesktopMePage.tsx` | YES | 1696 | YES | NO | YES | YES |
| `lazytopper/src/components/desktop/MistakeIntelCard.tsx` | YES | 321 | NO | NO | YES | YES |
| `lazytopper/src/lib/desktop/savedWorksheets.ts` | YES | 220 | YES | NO | YES | YES |
| `lazytopper/src/lib/desktop/topics.ts` | YES | 361 | NO | NO | YES | NO |
| `lazytopper/src/lib/desktop/topicHubContent.ts` | YES | 881 | YES | YES | YES | YES |
| `lazytopper/src/components/practice/practiceQuestionBuilder.ts` | NO | 0 | NO | NO | NO | NO |
| `lazytopper/src/data/practiceSetGenerator.ts` | NO | 0 | NO | NO | NO | NO |
| `lazytopper/server/routes/moreLikeThis.cjs` | NO | 0 | NO | NO | NO | NO |
| `lazytopper/server/routes/stepSolution.cjs` | NO | 0 | NO | NO | NO | NO |
| `lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs` | NO | 0 | NO | NO | NO | NO |

## Repo-wide signal scan

This is a heuristic scan. It identifies where deeper inspection is needed.

| File | Signals |
| --- | --- |
| `lazytopper/server/index.cjs` | question:33, solution:10, marks:16, gemini:105, progress:33 |
| `lazytopper/server/mentorImageSupport.cjs` | gemini:2 |
| `lazytopper/server/prompts/mentorPrompts.cjs` | question:2, gemini:10 |
| `lazytopper/server/prompts/promptCore.cjs` | question:17, answer:3, solution:1, marks:6, gemini:9, mistake:3, practice:5 |
| `lazytopper/server/prompts/promptData.cjs` | question:10, answer:17, solution:1, marks:14, gemini:12, mistake:2, progress:2 |
| `lazytopper/server/prompts/promptDiagram.cjs` | question:5, marks:15, gemini:7, mistake:6 |
| `lazytopper/server/prompts/promptGrind.cjs` | question:24, answer:16, solution:1, marks:40, difficulty:6, gemini:13, mistake:2, practice:2 |
| `lazytopper/server/prompts/promptLearn.cjs` | question:68, answer:24, solution:4, marks:61, difficulty:18, gemini:14, mistake:11, practice:1, progress:2 |
| `lazytopper/server/prompts/promptTeachContract.cjs` | question:51, answer:46, solution:2, marks:31, gemini:2, mistake:37 |
| `lazytopper/server/prompts/promptValidation.cjs` | question:11, answer:15, solution:3, marks:31, gemini:17, mistake:2 |
| `lazytopper/server/routes/aiQuestions.cjs` | question:16, marks:15, difficulty:8, gemini:13 |
| `lazytopper/server/routes/checkSolution.cjs` | question:7, answer:21, solution:15, marks:44, gemini:18, mistake:16 |
| `lazytopper/server/routes/diagrams.cjs` | question:15, gemini:64 |
| `lazytopper/server/routes/firebaseAuth.cjs` | gemini:12 |
| `lazytopper/server/routes/mentor.cjs` | question:16, answer:3, marks:12, gemini:70, mistake:3 |
| `lazytopper/server/routes/mentorBsre.cjs` | question:2, answer:7, marks:34, gemini:7 |
| `lazytopper/server/routes/mentorClassifiers.cjs` | question:6, marks:1, gemini:17, mistake:4, practice:1 |
| `lazytopper/server/routes/mentorDiagramHelpers.cjs` | question:3, answer:4, solution:1, marks:16, gemini:13 |
| `lazytopper/server/routes/mentorModeHandler.cjs` | question:9, answer:1, marks:1, gemini:27 |
| `lazytopper/server/routes/mentorResponseBuilder.cjs` | question:6, answer:4, marks:11, difficulty:3, gemini:122, practice:1 |
| `lazytopper/server/routes/mentorTeachHelpers.cjs` | question:12, answer:13, marks:4, difficulty:6, gemini:11, mistake:12, practice:2 |
| `lazytopper/server/routes/moreLikeThis.cjs` | question:16, answer:8, solution:5, marks:18, difficulty:5, gemini:33 |
| `lazytopper/server/routes/questionReport.cjs` | question:27, answer:1, solution:1, gemini:18 |
| `lazytopper/server/routes/questions.cjs` | question:2, solution:10, gemini:5 |
| `lazytopper/server/routes/share.cjs` | question:2, gemini:4, mistake:8, practice:1, progress:10 |
| `lazytopper/server/routes/stepSolution.cjs` | question:38, answer:38, solution:46, marks:107, difficulty:3, gemini:28, mistake:8 |
| `lazytopper/server/routes/userProgress.cjs` | gemini:41, progress:62 |
| `lazytopper/server/scripts/annotateMarkSteps.cjs` | question:38, answer:7, solution:14, marks:50, gemini:95 |
| `lazytopper/server/scripts/backfillGeneratedQuestionSolutions.cjs` | question:33, answer:35, solution:22, marks:8, difficulty:5, gemini:83 |
| `lazytopper/server/scripts/fillPredictedQuestionSolutions.cjs` | question:59, answer:47, solution:38, marks:10, gemini:64 |
| `lazytopper/server/services/cbseExamDate.cjs` | gemini:2 |
| `lazytopper/server/services/claudeClient.cjs` | gemini:14 |
| `lazytopper/server/services/geminiClient.cjs` | gemini:88 |
| `lazytopper/server/services/generatedQuestionPool.cjs` | question:29, answer:24, solution:15, marks:33, difficulty:18, gemini:9 |
| `lazytopper/server/services/questionCompleteness.cjs` | question:2, answer:11, solution:3 |
| `lazytopper/server/services/serverConfig.cjs` | difficulty:3, gemini:52 |
| `lazytopper/server/services/serverUtils.cjs` | gemini:2 |
| `lazytopper/server/services/stubHandlers.cjs` | question:18, answer:24, solution:2, marks:44, difficulty:3, gemini:12, mistake:6 |
| `lazytopper/server/services/topicVisualLookup.cjs` | gemini:2, progress:5 |
| `lazytopper/server/services/tutorCache.cjs` | question:17, answer:1, gemini:11 |
| `lazytopper/server/services/warmQuestionPool.cjs` | question:33, answer:10, solution:6, marks:52, difficulty:64, gemini:61, practice:1, progress:7 |
| `lazytopper/server/sessionHandlers.cjs` | answer:6, gemini:1 |
| `lazytopper/server/sessionStore.cjs` | question:13, answer:17, difficulty:10, gemini:1, practice:11 |
| `lazytopper/server/tutorOrchestrator.cjs` | question:33, answer:8, solution:2, marks:60, difficulty:1, gemini:12, mistake:30, practice:31 |
| `lazytopper/src/App.tsx` | question:11, difficulty:4, gemini:39, mistake:9, worksheet:23, practice:51, progress:2 |
| `lazytopper/src/ai/aiClient.ts` | question:21, answer:16, solution:27, marks:38, difficulty:11, gemini:53, mistake:8 |
| `lazytopper/src/components/DailyMixPlayer.tsx` | gemini:15 |
| `lazytopper/src/components/DailyMixWidget.tsx` | difficulty:1, gemini:14 |
| `lazytopper/src/components/DiagramBlock.tsx` | question:5, gemini:8 |
| `lazytopper/src/components/ErrorBoundary.tsx` | gemini:1 |
| `lazytopper/src/components/MentorPanel.tsx` | question:18, answer:7, solution:12, marks:19, difficulty:2, gemini:62, mistake:8, practice:21, progress:1 |
| `lazytopper/src/components/ShareProgressPrompt.tsx` | question:1, gemini:2, mistake:8, practice:1, progress:10 |
| `lazytopper/src/components/UpgradeModal.tsx` | gemini:1 |
| `lazytopper/src/components/VisualExplainer.tsx` | question:6, gemini:11 |
| `lazytopper/src/components/WeeklyWrappedCarousel.tsx` | question:2, difficulty:5, gemini:7, practice:1 |
| `lazytopper/src/components/WeeklyWrappedWidget.tsx` | question:1, practice:3, progress:2 |
| `lazytopper/src/components/auth/MockViewGate.tsx` | mistake:1, practice:1, progress:3 |
| `lazytopper/src/components/auth/PracticeLimitGate.tsx` | question:15, answer:5, gemini:10, practice:17 |
| `lazytopper/src/components/auth/RequireAuth.tsx` | gemini:2 |
| `lazytopper/src/components/celebrations/CountUpReveal.tsx` | progress:3 |
| `lazytopper/src/components/celebrations/WrongShake.tsx` | gemini:1 |
| `lazytopper/src/components/dashboard/DailyMixPreview.tsx` | question:3, gemini:8 |
| `lazytopper/src/components/dashboard/DashboardHeader.tsx` | gemini:2 |
| `lazytopper/src/components/dashboard/DashboardWidgets.tsx` | marks:1, gemini:4, practice:1, progress:1 |
| `lazytopper/src/components/dashboard/FirebaseConfigBanner.tsx` | gemini:2 |
| `lazytopper/src/components/dashboard/HeroActionCard.tsx` | mistake:1 |
| `lazytopper/src/components/dashboard/JourneyCard.tsx` | practice:3, progress:7 |
| `lazytopper/src/components/dashboard/MistakeInsightWidget.tsx` | marks:5, mistake:20, practice:1, progress:11 |
| `lazytopper/src/components/dashboard/MistakeInsightsPanel.tsx` | question:1, answer:3, gemini:1, mistake:36, practice:1, progress:7 |
| `lazytopper/src/components/dashboard/QuickAccessBar.tsx` | practice:2 |
| `lazytopper/src/components/dashboard/RecentActivityList.tsx` | gemini:1 |
| `lazytopper/src/components/dashboard/RingChart.tsx` | progress:1 |
| `lazytopper/src/components/dashboard/SprintDashboard.tsx` | question:10, difficulty:1 |
| `lazytopper/src/components/dashboard/StudyPlanSummary.tsx` | gemini:1 |
| `lazytopper/src/components/dashboard/TopicMasteryGrid.tsx` | gemini:1, progress:43 |
| `lazytopper/src/components/dashboard/WeakAreasPanel.tsx` | mistake:10, practice:2, progress:2 |
| `lazytopper/src/components/dashboard/dashboardUtils.ts` | gemini:1, practice:1 |
| `lazytopper/src/components/dashboard/index.ts` | gemini:2, mistake:4, progress:3 |
| `lazytopper/src/components/desktop/DesktopShell.tsx` | question:1, difficulty:1, gemini:13, mistake:4, practice:2, progress:1 |
| `lazytopper/src/components/desktop/MistakeIntelCard.tsx` | answer:11, marks:14, difficulty:1, gemini:4, mistake:30, practice:1, progress:1 |
| `lazytopper/src/components/desktop/l2/BackToParent.tsx` | gemini:3, worksheet:3, practice:4 |
| `lazytopper/src/components/desktop/l2/ContextBar.tsx` | gemini:1 |
| `lazytopper/src/components/desktop/l2/MistakeIntelligencePanel.tsx` | gemini:3, mistake:17, practice:1, progress:4 |
| `lazytopper/src/components/desktop/l2/PaperBlueprint.tsx` | question:2, marks:9, gemini:2 |
| `lazytopper/src/components/desktop/l2/ScopeBuilder.tsx` | marks:1, gemini:2 |
| `lazytopper/src/components/desktop/l2/TopicActions.tsx` | gemini:1, mistake:1, worksheet:7, practice:9 |
| `lazytopper/src/components/exam/ExamStrategyTips.tsx` | question:4, answer:5, marks:16 |
| `lazytopper/src/components/mentor/HumanGradeCoachView.tsx` | question:7, answer:1, marks:11, gemini:9, mistake:13, practice:24 |
| `lazytopper/src/components/mobile/MobileShell.tsx` | gemini:4 |
| `lazytopper/src/components/planner/StudyPlannerView.tsx` | question:9, gemini:9 |
| `lazytopper/src/components/practice/MentorSolveDrawer.tsx` | question:14, answer:11, solution:7, marks:21, difficulty:1, gemini:8, mistake:8, practice:31 |
| `lazytopper/src/components/practice/PracticeControls.tsx` | question:29, difficulty:14, worksheet:10, practice:6 |
| `lazytopper/src/components/practice/PracticeHero.tsx` | question:4, practice:6, progress:1 |
| `lazytopper/src/components/practice/PracticeQuestionCard.tsx` | question:44, answer:12, solution:34, marks:24, difficulty:21, gemini:18, mistake:4, practice:17 |
| `lazytopper/src/components/practice/PracticeQuestionList.tsx` | question:37, answer:7, solution:14, difficulty:5, gemini:2, practice:29, progress:3 |
| `lazytopper/src/components/practice/SessionProgressBar.tsx` | practice:3, progress:2 |
| `lazytopper/src/components/practice/WhyThisQuestionPanel.tsx` | question:12, mistake:8, practice:3 |
| `lazytopper/src/components/practice/mentorDrawerLogic.ts` | question:26, answer:2, solution:3, marks:17, gemini:18, mistake:5, practice:12 |
| `lazytopper/src/components/practice/practiceQuestionBuilder.ts` | question:160, answer:26, solution:15, marks:59, difficulty:117, gemini:54, mistake:4, practice:57 |
| `lazytopper/src/components/practice/worksheetGenerator.ts` | question:25, answer:9, solution:7, marks:29, difficulty:6, gemini:6, worksheet:11, practice:2 |
| `lazytopper/src/components/question/MathText.tsx` | gemini:2 |
| `lazytopper/src/components/question/QuestionVisualAid.tsx` | question:31, marks:3, gemini:170, progress:3 |
| `lazytopper/src/components/question/SolutionChecker.tsx` | question:18, answer:25, solution:26, marks:30, difficulty:3, gemini:5, mistake:62, practice:4, progress:5 |
| `lazytopper/src/components/tutor/ConceptTeachDrawer.tsx` | question:3, marks:3 |
| `lazytopper/src/components/tutor/TeachFlow.tsx` | question:10, answer:14, solution:1, marks:3, gemini:41, mistake:4, practice:4, progress:11 |
| `lazytopper/src/components/tutor/TutorDrawerV2.tsx` | question:54, answer:34, marks:73, gemini:62, mistake:32, practice:18, progress:37 |
| `lazytopper/src/components/tutor/TutorMessageRenderer.tsx` | question:11, answer:11, marks:25, gemini:44, mistake:13 |
| `lazytopper/src/components/tutor/tutorStructuredExtract.ts` | question:15, answer:12, marks:12, gemini:25, mistake:11 |
| `lazytopper/src/components/ux/JourneyStrip.tsx` | practice:7 |
| `lazytopper/src/components/ux/TrialBanner.tsx` | practice:1, progress:5 |
| `lazytopper/src/context/AuthContext.tsx` | gemini:18, mistake:8, progress:9 |
| `lazytopper/src/context/ProfileContext.tsx` | gemini:2 |
| `lazytopper/src/context/vibeModeContext.tsx` | gemini:1, practice:1 |
| `lazytopper/src/contracts/tutorContracts.ts` | question:14, answer:10, marks:52, gemini:9, mistake:14, progress:3 |
| `lazytopper/src/data/_finalGenerated/triangles.mentor.ts` | answer:2, marks:2 |
| `lazytopper/src/data/blueprintConfig.ts` | question:26, answer:1, marks:14, gemini:1, mistake:1 |
| `lazytopper/src/data/boardSteps/boardSteps_maths_2025_26.ts` | question:2, answer:10, solution:1, marks:32, mistake:5 |
| `lazytopper/src/data/boardSteps/boardSteps_science_2025_26.ts` | answer:5, marks:23, gemini:1 |
| `lazytopper/src/data/boardSteps/types.ts` | marks:2, mistake:1 |
| `lazytopper/src/data/canonicalQuestionBank.ts` | question:93, answer:53, solution:31, marks:26, difficulty:52, gemini:29, mistake:2, progress:6 |
| `lazytopper/src/data/cbseCompetencyPolicy.ts` | question:15, answer:1, difficulty:17, gemini:11, practice:6, progress:1 |
| `lazytopper/src/data/checkDuplicateQuestionIds.ts` | question:34, gemini:1 |
| `lazytopper/src/data/class10ContentConfig.ts` | question:126, answer:12, solution:19, marks:27, difficulty:7, gemini:65, mistake:36, progress:8 |
| `lazytopper/src/data/class10MathTopicTrends.ts` | question:3, answer:3, solution:5, marks:13, difficulty:13, gemini:9, progress:1 |
| `lazytopper/src/data/class10MathTopicWeights.ts` | question:1, gemini:1, progress:1 |
| `lazytopper/src/data/class10SciencePredictiveEngine.ts` | question:60, answer:14, solution:3, marks:21, difficulty:30, gemini:18, mistake:3, progress:2 |
| `lazytopper/src/data/class10ScienceTopicTrends.ts` | question:36, marks:2, difficulty:11, gemini:7 |
| `lazytopper/src/data/class10TopicRegistry.ts` | gemini:3, progress:3 |
| `lazytopper/src/data/contentStrategy/triangles/index.ts` | question:6, marks:2 |
| `lazytopper/src/data/contentStrategy/triangles/trianglesLearningObjects.ts` | answer:2, gemini:2, mistake:7, progress:6 |
| `lazytopper/src/data/contentStrategy/triangles/trianglesQuestionFamilies.ts` | question:10, answer:3, solution:1, marks:6, difficulty:2, gemini:9, mistake:10, practice:8 |
| `lazytopper/src/data/contentStrategy/triangles/trianglesQuestionTagIndex.ts` | question:34, answer:1, marks:1, mistake:11 |
| `lazytopper/src/data/contentStrategy/triangles/trianglesQuestionTypeTiles.ts` | question:3, marks:6 |
| `lazytopper/src/data/contentStrategy/triangles/trianglesRubrics.ts` | answer:4, marks:11 |
| `lazytopper/src/data/contentStrategy/trigonometry/index.ts` | question:4 |
| `lazytopper/src/data/contentStrategy/trigonometry/trigonometryLearningObjects.ts` | question:2, answer:1, marks:1, gemini:7, mistake:10, progress:10 |
| `lazytopper/src/data/contentStrategy/trigonometry/trigonometryQuestionTagIndex.ts` | question:44, answer:5, solution:1, gemini:3, mistake:20 |
| `lazytopper/src/data/contentStrategy/trigonometry/trigonometryQuestionTypeTiles.ts` | question:3, marks:6, gemini:1 |
| `lazytopper/src/data/contentStrategy/trigonometry/trigonometryRubrics.ts` | answer:7, marks:11, gemini:4 |
| `lazytopper/src/data/contentStrategy/types.ts` | question:4, marks:1, gemini:1, mistake:3, practice:1, progress:1 |
| `lazytopper/src/data/diagrams/trianglesRuntimeVisuals.ts` | difficulty:1, gemini:1, mistake:2 |
| `lazytopper/src/data/geminiTopicHubPacks/trianglesTopicHubPack.ts` | question:10, answer:15, solution:4, marks:10, difficulty:8, gemini:22, mistake:2 |
| `lazytopper/src/data/highlyProbableQuestions.ts` | question:165, answer:189, solution:133, marks:94, difficulty:245, gemini:120, mistake:3, progress:6 |
| `lazytopper/src/data/hpqCompetencyAdditions.ts` | question:95, answer:51, solution:16, marks:55, difficulty:133, gemini:23, progress:5 |
| `lazytopper/src/data/practiceFilters.ts` | question:3, difficulty:4, practice:7 |
| `lazytopper/src/data/practiceSetGenerator.ts` | question:41, marks:13, difficulty:141, gemini:4, practice:15 |
| `lazytopper/src/data/predictedQuestions.ts` | question:168, answer:289, solution:172, marks:149, difficulty:295, gemini:130, practice:2, progress:20 |
| `lazytopper/src/data/predictedQuestionsScience.ts` | question:127, answer:211, solution:126, marks:109, difficulty:276, gemini:235, mistake:2, practice:1 |
| `lazytopper/src/data/predictedScienceQuestions.ts` | question:26, answer:21, solution:10, marks:10, difficulty:22, gemini:15 |
| `lazytopper/src/data/prediction.ts` | question:34, answer:2, solution:3, marks:1, difficulty:9, gemini:1 |
| `lazytopper/src/data/predictionCore.ts` | question:62, answer:8, solution:4, marks:6, difficulty:14 |
| `lazytopper/src/data/predictionDataService.ts` | question:25, marks:1, difficulty:17, gemini:2, worksheet:1, practice:19 |
| `lazytopper/src/data/predictionScoring.ts` | question:5, marks:4, difficulty:5 |
| `lazytopper/src/data/predictionTypes.ts` | question:16, answer:2, solution:1, marks:4, difficulty:17, gemini:1, practice:4 |
| `lazytopper/src/data/predictivePapers.ts` | question:21, marks:13, difficulty:2 |
| `lazytopper/src/data/promptDPracticePacks.ts` | question:314, solution:8, marks:280, difficulty:805, gemini:61, mistake:3, practice:46, progress:3 |
| `lazytopper/src/data/questionBanks/class10/maths/areasRelatedToCircles.pack1.ts` | question:58, answer:91, solution:56, marks:56, difficulty:112, gemini:11 |
| `lazytopper/src/data/questionBanks/class10/maths/areasRelatedToCircles.pack2.ts` | question:68, answer:138, solution:60, marks:56, difficulty:112, gemini:16 |
| `lazytopper/src/data/questionBanks/class10/maths/arithmeticProgression.pack1.ts` | question:66, answer:99, solution:61, marks:58, difficulty:116, gemini:14, progress:65 |
| `lazytopper/src/data/questionBanks/class10/maths/arithmeticProgression.pack2.ts` | question:59, answer:141, solution:59, marks:57, difficulty:114, gemini:16, progress:60 |

## Manual audit checklist for question banks

For each real source, confirm:

- total question count
- subject coverage
- topic coverage
- difficulty distribution
- marks distribution
- section A/B/C/D/E distribution
- answer availability
- finalAnswer availability
- solutionSteps availability
- board marking / rubric availability
- common mistakes / mistake tags
- student-facing readiness

Candidate sources to inspect manually:

- canonical question banks
- predicted question banks
- Science predicted question banks
- HPQ / prediction sources
- generated question pool / cache
- Gemini more-like-this generation
- step solution / solution cache
- worksheet builder and saved worksheet memory

## Production engine questions PR-K0 must answer

### Practice

- What is the canonical generator?
- What inputs are supported today: subject, topic, multi-topic, full subject, marks, section, difficulty, weak concepts, adaptive mix?
- When does Gemini top-up run?
- Are generated questions complete before display?
- Is answer / final answer / solution guaranteed?
- What is saved after an attempt?
- What feeds Mistake Intel?
- What feeds Me / Progress?

### Worksheet

- What is the canonical worksheet generator?
- Does it support topic, multi-topic, full-subject, sections A-E, formats, mistake-focus mini-section, printable/export?
- Does output include questions, marks, answer key, step solution, board marking hints?
- Can worksheet answers flow into Check & Improve?
- Does saving a worksheet produce a learning signal?

### Solution and marking

- Which questions already have solution steps?
- Which require Gemini step solution?
- Are step marks normalized?
- Are solutions CBSE marking-scheme style?
- Are generated solutions cached?
- What happens when Gemini fails?

### Mistake / Me / Progress

- What emits a real signal?
- What is local-only vs saved?
- What can Mistake Intel honestly show today?
- What can Me / Progress honestly show today?
- What must stay as an empty state?

## Initial conclusion

PR-K0 should define the learning-signal contract before PR-K1/K2 UI or flow changes.

