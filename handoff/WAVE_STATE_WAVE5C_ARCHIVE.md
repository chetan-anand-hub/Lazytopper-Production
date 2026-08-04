# WAVE 5C — CONTROLLER STATE FILE (UNTRACKED, LIVE)

**Controller:** Wave 5C · opened 2026-08-04
**Archive at wave close as `handoff/WAVE_STATE_WAVE5C_ARCHIVE.md`, as its own commit, FIRST** (§0).

---

## TRUNK

**Re-derived at open:** `81d0d53cafb4a2edb82f187cb11a3e788f07a043`
(`git ls-remote origin base/approved-thru-437`)

Head commit: `docs(handoff): close Wave 5B - #595-#598 merged and live-verified (#600)`

**Open PRs at open:** ZERO (`gh pr list --state open` returned `[]`).

**Controller worktree:** `C:/Projects/LT-worktrees/wave5c-ctl` on branch `docs/wave5c-handoff`.
The shared checkout `C:\Projects\Lazytopper-Production` sits at `c5570592` — **many merges stale,
never read from it.**

---

## §1.3 — DOES `handoff/` DESCRIBE TRUNK?

**Substantially YES. Wave 5B's handoff DID land** as `#600`, contrary to the dispatch's §1.3
warning that it might not have. The dispatch was written before `#600` merged.

**Residual staleness, two commits:**

| SHA | What | Recorded in CURRENT_STATE? |
|---|---|---|
| `9ab4a225` | `#599` chore(deps): bump actions/checkout 5 → 7 | **NO — genuine gap** |
| `81d0d53c` | `#600` the handoff PR itself | NO — structurally unavoidable |

`CURRENT_STATE.md` claims trunk `1adce673`. `#600` cannot name its own merge commit, so that half is
inherent to the mechanism. **`#599` is a real miss** — it merged *before* `#600` and still went
unrecorded. Small, but it is the same class of error §0 exists to prevent.
⇒ **Wave 5C's handoff PR fixes both.** Not treated as a first lane; the docs are otherwise sound.

✅ **RESOLVED — MY FLAG WAS A FALSE ALARM, and the caution was the right call.** `grep -c` returned
**9**, but reading them shows the discipline is **intact**: exactly **one bare `[CURRENT]`** (line 3,
Wave 5B), and the rest are **`(superseded) [CURRENT]`** historical headers plus one prose reference.
**A count is not a diff** — the same trap this wave hit three other times. Had I mass-stripped on the
count, I would have rewritten nine wave headers. **Handoff action: demote line 3 to
`(superseded) [CURRENT]` and add ONE new `[CURRENT]` for Wave 5C.**

---

## ⚠⚠ CONTROLLER FINDINGS — RAISED TO OWNER, NOT RESOLVED BY ME

### ~~F1 · A CONTRADICTION LIVES ON TRUNK~~ — **RETRACTED 2026-08-04. THE CLAIM WAS WRONG.**

> **CONTROLLER ERROR, OWNER-CORRECTED. RECORDED IN FULL because the retraction must travel as far as
> the claim did (§6), and because the error itself is the lesson.**

**What I claimed:** that `CLAUDE.md` §5 and `handoff/NEXT_ACTION.md` §0 contradict each other on
trunk, and that the owner had to choose between four remedies.

**Why it was wrong:** **`CLAUDE.md` §5 already defers to the executable guard**, and the topic names
in it are an `e.g.` — **illustrative, not the list.** Read precisely, line 90 says: *"re-read
`scripts/src/syllabusGuard.ts` and copy the EXACT banned keywords into the work — never from
memory."* The parenthetical is an example. **I read the example as the list.** Both documents were
right the whole time; the file everyone accused of carrying the wrong list is the file instructing
readers not to trust remembered lists.

**And the guard says the opposite of how that example has been read** (owner-supplied, to be
code-verified by BANK-1): `syllabusGuard.ts` ~`:19-20` — in-syllabus terms (**Heredity, Mendel, Step
Deviation**) are **NEVER on any banned list**. ~`:119-120` — the **Ch9 Evolution section is out**;
**Heredity / Mendel / sex-determination are RETAINED, assessed, and NOT banned.**

> **THE GUARD BANS SUB-TOPICS, NOT CHAPTERS.** `heredity-and-evolution` is a *chapter* name standing
> in for a *sub-topic* ban. A reader taking it literally bans a chapter CBSE still assesses.
> **That is the whole causal chain: it produced the phrase "banned-topic packs," which is what
> reached me, which is what I amplified into "a contradiction on trunk."** The packs' actual defect
> was always the mismatched solutions.

**OWNER RULING — option 4, and it is a DELETION, not a rewrite.** Strike the parenthetical from
`CLAUDE.md`:90; keep the sentence. It becomes:

