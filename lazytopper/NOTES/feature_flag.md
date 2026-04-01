# Triangles BSRE Feature Flag

- **Flag name:** `TRIANGLES_BSRE_FEATURE_FLAG`
- **Default:** `false` (off).
- **Location used:** `server/index.cjs` (the evaluation branch now checks `isTrianglesBsreEnabled()` before running the local evaluator).
- **Purpose:** Gate the new local Triangles BSRE evaluation path so that we only call the rule-based scorer when the flag is explicitly enabled.
- **How to enable:** Set `TRIANGLES_BSRE_FEATURE_FLAG=true` (via `server/.env`, environment, or process manager) before starting `node server/index.cjs`.
- **Notes:** When the flag is off or evaluation fails, the existing Gemini-backed workflow remains unchanged.
