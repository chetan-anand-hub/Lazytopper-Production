# LazyTopper — Next Action
# Updated: 2026-08-09 (post-**WAVE ME-B**: `#647` TOPICHUB-1 + `#649` RETRY-1, **BOTH OPEN DRAFTS WITH GREEN CI AND NEITHER ON TRUNK** - `gh pr ready` is the owner's step. Trunk `376e30b0`, which moved FOUR times during the wave. `ARRIVAL-1` returned BLOCKED with ZERO FILES and that was correct. **`ME-2` was NOT STARTED and passes whole to Wave ME-C.** **THREE consecutive concept resolvers were specified and all three were wrong**, caught only because each was handed on flagged UNVERIFIED. **`#647` is a CONSUMER WITH NO PRODUCER - if `ME-2` does not ship, it is dead code.**)
# Previously: 2026-08-09 (post-**WAVE DPDP-A**: #640 · #639 · #638, three lanes + two read-only scouts. Trunk `6f7da56e`. 🛑🛑 **`#638` IS MERGED AND CANNOT DEPLOY** — production serves the `#639` build; the `#638` boot crashed on an undeclared `tsx` and Railway rolled it back. **DPDP-B's FIRST lane is that fix, ahead of `EXPORT-1` and `SETTINGS-1`.** Every DPDP-A lane disproved a premise of its own dispatching document, two of them the controller's own. **ONLY A BOOT PROVES IT RUNS.**)
# Previously: 2026-08-09 (post-**WAVE ME-A**: #634 · #641 · #637 · #636, four lanes + two scouts, plus the four commits already unrecorded when it opened — #629 · #630 · #632 · #631 · #633. Trunk `e8f89863`. FOUR open PRs, none of them ME: #638/#639/#640 are the DPDP arc's live drafts, #635 is the owner's ops-docs PR. Every ME-A lane disproved part of its own spec. **Wave ME-B opens with `ARRIVAL-1` + `RETRY-1` under a FRESH controller; `ME-2` is Wave ME-C.**)
# Previously: 2026-08-07 (post-**WAVE 5F**: #619 · #620 · #625 · #621 · #626 · #627, four lanes. Trunk `fbfb57fa`. ZERO open PRs. Typed grading LIVE-VERIFIED end to end, including the control. **Wave 5G opens with `ME-PROGRESS`.**)

## NEXT — 2026-08-09 (post-Wave ME-B). Read this block first.

**Trunk `376e30b0931eea69353c582011ed71f38da788f5`** — re-derive with
`git ls-remote origin base/approved-thru-437`; **it moved four times inside Wave ME-B alone.**

### 0 — ***** THE ONE THING THAT MUST NOT BE MISSED *****

> ## 🛑 **NOTHING WAVE ME-B BUILT IS ON TRUNK.** Both lanes are **GREEN DRAFT PRs**, and
> ## **`gh pr ready` is the OWNER's step, never an agent's.**

```
#647  TOPICHUB-1  DRAFT · head 9144c216 · Quality Gate 31308051980 PASS
                  # suites 29 / # pass 196 / # skipped 0
                  Test Files 138 passed (138) / Tests 1719 passed (1719)
#649  RETRY-1     DRAFT · head 25862843 · base 376e30b0 · Quality Gate 31308051342 PASS
                  # tests 196  # suites 29  # pass 196  # fail 0  # skipped 0  # todo 0
                  Test Files 138 passed (138) / Tests 1723 passed (1723)
                  own suite named as run:  mistakeRetry.test.ts (22 tests)
```

⚠ **`#647`'s head is `9144c216`, NOT the `81406ea5` an earlier record pinned** — the `R7` badge-copy
fix (`94f760c8`) and two trunk merges landed after. **Read CI at the head SHA, never at the PR.**
⚠ **The vitest counts moved 1719 → 1723 between two runs on the same day** (and 1662 earlier in the
same wave). **Read them from the run; never carry one as a fixed number.**
⚠ **`#649`'s one `skipped` STEP is the docs fast-path acceptance, correctly bypassed** because the
classifier routed the PR to FULL BAR — **a skipped step is not a skipped test.**

⇒ **Do not open Wave ME-C believing either lane is history. Both are open work awaiting the owner.**

### THE NEXT TASK — **WAVE ME-C, under a FRESH CONTROLLER, running lane `ME-2`**

**`ME-2` is the v7 `/me` page — the largest single lane in the arc, plus the UI half of the retry
affordance.** It was deliberately NOT started in ME-B: the controller was below the addendum §3 35%
floor with two merges still owner-gated, and **a fresh controller with a written handoff beats half a
lane and an unwritten one.**

> ### ⭐ **`ME-2`'s brief is ALREADY WRITTEN: `handoff/BRIEF_ME-2.md`.**
> ⚠⚠ **IT IS UNTRACKED — it exists in the shared checkout on the owner's machine and is NOT in the
> repository.** No `BRIEF_*.md` has ever been tracked here (`git ls-files handoff/` lists none), so
> this is convention, not an accident — **but it means the brief does not travel with a fresh clone
> or a worktree.** Find it at `C:\Projects\Lazytopper-Production\handoff\BRIEF_ME-2.md`.
>
> ⛔ **RE-VERIFY IT AGAINST CURRENT TRUNK BEFORE DISPATCHING IT.** It was authored during ME-B,
> against a trunk that has since moved. **A carry-forward instruction is itself a claim about the
> repo and goes stale** — that is a standing lesson from Wave 5E, and this brief is exactly the
> shape that went stale then.

**`ME-2`'s allowlist, as ratified this wave:** `lazytopper/src/pages/MeProgressPage.tsx` + its tests,
**and `lazytopper/src/lib/desktop/navigation.ts`** (see §1 below).

### ⭐ THE `RETRY-1` CONTRACT `ME-2` CONSUMES — copy it exactly, do not re-derive it

```
planMistakeRetry(entry)  ->  plan
ALWAYS label via retryCopyFor(plan). NEVER retype the strings.

  "exact"    ->  "Re-do that one"        re-serve plan.bankQuestionId
  "similar"  ->  "Try one like it"       plan.concept ?? plan.topic,
                                         plus NUMERIC plan.marks
  "none"     ->  null                    render nothing at all
```

🛑 **`plan.marks` is the NUMERIC `q.marks`, never the coarse `"1"`/`"23"`/`"5"`/`"4"` buckets** — the
buckets FUSE 2-and-3-mark questions and cannot isolate a single mark value (`CLAUDE.md` §7).
⚠ **`"none"` renders NOTHING** — `R10`: *"a retry affordance on an entry that can't identify its
question is decoration, and the student can already reach that topic from every other row. Silence is
the honest option."*
⭐ **Importing `mistakeRetry.ts` is what flips `[FU-RETRY-NO-BUILD-CHUNK-YET]` from *test-only* to
*ships*.** `#649`'s CI build ran (1124 modules, 9.69s) and emitted **no `mistakeRetry` chunk** —
**verified, not asserted.**

### 1 — ⚠⚠ `ME-2`'S FIRST OBLIGATION IS THE PRODUCER, NOT THE PAGE

**`#647` ships a reader that nothing calls.** No code emits `?concept=` into `/topic-hub`:
`buildDesktopTopicHubPath`'s `DesktopRouteContext` is `{source, returnTo}` only, and HPQ does not
link to `/topic-hub` at all. ⇒ **IF `ME-2` DOES NOT SHIP, `#647` IS DEAD CODE ON TRUNK.**
*(Owner-ratified, `R6`, recorded verbatim at his instruction.)*

⚠ **`ME-2` must emit EXACTLY:**
`/topic-hub/<grade>/<subject>/<topicSlug>?concept=<EXACT boardEssentials name, URI-encoded>`
— **the verbatim label. NOT a slug, NOT a `conceptKey`, NOT lower-cased.** `BoardConcept` has no key
field; the row's identity **is** its name. Three separate resolvers were tried and all three were
wrong; **do not introduce a fourth.**

### 2 — 🛑 THE REGRESSION `ME-2` WILL SHIP IF NOBODY READS THIS

**`#646` (`SETTINGS-1`, `3d3a32a9`) ADDED `<AccountDataControls />` TO `MeProgressPage.tsx` as its
last section.** `ME-2` rebuilds that file wholesale. **Deleting that section silently removes a
student's DPDP data-download and account-delete controls** — a privacy regression shipped by a
redesign, on the one arc where that is least acceptable. **Diff against trunk `376e30b0` or later,
never against a brief written before it.**

### 3 — THE OWNER'S RULINGS ARE BINDING ON `ME-2` AND SUPERSEDE BOTH THE PROTOTYPE AND THE ARC DOC

- **`R1` bar buckets** — ⛔ none of the three options offered. **Mirror `ResultsScorecard`'s own
  grouping:** keep **four** segments and fix the **naming** —
  `secured` · `careless slips` (Silly + Presentation) · `knowledge gaps` (Conceptual + Calculation) ·
  `unclassified`. **The legend names all four MI types under their two headings**, so nothing is
  invisible and nothing is dumped into `unclassified`.
- **`R2` bar numerals** — the owner **retracted his own contrast figures**; the scout's measurements
  were right. The fix is **the WCAG large-text threshold** (AA large = **3:1**, large = 14pt bold =
  **18.66px**; the numerals are **already `font-weight:700`**) ⇒ **navy passes at ≥18.66px bold. NO
  token change, NO global colour shift** — `MISTAKE_TONE` is used verbatim across the scorecard, the
  MI card and history, so darkening it would repaint the product's whole mistake vocabulary.
  ⚠ **Raise the segment render threshold from 7% to ~12%** — at 360px a 7% segment is ~23px and a
  two-digit 18.66px bold numeral will not fit. **The legend already prints every number, so nothing
  is lost.**
- **`R3` reconciliation** — **the hero is truth.** Each deeper view carries an **explicit remainder
  row** so all three sum to the hero (*"6 marks not yet traced to a concept"*). ⛔ The hero
  under-reporting real lost marks is the one thing the page cannot do.
- **`R5`** the thin-state self-contradiction and the mis-tagged first-run example are both to be
  fixed. **`R9`** HPQ stays *"Try one like it"* — folding HPQ into the canonical bank is an **owner
  content decision with syllabus implications, not a lane.** **`R10`** an entry with no `questionId`
  **offers no affordance at all** — silence is the honest option, and `RETRY-1` already returns null
  for it.

### 4 — THE PROTOTYPE IS LOCKED **AND NOT DEFECT-FREE**: 11 defects `ME-2` must NOT reproduce

Full table with measurements in `handoff/WAVE_STATE_ME_B_ARCHIVE.md`. The ones that will cost a cycle
if missed:
- **F1 the prototype file is MOJIBAKE-CORRUPTED** — 151×`â`, 16×`Â`, **zero em-dashes survive.**
  Copying its strings literally ships mojibake **and trips `check:mojibake`, which is ENFORCED
  everywhere outside `handoff/`.** Use the scout's supplied intended strings.
- **F2** the thin state contradicts itself — *"34 marks on the table"* directly above *"Two checked
  answers isn't enough to name anything yet."* **An honesty violation on the honesty page.**
- **F6** `.go--soft` has no `:hover`, so `.go:hover` (0,2,0) beats it (0,1,0) → **navy-on-navy at
  1.21:1** on *"Learn {chapter}"*, *"Re-do that one"*, *"Try a quick practice set"*.
- **F11** the picker options and the first-run CTAs are **INERT** (`wire()` is skipped in first run)
  ⇒ **those flows were never clickable in the prototype and `ME-2` must define them.**
- ⚠ **F3 (three views that do not reconcile) and F4/F5 (`Calculation` and `Presentation` have no bar
  segment) were ESCALATED and are ANSWERED by `R3` and `R1`.** Do not re-open them.
- **Not a defect:** `.mask` is `position:fixed` and escapes the review harness's simulated frame. At
  true 390×900 / 360×900 device viewports it measures 354/324px and fits.

**Every structural check the prototype passed is load-bearing and `ME-2` must reproduce it** —
subject purity in both directions across 3 tabs × collapsed+expanded × 3 widths, single-open
accordion, **rail ≤1023 / grid ≥1024 (desktop does NOT inherit a rail)**, no horizontal overflow at
360, and **ZERO `%` in rendered text.** **Pin them with tests.**

### 5 — STILL OPEN ON THE OTHER ARC, and nobody has written it up

⚠ **DPDP-B merged `#644`, `#645` and `#646` and stood down WITHOUT handing over a close-out**, so
those three lanes exist on trunk as PR titles and nowhere as a lane record.
`[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]`

🛑🛑 **`[FU-DPDP-GUARDIAN-CHANNEL-LEGAL]` REMAINS OPEN AND LAUNCH-BLOCKING.** India's DPDP Act treats
data of **anyone under 18** as a child's data and requires **verifiable parental consent to PROCESS
it. Every LazyTopper student is in that class.** **This needs legal advice before launch. It is not a
backlog item about a delete button and must not be softened into one.**

⭐ **`[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]` is new and is probably costing money today** — the
deploy log shows `relation "step_solutions" does not exist` and **nothing in the repo ever creates
that table.** The cache fails soft, so **every step solution has always been regenerated from
Gemini.** Owner-supplied, not agent-verified.

### 6 — THE PRACTICE THAT CAUGHT EVERYTHING THIS WAVE — put it in every brief

> ⭐⭐ **Pass every unverified claim on FLAGGED `UNVERIFIED`, with an explicit instruction to VERIFY
> rather than INHERIT.** Three wrong concept resolvers were caught this way, **including one the
> controller itself had put in the brief.** A candidate handed over as fact would have shipped.

> ⚠ **A controller AMPLIFIES.** A restated finding is harder to reject than a raw one — so a
> subagent's unverified claim must reach the next reader **at the confidence it arrived with.**


## [SUPERSEDED by Wave ME-B] NEXT — 2026-08-09 (post-Wave DPDP-A). Read this block first.

**Trunk `6f7da56ea9495fcfdbe80c577bc13b16a987f456`** — re-derive with
`git ls-remote origin base/approved-thru-437`; it moved five times in two days.

### 0 — ***** THE ONE THING THAT MUST NOT BE MISSED *****

> ## 🛑🛑 **`#638` IS MERGED AND CANNOT DEPLOY. PRODUCTION IS SERVING THE `#639` BUILD.**
> ## **The `#638` deployment crashed on boot and Railway rolled it back:**
> ## `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /app/lazytopper/`

**`tsx` is declared only in `artifacts/api-server/package.json` (`"tsx": "catalog:"`) and is absent
from `lazytopper/package.json` and the root** — re-verified on trunk `6f7da56e`. pnpm workspaces
isolate per package; the Dockerfile does **not** prune ⇒ **undeclared, not stripped.**

★★ **DO NOT record ERASE-1's live-verify as "pending". It is MOOT.** A Console check against
production would be checking a build **that does not contain the code**. The abandoned-QR-upload
verification waits on the same fix.

### THE NEXT TASK — **WAVE DPDP-B, under a FRESH CONTROLLER**

**Lane order is fixed by the owner:**

1. 🛑 **The `tsx` deploy fix — FIRST, ahead of everything.** `[FU-ERASE-1-GATEWAY-TSX-UNDECLARED]`.
   ⚠ **Write it together with `[FU-DEPENDABOT-BLOCKS-RAILWAY-DEPLOY]` — they are ONE root cause**
   (the `catalog:` protocol), not two bugs. **A lane that treats them as unrelated will fix one and
   leave the other.**
   - ⚠ **A manifest change without a matching `pnpm-lock.yaml` update fails the Vercel build too.**
   - ★★ **The acceptance test is a SUCCESSFUL RAILWAY BOOT, not a green suite.** No gate in this
     repository can produce that evidence. **State which image the import resolved in.**
2. **`EXPORT-1`** — data export. It **reuses ERASE-1's map-walker**; a second walker is a drift
   hazard, not redundancy. ⚠ It collides with ERASE-1 on `lazytopper/server/index.cjs` by exact
   path, which is why it was sequenced rather than raced — that constraint is now discharged,
   ERASE-1 is on trunk.
3. **`SETTINGS-1`** — the student-facing surface. **Nothing ships to students on this arc until it
   lands.** ⭐ It **reads the response body, not the status code** — the body enumerates all 29
   locations with their outcome regardless of status. ⭐ **It must not render `notFound` as an error
   to a student**: a path never written to is legitimately empty. It also owns the browser
   `localStorage` half of erasure, which no server can reach.
   - ★ `SETTINGS-1`'s original blocker (`MI-CONCEPT-1` reaching trunk) is **DISCHARGED** — `#637`
     merged as `92cc9fc4`. Its remaining blocker is the deploy fix.
   - ★ **Student-facing Gemini disclosure wording is `SETTINGS-1`'s and the OWNER rules on copy.**

### 🛑🛑 ESCALATION — A LAUNCH-BLOCKING LEGAL QUESTION, NOT A LANE

**`[FU-DPDP-GUARDIAN-CHANNEL-LEGAL]`.** India's DPDP Act treats data of **anyone under 18** as a
child's data and requires **verifiable parental consent to PROCESS it. Every LazyTopper student is
in that class.** ⇒ **This potentially reaches SIGNUP ITSELF, not just deletion.** **Neither the
owner nor any agent here is a lawyer. This needs legal advice before launch.** It is not a backlog
item about a delete button and must not be softened into one.

### ⭐ THE STANDING DOCTRINE THIS WAVE ADDED — put it in every brief

> **A test proves the code works. A build chunk proves it ships. ★ ONLY A BOOT PROVES IT RUNS.**
> Named beneath `MOUNT ≠ LIVE`: **resolves-in-dev ≠ resolves-in-the-deployed-image.**
> ➜ **Any lane adding a runtime import to a server must state WHICH IMAGE it executed in.**

★★ **The generalisation is sharper than the bug.** ERASE-1's map-import proof was **demanded, made
lane-blocking, delivered, and honestly reported** — `EXECUTED PASS` was true in a dev worktree and
false in the production image. **Making a proof mandatory was not enough; the brief never said
WHERE it had to run, and a lane-blocking proof run in the wrong environment reads exactly like a met
requirement.**

Two more, both now in `cofounder-skill/SKILL.md`:
- **THE ALERT LIST IS NOT THE SET.** CodeQL flagged 4 of the 6 `setItem` calls in
  `referralService.ts`. **Generalises to every scanner this project uses** — and it recurred the
  same day: a `Math.random()` user-facing referral code sits on trunk unflagged.
- **A MUTATION'S RED MUST QUOTE THE INJECTED VALUE.** Five false reds came from an `ENOENT` that
  read exactly like a failing test. Add a pre-mutation green and a did-it-actually-run assertion.

### ⚠ OPEN PRs AND THE HANDOFF LOCK

- **`#635`** (`docs(ops): commit the agent standing rules`) is **OPEN and BLOCKED** — failing its
  repo-boundary check. ⇒ **`ops/AGENT_STANDING_RULES.md` DOES NOT EXIST ON TRUNK. Do not create it
  from another lane.** `cofounder-skill/SKILL.md` is the only home that exists today.
- ✅ **`#642`** (the Wave ME-A handoff) **MERGED** at `2026-08-09T01:58:22Z` as `516e50ff`, which is
  now the trunk tip. **It is docs-only.** ⇒ **No handoff PR is open as of this writing** — but that
  is a fact with a shelf life. **Re-run the command.**
- ★★ **EXACTLY ONE HANDOFF PR MAY BE OPEN AT ANY MOMENT — not one ever.** Two *in sequence* is
  correct; two *at once* is the failure. ⚠ **Force-merging two handoffs through the GitHub UI has
  silently preserved stale content over corrections with no gate catching it.** Run
  `gh pr list --state open` **as a command**, not as a habit.
- ★★ **AND CUT A DOCS BRANCH FROM THE OPEN HANDOFF PR'S TIP, NEVER FROM TRUNK BENEATH IT.** This
  handoff was written while `#642` was open; a branch cut from trunk would have produced a PR whose
  diff **reverted all twelve of `#642`'s files**, and merging it would have silently undone the ME-A
  handoff. **No gate in this repository detects that.** See `DECISION_LOG.md`.

### ⭐ WHAT DPDP-B INHERITS — do not re-derive these

- **Both server surfaces are LIVE, in one process tree.** `railway.json` + Dockerfile start
  `artifacts/api-server/dist/index.mjs`, which **spawns** `lazytopper/server/index.cjs`;
  `vercel.json` rewrites `/api/*` → gateway and `/shared-api/*` → api-server, same Railway host.
  **`artifacts/` is the deploy entrypoint, NOT a De-Replit archive.**
- **`resolveVerifiedUid` in `verifiedCaller.cjs` is ALREADY FAIL-CLOSED** (owner-verified). Every
  path returns `""` and **it never consults a header.** ⇒ **No new gate to build** — consume it and
  refuse empty. **The fail-open is in the CALLERS.** ★ SCOUT-1's "advisory / spoofable header"
  phrasing is **wrong; do not propagate it.**
- ⚠ **The spoofable-header hazard is nonetheless REAL AND CURRENT** (owner-verified):
  `verifiedCaller.cjs` and `rateLimiter.cjs` both read `X-Lazytopper-Uid`.
  **The Wave 5D header strip does NOT cover this** — it strips `x-user-id` at the api-server proxy:
  **different header, different surface.**
- **Rate limiting: the repo-wide belief "caps are per-UID, never per-IP" is WRONG.** An IP tier
  exists (`ip:<xff>`, 3/day, signed-out) on the **gateway only**; **api-server has no limiter at
  all.**
- **`users` STAYS LISTED in `studentDataMap.ts`** even though the write is gone, until production is
  verified empty. **De-listing is the one move that could make a future erasure LIE about what it
  covered.**
- **The map is server-consumable and this is EXECUTED, not inferred** — 29 locations read inside the
  server process via `require.extensions['.ts']`. ⚠ **In a dev worktree. See §0.**

### ⚠ ONE CORRECTION THAT IS OWED AND IS IN NO LANE'S ALLOWLIST

**`CLAUDE.md` §6 says the root guard matrix is "SIX suites / 190 checks". It reports 196 / 29** — in
the same paragraph that says never to hardcode the count. Still present on trunk at line 132; `#642`
edited `CLAUDE.md` without fixing it. `[FU-CLAUDEMD-MATRIX-COUNT-STALE-AGAIN]`.

---

## [SUPERSEDED by Wave DPDP-A] NEXT — 2026-08-09 (post-Wave ME-A). Read this block first.

**`2026-08-08T23:31:55Z UTC / 2026-08-09 05:01 IST`** · **Trunk `e8f8986373cc9434858697df0186ca2acabb65a4`**
(re-derive with `git ls-remote origin base/approved-thru-437` — it moved five times during this wave,
**and twice more while this handoff was being written; see immediately below**).

### ⚠ TRUNK MOVED WHILE THIS HANDOFF WAS BEING WRITTEN — read this before trusting the SHA above

**`2026-08-08T23:42Z UTC / 2026-08-09 05:12 IST`.** This handoff was authored against trunk
**`e8f89863`** and covers the nine commits up to it. **Two more merged mid-lane**, both belonging to
the **DPDP arc, which is a DIFFERENT and STILL-OPEN wave**:

```
c9445a1e  CLEARTEXT-1  prove only the uid reaches the nine localStorage sinks  #640  (merged 23:30:57Z)
6ef083b5  USERS-1      a login no longer writes a child's identity to a dead
                       collection                                             #639  (merged 23:42:14Z)
```

**Trunk is therefore `6ef083b5486a292880a0ba5cd1a1d8da1cfc7f7e`, not `e8f89863`. Re-derive it — do
not read the SHA above as current.**

⛔ **`#639` and `#640` ARE DELIBERATELY NOT WRITTEN UP HERE, and that is not an omission.** They are
**another controller's lanes in an open wave** (`#638` ERASE-1 is still an open draft). **Their
close-out belongs to the DPDP wave's own handoff, with their own reasoning attached.** Recording
what they did without the reasoning behind them would produce exactly the reconstruction hazard this
handoff refuses for `#629`/`#630`: **a plausible account is indistinguishable from a record, and the
next lane cannot tell them apart.** What landed, by content only, so the gap is visible rather than
silent:
- **`#640`** — 5 NEW `*.uidOnly.test.ts` files, +1,323 lines, **test-only**.
- **`#639`** — 6 files, +468/−70, touching `AuthContext.tsx`, `learnerAccountService.ts` and
  `studentDataMap.ts`.

⭐ **THE ONE THING THE DPDP CLOSE-OUT MUST CHECK, because ME-A created the condition:** `#640` asserts
**only the uid reaches the localStorage sinks**, and `#637` (this wave) **changed what
`mistakeIntelligence` writes** — it now adds `concept` and `questionId` to the entry. `#640` merged
**after** `#637`, so **`#640` must be re-checked AGAINST `#637`, not merely re-run.** The new fields
are not PII and no conflict is expected — ⚠ **but expectation is not evidence, and `lane_overlap.mjs`
cannot see a semantic overlap; only exact-path disjointness was ever proven.**


### THE NEXT TASK — **WAVE ME-B, under a FRESH CONTROLLER**

**Wave ME-A is CLOSED.** Its four lanes (`#634` MARKS-1, `#641` OPS-LIFT-1, `#637` MI-CONCEPT-1,
`#636` TRENDS-MARKS-1) are all on trunk, and this handoff records them plus the four commits that
were already unrecorded when the wave opened.

**ME-B's candidate lanes, both unblocked by `#637` landing on trunk:**
- **`ARRIVAL-1`** — needed `MI-CONCEPT-1` on trunk. ✅ **Unblocked** (`92cc9fc4`).
- **`RETRY-1`** — needed `questionId` on trunk. ✅ **Unblocked** — ⚠ **but see the scope warning
  below; its premise is wrong for three of four paths.**

⚠ **`ME-2` (the v7 `/me` page) is WAVE ME-C, not ME-B.** It needed all three ME-A engine lanes on
trunk; they are there now, but ME-B's two lanes come first.

### ⛔ THE ONE THING ME-B MUST NOT MISS — `RETRY-1`'s PREMISE IS ALREADY DISPROVED

➜ **`[FU-RETRY-SYNTHETIC-QUESTION-ID]`.** Worksheet, full-mock and chapter-test pass **synthetic
attempt ids** (`ws:` / `fm:` / `ct:`) as `ctx.questionId`. **`RETRY-1`'s premise is *"re-serve the
exact question by `questionId`"* — and for those three paths the stored id DOES NOT IDENTIFY A BANK
QUESTION.**
**The arc already rules the fallback:** if the exact question cannot be re-served, **the copy must
not say *"Re-do that one"*** — rename it to *"Try one like it"* and report.
➜ ⭐ **SCOPE `RETRY-1` AGAINST THIS, NOT AGAINST THE ARC'S ASSUMPTION.** Discovering it mid-build
costs a lane.

### ⚠ THE OTHER ARC IS STILL OPEN — sequence, do not collide

**The DPDP arc is LIVE with three open drafts: `#638` ERASE-1, `#639` USERS-1, `#640` CLEARTEXT-1.**
They are **exact-path disjoint** from every ME lane and `Lane Overlap` agrees — **but `#640` and
`#637` both concern `mistakeIntelligence`, and `lane_overlap.mjs` cannot see that.** `#640` asserts
*only the uid reaches the localStorage sinks*; `#637` **changed what that module writes** (adds
`concept` and `questionId`). The new fields are not PII, so no conflict is expected — ⚠ **but
expectation is not evidence.**
➜ ⭐ **`#640` NOW MERGES SECOND, SO IT MUST BE RE-CHECKED AGAINST `#637`, not merely re-run.**
Exact-path disjointness is the only thing that was ever proven here.

### 🛑 TWO OWNER DECISIONS ARE OWED BEFORE THE RELEVANT LANE CAN BE SCOPED

1. **`[FU-TRENDS-FUZZY-CHAPTER-CONFLATION]` — a LIVE production defect, and the ruling is the
   owner's because it is a CBSE content question.** `legacyFuzzyMatch("Circles","Areas Related to
   Circles")` returns `true`, conflating two distinct chapters; **each chapter's predictions are
   contaminated by the other's evidence.** **Any fix moves the HPQ pin** (`resolveCanonicalSlug`
   moves 52 of 140 live HPQ questions). ➜ **Does this materially mislead a student? That is not a
   lane's call.**
2. **Switch the exam signals to canonical matching, accepting the 37% HPQ ranking change?**
   **Default taken: NO** — the brief said the pin outranks the feature and the lane obeyed.
   Strategies are **built, wired and tested but not default**, so flipping later is **a config
   change, not a rebuild** — the correct shape.

### ⭐ THE STANDING DOCTRINE THIS WAVE ADDED — put it in every brief

- **`scope:guard` IS VACUOUS ON AN UPDATE-ONLY LANE.** It reads only staged / unstaged / untracked
  files and has **no base-ref mode**, so a refresh / merge-only / rebase-only lane authors nothing,
  gets `inspected=0`, and **exits green**. ⚠ **That green is indistinguishable from a real pass.**
  ➜ **Remedy, proven this wave:** reconstruct the authoring condition in a throwaway worktree at
  trunk. ➜ **Every such lane must state WHICH invocation it ran.**
- **A HASH WITHOUT ITS RECIPE IS NOT EVIDENCE** — the same class of defect as a bare line number.
  **Cite the artefact that gates, or record the exact recipe beside the hash.**
- **A MUTATION MUST BE PROVEN APPLIED (`mutated-sha != baseline-sha`) BEFORE ITS RED OR GREEN IS
  EVIDENCE.** MARKS-1's fourth mutation did not land, and only that assertion stopped a confident
  false finding reaching the owner.
- **DO NOT run `test:matrix:all` locally on this box.** It is CI-only here; two concurrent runs have
  OOM-killed the editor.
- ✅ **`CLAUDE.md` §6 is CORRECTED in this PR** — the Vite production build **does** run on a Windows
  dev box after dropping `@rollup/rollup-win32-x64-msvc@4.59.0` into
  `node_modules/.pnpm/rollup@4.59.0/node_modules/@rollup/`. **This matters because it re-enables the
  strongest `MOUNT != LIVE` proof available: a test proves the code works; a chunk proves it ships.**

### ⭐ WHAT ME-2 (Wave ME-C) INHERITS — do not re-derive these

Full bodies are in `handoff/CURRENT_STATE.md`'s `[CURRENT]` block. In one line each:
**never `?? 0` the marks fields** (absent must stay absent) · **9.05% of the bank can never yield a
concept**, so the concept slicer must degrade to an honest empty state and **never a topic-level
fallback** · **`expectedMarks` must be WIRED, not merely consumed** (it is tree-shaken out of every
`assets/*.js` today) · **the unclassified marks bucket must NOT be a dumping ground**, because
`[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` would hide inside it · **`[FU-ME-MOBILESELFCHROME-NESTING]`
from `#631`** · **MARKS-1's live-verify debt transfers to ME-2 and needs a session carrying state
from BEFORE `#634`.**

### ⚠ ONE FILE IS AT RISK AND IT IS NOT THIS WAVE'S TO SAVE

`handoff/WAVE_STATE_WAVE_DPDP_A_LIVE.md` (46,040 bytes) is the **only copy** of the open DPDP arc's
controller state. **Correctly left untouched here** — archiving an open wave is wrong and the file
belongs to another controller — **but it is laptop-only and unrecoverable if the disk fails.**
**The DPDP controller archives it when that wave closes.**

---

## NEXT — 2026-08-07 (post-Wave 5F). Read this block first.

### 0 — ***** THE ONE THING THAT MUST NOT BE MISSED *****

> ## **Six PRs, four lanes, 1,400+ tests, six green CI runs — AND TYPED GRADING HAD NEVER ONCE WORKED IN PRODUCTION until the owner tried it on his phone. No gate found it.**
> ## **That is the argument for the ~50-student QA pass, in one sentence.**

**Every static gate this project owns was green while the product's free-tier grading path returned
a 400 on every single attempt.** Fourth consecutive wave in which the deployed-product check found
what the suite could not. ⇒ **Any change touching a live round-trip closes on the DEPLOYED state,
never the merged state.**

### ★★ WHAT CHANGED IN THIS LIST — the Quick Practice arc is CLOSED

**`WIRE-2` is DONE (`#621`), and with it the three dormancies it existed to end.** The previous two
handoffs opened with *"the Quick Practice results surface is BUILT AND UNREACHABLE"*. **That is no
longer true.** `#578`, `#611` and `#617` all have callers; the batch executes; and `#626` + `#627`
made the server actually grade what the client sends. **Do not carry that paragraph forward.**

⚠ **One line from it survives and must not be lost:** `#611` swallows the 402 with an unconditional
catch turning `PremiumRequiredError` into `skipped-error`. **It was latent while nothing called it.
`#621` shipped the caller — it is LIVE now.** See `[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]`.

### 🛑 THE PRE-LAUNCH BLOCKER THIS WAVE FOUND — fix it before the QA pass

**`[FU-UPLOAD-LIMIT-BLOCKS-PHONE-PHOTOS]`** — a normal phone photo (3 MB+) **exceeds the upload
limit**, on the **FREE-TIER** path. The owner had to photograph, convert to PDF, then upload.
**A photo-grading product that rejects phone photos is broken for its primary use case.**
Fix = raise images to ~10 MB **AND** client-side downscale (~2000 px long edge, ~85% quality).
⚠ **CHECK THE SERVER CAP IN THE SAME LANE**, or raising the client yields a **413** instead of a
friendly refusal — the identical shape to the `MAX_BATCH_UPLOADS` 400 this wave already paid for.

### 🛑 STANDING PROHIBITION — carry it loudly

**NO `drizzle-kit push` until `[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]` is resolved.** A second migration
mechanism exists whose `generated_questions` omits `answer` / `solution_steps` / `final_answer` and
the unique index `saveToPool`'s `ON CONFLICT` requires. **It would create a table the live server
cannot write to — and it would look like success.**

### THE ORDER, WITH REASONS

1. **`ME-PROGRESS` — WAVE 5G's FIRST LANE.** It could not run in 5F because it edits `App.tsx`'s
   `/me` route while `WIRE-2` held section 9b's authorization, and **ruling 3A does NOT free it**,
   because the graded-sheet route lane will need the same file.
   ⚠ **TWO AMENDMENTS ARE OWED BY THE OWNER BEFORE IT DISPATCHES:**
   (a) its **section 5 gate-CTA paragraph is STALE** — `GATE-3` shipped the locked Premium
   treatment, so `/me`'s premium CTAs must **match what shipped**, not the July prototype;
   (b) it must **EXPECT `lane_overlap`'s GATED_FILES owner-review warning** on `App.tsx`.
2. **`SERVER-2`** — **scoped from `#620`'s OUTPUT, never from a document.** Marks ARE available at
   the grade-single call site, so the thinking budget CAN be banded — **one band per MARK VALUE,
   never the coarse `"23"` bucket that fuses 2- and 3-mark questions.**
   ⚠ **AND IT IS NOW GATED BY `[FU-GRADING-CONSISTENCY-UNMEASURED]`.** Temperature is already 0.05
   and `responseSchema` shipped in `#559` — **the easy determinism levers are spent**, and nobody has
   MEASURED the residual variance. **Measure before tuning**, or a rubric/thinking-budget change
   cannot be told apart from noise.
3. **`DPDP`** — launch blocker. Erasure + export, plus the 9 clear-text-storage CodeQL alerts.
4. **`SEO-1`** — per-route metadata.
5. **`[FU-SCORECARD-DESKTOP-SCROLL-CEILING]`** — live on trunk TODAY.
6. **The graded-sheet route lane** — carries `[FU-QP-GRADED-SHEET-NOT-A-ROUTE]` and the **still-granted
   section 9b `App.tsx` authorization** (ruling 3A kept it granted for exactly this).
   ⚠ It should absorb **`[FU-QP-GRADED-SHEET-NO-STEPWISE-MARKING]`** or explicitly decline it.
7. **`AUTH-1`** — email/Google link direction. A phone-first student who later signs in with Google
   gets a **SECOND account**, and **split accounts are unrecoverable by design.** ⚠ Note `#616` and
   `#623` merged and **phone-first students are named now — but pre-`#623` accounts are still
   nameless and nothing repairs them** (`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`).
8. **`FORBID-7` + `BATCH-2` history.**

### ⚠ TWO ITEMS CARRIED UNRULED — the OWNER decides, not a lane

**1 · THE FENCE.** `[FU-TYPED1-FENCE-IS-NOT-ESCAPING]` / `[FU-AMEND621-FENCE-ESCAPE-IS-SERVER-SIDE]`
/ `[FU-AMEND621-BATCH-WIDENS-INJECTION-BLAST-RADIUS]`.
★ **PRODUCT-WIDE AND LIVE TODAY ON CHECK & IMPROVE** — this arc **extended** an injection surface
that had been open on two client paths since `57224f49`; it did not create one. **Its own lane,
covering ALL THREE call sites.** Settled facts: forgeable **YES**, no escape/filter/truncation
anywhere; the blast radius reaches **other questions in the same call**; **the subjective mark is
what an injection can inflate** (qNumber reconciliation, the per-question mark ceiling, the keyed
objective clamp and the status allowlists all survive); **the privilege boundary HOLDS — the damage
is self-inflicted grade inflation and a polluted OWN MI.** Fix = **2 sites in 1 server file**; the
wider free-text surface is **19 sites across 6 files, of which `/api/tutor` is 9**, and
`figures[].label` / `brief.*` reach the **SYSTEM** prompt uncapped.

**2 · `/admin/diagram-*` AUTHENTICATION.** The only `/admin/*` routes **not** wrapped in
`<RequireAuth>`, posting a free-text textarea to `/api/generate-diagram` — **the one plausible
UNAUTHENTICATED free-text path to Gemini**, with both cost and abuse exposure.
⚠ **NOT ESTABLISHED whether it is blocked server-side.** `entitlement.cjs` / `verifiedCaller.cjs`
were never opened for that route. **The owner will not rule from a name — this needs the finding
first, and a finding is a scout, not a build lane.**

### STILL OWED BY THE OWNER

