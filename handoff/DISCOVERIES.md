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

## D32 — Firestore init MUST use `initializeFirestore(app, { ignoreUndefinedProperties: true })` — never revert
Plain `getFirestore(app)` does NOT set `ignoreUndefinedProperties`, so the Firestore JS SDK **throws**
`"Unsupported field value: undefined"` on ANY document that carries an `undefined` field. Attempt docs
routinely carry `undefined` (`bloomSkill` on the C&I/MCQ paths, `topicName` when absent), so with plain
`getFirestore` every `practiceInsights` / `attempts` write threw — and because the writes are
fire-and-forget with `.catch(() => {})`, the error was silently swallowed for **weeks**. localStorage
worked (`JSON.stringify` drops `undefined`) and `recordMistake` worked (its docs have no `undefined`);
that asymmetry masked the bug. `firebaseClient.ts` is the SOLE Firestore init (`getFirestore`/
`initializeFirestore` appears in no other file), so `initializeFirestore(app, { ignoreUndefinedProperties:
true })` is safe as the first Firestore call and fixes the entire class across every collection. Fixed in
#322 (`706cc12`). **Never revert to `getFirestore`, and never re-mute the write `.catch` to `() => {}`**
— a bare catch is exactly what hid this. A unit test CANNOT catch a regression here: the in-memory
Firestore mock accepts `undefined`, unlike real Firestore — the real gate is an owner live-verify.

## D33 — A new top-level Firestore collection doesn't appear in the console left-nav until you reload
When the FIRST document of a brand-new top-level collection is written, the Firestore console's left-nav
collection list does NOT live-update — the collection only shows after a **page reload**. "I can't see the
collection" therefore does NOT mean "the write failed." When live-verifying a first-ever write (as with
`practiceInsights` in #322), reload the console before concluding anything is broken.

## D34 — A cropped screenshot will stand in for the page, and the crop wins
During `#616` the cofounder asserted that the `email-already-in-use` state rendered copy saying
"…or reset your password" while **no reset control was visible in that state**, and specced a fix.
The claim came from an owner screenshot **cropped at the submit button** — and `offerReset`'s
"Reset my password" button renders *below* the submit. It had been firing correctly since round 1,
and a test already asserted it.
★★ THE MECHANISM, WHICH IS THE POINT: **the crop agreed with the argument he had just made, so the
search ended there.** Evidence confirming the current hypothesis stops investigation earlier than
evidence contradicting it, and a cropped image is indistinguishable from a complete one unless you
go looking for the edge.
LESSON: a screenshot is a claim about a VIEWPORT, never about a page. Before speccing a fix from
one, confirm the region you care about was actually IN it — `fullPage: true`, or a DOM query.

## D35 — A test snippet in a spec can be unrunnable, and it will look authoritative
`#616`'s round-2 brief supplied a replacement test asserting
`expect(signInWithEmailPassword).toHaveBeenCalledTimes(1)` after clicking through to the returning
branch — **with nothing submitted**. It cannot pass. The lane kept the structure, added the submit,
and reported the correction.
Same round, the same file needed `signInWithEmailPassword` **added to its `vi.mock` factory**:
`AuthDoor` destructures it, so an absent member reads `undefined` and the component **throws on
submit**. That file's own comment already recorded exactly this reasoning for its phone members —
the omission was in the brief, not the file.
LESSON: **code in a brief is a proposal, not a fixture.** Run it before trusting it. A snippet that
compiles-by-eye can still be logically impossible, and an incomplete mock factory fails at the call
site with an error naming the component, not the omission.

## D36 — A static grep cannot verify a claim about files that defeat static greps
`#616`'s allowlist named four `Login*` test files, derived from an import-pattern grep. **CI found
eight** files that mount the auth door. The two the grep missed — `SignUpPage.name.test.tsx` and
`SignUpPage.phone.test.tsx` — use a **dynamic `await import("./Login")` inside the test body**.
★★ That form is invisible to BOTH methods this project uses: a path glob
(`vitest run src/pages/Login`) never matches the filename, and a `from "./Login"` grep never matches
the import.
LESSON: to enumerate "every test that exercises X", grep **both** import forms
(`from "./X"` AND `import("./X")`) — or run the whole suite and read what mounted. The enumerated
eight for the auth door are in `[FU-DOOR-TEST-SURFACE-EIGHT-FILES]`. This is a specific instance of
ENUMERATE THE SET; DO NOT GREP A MEMBER, with the sharper edge that here even a *correctly written*
grep returns the wrong set.

## D37 — A duplicate CSS selector is a correctness bug when a test source-scans, and it fails naming the wrong cause
`Login.oneDoor.test.tsx` pins dark-theme colours by reading `Login.tsx` as text: its `ruleBody()`
helper resolves a selector with `src.indexOf(selector)` and returns **only the FIRST match**.
`#616` added a *second* `.lt-login-page[data-login-theme="dark"] .lt-google` rule (a green lift)
**above** the existing one. The pinned `color: #071a3d` was still present and still applied in the
browser — the cascade was fine — but the test read the new block, found no colour, and went red
**reporting a missing colour that was there.**
LESSON: where a test scans source rather than the DOM, **duplicate selectors are a correctness
problem, not a style one** — merge into one rule. And when a source-scanning test fails, check
whether the assertion is even looking at the block you changed before "fixing" the product.
⇒ `ruleBody()` should assert its selector appears exactly once: `[FU-TEST-SOURCESCAN-FIRST-MATCH-ONLY]`.

