# WAVE ME-B STATE — updated 2026-08-09, controller start

TRUNK: `baf9b67a8b460471bbddbad70243ec3a1e104baa` — re-derived via `git ls-remote origin base/approved-thru-437`.
  ⚠ The owner's brief quoted `f654dc64`. That is an ANCESTOR of trunk (verified with
  `git merge-base --is-ancestor` → true). Trunk moved FORWARD one commit: `baf9b67a`
  `docs(ops): commit the agent standing rules (#635)`. No backward move.

OPEN PRs (`gh pr list --state open`, at start):
  - #644 `fix(deps): declare tsx in lazytopper so the spawned warmup child can resolve its loader (TSX-1)` — DRAFT — DPDP-B's lane.
  - ⇒ NO handoff PR open. The handoff lock is free as of controller start. RE-CHECK before opening one.

CONTROLLER: ME-B. Lifetime = ONE WAVE (addendum §1). Stands down at handoff.

---

## VERIFIED AT START — metadata only, no product source read

| Claim | Check run | Result |
|---|---|---|
| `#631` is on trunk | `git cat-file -e origin/base/…:lazytopper/src/pages/MeProgressPage.tsx` | EXISTS |
| the two old Me pages are gone | same, for `desktop/DesktopMePage.tsx` + `mobile/MobileMePage.tsx` | ABSENT (both) |
| ARRIVAL-1 allowlist paths exist | `git cat-file -e` ×5 | all EXIST |
| ME-A + DPDP-A closed in `handoff/` | `git ls-tree origin/base/…  handoff/` | `WAVE_STATE_ME_A_ARCHIVE.md` + `WAVE_STATE_WAVE_DPDP_A_ARCHIVE.md` both tracked |
| RETRY-1's real surface | `git grep -ln conceptForBankQuestionId` | `mistakeConcept.ts` (+`.test.ts`), consumed by `chapterTestGradeService.ts`, `fullMockGradeService.ts`, `worksheetGradeService.ts`, `mistakeIntelligence.ts` |

⚠ **`RETRY-1`'s allowlist was NOT given by the brief.** It is being scouted, not guessed. See LANES.

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| ARRIVAL-1 | `?concept=` on TopicHub + `arrival` on TutorBrief | (see below) | ⛔ **BLOCKED — 0 files, SUPERSEDED** | — | returned 9 findings disproving its own spec. **Correct outcome.** Report: `…\diff\report-arrival-1-2026-08-09.md` |
| TOPICHUB-1 | **supersedes ARRIVAL-1.** TopicHub reads `?concept=` | `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx`, `ConceptSpine.test.tsx`, + tests | ✅ **PASS — FINAL. PR #647 DRAFT, CI GREEN.** Badge = `You came here for this.` (R7). Final head **`9144c216`**, CI run **31308051980** PASS, `Test Files 138 passed (138)` / `Tests 1719 passed (1719)`, root matrix `# suites 29 / # pass 196 / # skipped 0`. ⭐ Guard updated a THIRD time: pins the new string, keeps no-numeric, and **RESTORES the no-performance-claim assertion widened so `costing` is a banned token** — the withdrawn wording cannot return. `[FU-ARRIVAL-COPY-ASSERTS-UNBACKED-MARKS-CLAIM]` **CLOSED by removal of the cause.** ⚠ A remote trunk-merge (`26d3c8b1`, carrying #644/#645/#646/#648) landed mid-push and the push was **rejected**; the lane **did NOT force-push** — it fetched, inspected both directions, merged remote into its branch, and re-reconciled `gh pr view 647 --json files` against base afterwards. **PR diff still exactly 4 files.** ⭐ That is the Wave-4 force-push mechanism *avoided* rather than survived. **Owner flips it out of draft.** | **#647** | head `81406ea5` · CI run **31306745098** Quality Gate PASS (+ Lane Overlap 31306745095, CodeQL 31306745097), **pulled from the head SHA, not the PR** · zero-skip: `# suites 29 / # pass 196 / # skipped 0`, `Test Files 135 passed (135)`, `Tests 1662 passed (1662)` · own suites named as run: `ConceptSpine.test.tsx (29 tests)`, `DesktopTopicHubPage.test.tsx (12 tests)` · CI classed it *"FULL BAR — 4 non-docs path(s) changed"* · 3 mutations restored byte-exact. ⛔ **BLOCKED FROM LEAVING DRAFT — doctrine ruling owed, see below** |
| ~~arrival on TutorBrief~~ | CUT FROM THIS WAVE | `ai/tutorClient.ts` + `server/prompts/tutorSystemPrompt.cjs` | ⛔ OUT OF SCOPE | — | consumer is under `server/**` = **DPDP-B territory**. Shipping the field alone = silent no-op |
| SCOUT-PROTO | render the LOCKED prototype at 1180/390/360 × 3 states | writes NOTHING | DISPATCHED | — | feeds ME-2 only |
| SCOUT-RETRY | locate the retry affordance surface; derive RETRY-1's allowlist | writes NOTHING | ✅ RETURNED | — | findings below — the lane was RE-SCOPED as a result |
| RETRY-1 | **RE-SCOPED: logic only.** classify id → exact-retry vs similar-only | `services/mistakeRetry.ts` (NEW), `services/mistakeRetry.test.ts` (NEW) | ✅ **PASS — FINAL. PR #649 DRAFT, CI GREEN.** Base `376e30b0` (rebased `3cf01287`→`376e30b0`; ⭐ done as `git reset` + `merge --ff-only`, **NOT `reset --hard`** — never auto-approved and unnecessary). Head `25862843`, CI run **31308051342** PASS · `# tests 196 # suites 29 # pass 196 # fail 0 # skipped 0 # todo 0` · `Test Files 138 passed (138)` / `Tests 1723 passed (1723)` · own suite named: `mistakeRetry.test.ts (22 tests)` · **all gates RE-RUN post-rebase, not carried.** ⭐⭐ **MERGE-BASE RECONCILIATION PERFORMED** — `gh pr view --json files` == `git diff --name-only 376e30b0..25862843`, IDENTICAL, no squash re-carry. **This is the Wave-4 "missing check that nothing does today" — now done.** ⭐ **`[FU-RETRY-NO-BUILD-CHUNK-YET]` is now VERIFIED, not asserted:** CI's build ran (1124 modules, 9.69s) and emitted **no `mistakeRetry` chunk**, confirming the ladder rung is still *test-only*. **It flips when ME-2 imports the module.** | **#649** | 2 files · tsc app+test ✓ · mojibake ✓ (control injected, exit 1) · scope:guard `inspected=2` **not vacuous** · vitest 22/22 · **root guard matrix run locally: 196 tests / 29 suites / fail 0 / skipped 0** · 3 mutations restored byte-identical to `30c2c52f`. Worktree `C:\Projects\LT-worktrees\retry-1`. Report: `…\diff\report-retry-1-2026-08-09.md` |
| ME-2 | the v7 page **+ the retry affordance's UI half** | `pages/MeProgressPage.tsx` + tests | NOT STARTED | — | ⚠ LARGE. Do not start below 35% (addendum §3) |

