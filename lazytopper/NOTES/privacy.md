# Triangles BSRE Privacy Considerations

- Only trimmed answer text is sent to the backend; no client-side logging or storage of the raw studentAttempt/studentAnswer fields is introduced.
- The backend already guards telemetry emissions behind the existing `telemetry.cjs` counter (which only logs via `console.debug` when `NODE_ENV !== 'production'`).
- Any fallback to the Gemini stream happens without replaying the raw text, and the BSRE path itself is gated by `TRIANGLES_BSRE_FEATURE_FLAG`, so the student answer is only parsed in memory and never written to disk.