> *"Before generating or extracting ANY content, re-read `scripts/src/syllabusGuard.ts` and copy the
> EXACT banned keywords into the work — never from memory. Topics and sub-topics deleted from the
> 2026-27 syllabus must never appear in question banks or topic lists."*

**Why deletion beats the alternatives** (owner's reasoning, recorded because the *why* is what stops
this recurring): amending §5 by removing two names **treats a symptom** — the next chapter-vs-subtopic
confusion arrives the same way. A **pack-specific exemption is worse**: it records an exception to a
ban that was never correct, leaving the wrong general rule standing *plus* a special case explaining
it away. **Holding** leaves a document telling readers a CBSE-assessed chapter is banned, in the file
every agent reads first.

**And the deletion is self-justifying:** that sentence's own instruction is *never from memory* — and
the parenthetical is precisely a from-memory copy of a list that has since drifted. **The example
undercuts the rule it illustrates.**

> ### THE GENERALISATION — FOURTH INSTANCE THIS WEEK
> `175` in a comment · `59` in a comment · `103` alerts in two documents · and now a banned-topics
> list in prose. **A PROSE RESTATEMENT OF A MACHINE-CHECKABLE FACT IS A DERIVED VALUE WITH NO TEST
> BEHIND IT, AND IT WILL DRIFT. Point at the executable authority; do not paraphrase it.**

**CONTROLLER ACTIONS TAKEN:**
- **Fold the `CLAUDE.md`:90 deletion into the Wave 5C handoff PR** — docs-only, no lane needed.
  **Record WHY, not just the edit:** that the guard bans sub-topics rather than chapters, that
  Heredity/Mendel/sex-determination are explicitly retained, and that the phrase "banned-topic packs"
  originated in this misreading.
- **Retraction delivered to all three places the claim reached:** BANK-1's brief §2a (rewritten),
  this state file (above), and **the running BANK-1 agent (messaged mid-flight)**.
- **BANK-1 unaffected and proceeding** — it was always told the executable registry is the authority
  and to withhold-and-report rather than guess. It is now also asked to **verify the
  sub-topic-vs-chapter distinction against the code**, since it is the first lane positioned to do so
  and everything above reached me second-hand.

`[FU-CLAUDEMD-BANNED-TOPICS-PARENTHETICAL]` — supersedes the withdrawn
`[FU-CLAUDEMD-BANNED-TOPICS-VS-BANK1-RULING]`.

### F2 · TRUNK CARRIES A CI-DOCS REQUIREMENT THE BRIEF OMITS
`NEXT_ACTION.md` §1 item 2: *"Also wire SEC-1's two new `.cjs` suites into the CI chain — they are
green locally and **ungated in CI** because wiring needs `lazytopper/package.json`, which is
CI-DOCS'."* `[FU-SEC1-CI-WIRE-SERVER-TESTS]`
**Not in `SUBAGENT_CIDOCS_docs_fast_path_v1.1.md`.** Trunk wins ⇒ folded into the brief as a
controller addition, in-allowlist, script entry only. **An ungated suite is an unrun suite** — Wave 2
found CI had ZERO gates over `artifacts/api-server`.

### F3 · GATE-3's ALLOWLIST AND TRUNK DISAGREE ABOUT `App.tsx`
`NEXT_ACTION.md` §1 item 3 names the GATE-3 parents as `MockViewGate`, `PracticeLimitGate`,
`RequireAuth`, `TrialBanner`, **and `App.tsx`**. GATE-3's brief excludes `App.tsx` and calls it
"not needed here". **FORBID-4 is amending the two gates that ban `App.tsx` in parallel right now**,
and ME-PROGRESS edits it afterwards — so GATE-3 touching it would collide two ways.
**Controller action:** flagged to GATE-3 in advance as a predicted hard stop. It must report the
blocking render site rather than absorb it or silently drop it. **This may return as a real block.**

### F4 · THE `.md`-WRITE RULE — **MY CORRECTION WAS ITSELF INCOMPLETE. AMENDED.**
Every brief and dispatch §5 assert *"The `Write` tool refuses `.md`; the shell works."*
**I tested it and corrected all six briefs to "either tool works." That was right for ME and wrong
for the lanes.** Observed, both directions:
- **Controller `Write` → `LT-worktrees/_briefs/*.md`: SUCCEEDED.** The blanket "refuses `.md`" is false.
- **BANK-1 `Write` → `Desktop/diff/report-bank1-2026-08-04.md`: REFUSED**, with
  *"Subagents should return findings as text, not write report files."*