## DISJOINTNESS
ME-B: `lazytopper/src/pages/**`, `lazytopper/src/lib/desktop/navigation.ts`, `lazytopper/src/services/mistake*`
DPDP-B: `lazytopper/server/**`, `artifacts/**`, `.github/**`, manifests, the settings surface
⇒ Exact-path disjoint (`lane_overlap.mjs:112` is `files.filter(f => mineSet.has(f))` — exact membership).
⇒ RE-CONFIRM with `gh pr list --state open` before EVERY dispatch.

## DECISIONS MADE THIS WAVE
- Trunk re-derived as `baf9b67a`, not the briefed `f654dc64`. Reason: `ls-remote` is the only
  authority; the brief was a day old. Ancestry checked in BOTH directions, not just equality.
- RETRY-1's allowlist is scouted before its brief is written. Reason: the brief did not supply one,
  and the model's standing rule is that inventing a filename ships a double-write hazard.
- The prototype click-through is delegated to a scout rather than done by me. Reason: addendum §4B —
  a controller that opens files becomes a subagent with a plan attached.
- ⭐ **RETRY-1 SPLIT INTO LOGIC (its own lane) AND UI (folded into ME-2).** Reason: SCOUT-RETRY
  established that **there is no per-entry mistake-log UI anywhere in the product today** — every
  consumer aggregates, and in `MeProgressPage.tsx` the fetched `MistakeLogEntry[]` is used *only* as
  a gate (`mistakeLogs.length > 0`). So RETRY-1 was never "add a button to a list"; it was "build the
  list", into the one file ME-2 rebuilds wholesale. Keeping them separate would have had RETRY-1
  author a list and ME-2 delete it. The logic half is pure, new-file, and collides with nothing.
  ⇒ This dissolves the file collision. The lanes stay ordered only for RAM headroom.

## FU ENTRIES COLLECTED
- `[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` — carried in from ME-A. The dormancy block must be
  RE-DERIVED, never copied.
