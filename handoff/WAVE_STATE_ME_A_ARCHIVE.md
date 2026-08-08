# WAVE ME-A STATE — updated 2026-08-08 (ME-A controller, live)

TRUNK: **`92cc9fc4e6152c97a1c2cf6e49566b3c6a17644c`** — re-derived 2026-08-08 after #637 merged.
Trunk moved FOUR times during this wave, every time FORWARD ONLY, each confirmed by direct parentage
in `git log origin/base/approved-thru-437`:
`6c94d8f0` → `8d813a41` (#633 docs) → `55d5ee19` (#634 MARKS-1) → `1b50b4fd` (#641 OPS-LIFT-1) →
`92cc9fc4` (#637 MI-CONCEPT-1).

**✅ THREE OF FOUR ME-A LANES ARE ON TRUNK.** Only `#636` (TRENDS-MARKS-1) remains.
**#637 is OWNER LIVE-VERIFIED in production, both directions:** a bank question logged
`concept: "Ammeter Properties"` / `questionId: "ELEC-EXMPLR-11-SA-003"` with `stepDetails` carrying
`mistakeType: "conceptual"`; a Check & Improve free-typed answer logged **neither** field and saved
cleanly. **#641 landed first and the guard lift held — no rework, exactly as OPS-LIFT-1 proved in
advance by running both guards against #637's head.**
**Ancestry checked, not equality** — `git ls-remote` alone cannot catch trunk moving backward.

**✅ MARKS-1 (#634) IS MERGED AND VERIFIED ON TRUNK BY CONTENT** — merged 14:31:24Z,
`mergeCommit.oid` == `55d5ee19` == trunk head, and `marksScored`/`marksAvailable` are present in
`progressStore.ts` at `origin/base/approved-thru-437`. Not taken from the lane's report.

OPEN PRs (`gh pr list --state open`, 2026-08-08):
- **#636** `feat(prediction): shared appearance primitive + expectedMarks (TRENDS-MARKS-1)` — MY LANE, **DRAFT**
- **#635** `docs(ops): commit the agent standing rules` — owner's own, ZERO `handoff/` paths

⚠ **#636 IS BEHIND TRUNK BY TWO COMMITS** (`8d813a41`, `55d5ee19`). Verified:
`merge-base --is-ancestor 8d813a41 <#636 head>` returns FALSE. GitHub still reports `MERGEABLE`, and
**that is exactly the trap** — *a squash merge diffs against the base at MERGE TIME, not against
what the PR authored.* **Update the branch before merging, then RE-DERIVE the CI run from the new
head** — the quoted run `31262071407` verifies head `60769966`, which is not what would land.
Neither commit it lacks touches `prediction/**`, so no content conflict is expected.

## ⭐ HANDOFF LOCK STATUS — RE-CHECKED 2026-08-08 AFTER OPS-LIFT-1

**STILL FREE.** Every open PR (#635–#641) queried with `gh pr view <n> --json files`:
**`handoff-files=0` for all seven.** No handoff PR exists.
➜ Under addendum v1.1 §6 the handoff falls to whoever closes a wave first. **Neither wave is closed
yet** — three ME PRs (#636, #637, #641) and three DPDP PRs (#638, #639, #640) are open drafts, and
merging is the owner's step.
➜ ⚠ **Before opening one: re-run the command, then ASK THE DPDP CONTROLLER FOR ITS BOUNDED
CLOSE-OUT AND WAIT. Do not guess its content.** The ME controller has no direct channel to it; the
owner is the relay.

## (earlier reading, retained) HANDOFF LOCK STATUS — CHECKED BY COMMAND, NOT BY MEMORY

**THE LOCK IS FREE. No handoff PR is open.** Verified:
- **#635 touches exactly one file, `ops/AGENT_STANDING_RULES.md` — ZERO `handoff/` paths.** It does
  not hold the lock.
- **#633 (MERGED, `8d813a41`) was the OWNER'S OWN handoff PR** —
  `docs(handoff): archive waves 4 and 5A, document the wave-state lifecycle`. It touched
  `.gitignore`, `handoff/README.md`, `handoff/WAVE_STATE_WAVE4_ARCHIVE.md`,
  `handoff/WAVE_STATE_WAVE5A_ARCHIVE.md`.
  ⚠ **It is ARCHIVE HOUSEKEEPING, NOT A WAVE CLOSE-OUT.** It did **not** touch `CURRENT_STATE.md`,
  `NEXT_ACTION.md`, `SESSION_LOG.md`, `IMPLEMENTATION_ROADMAP.md`,
  `OPEN_QUESTIONS_AND_FOLLOWUPS.md` or `SURFACE_TRACKER.md`. **The close-out for #629/#630/#632/#631
  is STILL OWED**, and #633 itself now needs recording too.
- ⚠ **Re-run `gh pr list --state open` immediately before opening a handoff PR anyway.** This status
  is a reading, and a reading goes stale.

⚠ **`.gitignore` note:** #633 added `body.json` and `/*.request.json`. **It did NOT add
`handoff/WAVE_STATE_*_LIVE.md` or `handoff/BRIEF_*.md`** — `git check-ignore` returns nothing for
them, so this controller's scratch files in `handoff/` are **untracked but NOT ignored**. They are
invisible to the three lanes (each works in its own worktree with its own working tree), but
**whoever opens the handoff PR must not let them into the diff.**

⚠ PROVENANCE OF ARTEFACTS ON DISK — read before trusting any of them:
- `LazyTopper_Controller_Subagent_Model.md`, `CONTROLLER_MeProgress_v7_Arc.md`,
  `CONTROLLER_ADDENDUM_Context_Safeguards.md`, `LazyTopper_MeProgress_v7_FINAL.html`
  are **CONTROLLER TRANSCRIPTIONS of owner-supplied attachments**, written to disk 2026-08-08
  because none of them existed on disk. They are faithful copies, not the owner's original bytes.
- The addendum on disk is **v1.1**: its §6 was REPLACED per the owner's ruling of 2026-08-08
  (handoff rule is POSITIONAL/per-wave, not "ME owns it"). v1.0 §6 is retained at the bottom of that
  file marked SUPERSEDED / NOT IN FORCE.
- `CONTROLLER_MeProgress_v7_Arc.md` §1 ("#631 is NOT on trunk") is **HISTORY**. It merged.

---

## VERIFIED FACTS (this controller, by command, not by memory)

- `#631` **is on trunk by CONTENT**: `MeProgressPage.tsx` present at
  `origin/base/approved-thru-437`; `pages/desktop/DesktopMePage.tsx` and
  `pages/mobile/MobileMePage.tsx` both **absent**. `gh pr view 631` `mergeCommit.oid` ==
  `6c94d8f0` == trunk head. Merged 2026-08-08T13:26:12Z.
- **`handoff/` is EIGHT commits stale** (re-derived with `git log 9f78ebc1..origin/base/…`).
  Last handoff = `#628` at `9f78ebc1`. Unrecorded since:
  `#629 e0ed7588` FENCE-1 · `#630 a0c9c50b` DPDP-1 · `#632 7786878d` premise-ledger gate ·
  `#631 6c94d8f0` ME-PROGRESS · `#633 8d813a41` wave archives · `#634 55d5ee19` MARKS-1 ·
  `#641 1b50b4fd` OPS-LIFT-1 · `#637 92cc9fc4` MI-CONCEPT-1.
  **`#636` makes NINE when it merges.** ⭐ **Whoever writes the first handoff covers ALL of them.**
- **No handoff PR is open.** Under addendum v1.1 §6 the handoff therefore falls to whoever closes a
  wave first — re-run `gh pr list --state open` immediately before opening one.

---

## LANES

| id | title | allowlist (EXACT PATHS) | status | PR | notes |
|----|-------|--------------------------|--------|----|----|
| MI-CONCEPT-1 | concept + questionId on the mistake log, concept resolved from the id | `services/mistakeIntelligence.ts`, `services/mistakeLogService.ts`, the 6 call sites, 54-line policy layer, new tests | ✅ **MERGED + LIVE-VERIFIED — trunk `92cc9fc4`** | **#637** | 9 files, 252 tests, 5 mutations. Unblocked by #641 with zero rework |
| MARKS-1 | carry marksScored/marksAvailable to RungTrend | `lazytopper/src/services/progressStore.ts` + new tests | ✅ **MERGED — on trunk `55d5ee19`** | **#634** | 2 files, 53 tests, CI 31261581334 PASS, 3 mutations |
| TRENDS-MARKS-1 | shared appearance primitive + expectedMarks | `lazytopper/src/prediction/**` + new tests | ✅ **AWAITING OWNER MERGE — PASS, REFRESHED ONTO TRUNK** | **#636** | head `b78c7343`, contains trunk `92cc9fc4`. 5 files unchanged. **CI 31271031466 PASS** (1611 tests / 127 files / matrix 196). HPQ pin re-proven on the new base. **Live-verify owed before merge.** |
| **OPS-LIFT-1** | lift the MI zero-diff freeze, replace with 5 contract tests | `scripts/ops/check_improve_convergence_acceptance.mjs` + `mistakeIntelligence.contract.test.ts` | **AWAITING REVIEW — PASS (DRAFT)** | **#641** | 2 files, 33 tests, 9 mutations, CI 31267834274 PASS. ⭐ **PROVED #637 GOES GREEN AS-IS** — see below |
| *(scout)* | enumerate `isChapterEchoSubtopic` over-match across the whole bank | *(wrote nothing)* | ✅ **RETURNED — D2 PRECONDITION SATISFIED** | — | 8,543 questions / 1,914 distinct subtopics enumerated; **14 matches, ALL echo, ZERO real** |
| ARRIVAL-1 | — | — | WAVE ME-B, not mine | — | needs MI-CONCEPT-1 on trunk |
| RETRY-1 | — | — | WAVE ME-B, not mine | — | needs questionId on trunk |
| ME-2 | the v7 page | — | WAVE ME-C, not mine | — | needs all three ME-A lanes on trunk |

## ⚠ CROSS-ARC COUPLING — EXACT-PATH DISJOINT, SEMANTICALLY COUPLED

The DPDP arc is now visible: **#638 ERASE-1** (server only), **#639 USERS-1**
(`AuthContext.tsx`, `learnerAccountService.ts`, `studentDataMap.ts`), **#640 CLEARTEXT-1**
(five new `*.uidOnly.test.ts` files). **No exact-path collision with any ME lane** — OPS-LIFT-1
confirmed this against *every* open PR, and CI `Lane Overlap` agrees.

⚠ **But #640 and #637 both concern `mistakeIntelligence`, and `lane_overlap.mjs` cannot see that.**
`#640` adds `mistakeIntelligence.uidOnly.test.ts` asserting *only the uid reaches the localStorage
sinks*; `#637` **changes what that module writes** (adds `concept` and `questionId` to the entry).
The new fields are not PII, so no conflict is expected — **but expectation is not evidence.**
➜ **WHICHEVER OF #637 / #640 MERGES SECOND MUST BE RE-CHECKED AGAINST THE OTHER**, not merely
re-run. Exact-path disjointness is the only thing that was proven here.
➜ Note also that `#641` amends the ops guard's FORBIDDEN lists. **No DPDP PR touches `scripts/ops`**,
so there is no contention on that file.

## DISJOINTNESS — verified by EXACT PATH 2026-08-08

- MARKS-1: `lazytopper/src/services/progressStore.ts` (+ its own new test files) — **exclusive owner**
- TRENDS-MARKS-1: `lazytopper/src/prediction/**` (+ its own new test files) — **exclusive owner**
- MI-CONCEPT-1: `lazytopper/src/services/mistakeIntelligence.ts`, `mistakeLogService.ts`, and the
  enumerated call sites
- Scout evidence for the only two paths that could have collided:
  - `progressStore.ts` in the recordMistake call-site set: **NO** — it is a READER
    (`getMistakeLogs`), it never calls `recordMistake`/`logMistakes`.
  - `prediction/**` in that set: **NO** — zero hits for `recordMistake|mistakeLog|MistakeLogEntry`.
- ENFORCEMENT written into every brief: if a lane finds it needs a path owned by another lane, it
  **STOPS AND REPORTS**; it does not edit and does not negotiate.
- `lazytopper/src/data/**` (incl. `predictionTypes.ts`, which declares `CanonicalQuestion.subtopic`)
  is **globally forbidden** — CLAUDE.md §4. No lane may touch it.

---

## SCOUT FINDING — MI-CONCEPT-1's SPEC PREMISE IS DISPROVED (UNVERIFIED BY CONTROLLER)

Reported by the disjointness scout at SHA `6c94d8f0`. **The controller has not verified any of this
and it must be passed on at the confidence it arrived with.**

The arc file §0 asserts: *"`CanonicalQuestion.subtopic: string` is required, so every one of the 8
write sites already holds `q.subtopic`. Gaps 1–3 are field-plumbing, not new aggregation."*

The scout reports that is **FALSE at all six production call sites**:

| call site | what it actually holds | concept available? |
|---|---|---|
| `components/question/SolutionChecker.tsx` (TWO calls) | scalar props `question/marks/subject/topic/questionId?`; bank `q` is one level up in `PracticeQuestionCard.tsx` and **not forwarded** | only by adding a prop |
| `pages/desktop/DesktopCheckImprovePage.tsx` (TWO calls) | free-typed / OCR C&I text | **no — correctly absent** |
| `services/worksheetGradeService.ts` | `PersistedWorksheetQuestion` — topicKey/topicLabel, **no subtopic** | no |
| `services/fullMockGradeService.ts` | same projection | no |
| `services/chapterTestGradeService.ts` | same projection | no |
| `services/quickPracticeSessionService.ts` | `QuickPracticeSavedAnswer` — **no subtopic** | no |

Also reported: **6 files / 8 occurrences**, not "8 sites". Five in-repo comments asserting
"recordMistake has five callers" are **stale**. `RecordMistakeContext.questionId` **does** exist and
is **optional**, and `buildEntry` **does not** write it through (used only for dedup and the
weak-area bridge) — so **gap 2 is confirmed exactly as specced**. `CanonicalQuestion.subtopic` **is**
required, in `data/predictionTypes.ts` — a **globally forbidden** file.

**Consequence:** concept cannot reach the four grade-service paths without `subtopic` being carried
on the **persisted shapes** (`PersistedWorksheetQuestion`, `QuickPracticeSavedAnswer`) and their
producers. That is a persisted-shape migration, not field-plumbing — and it inherits the standing
rule *test the migration FROM THE OLD SHAPE, not from clean*.

---

## DECISIONS MADE THIS WAVE

1. **Wrote all four owner attachments to disk before any dispatch** — `AN ATTACHED DOCUMENT IS NOT A
   FILE`; none of them existed on disk and the prototype is ME-C's only authority for flow/copy.
2. **Transcribed the addendum as v1.1 with §6 replaced**, v1.0 §6 retained marked NOT IN FORCE —
   because a superseded rule left in place reads as current, and this one names a controller that
   cannot outlive its author.
3. **Scouted the call-site set instead of assuming the brief's "8 write sites"** — the arc file itself
   says RE-DERIVE, and `ENUMERATE THE SET; DO NOT GREP A MEMBER`. It cost one subagent and it caught
   a false premise that would have been discovered mid-build.
4. **Dispatched MARKS-1 and TRENDS-MARKS-1 without waiting for the MI-CONCEPT-1 ruling** — both are
   unaffected by that ruling under every option on the table, and both are verified disjoint from it
   by exact path. Idling two lanes on a question that does not touch them buys nothing.
5. **Did NOT unilaterally narrow MI-CONCEPT-1.** Scaling scope down is the owner's call. The
   compounding argument for dispatching it first survives the scout's finding — only the mechanism
   is wrong — so the ruling was put to the owner immediately rather than deferred.
6. **Told both lanes NOT to run `test:matrix:all` locally** — it is CI-only on this box; two
   concurrent runs have OOM-killed the editor, and two lanes are running in parallel.
7. ⭐ **OWNER RULING 2026-08-08 — MI-CONCEPT-1 takes "option 4", none of the three the controller
   offered: RESOLVE CONCEPT FROM THE QUESTION ID AT RECORD TIME.** The owner confirmed the scout's
   finding and that the spec was wrong — *"§3 said CanonicalQuestion.subtopic is required, so every
   write site holds q.subtopic — true of the bank question, false of what's persisted and replayed
   at grade time."*
   **The reason it beats all three offered options, in the owner's words:** the persisted shapes
   already carry what is needed — `PersistedWorksheetQuestion.id` and
   `QuickPracticeSavedAnswer.questionId` (documented in-repo as *"The real bank question id"*). So a
   small memoised **id → subtopic index over `canonicalQuestionBank`** closes gap 1 **completely
   this wave, including the four grade paths** (beats the 1a/1b split: no split, no waiting), with
   **no persisted-shape change at all** (beats the widened lane: the old-client-state migration that
   broke production past 1,082 green tests in Wave 4 never happens), and **nothing logged meanwhile
   stays unattributable** (beats narrow-only).
   **Four rules on the lookup, carried verbatim into the brief:** pure read, memoised, built once,
   never writes · prefer `q.subtopic` when in hand, resolve from the id only where it isn't ·
   ⭐⭐ **returns the bank's subtopic VERBATIM — never re-derived, never normalised**, because a
   second resolution is a second vocabulary (`quickPracticeSessionService.ts:335-339` already warns
   of this — `[FU-PROG-TOPIC-KEY-MISMATCH]`) · ⭐ **an unresolvable id yields NO concept — never a
   guess, never a topic-level fallback.** Withheld and deleted questions will not resolve, and
   absent is honest where approximate is not.
   Check & Improve is unchanged: free-typed answers are not bank questions, so no id and no concept.

## ⭐ OWNER RULINGS — 2026-08-08, all four decisions

**D1 — (a) SEPARATE OPS LANE. Dispatched as `OPS-LIFT-1`. #637 needs no rework.**
The owner read `check_improve_convergence_acceptance.mjs` on trunk `55d5ee19` himself. **The guard
documents its own amendment procedure and two precedents for exactly this.**
- `:497` is the **FORBIDDEN zero-diff array**. `:633` is a **separate unconditional membership
  assertion** that exists so a shallow checkout still proves the guards are wired.
- The comment above `:633` says it outright: ⚠ *"THE LIFTED ENTRY'S LINE MUST LEAVE THIS LIST TOO —
  a removal from FORBIDDEN alone would fail the gate on its own amendment."* **The guard anticipates
  being lifted and tells you how.**
- Two prior lifts are recorded in the same file with reasoning: **`checkSolution.cjs` (Wave 3 PR-C1)**
  and **`DesktopShell.tsx` (PR-B1)** — both replaced a blanket ban with targeted tests **whose
  presence and wiring are asserted**, so a lift *"cannot decay into no protection at all."*
- The lane was right to stop rather than edit outside its allowlist, and right that routing around
  the guard would create a second MI writer into the store the tutor reads.

> ⭐⭐ **THE ONE THING THE OPS LANE MUST GET RIGHT — FORBID-1 GOT IT WRONG AND IT COST FOUR DAYS.**
> **A guard replacing a blanket ban pins what the ban PROTECTED, not what the file did that day.**
> FORBID-1 asserted a CTA was enabled — **true on the day, unrelated to the ban**, and it **blocked
> GATE-2 four days later.**
> ➜ The replacement tests pin **the MI contract**, not the new fields: `recordMistake` is the
> **single writer** into the log · the **four-type taxonomy is exactly those four** · **`marksLost`
> accounting** · **one entry per graded question, never N** · **careless types never surface as a
> topic weakness**. **Mutation-verify each.**
> ➜ ⛔ **A test asserting "`buildEntry` has a concept field" IS the FORBID-1 mistake repeated.**
> ➜ **Remove the entry from BOTH lists in the SAME PR** — the guard fails on its own amendment
> otherwise.

**D2 — (a) RATIFY chapter-echo suppression, WITH ONE CHECK FIRST.**
⭐ **The controller's reversibility argument was only half true, and the owner corrected it:**
worksheet, full-mock and chapter-test store **synthetic ids** (`ws:`/`fm:`/`ct:`), so for those
three paths **a suppressed concept CANNOT be recomputed from the log. Reversible for Quick Practice
only.**
➜ **REQUIRED BEFORE RATIFICATION:** enumerate what `isChapterEchoSubtopic` **actually matches across
the WHOLE bank** and **prove zero real subtopics are caught. ENUMERATE; DO NOT SPOT-CHECK.**
**If it over-matches even one, we lose real data irreversibly on three paths.**

### ✅ PRECONDITION SATISFIED — scout result at `55d5ee19` (scout imported and ran the REAL exported symbol, no reproduction)

`isChapterEchoSubtopic` (`services/progressBankIndex.ts`) matches exactly three things:
empty/whitespace-only · **exact** `general` (trim+lowercase) · **prefix** `chapter practice`.

- **Enumerated 8,543 questions / 1,914 distinct subtopic values** — the whole filtered bank.
- **14 values match. ALL 14 are ECHO. ⭐ ZERO REAL SUBTOPICS CAUGHT.**
  `"General"` ×224 (spread across 25 topicKeys — a cross-chapter PYQ catch-all, not a concept) plus
  13 `"Chapter Practice — <chapter>"` values totalling 549 questions. **773 / 8,543 = 9.05%
  suppressed.**
- **Near-misses: none of consequence.** Exactly one non-matching value contains the word "general" —
  `"AP: nth Term and General Term Formula (Applications)"` ×1 — and the predicate uses **exact
  equality, not substring**, so ⭐ **it is safe BY CONSTRUCTION, not by luck.** Zero values have
  leading/trailing whitespace, double internal spaces, NBSP or zero-width characters.
- **Sensitivity:** case-**in**sensitive · outer-whitespace-**in**sensitive · dash-**in**sensitive
  (em-dash, en-dash, hyphen, colon and bare `"Chapter Practice"` all match, because the dash falls
  after the matched prefix). **Brittle where it does not matter today:** inner double-space, NBSP,
  `"Chapter-Practice"` and British `"Chapter Practise"` all return false — **and the bank contains
  zero of those.**

➜ **D2 RATIFICATION IS UNBLOCKED ON THE EVIDENCE THE OWNER ASKED FOR.**

### ⚠⚠ THE SCOUT CONTRADICTS THE OWNER'S IRREVERSIBILITY CORRECTION — UNRESOLVED

**Reported by the scout; NOT verified by the controller; and the scout itself says to confirm it.**

The owner corrected the controller that suppression is **irreversible** on the worksheet / full-mock
/ chapter-test paths because they store synthetic `ws:`/`fm:`/`ct:` ids. **The scout reports that
may not hold:** at the predicate's existing call site, `conceptForQuestionId` returns null for
synthetic ids, and the worksheet/CT/FM path in `progressStore.ts` **deliberately reads REAL bank ids
out of `record.questionIds[]` (paper order), not the synthetic attempt id.** If `#637`'s mistake-log
write does the same, **the suppression is reversible on those three paths too.**

⚠ **The scout verified the PREDICATE, not `#637`'s wiring** — the mistake-log use does not exist on
trunk, and at this SHA the predicate has **exactly ONE production call site**
(`progressStore.ts` → `buildConceptSectionRungs`), which is **not** the mistake log.
➜ **MUST BE CONFIRMED AGAINST `#637`'s ACTUAL DIFF before anyone records "irreversible" as fact.**
Assigned to the lane that re-pushes `#637`. **The ratification decision is unaffected either way —
reversibility only makes it safer — but the REASON must be corrected in the record, because the
reason is what the next lane inherits.**

**D3 — (a) HOLD THE PIN. But the FU is sharpened from "follow-up" to LIVE CORRECTNESS DEFECT.**
A 37% HPQ ranking change does not ride inside a lane told to pin HPQ, and it deserves its own
live-verify. Canonical strategies staying built-but-not-default means flipping later is **config,
not rebuild** — the correct shape.
➜ ⭐ **Log it as a LIVE CORRECTNESS DEFECT, not a follow-up.** `legacyFuzzyMatch("Circles","Areas
Related to Circles") → true` conflates two distinct CBSE chapters **in production today**, and
**predictions for each are contaminated by the other's evidence.**
➜ ⭐ **CONNECT IT:** the owner previously flagged `fuzzyMatch` in the trends audit as a **silent-MISS**
risk when labels drift across ten years. **This lane proved it also produces silent HITS. Same root
cause** — and it is precisely why TRENDS-MARKS-1's shared primitive routes everything through
`resolveCanonicalSlug`.
➜ **The owner is the CBSE authority on whether conflating those two chapters materially misleads a
student. That ruling is his, not a lane's.**

**D4 — CORRECT `CLAUDE.md` §6 IN THE HANDOFF PR** (docs-only). Record **how** —
`@rollup/rollup-win32-x64-msvc@4.59.0` dropped into
`node_modules/.pnpm/rollup@4.59.0/node_modules/@rollup/` — so the next lane **reproduces it rather
than rediscovers it.**

**MERGE ORDER, owner-set:** `#634` (already on trunk) → **ops lane** → `#637` → `#636` after its
branch update.

## FU ENTRIES COLLECTED

- `[FU-MI-CALLER-COUNT-STALE]` — five in-repo comments assert recordMistake has five callers;
  scout counts six files / eight occurrences at `6c94d8f0`. (UNVERIFIED by controller.)
- `[FU-MI-PERSISTED-SHAPE-DROPS-SUBTOPIC]` — `PersistedWorksheetQuestion` and
  `QuickPracticeSavedAnswer` drop `subtopic` at persist time, which is why concept cannot reach four
  of six mistake-write paths. (UNVERIFIED by controller.)
- `[FU-MI-ISSAFEENTRY-PERMISSIVE]` — `isSafeEntry` in `mistakeInsightsService.ts` validates only
  `timestamp` + `mistakeCounts`; new optional fields pass unvalidated. (UNVERIFIED by controller.)
- `[FU-ME-MOBILESELFCHROME-NESTING]` — `#631` nests `<MobileSelfChrome>` INSIDE `<RequireAuth>` for
  `/me` while eight other usages wrap the gate, and carries a fresh comment the nesting contradicts.
  **Folded into ME-2 (Wave ME-C) by owner instruction.** Fix the nesting or the comment.
- `[FU-MARKS-RUNGTREND-OPTIONALITY]` — the new `RungTrend` marks fields are OPTIONAL by necessity,
  not by preference. See the ME-2 carry-forward below. (MARKS-1, #634.)
- `[FU-MARKS-NO-CONSUMER-YET]` — nothing reads the new fields yet; ME-2 is the first consumer, and
  the live-verify debt transfers to it. (MARKS-1, #634.)
- `FU-TRENDS-CANONICAL-SUBTOPIC-AUTHORITY` — `resolveCanonicalSlug` is a **chapter** authority that
  degrades to a slugifier below chapter level. Canonical strategies are built, wired and tested in
  #636 but **NOT default**. (TRENDS-MARKS-1. UNVERIFIED by controller.)
- `FU-TRENDS-FUZZY-CHAPTER-CONFLATION` — **live defect**: `legacyFuzzyMatch("Circles","Areas Related
  to Circles") === true` conflates two distinct CBSE chapters **in production today**. Not fixed in
  #636 because fixing it moves the HPQ pin. (UNVERIFIED by controller.)
- `FU-TRENDS-EXPECTEDMARKS-DORMANT` — `expectedMarks` is **tree-shaken out of the bundle** until
  ME-2 wires it. See the dormancy block below.
- `FU-TRENDS-DEAD-APPEARANCE-HELPERS` — `getTopicAppearanceByYear` / `getSubtopicAppearanceByYear`
  in `historicalDataset.ts` have **zero callers** and **different semantics** (no `official_board`
  filter). Deliberately not reused: reuse would have moved HPQ.
- `FU-TRENDS-HPQCONFIDENCE-DEAD` — `hpqConfidence.ts` / `deriveHPQConfidence` is dead product code,
  zero callers. Live HPQ path is `predictionCore` → `predictionScoring` → `compute5SignalScore`.
- ⭐ `[FU-RETRY-SYNTHETIC-QUESTION-ID]` — **THIS ONE CHANGES A LATER LANE.** Worksheet, full-mock and
  chapter-test paths pass **synthetic attempt ids** (`ws:` / `fm:` / `ct:`) as `ctx.questionId`.
  **RETRY-1's premise is "re-serve the exact question by `questionId`" — for those three paths the
  stored id does not identify a bank question.** Arc §7 already rules the fallback: if the exact
  question cannot be re-served, **the copy must not say "Re-do that one"** — rename to *"Try one
  like it"* and report. **ME-B must scope RETRY-1 against this, not against the arc's assumption.**
- `[FU-MI-CONCEPT-CHAPTER-ECHO-POLICY]` — **RATIFIED by owner D2(a), precondition satisfied by
  enumeration:** 14 matches across 1,914 distinct subtopics, all echo, zero real.
- ⭐ `[FU-BANK-13-SCIENCE-CHAPTERS-NO-SUBTOPICS]` — **a CONTENT gap, not a code gap.** 13 chapterwise
  Science files carry a single chapter-echo subtopic on every row (549 questions), and `"General"`
  covers 224 more across 25 topicKeys. **9.05% of the bank cannot yield a concept.** Feeds the
  bank-completion track; ME-2 must render it as an honest empty state.
- ⚠ `[FU-MI-CONCEPT-REVERSIBILITY-UNCONFIRMED]` — whether suppression is reversible on the
  worksheet/full-mock/chapter-test paths is **UNRESOLVED**; the scout's evidence points to
  reversible via `record.questionIds[]`, contradicting the working assumption. **Confirm against
  `#637`'s diff.** Does not change the ratification.
- ⭐⭐ `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` — **found by the OWNER'S live-verify of #637; PRE-EXISTING,
  SERVER-SIDE, UNRELATED TO #637.** The C&I grader returned an annotated step carrying a **−2
  deduction with NO `mistakeType`**, so `reconcileCounts` produced **all-zero counts against
  `marksLost: 2`**. ➜ **A student sees *"you lost 2 marks"* beside *"no mistakes of this type"* —
  four times over.**
  ⚠ **CONSEQUENCE FOR ME-2, and it changes the design:** the v7 **unclassified marks bucket has TWO
  sources** — (a) legitimate binary 1-markers, which carry no type by CBSE ruling and are the honest
  case the segment was invented for, and (b) **this defect**, which is untyped marks that *should*
  have had a type. ➜ **The bucket must NOT be designed as a dumping ground.** Folding (b) in
  silently would make a grader bug indistinguishable from correct behaviour and would let it hide
  behind the honesty device built to prevent exactly that.
- ⚠ `[FU-CHAPTER-ECHO-PREDICATE-BRITTLE]` — the predicate misses `"Chapter-Practice"`,
  `"Chapter Practise"`, inner double-space and NBSP variants. **Zero such values in the bank today**,
  so it is correct now and one bank edit from silently admitting an echo as a concept.
- `[FU-MI-STALE-FIVE-CALLERS-COMMENT]` — the "five callers" comments; actual is 6 files / 8
  occurrences, **re-derived and confirmed by the lane** against the scout's count.
- `[FU-MI-ISSAFEENTRY-UNVALIDATED-FIELDS]` — `isSafeEntry` admits the new fields unvalidated.
- `[FU-MI-CONCEPT-GRADEPATH-TEST-COVERAGE]` — see the lane's report §14.
- ⚠ `[FU-WINDOWS-BUILD-RUNS-WITH-ROLLUP-BINARY]` — **`CLAUDE.md` §6 is WRONG**: it states the Vite
  production build cannot run on a Windows dev box. **Two independent lanes this wave ran it
  locally** after dropping `@rollup/rollup-win32-x64-msvc@4.59.0` into
  `node_modules/.pnpm/rollup@4.59.0/node_modules/@rollup/`. That is what made the **build-chunk
  evidence** in both lanes possible. **`CLAUDE.md` §6 should be corrected** — it is currently
  discouraging the single strongest form of `MOUNT ≠ LIVE` proof available.

## ⚠⚠ DORMANCY — `expectedMarks` JOINS THE PILE, AND THE PILE IS THE PATTERN

TRENDS-MARKS-1 proved by **build output**, not argument, that its own headline capability does not
ship yet: `"legacy-fuzzy"` **is** in `assets/predictionCore-*.js` (the primitive is on the live
path), while `"canonical-topic"`, `"canonical-strict"` and `"marksBasis"` are **ABSENT** —
`expectedMarks` is **tree-shaken and dormant until ME-2 wires it.**

⭐ **This is now the FOURTH merged-but-dormant capability** alongside the standing `#578` / `#611` /
`#617` block. **A capability that merges and is called by nothing is invisible to every gate**, and
the existing dormancy block already cost five days when it fell out of a handoff.
➜ **ME-2's brief MUST name `expectedMarks` as a capability it is required to WIRE, not merely to
consume if convenient.** ➜ **Restate this in the new `[CURRENT]` alongside WIRE-2.**

## ⚠⚠ CORRECTION TO THIS FILE'S OWN RECORD — the HPQ md5

**An earlier version of this state file, and the controller's report to the owner, cited #636's
`md5 aa58d9fd6583a827066ff51d004c3683` as the proof the HPQ ranking had not moved.**
**The refresh lane found that md5 is NOT independently reproducible** — the serialization recipe was
never recorded, and five reconstruction variants all differ.

⭐ **This is NOT evidence the ranking moved.** Identity is proven, and was re-proven on the new base:
the refresh scored all 140 HPQ questions with the lane scorer and with trunk's pre-lane scorer
swapped in, `md5 619eb330af44294a17745d685f889a1e` on **both** sides in the **same run**, with the
swap **proven applied** (blob `620d5c3b` != `34704b87`) and the restore verified byte-exact. The
tamper control still fails: one digit changed in 1 of 140 rows turned it RED, then restored green.

➜ **What was wrong was the EVIDENCE CITED, not the conclusion.** ⭐ **A hash quoted without its
recipe is a derived value no later lane can re-check** — the same class as a bare line number.
➜ **Future lanes must rely on the frozen 140-row literal in `cbse5SignalScoring.hpqPin.test.ts`,
which is the artefact that actually gates. Do not cite either md5 as portable proof.**

## ⭐⭐ NEW STANDING RULE, EARNED THIS WAVE — `scope:guard` IS VACUOUS ON AN UPDATE-ONLY LANE

**`scope:guard` reads only staged / unstaged / untracked files and has no base-ref mode.** A lane
that only merges trunk into an existing branch **authors no working-tree change**, so the guard
reports `inspected=0` and exits green. ⚠ **Reporting that as a PASS would have been a silent no-op —
a gate that runs, reports, and inspects nothing.**

The refresh lane **made it real** instead: it reproduced the authoring condition in a throwaway
worktree at trunk and got `inspected=5 untracked=4`, **exactly #636's original figures**.

➜ **EVERY future refresh / merge-only / rebase-only lane hits this same vacuity.** Put it in their
briefs: **`scope:guard` on an update-only lane is not evidence unless you reconstruct the authoring
condition — and say which you did.**

## ⭐ EVIDENCE-QUALITY NOTE FROM MARKS-1 — worth more than the lane

MARKS-1 fired a **fourth** mutation that **did not land** — the file SHA was unchanged, because a
`\n` inside a perl `\Q…\E` block is literal. **The pre-red `mutated-sha != baseline-sha` assertion
caught it.** Without that assertion the lane would have reported a confident, entirely false
*"the test has a hole"* finding, and the controller would have amplified it to the owner.
⭐ **This is the standing rule paying for itself in the same wave it was written into the briefs.
Keep requiring it.**

## BLOCKED / OWNER DECISIONS OWED

- ~~MI-CONCEPT-1 scope~~ — **RESOLVED 2026-08-08 by owner ruling (option 4). See DECISIONS §7.**
  Lane dispatched.
- ⛔⛔ **THE WAVE-BLOCKER — MI-CONCEPT-1 (#637). PUT TO THE OWNER 2026-08-08.**
  **Reported by the lane; UNVERIFIED by the controller** except that the guard file exists on trunk
  (`git cat-file -e` — PRESENT).
  `lazytopper/scripts/ops/check_improve_convergence_acceptance.mjs` **freezes
  `lazytopper/src/services/mistakeIntelligence.ts` at zero-diff, in TWO separate lists.** The lane
  stopped rather than edit a file outside its allowlist — **correct behaviour**.
  **CI is red on exactly one check**, quoted from the run: *"FAIL FORBIDDEN:
  lazytopper/src/services/mistakeIntelligence.ts shows zero changes (vs
  origin/base/approved-thru-437) — THIS FILE WAS MODIFIED"*. Lane Overlap PASS, CodeQL PASS.
  **The lane is impossible without amending that guard:** `RecordMistakeContext.concept` and the
  `questionId` write-through both live in `buildEntry`, a module-private function in the frozen
  file. **Routing around it means a SECOND MI writer** — the double-write hazard that would surface
  as duplicated attempts in the store the tutor reads.
  **Sanctioned path, documented in the guard itself (FORBID-1 / FORBID-6 precedent):** lift the
  entry from BOTH lists **in a separate ops lane** and **REPLACE the ban with targeted tests** —
  ⭐ *replace a guard, never delete it; pin what it PROTECTED.*
  **No rework needed: #637 goes green as-is once lifted.**
  ⚠ **ARRIVAL-1, RETRY-1 and DPDP `SETTINGS-1` all stay blocked until this lands.**
- ⭐ **RATIFY OR REVERSE — chapter-echo suppression (MI-CONCEPT-1).** The lane suppresses
  `"General"` and `"Chapter Practice — …"` as concepts via the existing `isChapterEchoSubtopic`,
  matching the `/me` rung. **Reversible** — `questionId` is persisted, so concept can be recomputed.
- ⭐ **TWO OWNER DECISIONS FROM TRENDS-MARKS-1 (#636), PUT TO THE OWNER 2026-08-08.** Both are
  reported by the lane and **UNVERIFIED by the controller** — a controller cannot verify a code
  claim, only decide how much weight to put on an unverified one.
  1. **Switch the exam signals to canonical matching, accepting a 37% HPQ ranking change?**
     The lane reports `resolveCanonicalSlug` moves **52 of 140** live HPQ questions (topic-only
     still moves 5), because it is a chapter authority that degrades to a slugifier below chapter
     level. **Default taken: NO** — the brief said the pin outranks the feature, and the lane
     obeyed. Strategies are built, wired and tested but not default, so flipping later is a config
     change, not a rebuild.
  2. **Fix the `Circles` / `Areas Related to Circles` conflation, knowing it necessarily moves HPQ?**
     The lane reports `legacyFuzzyMatch("Circles","Areas Related to Circles") === true` **in
     production today** — two distinct CBSE chapters conflated. Not fixed in #636 because any fix
     moves the pin. **This is a live content-correctness defect, which makes it the owner's call,
     not a lane's.**
- ✅ **`SETTINGS-1` (DPDP arc) — SIGNAL SENT 2026-08-08.** `MI-CONCEPT-1` (#637) is on trunk at
  `92cc9fc4`, verified by ancestry AND content before signalling. Signal written to
  **`handoff/SIGNAL_DPDP_SETTINGS-1_UNBLOCKED.md`** and relayed to the owner. **This obligation is
  discharged.**

---

## HANDOFF DRAFT — prose, ready to paste

### [CURRENT] Wave ME-A — the engine gains the numbers the new /me needs
*(headline to be finalised when the lanes land; the four stale commits below are covered regardless)*

**Carried in from before this wave — `handoff/` was EIGHT commits stale and this handoff closes that
gap.** `#629` FENCE-1 stopped a student forging the typed-answer delimiter. `#630` DPDP-1 landed the
verified student data map and a drift guard. `#632` added a premise-ledger gate for agent specs.
**`#631` is the significant one:** `/me` converged onto a single responsive `MeProgressPage.tsx`,
both device-specific twins were deleted, and the page **stopped reading device-local data** —
verified on trunk as 6 `getWindowedProgress` and 0 `loadInsights`. Before it, a student who practised
on a phone and opened `/me` on a laptop saw a different, emptier page. That was a live defect and it
is fixed.

### Lanes
| lane | PR | what it changed | what it disproved |
| OPS-LIFT-1 | **#641** | A blanket *"this file may not change"* ban became **five tests that pin what the ban was actually protecting**: `recordMistake` is the single writer into the mistake log, the four-type taxonomy is exactly those four, marks accounting, one entry per graded question, and careless slips never counting as a topic weakness. The protection is now stronger than the freeze it replaced, because a freeze could only say *no* — it could never say *what for*. | That amending two lists was the whole job. The guard's **summary footer carried a stale count** that a two-list-only fix would have left printing a false statement on **every green run**; and the existing `COLLECTED` checks assert `.test.tsx`, so copying that line for a `.test.ts` service suite **would have passed while collecting nothing.** |
|---|---|---|---|
| MARKS-1 | **#634** | `RungTrend` now carries the raw `marksScored`/`marksAvailable` the engine was already computing at `marksPercentOf` and throwing away. Percentages and point-counts are untouched — this only stops discarding numbers. It is what lets the v7 `/me` say "51 secured" and "7 of 12 lost" instead of a percentage. | That the fields could simply be added: **they must be OPTIONAL.** `buildMistakeTypeRung` is a composition *share* with no marks denominator, so a required field would force a fabricated "0 of 0 marks" — and two files outside the allowlist build full `RungTrend` literals, which would have been green locally and RED in CI. |
| TRENDS-MARKS-1 | **#636** | One shared appearance-per-subtopic-per-year primitive now feeds the exam signal, and a new `expectedMarks` can tell a subtopic asked yearly as a 1-marker from one asked yearly as a 5-marker. HPQ's live ranking is unchanged and pinned by a test that is proven able to fail. | ⭐⭐ **That the lane's own spec was internally consistent — it was not.** Canonicalising the match (spec §5.1) and holding the HPQ pin (spec §5) are **mutually exclusive**: routing through `resolveCanonicalSlug` moves **52 of 140** live HPQ questions. It also found a **live false positive shipping today**. |
| MI-CONCEPT-1 | **#637** (blocked) | Every mistake a student logs from a bank question now records **which concept** it was and **which question**, so a lost mark can be attributed instead of just counted. Check & Improve free-typed answers correctly record neither. | **the arc's §0 premise** (the six call sites do NOT hold a canonical question); **and then the controller's own fix-shape suggestion** — central resolution in `buildEntry` fails for 3 of the 4 grade paths, which pass SYNTHETIC attempt ids (`ws:`/`fm:`/`ct:`) that can never resolve against the bank; **and the premise that a new index was needed at all** — `progressBankIndex.ts` already existed and is already `/me`'s concept source |

### FU ids — new / closed / kept open
New: `[FU-MI-CALLER-COUNT-STALE]`, `[FU-MI-PERSISTED-SHAPE-DROPS-SUBTOPIC]`,
`[FU-MI-ISSAFEENTRY-PERMISSIVE]`, `[FU-ME-MOBILESELFCHROME-NESTING]`.
Kept open: everything on the ME-B / ME-C lanes.

### Decisions made, with the reason
See DECISIONS above — copy them, with reasons, not verdicts.

### ⚠ CARRY FORWARD VERBATIM
- **The WIRE-2 dormancy block from `CURRENT_STATE.md`** — must survive every prepend and be RESTATED
  in the new `[CURRENT]`. Its absence once cost five days.
- ⭐⭐ **FOR ME-2 (Wave ME-C), FROM MARKS-1 — DO NOT `?? 0` THE MARKS FIELDS.**
  Some rungs genuinely have **no marks denominator** (`buildMistakeTypeRung` is a composition share),
  and `marksPercentOf` is documented on trunk as returning **`null` when nothing is measurable**.
  Coalescing absent-or-null to `0` turns "this rung has no marks concept" into **a fabricated
  "0 of 0 marks" rendered to a student** — the exact honesty failure the v7 unclassified segment
  exists to prevent. **Absent must stay absent.**
  ⚠ **Re-read the actual declarations in `progressStore.ts` before coding against them.** The
  controller saw both required-looking (`marksScored: number`) and nullable forms in a partial grep
  across several interfaces and **did not establish which shape sits on `RungTrend` specifically**.
  The rule above holds either way; the exact type does not come from this file.
- ⭐⭐ **FOR ME-2 — 9% OF THE BANK CAN NEVER PRODUCE A CONCEPT, AND THE PAGE MUST DEGRADE HONESTLY.**
  From the chapter-echo enumeration: **13 chapterwise Science files carry the SAME echo subtopic on
  EVERY row**, so those 13 chapters contribute **zero concept granularity** — the predicate is not
  destroying detail, the detail was never authored. Plus `"General"` ×224 across 25 topicKeys.
  ➜ **v7's "By concept" slicer and "Start here" ranking will legitimately have NOTHING to show for
  those chapters.** That is an **honest empty state**, not a bug to paper over — and it must not be
  filled with a topic-level fallback, which is the same dishonesty the arrival rule forbids.
  ➜ **The "By chapter" slicer still works for them** (chapter-level marks exist); only the concept
  drill inside them is empty. **Design for that case explicitly.**
- ⭐ **FOR ME-2 — THE LIVE-VERIFY DEBT FOR MARKS-1 TRANSFERS TO YOU.** #634 has no consumer, so
  nothing a student can see changed and it carries no live-verify of its own. When ME-2 lands it
  must be verified on **both surfaces** AND in **a session carrying state from before #634** — the
  read path reconstructs marks from records written by older code, and an incognito session never
  exercises that. This is the precise blind spot that shipped a live break past 1,082 green tests.
- The `handoff/`-is-a-shared-lock rule and addendum v1.1 §6 (positional, per-wave).
- The provenance warning at the top of this file: the four controller docs on disk are
  transcriptions, not owner originals.