⇒ **THE MECHANISM IS THE ROLE, NOT THE EXTENSION.** Subagents are blocked from writing report files
at all; it was never about `.md`. **So dispatch §5's standing order — "every subagent writes its full
report to disk as its FIRST action after gates pass" — IS NOT ACHIEVABLE IN THIS HARNESS.** Reports
come back as text and the controller is the only one who can persist them.
**Action: stop instructing lanes to write reports to disk; instruct them to return the bounded block
and let me file it.** `[FU-SUBAGENT-REPORT-WRITE-BLOCKED]`
⚠ **Both of my earlier statements were too broad. The myth was wrong; my replacement was also wrong.**

### F6 · GATE-3 MUST MERGE BEFORE ME-PROGRESS — owner-added, not in the dispatch
The spec's §5 (*"gated CTAs will show their gates — that is correct behaviour"*) was true in **July**.
**GATE-2 (#598) has since shipped the upgrade sheet and GATE-3 ships the locked CTA**, so `/me`'s
Topic Hub and Full Mock CTAs must match **GATE-3's** treatment, not the prototype's.
**The prototype is authoritative where it INVENTS (the progress surface — unchanged, no new
prototype needed) and subordinate where it must MATCH (premium CTAs — GATE-3 outranks it).**
⇒ ME-PROGRESS now has **two** merge gates: FORBID-4 **and** GATE-3. Written into its brief §5 as an
explicit override plus a "read the shipped treatment on trunk and mirror it" instruction.

### F7 · ⛔⛔ BANK-1's CENTRAL PREMISE IS FALSE — THE PACKS ARE ALREADY LIVE. OWNER MUST RE-RULE.

**BANK-1 reports** (its evidence, not my verification — I read no product source):

**All four packs are ALREADY IMPORTED AND SHIPPED** via
`lazytopper/src/data/canonicalQuestionBank.ts` — imported, spread into the main bank array, and
re-exported; that module is consumed by **28** downstream modules incl. `practiceSetGenerator`,
`bankQuery`, `predictionCore`, `fullMockBlueprint`. **It refuted the brief's absence claim with a
control**: proved its grep finds a pack it knew was wired (`acidsBasesSalts.pack2`), then ran the
same shape on the four targets — **12 hits across 3 files.**

**Three consequences, and the middle one is urgent:**
1. **There is no wiring work.** §3 assertion 2 already holds on trunk.
2. **The ~57+ defective pack1 solutions are LIVE TO STUDENTS NOW, not latent.** The brief said *"no
   student has ever seen them."* Students can.
3. **The owner's "delete both files" ruling was given on the premise they were inert.** Deleting
   **79 live student-facing questions** — of which BANK-1 measured **~28% sound** — is a materially
   different act. **HIS RULING TO RE-MAKE, not the lane's and not mine.**

**Second blocker — the allowlist cannot execute its own task.** Deleting pack1 needs 3 files, 1
allowlisted: `canonicalQuestionBank.ts` (allowed) · **`src/pages/DifficultyBreakdownPage.tsx`
(NOT allowed, imports both pack1 symbols, and is ROUTED LIVE at `/admin/difficulty-breakdown`) —
without editing it `tsc` goes RED** · `scripts/ops/validate_visual_ids.mjs` (hard-stop path).
Per CLAUDE.md §4 it changed nothing. **Correct.**

**§2a guard cross-check — NO hard stop, and it CONFIRMS the owner's ruling FROM THE CODE.** BANK-1
quoted the Science `bannedSubtopics` array verbatim: it bans **subtopic field values by exact
full-string match** — the guard *"has no concept of a banned topicKey or filename."* Its own comment
reads *"RETAINED & ASSESSED in 2026-27 (do NOT ban): Heredity, Mendel's contribution, Laws of
Inheritance, Sex Determination."* **Independent code-level confirmation of the sub-topic-not-chapter
distinction I relayed second-hand.** Trunk being green today with all four live is a second proof.

**It sharpens the owner's `CLAUDE.md` ruling:** §5 is wrong on the **mechanism**, not only the
example — the strings `heredity-and-evolution` / `magnetic-effects` **are not in `syllabusGuard.ts`
at all**, so *"copy the EXACT banned keywords"* from it is **unfollowable as written**. Its suggested
replacement names the mechanism (subtopic values, exact full-string) rather than any list.
⇒ **Fold into the same handoff-PR edit.**

**Findings the brief did not know, for the owner:**
- **~30 pack2 questions are LIVE but BOARD-EXCLUDED** (formative-only Electric Motor /
  Electromagnetic Induction / Generator, plus 2 acquired-traits items). Full id list in the report.
- **`pack1`: only 42 of 79 questions carry an `explanation` at all — 37 (47%) have none.** The
  boilerplate was the lesser half.
- **28 of 97 live pack2 questions have no `explanation`** ⇒ **§3 assertion 4 FAILS ON TRUNK TODAY.**
- **Two AR items contradict their own answer key**; a **second** boilerplate signature exists that
  assertion 5 would not catch.
- `ME2-013` / `ME2-037` are duplicate stems; `validate_visual_ids.mjs` calls itself a CI guard but
  **nothing invokes it.**

**BANK-1's proposed re-scope (owner's call):** **1a** urgent pack1 delete+unwire with the allowlist
widened to `DifficultyBreakdownPage.tsx` · **1b** owner rules the ~30 withheld · **1c** backfill the
28 missing explanations. **Nothing dispatched. Awaiting ruling.**

