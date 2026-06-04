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

## D26 — banned-syllabus content leaked into UNGUARDED files (descriptive/teaching metadata)
`syllabusGuard` scans the QUESTION BANK only. The bank was correctly cleaned of dropped-syllabus
topics, but banned terms survive in descriptive/teaching metadata that the guard never looks at:
- `src/lib/desktop/topics.ts` — Exam Trends blurbs still say "Euclid's division lemma" (Real Numbers,
  ~L25) and "the division algorithm" (Polynomials, ~L35).
- `src/tutor/topicTeachContracts.ts` — the tutor ACTIVELY TEACHES Euclid's lemma / division algorithm
  (MOST SERIOUS — students are taught removed content).
- `class10ContentConfig.ts`, `practiceFilters.ts` — also carry banned references.
FIX (next task, HIGH): clean these files AND extend `syllabusGuard` to scan them so it can't regress.
The tutor-teaching case is the urgent part. NOTE: `src/lib/desktop/` and `src/data/` are forbidden
lanes — the cleanup needs explicit scope. (Exam Trends #184 did NOT touch these — it read the blurbs
as-is; the leak predates it and is tracked here for the content-correctness sweep.)

> **UPDATE (#186, 2026-06-04): the GUARD HALF of D26 is DONE.** `syllabusGuard` now scans all 24
> board-prep surfaces (incl. `topicTeachContracts.ts`, `topics.ts`, config files) via a curated
> phrase scan, and the RULER itself was corrected (step-deviation un-banned, reproduction bug fixed,
> 3 maths items added, citation fixed). The CONTENT cleanup remains — see D28 for the exact 93-item
> worklist the corrected guard now surfaces. The gating guard is RED until that sweep lands.

## D27 — Exam Trends tiering/trend/marks data provenance is stale/untraceable
The `must-crack / high-roi / good-to-do` `tier` enum exists and engines consume it (`strategyEngine`,
`dailyMix`), but TOPIC-LEVEL priority (which topic is must-crack, its trend tier, its ~marks) is not
cleanly traceable and (per owner) was derived from OLD 10-yr data + the PRE-revision syllabus. Exam
Trends' entire job is telling students what matters MOST, so this data must be RE-DERIVED FRESH against
the current CBSE syllabus + the latest paper pattern (a scientific basis) BEFORE the planned band
redesign. HPQ counts are also to be re-checked (later). LESSON: #184 faithfully RENDERS whatever
`desktopTopicsBySubject` returns (trend tier, weight, blurb) — it did NOT validate the underlying
priorities; the redesign surfaced that the data itself needs a fresh derivation. Do NOT build the
Must-crack/High-ROI/Good-to-do bands on the stale tiering — re-derive first.

## D28 — the corrected syllabusGuard's 93-item RED output IS the content-sweep spec (#186)
After #186 corrected + extended the guard, the gating `syllabusGuard` run exits 1 with a precise,
spot-checked-real worklist (no false positives) — this is the SPEC for the next sweep PR:
- **Question banks (exact `subtopic:`, 46 hits):** `"Conversion of Solids"` in
  `surfaceAreasAndVolumes.exemplar.ts` (×23), `surfaceAreasAndVolumes.ncert.ts` (×10),
  `surfaceAreasVolumes.pack2.ts` (×13).
- **Board-prep surfaces (curated phrase, 47 hits):** EMI/Motor/Generator across
  `predictedQuestionsScience.ts` (EMI×10, Motor×8, Generator×2), `hpqCompetencyAdditions.ts` (EMI×5,
  Motor×1), `highlyProbableQuestions.ts` (Motor×1), `class10ContentConfig.ts` (EMI×1, Motor×3),
  `class10ScienceTopicTrends.ts` (EMI×1, Motor×1); `topics.ts` (Euclid's Division Lemma×1, Conversion
  of Solids×1, EMI×1); `topicHubContent.ts` (Frustum of a Cone×1, Conversion of Solids×2, EMI×1);
  **`topicTeachContracts.ts`** (Euclid's Division Lemma×1, Euclid's Division Algorithm×1, Acquired and
  Inherited Traits×1, Homologous Organs×1, Analogous Organs×1, EMI×1, Motor×1 — the tutor literally
  teaches removed content: `:73` "state Euclid's division lemma: a = bq + r", `:412` "evidence for
  evolution: homologous organs, analogous organs, fossils").
The sweep removes/retags these → gating guard + matrix #19 go green. LESSON: a curated phrase scan
(unambiguous multi-word phrases only) catches real leaks while bare-word prose scanning would drown in
false positives ("gas evolution", `dailyMixGenerator`) — see `SURFACE_BANNED_PHRASES`.

## D29 — CLAUDE.md §6 `verify-build.mjs` is a stale name; the real verifier is `verify-production-build.mjs`
CLAUDE.md §6 says run `node scripts/verify-build.mjs`, but that file does not exist (it was removed in
the #164 tooling decommission). The actual build verifier present in the repo is
`lazytopper/scripts/verify-production-build.mjs` (also `scripts/verify-production-build.mjs`). Use the
`verify-production-build.mjs` name; treat the CLAUDE.md reference as stale. (Previously noted in
OPEN_QUESTIONS; recorded here as the canonical fact.)

## D30 — PYQ `solutionSteps` data-quality issue (truncated/garbled steps) — later cleanup
Some PYQ questions carry truncated or garbled `solutionSteps` (incomplete working / mangled notation)
— a content-quality issue independent of the syllabus sweep. Flagged for a later data-quality cleanup
pass (do NOT bundle into the content sweep, which is scoped to banned-syllabus removal). Tracked in
OPEN_QUESTIONS.

## D31 — syllabusGuard surface-scan blind-spot for generic phrases (+ the untouched polynomials teach-contract leak) — tracked follow-up
The board-prep SURFACE scan (`SURFACE_BANNED_PHRASES`) deliberately uses only unambiguous multi-word
phrases and **omits bare generics** ("Evolution", "Generator", "Motor", "Division Algorithm",
"Constructions", "Fossil", …) to avoid false positives on prose ("gas evolution") and code identifiers
(`worksheetGenerator`). A real consequence: content that is out of the 2026-27 scope but only named by
a generic term is NOT flagged by the guard.
Concrete instance (found during the #188 content sweep, left untouched on purpose): the `polynomials`
contract in `lazytopper/src/tutor/topicTeachContracts.ts` (~:79 goalLine, :87/:91 keyIdea) still
teaches the **polynomial division algorithm** ("use the division algorithm: p(x) = g(x)·q(x) + r(x)")
— out of the restricted (QUADRATIC-only) Polynomials scope for 2026-27. It was OUTSIDE the 93-item
worklist and not guard-flagged, so it was correctly deferred rather than expanding PR #188's scope.
Follow-up (tracked in OPEN_QUESTIONS): (a) add a precise phrase such as "division algorithm for
polynomials" / "polynomial long division" to `SURFACE_BANNED_PHRASES` (carefully — must not over-match
in-syllabus prose), then (b) a small sweep of the polynomials contract. Broader lesson: the guard's
precision (zero false positives) is a deliberate trade against recall on generic phrasings; when a
topic's only mention uses a generic word, a human/scoped pass is still needed.

Related (also surfaced at #188): the scope guard (`scopeGuard.mjs --mode product`) reports FAIL on
every changed `lazytopper/src/**` file because, in this combined repo, `git diff` emits
`lazytopper/src/...` paths while the policy `product` lane rule is `src/` (no prefix). This is a LOCAL
path-prefix artifact, not a real lane violation (same family as the D23-era scope:guard path issue).
Do not "fix" it by editing the policy in a product PR; in a canonical app-root checkout the paths are
`src/...` and it passes.
