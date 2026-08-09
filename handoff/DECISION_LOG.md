## 2026-08-09 — WAVE ME-B, three lanes + two read-only scouts under a controller + subagent model (`#647` draft · `RETRY-1` pushed unPR'd, trunk `376e30b0`)

**`2026-08-09`**

> ★★ **Three concept resolvers were specified in one wave and ALL THREE WERE WRONG — the owner's,
> the controller's, and the obvious one. Every catch came from the same practice: the candidate was
> handed on flagged `UNVERIFIED` with an instruction to VERIFY rather than INHERIT.** The verdicts
> below are useless without their reasons, so the reasons are recorded and the verdicts are not
> recorded alone.

### DECISION 1 — trunk is re-derived at every step and never carried

**It moved FOUR times inside one wave:** `baf9b67a` → `3cf01287` (#644) → `3d6dce0c` (#645) →
`3d3a32a9` (#646) → `376e30b0` (#648).

**Reason:** `git ls-remote origin base/approved-thru-437` is the only authority, and the owner's
dispatching brief was a day old — it quoted `f654dc64`, which **ancestry checked in BOTH directions**
(not just equality) showed to be an ancestor, not the tip. ⭐ **`RETRY-1` caught a move by itself and
re-cut from the newer SHA rather than the one its brief pinned.** ⇒ **A SHA in a brief is a claim
about the past.**

### DECISION 2 — `RETRY-1` was SPLIT into logic (its own lane) and UI (folded into `ME-2`)

**Reason, and it came from a scout that wrote nothing:** `SCOUT-RETRY` established that **there is no
per-entry mistake-log UI anywhere in the product today.** Every consumer aggregates, and in
`MeProgressPage.tsx` the fetched `MistakeLogEntry[]` is used **only as a gate**
(`mistakeLogs.length > 0`). ⇒ `RETRY-1` was never *"add a button to a list"* — it was *"build the
list"*, into **the one file `ME-2` rebuilds wholesale.** Keeping them together would have had
`RETRY-1` author a list and `ME-2` delete it.

⇒ **The split dissolved the file collision entirely.** The logic half is pure, new-file and collides
with nothing; the lanes stayed ordered only for RAM headroom, not for correctness.

### DECISION 3 — `arrival` on `TutorBrief` was CUT from the wave, on disjointness grounds

**Reason, and it holds whether or not the redundancy finding is true:** `TutorBrief`'s only consumer
is `briefBlock()` in `lazytopper/server/prompts/tutorSystemPrompt.cjs` — **path CONFIRMED by the
controller** — which is under `lazytopper/server/**`, **DPDP-B's exact-path territory.** ME-B cannot
touch it, and **shipping the field without its consumer is a silent no-op**, which the standing rules
forbid outright.

★ **Two independent reasons existed and the verified one was used.** A subagent separately reported
that the capability **may already be live on trunk** (`[FU-ARRIVAL-BRIEF-REDUNDANT]`) — that would
make the work *unnecessary*; the disjointness makes it *impossible*. **The second is sufficient on
its own, and it is the one that was verified.** ⇒ **the unverified claim was not load-bearing for the
decision, and was passed on marked as unverified rather than used as justification.**

### DECISION 4 — `lib/desktop/navigation.ts` moved into `ME-2`'s allowlist, because `ME-2` must be the producer

**Reason:** `TOPICHUB-1` ships a reader that **nothing calls** — `buildDesktopTopicHubPath` is
structurally incapable of emitting `?concept=` (`DesktopRouteContext` is `{source, returnTo}` only)
and HPQ does not link to `/topic-hub` at all. **`ME-2` owns `MeProgressPage.tsx` and must emit the
CTAs anyway**, so it is the natural producer; `buildDesktopTopicHubPath` must learn `concept`.
The file was in `ARRIVAL-1`'s original allowlist and was **never touched**, so there is no conflict.

⭐ **Owner-ratified (`R6`), and he ordered the consequence recorded verbatim:**
**⇒ IF `ME-2` DOES NOT SHIP, `TOPICHUB-1` IS DEAD CODE.** His reason: *"MOUNT ≠ LIVE caught before
merge rather than six documents later."*

### DECISION 5 — `ME-2` was NOT STARTED, and the wave closed instead

**Reason:** the controller was below the addendum §3 **35% floor** with two merges still owner-gated.
Addendum §1 is explicit — **a controller's lifetime is one wave**, and **a fresh controller with full
context beats half a lane and an unwritten handoff.** The §2 HANDOFF DRAFT was written incrementally
after every lane returned, so closing cost minutes rather than being unreachable.

⚠ **The cost is named rather than hidden:** `expectedMarks` **stays dormant**, `#647` **stays a
consumer with no producer**, and both are now Wave ME-C's opening obligations.

### DECISION 6 — every unverified claim was passed on FLAGGED `UNVERIFIED`, with an instruction to verify

⭐⭐ **This is the single practice that caught all three wrong concept resolvers, and one of them was
the controller's own.**

- `resolveCanonicalSlug` — **the owner's**, in the arc doc and repeated in the controller's brief.
  Disproved by `ARRIVAL-1`: it is the **chapter-key** authority; feeding it a concept falls through
  to `normalizeTopicSlug`.
- `conceptKeyForLabel` — **the controller's own replacement**, passed on flagged `UNVERIFIED`.
  Disproved by `TOPICHUB-1`: it resolves against the tutor **FIGURE** catalogue, a strict subset that
  returns null for **39 of 112** live concepts (**~35% silent-null**) — and whose own data file says
  *"conceptKey … never resolve on it"*. **The lane used exact match on
  `actionable.boardEssentials[].name` instead.**
- `conceptForBankQuestionId` — the obvious choice for an existence test. Disproved by `RETRY-1`: it
  **suppresses chapter-echo subtopics**, so **773 of 8543 rows (~9%) would have been wrongly demoted
  to "similar"**. ⇒ **existence = `conceptForQuestionId`; concept = `conceptForBankQuestionId`.**

> **Owner: keep that instruction in every brief.** A candidate handed over as fact would have shipped
> three times.

### ⭐⭐ OWNER RULING `R7` — THE OWNER WITHDREW HIS OWN `R4`, ON THE LANE'S DOCTRINE FINDING

`R4` had changed the arrival badge to **"This is the one costing you marks."**, on **voice** grounds —
*"Why you're here"* is the page talking about itself. The lane **implemented it as ruled**, flagged it
in-code, in the prop doc and as a FLAG in the PR body, and then reported the conflict: it is **a
performance claim asserted from a URL parameter**, on a page holding **no graded or mistake data**, so
a hand-typed, shared or stale URL **can tell a student a concept is costing them marks for a concept
they never attempted.** It contradicted the lane's own brief (*"do not add a marks-lost figure, a
mistake count, or any performance claim to this page"*) and `CLAUDE.md` §5.

**Owner: *"you were right and my ruling was wrong. I ruled on voice; you found a doctrine conflict I
hadn't considered."*** ⇒ final string **`You came here for this.`**

**Reason it is the right string:** it is **true regardless of how the student arrived**, asserts
nothing about performance, and keeps the voice `R4` was reaching for.
⛔ **The gate-on-MI-data option was REJECTED** — it would require TopicHub to read Mistake
Intelligence, **which its brief forbids for good reason.**
★ **The guard was REPLACED, NOT DELETED.** The old regex (*"the marker carries no performance
claim"*) **does not match *"costing you marks"* and would have passed VACUOUSLY** under `R4`'s copy.
The replacement **pins the exact string and keeps the no-numeric-figure assertion** — *replace a
guard, never delete it; pin what it PROTECTED.*

### THE OTHER BINDING RULINGS, WITH THE OWNER'S REASONS

- **`R1` bar buckets — ⛔ none of the three options offered.** **Mirror `ResultsScorecard`'s own
  grouping:** it already groups the four MI types under two headings (*"Knowledge gaps — worth
  practising"* = Conceptual + Calculation; *"Careless mark-loss — not a weakness"* = Silly +
  Presentation). ⇒ **keep four segments, fix the NAMING:** `secured` · `careless slips` ·
  `knowledge gaps` · `unclassified`, **with the legend naming all four MI types under their two
  headings.** **Reason: it is the product's EXISTING model rather than a new one**, the student
  already met it on their graded sheet, nothing is invisible, nothing is dumped into `unclassified`,
  and it dodges the six-segment option's 360px blank-segment problem entirely.
- **`R2` bar numerals — the owner RETRACTED HIS OWN FIGURES; the scout was right.** The 5.7–6.7:1
  claim was computed against the **LOGIN** page's `#071a3d`; MeProgress uses
  **`--me-navy: hsl(222,47%,24%)`**. Recomputed: 4.68 / 3.53 / 3.74 — **matching the scout's 4.67 /
  3.51 / 3.73 to two decimals.** ⇒ **re-measuring is off the table, and the probe is SOUND.**
  The fix is neither darkening tones nor switching to white: it is **the WCAG large-text threshold**
  (AA large = 3:1; large = 14pt bold = 18.66px; **the numerals are already `font-weight:700`**) ⇒
  **at ≥18.66px bold, navy passes all three. No token change, no global colour shift.**
  **Reason for rejecting the darken option: `MISTAKE_TONE` is used VERBATIM across the scorecard, the
  MI card and history** — it would repaint the product's entire mistake vocabulary to fix one bar.
  ⚠ **Constraint accepted with it:** at 360px a 7% segment is ~23px and an 18.66px bold two-digit
  numeral will not fit ⇒ **raise the render threshold 7% → ~12% and let the legend carry the rest.**
  The legend already prints every number, **so nothing is lost — the bar stops pretending to show a
  figure where it cannot.**
- **`R3` reconciliation — option (a): the hero is truth**, and each deeper view carries an **explicit
  remainder row** so all three sum to the hero. **Reason:** *"6 marks not yet traced to a concept"* is
  a sentence a student can accept; **three unexplained totals is not** — it is the same honesty device
  as `unclassified`, one level down. (b) rejected because it **leaves the student to do the
  reconciling**; (c) rejected outright because **the hero under-reporting real lost marks is the one
  thing the page cannot do.**
- **`R5`** both controller self-fixes approved — the thin-state self-contradiction, and a first-run
  example tagged `Conceptual gap` over a dropped-state-symbols subtext (**`CLAUDE.md` §13 makes that
  PRESENTATION**). Owner: *"a page whose diagnosis contradicts its own label at the top has no claim
  on the rest."*
- **`R8`** `RETRY-1` commit + push approved, **draft only** — landed as **`#649`, DRAFT, CI green.**
  **`gh pr ready` remains the owner's step.**
- **`R9` HPQ into the canonical bank — NOT NOW, NOT A LANE.** **Reason: it is an owner CONTENT
  decision with syllabus implications**, not an engineering task. HPQ stays *"Try one like it"*;
  `[FU-RETRY-HPQ-NOT-BANK-BACKED]` stays open.
- **`R10` an entry with no `questionId` OFFERS NOTHING** — not even a topic-scoped *"Try one like
  it"*. Owner: *"a retry affordance on an entry that can't identify its question is decoration, and
  the student can already reach that topic from every other row. Silence is the honest option."*
  ⇒ **`RETRY-1`'s build already matched this** (`kind:"none"` returns null). **Confirmed, not
  altered — no code change was made to satisfy the ruling.**

### ⭐⭐ THREE GIT PRACTICES THIS WAVE, RECORDED BECAUSE EACH ONE HAS COST THIS PROJECT TIME BEFORE

**1 · A REJECTED PUSH WAS HANDLED WITHOUT A FORCE-PUSH.** A remote trunk-merge (`26d3c8b1`, carrying
`#644`/`#645`/`#646`/`#648`) landed on `#647`'s branch mid-push and the push was **rejected.** The
lane **did NOT force-push.** It fetched, **inspected both directions**, merged remote into its branch,
and afterwards **re-reconciled `gh pr view 647 --json files` against the base — still exactly 4
files.**
**Reason it is recorded:** this is the **Wave-4 force-push mechanism, which once dropped two merged
PRs off trunk**, being **AVOIDED rather than survived.** ⇒ **A rejected push is a signal to look, not
an obstacle to overpower.**

**2 · MERGE-BASE RECONCILIATION WAS ACTUALLY PERFORMED**, on `#649`: `gh pr view --json files`
compared against `git diff --name-only 376e30b0..25862843`, **IDENTICAL.**
**Reason it matters:** **a squash merge diffs against the base AT MERGE TIME, so a PR's own file list
is not necessarily what lands** — a product PR once reported 4 files and landed 13. The operating
model names this as *"the missing check, and the data already exists — nothing does today."*
⇒ **It has now been done once. Make it standard.**

**3 · THE REBASE USED `git reset` + `git merge --ff-only`, NOT `git reset --hard`.**
**Reason given by the lane:** `reset --hard` is **never auto-approved in this repository**, and it was
**unnecessary** because no commits existed on the branch yet. ⇒ **the correct pattern when a lane
needs to move its base.** ★ **All gates were RE-RUN post-rebase rather than carried forward**, and
`MeProgressPage.tsx` was re-checked as untouched **after** the rebase — because `#646` had landed
changes to that exact file in the interval. **That is a lane respecting a hazard it does not own.**

### ⚠ A PROCESS DECISION RECORDED BECAUSE IT WAS NOT FOLLOWED BY THE OTHER ARC

Addendum §6 requires the controller closing a wave to write the handoff for **everything landed since
the last one — its own arc and the other's** — and to **ask the other controller for its bounded
close-out first and WAIT for it.** **DPDP-B merged `#644`, `#645` and `#646` and stood down without
opening a handoff and without handing one over.**

⇒ **Those three lanes are recorded in this handoff from trunk commit metadata only.** That is enough
to stop them vanishing and **nowhere near enough to be a lane record** — no FU ids, no disproved
premises, no evidence ceilings, no allowlist breaches. **This is written down as a gap, not papered
over.** `[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]`


## 2026-08-09 — WAVE DPDP-A, three lanes + two read-only scouts under a controller + subagent model (#640 · #639 · #638, trunk `6f7da56e`)

**`2026-08-09`**

> ★★ **Every lane disproved a premise of the document that dispatched it — two of them the
> CONTROLLER'S OWN, and one of them the OWNER'S, which made a lane smaller. The verdicts below are
> useless without their reasons, so the reasons are recorded and the verdicts are not recorded
> alone.**

### ⭐ OWNER RULING Q1 — the erasure lives on the GATEWAY (`lazytopper/server/**`)

**And the owner VERIFIED THE CRUX HIMSELF, which made the lane smaller.** `resolveVerifiedUid` in
`verifiedCaller.cjs` is **ALREADY FAIL-CLOSED**: every path — no token, no admin SDK, unverified,
expired, forged, network down — returns `""`, and **it never consults the header.**

⇒ **There was no new gate to build.** The route consumes what exists and refuses empty:
`const uid = await resolveVerifiedUid(req); if (!uid) return 401;` — **no change to
`verifiedCaller`, no effect on any existing route.**

★ **SCOUT-1's phrasing — *"`resolveVerifiedUid` is advisory and falls back to a spoofable header"* —
is CORRECTED. Do not propagate it.** The header-reading is a **different function in the same file**.
★★ **The likely cause of the scout's error is recorded because it is reusable:** a `catch` in that
file carried the comment *"Fall back to the header — never to anonymous"* while the code returned
`""` — **a security-critical function documented as doing the opposite of what it does.** `#638`
fixed the comment; verified absent from trunk.

★ **The spoofing hazard is nonetheless REAL AND CURRENT** (owner-verified): `verifiedCaller.cjs` and
`rateLimiter.cjs` both read `X-Lazytopper-Uid`. ⚠ **The Wave 5D header strip does NOT protect the
gateway** — it covers `x-user-id` at the api-server proxy: **different header, different surface.**

### ⭐ OWNER RULING Q2 — dismiss the 9 CodeQL alerts as false positives, WITH a guard

★ **THE TEST IS THE DELIVERABLE, NOT THE DISMISSAL.** It must sit **beside the storage call, not in
a distant suite**, so a future change trips it.

**Reason given, and it is the general form:** remediating a persisted value read on every load is
**the exact class that broke production past 1,082 green tests** — an unacceptable risk to take for a
**false positive**. The dismissal rationale must record that **the "7" span two rule ids**, so nobody
later suppresses by rule id and leaves two open.

⚠ **The dismissal itself is the OWNER's action.** A CodeQL dismissal is an **outward-facing
repo-state change**, same class as "push as draft, never merge". CLEARTEXT-1 authored the rationale
and the exact commands and **deliberately did not execute them.**

### ⭐ OWNER RULING Q3 — delete the dead `users` write, own lane, this wave

**Reason:** an FU only asks people to remember; **removing the write closes the door permanently**
against someone later "fixing" it with a rules block.

★ **But `users` STAYS LISTED in `studentDataMap.ts`.** Erasing a path that was never written is a
harmless no-op, and **de-listing is the single move that could make a future erasure LIE about what
it covered.** ⇒ **Listing a collection that turns out to be empty costs nothing; omitting one that is
not is the failure this entire arc exists to prevent.**

### ★★ OWNER RULING — the `qrUploadSlots` finding is PROMOTED TO LANE-BLOCKING

The controller had reported it at the bottom of a message as *"worth knowing"*. The owner's ruling:
> *"That is the worst failure available to this lane. A minor's handwriting images stay live while
> the product tells a parent the account was erased."*

**The four requirements he attached, kept verbatim in substance because each one is load-bearing:**
1. The erasure **must query by field** for that location, **never by doc id**.
2. ★★ **A delete that matches nothing MUST NOT report success.** Every location returns `deleted N`
   **or** `not found`, and **the caller distinguishes them.**
3. **Mutation:** point it back at a doc-id delete → the test goes red **because zero documents
   matched**, not because an assertion changed.
4. ★ **Audit all 29 locations for the same shape. Enumerate; do not spot-check.**

⇒ **Requirement 4 paid for itself immediately** — it found a **second** instance the lane's own first
classifier had got wrong. **A spot-check of the one known location would have shipped it.**

### ⭐ OWNER RULING — 200 vs 207, and what `SETTINGS-1` must read

**200** when every reachable location returned a **definite outcome**; **207 only on genuine
failure.** ★★ **And — the owner's addition, which the controller had not proposed — the body
enumerates all 29 locations with their outcome REGARDLESS of status code. The code is for machines;
the body is the evidence, and `SETTINGS-1` will read the body.**

★ **`notFound` is a DEFINITE OUTCOME, not a failure** — a path never written to is legitimately
empty. ⇒ **Carried to `SETTINGS-1`: it must not render `notFound` to a student as an error.**

### ⭐ OWNER RULING — EXPORT-1 and SETTINGS-1 go to a FRESH controller (DPDP-B)

★★ **The owner asked that this framing be kept for whoever replaces the controller — IT IS NOT A
CONTEXT CALCULATION.** Addendum §1 is deliberately **positional**: *a controller that finishes with
context left stands down anyway.*
⇒ **The arithmetic version — *"do I have enough context for one more lane?"* — would justify
precisely the behaviour §1 exists to prevent.** **Never reason about your lifetime by measuring your
remaining context.**

Secondary reason: EXPORT-1 could not start until `#638` was **on trunk**, which would have meant
idling through three merges and three live-verifies.

**And the `tsx` deploy fix is DPDP-B's FIRST lane, ahead of both** — owner-assigned.

### CONTROLLER DECISIONS, with the reason each was made

- **Two READ-ONLY SCOUTS dispatched before any product lane.** **Reason:** three separate premises in
  the dispatch spec were unverified and **each one determined an allowlist** — (a) which server
  surface is live, (b) whether a `.ts` module under `src/services/` is reachable from a `.cjs`
  server, (c) the CodeQL count. **Writing an allowlist on an unverified premise is how a lane gets
  rebuilt.** ⇒ **All three premises moved, and two of them were wrong.**
- **ERASE-1 and EXPORT-1 SEQUENCE; they do not race.** **Reason:** both must register a route in
  `lazytopper/server/index.cjs` — an **exact-path collision** (`lane_overlap.mjs` is
  `files.filter(f => mineSet.has(f))`). EXPORT-1 **reuses ERASE-1's map-walker**; a second walker
  would drift from the first the day the map changes.
- **Cap of 2 lanes in flight.** **Reason:** ★ **parallelism on this box is bounded by RAM, not by
  file sets** — two concurrent full matrices have OOM-killed the editor before. All three lanes were
  file-disjoint; **the constraint was the machine, not the lanes.**
- **`AuthContext.tsx` assigned to USERS-1 ONLY and explicitly FORBIDDEN to CLEARTEXT-1.**
  **Reason:** it is the CodeQL **taint source** and therefore the one file that could pull both lanes
  together. CLEARTEXT-1 did not need it — the owner ruled *dismiss*, not *remediate*, so that lane
  changed **no production code at all**.
- **The `client-local` (`localStorage`) location is OUT of ERASE-1's scope, and ERASE-1 must REPORT it
  rather than pretend it erased it.** **Reason:** **no server can reach a browser's `localStorage`.**
  The arc already assigns the browser half to `SETTINGS-1`.
- **Student-facing Gemini disclosure wording DEFERRED to `SETTINGS-1`.** **Reason:** it is student
  copy, **and the owner rules on copy.** ERASE-1 needed only the machine-readable *"not deleted /
  cannot be deleted"* field.
- **The controller wrote all three attached specs to disk before dispatching.** **Reason:** the
  standing rule **"AN ATTACHED DOCUMENT IS NOT A FILE."**

### ⚠ CONTROLLER ERRORS RECORDED — because a wave that only logs its wins is not a record

- **The controller's §0 amendment to CLEARTEXT-1 was WRONG, and was disproved empirically.** It told
  the lane *and the owner* that `#637` would collide and whichever merged second would see a correct
  red. **It does not collide** — `#637`'s `concept`/`questionId` land on the Firestore
  `MistakeLogEntry` via `buildEntry`, never on the `localStorage` dedup payload. Proven by swapping
  `#637`'s actual blob (`56c262bb`) into the tree → guard GREEN `4 passed (4)` → restored.
  ⇒ ★ **And the corollary the lane stated rather than buried:** the controller's argument *"if `#637`
  had added an identifying field your guard would catch it"* is **false for this case** — the guard's
  boundary is the `localStorage` sinks, not the Firestore log. **The allowlist shape is still right
  (it fails safe); the justification given for it was not. Fix the reason, not just the outcome.**
- **The controller's mutation-4 recipe for ERASE-1 was wrong as written** — it went red **for the
  wrong reason** (a call-shape assertion fired first), so the lane split the test to make the red
  *be* the zero match. ★ **That is the rule "when a mutation goes red, check it is red for the reason
  you claimed" applied to the controller's own brief.**
- **The controller asserted a four-name dormancy list from memory** — *in the same paragraph where it
  wrote "do not invent the block's contents"* — and the owner corrected it. `WIRE-2` (`#621`) had
  already ended `#578`, `#611` and `#617`. ★★ **The hedge saved nothing; the assertion still
  propagated into a dispatched instruction.** ⇒ **Read the real block on trunk; verify every name
  against the file.**

### ★★ THE DECISION THIS HANDOFF MADE ON ITS OWN — and it should be reviewed, not assumed

**This PR's branch was cut from `#642`'s head (`c2e6bebb`), NOT from trunk (`6f7da56e`), and that is
a deliberate deviation from the brief that commissioned it.**

**Reason:** `#642` (the ME-A handoff) was **still open** when this content was written, and it
rewrites the top of all seven `handoff/` files. A branch cut from trunk would produce a PR whose diff
**reverts every one of `#642`'s changes** — the exact silent-revert failure the project has already
recorded as a stale-base hazard, and one that no gate in this repository detects.

**Cut from `#642`'s head instead, the diff contains only this wave's additions**, and after `#642`
squash-merges as `S` the branch replays cleanly with
`git rebase --onto S c2e6bebb docs/post-wave-dpdp-a-handoff`.

⚠ **The tradeoff was stated rather than hidden:** if `#642` had been **closed unmerged**, this branch
would have carried ME-A's content and needed a conflicted rebase onto trunk.

✅ **OUTCOME — the decision resolved while this handoff was being written.** `#642` **merged** at
`2026-08-09T01:58:22Z` as `516e50ff`, and its squash tree is **byte-identical to `c2e6bebb`**
(`git diff --stat 516e50ff c2e6bebb` is empty). The branch was rebased onto trunk with
`git rebase --onto 516e50ff c2e6bebb`, **zero conflicts**, and its diff against trunk is exactly the
nine docs files in this PR.

★★ **The counterfactual is why this entry exists.** Had the branch been cut from trunk as the brief
directed, the PR opened after `#642` merged would have shown a diff **reverting all twelve of
`#642`'s files** — and **merging it would have silently undone the ME-A handoff.** ⚠ **No gate in
this repository detects that**, and the project has already recorded one force-merge of two handoffs
that silently preserved stale content over corrections. ⇒ **A docs branch must be cut from the tip of
whatever handoff PR is already open, never from trunk beneath it.**

---

## 2026-08-09 — WAVE ME-A, four lanes + two scouts under a controller + subagent model (#634 · #641 · #637 · #636, trunk `e8f89863`)

**`2026-08-08T23:31:55Z UTC / 2026-08-09 05:01 IST`**

> ★★ **Four lanes, and every one disproved part of its own spec — including the CONTROLLER'S OWN
> suggested fix shape. The verdicts below are useless without their reasons, so the reasons are
> recorded and the verdicts are not recorded alone.**

### ⭐ OWNER RULING — MI-CONCEPT-1 takes "OPTION 4", none of the three the controller offered

**RESOLVE THE CONCEPT FROM THE QUESTION ID AT RECORD TIME.**

**Why the ruling was needed:** a disjointness scout disproved the arc's §0 premise — *"`CanonicalQuestion.subtopic`
is required, so every write site already holds `q.subtopic`"*. The owner confirmed it in his own
words: *"true of the bank question, false of what's persisted and replayed at grade time."*

**Why option 4 beats all three offered options — the owner's reasoning, kept because the reasoning
is what the next lane inherits:**
- The **persisted shapes already carry what is needed** — `PersistedWorksheetQuestion.id` and
  `QuickPracticeSavedAnswer.questionId`, documented in-repo as *"The real bank question id"*.
- So a small memoised **id → subtopic index over `canonicalQuestionBank`** closes gap 1 **completely
  this wave, including the four grade paths** ⇒ **beats the 1a/1b split** (no split, no waiting).
- With **no persisted-shape change at all** ⇒ **beats the widened lane** — the old-client-state
  migration that broke production past 1,082 green tests in Wave 4 **never happens**.
- And **nothing logged meanwhile stays unattributable** ⇒ **beats narrow-only**.

**FOUR RULES ON THE LOOKUP, carried verbatim into the lane brief:**
1. **Pure read, memoised, built once, never writes.**
2. **Prefer `q.subtopic` when in hand**; resolve from the id only where it is not.
3. ⭐⭐ **Return the bank's subtopic VERBATIM — never re-derived, never normalised.** **A second
   resolution is a second vocabulary**; `quickPracticeSessionService.ts` already warns of exactly
   this (`[FU-PROG-TOPIC-KEY-MISMATCH]`).
4. ⭐ **An unresolvable id yields NO concept — never a guess, never a topic-level fallback.**
   Withheld and deleted questions will not resolve, and **absent is honest where approximate is
   not.**

**Check & Improve is unchanged:** free-typed answers are not bank questions, so **no id and no
concept** — and that is correct behaviour, not a gap.

### D1 — (a) A SEPARATE OPS LANE. Dispatched as `OPS-LIFT-1` (`#641`). `#637` needed no rework.

**The owner read `check_improve_convergence_acceptance.mjs` on trunk himself.** ⭐ **The guard
documents its own amendment procedure and carries two precedents for exactly this.**
- The FORBIDDEN zero-diff array and a **separate unconditional membership assertion** exist so a
  shallow checkout still proves the guards are wired.
- The comment above the second one says it outright: ⚠ *"THE LIFTED ENTRY'S LINE MUST LEAVE THIS
  LIST TOO — a removal from FORBIDDEN alone would fail the gate on its own amendment."*
  **The guard anticipates being lifted and tells you how.**
- **Two prior lifts are recorded in the same file with reasoning** — `checkSolution.cjs` (Wave 3
  PR-C1) and `DesktopShell.tsx` (PR-B1) — both replaced a blanket ban with **targeted tests whose
  presence and wiring are themselves asserted**, so a lift *"cannot decay into no protection at
  all."*
- **The lane was right to STOP rather than edit outside its allowlist**, and right that routing
  around the guard would have created **a second MI writer into the store the tutor reads.**

> ⭐⭐ **THE ONE THING THE OPS LANE HAD TO GET RIGHT — FORBID-1 GOT IT WRONG AND IT COST FOUR DAYS.**
> **A guard replacing a blanket ban pins what the ban PROTECTED, not what the file did that day.**
> FORBID-1 asserted a CTA was enabled — **true on the day, unrelated to the ban** — and it **blocked
> GATE-2 four days later.**
> ➜ So the replacement tests pin **the MI contract**: `recordMistake` is the **single writer** into
> the log · the **four-type taxonomy is exactly those four** · **`marksLost` accounting** · **one
> entry per graded question, never N** · **careless types never surfacing as a topic weakness.**
> Each mutation-verified.
> ➜ ⛔ **A test asserting *"`buildEntry` has a concept field"* WOULD HAVE BEEN THE FORBID-1 MISTAKE
> REPEATED.**

### D2 — (a) RATIFY chapter-echo suppression, **with one enumeration first**

⭐ **The controller's reversibility argument was only half true, and the owner corrected it:**
worksheet, full-mock and chapter-test store **synthetic ids**, so for those three paths a suppressed
concept **cannot be recomputed from the log. Reversible for Quick Practice only.**

**REQUIRED BEFORE RATIFICATION, and the reason:** enumerate what `isChapterEchoSubtopic` **actually
matches across the WHOLE bank** and **prove zero real subtopics are caught** — *"ENUMERATE; DO NOT
SPOT-CHECK. If it over-matches even one, we lose real data irreversibly on three paths."*

**✅ PRECONDITION SATISFIED.** A scout **imported and ran the real exported symbol** (no
reproduction) at `55d5ee19`: the predicate matches exactly three things — empty/whitespace-only,
**exact** `general`, and **prefix** `chapter practice`. Over **8,543 questions / 1,914 distinct
subtopic values**: **14 matches, ALL echo, ZERO real subtopics caught.** `"General"` ×224 across 25
topicKeys, plus 13 `"Chapter Practice — <chapter>"` values totalling 549 questions ⇒ **773 / 8,543 =
9.05% suppressed.**
⭐ **The one near-miss is safe BY CONSTRUCTION, not by luck:** `"AP: nth Term and General Term
Formula (Applications)"` contains "general" but the predicate uses **exact equality, not
substring**. Zero values in the bank carry leading/trailing whitespace, double internal spaces, NBSP
or zero-width characters.
⚠ **Recorded honestly: the predicate is brittle where it does not matter today** — it misses
`"Chapter-Practice"`, `"Chapter Practise"`, inner-double-space and NBSP variants. **The bank contains
none of those**, so it is correct now and **one bank edit from silently admitting an echo as a
concept.** ➜ `[FU-CHAPTER-ECHO-PREDICATE-BRITTLE]`.

⚠ **AN UNRESOLVED CONTRADICTION, RECORDED RATHER THAN SMOOTHED OVER.** The scout reported evidence
that the owner's irreversibility correction **may not hold** — the worksheet/CT/FM path in
`progressStore.ts` deliberately reads **real bank ids out of `record.questionIds[]`**, not the
synthetic attempt id. **The scout verified the PREDICATE, not `#637`'s wiring**, and says so itself.
➜ **The ratification is unaffected either way — reversibility only makes it safer — but the REASON
must be corrected in the record, because the reason is what the next lane inherits.**
➜ `[FU-MI-CONCEPT-REVERSIBILITY-UNCONFIRMED]`.

### D3 — (a) HOLD THE HPQ PIN. But the follow-up is **sharpened to a LIVE CORRECTNESS DEFECT.**

**Reason:** a **37% HPQ ranking change does not ride inside a lane that was told to pin HPQ**, and it
deserves its own live-verify. Canonical strategies staying **built-but-not-default** means flipping
later is **config, not rebuild** — the correct shape.
➜ ⭐ **Logged as a LIVE CORRECTNESS DEFECT, not a follow-up.**
`legacyFuzzyMatch("Circles","Areas Related to Circles") → true` conflates two distinct CBSE chapters
**in production today**, and **predictions for each are contaminated by the other's evidence.**
➜ ⭐ **CONNECT IT:** the owner had previously flagged `fuzzyMatch` in the trends audit as a
**silent-MISS** risk when labels drift across ten years. **This lane proved it also produces silent
HITS. Same root cause** — and it is precisely why `#636`'s shared primitive routes everything
through `resolveCanonicalSlug`.
➜ **The owner is the CBSE authority on whether conflating those two chapters materially misleads a
student. That ruling is his, not a lane's.** **STILL OPEN.**

### D4 — CORRECT `CLAUDE.md` §6 in the closing docs PR ✅ **DONE IN THIS PR**

§6 stated the Vite production build **cannot** run on a Windows dev box. **It is wrong — three lanes
ran it locally during this wave.**
➜ **Corrected, AND the method recorded**, so the next lane **reproduces rather than rediscovers**:
drop **`@rollup/rollup-win32-x64-msvc@4.59.0`** into
`node_modules/.pnpm/rollup@4.59.0/node_modules/@rollup/`.
➜ **Why it mattered enough to be an owner ruling:** as written, §6 **discouraged the strongest
available `MOUNT != LIVE` proof** — ★★ **a test proves the code works; a chunk proves it ships.**
➜ `[FU-WINDOWS-BUILD-RUNS-WITH-ROLLUP-BINARY]` **CLOSED by this PR.**

### CONTROLLER DECISIONS, with reasons

1. **Wrote all four owner attachments to disk before any dispatch** — ★★ *an attached document is
   not a file*; none existed on disk, and the prototype is ME-C's only authority for flow and copy.
2. **Transcribed the addendum as v1.1 with §6 replaced**, retaining v1.0 §6 marked NOT IN FORCE —
   **because a superseded rule left in place reads as current**, and that one named a controller
   which cannot outlive its author.
3. **Scouted the call-site set instead of assuming the brief's "8 write sites"** — the arc file
   itself says RE-DERIVE, and *enumerate the set, do not grep a member*. **It cost one subagent and
   caught a false premise that would otherwise have surfaced mid-build.**
4. **Dispatched MARKS-1 and TRENDS-MARKS-1 without waiting for the MI-CONCEPT-1 ruling** — both are
   unaffected by that ruling **under every option on the table** and are verified disjoint by exact
   path. **Idling two lanes on a question that does not touch them buys nothing.**
5. **Did NOT unilaterally narrow MI-CONCEPT-1** — **scaling scope down is the owner's call.** The
   compounding argument for dispatching it first survived the scout's finding (only the *mechanism*
   was wrong), so the ruling went to the owner immediately rather than being deferred.
6. **Told both lanes NOT to run `test:matrix:all` locally** — it is CI-only on this box and two
   concurrent runs have OOM-killed the editor, with two lanes running in parallel.

### ⭐ A CORRECTION THIS WAVE MADE TO ITS OWN RECORD — kept, because withdrawing evidence is the point

**An earlier version of the wave-state file, and the controller's report to the owner, cited `#636`'s
`md5 aa58d9fd6583a827066ff51d004c3683` as the proof the HPQ ranking had not moved.** The refresh lane
found **that md5 is not independently reproducible** — the serialization recipe was never recorded,
and five reconstruction variants all differ.
⭐ **This is NOT evidence the ranking moved.** Identity was re-proven on the new base: all 140 HPQ
questions scored with the lane scorer and with trunk's pre-lane scorer swapped in produced
`md5 619eb330af44294a17745d685f889a1e` on **both** sides **in the same run**, with the swap **proven
applied** (blob `620d5c3b` != `34704b87`) and the restore verified byte-exact; the tamper control
turned RED on one changed digit in 1 of 140 rows, then restored green.
➜ ⭐ **What was wrong was the EVIDENCE CITED, not the conclusion — so the conclusion is kept and the
evidence is WITHDRAWN, explicitly.** ➜ **Future lanes must rely on the frozen 140-row literal in
`cbse5SignalScoring.hpqPin.test.ts`, which is the artefact that actually gates. Do not cite either
md5 as portable proof.**

### ⭐ DECISION TAKEN BY THIS DOCS LANE — the dormancy block was RESTATED AS CORRECTED

**The brief commissioning this handoff instructed that `expectedMarks` be added to the WIRE-2
dormancy block *"as a FOURTH dormant capability beside `#578`, `#611`, `#617`."*** ⭐ **Verified
against trunk and it is wrong: `WIRE-2` shipped as `#621` in Wave 5F and ENDED all three.**
`gradeQuickPracticeBatch` has a real production caller in `lazytopper/src/pages/PracticePage.tsx`,
and the Wave 5F `[CURRENT]` states it in its own words.
➜ **Decision: preserve the historical block unchanged in the demoted sections, and restate it in the
new `[CURRENT]` AS CORRECTED — `expectedMarks` is the ONLY dormant capability, not the fourth.**
➜ **Reason:** copying a carry-forward instruction through unexamined would have published three
false *"dormant"* entries **under the authority of a rule about not losing them.** ⭐ **A
carry-forward instruction is itself a claim about the repo, and it goes stale exactly like any
other.**

---

## 2026-08-07 — WAVE 5F, four lanes + a scout + a CI-diagnosis lane (#619 · #620 · #625 · #621 · #626 · #627, trunk `fbfb57fa`)

> ★★ **Six PRs, four lanes, 1,400+ tests, six green CI runs — AND TYPED GRADING HAD NEVER ONCE
> WORKED IN PRODUCTION until the owner tried it on his phone. No gate found it.** That is the
> argument for the ~50-student QA pass, in one sentence.

### ★★ DOCTRINE EARNED — eight items, three from the `#627` lane alone

**1 — A CORRECTION IS NOT EVIDENCE. IT IS A NEWER CLAIM.** The cofounder told the owner *"there is no
`marksAwarded` field"*, then corrected himself to *"it is in the response schema's REQUIRED set"*.
**BOTH were wrong on mechanism.** The cited `:283` is `propertyOrdering`; `required` is `['qNumber']`
alone, and the omission is the **server's hand-built early return**, not the model's. The controller's
instruction — *do not inherit EITHER version on faith, re-locate BY SYMBOL* — is what caught it, and
it was the **second time in one wave** that a superseding correction was itself wrong. **Verify both
versions; a later claim is not a verified one.**
★ Related and load-bearing: **a line reference is a derived value nothing re-checks — cite by symbol
or by quote.** (Third wave running that this has cost something.)

**2 — A MUTATION THAT GOES GREEN MAY BE A HOLE IN THE TEST, NOT THE ABSENCE OF A TRAP.** `#627`'s M3
went green because the assertion pinned a **fragment** of the rule-6 head; a prepended *"NEVER set
couldNotRead."* survived it. Re-anchored to the **whole** head, it reddened. **The hole was in the
test.** A lane that had recorded M3 as "no trap" would have shipped an assertion that could not fail.
⇒ **A green mutation is a question, not an answer.** (Compare Wave 5D's converse: a mutation that
never APPLIED reported all-green and accused a good test of being fake. **Prove the mutation landed,
then interpret its colour.**)

**3 — AN EXISTING GREEN TEST CAN PIN THE DEFECT IT WAS MEANT TO PREVENT.** `§5.11` asserted
`marksAwarded === undefined` — i.e. it pinned the ambiguity that let a renderer show 4/4 with
"outstanding work" for an ungraded answer. Fixing the shape **required** changing it; the intent was
re-asserted **positively**. Same family as `#490`'s `Login.oneDoor.test.tsx`, and as `#621`'s
`quickPracticeSessionService.batch.test.ts` §6, which pinned `"typed-no-channel"` and reddened **by
construction** when the hinge was deleted. **An allowlist exception to invert such a test is
justified; silently working around it is not.**

**4 — A FIELD REACHING THE EMITTER IS NOT THE REQUEST REACHING THE EMITTER.** `#625`'s brief said
*"`blockFor` emits the typed working when present"* and **never asked whether a request carrying only
typed answers is admitted**. It was not: `handleGradeWorksheet` refused a zero-upload request at the
front door, so the emitter was never reached. **The lane did exactly what it was told.** Same family
as MOUNT != LIVE, one layer further out. ⇒ **A brief for a data-flow change must name the ADMISSION
check, not only the emission site.**
★ And `#626` showed it is **two layers, not one**: admitting the request and **building a coherent
prompt for it** are different problems. **The brief named the door and not the room behind it.**

**5 — A TITLE IS NOT AN ASSERTION.** The test titled *"a typed answer alone reaches the model — the
free-tier path is not a 400"* **sent `imageBase64: 'PDFB64'`.** It never exercised a zero-upload
request at all, and its title read as exactly the coverage that was missing — so four lanes and the
cofounder all saw the path as covered. Sibling of *"a test with a data guard passes while asserting
nothing"*; here **the FIXTURE is what hollowed it out.** ⇒ **Every new test's fixture must be quoted
in the lane report and checked against its title.** `[FU-TYPED2-SUITE-TITLE-VS-FIXTURE]`

**6 — A GREP HIT IS NOT LIVE CODE.** Two `typed-no-channel` hits remained on trunk after `#621`;
**both were COMMENTS** that exist *because* the hinge was deleted, explaining what replaced it. The
live code reads `if (nonEmpty(answer.imageBase64) || nonEmpty(answer.textAnswer)) return "batch";`
and `typed-no-channel` is gone from the union type itself. **Checking by content took one command and
prevented re-dispatching a lane that had already merged.**

**7 — A WATCH THAT POLLS FOR COMPLETION CANNOT SEE A JOB THAT WAS NEVER CREATED.** The owner's
correction, and it was right. *"Waiting for the outage"* and *"no run exists"* look **identical** from
outside, and the check the controller specced (`gh pr checks` / run conclusions) is silent when there
is nothing to conclude. **Before waiting on CI, confirm a RUN EXISTS — not merely that the PR is
BLOCKED.** `mergeState=BLOCKED` with no run means **nothing ran**, not that a gate failed. The
empty-commit test proved dispatch had died **repo-wide**; a watch re-specced on RUN EXISTENCE
detected its recovery, and the completion watch it replaced would have stayed silent through exactly
that transition.

**8 — A LOGGER'S SEVERITY IS ABOUT THE STATUS CODE, NOT ABOUT WHETHER ANYTHING WENT WRONG.** Recorded
by the owner from `#619`'s live-verify, and it was the **third instance in a single day**:
`[warm] Recurring pool top-up disabled` while 312 combinations STARTED; `[warm] Skipping pool
pre-warm` meaning the OLD code was deployed, not that a gate held; and `pino-http` logging the
**deliberate** 503 refusal as *"request errored"* **with a stack trace of pino's own frames.** The
guard HELD; the log said "errored". ⇒ **READ THE FIELDS, NOT THE WORD.**

★ **THE THREAD THROUGH ALL EIGHT, and through `[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]` (*"it would look
like success"*) and the mutation-harness race (*"reads like noise"*): the signal is present, and it
reads as its own opposite.**

### OWNER RULINGS

**RULING 1A — the server field lands BEFORE `#621` merges.** Typed working is the **free-tier** path:
a student without a camera, or on a laptop, types. Regressing it hits the students **least able to
work around it**, and *"a later lane will fix it"* is exactly how `#578` sat dead for eight days.
**1C rejected STRUCTURALLY** — it breaks the "exactly one call per session" invariant the whole lane
rests on. ★ `WIRE-2` was **RIGHT not to reach for `server/**`** — the allowlist working as designed.
⚠ It also made the one **dishonest string** in the flow true before any student saw it: the
kind-independent heading *"Saved. Graded when you finish."* was being shown to typed answers that
would never be graded. Under the rejected option it would have been a **live doctrine breach**.

**RULING 2A — the client-side upload cap folds into the same server lane.** A hard 400 with no
explanation is the silent failure this project keeps paying for, and it is nearly free to fix while a
server lane is running anyway. ⚠ **It required an EXPORTED constant, not merely a client `if`** —
`MAX_BATCH_UPLOADS` was purely server-side at three sites and **the client could not even learn the
cap**. ⚠ **And it is why `#621` MUST NOT BE SPLIT:** on trunk, Quick Practice's builder was uncapped
and presets go to 20, a **latent 400** inert only because nothing called it. `#621` adds both the
trigger **and** the cap; a trigger merged without the cap re-opens exactly this.

**RULING 3A — THE OWNER REVERSED HIS OWN RULING** on the graded sheet (route vs modal). He had ruled
"route" partly on **1,877 px of content inside a 540 px card** — and `RESULTS-1` (`#617`) had
**already** fixed that overflow with max-height + scroll. ★★ **He ruled on a measurement that was
superseded before the lane opened — the count rule applied to a LAYOUT.** His remaining reason (a
graded paper is something a student RETURNS to) still stands, but does not justify bolting a
top-level branch onto `PracticePage.tsx`, whose GUARD 3 pins `<PracticePage />` **propless** and which
has a production-break history. **He recorded the lane's reasoning as better than his own.**
⇒ `[FU-QP-GRADED-SHEET-NOT-A-ROUTE]` is **DEFERRED, NOT RESOLVED**, and section 9b's `App.tsx`
authorization **STAYS GRANTED** for the future graded-sheet route lane.

### CONTROLLER RULINGS

**MERGE TRUNK IN; DO NOT REBASE A PUSHED BRANCH.** The `AMEND-621` brief said *"rebase `#621`'s branch
onto trunk"*. That branch was already pushed, so a rebase requires `git push --force`, which
`CLAUDE.md` §3 lists as **NEVER auto-approved**. A `git merge origin/base/approved-thru-437` resolves
it identically, and because this repo **squash-merges** the intermediate history collapses and never
reaches trunk — **a rebase buys nothing.** ⇒ ★★ **A brief instructing a never-auto-approved operation
is a SPEC ERROR the controller must catch BEFORE dispatch, not a permission to grant quietly.**
Relatedly, the lane was told **not** to "clean up" the fixed-forward mutation commit `16dd9506`:
known, deliberate, harmless under squash-merge, and tidying it would mean a force-push for no benefit.

**A LANE'S CI CLAIM IS A READING TAKEN AT ONE MOMENT.** `AMEND-621` returned PASS with all local gates
green and CI *"queued behind CodeQL"*, correctly noting that the earlier conclusions on that head were
concurrency **CANCELLATIONS** rendered as `failure` at run level. **That was true when it looked, and
stopped being true.** The runs later completed as failures while the wave state still recorded the PR
as "complete, awaiting CI". ⇒ ★★ **A lane dies before the run finishes; the controller must re-read
the TERMINAL state itself, never inherit the lane's.** (And: **read the JOB, not the RUN.**)

**DIAGNOSE, NEVER GUESS.** The controller offered two hypotheses for Lane Overlap's red — a
`GATED_FILES` condition failing rather than warning, or a tool error. **Both were disproven**:
`GATED` appears nowhere in the log, and the source documents that path as *"WARNS (never fails)"* with
`process.exit(0)`. The job's every step was `success`.

**AN AVAILABILITY PROBLEM IS NOT A DEFECT TO FIX IN THE BRANCH.** `CI-FIX-621` changed **zero lines**
and suppressed, baselined and excluded **nothing**. ★★ **The CONTROL settled it: Lane Overlap flipped
`failure` -> `SUCCESS` on the same head with zero code changes** — worth more than the three log
diagnoses, because it is a control rather than an interpretation. Corroborated by an **external**
source (GitHub Actions `major_outage`, CRITICAL, opened 90 minutes before the first failing run) and
by a **15m02s queue expiry on a run against TRUNK itself**, which contains none of the diff.
⚠ **CodeQL was held as a possible genuine security finding, and that caution was CORRECT to hold** —
the head in question opens a student-free-text channel into an LLM grading prompt. The answer was
infra: its only step was `Set up job = failure`, **the analysis never ran**. It was later re-run and
**genuinely executed** — extractor loaded, database built, ~45 queries, SARIF uploaded, **zero open
alerts on the branch**. ⇒ **The security question is answered by an analysis that ran, not by a tick.**

### SCOPE ACCEPTED BEYOND THE DECLARED ALLOWLISTS — each justified, none silent

- **`#619`'s `lazytopper/package.json` edit — REQUIRED, not scope creep.** ★ **The shared lock that
  almost bit:** root guard-matrix check `a15` **enumerates `server/**/*.test.cjs` FROM DISK** and
  reddens if one is unwired, so any lane adding a server test **must** edit the same two lines.
  ⇒ **A declared-allowlist comparison cannot see a lock created by a gate that enumerates from disk.
  ACTUAL PR file lists are checkable, and that check is the CONTROLLER's job, not the lane's.**
- **`#620`'s `geminiClient.cjs` + `telemetry.cjs`** — the brief named `tokenTelemetry.cjs`, **which
  does not exist**. And its **second orthogonal axis** was accepted over widening `CALL_CLASSES`,
  which is pinned equal to `rateLimiter.PAID_ENDPOINTS` **so the two datasets JOIN**.
- **`#621`'s `PracticeQuestionList.tsx`** — the **only** edge between page and card, pure
  pass-through, flagged by the lane. **The brief's allowlist was both WRONG** (`PracticeQuestionCard`
  lives under `components/practice/`, not `components/question/`) **and INCOMPLETE.**
- **`#627`'s change to the existing `§5.11`** — see doctrine item 3.

### DISJOINTNESS AND SEQUENCING

**All three parallel lanes verified mutually disjoint by comparing ACTUAL PR file lists, not declared
allowlists. Zero shared paths.** `App.tsx` was **never touched**; section 9b's authorization went
unused and **stays granted**. ⚠ **The server lane could only be cut AFTER `#620` merged** — it shares
`checkSolution.cjs` — and **PRs are never stacked** (a stacked PR deadlocks with its own base in
`lane_overlap`, proven in Wave 5D). Merge order held: `#619` -> `#620` -> `#625` -> `#621` -> `#626`
-> `#627`.

### CARRIED UNRULED INTO WAVE 5G — deliberately deferred, the OWNER's calls

**1 · THE FENCE.** ★ **PRODUCT-WIDE, AND LIVE TODAY ON CHECK & IMPROVE.** The `AMEND-621` brief's
premise — *"until this merges, no student-typed text has ever reached the grading prompt"* — was
**FALSE**; it already does, from `SolutionChecker.tsx` and `DesktopCheckImprovePage.tsx`, through the
**identical** fence, since `57224f49`. **This arc EXTENDS an existing injection surface.** The lane
therefore **declined to write the assertion its brief requested — it would have been FALSE** — and
asserted the true property instead (the delimiter is carried **verbatim**; the client neither mangles
nor escapes it). Settled from source: **forgeable YES** (no escape, no filter, no truncation; the only
bound is an ~8 MB body cap); **blast radius reaches other questions in the same call** (one
`callGemini`, one user turn, `questions[]` uncapped to 20 while the 12-cap bounds only `uploads[]`);
**the subjective mark is what an injection can inflate**, while qNumber reconciliation, the
per-question mark ceiling, the keyed objective clamp and the status allowlists all survive; **the
privilege boundary HOLDS — the damage is self-inflicted grade inflation and a polluted OWN MI.**
Fix = **2 sites in 1 server file, no client change**; the wider free-text surface is **19 sites across
6 server files, of which `/api/tutor` is 9**, and `figures[].label` / `brief.*` reach the **SYSTEM**
prompt uncapped. ⇒ **Its own lane, covering all three call sites.**
⚠ **NOT ESTABLISHED: whether a real Gemini model actually OBEYS a forged fence.** Nobody has run it.

**2 · `/admin/diagram-*` AUTHENTICATION.** Reported as the only `/admin/*` routes **not** wrapped in
`<RequireAuth>`, posting a free-text textarea to `/api/generate-diagram` — **the one plausible
UNAUTHENTICATED free-text path to Gemini**, with cost **and** abuse exposure.
⚠ **NOT ESTABLISHED whether it is blocked server-side**; `entitlement.cjs` / `verifiedCaller.cjs` were
never opened for that route. **The owner will not rule from a name — this needs the finding first.**

### CLAIMS REFUTED THIS WAVE — recorded so nobody re-inherits them

- **"Full Mock silently 400s on the upload cap" — FALSE.** The cap counts **answer photos in
  `uploads[]`**, not questions; Full Mock's call literal has **no `uploads` key**, so `0 > 12` is
  false. *"A CBSE mock has far more than 12 questions"* is **true but irrelevant** — nothing bounds
  `questions.length`. (Full Mock does carry a different real risk: truncation at
  `maxOutputTokens: 32000`, already tracked as `[FU-ASYNC-GRADING]`.)
- **"The mobile full-marks reading is a device-specific defect" — FALSE.** The owner's first mobile
  test ran **before `#626` reached Railway**. The same session now grades correctly on both surfaces.
  **Not a mobile defect and not non-determinism — a pre-`#626` failed-request path. CLOSED.**
- **"The client half of `WIRE-2` is a DELETION, not a rewrite" — FALSE.** Deleting the hinge alone
  would have been a **silent no-op**; the payload builder had no `textAnswer` passthrough, and
  `uploads` had to be **filtered** or a typed-only answer sends `imageBase64: "undefined"` and
  **shifts every later photo**.
- **"`#625` closes typed grading" — FALSE at the time.** It merged as **a capability with no caller**;
  merging it changed nothing live.

### LESSONS ABOUT THE WAVE-STATE INSTRUMENT ITSELF

⚠ **A SECTION-LIST DIFF IS NOT A COMPLETENESS CHECK EITHER.** The standing controller note says to
diff the SECTION LIST after every whole-file rewrite. It was done every pass and passed every pass —
**while a DECISION LINE inside a section went missing** (the Drizzle record, restored in pass 8).
**A section-list diff catches dropped SECTIONS, not dropped LINES** — the same failure the note
describes, one level down. ⇒ **Also diff the LINE COUNT per section, or grep a known load-bearing
token from each section, before writing.** The FU entry survived, which is why it was recoverable.
⚠ **A `\uXXXX` escape in a non-raw string aborted a state write** while the identical defect class
rendered **silently** in JSX. **The defect class is live in TOOLING, not just in product code.**

---
## 2026-08-06 - Wave 5E, four controller lanes + two owner lanes (#611-#617, trunk `9cfcb09a`)

**1 - QUICK PRACTICE BECOMES EXAM-SHAPED. Nothing grades per question; ONE batched call at Finish.**
Rejected: batching only the unchecked answers (preserves inline feedback but saves little, and a
student who checks everything saves nothing); a mode toggle (doubles the test surface, needs UI that
is BATCH-2's). **The controller recommended the rejected option and was overruled against an
owner-locked design** -- the BATCH-2 spec's section 1 is headed "THE FLOW - owner-locked" and reads
"Each saved answer is held in session state. NOTHING is graded yet."

**2 - A CLAIM RETRACTED, AND THE RULING IT SUPPORTED SURVIVED ANYWAY.** The claim that batching
produces a cross-question artefact "five separate checks never produced" is **FALSE**: Mistake
Intelligence reads the STORE, and five records from five calls are indistinguishable from five from
one. **The cross-question pattern is an MI-LAYER property, not a grader-call property.**
=> **batching buys COST and LATENCY** (thinking is ~81% of output-rate spend; 17.0s average) **and a
coherent RESULTS SURFACE. Nothing else.** It had reached three cofounder documents and two controller
ones; all corrected. **The cap-not-chunk ruling still stands on its other grounds.**

**3 - THE COMBINED LANE WAS SPLIT into `RESULTS-1` (UI, fixture-driven) then `WIRE-2` (the trigger).**
Reason: three lanes had returned past the context floor, and **the cause was spec size, not agent
judgement** -- 250 lines, ten assertions, four SHA-verified mutations, screenshots and a live probe
cannot be finished honestly at 25%. **A fourth restatement of the rule would not have worked.**
Confirmed: RESULTS-1 returned at 22%, and diagnosed the residual as environment.
**RESULTS-1 ships DORMANT deliberately** -- the owner rules on the graded sheet **before** the loop
changes under students, rather than discovering at live-verify that it reads wrong with the trigger
already flipped. The dead-capability failures were lanes forgotten **across waves**; WIRE-2's brief
was written **before** RESULTS-1 dispatched, so there is no gap.

**4 - THE GRADED SHEET IS A ROUTE, NOT A MODAL.** At 1024px it is ~1,877px inside a 540px card --
measured, not hypothesised. **And a graded paper is something a student comes back to**: a modal
cannot be linked, bookmarked or reached from history, and Quick Practice sessions should appear in
`SurfaceHistory` as Chapter Test and Full Mock already do.

**5 - TWO NARROW AUTHORIZATIONS GRANTED IN `WIRE-2` v1.1**, each for exactly one change:
`ResultsScorecard.tsx` for **one copy line** ("Ready to grade" -> "Diagnosed from your working" --
owner-acknowledged as his own error, pre-grade copy on a post-grade sheet), and `App.tsx` for **route
registration only**. **Both rulings had been made with no lane to land in; the controller caught that
before a lane hit them.**

**6 - `MAX_BATCH_UPLOADS=12`: CAP, DO NOT CHUNK.** A 13th photo is not Quick Practice's shape (5-10
questions), and chunking reintroduces the multiple calls batching exists to remove. Cap, name the
excluded questions, let the student grade the rest separately.

**7 - TYPED WORKING RETURNED AS `typed-no-channel` IS CORRECT** -- honest empty state over silent
drop. Adding the server field is a separate lane. **Until then, batching covers PHOTO working only,
and that must not be recorded as complete.**

**8 - THE PROCESS-KILL GLOB IS SCOPED TO THE LANE'S OWN WORKTREE, UNCONDITIONALLY.** An over-broad
`*LT-worktrees*` glob in every standalone spec issued 2026-08-05 could have killed a concurrent lane's
processes. **A "no lane-mates" assumption baked into an instruction goes stale the moment a parallel
lane starts. The safety must not depend on who else happens to be running.**

**9 - BRANCH CLEANUP: NO, AND NOT LATER.** ~190 remote branches cost nothing -- no build reads them,
no gate scans them -- and **`recovery/lost-trunk-42d82e8` is among them: trunk was lost once and
recovered from a branch. Old branches are the RECOVERY SURFACE.** Deleting them is irreversible for a
benefit measured in tidiness.

**10 - THE WAVE CLOSED WITH A LANE UNDISPATCHED, DELIBERATELY.** Rule 0's binding constraint is the
**handoff budget**, not the dispatch floor: **a controller that runs dry mid-handoff leaves the wave
half-closed -- the exact failure Rule 0 exists to prevent.** **A wave closes when `handoff/` describes
trunk; it does not require every lane to be done.**


## 2026-08-05 - Wave 5D, four lanes + one scout under a controller + subagent model (#606-#609, trunk `51f7712`)

Owner rulings across the wave, and the scope discovered after each lane was first planned.

**1 - PUSH POLICY: a subagent commits, pushes a DRAFT PR, and reads its own CI run. It never marks
ready, never merges, never pushes to trunk, never deletes a branch.**
The operating model contradicted itself: sec1 said a subagent "pushes as draft, reads the CI log";
sec6 said "subagents stop before commit." **Sec1 is correct; sec6 should read "stop before MERGE."**
Every Wave 5D brief header carried the same ambiguity, cofounder-acknowledged as his own error.
Decisive: the bounded report template REQUIRES a PR number and a CI run id with a quoted zero-skip
line, which only exist after a push; #580, #595-#598 and #601-#604 all reported both; BANK-1, the one
lane that stopped before commit, cost a round trip and gained nothing; and **only CI can produce the
vite build (linux-x64 pinned), the Firestore emulator suite, and the full-matrix zero-skip line.**
Preserved unchanged: a lane may still stop deliberately on a genuine blocker - a contradicted
premise, an owner decision needed, a forbidden file. **Stopping deliberately differs from stopping by
default.** Rejected: stop-before-commit (leaves the owner reviewing with no CI evidence at all) and
ask-per-lane (re-takes one decision five times).

**2 - `gh pr ready` is the OWNER'S step.** The model said lanes push drafts and never mark ready; it
never said who does. **Four PRs sat mergeable-but-draft.** Recorded in `NEXT_ACTION.md`.

**3 - `Welcome.tsx`: a narrow exception to the CLAUDE.md sec4 global ban, for the legal footer mount
alone.** CLAUDE.md:67 says "unless explicitly scoped"; this is that. Rejected: deferring it (leaves
the DPDP exposure open on the signed-out front door, which is the collection funnel) and widening the
exception (the file is banned for good reasons unrelated to this mount).

**4 - `#609`'s ~14 lines of scoped CSS: KEPT, though they exceed "the import only."**
The authorization was the import; **the PURPOSE was reachability.** The component default measured
**1.42:1 on hover and `:focus-visible`** - the link vanishes exactly when a keyboard user selects it.
Shipping the mount without it delivers a footer that passes every assertion and fails the student.
Bounded: 2 files, +172/-0, zero deletions, zero existing lines changed, via a documented `className`
hook. **That is the same defect the lane caught in the controller's brief, one layer down.**

**5 - `#608` merges despite `[FU-LEGAL-FOOTER-REST-CONTRAST]`.** 4.49:1 against 4.5:1 is not worth
blocking a lane that closes a DPDP exposure on three surfaces. **But fix it in the COMPONENT, not per
host** - `#969ea9` measured at 6.59:1 rest / 17.84:1 hover - which makes `#609`'s override redundant
and every future host compliant. Small lane, Wave 5E.

**6 - `[FU-LEGAL-CONSOLIDATE-UNDER-ONE-ROOF]`: owner design call.** He judges the public-landing
footer harmful to a designed page and prefers legal under one roof, reached from the avatar and the
door. Merged for now; he verifies live, then relocates. **The compliance point is the COLLECTION
point** - the sign-up door, which already links and is pinned by a test.

**7 - `CLAUDE.md`'s "190 checks" is NOT stale, and the flag was the drift.** It reads "as of
2026-07-28; the count GROWS; read it from the run." **Reading 196 is that instruction working.**
Third lane this session to flag that file; third to be wrong. **Do not edit it; record the pattern.**

**8 - `[FU-EFF-RESPONSE-SCHEMA]` is CLOSED; it shipped in `#559` (PR-C2) and was never needed.**
The cofounder inferred "not shipped" from `responseMimeType` present without a schema - **one line
read, twelve unread.** A read-only scout settled it on trunk with the chain quoted at every hop:
constants at `:167`/`:212`/`:266`, wired at `:595`/`:888`/`:1385`, reaching the wire at
`geminiClient.cjs:392`, with `callGemini`'s three call sites all carrying a schema and 18 contract
tests behind it. **The "MI is built on noise" framing is RETIRED - grading has been constrained since
#559.** The wrong claim had reached three documents. Struck rather than deleted, per the precedent at
`LazyTopper_Cost_Pricing_Analysis_v1_1.md:105-110`.

**9 - `SERVER-1` sec2 (thinking budget) ships NOTHING, and that was correct.**
`thoughtsTokenCount` is behind an admin endpoint on the live deploy that a worktree cannot reach, and
every grader test stubs the Gemini client, so the brief's own quality proof was unobtainable. The
lane refused to certify a grading-quality property it had not measured. **Cheap wrong grading is
worse than expensive right grading; the grader feeds MI, and MI is the moat.** The telemetry has
since been read and **still does not unblock it** - see `[FU-TELEMETRY-NO-CALL-CLASS-NO-PERCENTILES]`.

**10 - `#607`'s `artifacts/api-server/package.json` test-script line: ratified** - one line, no
dependency, no lockfile change.

**11 - Wave 5E runs FOUR lanes.** Rule 1 stands: cost scales with lane count and the expensive thing
is re-work. AUTH-1 was never a parallel slot - it runs alone.

**12 - `DATABASE_URL` is no longer an owner task; it is a LANE.** `WARM_POOL_TOP_UP_INTERVAL_MS=0`
was set as the brake and **was not sufficient** - it disables the recurring top-up only, while a
separate one-time STARTUP pre-warm is ungated and began a 312-combination run. What saved it was an
unrelated failure: the schema had never been created, so every combination erred at the count step.
**With a populated schema it would have proceeded.** Gate the startup pre-warm and create the schema
BEFORE any second attempt. `[FU-WARM-POOL-STARTUP-PREWARM-NOT-GATED]`

## 2026-08-04 - Wave 5C, four lanes under a controller + subagent model (#601–#604, trunk `203fb370`)

Owner rulings across the wave, and the scope discovered after each lane was first planned.

**1 · `CLAUDE.md`:90 — the banned-topics parenthetical is STRUCK (deletion, not rewrite).**
The controller reported a `CLAUDE.md` §5 / `NEXT_ACTION.md` §0 contradiction. **There was none.** §5
already defers to the executable guard; its topic names are an **`e.g.`**, not the list. ★ **The
deletion is self-justifying: that sentence's own instruction is "never from memory," and the
parenthetical is precisely a from-memory copy of a list that has since drifted.** Rejected
alternatives: amending §5 (treats a symptom), a pack-specific exemption (records an exception to a
ban that was never correct), holding (leaves a doc claiming a CBSE-assessed chapter is banned, in the
file every agent reads first).
★★ **Generalisation, fourth instance this week** (`175` in a comment, `59` in a comment, `103`
alerts in two documents, now a banned-topics list in prose): **a prose restatement of a
machine-checkable fact is a derived value with no test behind it, and it will drift. Point at the
executable authority; do not paraphrase it.**

**2 · BANK-1 — whole-file deletion RULED, then WITHDRAWN by the same owner.**
Ruled whole-file on two premises: *"~22 sound is a rounding error"* and *"surgical means per-question
owner review."* BANK-1 adjudicated **all 79** questions and disproved **both** — **48 sound**, and
every defect confined to **Section A**, separable by a **mechanical `section` filter**.
★ **Invoking the standing rule "IF THIS SPEC IS WRONG, YOUR VERIFIED FINDING WINS," the owner
withdrew his own ruling.** Final cut: Section-A-only, **39 sound questions kept.**
★ **He also rejected "the generator is known-bad, so distrust all its output"** as *reasoning from a
story rather than from the finding* — the defects cluster by **section**, and pack2 sampled clean.
**Two conditions imposed** because the cut now rests on a claim rather than on removing everything:
prove each kept question sound (withhold if unverifiable), and add a mutation-verified guard that no
Section A item survives.

**3 · The ~30 board-excluded pack2 questions — NOT removed. The withhold test working.**
Ruled they should fold into the PR on the premise the guard bans them at bank level. **The code said
otherwise**, and BANK-1 proved it three ways including a control. ★ **Applying the owner's own test —
*"if a question does NOT match a rule, KEEP it and report it — withhold, never guess, in both
directions"* — nothing was removable.** Removing them would have been **guessing in the opposite
direction.** ⇒ `[FU-SYLLABUS-TRUTH-IN-TWO-PLACES]`: the real defect is **two hand-maintained sources
of syllabus truth with no test that they agree**, not a forgotten entry.

**4 · Trial-period grading is INTENDED** — a marketing hook, and it still requires sign-in. Recorded
so nobody "fixes" it.

**5 · `ME-PROGRESS` and `NAME+LINK` do NOT merge in 5C — they head Wave 5D. Wave 5D runs FOUR lanes,
not six.** ★ **New sequencing rule established mid-wave: `GATE-3` must merge BEFORE `ME-PROGRESS`**,
because the July prototype's gate treatment predates the paywall. **The prototype is authoritative
where it INVENTS and subordinate where it must MATCH.**

**6 · Scope discovered after planning** — BANK-1's brief premise (*"none is imported"*) was **false**;
GATE-3's four named parents were **not** render sites (there are two, and none of the four is one);
`scope:guard` **cannot** live in a CI fast path. All three were **spec errors**, not lane errors.

## 2026-07-29 - Wave 3, four lanes under a controller + subagent model (#557–#563, trunk `25e995a7`)

Decisions ruled by the owner across the wave, and the scope it discovered after each lane was first planned.

### Owner decisions
- **★★ The localStorage fix is PR-2 of the security lane, not a follow-up.** The owner verified the finding personally: `loadSubscription` read **only** localStorage, and `loadCloud` returned `null` for **both** "no document" and "read failed" — **collapsing those two is what created the hole.** Principle: *localStorage may CACHE a verified tier, never GRANT one.*
- **★★ Route C — the forged trial — is folded into the same lane, not split off**, because the fix is **one coherent principle**: entitlement must derive from data the client cannot forge. `tier:"premium"` → Admin SDK only; `tier:"trial"` → the START is a server timestamp the rules pin, the DURATION is a constant in code, so the **END is derived, never stored**; localStorage → a cache, never a grant.
- **★ Do NOT change `isPremiumAccess`.** A trial granting premium **is** the product design (a 7-day full trial) and is correct. **The defect is that the trial's LENGTH was forgeable**, not that a trial grants access.
- **★★ The deploy is the owner's, and the lane does not close until the Console confirms it.** `firebase deploy --only firestore:rules` after merge. **A merged rules file never deployed is a silent no-op at the infrastructure layer — the one place no gate can see.** Ruled after a deploy from the shared checkout re-shipped six-commit-stale rules and printed `Deploy complete!`.
- **★ The lockfile is approved in the subagent's recommended shape** — `pnpm-lock.yaml` **plus a dedicated emulator step in `quality-gate.yml`** — and explicitly **NOT** chained into `scripts/` `test:matrix:all`, which would couple an emulator dependency into the content-guard suite. **The subagent was right to refuse to ship the rules test unwired.**
- **★ `scope:guard`: add the firestore lane, but the `cwd` finding is bigger and gets its own lane.** A boundary guard running with `cwd=lazytopper` cannot see a new top-level directory **at all**. GUARD-1 was required to carry a **mutation-verified** test proving a file OUTSIDE `lazytopper/` is classified.
- **★ `firestore.rules` is explicitly scoped to the security lanes, overriding CLAUDE.md §4's global ban.** Recorded so no reviewer flags it as a scope breach.
- **★ Both declared test-only deviations ACCEPTED** — D2's repointed pricing probe and SEC-2's derived trial fixture. In each case the alternative (dropping the probe; honouring the stored end) **leaves a green test that no longer checks the thing it names, which is this wave's entire failure class.**
- **★ The old SEC-1 worktree is ABANDONED, not rebased.** Stale base, and its fix was proven inert. **Its value is the proof that the fix was inert**, which is inherited into the record.
- **★ Standing doctrine, restated:** Daily Mix, Daily Mission, Study Plan and Dashboard are OLD DESIGN and not part of the product. **Treat any reference to them as evidence of DEADNESS, never of liveness.** This corrected an agent's premise that `callMentor` still had a live caller.
- **★ Duplicating a pin across two files creates two places to update and one to forget** — cite the existing pin by name instead. Ruled when C1 found the objective exception was already pinned, and pinned well, by a gate that `require`s the real route module.

### Controller decisions
- **The controller reads no product source, runs no builds, reads no CI logs, inspects no diffs.** *"The moment it does, it is a subagent with a plan attached and this model has collapsed back into what it replaced."*
- **Relay evidence between lanes; never relay it as settled.** A finding was relayed to GUARD-1 **with an explicit instruction not to trust it** — and GUARD-1 proved it half wrong. Had it been accepted as established, GUARD-1 would have "fixed" a call path that was never broken and shipped a green suite over the real hole.
- **Merges are sequenced, not batched** — branch protection requires up-to-date branches, so each merge costs the next a rebase and a CI re-run. ⚠ **Corrected mid-wave:** push serialisation was **not** required on the ground originally cited; `lane-overlap` keys on genuine file collision, not on a shared tree, and two PRs in `lazytopper/src/` passed it simultaneously. **Subagents stopping before commit makes build-parallelism free; only the MERGE order needs sequencing.**
- **Two open PRs on one manifest is the exact collision this role exists to prevent** — hence the security lane was barred from `lazytopper/package.json`.
- **Dispatch files send subagent reports to the subagent's scratchpad**, not the reports directory — the harness blocks the latter, which is why several findings this wave survive only as controller-captured return messages.

### Scope discovered (⇒ SURFACE_TRACKER §2a; no Scope cell moves — every affected surface was already Settling)
- **Entitlement was never one surface, and the routes were miscounted** — three, not two, and the goal spans `firestore.rules` **and** `lazytopper/src/`. **Merging the first PR and calling premium secured would have been false.**
- **The deploy layer is outside every gate the project owns.** → `[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE]`. A lane whose outcome depends on a deploy **closes on the DEPLOYED state**.
- **The grading-server allowlist was incomplete twice over** — two gates banned the grader, and the test needed manifest wiring or it would never run in CI.
- **The ops-gates surface has guards nobody runs** — one RED and unread through three redesigns, one auditing 1 of 13 top-level trees, one reading a file that no longer exists. → `[FU-GUARD-1-A]`/`[FU-GUARD-1-B]`/`[FU-GUARD-1-C]`/`[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]`.
- **Home has no returning-visit signal at all**, and `landingMemory.hasProfile` is permanently false — a uid-suffixed key read without its suffix, second instance of that class here. Both need their own scoped work. → `[FU-NO-RETURNING-SESSION-SIGNAL]`, `[FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY]`.

### ⚠ Recorded against the controller, because the same standard applies to it
- **A CI run id was handed to the evidence lane from an earlier head.** A run id is bound to a **commit**, not a PR. Caught by the subagent; had it been trusted, the merged head would have been unverified.
- **In the first pass, both PRs merged before the evidence lane returned.** The evidence was retrospectively clean, so nothing needed reverting — but **the evidence lane must close before the merge, or it is an audit, not a gate.** Open process question.
- **A verification command was issued that could never match** — two piped `Select-String`s requiring one line to satisfy an invocation pattern and a result pattern. It returned empty and read as evidence that a suite had not run. It had. ⇒ **a verification command needs its own control.**

---

## 2026-07-21 - Tutor/onboarding retirement, PR-1 of 2 (#512, trunk `e19b2d1`)

Decisions ruled by the owner, and the scope this arc discovered after the retirement was first planned as ONE PR.

### Owner decisions
- **Retiring "Teach me" is a PRODUCT REMOVAL, not a cleanup.** The drawer was **live** — an unconditional button on every Topic Hub concept row, sitting beside the new "Stuck? Ask". Owner confirmed the new `/tutor` fully supersedes it and it should go.
- **★★ SPLIT the retirement into two PRs: behaviour first, deletions second** (the #505 MockBuilder pattern). Ruled after re-verification showed the deletion fallout was **16 ops scripts hard-reading a deleted path (~27 referencing), not the 2 the audit claimed**. Rationale: *"bundling a live behavior change with a ~27-script content cleanup is a mixed-concern PR that delays the user-facing fix."* PR-1 is live-verifiable on its own; PR-2 gets its own careful review.
- **★★ REJECTED: hardening `readText` to swallow ENOENT.** It was the cheapest way to absorb the broken scripts, and it was refused on the right grounds — every assertion about the deleted surface would then pass **vacuously**. *"Vacuous green is the false-green class this project's been bitten by twice."* PR-2 must instead **retire the wholly-dead scripts and surgically fix the mixed ones** — an explicit content decision, owner-reviewed before it lands.
- **`App.tsx`: Option B — leave the route inert, keep CI green.** Consistent with #505. Removing the route would need an `App.tsx` diff, which two CI-gated overlay guards freeze zero-diff.
- **Referral relocation is its own concern, done FIRST**, and the identifier switches to the real Firebase `uid`.
- **`ConceptSpine.test.tsx` is assigned to this lane**, out of the Wave-2 agent's "test files" ownership.
- **Mastery is ON HOLD — do not touch `topicHubMastery` or the mastery reads in either PR.** The old tutor's mastery *write* becoming unreachable is accepted; the store stays.

### Scope discovered (⇒ SURFACE_TRACKER §2a; Topic Hub and Tutor Scope both stay Settling)
- **The prior audit was wrong three times, and re-verification at trunk is what caught it.** (a) ops coupling 2 → **16**; (b) `ConceptSpine.test.tsx` asserts "Teach me" in **three** places, not two — the missed one (`:107-110`) would have landed the PR **red**; (c) deleting `pages/TopicHub.tsx` is **forced**, not optional, because it imports `ConceptTeachDrawer`. **An audit is a starting hypothesis, not a spec — re-derive its load-bearing counts before planning around them.**
- **`[FU-OPS-SCRIPTS-PATH-COUPLING]` is much larger than recorded.** ~27 ops scripts hard-read product files by path; none are CI-gated, so the coupling rots invisibly until a deletion exposes it.
- **A second lane has now left residue behind the over-broad `App.tsx` freeze** (`[FU-APP-TSX-FROZEN-RESIDUE]`, joining `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`). Two independent lanes blocked by the same guard is the argument for narrowing it from "App.tsx zero-diff" to "the relevant route elements unchanged".

---

## 2026-07-18 - Check & Improve convergence arc (#466 → #470, trunk `2c59dd2`)

Decisions ruled by the owner across the arc, and the scope it discovered after C&I was first planned.

### Owner decisions
- **The convergence is a PREREQUISITE, not a cleanup.** The tutor is to host Quick Practice + Check & Improve as **in-tutor overlays**. C&I could not live in an 820px overlay panel because `useIsDesktop()` measures the **window, not the container** — an 820px panel on a 1440px window would have mounted the 2,734-line desktop twin inside it. So the twin split had to collapse into one container-relative component *before* the overlay work. Sequenced deliberately ahead of it.
- **Northstar = the desktop file; the mobile twin is discarded, then deleted.** #466 converged onto `DesktopCheckImprovePage.tsx` and left the twin unrouted for a one-line rollback; #468 deleted it once live-verified. A pure deletion stays separately revertible.
- **The mobile title: 2 lines at 22px, NOT one line at 16px.** The agent measured (headless Chromium) that one line needs ~16px — which equals MobileShell's own 16px chrome title, turning the page H1 into a label. Owner ruled the two-line 22px treatment (`clamp(22px, 6vw, 30px)`); the 30px desktop max is unchanged.
- **The lede is deleted at both widths** (not shrunk, not mobile-only) — every clause already ships in How-it-works steps 3/4 + the relocated "We never invent a score".
- **The anchored MI moat check is a HARD gate, not advisory** — a moat guard that can be skipped is not one. #469 anchors it to the fixed SHA `e8f75af` so the 52 surviving MI lines must stay byte-identical forever; a legitimate future change must consciously re-anchor.

### Scope discovered (⇒ SURFACE_TRACKER §2a; C&I Scope stays Settling)
- **13 `matchMedia("(max-width:960px)")` layout sites** in the "desktop" twin (an `isNarrow` flag through both grids). The convergence was structurally larger than "delete a twin" — and the file satisfied the old rule ("never `useIsDesktop`") while committing its exact sin via a hand-rolled `matchMedia`. The rule was rewritten from a named hook to a behaviour ("no window-derived value drives layout") so a rename can't evade it.
- **The CI acceptance gate had never run its hardest checks.** `quality-gate.yml` used `actions/checkout@v5` at default depth 1, so the base ref was absent in CI and the MI + FORBIDDEN checks silently skipped on every run — including #466's "fully green". Fixed: `fetch-depth: 0`, a fixed-SHA MI anchor, PR-scoped FORBIDDEN, and **a needed-but-missing ref now HARD-FAILS in CI instead of skipping**. This is the second gate in this repo to silently never run (the predecessor lived in the wrong directory).

### Corrections the arc forced (a spec is a CLAIM, not evidence — every fix came from running a command)
- **The `flex-basis`.** `flex: 1` = `flex-basis: 0%`; a zero-basis title block never demands width, so the `flexWrap` already written in the header could never fire. Found by reading the computed style, not the source.
- **The title floor.** The spec's `~18-19px` estimate assumed 328px content; the real content at 360px is **288px** (MobileShell adds 20px each side the estimate missed), so one line needs ~16px. Measured with Playwright.
- **The D4 "last photo" claim.** The spec asserted the lede was the last student-visible "photo"; `"Photo from your phone"` (the QR-delivery label the dropzone renders) was a second one — classified by eye off grep output, immediately after instructing the agent to read instead of grep. Found by reading the lines.

---

## 2026-07-16 - Grader `objective` flag + attempt-dedup `mode` drop (#445, trunk `ad2a9b2`)

Decisions (owner, at #445's pre-flight STOP) + the corrections the pre-flight forced.

### Owner decisions
- **★ INLINE over EXTRACTION for the five step-mark chips — a SEQUENCING call, not a quality judgement.** The chip is re-implemented inline at five sites with no shared component. The owner ruled: **do the minimal inline patch now; file the extraction as an explicit follow-up.** Reasoning (the agent's, adopted): the `objective` flag is **load-bearing**, and **two lanes (QR PR-2, the §7 paywall gate) were waiting on `SolutionChecker.tsx` specifically** — widening the diff into a cross-surface extraction (C&I ×2, worksheet, print doc) would hold both lanes longer for a change that **alters no behaviour**. **[FU-STEPMARKCHIP-EXTRACTION] filed with the "one fix isn't one fix" framing so it does not get lost.** *Generalising rule: when a narrow fix unblocks other lanes, ship the fix and file the cleanup — never bundle a refactor into a critical-path diff.*
- **§2 + §4b ship as ONE PR; §7 (paywall) as its own.** Ratified the agent's sequencing: §2/§4b share one root (nothing client-side can tell an objective question), so they belong together; §7 is a **real monetisation behaviour change**, deserves its own reviewable diff and revert handle, must land **after** the urgent cloud-auth lane, and — decisively — **both touch `SolutionChecker.tsx`**, so folding §7 in would mean the agent fighting itself in one diff **and** holding the QR seam hostage to a monetisation review.
- **The §7.7 test is authored NOW but lands with §7.** Written while the distinction was fresh, parked at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs`, explicitly **not** merged into #445.

### ★ Corrections the pre-flight forced (a handoff is a CLAIM, not evidence)
Three of the prior handoff's claims were **right in conclusion, wrong in reasoning** — the owner independently verified all three against source before ruling:
- **The stale baseline.** The handoff said "#442 is OPEN"; it had **merged** (`c07ce79`), and the shared checkout `C:\Projects\Lazytopper-Production` sat **4 commits behind** `origin/base`. **Re-derive the tip, always** — the doc's own "never trust a written SHA" applied to itself.
- **The double-count repro ORDER.** "type → grade → click" is **unreachable**: `PracticeQuestionCard:407`'s own comment (*"Discoverability nudge after a wrong MCQ"*) confirms **click-first** is the true gate. The real trigger is click-wrong → reveal → grade.
- **The "unreachable banner" REASON.** `checkSolution.cjs:401/754` confirm the clamp is gated **only** on `questionIsObjective`, with **no marks condition** — so the "1-mark ⇒ unreachable" justification was false even though *safe to delete* was right.

**Owner's framing, recorded because it is the durable lesson:** *"Right answer, wrong reason — and a future reviewer trusting the wrong reason would draw a wrong lesson from it."* Hence the banner's deletion comment states the **corrected** reason (dead by data invariant + surface gates, **not** by the clamp).

### Discoveries
- **★ Blast radius beyond the named sites.** The owner's own grep found 12 files touching `marksAwarded`; exactly **five** render the misleading chip — but the flag had to thread through the **TYPES** those chips render (`WorksheetQuestionGrade`, `CiGradedQuestion`, four print-props builders), *not* the grader response directly. Saved by the client's **generic passthrough parse** (no grade-service edit). **Rule: trace to the TYPE the renderer consumes.**
- **The test home.** Provable properties belong in the **CI-gated matrix** (node — runs on Windows AND in CI), never Codespaces-only vitest ([FU-CI-GATE-VITEST]). To import the REAL dedup function rather than text-scan it, `attemptDedupKey` was extracted to a **dependency-free** module (`practiceInsights.ts` pulls firebase at module load and cannot be transpiled standalone). **Both negative controls were mandatory** — a test that cannot fail is theatre.

---

## 2026-07-10 - Worksheet context-aware entry + multi-topic MI (#357, trunk `aa7e778`)

Decisions (owner, via AskUserQuestion during #357 STEP 0) + discoveries (owner #357 live-verify):

### Owner decisions
- **MI per-topic CAP engages at 3+ topics only.** FIX-3's ~50% cap would have lowered the shipped/owner-verified 2-topic enrichment from 60% (`MI_BOOST=1.5`, the locked "15:10 of 25" prototype) to 50%. Owner chose: cap = **50% at N≥3**, and **N=2 keeps ~60/40**. Implemented as `miCapFractionFor(n) = n≥3 ? 0.5 : 0.6` in `worksheetModel.ts`; `allocateMiCounts` layers a floor + this cap + an availability gate on the tested `allocateCounts` primitive (untouched).
- **Home "Worksheets" card → `/practice-hub`** (D1) — destination-only. The card is a topic-less entry, so it lands on the hub where the student picks; the hub's worksheet action then opens the builder autofiltered (it already passes the params). No `intent` param. Consequence flagged: the card now shares `/practice-hub` with the Practice card (landing worksheet-focused would be a hub-side follow-up).

### Reasoned deviation from the task spec (FIX-1.2)
- The task said delete BOTH the `topics[0]` entry fallback AND the L176 catalogue-validity reset effect. **Only the ENTRY fallback was deleted.** The reset effect was KEPT because recon proved it is a no-op at entry (the URL-seeded topic is always in the initial catalogue → its guard is false on mount) and it is required for in-app subject/stream switching (deleting it strands a stale topic → permanent blocker). Recorded so a future reader doesn't "finish" the deletion and break in-app subject switching.

### Discovered scope (owner #357 live-verify) — do NOT fix piecemeal
- **[FU-TOPICKEY-UNIVERSAL] (P0).** Surfaces match RAW topic slugs, but the bank stores **51 distinct `topicKey` for ~26 chapters** (25 Title-Case + 26 slug). Four Science chapters (`chemical-reactions-equations`, `acids-bases-salts`, `metals-non-metals`, `reproduction` ≈ **1,180 questions**) return ZERO; `WorksheetGenerator.tsx`'s `q.topicKey === t.key` raw compare also disables enrichment on Title-Case chapters. **Chapter Test and Full Mock carry the SAME defect latently.** A prior audit established the cure: **Phase 1 resolve-everywhere (read AND write) + CI guards; Phase 2 data consolidation** ([FU-BANK-TOPICKEY-NORMALISE], [FU-MI-TOPICKEY-BACKFILL]). Prior piecemeal fixes failed because no guard existed → new variants reappeared. Its own scoped PR.
- **[FU-WS-SCOPE-DERIVE].** Ticking topics in Customise calls `setMultiTopics` but never `setScope`, so scope stays `"topic"`, the URL-sync builds from `validMulti[0]` and discards the other ticks, and `enrichActive` short-circuits. The URL entry path already promotes scope. Fix in the immediate follow-up PR (a tick ⇒ derive scope) alongside [FU-WS-MI-COPY] state 2c.

### Product principle (logged — three instances found in #357 live-verify)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** Instances: the `topics[0]` guess (fixed); the Customise tick that never derives scope ([FU-WS-SCOPE-DERIVE]); the raw-slug topic match returning zero for Title-Case chapters ([FU-TOPICKEY-UNIVERSAL]).

---

## 2026-06-28 - D-PROG-2 / Build Step 1 CLOSED (grader no-working honesty — subjective deterministic; MCQ residual tracked)

Decision (owner + cofounder, recorded post-PR #301 + #302 + #303):
Build step 1 of the locked critical path (D-PROG-7) is closed for its designed scope. The no-working honesty
fix is deterministic on subjective answers across both grading surfaces. Three residuals are tracked as
separate queued PRs — none are regressions.

### What shipped

**PR #301 (trunk `19b4ef8`) — Check & Improve path (`handleCheckSolution`):**
- Prompt rule 7: no working shown → `mistakeType` null, never auto-"conceptual"; status stays incorrect.
- Deterministic guard: `status === 'incorrect' && !studentWork?.trim()` → null the type, tally `noWorkingNulled`.
- `rawAdjusted` reconcile: `max(0, rawSummary[cat] - noWorkingNulled[cat], stepFloor[cat])` — closes the
  `rawSummary` leak so a model that ignores rule 7 can't fabricate a bucket via its self-reported summary.
- 7/7 vitest (Codespace, Node 22), CI green, owner live-verified C&I.

**PR #302 (trunk `c5e148d`) — Worksheet path (`gradeStructuredSet` / `normaliseStructuredResult`):**
- Mirrors #301 exactly: prompt rule 5 (same wording + MCQ "(d)" example), same guard, same reconcile.
- `handleCheckSolution` left byte-identical (confirmed by byte-review of pushed diff).
- 7/7 vitest driving `handleGradeWorksheet` (not `handleCheckSolution`), CI green.
- Owner dual live-verified: no-working subjective → 0 in four-type breakdown every time; worked wrong →
  typed correctly; scorecard math unchanged; Check & Improve unchanged.

**Key architectural finding (recorded for all future grader work):**
`checkSolution.cjs` contains TWO separate grading functions — `handleCheckSolution` (C&I, single question)
and `gradeStructuredSet` → `normaliseStructuredResult` (Worksheet + future Chapter Test / Full Mock,
multi-question). They carry an in-file "keep in sync" comment (~line 547). A change to one is NOT a change
to both. Any future grader change must patch + test BOTH in one PR.

**`mistakeSummary` leak rule (recorded for all future grader work):**
`mistakeSummary = max(LLM rawSummary, stepFloor)`. Suppressing a per-step `mistakeType` fixes `stepFloor`
but NOT `rawSummary`. Every per-step suppression must also subtract the suppressed count from `rawSummary`
before the max (`noWorkingNulled` pattern), in BOTH functions, or the fabricated bucket leaks to the student.

### Three tracked residuals (not regressions — queued PRs)

**[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] — Deterministic MCQ honesty (MUST land before PR-B)**
A wrong MCQ writes the chosen option ("(d)") into `studentWork` (non-empty), so the empty-working guard
can't fire. Honesty rides on the prompt rule only (~40% effective on live runs). The fix is deterministic:
forward `section`/`format` from the client payload through the server mapper, then apply the existing
`isObjectiveType(qType, section)` helper in `serverUtils.cjs` — a wrong objective step → `mistakeType`
null regardless of `studentWork`. The Quick Practice surface fixed this as G1 (June 21 session, "MI-Loop
Stage 2 PR 3 — MCQ honest capture"); this PR applies the same principle to the worksheet grader.
Scope: `worksheetGradeService.ts` (client payload) + `checkSolution.cjs` (server mapper + guard extension).
Do NOT use `marks === 1` as a proxy (fragile — 1-mark subjective answers exist). Use `isObjectiveType`.
Must land before PR-B so the durable history is built on honest MCQ data from day one.

**[FU-WORKSHEET-NON-ATTEMPT-TEXT] — "Don't know" / explicit non-attempt text**
A student writing "Don't know" / "Dont know" / "I don't know" produces non-empty `studentWork`, so the
guard can't fire; the model tags it "Concept gap." Semantically identical to no working — the cause is
undiagnosable. Needs a small additional rule: detect explicit non-attempt phrases → `mistakeType` null.
Separate PR, smaller scope than the MCQ guard. Sequence: after the MCQ guard, before PR-B preferred.

**[FU-BANK-ANSWER-POLLUTION] — Bank answer / model-answer junk (~26 files / ~54 strings)**
~26 question bank files in `src/data/questionBanks` carry raw marking-scheme junk in `answer`,
`solutionSteps`, and `finalAnswer`: raw mark-allocation fractions (`1 ½ ½ 1 1 2 3`), stray scheme labels
(`Red Violet`), and source/page anchors (`X_086_31/4/3_Science#Page-`). Student-facing and may skew
grading (the grader reads these polluted model answers). Needs a content-cleaning PR with a mechanical
junk-detector + owner verification. Content lane (`src/data/`), disjoint from the grader PRs.

### Sequencing locked
MCQ objective guard → (non-attempt text, bank cleaning as parallel content lane) → PR-B (step 2).
PR-B must NOT start until the MCQ guard lands — "honest MI before anything persists it" is the invariant.

---

## 2026-06-20 - MockBuilder RETIRED (un-routed + tagged for PR-G deletion; code kept)

Decision (owner, recorded post-PR-D #274):
**MockBuilder is cut from the live product.** Un-route it from the live app and **tag it for deletion** so it joins
the **PR-G legacy set** (alongside dead `TutorDrawerV2`, `MentorPanel`, and old `pages/TopicHub.tsx`). **Keep the code**
for now; PR-G removes it with the rest of the dead set.

Reason:
- **Mistake Intelligence now auto-captures the "hard questions to revisit" need** that MockBuilder was meant to serve
  **manually**. With MI surfacing the questions a student got wrong (and the mistake patterns) automatically, a manual
  mock-building surface is redundant.

Locked choices:
- **Un-route now, delete in PR-G** — no immediate code deletion; the un-route removes it from the live product, and the
  PR-G legacy sweep (which already deletes the dead old-mobile + tutor surfaces) takes the code with it.
- **MI is the replacement path** — the revisit/hard-questions need is served by Mistake Intelligence, not a rebuilt
  MockBuilder. Do NOT reinstate a manual builder unless MI proves insufficient.

## 2026-06-20 - [FU-BOOKMARK-SAVE-QUESTION] logged (future, not a launch blocker)

Decision (owner, recorded post-PR-D #274):
A future **lightweight "bookmark / save this question"** feature — let a student **proactively save a tricky question
even when they answered it correctly** — and **surface saved questions on the Me / Progress page**. **Not a launch
blocker; logged for later.**

Rationale / boundary:
- **Distinct from Mistake Intelligence** — MI captures questions the student got WRONG (auto). This is a **voluntary
  save-for-revisit** for questions worth a second look regardless of correctness. The two are complementary, not a
  substitute for each other.
- **Surface = Me / Progress** — saved questions list lives on Me/Progress (where the student reviews their own state),
  not buried in the practice flow.
- **Scope when picked up:** a save toggle on a question + a saved-questions list on Me; honest empty state; no fake
  pre-seeded saves. Owner-logged; no PR scheduled yet.

## 2026-06-08 - AUTH MIGRATION PR-3 (#210): Clerk teardown — auth is Firebase-only

Decision:
PR-3 removed all remaining Clerk; auth is now Firebase end-to-end. Deleted the gateway custom-token bridge
(`firebaseAuth.cjs` + `/api/auth/firebase-token`) and the Clerk FAPI proxy (`clerkProxyMiddleware.ts`); made
`requireFirebaseAuth` **Firebase-only** (removed the Clerk `getAuth` fallback); removed `clerkMiddleware()`;
dropped `@clerk/express`, `jsonwebtoken`, `jwks-rsa`, and the orphaned `http-proxy-middleware`. Lockfile −162
(whole `@clerk/*` tree gone).

Locked choices:
- **Firebase-only, fail-closed** — with no fallback, `requireFirebaseAuth` returns 503 when Firebase Admin is
  unconfigured (was a silent Clerk-fallback before). So `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  on api-server and `ADMIN_FIREBASE_UIDS` are now **load-bearing** for prod (no Clerk safety net).
- **`jsonwebtoken`/`jwks-rsa` stay as transitive deps** of `firebase-admin` (it uses them internally) — only the
  direct deps were dropped. `http-proxy-middleware` removed (it existed solely for the Clerk proxy).
- **Zero Clerk in CODE/CONFIG** (grep over src/server/package.json = 0), including a scrub of stale "Clerk"
  comments + the `authProvider` default string. The remaining `clerk` matches are **non-code**: gitignored
  `.env.local`, auto-gen `.project_memory` snapshots, `handoff/*` history, and governance/docs
  (`CLAUDE.md`, `FIREBASE_SETUP.md`, `docs/desktop-graduation-state.md`).
- **Governance/docs scrub deferred to its own owner-reviewed PR** — `CLAUDE.md` and instruction/doc files were NOT
  edited inside this code PR (avoids mixing governance into a code change; `CLAUDE.md §5` "Clerk stays for now —
  K2H-15" is now obsolete and is the next task).

## 2026-06-08 - PROCESS (refined): docs-only auto-merge excludes governance files

The docs-only auto-merge permission (handoff/* + pure-doc `.md`) **excludes `CLAUDE.md` and any
governance/instruction file** — being `.md` is not sufficient; if it steers how the agent or repo behaves it
always needs the owner's explicit merge. (Supersedes the 2026-06-08 grant's wording.)

## 2026-06-08 - AUTH MIGRATION PR-2 (#208): frontend Firebase Auth — Google popup + one-step email/password

Decision:
PR-2 rebuilt the frontend on direct Firebase Auth and removed Clerk from the client (`@clerk/react` dropped,
`ClerkProvider` out of `main.tsx`). Two owner-confirmed UX/mechanism choices:
- **Google = `signInWithPopup(GoogleAuthProvider)`** for PR-2 (no new env var / external script). True GIS
  **One-Tap** (the floating auto-prompt) is deferred to a small follow-up because it needs a Web OAuth client ID
  (`VITE_GOOGLE_CLIENT_ID`, not yet provided) + the `gsi/client` script. The "Continue with Google" button +
  popup already deliver the browser-profile experience; the One-Tap sub-line copy is kept.
- **Email = one-step** (email + password fields shown together → `signInWithEmailAndPassword`), password-based,
  **no magic link**. The v2 prototype showed an email-only first view; one-step matches "indistinguishable from
  today's Clerk card" and avoids a two-step flow. (Agent asked both before building — never guess on auth UX.)

Other locked choices:
- **Façade is additive** — added `signInWithEmailPassword` / `signUpWithEmailPassword`; no existing
  `AuthContextType` member changed → the ~38 `useAuth()` consumers are untouched.
- **Phone tab present but disabled** in PR-2 with an honest "arrives shortly" note (handler lands in PR-4) —
  honest-empty-state, no fake/broken action.
- **Admin allowlist rename executed in PR-2** (`ADMIN_CLERK_UIDS` → `ADMIN_FIREBASE_UIDS`) — the functional
  forward-correction from the PR-1 decision: once the client sends Firebase tokens, `req.userId` is a Firebase
  uid, so the allowlist must hold Firebase uids. Value migration = owner bootstrap (sign in once → capture uid →
  set env).
- **Local-dev/E2E anonymous-session path preserved verbatim**; `firebaseReady` now reflects `firebaseConfigured`.

Verification (owner-directed): email/password + `getIdToken()` are domain-independent, so verified headlessly in
the Codespace against the real `lazzyy-topper` project (public web config) — decoded token `iss =
securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper` (a Firebase token, not Clerk). Throwaway account
deleted; nothing committed. The Google **popup** is owner-verified on an authorized domain (headless can't drive it).

## 2026-06-08 - PROCESS: docs-only PRs may be agent-auto-merged (handoff/* + .md ONLY)

Owner granted standing permission to **self-merge docs-only PRs** (the `docs/handoff-post-pr<N>` updates). Gate
before any auto-merge: run `git diff --name-only` and confirm **zero** code / config / schema / question-bank /
auth / CI files — every path under `handoff/` or a `.md`. If even one non-doc file appears, STOP and wait for the
owner's merge. All other PRs (product/auth/infra) still require the literal "approved" + owner merge.

## 2026-06-07 - AUTH MIGRATION PR-1 (#206): Clerk-fallback = OPTION B (keep @clerk/express through PR-1/PR-2)

Decision:
For the PR-1 dual-accept transition (the api-server edge must accept BOTH a Firebase ID token and, temporarily,
the existing Clerk token until PR-2 switches the client), the Clerk-fallback verification uses **Option B**:
keep `@clerk/express` mounted and reuse its already-verified `getAuth(req)` for the fallback. `requireFirebaseAuth`
tries Firebase `verifyIdToken` first → `req.userId = uid`; on failure it falls back to Clerk `getAuth(req)`.
`@clerk/express` + the Clerk fallback are removed **together in PR-3** (Firebase-only).

Why B (not A):
The Clerk fallback is **throwaway code** alive only for the PR-1→PR-2 window. Option A (hand-roll Clerk JWT
verification with `jwks-rsa` + `jsonwebtoken`, à la `firebaseAuth.cjs`) would add new security-critical code on
the most sensitive surface — code that can't be compile-checked on the Windows box — plus new workspace deps and
more lockfile churn, all for a path deleted two PRs later. **We never write fresh auth-verification code that
lives for two PRs when an already-verified path exists.** B is lower-risk on every axis: no new code on the auth
surface, no new deps (only `firebase-admin` is added in PR-1), cleanest lockfile.

The contradiction this corrects:
The build doc (`AGENT_auth_migration_build_4PRs.md`) listed BOTH "drop `@clerk/express` in PR-1" AND "fall back to
Clerk verification in PR-1" — mutually exclusive (you can't call Clerk's `getAuth` if you've removed the package).
The agent flagged it; owner confirmed B. The **"drop `@clerk/express`" line is corrected → moved to PR-3.**

Decisions locked (2026-06-07):
- OPTION B — `@clerk/express` stays mounted through PR-1/PR-2; `clerkMiddleware()` + `clerkProxyMiddleware` stay
  in `app.ts` (untouched in PR-1). NO `jsonwebtoken`/`jwks-rsa`. Removed together with the fallback in PR-3.
- ADMIN ALLOWLIST RENAME MOVES TO **PR-2** (not PR-3) — `admin.ts` checks `req.userId` against `ADMIN_CLERK_UIDS`
  (Clerk ids). Once PR-2 makes the client send Firebase tokens, `req.userId` is a Firebase uid → admin routes 403
  until migrated. So `ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS` (rename + revalue) lands in PR-2, with a bootstrap:
  owner signs in once via Firebase → capture uid → set `ADMIN_FIREBASE_UIDS`. PR-1 kept the old name (forward
  correction; the in-code comment still says "PR-3" — PR-2 updates it).
- DEPLOY ENV (Railway) — `artifacts/api-server` now needs `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) to verify Firebase ID tokens; fold into the INFRA-4 backend-deploy checklist.
- LOCKFILE + LINUX GATES IN CODESPACES — PR-1 added `firebase-admin` to `api-server`; lockfile regenerated on
  pnpm 10.32.1 in a Codespace (Windows can't), committed in the PR. api-server `typecheck`/`build` + both matrices
  were run in the Codespace (CI does NOT typecheck api-server) — all green. See CURRENT_STATE (#206).
- BACKLOG (separate small gated PR, NOT this docs PR): add an `apiServer` lane to `repo_boundary_policy.json` so
  future `artifacts/api-server` PRs get a real `scope:guard` PASS instead of `[unclassified]`. Tracked in
  OPEN_QUESTIONS [D47].

## 2026-06-07 - DE-REPLIT COMPLETE (#199 + #204): repo fully @replit-free; infra arc closed

Decision:
The two-PR de-Replit is merged. PR-A (#199, `fec2f92`) removed the lockfile-safe scaffold + the dead
`lazytopper-app/src` stub; PR-B (#204, `5441060`) removed the `@replit/*` packages, `@replit/connectors-sdk`,
and the 3 non-product stub packages (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) atomically
with the lockfile regen. Repo is now fully `@replit`-free (manifests + source + lockfile); workspace 12 → 9.

Decisions locked (2026-06-07):
- TWO-PR SPLIT BY LOCKFILE COUPLING — the lockfile-SAFE deletes (scaffold, stub src, root build-script filters)
  went first (PR-A) so they could land + be validated on the Windows box; everything that changes a lockfile
  input (package removal, importer/dir deletes, catalog) was held for PR-B as ONE atomic change. Splitting the
  `@replit` package removal from the `lazytopper-app/vite.config.ts` edit would break the build → same PR.
- LOCKFILE REGEN IN CODESPACES (linux), NOT WINDOWS — the Windows box cannot regen: the `minimumReleaseAge`
  guard needs registry `time` metadata that the local install couldn't fetch (`@clerk/backend
  ERR_PNPM_MISSING_TIME`). Regen on linux/pnpm 10.32.1 (the #201 path), matching what CI pins. Do NOT regen on
  Windows. Do NOT disable `minimumReleaseAge`.
- PR-B PUSHED INCOMPLETE-BY-DESIGN, PR HELD — the A–E source edits were pushed with an intentionally-stale
  lockfile (commit flagged `[LOCKFILE REGEN PENDING]`); the PR was opened only AFTER the Codespace lockfile
  commit landed, so the new CI's first run was on the COMPLETE atomic set (a stale-lockfile PR = false-red).
- KEEP `api-server` + `lazytopper-app` + `lazytopper` — `api-server` is the real backend; `lazytopper-app` is
  the vite build OUTPUT TARGET (kept as a shell after its stub src went in PR-A); `lazytopper` is the product.
  Only the 3 confirmed non-product stubs were removed. The product is ONE responsive website (no native app).
- RUNTIME AI-PROXY REWIRING IS SEPARATE (INFRA-4b) — `claudeClient.cjs`'s Replit-proxy → direct Anthropic API
  is NOT part of de-Replit scaffold cleanup; it lands with the backend deploy + the owner's API key.

## 2026-06-07 - CI ACTIVATED (#198): quality gate live; pnpm pinned 10.32.1; ripgrep in CI; D39 resolved

Decision:
PR #198 is merged (squash, trunk `9d772cba602afcbae025b63f93b439dc9d38ebd0`). GitHub Actions CI is LIVE for
the first time, gating every PR into `base/approved-thru-437` (+ push to it). D39 RESOLVED. The stale-lockfile
blocker that parked #198 last session was cleared on trunk by #201.

Decisions locked (2026-06-07):
- WORKFLOW AT REPO ROOT, FULL BAR — `.github/workflows/quality-gate.yml` gates pnpm `--frozen-lockfile` →
  root `scripts` `test:matrix:all` (175/175) → lazytopper `check:mojibake` → linux `vite build` →
  lazytopper `test:matrix:all`. The old mislocated `lazytopper/.github/workflows/mojibake-guardrail.yml`
  (a subdir → never registered → zero runs ever) was deleted. Triggers scoped to trunk (not bare `on: push`).
- PIN pnpm 10.32.1 IN CI (not 11) — it's the version #201 regenerated + frozen-verified the lockfile with,
  AND pnpm 11 leaves `npm_config_user_agent` empty for the workspace-root lifecycle script on linux, tripping
  the root `preinstall` guard (`case ...pnpm/*` → "Use pnpm instead"). Do NOT bump CI to pnpm 11 without first
  fixing that guard. (Root cause is the absence of a `packageManager` pin — see OPEN_QUESTIONS follow-up.)
- INSTALL ripgrep IN CI, don't degrade the audits — the ops acceptance scripts deliberately use `rg` (no
  fallback); ubuntu-latest lacks it. Fix the environment (install the tool), not the check.
- ops tests made CROSS-PLATFORM (3rd commit, owner-authorized scope-add into #198, NOT a separate PR) —
  `bsre_spike:50` + `trig_legacy_retire:29` path separators → `[\\/]` regex. These dormant-on-Windows bugs
  only matter because #198 turns on linux CI and can't be CI-verified without it → same concern, kept as a
  distinct legible commit. BSRE is LIVE product code (TopicHub tutor `/api/mentor`) — the check stays.
- scope:guard STAYS A LOCAL GATE (not in CI) — it inspects the local working-tree diff (staged/unstaged/
  untracked), so on a clean CI checkout it classifies nothing → trivial false-PASS. Wiring it to a PR diff
  would mean rewriting scopeGuard.mjs (out of #198's lane).
- NO PRODUCT-PR AUTO-MERGE (deferred) — the human merge gate is retained until CI has proven runs-and-gates
  over a series of real PRs; auto-merge, if ever, starts narrow (docs-only). Proven-it-gates this PR via a
  planted-regression probe (PR #202 → red on mojibake → torn down).
- SQUASH MERGE — matches the trunk `title (#N)` convention; the 3 commits remain legible inside the PR.

---

## 2026-06-04 - CONTENT SWEEP merged (#188): 93 banned out-of-syllabus entries DELETED; gating syllabusGuard GREEN

Decision:
PR #188 is merged. The syllabus-correctness arc is CLOSED: verified → guard corrected (#186) → content
swept (#188). The gating `syllabusGuard` now exits 0 and `test:matrix:all` = 175/175 (incl. #19).
Trunk after #188: `e0395fcbfeaf9d366afd4b93fb1514604363771f`.

Decisions locked (2026-06-04):
- DELETE, NOT RETAG (owner, final) — every leaked entry for an out-of-2026-27 topic (deleted or
  formative-only) was DELETED. Predicting/teaching them as board-relevant is wrong; LazyTopper is
  strictly board-prep. No "not-assessed" tag was added.
- REWRITE-TO-STAY-ACCURATE for blurbs/teach-contracts — where deletion would leave a broken fragment
  (topic blurbs, topic-hub sections, tutor teach-steps), the content was rewritten to describe the
  CURRENT in-syllabus topic correctly rather than deleting the word and leaving an incoherent surface.
- AUTHORED TEACH-STEPS WERE STRUCTURALLY REQUIRED — `TopicTeachContract.keyIdeas` is a fixed 4-tuple
  `[string, string, string, string]`. Removing banned teach-steps left 3-item arrays that fail the
  type; the production build (`tsc -b`) caught this (TS2322) even though `tsc --noEmit` did NOT. So the
  in-syllabus replacement steps (marked `[content-sweep 2026-06-04]` in real-numbers, heredity, and
  magnetic-effects) were NOT gold-plating — the type system demanded them. Keep them.
- GUARD IS THE SPEC — `syllabusGuard.ts` was NOT touched; content conforms to the guard, not vice
  versa. `predictionTypes.ts` schema frozen. The guard going GREEN is the proof the sweep is complete.
- SCOPE-GUARD `--mode product` FAIL is a LOCAL path-prefix artifact (combined repo: diff emits
  `lazytopper/src/...`, policy rule is `src/`), NOT a real lane violation. Surfaced; not hacked around.
- POLYNOMIALS DIVISION-ALGORITHM LEAK DEFERRED (D31) — out of the 93-item worklist scope and not
  guard-flagged (the surface scan omits bare "Division Algorithm"); tracked as a follow-up rather than
  expanding this PR.

---

## 2026-06-04 - syllabusGuard + registry CORRECTED to official CBSE 2026-27 and EXTENDED to all board-prep surfaces (#186)

Decision:
PR #186 is merged. The syllabus RULER (guard + registry) is now verified-correct against the LIVE
official CBSE 2026-27 Class X syllabus (Maths 041/241, Science 086, cbseacademic.nic.in) and the
owner-signed-off `report-syllabus-verification-2026-06-04.md`. Trunk after #186:
`918b754fe6fe08eb9ba7ab7a2cfc3b70993544a7`.

Decisions locked (2026-06-04):
- SYLLABUS VERIFIED AGAINST THE LIVE OFFICIAL SOURCE — the owner-signed-off verification report is the
  authority, NOT memory and NOT the old ban list.
- STEP DEVIATION UN-BANNED — it is IN the official Statistics scope ("…direct, assumed mean and step
  deviation method"). The prior ban was a correctness bug.
- REPRODUCTIVE HEALTH RESTORED TO IN-SCOPE — family planning / safe sex vs HIV-AIDS / child bearing is
  board-assessed (official Unit II). The registry's exclusion of it was a HIGH-priority bug (it also
  contradicted the registry's own meta). Moved into `cbse_scope_bullets`.
- HEREDITY / MENDEL / SEX-DETERMINATION PRESERVED (board-assessed) — only the Evolution SECTION is
  out. Sub-topic precision is enforced two-way: banned evolution terms caught, preserved heredity
  terms never flagged (test-asserted).
- 3 CONFIRMED-OUT MATHS ITEMS ADDED — Area of Triangle in Coordinate Geometry; Conversion of Solids;
  cubic zeroes–coefficient relationship (Polynomials restricted to quadratic).
- STRICTLY-BOARD-PREP DOCTRINE (owner, final) — formative-only topics (Periodic Classification, the
  Evolution section, Motor/EMI/Generator) AND truly-deleted topics (Sources of Energy, Management of
  Natural Resources) are EXCLUDED from ALL board-prep surfaces INCLUDING THE TUTOR. Formative-only
  topics remain valid QUESTION-BANK subtopics (formative practice) — so they are surface-excluded
  (`SURFACE_BANNED_PHRASES`) but NOT in the question-bank `bannedSubtopics`.
- GUARD EXTENDED VIA CURATED PHRASE-SCAN — only unambiguous content-specific phrases; bare generics
  (Evolution, Generator, Motor, Fossil, Constructions, …) deliberately excluded to avoid false
  positives on prose ("gas evolution") and code identifiers (`dailyMixGenerator`). This honours the
  HARD RULE "never let a generic term over-match in-syllabus content."
- TWO STALE DOCTRINE-LOCKS CORRECTED (owner-authorized "correct both now") — the registry-acceptance
  reproductive-health check (was asserting exclusion) and opsAcceptanceGuard Block 4b (whole-file
  substring) encoded the pre-correction doctrine and were corrected so the only remaining red is the
  intended sweep worklist.

Implication:
The gating guard is intentionally RED on a 93-item sweep worklist. NEXT product PR = the CONTENT SWEEP
(clean the leaks → gating guard + matrix #19 green), run against THIS corrected guard. Then fresh Exam
Trends tiering (D27) → band redesign → the other Option-B surfaces.

## 2026-06-03 - Exam Trends ranked-list responsive redesign merged (#184); band redesign decided as NEXT iteration

Decision:
PR #184 (Exam Trends ranked-list responsive redesign) is merged — the FIRST Option-B convergence.
Trunk after #184: `93a26749e1e6a74819af6e8388e332df8d8b48d3`.

Details / decisions (locked 2026-06-03):
- EXAM TRENDS = FIRST OPTION-B CONVERGENCE — TEMPLATE FOR THE REST. One responsive component
  `src/pages/ExamTrendsRanked.tsx` renders at every width and retires BOTH twins
  (`DesktopExamTrendsPage.tsx` + `app/ExamTrends.tsx`); `App.tsx` `/exam-trends` route de-split.
  The remaining surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet) follow this exact
  shape: one component per surface, retire both twins, preserve the shared design grammar exactly,
  no fabrication.
- PROOF TAG OMITTED — correct anti-fabrication call. The locked prototype's optional "⟨proofs⟩" tag
  has NO backing field in production topic data (`DesktopTopicSummary` carries no `proof` flag).
  Inventing which topics are "proof topics" would fabricate a UI signal → omitted, surfaced to owner.
  Adding it later requires a real `proof` field in `src/data/` (forbidden lane → explicit scope).
- NEW — EXAM TRENDS "MUST-CRACK / HIGH-ROI / GOOD-TO-DO" BAND REDESIGN IS THE NEXT ITERATION. Reuses
  the existing real `tier` enum concept (already used by strategyEngine / dailyMix) and the merged
  ranked-list rows, grouping them into three expandable priority BANDS. Bands replace the
  weight-vs-trend SORT confusion with ONE synthesized priority verdict per topic. PREREQUISITE: the
  tier/trend/marks data must be RE-DERIVED FRESH against current CBSE syllabus + latest paper pattern
  BEFORE banding (the existing priorities are stale/untraceable — see DISCOVERIES D27). Band
  thresholds to be defined after the fresh tiering (see OPEN_QUESTIONS).
- SEQUENCING (locked): content-correctness sweep (D26 — clean banned syllabus terms from descriptive/
  teaching metadata + extend syllabusGuard to scan those files) → re-derive Exam Trends priorities
  fresh (D27) → Exam Trends band redesign → the other Option-B surfaces.

Implication:
Next product PR = content-correctness sweep (HIGH — tutor actively teaches banned content, D26),
THEN fresh tiering (D27), THEN the band redesign. Do NOT band on the stale tiering.

## 2026-06-03 - Tutor teach-style LOCKED + implemented (#182); responsive Option B; Formula/Notes; pivot to redesign

Decision:
PR #181 (desktop tutor wiring) + PR #182 (teach-prompt LOCKED-style tightening) are merged.
Several product directions were locked this session.

Details:
- Trunk after #182: `fd0e7e9398eb6910855f0e1e08e030b71409253b`. B2 committed `8ab00a7`, squash-merged.
- Live concept_teach prompt path = `server/prompts/promptLearn.cjs` + concept branch of
  `buildUserPrompt` in `server/routes/mentorModeHandler.cjs` (NOT promptTeachContract.cjs) — D24.

Doctrine / decisions (locked 2026-06-03):
- TUTOR TEACH STYLE LOCKED + implemented (B2/#182): direct, no fluff/persona/filler-analogy openers,
  on the opened concept (no drift), organized by marks, ends with ONE step-marking offer. On "yes"
  the tutor SOLVES ITS OWN example with CBSE-style step-marking — fabricated by the model, NOT a
  stored-`solutionSteps` lookup. CORRECTNESS IS PARAMOUNT (correctness first, mark-weighting second);
  the eval set must hard-verify fabricated math at scale.
- RESPONSIVE = OPTION B LOCKED: converge the desktop/mobile twin files into ONE responsive component
  per surface (desktop-leads, mobile-adapts at every width), retire BOTH twins, done incrementally
  per surface (not a 1024px twin switch).
- NEW PRODUCT DIRECTION: per-topic Formula Sheet + NCERT-based summary Notes — static, pre-generated
  content that right-sizes the tutor (offload reference material from the chat). Needs a
  content-correctness pass before shipping.
- PIVOT (post-B2 sequencing): move to the end-to-end responsive redesign — Exam Trends ranked-list →
  TopicHub concept-spine (+ Formula/Notes) → Check & Improve → Me/Progress → Worksheet generator.

Implication:
Next product PR = Exam Trends ranked-list responsive redesign (Option B; source
`02_exam_trends_ranked_list.html`). Separate follow-up PRs: interactive-handoff fix
(`findVisualForConcept` returns the WRONG visual), mobile-tutor wiring (mobile `app/TopicHub.tsx`
"Learn" is a placeholder), Formula/Notes generation, AI cost/rate-limit hardening (launch gate).

## 2026-06-02 - PR #178 merged (check-solution grading-prompt tightening; D21 resolved; T4 boundary case)

Decision:
PR #178 (`feat: tighten check-solution grading prompt`) is merged into `base/approved-thru-437`.
D21 (grader over-classifying mistakes as conceptual) is RESOLVED — measured 6/9→8/9 solid on
the T1–T9 scenario matrix against the live local gateway. Scope: `checkSolution.cjs` prompt
strings only (no call-config/schema/data/feature change).

Details:
- New trunk / merge commit SHA: `c760c8eb5c830e64054d516c48d3b5ac85ff523c`. Merged at
  `2026-06-02T09:33:42Z` (squash). Parked branch was rebased onto `7948dc3` (clean) before merge.

Doctrine / decisions:
- Mistake type is classified by CAUSE (what the error reveals about understanding), not by
  where it appears: sign-misread from a correct factor = SILLY (not conceptual); a correct but
  unbalanced equation = PRESENTATION (not conceptual); a propagated downstream error = ONE root
  cause (carried-forward → mistakeType null), never several conceptuals; a wholly-skipped step =
  MISSING (mistakeType null), not a typed mistake; alternative valid method is not penalised.
- **T4 = accepted boundary case (Option 1).** When a student writes the verification VALUES
  (sum/product) but omits the −b/a comparison, "attempted-but-format-short" (presentation) vs
  "step omitted" (missing) is genuinely ambiguous; gemini-2.5-flash is ~50/50 even at temp 0.15.
  Marks are always 2.5/3 and it is NEVER conceptual — only the deducted-mark label flips between
  two defensible values, both conveying the same fix to the student. Not a blocker. The T1–T9
  matrix becomes the permanent regression set and seeds the 40–60-answer eval set.
- Part 2 (teach prompt) deferred to PR B2 — until the tutor is wired/visible (Track A PR-1) and
  measurable against real lessons.

Implication:
Next product PR = Track A PR-1 (tutor wiring, desktop TopicHub). check-solution eval set + the
P0 deploy chain (Railway gateway, Clerk pk_live_) remain ahead of the public student link.

## 2026-06-02 - PR #176 merged (scope:guard re-armed) + owner product decisions

Decision:
PR #176 (`fix: restore repo_boundary_policy.json`) is merged into `base/approved-thru-437`,
re-arming the scope guards. Several owner product decisions were locked today.

Details:
- PR #176 merged 2026-06-02. Base before merge: `1e9bd04` is the merge commit / new trunk SHA.
  Commit `c7d742f`. Changed file: `lazytopper/docs/project_memory/governance/repo_boundary_
  policy.json` (restored from history `d4ed284`; ONE file, no code). Vercel GREEN before merge.
- The break was the untrack in `2081003`, not the `.gitignore` rule — re-tracking is the
  durable fix (`git check-ignore` reports no-match for a tracked file). No `.gitignore` edit.

Decisions (owner, 2026-06-02):
- **3/19 acceptance regressions — DEFER ALL THREE; mark known-red-by-decision.** Investigation
  (report-3of19-regression-intent) proved all 3 are INTENTIONAL product changes, zero accidental:
  - SES-04 (dashboard session player) — session-player arch deliberately deleted (`b891597`),
    replaced by `/daily-mix`. Check is stale.
  - PRG-03 (dashboard "Performance Matrix") — Dashboard rebuilt (`c1afcd3`); matrix →
    `TopicMasteryGrid` (alive). Check is stale.
  - PRG-02 (TopicHub competency) — dropped in the 8025→700 rewrite (`428e3ac`); TopicHub is the
    locked Track A redesign target.
  - Do NOT update/fix any now. SES-04 + PRG-03 resolve as part of the Dashboard→Home/Me-Progress
    consolidation; PRG-02 resolves in the Track A TopicHub redesign. Not to be re-investigated.
- **Dashboard is being retired → Home + Me/Progress** (owner-stated product direction). The
  product has NO Dashboard. BUT the repo still hardcodes `/dashboard` as the post-login landing
  in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`, `RootEntry` mobile). Desktop `/`
  correctly lands signed-in users on DesktopHome; login-fallback + mobile still go to
  `/dashboard`. → A **Dashboard→Home/Me-Progress consolidation** (fix the 3 hardcoded landings)
  is a tracked Track A / cleanup task. NOT done today.
- **Post-login redirect:** the `?redirect=` / `location.state.from` priority correctly returns a
  gated-mid-action user to where they were (matches "gate at save, return after"). Only the
  bare-login FALLBACK wrongly defaults to `/dashboard` — fixed by the consolidation above.
- **Mistake Intelligence: NOT yet integrated.** Me/Progress does not yet wire to real
  mistake-intelligence data — a separate future PR. "Me/Progress shows real memory-intelligence
  data" is the INTENDED state, not the current one.
- **Daily Mix:** alive + premium-gated (`/daily-mix/:grade/:subject`, "Daily Focus Mix"). It is a
  daily-habit PRACTICE surface (streak/resume/mastery), NOT one of the four hooks (Exam Trends,
  Predicted, Check & Improve, Mistake Intelligence) and NOT mistake/spaced-repetition-driven. →
  Flagged for an explicit owner KEEP/CUT decision (candidate to retire like the session-player).
  Undecided.

Implication:
Next is this docs PR → PR B (Part 1) grading-prompt tightening (sync `feat/check-solution-
grading-prompt` `204ac7c` onto `1e9bd04`, then merge) → Track A PR-1 tutor wiring → PR B2
teach-prompt tightening → Railway deploy. Future implementation starts from `1e9bd04` or
whatever live GitHub later confirms.

## 2026-06-01T16:59:01Z - PR #174 merged; check-solution parse fix + AI gateway live (local) + two-track doctrine

Decision:
PR #174 (`fix: check-solution parse reliability`) is merged into `base/approved-thru-437`.
The AI gateway is now LIVE on local dev (non-stub, direct Gemini key). Owner locked several
product clarifications and a two-track build plan.

Details:
- PR #174 merged at `2026-06-01T16:59:01Z`. Base before merge: `8c161739f7ba7bc8faed897970665e0d94c1eee1`.
- Merge commit / new base SHA: `5ad359c42127ac89056002c226828297ead7c98b`.
- Changed file: `lazytopper/server/routes/checkSolution.cjs` (force JSON + raise token cap).
- QA: PASS (npm run build exit 0; measured before/after on real handwritten image).

Doctrine / decisions:
- Force JSON mode (`responseMimeType:'application/json'`) on any Gemini call that must
  return structured data; give thinking models token headroom. (See D20.)
- Trial = ALL features for 7 days, then free Basic. Gate is trial-not-paywall during the 7
  days. Trial/premium state still server/admin-sourced only — NEVER client-activated.
- Redesign target is FULLY responsive at every width (one fluid layout), not a 1024px
  desktop/mobile twin switch.
- Launch domain = `lazytopper.in` (NOT `.app`).
- PR numbering follows git (#175+); "PR-1..8" Track A labels map to real git numbers.
- Two-track build LOCKED: Track A (design/UI fluid responsive) + Track B (content:
  interactives via Claude, proofs, formula sheets, pre-gen PDFs) with robust content QA.
  Source specs (Learn Flow Spec, Track A PR Breakdown) are owner/architect-held, not yet
  committed to this repo.

Implication:
Next is PR B — grading + teach prompt tightening, MEASURED against a mistake-scenario test
matrix (fixes D21 over-classification) — then a check-solution eval set, then Railway deploy
(now in scope; owner needs a live link for students to test tutor+checker quality). Deploy
ONLY after the checker reliably returns good grades locally. Future implementation starts
from `5ad359c42127ac89056002c226828297ead7c98b` or whatever live GitHub later confirms.

## 2026-05-16T18:55:00Z - PR #80 merged; frozen landing and Explore-first doctrine locked

Decision:
PR #80 is merged into `base/approved-thru-437` as PR-K2H-4. It implements the frozen public landing page and Explore-first browse entry. The landing is now frozen and should not be redesigned casually.

Details:
- PR #80 title: `PR-K2H-4: Frozen landing page and explore-first entry`
- Merged at: `2026-05-16T18:43:48Z`
- Base before merge: `18e6e111884b05795882da75ba4c65f034d9d4e9`
- Head branch: `feat/desktop-pr-k2h-4-frozen-landing-explore-entry`
- Final PR head: `045ffa00a3894405f67a5ceda778f313c693fa0f`
- Merge commit / new base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Changed files: 3
- Changed files: `lazytopper/src/App.tsx`, `lazytopper/src/components/desktop/DesktopShell.tsx`, `lazytopper/src/pages/Welcome.tsx`
- QA result: PASS

Doctrine:
- Public landing is now frozen from PR #80.
- Landing has one primary action only: Explore.
- Explore CTA sits after the four-card story and before Mistake Intelligence.
- No Start free trial CTA on public landing.
- No Explore as Guest on landing.
- Browse mode is for product inspection only and must not create a fake guest learner.
- Real learning actions must still require auth/trial gate where already implemented.
- Future changes to `Welcome.tsx` should be small fixes only unless owner explicitly approves a landing redesign.

Implication:
Next implementation should be PR-K2H-5 - Login visual parity + auth gate polish. It must preserve real Clerk auth, no guest mode, reason/redirect handling, safe redirects, and the PR #80 Explore/sign-in funnel. Future implementation must start from `018c95b11f5168d27fb93bb3a2cae3859b682627` or whatever live GitHub later confirms.

## 2026-05-16T02:31:24Z - PR #78 merged; auth/session doctrine and next owner choice

Decision:
PR #78 is merged into `base/approved-thru-437` as PR-K2H-3. It hardens the auth/session shell and pricing honesty while preserving real Clerk authentication. PR #77 is already merged. No open implementation PR should be assumed unless live GitHub says so.

Details:
- PR #78 title: `PR-K2H-3: Auth/session shell hardening`
- Merged at: `2026-05-16T02:26:54Z`
- Base before merge: `0ed0871f3166e647fb5b3e36fb0c1e543df0c145`
- Final PR head: `2067fa5079161c8a888398683d35c3bac59429b0`
- Merge commit / new base SHA: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Changed files: 11
- QA result: PASS WITH FOLLOW-UP

Doctrine:
- LazyTopper is browse-first and action-gated.
- No real-app guest mode.
- Every real learner should authenticate before real learning actions.
- Sign-in is needed to save attempts, mistakes, progress, and power Mistake Intelligence.
- Do not store credentials, passwords, OTPs, Google tokens, Clerk tokens, or secrets.
- Payment gateway is deferred.
- No fake premium, fake payment, or normal client-side premium activation.
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Use source and returnTo for parent-aware navigation and preserve PR #77 route-context behavior.

Implication:
Next implementation should be chosen by the owner from Login visual parity polish, frozen landing page redesign, or Home continue-card route repair. Future implementation must start from `0addba3f0208c7610d02ab1b1753923fdf0790db` or whatever live GitHub later confirms.

## 2026-05-13T14:49:10Z - PR #75 merged; PR-K2H-1 checked-evidence doctrine

Decision:
PR #75 is merged into `base/approved-thru-437` as PR-K2H-1. It hardens Practice checked-evidence states while preserving PR #73 Practice Level-3 visuals. PR #75 is closed/merged and must not be reopened.

Details:
- PR #75 title: `PR-K2H-1: Harden Practice checked-evidence states`
- PR #75 URL: `https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75`
- Final PR head: `1745ca6f93a73b245f8024a3663318fe9aa0d5f6`
- Merge commit / new base SHA: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- Changed files: 3
- Commits: 5
- Completed: checked-answer evidence state hardening, improved SolutionChecker status labels, safer Practice footer/session copy, removal of student-hostile MCQ copy, removal of the MCQ "S" session badge, trusted MCQ click handling as a real answer attempt, wrong trusted MCQ mistake-history logging for eligible signed-in non-local-session learners, and safe CBSE-style step-mark chips for written multi-mark Practice Show Steps when step marks match total question marks.
- Product PR exclusions: no HPQ files, no TopicHub files, no server/API/package/data/env/docs changes.

Data-honesty doctrine:
- MCQ click is a real answer attempt when a trusted key exists.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history is still deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

Implication:
- Next sequence is docs-only handoff update, then PR-K2H-2 route/context repair, PR-K2H-3 durable MCQ answer-attempt model, PR-K2H-4 advanced Practice filters and selection quality, sign-in/trial enforcement pass, Mock Level-3 detail finalisation, HPQ quality work, then broader production-readiness polish.
- PR #69 / K2D remains separate. Do not merge blindly and do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12T08:16:56Z - PR #73 merged; K2G closeout and K2H graded evidence separation

Decision:
PR #73 is merged into `base/approved-thru-437` as a Practice visual/shell/routing/CTA closeout only. Practice evidence, Mistake Intelligence, and graded answer bridge work must be handled in a separate PR-K2H stage.

Details:
- PR #73 final head: `54638b25c6cf2ca88c1f336a91712e2d1d0108ad`
- Merge commit / new base SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Completed scope: Practice Hub entry, direct full Practice routing, DesktopShell full Practice rendering, HPQ-like visual grammar, CTA mutual exclusion, local-only session honesty.
- Not completed: graded Practice evidence, Mistake Intelligence bridge, saved answer quality, filters, solution-quality audit.
- Manual Browser/owner visual QA broadly accepted.

Implication:
- PR-K2H must be the next active implementation stage.
- Practice local MCQ clicks, self-assessment, and Show steps remain learning support, not saved evidence.
- Do not treat PR #73 as the full graded evidence completion.

## 2026-05-08T18:33:03Z - Manual authenticated QA may substitute for Browser Agent when HPQ preview is gated

Decision:
Manual authenticated QA may substitute for Browser Agent when the premium/trial gate blocks HPQ preview and Browser Agent cannot complete magic-link email authentication.

Details:
- Browser Agent saw the Premium Feature interstitial for HPQ / Exam Trends in guest state.
- Browser Agent cannot access the user's authenticated trial session or magic-link inbox.
- Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.
- Manual QA must include screenshots or explicit QA evidence and be recorded in handoff.
- This substitution does not remove the need for final GPT GitHub diff audit.

Implication:
Classify HPQ Browser Agent QA as inconclusive due to auth/paywall limitation, not as a product failure, when manual authenticated QA covers the gated HPQ preview.

## 2026-05-08T18:33:03Z - Post-PR #72 sequence is Practice details, Mock pages, then question/solution quality

Decision:
After PR #72 merges, the next product sequence is Practice Level-3 detail finalisation, then Mock pages Level-3 detail finalisation, then HPQ question/solution quality work.

Details:
- PR #72 should not expand into question-bank or solution-quality repair.
- Practice detail pass happens next after merge.
- Mock page detail pass follows Practice.
- HPQ question/solution quality begins only after Practice and Mock Level-3 surfaces are finalised, unless the product owner explicitly reprioritises.
- Science/Maths structured MCQ options normalization remains later data-quality work.

Implication:
Do not start question-bank, diagram, solution-cache, or MCQ data normalization work before Practice and Mock pages unless the product owner changes priority.

## 2026-05-08T15:37:18Z - PR #72 HPQ prediction-first execution doctrine

Decision:
HPQ is prediction-first, not a generic Practice mode page. Competency questions belong inside predicted topic-wise stacks, not in a separate top-level exam-format mode.

Details:
- HPQ should lead with predicted/high-probability topic stacks.
- Competency visibility may appear as stack counts and question labels.
- Do not add a main exam-format switch to HPQ.
- Do not surface internal prediction rationale, raw confidence percentages, or guaranteed-style claims to students.

Implication:
Future HPQ work should reinforce prediction-first revision, not convert HPQ into a generic filtering/practice surface.

## 2026-05-08T15:37:18Z - PR #72 HPQ execution-loop data honesty

Decision:
Add to mock remains planning-only until an actual graded mock flow exists. Check my answer and Show steps / Show logic are mutually exclusive per question. MCQ / Assertion-Reason wrong clicks do not log Mistake Intelligence in PR #72.

Details:
- Check my answer is the real checking path for non-MCQ HPQ questions.
- Show steps and Show logic are learning support only.
- Add to mock means local basket/planning only.
- MCQ clicks are immediate feedback only and are not saved as real mistake evidence.
- Mistake Intelligence remains fed only by real checked/grading evidence.

Implication:
Do not claim progress, mastery, score, mock grading, profile save, or Mistake Intelligence from HPQ solution reveal, MCQ clicks, or basket actions.

## 2026-05-08T15:37:18Z - Student-facing API errors are forbidden

Decision:
Raw API/server errors must not be shown to students. HPQ step-solution UI should render student-safe fallback copy and keep technical details to developer logging only.

Details:
- Do not render strings such as `AI API request failed`, `API request failed`, `server error`, `fetch failed`, endpoint names, or stack traces.
- Local HPQ step-solution QA requires both frontend and backend gateway.
- Vite proxies `/api` to `API_SERVER_PORT`; local QA uses port `8080`.
- If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`.

Implication:
Future QA must start the gateway when testing step-solution paths locally and must audit student-facing error copy.

## 2026-05-07T08:00:00Z - Manual QA substitutes for Browser Agent on magic-link auth; Practice/HPQ design grammar issue identified

Decision:
Manual 7-day trial entitlement QA may substitute for Browser Agent when Browser Agent cannot complete auth due to email magic-link inbox access limitation. Trial entitlement is considered manually verified for this K2E checkpoint. Practice and HPQ old-format surfaces require Level-3 / desktop design grammar alignment before final desktop graduation sign-off. PR #69/K2D remains draft and must not be treated as merged.

Details:
- PR #70 / K2E trial entitlement audit merged at 807ca666fd414fc5ce37778ade34479d46013544
- Manual 7-day trial QA passed after magic-link login
- Browser Agent couldn't automate magic-link login; no inbox access
- Trial unlock itself is functioning correctly and is not a blocker
- New product issue: Practice and HPQ pages render in older format, lack updated Level-3 desktop design grammar
- This is classified as visual/design parity issue, not data-honesty failure
- PR #69/K2D remains open, draft, and behind current base

Implication:
- For future trial entitlement testing: consider passwordless/test account for Browser Agent, or use manual QA.
- Practice/HPQ design grammar alignment is now an explicit pre-graduation follow-up.
- PR #69 must be rebased and re-evaluated before merge decision.

Current base:
807ca666fd414fc5ce37778ade34479d46013544

## 2026-05-06T12:00:00Z - PR #66 merged; Vercel production setup verified

Decision:
PR #66 / Vercel SPA rewrite config is merged. Vercel production setup is now verified. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/66
- Final head: 4b37d099447903951d6a44bd623b580a86c330e0
- Merge commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Vercel production deploy source branch: base/approved-thru-437
- Vercel production deploy source commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Production deployment status: PASS / Ready
- Production app route: PASS
- Root redirect: PASS
- Clerk login/auth return: PASS after PR #66
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/
- QA rule: Browser Agent should use Vercel production/preview URLs with /app/ appended. Do not use the bare root URL except when specifically testing the root redirect.

Implication:
- K2D has not started. Next safe action: confirm future PR branches generate usable Vercel Preview URLs with /app/ appended for Browser Agent QA, then begin PR-K2D planning only after live base verification.

Current base:
fe065fb0d9eb10d134d2baaa29b1010a54007966
## 2026-05-06T00:00:00Z - PR-K2C / PR #62 merged; post-K2C handoff repair

Decision:
PR-K2C / PR #62 is merged. Handoff is now current through K2C. Next stage is post-K2C handoff repair and Vercel-Codex setup. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/62
- Final head: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- Merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Browser QA: PASS
- Changed files: 5

Implication:
- Do not treat K2C as pending.
- Next safe action: finish and merge this docs-only handoff repair PR, then complete Vercel setup and verify /app/ deployment, then start PR-K2D only after live base verification.
- K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873
# LazyTopper Decision Log

## 2026-05-06T04:32:03Z - PR #64 merged; Vercel/Codex verification is next

Decision:
The docs-only post-K2C handoff repair PR #64 is merged.

Evidence:
- PR #64 head SHA: 3a6f7f097e84e130e2cb5e8be2ca4cc011bd8dbc
- PR #64 merge commit: bbd4d457a2349cf34b8ab335e45123f8b306868c
- PR #62 / K2C merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873

Implication:
K2C is complete. The next safe action is Vercel/Codex setup verification before PR-K2D. Future sessions must verify live `origin/base/approved-thru-437` before starting implementation because docs-only handoff PRs can advance the base after the last recorded checkpoint.

Supersedes:
Any older instruction saying to finish/merge the post-K2C handoff repair PR.

## 2026-05-05T00:00:00Z - K2A and K2B are merged; K2C is next (historical, superseded)

Decision:
PR-K2A and PR-K2B are complete. The next implementation stage is PR-K2C.

Implication:
Future sessions must not treat K2A or K2B as pending. K2C should build worksheet learner-loop entry points using real Check & Improve for grading, while preserving no-fake-data rules.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873

This file records permanent or semi-permanent project decisions that future GPT sessions must not rediscover from scratch.

Newest decisions should be added at the top with UTC timestamp.

## 2026-05-04 — Repo-native handoff system is mandatory

Decision:
The GitHub repo handoff folder is now the primary continuity bridge between GPT sessions.

Implication:
Future GPT sessions must read the handoff folder first and update it before ending.

Files:
- handoff/README.md
- handoff/CURRENT_STATE.md
- handoff/SESSION_LOG.md
- handoff/NEXT_ACTION.md
- handoff/IMPLEMENTATION_ROADMAP.md
- handoff/DECISION_LOG.md
- handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md
- handoff/templates/session-update-template.md

## 2026-05-04 — GitHub is source of truth

Decision:
GitHub origin is the source of truth for base SHA, PR state, changed files, merge status, and current handoff.

Do not trust:
- stale Replit state
- stale Codespaces state
- old screenshots
- previous GPT memory
- Browser Agent claims without GitHub diff validation

## 2026-05-04 — Codespaces terminal is default executor

Decision:
Use Codespaces terminal-controlled method for implementation unless explicitly changed.

Codex is installed and signed in, but is not primary executor yet.

Codex can be used only when explicitly approved, preferably for:
- read-only code review
- risk checking
- test suggestions
- diff review

## 2026-05-04 — Browser Agent is QA, not source of truth

Decision:
Browser Agent is useful for visual/click QA but cannot override GitHub source/diff validation.

If Browser Agent cannot access Codespaces preview due to certificate, forwarding, port, login, or safe-browsing restriction, classify as:

INCONCLUSIVE — preview access limitation

Do not treat it as a product failure unless the LazyTopper app itself loads and fails.

## 2026-05-04 — Revised Level 3 improvements do not have a canonical finalized prototype

Decision:
There is no finalized canonical prototype for the revised Level 3 improvements.

Use:
- Level 1/2 locked references for visual grammar and route continuity
- historical Level 3 references for behaviour inspiration only
- product-native implementation specs and QA gates for K2 onward

Do not use discarded prototypes as canonical without explicit re-approval.

## 2026-05-04 — Data honesty is non-negotiable

Decision:
Never claim:
- fake mastery
- fake score
- fake saved progress
- fake weak areas
- fake Mistake Intelligence
- fake generated question content
- fake solution content
- fake AI grading
- fake prediction certainty
- hidden persistence

Worksheet generated/saved is not mastery.
Worksheet attempted is not checked.
Checked answer is not mistake logged unless real Check & Improve path logs it.
Mistake Intelligence and Me / Progress require saved checked evidence only.

## 2026-05-04 — K2A must be contract/helper before UI

Decision:
K2A must first create the worksheet profile-save contract/helper.

It must not begin with DesktopWorksheetsPage UI changes.

Rationale:
The current worksheet save is local-only and honestly labelled. A signed-in profile path must exist before the UI can claim profile save, progress, or Mistake Intelligence.