### F5 · ME-PROGRESS's AUTHORITIES — **RESOLVED 2026-08-04. BOTH ON DISK, SHA-VERIFIED.**

**Owner supplied both.** Written to disk on receipt (§1.5), before any dispatch:
```
C:/Projects/LT-worktrees/_briefs/wave5c/LazyTopper_MeProgress_Redesign_Spec_v1.0_2026-07-24.md
C:/Projects/LT-worktrees/_briefs/wave5c/MeProgress_Final_prototype.html
```
**The prototype was COPIED from the owner's byte-verified original, not re-emitted** — re-emission of
a 366,873-byte bundle with embedded base64 fonts is where corruption enters. **SHA256 identical
across the copy: `6e78b57250c90c4a5089ff5b5318c5a1b6bb4a1fff4f03ce33007c08752a574f`.** Content
spot-checked for six distinctive markers (`Your journey`, `Mistake intelligence`, `By CBSE section`,
`Attempt history`, `New student`, `streamTabs`) — all present.

**THE FILE HAS THREE NAMES, AND ONLY ONE OF THEM EXISTS.** Spec §0 says `MeProgress Final.dc.html`
(exists **nowhere**); owner's original is `MeProgress Final - shareable (2).html`; the attachment was
`MeProgress_Final_prototype.html`. Same file, owner-byte-verified. **ME-PROGRESS is told the exact
path and told not to hunt** — `SUBAGENT_BATCH1_multi_image_grader.md` was lost exactly this way.
**Superseded and NOT sent:** `MeProgress Dashboard v2.dc.html`, `MeProgress Mobile.dc.html` — the
brief instructs ignoring both.

### ~~F5 (original)~~ · ME-PROGRESS's SECOND AUTHORITY FILE IS NOT WHERE ITS BRIEF SAYS
Spec **found**: `C:/Users/Chetan/OneDrive/Desktop/diff/dashboard/final/LazyTopper_MeProgress_Redesign_Spec_v1.0_2026-07-24.md`
Prototype `MeProgress Final.dc.html` — **no file of that exact name exists on disk.** Nearest
candidates, all differently named:
`.../dashboard/final/MeProgress Final - shareable (2).html` · `.../dashboard/MeProgress Final - shareable.html`
· `.../dashboard/MeProgress Final - shareable (1).html` · `.../dashboard/MeProgress Dashboard - shareable.html`
**OWNER MUST NAME THE CANONICAL ONE before ME-PROGRESS dispatches.** Picking the wrong prototype
means building the wrong page. ME-PROGRESS's brief is already instructed to STOP if the authorities
are not where it is told they are.

**RESOLVED-PENDING, 2026-08-04:** asked the owner; he is **attaching the prototype in his next
message**. ⚠ **None of the four on-disk candidates is to be used.** When it arrives, write it to disk
(§1.5 — an attached document is not a file), record its real filename here, and correct
ME-PROGRESS's brief, which currently names a file that does not exist.
**ME-PROGRESS remains blocked on this AND on FORBID-4 merging — two independent gates.**

---

## LANE BOARD

| Lane | State | Branch / worktree | PR |
|---|---|---|---|
| **CI-DOCS** | ✅ **PASS**, built, uncommitted · **MERGE LAST** | `feat/desktop-pr-cidocs-docs-fast-path` · 3 files | — |
| **BANK-1** | ✅ **PASS** — Section-A-only cut, both conditions met | `feat/desktop-pr-bank1-packs-delete-and-wire` · **3 files** | — |
| **GATE-3** | ✅ **PASS-WITH-FOLLOW-UP** — needs owner live-verify | `feat/desktop-pr-gate3-locked-cta` · 4 files | — |
| **FORBID-4** | ✅ **PASS**, built, uncommitted | `feat/desktop-pr-forbid4-apptsx-amendment` · 3 files | — |

### ✅ MERGE RECORD — owner live-verify PASSED, owner authorized the merge, controller executed

```
0dd5b142  fix(bank): cut the 40 defective Section A questions (BANK-1)          #603
8d8259c5  feat(subscription): the locked Check-my-answer CTA (GATE-3)           #602
f31f8d40  test(ops): replace the App.tsx blanket ban with targeted tests (FORBID-4)  #601
81d0d53c  <- wave open
```
**CI-DOCS `#604` merges LAST** — rebased onto `0dd5b142` first (stale-base rule; landed file list
re-verified as its own 3 files only), so **its run is the first time all four lanes are compiled and
tested together** — the integration check its own brief argues only a merged whole provides.