## D38 — A contrast probe that ignores alpha and gradients returns numbers that are simply wrong
`#616` built a browser contrast probe. Its first version took the nearest non-transparent
`backgroundColor` up the tree and fed the string to a luminance function reading the first three
numbers — so `rgba(22,185,106,0.1)`, a **10%-alpha wash**, scored as **solid** green. It also never
saw the login brand panel at all: that navy is a `background-image` **gradient**, whose
`backgroundColor` is `transparent`, so the walk sailed straight past it.
It **reported 1.09:1 for text that reads perfectly.** Rewritten to composite translucent layers over
the first opaque backdrop and — on meeting a gradient — to score against **every colour stop and
keep the worst**, it immediately found a genuine **PRE-EXISTING 3.76:1** on the mobile offer strip
(0.86rem/0.8rem text, nowhere near the large-text exemption) that no assertion in the repo could see.
★★ LESSON: **a measurement that cries wolf is as dangerous as one that sleeps** — the natural
response to a false 1.09:1 is to relax the threshold, which then hides the true failures. Any
contrast check added anywhere in this repo must composite alpha AND handle gradient backdrops.
Reference figures, verified twice (computed and in-browser, agreeing exactly): white `#ffffff` on
`#16b96a` = **2.57:1 (fails)**; navy `#071a3d` on `#16b96a` = **6.68:1 (passes)**.

## D39 — A vacuous guard reads exactly like a real one, and only DIFFERENTIAL MUTATION tells them apart

`Login.oneDoor.test.tsx` carries `expect(screen.queryAllByRole("tab")).toHaveLength(0)` — the pin
protecting AUTH-3's ruling that the door has no new-vs-returning tabs. It had been green since
AUTH-3. **It never opens the phone step**, so when `NAME-2` added a segmented control there, that
assertion could not have caught a `role="tab"` regression on it. Its green was indistinguishable
from its absence.

`#623` mutated `role="group"` to `role="tab"` on the phone control **once**, then ran both suites
against the same mutated tree: the new `Login.phoneNameCapture.test.tsx` went **RED (2 failed)** and
`Login.oneDoor.test.tsx` stayed **GREEN (26 passed)**.

★★ LESSON: **a single-suite mutation run would have reported a red and concluded the guard worked.**
The red came from the new test; the old one was asleep. **When two suites claim the same invariant,
mutate once and check BOTH** — and treat a suite that stays green under a mutation it should catch
as **absent**, whatever its name says. A negative assertion (`toHaveLength(0)`, `queryBy… → null`)
passes just as happily when the thing it guards was never rendered in the first place, which is why
every absence claim in this repo is required to ship with a control that renders the thing.

⚠ **Not fixed.** `Login.oneDoor.test.tsx`'s assertion is still scoped to whichever step it happens to
have open. `[FU-DOOR-TAB-GUARD-MISSED-PHONE-STEP]`.

## D40 — A mutation that cannot land must be recorded GREEN, never silently swapped for one that works

`NAME-2`'s brief specified six mutations. **M4 — "clear the name in `goToStep` → test 4 red" — could
not go red**, because `goToStep` runs on step **ENTRY**, before the student has typed anything; it is
not on the `number → otp` path at all. The lane fired it anyway and got `Tests 15 passed (15)`.

It then **recorded that green in its report**, and separately built the honest mutation — clearing
the name where `setPhoneStep("otp")` is called, which is on the path — which went **red on four
tests**.

★★ LESSON: the tempting move is to quietly substitute the working mutation and report six clean reds.
That would have been a **strictly worse outcome than a failing test**: the mutation table would have
looked perfect while concealing that **the spec's model of the flow was wrong**, and the next lane to
touch this step would have inherited the same wrong model. **A mutation is evidence about the code
AND about the spec. Report both readings.**

★ Corollary already standing in this repo (`fresh-worktree` era): assert `mutated-sha != baseline-sha`
**before** recording any red, or a mutation that never applied reads as a passing guard. D40 is the
mirror case — the mutation applied perfectly and still proved nothing about what it claimed to.

## D41 — PowerShell `Measure-Object -Line` is not `wc -l`: it silently excludes blank lines

`(Get-Content $file | Measure-Object -Line).Lines` **does not count blank lines.** Verified both
directions on `lazytopper/src/pages/Login.tsx` at `ecacdfed`:

```
git show ecacdfed:.../Login.tsx | wc -l                    -> 2457   (real lines)
git show ecacdfed:.../Login.tsx | grep -c '[^[:space:]]'   -> 2230   (non-blank)
Get-Content <branch copy> | Measure-Object -Line           -> 2368
(Get-Content <branch copy>).Count                          -> 2604   (real lines)
```

`Measure-Object -Line` returns the **non-blank** count, exactly.

★ **This produced a wrong finding in a report.** `#623` measured 2230, compared it against the
brief's cite `Login.tsx:2318`, concluded the line was out of range, and recorded the cite as **stale**
in its report and its PR body. **The cite was correct** — `New or returning` sits at exactly `:2318`.
**A correct measurement of the wrong quantity, published as a fact about someone else's document.**

★★ LESSON, and it is the general one: **the error was invisible because the number was real.** It
came from a real command run against the real file, so nothing about it looked like a guess — which
is precisely why it would have survived being copied into a third document. **Any number that will be
compared against a line number must come from `wc -l` or `(Get-Content).Count`.**

★ The lane's recommendation — **cite by quote or symbol, not by line** — survives its own error, but
the reason inverts: not because line cites go stale, but because **verifying a line cite is itself
easy to get wrong.** `[FU-PS-MEASURE-OBJECT-SKIPS-BLANKS]`.