- **`ME-PROGRESS`'s two amendments** (above) — it cannot dispatch without them.
- **`MASTER_TRACKER.md`.**
- **A ruling on the fence**, and **a scout dispatched on `/admin/diagram-*`.**

### STANDING DOCTRINE ADDED THIS WAVE — read before writing any brief

- **A CORRECTION IS NOT EVIDENCE — IT IS A NEWER CLAIM.** Verify both versions. **Twice in one wave
  a superseding correction was itself wrong.**
- **A MUTATION THAT GOES GREEN MAY BE A HOLE IN THE TEST**, not the absence of a trap.
- **AN EXISTING GREEN TEST CAN PIN THE DEFECT IT WAS MEANT TO PREVENT.**
- **A FIELD REACHING THE EMITTER IS NOT THE REQUEST REACHING THE EMITTER.**
- **A TITLE IS NOT AN ASSERTION** — quote every new test's FIXTURE and check it against its title.
- **A GREP HIT IS NOT LIVE CODE.**
- **A WATCH THAT POLLS FOR COMPLETION CANNOT SEE A JOB NEVER CREATED.**
- **A LOGGER'S SEVERITY IS ABOUT THE STATUS CODE, NOT ABOUT WHETHER ANYTHING WENT WRONG.**
- **NEVER COMMIT WHILE A MUTATION HARNESS IS RUNNING.**
- **NEVER STACK PRs**, and **a controller must re-read a lane's CI claim to its terminal state.**
- ⚠ **`[FU-CI-VERIFY-PRODUCTION-BUILD-NOT-WIRED]`** — `verify-production-build.mjs` is required by
  `CLAUDE.md` §6 and **has never run in CI**. Do not treat a green Quality Gate as covering it.

---

## [SUPERSEDED by Wave 5F] NEXT — 2026-08-06 (post-#623)

### 0 — ***** THE ONE THING THAT MUST NOT BE MISSED — UNCHANGED BY `#623` *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**THREE DORMANT CAPABILITIES STILL SIT IN THIS ARC, AND ONE LANE ENDS ALL THREE:**

| Built | When | Called by |
|---|---|---|
| **`#578`** the grader's per-question image support | 1 Aug | **nothing** — live-verify never run |
| **`#611`** `gradeQuickPracticeBatch`, 25 tests | 5 Aug | **nothing** — zero callers |
| **`#617`** the graded answer sheet | 6 Aug | **nothing** — one caller, its own test |

**`WIRE-2` is specced, on disk at `C:\Users\Chetan\OneDrive\Desktop\diff\wave 5e\`, and NOT
dispatched. Do not re-spec it.** ⚠ `#611` swallows the 402 — latent while uncalled, **live the
moment `WIRE-2` ships.**

### ★★ WHAT `#623` CHANGED IN THIS LIST — one line removed, one constraint sharpened

**`NAME-2` is DONE.** It was #2 in the previous order; it is gone from this one.
`[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]` is **CLOSED for new accounts** — phone-first students now get
a name, owner-verified on a real handset including the second sign-in that proved the no-overwrite
guard fires against a live record.

⚠ **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` did NOT close, and is now the sharper constraint.** Nothing
repairs accounts created before `#623`. **It gates the ~50-student QA pass** — see the critical path.

### THE ORDER, WITH REASONS

1. **`WIRE-2`** — **still the first lane of Wave 5F, and still the only thing that ends three
   dormancies.** `#623` changes nothing about it.
2. **The SEO decision** — `[FU-SEO-ROOT-IS-A-REDIRECT]`, and whether a public content layer gets
   built at all. `#615` fixed the canonical; it could not fix the shape. **The domain has no
   homepage of its own** and reaching content costs two hops.
3. **Bank expansion Batch 12** — trigonometry + circles + carbon-and-its-compounds.
   ⚠ **DARK SINCE `#419` ON 13 JULY; 12 of 26 topics remain.** Nothing has expanded since — **the
   four bank commits after it are all corrective**, not additive. This is the longest-running stall
   on the board and it is easy to miss because the file keeps changing.

### ⚠ THE CRITICAL PATH IS UNCHANGED, AND NONE OF IT IS FEATURES

**DPDP · the ~50-student QA pass · GSTIN → Razorpay KYC → live keys.**

★ **The plan-shape decision (one-time "till boards" vs recurring) is STILL OPEN and still blocks TWO
things** — `PAY-1`'s spec, and the login door's `/ month` framing. `#616` deliberately kept the
founding-member line as **one self-contained replaceable sentence** in each offer variant so a
plan-shape change is a one-line edit and not a re-layout. **`#623` did not touch the offer copy.**

⚠ **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` remains a SEQUENCING CONSTRAINT on the QA pass**, and `#623`
did not relieve it. **Accounts created before `#623` stay nameless and nothing repairs them.** Run
the pass on pre-`#623` accounts and ~50 students start permanently nameless. **Either recruit the
cohort fresh after `#623`, or accept that a backfill lane must land first.**

### `AUTH-1` IS STILL NOT QUEUED, AND STILL RUNS ALONE

`[FU-AUTH-EMAIL-LINK-DIRECTION]` — only `linkWithPhoneNumber` exists, so **a phone-first student can
never absorb an email**, and one who later signs in with Google gets a **SECOND** account.
⚠ **SPLIT ACCOUNTS ARE UNRECOVERABLE BY DESIGN.** It needs **new context keys**, which is exactly
what `#623` avoided — see the KEY-vs-PARAMETER note in `CURRENT_STATE.md`. **It cannot ride along
with a small lane.**

### ⚠ `LAUNCH_REMAINING.md` AND `SURFACE_TRACKER.md` ARE BOTH STALE — DO NOT READ EITHER AS CURRENT

**`LAUNCH_REMAINING.md`:** last reconciled at `a8f36ab` on 2026-07-13, still discussing `#423`.
**`SURFACE_TRACKER.md`:** its `Trunk at last sync` line still reads `203fb370` (Wave 5C).
**Neither was advanced by this handoff, deliberately.** Reconciling either is a job of its own, and
half-updating one would make it *more* misleading by looking fresh. **Advancing a sync header over
content nobody has re-reviewed asserts a review that never happened.**

## (superseded) NEXT — 2026-08-06 (post-#615-#616). Read this block first.

### 0 — ***** THE ONE THING THAT MUST NOT BE MISSED — UNCHANGED BY EITHER LANE *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**THREE DORMANT CAPABILITIES STILL SIT IN THIS ARC, AND ONE LANE ENDS ALL THREE:**

| Built | When | Called by |
|---|---|---|
| **`#578`** the grader's per-question image support | 1 Aug | **nothing** — live-verify never run |
| **`#611`** `gradeQuickPracticeBatch`, 25 tests | 5 Aug | **nothing** — zero callers |
| **`#617`** the graded answer sheet | 6 Aug | **nothing** — one caller, its own test |

**`WIRE-2` is specced, on disk at `C:\Users\Chetan\OneDrive\Desktop\diff\wave 5e\`, and NOT
dispatched. Do not re-spec it.** ⚠ `#611` swallows the 402 — latent while uncalled, **live the
moment `WIRE-2` ships.**

### THE ORDER, WITH REASONS

1. **`WIRE-2`** — still the first lane of Wave 5F, and **still the only thing that ends three
   dormancies**. Nothing below changes that.
2. **`NAME-2`** — the phone segmented control. Small and scoped; full allowlist and the
   KEY-vs-SIGNATURE reasoning are in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`.
   ⚠ **Phone-first students land nameless until this ships**, and
   `[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` means it repairs nobody already created.
3. **The SEO decision** — `[FU-SEO-ROOT-IS-A-REDIRECT]`, and whether a public content layer gets
   built at all. `#615` fixed the canonical; it could not fix the shape. **The domain has no
   homepage of its own** and reaching content costs two hops.
4. **Bank expansion Batch 12** — trigonometry + circles + carbon-and-its-compounds.
   ⚠ **DARK SINCE `#419` ON 13 JULY; 12 of 26 topics remain.** Nothing has expanded since — **the
   four bank commits after it are all corrective**, not additive. This is the longest-running stall
   on the board and it is easy to miss because the file keeps changing.

### ⚠ THE CRITICAL PATH IS UNCHANGED, AND NONE OF IT IS FEATURES

**DPDP · the ~50-student QA pass · GSTIN → Razorpay KYC → live keys.**

★ **The plan-shape decision (one-time "till boards" vs recurring) is STILL OPEN and now blocks TWO
things** — `PAY-1`'s spec, and the login door's `/ month` framing. `#616` deliberately kept the
founding-member line as **one self-contained replaceable sentence** in each offer variant so a
plan-shape change is a one-line edit and not a re-layout.

⚠ **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` is a sequencing constraint on the QA pass**, not a
nice-to-have: without it, ~50 students start permanently nameless.

### ⚠ `LAUNCH_REMAINING.md` IS STALE — DO NOT READ IT AS CURRENT

**Last reconciled at `a8f36ab` on 2026-07-13, and it is still discussing `#423`.** Trunk has moved
through five waves since. **It was deliberately NOT fixed in this handoff** — reconciling it is a job
of its own, not a line-item in a docs PR, and half-updating it would make it *more* misleading by
looking fresh. **Treat every date, SHA and open-item list in that file as unverified until it is
reconciled.**

## (superseded) NEXT -- 2026-08-06 (post-#611-#617, WAVE 5E).

### 0 - ***** THE ONE THING THAT MUST NOT BE MISSED *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**THREE DORMANT CAPABILITIES NOW SIT IN THIS ARC, AND ONE LANE ENDS ALL THREE:**

| Built | When | Called by |
|---|---|---|
| **`#578`** the grader's per-question image support | 1 Aug | **nothing** -- live-verify never run |
| **`#611`** `gradeQuickPracticeBatch`, 25 tests | 5 Aug | **nothing** -- zero callers |
| **`#617`** the graded answer sheet | 6 Aug | **nothing** -- one caller, its own test |

### 0a - WAVE 5F's FIRST LANE IS `WIRE-2`. IT IS SPECCED AND WAITING.

**`SUBAGENT_WIRE2_flip_quick_practice_to_batch.md` v1.1**, on the owner's disk at
`C:\Users\Chetan\OneDrive\Desktop\diff\wave 5e\`. **Do not re-spec it. Do not improvise one.**

It carries **TWO NARROW, EXPLICIT AUTHORIZATIONS**, both for globally-forbidden or gated files, each
granted for exactly one change and nothing else:
- **section 9a - `ResultsScorecard.tsx`: ONE COPY LINE ONLY.** "Ready to grade" -> **"Diagnosed from
  your working"**. Owner-acknowledged as his own error: it is pre-grade copy lifted onto a post-grade
  sheet, where the prototype's own results frame says "Diagnosed from your working". It pairs with
  "Marked instantly - free".
- **section 9b - `App.tsx`: ROUTE REGISTRATION ONLY.** The graded sheet is a **ROUTE, not a modal** --
  owner-ruled. At 1024px the sheet is **~1,877px of content inside a 540px card** (measured by
  RESULTS-1, not hypothesised), **and a graded paper is something a student comes back to**: a modal
  cannot be linked, bookmarked or reached from history.
  ** `App.tsx` is CLAUDE.md section 4 forbidden AND held under owner review by `lane_overlap`'s
  `GATED_FILES`. `WIRE-2` will trip that gate DELIBERATELY -- the warning is INTENDED, not a defect.**
  `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]`

**What WIRE-2 must not get wrong, in one place:**
1. **MI MUST BE FED BY THE BATCHED PATH.** Mistakes reach MI today via `handleCheck` ->
   `recordMistake`, and **that path is GONE after this lane.** If the batched path does not also
   record mistakes, **Mistake Intelligence stops being fed by Quick Practice entirely -- the moat
   going dark, silently, on the highest-traffic surface.** Test AND mutation.
2. **THE 402 MUST REACH THE STUDENT.** The batched call becomes the **only** paid call in Quick
   Practice, and `quickPracticeSessionService` currently **swallows it** -- a free-past-trial student
   would press Finish and get **silence**. Fix the unconditional catch **in the same PR**.
3. **`#578`'s LIVE-VERIFY DISCHARGES THERE.** Not dischargeable from a worktree: `isStubMode()`
   returns before `buildUploadParts`, so **a stub run never enters the interleave.** It needs a real
   key and a real student trigger.
4. **`SurfaceHistory` is GENERIC**, takes a `SessionSurface`, and consumes `progressStore` without
   computing or persisting. **Adding Quick Practice may be nearly free -- and if it is not, that is a
   finding to report,** because the cheapness of that half rests on it.
5. **Cut it from TRUNK, never stacked.** A stacked PR and its base each see the other in
   `lane_overlap.mjs` and **neither can merge, in either order** (#608/#609, Wave 5D).

### 0b - STILL OWED BY THE COFOUNDER

**`TELEMETRY-1`** (gates the thinking budget AND ends the cost guessing) - **`WARM-GATE-1`** (gates
`DATABASE_URL` returning) - **`MASTER_TRACKER.md` content.**

### 0c - OPEN AND THE OWNER'S, NOT A LANE

`#615` META-3 (sitemap + canonical) - `#616` NAME-1 v2 (the login door rework).
**`AUTH-1` is NOT queued** -- the name/link work moved to a new cofounder session.

### 0d - PROCESS RULES EARNED. DO NOT RE-LEARN THEM.

- **`gh pr ready` IS THE OWNER'S STEP.** Lanes push DRAFTS and stop.
- **DO NOT STACK PRs.** See 0a.5.
- **A MUTATION MUST BE PROVEN *APPLIED*** (`mutated-sha != baseline-sha`) **before its red counts** --
  and **prove the runner actually RAN.** Two separate silent-runner traps were hit and caught this
  wave: a CRLF pattern that matched nothing, and `execSync` spawning a shell wrapper so vitest never
  executed.
- **STAND-DOWN KILLS ONLY THE LANE'S OWN WORKTREE PATH.** An over-broad `*LT-worktrees*` glob could
  have killed a concurrent lane's processes on 2026-08-05. **Scope it to the lane, unconditionally --
  the safety must not depend on who else happens to be running.**
- **SHIP THE SPEC, FLAG THE DOUBT, DO NOT SILENTLY IMPROVE.**
- **`CLAUDE.md`'s "190 checks" is NOT STALE** -- it self-dates and says read it from the run. Reading
  196 is that instruction working. **Three lanes have flagged it; all three were wrong.**

---

## PREVIOUS -- 2026-08-05 (post-#606-#609, WAVE 5D). Superseded by the block above.

### 0 - WAVE 5E RUNS FOUR LANES. OWNER-RULED.

Trunk `51f7712`. Zero open PRs. All four Wave 5D lanes verified ON TRUNK BY CONTENT, not by PR state
(this repo squash-merges, so `merge-base --is-ancestor` on a PR head is the wrong test).

1. **`BATCH-1b`** -- spec coming from the cofounder; `#606` unblocked it by lifting the
   `quickPracticeSessionService.ts` ban. **Do not improvise the spec.**
   WARNING for whoever writes it: the ban was buying the **double-write hazard** -- one graded set
   must produce ONE record and ONE payload. A second writer surfaces as duplicated attempts in
   Mistake Intelligence, which is the store the tutor reads. That property is now pinned by
   `quickPracticeSessionService.persist.contract.test.ts`; **do not weaken it.**
2. **Telemetry instrumentation** -- **GATES `SERVER-1` section 2.** See
   `[FU-TELEMETRY-NO-CALL-CLASS-NO-PERCENTILES]`. `/api/admin/token-telemetry` answers but returns
   **totals, not a distribution**, and **83 of 84 calls are `unclassified`** (only `tutor` is tagged).
   Most of that sample was warm-pool GENERATION, so **budgeting the grader off it budgets the wrong
   workload.** Needed: per-call-class tagging and **p90 PER MARKS-BAND** -- not p50/p90/p99, and
   emphatically not a mean, which tells you nothing about the tail.
   Measured and worth carrying: **average grading latency 17.0 s**, so the 17.3 s in the owner HAR
   was **the norm, not an outlier**; thinking is **80.9%** of output-rate tokens.
   WARNING: counters are **per-process and reset on redeploy**, so an accrual window only accrues if
   nothing ships. Capture a reading before each merge.
3. **Warm-pool startup gate + schema** -- **GATES `DATABASE_URL`.**
   `[FU-WARM-POOL-STARTUP-PREWARM-NOT-GATED]`. **`DATABASE_URL` IS NO LONGER AN OWNER TASK. IT IS A
   LANE.** `WARM_POOL_TOP_UP_INTERVAL_MS=0` disables the **recurring** top-up only; a separate
   **one-time STARTUP pre-warm is ungated** and began a 312-combination run. Only an unrelated
   failure (the schema had never been created, so every combination erred at the count step) kept
   spend flat. **With a populated schema it would have proceeded.** Gate the startup path AND create
   the schema before any second attempt.
4. **`AUTH-1` -- ALONE, with zero other open PRs.** `AuthContext` is `vi.mock`ed in ~25 files, every
   one a complete replacement, and its key set is pinned by **exact equality**, so it fails on
   **addition** -- reddening files the lane never opens. Three of the 25 are `PracticePage` tests.
   Carries a live defect: **nothing links to `/sign-up`, so every account is created with no
   `displayName`.** `[FU-AUTH-SIGNUP-ROUTE-UNREACHABLE]`

**Plus one small owner-directed fix:** `PublicLegalFooter`'s default contrast --
`[FU-LEGAL-FOOTER-REST-CONTRAST]`, 4.49:1 rest against a 4.5:1 AA threshold and **1.42:1 on hover /
`:focus-visible`**, where the link vanishes exactly when a keyboard user selects it. **Fix in the
COMPONENT, not per host** (`#969ea9` = 6.59:1 / 17.84:1), which makes `#609`'s override redundant.

### 0a - PROCESS RULES EARNED IN WAVE 5D. DO NOT RE-LEARN THESE.

- **`gh pr ready` IS THE OWNER'S STEP.** Lanes push DRAFT PRs, read their own CI run, and stop. The
  model said lanes never mark ready; it never said who does, and **four PRs sat mergeable-but-draft.**
- **A SUBAGENT COMMITS AND PUSHES A DRAFT. IT NEVER MARKS READY, NEVER MERGES, NEVER PUSHES TO TRUNK,
  NEVER DELETES A BRANCH.** The operating model contradicts itself here -- its section 1 says "pushes
  as draft, reads the CI log", its section 6 says "stop before commit". **Section 1 is correct;
  section 6 should read "stop before MERGE."** Owner-ruled 2026-08-05.
- **DO NOT STACK PRs IN THIS REPO.** `[FU-LANE-OVERLAP-SYMMETRIC-DEADLOCK-ON-STACKED-PRS]` --
  `lane_overlap.mjs` compares every open PR against every other, so **a stacked PR and its base each
  see the other** and **neither can merge, in either order.** Recovery without `--admin`: close the
  stacked PR, **re-run the base's Lane Overlap** (closing a PR does NOT re-trigger checks on another
  -- same lesson as `#593`), merge the base, reopen, `gh pr update-branch`, merge.
  **Either wait for the base to merge, or scope the second lane so it does not need the first's files.**
- **A MUTATION MUST BE VERIFIED *APPLIED* BEFORE ITS RED/GREEN IS EVIDENCE.** Snapshot the SHA,
  mutate, **assert mutated-sha != baseline**, run, restore from a byte snapshot, assert sha ==
  baseline. Most files here are CRLF; a line-anchored pattern ending `\n` **silently matches nothing**,
  and verifying only the restore cannot catch it. **That failure mode accuses a GOOD test of being
  fake** -- you delete real coverage on its strength.
- **`CLAUDE.md`'s "190 checks" is NOT STALE.** It reads "as of 2026-07-28; the count GROWS; read it
  from the run." Reading 196 is that instruction **working**. Three lanes have now flagged that file
  and all three were wrong. **Do not edit it.**

### 0b - TWO CLOSED ITEMS. DO NOT RE-SCOPE EITHER.

- **`[FU-EFF-RESPONSE-SCHEMA]` is CLOSED -- it shipped in `#559` (PR-C2) and was never needed.**
  Verified on trunk with the chain quoted at every hop: constants at `:167`/`:212`/`:266`, wired at
  `:595`/`:888`/`:1385`, reaching the wire at `geminiClient.cjs:392`; `callGemini` has three call
  sites and **every one carries a schema**; 18 contract tests, one asserting it is SENT.
  **The "MI is built on noise" framing is RETIRED. Grading output has been constrained since #559.**
  The wrong claim reached three documents; it was inferred from `responseMimeType` present without a
  schema -- **one line read, twelve unread.** Struck, not deleted, per the precedent at
  `LazyTopper_Cost_Pricing_Analysis_v1_1.md:105-110`.
- **`checkSolution.cjs` is NOT forbidden by any gate** and has not been since Wave 3 PR-C1. Any
  document still saying otherwise is stale. The complete map is **three** `const FORBIDDEN = [`
  arrays, all under `lazytopper/scripts/ops/`: CONV (6), OVL (3), QP-OVL (4).
  **`ResultsScorecard.tsx` is still banned by BOTH C&I gates, so `BATCH-2` needs two amendments in
  ONE PR plus a from-scratch component suite** -- it has no component test today.

### 0c - PAY-1 IS BLOCKED ON ONE DECISION ONLY

Razorpay Phase 1 is **done and proven, not merely configured**: test keys generated then **rotated**
after being exercised; webhook registered and Enabled with its secret set; all three env vars in
Railway; and **verified by a live `POST /v1/orders`** that returned a real test order.
**The only blocker is the plan shape** -- one-time "till boards" vs recurring; the owner is taking a
day. **If one-time: no e-mandate, no Razorpay Subscriptions, and PAY-1 is roughly HALF the originally
scoped build** -- create-order, a webhook with signature verification and idempotency, and a
firebase-admin write to `subscriptions/{uid}`. `firestore.rules:117` already restricts browser writes
to `tier in {free, trial}`, **so only a server write can grant Premium.** The entitlement record needs
no redesign.

### 0d - A DESIGN CALL THE NEXT LANE MUST NOT UNDO

**`[FU-LEGAL-CONSOLIDATE-UNDER-ONE-ROOF]`.** The owner judges the public-landing footer harmful to a
designed page and prefers legal under one roof, reached from the avatar and the door. **Merged for
now; he verifies live, then relocates.** ** The compliance point is the COLLECTION point -- the
sign-up door, which already links and is pinned by a test.** The landing and pricing footers are
belt-and-braces. **Whatever the design becomes, the policy must stay reachable from the door before
the button is pressed.**

---

## PREVIOUS — 2026-08-04 (post-#601–#604, WAVE 5C). Superseded by the block above. NOTE: its section 0 scoped Wave 5D as ME-PROGRESS + NAME+LINK + BACKNAV, A LANE SET THAT NEVER RAN.

### 🛑🛑 0 · WAVE 5D — FOUR LANES, NOT SIX. OWNER-RULED.

**`ME-PROGRESS` and `NAME+LINK` were BUILT-READY but deliberately NOT merged in 5C — they HEAD 5D.**

1. **`ME-PROGRESS`** — converge `/me` onto one responsive `MeProgressPage`, deleting `DesktopMePage`
   and `MobileMePage`. **Its two merge gates are now SATISFIED** (`FORBID-4` #601 and `GATE-3` #602
   are both on trunk).
   - ⚠ **`App.tsx` is no longer a forbidden zero-diff — but `lane_overlap.mjs` `GATED_FILES` still
     holds it under OWNER REVIEW.** The lift changed the *protection*, not the review.
     `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]`
   - ⚠⚠ **THE SPEC'S §5 GATED-CTA PARAGRAPH IS OUT OF DATE.** It says gated CTAs *"will show their
     gates — that is correct behaviour."* True in July; **GATE-3 has since shipped the locked CTA.**
     `/me`'s Topic Hub and Full Mock CTAs must **MATCH GATE-3's shipped treatment**, read from trunk.
     ★ **The prototype is authoritative where it INVENTS (the progress surface — unchanged) and
     subordinate where it must MATCH (premium CTAs).**
   - **Authorities on disk:**
     `C:/Projects/LT-worktrees/_briefs/wave5c/LazyTopper_MeProgress_Redesign_Spec_v1.0_2026-07-24.md`
     and `.../MeProgress_Final_prototype.html` (SHA `6e78b572…`). ⚠ **The prototype has three names;
     `MeProgress Final.dc.html` exists NOWHERE. Give the lane the exact path.**
2. **`NAME+LINK`** — ⚠ **RUNS ALONE, zero other open PRs.** `AuthContext` is `vi.mock`ed in ~25
   files, every one a complete replacement, and its key set is pinned by **exact equality** — it
   fails on **addition**. Carries a live defect: **nothing links to `/sign-up`, so every account is
   created with no `displayName`.** Ship §1 even if §3 is blocked.
3. **`[FU-UPGRADE-SHEET-PRICING-BACKNAV]`** — **NEW, from this wave's live-verify.** *"See plans"*
   navigates to pricing, and **pricing's back button goes HOME**, carrying neither
   `state:{back,backLabel}` nor `?source=&returnTo=`. **A student two questions into a practice set
   who declines to buy loses their place.** ⇒ *the "this stopped working" failure GATE-2 exists to
   prevent, one screen later.* Belongs with GATE-3's follow-ups.
4. **Owner's pick** — PAY-1/PAY-2 remain blocked on Razorpay test keys **and** the plan-shape
   decision (one-time "till boards" vs recurring); `lib/*` deletion remains blocked on SCOUT-1.

### 🛑 0a · SYLLABUS DOCTRINE — CORRECTED THIS WAVE, DO NOT RE-LITIGATE

**`CLAUDE.md`:90's parenthetical was STRUCK** in this wave's handoff PR.

★ **THE GUARD BANS SUB-TOPICS, NOT CHAPTERS.** It matches the `subtopic:` field value, **exact and
full-string**, and has **no concept of a banned topicKey or filename**. **`Heredity`, `Mendel's
contribution`, `Laws of Inheritance` and `Sex Determination` are RETAINED and board-assessed** for
2026-27; it is the **Evolution** sub-topics that are excluded. **A filename that looks like a
doctrine violation (`heredity.pack1.ts`) is not one** — that misreading produced the phrase
*"banned-topic packs"* and cost a wave of confusion.
★ **`syllabusGuard.ts` IS 2026-27** (`year: "2026-27"` ×2, from the official CBSE PDFs). **It was
never on 2025-26.** Recorded so nobody re-asks.

⚠ **`[FU-SYLLABUS-TRUTH-IN-TWO-PLACES]`** (supersedes `[FU-SYLLABUS-GUARD-FORMATIVE-ONLY-BANK-BLINDSPOT]`)
— **`syllabusGuard.ts`'s `RULES` array is HARDCODED TypeScript and does NOT read
`cbse10Registry_2026_27.json`.** So 2026-27 syllabus truth lives in **two hand-maintained places, one
executable and one declarative, with NO test that they agree.** ★ **That is the defect** — not "the
guard forgot Motor/Induction"; the ~28 board-excluded-but-live questions are a **symptom**.
**Fix: make the guard DERIVE from the registry.** **Owner-ruled: log it, do not fix mid-wave, and do
NOT remove those questions by hand** — no executable rule bans them, so removing them would be
guessing in the opposite direction.

### 🛑 0b · TWO ENTITLEMENT RULINGS — RECORD, DO NOT "FIX"

- **Trial-period grading is INTENDED** — a marketing hook — **and still requires sign-in.** Not a defect.
- **`[FU-GATE3-SIGNED-OUT-GRADING-FAILS-OPEN]` is LATENT, not live.** The **server** fails open for
  unauthenticated callers (anon POST returns 400 from the handler, not 402), **but no student path
  reaches it** — the client login gate fires at every action CTA. **curl-only, capped 3/day by the
  anon cap, Gemini pennies, no revenue.** GATE-3's signed-out carve-out is still correct, for a
  different reason: it avoids showing 🔒 to a visitor who could sign in and use the feature.

---

## PREVIOUS — 2026-08-04 (post-#595–#598, WAVE 5B). Superseded by the block above.

### 🛑🛑 0 · THE ONE ITEM THAT IS NOT A CODE LANE — `BANK-1`, AND IT IS THE OWNER'S SUBJECT

⚠⚠ **`cbse10Registry_2026_27.json` IS THE AUTHORITATIVE SYLLABUS REGISTRY. These students sit the
2027 boards. `cbse10Registry_2025_26.json` IS THE WRONG FILE.** Owner ruling, 2026-08-04. **Anything
deriving syllabus scope from the 2025-26 file is deriving it from the wrong year.**

**`BANK-1` — RULED AND SPECCED, WAITING.** Four unimported science packs in `lib/shared-data`:
- ❌ **DELETE `heredity.pack1` and `magneticEffects.pack1`** — mismatched solution steps, **24 of 42
  boilerplate explanations.**
- ✅ **WIRE `heredity.pack2` and `magneticEffects.pack2`** — ~97 questions, sound.

> ⚠ **THIS CORRECTS AN EARLIER FRAMING, AND THE CORRECTION MATTERS.** SCOUT-1 flagged these as
> *"banned-topic packs on trunk"* against CLAUDE.md §5. **That framing was wrong: the content is IN
> syllabus for 2026-27.** The real defect was **solutions that do not match their questions.**
> ⇒ *A file name that looks like a doctrine violation is not one. The owner is the sole content
> authority and this is exactly why the ruling was his.*