**★ ZERO-SKIP PROOF, not a green tick:** the root guard matrix reads **190 on `#601`** and **196 on
`#603`** — BANK-1's six new guard tests **demonstrably executed in CI**, not merely ticked.
`# fail 0` on both. **`lane-overlap` SUCCESS on all three**, proving the disjointness claim rather
than asserting it.
⚠ **Branches NOT deleted** — never auto-approved. Owner's call.

### LANE RESULTS — all four returned. Every lane stopped before commit as briefed.

**FORBID-4 · PASS.** Amended **both** overlay gates, added `App.routing.contract.test.tsx` (9 tests).
`App.tsx` diff empty, **verified by SHA against the trunk blob** (`1100753f…`), not by `git diff`.
Full FORBIDDEN map enumerated: **exactly three arrays repo-wide**; `App.tsx` in CI-OVL + QP-OVL only,
**NOT in CONV** — the brief's §0 confirmed by enumeration. 10 mutations, all red, all restores
SHA-verified.
- ★★ **Its own first-draft guard was a SILENT NO-OP and only mutation testing caught it.**
  `expect(...).not.toThrow()` PASSED under a nested-router mutation because **`App.tsx` wraps
  `<Routes>` in an `<ErrorBoundary>` — the app error-pages rather than crashing**, and an assertion
  about throwing cannot tell the difference. Rewritten to assert positively. *Without mutation
  testing this ships a guard that cannot fail* — the exact thing the lane existed to prevent.
- **QP-OVL's GUARD 3 was a COMMENT, not a check** ⇒ the propless-`/practice` invariant had **zero
  executable coverage repo-wide**. QP-OVL also had **no `FORBIDDEN(path)` loop at all** — five
  entries guarded but never shape-verified. Both closed.
- Survivor split is **3 (CI-OVL) + 5 (QP-OVL)**, `sessionRecords.ts` in both — not the brief's
  carried single set of 7.
- ⚠ **`lane_overlap.mjs` `GATED_FILES` keeps `App.tsx` OWNER-REVIEW-gated after the lift.** Intended
  residual control — **ME-PROGRESS must expect an owner review on its `App.tsx` change.**
  `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]`

**CI-DOCS · PASS.** 3 files, in allowlist; `CLAUDE.md`, `Dockerfile`, lockfile untouched. Classifier
re-derives from `git merge-base` **on the CI checkout at run time** — so it cannot inherit #566's
blind spot. **Replayed over six real trunk merges: #566 classifies on 13 files (what landed), not
the 4 it reported.** Acceptance suite 18/18; 4 mutations red; control green first.
- **Wave-closer opt-in is the work, not a ritual:** `CURRENT_STATE.md`/`SESSION_LOG.md` in the
  changed set forces FULL — and `CLAUDE.md` §10 *already requires* a wave-closer to touch both.
  Plus every push to trunk always runs the full bar. Fails safe both ways.
- ★ **`scope:guard` CANNOT go in the CI fast path** (spec §2/§3 put it there). It reads the WORKING
  TREE; a CI checkout is clean ⇒ measured `inspected=0 … SCOPE_GUARD_OK` exit 0. **It would pass
  forever without inspecting anything — a silent no-op, in the lane about silent no-ops.**
  `[FU-SCOPEGUARD-NO-CI-SUBJECT]`
- Its own mutations caught two defects in its work, incl. a check passing **for the wrong reason**.
- The brief's counts were **already stale at read time** (1,156/97 vs actual 1,196/99) — §5's lesson
  demonstrating itself two days after being written. Both stale comments now name **no number** and
  point at the run.
- ⚠ Fast-path duration is a **projection from measured parts (~23s vs measured 318s)**, not a
  measured end-to-end run — it cannot be until a docs-only PR runs post-merge. It said so.

**GATE-3 · PASS-WITH-FOLLOW-UP.** 4 files; `App.tsx` absent; FORBID-4's two gates untouched. CONV
gate 108/108 (was 103). 7 mutations red; restores SHA-verified.
- ★ **F3 RESOLVED IN FAVOUR OF THE BRIEF — `App.tsx` was NOT needed.** The four "parents" trunk
  named are `useSubscription` **consumers**, not `SolutionChecker` parents. **There are TWO render
  sites, not four, and none of the four named is one.** My predicted hard stop did not fire.
- ★ **It did NOT build the `entitled` prop** — it put the gate in `SolutionChecker` via the hook,
  reasoning that **§4's own mount-not-live fear is CREATED by a prop and eliminated by the hook**: a
  third site added tomorrow ships un-gated by default with a prop. Proven three ways incl. a real
  parent + real trigger.
