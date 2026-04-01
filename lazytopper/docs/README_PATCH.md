# LazyTopper Patch – Prompt 1–3 Integration

New files:
- src/data/topicHubV2Enrichment.ts
- src/data/predictedQuestionsAdditions.ts
- src/data/scienceQuestionAdditions.ts
- src/data/hpqAdditionsAndDailyMixSeeds.ts
- src/data/cbseCompetencyPolicy.ts
- src/data/implementation_notes.md

Updated files:
- src/utils/getTopicV2Content.ts
- src/data/questionGenerator.ts
- src/data/predictedScienceQuestions.ts
- src/data/highlyProbableQuestions.ts
- src/data/predictionCore.ts

How to apply:
1) Copy the `lazytopper-main/` folder from this patch into the root of your repo, keeping paths.
2) Run `npm i` then `npm run dev`.
3) Smoke-check: TopicHubV2 for a few slugs (e.g. `pair-of-linear-equations`, `electricity`), HPQ page filters, Practice page generation.

Notes:
- I corrected one numeric mismatch in Prompt 1 (membership-fee case study) so answer matches the equations.
- The policy weighting change in PredictionCore is deliberately lightweight: it boosts Case-Based / Assertion-Reasoning and Applying/Analysing.