- ⭐ `[FU-CONCEPT-RESOLVER-SILENT-NULL]` — **NEW, owner-flagged as the more alarming find.**
  `conceptKeyForLabel` resolves against the tutor **figure** catalogue and returns null for **39 of 112**
  live concepts (~**35% silent-null**) — in a resolver whose own data file states *"conceptKey … never
  resolve on it"*. **TWO wrong resolvers were specified in one wave**: ARRIVAL-1 killed
  `resolveCanonicalSlug` (the owner's), and the owner then handed me `conceptKeyForLabel`, which I
  passed on. ⭐⭐ **It surfaced ONLY because it was passed on flagged `UNVERIFIED` with an instruction
  to verify rather than inherit. Owner: keep that pattern in every brief.**
- `[FU-MISTAKE-INSIGHTS-PANEL-DEAD]` — NEW. `components/dashboard/MistakeInsightsPanel.tsx` calls
  `getMistakeLogs` and is imported nowhere. Reported by SCOUT-RETRY, **not independently confirmed by
  me.** Not this wave's business; do not delete on this evidence alone — the dead-page sweep learned
  that a page dead to users can still be a `readFileSync` fixture for an ops gate.

## ★ SPEC PREMISES DISPROVED THIS WAVE — provenance kept intact
1. **"three synthetic prefixes" → there are FOUR.** SCOUT-RETRY reports the pinning test in
   `mistakeConcept.test.ts` asserts `ws:`, `fm:`, `ct:` **and `ci:`** all resolve `undefined`.
   The brief's §3 listed three and separately claimed Check & Improve has "no id at all".
2. **"C&I has no id at all" is HALF TRUE.** Reported: the C&I **multi-question** path writes a
   synthetic `ci:{sessionCode}:q{n}`; only the **single-question** path omits `questionId` entirely.
   ⇒ C&I is TWO cases, not one. The brief's "no retry affordance renders" is correct for only one.
3. **"Quick Practice and HPQ re-serve the exact question" — UNVERIFIED, and at risk.** Reported:
   quick practice writes a real bank id; **HPQ ids look like `ple-hpq-101` and
   `highlyProbableQuestions.ts` is not imported by `canonicalQuestionBank.ts`.** The scout said in
   terms: *"I could not verify they resolve to a bank row."* ⇒ HPQ may be a THIRD class. If it is,
   labelling it "Re-do that one" ships precisely the lie the owner ruled against.
   ⚠ **PASS THIS ON AT THE CONFIDENCE IT ARRIVED WITH — "unverified", not "broken".** A controller
   amplifies; a restated finding is harder to reject than a raw one.
4. **"Re-do that one" is not plumbing — the resolver does not exist.** Reported: no id→question
   lookup exists anywhere (`canonicalQuestionBank.find` / `byId.get(` return nothing across
   `services/` and `lib/`). "Try one like it" is already buildable; the exact re-serve is new capability.

### From ARRIVAL-1 (BLOCKED, 0 files — the correct outcome)
5. ⭐ **"TopicHub reads NO query params at all" is FALSE.** Reported: it already parses
   `topic`/`source`/`returnTo` via `new URLSearchParams(location.search)`. **The `grep -c
   useSearchParams → 0` was ACCURATE and measured the WRONG QUESTION.** The owner quoted it; I
   repeated it in a brief *with a control*, and the control did not save me because **the control's
   path was itself wrong** (finding 6). ⇒ **CONCLUSION SURVIVES** — TopicHub genuinely never reads
   `concept`. ⇒ **EVIDENCE WITHDRAWN.** `[FU-ARRIVAL-CONTROL-PATH]`
   ⚠ **A control that cannot run is not a control.** Verify a control's path before trusting it.
6. **My control path was wrong.** `HighlyProbableQuestions.tsx` is at `lazytopper/src/pages/`, NOT
   `pages/desktop/`. **CONFIRMED BY ME** via `git cat-file -e` (ABSENT at the path I wrote), and
   independently corroborated by SCOUT-RETRY, which cited the same `pages/` path for another reason.
7. **`resolveCanonicalSlug` is the CHAPTER-key authority, not a concept resolver.** Reported: feeding
   it a concept falls through to `normalizeTopicSlug` and yields a non-concept, non-chapter string;
   the right symbol is `conceptKeyForLabel` (`pages/tutor/conceptVisualCatalogue.ts`, path confirmed
   by me). ⚠ Both the owner's arc doc AND my brief specified `resolveCanonicalSlug`. Consistent with
   the standing lesson that **`conceptKey` is editorial and must never be re-derived from a label.**
   `[FU-ARRIVAL-CONCEPT-RESOLVER]` — **subagent's claim, unverified by me.**
8. **ConceptSpine concept rows have NO expand state** — "expand and scroll that spine row" is NEW UI,
   and `ConceptSpine.tsx` was outside the allowlist. `[FU-SPINE-NO-ROW-EXPANSION]` — unverified by me.
   ⇒ I widened the allowlist to include it. Path confirmed: `src/components/topichub/ConceptSpine.tsx`.
9. **The owner's count was off:** "nine `focus`/`markBand` references" — nine is `focus` ALONE;
   combined is 15. **Conclusion stands (nothing to build in `navigation.ts`); evidence withdrawn.**
10. ⚠⚠ **REPORTED: the owner's non-negotiable product rule may ALREADY BE LIVE ON TRUNK.**
   `selectTutorDemoQuestion({ subject, topicKey, concept })` reportedly already picks the first worked
   example by concept, and `TutorPage` already reads `searchParams.get("concept")`; all three `arrival`
   fields reportedly already exist (`concept`; `brief.mistakes.marksLostRecent`;
   `brief.mistakes.topType`). **`[FU-ARRIVAL-BRIEF-REDUNDANT]`**
   ⛔ **THIS IS ONE SUBAGENT'S UNVERIFIED CLAIM AND MUST NOT BE RESTATED AS FACT.** A controller
   amplifies; a restated finding is harder to reject than a raw one. **Owner live-verify only.**
   ⚠ It also warns a 2nd marks-lost copy placed OUTSIDE the server's `hasData` gate would CREATE the
   "report card wearing a tutor's face" hazard the owner ruled against — i.e. building `arrival`
   naively is not neutral, it is a regression risk.

### From TOPICHUB-1 (PASS, 4 files)
11. ⭐⭐ **NEITHER resolver candidate was correct — including the one I put in the brief.**
    `conceptKeyForLabel` resolves against the tutor **FIGURE** catalogue, a strict subset that returns
    null for **39 of 112** live concepts (~35% silent-null), and whose own data file states
    *"conceptKey … never resolve on it"*. The lane used **exact match on
    `actionable.boardEssentials[].name`** instead. ⇒ ARRIVAL-1 correctly disproved
    `resolveCanonicalSlug`, **and its replacement was also wrong.** I passed the candidate on flagged
    UNVERIFIED and instructed the lane to verify rather than inherit — **that instruction is the only
    reason this was caught.**
12. **`BoardConcept` has NO key field** — "resolve the label to a concept KEY" had no target.
    **The row's identity IS its name.** `[FU-CONCEPT-LABEL-IS-THE-ONLY-CONCEPT-ID]`
13. ⚠⚠ **THIS SHIPS AS A CONSUMER WITH NO PRODUCER.** Nothing in the product emits `?concept=` into
    `/topic-hub`: `buildDesktopTopicHubPath` is structurally incapable (`DesktopRouteContext` is
    `{source,returnTo}` only), and **HPQ does not link to `/topic-hub` at all.** Reachable today only
    by hand-typed URL. `[FU-TOPICHUB-CONCEPT-PRODUCER]` ⇒ **MOUNT ≠ LIVE.**
14. **The owner's "expand and scroll that spine row" rested on a false premise.** Rows have no expand
    state **because they are never collapsed and have no hidden content** — every `BoardConcept` field
    always renders. An "expand" could only be a fake affordance or a regression hiding content from
    students arriving with no param. **The lane built marking + scrolling instead.** Correct call.
15. **A defensive guard the lane wrote (M0) was proven DEAD by its own mutation and REMOVED** rather
    than shipped decorative. ⭐ This is §5's SILENT NO-OPS rule being obeyed unprompted.
16. **Stale counts again:** the catalogue header says 54 rows; the file holds **74 rows / 73 labels**.
    `[FU-CONCEPT-CATALOGUE-COVERAGE]`

### From RETRY-1 (PASS, 2 files)
17. ⭐⭐ **SPEC PREMISE DISPROVED — HPQ DOES NOT RESOLVE.** *"Quick Practice and HPQ: re-serve the exact
    question"* is **WRONG for HPQ**. Evidence: **0 of 140 HPQ ids appear among the 8543 bank ids**;
    `conceptForQuestionId("rn-hpq-2")` = null while the **CONTROL** `conceptForQuestionId(
    "2026-TRI-P1-A-001")` returned a full row **in the same run**. ⇒ **HPQ gets "Try one like it".**
    ⚠ **The case is LIVE, not moot** — `HighlyProbableQuestions.tsx` passes `questionId={q.id}` to
    `SolutionChecker`, so HPQ ids really do reach the log. `[FU-RETRY-HPQ-NOT-BANK-BACKED]`
18. ⭐⭐ **THE OBVIOUS RESOLVER WAS AGAIN THE WRONG ONE — third in this wave.**
    `conceptForBankQuestionId` **suppresses chapter-echo subtopics**, so it is **NOT an existence
    test**: **773 of 8543 rows (~9%) would have been wrongly demoted to "similar"**.
    ⇒ **existence = `conceptForQuestionId`; concept = `conceptForBankQuestionId`.** Mutation M3 proves
    the distinction load-bearing. `[FU-RETRY-CHAPTER-ECHO-CONCEPT-NULL]`
19. ⭐ **A FIFTH candidate prefix `qp:` was found and CORRECTLY EXCLUDED** — it is a `SessionRecord`
    id, **never a mistake-log `questionId`**. Listing it would have **demoted every Quick Practice
    entry** to "similar" — i.e. the one class that genuinely can re-serve exactly. **A near-miss that
    only enumeration caught.**
20. **HPQ ids have NO common prefix** (`rn-hpq-2`, `ple-hpq-1`, `math-real-hpq-3`, `rn-comp-01`) ⇒
    **prefix-based detection is impossible**; the classifier must **ask the bank**.
21. Scout confirmed, brief refuted: **four** synthetic prefixes, and **C&I is two paths** — multi
    writes `ci:`, only single omits `questionId`. `[FU-RETRY-CI-SINGLE-PATH-NO-ID]`
22. ⭐ **`typecheck:test` earned its keep:** it went **RED with five `TS2339`** while
    `tsconfig.app.json` was **simultaneously GREEN**. The separate-gate rule is not theoretical.
23. **Honest evidence ceiling stated unprompted:** pure logic, no consumer yet ⇒ **no build chunk to
    cite and no live-verify claimed.** `[FU-RETRY-NO-BUILD-CHUNK-YET]`

### ⛔⛔ BLOCKING — DOCTRINE CONFLICT ON THE OWNER-RULED BADGE COPY (`#647` cannot leave draft)
24. **`R4`'s copy `"This is the one costing you marks."` is a PERFORMANCE CLAIM ASSERTED FROM A URL
    PARAM**, on a page that holds **no graded or mistake data**. ⇒ A hand-typed, shared or stale URL
    can tell a student a concept is costing them marks **for a concept they never attempted.**
    - Contradicts the lane's own brief §2: *"⛔ Do not add a marks-lost figure, a mistake count, or any
      performance claim to this page."*
    - Contradicts `CLAUDE.md` §5: *"no fake data — no invented … MI insights, weak areas"*.
    - ⭐ **The owner's stated reason for the change was VOICE, not a doctrine waiver** — the conflict
      appears not to have been in view when the ruling was made.
    - **IMPLEMENTED AS RULED** and flagged in-code, in the prop doc, and as FLAG 2 in the PR body.
      `[FU-ARRIVAL-COPY-ASSERTS-UNBACKED-MARKS-CLAIM]`
    ⇒ **OWNER MUST RULE BEFORE `#647` LEAVES DRAFT.** Options: keep as ruled · revert to a
    non-asserting marker · **gate the badge on real MI data being present for that concept.**
25. ⭐ **The old guard would have PASSED VACUOUSLY under the new copy** — its regex (*"the marker
    carries NO performance claim"*) does not match *"costing you marks"*. **It was REPLACED, not
    deleted:** it now pins the exact copy string **and forbids any numeric figure.**
    ⇒ Textbook *"replace a guard, never delete it — pin what it PROTECTED."*
26. Badge string is **pure 7-bit ASCII with no apostrophe at all** (verified `LC_ALL=C sed -l`, no
    octal escapes). The old copy's typographic apostrophe was an `&rsquo;` entity and left with it.
    **No occurrence of the old copy survives in `lazytopper/src`; all 4 asserting tests updated.**
27. ⚠ **ME-2 MUST EMIT EXACTLY:**
    `/topic-hub/<grade>/<subject>/<topicSlug>?concept=<EXACT boardEssentials name, URI-encoded>`
    — **verbatim label. NOT a slug, NOT a conceptKey, NOT lower-cased.**
28. **CI counts grew again** — the full vitest suite is now **135 files / 1662 tests** (older notes say
    112 / 1387). **Read it from the run; never carry it.**

## ⚠ TRUNK MOVED TWICE DURING THE WAVE — re-derive before EVERY dispatch
`baf9b67a` → `3cf01287` (#644 TSX-1) → **`3d6dce0c`** (#645 EXPORT-1). Both DPDP-B, both merged
mid-wave. RETRY-1 caught this itself and cut from `3cf01287` rather than the SHA its brief pinned.
**OPEN PRs at last check: #646 `SETTINGS-1` (DPDP-B, draft). NO handoff PR open.**

## ⭐ DECISION — ME-2 IS THE PRODUCER, and `navigation.ts` joins its allowlist
Finding 13 leaves a reader nothing calls. **ME-2 owns `MeProgressPage.tsx` and must emit the CTAs
anyway**, so it is the natural producer; `buildDesktopTopicHubPath` must learn `concept`, so
`lazytopper/src/lib/desktop/navigation.ts` moves into **ME-2's** allowlist (it was in ARRIVAL-1's
original allowlist and was never touched — no conflict). ⇒ **If ME-2 does not ship, TOPICHUB-1 is dead
code.** That dependency is now the wave's single biggest risk and must be stated in the handoff.

## ⭐ DECISION — `arrival` is CUT from Wave ME-B (controller's call, disjointness grounds)
**Reason, and it holds whether or not finding 10 is true:** `TutorBrief`'s only consumer is
`briefBlock()` in `lazytopper/server/prompts/tutorSystemPrompt.cjs`. **Path CONFIRMED by me** — it is
under `lazytopper/server/**`, which is **DPDP-B's exact-path territory**. ME-B cannot touch it.
Shipping `arrival` without its consumer is a **silent no-op**, which the standing rules forbid outright.
⇒ Finding 10 (redundancy) would make the work unnecessary; finding 4 (disjointness) makes it
**impossible in this wave**. The second is sufficient on its own, and it is the one I verified.
⇒ **For ME-C / the owner:** live-verify finding 10 BEFORE anyone re-opens this. Recipe from the
subagent: open a Topic Hub (e.g. Carbon and its Compounds), click "Stuck? Ask" on a specific concept
row, confirm the tutor's first worked example is on THAT concept **and** that its opening words carry
no marks-lost figure.

---

## ⭐ ME-2 INPUTS — from SCOUT-PROTO (51 screenshots, `…\scratchpad\proto\`; report `…\diff\report-scout-prototype-2026-08-09.md`)

**Every structural check PASSED** — and these are the ones ME-2 must reproduce, so they are load-bearing:
subject purity (both directions × 3 tabs × collapsed+expanded × 3 widths, **zero violations**) ·
Show more/less both ways (Science 5 → "Show 2 more", Maths 2 → no button) · accordion **single-open**
(`[true,f,f,f]`→`[f,true,f,f]`), Learn-button count 0 when all closed · **rail ≤1023 / grid ≥1024 —
desktop does NOT inherit a rail** · no horizontal overflow at 360 (legend 4→2→1 col) ·
**ZERO `%` in rendered text** across 3 states × 4 widths × 2 subjects × 3 tabs.
⇒ The v6 rail bug and the percentage rule are both genuinely clean in v7. Pin them with tests.

### ⛔ THE PROTOTYPE IS LOCKED BUT NOT DEFECT-FREE — 11 found. ME-2 must NOT reproduce these.
**Reported by one scout with measurements and controls; not independently re-verified by me.**

| id | defect | who rules |
|---|---|---|
| **F1** | **The file is mojibake-corrupted** — 151×`â`, 16×`Â`, **zero em-dashes survive**. Copying strings literally ships mojibake **and trips `check:mojibake`, which is ENFORCED outside `handoff/`.** The scout supplied the *intended* strings — use those. | ME-2, mechanical |
| **F2** | **The thin state contradicts itself** — the paper switch still reads *"34 marks on the table"* directly above *"Two checked answers isn't enough to name anything yet."* (the switch is built before the thin branch). **This is an honesty-doctrine violation on the page whose whole point is honesty.** | ME-2, must fix |
| **F3** | **The three views don't reconcile** — Science hero **34** vs by-concept **28** vs by-section **22** (Maths 18/16/16). Demo data in the prototype, **but ME-2 renders real data and a student will add these up.** Needs a stated reconciliation rule. | ⚠ **OWNER** |
| **F4/F5** | **`Presentation` and `Calculation` have NO bar segment and NO legend entry.** The bar is secured·careless·conceptual·unclassified, but product vocabulary is Conceptual/Calculation/**Silly**/**Presentation**. Science claims *"18 easy marks"* while only 8 are itemisable. ⇒ **Where do Calculation marks go?** Risk: they silently become the dumping ground the owner forbade. | ⚠ **OWNER** |
| **F7** | ⚠⚠ **The prototype's own AA claim is FALSE.** It asserts navy numerals measure **5.7–6.7:1**; the scout measured **4.67 / 3.51 / 3.73**, and at 11.52px (360 width) the careless + conceptual numerals **FAIL AA**. **White on the red segment (3.59) actually BEATS navy (3.51).** Control offered: plain `.go` measures 10.41:1 with the same probe, so the probe discriminates. ⇒ **Both the arc doc and the wave brief instruct "navy, NOT white" citing 5.7–6.7:1. That justification does not survive measurement.** | ⚠⚠ **OWNER** |
| **F8** | **Tag/subtext disagreement is only PARTLY fixed.** The named sign-slip regression is gone, but Science card #1 is tagged `Conceptual gap` while its subtext describes stopping after part (i) (exam technique), and **the first-run example is tagged `Conceptual gap` while describing dropped state symbols** — a 0.5mk *presentation* step per `CLAUDE.md` §13. **That is the first thing a new student ever reads.** | ME-2, must fix |
| **F6** | `.go--soft` has no `:hover`, so `.go:hover` (0,2,0) beats `.go--soft` (0,1,0) → navy-on-navy at **1.21:1**. Hits "Learn {chapter}", "Re-do that one", "Try a quick practice set". | ME-2, must fix |
| **F9** | the `Presentation` chip reuses the Silly-slip **red** pill (byte-identical bg) while its own card rail is purple | ME-2 |
| **F10** | at ≤1023 the journey card splits into "+7" then a lowercase orphan line | ME-2 |
| **F11** | 4th bar segment renders blank (<7% suppression) · rank badge drifts off title at 360 · *"Section A — 1 markers"* ungrammatical · **picker options + first-run CTAs are INERT** (`wire()` skipped in first run) ⇒ those flows were never clickable and ME-2 must define them | ME-2 |

**Chrome artifact, NOT a defect:** `.mask` is `position:fixed` and escapes the simulated frame, so the
sheet appears clipped at the review chrome's "390"/"360" buttons. Re-run at true 390×900/360×900 device
viewports it is 354/324px and fits. ⭐ The scout distinguished a harness artifact from a product bug
instead of reporting a false red.

---

## ⭐⭐ OWNER RULINGS — 2026-08-09. BINDING ON ME-2. Supersede the prototype and both controller docs.
⚠ The owner cited line numbers below. **They are derived values — ME-2 must re-locate each by symbol
or quoted string and report if any has moved.** They are recorded here as the owner gave them.

### R1 · BAR BUCKETS — ⛔ NONE of the three options offered. Mirror the scorecard's own grouping.
`ResultsScorecard.tsx:308` and `:319` **already group the four MI types into two headings:**
```
Knowledge gaps — worth practising     →  Conceptual + Calculation
Careless mark-loss — not a weakness   →  Silly + Presentation
```
⇒ **KEEP FOUR SEGMENTS; fix the NAMING, not the count:**
**`secured` · `careless slips` (Silly+Presentation) · `knowledge gaps` (Conceptual+Calculation) · `unclassified`**
- **The legend names all four MI types under their two headings** ⇒ nothing invisible, nothing dumped
  into `unclassified`, and the hero speaks the grouping the student **already met on their graded sheet.**
- `MeProgressPage.tsx:739` already uses *"Careless mark-loss"* — consistent with the page as shipped.
- ⭐ Owner's reason: **it is the product's EXISTING model rather than a new one**, and it dodges the
  six-segment option's 360px blank-segment problem entirely.

### R2 · BAR NUMERALS — the owner RETRACTED his own figures; the scout was right.
**The 5.7–6.7:1 claim was computed against the LOGIN page's `#071a3d`.** MeProgress uses
**`--me-navy: hsl(222,47%,24%)`** (`MeProgressPage.tsx:1001`) — a different, lighter navy. Recomputed:

| segment | navy on it | white on it |
|---|---|---|
| `--accent hsl(152,55%,45%)` | **4.68** | 2.70 |
| `--silly hsl(0,70%,62%)` | **3.53** | 3.59 |
| `--conceptual hsl(215,75%,60%)` | **3.74** | 4.03 |

**The scout's 4.67 / 3.51 / 3.73 match to two decimals. Its probe is SOUND. Option (d) re-measure is
OFF THE TABLE.**
⇒ ⛔ **The fix is NEITHER (a) darken-tones NOR (b) as I framed them. It is the LARGE-TEXT THRESHOLD,
which these numerals already qualify for.** WCAG AA large text = **3:1**, and large = **14pt bold =
18.66px**. The numerals are **already `font-weight:700`**, so at **≥18.66px bold navy PASSES all three**
(worst case 3.53 vs a 3:1 bar). **NO token change, NO global colour shift.**
- ⭐ Why not darken tones: **`MISTAKE_TONE` is used VERBATIM across the scorecard, the MI card and
  history** — (a) would repaint the product's entire mistake vocabulary to fix one bar.
- ⚠ **CONSTRAINT — the 360px collision is real:** at 360px a 7%-wide segment is **~23px**, and an
  18.66px bold two-digit numeral will not fit. ⇒ **RAISE THE RENDER THRESHOLD FROM 7% TO ~12%** and
  **let the legend carry the rest.** The legend already prints every number, **so nothing is lost** —
  the bar keeps the glanceable figures where they fit and **stops pretending to where they don't.**

### R3 · RECONCILIATION — option (a).
**Hero is truth; each deeper view carries an explicit remainder row so all three SUM to the hero.**
*"6 marks not yet traced to a concept"* is a sentence a student can accept; three unexplained totals is
not. ⇒ **It is the same honesty device as `unclassified`, one level down.**
- (b) rejected: leaves three numbers on screen and **makes the student do the reconciling.**
- (c) rejected outright: **the hero under-reporting real lost marks is the one thing the page cannot do.**

### R4 · TOPICHUB-1 — APPROVED to commit + push as DRAFT. **Badge copy CHANGED.**
⛔ *"Why you're here"* is **the page talking about itself.**
✅ **Use: `This is the one costing you marks.`** — it names the reason instead of gesturing at it, and
it is the same voice as the rest of the page.

### R5 · Both controller self-fixes APPROVED
the thin-state self-contradiction, and the first-run tag reading `Conceptual gap` over a
dropped-state-symbols subtext (**§13 makes that PRESENTATION**). Owner: *"a page whose diagnosis
contradicts its own label at the top has no claim on the rest."*

### R6 · The producer finding OUTRANKS all four questions — owner confirmed
*"MOUNT ≠ LIVE caught before merge rather than six documents later."* The `navigation.ts`-into-ME-2
call is **ratified**, and the consequence goes in the handoff **verbatim**:
**⇒ IF ME-2 DOES NOT SHIP, TOPICHUB-1 IS DEAD CODE.**

## BLOCKED / OWNER DECISIONS OWED
- none blocking. The HPQ classification is delegated to RETRY-1 as its first acceptance item rather
  than being escalated — it is a verifiable code question, not a product judgement.

---

## HANDOFF DRAFT — prose, ready to paste

### FINAL OWNER RULINGS (2026-08-09, after the lanes returned)
- **R7 · BADGE COPY — the owner WITHDREW `R4` on the lane's doctrine finding.** Final string:
  **`You came here for this.`** Owner: *"you were right and my ruling was wrong. I ruled on voice; you
  found a doctrine conflict I hadn't considered."* ⇒ It is **true regardless of how the student
  arrived, asserts nothing about performance, and keeps the voice.**
  ⛔ **The gate-on-MI-data option was REJECTED** — it would require TopicHub to read Mistake
  Intelligence, **which the brief forbids for good reason.** The guard pins the new exact string and
  **keeps** the no-numeric-figure assertion.
- **R8 · RETRY-1 — commit + push APPROVED, draft only.**
- **R9 · HPQ into the canonical bank — NOT NOW, NOT A LANE.** An **owner content decision with
  syllabus implications.** Stays *"Try one like it"*. `[FU-RETRY-HPQ-NOT-BANK-BACKED]` kept open.
- **R10 · A no-`questionId` entry OFFERS NOTHING** — not a topic-scoped *"Try one like it"*. Owner:
  *"a retry affordance on an entry that can't identify its question is decoration, and the student can
  already reach that topic from every other row. Silence is the honest option."* ⇒ **RETRY-1's build
  already matches this** — `kind:"none"` returns null. No code change; confirmed, not altered.

### [CURRENT] Wave ME-B closed — the student's *why* now survives the click, and three resolvers were wrong
Two lanes landed. **TopicHub can be opened on a named concept** (`#647`), and **the product can now
tell whether a mistake can be re-served as the same question or only a similar one** (RETRY-1). The
third lane, **ME-2 — the v7 `/me` page — was NOT started**: its brief is written and verified, and it
passes to **Wave ME-C** with full context, per addendum §1.
⭐ **The wave's real output was disproof.** Eight spec premises fell — the owner's, the controller's,
and **three consecutive wrong concept resolvers**. One lane returned **BLOCKED with zero files**, and
that was the correct outcome.

### Lanes
| lane | PR | what it changed | what it disproved |
|---|---|---|---|
| ARRIVAL-1 | — (0 files) | nothing — **BLOCKED by design** | `TutorBrief` lives outside its allowlist; its only consumer is under `server/**`; *"TopicHub reads no query params at all"* was FALSE; the owner's product rule may already be live |
| TOPICHUB-1 | **#647** | TopicHub reads `?concept=`, marks + scrolls the row, honest fallback | `resolveCanonicalSlug` AND `conceptKeyForLabel` both wrong; `BoardConcept` has **no key field**; spine rows were never collapsed, so "expand" was a false premise |
| RETRY-1 | pushing | `mistakeRetry.ts` — exact vs similar vs nothing | **HPQ does NOT resolve** (0 of 140 ids in the bank); `conceptForBankQuestionId` is **not an existence test** (~9% wrongly demoted); a fifth prefix `qp:` would have demoted every Quick Practice entry |
| ME-2 | — | **NOT STARTED** — handed to ME-C | — |

### ⇒ CARRY FORWARD VERBATIM — ⚠ RE-DERIVED 2026-08-09, NOT COPIED
**ONE dormant capability, not five.** `WIRE-2` (#621) ended `#578`, `#611` and `#617` —
`gradeQuickPracticeBatch` is invoked at `PracticePage.tsx:2223`. **`expectedMarks` is the only
remaining dormant item, with zero consumers outside `src/prediction/`, and ME-2 ends it.**
⚠ **ME-2 DID NOT RUN, SO `expectedMarks` IS STILL DORMANT AT THE CLOSE OF THIS WAVE.** Anyone
restating this block must **re-derive it against trunk**, not paste it.
`[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` stays OPEN.

### ⚠⚠ THE RISK THAT MUST TRAVEL — `#647` IS A CONSUMER WITH NO PRODUCER
Nothing emits `?concept=` into `/topic-hub`. **If ME-2 does not ship, `#647` is dead code on trunk.**
ME-C must treat the producer as ME-2's first obligation, not a trailing detail.

### ⚠ NEW SINCE THE LANES WERE BRIEFED — ME-C MUST ABSORB
**`#646` (SETTINGS-1) TOUCHED `lazytopper/src/pages/MeProgressPage.tsx`** — adding an import and
`<AccountDataControls />` as the **last section**. ⇒ **ME-2 rebuilds that file and MUST PRESERVE that
section.** Deleting it would silently remove a student's DPDP data-download and account-delete
controls. **Verify against trunk `376e30b0` or later, not against any brief written before it.**

### FU ids — new / kept open
NEW: `[FU-ARRIVAL-COPY-ASSERTS-UNBACKED-MARKS-CLAIM]` (**RESOLVED by R7**) ·
`[FU-CONCEPT-RESOLVER-SILENT-NULL]` · `[FU-TOPICHUB-CONCEPT-PRODUCER]` ·
`[FU-CONCEPT-LABEL-IS-THE-ONLY-CONCEPT-ID]` · `[FU-CONCEPT-CATALOGUE-COVERAGE]` ·
`[FU-RETRY-HPQ-NOT-BANK-BACKED]` · `[FU-RETRY-CI-SINGLE-PATH-NO-ID]` ·
`[FU-RETRY-CHAPTER-ECHO-CONCEPT-NULL]` · `[FU-RETRY-NO-BUILD-CHUNK-YET]` ·
`[FU-MISTAKE-INSIGHTS-PANEL-DEAD]` · **`[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]`**
KEPT OPEN: `[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` · `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` ·
`[FU-ME-VERIFIED-CELL-PREDATES-631-REBUILD]` (owner's live-verify — **do not flip the tracker cell**)

### ⭐ `[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]` — owner finding from the deploy logs, NOT a lane
**The gateway now boots** — `TSX-1` worked, and `ERASE-1`, `EXPORT-1` and `SETTINGS-1` are **running
code**, not merely merged. **But the same log shows `relation "step_solutions" does not exist`, and
nothing in the repo ever creates that table** — every reference reads or writes it; **there is no
`CREATE TABLE`.** The cache **fails soft**, so functionality is unaffected — **but every step solution
has always been regenerated from Gemini.** ⇒ **Likely a real cost line.** Owner-supplied; not
independently verified by this controller.

### Decisions made, with the reason
1. **Trunk re-derived at every step, never carried** — it moved **four times** mid-wave
   (`baf9b67a`→`3cf01287`→`3d6dce0c`→`3d3a32a9`→`376e30b0`). RETRY-1 caught one itself.
2. **RETRY-1 split into logic (own lane) + UI (folded into ME-2)** — there was no per-entry mistake-log
   UI to add a button to; the original scope would have built a list into the one file ME-2 rebuilds.
3. **`arrival` cut from the wave** — its only consumer is under `server/**` (DPDP-B's territory);
   shipping the field alone would be a **silent no-op**.
4. **`navigation.ts` moved into ME-2's allowlist** — ME-2 must be the producer or `#647` is dead code.
5. **ME-2 not started** — below the 35% floor with two merges still owner-gated. Addendum §1: a fresh
   controller with full context beats half a lane and an unwritten handoff.
6. **Every unverified claim passed on flagged UNVERIFIED with an instruction to verify** — ⭐ **this is
   the single practice that caught all three wrong resolvers.** Owner: keep it in every brief.

### ⇒ CARRY FORWARD VERBATIM — ⚠ RE-DERIVE BEFORE WRITING, DO NOT COPY
- The dormancy block. **Owner's re-verification, 2026-08-09: ONE dormant capability, not five.**
  `WIRE-2` (#621) ended `#578`, `#611`, `#617` — `gradeQuickPracticeBatch` is invoked at
  `PracticePage.tsx:2223`. **`expectedMarks` is the only remaining dormant item, and ME-2 ends it.**
  ⇒ This must be RE-DERIVED against trunk at handoff time, not pasted from here.
- The `check:mojibake` correction (below), which supersedes the model's §5 text.

### Standing-rule corrections earned/confirmed this wave
- ⚠ **The model's §5 claim that `check:mojibake` is "structurally blind to `handoff/`" is STALE.**
  `#571` moved `repoRoot` to `git rev-parse --show-toplevel`; `check-mojibake.cjs:60` sets
  `REPORT_ONLY_PREFIXES = ['handoff/']` and nothing else, so everything outside `handoff/` is
  ENFORCED and `handoff/` is REPORT-ONLY. **What remains true:** `:63` uses `git ls-files`, so it is
  TRACKED-ONLY — "mojibake clean" before `git add` is vacuous. Stage before claiming clean.
  (Owner-supplied, 2026-08-09. Conclusion unchanged; mechanism corrected.)