- ★★ **THE SERVER FAILS OPEN.** `entitlement.cjs` returns `entitled:true` with no bearer token, and
  the client sends one only for a real Firebase user ⇒ **signed-out students and local sessions can
  grade today.** A blanket "not premium ⇒ locked" rule **would have shipped a FALSE LOCK.** Both
  carve-outs tested. `[FU-GATE3-SIGNED-OUT-GRADING-FAILS-OPEN]`
- `featureGates.ts` **could not be used** — its `FeatureId` union has no `check_solution`.
- ⚠ **SCREENSHOTS NOT POSSIBLE** for the locked state: the lock needs a signed-in free-past-trial
  account it cannot provision. **Owner live-verify owed.** It claimed no PASS for §6.
  `[FU-GATE3-SCREENSHOTS-OWNER-LIVE-VERIFY]`
| **ME-PROGRESS** | ⏸ BLOCKED ×2 | needs FORBID-4 **merged+closed** AND **GATE-3 merged** (F6) | — |
| **NAME+LINK** | ⏸ QUEUED LAST | runs ALONE, zero other open PRs | — |
| PAY-1 / PAY-2 | ⛔ NOT DISPATCHED | Razorpay test keys + plan-shape decision | — |
| `lib/*` deletion | ⛔ NOT DISPATCHED | blocked on SCOUT-1 | — |

**Declared-allowlist disjointness (all I can verify — I cannot verify blast radius):**
- `scripts/ops/` is touched by THREE lanes, all different files: GATE-3 → `check_improve_convergence_acceptance.mjs`; FORBID-4 → `check_improve_overlay_additive_acceptance.mjs` + `quick_practice_overlay_additive_acceptance.mjs`; CI-DOCS → `ci_docs_lane_acceptance.mjs` (new).
- `lane-overlap` matches **file lists, not directory prefixes** — precedent: SEC-1 and PG-1 shared `lazytopper/server/` in Wave 5B and passed. ⚠ But `lane-overlap` **does** run and report. Do not carry "it gates nothing" forward.
- `App.tsx`: FORBID-4 changes its *protection*, never the file. GATE-3 and BANK-1 are banned from it. ME-PROGRESS edits it only after FORBID-4 lands. **See F3 — GATE-3 may report a genuine need.**

---

## OWNER GATES OUTSTANDING

- **BANK-1** — ~97 questions student-facing for the first time. **Withheld list is the owner's ruling**, not the lane's, not the controller's.
- **CI-DOCS** — changes what CI *is*. **MERGE LAST**, after every other lane is closed. Lane told.
- **GATE-3** — student-facing CTA. Owner live-verifies the locked state and that the sheet still opens.
- **Carried unresolved from Wave 5B:** the `og-image.png` re-export (owner only — the dead domain may be rendered into the bitmap) · `[FU-COOP-BLOCKS-POPUP-CLOSED-CHECK]`.
- **MERGED MEANS LIVE.** Vercel builds trunk on merge; Railway rebuilds from it. No staging.

---

## SEQUENCING NOTE — dispatch vs trunk

`NEXT_ACTION.md` orders the queue BANK-1 → CI-DOCS → GATE-3 → **NAME+LINK** → **ME-PROGRESS**.
The Wave 5C dispatch orders ME-PROGRESS **before** NAME+LINK. **Following the dispatch:** it is newer
and has a hard technical reason — NAME+LINK's blast radius through 25 complete-replacement
`AuthContext` `vi.mock`s cannot be bounded in advance, so it must run with zero other open PRs.
Recorded rather than silently reconciled.

---

## F9 · ⚠ SYLLABUS TRUTH LIVES IN TWO PLACES — owner-ruled, sharpened from BANK-1's finding

**Ruling: LOG AS FOLLOW-UP. Do not fix now, do not remove the 28 by hand, do not spin a lane.**
Ruling 2 producing **no** removals **is the withhold-in-both-directions test working.** No executable
rule bans Motor/Induction/Generator at bank level, so removing them would be **guessing in the
opposite direction** — the exact failure the test exists to prevent. Formative-only means taught but
not year-end assessed: a student practising them is learning real content slightly off the board-prep
critical path. **A cost, not a harm** — and not worth touching a guard everything depends on mid-wave.

**★ BUT NOT CLOSED AS WORKING-AS-INTENDED.** The cofounder verified something better than the framing:
> **`syllabusGuard.ts`'s `RULES` array is HARDCODED TypeScript. It does NOT read
> `cbse10Registry_2026_27.json`.** So the 2026-27 syllabus truth lives in **TWO hand-maintained
> places — one executable, one declarative — with NO test that they agree.**

**★ THAT is the defect.** Not *"the guard forgot Motor/Induction"* but **"two sources of the same
truth, and nothing reconciles them."** The 28 questions are a **symptom**.

