# Triangles BSRE Wiring Notes

- **Entry point:** `server/index.cjs` now short-circuits Triangles evaluation requests when `TRIANGLES_BSRE_FEATURE_FLAG` is enabled and a student attempt is available.
- **Flow:**
  1. `isTrianglesEvaluationRequest` detects Triangles-specific evaluation intent.
 2. The handler calls `runBsreEvaluation`, which chooses a rubric (`determineBsreRubricId`), runs the `BsreEvaluator`, and formats the output as the expected `kind: "final"` JSON.
 3. Telemetry counters (`bsre_eval_called`, `bsre_eval_completed`, etc.) are incremented around the evaluator call.
 4. If `runBsreEvaluation` succeeds, the server returns the structured JSON directly with `handler_used: "triangles_bsre"`.
 5. If the evaluator throws (or the flag is off), the code logs the error, increments `bsre_eval_error`, and falls back to the Gemini-based prompt pipeline as before.
- **Fallback:** The legacy Gemini evaluation path remains untouched so the feature can be toggled without regression.
