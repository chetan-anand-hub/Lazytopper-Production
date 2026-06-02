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

## D22 — Vercel "AI API request failed" for tutor/checker is BY DESIGN, not a regression
The AI gateway runs ONLY on localhost; Vercel has no `/api/*` route until the Railway deploy
(ISSUE-009), so the production app has nowhere to route AI calls. Testing the checker/tutor on
the Vercel link therefore returns "AI API request failed" — EXPECTED. AI features are testable
ONLY on localhost (gateway up + Vite started with `API_SERVER_PORT=3001`, per D19) until
Railway. LESSON: do not chase the Vercel "AI failed" message as a bug; it is the ISSUE-009
gap. The unlock is the Railway deploy + `vercel.json /api/*` rewrite (+ rate limiting).

## D23 — scope:guard was DEAD since `2081003` (silent gate break via a docs-cleanup chore)
`lazytopper/docs/project_memory/governance/repo_boundary_policy.json` was added in `d4ed284`
and read by THREE live scripts (`scripts/scopeGuard.mjs`, `scripts/ops/repo_boundary_
acceptance.mjs`, `scripts/ops/software_testing_bot.mjs`). The chore `2081003` ("remove internal
docs and reports from git tracking") ran `git rm --cached` across the whole `project_memory/`
tree and untracked this ONE live-dependency file too — so `scope:guard`, `scope:guard:tutor`,
`test:repo-boundary`, and `ci:smoke` (first step is `scope:guard:tutor`) all threw "missing
policy file" from then on. Restored in #176 (real file from history, not hand-authored —
avoids drift). NOTE: re-TRACKING is the durable fix (a tracked file materialises in every
clone/CI regardless of `.gitignore`; the `project_memory/` ignore rule still matches by path,
but `git check-ignore` reports no-match for a tracked file). The break was the untrack, not
the ignore rule — so no `.gitignore` edit was needed. LESSON: a docs/file-removal can silently
break a live gate; and `ci:smoke` runs only locally (not in CI), so the broken gate failed
silently. Wiring `ci:smoke` into CI (so a broken gate fails loudly) is the deeper fix
(backlog). Also surfaced (only with uncommitted changes): scopeGuard run from the `lazytopper/`
subdir gets `lazytopper/…`-prefixed git paths the lane rules (written relative to `lazytopper/`)
don't match — harmless once changes are committed; pre-existing, not in #176's scope.