### 1 · THE LANE QUEUE, IN ORDER
1. **`BANK-1`** — above. Content, owner-specced.
2. **`CI-DOCS`** — ▶ **ITS GATE IS NOW MET** (#595 and #596 merged and closed). Brief:
   `C:\Projects\LT-wave5b\specs\SUBAGENT_CIDOCS_docs_fast_path_v1.1.md`.
   ⚠ **It SPLITS, it does not TRIM** — a fast path for mid-wave docs PRs, **the full bar retained
   deliberately for the wave-closing one, because that is the project's ONLY integration run.**
   ⚠⚠ **TRIAGE `#599` FIRST** (dependabot, `actions/checkout` 5→7). It touches `.github/workflows/`.
   **`lane-overlap` matches EXACT FILE LISTS, so it collides only if `#599` touches
   `quality-gate.yml` itself — VERIFY THAT, do not assume either way.**
   ⚠ **Also wire SEC-1's two new `.cjs` suites into the CI chain** — they are green locally and
   **ungated in CI** because wiring needs `lazytopper/package.json`, which is CI-DOCS'.
   `[FU-SEC1-CI-WIRE-SERVER-TESTS]`
3. **`GATE-3`** — ONE lane: FORBID-3's amendment **+** the `useSubscription` test-setup change **+**
   the `entitled` prop **+ the parents that pass it** (`MockViewGate`, `PracticeLimitGate`,
   `RequireAuth`, `TrialBanner`, `App.tsx`). **Any subset ships a locked CTA nothing renders — that is
   MOUNT-NOT-LIVE, the defect the owner caught with `MentorSolveDrawer`.** **`#598` is NOT reopened.**
4. **`NAME+LINK`** — `[FU-AUTH-SIGNUP-ROUTE-UNREACHABLE]`, below. Small, and it is corrupting real
   student data every day it stands.
5. **`ME-PROGRESS`**, then the payment lanes.

### 🛑 2 · `[FU-AUTH-SIGNUP-ROUTE-UNREACHABLE]` — FOUND BY USING THE PRODUCT, NOT BY A GATE
The name field **exists and works** (`Login.tsx:1943`, rendered when `intent="create"`). **But nothing
in the product links to `/sign-up`** — it appears in exactly **two** places on trunk: the `App.tsx`
route and a comment. **`/login` is linked from eight files.**
⇒ **Every student enters via `intent="signin"`, which has no name field, so EVERY NEW ACCOUNT IS
CREATED WITH NO `displayName`** — putting a raw email address into the six surfaces PR-B2 fixed.
> ★ **AUTH-3 correctly PRESERVED the field; the one-door redesign ORPHANED the route to it.**
> **`MOUNT ≠ LIVE`, one layer up: the component is reachable, the page is not.** Neither lane was
> wrong on its own terms, and no gate can see a route nobody links to.

### 3 · THREE MORE NEW FINDINGS — none blocking
- **`[FU-GRADING-LATENCY-17S]`** — a production `check-solution` took **17.3s**, another 7.0s (owner
  HAR, 139 requests). ⚠ **The batch-grading arc makes this worse before better.**
- **`[FU-COOP-BLOCKS-POPUP-CLOSED-CHECK]`** — four `Cross-Origin-Opener-Policy would block the
  window.closed call` errors per session. ⚠ **NOT SEC-1's doing** — the header was present the previous
  morning. COOP `same-origin` conflicts with Firebase `signInWithPopup`, i.e. **Google sign-in.**
  Works today; **the kind of thing a browser update breaks.**
- **`[FU-USER-PROGRESS-BARE-PATH-STILL-ANSWERS]`** — `/api/user/progress` (no subpath) returns **400,
  not 404**, while `/xp` and `/streak` correctly 404. **Something still answers the bare path; the
  cofounder explicitly declined to guess what.**
- ✅ **`[FU-DBSYNC-CLIENT-CALLERS-DEAD]` — CONFIRMED LIVE.** The owner's HAR shows exactly one failure
  in 139 requests: `POST /api/user/progress/focus → 404`. **PG-1's prediction, observed.** The client
  still calls deleted routes every session. **The server side is gone; the client still calls it.
  This is NOT "the Postgres layer is removed."**

### 4 · ⚠ THE BUILD-PATH RULE THAT NOW BINDS EVERY LANE
`#593` deleted the stale `lazytopper/package-lock.json` — **Dependabot alerts 179 → 103, Clerk 3 → 0,
finishing the June teardown.** Vercel's install command became `pnpm install --frozen-lockfile`, so
**all four build paths — Docker, CI, Vercel, local — now install exactly what the lockfile pins.**
⇒ ⚠⚠ **A MANIFEST CHANGE WITHOUT A MATCHING `pnpm-lock.yaml` UPDATE NOW FAILS THE VERCEL BUILD TOO,
not just CI.**

### 5 · ⚠ REISSUE THE FORBIDDEN MAP — it is stale
`LazyTopper_FORBIDDEN_MAP_2026-08-02.md` was derived at `c557059`. **CONV no longer lists
`SolutionChecker.tsx`** (FORBID-1 landed after); every other row still matches. **SEC-1 and GATE-2
re-derived it independently and agreed — which is why the staleness cost nothing.**
⇒ **Reissue at current trunk WITH THE DERIVATION SHA ON ITS FACE.** *A map is a derived value, and a
derived value outlives the facts it came from.*

### 6 · STILL OWED, OWNER-ONLY
- ⚠ **`og-image.png` RE-EXPORT.** The SVG rendered `lazytopper.app` **as text inside the image**; the
  PNG is untouched and **no text scan can verify a bitmap.** If it was exported from that SVG, **every
  share card still carries the dead domain.** `[FU-OG-IMAGE-PNG-REEXPORT]`
- **`[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]`** — verification mail lands in Spam. Needs a Firebase
  custom action-handler domain on `lazytopper.com` + authenticated SMTP. **Pre-launch blocking, and no
  agent can close it.**

---

## NEXT — 2026-08-03 (post-#579–#582, WAVE 5A). Read this block first.

**Four PRs on trunk: #579 #580 #581 #582.** The P0 server-side paywall is closed and owner
live-verified; the auth door is one door with a verified email and owner live-verified. The wave's
own subject is recorded in `CURRENT_STATE.md`: **a merged, green, CORRECT fix that never shipped —
`MERGED` and `DEPLOYED` are different states.**

⚠ **The Wave 4 and Wave 3 blocks below are NOT superseded.** The `[FU-FOUNDING-FLAG-NOT-WIRED-TO-MONTHLY-INLINE]`
HARD GATE is still in force, unchanged, and is deliberately not restated here — read it there.
*(Two copies of a doctrine can drift; the board's own Standing Rule 2 prefers one authoritative entry.)*

### 🛑🛑 0 · BEFORE ANYTHING ELSE — `MERGED` IS NOT `DEPLOYED`

**Vercel (frontend) and Railway (backend) build independently from the same trunk, and this wave they
diverged for two hours.** A merge confirms neither. **Any change spanning both must have BOTH
deployments confirmed before it is called verified — by asking the running system, not by reading a
dashboard.** Fetch the live bundle and grep it; hit the live endpoint.

⚠ **Vercel "Redeploy" rebuilds the ORIGINAL commit, not the branch tip** — it cannot pull in a newer
merge and *it looks like it should.* ⚠ **Branch protection means a Deploy Hook is the ONLY manual
trigger** (a direct push to trunk is correctly refused, `GH013`). The owner has created one and will
rotate it. → `[FU-DEPLOY-SPLIT-RAILWAY-VERCEL-DIVERGENCE]` · `[FU-DEPLOY-HOOK-IS-THE-ONLY-MANUAL-TRIGGER]`

### 🛑 1 · THE TWO LAUNCH-BLOCKING ITEMS. Neither was visible to any gate, and they are not the same kind of work.

1. ⚠⚠ **`[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]` — the paywall is selling four things the product
   no longer ships.** The "Choose a Plan" modal lists **Smart Study Planner, Daily Focus Mix, Full
   Analytics Dashboard** and Chapter Hub. **Study Plan, Daily Mix and Dashboard are RETIRED
   SURFACES** — the standing rule is that a reference to them is evidence of *deadness, not
   liveness*. **A student is being asked for ₹599 against them.** *This is the anti-fabrication
   doctrine applied to commerce.*
   > ⇒ **THE FIX BELONGS IN GATE-2's SPEC, NOT A SEPARATE LANE.** GATE-2 replaces this modal;
   > a separate lane would collide with it on the same file and land the wrong one second.
2. ⚠⚠ **`[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]` — OWNER / DNS WORK, NOT AN AGENT LANE.** The
   verification mail lands in **Spam**; Gmail cites prior spam reports against
   `lazzyy-topper.firebaseapp.com`. **A domain-reputation problem sitting on a BLOCKING gate:** a new
   email/password student cannot enter until they click a link in a folder they will not open.
   **Google and phone bypass it, so it is invisible in owner testing while affecting every email
   student.** Fix = a Firebase **custom action-handler domain on `lazytopper.com`** + authenticated
   SMTP. **Pre-launch blocking. No agent can close this.**

### 2 · WAVE 5B — THE PLAN. **NOT DISPATCHED.** Nothing below is a live instruction.

1. **GATE-2 — the upgrade sheet.** Carries `[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]`,
   `[FU-UPGRADE-MODAL-NO-BASIC-EXIT]`, `[FU-GATE-COPY-STILL-READS-AS-ERROR]`.
   > ⚠⚠ **IT MUST *EXTEND* GATE-1's EXISTING 402 BRANCH IN `src/ai/aiClient.ts`, NEVER ADD A SECOND
   > BESIDE IT** — the second silently wins, and nothing gates that.
   ⚠ **Its spec must carry GATE-1's two-stage tier derivation VERBATIM** (`repair` first, `expiry`
   second). **The client half must not re-derive it differently**, and both directions are wrong: an
   elapsed `tier:"trial"` is effectively free, and an unelapsed `{tier:"free", plan:"trial_7day"}`
   with a server-pinned start is effectively trial. **FORBID-1 has cleared its `SolutionChecker`
   blocker.**
2. **META-1** — `<link rel="canonical" href="https://lazytopper.app/">` is live **right now** on a
   domain never owned, and is suppressing search presence today.
3. **PG-1 — delete the dead Postgres layer.** Server-only. ⚠ **The `server/index.cjs` unwiring of its
   seven handlers must be in the SAME ATOMIC PR** or the server fails to boot on `require`. Its
   `DATABASE_URL` half is owner infra. `/api/user/progress` **503s on every real session** —
   confirmed in a production HAR, not inferred.
4. **`quality-gate.yml` stale counts — its OWN small PR.** ⚠⚠ **DO NOT TOUCH `CLAUDE.md`. It is
   CORRECT.** Three lanes this wave reported §6a as stale and **all three were remembering, not
   looking** — the file has read `SIX suites / 190 checks` since #572. The stale copy is
   `.github/workflows/quality-gate.yml` (`5 suites, 175/175` above a step reporting 28/190, and
   `59 suites` where CI runs 96 files). **A workflow is not a doc, so it cannot ride a handoff PR.**
5. **CI-DOCS** — now unblocked; SUPPLY-1 and FORBID-1 are both merged. ⚠ **It SPLITS, it does not
   TRIM:** a fast path for MID-WAVE handoffs, **the full bar retained deliberately for the
   WAVE-CLOSING one** — see §4.

⚠ **BATCH-1b remains BLOCKED** behind `FORBID-2` (QP-OVL bans `quickPracticeSessionService.ts` as a
zero-diff FORBIDDEN entry). **Write `FORBID-2` alongside it, not a wave early** — *lifting a ban a
wave before the need is the same error as the blanket ban.*

⚠ **TRIAGE THE FIVE DEPENDABOT PRs (#583–#587) BEFORE ANY `package.json` OR WORKFLOW LANE.**
`lane-overlap` fails on a shared path against **every** open PR. They do not touch `handoff/**`, so
this handoff was clear — but item 4 and item 5 above **will** collide with them.

### 🛑 3 · OWNER ACTIONS — and the list is NOT what the SUPPLY-1 spec said

⚠⚠ **`#579` DOES NOT CLOSE THE SUPPLY-CHAIN ITEM.** `dependabot.yml` configures **VERSION** updates
only (*"a newer release exists"*). It **cannot** configure **SECURITY** updates (*"a CVE was
published against what you use"*). **Until the two toggles below are on, #579 delivers routine bumps
and NO vulnerability response at all.**

- ⚠ **Settings → Code security → enable Dependabot ALERTS.**
- ⚠ **Settings → Code security → enable Dependabot SECURITY UPDATES.**
- *(Lower value: secret-scanning non-provider patterns, secret-scanning validity checks.)*

★ **Secret scanning and push protection — which the spec named as the outstanding pair — were ALREADY
ENABLED.** ⇒ **recorded as a SPEC ERROR CORRECTED BY THE LANE, not as a lane finding.** *A checklist
derived from memory is wrong in both directions at once, and the "already done" half is the more
dangerous one, because it reads as confirmation.*

- **Rotate the Vercel Deploy Hook** when convenient; it is currently the only manual deploy trigger.
- **`[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]`** — the DNS/SMTP work in §1.2 above.

### ★★ 4 · THE WAVE-CLOSING HANDOFF PR TAKES THE FULL CI BAR — BY DESIGN, NOT BY OVERSIGHT

**`CI-DOCS` is not built, so no fast path exists — and even once it ships, this PR keeps the full
bar.** A product PR's CI runs against **its own base**, so lanes built in parallel are **never
compiled together until something merges both.**

> ★★ **THE WAVE-CLOSING HANDOFF PR IS THIS PROJECT'S ONLY INTEGRATION RUN.** Precedent: #574 and
> #575 — two P0 fixes — reached production having **never been tested together**; their runs showed
> **1,091** and **1,088** tests, and the docs PR that followed showed **1,097**, a number neither
> could produce.

⇒ **Read the vitest and matrix counts on that PR as the integration SIGNAL, and quote them.** If it
goes red, that is the integration run doing its job.

### ★★ 5 · METHOD RULES THIS WAVE ADDED OR HARDENED — in force now

- **`MERGED` IS NOT `DEPLOYED`, AND TWO TARGETS CAN DIVERGE.** See §0. **Ask the running system.**
- ★★ **A GREEN CI RUN IS EVIDENCE ONLY ABOUT WHAT IT EXECUTED — and its sequel: A MERGE IS EVIDENCE
  ONLY ABOUT THE REPOSITORY.** GATE-1's 43-test suite was invisible to CI, proven by a grep returning
  zero **with a control on an already-wired sibling in the same log.** *"The count changed" is not
  "the count changed because of my edit."*
- ★★ **GIT-BASED RESTORE VERIFICATION IS INVALID ON A FILE THE PR IS ITSELF ADDING.**
  `git checkout --` and `git diff` are **both no-ops on an untracked file** — three mutations
  accumulated silently while a harness printed `RESTORE VERIFIED: YES`. **Use byte snapshots and
  SHA comparison, and say HOW you verified, not that you did.**
- ★★ **TWO WORKFLOWS FIRE PER PR, AND "LANE OVERLAP" GATES NOTHING.** Reading a green tick off the
  wrong run learns nothing. **Quote the Quality Gate run id.** → `[FU-CI-TWO-WORKFLOWS-PER-PR]`
- ★★ **A STALE VALUE'S BAN LIVES WHERE YOU LOOK FOR IT, NOT WHERE YOU REMEMBER IT.** Three lanes
  mis-cited `CLAUDE.md`, which had been correct since #572. The one lane that **enumerated** found
  the real copy in a workflow nobody had named.
- ★★ **AN EFFECTIVE TIER IS A DERIVATION, NOT A FIELD.** Reading the raw `tier` would have served
  every expired trial **and** locked out every mid-trial student — both failure directions at once,
  from one plausible reading of a spec.
- ★★ **EVERY ABSENT ASSERTION NEEDS A POSITIVE CONTROL THAT RENDERS THE THING.** Renaming a CSS class
  made a negative assertion go vacuous **and still pass**; only the control caught it.
- **A SPEC ERROR CORRECTED BY A LANE IS RECORDED AS A SPEC ERROR**, never absorbed as a lane finding.
  *The distinction is what stops the wrong version being carried forward.*
- **AN INSTRUCTION THAT IS WRONG IS RECORDED AS WRONG.** The `stop before commit` line in every Wave
  5A spec was contradicted by six passages in the same documents. **A silently-correct value teaches
  nothing; the next spec author writes the same line again.**
- **A SUBAGENT WRITES ITS FULL REPORT TO DISK BEFORE COMPOSING ITS RETURN MESSAGE** — standing since
  Wave 4, observed by all five lanes this wave. ⚠ Note the harness **refuses the `Write` tool for
  `.md` from a subagent**; only the shell works.

---

# (previous) Updated: 2026-07-31 (post-**#566–#575 — WAVE 4**, ten PRs under a controller + subagent model. Trunk `fcdbfa65`. TWO owner live-verifies owed, one of which is the only proof of the mobile hotfix. Three lanes are SPECCED AND DELIBERATELY NOT STARTED — see below.)

## NEXT — 2026-07-31 (post-#566–#575). Read this block first.

**Ten PRs on trunk: #566 #567 #568 #569 #570 #571 #572 #573 #574 #575.** A launch-blocking P0 (no new student could get a trial) and a live mobile crash are both fixed and **both owe a live-verify**. The wave's own subject is recorded in `CURRENT_STATE.md`: **four guards and gates that reported success while inspecting nothing.**

⚠ **The Wave 3 block below is NOT superseded. Its `[FU-FOUNDING-FLAG-NOT-WIRED-TO-MONTHLY-INLINE]` HARD GATE is still in force, unchanged, and is deliberately not restated here** — read it there. *(Restating it would create two copies that can drift; the board's own Standing Rule 2 prefers one authoritative entry.)* **In one line: DO NOT SET `FOUNDING_OFFER_OPEN = false` until the MONTHLY-INLINE lane has landed.**

### 🛑 1 · OWNER LIVE-VERIFY QUEUE — the top of the list, and one item is not substitutable

Two merged fixes are **not closed** until a human runs them on the real product. **No gate can settle either**, and for #575 that is a structural fact, not a scheduling one.

1. **#574 — a FRESH SIGNUP lands on `tier: "trial"`.** The P0 was that every new student silently downgraded to free.
2. **#574 — an EXISTING BROKEN ACCOUNT repairs to `"trial"` on next open, with `trialStartDate` UNMOVED.** The repair is read-back normalisation and must be seen to self-heal. ⚠ **`trialStartDate` unmoved is the assertion** — if it moves, the immutability SEC-2 exists to enforce has been broken by the repair.
3. ★★ **#575 — mobile `/browse` as a RETURNING student, WITHOUT CLEARING SITE DATA.** Close the tab, reopen, and let Firebase restore the session from IndexedDB.
   > **THIS IS THE ONLY PATH THAT PROVES #575.** A fresh sign-in NAVIGATES to `/browse` with the user already present and **never crosses the boundary that crashes.** Clearing site data does not "reset the test" — **it removes the test.**

★ **And the general rule this wave earned: LIVE-VERIFY MEANS BOTH SURFACES, AND AT LEAST ONE SESSION WITH EXISTING STATE.** Every automated test in this repo starts from clean state, so a bug that needs accumulated state is invisible to all 1,082 of them.

*(Carried, still owed: **D1 (#557)** — `hasPhoneLinked` against a real phone-linked Firebase account. → `[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`.)*

### ★★ 2 · THREE LANES ARE SPECCED, FILES ON DISK, AND DELIBERATELY NOT STARTED

**`AUTH-3`** (`SUBAGENT_AUTH3_one_door_verified.md` — one door + blocking email verification), **`BATCH-2`**, and **`NAME+LINK`**. All three have instruction files written and ready in `C:\Users\Chetan\OneDrive\Desktop\diff\`.

> ★★ **WHY THEY WERE NOT STARTED — THIS IS A DECISION, NOT AN OVERSIGHT. Read it before assuming the wave ran out of things to do.**
>
> **Starting a lane at 40% remaining context and stranding it mid-way is the exact failure this operating model exists to prevent. It has already cost this project three agents.** A half-built lane is worse than an unstarted one: it leaves a diff on disk that the next reader will find and trust, and its author is gone before anyone can ask what it was doing. ⇒ **the three lanes were left whole, specced, and unstarted for a FRESH controller with full context.**
>
> ★ Corroborated twice in the written record: two Wave 3 agents at ~4–7% remaining context **each mislabelled their own PR number**, reporting the other's — *"the failure was not competence, it was an agent holding the plan while spending its last context on evidence."* And this wave, a blocked lane (BATCH-1) **wrote nothing, gated nothing and removed its worktree**, which is the correct discipline: *no half-built diff left for someone to find and trust.*

**`AUTH-3` is unblocked and is the natural first pick.** Its deciding empirical question is **answered**: `accounts:signUp` against an existing address returns **`EMAIL_EXISTS` (HTTP 400)**, so a create attempt is still distinguishable even though `signInWithEmailAndPassword` returns the ambiguous `INVALID_LOGIN_CREDENTIALS` for both wrong-password and no-account under Email Enumeration Protection. ⇒ **the flow INVERTS: sign-in first, then create-as-probe**, and because step 2 is a **COMMITMENT rather than a probe**, the *"no account found — create one?"* confirmation is **dropped** — it would disclose non-existence and reopen by hand the leak Enumeration Protection closes.
⚠ **Do NOT build against `LazyTopper_Auth_Onboarding_Spec_LOCKED.md` §3.2 — it is superseded** by the above. ⚠ **STILL OPEN for that lane:** whether `App.tsx`'s zero-diff freeze can accommodate a route change; if not, the `/app/sign-up` redirect must live inside the existing element.
⚠ **Two prototype files exist and they are different artefacts.** The authority for this arc is `LazyTopper_OneDoor_auth_prototype.html` (title *"One door"*). `LazyTopper_Auth_Onboarding_prototype.html` is an **earlier, different** prototype. **And remember the wave's own lesson: the prototype is not the product** — it is authoritative when a lane INVENTS visual language, wrong when a lane must MATCH it.

### ✅ 3 · `BATCH-1` — **RULED AND RE-DISPATCHED.** No longer blocked. Its findings must not be re-derived.

Per-question images in the batch grader. The original holder returned **BLOCKED with zero files written**, and **its worktree and branch are gone — so its report IS the entire lane.** It lives on disk:

- **The report:** `C:\Users\Chetan\OneDrive\Desktop\diff\report-batch1-2026-07-31.md`
- **The rulings applied to it:** `C:\Users\Chetan\OneDrive\Desktop\diff\SUBAGENT_BATCH1_RULINGS_2026-07-31.md`

**★ RULING A — transport: OPTION A.** Widen the allowlist by **exactly `lazytopper/src/ai/aiClient.ts`**, for an **additive `uploads?` field**. (B) was rejected on the lane's own argument: `handleJsonResponse<T>` is module-private and **owns the shared error contract**.
> ★★ **A SECOND, DIVERGING TRANSPORT TO ONE ENDPOINT IS A WORSE OUTCOME THAN ANY ALLOWLIST BREACH.** The allowlist exists to bound blast radius; a duplicated transport *creates* blast radius that outlives the lane. ⇒ when the two conflict, widen the allowlist by the minimum and say so — do not route around the file.

**★ RULING B — M2 is REWRITTEN, not dropped.** Mutate the map **DIRECTION** so the test can fail.
> ★★ **A GUARANTEE THAT HOLDS STRUCTURALLY STILL NEEDS A TEST — not to prove it holds today, but to FAIL WHEN SOMEONE REMOVES THE STRUCTURE THAT MAKES IT HOLD.** "It is structurally true, therefore untestable" is the reasoning that ships a test which could never go red, or no test at all. The structure is the thing under guard.

**★ THE THREE FINDINGS ARE ADOPTED, NOT RE-OPENED, AND ARE DELIBERATELY NOT RESTATED HERE.** They are recorded once, in `OPEN_QUESTIONS_AND_FOLLOWUPS.md` — `[FU-BATCH1-BATCH-PATH-BLAST-RADIUS]`, `[FU-BATCH1-M2-STRUCTURAL]`, `[FU-BATCH1-DETECT-THIRD-IMAGE-SITE]`, plus the "zero schemas need extending" note. **Read them there.** *(Two copies of a doctrine can drift; the board's own Standing Rule 2 prefers one authoritative entry — and this section previously WAS the second copy.)*

> **Owner's assessment, 2026-07-31, recorded once:** *"The best blocked report this project has produced. It wrote zero lines and is worth more than most merged PRs: three spec defects found, one of which would have shipped a test that could never fail."*

### ★ 4 · THE COST / LEGAL ITEMS THAT ARE NOT CODE LANES

- **`[FU-RETENTION-ALREADY-MINIMAL]` — the retention question is ANSWERED and NO DELETION POLICY IS OWED.** **No answer image is persisted anywhere**; Firestore holds only `SessionRecord` summaries. ★★ **The gap runs the other way: the graded-sheet download is rebuilt from a LOCAL cache, so a student loses their sheet on eviction without ever choosing to.** ⇒ **the actionable item is "offer the PDF AT GRADING TIME"**, not a deletion policy.
- **`[FU-RETENTION-UNBOUNDED-UNBUDGETED]`** — ⚠ **storage is NOT the driver.** The concern is **READ VOLUME at scale**, and nobody has modelled it. Belongs in `LazyTopper_Cost_Pricing_Analysis_v1_1.md`, **not a code lane**.
- **`[FU-NO-DELETION-OR-EXPORT-PATH]`** — no account deletion and no data export. **DPDP Act, minor users, priority one on the external audit brief.** ★ Minimal retention **lowers the deletion exposure and does not answer export** — and *"offer the PDF at grading time"* is the nearest thing to an export path the product would have.
- **`[FU-TRIAL-DAYS-LOST-TO-P0]`** — the P0 repair restores the flag but **not the lost days**. Owner reset the affected handful in the Console. ⚠ **At volume this needs a script, and that script MUST go through a SERVER/ADMIN path, never a client one.**

### ★ 5 · THE GUARD BACKLOG — what this wave fixed, and what it left named

**Closed:** `[FU-GUARD-1-A]`, `[FU-GUARD-1-B]` (#568 — CI-grep-proven, linux verified by execution), `[FU-MOJIBAKE-GATE-CWD-BLIND-SPOT]` and `[FU-MOJIBAKE-SPECIMEN-LINES]` (#570 + #571, **resolved by SCOPING**), the CLAUDE.md half of the stale-count problem (#572), `[FU-GUARD-3-TOOLINGDOCS-MODE]` (closed by avoidance — ★ *a mode invented to let one PR pass its own guard is a bypass with a nicer name*).

**Still open and unassigned:** `[FU-ESLINT-UNRUNNABLE-IN-WORKTREE]` (★ **the highest-value one — `react-hooks/rules-of-hooks` is the rule that would have caught #575 and it currently protects nothing**), `[FU-GUARD-1-C]` (`agent3_uiux_guard` wired nowhere), `[FU-GUARD-3-POLICY-MODES-UNASSERTED]`, `[FU-GUARD-3-MOJIBAKE-REGEX-DUP]`, `[FU-GUARD-3-CWD-FRAMED-GATES]`, `[FU-GUARD-3-CI-COMMENT-STALE]`, `[FU-GUARD-3-MOJIBAKE-CLEANER-FRAME]`, `[FU-GUARD-2-TOPOLICYFRAME-COPY]`, `[FU-GUARD-2-PKGJSON-CLASSIFY-NONDETERMINISM]`, `[FU-GUARD-2-ROOT-GITIGNORE-UNCHECKED]`, `[FU-GUARD-2-MATRIX-CHAIN-MASKS-DOWNSTREAM]`, and new this wave `[FU-SQUASH-CARRIES-REBASED-BASE]` and `[FU-DEV-BROWSER-CANNOT-REPRO-AUTH-TIMING]`.

### ★★ 6 · GIT AND PROCESS DISCIPLINE — added by this wave, in force now

- **NEVER READ FROM OR PUSH FROM THE SHARED CHECKOUT `C:\Projects\Lazytopper-Production`.** A push from it dropped two merged PRs on 2026-07-30. **Every lane cuts its own worktree from a freshly derived trunk SHA** (CLAUDE.md §2a), and that is now a push rule as well as a work rule.
- ★★ **AND IT APPLIES TO THE CONTROLLER TOO, NOT ONLY TO SUBAGENTS.** This wave a controller told **three separate lanes** that `handoff/WAVE_STATE_WAVE3_ARCHIVE.md` was *"untracked scratch that exists only in the shared checkout."* **It is tracked on trunk** — it reads as `??` there only because that checkout is stale. Nothing was damaged (all three lanes left it alone, and the third checked and reported the claim false), **but a repo fact was asserted three times without being checked.** ⇒ **A controller reads git metadata rather than product source, and git metadata from a stale checkout is exactly as wrong as stale source: `git status` there reports a TRACKED file as UNTRACKED — a false negative that looks like a fact.** ★ Same checkout as the force push, and as Wave 3's stale `firestore:rules` deploy: **three incidents, one root, across two waves.**
- ★★ **REQUIRE EVERY SUBAGENT TO WRITE ITS REPORT TO DISK BEFORE COMPOSING ITS RETURN MESSAGE — NOW A STANDING INSTRUCTION, NOT A RECOMMENDATION.** A return message is the **only copy**, so a lost relay is a lost report — Wave 3's EV-1 lane has **no report at all**. ★ **And it now has its NEAR-MISS: BATCH-1's report survived THREE FAILED RELAYS and was nearly lost with its worktree** — the worktree and branch are gone, so that one file is the whole lane. *A near-miss is the version people act on; a recommendation is the version they read.* **Report first, then summarise.** → `[FU-SUBAGENT-REPORT-TO-DISK-BEFORE-RETURN]`
- ★ **RECONCILE THE MERGE-BASE DIFF AGAINST THE PR'S DECLARED FILE LIST BEFORE MERGE** — `gh pr view <n> --json files` versus `git diff --name-only <merge-base>..<head>`. **Nothing does this today**, which is how #566 declared four files and landed thirteen. → `[FU-NO-MERGE-BASE-FILELIST-RECONCILE]`
- **`--force-with-lease` IS NOT PROTECTION AGAINST YOUR OWN STALE BRANCH.** The lease asks only whether the remote moved since **your last fetch** — a fetch seconds earlier satisfies it. **It guards against someone else's push and nothing more.**
- **READ THE EXEMPTIONS BEFORE THE SETTING.** A protection with a bypass is only as strong as its bypass list. The branch ruleset is now *"For pull requests only."*
- **A FRESH SHA IS NOT A GROWING HISTORY.** After any merge you are told landed, verify **ancestry AND a content-path `git log`**. ⚠ **Squash gotcha:** `merge-base --is-ancestor` on a PR **head** reports *not-ancestor* for a squash-merged PR — **the content-path check is authoritative.**
- **AFTER ANY FORCE PUSH, AUDIT THE FILE LIST OF THE NEXT SQUASH MERGE** against what that PR claims to change. A squash diff is computed against the base at **merge** time, not the base the branch was built on. → `[FU-SQUASH-CARRIES-REBASED-BASE]`
- **A CI RUN ID IS BOUND TO A COMMIT, NOT A PR.** Re-derive from the current head; a run captured before a rebase verifies a tree that is not the one being merged, **and it looks like proof.**
- **NEVER RECONSTRUCT AN FU BODY FROM ITS ID.** If you hold only an id, record the id and mark the body not recovered. **A plausible-but-wrong FU is harder to detect than a missing one** — it gets cited.
- **CITE BY QUOTE OR SYMBOL, NEVER BY LINE NUMBER.** A line reference is a derived value nothing re-checks.
- **A CONTROLLER AMPLIFIES.** Pass a subagent's finding through **with its provenance intact** — *"the subagent reports X"* is not the claim *"X"*. When one is retracted, check whether the amplified version reached the repo, the state file, or a dispatched instruction.
- **A SUBAGENT THAT ENDS ITS TURN WHILE "WAITING" HAS ENDED THE LANE.** Block on the run, or return with `CI: IN FLIGHT, not read` and every other line filled in. **A report with one gap beats another cycle.**
- **RE-DERIVE TRUNK BEFORE EVERY DISPATCH *AND* BEFORE EVERY DECISION REQUEST.** The model file said "every dispatch"; that is insufficient as written — a controller asked the owner to approve work that had already landed. **A state file is only as fresh as its last re-derive.**
- ⚠ **`scope:guard --mode docs` for a handoff PR.** The bare form now auto-detects correctly since #571 (`mode=auto:docs, lanes=docs`) — run both; it is a free confirmation. **`scope:guard` runs BEFORE `git add`** (it reads the working tree); the `base...HEAD` matrices run **AFTER** committing.
- ⚠ **A green `check:mojibake` says almost nothing about a `handoff/` file.** Scan your own added lines with the scanner's own regex **extracted from source, not re-typed**, and **inject a sequence to prove it fires.** Report `ADDED_LINES=n MOJIBAKE_HITS=0 CONTROL_INJECTED_DETECTED=true`.
- ⚠ **DO NOT "TIDY" THE 8 MOJIBAKE SPECIMENS in `handoff/`, and do not re-enforce that tree.** They are quoted examples inside lessons about mojibake. **`[FU-MOJIBAKE-SPECIMEN-LINES]` is RESOLVED BY SCOPING**, and the code comment in `check-mojibake.cjs` says so.

---

## NEXT — 2026-07-29 (post-#557–#563). Read this block first.

**All three client-side routes to free premium are closed IN PRODUCTION** — verified by reading the deployed rules and a fresh student's document in the Firebase Console, not by reading trunk. The grader's blanket ban is now 32 targeted tests plus a constrained output schema; the boundary guard can finally see the whole repo.

### ★★ HARD GATE — `[FU-FOUNDING-FLAG-NOT-WIRED-TO-MONTHLY-INLINE]`. BLOCKS A BUSINESS ACTION.

**★ DO NOT SET `FOUNDING_OFFER_OPEN = false` UNTIL THIS LANE HAS LANDED.**

This is recorded here, and not only on the FU board, on the owner's ruling: it is the one
open item that can make the live product contradict its own published pricing, and it is
triggered by a **business** decision rather than by a code change — so it must be visible
to whoever makes that decision, not only to whoever reads the board.

Flipping `FOUNDING_OFFER_OPEN` to `false` does **not** repoint `MONTHLY_INLINE`, which is
hard-bound to the founding rate in `lazytopper/src/config/pricing.ts` (it is a template
literal over `PRICE_MONTHLY_FOUNDING_DISPLAY`, with no reference to the flag) and rendered by
`PracticeLimitGate` ("Unlock unlimited practice for …") and `MockViewGate` ("Unlock
unlimited mock tests for …"). The day the founding cohort is closed, those two gates keep
quoting the founding monthly price while the pricing page quotes the list price — the
product contradicting its own published packaging **at the moment of upgrade intent**,
which is the exact defect PR-G2a existed to fix.

**THE FIX:** `MONTHLY_INLINE` should **DERIVE** from `FOUNDING_OFFER_OPEN` rather than
being hard-bound. The two gates then read the correct value with **no change to their own
files** — they import nothing else from the module. It is still not a one-line change:
⚠ **the doc comment on `MONTHLY_INLINE` claims "this one line is the entire switch" and
that claim is false.** `pricing.guard.test.ts` pins the binding to the founding tier
(`expect(MONTHLY_INLINE).toBe(...PRICE_MONTHLY_FOUNDING_INR...)` and
`.not.toContain(String(PRICE_MONTHLY_LIST_INR))`), so the change reaches beyond
`pricing.ts` and must correct that comment too. *(Checked: neither gate has a test file of
its own, so `pricing.guard.test.ts` is the only pin.)* It is its own small lane, named
**MONTHLY-INLINE**.

Found by **AUTH-1 (#566)**, which correctly refused to widen its own scope. Harmless while
the offer is open; fires exactly once, at the worst moment. Sits alongside
`[FU-PRICING-FOUNDING-COHORT]` below — that one is the *closing mechanism*, this one is the
*consequence of closing*; neither substitutes for the other.

### ★★ THE LANE THAT ALMOST FELL THROUGH TWICE — TAKE IT FIRST

**`[FU-GUARD-1-A]` + `[FU-GUARD-1-B]` — ONE SMALL COMBINED LANE. Both HIGH. Both need `lazytopper/package.json`, which NO lane's allowlist covered — which is exactly how they slipped the first time.** They came back *inside* GUARD-1's report and went to the FU board rather than to this queue. They are named here so that cannot happen a second time.

- **`[FU-GUARD-1-A]` (High)** — `repo_boundary_acceptance.mjs` still enumerates with `cwd=lazytopper` and keeps a **stale private copy** of `classifyFile`. **It audits 1 of 13 top-level trees.** Fix: enumerate from the git root, import the real `classifyFile` instead of the drifted copy, and wire it into the matrix. *(Either bug alone shows red; the blind spot masked the stale copy, so it reported green on a policy it never fully evaluated.)*
- **`[FU-GUARD-1-B]` (High)** — `scope_guard_blindspot_acceptance.mjs` is **not wired into CI**.

★★ **GUARD-1's protections are REAL but UNENFORCED until this lands** — and that is an instance of GUARD-1's own doctrine: **a guard nothing runs is not a guard.** This is not speculation: grepping #560's 4,076-line CI log for `blindspot|repo_boundary|agent3_uiux|scopeGuard|scope:guard` returned **0 matches**. CI executed none of the five files that PR changed. It was merged on the local run, with eyes open, on the understanding that these two follow-ups close the gap.

**Recommended shape: one lane, both files plus the `package.json` wiring.** `[FU-GUARD-1-C]` (agent3's three rotted checks + the zero-passing ceiling, then wire green) can ride along or follow; `[FU-GUARD-1-D]` (frame collision — six paths classify correctly *by accident*) is latent and can wait.

### ★ ONE LIVE-VERIFY OWED
**D1 (#557)** — `hasPhoneLinked` against a **real phone-linked Firebase account**. EV-1's screenshots used a **seeded local session**, so the render path, copy and responsive layout are proven and the suppression path is not. No picture and no unit test can settle it. → `[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`.
*(C2's and SEC-2's live-verifies are DONE and closed.)*

### Owner-set order after that

1. **`[FU-VERIFY-UID-ON-AI-ENDPOINTS]` — the remaining half, and it is the honest limit of this wave.** All three client-side self-grant routes are closed, but **the API server checks rate limits, not plan.** A student with a valid Firebase token who calls the endpoints directly still reaches paid features regardless of tier. **After Wave 3, paid features are protected IN THE UI. That is a real improvement and it is NOT the claim "paid features are protected."** Say it that way in any status.
2. **`[FU-EFF-THINKING-BUDGET]` — now the TOP cost lever, and it OUTRANKS `responseSchema`** (owner re-ranking, on measured data). Thinking is **87.6% of vision output tokens and ~24.5 seconds per grade**, so it is both the largest cost lever **and** a latency fix. ⚠ **DO NOT set a budget from the current sample** — n=2 calls from one session is one paper, one student, one difficulty band. A week of real data, then **p90 PER MARKS-BAND**. Grading genuinely needs reasoning; the lever is to bound it, not remove it. ⚠ Counters are **per-process and reset on redeploy**, so a "week" only accrues if nothing ships — capture a reading before each merge.
3. **`[FU-C2-PARSE-MISS-NOT-COUNTED]` — a prerequisite, not a nice-to-have.** `retryCount` counts `attempts > 1` **inside one `callGemini`**; the grader's parse-miss retry is a **second invocation**, emitting two records each `attempts:1, retry:false`. **No before/after on parse misses can be honest until that metric exists.**
4. **`[FU-VITEST-CI-HEAP-CEILING]`** — still open, still the standing scaling item. The nine bank-importing suites, their per-file MBs and the 292MB peak are recorded on the FU board — **do not re-measure them.**
5. **`[FU-SEC1-USERS-COLLECTION-DENIED]`** — `users/{uid}` has **no rule at all**, so `ensureLearnerAccountMetadata` writes have **always been silently denied**, swallowed by a bare `catch {}`. Nothing has broken because nothing depended on it; that is exactly why it went unnoticed.
6. **`[FU-PRICING-FOUNDING-COHORT]`** — a published promise the product cannot enforce; nothing counts subscribers or closes the founding offer at 200. An open commitment, not a nice-to-have.
7. **★ NEW, and it undercuts a gate every lane relies on: `[FU-MOJIBAKE-GATE-CWD-BLIND-SPOT]`.** `check:mojibake` sets its repo root to `lazytopper/` and enumerates `git ls-files` from there, so it inspects **1,379 of the repo’s 1,712 tracked files and ZERO under `handoff/`** — and reports PASS. There is real mojibake in `handoff/CURRENT_STATE.md` today that it has been green over for months. **The same cwd blind spot #560 just fixed in `scope:guard`.** ⚠ **Until it is fixed, a green `check:mojibake` is not evidence about a `handoff/` file** — run the gate’s regex directly over your added lines, with a control.
8. **Small own-PR items:** `[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]` (reads a file D2 deleted; zero impact today because nothing runs it), `[FU-ENTITLEMENT-GATE-MATCHES-STRING-LITERALS]`, `[FU-SEC1-DAILY-QUOTA-LOCALSTORAGE]`, `[FU-CI-COMMENT-STALE-MATRIX-COUNT]`, `[FU-ADMIN-GATE-DUPLICATED]`, `[FU-PREMIUMSINCE-UNREAD]`, `[FU-2.5-FLASH-DEPRECATION-UNVERIFIED]` (verify before that date drives any roadmap decision).
9. **A later dead-code sweep** — after D2, `callMentor` + `MENTOR_ENDPOINT` are fully orphaned. ⚠ `scripts/ops/llm_path_audit_acceptance.mjs` **is CI-gated** and requires `rg("generateMoreLikeThis|MENTOR_ENDPOINT") > 0`: the sweep may delete `MENTOR_ENDPOINT`, **but must not delete both.**

### ★★ STANDING DOCTRINE ADDED BY THIS WAVE — in force now

- **A guard's output must name its subject, not just its verdict.** Any check whose subject count or match count is **zero is a FAILURE, never a pass**. One line: *a check that cannot be shown to have looked, and to be capable of failing, is not coverage — it is the appearance of coverage, which is worse, because it stops anyone looking.*
- **Mutation-verify the SPEC, not only the code.** Three specs this wave proposed a fix that did nothing, and each was found by running the battery against the proposal.
- **A verification command needs its own control.** Run it against a case you *know* matches before trusting an empty result. An empty result from an unvalidated command is not evidence of absence — it is no evidence at all. (`node --test` prints the invocation and the result on **different lines**, so any filter demanding both on one line matches zero.)
- **A mutation that does not go red is first a claim about the MUTATION, not about the test.** An anchor that matches exactly once proves nothing about *which* near-duplicate it matched.
- **A deploy is not a merge.** A lane whose outcome depends on a deploy **closes on the DEPLOYED state**. `git pull`, **grep the local file** for the expected new content, deploy, confirm **`uploading rules`** and not `skipping upload`, then read it back in the **Firebase Console**.
- **A rollback artefact must be PROVEN to contain the old state.** Grep it for the thing you are about to add; if the pattern is present, you backed up the wrong version. Prefer `git show <prev-sha>:<path>` over the working tree.
- **Tightening a write rule breaks every over-sending writer, silently.** Enumerate every writer and check what each **actually sends**, not what it is supposed to send. A spread into a payload sends fields nobody listed.
- **A CI run id is bound to a COMMIT, not a PR.** Never carry one across a rebase or a trunk-merge.
- **Never reconstruct an FU body from its ID.** A plausible-but-wrong FU is harder to detect than a missing one — it gets cited.
- **Cite by quote or symbol, never by line number alone.** A line reference is a derived value nothing re-checks.
- **Write specs against the breakpoint, not against a width grid.**
- **A reference to Daily Mix / Daily Mission / Study Plan / Dashboard is evidence of DEADNESS, never of liveness.** (owner, standing)
- **A deadness analysis that enumerates only the fixtures you expected is not an enumeration.**
- **A number that agrees with itself is not a measurement.**
- **Relay evidence between lanes; never relay it as settled.**
- **The evidence lane must close BEFORE the merge, or it is an audit, not a gate.** *(open process question)*

### ★ GATE CHEAT-SHEET — changes this wave
- **`scope:guard` runs BEFORE `git add`** (it reads the working tree); the `base...HEAD` matrices run **AFTER** committing. Mirrors of each other.
- **`scope:guard` was rebuilt by #560.** It now enumerates from the git root and prints a `SCOPE_GUARD_SCOPE:` line naming root / anchor / inspected / untracked / `anchor_frame_would_miss`. **Report that line verbatim.** `firestore.rules` classifies as `[firestore]`. ⚠ **It FAILS under `--mode product` for a firestore file — use `--mode mixed`** for a product+firestore PR. It still returns `[unclassified]` for `handoff/` and `artifacts/**` (`[D41]`/`[D47]`) — verify those by hand and say so.
- **Both typechecks.** `tsc -p tsconfig.app.json --noEmit` **excludes test files**; CI runs a separate `pnpm --filter lazytopper run typecheck:test`.
- **Root guard matrix is 190 checks / 28 suites — read it from the run, never hardcode.**
- **A new rules gate exists:** `pnpm run test:firestore-rules` → `firebase emulators:exec --only firestore …`. It needs a JVM. There is **no Java on the owner's box**; both SEC lanes downloaded a **portable Temurin 21 JRE into the scratchpad** to run it for real.
- **`repo_boundary_policy.json` is TRACKED but sits under a gitignored directory** ⇒ plain `git add <path>` refuses it. Use `git add -u` (ignore rules do not apply to tracked paths) — `[FU-GITIGNORE-SHADOWS-TRACKED-POLICY]`.
- **A non-`node --test` acceptance script has no four-counter block** — its zero-skip proof is **structural**: count the `✓` lines and the final PASSED line.
- Full matrices + vitest are **CI-only** (RAM). A green tick is not evidence — **quote the invocation and `# skipped 0`.**

### ★ Controller / subagent process facts
- **The harness blocks subagent writes to `C:\Users\Chetan\OneDrive\Desktop\diff\`.** Dispatch files must send full reports to the **subagent's scratchpad** and return the absolute path — otherwise the return message is the only copy, which is what happened to **every** lane this wave.
- **Subagents stopping before commit makes build-parallelism free; only the MERGE order needs sequencing** (branch protection forces each merge to update and re-run the next branch). `lane-overlap` keys on genuine file collision, not on a shared tree.
- **Two open PRs on one manifest is the exact collision the controller role exists to prevent.**

### ★ Read before touching `AuthContext` — the hazard map is in `CURRENT_STATE.md`
Twenty test files mock it; one asserts the context key set by **exact equality** and so fails on **addition**, not omission; three mount the real provider with `firebase/auth` mocked.

---

## (superseded) NEXT — 2026-07-28 (post-#546–#552).

**The cost-exposure tier is now CLOSED on the server side, and the instrument that measures it is finally readable.** #546 shut the open front door, #547 restored a grader protection that had never actually been in force, #549 gave the token telemetry a reader, and #552 fixed a launch blocker that had every signed-in student rate-limited as an anonymous stranger at 3 calls/day.

### ★ BEFORE ANY NEW LANE — four live-verifies are OWED to the owner
No gate can see any of these.
1. **A1 (#546)** — a graded round-trip on the Vercel preview **AND** `lazytopper.com` **AND** `lazytopper.in`; confirm `CORS_ALLOWED_ORIGINS` literally holds all five origins. A missing value loses response bodies on that domain while the server still returns 200.
2. **A3 + B4 (#549 + #552) — ONE curl settles both.**
   `curl -H "Authorization: Bearer <admin-id-token>" https://lazytopper.com/api/admin/token-telemetry`
   Confirm `rateLimit.byClass` shows the call under its **real** class and `anonKey.client` does **not** increment for a signed-in user. If `anonKey.loopback` is non-zero, `x-forwarded-for` is not surviving the Vercel→Railway hops and signed-out visitors are sharing one bucket.
3. **B3 (#551)** — one real phone sign-up from `/sign-up`, plus a `/login` phone attempt in the SAME session (no reCAPTCHA throw across the navigation).
4. **B2/B3 (#550/#551)** — a real email sign-up: the typed name must appear in the shell IMMEDIATELY, with no reload.

### Owner-set order after that

1. **★ WAVE 3 — SERVER LANE (named next, Agent A).** Three items, all server-side:
   - **`[FU-VERIFY-UID-ON-AI-ENDPOINTS]`** — the cheap half is done. #552 now sends `Authorization: Bearer` alongside the uid string at every paid call site, so `resolveCaller` can derive the uid from the **verified token** with no further client change. Until it does, the uid is spoofable. **Take this first.**
   - **`[FU-EFF-RESPONSE-SCHEMA -- CLOSED 2026-08-05: IT SHIPPED IN #559/PR-C2 AND WAS NEVER NEEDED. DO NOT RE-SCOPE. See OPEN_QUESTIONS_AND_FOLLOWUPS.md]`** — Gemini `responseSchema` / constrained decoding. Read `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` first; it is the only place the ranked levers exist.
   - **Server-side quota counters** — the entitlement half the client gates currently carry alone.
   **★ Do this lane with the telemetry read-out in hand**, not before: #549 exists precisely so these decisions stop being modelled from estimates.

2. **`[FU-VITEST-CI-HEAP-CEILING]` — the TOP item once Wave 3 closes (owner ruling, 2026-07-27).** It STAYS OPEN and it is prominent for a reason: today's `maxWorkers:2 + 2048 + timeout-minutes:20` is a **runway extension, not a fix**, and the bank grows with every content lane while phase 2 adds state boards and Class 12. The nine bank-importing suites, their per-file MBs and the 292MB peak are all recorded in `OPEN_QUESTIONS_AND_FOLLOWUPS.md` — **do not re-measure them.** Mocking or lazy-loading the bank in those nine buys back 4-worker parallelism AND ~2-minute gates, and it pays for itself every cycle.

3. **`[FU-PRICING-FOUNDING-COHORT]` — a published promise the product cannot enforce.** Nothing counts subscribers or closes the founding offer at 200; it is manual today. This is an **open commitment**, not a nice-to-have.

4. **Small, own-PR items** (each deliberately kept out of this docs PR): `[FU-ADMIN-GATE-DUPLICATED]`, `[FU-CI-COMMENT-STALE-MATRIX-COUNT]`, `[D47]` (the `artifacts/**` scope:guard lane), `[FU-DBSYNC-COMMENT-MISATTRIBUTED]`, `[FU-LOGIN-STALE-RECAPTCHA-COMMENTS]`.

### ★ Read these before touching `AuthContext` — the hazard map is in `CURRENT_STATE.md`
Twenty test files mock it; one asserts the context key set by **exact equality** and so fails on **addition**, not omission; three mount the real provider with `firebase/auth` mocked. Adding a member can turn red a file you never opened.

### ★ Two corrected doctrine rules now in force
- **`typecheck:test` is a SEPARATE gate.** `tsc -p tsconfig.app.json` EXCLUDES test files; both configs belong in every agent's local set.
- **"Matrices are CI-only" is no longer absolute.** When a change adds a NEW IMPORT EDGE into `lazytopper/src/`, run the one root-matrix suite covering the touched area locally first — an import graph is not visible in a diff.

---

## (superseded) NEXT — 2026-07-26 (post-#538–#540).

**The code-side launch-blocker tier is EMPTY.** #538 closed the last one — a student who forgets their password can now recover their account. Lane G (#537) capped the endpoints; Lane H published the price and instrumented the spend.

**★ Read `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` before touching anything in the efficiency tier.** It is committed with this update and is the only place the per-call cost model, the ranked levers and the margin table exist. Two of its v1.1 corrections reverse v1.0 conclusions, and one of them (`mentorResponseBuilder` is an orphan) invalidates part of an FU's stated justification — see the correction note on `[FU-EFF-RESPONSE-SCHEMA -- CLOSED 2026-08-05: IT SHIPPED IN #559/PR-C2 AND WAS NEVER NEEDED. DO NOT RE-SCOPE. See OPEN_QUESTIONS_AND_FOLLOWUPS.md]`.

Owner-set order:

1. **`[FU-TELEMETRY-NO-READ-PATH]`** — ★ **the named next lane, APPROVED, and it is a COMBINED PR.** #540 measures token and thinking usage per call class but **nothing serves `snapshot()` or `getTokenTelemetry()`**. Until a read endpoint exists, the instrument records into a void, and **every** thinking-budget and final-pricing decision is blocked behind it — including whether ₹599 can become ₹499.
   **Owner-approved shape:** combine it with Lane G's `[FU-ANON-BUCKET-XFF-DEPENDENT]` shape diagnostic as **one `index.cjs` PR**. Both lanes reached the "telemetry read path goes first" conclusion independently, and both need the same frozen file, so they must not be two PRs racing for it. `index.cjs` is Lane G's territory — sequence under whoever owns that file, not in parallel.
2. **`[FU-EFF-QUICK-PRACTICE-BATCH]`** — biggest single saving (69% off the largest line, 31% of daily spend) **and** a product win: the tutor receives one graded answersheet instead of five disconnected checks. Flow is owner-locked. Requires a FORBIDDEN-list amendment for `SolutionChecker.tsx` and `ResultsScorecard.tsx` — owner authorised; **replace the ban with targeted tests per the #519 precedent, do not simply delete entries.**
3. **`[FU-FORBIDDEN-PATH-PREFIX-BUG]`** — ★★ **BLOCKS (4), and it is a one-line micro-PR.** Both FORBIDDEN arrays list `'server/routes/checkSolution.cjs'` without the `lazytopper/` prefix, while the check is exact array membership against repo-relative paths — so **the grader, the file named directly as untouchable, is protected by an entry that can never fire.** Verified independently by Lane H; the same file at `check_improve_convergence_acceptance.mjs:528` carries a correctly-prefixed sibling entry, which is both the proof and the fix's shape. Its own micro-PR, one line plus a test asserting the entry matches a real path. **Do not fold it into another change.** Lane G, after CORS.
4. **`[FU-EFF-RESPONSE-SCHEMA -- CLOSED 2026-08-05: IT SHIPPED IN #559/PR-C2 AND WAS NEVER NEEDED. DO NOT RE-SCOPE. See OPEN_QUESTIONS_AND_FOLLOWUPS.md]`** — cost *and* the grading-consistency FUs together. Highest quality-per-rupee item on the board: constrained decoding means one output shape every time, so MI stops being built on noise. Touches FORBIDDEN `checkSolution.cjs` — ★ **which is exactly why (3) must land first.** Taking the deliberate FORBIDDEN amendment while the guard cannot match means lifting a protection that was never in force, and the PR then ships whatever it did to the grader while everyone believes the removal was reviewed. A false sense of review is worse than none.
5. **`[FU-HOME-FABRICATED-SOCIAL-PROOF]`** — ★ **should precede public launch.** `Home.tsx` publishes `aggregateRating 4.8 / reviewCount 2340` as JSON-LD plus "12,800+ students" in prose. Direct §5 doctrine violation, and Google's structured-data policy prohibits fabricated review markup — the penalty is manual action against the site. Inert only while the page stays unrouted, exactly as the ₹149 price was inert right up until it wasn't.
6. **`[FU-EFF-THINKING-BUDGET]`** — **after** a week of real data from (1). Set budgets at p90 of observed `thoughtsTokenCount` per class, never by guess. Grader first; tutor deliberately excluded (`[FU-EFF-TUTOR-COST-ENVELOPE]`).

**Auth cluster — sequential under ONE agent, never parallel** (`[FU-AUTH-CLUSTER-SEQUENCING]`): H-3 is done; remaining order is name-on-signup (one-way door) → phone-on-signup → Lane F. `[FU-SIGNIN-DISABLED-ACCOUNT-ENUMERATION]` belongs in this cluster and is the cheapest item in it — the fix pattern already exists in the same file.

Also queued: `[FU-AUTH-CUSTOM-EMAIL-DOMAIN]` (post-launch; two DNS blockers documented, do **not** improvise at the registrar), `[FU-OPS-GATES-RED-ON-TRUNK]` (two guards red on clean trunk, neither in `test:matrix:all`), `[FU-CI-DOC-UNDERSTATES-GATES]`, `[FU-JSONLD-OFFER-SHAPE]`, `[FU-WORKSHEET-MI-TEST-TIMEOUT]`.

### ★★ MACHINE CONSTRAINT — READ BEFORE DISPATCHING PARALLEL AGENTS
The owner's machine has **7.8GB RAM**. Two agents running `test:matrix:all` concurrently exhausted physical memory and **OOM-killed the editor, losing two agent sessions mid-lane**. File-disjointness protects the repo; it does nothing for RAM.

**ONE agent runs a test suite at a time.** Full matrices, full `vitest run`, the convergence/overlay gates and every `base...HEAD` gate run **in CI only**. Locally: `scope:guard` pre-commit (it reads the working tree, so it is local-or-nowhere), `tsc`, `check:mojibake`, and the agent's **own scoped suite**. Any local vitest run uses `--poolOptions.threads.maxThreads=2`.

**The corollary is a new blind spot:** you no longer watch those suites run, and a suite that is present, wired and **skipped** reports green. For every suite relied on, quote from the CI log the invocation line *and* the result line — for `node --test` that is `# pass N  # fail 0  # skipped 0  # todo 0`. The skipped and todo counts are the ones that matter. Match the run's `headSha` to the PR's `headRefOid` before trusting any log.

### ★ Live-verify still owed
**#540** — additive and provably unable to change request behaviour, but it sits on the live path of *every* Gemini call; one real production call confirms the counters populate. **#539** — confirm ₹599 renders on `/practice` and the mock gates in production, not just under a forced-limit harness.

---

## (superseded) NEXT — 2026-07-25 (post-#531–#535).

**The code-side launch-blocker tier as previously scoped is now EMPTY** (#531–#535 closed it). It is replaced at the top by a **cost-exposure tier** the wave surfaced — the AI endpoints are ungated and unmetered. Owner-set order:

1. **Billing cap + budget alert on the Google Cloud / Gemini project** — **owner-run, no code, ~10 min. HIGHEST PRIORITY.** Given `[FU-NO-SERVER-ENTITLEMENT]` and `[FU-CHECKIMPROVE-UNGATED]`, this is the only control that bounds worst-case cost, independent of every entitlement question below.
2. **`[FU-CHECKIMPROVE-UNGATED]`** — awaiting owner's **RequirePremium vs RequireAuth** ruling (evidence is four-layer, already verified against `7185c5f`; do not re-derive as a condition of acting). `/check-improve` lets a **signed-out** visitor trigger Gemini vision grading from the main nav.
3. **`[FU-NO-RATE-LIMIT-AI-ENDPOINTS]`** — dispatch **with (2) as one lane**; the per-uid cap is the control that bounds exposure regardless of entitlement correctness.
4. **`[FU-SIGNUP-NO-NAME]`** — small, **one-way door** (pre-fix accounts can't be backfilled without re-asking); its own PR, separate from any styling work.

Also queued (not top tier): `[FU-SUBSCRIPTION-CLIENT-WRITABLE]` (firestore.rules — sacred-file, its own reviewed PR, absolute blocker before payments), `[FU-WORKSHEET-UNGATED]` (server-side per-day cap), `[FU-DOCTRINE-DRIFT-CLAUDE-MD]` (bring code to doctrine or amend doctrine — a deliberate reviewed change), `[FU-HPQ-EVIDENCE-YEARS-UNVERIFIED]` (owner ruling), `[FU-SAFEPATH-DUPLICATION]` (consolidate the 3 copies — now unblocked, Lane C merged).

### ★★ LAUNCH CONTEXT — the QA gate is being consciously compressed
Owner is targeting **public launch this weekend**. The plan of record had been a **~50 real-student QA pass first**; that gate is being compressed. Record this as a deliberate owner call, not an oversight: **every genuine bug in this project's history was found by owner live-use of the deployed product, not by a gate.** The billing cap (step 1) is what makes compressing the QA gate survivable.

---

## (superseded) NEXT — 2026-07-22 (post-#528).

**The Home spec is COMPLETE end-to-end.** PR-B was its last unbuilt half and it has shipped. **`[FU-HUB-DROPDOWN-ZINDEX]` is RESOLVED** — enumerated every `backdrop-filter` in `src/` and no other surface has a trapped dropdown, so it closes rather than defers.

### ★★ IF YOU TOUCH A Z-INDEX IN THE SHELL, READ THIS FIRST
**The ceiling is `.command-palette-backdrop` at 50 — NOT the 9998–10000 full-screen band.** The palette (`styles.css:6494`) is mounted at `App.tsx:821` as a **sibling of the shell**, and it is opened by the header's **own search box**. Deriving from the 9998 band alone yields ~1100 and ships a regression. The header sits at **35**: floor **>30** (`Worksheets.tsx:484`, the app-wide page-content max), ceiling **<50**, band 31–49 empty. **A mutation test pinned at 1100 exists to catch exactly that.** Two people derived this wrong before it was measured — the FU itself had recorded `55`, which is above the palette.

### ★★ AND THE TWO INVARIANTS ARE DIFFERENT ON EACH BREAKPOINT
Mobile: **"no trap ancestor"** (pinned by PR-A2's test at `MobileHome.test.tsx:483`). Desktop: **"the trap must OUTRANK page content"**, because the header's blur is intended design and cannot be removed. Same symptom, opposite remedies. Anyone who reads this as "we fixed the z-index" will mis-fix the next instance.

### The immediate candidates
1. **The MASTERY lane** — audit delivered, unblocked since the tutor lane closed. ⚠ The unwire is a **CONSTANT-FOLD, never a clause deletion** (`weakAreaAggregator:154/:158` must stay literals or the `>5` gate starts filtering and the live weak-area set changes). **This is now the natural next lane.**
2. **`[FU-BANK-GARBLED-EXPANDED-SCOPE]`** — ~61 rows remain of the 89-row class. Reuse the proven coordinate-aware method; do not re-derive it.
3. **`[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`** (from #521, inverted) — ten years is owner-authoritative, so fix the two contradicting surfaces. ⚠ `Welcome.tsx` is a globally forbidden file; that lane needs explicit scoping.
4. **`[FU-HOME-MEMORY-STRIP-VS-MI]`** — a product call for the owner after living with the redesign, not an engineering task.

### ⚠ Still NOT worth a lane
- **`[FU-TRUNK-FLAKY-SUITES]`** — now proved rather than argued: **the same tree** had `WorksheetGenerator.mi` fail pre-commit and pass post-commit, and linux CI ran **849/849**. Local-dev cost, not a CI risk.
- **`[FU-MOBILE-MI-REAL-DATA]` on bundle grounds** — the bundle argument is **VOID**. Product decision only.
- **`[FU-STALE-WORKTREE-PRUNE]`** — owner-run, logged for visibility.

---

## PREVIOUS NEXT — post-#520 + #522 (the Home redesign arc), retained for context

**The Home redesign lane is CLOSED for PR-A and PR-A2.** One piece of it remains, and it is now unblocked — see below.

### ★ THE OBVIOUS NEXT STEP: PR-B — the DesktopShell rail Tutor entry
This was the *only* blocked half of the original Home spec (§7), and **the block is gone**:
- **#519 lifted the `DesktopShell.tsx` blanket ban** from the ops FORBIDDEN list, which was the stated blocker.
- **The picker was built for exactly this.** `TutorPickerModal` + `useTutorPicker` live in `homeDestinations.tsx` and are **firebase-free by construction** — auth arrives as a **prop**, the module never calls `useAuth`, and its transitive graph (`navigation`, `topics`, `tutorPath`) pulls no data layer. The shell can import it as-is.
- ⚠ **Do not add a data-layer import to `homeDestinations.tsx`** or PR-B stops being possible.
- ⚠ `DesktopShell` is still a **globally forbidden file** under CLAUDE.md §4 — the lane needs explicit scoping in its brief even though the ops gate no longer blocks it.
- The `[FU-HUB-DROPDOWN-ZINDEX]` work could reasonably ride the same lane, as the original spec suggested.

### ★★ THREE DOCTRINES THIS ARC ESTABLISHED — carry them into every lane
1. **"Real data only" forbids fabricated stats presented as a student's OWN — NOT a clearly-labelled sample.** #520 deleted the signed-out SAMPLE MI panel from a **conversion surface** by over-reading spec §4; the owner recorded that the spec conflated the two and that he confirmed the removal as "no regression" when it was one. **The label is what makes a sample honest — so make it structural, not textual** (badge and figures in one containment-asserted block). Anti-fabrication stays absolute; a demonstration is not a fabrication.
2. **A doc comment is a CLAIM, not a fact — and it is more dangerous than a grep hit, because it reads like documentation.** `MobileHome`'s "stays firebase-free" comment was **false when written**, survived months, and was cited as evidence by two people. Only walking the **real import graph** disproved it.
3. **A token that is DEFINED but never CONSUMED is invisible to every gate we run.** `HOME_ACCENTS.spine` was defined in #520 and never painted (the `::before` had no `background`). tsc sees a used export; the linter sees a valid rule; the matrices see no behaviour change; the tests asserted the value existed, not that anything painted it. **Only rendering the surface and measuring the computed style catches it** — `getComputedStyle(el, "::before")`. Add that measurement whenever a change is *visual by definition*.

### ⚠ FIVE CONSECUTIVE LANES have now had a load-bearing brief premise fail on re-derivation
#515 (error count), #516 ("LIVE in PracticePage"), the legacy-retirement audit (four wrong premises), #521 (a bug hallucinated from its own prototype), and this arc (**three**: "the inventory is already shared" — false for mobile; "preserve MobileShell's header/avatar" — there is no shell or avatar on `/browse`; "copy `margin: 0 -16px`" — the rule is *bleed equals container padding*, 14px here).

**This is no longer a run of bad luck; it is the base rate.** Re-derive every load-bearing premise in a brief before building on it, and report the ones that fail — three of the four corrections above came back as owner-confirmed spec errors.

### The immediate candidates
1. **PR-B (above)** — small, unblocked, and finishes the Home spec.
2. **The MASTERY lane** — audit delivered, unblocked since the tutor lane closed. ⚠ The unwire is a **CONSTANT-FOLD, never a clause deletion** (`weakAreaAggregator:154/:158` must stay literals or the `>5` gate starts filtering and the live weak-area set changes).
3. **`[FU-BANK-GARBLED-EXPANDED-SCOPE]`** — ~61 rows remain of the 89-row class. Reuse the proven coordinate-aware method; do not re-derive it.
4. **`[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`** (from #521, inverted) — ten years is owner-authoritative, so fix the two contradicting surfaces. ⚠ `Welcome.tsx` is a globally forbidden file; that lane needs explicit scoping.
5. **`[FU-HOME-MEMORY-STRIP-VS-MI]`** — a product call for the owner after living with the redesign, not an engineering task.

### ⚠ THREE things NOT to spend a lane on
- **`[FU-TRUNK-FLAKY-SUITES]`** — the flaky suites are **GREEN on linux CI** (both #520 and #522 ran 62 files / 814 and 826 tests, all passing). They fail only locally on Windows, the failing set shifts run to run, and all pass in isolation. **A local-dev cost, not a CI-reliability risk.** The earlier "these will redden unrelated PRs at random" framing was overstated and is corrected in the FU. The transferable habit: **stash to clean trunk and re-run before attributing a red to your own branch.**
- **`[FU-MOBILE-MI-REAL-DATA]` on bundle grounds** — the bundle argument is **VOID** (`mistakeLogService` is already on mobile Home's graph via `AuthContext`). If it is picked up, it is a **product** decision with no technical cost. Do not re-cite the bundle rationale.
- **Re-opening the Home card geometry** — radius/padding/carousel placement are byte-identical to `c8dab29` and pinned by a test. #522 changed **colour only**, and the owner re-verified that independently.

---

## PREVIOUS NEXT — post-#521 (Exam Trends), retained for context


**The Exam Trends uplift lane is CLOSED.** Presentation-only; the owner-signed tier data is byte-frozen and proven so twice over. **Do not re-open it, and above all do not "improve" the band data.**

### ★★ TWO METHOD RULES THIS LANE ESTABLISHED — carry them into every lane
1. **A guard over LOCKED data must compare the render against an INDEPENDENT copy of the truth, captured before the change.** Asserting the render against the same constant the component reads (`expect(rendered).toEqual(deriveExpected(BAND_BY_SLUG))`) is a **tautology**: re-tier the map and both sides move together, so the guard passes through the exact edit it exists to prevent. The working pattern: render the **pre-change** build through a throwaway harness, freeze its output into the test, delete the harness. Golden here: Maths 5/5/3, Science 6/5/2. Belt and braces, hash the frozen region.
2. **A spec sentence of the form "the current implementation does X" is a CLAIM ABOUT CODE, not an instruction — open the file.** #521's spec described a mispositioned popover as a product bug; the shipped page had **no popover at all** (an inline expansion row). The spec author had hallucinated the bug from his own prototype. **Four consecutive lanes** have now had a load-bearing brief premise fail on re-derivation (#515 error count, #516 "LIVE in PracticePage", the legacy-retirement audit, #521).

### ★★ AND A DOCTRINE: silence in a spec is not authorisation to delete rendered content
#521's first cut dropped `topic.blurb` because the prototype and the spec's row enumeration both omitted it. **An omission from a list is not a removal instruction.** A restyle is precisely where real content goes missing quietly — so if a redesign leaves something out, flag it rather than ship it, and when it is restored, **pin it with a test** instead of relying on the next reader to notice.

### ⚠ If you verify Exam Trends acceptance §9.4, read this first
*"The `⋯` popover never overlaps the next card"* is a **NEW-BEHAVIOUR check, NOT an A/B against trunk.** Before #521 the menu was an inline expansion row, so at trunk it could not overlap anything. Comparing against trunk compares two different mechanisms and will wrongly suggest the bug was never real.

### The immediate candidates (unchanged by #521 — it closed no other lane's blocker)
1. **The MASTERY lane** — audit delivered, unblocked since the tutor lane closed, still the natural successor. ⚠ The unwire is a **CONSTANT-FOLD, never a clause deletion** (`weakAreaAggregator:154/:158` must stay literals or the `>5` gate starts filtering and the live weak-area set changes).
2. **`[FU-BANK-GARBLED-EXPANDED-SCOPE]`** — ~61 rows remain of the 89-row class. Reuse the proven coordinate-aware method; do not re-derive it.
3. **`[FU-APP-TSX-FROZEN-RESIDUE]` + `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`** — merge into ONE "narrow the freeze and sweep the residue" item; three lanes strong.
4. **`[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]` (NEW, inverted)** — small and self-contained: ten years is owner-authoritative, so fix the two surfaces that contradict it, `Welcome.tsx:1867` *"Last 5 years pattern"* (**live marketing copy**) and `class10ContentConfig.ts:156` *"last 3–5 years of PYQs"*. `Home.tsx` already says 10. ⚠ `Welcome.tsx` is a **globally forbidden file** — that lane needs explicit scoping.

### ⚠ Two things NOT to spend a lane on
- **`[FU-STALE-WORKTREE-PRUNE]`** — committing prints ~46 `failed to delete .git/worktrees/<name>: Permission denied` lines. That is `git gc` auto-pack tripping over ~50 stale worktree entries whose directories are gone or Windows-locked. **Pre-existing, inert, cosmetic; commits succeed (check exit code + `git log`, not the noise). Owner-run housekeeping — do not act on it.**
- **The local vitest flakes** — 4+ suite files, an **open-ended** set that varies run to run. They **all pass in isolation** and are **green on the linux runner** (#521's CI: 63 files / 826 tests, zero failures). This is a **Windows local-dev cost, NOT a CI-reliability risk.** Diagnose only if CI itself goes red; isolation runs are the reliable local signal.

**Still open:** `[FU-SIGNUP-UNSAFE-REDIRECT]`, `[FU-OPS-SCRIPTS-PATH-COUPLING]`, `[FU-PRACTICEINSIGHTS-STALE-COMMENT]`, `[FU-HPQ-PREDICTED-MOCK]`, `[FU-QP-WRITTEN-BINARY-CHECK]`, `[FU-MOJIBAKE-GATE-MISSES-PUA]`, `[FU-TSCONFIG-TEST-2FILE-HOLE]`.

**Handoff bookkeeping:** #519, **#520 (PR-A Home)** and **#522 (PR-A2 Home fixes)** merged without handoff entries — **the Home lane's combined handoff covers #520 + #522.** This block does not speak for that lane.

---

## (superseded) earlier NEXT blocks
# Updated: 2026-07-21 (post-**#516 — THE TUTOR RETIREMENT IS COMPLETE.** Trunk `a86feda`. Owner byte-reviewed the full deletion set + merged. 62 files, +34/−15,239. `[FU-TUTOR-LEGACY-RETIRE]` CLOSED end-to-end.)

## NEXT — 2026-07-21 (post-#516). Read this block first.

**The tutor retirement lane is CLOSED.** #512 shipped the behaviour (old "Teach me" retired, onboarding→home, referral relocated); #516 deleted the dead code — the old-tutor cluster, the unreachable `MentorSolveDrawer`, `/api/mentor`, and the persona/test-bot cluster. **Do not re-open either half.**

### ★★ CORRECTION carried from the previous handoff
This file previously said **"KEEP `/api/mentor` + `types/mentor.ts` + `MentorSolveDrawer` (LIVE in PracticePage)"**. `/api/mentor` + `MentorSolveDrawer` — **BOTH DELETED by #516. The "LIVE in PracticePage" claim recorded here was FALSE**: the drawer was MOUNTED but unreachable (its only trigger prop arrived as an unused `_onOpenMentorBoard`), and `/api/mentor` had no product caller left once the old tutor died. **`types/mentor.ts` DOES survive** — but for a completely different reason than recorded: it is a shared type module feeding `aiClient` (33 importers) and the live grading stack, not an `/api/mentor` dependency.

### ★★ The lesson worth carrying into the mastery lane (which is next)
**Mount is not liveness. Import is not liveness. Only a TRIGGER is liveness.** A prop threaded three levels deep into an unused `_`-prefixed binding looked live at every level except the last. The mastery lane has exactly this shape — reads that *look* wired but may be unreachable — so trace each one to its trigger before assuming it must be preserved. Its audit already flags one such case (`guidedJourneyService`'s read is unreachable — `PracticePage` imports only `recordDetour`, a sibling-function trap).

**And: deleting a file is never just deleting a file.** Grep for who *invokes* it (spawns, npm scripts, runners), not only who *imports* it. #516 hit this twice — eight scripts spawning five deleted suites, and a browser-journey runner importing a deleted journey.

### The immediate candidates
1. **The MASTERY lane** — its audit is already delivered (`topicHubMastery` unwiring). **Owner has been holding this decision; it is now unblocked by the tutor lane closing.** ⚠ Its audit warns the unwire is a **CONSTANT-FOLD, never a clause deletion** — `weakAreaAggregator:154/:158` must stay as literals or the `>5` gate starts filtering and the live weak-area set changes. `[FU-MASTERY-WRITE-ORPHAN]` (the old tutor was the last live writer) is now real but harmless — readers already tolerate empty.
2. **`[FU-BANK-GARBLED-ANSWER-CLASS]`** — the question-side twin of the bank lane.
3. **`[FU-APP-TSX-FROZEN-RESIDUE]` + `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`** — **three** lanes have now left residue behind the same over-broad `App.tsx` freeze (MockBuilder, onboarding, and the tutor cluster's comments). Merge them into ONE "narrow the freeze and sweep the residue" item.

**Still open:** `[FU-SIGNUP-UNSAFE-REDIRECT]`, `[FU-OPS-SCRIPTS-PATH-COUPLING]` (the general hardening pass — #516 cleared only the tutor-adjacent ones), `[FU-PRACTICE-CONTROLS-REFRESH-STALE]`, `[FU-PRACTICEINSIGHTS-STALE-COMMENT]`, `[FU-HPQ-PREDICTED-MOCK]`, `[FU-QP-WRITTEN-BINARY-CHECK]`.

**Residue left deliberately by #516:** `backlog_1_19` keeps an unused `extractMentorStructured` helper (dead but harmless — `.mjs` has no `noUnusedLocals`); an `rg` search pattern in `export_repo_details.ps1` now matches nothing and degrades to an honest empty section; and stale prose in `NoteModal`/`NcertPageModal`/`PracticePage` still cites `ConceptTeachDrawer` as a design reference. All flagged at review, none functional.

---

## (superseded) earlier NEXT blocks
# Updated: 2026-07-21 (post-**#515 - WAVE-3: TESTS ARE TYPECHECKED · 26 GARBLED BANK ROWS RECOVERED · "REFRESH SET" ACTUALLY REFRESHES.** Trunk `a40fa75`. Owner byte-reviewed the pushed diff + merged. ONE PR, three file-disjoint lanes, 17 files, zero forbidden; CI + lane-overlap green. **The tutor PR-2 lane below is UNAFFECTED and remains the immediate next task.**)

## NEXT - 2026-07-21 (post-#515). Read this block first.

### ★ WAVE-3 IS CLOSED — what it leaves behind

`[FU-TSCONFIG-EXCLUDES-TESTS]`, `[FU-PRACTICE-CONTROLS-REFRESH-STALE]` and `[FU-BANK-GARBLED-ANSWER-CLASS]` (26-row subset) are **RESOLVED**. The ~7 stale `[FU-CI-GATE-VITEST]` entries are **tombstone-closed** (resolved by #509 — **do not re-open them**; #515's CI run confirms 61 files / 792 tests).

**Queued out of Wave-3, in priority order:**
1. **The 26 recovered bank rows go to STUDENT-QA** — owner's ruling that student-QA is the final content gate on question quality.
2. **`[FU-BANK-GARBLED-EXPANDED-SCOPE]`** — ~61 rows remain of an **89-row** damage class (the briefed "~15" was an order of magnitude low). **Reuse the proven method, do not re-derive it:** coordinate-aware **pymupdf** (`pdfplumber` BANNED — it caused this class), marking schemes at `cbse-papers/gdrive/PYQs/MS/final MS/<year>/MS/` (**not** `PYQ/X question papers/`, which holds question papers and is image-only for 2025/26), per-row paper+page citation, **never guess a distractor or stem**, unrecoverable → WITHHELD. Report the list **before** authoring.
3. **`[FU-MOJIBAKE-GATE-MISSES-PUA]`** — the gate that should have caught all 89 rows is blind to Private-Use-Area codepoints. Small, and it stops this class recurring. **Mutation-test the extension** (Wave-3's own PUA checker was silently vacuous on v1).
4. **`[FU-TSCONFIG-TEST-2FILE-HOLE]`** — two suites still `exclude`d from the new typecheck project; the one-line fix lives inside those test files.

> **★★ CARRY THIS INTO ANY MULTI-LANE PR: lane-green ×N is NOT PR-green.** All three Wave-3 lanes were green and inside their allowlists, and the PR would still have merged with a red local bar. **Run an ASSEMBLY gate pass yourself**, because two failures are structurally invisible to a subagent:
> - **`scope:guard` classifies the WHOLE working tree** — meaningful only once lanes are assembled, and it is **LOCAL-only, not in CI**. It failed on `[unclassified] tsconfig.test.json` because `repo_boundary_policy.json` enumerates tsconfigs **by exact name**; **any NEW tsconfig will hit this again.**
> - **`base...HEAD` guards are VACUOUS pre-commit** — #488, #496, and now #515. Re-run them **after** committing.
> - **They are MIRRORS:** `scope:guard`'s meaningful run is **PRE**-commit; the matrices' is **POST**-commit. Ask what range a gate inspects before trusting its green.
> - **★ A `git add` that warns can kill a chained commit.** Root `.gitignore:49` ignores `lazytopper/docs/project_memory/`, so staging `repo_boundary_policy.json` exits non-zero and short-circuits `&&`. The file **is** tracked (`c7d742f` restored it because untracking it once **disarmed scope:guard**). Verify `git log --oneline -1`.

**Live-verify owed (non-blocking):** one owner tap of **"Refresh set"** and **Alt+R** in Quick Practice. L1 (config/CI) and L2 (bank content) owe none.

---

## The immediate next task (unchanged by #515)

### ★ THE IMMEDIATE NEXT TASK: PR-2 — DELETIONS + THE OPS-SCRIPT SWEEP

**PR-1 (`#512`) shipped the behaviour; PR-2 ships the dead code.** The split was an owner ruling after the audit's fallout estimate proved an order of magnitude low (2 scripts claimed → **16 hard-`readText`**, ~27 referencing). Behaviour-first / deletions-second, the #505 MockBuilder pattern.

**Precondition — RE-CONFIRMED on trunk `e19b2d1`:** the old-tutor cluster is now **self-referential dead code**. `ConceptTeachDrawer`'s only importer is `pages/TopicHub.tsx`, which itself has **zero importers and zero routes** (the `App.tsx:46` hit is a comment). The live `ConceptSpine` no longer imports it. tsc-clean, and **no ops script is broken yet** because nothing has been deleted.

**PR-2 scope:**
1. **Delete the dead cluster** — `ConceptTeachDrawer`, `TeachFlow`, `TutorDrawerV2`, `MentorPanel`, `TutorMessageRenderer`, `tutorStructuredExtract`, **plus `pages/TopicHub.tsx`** (forced by its `ConceptTeachDrawer` import — not elective).
2. **The ~27 ops scripts asserting on those files** — **RETIRE the wholly-dead ones, SURGICALLY fix the mixed ones.** This is a *content* decision about what each script should assert now, which is why it needs owner byte-review before anything lands.
3. **★★ Do NOT harden `readText` to swallow ENOENT.** Explicitly rejected: every assertion on a deleted surface would pass **vacuously** — a false-green, the class this project has been bitten by twice.
4. ~~**KEEP everything live-shared:** `/api/mentor` + `types/mentor.ts` + `MentorSolveDrawer` (**LIVE in `PracticePage`**)~~ — **SUPERSEDED/CORRECTED by #516: `/api/mentor` + `MentorSolveDrawer` — **BOTH DELETED by #516. The "LIVE in PracticePage" claim recorded here was FALSE**: the drawer was MOUNTED but unreachable (its only trigger prop arrived as an unused `_onOpenMentorBoard`), and `/api/mentor` had no product caller left once the old tutor died. `types/mentor.ts` survives only because it feeds `aiClient`.** The new `/tutor` stack is kept.
5. **`topicHubMastery` UNTOUCHED — the owner is still holding that decision.**

**★ STOP BEFORE COMMIT** — report the deletion set + the per-script decisions for byte-review.

**Known landmines for PR-2, already verified so they need not be re-derived:**
- **A CI-matrix script that NAMES a deleted path is not automatically a break.** `topickey_guard_acceptance.mjs:115` lists `pages/TopicHub.tsx` in `B_ALLOW` — a **skip**-list consulted while walking files that *exist*. Deleting the file leaves the entry merely unused: no read, no ENOENT. **All 14 matrix scripts were enumerated; zero of the 16 affected ops scripts are among them ⇒ CI stays green.** (Cleaning the now-stale allowlist line is a 1-line tidy, zero risk — nothing asserts on `B_ALLOW.size`.)
- `backlog_1_19_acceptance.mjs:120` hard-reads **`pages/Onboarding.tsx`** — which **survives** (App.tsx is frozen, so the page stays inert on disk). Not a PR-2 problem.

### What #512 actually fixed, for the record
The old `"Teach me"` drawer was **LIVE on every Topic Hub concept row**, sitting *beside* the new "Stuck? Ask" — students saw both. Retiring it was a **product removal, not a cleanup**. Onboarding is retired for **new AND returning** users (see below). And referral crediting was relocated out of the page being retired, fixing a latent double-credit bug.

**★★ Three things worth carrying forward:**
1. **The `Date.now()`-string → `user.uid` switch was a CORRECTNESS fix, not an identifier tidy-up.** `addReferralToCode:88` dedups on `referrals.includes(friendIdentifier)`; a fresh timestamp can never match, so **the dedup was inert and a student could be credited twice**.
2. **The onboarding fix is WIDER than new signups.** `hasProfile` read the **bare** key `lazytopper.profile.v2` while `studentCloudStore.ts:23` only ever writes `lazytopper.profile.v2:<uid>` ⇒ permanently `false` ⇒ **every** login, returning users included, was already hitting `/onboarding`. Resolves `[FU-LOGIN-HASPROFILE-DEAD-KEY]`. **The bare-vs-prefixed key mismatch is a bug CLASS worth watching for elsewhere.**
3. **A delete-only test edit proves nothing.** The replacement guard asserts the **absent** case (gone as text, `button` **and** `link`) *together with* the **positive** case (every row still has its `/tutor` link) — and was **mutation-tested**: re-injecting the button turns it RED. The harness also had to be given `tutorHrefForConcept`, or the guard would have asserted against a strawman row that never had the replacement.

**The follow-ups this arc opened / left open:**
- **`[FU-TUTOR-LEGACY-RETIRE]`** — **PR-1 half done (behaviour). PR-2 (deletions) is the remaining half.**
- **`[FU-MASTERY-WRITE-ORPHAN]`** — after #512 the old tutor's mastery WRITE is unreachable, so `saveTopicMasterySnapshot` has no live caller. Nothing breaks (readers already tolerate empty). **Owner is HOLDING the mastery decision; do not unwire it in PR-2.** A separate mastery-retirement audit already exists.
- **`[FU-SIGNUP-UNSAFE-REDIRECT]`** — `SignUpPage.tsx:52` uses `st.from` **without** `isSafeInternalPath`, unlike `Login.tsx:865-868`. Doctrine is "safe redirects always". **Pre-existing; deliberately not folded into a retirement PR.** Its own small PR.
- **`[FU-APP-TSX-FROZEN-RESIDUE]`** — the inert `/onboarding` route + `import Onboarding` + `pages/Onboarding.tsx` survive only because `App.tsx` is gate-frozen. **Same class as `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]` from the MockBuilder lane — these should be merged into ONE "unfreeze App.tsx and sweep the residue" item.**
- **`[FU-OPS-SCRIPTS-PATH-COUPLING]`** — ~27 `scripts/ops/*.mjs` hard-read product files by path and throw ENOENT when one is deleted. None are CI-gated, so they rot invisibly. **PR-2 addresses the tutor-adjacent ones; the general hardening pass remains open.**

**Still in flight from earlier waves** (untouched by #512): `[FU-BANK-GARBLED-ANSWER-CLASS]`, `[FU-PRACTICE-CONTROLS-REFRESH-STALE]`, `[FU-TSCONFIG-EXCLUDES-TESTS]`, `[FU-PRACTICEINSIGHTS-STALE-COMMENT]`, `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`, `[FU-HPQ-PREDICTED-MOCK]`, `[FU-QP-WRITTEN-BINARY-CHECK]`.

---

## (superseded) NEXT — post-**#511 - THE 223 UNDER-STEPPED D/E ROWS NOW CARRY REAL CBSE STEP-MARKED SOLUTIONS.** Trunk `856d556`. 87 files, +831/-356; [FU-BANK-SCARCE-BAND-MISBANDING] Class (b) RESOLVED — the whole mis-banding lane is now CLOSED; 1 new FU opened.

## NEXT - 2026-07-21 (post-#511). Read this block first.

**The bank mis-banding lane is CLOSED end-to-end.** Class (a) by `#504` (44 rows relabelled off a bogus 5-mark Section-D), Class (b) by `#511` (`856d556`) — 223 genuine D/E rows that were *correctly banded all along* but whose `solutionSteps` had never been broken into the CBSE per-step scheme now carry `[N mark]` prefixes summing exactly to their marks. Validator: thin 220→**0**, bad-sum 3→**0**, compliant 1,137→**1,360**. **Do not re-open either class.**

**★★ The one thing to carry forward from #511:** the anti-fabrication guarantee was proven by **deep-comparing the assembled `canonicalQuestionBank` export at trunk vs post-edit, field-by-field across all 8,584 rows** — not by grepping the diff. Result: `forbiddenFieldChanges []`, `changesOutsideThe223 []`. **Any future data lane that must promise "I changed only field X" should prove it this way.** A diff grep shows which lines *look* touched; it cannot prove a question is unchanged.

**★ And the finding nobody expected:** forcing the per-step structure **exposed real content wrongness the collapsed one-line format had hidden** — two rows carried the solution to an entirely different question, one had an unbalanced equation, one had a source equation that ignored Pythagoras, plus an arithmetic error, a rounding slip, and one row whose whole solution was the string `"[Sample Paper 2010]"`. All fixed in #511. **Treat "the solution is one run-on paragraph" as a correctness smell, not a formatting nit.**

**The one follow-up this opened:**
- **`[FU-BANK-GARBLED-ANSWER-CLASS]`** — ~15 rows whose raw `answer` field is still OCR garbage (SAV/STAT/PROB/QE PYQ rows; their `finalAnswer` is now clean), plus **`PYQ-M-2026-CG-002`**, whose `questionText` welds a circle/tangent problem to an unrelated parallelogram proof. **Correctly out of #511's scope: that lane authors SOLUTIONS, these are QUESTION-defects and need their own pass** with the source papers (pymupdf; `pdfplumber` remains BANNED). See `OPEN_QUESTIONS_AND_FOLLOWUPS.md` for the full row list.

**Still in flight from earlier waves** (untouched by #511): `[FU-PRACTICE-CONTROLS-REFRESH-STALE]`, `[FU-TSCONFIG-EXCLUDES-TESTS]`, `[FU-PRACTICEINSIGHTS-STALE-COMMENT]`, `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`, `[FU-HPQ-PREDICTED-MOCK]`, `[FU-QP-WRITTEN-BINARY-CHECK]`.

---

## (superseded) NEXT - 2026-07-21 (post-#509).

**Wave-2 is CLOSED — one PR, two commit-sections, one handoff.** `#509` (`41277c1`) fixed the owner-reported fresh-set bug (**LIVE-VERIFIED**) and repaired all four red vitest suites, deleting **every** `--exclude` from `quality-gate.yml`. The gate is now **fully strict**: 60 files / 789 tests, no exclusions, a red suite fails CI. **Do not add a new `--exclude` — the list only ever shrinks.**

**The three follow-ups this opened, in priority order:**
1. **`[FU-PRACTICE-CONTROLS-REFRESH-STALE]`** — the tiny fast-follow. `PracticeControls`' "Refresh set" still calls the bare `regenerateQuestions()` and carries the same latent staleness the scorecard CTA had. **Owner's ruling: give it its OWN runtime trace + regression test; do NOT blind-route it through `buildFreshSet`** — it may want different semantics from "build a fresh set".
2. **`[FU-TSCONFIG-EXCLUDES-TESTS]`** — **nothing typechecks test files** (`tsconfig.app.json` excludes `*.test.ts(x)`), the root reason the four suites rotted silently. Close to free: typechecking the four surfaced exactly one error, the parity test's deliberately-untyped `.cjs` import (`TS7016`). Needs a decision on typing that import, and on a separate tsconfig project vs widening the app one.
3. **`[FU-PRACTICEINSIGHTS-STALE-COMMENT]`** — one stale comment line at `practiceInsights.ts:292`. Fold into any nearby lane.

**Still in flight from earlier waves** (untouched by #509): `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`, `[FU-HPQ-PREDICTED-MOCK]`, bank mis-banding **Class (b)** (~178 under-stepped genuine-5-mark rows), `[FU-QP-WRITTEN-BINARY-CHECK]`.

---

## (superseded) NEXT - 2026-07-21 (post-#505).

**Wave-1 Lane B (MOCKBUILDER FULL DELETION) is CLOSED.** `[FU-MOCKBUILDER-FULL-DELETE]` RESOLVED - `#505` (`b810055`) removed the whole feature: the HPQ "Mock basket", StudyPlanPage's "Quick mock" button, `buildMockBuilderUrl`, and the command-palette entry, plus A-1 the orphaned `mock_builder` paywall gate (UpgradeModal was advertising a deleted feature), A-2 the dead `utils/mockBuilder.ts` (+ its `syllabusGuard.ts` allowlist entry, root guard matrix re-run 190/190), and A-3 the stale `sitemap.xml` URL. The `/mock-builder`->`/practice-hub` redirect + `:356` nav-check are KEPT. Owner MERGED; routing observed-green on the linux CI run. **Two follow-ups fall out:**
- `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]` - a dedicated App.tsx-scoped PR: remove the inert dead `navigateToMockBuilder` case AND narrow the two overlay gates (`quick_practice`/`check_improve` `_overlay_additive_acceptance.mjs`) from "App.tsx zero-diff" to "the `/practice` + `/check-improve` route elements unchanged". The freeze is over-broad and blocks any legitimate App.tsx edit; the inert case was left ONLY to keep this deletion CI-green without touching those locked lanes' guards.
- `[FU-HPQ-PREDICTED-MOCK]` - the approved HPQ-mock feature: a `rankBy` seam on the shared `drawBalancedSet` + an additive "Predicted paper" toggle on BOTH Full Mock and Chapter Test, ranked by `getAdjustedScore`. Its own PR + a FULL Full Mock live-verify (blueprint AND predicted modes).

**Also merged to trunk `b810055` (documented in CURRENT_STATE / SESSION_LOG):** `#504` (bank Class-(a) mark relabel — [FU-BANK-SCARCE-BAND-MISBANDING] Class-a + [FU-AITIER-MARKS-MISMATCH] RESOLVED; Class-(b) ~178 under-stepped D/E solutions STILL OPEN) and `#503` (the CI-vitest gate, whose 4 `--exclude`'d test-fix FUs remain open — see the historical block below).

### (post-#503) - the CI-vitest lane, now historical (read this block first)

**Wave-1 Lane A (CI-VITEST) is CLOSED.** `[FU-CI-GATE-VITEST]` RESOLVED - `#503` (`579822e`) wired one required `Vitest suites (lazytopper)` step into the repo-root `quality-gate.yml`, linux runner. Infra-only, +24, one file. **The gate immediately paid for itself: 4 suites were already silently RED on trunk** (they rotted because vitest was never gated). They are `--exclude`'d, each its own small product/test lane that ENDS by deleting its `--exclude` line:
- `[FU-CONCEPTSPINE-TEST-STALE]` - `ConceptSpine.test.tsx`, data-drift stale.
- `[FU-OBJSCORING-PARITY-TEST-RED]` - `objectiveScoring.parity.test.ts`, Vite can't load the sibling root `../../server/routes/objectiveScoring.cjs`.
- `[FU-PRACTICEINSIGHTS-DURABLE-RED]` - `practiceInsights.durable.test.ts`, `firestore down` mock.
- `[FU-WORKSHEET-PDFEXPORT-TEST-RED]` - `worksheetPdfExport.test.ts`, `pdf.addImage is not a function` (jsPDF `vi.mock`'d).

**The other two Wave-1 lanes have since landed:**
- `[FU-MOCKBUILDER-FULL-DELETE]` - the FULL mock-builder feature deletion. A PRODUCT question (what should "Build a Mock Paper" DO now the page is gone?), not a mechanical delete - see OPEN_QUESTIONS. **(merged #505, trunk tip `b810055` — its own lane/handoff.)**
- bank mis-banding — **Class (a) SHIPPED (#504, trunk `b810055`, owner LIVE-VERIFIED):** 44 rows relabelled off a bogus 5-mark Section-D (37 MCQ/AR → A/1 format-unchanged binary; 7 short VSA → B/2, PYQ-grounded + re-authored 2-mark steps); `[FU-BANK-SCARCE-BAND-MISBANDING]` Class (a) + `[FU-AITIER-MARKS-MISMATCH]` RESOLVED. **Class (b) (~178 under-stepped genuine-5-mark rows) remains OPEN** — a different defect, its own future content lane.

### DOCTRINE TO CARRY (earned this lane)
- **A single Windows full-run is a FLAKY ORACLE, not evidence of linux status.** A ~1200s collect fires 5s timeouts on random suites; ISOLATE each suspect (or read the fast linux runner) before calling a suite red.
- **A green run that EXCLUDES a suite cannot report that suite's status.** To confirm the 4 reds on linux, a temporary `continue-on-error` diagnostic step ran only them, then was REVERTED (net diff unchanged). Prove it on the real runner; don't assume.
- **The determinism reasoning held** - mocks / module-resolution / data-drift failures are platform-independent, so they reproduce on linux. But it was proven, not asserted.
- **Put the exclusion in the workflow YAML, not config.** vitest 3.2.4 `--exclude` merges with defaults (no `node_modules` leak); local `npm test` keeps showing all 59 suites.
- **Always check the repo ROOT `.github/workflows/` before concluding a workflow is absent** - a `lazytopper/.github/` predecessor once never registered.

---

# Updated: 2026-07-20 (post-**#501 - THE QP SCORECARD DENOMINATOR BUG IS FIXED.** Trunk `7979a89`. Owner LIVE-VERIFIED "5 of 5". The scorecard "of N" now counts the DISPLAYED set, not the over-fetched pool.)

## NEXT - 2026-07-20 (post-#501). Read this block first.

**The QP scorecard lane is CLOSED - this was the last task on it.** #501 fixed the denominator (feed-only, `PracticePage.tsx`; forbidden `ResultsScorecard.tsx` / `scorecardVariants.ts` untouched); owner LIVE-VERIFIED "5 of 5". `[FU-QP-SCORECARD-ATTEMPTS-WIPED]` RESOLVED. The written-answer gap is re-scoped to the product lane `[FU-QP-WRITTEN-BINARY-CHECK]` (subjective answers checkable + graded BINARY 0/1 - that check produces the attempt signal; never fabricate attempts).

**The next Wave-1 lanes go to FRESH agents, in parallel - NOT this one:**
- `[FU-CI-GATE-VITEST]` - wire vitest into CI (it runs on linux, where it works today; nobody has added the step). The routing / aliveness / scorecard tests run locally only.
- `[FU-MOCKBUILDER-FULL-DELETE]` - the FULL mock-builder feature deletion. A PRODUCT question (what should "Build a Mock Paper" DO now the page is gone?), not a mechanical delete - see OPEN_QUESTIONS.
- bank mis-banding - a content-lane item.

### DOCTRINE TO CARRY (earned this lane)
- **Reproduce the path the OWNER used, not the one that's easy to mount.** A prior "does not reproduce" only drove the overlay seed (`source=tutor`, which bypasses preset-entry via `arrivedTargeted`); the bug lived on the FULL-PAGE path (`source=practice`). The overlay working was a false negative.
- **Correct the framing when the evidence corrects it.** An "attempted=0" written case constructed during investigation was mis-framed as half the bug; the owner's MCQ screenshot proved the bug was the DENOMINATOR only. The written "0 of N" survives only as a labeled test control.
- **Feed-only fixes stay feed-only; mutation-verify the guard.** The scorecard READ side (`ResultsScorecard` / `scorecardVariants`) was correct and FORBIDDEN; the bug was the FEED. Reverting only the `totalInSet` line reproduces "5 of 75".

---

# Updated: 2026-07-20 (post-**#492 → #494 → #496 — THE PRACTICE-HUB v6 REDESIGN IS LIVE.** Trunk `6d991c0`. Owner LIVE-VERIFIED. #498 deleted the dead MockBuilder page + the stale header comment.)

## ⏭️ NEXT — 2026-07-20 (post-hub-redesign). Read this block first.

**The practice-hub lane is CLOSED.** #492 (rebuild, routing frozen) → #494 (the grey-out) → #496 (vivid + the aliveness guard) are all merged and owner live-verified. **#498 (`6d991c0`)** deleted `pages/MockBuilder.tsx` (946 lines) and rewrote the stale header. The lane is done.

### ★ (1) The two OPEN follow-ups — read these before touching the hub again
- **`[FU-HUB-DROPDOWN-ZINDEX]` — BLOCKED ON AN OWNER DECISION, not on engineering.** The avatar dropdown is occluded by the hub cards. The root cause is verified (`DesktopShell`'s header sets `backdrop-filter: blur(12px)`, which **creates a stacking context** and traps the menu's `zIndex: 50` inside the header) and the fix is known and byte-reviewed (`position: relative; zIndex: 55` on the header — bounded `> 50` page content, `< 60` the full-screen drawers). **It cannot ship as things stand:** `DesktopShell.tsx` is an ABSOLUTE entry in the `FORBIDDEN` list of `check_improve_convergence_acceptance.mjs`, which runs on every PR with no lane-scoping and no exception mechanism — and there is no fix from outside the file, because the dropdown LIVES in `DesktopShell`. Two honest options only: amend the FORBIDDEN list as its own reviewed decision, or leave it deferred (it is cosmetic). **Do NOT silence the gate.**
- **`[FU-QP-SCORECARD-ATTEMPTS-WIPED]` — RESOLVED by #501 (see the top block).** ⚠ The diagnosis recorded here was WRONG and is kept only as historical record: the bug was the **DENOMINATOR**, not "0 attempted" and not a Refresh-set wipe, and `50` was the over-fetched POOL size (which varies), not `COUNT_SOFT_MAX`. The "not reproduced" claim was a false negative from testing only the overlay seed. The scorecard "of N" read `questions.length` (the pool) instead of `filteredQuestions.length` (the displayed set); fixed feed-only. Do NOT act on the superseded text below.

### ★★ DOCTRINE TO CARRY (earned this lane)
- **To prove a URL contract didn't move, CAPTURE BOTH SIDES AND DIFF.** One harness whose selectors match both vocabularies, run against trunk and the rebuild. Inspection cannot prove 25 URLs.
- **"Strictly frozen" can itself BE the regression** — reusing an existing builder that silently drops scope is not preservation.
- **MEASURE the rendered style before "restoring" it.** Two of three specced visual fixes were already present; the whole defect was one `opacity` line multiplying every descendant.
- **A commit-scoped gate needs a COMMIT.** The forbidden-path check diffs `base...HEAD`; a matrix run BEFORE committing prints a truthful-but-useless green. `scope:guard` is the mirror-image exception — it reads the working tree, so it runs pre-commit.
- **A spec can scope a forbidden file; only the gate decides what merges.**
- **Mutation-test every guard, and don't over-tighten it.** The aliveness guard's stripe check is a floor (≥ 0.8), not an equality — the strict form would have failed trunk AND the prototype.

### ★ SCOPE BOUNDARY — the practice-hub redesign is a SEPARATE lane
#492 (v6 redesign) + #494 (the opacity fix) are merged and a closing hub PR is open. **That lane gets its OWN handoff, written when it closes** — do NOT fold it into the tutor arc. ⚠ **Do NOT delete `feat/desktop-pr-hub-polish-close`** — it is unmerged work belonging to that lane.

### ★ (1) The open follow-ups from this arc (all small, none blocking)
- `[FU-QP-OVERLAY-INMEMORY-HANDBACK]` — the overlay uses the storage round-trip hand-back; mirror C&I's in-memory Option 2b (needs a small in-process record+payload builder).
- `[FU-CI-OVERLAY-NAMED-RETURN]` — C&I's overlay chrome is still a bare ✕ (aria-label only); give it the named return QP got in #495, for parity. Deliberately not done in #495 to keep C&I byte-identical.
- `[FU-QP-OVERLAY-CONTAINED-NAV-LABELS]` — the contained navigator turns residual in-panel navs into "return to the tutor" (safe, never dead-ends), but those controls' LABELS still name destinations they no longer reach in overlay mode. Suppress or relabel them in overlay mode.
- `[FU-QP-MULTITOPIC-EXAM-WEIGHT]` — swap `topicShare()` from bank-availability to exam-trends weight (a one-function edit by design; needs `getTopicWeight()` exposed).

### ★★ DOCTRINE TO CARRY (earned the hard way this arc)
- **A test for anything that renders inside the app's router/shell MUST reproduce the production wrapper tree** — an outer router at the real nesting depth — **and include a CONTROL case that reproduces the bug.** Mounting in isolation proves structure, not production. And check what your GATE asserts: #490's gate asserted the defect (that a nested router was mounted).
- **Gates prove the machinery; only live-verify proves the experience.** #481 shipped unreachable, #484 a broken gesture, #490 an illegal router — all green on gates and CI, all caught by the owner's live eyes. A novel render/routing pattern gets live-verified on the Vercel preview BEFORE merge.
- **Spike a proposed fix against the real library before building it.** The obvious `<Routes location>` fix ALSO threw (parent-base invariant); only running it revealed that. Don't reason about an API — execute it.
- **Mutation-verify load-bearing assertions** — "not green until I've made it fail" — and verify the mutation actually landed in CODE (mine once landed in a comment the gate strips, and falsely "passed").
- **Re-run git-scoped gates POST-COMMIT** — a three-dot `base...HEAD` forbidden-diff passes falsely on uncommitted work.
- **Revert-first when production is broken and the fix isn't quick AND certain.**

---

# Updated: 2026-07-19 (post-**#488 — QP MULTI-TOPIC PRESETS LIVE.** Trunk `9edb939`. Owner LIVE-VERIFIED, both Maths & Science. A ≥2-topic hub selection now produces a genuine pooled-and-shuffled mixed set (shape 3c: per-topic fan-out + merge). Single-topic byte-identical, zero engine edits, `sessionRecords.ts` byte-identical. **The QP SURFACE arc is COMPLETE — reachable, navigable, single + multi-topic.**)

## ⏭️ NEXT — 2026-07-19 (post-#488). Read this block first.

**#488 shipped Piece 2 (multi-topic); this is its docs handoff.** The QP surface is done end-to-end (entry, reachable, navigable, single + multi-topic). What remains, in order:

### ★ (1) THE QP OVERLAY ON THE TUTOR — the C&I overlay's twin — dispatch as an INVESTIGATION lane FIRST
Host the real `PracticePage` over the tutor (reused verbatim), retiring the navigate/poll for the practice leg — the second of the two in-tutor overlays. **Investigation first:** does `PracticePage` render cleanly in a tutor panel? how does the **chooser→built** flow behave in a panel vs a page (the QP entry redesign AND multi-topic both live in that one component now)? ★ The graded-context READ is **already done** for QP — `composePracticeRecordReturnOpener` is the reference impl C&I's `returnedWork` block copied — so the overlay is only the HOSTING work. ⇒ **[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] STILL HELD for the practice leg** — the QP overlay is what retires them; a HOLD with a reason, do not "just fix."

### ★ (2) [FU-QP-MULTITOPIC-EXAM-WEIGHT] — the small fast-follow
Swap `topicShare()` from bank-availability to exam-trends weight — a one-function edit by design (needs `getTopicWeight()` exposed, currently private in `predictionScoring.ts`). Do after the overlay, or as filler.

### ★★ DOCTRINE TO CARRY (earned #488)
- **AN INVESTIGATION LANE EARNS ITS KEEP BY FALSIFYING THE SPEC'S FRAMING FROM THE CODE, not just answering its questions.** #488's spec offered a 3a/3b fork; the investigation proved **3b structurally impossible** (`focusBankIds` only re-orders a pool already hard-scoped to one `topicKey` at `practiceSetGenerator.ts:287`) and found **3c** (mirror the shipped per-section fan-out, keyed on topic) — reusing the working machinery per-topic beat both spec options with **zero engine edits**.
- **A FORBIDDEN-FILE GUARD THAT DIFFS `base...HEAD` (three-dot) PASSES FALSELY ON UNCOMMITTED WORK.** #488's first cut edited `sessionRecords.ts` (on lane #476's forbidden list); the ops-matrix guard went green because the change wasn't committed yet. Caught by reasoning about the guard, not by the guard. ⇒ COMMIT before trusting a git-scoped guard; keep the additive change OUT of the forbidden file (moved `topicKeys` to the non-forbidden QP service). Strengthens `[FU-CI-GATE-VITEST]` — the new suites (pure 18/18 + router 4/4) ran locally only.
- **Re-derive trunk EVERY session** via `git ls-remote`; ⚠ CLAUDE.md §2's HEAD==`CURRENT_STATE`-SHA check is structurally unsatisfiable after a docs PR advances trunk (`[FU-CLAUDE-MD-SESSION-START-SHA]`) — verify HEAD is trunk and proceed, don't stop.

---

# Updated: 2026-07-19 (post-**#483 → #486 — THE QP A1 ENTRY REDESIGN NOW WORKS.** Trunk `889ab6d`. All four owner LIVE-VERIFIED. The #481 presets are now reachable from the hub (#483, source-keyed gate) AND navigable both ways — browser-back (#485, real `built=1` history entry) and the breadcrumb "Back" CTA (#486) both return to the preset chooser. **The honest two-step: #484 shipped a broken no-op push that passed every gate + CI + 14/14 [the test never mounted a router], owner live-verify caught it, #485 fixed it with a real search param + a router-mounted test.** Engine/presets/persistence/hub byte-identical throughout.)

## ⏭️ NEXT — 2026-07-19 (post-arc). Read this block first.

**The QP fix-arc (#483→#486) is COMPLETE and this is its combined docs handoff.** The QP A1 entry is now reachable and navigable. Two things remain in the QP line of work, in order:

### ★ (1) PIECE 2 — MULTI-TOPIC PRESETS — dispatch as an INVESTIGATION lane FIRST (un-parks `[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED]`)
Let the preset entry carry a multi-topic scope rather than collapsing to a single topic (today the hub's multi-topic selection arrives as `topic=<first>` and the presets build against the first topic only). **Do NOT jump to a build** — the fetch fork (3a/3b) and **rotation-across-topics** semantics (how `seenQuestionIds`/`sessionRotationOffset` behave across a multi-topic pool) are **unverified**. Investigation first, then a staged build. This is a **NEW lane with its own future handoff** — not part of this arc.

### ★ (2) THE QUICK PRACTICE OVERLAY — the C&I overlay's twin (groundwork mapped earlier this arc)
Host the real `PracticePage` over the tutor (reused verbatim), retiring the navigate/poll for the practice leg — the second of the two in-tutor overlays. Carry the graded-context doctrine: a change to the model's input ships on a LIVE eval, and QP already hands the tutor its graded work via `perQuestionRef` (the C&I `returnedWork` block is the reference impl). ⇒ **[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] STILL HELD for the practice leg** — the QP overlay is what retires them; a HOLD with a reason, do not "just fix."

### ★★ DOCTRINE TO CARRY (earned this arc — the two lessons)
- **LIVE-VERIFY REACHABILITY AND THE GESTURE, not just correctness.** #481 shipped unreachable; #484 shipped a broken back-gesture. BOTH passed every green gate and CI. Green gates prove the code is *structurally right*; only walking the real navigation on the stable link proves the entry condition *occurs* and the gesture *works*. ⇒ `[FU-QP-PRESETS-UNREACHABLE]` (#483), `[FU-QP-BACK-NAV]` (#485/#486).
- **A ROUTER/HISTORY claim needs a ROUTER-MOUNTED test, never a pure-helper test alone.** #484's 14/14 asserted the decision logic in isolation but never mounted a router to prove the history entry is *created and poppable* — that is exactly what let it ship broken. #485/#486 use `createMemoryRouter` harnesses. **Strengthens `[FU-CI-GATE-VITEST]`** — these router tests only ran locally (Windows rollup workaround); CI doesn't run vitest, so they don't gate PRs yet. Do NOT close it.
- **When a spec keys a gate on a discriminator, map EVERY producer of that URL before trusting the spec's enumeration** — #483's "only tutor carries a topic" premise was wrong (~21 entrypoints did); the correct fix was the inverse of the spec's literal rule.
- **Re-derive trunk EVERY session** via `git ls-remote`; ⚠ CLAUDE.md §2's HEAD==`CURRENT_STATE`-SHA check is structurally unsatisfiable after a docs PR advances trunk (`[FU-CLAUDE-MD-SESSION-START-SHA]`) — verify HEAD is trunk and proceed, don't stop.

---

# Updated: 2026-07-19 (post-**#481 — QUICK PRACTICE A1: PROGRESSIVE-DISCLOSURE ENTRY + OPTIONAL TIMER.** Trunk `ec3275c`. Owner LIVE-VERIFIED. QP now opens on four preset cards + Customise (full five-dim filter incl. Source) + optional timer + mobile carousel — presentation-only, engine/rotation/persistence byte-identical. ★★ **But the presets shipped correct-but-UNREACHABLE** — gated on a topic-less "direct visit" state that production never produces (every route carries `topic=` → auto-build) — **owner live-verify caught what green gates could not.** The hub-reachability fix (Piece 1) is in flight.)

## ⏭️ NEXT — 2026-07-19. Read this block first.

**#481 shipped the QP A1 entry; this session is its docs handoff.** Three things, in order — the first two are BATCHED into a combined handoff later (owner ruling); this handoff closes **#481 only**:

### ★ (1) QP HUB-REACHABILITY FIX — Piece 1 (dispatched, `feat/desktop-pr-qp-presets-hub-reachable`)
Re-gate the preset entry on **`source`**, not on the absence of a `topic` param: `source=practice` (hub/direct) → show presets; `source=tutor` (the tutor hand-off) → auto-build and bypass. #481's presets are correct but never render in production because every real QP route carries `topic=` (hub → pick topic → CTA) → `arrivedTargeted` → auto-build. ⇒ `[FU-QP-PRESETS-UNREACHABLE]`.

### ★ (2) MULTI-TOPIC PRESETS — Piece 2 (un-parks `[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED]`)
Let the preset entry carry a multi-topic scope (the hub can pass more than one topic) rather than collapsing to a single topic. Batched with Piece 1 in the combined handoff.

### ★ (3) THE QUICK PRACTICE OVERLAY — the C&I overlay's twin
The overlay MECHANISM (hosting the real `PracticePage` over the tutor, reused verbatim) — the second of the two in-tutor overlays. Carry the graded-context doctrine: a change to the model's input ships on a LIVE eval, and QP already hands the tutor its graded work via `perQuestionRef` (the C&I `returnedWork` block is the reference impl).

### ★★ DOCTRINE TO CARRY (earned this arc)
- **LIVE-VERIFY REACHABILITY, NOT JUST CORRECTNESS.** A spec that scopes a feature to an unreachable URL state ships something invisible. Green gates prove the code is *right*; only walking the real navigation proves the entry condition ever *occurs*. #481's presets were byte-correct and never appeared. ⇒ `[FU-QP-PRESETS-UNREACHABLE]`.
- **Re-derive trunk EVERY session** via `git ls-remote`; **three-way diffs**; **`merge-base --is-ancestor`** before believing a stacked PR landed.

---

# Updated: 2026-07-18 (post-**#478 + #479 — THE TUTOR READS THE GRADED WORK.** Trunk `a198bf1`. Owner LIVE-VERIFIED + a real 28-call rubric-2 eval. On C&I overlay return the tutor now names the question AND the actual lost step (question + per-step digest reach the model via `returnedWork`); #479 flipped `RETURNED_WORK_DIGEST_ENABLED` ON after the live eval showed the digest CLOSES a confabulation path. **The C&I overlay + graded-context arc is COMPLETE; the QP loop overlay is its twin, and it is next.**)

## ⏭️ NEXT — 2026-07-18. Read this block first.

**The graded-context arc shipped (#478 seams + #479 digest); this session is its docs handoff.** ONE thing is next: **the Quick Practice loop overlay** — the second of the two overlays the whole line of work serves (QP + C&I in-tutor, so a student never leaves the thread).

> **★ Carry the graded-context doctrine into the QP overlay:** a change to the **model's input** ships on a **LIVE eval**, not a byte-diff — #479's flip was decided by 28 real `gemini-2.5-flash` calls (rubric-2 clean, 12/12 digest-ON runs grounded), and the eval found the flag ON is **safer** than OFF (question-only, the model *assumes* which steps were right; the digest lets it read the `status` list). When the QP overlay feeds its own graded work to the model, gate it the same way. ★ Confirm the QP `returnedWork`/question-to-model lane matches the C&I one #478 just shipped (`composeCheckImproveRichReturnOpener` + the `returnedWork` block are the reference impl). ★ Eval-harness recipe (reusable): load `.env` from the MAIN checkout, `require` the server `.cjs` from the WORKTREE (pure node, no `node_modules`), drive the real `handleTutorRequest` (`isStubMode → false`); openers/payloads are the deterministic acceptance-script values — don't re-run the model to get them.

### ★ (1) THE QUICK PRACTICE OVERLAY — the C&I overlay's twin (groundwork mapped this session)
Mirror what #476 did for C&I: the tutor's "Practise this" CTA opens the **real `PracticePage` as an in-tree panel** over the tutor (right-slide desktop/tablet, full-screen mobile sheet), the student practises, and the result is handed back — retiring the navigate/poll for the practice leg. Verified this session that **QP is already overlay-ready in most respects:**
- `PracticePage.tsx` is **ONE component** (zero `useIsDesktop`) — no twin to fight.
- It **auto-builds a concept-scoped set on tutor entry** (`:641 arrivedTargeted → setIsBuilt(true)` when a `topic` param is present).
- It **already has a scorecard** (the same `ResultsScorecard`, QP variant).
- It **already streams a return payload** (`practiceInsights/attempts`, matched by `matchReturningAttempts`).

**Pieces still needed (staged — do NOT bundle):**
- **Stage 1 (presentation, safe now):** A1 progressive disclosure (`[FU-QP-PROGRESSIVE-DISCLOSURE]`, mockup owner-approved — ★ presets are **DIRECT-VISIT only**; tutor entry auto-builds, bypassing them) + an optional student-toggled timer.
- **Stage 2 (investigation, entangled — investigate together):** type-scoped tutor entry ("3 MCQs on this concept" ⇒ wire `getQuestionIdsForQType → focusBankIds`; **type is NOT carried today**) AND QP durable session identity (name each set at "start practising" so the scorecard is a referenceable record, like C&I).
- **Parked (off the tutor path):** `[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED]` + `[FU-QP-FILTER-SYSTEM-AUDIT]`.

⇒ **[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] — STILL HELD FOR THE PRACTICE LEG.** #476 retired the navigate/poll/banner for the **check-improve** leg (the overlay replaced it); the **practice** leg still routes out and keeps `count:5` + the banner. The QP overlay is what retires them there — a HOLD with a reason, do not "just fix" them.

### ★ DOCTRINE TO CARRY (earned across this arc — not decoration)
- **Re-derive trunk EVERY session** via `git ls-remote origin base/approved-thru-437`. Never trust a written SHA — ⚠ CLAUDE.md §2's HEAD==`CURRENT_STATE`-SHA check is **structurally unsatisfiable** after a docs PR advances trunk past the SHA it records (`[FU-CLAUDE-MD-SESSION-START-SHA]`); verify HEAD is trunk and proceed, don't stop.
- **Three-way diffs from `git merge-base`**, never two-dot — a two-dot diff against a moved trunk shows other lanes' work as your deletion.
- **Verify by RUNNING, not reading.** Both #476 gates were RUN on the tree, not trusted. A frozen spec premise about a hook's scope (`useIsDesktop`) was incomplete — tracing what the hook ACTUALLY gated (chrome, not just camera) is what caught it, same species as #472's 6th site.
- **`git merge-base --is-ancestor pr/N origin/base/approved-thru-437`** before believing a stacked PR merged — the orphan trap fired THREE times the convergence arc.

---

## ⏭️ SESSION CLOSED — 2026-07-17. (Prior — the NCERT tutor arc.)

### ⚠️ [FU-TUTOR-CJS-STALE-PLUMBING-COMMENT] — **the one open item #464 left**
**`lazytopper/server/routes/tutor.cjs:101` is FALSE on trunk right now:** *"`hasNcertPage` is **plumbing only today: figurePanelBlock() does not read it yet**, so this changes nothing the model sees. **Using it is the tutor-round-trip lane's sequenced task.**"* — **#464 made `figurePanelBlock` read it** (`tutorSystemPrompt.cjs:264` + the `:269` gate). ⇒ **a SPENT INSTRUCTION LEFT IN PLACE, and it is the very comment that dispatched #464.** ★★ **Grep `hasNcertPage`, land there, and you will conclude the work is undone and possibly redo it.** **It is done. Live. Owner-verified.** **Fix = strike/replace that comment IN PLACE** (the #451/#454 ruling: *a stale instruction is worse than none — it looks like diligence*). **Comment-only; PRODUCT file ⇒ needs an owner-approved product PR** (it could not ride the docs-only PR that logged it, §8).

### ★ NEXT SESSION'S WORK (specced by the owner, deliberately NOT started tonight)
**Quick Practice + Check & Improve as IN-TUTOR OVERLAYS**, reusing the real pages **verbatim**. ⇒ **[FU-TUTOR-ROUNDTRIP-COUNT-5] (the hardcoded `count: 5`) + [FU-TUTOR-WAITING-BANNER] (the "tutor is waiting" banner / scorecard-return-row) REMAIN HELD** — that architecture would make the round-trip **banner/count-link mechanism secondary**, so building either now risks throwing it away. ***A HOLD with a reason — do NOT "just fix" them because they look like one-liners.***

### ★ Standing lessons this session earned — apply them, they are not decoration
- ★★ **A CORRECTION THAT IS NOT PUSHED DOES NOT EXIST** (#462/#463). If a claim you have **already discovered to be false** sits in an open PR, **SAY SO** — that outranks waiting politely for approval on the mechanism that would fix it. *Saying it needs no approval.*
- ★★ **A GREEN GATE CAN PROVE NOTHING.** Four instances tonight: an **unrun vitest suite** ([FU-CI-GATE-VITEST], **escalated — owner wants its own priority conversation**); **`scope:guard` returning `no changes`** on a rebased (clean) tree; **prompt gates that do not read English**; and **`TSC EXIT: 0` from `$?` after a pipe** (that is `tail`'s status — run tsc **bare**).
- ★★ **ONE RENDERED EXAMPLE IS NOT COVERAGE** — #464's harness caught a real bug (an unconditional directive describing a marker absent from its own list) that the mixed-case render could not. **Assert the ABSENT cases.**
- ★★ **CARRY THE QUESTION, NOT THE EXPECTED ANSWER.** Two dispatches in a row named the wrong location: #460's *"gate in `useTutorSession.ts`"* (there is none — it is `TutorPage.tsx:356`) and #464's *"`tutor.cjs:226`"* (`figurePanelBlock` is in **`tutorSystemPrompt.cjs:226`**; `tutor.cjs:226` is an unrelated canned turn). **Right line number, wrong file — twice. Re-derive the location; never copy a line number without re-confirming its file.** ⚠ **Watch for a third occurrence.**
- ★ **DOCS-vs-DOCS is a real collision class** (the 13th stale-base catch): two docs lanes prepend to the same six files ⇒ **all six conflict**, and **a UI merge can duplicate a header / break structure** — no gate reads `handoff/`. **Confirm no other docs PR is open BEFORE cutting one**, and **re-verify every cross-lane claim AT REBASE.**

### Branch cleanup
**The owner does ONE sweep** across everything accumulated tonight. **No agent action** (§3 — branch deletion is never auto-approved).

---

# (superseded) Updated: 2026-07-17 (post-PR **#460 — A STUDENT WHO ASKS TO PRACTISE GETS THE HAND-OFF.** **Live trunk `7be651d`** (`be200cb` is only #460's squash; #461 `d364d03` + #463 landed after). Owner BYTE-REVIEWED, then LIVE-VERIFIED **all three probes**: direct ask → CTA · *"Can you give me an example?"* → **taught, NO CTA (the boundary held)** · offer→agree → CTA unregressed. **1 file, PROMPT TEXT ONLY.** ★★ **The dispatch pointed at a gate that does not exist** — `useTutorSession.ts` only ATTACHES the tag (`:345`); the real gate is **`TutorPage.tsx:356`**, firing on **tag PRESENCE** with no agreement-state condition ⇒ the restriction lived **entirely in the prompt's English**, and editing `useTutorSession.ts` as instructed would have **invented a client-side coupling the design deliberately kept server-side**. ✅ **#457 + #459 ARE documented — by #461 (`d364d03`).** *(**CORRECTED BY #463.** This line originally said they were undocumented: **true when written, FALSE within the hour** — #461 merged mid-write and paid that exact debt. ★★ **The correction was written but NEVER PUSHED** — it sat on an unpushed local commit behind a `--force-with-lease` approval that was requested and not granted, while the conflict was resolved in the GitHub UI from the pre-correction commit and merged ⇒ **the false claim went live in six files.** ***A correction that is not pushed does not exist*** — **if a claim you already know to be false is sitting in an open PR, say so; that outranks waiting politely for approval on the mechanism that would fix it.** ★ The **13th** stale-base catch and the **first docs-vs-docs** one — a **new collision class**: two docs lanes prepending to the same six files. **Re-verify every cross-lane claim AT REBASE.**)*)

## ⏭️ IMMEDIATE NEXT — [FU-TUTOR-NCERT-PROACTIVE-MENTION], **UNBLOCKED**, off trunk `be200cb`

**The goal:** when a signalled figure's concept **has a real NCERT page**, the model should **proactively SAY so in plain words a student would understand** (*"there's also the real textbook page for this"*). ★ **NEVER make the student ask — a 15-year-old will not know the trigger phrase.**

**★ `hasNcertPage` is VERIFIED PRESENT IN CODE** (checked, not inferred from *"#457 landed"* — a landed PR is never proof a field shipped):
`conceptVisualCatalogue.ts:226` (on `CatalogueFigureOption`) → `:253` (`Boolean(row.ncertPage)`) → `tutorClient.ts:50` (wire) → **`tutor.cjs:111`** (rebuilt + coerced `=== true`).

**★★ The code names its own seam — `tutor.cjs:101`:** *"`hasNcertPage` is plumbing only today: `figurePanelBlock()` does not read it yet, so this changes nothing the model sees. Using it is the tutor-round-trip lane's sequenced task."*
⇒ **The work is in `figurePanelBlock()` (`tutorSystemPrompt.cjs:226`)**, which today filters options to **key/label only** and lists them as `- <key>: <label>`.

⚠ **`normalizeFigures` (`tutor.cjs:104`) is the TRUST BOUNDARY and REBUILDS each option** — its own comment: *"every new option field must be whitelisted HERE as well, or it is silently dropped and can never reach `buildTutorSystemPrompt`."* `hasNcertPage` **is** already whitelisted; remember this for any future field.

**Re-derive all of the above from the code before starting — do not trust these line numbers.** #457/#459 moved this area and it may move again.

**★★ HELD — do NOT build (unchanged):** the hardcoded **`count: 5`** and the **"tutor is waiting" banner / scorecard-return-row**, both pending the **overlay-architecture investigation** (QP + C&I may become **in-tutor overlays reusing the real pages verbatim** ⇒ the round-trip banner/count-link mechanism becomes **secondary**). *A HOLD with a reason — do not "just fix" them because they look like one-liners.*

---

# (superseded) Updated: 2026-07-16 (post-PR **#456 — THE TUTOR READS QP'S GRADED WORKING.** Squash `dfe3144`; **live trunk `084442b`** because **#457 landed on top mid-docs-write — the 12th stale-base catch, the second in two hours; #457's docs are owed by THAT lane.** Owner BYTE-REVIEWED the pushed diff, then LIVE-VERIFIED: ***"it does correctly identify the mistakes I made."*** The tutor's practice return-opener now names **where** a mark went, sourced from QP's own durable session record (#436) whose payload carries the **same grader's** per-step detail — QP's written-working path runs the **same grader as C&I**. ★ **Squash-merged ⇒ branch SHA `433135a` is NOT in trunk's ancestry — verify the CODE (`tutorRoundTrip.ts:125`), not the commit graph.**)
# Updated: 2026-07-17 (post-PR **#457 + #459 — ★★ THE NCERT PAGE ARC: DORMANT → LIVE → WINNABLE. Trunk `27e6ec2`** (`084442b` = #457's squash). **This docs PR pays BOTH debts — #458 recorded "#457's docs are OWED BY THAT LANE".** Owner BYTE-REVIEWED both pushed diffs, then **LIVE-VERIFIED ×3: maths p.11 · science p.132 · electricity·Ohm's law (the inline body)** — different subjects, Storage paths and offset entries ⇒ the pipe is reachable **generally**. **#457:** the affordance was **BUILT AND DORMANT, not missing** — `ExplanationPanel` already rendered the button whenever a row carried `ncertPage`; **zero of 54 rows had one** ⇒ pure data: **54→73 rows**, **65** with a page, coverage **13→22 topics**, `data.ts` **`306 added / 0 deleted`** (git *proving* the 54 originals untouched). **#459:** `resolveConceptVisual`'s own comment stated the ceiling — *"offered ALONGSIDE the body ... NOT as the body itself"* ⇒ a **whole-chapter** interactive outranked an **exact page** at ANY fit. New priority **in-play exam figure → real figure → NCERT page → interactive → gap** (**15 of 73 rows change**). ★★ **THE CATALOGUE IS TWO FILES AND ONLY ONE SHIPS** — `handoff/curation/conceptFigureCatalogue.curated.ts` is imported by **NOBODY** (app tsconfig includes only `src`); the wired copy is `conceptVisualCatalogue.data.ts`. **They had ALREADY DRIFTED** (#448's gap-fill rows + the label fixes lived only in `data.ts`) ⇒ always re-sync **curated ← data**; nothing enforces it ⇒ **[FU-CATALOGUE-SYNC-GUARD]**. ★★ **THE REPO'S OWN NCERT PAGE DATA IS UNTRUSTWORTHY — open the PDF:** a spec's `page_pdf` is **0-based in some specs and 1-based in others** (25/62 off by one; **Light's is plain wrong** — `fig_99` derives p.144, the caption is p.**143**), the **`source_ledger` misplaces electricity** (series p.192→really **182**, parallel 186→**185**, Ohm's law 176→**175**), and the field is named **three ways** (`printed_page`|`page_printed`|`ncert_page`). Verify folio **AND** section heading on the page. ★★ **PHOTOSYNTHESIS IS A VOCABULARY GAP, NOT A CATALOGUE GAP** — no such row exists in `boardEssentials` and CI hard-fails any non-live label; life-processes was already 5/5 ⇒ **do NOT re-file it as coverage**. ★★ **[FU-CI-GATE-VITEST]'s CEILING WAS WRONG — it is CHEAP, not hard:** vitest **runs on Windows** (drop the matching `@rollup/rollup-win32-x64-msvc` into rollup's own `node_modules`; **92/92**, local only, nothing committed) ⇒ **the real blocker is that nobody wired vitest into the linux CI job that already exists and already works.**)

## ⏭️ IMMEDIATE NEXT — the tutor prompt lane (post-#459), off trunk `27e6ec2`

### 1. ★ NCERT PROACTIVE-MENTION PROMPT FIX — **NOW UNBLOCKED; the field is CONFIRMED to arrive**
`hasNcertPage` reaches the prompt builder's doorstep and **survives the wire** — verified through `CatalogueFigureOption` → `TutorFigureOption` → **`normalizeFigures`** (which **REBUILDS** each option as `{key,label}` at the trust boundary and would otherwise have dropped it **by construction**; it now whitelists the field). **Nothing reads it yet and the prompt text is byte-identical** (`figurePanelBlock` renders only `` `- ${f.key}: ${f.label}` ``; `figures` is never `JSON.stringify`'d) ⇒ **the model still has NO idea NCERT pages exist**, which is exactly why it flatly answers *"I cannot open NCERT pages."*
**Your task: `figurePanelBlock` in `server/prompts/tutorSystemPrompt.cjs` — read `hasNcertPage` and have the model proactively say, in plain words a student would understand, that the real NCERT page is there.** ★ **Never ask the student to request it — a 15-year-old will not know the trigger phrase.** ★★ **This is a PROMPT change only. The button/inline page is UI: `ExplanationPanel` gates it purely on `visual.ncertPage`, and the model neither controls nor knows about it — the model picks WHICH concept via `[[figure:<key>]]`; the UI alone decides whether a page exists and renders it. That boundary is CORRECT — do not "fix" it by feeding the page to the model.**

### 2. `[[offer:practice]]` DIRECT-ASK CTA WIDENING — **#460 is OPEN (draft)**, that lane owns it.

**★★ HELD — do NOT build either, regardless of how small they look:** the hardcoded **`count: 5`** in the practice round-trip href · the **"tutor is waiting" banner / scorecard-return-row**. Both wait on the **overlay-architecture investigation** (QP and C&I may become **in-tutor overlays reusing the real pages verbatim**, making the banner/count-link mechanism **secondary**). *A HOLD with a reason, not a backlog line.*

---

# (superseded) Updated: 2026-07-16 (post-PR **#456 — THE TUTOR READS QP'S GRADED WORKING.** Squash `dfe3144`; **live trunk `084442b`** because **#457 landed on top mid-docs-write — the 12th stale-base catch, the second in two hours; #457's docs are owed by THAT lane.** Owner BYTE-REVIEWED the pushed diff, then LIVE-VERIFIED: ***"it does correctly identify the mistakes I made."*** The tutor's practice return-opener now names **where** a mark went, sourced from QP's own durable session record (#436) whose payload carries the **same grader's** per-step detail — QP's written-working path runs the **same grader as C&I**. ★ **Squash-merged ⇒ branch SHA `433135a` is NOT in trunk's ancestry — verify the CODE (`tutorRoundTrip.ts:125`), not the commit graph.**)

## (SUPERSEDED by the post-#459 pointer above) IMMEDIATE NEXT — tutor CTA + prompt work (post-#456), off trunk `084442b`
> **Kept for reasoning only. Item 2's blocker is CLEARED (`hasNcertPage` now arrives — see above); item 1 is #460's, open in draft. The HOLD below still stands.**

**★★ HELD — do NOT build either, regardless of how small they look:**
- **the hardcoded `count: 5`** in the practice round-trip href (`PracticePage.tsx`'s CTA-href count — do not touch it)
- **the "tutor is waiting" banner / scorecard-return-row** (do not add ANY scorecard-return UI)

**Both wait on a separate OVERLAY-ARCHITECTURE INVESTIGATION:** QP and Check & Improve may both become **in-tutor overlays reusing the real pages verbatim**, which would make the round-trip **banner/count-link mechanism secondary**. **Building either now risks throwing it away shortly after.** *This is a HOLD with a reason, not a backlog line — do not "just fix" it because it is a one-liner.*

### 1. WIDEN THE `[[offer:practice]]` CTA TRIGGER SET — dispatched, do this first
Today the sentinel fires **only when the tutor itself offers and the student agrees.** Add the **second path**: if the student **directly asks** to practise in the same turn (*"I want to try a few questions"*), the **same sentinel** fires — **do not require the tutor to have offered first.** *Same mechanism, wider firing condition.* Files: `tutorSystemPrompt.cjs` + wherever the sentinel is currently gated in `useTutorSession.ts`. **Re-derive the CURRENT gating from the code — do not trust this line's description of it.**

### 2. NCERT PROACTIVE-MENTION PROMPT FIX — **SEQUENCED, confirm the field first**
Once `hasNcertPage` (a boolean per figure option the model receives from `catalogueFiguresForTopic`) **exists**, add prompt guidance so the model **proactively says** *"there's also the real NCERT page for this"* **in plain words a student would understand** — ★ **never ask the student to request it: a 15-year-old will not know the trigger phrase.** **#457 (`084442b`) HAS LANDED** — the catalogue lane's NCERT-page work — so **re-derive trunk and CONFIRM the field actually reaches the model's options before starting.** *A landed PR is not proof the specific field exists; check the code.*

---

# (superseded) Updated: 2026-07-16 (post-PR **#454 — ★★ THE QR LANE IS COMPLETE. The last wire (Check & Improve) is LIVE, trunk `a8be752`, owner BYTE-REVIEWED the pushed diff then LIVE-VERIFIED.** **THE ARC, done — do NOT redo any of it:** **#441** (`9ebb87c`, the channel: Storage blob + Firestore coordination doc, both server-side via firebase-admin; **ONE wire lit THREE surfaces** — CT in-test, CT result, Full Mock — because `ChapterTestUploadPanel` is shared; *wire the shared component, not each page*) → **#443** (`5aaaeec`, hardening + the **live pre-existing** "PDF up to 5 MB" that was **never spendable on EITHER path** — base64 ×4/3 vs `readJson`'s 5 MB cap ⇒ `uploadLimits.ts` @ **3.5 MB**, negative-tested cap assertion) → **#447** (`d99c14d`, QP + HPQ + TopicHub via the shared `SolutionChecker`, `mode="photo"`, QR **inside the upload panel as a sub-mode, never a third peer**) → **#451** (`c132f27`, **the C&I guard that never existed** — not a wrong ceiling, **NO ceiling**: size AND type, all four inputs, both pages, via the shared `checkUploadFile()`) → **#454** (`a8be752`, the last wire: C&I, 1 file +47/−0, **desktop-only**). **#454's shape: `mode={isMultiQuestion ? "document" : "photo"}`.** ★★ **THE FU's OWN INSTRUCTION SAID `mode="photo"` AND IT WAS WRONG-SHAPED** — **C&I is BIMODAL**, the only host so far that is not one shape: multi-question (`isMultiQuestion`, `:756`) = the answers to a **WHOLE PAPER**, one multi-page PDF (the page's own `:1765` comment: the solution upload *"accepts a PDF for BOTH single- and multi-question"*), and `"photo"` there is **precisely** the failure `QrAnswerHandoff`'s `mode` was invented to prevent (its docblock: *"'photograph your answer' makes a student shoot page 1 of a 20-question mock and walk away believing they are done"*); single-question = the photo IS the answer. `isMultiQuestion` settles on the **QUESTION** upload's detection, **BEFORE** the answer upload is reachable ⇒ **no race, no undefined-mode window.** Owner live-verified **the multi-question PDF-leading copy** — the page-1 trap cannot happen. **Mobile `CheckImprove.tsx` deliberately UNTOUCHED** — `QrAnswerHandoff` → `useIsDesktop()` → **null <1024px** ⇒ a QR there could never render; **a QR on a phone is meaningless, the camera is already there.** Mobile got #451's guard and no QR. **Reset is STRUCTURAL** (`!imageBase64` gates the mount ⇒ delivery unmounts + cancels polling, `clearImage` remounts fresh `idle`) — no new reset code, in #447 or #454. ★★ **THE TWO LESSONS THIS ARC EARNED — apply to EVERY future FU, not just QR: (1) CARRY THE QUESTION FORWARD, NEVER THE EXPECTED ANSWER.** Two-for-two in this ONE lane: *"look for a THIRD copy of the 5 MB constant"* (**there was none — and that was the CORRECT result of a REAL bug**: its SHAPE was *no guard at all*; run the check literally ⇒ find nothing ⇒ report *"C&I is clean"* ⇒ **close a live bug as a pass**) and *"use `mode="photo"`"* (C&I is bimodal). **NEITHER was careless — both were TRUE WHEN WRITTEN and had since ROTTED.** ★ **A stale instruction is worse than none: it looks like diligence.** ⇒ **strike a spent check IN PLACE** — a grep landing on the old line is exactly how it gets re-run. **(2) CHECK WHAT THE ACTUAL HOST RENDERS, NOT THE SHAPE OF THE LAST WIRE YOU BUILT.** **#447 needed MORE** state than a naive copy (the CT panel's 2 fields would have dropped a QR-delivered **PDF** into SolutionChecker's `!isPdf`-gated `<img>` and rendered it **broken** — `capture` only HINTS at the camera, the phone's picker keeps `accept="...,application/pdf"` in EVERY mode); **#454 needed LESS** (C&I has no `<img>` preview and 3 fields ⇒ #447's five-field tuple would have added state nothing reads). **Both wrong directions are avoided the same way.** **★★ NEXT FROM THIS LANE: NOTHING — IT IS CLOSED.** Remaining, none of it in this lane's hands: **[FU-QR-STORAGE-LIFECYCLE]** (owner infra — 24h lifecycle on `qr-uploads/`, console/gsutil not code) · **[FU-GRADER-5MB-COPY]** + **NEW [FU-GRADER-COULDNOTREAD-REASON]** (the "Couldn't read" chip is ONE generic message for illegible/mismatched/corrupted because the grader returns only a **boolean** with no reason code ⇒ a refusal a student cannot act on; **both are the FORBIDDEN `checkSolution.cjs` ⇒ ONE batched owner-approved pass**, owner-found live-verifying #454, **not a regression**) · **[FU-UPLOAD-GUARD-CONVERGE]** · **[FU-QR-CI-QUESTION-PHOTO]** (would need its OWN `mode` decision) · **[FU-CI-DROPZONE-PDF-COPY]** ("PNG or JPG" **understates** its own PDF support — the *inverse* of the 5 MB lie). **BRANCH CLEANUP: the owner does ONE sweep** of 6 branches + 4 worktrees when ready — not piecemeal, **never auto-approved (§3)**. **LIVE LANES (file-disjoint):** tutor QP-record read (`pages/tutor/tutorRoundTrip.ts` + `useTutorSession.ts`) · a content-only lane (`handoff/curation/*`) · Fable bank expansion.)
# _Superseded header (post-PR #451):_ Updated: 2026-07-16 (post-PR **#451 — CHECK & IMPROVE: THE UPLOAD GUARD THAT NEVER EXISTED, trunk `c132f27`, owner BYTE-REVIEWED the pushed diff then LIVE-VERIFIED.** **PR 1 of 2**; 3 files (`uploadLimits.ts` +70 · `DesktopCheckImprovePage.tsx` +51/−6 · `CheckImprove.tsx` +54/−6). **C&I had NO client-side upload guard AT ALL — not a wrong ceiling, NO ceiling:** neither page read `file.size`, neither imported `uploadLimits`, and all four inputs went straight to `FileReader`→base64→grader — **live on real students, desktop AND mobile, independent of QR**. **SIZE:** a 10 MB PDF base64'd fine and hit `readJson`'s 5 MB body cap → *"Request body too large"*. **TYPE:** every input declares `accept="image/*,application/pdf"` but the server takes **exactly** `{image/jpeg, image/png, application/pdf}` (`mentorImageSupport.cjs:3`) ⇒ a WEBP/GIF/BMP passed the picker and died server-side. Both = the forbidden **"uploaded, then dead"**; both now refused **at the picker**, naming what is wrong AND what to do, copy+constants identical to the panels #443 fixed. **★ `accept` is a HINT, not a guard** (every OS dialog has an "All files" escape) ⇒ the check must exist independently of it; **#451 changed no `accept` attribute and no server code.** **ALL FOUR sites** — the **question photo rides the SAME request to the SAME body cap** and kills a submission just as dead. **★★ THE LESSON, worth more than the fix: the carried-forward instruction was "look for a THIRD copy of the 5 MB constant" — there was NO third constant, and that was the CORRECT result of a REAL bug.** The bug had a different SHAPE (no guard at all), so running that check literally finds nothing and reports *"C&I is clean"* — **closing a live bug as a pass.** ★ **The question that worked was "what does C&I ENFORCE?", not "does C&I have a 5 MB constant?" — a check that names its expected answer can only confirm or deny THAT answer. CARRY THE QUESTION FORWARD, NEVER THE EXPECTED ANSWER.** **★ Shared helper, not 4 more inline copies:** `checkUploadFile()` lives in `uploadLimits.ts` because that file's own mandate is literally *"THE ONE PLACE … so the number and the words a student reads can never drift apart again"*; **behaviour+copy verbatim from the siblings, duplication not** — reported as a deviation from the owner's "verbatim" instruction rather than done silently; owner byte-verified the claim line-by-line + approved. CT/Worksheet keep their inline copies ⇒ new **[FU-UPLOAD-GUARD-CONVERGE]** (behaviour-neutral; ⚠ their copy is the SOURCE the helper was matched against — keep the messages byte-identical or the "one promise everywhere" property breaks). **★ `checkUploadFile(file, subject)` — `subject` REQUIRED with NO default**, deliberately mirroring `QrAnswerHandoff`'s `mode`: two of the four sites are **QUESTION** inputs, so the siblings' verbatim *"…photo of your answers."* would have told a student to photograph **the wrong thing**. *(Copy-follows-the-host, 3rd occurrence in this lane.)* **★★ The refusal must NOT reuse the grade-failure channel** — desktop's `errorMessage` hard-codes *"No score has been generated. Press Retry to call the grader again."*; a picker refusal never reached the grader ⇒ that sub-line would be a **lie** and Retry would re-run a call that never happened ⇒ dedicated `answerFileError`/`questionFileError` per page, each rendered beside its own input. **★ [FU-SOLUTIONCHECKER-STALE-ANSWERTAB]'s C&I question is ANSWERED: C&I is IMMUNE — do NOT re-check.** Both C&I grade paths are **plain `async function handleGrade()`, NOT `useCallback`** ⇒ no dep array to omit; the only `useCallback` (`loadCiRecords`) never reads `tab`. **That FU is SolutionChecker-SPECIFIC, not a family.** ★ **C&I is safe not by design or vigilance but because it never reached for memoization — SolutionChecker's bug is the price of an optimisation C&I didn't make.** **Two unrequested fixes, flagged not smuggled** (owner byte-reviewed both against the PRE-PR code): `reader.onerror` **silently nulled state with no message** on all four sites (a silent failure inside a PR about honest refusal); and `setImageMime` now takes the guard's **validated** mime instead of a data-URL-prefix derivation with an `|| "image/jpeg"` fallback that could mislabel a file and let it die server-side. **★ OWNER PROCESS POINT — approval of a PLAN is not approval of CODE:** the owner approved the reasoning, then refused to approve the implementation until it was **pushed and readable** (*"my approval so far is of your PLAN, not your CODE"*), then byte-reviewed the real diff — including justifying the mime-fallback claim against the **PRE-PR** file, the only place a claim about what code *used to* do is falsifiable. **Nothing is approved as "done" from a self-report.** **★★ NEXT FROM THIS LANE: [FU-QR-CI-WIRE] (PR 2 of 2) — the LAST wire, DESKTOP-ONLY.** `QrAnswerHandoff` calls `useIsDesktop()` and returns **null <1024px** ⇒ a QR affordance in mobile `CheckImprove.tsx` **could never render** — a QR on a phone is meaningless, the camera is already there ⇒ **mobile gets the guard and NO QR**. Confirmed against the component, not assumed. ⚠ **Do NOT re-run the spent "third 5 MB constant" check.** Then the QR lane closes but for owner-infra **[FU-QR-STORAGE-LIFECYCLE]** + **[FU-GRADER-5MB-COPY]** (forbidden file, own PR). **10th stale-base catch:** docs #450 landed MID-BUILD; rebased onto `13fc1b0` and **re-ran the gates rather than trusting the pre-rebase greens**. ⚠ **#452 (tutor 404 fix) MERGED while this docs PR was being written — the 11th catch, an hour after the 10th.** Product-only, zero overlap; this PR rebased onto **`a9798e7`**. **RE-DERIVE — the live trunk is `a9798e7`+, not `c132f27`.** **BRANCH CLEANUP ON HOLD** at the owner's instruction (§3 — never auto-approved). **LIVE LANES (file-disjoint):** Fable bank expansion · tutor fast-follows (#452).)
# _Superseded header (post-PR #448):_ Updated: 2026-07-16 (post-PR **#448 — TUTOR STAGE 3: THE EXPLANATION PANEL is LIVE, trunk `0e42e16`.** D-TUT-13 complete — **Tutor Stage 1 + 2 + 3 all live.** The tutor could teach trigonometry without ever showing a triangle; now it shows the right diagram or **honestly shows none**. Stage 1 had left a closed `<aside>` scaffold with split/overlay CSS already in place; Stage 3 filled it. Shipped: `ExplanationPanel.tsx` (split desktop / overlay mobile; image · **interactive-as-OFFER** · honest gap; inline "See the diagram" chip + header reopen; `NcertPageModal` wired but **dormant** until a curated `ncertPage` field lands) · `conceptVisualCatalogue.ts` (**exact-match-or-nothing, D-TUT-15** — unknown concept → null, never a substring guess or `concepts[0]`; reuses `getNoteAssetUrl`/`getFiguresForQuestion`/`getAllConceptsList` = the registry **DATA, never its matcher**) · the **`[[figure:<conceptKey>]]` sentinel mirroring `[[offer:…]]`** (the model picks from the topic's **closed curated set**; the server strips + validates against exactly that set ⇒ a hallucinated key yields **no panel, never a wrong figure**; the token is the **stored conceptKey**, a regex-safe slug, because one conceptLabel contains `]`) · **`buildTutorPath`'s OPTIONAL `questionId` seam** (omitted ⇒ byte-identical; the QP lane's call untouched; it also powers D-TUT-14 #2 — an in-play question's real exam figure outranks the generic one, **but only for the ARRIVAL concept**) · **5 of 7 hard gaps** filled as committed `.svg` (`getNoteAssetUrl` already globs svg ⇒ same path as the 66 shipped figures; styled on `tokens.ts` + `NoteGeneratedFigure`'s print-safe palette — no new visual language) · **[FU-TUTOR-BACKLABEL-COUNT] CLOSED**. **★★ THE CATCH THAT SHAPED IT — the curated catalogue's OWN HEADER LIED:** it claims `conceptKey = slugified conceptLabel`, **false for 46/54 rows** (editorial abbreviations: `"Pythagoras theorem (a² + b² = c²)"` → `pythagoras-theorem`, which slugifies to `pythagoras-theorem-a-b-c`). Slugifying the live label to find a key would have **silently blanked 85% of concepts** = **[FU-PROG-TOPIC-KEY-MISMATCH] reproduced in a new lane**. ⇒ lookup on **(canonical topicKey, EXACT conceptLabel) / the STORED conceptKey — never a re-derived slug**. *A header comment describing data is not data — derive the claim against the real module* (same class as the MCQ "34 keys" that were really 13). **★★ D-TUT-16 SPECIFIED BUT DELIBERATELY NOT BUILT:** its AI-diagram cache mirrors `stepSolution.cjs`, which **no-ops in prod** (`DATABASE_URL` unset; `step_solutions` has **no migration**) ⇒ built as specified it would **pass every gate while regenerating an unreviewed diagram per student** — the exact fabrication it exists to prevent. **A green gate that ships silent fabrication is worse than a red one.** The gaps are a **bounded static list** ⇒ authored offline, owner-verified, committed as ordinary rows: no cache, no Postgres, no unreviewed figure reaching a student. *When a spec's mechanism is dead, satisfy its INTENT, not its letter.* **★★ "HARD GAP" ≠ "NCERT HAS NO FIGURE"** — GAPS.md means *nothing fits in OUR catalogue*. Owner-required tracing against the **official 2026-27 NCERT PDFs caught SIX fidelity errors**: esterification said "conc. H₂SO₄" (**NCERT's equation says only "Acid"** — conc. H₂SO₄ is Activity 4.8's reagent) **and it is REVERSIBLE** (drawn one-way); functional groups used **`>C=O` / `–X (F,Cl,Br,I)` — NCERT Table 4.3 writes NEITHER** (only —Cl/—Br + 4 oxygen classes, never F/I); atmospheric refraction **has TWO real NCERT figures** (10.9 + 10.10, p168) where a flat-horizon sketch had been **invented**; tangent length — **NCERT never writes ℓ=√(d²−r²)**, it states `PQ² = OP² − OQ²` (Remark p149); scattering's rule is **particle-SIZE** based with reddening-of-the-Sun only a passing clause (no subsection, no figure); area recap — the reprint **DELETED** that review section. ⇒ **3 TRACED vs 4 ORIGINAL, each labelled** — *"NCERT drew it" and "we drew it" are different claims and must never be framed the same.* **★ NCERT TRACE METHOD (reusable):** local PDFs at `Desktop\NCERT Books\{Mathematics,Science} class 10\_unzipped\` use the **OLD 2018-19 numbering — MAP BY CONTENT** (`jemh110`=Circles p144-153 · `jemh111`=Areas Related to Circles p154-160 · `jesc104`=Carbon p58-78 · `jesc109`=Light p134-160 · `jesc110`=Human Eye p161-170); **use pymupdf (`import fitz`), pdfplumber is BANNED** (cannot decode CBSE subset fonts); figures are **vector drawings over a full-page raster** ⇒ `get_images()` returns the whole page — extract via **clipped page renders at the figure bbox**. **★ Owner granted a ONE-TIME exact 2-line exception** in forbidden `src/lib/desktop/topicHubContent.ts` (the file returns to forbidden): the area row **RENAMED not retired** → "Radius from a given circumference, diameter or area" (the board deleted the review SECTION but **Ex 11.1 Q2 p158 still tests the SKILL**, and the in-scope formulas literally embed 2πr/πr² — retiring would lose real tested content to fix a *naming* problem; **no "prerequisite folded into an adjacent row" precedent exists**); **`–X` aligned → `–Cl, –Br` but `>C=O` KEPT** (it is **shared student-facing vocabulary** in `carbonCompounds.pack1.ts:259` + `.exemplar.ts:226` — narrowing the hub alone would desync the label from the answers students read; *a shared vocabulary is not one row's to narrow*). **★ `conceptKey` deliberately NOT renamed** — it is **persisted as the figure signal in durable tutor sessions**; renaming a load-bearing identifier because its *display label* changed would blank the panel on live threads. *Separate "what the student sees" from "what a live session already stored".* **★ NEW CI GATE, PROVEN TWICE:** `tutor_visual_catalogue_acceptance.mjs` (plain Node — **vitest is still NOT CI-gated and cannot run on win32, [FU-CI-GATE-VITEST]**) fails on **label drift** vs live boardEssentials, a **missing figure**, or a bad/dup conceptKey; removing a figure → `MISSING NOTES ASSET`, reverting one label → `LABEL DRIFT … the panel would silently blank this concept`. Interactive refs are **warn-only by design** (computed ids aren't literal in registry text; a stale one degrades to an honest gap, never a broken image). **★★ NEW STRUCTURAL CONFLICT CLASS — do not re-diagnose:** #447 and #448 each added an ops script + appended to `test:matrix:all` ⇒ **any two lanes adding an ops check ALWAYS collide on those same two lines. It is ALWAYS additive (keep both scripts, chain both) — never a real collision.** (This was also the 9th stale-base: based on `acf3092`, trunk moved FOUR commits underneath mid-build.) **★★ NEXT FROM THIS LANE (small, now unblocked):** the **last 2 gap figures** — functional groups (adapt NCERT Table 4.3) + radius-from-circumference — now that both labels are settled: author → owner-verify → commit → flip the rows. **[FU-TUTOR-LEGACY-RETIRE] is BLOCKED and its premise was WRONG — those files are NOT dead:** `mentor.cjs` has **3 live routes** off `index.cjs`; `ConceptTeachDrawer` is mounted by `ConceptSpine.tsx:692` + `TopicHub.tsx:1789`; `TeachFlow` by ConceptTeachDrawer. **Only `TutorDrawerV2` is dead** (zero code importers; 6 **ungated** ops scripts read it as text). **`TutorPage.tsx` is NOT an importer — its line 3 is a COMMENT** (the grep-hit-isn't-an-import trap, hit twice in this lane). D-TUT-12 cannot close until the old Topic Hub tutor is retired. Still queued: **[FU-TUTOR-INCHAT-QUESTION-UPLOAD]** (needs the QR channel) · **[FU-TUTOR-READ-QP-RECORD]** · **[FU-TUTOR-SUBREGION-FOCUS]** (deferred indefinitely) · **[FU-TOPICHUB-LENSPOWER-ANCHOR]** (new — lens power is defined in Light ch.9 p157-158 though the row files it under human-eye) · **`<EquationInput>` into the tutor composer** (deliberately deferred — a real composer-UX change; the PR stayed focused). **Owner live-verify:** atmospheric refraction (the 2-panel NCERT trace) + the reactions scheme (the "Acid" vs conc. H₂SO₄ fix). **LIVE LANES (file-disjoint, do NOT start anything new):** Fable bank expansion.)
# _Superseded header (post-PR #447):_ Updated: 2026-07-16 (post-PR **#447 — QR PR-2: SCAN-TO-SEND is LIVE on QUICK PRACTICE + HPQ + TOPIC HUB, trunk `d99c14d`, owner LIVE-VERIFIED on the deployed app (all four checks green).** **ONE file (`SolutionChecker.tsx`, +62/−7), ONE wire, THREE surfaces** — QP + HPQ + TopicHub all render `SolutionChecker`; the #441 channel was reused verbatim, nothing rebuilt. **NOT C&I** (it owns its own upload code; `DesktopCheckImprovePage:1714` is a COMMENT — re-verified true at `d99c14d`). **Seam contract honoured:** `mode="photo"` (one handwritten answer ⇒ the photo IS the answer), attached as a **sibling of the dropzone INSIDE the `answerTab==="upload" && !hasFile && !result` block — NEVER a third peer**; 360px safe **twice over** (two `flex:1` peers unchanged + `QrAnswerHandoff` returns null <1024px so it cannot render there); **sibling not nested** — the dropzone is a `<button>`. **★★ THE REUSABLE TRAP — the CT wire is NOT copy-pasteable: the phone's picker keeps `accept="...,application/pdf"` in EVERY mode** (`capture` only HINTS at the camera, it does not restrict the picker) **⇒ a PDF can arrive in `mode="photo"`**; CT has no preview so its 2-field set sufficed, but `SolutionChecker` has an `imagePreview` branch gated on `!isPdf` ⇒ it needs the **full FIVE-field tuple** (`fileName`/`isPdf`/`imageMimeType`/`imagePreview`/`imageBase64`) or a QR PDF renders **broken** in `<img>` (owner live-verified this exact case). **★ The QR-session reset needed NO code** — `!hasFile` gates the mount ⇒ delivery unmounts (cleanup cancels polling), clearing remounts fresh `idle`; *make the stale state unreachable rather than remembering to clear it.* **`mode` threads to the phone as `variant`, not `mode`** (mint body `{variant}` → coordination doc, defaulting to the SAFER `document` → phone copy + `capture`). **#447 ALSO closed `SolutionChecker`'s own 5 MB copy lie** (it had its **own** `MAX_PDF_BYTES = 5 MB`; now reads `services/uploadLimits.ts`, 3.5 MB, both copy strings derived) — folded in with owner approval because shipping QR@3.5MB beside a picker promising 5MB IS the forbidden "uploaded, then dead". **★★ FRAMING — do NOT record that as a surface #443 "missed":** [FU-QR-SOLUTIONCHECKER-WIRE] was logged **BLOCKED ("do NOT touch until they are out")** because the QP lane owned the file when #443 shipped; #443 correctly scoped to the three host panels then free. **SolutionChecker was the one correctly HELD BACK for PR-2 — the bug living until now is the seam contract WORKING AS DESIGNED.** *A deferred fix landing exactly when its lane opens is success, not debt.* **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] — #445 asked PR-2 to decide it; DECIDED: structurally moot, no data loss shipped** (the send is tab-gated at `:343-344` and QR is reachable only from the upload tab ⇒ a QR image can only be sent from `upload`; typed text is **preserved, not destroyed**). It stays open on its original terms — making text-alongside-image *work* is a grader change. **★★ BUT auditing that gate found a REAL latent bug → NEW [FU-SOLUTIONCHECKER-STALE-ANSWERTAB]:** `handleCheck` READS `answerTab` (`:343-344`) but OMITS it from its useCallback deps (`:404`) ⇒ upload+file → switch to type, type → switch BACK with no further edit → Check **sends the typed text while the screen shows the image** — *exactly* the failure the gate's own comment at `:340-342` says it prevents. **Pre-existing (#436), held out of #447 with owner approval; needs gate-vs-deps reasoning + a NEGATIVE TEST proving it fails pre-fix — a guard that cannot fail is theatre.** *The move that found it: when asked "is X safe?", audit the MECHANISM that makes it safe, not today's output.* **★★ NEXT FROM THIS LANE: [FU-QR-CI-WIRE] — the LAST wire** (C&I: `DesktopCheckImprovePage` + mobile `CheckImprove`, `mode="photo"`; #436 touched both, so check lane-overlap first). **Two owner-approved "assume nothing" checks, both earned the hard way in THIS lane:** (1) **look for a THIRD copy of the 5 MB constant** — SolutionChecker had its own that nobody expected; **do NOT inherit "the lie is gone everywhere" as a fact twice in one lane**; (2) **if C&I has its own tab-gate, check it for the SAME stale-closure shape.** Then the QR lane is closed but for owner-infra **[FU-QR-STORAGE-LIFECYCLE]** (24h lifecycle on `qr-uploads/`) + **[FU-GRADER-5MB-COPY]** (forbidden grader file, own owner-approved PR). **⚠ The 9th stale-base catch happened here:** docs #446 merged MID-SESSION and the branch went stale — it presented as **seven handoff files appearing as DELETIONS, indistinguishable from the §2a collision signature until checked**; verified docs-only, rebased onto `c2db430`. *Every diff surprise on a shared trunk is a real collision until proven otherwise.* **BRANCH CLEANUP IS ON HOLD at the owner's explicit instruction** (CLAUDE.md §3: branch deletion is NEVER auto-approved). **§7 (the PAYWALL PR) remains UN-DISPATCHED** — unchanged by #447; its trap is recorded under the #445 header below and is untouched. **LIVE LANES (file-disjoint, do NOT start anything new):** Fable bank expansion.)
# _Superseded header (post-PR #445):_ Updated: 2026-07-16 (post-PR **#445 — GRADER `objective` FLAG (§2) + ATTEMPT-DEDUP `mode` DROP (§4b), trunk `ad2a9b2`, owner LIVE-VERIFIED on the deployed app.** Two bugs, ONE root: **nothing client-side could tell an objective question from a subjective one** — hence both the "+0 marks" chip AND the attempt double-count; they shipped as one PR. **§2:** the grader has always (PR-348) zeroed per-step marks on an objective question BY DESIGN (the whole 0-or-full mark lives at ANSWER level) but never SAID so, so five sites printed "0 marks / +0" per step under a "Full marks 1/1" header — reading as *the student scored 0 on every step*. One **additive** `objective` field from **BOTH** grader functions (`handleCheckSolution` + `normaliseStructuredResult` — the keep-in-sync pair, **patched together**) → five chip sites **suppress the chip, KEEP the annotation**. **Gated at the VIEW, not grade-time** (stored scorecards froze the old 0s; pre-`ad2a9b2` scorecards carry no flag → old chip, honestly stale, never rewritten). No score change; subjective byte-identical. **★ The flag had to reach FURTHER than the five chips** — through the TYPES they render: `WorksheetQuestionGrade` (`aiClient.ts:407`) + `CiGradedQuestion` + the four print-props builders; the client parse is a **generic passthrough (`handleJsonResponse<T>`) so NO grade-service edit was needed** (mirrors the PR-2 `topicSlug` precedent). *Lesson: trace to the TYPE the renderer consumes, never assume the server response reaches it directly.* **§4b:** `attemptDedupKey` included `ctx.mode` and **★ the key IS the Firestore doc id** ⇒ dedup is **all-time + cross-device** (the 400-entry local ring is only a fast pre-check); a wrong-click then a graded typed answer on the same question minted **TWO permanent attempt docs** and progress counted it twice forever. Dropping `mode` collapses exactly that pair; **the score stays in the key so 0/1 vs 1/1 never collapse**; `mode` still lives in the attempt DOCUMENT (display/analytics). **Owner live-verified all three:** chip gone + annotation kept · 5-mark subjective still shows per-step marks (**the gate did not leak into the subjective path**) · click-wrong-then-grade = **+1, not +2**. **★★ NEXT FROM THIS LANE: NOTHING — it is CLOSED.** **★ THE UNBLOCK: `SolutionChecker.tsx` IS VACATED** — #445 was the last lane holding it; no branch/PR touches it (its only history was #436, already merged), and CI **`lane-overlap` PASSED** ⇒ **[FU-QR-SOLUTIONCHECKER-WIRE] (QR PR-2) is UNBLOCKED and DISPATCHED to a fresh agent.** ⚠ **`SolutionChecker.tsx` line numbers MOVED in #445** (dead banner deleted, chip gate added, `AnnotatedStepCard` gained an `objective` prop) — **re-derive; never trust a pre-`ad2a9b2` line number.** For that agent: one wire still covers **QP + HPQ + TopicHub**, **NOT C&I**; don't disturb the `objective` prop threading; **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] sits directly in its path** (client `hasText && !hasImage` AND the grader's prompt branch — a QR upload sets the IMAGE, so a typed answer is ignored at BOTH layers); real ceiling **≈3.5 MB not 5 MB** (`uploadLimits.ts`); `lazytopper.checkResult.v1.` has **no version bump** across shape changes. **§7 (the PAYWALL PR) remains UN-DISPATCHED**, awaiting its own turn; its **§7.7 test is drafted + PARKED** at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs` — ★ **the paywall counter counts API SPEND EVENTS; the attempt key counts DISTINCT QUESTION-OUTCOMES. A re-check is a second Gemini call and MUST count again — do NOT dedupe the paywall counter against the attempt key; conflating them under-bills every re-check.** Baseline unchanged: **`recordQuestionAnswered` has NO caller** (the daily counter ticks for nobody); §7's wiring re-arms the gate for the first time, must make the gate **action-level** (block the Check button, never the route — browsing + MCQ clicks are free forever), and must stay **OFF** `subscriptionService.ts`/`AuthContext.tsx`/`featureGates.ts` (the urgent cloud-auth lane owns those). New FUs: **[FU-STEPMARKCHIP-EXTRACTION]** (the five chips are five INLINE re-implementations with no shared component — inline was chosen DELIBERATELY so the diff stayed narrow and did not hold the QR/paywall lanes hostage for a behaviour-neutral refactor; extract `StepMarkChip` in its own PR) + **[FU-BANK-SUBJECTIVE-FORMAT-IN-SECTION-A]** (117 one-mark rows carry a subjective format yet sit at section A ⇒ graded binary 0/full). **LIVE LANES (file-disjoint, do NOT start anything new):** QR PR-2 (dispatched) · Fable bank expansion.)
# _Superseded header (post-PR #441 + #443):_ Updated: 2026-07-15 (post-PR **#441 + #443 — QR DESKTOP→MOBILE ANSWER UPLOAD is LIVE, trunk `5aaaeec`, owner live-verified on the Full Mock result screen.** A laptop student who solved on paper no longer photographs → WhatsApps/emails themselves → saves → uploads: the desktop shows a QR, the phone scans + sends, the file lands in the SAME answer box and **grades exactly as today** (the grader was never touched — QR is a DELIVERY mechanism). Channel = **Firebase Storage blob + a Firestore coordination doc, both written server-side via firebase-admin**; the phone never touches Firebase. **NO rules change / NO deploy step / NO new dep / NO new env var** (admin bypasses both rule sets and no client touches either → the existing deny-alls are correct and protective — do NOT add a rule for `qrUploadSlots` or `qr-uploads/`, and do NOT touch `ncert/`). **Security:** two-token split makes write-only literal — `uploadToken` (in the QR) can only write, `pickupToken` (desktop-only) reads once + destroys; 256-bit, sha256-hashed at rest, single-use, delete-on-pickup, never logged; **mint requires auth so caps are PER-UID — never per-IP** (shared school wifi / carrier NAT would throttle a whole school). **#443** also fixed a **live PRE-EXISTING bug: "PDF up to 5 MB" was never spendable on EITHER path** (base64 ×4/3 ⇒ 6.67 MB vs `readJson`'s 5 MB cap) — a 4-5 MB PDF attached **on the desktop, no QR**, passed the picker and died at the grader; measured true ceiling **≈3.68 MB**, limits unified in `src/services/uploadLimits.ts`, guarded by a **negative-tested** cap-arithmetic assertion in `test:qr:channel` (46/46, in `test:matrix:all`). **★★ THE CREDENTIALS TRAP — do not re-derive: `verifyIdToken` working proves NOTHING about service-account credentials** (it needs only the project id + Google's PUBLIC certs); the deploy log read `credentials: explicit` **only because the key was already set for the pre-existing `[share]` feature**, not because auth implied it. **NEXT FROM THIS LANE: [FU-QR-SOLUTIONCHECKER-WIRE] (PR-2) — BLOCKED until the QP lane vacates `SolutionChecker.tsx` (still mid-flight there; #442 open).** One wire there covers **QP + HPQ + TopicHub** — **NOT C&I** (corrected: C&I owns its own upload code; `DesktopCheckImprovePage:1714` is a COMMENT, not an import). Seam contract: **QR attaches INSIDE the upload panel, never as a third peer** (360px CTA math). Then **[FU-QR-CI-WIRE]** for C&I. New owner-infra **[FU-QR-STORAGE-LIFECYCLE]** (24h bucket lifecycle on `qr-uploads/`) + **[FU-GRADER-5MB-COPY]** (the grader still says "under 5 MB" — forbidden file, own PR). **[FU-FULLMOCK-NO-UPLOAD-PANEL] WITHDRAWN — never file it; Full Mock IS covered.** **LIVE LANES (file-disjoint, do NOT start anything new):** QP-sessions (#442 open) · Fable bank expansion.)
# _Superseded header (post-PR #435):_ Updated: 2026-07-15 (post-PR #435 — **[FU-MATHTEXT-COMMAND-CORRUPTION] CLOSED, trunk `fd57db1`, owner live-verified.** The app's single shared maths renderer (`MathText`, 13 consumers) no longer mangles bare LaTeX commands: the tutor renders cos²A/sin²A as real maths and every consumer surface is unchanged. Fixed BY CONSTRUCTION (protected-span model: scan delims (…) AND […] + command names with balanced args → promote only in the gaps → wrap only what KaTeX proves it can render) — **no lookbehind, so bank content (AB^2, CO_2, cm^2) is byte-identical by construction**. 2 files, zero consumer edits, dead `renderMathInText` deleted. **NEXT FROM THIS LANE: nothing — it is CLOSED.** ★ NEW **[FU-CI-GATE-VITEST]** (fix before soft launch): four vitest suites exist and **none run in CI** — `MathText.test.tsx` (shared renderer), `EquationInput.test.tsx` (equation widget), `tutorRoundTrip.test.ts` (tutor round-trip), `WorksheetPrintDoc.test.tsx` (worksheet print doc); `quality-gate.yml` = root matrix → mojibake → build → ops matrix, no vitest anywhere. Also new: [FU-MATHTEXT-MULTILETTER-BASE], [FU-MATHTEXT-RENDER-GATE-RATIONALE] (do NOT delete `katexCanRender` as redundant). **LIVE LANES (file-disjoint, do NOT start anything new):** QP-sessions (#436, being widened with the fetch fix) · QR desktop→mobile upload · Fable bank expansion.)
# _Superseded header (post-PR #344, kept for context):_ Updated: 2026-07-08 (post-PR #344 — **Progress-Journey ARC · PR-3 per-surface Worksheet HISTORY MERGED, trunk `a4c3eec`.** NEW `components/results/SurfaceHistory.tsx` renders the durable session records (PR-1 store) as a "Your worksheets" section on the WorksheetGenerator BUILD view — **CONSUMES the store read-only** (§3a): C1 rows (code/title/date/score-chip-or-awaiting-pill/four-type dot-strip + honest empty) · C2 `getSubjectProgress` vs-last-time chip (honest-or-silent; subject-level month trend) · C3 tap-row → READ-ONLY `<ResultsScorecard>` re-open (no `perQuestionRef` reconstruction; Download only when local caches resolve). PR-2 files additive (no live-scorecard regression); CT/FM history = deferred seams. 3 self-caught defects fixed (pending-upload no-Download + honest copy). Owner-QA'd. **BUILD LANE IMMEDIATE NEXT: arc PR-4, Me/Progress redesign** (§3b / §4-step-4 — ONE responsive component reads the recent strip + rolled-up before→now; retires the legacy dashboard widgets). SEPARATELY: 3 owner-found worksheet bugs (grader MCQ all-or-nothing + PDF filename + history placement) fix in their own follow-up PR — NOT PR-3 regressions. New FU: [FU-HISTORY-C2-PER-WORKSHEET-DELTA]. _Prior: post-PR #341 — arc PR-2 the Universal `<ResultsScorecard>` MERGED (`8c4c159`), worksheet+QP variants LIVE, CT/FM deferred, presentational §1a._ _Prior: post-PR #338 — arc PR-1 the session-record DATA LAYER MERGED (`d704b1c`): the `sessionRecords/{uid}/records/{code}` store + `progressStore` reader + durable `#NN` + `perQuestionRef`; new Firestore collection → rule `dc73360`._ **CONTENT LANE:** Light is ship-tracked — the trusted-student QC verifies the 230 authored solutions + 52 flagged diagrams from `docs/light-extraction-review-queue.md`; deferred gdrive leftovers (757 AR 25Q, 821 objective 51Q, 2022-23 PYQ residual, CBSE Practise Papers) are a later 1-mark pass; **Electricity extraction starts ONLY on explicit owner go**, reusing the pipeline in `Desktop\Content\extraction\light\`.)
# Base SHA: a8be752  (squash of #454 — this docs PR's base. Re-derive after this docs PR merges — never trust a written SHA. **NOT `c132f27`; that is only #451's own squash SHA.** Re-derive after this docs PR merges — never trust a written SHA. ⚠ **TWO catches in this ONE lane, an hour apart:** #451's branch went stale MID-BUILD when docs #450 landed (**10th**), then THIS docs PR went stale under #452 **while being written** (**11th**) — both product-only/docs-only with zero overlap, both rebased, gates re-run. *That is the NORMAL condition of a shared trunk, not bad luck.* #445's pre-flight caught a handoff written against a tip FOUR commits stale AND a shared checkout that was too; #447's run had docs #446 merge MID-SESSION and go stale underneath it; #448 was based on `acf3092` and trunk moved FOUR commits (#445/#446/#447/#449) underneath it mid-build — the 9th such catch. Its conflict was the now-known STRUCTURAL `package.json` ops-script class: always additive, never a real collision.)

## ⏭️ CURRENT POINTER (as of 2026-07-13 — trunk `a8f36ab`: **#423 FINAL MOBILE-PARITY SWEEP merged + owner LIVE-VERIFIED (360px) — no live route shows the old global brand bar at mobile width; [FU-MOBILE-OLD-HEADER-STRAGGLERS] CLOSED; Exam Trends + HPQ fully ✅ in SURFACE_TRACKER; the launch-board "mobile-parity confirms" item is DONE.** Over #419 bank Batch 11 `69e319d` [bank 8,597; NEXT bank batch = Batch 12 = trigonometry + circles + carbon-and-its-compounds] / #420 C&I PR-3 `cc84ae5` [C&I surface COMPLETE] / #416 C&I PR-2 `a1eaebc` / #412 PR-B-v2 `1228c95`. **Launch spine's next domino remains Home nudge (arc PR-5)**; new non-gating [FU-LEGAL-FOOTER-LINK] + [FU-MOBILE-SHELL-PADDING-STACK])

> **UPDATE 2026-07-15 (#438 OPEN, base `a5691a7`) — BANK-COMPLETION SEQUENCE STARTED. The bank is the LAST critical-path item before soft launch.** Sequence = **#438 MCQ repair (open, awaiting owner byte-review + merge) → then 4 EXPANSION PRs of 3 TOPICS EACH** for the 12 remaining topics (packaging RATIFIED at 3-per-PR; a 6-per-PR proposal was rejected — owner byte-review caught real syllabus errors in 2 of 11 batches that skeptics + gates passed, and diff size is the remaining variable). **NEXT batch = Batch 12 = trigonometry + circles + carbon-and-its-compounds.** Lane record + live per-topic census + all rulings: `handoff/BANK_EXPANSION_LANE_STATE.md` (READ IT — it is the lane's authoritative floor policy, gate stack, skeptic process, and syllabus-anchor process-fix).
>
> - **#438:** [FU-BANK-UNRESOLVABLE-MCQ-KEYS] CLOSED — **13 rows withheld, not 34; ZERO were key-fixes** (every one's OPTIONS are destroyed too ⇒ a key-only repair leaves it unanswerable, and authoring distractors would FABRICATE a PYQ). Bank 8,597 → **8,584**. **Severity claim in the record was FALSE and is corrected: the item silently NEVER SCORES — a correct pick is never marked wrong.** CI landmine cleared; `CBE-S-MAGN-A-001` HOLD + the 168 no-options VSA rows CLOSED as non-defects. Recovery split to **[FU-BANK-MCQ-REEXTRACT]** (pymupdf only — `pdfplumber` BANNED).
> - **✅ REACHABILITY SETTLED — all four surfaces (QP · Worksheet · CT · FM) source `canonicalQuestionBank`. [FU-QP-WORKSHEET-BANK-SOURCING] WITHDRAWN — premise disproven; do NOT re-file.** QP/Worksheet reach it ONE TRANSITIVE HOP below their direct imports (`practiceSetGenerator`/`predictionDataService` → `PredictionCore` → `unifiedQuestionBank` ⊇ the bank), proven by calling the real fns (10/10, 8/8 canonical). **The expansion IS visible to students.**
> - **⚠ [FU-BANK-SCARCE-BAND-MISBANDING] (NEW, pre-launch)** — the owner's live "5-mark Section D / Easy = *Find the value of cosec 60°*" bug is a **CANONICAL BANK ROW** (`TG3-056`): the bank serves faithfully; **the bank is wrong**. **76 MCQ/AR rows sit at section D / 5 marks** (grader clamps 0-or-5; reaches CT/FM Section D) + ~178 under-stepped D/E solutions, over 16 topics. **Own PR(s), class (a) first — NOT folded into the expansion.**
> - **⚠ SYLLABUS RULING — magnetic-effects is RETAINED & EXAMINED (official 2026-27 Unit IV = 13 marks), but Motor / Electromagnetic Induction / Electric Generator are OUT of board-prep authoring** ("assessed only formatively… without adding to summative assessments"). Expect a hard honest-stop on that chapter. **`CLAUDE.md` §5 is STALE — FLAGGED for the owner, deliberately NOT edited.**
> - Also new: **[FU-TOPICMATCHES-SUBSTRING-CONFLATION]** (`circles` ↔ `areas-related-to-circles` — the only colliding pair of 26, and BOTH are in the remaining Maths set) · **[FU-REACHABILITY-TEST-SCOPE]** (step 6 proves bank integrity, never surface sourcing).

> **UPDATE 2026-07-15 (#432, `65fdf85`) — TUTOR STAGE 2 COMPLETE + owner-live-verified (360px).** The round-trip works: durable `tutorSessions/{uid}` session survives close/reopen; Practise → Quick Practice concept-filtered (returns via `practiceInsights`) / Get-marked → C&I (returns via `sessionRecords`), both into the SAME thread; ONE intent-driven CTA via the `[[offer:…]]` sentinel (server-stripped); demonstrations pull a verified bank question. #428 shipped Stage 2, #432 fixed the six preview bugs. **NEXT for the tutor = Stage 3 (explanation-panel visuals) — a SEPARATE dispatch, do NOT start unprompted.** Launch spine's next domino is still Home nudge (arc PR-5). New live tutor FUs: [FU-MATHTEXT-COMMAND-CORRUPTION], [FU-QUICK-PRACTICE-DURABLE-SURFACE], [FU-RETURN-TICKET-CONTRACT], [FU-PRACTICE-COUNT-PASSTHROUGH], [FU-TUTOR-INCHAT-QUESTION-UPLOAD].

> **UPDATE 2026-07-13 (#423, `a8f36ab`) — FINAL MOBILE-PARITY SWEEP merged + owner live-verified.** `isMobileSelfChromedRoute` grew 4 families whose matchers MIRROR `isDesktopShellRoute` (exact `/practice/worksheets` · `/topic-hub*` · `/highly-probable*` · runner regex) and the new route-level `<MobileSelfChrome>` (App.tsx) applies the shared MobileShell avatar header at mobile width — AROUND `RequirePremium`/`PracticeLimitGate`, so premium-upsell/daily-limit states carry the header. 2 files; pages/gates/DesktopShell byte-untouched; desktop chrome byte-identical. Confirm-and-report: /pricing already own-chromed, /profile a redirect alias, all legacy/retire routes have NO live inbound (none chromed). Report: `Desktop/diff/report-mobile-parity-sweep-2026-07-13.md`.

> The header block + "CURRENT BASE" below are STALE (base `a4c3eec`, pre-#363/notes); a full NEXT_ACTION rewrite is part of the owed [FU-HANDOFF-DOC-DRIFT] hygiene pass. Current reality:
>
> - **✅ C&I PR-3 = MERGED (#420, code `cc84ae5`) — [FU-CI-SOLUTION-CACHE] CLOSED; the Check & Improve arc has NOTHING left.** The model-solution cache is LIVE via the owner-ratified SCHEME-FIRST design (pre-flight caught the spec's wrap-point error): keyless SUBJECTIVE questions grade against a student-agnostic solution from the EXISTING `step_solutions` Postgres cache (hash → read → generate-from-question-ONLY on miss → **Gate-2a quality gate, applied at EVERY cache write path** → write-if-pass) injected into the grader's EXISTING marking-scheme slot — same question shares ONE solution across students; interoperates with `/api/step-solution`. Sacred `checkSolution.cjs` diff = +95/−4 deps-injected hooks ONLY (owner byte-review: "textbook-clean"; rules/clamps byte-unchanged; cache failure degrades, grading never blocks). Gate 2b = `POST /api/admin/solution-cache/evict|regenerate`, **`ADMIN_FIREBASE_UIDS`** Bearer allowlist fail-closed → **[FU-ADMIN-UIDS-DEPLOY-ENV]: set the env on the server (Railway) or the endpoints stay safely disabled.** CACHE_VERSION now prefixes ALL hashes (staleness bug fixed). Structurally addresses [FU-MODEL-ANSWER-QUALITY]. **Owner live-verify pending** (repeat-question fast · garbled-not-persisted · eviction · 503-without-env). vitest 62/62 Codespace; CI green.
>
> - **✅ C&I PR-2 = MERGED (#416, code `a1eaebc`) — the Check & Improve surface is COMPLETE desktop+mobile.** All 5 items landed (A per-Q topic via A2 grader-untouched · B counted `N topics` chip + by-topic lens · C PDF solution upload · D mobile parity composing shared services, #437 stub deleted · E `/exam-trends`+`/practice-hub` one-header). Closed **[FU-CI-PERQUESTION-TOPIC]** + **[FU-MOBILE-CI-PARITY]** + **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]**. **The ONLY thing left on C&I = the owner-gated [FU-CI-SOLUTION-CACHE] (PR-3/4)** — the Tier-2 model-solution cache, gated on owner sign-off of its 3 safety gates (server-only writes · mandatory invalidation/quality-flag · store text-never-the-image). Do NOT build it unprompted. New open **[FU-MOBILE-OLD-HEADER-STRAGGLERS]** (11 mobile routes still on the old brand bar — pre-launch cleanup pass).
>
> - **✅ PR-B-v2, the progress ENGINE fixes = MERGED (#412, code `1228c95`) + OWNER LIVE-VERIFIED on the stable link → the Me/Progress Verified cell is ✅ and LAUNCH-DOMINO #3 IS CLOSED (the arc shows REAL data across all four surfaces).** All three engine FUs closed in `progressStore` read-side (grader/App.tsx/rules/src/data untouched): **[FU-PROG-TOPIC-KEY-MISMATCH]** (resolveCanonicalSlug on BOTH sides of every topic compare — 5/26 topics could never key-match; legacy label attempts re-bucket; registry-driven all-slugs regression test) · **[FU-PROG-DATA-COMPLETENESS]** (the UNIFIED graded stream: cloud attempts ∪ record payload marks, deterministic ws:/ct:/fm: id dedup — CT/FM objective Section-A now counts, pre-#403 record-only history healed; C&I records skipped by construction = dual write counts once) · **[FU-PROG-WINDOW-MODEL]** (activity-median split, wider ⊇ narrower; spanDays + isShortSpan → the honest amber short-term label on the Me arc + Topic Hub). Plus the Topic Hub running-accuracy SPARKLINE over the new cross-device `getTopicTrendFromCloud` (real scores from 2 points). Live-verify: Polynomials hub 33.9%→46.9% + sparkline + honest label; Trigonometry honestly empty. **⏭️ THE NEXT LAUNCH-SPINE DOMINO = Home nudge (arc PR-5)** (orient-first convergence + ungraded nudge; reads PR-B). New FUs from #412: **[FU-PROGRESS-PRESENTATION-REDESIGN]** (owner-recorded, LATER presentation-only PR: fold the per-topic trend into the topic HERO card + graphical Me with subject toggle + topic dropdown — do NOT build now) + **[FU-PROG-PRE403-QP-BACKFILL]** (deferred historical QP blob recovery).
>
> - **✅ MOBILE CHROME — app-wide account avatar-dropdown parity = MERGED (#410, trunk `f662fbe`), owner byte-reviewed + live-verified CLEAN.** The mobile header now carries the SAME account menu as the desktop shell, added once in the shared `MobileShell` (mirrors the desktop dropdown; READ-ONLY subscription, no trial activation; same `/pricing?source=account-menu&returnTo=…` URL + logout), and the old global mobile brand bar no longer double-stacks on `/check-improve`, `/intent`, `/practice/worksheets/ready` (added to `isMobileSelfChromedRoute`). Option A reuse: `DesktopShell.tsx` byte-unchanged, new shared pure `utils/accountStatus.ts` helper. **Owner live-verify surfaced a COVERAGE GAP (not a #410 defect): `/exam-trends` + `/practice` still show the OLD global brand bar** → **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]**, folded into C&I PR-2 as item E (reuse `accountStatus.ts`, no fork; + sweep for other straggler mobile routes). New FUs: [FU-DESKTOP-ACCOUNT-MENU-SHARE], [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT].
>
> - **BANK-EXPANSION Batch 9 = polynomials +62 MERGED (#411, trunk `9749fc9`) + Batch 10 = pair-of-linear-equations / arithmetic-progression / acids-bases-and-salts +440 MERGED (#415, trunk `ae2b447`, the FIRST 3-topics-per-PR batch).** Batch 9 ABSORBED the sum/product-of-roots (zeros↔coefficients of quadratic polynomials) items as **Class-10 2026-27 CORE** (extract-max A/B/C +13 + D 12→34 + E 10→37, both honest-stop; scope held to quadratic zeros-coefficient only — cubic/division-algorithm/complex zeros excluded). Batch 10 shipped 3 topics on ONE branch/wire/PR (per-topic discipline unchanged): PLE +163 (D 29→77 · E 16→81, incl. a reducible-to-linear pack +30) · AP +114 (D 20→72 · E 28→70, AP only no GP) · ABS +163 (D 27→63 · E 12→72, qualitative Class-10). **BOUNDARY CORRECTION (owner):** "equations reducible to a pair of linear equations" (1/x=p, 1/y=q) is IN the CBSE 2026-27 syllabus — the main sweep wrongly excluded it; added on-branch; a proposal to add it to `syllabusGuard.ts` was **WITHDRAWN → syllabusGuard UNTOUCHED** (Cross-Multiplication Method stays OUT). Skeptics dropped 16+3 twins + fixed a chem MCQ collision. Owner byte-review CLEAN on both. **Bank → 8,282; 11 distinct topics done; 15 remain (8 Maths + 7 Science).** New FUs: [FU-AP-BANKED-GP-ITEM], [FU-ABS-WASP-STING-ALKALINE]; [FU-SYLLABUS-GUARD-PLE-REDUCIBLE] WITHDRAWN.

> **UPDATE — Batch 11 = triangles + coordinate-geometry + metals-and-non-metals +315 MERGED (#419, trunk `69e319d`, the SECOND 3-topics-per-PR batch).** triangles +127 (294→421: extract 18 A/B/C + authored D 44 + PROOF 20 [7 D-weight + 13 C-weight] + case-E 45; scarce D 40→91 · E 23→68) · coordinate-geometry +67 (232→299: extract 7 + D 13 + E 47; thin, D honest-stop at 28) · metals-and-non-metals +121 (299→420: extract 45 + D 28 + E 48; D 32→60 · E 10→58). **BOUNDARY PRECEDENTS (owner-verified 2026-27):** internal ANGLE-BISECTOR THEOREM (BD/DC=AB/AC) is OUT ("proof of various theorems" trimmed from Triangles) → 2 D items dropped, BUT PF-015 (corresponding bisectors of SIMILAR triangles proportional via AA) KEPT (in-syllabus similarity, not the deleted theorem); coordinate-geometry AREA-FROM-COORDINATES stays OUT (guard-banned, ~28 dropped); metals Periodic Classification (Ch5) OUT — syllabusGuard NOT edited. 3 skeptics dropped 9; tsc caught 8 invalid `format` strings. Owner byte-review CLEAN. **Bank → 8,597; 14 distinct topics done; 12 remain (6 Maths + 6 Science = exactly half). ⏭️ NEXT batch (Batch 12, 3-per-PR) = trigonometry + circles + carbon-and-its-compounds** (2 Maths + 1 Science, interleaved). Regenerate the per-topic census from a fresh dump vs the 8,597 bank.

**⏭️ (superseded) NEXT batch (3-per-PR, continuous run) = triangles + coordinate-geometry + ONE Science (metals-and-non-metals OR carbon-and-its-compounds).** **CONTINUOUS-PUSH:** the lane is at a CLEAN BOUNDARY — a fresh Fable window resumes straight from `handoff/BANK_EXPANSION_LANE_STATE.md` + the task file (regenerate the per-topic census from a fresh dump vs the CURRENT bank; anchor every syllabus call to official CBSE 2026-27 + live `syllabusGuard.ts`, NEVER memory/prior-year; per-topic discipline holds inside the 3-topic bundle). Keep shipping 3-topic batches per PR until all remaining are done.
>
> - **CHAPTER TEST BALANCED PYQ+FRESH MIX = MERGED (#397, trunk `6db7f1d`) — [FU-CT-BALANCED-MIX] CLOSED.** The CT now sources each section (A–D) through the SHARED `drawBalancedSet` (the FT helper, reused verbatim), so a CT paper deliberately mixes real PYQs with fresh authored/extracted questions (~50% PYQ, honest fallback for thin/zero-PYQ topics). SOURCING-ONLY: paper shape/marks/grading/scorecard/numbering + the `MIN_TEST_QUESTIONS` honest gate byte-identical; seed in-blueprint so `ChapterTestPage.tsx` untouched; exactly 2 files. **Owner live-verify pending** (visible PYQ+fresh mix; thin-PYQ topic still a full valid paper). **Surfaced two bank/test FUs (NOT this PR):** [FU-BANK-UNRESOLVABLE-MCQ-KEYS] (34 MCQs bank-wide whose key matches no option → unscorable in CT/FT Section A; **before-launch scoring-correctness fix**, bank lane; full id-list in OPEN_QUESTIONS) + [FU-FM-BLUEPRINT-TEST-SEED-LUCK] (relax the FT test's strict key assertion). CT is now section+concept+four-type + chrome-less full-screen + balanced-sourced → ready to flip live at `MockViewGate` at the owner's discretion.
> - **CHECK & IMPROVE = a first-class SessionSurface (#395, trunk `e33b9d3`) — C&I PR-1 MERGED, owner byte-reviewed CLEAN.** Every graded C&I session now writes a durable `sessionRecords` record (idempotent on the durable cross-device `CI-{S}-{TOK}-{NN}` code — `lt:ci-multi-seq` retired), carries `topicSource` provenance (confirmed/inferred/mixed; **bank-matched RESERVED-not-emitted** — no bank-match path exists; never wire a fake matcher), opens the 5th `<ResultsScorecard>` variant (shell zero-line-diff), and has a "Your checked papers" overlay history (locked CT card shape; MIX = plain "Mixed topics" chip, no fabricated count). Detection/correction/MI byte-intact. Closes [FU-CI-SCORECARD-VARIANT] + [FU-CI-DEVICE-LOCAL-SEQUENCE]. Remaining C&I arc: PR-2 per-question topic → PR-3/4 solution cache (owner 3-gate sign-off).
> - **✅ PR-B, the progress memory layer (launch-blocker) = MERGED (#403, `894ef6a`).** The cross-device, multi-rung windowed ENGINE is LIVE: `getWindowedProgress(uid, window, scope?, nowMs?) => Promise<WindowedProgress>` (progressStore) — the ONE aggregation arc PR-4 + scorecards consume (`WindowedProgress = { window, subjects[], topics[], concepts[], sections[], mistakeTypes[], activity, mistakeLog }`; `RungTrend = { key, label, before, now, delta, sampleBefore, sampleNow }`), honest-or-silent per rung, over the durable streams honoring uid. subject/topic marks = attempts ONLY (no double-count); concept/section bank-matched only; mistake-type = composition share over fully-graded only (adversarial review caught + fixed a pending-record rate fabrication); no rollup, `firestore.rules` untouched. The desktop Me arc (`ProgressWindowArc`) reads it. **Owner byte-reviewed CLEAN + merged.**
> - **✅ arc PR-4, the Me/Progress redesign = MERGED (#408, code trunk `25c3cd7`), owner byte-reviewed CLEAN.** The CONSUMPTION layer over PR-B is DONE, desktop + **mobile**: new `pages/mobile/MobileMePage` retires the legacy Streak/XP hero (`pages/app/Me` un-routed for PR-G) → **[FU-MOBILE-ME-PROGRESS-PARITY] closed**; the shared responsive `ProgressWindowArc` now renders every rung (subject/section/topic/concept/mistake-composition, honest-or-silent) on both widths + the honest window empty-state ([FU-PROGRESS-WINDOW-SPLIT-UX] stopgap); `TopicProgressTrend` wires `getTopicProgress` into the Topic Hub → [FU-TOPICHUB-PROGRESS-ARC] wired. Consumption-only (data-layer byte-untouched); careless mark-loss carried forward; BottomNav preserved; trial badge dropped. **✅ RESOLVED: PR-B-v2 (#412, `1228c95`) fixed all three engine bugs + owner live-verified → the Me/Progress Verified cell FLIPPED ✅ (see the top bullet). NEXT on the spine = Home nudge (arc PR-5).** Separately: [FU-MOBILE-CI-PARITY] (C&I mobile parity lane).
>
> - **FULL TEST (Full Mock) = BUILT (#387) + FINALIZED (#391, trunk `25257c0`)** — the surface is REACHABLE from the app UI: hub "Full Test" card + DesktopHome per-subject tiles + MI-panel link, all plain-navigating to `/full-mock/:grade/:subject` (**MockViewGate the ONLY gate**; every old-engine /exam-simulation//mock-builder entry retired). Cross-device upload-later CLOSED (`services/fullMockPaperStore.ts` — text-only snapshot under the existing sessionRecords rule, firestore.rules byte-untouched; verbatim honest fallback for true misses). Title-case display fallback + scorecard-header comments fixed. **Owner live-verify on the stable production link pending** (`report-ftfinalize-build-2026-07-13.md` §7) → flips the FM Verified cell. Bank-expansion merged in parallel: #381/#384/#385/#388/#393/**#396** (assembled **7,534**; scarce floor ≥75 distinct, honest-stop; **NEXT recommended = chemical-reactions-and-equations** per `BANK_EXPANSION_LANE_STATE`; ~20 topics remain). New FUs: [FU-RETIRE-EXAM-SIMULATION-LINKS] + [FU-VITEST-PREEXISTING-FAILURES].
>
> - **NOTES SURFACE COMPLETE** — all 26 canonical topics specced + audited (batches #365/#368/#370/#371/#372); clickable NCERT page-cites LIVE + owner-verified (#375 offset map + owner-hosted PDFs). Fable notes content lane is DONE — no longer "parked".
> - **Part A of the current task, [FU-LEDGER-CLICKABLE-CITES] (PR #376), IN REVIEW** — source-ledger `p.N` made clickable; awaiting owner merge (do NOT self-merge the product PR).
> - **Chapter Test = BUILT + MERGED (#374, `e54ab8c`), owner live-verified** — the legacy `ChapterTestPage` rebuilt to the locked spec (two-phase grading, native canonical sourcing, `<ResultsScorecard>` chapter-test variant live, `CT-{S}-{TOPIC}-{NN}`); **behind `MockViewGate`**. **Fast-follow before the gate flips — BOTH SHIPPED in #380 (`5bd148c`):** [FU-CT-CONCEPT-LENS] (subtopic marks-lost lens, derived-at-render) + [FU-CT-HEADER-UNIFORMITY] (chrome-less full-screen via `isBareFullScreenRoute` — the chrome was the NON-shell navbar, so `DesktopShell` byte-unchanged). **CT is ready to flip live at `MockViewGate` at the owner's discretion.** New open [FU-RETIRE-OLD-GLOBAL-HEADER] (product-wide legacy-header retirement, later).
> - **IMMEDIATE NEXT (owner-picked):** the CT fast-follows are DONE (#380); the **Full Mock rebuild is DONE + FINALIZED** (#387 + #391 — built, LINKED, cross-device closed; see the bullet above). Remaining: (1) **Bank extraction / expansion** — 6 batches merged (#381/#384/#385/#388/#393/#396; assembled **7,534**; ≥75-distinct scarce floor + honest-stop; **NEXT = chemical-reactions-and-equations** (recommended) per `BANK_EXPANSION_LANE_STATE`; ~20 topics remain, lane at a clean boundary for a fresh window); case-based is a Fable AUTHORING lane, not extraction. (2) **Me/Progress redesign (arc PR-4)** — now the surface critical path. (3) **[FU-CT-BALANCED-MIX]** — ✅ DONE (#397, `6db7f1d`); the CT draw is wired to `drawBalancedSet`, owner live-verify pending.
> - Coordination is LIVE (#366): every PR runs `lane-overlap` (REQUIRED) + `quality-gate`; sequence overlapping lanes, keep branches up to date; owner squash-merges (no self-merge on product PRs).

## CURRENT BASE

Branch: base/approved-thru-437
SHA: a4c3eec
Last PRs: **#344 Progress-Journey ARC · PR-3 — per-surface Worksheet HISTORY (`SurfaceHistory.tsx`: "Your worksheets" list + honest-or-silent vs-last-time chip + read-only stored-scorecard re-open; CONSUMES the store read-only; PR-2 files additive; 3 self-caught defects fixed; owner-QA'd; → `a4c3eec`)** + **#342 Notes biology pilot — Life Processes note-spec (`c9f4177`)** + **#341 Progress-Journey ARC · PR-2 — Universal `<ResultsScorecard>` (extracted from `WorksheetScorecard`; shell + typed 4-surface variant interface; worksheet[byte-identical]+quick-practice LIVE, CT/FM deferred seams; presentational — writes nothing §1a; old `WorksheetScorecard.tsx` deleted; owner live-verified; → `8c4c159`)** + **#305 Worksheet MCQ DETERMINISTIC honesty → step 1 now fully deterministic incl. the objective case (carried `section` client→server + reused `isObjectiveType` in `normaliseStructuredResult`: incorrect objective step → `mistakeType` null regardless of `studentWork`; `handleCheckSolution` byte-identical; [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED; new [FU-MCQ-ANSWER-OPTION-FIELD] + [FU-GRADING-RELIABILITY]; owner live-verified — all-zero buckets every run; → `93f1594`)** + **#302 Worksheet no-working honesty fix → D-PROG-2 / step 1 CLOSED (ported #301 into `gradeStructuredSet`/`normaliseStructuredResult`: worksheet rule 5 + `noWorkingNulled` guard + `rawAdjusted` reconcile; `handleCheckSolution` byte-identical; MCQ residual ~40% → [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD]; owner dual live-verified; → `c5e148d`)** + **#297 Z3 figure-binding golden slice (113 source figures bound → 93 Qs, rendered as `<img>` in the question body + step-mark pill fix; → `449d686`)** + **#295 Worksheet PR-A grade-results redesign (`1a85186`)** + **#291 Worksheet PR-E2b grade loop (`60c5bf9`)** + **#292 Z3 Competency extraction (102 authentic Maths case-based Qs → `competency.z3.ts`; → `b1d3e46`)** + **#289 Note-spec validator gate (`c525b2a`)** + **#282 Notes track Step-1 (`de2a616`)** + **#280 Worksheet PR-E2a (`d065922`) + #283 PR-E2a.1+.2 (`9a080a0`) + #284 PR-E2a.3 (`cfff277`)** + #279 docs(handoff) post-#278 (`883e904`). Earlier: #272 (**Topic Hub PR-C concept tutor "Teach me" flow**; → `d9ba545`) + #273 (docs(handoff) post-PR-C; → `6aa0640`) + #274 (**Topic Hub PR-D final-IA LAYOUT**; → `b57fa79`) + #275 (docs(handoff) post-PR-D; → `acc419b`) + #276 (**Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-route**; → `1de6f3e`) + #277 (docs(handoff) post-PR-E1; → `b4163ef`) + #278 (**CLAUDE.md governance refresh** — worktree rule, matrix de-hardcode, Replit→CI, CBSE 2026-27, verification doctrine + marks-bucket/MockBuilder/MI/syllabusGuard rules; → `f7170ef`)

## ⏭️ IMMEDIATE NEXT — Grading-reliability PR ([FU-GRADING-RELIABILITY]) — cofounder-gated, off `93f1594`
**D-PROG-2 / step 1 is now FULLY deterministic (#305 closed the MCQ residual):** the worksheet grader's subjective AND objective no-working cases are deterministic (empty/whitespace/absent → null + 0 buckets; rawSummary leak → 0; worked-wrong preserved; **wrong objective/MCQ step → null regardless of `studentWork`** via the reused `isObjectiveType` guard in `normaliseStructuredResult`, fed by `section` now carried client→server). Owner live-verified — all-zero mistake buckets every run. **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED.**
- **The next gap is RELIABILITY, not honesty.** Two issues surfaced from #305 live testing (neither blocks PR-B; the honesty guard is solid):
  - **[FU-GRADING-RELIABILITY] (this PR):** grader temperature `0.15` causes OCR-cascade variance on borderline partial-credit answers, and `couldNotRead` fires inconsistently on legible "Don't know" / explicit non-attempt responses (related to [FU-WORKSHEET-NONATTEMPT-TEXT]). Fix direction: lower/zero the grading temperature, harden the detect/`couldNotRead` path, and consider a `thinkingBudget` so borderline reads are stable run-to-run. **Cofounder hands the full instruction** (its own STEP 0 confirming the temperature/genConfig call sites + the detect path before any code). **Do NOT open its worktree until handed that instruction.**
  - **[FU-MCQ-ANSWER-OPTION-FIELD]:** MCQ *scores* (correct/incorrect) are still non-deterministic because the bank's `finalAnswer` stores answer TEXT, not the option LETTER, so the grader can't do a deterministic string compare of the picked option. The honesty path is fixed; the score path is not. Touches the bank/data shape → likely a `src/data` (gated) lane → its own scoped PR.
- **Sequencing:** the grading-reliability PR first → then the **detect/`thinkingBudget` fix** → then **PR-B** (the durable per-student worksheet record). [FU-MCQ-ANSWER-OPTION-FIELD] slots in when owner authorizes the data-lane change.
- Also tracked (separate PRs): **[FU-WORKSHEET-NONATTEMPT-TEXT]** (explicit "don't know"/non-attempt text — non-empty, guard can't see it; folds into [FU-GRADING-RELIABILITY]), **[FU-WORKSHEET-BANK-ANSWER-POLLUTION]** (~26 files / ~54 strings marking-scheme junk in model answers; content lane).

> **Two parallel queues now exist** — pick per owner: **(1) Bank Expansion** Batch 3 (Triangles + Circles), the IMMEDIATE NEXT below; and **(2) Topic Hub rebuild** — PR-B concept-spine (landed via `c418f59`) + **PR-C tutor flow DONE (#272, `d9ba545`, owner live-verified)** + **PR-D final-IA LAYOUT DONE (#274, `b57fa79`, owner live-verified GOOD)** + **PR-E1 DONE (#276, `1de6f3e`, owner live-verified)** — concept-row Practise → Quick Practice direct + exact mark-band filter + single-pool count fix + Chapter-test button wired + MockBuilder un-routed; **[FU-PRACTISE-CONCEPT-FILTER] CLOSED** → **PR-E2 NEXT** (Worksheet — its own locked spec) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set), all verified against the FINAL IA committed in #268 (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` + the supersession block in `LazyTopper_Learn_Flow_Spec_LOCKED.md`). **Each PR starts fresh in its own worktree.** Two Topic-Hub follow-ups stand apart from the layout/wiring queue: **PR-D.1** (mobile full-screen tutor toggle, a `TeachFlow` change split from PR-D, owner-approved — `TeachFlow` now backs ONLY the one live Topic Hub tutor, so low blast radius) and **[FU-CONTEXTUAL-TUTOR-REBUILD]** (the `/api/mentor` `concept_teach` engine serves a scripted "Ravi Sir/Step N of 5" lesson, not contextual to student input; pre-existing, separate workstream). See OPEN_QUESTIONS + IMPLEMENTATION_ROADMAP for the PR-E…PR-G breakdown.

## ⏭️ NOTES TRACK — next action (as of #282 merged, squash `de2a616`)

### Notes track — next action (as of #282 merged, squash de2a616)
**Decision (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** component fed by a **structured note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — NOT standalone HTML. The tutor and PR-F both consume the spec as data. **Step 2 authors specs (JSON), not HTML.**

**Next build order (gated — do not reorder):**
1. ✅ **DONE (#289, `c525b2a`)** — `notes/validate_spec.py` (source-required validator to note-spec **schema v1.1**: rejects unsourced verbatim/example/NCERT-figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count) + the schema-v1.1 doc + the validated `light-reflection-and-refraction.json` reference spec + 5 negative fixtures + self-test. Light VALID; negatives each trip exactly one rule. The gate that makes the ~35-note fan-out safe is now live (and `--json` mode is ready to wire as a `SubagentStop` hook — a later step, not yet done).
2. ⏭️ **IMMEDIATE NEXT — Content PR (under `notes/`):** evolve the kit to `render_note(spec)` (so the preview HTML is GENERATED from the spec, not hand-written); finish Light's figure (base64→WebP into `notes/assets/light/`) + mindmap (D3-JS → `spec.mindmap` tree) lift, replacing the `_TODO` in the Light spec. Validate with `python notes/validate_spec.py --all` before/after.
3. Then in parallel: **PR-F** (`<Note>` component + Topic Hub wiring — cofounder/frontend session, reads `notes/specs`+`notes/assets`, writes `src/`) built on the Light spec, AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated.

**Do NOT start Step-2 generation or PR-F before the kit `render_note(spec)` content PR lands.**

---

## ⏭️ IMMEDIATE NEXT — Bank Expansion P1 **Batch 3 (Triangles + Circles)** when owner authorizes
Batches 1 (AP+Stats+SAV, 60) and 2 (CG+ARC, 45) are DONE + merged. **Batch 3 = Triangles + Circles** — ⚠️ this batch holds the bulk of the
**42 high-mark figure-locked questions** (Triangles 18 + Circles 15 of the 67-item census), so the **[FU-DIAGRAM-RECOVERY]** decision (recover
diagram-dependent Qs vs drop them) converges here — confirm with owner whether to drop-and-census as usual or pair with a diagram pass.
Same recipe per batch: extract verbatim from the Exemplar PDF → syllabus-filter (copy banned list from `scripts/src/syllabusGuard.ts`;
no banned subtopic in Triangles/Circles, but Constructions is its own out-of-scope chapter) → dedup vs repo (by `ncertRef` + content; surface
borderline) → AI step-marked solutions (`[N mark]` summing to marks; finalAnswer cross-checked vs jeep2an.pdf) → new `*.exemplar2.ts` +
register in `canonicalQuestionBank.ts` + add ids to `AI_GENERATED_SOLUTION_IDS` (NEVER edit `predictionTypes.ts`) → gates + Codespaces
vitest (now 11/11 green post-#264) → **STOP for owner solution/fidelity verification; no self-merge.** Then Batch 4 (Trig + Pair-of-Linear-Eq)
→ Batch 5 (Real-Numbers + Polynomials). Reusable tooling: `C:\Users\Chetan\OneDrive\Desktop\diff\exemplar-extraction\`.

## ⏭️ ALSO QUEUED (parallel tracks, owner-authorized separately) — [FU-AITIER-MARKS-MISMATCH] content pass → [FU-AITIER-RANK-DIFFICULTY-HELPERS] → (iii) gated-spelling → (2) MI eval → (3) Stage 3 → Fix B
topicKey audit (i) + Fix A (#242) + Check & Improve auto-detect (#244) + detect-then-confirm (#246) + (ii) "Finish session"
scorecard trigger (#249) + **read-only AI-tier audit (DONE)** + **AI-tier PR1 (#251 — DONE, [FU-MALFORMED-QUESTION] RESOLVED)** +
**AI-tier PR1b pack retags (#253 — DONE, [FU-AITIER-PACK-5MK-SHORT] RESOLVED)** +
**AI-tier PR2a provenance + soft ranking (#255 — DONE, trunk `686f737`, multipliers `1.0/0.6/0.3`, Quick Practice/topic
practice covered, owner live-verify PASS)** + **AI-tier PR2b `pastBoardYear` strip (#257 — DONE, trunk `d6e0e14`, 96 values / 5
files stripped, dedup → score-only, HPQ confidence proven unaffected, `predictionTypes.ts` untouched)** are done. The items below
are **QUEUED but NOT yet authorized** — the owner sends each as its own instruction, branched fresh from `d6e0e14`. Do not start
until instructed.

- **[FU-AITIER-RANK-MOCKS-HPQ] — ✅ DONE (#259, trunk `775ee75`).** Extended PR2a's `SOURCE_MULTIPLIER` (reused, exported
  `getSourceMultiplier`) to **Full Mock** (`unlimitedPaperEngine.weightedSelect` + authentic-first archetype prefill) and **Topic
  Mock** (`topicMockEngine.weightedShuffleByScore`) — per-slot soft demotion, structure-preserving. **⚠️ HPQ was a no-op** —
  `highlyProbableQuestions.ts` is a hand-authored curated bank, never uses `getAllQuestions()`, ZERO AI-pack content → left
  untouched (boundary correction). All AI-bearing surfaces now covered. Codespaces vitest 7/7. Owner live-verify (queued below).
- **(NEXT) [FU-AITIER-RANK-DIFFICULTY-HELPERS] — difficulty-helper surfaces.** `difficultyAwarePractice.ts` +
  `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity, but were out of #259's named scope + authorized
  file list (NOT touched). Apply the same `getSourceMultiplier` demotion to their selection. Owner-authorized, separate, its own
  instruction branched fresh from `775ee75`.
- **[FU-CURATED-26-PROVENANCE] — decision recorded** (the 26 curated inline `2026-…` items stay `authentic`; re-open only if they
  should become a curated/predicted tier).
- **(THEN) [FU-AITIER-MARKS-MISMATCH] — content/marks pass for the 7 quarantined pack items.** `TG3-056, TG3-059, ABS2-047,
  CR2-043, MNM2-037, REP2-039, PR2-018` are SHORT questions wrongly tagged 5-mark (NOT a label problem — PR1b deliberately did
  NOT relabel them). Fix the MARKS (or rewrite the question to match 5 marks), then remove each from `PACK_5MK_SHORT_BACKLOG` in
  `aiTierContentIntegrityGuard.test.ts`. Content-judgment + gated `.pack` edits — owner-authorized, separate.
- **Read-only AI-generated-question-tier audit — ✅ DONE** (`report-ai-tier-audit-2026-06-17.md`). Characterised the tier:
  file-based classification (no per-question `source` field), ~3,684 authentic vs ~3,010 AI in the live pool (~45% AI, ~816
  short of the 4,500 threshold), Q10 = a one-off cross-concept fusion, the 5-mark-"Short" tag defect was systematic, no
  ranking demotion exists, mocks draw from the mixed unified bank. Seeded **PR1 (#251)** + PR1b + PR2 above.

0. **⚠️ PRE-LAUNCH GATE — [FU-DETECTION-META-LAUNCH-FLIP].** Before shipping Check & Improve to students, flip
   `SHOW_DETECTION_META` to `false` in `lazytopper/src/utils/checkImproveDetection.ts`. It is ON now so the owner can see the
   detection machinery (source label etc.) during testing; students must NOT see it. This is the tester-vs-student line — a
   one-line change, but a real miss if forgotten. (It hides only the meta/source label, never the detected values or the
   Change control.) Verify on both desktop + app after flipping.

1. **(i) Read-only topicKey audit — ✅ DONE** (`report-topickey-duplication-audit-2026-06-16.md`). Fix A (#242) shipped the
   **read-time repair** half ([FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED). **Fix B = the bank-key DATA consolidation to one
   canonical kebab topicKey per topic + a CI guard that fails if a non-canonical topicKey reappears = [FU-TOPICKEY-CONSOLIDATION],
   HELD / authorized-later** (gated `src/data/**` across ~60 files; staged Maths/Science; migration map + guard design in the
   audit report §5). Do NOT start Fix B until owner-authorized.
2. **(ii) "Finish session" scorecard-trigger PR — ✅ DONE (#249, trunk `704dcff`).** Replaced #240's `allDone`-only scorecard
   trigger with an explicit student-declared "Finish session" action; honest on PARTIAL sessions (attempted-only denominators +
   "the M you didn't reach aren't counted"). Owner live-verify PASS (3-of-10 + zero-attempt both honest).
   **[FU-SESSION-SCORECARD-TRIGGER] CLOSED.** Report: `report-finish-session-scorecard-2026-06-17.md`.
3. **(iii) Gated-spelling follow-up — [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **MI eval — [MI-EVAL] check-solution eval set** (40–60 graded answers + tutor fabricated-solution correctness eval;
   launch gate). Gates how hard we lean on AI-estimated grades; unblocks the eval-gated items.
5. **MI Loop Stage 3 — concept-level targeting (eval-gated).** Pass the weak concept/mistake-pattern into
   `generatePracticeSet`'s `conceptKey` (needs MI sub-concept capture + the eval set). = **[FU-DRILL-ENRICHMENT]**.
   Do not start until the eval (step 4) exists.

### MI-loop follow-ups (logged; slot into the batches above)
- **[FU-IMPROVEMENT-CARD]** (the loop-closer deletes the wrong-answer entry at zero, erasing the improvement record →
  record a durable "gap cleared" event before building any improvement/journey card on Me — sequence: durable event FIRST).
- **[FU-WEAKAREA-ALIAS-DISPLAY]** (active-gaps count under-shows for label≠canonical-slug topics; surface/ranking — batch 1).
- **[FU-ATTEMPT-MARKS-ACCURACY]** (marks-weighted Me accuracy; display-only — but touches how accuracy reads, so eval-aware),
  **[FU-ATTEMPT-SR]** (dropped spaced-repetition side-effect — its own decision).
3. **Stage-1 polish follow-ups** (see OPEN_QUESTIONS): **[FU-DRILL-ROUTING]**, **[FU-WEAKAREA-LABEL]**, **[FU-WEAKAREA-CTAS]**,
   **[FU-WEAKAREA-HUB-LIMIT]**. **[FU-ME-REFRESH]** — Me auto-refresh after a grade (still open). **[FU-GRADE-MARKSCALE]** /
   **[FU-GRADE-CONSISTENCY]** / **[MI-EVAL]** — eval-gated grade-quality items.

## ⏭️ IMMEDIATE NEXT — close the Track B gate (live round-trip), then PR2 (harden), then resume Phase-2
INFRA-4/PR1 is **DONE + the backend is LIVE on Railway** (owner-confirmed `stub:false`, Gemini direct-key); grading is no longer
dark in prod. The critical path is now:
1. **[OWNER+COFOUNDER] Track B live round-trip → CLOSE [TRACK-B-GATE].** On the live app: sign in → grade a real answer → confirm
   "Saved to your progress" → mobile Me shows the real mistake mix → desktop Me matches (same uid); plus failed-grade → error.
   Runbook §7 in `report-api-gateway-railway-2026-06-10.md`. Only this pass closes the gate / ISSUE-009.
2. **INFRA-4 / PR2 (harden) — queued.** Provision Postgres + set `DATABASE_URL`; **add `tsx`** (warmup needs it once Postgres is on);
   set `ADMIN_FIREBASE_UIDS` (admin routes 503 without it) + `SESSION_SECRET` (share feature); add rate-limiting; decide warm-pool
   (`WARM_POOL_TOP_UP_INTERVAL_MS` is `0` for a quiet first deploy). **INFRA-4b** claudeClient Replit-proxy rewire = later visuals PR.
3. **Resume Phase-2 responsive divergence** — RESP-DIV-2 (mobile logout) next, then the rest of the punch-list below.

### 1. Phase-2 RESPONSIVE DIVERGENCE punch-list (desktop is source-of-truth; no invented numbers)
Ordered in OPEN_QUESTIONS. Each is its own scoped PR (desktop-leads, mobile-adapts; Option-B grammar):
- ~~**Track A — mobile Me honesty (RESP-DIV-1)**~~ **DONE (#220).** Fabricated −12/−8/−5 + invented weak-topics removed.
- ~~**Track B — mobile Check trust + persistence**~~ **DONE (#222), but verification-gated.** Guard fixed; persistence wired to
  the shared `logMistakes`/`getMistakeLogs` pipeline; mobile Me reads real data. ⛔ **[TRACK-B-GATE]** the successful
  grade→persist→Me round-trip is UNPROVEN until the backend deploy (grading is dark in prod) — verify at INFRA-4 go-live; do not
  mark fully done until then.
- **RESP-DIV-2 (NEXT, functional-HIGH) — mobile has NO logout path.** Add Log out + Manage subscription to mobile chrome / Me page.
- **Topic Hub reconcile** (wire mobile "Learn" to the tutor; label/drop synthetic fallback questions; honest progress vs the
  localStorage "Chapter Mastered" claim) → **Worksheets parity** (mistake-intelligence + multi-topic/full-subject + save +
  Science `stream` field) → **Home real-insights** (firebase-free boundary decision) → **RESP-DIV-3 (cosmetic) trial banner**.
- **Durable cure:** converge mobile Me into desktop Me (one responsive component, one data pipeline) — after Track B.
Owner supplies order confirmation + any frozen design before each.

### 2. Phase-2 clean-branch (later) — execute the marker deletions
#218 marked 46 files `LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) without deleting them. A later clean-branch greps
the markers to delete (retired) / keep (deferred). Also clear the §7 sever residue (MockPaper into the predictive
family; admin-lane back-links; TopicHubHome orphan; dead buildUrl helpers). See OPEN_QUESTIONS.

### 3. Go-live deploy chain (the launch unlock — AI is dark in prod until this)
INFRA-4 backend deploy: deploy `api-server` (runs the `lazytopper/server` gateway as a child) + provision Postgres →
Railway + `/api/*` rewrite in `vercel.json` + rate limiting; INFRA-4b Claude/Gemini client rewiring (Replit-proxy →
direct Anthropic/Gemini key).

### Owner / deploy actions pending (go-live)
- **Admin bootstrap (BLOCKING):** set `ADMIN_FIREBASE_UIDS` to your Firebase uid — the ONLY way admin routes
  authorize now (else 503 in prod).
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) — `requireFirebaseAuth` returns 503 without it.
- **Firebase Authorized domains:** add the prod Vercel domain (Google `signInWithPopup` needs it; email/password does
  NOT). Phone-OTP is unchanged since #214 (the sever touched zero auth files).
- **Google One-Tap (GIS)** follow-up once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided.
- **[SMS-DELIVERABILITY]** Firebase default SMS sender lands in Android spam (DLT-registered sender / custom provider
  needed; operator lead-time — start early if phone becomes primary). Phone is the fallback; Google/email is primary.

## (the PRODUCT-track sections below remain valid — pick up after the auth migration arc, or in parallel per owner)

## ✅ THE INFRA THAT MATTERED IS DONE — NEXT SESSION PIVOTS TO PRODUCT + THE LAUNCH DEPLOY
Closed this session (see CURRENT_STATE): lockfile fixed (#201), CLAUDE.md corrected (#198), CI LIVE + proven
(#198), de-Replit COMPLETE (#199 + #204 → fully `@replit`-free). CI now gates every PR (pnpm 10.32.1 frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix); human merge gate retained.

### Remaining infra — TRACKED, but NOT blockers to product work
- **INFRA-4 — backend deploy** (THE launch unlock; AI is dark in prod until this): deploy `api-server`
  (runs the `lazytopper/server` gateway as a child) + provision Postgres → Railway + `/api/*` rewrite in
  `vercel.json` + rate-limiting.
- **INFRA-4b — Claude/Gemini client rewiring** (`lazytopper/server/services/claudeClient.cjs` Replit-proxy
  → direct Anthropic API with the owner's key) — lands WITH the backend deploy.
- **INFRA-5** Clerk `pk_live_`; **INFRA-6** Vercel proper build config; **INFRA-7** domain; **INFRA-8**
  check-solution eval set (launch gate).

### Product entry points (pick with the owner)
- **Responsive/mobile-completeness audit** (read-only first) — the product is ONE responsive website, but the
  `src/pages/` desktop/app/mobile split is inconsistent (`mobile/` has only ~5 surfaces). Map every surface ×
  desktop-done/mobile-done BEFORE the redesign roadmap.
- **TopicHub Option-B convergence** — the big surface; locked design specs exist (the next Option-B after
  Exam Trends #184/#190).
- **HPQ Phase 2** (content authoring; supervised brief exists; depends on TopicHub for mastery-loop routing).
- **Notes / formulae / interactives for ~40 topics** (Gemini-generate → owner-validate → TopicHub-render;
  template sign-off gates it).

NOTE: the HPQ Phase 2 / Exam-Trends / Option-B detail sections below are unchanged and still current.

## POST-#196 (housekeeping done; does not change the next HPQ task)
The three long-red ops suites (D38) are GREEN: mojibake 3/3 (re-encoded circles.proof.ts + the second
corrupted file maths.caseBased.ts the diagnosis missed), bank-health 4/4 (stale→retirement guard + orphan
dead-compute deleted), canonical 4/4 (re-pointed to the relocated practiceQuestionBuilder.ts). The
`check-mojibake.cjs` 50-hit scan cap (why the second file stayed hidden, and the local+CI blind spot) is
removed. **NEW tracked follow-up [D39]:** the mojibake guardrail workflow is mislocated under
`lazytopper/.github/workflows/` so GitHub never runs it — relocating + EXPANDING CI (gate the full matrix +
scope-guard, not just mojibake) is a deliberate infra change owed its OWN PR (verify uncapped checker clean
across all trunk first; decide trigger scope). Not blocking the next HPQ task.

## HPQ PHASE 1 — DONE (#194). Consistency + honesty (logic/copy/plumbing only).

HPQ now tells the SAME story as Exam Trends. Tier badges are driven from the locked tiers
(`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`) via a single canonical-key→tier lookup in
`getHighlyProbableQuestions()` — **0 tier contradictions (was 11/27); must-crack badge share 74%→42%**.
Dead `deriveHPQConfidence` compute retired (page shows no confidence UI; `hpqConfidence.ts` kept for a
future model). Copy reframed to honest "High-Probability Question Patterns" (representative shape, not a
specific-question prediction; three locked evidence sources named). Plumbing: canonical-key merge dedupes
the duplicate Pair-of-Linear / Metals cards; Science filter fix recovers Human Eye 1→4 and DEV-logs any
future drop. All questions KEPT (re-badge + de-emphasize, never delete). 3 files, +140/−36;
`predictionTypes.ts` frozen. Gates green; pre-existing reds (bank-health/canonical-gen/mojibake) verified
unrelated. Report `report-hpq-phase1-consistency-2026-06-05.md`. Trunk `6d5b6ed`. See CURRENT_STATE top.

## NEXT HPQ TASK — HPQ PHASE 2 (content authoring; gated `src/data/`, owner-validated, PYQ-sourced).

Phase 1 only RE-BADGED. Phase 2 adds/rebalances CONTENT — author from real PYQ sources, owner-validated:
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** (the deepest "same story" gap): Trig
   Heights & Distances 5-mk LA; Surface Areas combination-of-solids 5-mk LA; Statistics grouped-median
   5-mk LA; Triangles similarity/BPT proof (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk
   displacement SA. (Maths currently has effectively ZERO valid 5-mk LA HPQs.)
2. **Distribution re-weight toward must-crack:** lift Circles (2) and Heredity (4) to adequate; trim or
   re-tier the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and
   tapers to good-to-do. (Phase 1 deliberately left volume alone — re-badging only.)
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; fix the only Maths "Section D"
   item (currently 4 marks, which is why Maths reads as zero valid 5-mk LA).
4. **Backfill 49 competency `solutionSteps`** (the `*-comp-*` entries carry answer+explanation but no
   step-marked working) to the §13 CBSE step-marking minimums per section.
5. **Confidence-model reconciliation** — DEFERRED until a confidence UI is actually designed; re-base
   `compute5SignalScore` on blueprint-weight + 4-year frequency + §4 sub-pattern (so a band can never
   contradict a tier) before any confidence badge ships. See OPEN_QUESTIONS.

## EXAM TRENDS BAND REDESIGN — DONE (#190). Steps 5 + 6 complete.

The Exam Trends surface is now 3 collapsible priority bands (Must-crack / High-ROI / Good-to-do) on the
owner-signed-off locked tiers (`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`, transcribed VERBATIM).
The locked doc IS the fresh, scientifically-derived tiering D27 asked for (step 5), and #190 is the band
redesign (step 6). Layout-only Option-B evolution of the ONE component; 1 product file; "Expect:" line on
the 11 must-crack topics only; volatility flag on Trig + Electricity; no fabrication; grammar preserved.
Gates green (tsc, build, verifier, matrix 175/175). scope:guard FAIL = known monorepo path-prefix artifact
(verified not a breach). Trunk `cfb3106`. See CURRENT_STATE top section + SESSION_LOG.

## SYLLABUS-CORRECTNESS ARC — CLOSED (#186 + #188). Gating guard GREEN, matrix 175/175.

The content sweep (#188) deleted the 93-item worklist the corrected guard flagged → gating
`syllabusGuard` exits 0, `test:matrix:all` = 175/175 (incl. #19). Banks: Conversion of Solids ×46
deleted (canonical 6520→6474, spreads intact). Surfaces: EMI/Motor/Generator + Euclid/Frustum ×47
deleted/rewritten across predicted/HPQ/competency/config/trends/topics/topicHubContent + tutor
contracts. Owner decision DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate. The tutor no
longer teaches Euclid's lemma or evolution evidence. See DISCOVERIES D26 (CLOSED) + D31 (deferred
polynomials follow-up).

## IMMEDIATE NEXT TASK — step 7: next Option-B surface (TopicHub concept-spine)

Exam Trends (the FIRST Option-B surface, #184) is now fully converged through its band redesign (#190).
The next track item is the next Option-B surface — **TopicHub concept-spine (+ Formula Sheet / NCERT
Notes)** — using the same template (ONE responsive component per surface; design grammar reused; honest
data only). Note the carried OPEN gate: the Notes/Formula template needs owner sign-off (structure,
granularity, #examples) BEFORE generation. Optional pre-step for #190: capture the 360/768/desktop ×
Maths/Science band screenshots as PR evidence (deferred — owner to request).

## THE SEQUENCE (owner-confirmed; reordered post-#186)

1. ~~Track A PR-1 — tutor wiring~~ DONE (#181 — desktop TopicHub "Learn this").
2. ~~PR B2 — teach-prompt tightening~~ DONE (#182 — LOCKED style; owner live-verified).
3. ~~Exam Trends ranked-list responsive redesign~~ DONE (#184 — FIRST Option-B convergence; merged `93a2674`).
4. ~~Correct + EXTEND syllabusGuard (the RULER)~~ DONE (#186 — corrected to official 2026-27; extended
   to 24 board-prep surfaces; 2 stale doctrine-locks fixed; merged `918b754`). The guard half of D26.
4b. ~~CONTENT SWEEP~~ DONE (#188 — deleted the 93-item worklist; gating guard GREEN, matrix 175/175
   incl. #19; banks Conversion of Solids ×46, surfaces EMI/Motor/Generator + Euclid/Frustum ×47;
   DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate; trunk `e0395fc`). Closes D26.
5. ~~Re-derive Exam Trends priorities FRESH~~ DONE (owner-signed-off composite model + 2 teacher
   overrides → `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`; the scientific basis D27 asked for).
6. ~~Exam Trends band redesign~~ DONE (#190 — Must-crack / High-ROI / Good-to-do collapsible bands;
   reuses the merged ranked-list rows; the band replaces the weight-vs-trend Sort toggle; 1 product
   file; "Expect:" line on the 11 must-crack topics; volatility flag on Trig + Electricity; trunk `cfb3106`).
7. **(NEXT) Then the other Option-B surfaces: TopicHub concept-spine (+ Formula Sheet / NCERT Notes) →
   Check & Improve → Me/Progress → Worksheet generator** (each Option B; one responsive component per
   surface; same template as Exam Trends #184).
8. Separate follow-up PRs (not blocking): interactive-handoff fix (`findVisualForConcept` returns the
   WRONG visual — standard-angles showed Height & Distance); mobile-tutor wiring (mobile
   `src/pages/app/TopicHub.tsx` "Learn" is a placeholder → Check & Improve, NOT wired to concept_teach);
   Formula/Notes generation + content-correctness pass; AI cost/rate-limit hardening (launch gate, D25).
5. **Railway deploy** + `vercel.json /api/*` rewrite + rate limiting — the unlock that makes the
   Vercel link's AI features work (ISSUE-009) → hand students the link. At link-time: Clerk
   `pk_test_`→`pk_live_`, DPDP/consent for minors, monetization charge path.
6. **Launch chain (after the redesign + eval set):** check-solution eval set (40–60 graded answers,
   launch gate) + the tutor fabricated-solution correctness eval → Railway deploy + `vercel.json /api/*`
   rewrite + AI rate-limit/cost hardening (D25) → Clerk pk_test_→pk_live_, DPDP/consent for minors,
   charge path → hand students the live link. Deploy ONLY after grading + teaching are reliably GOOD locally.

## SUPERSEDED — old mobile-twin reflow track (replaced by Option B convergence)

The earlier mobile-reflow track (PR A #166 primitives → #168 mobile Home → #170 mobile landing →
#172 Home polish; staged usePracticeHub/MobilePracticePage) built mobile TWINS of desktop pages.
That approach is now SUPERSEDED by the LOCKED responsive Option B (DECISION_LOG 2026-06-03): one
responsive component per surface (desktop-leads, mobile-adapts), retiring both twins. The grammar
primitives (`src/components/grammar/`) and the `isMobileSelfChromedRoute` navbar pattern remain
useful building blocks for the convergence, but new work converges twins rather than forking them.

Remaining staged items (owner picks order & supplies the instruction + any frozen
design before each):
  - usePracticeHub extraction — reusable Practice Hub data/state hook
  - MobilePracticePage — mobile Practice reflow (consumes the hook)
  - (any further per-platform reflows for routes that render a desktop page at mobile
    width — verify render sites; RootEntry-style redirects mean not every site needs it)

Branch fresh from the current tip. Await the instruction (+ frozen art if any) first.

PATTERNS ESTABLISHED (reuse in PR C/D):
- Per-platform split: `isDesktop ? <Desktop/> : <Mobile/>` at the route (App.tsx edit
  permitted ONLY for that minimal branch). RootEntry-style redirects may mean only
  some sites need the switch — verify render sites first.
- Reuse without firebase coupling: lift shared, dependency-free logic into a small
  module (e.g. PR #168's src/lib/desktop/homeDestinations.tsx) imported by both
  variants; do NOT import a heavy page into a light one (pulls firebase into the chunk
  + unit test).
- Grammar primitives: import from `src/components/grammar` (`Card`, `TileRow`, `Pill`,
  `SectionHeader`). TileRow reflow is pure CSS (@media max-width:1023px); `columns` prop.
- Desktop-unchanged proof: keep edits to the desktop component module-level only
  (relocate declarations; never touch the component JSX) and show the diff hunks are
  all pre-component.

NOTE: build gate = `npm run build` (the real Vercel command); the Vercel PREVIEW
check on each PR is a valid pre-merge production-build gate. The false-green
`npx tsc --noEmit` was fixed in #164.

## RENDER-TEST INFRA NOW AVAILABLE (PR #160)

`npm test` in `lazytopper/` runs Vitest over `src/**/*.test.{ts,tsx}` (jsdom,
Testing Library, jest-dom; `window.matchMedia` polyfilled in `src/test/setup.ts`,
overridable per-test via `setMatchMediaMatches`). Every future UI PR (grammar
primitives, Mobile Home, practice-page extraction) MUST ship a real render/reflow
test as proof-of-work. The `scripts/` guard suite (137 tests, node:test runner) is
separate and unaffected — `vitest.config.ts` `include` is scoped to `src/`.

NOTE: the false-green `npx tsc --noEmit` was RESOLVED in #164 — `start:quick` now
runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and `precommit:check`
was removed. Use `npx tsc -p tsconfig.app.json --noEmit` (or `npm run build`) for a
real app typecheck.

## BANK STATE

Total questions: ~6,120
  - Authentic: ~3,341
  - AI-Generated: ~2,779
  - Board PYQs: 857 (all 4 main exam years complete)
    214 from 2022-23 (PR #135+#137)
    172 from 2023-24 (PR #147+#148+#150)
    182 from 2024-25 (PR #144+#145)
    193 from 2025-26 (PR #141+#142)
Spreads: 266 (post-PR #150; PR #151 added no new imports)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~74.2% reached)

## FILTER + STEP MARKS STATE

All filter chips working (post-PR #151):
  MCQ · Proof (broadened) · Competency · Assertion-Reasoning · Case-based · PYQ toggle
Section A + Remembering competency override active in 3 sites
Our Environment normaliser merged 156 split questions under one topic key
Step-marks guide-only banner removed for canonical bank questions

KNOWN ISSUE (post-#151): Proof filter still catches Section A conceptual
recall questions (subtopic contains "proof" or "identit"). Fix is one line
per file in practiceQuestionBuilder.ts + PracticePage.tsx — see ISSUE-007.

## PYQ EXTRACTION STATUS — COMPLETE

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done PR #141+#142 |
| 2024-25 (pyqYear 2025) | 57 Qs ✓ | 125 Qs ✓ | Done PR #144+#145 |
| 2023-24 (pyqYear 2024) | 96 Qs ✓ | 76 Qs ✓ | Done PR #147+#148+#150 |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done PR #135+#137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | LOW PRIORITY — Term II format |

All 4 main exam years extracted. P4 phase COMPLETE.

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — Small fix PR: Hindi garbled + Proof Section A exclusion (P0 — before launch)
Branch: fix/remove-hindi-garbled-pyq (fresh, small)
Combines ISSUE-006 + ISSUE-007 in one PR.

ISSUE-006 fix:
  Search all PYQ files for garbled Devanagari patterns and remove offending question(s):
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"

ISSUE-007 fix (one line each in two files):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (line ~485) and
  PracticePage.tsx (line ~290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;

Validation: 137/137 PASS, TypeScript exit 0

### Task 2 — P5 Sample paper extraction (P1 — pre-launch content boost)
Target: ~200 questions from CBSE sample + preboard papers
Branch: content/p5-sample-papers

### Task 3 — Filter UX redesign (P1 — student vocabulary, 2-layer layout)
Default visible (2 rows):
  Row 1 — Question Style: All · MCQ · Proof · Application & Scenario ·
           Assertion-Reasoning · Case-based
  Row 2 — Marks: All · 1 mark · 2 marks · 3 marks · 5 marks · Case (4 marks)
Toggle: "Board exam questions only" (PYQ)
Advanced (expandable): Difficulty + Source (Authentic / Practice only)
Key renames: "Competency" → "Application & Scenario", Section labels → Mark labels

### Task 4 — API gateway Railway deploy (P0 — AI features 404 in prod)
+ vercel.json rewrite

### Task 5 — Clerk pk_live_ keys switch (P0 — Vercel env var)

## PARKED (do not start yet)

- VSA-format doctrine: 96 questions (90 in B + 6 in A) not covered by the 7 migration rules
- Pack question regeneration with stricter per-section prompts (post-launch)
- K2D → Mistake Intelligence aggregation (post-launch)
- TutorDrawerV2 decision (post-launch)
- 2022 Term II papers (low priority)
- Product PRs (strategyHint button, Show visual fix, Formula sheet) — parked until authentic ≥ 4,500

## PIPELINE SCRIPTS

C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\add_competency_field.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\fix_canonical_bank.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\probe_section_format.mjs (PR #151 dry-run aid)
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_probe.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_extract.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_generate_ts.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_checkpoint_b.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_pyq_reachability.mjs

## LAUNCH TARGET

First week of June 2026 (~12 days from this handoff)
Primary use case at launch: chapter-by-chapter practice + worksheet generation
Filter complexity not needed by students until September (PT1 season)
Full timed mock + advanced filter system needed before October (half-yearly)
