# BSRE Telemetry Counters

- **Module:** `server/telemetry.cjs`
- **Counters tracked:**
  - `bsre_eval_called` – incremented before invoking the evaluator.
  - `bsre_eval_completed` – incremented after a successful evaluation.
  - `bsre_eval_error` – incremented if the evaluator throws (the server falls back to Gemini).
  - `bsre_eval_low_confidence` – incremented when the evaluator reports a numeric `confidence` below `0.5`.
- **Logging:** Counters only emit `console.debug` statements when `NODE_ENV !== 'production'`, keeping production logs clean while allowing local visibility.
- **Usage:** The counters live in-memory and are only updated when the Triangles BSRE feature flag is on (see `server/index.cjs`).