⇒ **`[FU-SYLLABUS-TRUTH-IN-TWO-PLACES]`**, **superseding**
`[FU-SYLLABUS-GUARD-FORMATIVE-ONLY-BANK-BLINDSPOT]`. **Fix, as stated:** make the guard **DERIVE from
the registry**, so a registry edit cannot silently fail to reach the bank.

**★ RECORD IN THE HANDOFF — the year, so nobody re-asks:** **`syllabusGuard.ts` IS 2026-27**
(`year: "2026-27"` ×2, sourced from the official 2026-27 CBSE PDFs). **It was never on 2025-26.**

---

## F10 · CONTROLLER CONTEXT DISCIPLINE — owner-corrected mid-wave

**I was absorbing full lane reports into context and then re-summarising them for the owner. Both
halves were waste.** Corrected practice, effective immediately:
- **Read only:** VERDICT · the ★ lines (FINDINGS THAT CONTRADICT / DECISIONS NEEDED) · the disk path.
- **Do not paste lane findings into context, and do not summarise them for the owner** — give the
  path and the starred lines; he reads the file.
- **Lane reports are filed to `C:\Users\Chetan\OneDrive\Desktop\diff\wave 5c\report\` by me**, since
  the harness blocks lanes from writing them (role-based).
- ⚠ **I did NOT re-emit the three PASS lanes' full bodies into their report file** — verdict +
  starred lines only, with the omission stated in the file. Re-emitting ~8k tokens of prose already
  in the transcript would have spent the exact context the correction was protecting.

---

## F11 · OWNER LIVE-VERIFY PASSED — AND IT CORRECTED A FINDING I AMPLIFIED

**★ `[FU-GATE3-SIGNED-OUT-GRADING-FAILS-OPEN]` WAS OVERSTATED AS WRITTEN — including by me, to the
owner, as a headline.** Corrected wording, owner-verified in a browser:

> **The SERVER fails open for unauthenticated callers** — anon `POST /api/check-solution` returns
> **400 from the handler, not 402**. **BUT NO STUDENT PATH REACHES IT.** The client's login gate
> fires at every action CTA. So this is a **LATENT SERVER-SIDE HOLE, not a live product hole**:
> **curl-only**, bounded at **3/day** by the anon cap, costing Gemini pennies and **no revenue**.

**GATE-3's carve-out is still right — for a different reason than the FU gave:** it prevents showing
🔒 to a **signed-out visitor who could sign in and use the feature.**
⇒ Reworded in `report-wave5c-lanes-2026-08-04.md`. **Retraction travels as far as the claim did.**

**★ OWNER RULING — RECORD SO NOBODY "FIXES" IT LATER:** **trial-period grading is INTENDED**, a
marketing hook, **and still requires sign-in.** Not a defect. Do not close it as one.

## F12 · NEW DEFECT FROM THE LIVE-VERIFY — LOG, DO NOT FIX THIS WAVE

**`[FU-UPGRADE-SHEET-PRICING-BACKNAV]`** — *"See plans"* navigates to pricing, and **pricing's back
button goes to HOME**, not to the page the student came from. It carries **neither**
`state:{back,backLabel}` **nor** `?source=&returnTo=`.
**A student two questions into a practice set who declines to buy loses their place.**
⇒ **That is the "this stopped working" failure GATE-2 exists to prevent, one screen later.**
**Belongs with GATE-3's follow-ups in Wave 5D.**

## F13 · ★ THREE COFOUNDER SPEC ERRORS — recorded as SPEC errors, not lane findings

1. **`scope:guard` cannot go in a CI fast path.** It reads the working tree; a CI checkout measures
   `inspected=0` and **passes forever**. (CI-DOCS brief §2/§3.)
2. **GATE-3's four named "parents" are `useSubscription` CONSUMERS, not `SolutionChecker` render
   sites.** There are **two** render sites and **none of the four is one**.
3. **The briefs' test counts were stale at read time** (1,156/97 vs actual 1,196/99).

## F14 · ★ THREE ENGINEERING RULES THIS WAVE PROVED — carry into 5D

- **★★ D9 EXTENDS: `git checkout HEAD -- <path>` is the wrong restore for TRACKED-BUT-UNCOMMITTED
  work, not only untracked.** It restored BANK-1's file to **trunk** and **silently undid its own
  cut**; **only the SHA check saw it.** ⇒ **Restore from a byte snapshot, verify by SHA. Never
  `git checkout`, never `git diff`.**
- **★★ A `not.toThrow()` ASSERTION IS NOT EVIDENCE in a tree with an `ErrorBoundary`.** FORBID-4's
  own first-draft one-router guard **passed** under a nested `<MemoryRouter>` because `App.tsx`
  **error-pages instead of crashing**. ⇒ **Assert POSITIVELY on the rendered result.** Only mutation
  testing caught it.
- **QP-OVL's GUARD 3 was a COMMENT, not a check** — the propless-`/practice` invariant had **zero
  executable coverage repo-wide.**

## F15 · ★ OWNER RULINGS ON SEQUENCING

- **MERGE THIS WAVE:** FORBID-4 → GATE-3 → BANK-1 → **CI-DOCS last**.
- **ME-PROGRESS and NAME+LINK DO NOT MERGE THIS WAVE — they head Wave 5D.**
- **Wave 5D runs FOUR lanes, not six.**

---

## FU LEDGER — THIS WAVE

- `[FU-CLAUDEMD-BANNED-TOPICS-VS-BANK1-RULING]` — F1, **owner decision needed**
- `[FU-SEC1-CI-WIRE-SERVER-TESTS]` — carried from trunk, folded into CI-DOCS
- `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]` — CI-DOCS §5
- `[FU-DOCKERFILE-STALE-PM-COMMENT]` — out of scope, log only
- `[FU-CI-TWO-WORKFLOWS-PER-PR]` — three workflows now, count at read time
- `[FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]` — GATE-3 §1, FORBID-4 §2
- `[FU-HANDOFF-LANE-NO-LOCAL-GATES]` — handoff PR needs a real readable CI round
- `[FU-ME-HISTORY-DEVICE-LOCAL]` — ME-PROGRESS §1c
- `[FU-AUTH-EMAIL-LINK-DIRECTION]` — NAME+LINK §3
- `[FU-AUTH-SIGNUP-ROUTE-UNREACHABLE]` — NAME+LINK §0a, **live defect, every account has no `displayName`**

---

## ⛔⛔ F8 · CONTROLLER ERROR — I MISROUTED BANK-1'S TRAFFIC TO CI-DOCS. TWICE.

**Mine, not a lane's. Recorded in full because the near-miss is worse than the error.**

I addressed **both** the banned-topics retraction **and** the owner's re-ruling to agent id
`aaf0e49c…` — **that is the CI-DOCS lane. BANK-1 is `a92bfa29…`.** Consequences:
- **BANK-1 received NOTHING** between its dispatch and its BLOCKED report. The re-ruling — the
  time-sensitive one, gating live wrong solutions — sat undelivered.
- **CI-DOCS was handed an instruction to delete `canonicalQuestionBank.ts` and
  `DifficultyBreakdownPage.tsx` under a "widened allowlist"** — paths that are **CLAUDE.md §4
  globally forbidden, excluded by its own brief, and a NAMED HARD STOP** in its dispatch precisely
  because BANK-1 held them in parallel.

**CI-DOCS REFUSED, AND PROVED THE MISROUTE RATHER THAN ASSERTING IT:** distinctive tokens appear
**14×** in BANK-1's brief and **0×** in its own; the message credited it with a **BLOCKED** verdict
when it returned **PASS**; it credited it with `syllabusGuard.ts` findings from a file it never
opened; **and the message itself listed "CI-DOCS" as a lane distinct from its addressee.** It
verified its worktree untouched. **It flagged the FIRST misroute mid-task and I did not act on the
flag** — the second one followed.

> **THE LESSON, AND IT IS A CONTROLLER LESSON:** the model's whole safety argument is that lanes are
> file-disjoint and each is told what it may not touch. **A misaddressed instruction defeats that in
> one step** — it carries the controller's authority into a lane whose allowlist was drawn to
> exclude exactly those files. **Only the receiving lane's refusal stood between this and a
> destructive cross-lane write into a shared data file.**
>
> ⇒ **ADDRESS BY VERIFIED ID, AND MAKE THE MESSAGE SELF-IDENTIFYING.** Name the lane in the first
> line so the recipient can reject a misroute on content alone — which is exactly how CI-DOCS caught
> it. **And when a lane says "this isn't mine," STOP AND RE-CHECK THE ROUTING before resending.**
> `[FU-WAVE5C-BANK1-MESSAGES-MISROUTED-TO-CIDOCS]`

**Corrected:** ruling re-sent to `a92bfa29…` (BANK-1), lane named in the opening line, with the
misroute disclosed to it so it knows why it had heard nothing. **CI-DOCS's worktree verified
untouched by its own check; its PASS stands; merge-last unchanged.**

---

## CONTROLLER DISCIPLINE LOG

- Read no product source, ran no builds, read no CI logs, inspected no diffs. Read `handoff/` only — that is the controller's own job per §0.
- All six received briefs written to disk **before** dispatching: `C:/Projects/LT-worktrees/_briefs/wave5c/`.
- Every count in every brief marked as a carried value the lane must re-measure and quote.
- **A CONTROLLER AMPLIFIES** — nothing below "the lane reports X" is recorded as "X". No lane has returned yet.
