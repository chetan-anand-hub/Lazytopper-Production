# LazyTopper — Discoveries (D-register)

Hard-won, non-obvious facts about how this system actually behaves. Each entry is a
gotcha that cost time or would mislead the next session if forgotten.

> NOTE: D1–D18 are maintained in the owner/architect-side knowledge base (chat), not in
> this repo. This file starts the in-repo register at D19 (created 2026-06-01). When the
> architect's earlier discoveries are migrated in, prepend them above D19.

---

## D19 — Local dev proxy port is 8080 by default, NOT 3001
Vite proxies `/api` to `process.env.API_SERVER_PORT || 8080` (see `lazytopper/vite.config.ts`),
but the AI gateway boots on `PORT=3001` (from `server/.env`). With a plain `npm run dev`, the
app silently proxies to :8080, nothing answers, and AI features LOOK broken when the gateway
is actually fine. To reach the gateway with NO code change, start Vite as
`API_SERVER_PORT=3001 npx vite` (or export that env). Gateway and Vite are started
SEPARATELY in local dev — `predev` only cleans Windows metadata; nothing auto-spawns the
gateway. (The `artifacts/api-server` reference is the deploy artifact, not local dev.)
LESSON: when AI features appear dead locally, check the proxy target before the gateway.

## D20 — Force JSON mode on any Gemini call that must return structured data (fixed, PR #174)
`gemini-2.5-flash` is a thinking model: it spends output tokens on reasoning before the
visible answer, and free-form replies can include preamble/fences. Under a low
`maxOutputTokens` and with no `responseMimeType`, the JSON gets truncated or wrapped in
reasoning text, so hand-parsing (`extractJsonObjectFromText`) returns null and the route
falls through to a fallback. The check-solution route hit exactly this → the misleading
"Could not evaluate the solution. Please try again with a clearer image." (the image was
always read fine). Fix: pass `responseMimeType:'application/json'` + raise
`maxOutputTokens` (2500→8000) + warn-log the unparseable reply (model text only) + an
honest fallback message. `geminiClient.cjs` ALREADY supports `responseMimeType` (forwards
to `generationConfig`, with a built-in fallback path if a route rejects it) — the fix was
to USE it. LESSON: force JSON mode on every Gemini call that must return structured data;
never rely on parsing free text, and give thinking models token headroom.

## D21 — check-solution OVER-classifies mistakes as "conceptual" (KNOWN QUALITY ISSUE → PR B)
Real reproduction (`sol2.jpeg`): the student factored `(x−4)(x+2)` correctly but read a root
as `−4` instead of `+4` — a SIGN MISREAD from a correct factor (the method was understood),
which should be tagged SILLY. The grader tagged it CONCEPTUAL. It also double-counted the
propagated downstream error (the wrong sum-verification that followed from the misread root)
as a SECOND conceptual mistake, instead of attributing both to the single root-cause slip.
This is the previously-flagged "everything tagged conceptual" risk, now with a concrete
repro. This is a PROMPT-QUALITY issue, NOT the parse bug (parse is fixed in #174). Fix =
PR B grading-prompt tightening, MEASURED against a full mistake-scenario test matrix
(conceptual vs calculation vs silly vs presentation; single-slip vs propagated-error
attribution). Do not ship a student-facing link until grading classification is trustworthy.
