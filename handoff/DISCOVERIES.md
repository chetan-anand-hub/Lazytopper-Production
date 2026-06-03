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

## D21 — check-solution OVER-classifies mistakes as "conceptual" (RESOLVED by #178)
> RESOLVED 2026-06-02 (#178): grading prompt tightened + measured 6/9→8/9 on the T1–T9 matrix.
> Sign-misread → silly; propagated error → single root cause; missing → null; unbalanced →
> presentation; T2 stays conceptual. T4 = accepted boundary case (DECISION_LOG 2026-06-02).
> Original analysis retained below for context.

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

## D24 — the LIVE concept_teach prompt is in promptLearn.cjs, NOT promptTeachContract.cjs
The desktop/mobile "Learn this" drawer (ConceptTeachDrawer → TeachFlow → `/api/mentor` concept_teach)
resolves to a FREE-TEXT response (trace `normalized_mode: learn_teach`, `schema: text`) built by
`buildConversationalTeachSystemPrompt` in `server/prompts/promptLearn.cjs` (system prompt) + the
`learn_teach`/concept branch of `buildUserPrompt` in `server/routes/mentorModeHandler.cjs` (user
prompt); the route sends `contents = [systemPrompt, ...history, userPrompt]`. `promptTeachContract.cjs`
(`buildLearnTeachContractPrompt`) is the STRUCTURED-contract path and is NOT used by concept_teach.
The PR B2 brief named promptTeachContract.cjs — wrong; verified via the live trace before editing.
Because the path is free text, there is NO teach-contract validator to change in lockstep.
LESSON (and D24 general form): verify repo facts directly against the running code/trace — the brief's
"mobile already wires the tutor" assumption and the named prompt file were both wrong on inspection.
Future teach-prompt work targets `promptLearn.cjs` + `mentorModeHandler.cjs`.

## D25 — Gemini 429 during testing = prepaid-balance/RPM, not a local rate limiter
"Mentor is rate-limited. Please wait and retry." is a faithful passthrough of a real Gemini
`429 RESOURCE_EXHAUSTED`. In this session the body said "Your prepayment credits are depleted" — a
BILLING/quota limit on the key's AI Studio project (top up at ai.studio, or swap a funded key into
`server/.env`), NOT a per-minute throttle and NOT a code bug. Heavy measurement runs (BEFORE/AFTER
matrices ≈ dozens of calls) plus live clicks burn the balance fast. LESSON: keep live measurement
runs lean; treat repeated 429s as a quota/billing signal first. AI cost/rate-limit hardening is a
launch gate (backlog). (Separately, the `/api/user/progress` 503 in local console is by-design — no
local `DATABASE_URL`; it is the progress sync, not the tutor.)
