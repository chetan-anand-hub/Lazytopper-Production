# LazyTopper — Current State

## [CURRENT] Wave ME-B CLOSED — the student's *why* now survives the click, three consecutive concept resolvers were wrong, and both lanes sit on GREEN DRAFT PRs that are **not on trunk** — trunk `376e30b0`

**`2026-08-09` · closing docs PR for Wave ME-B.** Three build lanes were dispatched. **Two returned
PASS, one returned BLOCKED with ZERO FILES — and that was the correct outcome.** A fourth (`ME-2`,
the v7 `/me` page) was **deliberately not started** and passes whole to Wave ME-C.

**Trunk at authoring: `376e30b0931eea69353c582011ed71f38da788f5`** —
`feat(ops): make the premise gate the agent's first command (#648)`. Re-derive before trusting it:
`git ls-remote origin base/approved-thru-437`. ⚠ **It moved FOUR times during this wave**
(`baf9b67a` → `3cf01287` → `3d6dce0c` → `3d3a32a9` → `376e30b0`); one lane caught a move itself and
re-cut rather than trust the SHA its brief pinned.

### 🛑 READ THIS FIRST — BOTH LANES ARE GREEN, AND NEITHER IS ON TRUNK

```
#647  TOPICHUB-1  OPEN · DRAFT · head 9144c216 · Quality Gate 31308051980  PASS
#649  RETRY-1     OPEN · DRAFT · head 25862843 · Quality Gate 31308051342  PASS
```

**`gh pr ready` is the OWNER's step, never an agent's.** ⇒ **`git log` on trunk contains neither
lane.** Anything below that reads as "shipped" is a claim about a **draft**, and the distinction is
the whole point of this section.

**Zero-skip proof, quoted from each run rather than summarised:**
- `#647` — root matrix `# suites 29 / # pass 196 / # skipped 0`; vitest
  `Test Files 138 passed (138)` / `Tests 1719 passed (1719)`.
  (Lane Overlap `31308051997`, CodeQL `31308051983`.)
- `#649` — root matrix
  `# tests 196  # suites 29  # pass 196  # fail 0  # skipped 0  # todo 0`; vitest
  `Test Files 138 passed (138)` / `Tests 1723 passed (1723)`; own suite **named as run**:
  `✓ src/services/mistakeRetry.test.ts (22 tests) 33ms`.
  ⚠ **Its one `skipped` STEP is the docs fast-path acceptance, correctly bypassed** because the
  classifier routed the PR to FULL BAR — **a skipped step is not a skipped test.**

⚠⚠ **THE COUNTS MOVED BETWEEN TWO RUNS ON THE SAME DAY** — `1719` on `#647` and `1723` on `#649`,
against `1662` recorded earlier in the same wave and `1387` in older notes. **They are read-at-the-
time values. Never carry one forward as a fixed number; read it from the run you are quoting.**

### What is on trunk since the last handoff (`#643`, `f654dc64`) — and who it belongs to

```
376e30b0  #648  ops: make the premise gate the agent's first command          owner/ops
3d3a32a9  #646  SETTINGS-1  a student can download their data and delete
                            their account                                     DPDP-B
3d6dce0c  #645  EXPORT-1    a student can download their own data, and the
                            file says what it left out                        DPDP-B
3cf01287  #644  TSX-1       declare tsx in lazytopper so the spawned warmup
                            child can resolve its loader                      DPDP-B
baf9b67a  #635  ops: commit the agent standing rules                          owner/ops
```

⚠⚠ **THE HONEST LIMIT ON THE THREE DPDP-B LINES ABOVE: they are transcribed from trunk commit
metadata, NOT from a close-out.** Addendum §6 requires the closing controller to *"ask that controller
for its bounded close-out first and WAIT for it"*. **DPDP-B stood down without opening a handoff and
without handing one over.** ⇒ **These three lanes have PR titles recorded here and no lane write-up
anywhere.** The next handoff must not read the lines above as a substitute for one.
`[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]`

🛑 **`TSX-1` (`#644`) discharges `[FU-ERASE-1-GATEWAY-TSX-UNDECLARED]`, the deploy blocker that was the
headline of the previous `[CURRENT]`** — owner-reported from the deploy logs: *"the gateway now boots;
`ERASE-1`, `EXPORT-1` and `SETTINGS-1` are RUNNING CODE, not merely merged."* ⚠ **Owner-supplied and
not independently verified by this controller** — the acceptance evidence for that class is a
successful Railway boot, which no gate in this repository can produce.

### The lanes

| lane | outcome | state | what it changed | what it disproved |
|---|---|---|---|---|
| `ARRIVAL-1` | ⛔ **BLOCKED — 0 files** | no branch, no PR | **nothing, by design** | `TutorBrief`'s only consumer is under `server/**`; *"TopicHub reads no query params at all"* was FALSE; the resolver its spec named was the wrong symbol |
| `TOPICHUB-1` | ✅ PASS — 4 files | **`#647` OPEN, DRAFT, CI GREEN** | TopicHub reads `?concept=`, marks and scrolls that spine row, honest fallback when the label does not match | `resolveCanonicalSlug` **and** `conceptKeyForLabel` both wrong; `BoardConcept` has **no key field**; spine rows were never collapsed, so *"expand"* had no referent |
| `RETRY-1` | ✅ PASS — 2 files | **`#649` OPEN, DRAFT, CI GREEN** | `services/mistakeRetry.ts` — classify a mistake-log id into exact-retry vs similar-only vs nothing | **HPQ does NOT resolve** — 0 of 140 HPQ ids appear among the 8543 bank ids; `conceptForBankQuestionId` is **not an existence test**; a fifth prefix `qp:` would have demoted every Quick Practice entry |
| `ME-2` | **NOT STARTED** | — | — | — |
| `SCOUT-PROTO` · `SCOUT-RETRY` | ✅ returned | wrote nothing | read-only | both re-scoped the lane that followed them |

⭐ **THE WAVE'S REAL OUTPUT WAS DISPROOF.** Eight spec premises fell — the owner's, the controller's,
and **three consecutive wrong concept resolvers**, the third of which was caught only because the
candidate was passed on flagged `UNVERIFIED` with an instruction to verify rather than inherit.
**All 28 numbered findings, with their provenance and confidence, are in
`handoff/WAVE_STATE_ME_B_ARCHIVE.md`** — archived byte-identical to the live state file and verified
by `sha256sum`, not by `git diff`.

### ⭐⭐ TWO GIT BEHAVIOURS THIS WAVE THAT ARE WORTH MORE THAN THE CODE

1. **A rejected push was handled WITHOUT a force-push.** A remote trunk-merge (`26d3c8b1`, carrying
   `#644`/`#645`/`#646`/`#648`) landed on `#647`'s branch mid-push and the push was **rejected**. The
   lane **fetched, inspected both directions, merged remote into its branch**, and afterwards
   **re-reconciled `gh pr view 647 --json files` against the base — still exactly 4 files.**
   ⇒ **This is the Wave-4 force-push mechanism — which once dropped two merged PRs off trunk —
   AVOIDED rather than survived.**
2. ⭐⭐ **MERGE-BASE RECONCILIATION WAS ACTUALLY PERFORMED**, on `#649`:
   `gh pr view --json files` compared against `git diff --name-only 376e30b0..25862843`, found
   **IDENTICAL**. **This is the check the operating model describes as *"the missing check, and the
   data already exists — nothing does today"*.** It matters because **a squash merge diffs against
   the base AT MERGE TIME, so a PR's own file list is not necessarily what lands** — a product PR
   once reported 4 files and landed 13. ➜ **Make it standard.**
   ★ The same lane rebased `3cf01287` → `376e30b0` with **`git reset` + `git merge --ff-only`, NOT
   `git reset --hard`** — never auto-approved in this repo, and unnecessary because no commits
   existed yet. **All gates were RE-RUN post-rebase rather than carried forward**, and
   `MeProgressPage.tsx` was re-checked as untouched **after** the rebase, since `#646` had landed
   changes to that very file in the meantime.

### ⇒ CARRY FORWARD VERBATIM — ⚠ RE-DERIVED AGAINST TRUNK `376e30b0`, NOT COPIED

**ONE dormant capability, not five.** `WIRE-2` (`#621`) ended `#578`, `#611` and `#617` —
`gradeQuickPracticeBatch` **is invoked in `lazytopper/src/pages/PracticePage.tsx`**, at the call
`const result = await gradeQuickPracticeBatch({` (line 2223 today — **a derived value; re-locate by
the quoted call, not the number**). **`expectedMarks` is the ONLY remaining dormant item.**

**Recipe, so this is re-checkable rather than asserted:**

```bash
git grep -ln 'expectedMarks' 376e30b0 -- lazytopper/src | grep -v 'lazytopper/src/prediction/'
#  -> EMPTY.  All three hits are cbse5SignalScoring.ts, historicalAppearanceIndex.ts
#             and historicalAppearanceIndex.test.ts, every one under src/prediction/.
git grep -n 'gradeQuickPracticeBatch' 376e30b0 -- lazytopper/src/pages/PracticePage.tsx
#  -> line 2223 is a real invocation, not an import or a comment.
```

⚠⚠ **`ME-2` DID NOT RUN, SO `expectedMarks` IS STILL DORMANT AT THE CLOSE OF THIS WAVE**, with zero
consumers outside `src/prediction/`. **`ME-2` is still the thing that ends it.**
`[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` **stays OPEN** — anyone restating this block must
re-derive it against trunk with the commands above, not paste it.

⭐ **A SECOND dormancy now has VERIFIED, not asserted, status.** `#649`'s CI build ran (1124 modules,
9.69s) and **emitted no `mistakeRetry` chunk** — the evidence ladder's rung is still *test-only*, and
it **flips to "ships" the moment `ME-2` imports the module.** `[FU-RETRY-NO-BUILD-CHUNK-YET]` is a
tracking item for ME-C, **not a defect.**

### ⚠⚠ THE RISK THAT MUST TRAVEL — `#647` IS A CONSUMER WITH NO PRODUCER

**Nothing in the product emits `?concept=` into `/topic-hub`.** `buildDesktopTopicHubPath` is
structurally incapable of it (`DesktopRouteContext` is `{source, returnTo}` only) and HPQ does not
link to `/topic-hub` at all ⇒ **reachable today only by a hand-typed URL. MOUNT ≠ LIVE.**

➜ **IF `ME-2` DOES NOT SHIP, `#647` IS DEAD CODE ON TRUNK.** *(Owner-ratified, `R6`, and recorded
verbatim at his instruction.)* `lazytopper/src/lib/desktop/navigation.ts` therefore moves into
**`ME-2`'s** allowlist — `ME-2` owns `MeProgressPage.tsx` and must emit the CTAs anyway, so it is the
natural producer. **`ME-C` must treat the producer as `ME-2`'s FIRST obligation, not a trailing
detail.** `[FU-TOPICHUB-CONCEPT-PRODUCER]`

⚠ **`ME-2` must emit EXACTLY**
`/topic-hub/<grade>/<subject>/<topicSlug>?concept=<EXACT boardEssentials name, URI-encoded>`
— **the verbatim label. NOT a slug, NOT a `conceptKey`, NOT lower-cased.** `BoardConcept` has no key
field; **the row's identity IS its name.** `[FU-CONCEPT-LABEL-IS-THE-ONLY-CONCEPT-ID]`

### ⚠ NEW SINCE THE LANES WERE BRIEFED — `ME-C` MUST ABSORB THIS BEFORE WRITING A LINE

**`#646` (`SETTINGS-1`, `3d3a32a9`) TOUCHED `lazytopper/src/pages/MeProgressPage.tsx`** — it adds an
import and renders `<AccountDataControls />` as the page's **last section**. **`ME-2` rebuilds that
file wholesale and MUST PRESERVE that section.** Deleting it would silently remove a student's DPDP
data-download and account-delete controls — **a privacy regression shipped by a redesign.**
⇒ **Verify against trunk `376e30b0` or later, never against a brief written before it.**
⭐ `RETRY-1` already met this standard: it re-checked that file as untouched **after** its rebase,
precisely because `#646` had landed in the interval.

### The owner's rulings, and the one he withdrew

`R1` bar buckets mirror `ResultsScorecard`'s existing two headings — **four segments, renamed**
(`secured` · `careless slips` · `knowledge gaps` · `unclassified`), because it is **the product's
existing model rather than a new one**. `R2` the contrast fix is the **large-text threshold**
(the numerals are already `font-weight:700`; AA large = 3:1 at ≥18.66px) — **no token change** — with
the render threshold raised **7% → ~12%** so a 360px bar stops printing numerals that do not fit.
`R3` **hero is truth**; each deeper view carries an explicit remainder row so all three sum to it.
`R5` both controller self-fixes approved. `R8` `RETRY-1` commit+push approved, draft only.
`R9` **HPQ into the canonical bank is NOT a lane** — an owner content decision with syllabus
implications. `R10` a no-`questionId` entry **offers nothing**; silence is the honest option, and
`RETRY-1`'s `kind:"none"` already returns null — **confirmed, not altered.**

⭐⭐ **`R7` — THE OWNER WITHDREW HIS OWN `R4`.** `R4` had set the arrival badge to
*"This is the one costing you marks."* The lane **implemented it as ruled** and then reported that it
is **a performance claim asserted from a URL parameter**, on a page holding no graded or mistake data
— so a shared or stale link could tell a student a concept is costing them marks **for a concept they
never attempted.** Owner: *"you were right and my ruling was wrong. I ruled on voice; you found a
doctrine conflict I hadn't considered."* **Final string: `You came here for this.`** — true however
the student arrived, asserts nothing about performance, keeps the voice. **The withdrawn wording
never shipped outside draft.**
⛔ **The gate-on-MI-data option was REJECTED** — it would require TopicHub to read Mistake
Intelligence, which its brief forbids for good reason.
★★ **THE GUARD WAS UPDATED A THIRD TIME, NEVER DELETED.** The original regex (*"the marker carries no
performance claim"*) **would have passed VACUOUSLY** under `R4`'s copy, because it does not match
*"costing you marks"*. The final guard **pins the new exact string, KEEPS the no-numeric-figure
assertion, and RESTORES the no-performance-claim assertion widened so `costing` is a banned token** —
⇒ **the withdrawn wording cannot return.** Textbook *replace a guard, never delete it — pin what it
PROTECTED.* ✅ `[FU-ARRIVAL-COPY-ASSERTS-UNBACKED-MARKS-CLAIM]` **CLOSED BY REMOVAL OF THE CAUSE, not
deferred.**

### ⭐ `[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]` — an owner finding from the deploy logs, not a lane

The same logs that showed the gateway booting also show `relation "step_solutions" does not exist`,
and **nothing in the repository ever creates that table** — every reference reads or writes it; there
is no `CREATE TABLE`. The cache **fails soft**, so functionality is unaffected — **but every step
solution has always been regenerated from Gemini.** ⇒ **likely a real, standing cost line.**
**Owner-supplied; not independently verified by this controller.**

### VALIDATION (this docs PR)

`check:mojibake` (staged first, so `git ls-files` can see the files — an unstaged pass is vacuous) ·
`scope:guard --mode docs` · `git diff --check` · a **per-file heading census, before vs after, proving
the after-set a strict superset** — uniqueness is not completeness. **Scope: `handoff/` only, zero
product files.**
⭐ **This PR's CI run is the wave's only full-bar integration check**, because it runs the complete
gate against trunk with `#644`, `#645`, `#646` and `#648` composed together — something no product
PR does, since each runs against its own base.

---


## (superseded) [CURRENT] Wave DPDP-A CLOSED — #640 · #639 · #638 — trunk `6f7da56e` — a student can erase their own account, AND THE CODE IS NOT RUNNING IN PRODUCTION

**`2026-08-09` · closing docs PR for Wave DPDP-A.** Three lanes, all on trunk, verified **by content
and by log — never by `merge-base` on a PR head, because this repo squash-merges**:

```
6f7da56e  ERASE-1      a student can erase their own account, and a zero-match delete says so   #638
6ef083b5  USERS-1      a login no longer writes a child's identity to a dead collection         #639
c9445a1e  CLEARTEXT-1  prove only the uid reaches the nine localStorage sinks                   #640
```

**Trunk at close of the wave's PRODUCT lanes: `6f7da56ea9495fcfdbe80c577bc13b16a987f456`.** Quality
Gate on that exact SHA: run `31285980321` **PASS** (CodeQL `31285980316`, State Board `31285980317`
also green).

⚠ **TRUNK MOVED WHILE THIS HANDOFF WAS BEING WRITTEN, and the distinction matters.** `#642` (the
Wave ME-A handoff) merged at `2026-08-09T01:58:22Z` as **`516e50ffbc2fe4bab31c6bd7de7f4a265597c62c`**,
which is now the tip. **It is DOCS-ONLY** — `handoff/`, `cofounder-skill/SKILL.md` and `CLAUDE.md`.
⇒ **`6f7da56e` remains the SHA at which this wave's product lanes completed, and `516e50ff` is the
SHA this handoff is authored against.** Re-derive before trusting either:
`git ls-remote origin base/approved-thru-437`.

★ **COVERAGE WAS MEASURED, NOT ASSUMED.** A per-file census (`git show <trunk>:handoff/<f> | grep -c
"#<n>"` across all seven files) was run against trunk **before** writing and **again after `#642`
merged**. `#642` records `#629`–`#634`, `#636`, `#637` and `#641`; **`SESSION_LOG.md` carries ZERO
mentions of `#638`, `#639` and `#640`**, and `#642` says in its own words that they are
*"DELIBERATELY NOT WRITTEN UP HERE"* because they were another controller's lanes in an open wave.
⇒ **This handoff covers exactly those three and does not duplicate `#642`.**

### 🛑🛑 READ THIS BEFORE ANYTHING ELSE — #638 IS MERGED AND CANNOT DEPLOY

**Production is serving the `#639` build. The `#638` deployment CRASHED ON BOOT and Railway rolled
it back.** Owner-reported, and the mechanism is **re-verified here by command against trunk**:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /app/lazytopper/
```

`tsx` is declared in **`artifacts/api-server/package.json` only** (`"tsx": "catalog:"`, line 34) and
is **absent from `lazytopper/package.json` and from the root manifest** — all three checked on
`6f7da56e`. pnpm workspaces isolate dependencies per package, so the gateway cannot resolve it. The
Dockerfile does **not** prune (`# do NOT run --prod / prune`) ⇒ **this is an UNDECLARED dependency,
not a stripped one.**

⇒ **`[FU-ERASE-1-GATEWAY-TSX-UNDECLARED]` is a LIVE DEPLOY BLOCKER and is DPDP-B's FIRST lane**,
ahead of `EXPORT-1` and `SETTINGS-1`.

★★ **ERASE-1's live-verify is MOOT, not pending.** A Console check against production today would be
checking a build **that does not contain the code**. Do not record it as "live-verify owed" and do
not schedule it — **it cannot be attempted until the `tsx` fix deploys.** The abandoned-QR-upload
verification waits on the same fix.

⚠ **For the fix lane, two things that will otherwise cost a cycle each:**
- **A manifest change without a matching `pnpm-lock.yaml` update fails the Vercel build too.**
- ★★ **The acceptance test is a SUCCESSFUL RAILWAY BOOT, not a green suite.** Nothing in this
  repository's gate set can produce that evidence.

### ★★★ THE LESSON OF THIS WAVE — the missing rung on the evidence ladder

> ## **A test proves the code works. A build chunk proves it ships. ★ ONLY A BOOT PROVES IT RUNS.**

`MOUNT ≠ LIVE` has a level beneath it this project had never named:
**RESOLVES-IN-DEV ≠ RESOLVES-IN-THE-DEPLOYED-IMAGE.**

**This is not a lane that skipped its proof. It is a lane whose proof was demanded, delivered, and
still wrong.** SCOUT-1 flagged *"the gateway can import the map is strong INFERENCE from an existing
hook, not an executed import"*; the controller **promoted it to lane-blocking**; ERASE-1 reported
`MAP IMPORT IN SERVER PROCESS: EXECUTED PASS` — **and that report was true.** The import executed in
a **dev worktree, where every workspace dependency resolves**, and never in the **production image,
where pnpm's per-package isolation applies.**

★★ **The requirement was RIGHT. It was NOT MET — and nothing could tell the difference.** Making the
proof mandatory was not enough, because **the brief never specified WHERE it had to run**, and
**a lane-blocking proof executed in the wrong environment reads exactly like a met requirement.**

➜ ⭐ **Standing rule, now in `cofounder-skill/SKILL.md`: any lane that adds a runtime import to a
server must state WHICH IMAGE it executed in.**

### ⚠⚠ DORMANCY — RESTATED, AND IT NOW HAS TWO ENTRIES

**Carried forward from the `#642` block below, which had already CORRECTED the old four-name list —
that correction is preserved here, not re-litigated.** `#578`, `#611` and `#617` are **LIVE**;
`WIRE-2` shipped as `#621` and ended all three. **Do not re-add them.**

| capability | status on trunk `6f7da56e` | evidence |
|---|---|---|
| `#578` grader per-question images | ✅ **LIVE** — ended by `#621` | live-verified through typed grading in Wave 5F |
| `#611` `gradeQuickPracticeBatch` | ✅ **LIVE** — ended by `#621` | real caller in `PracticePage.tsx`, not just its test file |
| `#617` the graded answer sheet | ✅ **LIVE** — ended by `#621` | reached via the `#621` Finish path |
| ⚠ **`expectedMarks` (`#636`)** | 🛑 **DORMANT — tree-shaken out of the bundle** | absent from every `assets/*.js`; no production consumer. `ME-2` must WIRE it. |
| 🛑🛑 **`ERASE-1` (`#638`)** | 🛑🛑 **DORMANT IN THE SHARPEST FORM THIS PROJECT HAS RECORDED — MERGED, UNDEPLOYED, UNREACHABLE** | see below |

🛑🛑 **`ERASE-1` is a NEW SPECIES of dormancy and the block must not flatten it into the others.**
The other entries are *built but unwired* — the code ships in the bundle and nothing calls it.
**ERASE-1 is not running at all.** Three things are true at once and each alone would keep it dark:
1. **The production image does not contain a bootable build of it** (the `tsx` blocker above).
2. **No client caller exists anywhere in the repo** — `[FU-DPDP-ERASE-NO-CLIENT-CALLER]`.
3. **No student-facing surface exists** — that is `SETTINGS-1`, wave DPDP-B, not yet built.

⇒ **Nothing ships to students on this arc until `SETTINGS-1` lands, and `SETTINGS-1` cannot be
verified until the `tsx` fix deploys.** Stated here, in the block, and not only in the prose above.

### ⭐ ANSWERING THE QUESTION `#642` LEFT FOR THIS CLOSE-OUT — settled, by blob identity

`#642` asked, correctly, that this handoff check one thing: *"`#640` asserts only the uid reaches
the localStorage sinks, and `#637` changed what `mistakeIntelligence` writes — `#640` merged AFTER
`#637`, so `#640` must be re-checked AGAINST `#637`, not merely re-run."*

**It was already checked against `#637`, before either merged, and the check is exact rather than
equivalent.** CLEARTEXT-1 did not argue the point — it **swapped `#637`'s actual file blob into the
tree**, ran the guard, got `4 passed (4)`, and restored. That blob was `56c262bb`.

★★ **Re-derived here on trunk:**
`git rev-parse origin/base/approved-thru-437:lazytopper/src/services/mistakeIntelligence.ts`
returns **`56c262bb1e742b8c96c6997f56b505442d1166b0`** — **byte-identical to the blob CLEARTEXT-1
tested.** The merge introduced no third version. ⇒ **The question is CLOSED, and closed by identity
rather than by re-running a suite against something that merely resembles `#637`.**
⭐ **`#642` was right to demand the check and right that expectation is not evidence.** The answer is
cheap only because CLEARTEXT-1 had tested the artefact instead of a description of it.

### THE THREE DPDP-A LANES — what each means for a STUDENT

| lane | PR | what it makes true for a student | what it disproved |
|---|---|---|---|
| **ERASE-1** | **`#638`** | For the first time a minor's data can actually be **removed on request** — an authenticated, owner-scoped route walks the 29-location data map, deletes all 11 subcollections **explicitly** (Firestore does not cascade), uses admin credentials for the five locations that need them **including the handwriting images in Storage**, and reports the one location we cannot reach (Gemini) and the one no server can reach (browser `localStorage`) **as NOT DELETED rather than implying success.** 🛑 **Not running in production — see the blocker above.** | **its own first classifier.** A nested path with no `{uid}` was being field-queried — a silent miss found **only** because the brief said *audit all 29, do not spot-check* |
| **USERS-1** | **`#639`** | A login **no longer writes a child's identity** — name, email, phone — to a `users` collection that **has never appeared in `firestore.rules` in the repo's entire history**. ✅ Deployed; this is the build production is currently serving. | **that the drift guard protecting the data map was sound.** `doc(firestoreDb!, …)` evaded its pattern entirely |
| **CLEARTEXT-1** | **`#640`** | Nothing changes for a student, and that is the finding: a guard now sits **beside each storage call** pinning that **only the uid** reaches the nine `localStorage` sinks. **Zero production-code change** — all five `.ts` files byte-identical to trunk by `git hash-object`. | **that the nine CodeQL `clear-text-storage` alerts were defects.** All nine are false positives — CodeQL taints the whole `UserCredential` from one point in `AuthContext.tsx`, and only the uid arrives |

### ★★ THE SIGNATURE OF THIS WAVE — every lane disproved a premise of the document that dispatched it

**That is not a coincidence and it is the part worth inheriting.** Six premises fell, and **two were
the controller's own**:

- **SCOUT-1 disproved *"pick which server surface is live."*** A false dichotomy — **both are live,
  in one process tree**: `railway.json` + Dockerfile start `artifacts/api-server/dist/index.mjs`,
  which **spawns** `lazytopper/server/index.cjs`. ⇒ **`artifacts/` is the deploy entrypoint, NOT a
  De-Replit archive.**
- **SCOUT-2 disproved *"the `users` write is silently denied."*** **It is never issued at all** — the
  preceding `getDoc` is denied first and throws; an empty `catch` plus the caller's
  `Promise.allSettled` swallow it twice. *"Silently denied"* understates it.
- **ERASE-1 disproved its own first classifier** (above), and **executed** the map-import premise
  SCOUT-1 could only infer — 29 locations read inside the server process.
- **USERS-1's mutation that stayed GREEN** was the most valuable single result of the wave — below.
- **CLEARTEXT-1 disproved the CONTROLLER'S OWN §0 amendment.** The controller had told CLEARTEXT-1
  *and the owner* that `#637` would collide and whichever merged second would see a correct red.
  **It does not collide**, proven by swapping in `#637`'s real blob.
- **The OWNER disproved SCOUT-1 on `resolveVerifiedUid`, and that made ERASE-1 SMALLER.** SCOUT-1
  described it as *"advisory, falls back to a spoofable header"*; the owner read the file and found
  it **already fail-closed** — every path returns `""` and **it never consults the header.** ⇒ **No
  new gate to build.** The fail-open is in the **callers**. ★ **Do not propagate SCOUT-1's phrasing.**

### ★★ THE MOST VALUABLE RESULT IN THE WAVE WAS A MUTATION THAT DID *NOT* GO RED

USERS-1's mutation 1, as the controller specified it, **stayed green** — and that was **a real hole
in the drift guard protecting the student data map.** `doc(firestoreDb!, …)` — legal, since
`firestoreDb` is nullable — **evaded the guard's pattern entirely.**

**Nothing is unmapped today**; all 47 real call sites use the guarded style. **But the next such
call site would have been invisible, and that guard is the only thing standing between a new
collection and an erasure that silently misses it.**

⇒ **Closed properly, not patched:** the scanner is now a **pure function with fixture tests that
prove REJECTION, not merely acceptance** — the exact remedy for *"a parser only run on the real file
can be shown to ACCEPT, never to REJECT."*

★ **Standing rule vindicated: when a mutation does not go red, the first hypothesis is that the
SUITE has a hole, not that the code is fine. It did.**

### ★★ A DELETE THAT MATCHES NOTHING USED TO REPORT SUCCESS

`qrUploadSlots` keys the uid as a **field, not a document id** — so the obvious doc-id delete was a
**silent no-op sitting directly in the erasure path.** The owner's ruling, which promoted it to
lane-blocking: *"That is the worst failure available to this lane. A minor's handwriting images stay
live while the product tells a parent the account was erased."*

**Closed and PROVEN closed.** Every location now returns `deleted:N` **or** `notFound`, and the
caller distinguishes them. Mutation M4 (field-keyed → doc-id) went red with
`actual: 'notFound' / expected: 'deleted'` — **red because zero documents matched**, which is the
exact proof the owner asked for, not an assertion that changed.

★ **`notFound` is a DEFINITE OUTCOME, not a failure** — a path never written to is legitimately
empty. ⇒ **`SETTINGS-1` must not render `notFound` to a student as an error.** The route returns
**200 when every reachable location returned a definite outcome; 207 only on genuine failure** — and
★★ **the body enumerates all 29 locations with their outcome REGARDLESS of status code. The code is
for machines; the body is the evidence, and `SETTINGS-1` will read the body.**

### 🛑🛑 A LAUNCH-BLOCKING LEGAL QUESTION, NOT AN ENGINEERING ITEM

**`[FU-DPDP-GUARDIAN-CHANNEL-LEGAL]` — ESCALATE. DO NOT MERELY FILE.**

> India's DPDP Act treats the data of **anyone under 18** as a child's data and requires
> **verifiable parental consent to PROCESS it**. **Every LazyTopper student is in that class.**
> ⇒ **This potentially reaches SIGNUP ITSELF, not just deletion.** A guardian erasure channel is the
> visible corner of a much larger question. **Neither the owner nor any agent here is a lawyer.**
> **This is a launch blocker requiring legal advice, not a backlog item about a delete button.**

### ⚠ THE DEPENDABOT FAILURES AND THE `tsx` BLOCKER ARE ONE ROOT CAUSE, NOT TWO

**`[FU-DEPENDABOT-BLOCKS-RAILWAY-DEPLOY]`.** Verified on trunk `6f7da56e`: **six Dependabot Update
jobs are FAILING** (`re2`, `dompurify`, `nanoid`, `js-yaml`, `react-router`, `hono` — runs
`31285986176`, `31285986107`, `31285986109`, `31285986076`, `31285986077`, `31285986074`). Railway
gates on the branch **check suite**, so **a bot failure blocks every production deploy.**

⚠ **It is visible only as a "Skipped" badge** — the most dangerous shape available: **an
infrastructure stop presenting as a non-event.**

★★ **Owner-diagnosed 2026-08-09, and it is the SAME root cause as the deploy blocker.** The repo
uses **pnpm catalogs** — 17 entries in `pnpm-workspace.yaml`, six packages referencing `catalog:`.
**Dependabot's `npm_and_yarn` updater cannot resolve that protocol**, so every security-update job
fails. `tsx` was declared `"tsx": "catalog:"` in one package and never added to the gateway; **the
same catalog mechanism is what the updater chokes on.**

⇒ **The 4 critical security alerts and the `tsx` deploy blocker are ONE problem. Write the fix lane
that way — a lane treating them as unrelated will fix one and leave the other.**

### ★ THE HONEST LIMIT — stated first, not buried

- The erasure is reachable today **only by an authenticated API call**.
- **It is not currently deployed at all.**
- **Nothing ships to students on this arc until `SETTINGS-1` lands** in wave DPDP-B.
- ERASE-1's live-verify **cannot be run**, and when it can, if the abandoned QR upload cannot be
  produced the owner has fixed the phrasing to be used **verbatim rather than softened**:
  > **"live-verified on 28 of 29 rows, unproven on the one row this lane was built for."**

  The fixture-integrity test already establishes the hazard below the live layer, **so the gap is
  honest rather than fatal — but it must not read as full coverage.**

### ★ WHAT THIS WAVE ESTABLISHED THAT WAS NOT TRUE BEFORE IT

Before DPDP-A, `studentDataMap.ts` (`#630`) had **no consumer but its own test** — the inventory of
a minor's data existed and **nothing in the product acted on it.** ERASE-1 is its first consumer.
`[FU-DPDP-MAP-NO-CONSUMER]` is **closed in the repository** — and ⚠ **reopened in production by the
`tsx` blocker**, which is the distinction this whole `[CURRENT]` exists to make.

### ⚠ CORRECTIONS TO THE RECORD, MADE BY THIS HANDOFF

- **`CLAUDE.md` §6 still says the root matrix is "SIX suites / 190 checks"** — it reports **196 / 29**,
  in the same paragraph instructing the reader never to hardcode the count. **Verified still present
  on trunk `6f7da56e` at line 132, and `#642` touched `CLAUDE.md` without fixing it.** `CLAUDE.md`
  is in no lane's allowlist; logged as `[FU-CLAUDEMD-MATRIX-COUNT-STALE-AGAIN]`.
- **`check:mojibake` is NOT "structurally blind to `handoff/`"** — that description is stale and is
  corrected here. `GUARD-3` (`#571`) changed `repoRoot` to `git rev-parse --show-toplevel`, so
  `handoff/` **IS scanned.** It is **REPORT-ONLY**: hits are counted and printed on every run via
  the `MOJIBAKE_REPORT_ONLY:` line and never fail the build. ⇒ **A green `check:mojibake` is still
  not evidence that a `handoff/` edit is clean — but the reason is SCOPING, not blindness, and the
  log line carries the real count.** See `[FU-MOJIBAKE-HANDOFF-REPORT-ONLY-NOT-BLIND]`.
- **`ops/AGENT_STANDING_RULES.md` DOES NOT EXIST ON TRUNK.** `#635` is open and failing its
  repo-boundary check. ⇒ **`cofounder-skill/SKILL.md` is the only home that exists today**, which is
  where this wave's three findings were written. `[FU-DOCS-STANDING-RULES-TWO-HOMES]` records them
  as candidates to **MIGRATE — not copy — when convergence is resolved.** ★★ **No rule is written in
  both.**

---

## (superseded) [CURRENT] Wave ME-A CLOSED — #634 · #641 · #637 · #636 (+ the four unrecorded commits before them) — trunk `e8f89863`

**`2026-08-08T23:31:55Z UTC / 2026-08-09 05:01 IST`** — closing docs PR for Wave ME-A.
**This handoff covers NINE commits.** `handoff/` was nine commits stale; the last handoff was `#628`
at `9f78ebc1`. Re-derived with `git log 9f78ebc1..origin/base/approved-thru-437 --oneline`:

```
e0ed7588  FENCE-1         a student cannot forge the typed-answer delimiter          #629
a0c9c50b  DPDP-1          the verified student data map + a drift guard              #630
7786878d  premise-ledger  a gate for agent specs                                     #632
6c94d8f0  ME-PROGRESS     /me converged onto one responsive page                     #631
8d813a41  DOCS            wave archives + the wave-state lifecycle in README.md      #633
55d5ee19  MARKS-1         carry raw marks through the progress rungs                 #634
1b50b4fd  OPS-LIFT-1      replace the MI front-door freeze with contract tests       #641
92cc9fc4  MI-CONCEPT-1    record concept and questionId on the mistake log           #637
e8f89863  TRENDS-MARKS-1  shared appearance primitive + expectedMarks                #636
```

**Trunk verified by content, not by PR state — this repo squash-merges.**

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

### ***** THE SENTENCE THAT DEFINES THIS WAVE *****

> ## **Four lanes, and every one of them disproved part of its own spec. Four spec premises fell — including one the controller wrote itself — and none of them would have been caught by building what the spec said.**

**The record's most valuable content this wave is not what shipped. It is the four premises that
turned out to be false**, listed in full below, because a premise is what the next lane inherits.

---

### THE FOUR ME-A LANES — what each means for a STUDENT

| lane | PR | what it makes true for a student |
|---|---|---|
| **MARKS-1** | **`#634`** | The engine **stopped discarding the raw marks it was already computing** at `marksPercentOf`. Percentages and point-counts are untouched — this only stops throwing numbers away. **Without it the new `/me` could only ever speak in percentages**; with it, it can say "51 secured" and "7 of 12 lost". |
| **OPS-LIFT-1** | **`#641`** | A blanket *"this file may not change"* ban became **five tests pinning what the ban actually protected**: `recordMistake` is the single writer into the mistake log · the four-type taxonomy is exactly those four · marks accounting · one entry per graded question, never N · careless slips never surfacing as a topic weakness. ★★ **The protection is now STRONGER than the freeze, because a freeze can only say *no* — it can never say *what for*.** |
| **MI-CONCEPT-1** | **`#637`** | Every mistake logged from a bank question now records **which concept** it was and **which question** — so **a lost mark can be ATTRIBUTED instead of merely counted**. Free-typed Check & Improve answers correctly record **neither**. ✅ **OWNER LIVE-VERIFIED IN PRODUCTION, BOTH DIRECTIONS** (see below). |
| **TRENDS-MARKS-1** | **`#636`** | One shared appearance-per-subtopic-per-year primitive now feeds the exam signal, and a new `expectedMarks` can tell **a subtopic asked yearly as a 1-marker from one asked yearly as a 5-marker**. **HPQ's live ranking is unchanged**, pinned by a test proven able to fail. |

**`#637` live-verify, both directions, in production:** a bank question logged
`concept: "Ammeter Properties"` / `questionId: "ELEC-EXMPLR-11-SA-003"` with `stepDetails` carrying
`mistakeType: "conceptual"`; a Check & Improve free-typed answer logged **neither field** and saved
cleanly. ★ **The second half is the load-bearing one** — without it, "concept is recorded" would be
indistinguishable from "concept is fabricated for everything".

---

### CARRIED IN — the four commits that were already stale when this wave opened

**`#631` is the one that matters most to a student.** `/me` converged onto a single responsive
`MeProgressPage.tsx`; both device-specific twins (`pages/desktop/DesktopMePage.tsx`,
`pages/mobile/MobileMePage.tsx`) were **deleted**; and the page **stopped reading device-local
data** — verified on trunk as **6 `getWindowedProgress`, 0 `loadInsights`**. **Before it, a student
who practised on a phone and opened `/me` on a laptop saw a different, emptier page. That was a live
defect and it is fixed.**

⚠ **`#629` and `#630` are PRIOR-SESSION LANES. What landed is recorded here BY CONTENT on trunk. The
reasoning behind them is NOT recorded here — it lives in the handoff for the wave that ran them.**
**A plausible reconstruction is indistinguishable from a record, and the next lane cannot tell them
apart, so none is offered.**

- **`#629` FENCE-1 (`e0ed7588`)** — *what landed:* 2 files, +303/−3 —
  `lazytopper/server/routes/checkSolution.cjs` (+94) and `checkSolution.test.cjs` (+212).
  Subject line: *"a student cannot forge the typed-answer delimiter."*
  **Why: not recorded here — see the handoff for the wave that ran it (the `[FU-TYPED1-FENCE-IS-NOT-ESCAPING]` cluster carried unruled out of Wave 5F).**
- **`#630` DPDP-1 (`a0c9c50b`)** — *what landed:* 2 NEW files, +706/−0 —
  `lazytopper/src/services/studentDataMap.ts` (+419) and `studentDataMap.test.ts` (+287).
  Subject line: *"the verified student data map + a drift guard."*
  **Why: not recorded here — see the earlier handoff. It is the opening lane of the DPDP arc, which is STILL OPEN (#638/#639/#640).**
- **`#632` premise-ledger (`7786878d`)** — 1 NEW file, `scripts/premise_ledger_check.mjs` (+392): a
  gate for agent specs. **Why: not recorded here.**
- **`#633` (`8d813a41`)** — the owner's own docs PR: archived Waves 4 and 5A and **wrote the
  wave-state lifecycle into `handoff/README.md`**. ⚠ **It was ARCHIVE HOUSEKEEPING, not a wave
  close-out** — it touched none of the seven core files, which is why the close-out for
  `#629`/`#630`/`#632`/`#631` was still owed and is discharged here.

---

### ⚠⚠ DORMANCY — RESTATED, AND CORRECTED. `expectedMarks` IS NOW THE DORMANT ONE.

**The WIRE-2 dormancy block is preserved verbatim in the demoted sections below and is restated here
deliberately, because a reader who stops after the top section must still learn it. Its absence once
cost five days on `#578`.**

★★ **BUT IT MUST BE RESTATED AS CORRECTED, NOT AS WRITTEN — AND THIS CONTRADICTS THE BRIEF THAT
COMMISSIONED THIS HANDOFF.** That brief asked for `expectedMarks` to be added *"as a FOURTH dormant
capability beside `#578`, `#611`, `#617`"*. **It is not the fourth. It is the only one.**
**`WIRE-2` SHIPPED as `#621` in Wave 5F and ENDED all three dormancies.** Verified by content on
trunk, not by the record: `gradeQuickPracticeBatch` is called from
`lazytopper/src/pages/PracticePage.tsx` (imported at the `pages/PracticePage.tsx` import block and
invoked in the Finish handler) — **it is no longer a capability with zero callers.** The Wave 5F
`[CURRENT]` says so in its own words: *"It ended THREE dormancies at once — `#578`, `#611`, `#617`"*,
and *"`#578`'s seam has now executed against real Gemini. It sat dead for nine days."*

| capability | status on trunk `e8f89863` | evidence |
|---|---|---|
| `#578` grader per-question images | ✅ **LIVE** — ended by `#621` | live-verified through typed grading in Wave 5F |
| `#611` `gradeQuickPracticeBatch` | ✅ **LIVE** — ended by `#621` | real caller in `PracticePage.tsx`, not just its test file |
| `#617` the graded answer sheet | ✅ **LIVE** — ended by `#621` | reached via the `#621` Finish path |
| ⚠ **`expectedMarks` (`#636`)** | 🛑 **DORMANT — tree-shaken out of the bundle** | see below |

⚠ **`expectedMarks` IS DORMANT AND THE PROOF IS BUILD OUTPUT, NOT ARGUMENT.** `#636` demonstrated
that `"legacy-fuzzy"` **is** present in `assets/predictionCore-*.js` — the shared primitive is on the
live path — while **`expectedMarks`, `marksBasis`, `canonical-topic` and `canonical-strict` are
ABSENT FROM EVERY `assets/*.js`.** Re-checked here against trunk source: `expectedMarks` and
`MarksBasis` are **exported** from `lazytopper/src/prediction/historicalAppearanceIndex.ts` and
appear in `cbse5SignalScoring.ts` **only inside a comment**. **There is no production consumer.**

➜ ⭐ **`ME-2`'s brief MUST name `expectedMarks` as a capability it is required to WIRE, not merely to
consume if convenient.** **A capability that merges and is called by nothing is invisible to every
gate** — that is the durable lesson, and it is why this block exists whether or not any entry in it
is currently red.

---

### ⭐⭐ THE FOUR SPEC PREMISES THIS WAVE DISPROVED

**This is the most valuable content in this handoff. Three of the four were in the arc spec; the
second was the CONTROLLER'S OWN suggested fix shape.**

1. **"Every write site already holds `q.subtopic`, so this is field-plumbing."** — **FALSE AT ALL
   SIX** production call sites. `CanonicalQuestion.subtopic` *is* required, but **the PERSISTED
   shapes drop it at persist time**: `PersistedWorksheetQuestion` and `QuickPracticeSavedAnswer`
   carry no `subtopic`, and `SolutionChecker.tsx` receives scalar props with the bank `q` one level
   up in `PracticeQuestionCard.tsx`, unforwarded. ➜ `[FU-MI-PERSISTED-SHAPE-DROPS-SUBTOPIC]`.
2. **"Resolve centrally in `buildEntry`."** — ⭐ **THE CONTROLLER'S OWN SUGGESTION, AND IT FAILS FOR
   3 OF THE 4 GRADE PATHS.** Worksheet, full-mock and chapter-test pass **synthetic attempt ids**
   (`ws:` / `fm:` / `ct:`) that **can never resolve against the bank**. ➜
   `[FU-RETRY-SYNTHETIC-QUESTION-ID]`, which **changes a later lane's scope** (see below).
3. **"Build a memoised id→subtopic index."** — **`progressBankIndex.ts` ALREADY EXISTED**, and is
   already `/me`'s concept source. ★★ **Building a second would have created the exact second
   vocabulary the byte-identical rule exists to prevent** — the hazard already flagged in-repo at
   `quickPracticeSessionService.ts` (`[FU-PROG-TOPIC-KEY-MISMATCH]`).
4. **"Canonicalise both signals" AND "pin HPQ"** — ⭐ **MUTUALLY EXCLUSIVE.** Routing through
   `resolveCanonicalSlug` moves **52 of 140** live HPQ questions (topic-only still moves 5), because
   it is a **chapter** authority that degrades to a slugifier below chapter level. The spec asked for
   both and could not have both.

---

### 🛑 TWO LIVE DEFECTS FOUND AND DELIBERATELY NOT FIXED — both logged with evidence

**1 · `[FU-TRENDS-FUZZY-CHAPTER-CONFLATION]` — LIVE IN PRODUCTION TODAY.**
`legacyFuzzyMatch("Circles", "Areas Related to Circles")` returns **`true`**, conflating **two
distinct CBSE chapters**. **Each chapter's predictions are contaminated by the other's evidence.**
Not fixed in `#636` because **any fix moves the HPQ pin**, and a 37% ranking change does not ride
inside a lane instructed to pin HPQ.
★ **CONNECT IT:** `fuzzyMatch` was **already** flagged in the trends audit as a **silent-MISS** risk
when labels drift across ten years. **This wave proved it also produces silent HITS — same root
cause**, and it is precisely why `#636`'s shared primitive routes everything through
`resolveCanonicalSlug`.
➜ ⭐ **THE OWNER IS THE CBSE AUTHORITY ON WHETHER THIS MATERIALLY MISLEADS A STUDENT. That ruling is
his, not a lane's.** OPEN.

**2 · `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` — FOUND BY THE OWNER'S LIVE-VERIFY. PRE-EXISTING,
SERVER-SIDE, UNRELATED TO `#637`.**
The C&I grader returned an annotated step carrying a **−2 deduction with NO `mistakeType`**, so
`reconcileCounts` produced **all-zero counts against `marksLost: 2`**.
➜ 🛑 **A student sees *"you lost 2 marks"* beside *"no mistakes of this type"* — four times over.**
⭐ **CONSEQUENCE FOR `ME-2`, AND IT CHANGES THE DESIGN:** the v7 **unclassified marks bucket has TWO
sources** — (a) legitimate binary 1-markers, which carry no type by CBSE ruling and are the honest
case the segment was invented for, and (b) **this defect**, which is untyped marks that *should*
have had a type. ➜ ⛔ **THE BUCKET MUST NOT BE DESIGNED AS A DUMPING GROUND.** Folding (b) in
silently would make **a grader bug indistinguishable from correct behaviour**, and would let it hide
behind the very honesty device built to prevent that.

---

### ⭐ CARRY FORWARD TO ME-2 (Wave ME-C) — verbatim, from the lanes that earned them

- ⭐⭐ **DO NOT `?? 0` THE MARKS FIELDS.** Some rungs genuinely have **no marks denominator**
  (`buildMistakeTypeRung` is a composition *share*), and `marksPercentOf` is documented on trunk as
  returning **`null` when nothing is measurable**. Coalescing absent-or-null to `0` turns *"this rung
  has no marks concept"* into **a fabricated "0 of 0 marks" rendered to a student** — the exact
  honesty failure the v7 unclassified segment exists to prevent. **Absent must stay absent.**
  ⚠ **Re-read the actual declarations in `progressStore.ts` before coding against them** — the
  controller saw both required-looking and nullable forms in a partial grep and **did not establish
  which shape sits on `RungTrend` specifically.** The rule holds either way; the exact type does not
  come from this record.
- ⭐⭐ **9.05% OF THE BANK CAN NEVER YIELD A CONCEPT, AND THE PAGE MUST DEGRADE HONESTLY.**
  Enumerated over the whole bank: **8,543 questions / 1,914 distinct subtopics; 14 values match
  `isChapterEchoSubtopic`; ALL 14 are echo; ZERO real subtopics caught.** `"General"` ×224 across 25
  topicKeys, plus 13 `"Chapter Practice — <chapter>"` values totalling 549 questions = **773 / 8,543
  = 9.05%**. ★ **13 chapterwise Science files carry the SAME echo subtopic on EVERY row** — the
  predicate is **not destroying detail; the detail was never authored.**
  ➜ v7's *"By concept"* slicer and *"Start here"* ranking will legitimately have **NOTHING to show**
  for those chapters. **That is an honest empty state, not a bug to paper over — and it must NOT be
  filled with a topic-level fallback**, which is the same dishonesty the arrival rule forbids. The
  *"By chapter"* slicer still works for them; only the concept drill inside them is empty.
  **Design for that case explicitly.** ➜ `[FU-BANK-13-SCIENCE-CHAPTERS-NO-SUBTOPICS]`.
- ⭐ **`expectedMarks` MUST BE WIRED, NOT MERELY CONSUMED IF CONVENIENT.** See the dormancy block.
- ⭐ **THE LIVE-VERIFY DEBT FOR MARKS-1 TRANSFERS TO ME-2.** `#634` has no consumer, so nothing a
  student can see changed and it carries no live-verify of its own. When ME-2 lands it must be
  verified on **both surfaces** AND **in a session carrying state from before `#634`** — the read
  path reconstructs marks from records written by older code, and **an incognito session never
  exercises that.** ★ This is the precise blind spot that shipped a live break past 1,082 green
  tests in Wave 4. ➜ `[FU-MARKS-NO-CONSUMER-YET]`.
- **`[FU-ME-MOBILESELFCHROME-NESTING]`** — `#631` nests `<MobileSelfChrome>` INSIDE `<RequireAuth>`
  for `/me` while eight other usages wrap the gate, and carries a fresh comment the nesting
  contradicts. **Folded into ME-2 by owner instruction. Fix the nesting or the comment.**

---

### ⚠ PROVENANCE — read before trusting the controller docs at the repo root

`LazyTopper_Controller_Subagent_Model.md`, `CONTROLLER_MeProgress_v7_Arc.md`,
`CONTROLLER_ADDENDUM_Context_Safeguards.md` and `LazyTopper_MeProgress_v7_FINAL.html` are
**CONTROLLER TRANSCRIPTIONS of owner-supplied attachments**, written to disk 2026-08-08 because none
of them existed on disk. **They are faithful copies, not the owner's original bytes.** The addendum
on disk is **v1.1** (its §6 replaced per the owner's 2026-08-08 ruling that the handoff rule is
POSITIONAL / per-wave, not *"ME owns it"*; v1.0 §6 is retained at the bottom marked SUPERSEDED / NOT
IN FORCE). `CONTROLLER_MeProgress_v7_Arc.md` §1 (*"#631 is NOT on trunk"*) is **HISTORY — it merged.**

### ⚠ WAVE STATE AT RISK — the owner should know

`handoff/WAVE_STATE_WAVE_DPDP_A_LIVE.md` (**46,040 bytes**) is the **only copy in existence** of the
DPDP arc's controller state, and that wave is **OPEN** (`#638`/`#639`/`#640` are live drafts).
**It is correctly NOT archived here** — archiving an open wave's churning state is wrong, and the
file belongs to another controller. **But it is laptop-only and unrecoverable if the disk fails.**
This handoff archives the two files whose waves have closed (`ME_A`, and `WAVE5G` as a rescue) and
leaves DPDP_A alone.

## (superseded) [CURRENT] Wave 5F CLOSED — #619 · #620 · #625 · #621 · #626 · #627 — trunk `fbfb57fa`

### ***** THE SENTENCE THAT DEFINES THIS WAVE *****

> ## **Six PRs, four lanes, 1,400+ tests, six green CI runs — AND TYPED GRADING HAD NEVER ONCE WORKED IN PRODUCTION until the owner tried it on his phone. No gate found it.**

**That, in one sentence, is the argument for the ~50-student QA pass: our gates prove what the code
does, and only a real student on a real device proves what the product does.** Fourth consecutive
wave in which the deployed-product check found what the suite could not.

### THE SIX PRs — verified ON TRUNK BY MERGE-COMMIT ANCESTRY, not by PR state (this repo squash-merges)

```
#619  c3c9de18  WARM-GATE-1  gate the startup pre-warm, then the schema
#620  6783850b  TELEMETRY-1  attribute the AI spend by workload
#625  b48d6e38  TYPED-1      a channel for typed working + an exported upload cap
#621  d03550e1  WIRE-2       flip Quick Practice to collect-and-batch grading
#626  a307cfc4  TYPED-2      admit a typed-only batch at the grading endpoint
#627  fbfb57fa  TYPED-3      a typed answer is text, not an unreadable photograph
```
**Trunk moved NINE times across this wave. Re-derive before every dispatch — proven nine times.**
**ZERO open PRs at closure.**

| PR | what it made TRUE |
|---|---|
| **`#619`** | The startup pre-warm is **disabled by a gate, not by a missing database.** Boot log proven in production with `DATABASE_URL=set` — the exact configuration that started 312 Gemini combinations on 5 Aug. `/api/health` 200; `POST /api/admin/warm-question-pool` **503 in 5 ms without touching Gemini.** `WARM_POOL_ENABLED` deliberately **UNSET** — absent already means off. |
| **`#620`** | AI spend is **attributable by workload** from the next spike onward. (The Rs 586.96 stays unattributable **forever**; `#620` fixes the future, not the past.) Its output is what `SERVER-2` will be scoped from — **from the OUTPUT, never from a document.** |
| **`#625`** | `WorksheetGradeQuestionInput` carries a **student-typed-work field**, emitted by `blockFor` at **both** call sites, and `MAX_BATCH_UPLOADS` is **exported** at `lazytopper/src/config/gradingLimits.ts` so the client can finally learn the cap. Merged as a **capability with no caller**. |
| **`#621`** | Quick Practice **collects and batches**: one grading call at Finish, the client sends `textAnswer`, `uploads` is filtered so a typed-only answer cannot shift a later photo, and the client reads the exported cap and **warns before the call instead of taking a bare 400**. It ended THREE dormancies at once — `#578`, `#611`, `#617`. |
| **`#626`** | The endpoint **admits a typed-only batch.** The guard was **narrowed, never deleted** — no PDF, no photos AND no typing is still refused, now with copy that names what is actually missing: *"Nothing to grade yet — type your answer or add a photo of your working, then try again."* |
| **`#627`** | A typed answer is **graded as text.** `couldNotRead` narrowed to the image path (**not made unreachable**), the mixed-batch typed half fixed too, the *"re-upload this page"* note made honest for a student who uploaded nothing, and `marksAwarded` **always emitted (0 when ungraded)** so marks-available can never read as marks-scored. |

### ★★ THE LIVE-VERIFY — ALL THREE CHECKS PASSED, **INCLUDING THE CONTROL**

```
typed WRONG   ->  0 with a REASON, not "unreadable"
typed CORRECT ->  marks AWARDED
blurry PHOTO  ->  couldNotRead STILL FIRES      <- THE CONTROL
```
**The control is the load-bearing one:** it proves `#627` NARROWED `couldNotRead` rather than
disabling it. Without it, assertion 1 would have been vacuous.
★ **`#578`'s seam has now executed against real Gemini.** It sat dead for nine days. **Typed
grading works end to end.**

### ★★ THE DEFECT THE WHOLE SUITE MISSED — and why it is the wave's subject

`#621` merged with a **full zero-skip CI receipt** — 196/196 root matrix, `Tests 1463 passed
(1463)`, CodeQL genuinely executing ~45 queries, zero open alerts. **And a typed answer had never
once been graded in production.** The owner found it on his phone:

```
POST /api/grade-worksheet  ->  400
{ ok: false, error: 'Upload one PDF of your answers to grade.' }
```

**Root cause: `handleGradeWorksheet` REFUSED a zero-upload request** — a guard predating batch
grading, written for a worksheet flow where a PDF was always present. `#625`'s typed emission was
never reached: **the request was refused at the front door.**
★★ **A FIELD REACHING THE EMITTER IS NOT THE SAME AS THE REQUEST REACHING THE EMITTER.** Same
family as MOUNT != LIVE, one layer further out.
★★ And it was **two layers, not one** (`#626` finding 1): admitting the request and **building a
coherent prompt for it** are different problems — the no-uploads branch still described *"the
attached PDF"* and appended an empty image part unconditionally.
★★ And even then the model was told to **read a photograph** (`#627`): Gemini received a perfectly
readable `textAnswer` of typed nonsense and returned `couldNotRead: true` with *"re-upload this
page"*. **A student who typed a wrong answer was told their handwriting was unclear.** Wrong
diagnosis, and it teaches the wrong lesson. And *"re-upload this page"* is incoherent: no page exists.

**Why no gate saw it:** the existing test titled *"a typed answer alone reaches the model — the
free-tier path is not a 400"* **sent `imageBase64: 'PDFB64'`.** ★★ **A TITLE IS NOT AN ASSERTION.**
Four lanes and the cofounder read that title and saw the path as covered.
-> `[FU-TYPED2-SUITE-TITLE-VS-FIXTURE]`

### 🛑 THE ONE PRE-LAUNCH BLOCKER THIS WAVE CREATED THE EVIDENCE FOR

**`[FU-UPLOAD-LIMIT-BLOCKS-PHONE-PHOTOS]`** — a normal phone photo (3 MB+) **EXCEEDS the upload
limit.** The owner had to photograph, convert to PDF, then upload. **A photo-grading product that
rejects phone photos is broken for its primary use case — and this is the FREE-TIER path.**
Fix: raise images to ~10 MB **AND** add client-side downscale (~2000 px long edge, ~85% quality —
a 4 MB photo becomes ~600 KB with no loss of legibility, and it cuts input tokens too).
⚠ **CHECK THE SERVER CAP TOO, or raising the client yields a 413 instead of a friendly refusal —
the same shape as the `MAX_BATCH_UPLOADS` 400 this wave already paid for.**

### ⚠ CARRIED UNRULED INTO WAVE 5G — the owner's decision, deliberately deferred

**1 · THE FENCE.** `[FU-TYPED1-FENCE-IS-NOT-ESCAPING]` / `[FU-AMEND621-FENCE-ESCAPE-IS-SERVER-SIDE]`
/ `[FU-AMEND621-BATCH-WIDENS-INJECTION-BLAST-RADIUS]`.
★ **PRODUCT-WIDE, AND LIVE TODAY ON CHECK & IMPROVE.** The brief's premise that this arc *created*
the surface was **FALSE** — `SolutionChecker.tsx` and `DesktopCheckImprovePage.tsx` have shipped
student free text through the identical triple-quote fence since `57224f49`. **This arc EXTENDS an
existing injection surface; it does not open one.** Facts settled from source:
forgeable **YES** (any line whose content is the fence token; no escape, no filter, no truncation —
the only bound is an ~8 MB body cap); blast radius **reaches other questions in the same call**;
what an injection can move is **the SUBJECTIVE MARK** (qNumber reconciliation, the per-question mark
ceiling, the keyed objective clamp and the status allowlists all survive); **the privilege boundary
HOLDS — entitlement and rate limiting are pre-handler, and the damage is self-inflicted grade
inflation and a polluted OWN MI, never another student's.** The fix is **2 sites in 1 server file**;
the WIDER free-text surface is **19 sites across 6 server files, of which `/api/tutor` is 9.**
=> **Its own lane, covering all three call sites.**

**2 · `/admin/diagram-*` AUTHENTICATION.** Reported as the only `/admin/*` routes **not** wrapped in
`<RequireAuth>`, posting a free-text textarea to `/api/generate-diagram` — **the one plausible
UNAUTHENTICATED free-text path to Gemini.** ⚠ **NOT ESTABLISHED whether it is blocked server-side:**
`entitlement.cjs` / `verifiedCaller.cjs` were never opened for that route. **The owner will not rule
from a name — this needs the finding first.**

### 🛑 CARRY THIS LOUDLY: **`[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]` — NO `drizzle-kit push`**

A **second** migration mechanism exists (Drizzle, `lib/db/src/schema/generatedQuestions.ts`) whose
`generated_questions` **OMITS** `answer` / `solution_steps` / `final_answer` **and** the unique index
that `saveToPool`'s `ON CONFLICT` requires. `drizzle-kit push` alone would create a table the live
server **CANNOT WRITE TO — and it would look like success.** Not fixed; outside every allowlist this
wave. **Do not run it until this is settled.**

### THE GITHUB ACTIONS OUTAGE — recorded because it nearly cost a code change

`#621`'s three CI gates all went red on a clean head. **Root cause: a GitHub Actions MAJOR OUTAGE**
(`githubstatus.com` — Actions `major_outage`, incident impact CRITICAL, opened 15:22:49Z; `#621`'s
first failing run started 17:00:53Z, an hour and a half in). Three converging lines of evidence, in
ascending order of strength: (1) the logs — `Service Unavailable` at *Set up job*, zero steps, a job
whose every step passed and which the SERVICE marked failure 45 minutes later; (2) ★★ **THE
CONTROL — Lane Overlap flipped failure -> SUCCESS on the SAME head with ZERO code changes**; (3) an
external, independent status page.
**ZERO LINES WERE CHANGED. Nothing was suppressed, baselined or excluded.** ★★ **A gate that flips
to green with no code change cannot have been failing on the code**, and editing code to chase such
a green is how a real regression gets introduced while cleaning up a phantom.
★★ And the controller's own watch was wrong in the same family: **a watch that polls for job
COMPLETION cannot see a job that was never CREATED.** "Waiting for the outage" and "no run exists"
look identical from outside. **Before waiting on CI, confirm a RUN EXISTS.** The owner's empty-commit
test is what established that dispatch had died repo-wide, and the correctly-specified replacement
watch is what detected its recovery.

### ★★ DOCTRINE EARNED THIS WAVE — eight items, three from TYPED-3 alone

1. **A CORRECTION IS NOT EVIDENCE — IT IS A NEWER CLAIM.** Verify BOTH versions. **Twice this wave a
   superseding correction was itself wrong**, and both were the cofounder's. `:283` is
   `propertyOrdering`, **not** `required` — a grep hit read without reading the two lines around it.
2. **A MUTATION THAT GOES GREEN MAY BE A HOLE IN THE TEST, NOT THE ABSENCE OF A TRAP.** `#627`'s M3
   passed because the assertion pinned a FRAGMENT; re-anchored to the whole rule-6 head, it reddened.
   **A lane that had recorded M3 as "no trap" would have shipped an assertion that could not fail.**
3. **AN EXISTING GREEN TEST CAN PIN THE DEFECT IT WAS MEANT TO PREVENT.** `§5.11` asserted
   `marksAwarded === undefined`. Same family as `#490`'s `Login.oneDoor.test.tsx`.
4. **A FIELD REACHING THE EMITTER IS NOT THE REQUEST REACHING THE EMITTER.**
5. **A TITLE IS NOT AN ASSERTION** — check every new test's FIXTURE against its title.
6. **A GREP HIT IS NOT LIVE CODE.** Two `typed-no-channel` hits on trunk were both COMMENTS
   explaining what replaced the hinge. Checking by content took one command and prevented
   re-dispatching a lane that had already merged.
7. **A WATCH THAT POLLS FOR COMPLETION CANNOT SEE A JOB NEVER CREATED.**
8. **A LOGGER'S SEVERITY IS ABOUT THE STATUS CODE, NOT ABOUT WHETHER ANYTHING WENT WRONG.** Third
   instance in a single day: `[warm] Recurring pool top-up disabled` while 312 combinations STARTED;
   `[warm] Skipping pool pre-warm` meaning the OLD code was deployed; `pino-http` logging a
   DELIBERATE 503 as *"request errored"* with a stack trace of pino's own frames. **READ THE FIELDS,
   NOT THE WORD.**

★ **The thread through all eight:** *the signal is present, and it reads as its own opposite.*

### ALSO STANDING FROM THIS WAVE

- **NEVER COMMIT WHILE A MUTATION HARNESS IS RUNNING.** `#621`'s commit `16dd9506` captured mutation
  M3 because the commit RACED a background harness. The restore was byte-perfect; **the COMMIT was
  the bad snapshot**, and the only signal is a "modified" file that reads like noise. Fixed FORWARD,
  and the other mutations proven not to have leaked **by grepping the committed BLOBS.**
- **A `\uXXXX` ESCAPE DECODES IN A STRING AND RENDERS LITERALLY IN A JSX TEXT NODE.** Two were live
  on `#621`'s branch, one of them already shipped. **Found only by screenshot** — third consecutive
  wave in which screenshots changed code. `[FU-AMEND621-JSX-TEXT-UNICODE-ESCAPE]`.
- **CONTROLLER RULING: merge trunk IN, do not REBASE a pushed branch.** A rebase would require
  `git push --force`, which `CLAUDE.md` §3 lists as NEVER auto-approved, and under squash-merge it
  buys nothing. **A brief instructing a never-auto-approved operation is a spec error to catch BEFORE
  dispatch, not a permission to grant quietly.**
- ⚠ **`[FU-CI-VERIFY-PRODUCTION-BUILD-NOT-WIRED]`** — `node scripts/verify-production-build.mjs`,
  **required by `CLAUDE.md` §6, has NEVER run in CI.** The string appears zero times in the Quality
  Gate log; the Build step is `vite build` alone. **A gate named in our own standing instructions
  that no run executes is a silent no-op, one level up from the code.**

### THE FULL RECORD

**`handoff/WAVE_STATE_WAVE5F_ARCHIVE.md`** is the complete wave record, archived verbatim under
RULE 0. Lane reports on disk at `Desktop\diff\wave 5f\report\`.

---

## [SUPERSEDED by Wave 5F] #623 merged — THE PHONE PATH NAMES ITS STUDENTS · A GUARD THAT WAS VACUOUS AND GREEN · AND A MUTATION THAT COULD NOT LAND, RECORDED AS GREEN — trunk `2ca9a3d0`

**One standalone lane, `NAME-2`. Merged and OWNER LIVE-VERIFIED ON A REAL HANDSET.**

```
2ca9a3d0  NAME-2  the phone step captures a name                        #623
ecacdfed  DOCS    the #615-#616 handoff                                 #622
1b477e5f  NAME-1 v2  the login door rework                              #616
```
**Trunk moved `1b477e5f` → `ecacdfed` → `2ca9a3d0`.**
Verified ON TRUNK BY CONTENT, not by PR state — **this repo squash-merges.**
`verifyPhoneOtp: (code: string, displayName?: string)` at `AuthContext.tsx:110`; `lt-phone-mode`
present in `Login.tsx`; **zero occurrences of "phone works the same either way"**; both new suites on
disk.

### ***** THE SENTENCE THAT MATTERS MOST IN THIS HANDOFF — UNCHANGED BY THIS LANE *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**`#623` CHANGES NOTHING ABOUT ANY OF THIS. THE ARC STILL CARRIES *THREE* DORMANT CAPABILITIES,
NAMED HERE TOGETHER BECAUSE THAT IS THE WHOLE POINT:**

| Built | When | Called by |
|---|---|---|
| **`#578`** — the grader's per-question image support | 1 August | **nothing.** Its live-verify has never run |
| **`#611`** — `gradeQuickPracticeBatch`, proven by 25 tests | 5 August | **nothing.** Zero callers on trunk |
| **`#617`** — the graded answer sheet | 6 August | **nothing.** One caller: its own test file |

**`WIRE-2` IS THE SINGLE LANE THAT ENDS ALL THREE.** It is specced, on disk at
`C:\Users\Chetan\OneDrive\Desktop\diff\wave 5e\`, and NOT dispatched — **still the first lane of
Wave 5F.** **The absence of exactly this paragraph cost five days on `#578`.** It is restated here,
not merely left in the demoted block, because a reader who stops after the top section must still
learn it.

⚠ **`#611` swallows the 402** — an unconditional catch turning `PremiumRequiredError` into
`skipped-error`. **LATENT while nothing calls it; live the moment `WIRE-2` ships.**

### ★★ THE HEADLINE CORRECTION — the block below this one is now FALSE

The demoted `[CURRENT]` ends *"AND THE PHONE PATH STILL LEAVES STUDENTS NAMELESS."* **That is no
longer true on trunk.** `#623` closes it for every phone account created from now on.
`[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]` is **CLOSED for new accounts**.

⚠ **AND IT IS STILL ONLY NEW ACCOUNTS.** `[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` **stays open** —
students created before this stay nameless and **nothing in the product repairs them.**
★ **It remains a sequencing constraint against the ~50-student QA pass**, not a nice-to-have: run
that pass on pre-`#623` accounts and fifty students start permanently nameless.

### `#623` NAME-2 — what shipped, and why it was a small lane

**Six files. `App.tsx` zero-diff; nothing under `server/` or `scripts/`.**

1. **★★ `verifyPhoneOtp` gained a PARAMETER, NOT A KEY** — `(code: string, displayName?: string)`.
   **That distinction is the entire reason this was a small lane rather than `AUTH-1`.**
   `AuthContext.passwordReset.test.tsx` pins the context key set by **exact equality**, and ~25
   suites replace the module with a `vi.mock` factory that is a **full** replacement. An extra
   argument leaves `Object.keys(ctx)` identical and a `vi.fn()` does not care how many arguments it
   receives; **an extra key or export fails both.** The suite passed **UNMODIFIED** — `5 passed (5)`.
   Same seam `signUpWithEmailPassword(email, password, displayName?)` already occupies.
2. **The phone step REUSES `.lt-login-seg`** rather than adding a second rule set — which
   **sidesteps `[FU-TEST-SOURCESCAN-FIRST-MATCH-ONLY]` by construction**, the duplicate-selector trap
   that bit `#616`. `role="group"` + `aria-pressed`, never `role="tab"`; `data-testid="lt-phone-mode"`.
3. **`updateProfile` fires ONLY when the user has no `displayName`**, then **re-syncs the context** —
   `updateProfile` mutates `currentUser` in place and re-emits no auth-state event, so without the
   re-sync the student would see their phone NUMBER as their name for the whole first session.
   Same trap as the email path. `[FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD]`.
4. **The copy changed on BOTH branches, and it was required rather than cosmetic.** The retired line
   promised the branches were identical; that stopped being true the moment the step asked.
   Create: *"We'll create your account and start your 7-day trial. No password to remember."*
   Returning: *"Welcome back — we'll text you a code. No password to remember."*
   **No enumeration disclosure on either branch** — neither asserts whether an account exists.

**CI run `31094918947` — `Tests 1416 passed (1416)`** (passed equals the parenthesised total, so
zero skips), **root guard matrix `196/196`, `# skipped 0`.**

### ★★ THE LIVE PROBE IS DONE, AND ONE OF ITS CHECKS COULD NOT HAVE BEEN A TEST

**Owner live-verified on a real handset:** a real phone account created with a real name, **confirmed
in Firebase Console → Authentication → Display Name**; the returning branch showing no name field;
and — the one that matters — **the no-overwrite guard proven by a SECOND sign-in on the same number.**

★ **Nothing but a live round trip could make that last check.** The unit test proves
`updateProfile` is not called when a `displayName` exists **on a mock**; only a second real sign-in
proves the guard fires **against a live Firebase record that already carries a name.**

⚠ **The lane itself could not run this and said so** rather than letting twenty screenshots stand in
for a round trip. **Zero SMS were sent by the agent.** Recorded because the report being honest
about its own gap is what made the owner's probe land on the right check.

### ★★ WHAT THIS LANE FOUND THAT ITS SPEC DID NOT KNOW — three, and two generalise

**Full mechanisms in `handoff/DISCOVERIES.md` (D39–D41); the summary:**

1. **★★ A VACUOUS GUARD READS EXACTLY LIKE A REAL ONE.** `Login.oneDoor.test.tsx` asserts
   `queryAllByRole("tab")).toHaveLength(0)` — but **never opens the phone step**, so it could never
   have caught a `role="tab"` regression there. **Found by DIFFERENTIAL MUTATION**: the same mutation
   went **red in the new suite and stayed GREEN in `oneDoor`**. ⇒ **Record the instrument, not just
   the fix.** A guard whose green is indistinguishable from absence is worse than no guard, because
   it stops anyone looking. `[FU-DOOR-TAB-GUARD-MISSED-PHONE-STEP]`.
2. **★★ A MUTATION THAT CANNOT LAND MUST BE RECORDED GREEN, NOT SILENTLY SWAPPED.** The brief's M4
   cleared the name in `goToStep`, which runs on step **entry**, before a name exists — so it could
   never go red. **The lane fired it, recorded the green, then used the honest mutation**
   (clearing at the `number → otp` transition), which is red on four tests. **That is the
   discipline.** Quietly substituting a working mutation would have reported six reds and hidden that
   the spec's model of the flow was wrong.
3. **Three enumerations of the door's test surface gave FIVE, NINE and SIXTEEN.** Neither an import
   grep nor a string grep is the set — **`SignUpPage.redirect.test.tsx` carries no literal `Login`
   at all** and reaches the door transitively. **Only running it is the set.**

### ⚠ A CORRECTION TO THE LANE'S OWN REPORT — and where the number came from

The `#623` report recorded `Login.tsx:2318` as a **stale cite**, reasoning that *"the file is 2230
lines."* **That finding was WRONG, and the cite was correct**: at `ecacdfed` the file is **2457**
lines and `New or returning` sits at **exactly `:2318`**.

**Where 2230 came from — it is a real number, from a real command, and it is not a line count.**
The lane measured with PowerShell `(Get-Content $f | Measure-Object -Line).Lines`.
**`Measure-Object -Line` silently excludes blank lines.** Proven both directions on trunk:

```
git show ecacdfed:.../Login.tsx | wc -l                    -> 2457   (real lines)
git show ecacdfed:.../Login.tsx | grep -c '[^[:space:]]'   -> 2230   (non-blank)
Get-Content (branch copy) | Measure-Object -Line           -> 2368
(branch copy) raw array .Count                             -> 2604   (real lines)
```

**2230 is the non-blank count of the very file the spec cited.** The lane then compared that
undercount against `:2318`, concluded the line was out of range, and reported a stale cite — **a
wrong conclusion drawn from a correct measurement of the wrong quantity.**

★ **The lane's recommendation survives its own error: cite by quote or symbol, not by line.** But the
reason is now the opposite of the one recorded — **not because the cite was stale, but because
verifying a line cite is itself easy to get wrong.** ⇒ **`Measure-Object -Line` is not `wc -l`.**
`[FU-PS-MEASURE-OBJECT-SKIPS-BLANKS]`, D41.

⚠ **This is exactly the class of number that travels three documents later unchallenged.** It is
corrected here, at the head, rather than left in a report nobody re-opens.

### STILL OPEN AND UNCHANGED BY THIS LANE

- **`[FU-AUTH-EMAIL-LINK-DIRECTION]`** — `AUTH-1`'s, **runs alone**, needs new context keys. Only
  `linkWithPhoneNumber` exists: a phone-first student **can never absorb an email**, and one who
  later signs in with Google gets a **SECOND** account. ⚠ **SPLIT ACCOUNTS ARE UNRECOVERABLE BY
  DESIGN** — prevention is the only tool.
- **`[FU-AUTH-DISPLAYNAME-NO-BACKFILL]`** — see the sequencing constraint above.
- **`LAUNCH_REMAINING.md` and `SURFACE_TRACKER.md` both remain STALE and both remain NOTED.** Neither
  sync header was advanced. **Advancing a sync header over unreviewed content asserts a review that
  never happened.**

---

## (superseded) [CURRENT] #615-#616 merged — THE LOGIN DOOR REWORKED AND LIVE-VERIFIED · A CANONICAL THAT FINALLY RESOLVES · AND THE PHONE PATH STILL LEAVES STUDENTS NAMELESS — trunk `1b477e5f`

⚠ **SUPERSEDED BY `#623`.** This block's headline — *"AND THE PHONE PATH STILL LEAVES STUDENTS
NAMELESS"* — **was true on its date and is now FALSE on trunk.** Left as written per the board's own
rule that a dated entry is evidence of what was known when. **See the `[CURRENT]` block above.**

**Two standalone owner-run lanes, both merged AFTER `#618` closed Wave 5E. Both live-verified by the
owner on production, desktop and mobile, and both PASSED.**

```
1b477e5f  NAME-1 v2  the login door rework                              #616
c54f7f9a  META-3     sitemap + canonical point at URLs that resolve     #615
0a9c9f97  WAVE-5E    handoff, closed the wave                           #618
```
**Trunk moved `9cfcb09a` → `0a9c9f97` → `c54f7f9a` → `1b477e5f`.**
Verified ON TRUNK BY CONTENT, not by PR state — **this repo squash-merges.**

**Nothing is open and the owner's.** Wave 5F's two server lanes (`#619` WARM-GATE-1, `#620`
TELEMETRY-1) are open as drafts and are not part of this record.

### ***** THE SENTENCE THAT MATTERS MOST IN THIS HANDOFF *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**NEITHER LANE IN THIS HANDOFF CHANGES ANY OF THAT. THE ARC STILL CARRIES *THREE* DORMANT
CAPABILITIES, NAMED HERE TOGETHER BECAUSE THAT IS THE WHOLE POINT:**

| Built | When | Called by |
|---|---|---|
| **`#578`** — the grader's per-question image support | 1 August | **nothing.** Its live-verify has never run |
| **`#611`** — `gradeQuickPracticeBatch`, proven by 25 tests | 5 August | **nothing.** Zero callers on trunk |
| **`#617`** — the graded answer sheet | 6 August | **nothing.** One caller: its own test file |

**`WIRE-2` IS THE SINGLE LANE THAT ENDS ALL THREE.** It is specced, on disk, and NOT dispatched —
still the first lane of Wave 5F. **The absence of exactly this paragraph cost five days on `#578`.**
It is restated here, not merely left in the demoted block, because a reader who stops after the top
section must still learn it.

⚠ **`#611` swallows the 402** — an unconditional catch turning `PremiumRequiredError` into
`skipped-error`. **LATENT while nothing calls it; live the moment `WIRE-2` ships.**

### ★★ WHAT `#616` DID **NOT** DO — read this before assuming the name defect is closed

> ## **`§9`, the phone segmented control, was NOT STARTED.**
> ## **PHONE-FIRST STUDENTS STILL LAND NAMELESS.**

`mapFirebaseUser` only ever **reads** `displayName`. Google supplies one; **phone does not**, and
nothing in the product sets one for a phone account. Phone is one of three equal methods on the door
and is made prominent, so this is not a corner case. The lane declined `§9` on the owner's own
priority order rather than half-build it — **a phone control that renders but never passes the name
is worse than one that does not exist.** `[FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]` stands, actively
re-confirmed. The follow-on lane is **`NAME-2`** (`NEXT_ACTION.md`).

⚠ **AND NOTHING BACKFILLS.** Accounts already created without a name are not repaired by `#616` and
will not be repaired by `NAME-2`. `[FU-AUTH-DISPLAYNAME-NO-BACKFILL]` — **a sequencing constraint,
not a nice-to-have: it must land BEFORE the ~50-student QA pass**, or that cohort starts permanently
nameless.

### `#615` META-3 — a canonical that resolves, and the measurement that proves it

- **`sitemap.xml`: four URLs → three.** Dropped `/topic-hub`, `/highly-probable/10/Maths`,
  `/practice/10/Maths` — all auth- or premium-gated, and **all 404 at the root**. Kept `/app/`,
  `/app/exam-trends`, `/app/pricing`.
- **`index.html` canonical:** `https://lazytopper.com/` → `https://www.lazytopper.com/app/`.
- `crawlerReachability.guard.test.ts` **+473 lines**; `domain.guard.test.ts` amended; `llms.txt` updated.

★ **MEASURED ON PRODUCTION — this is why the new canonical is right, and the measurement is the
record, not the change:**

```
lazytopper.com/          308 -> www.lazytopper.com/
www.lazytopper.com/      307 -> www.lazytopper.com/app/
www.lazytopper.com/app/  200   <- the only URL that resolves
```

**The old canonical cost two redirect hops.** ⇒ `[FU-SEO-ROOT-IS-A-REDIRECT]`: **the domain has no
homepage of its own.** `/` is a redirect into an app shell, so reaching content costs two hops. That
blocks any public content layer at root paths and is **the largest open SEO decision**.

### `#616` NAME-1 v2 — the login door rework

Six files, all `Login*` plus `SignUpPage.name.test.tsx`. Five sections:

1. **The blocking assertion REPLACED, not deleted.** The predecessor pinned "no name field on the
   sign-IN door", which the self-declared control makes false on arrival. What it *protected* — **a
   returning student never types a name** — is now pinned, and carried through to the CALL: the
   returning branch reaches `signInWithEmailPassword` and **never** `signUp`.
2. **Forgot password confined to the returning branch**, which freed the create branch's
   **"Create a password"** label. It had been rendering on "I'm new here" — offering a reset for an
   account that does not exist. `Login.forgotPassword.test.tsx`: **85 added, 0 deleted — zero
   assertions weakened.** The `email-already-in-use` state's **Reset my password** button now opens
   the reset pane, with a control proving a clean create offers neither.
3. **Legal returned to the auth column at every width**, the `isDesktop` conditional deleted. The
   desktop consent line had been **below the fold**, in a column no student scrolls.
4. **Right-panel hierarchy** — Google given primary weight (bordered and lifted, deliberately **not**
   filled, so it cannot compete with the navy submit), guidance reduced to a footnote with every word
   intact, and a real footer floor.
5. **Segmented control in product green.** Navy on `#16b96a` measures **6.68:1**; **white measures
   2.57:1 and FAILS**, because 0.9rem bold is not large text.

**Owner live-verify: PASSED on production, desktop and mobile.**

### ★★ WHAT THE LANES FOUND THAT THEIR SPECS DID NOT KNOW

**Four cofounder spec errors were disproved by `#616`. The mechanisms are recorded in
`handoff/DISCOVERIES.md` (D34–D37); the summary:**

1. **A cropped screenshot stood in for the page.** The cofounder asserted the `email-already-in-use`
   state offered no reset control — reading it off an owner screenshot **cropped at the submit
   button**, and that control renders *below* the submit. It had been firing since round 1.
   ⇒ **The crop agreed with the argument he had just made, so the search ended.**
2. **A test snippet that could not pass** — it asserted `signInWithEmailPassword` had been called
   once **without submitting anything**.
3. **A mock-factory omission** — `AuthDoor` destructures `signInWithEmailPassword`; an absent member
   reads `undefined` and the component **throws on submit**.
4. **A static grep used to verify a claim about files that defeat static greps.** The import-pattern
   grep found five door-mounting test files; **CI found eight.**

★ **And the lane caused one itself, caught by a test:** adding a second dark `.lt-google` rule
**shadowed** the AUTH-3 one, because `ruleBody()` resolves selectors with `src.indexOf` and reads
only the **first** match — so the suite went red **naming the wrong cause**.

⚠ **This is the property worth protecting: every lane in the last four waves disproved part of its
own spec, and every one of those errors was the cofounder's. That is the system working.**

---

## (superseded) [CURRENT] #611-#617 merged -- WAVE 5E: THE BATCH-GRADING ARC BUILT AND UNBLOCKED, A SITEMAP GOOGLE HAD NEVER FETCHED, AND THREE CAPABILITIES THAT ARE STILL DORMANT -- trunk `9cfcb09a`

**Four controller lanes plus two owner-run lanes. The controller stood down after this handoff;
Wave 5F opens with `WIRE-2` as its first lane.**

```
9cfcb09a  RESULTS-1  the Quick Practice graded answer sheet, DORMANT by design   #617
035de5d5  FORBID-6   the ResultsScorecard zero-diff ban lifted in BOTH gates     #614
fd11a664  META-2     robots/sitemap/llms/favicon served at the root              #613
9717248c  META-1b    og:image pointed at the path it is actually served from     #612
1def94c8  BATCH-1b   gradeQuickPracticeBatch, 25 tests, DORMANT -- no caller     #611
```
**Trunk moved `583ed062` -> `1def94c8` -> `9717248c` -> `fd11a664` -> `035de5d5` -> `9cfcb09a`.**
Verified ON TRUNK BY CONTENT, not by PR state -- **this repo squash-merges.**
**Full controller record: `handoff/WAVE_STATE_WAVE5E_ARCHIVE.md`.**
~~**OPEN and the owner's:** `#615` META-3 (sitemap + canonical) - `#616` NAME-1 v2 (the login door
rework).~~ ⚠ **CORRECTED 2026-08-06 — BOTH ARE MERGED.** `#615` at `c54f7f9a`, `#616` at
`1b477e5f`, both live-verified on production. This line was true on its date and is left struck
rather than rewritten, per the board's own rule that a dated entry is evidence of what was known
when. **See the `[CURRENT]` block above.**
**`AUTH-1` is NOT queued** -- the name/link work moved to a new cofounder session.

### ***** THE SENTENCE THAT MATTERS MOST IN THIS HANDOFF *****

> ## **The Quick Practice results surface is BUILT AND UNREACHABLE.**
> ## **`RESULTS-1` (`#617`) is merged and dormant by design.**
> ## **`WIRE-2` is the ONLY thing that makes it live.**

**AND IT IS NOT ALONE. THIS ARC NOW CARRIES *THREE* DORMANT CAPABILITIES, NAMED HERE TOGETHER
BECAUSE THAT IS THE WHOLE POINT:**

| Built | When | Called by |
|---|---|---|
| **`#578`** -- the grader's per-question image support | 1 August | **nothing.** Its live-verify has never run |
| **`#611`** -- `gradeQuickPracticeBatch`, proven by 25 tests | 5 August | **nothing.** Zero callers on trunk |
| **`#617`** -- the graded answer sheet | 6 August | **nothing.** One caller: its own test file |

**`WIRE-2` IS THE SINGLE LANE THAT ENDS ALL THREE.** It is specced, on disk, and NOT dispatched.
**The absence of exactly this paragraph cost five days on `#578`. It is written here so the next
reader cannot miss it.**

### WHAT THE LANES FOUND THAT THEIR SPECS DID NOT KNOW

**Every brief was disproved in part, including two the controller wrote.**

- **`BATCH-1b` (#611) shipped a complete, tested, UNCALLED function -- and said so in the module
  header, not only its report.** It could not wire the trigger: that lives in `PracticePage.tsx`,
  outside its allowlist. **It refused to build outside scope rather than widen it.**
  It also found **typed answers have no channel at all** -- `WorksheetGradeQuestionInput` has no
  `textAnswer` field, so the server's own rule about grading "the typed answer given in its block"
  refers to something `blockFor()` never emits. Classified `typed-no-channel` and **returned, not
  silently dropped.** => **batching covers PHOTO working ONLY. Do not record it as complete.**
- **`WIRE-1` returned BLOCKED having built NOTHING, and that was correct.** It found the wiring brief
  encoded a product decision nobody had made: the student today taps "Check my answer" and sees the
  grade **inline, immediately**, and the brief's core assertion would have deleted that silently.
  It also found **`#611` swallows the 402** -- an unconditional catch turning `PremiumRequiredError`
  into `skipped-error`, so an unentitled student would finish with **no grades, no upgrade sheet, no
  explanation.** LATENT while nothing calls it; **live the moment `WIRE-2` ships.**
  **It declined to run gates against an empty diff** -- reporting them PASS would have been the exact
  silent no-op this project keeps paying for.
- **`FORBID-6` (#614) found the ban was protecting something no test covered.** Neither C&I gate
  asserted **one byte of rendered behaviour**; those FORBIDDEN entries were the ENTIRE protection for
  **the return ticket reaching a clickable button -- drop an action or its `onClick` and the tutor
  overlay becomes impossible to close, with nothing red.** It caught **two silent no-ops in its own
  work**, including a mutation run that reported all-red because `execSync` used cmd.exe and vitest
  never executed.
- **`RESULTS-1` (#617) found a second way to kill an openness guarantee, and no mutation could have
  caught it.** `#614`'s openness test proves itself with the literal `"quick-practice-batch"`; had the
  lane CLAIMED that name, **the test would have kept passing while silently ceasing to test an
  unrecognised surface.** It added no new `ScorecardSurface` member at all -- closed by construction.
  **It found this by READING the guard, not by testing it.**
  Its screenshots also caught a defect **latent on trunk today**: see the FU below.

### DOCTRINE -- six items, and the first two are the wave's real output

**A TEST THAT PROVES OPENNESS WITH A SPECIFIC PLACEHOLDER NAME IS ONLY OPEN UNTIL SOMEONE TAKES THAT
NAME. THE GUARD AND ITS OWN FIXTURE CAN COLLIDE.** No mutation catches this; it was found by reading.

**ASSERTIONS TEST WHAT A COMPONENT RENDERS; SCREENSHOTS TEST WHETHER A STUDENT CAN REACH IT.**
**Third consecutive wave in which screenshots caught what every assertion passed.**

**THROWING BEATS CLAMPING.** `ObjectiveMarkNotBinaryError` makes the 1-marker ruling structurally
impossible to soften, not merely tested against.

**SHIP THE SPEC, FLAG THE DOUBT, DO NOT SILENTLY IMPROVE.** It turned a cofounder copy error into a
decision rather than a drift.

**A WARNING IN YOUR OWN BRIEF DOES NOT PROTECT YOU FROM THE THING IT WARNS ABOUT.** A brief warned in
bold against pinning what a file happens to do today, then two paragraphs later told the lane to do
exactly that. **The discipline was present and applied selectively.**

**WHEN A RULE IS BREACHED THREE TIMES BY THREE COMPETENT LANES, SUSPECT THE WORK, NOT THE WORDING.**
Three lanes returned at 3%, 6% and 3% against a 25% floor. The cause was **brief size, not judgement**;
shorter briefs produced a 22% return. The residual is **environment**, not discipline.

### THE AI COST INVESTIGATION -- **OPEN. CAUSE NOT ESTABLISHED.**

**INR 586.96 for 31 July - 5 August, against ~INR 10 the prior week. 98% is ONE SKU: output tokens --
and thinking bills at the output rate.** The forecast has returned to **INR 13.33**, so **nothing
unattended is running.**

**THE CAUSE IS NOT ESTABLISHED. THREE CONCLUSIONS WERE REACHED AND RETRACTED IN NINETY MINUTES.**
The full account is in `LazyTopper_AI_Cost_Investigation_2026-08-06.md`, **which the owner holds** --
it is not in this repo and **must not be reconstructed from memory.**
**`TELEMETRY-1` is what ends the guessing. Nothing should be capped before it.**

---

## [PREVIOUS] #606-#609 merged -- WAVE 5D: THE SIGNED-OUT FRONT DOOR REACHES THE PRIVACY POLICY - TWO BRIEFS WHOSE HEADLINE ITEMS WERE ALREADY SHIPPED - AND A STACKED PR THAT DEADLOCKED WITH ITS OWN BASE -- trunk `51f7712`

**Four lanes and one read-only scout, under the controller + subagent model. Zero failed lanes.**

```
51f7712a  WELCOME-1  the signed-out desktop front door reaches the policies    #609
62ad6925  COPY-1     reach the policies from the public surfaces + one figure  #608
1851559b  SERVER-1   pin the /api proxy's privileged-header strip              #607
2cd2e13d  FORBID-5   lift the quickPracticeSessionService ban                  #606
```
**Trunk moved `a895dbdb` -> `2cd2e13d` -> `1851559b` -> `62ad6925` -> `51f7712a`.**
Verified ON TRUNK BY CONTENT, not by PR state -- **this repo squash-merges, so
`merge-base --is-ancestor` on a PR head is the wrong test.**
**Full controller record: `handoff/WAVE_STATE_WAVE5D_ARCHIVE.md`.**

### WHAT THE LANES FOUND THAT THEIR SPECS DID NOT KNOW

**Every brief was disproved in part** -- 4 findings against FORBID-5's, 7 against SERVER-1's, 7
against COPY-1's, and **4 against the controller's own.** That is the system working.

- **SERVER-1's brief was wrong on BOTH headline items.** `responseSchema` (section 1) **had already
  shipped in `#559`/PR-C2**; and section 3's defect **did not exist** -- `app.ts:47` is an entry
  *inside* `STRIPPED_PROXY_HEADERS`, the opposite of "allows", and `#546` had already fixed the
  forwarding. **The real defect was the missing PROOF:** the strip had zero coverage on either
  process, its only other repo-wide references are two prose comments, and **deleting it turned
  nothing red.** `#607` is therefore a **test-only** PR; `checkSolution.cjs` is byte-identical to
  trunk, so **no live-verify was required.**
  It also **refused to ship a thinking budget** (section 2): the telemetry is unreachable from a
  worktree and every grader test stubs the Gemini client, so the brief's own quality proof was
  unobtainable. **It declined to certify a grading-quality property it had not measured.**
- **FORBID-5 caught a SILENT NO-OP in its own first draft.** An idempotence test comparing two run
  ids stayed **green** under a `+Date.now()` mutation, because both calls land in the same
  millisecond and a contaminated id **still equals itself**. **A self-comparison is not an identity
  check.** It also published the complete forbidden map -- **exactly three** `const FORBIDDEN = [`
  arrays repo-wide -- and proved with a control that **`checkSolution.cjs` is banned by none of them.**
- **COPY-1's own absence control caught its own error.** `/sign-up` scored 0 on grep, but its entire
  body is `import { AuthDoor } from "./Login"`, so the legal footer it inherits is **grep-invisible.**
  It re-checked by component composition and a live browser probe. It also found **all three of its
  brief's named drift sites were wrong**, and that **no policy slug is empty** -- so no legal text was
  written and the fabrication line never bound.
- **WELCOME-1 caught MOUNT != LIVE in the brief written to prevent it.** The controller instructed
  "mount it exactly as COPY-1 did". At >=1180px the landing is `height:100vh` / `overflow:hidden`
  with `.lt-landing-stage display:contents`, so a footer mounted **outside** the stage is clipped
  **with no scrollbar** -- present in the DOM, **green on every presence test, invisible to every
  student.** **The specified 1024/390 captures would have missed it; the lane added 1280/1440.**
- **The SCOUT wrote nothing, and that was the correct outcome.** It settled `responseSchema` on trunk
  with the chain quoted at every hop and closed a lane that would otherwise have been re-scoped.

### DOCTRINE -- the wave's real output

**A CLOSED LANE STILL PITCHED AS OPEN WILL BE RE-SCOPED.** A shipped record and an open FU for the
same work, in one handoff, is a re-work generator: `CURRENT_STATE` and `IMPLEMENTATION_ROADMAP`
recorded `#559` as shipped and owner-live-verified while `[FU-EFF-RESPONSE-SCHEMA]` was still carried
as a top-ranked open lever in three documents. **It cost a spec error and a scout.** **Closing an FU
is part of shipping it, not bookkeeping afterwards.** Strike rather than delete, per the precedent at
`LazyTopper_Cost_Pricing_Analysis_v1_1.md:105-110`.

**A MUTATION MUST BE VERIFIED *APPLIED* BEFORE ITS RED/GREEN IS EVIDENCE.** A first mutation run
reported ALL-GREEN with the mutation "applied": the file is CRLF and the pattern ended `\n`, so it
**silently matched nothing.** Verifying only the RESTORE cannot catch this, and **the failure mode
accuses a GOOD test of being fake** -- you delete real coverage on its strength. Protocol: snapshot
SHA, mutate, **assert mutated-sha != baseline**, run, restore by byte snapshot, assert sha == baseline.

**A SELF-COMPARISON IS NOT AN IDENTITY CHECK.** Assert against the real generator, not against
another invocation of the thing under test.

**A GREP CONTROL IS NOT SUFFICIENT FOR A COMPOSITION-REACHABLE FEATURE.** `/sign-up` scored zero
because its whole body is a re-export. **Re-check by component composition and a live probe.**

**A CONTROLLER-AUTHORED BRIEF IS NOT A SAFER BRIEF.** Four findings against the controller's own this
wave. **That is the property to preserve, not a failing.**

**A UNIQUENESS CHECK IS NOT A COMPLETENESS CHECK.** A whole-file rewrite of the controller state file
dropped a whole section and survived two passes, because the check asked whether headers appeared
**once**, not whether they all still **appeared.**

**A SELF-DATING INSTRUCTION IS NOT A STALE FACT.** `CLAUDE.md` section 6's "190 checks as of
2026-07-28 -- the count GROWS; read it from the run" is **working** when a lane reads 196. **Three
lanes have now flagged that file and all three were wrong.** Flagging it as stale IS the drift.

**`WARM_POOL_TOP_UP_INTERVAL_MS=0` DISABLES THE RECURRING JOB, NOT THE STARTUP PRE-WARM.**
**A variable named for a thing may govern only one of its paths. Read what the flag gates, not what
it is called.**

**A STACKED PR DEADLOCKS WITH ITS OWN BASE.** `lane_overlap.mjs` compares every open PR against every
other, so a stacked PR and its base each see the other and **neither can merge, in either order.**
**Do not stack PRs in this repo.**

**`gh pr ready` IS THE OWNER'S STEP.** Lanes push drafts and stop. Four PRs sat mergeable-but-draft
because the model never said who marks them ready.

### WHAT NEARLY COST REAL MONEY

`DATABASE_URL` was provisioned and removed within ten minutes. `WARM_POOL_TOP_UP_INTERVAL_MS=0` was
set first, deliberately, as the brake -- **and it was not sufficient.** The deploy log shows the
recurring top-up correctly disabled and then a **separate, ungated one-time startup pre-warm**
beginning a **312-combination** run. What saved it was an unrelated failure:
`relation "generated_questions" does not exist`, so every combination erred at the count step and the
owner's AI Studio spend showed no spike. **Latent, not realised -- and with a populated schema the
count would have succeeded and generation would have proceeded.**
=> **`DATABASE_URL` is no longer an owner task. It is a lane**, behind
`[FU-WARM-POOL-STARTUP-PREWARM-NOT-GATED]`.

---

## [EARLIER] #601–#604 merged — ★★ WAVE 5C: A BLANKET BAN REPLACED BY TESTS THAT ACTUALLY FIRE · THE LOCKED CTA SHIPPED · 40 DEFECTIVE SOLUTIONS PULLED FROM LIVE STUDENT PATHS · AND A CI FAST PATH THAT SPLITS THE GATE WITHOUT TRIMMING IT — trunk `203fb370`

**Four PRs, four lanes, under the controller + subagent model. OWNER LIVE-VERIFY PASSED.**

```
203fb370  ci(workflow): a fast path for docs-only PRs, two stale counts retired (CI-DOCS) #604
0dd5b142      fix(bank): cut the 40 defective Section A questions (BANK-1)                    #603
8d8259c5      feat(subscription): the locked Check-my-answer CTA (GATE-3)                     #602
f31f8d40      test(ops): replace the App.tsx blanket ban with targeted tests (FORBID-4)       #601
```
**Trunk moved `81d0d53c` → `f31f8d40` → `8d8259c5` → `0dd5b142` → `203fb370`.**
**Full controller record: `handoff/WAVE_STATE_WAVE5C_ARCHIVE.md`** — both retractions, the two owner
re-rulings, the controller misroute, and the merge record.

⚠ **`#599` (dependabot, `actions/checkout` 5→7) merged during Wave 5B and was never recorded** in the
previous `[CURRENT]`. Noted here so the chain is complete.

### ★★ WHAT THE LANES FOUND THAT THEIR SPECS DID NOT KNOW
- **BANK-1 refuted its own brief's premise.** *"None is imported by anything. No student has ever
  seen them"* was **FALSE** — all four packs were imported into `canonicalQuestionBank.ts` and
  consumed by 28 modules. ⇒ **the defective solutions were reaching students, not sitting latent.**
  It refuted the absence claim **with a control**, not by assertion.
  ⇒ **Then it overturned the owner's own remedy.** Whole-file deletion rested on *"~22 sound"* and
  *"surgical means per-question review."* Adjudicating **all 79** showed **48 sound**, and the defect
  is **100% confined to Section A** — separable by a **mechanical `section` filter**. Owner withdrew
  whole-file; the cut is **Section-A-only**, keeping **39 verified-sound B/C/D/E questions including
  the entire 3/5-mark tier.** Root cause: **a solution pool mis-paired against a question pool**
  (`ME-E07`/`ME-E14` have their solutions **swapped**) — not degraded generation.
- **★★ FORBID-4's own first-draft guard was a SILENT NO-OP.** `not.toThrow()` **passed** under a
  nested `<MemoryRouter>` because `App.tsx` wraps `<Routes>` in an `<ErrorBoundary>` — **the app
  error-pages instead of crashing**, and a throw-assertion cannot tell the difference. **Only
  mutation testing caught it.** It also found **QP-OVL's GUARD 3 was a COMMENT, not a check** (the
  propless-`/practice` invariant had **zero executable coverage repo-wide**) and that QP-OVL had **no
  `FORBIDDEN(path)` loop at all**.
- **GATE-3 disproved the spec's parent list.** The four named "parents" are `useSubscription`
  **consumers**, not `SolutionChecker` render sites. **There are TWO render sites and none of the
  four is one.** It **declined to build the `entitled` prop**: a prop *creates* the mount-not-live
  risk it was meant to solve, since a third site added later ships un-gated by default. The gate
  lives in the hook.
- **CI-DOCS proved `scope:guard` CANNOT go in a CI fast path** — it reads the working tree, a CI
  checkout is clean, so it measures `inspected=0` and **passes forever**. A silent no-op, in the lane
  about silent no-ops. Its classifier **replayed over six real merges: `#566` classifies on the 13
  files that LANDED, not the 4 it reported.**

### ⚠ THE CONTROLLER'S OWN ERRORS THIS WAVE — recorded because near-misses teach more than wins
1. **I reported a `CLAUDE.md` §5 / `NEXT_ACTION.md` §0 contradiction that did not exist.** §5 already
   defers to the executable guard; its topic names are an **`e.g.`**, not the list. **I read the
   example as the list.** Owner struck the parenthetical (this PR).
2. **I misrouted BANK-1's traffic to CI-DOCS twice** — the second time carrying an instruction to
   delete files CI-DOCS was **explicitly forbidden** to touch. **CI-DOCS refused and PROVED the
   misroute** (14 token hits in BANK-1's brief vs 0 in its own; credited with a BLOCKED verdict it
   never returned). **Only the receiving lane's refusal stood between that and a destructive
   cross-lane write.** It had flagged the *first* misroute and I did not act on the flag.
3. **I amplified `[FU-GATE3-SIGNED-OUT-GRADING-FAILS-OPEN]` as a live product hole.** Owner-verified
   correction: the **server** fails open for unauthenticated callers, **but no student path reaches
   it** — the client login gate fires at every action CTA. **Latent, curl-only, capped 3/day.**

---

## (superseded) [CURRENT] #595–#598 merged — ★★ WAVE 5B: THE RETIRED POSTGRES ENDPOINTS DELETED · CODEQL FIXED ON LIVE SERVER CODE · THE NEVER-OWNED DOMAIN SWEPT · AND A PAYWALL THAT STOPPED SELLING FOUR THINGS THAT DO NOT EXIST — trunk `1adce673`

**Four PRs, six lanes, one scout, under the controller + subagent model. ALL FOUR OWNER
LIVE-VERIFIED ON PRODUCTION.** *(Wave 5A's handoff had to record verifies as owed. This one does not.)*

```
1adce673  feat(subscription): the upgrade sheet, and stop selling retired surfaces (GATE-2) #598
429a7b9f  fix(seo): point the whole SEO surface at the owned domain, and guard it (META-1)  #597
31138c95  fix(security): the CodeQL findings on live server code (SEC-1)                    #596
d7100a54  feat(server): delete the retired progress endpoints (PG-1)                        #595
```
**Trunk moved `59ba4da2` → `d98ff4c` (#593) → `29f3269` (#584) → `d7100a54` → `31138c95` →
`429a7b9f` → `1adce673`.** ⚠ **This file previously claimed `59ba4da2` — six merges stale.**

**Full controller record: `handoff/WAVE_STATE_WAVE5B_ARCHIVE.md`** — both retractions, the FORBID-3
ruling, the four approvals, the merge record, the FU ledger.

### ★★ LIVE-VERIFIED ON PRODUCTION — owner-run, browser and API
- Backend **boots** after PG-1; `/api/check-solution` answers **402** free-past-trial, **400** premium.
- ★ **The frontend reaches `/api/*` normally after SEC-1's helmet change** — no CORS errors, real page
  load through Vercel's cross-origin rewrite. **SEC-1's CSP argument holds in practice.**
- A 402 still carries `error: "premium_required"` and its message.
- ★ **The upgrade sheet appears instead of the red box.** "Keep using Basic" closes it and leaves the
  student **on the same URL**; "See plans" navigates. The sheet lists **only** Unlimited Mock Tests,
  Exam Simulation, Chapter Hub, Weak Area Practice.
- **The canonical reads `https://lazytopper.com/`** — confirmed by fetching the live page.
- Premium grading still works end to end.

### ⚠⚠ SAY IT PLAINLY: GATE-2 SHIPPED ITS HONEST HALF
**The *explained* layer (the sheet) and the *enforced* layer (GATE-1's 402) landed. §1's *visible*
layer — the pre-emptive locked CTA reading `Premium` before the tap — DID NOT.**
A blocked student now sees a sheet rather than a red box, which is the improvement; but **a student
still learns the boundary by bouncing off it, not before tapping.**
⇒ **`GATE-3` is ONE lane in Wave 5C** — FORBID-3's amendment **+** the `useSubscription` test-setup
change **+** the `entitled` prop **+ the parents that pass it.** **Shipping any subset produces a
locked CTA nothing renders. `#598` is NOT reopened.**

### ★★ WHAT THE LANES FOUND THAT THEIR SPECS DID NOT KNOW
- **PG-1:** the unwire was **FOUR** `index.cjs` sites, not the spec's two — the factory call and seven
  CORS-preflight arms were unnamed, and the cited line numbers were stale. All **7** handlers removed
  (incl. `handleMission`). Boot proven by mutation → `MODULE_NOT_FOUND`, restore SHA-verified.
- **SEC-1:** fixed the stack-trace leak **at the SINK, not the source**, because the source is PG-1's
  `index.cjs` — *"a per-call-site fix is only ever as complete as the grep behind it,"* **and it is the
  better fix independent of the lane boundary.** It **mirrored** the rate limiter rather than importing
  or inventing one, **keying on the server-decoded `req.userId` rather than the spoofable header —
  strictly better than the mechanism it copied.** ★ **It refused to claim its own CodeQL alerts
  cleared:** *"An empty result set is not a cleared set."*
  ⚠ **Alerts `#26`–`#29` are EXPECTED to survive — CodeQL recognises named limiter packages and this
  one is hand-rolled. THAT IS NOT A FAILURE OF THE LANE.**
- **META-1:** ★ the `raw=158 / rendered=154 / cap=155` **straddle** — the two measurements sit either
  side of the cap, so **a guard counting raw source would be red; green is itself the proof that HTML
  entities are decoded.** A property no mutation could demonstrate.
- **META-1c:** *"a comment is a claim; the missing `<Route>` is the fact"* — it verified a surface was
  unreachable by **enumerating all 47 routes**, not by trusting a `DEFERRED-REVIVE` comment.
- **GATE-2:** corrected its own spec twice — **Chapter Hub is NOT retired** (`/topic-hub` + 2 child
  routes are live), and **FIVE** severed surfaces were being sold, not four (it caught
  `parent_dashboard` and `predicted_questions`). ★★ **And it fixed them in a better place than the spec
  asked: filtering inside `getPremiumFeatureList()` ALSO repairs the live `UpgradeModal`, with no file
  outside the allowlist. One change, both surfaces — the difference between fixing an instance and
  fixing a source.** Gating provably unchanged.
- **GATE-2b:** ⚠ **assertion 8 (429) passes for the wrong reason** — the 429 branch precedes the 402
  one, so it is protected by **branch ORDERING, not the predicate it appears to test.** **Reordering
  those two branches is a change no test would catch.**
- **SCOUT-1 (zero files changed):** ⚠⚠ **it proved its own brief's premise wrong.** Hono/morgan/`re2`
  resolve through the **root** importer via `firebase-tools`, **not** through any workspace member ⇒
  **deleting every apparently-dead member removes 211 of 1,417 packages but only 4 of 103 alerts.**
  A workspace-deletion lane is **not** worth scheduling on supply-chain grounds.

### ⚠ TWO RETRACTIONS THIS WAVE — both recorded, both cheap because they were said out loud
1. **CONTROLLER:** *"`pricing.guard.test.ts` is untouched — still 9 tests"* was **FALSE**. META-1 had
   extended it by 70 lines. **Both observed counts were POST-change commits**, so the comparison had
   the wrong baseline. ⇒ **A TEST COUNT IS NOT A DIFF** — the same shape as `MOUNT ≠ LIVE` and
   `MERGED ≠ DEPLOYED`. `[FU-CONTROLLER-TEST-COUNT-IS-NOT-A-DIFF]`
2. **COFOUNDER:** *"the sheet exists and nothing opens it from a 402"* was **FALSE** — an inference from
   an absence (`#598` does not touch `aiClient.ts`). `SolutionChecker`'s catch detects
   `PremiumRequiredError` and renders the sheet. **GATE-2's design beats the spec's: one opener,
   structurally incapable of double-firing, rather than an emitter that could race the catch.**

### ★ LANE-OVERLAP — SETTLED BY EVIDENCE, three runs with real comparators
**It IS a real gate** (it ran and reported), **and it matches by EXACT FILE LIST, not directory
prefix** — `files.filter(f => mineSet.has(f))`. PG-1 and SEC-1 shared `lazytopper/server/` and passed.
⇒ **Directory-sharing lanes may be parallelised.** ⚠ **Do NOT carry "it gates nothing" forward, and do
not grep `lane_overlap.mjs` for `startsWith` — that hit is in `isGated()`, a non-fatal warn, and
suggests the opposite conclusion.**

## (superseded) [CURRENT] #579–#582 merged — ★★ WAVE 5A: THE PAYWALL IS CLOSED ON THE SERVER · ONE DOOR AND A VERIFIED EMAIL · A BLANKET BAN REPLACED BY TESTS · AND A MERGED, GREEN, CORRECT FIX THAT NEVER SHIPPED — trunk `59ba4da2`

**Five lanes, four PRs, run under a controller + subagent model. All four merged. All owner
live-verified on the deployed product.** Trunk moved `c5570592` → **`528abb1` (#581, FORBID-1)** →
**`cd0a6f0` (#580, GATE-1 + GATE-1b)** → **`8720849` (#582, AUTH-3)** → **`59ba4da2` (#579, SUPPLY-1)**.

```
#581  FORBID-1   replace the SolutionChecker blanket ban with targeted tests
#580  GATE-1     P0 · enforce entitlement on the paid AI endpoints   [owner live-verified]
      GATE-1b    (not a separate PR — the CI-wiring commit aeae3ebe inside #580)
#582  AUTH-3     one door, and a verified email                      [owner live-verified]
#579  SUPPLY-1   Dependabot version updates + CodeQL workflow        [LAST, deliberately]
```

**The wave base `c5570592` did not move for the whole build phase.** All four lanes were built in
parallel from it; disjointness was verified from the declared allowlists before dispatch, and no path
appeared in two lanes. `App.tsx` and `lazytopper/package.json` were absent from all four allowlists
(the latter joined GATE-1's by an explicit owner amendment — see GATE-1b below).

---

### 🛑🛑 THE WAVE'S MOST IMPORTANT FINDING — `MERGED` IS NOT `DEPLOYED`

**GATE-1 merged at 12:46. Vercel never built it. Railway did.** For roughly two hours the **server
enforced a rule the client had no code to explain**, and a free student pressing "Check my answer"
saw the raw string **`premium_required` in red** — **the exact defect GATE-1 §3D was written to
prevent.**

> ★★ **§3D WAS CORRECT, WAS MERGED, AND HAD NOT SHIPPED.** Every gate was green. The code was on
> trunk. **The defect it prevents happened anyway.**

**How it was caught:** by fetching the live bundle and grepping it. `premium_required` and
`PremiumRequiredError` were **absent from all 65 deployed chunks.** After a forced rebuild they were
present, and the browser showed the right copy.

#### ⚠⚠ THE DOCTRINE — recorded verbatim, and it is now standing

> **`MERGED` AND `DEPLOYED` ARE DIFFERENT STATES, AND THIS PRODUCT HAS TWO DEPLOY TARGETS THAT CAN
> DIVERGE.** Vercel (frontend) and Railway (backend) build independently from the same trunk. A merge
> confirms neither. **Any change spanning both must have BOTH deployments confirmed before it is
> called verified** — and the only trustworthy confirmation is asking the running system, not reading
> a dashboard.

**Two operational facts that must not be re-derived:**
- ⚠ **Vercel "Redeploy" rebuilds the ORIGINAL commit, not the branch tip.** It cannot pull in a newer
  merge, **and it looks like it should.**
- ⚠ **Branch protection means there is no git-shaped way to trigger a deploy.** A direct push to
  trunk is refused (`GH013`, correctly). ⇒ **the standing remedy is a Vercel Deploy Hook**, which the
  owner has created and will rotate.

⇒ `[FU-DEPLOY-SPLIT-RAILWAY-VERCEL-DIVERGENCE]` · `[FU-DEPLOY-HOOK-IS-THE-ONLY-MANUAL-TRIGGER]`

★ **This generalises the wave's own theme one level up.** Every lane this wave proved *"a green CI
run is evidence only about what it EXECUTED."* This proves the sequel: **a merge is evidence only
about the repository.** GATE-1b's grep asked the CI log what it ran; the fix here was to ask the
**bundle** what it shipped. **Same instrument, one layer out.**

---

### ★★ LIVE-VERIFICATION — OWNER-RUN ON THE DEPLOYED PRODUCT, BOTH PASSED

**GATE-1 — the paywall is VERIFIED CLOSED.** Direct API calls against production, **same endpoint,
same empty body, identity the only variable** — a clean three-way discrimination:

| Account | Result |
|---|---|
| Free, trial elapsed | **402** `premium_required`, with an account-specific `trialEndedAt: 2026-07-17` |
| Premium | **400** `Missing question text` — handler reached |
| Mid-trial | **400** `Missing question text` — ★ **trial == premium confirmed live** |

★★ **The `trialEndedAt` came from that account's own backdated document, not a constant** ⇒ **proof
the gate really read Firestore**, and proof the two-stage tier derivation works in **both**
directions. Also verified: `[entitlement] FAIL-OPEN` **absent** from Railway logs ·
`[firebase-admin] initialized … credentials: explicit` on the running deploy · "Show steps" still
free · Practice, Exam Trends, the bank and Progress all untouched · Check & Improve shows a proper
gate rather than an error.

**AUTH-3 — VERIFIED.** D1 Google (no verify screen) · D2 phone (no verify screen) · D3 fresh-email
signup → verify gate → mail → entry · D4 wrong password → *"That password doesn't match…"* **with the
Firebase Console confirming NO second account was created** · D5 forgot-password still
enumeration-safe · D6 the `from` round trip · D7 name field on `/sign-up`, absent on `/login` ·
D8 existing accounts sign in normally · E1/E2 the contrast fixes hold.

---

### THE FOUR LANES — what each actually proved

#### ★★ #580 · GATE-1 — the server now enforces entitlement, and the spec was incomplete in a way that would have left the P0 open

> **The effective tier is NOT the stored `tier` field.** It is
> `applyExpiry(repairInterruptedTrial(...))`, **and the order is load-bearing.**

★★ **Reading the raw `tier` field — which is what the spec's §1 literally instructed — would have
produced a gate that serves EVERY EXPIRED TRIAL (the exact day-7 hole the lane exists to close) AND
simultaneously LOCKS OUT MID-TRIAL STUDENTS.** Both failure directions at once, from one plausible
reading of the spec. ★ `repairInterruptedTrial` is Wave 4's #574 P0 fix — **a server gate reading raw
`tier` would have re-opened that P0 on the server side**, in a component no client test covers.
⇒ `[FU-ENTITLEMENT-TIER-DERIVATION-DUPLICATED]`.

**What makes the gate real rather than merely wired:**
- **The where-else check was ANSWERED, not assumed:** no handler has a second HTTP entry point;
  `gradeStructuredSet` is module-internal and never exported ⇒ route gating is complete, and
  `checkSolution.cjs` / `tutor.cjs` correctly stayed off the allowlist (the lane came in **under**
  its file budget).
- ★ **CONTROL 1 — a REAL 402 from a REAL request:** it boots the real `index.cjs` in a child process,
  swapping firebase-admin via `Module._load` **before require** — so **no test seam was added to
  production code** — then issues a real HTTP POST. *Mount ≠ live, satisfied properly.*
- ★ **CONTROL 2 — credentials absent:** asserted on the real child process's stderr matching
  `/\[entitlement\] FAIL-OPEN/` and `/not being enforced/`.
- **Fail-open witness** splits `no_uid` (a token was offered and did not verify = credentials broken)
  from `no_credential` (merely signed out) — *otherwise routine signed-out traffic drowns the one
  signal that matters.* That distinction was not in the spec.
- **Cache: 60s TTL, ENTITLED decisions ONLY. A denial is never cached**, so an upgrade is honoured on
  the very next call — pinned by test, satisfied by construction rather than by promise.
- **step-solution is UNGATED** (bank + cache serve any tier); only the generation branch is gated,
  behind a lazy resolver so free paths spend zero Firestore reads.
- **A shared import with `featureGates.ts` is NOT feasible** — `subscriptionService.ts` imports the
  **browser** firebase SDK at module scope and cannot be required from CJS ⇒ a **documented**
  duplication, which the spec explicitly prefers to a silent one. ⚠ **But the thing that must stay
  aligned is the DERIVATION, not the field.**
- **The fail-open is a header-omission bypass** — a caller who omits the header is served. Bounded by
  the rate limiter's **3/day anonymous cap**, and the browser has sent the bearer header on every
  paid call since #552. ⇒ **accepted posture, logged so it is a conscious choice and not a later
  discovery**: `[FU-GATE1-ANON-FAILOPEN-BYPASS]`.

#### ★★★ GATE-1b · the 43 tests that CI had never run — and the proof of the gap became the proof of the fix

**Proven, not suspected: a grep of #580's CI log for `entitlement.test.cjs` returned ZERO.** The
suite passed 43/43 locally and was **invisible to CI**, because the chain that invokes it lives in
`lazytopper/package.json` — off-allowlist for all four lanes. ★ **The subagent STOPPED AND REPORTED
rather than absorb it.** The owner extended the allowlist for **exactly two edits**, dispatched as a
separate lane onto the existing branch.

```
grep -c "entitlement.test.cjs"   run 30781159084 (f6f27159) → 0     ← the gap
                                 run 30786131841 (aeae3ebe) → 1     ← the fix
# tests 43  # pass 43  # fail 0  # skipped 0
```

★★ **The control is the part that matters:** it grepped the **already-wired sibling**
(`checkSolution` = 1) in the **same before-log, before editing anything.** ⇒ the zero was a missing
link, **not a log artefact and not a grep that could never match.** That is the difference between
*"the count changed"* and *"the count changed because of my edit."*

★★ **And it restored BY SHA, never by `git diff`** — `c0329f27 → ac729484 → c0329f27`.
**Chain placement was reasoned, not arbitrary:** index 19 of 23, immediately after
`test:server:check-solution`, so the `&&` chain can mask only the three tail-pinned self-tests — the
same relationship the existing check-solution link already has — and **none of the ~19 gates ahead of
it.** The tail-guard was **re-run rather than trusted** (11/11), **with its own control case**:
front-loading `test:mojibake` turned it RED.
⇒ `[FU-GATE1-TEST-NOT-IN-CI]` **CLOSED.**

#### ★★ #582 · AUTH-3 — one door, a verified email, and a refusal to follow §6 that was right

**NO `AuthContext` keys were added.** State rides on an optional `emailVerified?: boolean` on
`AuthUser`. **0 of the 25 `vi.mock` factories were touched**, proven by a `git diff -U0` filtered to
`useAuth`/`vi.mock` lines coming back empty. **`App.tsx` diff ZERO.** ⇒ **AUTH-3's true reach stayed
inside its allowlist, and BATCH-2 is NOT resequenced.**

- ★★ **§6's "reduce `SignUpPage` to a thin render" would have DELETED the product's only name
  capture.** `FirstSession` declines the name on trunk, so `SignUpPage` is where it happens; reducing
  it would have forced deleting **7 guard tests** and **re-opened PR-B2's one-way-door defect**
  (accounts with no name fall back to the raw email across six surfaces). It kept the name field on
  the create door instead — **`App.tsx` still never moves**, which was §6's actual objective.
  ⚠ `/login` can still make nameless accounts ⇒ `[FU-AUTH-NAME-PROMPT]`.
- ⚠⚠ **THE GATE IS PAGE-SCOPED, NOT APP-WIDE.** `RequireAuth` and `App.tsx` are out of allowlist, so
  **a restored session bypasses the verification gate** ⇒ `[FU-AUTH-VERIFY-NOT-APP-WIDE]`. ★ Stated
  plainly rather than papered over.
- **How the app learns verification succeeded:** explicit `reload()` on **three** triggers — window
  `focus`, a 5s poll (covers verifying on a phone), and a manual button. **Reasoned from the
  mechanism:** the handler is Firebase-hosted in another tab and `reload()` mutates in place without
  re-emitting, so **`onAuthStateChanged` does NOT fire.**
- ★★ **16 screenshots found TWO pre-existing defects invisible to every assertion in the repo:**
  white-on-white input text, and the primary Google button in dark theme measured
  `rgb(248,250,252)` on `rgb(255,255,255)`.
- **Phone-then-linked-email is UNREACHABLE today** (no email-link path exists), pinned by a test with
  a revisit trigger in code. **The false *"link both later"* promise is not shipped, and a test stops
  it returning.**

#### ★★ #581 · FORBID-1 — the ban was the ENTIRE protection

> **The array entry was the whole thing.** The `AUTOGROW` check regexes `EquationInput.tsx`'s **own
> source**; **nothing anywhere asserted one line of `SolutionChecker`'s behaviour.** The ban said
> *"something must not change"* and never said what — and there was nothing underneath it.

⇒ the amendment is a **strict increase** in protection, not a trade. **`SolutionChecker.tsx` diff
EMPTY**, byte-identical to trunk. **19 mutations (16 product + 3 gate), ALL RED**, every restore
verified.

★★★ **The mutation that justifies the whole doctrine — M2b:** renaming `--grow` made the **negative
assertion go VACUOUS and still pass. Only the POSITIVE CONTROL caught it.** That is *"every ABSENT
assertion needs a control that renders the thing"* proven on this wave's own new suite, by its
author, before shipping.

⚠ **It found that a green tick on the commit was NOT the gate:** run `30781253355` is **"Lane
Overlap", which gates nothing.** Two workflows fire per PR; the Quality Gate was `30781253342`.
⇒ `[FU-CI-TWO-WORKFLOWS-PER-PR]` — **a controller reading "CI green" off the wrong run learns
nothing.** It also corrected the CONV gate's own header, which claimed CI does not run vitest —
**false**, and load-bearing, because it would tell a future reader the replacement protection is
worthless ⇒ `[FU-CONV-GATE-HEADER-STALE-VITEST-CLAIM]`.

⚠ **One incident, self-disclosed:** M4b's first attempt exited on the ambiguity guard **before**
restoring, leaving `SolutionChecker.tsx` dirty — exactly the hazard the dispatch had named in
advance. Caught by the next `git status`, restored, verified, and **the restore was then moved into
an EXIT trap** so it cannot recur.

#### #579 · SUPPLY-1 — and it proved its own spec wrong in both directions

The spec named **secret scanning** and **push protection** as the outstanding owner toggles. **Both
were already ENABLED.** ⚠⚠ **This is recorded as a SPEC ERROR CORRECTED BY THE LANE, not as a lane
finding** — the distinction is what stops the wrong version being carried forward, and this is the
second time a spec's §0 has been wrong on a verifiable fact with the lane catching it.

**The genuinely disabled settings are Dependabot ALERTS and Dependabot SECURITY UPDATES** (evidence:
`404 "Vulnerability alerts are disabled."` **and** `403 "Dependabot alerts are disabled for this
repository."` — two different endpoints, so not a token-scope artefact), plus the two lower-value
secret-scanning sub-settings.

> ⚠⚠ **DO NOT RECORD #579 AS CLOSING THE SUPPLY-CHAIN ITEM.** `dependabot.yml` configures **VERSION**
> updates (*"a newer release exists"*). It **cannot** configure **SECURITY** updates (*"a CVE was
> published against what you use"*). **#579 delivers routine bumps and NO vulnerability response at
> all** until those two owner toggles are switched on.

★ **A checklist derived from memory is wrong in BOTH directions at once, and the "already done" half
is the more dangerous one, because it reads as confirmation.**

Also: CodeQL was **proven to have RUN, on the FINAL head** (`results=0 rules=87 tool=CodeQL 2.26.2`),
and `results=0` was **not** sold as a clean bill of health — default query suite,
`javascript-typescript` only. **`on.push` had to be added**: without it the Security tab stays empty,
**a guard that runs and displays nothing** — ★ proven by CONTROL CASE, the annotation being **absent**
from the later run. **`target-branch` was deliberately left UNSET** — setting it would SUPPRESS
Dependabot security updates.

★ **POST-MERGE OBSERVATION — the one thing SUPPLY-1 was structurally unable to verify is now
verified.** Five Dependabot PRs (`#583`–`#587`) opened after #579 merged. **A malformed
`dependabot.yml` fails silently and produces nothing**, so five PRs could not exist if it had not
parsed ⇒ `[FU-SUPPLY1-DEPENDABOT-PARSE-CHECK]` **answered by observation.** The design is visibly
working as specified: `#585` bumps *"the npm-minor-and-patch group with 59 updates"* (grouping
confirmed), `#583`/`#584` are majors raised individually, and five open = the 3/1/1 cap.
⚠ **They are also the PR-list noise SUPPLY-1 warned about** — `lane-overlap` fails on a shared path
against **every** open PR. They do not touch `handoff/**`, but a future `package.json` or workflow
lane **will** collide. **Triage or close them before Wave 5B's `quality-gate.yml` lane.**

---

### ⚠⚠ THE STATE-FILE RESOLUTION — four points, recorded beside the rule they qualify

The controller's live wave-state file was in contention this wave. **The resolution, in full:**

1. **The live `handoff/WAVE_STATE.md` remains UNTRACKED working memory. The rule is UNCHANGED.**
2. **Mid-wave durability is an OWNER-PUSHED DIRECT COMMIT, not a PR.** A PR takes the six-file
   handoff lock, and the lock is the reason the rule exists.
3. **At wave close it is committed ONCE, deliberately, as `handoff/WAVE_STATE_WAVE<n>_ARCHIVE.md`.**
   ★ **The `_WAVE<n>_ARCHIVE` name is what marks it a decision rather than an accidental re-carry** —
   which is exactly how `WAVE_STATE_WAVE3_ARCHIVE.md` arrived (swept in by #566's squash). This
   wave's is `handoff/WAVE_STATE_WAVE5_ARCHIVE.md`, committed with this handoff.
4. ⚠⚠ **THE COFOUNDER'S WAVE-5 METHODOLOGY BRIEF CONTRADICTED THE TRUNK RULE, AND THE TRUNK RULE
   WON.** The brief said the state file is *"committed, not local"*; trunk's `CURRENT_STATE.md` said
   the opposite in two places. **The brief was the error and is SUPERSEDED.** *A future reader who
   finds that brief must know this, or they will re-adopt it as current.*

⚠ **Wave 4's live state file was PRESERVED, not overwritten**, as `handoff/WAVE_STATE_WAVE4_LIVE.md`
— **untracked, and deliberately NOT committed.** Wave 3's reached trunk by accident; this one does
not, and that difference is the whole point of the naming rule.

---

### ⚠⚠ THE STALE MATRIX COUNT — a correction aimed at the WRONG FILE, and the story matters more than the fix

**Three separate lanes this wave reported that `CLAUDE.md` §6a says the root guard matrix is "175".
All three were remembering, not looking.**

**Verified against trunk** (`gh api …/contents/CLAUDE.md`, grepped for `175|190|suites`): **the file
contains no `175` anywhere.** It reads `SIX suites / 190 checks as of 2026-07-28 — the count GROWS;
read it from the run, never hardcode it`. ⇒ **`CLAUDE.md` was ALREADY CORRECT, fixed by Wave 4's
#572, which is exactly what that PR was for.**

★★ **GATE-1b found where the stale count ACTUALLY lives, and it is a file nobody had named:**
`.github/workflows/quality-gate.yml` carries `--- Root guard matrix: 5 suites, 175/175 ---`
**directly above the step that just reported 28 suites / 190 tests**, and a second stale `59 suites`
against a CI that now runs 96 test files. ⇒ `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]`.

> ★★ **THIS IS THE MAP-FILE LESSON RECURRING. A stale value's ban lives where you LOOK for it, not
> where you REMEMBER it** — and #572 fixing one copy is *why* the remembered version persisted. The
> one lane that actually enumerated found it somewhere else entirely.

⚠ **Consequences, and both halves are operative:**
- **DO NOT "fix" `CLAUDE.md`.** It is already right. Editing it would churn a correct file and,
  worse, **record a correction that never happened.**
- **`quality-gate.yml` cannot be fixed in a `handoff/**` docs-only PR** — a workflow is not a doc.
  It needs its **own small PR** in Wave 5B, after #579 is closed (SUPPLY-1 was deliberately barred
  from `quality-gate.yml` because a shared workflow reaches every other lane).

*A silently-correct value teaches nothing; a correction aimed at the wrong file teaches worse.*

---

### ⚠ THE `STOP BEFORE COMMIT` INSTRUCTION WAS WRONG AS WRITTEN — recorded, not silently corrected

Every Wave 5A lane spec and the dispatch document said *"stop before commit, report, wait."* **Six
separate passages in the same documents contradict it:** every report template requires a PR number,
a CI run id bound to the current head, a quoted zero-skip line, and a landed-file reconcile — **none
of which can exist without a commit and a push.**

**Owner ruling, 2026-08-03:** each lane works in its own worktree, runs all local gates, commits,
pushes a **DRAFT** PR, reads its own CI log, and stops. **Nobody marks a PR ready. Nobody merges.
The owner merges.**

> ★ **The line is recorded as WRONG, not merely ambiguous.** A silently-correct value teaches
> nothing, and the next spec author will otherwise write the same line again.

---

### ★★ D9 GENERALISED — GIT-BASED RESTORE VERIFICATION IS INVALID FOR A FILE THE PR IS ITSELF ADDING

GATE-1's first mutation harness used `git checkout --` + `git diff` to restore and verify. **Both are
NO-OPS on an UNTRACKED file**, and `entitlement.cjs` was new. **M1–M3 silently ACCUMULATED while the
harness printed `RESTORE VERIFIED: YES`.** It caught this itself, rebuilt the harness on **byte
snapshots + SHA-256**, and re-ran everything.

> ★★ **The verification INSTRUMENT was the silent no-op — not the code under test.** This is the
> first such mechanism found *inside a restore-verifier*, i.e. inside the very control the standing
> rule prescribes. ⇒ **the standing rule "verify the restore" is INSUFFICIENT AS WRITTEN. Say HOW you
> verified, not that you did.** `git diff` cannot see an untracked file.

★ **The doctrine now has both a failure and a control:** GATE-1b was the first lane dispatched after
this was written, applied it, and it worked. ⇒ `[FU-MUTATION-RESTORE-GIT-BLIND-ON-UNTRACKED]`.

---

### 🛑 TWO LAUNCH-BLOCKING FINDINGS, NEITHER VISIBLE TO ANY GATE

- ⚠⚠ **`[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]`** — the "Choose a Plan" modal lists **Smart Study
  Planner, Daily Focus Mix, Full Analytics Dashboard** and Chapter Hub. ★★ **Study Plan, Daily Mix
  and Dashboard are RETIRED SURFACES** — the standing rule is that a reference to them is evidence of
  **deadness, not liveness.** ⇒ **the paywall is selling four things the product no longer ships, to
  a student being asked for ₹599.** *The anti-fabrication doctrine applied to commerce.* **The fix
  belongs in GATE-2's spec — GATE-2 replaces this modal — NOT a separate lane.**
- ⚠⚠ **`[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]`** — the verification mail landed in **Spam**, with
  Gmail citing prior spam reports against `lazzyy-topper.firebaseapp.com`. ★★ **A domain-reputation
  problem sitting on a BLOCKING gate:** a new email student cannot enter until they click a link in a
  folder they will not open. **Google and phone bypass it, so it is invisible in owner testing while
  affecting every email student.** Fix = a Firebase custom action-handler domain on `lazytopper.com`
  plus authenticated SMTP. **Largely owner/DNS work, not an agent lane.** ★ *AUTH-3's spec predicted
  the spam risk and required the spam-folder prompt; the prompt shipped and the deliverability cause
  did not. The mitigation was right and insufficient.*

### CONFIRMED LIVE — previously inferred, now measured
- **`[FU-PG-DEAD-ENDPOINT-LIVE-503]`** — `/api/user/progress` **503s on every real session**,
  captured in a production HAR. PG-1's target, measured rather than inferred.
- **`[FU-META-CANONICAL-DEAD-DOMAIN]`** — `<link rel="canonical" href="https://lazytopper.app/">` is
  **live in production right now**, on a domain never owned. META-1's target, confirmed in the wild.
- ✅ **`[FU-AUTH-GOOGLE-EMAILVERIFIED-LIVE]` — CLOSED.** Measured twice: a live Google ID token
  decoded to `email_verified: true`, and D1 passed in the browser. ★ *AUTH-3 refused to assert this
  without measurement; the measurement now exists and agrees.*

---

### ⚠ THIS HANDOFF WAS WRITTEN BY A SUBAGENT — a DECLARED deviation from the operating model

The operating model says **only the controller writes the handoff.** The controller was at ~13%
remaining context, and writing six large files would have stranded the task mid-way — **the exact
failure this model exists to prevent, which has already cost this project three agents.**

> **§4's INTENT is preserved: the six files are ONE lock, written by ONE actor, never raced.** Exactly
> one handoff lane existed and no second was dispatched. **Precedent: Wave 4's controller did the same
> for `HANDOFF-W3` (#564), with the same declared reason.**

★ Recorded here rather than in the PR body alone, so it reads as a decision with a reason and not as
an oversight a future reader must reconstruct.

---

## (superseded) #566–#575 merged — ★★ WAVE 4: FOUR GUARDS THAT REPORTED SUCCESS WHILE INSPECTING NOTHING · A TRIAL THAT DOWNGRADED DURING ITS OWN ACTIVATION · A LIVE MOBILE CRASH NO TEST COULD SEE, BECAUSE EVERY TEST STARTS CLEAN — trunk `fcdbfa65`

**Ten PRs, run under a controller + subagent model. Zero open PRs at close.** Trunk moved
`25e995a7` → **`3400d908` (#566, AUTH-1)** → **`8caa1a3a` (#567, DOC-HARDGATE)** →
**`f246ada8` (#568, GUARD-2 restored)** → **`c3d76ecc` (#569, AUTH-2)** →
**`a22eb429` (#570, GUARD-3/PR-2)** → **`711b93e5` (#571, GUARD-3/PR-1)** →
**`6ca1daa5` (#572, GUARD-3/PR-1b)** → **`23ed4745` (#573, AUTH-2-FU)** →
**`59452785` (#574, P0-TRIAL)** → **`fcdbfa65` (#575, HOTFIX-MOBILE)**.

```
#566  AUTH-1          the offer strip on the sign-in surface       [owner live-verified]
#567  DOC-HARDGATE    the MONTHLY_INLINE hard gate, in the repo
#568  GUARD-2         blindspot suite wired into CI + whole-repo audit  (restores #565)
#569  AUTH-2          first-session start card, honest empty state [owner live-verified]
#570  GUARD-3/PR-2    616 legacy mojibake lines in handoff/ -> 8
#571  GUARD-3/PR-1    the cwd-frame sweep + a SCOPED mojibake gate
#572  GUARD-3/PR-1b   CLAUDE.md's stale suite count, which the file already contradicted
#573  AUTH-2-FU       one card, one greeting, and a search box that lied
#574  P0-TRIAL        the trial no longer downgrades during its own activation  [LIVE-VERIFY OWED]
#575  HOTFIX-MOBILE   hook count stable across the auth restore on /browse      [LIVE-VERIFY OWED]
```

⚠ **Trunk did NOT move monotonically this wave.** `937c88f` (#564) and `42d82e87` (#565) were
merged and then **removed from the branch by a force push**. See the incident below. Both are
recovered: #565's work was re-landed as **#568**, and #564's content is **already whole on trunk**
(verified below, not assumed).

---

### ★★ THE WAVE'S SUBJECT — one finding, four instances. Read this as ONE thing.

**Four of this wave's findings are guards and gates that reported success while inspecting nothing.**
They are not four incidents. They are one defect class, found at four different layers, and the
generalisation is **GUARD-1's own doctrine turned back on the tooling that enforces it.**

| # | the guard | what it reported | what it was actually inspecting |
|---|---|---|---|
| 1 | **`check:mojibake`** | PASS, for months | it framed its repo root at `lazytopper/`, so **`handoff/` was invisible** — **616 corrupt lines** sat behind a green gate |
| 2 | **`scope_guard_blindspot_acceptance` + `repo_boundary_acceptance`** | both suites existed and passed | **CI never ran either** — grepping #560's 4,076-line log for their filenames returned **0 matches** |
| 3 | **`react-hooks/rules-of-hooks`** | **"0 violations"** | `npx eslint src` dies with a module-resolution error in a fresh worktree, so the rule **ran nothing** — and it is the rule that exists precisely to catch React #310, the live crash this wave shipped |
| 4 | **the GitHub `trunk-protection` ruleset** | **Active**, *"Block force pushes"* **enabled**, correctly targeting the branch | its **Bypass list read "Repository admin — Always allow"** — it exempted the only person who could trigger it |

> ★★ **THE GENERALISATION: a check that cannot be shown to have looked, and to be capable of
> failing, is not coverage — it is the APPEARANCE of coverage, which is worse, because it stops
> anyone looking.**

★ **Instance 4 is the one worth dwelling on**, because it lived in **GitHub settings** — where no
gate, no test and no agent in this project could see it. It was found only because the base looked
wrong. ★ And instance 3 was found **by control**, not by quoting the clean result: the subagent
mutated the file and watched the linter still say zero.

> ★★ **THE BYPASS-LIST DOCTRINE, which is instance 4's transferable half:**
> **A PROTECTION WITH A BYPASS IS ONLY AS STRONG AS ITS BYPASS LIST.** *"Enabled"* describes the
> **rule**; it says nothing about **who it applies to**. **READ THE EXEMPTIONS BEFORE THE SETTING.**
> The setting is what you configured; the exemption list is what actually happens.

The ruleset is now set to *"For pull requests only"* — CLI force pushes blocked, PR-level bypass
retained.

---

### ★★ THE FORCE-PUSH INCIDENT — from the reflog, not from inference

```
42d82e87  @2026-07-30 07:29:19  fetch origin: fast-forward     <- #565 merged
25e995a7  @2026-07-30 07:29:24  update by push                 <- five seconds later
```

**A push from the SHARED CHECKOUT (`C:\Projects\Lazytopper-Production`) sent its stale local
`base/approved-thru-437` over the remote, dropping #564 and #565.**

> ★★ **`--force-with-lease` DID NOT PREVENT IT.** The lease asks only *"has the remote moved since
> my LAST FETCH?"* — and **the fetch five seconds earlier satisfied it.** It protects against
> someone **else's** push. **It has never protected against your own stale branch.**

★ **Two of the four guards above are visible in this one event**: the ruleset that exempted its
only trigger (instance 4), and the fact that neither `git ls-remote`, nor a green CI run, nor
GitHub's own `MERGED` status with a `mergeCommit` SHA detected the loss — **all three agreed, and
all three were wrong.**

> ★★ **A FRESH SHA IS NOT A GROWING HISTORY.** `ls-remote` catches trunk moving **forward**, never
> **backward**. ⇒ after any merge you are told landed, verify **both**:
> `git merge-base --is-ancestor <mergeCommit> <trunk>` **and** `git log <trunk> -- <a path it
> changed>`.
> ⚠ **The squash gotcha:** this repo squash-merges, so `--is-ancestor` on a **PR head** reports
> *not-ancestor* even for a merged PR. **The content-path check is the authoritative one.**

★ **The loss was caught by a subagent, not by the controller.** GUARD-3's report stated flatly
*"GUARD-2 never landed"* while the controller's own record had #565 as merged, CI-proven and both
FUs closed. **The subagent's finding beat the controller's record, GitHub's merge status, and a
green CI run simultaneously.** The lost commits remain at `refs/heads/recovery/lost-trunk-42d82e8`.

---

### ★★ WAVE 3's RECORD IS NOT LOST — IT IS WHOLE ON TRUNK. Verified, and it corrects the plan.

The Wave 4 plan recorded that **#564 (the Wave 3 handoff) was dropped by the force push and would
be deliberately NOT restored**, its content instead absorbed into this handoff as a *"recovered
section."* **That premise is false, and re-writing Wave 3's record here would have DUPLICATED a
record that is already the top entry in all six files.**

**The evidence, from git, not from prose:**

```
#564 (937c88f8) changed 9 handoff files, +2053 / -6
git diff --stat 937c88f8 <trunk> -- handoff/
  handoff/CURRENT_STATE.md                | 1232 ++++----   (= #570's mojibake re-encode)
  handoff/NEXT_ACTION.md                  |   34 +          (= #567's hard gate, +34/-0)
  handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md |    4 +-         (= #570's mojibake re-encode)
```

⇒ **Every one of #564's 2,053 lines is on trunk.** The only differences between #564's tree and
today's are **#567 and #570 applied on top** — both accounted for line-for-line.

**The mechanism:** AUTH-1 (#566) was rebased onto `937c88f` while #564 was still trunk. The force
push then reverted trunk to `25e995a7`. When #566 was **squash**-merged, its squash diff was
computed against that **reverted** base — so the squash carried all nine of #564's handoff files
back onto trunk alongside AUTH-1's four product files. **#566 landed 13 files, not 4.**

★ **This answers, rather than contradicts, the open question the controller correctly refused to
settle** (*"how much of #564 rode in that way is UNVERIFIED and is not the controller's to
determine"*). The answer is: **all of it.**

> ★★ **THE TRANSFERABLE PART, and it is uncomfortable: a squash merge's diff is computed against
> the base at MERGE time, not against the base the branch was built on.** Rewrite the base under a
> rebased branch and the squash will silently re-carry everything the rewrite removed. Here that
> was a **repair** — it restored a record the force push had destroyed. **It could just as easily
> have restored a revert.** ⇒ **after any force push, audit the file list of the NEXT squash merge
> against what that PR claims to change.**

⚠ **The consequence for scope discipline, stated plainly:** CLAUDE.md §8 requires that *"product
PRs must contain zero handoff doc changes."* **#566 breached it, silently, and no gate caught it** —
because `scope:guard` reads the **working tree**, where AUTH-1 correctly saw and reported its own
**four** files. **The guard was right about what it inspected and blind to what would ship.** ⇒
`[FU-SQUASH-CARRIES-REBASED-BASE]`.

⇒ **RECOMMENDED GATE, logged as `[FU-NO-MERGE-BASE-FILELIST-RECONCILE]`, NOT as a lane:** before
merge, **reconcile the MERGE-BASE diff against the PR's declared file list.** The data already
exists on both sides — `gh pr view <n> --json files` versus
`git diff --name-only <merge-base>..<head>` — and **nothing today reconciles them.**

#### ⚠ `handoff/WAVE_STATE_WAVE3_ARCHIVE.md` — RULING: LEAVE IT. But it arrived BY ACCIDENT.

The file **is tracked on trunk.** #564 committed it deliberately, as EV-1's only surviving record,
under the archive name specifically so it could not be confused with the controller's live
*untracked* `handoff/WAVE_STATE.md`. **Owner's ruling: leave it.** It is harmless, it is a genuine
record of Wave 3's controller state, and removing it costs a docs PR and the six-file lock for no
benefit. **Do not delete it and do not "tidy" it.**

> ⚠ **BUT IT REACHED TRUNK BY ACCIDENT, NOT BY DECISION** — swept in by the same #566 re-carry
> described above, along with the other eight handoff files. ★ **Its presence is therefore NOT a
> precedent for committing controller scratch.** The rule is unchanged: the controller's live state
> file is untracked working memory and must never appear in a PR.

> ★★ **READ THIS WITH THE WAVE 5A RESOLUTION ABOVE — the two belong together.** Wave 5A settled the
> remaining question this entry leaves open: the rule above is **UNCHANGED** (the live file stays
> untracked), mid-wave durability is an **owner-pushed direct commit, never a PR**, and the wave-close
> archive is committed **deliberately** under `WAVE_STATE_WAVE<n>_ARCHIVE.md`. ⚠ **And a Wave-5
> cofounder methodology brief said the opposite — "committed, not local". THE TRUNK RULE WON; the
> brief is superseded.** See *"THE STATE-FILE RESOLUTION"* in the `[CURRENT]` section.

#### ★★ AND A CONTROLLER-SIDE FAILURE, RECORDED BECAUSE THE CAUSE IS THE SAME SHARED CHECKOUT

**The controller told THREE separate lanes that this file was "untracked scratch that exists only in
the shared checkout."** It is **tracked on trunk**, and it reads as `??` in the shared checkout **only
because that checkout is stale.** Nothing was damaged — all three lanes left the file alone, and the
third verified the claim against a fresh worktree and reported it false.

> ★★ **But a controller asserted a repo fact three times without checking it, and the cause was the
> shared checkout again.** ⇒ **"NEVER READ FROM THE SHARED CHECKOUT" APPLIES TO THE CONTROLLER TOO,
> NOT ONLY TO SUBAGENTS.** A controller reads git metadata rather than product source, and **git
> metadata read from a stale checkout is exactly as wrong as stale source** — `git status` there
> reports a tracked file as untracked, **a false negative that looks like a fact.**

★ **Same shared checkout as the force push, and as Wave 3's stale `firestore:rules` deploy. Three
incidents, one root, across two waves.**

---

### ★★ THE LIVE MOBILE CRASH — and the four lines that explain the whole week

Mobile `/app/browse` rendered, then error-paged with **React #310** (*"Rendered more hooks than
during the previous render"*). It looked email-authenticated-only. It "fixed itself" when a student
cleared site data. **1,082 passing tests, a verified build chunk and mutation-proven assertions all
shipped it.**

**Root cause (#575):** in `components/mobile/MobileAccountMenu.tsx`,
`const [linkOpen, setLinkOpen] = useState(false)` sat **BELOW `if (!user) return null`.** A
signed-out render runs N hooks; a signed-in render runs N+1 — **on the same instance.** Introduced
by **#554 (PR-F1, phone linking)**. The persisted key is **Firebase auth persistence (IndexedDB)** —
not localStorage, and **not the subscription cache**.

> ### ★★ #575's OWN COMMENT, QUOTED VERBATIM — the best artefact of the wave
>
> *"A student with cleared site data never crossed it — they are signed out, and after signing in
> they NAVIGATE here, mounting fresh with the user already present. That is why clearing site data
> 'fixed' it and why 1082 green tests never saw it: every one of them starts from clean state."*

★ **That is the entire week in four lines.** It explains why desktop emulation at 390px came back
clean, why clearing site data appeared to be a fix, and **why the bug looked email-specific when it
never was** — a phone session reproduces #310 identically. The real variable was **PERSISTED
SESSION**; phone and email users differed by **how they ARRIVED**, not by method. ⇒ **do not build
anything on "email-only."**

> ★★ **THE DOCTRINE: A BUG THAT ONLY APPEARS WITH ACCUMULATED STATE IS INVISIBLE TO EVERY TEST,
> BECAUSE EVERY TEST STARTS CLEAN.** The first render of a mounted instance is not the only render
> that matters — **a component that crosses a `null -> value` boundary mid-life is a DIFFERENT
> COMPONENT from one that mounts with the value already present.**
>
> ⇒ **LIVE-VERIFY MEANS BOTH SURFACES, AND AT LEAST ONE SESSION WITH EXISTING STATE.**

★ **The screenshots do not prove it, and the subagent said so.** The local dev app **cannot** produce
the failing order — `/browse` is a lazy route and dev auth resolves before that chunk mounts, so the
component never renders with `user === null`. **In production, Firebase's IndexedDB restore is
slower than the chunk, which is the whole bug.** The decisive evidence is the vitest harness plus
mutation M1, whose **two surviving green tests are the controls** (clean state; user present at
first render) — proving the suite is not green for the wrong reason.
⇒ `[FU-DEV-BROWSER-CANNOT-REPRO-AUTH-TIMING]`.

---

### 🛑 THE P0 — the trial downgraded during its own activation (#574)

**Every new signup silently downgraded to free.** The production fingerprint:

```
plan: "trial_7day"   tier: "free"   premiumSince: null
trialStartDate: July 31 2026, 4:40:22 PM IST
updatedAt:      2026-07-31T11:10:23.593Z   <- ONE SECOND LATER
```

**The mechanism:** `saveCloud` writes `trialStartDate: serverTimestamp()` — a **sentinel, not a
value** — and `snap.data()` defaults to `serverTimestamps: "none"`, so the SDK **materialises the
unacknowledged sentinel as `null` inside `loadCloud`.** `applyExpiry` then fails closed, exactly as
designed, and hydrate's own write-back sends `tier:"free"` while leaving `plan:"trial_7day"` and the
pinned start intact. **That is the record the owner observed.**

> ★★ **SEC-2 (#563) IS NOT WRONG, AND THAT IS THE POINT.** *"A trial that cannot prove when it began
> has not begun"* is correct and it closes Route C. **The defect was the CLIENT evaluating the rule
> before the proof could exist — and no rules test could ever have caught it, because the emulator
> never sees the optimistic local write.** ⇒ **a fix that makes `applyExpiry` lenient would be a
> security regression, not a fix.** `applyExpiry` is UNCHANGED.

**The fix is one argument:** `loadCloud` now reads `snap.data({ serverTimestamps: "estimate" })`.
★ **An ABSENT field is still absent under `"estimate"`, so Route C is untouched** — proven by
mutation M2, which makes `applyExpiry` lenient and goes red. A second path (a server timestamp ahead
of a skewed **device clock** also read as no-start, so it fired for some students and never for the
owner) is handled by a 5-minute tolerance **with a clamp**: ★ **the clamp is what stops the
tolerance being a grant** — a future start can never push the window past `now + TRIAL_MS`, so it
buys a forger zero extra time.

**The already-broken accounts self-heal.** `repairInterruptedTrial()` runs as read-back
normalisation on every cloud read, is idempotent, needs no migration script, and cannot be forged:
it runs only on `loadCloud`'s result, keys off a `startIsServerPinned` flag that is a `CloudResult`
field **deliberately not present on `SubscriptionStatus`** (so the cached copy can never assert it),
and a client-shaped ISO string start repairs nothing.

> ★ **BUT THE REPAIR PRESERVES `trialStartDate` BY DESIGN, so the 7-day window runs from the
> ORIGINAL start.** A student wrongly on free for two days gets **five days, not seven.** ★★ **That
> is correct behaviour for the fix and wrong for the student, and the two are not the same thing.**
> **A fix that restores the flag but not the entitlement is a partial fix that looks total — the
> repair reports success while the student is quietly short of days, and nobody would think to
> look.** ⇒ `[FU-TRIAL-DAYS-LOST-TO-P0]`. Owner reset the affected handful manually in the Console.
> ⚠ **At volume this needs a script, and that script MUST go through a SERVER/ADMIN path, never a
> client one** — `trialStartImmutable()` is the rule SEC-2 exists to enforce.

**Owner ruling: NO ACCOUNT WIPE.** Deleting affected accounts would destroy attempts, graded answers
and MI data to fix a field that repairs itself.

★ **ONE ARCHITECTURAL FACT, so nobody re-derives it: there is no separate mobile backend.**
`subscriptionService.ts` lives in `src/` and one responsive codebase serves both surfaces, so
#574 fixes mobile **and** desktop with the same change.

### ★★ #310 AND THE P0 DO NOT SHARE A ROOT CAUSE — recorded as a RESULT, not as a silence

The controller was instructed to test the shared-cause hypothesis **first**. It returned outcome
**(c) UNRELATED**, and that is recorded here deliberately: *we checked whether one caused the other,
and it did not.* ★ **The alternative is a dependency nobody questions later.**

| | #310 (mobile crash) | P0 (trial downgrade) |
|---|---|---|
| **Root cause** | a `useState` **below** `if (!user) return null` | `snap.data()` defaulting to `serverTimestamps:"none"` |
| **Trigger** | Firebase auth persistence restoring a tick after first paint | an unacknowledged `serverTimestamp()` read back before the server resolves it |
| **Introduced by** | **#554** | **#563** |
| **Surface** | mobile only (the component is mobile-only) | **both** — one responsive codebase |

**How it was proven, not assumed:** #310 reproduces with `useSubscription` mocked to a **constant
that never flips**, and again with **no subscription record at all**; a repo-wide scan found **no
component whose hook count depends on tier or premium.** ⇒ **Neither fix affects the other. Both
were needed.**

---

### ★ RETENTION — asked as *"are we keeping too much?"*, and the answer runs the other way

**`[FU-RETENTION-ALREADY-MINIMAL]` — verified 2026-07-31.** **Nothing is ever deleted, and that is
fine, because almost nothing is kept.**

- **No answer image is persisted anywhere.** Images travel as base64 in the request body and are
  **discarded**. Firestore holds only `SessionRecord` **summaries** — the four-type breakdown,
  section breakdown, topic keys and focus aggregates — **which is exactly the scorecard the product
  needs.** The graded-sheet artefact is rebuilt from a **local** cache and is already ephemeral.
- ⇒ **NO DELETION POLICY IS OWED.** Do not plan one.
- ★★ **THE GAP RUNS THE OTHER WAY, and this is the part worth stating well: the download DISAPPEARS
  when the local cache is evicted, so a student loses their graded sheet WITHOUT EVER CHOOSING TO.**
  **The fix is to offer the PDF AT GRADING TIME**, rather than depending on a cache that will not
  survive.

> ★ **The retention question was asked as "are we keeping too much?" and the answer is "we are
> keeping the right things, and losing one the student wanted."**

★ **And "last 7 days" was never retention.** `getActivitySummary` computes
`cutoff = Date.now() - sinceDays * DAY_MS` **at READ time** — it is a **display window**. **Records
stay; the query narrows.** ⇒ **a student promoted from trial to premium needs NOTHING done**, and
widening the window is a display change, not a data recovery. *(Losing that distinction would have
produced a migration lane that never needed to exist.)*

**Two consequences logged, neither a lane today:**
- `[FU-RETENTION-UNBOUNDED-UNBUDGETED]` — ⚠ **storage is NOT the driver**; Firestore holds text
  summaries only. The concern is **READ VOLUME at scale**, and nobody has modelled it. Belongs in
  the **cost analysis**, not a code lane.
- `[FU-NO-DELETION-OR-EXPORT-PATH]` — still stands. Note the connection: **minimal retention LOWERS
  the deletion exposure and does NOT answer export**, and *"offer the PDF at grading time"* is the
  nearest thing to an export path the product would have. **DPDP Act, minor users** — priority one
  on the external audit brief.

---

### ★ THE OTHER FINDINGS THAT MUST SURVIVE

- ★★ **A CORRECT OUTCOME REACHED BY A FALSE PREMISE STILL POISONS THE RECORD.** Twice this wave.
  (1) AUTH-2-FU's brief said the Home search box was dead — *"a student can click it and nothing
  happens."* **False**: it opened a working CommandPalette. **The ruling survived on stronger
  ground the subagent supplied itself** — the palette filters a fixed list of seven quick actions
  and can return **no topic, chapter or question**, so a placeholder reading *"Search topics,
  chapters, questions…"* **is a control that lies about what it returns.** (2) The P0 chain's link 2
  named `trialStartMs` as the failure point; the sentinel never reaches it, and **a fix written to
  the brief's line would have gone in the wrong file.** ⇒ *the wrong reason is what a later lane
  inherits.*
- ★★ **A CONTROLLER AMPLIFIES.** A subagent's side finding — offered explicitly as minor and outside
  its allowlist — was promoted to the headline finding **and** to a mutation requirement that would
  have broken a **working** metric (`anchor_frame_would_miss` is correct; only its NAME is
  misleading). **A finding the controller has restated is harder to reject than one reported raw.**
  ⇒ **pass findings through with provenance intact** — *"the subagent reports X"* is not the claim
  *"X"* — and when one is retracted, **check whether the amplified version reached the repo, the
  state file, or a dispatched instruction.** *(Checked here: it reached none of them.)*
- ★ **A TEST PROVES THE CODE WORKS; A CHUNK PROVES IT SHIPS.** #569's CI log carried both
  `✓ FirstSession.test.tsx (17 tests)` **and** `assets/FirstSession-SPkKUIod.js  9.00 kB` — the
  second line proves the component is reachable from the **bundle graph**, not merely compiled.
- ★ **A SUITE THAT ONLY EXERCISES THE EXPLICIT PATH SAYS NOTHING ABOUT THE DEFAULT PATH.** AUTH-1
  volunteered that its OPEN/CLOSED assertions stayed **green under the flag flip**, because a
  partial `importActual` mock forced the flag: **they proved the component READS the flag, not its
  VALUE.** Two decorative tests, found by asking what evidence would show them working — not by a
  gate.
- ★ **"LABELLED AS FORCED" IS NOT THE SAME AS "SHOWS WHAT IT CLAIMS."** #573 caught that the prior
  session's "with-attempts" screenshots were **photographs of the same state twice** — the seeded
  rows lacked `topicKeys`/`questionIds`, which `isSessionRecord` requires and silently filters. **A
  label describes the method; only a visible state difference proves the subject.**
- ★ **A COPY CHANGE HAS A BLAST RADIUS TOO.** #573's first CI run went red on a test file that was
  never in its local scoped set: *"I never re-derived blast radius from the changed COPY STRING."*
  **"Where else?" applies to strings, not just symbols.**
- ★★ **THE PROTOTYPE IS NOT THE PRODUCT** — bit twice. A prototype is authoritative when a lane
  **INVENTS** visual language and wrong when a lane must **MATCH** existing language. AUTH-1's spec
  described a mobile fallback for a layout that does not exist (the live `Login.tsx` hides the
  entire brand panel below 1024px; the prototype's split collapses to one column). ★ **Note the
  class: not a factual error, a category error about which artefact is authoritative.**
- ★★ **A SPEC IS A STATEMENT OF INTENT.** #571 was told to write an **enforce**-list of three trees.
  It wrote a **one-entry EXEMPT list** instead, with everything tracked enforced by default —
  because *an enumerated enforce-list is defect #4 of this very lane: a new top-level tree would
  default to INVISIBLE.* **A denylist of exempt trees fails safe.** A better answer than the one it
  was given, for the lane's own stated reason.
- ★ **A GATE THAT LETS ITS AUTHOR THROUGH IS THE CLASS TWO WAVES HAVE BEEN SPENT REMOVING.** #571's
  own draft embedded literal mojibake in its comment and fixture, and its own new gate failed on
  them. **Fixed rather than exempted** — *a RECORD keeps its specimen literal because a reader must
  see it; a FIXTURE does not.*
- ★ **A DOCS-ONLY PR IS THE ONLY RUN THAT SEES THE MERGED WHOLE**, and it is the cheapest full-bar
  check available. #567 and #572 each paid out; see this entry's own CI note below.
- ⚠ **A SUBAGENT THAT ENDS ITS TURN WHILE "WAITING" HAS ENDED THE LANE.** P0-TRIAL ended its turn
  twice holding a complete result, waiting on a run it did not actually block on. **Ending a turn
  does not pause a wait.** ⇒ block on the run (`gh run watch <id> --exit-status`), or return the
  report with `CI: IN FLIGHT, not read` and every other line filled in. ★ **A report with one gap
  beats another cycle.** *(Cost: three round trips on a P0 whose fix was already pushed.)*

### THE THREE CARRIED RULES — still in force, restated because each was re-earned this wave

- **GUARD-1's generalisation, and a guard's WORKING DIRECTORY is part of its blast radius.** Six
  instances, one cause: every script under `scripts/ops` assumed `cwd = lazytopper`, because that
  is where the author sat. ★ **One instance was inside the suite built to catch it.**
- **A CI RUN ID IS BOUND TO A COMMIT, NOT A PR.** Re-derive from the current head. A run captured
  before a rebase verifies a tree that is not the one being merged — **and it looks like proof.**
- **TIGHTENING A WRITE RULE BREAKS EVERY OVER-SENDING WRITER, SILENTLY.** Enumerate every writer and
  check what each **actually sends**, not what it is supposed to send. (Carried from the SEC lane.)

---

### THE MOJIBAKE GATE IS NOW SCOPED — and the 8 survivors are the finding

#570 cleared **616 -> 8**. #571 then made `check:mojibake` **scoped**: it **ENFORCES** on product
trees (`lazytopper/src/**`, `lazytopper/server/**`, `artifacts/**`) and every other tracked tree by
default, and **SCANS-AND-REPORTS-WITHOUT-FAILING** on `handoff/`.

> ★★ **THE RULING, and the reasoning IS the specification: the gate was asking the wrong question.**
> Mojibake is a **DEFECT** in product text and a legitimate **SUBJECT** in documentation about
> mojibake. **A gate that cannot tell those apart is not detecting a bug — it is banning a
> character.** *"The gate's job is 'no mojibake reaches a student', not 'no such byte exists in the
> repository'."*

⚠ **THE RESIDUAL 8 ARE DELIBERATE SPECIMENS AND MUST STAY.** They are corrupted sequences quoted
**inside handoff entries that are lessons about mojibake** — a reader needs to SEE what the
corruption looks like to recognise it in the wild. **Do NOT "tidy" them, and do NOT re-enforce
`handoff/`.** ★ #570 shipped exactly that mistake in its first blanket pass — *the lesson was
destroyed by the repair* — then caught and reversed it itself before pushing. `escaped codepoints`,
`a gate-honoured pragma` and `a file allowlist` were all considered and all **rejected**.

★ **It is monitoring, not exemption, and the COUNT is what makes that true.** The gate prints on
**every** run including a clean one, and an assertion enforces that it prints:

```
MOJIBAKE_SCOPE: root=... tracked=1717 scanned=1456 enforced_hits=0 report_only_hits=8
MOJIBAKE_REPORT_ONLY: handoff/: 8 non-enforced hits across 3 files (record tree — deliberate
  specimens quoted in lessons about mojibake; scanned, not enforced)
```

> ⚠ **A green `check:mojibake` still says almost NOTHING about a `handoff/` file.** Any docs PR
> touching `handoff/` must scan its **own added lines** with **the scanner's own regex, extracted
> from the source rather than re-typed**, and **inject a sequence to prove the matcher can fire.**
> **A zero from a matcher nobody proved can fire is indistinguishable from a dead matcher.**

---

### VALIDATION — this handoff's own run

**A docs-only PR runs the full bar, and it is the only run that sees the merged whole.** This entry's
CI run is the first to compose **all ten** Wave 4 merges together — #566, #567, #568, #569, #570,
#571, #572, #573, #574, #575 — a combination **no product PR's own run has ever seen**, since each
saw only its own base. Most usefully it composes **#570** (the handoff mojibake cleared) with
**#571** (the mojibake gate now enforcing repo-wide by default) and **#574 + #575** (the P0 fix and
the hook-order fix, which were built in parallel against different bases).

---

## #557–#563 merged — ★★ WAVE 3: THREE ROUTES TO FREE PREMIUM CLOSED IN PRODUCTION · A GUARD THAT COULD NOT SEE ITS OWN REPO · A DEPLOY THAT SHIPPED NOTHING AND SAID "Deploy complete!" — trunk `25e995a7`

> ★ **This record is COMPLETE and was never lost.** #564 was removed from the branch by the force
> push described in the Wave 4 entry above, and **restored in full** by #566's squash. Verified
> line-for-line against `937c88f8`. **It is not reproduced in the Wave 4 entry — one document, not
> two.**

**Seven product PRs, four lanes, run under a controller + subagent model. Zero open PRs at close.** Trunk moved `eb88bce0` → **`579b6953` (#557, D1)** → **`5b4070ad` (#558, C1)** → **`8e89604d` (#560, GUARD-1)** → **`6bb5bb4f` (#561, SEC-1-REV)** → **`69a39e29` (#559, C2)** → **`0a6a0bf0` (#562, D2)** → **`25e995a7` (#563, SEC-2)**.

```
#557  D1        phone-linking nudge
#558  C1        grader FORBIDDEN ban -> targeted tests
#559  C2        responseSchema (constrained decoding)   [owner live-verified]
#560  GUARD-1   scope:guard blind spot + boundary lanes
#561  SEC-1-REV Firestore premium self-grant closed     [deployed + Console-verified]
#562  D2        client cleanup (three dead things)
#563  SEC-2     entitlement not forgeable (Routes B+C)  [deployed + Console-verified]
```

**The Firestore rules are DEPLOYED and read back from the Firebase Console, not merely merged.** Both owner live-verifies (C2's grading round-trip, SEC-2's fresh-student trial) are done. Nothing from this wave is pending.

### ★★ THE WAVE'S FINDING — the mechanism that reports success on work it never did

Every lane found the same shape, at a different layer. A guard that inspected nothing. A rules block that read as a restriction while a permissive block still matched. A schema mutation aimed at a harness that mocks the thing it was supposed to constrain. A backup taken after the change it was meant to undo. And, below every gate this project owns, **a deploy that uploaded nothing and printed `Deploy complete!`**.

> **★★ THE DOCTRINE — GUARD-1's generalisation, verbatim.**
>
> **A guard's output must name its subject, not just its verdict.** Every check states what it inspected — which files, which patterns, how many times each fired — and any check whose subject count or match count is **zero is a FAILURE, never a pass**. "Nothing to object to" and "nothing looked at" are the same output otherwise, and a guard is a device for telling those two apart.
>
> - **A guard may not verify itself against its own input.** `classified === all.length` proves nothing when the bug shrank `all`. Self-checks need truth from *outside* the thing under test.
> - **Coverage is proven by the negative case.** A green run establishes only that the guard did not object. Ship the mutation that makes it red, or the guard is decorative.
> - **A guard nothing runs is not a guard.** Reachability is part of the check, not packaging around it.
>
> One line: **a check that cannot be shown to have looked, and to be capable of failing, is not coverage — it is the appearance of coverage, which is worse, because it stops anyone looking.**

### ★★ THE DEPLOY THAT SHIPPED NOTHING — and the two words that were the whole signal

**Merging #561 did not put the security fix in production.** A `firestore:rules` deploy run from the shared checkout redeployed rules **six commits stale** and reported success.

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

[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE] — firestore.rules is the clearest case but not
the only one: nothing in CI can observe what is actually deployed. A merged rules
file, a Railway env var, a Firebase console setting — all of them can diverge from
trunk silently and indefinitely. The stale-checkout deploy above was invisible to
every gate this project has, and would have stayed invisible until an auditor or a
student found it. Any lane whose outcome depends on a deploy must carry an explicit
OWNER-ACTION line in its report AND must not be closed in WAVE_STATE.md until the
owner confirms the deployed state, not the merged state.
```

**★★ The two-word difference between `skipping upload` and `uploading rules` is the whole signal.** `6bb5bb4f` in that FU is #561's own merge commit: the deploy ran minutes after the merge, from a checkout that had never seen it. The successful re-deploy printed **`uploading rules`**.

⇒ **STANDING CLOSURE RULE: a lane whose outcome depends on a deploy closes on the DEPLOYED state, never the MERGED state.**

### ★★ A ROLLBACK ARTEFACT MUST BE PROVEN TO CONTAIN THE OLD STATE

The owner's rollback backup was taken **after the merge had already been pulled**, so it captured the **NEW** rules — a useless rollback that looked like insurance. Caught before deploying and replaced with `git show <prev-sha>:firestore.rules`.

> **DOCTRINE — carry verbatim:** *A rollback artefact must be PROVEN to contain the old state.* **Grep it for the thing you are about to add; if the pattern is present, you backed up the wrong version.** Git is a better source than the working tree, because the working tree may already have moved.

Same family as everything else this wave: an artefact that **looked** like protection while containing nothing of the kind — and only a **check of its contents** could tell the difference.

**★ Rollback path, known BEFORE deploying:** Firebase Console → Firestore → Rules → the version dropdown. A previous ruleset republishes in one click. If trial activation had broken after deploy, that was the immediate action — not a hotfix PR.

### ★★ TIGHTENING A WRITE RULE BREAKS EVERY OVER-SENDING WRITER, SILENTLY

SEC-2 applied the "where else?" rule and found that `saveCloud` **spreads `status`** into its payload. That spread would have sent `trialEndDate` and a client-chosen `trialStartDate` — **both refused by the new rules** — so **every cloud write would have failed SILENTLY inside the existing `catch {}`**. The security fix would have quietly disabled subscription persistence, with nothing on screen and nothing in a gate.

> **DOCTRINE — carry verbatim:** **TIGHTENING A WRITE RULE BREAKS EVERY OVER-SENDING WRITER, SILENTLY.** Before changing what a store accepts, **enumerate every writer and check what each actually sends — not what it is supposed to send.** A spread into a payload sends fields nobody listed.

`saveCloud` now builds its payload **field by field**, and tests 8a–8c pin the shape so the regression cannot land quietly.

### ★★ A CI RUN ID IS BOUND TO A COMMIT, NOT TO A PR

The run the controller handed EV-1 for #558 (`30417690715`) was **not #558's final head** — it ran `06692469`, after which the branch took trunk-merge commit `24883eca`. EV-1 pulled run `30418065085` on the real head and re-verified everything green there too. **Had it trusted the assigned run, the merged head would have been unverified.** This was the controller's error, caught by the subagent.

> **Standing rule: derive the run from the head you actually care about; never carry a run id forward across a rebase or a trunk-merge.**

### ★★ THE FIXTURE THAT ENCODED THE DEFECT IT WAS CLOSING

`useSubscription.autotrial.test.ts` had `activeTrial(5) = {start: now, end: now+5d}`, asserting `daysLeft === 5`. Under a **derived** end that is 7, so it went RED: *"expected 7 to be 5."*

★ **That fixture describes a five-day trial that began today — a state the product cannot produce. It was only expressible BECAUSE the trial length was a stored, writable field.** The fixture encoded the very defect being closed, which is the cleanest possible proof SEC-2 fixed the right thing. The helper now derives the start; the test's intent and its assertion are preserved. Test-only, one file, zero product code.

### ★★ SIX PROPOSED MECHANISMS PROVEN INERT — four of them the spec author's own, self-reported

**Derived from the record, not carried forward as a number.** An intermediate spec in this wave said "five"; C2's own report called its instance *"the fourth this wave"* without enumerating the other three. Neither figure can be reconciled against the evidence, so both are recorded and neither is used. What follows is the enumeration, each with the evidence that proved it inert. **A "proposed mechanism proven inert" here means a fix, command or artefact that was put forward as doing something and was then shown to do nothing.**

| # | the proposed mechanism | the evidence that proved it inert | whose |
|---|---|---|---|
| 1 | **The SEC-1 spec's §3 Firestore rules fix** | Mutation 2 (`nested-noop`) applied the spec's fix verbatim to the real emulator: `# pass 6 # fail 8`, **byte-identical to the permissive-rule run**, same eight assertions. It did not even stop a `tier:"premium"` write to the parent doc. In `rules_version = '2'` a recursive wildcard matches **zero** or more segments, so the nested `match /{document=**}` also matches `/subscriptions/{uid}` itself — and Firestore **ORs** its match blocks. | spec author's own, self-reported |
| 2 | **The GUARD-1 spec's literal remedy** (re-frame the `git diff --name-only` calls) | `git diff --name-only` is **root-relative from any cwd** and had already been fixed under `[D47]`/`[D41]`, with comments saying so. Only `git ls-files --others` is cwd-scoped. Applying the spec's remedy would have been "a green suite over an open hole." | spec author's own, self-reported |
| 3 | **The C2 spec's §2 stated mutation target** (tightening the schema reddens C1's §5) | Under mutation 1, **every C1 §5 test stayed green.** That harness mocks `callGemini`, so no schema ever touches its payloads, and C1's §5 pins the **parser**, which a schema change cannot affect. Had it been taken on trust, the lane's central guarantee would have been unenforced while appearing enforced. | spec author's own, self-reported |
| 4 | **The cofounder's own verification command** | Two piped `Select-String`s requiring the **same LINE** to match both an invocation pattern and a result pattern — which can never match. It returned empty and looked like evidence that C2's suites had not run. **They had.** `node --test` prints invocation and result on **different lines**. | spec author's own, self-reported |
| 5 | **The owner's rollback backup** | Taken *after* the merge was pulled, so it contained the NEW rules. Proven by grepping it for the thing about to be added. | owner's, caught pre-deploy |
| 6 | **The first `firestore:rules` deploy** | `"latest version already up to date, skipping upload"` then `"Deploy complete!"` — six-commit-stale rules re-shipped, production unchanged. | operational |

★ **Instances 1–4 are proposals; 5–6 are an artefact and an operation.** They are listed together because they are one failure class — *something that reports success while inspecting or changing nothing* — and separating them by category would hide that. The count of **proposals** alone is **four**; the count of the **class** this wave proved inert is **six**.

⇒ **Two method rules follow directly:** *run the mutation battery against the SPEC, not only against the code* (instances 1–3), and *a verification command needs its own control — run it against a case you know matches before trusting an empty result* (instance 4). An empty result from an unvalidated command is not evidence of absence; it is no evidence at all.

---

### D1 · #557 — `feat(auth)`: a one-time phone-linking nudge on both Home pages

`LinkPhoneNudge` + 14 tests; both Home pages wired. **★★ The research the spec owed: the returning-session signal DOES NOT EXIST.** Every `lazytopper.*` localStorage key in `lazytopper/src` (~170) was enumerated and each candidate traced to its **writer**. Three candidates, all rejected — `landingMemory.hasProfile` is a dead key (permanently false), `lazytopper.firstVisitOverlayShown` is written only by the **severed** `pages/Dashboard.tsx`, `lazytopper.studySessions` is the activity signal the owner excluded. Firebase `metadata.lastSignInTime` was rejected because persisted sessions freeze it at `creationTime` forever — a silent never-fires — and `mapFirebaseUser` does not map it anyway.

Owner approved the smallest addition: a per-browser distinct-session counter, `lazytopper.homeVisits.v1` + `lazytopper.homeVisit.counted.v1`. Returning ⇔ count ≥ 2. ★ **The sessionStorage flag is load-bearing, not an optimisation** — without it a first-session student walking Home → Practice → Home reaches 2 and is nudged in the session they signed up.

**Two design decisions worth keeping:**
1. **The modal's lifetime is NOT tied to the nudge's visibility.** A successful link flips `providerIds`, which makes the nudge's condition false — nested, the modal would vanish mid-success and the student would never see the confirmation. It renders whenever `modalOpen`, guarded by `if (!showNudge && !modalOpen) return null`.
2. **`spaced` is a PROP, not a wrapper div.** An always-rendered wrapper carrying `marginTop` pushes everything below down **even in the usual case where the nudge renders null** — a layout change for every student. The modifier class exists only when the nudge does.

**Hazard cleared, proven by running it, not assumed:** `MobileHome.test.tsx` mocks `AuthContext` with a **bare factory returning only `useAuth`** — the classic wholesale-replacement trap. It still passes, because `useAuth` is the only RUNTIME import on that path (`hasPhoneLinked`'s `AuthUser` is `import type`, erased).

### C1 · #558 — `test(server)`: the grader's blanket ban replaced by targeted tests

`checkSolution.test.cjs`, **32 tests, `# skipped 0`**, five sections. **`checkSolution.cjs` itself is byte-identical to trunk.** Both FORBIDDEN gates lifted the ban in the shape of the **#519 precedent** — commented lift plus asserted replacement, never a bare delete. Convergence gained **three** new checks, overlay its **own two**, deliberately duplicated rather than shared: *"A lift verified in only one gate leaves the other silently protecting nothing."* All checks are **filesystem-only** (no subprocess, no git base) so they can never skip on a shallow checkout. Convergence 97→**100/100**, overlay 34→**36/36**.

**⚠ DECLARED DEVIATION:** `lazytopper/package.json`, to wire `test:server:check-solution` into `test:matrix:all`. *"A test that is not wired into `test:matrix:all` never runs in CI. Shipping the test file without the wiring would produce exactly the silent-no-op this PR exists to prevent."* **Self-policing:** both amended gates now assert the wiring by regex; unwire the test and both go red.

**★ 13 mutations, ALL PROVEN RED.** And the one that first ran green is the lesson:

> **★★ A MUTATION THAT DOES NOT GO RED IS FIRST A CLAIM ABOUT THE MUTATION, NOT ABOUT THE TEST.** M5 reported 32/32 pass. The anchor `.filter((s) => s && s.description)` exists **twice** in the file at **different indentation** — 10 spaces inside `handleCheckSolution`, 6 inside `normaliseStructuredResult`. The 6-space anchor matched (reporting `anchor x1`, which *looked* correct) and patched **the wrong function**. An anchor that matches exactly once still proves nothing about *which* occurrence it matched when the code keeps near-duplicate copies — and this file deliberately maintains two near-identical graders, so it is a repeat trap here.

**Three spec premises died here:** ONE gate bans the grader (there were **two**, and amending only the allowlisted one would have left C2 red on the other while looking like it had unblocked it); "retry-once + the 400-token headroom" is one mechanism (**two unrelated ones in two handlers** — three distinct `generationConfig` objects, and the 400-token story belongs to *detect*, which has no retry); "the retry fires in BOTH graders" (false — `normaliseStructuredResult` is a **pure synchronous normaliser** with no network path).

### C2 · #559 — `feat(server)`: constrain grader output with `responseSchema` · ★ OWNER LIVE-VERIFIED

**THREE parsers ⇒ THREE schemas.** C1's report said "two, not one." It was still one short. Gates: `Array.isArray(p.annotatedSteps)` · `if (!parsed)` · `Array.isArray(p.results)`.

★★ **Schema C (worksheet) deliberately does NOT require `annotatedSteps`** — a `couldNotRead:true` entry legitimately has none. **Reusing Schema A there would have forced the model to fabricate steps for an unreadable answer** — a CLAUDE.md §5 "no invented content" breach shipped as a performance optimisation.

★★ **`mistakeType` is nullable with NO enum**, because grading rules 4/5/6/7 all *require* `null`. **The owner live-verified this specifically**: he graded a real answer on production, then a **fully correct** answer to exercise the null path — full marks, **no spurious mistake type**. That was the failure mode to fear: a schema forcing `mistakeType` to a value would have made **Mistake Intelligence learn from noise**. The decision is now verified rather than argued.

**6 mutations RED**, including a **silent-no-op** one (`buildBody` stops forwarding the schema → the CONTROL reddens) and a regex mutation that reproduced a literal `400 - Unknown name "responseSchema"` outage.

**`tutor.cjs` deliberately left unconstrained (F4).** It sends no `responseMimeType`, its reply is consumed as **prose**, and its only structure is sentinels *stripped by regex*. Constraining it would mean deriving a schema from the prompt (forbidden), flattening teaching prose into a JSON string, and breaking both extractors. It has no parse-miss retry to fix. A reported non-change with reasoning.

**⚠ Near-miss worth keeping:** a cosmetic parameter rename left two dangling references inside `runWithFallback` — **a ReferenceError on every Gemini call.** Caught by the existing 23-test suite within one run. The existing tests earned their keep on a change that looked cosmetic.

### GUARD-1 · #560 — `fix(ops)`: make `scope:guard` see the whole repo

**`scope:guard` ran with `cwd=lazytopper`**, where `git ls-files --others` returns nothing — so an **entire new top-level directory was invisible to it** while modified root files were seen. All enumerations now run from `GIT_ROOT`, and the guard prints a `SCOPE_GUARD_SCOPE:` line naming root, anchor, inspected, untracked and **`anchor_frame_would_miss`** — an independent re-run in the old frame, a genuine second measurement rather than a restatement of `all`. **17 unclassifiable top-level paths → zero.** `firestore` and `repoRoot` lanes wired into `classifyFile` **and** `laneBuckets`.

★ **The old self-check could not catch it:** `classifiedCount !== all.length` compares against the list the omission had already shrunk. **A self-check asserted against its own input is a tautology.**

★ **Contradiction to the spec, deliberate:** GUARD-1 did *not* make a new top-level directory classify into a lane — that re-creates the blind spot with extra steps, waving anything new through. Correct behaviour is *seen, then loudly `[unclassified]`*. The repair is **absent from output → named in output**.

**The new zero-match meta-assertion caught a live one immediately:** `trends_cta_pressure_within_contract` asserts `count <= 12` and was **passing with count = 0** — a ceiling check passing on nothing.

**Spec correction:** `agent3_uiux_guard` was never "silently passing." It exits 1 and scored **3/7 on trunk**. The silence is that **nothing runs it** — RED and unread through three redesigns.

**⚠ Almost none of GUARD-1's work is CI-gated.** Proven, not asserted: grepping the 4,076-line CI log for `blindspot\|repo_boundary\|agent3_uiux\|scopeGuard\|scope:guard` returns **0 matches** — CI executed **none** of the five changed files. Merged on the local run with eyes open. **`[FU-GUARD-1-A]` and `[FU-GUARD-1-B]` are what close that** — see `NEXT_ACTION.md`.

### SEC-1-REV · #561 — `fix(security)`: close the Firestore premium self-grant path · ★ DEPLOYED + CONSOLE-VERIFIED

Route A closed. Rules tests **`# pass 14 # fail 0 # skipped 0 # todo 0`** on a **real emulator** (a portable Temurin 21 JRE was downloaded — no Java on the box; every rules result is emulator output, not reasoning). The nested wildcard block was **DELETED** rather than guarded — no subcollection writer exists repo-wide; the sole writer is `subscriptionService.saveCloud → doc(db,"subscriptions",uid)`, a 2-segment path.

The delivered fix reads via `request.resource.data.get('tier','')` rather than a bare field read — necessary because the client writes with `setDoc(..., {merge:true})`, and **a bare read of an ABSENT field is a rules *error* that would deny ordinary partial merges.** Test 1b is the control that proves it.

**Two allowlist extensions, both forced consequences:** root `package.json` (a lockfile entry cannot exist without a manifest entry) and `.gitignore` (the new gate writes `firestore-debug.log` to the repo root; unignored it dirties every working tree).

**§4(b) "where else?" answered:** all 12 rule collections grant `write: if isOwner(uid)`, but **only `subscriptions` is read as an entitlement**; the rest are the student's own data. Two adjacent finds reported and deliberately not fixed — `users/{uid}` has **no rule at all**, so `ensureLearnerAccountMetadata` writes have **always been silently denied** inside a bare `catch {}`; and the free daily-practice quota is **localStorage-only**, so no rule can gate it.

★★ **It found a THIRD route to premium and proved it green on the emulator (assertion 8).** See below.

### D2 · #562 — `chore(client)`: delete the retired Home page and the dead AI learning path

7 files, **+37/−1107**. `pages/Home.tsx` deleted (with its fabricated JSON-LD social proof), `generateAILearningPath` deleted with `WeakAreaPracticePage` calling the local `generateLearningPath` directly, and the two stale reCAPTCHA comments in `Login.tsx` corrected.

**★★ "Two verified mitigations mean nothing goes red" — FALSE.** `lazytopper/src/config/pricing.guard.test.ts` asserts the price walk **reaches** `src/pages/Home.tsx`. Deleting the file **fails it, and CI runs full vitest** — a hard CI-red that **neither the spec nor GUARD-1 mentioned.** ⇒ **A deadness analysis that enumerates only the fixtures you expected is not an enumeration.**

**★★ GUARD-1 fixed one fixture, not both — "where else?" again.** `lazytopper/scripts/ops/ux_focus_acceptance.mjs` **still** reads `src/pages/Home.tsx` via a bare `readText` with no existence guard. Corroborated independently by the FU board, which already named **both** files. Impact today: zero — no npm script, no workflow, no invoker anywhere. → `[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]`.

**★ "zero importers" — FALSE.** `Home.priceConsistency.test.tsx` imports it, and **PR-B1 (#548), four commits before trunk, actively updated Home.tsx's prices and wrote that 246-line suite.** A file can be unrouted and still be under active maintenance by a guard that scans all of `src/`.

**⚠ DECLARED DEVIATION, approved:** `pricing.guard.test.ts` (+8/−2). The probe was **repointed** to `src/pages/desktop/DesktopHome.tsx` rather than dropped — the probe's job is proving the walk **recurses**, and Home.tsx sat directly in `src/pages/` beside `PricingPage.tsx`, so deleting the line would leave no probe below the first level. **That preserves the test's PURPOSE rather than its letter.**

**⚠ A trap for the later dead-code sweep:** `scripts/ops/llm_path_audit_acceptance.mjs` **is CI-gated** and requires `rg("generateMoreLikeThis|MENTOR_ENDPOINT") > 0`. Safe today because `generateMoreLikeThis` is live and carries the check alone. **The sweep may delete `MENTOR_ENDPOINT` — but must not delete both.**

### SEC-2 · #563 — `fix(security)`: derive trial expiry from an immutable server-set start · ★ DEPLOYED + CONSOLE-VERIFIED

Routes B and C. Rules `27 passed (27)` on a real emulator, client `27 passed (27)`, **four required mutations RED plus three more isolating one clause each.**

> **★ ENTITLEMENT MUST DERIVE FROM DATA THE CLIENT CANNOT FORGE.**
> - `tier:"premium"` → **Admin SDK only** (#561)
> - `tier:"trial"` → the **START** is a server timestamp the rules pin to `request.time`; the **DURATION** is a constant in code; therefore **the END is DERIVED — never stored, never trusted**
> - `localStorage` → a **cache**, never a grant

**Storing `trialEndDate` at all was the defect.** Rules cannot parse an ISO string, which is why every attempt to *validate* the stored date fails. **Remove the forgeable field rather than guarding it.** ⚠ `isPremiumAccess` was deliberately NOT changed — a trial granting premium is the product design (a 7-day full trial) and is correct; the defect was that the trial's **LENGTH** was forgeable.

**★★ A fourth form, found while speccing:** pinning the start to `request.time` is not sufficient alone — if the client may write `start == request.time` *whenever it likes*, a student re-triggers it daily and holds an infinite trial. So: **create** must equal `request.time`; **update** must equal the existing value; **delete DENIED**, or a student deletes the doc and re-creates to reset the clock. All three emulator-proven.

**★ The pre-hydration flash is a decision, not an accident.** `loadSubscription` stays synchronous and cache-first, so a forged localStorage entitlement **is** briefly visible before hydration. Test 7 pins it **in both directions**: pre-hydration reads premium, the same mount's hydration resolves free, and **the cache is EVICTED so the flash cannot recur.** The alternative — everyone starts free — blanks real subscribers on every mount and breaks the offline case. ★ And hydration on `absent` writes **nothing** to the cloud: *"uploading the cache would launder a forgery into the record of truth."*

**★ `loadCloud` returns `error`, not `absent`, when `firestoreDb` is null.** *"Absent is a positive claim and must never be inferred from a read that never ran."*

**⚠ Honest limits the subagent declared rather than papered over:** migration was **PARTIAL VERIFICATION** — production documents could not be enumerated without Console or Admin credentials, and **no claim was made about a check that was not run**; what *was* verified is that `subscriptionService.ts` is the **sole writer** to `subscriptions` anywhere in the repo. And three rules variants also drop the `trialEndDate` clause, so test 13 reddens under them too — *"contamination, not evidence"*; each clause is pinned by the tests only it breaks.

### ★★ THERE WERE THREE ROUTES TO PREMIUM, NOT TWO — ALL THREE ARE NOW CLOSED IN PRODUCTION

| Route | Mechanism | Closed by |
|---|---|---|
| **A — Firestore** | write `tier:"premium"` to `subscriptions/{uid}` | **#561** |
| **B — localStorage** | `loadSubscription` reads only the local cache; Firestore never consulted when no cloud doc exists | **#563** |
| **C — forged trial** | `isPremiumAccess()` returns true for `tier:"trial"` exactly as for `"premium"` (surfaced as `isPremium` at 40 sites), and `trialEndDate` was a **client-supplied ISO string** that `applyExpiry` trusted. `{tier:"trial", plan:"trial_7day", trialEndDate:"3000-01-01"}` bought permanent premium-equivalent access. **Proven green on the emulator before it was closed.** | **#563** |

**Verified at the deployed layer, with a fresh student.** Trial started cleanly and survived a reload. The Firestore Console shows:

```
trialStartDate:  July 29, 2026 at 10:46:51 PM UTC+5:30   ← TIMESTAMP
updatedAt:       "2026-07-29T17:16:52.809Z"              ← string, quoted
```

★ **The type difference IS the fix.** `trialStartDate` is a real **server-set Timestamp the rules can pin**; `updatedAt` beside it is still a quoted string, which is exactly what a client-forgeable field looks like. **There is no `trialEndDate` field at all** — expiry is derived, not stored, so there is nothing left to forge.

**⚠ AND EVEN WITH A, B AND C CLOSED, ENTITLEMENT IS STILL CLIENT-SIDE ONLY.** The API server checks **rate limits, not plan**. A student calling the endpoints directly with a valid Firebase token still reaches paid features regardless of tier. After this wave, paid features are protected **in the UI** — a real improvement, and **not** the claim "paid features are protected." → `[FU-VERIFY-UID-ON-AI-ENDPOINTS]`, a different lane.

### ★ SEC-2's live-verify could not happen before merge — and that changes how to read it

**Firestore rules deploy PROJECT-WIDE, not per-preview.** There is no environment where SEC-2's rules could be exercised against the real client before they were live. So the sequence was necessarily **merge → deploy → verify → roll back if wrong**, not verify-then-merge. **Recorded so nobody reads the live-verify as a pre-merge gate that was skipped. It was not skipped; it was unavailable.**

★ **Which is why the emulator proof carries more weight here than usual.** 27/27 rules tests plus four mutations RED on a real emulator was the *only* pre-merge evidence available. It had to be enough, and it was. On this one lane the mutation battery is not belt-and-braces over a live check — **it is the check.**

---

## PROCESS — the controller + subagent model, and what it got wrong

Wave 3 ran under a **controller + subagent** model. **★ CONTROLLER DISCIPLINE, recorded so it is not eroded:** *"The controller reads no product source, runs no builds, reads no CI logs, inspects no diffs. The moment it does, it is a subagent with a plan attached and this model has collapsed back into what it replaced."*

**★ The clearest evidence for the split:** both outgoing agents in the first pass **mislabelled their own PR number**, each reporting the other's, at ~4–7% remaining context. **Neither was wrong about the work — only about which was theirs.** *"The failure was not competence, it was an agent holding the plan while spending its last context on evidence."* Any claim sourced from an agent's final message is re-derived from the repo before it is trusted.

**★ THE CROSS-CHECK THAT WORKED.** The controller relayed SEC-1's `scope:guard` finding to GUARD-1 **with an explicit instruction not to trust it**. GUARD-1 then proved it **half wrong** — `git diff` was already fixed. Had the relay been accepted as settled, GUARD-1 would have "fixed" a call path that was never broken and shipped a green suite over the real hole. ⇒ **Relay evidence between lanes; never relay it as settled.**

**⚠ Two controller assumptions that were wrong, recorded because the same standard applies to the controller:**
1. **Push serialisation was not required on the ground cited.** `#562` and `#563` were open simultaneously and **`lane-overlap` passed on both** — it keys on genuine file collision, not on a shared tree. **Merge sequencing IS still required, but by branch protection** (each merge forces the next branch to update and re-run CI), which is a different mechanism. ⇒ *Subagents stopping before commit makes build-parallelism free; **merge** order is what needs sequencing.*
2. **In the first pass, both PRs merged BEFORE the verification lane returned.** The evidence turned out retrospectively clean, so nothing needed reverting — but the gap is real: ***the evidence lane must close before the merge, or it is an audit, not a gate.*** Still an open process question.

**⚠ A precision note D2 volunteered, worth keeping as method.** It had called the unchanged vitest total of 1017 "coincidental"; it then corrected itself — the deletion happened **before** its first full local run, so **there is no pre-deletion baseline in evidence.** The number is consistent across its runs and CI; it is **not** proof that the deleted suite's tests were replaced one-for-one. ⇒ **A number that agrees with itself is not a measurement.** Nobody asked for that correction.

**★ CORRECTION — SUBAGENTS CANNOT WRITE INTO THE REPORTS DIRECTORY.** The harness blocked subagent writes to `C:\Users\Chetan\OneDrive\Desktop\diff\` for the whole wave. Every lane report in that directory was **captured verbatim from the subagent's return message by the controller**. **EV-1's lane has no report file at all** — `handoff/WAVE_STATE_WAVE3_ARCHIVE.md` is its only record, and it is committed with this handoff. ⚠ **It is committed under the ARCHIVE name deliberately.** The controller's live state file is `handoff/WAVE_STATE.md`, which is **untracked scratch memory, now holding WAVE 4**, and its own header says it *“must never appear in a product PR.”* The bytes committed here are the Wave 3 file, verified **md5-identical** to the controller's own `WAVE_STATE_WAVE3_ARCHIVE.md`.

---

## EV-1 — the evidence lane (read-only, PASS)

**The zero-skip proof, all read FROM THE LOG, none confirmed from a report:**

| what | result |
|---|---|
| #558 `node --test server/routes/checkSolution.test.cjs` | `# tests 32 / # pass 32 / # fail 0 / # skipped 0 / # todo 0` |
| #558 `objective_dedup_acceptance.mjs` — **the one nobody could run locally** | **RAN.** 16 `✓` lines, 0 skips, `✅ objective-flag + attempt-dedup acceptance PASSED`. Exercises the REAL route module with two negative controls. Not `node --test`, so no four-counter block — its zero-skip proof is **structural**. |
| #558 convergence / overlay | `100/100 checks green` · `36/36 checks green` |
| root guard matrix (both runs) | `# tests 190 / # suites 28 / # pass 190 / # fail 0 / # skipped 0` |
| #557 vitest | `Test Files 89 passed (89)` · `Tests 1019 passed (1019)` |
| #559 (C2) | `test:server:check-solution` `# tests 50 # pass 50 # fail 0 # skipped 0`; `test:server:token-instrumentation` `# tests 29 # pass 29 # fail 0 # skipped 0` — both matching local exactly; `objective_dedup_acceptance.mjs` RAN and PASSED against the **modified** route module |
| #563 (SEC-2) | rules emulator gate `# tests 27 / # pass 27 / # fail 0 / # skipped 0`; `✓ subscriptionService.entitlement.test.ts (17 tests)`, `✓ useSubscription.autotrial.test.ts (5 tests)`; `Tests 1036 passed (1036)` |

**★ Independent corroboration, not just a re-read:** #558's run (no D1 code) shows **88 files / 1005 tests**; #557's shows **89 / 1019** — a delta of **exactly +1 file / +14 tests**. The suite is proven to have run by arithmetic as well as by its own line.

**Screenshots — VERDICT: NO LAYOUT DEFECTS.** Zero horizontal overflow at 390 / 768 / 1024 / 1440. Buttons never wrapped. Dismissed state collapses with **no residual gap** — the `spaced`-as-a-prop decision holds up in the picture. Nudge box **362×113 @390, 740×68 @768, 700×68 @1024, 1116×68 @1440.** Presence asserted by `data-testid` + visibility + exact copy, and **count=0 in all four dismissed shots** — not eyeballed. 8 PNGs + 2 metadata JSON at `C:\Users\Chetan\OneDrive\Desktop\diff\screenshots-D1-2026-07-29\`, **uncommitted**.

**★★ 6 OF THE 12 SCREENSHOT CELLS WERE ARCHITECTURALLY UNREACHABLE.** `useIsDesktop` is `(min-width:1024px)`. Below 1024, `/` redirects to `/browse` (MobileHome); at ≥1024, `/browse` redirects to `/` (DesktopHome). **DesktopHome cannot render at 768 or 390; MobileHome cannot render at 1024.** **Proven by live redirect probes, not by reading code.** The 12-cell matrix was never satisfiable. 8 shots captured: the 6 real cells plus DesktopHome @1440 present/dismissed. ⇒ **write specs against the breakpoint, not against a grid.**

**★ The auto-sign-in hazard is DEV-SERVER-ONLY.** `shouldAutoAnonBootstrap()` requires `import.meta.env.DEV`, **false on a Vercel production build**. The preview does not auto-sign-in, and the auto-created local user would be ineligible anyway (`isLocalSession: true`). The standing note does not generalise to previews.

**⚠ The one thing the pictures do NOT prove:** `providerIds` came from a **seeded local session**, not Firebase server truth (Firestore returned `Missing or insufficient permissions` throughout, as expected). `hasPhoneLinked` against a **real phone-linked Firebase account is unproven by picture** and rests on the 14 unit tests. → `[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`, still owed.

---

## VALIDATION

| gate | result |
|---|---|
| root guard matrix | `# tests 190 / # suites 28 / # pass 190 / # fail 0 / # skipped 0` — **read from the run, never hardcoded** |
| lazytopper ops matrix | 19 suites, EXIT=0, 152 ok, **skipped 0** |
| vitest | 1019 → **1036 passed (1036)** by #563 |
| rules emulator (new this wave) | `# tests 27 / # pass 27 / # fail 0 / # skipped 0`, on a **real** emulator |
| C&I convergence / overlay | 100/100 · 36/36 |
| `scope:guard` | rebuilt by #560; now prints `SCOPE_GUARD_SCOPE:` naming what it inspected |

**⚠ `scope:guard` gotcha, confirmed by SEC-2:** `firestore.rules` now classifies as `[firestore]`, not `[unclassified]` — GUARD-1's lane works. **But it FAILS under `--mode product`.** `--mode mixed` is the correct invocation for a product+firestore PR: `SCOPE_GUARD_OK (mode=mixed, lanes=product+firestore)`.

## ⚠ LIVE-VERIFY OWED — one, carried from Wave 3

1. **D1 (#557)** — `hasPhoneLinked` against a **real phone-linked Firebase account**. Neither picture nor unit test can settle it. → `[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`.

**Done and closed:** C2's grading round-trip including the null-`mistakeType` path, and SEC-2's fresh-student trial with the Console read-back.

---

## (superseded) [CURRENT] #546–#552 merged — ★★ WAVE 2: THE FRONT DOOR CLOSED · A GUARD THAT COULD NEVER FIRE · TOKENS FINALLY READABLE · AND EVERY SIGNED-IN STUDENT WAS BEING RATE-LIMITED AS A STRANGER — trunk `e8b15735`

**Seven product PRs across two parallel lanes, file-disjoint by construction, merged in sequence. Zero open PRs at close.** Trunk moved `c2f1793e` → **`9c49287d` (#546, A1)** → **`f0e72ac2` (#548, B1)** → **`302cba35` (#547, A2)** → **`47d765db` (#549, A3)** → **`823460a1` (#550, B2)** → **`52d54fc8` (#551, B3)** → **`e8b15735` (#552, B4)**.

Lane A = `artifacts/api-server/`, `lazytopper/server/`, `lazytopper/scripts/ops/`, CI. Lane B = `lazytopper/src/`. Disjointness was verified by both agents independently before starting, and the three shared-risk files (`pnpm-lock.yaml`, `.github/workflows/quality-gate.yml`, `lazytopper/package.json`) were confirmed byte-identical after each rebase. All seven squash subjects verified clean — no leading `@` (the #533/#535 defect). Every PR ran as a draft, was CI-verified by READING THE LOG rather than the tick, and was merged by the owner. No self-merge.

### ★★ THE WAVE'S REAL FINDING — nine wrong spec premises, every one reported rather than built around
**Six in Lane B, three in Lane A. Three would have shipped a defect that looked like a fix.** The question that caught every one was the same: **what evidence would show this took effect?**

The two most expensive classes were not wrong lines of code. One was a **gap BETWEEN two individually-correct halves**, which no unit gate can see (#552). The other was a **rule that could not be observed, and therefore could not be tested** (#546).

---

### A1 · #546 — `feat(server)`: CORS allowlist + helmet on the api-server front door
`artifacts/api-server/src/app.ts` was a bare `app.use(cors())` — every origin allowed — in front of BOTH entry points: the `/shared-api` router and the `/api` gateway proxy. `railway.json` starts this app and `vercel.json` rewrites both prefixes to it, so this is the production **front door**.

- **A missing `Origin` is allowed unconditionally.** The Vercel rewrite is SERVER-SIDE, so legitimate production traffic — same-origin GETs, the Railway healthcheck, the warmup script, admin tooling — arrives with no Origin header at all.
- **★★ A CORS REFUSAL IS HEADER OMISSION, NOT A BLOCK.** With `cb(null,false)` the request still reaches the handler and returns 200; only the browser enforces anything. So "missing Origin gets refused" is, on its own, harmless to the no-Origin traffic itself. **The mechanism that actually kills production is `cb(new Error(...))`**, which `next(err)`s into Express and 500s every caller — proven by mutation, a real 500. The spec attached the outage to the wrong one of its two rules.
- **★★ AN UNOBSERVABLE RULE IS UNTESTABLE.** `cors` emits `Access-Control-Allow-Origin` by REFLECTING the request origin, so `cb(null,true)` with no origin to reflect emits **no header at all** — byte-identical to a refusal. "Missing Origin is allowed" would have been unobservable, and a future regression would have passed any test written against it. The no-Origin case therefore returns `"*"`, which is **not** a widening: bare `cors()` already answered `*` to every request.
- **helmet: CSP OFF and HSTS OFF.** The spec's stated CSP risk was wrong — a CSP header from this service cannot break Firebase/Gemini, because CSP is enforced against the DOCUMENT that carried it and **no document is served from here** (the SPA is Vercel's). It is inert bytes on a JSON response; that is the real reason. **HSTS off is the one that matters and was not in the spec:** MEASURED — with the option removed, helmet 8.3.0 emits `max-age=31536000; includeSubDomains`, a FULL YEAR, and the rewrite pass-through can pin the apex domain and every subdomain client-side, unreversible by deploy.
- Both asserted as **OBSERVED RESPONSE HEADERS, never config keys** — helmet silently ignores an option name it does not recognise, so a key alone proves nothing.
- **★ CI HAD ZERO GATES OVER `artifacts/api-server`** — not tests, not even a typecheck. The only thing catching a type error in the production front door was the Railway build, i.e. the deploy. #546 added a root typecheck step and an edge-test step.
- 16 tests, `# skipped 0`. **Six mutations verified RED**, including "make missing-Origin refuse" and "unmount helmet entirely" (proving the header-absent assertions are not vacuous).

### B1 · #548 — `feat(pricing)`: founding and list tiers from one constant
List ₹999/mo + ₹8,999/yr from day one; founding ₹599/mo + ₹5,999/yr for the first 200 students, rate locked while subscribed. 6 files, 32 passed (32), 4 mutations fired.

**Two findings changed the shipped copy.** The claim "we do not raise anyone's price" is unsupportable — #539 published ₹4,999/board year ~24h earlier and founding is ₹5,999, a ₹1,000 rise. Owner ruled: **fix the SENTENCE, not the price.** The public claim is now scoped to an active subscription and a guard fails on eight overbroad phrasings. And `FOUNDING_REGULAR_PRICE_COPY` was **exported but never consumed by any surface** — a Standing-Rule-1 silent no-op, removed.

### A2 · #547 — `fix(ci)`: the grader's FORBIDDEN entry could never match
Both C&I acceptance gates listed the grader as `server/routes/checkSolution.cjs` — **without** the `lazytopper/` prefix every sibling entry carries. The check is `changed.includes(f)` (exact array membership) and `git diff --name-only` emits repo-root-relative paths, so the real path **could never match**.

**★★ PROVEN BY CONTROL CASE, NOT ARGUED — now the standard for any claim that a guard is inert.** A commit that really did append a line to the grader was run against both gates at trunk:
```
git diff --name-only origin/base/approved-thru-437...HEAD
-> lazytopper/server/routes/checkSolution.cjs

ok  FORBIDDEN: server/routes/checkSolution.cjs shows zero changes (...)
Check & Improve convergence acceptance PASSED — 91/91 checks green.
ok  FORBIDDEN: server/routes/checkSolution.cjs shows zero changes (...)
Tutor ⇄ C&I overlay acceptance PASSED — 31/31 checks green.
```
The grader was modified and both gates printed **"ok" against the file that had just changed**. The gate did not merely fail to notice — it *asserted the file was untouched*. The same probe against the fixed gates now fails both.

**★★ `FORBIDDEN(wired)` PROVES MEMBERSHIP, NOT MATCHABILITY.** Proving an entry is IN the list cannot notice that the entry can never MATCH anything — and that gap is exactly where this bug lived. A new `FORBIDDEN(path)` loop asserts, unconditionally and once per entry, that the entry resolves to a real repo-relative file. It is **filesystem-only** (no subprocess, no git base) so it can never skip the way the diff loop does — which matters, because the failure it guards *is* a silent-skip failure. Counts 91→99 and 31→36.

### A3 · #549 — `feat(server)`: serve the token telemetry + report the anon-key shape
**`telemetry.snapshot()` and `getTokenTelemetry()` had NO CALLER ANYWHERE IN THE REPO.** #540 measured into a void from the day it merged, so every thinking-budget decision and the subscription price were modelled from estimates while the real figures sat in memory on Railway. `[FU-TELEMETRY-NO-READ-PATH]` **CLOSED.**

- `GET /api/admin/token-telemetry` — `ADMIN_FIREBASE_UIDS` Bearer identity, fail-closed, read-only: computes nothing, stores nothing, changes no limit.
- **It reports the rate-limit counters too, including `anonKey`.** Without that the A3b diagnostic would itself measure into a void — the exact failure this endpoint exists to fix. **A diagnostic with no reader is not a diagnostic.**
- **It states its own window** (`windowNote` + `uptimeSeconds`): counters are process-lifetime and reset on a Railway restart, so a reader diffing two pulls across a restart would otherwise read a drop as a decline in usage.
- **The anon-key shape emit lives INSIDE `rateLimiter.check()`, not `index.cjs`** — owner adopted this over his own spec. In `index.cjs` it would have to re-derive whether the caller is anonymous and which key was used: a **MIRROR** of `resolveCaller`, and a mirror drifts from the thing it mirrors while still looking right. Inside `check()` it sits two lines after `const caller = resolveCaller(req)` and reads the very object the bucket is keyed from. A test pins the emitted shape against the id `resolveCaller` actually builds.
- **★★ A REAL BUG CAUGHT BY THE PR'S OWN TEST.** The first version reused the Gemini call-class list for the rate-limiter aggregation. The limiter has a **different vocabulary**: no `unclassified`, plus `anonymous` and `global`, which are buckets rather than call kinds. The effect: **`rate_limit.hard_block.anonymous` was silently dropped** — the signed-out lockout counter, i.e. *precisely the number the anon-key diagnostic exists to surface*. The read-out would have looked complete while omitting the thing the feature is about. Fixed with two separate closed sets, a regression test, and two **anti-drift tests asserting each list against the module that DEFINES the vocabulary** — because a hardcoded list is a derived value, and a derived value nothing re-checks outlives the facts it came from.
- **The content firewall is preserved on the way OUT.** The payload is not built by walking the counter map; it asks for each (closed-set metric × closed-set class) pair, so no snapshot key is ever copied out. `byModel`, the one dynamic-label surface, is filtered through `/^[a-z0-9._-]{1,64}$/`. Only the ring's SIZE is reported. Tests poison the snapshot with student-shaped text in a counter key, a model label and a top-level key, and assert none reaches the response.
- Renamed `ADVERTISED_*` → `OFFERED_*` (the sub-cap and its sibling): nothing is advertised — `PricingPage` rules quota wording out of the plan table.
- 24/24 and 27/27, `# skipped 0`. **Seven mutations verified RED.**

### B2 · #550 — `feat(auth)`: collect the student's name on sign-up
The name is **REQUIRED** on the email/password path. Deciding argument was the **one-way door**: an optional field closes the defect only for students who fill it in and permanently re-creates it for everyone who skips — the same bug with a smaller blast radius, unfixable afterwards without re-asking. Google sign-in supplies `displayName` itself and is unchanged.

### B3 · #551 — `feat(auth)`: phone sign-up reachable, plus two identity defects
Phone OTP was already LIVE in `Login` but **unreachable from `/sign-up`** — technically met, practically broken.

**★★ A FIX THAT CANNOT BE SHOWN TO CHANGE BEHAVIOUR IS NOT A FIX.** The brief prescribed "use a distinct container id for the sign-up reCAPTCHA". **That would have done nothing.** `initPhoneRecaptcha` early-returned on `if (recaptchaVerifierRef.current)` and **ignored the container-id argument entirely**, so a second page passing a different id changed nothing at all. Mutation proof, reverting to the old early-return with `lt-signup-recaptcha` requested:
```
x REBUILDS when a different container is requested (the /login -> /sign-up walk)
  -> expected [ 'lt-login-recaptcha' ]
     to deeply equal [ 'lt-login-recaptcha', 'lt-signup-recaptcha' ]
x REBUILDS when the same container id was remounted (stale element)
  -> expected [ 'lt-signup-recaptcha' ]
     to deeply equal [ 'lt-signup-recaptcha', 'lt-signup-recaptcha' ]
```
The REAL mechanism: `resetPhone` runs only on verify-success, logout and provider unmount — **never on navigation** — so walking `/login` → `/sign-up` leaves a live verifier bound to a container that has since unmounted. Reuse is now conditional on the container being BOTH the one requested AND still attached.

Also closed `[FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD]` **without adding a context key** — see hazard 2 in §HAZARD MAP below.

### B4 · #552 — `fix(rate-limit)`: identify the caller on every paid endpoint · ★ LAUNCH BLOCKER
**THE CLIENT NEVER SENT `X-Lazytopper-Uid`.** Zero occurrences in `lazytopper/src`, confirmed two ways: grep, and a HAR capture of a real production `/api/detect-question` call carrying neither `Authorization` nor the uid header.

`resolveCaller` reads that header; absent, it falls to `ip:<addr>` and sets `anonymous: true`. **The anonymous hard cap is 3 PER DAY.** So **every signed-in student was rate-limited as a stranger**, sharing one 3/day bucket with everyone behind the same IP — a household, a school, any NAT. Live since #537 merged, undetected only because nobody is using the product yet.

**★★ IT DEFEATED FOUR PRs OF RATE LIMITING THAT WERE EACH INDIVIDUALLY GREEN — the gap was BETWEEN two correct halves, which no unit gate can see.** Found by a HAR capture, not by a gate.

**★★ AND IT WAS A RECURRENCE.** `[FU-XUSERID-PROXY-STRIP]` logged this exact class in July, it was fixed **in `dbSyncService` only**, and closed. **DOCTRINE: an FU about a cross-cutting concern is not closed until every call site is checked. "Fixed where it was found" is not fixed.**

Identity is centralised in one helper — `paidCallHeaders` / `paidJsonHeaders` in `lazytopper/src/ai/paidCallHeaders.ts` — **not** the single choke point in `aiClient.ts` the spec named, because paid calls originate from six files: `aiClient`, `tutorClient` (**the live tutor**, which the spec would have missed entirely), `VisualExplainer`, `QuestionVisualAid`, and both `/admin` diagram pages. A coverage guard now enforces this from `PAID_ENDPOINTS` on disk.

**★ Second consumer, NOT independently verified:** `sessionHandlers.cjs` also reads `x-lazytopper-uid`, so #552 changes **session attribution** as well as rate-limit classification. Probably an improvement — and "probably" is why it belongs in the live-verify plan rather than being discovered afterwards.

---

## #542 — OWNER-SUPPLIED RECORD (not agent-verified)
Lane G ran out of context mid-lane and no longer exists, so no agent was left to write this up. The owner byte-reviewed #542 himself and supplied the following. **Recorded as owner-supplied rather than agent-verified, deliberately.**

**#542 (PR-G2a) — in-component entitlement gating + the client half of the limiter.**
**WHY:** `/check-improve` was a bare `<Route>` and its component read only `useAuth`, so a **signed-out visitor could trigger Gemini vision grading** — the most expensive call the product makes — while #539 had just published a pricing page listing Check & Improve as excluded from Free and sold in Premium. The product contradicted its own published packaging. Separately, #537's limiter was live with **no client handling**, so a capped student saw a generic failure.
**WHAT:** `RequirePremium` applied **IN-COMPONENT, never route-level**, because `App.tsx` is frozen zero-diff by the overlay gates. C&I uses an inner/outer split forwarding the overlay prop, satisfying the overlay gate's GUARD 5, GUARD 6 and HOST assertions — **a naive wrap would have typechecked and left the tutor's C&I overlay impossible to close.** Same split on `WorksheetGenerator`. Both diagram pages got **regression pins only**: they already carried `RequireAuth` in-component, so editing would have been a no-op dressed as a fix. 429 handling landed as a typed `DailyLimitError` carrying `limitClass` and `resetAt`.
**COST:** it broke a suite that renders `WorksheetGenerator` signed out — that is `[FU-GATE-BLAST-RADIUS]`, closed by #545's guard. Half a day.

---

## HAZARD MAP — for whoever touches `AuthContext` next (Lane F needs this)
1. **TWENTY test files mock `AuthContext`.** A `useAuth` member absent from a mock reads `undefined` at the call site and the component **THROWS** — in a file that never mentions the feature. Both `SignUpPage` mocks were updated in B3; **grep before adding any member.**
2. **★ `AuthContext.passwordReset.test.tsx` asserts the context key set by EXACT EQUALITY** (`Object.keys(ctx).sort()` vs `PRE_EXISTING_KEYS + sendPasswordReset`). **It fails on ADDITION, not omission — the INVERSE of hazard 1.** Adding any context key turns red a file you did not touch. B3 fixed two defects using existing state and existing imports precisely to avoid this, and `AuthContext.signupIdentity.test.tsx` now asserts the ABSENT keys so the constraint is visible from the file most likely to violate it.
3. **THREE files mount the REAL `AuthProvider` with `firebase/auth` mocked** (`AuthContext.autotrial`, `AuthContext.passwordReset`, `Login.forgotPassword`). A NEW `firebase/auth` export used in `AuthContext` must be added to all three mocks.
4. **The gate blast radius:** wrapping a default export in `RequirePremium`/`RequireAuth` makes signed-out tests loop synchronously and die at the heap ceiling with **no assertion and no file name**. `entitlementGating.test.ts` catches it in ~30ms and **NAMES** the offender — stub the gate in the file it names; do **not** sign the user in (several tests deliberately assert signed-out behaviour).

---

## VALIDATION (all seven PRs)
Every run verified by reading the log, not the tick. Representative, #549's run `30263570364`:
```
> node --test server/routes/adminTelemetry.test.cjs
# tests 24  # suites 0  # pass 24  # fail 0  # cancelled 0  # skipped 0  # todo 0
rateLimiter   # tests 27  # pass 27  # fail 0  # skipped 0
geminiClient  # tests 23  # pass 23  # fail 0  # skipped 0
Root guard matrix  # tests 190  # pass 190  # fail 0  # skipped 0
Check & Improve convergence acceptance PASSED — 99/99 checks green.
Tutor ⇄ C&I overlay acceptance PASSED — 36/36 checks green.
Vitest  Test Files 82 passed (82) / Tests 952 passed (952)
```
By #552 the vitest total had grown to 83 files / 960 tests. **Zero skips in any run of the wave.**

**★ The root guard matrix is 190 checks across SIX suites** — not the "5 suites, 175/175" written in `.github/workflows/quality-gate.yml:78`, nor the "5-suite guard matrix" in `CLAUDE.md:130`. Both literals are stale; §6a itself already says the count grows and must be verified, which is precisely why the written number rotted. **CLAUDE.md is corrected in this PR.** The workflow comment is a CONFIG file, deliberately left out of a docs-only PR — logged as `[FU-CI-COMMENT-STALE-MATRIX-COUNT]`.

## ⚠ LIVE-VERIFY OWED — the owner's, and no gate can substitute
1. **A1** — a full graded-question round-trip on the Vercel preview **AND** `lazytopper.com` **AND** `lazytopper.in`, plus confirming `CORS_ALLOWED_ORIGINS` literally holds all five origins. A missing value loses response bodies on that domain while the server still returns 200.
2. **A3 + B4 together** — `curl -H "Authorization: Bearer <admin-id-token>" https://lazytopper.com/api/admin/token-telemetry`. Confirm `rateLimit.byClass` shows the call under its **real** class and `anonKey.client` does **not** increment for a signed-in user. **One reading verifies both PRs.**
3. **B3** — one real phone sign-up from `/sign-up`, and a `/login` phone attempt in the SAME session, to confirm no reCAPTCHA throw across the navigation.
4. **B2/B3** — a real email sign-up: the typed name must appear in the shell IMMEDIATELY, with no page reload.

---

## (superseded) [CURRENT] #538–#540 merged — ★★ LANE H: THE LAST LAUNCH BLOCKER CLOSED (PASSWORD RESET) · ₹599/₹4,999 PUBLISHED FROM ONE CONSTANT · GEMINI TOKENS NOW MEASURED, NOT ESTIMATED — trunk `1013daa7`

**Three product PRs, three sections, file-disjoint, built in parallel and merged in sequence.** Trunk moved `484f5e3c` (#536 docs) → `67b45108` (#537, Lane G) → **`694c81b3` (#538)** → **`ff5cb527` (#539)** → **`1013daa7` (#540)**. **Zero open PRs.** #538 owner **LIVE-VERIFIED end to end**.

All three ran as draft PRs, never self-marked ready, never self-merged. Every squash subject was checked for a leading `@` before merge — `[FU-COMMIT-SUBJECT-AT]` held on all three.

### H-3 · #538 — `feat(auth)`: forgot-password recovery, enumeration-safe
**This closed the last code-side launch blocker.** At trunk, `sendPasswordReset` / `resetPassword` / `forgot.?password` returned **zero hits** across `lazytopper/src` and `lazytopper/server`. A student who forgot their password was permanently locked out; the only recovery was a new account, which discards their progress and Mistake Intelligence evidence.

`AuthContext` gains `sendPasswordReset(email)` — a thin wrapper over Firebase `sendPasswordResetEmail`, **purely additive (the diff has zero `-` lines)**. `Login` gains an inline reset state in the email pane — **not a route**, so `App.tsx` stays byte-identical.

**★★ THE ENUMERATION DEFENCE IS AN ALLOWLIST, AND THAT IS THE WHOLE POINT — record the reasoning, not just the outcome.** The spec called for special-casing `auth/user-not-found`. The agent built the inverse and the owner endorsed it over his own spec. `RESET_SURFACEABLE_ERRORS` contains **only request-shaped failures** (`invalid-email`, `missing-email`, `too-many-requests`, `network-request-failed`) — each a property of the typed string or the connection, identical for a registered and an unregistered address. **Everything else falls through to one neutral notice**: `user-not-found`, `user-disabled`, the `invalid-credential` Firebase returns when its own enumeration protection is on, **and any code Firebase adds in future**.

**It fails SAFE by construction.** A denylist protects only the cases someone thought of; an unrecognised future error code would have leaked through it. Under the allowlist an unknown code defaults to neutral. These are minors' accounts and the login page must not become a tool for checking which children have one. **This is now the reference implementation for the repo** — see `[FU-SIGNIN-DISABLED-ACCOUNT-ENUMERATION]`, which is the same class of leak on the sign-in path.

The load-bearing test asserts **byte identity** (`toBe` on `textContent`), not `contains`. Mutation — branch the copy on `user-not-found` → red. Phone-only students have no password, so the entry point renders in the email pane only and switching tabs clears any open reset state; a mutation leaking the link into the phone pane also goes red.

**Known tradeoff, deliberate:** the fail-safe fallback also swallows a non-Firebase failure (e.g. "Firebase Auth is not configured"), so a genuine outage renders "we've sent a reset link". That failure is email-independent so it leaks nothing, and privacy beats infra detail — but it sits in tension with the honest-empty-states doctrine and is recorded rather than hidden.

**Owner live-verified:** the reset email arrives, the link works, the new password signs in, an unregistered address returns the identical notice, and the phone pane carries no reset link. Two findings came out of that verification: `[FU-AUTH-EMAIL-BRAND-MISSPELLED]` (resolved in part) and `[FU-AUTH-CUSTOM-EMAIL-DOMAIN]` (deferred, two DNS blockers).

### H-2 · #539 — `feat(pricing)`: publish ₹599/month and ₹4,999/board year, from ONE constant
Owner-final prices published: **₹599/month** and **₹4,999/board year** as the hero, sub-line "save ₹2,189". Replaces the retired ₹2,999/year block and its stale ~₹250/month sub-line.

`PREMIUM_FEATURES` keeps **"Everything in Basic" first** — it tells a parent the free tier is not being taken away — with five differentiators below it. **The original spec said five entries and trunk had six; the agent flagged the discrepancy rather than silently dropping one, and the owner ruled his five were the ADDITIONS below the first.** `FREE_FEATURES` keeps Check & Improve at `included: false` (the packaging Lane G's gating restores); the manual-activation copy stays, honest until a payment rail exists.

**★★ THE REAL FINDING WAS THAT THE PRICE EXISTED IN FOUR OTHER PLACES, TWO OF THEM LIVE.** Publishing ₹599 on `/pricing` alone would have told a student ₹599 on the pricing page and **₹149 at the exact moment of upgrade intent**:

| surface | was | live? |
|---|---|---|
| `PracticeLimitGate.tsx:90` | ₹149/month | **yes** — wraps `/practice` (`App.tsx:1012`) |
| `MockViewGate.tsx:189` | ₹149/month | **yes** — wraps `/mock-paper`, `/chapter-test`, `/full-mock` |
| `Home.tsx:506` | ₹149 block (+ ₹349/3mo, ₹999/yr) | unrouted |
| `Home.tsx:242` | **JSON-LD `Offer` `price: "149"`** | unrouted |
| `Home.tsx:11` | ₹149 in the meta description | unrouted |

So the fix was **the cause, not the instances**: `src/config/pricing.ts` is now the single source of truth, the saving is **derived** (`599×12−4999`) rather than hardcoded, and all surfaces read it. `[FU-PRICE-LITERALS-FIVE-FOUND]` records the count that justifies the guard existing.

**★★ THE GUARD'S HARD CASE HAS NO RUPEE SIGN.** The instruction was "no rupee price literal in `src/`" — but the most dangerous surface was `price: "149"` inside JSON-LD, a bare numeric string, and a guard matching `/₹\d/` sails straight past the one value Google indexes and displays. `pricing.guard.test.ts` therefore tests **two independent patterns** — Shape A `/₹\s*\d/` and Shape B `/"?\bprice"?\s*:\s*["']?\d/` — each mutation-verified **separately**. The agent proved the point rather than asserting it: before showing Shape B fire, it confirmed the mutated line contained **zero** rupee signs, so a rupee-only guard would demonstrably have missed it. The guard walks all of `src/` (asserted >200 files, five named files reached by path) rather than a hand-listed set — a fixed list cannot catch the fifth surface, which is the entire purpose.

**JSON-LD now publishes BOTH offers** as an array (Monthly ₹599 `MON`/1, Board Year ₹4999 `MON`/12), both from the constant — the schema is exempt from nothing, because it is the file most likely to drift silently. The ₹2,189 saving is **deliberately absent from structured data**: schema.org has no field for it and invented properties are ignored or flagged. Schema states facts; the page makes the argument. A cross-surface test asserts the rendered block and the JSON-LD agree **with each other** and with the constant, mutation-verified by breaking exactly one side.

Removed from `Home.tsx` as not in the packaging: the ₹349 "Board Season Pack" and ₹999 "Annual" tiers. "less than ₹3/day" went with them (derived from ₹999; would be ~₹13.7/day at ₹4,999) and was **not** replaced with an invented figure. "less than one tuition session" was **kept** per owner ruling — still true at ₹599. The Free tier's `price: "0"` Offer was kept; removing it would have contradicted the visible ₹0 tier.

### H-1 · #540 — `feat(server)`: measure Gemini token usage per call class
Converts the cost model from estimate to measurement. After each `callGemini`, emits `promptTokenCount`, `candidatesTokenCount`, **`thoughtsTokenCount`** (thinking bills at OUTPUT rates), `totalTokenCount`, model, call class, latency and a retry flag. Counter keys are `gemini_tokens.<metric>.<class>`, parallel to #537's `rate_limit.<metric>.<class>`, so the two datasets pivot on the shared class segment. Purely additive; a telemetry failure can never fail a Gemini call.

**★★ CALL CLASS MUST RESOLVE PER HANDLER FUNCTION, NOT PER SOURCE FILE — and getting this wrong would have corrupted the number the lane exists to produce.** #537 as merged reclassified `/api/detect-question` from `vision` to `practice` (`rateLimiter.cjs:83`), a billing-bucket decision. But `routes/checkSolution.cjs` holds **three endpoints across two classes**:

| call site | handler | class |
|---|---|---|
| `:311` | `handleCheckSolution` | vision |
| `:585` | `handleDetectQuestion` | **practice** |
| `:1006` | `gradeStructuredSet` | vision |

A file-level map would have billed every detect call to `vision`, **inflating cost-per-vision-call and deflating cost-per-practice-call** — invisibly, and then feeding those numbers into a pricing decision. `generateModelSolution` / `getOrCreateModelSolution` are deliberately unmapped (three callers across two classes) so the scan walks past them to the owning handler. Both lanes independently converged on this: G1's suite on trunk now carries `# Subtest: detect-question is billed as practice, not vision`.

**★★ AND THE CROSS-LANE GUARD WAS A TAUTOLOGY BEFORE IT WAS HARDENED.** Comparing label **vocabularies** stays green straight through that exact defect, because the set `{vision, tutor, practice, visual}` never changes. It now asserts agreement **endpoint by endpoint** against `PAID_ENDPOINTS` and fails if a paid endpoint exists the gateway cannot classify.

**No prompt or response content can reach a logged field.** The emit site passes only `data.usageMetadata`, with `finalContents`/`parts`/`text`/`rawText` in scope and deliberately not passed. The builder reads an **explicit named allowlist** — no spread, no `Object.assign`, no key iteration — so a field Google adds tomorrow cannot appear; `model`, the one free-text field, is clamped to `[a-z0-9._-]{,64}`. The test serialises **everything logged** (counter events *and* ring records) and searches for three sentinels, then asserts the record's key set is frozen. **One mutation survived and was reported rather than hidden**: passing `contents:` into the builder alone changes nothing, because the allowlist ignores it — an equivalent mutation, not a coverage gap.

**`package.json` was the collision the spec's disjointness table missed.** H-1 needed a third file: `vitest.config.ts` includes only `src/**/*.test.{ts,tsx}`, so a `.cjs` server test is **not collected by vitest** and must be wired as `node --test` or it is a dead file no gate runs. #537 appended to the same `test:matrix:all` line. Resolved append-only, both preserved, **verified by grep rather than by eye** — and confirmed on trunk after the squash: both names appear twice each, defined and in the chain.

### ★★ ARCHITECTURE NOTE — RAILWAY RUNS ONE SERVICE. This is recorded NOWHERE ELSE in the repo.
Contributed by Lane G and carried here because it has no other home. Every future server lane needs it, and nobody would rediscover it cheaply.

`Dockerfile` CMD:47 and `railway.json:8` start **`artifacts/api-server/dist/index.mjs`**, which **SPAWNS `lazytopper/server` as a child process** (`artifacts/api-server/src/index.ts:44`) and **PROXIES `/api/*` to it on `127.0.0.1`** (`artifacts/api-server/src/app.ts:45-57`). `vercel.json` rewrites both `/api/*` and `/shared-api/*` to the same Railway host. **There is one Railway service, not two** — the thing that looks like a standalone gateway is a child of the api-server.

`STRIPPED_PROXY_HEADERS` (`app.ts:39-43`) drops `x-internal-auth`, `x-internal-admin` and `x-user-id` — **but NOT `x-lazytopper-uid`**, which is why #537's rate limiter keeps its caller identity across the proxy hop. Verified 2026-07-26. Anything that later adds a header to that strip list can silently break per-uid limiting.

**Two CORS layers, disagreeing by design** once the `app.ts` allowlist lands:
- **OUTER** — api-server `app.ts:29`, today a bare `app.use(cors())`. The browser-facing front door for both `/shared-api` (`:33`) and the `/api` proxy (`:45`). See `[FU-API-CORS-WIDE-OPEN]`.
- **INNER** — the gateway's `config.CORS_ORIGIN`, a **single string** (`serverConfig.cjs:59`, default `http://localhost:25246`), emitted as one ACAO value (`httpUtils.cjs:5,13`). It sits behind the proxy on `127.0.0.1` and is **not reachable from a browser at all**. See `[FU-GATEWAY-CORS-ORIGIN-STALE]`.

The consequence worth holding onto: because production reaches the gateway through Vercel's **server-side** rewrite, legitimate traffic can arrive with **no `Origin` header**. Any allowlist that rejects missing-Origin requests kills every API call in production while passing every gate.

### ★ Verification standard used throughout
Every gate result below is quoted from the **CI log**, not inferred from a green tick — a suite that is present, wired and **skipped** reports green, and this repo has shipped exactly that. Both `node --test` server suites on the #540 run show `# pass N  # fail 0  # skipped 0  # todo 0`, and each CI run's `headSha` was matched against the PR's `headRefOid` before its log was trusted.

**CI covers more than `CLAUDE.md` §6a documents** — the workflow also runs `typecheck:test` and a full `Vitest suites` step. See `[FU-CI-DOC-UNDERSTATES-GATES]`; §6a is now load-bearing because the local/CI test split depends on knowing what CI covers.

## (superseded) [CURRENT] #531–#535 merged — ★★ LAUNCH-BLOCKER WAVE + DEAD-PAGE SWEEP: SIGN-UP REDIRECT GUARDED · LEGAL REACHABLE · EVIDENCE CAPTION DE-NUMBERED · 12 DEAD PAGES DELETED · TRIAL AUTO-START KILLED (BOTH WRITE SITES) + REAL TRIAL CTA — trunk `7185c5f`

**Five product PRs, five sections. All merged; #535 owner LIVE-VERIFIED on production.** Trunk moved `7998ee4a` (#528) → `4e3fbf6` (#531) → `39ae276` (#532) → `82b434d` (#533) → `add19d4` (#534) → **`7185c5f` (#535)**. **Zero open PRs; zero in-flight lane branches.**

**★ DOCS DEBT REPAID.** `CURRENT_STATE.md` had been stale since `7998ee4a` (#528) — **five product PRs merged with no handoff update.** A one-commit lag is expected on this squash-merge repo; a five-PR lag is not. This one docs PR closes all five at once.

### PR-1 · #531 — `fix(auth)`: guard `/sign-up` post-auth redirect · `[FU-SIGNUP-UNSAFE-REDIRECT]`
`SignUpPage` resolved `location.state.from` with **no** guard, unlike `Login.tsx`. Extracted `isSafeInternalPath` **verbatim** into `lib/safeInternalPath.ts` and applied it. **Severity honest: defence-in-depth, NOT a live exploit** — `SignUpPage` reads no `?redirect` query param, so the only input is router `location.state` (not URL-controllable). Three `isSafeInternalPath` copies remain (`Login`/`HighlyProbableQuestions`/`BackToParent`) → `[FU-SAFEPATH-DUPLICATION]`. A **call-site** test proves the wiring (revert `SignUpPage.tsx:57` → red), not just the util — the PR-1 lesson that seeded the whole wave.

### Lane C · #532 — `fix(legal)`: policies reachable · `[FU-LEGAL-FOOTER-LINK]`
*(Parallel lane, not built by this agent.)* Legal pages made reachable from the shell/menus. Finding recorded: `pages/Home.tsx` carried a legal footer but is **dead code** (never imported) → `[FU-HOME-TSX-DEAD-FILE]` (largely realised by Lane E, below).

### PR-2 · #533 — evidence-base caption de-numbered · `[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`
`Welcome.tsx:1867` `"Last 5 years pattern"` → **`"Board paper pattern"`** (text-only; style object byte-identical). The caption sits above a **decorative** 5-row grid (`years` hardcoded 2024–2020; dot colours from index arithmetic — no real weightage), so "ten years" would have put **10 over a visible 5-row grid**. Owner ruled: **drop the number entirely.** HPQ `HighlyProbableQuestions.tsx:950` ("4 years") **deliberately left** — the HPQ path does **no scoring and no year-filtering** (static authored array; `pastBoardYear` is a dead field), so "4 years" is uncorroborated provenance copy, not a computed claim → `[FU-HPQ-EVIDENCE-YEARS-UNVERIFIED]`.

### Lane E · #534 — `chore(dead-pages)`: 12 unrouted page files deleted
*(Parallel lane, not built by this agent.)* 12 dead page files deleted; the 8 unrouted pages that are `readFileSync` content-fixtures for `scripts/ops/**` gates were **spared** (a page can be dead to users and load-bearing for CI at once).

### PR-3 · #535 — `fix(subscription)`: stop auto-starting trials; add trial CTA · `[FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]` + `[FU-TRIAL-HAS-NO-ACTIVATION-PATH]`
**★★ THE BUG HAD TWO WRITE SITES; the original spec named only one.** (1) `useSubscription.ts` hydration `.then()` and (2) `AuthContext.tsx:233` — the latter **unconditional**, firing on *every login for every user*, and **outside the original scope**. Removing the hook write alone would have fixed nothing a student experienced. Both are now pure reads (`hydrateSubscriptionFromCloud` already returns the right status for premium/active/expired, and a free `defaultStatus()` for a fresh user). With both gone, `startTrial` had **zero call sites** — no student could receive a trial — so the real CTA was wired into `RequirePremium`: never-trialled → "Start my free 7-day trial" → `startTrial()`; **expired → plans path only** (no CTA, else infinite trial reset); active/premium never reach it. **Owner LIVE-VERIFIED all paths on production** (Firestore `subscriptions/{uid}` written exactly once; survives hard-refresh and logout→login). Copy frozen: "then free Basic, upgrade anytime."

**★★ The wave surfaced a cost-exposure tier that now outranks the (empty) code-side launch-blocker tier** — see `OPEN_QUESTIONS_AND_FOLLOWUPS.md`: `[FU-CHECKIMPROVE-UNGATED]`, `[FU-NO-SERVER-ENTITLEMENT]`, `[FU-NO-RATE-LIMIT-AI-ENDPOINTS]`, `[FU-SUBSCRIPTION-CLIENT-WRITABLE]`, `[FU-DOCTRINE-DRIFT-CLAUDE-MD]`, `[FU-WORKSHEET-UNGATED]`, `[FU-SIGNUP-NO-NAME]`, `[FU-COMMIT-SUBJECT-AT]`.

## (superseded) [CURRENT] #528 merged — ★★ PR-B2: THE RAIL TUTOR ENTRY, AND A Z-INDEX CEILING THAT WAS 50 AND NOT 9998 — trunk `7998ee4a`

**The Home spec is now COMPLETE end-to-end.** PR-B was its last unbuilt half; this is it. Owner byte-reviewed **and LIVE-VERIFIED**. Draft PR throughout, never self-marked ready, never self-merged. 2 files, **+428 / −24**. CI `quality-gate` PASS (3m18s), `lane-overlap` PASS.

Trunk moved `2865432` → `61a7030` (#525) → `fe91262` (#526) → `c1bc682` (#527, all three docs/skill) → **`7998ee4a` (#528)**.

### What shipped
**(a) A Tutor entry at rank 2 of the DesktopShell rail** — under Home, above Exam Trends. It **opens the shared `TutorPickerModal`; it does not navigate.** No new route, param or capability: the picker composes the URL via `composeTutorEntry`, so `RequirePremium featureLabel="Ask the tutor"` is reached exactly as from Home. `isSignedIn` arrives as a **prop** from the shell's existing `user` — `homeDestinations` still never calls `useAuth()`, which is the whole reason the shell can mount it.

**(b) The header stacking fix** — `position: relative; zIndex: 35` on `DesktopShell`'s header. `[FU-HUB-DROPDOWN-ZINDEX]` **RESOLVED**.

### ★★ THE CEILING IS 50, NOT 9998 — AND THE FIX THIS FU HAD RECORDED AS "KNOWN, BYTE-REVIEWED" WAS WRONG
The brief said *"derive the value from the live full-screen-overlay landscape"* (9998–10000). **That derivation points at ~1100, and 1100 punches the header straight through `.command-palette-backdrop`** — `styles.css:6494`, `z-index: 50`, mounted at `App.tsx:821` as a **sibling of the shell**. That is the palette **the header's own search box opens**, so it is a live interaction, not a theoretical one.

**The previously recorded fix in this FU was `zIndex: 55`, and 55 > 50 — it would have shipped the same regression.** Its stated bounds are both dead: the floor (*">50, TrendsPage's filter dropdown"*) is **retired code** (`App.tsx:936` — `/trends` was severed, superseded by `/exam-trends`), and the ceiling (*"<60, `TutorDrawerV2` / `MentorSolveDrawer`"*) was **void from #516**, which deleted both. Two dead bounds that happened to bracket a number.

The real, re-derived bounds:

| Bound | Value | Owner |
|---|---|---|
| **FLOOR > 30** | 30 | `Worksheets.tsx:484` — the highest z-index used by page **content** anywhere in the app; every other content value is ≤ 20. Clearing them all also clears the `z-index: auto` positioned cards that are the actual reported bug. |
| **CEIL < 50** | 50 | `.command-palette-backdrop` (`styles.css:6494`). Staying under 50 also keeps the header under `.lt-tutor-ov` (60) and the 9998–10000 band. |

**Band 31–49 is empty**: the only value there is `.examples-modal-backdrop` (`styles.css:3657`), **dead CSS with zero consumers in `src/`**. Hence **35** — a value that is both correct *and provable*, which "somewhere below 9998" never was. **A mutation test pinned at 1100 exists specifically to catch that regression** and is named as such in the suite.

### ★★ MOBILE AND DESKTOP NEEDED DIFFERENT *SHAPES* OF FIX — state both invariants, never "we fixed the z-index"
- **Mobile's invariant: "no trap ancestor."** `MobileHome`'s brand bar carries no `backdrop-filter`, so `MobileAccountMenu`'s `zIndex: 50` competes in the ROOT stacking context and wins. Pinned by PR-A2's ancestor-walk test (`MobileHome.test.tsx:483`, `TRAPS = [backdropFilter, webkitBackdropFilter, filter, transform, perspective]`).
- **Desktop's invariant: "the trap must OUTRANK page content."** It **cannot** be mobile's, because the header's blur is *intended visual design* and cannot be removed. So the header keeps its stacking context and is given a z-index that beats `<main>`.

Same symptom, opposite remedies. Flattened into "we fixed the z-index", this will confuse whoever meets the next instance.

### ★★ THE PICKER MOUNTS AT THE SHELL ROOT — the non-obvious consequence of the fix
`TutorPickerModal` is mounted as a sibling of `<aside>` and the main column, **deliberately not inside `<header>`**. Mounted inside the header it would have been **trapped under the header's new 35** (`.lt-tutor-ov` is `z-index: 60`, but resolved *inside* the header's context) — **fixing the stacking bug while shipping a fresh instance of it.** The header is also a **containing block for `position: fixed` descendants** (via `backdrop-filter`), so the overlay would additionally have lost its `inset: 0` full-viewport geometry. Pinned by a test asserting `picker.closest("header") === null`.

### The design calls, and why
- **A discriminated union on `NavItem`, narrowed by `"action" in n`** — not a sibling button. `NAV_ITEMS` renders as `<NavLink key={n.to} to={...}>`, keyed *and* routed by `n.to`, so a destination-less entry cannot be a row in that map. Rank 2 requires **positional interleaving**, and a sibling can only reach rank 2 via a hard-coded split index that silently moves Tutor the moment anyone reorders the list. Keying on a field that already distinguishes the kinds left **the five existing entries byte-unchanged**.
- **A placeholder `to` was deliberately NOT used** — it ships a real anchor a student can middle-click into a dead route. Pinned by a mutation-tested assertion.
- **Icon: Lucide `MessageCircleQuestion`** (reads as *ask a question*; `MessagesSquare` reads as inbox).
- **Active only while the picker is open** — `/tutor` is **not** a `DesktopShell` route, so the rail never renders there and there is no landed-on case.
- Shared treatment extracted to `navItemStyle(isActive)`, consumed by both branches, so visual parity is structural rather than copy-paste.

### ★ SPEC CORRECTION — do not let this sentence propagate
The brief said *"the SAME dropdown component (`MobileAccountMenu`) renders on both breakpoints."* **False.** `DesktopShell` has its **own inline dropdown** (`:433-535`); `MobileAccountMenu` is imported only by `MobileShell` and `MobileHome`. They are two *structurally identical* dropdowns (both `position: absolute`, both `zIndex: 50`), so the A/B logic and the fix target were unaffected — **but the sentence is wrong.** Owner confirmed.

### Tests — the other half of the PR-B1 trade
`DesktopShell` had **neither a ban nor a test**. #519 lifted the blanket ban; this PR pays the other half, and is the file the lifted ban's own comment at `check_improve_convergence_acceptance.mjs:482` explicitly promises. **11 tests**, and CI's job log confirms them **by name** (`✓ DesktopShell.test.tsx (11 tests)`) — a green tick is not evidence a suite ran.

Mutation-tested, each red for the right reason, each restored **byte-exact by `git hash-object`**: Tutor as `<a href>` (the anti-regression test *also* caught `/tutor` leaking into the routed-destination list) · header `position`/`zIndex` removed · `zIndex: 1100` · `zIndex: 5` · `zIndex: 30` (the exact boundary).

### ★★ BOTH MIRROR TRAPS, FROM ONE LANE
This lane hit **both halves** of the pre/post-commit gate mirror. Most agents meet only one and generalise wrongly:

```
base...HEAD forbidden gates : VACUOUS pre-commit (trunk vs itself, zero commits)  -> MEANINGFUL post-commit
scope:guard                 : MEANINGFUL pre-commit (reads the working tree)      -> VACUOUS post-commit
                              ("SCOPE_GUARD_OK … lanes=product"  ->  "… no changes")
```

Post-commit the `App.tsx` zero-diff overlay gates pass **for real**, and were re-run and reported as such rather than banked from the vacuous pre-commit pass.

### Verified merged
Content on trunk (`zIndex: 35` at `DesktopShell.tsx:404`, `action: "tutor"`, the `TutorPickerModal` mount, `DesktopShell.test.tsx` present) **and** `merge-base --is-ancestor 7998ee4a` → exit 0. Checked by content first, then by mergeCommit — never by the PR head, which a squash repo guarantees is never an ancestor.

---

## [PREV] #520 + #522 merged — ★★ THE HOME REDESIGN ARC: A DUPLICATED HERO RETIRED, THE TUTOR SURFACED, AND THREE FALSE PREMISES CORRECTED (ONE OF THEM A DOCTRINE) — trunk `2865432`

**ONE combined handoff for the Home lane's two PRs.** Sectioned per PR, never blended: **#520 (PR-A)** the redesign, **#522 (PR-A2)** the fixes that followed it. Both owner byte-reviewed; both CI-green; **#522 owner LIVE-VERIFIED**. Draft PRs throughout, never self-marked ready, never self-merged.

Trunk moved `45ab803` → **`c8dab29` (#520)** → `ee5cd640` (#521, Exam Trends — a different lane) → **`4bde1a3f` (#522)** → `2865432` (#523 docs). This entry speaks ONLY for #520 + #522; #519 and #521 are covered elsewhere.

> ⚠ **#520 was merged before its live-verify, by accident.** #522 was live-verified properly. The two defects #522 fixes (below) are exactly the kind a live-verify catches and a byte-review does not — worth remembering the next time a merge feels routine.

---

# SECTION 1 — #520 (PR-A): the Home redesign + tutor surfacing

5 files, **+1563 / −1059**. `src/lib/desktop/homeDestinations.tsx` · `DesktopHome.tsx` · `MobileHome.tsx` · `MobileHome.test.tsx` · a new `homeDestinations.test.tsx`.

### What shipped
**The Worksheets hero is RETIRED — it was a verified duplicate.** It and the Practice card carried the *identical* destination string `/practice-hub?source=home&returnTo=%2F`; Home shipped a literally duplicated slot. Worksheets stay reachable at the hub and via the quick strip's multi-topic tile (asserted in tests and live).

**Mobile had a duplicate of its own, and the spec was wrong about why.** Spec §1 said `homeDestinations.tsx` was the shared inventory, "not duplicated in two pages". **False for mobile:** `MobileHome` imported only `loginUrl` and hardcoded its titles inline, which is how it grew *"What scores most"* and *"What's likely in 2027"* both resolving to `/exam-trends`. Both Home variants now render the shared `PRIMARY_CARDS`, so they cannot drift again.

**Four cards, journey order:** See what's likely (amber) · Ask your tutor (green) · Practise it (navy) · Check my answer (red).

### ★★ THE §3 LOGIN/RETURN CONTRACT — the one thing that had to be right
`composeTutorEntry()` composes an **existing** url — byte-identical to what Topic Hub's `askTutorHref` builds today. Chapters come from `desktopTopicsBySubject()`, so `topicKey` is always a real `topics.ts` slug, never a display name.

```
signed in  ->  /tutor/10/Science/electricity?source=home&returnTo=%2F
signed out ->  /login?reason=tutor&redirect=%2Ftutor%2F10%2FScience%2Felectricity%3Fsource%3Dhome%26returnTo%3D%252F
```

The signed-out branch lands on `/login` and **never** on `/tutor`, so `RequirePremium featureLabel="Ask the tutor"` is reached exactly as from every other entry point — the pop-card cannot route around the gate. Asserted across **all 26 topics × both subjects**, and verified live in Chromium on both branches.

**Mutation-verified** (a passing test is not evidence until it has been seen fail): dropping the chapter from `?redirect` turns **3 tests red** (both ★); making signed-out return the tutor path directly turns **5 red**, including the dedicated gate test. Both restored and re-verified.

### The pop-card is SHARED and firebase-free BY DESIGN
`TutorPickerModal` + `useTutorPicker` live in `homeDestinations.tsx`. Auth arrives as a **prop** — the module never calls `useAuth` — and its transitive graph (`navigation` → 0 imports, `topics`, `tutorPath` → 0 imports) stays clean, **so PR-B can mount the same picker in `DesktopShell`** for the rail entry. Do not add a data-layer import to that module.

### MI, and a deliberate omission
Navy frame + spine, four fixed buckets in the **verbatim** semantic tones of `MistakeIntelligencePanel.tsx:26-29`. Exactly two CTAs. **No "Ask the tutor about these"** — `MistakeLogEntry` spans many topics while `buildTutorPath` needs exactly one, so there is no single honest destination.

### ★ NO DAYS-TO-BOARDS COUNTDOWN — the prototype showed one; it was not built
The only real source, `fetchCbseExamDate`, is an **async API** whose date may be `"predicted"` rather than `"official"`, and students have an existing `hideCountdown` preference. Rendering it would present a prediction as fact **and** override that choice. Omitted deliberately → `[FU-HOME-BOARD-COUNTDOWN]`. **The owner endorsed this as the right call and recorded that the prototype was wrong to include it.**

### ★ TWO MORE SPEC PREMISES THAT FAILED RE-DERIVATION
- **§5's mobile chrome.** It said to preserve *"MobileShell's existing header … avatar / MobileAccountMenu"*. `/browse` is in `isMobileSelfChromedRoute` (App.tsx:179) — there is **no MobileShell wrapper and no avatar** on this surface. "Preserve, don't rebuild" therefore meant keep MobileHome's own brand bar + App.tsx's `BottomNav`, and add no shell.
- **§5's carousel bleed.** The spec said copy `margin: 0 -16px`. The **rule** is *the negative margin equals the container's padding* — 14px here. Copying the 16 (from `DesktopPracticePage`, a different gutter) would overhang 2px per side: the exact drift class the redesign fixes. **Owner verified the source and confirmed the spec was wrong.**

### Kept, deliberately
The resume/memory strip and "Latest saved worksheet" were **kept** — neither is in the spec's change list, so deleting them would be scope creep. They now partly duplicate the MI card → `[FU-HOME-MEMORY-STRIP-VS-MI]`, owner decides after living with it. *(Same doctrine #521 established independently: silence in a spec is not authorisation to delete rendered content.)*

---

# SECTION 2 — #522 (PR-A2): the sample panel restored, the cards coloured, the avatar added

5 files, **+877 / −258**. `MobileHome.tsx` · `MobileHome.test.tsx` · `DesktopHome.tsx` · `MobileShell.tsx` · a new `MobileAccountMenu.tsx`.

> **One declared process deviation:** the brief asked for three commits. The sections interleave *inside* `MobileHome.tsx` (one hunk carries both the firebase correction and the avatar note; the CSS hunks mix the sample block with the card treatment) and `git add -p` is interactive/unavailable. Shipped as **one commit with a sectioned message** rather than three hand-authored trees no gate had run against. **The owner ruled this correct: a gate-verified tree beats tidy commits with unverified intermediate states, and declaring the deviation beats doing it quietly.**

### ★★ DOCTRINE — §4's "REAL DATA ONLY" FORBIDS FABRICATED STATS, **NOT** A CLEARLY-LABELLED SAMPLE
#520 deleted the signed-out **SAMPLE** Mistake-Intelligence panel from mobile `/browse`, reading spec §4's *"real data only"* as banning any illustrative figure. That is an over-read, and **the spec conflated the two**: the rule forbids presenting invented numbers as **a student's OWN**. A panel explicitly badged a sample is a *demonstration*.

`/browse` is a **conversion surface**, so a signed-out visitor seeing what MI produces is the point. This was a live regression for signed-out mobile visitors, shipped green.

**The owner recorded that this was his spec error, and that he confirmed the removal as "no regression" when it was one.** It was caught only because the removal was flagged prominently in the PR description rather than left to be discovered.

**Restored** from `45ab803` (recovered, not re-invented) and restyled into #520's MI grammar — navy frame + spine, four semantic buckets. **Signed-in is untouched**: it keeps the honest empty state.

★ **The label is what makes a sample honest, so it is now STRUCTURAL rather than textual**: the badge and every sample figure share one block, and the test asserts *containment* — a reader cannot see the figures without seeing the badge, and the qualification cannot drift away from the numbers it qualifies. `Presentation 10%` is the arithmetic remainder (the recovered mix was 45/30/15 = 90); not a new invention.

### ★★ THE FALSE "FIREBASE-FREE" COMMENT — a doc comment treated as a verified fact, by everyone
`MobileHome`'s doc comment claimed the page "stays firebase-free", so real MI would drag firebase into the mobile chunk. Writing the boundary test as a **real import-graph walk** rather than a grep disproved it:

```
MobileHome -> hooks/useSubscription -> subscriptionService -> firebase/firestore
MobileHome -> context/AuthContext   -> mistakeLogService   -> firebase/firestore
```

**firebase — including firestore — and `mistakeLogService` itself were ALREADY on this page's graph**, on trunk, before #520. The comment was **false when written**. The owner independently verified the chains and recorded that he had *repeated the comment back as evidence* when approving the deferral. Only a command against the real graph caught it.

Consequences: the sample's honesty rests on its **label**, not on a bundle boundary — and **`[FU-MOBILE-MI-REAL-DATA]` is RE-SCOPED, its bundle argument VOID**. Comment corrected in-file; the true state **pinned by a characterisation test** so the false claim cannot quietly return.

> **The class: a doc comment is a claim, not a fact.** It is exactly as unverified as a variable name or a grep hit — and it is *more* dangerous, because it reads like documentation. This is the same INFERENCE TRAP the method already names; the new instance is that the false premise survived in a comment for months and was cited by two people as evidence.

### ★★ THE SPINE BUG — a styling regression that shipped GREEN through every gate
The cards read lifeless. The cause was not the palette: **#520 declared the `::before` accent spine but never gave it a `background`**, so `HOME_ACCENTS.spine` was defined and **never consumed** — the accent side had never rendered at all.

> **Record the CLASS, not the incident: a token that is DEFINED but never CONSUMED is invisible to every gate we run.** tsc sees a used export. The linter sees a valid rule. The matrices see no behaviour change. Tests asserted the *value* was present, not that anything *painted* it. Nothing in the stack can distinguish "styled" from "styled with a no-op". **The only instrument that catches it is rendering the surface and measuring the computed style** — which is what the PR-A2 probe now does (`getComputedStyle(card, "::before")`).

**Fixed with the practice-hub "side and edge" treatment** (pattern + values from `DesktopPracticePage`'s `lt-mode-card` / `MODE_ACCENT`): colour lives in the spine and the border, the body is a neutral vertical gradient. Applied to **both** Home variants.

★ **Colour only — geometry byte-identical.** The owner verified this independently as the highest regression risk: `border-radius: 18px` and `padding: 17px` identical either side, with only `var(--lt-line)` added to the border. Live-measured card width **306px @360** and **336px @390**, matching trunk exactly.

### The account avatar on mobile Home — a NEW capability, not a restored one
`/browse` **never had** an account menu (pre-#520 count is 0; trunk's only reference was a comment saying so). The prototype showed one, which is where the expectation came from — **recorded so nobody later "restores" a thing that never existed.**

`MobileAccountMenu` was module-private in `MobileShell`; **extracted** to its own component so a self-chromed route can mount it **without adopting the shell** (wrapping `/browse` would stack two headers). The extracted body is **character-identical** to the original (proven by `diff` against `git show c8dab29:…/MobileShell.tsx | sed -n '41,231p'`); MobileShell now imports it and renders it in the same position — **202 removed / 3 added, just the import**, as the owner verified.

★ **The dropdown is not trapped by a stacking context** (`[FU-HUB-DROPDOWN-ZINDEX]` class): verified live via `elementFromPoint` at 360px and 390px, the menu paints **above** the hero and first card *while genuinely overlapping them* — the probe asserts the overlap first, so the check cannot pass vacuously.

### ★ AND A METHOD NOTE — a live assertion can be wrong-and-plausible
The PR-A2 probe reported "body is a neutral gradient" **FAIL** four times. The CSS was correct; **the assertion was wrong** — Chrome normalises `linear-gradient(180deg, …)` by dropping the default angle, so string-matching `"180deg"` against `getComputedStyle` can never match. Caught by **reading the computed value before touching any code**, then replaced with the property that actually matters: all four card bodies identical (neutral) while all four spines differ (accent). *(Straight instance of the method's "a measurement instrument can be wrong-and-plausible".)*

---

## VALIDATION (both PRs)
tsc app **exit 0** · tsc test **exit 0** · `check:mojibake` PASS · `scope:guard --mode product` PASS (**pre-commit** — its correct timing) · root guard matrix **190/190** · lazytopper ops matrix **EXIT=0**, zero failure lines (C&I 91/91 · tutor⇄C&I 31/31 · tutor⇄QP 41/41; every FORBIDDEN path *zero changes vs origin/base*) · **commit-scoped matrices re-run POST-COMMIT on both** (`base...HEAD` confirmed non-vacuous first) · CI `quality-gate` pass (#520 4m18s, #522 3m22s) · `lane-overlap` pass · Vercel deployed.

**Both CI greens verified by reading the log, not the tick.** #520: 62 files / **814 tests**. #522: 62 files / **826 tests**, linux `vite build` `✓ built in 8.63s` — the production build Windows cannot run. Arithmetic proof the new tests actually ran: trunk 792 → **814** (#520, +22 = 18 new + 4 amended) → **826** (#522, +12).

**Byte-zero throughout:** `App.tsx` (confirmed both by `git diff` *and* independently by the ops matrix's own `FORBIDDEN: App.tsx shows zero changes` assertion), `DesktopShell.tsx`, `Welcome.tsx`, `main.tsx`, `vite.config.ts`, `firebase.json`, `firestore.rules`; no `src/data/`. #522 additionally left `homeDestinations.tsx` and `homeDestinations.test.tsx` byte-zero — the §3 contract and the shared picker were not disturbed.


---


## [PREV] #521 merged — ★★ EXAM TRENDS DESIGN UPLIFT: OWNER-SIGNED TIER DATA PROVEN FROZEN BY HASH, AND A SPEC THAT HALLUCINATED ITS OWN BUG — trunk `ee5cd640`

**Presentation-only uplift of `src/pages/ExamTrendsRanked.tsx`.** 2 files, +1150 / −574. Owner byte-reviewed the pushed diff **and independently re-verified the tier authority** rather than taking the agent's hash, then live-verified the merged surface. CI `quality-gate` pass (4m4s), `lane-overlap` pass. Draft PR throughout; never self-marked ready.

> **Handoff bookkeeping:** #519 (ops — DesktopShell ban lifted), **#520 (PR-A, Home redesign)** and **#522 (PR-A2, Home fixes)** all merged without their own handoff entries. **The Home lane's combined handoff covers #520 + #522**; this entry deliberately does not speak for that lane. Trunk moved `45ab803` → `c8dab29` (#520) → `ee5cd640` (#521) → `4bde1a3f` (#522, merged while this handoff was open).

### What shipped
Zero functionality change — no new route, param, data source, filter, sort or CTA destination. **One copy change: the per-row primary CTA `Open` → `Learn`** (same destination, same params). Rows became cards on a per-band accent (green Must-crack / blue High-ROI / violet Good-to-do — the hues already shipping as `DesktopPracticePage` `MODE_ACCENT`; **no colour invented**). **No grey band**: priority reads from the numbered badge and the ordering, never from draining colour — the old grey/black treatment made the page read dead below the fold. Styling moved to CSS classes (`lt-et-*`) in one `<style>` block, because the responsive rules and `:hover` **cannot** be expressed as inline style objects, which are banned in new components.

### ★★ THE METHOD NOTE — WHY THE OBVIOUS ANTI-RE-TIER GUARD WOULD HAVE BEEN A TAUTOLOGY
`BAND_BY_SLUG` is owner-signed authority transcribed verbatim from `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`. The spec required a test asserting band membership matches it exactly. **The obvious implementation is worthless:**

```
import { BAND_BY_SLUG } from "./ExamTrendsRanked";
expect(renderedBands).toEqual(deriveExpected(BAND_BY_SLUG));   // ← ALWAYS GREEN
```

If someone re-tiers the map, **both sides of that assertion move together** and the guard sails through the exact change it exists to prevent. It tests that rendering is a pure function of the map — never that the map still says what the owner signed.

**What was done instead:** *before a line of the uplift was written*, the **trunk** component was rendered through a throwaway capture harness, its band membership dumped, and that output frozen into the test as `EXPECTED_BANDS` — an **independent transcription** that cannot move when the map does. The harness was then deleted. Golden: **Maths 5 / 5 / 3, Science 6 / 5 / 2**.

> **The transferable rule: a guard over locked data must compare the render against an INDEPENDENT copy of the truth, captured before the change. If the guard reads the same source the code reads, it asserts nothing.** Same shape as the Practice-Hub parity proof (capture trunk, capture the rebuild, diff) and the routing-parity test (every expected string captured from trunk, not hand-written).

**Belt and braces:** the frozen region (`type Band` + `interface BandMeta` + `BAND_BY_SLUG` + `BAND_ORDER` + `BAND_DISPLAY`) was also hashed on both sides — `d470705fda73fd98bdcf32e7`, identical, re-confirmed post-rebase.

**★ The owner did not take either artifact on trust.** He extracted the `BAND_BY_SLUG` block from both sides himself — **70 lines, 2,359 bytes, sha `f3b72f1ce8e3549d1d507bcd` on each, byte-identical** — and checked the counts land on the golden: **11 must-crack / 10 high-ROI / 5 good-to-do = 26 chapters** (= Maths 5/5/3 + Science 6/5/2). Zero re-tiering, zero invented or dropped `subPattern`.

### ★★ THE SPEC DESCRIBED A BUG IN ITS OWN PROTOTYPE AND PRESENTED IT AS A PRODUCT DEFECT
Spec §5, *"⋯ THE MENU — TWO REAL BUGS, BOTH MUST BE FIXED"*, opened: *"The current implementation opens the menu over the next card at desktop width."* **It does not — because at trunk there was no menu.** `ExamTrendsRanked.tsx` rendered the `⋯` secondary actions as an **inline expansion row in normal flow** beneath the card ("Inline secondary-action row — revealed by ⋯"). There was no `position:absolute` popover anywhere in the file.

- **Cause (1), `overflow:hidden` on the band** — the ingredient was real, but it was clipping nothing, because there was no popover to clip.
- **Cause (2), "the menu had no `top` anchor"** — there was no absolutely-positioned menu at all.

Both describe **prototype v3's** mispositioned popover. **The owner confirmed this was his error**: a defect in his own mockup, written into the spec as if it were a defect in the shipped page.

**Consequence, and it is not cosmetic:** acceptance §9.4 is a **NEW-BEHAVIOUR check, never an A/B against trunk**. At trunk the menu *could not* overlap the next card, because it was not a popover. Anyone "verifying the fix" by comparing against trunk would be comparing two different things and would conclude the bug was never real.

> **Record the CLASS: a spec author can hallucinate a bug from their own mockup.** A spec sentence of the form *"the current implementation does X"* is a **claim about code**, not an instruction — open the file and check it before building on it. This is the fourth lane in a row where re-deriving a brief's premises changed the work (#515's error count, #516's "LIVE in PracticePage", the legacy-retirement audit's four wrong premises, now this).

The end state was unambiguous regardless, and shipped correct: `border-left: 5px` accent so the band needs no `overflow:hidden`; a `position:relative` wrapper around the `⋯` button with the menu at `top: calc(100% + 6px); right: 0`; `is-menuopen` z-index so the popover cannot slide under the next card; upward flip near the viewport bottom measured with `getBoundingClientRect()`; one menu at a time; outside-click close **anchored on the wrapper** so re-clicking `⋯` toggles rather than close-then-reopen. Owner also credited unprompted a11y work: `aria-haspopup` / `aria-expanded` / `aria-controls`, `role="menu"` / `role="menuitem"`, per-topic labels.

### ★★ SILENCE IN A SPEC IS NOT AUTHORISATION TO DELETE RENDERED CONTENT — doctrine, not incident
The first cut **dropped `topic.blurb`**, the real per-chapter catalogue copy. The reasoning felt sound: both the prototype and §2's row enumeration (*name · tier chip · marks-weight bar · Expect: · volatility note*) omit it, and it competed with the new `Expect:` inset. It was flagged for review rather than shipped silently — and the owner ruled **RESTORE**:

> *"Neither the prototype nor §2 said 'remove'; the row enumeration described what to RESTYLE, not an exhaustive keep-list. Deleting rendered content is a functionality change, which §0 forbids."*

**A restyle can quietly delete real content, and an omission from a list is not a removal instruction.** Restored with trunk's exact treatment (single-line ellipsis, tertiary colour) plus a mobile rule — **and pinned by a test**, not by anyone remembering: every rendered card's blurb must equal `desktopTopicBySlug(slug).blurb`. Mutation-verified — deleting the element turns exactly that test red.

### TEN YEARS — OWNER RULING, DELIBERATE, ON THE RECORD
Spec §4.4 required a hero badge reading **"Ten years of real CBSE papers"**, describing it as *"the page's actual credential, currently buried in body text."* Both halves of that premise are false: the phrase is in neither the page body nor anywhere in `src/`, and the repo records **4 years** (`CURRENT_STATE:2509` "PYQs: 760 total — all 4 main years complete"; the HPQ page's owner-approved reframe names *"4 years of papers + official blueprint + examiner-pattern analysis"*).

Raised before building. **The owner ruled: ship it. Ten years is authoritative — he is the authority on the evidence base, it is his data and his call.** This is a **deliberate owner decision recorded as such**, not an unverified attestation and not an agent judgement. The badge ships as specced.

**The inconsistency is real but points the other way** → `[FU-EVIDENCE-BASE-CLAIM-INCONSISTENT]`, **INVERTED**: since ten is authoritative, the **contradicting surfaces** are the ones to correct — `Welcome.tsx:1867` *"Last 5 years pattern"* (a **live marketing surface**) and `class10ContentConfig.ts:156` *"last 3–5 years of PYQs"*. `Home.tsx` already says 10 in four places, so it is consistent. **Separate lane; nothing touched here.**

### Prototype ⇄ spec conflicts, all resolved SPEC-FIRST (§0 forbids functionality change)
The prototype is the visual authority; the spec is the behavioural authority and wins on disagreement. Three calls, all endorsed by the owner at review:
- **The tray keeps its `Worksheet` CTA.** The prototype omits it; §2 marks the tray *unchanged*. Removing a live CTA destination is a functionality change.
- **The tray stays IN FLOW, not `sticky; bottom:0`.** At mobile width this page renders inside `MobileShell showNav`, whose **fixed `BottomNav`** a sticky tray would sit under. The chrome-less prototype cannot show this — a prototype's layout is only trustworthy where it models the app's actual chrome.
- **The marks label stays `~N marks`.** The prototype prints the bar's *normalised ratio* as a bare number; `100` beside a bar reads as a percentage — exactly the fake stat §1 forbids. Real `topic.weight` retained.

### VALIDATION
tsc **exit 0** · new suite **12/12** · blast-radius suites **65/65** · `check:mojibake` PASS · `scope:guard --mode product` PASS (`lanes=product`, **pre-commit** — post-commit it correctly reports `no changes` on a clean tree) · root guard matrix **190/190** · lazytopper ops matrix PASS (C&I 91/91 · tutor⇄C&I 31/31 · tutor⇄QP 41/41; every FORBIDDEN path *zero changes vs origin/base*) · `git diff --check` clean · **commit-scoped matrices re-run POST-COMMIT** · CI `quality-gate` **pass**, `lane-overlap` **pass**, Vercel deployed.

**The CI green tick was verified, not assumed** — the job log shows the suite by name and count (`✓ src/pages/ExamTrendsRanked.test.tsx (12 tests)`, individual test names listed), whole run **63 suite files / 826 tests**. The linux `vite build` emitted `ExamTrendsRanked-B0DbNBnn.js — 29.36 kB (gzip 8.45)`, confirming the production build Windows cannot run.

**Mutation-verified** (a green test is not evidence until it has been seen red): re-tiering `circles` must-crack→high-ROI, reverting `Learn`→`Open`, and deleting the blurb each turn the intended assertion red for the right reason; each restored byte-exact afterwards.

**NEXT:** the mastery lane remains the natural successor (audit delivered, unblocked). See `NEXT_ACTION.md`.

---

## (superseded) [CURRENT] #516 merged — ★★ THE TUTOR RETIREMENT IS COMPLETE: THE DEAD CLUSTER, THE UNREACHABLE MENTOR DRAWER AND `/api/mentor` ARE ALL GONE — trunk `a86feda`

**PR-2 of 2. 62 files, +34 / −15,239 — the largest deletion this repo has taken.** Owner byte-reviewed the full deletion set and merged. `[FU-TUTOR-LEGACY-RETIRE]` is now **CLOSED end-to-end** (#512 behaviour, #516 deletions). Docs-only handoff; zero product files here.

### ★★ CORRECTION TO THIS HANDOFF — "MentorSolveDrawer is LIVE in PracticePage" was **FALSE**
The previous handoff (post-#512) recorded `MentorSolveDrawer` and `/api/mentor` as **live and must-keep**. **Both were wrong, and the error came from trusting a MOUNT instead of tracing a TRIGGER.** The owner live-checked Quick Practice and HPQ: the only live buttons are "Check my solution" and "Show/Hide steps". Code then confirmed it:

```
PracticePage:2427  onOpenMentorBoard={... openMentorForQuestion(...)}
  -> PracticeQuestionList:147  onOpenMentorBoard={(q) => onOpenMentorBoard(q, idx)}
    -> PracticeQuestionCard:122  onOpenMentorBoard: _onOpenMentorBoard   <-- NEVER CALLED
```

The prop was threaded three levels deep and landed in an **underscore-prefixed, deliberately-unused binding**. A second trigger — a `useEffect` auto-opening on `?journeyMentor=` — had **no producer**: nothing in the product emits that query param (the only emitters were ops test fixtures). **The drawer was mounted, and unreachable. Mount is not liveness.**

**The transferable rule: an import proves a file compiles; a mount proves it renders; only a TRIGGER proves a student can reach it.** Every deletion in #516 was justified by tracing the trigger.

### What was deleted — four independently reviewable sections
1. **The old-tutor cluster** (12 files, −10,299): `ConceptTeachDrawer`, `TeachFlow`, `TutorDrawerV2`, `MentorPanel`, `TutorMessageRenderer`, `tutorStructuredExtract`, `pages/TopicHub.tsx` — a **closed import graph** whose only entry point had zero importers and zero routes. Plus `MentorSolveDrawer` + `mentorDrawerLogic` and their PracticePage wiring.
2. **`/api/mentor`** (25 files, −3,212): `server/routes/mentor.cjs`, the four request branches + four CORS paths in `server/index.cjs`, five `scripts/smoke/mentor-*.cjs`, `mentor_runtime_smoke`, `tests/mentor_smoke.spec.ts`, and the five ops suites that existed only to drive the endpoint. Six npm scripts.
3. **The persona/test-bot cluster** (21 files, −1,700): 6 student bots, 5 tutor bots, `software_testing_bot`, `persona_bot_lib`, `persona_gate_auditor`, `persona_audit_acceptance`, `browser_persona_gate_auditor`, `student_bots_product_experience_acceptance` — **12** npm scripts.
4. **Surgical ops fixes** (14 scripts): assertions about deleted files removed; **zero scripts retired outright.**

### ★★ TWO PREMISES THAT DID NOT SURVIVE TRACING — and what they cost
The deletion brief said *"delete `/api/mentor` + `types/mentor.ts`; the only 4 callers are all dying."* Two parts of that were wrong:

- **`types/mentor.ts` is NOT deletable and was KEPT.** It is not an endpoint-private module — it is a shared **TYPE** module with 7 importers, one of which is **`src/ai/aiClient.ts`, which has 33 importers of its own** and feeds the entire live grading stack (SolutionChecker, worksheet grading, ChapterTest, Check & Improve). `aiClient` pulls `MentorImageMimeType`, `MentorMode` and `MentorGatewayData` from it. **The filename is misleading; the contents are not mentor-only.** Deleting it would have broken the build and a large live surface.
- **`server/routes/mentor.cjs` also fed LIVE surfaces.** It re-exported `ensureDiagramFields` (into `createStubHandlers`) and `buildMoreLikeThisUserPrompt` (into the more-like-this handlers — and **`/api/more-like-this` IS live**, called by `practiceQuestionBuilder` and HPQ). Both are actually **defined** in `server/prompts/promptDiagram.cjs` / `promptLearn.cjs` and were only *passing through* the mentor route, so `index.cjs` now requires them from their real homes. **No behaviour change to either live surface** — but deleting the module wholesale, as briefed, would have broken both.

### ★ A SECOND-ORDER CASCADE the brief could not have seen
Eight surviving scripts **spawned** the five deleted mentor suites (`topichub_doc_alignment`, `topichub_intended_functionality`, `step2_refactor_connectivity`, `phases_4_6`, `work_buddy_full_auditor`, `deletion_batch_regression`, `feature_file_matrix`, `backlog_1_19`). Deleting the suites alone would have left eight scripts spawning missing files. Same shape as the browser-journey runner in section 3: **deleting a file is never just deleting a file — grep for who *invokes* it, not only who *imports* it.**

### ★ ON THE OPS SWEEP — the earlier plan was too aggressive, and reading proved it
The post-#512 plan said PR-2 would "retire the ~8 wholly-dead ops scripts". Reading all 23 showed only **one** was mostly-dead; every other script — **including all 8 bots** — also asserted on files that survive. **Zero were retired in section 4**; all were surgically fixed. Governing rule: *where a deleted file was one conjunct of an `AND`, the surviving conjuncts were kept* — that preserved 6 assertions about `TrendsPage`/`PracticePage`/HPQ a blunter sweep would have discarded.

`triangles_audit`'s `runWiringChecks` now returns `[]`: its four checks read `TopicHub.tsx` exclusively, so with the file gone they could only ever report **false**. **A permanently-red gate is as dishonest as a vacuously-green one.** Nothing was stubbed green and `readText` was **not** hardened to swallow ENOENT anywhere.

### VALIDATION
tsc **exit 0** · lazytopper `test:matrix:all` **all 14** · root guard matrix **190/190** · `check:mojibake` PASS · `scope:guard --mode mixed` PASS (**`--mode product` correctly REJECTS this PR** — it legitimately spans product + tracked tooling) · `node --check` on every modified script PASS · **overlay gates re-run POST-COMMIT** (`ok FORBIDDEN: App.tsx shows zero changes`; C&I 31/31, QP 41/41) · `git diff --check` clean · linux CI `quality-gate` **pass**, `lane-overlap` **pass**.

**No gate was made worse** — verified by stashing all changes and re-running on clean trunk: `agent3` 3/7 → 3/7 identical, `backlog` 3/19 → 2/18 failing, `ux:all-priorities` 8 → 7 failing. Those three were **already red at trunk**; the checks removed were themselves already failing. None is CI-gated.

**`App.tsx` byte-frozen** (its `MentorPanel` comment stays). **`topicHubMastery` UNTOUCHED — the owner is still holding that decision.**

**NEXT:** the mastery lane is the natural successor (its audit is already delivered), plus `[FU-BANK-GARBLED-ANSWER-CLASS]`. See `NEXT_ACTION.md`.

---

## (superseded) [CURRENT] #515 merged — ★★ WAVE-3: TESTS ARE TYPECHECKED · 26 GARBLED BANK ROWS RECOVERED FROM SOURCE · "REFRESH SET" ACTUALLY REFRESHES — trunk `a40fa75`

**ONE PR, THREE file-disjoint lanes, three independently revertable commit-sections.** 17 files, zero forbidden files (`App.tsx` / `DesktopShell.tsx` / `canonicalQuestionBank.ts` all absent). Owner byte-reviewed the pushed diff against CBSE maths + the source citations and merged. CI green (`quality-gate` 4m2s, `lane-overlap` pass — zero collision with the tutor PR-2 lane).

Orchestration: one main agent, three subagents on hard file allowlists, run in parallel in one worktree. The lanes touched genuinely disjoint files, so there was no internal collision — but see the two BLOCKERS below, both of which only became visible **after** the lanes were assembled.

### Section 1 · L1 — `tsc` had NEVER typechecked a single test file (`[FU-TSCONFIG-EXCLUDES-TESTS]` ✅)

`tsconfig.app.json:28` excluded `src/**/*.test.ts(x)` and `src/test/**`, so the `tsc -b` inside `build` never saw a test file. **That is the root reason four vitest suites could rot silently — they broke at the TYPE level long before anyone ran them.** A green `tsc` said nothing about them.

**Approach (b) chosen: a separate `tsconfig.test.json`, NOT widening the app config.** `tsconfig.app.json` is the exact project `vite build` runs (`"build": "tsc -b && vite build"`). Widening it would pull the 60 test files, the `vitest/globals` + `@testing-library/jest-dom` ambient types, and `allowJs` into the **product** build's program — letting product source compile against globals that do not exist at runtime. The test project `extends` the app config, so tests still inherit `strict` and every product rule; **`tsconfig.app.json` is byte-unchanged.**

> **★★ THE BOARD'S PREDICTION WAS WRONG, AND THE HABIT THAT CAUGHT IT IS THE POINT.** The FU said typechecking tests "surfaced exactly one error" — a `TS7016` on the parity test's `.cjs` import. The lane was told to **enumerate before fixing**. Actual: **15 errors across 7 files**, plus **8 more that surfaced only after `allowJs` removed the masking `any`**:
> - **13 × TS7016** across **6 distinct** untyped `server/**` CJS modules and 8 test files — not one module, six.
> - 2 × `TS2339` + 7 × `TS18047` — one TS control-flow artifact (`let x: T | null = null` assigned only inside a callback, narrowed to `never` at the assertion site).
> - 1 × `TS6133` — `questionMatchesFilters` imported and never used in `QuickPracticePresets.test.tsx`. Genuine rot.
>
> **None are product bugs; product source typechecks clean.** Had the lane "fixed the one known error" as briefed, it would have shipped a gate that still didn't compile.

**TS7016 handled with `allowJs: true` + `checkJs: false`** — those suites import the **real** CJS routes on purpose, so shapes are inferred from the actual implementation. A `.d.ts` shim was rejected on a hard technical ground, not taste: **an ambient `declare module` cannot match a RELATIVE specifier** like `"../../server/routes/checkSolution.cjs"` at all, so a shim would have meant six sibling `.d.cts` files inside `server/`. A blanket `noImplicitAny: false` would also have silenced implicit-any *parameters* in the tests themselves.

**Gate mutation-proven:** a deliberate `TS2322` in `smoke.test.tsx` takes the new CI step from exit 0 → exit 2. **CI log confirms the step RAN** (`> tsc -p tsconfig.test.json --noEmit`, clean) — a green job is not evidence a new step executed.

**Ships with an honest 2-file hole** (`[FU-TSCONFIG-TEST-2FILE-HOLE]`): `geminiThinkingConfig.test.ts` and `stepSolutionCacheQualityGate.test.ts` are `exclude`d with a loud in-file comment, because the fix lives *inside those test files* — outside the lane's allowlist. Owner accepted the gap rather than force it closed.

> **★ TRAP WORTH REMEMBERING: a glob inside a `/* */` tsconfig comment silently destroys the config.** The `*/` in a path glob **closes the comment early**; `tsc` then parsed garbage, produced an *empty* `compilerOptions`, and emitted a **2.3 MB** error dump that reads as a catastrophic regression. The final file uses `//` line comments only. Detect in seconds with `tsc -p <cfg> --showConfig`.

### Section 2 · L2 — 26 bank rows recovered from source, 1 corrupt duplicate retired (`[FU-BANK-GARBLED-ANSWER-CLASS]` ✅ for the recovered subset)

The QUESTION-side twin of #511. **Editing a question is the fabrication line**, so this lane was run report-first: it produced a page-cited evidence table with **zero files changed** and held for owner NCERT review before authoring anything.

> **★★ THE ROOT CAUSE IS NOT OCR — AND THAT CHANGED THE RECOVERY METHOD.** Every affected `answer` is a verbatim dump of the official CBSE **marking scheme**. Marking schemes render fractions as **stacked glyphs** (numerator / drawn rule / denominator), so a flat extractor stops at the line break and truncates each field at the `=` before a fraction. Proof (2026 MS 30/5/1 p.9):
> ```
> => Number of yellow balls = 25 x 2     <- extractor kept this
> 5 = 10                                 <- ...and dropped this
> ```
> Recovery therefore required a **coordinate-aware** pymupdf harness rebuilding fractions from `page.get_drawings()` (numerator = above the bar) and discarding the right-hand mark-allocation column. **This was load-bearing:** in MS 30/4/1 2022-23 Q24 the flat reading order emits `4` before `3`, but the bboxes (`3` at y=122.4, `4` at y=139.4) prove the value is **3/4**. A naive line-join would have shipped **4/3** — a wrong answer, delivered as a fix.

> **★★ THE BRIEF'S SOURCE POINTER WAS WRONG.** `Desktop/diff/cbse-papers/PYQ/X question papers/` holds **question papers, not marking schemes**, and its 2025/26 maths PDFs are **image-only** (195–450 chars total). The real sources are `cbse-papers/gdrive/PYQs/MS/final MS/<year>/MS/`. A lane that trusted the briefed path would have found nothing extractable and concluded the rows were unrecoverable.

**Scope is far larger than the briefed "~15".** The brief class is 24 rows; bank-wide there are **89 rows** carrying Private-Use-Area / U+FFFD glyphs and **82** with dangling-operator `answer` fields across **141 files**. → `[FU-BANK-GARBLED-EXPANDED-SCOPE]` (the remaining ~61, deliberately untouched here).

**★★ `check:mojibake` does NOT catch PUA codepoints** — the existing gate is blind to this whole damage class. → `[FU-MOJIBAKE-GATE-MISSES-PUA]`.

**THREE questions were UNSOLVABLE AS PRINTED and are now solvable** — the highest-value fix in the set, since students literally could not answer them:
- `PYQ-M-STAT-008` — 8 classes but only 7 frequencies; the 70–80 frequency `8` restored.
- `PYQ-M-2024-STAT-003` — 7 classes but 6 frequencies; the missing `4` restored (and `f = 6`, previously *inferred* by #511, is now **source-confirmed**).
- `PYQ-M-2026-PROB-002` — the stem's "4 5 times" is **5/4** by glyph bbox; **only 5/4 yields the scheme's `m = 12`**. Found during application, not in the original table.

**Also corrected:** `PYQ-M-2024-STAT-004`'s stored solution **answered the wrong question** (with the stem unreadable, #511 computed a *mode*; the now-readable sub-parts ask for the modal-class lower limit, the median class and the empirical relationship), and `QE-003`/`QE-004`'s MCQ **options** were garbled too — every distractor had lost its minus sign and trailing `= 0`.

**3 rows WITHHELD, not fabricated** — `PYQ-M-2026-CG-002` (unsound, retired instead), `PYQ-S-ELEC-004` (science, not investigated this pass — the lane declined to report an unverified recovery), and **`SCQ-S-ELEC-036`, for which no PYQ source exists**: it cannot be fixed without inventing I-V values, so it stays **permanently withheld** absent an owner-supplied source. **A withheld row is honest; a guessed one is fabrication.**

**`PYQ-M-2026-CG-002` RETIRED, not re-keyed.** Its stem welded the Latin remnants of 30/5/1 Q35 (a circle/tangent problem) to Q33(b) of the same paper (a parallelogram-midpoint proof). **Q35 is already served cleanly by `PYQ-M-2026-CIRC-006`** with a correct stem, topicKey and 5-step solution — so re-keying would only have minted a near-duplicate. No tombstone convention exists in this bank (checked: no RETIRED marker anywhere in `questionBanks/`; the root matrix's `deletion` suite asserts banned *syllabus topics* are absent, not that ids resolve), so retirement is row deletion with an in-file comment pointing at CIRC-006.

**Syllabus guard re-read at trunk** and checked against the exact `bannedSubtopics` strings (never from memory): **CLEAN** — SAV rows are cylinder+cone / cylinder+hemisphere composites (not frustum/conversion), statistics rows are mean/median/mode (not ogive), and CG-002 was tangent-**length** computation, not tangent **construction**.

**Owner ruling: the 26 recovered rows enter the student-QA queue as the final content gate on question quality.**

### Section 3 · L3 — "Refresh set" handed back the identical questions (`[FU-PRACTICE-CONTROLS-REFRESH-STALE]` ✅)

`PracticeControls.tsx:334`'s button called a bare `regenerateQuestions()` — the exact staleness #509 fixed on the scorecard CTA. `rotationOffset` is seeded from `sessionRotationOffset(topic, filterSignature, sessionStartedAt) + freshSetNonce`, and tapping the button **moved none of them** (`sessionStartedAt` is mount-once, the committed filters didn't change, and the bare regenerate never touches the nonce). Every *other* caller (`applyPreset`, `onBuildSet`) commits filters first, which moves `filterSignature` — **"Refresh set" was the only trigger that moved nothing.** #509's finding that the seen-set loader has **no `regenerationKey` dependency** was re-verified as still true at current code.

Traced live rather than reasoned:
```
[TRACE · refresh scarcity] pool=5 · set #1 = [1,2,3,4,0] · set #2 = [1,2,3,4,0]   <- byte-identical
[TRACE · normal build]     seed #1 = 1693342331 · seed #2 = 1693342331 · seen @ fetch = 0
                           set #1 = [6,7,8,9,10] · set #2 = [6,7,8,9,10]          <- normal path UNCHANGED
```

**Owner forbade blind-routing through `buildFreshSet`; the lane investigated and then chose it anyway — with evidence.** The button sits in the built-set toolbar beside "Edit filters", which already owns *"different questions because I changed my request"*, leaving only *"same filters, questions I have not just been staring at"*. **A lighter nonce-only re-shuffle was MEASURED and rejected:** `selectInRangeFromPool` rotates the unseen partition LEFT by the offset, so `+1` on an all-unseen 25-pool slides the window by exactly one — **4 of 5 questions come straight back**, which still reads as a broken button and would not have closed the FU.

**`Alt+R`, the keyboard twin, had the same defect** and was fixed in the same lane — its listener effect is `[]`-deps so it cannot close over the current render; it goes through a per-render ref. **`PracticeControls.tsx` is UNTOUCHED** — it is a pure presenter and the defect was entirely in the handler passed to it.

**Normal build path byte-identical** (only two call-site lines changed; `freshSetNonce` stays 0 on those paths), pinned observably by a NO-REGRESSION test. **The suite is mutation-proven in BOTH directions:** reverting the fix turns the defect + scarcity cases red; applying the fix *globally* (to `onBuildSet` too) turns no-regression red. **An earlier no-regression assertion (`seen.size === 0`) was found INSENSITIVE by mutation** — `isBuilt` goes false on "Edit filters" so nothing is displayed to sweep — and was replaced with a set-identity assertion that does go red.

### ★★ TWO BLOCKERS THAT ONLY APPEAR AT ASSEMBLY — both are process lessons

**BLOCKER 1 — `scope:guard` FAILED on the assembled tree.** `[unclassified] tsconfig.test.json`. `repo_boundary_policy.json` enumerates tsconfigs **by exact name** in the `product` lane, so a *new* tsconfig matches no rule → `classifyFile` returns `"unknown"` → hard-boundary FAIL. **No subagent could have caught this** — the guard classifies the whole working tree, so it only becomes meaningful once the lanes are assembled — **and it is a LOCAL-only gate, not in CI**, so this would have merged with the local bar silently red. Fixed by adding the file to the product lane (owner-authorised scope expansion, outside all three allowlists).

**BLOCKER 2 — the commit-scoped gates had not truly run.** The `lazytopper` ops matrix contains guards that diff `base...HEAD`. The lanes ran them **pre-commit, on zero commits** — trunk vs trunk, a truthful-but-useless green. **The same trap as #488 and #496.** Re-run after committing, the forbidden zero-diff checks finally compared against `origin/base` for real (`predictionDataService`, `practiceSetGenerator`, `quickPracticeSessionService`, `tutorRoundTrip`, `sessionRecords`, **`App.tsx`** — all zero-diff).

> **★★ AND THE MIRROR FIRED IN THE SAME WAVE.** Post-commit, `scope:guard` reports `SCOPE_GUARD_OK (mode=mixed, no changes)` — truthful and useless, because it reads the **working tree**. **Its meaningful verdict is the PRE-commit run; the matrices' meaningful verdict is the POST-commit run.** Both halves of that trap are now on record together: *ask what range a gate inspects before you trust its green.*

> **★ A `git add` that warns can silently kill your commit.** Root `.gitignore:49` ignores `lazytopper/docs/project_memory/`, so staging `repo_boundary_policy.json` emitted an ignore warning and **exited non-zero**, which short-circuited the `&&`-chained commit. The file **is** tracked — commit `c7d742f` ("restore repo_boundary_policy.json … accidentally untracked in `2081003`") exists precisely because untracking it once **disarmed scope:guard**. Check `git log --oneline -1` after a chained commit, not just the add.

> **★ MUTATION-TEST THE CHECKER, NOT JUST THE CODE.** L2's PUA verifier was **silently vacuous on v1**: its codepoint range collapsed to a literal `-` on write (the known Write/Edit escape-decoding hazard) and its truncation regex matched every `id: "`, so it flagged all 26 rows while asserting nothing. Rebuilt with a **self-test that injects a known U+F0DE and a dangling operator and requires both to be caught** — then re-run: zero PUA, zero U+FFFD, zero truncated fields.

### Gates (post-commit + CI)

| Gate | Result |
|---|---|
| root `scripts` `test:matrix:all` | PASS — 190 tests / **28 suites** / 0 fail (verified by **suite identity**, not count — CLAUDE.md §6 still says "5 suites") |
| `lazytopper` `test:matrix:all` | PASS — forbidden zero-diff really compared vs `origin/base`; QP overlay 41/41 |
| `tsc -p tsconfig.app.json --noEmit` · `tsc -p tsconfig.test.json --noEmit` | PASS · PASS |
| `check:mojibake` | PASS · residual PUA in touched rows: **zero** |
| vitest (local) | PASS — refreshSet + freshSet + scorecardFeed, 3 files / 7 tests |
| **CI `quality-gate`** | **PASS 4m2s** — `vite build` ✓ built in 9.89s (linux-only) · new typecheck step **ran clean** · vitest **61 files / 792 tests** |
| **CI `lane-overlap`** | **PASS** — zero collision with the tutor PR-2 lane |
| `scope:guard --mode mixed` | PASS **pre-commit**; vacuous post-commit (see Blocker 2) |

> **★ THE SUITE COUNTS ARE THE PROOF THE NEW TEST RAN IN CI.** vitest went **60 files / 789 tests → 61 / 792**: exactly **+1 file and +3 tests**, matching L3's new suite and its three cases (defect · scarcity · no-regression). *Read names and counts — a green tick is not evidence a suite executed.*

### Known residue — deliberately not touched
`PYQ-M-2026-CG-002` remains listed in `CLASS_B_STEPPED_SOLUTION_IDS` (`canonicalQuestionBank.ts:1925`) — a **globally forbidden file** (CLAUDE.md §4). Verified **inert**: that array only spreads into `AI_GENERATED_SOLUTION_IDS`, a `Set` used for membership lookup (rank demotion); nothing in either matrix asserts its members exist, and all gates pass with the stale id present. **Owner: right call not to touch a forbidden file for an inert id.** → `[FU-CANONICAL-STALE-RETIRED-ID]`.

### Live-verify status
**No live owner execution is owed for L1** (config/CI only, zero product `src/`) **or L2** (bank content — the student-QA queue is the content gate). **L3 touches a live round-trip** (`PracticePage` question selection): CI + the mutation-proven regression suite cover it, but a real owner tap of "Refresh set" (and `Alt+R`) is the honest confirmation. Not blocking.

---

## #512 merged — ★★ THE OLD "TEACH ME" TUTOR DRAWER IS RETIRED FROM THE LIVE PRODUCT + ONBOARDING→HOME — trunk `e19b2d1`

**PR-1 of 2 of the tutor/onboarding retirement. BEHAVIOR ONLY — 7 files, +102/−110, ZERO file deletions.** Owner byte-reviewed the pushed diff and **LIVE-VERIFIED all five checks**, including the referral credits-once path. Docs-only handoff; zero product files here.

**PR-2 (the deletions + the ops-script sweep) is the remaining half and has NOT started.** See `NEXT_ACTION.md`.

### Why this was split into two PRs — the audit undercounted the fallout by an order of magnitude
The retirement was specced as one PR. Re-verifying the audit (`REPORT_legacy_retirement_audit_2026-07-21.md`) against trunk found **three of its claims wrong**, and one of them changed the shape of the work:

| Audit claim | Reality at trunk |
|---|---|
| "2 ops scripts break on deletion" | **16 scripts hard-`readText` a to-be-deleted path** (~15 npm entries); the count of files *referencing* them is **~27** |
| `ConceptSpine.test.tsx` asserts "Teach me" in **2** places (`:14-27`, `:224-252`) | **THREE** places — it missed `:107-110` inside "learn-first concept rows", and mis-numbered the other block (`:254-281`). A PR following the audit verbatim lands **RED**. |
| deleting `pages/TopicHub.tsx` is optional ("delete IF dead") | **FORCED** — it imports `ConceptTeachDrawer`, so retiring the old tutor breaks `tsc` unless it goes. There is no cheap variant. |

**Owner ruling: split behavior-first / deletions-second (the #505 MockBuilder pattern).** Bundling a live behaviour change with a ~27-script content cleanup is a mixed-concern PR that delays the user-facing fix. **The alternative — hardening `readText` to swallow ENOENT — was explicitly REJECTED**: every assertion on a deleted surface would then pass *vacuously*, the same false-green class this project has already been bitten by twice.

### What shipped — three commit-sections, each independently reviewable
`Login.tsx` and `SignUpPage.tsx` carry changes from **two** sections, so they were split by hunk rather than lumped into one commit.

**1 · `fix(referral)` — crediting relocated off the page being retired.** `creditPendingReferral` had exactly ONE caller: `Onboarding.tsx:99`. Capture stays live at `App.tsx:558`, so retiring Onboarding without this would have left referrals **captured but never credited** — silent, no error surface. Moved (not copied) into the auth-success effects of `Login.tsx` **and** `SignUpPage.tsx`.

> **★★ Why BOTH pages:** `AuthContext` exposes **no new-user signal** — `signInWithGoogle` is a bare `signInWithPopup` and `signUpWithEmailPassword` discards the credential, so `additionalUserInfo.isNewUser` is not plumbed anywhere. A Google-first signup can complete on **either** page. Covering both is what makes "credits once per signup" true; `creditPendingReferral`'s own two guards (no pending code → return; `REFERRAL_CREDITED_KEY` set → return) make it safe.

> **★★ The identifier switch was a REAL BUG FIX, not cosmetics.** The old argument was a fresh `Date.now()`-derived string. `addReferralToCode:88` dedups on `referrals.includes(friendIdentifier)` — *a fresh timestamp can never match an existing entry*, so **the dedup was inert and one student could be credited twice**. The real Firebase `uid` is stable, so the dedup now actually holds.

**2 · `feat(tutor)` — the old "Teach me" side-drawer is retired.** It was **LIVE, not latent**: `ConceptSpine` rendered an *unconditional* "Teach me" on **every** concept row, and `DesktopTopicHubPage` supplies the props rendering the new "Stuck? Ask" beside it — so students saw **both** affordances. This was a **product removal, not a cleanup**. Four surgical hunks (import · `teachConcept` state · button · mount); the new-tutor entries are **byte-identical**. Two further same-file hunks removed what those made stale: the dead `.lt-spine__btn--teach` CSS and doc-comments still asserting *"Teach me stays LIVE as the fallback"*.

**3 · `fix(auth)` — a new signup lands on the homepage.** All **four** live inbounds to `/onboarding` cut (`Login.tsx:876`, `SignUpPage.tsx:52`, `DesktopHome.tsx:294`, `MobileHome.tsx:448`). The audit named only the first; a Login-only fix would still have stranded signups arriving via `/sign-up` or either home page's start-trial CTA.

> **★ This fix is WIDER than "new signups".** `hasProfile` was deleted rather than repointed **because it never worked**: `Login.tsx` read the **bare** key `lazytopper.profile.v2`, but `studentCloudStore.ts:23` only ever writes the uid-suffixed `lazytopper.profile.v2:<uid>`. It was permanently `false`, so **every** login — returning users included — was already being routed to `/onboarding`. That is the off-brand dark screen students reported. Resolves `[FU-LOGIN-HASPROFILE-DEAD-KEY]`.

### ★★ THE RETIREMENT GUARD WAS MUTATION-TESTED — a delete-only test edit proves nothing
The old `"tutor wiring (PR-C, preserved)"` suite asserted "Teach me" was live. Deleting that coverage would have left the removal unguarded. It was replaced by a guard asserting the **ABSENT** case *together with* the **POSITIVE** case:
- "Teach me" is gone as **text, as `button`, AND as `link`** — so a delete that merely demoted it to an anchor still fails;
- **every** row still exposes a `Stuck? Ask` **link** carrying *that row's* concept — so a row that lost **both** affordances cannot pass.

The harness had to be given `tutorHrefForConcept` (the real page supplies it); without that the guard would have asserted against a **strawman row that never had the replacement**. **Proof it is not vacuous: re-injecting a "Teach me" button turns the guard RED, and it returns green on restore (23/23).**

### App.tsx: Option B — zero diff, verified against COMMITS
`App.tsx` is globally forbidden **and** asserted zero-diff by both overlay acceptance scripts inside the CI-gated `test:matrix:all`. The `/onboarding` route and `pages/Onboarding.tsx` stay **inert on disk**. Both gates were **re-run AFTER committing** — they diff `base...HEAD`, so a pre-commit run inspects an empty range and is a truthful-but-useless green:

```
ok  FORBIDDEN: lazytopper/src/App.tsx shows zero changes (vs origin/base/approved-thru-437)
Tutor <-> C&I overlay acceptance PASSED - 31/31
Tutor <-> Quick-Practice overlay acceptance PASSED - 41/41
```

Leaving the file also keeps `backlog_1_19_acceptance.mjs:120`, which hard-reads it, working.

### ★ A CI-matrix script NAMING a deleted path is not automatically a break — read HOW it uses it
`topickey_guard_acceptance.mjs:115` lists `pages/TopicHub.tsx`. It looked like a CI blocker for PR-2. It is not: the entry sits in `B_ALLOW`, a **skip**-list consulted via `B_ALLOW.has(rel)` while walking files that **actually exist**. A deleted file is never walked ⇒ no `readFileSync`, no ENOENT. All 14 matrix scripts were enumerated; **zero** of the 16 affected ops scripts are among them. **CI is green under every PR-2 option.**

### Deliberately NOT in scope
- **All file deletions** → PR-2. The old-tutor cluster stays on disk; after PR-1 it is imported **only by itself** (`ConceptTeachDrawer`'s sole importer is `pages/TopicHub.tsx`, which has zero importers and zero routes), tsc-clean, and **no ops script breaks yet**.
- **`topicHubMastery` — UNTOUCHED. The owner is still holding that decision.** Only the old tutor's mastery *write* becomes unreachable; the store and every reader are intact. See `[FU-MASTERY-WRITE-ORPHAN]`.
- **`[FU-SIGNUP-UNSAFE-REDIRECT]`** — `SignUpPage` still uses `st.from` without `isSafeInternalPath`. Pre-existing; an auth-security fix does not belong in a retirement PR. Noted in-code.

**VALIDATION (matrices re-run POST-COMMIT):** tsc PASS (exit 0, `noUnusedLocals` clean) · `ConceptSpine.test.tsx` **23/23** · **guard mutation-test RED-on-mutant** · `check:mojibake` PASS · `scope:guard --mode product` PASS (pre-commit, where it must run) · lazytopper `test:matrix:all` **all 14** · root guard matrix **190/190** · `git diff --check` clean · linux CI `quality-gate` **pass**, `lane-overlap` **pass**. Branched from `41277c1`; trunk moved to `856d556` mid-work (#510 docs, #511 bank) — **no overlap** with the 7 files, so no rebase.

**OWNER LIVE-VERIFIED (all 5):** Topic Hub keeps `/tutor` and "Teach me" is gone · new signup → home (both `/sign-up` and Google-from-`/login`) · returning login → home · both start-trial CTAs → home · **referral credits exactly once** (the silent-failure path).

**NEXT:** **PR-2 — delete the dead old-tutor cluster + `pages/TopicHub.tsx`, and sweep the ~27 ops scripts.** See `NEXT_ACTION.md`.

---

## (superseded) #511 merged — ★★ THE 223 UNDER-STEPPED D/E ROWS NOW CARRY REAL CBSE STEP-MARKED SOLUTIONS — trunk `856d556`

**Class (b) of the mis-banding follow-up. Data-only, ONE PR, 87 files, +831/−356. Resolves `[FU-BANK-SCARCE-BAND-MISBANDING]` Class (b) — the lane is now CLOSED end-to-end (Class a by #504, Class b by #511).** Owner byte-reviewed the PUSHED diff and merged. Docs-only handoff; zero product files here.

### What the defect actually was — and how it differs from Class (a)
**These questions were always CORRECTLY BANDED.** Genuine 5-mark Section-D long answers and 4-mark Section-E case-based items — nothing like Class (a), where objective/short rows sat at a bogus `D/5` and needed *relabelling*. **Do not conflate the two.** What Class (b) was missing was the **marking scheme**: `solutionSteps` were collapsed (**109 rows held their entire solution in ONE run-on step**), below the CBSE minimum depth, or carried per-step marks that did not sum to the total.

All 223 now carry `[N mark]`-prefixed steps summing **exactly** to the question's marks, at or above the CLAUDE.md §13 minimums (D = 5 steps, E = 4). **Multi-part rows may exceed those counts — the doctrine numbers are floors, not caps** (several use 6–7 steps summing to 5).

### ★★ THE ANTI-FABRICATION PROOF WAS SEMANTIC, NOT A DIFF GREP
A grep over the diff cannot prove a question is unchanged — it only shows which lines *look* touched. Instead the assembled `canonicalQuestionBank` **export** was dumped to JSON at trunk (in a throwaway detached worktree) and again post-edit, then deep-compared **field-by-field across all 8,584 rows**:

```
baseCount 8584 -> nowCount 8584     idsAdded []   idsRemoved []
changedRows 223
changedFields { solutionSteps: 223, finalAnswer: 70 }
forbiddenFieldChanges []      <-- ZERO
changesOutsideThe223  []      <-- ZERO
targetsUnchanged      []      <-- all 223 genuinely changed
```

`questionText`, `options`, `answer`, `correctOption`, `marks`, `section`, `format`, `id`, `topicKey`, `subtopic`, `difficulty` are **byte-identical on every row in the bank**. The 70 `finalAnswer` edits were all fields that were **absent or raw OCR junk**. The owner independently byte-verified the same property against the pushed diff. **This is the reusable shape for any future data lane: compare the ASSEMBLED EXPORT, not the diff text.**

### The validator
| metric | trunk | post-#511 |
|---|---|---|
| D+E rows | 2,167 | 2,167 |
| THIN (below D=5 / E=4 depth) | **220** | **0** |
| BAD-SUM (prefixes ≠ marks) | **3** | **0** |
| fully compliant | 1,137 | **1,360** (+223) |
| full-depth-but-untagged (excluded class) | 807 | 807 (untouched) |

**The 223 reconciles against the old "~178" estimate:** 220 thin + 3 bad-sum. The estimate came from a regex file-scan; this was an in-memory audit of the real export. 254 total D+E violators = 223 (Class b) + the 31 correctly-excluded Class-a/already-compliant rows.

### ★★ RESTRUCTURING SURFACED REAL CONTENT DEFECTS THE COLLAPSED FORMAT HAD HIDDEN — all fixed in this PR
The step-marking pass was expected to be formatting work. It was not:
- **`SCQ-S-ELEC-036` and `PYQ-M-2026-AP-001` carried the solution to an ENTIRELY DIFFERENT QUESTION** — a series-circuit experiment stored on an I–V graph question, and a statistics mean/mode solve stored on an A.P. kolam question. Both replaced with correct solves.
- **`SCQ-S-CHEM-038`** — an **unbalanced** combustion equation (CH₄ + O₂ → CO₂ + 2H₂O); corrected to CH₄ + 2O₂.
- **`PYQ-M-2026-CIRC-006`** — the source's own embedded equation `(12−x)=x+8` was **mathematically wrong** (it ignored Pythagoras). Corrected to AB = 20/3 cm, PA = 26/3 cm — and **independently corroborated**: a different batch solving the same geometry from `PYQ-M-2026-CG-002` arrived at identical values.
- **`PYQ-M-2025-AP-002`** — arithmetic error: S₆ = 3 × (600 + 250) = **2550 m**, not the OCR'd 2250 m.
- **`STAT-N-EXEM-13-LA-001`** — rounding slip: 18720/110 = **₹170.18**, not ₹170.20.
- **`SCQ-S-HERED-042`** — the entire solution was the literal string `"[Sample Paper 2010]"`; a full sex-determination answer was authored.
- `WWW.CBSE.ONLINE` disclaimer junk stripped out of `solutionSteps` on several rows.

**The transferable lesson: a collapsed one-line solution is not just ugly — it HIDES wrongness.** Nobody can see that a run-on paragraph answers a different question. Forcing the per-step structure is what made these visible.

### Provenance
The 223 ids are pinned in a new `CLASS_B_STEPPED_SOLUTION_IDS` array spread into `AI_GENERATED_SOLUTION_IDS`, so authored schemes rank-demote below authentic ones and stay auditable — the same mechanism as every prior authored batch. **That id-set is the one line outside `data/questionBanks/`**, flagged before authoring began and owner-confirmed in advance.

### Deliberately NOT in scope (all verified untouched)
- **807 D/E rows** with full-depth solutions but no `[N mark]` tags — a much larger, cosmetic-leaning class. Not this lane.
- **Class-(a) rows** (#504) and already-compliant rows.
- **Garbled upstream `answer` / `questionText` fields** — see `[FU-BANK-GARBLED-ANSWER-CLASS]`, newly opened. **This lane authors SOLUTIONS, not QUESTIONS; those are question-defects for a separate pass.**

**VALIDATION (matrices re-run POST-COMMIT — commit-scoped guards diff `base...HEAD`, so a pre-commit run is truthful-but-useless):** tsc PASS · `check:mojibake` PASS · `scope:guard --mode product` PASS (pre-commit, where it must run) · lazytopper ops matrix PASS · root guard matrix **190/190** · `git diff --check` clean · step-mark validator **223/223 sum exactly**. Production build linux-gated by CI.

**NEXT:** `[FU-BANK-GARBLED-ANSWER-CLASS]` opened (~15 rows with OCR-garbled `answer` fields + `PYQ-M-2026-CG-002`'s welded `questionText`). See `NEXT_ACTION.md`.

---

## (superseded) #509 merged — ★★ "BUILD A FRESH SET" IS ACTUALLY FRESH + THE VITEST GATE IS FULLY STRICT — owner LIVE-VERIFIED — trunk `41277c1`

**Wave-2, ONE PR with TWO file-disjoint commit-sections, 7 files, +451/−34. Resolves `[FU-PRACTICE-FRESH-SET-NOT-FRESH]` AND all four red-suite FUs (`[FU-CONCEPTSPINE-TEST-STALE]`, `[FU-OBJSCORING-PARITY-TEST-RED]`, `[FU-PRACTICEINSIGHTS-DURABLE-RED]`, `[FU-WORKSHEET-PDFEXPORT-TEST-RED]`).** Owner byte-reviewed each section separately, then merged. Docs-only handoff; zero product files here.

### Section 1 (`55de9bc`) — the fresh-set correctness bug — owner LIVE-VERIFIED
Finishing a Quick Practice set and tapping the scorecard's **"Build a fresh set"** handed back the SAME questions. The machinery (rotation offset + unseen-first draw) existed and was wired — the **TRIGGER** moved neither of its two selection inputs. **Runtime trace on trunk** (real `PracticePage`, 25-question constant pool): `set #1 = [18,19,20,21,22] offset=4154312268 seen=0` → tap → `set #2 = [18,19,20,21,22] offset=4154312268 seen=0`.

**BOTH root causes fired.** **(A)** the rotation seed cannot move in-session — `sessionStartedAt` is a mount-once `useState` and `filterSignature` only changes with the filters, so the rebuild re-derived an identical offset. **(B) — and NOT as the brief predicted:** the seen-set is never **populated**, not *cleared*. Its loader effect has no `regenerationKey` dep, so it runs once per mount; the just-answered questions were still "unseen" at the fresh draw and the unseen-first partition handed them straight back.

**Fix — additive, confined to the fresh-set trigger.** A `freshSetNonce` state added to `rotationOffset` (`+0` on every existing path ⇒ the normal build is numerically identical; `+1` per fresh set), and `buildFreshSet()` unions the just-displayed ids into `seenQuestionIds` — **deprioritise, never delete** (`selectInRangeFromPool` permutes the matched pool, so the "N available" hint is untouched). **★ The step of ONE is load-bearing:** `n` and `n+1` differ modulo *any* pool size ≥ 2, so a fully-exhausted pool always rotates to a different arrangement, where a larger stride can land back on the same residue and repeat identically. Owner's design intent — rotate + add new; reuse seen by rotation only when availability is short — holds, and nothing is fabricated on either path.

### Section 2 (`78e029a`) — the 4 red vitest suites repaired, every `--exclude` deleted
#503 landed the vitest gate with four suites `--exclude`'d. All four are now fixed and re-included: the step is plainly `pnpm --filter lazytopper exec vitest run`, **no exclusions — the gate is fully strict.** **All four were TEST-side defects; no product bug was hiding behind any of them, and no product code was changed to make a test pass.**

| suite | verdict | before → after |
|---|---|---|
| `ConceptSpine` | stale expectation — the trig note is now SEEDED, so Notes opens the real `NoteModal` instead of the "coming soon" placeholder | `1 failed/21 passed` → **23 passed** (both branches now asserted) |
| `objectiveScoring.parity` | **had never run once** — wrong TS-twin path, born broken in #348 | collection error → **3 passed** |
| `practiceInsights.durable` | stale — `mode` was deliberately dropped from the dedup key in #445 | `1 failed/5 passed` → **6 passed** |
| `worksheetPdfExport` | two harness bugs (post-teardown assertion; `restoreAllMocks` stripping the jsPDF stub) | `5 failed` → **5 passed** |

**★★ THE PARITY SUITE HAD NEVER EXECUTED — and the recorded diagnosis was wrong.** #503 booked it as "Vite can't resolve the sibling root `../../server/routes/objectiveScoring.cjs`". The `.cjs` import resolves **fine**; the broken import was the **TypeScript twin's** — from `src/services/`, `../../lib/…` resolves to a nonexistent `lazytopper/lib/` (the file is `src/lib/objectiveScoring.ts`). One path segment fixed it, grader untouched, no mock added, parity property fully intact. (The #503 entry had actually *noticed* the symptom — "the error surfaces on the adjacent `../../lib/objectiveScoring` import" — but attributed it to a `.cjs` gap. **Read the error's own text before adopting the surrounding theory.**)

**★★ MUTATION-TESTING FOUND A REAL COVERAGE HOLE, not just a red-to-green.** Stripping bracket handling from the client twin did **NOT** redden the parity suite — no case in the table contained a bracket. `PICKS` was widened by 7 so every punctuation class both twins strip is represented; under the same mutation all 3 tests now fail. Every repaired suite was mutation-tested (break the behaviour, confirm red, restore, confirm green); several were **strengthened**, not merely un-reddened.

**VALIDATION (matrices re-run POST-COMMIT — the only truthful run for the 3-dot frozen-path gates):** `scope:guard --mode mixed` PASS (pre-commit, where it must run) · `check:mojibake` PASS · tsc PASS · root guard matrix **190/190** · lazytopper ops matrix PASS with every frozen-path zero-diff guard truthfully green (Tutor⇄QP 41/41, Tutor⇄C&I 31/31, C&I convergence 92/92) · `git diff --check` clean · `lane-overlap` GREEN (one PR, no parallel lane). **Linux Quality Gate CI GREEN including the `vite build`** — the one gate with no local signal.

**★ CI GREEN WAS NOT ACCEPTED AS PROOF THE TESTS RAN.** The linux log was read for the named suites and their counts: `objectiveScoring.parity (3)`, `ConceptSpine (23)`, `PracticePage.freshSet (2)`, `worksheetPdfExport (5)`, `practiceInsights.durable (6)`, totalling **60 test files / 789 tests**. 60 = the previous 59 + the new fresh-set suite, so the arithmetic proves nothing was quietly dropped when the excludes came out.

**NEXT:** three follow-ups opened — `[FU-PRACTICE-CONTROLS-REFRESH-STALE]` (the "Refresh set" button carries the same latent staleness; owner ruled it OUT of this PR — it gets its OWN runtime trace + regression test rather than being blind-routed through `buildFreshSet`), `[FU-TSCONFIG-EXCLUDES-TESTS]` (**nothing typechecks test files** — this is *why* the four suites rotted silently), and `[FU-PRACTICEINSIGHTS-STALE-COMMENT]`. All in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`.

---

## #505 merged — ★★ THE MOCKBUILDER FEATURE IS FULLY DELETED — trunk `b810055`

**Wave-1 Lane B (MOCKBUILDER FULL DELETION), product deletion, 8 files, 474 deletions. Resolves `[FU-MOCKBUILDER-FULL-DELETE]`.** #498 deleted the orphaned `MockBuilder.tsx` page but KEPT the live plumbing; #505 removes the whole feature. **Gone:** the entire HPQ "Mock basket" sub-feature (state, localStorage persistence, add/clear handlers, the basket panel, the per-stack + per-question "Add to mock" buttons — it existed ONLY to feed the dead builder), StudyPlanPage's un-routed "Quick mock" button, `buildMockBuilderUrl`, and the command-palette "Build a Mock Paper" entry. **KEPT (inbound-link safety net):** the `/mock-builder`→`/practice-hub` redirect (`App.tsx:966-967`) and the `:356` nav-active check. **Owner MERGED #505; verified live on trunk `b810055`.** Docs-only handoff; zero product files here.

**★ THE REFERENCE-AUDIT CAUGHT WHAT THE SPEC MISSED (the #498 lesson, again).** The spec named `StudyPlanPage` as the mock-builder's live caller — but StudyPlanPage is **un-routed/dead** (`App.tsx` marks `/study-plan` RETIRED). The ONE genuinely-live navigator to `/mock-builder` was **`HighlyProbableQuestions.tsx`** — a whole "Mock basket" flow building the URL **inline**, which is why a grep for `buildMockBuilderUrl` alone missed it. Audit at the ROUTE level, not just the symbol level.

**★ THREE BREAKAGE-AUDIT CLEANUPS folded in (what else the deletion stranded):** **A-1** removed the orphaned `mock_builder` premium gate in `featureGates.ts` — `UpgradeModal` renders `getPremiumFeatureList()`, so the paywall was **advertising "Mock Builder"**, a feature we just deleted (a fake-premium-surface fix). **A-2** deleted the dead `utils/mockBuilder.ts` (zero importers) **together with** its allowlist entry in `scripts/src/syllabusGuard.ts` (owner-authorized guard touch; root guard matrix re-run **190/190**). **A-3** removed the stale `/mock-builder/10/Maths` URL from `public/sitemap.xml`.

**★★ THE APP.TSX OVERLAY-FREEZE COLLISION (why the dead case was LEFT in place).** Deleting the now-dead `navigateToMockBuilder` case was the only App.tsx edit — and it would have turned CI **RED**. Two ops-matrix gates freeze `lazytopper/src/App.tsx` to **zero-diff vs base**, commit-scoped (`git diff --name-only base...HEAD`): `quick_practice_overlay_additive_acceptance.mjs` (:324/:348) and `check_improve_overlay_additive_acceptance.mjs` (:269/:293). They froze the WHOLE file to prove #490/#476 were "routing-untouched," but it's **over-broad** — it blocks ANY future App.tsx-touching PR, and pre-commit it prints a truthful-but-useless green (HEAD==trunk ⇒ empty range). **Resolution = leave the inert dead case** (its only dispatcher, the palette entry, is removed, so nothing reaches it — inert-vs-removed is functionally identical). Shipped CI-green with ZERO edits to the two locked lanes' guards.

**VALIDATION (all POST-COMMIT — the truthful run):** tsc noUnusedLocals green; root guard matrix **190/190**; lazytopper ops matrix green with **both overlay gates truthfully `App.tsx` zero-diff** (Tutor⇄QP 41/41, Tutor⇄C&I 31/31, C&I convergence 92/92); the linux **Quality Gate CI GREEN** — routing tests **observed green** there (routingParity 9 / multiTopicNav 4 / fullTestNav 4; full vitest **55 files / 750 tests**).

**NEXT:** two follow-ups opened — **`[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`** (a dedicated App.tsx PR: remove the inert case AND narrow both overlay gates from "App.tsx zero-diff" to "the `/practice` + `/check-improve` route elements unchanged") and **`[FU-HPQ-PREDICTED-MOCK]`** (the approved HPQ-mock feature — a `rankBy` seam on the shared `drawBalancedSet` + an additive per-surface "Predicted paper" toggle, ranked by `getAdjustedScore`; its own PR with a full Full Mock live-verify). Both in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`.

---

## #504 merged — ★★ THE BANK MIS-BANDING (Class a) IS FIXED — 44 objective/short rows relabelled off a bogus 5-mark Section-D to their true CBSE value — owner LIVE-VERIFIED — trunk `b810055`

**Wave-1 Lane C (BANK MIS-BANDING), data-only + one shrink-only guard, 14 files (13 `.pack` + `scripts/src/aiTierContentIntegrityGuard.test.ts`), zero engine/grader/forbidden. Resolves `[FU-BANK-SCARCE-BAND-MISBANDING]` Class (a) AND its co-tracked twin `[FU-AITIER-MARKS-MISMATCH]`.** 44 rows were mis-banded `section:"D"/marks:5` — objective or short-content questions the grader treated as 5-mark long-answers (the canonical case: `TG3-056` "Find the value of cosec 60°" grading as a 5-marker; MCQs surfacing as 5-mark Section-D items in Chapter Test / Full Mock). **Owner LIVE-VERIFIED on trunk `b810055`:** TG3-056 now B/2, the 37 objective rows at A/1, the guard backlog emptied. Docs-only handoff; zero product files here.

- **C-OBJECTIVE — 37 MCQ / Assertion-Reasoning:** `D/5 → A/1`, **format unchanged** so they stay objective and grade binary 0-or-1 (an MCQ is a 1-mark item; `scoreObjective` awards 0-or-`totalMarks`, so marks 5→1 keeps it binary — never fractional, never flips objective↔subjective). `test:objective:dedup` PASSED; post-scan **0** objective rows remain at D/5.
- **C-WRITTEN — 7 Short VSA → all Section B / 2 marks:** each true value **PYQ-grounded at fallback level 1** (a real same-subtopic/same-format precedent at B/2 — e.g. `TG3-056`↔`PYQ-M-2024-TRIG-007a`, `REP2-039`↔`PYQ-S-2024-REPR-005`, `ABS2-047`↔`PYQ-S-2026-ACID-015`, all confirmed section:B/marks:2). The owner "written-response ≥ 2 marks" floor held. `solutionSteps` re-authored to the true 2-mark scheme (the prior 5-mark solutions were PADDED — `TG3-059` carried a literal `"Check: May need reworking"` line). `MNM2-037` convention-scaled to B/2 (no clean depth-twin; bracketed between a 1-mk MCQ and a 3-mk 3-part) — owner-confirmed 2.
- **The companion guard was REQUIRED, not scope-creep.** `PACK_5MK_SHORT_BACKLOG` in `aiTierContentIntegrityGuard.test.ts` pinned EXACTLY these 7 written ids as a SHRINK-ONLY baseline (audit 2026-06-17 — the pending content-judgment pass). A shrink-only guard FAILS once a pinned id stops offending, so fixing the data forced emptying the pin in the same PR ("strike the spent check in the PR that spends it"). The guard stays LIVE — still fails on any NEW pack 5-mark `Short` offender.

**★★ THE COUNT WAS 44, NOT THE SPEC'S ~76 — and that gap is the Class-(a)/(b) boundary working.** 50 short-*prompt* `Long` D/5 rows ("Prove √2 is irrational", "Describe the alimentary canal of man") are GENUINE 5-mark proofs/essays — a concise prompt is not a short question. They are correctly banded and correctly EXCLUDED. **CLASS (b) — the ~178 under-stepped genuine-5-mark rows (`solutionSteps` never broken out) — is a DIFFERENT defect and remains UNTOUCHED here** (still OPEN under `[FU-BANK-SCARCE-BAND-MISBANDING]` Class (b)).

**★ The two `.pack1` generators are structurally immune** (`triangles.pack1`, `trigonometry.pack1`): `makeQuestion` derives section+marks+format all from ONE `cbseFormat` key (`D → 5/"Long"`), so a mis-banded D/5 objective row is impossible there — proven from the code, not scanned.

**Anti-fabrication held:** the diff touches only `section`×44, `marks`×44, and the 7 written rows' `solutionSteps` — ZERO edits to `questionText`/`options`/`answer`/`correctOption`/`finalAnswer`. Every mark value traced to a real PYQ/NCERT/Exemplar precedent; nothing invented.

**Gates (all green; CI `quality-gate` PASS 3m49s on linux incl. the build):** tsc · check:mojibake · scope:guard(product) · lazytopper `test:matrix:all` · root `scripts` `test:matrix:all` **190/190** · `git diff --check` · `lane-overlap` PASS (file-disjoint from the other Wave-1 lanes).

**NEXT:** the bank mis-banding Class-(a) lane is CLOSED. Class (b) (~178 under-stepped genuine-5-mark rows) remains OPEN as a separate content lane. See `NEXT_ACTION.md`. (⚠ trunk tip `b810055` also carries #505 MockBuilder-delete — a SEPARATE lane with its own handoff; the one-commit SHA lag between #504's merge `b799952` and the recorded `b810055` is expected.)

---

## #503 merged — ★★ VITEST NOW RUNS IN CI — the 59 render/unit suites that never had a gate — trunk `579822e`

**Wave-1 Lane A (CI-VITEST GATE), infra-only, one file (`.github/workflows/quality-gate.yml`, +24), zero product `src/`. Resolves `[FU-CI-GATE-VITEST]`.** For this repo's whole history, `vitest run` (the `src/**/*.test.{ts,tsx}` suites — routing, aliveness, scorecardFeed, ConceptSpine, the overlay integration tests) ran **only on developer machines, and not on Windows at all** (the rollup-linux pin strips the win32 binary). CI gated the two `test:matrix:all` ops-matrices, the build, and mojibake — **never vitest.** So every vitest regression shipped green. **This is the root cause behind the green-but-broken builds (#484, #490): the tests that would have caught them never executed in CI.** #503 adds one required `Vitest suites (lazytopper)` step on the linux runner (where rollup works); a red vitest now fails CI.

**★★ THE GATE'S WORTH WAS PROVEN THE DAY IT LANDED — FOUR SUITES WERE ALREADY SILENTLY RED ON TRUNK.** They had rotted undetected (added Jul 1–9, PRs #321/#337/#348/#349) precisely *because* vitest never ran in CI. Each is `--exclude`'d so the new gate protects the **55 healthy suites now** without blocking every PR, and each is booked as its own fix-then-delete-the-exclude follow-up (product/test lane, NOT infra):

| Excluded suite | Linux status | Cause (deterministic) | Follow-up |
|---|---|---|---|
| `topichub/ConceptSpine.test.tsx` | RED | data-drift stale ("Notes coming soon" gone) | `[FU-CONCEPTSPINE-TEST-STALE]` |
| `services/objectiveScoring.parity.test.ts` | RED | Vite can't resolve sibling root `../../server/routes/objectiveScoring.cjs` | `[FU-OBJSCORING-PARITY-TEST-RED]` |
| `services/practiceInsights.durable.test.ts` | RED | `firestore down` mock throws | `[FU-PRACTICEINSIGHTS-DURABLE-RED]` |
| `worksheet/worksheetPdfExport.test.ts` | RED (5) | `pdf.addImage is not a function` — jsPDF is **fully `vi.mock`'d**, so deterministic | `[FU-WORKSHEET-PDFEXPORT-TEST-RED]` |

**★★ THREE DURABLE LESSONS (full text in SESSION_LOG):** (1) **The Windows full-run is a FLAKY ORACLE — not evidence of linux status.** A ~1200s collect fires 5s per-test timeouts on *random* suites each run (two runs disagreed 7-vs-5 red files); *isolation* runs are the reliable signal, and the fast linux runner does not flake. (2) **A green run that EXCLUDES a suite cannot report that suite's status** — to get the linux truth for the 4 excluded, a *temporary* `continue-on-error` diagnostic step ran only them on the real runner (`Test Files 4 failed / Tests 7 failed | 26 passed`), then was reverted (net diff back to +24). All 4 red on linux; none unexpectedly green ⇒ the exclude-list stands as approved, and the cross-platform determinism reasoning (mocks / module-resolution / data-drift are platform-independent) **held on the real runner.** (3) **vitest 3.2.4 `--exclude` MERGES with the defaults** (no `node_modules` leak — verified via `vitest list --filesOnly`), so the exclusion lives entirely in the workflow YAML; local `npm test` still shows all 59 suites to developers.

**Owner byte-reviewed the diff before commit (Lane A discipline: STOP-BEFORE-COMMIT), then merged #503.** First linux run GREEN (the 55 pass), final clean run GREEN (3m15s). ⚠ **Non-blocking:** the runner warns `actions/setup-node@v4` targets deprecated Node 20 — a one-line bump for a future infra pass, not this PR.

**NEXT:** the two other Wave-1 lanes remain in flight (`[FU-MOCKBUILDER-FULL-DELETE]` — a PRODUCT question; and bank mis-banding — a content lane); plus the 4 new test-fix FUs above, each a small product/test lane that ends by deleting its `--exclude` line.

---

## #501 - THE QP SCORECARD DENOMINATOR BUG IS FIXED - owner LIVE-VERIFIED ("5 of 5") - trunk `7979a89`

**The Quick Practice scorecard now counts the set the student SEES, not the engine's over-fetched pool.** A full-page 5-MCQ session showed "5 of 75 attempted" (owner screenshot): attempts were counted CORRECTLY (5 of 5), but the denominator read `questions.length` (the OVER-FETCHED pool) instead of `filteredQuestions.length` (the DISPLAYED set). Any marks/section filter over-fetches (`engineCount = chosen count x5`, cap 100), so the pool varies (50/75/100...) while the student only ever sees the chosen count. **Owner LIVE-VERIFIED: "5 of 5" confirmed. Docs-only handoff; zero product files here.**

- **The fix (feed-only, `PracticePage.tsx`)** - all FIVE scorecard-facing reads now use the DISPLAYED set `filteredQuestions.length`: `totalInSet` (the denominator), `sessionStats.total`, `allDone`, the `showScorecard` guard, and the finish telemetry. The pool-empty guard (`questions.length === 0`, inside `committedPoolSelection`) is correct and left unchanged.
- **FORBIDDEN files untouched** - `ResultsScorecard.tsx` and `scorecardVariants.ts` READ the fields correctly; the bug was the FEED. Verified zero-diff.
- **Bonus from the same root cause** - the all-attempted auto-offer now FIRES when the displayed set is complete. It previously compared against the pool, so on any filtered/over-fetched set it could never trigger.

**THE FRAMING WAS CORRECTED MID-LANE.** The first investigation constructed a WRITTEN set with no attempt signal to get "0 of N" and mis-framed "attempted=0" as half of "the" bug. The owner's screenshot proved otherwise: the real bug is the DENOMINATOR only; MCQ attempts were always counted. The written "0 of N" survives ONLY as a labeled test control (the denominator is independent of the attempt count) - NOT the owner's bug, NOT a wipe.

**THE PROOF - the REAL PracticePage on the full-page path.** The regression test (`PracticePage.scorecardFeed.test.tsx`) mounts the actual `PracticePage` on the full-page preset path (`source=practice` - NOT the tutor overlay's `arrivedTargeted` bypass, which is why a prior "does not reproduce" was a false negative) and reproduces the owner's exact screenshot: "5 of 5 - 1/5 MCQs correct - 20% accuracy" (was "5 of 75"). Mutation-verified: reverting only the `totalInSet` line reproduces "5 of 75".

**NEXT:** the scorecard lane is CLOSED. `[FU-QP-SCORECARD-ATTEMPTS-WIPED]` RESOLVED by #501; the re-scoped `[FU-QP-WRITTEN-BINARY-CHECK]` (subjective answers checkable + graded binary 0/1, and that check produces the attempt signal - a product-behaviour lane) is logged in `OPEN_QUESTIONS_AND_FOLLOWUPS.md`. See `NEXT_ACTION.md`.

---

## #492 → #494 → #496 → #498 — ★★ THE PRACTICE-HUB v6 REDESIGN IS LIVE — **owner LIVE-VERIFIED** — trunk `6d991c0`

**`/practice-hub` is rebuilt to the locked v6 design, and the routing never moved.** The hub is the app's highest-connectivity page — 7 outbound route families, 22 inbound caller files, plus the `/mock-builder` redirect — so the whole risk was that a re-render quietly changed a URL. It did not. **Owner LIVE-VERIFIED (#492, #494, #496). Docs-only handoff; zero product files here.**

- **#492 (`1938634`) — the rebuild.** Two-step flow ("what to work on" → "how to practise"), topic selection as a DROPDOWN for both scopes (single-select radio / multi-select checklist + removable pills, rendered INLINE so no ancestor `overflow` can clip it), four accent-coloured mode cards, a navy Mistake-Intelligence rail, and a NEW desktop-only trend sparkline. Cut from the UI (routes untouched, render removed): the blueprint preview, the predicted-questions tabs, the More-options accordion, the quick links, the topic-reference panel, and **all developer language** ("intent-first mode", "the desktop bridge", "nothing generates a new paper"). One responsive component — desktop and mobile in the same file.
- **#494 (`3e7b7ad`) — the cards arrive alive.** #492 shipped `opacity: 0.65` on the mode-card `<article>` whenever no topic was picked. Because that sits on the card it multiplied EVERY descendant — the accent stripe, the icon tile, the chips — so the section arrived greyed out. It was also PATCHY: Predicted and Full Test always have a `to`, so two cards rendered full-strength beside two dimmed ones.
- **#496 (`e560792`) — vivid + guarded.** Accent-tinted resting borders (`MODE_ACCENT.line`), a 5px full-opacity stripe, deeper ~92% tints, the prototype's page surface — plus the **aliveness guard** that makes the #492 class impossible to ship silently again.
- **#498 (`6d991c0`)** — deletes the dead `pages/MockBuilder.tsx` (946 lines, zero imports) and rewrites the stale `DesktopPracticePage.tsx` header, which still described the pre-#492 design.

**★★ THE ROUTING PROOF — a before/after capture diff, not an inspection.** One capture harness whose CTA regexes match BOTH vocabularies (trunk's "Open Highly Probable Questions" and the redesign's "Open highly probable") was run against the redesign, then against `git checkout <trunk> -- DesktopPracticePage.tsx`, and the two outputs diffed. **25 URLs — 5 scope scenarios × 5 CTA families — diff EMPTY.** Those captured strings are now pinned in `DesktopPracticePage.routingParity.test.tsx`, so drift in a builder, in `source`/`returnTo`, or in the scope→param mapping fails there first.

**★ ONE DELIBERATE, OWNER-APPROVED RELAXATION.** The retired Timed-Drill card folded into Quick Practice as a toggle. Trunk's separate `timedDrillPath` carried `timed=1` but **only passed `topic` for single-topic scope** — reusing it would have SILENTLY COLLAPSED a multi-topic selection and dropped focus context. So the toggle adds `timed=1` to the SAME scoped builder instead. The proof therefore reads: **byte-identical with the timer OFF (the default), scope-preserving when ON.** Both pinned in the parity test. This is recorded so it is never mistaken for drift.

**★★ THE DURABLE LESSON — MEASURE THE RENDERED STYLE BEFORE "RESTORING" IT.** The #494 brief listed three fixes. A diagnostic that dumped the four cards' ACTUAL inline styles proved **two of the three were already done**: the 4px accent stripe, the resting box-shadow, the gradients, the scope-card top stripe and the trend-card shadow were all present and already matched the prototype. Re-applying them would have been pure churn with regression risk. The entire defect was the one `opacity` line — the accent WAS rendered, then multiplied down.

**⚠ KNOWN OPEN, NOT SHIPPED:** the avatar dropdown is occluded by the hub cards (`[FU-HUB-DROPDOWN-ZINDEX]`) — the fix is known and correct but touches a FORBIDDEN path; and the QP scorecard denominator report (`[FU-QP-SCORECARD-ATTEMPTS-WIPED]`) — at the time diagnosed but deferred (now **RESOLVED by #501** — see the topmost entry above). Both in `OPEN_QUESTIONS_AND_FOLLOWUPS.md` with full evidence.

**NEXT:** the hub lane is CLOSED. Both remaining items are follow-ups, not lane work. See `NEXT_ACTION.md`.

---

## #490 → #491 → #493 → #495 — ★★ THE QP OVERLAY ON THE TUTOR IS LIVE — the tutor⇄QP arc is COMPLETE — **owner LIVE-VERIFIED** — trunk `273cfe8`

**The tutor can now hand a student a scoped practice set without losing the thread.** "Practise this" opens the real `PracticePage` **as an overlay over the tutor** (the C&I overlay's twin), filtered to the microconcept; the scorecard renders in the panel; closing returns to the thread and the tutor quotes the real score. **Owner LIVE-VERIFIED. Docs-only handoff; zero product files here.**

**⚠ This arc shipped a production break and is recorded with it intact (full text in SESSION_LOG).** #490 mounted a nested `<MemoryRouter>` inside the app's always-present `<BrowserRouter>`; react-router throws Router-in-Router, so **every student who tapped "Practise this" got an error page**. Owner caught it live. Response: **revert first** (#491, verified byte-identical to the healthy pre-overlay `0b22ee7`), then fix forward (#493) after **spiking three approaches against react-router 7.14.0**.

- **#493 — the fix.** Seed the route with the EXISTING router: `UNSAFE_RouteContext` reset (zero matches) + `<Routes location={seedUrl}>`. `useRoutes(routes, locationArg)` wraps its output in a `LocationContext.Provider`, so `useSearchParams`/`useLocation`/`useParams` all resolve to the seed — `PracticePage`'s ~36 route reads are UNCHANGED. **No nested Router.**
- **Nav containment** — dropping the nested router dropped history isolation, so a `NavigationContext` override routes `push`/`replace`/`go` to `onClose`. That contains every in-panel navigation (including ones nobody enumerated) with **zero edits to shared child components**, so their non-overlay behaviour is byte-identical *by construction*.
- **#495 — the named return.** Scorecard `returnTicket` ("Back"-tagged secondary row, via the shared `returnTicketAction`) + a named "Back to your tutor →" beside the ✕. Both overlay-gated, both calling `overlay.onClose`.
- **Kept throughout:** the shared `tutorOverlay.css` frame (C&I byte-identical; QP's own 760px width knob), the storage round-trip graded hand-back (`composePracticeRecordReturnOpener` — NOT rebuilt), single-topic + filtered-to by construction.

**Verified invariants (byte-reviewed on the committed diff):** `overlay === undefined` ⇒ `PracticePage` + its scorecard **byte-identical** (every hunk gated; the scorecard ticket passed only in overlay mode) · **C&I unregressed** (31/31, blank diff) · engine / fetch-filter / persistence / grader / graded-read **zero-diff** · gates re-run **post-commit**, where the three-dot forbidden-diff is real.

**★★ THE DURABLE LESSON:** **a test for anything that renders inside the app's router/shell must reproduce the production wrapper tree — and carry a CONTROL case that reproduces the bug.** #490's test mounted the overlay in isolation (legal there, illegal in production) and its ops gate asserted the *defect itself*. The fix's test mounts an outer router at the real nesting depth, leads with a control asserting the nested router throws, and the gate now **gates the harness shape** so isolation cannot come back.

**NEXT:** the tutor/QP lane is CLOSED — stand down. The **practice-hub redesign** (#492/#494 merged, closing PR open) is a SEPARATE lane with its own handoff. See `NEXT_ACTION.md`.

---

## #488 merged — ★★ QP MULTI-TOPIC PRESETS ARE LIVE — a ≥2-topic selection now produces a genuine mixed set spanning all chosen topics (both Maths & Science) — **owner LIVE-VERIFIED** — trunk `9edb939`

**The QP SURFACE arc is COMPLETE — Quick Practice is reachable, navigable, single- AND multi-topic.** #481→#486 made the preset entry usable single-topic; #488 (shape 3c) closes the last gap: the hub could select multiple topics but the QP CTA **collapsed to the first** before the questions. Now a `≥2 topics` selection fans out per-topic and merges into one **pooled-and-shuffled mixed set**. **Owner LIVE-VERIFIED: multi-topic works, both Maths and Science. Docs-only handoff; zero product files here.**

- **Shape 3c (per-topic fan-out + merge + pool-and-shuffle)** — mirror the shipped per-SECTION `marks="all"` fan-out (`PracticePage.tsx`), keyed on **topic** instead of section: fan out ONE unchanged `buildPracticeQuestionsWithAiTopup` per chosen topic, merge, pool-and-shuffle. **The composition core is a NEW pure module (`multiTopicPractice.ts`) — no React/engine/IO.**
- **Owner rulings (locked):** POOLED-AND-SHUFFLED; **50% competency floor HARD (`COMPETENCY_FLOOR=0.5`), wins every conflict** — enforced on the merged pool, the topic split SOFT and bends when the floor needs room (per-topic ~50% fill spreads competency so no topic is squeezed out — a naive global pick DID squeeze a third topic, **a test caught it** — then a global top-up if still short); **topic split proportional-to-availability, ≥2 floor, shortfall→richer, never fabricated**, via the single swappable `topicShare()` (v1 = bank availability). **FLATTEN not nest** — each per-topic fetch runs the board blueprint internally; the split only decides how many each contributes.

**Verified invariants (byte-reviewed on the committed diff):**
- **Single-topic BYTE-IDENTICAL** — gated behind `≥2 topics`; single-topic paths are ternary-wrapped (`isMultiTopic ? new : original`), evaluating to the exact trunk expression when false. The ONLY fetch-conditional change is `if(committedMarks==="all")` → `else if`, with **zero body removals** in either existing block. The additive guarantee.
- **ZERO engine-service edits** — `buildPracticeQuestionsWithAiTopup` / `generatePracticeSet` / `getLikelyQuestionsForConcept` / `selectInRangeFromPool` untouched; multi-topic REUSES them per-topic.
- **`sessionRecords.ts` byte-identical** — a forbidden-file touch was caught (the three-dot forbidden-guard **false-passes on UNCOMMITTED work**), reverted, and the `topicKeys` logic moved to the non-forbidden QP service via a post-build override.

**Two owner-ratified design calls:** competency-HARD/topic-SOFT with per-topic spreading; section proportions NOT re-enforced post-merge (re-enforcing would be the forbidden topics×sections nesting — competency% + split + pooled-shuffle are the ratios that matter).

**★★ THE DURABLE LESSON (full text in SESSION_LOG):** the investigation lane **falsified the spec's 3a/3b fork from the code** — **3b is structurally impossible** (`focusBankIds` only re-orders a pool already hard-scoped to one `topicKey` at `practiceSetGenerator.ts:287`) — and found **3c** by mirroring the shipped per-section fan-out. Reusing the working machinery per-topic (zero engine edits) beat both of the spec's options. **An investigation earns its keep by falsifying the spec's framing, not just answering its questions.**

**NEXT:** **the QP OVERLAY on the tutor** (the C&I overlay's twin) — dispatched as an INVESTIGATION first (does `PracticePage` render in a tutor panel? how does chooser→built behave in a panel vs a page?). ★ The graded-context read is **already done** for QP (`composePracticeRecordReturnOpener` — QP is the reference impl C&I copied), so the overlay is only the HOSTING work. Then `[FU-QP-MULTITOPIC-EXAM-WEIGHT]` (swap `topicShare` to exam-weight) as a small fast-follow. See `NEXT_ACTION.md`.

---

## #483 → #486 merged — ★★ THE QP A1 ENTRY REDESIGN IS NOW GENUINELY USABLE — reachable (from the hub) AND navigable (browser-back + breadcrumb CTA both return to the chooser) — **all four owner LIVE-VERIFIED** — trunk `889ab6d`

**#481 shipped the QP preset entry correct-but-invisible; this four-PR arc made it actually work — both directions, both controls.** Quick Practice's redesign is now reachable in production and you can get *out* of a built set back to the preset chooser by either the browser back button or the top-left breadcrumb. **All four PRs owner LIVE-VERIFIED. Docs-only handoff; zero product files here.**

- **#483 — presets reachable from the hub** (source-keyed gate). #481's presets were gated on a topic-less "direct visit" state production never produces (every route carries `topic=`). Fix: re-key `deriveArrivedTargeted` on **`source`** — `source=practice` (hub CTA) → presets; `source=tutor`/`targeted=1` → auto-build. **★ The agent CORRECTLY DEVIATED from the spec's literal rule** (`source==="tutor"`): it mapped ~21 entrypoints that carry a topic *without* `source=tutor` (Topic Hub concept-row, `MentorSolveDrawer` "practise next", HPQ, Me/Dashboard/Chapter-Test CTAs) — the literal rule would have dumped every one on the chooser. Net observable change = exactly one. `[FU-QP-PRESETS-UNREACHABLE]` resolved.
- **#484 → #485 — back-nav (the honest two-step — recorded, not airbrushed).** #484 tried to make built→chooser→hub a real history chain, but its `pushBuiltHistoryEntry` did `navigate(pathname+search, {state})` — **identical URL, state-only.** React Router treats a same-URL navigate as a **replace/no-op** (RR #5362), so **no poppable entry was created and back skipped to the hub.** **It passed every gate + CI + 14/14** because the test only exercised the pure helper in isolation — it never mounted a router, so it never proved the entry gets *created*. **Owner live-verify caught it on the stable link.** **#485** fixed it: the build now adds a real **`built=1` search param** (`setSearchParams(…, {replace:false})`) → a genuinely different URL → a real poppable entry; a **stale-marker strip** keeps the chooser URL clean (closing the Edit-filters→rebuild hole); and the test now mounts a **real `createMemoryRouter`** and asserts the entry is pushed and poppable (it fails under #484's approach).
- **#486 — the breadcrumb "Back" CTA.** #485 fixed the browser *gesture*, but the top-left breadcrumb CTA was a SEPARATE path (`navigate(practiceBackTo)`, no `isBuilt` awareness) — still hard-jumped to the hub from a built set. Fix mirrors #485: `isBuilt && !arrivedTargeted` → return to the chooser (`setIsBuilt(false)` + strip `built=1`); else → hub as before. Label: a built set reads **"Back to quick practice"**; explicit overrides (Topic Hub "Back to Trigonometry" etc.) preserved. Router-mounted test, **17/17**. `[FU-QP-BACK-NAV]` resolved (gesture #485 + CTA #486).

**Invariants across all four (byte-reviewed):** the rotation/`seenQuestionIds` engine, the presets component (`QuickPracticePresets.tsx`), `persistQuickPracticeSession`, the grader, MI, the filter wiring, the timer, and the hub (`DesktopPracticePage`) are **byte-identical**; tutor/targeted auto-build entry is byte-identical throughout. Each PR = 2 files (`PracticePage.tsx` + the acceptance test).

**★★ THE TWO DURABLE LESSONS (full text in SESSION_LOG):** (1) **Gates prove structure; live-verify proves REACHABILITY and the GESTURE.** #481 shipped unreachable, #484 shipped a broken back-gesture — BOTH passed every green gate and CI; only walking the real navigation on the stable link caught them. (2) **A router/history behaviour claim needs a ROUTER-MOUNTED test, never a pure-helper test alone** — #484's 14/14 asserted the decision logic in isolation but never proved the history entry is created and poppable. Both **strengthen `[FU-CI-GATE-VITEST]`** (these router tests only ran locally; CI still doesn't run vitest).

**NEXT:** **Piece 2 — multi-topic presets** (un-parks `[FU-PRACTICEHUB-MULTITOPIC-CONTEXT-DROPPED]`), dispatched as an **investigation lane first** (the fetch fork + rotation-across-topics semantics are unverified); then **the QP overlay mechanism** (the C&I overlay's twin). See `NEXT_ACTION.md`.

---

## #481 merged — ★★ QUICK PRACTICE A1: THE PROGRESSIVE-DISCLOSURE ENTRY + OPTIONAL TIMER IS LIVE — **owner LIVE-VERIFIED** — trunk `ec3275c`

**Quick Practice no longer opens on a raw six-filter wall.** A direct/hub visit now lands on **four stylised preset cards** — Quick drill / **Board mix** (default, competency-inclusive) / Competency / High-marks — plus a **gated "My weak areas"** 5th, with the **full five-dimension filter (incl. Source)** one tap behind **Customise**, an **optional student-toggled timer**, and a **mobile swipe carousel**. **Presentation-only.** 4 product files (`PracticePage.tsx` +199/−15 + 3 new practice files: `QuickPracticePresets.tsx`, `quickPracticeEntryStyles.ts`, `QuickPracticePresets.test.tsx`).

**Verified invariants (byte-reviewed):**
- **A preset = a bundle of the EXISTING `setCommitted*` setters + `setIsBuilt(true)`** — byte-identical to `PracticeControls.onBuildSet`, just with forced values. The **reshuffle/rotation engine, the filter wiring, `practiceQuestionBuilder`, `practiceSetGenerator` and `persistQuickPracticeSession` are ALL ZERO-DIFF** — a revisit still reshuffles (seeded per session), seen questions still deprioritise, and the tutor still receives QP's graded work via the same `perQuestionRef` path as C&I.
- **Difficulty stays `"all"` on every preset** (the marks bucket carries the band via `DIFF_COMPAT_BY_MARKS`); **Competency = case-based** (single-select can't do case+AR) and **gates honestly per topic** against the real bank (`buildPracticeQuestionsFromEngine(boardPattern:"E")` returns `[]` when empty — never fabricated). Timer reuses ChapterTest's `formatClock` + 1.2-min/mark budget; QP **never auto-submits**. Carousel is pure CSS `@media`, no `useIsDesktop`.

**★★ THE LESSON — presets shipped correct-but-UNREACHABLE.** The code was right; the entrypoint was not. The preset screen was gated on a "direct visit, no `topic` param" state — but **production has no topic-less QP entry**: every route is hub → pick topic → CTA, which always carries `topic=`, tripping `arrivedTargeted` → auto-build → **the presets never showed.** **Owner LIVE-VERIFY caught this; the green gates did not** (gates prove structure; only walking the real navigation proves REACHABILITY). **Fix in flight:** Piece 1 (`feat/desktop-pr-qp-presets-hub-reachable`) re-gates the entry on `source` (`source=practice` → presets; `source=tutor` → auto-build). Logged found-and-fix-in-flight. See `[FU-QP-PRESETS-UNREACHABLE]`.

---

## #478 + #479 merged — ★★ THE TUTOR READS THE GRADED WORK — question + per-step digest reach the model; the C&I overlay + graded-context arc COMPLETE — **owner LIVE-VERIFIED + a real 28-call rubric-2 eval** — trunk `a198bf1`

**The tutor is no longer half-blind on return.** Before: *"you got 4/5."* After it names the question the student worked AND the actual lost step — *"the 1 mark came off the presentation, not your maths — on step 4 you left off the unit, write 20√3 m."* This closes the half-blindness the #476 C&I overlay left ([FU-TUTOR-OVERLAY-QUESTION-TO-MODEL]).

**#478 `b7042b2` — three additive, overlay-gated seams (byte-verified):**
1. **Option 2b** — `onClose` carries the graded `WorksheetGradeResponse` **in-hand** (built lock-step with the record via `buildOverlayReturnResponse`), so no cloud re-read and it survives an honest-failure persist skip. Overlay-gated ⇒ a direct `/check-improve` visit stays byte-identical (#476 additive guarantee held).
2. **Rich opener** — `composeCheckImproveRichReturnOpener` (QP's `composePracticeRecordReturnOpener` re-flavoured) **added BESIDE** the byte-identical thin `composeReturnOpener`; returns `null` on thin data ⇒ falls through to the thin honest floor.
3. **`returnedWork` block** — the question + per-step digest reach the model as **one one-shot context object** (`TutorRequest.returnedWork`), rebuilt at the server trust boundary (`normalizeReturnedWork`, mirroring `normalizeFigures`), rendered by `returnedWorkBlock` with §6.4 anti-confabulation rails. **Swap point corrected to `closeCheckImprove`** — the spec's `:275` was the retired navigate leg.
   - **Invariants held:** grader (`checkSolution.cjs`) / `SessionRecord` / MI (52-anchor) / `ResultsScorecard` / the thin `composeReturnOpener` — **byte-identical**; the #476 additive guarantee stayed; the overlay acceptance gate **evolved 24 → 31/31** (now asserts the new seams + the FLOOR/BESIDE invariant).
   - **Text-only MVP:** an image-question is **described** ("the question you uploaded"), never transcribed — there is no image channel to the tutor model.

**#479 `a198bf1` — the digest flag flipped ON, on REAL evidence (byte-verified one-line flip):**
- `RETURNED_WORK_DIGEST_ENABLED false → true` (`tutorRoundTrip.ts:406`) + the gate assertion pinning the ON value + doc comment. **Zero logic touched** — pure flag.
- **The eval was REAL, not a simulation:** 28 live `gemini-2.5-flash` calls through the actual `handleTutorRequest` path (`isStubMode → false`), digest OFF vs ON, temp 0.55. **Rubric-2 clean: 12/12 digest-ON runs grounded — 0 invented steps, 0 grade contradictions**, including the clean-sheet invent-a-mistake trap and the described-image rail.
- **★ The finding that tipped it from "safe" to "better":** digest OFF, the model *re-derives and ASSUMES* which steps were right (an assumption it was never given); digest ON, it reads the `status` list. **The digest CLOSES a latent confabulation path** the question-only version left open — ON is safer, not just warmer.

**Owner-verified live:** the overlay round-trip on the stable link — *"the tutor can now read the graded answer."*

**★ Durable lesson (see SESSION_LOG):** a change to the **model's input** ships on a **LIVE eval**, not a byte-diff — and here the live eval found the flag ON to be **safer** than OFF, not merely nicer.

**NEXT:** **the Quick Practice loop overlay** — the twin of the C&I overlay (its groundwork was mapped this session; QP is already more overlay-ready than C&I was). See `NEXT_ACTION.md`.

---

## #476 merged — ★★ THE TUTOR ⇄ C&I OVERLAY IS LIVE — the student grades without leaving the thread — **owner byte-verified** — trunk `cca0a5d`

**#476 `cca0a5d` (the tutor⇄C&I overlay, Option A, responsive all sizes).** The C&I side of the two-overlay goal the whole arc served is **COMPLETE.** The tutor's "Get my attempt marked" CTA no longer navigates to `/check-improve` — it opens the **real `DesktopCheckImprovePage` as an in-tree panel over the dimmed light tutor** (desktop/tablet right-slide `min(88%,920px)`; mobile full-screen `100dvh` sheet). The student grades, reads the scorecard **in-panel**, taps **"Back to your tutor →"**, and the graded record is handed straight back via the **existing `composeReturnOpener`** — no navigate, no poll, no waiting banner, at any width.

**The invariants held (this is the point):**
- **Additive guarantee:** `overlay===undefined` ⇒ C&I byte-identical to today; a direct `/check-improve` visit still `navigate()`s and opens with an empty question. Enforced by the new `check_improve_overlay_additive_acceptance.mjs` (**24/24**, wired into the lazytopper matrix).
- **Grader (`checkSolution.cjs`), `SessionRecord`, `ResultsScorecard`, MI (52-anchor), `tutorRoundTrip.ts`, `composeReturnOpener` — ALL byte-identical** (git-scoped zero-diff, asserted). Convergence gate **92/92** (`:320` + MI moat green). The owner's non-negotiable line ("don't change the grader or C&I") held mechanically.
- **The in-memory question handoff:** the tutor receives the raw question via the `onClose` payload (`{text, imageBase64}` from C&I's live state) — **never persisted**, so the record is untouched.
- **The mobile navigate/poll/banner round-trip for check-improve was RETIRED** (the overlay replaces it at every width) — not orphaned. `routeToCheckImprove` was the ONLY creator of a `surface:"check-improve"` marker; the **practice** leg still routes out and keeps its banner + `count:5`.
- `tsc` clean, **CI `quality-gate` green** (the linux `vite build` + vitest a Windows box can't run), Vercel deployed.

**Two PRs, distinct:** BUILD **#476** (merged) + the DRAFT **#475** (`invts/tutor-overlay-investigation`) — the investigation artifact, reference-only, **never merged**.

**Three spec corrections the build made (durable lessons — see SESSION_LOG):** (1) **`useIsDesktop` gates `MobileShell` too, not just camera/QR** — a mobile overlay would have contained the app's own escape-the-tutor nav; a 4th overlay-gated hunk renders C&I bare inside the overlay. (2) Dropped a stale spec §7.5 ("mobile still navigates") that contradicted the locked responsive ruling. (3) The in-memory question reaches the tutor **host**, but feeding it into the **model's context** is a separate prompt-eval lane — `[FU-TUTOR-OVERLAY-QUESTION-TO-MODEL]`.

**NEXT:** **the Quick Practice overlay** — the second of the two overlays the whole line of work serves (its groundwork was mapped this session; see `NEXT_ACTION.md`).

---

## #472 merged — ★★ C&I QUESTION-SIDE PARITY IS COMPLETE — the question side gained the answer side's hands — **owner byte-verified** — trunk `0649e20`

**#472 `0649e20` (question-side parity) + #473 `8656147` (cofounder skill v2.1) landed since the #471 handoff.** The convergence arc (#466→#470) made C&I one fluid component; **this PR gives its QUESTION uploader everything the answer uploader had.** 9 files, all gates green (convergence acceptance **92/92**, qr channel **47/47**), CI `quality-gate` green.

**The four mirrors** (`DesktopCheckImprovePage.tsx`): the plain `<input>` → **`<EquationInput>`** (the math palette, `clearDetection` preserved) · a **`<QrAnswerHandoff>`** in a NEW `"question"` mode · mobile **Camera/Files** on the existing `qFileInputRef` · **paste** on both card `<section>`s (file-only; text paste untouched). Both textareas now **auto-grow** (new `autoGrow` prop, **default OFF** — SolutionChecker stays byte-identical; its test passed untouched, run under vitest 8/8). Answer/question boxes start at the same min-3 height (measured symmetric, 75.6px at every width).

**★★ THE 6TH SITE THE FROZEN SPEC MISSED — caught before it shipped.** `mode="document"` copy is answer-shaped (*"pick the PDF of your answers"*), so a third `QrHandoffMode` value **`"question"`** was folded in. The spec's map named **five** client sites; the value is also validated **server-side** — `qrUploadChannel.cjs` had `VARIANTS = new Set(['document','photo'])` and coerced any unknown mint to `'document'`. **The five client sites alone would have shipped a silent coerce-to-document: the phone shows a QUESTION student "your answers".** The round-trip trace (mint → `peekSlot`), not the spec, found it; added `VARIANT_QUESTION` (the 6th site) and proved the round-trip with a channel-test `mint→peek` assertion (47/47). *A frozen site-map can still be incomplete — verify the round-trip, don't trust the enumeration.* **Additive throughout ⇒ `document`/`photo` byte-identical ⇒ the answer QR + SolutionChecker are untouched;** `Record<QrHandoffMode>` made tsc enforce exhaustiveness across every site.

**★ ResultsScorecard + SolutionChecker are now WIRED into the acceptance FORBIDDEN set** (owner: *"must not change"*) — previously protected by nothing but good intentions.

**#473** (`8656147`) is skill self-knowledge, not product: cofounder method v2.1 (green-board trap, doc culture, `ls-remote`/appendix corrections; dropped the vestigial `cofounder-skill/references/`). Noted here for traceability; no product surface moved.

**NEXT:** **the tutor overlay** — the goal the whole C&I arc served. ⚠ Its investigation spec needs a **v1.2**: #466 made C&I ONE fluid container-relative component, which **falsifies the two-component premise** the v1.1 spec rested on. See `NEXT_ACTION.md`.

---

## #466 → #470 merged — ★★ THE CHECK & IMPROVE CONVERGENCE ARC IS COMPLETE — **owner LIVE-VERIFIED at 360 / 768 / 820 / 1024 / 1440** — trunk `2c59dd2`

**Four product PRs, one CI fix, all merged.** C&I shipped as two components — `DesktopCheckImprovePage.tsx` (2,734L) and `pages/app/CheckImprove.tsx` (1,656L) — chosen by a route ternary on `isDesktop`. It is now **ONE fluid responsive component at every width**, and the mobile twin is **deleted**.

**★ WHY THE ARC EXISTED — this is the thread, not a cleanup:** the tutor is to host **Quick Practice + Check & Improve as in-tutor OVERLAYS**, so a student never leaves the tutor. C&I could not live in an 820px overlay panel because `useIsDesktop()` measures the **window, not the container** — an 820px panel on a 1440px window would have mounted the 2,734-line desktop twin inside it. **The convergence was a PREREQUISITE for the overlay, not tidy-up.**

| PR | Squash | What it did |
|---|---|---|
| **#466** | `f895306` | **The convergence.** Killed the inverted mobile order (answer-above-question), 5 purples → `PRIMARY_GREEN`, false "PNG or JPG" copy → canonical `UPLOAD_LIMIT_SENTENCE`. **F13:** removed all **13 `isNarrow` sites** the file drove off its OWN `matchMedia("(max-width:960px)")` — that flag asked the WINDOW, so the 820px overlay was already broken. `CARD_BASIS = 340` (measured: sidebar 260 + padding 64 ⇒ 420 stacked on every 1024/1152 laptop). |
| **#468** | `fd00377` | **The twin deleted** (1,656L). **#467 had merged into an ORPHANED branch and never reached trunk** (§the-trap below); re-landed via cherry-pick of `4039a87`. The acceptance script's rollback check was **inverted in the same PR** — the twin must never come BACK. |
| **#469** | `7786966` | **The gate that never ran.** `quality-gate.yml` used `actions/checkout@v5` at default **depth 1** ⇒ `origin/base/approved-thru-437` absent in CI ⇒ the MI + FORBIDDEN checks **silently skipped on every run, including #466's "fully green".** Post-merge it was incoherent the other way (base ref = trunk ⇒ MI compared the file to itself = false red; FORBIDDEN diffed base-against-itself = vacuous green). Fixed: `fetch-depth: 0`; MI anchored to the **fixed SHA `e8f75af`** (a permanent moat guard); FORBIDDEN PR-scoped, N/A on push; **a needed-but-missing ref now HARD-FAILS in CI instead of skipping.** |
| **#470** | `2c59dd2` | **The mobile header.** `PageHeader`'s `flex: 1` = `flex-basis: 0%` ⇒ the `flexWrap` already written there **could never fire** ⇒ the title starved to ~190px and wrapped to **five lines**. `HEADER_TITLE_BASIS = 320`. Lede **deleted at both widths** (covered by How-it-works steps 3/4 + the relocated "We never invent a score"). Title → `clamp(22px, 6vw, 30px)` (2 lines at 22px; the measured 16px one-line option was **rejected** — it equalled MobileShell's own chrome title). "How it works" recoloured (`SECONDARY_BG`/`ACCENT_SOFT`/`ACCENT_FG` + `ChevronRightGlyph`; `listStyle:"none"` had deleted its disclosure triangle). **D4 completed** — `"Photo from your phone"` → `"Image from your phone"`. |

**★★ THE GATE NOW RUNS.** On trunk today the convergence acceptance gate reports **63/63 with `MI: all 52 survivors are still present BYTE-IDENTICAL (permanent moat guard)` executing** — the first time in this repo's history that check has run. #470's own PR gate ran it PR-scoped (`vs origin/base/approved-thru-437`), confirmed green.

**Scope discovered this arc** (logged in `DECISION_LOG` + `SURFACE_TRACKER` §2a): (1) the **13 `matchMedia` layout sites** in the "desktop" twin — the convergence was structurally larger than "delete a twin"; (2) **the CI gate that never ran** — a whole class of "green proves nothing". C&I Scope = **Settling**.

**NEXT:** (1) **C&I question-side parity** (the question uploader lacks `<EquationInput>` + `<QrAnswerHandoff>` that the answer side has — see `NEXT_ACTION.md`); (2) then **the tutor overlay** the whole arc served. **Branch cleanup + this docs PR self-merged this session** (owner-authorized).

---

## #464 merged — ★★ THE TUTOR SAYS THE REAL NCERT PAGE IS THERE — **owner BYTE-REVIEWED + LIVE-VERIFIED (all 4 probes)** — trunk `50783e7`

**1 file, `server/prompts/tutorSystemPrompt.cjs`, +56/−7. PROMPT TEXT ONLY.** The NCERT-page arc is now COMPLETE: **#457** filled the data (65 rows carry `ncertPage`) → **#459** let the page WIN the panel → **#464 makes the tutor SAY it.** ★ *An affordance nobody knows about is not an affordance* — the page sat behind a button a 15-year-old had no reason to look for, on a concept they had no reason to think had one.

`hasNcertPage` had reached the prompt layer since #457 and **nothing read it** — the code said so itself at `routes/tutor.cjs:101`. `figurePanelBlock` now marks each option that carries one, and a directive tells the tutor to say it **unprompted**, in plain words (*"the real NCERT page for this is right there in the panel if you want to see it"*):

```
    - refraction-through-prism: How light bends through a glass prism [real NCERT page available]
    - human-eye-defects: Myopia and hypermetropia corrected by lenses
```

### ⚠️ [FU-TUTOR-CJS-STALE-PLUMBING-COMMENT] — **OPEN, and #464 SHOULD have closed it**
**`routes/tutor.cjs:101` is now FALSE on trunk:** *"`hasNcertPage` is **plumbing only today: figurePanelBlock() does not read it yet**, so this changes nothing the model sees. Using it is the tutor-round-trip lane's sequenced task."* **#464 made `figurePanelBlock` read it** (`tutorSystemPrompt.cjs:264` + `:269`) ⇒ that comment is a **SPENT INSTRUCTION LEFT IN PLACE** — and it is **the very comment that dispatched this task**. A future agent greps `hasNcertPage`, lands on it, and concludes the work is undone. ★★ **This is EXACTLY the #451/#454 ruling: strike a spent check IN PLACE — a stale instruction is worse than none because it LOOKS LIKE DILIGENCE.** It should have been struck inside #464; it is a **product file**, so it cannot ride this docs-only PR (§8). **Comment-only fix, needs an owner-approved product PR.** *(Found by re-verifying #464 on trunk before writing these docs — not by review.)*

### ★★ Two rails carry the design — both verified against the CLIENT, not assumed
1. **MENTION IT ONLY ALONGSIDE THE `[[figure:<key>]]` SIGNAL.** The page renders **inside** the explanation panel (`ExplanationPanel:182` — its button, or the panel body itself), and `TutorPage:185` gates that panel on **`showPanel = panelOpen && !!resolvedVisual`**, which derives from **the model's own figure signal**. A mention without the signal describes **a button that is not on the student's screen** — a **fake affordance**, the species this codebase refuses everywhere. Coupling is the only way the mention is true **100%** of the time. ★ *This coupling was NOT in the dispatch — it came from tracing the affordance to the UI.*
2. **NEVER STATE A PAGE NUMBER, CHAPTER, OR LINK — the more important rail.** The model is told only **THAT** a page exists, never **WHICH**: `normalizeFigures` whitelists exactly `{key, label, hasNcertPage}`; `resolveConceptVisual` alone decides `kind: "ncert"`. ★ **Telling a model a page exists is an open invitation to guess its number, and a plausible-but-wrong number is WORSE than no mention — it sends a student hunting through their real textbook for something that is not there.** **Do NOT pass the page data through "to be more helpful"** — that inverts a deliberate split this lane has protected repeatedly.

**Wording holds whichever body wins:** `resolveConceptVisual` attaches `ncertPage` to the resolved visual **regardless of the body**, so the page is reachable as the panel's **body** (page-only row) **or** its **button** (beside a figure) — and the model **cannot know which** ⇒ *"the page is right there in the panel"* (true in both), never *"there's **also** a page"* (odd when the page IS the panel).

**One honesty fix, one line above the edit:** the block claimed these concepts *"have a curated, NCERT-aligned diagram"* — **false for page-only rows** (`catalogueFiguresForTopic` admits a row with a page and no figure). Now *"a diagram, the actual page, or both"*. *Leaving a sentence just proven false two lines above the fix was not an option.*

### ★★ THE HARNESS CAUGHT A BUG A RENDERED CASE COULD NOT
The directive was first emitted **UNCONDITIONALLY**. On a topic where **nothing** has a page, the prompt would describe a `[real NCERT page available]` marker **appearing nowhere in its own list** — inviting the model to hunt for a thing that does not exist: **the fake-affordance bug ONE LAYER DOWN, built in while congratulating ourselves for catching the first one.** Now gated on `list.some(f => f.hasNcertPage === true)` (`:269`). ★ **Reading the block would never have caught it — the MIXED case rendered perfectly.** *One rendered example is not coverage; assert the ABSENT cases too.* **Owner probe 4 confirmed the gate live.**

### Verification — what it proved, and what it could not
Block **rendered** through `buildTutorSystemPrompt` + read · **14/14 structural harness** (marked vs unmarked · no URL and no `page NN` can leak · absent `hasNcertPage` ⇒ no marker · truthy-but-junk ⇒ no marker, mirroring `normalizeFigures`' `=== true` · no marked row ⇒ no directive) · tsc PASS · root matrix 190/190 · ops matrix PASS (73 rows) · mojibake PASS · `scope:guard` `lanes=product` · `diff --check` clean.
★★ **EVERY ONE OF THOSE WOULD PASS IDENTICALLY IF THE WORDING WERE TERRIBLE — they do not read English.** The render proves it *renders*; the harness proves *structure*; **neither proves the model behaves.** ⚠ **A first tsc run printed a FALSE GREEN (`TSC EXIT: 0`) because `$?` after a pipe reports `tail`'s status, not tsc's** — re-run bare: real exit 0. *The 4th green-that-proved-nothing this session, and this one was self-inflicted.*
**Owner LIVE-VERIFIED all 4 probes:** (1) marked concept → page mentioned **unprompted, on the same turn as the signal**; (2) unmarked concept → **total silence**; (3) **no invented page number/chapter/link** — only *"is there in the panel"*; (4) topic with **zero** pages → **no NCERT reference of any kind** (the gate, live).

### Lane status after #464
- **[FU-TUTOR-NCERT-PROACTIVE-MENTION] CLOSED**, live-verified. **The NCERT-page arc (#457 → #459 → #464) is COMPLETE.**
- **NO COMPLETION CELL MOVES** — the Tutor row was already ✅ Built; §2a **DEPTH**. **The Tutor's `Verified` cell is NOT re-claimed** (this pass covered the NCERT mention, not the Tutor's whole checklist — the standing **#444 precedent**).
- ⚠ **NEW: [FU-TUTOR-CJS-STALE-PLUMBING-COMMENT]** — see above. Comment-only, product file, owner-approved PR.
- **★ NEXT SESSION (written up in full, NOT tonight's):** **Quick Practice + Check & Improve as IN-TUTOR OVERLAYS** reusing the real pages verbatim. ⇒ **[FU-TUTOR-ROUNDTRIP-COUNT-5] + [FU-TUTOR-WAITING-BANNER] remain HELD** — that architecture would make the round-trip banner/count-link mechanism **secondary**. *A HOLD with a reason; do not "just fix" them.*
- **Branch cleanup: the owner does ONE sweep** across everything accumulated tonight — **no agent action** (§3).

---

## #460 merged — A STUDENT WHO **ASKS** TO PRACTISE GETS THE HAND-OFF — **owner BYTE-REVIEWED + LIVE-VERIFIED (all 3 probes)** — trunk `be200cb`

**#460's squash is `be200cb`. The live trunk is `7be651d`.** ✅ **#457 + #459 ARE DOCUMENTED — by #461 (`d364d03`), the section directly below.**

> ⚠️ **CORRECTED BY #463 — READ THIS, IT IS THE LESSON.** This line originally read: *"#457 and #459 are BOTH MERGED AND LIVE BUT HAVE NO HANDOFF DOCS — the catalogue lane owes them."* **That was TRUE when written and FALSE within the hour:** #461 merged **mid-write** and paid exactly that debt. The correction was written **but never published** — it sat on an unpushed local commit behind a `--force-with-lease` approval that was requested and not yet granted, while the conflict was resolved in the GitHub UI from the **pre-correction** commit and merged. ⇒ **the false claim went live and sat on trunk in SIX files.** ★★ **The failure was not the stale claim — that was honest and unavoidable. The failure was holding a KNOWN correction locally and letting the stale version merge without shouting that the fix was unpublished.** *A correction that is not pushed does not exist.* ★ **The 13th stale-base catch, and the first DOCS-vs-DOCS one** — two docs lanes prepending to the same six files; **a new collision class**, expect it whenever two lanes finish within the hour, and **re-verify every cross-lane claim AT REBASE.** *A stale claim is worse than none: it looks like diligence.*

**1 file, `lazytopper/server/prompts/tutorSystemPrompt.cjs`, +13/−2. PROMPT TEXT ONLY — no client change, and that is the finding.**

`[[offer:practice]]` fired on exactly ONE turn: the one where the tutor had **just offered** practice and the student was expected to accept. A student who said *"I want to try a few questions"* got a helpful reply and **no button** — the app could route them, but only if the **tutor** had thought of it first. ★ **The ask is stronger evidence of readiness than the offer ever was.** Now the tag fires on **either** (a) the existing offer turn **or** (b) the turn answering a direct ask. *Same mechanism, wider firing condition.*

### ★★ THE DISPATCH POINTED AT A GATE THAT DOES NOT EXIST
It said *"`tutorSystemPrompt.cjs` + wherever the sentinel is currently gated in `useTutorSession.ts`."* **There is no gate in `useTutorSession.ts`** — it only **attaches** the tag to the turn (`:345`). The real gate is **`TutorPage.tsx:356`**, firing on `latestOffer === "practice"` — **tag PRESENCE, with no agreement-state condition anywhere.** ⇒ the restriction lived **entirely in the prompt's English**, so this is **prompt-only**. ★ **Editing `useTutorSession.ts` as instructed would have INVENTED a client-side coupling the design deliberately kept server-side** — duplicating logic that isn't there. *Carry the question, not the expected answer: the brief's premise was true-sounding and the code disagreed. (Owner independently verified both claims before approving the shape — as with #456's three-dot diff, checking beat accepting the explanation.)*

### ★★ THE LINE THIS HAD TO DEFEND — #442: **QP practises, the Tutor teaches**
Widening loosely would **quietly invert that boundary** the first time a student asked *"what would a question on this look like?"* and got pushed to Quick Practice **instead of an answer**. So (b) is drawn **narrowly and the prompt says why**: only an ask to **PRACTISE** earns the tag; a request to **SEE something solved is a TEACHING request and stays the tutor's own job**. The teaching phrasings are **enumerated by example** (*"can you give me an example?"*, *"walk me through one"*) because those are exactly the asks that read as practice-adjacent. It **cross-references** the existing `WORKED EXAMPLES vs THE STUDENT'S PRACTICE` block rather than restating its rules, so the two **cannot drift apart**.
★ **Ambiguity fails CLOSED:** *"If the ask is ambiguous, treat it as a teaching request and emit NO tag — the student can always ask again more plainly."* **The asymmetry is real: a missing CTA costs a student one more sentence; a wrong CTA pushes someone who wanted an explanation into a practice set.** *Honest-or-silent (#456's ruling), applied to a prompt rule.*

### ★★ EVERY GATE WOULD HAVE PASSED IDENTICALLY IF THE WORDING WERE TERRIBLE
tsc / both matrices / mojibake **do not read English**. The only check with any power was **rendering the prompt through `buildTutorSystemPrompt` and reading the actual block the model receives** — and that proves it *renders*, not that it *works*. ★ **A prompt is only verified by a model reading it** ⇒ this needed live-verify MORE than #456 did, not less. **Owner ran all three probes — ALL PASS:** (1) *"I want to try a few questions"* → **CTA appears** (the feature); (2) *"Can you give me an example?"* → **taught directly, NO CTA** (**the boundary held — the exact failure mode the narrow drafting existed to prevent did not happen**); (3) the original offer→agree path → **CTA still appears, unregressed**.

### Lane status after #460
- **[FU-TUTOR-CTA-DIRECT-ASK] CLOSED**, live-verified. **No COMPLETION cell moves** — the Tutor row was already ✅ Built; §2a depth. **The Tutor's `Verified` cell is NOT re-claimed** (this pass covered the CTA trigger, not the Tutor's whole checklist — the standing #444 precedent).
- **NEXT — [FU-TUTOR-NCERT-PROACTIVE-MENTION], now UNBLOCKED.** ★ **`hasNcertPage` VERIFIED PRESENT IN CODE** (not merely *"#457 landed"*): `conceptVisualCatalogue.ts:226` (on `CatalogueFigureOption`) → `:253` (`Boolean(row.ncertPage)`) → `tutorClient.ts:50` (wire) → **`tutor.cjs:111`** (rebuilt + coerced `=== true` at the trust boundary). ★★ **The seam is documented IN THE CODE at `tutor.cjs:101`: _"`hasNcertPage` is plumbing only today: `figurePanelBlock()` does not read it yet"_** ⇒ the work is in **`figurePanelBlock()`** (`tutorSystemPrompt.cjs:226`), which today filters options to **key/label only** and lists them `- <key>: <label>`. ⚠ **`normalizeFigures` is the TRUST BOUNDARY and REBUILDS each option** — *"every new option field must be whitelisted HERE as well, or it is silently dropped"* (already done for `hasNcertPage`; remember it for any future field). ★ The student must **never be asked to request** the page — *a 15-year-old will not know the trigger phrase.*
- **★ HELD — do NOT build:** the hardcoded `count: 5` and the "tutor is waiting" banner / scorecard-return-row, both pending the **overlay-architecture investigation** (QP + C&I may become **in-tutor overlays reusing the real pages verbatim** ⇒ the banner/count-link mechanism becomes **secondary**). *A HOLD with a reason — do not "just fix" them because they look like one-liners.*
## #457 + #459 merged — ★★ THE NCERT PAGE ARC: DORMANT → LIVE → **WINNABLE** — **owner BYTE-REVIEWED ×2 + LIVE-VERIFIED ×3** — trunk `27e6ec2`

**Live trunk: `27e6ec2`** (squash of #459). `084442b` = #457's squash. **This docs PR pays BOTH debts** — #458 explicitly recorded *"#457's docs are OWED BY THAT LANE, not this one."* Paid here.

The tutor could cite an exact NCERT page and never show one. **#457** filled the data (54→**73** rows, **65** carrying `ncertPage`); **#459** let the page **win the panel** instead of being a permanent bolt-on. Both **owner byte-reviewed on the pushed diff**, then **live-verified three times**: maths **p.11** (polynomials) · science **p.132** (heredity) · **electricity · Ohm's law** (the inline body).

### #457 — the affordance was BUILT AND DORMANT, not missing
`ExplanationPanel` already rendered the NCERT button whenever a row carried `ncertPage`; **zero of 54 rows had one.** ⇒ pure data. 73 rows / 112 boardEssentials concepts; `ncertPage` on 65; **`data.ts` diff was `306 added / 0 deleted`** — git *proving* the 54 existing rows were untouched, which is what made the byte-review cheap.

### ★★ THE "BYTE-FAITHFUL COPY" WAS ALREADY FALSE — the catalogue is TWO files and only ONE ships
`handoff/curation/conceptFigureCatalogue.curated.ts` is **imported by nobody** (the app tsconfig only includes `src`); the WIRED copy is `src/pages/tutor/conceptVisualCatalogue.data.ts` — what the resolver reads and what CI gates. ⇒ **curating only the handoff file ships ZERO student-visible change** (owner granted a narrow, now-EXPIRED exception to touch the data file; re-ask next time). And they had **already drifted before anyone touched them**: #448's owner-approved gap-fill rows + the 2026-07-16 label fixes existed **only in `data.ts`**. ⇒ re-synced **curated ← data** (the direction that ships and gates). ★ **Nothing enforces the "keep the two in sync" contract ⇒ [FU-CATALOGUE-SYNC-GUARD]. It rotted in ONE PR cycle.**

### ★★ THE REPO'S OWN NCERT PAGE DATA IS NOT TRUSTWORTHY — open the PDF
Every one of the 65 pages was verified against the official 2026-27 chapter PDF requiring **BOTH** the printed folio **AND** the section heading/caption on the page. **Never derived from a spec field.** That caught two classes that would have shipped wrong pages **to students**:
- ★ **A spec's `page_pdf` is 0-based in some specs and 1-based in others** (25 of 62 figures off by one). Light's is simply **wrong**: `fig_99` records `page_pdf: 10` → derives p.144; Fig 9.9's caption is on **p.143**.
- ★ **The `source_ledger` misplaces electricity**: series cited p.192 (§11.6.1 opens **p.182**), parallel p.186 (**p.185**), Ohm's law p.176 (**p.175**). *Treat ledger pages as candidates to verify, never as truth.*
- The **figure page ≠ the concept page** (xylem/phloem = §5.4.2 **p.94**; its leaf figure sits p.82). `ncertPage` points at the **concept**. And **lens power/dioptre is defined in Light ch.9 §9.3.8 p.157**, NOT the human-eye chapter ⇒ a deliberate **cross-chapter** ref (confirms [FU-TOPICHUB-LENSPOWER-ANCHOR]). ★ The page field itself is named **three ways** across specs (`printed_page` | `page_printed` | `ncert_page`) — reading only one makes real data look absent.

8 rows carry **no** page, honestly (out-of-2026-27-scope ×6; heights-&-distances has **no `maths/ch9` offset** ⇒ [FU-NCERT-OFFSETS-MATHS-CH9]; **ch.8 never uses the words "genotype"/"phenotype"** ⇒ the row is editorial vocabulary).

### ★★ PHOTOSYNTHESIS IS A **VOCABULARY** GAP, NOT A CATALOGUE GAP — do not re-file it as coverage
The live miss that started the lane cannot be fixed by a catalogue row: **there is no photosynthesis row in `boardEssentials`**, and CI hard-fails any `conceptLabel` that isn't a live `name:`. life-processes was already **5/5** covered. Same shape for the **human brain** (Fig 6.3 p.104 — extracted, board-heavy, no row) ⇒ **[FU-TUTOR-VOCAB-BRAIN-ROW]**. ★ **The CI label-drift gate is what turned "add a row" into "the concept doesn't exist" — the gate did its job by refusing.** Coverage went 13→**22 topics**; **39 concepts were checked and deliberately REFUSED** (our-environment's trophic pyramid shows *feeding levels*, not "ecosystem components" — no decomposers, no abiotic: **the tempting stretch, refused**).

### #459 — the page stops being second-class
`resolveConceptVisual`'s own comment stated the ceiling: *"NCERT page — offered ALONGSIDE the body ... NOT as the body itself."* So a **whole-chapter** interactive outranked an **exact page** at ANY fit. New priority: **in-play exam figure → real figure → NCERT page → interactive → gap** (owner ruling, Q1 **Option A**). Rationale the owner ratified: the panel's own copy already concedes it — *"It covers the whole chapter, so use it to play, not as a single answer."* **15 of 73 rows change** (14 interactive→ncert + 1 gap→ncert); the 52 figure rows are untouched and the page still rides **alongside** them.

### ★★ THE PREREQUISITE WAS THE WHOLE BALLGAME — the promotion would have been DEAD CODE
`catalogueFiguresForTopic` excluded **every** `best.kind === "none"` row ⇒ carbon · "Functional groups" — **the ONE row whose only visual is the page** — was hidden from the model's closed option set ⇒ the model could never emit its sentinel ⇒ the panel could never open ⇒ **the promotion would never have rendered, for exactly the row it was built for.** Filter is now `best.kind === "none" && !row.ncertPage`; options **71→72**. ★ *The old rationale ("pointless to signal a figure that resolves to an empty panel") was TRUE WHEN WRITTEN and had rotted the moment the page could fill the panel.*

### ★ FAIL-CLOSED — `ncert` is the ONLY body kind whose asset isn't proven before render
An image ref is **disk-gated by CI**; a page is fetched from **Storage at render time** and can be missing/unhosted/CORS-blocked/unconfigured. The panel HEAD-probes and renders the **honest gap** on any failure, from **ONE shared definition** so the fallback can never drift from the real thing. ★ **There is no `.env` in this repo ⇒ every LOCAL dev build has no bucket and ALWAYS takes the fallback path — that is not a bug, and a local test can never prove the pipe.**

### ★★ `normalizeFigures` REBUILDS `{key,label}` — a client-only field is dropped BY CONSTRUCTION
`hasNcertPage` chain: `CatalogueFigureOption` → `TutorFigureOption` (a **second, mirrored** type in `ai/tutorClient.ts`) → **`normalizeFigures` (server/routes/tutor.cjs)** → `figurePanelBlock`. That third hop **reconstructs each option at the trust boundary**, so plumbing the client alone ships a field that **provably never arrives**. **Prompt text is byte-identical** (`figurePanelBlock` renders only `` `- ${f.key}: ${f.label}` ``; `figures` is never `JSON.stringify`'d) ⇒ **the model STILL does not know NCERT pages exist** — which is exactly why it flatly answers *"I cannot open NCERT pages."* **Writing that copy is the round-trip lane's task; `figurePanelBlock` deliberately untouched.**

### ★★ THE VITEST CEILING WAS WRONG — [FU-CI-GATE-VITEST] IS CHEAP, NOT HARD
Three lanes in one night recorded *"Windows can't run vitest"* as the ceiling and shipped **on argument rather than execution**. **It is false.** The linux-x64 pin strips `@rollup/rollup-win32-x64-msvc`; dropping the matching binary into rollup's own `node_modules` runs vitest locally — **92/92, ~11s** (local only, **nothing committed, no lockfile change**). ⇒ **the real ceiling is "nobody wired vitest into the linux CI job that already exists and already works."** The FU moves from *hard* to **cheap**. *Flag this loudly whenever that conversation happens.*

### ★ A PASSING TEST WITH A DATA GUARD IS WORSE THAN AN HONEST "UNVERIFIED"
The new cases carry `if (!row) return` guards ⇒ they PASS while asserting nothing when the `find` misses. **Mutation-tested**: reverting the priority failed **exactly 3** (outranks-interactive · fills-the-gap · the option-set case); the two that stayed green pin the half the ruling does **not** change. File then restored **byte-exact** (empty diff vs HEAD) and re-verified 92/92.

### Process
#457: pre-flight → **owner ruling on a scope grant the brief made impossible** → build → gates → push → **owner BYTE-REVIEW** → PR #457 → CI green → **owner LIVE-VERIFY ×2 (the 2 clicks)** → merge. #459: pre-flight (**3 rulings asked, not inferred**) → build → gates → push → **owner BYTE-REVIEW** → **both merge gates cleared (clicks + a REAL vitest run)** → **owner LIVE-VERIFY of the inline path (Ohm's law)** → merge. ★ **The merge was explicitly authorised with the human present** — that is the only reason it wasn't the owner's own click.

### Lane status
- **Both PRs CLOSED and live-verified.** No COMPLETION cell moves — the Tutor row was already ✅; this is §2a **depth**. **The Tutor's `Verified` cell is NOT re-claimed** (the #444 precedent, held again): the owner verified **these three paths**, not the Tutor's whole checklist.
- **★ UNBLOCKED: the NCERT proactive-mention prompt fix.** `hasNcertPage` now reaches the prompt builder's doorstep — **confirmed it survives `normalizeFigures`**. The round-trip lane writes the copy in `figurePanelBlock`. ★ **Never ask the student to request the page — a 15-year-old will not know the trigger phrase.**
- **NEXT elsewhere:** #460 (draft) — the `[[offer:practice]]` direct-ask CTA widening.
- **Branch cleanup:** `content/tutor-catalogue-ncert-coverage`, `feat/tutor-ncert-winnable-body` + their worktrees — **never auto-approved (§3)**; owner's sweep.

---

## #456 merged — THE TUTOR READS QUICK PRACTICE'S GRADED WORKING — **owner BYTE-REVIEWED + LIVE-VERIFIED** — squash `dfe3144`

**Live trunk when this docs PR was written: `084442b` — NOT `dfe3144`.** `dfe3144` is #456's own squash SHA and nothing more: **#457** (the tutor catalogue's NCERT-page lane, 54→73 figure rows) landed on top **while this docs PR was being written — the 12th stale-base catch, and the second in two hours.** ⇒ **#457's own docs are OWED BY THAT LANE, not this one** — this section does not speak for it. Re-derive the tip after this merges; never trust a written SHA.

★ **#456 squash-merged, so the branch SHA `433135a` is NOT in trunk's ancestry.** Verify the CODE on trunk, not the commit graph — `git branch --contains` will tell you it never landed. It did: `PRACTICE_RECORD_SURFACE = "quick-practice"` is live at `tutorRoundTrip.ts:125`, used at `:151`.

### What changed — the two round-trip legs were uneven, and now aren't
C&I's return-opener reads the real graded `sessionRecord` and can say **where** a mark went. The practice leg had only `practiceInsights` attempts — correctness + marks, **no working** — so the best it could say was *"you got 2 of 3."* **The detail already existed and nothing was reading it:** #436 shipped QP's own durable (non-counting) session record, and its `perQuestionRef` payload carries the **same grader's** per-step detail (`status` · `teacherAnnotation` · `mistakeType` · `correctedWorking`) **because QP's written-working path runs the same grader as C&I.** The opener now names the step. Owner live-verify, verbatim: ***"it does correctly identify the mistakes I made."***

3 files, all `pages/tutor/`: `tutorRoundTrip.ts` (+180, new `matchReturningPracticeRecord` + `composePracticeRecordReturnOpener`, both pure) · `useTutorSession.ts` (+36, the fallback chain) · `tutorRoundTrip.test.ts` (+205).

### ★★ TWO SURFACES, TWO VOCABULARIES — a silent zero-match with every gate green
The pending marker says **`"practice"`**; the record says **`"quick-practice"`**. So `matchReturningRecord`'s bare `r.surface === pending.surface` **can never match a QP record** — it would have found nothing, forever, while tsc and every matrix stayed green. Mapped via a documented `PRACTICE_RECORD_SURFACE` constant in a **separate** matcher. ★ **The marker value is NOT renamed and must never be:** it is **live, persisted state** in `tutorSessions/{uid}/topics/{topicKey}` — renaming it strands every in-flight round-trip mid-flight. *(Same species as the `conceptKey` rule from #448: a durable-state string is not yours to tidy.)*

### ★★ THE RECORD IS NOT ALWAYS WRITTEN — so it can never REPLACE the attempts leg
QP writes its record **only when the scorecard appears** (`sessionFinished || allDone`; **no unmount/beforeunload hook, by owner ruling**) — so a student who does 2 of 5 and taps **"Back to your tutor"** has **no record at all**, while `practiceInsights` attempts were written on **every** answer. **Record = richer. Attempts = further reach. Neither subsumes the other.** ⇒ the chain is **ADDITIVE: record → attempts → nothing**, and `composePracticeReturnOpener` is **byte-unchanged** as the honest floor. **Owner ruling, generalised beyond this case:** *any composed opener that has to reach for something to say about incomplete data is manufacturing insight the data doesn't support — honest-or-silent beats a softened fabrication.* The composer therefore returns **`null`** on every thin-data path (MCQ-only · no quotable step · no marks · no payload · unreadable question) and lets the marks line stand.

### ★ A STEP'S MARKS ARE NEVER QUOTED — the #445 clamp would read as "you scored nothing"
On an **objective** question the grader zeroes **every** per-step mark **by design** (the mark lives at answer level). Quoting one would tell a student they scored nothing when they didn't. The opener keeps the **annotations** and never the step marks — **exactly what the C&I and worksheet views already do** (drop the chip, keep the annotation). A bare MCQ click carries no `annotatedSteps` and no `mistakeSummary` at all (D-PROG-2's shipped invariant) ⇒ `null` ⇒ the floor.

Topic overlap goes through **`canonicalSlugMatches`**, never raw `topicKeys.includes()` ([FU-PROG-TOPIC-KEY-MISMATCH]'s exact class). Empty `topicKeys` is **not** a wildcard here (it is in `matchReturningRecord`, where a mixed C&I paper legitimately resolves to none) — for QP it means slug resolution failed, so matching on it would be a guess.

### ★★ TWO GATES THAT READ **PASS** WHILE PROVING NOTHING — the same species, not two issues
**Owner ruling: this stays in the [FU-CI-GATE-VITEST] case as a second instance, not a footnote.**
- **vitest ran NOWHERE.** Windows cannot (`@rollup/rollup-win32-x64-msvc` stripped by the linux pin) **and vitest is not CI-gated** ⇒ the 18 added cases execute nowhere, automatically, indefinitely. ★ **The danger is not that tests break — it is that a test file borrows the authority of a passing suite without ever being run, in every diff, every review, every handoff doc.** *Rather than pass off unrun tests as evidence*, `tutorRoundTrip.ts` (**`import type` deps only ⇒ emits standalone**) was compiled with `tsc --outDir <scratch>` and driven through the same **24 assertions from a plain node script: 24/24**. ★ **That escape hatch was LUCK, not a strategy** — most of this repo's logic has real runtime deps and no such route, so it ships **on argument rather than execution**.
- **`scope:guard` returned `SCOPE_GUARD_OK (mode=product, no changes)`** post-rebase — **a green string from a gate that inspected nothing**, because it reads the **working-tree** diff and a committed tree is clean. ★ **A suite nobody runs and a guard with nothing to guard both read PASS in a report while proving nothing.** The real scope evidence is the **three-dot** diff.

### ★★ TWO-DOT `git diff` AGAINST A MOVED TRUNK SHOWS OTHER LANES' WORK AS *YOUR* DELETION
Cost a false scope-contamination scare here: `git diff origin/base... origin/my-branch` (**two-dot**) listed QR's `DesktopCheckImprovePage.tsx` at **−47** — #454's merged work, reported as if this branch had deleted it. ⇒ **always three-dot (`origin/base/approved-thru-437...my-branch`) to review your own scope.** *(Flagged proactively, then the owner verified it himself rather than accept the explanation — which is what confirmed there was no contamination, not the explanation.)*

### Process — clean, and the force-push is the point
Pre-flight → owner ruling → build → gates → push → **owner BYTE-REVIEW of the pushed diff** → **rebase onto the moved trunk + re-run every gate** → **owner-approved `--force-with-lease`** → PR **#456** → **CI green (`quality-gate` PASS — the linux prod build Windows can't run)** → **owner LIVE-VERIFY** → owner merge. Never self-merged. ★ **The rebase force-push was NOT inferred from "rebase and open the PR"** — §3 marks `push --force` *never auto-approve*, so it was asked for explicitly and the owner verified the remote state before approving. **That is the one place the doctrine says never assume.**

### Lane status after #456
- **The core FU is CLOSED and live-verified.** No COMPLETION cell moves — the tutor was already ✅; this is §2a cross-surface depth.
- **NEXT (dispatched):** widen the `[[offer:practice]]` CTA trigger so a student who **directly asks** to practise fires the same sentinel — today it fires only when the tutor offered first.
- **BLOCKED on the catalogue lane:** the NCERT proactive-mention prompt fix — waits on `hasNcertPage` reaching `catalogueFiguresForTopic`'s options. **#457 has landed; confirm the field exists before starting.**
- **★ HELD — do NOT build:** the hardcoded `count: 5` fix and the **"tutor is waiting" banner / scorecard-return-row**. Both wait on a **separate overlay-architecture investigation** (QP and C&I may become **in-tutor overlays reusing the real pages verbatim**, which would make the banner/count-link mechanism **secondary**). Building either now risks throwing it away.
- **Branch cleanup:** `feat/desktop-pr-tutor-qp-graded-record` + its worktree — owner-approved for deletion **once this docs PR merges**.

---

## #454 merged — ★★ THE QR LANE IS COMPLETE — **owner BYTE-REVIEWED + LIVE-VERIFIED** — trunk `a8be752`

**Post-merge trunk: `a8be752` (squash of #454). Re-derive after this docs PR merges — never trust a written SHA. This lane produced TWO stale-base catches an hour apart (#450 took #451 mid-build; #452 took the #451 docs PR mid-WRITE) — 10th and 11th. *That is the normal condition of a shared trunk, not bad luck.***

### ★★ THE WHOLE ARC, IN ONE PLACE — desktop practice no longer costs a self-email
A student practising or checking on a laptop, who solved on paper, used to photograph their work → WhatsApp/email it to themselves → save it → upload from the laptop. **That friction is now dead on every graded surface.** The desktop shows a QR, the phone scans + sends, the file lands in the SAME answer box and **grades exactly as today — the grader was NEVER touched. QR is a DELIVERY mechanism, not a grading one.**

| PR | SHA | What it did |
|---|---|---|
| **#441** (PR-1) | `9ebb87c` | **The channel.** Firebase Storage blob + a Firestore coordination doc, both server-side via firebase-admin (the phone never touches Firebase). 4 endpoints · `/u/:token` bare full-screen phone page · `<QrAnswerHandoff/>` · 3 owner-approved `App.tsx` lines. Wired into `ChapterTestUploadPanel` + `WorksheetGradePanel` ⇒ **ONE wire lit THREE surfaces** (CT in-test, CT result, **Full Mock**) because `ChapterTestPage:711` **and** `FullMockPage:1172` share that panel. |
| **#443** | `5aaaeec` | **Hardening.** Copy follows the HOST SURFACE (`mode` required, no default) · the REAL ceiling · an actionable refusal. Fixed a **live PRE-EXISTING** bug: **"PDF up to 5 MB" was never spendable on EITHER path** (base64 ×4/3 ⇒ 6.67 MB vs `readJson`'s 5 MB cap) — a 4–5 MB PDF **on the desktop, no QR**, passed the picker and died at the grader. Limits unified in `src/services/uploadLimits.ts` (**3.5 MB**), guarded by a **negative-tested** cap assertion in `test:qr:channel`. |
| **#447** (PR-2) | `d99c14d` | **QP + HPQ + TopicHub** — one wire in the shared `SolutionChecker`. `mode="photo"`; QR **inside the upload panel as a sub-mode, never a third peer**. Also closed SolutionChecker's **own** 5 MB constant. |
| **#451** | `c132f27` | **The C&I guard that never existed** — not a wrong ceiling, **NO ceiling**. Size **and** type, all four inputs, both pages, via the new shared `checkUploadFile()`. |
| **#454** (last wire) | `a8be752` | **Check & Improve** — 1 file, +47/−0, **desktop-only**. `mode={isMultiQuestion ? "document" : "photo"}`. |

**★ THE LANE IS CLOSED.** Remaining, none of it in this lane's hands: **[FU-QR-STORAGE-LIFECYCLE]** (owner infra — 24h lifecycle on `qr-uploads/`, console/gsutil not code) · **[FU-GRADER-5MB-COPY]** + **[FU-GRADER-COULDNOTREAD-REASON]** (both the FORBIDDEN grader file — one future batched, owner-approved pass) · **[FU-UPLOAD-GUARD-CONVERGE]** · **[FU-QR-CI-QUESTION-PHOTO]** · **[FU-CI-DROPZONE-PDF-COPY]**.

### ★★ THE TWO LESSONS THIS ARC EARNED — they outlive every line of its code
**1. CARRY THE QUESTION FORWARD, NEVER THE EXPECTED ANSWER.** *Two-for-two in this one lane:*
- **[#451]** The carried check was *"look for a THIRD copy of the 5 MB constant."* **There was none — and that was the CORRECT result of a REAL, LIVE bug**: the bug had a different SHAPE (no guard at all). Run it literally ⇒ find nothing ⇒ report *"C&I is clean"* ⇒ **close a live bug as a pass.** The question that worked: *"what does C&I ENFORCE?"*
- **[#454]** The FU said *"Use `mode="photo"`"*. **Wrong-shaped** — C&I is **bimodal**, and `"photo"` on a multi-question paper is exactly the failure `mode` was invented to prevent. The question that worked: *"what does C&I's answer upload actually ACCEPT?"*
- ★ Neither instruction was careless; **both were true when written and had since ROTTED.** A stale instruction is worse than none — **it looks like diligence.** ⇒ when an instruction is spent, **strike it IN PLACE** (a grep landing on the old line is how it gets re-run), never merely add a note above it.

**2. CHECK WHAT THE ACTUAL HOST RENDERS, NOT THE SHAPE OF THE LAST WIRE YOU BUILT.** *(The general form; it supersedes the earlier per-instance wording of "don't assume a sibling's shape transfers", and it is usable on a host nobody has seen yet.)* **Both wrong directions are avoided the same way:**
- **#447 needed MORE state than a naive copy** — the CT panel's 2-field set would have dropped a QR-delivered **PDF** into `SolutionChecker`'s `!isPdf`-gated `<img>` and rendered it **broken** (`capture` only HINTS at the camera; the phone's picker keeps `accept="...,application/pdf"` in EVERY mode).
- **#454 needed LESS** — C&I has **no `<img>` preview** and three state fields, so copying #447's five-field tuple would have added state nothing reads.

### #454 — the last wire
**`mode={isMultiQuestion ? "document" : "photo"}`.** C&I is **the only bimodal host so far**: multi-question = the answers to a WHOLE PAPER (one multi-page PDF — the page's own comment at `:1765` says the solution upload "accepts a PDF for BOTH single- and multi-question"); single-question = the photo IS the answer. `isMultiQuestion` (`:756`) derives from the **question** upload's detection, which settles **before** the answer upload is reachable ⇒ **no race, no undefined-mode window.** Seam held: QR **inside the upload panel as a sub-mode**, never a third peer; **reset is structural** (`!imageBase64` gates the mount ⇒ delivery unmounts + cancels polling, `clearImage` remounts fresh `idle`). **Mobile `CheckImprove.tsx` deliberately UNTOUCHED** — `QrAnswerHandoff` → `useIsDesktop()` → **null <1024px** ⇒ a QR there could never render; **a QR on a phone is meaningless, the camera is already there.** Mobile got #451's guard and no QR.

### ★ OWNER BYTE-REVIEWED the pushed diff, then LIVE-VERIFIED — all clean
Including **the multi-question case that mattered most: the QR copy leads with the PDF**, so the page-1 trap cannot happen. *(That is the case the FU's `mode="photo"` would have shipped broken.)*

### Lane status after #454
- **QR — CLOSED.** Nothing follows from it in this lane's hands.
- **No COMPLETION cell moves** — C&I was already ✅; §2a cross-surface depth (as #441/#443 and #447 were).
- **Branch cleanup: the owner will do ONE sweep** of all six branches + four worktrees when ready — **not piecemeal, and never auto-approved (§3).**

---

## #451 merged — CHECK & IMPROVE: the upload guard that never existed — **owner LIVE-VERIFIED** — trunk `c132f27`

**Post-merge trunk: `c132f27` (squash of #451) on top of `13fc1b0` (#450 docs) and `0e42e16` (#448). Re-derive the tip after this docs PR merges — never trust a written SHA. #451's branch went stale MID-BUILD when docs #450 landed (the 10th such catch), and **THIS DOCS PR then went stale under #452 while being written (the 11th)** — rebased onto `a9798e7` (tutor 404 fix; product-only, zero overlap with these six files). ⇒ **the live trunk at merge is `a9798e7`+, NOT `c132f27`; `c132f27` is #451's own squash SHA and nothing more.** *Two catches in one lane, an hour apart: this is not bad luck, it is the normal condition of a shared trunk.*

**3 files (`uploadLimits.ts` +70 · `DesktopCheckImprovePage.tsx` +51/−6 · `CheckImprove.tsx` +54/−6). PR 1 of 2** — the sound base [FU-QR-CI-WIRE] rides on.

**Check & Improve had NO client-side upload guard at ALL — not a wrong ceiling, NO ceiling.** Neither page read `file.size`, neither imported `uploadLimits`, and all four file inputs went straight to `FileReader` → base64 → grader. **Live on real students, desktop AND mobile, entirely independent of QR.** Two ways a submission died *after* the student believed they were done:
- **SIZE** — a 10 MB PDF base64'd fine, travelled, hit `readJson`'s 5 MB body cap → *"Request body too large"*.
- **TYPE** — every input declares `accept="image/*,application/pdf"` but the server takes **exactly** `{image/jpeg, image/png, application/pdf}` (`mentorImageSupport.cjs:3` ALLOWED_MIME_TYPES) ⇒ a WEBP/GIF/BMP passed the picker and died server-side. ★ **`accept` is a HINT, not a guard** — every OS dialog offers an "All files" escape — so the check must exist independently of it.

Both are the forbidden **"uploaded, then dead"**. Now refused at the picker, naming what is wrong AND what to do, copy + constants identical to the panels #443 fixed.

### ★★ THE FINDING THAT MATTERS — a targeted check can only find what it was aimed at
The carried-forward instruction was **"look for a THIRD copy of the 5 MB constant."** **There was no third constant — and that was the CORRECT result of a REAL bug.** The check found "nothing" because the bug had a *different shape*: not a wrong ceiling, but **no guard whatsoever**. An agent running that check literally would have found nothing and concluded *"C&I is clean."*
★ **The question that worked was "what does C&I ENFORCE?", not "does C&I have a 5 MB constant?"** *A check that names its expected answer can only confirm or deny THAT answer — it cannot find a bug of a shape you didn't predict.* **This is the false-negative trap, and it nearly closed a live bug as a clean pass.**

### ★ ALL FOUR call sites — the question photo kills a submission just as dead
`handleFileChosen` + `handleQuestionFile` (desktop) · `handleFileChange` + `handleQuestionFile` (mobile). The **question photo rides the SAME request to the SAME body cap** as the answer.

### ★ Shared helper, NOT four more inline copies — [FU-UPLOAD-GUARD-CONVERGE]
`checkUploadFile()` lives in `uploadLimits.ts` because that file's own mandate is literally *"THE ONE PLACE … so the number and the words a student reads can never drift apart again"* — and a guard copy-pasted per surface is exactly how they drift ([FU-STEPMARKCHIP-EXTRACTION] is the standing lament for that pattern). **Behaviour + copy are verbatim** from the sibling panels; only the duplication is not. `ChapterTestUploadPanel` + `WorksheetGradePanel` **keep their inline copies** — converging them is behaviour-neutral and would widen a bug-fix PR ⇒ **[FU-UPLOAD-GUARD-CONVERGE]**.

### ★ `subject` is REQUIRED with NO default — the copy-follows-the-host lesson, third occurrence
`checkUploadFile(file, subject: "answers" | "question")`. **Two of the four sites are QUESTION inputs**, so the sibling panels' verbatim *"…photo of your answers."* would have told a student to photograph **the wrong thing**. Deliberately mirrors `QrAnswerHandoff`'s `mode` contract — same failure mode, same cure: **a host must decide consciously rather than silently inherit the wrong noun.**

### ★★ THE REFUSAL MUST NOT REUSE THE GRADE-FAILURE CHANNEL
Desktop's `errorMessage` surface **hard-codes** *"No score has been generated. **Press Retry to call the grader again.**"* — a file refused at the picker **never reached the grader**, so that sub-line would be a **lie** and "Retry" would re-run a call that never happened. ⇒ dedicated `answerFileError` / `questionFileError` on both pages, rendered beside the input that refused. *Two different failures, two different truths, two different states.*

### ★ C&I is stale-closure IMMUNE — and the reason matters
[FU-SOLUTIONCHECKER-STALE-ANSWERTAB] asked whether C&I's tab-gate shares the defect. **It does not.** Both grade paths are **plain `async function handleGrade()`, NOT `useCallback`** ⇒ they re-read `tab` from the current render scope every call; there is no dep array to omit. The only `useCallback` in either file is `loadCiRecords`, which never reads `tab`. ⇒ **[FU-SOLUTIONCHECKER-STALE-ANSWERTAB] is SolutionChecker-SPECIFIC, not a family.** ★ **C&I is safe not by design or vigilance but because it never reached for memoization — SolutionChecker's bug is the price of an optimisation C&I didn't make.**

### Two unrequested fixes inside the same four functions (owner byte-reviewed + approved)
- **`reader.onerror` silently nulled state with NO message** on all four — a read failure showed the student **nothing**. Each now surfaces its file-error. *A silent failure inside a PR about honest refusal would have undercut its own point.*
- **`setImageMime` now takes the guard's VALIDATED mime** instead of re-deriving it from the data-URL prefix with an `|| "image/jpeg"` fallback that could **mislabel a file and let it die server-side**.

### ★ OWNER BYTE-REVIEWED the pushed diff, then LIVE-VERIFIED — all clean
Byte-review confirmed line-by-line: the verbatim claim vs `ChapterTestUploadPanel:50-76`; `UploadSubject` a strict union with no default and all four call sites passing it correctly; error isolation (separate hooks, each rendering only beside its own input, zero overlap with `setErrorMessage`); both unrequested fixes justified against the **pre-PR** code. Live-verify: **oversized PDF + WEBP refused honestly on both inputs, both pages — including the WEBP-on-mobile case flagged as the sharpest risk — and a valid file still grades unchanged.**

### Lane status after #451
- **NEXT: [FU-QR-CI-WIRE] (PR 2 of 2)** — the QR wire on top of this sound base, **DESKTOP-ONLY**. `QrAnswerHandoff` is desktop-only by design (`useIsDesktop()` → renders null <1024px): **a QR on a phone is meaningless — the camera is already there** ⇒ **mobile `CheckImprove.tsx` gets this guard and NO QR affordance.** Confirmed, not assumed.
- **No COMPLETION cell moves** — C&I was already ✅ across the board; this is §2a bug-fix DEPTH on an existing surface.
- **Branch cleanup remains ON HOLD** at the owner's instruction (CLAUDE.md §3: branch deletion is NEVER auto-approved).

---

## #448 merged — TUTOR STAGE 3: THE EXPLANATION PANEL is LIVE (D-TUT-13 complete) — trunk `0e42e16`

**Post-merge trunk: `0e42e16` (squash of #448) on top of `fc17569` (#449 docs) / `d99c14d` (#447). Re-derive the tip after this docs PR merges — never trust a written SHA. #448 is the 9th stale-base catch: based on `acf3092`, trunk moved FOUR commits underneath it mid-build (#445, #446, #447, #449).**

**The tutor could teach trigonometry without ever showing a triangle. Now it shows the right diagram — or honestly shows none.** D-TUT-13's second panel, wired to Fable's curated concept→figure catalogue. Stage 1 left a closed `<aside>` scaffold with split/overlay CSS already in place; Stage 3 filled it. **Tutor Stage 1 + 2 + 3 are now all live.**

### What shipped
- **`ExplanationPanel.tsx`** — splits on desktop, overlays on mobile. Renders ONE resolved visual: a real notes/bank figure, an **offer** to explore a chapter interactive, or an honest gap state. Inline "See the diagram" chip per figure-bearing turn + a header "Diagram" reopen; `NcertPageModal` wired (dormant until a curated `ncertPage` lands).
- **`conceptVisualCatalogue.ts`** — the resolver. **Exact-match-or-nothing (D-TUT-15):** an unknown concept → `null`, never a substring guess or `concepts[0]` (the `findVisualForConcept` bug this replaces). Reuses the product's primitives (`getNoteAssetUrl` / `getFiguresForQuestion` / `getAllConceptsList`) — the registry **DATA**, never its matcher (D-TUT-12).
- **The figure sentinel** — `[[figure:<conceptKey>]]`, mirroring the proven `[[offer:…]]` pattern: the model emits a key from the **closed curated set**; `tutor.cjs` strips + validates against exactly that set ⇒ a hallucinated key yields **no panel**, never a wrong figure. The token is the stored `conceptKey` (a regex-safe slug) because one `conceptLabel` contains `]` and would break a label-keyed tag.
- **The seam** — `buildTutorPath` gained an OPTIONAL `questionId` (omitted ⇒ byte-identical; the QP lane's call untouched). It also powers D-TUT-14 #2 (an in-play question's real exam figure outranks the generic one) — **but only for the ARRIVAL concept**, never a mismatched question's figure.
- **5 of 7 hard gaps filled** as committed `.svg` under `notes/assets/` (`getNoteAssetUrl` already globs svg ⇒ same path as the 66 shipped figures). Styled on the product's own grammar (`tokens.ts` + `NoteGeneratedFigure`'s print-safe palette) — no new visual language.
- **Interactives are an OFFER, never auto-embedded** — 19 of 54 rows' best asset is a whole-chapter interactive; dumping one on a single-concept question is not an explanation (D-TUT-14 #3 / D-TUT-5).
- **`[FU-TUTOR-BACKLABEL-COUNT]` closed** — the practice round-trip now passes `backLabel:"Back to your tutor"` + a short `count`.

### ★★ THE CATCH THAT SHAPED THE BUILD — a data file's own header lied
The curated artefact's header states `conceptKey = slugified conceptLabel`. **It is FALSE for 46 of 54 rows** — the keys are *editorial abbreviations* (`"Pythagoras theorem (a² + b² = c²)"` → `pythagoras-theorem`, which slugifies to `pythagoras-theorem-a-b-c`). A resolver that slugified the live label to find a key would have **silently blanked 85% of concepts** — **[FU-PROG-TOPIC-KEY-MISMATCH] reproduced in a new lane**. ⇒ The lookup key is **(canonical topicKey, EXACT conceptLabel)** / the **stored** conceptKey — *never a re-derived slug*. *A header comment describing data is not data — derive the claim against the real module.* (Same class as the MCQ "34 keys" that were really 13.)

### ★★ D-TUT-16 was SPECIFIED BUT DELIBERATELY NOT BUILT — and that was the right call
D-TUT-16 mandates an AI-diagram cache mirroring the C&I scheme-first cache. **That cache no-ops in production**: `stepSolution.cjs`'s `getPool()` returns null with `DATABASE_URL` unset, and `step_solutions` has **no migration at all**. Built as specified it would have **passed every gate while regenerating a fresh, unreviewed diagram for every student** — the exact fabrication D-TUT-16 exists to prevent. **A green gate that ships silent fabrication is worse than a red one.** The hard gaps are a *bounded static list*, so they were authored offline, owner-verified, and committed as ordinary rows: no cache, no Postgres, no unreviewed figure ever reaching a student. *When a spec's mechanism is dead, satisfying the spec's INTENT beats implementing its letter.*

### ★★ "HARD GAP" ≠ "NCERT HAS NO FIGURE" — the provenance trace caught SIX errors
`GAPS.md`'s "hard gap" means *nothing fits in OUR catalogue* — **not** that NCERT lacks a figure. The owner required tracing all 7 against the **official 2026-27 NCERT PDFs** before commit. It caught six fidelity errors in the drafts:
1. **Esterification arrow said "conc. H₂SO₄"** — NCERT's equation says only **"Acid"**; conc. H₂SO₄ appears solely in Activity 4.8's reagent list. **And the reaction is REVERSIBLE (⇌)** — it had been drawn one-way.
2. **Functional groups used `>C=O` and `–X (F,Cl,Br,I)`** — NCERT Table 4.3 writes **neither**: only **—Cl, —Br** + 4 oxygen classes (never F/I).
3. **Atmospheric refraction had TWO real NCERT figures** (Fig 10.9 star + Fig 10.10 Earth-disc/atmosphere-annulus, p168) — a flat-horizon sketch had been **invented where a real figure existed to trace**.
4. **Tangent length:** NCERT **never writes** ℓ=√(d²−r²) — it states `PQ² = OP² − OQ²` (Remark, p149). Fig 10.7 is the honest base to adapt.
5. **Scattering:** NCERT's rule is **particle-SIZE** based, and reddening-of-the-Sun has no subsection and no figure — the draft over-weighted it.
6. **Area recap:** the 2026-27 reprint **DELETED** the "Perimeter and Area of a Circle — A Review" section (see the ruling below).
⇒ **3 TRACED/adapted (#1,#4,#6) vs 4 ORIGINAL (#2,#3,#5,#7)** — every figure declares which, because *"NCERT drew it" and "we drew it" are different claims and must never be framed the same.*

### ★ NCERT SOURCE OF TRUTH — how to trace (reusable)
Local PDFs: `C:\Users\Chetan\OneDrive\Desktop\NCERT Books\{Mathematics,Science} class 10\_unzipped\`. **They use the OLD 2018-19 numbering — MAP BY CONTENT, never the filename.** Verified map: `jemh110`=Circles(p144-153) · `jemh111`=Areas Related to Circles(p154-160) · `jesc104`=Carbon(p58-78) · `jesc109`=Light(p134-160) · `jesc110`=Human Eye(p161-170). **Use pymupdf (`import fitz`); pdfplumber is BANNED** (cannot decode CBSE subset fonts). **Method gotcha:** NCERT figures are **vector drawings over a full-page raster** ⇒ `get_images()` returns the whole page; extract via **clipped page renders at the figure bbox**.

### ★ TWO owner rulings, both needing a FORBIDDEN file — reported, then granted
Both boardEssentials labels live in `src/lib/desktop/topicHubContent.ts` (**forbidden**) ⇒ STOP + report per §4. The owner then granted a **one-time, exact, 2-line exception** (same discipline as a firestore.rules grant); the file returns to forbidden after:
- **areas-related-to-circles — RENAMED, not retired.** "Circumference & area recap (C = 2πr, A = πr²)" → **"Radius from a given circumference, diameter or area"**. The board deleted the *review section* (ch.11 now opens at 11.1 Sector/Segment; "circumference" survives only in **Exercise 11.1 Q2, p158**) — but the **SKILL is still tested there**, and the in-scope rows *literally embed the facts* (arc = (θ/360)×**2πr**, sector = (θ/360)×**πr²**), so a student cannot do sector/segment without them. Retiring would have lost real tested content to fix a *naming* problem. Only the name moved; `oneLineUse` already described the skill correctly. **No "prerequisite recall folded into an adjacent row" precedent exists** — `boardEssentials` is a flat `{name, oneLineUse, marks}`; "recall" elsewhere means exam-recall.
- **carbon — aligned `–X` only; KEPT `>C=O`.** `–X` was a lone over-reach (the bank already writes concrete "–Cl, haloalkane", NCERT-aligned). **`>C=O` is SHARED student-facing vocabulary** (`carbonCompounds.pack1.ts:259`, `carbonCompounds.exemplar.ts:226` — standard carbonyl shorthand) — narrowing the hub alone would desync the label from the answers students read in their own graded work. *A shared vocabulary is not one row's to narrow;* unifying it (if ever) spans forbidden bank content and is its own call.

### ★ conceptKey NOT renamed when the label changed — deliberately
`conceptKey` is an editorial id, never derived from the label, **and it is persisted as the figure signal in durable tutor sessions**. Renaming it because its *display label* changed would silently blank the panel on existing threads. *Separate "what the student sees" from "what a live session already stored" — a stale-LOOKING identifier can be load-bearing.* Documented in both files so the next reader doesn't "fix" it into a real bug.

### ★ The new CI gate — and proof it is a real gate
`scripts/ops/tutor_visual_catalogue_acceptance.mjs`, chained into the lazytopper ops matrix (**plain Node — vitest is still NOT CI-gated and cannot run on win32, [FU-CI-GATE-VITEST]**). Fails the build on **label drift** vs live `boardEssentials`, a **missing figure**, or a bad/duplicate conceptKey. **Proven twice, not assumed:** removing a committed figure → `MISSING NOTES ASSET`; reverting one label → `LABEL DRIFT … the panel would silently blank this concept`. Interactive refs are warn-only **by design** (computed ids aren't literal in registry text, and a stale one degrades to an honest gap, never a broken image).

### ★ The package.json collision is STRUCTURAL, not incidental
#447 and #448 each added an ops script + appended to `test:matrix:all` — **the same two lines**. **Any two lanes that add an ops check will always collide there.** It is **always additive** (keep both scripts, chain both) — a known, expected conflict class, **not a real collision**. Do not re-diagnose it next time.

### Still open on this surface
- **2 gaps stay honest** (functional groups, radius-from-circumference) — their figures were held pending the label rulings; now unblocked as a small follow-up.
- **`[FU-TUTOR-LEGACY-RETIRE]` BLOCKED — those files are NOT dead** (the dispatch's premise was wrong). `mentor.cjs` has 3 live routes off `index.cjs`; `ConceptTeachDrawer` is still mounted by `ConceptSpine.tsx:692` + `TopicHub.tsx:1789`; `TeachFlow` is mounted by ConceptTeachDrawer. **Only `TutorDrawerV2` is dead** (zero code importers; 6 ungated ops scripts read it as text). D-TUT-12 cannot close until the old Topic Hub tutor is retired. **`TutorPage.tsx` is NOT an importer** — its line 3 is a comment (the grep-hit-isn't-an-import trap, hit twice this session).
- **`[FU-TUTOR-INCHAT-QUESTION-UPLOAD]`**, **`[FU-TUTOR-READ-QP-RECORD]`**, **`[FU-TUTOR-SUBREGION-FOCUS]`** — all still queued.
- **`<EquationInput>` into the tutor composer** — deliberately deferred (a real composer-UX change; kept the PR focused).

### Gates + process
Isolated worktree `LT-worktrees/tutor-stage3`, branch `feat/tutor-stage3-explanation-panel`. Pre-flight report → **STOP for owner approval** → 4 rulings → build → gates → push → CI green → owner byte-review → owner merge. **Never self-merged.** tsc · lazytopper ops matrix (incl. the new guard AND #445's objective-dedup, both chained) · root matrix **190/190** · mojibake · `scope:guard --mode mixed` · `git diff --check` · CI `quality-gate` + `lane-overlap` + Vercel all green. Forbidden files untouched beyond the granted 2 lines.

**Owner live-verify:** the two figures named — **atmospheric refraction** (the 2-panel NCERT trace) and **the reactions scheme** (the "Acid" vs conc. H₂SO₄ fix).

---

## #447 merged — QR PR-2: SCAN-TO-SEND on QUICK PRACTICE + HPQ + TOPIC HUB — **owner LIVE-VERIFIED** — trunk `d99c14d`

**Post-merge trunk: `d99c14d` (squash of #447) on top of `c2db430` (#446 docs) and `ad2a9b2` (#445). Re-derive the tip after this docs PR merges — never trust a written SHA. #447's own run is the live example: docs #446 merged MID-SESSION and the branch went stale underneath it (the 9th stale-base catch in this project).**

**ONE file (`SolutionChecker.tsx`, +62/−7). ONE wire lit THREE surfaces** — Quick Practice, HPQ and Topic Hub all render `SolutionChecker`. The channel (#441) was reused verbatim; nothing about it was rebuilt. **It does NOT reach C&I** — that surface owns its own upload code (`DesktopCheckImprovePage:1714` is a COMMENT, not an import; re-verified true at `d99c14d`). C&I is **[FU-QR-CI-WIRE]**, still open.

### What shipped
- **The QR affordance, `mode="photo"`** — one handwritten answer to ONE question, so the photo IS the answer. (Contrast CT/Full Mock's `"document"`: a multi-page PDF, where camera-first copy would have a student shoot page 1 and believe they were done.)
- **The seam contract, honoured:** QR sits as a **sibling of the dropzone, INSIDE the `answerTab === "upload" && !hasFile && !result` block — never a third peer.** A QR handoff produces a FILE (the same tuple `handleFileSelect` fills) ⇒ it is a **sub-mode of upload**, not a peer of the type/upload segmented control. **360px is safe TWICE over:** the control keeps exactly two `flex:1` peers, AND `QrAnswerHandoff` returns null below 1024px so it *cannot* render there at all. Sibling, **not nested** — the dropzone is a `<button>` and nesting interactives is invalid markup.
- **The 5 MB promise this panel could never keep — fixed here, deliberately** (see the framing note below). `SolutionChecker` had its **own** `MAX_PDF_BYTES = 5 MB` and told students "Max 3 MB image, 5 MB PDF". Never spendable: base64 inflates ×4/3 ⇒ a 5 MB PDF is 6.67 MB of body against `readJson`'s 5 MB cap. A student attaching a 4–5 MB PDF **on the desktop, with no QR at all**, passed this picker and died at the grader. Now reads `services/uploadLimits.ts` (honest 3.5 MB); both copy strings derive from the constants they enforce.

### ★ THE FRAMING THAT MATTERS — this was NOT a surface #443 "missed"
The owner corrected an earlier draft of this record, and the correction is the durable lesson: **[FU-QR-SOLUTIONCHECKER-WIRE] was logged BLOCKED — "do NOT touch it until they are out"** — because the QP lane owned `SolutionChecker.tsx` when #443 shipped. #443 correctly scoped itself to **the three host panels that were free at the time** (CT, Full Mock, Worksheet). SolutionChecker was never a forgotten fourth panel; it was **the one correctly held back for PR-2**. **The bug being live until now is the seam contract WORKING AS DESIGNED, not a lapse.** Recording it as an oversight would defame a correct decision and teach the next agent to distrust a contract that just worked. *A deferred fix landing exactly when its lane opens is success, not debt.*

### ★★ THE REUSABLE TRAP — the CT wire is NOT copy-pasteable
**The phone's picker keeps `accept="image/jpeg,image/png,application/pdf"` in EVERY mode.** `capture` only **hints** at the camera — it does **not** restrict the picker. ⇒ **A PDF can legitimately arrive in `mode="photo"`.** The CT panel has no preview, so its 2-field set was sufficient there. **`SolutionChecker` HAS an `imagePreview` branch gated on `!isPdf`** ⇒ it needs the **full FIVE-field tuple** (`fileName`/`isPdf`/`imageMimeType`/`imagePreview`/`imageBase64`). A naive copy of the CT wire would have dropped a real student's QR-delivered PDF into the `<img>` branch and **rendered it broken** — the owner live-verified this exact case. *Reason about the mechanism's actual behaviour; never assume a sibling surface's shape transfers.*

### ★ QR-session reset is STRUCTURAL — no new code, nothing to forget
The seam contract said "`handleClear`/`handleRecheck` must reset any QR session." **They needed no edit.** `!hasFile` gates the mount ⇒ delivery unmounts `QrAnswerHandoff` (its cleanup cancels polling), and clearing remounts a fresh `idle` instance. *The best way to satisfy a reset requirement is to make the stale state unreachable, not to remember to clear it.*

### ★ `mode` threads to the phone as `variant`, not `mode`
`mintQrSlot(idToken, "photo")` → body `{variant:"photo"}` → `qrUploadChannel.mintSlot` persists `variant` on the coordination doc (**defaulting to the SAFER `document`** on anything unrecognised) → `peekQrSlot` → the phone's copy + its `capture="environment"` default. Verified end-to-end, not assumed.

### ★ OWNER LIVE-VERIFIED on the deployed app (not merely CI-green) — all four green
1. Desktop QR → phone photo → **lands and grades on Quick Practice**.
2. A QR-delivered **PDF renders the PDF row, not a broken image** (the case a naive CT copy would have shipped broken).
3. **360px unchanged** — two peers, no QR.
4. **Type/upload behave exactly as before when QR is unused.**

### ★ [FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] — #445 asked PR-2 to "decide that interaction deliberately". DECIDED:
**PR-2 does not compose them, and does not make it worse.** The send is gated on the ACTIVE TAB (`SolutionChecker.tsx:343-344`: `hasImage = answerTab === "upload" && !!imageBase64` / `hasText = answerTab === "type" && ...`), and **QR is reachable only from the upload tab** ⇒ a QR image can only ever be sent from `upload`. **Typed text is PRESERVED in state, not destroyed** — it is still in the textarea on switching back; only `handleClear`/`handleRecheck` clear it. **No silent data-loss path shipped.** The FU stays open on its original terms (making text-alongside-image actually *work* is a grader change → its own PR). **But auditing that gate surfaced a real latent bug — [FU-SOLUTIONCHECKER-STALE-ANSWERTAB], new below.**

### Lane status after #447
- **QR lane** — PR-1 (#441) + hardening (#443) + PR-2 (#447) all LIVE. **NEXT: [FU-QR-CI-WIRE]** (C&I), the last wire. Then the lane is closed but for owner-infra [FU-QR-STORAGE-LIFECYCLE] and [FU-GRADER-5MB-COPY].
- **§7 — the PAYWALL PR — REMAINS UN-DISPATCHED** (unchanged by #447; its trap is recorded under #445 below and is untouched).
- **Branch cleanup is ON HOLD at the owner's explicit instruction** — `feat/desktop-pr-qr2-solutionchecker-wire` (+ worktrees `LT-worktrees/qr-pr2`, `LT-worktrees/docs-447`) plus the earlier merged QR branches await the owner's word. **CLAUDE.md §3: branch deletion is NEVER auto-approved.**

---

## #445 merged — GRADER `objective` FLAG (§2) + ATTEMPT-DEDUP `mode` DROP (§4b) — **owner LIVE-VERIFIED** — trunk `ad2a9b2`

**Post-merge trunk: `ad2a9b2` (squash of #445) on top of `acf3092` (#444 docs). Re-derive the tip after this docs PR merges — never trust a written SHA. (#445's own pre-flight caught a handoff written against a tip FOUR commits stale, and a shared checkout that was too.)**

**Two bugs, ONE root — nothing client-side could tell an objective question from a subjective one.** That is why the "+0 marks" chip and the attempt double-count both existed, and why they shipped as one PR.

- **§2 — the grader now SAYS a question is objective.** It has always (PR-348) zeroed per-step marks on an objective question BY DESIGN — the whole 0-or-full mark lives at **answer level** — but never emitted that fact. So five render sites printed **"0 marks / +0" on every step of an MCQ under a "Full marks 1/1" header**, reading as *the student scored 0 on every step*. Fix: **one additive `objective` field from BOTH grader functions** (`handleCheckSolution` + `normaliseStructuredResult` — the keep-in-sync pair, **patched together**), threaded to the five chip sites, which **suppress the chip and KEEP the annotation**. **Gated at the VIEW, not grade-time** (stored scorecards froze the old 0s; a grade-time fix could not reach them, and rewriting storage was never wanted). **No score change; subjective questions byte-identical.**
- **§4b — the live double-count, cured at the durable layer.** `attemptDedupKey` included `ctx.mode`, and **★ the key IS the Firestore doc id** (`practiceInsights.ts` → `doc(..., "attempts", attemptId)` + `setDoc({merge:true})`) — so the dedup window is **all-time and cross-device**, not the 400-entry local ring (that ring is only a fast pre-check). A wrong-MCQ-click (`mode:"mcq"`, 0/1) then a graded typed answer (`mode:"graded"`, 0/1) on the same question minted **TWO permanent attempt docs** → progress counted the question twice, forever, on every device. Dropping `mode` collapses exactly that pair into one doc. **The score stays in the key (`${scored}/${available}`), so 0/1 vs 1/1 never collapse.** `mode` still persists in the attempt **DOCUMENT** (display/analytics) — only the identity key changed.

### ★ OWNER LIVE-VERIFIED on the deployed app (not merely CI-green)
1. MCQ typed-answer → the **"+0 marks" chip is gone, the annotation is kept**.
2. A 5-mark subjective question → **per-step marks still shown** — proves the objective gate did **not** leak into the subjective path.
3. Click-wrong-then-grade on one MCQ → **attempt count +1, not +2**.

### ★ THE UNBLOCK — `SolutionChecker.tsx` IS NOW VACATED
#445 was the **last lane holding `SolutionChecker.tsx`**. Collision-clear was confirmed three ways: no branch or open PR touched the file (its only history was #436, already merged), the file contained **zero** QR references, and CI **`lane-overlap` PASSED**. **[FU-QR-SOLUTIONCHECKER-WIRE] (QR PR-2) is UNBLOCKED and is now DISPATCHED to a fresh agent.** ⚠ **Line numbers in `SolutionChecker.tsx` MOVED in #445** (dead banner deleted, chip gate added, `AnnotatedStepCard` gained an `objective` prop) — **re-derive them; do not trust any line number written before `ad2a9b2`.**

### ★ Notes for the QR PR-2 agent (from #445's context; not recorded elsewhere)
- **The file is yours — no lane contends for it.** One wire covers **QP + HPQ + TopicHub** (`PracticeQuestionCard:607` · `HighlyProbableQuestions:2037` · `TopicHub:1439`) — **NOT C&I**, which owns its own upload code (already recorded; re-verified true at `ad2a9b2`).
- **Do not disturb the new `objective` prop threading** — `AnnotatedStepCard({ step, objective })`, call site passes `result.objective`. Display-only; QR touches the upload path, so they should not meet.
- **★ `[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE]` sits directly in QR PR-2's path.** The client is `hasText && !hasImage` **and** the grader route branches the same way — a QR upload sets the IMAGE, so if the student has also typed, **one of the two is ignored at BOTH layers**. Decide that interaction deliberately; do not assume they compose.
- **The real upload ceiling is ~3.5 MB, not 5 MB** — `src/services/uploadLimits.ts` (base64 inflates ×4/3 against `readJson`'s 5 MB cap). Already unified + guarded in `test:qr:channel`.
- **`lazytopper.checkResult.v1.` (the cached graded result, `SolutionChecker.tsx:8`) has NO version bump across shape changes** — if QR PR-2 changes the result shape, consider whether a stale cached entry can render it.
- **§4b consequence:** a QR-uploaded → graded answer records `mode:"graded"` and now **dedups against an MCQ click at the same score on the same question** (one attempt doc). Intended — it is the same question-outcome.

### Lane status after #445
- **QR PR-2** — UNBLOCKED, **dispatched to a fresh agent** (this lane's window closed at #445).
- **§7 — the PAYWALL PR — REMAINS UN-DISPATCHED**, waiting its own turn. Its **§7.7 test is drafted and PARKED** at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs`: it pins that a **re-check spends AGAIN** (a second Gemini call → paywall counter **+2**) while the attempt stream still holds **ONE** doc. ★ **That is the one place "the same fix for two problems" would be WRONG:** the attempt key counts **distinct question-outcomes**; the paywall counter counts **API spend events**. **Do NOT dedupe the paywall counter against the attempt key — it under-bills every re-check.** Baseline still true: **`recordQuestionAnswered` has NO caller**, so the daily counter ticks for nobody; §7's wiring re-arms the gate for the first time. §7 must also stay OFF `subscriptionService.ts` / `AuthContext.tsx` / `featureGates.ts` (the urgent cloud-auth lane owns those).

---

## #441 + #443 merged — QR DESKTOP→MOBILE ANSWER UPLOAD is LIVE — trunk `5aaaeec`

**Post-merge trunk: `5aaaeec` (squash of #443) on top of `e07c757` (#436 QP sessions) and `9ebb87c` (squash of #441, the QR PR-1). Re-derive the tip after this docs PR merges — the tip moved FOUR times across this lane (#435 → #438/#439/#440 → #441 → #436 → #443). Never trust a written SHA.**

**The friction is dead:** a student practising on a laptop who solved on paper no longer photographs it, WhatsApp/emails it to themselves, saves it and uploads from the laptop. The desktop shows a QR, the phone scans + sends, and the file lands in the SAME answer box and grades exactly as today. **Owner live-verified on the Full Mock result screen.**

- **#441 (`9ebb87c`) — PR-1, 12 files.** Channel + 4 endpoints + `/u/:token` phone page + `<QrAnswerHandoff/>` + the 3 owner-approved `App.tsx` lines. Wired into `ChapterTestUploadPanel` + `WorksheetGradePanel`.
  **ONE wire covered THREE surfaces** (CT in-test, CT result, Full Mock) because `ChapterTestUploadPanel` is shared by `ChapterTestPage.tsx:711` **and** `FullMockPage.tsx:1172`. **Wire the shared component, not each page** — that is the reusable lesson.
- **#443 (`5aaaeec`) — 9 files.** Copy follows the HOST SURFACE; the real upload ceiling; a refusal a student can act on.

### ★ ARCHITECTURE (owner-decided) — Firebase Storage + a Firestore coordination doc, both server-side via firebase-admin
The phone NEVER touches Firebase: it POSTs to a token-scoped endpoint; the backend writes with admin credentials; the desktop pulls back through the backend. **No client touches Storage or Firestore on this path.**
- **NO rules change, either side, and NO deploy step.** firebase-admin **bypasses** Firestore AND Storage security rules, so the existing deny-all catch-alls (`firestore.rules:143-145`; the Storage `/{allPaths=**}` deny) are CORRECT and actively protect this path. **Do not add a rule for `qrUploadSlots` or `qr-uploads/`. Do not touch `ncert/`** (it serves live student PDFs).
- **No new dependency, no new env var, no Vercel change, no Railway change, no Firestore composite index** (both queries are single-field equality).
- Bucket is derived, not configured: `VITE_FIREBASE_STORAGE_BUCKET || ${VITE_FIREBASE_PROJECT_ID}.firebasestorage.app` → `lazzyy-topper.firebasestorage.app`. (`initializeApp` passes **no** `storageBucket`, so `admin.storage().bucket()` with no argument would throw — the name MUST be passed explicitly.)

### ★★ THE CREDENTIALS TRAP — record this; it WILL be re-derived otherwise
**`verifyIdToken` working proves NOTHING about service-account credentials.** It needs only the **project id** + Google's **public** certs over HTTPS — **no service account**. Storage and Firestore **writes** do need one, and Railway has **no GCP metadata server**, so an ADC fallback resolves to nothing.
- The owner's log read **`credentials: explicit`** — but **because `FIREBASE_SERVICE_ACCOUNT_KEY` was already set for the pre-existing `[share]` feature, NOT because auth implied it.** The inference ("admin auth works, so Storage will work") was invalid; the conclusion was true by coincidence.
- **Proven live** that firebase-admin IS initialised: `requireFirebaseAuth.ts` returns **503 "Auth not configured"** when the app is null (L41-43) but **401** on a bad token (L53), and the no-token 401 fires first (L37) — so a **garbage Bearer token** is the discriminating probe. `/shared-api/admin/cache-stats` returned **401, not 503** ⇒ `VITE_FIREBASE_PROJECT_ID` is set.
- **Nothing in the repo could settle the credential question:** `adminFirestore` is referenced ONLY in `share.cjs:119-129`, which is dead behind the `SESSION_SECRET` 503. **No live path had ever exercised credentialed admin** — the QR lane is its first consumer.

### ★ POSTGRES IS NOT PROVISIONED — and the C&I "cache" no-ops in production
`DATABASE_URL` is **unset**. `stepSolution.cjs:6` `getPool()` returns `null` → every read misses, every write silently drops. **Harmless for a cache** (a miss just regenerates) — **fatal for anything that must deliver.** The QR spec's original option (A) ("Postgres, already used for the C&I cache — no new infra") rested on this false premise; building it would have shipped a feature that silently hangs forever.
- **PR2 (harden) never landed ⇒ every env var on its line is unset.** LIVE PROOF: `POST /api/share-token` → **503 `SESSION_SECRET not configured`**. Same line: `DATABASE_URL`, `ADMIN_FIREBASE_UIDS`, `SESSION_SECRET`. **[FU-BACKEND-DATABASE-URL-UNSET] says do NOT provision.**

### ★ SECURITY — the TWO-TOKEN split makes "write-only" literally true
A single token would **not** be write-only: whoever held the QR could read the image back. Split at mint:
- **`uploadToken`** — in the QR, held by the phone. Grants exactly "write ONE image into ONE slot". **Can never read.**
- **`pickupToken`** — never leaves the desktop that minted it (held in a ref, never in the QR). Reads once, destroying the slot.

A stolen QR buys *"put one image into a slot you cannot read"* for ≤5 min — which the student SEES and can discard. 256-bit `crypto.randomBytes`; **stored sha256-HASHED, never raw** (a Firestore dump yields no usable token); single-use both ends; **delete-on-pickup is the primary retention control** for a minor's handwritten work; never logged. **No `SESSION_SECRET` dependency** — the Map/doc IS the authority, so there is no signature to forge (and depending on it would have shipped the feature dead).
- **MINT requires auth; UPLOAD is token-only.** Per-UID caps — **never per-IP**: our students share school wifi, coaching-centre networks and carrier NAT, so an IP cap would throttle a whole school while one kid practises. A login wall on the *phone* is the exact friction being removed.

### ★ #443 — "PDF up to 5 MB" was NEVER spendable, on EITHER path (a live PRE-EXISTING bug)
base64 inflates ~4/3, so a 5 MB PDF is **6.67 MB** on the wire against `readJson`'s 5 MB body cap (`httpUtils.cjs:57`, which destroys the request: *"Request body too large"*). **A student attaching a 4-5 MB PDF ON THE DESKTOP — no QR involved — passed the picker and then died at the grader.** That predated the QR lane.
- **MEASURED** against the assembled 8,584-row bank (transpile-then-require, never a text scan): the questions array riding alongside the image is only **0.10 MB** worst case (38 Qs; median row ~1,005 bytes) ⇒ **true ceiling ≈ 3.68 MB**. The 3.5 MB cap was already right; **the COPY was the lie.**
- Limits now live in **ONE** place: `src/services/uploadLimits.ts`, with the arithmetic written down. Both panels' 5 MB allowance dropped to the real number so an over-cap file fails **honestly in the picker / on the phone** — never "uploaded" then dead at the grader.
- **A PDF cannot be downscaled** (there is no canvas for it), so its limit is a hard wall and must be refused early. Images are downscaled to fit, so theirs is a target.

### ★ #443 — copy follows the HOST SURFACE, not the component
A Chapter Test / Full Mock / Worksheet wants ONE **multi-page** PDF. The old copy said "Photograph your written answer" with `capture="environment"` making the camera the default ⇒ **a student photographed page 1 of a 20-question mock and believed they were done.** A feature that works and a student cannot use correctly.
- `QrAnswerHandoff` now takes a **REQUIRED `mode` ("document" | "photo") with NO DEFAULT** — a new host must decide consciously rather than silently inherit misleading copy.
- **The mode rides on the coordination doc** (set at mint, returned by the existing `/status` peek) because **the phone page is reached by TOKEN ALONE** and cannot otherwise know which surface minted it — and the phone is where the bug bites. It carries no student content, so write-only is intact (gate proves it).
- **`capture` is OMITTED in document mode** so Files/scanner is a first-class choice. `accept` is deliberately broad — the picker returns camera OR gallery OR a PDF; `capture` only sets the DEFAULT. **Do not "simplify" the accept list** (commented at the input).

### ★ THERE WAS NO QR PDF BUG — diagnosed, not assumed
The reported *"PDF lands but the grader can't read it"* was **disproven at file:line**, and three theories died in order:
1. **"The image downscaler mangles PDFs"** — FALSE. A PDF returns at `qrUploadService.ts:174`; the canvas starts at **:181**. It never runs.
2. **"The channel corrupts the bytes"** — FALSE. Driving the REAL channel with a structurally valid PDF: base64 **identical in==out**, mime preserved, byte length identical, `%PDF-`…`%%EOF` intact.
3. **"The questions array blows the body cap"** (the agent's OWN best theory) — FALSE, and disproven by measurement (0.10 MB, above).
**The owner's desktop-direct test settled it:** the grader **REFUSED** an unreadable PDF rather than guessing a mark — **correct behaviour, no QR involved. The channel is sound.** *(Lesson: three plausible stories, all wrong. Only the trace and the measurement were right.)*

### Gotchas worth keeping
- **`scope:guard --mode product` FAILS** on a PR that adds an ops gate + `package.json` — that is a product **+ tooling** PR. Use **`--mode mixed`** → `SCOPE_GUARD_OK (lanes=product+trackedTooling)`.
- **vitest cannot run on Windows** (rollup native is linux-pinned) **and CI runs the MATRICES, not vitest** ⇒ a vitest file asserting a security property would **never block a merge**. Put such proofs in `scripts/ops/*.mjs` + wire into `test:matrix:all`. Done: `qr_upload_channel_acceptance.mjs`, **46/46**, incl. a **cap-arithmetic assertion** negative-tested to go red on a 5 MB cap (*"6.86 MB >= 5.00 MB — the advertised PDF limit is UNSPENDABLE"*). **A guard that cannot fail is theatre.**
- `App.tsx` `BARE_FULLSCREEN_PREFIXES` is the file's **own designed extension point** ("so Full Mock can join later with one entry") — one array entry bought navbar + BottomNav + DesktopShell suppression for `/u`. Routes are flat and **public by default**; `isDesktopShellRoute` is an allowlist.

## #435 merged + OWNER LIVE-VERIFIED — MATHTEXT COMMAND CORRUPTION CLOSED: protect-then-promote — trunk `fd57db1`

**Post-merge trunk: `fd57db1` (squash of #435) on top of `64a1d69` (tutor visual catalogue + Fable concept-figure curation, parked for Stage 3) and `2ae80ce` (skill: evidence standard + inference-trap rules) — both landed mid-lane, so #435 needed an update-branch before merge. This docs-only PR (`docs/post-pr-435-mathtext-command-corruption`) records the merge. Re-derive the tip after it merges (the usual one-commit lag). NOTE: the tip moved TWICE during this lane — never trust a written SHA.**

**[FU-MATHTEXT-COMMAND-CORRUPTION] is CLOSED — the most VISIBLE quality bug in the product is fixed and owner-live-verified: the tutor renders `\cos²A` / `\sin²A` as real maths, and every consumer surface renders exactly as before.** `MathText` is the app's **single shared maths renderer** (13 real consumers; **no second renderer exists — if a future lane proposes one, that is the thing to push back on**). Its auto-promote had **no concept of a protected span** and ran blind regexes over the whole string.

- **#435 (`fd57db1`) — 2 files, ZERO consumer edits:** `src/components/question/MathText.tsx` (modify) + `src/components/question/MathText.test.tsx` (new). Zero-consumer-edits is what kept the lane disjoint from the live parallel lanes; `lane-overlap` CI green.
- **Pre-flight corrected the brief on two load-bearing points** (owner independently re-verified both against the tip):
  1. **The reported repro did not reproduce.** The rule is `([a-zA-Z])\^(\d+)` — it needs a **digit right after `^`**, so `\cos^{2}` (braced) never matched. The mangle input is the **unbraced** `\cos^2`; the braced form printed as **raw source** — a different defect. **A fix aimed at the documented repro would have fixed NEITHER.**
  2. **"Math wrapped in `\(...\)` renders perfectly" was only half true** — `\[...\]` was **never protected**, so the tutor's *correctly wrapped block* maths was mangled anyway. **The #432 prompt-hardening belt could not save it — this was always the braces' job.**
- **One root cause → four defects, all closed.** **D1** mangle (`\cos^2 A` → `\co\(s^{2}\) A`) · **D2** raw (`\cos^{2} A`, `\text{LHS} = \frac{1}{2}` printed as literal source; only `\sqrt`/`\frac` had a wrap path) · **D3** block delimiters unguarded (the old mask scanned `\(...\)` only) · **D4** every brace rule used `[^}]+`, cutting at the first `}` → `\sqrt{\frac{a}{b}}` emitted **invalid LaTeX**.
- **Design — protect → promote → wrap (holds by CONSTRUCTION, not by regex luck):** `scanProtectedSpans` FIRST → **delim spans verbatim** (`\(…\)` and `\[…\]` can never be entered) → **`!structural` verbatim** (a lone `\theta`/`\degree` still takes the proven `UNICODE_MAP` path → **zero visual diff on print docs**) → **structural runs wrapped ONLY if `katexCanRender` proves it** → **gaps promoted with NO lookbehind**, so `AB^2` / `CO_2` / `cm^2` stay **byte-identical**. **D1 dies structurally; D2/D3/D4 close with it. The no-regression proof is the ABSENCE of a lookbehind, not a test that happens to pass.**
- **★ Why NOT the one-line lookbehind** — the guard the `sqrt`/`frac` rules **already carry** (which is how we know the pattern was known and the exponent rules were simply missed): it rejects a base letter preceded by **any** letter, silently killing `AB^2 + BC^2 = AC^2` (Pythagoras), `H_2 O`/`CO_2` (Science bank), `24 cm^2` (grader units) — all over the bank, **all rendering correctly today**. **Never trade a bank-wide regression for a trig fix.**
- **★ The rule that had to be corrected mid-build (the generalising lesson):** "structural" first meant *has brace args or a `^`/`_` script* — **syntax**. It passed everything expected of it and was **wrong**: `\tan A` / `\ln x` / `\sin A` have neither and no `UNICODE_MAP` glyph → **printed literal `\tan` to students; D2 still open for that whole class**. Corrected to **"wrap what `UNICODE_MAP` cannot express"** — the real question was never *is it complex* but **can the proven fallback render it**. **Only an ADVERSARIAL CORPUS caught it; an example-based suite would have gone green.** Full write-up in OPEN_QUESTIONS — it generalises past this file.
- **Deleted dead `renderMathInText`** (zero call sites repo-wide incl. `server/`+`scripts/`; the apparent extra hit was `renderMathInElement`, KaTeX's own auto-render, in a notes prototype — a different symbol). A second export of the shared promote is **exactly the shape of the grader half-fix that shipped a bug before.**
- **Tests:** `MathText.test.tsx` pins BOTH halves as properties — (a) bare commands never mangled · (b) braced form renders · (c) `AB^2`/`CO_2`/`cm^2` **byte-identical to today** (expectations captured from the ORIGINAL implementation — they record what ships, not what would be nicest) · (d) `\[…\]` intact · (e) nested braces · (f) prose untouched · (g) `EquationInput`'s four palette tokens still promote · (h) lone `\theta`/`\degree` still take `UNICODE_MAP` · the render-proof gate · `f(f(x)) === f(x)`.
- **Gates:** tsc · mojibake · scope:guard product · root matrix **181/181** · lazytopper ops matrix 8/8 · `git diff --check` clean · **CI quality-gate green** (incl. the linux build) · lane-overlap green. **vitest NOT run — it is NOT gated anywhere → [FU-CI-GATE-VITEST].** Local stand-in: the **real** promote code, mechanically extracted from the committed file, run under Node 22 type-stripping against a **29-case corpus — all green**. Reports: `Desktop/diff/report-mathtext-command-corruption-{preflight,pr435}-2026-07-15.md`.
- **★ NEW [FU-CI-GATE-VITEST] — FOUR vitest suites exist and NONE run: `MathText.test.tsx` (shared renderer), `EquationInput.test.tsx` (equation widget), `tutorRoundTrip.test.ts` (tutor round-trip), `WorksheetPrintDoc.test.tsx` (worksheet print doc).** `quality-gate.yml` = root guard matrix → mojibake → build → ops matrix. **No vitest.** The prior "vitest runs in CI" claim was a misread of the **root** matrix — Node's **built-in** runner printing `# tests 181 / # pass 181`, which scrolls past looking exactly like a suite. **A test that never executes is decoration. Fix before soft launch.** Also new: [FU-MATHTEXT-MULTILETTER-BASE], [FU-MATHTEXT-RENDER-GATE-RATIONALE] (do NOT delete `katexCanRender` as redundant).
- **NEXT = nothing from this lane; it is CLOSED.** Three lanes are live and file-disjoint: **QP-sessions (#436, being widened with the fetch fix)** · **QR desktop→mobile upload** · **Fable bank expansion**. Do NOT start anything new here.
## #438 merged — bank data-quality: [FU-BANK-UNRESOLVABLE-MCQ-KEYS] CLOSED (13 rows withheld, not 34; ZERO were key-fixes) — base trunk `a5691a7`

**PR #438 (`fix/desktop-pr-mcq-key-repair`, worktree-isolated, branched from live trunk `a5691a7`). 1 file, +29/-1, data-only. Awaiting owner byte-review + merge (`src/data/**` is CODEOWNERS — never self-merged).** First of the bank-completion sequence: MCQ repair -> then 4 expansion PRs (3 topics each).

- **13, not 34.** Derived live over the 8,597 bank through the REAL grader module (`server/routes/objectiveScoring.cjs`), not a re-implementation. The "34" came from an exact trim+lowercase scan; the real contract (`normaliseOption` + letter<->text bridging + >=3-char partial match) forgives 21. **Standing lesson: derive against the real consuming module.**
- **SEVERITY CORRECTION (the recorded claim was FALSE).** "A student who picks the CORRECT option is scored WRONG" never happens: server `scoreObjective` returns `resolved:false` and defers to the model's binary verdict; client `PracticeQuestionCard` skips the scoring branch entirely when `correctIdx < 0`. **True symptom: garbled options + SILENTLY NEVER SCORES** — a dead question, not a mis-scored one.
- **ALL 13 WITHHELD; ZERO key-fixes.** An interim "~4 key-fixes" estimate (from 160-char previews) was WRONG — at full fidelity every row has destroyed OPTIONS too, so a key-only repair leaves it unanswerable and authoring distractors would FABRICATE a PYQ. 2 figure-dependent; 1 (`PYQ-S-2024-MAG-002`, positron) fails the syllabus gate. Bank 8,597 -> **8,584**. Bodies kept INTACT for **[FU-BANK-MCQ-REEXTRACT]** (pymupdf; `pdfplumber` BANNED).
- **CI landmine cleared** (`fullMockBlueprint.test.ts` key-resolves assertion passed only by seed luck; 0 unresolvable keys remain). **`CBE-S-MAGN-A-001` HOLD CLOSED** (a scan artefact, never a defect). **168 no-options rows CLOSED** (legitimate 1-mark VSA).
- **Gates @ `4009ef7`:** tsc - mojibake - scope:guard product - root **181/181** - ops matrix - **step-6 runtime proof 8,584 / 0 dup / 0 orphan / 26-of-26** - diff --check clean. Forbidden files byte-untouched (`predictionTypes.ts`, `checkSolution.cjs`, `objectiveScoring.cjs`, `syllabusGuard.ts`).

**Also verified this session (details in `handoff/BANK_EXPANSION_LANE_STATE.md`):**
- **REACHABILITY: all four surfaces source the canonical bank. [FU-QP-WORKSHEET-BANK-SOURCING] WITHDRAWN — premise disproven.** QP + Worksheet reach it one transitive hop below their direct imports (`practiceSetGenerator`/`predictionDataService` -> `PredictionCore` -> `unifiedQuestionBank` includes `canonicalQuestionBank`); proven by calling the real fns (10/10, 8/8 canonical). **The expansion IS visible to students.**
- **Owner's live "cosec 60°" bug ROOT-CAUSED -> [FU-BANK-SCARCE-BAND-MISBANDING].** `TG3-056` is a CANONICAL BANK ROW (D/5mk/Easy) — the bank is served faithfully; the BANK is wrong. **76 objective-format rows (MCQ/AR, 4 options) at section D / 5 marks** (grader clamps 0-or-5, reaches CT/FM Section D) + ~178 under-stepped D/E solutions, over 16 topics. Own PR(s), pre-launch, class (a) first.
- **RULING: magnetic-effects is RETAINED & EXAMINED (Unit IV = 13 marks); Motor / Electromagnetic Induction / Electric Generator are OUT of board-prep** (official 2026-27 PDF, pymupdf-extracted: assessed "only formatively... without adding to summative assessments"). The "Note for Teachers" trap that caused the original wrongful drop is documented. **`CLAUDE.md` §5 is STALE — FLAGGED, not edited (owner's call).**
- New: **[FU-TOPICMATCHES-SUBSTRING-CONFLATION]** (`circles` <-> `areas-related-to-circles`, the only colliding pair of 26 — both in the remaining Maths set) - **[FU-REACHABILITY-TEST-SCOPE]** (step 6 asserts bank integrity, never surface sourcing).
- **PACKAGING RATIFIED: 3 topics per PR (4 PRs)**, not 2 PRs of 6 — owner byte-review caught real syllabus errors in 2 of 11 batches that skeptics + gates passed; diff size is the remaining variable.

Reports: `Desktop/diff/report-bank-completion-scope-2026-07-15.md` + `report-reachability-and-ruling1-evidence-2026-07-15.md`.

## #432 merged + OWNER LIVE-VERIFIED — TUTOR STAGE 2 COMPLETE: the six round-trip fixes — trunk `65fdf85`

**Post-merge trunk: `65fdf85` (squash of #432) on top of `e458832` (#431 equation palette) / `bbf02ca` (#429 equation widget) / `68fbc03` (#430 equation API contract) — all merged since the Stage-2 base. This docs-only PR (`docs/post-pr-432-tutor-roundtrip`) records the merge. Re-derive the tip after it merges (the usual one-commit lag).**

**Tutor STAGE 2 is COMPLETE and owner-live-verified. The round-trip works: the durable `tutorSessions/{uid}` session survives close/reopen (real continuity memory), the tutor routes OUT to Quick Practice / Check & Improve and receives the student BACK into the SAME thread with the result in hand. Stage 3 (explanation-panel visuals) is a SEPARATE dispatch, not started.** #428 shipped Stage 2; #432 fixed the six owner-verified bugs found on the #428 preview. Fresh engine throughout (D-TUT-12, zero old-engine imports); honesty guard structural (the tutor READS `practiceInsights`/`sessionRecords`, NEVER writes a grade). Isolated worktree `LT-worktrees/tutor-roundtrip-fix`; never self-merged — owner byte-review CLEAN + 360px live-verified + merged; CI quality-gate + lane-overlap + Vercel all green.

- **#432 (the six round-trip fixes, `65fdf85`) — 9 product files (+375/−68), one coherent correction.**
  1. **Practice routing → Quick Practice, concept-filtered** (NOT the worksheet BUILDER, which dropped the student into a separate build-and-download flow and killed the loop). New `buildQuickPracticeRoundTripHref` mirrors the Topic Hub concept-row deep-link (`/practice/:grade/:subject` + `topic`/`focus`/`subtopicHint`; NO mark-band per D-TUT-7 — the missed concept, not a mark filter). **Return detection moved to `practiceInsights` attempts** (`getAttemptsFromCloud({start:departureTs})` + client-side canonical `topicKey` match via `canonicalSlugMatches`) — the practice pending marker `surface = "practice"`. The reframed practice opener is honest (marks/correct count, NO invented method-vs-presentation split — that split is the grader's, from C&I).
  2. **Holding banner clears on return/re-engage** — sending any message, dismissing (✕), or an unmatched "I'm back — check" tap all unblock; never an indefinite "still waiting" and never a dead button. Exactly ONE actionable, dismissable banner (de-duped vs the away-cue bubble). A `pendingRef` prevents an in-flight `runModel` re-persisting a just-cleared marker; a `resolvingRef` guards a double-resolve injecting two openers.
  3. **CTAs are intent-driven, not a standing pair.** The model emits a machine-readable `[[offer:practice]]` / `[[offer:check-improve]]` sentinel on its OWN last line; the **server strips it from the prose** and returns a sibling `offer` field; the UI gates ONE CTA off the LATEST tutor turn's `offer` (D-TUT-4/5: practice only after the tutor offered + student agreed; C&I only after a specific-question doubt + agreement). Garbled/missing tag → no CTA, never a crash (defensive parse client + server).
  4. **Demonstrations pull a VERIFIED BANK question** (owner chose bank-over-self-invented — self-gen produced an incomplete question live). Client pre-selects one via `selectTutorDemoQuestion` → `selectBankQuestions` (`resolveCanonicalSlug`, filtered to `solutionSteps`-bearing, soft `subtopic` concept-match) and passes it as `demoQuestion`; the prompt solves THAT verbatim. Correctness-railed self-gen fallback ONLY when the bank has nothing usable (question must be complete + correct before shown).
  5. **Equation rendering (prompt leg)** — `tutorSystemPrompt.cjs` now mandates EVERY expression wrapped (inline `\(...\)`, block/derivation `\[...\]`) with the exact `\text{}`/`\frac{}`/`\sin^{2}` bare-vs-wrapped negative example. The `MathText` auto-promote corruption is the belt-and-suspenders half → its OWN PR ([FU-MATHTEXT-COMMAND-CORRUPTION]).
  6. **C&I leg kept intact** — only the practice leg moved to `practiceInsights`; C&I keeps its `sessionRecords` + `matchReturningRecord` + `composeReturnOpener` path.
  - Also **reconciled the Stage-1 prompt residue** that told the model routed practice "does not exist yet" — it does now, via the round-trip.
- **Files:** `server/prompts/tutorSystemPrompt.cjs`, `server/routes/tutor.cjs` (new `extractOfferTag` + `normalizeDemoQuestion` helpers, exported for test), `src/ai/tutorClient.ts` (`TutorOffer`/`TutorDemoQuestion` types + defensive parse), `src/pages/tutor/{TutorPage.tsx, useTutorSession.ts, tutorRoundTrip.ts, tutorRoundTrip.test.ts (new), tutorDemoQuestion.ts (new)}`, `src/services/tutorSessionStore.ts` (`surface` union +`"practice"`). **No forbidden files touched** (reads from `src/data/bankQuery` only, never edits `src/data`).
- **Gates @ `721a9fb`:** tsc `-p tsconfig.app.json` clean · mojibake · scope:guard product · root matrix **181/181** · lazytopper ops matrix (bank 8,597) · server-helper Node smoke (sentinel strip + garbled→null + demo verbatim + contradiction removed) all PASS; CI quality-gate (linux vite build) **pass 1m39s**. vite build is linux-only (CI-gated). Report: `Desktop/diff/report-tutor-roundtrip-fixes-2026-07-14.md`.
- **Live outstanding (see OPEN_QUESTIONS):** [FU-MATHTEXT-COMMAND-CORRUPTION] (still reproduces live after the prompt hardening — prompt alone does not fix it; needs the shared-component PR) · [FU-QUICK-PRACTICE-DURABLE-SURFACE] (no `SessionSurface` "quick-practice" → the `practiceInsights` round-trip is a workaround) · [FU-RETURN-TICKET-CONTRACT] (the tutor sends `returnTo`/`source=tutor` but NO destination reads them → loop is one-way today) · [FU-PRACTICE-COUNT-PASSTHROUGH] · [FU-TUTOR-INCHAT-QUESTION-UPLOAD].
- **NEXT = Tutor Stage 3 (the explanation-panel visuals) — a SEPARATE dispatch with a fresh brief.** The `conceptVisualCatalogue` (D-TUT-14) + matcher fix (D-TUT-15) + `NcertPageModal` reuse + interactive-as-enrichment + the AI-gen gap-fill cache (D-TUT-16). Do NOT start unprompted.
## #429 + #430 + #431 merged + OWNER LIVE-VERIFIED — SHARED EQUATION INPUT/RENDER INFRA (+ friendly-token polish) — trunk `65fdf85`

**Post-merge trunk `65fdf85`. The equation lane = 3 PRs: #429 (`bbf02ca`, product) + #430 (`68fbc03`, the API-contract docs) + #431 (`e458832`, the friendly-token + caret polish). This docs-only PR (`docs/post-pr-431-equation-infra-handoff`) closes the lane. NOTE: the tutor Stage-2 lane also merged in the same window (#428 `7ef4bcf` + #432 `65fdf85`) — those are the tutor lane's to document; mentioned here only as trunk context.**

**A shared math INPUT+RENDER pair now lives at `src/components/equation/`, reusing the app's ONE canonical math grammar instead of inventing a second one:**
- **`<EquationInput>`** — a controlled-textarea DROP-IN (props `value/onChange/placeholder/disabled/rows/className/ariaLabel`) + a collapsible symbol palette + a live KaTeX preview. The palette inserts the FRIENDLY, READABLE shorthand `<MathText>` already auto-promotes — `x^2`, `sqrt{…}`, `frac{a}{b}`, `a_1` — or plain unicode (π θ ≤ ± °), **never raw `\(…\)`**; caret/selection-correct (select `x` → `x^2`; no selection → token lands at the caret so the preceding char is the base; no empty `^{}`). Captures input only — computes nothing (anti-fabrication).
- **`<EquationRender>` = `MathText` RE-EXPORTED** (NO second renderer). Every display surface already renders through MathText.
- **Serialization = the app's ONE canonical grammar:** inline `\(…\)` / block `\[…\]` LaTeX + the readable shorthand + prose. No math typed → plain prose, byte-identical to the old textarea (anti-regression). The grader (`checkSolution.cjs`) is UNTOUCHED and receives the student string VERBATIM; it already reads this grammar in production via bank `solutionSteps` injected as the marking scheme — so a serialized answer grades on equal footing with the plain equivalent. Proven by the paired-answer harness `scripts/ops/equation_grader_compat_harness.mjs` (8 pairs: byte-identical / well-formed / semantics-equal / no-fabrication) + owner live-verify.
- **Wired** (textarea → `<EquationInput>`; the 4 graded echo fields description/studentWork/teacherAnnotation/correctedWorking → `<EquationRender>`): `SolutionChecker` (the SHARED subjective input — Quick Practice / HPQ / Topic Hub inherit it), mobile `CheckImprove.tsx`, `DesktopCheckImprovePage`. The PRINT docs (`CheckImproveGradedPrintDoc`, worksheet docs) already rendered via MathText — untouched. MI displays store classifications only (no raw student prose) → no MI render surface needed.
- **No new dependency** (KaTeX already present). #430 shipped `handoff/EQUATION_INPUT_API_CONTRACT.md` so the tutor composer can consume `<EquationInput>` drop-in (a later tutor follow-up — this lane did NOT touch `TutorPage.tsx`).
- Gates on all three PRs: tsc · mojibake · scope · diff-check · root **181/181** · ops matrix · harness **8/8** all PASS; build + vitest gated by CI (linux-pinned). Reports: `Desktop/diff/report-equation-widget-{preflight,build}-2026-07-14.md`.
- **NEW open follow-up (likely next lane for this owner): [FU-MATHTEXT-COMMAND-CORRUPTION]** (see OPEN_QUESTIONS) — MathText's bare-pattern auto-promote grabs the fragment inside a bare LaTeX COMMAND (`\cos^{2}` → `\co\(s^{2}\)`), still reproducing live in tutor turns. The friendly tokens THIS lane inserts (x^2, sqrt5, frac1/2) are the promote's intended inputs and do NOT trip it.

## #425 + #426 merged + OWNER LIVE-VERIFIED — TUTOR STAGE 1: the fresh `/api/tutor` chat shell (+ language/offer follow-up) — trunk `d3c7be2`

**Post-merge trunk: `d3c7be2` (squash of #426, the Stage-1 follow-up) on top of `2864be9` (squash of #425, the Stage-1 chat shell). This docs-only PR (`docs/post-pr-426-tutor-stage1-handoff`) catches up the handoff for BOTH tutor merges together (per the owner). Re-derive the tip after it merges (the usual one-commit lag).**

**The Tutor surface has its FIRST live implementation: a FRESH engine (D-TUT-12) behind `/tutor`, premium-gated, owner live-verified. Stage 1 of the 3-stage staged build (chat shell now; round-trip = Stage 2; explanation-panel visuals = Stage 3). Old `TeachFlow`/`ConceptTeachDrawer` kept LIVE as the fallback until the new tutor is fully verified.**

- **#425 (Stage 1, `2864be9`) — the chat shell (14 files, +1302/−1).** New `POST /api/tutor` (`server/routes/tutor.cjs` + `server/prompts/tutorSystemPrompt.cjs`) via the shared Gemini client — STATELESS, writes NOTHING to Firestore, so the honesty guard (D-TUT-8: never a grade/score) is structural. ZERO reuse of the six old engine files (mentor.cjs / tutorOrchestrator / mentorModeHandler / TeachFlow / ConceptTeachDrawer / TutorDrawerV2). Fresh UI `pages/tutor/TutorPage.tsx` (two-panel scaffold — chat + a CLOSED explanation-panel placeholder for Stage 3; split desktop / overlay mobile, pure-CSS; nameless header; functional language selector; continuity opener + diagnostic fork; MI surfaces via a client-assembled brief only AFTER the first message — no fabricated continuity) + `useTutorSession` / `tutorContextBrief` (client-assembles MI/progress READ-ONLY, normalized through **`resolveCanonicalSlug` ONLY** — never the banned-vocab rival `resolveCanonicalTopicKey`) + `ai/tutorClient` + `tutorPath`. Entry (additive): ConceptSpine "Ask the tutor" + per-row "Stuck? Ask" (concept pre-loaded); the "Teach me" drawer KEPT as fallback (its demote is a later PR). Sacred (owner-approved exact blocks): `App.tsx` lazy import + `/tutor`→`BARE_FULLSCREEN_PREFIXES` + two `RequirePremium` routes; `firestore.rules` `tutorSessions/{uid}` per-UID block (**DEPLOYED live**; ready for Stage 2, unwritten in Stage 1). Gates green + CI; owner byte-review CLEAN + merged.
- **#426 (Stage-1 follow-up, `d3c7be2`) — 3 live-verify fixes (3 files, +32/−4).** (1) **Language stickiness** — a per-turn steering directive appended as the MOST-RECENT user-side content in `tutor.cjs` so a selector switch overrides many recent turns in the other language (server-only, never persisted → never accumulates); switches both directions live. (2) **Native-script input** — the composer already accepts any script (no filtering); the placeholder now INVITES Hindi/Hinglish. (3) **Closing offer — DEMONSTRATE, not do-their-practice** — "want a couple to try?" (a practice loop Stage 1 can't route → the tutor self-solved the student's practice) reworded to "want to see how a question like this is solved?" + an explicit WORKED-EXAMPLES-vs-PRACTICE rule (DEMONSTRATION = the tutor solves its OWN generated example; "try one yourself" = give + WAIT, never self-solve; the routed "practise a set" offer deferred to Stage 2; correctness rail kept). Owner live-verified (language switching + demonstrate-vs-practice both confirmed live) + merged; CI green.
- **Two live-verify findings carry into Stage 2:** (a) **no memory across close/reopen** — EXPECTED; it is exactly what Stage 2's durable `tutorSessions` session fixes. (b) a **real mobile layout bug** — the BARE_FULLSCREEN tutor scrolls past the composer leaving a large empty gap below (a 100vh-on-mobile issue) → folded into Stage 2 as a pre-step (lock the shell to 100dvh/flex, scroll confined to the message list, composer pinned).
- **NEXT = Tutor Stage 2 (the round-trip), ONE PR — pre-flight in owner review; do NOT build until approved.** Durable `tutorSessions/{uid}` session (thread survives close/reopen AND the round-trip; the continuity opener gets real memory; writes doubts/coverage ONLY, never a grade) + a pending-round-trip marker + a return poll (parent→child→parent to C&I/Practice and back to the SAME thread, graded result injected; "holding your place" cue; **NO `onSnapshot` in the repo → poll on the return navigation event**) + the reframed return-opener (D-TUT-6, reads the C&I record's `fourType` + per-question payload, never re-grades) + upload-a-question flow + the MI-weighted "Practise" → **P-A concept-filtered WORKSHEET** (surface `"worksheet"` writes a watchable sessionRecord) + the mobile-viewport fix. Reports: `Desktop/diff/report-tutor-stage1-{preflight,build}-2026-07-14.md`.
- **COORDINATION** — a parallel lane builds a shared `<EquationInput>` (`src/components/equation/**`); it will NOT touch `TutorPage.tsx` (the tutor lane owns it). Align on the `<EquationInput>` API (props + serialized-answer string contract) via the handoff so the tutor composer consumes it drop-in (Stage 2 if clean, else a small follow-up). Do NOT build a separate equation input.

## #423 merged + OWNER LIVE-VERIFIED — FINAL MOBILE-PARITY SWEEP: one-header on ALL live desktop-shell routes at mobile width — trunk `a8f36ab`

**Post-merge code trunk: `a8f36ab` (squash of #423; feature `feat/desktop-pr-mobile-parity-sweep` @ `0e60dae` off `0c5f75d`). This docs-only PR records the merge. Re-derive the tip after it merges (the usual one-commit lag).**

**#423 merged + owner live-verified (360px) — the mobile-parity rule now HOLDS PRODUCT-WIDE: no live user-facing route shows the OLD global brand bar (LT · LazyTopper · Search · old "C" avatar) at mobile width; every mobile header is the shared MobileShell avatar header (the #410 `accountStatus.ts` dropdown).** Closes the LIVE subset of **[FU-MOBILE-OLD-HEADER-STRAGGLERS]**. Exactly **2 files** (+141/−37): `App.tsx` + `App.bottomNav.test.tsx`. Isolated worktree `LT-worktrees/mobile-parity-sweep`; never self-merged; CI (quality-gate + lane-overlap + Vercel) green.

- **Predicate:** `isMobileSelfChromedRoute` grew the four live desktop-shell families with matchers that **MIRROR `isDesktopShellRoute` exactly** (lockstep by construction): exact `/practice/worksheets` · prefix `/topic-hub`(+`/*`) · prefix `/highly-probable`(+`/*`) · runner regex `^/practice/(?!worksheets/)[^/]+/[^/]+$`.
- **Route-level `<MobileSelfChrome title subtitle?>`** (new, in App.tsx): desktop pass-through (these are DesktopShell routes — desktop chrome byte-identical); mobile wraps the route element in the shared `MobileShell` header → `MobileAccountMenu` → `deriveAccountStatus` (**reuse, no fork**; read-only subscription, never activates a trial). **Deliberately wraps AROUND `RequirePremium`/`PracticeLimitGate`** so the blocked states (premium upsell, daily-limit) carry the header too — the #416 in-page pattern would have left gate-blocked states headerless, and patching the gates instead would double-chrome the legacy retire routes that share them. BottomNav preserved; bare-fullscreen CT/FM untouched.
- **Confirm-and-report (no change needed):** `/pricing` was already navbar-suppressed (`isPublicLandingRoute`) + owns a `ReturnContextBar`; `/profile` is a pure `<Navigate to="/me">` alias. **Legacy/retire routes verified dead-or-retiring with NO live inbound** (exam-simulation [matches FU-RETIRE-EXAM-SIMULATION-LINKS] · mock-builder/topic-mock/mentor redirects · mock-paper unreachable · weak-area-practice · teacher · legal · admin/*) — none chromed (wasted-work rule), none unexpectedly live. **Pre-flight caught a dispatch-audit error:** WorksheetGenerator did NOT already use MobileShell (the dispatch assumed it did) — always re-verify dispatch audits against current trunk.
- **Gates @ `0e60dae`:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix (bank 8,597) · diff-check all PASS; Codespace linux build + bundle verifier PASS; vitest predicate file **15/15**; full vitest 475 pass / 6 fail in 3 UNTOUCHED files = the standing [FU-VITEST-PREEXISTING-FAILURES] signature.
- **Owner live-verified** on the stable link at 360px: new avatar-dropdown header on HPQ / worksheet generator / topic-hub / practice runner; logout + manage-subscription; BottomNav intact; bodies reflow. **SURFACE_TRACKER: Exam Trends Verified 🟡→✅, HPQ Mobile 🟡→✅ + Verified 🟡→✅.**
- **New follow-ups (non-gating):** **[FU-LEGAL-FOOTER-LINK]** (the /legal/* pages have NO live inbound link — a live footer entry is probably needed pre-launch for compliance) + **[FU-MOBILE-SHELL-PADDING-STACK]** (cosmetic: MobileShell 20px + HPQ/runner page padding stack at 360px; optional page-side slim-down).
- Report: `Desktop/diff/report-mobile-parity-sweep-2026-07-13.md`.

## #419 merged — bank-expansion Batch 11: triangles + coordinate-geometry + metals-and-non-metals (+315, SECOND 3-topics-per-PR) — trunk `69e319d`

**Post-merge trunk: `69e319d` (squash of #419). This docs-only PR (`docs/post-pr-419-bank-batch11`) records the merge. Re-derive the tip after it merges (the usual one-commit lag).**

**Bank-expansion lane — Batch 11, the SECOND 3-topics-per-PR batch. Assembled bank 8,282 → 8,597. 14 DISTINCT topics done across 11 batches; 12 remain (exactly half — 6 Maths + 6 Science = 4 more 3-topic batches).** Isolated worktree per the lane process; resumed from `handoff/BANK_EXPANSION_LANE_STATE.md`. Manifest = `docs/bank-expansion-review-queue.md` (already merged). Review-free; surfaces GATED until trusted-student QA. Never self-merged — owner byte-reviewed CLEAN + merged; CI green.

- **triangles +127** (294→421): extract 18 A/B/C + authored D 44 + PROOF 20 (7 D-weight + 13 C-weight) + case-E 45. Scarce **D 40→91 · E 23→68**.
- **coordinate-geometry +67** (232→299): extract 7 + D 13 + E 47. Thin chapter — **D honest-stop at 28**.
- **metals-and-non-metals +121** (299→420): extract 45 + D 28 + E 48. **D 32→60 · E 10→58**.
- **BOUNDARY PRECEDENTS (owner-verified 2026-27):** (a) the internal ANGLE-BISECTOR THEOREM (BD/DC=AB/AC) is OUT of 2026-27 ("proof of various theorems" trimmed from Triangles) — 2 D items dropped; BUT **PF-015** (corresponding bisectors of SIMILAR triangles proportional, via AA) was KEPT — in-syllabus similarity, NOT the deleted standalone theorem (a precise both-directions call). (b) coordinate-geometry AREA-FROM-COORDINATES stays OUT (guard-banned; ~28 source items dropped). (c) metals Periodic Classification (Ch5) OUT. syllabusGuard was NOT edited.
- Three per-topic skeptics dropped 9 (triangles 3, coord 4, metals 2); tsc caught 8 invalid `format` strings (fixed). Two-direction syllabus clean; all ids manifested.
- **NEXT batch (Batch 12, 3-per-PR, continuous run) = trigonometry + circles + carbon-and-its-compounds** (2 Maths + 1 Science, interleaved). Regenerate the per-topic census from a fresh dump vs the 8,597 bank. Lane state / resume: `handoff/BANK_EXPANSION_LANE_STATE.md`.

## #420 merged — C&I PR-3: the model-solution CACHE (scheme-first grading + Gate-2a quality gate + admin eviction) — code `cc84ae5` — **the Check & Improve surface is COMPLETE**

**Post-merge code trunk: `cc84ae5` (squash of #420; feature `feat/desktop-pr-ci-pr3-solution-cache` @ `7058c8e` off `874f18b`). Re-derive the tip after this docs PR merges (the usual one-commit lag).**

**#420 merged — [FU-CI-SOLUTION-CACHE] CLOSED; C&I now has grading, detection, correction, scorecard, history, mobile parity, PDF upload AND fast cached grading with quality protection. Nothing remains on the C&I arc.** Owner byte-reviewed CLEAN ("textbook-clean" grader diff) + merged; CI quality-gate + lane-overlap + Vercel green. 8 files (+1,380/−228); worktree `LT-worktrees/ci-pr3-solution-cache` (removed post-merge). Reports: `Desktop/diff/report-ci-pr3-{preflight,solution-cache}-2026-07-13.md` + the exact grader patch `grader-diff-ci-pr3-checkSolution-2026-07-13.patch`.

- **Pre-flight caught a spec architecture error (owner ratified the redesign):** the grader has NO discrete "generate model solution" step to wrap — each grade function's ONE Gemini call includes the student answer and outputs the per-student grade (uncacheable by Gate 3). The approved **SCHEME-FIRST** design instead: a keyless SUBJECTIVE question grades against a STUDENT-AGNOSTIC model solution obtained through the EXISTING `step_solutions` Postgres cache — `computeQuestionHash` → read → on miss **generate from the QUESTION TEXT ALONE** → Gate-2a quality check → write-if-pass — injected into the grader's EXISTING marking-scheme slot (single + structured). Same question → ONE shared solution across students; same hash fn ⇒ interoperates with the `/api/step-solution` display cache.
- **The sacred grader diff (`checkSolution.cjs`, +95/−4) = ONLY the hooks**, owner byte-verified: optional `solutionCache` deps entry (injected by `questions.cjs` — the grader gains NO import; absent dep = byte-identical), the two read-before-grade hooks, the scheme block reading the hook variable (2 identifiers), the additive `subject` plumb (client already posts it). Grading rules / normalisation / the PR-348 objective 0/full clamp byte-unchanged. Byte-identical paths: bank-sourced, autoDetect (no trusted marks → no stable hash), objective, no-dep, stub. Cache failure degrades to the empty scheme slot — grading never blocks.
- **Gate 2a (quality gate on write, non-negotiable) at EVERY write path** — display endpoint (model-generated AND prewritten-bank writes), grader hook, admin regenerate: non-empty description+working per step; half-mark units; scored sum == stated total; `totalMarks` match; objective = exactly ONE scored step; subjective 2+ markers ≥2 steps, no zero-mark steps; no U+FFFD/control garble; size bound. FAIL ⇒ served once, NEVER persisted, reason-coded log. **Structurally addresses [FU-MODEL-ANSWER-QUALITY]** (a cached wrong answer would be a systematic lie).
- **Gate 2b (admin eviction):** `POST /api/admin/solution-cache/evict {hash}` (DELETE-by-hash) + `/regenerate` (fresh generation → quality gate → `saveSolutionForce`; FAIL → 422, cache untouched). Identity = **`ADMIN_FIREBASE_UIDS`** Bearer ID-token allowlist (first wiring of it in `lazytopper/server/`; deliberately NOT the weaker X-Admin-Key), **fail-closed** 503/401/403. **DEPLOY: set `ADMIN_FIREBASE_UIDS` on the server env or the endpoints stay safely disabled** → [FU-ADMIN-UIDS-DEPLOY-ENV].
- **Gates 1 + 3 confirmed by construction:** Postgres server-only writes, no client write path; generation prompt is question-only, `existingAnswer/existingExplanation` forced empty on the grader path — no student answer/image/PII can enter the cache (regression-tested).
- **Also landed (owner decisions 3+4):** `CACHE_VERSION` prefix extended to ALL hashes (was objective-only — a bump left stale subjective entries live; one-time cold start accepted) · generation core extracted to module scope with **old-vs-new prompts proven byte-identical across 4 payload variants** · `.env.example` documents the new env.
- **Gates @ `7058c8e`:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix (8 suites, bank 8,282) · diff-check all PASS; Codespace build + bundle verifier PASS + vitest **62/62** (2 new suites incl. dispatch tests (a)–(e) + the 3 pre-existing grader honesty suites). CI green. **Owner live-verify pending:** repeat-question fast grade (cache hit) · garbled solution served-not-persisted · eviction works · 503 without the env.

## #416 merged — C&I PR-2: the FINAL Check & Improve frontend PR (per-Q topic + counted chip + PDF solution + mobile parity + one-header) — code `a1eaebc`

**Post-merge code trunk: `a1eaebc` (squash of #416; feature `feat/desktop-pr-ci2-final-surface` @ `cb09a68` off trunk `9749fc9`, rebased onto `c6fc26c`; merged after #415 bank Batch 10 `ae2b447`). Re-derive the tip after this docs PR merges (the usual one-commit lag).**

**#416 merged — the Check & Improve surface is now COMPLETE desktop+mobile; the ONLY thing left on C&I is the owner-gated Tier-2 solution cache (PR-3/4).** Owner byte-reviewed CLEAN + merged (CI quality-gate + lane-overlap + Vercel green). Built to `AGENT_checkimprove_PR2_final_2026-07-13.md` + the LOCKED C&I spec §3/§5/§6/§10, on top of PR-1 (#395) + #410 mobile-chrome. Two decisions ratified pre-build (**A2** + **D-ii**). 12 product files (+571/−90); worktree `LT-worktrees/ci-pr2`.

- **Item A — per-question topic (route A2, NOT server surgery):** new `resolvePerQuestionGradeTopics()` (`utils/checkImproveDetection.ts`) re-runs the EXISTING `/detect-question` read once per question against the same `topics.ts` vocab; unresolvable → empty (never guessed). **The sacred grader `checkSolution.cjs` (which hosts the detect endpoint) is byte-untouched** — owner rejected the spec's detect-schema surgery as high-scrutiny work not to be smuggled into a frontend PR. Each `WorksheetQuestionGrade` is enriched with additive `topicSlug`/`topicLabel` (client-populated post-grade; the grader never emits them).
- **Item B — counted MIX chip + by-topic lens:** additive-optional `topicCount` on `SessionRecord` (DISPLAY-ONLY — `topicKeys` stays `[]` for a mixed paper, so it NEVER feeds single-topic progress by majority guess, spec §4.1). History chip `Mixed topics` → `N topics`; live + stored (re-open) scorecard populate the Full-Mock `chapterLens` slot via new `deriveCheckImproveTopicLens()` + counted head. Re-open lazily loads the payload (`getSessionPerQuestion`) for the lens on both surfaces.
- **Item C — PDF solution upload:** solution `accept` → `image/*,application/pdf` on BOTH surfaces (mime already file-derived; `/check-solution` reads PDF natively). Text-only storage unchanged (PII/minors).
- **Item D — mobile C&I parity (D-ii, compose shared services — NOT a shared-hook refactor):** `pages/app/CheckImprove` now composes the SAME shared services desktop uses — durable `ensureCheckImproveSessionCode` (**retiring the device-local `nextCiMultiSequence` collision counter** — the exact cross-device bug PR-1 fixed on desktop), `persistCheckImproveSession`, the 5th `ResultsScorecard` variant (live + stored re-open), `CheckImproveHistoryPanel` (+ a "Your checked papers · N" control), and per-Q topics. **No forked grading path.** Dead `pages/mobile/MobileCheckImprovePage.tsx` (#437 stub) DELETED.
- **Item E — mobile one-header on `/exam-trends` + `/practice-hub` ([FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE] CLOSED):** both added to `isMobileSelfChromedRoute`; `ExamTrendsRanked` + `DesktopPracticePage` each wrap a `!isDesktop` `MobileShell` header (the shared avatar-dropdown from #410), retiring the old global brand bar. `App.tsx` limited to the predicate additions; BottomNav preserved; `App.bottomNav.test.tsx` updated.
- **Additive-boundary discipline (owner-verified):** the `DesktopCheckImprovePage.tsx` diff is 35 lines of ADDITIVE wiring only (one import + one commented per-Q-topic try-block with the "detect miss never blocks the grade" fallback + the item-C accept attr) — NOT the D-i orchestration relocation (that risk stayed rejected). **Forbidden files byte-IDENTICAL:** `checkSolution.cjs`, `worksheetGradeService`, `DesktopShell`, `firestore.rules`, `src/data/**`, `progressStore`.
- **Straggler sweep (item E) — REPORTED, not fixed (scoped to the 2 BottomNav tabs per dispatch):** 11 mobile routes still render the OLD global brand bar → logged as **[FU-MOBILE-OLD-HEADER-STRAGGLERS]** for the pre-launch cleanup pass: `/practice/worksheets`, `/practice/:g/:s`, `/topic-hub*`, `/highly-probable*`, `/exam-simulation`, `/weak-area-practice`, `/mock-paper/:slug`, `/teacher`, `/onboarding`, `/legal/:slug`, `/admin/*`.
- **Gates @ `cb09a68`:** tsc · mojibake · scope:guard product · root matrix **181/181** · lazytopper ops matrix (bank **7,842** / 0 dup / 0 orphan / 26 of 26) · diff-check all PASS; CI quality-gate + lane-overlap + Vercel green. build+vitest = Codespace/CI-gated (win32 can't).
- **Closes [FU-CI-PERQUESTION-TOPIC] + [FU-MOBILE-CI-PARITY] + [FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE].** REMAINING on C&I = only the owner-gated **[FU-CI-SOLUTION-CACHE]** (PR-3/4). Reports: `Desktop/diff/report-ci-pr2-final-surface-{plan,build}-2026-07-13.md`.
## #411 + #415 merged — bank-expansion Batch 9 (polynomials +62) + Batch 10 (pair-of-linear-equations / arithmetic-progression / acids-bases-and-salts +440, FIRST 3-topics-per-PR) — trunk `ae2b447`

**Post-merge code trunk: `ae2b447` (squash of #415), on top of #411 `9749fc9` (Batch 9 polynomials) / #412 `1228c95` (PR-B-v2) / #414 docs.** This docs-only PR (`docs/post-pr-411-415-bank-batches`) records both bank merges. Re-derive the tip after this docs PR merges (the usual one-commit lag).

**Bank-expansion lane — 2 more merges, 4 more topics. Assembled bank 7,780 → 7,842 → 8,282. 11 DISTINCT topics done, 15 remain (8 Maths + 7 Science).**
- **#411 (`9749fc9`) — Batch 9, polynomials +62** (190 → 252). FIRST topic to ABSORB the sum/product-of-roots (zeros↔coefficients of QUADRATIC polynomials) items as **Class-10 2026-27 CORE** — exactly what Batch 8 correctly filed OUT of quadratic-equations, confirming the Batch-8 "Class-11" label was wrong. extract-max A/B/C **+13** (saturated chapter → honest-stop) + authored scarce **D 12→34** + **E 10→37**, BOTH honest-stop (a low-weight, narrow chapter). Scope held to QUADRATIC zeros-coefficient ONLY — cubic zeros↔coefficient relations, the higher-degree division algorithm, and complex zeros all EXCLUDED (Class-11/12 adjacency). Owner byte-review CLEAN.
- **#415 (`ae2b447`) — Batch 10, +440, the FIRST 3-topics-per-PR batch** (owner SPEED directive: from now bundle 3 topics on ONE branch / ONE `canonicalQuestionBank.ts` wire / ONE PR; per-topic discipline UNCHANGED — own source table, own syllabusGuard boundary, own skeptic, ≥75-distinct-or-honest-stop):
  - **pair-of-linear-equations +163** (223→386): extract 42 A/B/C + D 39 + E 52 + a **reducible-to-linear follow-on pack** (+30: 8 A/B/C · 9 D · 13 E). Final PLE scarce **D 29→77 · E 16→81**.
  - **arithmetic-progression +114** (235→349): extract 20 A/B/C + **D 20→72** + **E 28→70**. AP ONLY (no GP — geometric progression is Class-11).
  - **acids-bases-and-salts +163** (302→465): extract 67 A/B/C + **D 27→63** + **E 12→72**. Qualitative Class-10 only.
  - **BOUNDARY CORRECTION (owner):** "equations reducible to a pair of linear equations" (the 1/x=p, 1/y=q substitution family) is IN the official CBSE 2026-27 syllabus and board-important; the main sweep WRONGLY excluded it (shipped 0). Added on the same branch as `pairOfLinearEquations.expand.reducible.ts`. A backwards proposal to add reducible-to-linear to `syllabusGuard.ts` was **WITHDRAWN — syllabusGuard UNTOUCHED**; the Cross-Multiplication Method stays OUT (correct). Mirrors the Batch-8 sum/product-of-roots lesson: never reject real in-syllabus content; flag guard changes, never auto-commit.
  - Skeptics dropped 16 twins in the main batch (PLE 5, AP 11) + 3 in reducible; fixed a chem MCQ collision (ABS EX-A-015) + 1 reducible coeff-clone (C-003). Owner byte-review CLEAN; two-direction syllabus clean.
- **Gates:** all green + CI quality-gate PASS. Scope = the canonical wiring + packs + manifest (`docs/bank-expansion-review-queue.md`, both PRs already manifested); no forbidden files. Never self-merged — owner byte-reviewed CLEAN + merged. Review-free; surfaces GATED until trusted-student QA.
- **NEW FUs:** [FU-AP-BANKED-GP-ITEM] (a pre-existing banked AP case item uses an 80%-rebound ball-bounce = geometric, out-of-syllabus — later cleanup lane) + [FU-ABS-WASP-STING-ALKALINE] (a few ABS items use the textbook "wasp sting is alkaline" claim — exam-conventional, owner-awareness only). [FU-SYLLABUS-GUARD-PLE-REDUCIBLE] marked WITHDRAWN/REJECTED (reducible-to-linear is IN — not a guard entry).
- **Lane state / resume:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **NEXT batch (3-per-PR, continuous run) = triangles + coordinate-geometry + one Science (metals-and-non-metals OR carbon-and-its-compounds).** Regenerate the per-topic census from a fresh dump (bank is now 8,282).

## #412 merged — PR-B-v2: the progress ENGINE made real (unified stream + canonical keys + activity-median + topic sparkline) — code `1228c95`, OWNER LIVE-VERIFIED ✅

**Post-merge: #412 squashed as `1228c95` (feature `feat/desktop-pr-b-v2-progress-engine` @ `cf22791` off trunk `6886157`); merged in parallel with #410 (`f662fbe`) and #411 (`9749fc9`, bank Batch 9 polynomials) — genuinely disjoint, no conflicts. Origin tip at this docs PR: `9749fc9`.**

**#412 merged — the FOUR verified engine root causes under arc PR-4's UI are FIXED, and the owner LIVE-VERIFIED the result on the stable link → the Me/Progress Verified cell flips ✅ (SURFACE_TRACKER). LAUNCH-DOMINO #3 (the progress arc showing REAL data across all four surfaces) is CLOSED.** Live-verify evidence: Polynomials Topic Hub shows the real trajectory card (33.9%→46.9%) + the running-accuracy sparkline + the honest short-term label ("this is your short-term trend over the last day, not a 4-month claim"); Trigonometry honestly shows nothing-yet (never a fake line); the arc empty-state reads as honest short-term movement. 5 files (+858/−157), read-side only.

- **[FU-PROG-TOPIC-KEY-MISMATCH] CLOSED (Finding B).** Every topic compare/group in `progressStore` resolves BOTH sides through `resolveCanonicalSlug` (the P0 authority, memoized). Pre-flight sharpened the spec: the read side (`normalizeTopicKey` → `resolveCanonicalTopicKey`, aliasMap vocabulary) could NEVER match the write side on 5 of 26 topics (arithmetic-progression · heredity↔`heredity-and-evolution` · how-do-organisms-reproduce↔`reproduction` · light-r-a-r↔merged-key · pair-of-linear-equations↔`…-in-two-variables`); the other 21 (incl. real-numbers) failed via Finding C, not B. Legacy label-keyed attempts (pre-#363) re-bucket too. Registry-driven regression test over every topics.ts slug under BOTH vocabularies.
- **[FU-PROG-DATA-COMPLETENESS] CLOSED (Finding A — CORRECTED in pre-flight).** All four surfaces DO fan `recordAttempt`; the REAL gaps were: CT/FM fan only SUBJECTIVE results (objective Section-A marks never became attempts) + history predating the #403 attempts subcollection exists only in records. Subject/topic rungs now read the **unified graded stream** — cloud attempts ∪ sessionRecords perQuestion payload marks, deduped DETERMINISTICALLY by the synthetic `ws:/ct:/fm:{worksheetId}:q{n}` ids; C&I records skipped by construction (its attempts cover it → the dual write can never double-count). Also heals pre-#403 worksheet/CT/FM history read-side.
- **[FU-PROG-WINDOW-MODEL] CLOSED (Finding C, owner-ratified Option B).** Every trend (sync + async + mistake-type rung) splits at the **median of the student's actual activity**, not the calendar midpoint → a wider window never shows less than a narrower one. New `spanDays`/`activitySpanDays` + shared `isShortSpan` power the honest short-term label: additive amber note on the Me arc (`ProgressWindowArc` — additive-only per owner condition, byte-reviewed) + the Topic Hub card. MIN_HALF_SAMPLE=3 kept (≥6 measurable points per trend; honest-or-silent absolute).
- **Finding D shipped.** `TopicProgressTrend` re-pointed at the new cross-device `getTopicTrendFromCloud` (the old sync read was device-local — an invariant violation) + the running-accuracy SVG micro-trend: one bar per recent graded answer (REAL scores, fires from 2 points, cap 12, never a fitted line; SVG attributes, not inline styles).
- **API (additive):** `ProgressTrend`/`RungTrend` +`spanDays`; `WindowedProgress` +`activitySpanDays`; new `isShortSpan(window, spanDays)` + `getTopicTrendFromCloud(topicKey, window?, uid?, nowMs?) => Promise<TopicCloudTrend>` (`{window, trend, points[{ts,pct}]}`). Sync exports keep signatures (quick-glance fast-paths; the async cloud reads are the source of truth — owner decision 3, incl. the no-competing-numbers caveat, documented in-code).
- **Owner decisions honored:** arc label = ADDITIVE only · pre-#403 QP/HPQ blob recovery DEFERRED as **[FU-PROG-PRE403-QP-BACKFILL]** · sync fast-paths stay device-local.
- **Gates:** tsc (both configs) · mojibake · scope:guard product · root matrix **181/181** · lazytopper ops matrix (bank 7,780 · 0 dup · 0 orphan · 26/26) · diff-check all PASS; **Codespace linux: vitest 44/44 (18 new: spec §4 A–E + canonical-vocabulary + cloud topic read) + production build + verifier PASS**; CI quality-gate + lane-overlap + Vercel PASS. Never self-merged — owner byte-reviewed + live-verified + merged.
- **NEW FU (owner, presentation-only, LATER PR — NOT a defect):** **[FU-PROGRESS-PRESENTATION-REDESIGN]** — fold the per-topic trajectory into the topic HERO card (not a separate card) + a more graphical Me/Progress with a SUBJECT TOGGLE + TOPIC DROPDOWN (progressive disclosure). The engine did its job; this is placement/graphics.
- Reports: `Desktop/diff/report-prb-v2-progress-engine-preflight-2026-07-13.md` (owner-approved pre-flight, 3 decisions) + `report-prb-v2-progress-engine-build-2026-07-13.md` (build + live-verify checklist).

## #410 merged — mobile chrome: app-wide account avatar-dropdown parity + one-header treatment — trunk `f662fbe`

**Post-merge code trunk: `f662fbe` (squash of #410; feature `feat/mobile-avatar-dropdown-parity` @ `6ec1ac4` off trunk tip `6886157`).** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#410 merged — the mobile header now carries the SAME account menu as the desktop shell, added once in the shared `MobileShell` so every mobile page that uses it inherits it, and the old global mobile brand bar no longer double-stacks on the affected routes.** Owner byte-reviewed + live-verified clean → merged. 4 files (+337/−11): 1 new (`utils/accountStatus.ts`), 3 edited (`components/mobile/MobileShell.tsx`, `App.tsx`, `App.bottomNav.test.tsx`).

- **App-wide avatar-dropdown:** new `MobileAccountMenu` in `MobileShell.tsx` mirrors the desktop dropdown — same `useAuth`+`useSubscription` (**READ-ONLY, no trial activation**), same identity/status derivation, same `/pricing?source=account-menu&returnTo=…` manage-subscription URL, same logout path, same click-/tap-outside-to-close, mobile `--mob-*` theme. Composes right of any page `rightSlot` (zero consumers pass one); renders nothing signed-out.
- **Reuse = Option A:** new pure `deriveAccountStatus` (`utils/accountStatus.ts`) = single source of truth for the status chip; **`DesktopShell.tsx` BYTE-UNCHANGED** (locked sacred file, not scoped) — migrating desktop onto the helper is [FU-DESKTOP-ACCOUNT-MENU-SHARE]. Not a fork (same hooks/URLs/logout; only the display derivation shared now).
- **Status = fold-into-dropdown, expired kept actionable:** status box inside the dropdown; trial-EXPIRED also surfaces a header "Choose plan" chip → pricing (as discoverable as desktop's pill).
- **One-header treatment:** `isMobileSelfChromedRoute` += `/check-improve`, `/intent`, `/practice/worksheets/ready` (arc-PR-4's `/me` pattern) → the old global mobile brand bar stops stacking above the MobileShell header. `App.tsx` limited to that predicate + doc comment; BottomNav untouched.
- **Scope-reality correction (owner-confirmed):** only 4 MobileShell surfaces are actually routed on trunk; the "12+ pages" was stale. Double-bar affected exactly the 3 routes above (`/me` already handled). Fix is app-wide by construction.
- **COVERAGE GAP from owner live-verify (NOT a #410 defect):** `/exam-trends` + `/practice` still show the OLD global brand bar (not in `isMobileSelfChromedRoute`, don't use MobileShell) → **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]**, folded into C&I PR-2 as item E (reuse `accountStatus.ts`, no fork; + sweep for other straggler mobile routes).
- **Gates @ `6ec1ac4`:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix (topickey runtime 7780/0-dup/0-orphan) · diff-check all PASS; CI quality-gate SUCCESS + lane-overlap SUCCESS; build+vitest Codespaces/CI-gated.
- **NEW FUs:** **[FU-DESKTOP-ACCOUNT-MENU-SHARE]** + **[FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]** + **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]** (folded into C&I PR-2).
- Reports: `Desktop/diff/report-mobile-avatar-plan-2026-07-13.md` + `report-mobile-avatar-build-2026-07-13.md`.

## #408 merged — arc PR-4: Me/Progress consumes the memory layer (mobile rebuild + full desktop arc + Topic Hub trend) — code trunk `25c3cd7`

**Post-merge code trunk: `25c3cd7` (squash of #408), on top of #405 `1b7c7aa` / #407 docs.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#408 merged — arc PR-4, the Me/Progress CONSUMPTION layer over PR-B's engine.** Owner byte-reviewed CLEAN + merged. **CONSUMPTION-ONLY:** progressStore / progressBankIndex / sessionRecords / grader / firestore.rules / src/data all **BYTE-UNTOUCHED**. 8 files (+988/−40): 3 new (`pages/mobile/MobileMePage.tsx`, `components/progress/TopicProgressTrend.tsx`, `ProgressWindowArc.stateKind.test.ts`), 5 edited.

- **§A MOBILE Me/Progress (the priority) — the legacy streak/XP/gamification hero is RETIRED.** New `pages/mobile/MobileMePage.tsx` replaces `pages/app/Me` (un-routed for PR-G; it was imported ONLY in App.tsx). Same vision as desktop, mobile-laid-out: the cross-device before→now arc (the shared `ProgressWindowArc`) + honest stat cards (`loadInsights`/`getMistakeLogs`, honest-or-silent) + "Where you lose marks" mistake mix + **Careless mark-loss (`summarizeCareless`) — CARRIED FORWARD from the legacy Me, not silently dropped** + recommended-next / Check&Improve CTAs. Class-driven CSS (§7), 360px.
- **HEADER PARITY — the old thin global brand bar (LT · LazyTopper · Search · avatar) is retired on mobile `/me`.** It was the global `.navbar` (App.tsx) stacking ABOVE MobileShell's header (a real double-bar). Suppressed by adding `/me` to `isMobileSelfChromedRoute` (the SAME mechanism `/browse` uses). **The mobile BottomNav is PRESERVED** (mobile's only equivalent to the desktop sidebar).
- **DROPPED (explicit, owner-approved):** streak + XP (gamification, the retired hero); the Free/Trial/Premium badge (account chrome, and `useSubscription` **client-activates a trial** — a "no fake trial" doctrine liability — so the dependency is deliberately not reintroduced). Profile identity (name/Class 10/board) carried forward.
- **MISTAKE INTEL on mobile (explicit decision):** the desktop navy-sidebar MI card is NOT ported to the mobile body (doctrine: MI is navy-sidebar chrome ONLY). Its content is the Me body's own mistake-mix + careless sections — exactly where the desktop MI card's "See where →" links. Explicit, not a silent omission.
- **§B DESKTOP arc completed + window empty-state fixed.** `ProgressWindowArc` now renders EVERY rung honest-or-silent: subject (big arcs) + section/topic/concept (compact rows, capped with an honest overflow note) + **mistake-type composition** (neutral framing — never a fabricated good/bad score). Window empty-state now distinguishes **"lopsided"** (in-window practice, one-sided split — the [FU-PROGRESS-WINDOW-SPLIT-UX] stopgap) from **"no data"**, via the pure exported `progressArcStateKind(data)` reading `activity.practiceAttempts`. ONE responsive component reused on BOTH surfaces.
- **§C TOPIC HUB per-topic before→now — WIRED.** New `TopicProgressTrend` consumes `getTopicProgress()`, slotted into `ConceptSpine` under the topic card (honest-or-silent, responsive). NOT MI.
- **App.tsx scope (owner-limited):** EXACTLY two touches — the `MobileMe` import repoint + the `/me` `isMobileSelfChromedRoute` entry.
- **Gates:** tsc · mojibake · scope:guard product · root matrix **181/181** · lazytopper ops matrix (bank **7,780**, 0 dup/0 orphan/26-of-26) · diff-check all PASS; CI quality-gate PASS + lane-overlap PASS (disjoint) + Vercel. Branch rebased onto trunk `4fdb289` (origin advanced via #405/#407 mid-build — fully disjoint, all gates re-verified green). Never self-merged — owner byte-reviewed CLEAN + merged.
- **⚠️ ENGINE-BLOCKED — 3 PR-B (engine) bugs, NOT arc-PR-4 defects (the consumption layer is CORRECT).** Owner live-verify found the arc renders EMPTY because the data layer beneath it is incomplete: **[FU-PROG-TOPIC-KEY-MISMATCH]** (`getTopicProgress` matches two DIFFERENT canonicalizers → zero rows on every topic → `TopicProgressTrend` correctly renders null everywhere), **[FU-PROG-DATA-COMPLETENESS]** (the trend reads the practiceInsights attempts stream ONLY, not sessionRecords → CT/FT/C&I invisible → the arc is blind to 3 of 4 surfaces), **[FU-PROG-WINDOW-MODEL]** (calendar-midpoint split makes a wider window show LESS than a narrower one; the arc empty-state is a good stopgap, the model fix is activity-median split). All three → a **PR-B-v2 follow-up** (recorded in OPEN_QUESTIONS). Do NOT mistake them for arc-PR-4 regressions.
- Reports: `Desktop/diff/report-arc4-me-progress-plan-2026-07-13.md` (pre-flight/plan, owner-approved with 3 decisions) + `report-arc4-me-progress-build-2026-07-13.md` (build).

## #405 merged — bank-expansion Batch 8 (quadratic-equations +110) — trunk `1b7c7aa`

**Post-merge code trunk: `1b7c7aa` (squash of #405), on top of #403 `894ef6a` (PR-B) / #404 docs.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**Bank-expansion lane — 8 topic-batches shipped, 7 DISTINCT topics done. Assembled bank 7,670 → 7,780.**
- **#405 (`1b7c7aa`) — Batch 8, quadratic-equations +110** (224 → 334): the FIRST Maths topic since real-numbers (pipeline balance). Extract-max A/B/C **+19** (9 A · 3 B · 7 C; the whole NCERT Exemplar ch4 was already banked → 0 from it). Authored scarce **D 29→76 (+47)** REACHED ≥75 across ~13 application families + case-based **E 22→66 (+44)** HONEST-STOP across ~18 scenario families (the Class-10 quadratic case space is combinatorially finite — padding would force twins).
- **3 independent adversarial skeptics re-solved every quadratic:** extract 1 distinctness drop (A-006 clone of banked QE2-050); D 2 correctness fixes (D-028 broken numbers "5 more pens"→"6 more pens"→x²+6x−720; D-011 rejected-root display −12/11→−6/11) + trimmed 2 of 3 identical reciprocal-schema items + added 2 distinct non-reciprocal items to hold ≥75; E 44/44 clean. **The consolidation CROSS-PACK gate caught 3 extracted-C vs authored-D twins → 3 authored D dropped** (real extracted content preferred). Standing lesson: run a combined cross-pack gate over ALL packs before wiring.
- **Owner byte-review CLEAN after two corrections:** (a) the ~22 Vieta sum/product-of-roots items were correctly kept OUT of the quadratic-equations chapter, BUT the "Class-11" label was FACTUALLY WRONG — per official CBSE 2026-27, "Relationship between zeros and coefficients of quadratic polynomials" (sum/product of roots) is **Class-10 2026-27 CORE under POLYNOMIALS**; those items are IN-SYLLABUS and must be EXTRACTED in the upcoming POLYNOMIALS batch (which MUST include sum/product-of-roots as core). (b) A suspected complex/imaginary-roots leak was a FALSE POSITIVE — an exhaustive 110-item scan found only a file-header doctrine comment; zero actual leaks, no √-of-negative anywhere → #405 shipped as-is.
- **STANDING PROCESS-FIX (owner):** anchor EVERY syllabus-boundary call to the OFFICIAL CBSE 2026-27 syllabus (cbseacademic.nic.in) AND the repo `scripts/src/syllabusGuard.ts` (read/run live per chapter) — NEVER memory or a prior year (2025-26). The 2027 board cohort is governed by 2026-27 ONLY; if syllabusGuard lacks a boundary entry, PROPOSE it for owner confirmation before acting. (Also settled: Class-10 2026-27 Quadratics is REAL ROOTS ONLY — D<0 ⇒ "no real roots", never complex/imaginary; magnetic-effects is RETAINED, not deleted.)
- **Gates:** all green + CI quality-gate PASS. Scope = the canonical wiring + packs + manifest; no forbidden files. Never self-merged — owner byte-reviewed CLEAN + merged. **Manifest:** `docs/bank-expansion-review-queue.md` (all ids). Review-free; surfaces GATED until trusted-student QA.
- **Lane state / resume:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **19 topics remain (11 Maths + 8 Science). NEXT = polynomials** (Maths — and it MUST include the ~22 sum/product-of-roots items as CORE 2026-27 content, absorbing what was filed out of quadratics). Regenerate the per-topic census from a fresh dump (bank is now 7,780). Lane is at a CLEAN BOUNDARY — safe for a fresh Fable window to resume.

## #403 merged — PR-B: cross-device multi-rung progress memory layer (launch-blocker) — trunk `894ef6a`

**Post-merge code trunk: `894ef6a` (squash of #403), on top of #402 `85b292f` (bank Batch 7) / #404 docs.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#403 merged — the progress-memory ENGINE is LIVE + the desktop Me arc reads it cross-device. Launch-domino #3 done → Me/Progress (arc PR-4) + Home nudge (PR-5) unblocked.** Owner byte-reviewed + merged; the mistake-rate fully-graded fix and the cross-device reads verified clean. 8 files, +1236/−3. Built to the owner-approved pre-flight (`report-prb-progress-memory-preflight-2026-07-13.md`); verify-before-build found it was **~85–90% already built** (progressStore skeleton + durable streams existed) → the job was wire-up + widen rungs + cross-device + consolidate, NOT from-scratch.

- **The API arc PR-4 / scorecards consume:** `getWindowedProgress(uid, window, scope?, nowMs?) => Promise<WindowedProgress>` (async, cross-device). `WindowedProgress = { window, subjects[], topics[], concepts[], sections[], mistakeTypes[], activity, mistakeLog }`; `RungTrend = { key, label, before, now, delta, sampleBefore, sampleNow }`. Existing sync exports (`getSubjectProgress`/`getTopicProgress`/`getSurfaceHistory`…) unchanged → `SurfaceHistory` + `WorksheetGenerator` compile as-is.
- **Reads the DURABLE streams honoring uid** (the `void uid` device-local seam became a real cloud read): `getAttemptsFromCloud` + `getSessionRecordsFromCloud` + new additive read-only `getAllSessionPerQuestionFromCloud` + `getMistakeLogs`. Splits the window at its midpoint → honest-or-silent before→now PER RUNG (`MIN_HALF_SAMPLE=3`, thin → omitted, never a fabricated curve).
- **Source-of-truth per rung (verified against write paths):** subject/topic marks = practiceInsights **attempts ONLY** (every graded surface already records each question as an attempt; unioning sessionRecords totals would DOUBLE-COUNT — my pre-flight said "fold in", verify-before-build corrected it). concept/section = **bank-matched only** (new pure `progressBankIndex.ts` id→{subtopic,section,topicKey}; QP/HPQ attempts carry real bank ids, worksheet/CT/FM carry SYNTHETIC ids so resolve via `record.questionIds` + perQuestion payload; C&I `questionIds:[]` + chapter-echo silent; topic-scoped reads never leak another topic). mistake-type = **COMPOSITION SHARE over FULLY-GRADED records only** (idempotent `fourType`); an adversarial multi-lens review caught the earlier per-question RATE fabricating a trend from pending/partial records (submit-time `fourType {0,0,0,0}` + full-paper denominator) → switched to share, regression test added; mistakeLog is deduped enrichment only.
- **No rollup** (query-raw); **`firestore.rules` byte-untouched** (window pref → existing `dashboardPrefs.progressWindow`, already permitted; a rollup would nest under an owner-only recursive parent per the fullMockPapers precedent). **sessionRecords WRITE shape byte-unchanged** (only the additive read helper). Minimal additive Me surface `ProgressWindowArc.tsx` (class-driven §7; honest early state) — full Me/Progress redesign stays **arc PR-4**.
- **Gates:** tsc app+tests · mojibake · scope:guard product · lazytopper ops matrix (Guard B pass, bank 7,670/0-dup/0-orphan) · root matrix 181/181 · diff-check · **CI quality-gate PASS incl. linux `vite build`** · lane-overlap PASS (disjoint) · Vercel. **vitest is linux-pinned — win32 can't run it; needs a Codespaces run** ([FU-VITEST-PREEXISTING-FAILURES] class; CI runs matrices not vitest). Forbidden files untouched (App.tsx, DesktopShell, firestore.rules, src/data, grader).
- **Owner live-verify surfaced 4 CONSUMPTION-surface findings (none PR-B bugs — engine correct):** **[FU-PROGRESS-WINDOW-SPLIT-UX]** (wider window can go silent while a narrower shows a trend — honest-but-confusing empty state), **[FU-TOPICHUB-PROGRESS-ARC]** (`getTopicProgress` built but no Topic Hub consumer), **[FU-MOBILE-ME-PROGRESS-PARITY]** (arc rendered only in DesktopMePage ≥1024px → INVISIBLE to mobile-only students; the legacy `pages/app/Me` still renders below 1024px — mobile non-negotiable), **[FU-MOBILE-CI-PARITY]** (mobile C&I not at desktop parity). Findings 1–3 = the **arc PR-4 requirement set**. Reports: `report-prb-progress-memory-preflight-2026-07-13.md` + `report-prb-progress-memory-build-2026-07-13.md`.

## #402 merged — bank-expansion Batch 7 (chemical-reactions-and-equations +136) — trunk `85b292f`

**Post-merge code trunk: `85b292f` (squash of #402), on top of the #399 docs / #397 `6db7f1d` (CT balanced-mix) lineage.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**Bank-expansion lane — 7 topic-batches shipped, 6 DISTINCT topics done. Assembled bank 7,534 → 7,670.**
- **#402 (`85b292f`) — Batch 7, chemical-reactions-and-equations +136** (319 → 455): a LARGE, clean reservoir — the counterpoint to the narrow saturated chapters. Extract-max 36 A/B/C (A29·B3·C4; exhaustive per-source sweep; ~15 Class-11/12 Level-III items — oxidation-number/ion-electron balancing, disproportionation, oxidation-state calc — rejected wholesale; 1 figure-dependent MCQ dropped + 1 corrupted-key item dropped, neither shipped answer-less or silently re-keyed). Authored scarce **D 39→75 (+36)** (12 construction families) + **case-based E 11→75 (+64)** (9 scenario families) — the **FIRST topic where BOTH scarce bands REACHED the ≥75 distinct floor with NO honest-stop**.
- **3 independent adversarial skeptics:** extract 36/36 clean; D 35/36 → 6 fixes (a Class-11 electron-transfer redox item reframed to Class-10 O/H basis; a reaction-type relabel; 3 template/subset overlaps differentiated; a rust-formula consistency fix); E 61/64 → 3 fixes (limescale re-scoped from wrong double-displacement to thermal decomposition of Ca(HCO3)2; malachite label dropped to match the CuCO3 equation; Fe+CuSO4 colour corrected to pale-green); 1 ambiguous MCQ distractor swapped.
- **Two-direction syllabus CLEAN** (no deleted-chapter drift; no Class-11/12 leak). **Every MCQ/AR key resolves to exactly one option — NO [FU-BANK-UNRESOLVABLE-MCQ-KEYS] regression** (the tightened exact-option-text authoring rule held on its first batch since the FU surfaced). Zero figure-pending — all 136 text-answerable.
- **Gates:** all green + CI quality-gate PASS; ops matrix runtime proof **7,670 / 0 dup / 0 orphan / 26 topics**. Scope = the canonical wiring + packs + manifest; no forbidden files. Never self-merged — owner byte-reviewed CLEAN + merged. **Manifest:** `docs/bank-expansion-review-queue.md` (all ids). Review-free; surfaces GATED until trusted-student QA.
- **Lane state / resume:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **~20 topics remain (12 Maths + 8 Science — the 8th Science is control-and-coordination, a not-yet-done Class-10 biology chapter). NEXT = quadratic-equations** (Maths — pipeline balance, only real-numbers has been a Maths batch so far; rich scarce D/E word-problem + discriminant reservoir; once it merges, 19 remain). Regenerate the per-topic census from a fresh dump (bank is now 7,670). Lane is at a CLEAN BOUNDARY — safe for a fresh Fable window to resume.

## #397 merged — CT balanced PYQ+fresh mix [FU-CT-BALANCED-MIX] — trunk `6db7f1d`

**Post-merge code trunk: `6db7f1d` (squash of #397; feature `feat/desktop-pr-ct-balanced-mix` @ `adf79fe` off `f4d1b37`, update-branch a no-op — the 2 CT files are disjoint from #395/#396).** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#397 merged — the Chapter Test now sources a deliberate PYQ + fresh mix, exactly like the Full Test.** Owner byte-reviewed CLEAN → merged. Resolves **[FU-CT-BALANCED-MIX]**. SOURCING-ONLY: 2 files, the CT blueprint + its new test.

- **The change (one logic file):** each CT section (A–D) now draws through the SHARED `drawBalancedSet` (`utils/balancedMockDraw.ts` — imported and reused VERBATIM, byte-unchanged, never forked), mirroring the Full Test's pass-1 per-cell pattern (`fullMockBlueprint.ts:317`): the section's candidate pool (A = keyed MCQs; B/C/D = exact numeric `q.marks` bands) is filtered by the RETAINED used-set dedupe, then `drawBalancedSet({ pool, count: targetCount, seed: seed ^ hashCell("CT:"+section) })`. A CT paper now mixes real past-year questions (authenticity) with fresh authored/extracted ones (rotation), aiming ~50% PYQ where the pool allows.
- **Seed minted IN-BLUEPRINT (owner-approved judgment call):** an optional `seed?: number` arg is the unit-test seam; when absent, one is minted with the Full Test's exact recipe `(Math.random()*0xffffffff)>>>0` INSIDE `drawChapterTest`, so `ChapterTestPage.tsx` stays BYTE-UNCHANGED and the diff is one logic file (touching the page for literal FT parity would have been cosmetic and broken the one-logic-file bar). A local 5-line djb2 `hashCell` mirrors FT's module-private one (not imported — the FT blueprint stays byte-untouched). The page's existing `useMemo` keeps the paper stable per test; `drawNonce` re-take mints a fresh seed — reproducible per test, varied across tests.
- **Byte-identical in behavior (confirmed):** section specs/targets/marks bands · the MCQ answer-key filter · A→D ordering + sequential numbering · blueprint rows · the `MIN_TEST_QUESTIONS` honest gate (test-proven: a below-minimum topic still gates `enoughQuestions:false`, the helper never pads) · the in-memory `PersistedWorksheet` shape. Two-phase grading, scorecard, sessionRecords, the concept/section lens — all untouched. NEVER pyqOnly; no question class hidden (the helper's honest fallback covers thin/zero-PYQ topics — an all-fresh CT paper is valid).
- **Gates:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix (runtime proof **7,534 / 0 dup / 0 orphan / 26 topics**) · diff-check clean; Codespace linux vitest **22/22** (new CT suite + `balancedMockDraw` + FT suites all green) + production build + `verify-production-build` PASS; CI quality-gate + lane-overlap green (no collision with the C&I #395 lane). Scope = exactly 2 files; no forbidden files (`balancedMockDraw.ts`/`fullMockBlueprint.ts`/`ChapterTestPage.tsx` byte-untouched). Never self-merged.
- **New vitest (`chapterTestBlueprint.test.ts`):** same seed → identical paper / different seed → different paper (proves the seeded wire — impossible on the old `Math.random` path); board-paper shape (A→D order, no cross-section dups, exact mark bands, counts ≤ target, Section A options + non-empty key); below-minimum topic → honest gate; and the exported `drawCTSection` on synthetic pools proves the zero-PYQ (full section, `pyqDrawn:0`) + thin-PYQ (1+9, count 6, never padded) + balanced (3/3) + nothing-hidden (whole-pool ask) cases.
- **A pre-existing bank defect surfaced (NOT this PR) — [FU-BANK-UNRESOLVABLE-MCQ-KEYS]:** the test's first draft asserted every drawn Section-A key STRING-resolves to an option under the grader's exact `norm` contract; it failed, and a full-bank scan found **34 MCQs bank-wide whose `answer` resolves to NO option** (PYQ-extraction artifacts: trailing marks digits, spacing, AR letter-codes, marking-scheme boilerplate; 6 are Batch-5 REP2-*). Any drawn into CT/FT Section A can never be scored correct. Logged for the bank lane (before-launch scoring-correctness fix); full 34-id list in the report. The committed test asserts the blueprint's true SOURCING contract (options + key present) so this unrelated bank defect can't redden the sourcing suite. Also surfaced: **[FU-FM-BLUEPRINT-TEST-SEED-LUCK]** — `fullMockBlueprint.test.ts` still carries the strict key-resolves assertion and passes only because seed 11's draw happens to miss the bad keys (a latent CI landmine any bank batch can trip; relax it to the real options+key-present contract).
- **Owner live-verify pending** (sourcing is a live path): a CT paper visibly mixes real PYQs with fresh questions; a thin/zero-PYQ topic still yields a full valid paper (no empty-state regression); re-take draws a different paper, stable across re-renders. Report: `Desktop/diff/report-ct-balanced-mix-2026-07-13.md`.

## #396 merged — bank-expansion Batch 6 (heredity +44) — trunk `ae5e671`

**Post-merge code trunk: `ae5e671` (squash of #396), on top of #395 `e33b9d3` (C&I SessionSurface) / #394 `f4d1b37` (Batch-5 docs).** Re-derive the tip after this docs PR merges.

**Bank-expansion lane — 6 topic-batches shipped. Assembled bank 7,490 → 7,534.**
- **#396 (`ae5e671`) — Batch 6, heredity +44** (219 → 263): a NARROW, already-saturated chapter (219 banked) — modest yield by design. Extract-max 21 A/B/C (A15·B4·C2); every local source is the pre-2026 "Heredity AND Evolution" chapter, so ~75+ board-deleted **evolution** items (Darwin/Lamarck/natural selection, speciation + isolation, homologous/analogous/vestigial organs, fossils, human evolution) + Class-12 depth (ABO codominance, Rh, linkage) were rejected at extraction (the pre-existing bank evolution leak was NOT used as license). Authored scarce **D×11** (21→**32**, honest-stop — 11 distinct genetic principles) + **case-based ×12** (E1 Mendelian ×7 + E2 human-genetics ×5; 10→**22**, honest-stop). Both scarce bands honest-stop far below 75 because Punnett crosses & pedigrees are structurally repetitive (distinct *principles* are finite).
- **Skeptic caught a subtle syllabus mislabel:** a roan-cattle item describing CODOMINANCE (red+white mosaic) labelled "incomplete dominance" (blended pink) — codominance is Class-12 → dropped; + 2 quality drops (a "why 1:2:1" near-twin, an acquired-traits Lamarckian-adjacent item). 47 produced → 44 kept. 3 skeptics re-solved every Punnett ratio + pedigree (D 11/11, E 12/12, extract 23/24).
- **Owner byte-review CLEAN:** read every boundary grep hit — "homologous" = homologous CHROMOSOMES (in-syllabus cell basis, NOT homologous organs); ABO/linkage/codominance = substring false positives (aBOut, standard complete-dominance crosses, autosomal pedigrees); 162 in-syllabus Mendel refs, correctOption 0, topicKey heredity.
- **Gates:** tsc · mojibake · scope:guard product · root **181/181** (incl. `syllabusGuard` + `deletionGuard`) · ops matrix runtime proof **7,534 / 0 dup / 0 orphan / 26 topics** · diff-check clean; CI green. Rebased on current trunk pre-merge (disjoint from #395). Scope = 6 files; no forbidden files.
- **Manifest:** `docs/bank-expansion-review-queue.md` (now 450 ids across 6 batches). Review-free; surfaces GATED until trusted-student QA.
- **Lane state / resume:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **~20 topics remain (12 Maths + 8 Science). NEXT recommended = chemical-reactions-and-equations** (owner/next window may pick any remaining topic). Regenerate the per-topic census from a fresh dump (bank is now 7,534). Lane is at a CLEAN BOUNDARY — safe for a fresh Fable window to resume.
## #395 merged — Check & Improve is a first-class SessionSurface (C&I PR-1) — trunk `e33b9d3`

**Post-merge code trunk: `e33b9d3` (squash of #395); #396 (bank Batch 6) and #397 (CT balanced-mix — its docs handoff rides its own lane) landed after it.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#395 (`e33b9d3`) — the C&I plumbing gap CLOSED: a graded Check & Improve session no longer vanishes on close.** Built to `AGENT_checkimprove_sessionsurface_2026-07-12.md` + the LOCKED C&I spec 2026-07-10 (whose §0/§2/§3 were stale — the dispatch's trunk-verified reconciliation governed). Owner GO'd the plan with 4 decisions ratified, then byte-reviewed CLEAN + merged. The already-built detection / marks+topic correction / override-log / MI-feed paths are **byte-intact** — plumbing was added AROUND them. 9 files (+1,386/−41); worktree `LT-worktrees/ci-sessionsurface-pr1`.

- **The six items:** (1) `SessionSurface += "check-improve"` (additive; `VALID_SURFACES`; one FORCED +4-line copy-seam ripple in `SurfaceHistory.tsx` — its copy map is `Record<SessionSurface,…>`; never mounted with check-improve). (2) **`topicSource` provenance** (`confirmed`/`inferred`/`mixed`; **`bank-matched` RESERVED-not-emitted** — defined in the union with a reserved-not-broken comment, no writer emits it because C&I has no bank-match path yet; do NOT let a later PR "fix" it with a fake matcher). Tagged onto the EXISTING correction flow via a `topicTouched` flag — no new picker; never backfilled (absent ≠ inferred). (3) **A sessionRecord on every graded session**, idempotent by id = the durable code (the existing `writeSessionRecord` contract — no new machinery); `couldNotRead`-only sessions write NOTHING; `questionIds: []` (an external upload has no bank identity — its concept is UNKNOWABLE, never fabricated); perQuestion payload at `ci:{code}`; **single-question grades now mint at GRADE time** (the lazy export-only mint retired — singles were the vanish case). (4) **5th `<ResultsScorecard>` variant pair** (live + stored re-open) — **`ResultsScorecard.tsx` zero-line diff**; four-type lens only (the by-topic lens is per-question-topic-gated); quiet provenance line (display-only); NO board-readiness, NO solution key; the bespoke graded views stay byte-intact underneath as "the graded sheet". (5) **"Your checked papers" overlay panel** (FM pattern + the locked CT `ScoreRing`/`DotStrip` verbatim; subject tabs; read-only reopen; honest empty state; **MIX cards show a plain `Mixed topics` chip — never a guessed topic and never a COUNT**, unknowable before per-question topic). (6) **Durable cross-device `#NN`** per subject+topic-token (the CT counter pattern — matches the printed `CI-{S}-{TOK}-{NN}`); **`lt:ci-multi-seq` RETIRED entirely, no shadow path** (it WAS the cross-device collision bug).
- **Honesty rules enforced + unit-tested:** a `mixed` session writes `topicKeys: []` and SAYS so on the scorecard (marks + four-type only — never a majority-guessed topic); `MistakeLogEntry.topic` verbatim (MI call sites byte-unchanged); bare wrong MCQs contribute no four-type (#348 invariant, upstream, untouched); signed-out grades never claim saving.
- **→ PR-B IS NOW UNBLOCKED TO AGGREGATE CHECK-IMPROVE** (owner-flagged): C&I writes durable timestamped records into the SAME `sessionRecords` stream every surface uses, so the progress memory layer can aggregate all four graded surfaces. PR-B is the critical-path successor (fresh Opus agent, after a disjointness re-check of its file list vs this merged diff).
- **Gates @ `bcf6bcb`:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix (runtime proof 0 orphan/0 dup/26 topics) · diff-check all PASS; CI quality-gate + lane-overlap green. Vitest for the 3 new/extended test files = Codespace (CI runs the matrices, not vitest). **[FU-CI-SCORECARD-VARIANT] + [FU-CI-DEVICE-LOCAL-SEQUENCE] CLOSED.**
- **Remaining C&I arc (owner renumbering 2026-07-13):** **PR-2 = per-question topic** (detect prompt/schema surgery — unlocks the by-topic lens + the counted MIX chip) → **PR-3/4 = the two-tier solution cache `[FU-CI-SOLUTION-CACHE]`**, gated on owner sign-off of its 3 safety gates (server-only writes · mandatory invalidation/quality-flag · store text-never-the-image).
- Reports: `Desktop/diff/report-ci-sessionsurface-pr1-plan-2026-07-13.md` (owner-approved with the 4 decisions) + `report-ci-sessionsurface-pr1-build-2026-07-13.md`.

## #393 merged — bank-expansion Batch 5 (how-do-organisms-reproduce +148) — trunk `820d013`

**Post-merge code trunk: `820d013` (squash of #393), on top of `075d596` (LAUNCH_REMAINING tracker) / #391 `25257c0`.** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**Bank-expansion lane — 5 topic-batches shipped. Assembled bank 7,342 → 7,490.**
- **#393 (`820d013`) — Batch 5, how-do-organisms-reproduce +148** (265 → 413): the largest batch yet. Extract-max 54 A/B/C (A28·B13·C13; exhaustive per-source sweep — Biology module + NCERT solutions + worksheet folders + the folder-13 MCQ bank [richest A source] + gdrive PYQ/practice; per-source table in the manifest) + scarce authored **D×30** (37→**67**, HONEST-STOP — chapter already deeply covered on 5-mark items) + **case-based ×64** (E1 plant/asexual ×34 + E2 human/health ×30; 8→**72**, HONEST-STOP at 72 DISTINCT — 3 structural twins dropped rather than padded to 75).
- **Method held the full discipline:** orchestrator + 4 file-disjoint authoring/extraction subagents + 3 independent adversarial skeptics (re-solve + two-direction syllabus scan + distinctness) → 151 produced, 148 kept (1 factual FIX: E1-004 Plasmodium schizogony not "cyst"; 3 twins dropped). Orchestrator stayed lean (heavy read/author/re-solve in subagents; compact returns). Rebased on current trunk before merge (not stale).
- **Owner byte-review CLEAN:** both syllabus directions clean (zero evolution/Darwin AND zero reproduce-specific Class-12 leak — no gametogenesis/hormonal-cascade/embryology detail); ≥75 floor policy held (honest-stop below 75 with inventory, not reverted to 50, not padded); all 148 have solutions; correctOption 0; topicKey canonical.
- **Gates:** tsc · mojibake · scope:guard product · root **181/181** (incl. `reproductionBankGuard` + `syllabusGuard`) · lazytopper ops matrix with runtime proof **7,490 served / 0 dup / 0 orphan / 26 topics** · diff-check clean; CI quality-gate + lane-overlap green. Scope = 6 files (canonical wiring + 4 packs + manifest); no forbidden files.
- **Manifest:** `docs/bank-expansion-review-queue.md` (now 406 ids across 5 batches). Review-free: every question LIVE on merge; owner does whole-product QA later; serving surfaces stay GATED until trusted-student QA. Provenance: authored D/E → `AI_GENERATED_PACK_SOURCES`; extracted → `AI_GENERATED_SOLUTION_IDS`.
- **Lane state / resume point:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **NEXT = heredity** (Science, large reservoir; census A91·B45·C52·D21·E10). Class-12 boundary: Mendel/inheritance/sex-determination RETAINED; the Ch9 evolution section BANNED (already in syllabusGuard). ~21 topics remain.

## #391 merged — FT FINALIZE: Full Test LINKED + cross-device upload-later — trunk `25257c0`

**Post-merge code trunk: `25257c0` (squash of #391; feature `feat/desktop-pr-ft-finalize` @ `728e06a` off `17b4c34`, update-branched over #388/#390 pre-merge).** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#391 merged — the Full Test is REACHABLE from the app UI (hub + Home; no more URL-only route) and cross-device upload-later is CLOSED.** Owner byte-reviewed clean → update-branch → merged. Resolves **[FU-FM-HUB-ENTRY] · [FU-FM-CROSS-DEVICE-UPLOAD] · [FU-TOPIC-DISPLAY-TITLECASE] · [FU-SCORECARD-STALE-HEADER-COMMENTS]**. 10 files (+411/−144): 3 new (`services/fullMockPaperStore.ts` + 2 test files), 7 edited.

- **Hub entry [FU-FM-HUB-ENTRY]:** the practice-hub "Full Mock" card (→ old `/exam-simulation`, "Open existing full-mock engine") is now the **"Full Test"** card — locked copy "Full Test · 3-hour board paper · 80 marks", cta "Open Full Test" → `/full-mock/{grade}/{scope.subject}` with **PLAIN navigation: MockViewGate on the route is the ONLY gate** (no loginUrl wrapper — mirrors the Chapter Test card; a wrapper would be a second gate). The dead "Practice Paper" card retired (`/mock-builder` un-routed since PR-E1 — it redirected circularly back to the hub); accordion = "Timed · Chapter Test". Old-engine plumbing deleted (`buildExamSimulationPath`/`buildMockBuilderPath`/the `mockWeakArea` weak-area checkbox/`IconFileText`); `previewLine("full-mock")` = honest new-surface line.
- **Every old-engine entry re-pointed with HONEST labels (owner calls 1+2):** the MI panel "Add weak-area to mock" → **"Open Full Test"**; DesktopHome's two per-subject "Full mock" quick-generate tiles → `/full-mock/{grade}/Maths|Science` ("Full Test" · "3-hour board paper"); PLUS a third instance **discovered during the build** — DesktopHome's mistake-strip "Add weak-area to next mock" (same dead `/mock-builder` target) → "Open Full Test". Flagged in the report, not silently scoped; owner approved. The "weak-area" wording is GONE from every re-pointed entry — the board paper has no weak-area targeting; carrying the claim would fabricate a capability.
- **Cross-device upload-later [FU-FM-CROSS-DEVICE-UPLOAD] CLOSED:** NEW `services/fullMockPaperStore.ts` persists the drawn paper server-side at **`sessionRecords/{uid}/fullMockPapers/{code}`** — a sibling subcollection under the EXISTING recursive owner-only rule → **firestore.rules byte-untouched** (settled by a pre-flight rules-read BEFORE coding). **TEXT ONLY** (paper + frozen objective + §8b focus + clock anchors, ~50–100 KB ≪ the 1 MB doc cap) — NEVER the uploaded answer image, not even the typed answers (objective is frozen at submit; subjective grades fresh from the upload). Lifecycle: fire-and-forget write in `doSubmit` (beside the localStorage save) → `openPendingUpload` fetches when the local session is missing (**covers cross-device AND the 3-session localStorage eviction**) and re-seeds the device so the rest of the flow is byte-identical to same-device → best-effort delete after a successful full grade. Honest-failure preserved: signed-out/local/anonymous/null-db never write; a true miss (pre-#391 mock, offline, failed write) keeps the **VERBATIM "sat on another device" line** — no fabricated paper on any path. Store mirrors the sessionRecords doctrine (uid gate + `stripUndefined` + logged catch).
- **[FU-TOPIC-DISPLAY-TITLECASE] CLOSED:** `resolveTopicDisplayName`'s fallback keeps connectives lowercase ("Pair of Linear Equations", "Control and Coordination"); canonical registry titles still win; topic KEYS + registry untouched.
- **[FU-SCORECARD-STALE-HEADER-COMMENTS] CLOSED:** comment-only truth-updates in `scorecardVariants.ts` + `ResultsScorecard.tsx` — all FOUR variants are LIVE; the `deferred` stubs are legacy PR-2 seams + the render-guard's fixtures.
- **Executable end-to-end nav proof (owner call 3 — the RTL attempt SUCCEEDED, no fallback needed):** NEW `DesktopPracticePage.fullTestNav.test.tsx` mounts the REAL hub (MemoryRouter + a probe on the exact `/full-mock/:grade/:subject` pattern App.tsx uses) → the locked-copy card renders → navigates for BOTH subjects, desktop + mobile matchMedia → retired entries absent → the CTA is a live button signed-out (**no second gate**). 4/4; plus `topicResolver.test.ts` 4/4.
- **Gates @ `728e06a`:** tsc · mojibake · scope:guard product · root **181/181** · lazytopper ops matrix · diff-check all PASS; Codespace linux build + `verify-production-build` PASS; **full vitest 369 pass + 8/8 new — 6 pre-existing failures in 3 untouched files reproduce IDENTICALLY on trunk `17b4c34`** → [FU-VITEST-PREEXISTING-FAILURES] (invisible to CI: quality-gate runs the matrices, not vitest). CI (quality-gate + lane-overlap) green, re-green on the update-branched head before the owner merged.
- **NEW FUs:** **[FU-RETIRE-EXAM-SIMULATION-LINKS]** (owner-directed — 6 legacy pages still link `/exam-simulation`; the hub/Home no longer do) + **[FU-VITEST-PREEXISTING-FAILURES]**. **Owner live-verify on the stable production link** (hub → Full Test desktop+360px both subjects · Home tiles · cross-device round-trip · legend title-case) = `report-ftfinalize-build-2026-07-13.md` §7 — the FM row's Verified cell flips on that pass.
- Reports: `Desktop/diff/report-ftfinalize-plan-2026-07-12.md` (pre-flight, owner-approved with 3 calls) + `report-ftfinalize-build-2026-07-13.md`.

## #388 merged — bank-expansion Batch 4 (our-environment +80) — trunk `99b1d2a`

**Post-merge code trunk: `99b1d2a` (squash of #388), on top of #387 `f6522d0` (Full Mock).** Re-derive the tip after this docs PR merges.

**Bank-expansion lane — 4 topic-batches shipped. Assembled bank 7,084 → 7,342.**
- **#388 (`99b1d2a`) — Batch 4, our-environment +80** (169 → 249): extract-max 51 A/B/C (per-source table; ~10 Ch16/Ch14 drift dropped; 1 wrong source key corrected) + scarce D×7 (→16) + case-based ×22 (→32). Both scarce bands HONEST-STOP with inventories — Ch15 ecology is intrinsically narrow. **Owner byte-review caught a Class-12 boundary gap** (energy pyramid / pyramid of biomass are Class-12, not Class-10) → 4 items reframed to in-syllabus 10% energy-flow; **two-direction syllabus check (deleted-chapter list + Class-11/12 adjacency) is now standard**, enforced by extract/author/skeptic.
- Prior batches: **#381** real-numbers +30, **#384** real-numbers corrective +12, **#385** life-processes +136 (bundled docs #386).
- **REVISED FLOOR (owner, authoritative):** A/B/C extract-max (no ceiling); scarce **D + E + PROOF ≥ 75 GENUINELY DISTINCT** per topic (was 50), honest-stop + inventory if a narrow topic caps below 75. Strict anti-redundancy.
- **syllabusGuard is a HARD GATE every batch** (read LIVE + run as a gate + two-direction boundary; propose+owner-confirm any missing Class-12 exclusion entries before committing).
- **Manifest:** `docs/bank-expansion-review-queue.md` (all 258 ids across 4 batches). **Review-free: every question is LIVE on merge**; owner does whole-product QA later. Provenance: authored → `AI_GENERATED_PACK_SOURCES`; extracted → `AI_GENERATED_SOLUTION_IDS`.
- **Lane state / resume point:** `handoff/BANK_EXPANSION_LANE_STATE.md` (topics done/remaining, floors, boundary + figure-pending rules, tooling paths). **NEXT: a Science topic (reproduce / heredity).** ~22 topics remain.

## #387 merged — FULL TEST (Full Mock) LIVE — trunk `f6522d0`

**Post-merge code trunk: `f6522d0` (squash of #387, feature branch `720f7e5`).** Re-derive the tip after this docs PR merges (the usual one-commit lag).

**#387 merged — Full Test live.** Per-subject 3-hour board mock (38Q/80mk, Sections A–E: 20×1/5×2/6×3/4×5/3×4), built to `LazyTopper_FullMock_Design_Spec_LOCKED_2026-07-09` + mockup v1, inheriting the merged Chapter Test (#374/#380) — deltas only. Owner byte-review clean: sacred files byte-identical; **App.tsx exactly the 3 authorized lines** (lazy import · `/full-mock/:grade/:subject` route under `MockViewGate` · the bare-route entry).

- **DUAL-SOURCE (resolves [FU-FM-RESOURCE-PREDICTED]):** the draw unions `canonicalQuestionBank` + the live predicted banks (`predictedQuestions` Maths / `sciencePredictedQuestions` Science; planner-only `predictedScienceQuestions.ts` excluded) — never predicted-only, never pyqOnly. Chapter allocation by trends `weightagePercent` via the KEPT (now-exported) `allocateByPercent`; registry = trends ∩ canonical `topics.ts` (a banned/unknown chapter key can never reach the weightage legend or the draw); Section-A eligibility requires the answer key to RESOLVE against the options (the #352 bar); exact numeric mark bands (§7).
- **`src/utils/balancedMockDraw.ts` — THE shared draw helper** (pure, seeded mulberry32, read-only; the CT-mix follow-up [FU-CT-BALANCED-MIX] reuses it verbatim): `drawBalancedSet({pool, count, pyqTargetFraction=0.5, seed}) → {drawn, pyqDrawn, freshDrawn, pyqTargetFraction}`. Honest fallback chain (too few PYQ → all PYQ + fresh fill; zero PYQ → valid all-fresh paper; never pads/hides a class); SEEDED STOCHASTIC rounding of the fractional target (a runtime smoke caught `Math.round(0.5)=1` biasing every 1-question cell to PYQ → aggregate 32/6; fixed → ~21/17 Maths / ~17/21 Science, deterministic per seed). Setup shows the draw's REAL mix.
- **§8a interruption-safety:** ALWAYS-ON persisted WALL-CLOCK (`startedAt`+`durationMs`, remaining computed on load — never a ticking counter that dies with the tab); per-interaction autosave; WHOLE-PAPER resume (⏸ Resume card — a re-draw would be a fake resume); guarded exit; expired-while-away → honest auto-submit of the saved answers; upload-later keeps the paper cached on-device.
- **§8b focus:** aggregates ONLY (`activeMs/awayMs/awayEventCount/longestAwayMs`) as ONE additive OPTIONAL `focus?` field on `SessionRecord` (owner decision 2, the worksheetId-anchor precedent); neutral on-return line; explicit Pause records intent, the clock never stops; NO keystrokes/screenshots; timed surface only (legacy site-wide `focusTracker.ts` untouched).
- **Scorecard:** the `full-mock` `<ResultsScorecard>` variant fills the #341 seam — section lens EXACT from the paper's real sections + **BY-CHAPTER marks-lost bars DERIVED at render** (`sectionBreakdown` stays null — owner decision 3, §6 derive-don't-denormalize) + the one biggest-loss sentence + honest-or-silent mock delta + the §8b focus line + MI-led what-next (`Worksheet on {chapter}` → the builder's `?subject=&topics=`, with an honest "Back to Full Mock"). **NO board-readiness projection.**
- **History/records:** subject-scoped OVERLAY panel + pending banner (locked worksheet pattern, locked CT card shape); `FM-{M|S}-{NN}` durable codes; surface `"full-mock"` sessionRecords + perQuestion + mistakeLog through the SHARED grader (`checkSolution.cjs` byte-unchanged; objective 0-or-full client-side via the exported CT `scoreObjectiveSection` — reuse, no fork).
- **Gates:** tsc · mojibake · scope:guard product · root 181/181 · lazytopper ops matrix (runtime proof) · diff-check all PASS; CI quality-gate (1m25s) + lane-overlap + Vercel green; tsx runtime draw smoke both subjects (38Q/80mk, all 13 chapters, ~50/50 mix, predicted-sourced questions on paper). Owner merged after byte-review.
- **Honest limitations (intended, tracked):** the `/full-mock` route is LIVE but UNLINKED → [FU-FM-HUB-ENTRY]; cross-device upload-later shows the objective score + a plain "sat on another device" line, never a fabricated paper → [FU-FM-CROSS-DEVICE-UPLOAD].
- Reports: `Desktop/diff/report-fullmock-build-2026-07-12.md` (+ pre-flight plan `report-fullmock-plan-2026-07-12.md`).

## [PREV] #384 + #385 merged -- bank-expansion Batch 2 + 3 -- trunk `ce34b3e`

**Post-merge code trunk: `ce34b3e` (squash of #385), on top of #384 `63c6b04`.** Re-derive the tip after this docs PR merges.

**Bank-expansion lane — 3 batches shipped. Assembled bank 7,084 -> 7,262.**
- **#384 (`63c6b04`) — Batch 2, real-numbers CORRECTIVE +12** (225 -> 237). Fixed Batch 1's A/B/C under-extraction: an EXHAUSTIVE per-source re-sweep (11 kept; 2 wrong-answer source items dropped) + a D/E distinct-scenario EXHAUSTION AUDIT that inventoried 27 methods and proved the real-numbers scarce ceiling is ~24 distinct method-classes (only perfect-cube FTA was missing → authored). real-numbers scarce bands genuinely cap below 50 by syllabus (no Euclid/decimal/CRT) — honest ceiling, not a shortfall.
- **#385 (`ce34b3e`) — Batch 3, life-processes +136** (354 -> 490; first SCIENCE batch). **Confirms the exhaustive-sweep fix works:** extract-max yielded 75 net-new A/B/C vs saturated real-numbers' ~23 (real reservoir depth). Scarce bands CLEAR the ≥50 distinct floor without padding: Section-D 31→53 (22 authored), case-based 15→54 (39 authored). 3 adversarial skeptics re-solved all 139 → 137 pass, 3 dropped.
- **STANDING DISCIPLINE [FU-BANK-EXPANSION-SOURCE-SWEEP]:** every batch EXHAUSTIVELY sweeps ALL sources (whole Content folder + all `diff\cbse-papers`) with a per-source candidate/DUP/borderline/NET-NEW table before concluding a count. Band-scarcity floor: A/B/C extract-max (no floor); scarce E/D/proofs ≥50 GENUINELY DISTINCT + honest-stop.
- **Manifest for trusted-student QA:** `docs/bank-expansion-review-queue.md` (all 178 ids across the 3 batches). **Surfaces stay GATED until student QA.** Provenance: authored → `AI_GENERATED_PACK_SOURCES`; extracted (reconstructed solutions) → `AI_GENERATED_SOLUTION_IDS`.
- **FIGURE-PENDING SAFEGUARD (new doctrine):** a question un-answerable without a PROVIDED figure ("identify structure X") must NOT ship answer-less → ship the real figure or add to `WITHHELD_QUESTION_IDS`. Text-answerable + figure-enriched may ship. Running figure-pending list in `handoff/BANK_EXPANSION_LANE_STATE.md`. Batch 3's 2 flagged items (LPSD-009 respiratory, LPSD-018 heart) classified ENRICHMENT (text-answerable; "draw a labelled diagram" is student-produced, not provided-figure-dependent) — ship as-is, reference figure later.
- **Lane state:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **NEXT:** another Science topic (our-environment / how-do-organisms-reproduce — large reservoirs) with the same exhaustive per-source-table discipline.

## #381 merged -- bank-expansion Batch 1 (real-numbers +30) -- trunk `3866a94`

**Post-merge code trunk: `3866a94` (squash of #381), on top of #380 `5bd148c`.** Re-derive the tip after this docs PR merges.

**Bank-expansion lane OPENED + Batch 1 shipped.** Assembled bank **7,084 -> 7,114** (real-numbers 195 -> 225).
- **Band-scarcity floor is ACTIVE** (owner-set, replaced the original flat >=50): Sections A/B/C = EXTRACT-MAX (no floor); scarce categories (Section E case-based, Section D long, PROOF-type) = floor >=50 GENUINELY DISTINCT with HONEST STOP + hard anti-redundancy (distinct differs in more than numbers). Flat floor forces redundancy on saturated chapters (proven in Batch 1: 15 authored real-numbers items were outright bank-dups).
- **Batch 1 = real-numbers +30:** 10 extract A/B/C (authentic questions, solutions decoupled -> pending QA) + 8 scarce-D (6 long + 2 proofs) + 12 scarce-E case-based. Skeptic re-solved all 33, dropped 3; my gate + assembled runtime proof (7114/0-dup/0-orphan/26-of-26) + root matrix 181/181 + ops matrix + mojibake + scope:guard all green; CI (quality-gate + lane-overlap) green. Honest-stop: case ~25, long ~21 (chapter saturated).
- **Manifest for trusted-student QA:** `docs/bank-expansion-review-queue.md` (30 ids). **Surfaces stay GATED until student QA.** Provenance: authored -> `AI_GENERATED_PACK_SOURCES`; extract solutions -> `AI_GENERATED_SOLUTION_IDS`.
- **Lane state:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **CORRECTION carried forward:** Batch 1 A/B/C was UNDER-EXTRACTED (only 2 source files). Every future batch MUST exhaustively sweep ALL sources (whole Content folder + all of diff\cbse-papers) with a per-source candidate/DUP/borderline/NET-NEW table before concluding a net-new count. `[FU-BANK-EXPANSION-SOURCE-SWEEP]`. A corrective real-numbers A/B/C re-sweep is queued as a small follow-up batch.

## #380 merged -- CT is full-screen distraction-free + the scorecard derives a by-CONCEPT lens -- trunk `5bd148c`

**Post-merge code trunk: `5bd148c` (squash of #380), on top of #374 `e54ab8c`.** Two owner-dispatched Chapter-Test fast-follows shipped (byte-review clean, owner-merged, no self-merge). Re-derive the tip after this docs PR merges.

- **Part A -- by-CONCEPT (subtopic) scorecard lens ([FU-CT-CONCEPT-LENS] CLOSED).** The CT full scorecard now shows **By section -> By concept -> Where your marks went**. New pure `deriveChapterTestConceptLens(response, questions)` in `scorecardVariants.ts` joins each graded question `qNumber -> paper questionId -> canonical subtopic`, aggregates awarded/total per subtopic, sorts by marks lost (ALL resolved concepts -- owner decision, over loss-only). **DERIVED at render, never persisted; `sectionBreakdown` stays null** (the #374 D3 discipline). Anti-fabrication: an unresolvable subtopic counts in the hero total but forms NO concept row; null when none resolve (shell omits). The grade response is keyed by `qNumber` (NOT `questionId`), so the fn takes the id-bearing questions as a 2nd arg (verified against `aiClient.ts`). `canonicalQuestionBank` is imported READ-ONLY (no `src/data` change). Wired live-full (`paper.questions`) + a guarded stored-reopen (1:1 `questionIds`<->`results` length check).
- **Part B/C -- CT is chrome-less full-screen at both widths ([FU-CT-HEADER-UNIFORMITY] CLOSED, route-scoped).** New `isBareFullScreenRoute` in `App.tsx` suppresses the legacy dark header AND (owner-authorized) the mobile BottomNav on `/chapter-test`, both widths, through one helper. **Recon correction:** the chrome on the test was the **NON-shell legacy navbar**, not `DesktopShell` -- so `DesktopShell.tsx` is byte-unchanged and the fix is the owner-authorized bare-route exception in `App.tsx` only. CT already rendered a full-bleed `min-h-screen` surface, so no structural CT change was needed.
- **App.tsx narrow change (authorized).** Exactly: the `isBareFullScreenRoute` helper + `&& !isBareFullScreen` on the legacy-header render + `isBareFullScreenRoute(current)` in the BottomNav gate (the owner-approved 2nd branch) + one compute line. No route table, no other branch. Byte-unchanged sacred files: grader (`checkSolution.cjs`), worksheet gen/grade, `sessionRecords`, `chapterTestBlueprint`, `worksheetSessionStore`, `DesktopShell.tsx`, `firestore.rules`, `src/data/**` (imported read-only).
- **Gates -- ALL GREEN.** Local: tsc (`tsconfig.app.json`), mojibake, scope:guard `--mode product`, root scripts `test:matrix:all` **181/181**, lazytopper `test:matrix:all` (incl. topickey runtime 7084/0-dup/0-orphan), `git diff --check`. CI: **quality-gate PASS (1m38s)** + **lane-overlap PASS** (disjoint from the notes/`src/data` lanes) + Vercel preview. 6 files (+324/-9); fresh worktree off the re-derived trunk `ebc95d7`. New vitest added (`scorecardVariants` concept-lens + `isBareFullScreenRoute` predicate/behaviour) -- runs in Codespaces/CI, not the Windows-local gate.
- **The Chapter Test scorecard is now section + concept + four-type, and the test surface is chrome-less full-screen. CT can be flipped live at `MockViewGate` whenever the owner is satisfied** -- the two fast-follows the #374 handoff named as pre-flip work are done. New open item **[FU-RETIRE-OLD-GLOBAL-HEADER]** (product-wide legacy-header retirement -- deliberate, later; `isBareFullScreenRoute` is prefix-structured so `/full-mock` joins with one entry). Report: `Desktop\diff\report-ct-concept-lens-fullscreen-2026-07-12.md`.

## [EARLIER] Chapter Test BUILT to the locked spec -- trunk `e54ab8c` (#374), owner live-verified

**Post-merge code trunk: `e54ab8c` (squash of #374).** The Chapter Test surface is BUILT and owner live-verified (two-phase grading; numbered `CT-{S}-{TOPIC}-{NN}`; navigator / timer / topic-scoped history all working) -- **behind `MockViewGate`** (owner flips it live at launch). This docs PR advances trunk by one commit once merged; re-derive the tip after.

- **CHAPTER TEST = BUILT (#374, `e54ab8c`).** The LEGACY practice-set `ChapterTestPage` (`generatePracticeSet` + `Math.random` draw + self-marking + `masteryLevelService` -- all ABANDONED concepts, D-PROG-10 + a past fabrication finding) is **fully REPLACED**. `App.tsx` route/entry untouched.
  - **Sourcing (D1, native -- no fabricated field):** the mockPaperEngine adapter would have had to invent `PredictedQuestion.kind` (no canonical source), so sourcing is NATIVE via `bankQuery.selectBankQuestions` + a CBSE A--D blueprint drawer (`components/chaptertest/chapterTestBlueprint.ts`); exact numeric mark bands (not the fused buckets), fresh shuffle per test (§8). No adapter exists -> nothing laundered.
  - **Grading (two-phase, §5):** Section A objective auto-graded **0-or-FULL** on submit (PR-348 invariant, never fractional); Sections B--D subjective via answer-sheet **upload** through the SHARED worksheet grader (`gradeWorksheet`/`checkSolution.cjs` **byte-unchanged**). New `services/chapterTestGradeService.ts` (D4); `worksheetGradeService.ts` byte-unchanged.
  - **Scorecard:** the Universal `<ResultsScorecard>` chapter-test variant **flipped live** from `deferred:true` -- partial (objective only, **NO** four-type/MI) -> full (total + BY-SECTION A--D lens + four-type from written). The A--D lens is **DERIVED** at render (D3) via the shipped #353 `sectionFromTotalMarks` proxy; `sectionBreakdown` **stays null** for chapter-test (never denormalised).
  - **Records:** `sessionRecords` surface `"chapter-test"` + perQuestion payload; durable `CT-{S}-{TOPIC}-{NN}` / `#NN` (additive to `sessionRecords.ts`, reuses the existing `sessionRecords/{uid}` collection + rule -> **no `firestore.rules` change**). Topic-scoped history rail (read-only reopen), pre-submit confirm gating the score reveal, navigator (4 states), per-question flag mirrored live, autosave, downloads (test / graded / step-marked solution key with **variable authored** per-step marks). In-memory `PersistedWorksheet` (D2) drives the shared print docs carrying the CT- code; never saved to the worksheet store. ONE responsive component, class-driven CSS (no inline style, §7), no `useIsDesktop` twin.
  - **Gate on the surface:** behind `MockViewGate` -- owner flips it live at launch. The scorecard is section + four-type today; **CONCEPT (subtopic) lens + header-uniformity are the pending fast-follow** before the gate flips ([FU-CT-CONCEPT-LENS], [FU-CT-HEADER-UNIFORMITY]).
  - Cofounder byte-reviewed (adapter fabricates nothing -- there is none; `sectionBreakdown` null; mastery/self-mark gone from the CT flow; `worksheetGradeService`/`checkSolution.cjs`/`App.tsx`/`firestore.rules` byte-identical) + owner live-verified + squash-merged; **no self-merge**. One correctness bug caught+fixed pre-push (timer auto-submit closed over stale answers -> live ref). Report `Desktop\diff\report-chaptertest-build-2026-07-12.md`.
- **Merge spine (authoritative):** ... #375 `8fb1ad6` · #376 `57b76df`->merged · **#374 `e54ab8c`** (the CT build; owner-squash-merged, no self-merge).
- **NEW FUs:** [FU-CT-CONCEPT-LENS] (subtopic-level weak-area breakdown, FM-parity -- `subtopic` IS on `CanonicalQuestion`, derivable), [FU-CT-HEADER-UNIFORMITY] (the DesktopShell GLOBAL header on the full-screen test -- forbidden-file; owner decides global-restyle vs chrome-less test), [FU-CT-REOPEN-DOWNLOAD] (graded/solution downloads on a history reopen need paper reconstruction from `questionIds`), [FU-CT-CODE-TOKEN] (CT code reuses `topicAbbr` = `CT-M-RN-02` for cross-surface consistency; the mockup's illustrative `REALNO` is not matched by design).

## [MERGED] Notes fan-out COMPLETE + NCERT click-through LIVE -- trunk `8fb1ad6` (#375); Part-A ledger PR #376 in review

**Post-merge code trunk: `8fb1ad6` (#375).** The docs were stale since #363; this section back-fills #364 -> #375 + the post-#375 hosting infra. Full blow-by-blow in `SESSION_LOG.md` (2026-07-12 catch-up entry); merge SHAs listed below per [FU-STATE-BOARD-SUMMARY-ONLY] (the machine `ledger/MERGE_LEDGER.md` is summary-only).

- **NOTES SURFACE = COMPLETE.** All **26 canonical topics** are specced + independently audited (batches #365 / #368 / #370 / #371 / #372; docs #369 / #373), and the clickable NCERT-page cites are **LIVE and owner-verified**. `Chemical Reactions` (#365) is the LOCKED chemistry exemplar; the chemistry conformance mapping gates on it (floors tightened 5/3/1/1/2 -> 7/4/3/2/3 at #368). Syllabus trims held throughout (Heredity evolution-trimmed; Magnetic Effects motor/generator-trimmed; Triangles no Pythagoras/Areas-of-Similar; no cross-multiplication; no area-by-coordinates).
- **NCERT click-through LIVE.** #375 (`ncertPdfOffsets.ts` + `NcertPageModal` `#page` translation) makes the note's `p.N` cite resolve to the correct page WITHIN each per-chapter PDF (`pdf_page = ncert_page - k`, clamp >=1; empirical per-chapter `k` verified against every cite). **POST-#375 infra (owner, no PR):** 26 chapter PDFs uploaded to `ncert/{subject}/ch{N}.pdf` (bucket `lazzyy-topper.firebasestorage.app`) + `ncert/` public-read rule published + bucket CORS (origin `*`, GET/HEAD). Owner-verified: Trigonometry p.114 and Heredity p.129 open the exact printed page.
- **Part A of the current task -- [FU-LEDGER-CLICKABLE-CITES] PR #376 IN REVIEW (product; NOT self-merged).** `feat/notes-ledger-clickable-cites` (`57b76df`): the Source-Ledger `p.N` numbers are now clickable, reusing the SAME `CiteLine`/`NcertPageModal` path (new `LedgerSource` parses `p.N` + `Ch N`, links only a real in-this-chapter NCERT page). 470/474 rows clickable, 4 correctly plain; page ranges link to the first page; display byte-unchanged. 1 file (`Note.tsx`); no spec/schema/grader change; `validate_spec.py --all` VALID; CI green (quality-gate + lane-overlap). Awaiting owner merge.
- **COORDINATION AUTOMATION LIVE (#366, `b920440`).** lane-overlap guard (REQUIRED check -- overlapping PRs go red, must sequence) + state-board ledger (-> `ledger/MERGE_LEDGER.md`) + CODEOWNERS. GitHub ruleset "trunk-protection" ACTIVE: required checks `quality-gate` + `lane-overlap`, require-branches-up-to-date, block force-push, **required approvals = 0 BY DESIGN** (GitHub forbids PR-author self-approval; owner is sole code-owner AND author; mechanical checks + the independent auditor carry review -- do NOT re-enable), repo-admin on the bypass list.
- **Merge spine (authoritative record):** #364 `64ba82d` · #365 `fd70a4f` · #366 `b920440` · #368 `308be87` · #369 `791ef7a` · #370 `cbc561c` · #371 `0a2f677` · #372 `8c529ff` · #373 `64b0698` · #375 `8fb1ad6` (all owner-squash-merged, no self-merge). Interleaved owner direct-push-to-trunk docs(skill) commits: `801371f`, `f2934e6`, `6f858b2` (skill/coordination refinements, within the owner-only direct-push scope).
- **RESOLVED FUs:** [FU-NOTES-NCERT-PDF-HOSTING], [FU-CHEMISTRY-EXEMPLAR-WIRE], [FU-SOLO-OWNER-APPROVAL], [FU-COORD-LEDGER-IN-HANDOFF]. **NEW FUs:** [FU-LEDGER-CLICKABLE-CITES] (#376), [FU-STATE-BOARD-SUMMARY-ONLY] (`github-actions[bot]` not selectable in the ruleset bypass -> state-board push to trunk blocked -> ledger auto-append is summary-only; the human narrative carries the record).
- **IN PROGRESS (not merged):** **Chapter Test build** -- PR open, rebuilds the legacy `ChapterTestPage` (deleted `generatePracticeSet`/`Math.random`/self-mark/`masteryLevelService`) to the locked spec (mockPaperEngine+canonicalBank adapter D1, two-phase AI grading, chapter-test `<ResultsScorecard>` variant D3, `sessionRecords` `"chapter-test"` + `CT-{subj}-{TOPIC}-{NN}`, new `chapterTestGradeService.ts` D4); awaiting cofounder byte-review + owner live-verify; file-disjoint from notes. **Bank extraction** -- Pass-1 = **2,070 net-new** vs the 7,084 bank (2,005 non-case w/ official solutions + 65 case-based); **case-based is an AUTHORING lane (Z3), max ~8/topic, NOT extraction**; Maths near-exhausted (356), Science rich (1,649); Pass-2 Content-folder audit RUNNING; depth-floor decision pending Pass-2.

## [MERGED] P0 Topic-Key Root Cure -- REBUILD (#363, trunk `6ecf15f`) -- OWNER LIVE-VERIFIED

**Post-merge code trunk: `6ecf15f` (squash of #363), on top of #362 `caaf205`.** Irreducible one-commit lag: this docs PR advances trunk by one commit once it merges, so the SHA that shipped the cure is `6ecf15f` (re-derive the new tip after this docs PR lands). Owner independently confirmed the migrated bank (7084 served / 0 dup / 0 orphan / 26 canonical keys), the topicKey-only diff (every changed line a topicKey), and the dual-style guard now wired into the matrix.

- **[FU-TOPICKEY-UNIVERSAL] (P0) -- CLOSED.** One product, one topic key. C1 (resolve everywhere, read+write) was already on trunk; this PR shipped **C2 (data migration)** + **C3 (guards + authoritative runtime proof)**. Every served question now carries exactly one canonical `topics.ts` slug.
- **What shipped.** C2 rewrote **2,514 topicKey literals across 52 files** (both object styles `topicKey:` and `"topicKey":`, the triangles factory literal, AND 26 inline questions in `canonicalQuestionBank.ts`) -- values only, proven lossless (before==after 7084/7084, id set identical, 0 objects changed in any field except topicKey, 0 wrong targets). C3 added a **dual-style Guard A** (the blind spot that broke the prior attempt -- a `\btopicKey:` regex silently skipped 124 JSON-style files / 1,912 Q -- is now a standing CI gate), an **authoritative import-based runtime proof** (transpiles + imports the assembled bank; asserts 0 orphan / 0 dup / a collapse floor, never a hardcoded count), a dual-style before/after harness, resolver aliases for the 3 owner-approved singletons, and a Codespaces vitest proof.
- **The 4 previously-zeroed Science chapters now return questions** -- Chemical Reactions, Acids-Bases-Salts, Metals-Non-Metals, Reproduction (each returned 0 pre-cure) -- owner live-verified. Circles != Areas Related to Circles; Light != Human-Eye stay disjoint pools.
- **Gates.** Local (tsc, mojibake, scope, root 181/181, lazytopper ops matrix incl. the new guard + runtime proof, diff-check) + **CI quality-gate GREEN** (linux build + ops matrix) + Codespaces vitest green. Rebased onto the post-#362 base (`caaf205`) with a byte-identical substantive diff before merge.
- **Two owner-RATIFIED scope items.** (1) Migrating the 26 inline aggregator questions exceeded 3A's "questionBanks-only" -- unavoidable for 0-orphans, since `canonicalQuestionBank.ts` holds live served data (not predicted*/shared-data) and section 6 authorises the data commit to write src/data -> tracked by [FU-AGGREGATOR-INLINE-QUESTIONS]. (2) The single C3 amend (a guard-honesty fix from adversarial review) kept the three-commit shape.
- Report: `Desktop\diff\report-topickey-REBUILD-2026-07-11.md`; authoritative depth census (per-topic x section x mark-band over 7084): `Desktop\diff\topickey-depth-census-2026-07-11.md`.

Last updated: 2026-07-10 (post-PR #360 — **Worksheet: scope DERIVED from the topic selection + MI 2c copy MERGED** (squash `b096a8a`): the small dispatched follow-up to #357's live-verify. Scope is no longer an independent control — `selectedTopics[]` + `allTopics` are the single source of truth, and `scope`/`singleTopic`/`multiTopics` are **derived views** with stable array refs [module-level `EMPTY_TOPICS` when not multi-topic] so every downstream consumer stayed untouched — only the setters + picker UI changed. `scope = allTopics ? full-subject : selectedTopics.length >= 2 ? multi-topic : topic`. The three-way Scope segmented control + the topic dropdown + the separate multi/full chip lists were replaced by ONE unified topic picker with an "All topics" toggle and an honest derived label [`Topics — 2 selected · multi-topic`]: **ticking topics IS the scope**, so no ticked topic can be silently discarded — the #357 live-verify defect [the in-app tick never called `setScope`, so `parseEntryContext` built from `validMulti[0]` and dropped the rest]. New handlers `toggleTopic`/`addTopic`/`focusSingleTopic`/`toggleAllTopics`; catalogue-validity effect rewritten onto `selectedTopics` [no-op on mount; rescues an in-app subject/stream switch; never guesses at entry]; URL sync unchanged and round-trips. **MI state 2c reworded** to the locked copy [FU-WS-MI-COPY] — wording only, same state fires, remedy button unchanged. Two `// TODO(P0-topickey)` markers left on the raw `q.topicKey === t.key` compares for the P0 root cure — NOT fixed here. `worksheetMiSelector.ts` + `worksheetModel.ts` are **byte-identical to trunk** [the #357 ranking/floor/cap/availability logic left alone]. **2 files** [`WorksheetGenerator.tsx` + its unit test]; gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops 6/6; diff-check) + **vitest 18/18** [ran on Windows]; `vite build` linux-CI-gated. **4-lens adversarial review** [React-state/referential-stability · MI honest-state machine · scope-discipline · edge-cases] with per-finding verification → **0 findings**. Branch cut from `6202d90` — pre the pnpm pin `581b0dd` + the #356/#359 merges — verified a safe stale base [its two files untouched by those; frozen install failed → `--no-frozen-lockfile` + restore lockfile], GitHub merged with no conflict. Owner live-verified + squash-merged **#360 → `b096a8a`; no self-merge**. **The worksheet builder is now COMPLETE** — context-aware entry, derived scope, scope-relative MI with within-topic section skew, history overlay, pending banner, code-bearing PDF filenames, 360px verified. **Closes [FU-WS-SCOPE-DERIVE] + [FU-WS-MI-COPY]**; the P0 **[FU-TOPICKEY-UNIVERSAL]** root cure is dispatched separately to a fresh agent [full diagnosis carried in `OPEN_QUESTIONS_AND_FOLLOWUPS.md` so it is inherited from the repo, not chat]. Report: `Desktop\diff\report-worksheet-scope-derive-2026-07-10.md`.) Previously (post-PR #356 — **Notes v1.3: visible mindmap TREE by default + full-screen note modal MERGED** (squash `629457e`): the dispatched v1.3 follow-up to #345 (notes v1.2), owner live-verified (mindmap reads as a tree; note opens near-full-screen; **360px passed on a real device**). **⚠️ Ground-truth correction — the brief's premise was WRONG:** it claimed the branches "render COLLAPSED (5 flat closed rows)", but all three specs (life-processes/light/quadratic) are **depth-2** mindmaps already FULLY EXPANDED at the existing `useState(depth <= 1)` — no branch ever rendered a closed caret (leaves carry no caret). The real defect was **visual legibility** (~24 near-identical full-width cards at 16px indent don't read as a branching tree), so the correct open-state was PRESERVED and the fix is a VISUAL overhaul — the JS default is unchanged in the diff. **FIX 1:** each depth-1 branch seeds ONE `--mm-accent` CSS var that drives its node edge + child rail + connector elbows, with a clear root › branch › leaf weight; kept the v1.2 responsive win (indentation capped ≤380px, `mm-scroll` `overflow-x:hidden`, labels wrap → no horizontal scroll/overlap; NOT a revert to the old fixed d3 canvas). **FIX 2:** `NoteModal` opens a 92vw × 92vh sheet (capped 1280px for readable line length) on desktop, full-screen on mobile; `<Note>` internals + all close affordances (✕/Escape/dim-click), body-scroll-lock and focus-restore unchanged — sizing only. **3 files** — `NoteMindmapTree.tsx` + `NoteModal.tsx` + the `.lt-note__mm-*` block inside `Note.tsx`'s scoped `NOTE_CSS` (**CSS-only**; no `<Note>` render logic / specs / grader / `src/data` / forbidden). Gates GREEN (tsc; mojibake; scope product; `validate_spec.py --all` VALID×3; root **181/181**; lazytopper ops 6/6; diff-check); `vite build` linux-CI-gated (Windows-unrunnable). Owner live-verified + squash-merged **#356 → `629457e`; no self-merge**. **Notes template COMPLETE → the ~30-chapter notes scaling is now UNBLOCKED (template locked), PARKED pending owner GO to the Fable notes content lane.** Resolves the v1.3 items (mindmap default-visible + full-screen modal); **[FU-MOBILE-VERIFY-GAP] first real pass CLOSED** — the static 360px audit was confirmed by the owner on a real viewport (doctrine stands: every surface's live-verify includes a 360px check). New **[FU-PNPM-PACKAGEMANAGER-PIN]** (supersedes gotcha D42): a fresh worktree's `--frozen-lockfile` install fails `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (overrides drift; Corepack falls back to whatever pnpm is on PATH) → used `--no-frozen-lockfile` + `git checkout -- pnpm-lock.yaml`; tsc via `./node_modules/.bin/tsc`. Report: `Desktop\diff\report-notes-v13-2026-07-10.md`.) Previously (post-PR #357 — **Worksheet CONTEXT-AWARE ENTRY + multi-topic MI aggregate + preview/switch/360px MERGED** (squash `aa7e778`): the dispatched follow-up PR for the six owner-found FUs from #353 live-verify. **FIX-1 (the invariant):** the builder NEVER invents a topic — it reads `scope/subject/stream/topic/topics` from the URL (single source of truth; extends the existing `buildDesktopWorksheetPath` idiom), validates every key against `topics.ts`, seeds state from it, **DELETES the `topics[0]` entry fallback**, and **redirects ONCE to `/practice-hub`** when no valid subject+topic is present; a `replace`-only URL-sync keeps reload/share honest. **Recon flip: the desktop hub ALREADY passed the params via `buildDesktopWorksheetPath`/`addScope` — the bug was the builder ignoring them, so App.tsx was NEVER needed** (route renders `<WorksheetGenerator/>` with no props). **FIX-3 (multi-topic MI aggregate):** new `rankedInScopeWeakTopics` (selector) + `allocateMiCounts` (model) — a scope-relative ranked weak set with marks-lost weights → proportional between-topic split with a **FLOOR** (a chosen topic is never dropped; a zero-MI topic keeps its share), a **CAP** (owner decision: **50% at N≥3, ~60% at 2** so the owner-verified 60/40 from `MI_BOOST=1.5` is preserved), an **AVAILABILITY gate**, and **per-topic level-2 section skew** stacked on top (new `topicSectionBoosts` on the plan). `allocateCounts`/`MI_BOOST` **byte-untouched**; single-topic path identical. Honest counts: enrichment count AND named topics are **drawn-gated** from the real candidate set. **FIX-4/5/6:** sticky bar + its CSS removed (and the mobile @media that HID the hero Preview un-hidden → mobile keeps a CTA); accessible `role="switch"` toggle replaces both checkboxes; 360px reflow (full-width stacked hero/drawer/preview actions, chip abbreviation). **D1:** Home Worksheets card → `/practice-hub` (destination-only). **8 files** — 7 in `components/worksheet/` + `lib/desktop/homeDestinations.tsx`; App.tsx + all forbidden untouched. Local gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops 6/6; diff-check) + **CI quality-gate GREEN** (linux build 1m18s); **vitest NOT runnable on Windows (`@rollup/rollup-win32-x64-msvc` stripped) → Codespaces**. **6-dim adversarial review** (allocation math / entry-routing / honesty / a11y-css / tests / regressions): 5 dims 0-findings fully traced + **1 confirmed honesty finding FIXED** (the multi-topic "N of M target X&Y" callout named the full weak set even when a topic drew 0 questions → now `drawnWeakTopics`-gated, mirroring `drawnWeakSecs`). **Reasoned deviation from FIX-1.2:** KEPT the catalogue-validity reset effect (re-seeds topic on an IN-APP subject/stream switch; recon-proven a no-op at entry) — deleting it (the doc's literal instruction) breaks in-app subject switching. Owner live-verified + squash-merged **#357 → `aa7e778`; no self-merge**. **Closes [FU-WS-ENTRY-CONTEXT], [FU-WS-MULTITOPIC-MI-AGGREGATE], [FU-WS-PREVIEW-BUTTONS], [FU-WS-MI-SWITCH]; [FU-WS-MI-COPY] HALF-landed** (state 2a softened; state 2c "Your weak area is X, not {topic}" still pending → follow-up PR). New follow-ups from live-verify: **[FU-WS-SCOPE-DERIVE]** (ticking topics in Customise never calls `setScope` → scope stays `"topic"`, silently builds from `validMulti[0]` and discards the other ticked topics + short-circuits `enrichActive`; the URL path already promotes scope — owner-confirmed MI works correctly when the Scope control is set to multi/full), **[FU-TOPICKEY-UNIVERSAL] (P0)** (surfaces match RAW topic slugs → 4 Science chapters [chemical-reactions-equations, acids-bases-salts, metals-non-metals, reproduction ≈1,180 Qs] return ZERO; bank stores 51 distinct `topicKey` for ~26 chapters [25 Title-Case + 26 slug]; Chapter Test + Full Mock carry the same latent defect; `WorksheetGenerator.tsx` `q.topicKey === t.key` raw compare silently disables enrichment on Title-Case chapters; cure = Phase-1 resolve-everywhere read+write + CI guards, Phase-2 data consolidation [FU-BANK-TOPICKEY-NORMALISE]+[FU-MI-TOPICKEY-BACKFILL]; prior fixes failed for lack of a guard — do NOT attempt piecemeal). Product principle re-affirmed: **a student's selection is intent — if we cannot honour it, we say so; we never silently do something smaller** (three instances found in #357 live-verify). Report: the PR #357 description.) Previously (post-PR #353 — **Worksheet scope-relative MI + within-topic section enrichment + Preview affordance MERGED** (squash `f8c1536`): the dispatched follow-up to #349. The worksheet builder's Mistake-Intelligence is now **SCOPE-RELATIVE** — weakness resolved WITHIN the chosen scope via the new pure `worksheetMiSelector.ts` (`scopeHotspot` = weakest in-scope topic vs `globalHotspot` = weakest across the subject, used only to NAME the true weak area when the scope has none) — never one global hotspot compared to the scope. The single locked box is **SPLIT into its true causes**: a student WITH MI data now sees the real weak topic NAMED + a one-tap "Focus on / Add {topic}" remedy, never the false "grade a worksheet first" (no data / weak-area-elsewhere / this-topic-IS-the-weak-area / signed-out). **Within-topic section enrichment is LIVE** for single-topic scope — section derived from each mistake's `totalMarks` via the CBSE band proxy (1→A,2→B,3→C,4→E,5→D; a non-band value is an HONEST UNKNOWN → counts toward marks-lost but NO section, never fabricated); additive `orderPoolBySectionBoost` in `worksheetModel.ts` reuses the tested `allocateCounts`, capped at real per-section availability, gated on the real DRAWABLE pool (section present + spans >1 + draw doesn't exhaust the pool) so the toggle is **never a no-op**; the cross-topic `MI_BOOST` path is **byte-unchanged**; **NO schema change, no migration, no new writes** (`MistakeLogEntry` has no `questionId` → band proxy is this store's derivation; exact `questionIds`→`canonicalQuestionBank` join is the separate `SessionRecord` path → [FU-CI-SOLUTION-CACHE]). **FIX B** — desktop `position:sticky` Preview footer (in-column, no navy-sidebar overlap, below the history overlay z-900) + a Preview at the foot of the Customise drawer. **6 files, all `components/worksheet/`, zero forbidden/gated.** Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix 6/6; diff-check) + **CI quality-gate GREEN** (linux build 1m20s) + Vercel PASS; **vitest 41/41** (Codespaces/CI). **11-agent adversarial review** → 5 low findings, all fixed + independently re-verified SHIP (the real one: section-skew gated on the section FILTER not the drawable POOL → pool-aware gate + `drawnWeakSecs` callout + `skewHasHeadroom`). **⚠️ 8th stale-base catch** — local `base/approved-thru-437` was stale/pre-#349; re-derived `origin` `67a89d6` + isolated worktree. Owner live-verified + squash-merged **#353 → `f8c1536`; no self-merge**. Closes **[FU-MI-SCOPE-RELATIVE]** + **[FU-MI-ENRICH-WITHIN-TOPIC]** + **[FU-BUILDER-PREVIEW-AFFORDANCE]**. New follow-ups (owner findings surfaced in #353 live-verify — a dispatched-separately follow-up PR, NOT #353 regressions): **[FU-WS-ENTRY-CONTEXT]** (builder ignores the entry topic; `WorksheetGenerator()` takes no props, defaults to `topics[0]`), **[FU-WS-MULTITOPIC-MI-AGGREGATE]** (`weakestTopic()` names only ONE topic → multi-topic should aggregate across selected weak topics), **[FU-WS-PREVIEW-BUTTONS]** (3 Preview affordances render → keep hero+drawer-foot, DROP the sticky), **[FU-WS-MI-SWITCH]** (checkbox → accessible switch), **[FU-WS-MI-COPY]** (soften out-of-scope wording), **[FU-MOBILE-VERIFY-GAP]** (mobile ≤360px never mockup-designed or live-verified — DOCTRINE: every future mockup ships a mobile frame + every live-verify includes a 360px check). Report: `report-worksheet-mi-scope-relative-2026-07-09.md`.) Previously (post-PR #352 — **Objective ANSWER KEYS repaired MERGED** (squash `b9a7817`): the #348 deterministic objective-scoring guarantee now holds **across the bank, except 13 manifest rows**. Objective rows whose `q.answer` (the option TEXT) did not resolve against `q.options` were silently falling back to the model; **89 in-scope defects re-derived via an AST scanner using the grader's OWN `normaliseOption`/`resolveOptionIndex`/`isObjectiveType`** (not the estimated ~101) — **74 corrupt MCQ keys + 15 Assertion-Reason rows with no `options[]`**. **76 fixed** (61 corrupt MCQ keys — each question SOLVED, `q.answer` set to the EXACT text of the correct EXISTING option, never a new value; + 15 AR rows given the 4 standard CBSE `options[]`); **`correctOption` never introduced — the key stays `q.answer`**. **13 honestly manifested** in `docs/objective-answer-key-review-queue.md` (corrupted/duplicated options + figure-dependent — grader defers to the model there; real-paper lookup queue). Anti-fabrication held: nothing guessed; **two subagent "fixes" overridden back to the manifest** rather than accept plausible-but-unverified keys. Verified: 0 mis-resolutions; **61/76 corroborated by the row's original `finalAnswer` option-letter, 0 mismatches**; TS parse-diagnostics clean. **43 bank files + 1 manifest; only `q.answer` changed + AR `options[]` inserted; grader `server/routes/*` byte-untouched; no COMPLETION cell moved.** Built by 3 file-disjoint subagents; orchestrator applied 4 manual corrections + verified. **[FU-BANK-CORRUPT-KEYS] CLOSED** except the 13; new FUs **[FU-BANK-KEY-REVIEW-QUEUE]**, **[FU-SECTION-A-VSA-HALFMARK]** (99 Section-A written-answer rows are all `marks:1` → clamp 0/1, no live hole; accepted simplification), **[FU-BANK-GARBLED-DISPLAY-TEXT]**. Owner live-verified + squash-merged; no self-merge. Report `Desktop\diff\report-bank-corrupt-keys-2026-07-09.md`.) Previously (post-PR #349 — **Worksheet BUILDER redesign MERGED** (squash `b4f2162`): the worksheet BUILD view is now on the locked "A · Smart default" design — a smart-default HERO (`{mode} · {topic}` + a REAL exact chip line: count · sections · difficulty · marks, NOT "≈") → primary **Preview worksheet →**; ALL prior controls (subject/stream/scope/topic/build-mode/advanced sections+difficulty+count) preserved behind **Customise** (progressive disclosure, nothing removed); MI personalisation as ONE honest toggle (default ON where it can apply; signed-out → Sign-in CTA; can't-enrich → OFF+disabled with an honest hint); a NEW **Preview step** with a real section bar + per-section counts/marks, a COMPUTED enrichment callout, 3 real samples, and an honest bank-shortfall — **ONE `candidate` set feeds hero → preview → generate, so the count shown IS the count generated**. **History moved OFF the page body**: the bottom `<SurfaceHistory>` mount removed → a header control (`Your worksheets · N · M awaiting ⌄`) opens a `WorksheetHistoryPanel` OVERLAY (dim+blur, scrollable, Esc/dim/✕; reuses SurfaceHistory rows + read-only `<ResultsScorecard>` re-open unchanged — `embedded`/`pendingOnly` props only). **Pending uploads surface via a `WorksheetPendingBanner`**: 1 pending → `Upload now →` re-hydrates into the UNCHANGED grade panel and attaches to the EXISTING record (frozen-code idempotency, #338 — no duplicate); ≥2 → `See all N →` opens the panel filtered to pending. **PDF filenames now carry the unique `code`** on all 3 paths (safe fallback). The generated "worksheet is ready" view, `WorksheetGradePanel`, Practice hub and Topic Hub were **NOT touched**; 7 files (5 M + 2 A), zero forbidden/gated — disjoint from #348. Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check) + **CI quality-gate GREEN**; vitest Codespaces-only. **⚠️ Rebased off a STALE base (pre-#348) before merge — the 7th stale-base catch; zero-conflict (disjoint files), NO revert, `checkSolution.cjs` byte-identical to trunk post-rebase.** Owner live-verified + squash-merged **#349 → `b4f2162`; no self-merge**. Closes 2 of the 3 owner-found worksheet bugs post-#344 (PDF filename + history placement; the grader MCQ one was #348). New follow-ups (all in the dispatched-separately follow-up PR): **[FU-MI-SCOPE-RELATIVE]** (MI enrichment must be computed WITHIN the selected scope — today a student with MI data can see a locked box whose copy wrongly says "grade a worksheet first"), **[FU-MI-ENRICH-WITHIN-TOPIC]** (single-topic worksheets can't enrich today — cross-topic re-weight only; within-topic section/mark-band enrichment is the real unlock, conditional on MI sub-topic granularity), **[FU-BUILDER-PREVIEW-AFFORDANCE]** (the Preview action bar is mobile-only → desktop users must scroll back to the hero after customising). Report: `report-worksheet-builder-redesign-2026-07-09.md`.) Previously (post-PR #348 — **Uniform OBJECTIVE (MCQ/AR) scoring MERGED** (squash `27eaa8f`): the grader now enforces ONE rule on every surface — an OBJECTIVE question (MCQ / Assertion-Reason / Section A) scores **0 or FULL, never fractional, never step-distributed**; working is analysed ONLY to classify the mistake type, never to award marks. **Root cause of the reported 0.5 partial-marks bug:** `worksheetGradeService.ts` mapped the grader answer key via `(q as unknown as {correctOption?}).correctOption` — a cast for a field the banks NEVER carry (`correctOption` = **0/353**; the real key is `q.answer` = the option TEXT) → always `undefined` → the server's objective guard was DEAD CODE → every MCQ was model-graded and step-distributed. **Fix:** NEW shared `server/routes/objectiveScoring.cjs` (+ parity-pinned client twin `src/lib/objectiveScoring.ts`) is called by BOTH grader functions (`handleCheckSolution` + `normaliseStructuredResult`) → **byte-aligned by construction** (one impl, two callers). Deterministic clamp: objective ⇒ 0-or-full, per-step marks STRIPPED; the real `q.answer` + `q.options` are forwarded (compare bridges a letter pick ↔ the option text; corrupt `.pyq` keys / no-`options` AR rows defer to the model, never a false 0). A wrong MCQ **with real written working KEEPS its `mistakeType`** (MI learns); a bare pick nulls it; **subjective step-marking untouched**. **Check & Improve forwards optional ADDITIVE objective signals** — bank-sourced (`section/format/options/answer`) ⇒ DETERMINISTIC key compare; keyless uploads ⇒ a detect-step `objective` flag + the model's BINARY verdict clamped, with a **≤1-mark safety rail** — and is **byte-unchanged when the signals are absent** (the two paths do NOT carry the same guarantee: bank-sourced is deterministic; keyless is model-classified-then-clamped). `ECF=2` preserved. Gates GREEN (tsc; mojibake 3/3; scope product; root **181/181**; ops matrix incl. llm-path 5/5; diff-check; no forbidden/gated files) + **CI quality-gate GREEN** + Vercel PASS; vitest is Codespaces-only → logic self-verified in node (module 41/41; graders 21/21; worksheet-scenario replay 48/48; twin↔cjs parity 741/0). 12 files (8 M + 4 A). Owner **live-verified BOTH paths** (worksheet deterministic + C&I model-verdict; no partial marks on MCQs) + squash-merged **#348 → `27eaa8f`; no self-merge**. This closes the "grader MCQ all-or-nothing" owner-found worksheet bug flagged post-#344. **Objective scoring is now UNIFORM across surfaces; `objectiveScoring.cjs` is the single source of truth for the invariant — Chapter Test / Full Mock will consume it when their MCQs move server-side.** New follow-ups: **[FU-OBJECTIVE-COST-SKIP]** (model-skip only pays off on future click-based surfaces), **[FU-BANK-CORRUPT-KEYS]** (~86 corrupt `.pyq` keys + ~15 no-`options` AR → data-quality lane), **[FU-CI-SCORECARD-VARIANT]**, **[FU-CI-SOLUTION-CACHE]**. Report: `report-objective-scoring-uniform-2026-07-09.md`.) Previously (post-PR #345 — **Notes v1.2 template MERGED** (squash `17fea57`): the notes-track schema/UX pass that locks the TRUE template and unblocks the ~30-chapter scaling. **C1** `NoteMindmapTree` → responsive **collapsible** vertical tree (reflows ≤380px, no overlap; CSS-hide collapse force-shown in print). **C2 = the SCHEMA change** → `schema_version 1.2`: added `examples[].marks_total` + numeric per-step `solution_steps[].mark` (0.5 half-marks valid), validator now **10 rules** (Rule 10 = per-step marks sum to `marks_total`), rendered as a per-example total badge + per-step mark chips, **all 3 specs backfilled** (life-processes/light/quadratic, 14 examples, sums verified). **C3** new `NoteModal` — `<Note>` opens as a POPUP over the Topic Hub (mounting-only; `<Note>` internals unchanged). **C4** new `NcertPageModal` + `CiteLine` — clickable `p.N` refs → Firebase Storage PDF embed with an HONEST "coming soon" fallback (NO PDFs committed). Gates GREEN (tsc; validator VALID×3 + 6-fixture self-test incl. a Rule-10 negative; mojibake; scope mixed; root **181/181**; ops matrix; diff-check) + CI quality-gate GREEN; grader untouched, no `src/data`/forbidden changes. 10-agent adversarial review clean on marks + doctrine; 5 minor findings fixed. **A v1.3 follow-up is IN FLIGHT NEXT** (owner-found REFINEMENTS, not v1.2 regressions): the mindmap tree should be VISIBLE by default, and the note modal should be FULL-SCREEN for diagram-heavy notes. The Fable notes content lane stays PARKED until owner gives the scaling go. Report: `Desktop\diff\report-notes-v12-template-2026-07-08.md`.)

Previously (post-PR #344 — **Progress-Journey ARC · PR-3 — per-surface Worksheet HISTORY MERGED (squash `a4c3eec`)**: NEW `components/results/SurfaceHistory.tsx` renders the durable session records the store already writes (PR-1/#338) as a "Your worksheets" section on the WorksheetGenerator BUILD view — the store is **CONSUMED, never modified or recomputed** (§3a). ONE responsive component (CSS reflow; navy `#15233a` heads, Fraunces + Inter, green). **C1** rows = `code` + `title` + `date` + a tone-coloured score chip (`marksAwarded/marksTotal`) OR an honest "awaiting your answer sheet" pill (`status==="pending-upload"`) + a compact four-type dot-strip ("✓ clean" when none); honest empty state; a `partial` record shows its real graded portion + a "partial" tag. **C2** vs-last-time = `getSubjectProgress` (the designated source) → a "↑/↓ N% this month" chip on the newest row per subject, **honest-or-silent** (absent when thin; never a fake 0) — NOTE: a subject-level MONTH trend, not a literal per-worksheet session-to-session delta (a small fast-follow if the owner wants the latter). **C3** tap-row → a READ-ONLY `<ResultsScorecard>` rebuilt from the STORED record (score + four-type + code — invents nothing); a "Download graded sheet" affordance appears ONLY when the local worksheet + grade caches resolve (reuses `exportGradedWorksheetPdf`), absent otherwise; **no per-question `perQuestionRef` reconstruction** (out of scope). PR-2 files edited ADDITIVELY (`scorecardVariants.ts` +`storedWorksheetScorecardVariant` + made marks `gradedCount`/`totalQuestions` OPTIONAL so a stored re-open never fabricates a count; `ResultsScorecard.tsx` ScoreHero renders the "across G of T" desc only when both counts present → LIVE worksheet/QP unchanged, no regression). CT/FM = deferred `SURFACE_COPY` seams (not mounted). **3 self-caught defects fixed pre-ship** (3-dim adversarial review, all CONFIRMED): a `pending-upload` re-open must NOT offer "Download graded sheet" (an all-unreadable scan still caches an `ok` grade) → now Done-only + a `status` gate on the handler; and its copy is the honest "we couldn't read any answers", not "you haven't uploaded". **Frontend only** — no store mutation, no `src/data`/`notes`/grader/`worksheetPdfExport.ts`/forbidden changes. 5 files. Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check) + **CI Quality Gate GREEN** (linux build) + Vercel PASS. Owner-QA'd + squash-merged **#344 → `a4c3eec`; no self-merge**. Report: `report-progress-pr3-surface-histories-2026-07-08.md`. **NEXT (Progress-Journey ARC) = arc PR-4, Me/Progress redesign** (§3b / §4-step-4). SEPARATELY: 3 owner-found worksheet bugs (grader MCQ all-or-nothing + PDF filename + history placement) fix in their own follow-up PR — NOT PR-3 regressions. ) Previously (post-PR #341 — **Progress-Journey ARC · PR-2 — the Universal `<ResultsScorecard>` MERGED (squash `8c4c159`)**: ONE responsive `<ResultsScorecard>` extracted from the shipped `WorksheetScorecard` — the shared SHELL (navy `#15233a` body + white footer; centered ~540px modal desktop → grab-handle bottom sheet mobile at 1024px via CSS reflow; Fraunces hero + Inter; ✕/primary/secondary/dim/Escape all CLOSE — a summary, not a gate; honesty verbatim: pending sacred, all-pending → honest message + disabled actions, four-type "not a weakness") + a PURE typed 4-surface variant interface (`components/results/scorecardVariants.ts`, covering the four flex-points: score model / framing line / four-type / actions). TWO LIVE variants: **worksheet** (behaviour-identical = the NON-REGRESSION gate — verified byte-identical `SC_CSS` via `comm -23`=0 lines dropped, QP-only classes purely additive) + **quick-practice** (§2.1: "X of N attempted" not marks/total, honest 0-attempted empty, NO graded-sheet download, MI four-type ONLY when typed mistakes exist, personalized what-next primary from the real signal + fixed floor menu). Chapter Test + Full Mock = `deferred:true` config seams (never rendered — no board-readiness/upload invented; the shell no-ops a deferred variant). **PRESENTATIONAL — the scorecard WRITES NOTHING:** Quick Practice writes NO session record (LOCKED §1a); the worksheet write stays upstream in `gradeWorksheetAndRecord`. `WorksheetGradePanel` + `PracticePage` repointed (reused the #249 finish-session trigger + added a `scorecardDismissed` flag so the auto-modal dismisses without fighting the derived trigger); old **`WorksheetScorecard.tsx` DELETED** (fully absorbed); a builders unit test added (Codespaces vitest). **Frontend only** — no `src/data` / grader / `worksheetPdfExport.ts` changes. 6 files (+885/−347). Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check; no forbidden files) + **CI Quality Gate GREEN** (linux build) + Vercel preview PASS. 4-dim adversarial review = **0 confirmed findings**. Owner **live-verified** (worksheet non-regression held; Quick Practice honest attempts + fallback menu; NO durable record for QP) + squash-merged **#341 → `8c4c159`; no self-merge**. Report: `report-scorecard-pr2-2026-07-07.md`. **NEXT (Progress-Journey ARC) = arc PR-3, per-surface histories** (Worksheet/CT/FM pages read `sessionRecords` via `progressStore`; design pkg §3a / §4-step-3). ) Previously (post-PR #338 — **Progress-Journey ARC · PR-1 — the session-record DATA LAYER MERGED (squash `d704b1c`)**: the connectivity spine the Universal Scorecard → per-surface histories → Me/Progress → Home-nudge arc reads, built exactly to the LOCKED design package (`LazyTopper_Progress_Journey_Design_Package_LOCKED_2026-07-03`) §1–§2. NEW `services/sessionRecords.ts` — the `sessionRecords/{uid}/records/{code}` store (ONE durable record per COMPLETED graded session; Quick Practice writes none — §1a): fields per §1 + a documented additive `worksheetId` idempotency anchor; **idempotent** (doc id = the durable code → a re-grade overwrites, never dups); localStorage mirror + fire-and-forget Firestore `setDoc(merge)` with a LOGGED catch; D32-safe (`ignoreUndefinedProperties` + `stripUndefined`); honest-failure gates (no record for signed-out / local / anonymous); `perQuestionRef` persists the per-question grade payload for "review my answers" (§1b); **durable cross-device `#NN`** via `ensureWorksheetSessionCode` reusing the PURE `worksheetNomenclature` over the records count (replaces the device-local count — §1c), frozen once so the downloadable sheet, graded sheet, and record id agree. NEW `services/progressStore.ts` — the ONE aggregation reader (§2): per-surface history, recent-activity strip, pending nudge (`status ≠ graded`), honest-or-silent before→now marks trend (subject + topic altitudes); every write has a reader. The write fires in `gradeWorksheetAndRecord` (best-effort — never breaks grading); the durable code now **prints on the downloadable `WorksheetPrintDoc`** (threaded through `exportWorksheetPdf` + the Generator download + the GradePanel; `WorksheetGradedPrintDoc` already printed it). `PersistedWorksheet` +optional `code/name/sequence`. **Grader `server/routes/checkSolution.cjs` byte-unchanged; NO scorecard/history/Me/Home UI** (later arc PRs). `sessionRecords` is the FIRST genuinely-new top-level Firestore collection → required a `firestore.rules` companion (globally-forbidden file, NOT in this PR; owner deployed via Console + committed to trunk **`dc73360`** — breaks the prior "reuse an existing collection" pattern). 11 files (+1182/−10). Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check; no forbidden files) + **CI Quality Gate GREEN** (linux build); vitest (`sessionRecords`/`progressStore`/grade-service wiring) is Codespaces-only (Windows strips the linux rollup binary). Built in an isolated worktree; **adversarially reviewed** (doctrine clean; idempotency verified correct + hardened with the `worksheetId` anchor + a regression test). Owner **live-verified + squash-merged #338 → `d704b1c`; no self-merge**. **[FU-SESSIONRECORDS-RULES] CLOSED** (`dc73360`); new **[FU-SESSIONRECORDS-REGRADE-JSDOM-TEST]** (a jsdom re-grade idempotency test — the node-env test can't exercise the `getWorksheetSession` short-circuit); the seen-set uniqueness feature is the deliberate follow-on on the same store (`questionIds` locked into the contract now — no migration). **NEXT (Progress-Journey ARC) = the Universal `<ResultsScorecard>` (arc PR-2)** — refactor from `WorksheetScorecard` (worksheet variant behaviour-identical = the non-regression gate), per-surface variants, the 3 refinements (honest "vs last time", "review my answers", WRITES the session record via this store). Report: `report-progress-session-record-layer-2026-07-06.md`. ) Previously (post-PR #337 — **Topic Hub boardEssentials seeding MERGED (squash `1caa25d`)**: authored real CBSE-2026-27 `boardEssentials` (full `ActionableSeed`) for all **12 unseeded** Topic Hub topics in `lazytopper/src/lib/desktop/topicHubContent.ts` → **26/26 `topics.ts` topics now resolve `isSamplePreview=false`**; no live topic renders the generic `buildSampleActionable` "core ideas" fallback (retained as the safety net). 12 topics — Maths 8: real-numbers, polynomials, pair-of-linear-equations, arithmetic-progression, circles, areas-related-to-circles, statistics, probability; Science 4: metals-and-non-metals, human-eye-and-colourful-world, how-do-organisms-reproduce, our-environment — 3–6 real concepts each, authored + **adversarially syllabus/fact-checked** (6 clean / 6 corrected; fixed scrambled NCERT §-numbers, a circles proof mis-attribution, a presbyopia slip, stray-quote artifacts). Banned subtopics from `syllabusGuard.ts` excluded; Science in-scope (our-environment = Ch15 only, no deleted Ch16; reproduce = no evolution creep). Owner **Option A**: `ConceptSpine.test.tsx` sample-preview assertions re-pointed from the now-seeded `real-numbers` to a synthetic `__sample-preview-fixture__` (coverage preserved) → **2-file diff**. Gates GREEN (tsc; mojibake; scope product; root matrix **181/181** incl. syllabus surface scan; ops matrix; diff-check; tsx verify 26/26 seeded). The ConceptSpine **vitest** render suite + `vite build` are Windows-unrunnable (linux platform-pin: `@rollup/rollup-win32-x64-msvc` stripped) → CI/Codespaces; the data-layer basis of the re-pointed assertions verified via tsx. Owner-merged, **no self-merge**. **Topic Hub concept spine now FULLY SEEDED (26/26).** Pedagogy sign-off (concept selection + mark bands) DEFERRED to student-QC → **[FU-TOPICHUB-PEDAGOGY-REVIEW]**; **[FU-TOPICHUB-PREVIEW-LABEL]** moot (label dormant for live topics, mechanism correct + tested). Report: `report-topichub-boardessentials-seed-2026-07-06.md`. ) Previously (post-PR #329 — **Notes render completion MERGED (squash `97a4949`)**: the PR-F code lane closed the last three `<Note>` render gaps, each lifted from the LOCKED prototypes — (1) VISUAL MINDMAP via `d3-hierarchy` layout + React JSX (labels still routed through `<NoteRichText>`, preserving #328), replacing the text outline; (2) GENERATED-FIGURE registry keyed by `figure.generator` — the Quadratic discriminant triptych (`parabola_triptych`, ported from the prototype's `plotStatic`) now DRAWS instead of the "pending extraction" placeholder (`ncert` placeholder unchanged); (3) DOWNLOAD-PDF (`window.print()` + all-tabs-rendered + `@media print` note isolation via the visibility trick). New files `NoteMindmapTree.tsx` + `NoteGeneratedFigure.tsx`; deps `+ d3-hierarchy ^3.1.2` / `@types/d3-hierarchy`. Rebased onto trunk before merge (byte-reviewed clean: 5 notes files only; #331 bug-fixes + handoff byte-identical, `checkSolution.cjs` ECF=2 intact). Gates: tsc, mojibake, lazytopper ops matrix, root matrix 181/181, diff --check — all GREEN; build linux-CI-gated. Owner-merged, no self-merge. **NOTES NOW RENDER FULLY** (Light + Quadratic: NCERT figures + visual mindmap + generated figures + Download-PDF, every tab, no placeholders) — the render pipeline is proven; ~30 chapters remain (spec authoring, parallel Fable content lane). Closes [FU-NOTE-GENERATED-FIG], [FU-NOTE-PDF-EXPORT], [FU-NOTES-LIGHT-COMPLETE]. OWNER LIVE-VERIFY pending (visual/print — non-blocking): mindmap tree desktop+mobile ≤380px no overflow, discriminant draws, PDF clean on both, entities show "&"; if PDF shows chrome/clips → [FU-NOTE-PDF-PRINT-CHROME]. ) Previously (post-PR #333 — **Check & Improve holistic scorecard MERGED (squash `c3f6084`) & owner-live-verified**: multi-Q C&I now shows per-step annotation matching single-Q — each legible question card is EXPANDABLE (collapsed by default; tap the question) and reveals its `annotatedSteps` incl. the **corrected working**, via the existing `AnnotatedStepRow` (desktop) / inline step cards (mobile); `couldNotRead` stays honest pending (never 0). Both single-Q AND multi-Q gain **"Download graded solution" (PDF) + "Read on screen"**, via a NEW branded `CheckImproveGradedPrintDoc` (scoped CSS) carrying the CI code header, rasterised through the **shared** `worksheetPdfExport` core (`renderElementToPdf`) — a bridge toward the Universal `<ResultsScorecard>`. STEP-0: `annotatedSteps` was already in the frontend response (pass-through + server normaliser) → PART A display-only. Frontend-only; grader/backend untouched; 4 files (1 new + 3 modified). Gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops **6/6**; diff-check; no console.log; new component CSS-classes; `vite build`+vitest on CI). Adversarially reviewed (4 lanes; Bug-2 non-regression CLEAN) + fixes applied (coaching counts-not-marks doctrine; mobile meta-line grader-total; `aria-expanded`; index-keyed expand). Owner byte-review + squash-merged; no self-merge. New follow-ups: **[FU-CI-EXPAND-DISCOVERABILITY]**, **[FU-UNIVERSAL-SCORECARD]**. Full write-up in PR #333.) Previously (post-PR #330 — **Light extraction PILOT MERGED (squash `83b1268`): the Light question bank grew 326 → 767** — 4 commits (v1 Foundation-pack 231 rows; v2 owner-directed beyond-board tier 51 rows + CBSE-official CFPQ/SQP-2025-26 19 rows; v3 gdrive high-marks 138 rows (2-5 mark only); v4 rebase onto `b5a62be` + review-queue manifest). 3 new bank files (`light-reflection-and-refraction.{fnd,cfpq-sqp25,gdr}.ts`) spread into `canonicalQuestionBank.ts`; NEW `SCIENCE_FIGURE_VISUALS` in `visualConceptRegistry.ts` binds **35 eye-confirmed raster source figures** (WebP, luminance-cleaned) by questionId — the first bound science figures. 3-mark 67→176, 5-mark 51→80, diagram-flagged 10→97; AI rows untouched (share 31.6%→13.4%). All 10 extraction checkpoint tests PASS; de-dupe ledger 91 exclusions; ~9 wrong source answer keys + 1 official CFPQ rubric error shipped physics-correct and flagged. **Owner decision: SHIP-TRACKED** — the 230 AI-authored solutions (`AI_GENERATED_SOLUTION_IDS`) + 52 authored-SVG-later diagram flags do NOT block launch; the committed manifest `docs/light-extraction-review-queue.md` is the trusted-student-QC / post-launch correction queue. Content lane next: Electricity extraction ONLY on explicit owner go. Report: `report-light-extraction-pilot-2026-07-03.md`.)
Previously (post-PR #282 — **Notes-generation track Step-1 MERGED** (squash `de2a616`): a **PARALLEL CONTENT track** (like the worksheet + PYQ-symbol tracks), separate from the Topic Hub product queue. #282 generated — **NOT yet wired into the app** — the locked note infrastructure under `notes/`: **`lazytopper_notes_kit.py`** (the locked renderer + `ncert_figure`/`clean_watermark`/`refill_rect` figure toolkit; verified running — regenerates ELEC+CHEM with the Download-PDF button), **5 v2 prototypes** (Light, Electricity, Chemical Reactions, Life Processes [carries 3 real NCERT figures], Quadratic Equations), and the **Light enriched exemplar** = the finished reference STANDARD (6 verbatim NCERT definition cards + 8-term key-terms cluster + 4 **real NCERT** worked examples + 3 **real NCERT** figures incl. **Fig 9.9 New Cartesian Sign Convention** + AUTHORED-vs-NCERT legend + full source ledger; cites reconciled directly against **NCERT Reprint 2026-27, Class 10 Science, Ch 9** `jesc109.pdf` — principal focus p.136, refractive-index in-text Q p.150 corrected on direct check). **14 files, ALL under `notes/`** — zero `lazytopper/src/`, zero `handoff/`, zero product code (verified on remote). **Content-generation ONLY.** #282 merged 2026-06-21 13:42Z — chronologically the FIRST of the recent cluster (BEFORE the worksheet #283/#284 and the PYQ-symbol #286), on a parallel track that the worksheet docs #285 + symbol docs #287 did not cover; documented here now. Gates GREEN (mojibake, root matrix **181/181**, lazytopper ops matrix, scope:guard `--mode product`, `git diff --check`); CI `quality-gate` **GREEN**; owner-merged, **no self-merge**. Full track handoff: **`handoff/NOTES_TRACK_HANDOFF.md`** (detailed working set at `notes/HANDOFF_notes_track_2026-06-21.md` + canonical index `notes/LazyTopper_NoteProtos_INDEX_2026-06-21.md`). **DECISION (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** fed by a structured note-spec (`notes/specs/<topic_key>.json`) as the single source of truth — NOT standalone HTML; the tutor + PR-F both consume the spec as data, and **Step 2 authors specs (JSON), not HTML**. **NEXT (notes track — gated order, do NOT reorder): (1)** `notes/validate_spec.py` — a source-required validator to note-spec schema v1.1 (this gate makes the ~35-note fan-out safe to parallelize); **(2)** a content PR under `notes/` (validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure + mindmap lift); **(3)** then in parallel **PR-F** (the `<Note>` component + Topic Hub wiring, reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments — Electricity/Chemical Reactions/Life Processes [keep its 3 figures]/Quadratic Equations — → ~35 notes), validator-gated. **Do NOT start Step-2 generation or PR-F before the validator + content PR land.** `magnetic-effects` = generate-TRIMMED (field / field-lines / field-due-to-conductor·solenoid / right-hand-rule / force-on-a-conductor; EXCLUDE Motor / EMI / Generator — re-read `syllabusGuard.ts` first); `topic_key` must match `topics.ts` (two trig keys → one `trigonometry`). New follow-up: **[FU-NOTES-MATHS-MAP]** (the Maths NCERT folder is not yet content-mapped). )
Previously (post-PR #286 — **PYQ symbol-integrity pass MERGED** (trunk `b600e2b`): the parallel symbol-fix track that RESOLVES the SOURCE-DATA gap #284 flagged. Audited ALL 103 PYQ packs / 759 questions (Maths + Science) in an isolated worktree (`fix/pyq-symbol-integrity`); **3 commits squash-merged**. **(1) Batch 1 — 12 √/operator recoveries** in `real-numbers`/`quadratic-equations`/`polynomials` `questionText` (RN-003/005/008, REALNUM-2024-003, REALNUM-2025-001 (twin recovery), REALNUM-2026-002/003/004/005, QE-003/004, POLY-2024-005b), EACH verified against the question's own marking-scheme answer or a clean twin — recover-never-fabricate. Correctly EXCLUDED ~35 false-positives where √ lives only in the *answer* (question correct as-is). **(2) Withhold 38 unservable questions** — 17 Science (bilingual/CID column bleed) + 21 Maths (blank / garbled-expression / questionText-contradicts-its-own-answer / subset-font Hindi-as-Latin mojibake) — via a SINGLE source-level filter: `canonicalQuestionBank = RAW_CANONICAL_QUESTION_BANK.filter(q => !WITHHELD_QUESTION_IDS.has(q.id))` (honest omission > broken question; corrupt source objects kept INTACT in their packs for re-extraction; lifecycle = remove an id as its real text is supplied). Fragile-file evidence: the 349 `...PACK` spreads BYTE-IDENTICAL to trunk; **RAW 6579 → LIVE 6541, delta == 38** (0 leaked / 0 collateral / 0 dup-ids; every withheld id present in raw). **(3) §7 — normalize ° / π / √** in 5 `areas-related-to-circles` `questionText` (ARC-004/005/006, 2025-ARC-001/002), answer-verified. SCOPE: `questionText` + `WITHHELD_QUESTION_IDS` only — `predictionTypes.ts` + all id/marks/year/set/answer/options/solutionSteps untouched. Gates ALL GREEN: tsc, mojibake, scope:guard, root matrix 181/181, lazytopper ops matrix, withhold runtime check, CI quality-gate (linux build). Owner squash-merged #286; no self-merge. ⚠️ **Withheld Qs stop being served on MERGE + REDEPLOY** (not on push). Reports in `Desktop/diff/` (`report-pyq-withhold-and-followups-2026-06-21.md`, `PYQ_batch_for_owner_lookup_2026-06-21.md`, `PYQ_REEXTRACTION_followup_2026-06-21.md`). **PYQ √-data audit follow-up from #284 RESOLVED** (recoverable set fixed; unrecoverables withheld + queued for owner real-paper lookup). New follow-ups: **[FU-PYQ-OWNER-LOOKUP]** (14 unrecoverable Maths expressions — owner supplies from real papers, batched by paper code), **[FU-PYQ-REEXTRACT-SCIENCE]** (re-extract the 2025/26 bilingual Science papers = the 17), **[FU-PYQ-ANSWER-FIELD-SYMBOLS]** (answer/solution fields STILL carry dropped √ — this pass fixed questionText only), **[FU-PYQ-CORRUPTION-DETECTOR]** (mojibake-by-subset-font across BOTH subjects + an answer-consistency check; note `mismatch_scan.py`'s `√\s*\w` regex captures only ONE char → under-reads multi-digit surds, so "only REALNUM-2024-004 is a true text-answer mismatch" is a screen not a guarantee), **[FU-PYQ-ANGLE-NORMALIZE]** (`Ð`→`∠` + remaining °/π/superscript normalization, bank-wide). )
Previously (post-PR #280/#283/#284 — **Worksheet rebuild E2a → E2a.3 MERGED** (trunk `cfff277`): the worksheet FOUNDATION — ONE responsive `WorksheetGenerator` (build→generated in-place; replaced the desktop+mobile twins) + distribution fix (multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI ×1.5 re-weight; largest-remainder capped at availability → honest counts) + deleted-topics filter (heredity-and-evolution, magnetic-effects) + real-math downloadable PDFs (the E2a jsPDF-ASCII path stripped √→"sqrt" → replaced with MathText/KaTeX → detached offscreen host → html2canvas → jsPDF FILE download "Option B", paginated, count-identity locked) + persist-by-`worksheetId` (`worksheetSessionStore`, the PR-E2b grade contract) + view-aware Back + MI-enrich as the page's single NAVY anchor in the right preview with three honest states (signed-out→login-return CTA / in-scope hotspot→toggle / signed-in-no-hotspot→how-to-unlock). The "MI box hanging in air" was the global `input{width:100%;appearance:none}` ballooning a bare checkbox (hard-scoped). **Missing-symbol issue = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality questions with √/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` fine) → parallel symbol-fix agent; list in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`. #281 closed (superseded by #283). Isolated worktrees; owner Vercel-verified each before merge; no self-merge. Full architecture + PR-E2b plan + gotchas: **`handoff/WORKSHEET_TRACK_HANDOFF.md`** + the WORKSHEET section below. **NEXT: PR-E2b** (the AI grade loop). New follow-ups: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE], PYQ √-data audit (all subjects). )
Previously (post-PR #278 — **CLAUDE.md governance refresh MERGED** (trunk `f7170ef`): a surgical root-file edit — CLAUDE.md ONLY, +37/−9; product PR (root file), owner-merged, no self-merge; built in an isolated worktree (`chore/claude-md-refresh` off `b4163ef`, commit `ea837d4`, squash `f7170ef`). Changes: **(1) ADDED §2a Worktree Isolation** — the project's #1 lesson made an invariant rule (three prior collisions came from agents sharing the one checkout `C:\Projects\Lazytopper-Production`; one swept product code into a docs merge → every task now runs in its own `git worktree`, verify `git branch --show-current` before every commit). **(2) DE-HARDCODED the root matrix count** in §6 + §6a (was "175/175"; the count GROWS — 181 as of 2026-06-20 — so the file now says "verify what the suite reports now, do NOT hardcode"). **(3) Replit→"CI linux runner / GitHub Codespaces"** in §6 (Replit retired; the linux-x64 build-pin fact + "Windows can't build locally, CI-gated" kept). **(4) ADDED the verification doctrine** to §6 — static gates (tsc/matrix/build) are necessary but NOT sufficient; any change touching a live round-trip (auth, grading, persistence, routing/filtering, the tutor) needs ONE real owner live-execution before "done", flagged as needing live-verify. **(5) §13 CBSE 2025-26 → 2026-27** throughout + a new competency-split line (verified pattern: ~50% competency-based / 20% MCQ / 30% short-and-long; mock/worksheet generation should represent the competency proportion, not just section/marks counts; the step-marking minimums A=1/B=2/C=3/D=5/E=4 are unchanged). **(6) ADDED the marks-bucket gotcha** to §7 (the PR-E1 lesson: the `"1"/"23"/"5"/"4"` buckets FUSE 2-and-3-mark and can't isolate a single mark value → for exact mark-range filtering use numeric `q.marks`, never the coarse buckets). **(7) ADDED to §5** the MockBuilder-retired + MI-is-sidebar-chrome-only + re-read-`scripts/src/syllabusGuard.ts`-before-generating-content rules. §3/§8/§9/§10/§11/§12 and ALL gate COMMANDS untouched; no restructuring. The pre-existing line-1 UTF-8 BOM was LEFT as-is (owner decision — cosmetic, not gate-flagged, pre-dates this PR; the mojibake check doesn't scan root files). NEXT unchanged: **PR-E2 (Worksheet)**, branched fresh from `f7170ef`. )
Previously (post-PR #276 — **Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter, Chapter-test wired, MockBuilder un-routed — MERGED** (trunk `1de6f3e`): the PR-E wiring stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, branched off `acc419b`), landed as **3 commits squashed to `1de6f3e`** across one implementation + two owner-found behavioral round-trips. **Scope delivered:** **(1) concept-row "Practise" now routes DIRECTLY to Quick Practice** (`/practice/:grade/:subject`) instead of the generic `/practice-hub` (the old 2-click bug); a new `buildDesktopConceptPracticePath` carries the concept context, while the hub path (`buildDesktopPracticePath`) is unchanged for other entry points. **(2) Exact mark-band filtering (Option A, owner-decided after live-verify):** the FIRST cut translated the band → the page's coarse `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark questions into one `"23"` bucket (`PracticePage.tsx:53`), so "3–5 marks" leaked 2-mark questions and "2–3" couldn't isolate 3-mark — owner caught this at live-verify. Fix: the concept-row route now emits an EXACT numeric range `marksMin`/`marksMax` (parsed from the concept's band by `parseMarkBandRange` in `navigation.ts`) and `PracticePage` filters by `Number(q.marks)` within `[min,max]` (`parseMarksRangeParams`); "3–5" yields ONLY 3/4/5, "2–3" yields real 2 AND 3. The lossy `markBandToBuckets`/`marksBucketsToParam` helpers became dead and were REMOVED (caller-checked). **(3) Single-pool count fix (third round-trip):** the "N available" hint and the displayed set were drawn from two independent `generatePracticeSet` samples (different random draws), so the hint promised e.g. 10 while the display held 5–6 even on a healthy bank — a two-pool divergence (note: the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Fix: extracted a pure module-scope `questionMatchesFilters` + `selectInRangeFromPool(pool,…,committedCount)→{available,displayed}` so BOTH the hint and the display derive from the SAME realized pool → `available >= displayed.length` always; honest thin-bank case preserved (real smaller number shown, no padding). **(4) PATH-CONDITIONAL contract held throughout:** the exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none → stays "All"/student-controlled, bucket UI untouched. The pre-applied band is a CHANGEABLE starting filter (student can widen/clear). **(5) Back-nav:** concept-row Quick Practice now passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was landing on a generic "Exam Trends" default). **(6) Applied-filter indicator:** a light "Practising {Concept} · {min}–{max} marks · edit filters to change" band renders on the concept-row entry ONLY (gated on the URL range), so the student sees the band + that it's editable. **(7) Chapter-test action button WIRED** — the PR-D inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`; the page itself was already built (real gen→score→persist) and is NOT redesigned here (its old-design redesign is backlogged → [FU-CHAPTERTEST-PAGE-REDESIGN]). **(8) MockBuilder UN-ROUTED** — both `/mock-builder` routes now redirect to `/practice-hub` (chosen over bare deletion so the remaining inbound links — DesktopHome/HPQ/StudyPlan/Practice-Paper card — don't 404), lazy import + command-palette dispatch repointed, tagged `PR-G-deletion-pending`; the MockBuilder file is KEPT (PR-G deletes the legacy set). This is the ONLY `App.tsx` touch and was owner-flagged. **`Worksheet` button stays inert "Soon" → PR-E2.** **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.** Files: `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched (`predictionTypes.ts`, `Welcome`/`DesktopShell`/`main`, `vite.config`, `firebase.json`, `firestore.rules`, `src/data/**`). Local gates GREEN across all three rounds: tsc, root matrix **181/181**, lazytopper ops matrix, mojibake, scope:guard `--mode product`, `git diff --check`; vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Owner LIVE-VERIFIED** the final state (concept-row "3–5" shows zero 2-mark + the count/display agree; hub entry still "All"; Back returns to the specific topic; MockBuilder unreachable) and merged #276. Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`. **NEXT (Topic Hub queue, owner-authorized separately, branched fresh from `1de6f3e`): PR-E2** (Worksheet — its own locked spec) → **PR-F** (Notes + Examiner's-tips content) → **PR-G** (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]**, **[FU-CHAPTERTEST-PAGE-REDESIGN]**. )
Previously (post-PR #274 — **Topic Hub PR-D final-IA LAYOUT MERGED** (trunk `b57fa79`): the structural/visual rebuild of `ConceptSpine` to MATCH the binding mockup `docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`. **Learn-first** (concept rows are the hero under a "Learn the N concepts" header; the topic-level action band recedes into a quiet dashed zone BELOW them); **Notes consolidation** (one unified "Notes" toggle replaces the Formula-sheet/Proofs/Practice-all tab bar — honest "coming soon"); **Examiner's tips** clickable/expandable container seeding the one real `examinerWarning`, NO fabricated tips (full set = PR-F); **action band** = "Practise this topic" (primary, routes to the existing whole-topic practice) + inert "Chapter test"/"Worksheet" ("Soon", wired in PR-E); **concept "Practise" carries concept + mark band** (`buildDesktopPracticePath` gains an optional `markBand`; `DesktopTopicHubPage` passes `concept.marks`); **per-row "Visual" badge** only where `findVisualForConcept` is non-null (honest); **MI stays sidebar chrome — none on the page body** (#270/#271 guard held). Single responsive component, pure-CSS `@media (max-width:1023px)` reflow, class-driven (no inline styles); `ConceptSpine.test.tsx` rewritten for the new contract. 4 files (`ConceptSpine.tsx` + test, `navigation.ts`, `DesktopTopicHubPage.tsx`) +515/−175; built in an **isolated git worktree**. Local gates GREEN: tsc, mojibake, scope:guard `--mode mixed`, root matrix 181/181, lazytopper ops matrix, diff-check, forbidden-file (none touched); vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Item 7 (mobile full-screen tutor toggle) SPLIT to its own PR-D.1** — owner-approved (a `TeachFlow` change, not ConceptSpine layout; unverifiable on Windows; not part of the mockup gate). **Owner LIVE-VERIFIED the layout = GOOD** then squash-merged (#274, `b57fa79`); branch + worktree cleaned up. **New follow-up [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1–2"` STRING is never consumed — `PracticePage` filters via a numeric `marksFilter` bucketed to `"1"/"23"/"5"/"4"` (`PracticePage.tsx:182`,`326-329`) and never reads `markBand` → param carried, not applied. Fix is **path-conditional** (pre-apply the band only on the concept-row entry; leave the hub path student-controlled). **Two decisions recorded this handoff (see DECISION_LOG):** **MockBuilder RETIRED** (un-routed from the live product + tagged for PR-G deletion, code kept — Mistake Intelligence now auto-captures the "hard questions to revisit" need it served manually) and **[FU-BOOKMARK-SAVE-QUESTION]** (future lightweight "save this question even if answered correctly" → surface on Me/Progress; not a launch blocker). Report: `report-topichub-prd-layout-2026-06-20.md`. **Item 7 (PR-D.1) corrected blast-radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor — `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx` are dead (PR-G deletes them); everywhere else the AI does solution-CHECKING, not tutoring. Previously (post-PR #265 + #264 — **Bank Expansion Phase 1, Batch 2 (45 net-new Exemplar Maths Qs) + vitest-infra fix MERGED** (trunk `381e9df`): two PRs landed — #264 vitest-infra (`2ef0b2c`) then #265 Batch 2 (`381e9df`). **#265 Batch 2 (THE DECOUPLE):** 45 net-new authentic Exemplar QUESTIONS + AI-GENERATED step-marked SOLUTIONS, owner-verified before merge — **Coordinate-Geometry 22 + Areas-Related-to-Circles 23** in new `coordinateGeometry.exemplar2.ts` / `areasRelatedToCircles.exemplar2.ts` (registered in `canonicalQuestionBank.ts`; `AI_GENERATED_SOLUTION_IDS` extended; **`predictionTypes.ts` NOT touched**). By section: A=9, B=16, C=17, D=3. **Syllabus exclusions at question level:** CG **Area-of-Triangle-in-Coordinate-Geometry BANNED** → 7 area items dropped (Ex7.1 Q7,18; 7.3 Q9,16,17; 7.4 Q2,4); 13 figure-locked "shaded region" items dropped (CG Ex7.1 Q15, 7.4 Q5; ARC Ex11.3 Q2,6-9,11-13,15; Ex11.4 Q6,17); 1 unrecoverable-options MCQ dropped (CG Ex7.1 Q16 — not guessed); **3 reconstructed-math items flagged `// ⚠ RECON`** (CG MCQ-003, SA-006, SA-008). Every `solutionStep` `[N mark]`-prefixed summing to marks; every `finalAnswer` cross-checked vs the official key (jeep2an.pdf). Borderline list surfaced (collinearity-via-area CG Ex7.2 Q5,Q10 / 7.3 Q19 excluded; ARC Ex11.2 Q3 + Ex11.4 Q3 included-and-flagged). Gates GREEN: tsc, per-question validator 45/45, mojibake, root matrix 181/181 (incl. syllabus guard), ops matrix, scope:guard, diff-check; CI `quality-gate` GREEN. **Codespaces vitest = NO REGRESSION** vs base `5ce504e` (18/18 executable pass; the 7 infra suite-load failures pre-existed — fixed by #264). **FULL-CORPUS FIGURE-LOCKED CENSUS (owner-requested):** 67 figure-locked exercise Qs in-scope (A=15, B=10, C=25, D=17), **42 high-mark (C+D)** = launch-critical diagram-recovery target; by chapter Triangles 18 · ARC 17 · Circles 15 · SAV 9 · PLE 3 · CG 2 · Trig 2 · Stats 1. Reports: `report-bank-expansion-batch2-2026-06-18.md` + review docs (`.md`/`.html`). **#264 [FU-VITEST-INFRA] RESOLVED** (`2ef0b2c`): added `@testing-library/dom` direct devDep (the unsatisfied `@testing-library/react` peer that pnpm-strict hid → 5 suites) + guarded `src/test/setup.ts`'s `window.matchMedia` polyfill for `// @vitest-environment node` suites (→ 2 suites); pnpm-lock.yaml regenerated in Codespaces (pnpm 10.32.1, NOT Windows). **Codespaces vitest now 11/11 suites, 63/63 tests GREEN.** `predictionTypes.ts` untouched. Owner merged both (#264 by agent on owner instruction, #265 by owner). NEXT (owner; queued, each branched fresh from `381e9df`): **Batch 3 (Triangles + Circles)** — note this batch holds the bulk of the 42 high-mark figure-locked items → the diagram-recovery question comes to a head here → Batch 4 (Trig + Pair-of-Linear-Eq) → Batch 5 (Real-Numbers + Polynomials). Carried follow-ups: [FU-EXEMPLAR-STAT-13.4], [FU-EXEMPLAR-DEFERRED-NETNEW] (CG Ex7.3 Q12,14,15 + ARC Ex11.4 Q7,9,10,11,13,19), [FU-DIAGRAM-RECOVERY] (the 42 high-mark figure-locked Qs). Previously (post-PR #262 — **Bank Expansion Phase 1, Batch 1: 60 net-new NCERT-Exemplar Maths questions + AI step-marked solutions MERGED** (trunk `444238b`): THE DECOUPLE — authentic verbatim Exemplar QUESTIONS paired with AI-GENERATED, step-marked SOLUTIONS that the owner (examiner-of-record) verified before merge. **Net-new: Arithmetic Progressions 24, Statistics 16, Surface-Areas-&-Volumes 20** in NEW `*.exemplar2.ts` files (`AP_EXEMPLAR2` / `STAT_EXEMPLAR2` / `SAV_EXEMPLAR2`), registered in `canonicalQuestionBank.ts` (import + spread; engine-visible +60 verified). **Provenance via NEW `AI_GENERATED_SOLUTION_IDS` id-set** (mirrors PR2a `_source`; the forbidden `predictionTypes.ts` is NOT touched — the gated-field STOP was deliberately avoided by tracking solution-provenance as an id-set, owner-locked decision). **solutionSource split this batch: 60 ai-generated / 0 authentic-solution.** Every `solutionStep` carries a `[N mark]` prefix summing to marks; every `finalAnswer` cross-checked vs the official Exemplar answer key (jeep2an.pdf) — but the WORKED STEPS are AI (owner-verified). **Syllabus exclusions applied at the question level:** SAV frustum (11) + conversion-of-solids (11) + Stats ogive (1) dropped as BANNED; probability out-of-scope (separate topicKey); 6 figure-locked + 1 unreconstructable (SAV Ex12.2 Q3 — flattened formula, DROPPED not guessed) excluded; **3 reconstructed-math items flagged `// ⚠ RECON`** for fidelity spot-check (all in AP). Dedup vs the full repo corpus (2,889 maths Qs) by `ncertRef` + content; borderline list surfaced for owner. **Owner verified questions + solutions ("good to go") — no self-merge; owner merged.** Local gates ALL GREEN: tsc, per-question validator 60/60 (`[N mark]` sums, section↔marks, topicKey, no dup ids, no banned subtopic), mojibake, root matrix 181/181 (incl. syllabus guard over the new files), lazytopper ops matrix, scope:guard, git diff --check. CI `quality-gate` GREEN (linux `vite build`). **Codespaces vitest: NO REGRESSION** — the PR branch and untouched base `444238b` produce IDENTICAL results (18/18 executable tests pass incl. `predictionCore.source`/`.pastboardyear`; the 7 suite-load failures are a PRE-EXISTING repo test-infra gap — missing `@testing-library/dom` + jsdom env not active — failing identically on base → NOT caused by this PR). Authority: Pass-2 net-new audit + `AGENT_bank_expansion_p1_exemplar_maths_2026-06-18.md`. Reports: `report-bank-expansion-p1-exemplar-maths-BATCH1-2026-06-18.md` + `report-bank-expansion-p1-exemplar-maths-2026-06-18.md` (Phase-A) + review docs (`review-bank-expansion-batch1-2026-06-18.md`/`.html`). 4 files; owner squash-merged `444238b`. NEXT (owner; queued, each branched fresh from `444238b`): **Batch 2 (Areas-Related-to-Circles + Coordinate-Geometry)** → Batch 3 (Triangles + Circles) → Batch 4 (Trigonometry + Pair-of-Linear-Eq) → Batch 5 (Real-Numbers + Polynomials). New follow-ups: **[FU-VITEST-INFRA]** (add `@testing-library/dom` + jsdom env so vitest suites load cleanly), **[FU-EXEMPLAR-STAT-13.4]** (Stats LA Ex 13.4 question text not extractable from jeep213.pdf — needs a clean source), **[FU-EXEMPLAR-DEFERRED-NETNEW]** (AP Ex 5.3 extras + more reasoning parts available for a later top-up); Fix B [FU-TOPICKEY-CONSOLIDATION] migration scope now includes these new rows.)
Previously (post-PR #259 — **AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock MERGED** (trunk `775ee75`): the ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` (authentic 1.0 / predicted 0.6 / ai 0.3) only applied inside `getLikelyQuestionsForConcept` (Quick Practice / topic practice); the mock engines route through `getAllQuestions()` + their OWN selection and still drew AI at full parity. **Extended the SAME soft demotion (reused PR2a's ONE multiplier — exported `getSourceMultiplier`, no fork) to both mock surfaces.** **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` now does `predWeight *= getSourceMultiplier(q)` per section/marks slot; new `sourceWeightedPick` makes the guaranteed-archetype prefill authentic-first (was uniform-random); `weightedSelect` exported for the test. **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot. **⚠️ Boundary correction (load-bearing):** the instruction assumed **HPQ** also uses `getAllQuestions()` + serves AI at parity — **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank (`ple-hpq-*`, `sci-he-hpq-*`, `rn-comp-*`); it never calls `getAllQuestions()` and contains ZERO AI-pack content (`hpqCompetencyAdditions` curated too) — nothing to demote (×1.0 everywhere). Left **untouched** (no cosmetic no-op), mirroring PR2b's boundary-correction precedent. **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock + Topic Mock (this PR); HPQ was already AI-free.** **Structure-preserving + count integrity:** demotion operates WITHIN each already-constrained section/marks pool, never globally; soft (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) → an authentic-thin slot still fills with AI, no slot left empty; blueprint loop / section counts / pools unchanged — only WHICH question fills each slot changed; zero question added/removed; repair passes (`repairArchetypes`/`repairStreamBalance`) left as-is (rare hard-constraint satisfiers). **New follow-up — [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity but were out of named scope + the authorized file list → flagged for a future owner-authorized PR (NOT touched). Added `mockEngineSource.test.ts` — **Codespaces vitest 7/7 PASS** on `ba2f619` (per-slot authentic preference + soft AI fallback for both engines; CI quality-gate does NOT run vitest). Authority: PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/−11; squash `775ee75`. CI `quality-gate` GREEN (1m17s incl. linux `vite build`; root matrix 181/181). Local gates green; no forbidden files (`predictionTypes.ts` untouched). **No self-merge; owner squash-merged; branch deleted (local + remote).** NEXT (owner; queued): **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items; **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).)
Previously (post-PR #257 — **AI-tier PR2b strip fabricated `pastBoardYear` MERGED** (trunk `d6e0e14`): anti-fabrication — predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference (authentic PYQs use the traceable `pyqYear`, 759 values; the authentic `questionBanks/**` tree has ZERO `pastBoardYear`). **⚠️ Boundary was wrong — the instruction assumed 75 values / 2 files; exhaustive repo-wide enumeration (owner-mandated before stripping) found 96 values / 5 files** (an undercount of 21): `predictedQuestions.ts` 55, `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**), `class10SciencePredictiveEngine.ts` 12, `highlyProbableQuestions.ts` 8 (student-facing HPQ), `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Owner authorized **Option A** = strip all 96 + clean every consumer. **Consumer cleanup — all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker → **score-only** (the `pastBoardYear` clause was always-false post-strip); `predictionCore`+`mockPaperEngineScience` `sourceYearHint` → `targetYear-1`; `predictionCore` converters + `predictionScoring` + `paperEngine` + `hpqConfidence` → dropped the dead `pastBoardYear` 5-signal-input field. **KEY FINDING — HPQ confidence does NOT shift (dead plumbing):** the 5-signal scorer (`cbse5SignalScoring`) and Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read `input.pastBoardYear`/`sourceYearHint` — so stripping it changes ONLY the dedup tiebreaker; HPQ/mock confidence numbers are unchanged (proven by unit test #4). **`predictionTypes.ts` (forbidden) NOT touched** — optional field stays declared, all values removed; nothing invented to replace stripped data. **Count integrity:** field-removal only — served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 · ai 2,764 · predicted 241}; `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged. Added `predictionCore.pastboardyear.test.ts` — **Codespaces vitest 9/9 PASS** (5 PR2b + 4 PR2a regression): score-only dedup, 5-signal independence from `pastBoardYear`, served-bank zero-`pastBoardYear` guard. Authority: `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`. 11 files +113/−106; squash `d6e0e14`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181). Note: `hpq_phase2_acceptance` (ops, NOT a CI gate) can't run in Codespaces — pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk; my change there is one clean fixture-line removal). **No self-merge; owner squash-merged.** NEXT (owner; queued): **[FU-AITIER-RANK-MOCKS-HPQ]** (apply the `sourceMultiplier` demotion to Full Mock / Topic Mock / HPQ, which use `getAllQuestions()` + own selection); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items.)
Previously (post-PR #255 — **AI-tier PR2a source-provenance stamp + soft AI-lower ranking MERGED** (trunk `686f737`): the ARCHITECTURAL fix the audit flagged — AI-lower ranking was never enforced (`getAdjustedScore` had no source term; the file/suffix tier marker was destroyed at the bank concatenation, leaving ~41% AI at full parity). **Change 1 (additive, `canonicalQuestionBank.ts`):** capture AI-pack ids at ingest where the source file is still known — `AI_GENERATED_QUESTION_IDS` from the **54 `.pack[1-3]` source arrays**; the bank array is untouched (zero reorder/adds/deletes). **Change 2 (`predictionCore.ts`):** `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the LOCAL `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT touched — same pattern as `_adjustedScore`); stamp at the merge (predicted converters → `"predicted"`; canonical classified by the AI-pack id set; `dedupeById` made generic so `_source` survives); `getAdjustedScore` gains `* getSourceMultiplier`. **Multipliers (owner-locked): authentic `1.0` / predicted `0.6` / ai-generated `0.3` — SOFT, never zero** (AI still surfaces when authentic is thin; tunable in one `SOURCE_MULTIPLIER` const). **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): Quick Practice / topic practice (`practiceSetGenerator.generatePracticeSet`, `predictionDataService`). **Surfaces NOT yet covered → [FU-AITIER-RANK-MOCKS-HPQ]:** Full Mock (`unlimitedPaperEngine`), Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`) use `getAllQuestions()` + their own selection — same `sourceMultiplier` needed there in a later PR. **Count integrity:** additive only — exact live split (Codespaces): **total 6,715 = authentic 3,710 (55.3%) + ai-generated 2,764 (41.2%) + predicted 241 (3.6%), 0 unstamped** (authentic is **790 short** of the 4,500 retirement threshold). Added `predictionCore.source.test.ts` — **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so strong ai still surfaces; tier order; live-pool drift guard). **✅ Owner-requested live-verify = PASS** (functional, real `getLikelyQuestionsForConcept` on trunk `686f737`): on ~50%-AI topics the first AI question lands at index ~100–186, so a 10-question Quick Practice serves ALL authentic — Real Numbers (49% AI) first-AI @#97, Triangles (52%) @#127, Trigonometry (53%) @#186; Light/Electricity (30%) @#239/#217. Before PR2a, AI interleaved at parity. **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic → [FU-CURATED-26-PROVENANCE]** (owner-logged). Authority: `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`. 3 files +265/−9; squash `686f737`. CI `quality-gate` GREEN (1m11s incl. linux `vite build`; root matrix 181/181). vitest runs in Codespaces, NOT the quality-gate — verified there separately. **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2b** (`pastBoardYear` strip — now unblocked: this stamp distinguishes verifiable PYQ years from fabricated predicted-layer ones); then **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #253 — **AI-tier PR1b pack-file 5-mark retags MERGED** (trunk `f83915b`): the relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. **Group A — 12 genuine 5-mark long-answers** relabelled `format:"Short"→"Long"` (label-only; each confirmed by reading its `questionText`): `ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046, HEC2-039, LT2-016/024, ME2-025, REP2-048`. **⚠️ Safeguard fired — `PR2-018` reclassified:** the instruction's 13th Group-A id ("3 red, 4 green, 5 blue → P(not blue)") is a single-step `7/12` one-liner, NOT a long-answer → **moved to Group B (quarantine), not relabelled** (relabelling would worsen it). So Group A = **12** (not 13). **Group B — 7 QUARANTINED** (content↔marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled — fixing them is a marks/content pass, not a label flip): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018` → logged **[FU-AITIER-MARKS-MISMATCH]**, kept pinned in `PACK_5MK_SHORT_BACKLOG` (now annotated) so the guard tracks them with no regression. **Backlog 19 → 7.** Count UNCHANGED (pure label edits; symmetric per-file diffs). **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half done; the residual 7 carry forward as the marks-mismatch follow-up). Authority: report-aitier-pr1-mechanical-2026-06-17.md + cofounder Group-A/B classification → AGENT_aitier_pr1b_pack_retags_2026-06-17.md. Report: report-aitier-pr1b-pack-retags-2026-06-18.md. 9 files +34/−19; squash `f83915b`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181 with backlog now 7). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) → carried doctrine below; plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #251 — **AI-tier PR1 mechanical content-integrity MERGED** (trunk `f4a41b6`): the first remediation from the read-only AI-tier audit. (1) Added `"Long"` to `QuestionKind` in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (NOT the forbidden `predictionTypes.ts`; no exhaustive-switch break) and mapped `kind:"long"→format:"Long"` in `predictionCore.toCanonicalFormat` so the retag actually propagates to the unified bank. (2) Retagged **24** five-mark Section-D predicted items `kind:"Short"→"Long"` (12 maths + 12 science). (3) **Split fused Q10** (`2026-RN-LA-03`, the alarm-clock-LCM + prove-√5 weld with the 5-mark/Section-D/Short tags) into `2026-RN-SA-08` (LCM, Section C/3mk) + `2026-RN-SA-09` (√5 proof, Section C/3mk) — **net +1**, the only intended count change; `pastBoardYear` omitted on the new items (no fabricated provenance). (4) Added `scripts/src/aiTierContentIntegrityGuard.test.ts` to the root `test:matrix:all` (**175→181**) — fails on fused (`also prove`), section↔marks mismatch, and 5-mark "Short". **[FU-MALFORMED-QUESTION] RESOLVED** (Q10 de-fused + guard locks the class). **⚠️ Flagged discovery — the audit undercounted:** the SAME defect exists in **19 more** `.pack2/.pack3` questions (they use `format:"Short"`); `.pack` files are gated + out of this PR's scope, so they are pinned as a shrink-only backlog (`PACK_5MK_SHORT_BACKLOG`) → **[FU-AITIER-PACK-5MK-SHORT]** for **PR1b** (owner-authorized, separate; retag ONLY genuine LA, QUARANTINE content↔marks mismatches like TG3-056/REP2-039 for a content pass). Authority: report-ai-tier-audit-2026-06-17.md → AGENT_aitier_pr1_mechanical_2026-06-17.md. Report: report-aitier-pr1-mechanical-2026-06-17.md. 5 files +237/−41; squash `f4a41b6`. CI `quality-gate` GREEN (1m12s incl. linux `vite build`). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR1b** (the 19-pack retag/quarantine) → **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) → carried doctrine below.)
Previously (post-PR #249 — **"Finish session" scorecard trigger MERGED** (trunk `704dcff`): replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button (always-available at the set foot, both desktop + mobile widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the scorecard. `allDone` retained as a convenience auto-offer (`showScorecard = (sessionFinished || allDone) && questions.length > 0`). Reuses the EXISTING `sessionStats` — no new counters, no persistence, no session-lifecycle state machine. **Partial-session honesty** (the load-bearing requirement): attempted-only denominators + explicit "the M you didn't reach aren't counted" line + an honest zero-attempt state; unattempted questions are NEVER counted against the student. "Keep practicing this set" escape hatch on a manual partial finish. 2 files (`pages/PracticePage.tsx` +62/−2, `services/uxTelemetry.ts` +1); commit `b740a3f`. CI `quality-gate` GREEN (1m8s — incl. the linux `vite build`). **✅ Owner live-verify = PASS — partial-session honesty PROVEN:** a 3-of-10 finish reads "3 of 10 attempted · 0/3 MCQs correct · 0% accuracy · Here's how those 3 went, the 7 you didn't reach aren't counted"; the zero-attempt case reads honestly too. **Supersedes #240 sub-task 5's `allDone`-only trigger.** NEW follow-up logged for the next (read-only) audit: **[FU-MALFORMED-QUESTION]** — a live-observed malformed question (Real Numbers Quick Practice Q10 fused two questions: alarm-clock LCM + prove √5, with inconsistent 5-mark / Section-D / Short tags), suspected AI-generated pack origin. NEXT (owner; queued, NOT yet authorized): a **read-only AI-generated-question-tier audit** (its own instruction, branched fresh against `704dcff`) → then (iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]; then (2) MI eval ([MI-EVAL]) → (3) Stage 3 ([FU-DRILL-ENRICHMENT]) → Fix B [FU-TOPICKEY-CONSOLIDATION] when authorized. PRE-LAUNCH gate: [FU-DETECTION-META-LAUNCH-FLIP].)
Previously (post-PR #246 — **Check & Improve detect-then-confirm MERGED** (trunk `c9404e1`): builds on Claim 2 (#244). Detection is now VISIBLE + CORRECTABLE before grading. New flow on both surfaces: question input by type/paste/**photo of the question** (distinct slot from the answer photo) → **"Read the question →"** fires a detection-ONLY call (`POST /api/detect-question`, the cheaper call) on the question alone → a **confirmation chip** shows detected subject·topic·marks (+ source) with a quiet **[Change]** affordance → constrained correction (topic→canonical key via Fix A's resolver, marks 1–6, subject toggle; corrected mark flagged `marksSource:"user"`) → grade runs on the CONFIRMED values via the unchanged trusted-marks path (the grader `handleCheckSolution` is byte-identical). Override logged on the attempt record (`marksSource`+`detectionOverride`; reuses recordAttempt persistence — no new collection / no firestore.rules change). **`SHOW_DETECTION_META` flag (shared helper) default=ON for owner testing; ⚠️ MUST flip to OFF before student launch — see [FU-DETECTION-META-LAUNCH-FLIP], the tester-vs-student line.** Bank-grounding deferred behind Fix B. CI GREEN. **Owner live-verify of #246 = PASS 5/6** (printed marks read correctly; inference genuine + graduated — AP=2 vs proof=3 diverge; topics bucket clean; selectors gone both widths). The 6th: **[FU-DETECTION-MARKS-CEILING]** — inference under-calls true 5-mark questions (multi-part numerical + proofs) as 3; caught-and-correctable via [Change], NOT a blocker. NEXT (owner; queued, NOT yet authorized): **(ii) "Finish session" scorecard-trigger PR** → **(iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]**; then **(2) MI eval** ([MI-EVAL]) → **(3) Stage 3** ([FU-DRILL-ENRICHMENT]) → **Fix B [FU-TOPICKEY-CONSOLIDATION]** when authorized. PRE-LAUNCH gate: **[FU-DETECTION-META-LAUNCH-FLIP]**. Carried: [FU-SPELLING-GATED-REMAINDER] + [FU-TOPICKEY-CONSOLIDATION] + [FU-DETECTION-META-LAUNCH-FLIP] + [FU-DETECTION-MARKS-CEILING] + [FU-IMPROVEMENT-CARD] + [FU-WEAKAREA-ALIAS-DISPLAY] + [FU-ATTEMPT-MARKS-ACCURACY] + [FU-ATTEMPT-SR] + [FU-ME-REFRESH] + [FU-GRADE-MARKSCALE]/[FU-GRADE-CONSISTENCY]/[MI-EVAL]; owner+cofounder close [TRACK-B-GATE]; RESP-DIV-2)
Previously (post-PR #244 — **Check & Improve auto-detect MERGED** (trunk `43ffa09`): the grader determines marks/subject/topic from the question itself (Claim 2, option (a)); the student-picked selectors are GONE on both surfaces. Isolated behind a `detectMarks` flag so Quick Practice is byte-identical. Printed marks preferred → inferred → flagged `fallback`; topic constrained to the canonical vocab + re-canonicalised via Fix A's resolver. CI GREEN. Owner live-verify of #244 PENDING.)
Previously (post-PR #242 — **topicKey Fix A MERGED** (trunk `77f2ed2`): the Me weak-area row now resolves stored topic labels through the strong serving-side resolver (`desktopTopicForWeakAreaKey`) + 13 `topics.ts` aliases; the 13 in-bank spellings that fell to `/exam-trends` now route to Quick Practice. Read-time only. CI GREEN. **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED.** Preceded by the read-only topicKey-duplication audit. **Fix B [FU-TOPICKEY-CONSOLIDATION] HELD / authorized-later.** Owner live-verify of #242 PENDING.)


## ⏳ WORKSHEET PR-A: GRADE-RESULTS REDESIGN (#295, trunk `1a85186`) — MERGED + CI GREEN · ⚠ OWNER LIVE-VERIFY PENDING
PRESENTATION ONLY — the worksheet grade UI rebuilt to the LOCKED redesign spec (`LazyTopper_Worksheet_Grade_Redesign_Spec_LOCKED_2026-06-24.md`), on top of the E2b grade loop. Built in an **isolated worktree** (`feat/worksheet-grade-redesign-pra`), opened as a draft, cofounder-reviewed clean, owner-merged. Report: `report-pr-a-worksheet-grade-redesign-2026-06-24.md`. 6 files +1003/−20.
- **THE HARD INVARIANT HELD** — `server/routes/checkSolution.cjs` / the grader is **BYTE-UNCHANGED (absent from the PR diff)**. PR-A reorganises how the EXISTING grade output is presented; it never re-grades.
- **Auto scorecard popup** (NEW `WorksheetScorecard.tsx`) — appears the moment `response.ok` resolves (the Quick-Practice session-scorecard auto-appear pattern, as the LOCKED navy overlay). Responsive at 1024px: **desktop centered modal ↔ mobile bottom sheet** (grab handle), pure-CSS reflow. Name + code header; big Fraunces `gradedMarksAwarded/gradedMarksTotal`; amber pending strip; **four-type breakdown** from `results.filter(!couldNotRead)[].mistakeSummary` → Knowledge gaps (conceptual+calculation) / Careless (silly+presentation, "not weak topics"); Read (ghost) + Download (primary) footer (✕/Read/Download all close); **all-pending → both buttons DISABLED**.
- **Tap-to-reveal sheet** (`WorksheetGradePanel.tsx`) — the always-open dump → collapsible per-section expanders (first open); Download (PDF) + Practise action row; View-scorecard re-open.
- **Branded graded PDF** (NEW `WorksheetGradedPrintDoc.tsx` + `exportGradedWorksheetPdf`) — reuses the EXISTING `worksheetPdfExport.ts` `html2canvas → jsPDF` + KaTeX path; the render→paginate→save core was factored into a shared `renderElementToPdf` so `exportWorksheetPdf` is behaviour-identical (cofounder-verified non-regressive). Renders the SAME response (no second grade call); pending stays "couldn't read — not graded, not scored 0"; coaching footer; "Marks shown match your on-screen result."
- **Summary-leak fix** (display-only) — `isLeakySummary` suppresses model meta/refusal prose, esp. all-`couldNotRead`. Grader + response shape untouched.
- **Nomenclature** — `worksheetNomenclature` (`worksheetModel.ts`) builds `WS-{S}-{TOPIC}-{NN}` + `{Topic} · Worksheet {N}` (MIX/FULL); `#NN` = device-local count via `listStoredWorksheetsLite` (`worksheetSessionStore.ts`). On scorecard + sheet + PDF. (PR-B makes it durable.)
- **Gates:** tsc · mojibake 0 · scope:guard product · ops matrix · root matrix **181/181** · diff-check clean — ALL GREEN. **CI `quality-gate` GREEN (1m17s, incl. linux build).** `checkSolution.cjs` diff EMPTY; no forbidden files. **No self-merge; owner marked ready + squash-merged.**
- **⚠ OWNER LIVE-VERIFY = PENDING** (UI/PDF round-trip — static gates can't prove it): scorecard auto-pops (desktop modal + mobile bottom sheet); four-type correct; ✕/Read/Download close; Read reveals the tap-to-reveal sheet; Download → branded PDF whose marks/pending match the screen; all-pending disables both; name/code everywhere; Check & Improve still grades.
- **NEXT:** owner live-verify of #295 → **PR-B** (durable per-student worksheet record: Firestore-by-UID nomenclature + seen-set question-uniqueness + Me/Progress journey + scorecard persistence + parent/teacher storage foundation with §B6 wellbeing-framing + minor-consent constraints).

## ⏳ WORKSHEET PR-E2b: ONE-PDF AI GRADE LOOP + MI WIRING (#291, trunk `60c5bf9`) — MERGED + CI GREEN · ⚠ OWNER LIVE-VERIFY PENDING
The SECOND half of the worksheet (E2a foundation merged). Built in an **isolated worktree** (`feat/worksheet-grade-loop`), rebased onto trunk `2cab012` (post-Z3) with ZERO conflicts. **Full architecture + the mandatory live-verify checklist live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** — this is the summary. Report: `report-pr-e2b-worksheet-grade-loop-2026-06-23.md`. 9 files +1201/−10.
- **One PDF, ONE structured call** — student uploads ONE PDF of all answers (labelled Q1, Q2 …); graded against the worksheet's KNOWN scheme keyed Q1…QN, matched BY NUMBER (the questions PDF already prints the label instruction), never blind-segmented.
- **Server additive (live backend):** `server/routes/checkSolution.cjs` gained a surface-AGNOSTIC `gradeStructuredSet` core + `handleGradeWorksheet` + stub + per-question normaliser. **`handleCheckSolution`/`handleDetectQuestion` BYTE-UNCHANGED** (only the return-object line extended) → zero regression to the live Check & Improve grader (the PR's biggest risk). `questions.cjs` + `index.cjs` register `POST /api/grade-worksheet` (+OPTIONS/CORS). `readJson` 8 MB cap on THIS route only.
- **Honest-failure (anti-fabrication):** per-question `couldNotRead` — illegible/absent answers are NEVER given a fabricated mark and NEVER folded into a 0; an omitted question is pending, not zeroed. **Trusted marks** — per-question `totalMarks` = scheme `q.marks`; model awards within it; additive-floor `mistakeSummary` reconcile mirrors the wired path.
- **Client additive:** `aiClient.gradeWorksheet()` + types; `worksheetSessionStore` `save/getWorksheetGrade`; NEW `worksheetGradeService.ts` (testable seam — map-by-number, persist, fan each LEGIBLE result through the SINGLE MI front door `recordMistake` + score-twin `recordAttempt` with a STABLE `ws:<id>:q<N>` id → re-upload dedups via the front door's existing layer, NO parallel idempotency; grade core takes its question set as a PARAMETER → Chapter Test / Full Mock reuse). NEW `WorksheetGradePanel.tsx` (upload UI, sync progress, per-question results, **honest "graded X/Y + N pending" totals SEPARATE from the worksheet total**, MI evidence line) wired into `WorksheetGenerator.tsx`. NEW `worksheetGradeService.test.ts` (Codespaces/doc-only).
- **`recordAttempt` reconciliation:** the task doc said it didn't exist yet; on trunk it DOES + the worksheet handoff §4 calls for it → both `recordMistake` and `recordAttempt` wired (mirrors `SolutionChecker`); no `[FU-SCORECARD]`.
- **Forward-compat (shaping only — Chapter Test / Full Mock NOT built):** grade core is surface-agnostic; `RecordMistakeContext` left unchanged (the future optional `source` field is a later deliberate MI-engine change).
- **Gates:** tsc · mojibake 0 · scope:guard product · lazytopper ops matrix · root matrix **181/181** · `node --check` ×3 `.cjs` · diff-check clean — ALL GREEN pre- and post-rebase. **CI `quality-gate` GREEN (1m16s, incl. linux build).** No forbidden files; MI routing internals only CALLED. Cofounder review clean. **No self-merge; owner merged.**
- **⚠ OWNER LIVE-VERIFY = PENDING** (AI round-trip — static gates can't prove it). On the Firebase-authorized trunk URL, START SMALL (5-Q): right-question mapping + sensible marks; illegible page → honest "couldn't read Qn" + graded X/Y + N pending (not deflated); feeds Me/Progress + unlocks MI-enrich toggle; careless vs knowledge-gap route correctly; **Check & Improve still grades + feeds MI**; re-upload no double-count; phone end-to-end.
- **NEXT:** owner live-verify of #291 → worksheet (E2a+E2b) COMPLETE → PR-F (Notes + Examiner's-tips content) → PR-G (deletions). Carried worksheet follow-ups: [FU-ASYNC-GRADING], [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].

## ✅ WORKSHEET REBUILD — PR-E2a → E2a.3 (#280 `d065922`, #283 `9a080a0`, #284 `cfff277`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
The worksheet **foundation** (Topic Hub PR-E2). **Full detail, architecture, PR-E2b plan and gotchas live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** — this is the summary.
- **#280 PR-E2a** — ONE responsive `WorksheetGenerator` (`components/worksheet/`, build→generated in-place) replacing the desktop (`DesktopWorksheetsPage`) + mobile (`app/Worksheets`) twins (UN-ROUTED, kept for PR-G). Distribution fix (`worksheetModel.ts`): multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI-enrich ×1.5 re-weight, largest-remainder **capped at real availability → honest counts** (shown == generated). Deleted-topics filter (`heredity-and-evolution`, `magnetic-effects`). Two PDFs. Persist-by-`worksheetId` (`services/worksheetSessionStore.ts`).
- **#283 PR-E2a.1+.2** — math made REAL via existing `MathText`/KaTeX (E2a jsPDF-ASCII had stripped √→"sqrt"); `window.print()` (printed whole page + clipped) REPLACED with a real client-side PDF FILE download (Option B — `WorksheetPrintDoc` → detached offscreen host → html2canvas → jsPDF, paginated, clean isolation). Count identity locked. No new deps.
- **#284 PR-E2a.3** — view-aware Back (generated→builder; build→`returnTo`); MI-enrich relocated into the RIGHT preview AFTER the snapshot as the page's single **NAVY anchor** (`hsl(220,25%,12%)`) with three honest states (signed-out→`/login?...&redirect=<here>` CTA / in-scope hotspot→toggle / signed-in-no-hotspot→how-to-unlock note); "hanging box" root cause = the global `input{width:100%;appearance:none}` (styles.css:265) ballooning a bare checkbox (hard-scoped). **Missing-symbol = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality Qs with √/expressions stripped from `questionText`; list + paper refs in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md` → parallel symbol-fix agent (all subjects; recover from twin/source, never invent).
- **Gates** (each PR): tsc · root matrix 181/181 · ops matrix · mojibake · scope:guard product · diff-check · **CI quality-gate GREEN incl. linux build**. vitest is Codespaces-only (not a CI gate). **Owner Vercel-verified each + merged; no self-merge.**
- **NEXT: PR-E2b** — the AI grade loop (extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN via `getWorksheetSession`; wire `recordMistake` through the MI front door → worksheets feed Me/Progress + unlock the MI toggle; **mandatory 5-Q live-verify**). New follow-ups: **[FU-PITFALL-DATA]**, **[FU-WORKSHEET-PDF-SERVERSIDE]**, **PYQ √-data audit** (all subjects). Then PR-F (Notes/Examiner's-tips content), PR-G (delete dead twins + retired set).

## ✅ TOPIC HUB PR-E1: PRACTISE-FILTER + CHAPTER-TEST WIRING + MOCKBUILDER UN-ROUTE (#276, trunk `1de6f3e`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL wiring — the PR-E stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, off `acc419b`). Landed as **3 commits squashed to `1de6f3e`** (one implementation + two owner-found live-verify round-trips). Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`.
- **Concept-row "Practise" → Quick Practice DIRECT** — `buildDesktopConceptPracticePath` routes to `/practice/:grade/:subject` (was the generic `/practice-hub`, the 2-click bug). The hub builder `buildDesktopPracticePath` is untouched (other entry points rely on it).
- **Exact mark-band filtering (Option A)** — the first cut used the page's `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark into one `"23"` bucket (`PracticePage.tsx:53`) → "3–5" leaked 2-mark, "2–3" couldn't isolate 3-mark (owner-caught). Final: the concept route emits EXACT `marksMin`/`marksMax` (`parseMarkBandRange`); `PracticePage` filters by `Number(q.marks) ∈ [min,max]` (`parseMarksRangeParams`). "3–5" → only 3/4/5; "2–3" → real 2 and 3. Dead `markBandToBuckets`/`marksBucketsToParam` REMOVED (caller-checked).
- **Single-pool count fix** — the "N available" hint and the displayed set came from two independent `generatePracticeSet` draws → hint promised 10, display held 5–6 on a healthy bank (the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Unified behind `questionMatchesFilters` + `selectInRangeFromPool(pool,…,committedCount)→{available,displayed}`; both read the SAME realized pool → `available >= displayed.length` always; honest thin-bank case preserved (real smaller number, no padding).
- **PATH-CONDITIONAL** — exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none → stays "All"/student-controlled, bucket UI unchanged. The band is a CHANGEABLE starting filter (widen/clear).
- **Back-nav** — concept-row Quick Practice passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was a generic "Exam Trends" default).
- **Applied-filter indicator** — light "Practising {Concept} · {min}–{max} marks · edit filters to change" band, concept-row entry ONLY (URL-range-gated; never on the hub path).
- **Chapter-test button WIRED** — PR-D's inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`. Page already built (real gen→score→persist); NOT redesigned here → **[FU-CHAPTERTEST-PAGE-REDESIGN]** (old-design page, wiring works).
- **MockBuilder UN-ROUTED** — both `/mock-builder` routes redirect to `/practice-hub` (over bare deletion, so inbound links — DesktopHome/HPQ/StudyPlan/Practice-Paper card — don't 404), lazy import + palette dispatch repointed, tagged `PR-G-deletion-pending`; file KEPT (PR-G deletes the legacy set). ONLY `App.tsx` touch (owner-flagged). **DECISION_LOG MockBuilder-retired now executed.**
- **Worksheet** stays inert "Soon" → **PR-E2** (its own locked spec).
- **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.**
- **Files:** `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched.
- **Gates:** tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard `--mode product` PASS · `git diff --check` clean · forbidden-file PASS. vitest + linux `vite build` → **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED + squash-merged.**
- **✅ Owner LIVE-VERIFY = PASS:** concept-row "3–5" shows zero 2-mark and the count/display agree; "2–3" shows real 3-mark; hub entry still "All"; Back returns to the specific topic; Chapter-test opens; MockBuilder unreachable.
- **NEXT:** PR-E2 (Worksheet) → PR-F (Notes + Examiner's-tips content) → PR-G (deletions). Separately: PR-D.1, [FU-CONTEXTUAL-TUTOR-REBUILD], [FU-CHAPTERTEST-PAGE-REDESIGN].

## ✅ TOPIC HUB PR-D: FINAL-IA LAYOUT (#274, trunk `b57fa79`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
STRUCTURAL/VISUAL — rebuilt `ConceptSpine` to MATCH the binding mockup (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`). Built in an **isolated git worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prd-layout-2026-06-20.md`. 4 files +515/−175; squash `b57fa79`.
- **Learn-first** — concept rows are the HERO under a **"Learn the N concepts"** header ("teach yourself first, then practise each"). The topic-level action band moves BELOW them and recedes into a quiet **dashed** zone ("When you're ready — practise or test the whole topic").
- **Notes consolidation** — one unified **Notes** toggle replaces the old `Formula sheet · Proofs · Practice all` tab bar (formulae + proofs + mind-map are sections of one Notes view). Honest "coming soon"; the "Practice all" function is absorbed by the band's "Practise this topic". Content = PR-F.
- **Examiner's tips** — clickable/expandable `★ Examiner's tips` CONTAINER (`aria-expanded`). Seeds the one real `examinerWarning` as a preview tip on seeded topics; honest "coming soon" for the rest. **NO fabrication** — the mockup's 4 sample tips were mockup-only, NOT copied; sample-preview placeholders are never shown as real tips. Per-topic tip content = PR-F.
- **Action band (3 buttons, correct hierarchy)** — `Practise this topic` (primary, solid green, routes to the existing whole-topic practice = old "Practice all") + `Chapter test` / `Worksheet` (secondary, present-but-inert `aria-disabled` with an honest "Soon" tag) pending their PR-E wiring.
- **Concept "Practise" → concept + mark band** — `buildDesktopPracticePath` gained an optional `markBand` param; `DesktopTopicHubPage` now passes `focus: concept.name` + `subtopicHint` + `markBand: concept.marks`. The route CARRIES both; consumption is [FU-PRACTISE-CONCEPT-FILTER] (PR-E).
- **Two-Practise differentiation** — topic-level = full "Practise this topic", solid primary, in the band; concept-level = short "Practise", green-tint secondary, in each card. Visually + structurally distinct.
- **Per-row visual badge (honest)** — `✦ Visual` shown ONLY where `findVisualForConcept(subject, slug, [concept.name])` is non-null (the same resolver the tutor uses; PR-C hardened it to return null not a wrong `concepts[0]`).
- **MI guard** — NO Mistake Intel on the page body; MI stays navy-sidebar chrome (#270/#271 rule held).
- **Responsive + grammar** — one responsive component, pure-CSS `@media (max-width:1023px)` reflow, 360px-safe, class-driven (no inline styles). `ConceptSpine.test.tsx` rewritten for the new contract (Notes single-toggle; Examiner's-tips expandable; 3-button band; concept+markBand filter; per-row badge dynamic; byte-identical desktop/mobile CSS).
- **Gates:** tsc PASS · mojibake PASS · scope:guard `--mode mixed` PASS · root matrix **181/181** · ops matrix PASS · diff-check clean · forbidden-file PASS (none touched). vitest + linux `vite build` are linux-only → **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED the layout = GOOD; owner squash-merged; branch + worktree cleaned up.**
- **⚠️ Item 7 SPLIT to PR-D.1 (owner-approved):** mobile full-screen toggle for the tutor interactive is a `TeachFlow` render change (not ConceptSpine layout), unverifiable on Windows (vite/vitest linux-pinned), and not part of the mockup gate. **Corrected blast radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor — the old multi-tutor surfaces (`TutorDrawerV2`, `MentorPanel`, `pages/TopicHub.tsx`) are dead code (PR-G deletes them). PR-D.1 spec: desktop side-by-side ↔ mobile full-screen TOGGLE, same component + same data, the toggle being the 360px-forced variation.
- **NEW [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1–2"` STRING is never consumed (`PracticePage` filters on a numeric `marksFilter` bucketed `"1"/"23"/"5"/"4"` — `PracticePage.tsx:182`,`326-329`; `markBand` never read). Owner-verified on Trigonometry + Light. PR-E fix: route to quick-practice directly + translate the band string → bucket-set (`1–2`→{1,23}, `3–5`→{23,5}, …), **path-conditional** (band pre-applied only on the concept-row entry; the Practice-hub entry stays student-controlled).
- **NEXT:** PR-E (chapter-test + worksheet wiring + [FU-PRACTISE-CONCEPT-FILTER]) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: PR-D.1 (mobile tutor toggle), [FU-CONTEXTUAL-TUTOR-REBUILD].

## ✅ TOPIC HUB PR-C: CONCEPT TUTOR "TEACH ME" FLOW (#272, trunk `d9ba545`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL — the cohesive concept-tutor FLOW wired on BOTH platforms; built in an isolated git worktree ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prc-tutor-2026-06-19.md`. 4 files +160/−28; squash `d9ba545`.
- **"Teach me" LIVE on the spine** (`components/topichub/ConceptSpine.tsx`): inert "Learn this" → **"Teach me"** opening the EXISTING `ConceptTeachDrawer` → `TeachFlow` → `/api/mentor` `concept_teach`. Spine owns drawer open/close state + passes the clicked concept's `{topicKey:slug, subject, concept:name, questionText:""}`, mounted fresh per concept. **One responsive mount = both platforms** (spine renders at all widths via `DesktopTopicHubPage.tsx:218`). Dead `TutorDrawerV2`/`MentorPanel` untouched.
- **`findVisualForConcept` wrong-visual fix** (`data/visualConceptRegistry.ts`, GATED `src/data`, owner-authorized for THIS fix only): empty terms + below-confidence (`score<=3`) → **`null`** not `concepts[0]`. Threshold mirrors the sibling resolver; correct-match path unchanged. Anti-fabrication: no visual beats the wrong visual. Shared resolver also corrects `TeachFlow`/`TutorMessageRenderer`/`DiagramBlock`.
- **Earned-reveal client support** (`components/tutor/TeachFlow.tsx`, scoped to `concept_teach`): no eager auto-open on mount (teach-first); `sendMessage` honours a server-pushed visual on follow-up turns (mirrors `startLearning`). `learn_teach` unchanged. Side-by-side(desktop)/stacked(mobile) split already existed.
- **Tests** (`ConceptSpine.test.tsx`): "Teach me" opens the drawer (vi.mock'd); findVisual null-not-wrong cases. **Gates:** tsc · mojibake · root matrix **181/181** · ops matrix · scope:guard `--mode mixed` · diff-check — all PASS. **CI `quality-gate` GREEN** (linux `vite build`); vitest in Codespaces (not the quality-gate). No forbidden files beyond the authorized `visualConceptRegistry.ts`. **No self-merge; owner live-verified + squash-merged; branch deleted (local+remote); worktree removed.**
- **✅ Owner LIVE-VERIFY = PASS:** "Teach me" opens the tutor on both platforms; findVisual returns null not a wrong visual; earned-reveal client support in.
- **⚠️ NEW [FU-CONTEXTUAL-TUTOR-REBUILD] (NOT a PR-C defect):** the tutor's CONTENT behaviour (scripted "Ravi Sir / Step N of 5"; doesn't respond contextually to student input) is a **pre-existing `/api/mentor` `concept_teach` engine** issue PR-C correctly wired into but was never scoped to rebuild → separate upcoming workstream (contextual-tutor rebuild).
- **Deferred to PR-D (flagged):** mobile shows the visual **stacked**, not a full-screen **toggle**; per-row visual badge rendering.
- **NEXT:** PR-D (Topic Hub layout / action-band / Examiner's tips / Notes-consolidation), fresh worktree, vs the FINAL IA (#268).

## ✅ DOCS(DESIGN): FINAL TOPIC HUB IA COMMITTED (#268, trunk `a280685`) — MERGED + CI GREEN
DOCS-ONLY. Records the owner-approved **FINAL Topic Hub information architecture** as the in-repo binding reference for the
Learn-Flow rebuild (PR-C onward). **Supersedes the previously committed locked spec (#261).** Built in an **isolated git
worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-final-ia-docs-2026-06-19.md`. 3 files +407/−1.
- **Files (all `docs/design/`):** NEW `topichub_ia_mockup_FINAL_2026-06-19.html` (owner-approved visual — the chat attachment
  was mojibake-corrupted in transit, so the clean on-disk UTF-8 original was copied **byte-identical**, `cmp` IDENTICAL, 19,515 B);
  `LazyTopper_Learn_Flow_Spec_LOCKED.md` (top FINAL IA SUPERSESSION block + a "read this first" note on the original section);
  `TOPICHUB_BUILD_REFERENCE.md` (final-IA note, HTML as binding source #3, planned PR sequence).
- **Final IA (supersedes #261):** learn-first hierarchy (concept rows = HERO; topic action band recedes into a quiet/dashed zone) ·
  **Notes = ONE unified view** (formulae + proofs + mind-map sections — replaces split Formula-sheet/Proofs tabs) ·
  **Examiner's tips = clickable panel** of 3–4 per-topic tips (replaces the single buried line; authored content, anti-fabrication) ·
  concept action **"Teach me"** (was "Learn this") · concept **"Practise"** auto-filtered to concept + mark band ·
  topic band = **Practise this topic / Chapter test / Worksheet** ("Worksheet" was "Generate worksheet") · two-Practise
  differentiation · navy product sidebar is a **constant** (its **Mistake Intel panel is global chrome on every page — NOT on the
  Topic Hub page body**; the "no MI on the Topic Hub page" rule is UNCHANGED by the final IA) · Category (B) split-with-parity stands.
- **Planned PR sequence:** PR-C (tutor flow) → PR-D (layout/action-band/tips/notes-consolidation) → PR-E (chapter-test + worksheet
  wiring) → PR-F (content fill) → PR-G (delete dead old-mobile). On the Topic Hub the final mockup wins over the older
  `01_full_flow…` prototype. (PR-B concept-spine already landed via the mislabeled `c418f59`/#266.)
- **Gates:** docs-only scope (0 src/config/CI/auth) · forbidden-file check PASS · mojibake 0 hits (project regex over the 3 files) ·
  `git diff --check` clean · internal links resolve · **CI `quality-gate` GREEN (1m12s)** + Vercel PASS. **Not self-merged**
  (adds an `.html`, outside the `.md`-only auto-merge policy) → owner-merged, mirroring #261. Worktree removed post-merge.

## ✅ AI-TIER FU-RANK-MOCKS-HPQ — SOFT AI-DEMOTION ON FULL MOCK + TOPIC MOCK (#259, trunk `775ee75`) — MERGED + CI GREEN
ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` only reached the practice paths
(`getLikelyQuestionsForConcept`); the mock engines use `getAllQuestions()` + their own selection and still drew AI at full parity.
GATED `src/` edits (`predictionCore` + the two mock engines), owner-authorized for this ranking-extension scope only. Authority:
PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report:
`report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/−11; squash `775ee75`.
- **Reused PR2a's ONE multiplier** — exported `getSourceMultiplier` from `predictionCore.ts` (no values changed: authentic 1.0 /
  predicted 0.6 / ai 0.3; `predictionTypes.ts` untouched). No second provenance mechanism — the `_source` stamp PR2a attaches at
  ingest rides on the objects `getAllQuestions()` returns.
- **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` → `predWeight *= getSourceMultiplier(q)` per section/marks slot; new
  `sourceWeightedPick` makes the guaranteed-archetype **prefill** authentic-first (was uniform-random); `weightedSelect` exported
  for the test.
- **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot; exported for the test.
- **⚠️ Boundary correction (load-bearing):** the instruction assumed HPQ also uses `getAllQuestions()` + serves AI at parity —
  **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank; never calls `getAllQuestions()`; ZERO AI-pack
  content (none in `AI_GENERATED_QUESTION_IDS`; `hpqCompetencyAdditions` curated too) → nothing to demote (×1.0). Left
  **untouched** (no cosmetic no-op). **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock +
  Topic Mock (this PR); HPQ was already AI-free.**
- **Structure-preserving + count integrity:** demotion is WITHIN each constrained section/marks pool, never global; soft
  (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) → an authentic-thin slot still fills with AI,
  no slot left empty; blueprint loop / section counts / pools unchanged — only WHICH question fills each slot changed; zero
  question added/removed. Repair passes left as-is (rare hard-constraint satisfiers).
- **New follow-up — [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call
  `getAllQuestions()` and serve AI at parity, but were out of this PR's named scope + authorized file list → future owner-authorized
  PR (NOT touched).
- **Tests / gates.** `mockEngineSource.test.ts` — **Codespaces vitest 7/7 PASS** on `ba2f619` (tier order soft; per-slot authentic
  preference; all-AI / authentic-thin slot still fills — for both engines). CI quality-gate does NOT run vitest — verified in
  Codespaces (`ubiquitous-robot`). Local: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard
  `--mode mixed` PASS · diff --check clean. No forbidden files. **No self-merge; owner squash-merged; branch deleted.**
- **NEXT (owner; queued):** **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items ·
  **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).

## ✅ AI-TIER PR2b — STRIP FABRICATED pastBoardYear (#257, trunk `d6e0e14`) — MERGED + CI GREEN
Anti-fabrication strip on the predicted/HPQ layers + serving-logic cleanup. GATED `src/data/` + `src/engine` + `src/prediction`
+ `src/utils` + `scripts/ops` edits, owner-authorized **Option A** (full strip). Authority: `report-ai-tier-audit-2026-06-17.md` →
`AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.
11 files +113/−106; squash `d6e0e14`.
- **WHY:** predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference — anti-fabrication
  violation. Authentic PYQs use the traceable `pyqYear` (759 values); the authentic `questionBanks/**` tree has ZERO `pastBoardYear`.
- **⚠️ Boundary correction (the load-bearing finding):** the instruction assumed **75 values / 2 files**. Exhaustive repo-wide
  enumeration (owner-mandated before any strip — "prove there's no 5th file") found **96 values / 5 files** (undercount of 21):
  `predictedQuestions.ts` 55 · `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**) ·
  `class10SciencePredictiveEngine.ts` 12 · `highlyProbableQuestions.ts` 8 (student-facing HPQ) ·
  `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Cross-checked tracked non-`.ts` files (json/js/mjs) = none;
  the only surviving `pastBoardYear: "…"` literals are intentional inputs in the new test.
- **Strip:** all 96 value lines removed (field-removal only; nothing invented). **`predictionTypes.ts` (forbidden) NOT touched** —
  the optional field stays declared, all values gone.
- **Consumer cleanup — all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker →
  **score-only** (the `!!q.pastBoardYear && !existing.pastBoardYear` clause was always-false post-strip); `predictionCore`
  + `mockPaperEngineScience` `sourceYearHint` → `targetYear-1`; `predictionCore` math+science converters + `predictionScoring`
  + `paperEngine` + `hpqConfidence` → dropped the dead `pastBoardYear` 5-signal-input field.
- **KEY FINDING — HPQ confidence does NOT shift (dead plumbing).** The 5-signal scorer (`cbse5SignalScoring`, line 208) and the
  Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read
  `input.pastBoardYear` / `sourceYearHint` (those appear only at type decls). So stripping the field changes ONLY the dedup
  tiebreaker; HPQ + mock confidence numbers are unchanged. Proven by unit test #4 (identical `compute5SignalScore` with vs without
  `pastBoardYear`).
- **Count integrity:** served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 · ai-generated 2,764 · predicted 241};
  `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged (predictedQuestions 143, HPQ 91, …).
- **Tests / gates.** `predictionCore.pastboardyear.test.ts` — **Codespaces vitest 9/9** (5 PR2b + 4 PR2a regression). Local: tsc
  PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · `scope:guard --mode mixed` PASS (`lanes=product+trackedTooling`)
  · diff --check clean. No forbidden files. **No self-merge; owner squash-merged.** Note: `hpq_phase2_acceptance` (ops, NOT a CI
  gate) can't run in Codespaces — pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk;
  my change there is one clean fixture-line removal).
- **NEXT (owner; queued):** **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking) · **[FU-AITIER-MARKS-MISMATCH]** content pass for
  the 7. The predicted `0.6` tier is now "earned" — no fabricated provenance behind it.

## ✅ AI-TIER PR2a — SOURCE-PROVENANCE STAMP + SOFT AI-LOWER RANKING (#255, trunk `686f737`) — MERGED + CI GREEN + LIVE-VERIFIED
ARCHITECTURAL — changes live serving/ranking on practice surfaces. The audit found AI-lower ranking was **never enforced**:
`getAdjustedScore` had no source term and the file/suffix tier marker was destroyed at the bank concatenation (~41% AI at full
parity). GATED `src/data/` edits, owner-authorized for this scope. Authority: `report-ai-tier-audit-2026-06-17.md` →
`AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.
3 files +265/−9; squash `686f737`.
- **Change 1 — provenance stamp at ingest (`canonicalQuestionBank.ts`, additive).** `AI_GENERATED_QUESTION_IDS: ReadonlySet<string>`
  built from the **54 `.pack[1-3]` source arrays** (the documented file/suffix rule; id-pattern derivation was REJECTED because the
  `2026-…` prefix collides between the predicted layer and the curated inline items). The `canonicalQuestionBank` array itself is
  **untouched** — no reorder, no adds/deletes — so total + per-topic counts are unchanged by construction.
- **Change 2 — soft ranking (`predictionCore.ts`).** New local `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the
  `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT edited — same pattern already used for
  `_adjustedScore`). Stamped at the merge: predicted converters set `"predicted"`; canonical items classified by
  `AI_GENERATED_QUESTION_IDS.has(id)`; `dedupeById` made generic so `_source` survives. `getAdjustedScore` multiplies by
  `getSourceMultiplier` — **`SOURCE_MULTIPLIER = { authentic: 1.0, predicted: 0.6, "ai-generated": 0.3 }`** (owner-locked; SOFT,
  never zero; one tunable place; unstamped defaults to authentic — never demote on missing data).
- **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): **Quick Practice / topic practice**
  (`practiceSetGenerator.generatePracticeSet` :248, `predictionDataService` :53). **NOT yet covered → [FU-AITIER-RANK-MOCKS-HPQ]:**
  **Full Mock** (`unlimitedPaperEngine` :353), **Topic Mock** (`topicMockEngine` :147), **HPQ** (`highlyProbableQuestions`, own pool)
  all use `getAllQuestions()` + their own selection — they need the same `sourceMultiplier` in a later PR (flagged, not silently
  missed).
- **Exact live tier split (Codespaces, authoritative):** **total 6,715 = authentic 3,710 (55.3%) · ai-generated 2,764 (41.2%) ·
  predicted 241 (3.6%) · 0 unstamped.** Authentic > AI; AI share < 60%. Authentic is **790 short** of the 4,500 retirement
  threshold. (Note: live AI 2,764 > the static grep estimate 2,594 — `.pack1` builds ids via a builder, so the literal-id grep
  undercounted; the runtime id-set captures all of them.)
- **Tests / gates.** `predictionCore.source.test.ts` added — **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so
  a strong ai still outranks a weak authentic; tier order authentic > predicted > ai, none zeroed; live-pool drift guard). NOTE:
  the CI `quality-gate` does **not** run vitest (root matrix · mojibake · linux build · ops matrix) — the suite was verified in
  Codespaces. Local gates: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · `scope:guard --mode mixed` PASS ·
  diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**
- **✅ Owner-requested live-verify = PASS** (functional, real serving path `getLikelyQuestionsForConcept`, Codespaces on `686f737`):
  on ~50%-AI topics the first AI question lands deep in the list, so a 10-question Quick Practice serves **all authentic** —
  Real Numbers (n=193, 49% AI) first-AI @#97 · Triangles (n=292, 52%) @#127 · Trigonometry (n=428, 53%) @#186 · Light (n=343, 30%)
  @#239 (one `predicted` at #7 — correct tier order) · Electricity (n=321, 30%) @#217. Before PR2a, AI interleaved at parity.
- **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic → [FU-CURATED-26-PROVENANCE]**
  (owner-logged). **OUT OF SCOPE (untouched):** `pastBoardYear` strip (PR2b — now unblocked by this stamp), the 7
  `[FU-AITIER-MARKS-MISMATCH]` items, AI-pack retirement.

## ✅ AI-TIER PR1b — PACK-FILE 5-MARK RETAGS (#253, trunk `f83915b`) — MERGED + CI GREEN
Relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. GATED `.pack` edits, owner-authorized for this scope
only. Authority: `report-aitier-pr1-mechanical-2026-06-17.md` + cofounder Group-A/B classification →
`AGENT_aitier_pr1b_pack_retags_2026-06-17.md`. Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`. 9 files +34/−19; squash `f83915b`.
- **Group A — 12 relabelled `format:"Short"→"Long"`** (label-only; each confirmed a genuine 5-mark long-answer by reading its
  `questionText`): `ARC2-016, ARC2-017, ABS2-048, CC2-048, CR2-044, CR2-045, CR2-046, HEC2-039, LT2-016, LT2-024, ME2-025, REP2-048`.
  Packs use `format` directly, so the value carries straight to the canonical question (no `toCanonicalFormat` mapping needed).
- **⚠️ `PR2-018` reclassified on inspection** (the instruction's safeguard): "3 red, 4 green, 5 blue → P(not blue)" is a single-step
  `7/12` one-liner, NOT a 5-mark long-answer → **moved to Group B, not relabelled**. Group A = **12** (not 13).
- **Group B — 7 QUARANTINED** (content↔marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled — relabelling would
  worsen them): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`. Kept pinned in `PACK_5MK_SHORT_BACKLOG`
  (now annotated) so the guard tracks them with no regression → **[FU-AITIER-MARKS-MISMATCH]** (later marks/content pass).
- **Backlog 19 → 7.** Count UNCHANGED (symmetric per-file diffs; 0 adds/deletes/marks/rewrites). **[FU-AITIER-PACK-5MK-SHORT]
  RESOLVED** (relabel half). Gates: tsc PASS · root matrix **181/181** (backlog now 7) · ops matrix PASS · mojibake PASS ·
  scope:guard `--mode mixed` PASS · diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**

## ✅ AI-TIER PR1 — MECHANICAL CONTENT-INTEGRITY (#251, trunk `f4a41b6`) — MERGED + CI GREEN
First remediation from the read-only AI-tier audit (`report-ai-tier-audit-2026-06-17.md`). Mechanical/safe only — NOT
ranking/provenance (that is PR2). Authority: `AGENT_aitier_pr1_mechanical_2026-06-17.md`. Report:
`report-aitier-pr1-mechanical-2026-06-17.md`. 5 files +237/−41; squash `f4a41b6`.
- **`QuestionKind` += `"Long"`** in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (confirmed NOT in forbidden
  `predictionTypes.ts`; only `switch(node.kind)` is on Markdown nodes — unrelated). `predictionCore.toCanonicalFormat` maps
  `kind:"long"→format:"Long"` — required so the retag reaches the unified bank rather than staying cosmetic.
- **24 retags** `kind:"Short"→"Long"` on five-mark Section-D predicted items (12 maths + 12 science). The 25th audit item is Q10,
  which is **split** rather than retagged.
- **Q10 split:** `2026-RN-LA-03` (fused alarm-clock LCM + prove-√5, mis-tagged 5mk/Section-D/Short) → `2026-RN-SA-08` (LCM,
  Section C/3mk) + `2026-RN-SA-09` (√5 proof, Section C/3mk). **Net +1** (the only count change). Nothing fabricated;
  `pastBoardYear` omitted on the new items. **[FU-MALFORMED-QUESTION] RESOLVED.**
- **CI guard:** `scripts/src/aiTierContentIntegrityGuard.test.ts` in root `test:matrix:all` (**175→181**) — fails on fused
  (`/\balso\s+prove\b/i`), section↔marks mismatch (A1/B2/C3/D5/E4), and 5-mark "Short" (hard on predicted; baseline-pinned on packs).
- **⚠️ Audit undercounted → [FU-AITIER-PACK-5MK-SHORT]:** 19 more `format:"Short"` Section-D/5mk defects live in gated
  `.pack2/.pack3` files (out of PR1 scope). Pinned as a shrink-only backlog. **PR1b** (owner-authorized): retag ONLY genuine
  long-answers; **QUARANTINE** content↔marks mismatches (e.g. `TG3-056` "cosec 60°", `REP2-039` "name two contraceptives" tagged
  5mk) — flag those for a separate content-judgment pass, do NOT relabel.
- Gates: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard `--mode mixed` PASS · diff --check clean.
  No forbidden files touched. **No self-merge; owner squash-merged.**

## ✅ "FINISH SESSION" SCORECARD TRIGGER (#249, trunk `704dcff`) — MERGED + CI GREEN — owner live-verify PASS
Replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** so the
scorecard actually surfaces (students stop when done, not when they've exhausted the set). Authority:
`AGENT_finish_session_scorecard_2026-06-16.md`. Report: `report-finish-session-scorecard-2026-06-17.md`. 2 files +63/−2;
commit `b740a3f`. **Supersedes #240 sub-task 5.**
- **Finish session button (the load-bearing trigger):** always-available at the foot of a built set, full-width green accent
  (renders on desktop AND mobile widths — `PracticePage` is the shared responsive component for `/practice/:grade/:subject`).
  On tap → fires `practice_finish_session_click` (topic·subject·attempted·total) + sets `sessionFinished=true` → surfaces the
  scorecard. Gated `isBuilt && filteredQuestions.length > 0 && !showScorecard`.
- **`allDone` kept as a convenience auto-offer:** `showScorecard = (sessionFinished || allDone) && questions.length > 0`. When a
  student happens to attempt every question, the scorecard still auto-appears (#240 behaviour) — Finish is the always-present
  primary path. No auto-popup on navigation; the scorecard is deliberate (Finish tap or allDone), never an interruption.
- **Reuses the EXISTING `sessionStats`** (`attemptedInSet`, `localMcqAnswered`, `localMcqCorrect`) — no new counters, no new
  persistence, no session-lifecycle state machine (STOP-IF-IT-BALLOONS guard honoured). The only trigger changed.
- **Partial-session honesty (the critical requirement):** the header uses **attempted-only denominators** ("{attempted} of
  {total} attempted · {correct}/{answered} MCQs correct · {accuracy}%" — accuracy over MCQs *answered*, never the full set) +
  an explicit "the {M} you didn't reach aren't counted" line on a partial finish + an honest zero-attempt state. Unattempted
  questions are NEVER implied wrong or counted against the student.
- **"Keep practicing this set" escape hatch** on a *manual partial* finish (`!allDone`) returns the student to the same set
  (`setSessionFinished(false)`) so Finish never traps them; not offered on the allDone auto-offer (nothing left to attempt).
- **Reset discipline:** `setSessionFinished(false)` added to the existing fetch-success reset block, so any fresh
  build/regenerate/filter-change clears it alongside mcqSelections/selfAssessments — no stale scorecard, no double-count.
- `uxTelemetry.ts` — added `practice_finish_session_click` to the typed `UxEventName` union (additive).
- **Gates:** tsc 0 · mojibake clean · scope:guard product OK · root matrix **175/175** · lazytopper ops matrix green ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #249 (1m8s — incl. the linux `vite build`). No forbidden/gated files.
- **✅ Owner live-verify = PASS — partial-session honesty PROVEN:** a **3-of-10 finish** reads *"3 of 10 attempted · 0/3 MCQs
  correct · 0% accuracy · Here's how those 3 went, the 7 you didn't reach aren't counted"*; the **zero-attempt** case reads
  honestly too. [FU-SESSION-SCORECARD-TRIGGER] CLOSED.
- **🐞 NEW follow-up for the next audit — [FU-MALFORMED-QUESTION]:** a live-observed malformed question — **Real Numbers Quick
  Practice Q10 fused two questions** (alarm-clock LCM + prove √5) with inconsistent tags (5-mark / Section-D / Short). Suspected
  AI-generated pack origin. To be characterised by the upcoming read-only AI-generated-question-tier audit. See OPEN_QUESTIONS.

## ✅ CHECK & IMPROVE DETECT-THEN-CONFIRM (#246, trunk `c9404e1`) — MERGED + CI GREEN — owner live-verify PASS 5/6
The UX layer on Claim 2 (#244): detection is now VISIBLE + CORRECTABLE before grading, plus question photo upload. Authority:
`AGENT_detect_then_confirm_2026-06-16.md`. Report: `report-detect-then-confirm-2026-06-16.md`. 9 files +935/−78; commit `3e00ac4`.
- **Core principle:** detect-then-CONFIRM, never declare-from-scratch. The default stays pure auto-detection; the old
  subject/topic/marks fill-in form was NOT rebuilt. The student touches a value only if it's wrong (constrained correction).
- **Flow (both desktop + app):** question by type/paste/**photo of the question** (distinct slot vs the answer photo) →
  **"Read the question →"** → detection-ONLY `POST /api/detect-question` on the question alone (one deliberate, cheaper call;
  a photo is passed so the AI reads the PRINTED marks) → **confirmation chip** (subject·topic·marks + source) with quiet
  **[Change]** → constrained correction (topic→canonical key via Fix A's resolver; marks 1–6; subject toggle; corrected mark
  → `marksSource:"user"`) → grade on the CONFIRMED values via the unchanged trusted-marks path.
- **Server:** new `handleDetectQuestion` (`checkSolution.cjs`) + `/api/detect-question` (`questions.cjs` + `index.cjs`). The
  grader `handleCheckSolution` is **untouched** (no grading-semantics change).
- **Override logging:** when the student corrects the detection, the attempt record carries `marksSource` + `detectionOverride
  {detected, confirmed}` — reuses `recordAttempt` → localStorage + Firestore-mirror (no new collection, no `firestore.rules`).
  Internal telemetry for classifier-accuracy; never shown to the student.
- **⚠️ `SHOW_DETECTION_META` flag (shared helper `checkImproveDetection.ts`) — default ON for the owner testing phase.** It
  gates ONLY the meta-display (the "read from the question" / "estimated" source label) — NOT the detected values or the
  Change control (those stay visible + correctable even at launch). **MUST be flipped to `false` before shipping to students
  — shipping with the machinery still showing would be a real miss (the tester-vs-student line). Logged as
  [FU-DETECTION-META-LAUNCH-FLIP], a hard PRE-LAUNCH gate — see OPEN_QUESTIONS.**
- **Out of scope (respected):** bank-grounding/retrieval for detection (deferred behind Fix B); no `src/data` reach.
- **Gates:** tsc 0 · 3× `node --check` · root matrix **175/175** · lazytopper ops matrix green (incl. llm-path 5/5) · mojibake
  clean · scope:guard product OK · `git diff --check` clean · `clampDetectedMarks` 9/9 + `buildConfirmedDetection` proofs.
  **CI `quality-gate` GREEN** on #246 (1m7s — incl. the linux `vite build` + vitest). No forbidden/gated files touched.
- **✅ Owner live-verify of #246 = PASS 5/6:** (1) printed marks read correctly, no marks picker; (2) inference GENUINE +
  graduated — a short AP question infers **2**, a proof infers **3** (they diverge → real inference, not a blind constant);
  (3) **photo** of a printed-marks question reads the printed value, two distinct upload slots; (4) **Change** corrects a wrong
  detection → grades the corrected value, topics bucket to a clean canonical key on Me; (5) selectors gone desktop AND mobile.
- **🐞 [FU-DETECTION-MARKS-CEILING] (the 6th — known issue, NOT a blocker):** inference **under-calls true 5-mark questions**
  (multi-part numerical + proofs) as **3** — the inferred scale tops out below 5 for the heavy items. **Caught-and-correctable
  via [Change]** (the student bumps it to 5), so it does not corrupt grading — the detect-then-confirm design absorbs it. Fix
  candidates (later): tune the detection prompt's mark heuristic toward 5 for multi-part/derivation/proof items; OR
  bank-grounding (deferred behind Fix B). See OPEN_QUESTIONS.

## ✅ CHECK & IMPROVE AUTO-DETECT (#244, trunk `43ffa09`) — MERGED + CI GREEN — owner live-verify PENDING
Claim 2 (owner-ruled option (a): infer from the provided question). The grader now determines marks/subject/topic from the
question it already receives, instead of the student picking them (bad UX + eval contamination). Authority:
`AGENT_claim2_autodetect_marks_2026-06-16.md`. Report: `report-claim2-autodetect-marks-2026-06-16.md`. 6 files +330/−238;
commit `d93cd23` (server + client + 2 UI + shared helper + test).
- **Isolation — a `detectMarks` flag.** `/api/check-solution` is shared by Quick Practice (`SolutionChecker`, marks from the
  canonical bank — authoritative) and Check & Improve (student-guessed). The detection path is opt-in: when `detectMarks` is
  absent the handler is **byte-identical** to before (`effectiveMarks = marks`, same cap/`totalMarks`/percentage). Only Check
  & Improve sets it → blast radius stays on Check & Improve.
- **Server (`checkSolution.cjs`):** when `detectMarks`, the prompt asks the AI to determine `detectedMarks` (printed value
  preferred → `marksSource:"stated"`; else inferred from type/depth → `"inferred"`; validated to `[1,6]`, else a flagged
  `"fallback"` — never a silent static 3), `detectedSubject`, and `detectedTopic` (constrained to the canonical `topics.ts`
  vocabulary the client passes — exact key or null, never invented). `effectiveMarks` drives the cap + percentage. Per-step
  grading rules / error-propagation / additive-floor reconcile UNCHANGED — only the SOURCE of marks/subject/topic changed.
- **Client (`aiClient.ts`):** `checkSolutionImage` gains optional `marks` + `detectMarks` + `topicVocabulary`; response gains
  `detectedSubject`/`detectedTopic`/`marksSource`.
- **UI (`DesktopCheckImprovePage` + app `CheckImprove`):** the manual marks/subject/topic selectors are REMOVED; both send
  `detectMarks` + the canonical vocab and build the graded context from the detected response. The detected topic is
  canonicalised via the shared `resolveDetectedGradeTopic()` helper (`src/utils/checkImproveDetection.ts`), which reuses
  Fix A's `desktopTopicForWeakAreaKey` — **no new normaliser** — so MI attribution lands on a real `topics.ts` key (the app
  variant's old free-text dropdown stored non-canonical labels like `"Light"`). Honest fallbacks: unresolved/absent topic →
  full-subject; subject → resolved topic's subject, else AI's detectedSubject, else Maths.
- **Anti-fabrication:** never invents marks (printed → inferred → flagged fallback) or a topic (canonical list or null). No
  grading-semantics drift beyond the marks source.
- **Gates:** tsc 0 · server `node --check` OK · root matrix **175/175** · lazytopper ops matrix green · mojibake clean ·
  scope:guard product OK · `git diff --check` clean · helper Node-replication proof **6/6**. **CI `quality-gate` GREEN** on
  #244 (1m21s — incl. the linux `vite build` + the new vitest). No forbidden/gated files touched (gated resolver imported only).
- **⏳ Owner live-verify PENDING (decisive):** (1) question stating "[3]" → graded /3 without entering marks; (2) question with
  no printed mark → sensible inferred scale, not a blind 3; (3) detected topic buckets correctly on Me ▸ weak-areas (real key,
  routes to practice via Fix A); (4) selectors gone at desktop (≥1024px) AND mobile width.

## ✅ topicKey FIX A (#242, trunk `77f2ed2`) — MERGED + CI GREEN — owner live-verify PENDING
The repair half of the topicKey-duplication problem the read-only audit (`report-topickey-duplication-audit-2026-06-16.md`)
mapped. **Ungated, read-time only** — repairs existing users WITHOUT a data migration. Authority:
`AGENT_topickey_fixA_me_resolver_2026-06-16.md`. Report: `report-topickey-fixA-me-resolver-2026-06-16.md`.
3 files (+114/−2; `topics.ts`, `DesktopMePage.tsx`, new `topics.weakarea.test.ts`); one commit `4eb2320`.
- **The bug:** the Me "Topics dragging your score" row resolved each stored (raw, un-canonicalised) topic label through
  `desktopTopicBySlug` — the weakest of the three topicKey normalisers, which does NOT camelCase-split. The audit proved
  **exactly 13** in-bank spellings fail it (11 PascalCase Science abbreviations: `Light`, `LifeProcesses`, `AcidsBasesSalts`,
  `HumanEyeAndColourfulWorld`, `CarbonCompounds`, `ControlAndCoordination`, `MetalsNonMetals`, `ChemicalReactions`,
  `MagneticEffects`, `HeredityEvolution`, `OurEnvironment`; + 2 `science_*`: `science_light_reflection_refraction`,
  `science_reproduction`). Those rows silently routed to `/exam-trends`. **Named repro: the Light row.**
- **Change 1** — new `desktopTopicForWeakAreaKey()` wraps `desktopTopicBySlug` with the SAME strong resolver the serving
  surfaces already use (`getRuntimeTopicCandidates` — camelCase split + canonical alias map): try the raw key, then each
  runtime candidate. **Reuses** the existing resolver; **no fourth normaliser.** Unknown topics still return `undefined`, so
  the honest `/exam-trends` fallback is preserved. `DesktopMePage.resolveTopicMeta` now calls it.
- **Change 2** — 13 `TOPIC_ALIASES` entries mapping each failing normalized spelling to its canonical `topics.ts` slug
  (belt-and-braces for cases the strong map routes to a non-`topics.ts` canonical, e.g. `HeredityEvolution`).
- **NOT this PR (HELD):** the bank-key data consolidation + CI guard = **Fix B / [FU-TOPICKEY-CONSOLIDATION]** — owner-
  authorized-later. Fix A does NOT rewrite `src/data` or stored learner records; it fixes RESOLUTION at read time, which is
  exactly why it repairs existing users with no migration.
- **Proof:** `topics.weakarea.test.ts` asserts all 13 resolve to the correct slug+subject, an arbitrary non-aliased variant
  (`carbon-compounds`) resolves via the candidate bridge, and unknown/empty keys still fall back. Faithful Node replication of
  the live chain = **20/20 PASS** pre-merge (local vitest + `vite build` are linux-pinned → run in CI).
- **Gates:** tsc 0 · root matrix **175/175** · lazytopper ops matrix green · mojibake clean · scope:guard product OK ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #242 (incl. the linux `vite build` + the new vitest).
- **⏳ Owner live-verify PENDING:** (1) Light row → Quick Practice not Exam Trends; (2) a second previously-failing Science
  topic (Magnetic Effects / Human Eye) → practice; (3) Real Numbers (already working) → no regression; (4) an unknown topic
  → still falls back gracefully.
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED** by this PR (pending the live-verify above).

## ⏭️ NEXT (owner-re-sequenced post-#242): (ii) "Finish session" PR → (iii) gated-spelling — then (2) MI eval → (3) Stage 3 → Fix B
The topicKey audit (i) + Fix A (#242) are done. The items below are QUEUED but **NOT yet authorized** — the owner sends each
as its own instruction, branched fresh against `77f2ed2`. Do not start until instructed.
1. **(i) Read-only topicKey audit — ✅ DONE** (`report-topickey-duplication-audit-2026-06-16.md`); Fix A (#242) shipped the
   repair half; **Fix B (data consolidation + CI guard) = [FU-TOPICKEY-CONSOLIDATION] is HELD / authorized-later.**
2. **(ii) "Finish session" scorecard-trigger PR — small.** Replace the scorecard's `allDone`-only trigger with an explicit
   student-declared "Finish session" action; honest on PARTIAL sessions (don't imply completion). Finishes sub-task 5's
   intent (the redesign that makes the scorecard confirmable).
3. **(iii) Gated-spelling follow-up — [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **(2) MI eval — [MI-EVAL]** check-solution eval set (launch gate; unblocks eval-gated items).
5. **(3) MI Loop Stage 3 — concept-level targeting (eval-gated, [FU-DRILL-ENRICHMENT]).** Not before the eval.

## ✅ MI POLISH BATCH (#240, trunk `9eff0b0`) — MERGED + CI GREEN — owner live-verify 4/5 PASS
One PR, five surface/ranking sub-tasks on the finished MI loop (NOT eval-gated; no new data plumbing). Authority:
`AGENT_mi_polish_batch_2026-06-14.md`. Report: `report-mi-polish-batch-2026-06-15.md`. 7 files +122/−79; one commit per
sub-task (`af881a8` ranking · `72d0e1b` CTAs · `4cd837a` MCQ nudge · `11494d4` spelling · `7a6cadd` scorecard).
- **Sub-task 1 [FU-WEAKAREA-ACCURACY-RANK] — VERIFIED.** `computeWeakAreas` ranks by **blended severity**
  (`marksLost + lowAccuracyDrag`); a topic weak only via wrong MCQs (0 marks lost, ≥3 attempts, <40% accuracy) now
  surfaces. Graded topics with accuracy ≥40 keep prior ordering (drag = 0). Deterministic.
- **Sub-task 2 [FU-WEAKAREA-CTAS] — VERIFIED (with one bug, see below).** Every weak-area row routes to an auto-served
  topic-scoped practice set via the existing Stage-1 `gotoPracticeForTopic`; honest fallback to topic-hub/trends when a
  topic has no hub slug; gated `buildDesktopPracticePath` untouched. Dropped the redundant row[0] "Practise" button.
- **Sub-task 3 [FU-MCQ-UPLOAD-NUDGE] — VERIFIED.** A wrong MCQ shows "Want to know why? Show your working below." →
  reveals the EXISTING inline Check-my-answer box; correct MCQ shows nothing. No new data path.
- **Sub-task 4 [FU-SPELLING-PRACTICE] — VERIFIED (partial scope).** "Practise"→"Practice" in DesktopMePage/mobile Me/
  DesktopTopicHubPage UI copy. **Gated remainder carried as [FU-SPELLING-GATED-REMAINDER]** (~60 `src/data/**` +
  `loginPrompts.ts` strings — forbidden dirs, owner-authorized separate follow-up).
- **Sub-task 5 [FU-SESSION-SCORECARD] — NOT yet confirmable.** End-of-session scorecard (attempted · MCQs correct ·
  accuracy + honest MI nudge + honest saved-state line) replaced the footer + the mislabeled "MCQ answers: 0/5". Its
  `allDone`-only trigger made it hard to surface in live-verify → **being redesigned into an explicit "Finish session"
  trigger** (queued PR ii). Code shipped; behaviour re-confirmed after the redesign.
- **🐞 Live bug found ([FU-WEAKAREA-EXAMTRENDS-FALLBACK]):** the **Light – Reflection and Refraction** weak-area row
  routes to **Exam Trends instead of practice** — its non-canonical topicKey (en-dash variant + "(in…)" suffix) fails to
  resolve to a practice slug and hits sub-task 2's honest fallback. **Confirmed symptom of the topicKey duplication
  problem**; to be traced in the upcoming read-only topicKey audit (item i). NOT a regression of the fallback itself.
- **Gates:** tsc 0 · mojibake clean · root matrix **175/175** · ops **22/22** · scope:guard product OK ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #240 (incl. the linux `vite build` + ops matrix).

## ✅ MI LOOP STAGE 2 — Measure-leg PR 3 (#237, trunk `b75f065`) — MERGED — MEASURE LEG COMPLETE
The last Measure-leg PR: MCQ honest capture. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 3 of 3).
Report: `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`.
- **Route MCQ clicks through `recordAttempt`:** `PracticeQuestionCard` MCQ option click → `recordAttempt` (correct = 1/1,
  wrong = 0/1, `mode: "mcq"`, `topic = topicLabel`, `question`, `questionId`, `subject`) — the SAME keying graded answers
  use, so MCQ feeds Saved attempts / Accuracy and a **CORRECT MCQ shrinks a weakness via the PR-2 loop-closer**. Recorded
  for both correct + wrong, only when the answer key is trusted (`correctIdx >= 0`); the front door self-guards policy.
- **Removed the hardcoded `conceptual:1` bypass:** the whole direct-`logMistakes` block (+ its now-unused import). A bare
  MCQ click has no working to classify, so a wrong MCQ no longer fabricates a "conceptual" mistake.
- **Wrong-MCQ treatment — OWNER-RULED (a) attempt-only:** a wrong MCQ records the 0/1 attempt and NOTHING else (no
  mistake-log entry, no synthesized grade object, no typed category). Option (b) — an untyped/objective `recordMistake` —
  was declined. Marks-lost / mistake-mix / weak-areas stay sourced from real graded classifications.
- **One front door, no fabrication:** all MCQ signal flows through `recordAttempt` only — no direct `logMistakes`, no
  fabricated types, no synthesized grade objects.
- **Gates:** tsc 0 · mojibake clean · root matrix 175/175 · ops 22/22 · scope:guard OK · `git diff --check` clean. CI
  `quality-gate` GREEN on #237. (`vite build` CI-gated on linux.)
- **⏳ Owner live-verify PENDING** (post-merge): wrong MCQ → attempt + Accuracy, NOT conceptual-inflated; correct MCQ →
  accuracy + can shrink a weak area; Me "concept gaps" = real graded classifications only.
- **NEXT:** **MI Loop Stage 3 — concept-level targeting (eval-gated)** = `generatePracticeSet.conceptKey` from the weak
  concept (needs MI sub-concept capture + the eval set) = **[FU-DRILL-ENRICHMENT]**. (Measure leg done; no more Stage-2 PRs.)

## ✅ MI LOOP STAGE 2 — Measure-leg PR 2 (#235, trunk `59f9d18`) — MERGED + owner live-verified — THE LOOP CLOSES
The return leg. A graded mistake grows the wrong-answer count (Stream 3) via the `recordMistake` bridge; PR 2 makes a
clean correct drill SHRINK it — the engine is now bidirectional. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 2
of 3). Report: `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.
- **Loop-closer (data layer):** in `recordAttempt`, a FULLY-correct attempt (`scored >= available`) decrements one
  active gap for the topic via `clearWrongAnswer` — live correct-attempt path (NOT the dormant `recordSelfAssessment`);
  only on a newly-recorded attempt (after dedup → no double-decrement); wrong/partial never shrink; clamped at 0.
- **Key-matching (the G9 alias-fragility class):** the decrement resolves the canonical key with the IDENTICAL
  expression `normalizeTopicKey(ctx.topicKey ?? ctx.topic)` the bridge used to increment (same ctx passed to both doors
  in PR 1) → tautologically equal key; then decrements the stored entry by its OWN keys (exact map-key match). Caught
  the trap that `getWrongConceptsForTopic` keeps `-` but turns spaces→`_` (raw "Real Numbers"→"real_numbers" would miss
  "real-numbers") — fixed by normalizing first on both data + display paths.
- **"Active gaps remaining" on Me (owner Option 1):** both Me surfaces show the recoverable wrong-answer count
  (`· N active gaps to clear`) ALONGSIDE the historical `· M marks lost` — the **scar** (never shrinks) vs the
  **healing** (shrinks to 0). Did NOT repoint Me to `getWeakAreas` (deferred durable-Me convergence).
- **Pre-merge logic confidence — GitHub Codespaces (Linux; mocked/local stores, no Firebase creds):** vitest
  `practiceInsights.loopclose.test.ts` **2/2 PASS** (2-topic decrement + clamp-at-0 + wrong-no-shrink + canonical-slug
  topicKey); `vite build` ✓ 9.04s; `verify-production-build.mjs` ✓ exit 0. CI `quality-gate` GREEN on #235.
- **Live verification (owner, PASS):** active gaps shrank to **0 on Real Numbers AND Polynomials** after clean correct
  drills; marks-lost held as the historical scar; wrong answers didn't shrink; clamp held at 0; **mobile parity** confirmed.
- **Residuals logged (see OPEN_QUESTIONS):** **[FU-IMPROVEMENT-CARD]** (clearWrongAnswer DELETES the entry at zero,
  erasing the improvement record — before an improvement/journey card on Me, the loop-closer must first record a durable
  "gap cleared" event (cumulative + per-topic + timestamp) in the practiceInsights mirror); **[FU-WEAKAREA-ALIAS-DISPLAY]**
  (active-gaps count under-shows for topics whose label ≠ canonical slug until the alias map covers them; data-layer
  decrement unaffected).
- **NEXT in the loop:** **PR 3 = MCQ honest capture** (last Measure-leg PR) — `PracticeQuestionCard` MCQ click →
  `recordAttempt` (1/1 or 0/1); stop the hardcoded `conceptual:1` bypass. **Owner-greenlight-gated** — do NOT start until
  greenlit.

## ✅ MI LOOP STAGE 2 — Measure-leg PR 1 (#233, trunk `57fb7aa`) — MERGED + owner live-verified
The MI loop is Capture → Identify → Act → **Measure**. The loop did NOT close: `recordAttempt` had **0 call sites** (empty
scorecard, dead accuracy path). PR 1 makes the engine **measurable** — graded scores persist and feed the Me cards. Per
`AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 1 of 3). Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.
- **Front door:** the dead `practiceInsights.recordAttempt` is now the real, single `recordAttempt(user, ctx)` — the **score-twin
  of `recordMistake`** (policy: skip no-user/local; dedup; localStorage + the **existing** Firestore mirror — **no `firestore.rules`
  edit**). Exactly one `recordAttempt` (confirmed-and-replaced the dead one).
- **Marks is the universal unit:** an attempt carries `marksScored`/`marksAvailable`/`mode`; `correct` is **derived** (full marks)
  so the existing %-correct readers are unchanged. `marksScored` clamped to `[0, marksAvailable]` (can't invent marks).
- **Routed all three graded surfaces** (Quick Practice `SolutionChecker` — fresh + cache-restore; desktop `DesktopCheckImprovePage`;
  mobile `CheckImprove`) — each calls `recordAttempt` alongside `recordMistake`. Records EVERY graded attempt incl. full marks
  (accuracy needs the correct ones). Dedup keyed on `(uid, questionId|hash(question), score, mode)` so a cache-restore never
  double-counts. `topicKey` = human label → attempts **merge** with mistake-log rows (no duplicate weak-area rows).
- **Live-verified PASS (owner):** Saved attempts populate; Accuracy / Accuracy-by-subject / Recent all flow from real graded
  attempts; attempts merged into the **Polynomials** weak-area row (attempts + accuracy alongside marks-lost); X/Y banner confirmed
  as the v1 session scorecard (no new UI).
- **2 follow-ups logged:** **[FU-ATTEMPT-MARKS-ACCURACY]** (Me accuracy still binary — marks-weighted is the fuller decision-1
  expression, needs label changes; fast-follow) and **[FU-ATTEMPT-SR]** (the old dead `recordAttempt` fed spaced-repetition; that
  side-effect was intentionally dropped — reviving it is its own decision). See OPEN_QUESTIONS.
- **NEXT in the loop:** **PR 2 = close the loop** — a correct `recordAttempt` decrements the topic/concept weakness via
  `clearWrongAnswer` (wire to the live attempt path, not the dormant session subsystem). Decisive test: a logged weak area
  (e.g. Real Numbers −7) **visibly shrinks** on Me after a clean drill. Then **PR 3** = MCQ honest capture through the doors.

## ✅ MI LOOP STAGE 1 — Act-leg (#231, trunk `6d80a57`) — MERGED + owner live-verified
The MI loop is Capture → Identify → **Act** → Measure. Stage 1 wires the **Act** hand-off so "practise where you lose marks"
finally serves targeted practice (per `LazyTopper_MI_Loop_Culmination_Spec_2026-06-12.md`).
- **Gap A:** desktop + mobile Me weak-area CTAs target the #1 weak topic (highest marks lost); honest generic fallback when no
  weak-area data (no fabricated target).
- **Gap B:** a TARGETED arrival (explicit `?topic=` non-generic, or `targeted=1`) at `PracticePage` now **auto-serves** the
  already-fetched set (flips `isBuilt`); bare subject-level entry keeps the builder; "Edit filters" preserved.
- **Option B (one-click direct):** `gotoPracticeForTopic` → `/practice/10/<subject>?topic=<slug>` directly, bypassing the
  `/practice-hub` chooser so desktop matches mobile. Gated `buildDesktopPracticePath` (→ `/practice-hub`) **untouched**.
- **Intent-first guardrail:** generic entries stay open/unscoped — never auto-scoped to weak areas.
- **Live-verified PASS:** one-click ready set (desktop + mobile); guardrail holds; served set non-empty (Real Numbers,
  Polynomials); "Edit filters" works. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.
- **NEXT in the loop:** **Stage 2 = Measure leg** (`recordAttempt` + attempt/score stream → "Saved attempts"/"Accuracy"/weak-area
  shrinking; = the Scorecard spec, reframed as the loop's return leg). **Stage 3** = concept-level targeting (eval-gated).
  5 Stage-1 follow-ups recorded in OPEN_QUESTIONS ([FU-DRILL-ROUTING], [FU-WEAKAREA-LABEL], [FU-WEAKAREA-CTAS],
  [FU-WEAKAREA-HUB-LIMIT], [FU-DRILL-ENRICHMENT]).

## ✅ GRADE-PARSE RESILIENCE (#229, trunk `59e11f6`) — MERGED + owner live-verified
The intermittent **"We couldn't read the grading this time"** was **Gemini JSON truncation**: the grading call capped at
`maxOutputTokens: 8000`, long multi-step grades overran it and came back **cut mid-JSON**, and `extractJsonObjectFromText`
(recovers only complete JSON) returned null → failure path. (Same image graded on retry because output length varies; the
client's internal retry only fires on 429.)
- **Fix (`server/routes/checkSolution.cjs`, parse-resilience ONLY):** single bounded retry on a parse-gate miss (no loop);
  `maxOutputTokens` 8000→16000 (a cap, not a target); failure-path diagnostics logging `finishReason` + length + tail. **Grading
  semantics untouched** (prompt/rules/mark-scheme/`marksAwarded`/MI reconcile/response shape all unchanged).
- **Live verification (owner, PASS):** `sol_5.jpeg` grades reliably on **both** Quick Practice and Check & Improve, no error;
  grade quality unchanged. (Me reflects after a manual refresh — separate known **[FU-ME-REFRESH]**, not a regression.)
- **[FU-GRADE-PARSE] CLOSED.** Two new eval-gated follow-ups recorded: **[FU-GRADE-MARKSCALE]** (Check & Improve marks are
  student-entered, not question-derived → grader should judge the CBSE mark value) and **[FU-GRADE-CONSISTENCY]** (mistake-type
  varies across surfaces; mostly downstream of mark-scale). Report: `report-grade-parse-resilience-2026-06-12.md`.

## ✅ MI CONSOLIDATION P1+P2 (#227, trunk `c618cd5`) — MERGED + owner live-verified
The MI Architecture Map (`LazyTopper_MI_Architecture_Map_2026-06-11.md`) exposed MI as 3 capture streams feeding 2 disconnected
analysis layers. P1+P2 builds the **one ingestion front door** and bridges the first gap.
- **`recordMistake(user, gradeResult, context)`** (`src/services/mistakeIntelligence.ts`) is THE entry point: one policy
  (`uid && !isLocalSession` AND `marksAwarded < totalMarks` OR any step `mistakeType`), one builder (replaces desktop
  `buildLogEntry` + mobile `buildMobileLogEntry`, both deleted), dedup (covers the cache-restore path). Routed `SolutionChecker`
  (**deleted the `mistakeCount>0` guard** — the Quick-Practice bug), mobile `CheckImprove`, desktop `DesktopCheckImprovePage`.
- **Bridge (Map gap #3, knowledge-gap types):** conceptual+calculation graded mistakes write ONE Stream-3 `WrongAnswerEntry` via
  `recordWrongAnswer` → feeds the existing capped `Math.min(wrongData.count*5, 30)` weak-area term. **`confidenceScore`
  untouched.** Silly+presentation do NOT bridge — surfaced as a distinct **"Careless mark-loss"** card on both Me pages.
- **Server:** `checkSolution.cjs` additive-floor reconcile `max(llm, stepDerived)` (client mirrors it).
- **Behavior change (approved):** full-marks answers no longer log a zero-mistake row; mistake answers still log.
- **Live verification (owner, PASS):** regression ✅, Quick-Practice logging ✅, bridge ✅ (Polynomials + Real Numbers surfaced),
  server reconcile ✅, no double-log ✅. **2 follow-ups:** [FU-GRADE-PARSE] intermittent grade-parse; [FU-ME-REFRESH] Me needs
  manual refresh. Both pre-existing / separate from this PR (see OPEN_QUESTIONS). Classification is eval-pending.
- **OUT OF SCOPE (deferred):** MCQ migration onto the front door (still `conceptual:1`), chapter-tests/mocks, layer-merge, durable
  Me convergence. Report: `report-mi-consolidation-p1p2-2026-06-11.md`.

## ✅ INFRA-4 / PR1 — backend DEPLOYED + LIVE (the go-live unlock)
The backend (`artifacts/api-server`, which self-spawns the `lazytopper/server` AI gateway as a child) is **deployed on Railway and
live** — owner-confirmed `/api/health` shows `stub:false` with Gemini **direct-key** auth. **Grading (`/api/check-solution`) is no
longer dark in production.** Wiring: Vercel static app → `vercel.json` rewrite (`/api/*` + `/shared-api/*`) →
`https://lazytopper-production-production.up.railway.app` → api-server (8080) → gateway (3001) → Gemini.
- **Deploy shape (load-bearing):** the image carries the **whole workspace** and keeps `typescript` installed — the gateway
  transpiles `lazytopper/src/**/*.ts` at runtime and resolves files relative to cwd (Dockerfile + `.dockerignore` encode this).
- **Deferred:** claudeClient Replit-proxy rewire (INFRA-4b) — grading is Gemini-only; Claude is visuals-only and degrades
  gracefully. **Flagged for PR2:** `tsx` (absent from manifests; warmup is `DATABASE_URL`-gated, inert until PR2 adds Postgres).
- **PR2 (harden, queued):** provision Postgres + `DATABASE_URL` + add `tsx` + `ADMIN_FIREBASE_UIDS` + `SESSION_SECRET` +
  rate-limit + warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` currently `0`).
Reports: `report-api-server-deploy-investigation-2026-06-10.md`, `report-api-gateway-railway-2026-06-10.md` (incl. owner runbook).

## ⛔ TRACK B (#222) verification gate — now LIVE-TESTABLE; owner+cofounder run it to close
With the backend live, the grade→persist→mobile-Me→desktop-Me round-trip can finally be PROVEN. **Status: live-testable, NOT yet
closed.** The owner + cofounder run the real round-trip on the live app (sign in → grade a real answer → confirm "Saved to your
progress" → mobile Me shows the real mistake mix → desktop Me matches on the same uid; plus the failed-grade → error path). **Only
that pass closes [TRACK-B-GATE] / ISSUE-009.** Step-by-step in `report-api-gateway-railway-2026-06-10.md` §7. See OPEN_QUESTIONS [TRACK-B-GATE].

## PHASE-2 RESPONSIVE DIVERGENCE — Track A DONE (#220); audit ordered the rest
The Phase-2 work (reconcile stale mobile twins to the desktop source-of-truth; no invented numbers) is underway.
- **Full divergence audit (read-only):** `report-responsive-divergence-audit-2026-06-08.md` mapped every `useIsDesktop()`
  split. 7 split surfaces → 2 MATCH-by-design (Home, Welcome), 2 MATCH by construction (Exam Trends, Practice Hub),
  **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets). Severities normalized (mobile-shows-less =
  functional, not trust-critical).
- **Track A DONE (#220, `8c478ce`):** mobile Me (`app/Me.tsx`) no longer shows fabricated personal data — the hardcoded
  `COMMON_MISTAKES` bars (−12/−8/−5) + invented weak-topics count are removed, replaced with honest empty-states (desktop
  Me's verbatim copy) + an honesty footer. The urgent trust-critical stopgap. Streak/XP kept (real localStorage). 1 file,
  +48/−56; grep-proven zero fabricated data; gates green; build CI-gated.
- **Punch-list order (OPEN_QUESTIONS):** Track A ✓ → **Track B (mobile Check trust + persistence — the data source mobile
  Me needs)** → RESP-DIV-2 (mobile has NO logout path) → Topic Hub reconcile → Worksheets parity → Home real-insights →
  RESP-DIV-3 (trial banner). Durable cure = converge mobile Me into desktop Me (one responsive component, one pipeline).

## SEVER PR (#218) — obsolete surfaces disconnected; product reaches ONLY live surfaces
PR #218 (`fix/sever-obsolete-surfaces`; squash-merged **`bcb7c2a`**, 57 files +170/−171) severed every inbound edge
(route, nav, catch-all, command-palette, leaked link) to obsolete/deferred pages so the running product reaches
ONLY live surfaces. **Markers-now doctrine** — no files moved/deleted; 46 disconnected files carry a top-of-file
`LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) marker for a future Phase-2 clean-branch (grep the markers to
delete/keep). Authority: `AGENT_sever_obsolete_surfaces_2026-06-08.md` + the two read-only audits
(`report-responsive-surface-audit-2026-06-08.md`, `report-banned-term-prose-audit-2026-06-08.md`).
- **Routing (App.tsx — owner-authorized, routing-scoped):** mobile `/` (RootEntry) + catch-all `*` (HomeRedirect)
  re-pointed off the retired old `/dashboard` to the live MobileHome (`/browse`) / `/`; `/browse` made terminal at
  mobile width (no `/`⇄`/browse` loop). **Fixes the two-contradictory-homes bug** (mobile `/` + catch-all landed on
  the old Dashboard while the BottomNav Home tab went to `/browse`). Durable nav-mirror rule encoded; BottomNav
  active-state residue trimmed to the live set. `main.tsx` was NOT needed (less forbidden-file surface).
- **18 dead `<Route>` entries removed** (RETIRE: dashboard, trends, daily-mix, daily-mission, planner, study-plan,
  night-before, revision-calendar, mini-mock, weekly-wrapped, weekly-digest, methodology, settings; DEFERRED:
  parent-dashboard, parent, predictive-papers). `weak-area-practice` KEPT (partial-sever: dead-Dashboard doorway +
  palette entry severed; live ExamSim/MockPaper inbound preserved).
- **11 leaks closed:** JourneyStrip removed from HPQ; command palette severed at switch + catalog
  (`commandPaletteConfig`) + intent (`commandIntent`); live back-defaults/links in PracticeQuestionList, TopicHub,
  WeakAreaPractice, ExamSimulation, MockBuilder, the Login post-login fallback, and Onboarding re-pointed off
  severed routes. (5 of these were BEYOND the named JourneyStrip+palette — surfaced by a manual dead-path grep
  that the connectivity graph cannot see.)
- **Merge gate = before/after connectivity graph** (a new reusable tool `connectivity-graph.mjs` in the diff
  folder): 18/18 intended cuts unreachable AFTER, **28/28 live routes preserved (zero loss)**, 0 unexpected losses;
  `/mock-paper` flagged collateral (kept routed, unreachable — its only entry was the deferred predictive-papers).
- **Gates:** tsc, mojibake, scope:guard product, root matrix 175/175, ops 6/6, git diff --check all PASS; **CI
  `quality-gate` GREEN** (the linux vite build + verify-production-build). Vercel preview verified by owner
  (MobileHome landing 360/768, desktop sidebar nav, gated-CTA→login→return, routing fix → MobileHome not old
  Dashboard). Report: `report-sever-obsolete-surfaces-2026-06-08.md` + `connectivity-{before,after,diff}.*`.
- **Auth untouched** — zero auth / `main.tsx` / Firebase files in the 57; this build is byte-identical to #214 on
  auth. New responsive-divergence findings from the preview logged in OPEN_QUESTIONS (Phase-2, soft-launch).

## SYLLABUS PROSE COPY-FIX (#216) — 3 Tier-1A banned terms removed from the live cockpit
PR #216 (`fix/banned-term-prose-copy`; squash-merged **`b35f764`**) fixed 3 out-of-syllabus strings the
175/175 guard cannot catch (its surface scan omits bare generics to avoid prose false-positives). 2 files,
copy-only (+2/−3): `lib/desktop/topics.ts:35` Polynomials blurb dropped "the division algorithm" → quadratic
zeroes-coefficient wording; `:45` Linear Equations blurb dropped "cross-multiplication"; `topicHubContent.ts:249`
removed the "Complementary angles" Board-Essentials row. Authority: `report-banned-term-prose-audit-2026-06-08.md`.

### Two READ-ONLY audits now drive the next workstreams (reports in `diff/`)
- **`report-responsive-surface-audit-2026-06-08.md`** — mapped the live cockpit vs the abandoned graveyard
  (old `/dashboard` subgraph + `components/dashboard/*`, orphans Home/ProfilePage/PracticeHome/MentorPanel,
  old `/trends`, `/planner`). **Headline risk:** mobile `/` + catch-all + command palette still route live
  students into dead surfaces (old Dashboard is the mobile landing today). Owner-ruling queue (Bucket B + C)
  → produces the kill-list. **The SEVER PR is the next instruction.**
- **`report-banned-term-prose-audit-2026-06-08.md`** — 3 Tier-1A fixed here (#216). Tier-1B + Tier-2 deferred
  (see OPEN_QUESTIONS).

## AUTH MIGRATION ARC — 4/4 COMPLETE (#214): auth is Firebase-only, end to end
The arc is closed: **PR-1 #206** (api-server edge `verifyIdToken`) → **PR-2 #208** (frontend rebuilt on Firebase
Auth + native login) → **PR-3 #210** (Clerk teardown — Firebase-only, repo Clerk-free) → **governance scrub #212**
(CLAUDE.md/§5 doctrine + setup docs) → **PR-4 #214** (phone / SMS-OTP). Auth providers live: **Google (popup) +
Email/Password + Phone (SMS OTP)**. Firestore keyed on Firebase uid; admin via `ADMIN_FIREBASE_UIDS`.
**Verified in production-preview:** a real-number phone login — real SMS, real OTP, signed in, **trial correctly
tied to the phone account**. (Deliverability caveat logged — see OPEN_QUESTIONS [SMS-DELIVERABILITY].)

## AUTH MIGRATION ARC — PR-3 of 4 DONE (#210): Clerk teardown — auth is now Firebase-only
PR-3 (`fix/remove-clerk-bridge` from `5fc4141`; squash-merged **`6bf6e58`**) removed **all remaining Clerk**:
the gateway custom-token bridge, the api-server Clerk dual-accept fallback, `@clerk/express` + the Clerk
middlewares, and the now-dead JWT libs. Auth is **Firebase-only end to end**. 14 files (2 deletions + 12 edits,
+30/−224) + lockfile (−162). Report: `report-pr3-remove-clerk-bridge-2026-06-08.md`.

### What landed
- **Deleted** `lazytopper/server/routes/firebaseAuth.cjs` (the `/api/auth/firebase-token` bridge) +
  `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.
- `server/index.cjs` — removed the bridge require/factory/route-handler/CORS entry. `lazytopper/package.json` —
  dropped `jsonwebtoken` + `jwks-rsa` (remain transitive under `firebase-admin`, which is correct).
- `requireFirebaseAuth.ts` — removed the Clerk `getAuth` fallback → **Firebase-only** (`verifyIdToken` or 401;
  503 if Firebase Admin unconfigured — fail-closed, since there is no fallback now).
- `app.ts` — removed `clerkMiddleware()` + the proxy mount. `artifacts/api-server/package.json` — dropped
  `@clerk/express` + the orphaned `http-proxy-middleware`.
- Scrubbed stale "Clerk" comments + the `authProvider` default (`"clerk"` → `"firebase"`).

### Zero-Clerk (owner gate)
`grep -rinE "clerk"` over `**/src`, `**/server`, `**/package.json` → **ZERO**. The lockfile `@clerk` count = 0
(whole `@clerk/*` tree removed). Remaining `clerk` matches are **non-code only**: gitignored `.env.local`,
auto-gen `.project_memory` snapshots, `handoff/*` migration history, and `CLAUDE.md`/`FIREBASE_SETUP.md`/
`docs/desktop-graduation-state.md` — the latter are the **governance/docs scrub** queued next (owner-ready
instruction; `CLAUDE.md §5` "Clerk stays for now — K2H-15" is now obsolete).

### PR-3 gate evidence (all green, Codespace + CI)
- **CI `quality-gate`**: PASS (run `27115594685`, 1m33s) — frozen install + root 175/175 + mojibake + build + ops.
- **Codespace (pre-push):** api-server tsc/build exit 0; lazytopper tsc/build exit 0; verify-production-build PASS;
  **gateway boots without the bridge** ("LazyTopper AI server running on port 3011"); root 175/175; ops 6/6;
  lockfile `@clerk` count = 0.

### ⚠️ Now load-bearing (the Clerk safety net is gone)
- **Admin bootstrap (BLOCKING):** `ADMIN_FIREBASE_UIDS` = your Firebase uid is the ONLY way admin routes
  authorize now. Until set: admin routes 503 in prod / dev-skip locally.
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) — `requireFirebaseAuth` returns 503 without it (no fallback).
- Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + the local `.env.local`.

### Remaining auth work
- **(DONE — #212) CLAUDE.md governance scrub** — surgical §1 stack + §5 doctrine edits, +
  `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md`. Owner-reviewed merge (governance files excluded from
  docs auto-merge). Trunk after #212: `c755adb`.
- **(NEXT, hold for owner go) PR-4 — phone / SMS-OTP** (`feat/auth-phone-otp`): fill the `initPhoneRecaptcha`/
  `sendPhoneOtp`/`verifyPhoneOtp` façade with `signInWithPhoneNumber` + reCAPTCHA v2 invisible; wire the Phone
  tab (+91 → 6-digit OTP). Project `lazzyy-topper` on Blaze; enable Phone provider + Authorized domains (owner).
- Google **One-Tap** (GIS) follow-up once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-2 (#208): frontend on Firebase Auth (Clerk removed from the client)
PR-2 (`feat/auth-firebase-frontend` from `7f993cb`; squash-merged **`597880d`**) rebuilt the frontend auth on
**direct Firebase Auth** and removed Clerk from the client. The api-server edge (PR-1) is now hit with **Firebase
ID tokens** (its preferred `verifyIdToken` path); the Clerk fallback there goes idle (removed in PR-3). Design basis:
`LazyTopper_Login_Design_Spec_v2.md` + `lazytopper_login_prototype_v2.html`. Reports:
`report-pr2-auth-firebase-frontend-2026-06-08.md` + `report-pr2-evidence-2026-06-08.md`.

### What landed (6 files + lockfile)
- **`src/context/AuthContext.tsx`** — internals → direct Firebase Auth (`onAuthStateChanged`,
  `signInWithPopup(GoogleAuthProvider)`, email/password). **Added** `signInWithEmailPassword` /
  `signUpWithEmailPassword` (additive — `AuthContextType` shape preserved, ~38 consumers untouched).
  `getToken()` → `currentUser.getIdToken()`. Clerk→`/api/auth/firebase-token` bridge deleted from the client.
  **Local-dev/E2E anonymous-session path preserved verbatim.** Phone façade stays no-ops (PR-4).
- **`src/pages/Login.tsx`** — native v2 widget: official Google button + One-Tap sub-line, Email/Phone segmented
  toggle, **one-step** email+password, **disabled** Phone tab with honest "arrives shortly" note (handler = PR-4).
  `lt-login-clerk-frame` → `lt-login-frame`; **"Welcome back" header removed**; left brand panel untouched.
- **`src/pages/SignUpPage.tsx`** — native Google + email/password create-account.
- **`src/main.tsx`** — `ClerkProvider` removed (authorized for PR-2). **`package.json`** — `@clerk/react` dropped.
- **`artifacts/api-server/src/routes/admin.ts`** — admin allowlist migrated **`ADMIN_CLERK_UIDS` →
  `ADMIN_FIREBASE_UIDS`** (the forward-corrected functional step; `req.userId` is now a Firebase uid).

### Owner decisions (PR-2)
- **Google = popup** (`signInWithPopup`) — no new env/script. True GIS One-Tap is a fast-follow once a Web OAuth
  client ID is supplied. **Email = one-step**, password-based (no magic link). Phone toggle present, inert until PR-4.

### PR-2 gate evidence (all green)
- **CI `quality-gate`**: PASS (run `27102702574`) — frozen install + root matrix 175/175 + mojibake + lazytopper
  build + ops matrix.
- **Codespaces (pre-push, files copied in — no commit):** lazytopper `tsc -p tsconfig.app.json` **exit 0** (the
  ~770-line rewrite's first compile); api-server typecheck exit 0; **vite build exit 0**; verify-production-build
  PASS; root 175/175; ops matrix 6/6; lockfile regenerated (`@clerk/react` removed, −17 lines).
- **Vercel-preview screenshots** (360/768/desktop × login + signup) captured + assessed faithful to the v2
  prototype — `pr2-{login,signup}-{360,768,desktop}.png` in the diff folder.
- **Runtime auth verification (headless, real `lazzyy-topper`):** email/password sign-up+sign-in + `getIdToken()`
  → decoded JWT `iss = https://securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper`,
  `sign_in_provider = password` — a genuine **Firebase** token (NOT Clerk). Throwaway account deleted.
- Zero `@clerk`/`VITE_CLERK` refs remain in `lazytopper/src`. `scope:guard` classifies the 5 FE files as
  `product`; the 1 BE file (`admin.ts`) is the known `[unclassified]` gap (D47).

### ⚠️ PR-3 IS NEXT (owner to give go) — the Clerk teardown
PR-3 (`fix/remove-clerk-bridge`): delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs` + its
`server/index.cjs` wiring; drop `jsonwebtoken`/`jwks-rsa`); remove the api-server **Clerk fallback** branch from
`requireFirebaseAuth` (Firebase-only); drop **`@clerk/express`**; unmount `clerkMiddleware()`; remove
`clerkProxyMiddleware`; remove Clerk env (`CLERK_SECRET_KEY`, `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`).

### Owner / deploy actions still pending
- **Admin bootstrap:** sign in once via Firebase → capture your uid → set `ADMIN_FIREBASE_UIDS` (else admin routes
  503 in prod / dev-skip locally).
- **Firebase Authorized domains:** add the prod Vercel domain to `lazzyy-topper` so `signInWithPopup` works in prod
  (localhost already allowed; the Google popup couldn't be auto-tested headlessly — owner verifies with a real click).
- **Railway env (from PR-1):** `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or ADC) on api-server.
- **One-Tap (GIS) follow-up:** small PR once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-1 (#206) — Firebase edge verify + Clerk dual-accept (Option B)
Owner decided to **remove Clerk and use Firebase Authentication directly** (Google + Email/Password + a NEW
phone/SMS-OTP option). Rationale (verified): all student data already lives in Firestore (per-uid, secured by
`firestore.rules` `isOwner(uid)`); Clerk sits "midway" (login UI + session → a backend bridge mints a Firebase
custom token); Firebase has native auth, so Clerk is the removable layer. Cheapest to migrate now (no live
student accounts, Clerk production not yet set up). Authority: the read-only audit
`report-auth-migration-clerk-to-firebase-2026-06-07.md` (owner-reviewed) + the 4-PR build plan.

**The migration is 4 sequenced, owner-approved PRs (same executor, STOP-for-approval between each):**
- **PR-1 (#206, DONE)** — backend edge guard ("Surface B" = `artifacts/api-server`): verify Firebase ID tokens.
- PR-2 (NEXT) — frontend `AuthContext` internals + Login/SignUp rebuilt natively on Firebase Auth (Google One
  Tap + Email/Password); client switches to send Firebase ID tokens; drop `@clerk/react`; `main.tsx` authorized.
- PR-3 — delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs`); remove the Clerk fallback
  **and** `@clerk/express` together; unmount `clerkMiddleware`; remove `clerkProxyMiddleware` + Clerk env.
- PR-4 — phone / SMS-OTP provider (reCAPTCHA v2 invisible; project `lazzyy-topper` on Blaze).

### PR-1 (#206) — what landed (5 files, all under `artifacts/api-server/`)
Branch `feat/auth-firebase-edge` from `45f733e`; squash-merged **`a3def5f`**. `.claude/` never staged.
- **NEW `src/lib/firebaseAdmin.ts`** — Firebase Admin init for the edge (mirrors the gateway: `VITE_FIREBASE_PROJECT_ID`
  + optional `FIREBASE_SERVICE_ACCOUNT_KEY`, else ADC). Exports `firebaseAdminApp` (or `null` if unconfigured).
- **NEW `src/middlewares/requireFirebaseAuth.ts`** — the dual-accept guard: (1) `verifyIdToken(bearer)` →
  `req.userId = decoded.uid`; (2) on failure, fall back to the **still-mounted** `@clerk/express` `getAuth(req)`;
  else `401 {ok:false,error:"Unauthenticated"}`. Augments `Express.Request` with `userId?: string`.
- `src/routes/admin.ts` / `src/routes/questions.ts` — `requireAuth()` → `requireFirebaseAuth`; read `req.userId`;
  dropped the `@clerk/express` imports from the route files. `x-user-id` forwarding to the gateway unchanged.
- `package.json` — added `firebase-admin@^13.7.0` (the one new dep; already in the lockfile via lazytopper).

### Option B (owner-confirmed) — the dual-accept lifecycle
PR-1 keeps `@clerk/express` mounted (the fallback's `getAuth` needs `clerkMiddleware`; the still-Clerk frontend
needs `clerkProxyMiddleware`). NO hand-rolled Clerk crypto; NO `jsonwebtoken`/`jwks-rsa`. The Clerk fallback +
`@clerk/express` are removed **together in PR-3**. Lifecycle: PR-1 adds Firebase verify + Clerk fallback (both
live) → PR-2 switches the client to Firebase tokens **and** migrates the admin allowlist → PR-3 removes the
Clerk fallback + `@clerk/express`. `/shared-api/questions/report` never breaks. Rejected Option A (hand-rolled
JWKS Clerk verification) as unjustified security-critical/throwaway code. The build doc's "drop `@clerk/express`
in PR-1" line is corrected → moved to PR-3. See DECISION_LOG (Option B).

### ⚠️ PR-2 FORWARD CORRECTION (admin allowlist) — do NOT lose
`admin.ts` `requireAdminRole` checks `req.userId` against **`ADMIN_CLERK_UIDS`** (Clerk ids). PR-1 deliberately
left this as-is. When **PR-2** switches the client to Firebase tokens, `req.userId` becomes a **Firebase uid**,
so every admin route would **403** until the allowlist is migrated. Therefore the **rename + revalue
`ADMIN_CLERK_UIDS` → `ADMIN_FIREBASE_UIDS` moves to PR-2 (not PR-3)**, with a bootstrap step: owner signs in
once via Firebase → capture the uid → set it in `ADMIN_FIREBASE_UIDS`. (A code comment in `admin.ts` notes the
deferral; that comment still says "PR-3" — PR-2 must update it.)

### Deploy-stage note (Railway) — NEW requirement from #206
`artifacts/api-server` now requires **`VITE_FIREBASE_PROJECT_ID`** + **`FIREBASE_SERVICE_ACCOUNT_KEY`** (or ADC)
in its Railway deploy environment to verify Firebase ID tokens. Without them `firebaseAdminApp` is `null` and the
edge relies on the Clerk fallback only (fine during the PR-1→PR-2 window; required real once PR-3 is Firebase-only).
Fold into the INFRA-4 backend-deploy env checklist.

### PR-1 gate evidence (all green)
- **CI `quality-gate.yml`**: PASS (1m29s, run `27100425116`) — frozen-lockfile install + root matrix 175/175 +
  mojibake + lazytopper build + ops matrix all green.
- **Codespaces (linux, pnpm 10.32.1)** — the gates that can't run on the Windows box: lockfile regenerated (only
  `pnpm-lock.yaml` changed, +8/−65, adds `firebase-admin` to api-server, committed in the PR); **api-server
  `typecheck` exit 0** (first real compile of the 2 new files; required building the `@workspace/api-zod`/`db`
  composite refs first); **api-server `build` (esbuild) exit 0** (`firebase-admin` externalized); root matrix
  **175/175**; lazytopper ops matrix **all 6 green** (the transient `llm-path 4/5` was a Codespace-only missing-
  ripgrep artifact — identical on trunk, unrelated to PR-1; CI installs ripgrep → 5/5).
- `scope:guard` is structurally **N/A** for an `artifacts/api-server`-only PR (its policy lanes are
  lazytopper-anchored — no `artifacts/api-server` lane); forbidden-files clean; diff confined to 5 files.

## ✅ INFRA ARC CLOSED THIS SESSION (4 items) — repo is healthy; NEXT SESSION PIVOTS TO PRODUCT
The whole arc this session was diagnosing + closing the infra tangle. As of trunk `5441060` all four are DONE:
1. **Lockfile fixed (#201)** — `pnpm-lock.yaml` regenerated to match `lazytopper/package.json`; frozen installs work on linux.
2. **CLAUDE.md corrected (#198)** — stale commands fixed (`verify-production-build.mjs`; `npx tsc -p tsconfig.app.json --noEmit`; the real gate bar; the two distinct `test:matrix:all`).
3. **CI LIVE (#198)** — `.github/workflows/quality-gate.yml` at the repo ROOT gates every PR into trunk + push to trunk: pnpm **10.32.1** frozen install → root matrix **175/175** → mojibake → **linux `vite build`** → ops matrix. Proven to RUN and to GATE (probe PR #202 went red on a planted mojibake). ripgrep installed in CI; `scope:guard` stays a LOCAL gate (working-tree-diff based → false-PASS on a clean CI checkout). No product-PR auto-merge (human gate retained).
4. **De-Replit COMPLETE (#199 PR-A + #204 PR-B)** — all Replit scaffold, the `@replit/vite-plugin-*` packages, `@replit/connectors-sdk`, and the 3 non-product stubs (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) removed. The repo is now **fully `@replit`-free in manifests + source + lockfile** (verified `grep` = 0). Workspace **12 → 9 projects**; lockfile shrank **~7,300 lines** (21,345 → 14,051). PR-B (#204) was the **first real PR through the new CI gate** — it went green.

**KEPT (real, NOT removed):**
- `artifacts/api-server/` — the real Express/Clerk/Postgres backend that proxies to the AI gateway.
- `artifacts/lazytopper-app/` — the vite build **OUTPUT TARGET**: `lazytopper/src` builds into its `dist/public/app` (served at `/app/`). Now a shell (its stub `src` went in PR-A); kept only as the output path.
- `lazytopper/` — the product (the ONE responsive website).

**Backend architecture (mapped this session):** layered — frontend `/api/*` → `api-server` (Express edge: Clerk auth, Postgres/Drizzle, questions/admin) → spawns + proxies AI to → `lazytopper/server/*.cjs` (the Gemini/Claude/tutor/check-solution gateway on port 3001). So "deploy the backend" = deploy `api-server` (which runs the gateway as a child) + provision Postgres.

## CI ACTIVATED (#198) — the safety net is LIVE; CLAUDE.md corrected
GitHub Actions CI now runs on every PR into `base/approved-thru-437` and on push to it. This is the FIRST
time CI has ever executed (the predecessor `lazytopper/.github/workflows/mojibake-guardrail.yml` was in a
SUBDIRECTORY — GitHub only registers workflows at the repo ROOT — so it never ran). **D39 RESOLVED.**
- **Workflow:** `.github/workflows/quality-gate.yml` (repo root; old mislocated file deleted). On an
  ubuntu-latest runner it gates the full bar: pnpm `--frozen-lockfile` install → root `scripts`
  `test:matrix:all` (**175/175**) → lazytopper `check:mojibake` → **`build` (linux `vite build`)** →
  lazytopper `test:matrix:all`. A red run blocks merge. Triggers scoped to trunk (PR-into + push-to);
  `concurrency` cancels superseded runs.
- **Squash-merged `9d772cb`** (3 legible commits: CLAUDE.md fix / CI workflow / cross-platform ops fixes).
  Final green run `27088156112`; **proven to gate** — throwaway PR #202 with a planted mojibake glyph went
  RED at the mojibake step, then was torn down.
- **Prereq cleared:** the stale-lockfile blocker that parked #198 last session was fixed on trunk by **#201**
  (regenerated `pnpm-lock.yaml` to match `lazytopper/package.json`). #198 rebased clean onto that.
- **Three Windows-only fragilities** that only surface under live linux CI were found + fixed inside #198:
  (1) pinned CI to **pnpm 10.32.1** — the lockfile's regen version; pnpm 11 leaves `npm_config_user_agent`
  empty on linux so the root `preinstall` guard (`case ...pnpm/*`) trips; (2) added a **ripgrep** install
  step — the ops audits shell out to `rg` with no fallback and ubuntu-latest lacks it; (3) fixed **hardcoded
  Windows path separators** in `bsre_spike_acceptance.mjs:50` (blocking) + `trig_legacy_retire_acceptance.mjs:29`
  (latent) to a cross-platform `[\\/]` regex. (BSRE is live product code — powers the TopicHub tutor
  `/api/mentor` path — so the check stays; only the separator was wrong.) Left alone: `styles_change_impact:25`
  `hasBackslash()` is an intentional non-portable-path DETECTOR; `feature_file_matrix.mjs` absolute Desktop
  paths are an owner-local tool, not in CI.
- **CLAUDE.md corrected:** verifier `verify-build.mjs`→`verify-production-build.mjs`; TS check
  bare `tsc --noEmit`→`npx tsc -p tsconfig.app.json --noEmit`; dropped dead `NODE_ENV/BASE_PATH`; documented
  the pnpm-workspace reality + the real gate bar + the two distinct `test:matrix:all`; added §6a (CI active;
  `scope:guard` stays a LOCAL gate — it inspects the working-tree diff, so a clean CI checkout is a false-PASS).
- **NOT in scope (deferred):** product-PR auto-merge — the human merge gate is retained until CI is proven
  over a series of real PRs. Authority: `report-unpark-198-ci-green-2026-06-07.md`
  (+ `report-ci-activation-blocked-2026-06-05.md` for the prior parked diagnosis).

## de-Replit PR-A DONE (#199) — safe scaffold + dead lazytopper-app stub (zero build/lockfile risk)
First, lockfile-INDEPENDENT slice of retiring Replit. Authority: `report-replit-removal-audit-2026-06-06.md`
+ `report-de-replit-pr-a-2026-06-06.md`. Build-safety verified: the product build (`lazytopper/vite.config.ts`)
imports ZERO `@replit` plugins and CI builds `lazytopper` only — these deletes cannot break the shipped app.
Branch `chore/de-replit-pr-a` from `2857871`; **70 files (69 deletes + 1 root `package.json` build-fix);
squash-merged `fec2f92`**. `.claude/` never staged.
- **Deleted:** `.replit`, `.replitignore`, `.tmp-lazytopper-artifact.toml` (root scaffold); `scripts/backup-to-drive.mjs`
  (Replit-only Drive backup, wired to no script); `artifacts/lazytopper-app/src/**` (64 — vestigial wouter/radix
  stub, NOT in the shipped bundle) + its `.replit-artifact/artifact.toml`. The lazytopper-app `package.json` +
  the `dist/` output target the real build writes to are **KEPT**.
- **Root build hygiene:** dropped dead-stub filters (`@workspace/lazytopper-app`, `@workspace/lazytopper-video`)
  from the root `package.json` `build`; **kept** `@workspace/api-server` + `lazytopper` (`scripts`-field edit → lockfile-safe).
- **Gates:** tsc 0; mojibake 0; root `scripts` `test:matrix:all` **175/175**; lazytopper ops matrix green;
  `git diff --check` clean; remote forbidden-file check clean. Two NON-blocking, NOT-this-PR FAILs:
  `scope:guard` = coverage gap (no policy lane models root-scaffold/`artifacts/**` deletes; manually verified
  clean; governance JSON untouched), and `pnpm install --frozen-lockfile` = PRE-EXISTING #198 staleness
  (`lazytopper/package.json` test-dep drift; this PR changes ZERO lockfile inputs — confirmed live). `vite build`
  / `verify-production-build.mjs` not runnable on Windows (linux-pinned binaries); root CI workflow parked in #198.
- **DEFERRED to PR-B (lockfile-coupled — behind the #198 lockfile regen):** delete whole packages
  `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (all workspace
  importers; lazytopper-mobile = owner-confirmed non-product Expo native path); remove `@replit/vite-plugin-*`
  + the 3 stub `vite.config.ts` + the 3 `catalog:` entries; `pnpm-workspace.yaml` allowlist cleanup
  (`stripe-replit-sync`, `@replit/*` exclude); orphaned root dep `@replit/connectors-sdk`; reconcile the root
  `typecheck` glob (`./artifacts/**` still hits the src-less lazytopper-app).
- **KEEP (owner-confirmed):** `artifacts/api-server/` — real backend (Express/Postgres/Clerk → AI gateway);
  retained in the root build; map the backend separately before touching it.

## de-Replit PR-B DONE (#204) — @replit packages + 3 non-product stubs removed (atomic, lockfile-coupled)
The lockfile-coupled remainder that PR-A deferred. Authority: `report-de-replit-pr-b-2026-06-07.md`.
Branch `chore/de-replit-pr-b` from `a0c7018`; **144 files (140 stub-dir deletes + 4 edits) + the lockfile
regen; squash-merged `5441060`**. The atomic set (all in one PR, or the build breaks):
- **A — deleted 3 non-product stub packages:** `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`,
  `artifacts/lazytopper-mobile/` (the Expo NATIVE-app path — NOT the product, which is ONE responsive website).
  All 3 were workspace/lockfile importers.
- **B — stripped the surviving `@replit` config:** `artifacts/lazytopper-app/vite.config.ts` →
  `plugins: [react(), tailwindcss()]` (removed `runtimeErrorOverlay` + the `REPL_ID`-gated cartographer/dev-banner).
- **C — removed `@replit` deps:** root `@replit/connectors-sdk` (orphaned once PR-A deleted its only consumer)
  + the 3 `@replit/vite-plugin-*` devDeps in `lazytopper-app/package.json`.
- **D — cleaned `pnpm-workspace.yaml`:** dropped the 3 `@replit` `catalog:` entries + the
  `minimumReleaseAgeExclude` block (`@replit/*`, `stripe-replit-sync`) + stale Replit comments. The `packages:`
  glob (`artifacts/*`) needed no edit; the linux-x64 `overrides` block is KEPT (build-platform pinning).
- **E — reconciled the root `typecheck`:** `--filter "./artifacts/**"` → `--filter @workspace/api-server`
  (the glob had started hitting the src-less `lazytopper-app`, which errored TS18003 after PR-A).
- **F — lockfile regen (Codespaces, pnpm 10.32.1):** the Windows box can't (the `minimumReleaseAge` registry
  check needs `time` metadata it couldn't fetch); regenerated on linux per the #201 path. Lockfile shrank
  ~7,300 lines. **The new #198 CI gated the PR green** — its first real-PR proof.
- Windows-side gates before handoff: `@replit` purged from all source; `git diff --check` clean; no
  `lazytopper/src`/handoff touched; `scope:guard` FAIL = the known `artifacts/**` coverage gap (D41), not a breach.

## 3 pre-existing test reds RESOLVED (#196) — mixed PR (product src/data + trackedTooling lanes)
The three acceptance suites that had been RED on trunk (tracked as D38) are now GREEN. Authority:
owner-approved diagnosis `report-preexisting-failures-diagnosis-2026-06-05.md` + independent re-verification
(`report-preexisting-failures-fix-2026-06-05.md`). Branch `fix/preexisting-failures` from `df88d29`; merged
`19b3029`. **3 lane-pure commits**, 7 files (+173/−393); `predictionTypes.ts` frozen; `.claude/` never staged.
- **Commit 1 (product/data) — mojibake re-encode.** `circles.proof.ts` (462 corrupted glyphs, 12 types) +
  `maths.caseBased.ts` (6 glyphs, 2 types) → correct Unicode via a 1:1 reversible map built from the EXACT
  in-file bytes. Only corrupted sequences changed; already-correct Unicode + the pre-existing BOM left
  byte-for-byte. Single-level UTF-8→cp1252 corruption (not double-encoded). **`test:mojibake` 1/3 → 3/3.**
  CORRECTION to the diagnosis: caseBased was a SECOND corrupted file it missed (signature single-level
  `Ã¢â€“Â³`→`â–³` ×5 + a subscript-n stored as `Ã¢`+ASCII-apostrophe+`â„¢`, a smart-quote artifact) — NOT the
  predicted double-encoded `ÃƒÂ¢Ã¢Ã‚Â³`.
- **Commit 2 (tooling + product orphan deletes) — stale-test cleanup.** bank-health was a stale test
  asserting never-built wiring (`bankHealthSummaryForSubject` exists nowhere; HPQ never imported the engine);
  the engine (`src/prediction/bankHealth.ts` + `buildTopicKeySources.ts`) was orphaned dead compute (nothing
  in `src/` imported it). Deleted both orphans + rewrote the test as a **retirement guard** (same idiom as
  `trig:retire`/`bsre:retire`): asserts the dead compute is gone + HPQ surfaces no computed health (no-fake-
  data doctrine). Script name KEPT — 4 harnesses invoke it (`test_matrix.json`, `software_testing_bot.mjs`,
  `agent2_test_guard.mjs`, `matrix_execution_acceptance.mjs`) — so no package.json change. **2/4 → 4/4.**
  canonical-generator was stale after the "Split giant files" refactor (`be5e2de`) relocated
  `generateUnifiedPracticeQuestions`/`canonicalFallback` from `PracticePage.tsx` into
  `practiceQuestionBuilder.ts`; re-pointed the two page-side checks to the live chain. Generator unchanged.
  **2/4 → 4/4.**
- **Commit 3 (tooling) — un-blind the mojibake checker.** `check-mojibake.cjs` broke its scan at 50 hits;
  the cap bounded the SCAN (not just output), so a heavily-corrupted file that filled it stopped the loop
  before later-sorting files were read. `circles.proof.ts` (96 corrupted lines) sorts before
  `maths.caseBased.ts`, so the checker never saw the second corrupted file — and corruption shipped past
  both the local gate AND the CI workflow (both run this checker). Now scans every file/line; a
  `DISPLAY_LIMIT` bounds only printed output. Proof: against base-corrupted inputs the old cap flags only
  circles; uncapped flags both.
- **CI finding (corrected twice; tracked D39).** A mojibake guardrail workflow FILE exists but at
  `lazytopper/.github/workflows/mojibake-guardrail.yml` — a SUBDIRECTORY. GitHub Actions only runs workflows
  at the repo-root `.github/workflows/`, so it has **never executed** (`gh workflow list --all` and
  `gh run list` both empty — zero workflows registered, zero runs ever). It is dormant. So corruption shipped
  for TWO independent reasons: CI mislocated (never runs) + the checker it/the local gate would run was
  capped/blind (now fixed). Full test matrix + scope-guard remain un-CI-gated.
- **Gates:** tsc 0; prod build 0; `verify-production-build` PASS; `scope:guard --mode mixed` SCOPE_GUARD_OK
  (product+trackedTooling); `git diff --check` clean; the 3 previously-red now GREEN (mojibake 3/3,
  bank-health 4/4, canonical 4/4); lazytopper `test:matrix:all` green; root `scripts` `test:matrix:all`
  **175/175**; exhaustive uncapped repo-wide rescan **0 corruption** in any content file. Trunk after #196:
  `19b3029`.

## HPQ Phase 1 — consistency + honesty DONE (#194) — gated src/data + page lanes
Highly-Probable-Questions now tells the SAME story as Exam Trends. **Logic/copy/plumbing only — no
content authoring (that is Phase 2); all questions kept (re-badge + de-emphasize, never delete).**
Authority: `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` + `report-hpq-refinement-audit-2026-06-05.md`.
Diff = exactly **3 files** (`src/data/highlyProbableQuestions.ts`, `src/pages/HighlyProbableQuestions.tsx`,
`src/utils/mergeBucketsByTopic.ts`; +140/−36). `predictionTypes.ts` frozen.
- **P0 — tier badge single source of truth.** `defaultTier` was hand-authored per bucket (74% must-crack;
  11/27 cards contradicted the locked tiers). NEW `LOCKED_TIER_SOURCE` table (verbatim from the locked doc)
  is flattened to a canonical-key→tier lookup; `getHighlyProbableQuestions()` overrides each bucket's
  `defaultTier` AND each question's `tier` from it — one chokepoint every consumer reads through, so it
  can't drift again. Executed-runtime: **0 contradictions (was 11/27); must-crack badge share 74%→42%**
  (per-question 74%→44%). Corrections: Polynomials/Heredity → must-crack; Real Numbers, Quadratic,
  Probability, Statistics, Coordinate Geom, Metals, Carbon, Control → high-ROI; Pair-of-Linear, AP, Human
  Eye → good-to-do.
- **P2 — dead confidence compute retired.** `deriveHPQConfidence()` ran on every load but the page renders
  no confidence UI → dead compute on a non-tier-aligned 5-signal basis. Call + import removed.
  `prediction/hpqConfidence.ts` KEPT on disk (untouched) for a future reconciled model; optional
  `confidenceScore?/Band?/Rationale?` type fields kept (still its return type). No other `src/` referent.
- **P3 — honest reframe (owner-approved copy).** H1 "Predicted Questions" → **"High-Probability Question
  Patterns"**; sub-head names the three locked evidence sources (4 years of papers + official blueprint +
  examiner-pattern analysis); disclaimer "high-probability patterns to prioritise — not predictions of the
  exact 2027 paper." Nav labels + stack blurbs aligned. NO confidence badge introduced.
- **P5 — plumbing.** `canonicalTopicKey()` (normalize + alias table, exported from mergeBucketsByTopic)
  keys the merge → duplicate "Pair of Linear Equations" and "Metals & Non-metals" cards collapse to one
  each (26 deduped cards). Science topic-allow filter matches on canonical key → the 3 silently-dropped
  Human-Eye seed questions survive (**Human Eye 1→4**); any future drop is DEV-logged (`console.warn`,
  stripped from prod), never silent.
- **Gates:** tsc 0; prod build 0; `scope:guard --mode product` SCOPE_GUARD_OK; `git diff --check` clean;
  matrix weightage/trig/llm/bsre green; `hpq:drift` green (changed=0). Pre-existing/unrelated reds
  (bank-health 2/4, canonical-gen 2/4, mojibake 1/3 `circles.proof.ts`) verified absent-on-base / not in
  diff. In-syllabus unchanged (3 recovered Human-Eye Q all IN). Report:
  `report-hpq-phase1-consistency-2026-06-05.md`. **Phase 2 = content authoring (see NEXT_ACTION).**
  Trunk after #194: `6d5b6ed`.

## scopeGuard monorepo path-prefix bug FIXED (#192) — tracked-tooling
`scope:guard` had false-FAILed on **every** product edit (3rd PR hit; see the #190 section's "known
monorepo path-prefix artifact" note — that artifact is now resolved). Root cause: `.git` is at the repo
root and the guard runs from `lazytopper/`, so `git diff` emits **git-root-relative** paths
(`lazytopper/src/...`) while the policy lane rules are **lazytopper-relative** (`src/`) → every product
file classified `unclassified` → `SCOPE_GUARD_FAIL`. **Fix (Option A, owner-approved):** normalize the
path *frame* in `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON untouched) —
`detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd; `toPolicyFrame()`
strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the anchor keep their
full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL); a no-blind-spot
invariant fails loudly if classified-count ≠ changed-count; coupled `git show HEAD:./package.json`
(cwd-relative) fix keeps the scripts-only package.json check reading the guard's own file. **The handoff's
`--relative` suggestion was REJECTED** (it emits only files under cwd → silently drops tracked changes
outside `lazytopper/` = false-PASS blind spot). Proven FAIL→OK on a product edit; tracked out-of-tree file
still seen+flagged; unclassified file → visible FAIL. Gates: tsc 0; `test:matrix:all` **175/175**; prod
build 0; verifier PASS; `git diff --check` clean. Follow-ups logged in OPEN_QUESTIONS (D32–D35). Trunk
after #192: `318c6b6`.

## Exam Trends BAND redesign DONE (#190) — step 6 complete; Option-B convergence #2
The flat ranked list (`src/pages/ExamTrendsRanked.tsx`, shipped #184) is now THREE collapsible priority
BANDS — **Must-crack** (open by default) → **High-ROI** (collapsed) → **Good-to-do** (collapsed). The band
IS the synthesized verdict, so the weight-vs-trend **Sort toggle was removed**; Subject + Science-stream
filters stay. Layout-only Option-B evolution of the ONE responsive component (no twin; verified 360/768/
desktop reflow grammar). The existing `TopicRow` is reused verbatim inside each band (name + trend chip +
marks-weight bar + ~N marks + HPQ + Open→Topic Hub + "⋯" Practice/Worksheet/Predicted/Add-to-selection);
within-band order = marks-weight desc. NEW: an **"Expect:" recurring-sub-pattern line** rendered ONLY on the
11 must-crack topics the locked doc supplies (High-ROI rows show none — no invented shapes); a **volatility
flag** ("Prepare deep · weight varies") on Trigonometry + Electricity in the existing amber caution tone
(no new color). Tiers/sub-patterns/volatility were transcribed **VERBATIM** from the owner-signed-off
authority `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` and co-located in the component as data —
NOT computed from `weight`/`trendTier`, and no `src/data/` or `src/lib/desktop/` edit needed (so the diff
is exactly **1 product file**, `src/pages/ExamTrendsRanked.tsx`, +406/−84). Design grammar preserved
byte-faithfully; honest empty states; in-syllabus only (corrected guard #188). The owner-locked tiers
(2026-06-05, model + 2 teacher overrides: Triangles→must-crack/Statistics→high-ROI; Heredity→must-crack)
**satisfy the D27 "re-derive priorities FRESH" prerequisite (step 5)** — tiering is now scientifically
derived + owner-locked, so the band-threshold open question is closed (bands are signed-off data, not a
computed threshold). Gates: `tsc --noEmit` 0; prod build 0; verifier PASS; `test:matrix:all` **175/175**;
`git diff --check` clean; forbidden patterns none. `scope:guard --mode product` reported FAIL listing the
file `[unclassified]` — the **known monorepo path-prefix artifact** (git root is `Lazytopper-Production`,
so diff emits `lazytopper/src/...` while the policy `product` rule is `src/`), manually verified as NOT a
real breach (the file matches `src/` relative to `lazytopper/`); not hacked around. Trunk after #190: `cfb3106`.

## Syllabus-correctness arc CLOSED (#186 RULER + #188 SWEEP) — gating guard GREEN
The full arc is now complete: verified → guard corrected (#186) → **content swept (#188)** → gating
`syllabusGuard` exits 0, `test:matrix:all` = **175/175 (incl. #19, previously red by design)**.
**#188 deleted the 93-item worklist** the corrected guard flagged: question banks Conversion of Solids
×46 (exemplar 42→19, ncert 24→14, pack2 50→37; canonical bank 6520→6474, exactly −46, spreads intact);
board-prep surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/
trends/topics/topicHubContent + the tutor teach-contracts. Owner decision was DELETE (not retag);
blurbs/contracts were REWRITTEN to stay syllabus-accurate. `keyIdeas` is a fixed 4-tuple, so removed
tutor teach-steps were replaced with marked in-syllabus steps (`[content-sweep 2026-06-04]`) —
structurally required, caught by the prod build (`tsc -b`), not by `tsc --noEmit`. `syllabusGuard.ts`
and `predictionTypes.ts` were NOT touched (content conforms to the guard; schema frozen). Diff = exactly
11 files, all `lazytopper/src/**`. **Deferred follow-up (D31):** the `polynomials` tutor contract still
teaches the polynomial *division algorithm* (out of 2026-27 quadratic-only scope) — the surface scan
deliberately omits bare "Division Algorithm", so it is NOT flagged; left out of scope, tracked for a
future guard-phrase + sweep PR. Trunk after #188: `e0395fc`.

## Syllabus guard CORRECTED to official 2026-27 + EXTENDED (#186) — RULER done (history)
The syllabus RULER is now correct and trustworthy (verified against the live official CBSE 2026-27
Class X syllabus — Maths 041/241, Science 086, cbseacademic.nic.in; owner-signed-off
`report-syllabus-verification-2026-06-04.md`). #186 fixed 3 correctness bugs and extended scope:
- **Step Deviation un-banned** (it is IN the official Statistics scope — the prior ban wrongly
  stripped an examined method); **3 confirmed-OUT Maths items added** (Area of Triangle in Coord
  Geometry; Conversion of Solids; cubic zeroes–coefficient); **Evolution-section sub-topics banned
  while Heredity/Mendel/Sex-Determination are PRESERVED** (board-assessed; two-way test-asserted);
  Maths citation fixed 2025-26→2026-27.
- **Reproduction registry bug fixed (HIGH):** reproductive health / family planning / safe sex vs
  HIV-AIDS is IN-syllabus → moved into `cbse_scope_bullets` (was wrongly excluded). Formative-only
  (Periodic Classification, Evolution section, Motor/EMI/Generator) vs truly-deleted (Sources of
  Energy, Mgmt of Natural Resources) relabelled with explicit `category` tags.
- **Guard EXTENDED to 24 board-prep surfaces** (HPQ, mocks, worksheets, practice/daily-mix,
  exam-trends/topic metadata, filters/config, **tutor teach-contracts**) via a curated word-boundary
  phrase scan (`SURFACE_BANNED_PHRASES`) — bare generics (Evolution, Generator, Motor, …) deliberately
  excluded to avoid false positives on prose ("gas evolution") + code identifiers (`dailyMixGenerator`).
  Strictly-board-prep doctrine: formative-only + deleted topics excluded from EVERY surface INCLUDING
  the tutor. Tests 10→45 (per-surface-category, two-way preserved-term, precision). Two stale
  doctrine-locks corrected (registry-acceptance reproductive-health check inverted; opsAcceptanceGuard
  Block 4b made precise).
- At #186 the gating guard was **intentionally RED** on a **93-item sweep worklist** (banks: Conversion
  of Solids ×46; surfaces: EMI/Motor/Generator across predicted/HPQ/config/trends/topics/topicHubContent
  + the tutor teaching Euclid's lemma & evolution evidence) — matrix 174/175 (only #19 red by design).
  **That worklist was the spec for the CONTENT SWEEP, now DONE in #188** (see the arc-closed section at
  the top): all 93 deleted/rewritten, gating guard GREEN, matrix 175/175. D26 is fully closed.

## Responsive redesign (Option B) — FIRST convergence DONE (#184)
Exam Trends is the first surface converged under the LOCKED Option-B decision: ONE responsive
component (`src/pages/ExamTrendsRanked.tsx`) renders at every width (~360px → desktop) and replaces
BOTH twins (the old desktop card grid `DesktopExamTrendsPage.tsx` + the old mobile tier list
`app/ExamTrends.tsx`, both deleted). `App.tsx` `/exam-trends` no longer does the `isDesktop ?
<Desktop/> : <Mobile/>` split — it renders the one component at all widths (still `DesktopShell`-
wrapped ≥1024px via `isDesktopShellRoute`, reflows fluidly below). Locked ranked priority-list:
trend-colored marks-weight bars, "Open" → Topic Hub, "⋯" reveals Practice/Worksheet/Predicted/
Add-to-selection, Subject + Science-stream + Sort (Marks weight | Trend), multi-select tray. Design
grammar reused exactly; real data only (28 topics, both subjects, stream filter, honest trend tiers +
HPQ counts, no fabricated %); proof tag omitted (no real `proof` field). Gates green (tsc, build,
scope:guard --mode product, matrix 137/137). This sets the PATTERN for the remaining Option-B
surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet). NOTE: the Exam Trends tiering/trend/
marks data is stale (D27) and must be re-derived fresh before the planned band redesign.

## Tutor teaching quality (RESOLVED on desktop — B2/#182, live-verified)
The concept_teach tutor now teaches in the owner-LOCKED style: answers the exact question
first (no Namaste/persona/flattery/filler-analogy openers, no "interactive above" narration);
stays strictly on the opened concept (no topic drift); organizes by marks with concrete board
examples; ends with exactly ONE step-marking follow-up offer. On "yes" it SOLVES ITS OWN
example with per-step `[½/1 mark]` CBSE step-marking — math spot-checked correct across both
subjects; plain-text notation (no LaTeX leak). General across subjects (Science conceptual is
not forced into a "prove it" offer). LIVE path = `server/prompts/promptLearn.cjs`
(`buildConversationalTeachSystemPrompt`) + the concept branch of `buildUserPrompt` in
`server/routes/mentorModeHandler.cjs` — NOT `promptTeachContract.cjs` (see DISCOVERIES D24).
Residual: occasional late analogy on a long first-teach message (~1/13 turns) — eval-set territory.

## Governance / gates
- scope:guard: **LIVE + monorepo-correct (#192)** — classifies `lazytopper/`-prefixed diffs correctly
  under `--mode product`; no longer false-FAILs every product edit (the path-frame bug that hit 3 PRs is
  fixed; `--relative` blind-spot fix rejected). NOTE: `git ls-files --others` is cwd-scoped, so **untracked**
  files *outside* `lazytopper/` are invisible to the guard (pre-existing; deliberately NOT widened — would
  false-FAIL on the untracked root `.claude/`; see OPEN_QUESTIONS D33). Was DEAD since `2081003`
  (a docs-cleanup chore) accidentally untracked `lazytopper/docs/project_memory/governance/
  repo_boundary_policy.json`, which two live scripts read; #176 restored it from history.
- `test:repo-boundary`: now RUNS again (4/5 checks pass). 1 pre-existing red:
  `vitest.config.ts` is tracked but matches no policy lane (`all_tracked_files_classified`)
  — backlog, deferred (see OPEN_QUESTIONS).
- LESSON (D23): a file-removal can silently break a live gate; `ci:smoke` runs only locally,
  NOT in CI, so the broken gate failed silently. Wiring `ci:smoke` into CI is the deeper
  fix (backlog).

## AI gateway status
- LIVE on LOCAL dev (non-stub): direct Gemini key in gitignored `lazytopper/server/.env`
  (`API_KEY` + `PORT=3001`); serverConfig auto-sets `AI_PROVIDER=gemini` + `STUB_MODE=false`.
  Boot proof: `Gemini: ON (gemini-2.5-flash) | Auth: direct-key`. Tutor (`/api/mentor`)
  and grader (`/api/check-solution`) both return real Gemini output locally.
- DARK in production until the Railway deploy (P0 ISSUE-009) + Clerk pk_live_ (P0 ISSUE-010).
- CONFIRMED 2026-06-02 (D22): testing the checker on the Vercel link returns "AI API request
  failed" — this is EXPECTED, NOT a bug. Vercel has no `/api/*` route to deploy to yet
  (ISSUE-009); AI features work ONLY on localhost (gateway up + `API_SERVER_PORT=3001`, per
  D19) until the Railway deploy.
- LOCAL DEV RUN: gateway = `npm run dev:gateway` (node server/index.cjs :3001); app =
  `API_SERVER_PORT=3001 npx vite` (:25246 → /app/). Both started SEPARATELY. See D19.

## Bank state
Total questions: ~6,318 (flat) / ~6,617 (incl. builders)
Authentic: 3,636 (58%) | AI-generated: 2,682 (42%)
Spreads: 332 (up from 266 pre-Sprint 1)
Tests: 137/137 PASS
PYQs: 760 total — all 4 main years complete
CBE Item Bank: 321 Qs (Maths 148 + Science 173)
CBSE Sample Papers (P5): 121 Qs (SP Maths 2022 + Science SQP 22-23 + OnBoard 2023)
CBSE Preboard SP1+SP2: 55 Qs (generated solutions, CBSE marking style)
Mojibake: 0 files affected
TopicKey orphans: 0
Filter system: ALL chips working
CBSE blueprint distribution: working (5-section parallel fetch)
COMPETENCY floor: gated by enforceCompetencyFloor flag
Render-test infra: Vitest 3.2.4 + Testing Library + jsdom (PR #160) — `npm test` in
  lazytopper/ runs src/**/*.test.tsx; 2 test files / 10 tests green (smoke + grammar);
  matchMedia polyfilled in src/test/setup.ts. Guard suite (137) unaffected.
Grammar primitives: PR #166 added src/components/grammar/ (Card, TileRow, Pill,
  SectionHeader, tokens, index) + the first real render test. TileRow reflows
  desktop↔mobile via a real @media(max-width:1023px) CSS rule (--lt-tile-cols var).
Mobile Home: PR #168 added src/pages/app/MobileHome.tsx (first page reflow) — the
  /browse cockpit now renders MobileHome below 1024px (isDesktop switch in App.tsx),
  stacking the 4 destinations via TileRow. Desktop DesktopHome render byte-identical.
  Shared firebase-free src/lib/desktop/homeDestinations.tsx (PRIMARY_CARDS + loginUrl)
  is the single source of truth for both Home variants. Vercel production deploy GREEN.
Mobile landing: PR #170 added src/pages/MobileWelcome.tsx — /welcome renders a
  swipe carousel (native CSS scroll-snap, 4 frozen v4 SVG cards) below 1024px
  (isDesktop switch in App.tsx). Desktop Welcome.tsx UNTOUCHED (zero diff). Sticky
  "Start free" → /browse (no gate); honest sub-line "7-day Premium trial — then free
  Basic, upgrade anytime." (never "then paid"). Vercel production deploy GREEN.
Mobile Home polish: PR #172 rebuilt src/pages/app/MobileHome.tsx to the owner-locked
  polish design (mobile_home_locked_final.html): illustrated gradient SVG icons per
  destination, orient-before-act order for new students, persistent per-row hints, and
  an inspiring Mistake-Intelligence panel with a clearly-labelled SAMPLE report + honest
  "Start free — find my reasons" CTA (real-data wiring on the firebase-free boundary;
  signed-in shows an honest empty state, never invented counts). BottomNav (App.tsx)
  recoloured to the light app grammar (white surface, soft border, green active /
  muted-slate inactive) and expanded 3→5 tabs (Home / Exam Trends / Practice / Check /
  Me) on canonical routes; visibility gate intact. theme-color #58cc02→navy #0f1b33
  (index.html) kills the green browser-chrome banner. Global public navbar suppressed on
  mobile /browse + /welcome (isMobileSelfChromedRoute, gated on !isDesktop) so each
  mobile page shows ONE locked-design brand bar — Search no longer on mobile Home
  (owner-approved; not re-added). Desktop byte-identical. Tests 19→32. Vercel production
  deploy GREEN.
Production build: GREEN. PR #162 added `exclude` to tsconfig.app.json so `tsc -b`
  (Vercel's `npm run build`) no longer compiles the dev-only test files. Vercel
  production deploy for the merge commit confirmed Ready/SUCCESS.
Dev tooling: PR #164 decommissioned the dead blackbox/tracker/pmem memory
  experiment (16 files: scripts + tools/pmem + tools/project-memory-blackbox-ext +
  blackbox.yml + 20 npm scripts). Repaired start:quick/start:safe to use the REAL
  `tsc -p tsconfig.app.json --noEmit` (killed the false-green bare `npx tsc --noEmit`).
  PRESERVED: .project_memory/ops/, docs/project_memory/, all scripts/ops/*,
  serverConfig.cjs. Vercel production deploy GREEN. Repo-wide refs to experiment: 0.

## Recent PRs (post-handoff backfill)
#152 — Handoff post-#150+#151
#153 — fix: filter UX redesign (student-language chips, pending/committed)
#154 — fix: source filter + chip constraints + ISSUE-006/007
#155 — fix: practice engine marks/section/competency/blueprint
#156 — docs: handoff post-#153+#154+#155
#157 — content: Sprint 1 CBSE CBE Item Bank + P5 Sample Papers (442 Qs)
#158 — content: CBSE Preboard SP1+SP2 generated solutions (55 Qs)
#159 — docs: handoff update post-#157+#158
#160 — chore: Vitest + Testing Library render-test infrastructure (tooling-only)
#161 — docs: handoff update post-#160
#162 — fix: exclude test files from production app tsconfig (Vercel green confirmed)
#163 — docs: handoff update post-#162
#164 — chore: decommission dead blackbox/tracker/pmem tooling + false-green tsc fix (Vercel green)
#165 — docs: handoff update post-#164
#166 — feat: shared responsive grammar primitives + first render test (Vercel green)
#167 — docs: handoff update post-#166
#168 — feat: mobile Home layout for /browse (reflow cockpit below 1024px) (Vercel green)
#169 — docs: handoff update post-#168
#170 — feat: mobile landing swipe carousel for /welcome (Vercel green)
#171 — docs: handoff update post-#170
#172 — feat: mobile Home polish + 5-tab light BottomNav + single brand bar <1024px (Vercel green)
#173 — docs: handoff update post-PR #172 (mobile Home polish; Vercel green)
#174 — fix: check-solution parse reliability (force JSON output + raise token cap; local-dev verified)
#175 — docs: handoff update post-PR #174 (check-solution parse fix; AI gateway live local; D19–D21)
#176 — fix: restore repo_boundary_policy.json (re-arm scope:guard + test:repo-boundary + ci:smoke)
#177 — docs: handoff update post-PR #176 (scope:guard re-armed; product decisions; D22–D23)
#178 — feat: tighten check-solution grading prompt (fix D21 over-classification; scenario-matrix measured; Vercel N/A — server-side)
#179 — docs: handoff update post-PR #178 (grading-prompt tightening; D21 resolved)
#181 — feat: wire concept tutor into desktop TopicHub (per-row "Learn this"; reuse ConceptTeachDrawer)
#182 — feat: tighten concept teach-prompt to LOCKED style (direct/no-fluff/on-concept; self-solved CBSE step-marking; live-verified)
#183 — docs: handoff update post-PR #182 (tutor visible + teaching LOCKED; pivot to responsive redesign)
#184 — feat: Exam Trends ranked-list responsive redesign (FIRST Option-B convergence; one component retires both twins; Vercel green)

## Parked / not-yet-merged branches
- **PR B (Part 1) — grading-prompt tightening — PARKED.** Committed on branch
  `feat/check-solution-grading-prompt` (`204ac7c`), NOT merged. Merges next, after this docs
  PR, once synced onto `1e9bd04`. (T4 accepted as Option 1 — documented boundary case; 3/19
  acceptance reds noted pre-existing/deferred.)

## Source breakdown

| Source | Authentic | Files | Auth status |
|---|---|---|---|
| NCERT | 636 | 26 *.ncert.ts | YES |
| Exemplar | 910 | 26 *.exemplar.ts | YES |
| PYQ (board) | 760 | 100 *.pyq*.ts | YES |
| SQP | 69 | various | YES |
| APQ | 215 | various | YES |
| Chapterwise | 549 | various | YES |
| CBE Item Bank | 321 | 26 *.cbe.ts | YES |
| P5 Sample Papers | 121 | 26 *.sp.ts | YES |
| Preboard SP1/SP2 | 55 | 13 *.preboard.ts | YES (generated) |
| AI-Pack (pack1/2/3) | — | various *.pack*.ts | NO |
| Synthetic (AR/Proof) | — | various | NO |

## Open P0 issues (must fix before launch)

| Issue | Fix | Effort |
|---|---|---|
| ISSUE-009: API gateway 404 in production | Railway deploy + vercel.json /api/* rewrite + VITE_API_BASE | HIGH |
| ISSUE-010: Clerk pk_test_ keys in production | Vercel env var change to pk_live_ | XS |

## Open P1 issues (before wide launch)

| Issue | Description | Effort |
|---|---|---|
| Practice session debrief | End-of-session results screen | M |
| PYQ 2019-20 extraction | After download from cbse.gov.in | M |
| GitHub Actions CI | Run 6 validations on every PR | S |
| practiceFilterGuard.test.ts | Tier 3 test for competency floor | S |
| Case-Based "Easy" re-tag | Find-replace fix | XS |
| TopicKey cleanup | 51 AI-Pack Title Case keys | XS |
| check-solution eval set | 40-60 graded answers as launch gate | M |
| ~~D21: check-solution OVER-classifies as conceptual~~ RESOLVED (#178) | Grading prompt tightened + measured 6/9→8/9 on T1–T9; sign-misread now SILLY, propagated errors single-root-cause, missing→null, unbalanced→presentation. T4 = accepted boundary case (see DECISION_LOG). | DONE |
| Rate limiting on API gateway | Bundle with gateway PR | XS |
| Repo-wide solutionSteps step-mark audit | Older questions missing [N mark] prefix | M |
| AR/Section/Marks tagging audit | Some AR questions tagged as Section D 5mk | S |

## Open P2 issues (post-launch)

CFPQ OCR extraction (300 image-only Qs) | K2D Mistake Intelligence aggregation |
Pack regeneration with Claude | TutorDrawerV2 | isPYQ backfill |
Diagram SVG generation (116 tagged questions) | PYQ 2021-22 Term II adaptation |
PYQ 2018-19 (heavy banned topic overlap) | Sentry/error monitoring backend

## Next safe actions (in order)

1. **CONTENT SWEEP (HIGH, NEXT)** — clean the 93-item worklist surfaced by the corrected guard
   (banks: Conversion of Solids ×46; surfaces: EMI/Motor/Generator + tutor teaching Euclid's lemma &
   evolution evidence). Turns the gating syllabusGuard + matrix #19 GREEN. Completes D26.
2. Re-derive Exam Trends priorities FRESH (tier+trend+marks) [D27]; recheck HPQ counts → then the
   Exam Trends band redesign (Must-crack / High-ROI / Good-to-do).
3. Then the other Option-B surfaces (TopicHub + Formula/Notes, Check & Improve, Me/Progress, Worksheet).
4. API gateway Railway deploy with rate limiting bundled (P0); Clerk pk_live_ switch (P0).
5. check-solution eval set (launch gate, P1); GitHub Actions CI + practiceFilterGuard.test.ts (P1).
6. Case-Based "Easy" re-tag (XS); repo-wide solutionSteps step-mark audit (M); AR/Section tagging audit (S).
7. Practice session debrief (P1); PYQ 2019-20 extraction (after download).

## Confirmed launch domain
lazytopper.in (owner-confirmed 2026-06-01 — NOT .app; earlier ".app" was wrong).
Verify DNS in Vercel before P0 gateway work starts.

## Owner clarifications (2026-06-01) — LOCKED
- Trial = ALL features for 7 days (full tutor + checker + everything), then reverts to
  free Basic. Gate is trial-not-paywall during those 7 days. No client-side premium/trial
  activation (doctrine unchanged): trial state comes from server/admin only.
- Fully responsive across ALL screen sizes — one fluid layout adapts at every width, NOT
  a 1024px desktop/mobile twin switch. This is more work than porting a mobile twin and is
  the target for the redesign (Track A).
- PR numbering follows git (next sequential, #175+). "PR-1..8" in the Track A breakdown are
  logical labels — map them to real git numbers.
- Two-track build, LOCKED: Track A (design/UI — fluid responsive redesign) + Track B
  (content: interactives via Claude, proofs, formula sheets, pre-generated PDFs) with
  robust content QA. Source specs are owner/architect-held (LazyTopper_Learn_Flow_Spec_
  LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md) — NOT yet committed to this repo.

## Operating model unchanged
Chetan = owner/merger | Claude chat = architect/planner | Claude Code = executor
Co-Authored-By: Claude Opus 4.8 (1M context)
