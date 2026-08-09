# STANDING RULES FOR THIS BOARD
*(Permanent. Above the dated sections deliberately, so they do not scroll away. Added 2026-07-27.)*

**★ 1 · Every FU ID must have its own heading and body. Never only a mention.**
**An ID that appears only as a cross-reference inside another FU reads as recorded on the board and is effectively unrecorded.** A reader sees the name, assumes it is written up somewhere, and moves on — and the finding behind it is gone. This is not hypothetical: `[FU-SIGNUP-NO-PHONE-OPTION]` sat on this board for a full handoff cycle with no entry of its own, mentioned only inside `[FU-AUTH-CLUSTER-SEQUENCING]`, and two different and incompatible readings of the bug were in circulation the whole time because there was no body to pin the correct one.

The check is cheap and should be standing: for every `[FU-...]` referenced anywhere in this file, confirm a matching definition exists at the head of an entry. A reference without a definition is a silent loss, and silent losses are the failure mode this board exists to prevent.

**2 · When an FU is assigned to two lanes, the lane that writes FIRST records it**, with an explicit "do not duplicate" line naming the other lane. A visible duplicate is recoverable by anyone reading; a silent loss is recoverable by nobody. Prefer the recoverable failure. *(Owner-confirmed as the default rule for FU placement, 2026-07-27.)*

**3 · Do not rewrite a dated entry to match today's facts.** Record the correction in the current section and leave the old entry as written — it was true on its date, and a log that is silently updated stops being evidence of what was known when. See `[FU-COMMIT-SUBJECT-AT]`, corrected from three instances to four in the 2026-07-26 section rather than edited in place.

---
## 2026-08-09 — WAVE ME-A (#634 · #641 · #637 · #636, four lanes + two scouts). Trunk `e8f89863`.

**`2026-08-08T23:31:55Z UTC / 2026-08-09 05:01 IST`**

> ★★ **Four lanes, four disproved spec premises — one of them the controller's own.**

**27 FU ids are carried below across 25 entries, each id named in its own heading with a body, per
Standing Rule 1.** *(25 entries, not 27, because two of them each carry a PAIR of ids naming ONE
finding — `[FU-MI-CALLER-COUNT-STALE]` / `[FU-MI-STALE-FIVE-CALLERS-COMMENT]`, and
`[FU-MI-ISSAFEENTRY-PERMISSIVE]` / `[FU-MI-ISSAFEENTRY-UNVALIDATED-FIELDS]`. **Both ids appear in
their heading, so neither is a reference-without-a-definition.** They are kept as visible duplicates
rather than silently merged, per Standing Rule 2: a visible duplicate is recoverable by anyone
reading, a silent loss by nobody.)* Bodies are
taken from `handoff/WAVE_STATE_ME_A_ARCHIVE.md` (committed in this same PR) or from the lane report
on disk — **none is reconstructed from an id.** ⚠ **Standing rule: NEVER reconstruct an FU body from
its id.** A plausible-but-wrong FU is harder to detect than a missing one.
⚠ **Where the controller did not verify a lane's or scout's claim, the entry says so.** A controller
cannot verify a code claim; it can only decide how much weight to put on an unverified one.

---

### 🛑 `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` — a student is told "you lost 2 marks" beside "no mistakes of this type"

**FOUND BY THE OWNER'S LIVE-VERIFY of `#637`. PRE-EXISTING, SERVER-SIDE, AND UNRELATED TO `#637`.**
The Check & Improve grader returned an annotated step carrying a **−2 deduction with NO
`mistakeType`**, so `reconcileCounts` produced **all-zero counts against `marksLost: 2`**.
➜ **A student sees *"you lost 2 marks"* next to *"no mistakes of this type"* — four times over in
the observed session.**

⭐⭐ **CONSEQUENCE FOR `ME-2`, AND IT CHANGES THE DESIGN.** The v7 **unclassified marks bucket has
TWO sources**: (a) legitimate binary 1-markers, which carry no type by CBSE ruling and are the
honest case the segment was invented for; and (b) **this defect** — untyped marks that *should* have
had a type.
➜ ⛔ **THE BUCKET MUST NOT BE DESIGNED AS A DUMPING GROUND.** Folding (b) in silently would make **a
grader bug indistinguishable from correct behaviour**, and would let it hide behind the very honesty
device built to prevent that. **OPEN. Server-side fix; owner-facing.**

### 🛑 `[FU-TRENDS-FUZZY-CHAPTER-CONFLATION]` — two distinct CBSE chapters conflated in production today

`legacyFuzzyMatch("Circles", "Areas Related to Circles")` returns **`true`**. These are **two
distinct CBSE chapters**, and **each chapter's predictions are contaminated by the other's
evidence — live, right now.**
**Not fixed in `#636` because any fix moves the HPQ pin** (`resolveCanonicalSlug` moves **52 of 140**
live HPQ questions), and the brief ruled the pin outranks the feature.
⭐ **CONNECT IT:** `fuzzyMatch` was **already** flagged in the trends audit as a **silent-MISS** risk
when labels drift across ten years. **This wave proved it also produces silent HITS. Same root
cause** — and it is exactly why `#636`'s shared primitive routes everything through
`resolveCanonicalSlug`.
➜ ⭐ **THE OWNER IS THE CBSE AUTHORITY on whether conflating those two chapters materially misleads
a student. That ruling is his, not a lane's.** **OPEN — reported by the lane, UNVERIFIED by the
controller.**

### ⚠ `[FU-RETRY-SYNTHETIC-QUESTION-ID]` — this one CHANGES A LATER LANE'S SCOPE

Worksheet, full-mock and chapter-test paths pass **synthetic attempt ids** (`ws:` / `fm:` / `ct:`)
as `ctx.questionId`. **`RETRY-1`'s premise is *"re-serve the exact question by `questionId`"* — and
for those three paths the stored id DOES NOT IDENTIFY A BANK QUESTION.**
The arc already rules the fallback: if the exact question cannot be re-served, **the copy must not
say *"Re-do that one"*** — rename to *"Try one like it"* and report.
➜ ⭐ **ME-B MUST SCOPE `RETRY-1` AGAINST THIS, NOT AGAINST THE ARC'S ASSUMPTION.** **OPEN.**

### ⭐ `[FU-BANK-13-SCIENCE-CHAPTERS-NO-SUBTOPICS]` — 9.05% of the bank can never yield a concept

**A CONTENT gap, not a code gap.** **13 chapterwise Science files carry a single chapter-echo
subtopic on EVERY row** (549 questions), and `"General"` covers **224 more across 25 topicKeys** ⇒
**773 / 8,543 = 9.05% of the bank cannot yield a concept.** ★ **The predicate is not destroying
detail — the detail was never authored.**
➜ **ME-2's *"By concept"* slicer and *"Start here"* ranking will legitimately have NOTHING to show
for those chapters. That is an HONEST EMPTY STATE, not a bug to paper over, and it must NOT be
filled with a topic-level fallback** — the same dishonesty the arrival rule forbids. **The *"By
chapter"* slicer still works for them**; only the concept drill inside them is empty.
➜ Also feeds the **bank-completion track**. **OPEN.**

### `[FU-MI-PERSISTED-SHAPE-DROPS-SUBTOPIC]` — why concept could not reach four of six write paths

`PersistedWorksheetQuestion` and `QuickPracticeSavedAnswer` **drop `subtopic` at persist time.**
`CanonicalQuestion.subtopic` *is* required (in `data/predictionTypes.ts`, a **globally forbidden**
file), but that is true of the **bank** question, not of **what is persisted and replayed at grade
time**. This is the mechanism behind the wave's first disproved premise.
**Carrying subtopic on the persisted shapes would be a persisted-shape MIGRATION, not
field-plumbing** — and it would inherit the standing rule *test the migration FROM THE OLD SHAPE,
not from clean*. **Option 4 avoided it entirely.** **OPEN (recorded; deliberately not acted on).**
*(Reported by a scout; UNVERIFIED by the controller.)*

### `[FU-MI-CONCEPT-CHAPTER-ECHO-POLICY]` — ✅ **RATIFIED by owner D2(a)**

The lane suppresses `"General"` and `"Chapter Practice — …"` as concepts via the existing
`isChapterEchoSubtopic`, matching the `/me` rung. **RATIFIED on the enumeration evidence the owner
required: 14 matches across 1,914 distinct subtopics, ALL echo, ZERO real.** **CLOSED.**

### ⚠ `[FU-MI-CONCEPT-REVERSIBILITY-UNCONFIRMED]` — an unresolved contradiction, recorded not smoothed over

The owner corrected the controller that echo suppression is **irreversible** on the
worksheet/full-mock/chapter-test paths because they store synthetic ids. **A scout reports that may
not hold:** the worksheet/CT/FM path in `progressStore.ts` deliberately reads **real bank ids out of
`record.questionIds[]`** (paper order), not the synthetic attempt id.
⚠ **The scout verified the PREDICATE, not `#637`'s wiring**, and says so itself.
➜ **Confirm against `#637`'s actual diff before anyone records "irreversible" as fact.**
➜ **The ratification is unaffected either way — reversibility only makes it safer — but the REASON
must be corrected, because the reason is what the next lane inherits.** **OPEN.**

### ⚠ `[FU-CHAPTER-ECHO-PREDICATE-BRITTLE]` — correct today, one bank edit from wrong

`isChapterEchoSubtopic` is case-insensitive, outer-whitespace-insensitive and dash-insensitive, but
**misses `"Chapter-Practice"`, British `"Chapter Practise"`, inner-double-space and NBSP variants.**
**The bank contains ZERO such values today**, so the predicate is correct now — and **one bank edit
from silently admitting an echo as a concept.** **OPEN — a content-lane tripwire, not a code bug.**

### `[FU-MARKS-RUNGTREND-OPTIONALITY]` — the new marks fields are OPTIONAL by NECESSITY

`RungTrend.marksScored` / `marksAvailable` are optional **not by preference**: `buildMistakeTypeRung`
is a composition *share* with **no marks denominator**, so a required field would force a fabricated
*"0 of 0 marks"*; and **two files outside MARKS-1's allowlist build full `RungTrend` literals**,
which a required field would have broken — **green locally and RED in CI.** Recorded so a later lane
does not "tidy" the optionality away. **OPEN (informational).**

### `[FU-MARKS-NO-CONSUMER-YET]` — MARKS-1's live-verify debt transfers to ME-2

Nothing reads `marksScored` / `marksAvailable` yet; **ME-2 is the first consumer.** `#634` therefore
carries **no live-verify of its own** — nothing a student can see changed.
➜ ⭐ **When ME-2 lands it must be verified on BOTH surfaces AND in a session carrying state from
BEFORE `#634`** — the read path reconstructs marks from records written by older code, and **an
incognito session never exercises that.** ★ **This is the precise blind spot that shipped a live
break past 1,082 green tests in Wave 4.** **OPEN.**

### ⚠ `[FU-ME-MOBILESELFCHROME-NESTING]` — folded into ME-2 by owner instruction

`#631` nests `<MobileSelfChrome>` **INSIDE** `<RequireAuth>` for `/me`, while **eight other usages
wrap the gate**, and it carries a fresh comment that the nesting contradicts.
➜ **Fix the nesting or fix the comment — one of the two is wrong.** **OPEN, assigned to ME-2 (Wave
ME-C).**

### `[FU-TRENDS-EXPECTEDMARKS-DORMANT]` — merged, and called by nothing

`expectedMarks` is **tree-shaken out of the bundle.** `#636` proved it by **build output, not
argument**: `"legacy-fuzzy"` **is** present in `assets/predictionCore-*.js` (the shared primitive is
on the live path) while **`expectedMarks`, `marksBasis`, `canonical-topic` and `canonical-strict`
are ABSENT from every `assets/*.js`.** Re-checked against trunk source in this docs lane:
`expectedMarks` / `MarksBasis` are exported from `prediction/historicalAppearanceIndex.ts` and
appear in `cbse5SignalScoring.ts` **only inside a comment** — **no production consumer.**
➜ ⭐ **ME-2's brief MUST name it as a capability to WIRE, not merely to consume if convenient.**
**A capability that merges and is called by nothing is invisible to every gate.** **OPEN.**

### `[FU-TRENDS-CANONICAL-SUBTOPIC-AUTHORITY]` — a chapter authority used below chapter level

`resolveCanonicalSlug` is a **chapter** authority that **degrades to a plain slugifier below chapter
level.** That is why canonicalising the exam-signal match moves **52 of 140** live HPQ questions.
Canonical strategies are **built, wired and tested in `#636` but NOT default** — so flipping later is
**a config change, not a rebuild.** **OPEN.** *(Reported by the lane; UNVERIFIED by the controller.)*

### `[FU-TRENDS-DEAD-APPEARANCE-HELPERS]` — two helpers with zero callers and DIFFERENT semantics

`getTopicAppearanceByYear` / `getSubtopicAppearanceByYear` in `historicalDataset.ts` have **zero
callers** and **different semantics from the new primitive** — no `official_board` filter.
⭐ **Deliberately NOT reused by `#636`: reuse would have moved HPQ.** Recorded so the next lane does
not "de-duplicate" them into the live path. **OPEN.**

### `[FU-TRENDS-HPQCONFIDENCE-DEAD]` — dead product code

`hpqConfidence.ts` / `deriveHPQConfidence` has **zero callers.** The live HPQ path is
`predictionCore` → `predictionScoring` → `compute5SignalScore`. **OPEN — a deletion candidate, not a
defect.**

### `[FU-MI-CALLER-COUNT-STALE]` / `[FU-MI-STALE-FIVE-CALLERS-COMMENT]` — the same finding, twice

⚠ **These two ids name ONE finding and are recorded as a pair deliberately rather than silently
merged** (Standing Rule 2 prefers the recoverable failure). **Five in-repo comments assert
`recordMistake` has five callers. The actual count is SIX FILES / EIGHT OCCURRENCES**, counted by a
scout at `6c94d8f0` and **re-derived and confirmed independently by the lane.**
➜ **A later lane that trusts the comments will enumerate the wrong set.** **OPEN — correct the
comments.**

### `[FU-MI-ISSAFEENTRY-PERMISSIVE]` / `[FU-MI-ISSAFEENTRY-UNVALIDATED-FIELDS]` — also one finding under two ids

⚠ **Same treatment as above.** `isSafeEntry` in `mistakeInsightsService.ts` validates **only
`timestamp` and `mistakeCounts`.** The new optional fields (`concept`, `questionId`) **pass
unvalidated.** Not a live defect today — nothing untrusted writes them — but the validator's name
promises more than it checks. **OPEN.** *(Reported; UNVERIFIED by the controller.)*

### `[FU-MI-CONCEPT-GRADEPATH-TEST-COVERAGE]` — see the `#637` lane report §14

Recorded here as an id with a body per Standing Rule 1: the lane flagged residual gaps in grade-path
test coverage for the concept write-through and documented them in **§14 of its own report on disk**.
⚠ **The detail is NOT reproduced here because reproducing it from the id would be reconstruction.**
➜ **Read the `#637` lane report before scoping any follow-on.** **OPEN.**

### ✅ `[FU-WINDOWS-BUILD-RUNS-WITH-ROLLUP-BINARY]` — **CLOSED by this PR (owner ruling D4)**

`CLAUDE.md` §6 stated the Vite production build **cannot** run on a Windows dev box. **It is wrong —
three lanes ran it locally during this wave** after dropping
**`@rollup/rollup-win32-x64-msvc@4.59.0`** into
`node_modules/.pnpm/rollup@4.59.0/node_modules/@rollup/`. That is what made the **build-chunk
evidence** in those lanes possible.
➜ ⭐ **Why it mattered: as written, §6 discouraged the strongest available `MOUNT != LIVE` proof — a
test proves the code works; a CHUNK proves it ships.** **§6 corrected in this PR, with the method
recorded so the next lane reproduces rather than rediscovers. CLOSED.**

### ⭐ `[FU-SCOPEGUARD-VACUOUS-ON-UPDATE-ONLY-LANE]` — a NEW silent-no-op class, earned this wave

**`scope:guard` reads only staged / unstaged / untracked files and has NO base-ref mode.** A lane
that merely merges trunk into an existing branch — a refresh, merge-only or rebase-only lane —
**authors no working-tree change**, so the guard reports `inspected=0` and **exits green.**
⚠ **That green is INDISTINGUISHABLE from a real pass**, and reporting it as one is a silent no-op:
a gate that runs, reports, and inspects nothing.
➜ **REMEDY, proven in this wave:** reproduce the authoring condition in a **throwaway worktree at
trunk** and re-run the guard there. The `#636` refresh lane got **`inspected=5 untracked=4`, exactly
the original lane's figures.**
➜ **Every refresh / merge-only / rebase-only lane must state WHICH invocation it ran.** **An
unqualified `scope:guard ✓` from such a lane is not evidence.** **OPEN as standing doctrine — also
written into `cofounder-skill/SKILL.md` by this PR.**

### ⭐ `[FU-EVIDENCE-HASH-WITHOUT-RECIPE]` — a hash quoted as proof, with no way to re-check it

**A hash cited as evidence without the serialization recipe that produced it is a DERIVED VALUE no
later lane can re-check — the same class of defect as a bare line number.**
**Instance:** `#636`'s HPQ pin was reported as proven by `md5 aa58d9fd6583a827066ff51d004c3683`; the
recipe was never recorded and **five reconstruction attempts all produced different hashes.**
⭐ **The conclusion was still TRUE** — identity was re-proven against the frozen 140-row on-disk
literal in `cbse5SignalScoring.hpqPin.test.ts`, which is the artefact that actually gates — **but
the evidence given for it could not be checked by anyone else.**
➜ **Cite the artefact that gates, or record the exact recipe beside the hash.**
➜ ⭐ **And when this happens: KEEP THE CONCLUSION AND WITHDRAW THE EVIDENCE, EXPLICITLY.** A correct
outcome resting on a false premise still poisons the record, because **the premise is what the next
lane inherits.** **OPEN as standing doctrine — also written into `cofounder-skill/SKILL.md`.**

### ⚠ `[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` — NEW, found by this docs lane

**The brief commissioning this handoff instructed that `expectedMarks` be recorded as *"a FOURTH
dormant capability beside `#578`, `#611`, `#617`."*** ⭐ **Verified against trunk: it is wrong.
`WIRE-2` shipped as `#621` in Wave 5F and ENDED all three dormancies** —
`gradeQuickPracticeBatch` has a real production caller in `lazytopper/src/pages/PracticePage.tsx`,
and the Wave 5F `[CURRENT]` says so in its own words.
➜ **Handled: the historical block is preserved unchanged in the demoted sections, and RESTATED AS
CORRECTED in the new `[CURRENT]` — `expectedMarks` is the ONLY dormant capability, not the fourth.**
➜ ⭐⭐ **THE DURABLE LESSON: a CARRY-FORWARD INSTRUCTION IS ITSELF A CLAIM ABOUT THE REPO, AND IT
GOES STALE EXACTLY LIKE ANY OTHER.** Copying it through unexamined would have published three false
*"dormant"* entries **under the authority of a rule about not losing them.** **Re-verify the block
you are told to preserve, before you preserve it.** **CLOSED by this PR (handled); the lesson stays
standing.**

### ⚠ `[FU-MOJIBAKE-HANDOFF-DESCRIPTION-STALE]` — NEW. The gate is REPORT-ONLY, not "structurally blind"

**The widely-repeated wording — *"`check:mojibake` sets `repoRoot` to `lazytopper/` and is
structurally blind to `handoff/`"* — is STALE.** Read from `lazytopper/scripts/check-mojibake.cjs`
on trunk: **GUARD-3 (`#571`) moved `repoRoot` to `git rev-parse --show-toplevel`**, so `handoff/`
**IS scanned**. It is now **REPORT-ONLY** via an explicit `REPORT_ONLY_PREFIXES = ['handoff/']`
denylist — hits are **counted and printed on every run, green or red**, but never fail the build.
**That is deliberate:** 8 lines in `handoff/` are **mojibake specimens quoted inside lessons about
mojibake**, and the owner rejected both proposed "fixes" as destroying the lesson.
➜ ⭐ **THE PRACTICAL CONCLUSION IS UNCHANGED — a green `check:mojibake` is still NO evidence a
handoff file is clean, so scan your own added lines with the scanner's own regex and prove the
matcher can fire.** ➜ **But a lane repeating the old "structurally blind" wording is asserting
something FALSE about the gate, and the correct instruction now is *"read the REPORT count"*.**
**OPEN — a wording correction owed wherever the old phrasing is repeated.**

### ⚠ `[FU-ME-VERIFIED-CELL-PREDATES-631-REBUILD]` — NEW, found by this docs lane. Owner decision.

`SURFACE_TRACKER.md`'s **Me / Progress** row shows **Verified ✅**, earned by `#408` / `#412` and
attributed to *"owner LIVE-VERIFIED on the stable link"*. ⚠ **`#631` then DELETED both pages that
verification was performed against** (`DesktopMePage.tsx`, `MobileMePage.tsx`) and replaced them with
`MeProgressPage.tsx`.
➜ **The cell's evidence describes a page that no longer exists.** **No cell was flipped by this docs
lane** — flipping a Verified cell is a claim about the product, and this lane has no live access.
➜ ⭐ **OWNER DECISION: does `/me` need a fresh live-verify against `MeProgressPage.tsx`?** Note this
compounds with `[FU-ME-MOBILESELFCHROME-NESTING]` on the same page. **OPEN.**

### ⚠ `[FU-WAVESTATE-LIVE-FILES-UNTRACKED-NOT-IGNORED]` — NEW. Nothing keeps them out of a diff.

`#633` added `body.json` and `/*.request.json` to `.gitignore`. **It did NOT add
`handoff/WAVE_STATE_*_LIVE.md` or `handoff/BRIEF_*.md`** — `git check-ignore` returns nothing for
them. They are **untracked but NOT ignored**, so they are invisible to lanes working in their own
worktrees but **will be swept into any `git add -A` from the shared checkout.**
➜ **Whoever opens a handoff PR must keep them out of the diff deliberately; nothing does it for
them.** **OPEN.**

---



## 2026-08-07 — WAVE 5F (#619 · #620 · #625 · #621 · #626 · #627, four lanes + a scout + a CI-diagnosis lane). Trunk `fbfb57fa`.

> ★★ **Six PRs, four lanes, 1,400+ tests, six green CI runs — AND TYPED GRADING HAD NEVER ONCE
> WORKED IN PRODUCTION until the owner tried it on his phone. No gate found it.**

**43 FU ids are carried below. Every body is taken from the wave archive or from the lane report on
disk — none is reconstructed from an id.** (Standing rule: **NEVER reconstruct an FU body from its
id.** A plausible-but-wrong FU is harder to detect than a missing one.)

---

### 🛑 PRE-LAUNCH BLOCKING — from the owner's live-verify

- **`[FU-UPLOAD-LIMIT-BLOCKS-PHONE-PHOTOS]`** — ★ **PRE-LAUNCH BLOCKING.** A normal phone photo
  (3 MB+) **EXCEEDS the upload limit**; the owner had to photograph, convert to PDF, then upload.
  **A photo-grading product that rejects phone photos is broken for its primary use case — and this
  is the FREE-TIER path.** Fix: raise images to **~10 MB** **AND** add **client-side downscale**
  (~2000 px long edge, ~85% quality — a 4 MB photo becomes ~600 KB with no loss of legibility, and it
  cuts input tokens too).
  ⚠ **CHECK THE SERVER CAP TOO, or raising the client yields a 413 instead of a friendly refusal —
  the same shape as the `MAX_BATCH_UPLOADS` 400 this wave already paid for.**

### OTHER NEW FUs FROM THE LIVE-VERIFY

- **`[FU-QP-GRADED-SHEET-NO-STEPWISE-MARKING]`** — the graded sheet shows annotated working but only
  **two lines** naming where marks were lost. **A TEACHER MARKS STEP BY STEP.** Without that, the
  tutor receives a score and a mistake type, **not a diagnosis it can teach from** — and `RESULTS-1`
  §1b promised *"the same board-style depth Check & Improve gives today"*. Owner-observed. **Its own
  lane** (candidate to fold into the graded-sheet route lane, or to be explicitly declined by it).

- **`[FU-GRADING-CONSISTENCY-UNMEASURED]`** — temperature is **already 0.05** on grading and
  `responseSchema` shipped in `#559`, so **the easy determinism levers are spent.** The remaining
  variance is judgement on ambiguous inputs, and **nobody has MEASURED it**: grade the same answer
  ten times and compare. **A HARNESS, not a fix.** ⚠ **It GATES any rubric or thinking-budget work,
  including `SERVER-2`** — otherwise a tuning change cannot be told apart from noise.

---

### 🛑 THE SERIOUS ONE — READ BEFORE ANY DATABASE WORK

- **`[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]`** — ★★ **NO `drizzle-kit push` UNTIL THIS IS RESOLVED.**
  A **SECOND** migration mechanism exists (Drizzle, `lib/db/src/schema/generatedQuestions.ts`) whose
  `generated_questions` **OMITS `answer` / `solution_steps` / `final_answer`** **AND** the unique
  index that `saveToPool`'s `ON CONFLICT` requires. `drizzle-kit push` alone would create a table the
  live server **CANNOT WRITE TO — and IT WOULD LOOK LIKE SUCCESS.** Outside every allowlist this
  wave; **not fixed.**

### THE FENCE CLUSTER — carried UNRULED into Wave 5G, and it is PRODUCT-WIDE

- **`[FU-TYPED1-FENCE-IS-NOT-ESCAPING]`** — ★ **the owner's eye, and it is CORRECT.** A student who
  types the fence delimiter closes it early: **a fence is a delimiter, not escaping.** ⚠ **But the
  brief's premise around it was FALSE** — student-typed text **already reaches the grading prompt
  LIVE**, from `SolutionChecker.tsx` and `DesktopCheckImprovePage.tsx`, through the **identical**
  fence, and identically on the single-question path since `57224f49`. **This arc EXTENDS an existing
  injection surface; it does not create one.** Settled from source: **forgeable YES** — any line whose
  content is the fence token; the chain is client `String(textAnswer).trim()` -> `JSON.stringify` ->
  server `String(q.textAnswer || '').trim()` -> **RAW CONCATENATION**, with **no escape, no filter,
  no truncation**, and the only bound an ~8 MB body cap. Only the student's FIRST line inherits the
  5-space indent, so a forged fence lands at column 0. **Fix = 2 sites in 1 server file
  (`handleCheckSolution` and `blockFor`, both in `checkSolution.cjs`), NO CLIENT CHANGE.**
  ⚠ **The WIDER free-text surface is 19 sites across 6 server files, of which `/api/tutor` is 9** — a
  larger, older surface — plus `/api/check-solution` ×3, `/api/grade-worksheet` ×2, and one each for
  detect-question, step-solution, generate-diagram, generate-visual, more-like-this.
  **`figures[].label` and `brief.*` reach the SYSTEM prompt, uncapped and unvalidated.**
  ⚠ **NOT ESTABLISHED: whether a real Gemini model actually OBEYS a forged fence. Nobody has run it.**

- **`[FU-AMEND621-FENCE-ESCAPE-IS-SERVER-SIDE]`** — the fence is a delimiter, not escaping, on
  **BOTH** the single-question and batch paths. **One shared server-side decision**, outside any
  client lane's allowlist. The `#621` lane therefore did **not** write its brief's requested
  assertion — **it would have been FALSE** — and asserted the true property instead: the delimiter is
  carried **VERBATIM** (the client neither mangles nor escapes it).

- **`[FU-AMEND621-BATCH-WIDENS-INJECTION-BLAST-RADIUS]`** — in a batch prompt one question's typed
  text **shares a prompt with up to 11 others**, so an injection can reach the student's **other
  grades in that session**. Same student, **wider than the single-question path**. What SURVIVES an
  injection: schema shape, the parse gate + one retry, **qNumber reconciliation** (unknown qNumbers
  dropped; omitted -> `couldNotRead`, never a silent zero), the **per-question mark ceiling**
  (`Math.min(totalAwarded, totalMarks)` with `totalMarks` from the REQUEST), per-step half-mark
  rounding, the **keyed objective 0/full clamp** (which OVERRIDES the model), the `status` /
  `mistakeType` allowlists and the no-working honesty guard. What does **NOT** survive: **the
  SUBJECTIVE MARK ITSELF** — nothing compares it to the work — plus `couldNotRead`, every free-text
  field shown to the student, MI `mistakeSummary` counts, and the **KEYLESS** `flaggedObjective`
  ≤1-mark verdict. ★ **The privilege boundary HOLDS** (entitlement and rate limiting are pre-handler
  and prompt-independent): **the damage is self-inflicted grade inflation and a polluted OWN MI, not
  another student's.**

### `/admin/diagram-*` — a finding is owed before a ruling

- ⚠ **NOT ESTABLISHED, carried into Wave 5G:** the two `/admin/diagram-*` pages are reported as the
  **only `/admin/*` routes NOT wrapped in `<RequireAuth>`**, and they post a free-text textarea to
  `/api/generate-diagram` — **the one plausible UNAUTHENTICATED free-text path to Gemini** in the
  enumeration. **Whether they are blocked SERVER-side is unknown**: `entitlement.cjs` /
  `verifiedCaller.cjs` were never opened for that route. **Cost AND abuse exposure if unauthenticated.
  Needs its own check.** (No id assigned — the owner will not rule from a name, and a finding comes
  first.)

---

### `WARM-GATE-1` (`#619`)

- **`[FU-WARMGATE-ADMIN-ENDPOINT-UNGATED-BY-MASTER]`** — `POST /api/admin/warm-question-pool` still
  bypasses `WARM_POOL_ENABLED` entirely; it is gated only by `WARM_POOL_ADMIN_SECRET`. That is
  deliberate (it is an explicit human request, and the master switch is about *unattended* runs), but
  if the owner wants one switch meaning "no generation runs, full stop", the admin route needs the
  master gate too. **Owner decision.**
- **`[FU-WARMGATE-PACKAGEJSON-SHARED-LOCK]`** — every new `server/**/*.test.cjs` must edit the same
  two lines of `lazytopper/package.json` (docs-lane check `a15` **enumerates from disk**). Concurrent
  lanes adding server tests **will conflict**. ⇒ **Sequence them; do not parallelise.**
- **`[FU-WARMGATE-ENV-EXAMPLE]`** — `lazytopper/server/.env.example` documents **no `WARM_POOL_*`
  variable at all** (not before this PR, not after). `WARM_POOL_ENABLED` should be listed there with
  its default-off semantics. Outside that lane's allowlist.

### `TELEMETRY-1` (`#620`)

- **`[FU-TELEMETRY1-WARM-TRIGGER-UNSPLIT]`** — warm-pool cannot distinguish **startup pre-warm** from
  **recurring top-up** from **admin-triggered**; it needs a tag from `index.cjs` (`#619`'s file).
- **`[FU-TELEMETRY1-OFFLINE-SCRIPTS-UNMEASURED]`** — `eval/graderEval.cjs` and the three
  `server/scripts/*.cjs` build their own clients in their own processes: **real spend, invisible to
  this instrumentation.** (Note: `services/warmQuestionPool.cjs` builds its own client **only** under
  `require.main === module`; in the server it receives the shared wrapper, so live warm-pool calls
  **do** land in the shared counters.)
- **`[FU-TELEMETRY1-MENTOR-BUILDER-DEAD]`** — `routes/mentorResponseBuilder.cjs` is an **ORPHAN**
  holding **10** `callGemini` invocations that never run; candidate for deletion.
- **`[FU-TELEMETRY1-STREAM-UNINSTRUMENTED]`** — `callGeminiStream` records nothing; **harmless while
  it has no consumer, invisible the day it gets one.**
- **`[FU-TELEMETRY1-RATE-FROM-ENV]`** — set `GEMINI_OUTPUT_RATE_USD_PER_MTOK` /
  `GEMINI_INPUT_RATE_USD_PER_MTOK` in Railway to turn `costModel` from an **assumption** into a
  **configured figure**.
- **`[FU-TELEMETRY1-SAMPLES-VOLATILE]`** — samples **die on restart**; a durable distribution needs a
  datastore, i.e. `DATABASE_URL`, i.e. `#619` first.

### `TYPED-1` (`#625`)

- **`[FU-TYPED1-AMEND621-DELETE-HINGE]`** — **CLOSED by `#621`.** It required deleting
  `if (nonEmpty(answer.textAnswer)) return "typed-no-channel";` from
  `classifyQuickPracticeAnswer`. ⚠ **Deleting it ALONE would have been a silent no-op** — see the
  `#621` entries below.
- **`[FU-TYPED1-CAP-HAS-NO-CLIENT-READER]`** — **CLOSED by `#621`.** The exported
  `MAX_BATCH_UPLOADS` had no client reader; the page now reads it and **warns before the call.**
- **`[FU-TYPED1-LIVE-VERIFY-OWED]`** — **DISCHARGED 2026-08-07** by the owner's three-check
  live-verify. ⚠ **One stated limit was never covered and stays true:** every capture was
  **clean-state**, so **a student mid-session across the deploy is untested** (Quick Practice holds
  saved answers in page state, but the seen-set and MI store are persisted).

### `WIRE-2` / `AMEND-621` (`#621`)

- **`[FU-AMEND621-JSX-TEXT-UNICODE-ESCAPE]`** — `PracticePage.tsx` is written with `\uXXXX` escapes
  and **a JSX text node does not decode them.** **Two instances were live**, one of them already
  shipped on the branch. The added rendered-text guard covers **Quick Practice's three screens only**;
  ⚠ **the same trap is open on every other file written this way and nothing scans for it repo-wide.**
- **`[FU-AMEND621-SCORECARDVARIANTS-STALE-COMMENT]`** — `scorecardVariants.ts` still documents
  `typed-no-channel` as *"today's live reason"*. **It no longer exists.**
- **`[FU-QP-GATE3-COLLECT-MODE-PREMIUM-PREVIEW]`** — ⚠ **a declared GATE-3 regression.** In collect
  mode the locked "Check my answer" CTA is **not rendered** — saving is free, and locking it would
  refuse an action that costs nothing — so the surface loses GATE-3's *learn-before-you-tap*
  property; **the boundary is now the 402 at Finish.** Restoring a locked preview needs
  `useSubscription` in `PracticePage`, and **adding a hook to that page has its own history (`#575`).**
- **`[FU-QP-OBJECTIVE-NONBINARY-FROM-SERVER]`** — a fractional objective mark is converted to the
  honest ungraded state **in the page** rather than thrown (a throw in render is an error page for the
  student). The builder's guard is untouched.
- **`[FU-QP-BATCH-FAILURE-NO-RECORD]`** — **a failed batch writes no session record.**
- **`[FU-RESULTS1-SPLIT-HEADING-COMMENT-STALE]`** — `SplitBlock`'s doc comment still says *"the two
  headings are the prototype's, verbatim"*; one is now the corrected post-grade wording. Left alone to
  respect the one-line authorization it was under.
- **`[FU-WIRE2-ALLOWLIST-MISSING-QUESTIONLIST]`** — `PracticeQuestionList.tsx` is **the only edge
  between the page and the card** and was **not on the allowlist**. (Accepted; see `DECISION_LOG`.)
- **`[FU-MUTATION-HARNESS-RACES-COMMIT]`** — ★★ **NEVER COMMIT WHILE A MUTATION HARNESS IS RUNNING.**
  Commit `16dd9506` captured mutation M3 because the commit **raced** a background harness. The
  restore was byte-perfect; **the COMMIT was the bad snapshot**, and the only signal is a "modified"
  file that reads like noise. **Verify the committed BLOBS, not the working tree.** (Fixed forward, no
  force-push; this repo squash-merges so the bad intermediate cannot reach trunk — **on a
  merge-commit repo it would have.**)
- **`[FU-QP-GRADED-SHEET-NOT-A-ROUTE]`** (also recorded as **`[FU-QP-GRADED-SHEET-ROUTE]`** in the
  lane report — **same finding, two ids; do not treat them as separate items**) — ⚠ **LOGGED WITH
  TEETH BY THE OWNER: DEFERRED, NOT RESOLVED.** The graded sheet is **NOT linkable, NOT bookmarkable,
  NOT reachable from history**, so Quick Practice sessions will **not** appear in `SurfaceHistory`
  alongside Chapter Test and Full Mock. It was not built as a route on three grounds, chief among them
  that `quick_practice_overlay_additive_acceptance.mjs` **GUARD 3 pins `<PracticePage />` PROPLESS in
  `App.tsx`**, so a route host would need a second top-level branch in the file with the
  production-break history. **Section 9b's `App.tsx` authorization is UNUSED and STAYS GRANTED for
  that future lane.**
- **`[FU-QP-HISTORY-RAIL]`** — ★ **now CHEAP and still not taken.** `quick-practice` was **already**
  in the `SessionSurface` union and in `SurfaceHistory`'s `SURFACE_COPY`, and **the reason
  `SurfaceHistory`'s own comment gives for not mounting it is REMOVED by `#621`**: it says *"QP's
  scorecard is 'X of N attempted', so a QP row cannot reuse this container's marks-based card."*
  **After `#621` a batched QP session IS marks-based.**

### `TYPED-2` (`#626`)

- **`[FU-TYPED2-SUITE-TITLE-VS-FIXTURE]`** — ★★ **the reason every gate missed the original defect.**
  The existing test `§9.7` — *"a typed answer alone reaches the model — the free-tier path is not a
  400"* — **SENDS `imageBase64: 'PDFB64'`.** It never exercised a zero-upload request at all.
  **A TEST TITLE THAT DESCRIBES AN ASSERTION THE TEST DOES NOT MAKE.** The title reads as exactly the
  coverage that was missing, so **four lanes and the cofounder saw the path as covered.** Sibling of
  *"a test with a data guard passes while asserting nothing"* — here **the FIXTURE, not the guard, is
  what hollowed it out.** ⇒ **Quote every new test's fixture and check it against its title.**
- **`[FU-TYPED2-WORKLOAD-CLASS-TYPED-ONLY]`** — `workloadClass` is `'grade-batch'` when photos exist
  and `'worksheet'` otherwise, so **a typed-only batch is telemetered as `'worksheet'`** although it
  sends zero images and no document. Telemetry-only, outside `contents`. **Decide whether a third
  class (`'grade-typed'`) is worth the split** — ⚠ it matters for `SERVER-2`, which is scoped from
  exactly this data.
- **`[FU-TYPED2-BODY-CAP-COPY]`** — `'Upload too large or invalid. Keep the PDF under 5 MB.'` still
  names a **PDF as the only payload**; a typed-only batch that trips the 8 MB cap gets copy that does
  not describe it. Cosmetic. ⚠ **Related to `[FU-UPLOAD-LIMIT-BLOCKS-PHONE-PHOTOS]` — the upload-limit
  lane should fix both messages at once.**

### `TYPED-3` (`#627`)

- **`[FU-TYPED3-GRADED-DENOMINATOR-PAIRING]`** — `gradedMarksAwarded` / `gradedMarksTotal` are a
  symmetric pair and do **not** share `totalMarks`'s ambiguity — ⚠ **but `worksheetTotalMarks` vs
  `gradedMarksTotal` is a WRONG-DENOMINATOR hazard, the same shape as `#501`** (where "of N" read the
  over-fetched pool rather than the displayed set). **Reported, not widened.**
- **`[FU-TYPED3-AICLIENT-DOC-COMMENT-STALE]`** — `src/ai/aiClient.ts` documents the worksheet result
  as *"Present only when `couldNotRead` is false"* for the graded fields; **`marksAwarded` is now
  always present.** The TYPE is optional so nothing breaks, but **the COMMENT is now a claim that is
  false.** `src/` was outside that lane's allowlist. (See also: *a doc comment is a CLAIM, not a fact.*)
- **`[FU-TYPED3-STUB-COULDNOTREAD-COPY]`** — `buildStructuredStub` hard-codes the **photo** pending
  note for its last question. It is now corrected downstream by `typedNote()` when the question was
  typed, but **the stub's own literal still assumes a photograph.**
- **`[FU-TYPED3-MODEL-BEHAVIOUR-UNMEASURED]`** — every assertion in that lane is over **the prompt
  text** or the server's handling of a **stubbed** reply. Whether Gemini actually grades typed nonsense
  as 0-with-a-reason rather than `couldNotRead` was UNMEASURED pre-merge.
  ★ **The owner's live-verify has since answered it in the affirmative for the three checked cases** —
  but it remains **unmeasured at scale**, which is precisely `[FU-GRADING-CONSISTENCY-UNMEASURED]`.

### CI / INFRASTRUCTURE

- **`[FU-CI-VERIFY-PRODUCTION-BUILD-NOT-WIRED]`** — ★ **`node scripts/verify-production-build.mjs`,
  the post-build bundle verifier REQUIRED BY `CLAUDE.md` §6, is ABSENT FROM CI.** The string
  `verify-production-build` appears **zero times** in the Quality Gate log; the Build step is
  `vite build` alone. **CI HAS NEVER RUN IT.** ⇒ **A gate named in our own standing instructions that
  no run executes is the definition of a silent no-op, one level up from the code.**
- **`[FU-CIFIX621-CANCELLED-IS-NOT-FAILED]`** — a **queue-expired or concurrency-cancelled** job
  renders as `failure` at RUN level. ⚠ **READ THE JOB, NOT THE RUN.** The Quality Gate produced **no
  conclusion anywhere in this repo for nearly three and a half hours**, returning red ticks that
  contained **no information**.
- **`[FU-CIFIX621-JOB-RED-WITH-ALL-STEPS-GREEN]`** — run `31121805441` is the reference case: **every
  step `success`, job `failure`, 45 minutes** between the last log line and `completed_at`.
- **`[FU-CIFIX621-TRUNK-QG-NEVER-COMPLETED]`** — trunk `b48d6e38` carried a **red, never-re-run
  Quality Gate**, and every PR branched from it **inherits that unverified base.** ⇒ **Re-run trunk's
  own bar so it is known before the next lane branches from it.**

### CLOSED BY THIS WAVE

- **`[FU-BATCH-TYPED-ANSWER-NO-CHANNEL]`** — **CLOSED**, by `#625` + `#621` + `#626` + `#627`
  **together**, and confirmed by live-verify. ⚠ **`#625` alone did NOT close it** — it merged as a
  capability with no caller, and even with a caller the request was refused at the endpoint's front
  door and then handed a photograph-framed prompt. **Recorded because "the field exists" was mistaken
  for "the path works" twice.**
- **`[FU-QP-BATCH-CAP-13-UPLOADS-400]`** — **CLOSED.** A 14-photo session now sends **exactly 12** with
  Q13/Q14 **named** and **no 400**, proven by a real intercepted request body.
- **`[FU-TYPED1-AMEND621-DELETE-HINGE]`**, **`[FU-TYPED1-CAP-HAS-NO-CLIENT-READER]`** — **CLOSED.**
- **`[FU-TYPED1-LIVE-VERIFY-OWED]`** and **`[FU-578-LIVE-VERIFY-STILL-OWED]`** — **DISCHARGED.**
  `#578`'s seam has executed against real Gemini, nine days after it merged.
- **The mobile "full marks" report** — **NOT A DEFECT, CLOSED.** The owner's first mobile test ran
  **before `#626` reached Railway**; the same session now grades correctly on both surfaces.
  **Not device-specific, not non-deterministic — a pre-`#626` failed-request path.** Recorded so
  nobody re-opens it as a device bug.

### ⚠ STILL OPEN AND SHARPENED BY THIS WAVE

- **`[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]`** — `#611`'s unconditional catch turns
  `PremiumRequiredError` into `skipped-error`. **It was LATENT while nothing called it. `#621`
  shipped the caller — IT IS LIVE NOW.**
- **`[FU-ASYNC-GRADING]`** — Full Mock's real risk on the grading surface is **truncation at
  `maxOutputTokens: 32000` -> one retry -> `{ok:false}`**, already flagged in-code. ⚠ **It is NOT the
  upload cap** — see the refuted claim in `DECISION_LOG`.
- **`[FU-SCORECARD-DESKTOP-SCROLL-CEILING]`** — **live on trunk today.**
- **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`** — unchanged by this wave, and still **a sequencing
  constraint on the ~50-student QA pass.**

---

## 2026-08-06 — #623 `NAME-2` (one standalone lane, owner live-verified on a real handset). Trunk `2ca9a3d0`.

**CLOSED — resolved and shipped**

- **`[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]`** — ★ **CLOSED FOR NEW ACCOUNTS.** The phone number step
  now captures a name on its create branch and passes it as `verifyPhoneOtp`'s **second argument**;
  `AuthContext` calls `updateProfile` with it **only when the authenticated user has no
  `displayName`**, then re-syncs the context so the name is visible without a reload.
  ★★ **Verified LIVE on a real handset, not only by test**: a real phone account created with a real
  name, **confirmed in Firebase Console → Authentication → Display Name.**
  ⚠ **THIS CLOSURE IS FORWARD-ONLY AND MUST NOT BE READ AS COVERING EXISTING ACCOUNTS.** See
  `[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`, still open below.

**MUST STAY OPEN — do not close**

- **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`** — ★★ **STILL OPEN, AND `#623` DID NOT RELIEVE IT — IT
  SHARPENED IT.** With `#616` and `#623` both merged, *every* method now names a new account, which
  makes the un-named population **fixed, finite and permanent**: everyone created before those two
  lanes. There is still **no second `updateProfile` writer and no admin path** that sets a name, so
  nothing in the product repairs them.
  ⚠ **IT REMAINS A SEQUENCING CONSTRAINT ON THE ~50-STUDENT QA PASS, NOT A NICE-TO-HAVE.** Run that
  pass on accounts created before `#623` and **fifty students start permanently nameless**, and the
  first thing they see is their own phone number or email where their name belongs.
  ⇒ **Either recruit the QA cohort fresh AFTER `#623`, or land a backfill lane before the pass.**
  This is a decision, not a task, and it is the owner's.

- **`[FU-AUTH-EMAIL-LINK-DIRECTION]`** — **`AUTH-1`'s, and it still runs alone.** `#623` deliberately
  did **not** touch it. Only `linkWithPhoneNumber` exists: an email or Google account can **absorb** a
  phone; **a phone-first account can never absorb an email.** A phone-first student who later signs
  in with Google gets a **SECOND** account with different progress, different Mistake Intelligence
  and a different subscription.
  ⚠ **SPLIT ACCOUNTS ARE UNRECOVERABLE BY DESIGN — prevention is the only tool we have.**
  ★ **Why it cannot ride along with a small lane:** it needs **new `AuthContext` KEYS**, which is
  precisely what `#623` avoided by using a parameter. A key fails
  `AuthContext.passwordReset.test.tsx`'s exact-equality pin **and** every one of the ~25 full
  `vi.mock` replacements. **That is the size difference between the two lanes, stated concretely.**

**RENAMED — the id was actively misleading**

- **`[FU-DOOR-TEST-SURFACE-SIXTEEN-FILES]`** *(was `[FU-DOOR-TEST-SURFACE-EIGHT-FILES]`; the old id
  is retained here as a search term and must not be used going forward)* —
  ★★ **THREE ENUMERATIONS OF THE SAME SET GAVE FIVE, NINE AND SIXTEEN.** An import-pattern grep found
  five; CI found eight; a cofounder re-run found nine; **`#623` running the union found SIXTEEN.**
  **The old id asserted a number that was wrong by half, and an id that carries a false count is
  worse than one that carries none** — it invites the next lane to stop at eight.
  ★★ **NEITHER STATIC METHOD IS THE SET, AND THEY FAIL IN OPPOSITE DIRECTIONS.** A dynamic
  `await import("./Login")` is invisible to path globs and to import greps — but a *string* grep for
  `Login` catches it, and then **misses `SignUpPage.redirect.test.tsx`, which contains no literal
  `Login` at all** and reaches the door transitively through `SignUpPage`. Four more
  (`LinkSignInMethodModal`, `AuthContext.signupIdentity`, `homeDestinations`, `PricingPage.backnav`)
  are invisible to a path glob but not to a string grep.
  ⇒ **ONLY RUNNING IT IS THE SET.** Any future door lane must run the suite and read the result, not
  trust an enumeration — and must re-derive the number rather than carrying sixteen forward.
  **The sixteen, each run in isolation and green at `2ca9a3d0`:** `Login.forgotPassword`,
  `Login.legalLinks`, `Login.nameCapture`, `Login.oneDoor`, `SignUpPage.name`, `SignUpPage.phone`,
  `SignUpPage.redirect`, `OfferStrip`, `PublicLegalFooter.reach`, `LinkSignInMethodModal`,
  `AuthContext.passwordReset`, `AuthContext.linkPhone`, `AuthContext.autotrial`,
  `AuthContext.signupIdentity`, `homeDestinations`, `PricingPage.backnav` — **plus the two `#623`
  added**, `Login.phoneNameCapture` and `AuthContext.phoneName`.

**NEW — OPEN**

- **`[FU-DOOR-TAB-GUARD-MISSED-PHONE-STEP]`** — ★★ **A VACUOUS GUARD READS EXACTLY LIKE A REAL ONE,
  AND THIS ONE HAD BEEN GREEN SINCE AUTH-3.** `Login.oneDoor.test.tsx` asserts
  `expect(screen.queryAllByRole("tab")).toHaveLength(0)` — the pin that protects AUTH-3's ruling that
  the door has no new-vs-returning tabs. **It never opens the phone step**, so it could never have
  caught a `role="tab"` regression there, and its green said nothing about the surface a reader would
  assume it covered.
  ★★ **THE INSTRUMENT IS THE FINDING: DIFFERENTIAL MUTATION.** `#623` changed `role="group"` to
  `role="tab"` on the phone control; the new suite went **RED** and `Login.oneDoor.test.tsx` stayed
  **GREEN** on the same mutated tree. **A single-suite mutation run would have reported a red and
  concluded the guard worked.** ⇒ **When two suites claim the same invariant, mutate once and check
  BOTH — a guard that stays green under a mutation it should catch is absent, whatever its name
  says.**
  ⚠ **NOT FIXED BY `#623`.** The new suite covers the phone control; `Login.oneDoor.test.tsx`'s own
  assertion is still scoped to the step it happens to have open. **Widening it is a small, separate
  edit and it is not this lane's** — logged so it is not lost.

- **`[FU-PS-MEASURE-OBJECT-SKIPS-BLANKS]`** — ⚠ **A MEASUREMENT TOOL THAT SILENTLY ANSWERS A
  DIFFERENT QUESTION.** PowerShell `(Get-Content $f | Measure-Object -Line).Lines` **excludes blank
  lines**, so it is **not** `wc -l`. Proven both directions at `ecacdfed`: `Login.tsx` is **2457**
  lines by `wc -l` and **2230** by non-blank count — and `Measure-Object -Line` returns **2230**.
  ★ **This produced a wrong finding in `#623`'s own report**, which recorded `Login.tsx:2318` as a
  stale cite on the reasoning that *"the file is 2230 lines"*. **The cite was correct**; the copy sits
  at exactly `:2318`. **A correct measurement of the wrong quantity, reported as a fact about the
  spec.**
  ⇒ **Use `wc -l` (or `(Get-Content).Count`) whenever the number will be compared against a line
  number.** And ⇒ **the lane's own recommendation still stands but for the opposite reason: cite by
  quote or symbol, because verifying a line cite is itself easy to get wrong.**
  ★★ **Logged rather than left in a report** — an unexplained number is exactly the kind that travels
  three documents later unchallenged.

---

## 2026-08-06 — #615-#616 (two standalone owner-run lanes, merged after Wave 5E closed). Trunk `1b477e5f`.

**CLOSED — resolved and shipped**

- **The nameless-account defect — ★ ON THE EMAIL PATH ONLY.** `#616` closes it for email/password:
  the name is captured on the create branch, required not optional, and passed as the **third
  argument** to `signUpWithEmailPassword` — the only `updateProfile` call in product code. Verified
  on the wire (the `accounts:update` request body) and live-verified by the owner on production.
  ⚠ **THIS CLOSURE IS EMAIL-ONLY AND MUST NOT BE READ AS COVERING PHONE.** Google supplies a
  `displayName` of its own; **phone supplies nothing and `#616` did not touch it.** See
  `[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]`, immediately below and still open.

**MUST STAY OPEN — do not close**

- **`[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]`** — ★ **ACTIVELY RE-CONFIRMED BY THIS LANE, NOT MERELY
  CARRIED.** `mapFirebaseUser` only ever *reads* `displayName`. Google supplies one; **phone does
  not**, and nothing in the product sets one for a phone account. `#616`'s `§9` — the phone
  segmented control — **was not started**, so phone-first students still land nameless and the shell
  falls back to rendering whatever it has. Phone is one of three equal methods on the door and is
  made prominent, so this is not a corner case. **Closed by `NAME-2`, not by `#616`.**

- **`[FU-AUTH-EMAIL-LINK-DIRECTION]`** — `AUTH-1`'s, and it runs alone. Only `linkWithPhoneNumber`
  exists: an email or Google account can **absorb** a phone; **a phone-first account can never absorb
  an email.** A phone-first student who later signs in with Google gets a **SECOND** account with
  different progress, different Mistake Intelligence and a different subscription.
  ⚠ **SPLIT ACCOUNTS ARE UNRECOVERABLE BY DESIGN — prevention is the only tool we have.** That is
  why `#616`'s merged guidance block advises *starting* with email or Google, and why that copy must
  not be trimmed for length until this ships.

**NEW — OPEN**

- **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`** — ★★ **nothing repairs accounts already created without a
  name.** Neither `#616` nor the queued `NAME-2` backfills; both only affect accounts created after
  they ship. Every account made before `#616` — and every phone account until `NAME-2` — carries a
  null `displayName` permanently, because there is no second `updateProfile` writer and no admin
  path that sets one.
  ⚠ **THIS IS A SEQUENCING CONSTRAINT, NOT A NICE-TO-HAVE: it must land BEFORE the ~50-student QA
  pass**, or that entire cohort starts permanently nameless and the first thing fifty students see
  is their own email address where their name belongs.

- **`[FU-DOOR-TEST-SURFACE-EIGHT-FILES]`** — the auth door is mounted by **EIGHT** test files, not
  the four an allowlist named. The eighth, `SignUpPage.phone.test.tsx` (8 tests), was found **by CI**
  — after the lane had already been surprised once by `SignUpPage.name.test.tsx`.
  ★★ **A dynamic `await import("./Login")` is invisible to path globs AND to import greps**, which
  defeats every static method this project uses to answer "what are all the tests for X?".
  **The enumerated eight:** `Login.oneDoor`, `Login.nameCapture`, `Login.legalLinks`,
  `Login.forgotPassword`, `SignUpPage.name`, `SignUpPage.phone`, `SignUpPage.redirect`,
  `PublicLegalFooter.reach` (+ `OfferStrip.test.tsx` mounts it too, via the same dynamic form).
  ⇒ **`NAME-2`'s allowlist must be all eight**, and any future door lane should run the whole suite
  rather than trusting a glob.

- **`[FU-TEST-SOURCESCAN-FIRST-MATCH-ONLY]`** — `ruleBody()` in `Login.oneDoor.test.tsx` resolves a
  selector with `src.indexOf(...)` and reads only the **FIRST** match. So a **duplicate CSS selector
  is a correctness bug**, and worse, **the suite fails naming the wrong cause**: `#616` added a
  second dark `.lt-google` rule for a green lift, the pinned `color: #071a3d` was still present but
  no longer first, and the test reported a missing colour that was there. Fixed by merging both
  concerns into one rule. ⇒ **`ruleBody()` should assert its selector appears exactly once** rather
  than silently taking the first.

- **`[FU-A11Y-CONTRAST-PROBE-ALPHA]`** — ★★ **a repo-wide method defect, in two parts.**
  **(a)** A **pre-existing 3.76:1** on the mobile offer strip — a real WCAG-AA failure for normal
  text (0.86rem / 0.8rem, nowhere near the large-text exemption), fixed in `#616`.
  **(b)** The reason nobody had seen it: **a contrast check that does not composite alpha over its
  backdrop returns numbers that are simply wrong.** The lane's own first probe scored
  `rgba(22,185,106,0.1)` — a 10%-alpha wash — as **solid** green, and never saw the brand panel at
  all, because that navy is a `background-image` gradient whose `backgroundColor` is transparent. It
  **reported 1.09:1 for text that reads perfectly.** Rewritten to composite layers and to score
  against every gradient stop worst-case, it immediately found the real 3.76:1.
  ⚠ **A measurement that cries wolf is as dangerous as one that sleeps** — the temptation is to relax
  the threshold, which loses the true signal. **Any contrast assertion added anywhere in this repo
  must composite alpha and handle gradient backdrops.**

- **`[FU-SEO-ROOT-IS-A-REDIRECT]`** — ★ **the domain has no homepage of its own.** Measured on
  production during `#615`:
  ```
  lazytopper.com/          308 -> www.lazytopper.com/
  www.lazytopper.com/      307 -> www.lazytopper.com/app/
  www.lazytopper.com/app/  200   <- the only URL that resolves
  ```
  `/` is a redirect into an app shell, so reaching any content costs **two hops**, and the old
  canonical pointed at the first of them. `#615` fixed the canonical; it did not and could not fix
  the shape. ⇒ **This blocks any public content layer at root paths** (marketing pages, topic
  landing pages, anything a crawler should index without entering the app) and is **the largest open
  SEO decision on the board.**

**NEW LANE — logged, NOT built**

- **`NAME-2`** — the phone segmented control, closing `[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]`.
  **Allowlist: all eight door-mounting test files** (above), `lazytopper/src/pages/Login.tsx`, and
  `lazytopper/src/context/AuthContext.tsx` for **one signature change only**:
  ```ts
  verifyPhoneOtp: (code: string, displayName?: string) => Promise<void>;
  ```
  ★★ **`AuthContext.passwordReset.test.tsx:175` pins `Object.keys(ctx!).sort()` — the KEY SET. A new
  PARAMETER leaves that identical; a new KEY does not.** That distinction is the whole reason this is
  a small lane and not `AUTH-1`, and it is the same seam
  `signUpWithEmailPassword(email, password, displayName?)` already occupies. The 25 `vi.mock`
  complete replacements are unaffected — a `vi.fn()` does not care how many arguments it receives.
  ⚠ **If the lane finds itself adding a KEY, it must stop and report.**
  Also: reuse `.lt-login-seg` so `#616`'s green treatment applies without a second rule; keep
  `role="group"` with `aria-pressed` (**`Login.oneDoor.test.tsx` asserts ZERO elements with
  `role="tab"`**); `updateProfile` only when the authenticated user has **no** existing
  `displayName`, never overwriting one; and the copy at `Login.tsx:2283` — *"New or returning — phone
  works the same either way"* — **stops being true the moment you ask, and must change.**
  ⚠ Its acceptance bar (a real phone account, name in Firebase Console) **costs real SMS** and cannot
  be met from a dev box with no Firebase config — it needs the preview or the owner's device.

## 2026-08-06 - WAVE 5E (#611-#617). Full bodies in `handoff/WAVE_STATE_WAVE5E_ARCHIVE.md` and the four lane reports.

**NEW - OPEN**

- **`[FU-SCORECARD-DESKTOP-SCROLL-CEILING]`** -- **LATENT ON TRUNK TODAY**, not only in the lane that
  found it. `max-height` applied only **below** 1024px against a `position:fixed` dim means a long
  variant's **head AND footer, return ticket included, are unreachable with nothing to scroll.**
  Fixed for the graded sheet in `#617`; **any other long variant on trunk still has it.**
- **`[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]`** -- `gradeQuickPracticeBatch`'s catch is
  **unconditional** and turns `PremiumRequiredError` into `skipped-error`. **LATENT while nothing
  calls it; LIVE the moment `WIRE-2` ships** -- a free-past-trial student would finish with no grades,
  no upgrade sheet, no explanation. **Must be fixed in WIRE-2's own PR.**
- **`[FU-BATCH-QP-MI-FEED-REHOMING]`** -- mistakes reach MI via `handleCheck` -> `recordMistake`, and
  **that path is GONE under exam-shape.** If the batched path does not record mistakes, **Quick
  Practice stops feeding Mistake Intelligence entirely.**
- **`[FU-BATCH-TYPED-ANSWER-NO-CHANNEL]`** *(canonical, SINGULAR -- the lane filed it first and its
  report references it; the plural is an ALIAS, not a second entry)* -- `WorksheetGradeQuestionInput`
  has no `textAnswer` field. **Batching covers PHOTO working only.** A server lane must add the field.
- **`[FU-BATCH-UPLOAD-CAP-12]`** -- `MAX_BATCH_UPLOADS=12`, **CAP not chunk** (chunking reintroduces
  the calls batching exists to remove). No client-side count cap exists; the server hard-400s.
- **`[FU-WINDOWS-VITEST-BRINGUP-COST]`** -- the residual context cost in lanes is **environment**
  (Windows vitest bring-up, mutation-runner entry), **not discipline.**
- **`[FU-FORBIDDEN-BANS-MASK-ABSENT-COVERAGE]`** -- remaining zero-diff entries: **CONV 5, OVL 2,
  QP-overlay 4.** **When the next one lifts, expect to WRITE the coverage, not find it** -- neither
  C&I gate asserted any rendered behaviour at all.
- **`[FU-QP-DOUBLE-BACK-TAG]`** -- the return ticket and "Keep practising this set" were both tagged
  "Back". Fixed in `#617`.
- **`[FU-BATCH-QP-DEFER-IS-A-UX-DECISION]`** `[FU-BATCH-1B-UNCALLED-SEAM]`
  `[FU-578-LIVE-VERIFY-STILL-OWED]` `[FU-WIRE1-ALLOWLIST-ONE-FILE-SHORT]`
  `[FU-FORBID6-MUTATION-RUNNER-SHELL]` `[FU-FORBID6-DIRTY-MODULE-STATE-BASELINE]`
  `[FU-SCORECARD-ONRETURN-RECEIVES-EVENT]` `[FU-CONV-GATE-SECTION-HEADERS-STALE]`

**OPEN - AND THE BIGGEST UNKNOWN ON THE BOARD**

- **AI COST: CAUSE NOT ESTABLISHED.** INR 586.96 for 31 Jul - 5 Aug against ~INR 10 the prior week.
  **98% is ONE SKU: output tokens, and thinking bills at the output rate.** Forecast has returned to
  INR 13.33, so **nothing unattended is running.** **Three conclusions were reached and retracted in
  ninety minutes.** Full account: `LazyTopper_AI_Cost_Investigation_2026-08-06.md`, **held by the
  owner, not in this repo -- do not reconstruct it from memory.**
  **`TELEMETRY-1` is what ends the guessing. Nothing should be capped before it.**

**CLOSED this wave** -- `[FU-LEGAL-WELCOME-LANDING-FOOTER]` (#609, prior wave) - the
`ResultsScorecard` ban (#614) - `og:image` and root-asset 404s (#612/#613).

## 2026-08-05 — WAVE 5D (#606–#609). Full bodies in `handoff/WAVE_STATE_WAVE5D_ARCHIVE.md`.

**Four lanes, one read-only scout, zero lanes that failed.** Every brief was disproved in part —
4 findings against FORBID-5's, 7 against SERVER-1's, 7 against COPY-1's, 4 against the
controller's own. That is the system working.

**NEW — OPEN**

- **`[FU-BATCH2-SCORECARD-BAN-STILL-LIVE]`** — `#606` lifted the Quick Practice service ban ONLY.
  `ResultsScorecard.tsx` is still banned by **BOTH** C&I gates, so **BATCH-2 needs two amendments in
  ONE PR** (amending one leaves the other red) **plus a from-scratch component suite** — it has no
  component test today; `scorecardVariants.test.ts` tests the CONFIG module, not the component.
- **`[FU-IDEMPOTENCE-TESTS-NEED-AN-IDENTITY-ASSERTION]`** — an idempotence test that runs a function
  twice and compares the two ids **passes under clock contamination**, because both calls land in the
  same millisecond and a contaminated id still equals ITSELF. **A self-comparison is not an identity
  check.** Assert against the real generator. Caught by FORBID-5 in its own first draft.
- **`[FU-FORBIDDEN-MAP-SHOULD-BE-MACHINE-READABLE]`** — the forbidden map exists only as three
  hand-maintained `const FORBIDDEN = [` arrays that must be re-derived by reading each gate. A
  cofounder pattern returned empty for two of them and the map could not be published for a wave.
- **`[FU-SERVER1-THINKING-BUDGET-TELEMETRY]`** — SERVER-1 §2 cannot ship without a **distribution**.
  See `[FU-TELEMETRY-NO-CALL-CLASS-NO-PERCENTILES]`, which now supersedes the measurement half.
- **`[FU-APISERVER-TEST-WIRING-NOT-ENUMERATED]`** — the api-server package's test script had to be
  wired for its suite to run; that wiring is not enumerated anywhere as a gate surface.
- **`[FU-LEGAL-FOOTER-REST-CONTRAST]`** — `PublicLegalFooter`'s default measures **4.49:1 rest against
  a 4.5:1 AA threshold**, and **1.42:1 on hover / `:focus-visible`** — the link **vanishes exactly
  when a keyboard user selects it**. Affects `/pricing` and mobile `/welcome`, not only the landing.
  **Fix in the COMPONENT, not per host** — `#969ea9` measured 6.59:1 rest / 17.84:1 hover, which makes
  `#609`'s per-host override redundant. Owner-directed 5E lane.
- **`[FU-EVIDENCE-BASE-INTENT-SURFACE-DEAD]`** — `pages/app/Intent.tsx` is route-registered but
  **unreachable** (`/pricing` 1 inbound nav, `/intent` 0). A dead-surface decision, not a copy fix.
- **`[FU-LEGAL-CONSOLIDATE-UNDER-ONE-ROOF]`** — **owner design call.** He judges the public-landing
  footer harmful to a designed page and prefers legal under one roof, reached from the avatar and the
  door. Merged for now; he verifies live, then relocates. ★ **The compliance point is the COLLECTION
  point — the sign-up door, which already links and is pinned by a test.** The landing and pricing
  footers are belt-and-braces. **Whatever the design becomes, the policy must stay reachable from the
  door before the button is pressed.**
- **`[FU-GRADER-SCHEMA-STRIP-RETRY-SILENT]`** — `geminiClient`'s retry ladder gates `responseSchema`
  and `responseMimeType` **together** on `includeStructuredOutput`, so a backend that rejects the
  schema causes the retry to **silently strip both**, and grading degrades to pre-`#559` unconstrained
  output **with no alarm**. Shipping is proven; whether the strip is FIRING IN PRODUCTION is a
  telemetry question. ★ **A counter or warning on the degraded path would make it observable — the
  same shape as GATE-1's fail-open witness, which exists precisely because a correct fallback that
  cannot be seen firing is indistinguishable from no protection.**
- **`[FU-LANE-OVERLAP-SYMMETRIC-DEADLOCK-ON-STACKED-PRS]`** — `lane_overlap.mjs` compares every open
  PR against every other, so **a stacked PR and its base each see the other** as an open PR sharing
  the same paths. **Both correct individually, neither mergeable.** Resolved without `--admin`: close
  the stacked PR → **re-run the base's Lane Overlap** (closing a PR does NOT re-trigger checks on
  another — same lesson as `#593`) → merge the base → reopen → `gh pr update-branch` → merge.
  ★★ **THE RULE: DO NOT STACK PRs IN THIS REPO.** Either wait for the base to merge, or scope the
  second lane so it does not need the first's files.
- **`[FU-WARM-POOL-STARTUP-PREWARM-NOT-GATED]`** — ★★ **BLOCKS re-provisioning `DATABASE_URL`.**
  `WARM_POOL_TOP_UP_INTERVAL_MS=0` disables the **recurring** top-up only; a separate **one-time
  STARTUP pre-warm is ungated** and began a 312-combination run. What saved it was an unrelated
  failure — `relation "generated_questions" does not exist`, so every combination erred at the count
  step and spend showed no spike. **With a populated schema it would have proceeded.** Gate the
  startup pre-warm AND create the schema before any second attempt. ★ **`DATABASE_URL` is no longer
  an owner task; it is a lane.**
- **`[FU-RAILWAY-TSX-MODULE-NOT-FOUND]`** — `Cannot find package 'tsx' imported from /app/lazytopper/`
  on every boot. A side process dies; the main server is unaffected.
- **`[FU-TELEMETRY-NO-CALL-CLASS-NO-PERCENTILES]`** — ★★ **a small instrumentation lane must PRECEDE
  SERVER-1 §2.** `/api/admin/token-telemetry` answered (`uptimeSeconds: 485`, `calls: 84`) and gave
  **average latency 17.0 s** — so the 17.3 s in the owner HAR was **the norm, not an outlier** — and
  **80.9%** thinking share. But: **(1)** totals, not a distribution, so no p50/p90/p99, and **a mean
  tells you nothing about the tail**; **(2)** ★ **83 of 84 calls are `unclassified`** — only `tutor`
  is tagged — so grading, detect-question and worksheet are indistinguishable, and **most of those 83
  were warm-pool GENERATION. Budgeting the grader off this sample budgets the wrong workload.**

**CLOSED this wave**

- **`[FU-XUSERID-PROXY-STRIP]`** — closed by `#607`. ★ **The defect was not what the brief said.**
  `app.ts:47` is an entry INSIDE `STRIPPED_PROXY_HEADERS` — the opposite of "allows" — and `#546` had
  already fixed the forwarding. **The real defect was the missing PROOF:** the strip had zero coverage
  on either process, its only other references repo-wide are two prose comments, and **deleting it
  turned nothing red.** `#607` is a test-only PR; `checkSolution.cjs` is byte-identical to trunk.
- **`[FU-LEGAL-FOOTER-LINK]` / `[FU-LEGAL-WELCOME-LANDING-FOOTER]`** — closed by `#608` + `#609`.
- **`[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`** — closed by `#608`. ★ **All three sites the brief named
  were wrong**: Welcome's "last 5" was already fixed and pinned, and there is no "3–5" anywhere in
  `src/config/`. The real drifts were HPQ's "4 years" and Intent's "9 years".
- **`[FU-EFF-RESPONSE-SCHEMA]`** — **CLOSED. It shipped in `#559` (PR-C2) and was never needed.**
  See the struck entry below and the correction in `LazyTopper_Cost_Pricing_Analysis_v1_1.md`.

## 2026-08-04 — WAVE 5C (#601–#604). Full bodies in `handoff/WAVE_STATE_WAVE5C_ARCHIVE.md`.

### `[FU-SYLLABUS-TRUTH-IN-TWO-PLACES]` — ★★ SUPERSEDES `[FU-SYLLABUS-GUARD-FORMATIVE-ONLY-BANK-BLINDSPOT]`
**`scripts/src/syllabusGuard.ts`'s `RULES` array is HARDCODED TypeScript. It does NOT read
`lazytopper/src/data/syllabus/cbse10Registry_2026_27.json`.** So 2026-27 syllabus truth lives in
**two hand-maintained places — one executable, one declarative — with NO test that they agree.**
★ **That is the defect.** Not *"the guard forgot Motor/Induction/Generator."* The ~28 board-excluded
but live pack2 questions are a **symptom** of the divergence.
**Evidence:** the guard's own comment says formative-only Motor / EMI / Generator are enforced *"via
the SURFACE scan … NOT at the question-bank level"*, and question banks are not among the 23 files
that scan reads — while the registry's `formative_only_scope_bullets` **does** exclude them.
**FIX:** make the guard **DERIVE from the registry**, so a registry edit cannot silently fail to
reach the bank. ⚠ **Owner-ruled: log, do not fix mid-wave, and do NOT remove the ~28 by hand** — no
executable rule bans them, so removing them would be **guessing in the opposite direction**, the
exact failure the withhold-in-both-directions test exists to prevent.

### `[FU-UPGRADE-SHEET-PRICING-BACKNAV]` — ★ NEW, FROM THE WAVE 5C LIVE-VERIFY. Wave 5D.
**"See plans" navigates to pricing, and pricing's back button goes to HOME** rather than the page the
student came from. It carries **neither** `state:{back,backLabel}` **nor** `?source=&returnTo=`.
**A student two questions into a practice set who declines to buy loses their place.**
★ **The "this stopped working" failure GATE-2 exists to prevent, one screen later.** Belongs with
GATE-3's follow-ups. **Owner-ruled: log, do not fix in 5C.**

### `[FU-GATE3-SIGNED-OUT-GRADING-FAILS-OPEN]` — ⚠ REWORDED. OVERSTATED, INCLUDING BY THE CONTROLLER.
**The SERVER fails open for unauthenticated callers** — anon `POST /api/check-solution` returns
**400 from the handler, not 402**. **BUT NO STUDENT PATH REACHES IT:** the client login gate fires at
every action CTA, owner-verified in a browser. ⇒ **LATENT SERVER-SIDE HOLE, NOT A LIVE PRODUCT
HOLE** — curl-only, bounded **3/day** by the anon cap, Gemini pennies, **no revenue.**
★ **GATE-3's signed-out carve-out is still correct, for a different reason than the original FU
gave:** it prevents showing 🔒 to a signed-out visitor **who could sign in and use the feature.**

### `[FU-TRIAL-GRADING-IS-INTENDED]` — ★ OWNER RULING. RECORD SO NOBODY "FIXES" IT.
**Trial-period grading is INTENDED — a marketing hook — and still requires sign-in.**
`canAccessFeature` treating `trial` as `premium` is deliberate. **Not a defect.**

### `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]`
`FORBID-4` (#601) lifted `App.tsx` from the CI-OVL and QP-OVL forbidden zero-diff arrays, **but
`lane_overlap.mjs` `GATED_FILES` still holds it under OWNER REVIEW.** Intended residual control.
⇒ **ME-PROGRESS must expect an owner review on its `App.tsx` change.** The lift changed the
*protection*, not the *review*.

### `[FU-SCOPEGUARD-NO-CI-SUBJECT]`
**`scope:guard` cannot run in CI and must not be added to a CI fast path.** It reads the **working
tree**; a CI checkout is clean, so it measures `inspected=0 … SCOPE_GUARD_OK` and **exits 0 without
inspecting anything, forever.** Measured, not theorised. It stays a **local pre-commit gate**;
CI-DOCS's acceptance suite is what has a real subject in CI. Fixing `scopeGuard.mjs` was outside the
lane's allowlist and is **not scheduled**.

### `[FU-BANK1-SECTION-A-REAUTHOR]`
**40 Section A 1-mark questions were cut** from `heredity.pack1` and `magneticEffects.pack1` (#603).
**9 of them were individually judged SOUND and went anyway**, because the cut is a **mechanical
`section` filter** — keeping them would reintroduce per-question review and make *"no Section A
survives"* unpinnable. **They are re-authorable from real papers**, under owner review.

### `[FU-BANK1-SOLUTION-POOL-MISALIGNMENT]`
The pack1 defect is **not degraded generation** — it is a **systematic mis-pairing of a solution pool
against a question pool.** `ME-E07` (*"An electric motor converts:"*) carries the **commutator**
solution; `ME-E14` (*"role of the split ring commutator"*) carries the **motor-converts** solution:
**their solution sets are swapped.** That is why 100% of the damage landed in the auto-generated
1-mark tier and none in the hand-written tier. ⇒ **Any future generator run must be checked for this
class, not just for boilerplate.**

### `[FU-BANK-AR-STEPS-CONTRADICT-KEY]`
Several Assertion-Reason items **contradict their own keyed answer** — the steps tell the student the
marked answer is wrong (`HE-E06`, `ME-E06`, `HE-AR05`; plus `ME-AR05`/`ME-M13` evaluating a different
assertion pair to an opposite conclusion). ★ **`HE-AR05` additionally injected natural-selection
reasoning into a heredity question via its SOLUTION STEPS** — **board-excluded Evolution content in a
place no subtopic-based guard can see.** All are among the 40 cut by #603, but **the class can recur
in any pack**: a guard reading `subtopic:` cannot see content smuggled through steps.

### `[FU-BANK1-PACK2-MISSING-EXPLANATIONS]` and `[FU-BANK1-PACK2-DUPLICATE-FARADAY-STEM]`
**28 of 97 live pack2 questions have no `explanation` field**, and `ME2-013`/`ME2-037` are an **exact
duplicate stem** (*"State Faraday's law of electromagnetic induction."*). ⚠ **Owner-ruled: AUTHORING,
covered by the standing Fable-pass ruling. NOT a lane, and must not delay other work.**

### `[FU-SUBAGENT-REPORT-WRITE-IS-ROLE-BLOCKED]` — ★ AFFECTS EVERY FUTURE DISPATCH BRIEF
**Subagents cannot write report files at all.** All four Wave 5C lanes hit the same refusal:
*"Subagents should return findings as text, not write report files."* **The block is on the ROLE, not
the extension and not the tool** — so the standing brief line *"the `Write` tool refuses `.md`; the
shell works"* is **wrong in both directions**, and the controller's replacement *"either tool works"*
was **also wrong** (true only for the controller).
⇒ **Stop instructing lanes to write reports to disk. Lanes return text; the CONTROLLER files it.**
Wave 5C reports: `C:\Users\Chetan\OneDrive\Desktop\diff\wave 5c\report\`.

### `[FU-OPS-VALIDATE-VISUAL-IDS-UNINVOKED]`
`lazytopper/scripts/ops/validate_visual_ids.mjs` **calls itself a CI guard but NOTHING INVOKES IT** —
absent from every `package.json` script, every workflow and both `test:matrix:all` chains; the only
references to its name are in its own header comment. It hardcodes paths to the two pack1 files
without an `existsSync` guard ⇒ **an armed failure for whoever eventually wires it.**
Same class: `lazytopper/scripts/addDiagramLinks.cjs` also references those paths, but **is**
`existsSync`-guarded and equally uninvoked.

## 2026-08-04 — WAVE 5B (#595–#598). Full bodies in `handoff/WAVE_STATE_WAVE5B_ARCHIVE.md`.

### `[FU-AUTH-SIGNUP-ROUTE-UNREACHABLE]` — ⚠ corrupting real data today
The name field exists and works (`Login.tsx:1943`, rendered when `intent="create"`), but **nothing in
the product links to `/sign-up`** — two occurrences on trunk: the `App.tsx` route and a comment.
`/login` is linked from eight files. **Every student enters via `intent="signin"`, which has no name
field, so every new account is created with no `displayName`**, putting a raw email into the six
surfaces PR-B2 fixed. **AUTH-3 preserved the field; the one-door redesign orphaned the route to it.**
*Mount ≠ live, one layer up: the component is reachable, the page is not.* → `NAME+LINK`, Wave 5C.

### `[FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]` — the generalisation, worth more than its fix
FORBID-1's contract asserts a **non-entitled student sees an ENABLED** "Check my answer" button. That
protected none of what the ban protected (`EquationInput`/`autoGrow`, the prop contract, render states,
payload shape) — **it froze the behaviour that happened to be current the day it was written, and
thereby silently forbade the next intended change.**
> **A guard replacing a blanket ban must pin WHAT THE BAN PROTECTED, not WHAT THE FILE DID THAT DAY.**
> The second is easy to write, passes immediately, and blocks the future. **FORBID-1 was excellent work
> and still did this** — which is why this is a rule, not a criticism.
**FORBID-3 = replace that one assertion.** Do not weaken `autoGrow`/`maxRows` or the payload shape.

### `[FU-GATE2-LOCKED-CTA-BLOCKED-BY-CONTRACT]` — and FORBID-3 alone does NOT unblock it
Two of three blocks survive the amendment: **(2)** `useSubscription` cannot be added under the current
test setup — no global firebase mock, and the mocked truthy `uid` fires `hydrateSubscriptionFromCloud`
against real Firestore in jsdom (**test-infrastructure, not a contract amendment**); **(3)** an
`entitled` prop would have **no caller** — the parents belong to other lanes (**MOUNT-NOT-LIVE**).
⇒ **`GATE-3` = amendment + test setup + prop + parents, ONE lane.**

### `[FU-CONTROLLER-TEST-COUNT-IS-NOT-A-DIFF]` — controller error, retracted
"Still 9 tests" was read as "file unchanged". **Both observations were POST-change commits**; META-1
had added +70 lines. **A count is not a diff** — same shape as `MOUNT ≠ LIVE`, `MERGED ≠ DEPLOYED`.

### `[FU-AICLIENT-402-429-ORDER-UNPINNED]`
The 429 branch precedes the 402 branch, so the "a 429 does not open the sheet" assertion passes by
**branch ORDERING, not by the predicate it appears to test. Reordering the two is a change no test
would catch.**

### `[FU-USER-PROGRESS-BARE-PATH-STILL-ANSWERS]`
`/api/user/progress` (no subpath) returns **400, not 404**, while `/xp` and `/streak` correctly 404.
**Something still answers the bare path — not established, and deliberately not guessed at.**

### `[FU-GRADING-LATENCY-17S]`
A production `check-solution` took **17.3s**; another 7.0s (owner HAR, 139 requests). ⚠ **The
batch-grading arc makes this worse before better.**

### `[FU-COOP-BLOCKS-POPUP-CLOSED-CHECK]`
Four `Cross-Origin-Opener-Policy would block the window.closed call` errors per session. ⚠ **Not
SEC-1's doing** — present the previous morning. COOP `same-origin` vs Firebase `signInWithPopup`
(**Google sign-in**). Works today; the kind of thing a browser update breaks.

### `[FU-DBSYNC-CLIENT-CALLERS-DEAD]` — ✅ CONFIRMED LIVE
Owner HAR: exactly one failure in 139 requests, `POST /api/user/progress/focus → 404`. **PG-1's
prediction, observed.** Server side gone, client still calling. **Not "the Postgres layer is removed."**

### `[FU-SEC1-CI-WIRE-SERVER-TESTS]`
SEC-1's two new `.cjs` suites are green locally and **ungated in CI** — wiring needs
`lazytopper/package.json`, which is CI-DOCS'. **Fold into CI-DOCS.**

### `[FU-SCOUT1-ALERTS-ARE-NOT-A-WORKSPACE-PROBLEM]`
Hono/morgan/`re2` resolve through the **root** importer via `firebase-tools`, not any workspace member.
**Deleting every apparently-dead member removes 211 of 1,417 packages but only 4 of 103 alerts.** The
real levers are `firebase-tools` (26 exclusive) and lazytopper's own tree (31). **A workspace-deletion
lane is not worth scheduling on supply-chain grounds.**

### `[FU-SCOUT1-VALIDATEBANKS-NOT-IN-CI]` — ⚠ green in CI, red on deploy
CI never runs the root `pnpm run build`, so `validateQuestionBanks` and `syllabusGuard` are gated
**only by the Railway Docker build.** → CI-DOCS' successor, **not** CI-DOCS itself.

### Also filed
`[FU-OG-IMAGE-PNG-REEXPORT]` (owner-only; a bitmap cannot be text-scanned) ·
`[FU-SPA-NO-PER-ROUTE-METADATA]` (all 7 sitemap URLs serve identical metadata; long-tail search is
structurally unreachable) · `[FU-FORBIDDEN-MAP-STALE-SOLUTIONCHECKER]` (reissue with the derivation SHA
on its face) · `[FU-SUBAGENT-DISK-WRITE-PATH-OK]` (shell writes to `Desktop\diff\` are **not** blocked;
only the `Write` tool refuses `.md`) · `[FU-LANE-OVERLAP-FILE-EXACT-NOT-DIRECTORY]` (it **does** gate,
and matches exact file lists) · `[FU-PREDICTIVE-PAPERS-STRING-IN-TUTOR-DATA]` ·
`[FU-GATE2-ASSERTIONS-4-AND-11-UNTESTED]` · `[FU-402-INLINE-MESSAGE-ABSENCE-UNPINNED]` ·
`[FU-FEATUREGATES-RETIRED-ENTRIES]` · `[FU-SEC-DIAGRAMS-SANITISER]` (7 high alerts, deliberately
excluded) · `[FU-SCOUT1-LIBDB-IS-SCHEMA-OF-RECORD]` · `[FU-DOCKERFILE-STALE-PM-COMMENT]`

## 2026-08-03 — Post-Wave-5A (#579–#582, four PRs / five lanes). Trunk `59ba4da2`.

> **★ PROVENANCE FOR THIS SECTION.** Bodies below are authored from the controller's state file, the
> cofounder's close memo, and the five subagents' returned reports. **Nothing here is reconstructed
> from an FU id alone.** **Standing Rule 3 is observed:** dated sections below are not rewritten;
> closures and corrections to older entries are recorded **here**.
>
> ⚠ **This section was written by a SUBAGENT, not the controller** — a declared deviation, because
> the controller was at ~13% context and stranding a six-file handoff mid-way is the exact failure
> the operating model exists to prevent. **§4's intent is preserved: one lock, one actor, never
> raced.** Precedent: Wave 4's `HANDOFF-W3` (#564).

### 🛑🛑 THE DEPLOY SPLIT — the wave's own subject, and it sits below every gate

#### `[FU-DEPLOY-SPLIT-RAILWAY-VERCEL-DIVERGENCE]` — ⚠⚠ OPEN, and it is a standing doctrine, not a task
**GATE-1 merged at 12:46. Vercel never built it. Railway did.** For roughly two hours the **server
enforced a rule the client had no code to explain**, and a free student pressing "Check my answer"
saw the raw string **`premium_required` in red** — **the exact defect GATE-1 §3D was written to
prevent. §3D was correct, was merged, and had not shipped.**

**Caught by fetching the live bundle and grepping it:** `premium_required` and
`PremiumRequiredError` were **absent from all 65 deployed chunks**; present after a forced rebuild.

> **`MERGED` AND `DEPLOYED` ARE DIFFERENT STATES, AND THIS PRODUCT HAS TWO DEPLOY TARGETS THAT CAN
> DIVERGE.** Vercel (frontend) and Railway (backend) build independently from the same trunk. A merge
> confirms neither. **Any change spanning both must have BOTH deployments confirmed before it is
> called verified** — and the only trustworthy confirmation is asking the running system, not reading
> a dashboard.

★ **The generalisation:** every lane this wave proved *"a green CI run is evidence only about what it
EXECUTED."* This proves the sequel — **a merge is evidence only about the REPOSITORY.** GATE-1b's
grep asked the CI log what it ran; the fix here was to ask the **bundle** what it shipped. *Same
instrument, one layer out.*

#### `[FU-DEPLOY-HOOK-IS-THE-ONLY-MANUAL-TRIGGER]` — OPEN (owner-owned)
Two operational facts, both counter-intuitive and both worth never re-deriving:
- ⚠ **Vercel "Redeploy" rebuilds the ORIGINAL commit, not the branch tip.** It cannot pull in a newer
  merge, **and it looks like it should.**
- ⚠ **Branch protection means there is no git-shaped way to trigger a deploy** — a direct push to
  trunk is refused (`GH013`, correctly). ⇒ **the standing remedy is a Vercel Deploy Hook.** The owner
  has created one and will rotate it. **Rotation is the open half of this entry.**

### 🛑 LAUNCH-BLOCKING — two, and they are different KINDS of work

#### `[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]` — 🛑 OPEN, launch-blocking. **Belongs in GATE-2's spec.**
The "Choose a Plan" modal lists **Smart Study Planner, Daily Focus Mix, Full Analytics Dashboard**
and Chapter Hub. **Study Plan, Daily Mix and Dashboard are RETIRED SURFACES** — the standing rule in
this project is that a reference to a retired surface is evidence of **deadness, not liveness**.

> ⇒ **The paywall is selling four things the product no longer ships, to a student being asked for
> ₹599.** *This is the anti-fabrication doctrine applied to commerce* — and **no gate in this project
> can see it**, because every one of those strings is valid text in a valid component.

⚠ **The fix belongs in GATE-2's SPEC, not a separate lane.** GATE-2 replaces this modal; a separate
lane would contend for the same file and the second one to land silently wins.

#### `[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]` — 🛑 OPEN, launch-blocking. **OWNER / DNS WORK, NOT AN AGENT LANE.**
The verification email landed in **Spam**, and Gmail stated why: *previous messages from
`lazzyy-topper.firebaseapp.com` were marked as spam.*

> **A domain-reputation problem sitting on a BLOCKING gate.** A new email/password student cannot
> enter the product until they click a link arriving in a folder they will not check.

⚠ **Google and phone bypass the gate, so this is invisible in owner testing while affecting every
email student.** Fix = a Firebase **custom action-handler domain on `lazytopper.com`** plus
authenticated SMTP.
★ *AUTH-3's spec predicted the spam risk and required the spam-folder prompt. The prompt shipped and
the deliverability cause did not — **the mitigation was right and insufficient.***

### FOR GATE-2's SPEC

#### `[FU-GATE-COPY-STILL-READS-AS-ERROR]` — OPEN
The 402 message renders **correct copy in an error-red box**. *"Checking your answer is a Premium
feature. You can unlock it whenever you're ready."* is right; the pink background and red border are
not. **A locked feature is not a mistake the student made.** Same defect in the modal's *"Your free
trial has ended"*, also red.
★ **The words passed every wording assertion; the STYLING is the defect** — PR-F1's lesson recurring.

#### `[FU-UPGRADE-MODAL-NO-BASIC-EXIT]` — OPEN
The modal offers only **"Choose Plan"**. There is **no "Keep using Basic"**. It tells a student the
product is over rather than what they still have — **the single element GATE-2's spec calls most
important.**

#### `[FU-ENTITLEMENT-TIER-DERIVATION-DUPLICATED]` — OPEN. ⚠ **GATE-2's spec must carry this verbatim.**
> **The effective tier is NOT the stored `tier` field. It is
> `applyExpiry(repairInterruptedTrial(...))`, and the order is load-bearing.**

The server gate (`server/services/entitlement.cjs`) and the client (`featureGates.ts` /
`subscriptionService.ts`) now derive it **independently**. A shared import is **not feasible** —
`subscriptionService.ts` imports the **browser** firebase SDK at module scope and cannot be required
from CJS — so this is a **documented** duplication, which the spec explicitly prefers to a silent one.

⚠⚠ **What must stay aligned is the DERIVATION, not the field.** Reading the raw `tier` would have
produced a gate that **serves every expired trial** (the day-7 hole the lane exists to close) **and
simultaneously locks out mid-trial students** — both failure directions at once, from one plausible
reading of the spec. ★ `repairInterruptedTrial` is Wave 4's #574 P0 fix, so **a server gate on the
raw field would have re-opened that P0 on the server side**, in a component no client test covers.
⚠ **Both directions are wrong:** an elapsed `tier:"trial"` is effectively free, and an unelapsed
`{tier:"free", plan:"trial_7day"}` with a server-pinned start is effectively trial — **which is
exactly what the activation defect writes for every new signup.**

### METHOD — the rules this wave earned

#### `[FU-MUTATION-RESTORE-GIT-BLIND-ON-UNTRACKED]` — ⚠⚠ STANDING RULE, has both a failure and a control
`git checkout --` and `git diff` are **both no-ops on an untracked file.** GATE-1's first mutation
harness used exactly those to restore and verify, and `entitlement.cjs` was **new**, therefore
untracked ⇒ **M1–M3 silently ACCUMULATED while the harness printed `RESTORE VERIFIED: YES`.** The
lane caught this itself, rebuilt on **byte snapshots + SHA-256**, and re-ran everything.

> ★★ **The verification INSTRUMENT was the silent no-op — not the code under test.** The first such
> mechanism found *inside a restore-verifier*, i.e. inside the very control the standing rule
> prescribes. ⇒ **"verify the restore" is INSUFFICIENT AS WRITTEN. Say HOW you verified, not that you
> did.**

✅ **The control exists:** GATE-1b was the first lane dispatched after this was written, restored by
SHA (`c0329f27 → ac729484 → c0329f27`), and it worked. **Every future mutation lane on a NEW file
inherits this trap.**

#### `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]` — OPEN. ⚠⚠ **Its own Wave 5B PR. DO NOT touch `CLAUDE.md`.**
`.github/workflows/quality-gate.yml` prints `--- Root guard matrix: 5 suites, 175/175 ---`
**directly above the step that reports 28 suites / 190 tests**, and a second line says `59 suites`
where CI now runs **96 test files**.

⚠⚠ **`CLAUDE.md` IS CORRECT AND MUST NOT BE EDITED.** **Three separate lanes this wave reported that
§6a says "175", and all three were remembering, not looking.** Grepped against trunk, the file
contains **no `175` anywhere** — it has read `SIX suites / 190 checks … the count GROWS; read it from
the run, never hardcode it` since **Wave 4's #572**, which is exactly what that PR was for.

> ★★ **THE MAP-FILE LESSON RECURRING: a stale value's ban lives where you LOOK for it, not where you
> REMEMBER it** — and #572 fixing one copy is *why* the remembered version persisted. **The one lane
> that actually enumerated found it somewhere else entirely.**

⚠ **It cannot ride a `handoff/**` docs-only PR** (a workflow is not a doc), and it must land **after
#579 is closed** — SUPPLY-1 was deliberately barred from `quality-gate.yml` because a shared workflow
reaches every other lane. **Natural home: alongside `CI-DOCS`.**
★ *Editing `CLAUDE.md` would churn a correct file and, worse, record a correction that never happened.*

#### `[FU-SPEC-STOP-BEFORE-COMMIT-WAS-WRONG]` — RESOLVED, recorded because the line will be rewritten otherwise
Every Wave 5A lane spec and the dispatch document said *"stop before commit, report, wait."* **Six
separate passages in the same documents contradict it:** every report template requires a PR number,
a CI run id bound to the current head, a quoted zero-skip line, and a landed-file reconcile — **none
of which can exist without a commit and a push.** A third rule sits on trunk: `CLAUDE.md` §3, *"ASK
before: git commit, git push."*

**Owner ruling, 2026-08-03:** each lane works in its own worktree, runs all local gates, commits,
pushes a **DRAFT** PR, reads its own CI log, and stops. **Nobody marks a PR ready. Nobody merges. The
owner merges.**

> ★ **The line is recorded as WRONG, not merely ambiguous.** *A silently-correct value teaches
> nothing; the next spec author will write the same line again.*

⚠ **Companion trap, carried:** `gh pr edit` **silently un-drafts a draft PR** (recover:
`gh pr ready --undo`). No Wave 5A lane hit it — all four checked.

### GATE-1 / GATE-1b

#### `[FU-GATE1-TEST-NOT-IN-CI]` — ✅ **CLOSED** by quoted before/after grep **with a control**
The 43-test entitlement suite passed locally and was **invisible to CI**, proven by
`grep -c "entitlement.test.cjs"` returning **0** on run `30781159084`. Fixed by two edits to
`lazytopper/package.json` under an explicit owner allowlist amendment; the same grep returns **1** on
run `30786131841`, with `# tests 43 # pass 43 # fail 0 # skipped 0`.

★★ **The control is what makes it evidence:** it grepped the **already-wired sibling**
(`checkSolution` = 1) in the **same before-log, before editing anything** ⇒ the zero was a **missing
link**, not a log artefact and not a grep that could never match. *That is the difference between
"the count changed" and "the count changed BECAUSE OF MY EDIT."*
★ **The subagent STOPPED AND REPORTED rather than absorb an off-allowlist file.** *Extending an
allowlist is an owner decision, and it was never the subagent's to take.*

#### `[FU-GATE1-ANON-FAILOPEN-BYPASS]` — OPEN as **ACCEPTED POSTURE**, not a defect
The server gate fails **open** when the bearer header is absent, so **a caller who simply omits the
header is served.** ⚠ **Bounded, not unbounded:** such callers land in the rate limiter's anonymous
bucket, capped at **3/day**, and the browser has sent the header on every paid call since #552.
**Logged deliberately so it is a conscious posture and not a later discovery** — this is the accepted
cost of failing safe, not a hole in it. ★ Verified on the live deploy: `[entitlement] FAIL-OPEN` is
**absent** from Railway logs.

#### `[FU-MORE-LIKE-THIS-DEAD]` — OPEN (confirmed dead, as GATE-1's §2 predicted)
The "more like this" path is dead. Confirmed by the lane's where-else enumeration rather than
assumed. **No deletion attempted this wave** — it was outside the allowlist.

### AUTH-3

#### `[FU-AUTH-VERIFY-NOT-APP-WIDE]` — ⚠⚠ OPEN, and it is a real limit on what shipped
**The email-verification gate is PAGE-SCOPED, not app-wide.** `RequireAuth` and `App.tsx` are out of
AUTH-3's allowlist, so **a restored session bypasses the verification gate entirely.** ★ Stated
plainly by the lane rather than papered over — **the honest framing is what makes it actionable.**
Closing it needs an allowlist that includes `App.tsx`, which carries its own zero-diff freezes.

#### `[FU-AUTH-NAME-PROMPT]` — OPEN (carried from Wave 4, and now narrowed)
`/login` can still create **nameless accounts**. AUTH-3 **kept** the name field on the create door
(`/sign-up`) rather than reducing `SignUpPage` to a thin render, because ★★ **§6's instruction would
have DELETED the product's only name capture** — `FirstSession` declines the name on trunk — forcing
the deletion of **7 guard tests** and **re-opening PR-B2's one-way-door defect**, where accounts with
no name fall back to the raw email across six surfaces. **The gap that remains is the `/login` door.**

#### `[FU-AUTH-REAUTH-LIVE-UNVERIFIED]` — OPEN
`verifyBeforeUpdateEmail`'s `requires-recent-login` path was tested **at the code path, not live.**
It re-authenticates with the just-typed password and retries **once**; a second failure reports; with
no known password it makes one call and shows an honest message, **no loop.** ★ **Built as a flow,
not an error string.**

#### `[FU-AUTH-TWO-CALLS-PER-FAILED-SIGNIN]` — OPEN (predicted cost, confirmed)
The inverted flow (sign-in first, then create-as-probe) costs **two Firebase calls per failed
sign-in.** This was §1's predicted cost and is confirmed as real. Accepted.

#### `[FU-AUTH-GOOGLE-EMAILVERIFIED-LIVE]` — ✅ **CLOSED**
**Measured twice:** a live Google ID token decoded to `email_verified: true`, and D1 passed in the
browser (Google sign-in shows no verify screen).
★ *AUTH-3 refused to assert this without measurement and named the bounded risk it was taking
instead — §5.2 forced the predicate onto `email` rather than `providerIds`, so a false value would
have gated Google users (an extra step, self-resolving; not a lockout). **The measurement now exists
and agrees.** That refusal was the best judgement in the report.*

### FORBID-1

#### `[FU-CI-TWO-WORKFLOWS-PER-PR]` — ⚠⚠ OPEN, and it changes how every report must be read
**Two workflows fire on every PR, and only one of them gates.** Run `30781253355` on #581's commit is
**"Lane Overlap", which gates nothing**; the Quality Gate was `30781253342`.
> **A controller — or an owner — reading "CI green" off the wrong run learns nothing.** ⇒ **quote the
> Quality Gate run id specifically**, never "CI passed".

#### `[FU-CONV-GATE-HEADER-STALE-VITEST-CLAIM]` — CORRECTED at the new block; the general risk stays OPEN
The C&I convergence gate's own header claimed **CI does not run vitest** — **false** since
`quality-gate.yml` gained a required vitest step. ⚠ **Load-bearing:** it would tell a future reader
that FORBID-1's replacement protection is worthless. Corrected at the new block, and **the wiring was
asserted rather than trusted.** *A doc comment is a claim, not a fact.*

#### `[FU-SOLUTIONCHECKER-PROPS-NOT-EXPORTED]` — OPEN (minor)
`SolutionCheckerProps` is **not exported**; tests must use `ComponentProps<typeof SolutionChecker>`.

#### `[FU-VITEST-CI-HEAP-CEILING]` — OPEN
The vitest run in CI is approaching a heap ceiling. Recorded by FORBID-1; not yet quantified into a
threshold.

#### `[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE]` — OPEN
`SolutionChecker` accepts text **xor** image, a constraint now pinned by the new contract suite
rather than by the deleted blanket ban.

> ★★ **Why the FORBID-1 amendment is a strict INCREASE in protection, recorded once here:** the
> banned-array entry **was the entire protection.** The `AUTOGROW` check regexes `EquationInput.tsx`'s
> **own source**, and **nothing anywhere asserted one line of `SolutionChecker`'s behaviour.** The ban
> said *"something must not change"* and never said what — **and there was nothing underneath it.**
> ★★★ **M2b is the mutation that justifies the whole doctrine:** renaming `--grow` made the **negative
> assertion go VACUOUS and still pass**, and **only the POSITIVE CONTROL caught it.**

### SUPPLY-1

#### `[FU-SUPPLY1-OWNER-TOGGLES]` — 🛑 OPEN, owner-only. **The highest-value entry in this group.**
⚠⚠ **The spec's list was wrong in BOTH directions, and the lane caught it.** It named **secret
scanning** and **push protection** as the outstanding toggles; **both were already ENABLED.**

| Setting | State | Evidence |
|---|---|---|
| **Dependabot ALERTS** | ⚠ **DISABLED** | `404 "Vulnerability alerts are disabled."` **and** `403 "Dependabot alerts are disabled for this repository."` — **two different endpoints**, so not a token-scope artefact |
| **Dependabot SECURITY UPDATES** | ⚠ **DISABLED** | verified |
| Secret-scanning non-provider patterns | disabled | lower value |
| Secret-scanning validity checks | disabled | lower value |

> ⚠⚠ **AND THE CONSEQUENCE IS THE POINT: `dependabot.yml` configures VERSION updates only** (*"a
> newer release exists"*). It **cannot** configure **SECURITY** updates (*"a CVE was published against
> what you use"*). ⇒ **#579 delivers routine bumps and NO vulnerability response at all** until those
> two toggles are on. **A green SUPPLY-1 is NOT "supply chain done", and #579 must not be recorded as
> closing the audit item.**

★★ **Recorded as a SPEC ERROR CORRECTED BY THE LANE, not as a lane finding** — *the distinction is
what stops the wrong version being carried forward.* **This is the second time a spec's §0 has been
wrong on a verifiable fact, and both times the lane caught it.** ★ *A checklist derived from memory
is wrong in both directions at once, and the "already done" half is the more dangerous one, because
it reads as confirmation.*

#### `[FU-SUPPLY1-DEPENDABOT-PARSE-CHECK]` — ✅ **CLOSED by OBSERVATION, post-merge**
Dependabot reads `.github/dependabot.yml` from the **default branch only**, so the config was
**structurally impossible to validate before merge** — and **a malformed file fails SILENTLY**: no
PR, no error in Actions, nothing. The lane reported this half honestly as `UNVERIFIED`, which was the
correct outcome rather than a gap, and mitigated with a PyYAML parse (**which caught a real defect —
the first `codeql.yml` draft was missing the `schedule:` key above `- cron:`**), a no-BOM/CRLF check
and long-stable syntax only.

✅ **Answered after merge: five Dependabot PRs `#583`–`#587` exist. Five PRs could not exist if the
config had not parsed.** The design is visibly working as specified: `#585` bumps *"the
npm-minor-and-patch group with 59 updates"* (grouping confirmed); `#583` (node 24→26-slim) and `#584`
(setup-node 4→7) are majors raised **individually**; **five open = the 3/1/1 cap.**

⚠ **They are also now the PR-list noise SUPPLY-1's §1 warned about.** `lane-overlap` fails on a
shared path against **every** open PR. **They do not touch `handoff/**`, so the wave-close handoff was
clear — but a future `package.json` or workflow lane WILL collide.** ⇒ **triage or close them before
dispatching Wave 5B's `quality-gate.yml` lane or CI-DOCS.**

#### `[FU-SUPPLY1-STALE-NPM-LOCKFILE]` — OPEN
`lazytopper/package-lock.json` is a **stale npm artefact tracked in a pnpm-only workspace.**
`/lazytopper` was **deliberately NOT configured** as a Dependabot ecosystem because of it.

#### `[FU-SUPPLY1-CODEQL-QUERY-SUITE]` — OPEN
CodeQL's `results=0` was **explicitly not sold as a clean bill of health** — it is the **default
query suite**, `javascript-typescript` only. ★ *The caveat was volunteered, not extracted.*

#### `[FU-SUPPLY1-CODEQL-V3-DEPRECATION]` · `[FU-SUPPLY1-CODEQL-ACTIONS-LANG]` · `[FU-SUPPLY1-DEPENDABOT-COOLDOWN]` · `[FU-SUPPLY1-PNPM-CATALOG-SUPPORT]` — OPEN (bodies in the SUPPLY-1 report)
`cooldown:` was **deliberately omitted as unverifiable** rather than guessed. `target-branch` was
**deliberately left UNSET** — setting it would **SUPPRESS Dependabot security updates.**
⚠ **Never reconstruct these bodies from their ids** — the full text is in
`report-supply1-dependabot-codeql-2026-08-03.md`.

⚠ **`on.push` was a real find, not a formality:** with `schedule` + `pull_request` only, CodeQL warned
*"Please specify an on.push hook to analyze and see code scanning alerts from the default branch on
the Security tab."* **Without it the Security tab stays empty — a guard that runs and displays
nothing**, this project's exact silent-no-op class. ★ **Proven fixed by CONTROL CASE:** the
annotation is **ABSENT** from the later run, rather than the line merely being asserted present.

### CONFIRMED LIVE — previously inferred, now measured

#### `[FU-PG-DEAD-ENDPOINT-LIVE-503]` — OPEN. **PG-1's target, now measured rather than inferred.**
`/api/user/progress` returns **503 on every real session**, captured in a **production HAR**.
⚠ **PG-1 must unwire the seven `server/index.cjs` handlers in the SAME ATOMIC PR** as the deletion of
`userProgress.cjs`, **or the server fails to boot on `require`.** Its `DATABASE_URL` half is owner
infra.

#### `[FU-META-CANONICAL-DEAD-DOMAIN]` — OPEN. **META-1's target, confirmed in the wild.**
`<link rel="canonical" href="https://lazytopper.app/">` is **live in production right now**, on a
domain the project has **never owned.** It is **suppressing search presence today**, which is what
makes META-1 time-sensitive rather than tidy-up.

### CARRIED FORWARD — unchanged by this wave, restated only as pointers
`[FU-FOUNDING-FLAG-NOT-WIRED-TO-MONTHLY-INLINE]` (the **HARD GATE**, still in force — read its body in
the Wave 4 section, do not restate it), `[FU-ESLINT-UNRUNNABLE-IN-WORKTREE]`,
`[FU-NO-MERGE-BASE-FILELIST-RECONCILE]`, `[FU-SQUASH-CARRIES-REBASED-BASE]`,
`[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`, `[FU-SUBAGENT-REPORT-TO-DISK-BEFORE-RETURN]` (**observed by all
five Wave 5A lanes**; ⚠ note the harness **refuses the `Write` tool for `.md` from a subagent** —
only the shell works), the BATCH-1 trio, and the DPDP/retention group.
**Per Standing Rule 2, none of these are duplicated here — their bodies live in the dated sections
below and this is a pointer, not a second entry.**

---

## 2026-07-31 — Post-Wave-4 (#566–#575, ten PRs). Trunk `fcdbfa65`.

> **★ PROVENANCE FOR THIS SECTION.** Bodies below are authored from the controller's state file and
> the subagents' returned reports, which the controller captured verbatim. **Nothing here is
> reconstructed from an FU id alone** — where only an id was held, it says so. **Standing Rule 3 is
> observed:** dated sections below are not rewritten; closures and corrections to older entries are
> recorded **here**.

### ★★ THE WAVE'S SUBJECT — four guards that reported success while inspecting nothing

**Read these four as ONE finding, not four incidents.** They are the same defect class at four
layers, and the generalisation is GUARD-1's own doctrine turned back on the tooling that enforces it.

1. **`check:mojibake`** framed its repo root at `lazytopper/` — **`handoff/` was invisible, and the
   gate was green for months over 616 corrupt lines.** (#570 + #571)
2. **`scope_guard_blindspot_acceptance` + `repo_boundary_acceptance`** existed and passed, and **CI
   ran neither** — grepping a 4,076-line run for their filenames returned **0 matches**. (#568)
3. **`react-hooks/rules-of-hooks`** reported **"0 violations" while running nothing** — the rule that
   exists precisely to catch React #310, which is the live crash this wave shipped.
   (`[FU-ESLINT-UNRUNNABLE-IN-WORKTREE]`)
4. **The GitHub `trunk-protection` ruleset** was **Active**, *"Block force pushes"* **enabled**, and
   correctly targeted — and **its Bypass list exempted the only person who could trigger it.**

> ★★ **A check that cannot be shown to have looked, and to be capable of failing, is not coverage —
> it is the APPEARANCE of coverage, which is worse, because it stops anyone looking.**
> ★★ **A PROTECTION WITH A BYPASS IS ONLY AS STRONG AS ITS BYPASS LIST.** *"Enabled"* describes the
> rule; it says nothing about **who it applies to.** **Read the exemptions before the setting.**

---

### `[FU-SQUASH-CARRIES-REBASED-BASE]` — NEW, HIGH. A squash re-carried a force-pushed-away commit, and no gate saw it.

**What happened.** AUTH-1 was rebased onto `937c88f` (#564) while that was trunk. A force push then
reverted trunk to `25e995a7`, dropping #564 and #565. When AUTH-1 was **squash**-merged as **#566**,
its squash diff was computed against the **reverted** base — so it landed **13 files: its own 4
product files plus all 9 of #564's handoff files (+2053/−6).**

**Verified, not inferred:** `git show --stat 937c88f8` lists nine `handoff/` paths;
`git diff --stat 937c88f8 <trunk> -- handoff/` differs in only three files, each accounted for
(#570's mojibake re-encode in `CURRENT_STATE.md` and `OPEN_QUESTIONS_AND_FOLLOWUPS.md`; #567's
+34/−0 hard gate in `NEXT_ACTION.md`). ⇒ **every line of #564 is on trunk.**

> ★★ **THE RULE: a squash merge's diff is computed against the base at MERGE time, not against the
> base the branch was built on.** Rewrite the base under a rebased branch and the squash will
> **silently re-carry everything the rewrite removed.** **Here it was a repair. It could just as
> easily have restored a revert, or re-landed a reverted security hole.**

**And it breached a rule invisibly.** CLAUDE.md §8 requires that *"product PRs must contain zero
handoff doc changes."* **#566 breached it and nothing caught it** — `scope:guard` reads the
**working tree**, where AUTH-1 correctly saw and reported four files. ★ **The guard was right about
what it inspected and blind to what would ship.** *(A fifth instance of this wave's subject, in the
same shape.)*

**ACTION:** after any force push or base rewrite, **audit the file list of the NEXT squash merge
against what that PR claims to change** — `gh pr view <n> --json files` compared to the lane's
allowlist. **Unassigned.** ⚠ A gate for this would need to compare the merge-time squash set against
the PR's own declared scope, which nothing currently does.

### `[FU-NO-MERGE-BASE-FILELIST-RECONCILE]` — NEW, HIGH. Nothing reconciles what a PR CLAIMS to change with what it WILL LAND.

**This is the gate `[FU-SQUASH-CARRIES-REBASED-BASE]` needs, recorded as a follow-up rather than a lane.**

Every existing scope check inspects either the **working tree** (`scope:guard`) or a `base...HEAD`
commit range that assumes the base is stable. **Neither answers the question that actually matters at
merge time: "what will this squash put on trunk?"** #566 declared and gated four files and landed
thirteen, and **no gate in this repo could have noticed.**

> ★ **The owner's framing, and it is the sharpest description of the class: the other four instances
> this wave were guards that LOOKED AT NOTHING. This one LOOKED AT THE WRONG THING, CORRECTLY.**

**The data already exists on both sides and nothing joins them:**
```
gh pr view <n> --json files                  <- what the PR declares
git diff --name-only <merge-base>..<head>    <- what the squash will actually land
```
⇒ **reconcile the two before merge, and fail on any path present in the second but absent from the
first.** ★ **Cheap, and it needs no new information** — only a comparison nobody is making.

⚠ **Scope note for whoever takes it:** it must run against the **merge base**, not the branch's
original base, because those two differ **precisely when it matters** — after a force push, a reset,
or a base rewrite under a rebased branch. **Unassigned.**

### `[FU-SUBAGENT-REPORT-TO-DISK-BEFORE-RETURN]` — NEW, HIGH (process). A return message is the only copy.

**This wave's subagents were blocked from writing report files to disk**, so each lane's report
existed **only** as a return message the controller captured verbatim. ⇒ **a lost or truncated relay
is a lost report**, with no second copy anywhere.

★ **This is not hypothetical.** Wave 3's **EV-1 lane has no report at all** — its only surviving
record is `handoff/WAVE_STATE_WAVE3_ARCHIVE.md`. The same wave saw two agents at ~4–7% remaining
context **each mislabel their own PR number**, which is exactly the condition under which a return
message is least reliable and a written artefact matters most.

★★ **AND IT NOW HAS ITS CONCRETE NEAR-MISS, WHICH UPGRADES THIS FU FROM A RECOMMENDATION TO A
STANDING INSTRUCTION.** **BATCH-1's report survived THREE FAILED RELAYS** before anyone wrote it down,
and it was **nearly lost together with its worktree** — that lane wrote zero files and removed its
worktree and branch, so the single file
`C:\Users\Chetan\OneDrive\Desktop\diff\report-batch1-2026-07-31.md` **is the entire lane.** Had the
fourth relay failed too, the wave's three best spec defects would have gone with it.
> ★ **A near-miss is the version people act on; a recommendation is the version they read.** ⇒ the
> instruction below is no longer advisory — it is in every dispatch file from 2026-07-31 onward.

> ★ **STANDING INSTRUCTION for every controller, written into every dispatch file: require every
> subagent to write its full report to `C:\Users\Chetan\OneDrive\Desktop\diff\` as its FIRST action
> AFTER its gates pass and BEFORE composing its return message.**
> **Report first, then summarise.** A summary is a lossy derivative of a report; producing the
> derivative first and the original never is the wrong order — **and it is the order that low
> context forces**, which is why it has to be an instruction rather than a habit.

⚠ **Verify the harness actually permits the write before relying on it** — the block was real in
Wave 3 and the correction was issued mid-flight. If it is still blocked, the fallback is the
subagent's scratchpad **with the absolute path returned in the report.** **Unassigned.**

### `[FU-TRIAL-DAYS-LOST-TO-P0]` — NEW, MEDIUM. The repair restores the flag but not the entitlement.

#574's `repairInterruptedTrial()` re-derives the trial window from the **original, server-pinned**
`trialStartDate` — **by design, because moving it would break the immutability SEC-2 exists to
enforce.** ⇒ **a student wrongly on `free` for two days gets five days of trial, not seven.**

> ★★ **That is correct behaviour for the fix and wrong for the student, and the two are not the same
> thing. A fix that restores the flag but not the entitlement is a partial fix that looks total —
> the repair reports success while the student is quietly short of days, and NOBODY WOULD THINK TO
> LOOK.**

**Handled for now:** the owner reset the affected handful manually in the Firebase Console. **No
code.** ⚠ **At volume this needs a script, and that script MUST go through a SERVER/ADMIN path,
never a client one** — a manual Console reset is an Admin SDK write that bypasses rules;
`trialStartImmutable()` denies the client equivalent, and reopening that would undo SEC-2.

### `[FU-ESLINT-UNRUNNABLE-IN-WORKTREE]` — NEW, HIGH. The lint rule that would have caught #575 protects nothing.

`npx eslint src` **dies with a module-resolution error in a fresh worktree**, so
**`react-hooks/rules-of-hooks` reports "0 violations" while running nothing.** That is the rule whose
entire purpose is catching a hook after an early return — **exactly the defect that shipped as the
live mobile crash (#575), introduced by #554 and undetected for a full release cycle.**

★ **Proven by CONTROL, not by quoting the clean result:** the subagent mutated the file so a real
violation existed and the linter still reported zero. ⇒ **zero protection today, in the repo's fresh
worktrees — which is where every lane in this operating model does its work.**

**Unassigned. This is the highest-value item on the guard backlog**, because the class it covers has
already cost a production outage once.

### `[FU-DEV-BROWSER-CANNOT-REPRO-AUTH-TIMING]` — NEW, MEDIUM. The dev app cannot produce the failing order.

`/browse` is a **lazy route**, and in the dev server auth resolves **before** that chunk mounts — so
`MobileAccountMenu` never renders with `user === null` and **React #310 cannot be reproduced
locally.** In production, Firebase's IndexedDB restore is **slower than the chunk**, which is the
entire bug.

★ **Consequence, stated rather than papered over:** #575's "before" screenshot **does not show the
error page**, and the subagent said so plainly rather than letting a picture stand in for proof.
The decisive evidence is the vitest harness plus mutation M1, ★ **whose two surviving green tests
are the CONTROLS** (clean state; user present at first render), proving the suite is not green for
the wrong reason.

⇒ **Any auth-timing defect must be reproduced in a harness, never in the dev browser.** Unassigned.

### `[FU-RETENTION-ALREADY-MINIMAL]` — NEW, RESOLVED AS A QUESTION. No deletion policy is owed.

**The question asked was "are we keeping too much?" The answer is "we are keeping the right things,
and losing one the student wanted."**

- **No answer image is persisted anywhere.** Images travel as **base64 in the request body** and are
  **discarded**. Nothing writes them to Storage or Firestore.
- Firestore holds only `SessionRecord` **summaries** — four-type breakdown, section breakdown, topic
  keys, focus aggregates — **which is exactly the scorecard the product needs.**
- The graded-sheet artefact is rebuilt from a **local** cache and is **already ephemeral**.
- ⇒ **NO DELETION POLICY IS NEEDED. Do not write a lane for one.**

> ★★ **THE GAP RUNS THE OTHER WAY: the download DISAPPEARS when the local cache is evicted, so a
> student loses their graded sheet WITHOUT EVER CHOOSING TO.** ⇒ **the actionable fix is to OFFER
> THE PDF AT GRADING TIME**, rather than depending on a cache that will not survive.

★ **And "last 7 days" was never retention.** `getActivitySummary` computes
`cutoff = Date.now() - sinceDays * DAY_MS` **at READ time** — a **display window**. **Records stay;
the query narrows.** ⇒ **a student promoted from trial to premium needs NOTHING done**, and widening
the window is a display change, not a data recovery. *(Losing that distinction would have produced a
migration lane that never needed to exist.)* The only TTLs in the repo are a 6-hour exam-date cache
and a 5-minute QR upload slot — both operational, neither touching student data.

### `[FU-RETENTION-UNBOUNDED-UNBUDGETED]` — NEW, COST. Read volume, not stored size.

Nothing is ever deleted, so the corpus grows monotonically. ⚠ **CORRECTION TO AN EARLIER FRAMING:
storage is NOT the driver** — per `[FU-RETENTION-ALREADY-MINIMAL]`, Firestore holds **text summaries
only**, so stored bytes stay small. **The unmodelled cost is READ VOLUME at scale**: Firestore
charges per document read, and at ~1,000 students across a board year of daily attempts the read
counts are real money that **nobody has modelled.**

⇒ **Belongs in `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md`, NOT a code lane.** Unassigned.

### `[FU-NO-DELETION-OR-EXPORT-PATH]` — NEW, LEGAL, PRIORITY ONE.

**There is no account deletion path and no data export path.** For a **minor-user product** this is a
**DPDP Act** question, and it is already priority one on the external audit brief.

★ **Note the connection to `[FU-RETENTION-ALREADY-MINIMAL]`, because it cuts both ways: minimal
retention LOWERS the deletion exposure and does NOTHING for export.** And *"offer the PDF at grading
time"* is **the nearest thing to an export path the product would have** — which makes it a legal
item as well as a UX one. Unassigned.

### `[FU-AUTH-NAME-PROMPT]` — NEW, MEDIUM. Deferred by #569, and the absence is pinned.

AUTH-2's name prompt was **deliberately deferred**: `AuthContextType` exposes **no `displayName`
write path**, and the sole `updateProfile` call sits inside `signUpWithEmailPassword`. Adding one
adds a context key, and `AuthContext.passwordReset.test.tsx` **pins the context shape by exact
equality — so it goes RED on an ADDITION**, and roughly 20 `vi.mock` factories would need updating.

★ **The absence is pinned by two tests, so this is a recorded decision rather than a silent gap.**
Its natural home is the `NAME+LINK` lane, which is specced and not started.

### `[FU-MOBILE-WELCOME-BACK-FIRST-SESSION]` — NEW, LOW. Copy contradiction on one viewport.

`MobileHome` greets a zero-attempt student **"Welcome back"** directly above a card headed
**"FIRST SESSION"** — both visible in one viewport. It was inside #569's allowlist, but the copy is
unscoped and existing tests assert on it, so it was **left alone and reported** rather than changed
opportunistically. Unassigned.

### `[FU-SHELL-GREETING-SMALL-HOURS]` — NEW, LOW. Honest but blunt, and pre-existing.

`greetingFor(new Date().getHours())` resolves `<12` morning / `<17` afternoon / else evening, so **a
2am student is greeted "Good morning."** #573 moved the function **verbatim and unchanged** and did
not alter the behaviour. Open only if 00:00–04:00 should read differently. Unassigned.

### `[FU-AUTH2FU-LINKPHONENUDGE-ALLOWLIST]` — NEW. A declared deviation, and a copy collision with a live guard.

#573 changed one line in `lazytopper/src/components/auth/LinkPhoneNudge.tsx`, **which was not on its
allowlist**, because the §5 card-copy ruling lived only there. **It flagged the deviation for
explicit confirmation rather than absorbing it**; revert is a single hunk.

★ **The substantive half is a doctrine collision the owner still owes a ruling on.** §5's literal
sentence ends *"— same account, same progress."* Lane F has a **live doctrine guard**:
`expect(el.textContent).not.toMatch(/progress/i)` on that card. ⇒ **restoring the literal wording
means DELETING that guard.** #573 **kept the guard** and closed the sentence with the owner's own
phrase from the modal sentence in the same ruling: *"— same account, everything you've done."*

> ★ **It did not silently delete a guard to make a copy string fit — which is the move that would
> have passed unnoticed.** ⇒ **Ruling owed: accept the substitution, or delete the Lane F guard.**

### `[FU-MOBILE-SIGNED-IN-PILL-REDUNDANT]` — ✅ CLOSED by #573.

`MobileHome` rendered a plain **"Signed in"** pill immediately left of the account avatar — the exact
redundancy the desktop ruling had removed. **Only that branch was deleted**; `Trial active`,
`Premium`, `Trial expired` and the signed-out `Start free` are untouched, **because those carry
information the avatar does not.** *(The redundancy was the defect, not the component.)* Removed with
three controls, including a positive control proving the slot still shows `Trial active`.

### `[FU-FIRSTSESSION-ACT-WARNINGS]` — NEW, LOW. Noise introduced into someone else's suite.

CI stderr carries three `An update to FirstSession inside a test was not wrapped in act(...)`
warnings, sourced from the **pre-existing `MobileHome.test.tsx`** — noise #569 introduced into a
suite it did not own. **No gate is affected.** Self-reported, unprompted. Unassigned.

### BATCH-1's findings — ✅ **ALL THREE ADOPTED, 2026-07-31.** The lane is **RULED and re-dispatched**, not blocked.

> **STATUS UPDATE — read before the entries.** The two rulings BATCH-1 was waiting on are made, and the
> lane has been re-dispatched. **Transport: OPTION A** — widen the allowlist by **exactly**
> `lazytopper/src/ai/aiClient.ts` for an additive `uploads?` field; the hand-rolled-fetch bypass was
> **rejected**, because ★★ **a second, diverging transport to one endpoint is a worse outcome than any
> allowlist breach.** **M2: REWRITTEN, not dropped** — mutate the map DIRECTION so the test can fail;
> ★★ **a guarantee that holds structurally still needs a test — not to prove it holds today, but to
> FAIL WHEN SOMEONE REMOVES THE STRUCTURE THAT MAKES IT HOLD.**
>
> ★ **The three entries below stand EXACTLY AS WRITTEN and are ADOPTED — they are the spec's
> corrections, not open questions.** Nothing below is restated elsewhere; `NEXT_ACTION.md` §3 now
> POINTS here rather than carrying a second copy.
>
> ★ **The lane's report is the entire lane** — worktree and branch removed, zero files written. It is on
> disk at `C:\Users\Chetan\OneDrive\Desktop\diff\report-batch1-2026-07-31.md`, with the rulings at
> `SUBAGENT_BATCH1_RULINGS_2026-07-31.md` in the same folder. **There is no other copy.**

**`[FU-BATCH1-BATCH-PATH-BLAST-RADIUS]` — HIGH.** The spec attached its blast-radius constraint to
the **wrong path**. It protected *"the existing SINGLE-IMAGE worksheet path"* — a path the change
does not touch. **Verified:** `DesktopCheckImprovePage.tsx` calls `gradeWorksheet` **directly** for
multi-question C&I, so **worksheets, chapter tests, full mocks AND multi-question C&I — four live
surfaces — all route through the BATCH path, the path being edited.** ⇒ the load-bearing guard is
**"batch path with no `uploads` present builds byte-identical `contents`."**
★ *This SHARPENS the constraint rather than softening it.*

**`[FU-BATCH1-M2-STRUCTURAL]` — HIGH.** Mutation 2 **cannot go red as written**, because the
assertion is already unconditionally true: `gradeStructuredSet` ends by mapping over the **SENT**
set, so a model-returned `qNumber` that was never sent lands in the lookup map and **is never read.**
> ★ **The guarantee lives in the map DIRECTION, not in a pairing check.** A test feeding a stray
> `qNumber` passes today **and against almost any pairing mutation.**
⇒ either mutate the direction (iterate the parsed results instead of the questions), **or drop M2 and
state the property is structural, quoting the code.** *Correct assertion, wrong stated reason —
"never trust the pairing" implies a runtime check that neither exists nor is needed.*

**`[FU-BATCH1-DETECT-THIRD-IMAGE-SITE]` — MEDIUM.** There are **three** image call sites, not two:
single-image grade, **single-image DETECT (the one the brief missed)**, and the batch call. A fourth
lives in `mentorResponseBuilder.cjs`, out of lane.

**Also established, so nobody re-derives it:** **ZERO schemas need extending** — the change is
**request-only** (`contents[].parts`), every response shape is untouched, so `WORKSHEET_RESPONSE_
SCHEMA` stays byte-identical and the C2 `responseSchema` rule is not engaged. ★ **Do not tighten
`qNumber`: a schema cannot express set membership.** And **the recording path needs no change** —
`buildQuickPracticeSessionRecord`, `quickPracticeCode` and `qpTopicToken` already exist, so the
wrapper can follow `chapterTestGradeService` exactly.

⚠ **The lane wrote nothing, gated nothing and removed its worktree.** ★ **Correct discipline for a
blocked lane: no half-built diff left for someone to find and trust.**

---

### CLOSURES AND CORRECTIONS TO EARLIER ENTRIES

- **`[FU-GUARD-1-A]` — ✅ CLOSED by #568.** `repo_boundary_acceptance.mjs` enumerates from the git
  root and imports the **real** `classifyFile`. ★ **The stale private copy was missing FOUR lanes,
  not the two the spec named** (`apiServer`, `docs`, **and `firestore` + `repoRoot`, added by
  GUARD-1 itself**) — and ★ **the two defects were far worse together than stated: with enumeration
  fixed, the stale copy leaves 158 tracked files unclassified.** *The blind spot did not merely hide
  the stale copy — it hid its magnitude.*
- **`[FU-GUARD-1-B]` — ✅ CLOSED by #568, and closed the way it was required to be closed.** The CI
  log now carries `> node scripts/ops/scope_guard_blindspot_acceptance.mjs` /
  `PASSED (6/6)` and `REPO_BOUNDARY_SUBJECT ... tracked=1715 outside_anchor=334`. **#560's equivalent
  grep returned zero.** ★ **The counter names its subject — 334 files it previously could not see** —
  which is *"a guard's output must name its subject"* satisfied in the log itself. ★ **Linux was
  verified by EXECUTION** (first run of the temp-git-repo suite on the ubuntu runner), not argued
  away.
- **`[FU-MOJIBAKE-GATE-CWD-BLIND-SPOT]` — ✅ CLOSED by #571.** The gate now frames at the git root:
  `tracked=1717 scanned=1456`. It **ENFORCES** on product trees and every other tracked tree **by
  default** and **reports-without-failing** on `handoff/`.
- **`[FU-MOJIBAKE-SPECIMEN-LINES]` — ✅ RESOLVED BY SCOPING. Both proposed options REJECTED.**
  The plan assumed `616 → 0`; **the true floor is 8**, so a hard root-framed gate would be **red on a
  correct repo.** ❌ *Escaped codepoints* — *"preserves the INFORMATION and destroys the LESSON;
  someone reading the FU needs to SEE what the corruption looks like to recognise it in the wild."*
  ❌ *A gate-honoured pragma* — *"a file allowlist with better manners; the next person adds one to
  silence a real hit."* ❌ *A file allowlist* — never proposed, correctly.
  > ★★ **THE RULING, and the reasoning IS the specification: the gate was asking the wrong question.**
  > Mojibake is a **DEFECT** in product text and a legitimate **SUBJECT** in documentation about
  > mojibake. **A gate that cannot tell those apart is not detecting a bug — it is banning a
  > character.** *"The gate's job is 'no mojibake reaches a student', not 'no such byte exists in the
  > repository'."*
  ★ **NOT softening:** the gate **still SEES `handoff/`** and would still report if 616 lines
  reappeared. ★★ **The COUNT is what makes it monitoring rather than exemption** — `MOJIBAKE_SCOPE`
  and `MOJIBAKE_REPORT_ONLY` print on **every** run including a clean one, enforced by an assertion,
  *because a silent skip is indistinguishable from a blind spot.*
  ⚠ **DO NOT "TIDY" THE RESIDUAL 8 AND DO NOT RE-ENFORCE `handoff/`.**
- **`[FU-HANDOFF-MOJIBAKE-LEGACY]` — ✅ ABSORBED into the ruling above.** ★ **The repo already held
  this doctrine and nobody had connected it:** that entry already said of its own hit — *"a
  **deliberate** mojibake example inside a lesson about mojibake — leave it."*
- **`[FU-GUARD-3-TOOLINGDOCS-MODE]` — ✅ CLOSED BY AVOIDANCE.** GUARD-3/PR-1 was `trackedTooling` +
  `docs` and no policy mode covered the pair. Ruled: **split the `CLAUDE.md` hunk into its own docs
  PR (#572)** rather than invent a `toolingDocs` mode.
  > ★ **A mode invented to let one PR pass its own guard is a bypass with a nicer name.**
  > ★★ **And the fact that GUARD-3's PR could not pass GUARD-3's own new guard is THE GUARD WORKING.**
- **`[FU-GUARD-3-REPOBOUNDARY-ROOT-ENUM]` and `[FU-GUARD-3-CLASSIFYFILE-DUPLICATE]` — ✅ WITHDRAWN**,
  both fixed by #568.
- **`[FU-GUARD-2-WORKFLOW-COMMENT-STALE]` — PARTIALLY CLOSED.** #572 corrected root `CLAUDE.md`
  (**5 suites → 6**; the sixth is `aiTierContentIntegrityGuard`; true count **190 tests / 28
  sub-suites / 0 skipped**, read from the run). ⚠ **`quality-gate.yml`'s comment still says "5
  suites, 175/175"** and remains open as `[FU-GUARD-3-CI-COMMENT-STALE]`.
  > ★★ **The artefact was the CONTRADICTION, not the number: `CLAUDE.md` contradicted itself fifteen
  > lines apart**, and **the correct line was already documenting its own past staleness** while the
  > stale line sat above it. The *"count GROWS / do NOT hardcode"* warning was kept **byte-identical**
  > — the warning is the durable part, and the contradiction is proof of why it exists.
- **`[FU-FOUNDING-FLAG-NOT-WIRED-TO-MONTHLY-INLINE]` — STILL OPEN, STILL A HARD GATE.** Its
  authoritative body is in `NEXT_ACTION.md` (landed as #567) and is **deliberately not duplicated
  here.** ⚠ **Do NOT set `FOUNDING_OFFER_OPEN = false` until the MONTHLY-INLINE lane has landed.**
  ★ **A second, independent way it fires was found while writing it:** `pricing.ts`'s own doc comment
  on `MONTHLY_INLINE` asserts *"this one line is the entire switch"*, and **that is false** —
  `pricing.guard.test.ts` pins the binding, so the one-line change goes red. **An incorrect in-code
  instruction, on the very constant, read at exactly the moment someone is closing the cohort under
  time pressure.**
- **`[FU-DEPLOY-FROM-STALE-CHECKOUT]` — CARRIED, CONFIRMED, and now joined by a sibling.** Its body is
  in the Wave 3 section and is not duplicated. ★ **The two-word difference between `"skipping
  upload"` and `"uploading rules"` is the whole signal** — *"skipping upload" on a file you just
  changed is evidence of the opposite of success.* Before any deploy: `git pull`, **grep the local
  file for the expected new content**, then verify in the Firebase Console afterwards.
  ⚠ **The sibling is this wave's force push:** the same shared checkout, the same class of confident
  wrong result, one layer up. **NEVER READ OR PUSH FROM `C:\Projects\Lazytopper-Production`.**
- **`[FU-GUARD-1-C]` (agent3_uiux_guard wired nowhere), `[FU-GUARD-3-POLICY-MODES-UNASSERTED]`
  (`infra` and `apiServer` asserted by nothing), `[FU-GUARD-3-MOJIBAKE-REGEX-DUP]`
  (`mojibake_acceptance.mjs` duplicates the checker's regex and the two can diverge silently),
  `[FU-GUARD-3-CWD-FRAMED-GATES]` (9 gates framed on `process.cwd()`, correct only because
  `pnpm --filter` sets it — latent, not active), `[FU-GUARD-3-MOJIBAKE-CLEANER-FRAME]`
  (`ops/mojibake_cleaner.mjs` cannot see `handoff/`, so a "0 fixed" result from it is a FALSE zero),
  `[FU-GUARD-2-TOPOLICYFRAME-COPY]`, `[FU-GUARD-2-PKGJSON-CLASSIFY-NONDETERMINISM]`,
  `[FU-GUARD-2-ROOT-GITIGNORE-UNCHECKED]` (the boundary suite still reads only
  `lazytopper/.gitignore` — ★ *the same cwd blind spot, one layer down, inside the suite built to
  catch it*), `[FU-GUARD-2-MATRIX-CHAIN-MASKS-DOWNSTREAM]` (the two new suites sit in an `&&` chain
  where one red guard masks ~19 downstream suites)** — **ALL STILL LIVE AND UNASSIGNED.** Bodies as
  previously recorded; none is reconstructed here.

---

### ★ TWO METHOD RULES THIS WAVE ADDED TO THIS BOARD

- ★★ **A CORRECT OUTCOME REACHED BY A FALSE PREMISE STILL POISONS THE RECORD.** Twice: the "dead"
  Home search box **was not dead** (it opened a working CommandPalette — the ruling survived on the
  better ground the subagent supplied itself, that the palette **returns no topic, chapter or
  question**, so the placeholder *"Search topics, chapters, questions…"* **is a control that lies
  about what it returns**); and the P0 chain's link 2 named `trialStartMs` when the sentinel never
  reaches it, **so a fix written to the brief's line would have gone in the wrong file.**
  ⇒ **the wrong reason is what a later lane inherits.**
- ★★ **A CONTROLLER AMPLIFIES.** A subagent's minor, explicitly out-of-allowlist side finding became
  the headline **and** a mutation requirement that would have broken a **working** metric. **A
  finding the controller has restated is harder to reject than one reported raw.** ⇒ **pass findings
  through with provenance intact** — *"the subagent reports X"* is not the claim *"X"* — **and when
  one is retracted, check whether the amplified version reached the repo, the state file, or a
  dispatched instruction.** *(Checked here: it reached none of them.)*

---

## 2026-07-29 — Post-Wave-3 (#557–#563, four lanes). Trunk `25e995a7`.

> **★ PROVENANCE WARNING FOR THIS WHOLE SECTION.** The harness blocked **every** subagent this wave from writing report files to disk. Each lane's report in `C:\Users\Chetan\OneDrive\Desktop\diff\` was **captured verbatim by the controller from the subagent's return message**. **EV-1's lane has no report at all** — `handoff/WAVE_STATE_WAVE3_ARCHIVE.md` is its only record, and it is committed with this handoff. ⚠ **It is committed under the ARCHIVE name deliberately.** The controller's live state file is `handoff/WAVE_STATE.md`, which is **untracked scratch memory, now holding WAVE 4**, and its own header says it *“must never appear in a product PR.”* The bytes committed here are the Wave 3 file, verified **md5-identical** to the controller's own `WAVE_STATE_WAVE3_ARCHIVE.md`. Bodies below are copied, never reconstructed. Where a body could not be found it says so and says where the search ran.
>
> **★ Standing Rule 3 of this board is observed:** dated entries above are **not** rewritten to match today's facts. Corrections, closures and amendments to older entries are recorded **here**, in this section.

### ★★ FIVE DOCTRINE RULES ADDED BY THIS WAVE — read before the entries

```
★ 1 · A GUARD'S OUTPUT MUST NAME ITS SUBJECT, NOT JUST ITS VERDICT. (GUARD-1,
verbatim.) Every check states what it inspected — which files, which patterns,
how many times each fired — and any check whose subject count or match count is
ZERO is a FAILURE, never a pass. "Nothing to object to" and "nothing looked at"
are the same output otherwise, and a guard is a device for telling those two
apart.
  · A guard may not verify itself against its own input. `classified ===
    all.length` proves nothing when the bug shrank `all`. Self-checks need truth
    from OUTSIDE the thing under test.
  · Coverage is proven by the negative case. A green run establishes only that
    the guard did not object. Ship the mutation that makes it red, or the guard
    is decorative.
  · A guard nothing runs is not a guard. Reachability is part of the check, not
    packaging around it.
One line: A CHECK THAT CANNOT BE SHOWN TO HAVE LOOKED, AND TO BE CAPABLE OF
FAILING, IS NOT COVERAGE — IT IS THE APPEARANCE OF COVERAGE, WHICH IS WORSE,
BECAUSE IT STOPS ANYONE LOOKING.

★ 2 · MUTATION-VERIFY THE SPEC, NOT ONLY THE CODE. Three specs this wave
proposed a fix that did nothing. Each was caught by running the battery against
the PROPOSAL. All three were the spec author's own and all three were
self-reported.

★ 3 · A VERIFICATION COMMAND NEEDS ITS OWN CONTROL. Run it against a case you
KNOW matches before trusting an empty result. An empty result from an
unvalidated command is not evidence of absence — it is no evidence at all.
(`node --test` prints the invocation and the result on DIFFERENT LINES, so any
filter demanding both on one line matches zero.)

★ 4 · A ROLLBACK ARTEFACT MUST BE PROVEN TO CONTAIN THE OLD STATE. Grep it for
the thing you are about to add; if the pattern is present, you backed up the
wrong version. Git is a better source than the working tree, because the working
tree may already have moved.

★ 5 · TIGHTENING A WRITE RULE BREAKS EVERY OVER-SENDING WRITER, SILENTLY.
Before changing what a store accepts, enumerate every writer and check what each
ACTUALLY SENDS — not what it is supposed to send. A spread into a payload sends
fields nobody listed.
```

**Also in force, restated because each was earned again this wave:** *a mutation that does not go red is first a claim about the MUTATION, not about the test*; *a CI run id is bound to a COMMIT, not a PR*; *never reconstruct an FU body from its ID*; *cite by quote or symbol, never by line number alone*; *write specs against the breakpoint, not against a width grid*; *a deadness analysis that enumerates only the fixtures you expected is not an enumeration*; *a number that agrees with itself is not a measurement*; *relay evidence between lanes, never relay it as settled*.

---

### ★★ SIX PROPOSED MECHANISMS PROVEN INERT — the count DERIVED, not carried

**How this figure was reached, because a count carried forward is exactly the kind of derived value this board keeps catching.** An intermediate spec in this wave said **"five"**. C2's report called its own instance **"the fourth this wave"** without enumerating the other three. **Neither figure can be reconciled against the evidence, so both are recorded and neither is used.** The enumeration below is built from the lane reports and the Wave 3 state file (committed here as `WAVE_STATE_WAVE3_ARCHIVE.md`), each with the evidence that proved the mechanism inert.

| # | the proposed mechanism | evidence | whose |
|---|---|---|---|
| 1 | the SEC-1 spec's §3 Firestore rules fix | mutation 2 (`nested-noop`) applied it verbatim on the real emulator: `# pass 6 # fail 8`, **byte-identical to the permissive-rule run**, same eight assertions; it did not even stop a `tier:"premium"` write to the parent doc | spec author's own, self-reported |
| 2 | the GUARD-1 spec's literal remedy (re-frame the `git diff --name-only` calls) | `git diff --name-only` is root-relative from any cwd and was **already fixed** under `[D47]`/`[D41]`, with comments saying so; only `git ls-files --others` is cwd-scoped. *"A green suite over an open hole."* | spec author's own, self-reported |
| 3 | the C2 spec's §2 mutation target (tightening the schema reddens C1's §5) | under mutation 1 **every C1 §5 test stayed green** — that harness mocks `callGemini`, and §5 pins the **parser**, which a schema change cannot affect | spec author's own, self-reported |
| 4 | the cofounder's own verification command | two piped `Select-String`s requiring the **same LINE** to match both an invocation and a result pattern — impossible; it returned empty and read as evidence that C2's suites had not run. **They had.** | spec author's own, self-reported |
| 5 | the owner's rollback backup | taken *after* the merge was pulled, so it contained the NEW rules; proven by grepping it for the thing about to be added | owner's, caught pre-deploy |
| 6 | the first `firestore:rules` deploy | `"latest version already up to date, skipping upload"` then `"Deploy complete!"` — six-commit-stale rules re-shipped, production unchanged | operational |

★ **1–4 are proposals; 5–6 are an artefact and an operation.** They are one failure class — *something that reports success while inspecting or changing nothing* — and separating them by category would hide that. **The count of proposals alone is four; the count of the class is six.**

---

### ★★ CORRECTIONS OWED TO THE WRITTEN RECORD — because the wave's standard applies to its own record

**1 · The cost-analysis line.** `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` attributed **“$2.95 / 48%”** to `responseSchema`. **Not supportable** — the dominant parse-miss cause is **truncation at `maxOutputTokens`**, which constrained decoding does not prevent; the saving is the **shape-variance share only, and it is unquantified**. **Corrected in that file in this PR**, with the row struck rather than deleted so the change is visible to anyone who cited it. ★ **In the same breath: the QUALITY argument stands and is the sound reason #559 shipped** — it is now verified rather than argued. → `[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]`, and `[FU-C2-PARSE-MISS-NOT-COUNTED]` as the prerequisite metric.

**2 · A diffstat in a captured report was wrong by one, in its prose.** The SEC-2 report records `useSubscription.autotrial.test.ts` as **`+11/-3`**. **Verified against trunk `25e995a7`:** `git show --numstat` gives **`9  2`** — **9 added, 2 deleted.** The `+11` agrees with the `11 +-` shortstat total; **the deletion count was off by one in the report's prose only.** The file's *content* was untouched by the error, and the deviation itself was approved on its merits. Recorded because *a number in a report is a claim, and this board's own rule is that a wrong entry is harder to detect than a missing one.*

**3 · The cofounder's own verification command could not fire.** Two piped `Select-String`s requiring the **same LINE** to match both an invocation pattern and a result pattern — impossible. It returned empty and looked like evidence that C2's suites had not run. **They had.** `node --test` prints the invocation and the result on **different lines**; use two separate greps, or `-Context`. ⇒ **A verification command needs its own control: run it against a case you know matches before trusting an empty result.** *Authored while writing the doctrine against exactly this.*

**4 · And one from this handoff lane itself.** Writing the `[FU-MOJIBAKE-GATE-CWD-BLIND-SPOT]` entry, this lane reproduced the mojibake sequence **literally** as an illustration — which would have committed the very defect the FU describes into the repo. Caught by scanning its **own added lines** with the gate's regex rather than trusting the gate's green exit code, and replaced with a codepoint description. ⇒ **the check that catches you is the one you run over what you actually wrote.**

### RESOLVED / CLOSED THIS WAVE

- **`[FU-EFF-RESPONSE-SCHEMA]` → CLOSED by #559.** Three schemas, not one. ⚠ **Its cost justification does not survive** — see `[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]`. The **quality** argument is what carried it, and it is now **verified rather than argued** by the owner's live-verify of the null-`mistakeType` path.
- **`[FU-DEAD-AI-LEARNING-PATH]` → CLOSED by #562.** Owner ruling: **delete the AI path**; `WeakAreaPracticePage` calls the local `generateLearningPath` directly. Rejected alternatives: repointing to `/api/tutor` (a different contract, real integration work for a feature nobody asked for) and leave-and-document (wastes a request per click).
  ⚠ **TWO BODIES EXISTED FOR THIS ID, AND ONE CONTAINED A CLAIM THE OWNER CORRECTED.** A payload body carried a `NOTE:` sentence asserting that **`callMentor` had a second LIVE caller in `DailyMixPage`**. **That sentence is FALSE and is deliberately NOT carried here.** `DailyMixPage` is **RETIRED** — `/daily-mix` is severed in App.tsx's SEVER-PR block with no `<Route>`, and every navigation to it originates in `Dashboard.tsx` / `DailyMixPreview`, themselves retired. Verified independently by D2 at trunk. The two bodies were **not merged**; the dated entry above is left as written per Standing Rule 3.
  ✔ **One genuinely new observation from that payload is worth keeping:** the only surviving reference to `/api/mentor` anywhere is `artifacts/api-server/src/routes/admin.ts` → `callGateway("/api/mentor/cache-stats")`, an **admin telemetry proxy, not the generation endpoint**.
  ⇒ **After #562, `callMentor` + `MENTOR_ENDPOINT` are fully orphaned** (`callMentor`'s only remaining caller is dead code) — a dead-code sweep for a later lane. ⚠ **`scripts/ops/llm_path_audit_acceptance.mjs` is CI-gated** and requires `rg("generateMoreLikeThis|MENTOR_ENDPOINT") > 0`; safe today because `generateMoreLikeThis` is live and carries the check alone. **The sweep may delete `MENTOR_ENDPOINT` — but must not delete both.**
- **`[FU-LOGIN-STALE-RECAPTCHA-COMMENTS]` → CLOSED by #562 (D2c).** The count of **two** was exact. Both sat in `pages/Login.tsx` and both asserted an unconditional rebuild: above `handleResendOtp` (*"the prior invisible verifier is spent, so AuthContext rebuilds a fresh one inside sendPhoneOtp"*) and above the phone-tab warm `useEffect` (*"sendPhoneOtp rebuilds a fresh verifier each time"*). **False since PR-F1/B3.** AuthContext's own comment above `recaptchaContainerIdRef` states the real contract: tracking the container id *"lets `initPhoneRecaptcha` distinguish genuine reuse (same container, still on screen — which must NOT rebuild) from a stale widget (which must)."* ⚠ **The older entry's `:1149`/`:1172` citations were line references — a derived value nothing re-checks. Anchor by the two symbols above instead.**
- **`[FU-HOME-FABRICATED-SOCIAL-PROOF]`, `[FU-JSONLD-OFFER-SHAPE]`, `[FU-HOME-TSX-DEAD-FILE]` → DISCHARGED by #562** — `lazytopper/src/pages/Home.tsx` is deleted, and with it the JSON-LD `aggregateRating`, the "12,800+ students" prose and the offer shape.
- **`[FU-RETIRE-LEGACY-HOME]` → DISCHARGED by #562** (opened and closed inside this wave; body below for the record).
- **`[FU-SEC1-SCOPEGUARD-NO-FIRESTORE-LANE]` → CLOSED by #560** — the `firestore` lane exists; SEC-2 confirmed `firestore.rules` classifies as `[firestore]`, not `[unclassified]`.
- **`[FU-SEC1-SCOPEGUARD-UNTRACKED-BLINDSPOT]` → CLOSED by #560** — all enumerations now run from `GIT_ROOT`; mutation-verified RED.
- **`[FU-SEC1-CI-LOCKFILE]` → CLOSED by #561** — the owner approved the subagent's recommended shape: `pnpm-lock.yaml` **plus a dedicated emulator step in `quality-gate.yml`**, and explicitly **not** chained into `scripts/` `test:matrix:all`, which would couple an emulator dependency into the content-guard suite.
- **`[FU-SEC1-EMULATOR-LOG-UNIGNORED]` → CLOSED by #561** — `firestore-debug.log` is in `.gitignore`.
- **`[FU-SEC1-LOCALSTORAGE-PREMIUM]` (Route B) → CLOSED by #563.** localStorage is now a **cache**, never a grant.
- **`[FU-TRIAL-ENDDATE-CLIENT-FORGEABLE]` / `[FU-SEC1-TRIAL-SELF-EXTEND]` (Route C) → CLOSED by #563.** PR-1 had pinned Route C as an explicit **labelled characterisation test** asserting it was open; #563 inverted that test, exactly as it instructed.
- **`[FU-SUBSCRIPTION-CLIENT-WRITABLE]` → CLOSED across #561 + #563** (Firestore half then client half). ⚠ **Neither PR alone closed it, and saying otherwise would have been false at the time.**
- **`[FU-C2-MISTAKETYPE-NULL-LIVE-VERIFY]` → CLOSED.** The owner graded a real answer on production, then a **fully correct** one specifically to exercise the null path: full marks, **no spurious mistake type**.

**⚠ NOT CLOSED, and the distinction matters:** `[FU-VERIFY-UID-ON-AI-ENDPOINTS]`'s remaining half. **The API server checks rate limits, not plan.** After this wave paid features are protected **in the UI** — a real improvement, and **not** the claim "paid features are protected."

---

### ★★ NEW — the deploy layer, which sits below every gate this project owns

**`[FU-DEPLOY-FROM-STALE-CHECKOUT]`** — ★★ **carried verbatim from the Wave 3 state file (`WAVE_STATE_WAVE3_ARCHIVE.md`, committed here).**
```
[FU-DEPLOY-FROM-STALE-CHECKOUT] — CONFIRMED, not hypothetical. On 2026-07-29 a
firestore:rules deploy run from C:\Projects\Lazytopper-Production redeployed rules
six commits stale (checkout at 47d765db, trunk at 6bb5bb4f) and printed "latest
version already up to date, skipping upload" followed by "Deploy complete!". The
security fix was NOT in production despite a successful-looking deploy.
RULE: before any deploy, `git pull` and GREP THE LOCAL FILE for the expected new
content. "Deploy complete" is not evidence; "skipping upload" on a file you just
changed is evidence of the opposite. Verify in the Firebase Console afterwards —
it is the only authority on what is enforcing.
Fourth instance of the shared checkout producing a confident wrong result.
```
★★ **The two-word difference between `skipping upload` and `uploading rules` is the whole signal.** `6bb5bb4f` above is **#561's own merge commit**: the deploy ran minutes after the merge, from a checkout that had never seen it. The successful re-deploy printed **`uploading rules`**.

**The exact procedure, third time of asking:**
```
1. git pull   in whatever checkout you deploy from
2. GREP the local firestore.rules for the expected new content
   (this wave: `trialStartImmutable` AND `allow delete: if false`)
3. npx firebase-tools deploy --only firestore:rules --project lazzyy-topper
4. Confirm "uploading rules", NOT "skipping upload"
5. Read the deployed rules in the FIREBASE CONSOLE, not the repo file
```
★ **Step 2 is not optional.** ★ **Rollback path, know it BEFORE deploying:** Firebase Console → Firestore → Rules → the version dropdown; a previous ruleset republishes in one click. If trial activation breaks after a deploy, **that is the immediate action, not a hotfix PR.**

**`[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE]`** — ★★ **carried verbatim.**
```
[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE] — firestore.rules is the clearest case but not
the only one: nothing in CI can observe what is actually deployed. A merged rules
file, a Railway env var, a Firebase console setting — all of them can diverge from
trunk silently and indefinitely. The stale-checkout deploy above was invisible to
every gate this project has, and would have stayed invisible until an auditor or a
student found it. Any lane whose outcome depends on a deploy must carry an explicit
OWNER-ACTION line in its report AND must not be closed in WAVE_STATE.md until the
owner confirms the deployed state, not the merged state.
```

---

### ★★ NEW — GUARD-1 (bodies from `report-guard1-scope-blind-spot-2026-07-29.md`)

**`[FU-GUARD-1-A]`** *(High)* — `repo_boundary_acceptance.mjs`: enumerate from git root; import `classifyFile` instead of the drifted private copy; wire into matrix.
**Supporting evidence, carried with the id:** it runs `git ls-files` with `cwd=lazytopper/` — **auditing 1 of 13 top-level trees** — *and* keeps a private **stale copy** of `classifyFile` still missing `apiServer`/`docs`. **Either bug alone shows red; the blind spot masked the stale copy**, and it reported green on a policy it never fully evaluated. Also absent from `test:matrix:all`. It was **RED on trunk (2 failed/5)**; #560 took it to 5/5 with an in-allowlist fix, but the cwd scoping and the duplicated classifier remain.

**`[FU-GUARD-1-B]`** *(High)* — wire `scope_guard_blindspot_acceptance.mjs` into `test:matrix:all`/CI — needs `lazytopper/package.json`, outside GUARD-1's allowlist.
★★ **GUARD-1's protections are real but UNENFORCED until this lands** — an instance of its own doctrine. **Proven, not asserted:** grepping #560's 4,076-line CI log for `blindspot|repo_boundary|agent3_uiux|scopeGuard|scope:guard` returns **0 matches** — CI executed **none** of the five changed files.

**`[FU-GUARD-1-C]`** *(Medium)* — agent3: re-point or retire the three rotted checks + the zero-passing ceiling, then wire green.
**⚠ Spec correction carried with it:** `agent3_uiux_guard` was **never "silently passing."** It exits 1 and scored **3/7 on trunk** — now 4/8. **The silence is that nothing runs it**: RED and unread through three redesigns. Its new zero-match meta-assertion immediately caught a live one — `trends_cta_pressure_within_contract` asserts `count <= 12` and was **passing with count = 0**, a ceiling check passing on nothing.

**`[FU-GUARD-1-D]`** *(Medium, latent)* — frame collision: root vs `lazytopper/` paths are indistinguishable after `toPolicyFrame` for `docs/`, `scripts/`, `package.json`, `tsconfig.json`, `.github/`, `pnpm-lock.yaml`. **Those six classify correctly by accident.** Needs frame-tagged rules.

**`[FU-GUARD-1-E]`** — `scope:guard` stays out of CI by design (CLAUDE.md §6a); the new acceptance suite has no such limit and would have caught this.

**`[FU-MOJIBAKE-GATE-CWD-BLIND-SPOT]`** — ★★ **NEW, found by the handoff lane itself. The SAME cwd blind spot GUARD-1 fixed in `scope:guard`, still live in `check:mojibake`.** `lazytopper/scripts/check-mojibake.cjs` sets `repoRoot = path.resolve(__dirname, '..')` — i.e. `lazytopper/` — and enumerates with `execSync('git ls-files', { cwd: repoRoot })`. **It therefore cannot see any file outside `lazytopper/`.** Measured at trunk `25e995a7`: the gate enumerates **1,379** tracked files, of which **ZERO** are under `handoff/`, while the repo has **1,712** tracked files and **20** markdown files in `handoff/` alone. **333 tracked files — every handoff document, every root config, and all of `scripts/`, `artifacts/`, `firestore-rules-tests/` and `lib/` — are outside its reach, and it reports PASS.**
**This is not theoretical: there IS mojibake in `handoff/CURRENT_STATE.md` today** — the classic UTF-8-read-as-CP1252 em-dash sequence (codepoints U+00E2 U+20AC U+201D) runs through the old “Previously (post-PR #2xx…)” lines, far below the current sections, **and the gate has been green over it for months.** *(The sequence is described by codepoint rather than reproduced: writing the example into the repo would itself be the defect — this lane caught itself doing exactly that and removed it before committing.)* ⚠ **Consequence for any docs lane: a green `check:mojibake` is not evidence about a `handoff/` file.** This lane therefore ran the gate’s own regex directly over its **1,029 added lines** plus all **1,011 lines of the committed Wave 3 state archive** — **0 hits, with a control string proving the regex fires** — because *a check that cannot be shown to have looked is not coverage*. **Distinct from `[FU-MOJIBAKE-GATE-MISSES-PUA]`, which is about the PATTERN; this is about the SCOPE.** Fix: enumerate from the git root, and print an `inspected=` count so a zero-subject run cannot read as a pass.

**`[FU-GITIGNORE-SHADOWS-TRACKED-POLICY]`** — `lazytopper/docs/project_memory/` is matched by root `.gitignore`, so plain `git add <path>` **refuses `repo_boundary_policy.json` even though the file is tracked**. `git add -u` works (ignore rules do not apply to tracked paths). **Pre-existing, not introduced by GUARD-1. This will bite the next agent who edits the boundary policy** — and it fails as a **refusal**, which at least is loud, unlike the silent class this wave has been chasing.

---

### ★★ NEW — the entitlement lanes (SEC-1-REV #561, SEC-2 #563)

**`[FU-SEC1-USERS-COLLECTION-DENIED]`** — ★ **OPEN.**
```
[FU-SEC1-USERS-COLLECTION-DENIED] — `users/{uid}` has no rule; writes always silently denied.
```
**Supporting evidence:** `users/{uid}` has **no rule at all** ⇒ `ensureLearnerAccountMetadata` writes have **always been silently denied**, swallowed by a bare `catch {}`. Found while answering the spec's "where else?"; reported and deliberately not fixed.

**`[FU-SEC1-DAILY-QUOTA-LOCALSTORAGE]`** — ★ **OPEN.**
```
[FU-SEC1-DAILY-QUOTA-LOCALSTORAGE] — free daily quota is localStorage-only; no rule can gate it.
```

**`[FU-PREMIUMSINCE-UNREAD]`** — ★ **OPEN (low).** `premiumSince` is read by **no production code**, only test fixtures, so the rule deliberately does not constrain it — constraining it adds breakage risk and zero security.

**`[FU-SEC1-LOCALSTORAGE-PREMIUM]`** — **CLOSED by #563**, body kept because the reasoning outlives the fix:
```
[FU-SEC1-LOCALSTORAGE-PREMIUM] — ★★ the lane's stated goal is NOT met by the rules fix
alone; premium is still self-grantable via localStorage. Needs a D-lane PR.
```
**Supporting evidence:** `loadSubscription` read **localStorage first**; `hydrateSubscriptionFromCloud` overrode it **only when a cloud doc existed**. A student with **no** subscription document who set `lazytopper.subscription.v1:<uid>` to `{tier:"premium"}` got premium UI **with Firestore never consulted.**

**`[FU-SEC1-CI-LOCKFILE]`** — **CLOSED by #561**, body kept:
```
[FU-SEC1-CI-LOCKFILE] — the rules test cannot reach CI without `pnpm-lock.yaml`.
```
**Supporting evidence:** the emulator **can** run in CI (`ubuntu-latest` ships a JVM; `firebase-tools` was already a root devDep). **The blocker was never the emulator** — it was `@firebase/rules-unit-testing`, which requires `pnpm-lock.yaml`, outside the then-allowlist, and CI's `--frozen-lockfile` hard-fails without it. The subagent stopped rather than ship the test unwired, which would have been the silent-skip failure the lane exists to prevent.

**`[FU-SEC1-TRIAL-SELF-EXTEND]`** — **SUPERSEDED and CLOSED by #563**, body kept:
```
[FU-SEC1-TRIAL-SELF-EXTEND] — `trialEndDate` is an ISO string; a rules-level bound is awkward.
Logged deliberately, not attempted.
```
⇒ The resolution was not to bound it but to **remove it**: *storing `trialEndDate` at all was the defect.* Rules cannot parse an ISO string, which is why every attempt to *validate* the stored date fails.

**`[FU-TRIAL-ENDDATE-CLIENT-FORGEABLE]`** — **Route C. CLOSED by #563.** `isPremiumAccess()` returned true for `tier:"trial"` exactly as for `"premium"` (surfaced as `isPremium` at **40 sites**), and `trialEndDate` was a client-supplied ISO **string** that `applyExpiry` trusted: `{tier:"trial", plan:"trial_7day", trialEndDate:"3000-01-01"}` bought permanent premium-equivalent access. **Proven green on the real emulator (assertion 8)** before it was closed. ⚠ **`isPremiumAccess` was deliberately NOT changed** — a trial granting premium is the product design (a 7-day full trial) and is correct; the defect was that the trial's **LENGTH** was forgeable.

**★★ The design principle to keep, verbatim:**
> **ENTITLEMENT MUST DERIVE FROM DATA THE CLIENT CANNOT FORGE.**
> - `tier:"premium"` → **Admin SDK only**
> - `tier:"trial"` → the **START** is a server timestamp the rules pin to `request.time`; the **DURATION** is a constant in code; therefore **the END is DERIVED — never stored, never trusted**
> - `localStorage` → a **cache**, never a grant

**★★ And pinning the start is not sufficient alone.** If the client may write `trialStartDate == request.time` *whenever it likes*, a student re-triggers it daily and holds an infinite trial. So: **create** must equal `request.time`; **update** must equal the **existing** value; **delete DENIED**, or a student deletes the doc and re-creates to reset the clock. All three emulator-proven.

**★ The Console read-back is the proof, and the type difference IS the fix:**
```
trialStartDate:  July 29, 2026 at 10:46:51 PM UTC+5:30   ← TIMESTAMP
updatedAt:       "2026-07-29T17:16:52.809Z"              ← string, quoted
```
`trialStartDate` is a real **server-set Timestamp the rules can pin**; `updatedAt` beside it is still a quoted string, which is exactly what a client-forgeable field looks like. **There is no `trialEndDate` field at all.**

**★ Decisions inside SEC-2 worth keeping:**
- **The field is `trialStartDate`, not `trialStartedAt`.** Renaming would have forced edits outside the allowlist. **The security property is that the start is server-set and immutable; its name is not load-bearing.**
- **The `trialEndDate` slot was KEPT on the type (`@deprecated`)** — deleting it breaks compilation of two out-of-allowlist test files. Removed from every read and write, **and** the rules additionally forbid introducing or moving it. Belt-and-braces because *"the field being unread is a property of code that a future regression can undo silently, whereas the rule is enforced server-side."*
- **`pricing.ts` is NOT the right home for `TRIAL_DAYS`** — it is the pricing *display* surface, pinned by `pricing.guard.test.ts`, and outside the allowlist. The constant stays beside the only code that derives an expiry from it.
- **`loadCloud` returns `error`, not `absent`, when `firestoreDb` is null.** *"Absent is a positive claim and must never be inferred from a read that never ran."*
- **The pre-hydration flash is a decision, not an accident.** `loadSubscription` stays synchronous and cache-first, so a forged localStorage entitlement **is** briefly visible before hydration. Test 7 pins it in **both** directions and the cache is **evicted** so the flash cannot recur. The alternative — everyone starts free — blanks real subscribers on every mount and breaks the offline case. ★ Hydration on `absent` writes **nothing** to the cloud: *"uploading the cache would launder a forgery into the record of truth."*
- **⚠ Migration: PARTIAL VERIFICATION, declared rather than papered over.** Production documents could not be enumerated without Console or Admin credentials, and **no claim was made about a check that was not run.** What *was* verified: `subscriptionService.ts` is the **sole writer** to `subscriptions` anywhere in the repo.
- **⚠ Mutation contamination, self-reported:** three rules variants also drop the `trialEndDate` clause, so test 13 reddens under them too — *"contamination, not evidence."* Each clause is pinned by the tests only it breaks.
- **★ Premium is activated MANUALLY VIA THE FIREBASE CONSOLE** — the Admin SDK path, which bypasses rules entirely. So the rules change cannot break activation, and **any client-written premium is by definition forged.** That answer is what removed the migration risk.

---

### ★★ NEW — C2 (bodies from `report-c2-response-schema-2026-07-29.md`)

**`[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]`** — ★ **OPEN, and it corrects a number written elsewhere as fact.** The dominant parse-miss cause documented in the grader itself is **truncation at `maxOutputTokens`**, which constrained decoding **does not prevent**. #559 can only reduce the **shape-variance** share. ⇒ **the `$2.95 / 48%` line in `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` is NOT validated by #559** and must not be cited as if it were. **That line is corrected in this handoff PR.** ★ **The QUALITY argument stands and is the sound reason #559 shipped** — and it is now verified rather than argued.

**`[FU-C2-PARSE-MISS-NOT-COUNTED]`** — ★★ **OPEN. A PREREQUISITE, NOT A NICE-TO-HAVE.** `retryCount` ← `gemini_tokens.retry.<class>` ← `attempts > 1`, and `telemetryAttempts` is scoped **inside** a single `callGemini` (429 / mime / fallback only). **The grader's parse-miss retry is a SECOND `callGemini` invocation**, so it emits two records each `attempts:1, retry:false`. **A before/after read will show no signal whatever happens.** ⇒ **No before/after claim about parse misses can be honest until that metric exists.** The subagent correctly did not add the counter (its spec said report, don't tune).

**★ The C2 parser contract, kept because the executable form does not carry the reasoning.** `checkSolution.test.cjs` §5 *is* this contract in code; the *why* exists only here.
- **Structurally required:** top-level `annotatedSteps`; per-step `description` (a description-less step is **dropped with its marks**, so requiring it protects marks).
- **Must be NULLABLE:** `mistakeType` and `correctedWorking`. **Grading rules 4, 5, 6 and 7 all *require* `null`** — a non-nullable enum would forbid the null and thereby **CONSTRAIN THE MARKING ITSELF**. `mistakeType` therefore carries **no enum at all**: the parser already enforces the four values, so an enum buys zero while risking the null path.
- **Free:** the step **COUNT**. A schema pinning a fixed count would trade grading quality for output format.
- **Conditional:** the detect-only fields exist **only** when `autoDetect` is on; one fixed schema marking them required would force meaningless values on the trusted-marks path.
- **★★ THREE schemas, not one — and C1's "two, not one" was still one short.** The three parsers gate on different top-level keys and **fail differently**. **Schema C (worksheet) deliberately does NOT require `annotatedSteps`** — a `couldNotRead:true` entry legitimately has none, and **reusing Schema A there would have forced the model to fabricate steps for an unreadable answer**: a CLAUDE.md §5 "no invented content" breach shipped as a performance optimisation.
- **`tutor.cjs` deliberately left unconstrained.** It sends no `responseMimeType`, its reply is consumed as **prose**, and its only structure is sentinels *stripped by regex*. Constraining it would mean deriving a schema from the prompt (forbidden), flattening teaching prose into a JSON string, and breaking both extractors. It has no parse-miss retry to fix.

---

### ★★ NEW — the cost / model entries (Lane C)

> ⚠ **PROVENANCE, PRESERVED DELIBERATELY.** Three of the four bodies below were reported as **`BODY NOT FOUND`** by the handoff-prep pass: their source file, `AGENT_C_Wave3_server.md`, **does not exist on disk** (searched `Desktop/**`, `Downloads` and the git index) and the ids appear **zero times on trunk**. It **correctly refused to reconstruct them.** They were later **transcribed verbatim** from a copy of that spec supplied in-session, into `C:\Users\Chetan\OneDrive\Desktop\diff\LANE_C_FU_BODIES-2026-07-29.md`. **Transcription, not reconstruction.** ⚠ **If a copy of `AGENT_C_Wave3_server.md` ever turns up on disk, that file wins** — a transcription is a derived artefact.

```
[FU-EFF-THINKING-BUDGET] — ★ NOW THE TOP COST LEVER, MEASURED. First production
telemetry (2026-07-28, n=2 vision calls, NOT a distribution):
  vision  2 calls · prompt 4,932 · candidates 1,408 · thoughts 9,961 · 48,928ms
  practice 2 calls · prompt 2,754 · candidates  250 · thoughts     0
Thinking is 87% of vision output tokens and ~24.5 SECONDS per grade. It is both
the largest cost lever AND a latency fix. Rates CONFIRMED from Google's pricing
page: gemini-2.5-flash $0.30 input / $2.50 output, header states "Output price
(including thinking tokens)". Measured $0.0150/vision call.
→ DO NOT set a budget from n=2. Needs a week of real student data, then p90 PER
MARKS BAND — a 5-mark long answer and a 1-mark MCQ are different distributions,
and one global budget would strangle the former or leave the latter untouched.
→ Counters are per-process and reset on redeploy, so a "week" only accrues if
nothing ships. Capture a reading before each merge.

[FU-FLEX-TIER-UNUSABLE] — Gemini's Flex tier is 50% off but targets 1-15 MINUTE
latency and is sheddable (503/429 under load, no server-side fallback). Every paid
call in this product is student-facing, so Flex is not usable. Batch API is also
50% off but asynchronous up to 24h — same conclusion. Recorded so nobody
rediscovers the discount and misses the latency.

[FU-MODEL-SWITCH-NOT-A-LEVER] — Newer Flash models are MORE expensive
(3.6-flash $7.50 output, 3.5-flash $9.00 vs our $2.50). The Flash-Lite line is
cheaper because it is weaker — Google describes it as for "simple data
processing". The grader reads handwritten maths and awards step-marks; that is
not simple data processing. No model switch. GEMINI_TUTOR_MODEL is already a
separate env var if the tutor is ever A/B'd.

[FU-2.5-FLASH-DEPRECATION-UNVERIFIED] — an earlier claim that gemini-2.5-flash
retires 2026-10-16 could NOT be confirmed: the pricing page carries deprecation
warnings for 2.0 Flash and 2.0 Flash-Lite but NOT for 2.5 Flash. Verify against
the deprecations page before that date drives any roadmap decision.
```

**★ THREE AMENDMENTS OWED TO `[FU-EFF-THINKING-BUDGET]`'s OLDER BOARD ENTRY** — recorded here, not by editing the dated entry (Standing Rule 3):
1. **Its gate is LIFTED.** `[FU-TELEMETRY-NO-READ-PATH]` was resolved in #549 and the owner has taken a real read-out. **It is no longer blocked on a read path; it is blocked only on SAMPLE SIZE.**
2. **The owner re-ranked it.** *"Thinking is 87.6% of vision output tokens and 24.5 seconds per grade. That makes `[FU-EFF-THINKING-BUDGET]` both the largest cost lever AND a latency fix — it OUTRANKS `responseSchema`, which was previously ranked above it."*
3. **C1 located the spend precisely.** The grading call (`gradingGenConfig` in `handleCheckSolution`) **sets no thinking cap at all** — dynamic and uncapped. *"That is where the measured ~4,980 thought-tokens and ~24.5 s per vision grade are being spent. The test now records this as deliberate, so a future budget is a conscious change rather than an accident."*
⚠ The older entry's *"only one call sets a budget (checkSolution.cjs:600…)"* is a **line citation**. **Anchor it by symbol instead: `handleDetectQuestion` / `thinkingConfig: { thinkingBudget: 0 }`.**

**★ FIRST MEASURED COST DATA — owner live-verify 2026-07-28. It was NOT in the repo before this handoff.** One owner curl of `GET /api/admin/token-telemetry` after the Wave 2 deploy. **n = 2 vision calls, 2 practice calls, ONE session.**
```
vision    2 calls · prompt 4,932 · candidates 1,408 · thoughts 9,961 · 48,928 ms
practice  2 calls · prompt 2,754 · candidates   250 · thoughts     0
anonKey   client 0 / loopback 0     (across four SIGNED-IN calls)

per call, derived:
vision    prompt 2,466 · candidates 704 · thoughts 4,980 · 24.46 s   ~= $0.0150
practice  prompt 1,377 · candidates 125 · thoughts     0             ~= $0.00073
```
Measured $0.0150/vision call against the $0.0130 estimate ⇒ **the model is ~15% pessimistic, not wrong.** ★ **It also validates #537's billing-bucket decision with data** — the comment justifying moving detect-question out of `vision` estimated *"about $0.001 against ~$0.013 for a grade"*; measured, **$0.00073 vs $0.0150** — and `thoughts: 0` on practice **independently confirms detect-question really does run at `thinkingBudget: 0`.**

**⚠ DO NOT SET A THINKING BUDGET FROM THIS SAMPLE — owner ruling, verbatim:**
> Two calls from one session is one paper, one student, one difficulty band. Thinking tokens on a grader should scale with how much working there is to follow, so the variance that matters is exactly what a single session cannot show. A week of data, then **p90 — and p90 PER MARKS-BAND**, since a 5-mark long answer and a 1-mark MCQ are not the same distribution. Grading genuinely needs reasoning; the lever is to bound it, not remove it.

⚠ **UNVERIFIED at the time of the Wave-2 reading:** Google's per-token rates were not checked against the live price list. *(Lane C's `[FU-EFF-THINKING-BUDGET]` body above records them as subsequently **CONFIRMED** from the pricing page — $0.30 input / $2.50 output, header stating "Output price (including thinking tokens)". The two statements are kept side by side rather than merged, because they were made at different times with different evidence.)*

---

### ★★ NEW — Lane D research (bodies from `LANE_D_FU_PAYLOAD-2026-07-29.md`, verbatim)

**`[FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY]`** — ★★ **THIS ENTRY EXISTS TO CURE A DANGLING CITATION.** The id appears on trunk in exactly one place — a source comment in `lazytopper/src/components/auth/LinkPhoneNudge.tsx` (the `landingMemory →` line in its header block) — **while the board had no such entry.** A merged source file was citing an FU that did not exist. Verified again at trunk `25e995a7`: one hit, that file only.
```
[FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY] — ★ NEW, found in Lane D research.
`lib/desktop/landingMemory.ts` `hasProfileFlag()` reads the BARE localStorage keys
"lazytopper.profile.v2" and "lazytopper.profile". Nothing writes them: studentCloudStore
writes only the uid-suffixed "lazytopper.profile.v2:<uid>" via localProfileKey(uid).
`hasProfile` is therefore PERMANENTLY FALSE, and the module's own doc comment
("presence indicates the user has been here before") is a CLAIM, not a fact.

This is the identical dead-key defect already cured in pages/Login.tsx and closed as
[FU-LOGIN-HASPROFILE-DEAD-KEY] — the cure was never propagated to landingMemory.ts.

BLAST RADIUS IS SMALL BUT REAL: hasProfile is the third disjunct of
`hasMeaningfulMemory` (`if (memory.hasProfile) return true`) and the third branch of
`resolveResumeRoute`. Both are consumed by DesktopHome AND MobileHome. Today a
returning student whose ONLY trace is a profile gets the first-time-visitor layout.
Fixing it is a behaviour CHANGE on two live Home pages, so it needs its own scoped PR
with screenshots — NOT a drive-by inside the nudge PR.

★ DOCTRINE: this is the second instance of the same bug class in one codebase. A
uid-suffixed key read without its suffix fails SILENTLY as "false", never as an error,
so no gate can see it. Any future `getItem("lazytopper.<x>")` on a key that
studentCloudStore/studentDataService namespaces per-uid deserves the same audit.
```

**`[FU-NO-RETURNING-SESSION-SIGNAL]`** — ★ **NEW, and NOT closed by #557.**
```
[FU-NO-RETURNING-SESSION-SIGNAL] — ★ NEW. The product has NO returning-visit signal.
The three plausible candidates are dead (landingMemory.hasProfile), orphaned by a
retired page (lazytopper.firstVisitOverlayShown, written only by the severed
pages/Dashboard.tsx), or an ACTIVITY signal the owner explicitly excluded
(lazytopper.studySessions). AuthUser does not carry Firebase's metadata.creationTime /
lastSignInTime either. Any future feature gated on "has returned" — not just the phone
nudge — has to add this. Recommend it be added ONCE, as a shared helper, rather than
per-feature.
```
⚠ **Status:** #557 added a *local* signal for its own use only (`lazytopper.homeVisits.v1` + `lazytopper.homeVisit.counted.v1`, living inside `LinkPhoneNudge.tsx`). **The FU is therefore NOT closed** — it asks for a shared helper, and what shipped is per-feature. ★ Also rejected during that research: Firebase `metadata.lastSignInTime`, because **persisted sessions freeze it at `creationTime` forever** → a silent never-fires, and `mapFirebaseUser` does not map it anyway.

**`[FU-RETIRE-LEGACY-HOME]`** — **DISCHARGED by #562**; body kept because the *defusal proof* is the reusable part.
```
[FU-RETIRE-LEGACY-HOME] — pages/Home.tsx (LEGACY-RETIRED 2026-06-08, zero product
importers, unrouted) publishes FABRICATED social proof: JSON-LD aggregateRating
ratingValue "4.8" / reviewCount "2340" (:284-287), "12,800+ students" (:377, :600) and
"from 2,340+ student reviews" (:498). CLAUDE.md §5 violation; as structured data it is
exposed to Google's fabricated-review policy (penalty = manual action). Inert only while
unrouted — exactly as the ₹149 price was inert until it wasn't.

★ THE OPS-FIXTURE PIN IS REAL AND THE SPEC'S WARNING WAS CORRECT.
`lazytopper/scripts/ops/agent3_uiux_guard.mjs` reads it in the
`homepage_marketing_positioning` check:
    has("src/pages/Home.tsx", /human-grade|human tutor|predictive/i) &&
      has("src/pages/Home.tsx", /Class 10|CBSE/i)
`has()` calls `read()` = bare `readFileSync`, with NO existence guard. Deleting Home.tsx
makes the whole script THROW ENOENT, not merely fail one check.

★★ BUT TWO FACTS DEFUSE IT, BOTH VERIFIED:
  1. THE CHECK ALREADY FAILS TODAY. Home.tsx matches the second pattern 12 times but the
     FIRST pattern ZERO times (`grep -cE "human-grade|human tutor|predictive"` → 0), so
     the `&&` is already false. The guard is asserting a property the file lost.
  2. THE SCRIPT IS NOT A GATE. `test:agent3:uiux` exists in lazytopper/package.json but
     is absent from `test:matrix:all` (18 sub-scripts, enumerated — it is not among them)
     and appears in NO workflow file. Repo-wide grep for "agent3_uiux_guard" returns only
     its own package.json script entry and its own source. Nothing in CI runs it.
  So deleting Home.tsx turns an ALREADY-FAILING check in an UNWIRED script into a
  crashing UNWIRED script. No gate goes red either way.

⚠ LANE COLLISION: repairing the guard means editing `lazytopper/scripts/ops/…`, which is
outside Lane D's allowlist AND inside Agent C's declared lane (`scripts/ops/`). Escalated
to the owner rather than resolved unilaterally.
```
⚠ **The "nothing goes red either way" conclusion was TRUE of the ops fixtures and FALSE of the wider tree** — see `[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]` and D2's `pricing.guard.test.ts` finding below. **A deadness analysis that enumerates only the fixtures you expected is not an enumeration.**
★ **Owner's added finding, standing:** an ops guard whose pattern matches **zero** times has been silently passing on nothing — **third instance of the class in one week**. **Any such repair must include a "this pattern matched at least once" assertion**, or the fix restores a guard that still cannot fail. #560 added exactly that meta-assertion, and it caught a live one on its first run.

---

### ★★ NEW — D2 and EV-1

**`[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]`** — ★ **OPEN, handed to GUARD-1's successor.** `lazytopper/scripts/ops/ux_focus_acceptance.mjs` reads the now-deleted `src/pages/Home.tsx` via a bare `readText` with **no existence guard**, so the script throws. **GUARD-1 fixed one fixture, not both** — corroborated independently by this board, which already named **both** files in an older entry. **Impact today: zero** — no npm script, no workflow, no invoker anywhere; its three Home checks are now unfixable by construction. Recommend the same treatment `agent3_uiux_guard.mjs` got — delete the dead Home checks and add the zero-match assertion — **or delete the script, since nothing can run it.**

**`[FU-ENTITLEMENT-GATE-MATCHES-STRING-LITERALS]`** — ★ **OPEN.** `entitlementGating.test.ts` builds `new RegExp('from\\s+["\'][^"\']*' + basename + '["\']')` and tests it against **raw file text**, so it matches a module path inside a **string literal or a comment**, not just a real import. It flagged D2's new test **twice** for `TopicHubHome`: once from a fixture string, **then again from the comment explaining the first.** Fix: match only genuine import/`from` statements, and anchor the basename at a path boundary (`/` or start) so `PracticePage` cannot match `WeakAreaPracticePage`. **Blast radius: every future test that quotes a module path.**

**`[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`** — ★ **OPEN. THE ONE LIVE-VERIFY THIS WAVE STILL OWES.**
```
[FU-D1-PROVIDERIDS-UNPROVEN-LIVE] — the nudge's phone-linked suppression path is proven
by unit test and by seeded session, never against a real Firebase phone-linked account.
```
**Supporting evidence:** `providerIds` came from a **seeded local session**, not Firebase server truth — Firestore returned `Missing or insufficient permissions` throughout, as expected. The render path, copy and responsive layout are faithfully exercised; **`hasPhoneLinked` against a real phone-linked Firebase account is unproven by picture** and rests on the 14 unit tests.

**`[FU-HOME-BREAKPOINT-EXCLUSIVITY]`** — ★ **NEW (EV-1).**
```
[FU-HOME-BREAKPOINT-EXCLUSIVITY] — DesktopHome and MobileHome are mutually unreachable
across the 1024px boundary by redirect. Any future "both Home pages at width W" requirement is
unsatisfiable for half its cells; write specs against the breakpoint, not against a grid.
```
**Supporting evidence:** `useIsDesktop` is `(min-width:1024px)`; below 1024 `/` redirects to `/browse`, at ≥1024 `/browse` redirects to `/`. **Proven by live redirect probes, not by reading code.** The spec's 12-cell screenshot matrix **was never satisfiable**; 8 shots were captured instead — the 6 real cells plus DesktopHome @1440 present/dismissed, recovering the desktop coverage the matrix loses.

**★ EV-1's other two corrections, recorded because their only home was a report that was never written:**
- **A CI RUN ID IS BOUND TO A COMMIT, NOT TO A PR.** The run handed to EV-1 for #558 (`30417690715`) ran commit `06692469`; the branch then took trunk-merge commit `24883eca`. EV-1 pulled `30418065085` on the real head. **Had it trusted the assigned run, the merged head would have been unverified.**
- **The auto-sign-in hazard is DEV-SERVER-ONLY.** `shouldAutoAnonBootstrap()` requires `import.meta.env.DEV`, **false on a Vercel production build**; the auto-created local user would be ineligible anyway (`isLocalSession: true`). The standing note **does not generalise to previews**.

---

### ★★ CARRIED FORWARD FROM WAVE 2 — it existed ONLY in a handover file and in PR bodies

> Wave 2's handover said it plainly: *"Both Wave 3 findings above, plus the standing rule in §5, exist ONLY here and in the PR bodies. Whoever writes the next handoff must carry them."* **If this section is omitted they are lost.** They are recorded here for the first time.

**★ THE STANDING RULE — owner-approved for the top of this board, drafted and committed nowhere until now. Verbatim:**
> **★ THE ALARMING READING IS OFTEN AVAILABLE AND WRONG — VERIFY THE STATE BEFORE YOU NAME THE FAILURE.** Two instances in one wave, pointing in opposite directions:
> · **Don't claim a bug that isn't there.** `repo_boundary_policy.json` lists `"_handoff/"` and no such directory exists — a perfect match for the stale-reference class we had just spent a day naming. It sits among `_debug_bundle/`, `_codex_output/`, `_rollback/`, all underscore-prefixed scratch dirs, so it is most likely deliberate and unrelated. Recorded as an unverified observation, not a finding.
> · **Don't claim a collision that already resolved.** Going to merge the handoff PR, trunk had moved AND the new commit touched all seven of its files — the exact shape of the stale-base clobber. It was that PR itself, already merged; the overlap was its own content.
> Both are the same discipline: **pattern-matching to a failure mode you have recently learned is when you are most likely to file a false one.** Check the state — the PR's, the file's, the directory's — before writing the finding down. **A wrong entry on this board is harder to detect than a missing one, because it gets cited.**

**★ #555 — the verified-uid safety property, and it is the whole design.**
> It is tempting to treat "token missing or invalid" as "not signed in". **The anonymous hard cap is 3/day**, so an expired token, clock skew, a transient firebase-admin failure or an unconfigured deploy would drop a real signed-in student into the anonymous bucket — precisely the defect #552 fixed, re-entering through the back door and visible only to whoever was unlucky. So `verifiedCaller` **never** decides a caller is anonymous: it returns a uid or `""`, and `resolveCaller` falls back to the header exactly as before. **The change can only TIGHTEN identity, never shrink a real allowance.** Mutation-proven RED.

*Why the await is at the edge and not in `check()`:* verification is async; the limiter is a synchronous pure function with **27 existing tests calling `check()` directly**. `verifiedUid` is an optional **third** parameter and the await lives in `index.cjs`, already async. All 27 pass untouched. *Diagnostic:* `rate_limit.uid_source.{verified,header,unverified}`, surfaced as `rateLimit.uidSource` and **pinned by tests** — *"I initially added the counter without a read-out test, which is the silent-no-op class, and fixed it."*

**★ #556 — `[D47]` scope:guard lanes: TWO no-op traps, one of them the agent's own.**
- *"Add a lane to `repo_boundary_policy.json`"* **alone classifies nothing** — `classifyFile` consults lanes **by name**. Mutation-proven: JSON present, `classifyFile` lines removed, the target file still `[unclassified]`.
- **The first fix then looked right and was not:** `changedLanes` was **hardcoded** to `["product","trackedTooling"]`, so a lane wired into `classifyFile` was **classified but never enforced** — bucketed, never compared, and the run printed OK. **"The control case caught it, reading the code did not."**
⇒ **Adding a lane is a THREE-PART change: policy JSON → `classifyFile` → `laneBuckets`.**
★ **`docs` is deliberately NOT in `mixed`** — CLAUDE.md §8 requires product PRs to carry zero handoff changes, and folding it in would silently retire that rule. Verified: a handoff file makes `--mode mixed` FAIL with `[docs] handoff/CURRENT_STATE.md`.
⚠ **GOTCHA:** `repo_boundary_policy.json` is TRACKED but sits under a gitignored directory, so plain `git add` refuses it — **use `git add -f`** (or `git add -u`). This silently aborted a commit attempt once: the `&&` chain short-circuited and only the push ran, leaving the branch at base with no commit.

**★ Wave 2 design decisions — *"the why is the part that dies otherwise"*:** `"*"` and not `true` for the no-Origin CORS case (with no origin to reflect, `true` emits **no header at all** — byte-identical to a refusal, so the rule would have been unobservable and therefore untestable); **HSTS off**, because the Vercel rewrite is a pass-through and helmet 8.3.0's `max-age=31536000; includeSubDomains` would pin the apex **and every subdomain** client-side, unreversible by deploy; **CSP off** because it is **inert bytes on a JSON response** — no document is served from that service; a **`FORBIDDEN(path)` loop rather than only fixing two strings**, filesystem-only, *"because the failure it guards is itself a silent-skip failure — a guard that can skip cannot guard against skipping"*; the anon-key emit **inside `rateLimiter.check()`** because anywhere else is a **mirror of `resolveCaller`, and a mirror drifts while still looking right**.

**★ CORS live-verify PASSED in production, and it resolves an open question rather than leaving it owed:** grades render on `www.lazytopper.com` and on the Vercel preview; **`.in` REDIRECTS to `.com`, so it never issues API calls under its own origin — CORS for `.in` is structurally moot.** The COOP console warnings observed are **not helmet** — the HAR shows `apis.google.com` and `fonts.gstatic.com`, Google's own OAuth infrastructure. Helmet's COOP does reach `/api/*` responses and survives the proxy, but **it is inert there: COOP governs browsing contexts and a JSON response has none.** No action.

---

### ⚠ UNCOMMITTED ARTEFACTS ON DISK THAT ARE NOT IN GIT

- **D1's screenshots** — `C:\Users\Chetan\OneDrive\Desktop\diff\screenshots-D1-2026-07-29\`, 8 PNGs + 2 metadata JSON.
- **The lane reports** — `report-{sec1rev,guard1,c2,d2,sec2}-*.md` and the source pack in the same directory. They are the only copies of several findings above.
- **A `@rollup/rollup-win32-x64-msvc` binary** hand-dropped into a worktree's `node_modules` to make vitest run on Windows (`npm pack @rollup/rollup-win32-x64-msvc@4.59.0`, then copy `package.json` + the `.node` file into `<worktree>/node_modules/.pnpm/rollup@<v>/node_modules/@rollup/rollup-win32-x64-msvc/`). Untracked, inside `node_modules`, invisible to git. **Do NOT commit it.**
- **The abandoned SEC-1 worktree** at `C:/Projects/LT-worktrees/wave3-sec1` — superseded, not rebased; **do not merge it.** Its value is the *proof its own fix was inert*, which is recorded above.

---

## 2026-07-26 -- #538–#540 (LANE H): 1 FU tombstoned, 15 opened — the efficiency/pricing tier, the auth-email tier, and a guard-coverage tier (trunk `1013daa7`)

### RESOLVED — tombstoned
- **`[FU-AUTH-NO-PASSWORD-RESET]`** (implicit; never formally opened, closed here for the record) → #538. Password recovery exists, is enumeration-safe, and is **owner live-verified end to end**. This was the last code-side launch blocker.

## 2026-07-28 — Post-Wave-2 (#546–#552, lanes A + B). Trunk `e8b15735`.

### ★★ THREE DOCTRINE RULES ADDED BY THIS WAVE — read before the entries

```
★ A LINE REFERENCE IS A DERIVED VALUE THAT NOTHING RE-CHECKS. Cite by quoting
the code or naming the symbol, never by line number alone — in comments, in FU
entries, and in specs. Three times this wave a citation went stale, once because
the citing agent itself moved the line:
  1. #548 moved a PricingPage comment :52-53 -> :59-60; A3's doc comment cited it
     by line and would have shipped stale ON ARRIVAL. Caught pre-commit and
     rewritten to quote the rule instead.
  2. The owner cited the gateway CORS allowlist at index.cjs:291; A3 ITSELF moved
     it to :312 by inserting lines above.
  3. Three different counts circulated for one thing in #552 — the owner's "ten",
     the module's own comment "nine", and the measured 11 invocations across 6
     files — INCLUDING one inside the PR that created it.
Record structure, not counts: "identity is centralised in paidCallHeaders /
paidJsonHeaders", with any count stamped as measured-at-a-SHA.

★ AN FU BODY MUST NEVER BE RECONSTRUCTED FROM ITS ID. When three owed FU texts
could not be found on disk, they were left marked "TEXT OWED" rather than
inferred from their titles. This is the product's anti-fabrication rule applied
to the record itself: A PLAUSIBLE-BUT-WRONG FU IS HARDER TO DETECT THAN A
MISSING ONE — a missing one is obviously missing, while a confident wrong one
gets cited. Pairs with Standing Rule 1 above ("a record that is only REFERENCED
is not a record").

★ AN FU ABOUT A CROSS-CUTTING CONCERN IS NOT CLOSED UNTIL EVERY CALL SITE IS
CHECKED. "Fixed where it was found" is not fixed. [FU-XUSERID-PROXY-STRIP]
logged this class in July, was fixed in dbSyncService ONLY, and was closed — and
came back as the [FU-CLIENT-NEVER-SENDS-UID-HEADER] launch blocker.
```

### RESOLVED by this wave

```
[FU-TELEMETRY-NO-READ-PATH] — CLOSED by #549. snapshot() and getTokenTelemetry()
had NO caller anywhere in the repo; #540 measured into a void from the day it
merged. GET /api/admin/token-telemetry now serves per-call-class prompt /
candidates / thoughts / total token counts, call, retry and fallback counts,
plus the rate-limiter counters INCLUDING anonKey. Admin-gated
(ADMIN_FIREBASE_UIDS Bearer), fail-closed, read-only. The efficiency tier is
UNBLOCKED. The first real reading belongs in
handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md, which is where the estimates
it replaces currently live.

[FU-API-CORS-WIDE-OPEN] — CLOSED by #546. artifacts/api-server/src/app.ts was a
bare app.use(cors()) in front of both entry points on the service Railway runs.
Now an allowlist from CORS_ALLOWED_ORIGINS, plus helmet (CSP off — it governs
nothing when no document is served here; HSTS off — measured at a FULL YEAR with
includeSubDomains, pinnable onto the apex domain through the Vercel rewrite).
A MISSING Origin is allowed unconditionally; only a present-but-disallowed one
is refused, via cb(null,false) and never cb(new Error()).

[FU-CLIENT-NEVER-SENDS-UID-HEADER] — RESOLVED by #552 (CLIENT HALF ONLY).
LIVE-VERIFY STILL OWED, and no gate can see it: curl /api/admin/token-telemetry
after deploy and confirm rateLimit.byClass shows the call under its real class
and anonKey.client does NOT increment for a signed-in user.

[FU-GATE-BLAST-RADIUS] — CLOSED by the guard in #545, recorded for the
reasoning. Wrapping a default export in RequirePremium/RequireAuth changes what
EVERY existing test rendering it does. Signed-out tests hit the gate's
<Navigate>, loop SYNCHRONOUSLY inside MemoryRouter, and die at the heap ceiling
— no timeout fires because the event loop never yields, and CI shows an OOM with
no assertion and NO FILE NAME. Cost half a day. entitlementGating.test.ts now
names any offender in ~30ms. Router files excluded: they gate ROUTES, not their
own default export.

[FU-SIGNUP-NO-NAME] — RESOLVED by #550. The field is REQUIRED on the
email/password path (Google supplies displayName itself and is unchanged).
One-way door: accounts created BEFORE #550 have no displayName and fall back to
the raw email across App.tsx:793, DesktopShell:188/:190,
MobileAccountMenu:56/:57, DashboardHeader:27, ShareProgressPrompt:86.

[FU-SIGNUP-NO-PHONE-OPTION] — RESOLVED by #551. Phone OTP was LIVE at
Login.tsx:1152/:1198/:1226 -> sendPhoneOtp:975 but unreachable from /sign-up.
Technically met, practically broken.

[FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD] — RESOLVED by #551, and note HOW:
WITHOUT adding a context key, because AuthContext.passwordReset.test.tsx asserts
the context key set by EXACT EQUALITY and therefore fails on ADDITION. Fixed by
re-syncing the mapped user after updateProfile resolves, using existing state
and existing imports.
```

### OPEN — top of the queue

```
[FU-VITEST-CI-HEAP-CEILING] — ★ OWNER RULING 2026-07-27: STAYS OPEN, and it is
the TOP NEXT_ACTION item after Wave 3. MEASURED, recorded so nobody re-measures.
Bank-importing suites cost a PERMANENT ~160MB step per worker; heap is
cumulative and never returns to baseline. Baseline 13-20MB. The nine suites,
every path verified to exist at trunk:
    src/services/quickPracticeSessionService.test.ts          177MB (first jump, from 15MB)
    src/data/bankQuery.test.ts                                161MB
    src/services/checkImproveGradeService.test.ts             172MB
    src/components/worksheet/worksheetModel.topickey.test.ts  171MB
    src/components/results/scorecardVariants.test.ts          185MB
    src/components/practice/QuickPracticePresets.test.tsx     234MB
    src/components/worksheet/WorksheetGenerator.mi.test.tsx   251MB
    src/pages/PracticePage.refreshSet.test.tsx                277MB
    src/pages/PracticePage.freshSet.test.tsx                  292MB  <- peak
★ The OOM was NOT heap size — peak is 292MB and 4 workers is ~1.1GB. 6144 made
V8 lazy about GC, so four workers each willing to reach 6GB exhausted a 16GB
runner. The WORKER CAP fixed it. Now maxWorkers:2 + 2048 + timeout-minutes:20
(#545). DURABLE FIX STILL OPEN: mock or lazy-load the bank in those nine suites
— `collect` is 227s of a 189s wall time, so module loading dominates. That
restores 4-worker parallelism and ~2-minute gates, and it pays for itself every
cycle. The bank grows with every content lane and phase 2 adds state boards and
Class 12, so today's settings are a RUNWAY EXTENSION, not a fix.
Size at wave close, for comparison: 83 files / 960 tests, ~154s.

[FU-VERIFY-UID-ON-AI-ENDPOINTS] — OPEN, SERVER HALF, and it is now cheap.
resolveCaller (server/services/rateLimiter.cjs) still trusts a client-supplied
string. #552 sends Authorization: Bearer alongside the uid header at every paid
call site, so the server can derive the uid from the VERIFIED token with NO
further client change. Until it does, the uid is spoofable — the same v1 terms
the existing XFF comment already accepts. TOP OF WAVE 3'S SERVER LANE.

[FU-PRICING-FOUNDING-COHORT] — ★ A PUBLISHED PROMISE THE PRODUCT CANNOT ENFORCE.
List Rs 999/mo and Rs 8,999/yr published from day one; founding Rs 599/mo and
Rs 5,999/yr for the first 200 students, rate locked while subscribed.
Provisional pending the cost accountant's model; analysis at
handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md. NEEDS: a mechanism to count
and close the founding cohort at 200 — currently MANUAL, and NOTHING in the
product counts subscribers or flips the offer off. This is an OPEN COMMITMENT,
not a nice-to-have: the promise is published and the product cannot keep it.

[FU-PAID-CALLERS-BEYOND-AICLIENT] — The paid endpoints are called from SIX
client files, not one. aiClient.ts has six paid fetch sites; tutorClient.ts is
the LIVE TUTOR; plus VisualExplainer.tsx, QuestionVisualAid.tsx and both /admin
diagram pages. Any future header/auth change to "the AI client" must cover every
site. #552's coverage guard now enforces this from PAID_ENDPOINTS on disk.
(Count stamped measured-at-a-SHA: 11 invocations across 6 files at #552's head.
Prefer the STRUCTURE — identity is centralised in paidCallHeaders /
paidJsonHeaders — over the number.)

[FU-ADMIN-GATE-DUPLICATED] — NEW, from #549. The fail-closed
requireFirebaseAdmin now exists in TWO places — routes/adminSolutionCache.cjs
and routes/adminTelemetry.cjs — behaviourally identical (same statuses, same
order, same messages). Duplicating a security check is a real hazard: one gets
fixed, the other does not. Deliberately NOT unified in #549, because that means
editing a live, reviewed admin path in a PR about telemetry. Own small PR.

[FU-CI-COMMENT-STALE-MATRIX-COUNT] — NEW. .github/workflows/quality-gate.yml:78
reads "Root guard matrix: 5 suites, 175/175". It is SIX suites and 190 checks,
measured on three separate runs this wave. Left out of the Wave-2 docs PR on
purpose — a workflow YAML is config, and a docs-only PR must carry zero
config/product changes. One-line fix, own PR. (CLAUDE.md's matching "5-suite"
wording IS corrected in the docs PR, CLAUDE.md being documentation.)

[FU-DBSYNC-COMMENT-MISATTRIBUTED] — dbSyncService.ts:15-18 blames the
Vercel->Railway rewrite for dropping X-User-ID. It is OUR OWN api-server:
artifacts/api-server/src/app.ts lists `x-user-id` in STRIPPED_PROXY_HEADERS
because it is a privileged server-set header. The Authorization fallback works;
the X-User-ID fallback is dead in production BY OUR OWN DESIGN. Correct the
comment — a wrong reason in a comment misleads the next reader, and it did.

[FU-LOGIN-STALE-RECAPTCHA-COMMENTS] — Login.tsx:1149 and :1172 claim sendPhoneOtp
"rebuilds a fresh verifier each time". False, and contradicted by AuthContext's
own comment. Left alone (out of B3's allowlist).

[FU-PHONE-SIGNUP-NO-NAME] — Phone sign-up does not collect a name; setting one
would mean touching verifyPhoneOtp, frozen so the sign-in path stays identical.
A nameless phone user renders as "Student"/"S" with the phone number as
sub-label — honest, not an email leak. Later shape: an OPTIONAL trailing
displayName? on verifyPhoneOtp; Login calling it with one argument stays
byte-identical.

[FU-ANNUAL-PRICE-ROSE-POST-539] — #539 (2026-07-26 23:30 IST) published
Rs 4,999/board year; founding is Rs 5,999 — a Rs 1,000 rise ~24h later. No
payment rail, so nobody transacted. Owner ruled: fix the SENTENCE, not the price.
The public claim is now scoped to an ACTIVE SUBSCRIPTION and a guard fails on
eight overbroad phrasings. Do NOT reintroduce "we do not raise anyone's price".

[FU-HOME-JSONLD-NOT-LIVE] — Home.tsx is UNROUTED (zero product importers; the
live landing page is Welcome.tsx, which publishes no price and no JSON-LD). So
the product currently ships NO price structured data a crawler can reach. The
Home Offer graph maintained across #539 and #548 is drift-hygiene, not SEO. If
rich results are wanted the graph must move to PricingPage.tsx (routed) or
Welcome.tsx (GLOBALLY FORBIDDEN — needs its own scoped lane).

[FU-RETIRED-PRICE-LIST-COLLIDES-WITH-LIST-PRICE] — Home.priceConsistency.test.tsx
pinned "999" in a RETIRED-price denylist added by #539, which retired it. Rs 999
is now the LIST price, so the guard went red on CORRECT behaviour. Class of bug:
a denylist of retired values is a liability once pricing is reversible. Prefer
asserting the current published set (allowlist) over absent old ones (denylist).
Same allowlist-over-denylist rule as Lane H's enumeration defence.

[FU-USER-PROGRESS-503] — LOW (owner-downgraded 2026-07-27). /api/user/progress
503s in production; userProgress.cjs needs Postgres and there is no DATABASE_URL.
The 503 is DELIBERATE — the file documents "Gracefully returns 503 when
DATABASE_URL is not configured". dbSyncService is self-described fire-and-forget
("All write functions are silent... so they never block or crash the app").
Firestore (sessionRecords/{uid}/records/{id}) is the durable store; Postgres is a
third mirror that fails silently by design. NO DATA LOSS.
THE ONE UNVERIFIED BOUND, and the first thing that lane checks: does Firestore
cover EVERY field dbSyncService syncs — XP, streak, focus, mastery, mission?
That answer decides "delete as dead code" vs "finish it". Note that restoreFromDB,
awaited once at login to hydrate localStorage, currently gets nothing.
```

### DOCTRINE — two corrected rules for the next agent

```
[FU-TYPECHECK-TEST-SEPARATE-GATE] — `tsc -p tsconfig.app.json --noEmit` (the
command in CLAUDE.md §6) EXCLUDES test files. CI runs a SECOND, independent step
`pnpm --filter lazytopper run typecheck:test` (tsconfig.test.json). A type error
in any .test.tsx is GREEN locally and RED in CI. BOTH configs belong in every
agent's local set. Cost a red run on #550: `vi.fn(async () => {})` types
mock.calls[0] as the EMPTY TUPLE, so calls[0][2] is TS2493. Type mock functions
to the REAL signature — it fixes the typing AND makes arity part of the
assertion. SUPERSEDES an earlier note claiming "nothing typechecks test files"
— an agent's own memory is a derived value that outlives its facts too.

[FU-IMPORT-EDGE-NEEDS-THE-ROOT-MATRIX] — owner-corrected rule, SUPERSEDES
"matrices are CI-only" as an absolute. Full matrices stay in CI (the reason was
OOM from parallel FULL-matrix runs, not single suites). BUT when a change adds a
NEW IMPORT EDGE into lazytopper/src/, run the ONE root-matrix suite covering the
touched area locally first — it costs seconds and is the only gate that can see
an import edge. AN IMPORT GRAPH IS NOT VISIBLE IN A DIFF.
Cost a red run on #552: paidCallHeaders.ts statically imported firebaseClient,
which reads import.meta.env at module scope; that put it on aiClient's graph, and
aiClient is reachable from code the root matrix runs under plain Node via tsx.
Three unrelated subtests in scripts/src/practiceSetGeneratorGuard.test.ts died
with "Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')".
Fix: lazy `await import(...)` + a regression guard asserting it STAYS lazy.
```

### ★ THE WAVE'S STRONGEST FINDING — keep verbatim

```
A FIX THAT CANNOT BE SHOWN TO CHANGE BEHAVIOUR IS NOT A FIX.

The B3 brief prescribed "use a distinct container id for the sign-up reCAPTCHA".
That would have done NOTHING. initPhoneRecaptcha early-returned on
`if (recaptchaVerifierRef.current)` and IGNORED the container-id argument
entirely, so a second page passing a different id changed nothing at all.

Mutation proof, reverting to the old early-return with 'lt-signup-recaptcha'
requested:

  x REBUILDS when a different container is requested (the /login -> /sign-up walk)
    -> expected [ 'lt-login-recaptcha' ]
       to deeply equal [ 'lt-login-recaptcha', 'lt-signup-recaptcha' ]
  x REBUILDS when the same container id was remounted (stale element)
    -> expected [ 'lt-signup-recaptcha' ]
       to deeply equal [ 'lt-signup-recaptcha', 'lt-signup-recaptcha' ]

The REAL mechanism: resetPhone runs only on verify-success, logout and provider
unmount — never on navigation — so walking /login -> /sign-up leaves a live
verifier bound to a container that has since unmounted. Reuse is now conditional
on the container being BOTH the one requested AND still attached.
```

### STRUCTURAL — record prominently

```
[D47] + [D41] — ★ scope:guard has NO `artifacts/**` lane at all. A grep for
"artifacts" in lazytopper/scripts/scopeGuard.mjs returns ZERO hits, so EVERY PR
touching artifacts/ fails as `[unclassified] -> SCOPE_GUARD_FAIL`. #546 hit this.
It is NOT a breach — verify the boundary by hand and say so in the report. Until
D47 lands, the next agent should not spend a cycle rediscovering it. D47's own
instruction: fix it in its own small gated PR (add an `apiServer` lane to
repo_boundary_policy.json); do NOT fold it into a docs PR.

★ THE SAME GAP HITS EVERY DOCS-ONLY PR, including this one. `repo_boundary_policy.json`
declares four lanes — product, trackedTooling, generatedEvidence, localOnly — all
anchored to the `lazytopper/` frame. The real `handoff/` directory and root-level
`CLAUDE.md` are modelled by NONE of them, so a docs handoff reports
`[unclassified] -> SCOPE_GUARD_FAIL` for all seven of its files. Expected, not a
breach; the boundary was verified by hand instead (zero product files in the diff).
Whoever picks up D47 should add a docs lane in the same PR.
UNVERIFIED OBSERVATION, flagged rather than claimed: generatedEvidence lists
`"_handoff/"` with a LEADING UNDERSCORE, and no such directory exists. It sits among
`_debug_bundle/`, `_handover_evidence/`, `_codex_output/`, `_rollback/` — all
underscore-prefixed scratch dirs — so it is most likely a deliberate entry for a
generated directory and NOT a typo for `handoff/`. Worth one owner glance while D47
is open; do not assume either way.

★ THE MAIN CHECKOUT GOES STALE AND WILL PRODUCE CONFIDENT FALSE REPORTS.
C:\Projects\Lazytopper-Production sat 12 PRs behind trunk during this wave.
Grepping handoff files there produced an apparent "#541's docs content was lost"
— it was present at trunk all along; `git log -- <path>` there also silently
omits newer commits. Read via `git show <trunk-sha>:<path>` or from a fresh
worktree. Same lesson as the earlier false "the gate is a no-op" report, now hit
on DOCS as well as product files.
```

### ★★ EFFICIENCY / PRICING TIER — these reference a document that is now IN THE REPO
`handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` is committed alongside this update. The `[FU-EFF-*]` entries below reference conclusions that live **only** in that document — the per-call cost model, the ranked levers, the margin table, and the reasoning for why `maxOutputTokens` must **not** be lowered. Without it they are unactionable.

```
[FU-EFF-INSTRUMENTATION] — SHIPPED in H-1 (#540). Logs promptTokenCount,
candidatesTokenCount, thoughtsTokenCount, totalTokenCount and a retry flag
per call class. PREREQUISITE for all thinking-budget work: every cost figure
in LazyTopper_Cost_Pricing_Analysis_v1_1.md is an ESTIMATE from prompt
structure, not a measurement. NOTE: the original text cited the v1.0
filename (2026-07-25); v1.1 supersedes it and is the one in the repo.
Blocked from being useful by [FU-TELEMETRY-NO-READ-PATH] below.

>>> CLOSED 2026-08-05 (Wave 5D). THIS ENTRY IS WRONG AND THE WORK WAS ALREADY DONE. <<<
  responseSchema SHIPPED in #559 (PR-C2), BEFORE this entry was written. Verified
  independently on trunk 51f7712 by a read-only scout, chain quoted at every hop:
  GRADE_/DETECT_/WORKSHEET_RESPONSE_SCHEMA defined at :167/:212/:266, WIRED into the
  request config at :595/:888/:1385, reaching the wire at geminiClient.cjs:392.
  callGemini has exactly THREE call sites in that file and EVERY ONE carries a schema.
  18 contract tests: one asserts it is SENT, one that the RETRY carries it, one that it
  reaches the OUTGOING REQUEST BODY. mistakeType is nullable with no enum, so null stays
  reachable. Control run first: the same search found responseMimeType at :588/:883/:1384.
  ★ HOW THE ERROR HAPPENED: responseMimeType was read as present WITHOUT a schema and
  "not shipped" inferred - ONE LINE READ, TWELVE UNREAD. It cost a spec error and a scout.
  ★ "MI is built on noise" is RETIRED. Grading output has been CONSTRAINED since #559.
  The wrong claim had reached THREE documents; the retraction travels as far as it did.
  Also stale in this entry: "Touches checkSolution.cjs, which is FORBIDDEN-listed" - that
  ban was lifted in Wave 3 PR-C1 and no gate has listed it since (FORBID-5 proved it with
  a control). And the :301 line reference has drifted.
  ⚠ WHAT REMAINS REAL, as a NEW FU: [FU-GRADER-SCHEMA-STRIP-RETRY-SILENT].
  Struck, not deleted, per the precedent at LazyTopper_Cost_Pricing_Analysis_v1_1.md:105-110.
>>> END CLOSED BANNER - the original entry follows, retained for anyone who cited it. <<<

[FU-EFF-RESPONSE-SCHEMA] — Gemini responseSchema (constrained decoding) is
used NOWHERE; only responseMimeType:'application/json', which ASKS for JSON
rather than constraining it. That is why the once-retry at
checkSolution.cjs:301 exists. A schema makes malformed output impossible.
→ Quality: this is the fix for [FU-GRADING-RELIABILITY] /
[FU-GRADE-CONSISTENCY] — one output shape every time, so MI stops being
built on noise. Highest quality-per-rupee item on the board. Touches
checkSolution.cjs, which is FORBIDDEN-listed; needs the same deliberate
amendment as the batching lane.
  ★ CORRECTED ON RECORD: the entry as originally drafted justified itself
  with "mentorResponseBuilder ×7" and "six repair paths" and derived ~8%/day
  partly from eliminating those retries. Cost analysis v1.1 §1 RETRACTS that:
  /api/mentor was deleted by Retirement PR-2 (index.cjs:124), the live tutor
  is /api/tutor, and mentorResponseBuilder.cjs is an ORPHAN — "the repair
  architecture I costed is dead code". The checkSolution ×3 half stands; the
  mentorResponseBuilder half and the ~8%/day figure do not. The QUALITY
  argument is unaffected and remains the reason to do this work. (The
  original also said "six" while listing seven line numbers.) Lane G reached
  the same retraction independently and concurs: the tutor half is withdrawn,
  the figure still holds for checkSolution.cjs and tutor.cjs.
  ★★ SEQUENCING — [FU-FORBIDDEN-PATH-PREFIX-BUG] MUST LAND BEFORE THIS LANE.
  The FORBIDDEN entry protecting checkSolution.cjs cannot currently match the
  real path, so taking a "deliberate amendment" to it beforehand removes a
  guard that was never in force, and the PR then ships whatever it did to the
  grader while everyone believes the removal was reviewed.

[FU-EFF-QUICK-PRACTICE-BATCH] — Route Quick Practice through the batched
gradeWorksheet path. Five separate checks cost $0.070; batched $0.022 — 69%
off the largest line, 31% of daily spend. gradeWorksheet is self-described
surface-agnostic with two proven wrappers (chapterTestGradeService:27,
fullMockGradeService:26). Flow (owner-locked): student types/uploads per
question as today → "Finish session" → instant MCQ scorecard (scored
locally, no API) → prompt to confirm nothing further to upload → on confirm,
ONE batched grade → graded answersheet + full scorecard. Because capture is
per-question, bare MCQs (option pick only) are scored locally and EXCLUDED
from the prompt; MCQs WITH uploaded working are still sent for mistake
diagnosis (owner ruling: 0/1 always, never step-marked — the diagnosis is
the point). Product win: the tutor receives one graded answersheet instead
of five disconnected checks. Requires FORBIDDEN amendment for
SolutionChecker.tsx and ResultsScorecard.tsx — owner authorised; replace the
ban with targeted tests per the #519 DesktopShell precedent, do not simply
delete entries.

[FU-EFF-THINKING-BUDGET] — Thinking bills as output; output is ~90% of
spend. Only one call sets a budget (checkSolution.cjs:600, thinkingBudget 0
on detect-question). Plumbing exists at geminiClient.cjs:76-77/:236.
→ MEASURE FIRST — set budgets at p90 of observed thoughtsTokenCount per
class, never by guess. Grader first. Tutor deliberately excluded, see next.
Gated on [FU-TELEMETRY-NO-READ-PATH]: #540 measures, but nothing reads it.

[FU-EFF-TUTOR-COST-ENVELOPE] — Do NOT fix a tutor budget yet. Once H-1 data
is readable, measure the current tutor token profile, then measure a more
contextual/humanlike prompt against it, and price the delta. Decide
generosity from data. Tutor is ~26% of spend and is the moat — the last
place to cut and a legitimate place to spend more.

[FU-TELEMETRY-NO-READ-PATH] — ★ THE NEXT LANE. #540 records token/thinking
counters into telemetry and a ring buffer, but nothing serves snapshot() or
getTokenTelemetry(). A read endpoint needs index.cjs. Until it exists the
instrumentation MEASURES but does not REPORT, and the owner cannot get the
token distribution that every thinking-budget and pricing decision depends
on. Named next lane, not a background item.
★ OWNER-APPROVED SHAPE: combine with Lane G's [FU-ANON-BUCKET-XFF-DEPENDENT]
shape diagnostic — same file, both readouts, one review. Lane G owns
index.cjs and runs this AFTER the CORS PR. Both lanes reached "telemetry read
path goes first" independently, and both need the same frozen file, so they
must not be two PRs racing for it.
```

### ★★ AUTH / EMAIL TIER — all three from the #538 live verification
```
[FU-AUTH-EMAIL-BRAND-MISSPELLED] — RESOLVED IN PART 2026-07-26. Firebase
auth emails were branded "Lazzyy Topper" in subject, body and signature.
Owner corrected the Firebase Public-facing name to "LazyTopper" (console
only, no code). Canonical spelling confirmed from the repo: 75 occurrences
of "LazyTopper" in src, and index.html uses it in <title>, og:site_name and
application-name. NOT two words, no space. Remaining and DEFERRED: emails
still send from noreply@lazzyy-topper.firebaseapp.com — the project ID is
permanent and cannot be renamed.

[FU-AUTH-CUSTOM-EMAIL-DOMAIN] — DEFERRED post-launch. Two blockers found
live: (1) must use the APEX lazytopper.com, NOT www — www already carries
CNAME → cname.vercel-dns.com and a CNAME must be the sole record at its
name, so adding TXT to www risks undefined resolution on the LIVE
production hostname; (2) an existing SPF record almost certainly sits at
apex (GoDaddy email is configured: CNAME email → email.secureserver.net plus
secureserver DKIM CNAMEs) and a domain may have only ONE SPF record —
Firebase's include must be MERGED, never added as a second record.
Registrar/DNS host is GoDaddy (NS → ns75/ns76.domaincontrol.com); Vercel
receives traffic only via the www CNAME. Verification takes up to 48h.
Separately: do NOT customise the Action URL — Firebase currently HOSTS the
password-reset handler page, and repointing it requires building that page
(parse oobCode, call confirmPasswordReset, handle expired/used codes).

[FU-SIGNIN-DISABLED-ACCOUNT-ENUMERATION] — describeAuthError in Login.tsx
surfaces auth/user-disabled as "This account has been disabled" (:911-912)
while correctly grouping user-not-found with wrong-password and
invalid-credential into one message (:913-916). So on the SIGN-IN path a
disabled account is distinguishable from a non-existent one — Firebase
returns user-disabled BEFORE password verification, so an email alone is
enough. Pre-existing, NOT introduced by #538, small population — but the
same class of leak the reset flow was built to avoid. Fix: fold
user-disabled into the generic message. The pattern is already in the same
file — #538's reset path swallows user-disabled for exactly this reason.

[FU-AUTH-CLUSTER-SEQUENCING] — forgot-password (H-3) is DONE (#538, merged
and live-verified). The remainder — name-on-signup [FU-SIGNUP-NO-NAME],
phone-on-signup [FU-SIGNUP-NO-PHONE-OPTION] and Lane F
[FU-AUTH-PROVIDER-SPLIT-ACCOUNTS] — all touch AuthContext.tsx / Login.tsx /
SignUpPage.tsx and MUST run sequentially under one agent, never as parallel
lanes. Remaining order: name-on-signup (one-way door) → phone-on-signup →
Lane F. [FU-SIGNIN-DISABLED-ACCOUNT-ENUMERATION] belongs in this cluster too
and is the cheapest of them.
```

### ★★ PRICING-SURFACE / GUARD TIER
```
[FU-PRICE-LITERALS-FIVE-FOUND] — #539 removed FIVE distinct prices from
Home.tsx JSON-LD alone: ₹149 monthly, ₹349 "Board Season Pack", ₹999
"Annual", plus ₹149 in the page meta description, alongside ₹149 in
PracticeLimitGate:90 and MockViewGate:189 and ₹2,999/yr on PricingPage.
That count is the justification for the no-literal guard existing. The
guard now scans all of src/ for TWO shapes — ₹-prefixed AND bare numeric in
structured-data/Offer context — because the most dangerous surface
(price: "149" in JSON-LD) carries no rupee sign at all.

[FU-HOME-FABRICATED-SOCIAL-PROOF] — ★ PROPOSED ID, owner to confirm or
rename. Home.tsx publishes fabricated social proof, including as structured
data: :247-250 aggregateRating { ratingValue: "4.8", reviewCount: "2340" },
:340 and :549 "12,800+ students", :461 "from 2,340+ student reviews".
Direct violation of CLAUDE.md §5 ("No fake data", "never invent content").
The aggregateRating is JSON-LD — Google renders it as stars in search
results and its structured-data policy prohibits fabricated review markup;
the penalty is manual action against the site, not a silent ignore. Inert
only while Home.tsx stays unrouted, exactly as the ₹149 price was inert
right up until it wasn't. Should precede any public launch.

[FU-JSONLD-OFFER-SHAPE] — ★ PROPOSED ID. billingIncrement and unitCode sit
FLAT on the schema.org Offer object in Home.tsx. Canonically they belong on
a priceSpecification / UnitPriceSpecification; Google likely ignores them
where they are. Found on trunk and deliberately PRESERVED in #539 per owner
instruction to mirror the existing shape with two entries. A schema
correctness question, not a price question — separate decision.

[FU-HOME-TSX-DEAD-FILE] — UPDATED. Still unrouted (// LEGACY-RETIRED
2026-06-08, zero importers) and now carrying corrected prices it does not
display to anyone. Pinned as a readFileSync fixture by scripts/ops gates
(agent3_uiux_guard.mjs:93-94, ux_focus_acceptance.mjs:25), so deletion is
not free. Deleting it is arguably the real fix for both
[FU-HOME-FABRICATED-SOCIAL-PROOF] and [FU-JSONLD-OFFER-SHAPE]. Its own lane.
```

### ★ GATE / TEST-INFRASTRUCTURE TIER
```
[FU-CI-DOC-UNDERSTATES-GATES] — ★ PROPOSED ID. CLAUDE.md §6a describes CI
as: root scripts test:matrix:all → lazytopper check:mojibake → build →
lazytopper test:matrix:all. The actual .github/workflows/quality-gate.yml
ALSO runs typecheck:test (tsc -p tsconfig.test.json --noEmit) and a full
"Vitest suites" step (pnpm --filter lazytopper exec vitest run). CI covers
MORE than documented. Normally low severity — but the new local/CI test
split (full matrices and full vitest in CI only, because two concurrent
local runs OOM-killed the editor on a 7.8GB machine) is BUILT on knowing
exactly what CI covers. A stale description of the gate is now load-bearing.
Correct §6a.

[FU-WORKSHEET-MI-TEST-TIMEOUT] — ACTION: raise that suite's timeout. Do not
leave it to flake.
WorksheetGenerator.mi.test.tsx uses vitest's DEFAULT 5000ms timeout for a
heavy render. It passes in ISOLATION and fails only under load; EVERY
observed failure was "Test timed out in 5000ms", never an assertion — so it
has been absorbed as a "known trunk flake".
★ THAT FRAMING NOW HAS ARITHMETIC AGAINST IT. On the #541 CI run (a clean
linux runner, not a loaded dev box) the suite passed in 4304ms against the
5000ms default — a 14% margin, roughly 700ms from failing IN CI. And the
vitest suite grew by 37 tests on 2026-07-26 alone (884 → 921), so the margin
is shrinking as a matter of course. This is not a flake that lives on the
owner's machine; it is a timeout that trunk will cross on its own.
Baseline for comparison, measured on a detached clean-trunk worktree before
Lane H: 74 files / 884 tests / 0 fail.

[FU-OPS-GATES-RED-ON-TRUNK] — ★ PROPOSED ID. Two ops guards are RED ON
CLEAN TRUNK, proven on a detached worktree, not caused by any Lane H work:
agent3_uiux_guard.mjs (3/7) and ux_priority_step_acceptance.mjs (7/13).
Root cause of homepage_marketing_positioning: it requires
/human-grade|human tutor|predictive/i in Home.tsx, which matches ZERO times
— Home says "predicted", not "predictive". ★ NEITHER script is inside
test:matrix:all, so the standard gate chain and CI do NOT catch breakage in
them. Also note: test:ux:all-priorities runs ux_priority_step_acceptance.mjs,
NOT ux_focus_acceptance.mjs — different files, easily conflated.

[FU-DROP-APP-BASEPATH] — ⚠ DOUBLE-ASSIGNED TO LANE G AND LANE H. Lane H
wrote the handoff FIRST and records it here so it cannot be lost. LANE G:
do NOT duplicate this entry — verify it survived the rebase and skip it.
Post-launch, cosmetic. The /app URL prefix is a coordinated three-layer
coupling: vite.config.ts:28 (base:"/app/"), App.tsx:1053 (<BrowserRouter
basename="/app">, always active), and vercel.json (the / → /app/ redirect
plus the /app/:path* SPA rewrite). Removing it requires changing all three
in lockstep. Touches frozen App.tsx (overlay gates) and has site-wide blast
radius — a base-path error white-screens every route on hard refresh, which
no gate catches. Standalone lane; live-verify a hard refresh on deep routes
across both domains and both auth states. Zero functional benefit.
```

### ★★ LANE G's SET — appended here rather than queued behind this PR (owner ruling)
Lane G (#537, server rate limiter) had no handoff of its own; its entries are recorded here so the two lanes' work reaches the board once, in one place. Three of Lane G's ten were already present in this update — `[FU-TELEMETRY-NO-READ-PATH]`, `[FU-EFF-RESPONSE-SCHEMA]` and `[FU-DROP-APP-BASEPATH]` — and were **enriched in place rather than duplicated**; the seven below are new.

```
[FU-FORBIDDEN-PATH-PREFIX-BUG] — ★★ THE GRADER IS PROTECTED BY AN ENTRY THAT
CANNOT FIRE, AND THIS MUST LAND BEFORE ANY LANE THAT TOUCHES
checkSolution.cjs. Both FORBIDDEN arrays list 'server/routes/checkSolution.cjs'
WITHOUT the lazytopper/ prefix every other entry carries
(check_improve_convergence_acceptance.mjs:476,
check_improve_overlay_additive_acceptance.mjs:262). The check is
changed.includes(f) — exact array membership (:520 and :299 respectively) —
and git diff --name-only emits repo-relative paths, so the real path
lazytopper/server/routes/checkSolution.cjs can NEVER match.
  ★ VERIFIED INDEPENDENTLY BY LANE H, and the same file contains the proof:
  check_improve_convergence_acceptance.mjs:528 checks
  'lazytopper/src/components/equation/EquationInput.test.tsx' WITH the prefix,
  in the same array style, and that one does match. So the array is internally
  inconsistent, and a working sibling entry demonstrates the correct shape.
  RULING: its own micro-PR (one line + a test asserting the entry matches a
real repo-relative path). Do NOT fold it into another change. If a later lane
takes its "deliberate FORBIDDEN amendment" for checkSolution.cjs first, that
lane lifts a protection which was never in place, and ships whatever it did to
the grader while everyone believes a guard was knowingly removed. A false
sense of review is more dangerous than no review.

[FU-ANON-BUCKET-XFF-DEPENDENT] — The api-server proxies to 127.0.0.1
(app.ts:45-57), so at the gateway req.socket.remoteAddress is ALWAYS the
api-server. The anonymous rate-limit bucket therefore depends entirely on
x-forwarded-for surviving the Vercel → Railway → proxy hops (it is not in
STRIPPED_PROXY_HEADERS). If XFF is absent, or the wrong chain element is
parsed, every signed-out caller collapses into one shared ip:127.0.0.1 bucket
of 3/day. FAILS CLOSED — no billing risk — but an invisible outage for
signed-out visitors, who legitimately reach generate-visual/generate-diagram
from FREE practice surfaces (VisualExplainer, QuestionVisualAid).
Environmental: no test can catch it.
  - The limiter keys on .split(",")[0] — the FIRST chain element, the client.
    CORRECT. Verified on merged trunk at rateLimiter.cjs:273.
  - Probe RULED OUT by owner: four anonymous POSTs would consume the shared
    bucket in exactly the broken case, locking out signed-out visitors until
    IST midnight on launch weekend.
  - Logs cannot resolve it: telemetry emits counter NAMES only
    (rateLimiter.cjs:372-414), never the bucket key, so ip:127.0.0.1 is
    indistinguishable from a real client IP.
  - Instrument instead: a 3-line SHAPE diagnostic —
    rate_limit.anon_key.loopback vs rate_limit.anon_key.client. Emits the
    shape of the resolved key, never the key. No IP, no PII. The first
    signed-out production request answers it definitively.
    → COMBINED into the [FU-TELEMETRY-NO-READ-PATH] index.cjs PR
    (owner-approved).
  - Free canary meanwhile: an anon hard_block firing implausibly early is the
    collapse signature.

[FU-API-CORS-WIDE-OPEN] — artifacts/api-server/src/app.ts:29 is a bare
app.use(cors()) — every origin allowed. This is the FRONT DOOR for both
/shared-api (:33) and /api (proxied to the gateway at :45). Lock to an
env-driven allowlist from CORS_ALLOWED_ORIGINS (already set in Railway).
★★ TRAP: vercel.json rewrites /api/:path* to Railway SERVER-SIDE, so
legitimate production traffic may arrive with NO Origin header. An allowlist
that rejects missing-Origin requests kills every API call in production while
passing every gate. Missing Origin must be ALLOWED; only a present-but-
DISALLOWED Origin is refused. → IN PROGRESS, Lane G.

[FU-API-NO-SECURITY-HEADERS] — No helmet on the api-server, so no CSP / HSTS /
X-Frame-Options. Roughly one line, but CSP may break Firebase/Gemini calls —
add with CSP tuned or initially off, and verify the app still loads.
→ folded into the Lane G CORS PR (helmet third).

[FU-GATEWAY-CORS-ORIGIN-STALE] — config.CORS_ORIGIN is pinned to
lazytopper-production-desktop.vercel.app (observed in live response headers,
2026-07-26). Single-string by design (serverConfig.cjs:59, httpUtils.cjs:5/13)
— the gateway supports exactly one origin. HARMLESS TODAY because production
reaches the gateway via Vercel's server-side rewrite with no Origin, so the
browser never evaluates it. Would matter if anything ever called the Railway
host directly from a browser. Low priority. Note that the two CORS layers
disagree BY DESIGN once the app.ts allowlist lands.

[FU-DEAD-AI-LEARNING-PATH] — generateAILearningPath
(learningPathGenerator.ts:285) calls callMentor("plan") at :303 → /api/mentor,
deleted by Retirement PR-2 (index.cjs:124). It therefore ALWAYS fails, and
WeakAreaPracticePage.tsx:340-343 catches and silently serves the local
heuristic generateLearningPath (learningPathGenerator.ts:83). NOT a launch
blocker — no student-visible break. One wasted failed request per "Generate
path" click, and an AI feature that is dead while the code implies it is live.
Owner decision: repoint to /api/tutor or delete the AI path. The weak-area →
practice flow (:325/:331) is pure navigate() with NO API and is unaffected.
(Supersedes the earlier [FU-WEAKAREA-AI-PATH-404] framing, which wrongly
called this a launch blocker — that ID is WITHDRAWN by the owner, not
tombstoned, because the try/catch fallback means it was never a break.)

[FU-DETECT-QUESTION-CACHE] — Do NOT build now. Cache detection by question
hash (mirroring getOrCreateModelSolution's hash-and-store), and skip detection
entirely when marks are already known via the tutor entry. Do NOT merge detect
into the grade call: it saves ~$0.001 and would remove the marks-confirmation
step at DesktopCheckImprovePage:1133-1136 that step-marking depends on.
Context: #537 reclassified /api/detect-question from vision to practice
(billing bucket only — feature untouched), because one advertised check fires
detect-question AND check-solution, and while both were vision a ceiling of 30
bought only ~15 real checks against the 25/day advertised.
```

### ★ Corrections to entries that already existed on this board

```
[FU-SIGNUP-NO-PHONE-OPTION] — ★ THIS HAD NO BODY ON THE BOARD. Until now the
ID appeared only as a cross-reference inside [FU-AUTH-CLUSTER-SEQUENCING];
there was no standalone entry, so a reader saw the name and no description.
Written out here with Lane G's trigger-traced framing, which is the correct
one of the two readings in circulation:
  NOT "phone sign-in is unavailable". Phone sign-in is LIVE at /login → Phone
  tab (Login.tsx:1152 → :1198 → :1226 → sendPhoneOtp :975). It is /sign-up
  that has ZERO phone matches. So a phone-only student CAN register — but only
  by finding the Sign IN page, which no new user would think to do.
  Technically met, practically broken.
The distinction matters because the two readings are different bugs with
different fixes: the first would mean building phone auth, the second means
surfacing an entry point that already works. Part of the auth cluster; must
run sequentially with the others, see [FU-AUTH-CLUSTER-SEQUENCING].

[FU-COMMIT-SUBJECT-AT] — COUNT UPDATED: the instance count is now FOUR, not
the three recorded in the 2026-07-25 entry. Two reached trunk (#533 82b434d,
#535 7185c5f) and TWO WERE PREVENTED — #537 by an explicit --subject, and
Lane G's most recent. The 2026-07-25 entry is left as written because "three"
was true on that date; this is the current count. Prevention is now working,
which is the useful part: the guard is an explicit subject at commit time, not
a PR-title fix, because the squash dialog pre-fills from the COMMIT BODY when
a PR has a single commit. All four Lane H PRs (#538-#541) were checked at
commit time and none carried it.
```

### Live-verify still owed
- **#540** — additive and provably unable to alter request behaviour, but it sits on the live path of **every** Gemini call. One real production call would confirm the counters populate against `gemini_tokens.*`. Worth one owner check.
- **#539** — the corrected ₹599 renders on `/practice` and the mock gates in production, not just in a forced-limit test harness.

## 2026-07-25 -- #531–#535 (LAUNCH-BLOCKER WAVE + DEAD-PAGE SWEEP): 5 FUs tombstoned, 11 opened — incl. a CRITICAL cost-exposure tier (trunk `7185c5f`)

### RESOLVED — tombstoned (closed, not open work)
- **`[FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]`** → #535. **Both** write sites removed (`useSubscription.ts` hydration `.then()` **and** the unconditional `AuthContext.tsx:233`). Each independently mutation-verified.
- **`[FU-TRIAL-HAS-NO-ACTIVATION-PATH]`** → #535. `startTrial` now has **exactly one** call site (the `RequirePremium` CTA); no auto-write remains.
- **`[FU-SIGNUP-UNSAFE-REDIRECT]`** → #531. Guarded; severity recorded as **defence-in-depth, not a live exploit** (no URL-controllable input).
- **`[FU-LEGAL-FOOTER-LINK]`** → #532 (Lane C). Reachable-surface finding: `pages/Home.tsx` carried a legal footer but is dead code (never imported).
- **`[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`** → #533. Caption de-numbered ("Board paper pattern"). **Residual, separate:** `[FU-HPQ-EVIDENCE-YEARS-UNVERIFIED]` below.

### NEW — lane-discovered (small / bounded)
```
[FU-SAFEPATH-DUPLICATION] — three copies of isSafeInternalPath remain
(Login.tsx:9, HighlyProbableQuestions.tsx:115, BackToParent.tsx:55). PR-1
added a shared lib/safeInternalPath.ts but consolidating the three was out of
scope (Login.tsx was Lane C's at the time; Lane C has since merged, so the
lane collision no longer blocks it). A later consolidation pass.

[FU-HOME-TSX-DEAD-FILE] — pages/Home.tsx is a dead landing page (never
imported) that carried an unreachable legal footer. Dead-code-sweep candidate;
largely realised by Lane E (#534).

[FU-HPQ-EVIDENCE-YEARS-UNVERIFIED] — HighlyProbableQuestions.tsx:950 reads
"drawn from 4 years of papers." Traced empirically: the HPQ page does NO
scoring and NO year filtering — it renders a static hand-authored array
(highlyProbableQuestions.ts), subject/topic-filtered, tier badges from the
locked Exam-Trends table; pastBoardYear is a declared-but-never-consumed dead
field. So "4 years" is uncorroborated provenance copy with no engine behind
it — not a computed claim. Owner ruling pending on whether to keep, drop, or
correct the number. Do not overwrite without a ruling (fabrication risk).
```

### NEW — ★★ CRITICAL cost-exposure tier (surfaced by the wave; now the top launch tier)
```
[FU-CHECKIMPROVE-UNGATED] — CRITICAL, cost exposure. /check-improve has no
gate at any layer, verified four ways: (1) route App.tsx:1106-1109 is a bare
self-closing <Route> with no RequirePremium and no RequireAuth — it is the
only /check-improve route definition in the file; (2) no pathless parent
layout route exists (every <Route> in App.tsx carries its own path=), so no
group gate applies; (3) the component DesktopCheckImprovePage imports only
useAuth, using `user` for mistake logging at :735 — zero useSubscription,
zero isPremium; (4) the server route checkSolution.cjs has zero hits for
uid/auth/token/verifyIdToken/premium/subscription/401/403. Net: a SIGNED-OUT
visitor can trigger Gemini vision grading with no account, no trial, no cap,
from a link in the main nav (App.tsx:411). checkSolution.cjs runs
maxOutputTokens 16000 (32000 path in the reliability test) on a thinking
model, so reasoning tokens bill too. OWNER DECISION PENDING: RequirePremium
(matches stated design; removes a core hook from free tier) vs RequireAuth
(keeps the funnel hook, attaches every call to a uid, which is the
precondition for per-user rate limiting). NOTE: the tutor's C&I OVERLAY
reuses the component, not the route, so route gating will not affect it.

[FU-NO-SERVER-ENTITLEMENT] — The entire premium gate is RequirePremium, a
React component. A grep of lazytopper/server/** and artifacts/api-server/**
for subscription/premium/tier/entitlement returns zero enforcement hits (only
an unrelated "must-crack" question tier and a Gemini rate-limit comment). Any
account can call the AI endpoints directly and bypass every gate in the UI.

[FU-NO-RATE-LIMIT-AI-ENDPOINTS] — No rate-limiting library or per-uid cap
anywhere in the AI server (lazytopper/server/index.cjs is a raw
http.createServer). Unbounded per-user Gemini cost. This is the control that
bounds exposure independently of entitlement correctness; it should land
before or immediately after any gating change.

[FU-SUBSCRIPTION-CLIENT-WRITABLE] — firestore.rules:69-70 allows
`match /subscriptions/{uid} { allow read, write: if isOwner(uid); }`, so a
signed-in student can write tier:"premium" into their own doc from devtools.
activatePremium is also client-callable via upgradeToPremium. PRE-EXISTING —
not introduced by #535. Absolute blocker before payments go live. Sacred-file
change: its own reviewed PR.

[FU-DOCTRINE-DRIFT-CLAUDE-MD] — CLAUDE.md:83 ("No fake trial activation —
trial state must come from server/admin, never client UI") and CLAUDE.md:168
("No localStorage writes for premium/trial state") describe a state the code
has never been in: saveSubscription:84 calls saveLocal which writes
localStorage, and activateTrial is client-callable. Two agents have now cited
these lines as authority for decisions. Either bring the code to the doctrine
or amend the doctrine — but as a deliberate reviewed change, never as a side
effect of a feature lane.

[FU-WORKSHEET-UNGATED] — /practice/worksheets (App.tsx:1079-1084) has no gate;
WorksheetGenerator imports useAuth only, no useSubscription. Owner wants a
per-day free cap. Must be enforced server-side — a client-side daily counter
is as bypassable as the premium flag.

[FU-SIGNUP-NO-NAME] — SignUpPage collects email + password only (state at
:60-61). Google sign-in supplies displayName; email/password users do not, so
displayName falls back to the raw EMAIL ADDRESS across App.tsx:793,
DesktopShell.tsx:188 and :190, MobileAccountMenu.tsx:56 and :57,
DashboardHeader.tsx:27, and ShareProgressPrompt.tsx:86. AuthContext.tsx:58
ALREADY accepts an optional displayName parameter — the plumbing exists;
SignUpPage simply never collects or passes it. ONE-WAY DOOR: accounts created
before the fix cannot be backfilled without asking users again.

[FU-COMMIT-SUBJECT-AT] — An agent emitted a bare "@" as the first line of the
commit message on three PRs; it reached trunk on #533 (82b434d) and #535
(7185c5f), both showing as "@ (#N)" in git log --oneline. The squash dialog
pre-fills from the COMMIT BODY when a PR has a single commit, so correcting
the PR title alone does not prevent it. The first line of a commit message is
the subject. Do not rewrite trunk history to fix the existing two.
```

---

## 2026-07-22 -- #528 (PR-B2): 1 FU RESOLVED, 1 FU upgraded from argument to proof, 2 doctrines recorded (trunk `7998ee4a`)

**No new FUs opened.** The lane closed one and strengthened another.

### RESOLVED - `[FU-HUB-DROPDOWN-ZINDEX]` (full entry further down, with the corrected bounds)
Fixed on the **header** — `position: relative; zIndex: 35`. **It closes rather than defers** because every `backdrop-filter` in `src/` was enumerated and no other surface has a trapped dropdown.

### ★★ DOCTRINE - A DEAD BOUND STILL BRACKETS A NUMBER, AND THE NUMBER LOOKS VERIFIED
This FU carried a prescription recorded as *"the fix (known, byte-reviewed): `zIndex: 55`"*, bounded *">50 and <60"*. **By #528 BOTH bounds referenced code that no longer exists** — the floor cited TrendsPage's dropdown (route **retired**, `App.tsx:936`) and the ceiling cited `TutorDrawerV2` / `MentorSolveDrawer` (**deleted in #516**). The bounds rotted; the number between them did not move, and still read as verified. **55 is above the real ceiling of 50** and would have shipped a regression into the command palette.

**The general shape: a derived value outlives the facts it was derived from, and nothing re-checks it.** A z-index, a threshold, a timeout, a magic constant — if the reasoning is recorded but never re-run, deletion of its inputs is silent. The cure used here: **re-derive the bounds from the live landscape, then pin them in a test** (`expect(z).toBeGreaterThan(30)` / `toBeLessThan(50)`) so the next deletion turns a suite red instead of leaving prose stale. Prose is a hope; a check is a fact.

### ★★ DOCTRINE - BOTH MIRROR TRAPS, OBSERVED IN ONE LANE
Most agents meet one of these and generalise wrongly. Both directions, from the same PR:

```
base...HEAD forbidden gates : VACUOUS pre-commit (trunk vs itself, zero commits)  ->  MEANINGFUL post-commit
scope:guard                 : MEANINGFUL pre-commit (reads the WORKING TREE)      ->  VACUOUS post-commit
                              observed: "SCOPE_GUARD_OK … lanes=product"  ->  "SCOPE_GUARD_OK … no changes"
```

**Neither prints a warning when it is the vacuous one — both print a truthful green.** Run `scope:guard` **before** committing and the `base...HEAD` matrices **after**, and say which run you are quoting.

---

## 2026-07-22 -- #520 + #522: THE HOME REDESIGN ARC - 4 FUs opened (1 born re-scoped, 1 do-not-act), 3 doctrines recorded (trunk `2865432`)

### NEW - `[FU-MOBILE-MI-REAL-DATA]` ★ **OPENED ALREADY RE-SCOPED — its original rationale is VOID**
**What:** mobile Home shows the SPEC §4 honest empty state for a signed-in student; real per-user MI is not wired.

**★ The reason it was deferred is FALSE, and that is the point of this entry.** The deferral rested on `MobileHome`'s doc comment claiming the page "stays firebase-free", so reading real logs would drag firebase into the mobile chunk for our phone-first audience. A real import-graph walk disproves it:

```
MobileHome -> hooks/useSubscription -> subscriptionService -> firebase/firestore
MobileHome -> context/AuthContext   -> mistakeLogService   -> firebase/firestore
```

firebase — including firestore — **and `mistakeLogService` itself** are already on the graph, and were before #520. **Reading real logs here would add NO new module.** There is no bundle cost, so there is no technical argument either way: this is now **purely a product/UX decision** — does a signed-in student on mobile Home want their real buckets, or does the empty state serve them better until they have attempted enough to be worth showing?

The false comment is corrected in-file and the true state is **pinned by a characterisation test** (`MobileHome import graph` in `MobileHome.test.tsx`) so it cannot quietly return. **Do not re-cite the bundle argument.**

**Where:** `lazytopper/src/pages/app/MobileHome.tsx` (`MistakeIntelligenceCard`).

---

### NEW - `[FU-HOME-BOARD-COUNTDOWN]` — the countdown the prototype showed and #520 deliberately did not build
**What:** prototype v9's greeting band carries a *"214 days to boards"* counter. Not built.

**Why omitted (owner-endorsed):** the only real source, `fetchCbseExamDate`, is an **async API** (spec §8 bars new API dependencies on Home), and its result may be `source: "predicted"` rather than `"official"`. **Rendering a predicted date as plain fact is the fabrication line.** Separately, students have an existing `hideCountdown` preference (`localStorage "lazytopper.hideCountdown"`, plus a pace-profile default) that an unconditional Home counter would silently override.

**If it is ever built** it must (a) show the `source` honestly when the date is predicted, (b) honour `hideCountdown`, and (c) not add a blocking async dependency to first paint. **The owner recorded that the prototype was wrong to include it.**

**Where:** `lazytopper/src/pages/desktop/DesktopHome.tsx` greeting band · `src/services/cbseExamDate.ts`.

---

### NEW - `[FU-HOME-MEMORY-STRIP-VS-MI]` — kept deliberately; partly duplicates the MI card
**What:** Home's resume/memory strip and the "Latest saved worksheet" card survived the redesign. Neither was in the spec's change list, so **deleting them would have been scope creep** — but the saved-worksheet card's right column now renders mistake content ("Most-common slip this week") that the new MI card also covers.

**Owner decides after living with it.** Both are gated on real `landingMemory`, so a new student sees exactly the prototype layout and only a returning student sees the overlap. *(Same doctrine #521 established independently: silence in a spec is not authorisation to delete rendered content.)*

**Where:** `lazytopper/src/pages/desktop/DesktopHome.tsx`.

---

### NEW - `[FU-TRUNK-FLAKY-SUITES]` ⚠ **DO NOT SPEND A LANE ON THIS**
**What:** the full local vitest suite fails a small, **shifting** set of suites on Windows. Four files observed across runs: `WorksheetGenerator.mi.test.tsx` (most consistent), `DesktopPracticePage.multiTopicNav.test.tsx`, `DesktopPracticePage.fullTestNav.test.tsx`, `worksheetModel.topickey.test.ts`. **Treat the set as open-ended, not as those four.**

**All of them pass in isolation**, and the failing pair differs run to run — order/parallelism sensitivity, not broken tests.

★ **They are GREEN on the linux CI runner.** Both #520 and #522 ran 62 files / 814 and 826 tests, all passing. **So this is a local-dev-experience cost, NOT a CI-reliability risk** — the earlier framing ("post-#515 the strict vitest gate means these will redden unrelated PRs at random") was **overstated and is corrected here**.

**The method that matters more than the fix:** before attributing a red to your own branch, **stash to clean trunk and re-run**. That is how this was established both times.

★★ **#528 turned this from an argument into PROOF, without needing a trunk re-run.** The full suite was run **twice against byte-identical content** (pre-commit and post-commit on the same tree):

```
pre-commit   847/849  -- FAILED: WorksheetGenerator.mi  +  worksheetModel.topickey
post-commit  848/849  -- FAILED: worksheetModel.topickey  ONLY
```

**`WorksheetGenerator.mi` failed one run and passed the next on the same bytes.** A regression cannot do that; a flake is the only explanation. Both also passed in **isolation** (2 files / 23 tests), and **linux CI ran 64 files / 849 tests, all passing**. **This is the cheapest available proof — two runs of your own suite, no clean-trunk worktree required** — and it is stronger than isolation runs, which only show the suites *can* pass.

**Where:** local dev only; `lazytopper/` vitest.

---

## ★★ THREE DOCTRINES THIS ARC ESTABLISHED — carry them into every lane

**1. "REAL DATA ONLY" FORBIDS FABRICATED STATS PRESENTED AS A STUDENT'S OWN — NOT A CLEARLY-LABELLED SAMPLE.**
#520 deleted the signed-out SAMPLE MI panel from a **conversion surface** by over-reading spec §4. The owner recorded that his spec conflated the two and that he confirmed the removal as "no regression" when it was one. **The label is what makes a sample honest** — so make it *structural*, not textual: badge and figures in one containment-asserted block, so the qualification cannot drift away from the numbers it qualifies. Anti-fabrication remains absolute; a demonstration is not a fabrication.

**2. A DOC COMMENT IS A CLAIM, NOT A FACT — and it is more dangerous than a grep hit, because it reads like documentation.**
The "firebase-free" comment was false when written, survived months, and was cited as evidence by two people. Only walking the **real import graph** disproved it. This is the INFERENCE TRAP with a new face: `grep -l` is not an import, a variable's name is not its source, **and a comment is not a verified fact**.

**3. A TOKEN THAT IS DEFINED BUT NEVER CONSUMED IS INVISIBLE TO EVERY GATE WE RUN.**
`HOME_ACCENTS.spine` was defined in #520 and never painted, because the `::before` that was supposed to render it had no `background`. **tsc sees a used export; the linter sees a valid rule; the matrices see no behaviour change; tests asserted the value existed, not that anything painted it.** Nothing in the static stack can distinguish "styled" from "styled with a no-op" — **only rendering the surface and measuring the computed style can** (`getComputedStyle(el, "::before")`). Add that measurement whenever a change is *visual by definition*.

**And a corollary on instruments:** the probe that caught the spine bug also produced a **wrong-and-plausible FAIL** — Chrome normalises `linear-gradient(180deg, …)` by dropping the default angle, so matching the literal `"180deg"` can never succeed. It was caught by reading the computed value **before** changing any code. *An empty or surprising result indicts your command, not the world.*

---


## 2026-07-22 -- #521: EXAM TRENDS UPLIFT - 2 FUs opened (1 inverted, 1 do-not-act), 2 method doctrines recorded (trunk `ee5cd640`)

### 🆕 OPENED BY #521

**[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT] — the product states its evidence base three different ways. ⚠ INVERTED: TEN IS AUTHORITATIVE.**
Spec §4.4 required an Exam Trends hero badge reading **"Ten years of real CBSE papers"**, justified as *"the page's actual credential, currently buried in body text."* **That premise was false on both halves** — the phrase appears in neither the page body nor anywhere in `src/`, and the repo records **4 years** (`CURRENT_STATE:2509` *"PYQs: 760 total — all 4 main years complete"*; the HPQ page's own owner-approved reframe names *"4 years of papers + official blueprint + examiner-pattern analysis"*).

Raised **before** building. **The owner ruled: ship the badge — ten years is authoritative.** He is the authority on the evidence base; the 4-year figure describes **PYQ extraction into the question bank**, which is a different thing from the trend analysis behind the tiers. **This is a deliberate owner decision on the record, not an unverified attestation.**

**Therefore the FU points the OTHER way: the surfaces that contradict ten are the ones to correct.**
- `lazytopper/src/pages/Welcome.tsx:1867` — *"Last 5 years pattern"*. ⚠ **A LIVE MARKETING SURFACE**, and `Welcome.tsx` is a **globally forbidden file** — this needs explicit scoping.
- `lazytopper/src/data/class10ContentConfig.ts:156` — *"last 3–5 years of PYQs"*. ⚠ Under `src/data/`, also globally forbidden.
- `Home.tsx` already says 10 in four places → **already consistent, leave alone.**

**Separate lane. Nothing was touched by #521.** Small and self-contained, but both target files are forbidden by default, so it cannot be picked up casually.

**[FU-STALE-WORKTREE-PRUNE] — ⚠ LOGGED FOR VISIBILITY ONLY. DO NOT ACT ON IT.**
Every commit in this repo now prints ~46 lines of `error: failed to delete 'C:/…/.git/worktrees/<name>': Permission denied`. Cause: `git gc` auto-pack trying to prune ~50 **stale worktree registrations** whose directories are gone or Windows-locked. **Pre-existing, inert, purely cosmetic — commits succeed.** Judge a commit by its **exit code and `git log`**, never by the absence of this noise. **Owner-run housekeeping; no agent should spend a lane on it, and no agent should delete `.git/worktrees` entries.**

### 📌 NOT A FOLLOW-UP — the local vitest flakes are a DEV-BOX COST, not a CI RISK
Recorded so nobody opens an FU for them: the Windows local full `vitest run` produces an **open-ended, run-to-run-varying** set of failures across **4+ suite files** (~1200s collect fires 5s per-test timeouts on random suites). **Every one passes in isolation, and the linux runner is green** — #521's CI: **63 suite files / 826 tests, zero failures.** **Isolation runs are the reliable local signal; the full local run is a flaky oracle.** Diagnose only if CI itself goes red. **Nobody should spend a lane on this.**

### ★★ TWO METHOD DOCTRINES worth more than either FU

**1 · A guard over LOCKED data must compare against an INDEPENDENT copy of the truth.**
`BAND_BY_SLUG` is owner-signed authority. The obvious guard — `expect(rendered).toEqual(deriveExpected(BAND_BY_SLUG))` — is a **tautology**: re-tier the map and **both sides move together**, so it passes through the exact edit it exists to prevent. It proves rendering is a pure function of the map; it never checks the map still says what the owner signed. **Working pattern:** render the **pre-change** build through a throwaway harness, freeze its output into the test (golden: Maths 5/5/3, Science 6/5/2), delete the harness. Belt and braces, hash the frozen region (`d470705fda73fd98bdcf32e7`; owner re-derived it independently — 70 lines / 2,359 bytes / sha `f3b72f1ce8e3549d1d507bcd`). Same family as the Practice-Hub parity proof and the routing-parity test. **Applies to every locked-data guard in this repo.**

**2 · Silence in a spec is not authorisation to delete rendered content.**
#521's first cut dropped `topic.blurb` — real catalogue copy — because both the prototype and the spec's row enumeration omitted it. Owner ruled **RESTORE**: the enumeration described what to *restyle*, not an exhaustive keep-list, and deleting rendered content is a functionality change (§0 forbids one). **An omission from a list is not a removal instruction, and a restyle is exactly where content vanishes quietly.** Flag it rather than ship it; when restored, **pin it with a test** rather than relying on the next reader.

### ★★ AND A CLASS TO RECOGNISE — a spec author can hallucinate a bug from their own mockup
Spec §5 asserted the shipped Exam Trends page mispositioned a `⋯` popover. **It had no popover** — the secondary actions were an inline expansion row. Both "root causes" described **prototype v3**. Owner confirmed the error was his. **Consequence: acceptance §9.4 is a NEW-BEHAVIOUR check, never an A/B against trunk** — at trunk the menu could not overlap anything, so a trunk comparison would wrongly suggest the bug was never real. **A spec sentence of the form "the current implementation does X" is a claim about code — open the file.** Fourth consecutive lane whose brief carried a load-bearing false premise.

---

## 2026-07-21 -- #516: TUTOR RETIREMENT COMPLETE - 1 FU closed, 1 corrected, 2 updated (trunk `a86feda`)

### ✅ RESOLVED BY #516

**[FU-TUTOR-LEGACY-RETIRE] — ✅ FULLY RESOLVED. CLOSED end-to-end** (#512 behaviour, #516 deletions). The old-tutor cluster, `MentorSolveDrawer` + `mentorDrawerLogic`, `/api/mentor` and its 13 dedicated test suites, and the persona/test-bot cluster are all deleted. **Do not re-open.**

### ★★ CORRECTION — a FALSE claim this file previously carried

**"KEEP `/api/mentor` + `types/mentor.ts` + `MentorSolveDrawer` (LIVE in `PracticePage`)" was WRONG on two of three.**
- **`MentorSolveDrawer` was NOT live.** Mounted, imported, state-gated — but its trigger prop was threaded three levels down into an unused `_onOpenMentorBoard` binding, and its second trigger (`?journeyMentor=`) had no producer in the product. **Deleted.**
- **`/api/mentor` had no product caller** once the old tutor died. **Deleted.**
- **`types/mentor.ts` DOES survive — but for a different reason than recorded.** Not because `/api/mentor` needs it, but because it is a shared **type** module with 7 importers including `src/ai/aiClient.ts` (33 importers), feeding SolutionChecker / worksheet grading / ChapterTest / C&I.

**Record the CLASS: a mount, an import, and a state gate are all compatible with dead code. Only a trigger proves reachability.**

### 🔄 UPDATED

**[FU-OPS-SCRIPTS-PATH-COUPLING]** — partially addressed. #516 cleared every tutor-adjacent coupling, but **the general hardening pass remains open**: ops scripts still hard-read product files by path and none are CI-gated, so the coupling keeps rotting invisibly. #516 also surfaced a *second* form: scripts that **spawn** other scripts by path (8 found), and a runner that **imports** a journey by path. Any future hardening should cover invocation, not just reads.

**[FU-APP-TSX-FROZEN-RESIDUE]** — now **three** lanes have left residue behind the same over-broad `App.tsx` zero-diff freeze: MockBuilder's inert `navigateToMockBuilder` case, the inert `/onboarding` route, and now the tutor cluster's stale `MentorPanel`/`TeachFlow` comments. **Merge with `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]` into ONE "narrow the freeze and sweep the residue" item** — the argument for narrowing it is now three lanes strong.

**[FU-MASTERY-WRITE-ORPHAN]** — still informational, now definite: the old tutor was the last live writer of `saveTopicMasterySnapshot`, so topic mastery is write-never / read-only-empty. Nothing breaks (readers already tolerate empty). **`topicHubMastery` remains UNTOUCHED — owner is still holding the mastery decision, whose audit is delivered and now unblocked.**

### 📌 KNOWN RESIDUE left deliberately by #516 (all flagged at review, none functional)
- `backlog_1_19_acceptance.mjs` keeps an unused `extractMentorStructured` helper (`.mjs` has no `noUnusedLocals`).
- `export_repo_details.ps1` keeps an `rg` search pattern that now matches nothing — degrades to an honest empty report section.
- `NoteModal.tsx`, `NcertPageModal.tsx` and `PracticePage.tsx` carry prose citing `ConceptTeachDrawer` as an overlay-grammar reference. Left rather than touch live files for comments.

---

## 2026-07-21 -- #515: WAVE-3 (3 lanes) - 3 FUs resolved, ~7 stale entries TOMBSTONE-CLOSED, 4 opened (trunk `a40fa75`)

### ✅ RESOLVED BY #515

**[FU-TSCONFIG-EXCLUDES-TESTS] — ✅ RESOLVED.** Test files are now typechecked, via a **separate `lazytopper/tsconfig.test.json`** (+ `typecheck:test` script + a CI step), not by widening the app config. `tsconfig.app.json` is the project `vite build` runs, so widening it would have pulled the test files, the `vitest/globals` + jest-dom ambients and `allowJs` into the **product** build's program — letting product source compile against globals that do not exist at runtime. The test project `extends` it, so tests still inherit `strict`; the app config is **byte-unchanged**.
**★★ This FU's own diagnosis was wrong and the correction is the durable part.** It recorded "exactly one error" (a `TS7016` on the parity test's `.cjs` import). Enumerating first found **15 errors across 7 files**, plus **8 more masked until `allowJs` removed the `any`**: 13 × TS7016 across **6 distinct** untyped server modules, 9 control-flow artifacts (`let x: T | null = null` assigned only inside a callback), and one genuinely unused import. **None were product bugs.** A lane that trusted the FU would have shipped a gate that did not compile. **Re-derive a follow-up's load-bearing counts before planning around them.**
**★ `.d.ts` shim rejected on a hard ground, not taste:** an ambient `declare module` **cannot match a relative specifier** like `"../../server/routes/checkSolution.cjs"`, so a shim would have meant six sibling `.d.cts` files inside `server/`. `allowJs` + `checkJs:false` infers shapes from the real implementation instead.
**★ Gate mutation-proven** (deliberate `TS2322` → exit 2) and **confirmed to have RUN in CI** by reading the job log, not the tick.

**[FU-PRACTICE-CONTROLS-REFRESH-STALE] — ✅ RESOLVED.** "Refresh set" now routes through `buildFreshSet()`. Root cause confirmed by live trace, not inference: `rotationOffset = sessionRotationOffset(topic, filterSignature, sessionStartedAt) + freshSetNonce`, and the button moved **none** of the three inputs — it was the **only** trigger of a bare regenerate that moved nothing (`applyPreset`/`onBuildSet` commit filters first, moving `filterSignature`). Trace: pool=5, set #1 = set #2 = `[1,2,3,4,0]`.
**★ The owner's "don't blind-route it" ruling was honoured by MEASURING the alternative.** A nonce-only re-shuffle was tested and rejected with numbers: `selectInRangeFromPool` rotates the unseen partition LEFT by the offset, so `+1` on an all-unseen 25-pool slides the window by exactly one and **4 of 5 questions return** — still a broken button.
**★ `Alt+R`, the keyboard twin, had the identical defect** and was not in the brief. `PracticeControls.tsx` stayed untouched (pure presenter). Normal build path byte-identical, pinned by a NO-REGRESSION test that mutation exposed as **insensitive** in its first form and which was rebuilt to actually fail.

**[FU-BANK-GARBLED-ANSWER-CLASS] — ✅ RESOLVED for the 26-row recovered subset; 3 rows WITHHELD remain open.**
**★★ The corruption was never OCR.** Every affected `answer` is a dump of the official CBSE **marking scheme**, which renders fractions as **stacked glyphs** — a flat extractor stops at the line break and truncates at the `=` before the fraction. Recovery had to be **coordinate-aware** (`page.get_drawings()`, numerator = above the bar; mark-allocation column discarded). **Load-bearing:** in MS 30/4/1 2022-23 Q24 the flat reading order emits `4` before `3`, but the bboxes prove **3/4** — a naive line-join would have shipped **4/3**.
**★★ The brief's source path was wrong** — `PYQ/X question papers/` holds question papers, not marking schemes, and its 2025/26 maths PDFs are image-only. Real sources: `cbse-papers/gdrive/PYQs/MS/final MS/<year>/MS/`.
**★★ Three questions were UNSOLVABLE as printed** and are now solvable: `PYQ-M-STAT-008` (8 classes / 7 frequencies), `PYQ-M-2024-STAT-003` (7 classes / 6 frequencies; `f = 6` now **source-confirmed**, previously inferred), `PYQ-M-2026-PROB-002` (stem's "4 5 times" is **5/4** by bbox; only 5/4 yields `m = 12`). And **`PYQ-M-2024-STAT-004`'s stored solution answered the WRONG question** — a garbled stem silently corrupts the solution authored against it.
**★ `PYQ-M-2026-CG-002` RETIRED, not re-keyed** — its stem welded 30/5/1 Q35 (circle/tangent) to Q33(b) (parallelogram proof), and Q35 is **already served cleanly by `PYQ-M-2026-CIRC-006`**, so the obvious repair would have minted a near-duplicate. No tombstone convention exists in this bank, so retirement is row deletion + an in-file pointer comment.
**★ STILL OPEN — the 3 WITHHELD rows:** `PYQ-S-ELEC-004` (science; not investigated this pass — recoverable in a follow-up) and **`SCQ-S-ELEC-036`, PERMANENTLY withheld** — no PYQ source exists and it cannot be fixed without inventing I-V values. **A withheld row is honest; a guessed one is fabrication.**
**Owner ruling: the 26 recovered rows enter the STUDENT-QA QUEUE as the final content gate on question quality.**

### 🪦 TOMBSTONE-CLOSED (no code — ledger hygiene)

**[FU-CI-GATE-VITEST] — 🪦 RESOLVED BY #509; all remaining open entries are CLOSED.** The board still carried this item **~7 times** across historical sections, each describing the pre-#509 world ("CI runs the matrices, not vitest"). That has been false since #509 wired a strict `vitest run` with **zero `--exclude`**; the four formerly local-only suites (routingParity, fullTestNav, multiTopicNav, aliveness) run and pass in CI. **#515's own CI run confirms it live: 61 files / 792 tests.** Those ~7 entries are historical record, not open work — **do not re-open them.** The item inflated the backlog and, worse, invited a lane to "fix" something already fixed.
**★ The genuinely remaining gap was never "run the tests" — it was that nothing TYPECHECKED them.** That is `[FU-TSCONFIG-EXCLUDES-TESTS]`, resolved above.

### 🆕 NEW FOLLOW-UPS

**[FU-BANK-GARBLED-EXPANDED-SCOPE] — 🆕 OPENED (M, PRE-LAUNCH). The real size of the damage class.**
Bank-wide there are **89 rows** carrying Private-Use-Area / U+FFFD glyphs and **82** with dangling-operator `answer` fields, across **141 files**. #515 recovered 26; **~61 remain.** Includes `PYQ-M-QE-001` and `PYQ-M-QE-002`, confirmed to carry the same garbled-MCQ-options defect (distractors stripped of minus signs and trailing `= 0`) but out of #515's scope.
**Method is proven and must be reused, not re-derived:** coordinate-aware **pymupdf** (`pdfplumber` remains BANNED — it *caused* this class), marking schemes at `cbse-papers/gdrive/PYQs/MS/final MS/<year>/MS/`, per-row paper+page citation, **never guess a distractor or stem**, unrecoverable → WITHHELD. Report the candidate list **before** authoring; the owner is the NCERT authority. Recovered rows then go to student-QA.

**[FU-MOJIBAKE-GATE-MISSES-PUA] — 🆕 OPENED (S). The gate that should have caught this is blind to it.**
`check:mojibake` does **not** detect Private-Use-Area codepoints, which is why 89 rows of PUA damage survived every prior sweep while the gate stayed green. Extend it to the PUA range (U+E000–U+F8FF) and U+FFFD.
**★ Mutation-test the extension.** #515's own PUA checker was **silently vacuous on v1** — its codepoint range collapsed to a literal `-` on write (the Write/Edit escape-decoding hazard) and its truncation regex matched every `id: "`, so it flagged all 26 rows while asserting nothing. The rebuilt version carries a **self-test injecting a known U+F0DE and a dangling operator, requiring both to be caught**. A content gate that cannot be shown to fail is not a gate.

**[FU-TSCONFIG-TEST-2FILE-HOLE] — 🆕 OPENED (S). An honest, documented gap in the new typecheck gate.**
`src/services/geminiThinkingConfig.test.ts` and `src/services/stepSolutionCacheQualityGate.test.ts` are `exclude`d in `tsconfig.test.json` with a loud in-file comment. Both fail on **one TS control-flow artifact, not a product bug**: a `let captured: {...} | null = null` only ever assigned inside a callback, so TS narrows it to `null`/`never` at the assertion site. Fix is one line per declaration (`let captured = null as { status: number; body: any } | null;`); it lives **inside those test files**, which were outside #515's allowlist. **Delete both `exclude` entries in the same PR that applies the fix.**
Also relaxed for tests and worth restoring: `noUnusedLocals` / `noUnusedParameters` are off **solely** because `QuickPracticePresets.test.tsx:18` imports `questionMatchesFilters` and never uses it. Clean that and both flags can go back on.

**[FU-CANONICAL-STALE-RETIRED-ID] — 🆕 OPENED (XS, cosmetic). A retired id left in a forbidden file.**
`PYQ-M-2026-CG-002` is still listed in `CLASS_B_STEPPED_SOLUTION_IDS` at `canonicalQuestionBank.ts:1925`, after the row itself was retired in #515. **Left deliberately** — that file is globally forbidden (CLAUDE.md §4), and the id is **verified inert**: the array only spreads into `AI_GENERATED_SOLUTION_IDS`, a `Set` used for membership lookup (rank demotion), and **nothing in either matrix asserts its members exist**. All gates pass with it present. **Owner endorsed not touching a forbidden file for an inert id.** Sweep it whenever that file is legitimately opened — a natural companion to the merged "unfreeze App.tsx and sweep the residue" item.

### ⚠️ PROCESS ITEM — NOT A CODE FU, BUT IT COST THIS WAVE TWICE

**Parallel-lane orchestration needs its own ASSEMBLY gate pass.** All three #515 lanes reported green and stayed in their allowlists; the PR would still have merged with a red local bar. Two failures are **structurally invisible to a subagent**:
1. **`scope:guard` classifies the whole working tree**, so it is only meaningful once the lanes are assembled — and it is **LOCAL-only, not in CI**. It failed on `[unclassified] tsconfig.test.json` because `repo_boundary_policy.json` enumerates tsconfigs **by exact name**; any NEW tsconfig will hit this again.
2. **`base...HEAD` guards are vacuous pre-commit** (#488, #496, now #515 — third time). They must be re-run **after** committing.
**★★ And these two are MIRRORS: `scope:guard`'s meaningful run is PRE-commit; the matrices' is POST-commit.** Ask what range a gate inspects before trusting its green.
**★ Related trap:** root `.gitignore:49` ignores `lazytopper/docs/project_memory/`, so `git add` on `repo_boundary_policy.json` warns and **exits non-zero**, silently short-circuiting an `&&`-chained commit. The file **is** tracked — `c7d742f` restored it precisely because untracking it once **disarmed scope:guard**. Verify `git log --oneline -1` after a chained commit.

---

## 2026-07-21 -- #512: OLD TUTOR RETIRED + ONBOARDING→HOME - 2 FUs resolved, 1 HALF-resolved, 3 opened (trunk `e19b2d1`)

### ✅ RESOLVED BY #512

**[FU-LOGIN-HASPROFILE-DEAD-KEY] — ✅ RESOLVED.** `Login.tsx` gated its post-login redirect on `hasProfile`, which read the **bare** key `lazytopper.profile.v2`; `studentCloudStore.ts:23` only ever writes the **uid-suffixed** `lazytopper.profile.v2:<uid>`. The flag was **permanently `false`**, so `return hasProfile ? "/" : "/onboarding"` **always** returned `/onboarding` — for returning students as well as new ones. That is the off-brand dark screen students reported. The gate is deleted (not repointed) because it carried no information; the fallback is now unconditionally `/`.
**★ Record the CLASS, not just the fix:** a bare key read against a prefixed key that is only ever written with a suffix fails **silently and permanently** — no error, no warning, just a flag that is always falsy. Worth grepping for the same shape elsewhere.

**[FU-REFERRAL-CREDIT-ORPHAN] — ✅ RESOLVED, and it turned out to be TWO defects.**
1. *The orphan:* `creditPendingReferral` had exactly one caller — `Onboarding.tsx:99`, inside the page being retired — while capture stayed live at `App.tsx:558`. Retiring the page would have left referrals **captured but never credited**, with no error surface. Relocated to the auth-success effects of **both** `Login.tsx` and `SignUpPage.tsx`.
2. **★★ *The latent double-credit:*** the old argument was a fresh `` `user_${Date.now()}` `` string. `addReferralToCode:88` dedups on `referrals.includes(friendIdentifier)` — **a fresh timestamp can never match an existing entry, so the dedup was inert and one student could be credited more than once.** The real Firebase `uid` is stable, so the existing dedup now actually holds. **This was not in the brief; "use a better identifier" turned out to be a correctness fix.**

**Why BOTH pages, not just SignUpPage:** `AuthContext` exposes **no new-user signal** — `signInWithGoogle` is a bare `signInWithPopup` and `signUpWithEmailPassword` discards the credential, so `additionalUserInfo.isNewUser` is not plumbed anywhere. A Google-first signup can complete on either page. Covering both is what makes "credits once per signup" true; the function's own two guards make it safe. **Owner live-verified the credits-once path.**

### 🟡 HALF-RESOLVED BY #512

**[FU-TUTOR-LEGACY-RETIRE] — 🟡 HALF DONE. Behaviour shipped; the deletions are PR-2 and have NOT started.**
The old `ConceptTeachDrawer` "Teach me" entry is **gone from the live product** — it was **LIVE, not latent** (an unconditional button on every Topic Hub concept row, beside the new "Stuck? Ask"), so this half was a **product removal, not a cleanup**. The **files remain on disk**, now imported only by each other.
**PR-2 remit:** delete `ConceptTeachDrawer`, `TeachFlow`, `TutorDrawerV2`, `MentorPanel`, `TutorMessageRenderer`, `tutorStructuredExtract` **and `pages/TopicHub.tsx`** (forced — it imports `ConceptTeachDrawer`), then retire/repair the ops scripts. ~~**KEEP** `/api/mentor` + `types/mentor.ts` + `MentorSolveDrawer` (LIVE in `PracticePage`)~~ — **CORRECTED by #516: `/api/mentor` + `MentorSolveDrawer` — **BOTH DELETED by #516. The "LIVE in PracticePage" claim recorded here was FALSE**: the drawer was MOUNTED but unreachable (its only trigger prop arrived as an unused `_onOpenMentorBoard`), and `/api/mentor` had no product caller left once the old tutor died.** The new `/tutor` stack is kept.

### 🆕 NEW FOLLOW-UPS

**[FU-OPS-SCRIPTS-PATH-COUPLING] — 🆕 OPENED (and it is far bigger than the prior audit estimated).**
**16 `scripts/ops/*.mjs` hard-`readText` a to-be-deleted path** (~15 npm entries); ~27 files reference one. `readText` is `fs.readFile` ⇒ **ENOENT throw** the moment a target is deleted. **None are CI-gated**, so they rot invisibly — which is exactly why the coupling went unnoticed until a deletion was attempted.
- **Wholly-dead** (assert only on the retired surface): `topichub_doc_alignment_acceptance`, `triangles_human_tutor_acceptance`, `topichub_human_tutor_all_topics_acceptance`, `topichub_intended_functionality_acceptance`, `topic_grind_contracts_acceptance`, `student_bots/*` (×6), `tutor_bots/*` (×2).
- **Mixed** (retired-surface hunks inside otherwise-live scripts): `backlog_1_19_acceptance`, `ux_priority_step_acceptance`, `student_bots_product_experience_acceptance`, `feature_file_matrix`, `agent3_uiux_guard`, `triangles_audit`, `repo_deep_audit`.
- **★★ DO NOT "fix" this by hardening `readText` to return `""` on ENOENT.** Owner-rejected: every assertion on the deleted surface would pass **vacuously**. PR-2 retires the dead and surgically fixes the mixed — a content decision, owner-reviewed.
- **★ Verified NOT a CI problem:** all 14 `test:matrix:all` scripts were enumerated; **zero** overlap. `topickey_guard_acceptance.mjs:115` names `pages/TopicHub.tsx` but only as a `B_ALLOW` **skip**-list entry consulted while walking files that *exist* — a deleted file is never walked, so no read and no ENOENT. (Stale allowlist line worth a 1-line tidy in PR-2; nothing asserts on `B_ALLOW.size`.)

**[FU-APP-TSX-FROZEN-RESIDUE] — 🆕 OPENED. ★ Should be MERGED with `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]` into ONE item.**
The inert `/onboarding` route, its `import Onboarding`, and `pages/Onboarding.tsx` itself survive **only** because `App.tsx` is frozen zero-diff by `check_improve_overlay_additive_acceptance` + `quick_practice_overlay_additive_acceptance`, both inside the CI-gated `test:matrix:all`. Identical in shape to the inert `navigateToMockBuilder` case left by #505. **Two lanes have now each left residue behind the same over-broad freeze — that is the argument for narrowing it** (from "App.tsx zero-diff" to "the relevant route elements unchanged") in one deliberate, owner-approved PR.
*Silver lining, and the reason Option B is not merely a dodge:* because `Onboarding.tsx` survives, `backlog_1_19_acceptance.mjs:120` — which hard-reads it — keeps working.

**[FU-MASTERY-WRITE-ORPHAN] — 🆕 OPENED (informational; OWNER IS HOLDING THE DECISION).**
`TeachFlow` was the last live caller of `saveTopicMasterySnapshot` (the only other writers, `DailyMissionPage`/`DailyMixPage`, are retired). After #512 the old tutor's mastery **write** is unreachable ⇒ topic mastery is **write-never, read-only-empty**. **Nothing breaks** — every reader already tolerates empty, since the page-writers died earlier — and an empty snapshot is an honest empty state, not fabricated data. **`topicHubMastery` is NOT deleted and NOT unwired; do not touch it in PR-2.** A separate mastery-retirement audit already exists for when the owner rules.

### ⏸ CONFIRMED STILL OPEN — deliberately NOT fixed in #512

**[FU-SIGNUP-UNSAFE-REDIRECT]** — `SignUpPage.tsx:52` returns `st.from` **without** `isSafeInternalPath`, unlike `Login.tsx:865-868`. Doctrine says "safe redirects always", so this is a real violation — but **pre-existing, and an auth-security fix does not belong inside a retirement PR** where it would be reviewed as a redirect tweak. Its own small PR. Noted in-code so the next reader sees it is known, not missed.

---

## 2026-07-21 -- #511: THE 223 UNDER-STEPPED D/E SOLUTIONS STEP-MARKED - Class (b) RESOLVED, 1 new FU opened (trunk `856d556`)

### ✅ RESOLVED BY #511

**[FU-BANK-SCARCE-BAND-MISBANDING] — ✅ FULLY RESOLVED. Class (a) by #504, Class (b) by #511. The lane is CLOSED end-to-end; do not re-open either class.**
**Class (b) was a DIFFERENT defect from Class (a) — the distinction is the whole point of the split.** Class (a) rows were *mis-banded* (objective/short items sitting at a bogus `D/5`) and needed **relabelling**. Class (b) rows were **correctly banded all along** — genuine 5-mark Section-D long answers and 4-mark Section-E case-based items — and needed their **marking scheme authored**. 223 rows across 25 topics: `solutionSteps` were collapsed (**109 held their entire solution in ONE run-on step**), below the CBSE §13 minimum depth (D=5, E=4), or carried per-step marks that did not sum. All now carry `[N mark]` prefixes summing exactly to marks; multi-part rows may exceed the minimum counts (floors, not caps).
- **Validator:** thin 220→**0**, bad-sum 3→**0**, fully compliant 1,137→**1,360** (+223). D+E total 2,167 unchanged.
- **The count reconciles:** the recorded "~178" was a regex file-scan estimate; the in-memory audit of the real export found 220 thin + 3 bad-sum = 223. Against 254 recorded D+E violators, the 31-row remainder is exactly the Class-a/already-compliant set, correctly excluded.
- **Anti-fabrication, proven semantically:** the assembled `canonicalQuestionBank` export was dumped at trunk and post-edit and deep-compared field-by-field across **all 8,584 rows** — `changedFields {solutionSteps:223, finalAnswer:70}`, `forbiddenFieldChanges []`, `changesOutsideThe223 []`, `idsAdded/Removed []`, `targetsUnchanged []`. Owner independently byte-verified the same property against the pushed diff.
- **Provenance:** 223 ids in `CLASS_B_STEPPED_SOLUTION_IDS` → `AI_GENERATED_SOLUTION_IDS` (rank-demoted below authentic, auditable). The one line outside `data/questionBanks/**`, flagged before authoring and owner-confirmed.

**★★ CONTENT DEFECTS SURFACED AND FIXED IN #511 — worth recording, because the collapsed format is what hid them.** These were not formatting problems; a run-on paragraph makes wrongness invisible:
- **`SCQ-S-ELEC-036`** — stored solution belonged to an **entirely different question** (a series-circuit experiment sitting on an I–V graph question). Replaced with a correct solve (R = 5 Ω).
- **`PYQ-M-2026-AP-001`** — carried a **statistics mean/mode solution on an A.P. kolam question**. Replaced with the correct A.P. solve (a=4, d=4, Sₙ=220 ⇒ n=10).
- **`SCQ-S-CHEM-038`** — **unbalanced** combustion equation (CH₄ + O₂ → CO₂ + 2H₂O); corrected to CH₄ + 2O₂.
- **`PYQ-M-2026-CIRC-006`** — the source's own embedded equation `(12−x)=x+8` was **mathematically wrong** (ignored Pythagoras); corrected to AB = 20/3 cm, PA = 26/3 cm. **Independently corroborated** by a second batch reaching identical values from `PYQ-M-2026-CG-002` — the corroboration is why this is a correction and not one agent's opinion.
- **`PYQ-M-2025-AP-002`** — arithmetic error: S₆ = 3 × (600 + 250) = **2550 m**, not the OCR'd 2250 m.
- **`STAT-N-EXEM-13-LA-001`** — rounding slip: 18720/110 = **₹170.18**, not ₹170.20.
- **`SCQ-S-HERED-042`** — entire solution was the literal string `"[Sample Paper 2010]"`; full sex-determination answer authored.
- `WWW.CBSE.ONLINE` disclaimer junk stripped from inside `solutionSteps` on several rows.

**[FU-AITIER-MARKS-MISMATCH]** — remains resolved (by #504); untouched here. `PACK_5MK_SHORT_BACKLOG` stays empty and the guard stays live.

### 🆕 NEW FOLLOW-UP

- **[FU-BANK-GARBLED-ANSWER-CLASS] (M, PRE-LAUNCH) — the QUESTION-side twin of what #511 fixed on the SOLUTION side.** #511 could clean `solutionSteps` and `finalAnswer` only; the raw `answer` and `questionText` fields were untouchable by construction, and on ~15 rows they are still OCR garbage. **This is correctly a separate lane: #511 authors SOLUTIONS; these are QUESTION-defects, and editing a question is the fabrication line.** Recovery needs the source papers, **pymupdf** (`pdfplumber` remains BANNED — it caused this damage class), and **never guessing a distractor**.
  - **Garbled `answer` fields:** SAV / STAT / PROB / QE PYQ rows — chiefly `PYQ-M-SAV-002/003/004/005`, `PYQ-M-2024-STAT-003/004/005`, `PYQ-M-2025-STAT-*`, `PYQ-M-2024-PROB-005`, `PYQ-M-2024-QE-004b/005a/006a`, `PYQ-M-2026-POLY-004`. Their `finalAnswer` is now clean and correct, so **the student-facing answer is fine today** — this is a data-hygiene and future-regrading concern, not a live wrong-answer bug.
  - **⚑ `PYQ-M-2026-CG-002` — the worst one: `questionText` WELDS TWO UNRELATED PROBLEMS** (a circle/tangent problem + a parallelogram-midpoint proof). The #511 solution was written around the marking-scheme numbers with an explicit grounding doubt recorded. **Re-extract or withhold this row.**
  - **`PYQ-M-2024-STAT-004`** — questionText parts (ii)/(iii) unreadable; only the evidenced part (modal class, mode ≈ 22.80) could be solved. **`PYQ-M-2024-STAT-003`** — frequency list truncated; the standard CBSE 30/4/3 distribution was *inferred* (yields a clean f = 6 consistent with mean 36.10) — verify against the source. **`PYQ-S-ELEC-004`** — part (a) truncated to `"(a) ."`. **`SCQ-S-ELEC-036`** — the I–V table's last two pairs break the linearity of the first six; likely OCR error.
  - **Two smaller items found in passing, deliberately NOT fixed** (out of scope, both need an owner ruling): **`PYQ-M-2024-STAT-002`**'s `finalAnswer` says mode 36.81 where the working gives **36.82** (left alone — not "plainly wrong"); and **`PYQ-M-TRI-006`** is filed under `topicKey: triangles` but is a **coordinate-geometry** case study.

### ⚠ CARRY-FORWARD — the excluded class, recorded so nobody "discovers" it as a bug

- **807 D/E rows have full-depth solutions but no `[N mark]` tags.** Deliberately excluded from #511 — a much larger, cosmetic-leaning class (the solutions are complete and correct; only the per-step mark allocation is absent). Verified untouched by #511. **If this is ever taken on, it is its own lane with its own byte-review budget — do not fold it into a topic batch.**

---

## 2026-07-21 -- #509: FRESH-SET FIXED + ALL 4 RED SUITES REPAIRED - 5 FUs RESOLVED, 3 new FUs opened (trunk `41277c1`)

**[FU-PRACTICE-FRESH-SET-NOT-FRESH] — RESOLVED by #509, owner LIVE-VERIFIED.** (Owner-reported directly; opened and closed in the same wave, so it has no prior entry here.) The scorecard's "Build a fresh set" returned the SAME questions. A TRIGGER bug, not a missing feature — **both** inputs were immovable: (A) the rotation seed cannot advance in-session (`sessionStartedAt` is a mount-once `useState`), and (B) the seen-set is never **populated** — *not* cleared, as first hypothesised — because its loader effect has no `regenerationKey` dep. Fixed by a `freshSetNonce` on `rotationOffset` (+0 on every existing path) plus `buildFreshSet()` carrying the just-displayed ids into `seenQuestionIds`. Full record in `CURRENT_STATE` / `SESSION_LOG`.

**[FU-CONCEPTSPINE-TEST-STALE], [FU-OBJSCORING-PARITY-TEST-RED], [FU-PRACTICEINSIGHTS-DURABLE-RED], [FU-WORKSHEET-PDFEXPORT-TEST-RED] — ALL FOUR RESOLVED by #509.** Every `--exclude` line is deleted from `quality-gate.yml`; the step is now plainly `vitest run` and **the gate is fully strict**. All four were TEST-side defects — no product bug was hiding behind any of them, and no product code was changed to make a test pass. Linux CI observed **60 files / 789 tests** (59 + the new fresh-set suite), each repaired suite named with its count.

⚠ **Two of the four diagnoses recorded by #503 were WRONG, and the corrections are worth keeping:** the parity suite's `.cjs` import resolves fine (the broken one was the **TS twin's** `../../lib/…` path — the suite had never run since #348); and `practiceInsights.durable` never contained a "firestore down" mock at all (that string lives in `worksheetGradeService.test.ts`) — it was a stale expectation, because #445 deliberately dropped `mode` from the attempt dedup key.

Three follow-ups fall out:

- **[FU-PRACTICE-CONTROLS-REFRESH-STALE] — OPEN (owner ruled it OUT of #509).** `PracticeControls`' **"Refresh set"** button still calls the bare `regenerateQuestions()`, so it carries exactly the same latent staleness the scorecard CTA had. Its handler lives inside `PracticePage` (so it was technically in #509's allowlist) but routing it through `buildFreshSet` would have changed the normal build path, which that PR's brief forbade. **Owner's ruling: fix it as a tiny fast-follow with its OWN runtime trace + regression test — do NOT blind-route it through `buildFreshSet`.** It may legitimately want different semantics from "build a fresh set".
- **[FU-TSCONFIG-EXCLUDES-TESTS] — OPEN.** `lazytopper/tsconfig.app.json` sets `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"]`, so **no CI gate typechecks test files at all** — a green `tsc` says nothing about them, and vitest is their only oracle. **This is the root reason the four suites above rotted silently.** Typechecking the four explicitly surfaced exactly one error, pre-existing and inherent: `TS7016` on the parity test's deliberately-untyped `.cjs` import — so bringing tests under `tsc` is close to free, but needs a decision on how to type that import (and on whether a separate tsconfig project beats widening the app one).
- **[FU-PRACTICEINSIGHTS-STALE-COMMENT] — OPEN (one line).** `lazytopper/src/services/practiceInsights.ts:292` still documents the key as `` `uid::qid::scored/available::mode` `` — stale since #445 dropped `mode`. Comment-only; outside #509's allowlist, so correctly left alone.
- **[FU-HANDOFF-MOJIBAKE-LEGACY] — OPEN (low priority, discovered while writing this handoff).** `handoff/CURRENT_STATE.md` carries ~**600** double-encoded sequences (`â€"` for `—`, etc.) in its older entries; `OPEN_QUESTIONS_AND_FOLLOWUPS.md` has 2 (and `SESSION_LOG.md`'s single hit is a *deliberate* mojibake example inside a lesson about mojibake — leave it). The `check:mojibake` gate only scans `lazytopper/`, so `handoff/` has never been covered. The #509 handoff fixed exactly one (the `CURRENT_STATE` title line) and introduced none. A mechanical sweep + extending the gate to `handoff/` would close it — deliberately NOT bundled here, since a 600-line encoding rewrite would have swamped a docs PR that needed byte-review.

## 2026-07-21 -- #505: MOCKBUILDER FEATURE FULLY DELETED - [FU-MOCKBUILDER-FULL-DELETE] RESOLVED, 2 new FUs opened (trunk `b810055`)

**[FU-MOCKBUILDER-FULL-DELETE] — RESOLVED by #505.** The whole mock-builder feature is removed (HPQ Mock-basket, StudyPlanPage "Quick mock" button, `buildMockBuilderUrl`, the command-palette "Build a Mock Paper" entry) plus three breakage-audit cleanups (A-1 the orphaned `mock_builder` paywall gate in `featureGates.ts`; A-2 the dead `utils/mockBuilder.ts` + its `syllabusGuard.ts` allowlist entry; A-3 the stale `sitemap.xml` URL). The `/mock-builder`→`/practice-hub` redirect + `:356` nav-check are KEPT. Full record in `CURRENT_STATE` / `SESSION_LOG`. Two follow-ups fall out of it:

- **[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE] — OPEN.** #505 LEFT one inert line in `App.tsx`: the dead `case 'navigateToMockBuilder':` (its only dispatcher, the palette entry, was removed, so nothing reaches it). It was left because deleting it turns CI **red**: two ops gates — `quick_practice_overlay_additive_acceptance.mjs` (:324/:348) and `check_improve_overlay_additive_acceptance.mjs` (:269/:293) — freeze `lazytopper/src/App.tsx` to **zero-diff vs base** (`git diff --name-only base...HEAD`). That freeze is **over-broad**: those lanes (#490/#476) only ever cared that the `/practice` + `/check-improve` route ELEMENTS were untouched, not the whole file. **The fix = a dedicated App.tsx-scoped PR** that (a) removes the inert dead case AND (b) narrows both gates' assertion from "App.tsx zero-diff" to "the `/practice` + `/check-improve` `<Route>` elements unchanged" — done with #490/#476 intent preserved and their own re-review. NOT bundled into a deletion.
- **[FU-HPQ-PREDICTED-MOCK] — OPEN (approved design, its own PR).** Add ONE additive option on BOTH the Full Mock and Chapter Test surfaces: same runner, same blueprint (real board-shape paper), same scoring — only the source-pool **ordering** becomes prediction-weighted. Design (owner-approved): add an optional `rankBy?` comparator to the shared `drawBalancedSet` (`utils/balancedMockDraw.ts` — used by BOTH `fullMockBlueprint.ts` `drawFullMock` and `chapterTestBlueprint.ts` `drawChapterTest`; replace the two `seededShuffle`s with a stable score-sort, ties → the existing seeded order, so PYQ/fresh balancing + determinism hold), thread an `ordering: "blueprint" | "predicted"` flag through both engines (Full Mock must carry `predictionScore` through the `FMPoolQuestion` map, which currently drops it; Chapter Test's raw `CanonicalQuestion` pool carries it already), rank by `getAdjustedScore` (`predictionCore.ts:309` — degrades gracefully where the raw `predictionScore` is sparse; seeds only from EXISTING bank questions, never invents), and surface one additive toggle per surface (Full Mock `ModeCard` `extra` slot; Chapter Test setup card by the timer toggle). Existing modes stay **byte-identical** when the flag is absent. Needs its own PR + a FULL Full Mock live-verify (both blueprint AND predicted modes).

## 2026-07-21 -- #503: VITEST GATED IN CI - [FU-CI-GATE-VITEST] RESOLVED, 4 new test-fix FUs opened (trunk `579822e`)

**[FU-CI-GATE-VITEST] — RESOLVED by #503.** The `src/**/*.test.{ts,tsx}` vitest suites now run as a required `Vitest suites (lazytopper)` step in the repo-root `quality-gate.yml`, on the linux runner (where the rollup binary works; Windows can't run vitest). Infra-only, +24, one file, zero product `src/`. Was never a platform problem - CI is linux - just an unwired step. Full record in `SESSION_LOG` / `CURRENT_STATE`.

**Four suites were already silently RED on trunk and are `--exclude`'d — each is a NEW follow-up (a small product/test lane), and each ENDS by deleting its `--exclude` line from `quality-gate.yml`. Confirmed RED on the real linux runner via a temporary, reverted `continue-on-error` diagnostic step (`Test Files 4 failed / Tests 7 failed | 26 passed`); none unexpectedly green.**

- **[FU-CONCEPTSPINE-TEST-STALE] — ✅ RESOLVED by #509 (see the #509 block above).** *(Diagnosis below was correct.)* `src/components/topichub/ConceptSpine.test.tsx` — the "Notes is an honest 'coming soon' container" case asserts text (`/Notes coming soon/`) the component no longer renders (data-drift after #337 seeded real boardEssentials). Fix the test to the current Notes behaviour, then delete its `--exclude`.
- **[FU-OBJSCORING-PARITY-TEST-RED] — ✅ RESOLVED by #509. ⚠ THE DIAGNOSIS BELOW WAS WRONG:** the `.cjs` import resolves fine; the broken import was the **TS twin's** (`../../lib/…` from `src/services/` → a nonexistent `lazytopper/lib/`). Kept verbatim as a record of how a plausible theory outlived the evidence inside it. `src/services/objectiveScoring.parity.test.ts` fails at COLLECTION: Vite can't load the sibling root module it imports on line 9 (`../../server/routes/objectiveScoring.cjs`) — the error surfaces on the adjacent `../../lib/objectiveScoring` import though `src/lib/objectiveScoring.ts` exists, i.e. a `.cjs`-into-jsdom resolution gap, deterministic on linux. Either make Vite/vitest resolve the root `.cjs` (alias / transform) or restructure the parity import, then delete its `--exclude`. (This test exists to prove the TS grader and the CJS server route score MCQ/AR identically — worth keeping, not deleting.)
- **[FU-PRACTICEINSIGHTS-DURABLE-RED] — ✅ RESOLVED by #509. ⚠ THE DIAGNOSIS BELOW WAS WRONG:** there is no "firestore down" mock in this suite (that string lives in `worksheetGradeService.test.ts`). It was a stale expectation — #445 deliberately dropped `mode` from the dedup key. `src/services/practiceInsights.durable.test.ts` — case "(a) writes one queryable doc at practiceInsights/{uid}/attempts/{id}" fails with `Error: firestore down` (the mock throws on the durable-subcollection write path). Deterministic. Fix the mock/write path, then delete its `--exclude`.
- **[FU-WORKSHEET-PDFEXPORT-TEST-RED] — ✅ RESOLVED by #509.** *(Two harness bugs: a post-teardown assertion, and `vi.restoreAllMocks()` stripping a `vi.fn().mockImplementation` jsPDF constructor.)* `src/components/worksheet/worksheetPdfExport.test.ts` — all 5 cases fail with `pdf.addImage is not a function` at `worksheetPdfExport.ts:147`. The test FULLY `vi.mock`s `jspdf` (the mock object provides `addImage`), so this is deterministic (not a canvas/environment artifact) and reproduces on linux — the source's jsPDF instance isn't the mocked one (likely a dynamic-import / interop mismatch the mock doesn't intercept). Fix the mock wiring (or the source's import), then delete its `--exclude`.

**⚠ Do NOT add new `--exclude` lines to `quality-gate.yml`.** The gate's contract is that the exclude list only ever SHRINKS. A newly-red suite must be fixed, not excluded.

---

## 2026-07-20 -- #501: QP SCORECARD DENOMINATOR FIXED + written-answer FU re-scoped (trunk `7979a89`)

**[FU-QP-SCORECARD-ATTEMPTS-WIPED] — RESOLVED by #501.** The QP scorecard "of N" read the OVER-FETCHED engine pool (`questions.length`) instead of the DISPLAYED set (`filteredQuestions.length`). Owner screenshot: a full-page 5-MCQ set showed "5 of 75 attempted" - attempts counted correctly (5 of 5), denominator wrong. Fixed at all FIVE scorecard-facing reads in `PracticePage.tsx`; forbidden `ResultsScorecard.tsx` / `scorecardVariants.ts` untouched. Owner LIVE-VERIFIED ("5 of 5"). Full record in the resolved block further down + `SESSION_LOG` / `CURRENT_STATE`. (Corrects the earlier "Refresh-set wipe" / `COUNT_SOFT_MAX` diagnosis - both wrong; the bug was the denominator, and it lives on the FULL-PAGE path, not the overlay.)

**[FU-QP-WRITTEN-BINARY-CHECK] — LOGGED, a PRODUCT-BEHAVIOUR lane (NOT a scorecard-feed fix).** Distinct from the denominator bug above. On a WRITTEN / subjective set, a student who works the question but never taps "Check my answer" leaves NO attempt signal (attempts register only from an MCQ-option click or a graded check), so the scorecard honestly reads "0 of N". Owner's ruling for the real fix: **written / subjective responses should be CHECKABLE and graded BINARY 0/1** (no step-marks in this context), and THAT check is what produces the attempt signal. A new answer-flow lane - it must NEVER fabricate an attempt (product doctrine). Out of scope for #501 (which fixed only the denominator). ⚠ Do NOT resurrect the earlier "attempted=0 is half the scorecard bug" framing - that was a written set constructed during investigation and corrected against the owner's MCQ screenshot; the written "0 of N" survives ONLY as a labeled test control (the denominator is displayed-independent of the attempt count).

---

## 2026-07-20 -- NEW FOLLOW-UP raised by the owner at the hub-lane close (trunk `6d991c0`)

**[FU-MOCKBUILDER-FULL-DELETE] — ✅ RESOLVED by #505 (see the 2026-07-21 #505 section at the top).** #498 deleted the mock-builder PAGE (`lazytopper/src/pages/MockBuilder.tsx`, 946 lines, zero module imports), which discharges `PR-G-deletion-pending` **for that file only**. The owner has raised the FULL feature deletion (PR-G-backed) as its own future lane.

**What #498 deliberately KEPT, and why — this is the actual scope of the remaining work.** The audit for #498 found the spec's assumption ("the `navigateToMockBuilder` plumbing is also dead") was **false**. All of the following are LIVE and route through the `/mock-builder` → `/practice-hub` redirect; removing any of them without a plan would break a working entry point:

- `services/commandPaletteConfig.ts:52-54` — the **"Build a Mock Paper"** command-palette entry (user-facing).
- `App.tsx:639` (`case 'navigateToMockBuilder'`) — that handler navigates **straight to `/practice-hub`**; it never reached the deleted page.
- `utils/buildUrl.ts:70` (`buildMockBuilderUrl`) — called from `StudyPlanPage.tsx:218` and `HighlyProbableQuestions.tsx:593`.
- `App.tsx:966-967` — the `/mock-builder` and `/mock-builder/:grade/:subject` redirects themselves.
- `scripts/ops/repo_deep_audit.mjs` — the `/mock-builder/:grade/:subject` ROUTE match (the file entries were removed in #498; the route match stays because the redirect is live).

**The real question for that lane is a PRODUCT one, not a cleanup one:** what should "Build a Mock Paper" (and the Study-Plan / HPQ entries) DO now that the mock-builder page is gone? Today they all land on `/practice-hub`, which is a reasonable destination but means the palette entry's LABEL promises something the product no longer has. Options: retire the palette entry and the two callers outright; or relabel them to what they now do (open the Practice hub); or point them at Full Test, which is the closest surviving capability. **Deleting the plumbing without answering that would silently remove a user-facing command.**

**Do NOT treat this as a mechanical delete.** The page was safe to remove precisely because nothing imported it; the plumbing is the opposite — nothing imports the page, but real UI still calls the URL.

---

## 2026-07-20 -- #492 → #494 → #496 → #498: THE PRACTICE-HUB v6 REDESIGN (trunk `6d991c0`), owner LIVE-VERIFIED — FU reconciliation

**[FU-HUB-CARD-ALIVENESS-GUARD] — RESOLVED by #496.** The #492 grey-out passed every gate — tsc, both matrices, all three routing tests — with the cards fully dimmed. `DesktopPracticePage.aliveness.test.tsx` now asserts the ARRIVAL state (signed-out, no topic picked): no mode card or scope card carries `opacity < 1`; all four cards AGREE on opacity; each renders a stripe with a DISTINCT accent; and the gated CTA is still an inert `<span>`. **Mutation-verified** — re-introducing `opacity: disabled ? 0.65 : 1` turns it red.

**[FU-HUB-DROPDOWN-ZINDEX] — ★★ RESOLVED by #528 (trunk `7998ee4a`), owner LIVE-VERIFIED.** Fixed on the **header**: `position: relative; zIndex: 35`. `MobileAccountMenu` untouched.

**★★ THE PRESCRIPTION RECORDED BELOW AS "known, byte-reviewed" WAS WRONG — and so were BOTH of its bounds.** It proposed **`zIndex: 55`**. The real ceiling is **`.command-palette-backdrop`** (`styles.css:6494`, **z-index 50**, mounted at `App.tsx:821` as a **sibling of the shell**) — the palette **the header's own search box opens**. **55 > 50**, so that fix would have punched the header through the palette scrim: a live interaction, not a theoretical one. Its stated floor (*">50 — TrendsPage's filter dropdown"*) is **retired code** (`App.tsx:936`; `/trends` was severed for `/exam-trends`), and its stated ceiling (*"<60 — `TutorDrawerV2` / `MentorSolveDrawer`"*) was **void from #516**, which deleted both. **Two dead bounds that happened to bracket a number.** The brief's alternative — *"derive from the live full-screen overlay landscape"* (9998–10000) — points at ~1100 and is worse. **The diagnosis below was right; only the prescription was not.**

**Re-derived bounds (verified, #528):**

| Bound | Owner |
|---|---|
| **FLOOR > 30** | `Worksheets.tsx:484` — the highest z-index used by page **content** anywhere in the app; every other content value is ≤ 20. Clearing them all also clears the `z-index: auto` positioned cards that are the actual reported bug. |
| **CEIL < 50** | `.command-palette-backdrop` (`styles.css:6494`). Staying under it also keeps the header under `.lt-tutor-ov` (60) and the 9998–10000 band. |

**Band 31–49 is EMPTY** — the only value there is `.examples-modal-backdrop` (`styles.css:3657`), **dead CSS with zero consumers in `src/`**. Hence **35**: correct *and provable*, which "somewhere below 9998" never was. **A mutation test pinned at `zIndex: 1100` names that specific regression — do not delete it.**

**★★ MOBILE AND DESKTOP NEEDED DIFFERENT *SHAPES* OF FIX — state both invariants, never "we fixed the z-index".**
- **Mobile: "no trap ancestor."** `MobileHome`'s brand bar carries no `backdrop-filter`, so `MobileAccountMenu`'s `zIndex: 50` competes in the ROOT context and wins. Pinned by PR-A2's ancestor-walk test (`MobileHome.test.tsx:483`).
- **Desktop: "the trap must OUTRANK page content."** It **cannot** be mobile's, because the header's blur is **intended visual design** and cannot be removed.

Same symptom, opposite remedies. Whoever meets the next instance needs both sentences, not the outcome.

**★★ AND THE FIX CREATES A NEW TRAP IF ANYTHING IS MOUNTED INSIDE THE HEADER.** #528 mounts `TutorPickerModal` at the **shell root**, deliberately not inside `<header>`: there, `.lt-tutor-ov`'s `z-index: 60` resolves *inside the header's context* and would be **trapped under the header's new 35** — **fixing the stacking bug while shipping a fresh instance of it.** The header is also a **containing block for `position: fixed` descendants** (via `backdrop-filter`), so the overlay would have lost `inset: 0` too. Pinned by `picker.closest("header") === null`.

**★ NO OTHER SURFACE NEEDS THIS — which is what CLOSES this FU rather than deferring it.** Every `backdrop-filter` / `backdropFilter` in `src/` was enumerated and checked for a contained popover: `App.tsx:114` is `RouteFallback` (a loading card) · `Worksheets.tsx:480` and `styles.css:7009` are bottom action bars · `MiniMockPage.tsx:192` has no popover · `SignUpPage.tsx:139` is a card · `BreakReminder` / `BreathingMoment` / `celebrations.css` / `tutorOverlay.css` are self-contained full-screen overlays (intentional) · `MobileHome` has **no `backdropFilter` at all**. **Zero remaining trapped dropdowns.**

**★ The blocker below is gone.** #519 lifted the `DesktopShell.tsx` blanket ban (`check_improve_convergence_acceptance.mjs:482` is now a comment), and **#528 paid the other half of that trade**: the file went from **neither a ban nor a test** to **11 tests**, confirmed by name in CI's job log.

<details><summary><b>Original entry, retained</b> — the diagnosis was right, the prescription was not</summary>

- **Root cause (verified):** `DesktopShell`'s header sets `backdrop-filter: blur(12px)`, and a backdrop-filter other than `none` **creates a stacking context** — so the account menu's `zIndex: 50` only ever ordered it *within the header*. The header is also `position: static`, so its context paints at level 0; `<main>` follows it in DOM order, and the hub's scope card (`position: relative`) and mode cards (`transform`) paint in that same level but LATER.
- **Not the card transform.** Dropping the cards' resting `translateY(0)` would NOT fix it — the scope card's plain `position: relative` still occludes.
- **The fix (known, byte-reviewed):** on the header — `position: relative; zIndex: 55`. Bounded on BOTH sides against every `zIndex` in `src`: **> 50** (the highest any page inside `<main>` uses — TrendsPage's filter dropdown) and **< 60** (the full-screen `position: fixed; inset: 0` drawers `TutorDrawerV2` / `MentorSolveDrawer`, which must still cover the header). A first pass used `100` and would have punched the header through those drawers' backdrops.
- **★ WHY IT IS BLOCKED:** `lazytopper/src/components/desktop/DesktopShell.tsx` is an **ABSOLUTE entry** in the `FORBIDDEN` list of `check_improve_convergence_acceptance.mjs`, which runs on every PR via `test:matrix:all` — a flat "did this PR touch a forbidden path?" with **no lane-scoping and no exception mechanism**. Splitting the PR does not help (an isolated shell-only PR fails the identical gate), and **there is no fix from outside the guarded file — the dropdown itself lives in `DesktopShell` (:435-447)**, so even portaling it to `document.body` touches it (and would be a net-new pattern; the app uses no `createPortal` today).
- **The only two honest options:** (1) deliberately amend the `FORBIDDEN` list as its own reviewed, documented decision, or (2) leave it deferred. **Not options:** force-merging past the gate, or editing the list inside a product PR to silence it.

*(Option 1 is what happened: #519 amended the list as its own reviewed decision, #528 shipped the fix plus the tests that replace the ban.)*

</details>

**[FU-QP-SCORECARD-ATTEMPTS-WIPED] — RESOLVED by #501 (trunk `7979a89`).** Owner reported the QP scorecard showing a wrong denominator (reported "0/50"; verified on the owner's screenshot as **"5 of 75 attempted"** on a full-page 5-MCQ set).
- **ACTUAL ROOT CAUSE (corrects the analysis below): the DENOMINATOR, not an attempt wipe.** The scorecard's "of N" read `questions.length` - the OVER-FETCHED engine pool - instead of `filteredQuestions.length` - the DISPLAYED set the student works. Fixed at all FIVE scorecard-facing reads in `PracticePage.tsx` (forbidden `ResultsScorecard.tsx` / `scorecardVariants.ts` untouched - they read right). MCQ attempts were ALWAYS counted correctly (the screenshot's "5 of 5"); there was NO Refresh-set / self-regenerate wipe in the owner's case. The `COUNT_SOFT_MAX` claim below was also wrong - the number is the POOL size, which VARIES with the over-fetch (`engineCount = chosen count x5`, cap 100; 75 in the screenshot), not the count clamp. The bug lives on the FULL-PAGE path (`source=practice`), not the overlay - which is why the "not reproduced" bullet below was a false negative (it only drove the `source=tutor` bypass). Regression test (`PracticePage.scorecardFeed.test.tsx`) reproduces the screenshot; mutation-verified. The re-scoped written-answer follow-up is `[FU-QP-WRITTEN-BINARY-CHECK]` (see the #501 section at the TOP of this file). **The bullets below are retained as the SUPERSEDED original investigation record.**
- **The reported "wrong score model" is DISPROVEN.** `quickPracticeScorecardVariant` (`scorecardVariants.ts:387`) always emits `kind:"attempts"`, and **no `kind:"marks"` path exists for quick practice anywhere** — there is no stored-QP variant. The `50` is `COUNT_SOFT_MAX` (`PracticePage.tsx:14`), the count clamp. So "0/50" is the attempts hero rendering "**0** of 50" small-caps. **The defect is the 0 attempted, not the model.**
- **NOT REPRODUCED on either path.** Driving the REAL `PracticePage` at the overlay's own seed URL (`count=5`), and again inside the REAL `TutorQuickPracticeOverlay` mounted at production nesting depth, both render correctly: **"3 of 5 questions attempted · 1/3 MCQs correct · 33% accuracy"**, with the overlay's what-next menu correctly omitting the app-navigation items. MCQ attempts DO reach the score object.
- **The MECHANISM was reproduced.** Clicking "Refresh set" clears `mcqSelections` and `gradedResults` (`PracticePage.tsx:1580-1590`, inside the generation effect); a later Finish then renders exactly **"0 of N questions attempted"**. On a 50-question set that reads "0 of 50".
- **The OPEN question, and why it matters:** if the owner's set **self-regenerated**, this is a correctness bug — the generation effect depends on `questionCount` / `focusBankIds` / `multiTopics`, and an unstable identity there would silently rebuild the set and discard answers. If the owner **refreshed**, the behaviour is as-designed but dishonest — nothing warns that refreshing discards work. The owner cannot certify which. **Fixing the wrong branch would be worse than logging it precisely**, so nothing was changed.
- **Where to start:** re-drive the two repro harnesses described above (real `PracticePage` at the seed URL; real overlay at production nesting depth), then instrument the generation effect's dep identities across a session.

**[FU-CI-GATE-VITEST] — STILL OPEN, reinforced.** `routingParity` (9), `fullTestNav` (4), `multiTopicNav` (4) and `aliveness` (4) all run **locally only**; CI runs the matrices, not vitest. The routing contract and the aliveness guard are therefore only as strong as the local run. ⚠ Note also that the three-file batch hits vitest's 5s default timeout on the Windows dev box under load — **verified identical on clean trunk**, so it is machine load, not a code fault. Run them serially.

---

## 2026-07-20 -- #490 → #491 → #493 → #495: THE QP OVERLAY ON THE TUTOR (trunk `273cfe8`), owner LIVE-VERIFIED — FU reconciliation

**[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — RESOLVED for the practice leg by #493.** These were HELD pending the QP overlay. The practice leg no longer navigates out: `routeToPractice`/`routeOut` are retired and the panel opens in-tree. The pending marker + holding banner are deliberately KEPT for QP (unlike the C&I leg, which went marker-free) because QP's graded read-back is the storage round-trip — the marker is its key, and it is also the honest fallback when a student closes a partial set with no record.

**[FU-QP-OVERLAY-INMEMORY-HANDBACK] — LOGGED (fast-follow).** The overlay hands the graded set back over the shipped storage round-trip (QP persists at its scorecard; `closeQuickPractice` runs the existing `resolvePendingRoundTrip` → `composePracticeRecordReturnOpener`). Mirroring C&I's in-memory Option 2b would remove the persist→read race entirely, but needs a small in-process record+payload builder — QP's persist writes without returning the composed record. Deliberately deferred: v1 reuses a proven chain unchanged.

**[FU-CI-OVERLAY-NAMED-RETURN] — LOGGED (parity, small).** #495 gave QP's overlay a named "Back to your tutor →" in the close-bar. **C&I's overlay close-chrome is still a bare ✕** (eyebrow + `aria-label` only — verified live; the `ReturnTicketStrip` at `DesktopCheckImprovePage:1738` is the app-level, path-based ticket in the page body, not overlay chrome). Give C&I the same named return for parity. NOT done in #495 on purpose — the hard constraint was C&I byte-identical.

**[FU-QP-OVERLAY-CONTAINED-NAV-LABELS] — LOGGED (polish).** Without a nested router there is no history isolation, so #493 contains navigation with a `NavigationContext` override: any in-panel `push`/`replace`/`go` becomes `onClose` (return to the tutor). This is SAFE and never dead-ends, and it deliberately covers navs nobody enumerated. But the residual controls that trigger it — PracticeControls' "build a worksheet" CTA, PracticeQuestionList's three empty-state links — still carry LABELS naming destinations they no longer reach in overlay mode. Suppress or relabel them when `overlay` is present.

**[FU-CI-GATE-VITEST] — STILL OPEN, reinforced again.** The production-faithful overlay integration test (5 cases incl. the #490 control) and the new scorecard tests run **locally only**; CI runs the matrices, not vitest. The acceptance gates carry the enforceable invariants — including, now, a gate on the TEST HARNESS shape (outer router + control case), which is the structural defence against #490's failure mode.

---

## 2026-07-19 -- #488: QP MULTI-TOPIC PRESETS (Piece 2, shape 3c, trunk `9edb939`), owner LIVE-VERIFIED — FU reconciliation

**[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED] — RESOLVED by #488** (the investigation/build lane called it `[FU-PRACTICEHUB-MULTITOPIC]` — same FU). A `≥2 topics` hub selection no longer collapses to `topic=<first>`: the QP nav builder emits `topics=a,b,c` (mirrors the HPQ sibling), `PracticePage` reads it into a resolved multi-topic list, and the fetch fans out one unchanged `buildPracticeQuestionsWithAiTopup` per topic → merged, pooled-and-shuffled, competency-floored. Multi-topic reaches the questions, both Maths and Science (owner live-verified).

**[FU-QP-MULTITOPIC-EXAM-WEIGHT] — LOGGED (fast-follow).** Swap `topicShare()` (the single proportional driver, v1 = bank availability) from availability to exam-trends weight. Needs `getTopicWeight(topicKey)` exposed as an importable helper — currently private in `predictionScoring.ts`. Designed as a **one-function edit** (the driver is deliberately isolated). Small; do after the QP overlay or as filler.

**[FU-QP-MULTITOPIC-SECTION-SHARES] — LOGGED (owner-accepted; revisit only on request).** The merged multi-topic set enforces the **competency %** and the **topic split**, drawing from per-topic board-shaped fetches, but does NOT re-assert exact section percentages (A30/B20/C20/D20/E10) across the merged pool. Re-enforcing would be the **forbidden topics×sections nesting** — owner ruled competency% + split + pooled-shuffle are the ratios that matter. Revisit only if exact per-section shares are wanted across a mixed pool.

**[FU-CI-GATE-VITEST] — KEPT OPEN (do NOT close).** #488's new suites — the pure composition core (`multiTopicPractice.test.ts`, 18/18) and the router-mounted nav test (`multiTopicNav.test.tsx`, 4/4) — ran **LOCALLY ONLY** (Windows rollup-win32 binary drop). CI still does not run vitest, so they do not gate the PR. Same silent-skip species; the fix remains to gate vitest in the linux CI job.

**[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — STILL HELD (for the practice leg).** Untouched by #488; the QP overlay lane (next) is what retires them.

> **Batching note:** #488 closes Piece 2 and the QP SURFACE arc (entry, reachable, navigable, single + multi-topic). The **QP overlay mechanism** is a NEW lane (investigation-first) — separate future handoff.

---

## 2026-07-19 -- #483 → #486: THE QP A1 FIX-ARC (trunk `889ab6d`), all four owner LIVE-VERIFIED — FU reconciliation

**[FU-QP-PRESETS-UNREACHABLE] — RESOLVED by #483.** The presets are now reachable: `deriveArrivedTargeted` is keyed on `source` (`source=practice` hub CTA → presets; `source=tutor`/`targeted=1` → auto-build). The fix was the *inverse* of the spec's literal `source==="tutor"` rule — ~21 topic-bearing entrypoints (Topic Hub, `MentorSolveDrawer`, HPQ, Me/Dashboard/Chapter-Test) carry a topic without `source=tutor` and would have been dumped on the chooser by the literal rule.

**[FU-QP-BACK-NAV] — RESOLVED by #485 + #486.** Both back paths now return the built set to the preset chooser: the browser/gesture back (#485, via a real `built=1` search-param history entry — #484's state-only same-URL navigate was a replace/no-op, RR #5362, and shipped broken through all gates + 14/14) and the top-left breadcrumb "Back" CTA (#486, made `isBuilt`-aware, mirroring #485's reset; label "Back to quick practice"). Router-mounted tests (`createMemoryRouter`), 17/17.

**[FU-CI-GATE-VITEST] — KEPT OPEN + STRENGTHENED (do NOT close).** The #484 miss is its sharpest case yet: a broken history push passed CI *and* 14/14 vitest because the test never mounted a router, and the #485/#486 `createMemoryRouter` tests that catch it **only ran locally** (Windows rollup-binary drop) — CI still doesn't run vitest, so they don't gate PRs. Same silent-skip species; fix is to gate vitest in the linux CI job.

**[FU-QP-FULLSUBJECT-PRESET-SCOPE] — KEPT.** Full-subject hub arrival (`source=practice`, no topic) shows presets scoped to the *default* topic (`topicParam` defaults when absent) — a pre-existing #481 condition surfaced and logged during #483, not introduced by the arc. Not subject-wide; small follow-up if the owner wants full-subject on the manual builder or subject-wide presets.

**[FU-QP-WEAK-AREAS-PRESET] — KEPT (gated).** The 5th "My weak areas" card stays gated ("Soon", no-op) — untouched by the arc.

**[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED] — KEPT (parked); Piece 2 will UN-PARK it** as a NEW investigation lane (multi-topic presets; the QP path currently collapses multi-topic to `topic=<first>`). Separate future handoff — not part of this arc.

**[FU-QP-BACKNAV-FORWARD-ONE-DIRECTIONAL] — LOGGED (known / won't-fix unless revisited).** The pop-reset is one-directional: forward-after-back shows the chooser, not the built set. A bidirectional sync was rejected because it conflicts with the in-app "Edit filters" (which drops `isBuilt` without a history change). Owner-accepted.

> **Batching note:** this closes the QP fix-arc. **Piece 2 (multi-topic) is a NEW lane** — separate future handoff.

---

## 2026-07-19 -- #481: QUICK PRACTICE A1 — PROGRESSIVE-DISCLOSURE ENTRY + TIMER (trunk `ec3275c`), owner LIVE-VERIFIED

**[FU-QP-PROGRESSIVE-DISCLOSURE] — RESOLVED by #481.** The QP entry now opens on four preset cards + a Customise drawer (the full five-dimension filter incl. Source), replacing the raw six-filter wall. Presentation-only (a preset = a bundle of the existing `setCommitted*` setters). (Original `###` entry below in this file.)

**[FU-QP-TIMER] — add-then-RESOLVED by #481.** (Never on this board — recorded here for reconciliation, A15.) #481 shipped the optional student-toggled timer on QP, reusing the ChapterTest pattern (`formatClock` + a 1.2-min/mark budget); off by default, countdown in the runner, **no auto-submit** (QP finish is student-driven).

### ★ NEW — **[FU-QP-PRESETS-UNREACHABLE]** — #481's presets shipped correct-but-unreachable; Piece-1 fix IN FLIGHT
#481's preset screen is gated on a "direct visit, no `topic` param" state, but **production has no topic-less QP entry** — every route is hub → pick topic → CTA, which always carries `topic=`, tripping `arrivedTargeted` → auto-build → **the presets never render.** The code is byte-correct; the entrypoint is not. **Owner LIVE-VERIFY caught it; the green gates could not** (they prove structure, not reachability). **Fix in flight:** Piece 1 (`feat/desktop-pr-qp-presets-hub-reachable`) re-gates the entry on `source` (`source=practice` → presets; `source=tutor` → auto-build). ★ Durable lesson: *a spec that scopes a feature to an unreachable URL state ships something invisible — live-verify reachability, not just correctness.*

**[FU-QP-WEAK-AREAS-PRESET] — KEPT (unchanged).** The 5th "My weak areas" card stays gated ("Soon", a no-op click) — ships visible-but-disabled.

**[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED] — KEPT (still parked); Piece 2 of the QP arc will UN-PARK it** (multi-topic presets, batched with Piece 1 in a combined handoff).

**[FU-CI-GATE-VITEST] — KEPT OPEN (do not close).** #481's acceptance test (`QuickPracticePresets.test.tsx`, 13/13) and the existing rotation test (23/23) ran **LOCALLY only** (via the Windows rollup-binary drop); **CI still does not run vitest**, so these tests do not gate the PR. Another instance of the same species.

> **Handoff batching (owner ruling):** Piece 1 + Piece 2 (the two QP fixes) get a **combined handoff later**. This handoff closes **#481 only**.

---

## 2026-07-19 -- #478 + #479: THE TUTOR READS THE GRADED WORK (trunk `a198bf1`), owner LIVE-VERIFIED + a real 28-call eval

**[FU-TUTOR-OVERLAY-QUESTION-TO-MODEL] — RESOLVED by #478.** The seam #476 left (the question reached the tutor host in `overlayQuestionRef` but not the model) is closed: the question now reaches the MODEL as one-shot `returnedWork` context (a new `TutorRequest.returnedWork`, rebuilt at the server trust boundary, rendered by `returnedWorkBlock`). Text-only MVP — an image-question is described, never transcribed. Do NOT redo.

**[FU-TUTOR-CI-RICH-OPENER] — add-then-RESOLVED by #478.** (Logged in the build report + memory, never on this board — recorded here for reconciliation, A15.) The C&I overlay return now composes `composeCheckImproveRichReturnOpener` (QP's `composePracticeRecordReturnOpener` re-flavoured), added BESIDE the byte-identical thin `composeReturnOpener`; `null` on thin data ⇒ the thin honest floor. Do NOT redo.

**[FU-TUTOR-RETURNED-WORK-DIGEST] — add-then-RESOLVED by #479.** (Same reconciliation note.) The per-step digest was BUILT OFF in #478 behind one flag, then flipped ON in #479 (`RETURNED_WORK_DIGEST_ENABLED true`) after a **live rubric-2 eval**: 28 real `gemini-2.5-flash` calls, digest OFF vs ON, **12/12 digest-ON runs grounded, 0 invented steps, 0 grade contradictions**. ★ The eval found ON is *safer* than OFF — question-only, the model re-derives and ASSUMES which steps were right; the digest lets it read the `status` list, closing a latent confabulation path. Do NOT redo; to revert, set the one flag back to `false` (the honest floor is unchanged either way).

### ★ NEW — **[FU-TUTOR-THINKING-BUDGET-TRUNCATION]** — gemini-2.5-flash thinking tokens can truncate tutor replies
The #479 eval saw 3 of 28 replies end mid-sentence: `gemini-2.5-flash` thinking tokens consuming the `maxOutputTokens: 900` budget (`tutor.cjs:232`). **Pre-existing and orthogonal to the digest** — it hit thin/OFF runs too (S4b carries no digest). Not a blocker for the digest, and not this lane's fix. Candidate remedies: a `thinkingConfig` budget cap (the detect-question call already uses `{ thinkingBudget: 0 }`) or a higher output cap. Product-file change ⇒ needs an owner-approved product PR, its own lane.

### **[FU-TUTOR-POLL-LEG-RICH-SYMMETRY]** — optional, unchanged
The legacy worksheet poll leg (`useTutorSession.ts:275`) could get the same rich-opener treatment #478 gave the overlay leg. Optional, off the main path; not scheduled.

---

## 2026-07-19 -- #476: THE TUTOR ⇄ C&I OVERLAY IS LIVE (trunk `cca0a5d`), owner byte-verified

**[FU-TUTOR-OVERLAY-BUILD-A] — CLOSED.** The C&I overlay shipped (Option A). Do NOT redo.

### ★ NEW — **[FU-TUTOR-OVERLAY-QUESTION-TO-MODEL]** — the question reaches the host, not yet the model
#476 hands the raw question to the tutor **host** in-memory via the `onClose` payload (`{text, imageBase64}` from C&I's live state) and holds it in `overlayQuestionRef` — the seam. But **feeding it into the MODEL's context** (so the tutor can reference the *specific* question the student just graded) is a separate **prompt-eval lane** — it needs the tutor-eval pass, exactly like the proactive-offer prompt. Until it lands: the score returns cleanly and the tutor names *where* it slipped (from the record), but it won't NAME the specific question. **Not a bug; a scoped deferral** (the `hasNcertPage` plumbing-first precedent). Grader / record / `composeReturnOpener` stay byte-identical.

### ★ NEW — **[FU-CI-QUESTION-PROVENANCE-IN-RECORD]** — a persisted question field on SessionRecord (only if Me/Progress needs it)
A persisted `question` field on `SessionRecord` so Me/Progress could show the actual question, not just `questionIds` / bank refs. **Deliberately NOT built in #476** — the in-memory handoff avoids touching the durable record (that is *why* the record stays byte-identical). Only build if Me/Progress needs it — **additive-optional, never backfilled** (the `worksheetId`/`topicSource` precedent).

### ★ NEW — **[FU-TUTOR-OVERLAY-OUTBOUND-CTAS]** — the 8 post-grade outbound CTAs still navigate the app away
In overlay mode, the scorecard's outbound deep-links (practice / worksheet / topic-hub / exam-trends / Me) still `navigate()` the whole app away, unmounting the tutor+overlay. **MVP leaves them navigating** (a student who taps "See your progress" *chose* to leave; the primary "Back to your tutor →" delivers the never-leave promise for the main flow). A stricter variant — suppress or route them through `onClose` first — is a one-line-per-site follow-up, all `overlay`-gated. Not a blocker.

### ⚠ STATUS CHANGE — **[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER]** — now PRACTICE-LEG ONLY
These were HELD because the overlay would make the round-trip banner/count-link mechanism secondary. #476 **retired the navigate/poll/banner for the check-improve leg** (the overlay replaced it) — so they no longer apply there. The **practice** leg still routes out via `routeOut` and keeps `count:5` + the "tutor is waiting" banner. **Still HELD for the practice leg**, to be retired by the QP overlay — do NOT "just fix" them.

---

## 2026-07-18 -- #472: C&I QUESTION-SIDE PARITY COMPLETE (trunk `0649e20`), owner byte-verified

**[FU-CI-QUESTION-SIDE-PARITY] — CLOSED.** The question uploader now has `<EquationInput>` (math palette), a `<QrAnswerHandoff>` in a new `"question"` mode, mobile camera/files, and paste. Both textareas auto-grow (default OFF). Do NOT redo.

**[FU-QRH-DOCUMENT-COPY-NEUTRAL] — RESOLVED in #472.** `mode="document"` copy was answer-shaped (*"pick the PDF of your answers"*). Fixed by a THIRD `QrHandoffMode` value `"question"` with its own question-voice copy in both COPY maps + the phone "Sent" line. **The catch:** the value is also validated **server-side** (`qrUploadChannel.cjs` `VARIANTS`), a 6th site the frozen five-site map missed — without it a `"question"` mint coerced to `'document'` on the wire. Added `VARIANT_QUESTION`; round-trip proven by a channel-test `mint→peek` assertion (qr channel 47/47).

### ★ NEW — **[FU-EQUATIONINPUT-AUTOGROW-SOLUTIONCHECKER]** — decide whether SolutionChecker wants autoGrow
`EquationInput` gained `autoGrow` (default OFF) for C&I. `SolutionChecker.tsx:652` is the other consumer and stays byte-identical (never passes the prop), but **nobody has read its container/layout** — a growing textarea might push something out of a constrained space. A deferral with a plan: **audit SolutionChecker's layout, then decide whether to flip autoGrow on there.** Inference-without-verification is the failure mode to avoid; do not flip it blind.

### ★ NEW — **[FU-EQUATIONINPUT-TEST-NOT-CI-GATED]** — the autoGrow safety proof is UNENFORCED on merge
The guarantee "autoGrow default-OFF keeps SolutionChecker byte-identical" rests on `EquationInput.test.tsx` passing untouched. **But vitest is not gated in CI** (CI runs the matrices, not vitest), so nothing on the merge path actually runs that test — it was verified locally (8/8, via the Windows rollup-binary drop) and the acceptance script only asserts the test file is UNCHANGED, not that it PASSES. **Same silent-skip family as #469** (a check that does not run reads as green). Fix: gate vitest in the linux CI job (it already works there) — the standing **[FU-CI-GATE-VITEST]** is the parent. Doc/CI-config only.

**[FU-CI-RETARGET-NO-GATE] — still OPEN** (confirmed present, recorded under the #466→#470 section below). Unrelated to #472; no change.

---

## 2026-07-18 -- #466 → #470: THE CHECK & IMPROVE CONVERGENCE ARC IS COMPLETE (trunk `2c59dd2`), owner live-verified

**[FU-CI-MULTIPAGE-CAPTURE], [FU-CI-UPLOAD-COPY-CANONICAL] — closed earlier in the arc.** The convergence, the twin deletion, the gate fix and the mobile header are all merged and live-verified. Do NOT redo.

### ★ NEW — **[FU-CI-QUESTION-SIDE-PARITY]** — the question uploader lags the answer uploader
The **answer** side has `<EquationInput>` (`DesktopCheckImprovePage.tsx:2152`) and `<QrAnswerHandoff>` (`:2068`); the **question** side (`:1712-1780`) has **neither** — a plain input + an upload button. A desktop student whose question paper is on their phone must email → download → save → upload. **Both components already ship and are reusable:** `EquationInput`'s docblock says *"drop-in for a textarea"* (`SolutionChecker.tsx:652` is the second-consumer precedent); `QrAnswerHandoff.onImageReceived` is field-agnostic **by design** (*"the caller owns what happens next"*), `label` already a prop. **Open copy decision, owner-owned:** the QR default label *"Solved it on paper?"* is answer-copy, wrong on the question side. **Not built — record it.** Coordinates owner-verified but **re-derive before building** (this file rots).

### ★ NEW — **[FU-CI-RETARGET-NO-GATE]** — a retargeted PR keeps its green check from the old base
`gh pr edit --base` fires `pull_request:edited`, which `quality-gate.yml` **ignores** (default types = opened/synchronize/reopened), so a retargeted PR **carries its GREEN check forward from the OLD base** — a stale pass. Discovered on #470; **close/reopen** (fires `reopened`) was the workaround. **This matters MORE once auto-delete-head-branches is on**, because that auto-retargets stacked PRs. **Fix:** add `edited` to the workflow's `pull_request` types, OR document the close/reopen ritual.

### **[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED]** — multi-topic scope silently dropped, differently per CTA
Practice Hub offers Single / Multiple / Full-subject scope. **Multi-topic is SILENTLY DROPPED:** `DesktopPracticePage.tsx:2029-2032` Quick Practice passes `topic: selectedTopicSlugs[0]` — **FIRST TOPIC ONLY**; `:2046-2050` Timed drill passes `undefined` — **WHOLE SUBJECT**. `buildLegacyPracticePath` takes `topic?: string` (singular); `PracticePage.tsx` has **zero** occurrences of `"topics"`. Full-subject (`{}`) is correct. **Worksheet / HPQ / Full-Test paths UNAUDITED — verify, do not infer.** Owner wants a **THOROUGH AUDIT** of the hub→surface context handoff, not a point fix.

### **[FU-QP-PROGRESSIVE-DISCLOSURE]** — QP asks six filter decisions before question one
Marks / Style / Source / Difficulty / MarksRange / Count, each doubled (pending/committed). Design done (A1 mockup, owner-approved shape): **presets primary + a "Customise" drawer** — the pattern already shipped in `WorksheetGenerator.tsx` (`type Mode = "preset"|"custom"` :68, `PRESETS` :80, defaults preset :258 / closed :267, drawer :942). **Presentation ONLY** — zero MI, zero engine, zero `practiceQuestionBuilder`. Not built.

### **[FU-QP-WEAK-AREAS-PRESET]** — a 4th "My weak areas" preset, topic-contextual
**GATED** on student-QA signal AND a dedicated audit of the weak-area/progress engines (owner: read-only until then). ★ **CORRECT PATH VERIFIED:** `services/weakAreaAggregator.ts` ALREADY EXISTS — `getWeakAreas({subject, limit})` fusing SEVEN sources, and `WeakArea.weakConcepts: string[]` is ALREADY concept-granular. **Do NOT** derive weak areas from `getMistakeLogs` + a questionId→bank→subtopic join — that would be a THIRD parallel definition of "weak" (`practiceInsights.ts:60 PracticeWeakConcept` is the second). **Read the engine; never re-implement it.**

### **[FU-QP-FILTER-SYSTEM-AUDIT]** — the whole hub→surface filter/context handoff
Deliberately unscoped until student QA.

### **[FU-CLAUDE-MD-SUITE-COUNTS]** — CLAUDE.md §6 hardcodes counts its own rule forbids
§6 says **6 suites** (there are **11**, 12 with the convergence gate) and **"5 suites"** for the root matrix (reports **28**) — while §6's own text says *"count GROWS over time; verify, do NOT hardcode a number."* Also worth adding: `scope:guard` needs `-- --mode mixed` (npm swallows a bare `--mode`). Doc-only; not built.

---

## 2026-07-17 -- #464: THE TUTOR SAYS THE REAL NCERT PAGE IS THERE (trunk `50783e7`), owner byte-reviewed + live-verified (4 probes)

**[FU-TUTOR-NCERT-PROACTIVE-MENTION] — CLOSED.** The NCERT arc **#457 (data) → #459 (the page can win the panel) → #464 (the tutor says it)** is **COMPLETE**. Do NOT redo.

### ⚠️ NEW — **[FU-TUTOR-CJS-STALE-PLUMBING-COMMENT]** — OPEN. **#464 should have closed it.**
**`lazytopper/server/routes/tutor.cjs:101` is FALSE on trunk:** *"`hasNcertPage` is plumbing only today: `figurePanelBlock()` does not read it yet… Using it is the tutor-round-trip lane's sequenced task."* **#464 made it read it** (`tutorSystemPrompt.cjs:264` + the `:269` `anyNcertPage` gate). ⇒ **a spent instruction left in place — and the very comment that dispatched #464.** **Grep `hasNcertPage` → land there → conclude the work is undone → possibly redo it.** ★★ **The #451/#454 ruling applies verbatim: STRIKE A SPENT CHECK IN PLACE. A stale instruction is worse than none because it LOOKS LIKE DILIGENCE.**
- **Fix:** comment-only, strike/replace in place. **PRODUCT file** ⇒ **owner-approved product PR** (it could not ride the docs-only PR that logged it, §8).
- **Found by re-verifying #464 on trunk before writing its docs — not by review.**
- ★ **Third instance tonight of the same disease, in a third medium:** #451/#454 (a carried product instruction) → #462/#463 (a cross-lane docs claim) → #464 (a code comment). ***The disease does not care which file it lives in.***

### ★★ [FU-CI-GATE-VITEST] — still ESCALATED; #464 adds a **fourth** instance to its case
**A green gate can prove nothing**, and tonight produced four distinct shapes of it:
1. **An unrun suite** — vitest is not CI-gated and cannot run on win32 ⇒ tests that execute **nowhere**.
2. **`scope:guard` returning `SCOPE_GUARD_OK (mode=product, no changes)`** on a rebased clean tree — **green from a gate that inspected nothing**.
3. **Prompt gates that do not read English** — tsc/matrices/mojibake pass identically on terrible wording (#460, #464).
4. ⚠ **NEW: `TSC EXIT: 0` printed while tsc was not even installed** — `$?` after a pipe reports **`tail`'s** status. ***Run tsc bare and read its own exit code.*** *(Self-inflicted, caught immediately, recorded because the next agent will do it too.)*

### ★★ NEW STANDING LESSON — **one rendered example is not coverage**
#464's harness caught a real bug **reading could not**: the NCERT directive was first emitted **unconditionally**, so on a topic with **no** pages the prompt described a `[real NCERT page available]` marker **absent from its own list** — **the fake-affordance bug one layer down, built in while congratulating ourselves for catching the first one.** The **mixed case rendered perfectly.** ⇒ **assert the ABSENT cases** (no marked row ⇒ no directive; absent field ⇒ no marker; truthy-but-junk ⇒ no marker). Owner **probe 4** confirmed the gate live.

### ★ CARRY THE QUESTION, NOT THE EXPECTED ANSWER — **twice in a row now; watch for a third**
Two consecutive dispatches named the **wrong location**, both **right line number / wrong file**:
- **#460:** *"the sentinel's gate in `useTutorSession.ts`"* — **there is no gate there** (`:345` only ATTACHES); the real gate is **`TutorPage.tsx:356`**.
- **#464:** *"`figurePanelBlock` … at `tutor.cjs:226`"* — it is at **`tutorSystemPrompt.cjs:226`**; `tutor.cjs:226` is an **unrelated canned model turn**.
⇒ **Never copy a line number without re-confirming which file it came from.** Harmless both times **only because the location was re-derived**. ⚠ **A third occurrence means a convention problem, not luck.**

### Carried — HELD, unchanged
- **★ [FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — do NOT build.** Next session's **QP + C&I as in-tutor overlays** (reusing the real pages verbatim) would make the round-trip **banner/count-link mechanism secondary**. *A HOLD with a reason.*

---

## 2026-07-17 -- #460: A STUDENT WHO ASKS TO PRACTISE GETS THE HAND-OFF (trunk `be200cb`), owner byte-reviewed + live-verified (3 probes)

**[FU-TUTOR-CTA-DIRECT-ASK] — CLOSED.** `[[offer:practice]]` now fires on **either** the tutor's offer turn **or** the turn answering a **direct student ask**. Prompt-only (1 file). Owner probes all pass, including the boundary one. Do NOT redo.

### ✅ DOCS DEBT — **THERE IS NONE. CORRECTED BY #463.**
This section originally read: *"#457 and #459 are MERGED and LIVE with NO handoff docs — they belong to the catalogue lane."* ✅ **FALSE — #461 (`d364d03`) documented both**, merging **mid-write** and paying exactly that debt. **True when written; false within the hour.**

★★ **[FU-DOCS-CORRECTION-NOT-PUSHED] — the real finding, worth more than the fix.** The correction **was written and never published**: it sat on an **unpushed local commit** behind a `--force-with-lease` approval that had been **requested and not granted**, while the conflict was resolved in the **GitHub UI from the pre-correction commit** and merged. ⇒ **a claim already known to be false went live on trunk in SIX files.**
- **The stale claim was NOT the failure** — it was honest when written and the world changed underneath it. **The failure was holding a KNOWN correction locally while the stale version merged, without shouting that the fix was unpublished.**
- ★ ***A correction that is not pushed does not exist.*** **If a claim you have ALREADY discovered to be false is sitting in an open PR, saying so out loud outranks waiting politely for approval on the mechanism that would fix it.** The approval gate (§3, `push --force`) was correct; **treating "blocked on approval" as "handled" was not.**
- ★ **Two lanes finishing within the hour is a NEW COLLISION CLASS** (the 13th stale-base catch, the **first docs-vs-docs**): both lanes prepend to the same six files. **Re-verify every cross-lane claim AT REBASE** — *a stale claim is worse than none: it looks like diligence.*
- ★ **The UI conflict-resolution ALSO duplicated `SURFACE_TRACKER.md`'s `**Home:**` header** (two competing "Trunk at last sync" lines, `be200cb` and `27e6ec2`), against that file's one-Home-plus-nested-`_Prior sync_` convention. **#463 collapses it.** *A UI merge of two prepend-style docs lanes does not just pick wrong text — it can break the file's structure, and no gate reads it.*

### ★★ [FU-TUTOR-NCERT-PROACTIVE-MENTION] — **UNBLOCKED. Next.**
**`hasNcertPage` VERIFIED PRESENT IN CODE** (checked, not inferred from *"#457 landed"* — ★ *a landed PR is never proof a specific field shipped*): `conceptVisualCatalogue.ts:226` → `:253` (`Boolean(row.ncertPage)`) → `tutorClient.ts:50` → **`tutor.cjs:111`** (rebuilt + coerced `=== true`).
★★ **The code names its own seam, `tutor.cjs:101`:** *"plumbing only today: `figurePanelBlock()` does not read it yet."* ⇒ the work is **`figurePanelBlock()`** (`tutorSystemPrompt.cjs:226`) — today **key/label only**.
⚠ **`normalizeFigures` REBUILDS each option at the TRUST BOUNDARY** — *"every new option field must be whitelisted HERE as well, or it is silently dropped."*
★ **Never make the student ask for the page — a 15-year-old will not know the trigger phrase.** Re-derive the line numbers; #457/#459 moved this area.

### ★ The prompt-verification gap this PR exposed (feeds [FU-CI-GATE-VITEST]'s case)
**Every gate passed and none of them read English.** tsc, both matrices and mojibake are blind to prompt wording; the only check with power was **rendering the block through `buildTutorSystemPrompt` and reading it** — proving it *renders*, not that it *works*. ★ **A prompt is only verified by a model reading it** ⇒ prompt changes need live-verify MORE than code changes, not less. *Third instance tonight of the same species: a green gate that proves less than it appears to.* (The other two: an unrun test suite, and `scope:guard` returning `no changes` on a clean tree. Note the contrast — here `scope:guard` returned `lanes=product` and **did** inspect a real diff. Same gate, opposite evidentiary value.)

### Carried, unchanged
- **★ [FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — HELD, do NOT build.** Pending the **overlay-architecture investigation** (QP + C&I may become in-tutor overlays reusing the real pages verbatim ⇒ the banner/count-link mechanism becomes **secondary**). *A HOLD with a reason.*
## 2026-07-17 -- #457 + #459: ★★ THE NCERT PAGE ARC — dormant → live → winnable (trunk `27e6ec2`), owner byte-reviewed ×2 + live-verified ×3

**[FU-TUTOR-NCERT-PAGE-DATA] / the catalogue coverage lane — CLOSED.** 54→**73 rows**, **65** with a verified `ncertPage`, coverage 13→22 topics. **[FU-TOPICHUB-LENSPOWER-ANCHOR] — CONFIRMED, not closed:** NCERT defines lens power/dioptre in **Light ch.9 §9.3.8 p.157**, so that row's page is a deliberate **cross-chapter** ref; the *hub row's filing* is still the open question.

### ★★ [FU-CI-GATE-VITEST] — **THE CEILING WAS WRONG. This is CHEAP, not hard. Carry this into its priority conversation.**
Three lanes in one night recorded *"Windows can't run vitest"* as a platform limit and shipped **on argument rather than execution**. **False.**
- **vitest RUNS on Windows.** `pnpm-workspace.yaml`'s overrides strip `@rollup/rollup-win32-x64-msvc`; `npm pack` the version matching the installed rollup and copy it into **rollup's own `node_modules`** ⇒ `node node_modules/vitest/vitest.mjs run <path>` works. **92/92, ~11s.** **Local only — nothing committed, no lockfile/manifest change.** (`npm pack` is fine despite the root preinstall guard; it isn't a workspace install.)
- ⇒ **The real blocker is that nobody wired vitest into the linux CI job that already exists and already works.** Not an incompatibility. **Hard → cheap. Do not let the old framing survive into that conversation.**
- ★★ **NEW, and it outlives the FU: a test with a data guard (`const row = catalogue.find(...); if (!row) return;`) PASSES while asserting NOTHING when the find misses.** #459's new cases were **mutation-tested** — reverting the priority failed **exactly 3**, and the 2 that stayed green correctly pin the unchanged half; then restored **byte-exact** (empty diff vs HEAD) and re-run. **"It went green" is not evidence until that is done.**

### ✅ UNBLOCKED BY #459
- **★ [FU-TUTOR-NCERT-PROACTIVE-MENTION] — UNBLOCKED. The field is CONFIRMED to arrive** (not merely "landed"): `hasNcertPage` survives `CatalogueFigureOption` → `TutorFigureOption` → **`normalizeFigures`**. ★★ **That middle hop is why a client-only change would have been a no-op: `normalizeFigures` REBUILDS each option as `{key,label}` at the trust boundary and drops unknown fields BY CONSTRUCTION.** **Nothing reads the flag yet — the prompt text is byte-identical** (`figurePanelBlock` renders only `` `- ${f.key}: ${f.label}` ``; `figures` is never `JSON.stringify`'d) ⇒ the model **still** has no idea NCERT pages exist, which is precisely why it answers *"I cannot open NCERT pages."* **The task: `figurePanelBlock` in `server/prompts/tutorSystemPrompt.cjs`** — plain words a student would understand; ★ **never require the student to ask.** ★★ **PROMPT ONLY — do NOT feed the page itself to the model:** the model picks WHICH concept via `[[figure:<key>]]`; **the UI alone** gates the button on `visual.ncertPage`. That boundary is correct.

### 🆕 NEW FOLLOW-UPS
- **★★ [FU-CATALOGUE-SYNC-GUARD]** — nothing enforces the *"keep the two in sync"* contract between `handoff/curation/conceptFigureCatalogue.curated.ts` (imported by **NOBODY**) and the wired `src/pages/tutor/conceptVisualCatalogue.data.ts` (what the resolver reads + CI gates). **They HAD silently drifted** — #448's gap-fill rows and the 2026-07-16 label fixes existed only in `data.ts`. A ~10-line CI check comparing the two **row arrays** makes it real. ★ **Always re-sync curated ← data**, never the reverse. **It rotted in ONE PR cycle.**
- **[FU-TUTOR-VOCAB-BRAIN-ROW]** — the human brain (**NCERT Fig 6.3, p.104**) is extracted, board-heavy, and has **no `boardEssentials` row**, so no catalogue row can legally exist (CI hard-fails a non-live label). Same shape as **photosynthesis**. *The missing thing is the CONCEPT ROW, not the figure.* Vocabulary owner's call.
- **[FU-NCERT-OFFSETS-MATHS-CH9]** — `ncertPdfOffsets.ts` has **no `maths/ch9`** entry and there is no note-spec for *"Some Applications of Trigonometry"* ⇒ trigonometry · heights-&-distances can **never** offer a page. The chapter PDF (`jemh109.pdf`) exists locally.
- **[FU-SCOPE-GUARD-HANDOFF-LANE]** — every lane in `repo_boundary_policy.json` is relative to `lazytopper/`, so **repo-root `handoff/` matches nothing** and any docs change reports `[unclassified]` + fails `scope:guard`. ★ **The near-miss that hides it: the policy lists `_handoff/` (leading underscore) under `generatedEvidence` — a DIFFERENT path.** A classification blind spot, not a violation.

### ★★ THE LESSONS THIS ARC EARNED — apply beyond this lane
- **★ A scope rule that makes the task INERT is one to escalate, not satisfy literally.** The brief forbade the only file that ships. Curating the allowed file alone = zero student-visible change. §4 says stop and report — that is what turned an inert deliverable into a real one.
- **★ The repo's own derived data is not a source.** A spec's `page_pdf` is **0-based in some specs and 1-based in others** (25/62 off by one; **Light's is plain wrong**); the **`source_ledger` misplaces electricity** (series 192→**182**, parallel 186→**185**, Ohm's law 176→**175**); the page field is named **three ways**. **Open the PDF; require folio AND section heading.** *Same species as #448's "the catalogue header lied" and the MCQ "34 keys" that were 13.*
- **★ A rationale can be TRUE WHEN WRITTEN and rot.** `catalogueFiguresForTopic`'s *"pointless to signal a figure that resolves to an empty panel"* was correct until the page could fill the panel — after which it **hid the one row the promotion existed for**. *Same species as #451's "third 5 MB constant".*
- **★ A boundary can look like a gap and be correct.** The model never learns `hasNcertPage`; it picks WHICH concept via the sentinel, and **the UI alone** decides whether a page exists and renders it. Feeding the page to the model would be "fixing" a correct design.

---

## 2026-07-16 -- #456: THE TUTOR READS QP'S GRADED WORKING (squash `dfe3144`; live trunk `084442b`), owner byte-reviewed + live-verified

**[FU-TUTOR-QP-GRADED-RETURN] — CLOSED.** The practice return-opener reads QP's durable session record (#436) and names the step. Owner live-verify: ***"it does correctly identify the mistakes I made."*** Do NOT redo.

### ★★ [FU-CI-GATE-VITEST] — **ESCALATED. Owner: "no longer hygiene debt"; wants its OWN priority conversation, not another ledger line.**
**Two verification paths blocked in one night, and `scope:guard` is a SECOND INSTANCE OF THE SAME SPECIES — owner-ruled to live INSIDE this FU's case, not as a footnote.**
- **The danger is not that tests break.** It is that **a test file borrows the authority of a passing suite without ever being run** — in every diff, every review, every handoff doc, **indefinitely**. #456 added 18 cases that execute **nowhere**.
- **`scope:guard` post-rebase returns `SCOPE_GUARD_OK (mode=product, no changes)`** — **a green string from a gate that inspected nothing** (it reads the *working-tree* diff; a committed tree is clean). ★ *A gate that returns green without inspecting the thing you think it inspected doesn't merely fail to prove — **it pays out the feeling of proof.*** **A suite nobody runs and a guard with nothing to guard both read PASS in a report.**
- **The workaround that worked, and why it does NOT generalise:** `tutorRoundTrip.ts` has **`import type` deps only** ⇒ `tsc <file> --outDir <scratch>` emits a **standalone** module drivable from plain node (**24/24** against the real compiled logic; emit errors from transitively-typed files are noise, the JS still emits). ★ **That was LUCK, not a strategy** — most of this repo's logic has real runtime deps and no such hatch, so **it ships on argument rather than execution.**

### New / carried
- **[FU-TUTOR-CTA-DIRECT-ASK] — DISPATCHED (next).** `[[offer:practice]]` fires **only** when the tutor offers and the student agrees. Widen it: a **direct student ask** (*"I want to try a few questions"*) fires the **same sentinel**, no prior offer required. `tutorSystemPrompt.cjs` + the sentinel's gate in `useTutorSession.ts`. **Re-derive the current gating from code.**
- **[FU-TUTOR-NCERT-PROACTIVE-MENTION] — SEQUENCED/BLOCKED** on `hasNcertPage` reaching `catalogueFiguresForTopic`'s options. The model should **proactively say** *"there's also the real NCERT page for this"* in **plain words** — ★ **never require the student to ask: a 15-year-old will not know the trigger phrase.** **#457 landed — CONFIRM the field exists in code before starting** (a landed PR is not proof a specific field shipped).
- **★ [FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — HELD, do NOT build.** The hardcoded `count: 5` in the practice href and the "tutor is waiting" banner / scorecard-return-row both wait on a **separate overlay-architecture investigation** (QP + C&I may become **in-tutor overlays reusing the real pages verbatim** ⇒ the banner/count-link mechanism becomes **secondary**). **Building either now risks throwing it away.** *A HOLD with a reason — do not "just fix" them because they look like one-liners.*
- **[FU-QP-RECORD-UNFINISHED-SESSION]** — NOT a bug, recorded so nobody "fixes" it: QP writes its record **only at the scorecard** (`sessionFinished || allDone`; **no unmount hook, by owner ruling**) ⇒ an unfinished set has **no record** and the tutor falls back to the marks-only attempts line **by design**. **Owner ruling: honest-or-silent beats a softened fabrication** — do not add partial-set commentary.

---

## 2026-07-16 -- #454: ★★ THE QR LANE IS COMPLETE (trunk `a8be752`), owner byte-reviewed + live-verified

### ✅ RESOLVED BY #454 — AND THE LANE IS CLOSED
- **[FU-QR-CI-WIRE] — CLOSED.** Check & Improve has its QR wire (`a8be752`, 1 file, +47/−0, **desktop-only**). **`mode={isMultiQuestion ? "document" : "photo"}`** — see the ★ note below; the FU's own `mode="photo"` instruction was **wrong-shaped**. Owner live-verified incl. **the multi-question PDF-leading copy** (the page-1 trap cannot happen). **Mobile got NO QR — correct and deliberate:** `QrAnswerHandoff` → `useIsDesktop()` → null <1024px ⇒ it could never render; a QR on a phone is meaningless.
- **★★ THE QR ARC IS COMPLETE: #441 (`9ebb87c`, channel) → #443 (`5aaaeec`, hardening + the unspendable-5 MB fix) → #447 (`d99c14d`, QP+HPQ+TopicHub) → #451 (`c132f27`, the C&I guard that never existed) → #454 (`a8be752`, the last wire).** Full arc recorded in CURRENT_STATE. **Do NOT redo any of it.** Still open, none in this lane's hands: [FU-QR-STORAGE-LIFECYCLE] (owner infra) · [FU-GRADER-5MB-COPY] + [FU-GRADER-COULDNOTREAD-REASON] (both the FORBIDDEN grader — one batched owner-approved pass) · [FU-UPLOAD-GUARD-CONVERGE] · the two below.

### 🆕 NEW FOLLOW-UPS
- **[FU-GRADER-COULDNOTREAD-REASON] — the "Couldn't read" chip on a graded C&I result is ONE generic message covering illegible / mismatched / corrupted alike, because the grader returns only a BOOLEAN with no reason code.** A student who gets it cannot tell whether to re-shoot in better light, upload the right page, or try a different file — *a refusal a student cannot act on has told them "no" and helped them zero times* (the same standard #451's picker refusals were built to). **Fixing it means the grader emits a reason ⇒ FORBIDDEN FILE (`checkSolution.cjs`) ⇒ its own owner-approved PR, batched with [FU-GRADER-5MB-COPY]** (same file, same class: a copy/contract fix with no scoring logic). **Owner-found while live-verifying #454 — NOT a regression from the QR wire, just adjacent.**
- **[FU-QR-CI-QUESTION-PHOTO] — the C&I QUESTION-photo input is a second QR candidate.** A student photographing a printed paper at a laptop has the identical friction the answer input just cured. Deliberately NOT folded into #454: **QR was not creating that gap**, so the #447 fold-in argument (a new feature must not ship beside a promise it breaks) does not apply. Its own PR. ⚠ It would need its own `mode` decision — the question photo is *not* automatically the same shape as the answer.
- **[FU-CI-DROPZONE-PDF-COPY] — C&I's answer dropzone says "Choose a photo of your answer / PNG or JPG"** (`DesktopCheckImprovePage:1822-1825`) **while the input itself accepts `image/*,application/pdf` and the page's own comment (`:1765`) says it takes a PDF for BOTH single- and multi-question.** The copy **understates its own capability in both modes** — the inverse of the "5 MB" lie (that one over-promised; this one under-promises). Pre-existing, adjacent, cosmetic-but-dishonest. Its own PR.

### ★★ THE TWO LESSONS THIS ARC EARNED — apply to every future FU, not just QR
**1. CARRY THE QUESTION FORWARD, NEVER THE EXPECTED ANSWER.** Two-for-two in this lane: *"look for a THIRD 5 MB constant"* (there was none — the bug had a different SHAPE: **no guard at all**) and *"use `mode="photo"`"* (C&I is **bimodal**). **Neither instruction was careless — both were TRUE WHEN WRITTEN and had since ROTTED.** ★ **A stale instruction is worse than none: it looks like diligence.** ⇒ a check that names its expected answer can only confirm or deny THAT answer; it cannot find a bug of a shape you did not predict. **When you spend a check, strike it IN PLACE** — a grep landing on the old line is exactly how it gets re-run.

**2. CHECK WHAT THE ACTUAL HOST RENDERS, NOT THE SHAPE OF THE LAST WIRE YOU BUILT.** **#447 needed MORE** state than a naive copy (the CT panel's 2 fields would have rendered a QR PDF **broken** in SolutionChecker's `!isPdf`-gated `<img>`); **#454 needed LESS** (C&I has no preview and 3 fields; #447's five-field tuple would have added state nothing reads). **Both wrong directions are avoided the same way.**

---

## 2026-07-16 -- #451: CHECK & IMPROVE — the upload guard that never existed (trunk `c132f27`), owner byte-reviewed + live-verified

### ✅ RESOLVED BY #451
- **C&I's missing upload guard — CLOSED.** Both pages, all four inputs (`handleFileChosen`/`handleQuestionFile` desktop; `handleFileChange`/`handleQuestionFile` mobile) now refuse an oversized **or wrong-type** file **at the picker**, via the new shared `checkUploadFile()` in `uploadLimits.ts`. Copy + constants identical to the panels #443 fixed. Owner live-verified: oversized PDF + WEBP refused on both inputs on both pages (incl. WEBP-on-mobile); a valid file still grades unchanged. **No completion cell moved** — §2a bug-fix depth on an already-✅ surface.
- **[FU-SOLUTIONCHECKER-STALE-ANSWERTAB]'s C&I question — ANSWERED: C&I is IMMUNE, do not re-check** (see that entry below; the FU itself stays OPEN for SolutionChecker).

### 🆕 NEW FOLLOW-UPS
- **[FU-UPLOAD-GUARD-CONVERGE] — `ChapterTestUploadPanel` + `WorksheetGradePanel` still inline their own byte-identical copies of the guard #451 extracted into `uploadLimits.ts`.** Converging them onto `checkUploadFile()` is **behaviour-neutral** and was deliberately NOT done in #451 — that was a bug-fix PR for C&I, and rewriting two *working* panels would have widened it for zero student-visible gain (the same sequencing call, and the same reasoning, as [FU-STEPMARKCHIP-EXTRACTION]). Do it in its own PR. ⚠ **Their copy is the SOURCE the new helper was matched against — if you converge them, the messages must stay byte-identical or #451's whole "one promise everywhere" property breaks.** Note the helper's `subject` param: those two panels are both `"answers"` sites.

### ★★ THE LESSON FROM #451 — worth more than the fix
The carried-forward instruction was **"look for a THIRD copy of the 5 MB constant."** **There was no third constant — and that was the CORRECT result of a REAL, LIVE bug.** The check found "nothing" because the bug had a **different shape**: not a wrong ceiling but **no guard at all**. An agent running that check literally finds nothing and reports *"C&I is clean"* — closing a live bug as a pass.
★ **The question that worked was "what does C&I ENFORCE?" — not "does C&I have a 5 MB constant?"**
★ **A check that names its expected answer can only confirm or deny THAT answer. It cannot find a bug of a shape you did not predict.** When carrying a check forward into a new surface, **carry the QUESTION, not the expected answer.**

---

## 2026-07-16 -- #448: TUTOR STAGE 3 — the explanation panel (trunk `0e42e16`)

### ✅ RESOLVED BY #448
- **Tutor Stage 3 / D-TUT-13 — CLOSED.** The explanation panel is live: split desktop / overlay mobile, wired to the curated concept→figure catalogue. **Tutor Stage 1 + 2 + 3 all live. Do NOT redo.**
- **[FU-TUTOR-BACKLABEL-COUNT] — CLOSED.** The tutor's Quick Practice round-trip now passes `backLabel: "Back to your tutor"` + a short `count` (both params `PracticePage` already reads at `:424` / `:451`).
- **D-TUT-15 (the `findVisualForConcept` matcher bug) — CLOSED for the tutor's purposes.** The panel resolves via a NEW resolver that is **exact-match-or-nothing**: unknown concept → `null`, never a substring score, never a `concepts[0]` fallback. The old buggy matcher is untouched (other surfaces still use it) — **the tutor reuses the registry DATA, never its matcher** (D-TUT-12).

### ★★ NEW — [FU-TUTOR-LAST-2-GAP-FIGURES] (small, unblocked, next from this lane)
5 of 7 hard gaps shipped as committed `.svg`. **Two were held pending the label rulings, which are now settled** ⇒ author → owner-verify → commit → flip the rows:
- **functional groups** — adapt **NCERT Table 4.3 (p66)**: Cl/Br (`—Cl, —Br`, "substitutes for hydrogen atom") + Oxygen 1. Alcohol `—OH` · 2. Aldehyde · 3. Ketone · 4. Carboxylic acid (the last three are **drawn structures**, which is why text extraction garbles them). NCERT's note: *"Free valency or valencies of the group are shown by the single line."* **Do NOT draw `>C=O` or `–X` into the FIGURE** — NCERT writes neither (the hub LABEL keeps `>C=O` deliberately; see DECIDED below).
- **radius-from-circumference** — the plain circle with `r` marked and `C = 2πr` / `A = πr²`; NCERT has **no** figure (original diagram), and p155 carries only the single recall sentence *"You know that area of a circle … is πr²."*

### ★★ NEW — [FU-TOPICHUB-LENSPOWER-ANCHOR]
The Topic-Hub row **"Lens power P = 1/f (dioptre) for the corrective lens"** is filed under **`human-eye-and-colourful-world`**, but NCERT **defines** power in **Light, ch.9, p157–158** (eq 9.11; *"1 dioptre is the power of a lens whose focal length is 1 metre. 1D = 1m⁻¹"*). Human Eye only *applies* it to corrective lenses. A real misfile for the row's NCERT anchor — **deliberately deferred out of #448 to avoid scope creep on a figure-approval PR**. Non-gating.

### ★★ NEW — [FU-GAPS-MD-HEADER-CAVEAT] (Fable's curation lane)
`handoff/curation/GAPS.md`'s **"hard gap" means CURATION JUDGMENT, not a verified census** — it means *nothing fits in OUR catalogue*, **not** that NCERT lacks a figure. #448 proved both halves:
- Tracing the 7 "hard gaps" against the official NCERT PDFs found **two DO have real NCERT source art** — atmospheric refraction (Fig 10.9 + 10.10) and functional groups (Table 4.3).
- **#6 was not a hard gap at all** — a **functional-groups INTERACTIVE exists** (`visualConceptRegistry.ts:234` → `/visuals/science/carbon-compounds/functional-groups.html`, file present); Fable marked it `none` ("keyword-heuristic concept stub"). Outcome unchanged (a curated figure outranks a whole-chapter interactive) but **the hard-gap count was off by one**.
⇒ A caveat line is added to GAPS.md's own header in this docs PR, so a future reader doesn't over-trust the count.

### ★ CARRIED / RE-SCOPED by #448's findings
- **[FU-TUTOR-LEGACY-RETIRE] — STILL BLOCKED, and its premise was WRONG.** The dispatch called these "dead pre-Stage-1 engine files"; verified importer-by-importer, **they are LIVE**: `mentor.cjs` (3 routes off `server/index.cjs` — `/api/mentor`, `/stream`, `/stream-structured`) · `tutorOrchestrator.cjs` (injected into mentorRoute deps) · `ConceptTeachDrawer.tsx` (mounted by `ConceptSpine.tsx:692` + `TopicHub.tsx:1789`) · `TeachFlow.tsx` (mounted by ConceptTeachDrawer). **Only `TutorDrawerV2.tsx` is dead** — zero code importers, but **6 UNGATED ops scripts read it as text**, so deleting it goes green in CI while silently breaking them. **D-TUT-12 cannot close until the old Topic Hub tutor is retired.** ⚠ **`TutorPage.tsx` is NOT a ConceptTeachDrawer importer** — its line 3 is a COMMENT (*"NOT TeachFlow / ConceptTeachDrawer / TutorDrawerV2"*); the grep-hit-isn't-an-import trap was hit **twice** in this lane. Also `PracticePage.tsx:804`'s comment claiming the drawer is *"still mounted by … TutorPage and the notes modals"* is **FALSE for both** (prose mentions only).
- **[FU-TUTOR-INCHAT-QUESTION-UPLOAD]** — still queued (needs the QR channel; out of scope this round).
- **[FU-TUTOR-READ-QP-RECORD]** — still queued (that record's shape was still settling).
- **[FU-TUTOR-SUBREGION-FOCUS]** — deferred indefinitely per D-TUT-15.
- **`<EquationInput>` into the tutor composer** — deliberately NOT folded in. The tutor composer is a single-line ask box; `<EquationInput>` is a multiline editor with a palette + KaTeX preview, i.e. a real composer-UX change that would have widened this PR's review surface. Its own small PR.
- **[FU-CI-GATE-VITEST]** — reconfirmed live, and it costs this lane directly: `conceptVisualCatalogue.test.ts` (the resolver contract **plus** the interactive-id existence check the Node guard structurally cannot do) **ships unexecuted** — vitest can't run on win32 (rollup's linux-pinned native binary) and CI doesn't gate it. The CI-gated guard is a plain-Node `.mjs` **because of** this.

### ★ DECIDED (recorded so they are not re-litigated)
- **D-TUT-16 (the AI-diagram cache) — NOT BUILT, deliberately.** It mirrors `stepSolution.cjs`, which **no-ops in production** (`getPool()` → null with `DATABASE_URL` unset; `step_solutions` has **no migration**, only `drizzle-kit push`). Built as specified it would **pass every gate while regenerating a fresh unreviewed diagram per student** — the exact fabrication D-TUT-16 exists to prevent. The gaps are a bounded static list ⇒ offline-authored + owner-verified instead. A Firestore alternative would need a **`firestore.rules` companion (sacred)**. Revisit only if Postgres is ever provisioned — but **[FU-BACKEND-DATABASE-URL-UNSET] says do NOT provision it.**
- **`>C=O` stays in the hub label** (owner ruling). It is **standard carbonyl shorthand and SHARED student-facing vocabulary** — `carbonCompounds.pack1.ts:259`, `carbonCompounds.exemplar.ts:226`. NCERT Table 4.3 uses neither `>C=O` nor a generic `–X`, but **narrowing the hub label alone would desync it from the answers students read in their own graded work**. Unifying hub+bank vocabulary (if ever) spans **forbidden** bank content and is its own call. `–X` **was** aligned → `–Cl, –Br` (a lone over-reach; the bank already wrote concrete "–Cl, haloalkane").
- **The area row was RENAMED, not retired** (owner ruling, option d). The 2026-27 reprint deleted the *"Perimeter and Area of a Circle — A Review"* SECTION — ch.11 opens at 11.1 Sector/Segment and "circumference" survives only in **Exercise 11.1 Q2 (p158)** — **but the SKILL is still tested there**, and the in-scope rows *literally embed the facts* (arc `= (θ/360)×2πr`, sector `= (θ/360)×πr²`), so a student cannot do sector/segment without them. Retiring would have lost real tested content to fix a **naming** problem. **No "prerequisite recall folded into an adjacent row" precedent exists** in `topicHubContent` (`boardEssentials` is a flat `{name, oneLineUse, marks}`; "recall" elsewhere means exam-recall).
- **`conceptKey` is NOT renamed when a label changes.** It is an editorial id, never derived from the label, **and is persisted as the figure signal in durable tutor sessions** ⇒ renaming it would silently blank the panel on existing threads. *A stale-LOOKING identifier can be load-bearing.*

### ★★ NEW PROCESS LESSON — the `package.json` ops-script conflict class
#447 and #448 each added an ops script **and** appended it to `test:matrix:all` — **the same two lines**. **Any two lanes that add an ops check will ALWAYS collide there.** It is **always additive** (keep both scripts, chain both) — a **known, expected non-collision**. Do not re-diagnose it as a real conflict.

---

## 2026-07-16 -- #447: QR PR-2 — scan-to-send on QP + HPQ + TopicHub (trunk `d99c14d`), owner-live-verified

### ✅ RESOLVED BY #447
- **[FU-QR-SOLUTIONCHECKER-WIRE] — CLOSED.** QR is live on Quick Practice + HPQ + Topic Hub via one wire in `SolutionChecker.tsx` (`d99c14d`, 1 file, +62/−7), `mode="photo"`, attached **inside the upload panel as a sibling of the dropzone — never a third peer**, exactly per the seam contract. Owner live-verified all four cases (round-trip · PDF-row · 360px · type/upload unaffected when unused). **Do NOT redo.**
- **The `SolutionChecker` 5 MB copy lie — CLOSED** (folded into #447 with owner approval). The file had its **own** `MAX_PDF_BYTES = 5 MB`; it now reads `services/uploadLimits.ts` (3.5 MB) and both copy strings derive from the constants they enforce. ★ **This was NOT a surface #443 missed** — it was the one correctly HELD BACK for PR-2 while the QP lane owned the file. **The seam contract working as designed; do not record it as a lapse.**
- **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] — DECIDED for QR's purposes; STAYS OPEN on its original terms.** #445 asked PR-2 to "decide that interaction deliberately". **Decision: PR-2 does not compose them and does not make it worse.** The send is tab-gated (`SolutionChecker.tsx:343-344`) and QR is reachable only from the upload tab ⇒ a QR image can only be sent from `upload`; **typed text is PRESERVED in state, not destroyed** (only `handleClear`/`handleRecheck` clear it). **No silent data-loss path shipped.** Making text-alongside-image actually *work* remains a **grader change → its own PR** (original entry below, unchanged).

### 🆕 NEW FOLLOW-UPS

- **★ [FU-SOLUTIONCHECKER-STALE-ANSWERTAB] — a LATENT bug in the very gate that makes text-XOR-image safe. Pre-existing (#436); deliberately NOT fixed in #447.** `handleCheck` **READS `answerTab`** (`SolutionChecker.tsx:343-344`) but **OMITS it from its `useCallback` dependency array** (`:404`) ⇒ the callback can close over a **stale tab**. **Repro:** upload tab + attach a file (or scan the QR) → switch to the type tab and type something (`textAnswer` IS a dep ⇒ the callback rebuilds, capturing `answerTab: "type"`) → switch **back** to upload **without touching text or file** (no dep changes ⇒ the callback still holds `"type"`) → click Check ⇒ it computes `hasText: true`, `hasImage: false` and **sends the typed text while the screen shows the image**. ★ **That is precisely the failure the gate's OWN comment at `:340-342` says it exists to prevent** — *"makes the send match what the student is looking at instead of letting a stale attachment win invisibly."* **The design is sound; the memoization reads yesterday's tab.** Narrower than it looks: it needs the type→switch-back sequence with **no intervening edit**. **Likely one word (`answerTab` into the deps) — but decide gate-vs-deps deliberately first, and NEGATIVE-TEST it (prove it fails BEFORE the fix): a guard that cannot fail is theatre.** ⚠ ~~Check the same stale-closure SHAPE in C&I during [FU-QR-CI-WIRE] — if C&I has its own tab-gate, do not assume it is immune.~~ **✅ ANSWERED by #451's pre-flight — C&I is IMMUNE; do NOT re-check.** Both C&I grade paths are **plain `async function handleGrade()`, NOT `useCallback`** ⇒ they re-read `tab` from the current render scope on every call; there is no dep array to omit. The only `useCallback` in either file (`loadCiRecords`) never reads `tab`. ⇒ **this FU is SolutionChecker-SPECIFIC, not a family.** ★ **C&I is safe not by design or vigilance but because it never reached for memoization — SolutionChecker's bug is the price of an optimisation C&I didn't make.**
  - **The transferable move:** found only by auditing **the gate's MECHANISM** after the owner asked "is text-XOR-image safe?", instead of stopping at *"the result is correct today."* **When asked whether X is safe, check what MAKES it safe, not just today's output.**

---

## 2026-07-16 -- #445: GRADER `objective` FLAG (§2) + ATTEMPT-DEDUP `mode` DROP (§4b) (trunk `ad2a9b2`), owner-live-verified

### 🆕 NEW FOLLOW-UPS

- **[FU-STEPMARKCHIP-EXTRACTION] — the deliberate debt this PR chose, with the owner's agreement.** The per-step mark chip is **re-implemented INLINE at five sites with no shared component**: `WorksheetGradePanel:137` · `SolutionChecker:140` · `CheckImproveGradedPrintDoc:271` · `DesktopCheckImprovePage:540` · `CheckImprove:885`. #445 patched **each one inline** rather than extracting a shared `StepMarkChip` — **not an oversight, a sequencing call**: the `objective` flag was load-bearing and **two lanes (QR PR-2, the §7 paywall gate) were waiting on `SolutionChecker.tsx` specifically**, so widening the diff into a cross-surface refactor (C&I ×2, worksheet, print doc) would have held both lanes longer for a **behaviour-neutral** improvement. **Extract `StepMarkChip` (props: `step`, `objective`) in its own PR** — it is the real cure for *"one fix isn't one fix"*: this is the "shared FILE is not a shared FUNCTION" trap in its worst form (**there is no shared file at all**), and it is exactly why a one-line-looking fix touched five sites.
- **[FU-BANK-SUBJECTIVE-FORMAT-IN-SECTION-A] — the mirror of [FU-BANK-SCARCE-BAND-MISBANDING], found while measuring the assembled bank.** **117 one-mark rows carry a SUBJECTIVE format** (VSA 107 · Short 5 · Case-Based 3 · Long 2) yet sit at `section: "A"`. Because the canonical classifier (`serverUtils.cjs:45`) returns objective on a **bare `s === 'A'`** — format irrelevant — they reach QP's checker and are graded **binary 0/full with all step marks stripped**. Examples: `MNM2-015` (*"List two physical properties that distinguish metals from non-metals"*, `format: "Short"`), `CC2-050` (`format: "Long"` at 1 mark). Where [FU-BANK-SCARCE-BAND-MISBANDING] is *objective rows OUTSIDE section A*, this is *subjective-format rows INSIDE section A*. **Whether a 1-mark VSA SHOULD grade binary is an owner/CBSE call, not an agent's** — needs a ruling before any repair.

### ⚠ CARRY-FORWARD — the §7 paywall lane's one trap (un-dispatched; do not start unprompted)

**The §7.7 test is drafted and PARKED at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs`** (authored during #445 while the distinction was fresh; **lands with §7, NOT before**). ★ **The paywall counter counts API SPEND EVENTS; the attempt-dedup key counts DISTINCT QUESTION-OUTCOMES. A re-check of the same question is a SECOND Gemini call and MUST count AGAIN — while the attempt stream still holds ONE doc.** Do **NOT** dedupe the paywall counter against the attempt key: it looks like "the same fix" for two problems and **under-bills every re-check**. This is the single place in that lane where that instinct is wrong. Standing facts: **`recordQuestionAnswered` has NO caller** (the daily counter ticks for nobody — §7 re-arms it for the first time); the gate must become **action-level** (block the Check button, never the route — browsing and MCQ clicks are free forever); §7 must stay **OFF** `subscriptionService.ts` / `AuthContext.tsx` / `featureGates.ts` (the urgent cloud-auth lane owns them).

### ✅ RESOLVED / CORRECTED BY #445

- **The "unreachable banner" REASON was false — the conclusion survived, the reasoning did not.** The prior handoff justified deleting SolutionChecker's *"1-mark question · step marks are AI guidance only"* banner as *"the clamp zeroes all step marks, so `.some(s => s.marksAwarded > 0.5)` can never be true."* **Wrong:** the clamp runs **only** `if (questionIsObjective)` (`checkSolution.cjs:401`), so a 1-mark **subjective** question is never clamped and would fire it. It **is** dead — but by a **DATA invariant** (measured on the ASSEMBLED bank: **all 3,087 `marks===1` rows are `section:"A"`; `marks===1 AND bankObjective===false` = 0 rows**) **plus surface gates** (HPQ's `isObjectiveQuestion` includes `q.marks === 1`; TopicHub gates `marks > 1`). Deleted **with the corrected reason in the code comment** — ⚠ **it goes live again if a 1-mark non-Section-A row is ever added, or HPQ's `marks === 1` clause is removed.**
- **The double-count repro ORDER in the prior handoff was wrong.** It said *"type → grade → click records twice"* — **unreachable** for a structured MCQ: the only way to reveal the checker is the nudge gated `result === "wrong" && hasStructuredOptions` (`PracticeQuestionCard:409`), so **you must click, and be wrong, FIRST**. The real trigger is **click-wrong → reveal → grade**, colliding **only when both outcomes are 0/1**. A reviewer following the written repro would have found the checker unavailable and closed it *"not reproducible"*. *(Lesson: a wrong reason under a right conclusion is worse than a wrong conclusion — it survives review and teaches the next reader the wrong thing.)*
- **[FU-QR-SOLUTIONCHECKER-WIRE] is UNBLOCKED** — _**⛔ SUPERSEDED — CLOSED by #447 (`d99c14d`); see the #447 section at the TOP of this file. Historical record only.**_ — #445 was the last lane holding `SolutionChecker.tsx`; collision-clear confirmed three ways (branch/PR scan — its only history was #436, already merged; a zero-QR-reference scan of the file; CI **`lane-overlap` PASS**). **Dispatched to a fresh agent.** ⚠ **Its line numbers MOVED in #445 — re-derive them, never trust a pre-`ad2a9b2` line number.**

---

## 2026-07-15 -- #441 + #443: QR DESKTOP→MOBILE ANSWER UPLOAD **LIVE** (trunk `5aaaeec`), owner-live-verified

### 🆕 NEW FOLLOW-UPS

- **[FU-QR-STORAGE-LIFECYCLE] — OWNER INFRA, not code.** The QR channel's primary retention control is **delete-on-pickup** (the blob is destroyed the moment the desktop has it; proven in `test:qr:channel`), backed by a 5-min TTL sweep + a per-UID cap. The **24h lifecycle backstop the owner specified is a BUCKET RULE** (Firebase console / `gsutil lifecycle set`) on `qr-uploads/` — **an agent cannot set it**. It is defence-in-depth for the abandoned-upload case (phone uploads, desktop never picks up, TTL sweep somehow misses). **Please add it.** ⚠ Do NOT touch `ncert/` while in there — it serves live student PDFs.
- **[FU-GRADER-5MB-COPY] — the same arithmetic lie, inside the FORBIDDEN grader.** `checkSolution.cjs` returns `'Upload too large or invalid. Keep the PDF under 5 MB.'` **A 5 MB PDF is 6.67 MB of base64 and can never fit `readJson`'s 5 MB body cap — that instruction is impossible to follow.** #443 fixed every CLIENT surface (`src/services/uploadLimits.ts`, real ceiling 3.5 MB) so this string is now **unreachable from our UI**, which is why it was left alone rather than smuggled into a QR PR. It should be corrected in its **own owner-approved PR** (grader = forbidden; strictly a copy change, no logic).

### ❌ WITHDRAWN — do NOT file, do NOT act on

- **[FU-FULLMOCK-NO-UPLOAD-PANEL] — WITHDRAWN by the owner.** Full Mock **IS** covered. `ChapterTestPage.tsx:711` **and** `FullMockPage.tsx:1172` both render `ChapterTestUploadPanel`, so #441's single wire lit **three** surfaces (CT in-test, CT result, Full Mock) — owner-confirmed live on the Full Mock result screen. The FU came from grepping `components/fullmock/` and concluding from a **directory listing**; **shared components do not live in the consumer's folder.** *(Generalising lesson: "wire the shared component" beats "wire each page" — and a directory listing is not a dependency graph.)*

### ⚠ CORRECTED — `SolutionChecker` does NOT reach Check & Improve

The QR spec (and a later owner note) said `SolutionChecker.tsx` is consumed by C&I. **It is not.** Verified on trunk — its **only** importers are:

| Importer | Line | Surface |
|---|---|---|
| `components/practice/PracticeQuestionCard.tsx` | 5 | Quick Practice |
| `pages/HighlyProbableQuestions.tsx` | 29 | HPQ |
| `pages/TopicHub.tsx` | 20 | Topic Hub |

`DesktopCheckImprovePage.tsx`'s single mention is a **COMMENT** at **:1714** (`/* /check-solution reads a PDF natively (same as SolutionChecker). */`) and mobile `CheckImprove.tsx` never mentions it at all — **both own their upload code** (the FileReader→base64 logic is duplicated **5×** app-wide). A `git grep -c` returns **1** for the C&I page: **the exact "a grep hit is NOT an import" trap**. ⇒ **The SolutionChecker wire covers QP + HPQ + TopicHub. C&I needs its OWN, separate wire.**

### 🔁 STILL OPEN — the QR lane's remaining work

- **[FU-QR-SOLUTIONCHECKER-WIRE] (PR-2) — BLOCKED on the QP lane vacating the file.** _**⛔ SUPERSEDED — CLOSED by #447 (`d99c14d`); see the #447 section at the TOP of this file. Historical record only. ★ This BLOCKED entry is exactly why SolutionChecker's own 5 MB constant outlived #443 — that was the contract WORKING, not a miss.**_ — #436 merged, but the QP lane is **still mid-flight in `SolutionChecker.tsx`** (scorecard/self-assess fixes + a grader-touching PR to come) — **do NOT touch it until they are out.** **Seam contract (holds):** #436 replaced the old answer-input block with a **segmented control** (`answerTab: "upload" | "type"`) + an upload panel + a type panel. **★ QR attaches INSIDE the upload panel, NEVER as a third peer** — a QR handoff produces a FILE (the same `imageBase64`/`imageMimeType`/`imagePreview`/`fileName`/`isPdf` tuple `handleFileSelect` sets), so it is a **sub-mode of upload**. At 360px a third peer drops each CTA from ~162px to ~105px against ~105px of label, wrapping them and silently re-breaking the two-peer fix the owner's screenshot verdict bought. Use `mode="photo"` there (a single handwritten answer — one photo IS the answer). `handleClear`/`handleRecheck` must reset any QR session.
- **[FU-QR-CI-WIRE] — C&I needs its own wire** _**⛔ CLOSED by #454 (`a8be752`) — see the #454 section at the TOP. Historical record only. ★ Its `mode="photo"` instruction below was WRONG-SHAPED (C&I is BIMODAL) — true when written, since rotted. The shipped shape is `mode={isMultiQuestion ? "document" : "photo"}`.**_ (see the correction above): `DesktopCheckImprovePage` + mobile `CheckImprove`, both of which own their upload affordance. ⚠ #436 touched **both** C&I pages, so check lane-overlap against any open QP PR before starting. `mode="photo"`. — _**⚠ PARTLY SUPERSEDED by #451 — read the #451 section at the TOP of this file before acting on this entry.** Two corrections: **(1) DESKTOP-ONLY.** `QrAnswerHandoff` calls `useIsDesktop()` and returns null <1024px ⇒ a QR affordance in mobile `CheckImprove.tsx` **could never render** — a QR on a phone is meaningless, the camera is already there. **Mobile gets NO QR wire.** **(2) The "look for a third 5 MB constant" check is SPENT and was WRONG-SHAPED** — there was no third constant; C&I had **no guard at all**, now fixed by #451 (`c132f27`). Do not re-run that check; it can only find a bug that no longer exists._

### ✅ RESOLVED / SUPERSEDED by this lane

- **[FU-ADMIN-UIDS-DEPLOY-ENV] — partially answered.** `FIREBASE_SERVICE_ACCOUNT_KEY` **IS** set on Railway (owner read `credentials: explicit` in the deploy log) — but **it was already set for the pre-existing `[share]` feature.** ⚠ **`ADMIN_FIREBASE_UIDS` is still unset**, so the admin solution-cache endpoints remain 503/fail-closed. Unrelated to QR.
- **The QR channel needs NO `firestore.rules`/`storage.rules` change and NO deploy step** — firebase-admin bypasses both, and no client touches either, so the existing deny-alls are correct and protective. **Do not "helpfully" add a rule for `qrUploadSlots` or `qr-uploads/`.**

## 2026-07-15 -- #435: MATHTEXT COMMAND CORRUPTION **CLOSED** — protect-then-promote (trunk `fd57db1`), owner-live-verified

### CLOSED by #435 (owner byte-review + live-verify)
- **[FU-MATHTEXT-COMMAND-CORRUPTION] — CLOSED.** `MathText`'s auto-promote no longer reaches inside a LaTeX command. Fixed **by construction** (a protected-span model), not by a regex patch. Owner live-verified: the tutor renders `\cos²A` / `\sin²A` as real maths and every consumer surface is unchanged. Code #435 → `fd57db1`. **Do NOT re-attempt.**
  - **The prior entry's mechanism was RIGHT about the rule but WRONG about the repro** — worth recording, because the stated repro is what a fixer would have coded against. The rule is `([a-zA-Z])\^(\d+)`: it needs a **digit immediately after `^`**, so `\cos^{2}` (braced) **never matched and was never mangled**. The mangle input is the **unbraced** `\cos^2`. The braced form failed a *different* way — nothing wrapped it, so it printed as literal source. Both look like "broken source" on screen, which is why they were filed as one bug. **A fix aimed at the documented repro would have fixed neither.**
  - **The defect was ~4x the report.** One root cause (no concept of a protected span) → four defects: **D1** mangle (`\cos^2 A` → `\co\(s^{2}\) A`) · **D2** raw (`\cos^{2} A`, `\text{LHS} = \frac{1}{2}` printed as source; only `\sqrt`/`\frac` had a wrap path) · **D3** **block delimiters were never protected** — the old guard scanned `\(...\)` only, so the tutor's *correctly wrapped* `\[...\]` block maths was mangled anyway (**the prompt-hardening belt could not save it**) · **D4** every brace rule used `[^}]+`, cutting at the first `}` → `\sqrt{\frac{a}{b}}` emitted **invalid LaTeX**.
  - **The prior "safe fix" proposal (a `commandRanges` mask) was directionally right but would have under-fixed** — it masks the ^/_ rules only, leaving D2/D3/D4 open. The shipped design goes further: `scanProtectedSpans` FIRST (delims `\(...\)` **and** `\[...\]` + command names with **balanced, nesting-aware** args) → promote **only in the gaps** → wrap bare-LaTeX runs.
  - **★ Why NOT a lookbehind (the load-bearing decision).** Adding `(?<![\\a-zA-Z])` to the ^/_ rules — the guard the `sqrt`/`frac` rules **already carry**, which is how we know the pattern was known and the exponent rules were simply missed — rejects a base letter preceded by **any** letter. That silently stops promoting `AB^2 + BC^2 = AC^2` (Pythagoras), `H_2 O`/`CO_2` (Science bank), `24 cm^2` (grader units) — all over the bank, **all rendering correctly today**. It trades a bank-wide regression for a trig fix. **The no-regression proof is the ABSENCE of a lookbehind, not a test that happens to pass:** gaps never contain a command, so they need no guard and stay byte-identical **by construction**.

### ★ THE LESSON THAT GENERALISES PAST THIS FILE (read this one)
- **"Wrap what `UNICODE_MAP` cannot express" beat "is it syntactically complex" — and only an ADVERSARIAL CORPUS caught it.**
  - The first implementation defined *structural* (= should be wrapped) as **"has brace args or a `^`/`_` script."** It passed everything expected of it. It was **wrong**: a lone function command — `\tan A`, `\ln x`, `\sin A` — has neither args nor a script, and `\tan` has **no `UNICODE_MAP` glyph**, so it fell through to the fallback and **printed literal `\tan` on screen. D2 was still open for that whole class.**
  - The corrected rule: **`structural = has args/script OR the command has no UNICODE_MAP glyph`**. The real question was never *"is it complex"* — it was **"can the proven fallback render it."** Syntax was a proxy; capability was the actual criterion.
  - **A reasonable-looking, example-based test suite would have gone green while `\tan`/`\ln`/`\sin A` stayed raw in front of students.** The only reason it surfaced was running a corpus of cases chosen to *attack* the rule rather than to confirm it. **This is the strongest argument in this repo for adversarial corpora over example-based tests** — the bug lived exactly in the gap between "the cases I thought of" and "the cases the tutor actually emits."
  - Generalise: when a rule is a **proxy** for the property you actually care about, the proxy is where the bug hides. State the real property (*can the fallback render it*) and test against inputs designed to separate the two.

### NEW (opened by #435)
- **★★ [FU-CI-GATE-VITEST] — ESCALATED at #456 (2026-07-16): owner ruled it is "no longer hygiene debt" and wants its OWN priority conversation. See the #456 section at the TOP of this file for the full case — the "borrows the authority of a passing suite without ever being run" framing, and `scope:guard` as a SECOND INSTANCE OF THE SAME SPECIES. FOUR suites exist and NONE of them run, anywhere. Fix before soft launch.**
  - **The ungated suites, by name:** *(#456 added 18 cases to suite 3 — they execute nowhere)*
    1. `lazytopper/src/components/question/MathText.test.tsx` — guards the app's **shared maths renderer** (13 consumers).
    2. `lazytopper/src/components/equation/EquationInput.test.tsx` — guards the **equation widget**.
    3. `lazytopper/src/pages/tutor/tutorRoundTrip.test.ts` — guards the **tutor round-trip**.
    4. `lazytopper/src/components/worksheet/WorksheetPrintDoc.test.tsx` — guards the **worksheet print doc**.
  - **Confirmed by reading `.github/workflows/quality-gate.yml` (owner independently re-read it):** the steps are **root guard matrix → mojibake → build → ops matrix**. **No vitest anywhere.** `vitest` exists in `lazytopper/package.json` only as `"test": "vitest run"` / `"test:watch"` — **nothing calls either**.
  - **★ The misread that produced the false claim, recorded so it isn't repeated:** a tutor-lane agent reported "quality-gate pass (1m39s: linux build + **vitest** + matrices)" on its merged PRs. It is wrong, but understandably so — the **root** matrix is `node --import tsx/esm --test src/*.test.ts`, i.e. **Node's BUILT-IN test runner**, which prints `# tests 181 / # pass 181` into the CI log. That scrolls past looking exactly like a suite. **It is not vitest.** Do not infer a gate from CI log shape — read the workflow file.
  - **Why this matters:** these four suites guard a shared renderer, the equation widget, the tutor round-trip and the worksheet print doc — i.e. the surfaces where a silent regression is most expensive. **A test that never executes is decoration.** It buys false confidence, which is worse than no test.
  - **Windows cannot run them** (`@rollup/rollup-win32-x64-msvc` is stripped by `pnpm-workspace.yaml`'s linux pin) → today the only route is a **Codespaces** run pasted by the owner, per-PR, by hand. **Wire vitest into `quality-gate.yml` (the linux runner is already there) before soft launch.** Deliberately NOT bundled into #435 (owner: do not widen the PR).
- **[FU-MATHTEXT-MULTILETTER-BASE]** — `AB^2` promotes to `A\(B^{2}\)`: the leading letter renders in prose font, the rest as KaTeX. Same for `CO_2` → `C\(O_{2}\)` and `cm^2` → `c\(m^{2}\)`. Slightly mismatched fonts; **renders correctly and has shipped for months.**
  - **#435 preserved this BYTE-IDENTICAL on purpose, and the reasoning is the point:** `\cos` printing literal `\co` is a **credibility bug in a maths tutor**; `AB²` in slightly-off fonts is a **polish nit**. **Never trade a bank-wide regression for a trig fix.** Fixing it means promoting whole tokens (`\(AB^{2}\)`), which changes rendering on **every bank surface + both print docs** — a far bigger blast radius than the bug being fixed, and it needs its own live-verify pass. Own PR, own live-verify. Not urgent.
- **[FU-MATHTEXT-RENDER-GATE-RATIONALE] — do NOT remove `katexCanRender` as redundant.** #435 wraps a bare-LaTeX run **only if KaTeX proves it renders** (a `throwOnError:true` probe); anything else is left **exactly as it is today**.
  - **Why it exists:** without it, an invented command (an LLM writing `\bogus{x}`, or a stray `\left(` with no `\right)`) gets wrapped and KaTeX — which runs with `throwOnError:false` — paints it **red**. **Raw source is bad; a red error box is worse.** The gate makes the fix strictly non-regressive: new behaviour **only** where it demonstrably renders, otherwise degrade to today.
  - It looks redundant because all 46 commands in `UNICODE_MAP` + the trig/log family were probe-verified against the pinned KaTeX and **46/46 render** — so the gate never fires on today's content. **That is exactly the point: it is the guard for TOMORROW's content**, which arrives from an LLM and is not enumerable. The rationale lives in the code comment AND here so nobody deletes it as dead weight.
## 2026-07-15 -- #438 (bank MCQ repair) + reachability verification + syllabus ruling

### RESOLVED / CLOSED
- **[FU-BANK-UNRESOLVABLE-MCQ-KEYS] — CLOSED by #438.** 13 rows (NOT 34) withheld; ZERO were key-fixes. The "34" was an exact trim+lowercase scan; the real grader contract (`normaliseOption` + letter<->text bridging + >=3-char partial match) forgives 21. **The recorded severity claim was FALSE** — the item silently NEVER SCORES; a correct pick is never marked wrong. Bank 8,597 -> 8,584. CI landmine (`fullMockBlueprint.test.ts` key-resolves assertion, passing only by seed luck) CLEARED.
- **[FU-QP-WORKSHEET-BANK-SOURCING] — WITHDRAWN, premise disproven. Do NOT re-file.** QP and Worksheet DO source `canonicalQuestionBank`, one transitive hop below their direct imports. Verified by calling the real fns (10/10 and 8/8 canonical). Full trace + the two traps that caused the wrong conclusion are in `BANK_EXPANSION_LANE_STATE.md`.
- **HOLD on `CBE-S-MAGN-A-001` — CLOSED.** Never a real defect; it resolves under the real contract and only appeared via the bad scan.
- **"168 objective rows with no options[]" — CLOSED, not a defect.** `isObjectiveType` returns true for any `section === "A"`, so 1-mark free-text VSA items are objective-classified; with no options they defer to the model's binary verdict — correct for a 1-mark all-or-nothing item. Do not "fix" these.
- **RULING — magnetic-effects:** chapter RETAINED & EXAMINED (official 2026-27 Unit IV "Effects of Current" = 13 marks); **Motor / Electromagnetic Induction / Electric Generator OUT of board-prep authoring** (assessed "only formatively... without adding to summative assessments"). Honest low stop accepted for that chapter.

### NEW
- **[FU-BANK-SCARCE-BAND-MISBANDING] — ✅ CLASS (a) RESOLVED by #504 (trunk `b810055`, owner LIVE-VERIFIED); CLASS (b) STILL OPEN (M-L, PRE-LAUNCH).** The owner's live "5-mark Section D / Easy = 'Find the value of cosec 60°'" bug: **`TG3-056` was a CANONICAL BANK ROW served faithfully from a wrong bank.** **CLASS (a) — RESOLVED (#504, data-only, own PR):** the mis-banded objective/short rows at `section:"D"/marks:5` were relabelled to their true CBSE value — **the "~76" estimate was actually 44** (37 `MCQ`/`Assertion-Reasoning` → A/1, format unchanged so they stay binary 0-or-1; 7 short VSA → B/2, each PYQ-grounded, `solutionSteps` re-authored to the 2-mark scheme). The gap to 76 is the Class-(a)/(b) boundary working: short-*prompt* genuine-`Long` proofs ("Prove √2 irrational", "Describe the alimentary canal") are correctly banded and correctly excluded. This also resolves the co-tracked `[FU-AITIER-MARKS-MISMATCH]` (its shrink-only `PACK_5MK_SHORT_BACKLOG` is now empty). **CLASS (b) — STILL OPEN:** **~178 under-stepped D/E solutions** (legitimately 5-mark multi-part items whose `solutionSteps` were never broken out — a DIFFERENT defect, do not conflate). 254/2,211 D+E rows violate CBSE step-marking; 16 topics. **Own PR(s), data-only. NOT folded into a topic-expansion batch** (touches done topics; would wreck an additive byte-review).
- **[FU-BANK-MCQ-REEXTRACT] (S-M)** — recover the 13 withheld rows from the source papers with **pymupdf** (`pdfplumber` BANNED — it caused this damage). Sources present at `Desktop/diff/cbse-papers/PYQ/X question papers/`; pymupdf verified to extract them with 0 `(cid:` artifacts. Recovered ⇒ delete the id from `WITHHELD_QUESTION_IDS`. **Never guess a distractor.** `PYQ-S-2024-MAG-002` stays withheld regardless (positron = out of syllabus).
- **[FU-TOPICMATCHES-SUBSTRING-CONFLATION] (S)** — `predictionCore.ts:259` `topicMatches` is `q.includes(r) || r.includes(q)`. Swept all 26 slugs: **exactly one colliding pair, `circles` <-> `areas-related-to-circles`** — both return 456 (= 229 + 227) in QP / Worksheet / TopicHub / dailyMission. **CT/FM immune** (`bankQuery` exact `resolveCanonicalSlugSet`). Not blocking, but **both halves are in the remaining 6 Maths topics** — expect it during QA. Engine file ⇒ another lane.
- **[FU-REACHABILITY-TEST-SCOPE] (S-M)** — `topickey_runtime_proof.mjs` (this lane's mandatory step 6) asserts bank INTEGRITY only (count>5000, 0 dups, canonical slugs, registry coverage) and **never touches a surface**; it would stay green if a surface stopped sourcing the bank. It hid no bug, but cannot catch the regression class its name implies. Add a surface-sourcing assertion.
- **[FU-CLAUDEMD-S5-MAGNETIC-STALE] (owner's call — FLAGGED, deliberately NOT edited)** — `CLAUDE.md` §5 calls magnetic-effects deleted/banned. It is a **retained, examined** 2026-27 chapter (13-mark Unit IV) serving 238 live questions, and `syllabusGuard` has no ban entry for it. Almost certainly caused by the official PDF's "Note for Teachers" naming chapter titles loosely; see the lane state for the pattern proof.
- **[FU-ELEC-001-TOPIC-MISFILE] (XS)** — `PYQ-S-2024-ELEC-001` (force on a current loop near a conductor = magnetic effects) carries `topicKey: electricity`. Now moot in practice (withheld by #438), but fix the topicKey if re-extraction restores it.
## 2026-07-15 -- #436 OPEN (QP sessions + unique sets + C&I return ticket + type/upload CTA) — ⚠ QR-LANE SEAM (read BEFORE touching SolutionChecker)

### ⚠⚠ SHARED-FILE SEAM — `components/question/SolutionChecker.tsx` (QR lane ↔ this lane)
The QR desktop→mobile upload lane and #436 are file-disjoint **except this one file**. #436 lands FIRST
(owner-directed); the QR lane builds on top. The contract, so neither lane edits it blind:

- **#436 OWNS the old L481–586 block** (the hero dropzone + the `▼ Or type your answer instead`
  disclosure) and has REPLACED it with: a **segmented control** (`type AnswerTab = "upload" | "type"`,
  `answerTab` state, `role="tablist"`) + an **upload panel** (`answerTab === "upload" && …` guards the
  dropzone / image preview / PDF indicator) + a **type panel** (`answerTab === "type" && …` mounts the
  shared `<EquationInput>`). **REBASE ONTO THIS** — do not resurrect the old block.
- **★ QR ATTACHES INSIDE THE UPLOAD PANEL — NOT AS A THIRD PEER.** A QR handoff produces a FILE: it
  sets the same `imageBase64` / `imageMimeType` / `imagePreview` / `fileName` / `isPdf` tuple that
  `handleFileSelect` sets, so it is a **sub-mode of upload**, not a sibling of type-vs-upload.
  **Why this is a product invariant, not a preference:** the two-peer row is what the owner's
  screenshot verdict bought (typing was a ~0.72rem borderless link under a ~66px dropzone — ~4.7×
  the height). At 360px the card's inner width is ~328px → ~162px per CTA against ~105px of label.
  A THIRD peer drops that to ~105px each and the labels wrap — silently re-breaking the fix.
- **State QR needs is already local and unchanged:** `setImageBase64` / `setImageMimeType` /
  `setImagePreview` / `setFileName` / `setIsPdf`. No state refactor is required by either lane.
  `handleClear` (and `handleRecheck`) must also reset any QR session — both now set
  `setAnswerTab("upload")`.
- **`canCheck` + `handleCheck` are now TAB-SCOPED** (`answerTab === "upload" ? hasFile : hasText`).
  A QR-delivered file lands on the upload tab, so it flows through unchanged — but note the send is
  now "what you see is what you send", not "an attached file always wins".
- **NEITHER LANE touches** `src/components/equation/**` (EQUATION_INPUT_API_CONTRACT "one writer per
  file") or `server/routes/checkSolution.cjs` (the grader).
- **Already a dependency — do not add one:** `qrcode@^1.5.4` (`lazytopper/package.json`) +
  `services/referralService.ts` `generateQRDataUrl(text, width)`.

### RESOLVED by #436 (pending merge + owner live-verify)
- **[FU-QUICK-PRACTICE-DURABLE-SURFACE] — CLOSED by #436.** `SessionSurface` now carries a fifth value
  `"quick-practice"`; a finished QP set writes a durable record (`QP-{S}-{TOPIC}-{hash8}`) + its
  perQuestion payload. **LOCKED §1a NARROWLY AMENDED (owner-ratified 2026-07-15):** §1a's COUNTING rule
  stands untouched — QP feeds progress/MI ONLY via `recordAttempt`; the record is a NON-COUNTING
  session artifact, excluded structurally by `PROGRESS_COUNTING_SURFACES` at progressStore's two
  `winRecords` boundaries. The amendment is written into all three files that state the rule.
  **→ unblocks [FU-TUTOR-READ-QP-RECORD] (below).**
- **[FU-RETURN-TICKET-CONTRACT] — SUBSTANTIALLY CLOSED by #436; see the correction.** The premise was
  **STALE**: PracticePage has read + validated + honoured `returnTo` since #428 (`safeReturnTo` →
  `practiceBackTo`, which puts `returnTo` ABOVE nav-state and the `/practice-hub` default). Only **C&I**
  was genuinely stranded, and #436 wires it on BOTH shells via one shared `useReturnTicket` +
  `ReturnTicketStrip` + a prepended `ScorecardAction` (incl. the all-pending branch, which does not use
  the stacked menu). **The convention is the EXISTING `returnTo` + `backLabel` — no param was minted,
  and `source` was never reused (it already means pyq/ncert/all on PracticePage).**
  **Carry-forward → [FU-TUTOR-BACKLABEL] (below).**

### NEW — from #436
- **[FU-TUTOR-BACKLABEL]** — *the last inch of the tutor's practice leg, and it is ONE LINE in the
  TUTOR lane's own file.* A tutor-sent student's QP back button already points at
  `/tutor/10/Maths/trigonometry` — but it reads **"Back"**, not "Back to your tutor", because
  `backLabel` falls through all four fallback tiers (`routeOut` calls bare `navigate(href)` with no
  nav-state, and the destination matches neither `/practice-hub` nor `/exam-trends`). Fix: add
  `backLabel: "Back to your tutor"` to `buildQuickPracticeRoundTripHref` (`pages/tutor/tutorRoundTrip.ts`)
  — and to `buildCheckImproveRoundTripHref` too, now that C&I honours it (#436). PracticePage needs NO
  change. Tests use `toContain`, so adding a param breaks nothing. **#436 deliberately did NOT touch
  `pages/tutor/**` — that is the tutor lane's file.** Pairs with the already-open
  **[FU-PRACTICE-COUNT-PASSTHROUGH]** (same file, same one-line shape, same PR).
- **[FU-TUTOR-READ-QP-RECORD]** — now UNBLOCKED by #436's record. The tutor's return detection currently
  polls the `practiceInsights` attempts stream (`matchReturningAttempts`, `tutorRoundTrip.ts`) *because*
  QP wrote no record. It can now read the real QP `sessionRecord` + its graded payload instead.
  ⚠ Two coordinated edits: `tutorSessionStore.ts`'s marker union is its OWN
  (`"check-improve" | "practice" | "worksheet"`) and `useTutorSession.ts` writes `"practice"` — that
  string is NOT `SessionSurface`'s `"quick-practice"`, so a naive `r.surface === pending.surface`
  compare will not match. Tutor lane's call, at its own pace.
- **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE]** — the old copy *"Or add text notes too"* was a **broken
  promise at BOTH layers**: the client (`hasText && !hasImage`) and `server/routes/checkSolution.cjs`
  (its prompt branches on `hasImage` and ignores `textAnswer`) each drop typed text whenever an image is
  attached. Text-alongside-file has never worked. #436 stopped promising it (the segmented control makes
  the real image-XOR-text behaviour visible); **making it actually work is a grader change** → its own
  PR, with the two-functions-in-one-file rule in play.
- **[FU-QP-HISTORY-RAIL]** — QP writes records but has **no history surface**; deliberately deferred from
  #436 (owner ruling: it is a product feature, not plumbing). **The real design question to rule on with
  a mockup:** QP's scorecard is **"X of N attempted, never marks/total"** (LOCKED §2.1), so a QP rail
  **cannot clone ChapterTestHistoryRail's marks `ScoreRing`** — that number would be wrong for QP. This
  is the one place QP history is not a copy of anything. Container rule points to an **inline rail on
  PracticePage, filtered to the current canonical topic** (the CT precedent: few records, at the decision
  moment). `SURFACE_COPY` already carries the compile-forced QP entry (`SurfaceHistory.tsx`), but
  mounting `SurfaceHistory` would need a `topicKey?` prop + a surface-aware empty state + a
  surface-aware re-open (it hardcodes `storedWorksheetScorecardVariant`) — i.e. MORE change to shared
  infra that is live for worksheet.
- **[FU-SAFE-PATH-VALIDATOR-DUPLICATION]** — the "safe redirects always" doctrine is honoured by
  **EIGHT copy-pasted validators**, not one helper: `BackToParent.tsx` (strictest — uniquely also
  rejects `/\` and `\`), `pages/tutor/tutorPath.ts` (**the only EXPORTED one**; #436 reuses it rather
  than adding a ninth), `DesktopTopicHubPage.tsx`, `PracticePage.tsx` (inline; also the only one that
  decodes first), `Login.tsx`, `MockBuilder.tsx`, `HighlyProbableQuestions.tsx`,
  `WorksheetGenerator.tsx`. Promote ONE (harden the exported one with the backslash checks) and migrate.
  Cheap, but it touches 8 files → its own hygiene PR.
- **[FU-DELETE-DEAD-PRACTICE-STUB]** — `pages/mobile/MobileAppPracticePage.tsx` is a **dead 25-line stub**
  ("Practice screen — Task #437") with **ZERO inbound references**, whose doc comment claims **`/app/practice`**
  — which *looks exactly like* the owner's live QP route. **It is not that route:** QP is
  `/practice/:grade/:subject` → `PracticePage` (ONE component, both shells; the `/app/` prefix is just
  `BrowserRouter basename="/app"`). This decoy plausibly caused the earlier Me/Progress desktop-mobile
  drift. Delete in its own cleanup PR — #436 did not fold a deletion in.
- **[FU-PROGRESSSTORE-STALE-HEADER] — fixed in passing by #436.** `progressStore.ts`'s header claimed it
  reads `mockScoreHistory`, which it **never imports**; the real third stream is `mistakeLogService`.
  Corrected. Logged so the correction is traceable.

### ⚠ OPEN OWNER DECISIONS on #436 (do not merge silently past these)
1. **No `#NN` on QP codes.** WS/CT/FM/CI all carry a durable `#NN`; QP uses a content hash instead
   (`QP-{S}-{TOPIC}-{hash8}`) because a counter is stateful and would force the mint-once-before-write
   dance that a lazily-derived id exists to avoid. A QP session is closer to a log entry (date + topic +
   "8 of 10 attempted"). Ratify, or ask for `#NN`.
2. **Section E defaults to the `upload` tab**, matching both shipped C&I controls. Typing is now an equal
   always-visible peer so it is no longer *hidden* — but if desktop students mostly type, the DEFAULT is
   a separate product call.
3. **QP rows now appear in the Me recent strip** (`getRecentSessions` has no surface filter) — the
   owner-approved display-only exception. Visible on `/me` at live-verify; it is NOT a counting path.

### ⚠ VERIFICATION GAP on #436
**Vitest was NOT run.** It is linux-pinned — `@rollup/rollup-win32-x64-msvc` is stripped by the
deliberate `pnpm-workspace.yaml` platform overrides, so it cannot run on a Windows box, and CI runs the
MATRICES, not the general suite. #436 adds/changes three test files (the QP counts-ONCE property, the
draw invariant under rotation, the QP service units). **They need ONE Codespace run before merge**
(`node node_modules/vitest/vitest.mjs run …` — not `pnpm exec`). Everything else is green, incl. CI.

## 2026-07-15 -- #429 + #430 + #431: SHARED EQUATION INPUT/RENDER INFRA MERGED (trunk `65fdf85`)

### RESOLVED (infra shipped)
- **[FU-EQUATION-INPUT-TUTOR-CONSUME] — INFRA DONE; only the tutor-consume step remains.** The shared `<EquationInput>`/`<EquationRender>` shipped (#429) and the API + serialized-string contract shipped as `handoff/EQUATION_INPUT_API_CONTRACT.md` (#430). The tutor composer can now drop in `<EquationInput>` (props `value/onChange/placeholder/disabled/rows/className/ariaLabel`; serialization = prose + `\(…\)`/`\[…\]` LaTeX + readable shorthand). Carry-forward renamed → **[FU-TUTOR-CONSUME-EQUATION-INPUT]**: the tutor lane imports it into `TutorPage.tsx` at its own pace (small follow-up); THIS lane did not touch TutorPage.tsx.

### NEW (likely the next lane for the equation/MathText owner)
- **[FU-MATHTEXT-COMMAND-CORRUPTION]** — MathText's bare-pattern auto-promote corrupts bare LaTeX COMMANDS, and it is **still reproducing live in the tutor** (tutor turns emit `\(…\)`/bare LaTeX including `\cos^{2}`, `\sin^{2}`, `\log_{10}`).
  - **Mechanism:** in `preprocessBarePatterns` (`MathText.tsx`) the bare promotions — `([a-zA-Z])\^(\d+)`, `([a-zA-Z])_(\d+)`, `(?<![\\a-zA-Z])sqrt…`, `frac…` — run on the RAW string BEFORE the `\(…\)` delimiter parse. For `\cos^{2}` the `s^{2}` tail matches `[a-zA-Z]\^…` → the string becomes `\co\(s^{2}\)`: the `\co` is an orphaned broken command and the wrong glyph renders. (The `\^` promotions guard against being INSIDE an existing `\(…\)` via `isInsideDelimiter`, but NOT against being inside a bare `\command`.)
  - **My read of the safe fix (I know this renderer best):** mirror the existing `delimitedRanges` mask with a `commandRanges` mask — scan for `\[a-zA-Z]+` command spans first, then have every bare promotion SKIP a match whose offset falls inside a command span (a JS fixed-width lookbehind can't express `\[a-zA-Z]*`, so a pre-computed range mask is the clean way, exactly like `isInsideDelimiter`). Bare `x^2` / `sqrt5` / `frac1/2` (no preceding `\`) are unaffected — they're the intended inputs. Alternatively (belt-and-suspenders) tokenize known `\cos/\sin/\tan/\log/\ln/\sqrt/\frac/...` commands out before promoting.
  - **Consumers that need a regression test when this is fixed** (ALL render through `<MathText>`): print docs (`CheckImproveGradedPrintDoc`, `WorksheetPrintDoc`, `WorksheetGradedPrintDoc`), practice cards (`PracticeQuestionCard`), HPQ (`HighlyProbableQuestions`), the C&I live views (`SolutionChecker` + mobile/desktop C&I echo fields), and tutor turns (`TutorMessageRenderer`). Add a shared fixture of bare-command inputs (`\cos^2 \theta`, `\sin^2`, `\log_{10}`) asserting no orphaned `\co`/`\si` and a correct render.
  - **Out of scope for the equation lane** (#429/#431 did not touch MathText); the friendly tokens that lane inserts (x^2, sqrt5, frac1/2) are the promote's intended inputs and do NOT trip it. Likely the next lane for this owner (owns the renderer).

## 2026-07-15 -- #432: TUTOR STAGE 2 COMPLETE — the six round-trip fixes MERGED + owner-live-verified (trunk `65fdf85`); Stage-2 carry-ins CLOSED; new live FUs logged

### CLOSED / SUPERSEDED by #428 + #432 (owner live-verified)
- **[FU-TUTOR-DURABLE-SESSION] — CLOSED.** The durable `tutorSessions/{uid}` session (thread + doubts/coverage, NEVER a grade) now survives close/reopen AND the round-trip; verified live (memory persists).
- **[FU-TUTOR-MOBILE-VIEWPORT] — CLOSED.** The BARE_FULLSCREEN tutor is locked to `100dvh`/flex (stream the only scroller, composer pinned); 360px owner-live-verified, no empty gap.
- **[FU-TUTOR-WORKSHEET-CONCEPT-FILTER] — SUPERSEDED (moot).** The practice leg no longer routes to `/practice/worksheets` at all — it routes to Quick Practice concept-filtered (owner decision, Fix 1). The worksheet `parseEntryContext` concept-parse is no longer on the tutor's path.
- **[FU-TUTOR-CI-NO-PRELOAD] — SUPERSEDED** by [FU-RETURN-TICKET-CONTRACT] (the deep-link/return-ticket is the real gap) + [FU-TUTOR-INCHAT-QUESTION-UPLOAD] (the pre-load feature). The MVP behaviour (tutor deep-links to C&I, student uploads, tutor polls the returning record) shipped as designed.

### NEW — live outstanding after #432 (the tutor round-trip's real remaining set)
- **[FU-MATHTEXT-COMMAND-CORRUPTION]** — `MathText`'s auto-promote (`components/question/MathText.tsx` ~L88, the `([a-zA-Z])\^(\d+)` promote) mangles a bare LaTeX command: `\cos^{2}` → `\co\(s^{2}\)`, `\sin^{2}` → `\si\(n^{2}\)`. **SHARED component** (print docs, question cards, AND the tutor) → needs its OWN PR with regression tests, not a tutor-lane patch. **#432's prompt hardening (wrap every expression) helps the common case but does NOT fully fix it — still reproducing live on the tutor.** The real fix is skipping the promote for a `[a-zA-Z]` that's part of a `\command`, plus tests over the shared surfaces.
- **[FU-QUICK-PRACTICE-DURABLE-SURFACE]** — Quick Practice has NO `SessionSurface` "quick-practice": its scorecard is ephemeral, no graded answer sheet persists, and Me/Progress cannot see it. Foundational. #432's return detection reads the per-question `practiceInsights/{uid}/attempts` stream as a workaround; **building a durable quick-practice SessionSurface would let the tutor read a real record and delete the `practiceInsights` round-trip workaround.**
- **[FU-RETURN-TICKET-CONTRACT]** — the tutor sends `returnTo` + `source=tutor` on its deep-links, but NO destination READS them: `DesktopCheckImprovePage` hardcodes `source:"check"`/`returnTo:"/check-improve"` (~L137-138); mobile C&I and PracticePage likewise → the return leg is one-way (the student is not auto-returned to the tutor thread; today they navigate back manually and re-engage). A real "return ticket" contract needs each destination to honour `returnTo`. **Name collision to respect:** PracticePage already uses `source` for pyq/ncert/all FILTERING — the tutor's `source=tutor` must not be conflated with that filter.
- **[FU-PRACTICE-COUNT-PASSTHROUGH]** — the tutor's copy promises "a short practice set" / "3 problems", but PracticePage reads a `count` param (~L395) that the tutor deep-link never sends, so the set size isn't controlled. Additive: emit `count` on `buildQuickPracticeRoundTripHref` (and have the prompt/CTA agree on the number).
- **[FU-TUTOR-INCHAT-QUESTION-UPLOAD]** — let the student upload a question IN the chat itself, then route it to C&I (rather than only deep-linking to C&I's own upload). A richer version of the specific-question leg; owner-gated design.
- **[FU-MATHTEXT-COMMAND-CORRUPTION]** cross-refs the detailed equation-lane writeup above (same PR-window sibling entry) — the authoritative mechanism + safe-fix + regression-consumer list lives there.

## 2026-07-14 -- #425 + #426: TUTOR STAGE 1 (chat shell) + follow-up MERGED (trunk `d3c7be2`) → language/offer FUs CLOSED; Stage-2 carry-ins logged

### CLOSED by #426 (owner live-verified)
- **Tutor language stickiness — CLOSED.** After a long conversation in one language the tutor now switches on a selector change (a per-turn steering directive appended as the most-recent user-side content in `tutor.cjs`; server-only, never persisted). Verified both directions.
- **Tutor native-script input — CLOSED.** The composer already accepted any script (no filtering); the placeholder now invites English/Hindi/Hinglish. Verified.
- **Tutor closing-offer "do-their-practice" — CLOSED.** Reworded to a DEMONSTRATION offer ("want to see how a question like this is solved?" → the tutor solves its OWN generated example) + an explicit worked-example-vs-practice rule ("try one yourself" = give + WAIT, never self-solve). The routed "practise a set" offer is deferred to Stage 2. Correctness rail kept.

### CARRY INTO STAGE 2 (open — the round-trip PR; pre-flight in owner review)
- **[FU-TUTOR-DURABLE-SESSION]** — no memory across close/reopen (EXPECTED for Stage 1; the thread is component-local). Stage 2 adds the durable `tutorSessions/{uid}` session (thread + doubts/coverage; NEVER a grade). The `firestore.rules` block is already DEPLOYED.
- **[FU-TUTOR-MOBILE-VIEWPORT]** — the BARE_FULLSCREEN tutor scrolls past the composer leaving an empty gap at 360px (100vh-on-mobile). Folded into Stage 2 as a pre-step (lock the shell to the viewport; stream the only scroller; composer pinned).
- **[FU-TUTOR-CI-NO-PRELOAD]** (Stage-2 pre-flight finding) — C&I is auto-detect + MANUAL upload only; it does NOT read a `?topic=`/pre-loaded question (those params feed only the breadcrumb/analytics). So the tutor's "route the question to C&I pre-loaded" is unsupported today. Stage-2 MVP = the tutor deep-links to C&I (+ "holding your place") and the student uploads as usual; on return the tutor polls for the new `check-improve` record. A true pre-load needs a C&I entry change — flagged; owner decides.
- **[FU-TUTOR-WORKSHEET-CONCEPT-FILTER]** (Stage-2 pre-flight finding) — the `/practice/worksheets` route (`WorksheetGenerator.parseEntryContext`) reads subject/stream/topic(s)/scope only; it does NOT parse a concept `focus` or mark-band (`marksMin`/`marksMax`). P-A's concept-filtered worksheet needs a small additive parse in `parseEntryContext` (mirroring `buildDesktopConceptPracticePath`), else the MVP routes to a TOPIC-scoped worksheet (MI-weighted but not concept-narrowed).
- **[FU-TUTOR-LEGACY-RETIRE]** — retire the six old engine files + the "Teach me" entry AFTER the new tutor is fully live (post-Stage-3), its own small PR.
- **[FU-TUTOR-SUBREGION-FOCUS]** — deferred indefinitely (Stage-3 visual sub-region focus; correctly-grained notes/bank figures make it unnecessary).
- **[FU-EQUATION-INPUT-TUTOR-CONSUME]** — ✅ INFRA SHIPPED (#429/#430/#431); superseded by **[FU-TUTOR-CONSUME-EQUATION-INPUT]** (see the 2026-07-15 section above). The shared `<EquationInput>` + `handoff/EQUATION_INPUT_API_CONTRACT.md` exist; the tutor composer imports it drop-in at its own pace. Do NOT build a separate equation input.

## 2026-07-13 -- #419: bank-expansion Batch 11 (triangles + coordinate-geometry + metals-and-non-metals +315, SECOND 3-topics-per-PR) MERGED (trunk `69e319d`)

### No NEW follow-ups from this batch
Add-only batch, clean gates, owner byte-review CLEAN. Standing bank-lane FUs ([FU-D-BAND-HONEST-CEILING], [FU-BANK-EXACTNORM-DUPS],
[FU-EXTRACT-CONTENT-F13], [FU-FIGURE-PENDING-SAFEGUARD], [FU-BANK-UNRESOLVABLE-MCQ-KEYS], [FU-SYLLABUS-ANCHOR-OFFICIAL-2026-27]) are unchanged.

### RESOLVED / CLOSED adjudication
- **Angle-bisector-theorem syllabus adjudication — CLOSED (in-syllabus determination made per topic).** Owner-verified 2026-27: the
  internal ANGLE-BISECTOR THEOREM (BD/DC = AB/AC) is OUT of Triangles ("proof of various theorems" trimmed) — 2 D items asserting it
  were dropped. The precise both-directions nuance: **PF-015** (corresponding angle bisectors of SIMILAR triangles are proportional,
  proved via AA similarity) was KEPT — it is in-syllabus similarity, NOT the deleted standalone theorem. Also confirmed OUT (already
  guard-banned): coordinate-geometry AREA-FROM-COORDINATES (~28 source items dropped) and metals Periodic Classification (Ch5).
  `syllabusGuard.ts` was NOT edited; no open question remains.

## 2026-07-13 -- #420: C&I PR-3 — the model-solution CACHE MERGED (code `cc84ae5`) → [FU-CI-SOLUTION-CACHE] CLOSED, 1 NEW — the C&I arc is DONE

### CLOSED by #420 (owner byte-reviewed CLEAN + merged)
- **[FU-CI-SOLUTION-CACHE] — CLOSED.** The owner-signed-off 3-gate cache is LIVE via the ratified SCHEME-FIRST design: keyless SUBJECTIVE C&I questions grade against a STUDENT-AGNOSTIC model solution from the EXISTING `step_solutions` Postgres cache (question-hash → read → generate-from-question-ONLY on miss → Gate-2a quality gate → write-if-pass) injected into the grader's EXISTING marking-scheme slot; same question shares ONE solution across students and interoperates with `/api/step-solution`. Gate 1 (server-only Postgres writes, no client path) + Gate 3 (question-only generation prompt; no student answer/image/PII in the cache — regression-tested) confirmed by construction; Gate 2a = `validateSolutionQuality` at EVERY cache write path (FAIL ⇒ served once, never persisted, reason-coded); Gate 2b = `POST /api/admin/solution-cache/evict|regenerate` behind a fail-closed `ADMIN_FIREBASE_UIDS` Bearer allowlist. Sacred grader diff = +95/−4 deps-injected hooks only ("textbook-clean" byte-review). CACHE_VERSION now prefixes ALL hashes (the objective-only prefix was a latent staleness bug — a bump never busted subjective entries). Owner live-verify pending.
- **[FU-MODEL-ANSWER-QUALITY] — structurally addressed by #420 (stays OPEN for content-QC spot-checks).** The garbled-model-answer risk can no longer become SYSTEMATIC: no unchecked solution can enter the shared cache (Gate 2a), and a bad one reported by the owner is evictable by hash (Gate 2b). The residual is the one-off live-generation case — content/AI-quality QC track.

### NEW (open) — surfaced by #420
- **[FU-ADMIN-UIDS-DEPLOY-ENV]** — `ADMIN_FIREBASE_UIDS` (comma-separated Firebase uid allowlist) must be set on the server deployment env (Railway) to ACTIVATE the Gate-2b eviction/regeneration endpoints; until then they return 503 (fail-closed — safe, just non-functional). First wiring of ADMIN_FIREBASE_UIDS in `lazytopper/server/`; documented in `server/.env.example`. Owner deploy step, one-time.

## 2026-07-13 -- #416: C&I PR-2 — the FINAL Check & Improve frontend PR MERGED (code `a1eaebc`) → 3 FUs CLOSED, 1 NEW

### CLOSED by #416 (owner byte-reviewed CLEAN + merged)
- **[FU-CI-PERQUESTION-TOPIC] — CLOSED.** Per-question topic via route A2 (client re-runs the EXISTING `/detect-question` per question against the `topics.ts` vocab; the sacred `checkSolution.cjs` — which hosts the detect endpoint — byte-untouched). Unlocks the by-topic scorecard lens + the counted `N topics` chip; unresolvable stays empty (never guessed); externally-uploaded questions still have no `questionId` so the concept/subtopic stays unknowable (not fabricated).
- **[FU-MOBILE-CI-PARITY] — CLOSED.** Mobile `/check-improve` reaches desktop parity by composing the SAME shared services (D-ii): durable `ensureCheckImproveSessionCode` (retiring the device-local `nextCiMultiSequence` collision counter), `persistCheckImproveSession`, the 5th `ResultsScorecard` variant, `CheckImproveHistoryPanel`, per-Q topics. No forked grading path; the #437 stub (`pages/mobile/MobileCheckImprovePage.tsx`) deleted.
- **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE] — CLOSED.** `/exam-trends` + `/practice-hub` brought under the one-header treatment (`isMobileSelfChromedRoute` + a `!isDesktop` `MobileShell` header with the shared avatar-dropdown); old global brand bar retired on both; BottomNav preserved.

## 2026-07-13 -- #423: FINAL MOBILE-PARITY SWEEP MERGED + owner live-verified (trunk `a8f36ab`) → 1 FU CLOSED, 2 NEW

### CLOSED by #423 (owner merged + live-verified at 360px)
- **[FU-MOBILE-OLD-HEADER-STRAGGLERS] — CLOSED.** The LIVE subset (4 route families) is fixed: `/practice/worksheets` · `/topic-hub*` · `/highly-probable*` · `/practice/:grade/:subject` joined `isMobileSelfChromedRoute` (matchers mirror `isDesktopShellRoute`) with the new route-level `<MobileSelfChrome>` applying the shared MobileShell avatar header at mobile width — AROUND the gates, so premium-upsell/daily-limit states carry the header too. The other 7 of the original 11 routes were VERIFIED dead-or-retiring with no live inbound (exam-simulation, weak-area-practice, mock-paper, teacher, onboarding [auth-own-chrome], legal, admin/*) — deliberately NOT chromed per the retire-lane rule; their chrome retires with them (see [FU-RETIRE-EXAM-SIMULATION-LINKS] / PR-G). **After #423 the one-product-one-website rule holds: no live route shows the old global brand bar at mobile width.**

### NEW (open) — surfaced by #423
- **[FU-LEGAL-FOOTER-LINK]** (pre-launch, compliance-flavoured). The `/legal/:slug` pages (privacy/terms/refund) have **no live inbound link** — the only referrer is the retired old `Home.tsx` footer, so they are URL-only. A live footer/menu entry (Welcome/pricing/Me are natural homes) is probably needed before students arrive. Small scoped PR; owner picks placement.
- **[FU-MOBILE-SHELL-PADDING-STACK]** (cosmetic, optional). On the #423-wrapped routes, MobileShell's 20px content padding stacks with HPQ's / the practice runner's own `clamp(16px,4vw,32px)` page padding (~36–52px total inset at 360px). Readable, owner live-verified OK; a page-side padding slim-down at mobile width is available if it ever grates.

### NEW (open) — surfaced by #416
- **(superseded — see the #423 CLOSED entry above)** (pre-launch mobile-chrome cleanup pass, owner-directed). The item-E straggler sweep found **11 routed mobile surfaces still rendering the OLD global brand bar** (App.tsx `.navbar`) at mobile width — NOT covered by `isMobileSelfChromedRoute` and not using `MobileShell`: `/practice/worksheets` (WorksheetGenerator) · `/practice/:grade/:subject` (PracticePage) · `/topic-hub` + `/topic-hub/*` (DesktopTopicHubPage) · `/highly-probable` + `/highly-probable/*` (HighlyProbableQuestions) · `/exam-simulation` (ExamSimulationPage) · `/weak-area-practice` (WeakAreaPracticePage) · `/mock-paper/:slug` (MockPaper) · `/teacher` (TeacherDashboardPage) · `/onboarding` (Onboarding) · `/legal/:slug` (LegalPage) · `/admin/*` (admin pages). #416 scoped its FIX to the two BottomNav tabs (`/exam-trends` + `/practice-hub`) per the dispatch; these 11 are reported, not fixed. Fix pattern is precedented (add to `isMobileSelfChromedRoute` + `!isDesktop` MobileShell wrapper reusing `accountStatus.ts`); batch them in a pre-launch pass, mind the bare-fullscreen exclusions (CT/FM) and public/auth routes.
## 2026-07-13 -- #411 + #415: bank-expansion Batch 9 (polynomials +62) + Batch 10 (PLE / AP / ABS +440, FIRST 3-topics-per-PR) MERGED (trunk `ae2b447`)

### NEW (open) — content-quality follow-ups surfaced during Batch 10 (add-only batch; neither blocks the merge)
- **[FU-AP-BANKED-GP-ITEM]** (content cleanup, later lane). A PRE-EXISTING banked `arithmetic-progression` case item uses an
  80%-rebound ball-bounce scenario — that is a GEOMETRIC progression (ratio 0.8), not arithmetic, and GP is out of the Class-10
  syllabus. It predates this batch (Batch 10 was add-only, so it was not touched). Fix belongs in a later bank cleanup lane
  (re-scope the scenario to a genuine AP, or withdraw the item); flagged so it is not silently forgotten.
- **[FU-ABS-WASP-STING-ALKALINE]** (owner-awareness only; no forced change). A few `acids-bases-and-salts` items use the
  persistent textbook claim "a wasp sting is alkaline" — not supported by current NCERT (wasp venom is near-neutral). It is an
  exam-conventional statement students may still meet, so this is logged for owner awareness rather than a mandated correction.

### WITHDRAWN / REJECTED
- **[FU-SYLLABUS-GUARD-PLE-REDUCIBLE] — WITHDRAWN/REJECTED (NOT a guard entry).** During Batch 10 a backwards proposal was
  floated to add "equations reducible to a pair of linear equations" (the 1/x=p, 1/y=q substitution family) to
  `scripts/src/syllabusGuard.ts`. This was WRONG: reducible-to-linear is **IN** the official CBSE 2026-27 syllabus and
  board-important — the main sweep had wrongly excluded it, and the cure was to ADD the content (on-branch
  `pairOfLinearEquations.expand.reducible.ts`), NOT to touch the guard. `syllabusGuard.ts` was left UNTOUCHED; the
  Cross-Multiplication Method correctly stays OUT. Standing lesson (mirrors the Batch-8 sum/product-of-roots correction): never
  reject real in-syllabus content, and flag/propose any guard change — never auto-commit it.

### No other new follow-ups from #411/#415
Batch 9 (polynomials) was a clean narrow chapter: two-direction syllabus clean (quadratic zeros-coefficient only; cubic /
higher-degree division algorithm / complex zeros excluded), both scarce bands honest-stopped as expected for a low-weight
chapter, no key regressions. Standing bank-lane FUs ([FU-D-BAND-HONEST-CEILING], [FU-BANK-EXACTNORM-DUPS], [FU-EXTRACT-CONTENT-F13],
[FU-FIGURE-PENDING-SAFEGUARD], [FU-BANK-UNRESOLVABLE-MCQ-KEYS], [FU-SYLLABUS-ANCHOR-OFFICIAL-2026-27]) are unchanged.

## 2026-07-13 -- #412: PR-B-v2 — the progress ENGINE made real MERGED (code `1228c95`) + owner LIVE-VERIFIED → the 3 engine FUs CLOSED

### CLOSED by #412 (owner live-verified on the stable link — Me/Progress Verified ✅, launch-domino #3 closed)
- **[FU-PROG-TOPIC-KEY-MISMATCH] — CLOSED.** Every topic compare/group in `progressStore` now resolves BOTH sides through `resolveCanonicalSlug` (memoized). Pre-flight sharpened the finding: 5 of 26 topics could NEVER key-match (arithmetic-progression · heredity↔heredity-and-evolution · how-do-organisms-reproduce↔reproduction · light↔merged-key · pair-of-linear-equations↔…-in-two-variables); the other 21 (incl. Real Numbers) failed via the window model, not the key — the key-fix alone wouldn't have fixed Real Numbers. Legacy label-keyed attempts (pre-#363) re-bucket. Registry-driven all-slugs regression test guards it.
- **[FU-PROG-DATA-COMPLETENESS] — CLOSED (finding CORRECTED in pre-flight).** All four surfaces DO fan `recordAttempt`; the real gaps were CT/FM objective Section-A marks (only subjective results are fanned) + pre-#403 record-only history. Subject/topic rungs now read the UNIFIED stream (cloud attempts ∪ sessionRecords perQuestion payload marks) deduped deterministically by the synthetic `ws:/ct:/fm:{worksheetId}:q{n}` ids; C&I records skipped by construction → the dual write counts exactly once. Pre-#403 worksheet/CT/FM history healed read-side.
- **[FU-PROG-WINDOW-MODEL] — CLOSED (owner-ratified Option B).** Activity-median split everywhere (sync + async + the mistake-type rung): a wider window never shows less than a narrower one; `spanDays`/`activitySpanDays` + the shared `isShortSpan` drive the honest amber short-term label (Me arc additive note + Topic Hub card) — real data with an honest span, never silence-that-looks-broken, never a claimed full-window trend.
- Also shipped (Finding D): the Topic Hub running-accuracy sparkline over the cross-device `getTopicTrendFromCloud` (real per-answer scores from 2 points, cap 12; the old device-local sync read on that surface retired). [FU-TOPICHUB-PROGRESS-ARC]'s wiring now RENDERS (live-verified: Polynomials 33.9%→46.9%).

### NEW (open) — recorded by / deferred from #412
- **[FU-PROGRESS-PRESENTATION-REDESIGN]** (owner-recorded on live-verify — presentation-only, LATER PR, **NOT a defect**; the engine did its job). The per-topic trajectory shouldn't be a separate card — fold it into the topic HERO card (the one carrying the subject/topic name); and the Me/Progress page should present the arc more graphically with a proper SUBJECT TOGGLE + TOPIC DROPDOWN (progressive disclosure, no clutter). This is the graphical Me redesign always slated as a later pass. Its own scoped PR when the owner calls it — do not fold silently into other lanes.
- **[FU-PROG-PRE403-QP-BACKFILL]** (deferred by owner decision at the #412 pre-flight). Quick-Practice/HPQ attempts recorded BEFORE the #403 durable attempts subcollection exist only in localStorage + the per-device last-writer-wins blob doc (`practiceInsights/{uid}`), so they stay invisible to the cross-device reads (worksheet/CT/FM history was healed read-side via records in #412). Recovery = a read-side blob union with content-signature dedup — fuzzier than #412's deterministic-id dedup, hence its own follow-up. Forward data is complete; this is historical-only.

## 2026-07-13 -- #410: mobile chrome — app-wide account avatar-dropdown parity MERGED (trunk `f662fbe`)

### DELIVERED by #410 (owner byte-reviewed + live-verified CLEAN)
- App-wide mobile account avatar-dropdown in the shared `MobileShell` (mirrors the desktop dropdown; read-only subscription; same manage-subscription URL + logout) + one-header treatment on `/check-improve`, `/intent`, `/practice/worksheets/ready` (the old global mobile brand bar no longer double-stacks). `DesktopShell.tsx` byte-unchanged; new pure `utils/accountStatus.ts` shared helper. See CURRENT_STATE / SESSION_LOG for detail.

### NEW (open) — surfaced by / spun off from #410
- **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]** (owner live-verify — coverage gap, NOT a #410 defect). `/exam-trends` (TrendsPage) and `/practice` (PracticePage) still render the OLD global mobile brand bar (the "C" circle + LazyTopper/Search bar): they are NOT in `isMobileSelfChromedRoute` and their pages don't use `MobileShell`, so they were outside #410's scoped 3 routes. **FOLDED INTO C&I PR-2 as item E** — bring both routes under the same one-header treatment, REUSING `utils/accountStatus.ts` (no fork), PLUS a sweep for any other straggler mobile routes still on the old header. (#410 correctly covered exactly the 3 routes it scoped.)
- **[FU-DESKTOP-ACCOUNT-MENU-SHARE]** (hygiene / DRY). Migrate `components/desktop/DesktopShell.tsx`'s inline account-status derivation onto the new pure `deriveAccountStatus` (`utils/accountStatus.ts`) so both shells share ONE source of truth. Deferred out of #410 because `DesktopShell.tsx` is a locked sacred file that the #410 dispatch did not scope; needs it explicitly scoped + owner byte-review (it is a live surface). Low risk (pure display helper, identical values).
- **[FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]** (data-doctrine, pre-existing, app-wide). `hooks/useSubscription.ts` calls `activateTrial(uid)` inside its mount `useEffect` (when the cloud has no premium tier and no `trialStartDate`), so merely MOUNTING any component that calls the hook client-activates a 7-day trial — violating the standing "trial state must come from server/admin, never client UI" doctrine. This is NOT introduced by #410 (the App.tsx global navbar + DesktopShell already trigger it on nearly every route); #410's mobile avatar reads status only and adds no new activation vector. Fix belongs in its OWN data-doctrine PR: make trial activation server/admin-driven (or gate the mount activation), without regressing the surfaces that currently rely on the read.

## 2026-07-13 -- #408: arc PR-4 — Me/Progress consumes the memory layer MERGED (code trunk `25c3cd7`) — engine bugs surfaced (PR-B-v2 scope)

### DELIVERED by #408 (the arc-PR-4 CONSUMPTION layer — owner byte-reviewed CLEAN; consumption is CORRECT)
- **[FU-MOBILE-ME-PROGRESS-PARITY] (finding 3) — DONE.** Mobile `/me` now renders the new `pages/mobile/MobileMePage` (the cross-device arc + honest cards), NOT the legacy Streak/XP hero (`pages/app/Me` un-routed for PR-G). ONE responsive engine across both widths.
- **[FU-TOPICHUB-PROGRESS-ARC] (finding 2) — WIRED (renders once the engine is fixed).** `TopicProgressTrend` consumes `getTopicProgress()`, slotted into `ConceptSpine`. The WIRING is correct + owner-confirmed; it currently renders null on every topic because of the engine key-mismatch below (**[FU-PROG-TOPIC-KEY-MISMATCH]**), not because of the UI.
- **[FU-PROGRESS-WINDOW-SPLIT-UX] (finding 1) — STOPGAP landed.** The arc empty-state now distinguishes "lopsided" (in-window practice, one-sided split) from "no data" via the pure `progressArcStateKind` reading `activity.practiceAttempts`. This is the honest CONSUMING-UI clarification asked for; the underlying window MODEL fix is **[FU-PROG-WINDOW-MODEL]** (PR-B-v2).

### ~~NEW (open)~~ → **ALL THREE CLOSED by #412 (PR-B-v2, `1228c95`, owner live-verified — see the #412 section above)** — PR-B ENGINE bugs surfaced by owner live-verify — **PR-B-v2 SCOPE, NOT arc-PR-4 regressions.** The arc-PR-4 consumption layer is correct; the data layer it reads is incomplete, so the correctly-wired UI renders empty. Do NOT chase these as arc-PR-4 defects.
- **[FU-PROG-TOPIC-KEY-MISMATCH]** (PR-B-v2 — data-layer). `getTopicProgress` does an EXACT-STRING match between `recordAttempt`'s stored topicKey (`canonicalTopicKey`) and the Topic Hub's `normalizeTopicKey(topic.slug)` — **two different canonicalizers that don't agree** — so the filter returns ZERO rows on EVERY topic. Effect: `TopicProgressTrend` correctly renders null (honest-silent) on every topic, including topics with real data (e.g. Real Numbers shows a subject trend on Me but nothing on its Topic Hub). The component is right; the data filter it calls is broken. Fix in progressStore (single canonicalizer both sides).
- **[FU-PROG-DATA-COMPLETENESS]** (PR-B-v2 — data-layer). `computeTrend` / `getSubjectProgress` / `getTopicProgress` read the `practiceInsights` attempts stream ONLY, not `sessionRecords`. So Chapter-Test / Full-Test / Check-&-Improve work is INVISIBLE to the trend — the arc is blind to 3 of 4 graded surfaces. Fix: fold the durable sessionRecords marks into the trend WITHOUT double-counting the attempts a surface also records.
- **[FU-PROG-WINDOW-MODEL]** (PR-B-v2 — data-layer). The calendar-midpoint before/now split makes a WIDER window show LESS than a narrower one when practice is recent-heavy (month goes silent while 2-weeks shows a trend). The arc-PR-4 empty-state ([FU-PROGRESS-WINDOW-SPLIT-UX] stopgap) is a good honest cover; the MODEL itself is fixed here (activity-median split, not calendar-midpoint).

### Still open (unchanged)
- **[FU-MOBILE-CI-PARITY]** (finding 4 — C&I mobile-parity lane, NOT arc PR-4). Mobile Check & Improve is a different, older page, not at desktop parity. Tracked for the C&I mobile-parity work.

## 2026-07-13 -- #405: bank-expansion Batch 8 (quadratic-equations +110) MERGED (trunk `1b7c7aa`)

### NEW (standing process-fix + a corrected syllabus boundary)
- **[FU-SYLLABUS-ANCHOR-OFFICIAL-2026-27] (STANDING PROCESS-FIX, owner-directed).** Anchor EVERY syllabus-boundary call to the
  OFFICIAL CBSE 2026-27 syllabus (cbseacademic.nic.in) AND the repo `scripts/src/syllabusGuard.ts` — read/run BOTH live, per
  chapter — **NEVER from memory or a prior year (2025-26).** The 2027 board cohort is governed by 2026-27 ONLY. If `syllabusGuard`
  lacks a boundary entry, PROPOSE it for owner confirmation BEFORE acting. This became a standing rule after Batch 8 mislabelled a
  Class-10 core topic as "Class-11" from memory (see the correction below). Applies to every bank-expansion batch and any
  content-generation task.
- **CORRECTION — sum/product-of-roots is Class-10 2026-27 CORE under POLYNOMIALS, not Class-11.** In Batch 8 the ~22 Vieta
  sum/product-of-roots (zeros–coefficients of quadratic polynomials) items were correctly kept OUT of the *quadratic-equations*
  chapter, but the reason given ("Class-11") was FACTUALLY WRONG. Per official CBSE 2026-27, "Relationship between zeros and
  coefficients of quadratic polynomials" is **Class-10 CORE under POLYNOMIALS.** ACTION: those items are IN-SYLLABUS and MUST be
  EXTRACTED in the upcoming **polynomials** batch (Batch 9), which must include sum/product-of-roots as core content. Also settled
  in the same review: Class-10 2026-27 Quadratics is REAL ROOTS ONLY (D<0 ⇒ "no real roots", never complex/imaginary), and
  magnetic-effects is a RETAINED Class-10 chapter (not deleted).

### Confirmed clean (no action)
- Batch 8 owner byte-review: a suspected complex/imaginary-roots leak was a FALSE POSITIVE — an exhaustive 110-item scan found only
  a file-header doctrine comment; zero actual leaks, no √-of-negative anywhere → #405 shipped as-is, no content change.
- The consolidation CROSS-PACK gate (combined over extract + authored-D + authored-E packs) caught 3 extracted-C vs authored-D
  twins → 3 authored D dropped in favour of the real extracted content. Standing lesson, not a follow-up: run the combined
  cross-pack gate every batch before wiring.

## 2026-07-13 -- #403: PR-B progress memory layer MERGED (trunk `894ef6a`) — engine live; owner live-verify surfaced the arc PR-4 requirement set

### CLOSED / DELIVERED by #403 (the launch-blocker DATA layer — the engine is CORRECT)
- **PR-B (#403, `894ef6a`) — the cross-device, multi-rung windowed progress-memory ENGINE is LIVE.** `getWindowedProgress(uid, window, scope?, nowMs?) => Promise<WindowedProgress>` in `progressStore.ts` is the ONE aggregation arc PR-4 + scorecards consume:
  - `WindowedProgress = { window, subjects[], topics[], concepts[], sections[], mistakeTypes[], activity, mistakeLog }`; `RungTrend = { key, label, before, now, delta, sampleBefore, sampleNow }`.
  - Rungs: subject / topic / **concept (bank-matched only** via new pure `progressBankIndex.ts`; C&I `questionIds:[]` + chapter-echo silent) / section / **mistake-type = COMPOSITION SHARE over fully-graded records only** (adversarial review caught + fixed a per-question-rate fabrication from pending/partial records).
  - Reads the durable CROSS-DEVICE streams honoring uid (`getAttemptsFromCloud` + `getSessionRecordsFromCloud` + additive read-only `getAllSessionPerQuestionFromCloud` + `getMistakeLogs`); **honest-or-silent per rung**; timestamp-normalized (mistakeLog ISO → epoch ms). No rollup (query-raw); **firestore.rules untouched** (window pref → existing `dashboardPrefs.progressWindow`); sessionRecords WRITE shape byte-unchanged. Owner byte-reviewed + merged; cross-device + mistake-rate fix verified clean.
  - Minimal additive Me surface `ProgressWindowArc.tsx` (class-driven, honest early state). Full Me/Progress redesign = arc PR-4 (below).

### NEW (open) — owner live-verify findings 1–4 (all CONSUMPTION-surface gaps, NOT PR-B data-layer bugs; the engine is correct). Findings 1–3 = the **arc PR-4 requirement set**; finding 4 = the C&I mobile-parity lane.
- **[FU-PROGRESS-WINDOW-SPLIT-UX]** (finding 1 — arc PR-4 UX, honest-but-confusing). The midpoint before/now split means a WIDER window can go SILENT while a narrower one shows a trend: when recent practice is lopsided into the "now" half, the "before" half of the wider window falls below `MIN_HALF_SAMPLE(3)`. Technically correct + honest, but a student reads "2 weeks: improving" then "month: not enough data" as broken. Fix in the CONSUMING UI: a clearer empty-state (e.g. "your recent practice is concentrated in the last 2 weeks — a longer trend appears as it spreads out") or a revised partition. Do NOT weaken the honest-or-silent gate.
- **[FU-TOPICHUB-PROGRESS-ARC]** (finding 2 — arc PR-4). `getTopicProgress()` and the topic-scoped concept rung of `getWindowedProgress({topicKey})` exist in `progressStore` but NO surface consumes them — a student opening Trigonometry sees no "how I'm improving on this topic over time." Wire the per-topic before→now arc into the Topic Hub. Engine ready (topic-scoped read is leak-safe via the PR-B per-question `topicKey` filter).
- **[FU-MOBILE-ME-PROGRESS-PARITY]** (finding 3 — arc PR-4, **MOBILE NON-NEGOTIABLE**). `getWindowedProgress` is consumed ONLY by `ProgressWindowArc`, rendered ONLY in `DesktopMePage` (≥1024px). Below 1024px `App.tsx` renders the legacy `pages/app/Me` (old Streak/XP/`badgeEngine`/`streakService` hero), so the ENTIRE progress arc is INVISIBLE to mobile users — and many Class-10 students are mobile-only. Arc PR-4 must converge mobile Me onto the same engine (ONE responsive surface, not a desktop-only card). The engine is already cross-device; the gap is purely the consuming render site. Relates to [FU-MOBILE-VERIFY-GAP].
- **[FU-MOBILE-CI-PARITY]** (finding 4 — C&I mobile-parity lane, NOT arc PR-4). Mobile Check & Improve is a different, older page, not at desktop parity. Tracked for the C&I mobile-parity work.

## 2026-07-13 -- #402: bank-expansion Batch 7 (chemical-reactions-and-equations +136) MERGED (trunk `85b292f`)

### Updated
- **[FU-BANK-UNRESOLVABLE-MCQ-KEYS] — corrective UPDATED (still OPEN, still its OWN small PR before launch, NOT folded into a topic batch).** Two adjudications now resolved: (1) **magnetic-effects-of-electric-current is a RETAINED Class-10 chapter under the official CBSE 2026-27 syllabus** (the syllabus guard passes with it present; CLAUDE.md §5's "deleted/banned" wording is stale on this chapter). So the 2 items sitting under it (CBE-S-MAGN-A-001, PYQ-S-2024-MAG-002) are **KEY-FIXED like the other 32 — NOT dropped/withheld.** The earlier "HOLD for owner adjudication" on these two is closed: treat them as normal key-normalisation. (2) **[FU-FM-BLUEPRINT-TEST-SEED-LUCK] folds INTO this same corrective PR** — relaxing `fullMockBlueprint.test.ts` to the real options+key-present contract is part of the before-launch key fix (do it alongside repairing the 34 keys, so the strict seed-luck assertion can't redden CI on a later bank PR). The full 34-id list + failure-class breakdown remain in the #397 entry below and in `report-ct-balanced-mix-2026-07-13.md`.
- **Batch 7 held the exact-option-text authoring rule with ZERO new unresolvable keys** — every MCQ/AR key in chemical-reactions +136 resolves to exactly one option. The corrective is a fix to LEGACY bank data only; the expansion authoring template is proven clean on its first batch since the FU surfaced.

### No new open follow-ups from #402
Batch 7 was a clean large-reservoir topic: two-direction syllabus clean, both scarce bands reached ≥75 with no honest-stop, zero figure-pending, no key regressions. Standing bank-lane FUs ([FU-D-BAND-HONEST-CEILING], [FU-BANK-EXACTNORM-DUPS], [FU-EXTRACT-CONTENT-F13], [FU-FIGURE-PENDING-SAFEGUARD]) are unchanged.

## 2026-07-13 -- #397: CT balanced PYQ+fresh mix MERGED (trunk `6db7f1d`)

### CLOSED by #397
- **[FU-CT-BALANCED-MIX] — CLOSED.** The Chapter Test now sources each section (A–D) through the SHARED `drawBalancedSet` (`utils/balancedMockDraw.ts`, reused verbatim — helper byte-unchanged, not forked), mirroring the Full Test's pass-1 per-cell pattern, so a CT paper deliberately mixes real PYQs with fresh authored/extracted questions (~50% PYQ target, honest fallback for thin/zero-PYQ topics). SOURCING-ONLY: paper shape/marks/grading/scorecard/numbering byte-identical; the `MIN_TEST_QUESTIONS` honest gate confirmed intact after the draw; seed minted in-blueprint (FT's recipe) so `ChapterTestPage.tsx` stays byte-unchanged (owner-ratified — keeps the diff to one logic file). New `chapterTestBlueprint.test.ts` proves the seeded wire (same-seed/different-seed) + the zero/thin-PYQ honest fallback. Owner byte-reviewed CLEAN. Owner live-verify pending (visible PYQ+fresh mix; thin-PYQ still a full valid paper).

### NEW (open)
- **[FU-BANK-UNRESOLVABLE-MCQ-KEYS]** (surfaced by #397 — bank lane, **before-launch scoring-correctness fix**). A full-bank scan (run in the Codespace while building #397's test) found **34 MCQs bank-wide whose `answer` string-resolves to NO option** under the grader's exact `norm` (trim+lowercase equality, `chapterTestGradeService.ts` / the shared objective scorer). Any of them drawn into CT **or FT** Section A can NEVER be scored correct — the student's selected option text never norm-equals the key. Distinct from the repaired [FU-BANK-CORRUPT-KEYS] population (none are in `docs/objective-answer-key-review-queue.md`). Failure classes: (a) trailing marks-digit / MS-reference swept into the key (PYQ extraction — `"30-40 1"`, `"96° 1"`, `"8.4 cm 1 MS_X_Mathematics_041_30/4/2_2023_24"`); (b) spacing/format mismatch (`"1 : 2"` vs option `"1:2"`, PYQ-M-RN-001); (c) AR letter-code answers vs full-text options (`"A"` / `"D. A is false, R is true."` — **6 are Batch-5 REP2-***, so the [[bank-expansion-lane]] authoring template must enforce `q.answer` = exact option text, per the [FU-BANK-CORRUPT-KEYS] rule); (d) marking-scheme boilerplate as the answer (whole Q malformed — PYQ-S-2024-ELEC-001/MAG-002/LIGHT-001/METAL-002); (e) mangled math glyphs / duplicate junk options (PYQ-M-PROB-002/003/005/006/008/010, PYQ-M-ARC-003, PYQ-M-QE-001, PYQ-M-TRI-001/003). **Full 34-id list:** REP2-014, REP2-018, REP2-019, REP2-040, REP2-042, REP2-043, CTRL-EXMPLR-6-MCQ-025, CBE-M-PROB-A-009, CBE-S-MAGN-A-001, PYQ-M-RN-001, PYQ-M-PLE-003, PYQ-M-QE-001, PYQ-M-TRI-001, PYQ-M-TRI-003, PYQ-M-CG-001, PYQ-M-CIRC-004, PYQ-M-ARC-002, PYQ-M-ARC-003, PYQ-M-STAT-002, PYQ-M-STAT-004, PYQ-M-PROB-002, PYQ-M-PROB-003, PYQ-M-PROB-005, PYQ-M-PROB-006, PYQ-M-PROB-008, PYQ-M-PROB-010, PYQ-M-2024-QE-001, PYQ-M-2024-QE-002, PYQ-M-2024-CIRC-004, PYQ-M-2024-CIRC-005, PYQ-S-2024-METAL-002, PYQ-S-2024-LIGHT-001, PYQ-S-2024-ELEC-001, PYQ-S-2024-MAG-002 (also in `report-ct-balanced-mix-2026-07-13.md`). Note: two sit under `magnetic-effects-of-electric-current` (CBE-S-MAGN-A-001, PYQ-S-2024-MAG-002) — §5 lists that chapter as deleted/banned from banks, yet the syllabus guard passes with them present; flagged for the owner to adjudicate, not acted on here.
- **[FU-FM-BLUEPRINT-TEST-SEED-LUCK]** (surfaced by #397). `fullMockBlueprint.test.ts` still carries the strict "every Section-A key resolves to an option" assertion; it currently passes ONLY because seed 11's draw happens to miss the 34 unresolvable keys above — a latent CI landmine any bank batch (which shifts what a fixed seed draws) can trip. Relax it to the real sourcing contract (options present + non-empty key), the same way #397's CT test does, OR fix the 34 keys ([FU-BANK-UNRESOLVABLE-MCQ-KEYS]) first. Low-effort test-only hygiene; do before it reddens CI on an unrelated bank PR.

## 2026-07-13 -- #396: bank-expansion Batch 6 (heredity +44) MERGED (trunk `ae5e671`)

### Updated
- **[FU-D-BAND-HONEST-CEILING]** — extended: heredity honest-stopped at D→32 AND E→22 (a very narrow, saturated chapter). Evidence now spans life-processes D→53 / our-environment D→16 / reproduce D→67 / heredity D→32 & E→22. The band-scarcity policy is working: extract-max where the reservoir is deep, honest-stop with a distinct-principle/method inventory where it isn't. Not a shortfall; do NOT pad.

### Confirmed clean (no action)
- Batch 6 owner byte-review: read every syllabus-boundary grep hit — "homologous" = homologous CHROMOSOMES (in-syllabus Mendelian cell basis, NOT the banned homologous ORGANS); ABO/linkage/codominance = substring false positives (aBOut, standard complete-dominance crosses, autosomal pedigrees). 162 in-syllabus Mendel refs, correctOption 0, topicKey heredity. The skeptic's codominance-mislabel catch (roan cattle) validated the concept-scoped (not phrase-only) skeptic as load-bearing.
- **Note on a pre-existing bank evolution leak:** a banked heredity item (`SCQ-S-HERED-041`, speciation/geographical isolation) is Class-12/board-deleted evolution content that predates this lane. Batch 6 did NOT use it as license (authored/extracted heredity-only). Candidate for a future data-quality cleanup pass (same spirit as [FU-BANK-EXACTNORM-DUPS]); not blocking.
## 2026-07-13 -- #395: C&I PR-1 — Check & Improve is a first-class SessionSurface — MERGED (trunk `e33b9d3`)

### CLOSED by #395
- **[FU-CI-SCORECARD-VARIANT] — CLOSED.** C&I now writes a `surface:"check-improve"` sessionRecord on every graded
  session (idempotent by id = the durable code; `couldNotRead`-only sessions write NOTHING — no grade, no fabricated
  entry) and renders the 5th `<ResultsScorecard>` variant pair (live + stored read-only reopen; **the shell is a
  zero-line diff**). Four-type lens only for now (the by-topic lens is per-question-topic-gated); quiet provenance
  line; NO board-readiness projection; NO solution key. The bespoke graded views (#333) stay byte-intact as "the
  graded sheet" behind the primary action. History = the "Your checked papers" overlay panel (locked CT card shape).
- **[FU-CI-DEVICE-LOCAL-SEQUENCE] — CLOSED.** The durable cross-device `#NN` counts the student's existing
  check-improve records under the same `CI-{S}-{TOK}-` prefix (subject+topic-token, the CT pattern — matches the
  printed code). **`lt:ci-multi-seq` retired ENTIRELY, no offline shadow counter** (owner decision — the localStorage
  sequence WAS the cross-device collision bug). Code format byte-identical; only the sequence source changed.

### NEW (open)
- **[FU-CI-TOPICSOURCE-BANK-MATCHED-RESERVED]** (owner-directed 2026-07-13) — `SessionTopicSource`'s
  `"bank-matched"` value is **RESERVED, NOT emitted**: it is type-level only until a REAL bank-match path exists on
  the C&I page (external uploads carry no `questionId`; today's page has no bank lookup at all). A reserved-not-broken
  comment sits on the union in `sessionRecords.ts`. **A later PR must NOT read this as a bug and wire a fake matcher
  to populate it** — emitting it honestly requires the question actually resolving to a `canonicalQuestionBank` row
  (the solution-cache arc, or a deliberate matcher PR).
- **[FU-CI-PERQUESTION-TOPIC]** — the C&I arc's **PR-2** (owner renumbering): extend detect to emit `detectedTopic`
  per question (prompt + response schema surgery on a live grading path — its own PR). Unlocks the by-topic scorecard
  lens for mixed papers, per-question topic progress (the session code stays `MIX` honestly), and the COUNTED
  "N topics" history chip (until then the chip stays a plain "Mixed topics" — a count would be fabricated).
- *(Pointer)* **[FU-CI-SOLUTION-CACHE]** — ✅ **CLOSED by #420 (`cc84ae5`)** — the 3 gates were owner-signed-off and
  delivered (server-only Postgres writes · Gate-2a quality gate + Gate-2b ADMIN_FIREBASE_UIDS eviction · text-only,
  student-agnostic by construction). See the #420 section at the top of this file.

### Confirmed clean (no action)
- #395 owner byte-review: all six plumbing items landed exactly; forbidden files byte-clean (grader,
  worksheetGradeService, App.tsx, DesktopShell, firestore.rules, src/data/**); detection/correction/MI/graded views
  byte-intact (only the 2 `setTopicTouched` provenance lines); MIX writes `topicKeys: []` and says so — never a
  majority guess; `topicSource` never backfilled (absent ≠ inferred); the `SurfaceHistory.tsx` +4 copy-seam ripple
  ratified (exhaustive `Record<SessionSurface,…>` expansion; component never mounted with check-improve).

## 2026-07-13 -- #393: bank-expansion Batch 5 (how-do-organisms-reproduce +148) MERGED (trunk `820d013`)

### NEW (open)
- **[FU-D-BAND-HONEST-CEILING]** — reproduce Section-D honest-stopped at 67 (below the ≥75 floor) because the chapter's 37 banked D-items already span plant + human reproduction; ~8 more would have been number-swaps. This is the third mature-chapter D honest-ceiling (life-processes D→53, our-environment D→16, reproduce D→67) — confirms the band-scarcity policy: a uniform 75 D-floor is pedagogically unnatural for chapters CBSE rarely sets many distinct 5-mark items on. Not a shortfall; do NOT pad. Flagged for ratification alongside the pre-existing [FU-DBAND-PEDAGOGICAL-FLOOR]; not blocking.

### Confirmed clean (no action)
- Batch 5 owner byte-review: both syllabus directions clean (zero evolution/Darwin AND zero reproduce-specific Class-12 leak — no gametogenesis / hormonal-cascade / embryology detail), all 148 solutions present, correctOption 0, topicKey canonical. E honest-stopped at 72 DISTINCT (3 structural twins dropped, not padded to 75).

## 2026-07-13 -- #391: FT finalize MERGED (trunk `25257c0`)

### CLOSED by #391
- **[FU-FM-HUB-ENTRY] — CLOSED.** Practice-hub "Full Test" card (locked copy) + DesktopHome per-subject tiles + the MI-panel link all navigate PLAINLY to `/full-mock/:grade/:subject` — MockViewGate on the route is the ONLY gate. Old-engine entries retired: "Open existing full-mock engine" (→ /exam-simulation), the circular "Practice Paper" card (→ un-routed /mock-builder), and a third DISCOVERED dead link (DesktopHome mistake-strip). Executable RTL nav proof in-repo: `DesktopPracticePage.fullTestNav.test.tsx` (both subjects, both widths, no second gate).
- **[FU-FM-CROSS-DEVICE-UPLOAD] — CLOSED.** `services/fullMockPaperStore.ts` persists the drawn paper (TEXT only — never the uploaded answer image, not even typed answers) at `sessionRecords/{uid}/fullMockPapers/{code}` under the EXISTING recursive owner-only rule (**firestore.rules byte-untouched**); `openPendingUpload` fetches + re-seeds when the local session is gone (cross-device AND the 3-session eviction); best-effort delete after full grade. The verbatim "sat on another device" line remains for true misses — no fabricated paper, ever.
- **[FU-TOPIC-DISPLAY-TITLECASE] — CLOSED.** The fallback keeps connectives lowercase ("Pair of Linear Equations", "Control and Coordination"); registry titles win; keys untouched; `topicResolver.test.ts` proves it.
- **[FU-SCORECARD-STALE-HEADER-COMMENTS] — CLOSED.** Comment-only truth-updates in `scorecardVariants.ts` + `ResultsScorecard.tsx` (all four variants LIVE; the `deferred` stubs are legacy PR-2 seams + the render-guard's fixtures).

### NEW (open)
- **[FU-RETIRE-EXAM-SIMULATION-LINKS]** (owner-directed 2026-07-13) — 6 legacy pages still link the old `/exam-simulation` engine: `pages/app/PracticeHome.tsx`, mobile `pages/Home.tsx`, `ProfilePage.tsx`, `PredictivePapers.tsx`, `DailyMixPage.tsx`, `components/dashboard/ExploreMorePanel.tsx` (+ the App.tsx command palette `navigateToMockTest` — App.tsx is forbidden, owner-authorized-lines-only). #391 removed every hub/Home entry; this is the broader old-surface retirement lane (the route + `ExamSimulationPage` stay live behind `RequirePremium` until then).
- **[FU-VITEST-PREEXISTING-FAILURES]** — 6 vitest failures in 3 files reproduce IDENTICALLY on trunk `17b4c34` (pre-#391): `worksheetPdfExport.test.ts` ×5 ("pdf.addImage is not a function" — jspdf mock/environment rot), `ConceptSpine.test.tsx` ×1, `objectiveScoring.parity.test.ts` (module-level error). **Invisible to CI** — quality-gate runs the matrices, NOT vitest — so they linger silently. Fix in a scoped hygiene PR; consider wiring vitest into CI once green.

## 2026-07-12 -- #387: Full Test (Full Mock) MERGED (trunk `f6522d0`)

### NEW (open) — all intended scope boundaries, NOT defects; close each as its own scoped follow-up PR
- **[FU-FM-HUB-ENTRY]** — the `/full-mock/:grade/:subject` route is LIVE (MockViewGate, bare full-screen) but
  UNLINKED: no Practice-hub / Home entry card yet. Owner verifies via `/full-mock/10/Maths` · `/full-mock/10/Science`.
  A nav/hub entry card is a small follow-up PR (touches the hub, deliberately out of #387's scope).
- **[FU-FM-CROSS-DEVICE-UPLOAD]** — cross-device "upload later": the drawn paper exists only on the device that
  sat the mock (device-local session cache), so a cross-device re-open shows the REAL objective score + an honest
  "sat on another device" line — never a fabricated paper (owner-ratified anti-fabrication call). Closing it
  properly needs a durable paper snapshot; decide alongside the [FU-CI-SOLUTION-CACHE]-family storage questions.
- **[FU-CT-BALANCED-MIX]** — the Chapter Test can now reuse `drawBalancedSet` (`src/utils/balancedMockDraw.ts`,
  shipped standalone by design; signature in SESSION_LOG). Small follow-up PR wires the CT draw to the same
  PYQ/fresh balance + shows the honest mix line on CT setup.

### Deferred/observed during the build (small, cosmetic or pre-existing)
- **[FU-SCORECARD-STALE-HEADER-COMMENTS]** — `scorecardVariants.ts` + `ResultsScorecard.tsx` header comments still
  describe CT/FM as "deferred config seams / never rendered" — stale since #374, doubly so after #387. Cosmetic
  comment-only cleanup; left untouched to keep both diffs scoped.
- **[FU-TOPIC-DISPLAY-TITLECASE]** — `resolveTopicDisplayName`'s fallback title-cases every word ("Pair Of Linear
  Equations", "Control And Coordination") where the canonical chapter title has no entry; visible in the FM
  weightage legend for a few chapters. Cosmetic: either add the missing canonical titles or lowercase the
  connective words in the fallback.
- **[FU-FM-DELTA-SAME-TOTAL-ONLY]** — the honest-or-silent mock-to-mock delta compares only when both mocks share
  the same graded total (a fair /80 comparison); a mock with unreadable pages (partial total) stays silent.
  Intended honesty rule; noted so nobody "fixes" the silence into a misleading cross-total delta.

## 2026-07-12 -- #384 + #385: bank-expansion Batch 2 + 3 MERGED (trunk `ce34b3e`)

### NEW (open)
- **[FU-FIGURE-PENDING-SAFEGUARD] (standing doctrine).** A question un-answerable without a PROVIDED figure
  ("label the parts", "identify structure X") must NOT ship answer-less — ship the real figure (notes toolkit,
  Bucket A extraction preferred; B/C only if skeptic-verified to match) or add its id to `WITHHELD_QUESTION_IDS`
  until the figure lands. A TEXT-answerable question merely enriched by a figure may ship. Maintain a running
  figure-pending list in `handoff/BANK_EXPANSION_LANE_STATE.md`. **Batch 3's 2 flagged items classified
  ENRICHMENT** (LPSD-009 respiratory: describe-in-words; LPSD-018 heart: "draw a labelled diagram" is
  student-produced, not provided-figure-dependent) → both ship as-is, reference figure a later enhancement.
- **[FU-BANK-EXPANSION-SOURCE-SWEEP] — WORKING/confirmed.** Per-source exhaustive sweep + table is now standing
  for every batch (Batch 2 corrected real-numbers; Batch 3 life-processes proved reservoir depth 75 vs 23).
- **[FU-BANK-EXPANSION-RESWEEP-REALNUMBERS] — CLOSED by #384.** Corrective sweep done; real-numbers A/B/C reservoir
  proven ≈23 net-new by exhaustion (chapter saturated). Scarce ceiling ≈24 distinct methods (audit in #384).

### Carried from Batch 1
- **[FU-EXTRACT-CONTENT-F13]** — folded into the standing source-sweep discipline (Content folder 13 now swept per topic).
- **[FU-BANK-EXACTNORM-DUPS]** — ~114 PRE-EXISTING exact-norm dup groups in the bank (batches contribute 0); data-quality cleanup, separate lane.

## 2026-07-12 -- #381: bank-expansion Batch 1 MERGED (trunk `3866a94`)

### NEW (open)
- **[FU-BANK-EXPANSION-SOURCE-SWEEP] (standing discipline for every future batch).** Batch 1 A/B/C was
  UNDER-EXTRACTED -- it pulled net-new from only TWO files (cbjemacq01 + jeep201 -> 10 net-new), which is NOT
  extract-max. For EVERY topic from now on, before concluding a net-new count, EXHAUSTIVELY sweep ALL sources:
  the whole `Content\` folder (all 14 study-package folders -- docx incl. TABLES, pdf, pptx) AND all of
  `diff\cbse-papers\` (CBSE Practise Papers [Maths Std 234pp / Science 321pp], PYQ+MS pairs, NCERT Exemplar,
  chapter-wise online MCQ + Previous-year, "together with"). Fingerprint every candidate vs the current 7,114+
  bank; extract every genuine net-new (differs in more than numbers). MANDATORY per-topic report: the sources
  SWEPT + per-source counts (candidates / DUP / borderline / NET-NEW). A saturated topic may still yield few --
  but PROVE it by exhaustion + the per-source table, never by sampling 2 files.
- **[FU-BANK-EXPANSION-RESWEEP-REALNUMBERS]** -- Batch 1 under-swept real-numbers A/B/C; do a corrective pass
  across ALL sources and open the missed net-new as a small follow-up batch, with the per-source table.
- **[FU-DBAND-DISTINCT-CEILING]** -- before honest-stopping a scarce band below 50, EXHAUST the distinct-scenario
  space and report the distinct-method inventory + WHY it caps (Batch 1 stopped at case ~25 / long ~21; verify
  that IS the ceiling by inventorying every distinct method tried, not a soft stop).
- **[FU-EXTRACT-CONTENT-F13]** -- Content "Question Bank" (folder 13) not swept in Batch 1 (folded into the
  source-sweep discipline above).
- **[FU-BANK-EXACTNORM-DUPS]** -- the assembled bank has ~114 PRE-EXISTING exact-normalized-questionText dup
  groups (not from Batch 1; the +30 contribute 0). Data-quality cleanup candidate, separate lane.

## 2026-07-12 -- #380: CT concept-lens + bare full-screen MERGED (trunk `5bd148c`)

### CLOSED by #380
- **[FU-CT-CONCEPT-LENS] -- CLOSED (`5bd148c`).** The CT full scorecard now derives a by-CONCEPT (subtopic) lens: `deriveChapterTestConceptLens(response, questions)` joins each graded question `qNumber -> paper questionId -> canonical subtopic`, aggregates awarded/total per subtopic, sorts by marks lost. Rendered BETWEEN the by-section lens and the four-type (Full-Mock arrangement: section -> concept -> four-type). DERIVED at render, never persisted (`sectionBreakdown` stays null); honest-unknown (an unresolvable subtopic counts in the hero total but forms NO concept row) -> null when none resolve (shell omits). Shows ALL resolved concepts, sorted by loss (owner decision, over loss-only). Wired live-full (`paper.questions`) + guarded stored-reopen (1:1 `questionIds`<->`results` length check, else omit -- no mis-attribution). Signature note: the grade response carries `qNumber` NOT `questionId`, so the fn takes the id-bearing questions as a 2nd arg.
- **[FU-CT-HEADER-UNIFORMITY] -- CLOSED (`5bd148c`), route-scoped.** Owner chose the chrome-less test surface (not a global restyle): new `isBareFullScreenRoute` in `App.tsx` suppresses the legacy dark header AND (owner-authorized) the mobile BottomNav on `/chapter-test` at BOTH widths, via one helper. `DesktopShell.tsx` byte-unchanged -- the header on the test was the NON-shell legacy navbar, not the shell (CT was already excluded from `isDesktopShellRoute`). The App.tsx change = the owner-authorized bare-route exception only. CT already rendered a full-bleed `min-h-screen` surface -> no structural CT change needed.

### NEW (open, deliberate later)
- **[FU-RETIRE-OLD-GLOBAL-HEADER]** -- the product-wide retirement (or restyle to the new grammar) of the legacy dark "premium header" = the NON-shell navbar in `App.tsx`. #380 stopped CT from rendering it (route-scoped via `isBareFullScreenRoute`); it still renders on the OTHER non-shell routes. Retiring it product-wide is a DELIBERATE, later change -- not blocking. `isBareFullScreenRoute` is prefix-list structured so `/full-mock` (and any future bare surface) joins with one entry.

---

## 2026-07-12 -- Chapter Test BUILT to the locked spec (#374, `e54ab8c`), owner live-verified

### NEW FOLLOW-UPS (fast-follow before the `MockViewGate` flips) -- BOTH CLOSED by #380 (see top)
- **[FU-CT-CONCEPT-LENS]** _(CLOSED by #380 `5bd148c` -- see top)_ -- the chapter-test scorecard lands a by-section (A–D) lens + the four-type MI, but NOT a subtopic-level ("concept") weak-area breakdown. `subtopic` IS a field on `CanonicalQuestion`, so a concept lens is DERIVABLE (Full-Mock parity) at render from the graded per-question results joined to the bank -- the same derive-don't-persist discipline as the A–D lens (D3). Owner wants this before the CT gate flips live.
- **[FU-CT-HEADER-UNIFORMITY]** _(CLOSED by #380 `5bd148c` -- see top; resolved route-scoped, not a global restyle)_ -- the full-screen test-taking view is meant to be chrome-less, but the DesktopShell GLOBAL product header still renders on top. Removing/restyling it is a **forbidden-file** change (`DesktopShell.tsx`). OWNER DECISION needed: a global header restyle (applies everywhere) vs a chrome-less test surface (route/shell exception). Fast-follow before the gate flips.

### DEFERRED (non-blocking, agent-surfaced)
- **[FU-CT-REOPEN-DOWNLOAD]** -- reopening a stored test from the history rail is the PR-3 **light** re-open (score + four-type + derived A–D lens + Done). Graded-sheet / solution-key downloads on a reopen would need reconstructing the in-memory `PersistedWorksheet` from the record's `questionIds` (join to `canonicalQuestionBank`) -- deferred; the live post-grade path has both downloads.
- **[FU-CT-CODE-TOKEN]** -- the CT code reuses `topicAbbr` for cross-surface consistency (`WS-M-RN-03` <-> `CT-M-RN-02`), so the token is `RN`, not the mockup's illustrative `REALNO`. By design; logged in case the owner prefers the longer token later.

---

## 2026-07-12 -- Notes fan-out COMPLETE + NCERT click-through LIVE; ledger-cites PR #376 in review (#364 -> #376)

### RESOLVED
- **[FU-NOTES-NCERT-PDF-HOSTING] -> RESOLVED.** The 26 NCERT chapter PDFs are hosted at Firebase Storage `ncert/{subject}/ch{N}.pdf` (bucket `lazzyy-topper.firebasestorage.app`); the `ncert/` public-read Storage rule is published; bucket CORS is set (origin `*`, GET/HEAD). With the #375 per-chapter offset map (`ncertPdfOffsets.ts`) live, the note's `p.N` cite opens the correct printed page -- owner-verified (Trigonometry p.114, Heredity p.129). Copyright: owner confirmed NCERT is publicly available.
- **[FU-CHEMISTRY-EXEMPLAR-WIRE] -> RESOLVED.** Chemistry chapters gate on the merged Chemical Reactions exemplar (#365); the conformance mapping was wired at #368 (floors 5/3/1/1/2 -> 7/4/3/2/3).
- **[FU-SOLO-OWNER-APPROVAL] -> RESOLVED (by design).** The trunk ruleset sets **required approvals = 0** deliberately: GitHub forbids a PR author from approving their own PR, and the owner is the sole code-owner AND the author, so any >0 requirement would hard-block every merge. Mechanical checks (`quality-gate` + `lane-overlap`, required) + the independent auditor carry the review load. **Do NOT re-enable approvals.**
- **[FU-COORD-LEDGER-IN-HANDOFF] -> RESOLVED.** The machine merge ledger was relocated out of `handoff/` to `ledger/MERGE_LEDGER.md` (machine-only, do NOT hand-edit).

### NEW FOLLOW-UPS
- **[FU-LEDGER-CLICKABLE-CITES]** -- Part A of this task, **PR #376 IN REVIEW** (not self-merged). The Source-Ledger table's `p.N` is now clickable, reusing the body cites' `CiteLine`/`NcertPageModal` path (new `LedgerSource` in `Note.tsx`). Anti-fabrication: links ONLY a real in-this-chapter NCERT page; 470/474 rows clickable, 4 correctly stay plain (3 figure-only refs + 1 non-NCERT PYQ); page ranges (`pp.8-9`) link to the first page; display byte-unchanged. No spec/schema/grader change; `validate_spec.py --all` VALID.
- **[FU-STATE-BOARD-SUMMARY-ONLY]** -- `github-actions[bot]` cannot be added to the ruleset bypass list, so the state-board workflow cannot push to trunk; `ledger/MERGE_LEDGER.md` auto-append is therefore **summary-only**. Harmless -- the human narrative (`CURRENT_STATE.md` / `SESSION_LOG.md`) carries the merge record (SHAs #364 -> #375 logged there). Revisit only if GitHub exposes the Actions actor for the bypass list.

### STILL OPEN (carried)
- **[FU-HANDOFF-DOC-DRIFT]** (from #363) -- still owed. This catch-up PR prepends accurate #364 -> #376 records to `CURRENT_STATE` / `SESSION_LOG` / `OPEN_QUESTIONS` / `SURFACE_TRACKER` and refreshes `NEXT_ACTION`'s pointer, but does NOT rewrite the drifted bodies below (or the pre-existing mojibake in `CURRENT_STATE` line 1). A dedicated docs-hygiene pass is still owed.
- **Content lane depth-floor** -- PENDING Pass-2 of the bank-extraction audit (Content-folder survey + all mark-bands). Case-based is an AUTHORING lane (Z3), not extraction.

---

## 2026-07-11 -- P0 Topic-Key Root Cure REBUILD merged (#363, `6ecf15f`)

### RESOLVED (closed by #363)
- **[FU-TOPICKEY-UNIVERSAL] (P0) -> CLOSED.** One product, one topic key. C2 migrated every non-canonical topicKey to its `topics.ts` slug (2,514 literals / 52 files, both object styles + factory + the 26 inline aggregator questions), proven lossless. C3 made it non-regenerable: a **dual-style Guard A** + an **authoritative import-based runtime proof** are wired into the CI matrix, so a non-canonical key can no longer enter the served bank. The 4 previously-zeroed Science chapters (Chemical Reactions, Acids-Bases-Salts, Metals-Non-Metals, Reproduction) now return questions; circles != areas-related-to-circles and light != human-eye stay disjoint. Owner independently confirmed 7084 / 0 dup / 0 orphan / 26 keys and live-verified. The prior attempt's blind spot -- a `\btopicKey:` regex skipping 124 JSON-style files, plus a hardcoded `length === 5146` -- is fixed and negative-tested.

### NEW FOLLOW-UPS (surfaced by #363; none lost)
- **[FU-AGGREGATOR-INLINE-QUESTIONS]** -- `canonicalQuestionBank.ts` holds **26 inline JSON-style served questions** (9 of the 34 orphan keys, incl. all 3 approved singletons). They had to be migrated in C2 (0-orphans is impossible without them), which exceeded 3A's "questionBanks-only" scope (owner-RATIFIED). Relocate them to a `questionBanks/**` pack so 3A holds literally; then the data commit is purely under questionBanks again.
- **[FU-TOPICHUB-MASTERY-STORAGE-KEY]** -- `services/topicHubMastery.ts` (mastery snapshots to localStorage + Firestore) and the dormant `services/spacedRepetitionEngine.ts` key their records with `normalizeTopicKeyForStorage` / a `${topicKey}::${conceptKey}` composite, NOT `resolveCanonicalSlug`. C1 deliberately preserved this key so already-stored mastery is not orphaned (no backfill). A writer/reader asymmetry exists (TeachFlow writes the raw key; ProfilePage reads the alias-collapsed canonical). Reconcile the storage-key scheme with the canonical vocabulary -- migration-sensitive, needs a stored-data-safe plan. Guard D honestly reports this layer as out-of-scope rather than silently claiming coverage.

### STILL OPEN (carried, related to the P0)
- **[FU-MI-TOPICKEY-BACKFILL]** -- weak-area unification normalises at the boundary (new writes + read-time aggregation) with **no backfill**; already-stored MI records under variant keys are not rewritten. A one-time backfill would need the same migration-safety care as the mastery-storage FU.
- **[FU-MENU-HEREDITY-MAGNETIC]** -- the worksheet menu keeps Heredity + Magnetic Effects OFF (owner decision 2A); the canonical vocabulary uses `heredity` (never the banned `heredity-and-evolution`) and `magnetic-effects-of-electric-current`.
- **[FU-DELETE-SHARED-DATA-DUPE]** -- the `lib/shared-data/` duplicate bank was NOT migrated (out of the served path); propose deletion.
- **[FU-RETIRE-CBSE10CANONICAL-VOCAB]** -- `topicAliasMap.resolveCanonicalTopicKey` is demoted (it emits the banned `heredity-and-evolution` + a rival vocabulary); retire it in favour of the single `topics.ts`-slug authority once all consumers are migrated.
- **[FU-PREINSTALL-GUARD-SH]** (carried from #360) -- root `preinstall` shells out to `sh`; replace with a Node guard. Own tiny chore PR.
- **[FU-HANDOFF-DOC-DRIFT]** -- `CURRENT_STATE.md` / `NEXT_ACTION.md` / `IMPLEMENTATION_ROADMAP.md` are drifted (CURRENT_STATE line 1 also carries pre-existing mojibake + the top entries are out of order). This docs PR prepends an accurate #363 record but does NOT rewrite the drifted body; a dedicated docs-hygiene pass is still owed.

---

## 2026-07-10 — Worksheet: scope DERIVED from the topic selection + MI 2c copy merged (#360, `b096a8a`)

### ✅ RESOLVED (closed by #360)
- **[FU-WS-SCOPE-DERIVE] → CLOSED.** Scope is now **derived** from the selection, not an independent control. `selectedTopics[]` + `allTopics` are the single source of truth; `scope`/`singleTopic`/`multiTopics` are derived views with stable array refs (`EMPTY_TOPICS` when not multi-topic) so every downstream consumer stayed untouched. `scope = allTopics ? full-subject : selectedTopics.length >= 2 ? multi-topic : topic`. The three-way Scope segmented control + topic dropdown + separate multi/full chip lists were replaced by ONE unified topic picker (an "All topics" toggle + per-topic chips) with an honest derived label (`Topics — 2 selected · multi-topic`). **Ticking topics IS the scope** — no ticked topic can be silently discarded (the #357 defect: the in-app tick never called `setScope`, so the build used `validMulti[0]` and dropped the rest). vitest 18/18; 4-lens adversarial review 0 findings. A direct instance of the product principle logged below.
- **[FU-WS-MI-COPY] → CLOSED.** State 2c reworded to the locked copy — *"You haven't lost marks in **{scopeLabel}** yet. Right now your weak area is **{X}** — focus this worksheet there, or add it alongside."* (`&rsquo;` entity used). Wording only; the same state fires and the one-tap remedy button is unchanged. State 2a was already softened in #357; the three MI states stay distinct.
- **[FU-PNPM-PACKAGEMANAGER-PIN] → RESOLVED.** Root `package.json` now pins `"packageManager": "pnpm@10.32.1"` (commit **`581b0dd`**). `pnpm install --frozen-lockfile` succeeds in a fresh worktree. **Gotcha D42 is retired** — it was the symptom, not the disease. `quality-gate.yml`'s `corepack prepare` line is now belt-and-braces; its **line-38 comment asking for this pin can be deleted** (a trivial residual cleanup for a future code PR — NOT done here, docs-only).

### 🟡 STILL OPEN — P0 (dispatched separately to a fresh agent; do NOT start it here)
- **[FU-TOPICKEY-UNIVERSAL] (P0 — the root cure) — FULL DIAGNOSIS (inherit from the repo, not chat).** The bank stores **51 distinct `topicKey` values for ~26 chapters** — **25 Title-Case** (`"Acids, Bases and Salts"`) and **26 slug** (`acids-bases-and-salts`); most chapters exist under BOTH. `getTopics()` emits a **third** vocabulary. The canonical registry is **`src/lib/desktop/topics.ts`** (28 slugs — **`src/data/topics.ts` does not exist**). The resolver already exists: **`topicAliasMap.ts`** (`normalizeTopicSlug`, `resolveCanonicalTopicKey`, `getRuntimeTopicCandidates`). **Only Quick Practice, `questionTypeFirstResolver`, and `scopePolicy` resolve; worksheet, Chapter Test, and Full Mock match RAW** — so **≈1,180 questions across four Science chapters are unreachable** (owner-confirmed live on Chemical Reactions). **The WRITE path drops too** (prior audit G9: a slug mismatch is a silent no-op → MI logging / weak-areas / `sessionRecords.topicKeys` can fail or double-bucket). The normaliser has **real blind spots**: `OurEnvironment` vs `our-environment` → 76 questions unreachable; en-dashes; parenthetical suffixes. **A prior audit already chose the cure — consolidate the data + a CI guard — and it was never executed; every attempt since applied a query-time patch to ONE surface, and the variants regenerated.** `WorksheetGenerator.tsx` carries **two `// TODO(P0-topickey)` raw compares** (`drawnWeakTopics` + the sibling `rankedWeakKeys.has(q.topicKey)`) waiting for this PR. **Fix = the three-commit root cure:** (1) **resolve everywhere, read AND write**, normaliser hardened; (2) **migrate the data**, proven lossless by a **count invariant** (identical totals, identical id sets, identical per-topic × section × mark-band cells — **any mismatch STOPS the PR**); (3) **four CI guards** making a non-canonical key impossible to enter the repo. **Also fix the alias-map errors:** `circles` ⇄ `areas-related-to-circles` currently return an **identical merged 454-question pool**; `Human-Eye` (209 Q) **orphans** from `light`. Related: **[FU-MI-TOPICKEY-BACKFILL]**, **[FU-BANK-TOPICKEY-NORMALISE]**. **Do NOT attempt piecemeal** — the guard is what makes it stick.

### 🆕 NEW FOLLOW-UPS / GOTCHAS (logged from #360 rituals)
- **[FU-PREINSTALL-GUARD-SH]** — the root `preinstall` script shells out to `sh` (`rm -f package-lock.json yarn.lock; case "$npm_config_user_agent" …`), so it **fails on plain PowerShell** (`'sh' is not recognized`). Agents avoid it only because VS Code's terminal has Git's `sh` on PATH. **Fix:** replace with a ~10-line Node guard (`node scripts/guard-pnpm.mjs`) reading `process.env.npm_config_user_agent` and removing stray `package-lock.json` / `yarn.lock`. Portable everywhere Node runs — which is guaranteed, since pnpm needs Node. Own tiny chore PR.
- **GOTCHA (Windows rebase)** — an interrupted rebase can leave a **hollow `.git/rebase-merge`** that `git rebase --abort` cannot clear (`could not read '.git/rebase-merge/head-name'`). **Remove the directory manually**, and prefer `git pull --no-rebase --no-edit` where `node_modules` is present. (Observed: the shared checkout `C:\Projects\Lazytopper-Production` was mid-rebase at the start of #360 — worked around by doing ALL work in an isolated worktree, never touching the shared checkout.)
- **RULE (worktree hygiene) — verify, do not trust the report.** Four stale worktrees (`notes-docs289`, `notes-life-processes`, `notes-light-complete`, `pr-f-entity-render`) survived their PRs' rituals because the Windows lock defeated `git worktree remove` while agents reported "de-registered"; their `.git/worktrees/*` residue later broke unrelated git commands. Three stale REMOTE branches also survived; one (`feat/pr-f-note-entity-render`) still carried the deleted `WorksheetScorecard.tsx` and **would have reverted PR-2 if merged.** **New rule: after deleting a branch, verify `git worktree list` AND `git ls-remote` — do not trust the "success" report.**

### 🧭 PRODUCT PRINCIPLE (reaffirmed by #360)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** #360 closed the "Customise tick never derives scope" instance; the raw-slug zero-match instance is [FU-TOPICKEY-UNIVERSAL].

---

## 2026-07-10 — Notes v1.3: visible mindmap tree + full-screen note modal merged (#356, `629457e`)

### ✅ RESOLVED (closed by #356 — v1.3 refinements from the #345 live-review, NOT regressions)
- **Notes v1.3 mindmap default-visible → DONE.** The mindmap now reads as a TREE by default (per-branch `--mm-accent` rail + connector elbows + root › branch › leaf weight). ⚠️ The brief's premise ("branches render COLLAPSED / 5 flat closed rows") was **WRONG** — all three specs (life-processes/light/quadratic) are **depth-2** mindmaps already fully expanded at the existing `useState(depth <= 1)` (no branch ever rendered a closed caret). The real defect was **visual legibility**, so the open-state was PRESERVED and only the visuals changed. Kept the v1.2 ≤380px no-overlap responsive win (did not revert to the fixed d3 canvas).
- **Notes v1.3 full-screen note modal → DONE.** `NoteModal` opens a 92vw × 92vh sheet (capped 1280px for readable line length) on desktop, full-screen on mobile; `<Note>` internals + all close affordances (✕/Escape/dim-click), scroll-lock and focus-restore unchanged — sizing only.
- **[FU-MOBILE-VERIFY-GAP] → FIRST REAL PASS CLOSED.** This PR's static 360px layout audit was **confirmed by the owner on a real viewport** (mindmap: no horizontal scroll / no overlap; modal: full-screen with ✕ reachable). The DOCTRINE stands and is now mandatory: **every surface's live-verify includes a 360px check**, and every future mockup ships a mobile frame.

### 🆕 NEW FOLLOW-UP
- **[FU-PNPM-PACKAGEMANAGER-PIN] (supersedes gotcha D42)** — root `package.json` has **no `packageManager` field**, so Corepack falls back to whatever pnpm is on PATH in a fresh worktree (here 9.15.9). `pnpm-workspace.yaml:59` sets `autoInstallPeers: false` and the lockfile records the same, but a different pnpm resolves the settings differently → **`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on `--frozen-lockfile`**. **Fix:** add `"packageManager": "pnpm@10.32.1"` to root `package.json` — `quality-gate.yml:38` already names this as the follow-up and line 40 works around it with `corepack prepare`. **The current `--no-frozen-lockfile` + restore-lockfile workaround is risky:** if an agent forgets to restore, a lockfile written by the wrong pnpm enters the diff. **Own tiny chore PR** (owner-gated; not bundled into a feature PR). Supersedes D42.

---

## 2026-07-10 — Worksheet CONTEXT-AWARE ENTRY + multi-topic MI aggregate + preview/switch/360px merged (#357, `aa7e778`)

### ✅ RESOLVED (closed by #357)
- **[FU-WS-ENTRY-CONTEXT] → CLOSED.** The builder now reads `scope/subject/stream/topic/topics` from the URL (validated against `topics.ts`), seeds state from it, DELETES the `topics[0]` fallback, and redirects ONCE to `/practice-hub` when no valid topic is present. Recon finding: the desktop hub already emitted the params via `buildDesktopWorksheetPath` — the bug was the builder ignoring them, so App.tsx was never touched.
- **[FU-WS-MULTITOPIC-MI-AGGREGATE] → CLOSED.** New `rankedInScopeWeakTopics` + `allocateMiCounts`: proportional marks-lost split across ALL in-scope weak topics with a FLOOR (a chosen topic is never dropped), a CAP (≈50% at N≥3; N=2 keeps the owner-verified 60/40 from `MI_BOOST=1.5`), an AVAILABILITY gate, and per-topic level-2 section skew. `weakestTopic`/`allocateCounts`/`MI_BOOST` retained unchanged.
- **[FU-WS-PREVIEW-BUTTONS] → CLOSED.** Sticky bar + its CSS deleted; hero + drawer-foot Preview kept; the mobile `@media` that hid the hero button is gone so mobile keeps a Preview CTA.
- **[FU-WS-MI-SWITCH] → CLOSED.** Both `<input type="checkbox">` replaced by an accessible `role="switch"` button (aria-checked, keyboard-operable, visible focus ring).

### 🟡 STILL OPEN (only half landed)
- **[FU-WS-MI-COPY] — KEEP OPEN.** State 2a (single-topic weak-section toggle) was softened, but **state 2c still reads "Your weak area is X, not {topic}"** — the blunt out-of-scope wording. Finish in the follow-up PR alongside [FU-WS-SCOPE-DERIVE].

### 🆕 NEW FOLLOW-UPS (owner findings from #357 live-verify)
- **[FU-WS-SCOPE-DERIVE]** — ticking topics in Customise calls `setMultiTopics` but **never `setScope`**, so `scope` stays `"topic"`; the URL-sync then builds from `validMulti[0]` and silently DISCARDS the student's other ticked topics, and `enrichActive` (gated on `scope !== "topic"`) short-circuits so the correct multi-topic MI path is never reached. The URL entry path already promotes scope (`parseEntryContext` infers multi from >1 `topics`). Owner-confirmed: with the Scope control explicitly on multi-topic/full-subject, MI works and honestly names only topics that have mistake data. Fix in the follow-up PR (a tick ⇒ derive scope). A direct instance of the product principle below.
- **[FU-TOPICKEY-UNIVERSAL] (P0)** — surfaces match RAW topic slugs, so four Science chapters (`chemical-reactions-equations`, `acids-bases-salts`, `metals-non-metals`, `reproduction` ≈ **1,180 questions**) return ZERO. The bank stores **51 distinct `topicKey` for ~26 chapters** (25 Title-Case + 26 slug). Chapter Test and Full Mock carry the SAME defect, latent. Also `WorksheetGenerator.tsx` `q.topicKey === t.key` (enrichCount / drawnWeakTopics) is a raw compare that silently disables enrichment on Title-Case chapters. Owner-confirmed live on Chemical Reactions. **Cure (from a prior audit): Phase 1 = resolve-everywhere (read AND write) + CI guards; Phase 2 = data consolidation ([FU-BANK-TOPICKEY-NORMALISE], [FU-MI-TOPICKEY-BACKFILL]).** Prior piecemeal fixes FAILED because no guard existed → new variants reappeared. **Do NOT attempt this in a small PR** — it needs the resolve-everywhere + guard shape.

### 🧭 PRODUCT PRINCIPLE (logged from #357 — three instances found today)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** Instances found: the `topics[0]` guess (fixed by #357); the Customise tick that never derives scope ([FU-WS-SCOPE-DERIVE]); the raw-slug topic match returning zero for Title-Case chapters ([FU-TOPICKEY-UNIVERSAL]).

### ℹ️ NOTE — [FU-MOBILE-VERIFY-GAP]
- The worksheet builder now ships a **360px reflow** (#357 FIX-6), but the DOCTRINE stands: every future mockup ships a mobile frame + every live-verify includes a 360px check.

---

## 2026-07-09 — Worksheet scope-relative MI + section enrichment + Preview affordance merged (#353, `f8c1536`)

### ✅ RESOLVED (closed by #353 — NOT #349 regressions; refinements surfaced in #349 review)
- **[FU-MI-SCOPE-RELATIVE] → CLOSED.** MI is now computed WITHIN the chosen scope (new pure `worksheetMiSelector.ts`; `scopeHotspot` = weakest in-scope topic vs `globalHotspot`). The single locked box was SPLIT into its true causes — a student WITH MI data now sees the real weak topic NAMED + a one-tap remedy, never the false "grade a worksheet first".
- **[FU-MI-ENRICH-WITHIN-TOPIC] → CLOSED.** Single-topic worksheets now enrich by SECTION — derived from each mistake's `totalMarks` via the CBSE band proxy (honest-unknown for non-band values, never a fabricated section); additive `orderPoolBySectionBoost` in `worksheetModel.ts` reusing `allocateCounts`, capped at real per-section availability, gated on the drawable pool so the toggle is never a no-op. Cross-topic `MI_BOOST` byte-unchanged. No schema change / no new writes.
- **[FU-BUILDER-PREVIEW-AFFORDANCE] → CLOSED.** Desktop `position:sticky` Preview footer + a Preview at the foot of the Customise drawer.

### 🆕 NEW FOLLOW-UPS (owner findings surfaced in #353 live-verify — a dispatched-separately follow-up PR, NOT #353 regressions)
- **[FU-WS-ENTRY-CONTEXT]** — the builder ignores the topic the student ARRIVED with: `WorksheetGenerator()` takes NO props and defaults to `topics[0]`; both entry paths lose the origin context, and there is no topic control on the first (smart-default) screen. The builder should honour the entry topic and expose a topic control up front.
- **[FU-WS-MULTITOPIC-MI-AGGREGATE]** — `weakestTopic()` returns ONE topic, so multi-topic scope names/boosts only the single weakest in-scope topic. Multi-topic MI should aggregate/weight across ALL the selected weak topics, not just the weakest.
- **[FU-WS-PREVIEW-BUTTONS]** — three Preview affordances now render (hero + desktop sticky + drawer-foot). Keep the hero + drawer-foot; DROP the sticky bar (redundant on desktop).
- **[FU-WS-MI-SWITCH]** — the MI enrich control is a raw `<input type="checkbox">`; promote it to an accessible switch (role/aria + keyboard) matching the product's control grammar.
- **[FU-WS-MI-COPY]** — soften the out-of-scope wording in the split MI states (the "your weak area is X, not {scope}" copy reads slightly blunt).
- **[FU-MOBILE-VERIFY-GAP]** — the surfaces are built as ONE responsive component, but mobile (≤360px) has never been mockup-designed or live-verified. **DOCTRINE:** every future mockup ships a mobile frame, and every live-verify includes a 360px check.

### ℹ️ NOTE — carried
- **[FU-CI-SOLUTION-CACHE]** carried: giving C&I uploads a canonical `questionId` enables the exact `questionIds`→`canonicalQuestionBank` section join, superseding the `totalMarks` band proxy #353 uses for MI section derivation.

---

## 2026-07-09 — Objective ANSWER KEYS repaired merged (#352, `b9a7817`)

### ✅ RESOLVED
- **[FU-BANK-CORRUPT-KEYS] → CLOSED** (except the 13 queued rows below). 89 in-scope objective rows re-derived with an AST scanner using the grader's own `normaliseOption`/`resolveOptionIndex`/`isObjectiveType`; 76 fixed (61 corrupt MCQ keys set to the exact correct EXISTING option + 15 AR rows given the standard CBSE `options[]`), 13 honestly manifested. `correctOption` never introduced — the key stays `q.answer`. Grader byte-untouched.

### 🆕 NEW FOLLOW-UPS
- **[FU-BANK-KEY-REVIEW-QUEUE]** — the 13 objective rows that could not be resolved from the source (corrupted/duplicated options, figure-dependent) are listed in `docs/objective-answer-key-review-queue.md`; the grader defers to the model for them. Needs a real-paper lookup / teacher pass. Same class as [FU-MODEL-ANSWER-QUALITY] and [FU-Z3-TEACHER-VERIFY] — fold into the student-QC review pass.
- **[FU-SECTION-A-VSA-HALFMARK]** — the scanner found **99 written-answer rows (VSA/Short/Long/Case) classified objective only by `section === "A"`**. Cofounder check: all **1,950 Section-A rows carry `marks: 1`**, so #348's ≤1-mark rail means they can only ever be clamped to 0-or-1 — **no live correctness hole**. Residual: CBSE sometimes awards ½ on a 1-mark VSA; those rows now get 0 or 1. **Accepted simplification** — revisit only if half-marks matter or a multi-mark row ever lands in Section A.
- **[FU-BANK-GARBLED-DISPLAY-TEXT]** — the scanner's out-of-scope observations: on ~20 fixed rows the correct option's DISPLAY text is itself symbol-stripped (key resolves correctly, but the option renders garbled), and many rows still carry garbled `solutionSteps`/`finalAnswer`. Content-QC / symbol-integrity pass (like the PYQ symbol track); not a scoring defect.

---

## 2026-07-09 — Worksheet BUILDER redesign merged (#349, `b4f2162`)

### 🆕 NEW FOLLOW-UPS (all being fixed in the dispatched-separately follow-up PR)
- **[FU-MI-SCOPE-RELATIVE]** — MI enrichment currently compares one GLOBAL hotspot to the chosen scope (`canEnrich = hotspotInScope`, `WorksheetGenerator.tsx` ~L240), so a student WITH MI data sees a locked box, and the locked copy falsely says "Grade a worksheet or use Check & Improve first". MI must be computed WITHIN the selected scope. Fixed in the follow-up PR.
- **[FU-MI-ENRICH-WITHIN-TOPIC]** — `worksheetModel.ts` (~L232/L245) defines MI re-weight as a boost to the weak TOPIC, i.e. cross-topic only. Single-topic worksheets therefore can't enrich today. Within-topic enrichment (weight toward the sections / question-types / mark-bands where the student loses marks) is the real unlock — conditional on MI storing sub-topic granularity; the follow-up PR investigates and either builds or flags it.
- **[FU-BUILDER-PREVIEW-AFFORDANCE]** — the action bar (`.lt-ws__sticky`, ~L730) is mobile-only, so DESKTOP users must scroll back to the hero to preview after customising. Fixed in the follow-up PR.

### ℹ️ NOTE — closes 2 of the 3 owner-found worksheet bugs from #344
- The 3 owner-found worksheet bugs logged post-#344 are now resolved across two PRs: **#349 fixes PDF filename (FIX D) + history placement (FIX B)**; **#348 fixed grader MCQ all-or-nothing**. The [FU-MI-*] items above are NEW, surfaced during #349 review — refinements to the shipped redesign, not #349 regressions.

---

## 2026-07-09 — Uniform OBJECTIVE (MCQ/AR) scoring merged (#348, `27eaa8f`)

### 🆕 NEW FOLLOW-UPS
- **[FU-OBJECTIVE-COST-SKIP]** — model-skip cost saving DEFERRED. On the PDF/photo upload paths (Worksheet, Check & Improve) the student's MCQ pick is only knowable AFTER the model reads the handwriting, so an objective question CANNOT be excluded from the model batch without losing correctness (the deterministic clamp still discards the model's marks, so the invariant holds regardless). True model-skip pays off only on future CLICK-BASED surfaces where the pick is captured digitally (Chapter Test / Full Mock on-screen MCQs); Quick Practice already grades MCQs client-side (zero API). Wire the skip when those surfaces move server-side. Correctness first, per the task's own escape hatch.
- **[FU-BANK-CORRUPT-KEYS]** — data-quality task for the Fable bank lane. The STEP-0 census found **~86 objective questions (concentrated in `.pyq*` extraction files) whose `answer` is CORRUPT** (mark-scheme fragments like "a) 1 1", "30 1", "96° 1" — matches NO option even after normalisation), plus **~15 maths Assertion-Reason `.pyq` rows with NO `options[]`** (the four choices are in prose; `answer` holds the full AR statement). These currently DEFER to the model (never a false 0), but can never be scored DETERMINISTICALLY until the keys are cleaned / options backfilled. Exact affected files + counts are in the report (`report-objective-scoring-uniform-2026-07-09.md`) + the STEP-0 bank census. Not a regression — pre-existing extraction debt surfaced by this PR.
- **[FU-CI-SCORECARD-VARIANT]** — Check & Improve has **no `<ResultsScorecard>` variant** and is not in `SessionSurface` (`"worksheet" | "chapter-test" | "full-mock"`), so it shows a bespoke graded-paper view (`CheckImproveGradedPrintDoc`, #333) and **writes no session record** — its results don't feed the per-surface histories / progress arc. Not a regression — a GAP. Design pass pending (decide whether C&I becomes a 4th `SessionSurface` with its own scorecard variant + record, or stays intentionally ephemeral). Surfaced while wiring the C&I objective plumbing.
- **[FU-CI-SOLUTION-CACHE]** — ✅ **CLOSED by #420** — carried from `SURFACE_TRACKER.md`: the solution cache IS the STRUCTURAL fix for **[FU-MODEL-ANSWER-QUALITY]** (garbled model answers), delivered with the Gate-2a quality gate on every write path. See the #420 section at the top.

---

## 2026-07-08 — Notes v1.2 template merged (#345, `17fea57`)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTES-NCERT-PDF-HOSTING]** — C4's clickable NCERT page refs build a Firebase Storage URL (`ncert/{subject}/ch{N}.pdf#page=N`) and show an HONEST "coming soon" fallback because nothing is hosted yet. The separate infra PR uploads the ~26 Class-10 NCERT chapter PDFs to Storage, **PAGE-ALIGNED** (textbook page == PDF page), **public-read + CORS** (so the fetch-HEAD probe resolves), at `ncert/{subject}/ch{N}.pdf`; then C4 auto-activates with ZERO deploy. **⚠ COPYRIGHT — owner sign-off REQUIRED before hosting:** serving NCERT page images/PDFs commercially is a step beyond citing page numbers. No PDFs are committed to the repo (repo-bloat forbidden).
- **[FU-NOTE-MODAL-FOCUS-TRAP]** — NoteModal + NcertPageModal do focus-in-on-open + restore-on-close but no full Tab focus-trap (matches the existing ConceptTeachDrawer/ResultsScorecard norm). Add a proper Tab-trap to the note modals (and optionally the existing drawers) for complete dialog a11y. Non-blocking.
- **[FU-DROP-D3-HIERARCHY]** — the C1 mindmap rewrite no longer imports `d3-hierarchy`; the dep is still in `lazytopper/package.json`. Prune it (+ lockfile) in a hygiene PR — needs a linux/Codespaces install to regen the frozen lockfile.

### ℹ️ NOTE — notes v1.3 follow-up (owner-found REFINEMENTS, not v1.2 regressions)
- During #345 review the owner surfaced 2 items being addressed in a **separate v1.3 follow-up PR** (dispatched separately), NOT v1.2 regressions: (1) the **mindmap tree should be VISIBLE by default** (surfaced rather than behind the collapsed/tab state); (2) the **note modal should be FULL-SCREEN** for diagram-heavy notes (the current large-centered/desktop-sheet is cramped for figure-dense chapters like Life Processes). Refinements to the shipped v1.2 template — logged so the v1.3 PR isn't mistaken for a v1.2 regression.

---

## 2026-07-08 — Progress-Journey ARC · PR-3 per-surface Worksheet history merged (#344, `a4c3eec`)

### 🆕 NEW FOLLOW-UP
- **[FU-HISTORY-C2-PER-WORKSHEET-DELTA]** — the PR-3 "vs last time" chip uses `getSubjectProgress` (the designated source), which is a **subject-level MONTH trend** (marks% before→now over the window, from the attempts stream) attached to the newest row of each subject and labelled "this month" — NOT a literal per-worksheet session-to-session delta (this worksheet's marks% vs the previous same-topic worksheet's). It is honest-or-silent (absent when thin; never a fake 0). If the owner prefers a literal per-session delta on every row, that is a small fast-follow computable from the stored records themselves (no store change). Non-blocking; owner decides at/after C2 live-verify.

### ℹ️ NOTE — 3 owner-found worksheet bugs are a SEPARATE follow-up PR (not PR-3 regressions)
- During #344 QA the owner surfaced 3 worksheet issues being fixed in their **own follow-up PR** (dispatched separately), NOT caused by PR-3: (1) **grader MCQ all-or-nothing** scoring; (2) **PDF filename**; (3) **history placement**. PR-3 is the read-layer that renders records; these are grader/export/placement concerns on adjacent surfaces. Logged here so the follow-up PR isn't mistaken for a PR-3 regression.

---

## 2026-07-07 — Progress-Journey ARC · PR-2 Universal `<ResultsScorecard>` merged (#341, `8c4c159`)

### 🆕 NEW FOLLOW-UPS
- **[FU-MODEL-ANSWER-QUALITY]** — surfaced during the #341 owner live-verify (NOT a PR-2 bug): the **worksheet grader's generated MODEL ANSWERS can be garbled/incoherent even when the final value is right**. Instance: Real Numbers `WS-M-MIX-22` Q2 (HCF working) — the model-answer prose was incoherent though the final answer/mark was correct. This is a **model-answer GENERATION quality** problem, distinct from the mark grading (which was correct here). Related to **[FU-Z3-TEACHER-VERIFY]** + **[FU-LIGHT-REVIEW-QUEUE]**. Action: sample generated model answers during content QC (spot-check coherence, not just the final value). Non-blocking; content/AI-quality track, not a scorecard defect.

### ℹ️ NOTE — deferred scorecard variants
- **Chapter Test + Full Mock `<ResultsScorecard>` variants remain `deferred:true` config seams** (`scorecardVariants.ts`), by design (#341): their surfaces are still being rebuilt and their board-readiness (CT) / section-breakdown + E2b-upload (FM) dependencies don't exist yet. When those surfaces are rebuilt (arc PRs / their own redesigns), the rebuild FILLS the deferred config (score model / framing / actions), not re-architects — the shell + interface already accommodate them. The shell no-ops a deferred variant (returns null) as a guard, so a premature wiring can't render a half-built card.

---

## 2026-07-06 — Progress-Journey ARC · PR-1 session-record data layer merged (#338, `d704b1c`)

### ✅ CLOSED
- **[FU-SESSIONRECORDS-RULES]** — the new `sessionRecords/{uid}` Firestore collection needed a rules block or its cloud write/read is denied by the catch-all deny. **CLOSED:** owner added + deployed the block via Console and committed it to trunk (**`dc73360`**). (Lesson for future new-collection work: `sessionRecords` is the FIRST genuinely-new top-level collection in the arc — every prior persistence feature reused an existing collection precisely to avoid a `firestore.rules` edit. A new top-level collection ALWAYS needs a companion rules block deployed before its cloud half works.)

### 🆕 NEW FOLLOW-UPS
- **[FU-SESSIONRECORDS-REGRADE-JSDOM-TEST]** — add a jsdom/browser-env test that persists a worksheet via `saveWorksheetSession`, grades it, then re-grades and asserts a SINGLE `sessionRecords` doc under the same id. The current node-env `sessionRecords.test.ts` can't exercise the `getWorksheetSession` freeze-recovery short-circuit (no `window`), so the idempotent-re-grade path is proven by reasoning + the review, not by an executed test. Non-blocking.
- **[FU-SESSIONRECORDS-SEEN-SET]** — the uniqueness seen-set (union of `questionIds` across a student's records for (subject, topic) → the worksheet generator EXCLUDES it, with HONEST EXHAUSTION when the pool depletes) is the deliberate FOLLOW-ON on this same store. The `questionIds` field is LOCKED into the §1 contract now, so no migration is needed later. (§1c.)

### ℹ️ NOTE
- **#180** (`docs/backlog-stale-branch-review`, a month-stale June-2 "triage branches later" docs PR) also edits `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`. It does NOT touch SESSION_LOG. This #338 handoff merged first (active work), so #180 will need a rebase or a close — flagged to the owner.

---

## 2026-07-06 — Topic Hub boardEssentials seeding merged (#337, `1caa25d`)

### 🆕 NEW FOLLOW-UPS
- **[FU-TOPICHUB-PEDAGOGY-REVIEW]** — the owner's ONE holistic pedagogy review of the 12 seeded topics' **concept selection + mark bands** is **DEFERRED to the student-QC stage**. The concepts shipped **fact-checked** (authored + an adversarial syllabus/accuracy pass, 6 clean / 6 corrected), so this is a final teacher/examiner sign-off, not a correctness blocker — **surface it during QC**. The per-topic table (concept · one-line-use · marks · NCERT source) + the skeptic-pass issue log is in `Desktop/diff/report-topichub-boardessentials-seed-2026-07-06.md`.
- **[FU-TOPICHUB-PREVIEW-LABEL]** — the `isSamplePreview` "Sample preview" label mechanism renders correctly (`ConceptSpine.tsx:462`; asserted by `ConceptSpine.test.tsx` via the synthetic `__sample-preview-fixture__`). **Now moot for live topics** — with 26/26 `topics.ts` topics seeded, no live topic is a preview, so the label is dormant (mechanism still correct + under test for any future/edge topic outside `topics.ts`). No action; logged for completeness.

### ℹ️ NOTE (pre-existing, untouched)
- **`surface-areas-and-volumes` has only 2 `boardEssentials`** — one of the *original 14* seeds, authored that way (2 concepts). NOT touched by #337 (out of scope); flagged for awareness during the pedagogy review in case a 3rd concept is wanted.

### ⚠️ COORDINATION
- **#180 (`docs/backlog-stale-branch-review`)** also edits this file but is **stale** (last updated 2026-06-02, ~100 commits behind trunk) and will need a rebase/reconcile if ever revived. #337's docs handoff was written against current trunk `1caa25d`.

---

## 2026-07-06 — C&I holistic scorecard merged (#333, `c3f6084`)

### 🆕 NEW FOLLOW-UPS
- **[FU-CI-EXPAND-DISCOVERABILITY]** — the multi-Q per-question steps are collapsed by default behind a "Show step-by-step working ▸" affordance (also: tap the question / Enter-Space). Confirm this is discoverable enough for students — **owner to eyeball in QC**. If under-discovered, options: default-expand the first question, or add a persistent "expand all" control.
- **[FU-UNIVERSAL-SCORECARD]** — the three grade renderers (Check & Improve single-Q, Check & Improve multi-Q, and the Worksheet) still each render results their own way. #333 is the **bridge** (a shared `CheckImproveGradedPrintDoc` + the shared `worksheetPdfExport` core); the arc's **2nd PR** unifies them into the Universal `<ResultsScorecard>` (spec `LazyTopper_Universal_Scorecard_Spec_2026-06-25.md`).

---

## 2026-07-06 — Light extraction PILOT merged (#330, `83b1268`)

### 🆕 NEW FOLLOW-UPS
- **[FU-LIGHT-REVIEW-QUEUE]** — ship-tracked owner decision: the **230 AI-authored solutions** (`AI_GENERATED_SOLUTION_IDS`) and **52 authored-SVG-later diagram flags** went live for trusted-student QC. The committed manifest `docs/light-extraction-review-queue.md` is the authoritative verification list (incl. the priority-eyeball sublist: 9 wrong source keys overridden, `CFPQ-S-LGHT-013` official-rubric error 18.6→15.7 mm, 5 handwritten-notebook discrepancies). The post-launch correction pass works this queue; solved items get removed from the manifest + the id-sets.
- **[FU-LIGHT-4MK-CASE-GAP]** — the 4-mark case-based band is the one thin band after the pilot (16 total): case-based material is scarce in every source swept so far. Candidate: a dedicated case-based authoring/extraction pass.
- **[FU-GDRIVE-LIGHT-1MK-PASS]** — deferred gdrive leftovers for Light: `757_A-R...25Q.docx` (25 AR — a format gap), `821_REFLECTION AND REFRACTION.docx` (51 objective), the 2022-23 PYQ residual sets (+official MS), `CBSE Practise Papers\Science.pdf` (unsized). Same pipeline, low priority.
- **[FU-BEYOND-BOARD-BADGE]** — `LGHT_FND_BEYOND_BOARD` + `LGHT_GDR_BEYOND_BOARD` (52 rows) ship unmarked in the pool; a later UI pass can badge/filter them (the arrays keep them addressable).
- **[FU-AI-RETIRE-LIGHT]** — with authentic supply at 664 non-AI rows, the 103 AI Light questions (`light.pack1/2`) are retirement candidates once QC proves the authentic tier — per doctrine, NOT done in the extraction PR.

## 2026-07-05 — Grading-path bugs MERGED (#331, `2484cff`)

### ✅ CLOSED
- **[FU-MULTIQ-CI-GRADE-THROW]** — Bug 2. C&I recording (`recordMistake`/`recordAttempt`, incl. `multiQuestionToCsr`) decoupled into its own inner try/catch → a client-side throw during recording no longer reaches the grade-display error path, so the multi-question grade persists on screen (honest "pending" on unreadable pages). Owner live-verified.
- **[FU-GRADING-RELIABILITY] (partial-credit variance)** — Bug 3. Owner-approved ERROR-CARRIED-FORWARD MARKING clause added to Rule 4 in BOTH grader functions → a step that correctly applied the right method to a carried-forward wrong value earns its method marks; only the final-answer mark is withheld. Owner live-verified: cascading quadratic → **2/3** with a proper "Error Carried Forward" step + ½-mark deduction (previously 0.5 vs 1.5).

### 🔄 SUPERSEDED
- **[FU-XUSERID-PROXY-STRIP] → done at the auth layer.** The Bearer-token auth fix (Bug 1) merged in #331 and is correct: the deployed `artifacts/api-server` strips `x-user-id` but forwards `Authorization`, and `userProgress.cjs` now resolves the uid from the verified Firebase Bearer token. The proxy-strip is no longer the blocker. (`questionReport.cjs` was left byte-identical — report auth is already handled at the api-server gateway.)

### 🆕 NEW FOLLOW-UP
- **[FU-BACKEND-DATABASE-URL-UNSET]** — with auth fixed, progress sync now returns **503 "Database unavailable"**: `DATABASE_URL` is unset on the backend. This is a **legacy backend-Postgres path that the Progress-Journey arc supersedes → do NOT provision a DB for it.** Bug 1's feature is therefore DEFERRED (auth merged, correct, not a regression). Firestore-based persistence (PR-B, live since #322) is the live progress store.

---

## 2026-07-03 — Firestore undefined-field persistence fix MERGED (#322, `706cc12`) — PR-B (#321) now genuinely LIVE end-to-end

### ✅ RESOLVED / DELIVERED
- **Silent Firestore persistence failure ROOT-CAUSED + FIXED (#322 `706cc12`)** — `firebaseClient.ts` initialised Firestore with `getFirestore(app)` (no `ignoreUndefinedProperties`), so the SDK **threw** `"Unsupported field value: undefined"` on any doc with an `undefined` field. Every attempt doc carries `undefined` (`bloomSkill` on the C&I/MCQ paths, `topicName` when absent), so ALL attempt writes threw and were silently swallowed by fire-and-forget `.catch(() => {})`. Fix: `initializeFirestore(app, { ignoreUndefinedProperties: true })` (sole init — verified) + un-muted the two write catches to `console.warn`. 2 files; gates GREEN; CI GREEN (linux build); Codespace vitest 190 pass / 3 pre-existing-unrelated (`worksheetPdfExport.test.ts`, proven on base `c5b4de6`); cofounder byte-reviewed.
- **[FU-PROGRESS-PERSISTENCE] / PR-B (#321) now LIVE-VERIFIED end-to-end** — PR-B was merged but **non-functional** (the blob write never worked; PR-B inherited the same undefined-rejection). **Owner live-verified on production after #322:** a fresh graded attempt now writes `practiceInsights/{uid}/attempts` and it appears in the console; the durable record carries all fields (subject, topicKey, marksScored/Available, `mode:"graded"`, correct, difficulty, questionId, timestamp); a repeat grade shows NO duplicate (PR-B idempotency, now actually exercised); `learnerProfiles/{uid}/mistakeLogs` still writes (regression clean). PR-B is now genuinely live.

### 🆕 NEW FOLLOW-UP
- **[FU-PROGRESS-SURFACE-BREAKDOWN]** — an attempt does not record WHICH surface it came from (Quick Practice vs Worksheet vs Check & Improve vs Chapter Test). Surface is a **different axis** from `AttemptMode` (`graded`/`mcq`/`self-assess`). **DEFER** surface tagging until step 3/4 (the Universal Scorecard / Progress work) proves it actually needs which-surface an attempt originated from — owner ruling required before adding a field to the attempt shape.

### 🔁 STILL OPEN (separate, logged — not addressed by #322)
- **[FU-XUSERID-PROXY-STRIP]** — ~~the Vercel→Railway proxy drops the `X-User-ID` header~~ **SUPERSEDED by #331** (auth fixed via Bearer token) → the live blocker is now **[FU-BACKEND-DATABASE-URL-UNSET]** (503, `DATABASE_URL` unset; Progress-Journey arc supersedes). See the 2026-07-05 section above.
- **[FU-MULTIQ-CI-GRADE-THROW]** — **CLOSED by #331 (Bug 2).** `multiQuestionToCsr` throwing client-side no longer wipes the grade (recording decoupled into its own try/catch). See 2026-07-05 above.
- **[FU-MCQ-ATTEMPTS-NOT-RECORDED]** — un-annotated MCQs have `correctIdx < 0`, so the click never reaches `recordAttempt` → no score recorded. Needs `correctOption` bank annotation (ties to [FU-MCQ-CORRECTOPTION-VERIFY] / [FU-MCQ-ANSWER-OPTION-FIELD]).
- **[FU-GRADING-RELIABILITY]** — **CLOSED by #331 (Bug 3).** The cross-run partial-credit variance (same solution 0.5 vs 1.5) is fixed by the owner-approved ERROR-CARRIED-FORWARD MARKING clause on Rule 4 in both grader functions; owner live-verified (cascading quadratic → consistent 2/3). See 2026-07-05 above.

---

## 2026-06-30 — MCQ `correctOption` — deterministic worksheet MCQ scoring (code side) MERGED (#319, `a71c81e`)

### ✅ RESOLVED / DELIVERED
- **[FU-MCQ-ANSWER-OPTION-FIELD] code side DONE** — the additive pipeline that lets the worksheet grader do a DETERMINISTIC normalised string compare of the student's picked MCQ option against a bank-supplied correct option. 3 product files + 1 test: `aiClient.ts` (`correctOption?: string` on `WorksheetGradeQuestionInput`), `worksheetGradeService.ts` (carry it client→server), `checkSolution.cjs` (server mapper + the deterministic compare in `normaliseStructuredResult`, gated on `isObjectiveType` AND `correctOption` present; full marks on hit, 0 + full deduction on miss; `couldNotRead`/empty-`studentWork` untouched; existing honesty reconcile unchanged after). **Ships LATENT** — no bank entries carry `correctOption` yet, so the absent-field path is byte-unchanged. Test now 13 (h/i/j added). Gates GREEN; CI GREEN; Codespace vitest 13/13; cofounder byte-reviewed; owner-instructed squash-merge.

### 🆕 NEW FOLLOW-UP
- **[FU-MCQ-CORRECTOPTION-VERIFY]** — the DEFERRED live-verify for #319 (no quick live test exists today because the code ships latent — no bank entries carry `correctOption` yet). **GATE:** when the first batch of MCQ bank entries is annotated with `correctOption`, run a worksheet containing those MCQs **3 times** and confirm the score is **IDENTICAL across all three runs** AND that **a correct pick actually scores correct** (full marks) and a wrong pick scores 0 — determinism alone is not enough; the deterministic compare must also be RIGHT. This gates the content-annotation task (annotating MCQ bank entries with their canonical option letter) — do NOT treat the annotation work as "done" until BOTH the 3×-identical check and the correct-pick-scores-correct check pass on real annotated MCQs.

---

## 2026-06-30 — Multi-question Check & Improve detect COMPLETE (#315 `91b5f83` + #316 `fdadd41` + #317 `cd5c8ca`) MERGED & LIVE-VERIFIED

### ✅ RESOLVED / DELIVERED
- **[FU-MULTI-QUESTION-DETECT] CLOSED** — multi-question Check & Improve detect is complete end-to-end across three PRs: **#315** (detect ALL questions via additive `questions[]` from `handleDetectQuestion`; whole-paper grade through the existing `/grade-worksheet`; CI nomenclature `CI-{S}-{TOPIC}-{NN}`; MI parity via `recordMistake`+`recordAttempt`; single-question path byte-identical), **#316** (prompt fix so detect returns ALL questions, not just Q1 — multi-item ellipsis schema + recency + `maxOutputTokens` 4096), **#317** (per-question marks chip). **Owner live-verified on Vercel + mobile** with the Light-Reflection-Refraction PDF ("5 questions detected · Science · Light - Reflection & Refraction" → "Q1 · 1 mark  Q2 · 2 marks  Q3 · 3 marks  Q4 · 5 marks  Q5 · 5 marks" → "Upload your answer sheet below to grade all 5"). NOTE: the original ask named a "frontend selection UI (pick which detected question to grade)" — shipped instead as **grade-the-whole-paper** (one upload grades all detected questions), which proved the better UX.

### 🔁 STILL OPEN
- **[FU-GRADE-ANY-WORKSHEET]** — REMAINS OPEN. Grading **non-system-generated** papers (a student's own / school worksheets) is now UNBLOCKED by the multi-question work (the whole-paper grader already accepts an arbitrary DETECTED question set — no pre-known scheme required), but a dedicated "grade any worksheet" surface/flow is still a future feature, not yet built.

---

## 2026-06-29 — thinkingBudget detect fix (#310 `7276d31`) + grader eval harness (#311 `2bc545c`) MERGED & LIVE-VERIFIED

### ✅ RESOLVED / DELIVERED
- **thinkingBudget detect fix (#310 `7276d31`)** — `geminiClient.cjs` forwards an optional `thinkingConfig` into `generationConfig` in BOTH `callGemini` and `callGeminiStream` (byte-identical body when absent), and `handleDetectQuestion` sets `thinkingConfig: { thinkingBudget: 0 }` (gemini-2.5-flash thinking tokens were eating the 400-token detect cap → truncated JSON → "couldn't read the question"). 3 files; Codespace vitest 5/5; cofounder byte-reviewed; **owner dual live-verified** (Q1.png reads; worksheet grading + tutor regression clean).
- **[FU-GRADE-EVAL-SCRIPT] DELIVERED** — #311 (cofounder PR `2bc545c`) landed a standalone worksheet-grader eval harness (PR-A) so future prompt-only grader PRs verify against FIXED synthetic inputs without the owner generating new worksheets.

### 🆕 NEW FOLLOW-UPS
- **[FU-MISCOPY-CLASSIFICATION]** — the grader misclassifies a **miscopied question** (student copies the question wrong, then solves their wrong version) as a **concept gap**. It should be scored **0 marks + `silly`** (a careless transcription slip), NOT conceptual (no knowledge gap is implied). Fix direction: prompt-only, BOTH grading functions, added as `handleCheckSolution` **rule 15** / `gradeStructuredSet` **rule 9** (keep the two prompts in sync). **This is the immediate-next prompt-only PR** (branch fresh off `2bc545c`), ahead of the MCQ `correctOption` code side and PR-B.
- **[FU-GRADE-ANY-WORKSHEET]** — students need to grade **non-system-generated** papers (their own / school worksheets), not just LazyTopper-generated worksheets with a known scheme. Depends on [FU-MULTI-QUESTION-DETECT] (the grader currently keys off the KNOWN question set; an arbitrary paper has none). Larger effort — backend + UX; sequenced after the multi-question detect work.

---

## 2026-06-29 — Grading-reliability prompt+config hardening MERGED & LIVE-VERIFIED (#307 `195ecf7` + #308 `54c959e`)

### ✅ RESOLVED / DELIVERED
- **Grading-reliability hardening (#307 `195ecf7` + #308 `54c959e` → trunk `54c959e`)** — two additive PROMPT-ONLY PRs to the shared grader `lazytopper/server/routes/checkSolution.cjs`, applied to BOTH grading paths (`handleCheckSolution` + `gradeStructuredSet`), no logic change. #307: temperature 0.15→0.05 on both grading calls; legible-non-attempt exception ("Don't know"/"DK" → incorrect/full-deduction/`mistakeType null`, never `couldNotRead`; verbatim on `gradeStructuredSet` rule 6, adapted note on `handleCheckSolution` rule 6 which has no `couldNotRead` field); word-problem closure rule (≤½ mark if root-in-context omitted). #308: crossed-out = NO-ATTEMPT (`gradeStructuredSet` rule 6 only); PARTIAL-CREDIT-by-step-weight (both prompts). Tests in `checkSolutionGradingReliability.test.ts` (a–i; Codespace vitest 28/28 with existing guards, no regression). Cofounder byte-reviewed; **owner live-verified — "Don't know" → 0 every run (never couldNotRead), crossed-out handled, scores stable** (runs 2&3 identical; run 1 ±0.5 on a genuine borderline partial-credit case).
- **[FU-GRADING-RELIABILITY] CLOSED** — temperature OCR-cascade variance fixed (0.05) and the inconsistent `couldNotRead` on legible "Don't know" responses fixed (the non-attempt exception). Done by #307.
- **[FU-WORKSHEET-NONATTEMPT-TEXT] CLOSED** — a legible non-attempt phrase ("Don't know") and a clearly crossed-out answer are now graded as explicit non-attempts (incorrect / full marks deducted / `mistakeType null`), never silently mis-typed or flagged unreadable. Done by #307 (Don't-know) + #308 (crossed-out).

### 🆕 NEW FOLLOW-UP
- **[FU-GRADE-EVAL-SCRIPT]** — build a Codespace-runnable Node eval script that calls the LIVE grader (`/api/check-solution` and/or `/api/grade-worksheet`) with a FIXED set of synthetic inputs (known answers + expected score bands, incl. the "Don't know" / crossed-out / partial-credit cases) and asserts the outputs, so future prompt-only grader PRs can be **agent-verified without the owner having to generate and hand-grade new worksheets each time**. Motivation: #307/#308 each needed an owner 3-run live-verify; a deterministic eval harness would let the agent self-verify prompt changes pre-merge (the static gates can't exercise the live model). Likely lives under `lazytopper/scripts/ops/` or a `notes/`-style eval dir; reads a key from the Codespace env; NOT wired into CI (it makes live model calls).

---

## 2026-06-29 — Worksheet MCQ DETERMINISTIC honesty MERGED (#305, `93f1594`) — owner live-verified

### ✅ RESOLVED / DELIVERED
- **Worksheet MCQ deterministic honesty (#305, `93f1594`)** — closed the MCQ residual #302 documented. Carried `section` client→server (`worksheetGradeService.ts` mapper + additive `section?` on `WorksheetGradeQuestionInput` in `ai/aiClient.ts`; server `handleGradeWorksheet` keeps `section`/`format`/`qType`) and extended `normaliseStructuredResult`'s no-working pass: an `incorrect` step on an OBJECTIVE question (`isObjectiveType(qType||format, section)` — REUSED from `serverUtils.cjs` via a direct acyclic require, NOT forked) is nulled REGARDLESS of `studentWork` and tallied into `noWorkingNulled` (so `rawAdjusted` zeroes leaked MCQ buckets). Marks/status/totals/attempt untouched; `handleCheckSolution` byte-identical. 4 files +112/−10; Codespace vitest 10/10; **owner live-verified — all-zero mistake buckets EVERY run (the ~40% intermittency is gone)**. **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED.**

### 🆕 NEW FOLLOW-UPS (from live testing; NOT blockers — do NOT gate PR-B)
- **[FU-MCQ-ANSWER-OPTION-FIELD]** — MCQ **scoring** (correct/incorrect) is still non-deterministic because the bank's `finalAnswer` stores the answer **text**, not the option **letter**, so the grader cannot do a deterministic string comparison of the student's picked option against the key. #305 fixed the **honesty** path (a wrong MCQ never fabricates a mistake type); it does NOT make the **score** deterministic. Fix direction: give MCQ questions a canonical option-letter answer field (or derive the letter from `options` + `finalAnswer`) so the grader can compare the picked letter exactly. Touches the bank/data shape → its own scoped PR (likely a `src/data` lane — gated).
- **[FU-GRADING-RELIABILITY]** — grader temperature `0.15` causes OCR-cascade variance on borderline partial-credit answers, and `couldNotRead` fires inconsistently on legible "Don't know" / explicit non-attempt responses (related to [FU-WORKSHEET-NONATTEMPT-TEXT]). Fix direction: lower/zero the temperature for grading, harden the detect/`couldNotRead` path, and consider a `thinkingBudget` so borderline reads are stable run-to-run. **This is the immediate next product PR (the grading-reliability PR), ahead of the detect/thinkingBudget fix and PR-B.**

---

## 2026-06-28 — Worksheet no-working honesty ported → D-PROG-2 / step 1 CLOSED MERGED (#302, `c5e148d`) — owner dual live-verified

### ✅ RESOLVED / DELIVERED
- **Worksheet no-working honesty (#302, `c5e148d`)** — ported #301's fix from `handleCheckSolution` into the SEPARATE worksheet grader `gradeStructuredSet` → `normaliseStructuredResult` (worksheet prompt rule 5 + `noWorkingNulled` guard + `rawAdjusted` reconcile; `handleCheckSolution` byte-identical). Deterministic empty/whitespace/absent no-working → null + 0 buckets + marks preserved; rawSummary leak → 0; worked-wrong keeps type+marks. Codespace vitest 7/7; owner dual live-verified (Maths Mixed Worksheet 16). **Closes step 1 for its designed (subjective no-working) scope.**

### 🔭 NEW FOLLOW-UPS (tracked; none are regressions)
- **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] — the one tracked deterministic gap; MUST land before PR-B.** A wrong MCQ's `studentWork` is the bare option letter "(d)" (NON-EMPTY), so the empty-working guard can't fire; MCQ honesty rides on prompt rule 5 and is **non-deterministic live (~40%: 5 runs = 2 null / 3 conceptual)**. STEP-0 ground truth: the clean objective signal (`section`/`options`, "empty/undefined for subjective") exists on `PredictedQuestion`/`PersistedWorksheetQuestion` but is dropped before the grader — client `worksheetGradeService.ts:90-98` forwards only 7 fields, server `checkSolution.cjs:826-836` keeps only `marks`; `marks===1` correlates (blueprint A=1mk MCQ/AR) but is a fragile heuristic, NOT used. **Fix (decided, option 1):** forward `section`/`format` client→server (frontend + server) then apply the existing `isObjectiveType(qType, section)` helper in `serverUtils.cjs` (no forked classifier) in `normaliseStructuredResult` — "incorrect objective step → mistakeType null, regardless of studentWork." Cofounder-gated; own PR off `c5e148d` with its own STEP 0.
- **[FU-WORKSHEET-NONATTEMPT-TEXT]** — explicit "don't know" / non-attempt prose is non-empty, so the deterministic guard doesn't fire, and the model tags it "Concept gap" though it's semantically identical to no-working (undiagnosable). Separate small fix; scope TBD (detect explicit non-attempt phrases → treat as undiagnosable).
- **[FU-WORKSHEET-BANK-ANSWER-POLLUTION]** — ~26 files / ~54 strings of marking-scheme junk in model answers may skew grading. Separate content lane.

---

## 2026-06-25 — Z3 figure-binding golden slice MERGED (#297, `449d686`) — owner live-verified

### ✅ RESOLVED / DELIVERED
- **Z3 figure-binding (#297, `449d686`)** — bound every Z3 source figure (113 rasters → 93 Qs) to its question and render it in the question body as `<img>`, plus the step-mark pill fix. **[FU-Z3-FIGURE-BIND] CLOSED.** Built the contained raster `<img>` path the brief wrongly assumed already existed (`VisualExplainer` is HTML-only; `public/visuals` had zero rasters): `visualConceptRegistry.ts` (+`questionId`/`MATHS_FIGURE_VISUALS`/`getFiguresForQuestion`, exact id-keyed, kept out of the heuristic pool), `QuestionVisualAid.tsx` (+`questionId` → `<img>`, priority over synthetic SVG), `PracticeQuestionCard.tsx` (passes `questionId` + `parseLeadingMarkTag` step-mark fix), `competency.z3.ts` (93 rows +`visualExplainerId`+`requiresDiagram`; still 102 rows / 6,643 served, no drift), 113 `public/visuals/maths/**` assets. `predictionTypes.ts`/`canonicalQuestionBank` untouched. All 113 eye-confirmed (no mismatches). Gates GREEN + CI quality-gate GREEN (incl. vitest floor test); cofounder byte-level clean; owner live-verified + merged; no self-merge.

### 🆕 NEW FOLLOW-UPS
- **[FU-Z3-EMF-SVG]** — 8 Z3 Real-Numbers questions (`Z3-RN-001/002/005/006/007/008/009/010`) had EMF-only source figures (vector equation objects, unrasterizable) → no WebP to bind; `requiresDiagram` left honest (false). Candidates for AUTHORED SVGs later (never fabricate/substitute a lookalike). The figure-binding pattern + EMF limitation are documented in `handoff/PATTERN_extraction_figure_binding.md`.

### 🔭 NEXT
- Figure binding now scales to the worksheet-folder extractions via the documented pattern. A few bound figures are weak/generic scene-setters (esp. `Z3-PLE-002` "Production Planning" banner, `Z3-PR-003` generic interior) — bound per the owner's "every source figure" policy; worth a glance but not errors.

---

## 2026-06-24 — Worksheet PR-A: grade-results redesign (presentation only) MERGED (#295, `1a85186`) — ⚠ owner live-verify PENDING

### ✅ RESOLVED / DELIVERED
- **Worksheet PR-A (#295, `1a85186`)** — the worksheet grade UI rebuilt to the LOCKED redesign spec, **PRESENTATION ONLY** (grader `checkSolution.cjs` BYTE-UNCHANGED / absent from the diff). Auto scorecard popup (`WorksheetScorecard.tsx`, desktop modal ↔ mobile bottom sheet, four-type breakdown from `mistakeSummary`, all-pending disable) + tap-to-reveal sheet + branded graded PDF (`WorksheetGradedPrintDoc.tsx` + `exportGradedWorksheetPdf` via the shared `renderElementToPdf` refactor — `exportWorksheetPdf` behaviour-identical, no second grade call) + summary-leak fix (`isLeakySummary`, display-only) + `WS-{S}-{TOPIC}-{NN}` nomenclature (device-local count). 6 files +1003/−20; gates GREEN + CI quality-gate GREEN; no forbidden files; cofounder-reviewed clean; owner-merged, no self-merge.

### ⚠ STILL OPEN — mandatory owner live-verify (the worksheet UI redesign isn't "done" until this passes)
- **[PR-A-LIVE-VERIFY]** — the UI/PDF round-trip is unverifiable by static gates. On a real device + the stable URL: scorecard auto-pops after grading (desktop centered modal + mobile bottom sheet); four-type breakdown correct (Knowledge gaps vs Careless); ✕/Read/Download all close it; Read reveals the tap-to-reveal per-section sheet; Download → a branded PDF whose marks + pending match the screen exactly (snapshot, no re-grade); the all-pending case disables both buttons; name + code (`WS-…`) show on the scorecard, the sheet, and the PDF; **Check & Improve still grades (grader non-regression)**. Note: E2b's own `[E2b-LIVE-VERIFY]` is also still open — both worksheet round-trips await one owner pass.

### 🔭 NEXT (worksheet track)
- Owner live-verify of #295 → **PR-B**: the durable per-student worksheet record (Firestore-by-UID — nomenclature made durable + cross-device, the seen-set question-uniqueness that excludes already-served questions, the Me/Progress journey, scorecard persistence, and the parent/teacher storage foundation with §B6 **wellbeing-framing-not-surveillance** + **minor-data consent/transparency** constraints baked in). Then the parent/teacher VIEW (a later, deliberate feature). Carried: [FU-ASYNC-GRADING], [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].
---

## 2026-06-24 — Worksheet PR-E2b: one-PDF AI grade loop + MI wiring MERGED (#291, `60c5bf9`) — ⚠ owner live-verify PENDING

### ✅ RESOLVED / DELIVERED
- **Worksheet PR-E2b (#291, `60c5bf9`)** — the AI grade loop. Additive `gradeStructuredSet` core + `handleGradeWorksheet` in `checkSolution.cjs` (**existing Check & Improve grader byte-unchanged → zero regression**), `POST /api/grade-worksheet`; client `gradeWorksheet()` + `worksheetGradeService` (map-by-number, persist, single `recordMistake` + score-twin `recordAttempt` front door, stable `ws:<id>:q<N>` idempotency) + `WorksheetGradePanel` (honest "graded X/Y + N pending" totals). Honest-failure `couldNotRead` (never fabricate a mark, never zero an unreadable answer); trusted per-question marks; grade core surface-agnostic (Chapter Test / Full Mock reuse). 9 files +1201/−10; rebased post-Z3 ZERO conflicts; gates GREEN + CI quality-gate GREEN; no forbidden files; cofounder review clean; owner merged, no self-merge.

### ⚠ STILL OPEN — mandatory owner live-verify (the worksheet is not "done" until this passes)
- **[E2b-LIVE-VERIFY]** — the AI round-trip is unverifiable by static gates. On the Firebase-authorized trunk URL (NOT an unauthorized preview — auth fails there), START SMALL (5-Q): generate → solve a few by hand → scan to ONE PDF → upload → (1) each answer maps to the RIGHT question + sensible marks + correct solution shown; (2) an illegible page → honest "couldn't read Qn" + total reads "graded X/Y + N pending" (NOT a deflated/fabricated mark); (3) result feeds Me/Progress AND unlocks the MI-enrich toggle for that topic; (4) careless (silly/presentation) → careless insight NOT a weakness, knowledge-gap (conceptual/calculation) → weak-area for the right topic; (5) **Check & Improve still grades + feeds MI (shared-grader non-regression)**; (6) re-upload the same worksheet → MI does NOT double-count; (7) phone end-to-end. Owner-driven; backend auto-redeployed on merge.

### 🆕 NEW FOLLOW-UPS
- **[FU-ASYNC-GRADING]** — the whole worksheet is graded SYNCHRONOUSLY in ONE structured call (design decision (c): sync now, async deferred; premature at 5-Q test-group scale). A large worksheet (e.g. 25 Q) may push grade time up or truncate the single response (`maxOutputTokens` 32000 + one parse-retry). Revisit async/notify infra only if large-worksheet grade times prove painful.

### 🔭 NEXT (worksheet track)
- Owner live-verify of #291 → worksheet (E2a+E2b) COMPLETE → Topic Hub queue resumes at **PR-F** (Notes + Examiner's-tips content) → PR-G (deletions: dead old-mobile + retired MockBuilder/TutorDrawerV2/MentorPanel + un-routed worksheet twins). Carried: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].
---

## 2026-06-23 — Z3 Competency extraction MERGED (#292, `b1d3e46`) — bank-extraction PILOT

### ✅ RESOLVED / DELIVERED
- **Z3 Competency extraction (#292, `b1d3e46`)** — 102 net-new AUTHENTIC competency/case-based Maths questions in NEW `questionBanks/class10/maths/competency.z3.ts`, wired by ONE import + ONE spread. THE DECOUPLE (verbatim questions + AI step-marked solutions, pending verify; all marks inferred). Source 117 → 102 (15 dropped: 10 Polynomials out-of-syllabus, 1 complementary-trig, 3 solid-conversion; HCF rewritten to prime factorization). Authentic tier (`.z3`, absent from `AI_GENERATED_PACK_SOURCES`, "others" bucket). Silent-zero floor test added. Fix pass `0e8b1f4`: integer mark-schemes + audit notes moved to `//` comments + disputed/authored rows flagged-but-served. Gates GREEN + CI GREEN; owner-merged, no self-merge. **The pilot is proven → scales to the worksheet folders.**

### 🆕 NEW FOLLOW-UPS
- **[FU-Z3-TEACHER-VERIFY]** — the 7 explicitly-flagged rows + EVERY inferred mark + EVERY AI-authored solution need a teacher/examiner pass before treated as exam-certain. **4 `// PENDING OWNER VERIFICATION`** (source key wrong/blank): `QE-003` (function↔key cross-contaminated; only (iii)=175 verified), `ARC-004` (2954 by border method vs key's 2912), `TG-104` (200 m text vs 150 m datum implied by the answers), `SAV-005` (bore-volume inconsistency: r=7/L=450 ⇒ 69300 m³ vs key 6900; (iii)/(iv) coated-area parts are correct). **3 `// AUTHORED (Z4 blank)`:** `PLE-009` (alloy), `CG-007` (seating grid from figure), `SAV-006` (Earth sphere). Settled overrides already shipped clean: `TR-009` → 16 m, `PR-004` → 98.7%. All 7 are SERVED (not withheld) so they surface for review; resolve final values in a later tidy pass.
- **[FU-Z3-FIGURE-BIND]** — 28 rows carry `requiresDiagram:true` + a precise `diagramDescription`; 119 figures are staged to WebP (by question id + by source index) with a `figure_question_map.csv` under `Desktop\Content\extraction\z3-figures\`. Binding them to a renderer is a separate later step (no new asset-path field was added to `CanonicalQuestion` — staging + `diagramDescription` is the seam).
- **[FU-Z3-SOLUTION-IDS]** — OPTIONAL: Z3's AI-authored solutions were NOT registered in `AI_GENERATED_SOLUTION_IDS` (task scoped the PR to one import + one spread). If an "AI solution" badge is wanted (mirroring the `*.exemplar2` DECOUPLE), register the ids in a small follow-up.

### 🔭 NEXT (this track)
- **Scale the pipeline to the worksheet folders** — same recipe (extract → syllabus-filter at the question level → schema → bank → gates → STOP for owner verify), folder by folder, each its own gated PR. Owner-authorized separately.

---

## 2026-06-22 — Note-spec validator gate MERGED (#289, `c525b2a`) — notes track, gated step 1

### ✅ RESOLVED / DELIVERED
- **Note-spec validator gate (#289, `c525b2a`)** — `notes/validate_spec.py`, the 9-rule anti-fabrication gate that makes the ~35-note fan-out safe. stdlib only, NO bypass flag; reads `SURFACE_BANNED_PHRASES` from `syllabusGuard.ts` (trap-safe prose list, `//`-comments stripped) + slugs from `topics.ts` live, never hardcoded. Committed alongside the schema v1.1 contract + the validated Light reference spec + 5 negative fixtures + a self-test. Light VALID; negatives each trip exactly one rule. **PR-F is now UNBLOCKED.**

### 🔭 NEXT (notes track — gated step 2)
- **Content PR under `notes/`:** evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift. THEN in parallel PR-F (`<Note>` component + wiring) AND Step-2 spec authoring (4 prototype enrichments → ~35 notes), validator-gated. Later: wire `validate_spec.py --json` as a `SubagentStop` hook.

---

## 2026-07-03 — Notes track: `<Note>` render (#324) + quadratic spec (#325) MERGED; Light completion DRAFT (#326)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTE-PDF-EXPORT] — CLOSED (#329).** Download-PDF (`window.print()` + `@media print`) shipped in the React `<Note>`: button by the tabs, all three tab panels rendered for print, note isolated from app chrome via the `visibility` trick (DesktopShell/App are forbidden, so the note isolates itself). Owner live-verify of print output pending — if app chrome shows or content clips, log **[FU-NOTE-PDF-PRINT-CHROME]** (small follow-up).
- **[FU-NOTE-GENERATED-FIG] — CLOSED (#329).** A generator registry keyed by `figure.generator` (`NoteGeneratedFigure.tsx`) now DRAWS `bucket:"generated"` figures: the Quadratic discriminant triptych (`parabola_triptych`, ported from the prototype's `plotStatic`) renders instead of the placeholder. `bucket:"ncert"` placeholder unchanged.
- **[FU-NOTES-LIGHT-COMPLETE] — CLOSED (#326 spec + #329 render).** The Light spec figures (base64 PNG→WebP) + mindmap (D3→spec) were lifted from the approved prototype in #326; #329 completed the in-app render (figures show, visual mindmap, PDF) — Light now renders every tab with no placeholder.

### ✅ DELIVERED
- **#324 (`9c7fa81`)** — PR-F `<Note spec={…}/>` renders note-specs in Topic Hub via `import.meta.glob`; honest empty state for spec-less topics. Owner-merged, no self-merge.
- **#325 (`52dd77b`)** — `notes/specs/quadratic-equations.json` (NCERT-verbatim, VALID 9/9, 6 examples, real mindmap, generated figure). Owner-merged, no self-merge.

---

## 2026-06-22 — Notes-generation track Step-1 MERGED (#282, `de2a616`) — parallel content track

### ✅ RESOLVED / DELIVERED
- **Notes track Step-1 (#282, `de2a616`)** — the locked note kit + 5 v2 prototypes + the **Light enriched exemplar** (the finished reference standard), generated from the official NCERT 2026-27 PDFs in the locked note grammar with verbatim-definition discipline. **14 files, ALL under `notes/`; content-generation ONLY (no app wiring).** Merged 2026-06-21 13:42Z (the FIRST of the recent cluster; a parallel track not covered by the worksheet docs #285 / symbol docs #287). Gates GREEN + CI GREEN; owner-merged, no self-merge. Full track handoff: **`handoff/NOTES_TRACK_HANDOFF.md`**.

### ✅ DECISION — notes integration (settled, owner-approved)
- **[FU-NOTES-INTEGRATION] — RESOLVED.** Notes ship as a shared React **`<Note spec={…}/>`** component fed by a structured **note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — **NOT standalone HTML**. The tutor and PR-F both consume the spec as data, and **Step 2 authors specs (JSON), not HTML**. The note-spec schema (v1.1) + the `<Note>` contract are the foundation; the gated build order below makes the ~35-note fan-out safe to parallelize. (The Step-1 prototypes are standalone HTML — they become the seed for the Light reference spec.)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTES-MATHS-MAP]** — the Maths NCERT folder (`…\NCERT Books\Mathematics class 10\`) is not yet content-mapped/unzipped; do that when the track reaches the Maths notes (Quadratic Equations etc.). Map files by CONTENT, never filename.
- **`topics.ts` trig-key collapse** — `topics.ts` collapses intro-trig + applications-of-trig into ONE `trigonometry` topic key (the repo wins over the brief's two trig keys); a note's `topic_key` must match `topics.ts`.
- **`magnetic-effects` = generate-TRIMMED** — when the track reaches it: include magnetic field / field lines / field-due-to-conductor·solenoid / right-hand-rule / force-on-a-conductor; EXCLUDE Motor / EMI / Generator (formative). Re-read `syllabusGuard.ts` for the exact retained sub-topics first.

### 🔭 NEXT (notes track — gated order, owner-authorized separately, do NOT reorder)
1. **`notes/validate_spec.py`** — source-required validator to note-spec schema v1.1 (rejects unsourced verbatim/example/figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count).
2. **Content PR (under `notes/`)** — validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift.
3. **Then in parallel** — **PR-F** (`<Note>` component + Topic Hub wiring; reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated. **Do NOT start Step-2 or PR-F before the validator + content PR land.**

---

## 2026-06-22 — Post-PR #286 (PYQ symbol-integrity pass; trunk `b600e2b`)

### ✅ RESOLVED / DELIVERED
- **PYQ √-data audit (from #284) RESOLVED** — audited all 103 PYQ packs / 759 questions. Recoverable set FIXED (12 √/operator recoveries in real-numbers/quadratics/polynomials `questionText`, each answer-/twin-verified); §7 normalized °/π/√ in 5 areas Qs. Unrecoverables WITHHELD + queued for owner real-paper lookup. Built in an isolated worktree; owner squash-merged #286 (`b600e2b`); no self-merge.
- **38 unservable questions WITHHELD** via a single source-level `WITHHELD_QUESTION_IDS` filter on `canonicalQuestionBank` (17 Science bilingual bleed + 21 Maths blank/garbled/answer-mismatch/mojibake). Honest omission > broken question. RAW 6579 → LIVE 6541 (delta == 38, evidence in the report). ⚠️ Takes effect on MERGE + REDEPLOY.

### 🆕 NEW FOLLOW-UPS
- **[FU-PYQ-OWNER-LOOKUP] (HIGH; owner action)** — 14 unrecoverable Maths expressions (blank / garbled / answer-contradicts-its-own-answer, incl. the most-dangerous `PYQ-M-2024-REALNUM-004` whose body contradicts its `(2−√3)/5` answer). Currently WITHHELD. Owner supplies correct text from the real papers (batched by CBSE paper code in `diff/PYQ_batch_for_owner_lookup_2026-06-21.md`); 2nd-pass patch un-withholds each. RULE: recover, never fabricate.
- **[FU-PYQ-REEXTRACT-SCIENCE] (MED)** — re-extract the 2025/26 bilingual Science papers (the 17 withheld Science Qs); their body is bilingual/CID gibberish, not a symbol drop. A pipeline fix (English-medium PDFs / drop the Hindi column) prevents recurrence. `diff/PYQ_REEXTRACTION_followup_2026-06-21.md`.
- **[FU-PYQ-ANSWER-FIELD-SYMBOLS] (MED)** — this pass fixed `questionText` ONLY; the `answer`/`solutionSteps` fields still carry dropped √ (e.g. RN-003/005/008 answers read "2 + 3", "6 – 7"), so revealed solutions are still corrupted. Separate answer-field symbol-integrity pass.
- **[FU-PYQ-CORRUPTION-DETECTOR] (MED)** — a sturdier corruption detector: mojibake-by-subset-font across BOTH subjects (the Devanagari-codepoint detector is blind to mangled-to-ASCII Hindi; the new `mojibake_scan.py` covers it) + an answer-consistency check. NB `mismatch_scan.py`'s `√\s*\w` regex captures only one char after the radical (`√15`→`√1`), so multi-digit surds are under-read — "only REALNUM-2024-004 is a true text-answer mismatch" is a SCREEN, not a guarantee (no full numeric re-solve done).
- **[FU-PYQ-ANGLE-NORMALIZE] (LOW)** — `Ð`→`∠` mojibake is bank-wide in geometry Qs (readable, so kept/served), plus the remaining °/π/superscript normalization (e.g. ARC-2026-001's garbled Reason formula, `cm²`/`x²`). Bank-wide normalization sub-batches, verify-against-answer discipline.

### 🔭 NEXT
- Worksheet track NEXT unchanged: **PR-E2b** (the AI grade loop). PYQ track is owner-driven from here ([FU-PYQ-OWNER-LOOKUP] → 2nd-pass patch + un-withhold).

---

## 2026-06-21 — Post-PR #280/#283/#284 (Worksheet rebuild E2a → E2a.3; trunk `cfff277`)

### ✅ RESOLVED / DELIVERED
- **Worksheet FOUNDATION (E2a → E2a.3)** — ONE responsive generator + distribution (even/weightage/MI, honest counts) + deleted-topics filter + real-math Option-B PDF file download + persist-by-`worksheetId` + view-aware Back + MI-enrich as a navy preview anchor with honest signed-out/locked states. Full detail: **`handoff/WORKSHEET_TRACK_HANDOFF.md`**. #281 closed (superseded by #283).

### 🆕 NEW FOLLOW-UPS
- **PYQ √-data audit (HIGH; separate symbol-fix agent, all subjects)** — `real-numbers.pyq*.ts` (and ~31 lines across maths `*pyq*.ts`) shipped questions with `√`/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` are fine). SOURCE-DATA gap — flagged, NOT fixed (`src/data` gated). Full id/year/CBSE-paper-ref list + recoverable-vs-unrecoverable split: `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`. RULE: recover from twin/source, never invent, flag unrecoverables.
- **[FU-PITFALL-DATA]** — answer-key "⚠ where students lose marks" annotations omitted (no real per-question pitfall data). Add when real data exists.
- **[FU-WORKSHEET-PDF-SERVERSIDE]** — the PDF math is a raster image (not selectable text); acceptable for print. A server-side text PDF is a future upgrade if client quality proves insufficient.

### 🔭 NEXT (worksheet track)
- **PR-E2b (NEXT)** — the AI grade loop: extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN (via `getWorksheetSession`); wire `recordMistake` through the MI front door so graded worksheets feed Me/Progress + unlock the MI-enrich toggle; **mandatory 5-Q live-verify** (AI round-trip). Then PR-F (content), PR-G (delete dead twins + retired set).

---

## 2026-06-20 — Post-PR #276 (Topic Hub PR-E1 practise-filter + chapter-test wiring + MockBuilder un-route; trunk `1de6f3e`)

### ✅ RESOLVED / DELIVERED
- **PR-E1 (#276, `1de6f3e`)** — the PR-E wiring stage, built in an isolated worktree, landed as 3 commits (one impl + two owner-found round-trips). Concept-row "Practise" → Quick Practice DIRECT (`buildDesktopConceptPracticePath`); **EXACT mark-band filter (Option A)** — `marksMin`/`marksMax` + `Number(q.marks) ∈ [min,max]` after the owner found the page's `"23"` bucket fuses 2-and-3-mark (lossy `markBandToBuckets` removed); **single-pool count fix** (`selectInRangeFromPool` — hint + display read the same pool, thin-bank honest); **PATH-CONDITIONAL** (range only on the concept-row entry; hub stays "All"); back-nav to the specific topic; concept-row-only applied-filter indicator; Chapter-test button WIRED; MockBuilder UN-ROUTED. Owner LIVE-VERIFIED PASS; no self-merge.
- **✅ [FU-PRACTISE-CONCEPT-FILTER] CLOSED** — both original breaks fixed (wrong route target + unconsumed band), and the two owner-found follow-on bugs (bucket fusion + count divergence) resolved. The concept-row Practise band now filters exactly and the hub path is unaffected.
- **✅ MockBuilder retirement EXECUTED** — the DECISION_LOG 2026-06-20 decision is now live: both `/mock-builder` routes redirect to `/practice-hub`, tagged `PR-G-deletion-pending` (code kept for PR-G).

### 🆕 NEW FOLLOW-UP
- **[FU-CHAPTERTEST-PAGE-REDESIGN]** — the Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) is old-design. PR-E1 wired the Topic Hub "Chapter test" button to it (routing works, real gen→score→persist), but the page itself was deliberately NOT redesigned in PR-E1 (out of scope). Backlogged for a later Pages-to-Redesign pass.

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-E2 (NEXT)** — Worksheet (wire the inert "Worksheet" band button; its own locked spec) · **PR-F** — content fill (Examiner's tips + Notes) · **PR-G** — delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set. Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]**, **[FU-CHAPTERTEST-PAGE-REDESIGN]**.

---

## 2026-06-20 — Post-PR #274 (Topic Hub PR-D final-IA LAYOUT; trunk `b57fa79`)

### ✅ RESOLVED / DELIVERED
- **PR-D final-IA layout (#274, `b57fa79`)** — `ConceptSpine` rebuilt to MATCH the binding mockup: learn-first concepts hero; receded dashed action band (3 buttons); unified **Notes** toggle (replaces Formula/Proofs/Practice-all tabs); clickable **Examiner's tips** container (1 real seed tip, no fabrication); concept "Practise" carries concept + `markBand`; per-row `✦ Visual` badge (honest, only where `findVisualForConcept` non-null); MI stays sidebar chrome. One responsive component, pure-CSS reflow, class-driven. Owner LIVE-VERIFIED GOOD; isolated worktree; no self-merge; branch+worktree cleaned up.
- **PR-C deferrals delivered in PR-D:** per-row visual badge ✅. (Mobile full-screen toggle was SPLIT to PR-D.1 — see below.)

### 🆕 NEW FOLLOW-UPS
- **[FU-PRACTISE-CONCEPT-FILTER] — PR-E.** Concept-row "Practise" has two confirmed downstream breaks (owner-verified on Trigonometry + Light): **(1) wrong route target** — `buildDesktopPracticePath` returns `/practice-hub` (`navigation.ts:75`), so it lands on the generic Practice hub needing a second click; should route DIRECTLY into Quick Practice with filters pre-applied. **(2) markBand not consumed (format mismatch)** — PR-D sets `markBand="1–2"` as a STRING (`navigation.ts:64`), but `PracticePage` filters via a NUMERIC `marksFilter` (`PracticePage.tsx:182`) bucketed to `"1"/"23"/"5"/"4"` (1mk / 2-3mk B·C / 5mk D / 4mk E-case — `PracticePage.tsx:326-329`); `markBand` is never referenced → carried but unapplied (student gets all marks 1–5). **PR-E fix:** route to quick-practice directly + translate the band string → `marksFilter` bucket-SET (ranges span buckets: `1–2`→{1,23}, `2–3`→{23}, `3–5`→{23,5}, `1–3`→{1,23}). **CRITICAL — path-conditional:** apply the band ONLY on the Topic-Hub-concept-row entry (a pre-set initial filter the student can still change); the OTHER entry (via the Practice hub, where the student sets their own filters) must NOT be forced to a mark band. Same Quick Practice page, two entry paths; force the band on the concept-row path only. (PR-D ships the route param honestly; routing + consumption land in PR-E.)
- **PR-D.1 — mobile full-screen tutor toggle (split from PR-D, owner-approved).** Item 7 was split out: it's a `TeachFlow` render change (not ConceptSpine layout), its mobile behaviour can't be verified on Windows (vite/vitest linux-pinned), and the binding mockup doesn't depict the tutor interactive. **Spec:** desktop side-by-side ↔ mobile full-screen TOGGLE, same component + same data, the toggle being the 360px-forced variation (one responsive site; mobile follows desktop, varying only where 360px forces it). **Corrected blast radius (owner):** there are no longer three live tutors — `TeachFlow` backs ONLY the one live Topic Hub tutor; `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx` are dead code (PR-G deletes them), and everywhere else the AI does solution-CHECKING, not tutoring. So a `TeachFlow` change touches ONE live surface — lower-risk than the PR-D report framed it. Its own mobile live-verify before merge.
- **[FU-BOOKMARK-SAVE-QUESTION] (logged for later; not a launch blocker).** A future lightweight "bookmark / save this question" feature — let a student proactively save a tricky question even when they answered it correctly — and surface saved questions on the **Me / Progress** page. Distinct from Mistake Intelligence (which captures WRONG answers); this is voluntary save-for-revisit. Owner-logged for later.

### ✅ DECISION — MockBuilder RETIRED
- **MockBuilder is cut from the live product** (un-routed) **+ tagged for deletion** (joins the PR-G legacy set: dead `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx`). **Code kept** for now; PR-G removes it with the rest. **Reason:** Mistake Intelligence now **auto-captures** the "hard questions to revisit" need that MockBuilder was meant to serve manually — the manual builder is redundant. (Decision recorded in DECISION_LOG 2026-06-20.)

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-E (NEXT)** — chapter-test + worksheet wiring + **[FU-PRACTISE-CONCEPT-FILTER]** · **PR-F** — content fill (Examiner's tips + Notes) · **PR-G** — delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set. Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]** (scripted non-contextual `concept_teach` engine).

---

## 2026-06-20 — Post-PR #272 (Topic Hub PR-C concept tutor "Teach me" flow; trunk `d9ba545`)

### ✅ RESOLVED / DELIVERED
- **PR-C tutor flow (#272, `d9ba545`)** — concept-row **"Teach me"** wired LIVE into the existing `concept_teach` engine on BOTH platforms (one responsive `ConceptSpine` mount); **`findVisualForConcept` wrong-visual bug FIXED** (below-confidence/empty → `null`, not `concepts[0]`); **earned-reveal client support** (teach-first; follow-up-turn server visual). Owner LIVE-VERIFIED PASS. Built in an isolated worktree; no self-merge; branch + worktree cleaned up.

### 🆕 NEW FOLLOW-UP
- **[FU-CONTEXTUAL-TUTOR-REBUILD]** — at PR-C live-verify the tutor's **content behaviour** surfaced: it serves a scripted **"Ravi Sir / Step N of 5"** lesson and does **not** respond contextually to what the student types. This is a **pre-existing defect in the old `/api/mentor` `concept_teach` engine** (server-side), which PR-C correctly wired into but was **never scoped to rebuild**. **Not a PR-C defect and not a PR-D layout item** — it is a **separate upcoming workstream** (the contextual-tutor rebuild). Owner-flagged, deliberately deferred.

### 🔭 PR-C DEFERRALS (fold into PR-D)
- **Mobile interactive = full-screen toggle:** TeachFlow currently renders the visual **stacked** under the chat on mobile, not a full-screen toggle (spec category B wants a toggle). A TeachFlow render change touching every mobile tutor surface — PR-D-shaped, not bundled into the behavioral PR-C.
- **Per-row visual badge:** with `findVisualForConcept` now honest, the per-row "has interactive" badge can be rendered on the spine — deferred to PR-D's layout work.

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-D (NEXT) — layout / action-band / tips / notes-consolidation** (+ the two PR-C deferrals above). ⚠️ MI stays in the navy sidebar (chrome), NOT on the Topic Hub page body. Starts fresh in its own worktree.
- PR-E — chapter-test + worksheet wiring (+ concept-level Practise auto-filter) · PR-F — content fill · PR-G — delete dead old-mobile.

---

## 2026-06-19 — Post-PR #268 (docs(design): FINAL Topic Hub IA committed; trunk `a280685`)

### ✅ RESOLVED / DELIVERED
- **FINAL Topic Hub IA committed** to `docs/design/` (#268): the owner-approved mockup HTML + the spec supersession (learn-first hierarchy, unified Notes, clickable Examiner's tips, "Teach me", concept-filtered Practise, 3-action band, constant navy sidebar + Mistake Intel). **Supersedes #261.** Now the in-repo binding reference for the rebuild. Built in an isolated worktree ([FU-WORKTREE-ISOLATION] honoured).

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-C — tutor flow:** wire the concept-row "Teach me" into the existing `concept_teach` engine (per-concept; engine unchanged; do NOT rebuild the chat / do NOT use `TutorDrawerV2`/`MentorPanel`).
- **PR-D — layout / action-band / tips / notes-consolidation:** flip to learn-first, recede the action band, add the clickable Examiner's tips panel, consolidate Formula-sheet + Proofs into the single unified Notes view.
- **PR-E — chapter-test + worksheet wiring** (+ concept-level Practise auto-filter).
- **PR-F — content fill:** per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- **PR-G — delete dead old-mobile** once the new IA ships at all widths.
- ⚠️ **Mistake Intel placement (PR-D guard, corrected):** Mistake Intel appears in the **navy sidebar** (global product chrome, present on every page) — **NOT on the Topic Hub page body**. The "no MI on the Topic Hub page" rule is **UNCHANGED** by the final IA; the sidebar panel is **chrome, not page content**. There is no supersession of the MI placement rule. PR-D must NOT add MI to the Topic Hub page body.

---

## 2026-06-19 — ⚠️ Process follow-up (commit c418f59 carried PR-B ungated)

- **[FU-WORKTREE-ISOLATION]** (NEW, process) — commit `c418f59` ("docs(handoff)…#266") also carried the PR-B concept-spine product change (App.tsx + DesktopTopicHubPage + ConceptSpine + test), which reached trunk **ungated** due to a parallel-agent **shared-working-directory** collision (docs branch cut while an unpushed local PR-B commit sat on local `base`; squash bundled both). PR-B code is correct, green, and owner-live-verified (desktop + mobile), but the commit is **mislabeled** and PR-B **bypassed its own gated PR**. **Fix:** give each concurrent agent its own **git worktree** so uncommitted/local commits can't ride into another agent's PR. See the SESSION_LOG correction entry of this date. (No code action outstanding — PR-B is accepted-forward; this is the process guardrail.)

---

## 2026-06-19 — Post-PR #265 + #264 (Bank Expansion Batch 2, 45 net-new + vitest-infra; merged, trunk `381e9df`)

### ✅ RESOLVED / DELIVERED
- **Batch 2** — Coordinate-Geometry 22 + Areas-Related-to-Circles 23 = 45 net-new, owner-verified + merged (#265). CG Area-of-Triangle excluded; figure-locked dropped; 3 `⚠ RECON`. Provenance via `AI_GENERATED_SOLUTION_IDS`; `predictionTypes.ts` untouched.
- **[FU-VITEST-INFRA] — RESOLVED** (#264, `2ef0b2c`): `@testing-library/dom` devDep + `setup.ts` window-guard; lockfile regenerated in Codespaces (pnpm 10.32.1). Codespaces vitest now **11/11 suites, 63/63 tests green** (was 7 failed / 4 passed). Future batches verify clean.

### 🔭 NEW / UPDATED FOLLOW-UPS
- **[FU-DIAGRAM-RECOVERY]** (NEW) — full-corpus figure-locked census found **67** diagram-dependent in-scope exercise questions, **42 high-mark (Section C+D)**: Triangles 18 · ARC 17 · Circles 15 · SAV 9 · PLE 3 · CG 2 · Trig 2 · Stats 1. These are currently DROPPED at extraction. Mocks are a launch surface, so recovering the high-mark ones (extract + clean + tag authentic NCERT/Exemplar diagrams, set `requiresDiagram`/`diagramDescription`) is launch-critical. **Decision needed before Batch 3** (Triangles+Circles hold 33 of the 42): drop-and-census as usual, or pair Batch 3 with a diagram-recovery pass.
- **[FU-EXEMPLAR-DEFERRED-NETNEW]** (updated) — deferred net-new available for top-ups: Batch-1 (AP Ex5.3 extras), Batch-2 (CG Ex7.3 Q12,14,15; ARC Ex11.4 Q7,9,10,11,13,19). Also CG collinearity-via-area items (Ex7.2 Q5,Q10; 7.3 Q19) were excluded as area-adjacent — owner may re-include solved via section/slope.
- **[FU-EXEMPLAR-STAT-13.4]** (carried) — Stats LA Ex13.4 question text not extractable from jeep213.pdf.

### ⏭️ NEXT BATCHES (owner-authorized separately, fresh from `381e9df`)
- Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq (Trig drops complementary-angle ratios) · Batch 5: Real-Numbers + Polynomials (Euclid + cubic-zeroes-coeff dropped). New rows ∈ Fix B [FU-TOPICKEY-CONSOLIDATION] scope.

---

## 2026-06-19 — Post-PR #262 (Bank Expansion Phase 1, Batch 1: 60 net-new Exemplar Maths Qs + AI step-marked solutions; merged + CI GREEN)

### ✅ RESOLVED / DELIVERED
- **Batch 1 of the Exemplar-Maths bank expansion (THE DECOUPLE)** — 60 net-new authentic questions (AP 24, Statistics 16, SAV 20) +
  AI step-marked solutions, owner-verified + merged (`444238b`). Solution-provenance via `AI_GENERATED_SOLUTION_IDS` id-set;
  `predictionTypes.ts` untouched. Codespaces vitest NO REGRESSION vs base.

### 🔭 NEW FOLLOW-UPS
- **[FU-VITEST-INFRA]** — repo vitest setup has a pre-existing gap: 7 component/page suites fail to LOAD with `Cannot find module
  '@testing-library/dom'` and `window is not defined` (jsdom env not active). Fails identically on untouched base `444238b` (proven),
  so it is NOT a Batch-1 regression — but it makes the Codespaces vitest gate noisy. Fix as its own tiny hygiene PR: add
  `@testing-library/dom` to devDependencies and ensure the jsdom test environment is applied. (CI quality-gate does not run vitest.)
- **[FU-EXEMPLAR-STAT-13.4]** — Statistics LA Exercise 13.4 (answer key shows 51.75 / 48.41 / 31 yrs / 201.96 g / median-salary
  13420 / …) is NOT extractable from `jeep213.pdf` (question text absent in the PDF's text layer). Needs a clean source before those LA items can be added.
- **[FU-EXEMPLAR-DEFERRED-NETNEW]** — additional net-new available for later top-ups: AP Ex 5.3 has ~12 further SA items + more Ex 5.2
  reasoning parts (not all harvested in Batch 1 to keep the batch verifiable). Surfaced so coverage is not silently capped.

### ⏭️ NEXT BATCHES (owner-authorized separately, branched fresh from `444238b`)
- Batch 2: Areas-Related-to-Circles + Coordinate-Geometry (Coord-Geom drops Area-of-Triangle-in-Coordinate-Geometry — banned).
- Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq (Trig drops complementary-angle ratios) · Batch 5: Real-Numbers + Polynomials (Euclid + cubic-zeroes-coeff dropped).
- These new rows fall into Fix B [FU-TOPICKEY-CONSOLIDATION] migration scope.

---

## 2026-06-18 — Post-PR #259 (AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock; merged + CI GREEN)

### ✅ RESOLVED — mock surfaces now soft-demote AI per-slot
- **[FU-AITIER-RANK-MOCKS-HPQ] — RESOLVED** (#259, trunk `775ee75`, squash; 4 files +209/−11; commit `ba2f619`). Extended PR2a's
  `SOURCE_MULTIPLIER` (reused — exported `getSourceMultiplier`, no fork) to the mock selection paths: **Full Mock**
  (`unlimitedPaperEngine.weightedSelect` per section/marks slot + `sourceWeightedPick` authentic-first archetype prefill) and
  **Topic Mock** (`topicMockEngine.weightedShuffleByScore`). Soft + structure-preserving (per-pool, `0.3/0.6` never 0 → an
  authentic-thin slot still fills with AI; blueprint/section-counts/pools unchanged; zero question added/removed). Codespaces vitest
  7/7. Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`.
- **HPQ "serves AI at parity" assumption — RESOLVED as a NON-issue (boundary correction).** The instruction assumed HPQ uses
  `getAllQuestions()` + serves AI at parity. **Wrong.** `highlyProbableQuestions.ts` is a hand-authored curated bank
  (`ple-hpq-*`, `sci-he-hpq-*`, `rn-comp-*`); never calls `getAllQuestions()`; ZERO AI-pack content (none in
  `AI_GENERATED_QUESTION_IDS`; `hpqCompetencyAdditions` curated). Nothing to demote (×1.0) → left untouched (no cosmetic no-op).
  **All AI-bearing surfaces now covered: practice (PR2a) + Full Mock + Topic Mock (#259); HPQ already AI-free.**

### 🐞 NEW follow-up
- **[FU-AITIER-RANK-DIFFICULTY-HELPERS] (NEW, owner-authorized-later).** `difficultyAwarePractice.ts` +
  `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity, but were out of #259's named scope (Full Mock /
  Topic Mock / HPQ) and its authorized gated-file list → NOT touched. Apply the same `getSourceMultiplier` demotion to their
  selection so every AI-bearing surface honours the AI-lower doctrine. Separate PR, its own instruction branched fresh from `775ee75`.
- **Owner live-verify of #259 — PENDING** (the real gate for a live ranking change): (1) generate a Full Mock on a ~50%-AI topic
  mix → each section authentic-first, AI only where authentic is thin; (2) the mock still has all sections filled (structure
  intact); (3) per-topic counts unchanged; (4) Topic Mock likewise authentic-first per slot. (HPQ item N/A — curated, no AI.)

## 2026-06-18 — Post-PR #257 (AI-tier PR2b strip fabricated pastBoardYear; merged + CI GREEN)

### ✅ RESOLVED — fabricated pastBoardYear stripped (anti-fabrication)
- **pastBoardYear-fabrication — RESOLVED** (#257, trunk `d6e0e14`, squash; 11 files +113/−106; commit `b4280ad`). Predicted/HPQ
  questions claimed a board year with no traceable PYQ reference. **96 values across 5 files** stripped (instruction assumed
  75/2 — undercount of 21; exhaustive enumeration done before stripping per owner). All 8 `.pastBoardYear` reads cleaned:
  dedup → score-only, `sourceYearHint` → `targetYear-1`, dead 5-signal-input fields removed. `predictionTypes.ts` untouched
  (optional field stays declared). Count-integrity: served bank 6,715 unchanged, `pastBoardYear_remaining=0`. Codespaces vitest
  9/9. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.
- **HPQ-confidence-shift concern — RESOLVED as a NON-issue.** The instruction expected HPQ confidence to shift; verified it does
  NOT — the 5-signal + Bayesian scorers read the historical dataset's `sourceYear`, never `input.pastBoardYear`/`sourceYearHint`
  (dead plumbing). Only the dedup tiebreaker changed (now score-only). Proven by unit test.

### 🐞 NEW / carried follow-ups
- **[FU-AITIER-RANK-MOCKS-HPQ] (carried, owner-authorized-later).** Still open after PR2b. Full Mock (`unlimitedPaperEngine`),
  Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`) route through `getAllQuestions()` + own selection and do
  NOT get PR2a's `sourceMultiplier` AI-demotion. Apply the same demotion there so all four surfaces honour the AI-lower doctrine.
- **[FU-HPQ-PHASE2-ESBUILD] (NEW, low priority — infra).** `scripts/ops/hpq_phase2_acceptance.mjs` cannot run in Codespaces:
  `Cannot find package 'esbuild'` (the ops bundling harness imports `esbuild` from `lazytopper/scripts/ops/`, where pnpm doesn't
  hoist it). Fails identically on trunk; not a CI gate. Pre-existing — surfaced (not caused) by PR2b's fixture edit.
- **[FU-PASTBOARDYEAR-TYPE-DECLS] (NEW, optional cleanup).** 9 `pastBoardYear?: string` optional type decls remain (incl. the
  forbidden `predictionTypes.ts:72`). All harmless/unused now; could be removed in a future type-hygiene pass (would need
  `predictionTypes.ts` authorization). Also `class10SciencePredictiveEngine.ts:469` has a stale prose doc-comment listing
  `pastBoardYear` as a field — cosmetic.

## 2026-06-18 — Post-PR #255 (AI-tier PR2a source-provenance stamp + soft AI-lower ranking; merged + CI GREEN + live-verified)

### ✅ RESOLVED — AI-lower ranking now enforced (the provenance + ranking half of the audit's PR2)
- **AI-lower-ranking-not-enforced — RESOLVED** (#255, trunk `686f737`, squash; 3 files +265/−9; commit `b4236ac`). The audit found
  `getAdjustedScore` had no source term and the file/suffix tier marker was destroyed at the bank concatenation (~41% AI at full
  parity). PR2a stamps `AI_GENERATED_QUESTION_IDS` at ingest from the 54 `.pack[1-3]` arrays (additive; bank untouched), stamps a
  `_source` tier (`authentic`/`ai-generated`/`predicted`) on the local `CanonicalQuestionWithScore` intersection (forbidden
  `predictionTypes.ts` NOT touched), and multiplies `getAdjustedScore` by `SOURCE_MULTIPLIER = {1.0, 0.6, 0.3}`. **Owner live-verify
  PASS:** on ~50%-AI topics a 10-question Quick Practice serves all authentic (first AI at index ~100–186). Exact live split: 6,715
  total = 3,710 authentic + 2,764 ai + 241 predicted, 0 unstamped. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.

### 🐞 NEW follow-ups
- **[FU-AITIER-RANK-MOCKS-HPQ] (owner-authorized-later; ranking parity for the remaining surfaces).** PR2a's `sourceMultiplier`
  only applies inside `getLikelyQuestionsForConcept` (Quick Practice / topic practice). **Full Mock** (`unlimitedPaperEngine` :353),
  **Topic Mock** (`topicMockEngine` :147), and **HPQ** (`highlyProbableQuestions`, own pool) route through `getAllQuestions()` +
  their own selection/weighting and therefore still draw AI at parity. Apply the same tier demotion in those selection paths so all
  four surfaces honour the AI-lower doctrine. Separate PR; needs care (mock/HPQ ordering carries higher regression risk).
- **[FU-CURATED-26-PROVENANCE] (owner-logged; decision recorded).** The 26 curated inline items in `canonicalQuestionBank.ts`
  (ids `2026-…`, e.g. `2026-TRIG-APP-01`) are not from a `.pack` file nor a verified-source file. **Decision: they stay
  classified `authentic`** (the documented "not-AI-pack ⇒ authentic" rule; ≤26 items, low impact). Re-open only if these should be
  treated as a curated/predicted tier.

### ↪️ CARRIED (unchanged by #255)
- **[FU-AITIER-MARKS-MISMATCH] — ✅ RESOLVED by #504** (bank mis-banding Class (a), trunk `b810055`): the 7 quarantined pack items were relabelled to Section B / 2 marks with re-authored 2-mark `solutionSteps`, and `PACK_5MK_SHORT_BACKLOG` in `aiTierContentIntegrityGuard.test.ts` is now empty (guard stays live for new offenders). (was: the 7 quarantined pack items still need the marks/content pass.)
- **PR2b `pastBoardYear` strip** — now **unblocked** by this stamp (it distinguishes verifiable PYQ years from fabricated
  predicted-layer ones). Owner's immediate next.

## 2026-06-18 — Post-PR #253 (AI-tier PR1b pack-file 5-mark retags; merged + CI GREEN)

### ✅ RESOLVED — pack-layer backlog drained of genuine long-answers
- **[FU-AITIER-PACK-5MK-SHORT] — RESOLVED** (#253, trunk `f83915b`, squash; 9 files +34/−19; commit `86394e4`). The 19 pinned
  pack-layer `format:"Short"` Section-D/5-mark items were split by content: **12 genuine 5-mark long-answers relabelled
  `Short→Long`** (label-only; each confirmed by reading its `questionText`) — `ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046,
  HEC2-039, LT2-016/024, ME2-025, REP2-048`. **`PR2-018` reclassified** on inspection (single-step `7/12` one-liner, not a
  long-answer) → moved to quarantine. Backlog **19 → 7**; count unchanged. Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`.

### 🐞 NEW follow-up
- **[FU-AITIER-MARKS-MISMATCH] — ✅ RESOLVED by #504** (bank mis-banding Class (a), trunk `b810055`, owner LIVE-VERIFIED). The **7** quarantined pack items —
  `TG3-056` ("cosec 60°"), `TG3-059` ("evaluate 4 sin30° tan60° − 2 cot60° cos30°"), `ABS2-047` ("salt vs base"), `CR2-043`
  ("balance Al + O₂ → Al₂O₃"), `MNM2-037` ("name the reducing agent"), `REP2-039` ("name two contraceptives"), `PR2-018`
  ("P(not blue)") — were SHORT questions wrongly tagged **5-mark**. As predicted this was a content↔marks problem, not a label one:
  #504 set each to its **true value (all Section B / 2 marks, PYQ-grounded at fallback level 1)** and **re-authored `solutionSteps`
  to the 2-mark scheme** (the padded 5-mark solutions — incl. TG3-059's literal `"Check: May need reworking"` line — are gone), then
  removed all 7 from `PACK_5MK_SHORT_BACKLOG` in `aiTierContentIntegrityGuard.test.ts` (now empty; the guard stays LIVE for any new
  offender). Anti-fabrication held — only section/marks + solutionSteps changed; questionText/options/answer untouched.

## 2026-06-18 — Post-PR #251 (AI-tier PR1 mechanical content-integrity; merged + CI GREEN)

### ✅ RESOLVED — Q10 de-fused + tagging defect fixed + guard added
- **[FU-MALFORMED-QUESTION] — RESOLVED** (#251, trunk `f4a41b6`, squash; 5 files +237/−41; commit `8524e8e`). The read-only
  audit (`report-ai-tier-audit-2026-06-17.md`) found Q10 (`2026-RN-LA-03`) was a **one-off** cross-concept fusion, and the
  "5mk/Section-D/Short" symptom was a **systematic** tag defect (the `QuestionKind` type had no `"Long"` member). PR1: added
  `"Long"` to `QuestionKind` (both predicted files) + `toCanonicalFormat` propagation; retagged **24** five-mark Section-D
  predicted items `Short→Long`; **split Q10** into `2026-RN-SA-08` (LCM, C/3mk) + `2026-RN-SA-09` (√5 proof, C/3mk) [net +1];
  added `aiTierContentIntegrityGuard` to the root matrix (175→181) locking the class. Report:
  `report-aitier-pr1-mechanical-2026-06-17.md`.

### 🐞 NEW follow-ups
- **[FU-AITIER-PACK-5MK-SHORT] (owner-authorized, queued — PR1b).** The audit undercounted: the SAME 5-mark-"Short" defect
  exists in **19** gated `.pack2/.pack3` questions (`format:"Short"`, which the predicted-layer `kind` tally missed) —
  `ARC2-016/017, PR2-018, TG3-056/059, ABS2-047/048, CC2-048, CR2-043…046, HEC2-039, LT2-016/024, ME2-025, MNM2-037,
  REP2-039/048`. Pinned as a shrink-only baseline in `PACK_5MK_SHORT_BACKLOG`. **PR1b:** retag ONLY the genuine long-answers
  `format:"Short"→"Long"` and shrink the backlog; **QUARANTINE** the content↔marks mismatches (e.g. `TG3-056` "cosec 60°",
  `REP2-039` "name two contraceptives" tagged 5mk) — flag for a separate content-judgment pass, do NOT relabel. Needs explicit
  `src/data/**` pack-file scope. Wait for the owner's PR1b instruction.
- **[FU-AITIER-PROVENANCE-RANKING] (PR2 — architectural, queued).** From audit §4–§6: there is **no source/provenance field** and
  **no AI-lower ranking** — AI and authentic interleave at parity across all four surfaces (Quick Practice, HPQ, Chapter Test,
  Full Mock), and mocks draw from the mixed unified bank. PR2: add a `source`/provenance stamp at the module boundary, enforce
  AI demotion in `predictionCore.getAdjustedScore`, and strip the unverified `pastBoardYear`. Owner-authorized, separate.

## 2026-06-17 — Post-PR #249 ("Finish session" scorecard trigger; merged + CI GREEN; owner live-verify PASS)

### ✅ DONE — Finish-session trigger merged + live-verified
- **[FU-SESSION-SCORECARD-TRIGGER] — CLOSED** (#249, trunk `704dcff`, squash; 2 files +63/−2; commit `b740a3f`). Replaced #240
  sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button (always-available
  at the set foot, both desktop + mobile widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the
  scorecard; `allDone` retained as a convenience auto-offer. Reuses the EXISTING `sessionStats` — no new counters/persistence/
  state machine. **Owner live-verify = PASS — partial-session honesty PROVEN:** a 3-of-10 finish reads "3 of 10 attempted · 0/3
  MCQs correct · 0% accuracy · the 7 you didn't reach aren't counted"; the zero-attempt case reads honestly too.
  **Supersedes #240 sub-task 5.** Report: `report-finish-session-scorecard-2026-06-17.md`.

### 🐞 NEW follow-up — for the upcoming read-only AI-generated-question-tier audit
- **[FU-MALFORMED-QUESTION] (owner-observed live during the #249 verify)** — a **malformed question in a live pack**: **Real
  Numbers Quick Practice Q10 fused TWO distinct questions into one** — an alarm-clock LCM word-problem AND "prove √5 is
  irrational" — and carried **inconsistent metadata** (tagged **5-mark / Section-D** yet also labelled **Short**; the two fused
  parts don't add up to a single coherent mark/section/format). **Suspected AI-generated pack origin** (the generator likely
  concatenated two seeds and mis-tagged the result). This is a CONTENT-INTEGRITY signal, not a #249 regression (the scorecard
  surfaced correctly; the question itself is the defect). **To be characterised by the next task — a read-only
  AI-generated-question-tier audit** (its own owner instruction, branched fresh from `704dcff`): scope the prevalence of fused /
  mis-tagged / mark-section-inconsistent items across the AI-generated tiers; map (do not fix) the problem. Repro: Real Numbers
  → Quick Practice → Q10.

## 2026-06-17 — Post-PR #246 (Check & Improve detect-then-confirm + question photo upload; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — detect-then-confirm merged
- **[DETECT-THEN-CONFIRM]** (#246, trunk `c9404e1`, squash; 9 files +935/−78; commit `3e00ac4`). The UX layer on Claim 2:
  detection is now VISIBLE + CORRECTABLE before grading, plus question photo upload. "Read the question →" → detection-only
  `POST /api/detect-question` on the question alone → confirmation chip (subject·topic·marks + source) + quiet [Change]
  (constrained correction; corrected mark → `marksSource:"user"`) → grade on the CONFIRMED values via the unchanged
  trusted-marks path (the grader is untouched). Override logged on the attempt record (`marksSource` + `detectionOverride`;
  reuses recordAttempt persistence — no new collection / no `firestore.rules` change). Report: `report-detect-then-confirm-2026-06-16.md`.

### ⚠️ PRE-LAUNCH GATE — must not be forgotten
- **[FU-DETECTION-META-LAUNCH-FLIP] (hard pre-launch gate, owner-flagged)** — `SHOW_DETECTION_META` in
  `lazytopper/src/utils/checkImproveDetection.ts` is **ON now for the owner testing phase**; it MUST be flipped to **`false`
  before Check & Improve ships to students**. It gates ONLY the detection meta-display (the "read from the question" /
  "estimated" source label) — it does NOT hide the detected values or the [Change] control (those stay visible + correctable
  at launch — calm "we read this from your question", never anxious "AI low-confidence"). **This is the tester-vs-student
  line: shipping with the machinery still showing is a real miss.** A one-line change (`export const SHOW_DETECTION_META =
  false;`), but easy to forget — wired into NEXT_ACTION (item 0) + ROADMAP so it surfaces every session until done. After
  flipping, verify the chip on BOTH desktop + app shows the values + Change but no source label.

### ✅ Decisive verification — DONE (owner): [DETECT-CONFIRM-LIVE-VERIFY] = PASS 5/6
- (1) Printed marks read correctly; (2) inference GENUINE + graduated — a short AP question infers **2**, a proof infers **3**
  (they diverge → real inference, not a blind constant); (3) **photo** of a printed-marks question reads the printed value with
  two distinct upload slots; (4) **[Change]** corrects a wrong detection → grades the corrected value, corrected topic buckets
  to a clean canonical key on Me; (5) selectors gone on desktop AND mobile width. The detect-then-confirm UX is validated live.

### 🐞 New follow-up from the live-verify (the 6th — known issue, NOT a blocker)
- **[FU-DETECTION-MARKS-CEILING] (owner-observed in the #246 live-verify)** — the inferred mark scale **under-calls true
  5-mark questions** (multi-part numerical + proofs) as **3**; inference tops out below 5 for the heavy items. It is
  **caught-and-correctable via [Change]** (the student bumps it to 5), so it does NOT corrupt grading — exactly the failure
  mode detect-then-confirm was built to absorb (the AI proposes, the student corrects). Hence PASS-with-known-issue, not a
  blocker. Fix candidates (later, owner-authorized): (a) tune the `/api/detect-question` prompt's mark heuristic to reach 5 for
  multi-part / derivation / proof / long-answer items (cheap, prompt-only); (b) bank-grounding / retrieval to calibrate the
  scale against real CBSE mark allocations — DEFERRED behind Fix B. The override telemetry (`detectionOverride`, logged on the
  attempt when the student bumps 3→5) is the signal that will measure how often this fires. Not urgent; the UX absorbs it.

### Touchpoints
- The two Check & Improve surfaces continue to share `checkImproveDetection.ts` (now also `buildConfirmedDetection` +
  `clampDetectedMarks` + the `SHOW_DETECTION_META` flag) — they can't diverge.
- **Bank-grounding / retrieval for detection** is DEFERRED behind **Fix B [FU-TOPICKEY-CONSOLIDATION]** (calibrating detection
  against the question bank needs the topicKey/tagging cleanup first). Detection stays prompt-based for now.

## 2026-06-16 — Post-PR #244 (Check & Improve auto-detect marks/subject/topic — Claim 2; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — Claim 2 merged
- **[CLAIM2-AUTODETECT]** (#244, trunk `43ffa09`, squash; 6 files +330/−238; commit `d93cd23`). The Check & Improve grader now
  determines marks/subject/topic from the question (owner-ruled option (a)); the student selectors are gone on both surfaces
  (desktop + app). Opt-in `detectMarks` flag → Quick Practice (`SolutionChecker`, canonical-bank marks) is byte-identical.
  Printed marks preferred → inferred → flagged `fallback` (never a silent static 3); topic constrained to the canonical
  `topics.ts` vocab + re-canonicalised via the shared `resolveDetectedGradeTopic` helper (reuses Fix A's
  `desktopTopicForWeakAreaKey` — no new normaliser → clean MI attribution). Report: `report-claim2-autodetect-marks-2026-06-16.md`.

### Decisive verification owed (do NOT mark fully done until then)
- **[CLAIM2-LIVE-VERIFY] (owner, decisive)** — static gates can't judge the AI's marks-inference quality. On real uploads:
  (1) question stating "[3]" → graded /3 without entering marks; (2) question with no printed mark → sensible inferred scale,
  not a blind 3; (3) detected topic buckets correctly on Me ▸ weak-areas (real key, routes to practice via Fix A); (4) the
  manual marks/subject/topic selectors are gone at desktop (≥1024px) AND mobile width.

### Touchpoints / related follow-ups
- **[FU-GRADE-MARKSCALE]** — partially addressed: the grader now judges the CBSE mark value from the question (prefers printed,
  else infers) rather than consuming a student-entered scale. The eval ([MI-EVAL]) should now also score the auto-detected
  mark scale + topic-detection accuracy. **[FU-GRADE-CONSISTENCY]** and **[MI-EVAL]** remain open / eval-gated.
- The two Check & Improve surfaces now share `resolveDetectedGradeTopic` (`src/utils/checkImproveDetection.ts`) — they can no
  longer diverge on topic canonicalisation (a recurring desktop-vs-mobile drift class).

## 2026-06-16 — Post-PR #242 (topicKey Fix A — Me weak-area resolver + 13 aliases; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — read-only audit + Fix A merged
- **[TOPICKEY-AUDIT] (read-only, DONE)** — `report-topickey-duplication-audit-2026-06-16.md`. 84 distinct `topicKey` strings,
  4,907 occurrences, **32% under non-canonical spellings**. Proved serving merges all variants (no content shortage) but the
  attribution side fragments: `recordAttempt`/`recordMistake` store the raw label, and the Me row resolved it through the
  weakest normaliser. The report IS the Fix B migration spec (key→key map, affected files, guard design in §5).
- **[TOPICKEY-FIXA]** (#242, trunk `77f2ed2`, squash; 3 files +114/−2; commit `4eb2320`). New `desktopTopicForWeakAreaKey`
  routes the Me weak-area row through the strong serving-side resolver (`getRuntimeTopicCandidates`) + 13 `topics.ts` aliases;
  the 13 in-bank spellings that fell to `/exam-trends` now resolve to Quick Practice. **Read-time only** — no `src/data`
  rewrite, no stored-record migration. Report: `report-topickey-fixA-me-resolver-2026-06-16.md`. CI GREEN.

### Resolved this PR
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] — ✅ RESOLVED by #242** (pending owner live-verify). The Light row (and the 12 sibling
  spellings) no longer hit the honest fallback — the Me hub resolution now camelCase-splits + alias-resolves via the strong
  resolver, and 13 explicit `topics.ts` aliases cover the failing normalized blobs. The earlier note that this was an en-dash
  "(in…)"-suffix problem was superseded by the audit: the en-dash variant actually resolved; the failing spellings were the
  PascalCase Science abbreviations (`Light`, `MagneticEffects`, …) + 2 `science_*` keys. Honest fallback PRESERVED for
  genuinely-unknown topics.

### New follow-up logged this PR (recorded — do NOT start until authorized)
- **[FU-TOPICKEY-CONSOLIDATION] (Fix B — owner-authorized-later, gated) — HELD.** Migrate every question's `topicKey` to the
  single canonical kebab slug from `topics.ts`, retire the ~58 variant spellings, and add a **CI guard** (in the root `scripts`
  matrix, NOT `scope:guard`) that fails if a non-canonical topicKey reappears. Touches gated `src/data/**` across ~60 files;
  stage Maths/Science as separate PRs. Permanent cure for the source fragmentation; Fix A already covers the live read-time
  symptom, so Fix B is not urgent. Exact key→key map + affected-file list + 3-part guard design = audit report §5.
- Related: **[FU-WEAKAREA-ALIAS-DISPLAY]** (same duplication class, display side) is partially mitigated by Fix A's resolver
  but its active-gaps COUNT path (`getWrongConceptsForTopic` keying) is separate — still open.

## 2026-06-16 — Post-PR #240 (MI polish batch — surface/ranking; merged + CI GREEN; owner live-verify 4/5)

### ✅ DONE — MI polish batch merged (4/5 live-verified)
- **[MI-POLISH-BATCH]** (#240, trunk `9eff0b0`, squash; 7 files +122/−79; one commit per sub-task). Five surface/ranking
  sub-tasks on the finished MI loop (NOT eval-gated): weak-area blended-severity ranking, per-row targeted practice CTAs,
  wrong-MCQ nudge, Practise→Practice UI copy, end-of-session scorecard + footer removal. CI GREEN. Report:
  `report-mi-polish-batch-2026-06-15.md`. Live-verify: sub-tasks 1–4 PASS; sub-task 5 not yet confirmable (trigger redesign).

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] (confirmed live bug; topicKey-duplication symptom)** — the **Light – Reflection and
  Refraction** weak-area row on desktop Me routes to **Exam Trends instead of practice**. Root cause: its topicKey is a
  **non-canonical variant** (en-dash separator + a "(in…)" suffix) that does NOT resolve to a practice hub slug, so
  sub-task 2's targeted-practice routing correctly falls through to its **honest topic-hub/trends fallback**. The fallback is
  working as designed — the defect is upstream: the **topicKey is duplicated / non-canonical**. **To be traced in the
  upcoming read-only topicKey audit (queued item i)** — do NOT patch the alias/route ad hoc; the audit produces the
  systematic kill-list. Related to [FU-WEAKAREA-ALIAS-DISPLAY] (same duplication class, display side).
- **[FU-SPELLING-GATED-REMAINDER] (owner-authorized separate follow-up)** — ~60 rendered "Practise" strings remain under
  `lazytopper/src/data/**` (topicHubV2Full, topicHubContent, class10ContentConfig, class10ScienceTopicTrends,
  predictedQuestionsScience) + 1 in `lazytopper/src/lib/desktop/loginPrompts.ts`. #240 (sub-task 4) could NOT touch these —
  both are FORBIDDEN/GATED dirs. Finishing the global Practise→Practice replace needs an **owner-gated PR** scoped to those
  files. Until then "Practise" still appears in topic-hub study tips + the login prompt.

### Scorecard trigger — redesign queued (not a defect, a confirmability gap)
- **[FU-SESSION-SCORECARD-TRIGGER]** — the #240 scorecard renders on `allDone` (set fully attempted), which is hard to reach
  in live-verify and silent on partial sessions. Queued PR (ii) replaces it with an **explicit student-declared "Finish
  session"** action, honest on partial sessions (no implied completion). Makes sub-task 5 confirmable.

## 2026-06-15 — Post-PR #237 (MI Loop Stage 2 / Measure-leg PR 3 — MCQ honest capture; MEASURE LEG COMPLETE)

### ✅ DONE — MI Loop Stage 2 PR 3 merged (⏳ owner live-verify pending)
- **[MI-LOOP-S2-PR3] MCQ honest capture** (#237, trunk `b75f065`, squash of `9edf6fb`; 1 file +22/−36). `PracticeQuestionCard`
  MCQ clicks now route through `recordAttempt` (1/1 correct, 0/1 wrong, `mode:"mcq"`, same topic/questionId keying as graded
  answers) → MCQ feeds Saved attempts / Accuracy + a correct MCQ shrinks a weakness via the PR-2 loop-closer. Removed the
  hardcoded `conceptual:1` direct-`logMistakes` bypass (a bare MCQ click has no working to classify). **Owner-ruled wrong-MCQ
  treatment (a) attempt-only** — record the 0/1 attempt and nothing else (no mistake-log entry, no synthesized grade object, no
  typed category); option (b) untyped/objective `recordMistake` declined. One front door, no fabrication. CI GREEN. Report:
  `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`. **The MI loop Measure leg is now complete** (graded + MCQ capture).

### Decision recorded — wrong-MCQ treatment
- **[DECISION-MCQ-WRONG] = (a) attempt-only** (owner-ruled). A wrong MCQ is an accuracy signal, not a typed-mistake signal;
  `recordMistake` expects a graded `CheckSolutionResponse` an MCQ lacks (synthesizing one = fabrication). "Marks lost" /
  mistake-mix / weak-areas stay sourced from real graded classifications. Closed.

## 2026-06-15 — Post-PR #235 (MI Loop Stage 2 / Measure-leg PR 2 — THE LOOP CLOSES)

### ✅ DONE — MI Loop Stage 2 PR 2 merged + owner live-verified (the loop is now bidirectional)
- **[MI-LOOP-S2-PR2] close the loop** (#235, trunk `59f9d18`, squash of `4c8936b`; 4 files +135/−2). A FULLY-correct
  `recordAttempt` decrements one active gap for the topic via `clearWrongAnswer` (live correct-attempt path; clamped at 0;
  wrong/partial never shrink), key-matched to the bridge's increment (identical `normalizeTopicKey(ctx.topicKey ?? ctx.topic)`;
  caught the G9 spaces→`_` vs `-` trap). Both Me surfaces show "active gaps remaining" (recoverable healing) alongside
  historical "marks lost" (the scar) — owner Option 1; did NOT repoint Me to `getWeakAreas`. Codespaces vitest **2/2 PASS** +
  `vite build` ✓ + verifier ✓ (Linux, mocked stores, no creds); CI GREEN. **Live-verified PASS:** active gaps → 0 on Real
  Numbers AND Polynomials; marks-lost held; wrong didn't shrink; clamp held; mobile parity. Report:
  `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-IMPROVEMENT-CARD] (blocks the improvement/journey card)** — the loop-closer's `clearWrongAnswer` **DELETES** the
  wrong-answer entry when its count hits zero, which **erases the improvement record** (you can no longer tell a topic was
  ever weak-then-cleared). Before building any improvement / journey / "you fixed N gaps" card on Me, the loop-closer must
  FIRST record a **durable "gap cleared" event** — cumulative + per-topic + timestamp — in the `practiceInsights` mirror
  (the existing localStorage + Firestore pattern; no `firestore.rules` edit). Accuracy/mistake **trends** are already
  derivable from existing attempt/log timestamps; this adds only the cleared-gap signal. Sequence: durable event FIRST,
  then the card.
- **[FU-WEAKAREA-ALIAS-DISPLAY] (display under-count, not wrong data)** — the active-gaps COUNT shown on Me under-shows for
  topics whose display label ≠ canonical slug (e.g. "Linear Equations" → `pair-of-linear-equations`) because the display
  lookup `normalizeTopicKey(label)` only resolves cleanly when the label slug-normalizes to the canonical (or the alias map
  covers it). Honest 0, never wrong data. The **data-layer decrement is unaffected** (it uses the bridge-identical key).
  Fix = extend the alias map coverage (gated `src/data/`) or resolve the row's canonical key from its hub slug.

## 2026-06-14 — Post-PR #233 (MI Loop Stage 2 / Measure-leg PR 1)

### ✅ DONE — MI Loop Stage 2 PR 1 merged + owner live-verified
- **[MI-LOOP-S2-PR1] `recordAttempt` front door** (#233, trunk `57fb7aa`, squash of `d8ee55c`; 4 files +199/−15). The dead
  `recordAttempt` (0 call sites) is now the real single attempt front door — score-twin of `recordMistake` (skip no-user/local;
  dedup; localStorage + existing Firestore mirror; **no `firestore.rules` edit**). Marks is the universal unit; `correct` derived.
  All 3 graded surfaces routed; attempts merge with mistake-log rows. **Live-verified PASS:** Saved attempts / Accuracy /
  Accuracy-by-subject / Recent populate from real graded attempts; merged into the **Polynomials** weak-area row; X/Y banner
  confirmed as the v1 session scorecard (no new UI). Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-ATTEMPT-MARKS-ACCURACY]** — the Me "Accuracy" / "Accuracy by subject" cards are still **binary** (full-marks = correct), so
  a graded 4/5 reads as one not-fully-correct attempt. Marks-weighted accuracy (∑marksScored / ∑marksAvailable) is the fuller
  expression of decision 1, but the card labels ("X correct of Y attempts") must change to a marks framing first. Fast-follow
  (decision 3 puts trend/analytics as fast-follow). The marks data is already persisted, so this is display-only.
- **[FU-ATTEMPT-SR]** — the OLD dead `recordAttempt` body fed `spacedRepetitionEngine` (`addWrongAnswerToSR`/`addConceptToSR`/
  `reviewConcept`); that side-effect was **intentionally dropped** when the front door was rebuilt (it was never live; activating a
  dormant subsystem is out of PR-1 scope). If live attempts should feed SR, that is its own decision.

### Next — MI Loop Stage 2 PR 2 (the loop-closer; do NOT start until this docs ritual is done)
A **correct** `recordAttempt` should decrement the topic/concept weakness via `clearWrongAnswer` (wire to the live attempt path,
NOT `recordSelfAssessment`'s dormant session subsystem; already clamped ≥0). Decisive live test: a logged weak area (Real Numbers
−7) **visibly shrinks** on Me after a clean correct drill.

## 2026-06-14 — Post-PR #231 (MI Loop Stage 1 / Act-leg)

### ✅ DONE — MI Loop Stage 1 merged + owner live-verified
- **[MI-LOOP-S1] Act-leg targeting** (#231, trunk `6d80a57`, squash of `09fa7f8`+`deaad2e`; 3 files +92/−15). Gap A (weak-topic
  targeting + honest generic fallback) + Gap B (auto-serve on targeted arrival) + Option B (one-click direct via
  `gotoPracticeForTopic`, gated `buildDesktopPracticePath` untouched, intent-first guardrail preserved). **Live-verified PASS:**
  one-click ready set (desktop + mobile); generic Practice stays open/unscoped; served set non-empty (Real Numbers, Polynomials);
  "Edit filters" works. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.

### New follow-ups surfaced during Stage-1 live testing (recorded — do NOT fix ad hoc; sequence per the MI-Loop spec)
- **[FU-DRILL-ROUTING]** — TopicHub "Run targeted drill" routes to the **worksheet generator** (`mistakeAwareHref` →
  `buildDesktopWorksheetPath`, `DesktopTopicHubPage` ~L2135) instead of a practice drill. **Label contradicts destination** —
  repoint to the auto-serving practice set (same one-click pattern as #231) or relabel.
- **[FU-WEAKAREA-LABEL]** — `PracticePage` shows **no weak-area framing** on a targeted arrival, so a scoped set still *looks*
  generic. Add an honest "Targeting your weak area: <topic>" banner on `?topic=`/`targeted=1` arrivals.
- **[FU-WEAKAREA-CTAS]** — only `weakAreas[0]` gets a "Practise" CTA (`DesktopMePage` ~L1431 gate); **secondary weak areas**
  (e.g. Polynomials) have none. Extend the targeted CTA to the top-N weak areas.
- **[FU-WEAKAREA-HUB-LIMIT]** — the practice-hub surfaces only the **top** weak area (`rows[0]`) vs Me's full list. Align the hub
  to show Me's weak-area set.
- **[FU-DRILL-ENRICHMENT]** — the targeted drill is **topic-level only**: the mistake-*category* never reaches
  `generatePracticeSet`, and concept-priority is gated on `adaptiveMix` (`difficulty === "All"`). This is **MI Loop Stage 3**
  (concept-level targeting), **eval-gated** — do after Stages 1–2 prove the loop + the eval set validates classification.

## 2026-06-14 — Post-PR #229 (grade-parse resilience)

### ✅ CLOSED
- **[FU-GRADE-PARSE] grade-parse resilience — CLOSED by #229** (trunk `59e11f6`, squash of `14ea860`; 1 file
  `server/routes/checkSolution.cjs`, +44/−5). Root cause: **Gemini JSON truncation** (`maxOutputTokens: 8000` cap → long
  multi-step grades cut mid-JSON → `extractJsonObjectFromText` returns null → "couldn't read the grading"). Fix (parse-resilience
  only, zero grading-semantics change): single bounded retry on parse-gate miss + `maxOutputTokens` 8000→16000 + failure-path
  diagnostics (`finishReason`/length/tail). **Owner live-verified PASS** — `sol_5.jpeg` grades reliably on both Quick Practice and
  Check & Improve. Report: `report-grade-parse-resilience-2026-06-12.md`.

### New follow-ups surfaced by the #229 live check (both eval-gated; downstream of grading QUALITY, not the parse path)
- **[FU-GRADE-MARKSCALE] (eval-gated)** — in **Check & Improve the marks are student-entered, not question-derived**, so the grader
  currently grades against a total the student typed. It should instead **judge the CBSE mark value** the answer is worth. Needs
  the eval set to validate any prompt/scoring change — do not hand-tune blind.
- **[FU-GRADE-CONSISTENCY] (eval-tuned)** — the **mistake-type classification varies across surfaces** for the same answer. Mostly
  **downstream of [FU-GRADE-MARKSCALE]** (different mark context → different typing) and tied to **[MI-EVAL]**; fold into the eval
  pass rather than patching ad hoc.

### Still active (unchanged)
- **[FU-ME-REFRESH]** — Me does not reflect a freshly-logged mistake / reconciled summary until a manual refresh (reconfirmed
  during the #229 live check). Add a refetch-on-focus / post-grade trigger. **[MI-EVAL]** classification quality — eval-pending.

## 2026-06-12 — Post-PR #227 (MI Consolidation P1+P2)

### ✅ DONE — MI P1+P2 merged + owner live-verified
- **[MI-P1P2] `recordMistake` front door + weak-area bridge + careless insight + server reconcile** (#227, trunk `c618cd5`,
  squash of `e3e3f18`; 8 files +531/−159). Quick-Practice "mistake not logged" bug FIXED. Owner live-verification: regression ✅,
  Quick-Practice logging ✅, bridge ✅ (Polynomials + Real Numbers in Weak Areas), server reconcile ✅, no double-log ✅.
  Report: `report-mi-consolidation-p1p2-2026-06-11.md`.

### New follow-ups surfaced by the MI live verification (both pre-existing / separate from MI logging)
- **[FU-GRADE-PARSE] grade-parse resilience → CLOSED by #229** (see the 2026-06-14 section above). Was an intermittent
  grade-parse failure on the Quick-Practice "check my answer" flow; root cause = Gemini JSON truncation; fixed with retry +
  raised token cap + diagnostics. Owner live-verified PASS.
- **[FU-ME-REFRESH] Me page auto-refresh lag** — after a graded mistake, the Me page does **not** reflect the new mistake / the
  reconciled `mistakeSummary` until a **manual refresh**. Add a refetch trigger (on focus, or after a grade completes) so Me
  updates without a reload. Surfaced specifically against verification point 4 (server reconcile is correct; Me display lags it).

### Eval-pending (named for the next workstream)
- **[MI-EVAL] classification quality** — the weak-area bridge routes by **Gemini's mistake-typing** (conceptual/calculation vs
  silly/presentation). The eval set validates this next; be ready to tune routing if it's noisy.

### Still open / deferred (named in the MI Architecture Map, NOT in #227)
- **[MI-MCQ] MCQ onto the front door** — `PracticeQuestionCard` still writes `logMistakes` directly with hardcoded `conceptual:1`
  (Map gap #5 / Phase 2). **[MI-TESTS-MOCKS]** chapter-tests + mocks onto `recordMistake` (Phase 3). **[MI-LAYER-MERGE]**
  reconcile the two analysis layers + durable Me convergence (Phase 4).
- **Topic-key resolution risk (watch):** the bridge depends on `normalizeTopicKey(display label)` resolving to the canonical slug
  the aggregator iterates. Verified live for Polynomials + Real Numbers; if a future topic's weak-area bump silently no-ops, it's
  an alias-map/`topicResolver` gap → fast-follow patch, not a revert.

## 2026-06-11 — Post-PR #224 + #225 (INFRA-4/PR1: Railway backend LIVE)

### ✅ DONE — backend deployed + live
- **[INFRA-4/PR1] Railway deploy + `vercel.json /api/*` rewrite** (#224 + #225, trunk `7c106b6`). `artifacts/api-server`
  (self-spawns the AI gateway) is **live on Railway**; owner-confirmed `stub:false`, Gemini direct-key. `/api/*` + `/shared-api/*`
  rewrites point at `https://lazytopper-production-production.up.railway.app`. Grading no longer dark in prod.

### ⛔ [TRACK-B-GATE] — now LIVE-TESTABLE; owner+cofounder run the round-trip to CLOSE
- The backend is live, so the grade→persist→mobile-Me→desktop-Me round-trip can finally be PROVEN. **Owner + cofounder run it on
  the live app** (sign in → grade a real answer → "Saved to your progress" → mobile Me real mix → desktop Me matches same uid;
  plus failed-grade → error). **Only that pass closes [TRACK-B-GATE] / ISSUE-009.** Runbook: `report-api-gateway-railway-2026-06-10.md` §7.

### Follow-ups surfaced by INFRA-4/PR1 (for PR2 "harden")
- **[INFRA-4-tsx] add `tsx`** — absent from all manifests; the solution-cache warmup spawns `node --import tsx/esm`. Inert in PR1
  (warmup is `DATABASE_URL`-gated and PR1 sets none); **PR2 must add `tsx` when it provisions Postgres** or warmup fails to spawn.
- **[INFRA-4-PR2] harden** — provision Postgres + `DATABASE_URL`; `ADMIN_FIREBASE_UIDS` (admin 503 without it); `SESSION_SECRET`
  (share feature 503 without it); rate-limiting; warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` is `0` now). Confirm
  `CORS_ORIGIN` = the real app origin (default is a localhost dev value).
- **[INFRA-4b] claudeClient rewire** — Replit-proxy → direct Anthropic key; visuals-only, deferred to a later visuals PR.
- **[D42] root `packageManager` pin** — root `package.json` has none; the Dockerfile pins corepack `pnpm@10.32.1` as a workaround.
  Still worth a standalone hygiene PR so non-Docker tooling resolves pnpm 10 too.

## 2026-06-09 — Post-PR #222 (Track B: mobile Check & Improve — trust + persistence)

### MERGED in #222 (trunk `6c88ccf`) — superseded by the 2026-06-11 gate update above
- **[TRACK B] Mobile Check & Improve trust + persistence** (`fix/mobile-check-persistence`; 2 files
  `app/CheckImprove.tsx` + `app/Me.tsx`, +236/−32). Three coupled fixes, all mirroring desktop (not reinvented):
  1. **Trust guard fixed** — `!result.ok && result.error` → `!result || result.ok === false` (mirrors
     `DesktopCheckImprovePage.tsx:727`). A failed / empty-error grade now renders an ERROR, never a fake score.
  2. **Persistence wired** — `useAuth` + `buildMobileLogEntry` (1:1 copy of desktop `buildLogEntry`) → `logMistakes(uid, entry)`
     → SAME localStorage key + Firestore `learnerProfiles/{uid}/mistakeLogs`. Honest save indicator; only persists when signed in.
  3. **Mobile Me read** — `getMistakeLogs(uid, 30)` + desktop's `mistakeCounts` aggregation → real category mix
     (`{count} of {total} ({pct}%)`) when data exists; honest empty-state otherwise. Minimal read to close the loop (NOT convergence).
  Static gates green; build CI-gated. Report: `report-mobile-check-persistence-2026-06-08.md`.
  Step-5 (failed-grade → error) is preview-testable; steps 2–4 (successful grade → persist → Me) are NOT (gateway dark in prod).

### ⛔ VERIFICATION GATE — do NOT close Track B until the backend round-trip passes
- **[TRACK-B-GATE, blocks "done"] Track B persistence is code-complete + static-green but UNPROVEN end-to-end.** Grading
  (`/api/check-solution`) is dark in production until the Railway/api-server deploy (ISSUE-009 / INFRA-4), so a *successful*
  grade cannot be produced on the Vercel preview — meaning the grade→persist→mobile-Me→desktop-Me round-trip can't be proven
  yet. **As part of INFRA-4 go-live testing, run the real round-trip** (sign in → grade a real answer → confirm it appears as
  real data in mobile Me AND desktop Me on the same uid). Until that passes, Track B is "merged, not fully verified" — do not
  mark it fully done. (Alternatively verify locally against a running gateway: `npm run dev:gateway` + `API_SERVER_PORT=3001`.)

### RESP-DIV-1 — now honest AND wired (end-to-end pending backend)
- **[RESP-DIV-1] status:** mobile Me no longer fabricates (Track A #220) AND now *reads* real mistake data from the shared
  pipeline (Track B #222). The data only actually *flows* once grading is live (backend deploy). So: **honest + wired; real
  data appears end-to-end only post-Railway-deploy.** Closed on honesty; gated on backend for the live loop. Durable Me
  convergence (one responsive component, one pipeline) remains the last RESP-DIV-1-family item.

## 2026-06-09 — Post-PR #220 (Track A: mobile Me honesty) + full responsive-divergence audit

### RESOLVED (stopgap) in #220 — RESP-DIV-1 honesty-patched
- **[RESP-DIV-1] Mobile Me fabricated data → HONESTY-PATCHED (`fix/mobile-me-honesty`, trunk `8c478ce`).** Deleted the
  hardcoded `COMMON_MISTAKES` bars (−12/−8/−5 marks, rendered unconditionally) + the invented weak-topics count
  (`Science?"3":"2"` → honest `"—"`); replaced with branch-on-`user` honest empty-states using desktop Me's verbatim copy
  + an honesty footer. Grep proof: zero fabricated data remains. Gates green; build CI-gated. 1 file (`app/Me.tsx`), +48/−56.
  Report: `report-mobile-me-honesty-2026-06-08.md`. **CORRECTION to the original preview note:** the "Premium" badge is the
  REAL `useSubscription()` label (not fabricated); the actual fabrications were the mistake bars + weak-topics count, now gone.
  **STILL OPEN (coupled):** Track B (mobile Check persistence so real data flows) + the durable convergence — see below.

### The full responsive-divergence audit landed (READ-ONLY) — `report-responsive-divergence-audit-2026-06-08.md`
Mapped every `useIsDesktop()` split (trunk `ac2eedf`). Of 7 split surfaces: 2 MATCH-by-design (Home, Welcome), 2 MATCH by
construction (Exam Trends, Practice Hub), **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets).
Severities normalized to the rubric (mobile-shows-less = functional, not trust-critical). **Phase-2 punch-list in fix order
(trust-critical first):**
1. ~~Mobile Me honesty (RESP-DIV-1)~~ **DONE (#220, stopgap).**
2. **[TRACK B, next] Mobile Check & Improve — trust + persistence.** (a) Fix the permissive failed-grade guard in
   `app/CheckImprove.tsx` (`!result.ok && result.error`) so a failed grade can never render as a valid score
   (trust-critical-potential — confirm whether the grader can return `ok:false` with empty `error`). (b) Wire `useAuth()` +
   `persistMistakeLog(user.uid, …)` so mobile grading actually SAVES — this is the data source mobile Me needs; until it
   lands, mobile Me's honest empty-state is the correct render. **Coupled with RESP-DIV-1 — this makes real data flow.**
3. **[RESP-DIV-2, functional-HIGH] Mobile has NO logout path** (escalated from "no dropdown"). The mobile avatar only
   navigates to `/me`; the mobile Me page has no logout; the only logout button lived in the now-retired `SettingsPage`
   (pre-existing gap, not a #218 regression). Add Log out + Manage subscription to the mobile chrome or Me page (mirror the
   desktop `DesktopShell` dropdown). A signed-in mobile student currently cannot sign out.
4. **[TOPIC-HUB, functional/content] Mobile Topic Hub reconcile.** `app/TopicHub.tsx` "Learn" routes to `/check-improve`
   (concept tutor still unwired); `pages/TopicHub.tsx` builds UNLABELLED synthetic fallback questions
   (`buildFallbackStepQuestion`/`buildFallbackCheckpoint`) recorded to a localStorage "Chapter Mastered" signal. Reconcile to
   the desktop reference+tutor model: wire mobile "Learn" to the tutor; label or drop generated questions; replace the local
   "mastery" claim with an honest progress indicator.
5. **[WORKSHEETS, functional] Mobile Worksheets parity.** Desktop has mistake-intelligence + multi-topic/full-subject +
   save/upload + the Science `stream` filter; `app/Worksheets.tsx` is single-topic-only and its `SCIENCE_TOPICS` is missing
   the `stream` field. Bring the desktop capabilities to mobile. (No fabrication — capability gap only.)
6. **[HOME, functional] Mobile Home real-insights gap.** Signed-in MobileHome never surfaces real mistake insights (honest
   empty-state by the firebase-free boundary). Surface real insights on mobile — requires resolving that boundary (explicit
   architecture decision). The signed-out "Sample" panel is correctly labelled (honest); no change there.
7. **[RESP-DIV-3, cosmetic] Mobile trial ribbon.** Static mobile pill + separate `TrialBanner` vs the desktop interactive
   color-coded pill. Reconcile last.

### DURABLE (post-stopgap) — converge mobile Me into desktop Me
The real cure for RESP-DIV-1 is convergence: fold `app/Me.tsx` into `DesktopMePage` as ONE responsive component sharing ONE
data pipeline (eliminating the parallel mobile page). Larger Phase-2 re-architecture; do AFTER Track B wires the data source.
Minor copy debt to fold in: the mobile worksheet CTA subtitle "targets your weak areas" overclaims the single-topic generator.

## 2026-06-09 — Post-PR #218 (SEVER: disconnect obsolete surfaces)

### NEW — Phase-2 RESPONSIVE DIVERGENCE punch-list (soft-launch blockers; pre-existing, NOT caused by the sever)
Found while verifying #218 on the Vercel preview. Governing principle for all three: **desktop is source-of-truth,
reconcile mobile to it, no invented numbers.** These are the seed of the Phase-2 responsive divergence punch-list
(the next workstream after the sever) — soft-launch blockers, but they did NOT block #218.
- **[RESP-DIV-1, TRUST-CRITICAL] Mobile Me fabricated data — ✅ HONESTY-PATCHED in #220** (see the Post-PR #220 section
  above; the data is now honest empty-states). The mobile `useIsDesktop()` variant had shown fabricated data to a real
  signed-in user (−12 / −8 / −5 marks + invented weak-topics; note the "Premium" badge was actually the REAL subscription
  label). Durable convergence + Track B (real data pipeline) remain open.
- **[RESP-DIV-2, soft-launch] Mobile avatar has no dropdown.** Desktop avatar opens a menu (Me/Progress + Manage
  subscription + Log out); the mobile avatar-initial only navigates to Me — so there is **no mobile path to Log out
  or Manage subscription.** Add the dropdown (or an equivalent mobile affordance). (Subset of RESP-DIV-3.)
- **[RESP-DIV-3, soft-launch] Mobile top-ribbon + avatar diverge from desktop.** Desktop top-bar (source-of-truth)
  has the "Trial active – N days left" pill + the avatar dropdown; mobile shows a different trial-banner treatment
  and a navigate-only avatar (no dropdown, no Log out / Manage subscription path). Reconcile the mobile top-bar to
  desktop. (Supersets RESP-DIV-2.)

### NEW — §7 SEVER RESIDUE (cleanup follow-ups; flagged in the sever report, not stranded silently)
- **[SEVER-RESIDUE-1] MockPaper newly unreachable, kept routed.** `/mock-paper/:slug`'s only entry was the deferred
  `/predictive-papers`; the page is kept routed (harmless — unreachable from live nav) and flagged. Recommend folding
  MockPaper into the `/predictive-papers` DEFERRED-REVIVE family in the "pending redesign into the chapter/full-test
  family" work. Not in the 17 rulings, so not unilaterally retired.
- **[SEVER-RESIDUE-2] Admin-lane `/dashboard` back-links.** `CacheStatsPage`, `FunnelPage`, `QuestionReportsPage`,
  `VisualAuditPage`, `TeacherDashboardPage` (+ a `/trends` quick-link in TeacherDashboard) still point at the removed
  `/dashboard`/`/trends`. Admin is a SEPARATE lane (explicitly out of sever scope); these degrade gracefully to `/`
  via the catch-all. Trivial back-target fixes for a future admin-lane cleanup.
- **[SEVER-RESIDUE-3] `pages/TopicHubHome.tsx`** — a pre-existing orphan (imported by nobody) that links to the
  retired `/trends`. Not in the 17 rulings; left unmarked. Clean-branch candidate.
- **[SEVER-RESIDUE-4] Dead utility exports** `buildTrendsUrl` / `buildStudyPlanUrl` in `utils/buildUrl.ts` now have
  ZERO callers (the last `buildStudyPlanUrl` caller was the removed MockBuilder branch). Harmless; clean-branch removal.
- **[CLEAN-BRANCH, Phase-2] Marker pass.** 46 disconnected files carry `LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3)
  markers. A later clean-branch greps these to delete (retired) / keep (deferred). MockBuilder lines 191/197 also
  carry dead `navState.back.includes("/study-plan")` GUARD checks (not navigations) — harmless, left in place.

### Tooling note
The before/after connectivity-graph merge gate is a reusable tool (`connectivity-graph.mjs` + `connectivity-diff.mjs`
+ `apply-markers.mjs`, in the diff folder). Static React tracing is approximate; two tool bugs were found and fixed
during #218 (route-path declarations miscounted as nav edges; zero-static wildcard matches). Reuse for the next sever
or the Phase-2 clean-branch verification.

## 2026-06-09 — Post-PR #216 (banned-term prose copy-fix) + audit follow-ups

### RESOLVED in #216
- **[BANNED-PROSE-1A]** 3 Tier-1A out-of-syllabus strings removed from the live cockpit (`topics.ts:35` division
  algorithm, `:45` cross-multiplication, `topicHubContent.ts:249` complementary-angles row). Guard can't catch
  these (surface scan omits bare generics). Authority: `report-banned-term-prose-audit-2026-06-08.md` §1A.

### DEFERRED — banned-prose Tier-1B (MOOTED by the upcoming SEVER PR — do not fix standalone)
- **[BANNED-PROSE-1B]** `pages/NightBeforePage.tsx:7` ("Euclid's Division Lemma: a = bq + r" formula) and
  `data/class10ContentConfig.ts:479` (complementary-angles clause, surfaced via `/revision-calendar` +
  orphaned `TopicHubHome`). Both routes are Bucket-B/C in the surface audit — the **sever PR disconnects them**,
  which moots these. **Re-grep after the sever lands; fix only if `/night-before` or `/revision-calendar` is kept.**

### CONTENT-SPRINT punch-list — "clean banned prose during the content sprint" (Tier-2)
Not live today; clean as the content/TopicHub work builds. From `report-banned-term-prose-audit-2026-06-08.md` §2:
- **Periodic Classification practice pack** — `data/promptDPracticePacks.ts:341–~430` (`"periodic_classification"`,
  Mendeleev/Newlands/Döbereiner). **Unreachable now** (no Periodic Classification topic in the live `topics.ts`
  catalog), so the live practice flow never requests it — but it must be cleaned/retired when the Science pack
  set is finalized.
- **Teach contracts** — `tutor/topicTeachContracts.ts:89,93` ("division algorithm" taught). **Imported by nobody**
  (unwired); fix when wiring the TopicHub teach-flow.
- **TopicHub V2 enrichment** — `data/topicHubV2Enrichment.ts:1410,1417` (complementary angles),
  `data/topicHubV2Full.ts:1217` (conversion of solids). Unbuilt TopicHub V2 content.
- **Prediction archetypes** — `prediction/cbseHistoricalArchetypes.ts` (Sources of Energy / natural selection /
  speciation / homologous organ / frustum), `prediction/cbse5SignalScoring.ts:84`, `tutor/diagram/diagramTemplates.ts:536`,
  `data/visualConceptRegistry.ts:158`. **⚠️ HANDLE WITH CARE — these label REAL past papers** (historical truth
  used by the prediction engine); revise the labels without corrupting the past-paper record.
- **Dead-subgraph content** — `data/topicHubContent.ts:29` (cross-multiplication) feeds only the dead `/daily-mix`;
  moot if daily-mix is severed.

### NEXT WORKSTREAM
- **SEVER PR (next, owner sends instruction)** — turn the surface-audit owner-ruling queue (Bucket B confirmed-dead
  + Bucket C rulings) into the kill-list; disconnect mobile `/`/catch-all/command-palette dead-links; touches
  `App.tsx` (forbidden — owner authorizes). Then go-live / Phase 1.

## 2026-06-08 — Post-PR #214 (auth migration PR-4: phone/SMS-OTP — ARC 4/4 COMPLETE)

### RESOLVED in PR-4
- **[AUTH-PR4]** Phone / SMS-OTP shipped: `signInWithPhoneNumber` + invisible reCAPTCHA, 2-step in-pane Phone tab.
  Verified in production-preview with a real-number login (real SMS/OTP, signed in, trial tied to the phone
  account). Root-caused + fixed the reCAPTCHA re-render bug (teardown+rebuild in the same container threw
  "already rendered"; fix = one verifier, render once, **reuse** for send+resend, `.clear()` only on
  logout/unmount/verify-success). **The auth migration arc (PR-1 #206 → PR-2 #208 → PR-3 #210 → scrub #212 →
  PR-4 #214) is CLOSED — Firebase-only end to end.**

### NEW follow-ups (not launch blockers)
- **[SMS-DELIVERABILITY, pre-launch, MEDIUM]** Firebase's default SMS sender lands in **Android spam/junk**, so
  phone-OTP students may never see the code (hit in the #214 real-number test — first OTP was in junk). Durable
  fix needs a **DLT-registered sender header (TRAI/India regulatory regime)**, which likely means routing OTP
  through a **custom SMS provider on the Identity Platform tier** — **verify the exact Firebase mechanism when
  tackling, do not assume**; DLT registration has **operator lead-time, so start early** if phone-OTP becomes
  important. **Priority MEDIUM — not a launch blocker** (Google sign-in is the primary path; phone is the fallback).
- **[OTP-SPAM-HINT, small PR, LOW]** Add a **"check your spam/junk folder"** line on the OTP-sent screen as a
  cheap interim mitigation for the above. Separate small PR (`Login.tsx` only), not now.
- **[D42]** `packageManager` pin — **already tracked below** (HIGH-VALUE, separate hygiene PR); still open.

### Owner / deploy actions pending (carried — next workstream is go-live / Phase 1)
- **[AUTH-ADMIN, BLOCKING]** Bootstrap `ADMIN_FIREBASE_UIDS` (sign in once via Firebase → capture uid → set env)
  — the ONLY way admin routes authorize now (no Clerk fallback).
- **[AUTH-DEPLOY]** `artifacts/api-server` needs `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) in Railway; add the prod domain to Firebase Authorized domains. (Vercel frontend `VITE_FIREBASE_*` now set
  all-scopes — confirmed in #214.)

## 2026-06-08 — Post-PR #210 (auth migration PR-3: Clerk teardown — Firebase-only)

### RESOLVED in PR-3
- **[AUTH-PR3]** Clerk teardown complete: gateway bridge + `clerkProxyMiddleware` deleted; `requireFirebaseAuth`
  Firebase-only; `clerkMiddleware()` unmounted; `@clerk/express` + `http-proxy-middleware` + `jsonwebtoken`/`jwks-rsa`
  dropped (last two transitive under firebase-admin). Zero Clerk in tracked code/config; lockfile `@clerk` = 0.

### NEXT — IN ORDER, both HOLD for owner go, neither auto-merges
- **[CLAUDE-SCRUB, NEXT]** CLAUDE.md governance scrub — §1 stack + §5 doctrine ("Clerk stays for now — K2H-15" is
  now obsolete) + `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md` Clerk notes. Owner has the exact surgical
  instruction. Governance file → owner-reviewed PR, NOT docs-only auto-merge.
- **[AUTH-PR4]** Phone / SMS-OTP (`feat/auth-phone-otp`): fill the phone façade with `signInWithPhoneNumber` +
  reCAPTCHA v2 invisible; wire the Phone tab; live OTP smoke test.

### NOW LOAD-BEARING (no Clerk fallback after PR-3)
- **[AUTH-ADMIN, BLOCKING]** Set `ADMIN_FIREBASE_UIDS` = your Firebase uid — the ONLY way admin routes authorize
  now (else 503 in prod / dev-skip locally).
- **[AUTH-DEPLOY]** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) in Railway — `requireFirebaseAuth` returns 503 without it.
- **[AUTH-DOMAINS]** Add the prod Vercel domain to `lazzyy-topper` Authorized domains (`signInWithPopup`); do a real
  Google-popup sign-in check. Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + local `.env.local`.
- **[ONE-TAP]** Google GIS One-Tap once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided (PR-2 = popup-only).

## 2026-06-08 — Post-PR #208 (auth migration PR-2: frontend on Firebase Auth)

### RESOLVED in PR-2
- **[AUTH-PR2-ADMIN]** Admin allowlist **renamed in code** `ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS` + comment
  updated. *Owner action still pending:* the **value bootstrap** (sign in once via Firebase → capture uid → set
  `ADMIN_FIREBASE_UIDS`); until set, admin routes 503 in prod / dev-skip locally.

### MUST-CARRY into PR-3 (the Clerk teardown) — do NOT lose
- **[AUTH-PR3]** PR-3 (`fix/remove-clerk-bridge`, **HOLD for owner go**): remove the api-server Clerk **fallback**
  branch from `requireFirebaseAuth` (Firebase-only) **and** `@clerk/express` together; unmount `clerkMiddleware()`;
  remove `clerkProxyMiddleware`; delete the gateway bridge (`/api/auth/firebase-token` route + `firebaseAuth.cjs` +
  its `server/index.cjs` wiring); drop `jsonwebtoken`/`jwks-rsa` (gateway); remove Clerk env (`CLERK_SECRET_KEY`,
  `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`). Two package.json changes → lockfile regen in Codespaces.

### Owner / deploy actions pending (not code)
- **[AUTH-DOMAINS]** Add the prod Vercel domain to the `lazzyy-topper` Firebase **Authorized domains** so
  `signInWithPopup` works in prod (localhost already allowed). Also do a real Google-popup sign-in check (couldn't
  be headless-automated; email/password + getToken were runtime-verified Firebase in the Codespace).
- **[AUTH-DEPLOY, INFRA-4]** `artifacts/api-server` requires `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) in Railway.
- **[ONE-TAP follow-up]** Add Google GIS **One-Tap** (floating auto-prompt) once a Web OAuth client ID
  (`VITE_GOOGLE_CLIENT_ID`) is provided — small PR; PR-2 shipped popup-only.

### NEW backlog — own small gated PR (NOT a docs change)
- **[D47, NEW]** Add an `apiServer` lane to `lazytopper/docs/project_memory/governance/repo_boundary_policy.json`
  (e.g. `artifacts/api-server/`) so `artifacts/api-server`-only PRs get a real `scope:guard` PASS instead of
  `[unclassified]`. This is a policy/config change — keep it OUT of docs-only auto-merge PRs; ship as its own
  small gated PR. (Same coverage-gap family as the `artifacts/**` deletes noted under D41 for de-Replit.)

## 2026-06-07 — Post-PR #204 (de-Replit COMPLETE; infra arc closed)

### RESOLVED — D40 (de-Replit PR-B) + D26-arc Replit removal
PR-B merged as **#204** (`5441060`): `@replit/*` packages + `@replit/connectors-sdk` + the 3 non-product
stubs removed atomically with the lockfile regen. Repo is fully `@replit`-free. De-Replit is COMPLETE
(PR-A #199 + PR-B #204). The only Replit-adjacent work left is INFRA-4b (runtime AI-proxy rewiring), tracked
under NEXT_ACTION / the backend deploy — NOT scaffold cleanup.

### STILL OPEN — carry these forward (do NOT lose)
- **[D42, HIGH-VALUE]** add `"packageManager": "pnpm@10.32.1"` to root `package.json` so Corepack enforces ONE
  pnpm everywhere (root cause of the version churn). Small separate PR. Coupled with D43.
- **[D43]** root `preinstall` guard trips on pnpm 11's empty `npm_config_user_agent` on linux — fix before any
  pnpm 11 move.
- **[D44]** ops audits assume `rg` (ripgrep) with no fallback (CI installs it; off-runner they're fragile).
- **[D45]** `feature_file_matrix.mjs` hardcodes owner-local Windows Desktop paths (not CI-portable).
- **[D46, NEW]** `actions/setup-node@v4` uses Node 20 (deprecation track) — bump when convenient.
- **[D31]** `syllabusGuard` generic-phrase blind-spot (polynomials division-algorithm leak) — content debt.
- **Domain** `lazytopper.in` (owner-confirmed) vs the earlier `.app` references — reconcile remaining `.app`
  mentions before the deploy; verify DNS in Vercel before INFRA-4.

## 2026-06-07 — Post-PR #198 (CI activated)

### RESOLVED — D39 (CI relocation + expansion)
CI is now LIVE: `.github/workflows/quality-gate.yml` at the repo root gates the full bar (pnpm frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix) on every PR into trunk + push to it.
Old mislocated `lazytopper/.github/workflows/mojibake-guardrail.yml` deleted. Proven to run AND gate
(probe PR #202 → red on a planted mojibake). Closed by #198 (`9d772cb`).

### UPDATE — D40 (de-Replit PR-B) now UNBLOCKED
PR-B was blocked behind "the #198 lockfile regen". That regen landed as **#201**, and #198's CI proves a
clean `pnpm install --frozen-lockfile` on linux. PR-B is now doable — regen the lockfile in the same linux/
Codespace path #201 used, on **pnpm 10.32.1** (match what CI pins, NOT pnpm 11), and let CI verify. Scope
unchanged (see the #199 section below).

### OPEN — add a `packageManager` pin to root package.json (HIGH-VALUE) [D42]
Root `package.json` declares no `packageManager` field, so different environments resolve different pnpm
versions — the root cause of the #198 pnpm-version churn (Codespace regen used 10.32.1; corepack default
was 11.0.8; pnpm 9/11 mis-handle the lockfile/preinstall guard). Adding `"packageManager": "pnpm@10.32.1"`
makes Corepack enforce ONE version everywhere (CI, Codespace, local). Touches `package.json` (product lane)
→ separate PR. Until then, CI explicitly pins `corepack prepare pnpm@10.32.1`.

### OPEN — root `preinstall` guard is incompatible with pnpm 11 on linux [D43]
The guard `case "$npm_config_user_agent" in pnpm/*)` exits 1 under pnpm 11 on the linux runner because pnpm
11 leaves `npm_config_user_agent` EMPTY for the workspace-root lifecycle script (verified: pnpm 10.32.1 sets
it correctly; pnpm 11 does on Windows-standalone but not linux-workspace-root). Fix the guard (e.g. also
accept an empty agent, or detect pnpm another way) BEFORE any move to pnpm 11. Coupled with D42.

### OPEN — ops acceptance scripts depend on `rg` with no fallback [D44]
`bsre_spike` / `trig_legacy_retire` / `llm_path_audit` / `prediction_bank_health` shell out to `rg` (ripgrep)
and treat "binary missing" identically to "no match" (`(res.status ?? 1) === 1 → []`), silently passing or
failing depending on the check's polarity. CI now installs ripgrep so this is masked, but a node/git-grep
fallback (or an explicit "rg required" assertion) would make them robust off the runner. Low priority.

### OPEN — `feature_file_matrix.mjs` hardcodes absolute Windows Desktop paths [D45]
Lines 11-13 reference `c:\Users\Chetan\OneDrive\Desktop\…\*.docx` — an owner-local `.docx` analysis tool
(`test:feature:file-matrix`) that can only run on the owner's machine; NOT in the CI matrix. If it should
ever be portable/CI-able, make it skip-if-missing or relocate the inputs into the repo. Not blocking.

### OPEN — bump `actions/setup-node@v4` (Node-20 deprecation annotation) [D46]
The CI workflow emits a non-fatal annotation: Node-20 actions are deprecated (forced to Node 24 on
2026-06-16). Bump the action when convenient; not urgent (still runs).

## 2026-06-06 — Post-PR #199 (de-Replit PR-A)

### OPEN — de-Replit PR-B (lockfile-coupled removals) — BLOCKED behind the #198 lockfile regen [D40]
PR-A (#199) removed the lockfile-SAFE Replit scaffold + the dead `lazytopper-app/src` stub. The remainder is
lockfile-coupled and cannot land until the `pnpm-lock.yaml` regen (the #198 blocker) happens in the
linux/Replit env on pnpm 11.x — every item below changes a lockfile input and breaks `pnpm install
--frozen-lockfile` (already red on trunk vs `lazytopper/package.json`; confirmed live during PR-A). PR-B scope:
1. Delete whole workspace packages (all lockfile importers): `artifacts/lazytopper-video/`,
   `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (owner-confirmed non-product Expo native path).
2. Remove `@replit/vite-plugin-*` packages + edit the 3 stub `vite.config.ts` (drop `runtimeErrorOverlay()`
   import/call + the gated cartographer/dev-banner dynamic imports) + drop the 3 `catalog:` entries.
3. `pnpm-workspace.yaml` allowlist cleanup: `stripe-replit-sync` line + `@replit/*` in `minimumReleaseAgeExclude`.
4. Remove the now-orphaned root dep `@replit/connectors-sdk` (its only consumer, `backup-to-drive.mjs`, was
   deleted in PR-A).
5. Reconcile the root `typecheck` (`--filter "./artifacts/**"` still globs the src-less lazytopper-app).
KEEP `artifacts/api-server/` (owner-confirmed real backend). The server Replit AI proxy (Gemini fallback +
the entire Claude path) is a SEPARATE migration (API keys + backend deploy), NOT part of PR-B. Sequencing:
do the #198 lockfile regen first, then PR-B atomic (configs + manifests + lockfile in one).

### OPEN — scope:guard has no lane for infra / `artifacts/**` deletes (coverage gap) [D41]
PR-A's deletes (root scaffold, `artifacts/lazytopper-app/src/**`) all classified `[unclassified]` →
`SCOPE_GUARD_FAIL`, because the boundary policy lanes (`repo_boundary_policy.json`) are anchored to the
`lazytopper/` frame and model no root-level or `artifacts/**` paths. Not a breach (manually verified), but it
means infra/scaffold PRs can't be guard-validated. Follow-up: add an `infra`/`artifacts` lane (or an explicit
`infra` mode) so de-Replit PR-B (and similar) get real classification rather than a blanket FAIL. Governance
JSON deliberately left untouched in PR-A (separate decision).

## 2026-06-06 — Post-PR #196 (3 pre-existing test reds resolved)

### OPEN — CI relocation + EXPANSION (mojibake guardrail mislocated → never runs; activate + gate everything) [D39]
**Finding (corrected twice).** A mojibake guardrail workflow FILE exists at
`lazytopper/.github/workflows/mojibake-guardrail.yml`, but GitHub Actions only runs workflows at the
**repo-root** `.github/workflows/` — this one is in a SUBDIRECTORY, so it has **never executed**
(`gh workflow list --all` and `gh run list` are BOTH empty: zero workflows registered, zero runs ever). It
is dormant. AND even if relocated it ran `npm run check:mojibake` — the 50-capped checker the local gate
also used (now un-capped in #196). So the corruption shipped for TWO independent reasons: CI mislocated
(never runs) + checker blind (cap). The full **test matrix + scope-guard are also not CI-gated** at all.
**This is the right outcome corrected:** the earlier "no CI exists" note was effectively right in OUTCOME,
just because the file is mislocated rather than absent.
**Tracked as its own PR (do NOT slip into a product PR) — relocating activates whole-repo CI gating for the
first time ever, a deliberate infra change with side effects.** That PR should:
1. **First verify the uncapped checker passes clean across ALL of trunk** (it now scans everything for the
   first time — might surface latent corruption anywhere in the repo, not just the two fixed files).
2. **Decide the trigger scope** — the current `on: push: {}` + `pull_request: {}` has no branch filter;
   choose PRs-to-trunk vs all pushes deliberately.
3. **EXPAND, don't just relocate** — since CI is being turned on anyway, gate the full **`test:matrix:all`
   + `scope:guard`** (not only mojibake). Gate everything that matters in one workflow.
Owner-directed scope (2026-06-06).

### RESOLVED — pre-existing test reds fixed (#196) [D38]
The three suites tracked below as D38 are FIXED and GREEN: `test:mojibake` 1/3→3/3 (re-encoded
`circles.proof.ts` + the second corrupted file `maths.caseBased.ts` the diagnosis missed; checker cap
removed so neither stays hidden), `test:prediction:bank-health` 2/4→4/4 (stale → retirement guard + orphan
dead-compute deleted), `test:canonical:generator` 2/4→4/4 (re-pointed to the relocated
`practiceQuestionBuilder.ts`). See CURRENT_STATE / SESSION_LOG (#196) and the residual CI gap in **D39**.

## 2026-06-05 — Post-PR #194 (HPQ Phase 1 — consistency + honesty)

### OPEN — HPQ PHASE 2: content authoring (HIGH; gated `src/data/`, PYQ-sourced, owner-validated) [D36]
Phase 1 (#194) RE-BADGED only — it did NOT add/rebalance content. Phase 2 is the tracked next HPQ task.
Author from real PYQ sources, owner-validated; gated `src/data/` lane (`scope:guard --mode product` + owner
auth). Worklist (from `report-hpq-refinement-audit-2026-06-05.md` §1b/§4/§6 P1+P4):
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** — the deepest "same story" gap (Maths
   has effectively ZERO valid 5-mk LA HPQs): Trig Heights & Distances 5-mk LA; Surface Areas
   combination-of-solids 5-mk LA; Statistics grouped-median 5-mk LA; Triangles similarity/BPT proof
   (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk displacement SA.
2. **Distribution re-weight toward must-crack** — lift Circles (2) + Heredity (4) to adequate; trim/re-tier
   the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and tapers.
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; the only Maths "Section D" item
   is tagged 4 marks (why Maths reads as zero valid 5-mk LA). Fix label/marks/steps.
4. **Backfill 49 competency `solutionSteps`** — the `*-comp-*` entries carry answer+explanation but no
   step-marked working; bring to §13 CBSE step-marking minimums per section.

### OPEN — HPQ confidence model reconciliation (DEFERRED until a confidence UI is designed) [D37]
P2 (#194) RETIRED the dead `deriveHPQConfidence` call (page shows no confidence UI) but KEPT
`prediction/hpqConfidence.ts` + the optional `confidenceScore?/Band?/Rationale?` type fields. The model is
a format/recency-driven 5-signal score with NO blueprint-weight / tier input, so its bands can contradict
the locked tiers (audit §2: Quadratic/Real-Numbers high-roi out-score must-crack Circles/Polynomials at
0% high). BEFORE any confidence badge ships, re-base `compute5SignalScore` on the Exam-Trends axes
(blueprint-weight + 4-year frequency + §4 sub-pattern recurrence) so a band can never contradict a tier.
Do NOT surface any confidence UI until reconciled. No code wired today, so this is latent, not live.

### NOTE — pre-existing test reds surfaced while validating #194 (unrelated; not introduced) [D38] → RESOLVED in #196
While running the HPQ gates, three acceptance suites were already RED on base (verified absent-on-base /
not in the #194 diff), tracked so they aren't mistaken for HPQ regressions: `test:prediction:bank-health`
2/4 (`HighlyProbableQuestions.tsx` never imported `../prediction/bankHealth` / `buildTopicKeySources` — the
test expects a bank-health summary the page doesn't compute); `test:canonical:generator` 2/4 (PracticePage
unified-generator import/fallback checks); `test:mojibake` 1/3 (mojibake in
`src/data/questionBanks/class10/maths/circles.proof.ts`). **RESOLVED in #196** — see the dated
"Post-PR #196" RESOLVED [D38] entry at the top of this file (mojibake was actually TWO files; the residual
CI-gating gap is now tracked as [D39]).

### RESOLVED — scopeGuard monorepo path-prefix bug FIXED (#192) [D32]
The monorepo path-frame bug (see the #190 block below, "scopeGuard broken by the monorepo move") is FIXED.
Root cause: `.git` at repo root + guard run from `lazytopper/` → `git diff` emits `lazytopper/src/...`
while policy rules are lazytopper-relative (`src/`) → every product edit `[unclassified]` → FAIL.
**Fix (Option A, owner-approved):** `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON
untouched) — `detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd;
`toPolicyFrame()` strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the
anchor keep their full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL);
no-blind-spot invariant (fails if classified-count ≠ changed-count); coupled `git show HEAD:./package.json`
(cwd-relative) fix for the scripts-only package.json check.
**⚠️ The `--relative` suggestion was REJECTED:** `git diff --relative` emits only files under cwd → silently
drops tracked changes OUTSIDE `lazytopper/` = a false-PASS blind spot (worse than a false-FAIL). The correct
fix normalizes the classification *frame*, never narrows what the guard sees. Proven FAIL→OK on a product
edit; tracked out-of-tree file still seen+flagged; unclassified → visible FAIL. Gates: tsc 0;
`test:matrix:all` 175/175; build 0; verifier PASS. Trunk `318c6b6`. Follow-ups: D33–D35 below.

### OPEN — scopeGuard: untracked files OUTSIDE `lazytopper/` are invisible (LOW; pre-existing) [D33]
`git diff` (tracked changes) spans the whole repo, so the #192 fix DOES see tracked out-of-tree changes
(exactly the thing `--relative` would have hidden — confirmed in the PR's no-blind-spot proof). BUT
`git ls-files --others --exclude-standard` is **cwd-scoped** by git's design, so **untracked** files
outside `lazytopper/` (e.g. a new file dropped at the repo root) are NOT listed and so not classified.
**Deliberately NOT widened to git-root scope in #192**, because the repo carries an untracked root-level
`.claude/` directory with no policy lane → widening (`git -C <root> ls-files …`) would classify it
`unknown` → a NEW false-FAIL on every run. Trading one false-FAIL for another is not a fix. Revisit only if
root-level untracked lanes are formalized (e.g. add `.claude/` to `localOnly`, THEN widen the ls-files scope).

### OPEN — add scopeGuard unit coverage to the test matrix (LOW; tooling) [D34]
`scopeGuard.mjs` has no automated test in `cd scripts && npm run test:matrix:all` (175/175). It runs
`main()` on import, so a unit test needs an export refactor (guard `main()` behind an `if (import.meta.url
=== ...)` entry check, then export `detectAnchorPrefix`/`toPolicyFrame`/`classifyFile` for testing). #192
relied on live FAIL→OK evidence instead. Add coverage in a future tracked-tooling PR to regression-proof
the path-frame logic.

### OPEN — CLAUDE.md §6 references a stale verifier name (LOW; docs) [D35]
CLAUDE.md §6 validation steps list `node scripts/verify-build.mjs`, which does not exist. The real verifier
is `lazytopper/scripts/verify-production-build.mjs` (used and PASS in #192). Correct CLAUDE.md §6 (and any
agent instructions) to the actual filename so future sessions don't chase a missing gate. (Same gap noted
in the #174/#175/#176 backlog — consolidate.)

## 2026-06-05 — Post-PR #190 (Exam Trends band redesign — 3 collapsible priority bands)

### RESOLVED (by #192 — see Post-PR #192 block above, D32) — scopeGuard broken by the monorepo move
The repo is now a pnpm monorepo (`workspace`) with `.git` at the repo root and `lazytopper/` nested.
`lazytopper/scripts/scopeGuard.mjs` runs `git diff --name-only` (no `--relative`), so git emits
`lazytopper/src/...` while the `product` lane rule in `repo_boundary_policy.json` is `src/`. Result:
EVERY `lazytopper/src/**` product edit is classified `[unclassified]` and the guard FAILs — it currently
green-lights nothing and reds everything in `lazytopper/src`, so it is not a real gate. Observed on #188
and again on #190; both manually verified as non-breaches. ~~Fix (tracked-tooling PR): either pass
`--relative` to the git invocations in `scopeGuard.mjs`, or prefix the policy `product`/`trackedTooling`
lane rules with `lazytopper/`.~~ **FIXED in #192 via path-frame normalization (Option A); the `--relative`
half of this suggestion was REJECTED as a false-PASS blind spot.**

### RESOLVED — re-derive Exam Trends priorities FRESH (was D27) → owner-locked tiers
~~Topic-level priority data stale/untraceable; re-derive tier/trend/marks before the band redesign.~~
DONE: the owner-signed-off `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` (composite model +
2 teacher overrides) is the fresh, traceable basis. Consumed by #190. D27 CLOSED.

### RESOLVED — Exam Trends band-threshold definition → not a computed threshold
~~The band redesign needs explicit numeric/qualitative thresholds mapping tier/trend/marks to a band.~~
RESOLVED by design: bands are owner-signed-off DATA (the locked doc), transcribed verbatim and keyed by
slug — there is NO computed threshold, and nothing is banded on stale data. Closed by #190.

### CARRIED — HPQ-count recheck (MEDIUM)
#190 kept the existing honest HPQ matching (`getHighlyProbableQuestions`, canonical-name match) unchanged;
the locked tiers doc did not alter HPQ data. Counts were not separately re-validated against the new
tiering — still open as a small data-quality recheck. Bundle with any future Exam Trends data pass.

### CARRIED — Exam Trends band screenshots (LOW; PR evidence)
The 360/768/desktop × Maths/Science band-state screenshots specified by the task were deferred (owner
declined for now). Capture on request to complete the #190 evidence packet.

### OPEN — Exam Trends proof tag (LOW; product decision) — carried
The locked prototype's optional "⟨proofs⟩" tag is still omitted (no real `proof` field; inventing it =
fabrication). To add it: add a real `proof` flag to topic data (gated `src/lib/desktop/` lane → explicit
scope) or drop it from the spec.

## 2026-06-04 — Post-PR #188 (content sweep merged; gating syllabusGuard GREEN)

### OPEN — syllabusGuard generic-phrase blind-spot + polynomials teach-contract leak (MEDIUM; follow-up) [D31]
The board-prep surface scan omits bare generics (e.g. "Division Algorithm") to stay false-positive-free,
so out-of-scope content named only by a generic term is not flagged. Concrete leak left untouched by the
#188 sweep (out of the 93-item worklist): the `polynomials` tutor contract in
`src/tutor/topicTeachContracts.ts` (~:79/:87/:91) still teaches the polynomial **division algorithm**
(out of the QUADRATIC-only Polynomials scope for 2026-27). Follow-up: (a) add a precise phrase like
"division algorithm for polynomials"/"polynomial long division" to `SURFACE_BANNED_PHRASES` (carefully,
no over-match), then (b) sweep the polynomials contract. See DISCOVERIES D31.

### RESOLVED — CONTENT SWEEP: the 93-item worklist (DONE #188) [D26/D28 → CLOSED]
~~The CONTENT cleanup remains — the gating guard is RED on a 93-item worklist.~~ **DONE in #188.**
Deleted/rewrote all 93 items: banks Conversion of Solids ×46 (canonical 6520→6474, spreads intact);
surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/trends/topics/
topicHubContent + the tutor contracts. DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate;
marked in-syllabus teach-steps where the `keyIdeas` 4-tuple required them. Gating `syllabusGuard` exits
0, `test:matrix:all` 175/175 (incl. #19). `syllabusGuard.ts`/`predictionTypes.ts` untouched. Trunk
`e0395fc`. D26 (verify → correct guard → sweep) is fully CLOSED. Residual generic-phrase gap → D31 above.

### OPEN — PYQ `solutionSteps` data-quality cleanup (MEDIUM) [D30]
Some PYQ questions carry truncated/garbled `solutionSteps`. Independent of the syllabus sweep — a
later data-quality pass; do NOT bundle into the content sweep. See DISCOVERIES D30.

### OPEN — Notes/Formula template sign-off (product) — carried
The TopicHub concept-spine + Formula Sheet / NCERT Notes rollout needs owner sign-off on the template
BEFORE generation: (a) notes structure; (b) granularity (per-[Concept] vs per-topic); (c) 1 vs 3
worked examples per concept. Define before the Formula/Notes content-generation PR.

### OPEN — stale-branch cleanup (housekeeping) — carried
Delete merged/abandoned remote branches: `feat/syllabus-guard-correct-and-extend` (merged via #186),
`feat/438-mobile-parity`, `feat/desktop-phase-3`, `feat/desktop-pr-e`, + the ~7 stragglers from #180.
(CLAUDE.md forbids auto branch deletion — owner-side cleanup.)

### OPEN — clean banned syllabus content from unguarded files + extend syllabusGuard (SUPERSEDED by #186) [D26]
~~`syllabusGuard` scans the question bank only; banned terms survive in `topicTeachContracts.ts`,
`topics.ts`, `class10ContentConfig.ts`, `practiceFilters.ts`.~~ The EXTEND-guard half is DONE (#186) —
the guard now scans these surfaces. The CONTENT cleanup is the sweep above. See DISCOVERIES D26/D28.

### OPEN — re-derive Exam Trends priorities FRESH (tier + trend + marks) [D27]
Topic-level priority data is stale/untraceable (old 10-yr data + pre-revision syllabus). Re-derive
must-crack/high-roi/good-to-do tier + trend + ~marks against the CURRENT CBSE syllabus + recent paper
pattern (scientific basis) BEFORE the band redesign. See DISCOVERIES D27.

### OPEN — HPQ-count recheck (MEDIUM)
The Exam Trends HPQ counts (from `getHighlyProbableQuestions`, matched by canonical topic name) are
rendered honestly but were not re-validated against the fresh tiering. Re-check counts when the
priority data is re-derived (bundle with D27).

### OPEN — Exam Trends band-threshold definition (after fresh tiering)
The planned Must-crack / High-ROI / Good-to-do BAND redesign needs explicit numeric/qualitative
thresholds that map a topic's (re-derived) tier/trend/marks to exactly one band. Define AFTER the
fresh tiering (D27) lands — do not band on the stale data. See DECISION_LOG (2026-06-03 #184).

### OPEN — Exam Trends proof tag (LOW; product decision)
The locked prototype's optional "⟨proofs⟩" tag was omitted in #184 (no real `proof` field in topic
data; inventing it = fabrication). To add it: either add a real `proof` flag to the topic data
(forbidden `src/data/`/`src/lib/desktop/` lane → explicit scope) or drop it from the spec.

### RESOLVED (by #192, D32) — scopeGuard ergonomics for product PRs (LOW; tooling)
`npm run scope:guard` defaults to `--mode tooling`; product PRs need `--mode product`. ~~Latent path
quirk: `git diff` is repo-root-relative (`lazytopper/...`) while `git ls-files` is cwd-relative
(`src/...`) and the policy lanes are unprefixed (`src/`), so product PRs only classify cleanly with a
cwd-relative diff.~~ The path quirk is FIXED in #192 (`toPolicyFrame` normalizes BOTH `git diff` and
`git ls-files` output into the policy frame). `--mode product` now classifies `lazytopper/src/**` cleanly
without any `diff.relative` workaround. The stale-verifier note (`verify-build.mjs` → real name is
`verify-production-build.mjs`) is now tracked as its own follow-up [D35] above.

### CARRIED FORWARD (unchanged from below)
interactive-handoff wrong-visual fix; mobile concept-tutor wiring; Formula Sheet + NCERT Notes
generation + correctness pass; AI cost/rate-limit hardening (D25); Daily Mix keep/cut; Dashboard→
Home/Me consolidation; 3/19 backlog_1_19 known-red-by-decision; stale-branch triage (PR #180 parked);
check-solution T4 boundary case; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-03 — Post-PR #182 (tutor visible + teaching LOCKED)

### RESOLVED — tutor teaching quality (#181 wiring + #182 LOCKED style)
Teaching is now direct/no-fluff/on-concept with a step-marking offer; on "yes" it self-solves with
per-step `[½/1 mark]` CBSE marking (math verified). Owner live-verified. See DECISION_LOG / D24.

### OPEN — interactive-handoff returns the WRONG visual (MEDIUM; separate PR)
`findVisualForConcept` returned a Height-&-Distance visual when "standard angles" was opened. Must
return the visual for the OPENED concept or NOTHING. B2 already stopped the teach prompt from
narrating "the interactive" — but the visual-selection bug itself is unfixed. Its own PR.

### OPEN — mobile concept-tutor not wired (MEDIUM; separate PR)
Mobile `src/pages/app/TopicHub.tsx` "Learn" is a placeholder routing to Check & Improve — it is NOT
wired to the concept_teach drawer (only desktop is, via #181). The teach PROMPT (#182) already covers
mobile once wired (shared backend). Wire mobile "Learn" → ConceptTeachDrawer in a follow-up.

### OPEN — Formula Sheet + NCERT Notes generation + correctness pass (NEW direction)
Per-topic static Formula Sheet + NCERT-based summary Notes (pre-generated) to right-size the tutor.
Needs a content-correctness pass before shipping. Sequenced into the TopicHub redesign.

### OPEN — AI cost / rate-limit hardening (launch gate) [D25]
Gemini 429 "prepayment credits depleted" hit during testing. Before the student link: add rate
limiting on the gateway, leaner call patterns, and a cost ceiling. Bundle with the Railway deploy.

### CARRIED FORWARD (unchanged)
Daily Mix keep/cut; Dashboard→Home/Me consolidation (3 hardcoded `/dashboard` landings); 3/19
backlog_1_19 known-red-by-decision; stale-branch triage (PR #180, still parked); check-solution T4
boundary case (eval-set note); #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-02 — Post-PR #178 (grading-prompt tightening)

### RESOLVED — check-solution over-classifies as "conceptual" (#178) [D21]
Grading prompt tightened + measured 6/9→8/9 on the T1–T9 matrix; D21/T1 robustly fixed
(silly, never conceptual×2), T7 (missing→null) + T8 (unbalanced→presentation) also fixed,
T2 stays conceptual. See DECISION_LOG (2026-06-02 #178) and DISCOVERIES.md D21.

### OPEN — check-solution T4 boundary case (LOW; eval-set note)
When a student writes the verification VALUES but omits the −b/a comparison, the grader is
~50/50 between `presentation` (attempted-but-format-short) and `missing` (step omitted), even
at temp 0.15 — both defensible; marks always 2.5/3; NEVER conceptual. Accepted as Option 1
(documented). Track in the 40–60-answer eval set; revisit only if it causes student confusion.

### CARRIED FORWARD (unchanged) from post-#176
Daily Mix keep/cut; Dashboard→Home/Me consolidation (SES-04/PRG-03); Mistake Intelligence
wiring; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts` lane); the
3/19 backlog_1_19 reds (known-red-by-decision). See entries below.

---

## 2026-06-02 — Post-PR #176 (scope:guard re-armed)

### OPEN — Daily Mix keep/cut (owner decision pending)
Daily Mix is alive + premium-gated (`/daily-mix/:grade/:subject`), a daily-habit PRACTICE
surface (streak/resume/mastery) — NOT one of the four hooks and NOT mistake/spaced-repetition-
driven. Candidate to retire like the session-player was. Owner KEEP/CUT decision needed.

### OPEN — Dashboard→Home/Me-Progress consolidation (Track A) — 3 hardcoded /dashboard landings
The product has NO Dashboard (retired → Home + Me/Progress), but the repo still hardcodes
`/dashboard` as the post-login landing in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`,
`RootEntry` mobile). Desktop `/` is correct; login-fallback + mobile still go to `/dashboard`.
Fix all three in the consolidation. (The `?redirect=`/`from` priority is already correct — only
the bare-login FALLBACK is wrong.) SES-04 + PRG-03 resolve here.

### OPEN — Mistake Intelligence not yet wired to Me/Progress (future PR)
"Me/Progress shows real memory-intelligence data" is the INTENDED state, not current. Separate
future PR; do not present it as done.

### OPEN — Backlog from #176 (gate hygiene)
- `test:repo-boundary` 1/5: `vitest.config.ts` is tracked but matches no policy lane
  (`all_tracked_files_classified`). Add it to the `product`/`trackedTooling` lane (or fix the
  rule) — deferred.
- `verify-build.mjs` missing from this checkout (CLAUDE.md §6 references it; stale — same gap
  flagged in #174/#175).
- `ci:smoke` downstream steps (build / tutor:eval / lint:ci) unevaluated in #176 (out of scope).
- **Wire `ci:smoke` into CI** so a broken gate fails loudly — the deeper fix (D23); today it runs
  only locally, which is exactly why `2081003` broke a live gate silently.

### CLOSED — 3/19 acceptance reds = known-red-by-decision (do NOT re-investigate)
All 3 are intentional product changes: SES-04 (session-player deleted `b891597` → `/daily-mix`),
PRG-03 (Dashboard rebuilt `c1afcd3` → `TopicMasteryGrid`), PRG-02 (dropped in 8025→700 rewrite
`428e3ac`; TopicHub is the Track A target). SES-04 + PRG-03 resolve in the Dashboard→Home/
Me-Progress consolidation; PRG-02 in the Track A TopicHub redesign. See DECISION_LOG 2026-06-02.

### NOTE — Locked specs are owner/architect-held, NOT in repo
`LazyTopper_Learn_Flow_Spec_LOCKED.md`, `LazyTopper_TrackA_PR_Breakdown.md`,
`LazyTopper_Mistake_Scenario_Map.md` are referenced but not committed here — referenced, not
fabricated. Commit under `handoff/` if the next session needs them as source of truth.

---

## 2026-06-01 — AI gateway live (local) + PR #174 (check-solution parse fix)

### OPEN — check-solution OVER-classifies mistakes as "conceptual" (MEDIUM → PR B) [D21]
Real repro `sol2.jpeg`: a sign-misread from a correctly-factored expression (`(x−4)(x+2)`,
root read as −4 not +4) was tagged CONCEPTUAL — should be SILLY (method understood). The
propagated downstream error (wrong sum-verification) was double-counted as a SECOND
conceptual mistake instead of attributed to the single root-cause slip. Fix = PR B
grading-prompt tightening, MEASURED vs a mistake-scenario matrix. Do NOT hand students a
live link until classification is trustworthy. See DISCOVERIES.md D21.

### RESOLVED — check-solution "could not evaluate" parse bug (PR #174) [D20]
gemini-2.5-flash truncated/wrapped its JSON under maxOutputTokens:2500 with no JSON mime →
unparseable → misleading "clearer image" fallback. Fixed: responseMimeType:'application/json'
+ token cap 2500→8000 + warn-log + honest message. Measured before/after on real images.

### RESOLVED — local dev AI features looked broken (proxy port) [D19]
Vite proxies /api to API_SERVER_PORT||8080, not the gateway's :3001. Start Vite as
`API_SERVER_PORT=3001 npx vite`. Gateway + Vite run separately; nothing auto-spawns the
gateway. See DISCOVERIES.md D19.

### OPEN — verify-build.mjs / "137 guards" referenced but absent in this checkout (LOW)
CLAUDE.md §6 and the A2 instruction reference `node scripts/verify-build.mjs` and a "137
guards" verifier; neither exists at those paths in this checkout. The real build gate is
`npm run build` (Vercel command), which passes. Reconcile CLAUDE.md with the actual repo, or
restore the verifier, so future sessions don't chase a missing gate.

### OPEN — LOCKED specs referenced but not committed to the repo (LOW)
LazyTopper_Learn_Flow_Spec_LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md (and any
New-Session-Brief / Master-Knowledge index) are owner/architect-held and NOT in this repo.
This handoff references them but cannot link to in-repo copies. Commit them under handoff/ if
the next session needs them as the source of truth for Track A/B.

### OPEN — Clerk pk_test_→pk_live_, DPDP/consent for minors, charge path (at student-link time)
Surfaced by the owner clarifications. Resolve before the public student link, alongside the
Railway deploy. Not blockers for PR B (local).

---

## 2026-06-01 — Post-PR #172 (mobile Home polish)

### RESOLVED — mobile /browse was the plain PR-#168 layout, not the locked polish (PR #172)
Rebuilt MobileHome to the owner-locked design (illustrated gradient SVG icons, orient-
before-act order, persistent hints, inspiring SAMPLE Mistake-Intel panel, honest CTA).
Real data only; signed-in Mistake-Intel uses an honest empty state (no invented counts).

### RESOLVED — green browser-chrome banner + near-black 3-tab BottomNav (PR #172)
theme-color #58cc02→navy #0f1b33; BottomNav recoloured to light grammar + 3→5 tabs.

### RESOLVED — double brand bar on signed-out mobile (PR #172 addendum, Option A)
Global public navbar now suppressed on mobile /browse + /welcome via
isMobileSelfChromedRoute (!isDesktop-gated). Each mobile page shows ONE brand bar.

### ACCEPTED CONSEQUENCE — Search dropped from mobile Home (owner-approved)
The global navbar carried Search + Log in; suppressing it on mobile /browse removes the
Search box from mobile Home. Owner approved; NOT re-added. Search remains inside the
product. Revisit only if mobile users need top-level search on Home.

### OPEN — legacy/superseded routes flagged for a deprecation PR (MEDIUM)
From the #172 §D audit (flag-only, nothing deleted): /dashboard→/me, /trends→/exam-trends,
/practice/:g/:s→/practice-hub still resolve to real legacy pages and remain live signed-in
entry points (RootEntry/HomeRedirect send signed-in users to /dashboard). /profile,
/ai-mentor, /mentor, /topic-mock already redirect. /predictive-papers + /highly-probable
= candidate canonical home for a future dedicated Predicted destination (currently routed
via /exam-trends). Separate future PR after owner review.

### OPEN — legacy #58cc02 brand palette (LOW, separate colour-migration PR)
styles.css (~50 hits), styles/tokens.css (--lt-brand-*), favicon.svg, og-image.svg still
use the Duolingo-green #58cc02; the new grammar green is hsl(152,55%,45%). Large blast
radius — deprecate as a dedicated colour-migration PR, not mid-polish.

### OPEN — Predicted card shares the /exam-trends route with "What scores most" (LOW)
Per the canonical-routes constraint, both the trends card and the Predicted card route to
/exam-trends (where the predicted breakdown lives). A future dedicated Predicted page
(/predictive-papers) would split them. Honest today (no fake data); noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #170 (mobile landing)

### RESOLVED — /welcome landing had no mobile layout (PR #170)
Added MobileWelcome (swipe carousel, frozen v4 art) + a viewport switch at /welcome.
Welcome.tsx untouched. Honest trial copy enforced (test asserts "then paid" absent).

### PROCESS — "frozen design" file referenced but absent (carry-forward lesson)
The PR-C prompt pointed at PR_C_mobile_landing.md + carousel_cards_v4_genz.html, which
were not on disk. Correct handling = STOP and request the file; do NOT invent locked
art. Owner supplied PR_C_frozen_carousel_art.md; used verbatim. Apply to future
"frozen design" PRs.

### OPEN — MobileWelcome dot indicator relies on scroll (LOW)
Active-dot tracking uses an onScroll handler (jsdom has no layout, so the test asserts
the scroll-snap CSS contract + 4 dots, not pixel position). Fine on real devices;
noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #168 (mobile Home)

### RESOLVED — /browse cockpit squeezed on mobile (PR #168)
DesktopHome rendered at /browse at all widths with non-reflowing grids. PR #168 added
MobileHome (single-column, on the PR-A primitives) and a viewport switch at /browse.
Desktop render byte-identical. First grammar-primitive consumer (resolves the
"primitives not yet wired into any page" item from #166).

### OPEN — Other DesktopHome grids still desktop-only on mobile-reachable routes? (LOW)
MobileHome covers the /browse Home cockpit. If any OTHER signed-in mobile route ends
up rendering DesktopHome (it currently doesn't — RootEntry redirects mobile), it would
need the same treatment. No action now; flagged for awareness.

### OPEN — Quick-generate fallback derivation duplicated in MobileHome (LOW)
MobileHome re-derives fallbackGrade/fallbackSubject with the same logic as DesktopHome
(a few lines; uses the same real landingMemory). If it grows, lift into a shared hook
(candidate for the PR C usePracticeHub-style extraction pattern). Not fake data.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #166 (grammar primitives)

### RESOLVED — No shared responsive primitives for the mobile work (PR #166)
Pages hand-rolled inline-styled grids with no mobile reflow. PR #166 added
`src/components/grammar/` (Card, TileRow, Pill, SectionHeader) so page reflows (PR B+)
reuse one consistent contract. TileRow reflow is pure CSS (@media max-width:1023px).
Wired into no page yet.

### OPEN — Grammar primitives not yet wired into any page (expected; PR B+)
The primitives exist and are tested but unused. PR B (Mobile Home) is the first
consumer. Until pages adopt them, the live mobile squeeze (e.g. DesktopHome 4-card
row) persists. Tracked in the staged UI roadmap.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #164 (blackbox decommission)

### RESOLVED — Dead blackbox/tracker/pmem tooling removed (PR #164)
The entire dead "memory blackbox" experiment (blackbox + contextpack + tracker
family + pmem-runner + the project-memory-blackbox-ext stub + blackbox.yml + 20 npm
scripts) was removed. No live import existed in src/server/ops. Repo-wide refs now 0.

### RESOLVED — False-green `npx tsc --noEmit` in start:quick / precommit:check (PR #164)
start:quick now runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`;
precommit:check removed; startSafe.mjs fixed to the same real typecheck. The bare
`npx tsc --noEmit` (always exit 0 because root tsconfig has `files: []`) is gone from
the convenience scripts.

### OPEN — Two hook dirs coexist (LOW, cosmetic)
Repo has both root `.githooks/pre-commit` (Windows-metadata cleaner) and
`scripts/githooks/pre-commit` (now lint-only after #164). `hooks:enable` points to
`scripts/githooks`. Consider consolidating to one hook dir in a future cleanup.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #162 (production-build hotfix)

### RESOLVED — Test files swept into the production app compile (PR #162)
PR #160's render-test files (src/test/*) import dev-only packages. tsconfig.app.json
had no `exclude`, so `tsc -b` (Vercel's build) compiled them. Green locally (devDeps
present) but breaks on Vercel where devDeps are pruned (TS2305). Fixed by adding an
`exclude` array to tsconfig.app.json. Vercel preview + production deploy both GREEN.
Lesson locked: gate UI/build PRs on the REAL `npm run build`, not bare
`tsc -p ... --noEmit`; and Vercel preview check is a valid pre-merge prod-build gate.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM → scheduled)
Still present. NOW SCHEDULED as part of PR 0.5 (blackbox decommission): rewrite
`start:quick` to `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and drop
the dead blackbox/contextpack chain from both scripts. See NEXT_ACTION.md.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #160 (render-test infrastructure)

### RESOLVED — No render-test mechanism in lazytopper/ (PR #160)
The app package had no Vitest/Jest, no Testing Library, no jsdom, no `*.test.tsx`,
no `test` script. PR #160 installed it (Vitest 3.2.4 + Testing Library + jsdom),
scoped `vitest.config.ts` `include` to `src/` so the scripts/ guard suite is never
touched, polyfilled `window.matchMedia` in `src/test/setup.ts`, and proved it with
one green smoke test. Future UI PRs can now ship real proof-of-work render tests.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM)
`start:quick` and `precommit:check` call bare `npx tsc --noEmit`, which always
exits 0 (false pass) in this repo. Real app typecheck is
`npx tsc -p tsconfig.app.json --noEmit`. Deliberately left as-is in #160 (out of
scope); slated for the blackbox-decommission PR.

### OPEN — Test-tooling adds dev-dependency tree (LOW, informational)
`npm install` for #160 added 717 packages; `npm audit` reports pre-existing
vulnerabilities in the wider dev tree (none introduced by #160 are actionable in
scope — dev-only test tooling, not shipped to the app bundle).

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it. Add
to `.gitignore` in a future docs-only PR.

---

## 2026-05-26 — Post-PR #150 + #151 (PYQ 2024 Maths re-run + permanent tagging/filter/step-marks fix)

### CLOSED — ISSUE-001 Practice type filters broken (PR #151)
Symptoms (pre-fix):
  - Competency chip returned 0 questions
  - Proof chip returned only 2 questions out of 70+ proof items in bank
Root causes:
  - `isCompetencyBased` not forwarded in CanonicalQuestion → PracticeQuestion mapping
  - Proof predicate matched `fmt.includes("proof")` but format strings are
    "Long"/"Short" since PR #112 (field value "Proof" was retired)
Fix (PR #151):
  - Added `isCompetencyBased: (q as { isCompetencyBased?: boolean }).isCompetencyBased`
    to the mapping in practiceQuestionBuilder.ts:268
  - Broadened Proof predicate at L2 and L3: PRF IDs + `prove that` / `show that` /
    `derive ` anchored text + subtopic regex (proof|identit|tangent.propert|
    geometric.proof) + Long/Short + Analysing + Section C/D safety net
  - Added Section A + Remembering override (3 sites) so recall questions
    never qualify as Competency
  - L2 soft fallback removed — honest empty state when no questions match

### CLOSED — ISSUE-002 Step marks hidden for canonical bank questions (PR #151)
Symptom: "Step marks are hidden because this solution is a guide" banner
showed for all multi-step bank questions, hiding per-step CBSE marks.
Root cause: hasUnsafeWrittenStepMarks fired whenever step marks didn't sum
to the question total, including for valid bank questions.
Fix (PR #151): Added `isCanonicalBankQuestion` boolean
(id present + not "ai-" prefix + solutionSteps non-empty + marks > 1) and
short-circuited hasUnsafeWrittenStepMarks to false for canonical questions.
AI question safety net preserved (still fires for AI questions with mismatched step marks).

### RESOLVED — ISSUE-003 Mojibake in NCERT/Exemplar files
Probe scan (PR #151 session) of all *.ncert.ts + *.exemplar.ts files in
maths/ and science/ returned **0 mojibake hits**. Files were already clean
(likely fixed by a prior PR before this session). No action needed.

### NEW OPEN — ISSUE-006 Hindi PYQ garbled question in bank (P0 — must fix before launch)
Symptom (from PR #151 smoke test on Vercel preview): one PYQ question
renders garbled Devanagari script transliterated to ASCII patterns
(`OgHo$`, `_mZ`, `H$m`, `bE 2 sin`).
Root cause: Hindi-medium PYQ paper extracted without language detection;
Devanagari mojibake'd to ASCII.
Priority: P0 — renders broken text to students
Fix (next small PR — combine with ISSUE-007):
  - Branch: fix/remove-hindi-garbled-pyq
  - Search command:
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"
  - Identify question ID, remove from source pack file

### NEW OPEN — ISSUE-007 Proof filter catches Section A conceptual questions (P0)
Symptom (from PR #151 smoke test): "In a proof, from which side do you start?"
(a Section A recall MCQ about proof technique) appears in Proof filter results.
Root cause: PR #151's broadened Proof predicate matches subtopic keywords
("proof"/"identit"/"tangent.propert") even when the question itself is a
Section A recall MCQ ABOUT proofs, not a proof exercise.
Priority: P0 — pollutes Proof filter with recall questions
Fix (one line each in two files — combine with ISSUE-006 in same small PR):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (~line 485) and
  PracticePage.tsx (~line 290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;
Branch: fix/remove-hindi-garbled-pyq (combined PR)

### NEW OPEN — ISSUE-008 VSA-format doctrine decision (P1)
96 questions in the bank use `format: "VSA"`:
  - 90 in Section B + 2 marks
  - 6 in Section A + 1 mark
These aren't covered by the 7 section×format migration rules in PR #151.
"VSA" (Very Short Answer) is a legitimate CBSE format but doesn't map cleanly
to the current filter chips. Decisions needed:
  - Should VSA questions appear under "Short" in filter chips, or as a separate chip?
  - Should A+VSA+1mk be retagged to A+MCQ+1mk + force options? (only if options exist)
Defer until post-launch UX review.

### Session learnings (carry forward)

- **Smoke test on Vercel preview is mandatory** for filter/UI changes before merge.
  Several violations only surfaced in real usage that audits missed.
- **Section A excluded from Proof predicate**: conceptual questions about a
  technique should never match the technique's own filter.
- **Pack builder group-default section assignment** is the root cause of
  wrong-section questions, not filter code.
- **Hindi-medium PYQ files** can contain garbled Devanagari script —
  extraction scripts must detect and skip non-English content.
- **stash → rebase → pop** is the correct sequence when base advances during agent work.
- **Section×format migration** (Option B Rule 7) is repeatable for future audits;
  script at C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs

### Decisions recorded this session

1. **Filter system redesign (next sprint)**: 2-layer default/advanced
   ("Competency" → "Application & Scenario", Section labels → Mark labels,
   Difficulty moves to advanced panel, Source filter added,
   Section A excluded from Proof)

2. **Pack quality strategy (launch)**: Option B — remove structural outliers
   for launch (Section D + Remembering recall questions, Section A + Short
   without MCQ options), regenerate from stricter prompts post-launch

3. **Academic calendar alignment (confirmed)**: Launch first week of June 2026.
   Primary use case at launch: chapter-by-chapter practice + worksheet generation.
   Filter complexity not needed until September (PT1 season). Full timed mock +
   advanced filter system needed before October (half-yearly).

4. **Tagging doctrine for future content**:
   `isCompetencyBased: true` ONLY if real-world context OR AR/Case format OR
   Analysing+ Bloom — NOT just "Bloom ≥ Applying".
   Proof filter: Section A questions NEVER qualify regardless of subtopic.
   Section assignment: must be per-question editorial judgment, not group default.

---

## 2026-05-25 — Post-PR #137 (P4-S PYQ Science 111 Qs; **P4 phase complete: 214 board PYQs**)

### RESOLVED — P4-S PYQ Science extraction (PR #137)
13 new `science/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
111 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(31/2/x, 31/4/x, 31/5/x) + 4 matching MS files (X_086_31_x_MS_UNSIGNED_ALL SETS,
each covering all 3 sets — split by Paper Code: 31/x/y marker). Section A=37 /
B=23 / C=29 / D=15 / E=7; competency 85.8% avg (range 56-100%); engine
isPYQQuestion() recognises 111/111 via `pyqYear: "2023"` path. Authentic
2,587 → 2,698; spreads 189 → 202; bank 5,415 → 5,526.

### RESOLVED — P4 PYQ phase complete (PR #135 + PR #137)
**214 verbatim CBSE 2022-23 board PYQs across all 26 retained Class 10
topicKeys** (13 Maths + 13 Science). All 214 engine-recognised as PYQ via
populated `pyqYear` path. Authentic progress: 2,484 → 2,698 = **60.0% of
4,500-Q retirement threshold**.

### LOCKED — Pipeline scripts reusable for P4 continuation
P4-M (`p4_*.py`) and P4-S (`p4s_*.py`) pipeline scripts kept in `diff\`.
Reusable for P4 continuation years (2023-24, 2024-25, 2025-26). Key adaptations
locked in P4-S that carry forward:
  - MS "ALL SETS" bundle splitting by Paper Code marker
  - MCQ answer fallback (look up option value from QP when MS gives only letter)
  - Science page footer (`H N H`) stripping
  - Deleted-topic filter coverage (Periodic Classification, Evolution, Sources
    of Energy, Mgmt Natural Resources, Motor/EMI/Generator)

### LOCKED — Permanent PYQ Science source decisions (do not re-evaluate)
P4-S session probed and PERMANENTLY documented:
  - **2022-23 Science USED**: 9 QPs extracted (31/2/x, 31/4/x, 31/5/x)
  - **2022-23 Science skipped — require OCR**: 31/1/1, 31/1/2, 31/1/3, 31/6/1,
    31/6/2, 31/6/3 (scanned image-only PDFs, 0 chars).
  - **Within-paper losses (unavoidable without OCR)**: ~60 questions with
    Hindi-only body, ~50 truncated bodies, 3 broken-option MCQs.

### NEW — `final MS` folder unlocks P4 continuation (HIGH priority, multiple years)
Path: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS`
Contains: official CBSE marking schemes for 2022-2026 (all years).
Unlocks P4 continuation passes for years previously stalled on missing MS.

  - **2023-24 Maths** (13 QPs) + **Science** (7 QPs) — ~230 Qs potential
    Fresh branches: `content/p4-pyq-maths-2024`, `content/p4-pyq-science-2024`
    pyqYear: "2024"
  - **2024-25 Maths** (9 QPs) + **Science** (9 QPs) — ~200 Qs potential
    Fresh branches: `content/p4-pyq-maths-2025`, `content/p4-pyq-science-2025`
    pyqYear: "2025"
  - **2025-26 Maths** (23 QPs) + **Science** (13 QPs) — ~300 Qs potential
    Fresh branches: `content/p4-pyq-maths-2026`, `content/p4-pyq-science-2026`
    pyqYear: "2026"

After typical filter rate (~30-40%): **300-400 more verbatim PYQs estimated**.
Pre-req: probe `final MS` folder first to verify file naming convention and
QP→MS pairing (may differ from 2022-23 series).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type (LOW, **next active**)
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line in the type
+ one-line backfill script setting `isPYQ: true` on all 214 P4-M + P4-S
questions). Once landed, engine isPYQQuestion() recognises PYQs via BOTH the
field AND the pyqYear path (redundant but explicit). Not blocking content
extraction (engine already recognises 214/214 via pyqYear).

### OPEN — K2H-8f UI wire-up (LOW-MEDIUM, **next active**)
Branch `fix/k2h-8f-ui-wire`. File: `practiceQuestionBuilder.ts`. Add
`pyqOnly?: boolean` to builder argument type, pass through to engine's
`generatePracticeSet({ ..., pyqOnly })`. Engine accepts since PR #133; bridge
currently doesn't pass it. Required before PYQ filter chip is end-to-end
usable in practice surface.

## 2026-05-25 — Post-PR #135 (P4-M PYQ Maths 103 Qs)

### RESOLVED — P4-M PYQ Maths extraction (PR #135)
13 new `maths/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
103 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(30/2/x, 30/4/x, 30/5/x) + matching MS 041_30-x-x marking schemes.
Section A=48 / B=15 / C=22 / D=15 / E=3; competency 100%; engine isPYQQuestion()
recognises 103/103 via `pyqYear: "2023"` path. Authentic 2,484 → 2,587;
spreads 176 → 189; bank 5,281 → 5,415.

### LOCKED — `isPYQ` field omission via pyqYear path (P4-M doctrine, also for P4-S)
P4-M instruction Section 3 said "isPYQ: true on ALL". The `CanonicalQuestion`
type in `predictionTypes.ts` does NOT include `isPYQ?: boolean` yet, and that
file is globally forbidden per CLAUDE.md §4. Resolution locked: **omit `isPYQ`
field entirely; populate `pyqYear: "2023"` (or appropriate year) instead**.
PR #133's `isPYQQuestion(q)` helper recognises both paths — 103/103 verified.
**Apply this approach to P4-S Science extraction too.** Once K2H-8f-c follow-up
adds `isPYQ: true` to the type, a one-line script can backfill it across all
P4-M + P4-S files. Don't fight the type system.

### LOCKED — Permanent PYQ Maths source decisions (do not re-evaluate)
P4-M session probed and PERMANENTLY documented these source-availability facts:
  - **2022-23 Maths used**: 9/16 QPs extracted (30/2/x, 30/4/x, 30/5/x).
  - **2022-23 Maths skipped — require OCR**: 30/1/x, 30/6/x, 30-B-5 (scanned
    image-only PDFs; pymupdf returns 0 chars).
  - **2023-24 Maths deferred — MS download needed**: `24 math 1/2/3.pdf` series
    exists locally but no matching MS on disk. Download MS from cbse.gov.in,
    then resume as P4-M continuation.
  - **Within-paper losses (unavoidable without OCR)**: 48 questions where pymupdf
    returned only Hindi-script body; 41 questions with math-symbol-heavy truncated
    bodies; 18 MCQs with broken option sets (duplicates from lost minus signs).
    Total 107 of 342 raw question instances skipped to preserve anti-fabrication.

### OPEN — P4-S PYQ Science extraction (HIGH, **next active task**)
Fresh branch `content/p4-pyq-science`. Sources: `31_x_x.pdf` Science QPs +
`X_086_31_x_MS` marking schemes (confirmed on disk in
`...\CBSE Previous papers\2022-2023\SCIENCE\`). ~150-200 Qs expected after
similar quality filters. ID prefix `PYQ-S-2023-{TOPIC}-{NNN}`. File naming
`science/{topic-slug}.pyq.ts`. Pipeline scripts in `diff\` are reusable:
swap Maths topic classifier for Science; update ID prefix and topic-short
table in `p4_generate_ts.py`; probe FIRST to identify scanned-PDF skips.
Same doctrine as P4-M (pyqYear via isPYQQuestion; pyqSet "1"/"2"/"3";
Section E one-row case-based; anti-fabrication; broken-MCQ filter; skip
deleted topics — Periodic Classification, Evolution, Sources of Energy,
Management of Natural Resources, Motor/EMI/Generator).

### OPEN — 2023-24 Maths MS download then P4-M continuation (LOW)
Manual step: download missing 2023-24 Maths marking schemes from cbse.gov.in.
Once on disk, extract another ~50-100 Qs from the `24 math 1/2/3.pdf` series
as P4-M continuation (separate fresh branch).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line). Unblocks
setting `isPYQ: true` on P4-M + P4-S files via one-line backfill script. Not
blocking content extraction (engine already recognises via pyqYear).

## 2026-05-25 — Post-PR #132 + #133 (P3 Science chapter-wise; K2H-8f PYQ engine fix)

### RESOLVED — P3 Science chapter-wise extraction (PR #132)
13 new `science/{topic}.chapterwise.ts` files + canonicalQuestionBank.ts
registration. 552 questions (252 MCQ from cbjescco + 300 PYQ-style from
cbjesccq). Sources: www.cbse.online / rava.org.in. All 13 retained Class 10
Science topics covered; ch05/14/16 skipped per 2026-27 doctrine. ID prefixes
SCO-S-*/SCQ-S-*. Authentic 1,932 → 2,484; spreads 163 → 176; bank 4,729 → 5,281.

### RESOLVED — K2H-8f PYQ engine filter (PR #133)
Engine-layer hard pyqOnly filter landed; `isPYQQuestion(q)` helper honours
both explicit `isPYQ: true` and populated `pyqYear`. 435 pyqYear-tagged
questions now correctly returned. Test matrix 125 → **134/134 PASS**.
**P4 PYQ extraction unblocked at engine layer.**

### LOCKED — MCQ competency doctrine (CBSE 2026-27)
PR #132 locks this: MCQ defaults to `isCompetencyBased: true` because option
discrimination requires concept application above pure recall (CBSE 2026-27
doctrine). Pure-recall MCQs starting with Define/Name the/List the/Recall/
Match the stay false. Use for all future MCQ extractions.

### LOCKED — Permanent source decisions (recorded in CURRENT_STATE.md)
P3 session probed and PERMANENTLY SKIPPED these sources (anti-fabrication
or quality blockers). Future sessions should NOT re-evaluate:
  - Meridian (no marking-scheme PDFs)
  - NODIA (MS hosted externally on URL)
  - cbjemacq (Sinhala glyph corruption confirmed by probe)
  - Maths Basic 430-x-x (out-of-Standard scope)
  - Chapterwise SOL Aakash (scanned, needs OCR — deferred phase)
  - Old\ folder (superseded duplicates)

### OPEN — K2H-8f UI wiring follow-ups (MEDIUM, 3 small PRs)
PR #133 fixed the engine layer; three UI-side connections remain. Each
independent — can ship separately or bundled.
  a. Wire `pyqOnly` through `practiceQuestionBuilder.ts` (UI-engine bridge)
  b. Fix engine-to-UI mapping that strips `pyqYear`/`isPYQ` fields
  c. Add `isPYQ?: boolean` to `CanonicalQuestion` in `predictionTypes.ts`
Until these land, the engine filter works but the UI chip can't reach it
cleanly. Not blocking P4 content extraction.

### RESOLVED — P4-M PYQ Maths extraction (now PR #135 — see above)
Was OPEN; closed by PR #135 (2026-05-25). 103 verbatim Qs extracted from
9 text-extractable QPs. See top of this file for details and P4-M source
decisions locked.

### OPEN — P4-S PYQ Science extraction — see top of this file
Now the next active task. Same doctrine as P4-M (pyqYear via isPYQQuestion).

### OPEN — Pre-launch quick wins (carry-over from PR #130 cycle)
Still queued, unchanged:
  1. strategyHint Hint button in PracticeQuestionCard (Small)
  2. "Show visual" wiring fix in TopicHub right rail (~20 lines)
  3. Formula sheet tab on TopicHub for 14 seeded topics (Medium)
  4. API gateway fix — vercel.json /api/* rewrite + Railway deploy (High)

### OPEN — Maths chapter-wise (LOW priority, future phase)
`cbjemaco` series (MCQ-only, clean per earlier probe) available but would
add mostly Section A density. Defer unless B/C/D/E coverage from P4 PYQs
proves insufficient.

### OPEN — Chemistry `$` arrow rendering in chapter-wise files (LOW, cleanup)
PR #132 caveat: pymupdf renders `→` as `$` in cbjescco/cbjesccq source
(e.g. `Cu(s) + 2AgNO3(aq) $ Cu(NO3)2(aq) + 2Ag(s)`). Content verbatim from
PDF — anti-fabrication preserved. Optional future cleanup pass could
substitute `$` → `→` where safe, but risks corrupting valid `$` uses.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~135 cumulative questions tagged (PRs #126 + #128 + #130 + #132). Plan
unchanged: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch. PR #132 added ~70 to the backlog from chapter-wise heuristic.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, UNBLOCKED)
P2 APQ + P3 Science chapter-wise complete; AR density pass unblocked.
Target: 2-3 AR per topic for Maths + Science. Source: existing CBSE PDFs
with AR coverage not yet extracted.

### OPEN — Our Environment density (LOW, healthy now)
48 Qs in bank: PR #128 seeded 4 + PR #130 added 4 + PR #132 added 40
chapter-wise. Density now reasonable; no urgent extraction needed.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview. Pre-launch content work.

### OPEN — Branch fix-up incident lesson (LOW, process)
PR #132 session had a silent mid-session branch switch (P3 commit landed
on wrong branch initially, recovered with `git branch -f`). Cause unclear
(possibly VSCode auto-switch). Lesson: verify `git branch --show-current`
before each commit when multiple branches are in flight.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). P4 PYQ
extraction should use the same convention; cleanup pass deferred to P5.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #130 (P2 APQ Science-PQ2; P2 APQ COMPLETE) open items

### RESOLVED — P2 APQ Science-PQ2 extraction (PR #130)
13 Science topic files APPENDED with Science-PQ2 (+49 Qs). 10 OR-pairs as
separate rows; 13 REQUIRES-FIGURE tags. Section breakdown A=20 B=8 C=9 D=6 E=6;
competency 81.6%. No new files; canonicalQuestionBank.ts untouched. Authentic
count 1,883 → 1,932. Bank total (engine-confirmed) 4,729.

### RESOLVED — P2 APQ phase COMPLETE
PRs #119 + #126 + #128 + #130 together extract **284 authentic Qs across 5
official CBSE practice papers** (SQP, PQ1, PQ2, PQ_2022, Science-PQ, Science-PQ2).
All 13 retained Maths topicKeys and all 13 retained Science topicKeys now have
APQ content.

### RESOLVED — content/additional-pq-sqp-2024 branch DELETED (remote + local)
Branch had been squash-merged 4 times (PRs #119, #126, #128, #130), each cycle
requiring a `--force-with-lease` push after rebase onto the new base. Branch
deleted permanently. **Doctrine update applied:** future extraction phases use a
fresh branch name per phase (e.g. `content/p3-meridian`, `content/p4-cbjemaco`).
This eliminates the force-push requirement permanently.

### RECORDED — Tutor / content audit findings (read-only report)
Report: `diff\report-tutor-content-audit-2026-05-24.md`. Key findings now
recorded as new product-PR follow-ups (below).

### OPEN — strategyHint never rendered on any surface (LOW, quick win — promoted)
75 question banks contain authored `strategyHint` content (including all 65
REQUIRES-FIGURE descriptions). No UI surface displays them. Add a "Hint" toggle
in `PracticeQuestionCard` (or equivalent) that reveals `q.strategyHint` when
present. Small product PR.

### OPEN — "Show visual" button broken in TopicHub right rail (LOW, quick win)
Button currently a no-op or routes incorrectly. Wire to the existing visualiser
surface for the active topic. ≈20 lines product PR.

### OPEN — No formula sheet surface (MEDIUM, quick win)
14 topics have seeded formula data in archetypes/predictions but no UI renders
it. Add a "Formulas" tab beside Notes/Practice on TopicHub for those 14 topics.
Medium product PR.

### OPEN — API gateway gap in vercel.json (HIGH, production blocker)
No `/api/*` rewrite in `vercel.json`. AI features return 404 in production. Fix
requires Vercel rewrite + Railway deploy of the backend. High-effort product PR.

### OPEN — P3 Meridian extraction (HIGH, next content task)
~475 Qs across Meridian worksheets + Maths QB (both on disk in gdrive copy).
**New fresh branch:** `content/p3-meridian` (no reuse — per branch-management
doctrine update above). First step: pymupdf cid probe on Meridian PDFs
(3rd-party publisher; cid behaviour not yet tested). Split across 2 agents
(Maths topics / Science topics). ID prefixes: `MRD-*`, `MQB-*`. Same OR-pair +
REQUIRES-FIGURE doctrine as P2 APQ.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview (1 additional topic seeded since
PR #128 noted 12). Pre-launch content work.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~65 cumulative APQ questions (PR #126 + #128 + #130) tagged REQUIRES-FIGURE.
Plan: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch.

### OPEN — Our Environment density (LOW, future extraction)
8 Qs in bank (PR #128 seeded 4 + PR #130 added 4 more). Approaching reasonable
density; future extractions should add more.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, now UNBLOCKED)
P2 APQ phase complete, so the dedicated `.assertionReasoning.ts` extraction
pass is unblocked. Target: 2-3 AR per topic for both Maths and Science.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
Continued from PR #128 cycle: Notes per chapter, Formula sheets (now partially
addressed by quick-win above), Proof library, Tutor drawer audit
(MentorSolveDrawer / ConceptTeachDrawer / TutorDrawerV2). Pre-launch decisions
required.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #128 (P2 APQ continuation) open items

### RESOLVED — P2 APQ continuation (Maths PQ_2022 + Science-PQ) (PR #128)
13 Maths topic files updated with PQ_2022 (+44 Qs). 13 new Science topic files
created from Science-PQ (+46 Qs). All 13 retained Science topicKeys now
have APQ content. Authentic count 1,793 → 1,883.

### RESOLVED — Our Environment had 0 questions in question bank (PR #128)
Carry-over since PR #122 noted Our Environment was registered in topics.ts
but had no bank content. PR #128 added 4 Our Environment questions (3 Section
A + 1 Section B) from Science-PQ. Topic is now seeded; future passes can add
more density.

### CONFIRMED — B/C/D/E density doctrine works (PR #128)
PR #126 (PQ1+PQ2) had B=10, C=12, D=8, E=6 = 36 non-A questions. PR #128
applied the BOTH-OR-variants rule and got B=15, C=15, D=10, E=6 = 46 non-A
questions for similar paper volume. ~28% improvement. Doctrine working —
apply to all future extractions.

### OPEN — Science-PQ2 deferred (HIGH, next session)
P2 APQ finale paper. ~39 Qs + OR variants ≈ 45-50 Qs. Will APPEND to the 13
existing Science topic files (per "one file per topic, combined across papers"
spec). Same branch `content/additional-pq-sqp-2024`, rebase first onto
028d51d3... Text pre-extracted to `diff/_apq_text/`. Agent instruction file
`LazyTopper_Agent_P2_APQ_SciencePQ2_Instruction.md` ready; SHA placeholder
needs updating to current base before upload.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
New deliberation opened in PR #128 cycle — these are pre-launch product
decisions, not content extractions:
  - Notes per chapter (beyond exam tips) — no current surface
  - Formula sheets per topic — data exists in archetypes, no render surface
  - Proof library — proofs exist in P0/P0.5 packs, no dedicated surface
  - Tutor drawer audit — MentorSolveDrawer / ConceptTeachDrawer /
    TutorDrawerV2 don't receive student attempt data; decide keep / repurpose
    / remove before launch
Schedule planning session before next product PR.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~52 cumulative APQ questions (PR #126 + #128) tagged REQUIRES-FIGURE in
strategyHint. Plan: Option B (placeholder images) at launch; Option A (SVG
renders) post-launch.

### OPEN — Our Environment density (LOW, future extraction)
4 Qs is a starting density. Future extractions should add more. Sources
available: NCERT Ch 13 (renamed from Ch 15), Exemplar, future PYQs.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
Unchanged. AR coverage still thin across both Maths and Science. Dedicated
`.assertionReasoning.ts` extraction pass scheduled after P2 APQ completes
(Science-PQ2). Target: 2-3 AR per topic.

### OPEN — TopicHub SEEDED 13/25 only (MEDIUM, content authoring)
Unchanged. 12 topicKeys with bank content do not yet have curated TopicHub
pages. Pre-launch decision required.

### OPEN — strategyHint not rendered on any surface (LOW, quick win)
Unchanged. Many questions have valuable strategyHints (especially REQUIRES-
FIGURE descriptions and CBSE step-marking guidance) but no UI surface renders
them. Quick UI win pre-launch.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix
before P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1") rather
than short form. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production.

---

## 2026-05-25 — Post-PR #126 (P2 APQ Maths PQ1+PQ2) open items

### RESOLVED — P2 APQ Maths PQ1+PQ2 extraction (PR #126)
13 new `.additionalPQ.ts` files (one per Maths topic) created with 76 questions
combined from Mathematics-PQ1.pdf + Mathematics-PQ2.pdf. All 13 retained Maths
topicKeys covered. Anti-fabrication maintained; isPYQ false on all 76; pyqSet
omitted; Section E case-based as one row marks=4. Authentic count 1,717 → 1,793.

### LOCKED — Pack retirement threshold REVISED (4,500 from 6,000)
New decision in PR #126 cycle. Rationale: 5,000+ authentic is sufficient for
CBSE Class 10 prep. At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank
becomes 100% authentic + 100% routable. No OCR phase needed.
Current progress: 1,793 / 4,500 = 39.8%.

### LOCKED — REQUIRES-FIGURE doctrine (PR #126)
Questions referencing PDF diagrams/tables/graphs that don't render in text
tag with `strategyHint: "REQUIRES-FIGURE: [description]"`. ~22 questions in
PR #126 carry this tag. Resolution path: Option B (placeholder image) at
launch, Option A (SVG render) post-launch.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~22 Maths APQ questions in PR #126 + likely many more in upcoming Science APQ
extraction. Plan: enumerate post-launch, batch-resolve via either placeholder
images (faster) or SVG renders (higher quality). Track in a dedicated
follow-up issue when count grows.

### OPEN — B/C/D/E density gap (MEDIUM, doctrine-blocking)
Section A (MCQ/AR) over-represented across all extractions to date. PR #126
showed 40:36 A:non-A split. Future extractions MUST extract BOTH OR variants
for B/C/D/E sections to double non-MCQ density. Bake into all future
extraction agent instructions starting with P2 APQ continuation
(PQ_2022 + Science).

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
AR coverage thin across all extractions. Dedicated `.assertionReasoning.ts`
extraction pass scheduled after P2 APQ completes. Target: 2-3 AR questions
per topic for both Maths and Science. Source: NCERT/Exemplar/APQ/SQP PDFs
with AR coverage we haven't extracted yet.

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Unchanged since PR #124. Our Environment chapter is in scope (Unit V, 5 marks);
topicKey `our-environment` is registered in topics.ts; but question bank has
0 questions tagged to this topicKey. Needs future content extraction covering
food chains, trophic levels, ecosystem interactions, pollution, waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post syllabusGuard 2026-27 doctrine fix (PR #124) open items

### RESOLVED — syllabusGuard incorrectly banned Our Environment subtopics (PR #124)
14 Our Environment ecology strings (Our Environment, Ecosystem, Food Chain,
Food Web, Biodegradable, Non-Biodegradable, Ozone Depletion, Ozone Layer,
Biological Magnification, Energy Flow, Trophic Levels, Trophic Level, Waste
Management, Environmental Problems) removed from Science banned list. Our
Environment is RETAINED in 2026-27 (Unit V, 5 marks, ecology scope).

### RESOLVED — syllabusGuard incorrectly banned Contraception/STDs (PR #124)
12 reproductive-health strings (Reproductive Health, Contraception, Family
Planning, STI, STDs, Sexually Transmitted Infections/Diseases, Barrier
Contraception, Contraception Methods, Reasons for Contraception,
Contraceptive Methods, Birth Control Methods) removed from Science banned
list. Reproductive health is RETAINED in 2026-27 (Ch 8 board scope).

### RESOLVED — 18 reproduction questions wrongly removed in PR #121 (PR #124)
All 18 questions restored from git history at pre-PR #121 commit `0222917e`.
Subtopics retagged to 2026-27-compliant values:
  - "Safe Sex and HIV/AIDS" for STD/HIV/safe-sex content
  - "Family Planning" for contraception/family-planning content
  - "Reproductive Health" for general reproductive-health content

### RESOLVED — Motor/Generator/EMI not tracked in archetypes (PR #124)
New `SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics` array added with
["Electric Motor", "Electromagnetic Induction", "Electric Generator"]. These
topics are taught in 2026-27 but not assessed in the year-end board exam
(Science_SecP1_2026-27.pdf Note for Teachers). Tracked in the prediction
engine; NOT banned in question bank (preserves the 36 formative practice
questions in magneticEffects.exemplar/pack1/pack2).

### RESOLVED — Sources of Energy doctrine cleanup (PR #124)
Sources of Energy was previously matched only as a subtopic-keyword fallback
under Our Environment. PR #124 promoted it to a proper `deletedTopics` entry
in cbseHistoricalArchetypes (Ch 14 is fully deleted from board scope). The
subtopic-keyword fallback was retained as a belt-and-suspenders measure for
any legacy questions still tagged with topic="Our Environment".

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Our Environment chapter is in scope (Unit V, 5 marks), the topicKey
`our-environment` is registered in topics.ts with weight 4, but the question
bank currently has 0 questions tagged to this topicKey. Needs future content
extraction (NCERT Ch 13 of the new numbering, or Ch 15 of legacy numbering)
covering food chains, trophic levels, ecosystem interactions, pollution, and
waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public
launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post-PR #121 open items

### RESOLVED — Reproduction bank syllabusGuard violations (PR #121)
The long-running V1 validation failure carried across PRs #117, #119, #120 is now fixed.
Removed 18 questions across the 3 reproduction banks (4 exemplar + 3 ncert + 11 pack2)
covering deleted Ch8 sub-topics (Reproductive Health, Contraception, STDs).

### RESOLVED — syllabusGuard compound-variant gap (PR #121)
3 questions used compound subtopics ("Barrier Contraception", "Contraception Methods",
"Reasons for Contraception") that slipped past the exact-match guard despite being
entirely about banned topics. Guard extended with these 5 strings (3 actual + 2 defensive
forward-looking variants: "Contraceptive Methods", "Birth Control Methods").

### RESOLVED — Reproduction bank regression coverage (PR #121)
35-test regression suite added at `scripts/src/reproductionBankGuard.test.ts`
(banned variants flagged + retained subtopics clean + substring safety +
multi-banned counted + repo-file regression lock). Wired into both `test:reproduction`
standalone and `test:matrix:all` (now 3 test files, 74 tests total).

### OPEN — ops/ acceptance test: Our Environment chapter assertion (MEDIUM, carry forward)
Unchanged since PR #117. `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs`
(lines 26-30 EXCLUDED_CHAPTER_TITLES; lines 208-218 our_environment_chapter_present_in_scope
assertion) and `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` (lines 226-249
"food chains under Our Environment NOT zeroed") still contradict the doctrine that
Our Environment is fully deleted per CBSE 2025-26. Now the highest-priority follow-up.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions;
PYQ filter returns 0 results when `pyqOnly===true`. Must fix before P5 PYQ extraction.
Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet rather than
the short form ("1"|"2"|"3"). Non-blocking — field is string | undefined. Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore in a future
docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
AI features return 404 in production because vercel.json has no /api/* rewrite.

---

## 2026-05-23 — Post-PR #114 open items

### OPEN — Mojibake in P0.5 case-based + circles proof files (HIGH priority, UI render broken)
Files affected:
  lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts
  lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts
  lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts
Symptom: UTF-8 multibyte sequences rendered as Latin-1 garbage in questionText,
solutionSteps, answer, finalAnswer, explanation, strategyHint. Examples:
`â–³` (should be `△`), `âˆ¥` (`∥`), `âˆš` (`√`), `Â²` (`²`), `Î©` (`Ω`),
`â‚‚` (`₂`), `â†’` (`→`), `Â°` (`°`), `âˆ ` (`∠`), `â‚¹` (`₹`).
Origin: inherited from diff/ source pack files; not introduced by P0.5 merge script.
Action: PRE-P1 byte-level replacement pass. Branch `content/fix-p05-symbol-restoration`,
Low mode, data-only, ~30 min. Must merge BEFORE P1-M (Practise Papers extraction will
produce the same class of garbage if the recipe isn't established first).
Reference: NEXT_ACTION.md has the full replacement table.

### OPEN — pyqSet format inconsistency (LOW priority, carries forward from PR #112)
Still applies. The P0.5 case-based + circles proof files also use full CBSE set codes
(e.g. "30/1/1") in pyqSet rather than the short form ("1"|"2"|"3") that will be used
in P5 PYQ extraction. Non-blocking — field is string | undefined. Normalise during P5
cleanup pass across:
  triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts (P0)
  triangles.proof.ts, trigonometry.proof.ts (P0)
  science.assertionReasoning.ts (P0)
  maths.caseBased.ts, science.caseBased.ts, circles.proof.ts (P0.5)

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
Unchanged from post-PR #112. practiceSetGenerator.ts does not bias pool toward
pyqYear-tagged questions; PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction. Branch: fix/pyq-engine-bias | Mode: Medium.

### OPEN — .claude/ folder not in .gitignore (LOW priority)
Unchanged. Add to .gitignore in a future docs-only PR. Do NOT stage it for any commit.

### RESOLVED — P0.5 pack registration (PR #114)
21 questions registered from 3 diff/ pack files:
  maths.caseBased.ts: 6 Section E case sets (4 marks each; merged from 18 split sub-rows)
  science.caseBased.ts: 5 Section E case sets (4 marks each; merged from 15 split sub-rows)
  circles.proof.ts: 10 (5 Section C Short 3-mark + 5 Section D Long 5-mark)
topicKey normalisation complete (8 keys across 3 files).
"format": "Proof" → "Short"/"Long" applied to circles.proof.ts only (case-based files
use format="Case-Based" which is valid).
Mid-flight V2 blocker (33 mark/section mismatches) resolved via Option 2 restructure:
each split 3-row case set merged into one 4-mark Section E row. Owner-directed.
All 6 validations PASS. Merged as PR #114.
Authentic total: 1,609 → 1,630.

---

## 2026-05-23 — Post-PR #112 open items

### OPEN — P0.5 probe pending (LOW priority, quick win)
Three diff/ pack files not yet probed or registered:
  maths_case_based_pack.ts (~23.8 KB)
  science_case_based_pack.ts (~24.8 KB)
  circles_proof_pack.ts (~18.5 KB)
Expected pattern: same topicKey title-case issue as P0. Same fix.
Expected yield: ~30-80 questions (Section E case-based + circles proofs).
Action: Low mode agent, branch content/register-diff-packs-p05.

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction — otherwise PYQ questions won't surface
via the PYQ filter even after extraction.
Branch: fix/pyq-engine-bias | Mode: Medium

### OPEN — pyqSet format inconsistency (LOW priority, cleanup)
AR files registered in PR #112 use full CBSE set codes ("30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3") that will be used in P5 PYQ extraction.
Non-blocking — field is string | undefined. Normalise during P5 cleanup pass.
Files: triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts

### OPEN — .claude/ folder not in .gitignore (LOW priority)
The .claude/ IDE state folder is untracked (shows in git status).
Add to .gitignore in a future docs-only PR.
Do NOT stage it for any content commit.

### RESOLVED — Pass 1C gdrive unprobed folders
All 6 unprobed gdrive subfolders assessed. Key findings:
  Science/Chapter-wise/: ~1,422 net new Qs — added as P4b to extraction queue
  cbse-papers/PYQ/: 26 READY papers, ~784 net new Qs
  Science/NCERT Examplers 2020/: 100% duplicate — permanently skip
  misc/: English literature only — permanently skip
  Maths/PYQs/: all Basic — permanently skip
  Sample+Preboard: ~199 PDF-extractable Qs — added as P6

### RESOLVED — P0 pack registration (PR #112)
62 questions registered from 4 diff/ pack files.
topicKey normalisation complete.
"format": "Proof" schema issue found and fixed (→ "Short"/"Long").
All 6 validations PASS. Merged as PR #112.

## 2026-05-23 — Post-PR #109 open items

### OPEN — Pack quality audit required (HIGH)
~2,470 existing pack1/pack2/pack3 questions are AI-generated without
source PDF verification. quality-assessment-report.md (in diff folder)
has full details. Decision needed: keep/fix/replace strategy.

### OPEN — PYQ extraction pending
87 text-extractable CBSE papers available (2023/2024/2025).
extraction-report.md documents 220 Triangles+Trig questions already
extracted with symbol stripping issues.
Separate sessions needed: Maths PYQ + Science PYQ.

### OPEN — assertion_reason_pack.ts not yet registered
File exists at C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
Needs schema validation and canonicalQuestionBank.ts registration.

### OPEN — K2H-8f PYQ filter engine fix
practiceSetGenerator.ts does not bias pool toward pyqYear questions.
PYQ filter returns 0 results. Fix after PYQ extraction completes.

### RESOLVED — Maths ch1-14 NCERT+Exemplar extraction
643 questions across 26 files. All wired into engine. PR #109 merged.

### RESOLVED — PR #108 deletionGuard test fix
3 broken assertions fixed. All 29 tests passing.

---

## 2026-05-22 — PR #106 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — re-extracted from correct PDF, but extra eyeball wise)
Priority: **Medium**

### OPEN — PR numbering correction

Handoff previously recorded Science ch8-12 as PR #104.
Actual GitHub PR numbers: **#106** (content) and **#105** (handoff docs).
Priority: **Low** (documentation only)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted, wired, and engine-reachability verified.
PRs #105 (docs) and #106 (content) merged. Base SHA: `dfbf725a362b11a4113ec63f4ecebbaa792848a3`.

---

## 2026-05-22 — PR #104 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Owner should verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — original agent generated 27 questions from training data before mislabelled source was caught; file deleted and re-extracted from correct PDF, but extra eyeball is wise)
Priority: **Medium** (pre-merge)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted across 10 files and wired into `canonicalQuestionBank`. All 5 topicMatches() routing simulations pass against actual topics.ts slugs. Engine reachability live-import test: 296/296 PASS.

### RESOLVED — Ch 13 "Our Environment" inclusion question

Confirmed deleted from CBSE 2026-27. Not extracted. Existing legacy `ourEnvironment.pack1.ts` / `.pack2.ts` retained but not added to.

### RESOLVED — Slug mapping in original Ch8-13 prompt

Original prompt proposed `heredity-and-evolution` and a shared `light-reflection-and-refraction-incl-human-eye-prism` slug for Ch9+Ch10. Neither exists in `topics.ts`. Per Rule 2 (use topics.ts verbatim), all new files use the actual canonical slugs: `heredity`, `light-reflection-and-refraction`, `human-eye-and-colourful-world`, `electricity`, `magnetic-effects-of-electric-current`. Engine routes correctly.

---

## 2026-05-22 — PR #101 + #102 follow-ups

### OPEN — `deletionGuard.test.ts` needs updating

3 assertions in `scripts/src/deletionGuard.test.ts` (lines 110-130) now fail after PR #102 populated `MATHS_DELETED_CHAPTERS_2026_27`. Fix in next small PR before any `pnpm test` run.
Priority: **High** (blocks clean CI)

### OPEN — CI not using pnpm (syllabusGuard never runs in CI)

Both GH Actions workflows use npm; root `preinstall` rejects npm. `syllabusGuard` only runs on manual `pnpm build` locally.
Fix: update workflow yml to use pnpm setup + `pnpm build`.
Priority: **Medium** (post-launch)

### RESOLVED — Clerk OAuth 404 on Vercel preview deployments

Fixed by PR #101. `forceRedirectUrl` now uses full absolute URL with BASE_PATH prefix. Verified working on Vercel after merge.

### RESOLVED — 608 Science ch1-7 questions invisible to engine

Fixed by PR #102. All 608 questions now wired into the canonical bank.

### RESOLVED — topicKey mismatch for Control & Coordination and Reproduction

Fixed by PR #102. Both files retagged to canonical `topics.ts` slugs.

### RESOLVED — Maths syllabus guard missing Constructions chapter

Fixed by PR #102. `syllabusGuard.ts` and `cbseHistoricalArchetypes.ts` both updated and now in sync.

---

## 2026-05-22 — PR #100 follow-ups (post engine wiring + topicKey fixes + syllabus guard patch)

### OPEN — Maths question bank empty (no NCERT/Exemplar extraction yet)

All 13 Maths topics have only pack1/pack2/pack3 questions. NCERT + Exemplar extraction pending (`content/question-bank-expansion-03`).
Priority: **High** (pre-launch content depth)

---

## 2026-05-17 - PR #82 Login polish follow-ups and PR-K2H-6 next stage

Status:
Active follow-ups after PR-K2H-5 / PR #82 merge.

Observation:
PR #82 passed validation and owner Vercel preview QA for the production Login gate. Login now better aligns with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction while preserving real Clerk SignIn, reason-aware prompts, redirect priority, safe redirects, no guest CTA, and no app shell/sidebar/bottom nav.

Action:
- Production launch still requires Clerk production instance / `pk_live` env configuration. Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture a Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control and should not be described as fixed by app UI polish.
- PR-K2H-6 is the recommended next implementation stage: Home/cockpit learning order + Continue repair.
- K2H-6 should make Home/browse cockpit order match Exam Trends -> Practice -> Worksheets -> Check & Improve.
- K2H-6 should repair "Continue where you left off" so it never routes to TopicHub "Topic not found"; if the topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start PR-K2H-6 until this docs-only handoff update is merged.
- Future product prompts must use `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

Parked PRs:
- PR #69 solution provenance / student notices remains open draft and must not be mixed.
- PR #17 diagnostic categories remains open draft preservation-only and must not be mixed.
- Old mobile PRs #1/#2 remain outside the desktop K2H lane unless separately audited.

Operating model:
- Codex should be used for code edits, local validation, screenshots, source diff/report only.
- Owner will use VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GPT remains prompt writer, source/PR auditor, and merge recommender.

## 2026-05-16 - PR #80 follow-ups after frozen landing merge

Status:
Active follow-ups after PR-K2H-4 / PR #80 merge.

Observation:
PR #80 passed QA and implemented the frozen landing page plus Explore-first `/browse` entry. Landing should not be redesigned casually. The next highest-priority visible gap is Login visual parity / auth gate polish.

Action:
- Login visual parity / auth gate polish is the recommended next implementation PR. It must keep real Clerk auth, no guest mode, reason/redirect handling, safe redirects, Explore/sign-in funnel behavior, and improve visual match to the calm split login prototype. Do not alter payment/pricing/practice/HPQ in the same PR.
- Clerk friction / auth strategy remains an open product question. Observed flow can include LazyTopper login -> Google account chooser -> Clerk consent/continuation screen -> product. Short-term: polish Login around Clerk. Long-term: evaluate whether Clerk should remain or whether direct Firebase/Google/phone OTP is better for launch. Do not remove Clerk without a dedicated auth architecture PR.
- Home/cockpit card order follow-up remains. Owner noted logical learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve. Sidebar already better reflects the learning order. Home cards may still need reordering in DesktopHome in a future PR. Do not mix with Login PR unless explicitly approved.
- Pricing visual redesign remains pending. Pricing is functionally safer after PR #78 but visually not aligned with final product grammar.
- Continue where you left off route repair remains pending. It can still route to TopicHub "Topic not found." Future small PR may hide the card when saved topic is not curated, route to Practice Hub/Exam Trends, or map to safe topic slug.
- `/profile` direct-reference cleanup remains pending. PR #78 protects `/profile` via redirect/login handling, but future route-hardening can replace direct `/profile` references with `/me` where appropriate.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified. Normal client UI must never mark premium directly.

Landing doctrine after PR #80:
- Public landing is frozen.
- One primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- Explore opens browse mode for product inspection only; it must not create a fake guest learner.
- Real actions remain action-gated through auth/trial gate where already implemented.

## 2026-05-16 - PR #78 QA follow-ups and frozen landing target

Status:
Active follow-ups after PR-K2H-3 / PR #78 merge.

Observation:
PR #78 passed QA with follow-up. Login/auth/session behavior is safer and functionally correct, but visual and route/content polish remains.

Action:
- Login visual parity remains a follow-up. The right-side Clerk/auth panel should be polished while preserving real Clerk auth, reason/redirect behavior, split layout, and no guest CTA.
- Pricing visual redesign remains a follow-up. Pricing is honest but not yet aligned with final LazyTopper product/landing design grammar.
- Home "Continue where you left off" can route to TopicHub "Topic not found"; hide the card when the saved topic is not curated, route to Practice Hub/Exam Trends, or map to a safe topic slug.
- Remaining direct `/profile` references can be cleaned later; PR #78 protects them through `/profile` -> `/me` redirect.
- Payment gateway is parked. Future payment activation must be server/admin verified; client UI must never mark premium directly.

Historical frozen landing page target before PR #80:
- Superseded by PR #80 implementation. Current doctrine is one primary CTA text `Explore`, CTA below the four cards and above Mistake Intelligence, no Start free trial, no Explore as Guest, and no casual redesign unless owner explicitly reopens landing design.
- No left sidebar on landing.
- One primary CTA only: Explore LazyTopper. Historical note: PR #80 final CTA text is `Explore`.
- Top-right secondary CTA: Sign in.
- Hero headline: Study smarter for CBSE Class 10.
- Visual storyboard over wall of text.
- Product loop shown visually: Exam Trends -> Practice -> Check & Improve -> Mistake Intelligence -> Me / Progress.
- Mistake Intelligence is the emotional/product centerpiece.
- Me / Progress is shown as the connected dashboard.
- Final composition uses layout/style/color/CTA/sign-in treatment from final option and card content/story richness from option 7.
- Landing must stay in sync with overall LazyTopper design grammar: deep navy, soft white, green accent, elegant cards, calm premium CBSE Class 10 study cockpit.

## 2026-05-13 - PR #75 merged; post-K2H-1 follow-ups

Status:
Active follow-ups after PR-K2H-1 / PR #75 merge.

Observation:
PR #75 hardened Practice checked-evidence states and allowed trusted wrong MCQ attempts to feed existing mistake-history evidence for eligible signed-in non-local-session learners. It did not add a broad durable attempt-log model, advanced Practice filters, route/context repairs, sign-in/trial enforcement audit, Mock detail finalisation, or HPQ quality repair.

Action:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

Data-honesty rules:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history remains deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence should be introduced.

PR #69 / K2D warning:
PR #69 / K2D remains separate. Do not merge blindly. Do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12 - PR #73 K2H follow-up seed; superseded by PR #75

Status:
Historical follow-up seed. Current active implementation after PR #75 / PR-K2H-1 is PR-K2H-2 route/context repair.

Observation:
PR #75 / PR-K2H-1 is merged. Next active implementation is PR-K2H-2 route/context repair. PR #75 completed the first checked-evidence hardening slice, but durable Practice evidence, routing, filtering, sign-in/trial, step-solution, Mock, and HPQ quality follow-ups remain.

Action:
- PR-K2H-2 route/context repair:
  - HPQ Build Mock back navigation should return to HPQ, not old Exam Trends.
  - TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Durable MCQ answer-attempt model for correct and wrong attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- Sign-in/trial enforcement pass across learning surfaces.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

## 2026-05-08 - PR #72 final GPT audit pending

Status:
Active before PR #72 review/merge.

Observation:
PR #72 has Vercel preview evidence and manual authenticated HPQ QA recorded, but final GPT owner audit of the GitHub diff and scope is still pending.

Action:
Owner should audit PR #72 diff, validation, QA evidence, and changed-file scope before marking ready for review or merge.

## 2026-05-08 - PR #72 HPQ Browser QA auth/paywall blocked; manual QA substituted

Status:
Recorded QA limitation.

Observation:
Browser Agent verified Practice visual grammar, but HPQ / Exam Trends Browser QA was blocked by the Premium Feature interstitial in guest state. Browser Agent cannot complete magic-link authenticated QA. Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.

Action:
Treat HPQ Browser QA as inconclusive due to auth/paywall limitation, not as product failure. Preserve manual QA evidence in handoff and proceed to final GPT audit.

## 2026-05-08 - Practice Level-3 detail finalisation after PR #72

Status:
Next implementation stage after PR #72 merge.

Observation:
PR #72 handles broad Practice + HPQ visual grammar alignment. Practice still needs a detail pass focused on execution/detail states, CTA hierarchy, question interaction, option interactivity if needed, source/return behavior, responsive polish, and honest unavailable states.

Action:
Start Practice detail finalisation after PR #72 is merged and base advancement is verified.

## 2026-05-08 - Mock pages Level-3 detail finalisation after Practice details

Status:
Post-Practice follow-up.

Observation:
Mock builder / mock attempt / mock review pages need Level-3 desktop grammar and clear lifecycle wording.

Action:
Run Mock page detail finalisation after Practice detail stage. Do not claim mock performance feeds Mistake Intelligence until real graded mock evidence exists.

## 2026-05-08 - HPQ question / solution quality later

Status:
Deferred until after Practice and Mock detail stages unless the product owner reprioritises.

Observation:
Manual authenticated QA found remaining HPQ question, solution, diagram, and completeness issues. These are content/data/quality issues, not PR #72 visual grammar issues.

Action:
Sequence this as audit report first, then data-only structured options normalization, then solution/diagram/cache quality repair.

## 2026-05-08 - PR #72 Vercel / Browser QA state

Status:
Active follow-up before PR #72 merge.

Observation:
PR #72 has a Vercel preview at `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/`. Browser Agent verified Practice visual grammar but could not complete HPQ / Exam Trends QA because guest state hit the Premium Feature interstitial. Product owner manually verified authenticated HPQ on preview.

Action:
Proceed to final GPT owner audit. Do not claim PR #72 is merge-ready until that audit passes.

## 2026-05-08 - Science / Maths HPQ MCQ structured options normalization

Status:
Future data-only PR.

Observation:
Codex read-only Science audit found 29 Science MCQ / AssertionReason items. Structured `options` / `aROptions` exist for 14, and `correctOption` exists for 14. Missing structured option examples include `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, and `sci-light-hpq-1`.

Action:
Create a separate data-only normalization PR for Science and Maths MCQ / Assertion-Reason structured options. Do not invent options in UI and do not modify grading/checking APIs.

## 2026-05-08 - Local gateway and env requirements for HPQ step-solution QA

Status:
Document for future QA.

Observation:
Frontend Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally. If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`. Running `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server. Without `DATABASE_URL` and provider API keys, cache/generation may be limited or stubbed.

Action:
Future local QA for HPQ solution logic must start both frontend and backend gateway and must not treat missing local env as production proof.

## 2026-05-08 - Mock grading to Mistake Intelligence and Me / Progress

Status:
Future product work.

Observation:
PR #72 keeps Add to mock as basket/planning-only. Actual written-and-graded mocks should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Action:
Plan a later evidence-path PR for mock grading output to Mistake Intelligence and Me / Progress. Do not claim this in PR #72.

## 2026-05-08 - PR #69 / K2D remains separate

Status:
Still draft/open/not merged unless live GitHub verification later says otherwise.

Observation:
PR #69 / K2D remains separate from PR #72 and must not be merged blindly. PR #72 must not cherry-pick or absorb K2D code unless explicitly approved.

Action:
Verify live GitHub state before acting on PR #69. Rebase/update and audit separately if it is revived.

## 2026-05-06T00:00:00Z - K2D normalization after K2C

Status:
K2D is the next stage after post-K2C handoff repair and Vercel-Codex setup.

Observation:
K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Action:
Do not start K2D until Vercel setup is complete and /app/ deployment is verified on base d9d0d5df1e9de45df4e555b186903070e7b0e873.
# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

## 2026-05-07 — Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 — Browser Agent cannot complete magic-link auth without inbox access

Status:
Permanent QA caution for trial entitlement testing.

Observation:
Browser Agent could not automate the magic-link email login flow because it lacks access to the email inbox. This blocked Browser Agent from completing full trial entitlement QA for trial/expired/premium states. Manual human QA substituted successfully after signing in with a real magic link.

Action:
For future Browser Agent trial entitlement testing, either: (1) set up a passwordless or test-account-based QA flow for Browser Agent, or (2) document that manual QA is required for magic-link-gated trial testing.

## Active follow-ups after K1B / K1C / handoff setup

### K1B Practice query polish

Status:
Follow-up only.

Observation:
Browser QA reported that one K1B query route may sometimes require one click on the Trigonometry chip before the context bar reflects Trigonometry.

Action:
Re-check later during route/context hardening. Do not block K2A.

### /app/me shell consistency

Status:
Follow-up only.

Observation:
K1C QA noted /app/me sometimes rendered without DesktopShell when directly loaded, while still honest and usable.

Action:
Track for later shell-route consistency pass. Do not block K2A.

### Codespaces Browser Agent access

Status:
Permanent QA caution.

Observation:
Browser Agent can sometimes access Codespaces previews, but can also fail due to certificate, forwarding, port, login, or safe-browsing issues.

Action:
Prefer deployed public preview for Browser Agent. Use manual human QA for Codespaces-only URLs when needed.

### Revised Level 3 improvement prototype

Status:
No canonical finalized prototype.

Observation:
The revised Level 3 improvement prototype could not be finalized. Some experimental prototypes were discarded or considered non-canonical.

Action:
For K2 onward, use product-native specs and QA gates. Use Level 1/2 references for visual grammar and historical Level 3 for behaviour inspiration only.

### AI fallback solution

Status:
Future PR-K2D.

Observation:
A student should not feel a solution availability gap. If stored solution is missing, product should generate a board-style solution through AI, matching the stored solution format.

Action:
Do not implement in K2A. Plan as a separate later PR.

### Tutor and examiner quality polish

Status:
Future K6.

Observation:
Product should be useful from student, tutor, and CBSE board examiner lenses.

Action:
Add tutor/examiner wording and quality checks later, after real worksheet/check/progress paths are grounded.
---

## PR-K2H-6 Continue Repair Decision — Option B

Owner-approved decision: use Option B for the K2H-6 “Continue where you left off” repair.

Saved worksheet memory:
- CTA label: `Continue worksheet plan`
- Route: `/practice/worksheets`
- Preserve `source=home` and `returnTo=/`

Grade + subject memory only:
- CTA label: `Resume with Exam Trends`
- Route: `/exam-trends?subject=<subject>`
- Preserve `source=home` and `returnTo=/`

Profile-only memory:
- Do not show a Continue CTA.

No broad grade/subject-only memory should route to TopicHub.
TopicHub should only be used for resume in a future PR if there is a verified curated topic key or safe topic mapping.

Home primary cards should be ordered:
`Exam Trends -> Practice -> Worksheets -> Check & Improve`

Likely K2H-6 product scope:
- `lazytopper/src/pages/desktop/DesktopHome.tsx`
- `lazytopper/src/lib/desktop/landingMemory.ts`

Read-only inspect:
- `lazytopper/src/App.tsx`
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- `lazytopper/src/lib/desktop/topics.ts`

K2H-6 non-goals:
- Do not touch landing, Login, pricing, Practice internals, HPQ, Mock, TopicHub content, docs/handoff, package/server/env/data in the product PR unless explicitly rescoped.
- Do not redesign Home.
- Do not create fake memory, fake topic history, fake attempts, or fake personalization.
- Do not change `/browse` behavior unless source audit proves it is necessary.
- Do not route to old `/trends/:grade/:subject`.
- Do not hard-code `/app` routes in source.

---

## Post-PR #85 / PR-K2H-6 handoff update

PR #85 / PR-K2H-6 — Home cockpit order + safe Continue repair is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #85: `c5515abf5cf616137391dc02f5e673ecc098baac`
- PR #85 head SHA: `f490a59bb97857e6be484fa288872eb625d69fd6`
- PR #85 merge commit / new base: `a0e540a837cebe21ffdb8537b9da241537f42fd9`

What PR #85 changed:
- Reordered Home cockpit primary cards to: `Exam Trends -> Practice -> Worksheets -> Check & Improve`
- Implemented K2H-6 Option B for Continue/resume behavior:
  - saved worksheet memory -> `Continue worksheet plan` -> `/practice/worksheets`
  - grade + subject memory -> `Resume with Exam Trends` -> `/exam-trends?subject=<subject>`
  - profile-only memory -> no Continue CTA
- Removed broad grade/subject memory routing to TopicHub to avoid TopicHub "Topic not found" risk.
- Preserved `/browse` behavior, no guest mode, no fake memory, and no fake personalization.

Files changed by PR #85:
- `lazytopper/src/lib/desktop/landingMemory.ts`
- `lazytopper/src/pages/desktop/DesktopHome.tsx`

Validation and QA:
- TypeScript passed.
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/`.
- Production verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Local `/app/browse` visual QA passed.
- Vercel `/app/browse` visual QA passed.
- Confirmed card order: `Exam Trends -> Practice -> Worksheets -> Check & Improve`.
- Local `/api/cbse-exam-date?class=10` proxy error remains a non-blocking local backend issue unrelated to PR #85.

Next recommended product stage:
- Pricing visual redesign, no payment gateway yet.

Pricing next-stage doctrine:
- Redesign Pricing so it visually matches the frozen landing, Login, and desktop cockpit grammar.
- Keep pricing honest: manual activation/payment not automated yet.
- Do not add fake checkout.
- Do not add fake premium unlock.
- Do not mark premium from normal client UI.
- Do not implement payment gateway in the visual redesign PR.
- Payment gateway / UPI / manual activation remains a later launch-readiness stage requiring server/admin verification.

Future implementation prompts must start from:
`base/approved-thru-437 @ a0e540a837cebe21ffdb8537b9da241537f42fd9`
