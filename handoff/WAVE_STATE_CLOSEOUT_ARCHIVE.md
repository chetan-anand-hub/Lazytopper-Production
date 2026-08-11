# WAVE CLOSEOUT STATE — updated 2026-08-09, controller dispatch #1

TRUNK: `eeafb99b0c437998067478f603af66d32e431b58` — re-derived via `git ls-remote origin base/approved-thru-437`
OPEN PRs at wave open: **NONE** (`gh pr list --state open` → empty output). No ME-C PR, no handoff PR.

⚠ **PROVENANCE — read before trusting anything here.** This file is the CLOSEOUT controller's own
work product. `CONTROLLER_WAVE_CLOSEOUT.md` at repo root is a **controller transcription** of an
owner attachment, not the owner's original bytes — it was NOT on disk when the wave opened.
`LazyTopper_Controller_Subagent_Model.md` and `CONTROLLER_ADDENDUM_Context_Safeguards.md` are prior
controllers' transcriptions, likewise. All three are UNTRACKED and must stay untracked.

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| HANDOFF-CATCHUP | `handoff/` is wrong, not merely stale | `handoff/**` only | **PUSHED DRAFT — awaiting owner `gh pr ready`** | **#651** | CI `31316045316` PASS on head `cb8fe445`; 7 files, all `handoff/` |
| EXPORT-PERF | a DPDP export a student cannot complete | `lazytopper/server/services/accountExport.cjs`, `lazytopper/src/services/accountDataService.ts`, tests | **PUSHED DRAFT — LIVE-VERIFY OWED** | **#652** | CI `31316880420` PASS on head `b9ece7da`; 10374ms → 810ms |
| CONTAINER-GATE | nothing in the repo builds the image | `.github/workflows/**` + new script | **PUSHED DRAFT** (stalled once, resumed, recovered) | **#653** | CI `31318183353` Container Boot PASS 2m52s; **added wall-clock ZERO** |
| SUPPLY-2 | Dependabot at the root | ⚠ **allowlist CORRECTED — see below** | **PUSHED DRAFT** | **#654** | CI `31319023732` PASS on head `19a68ec0`; **57/121 advisories, 4/4 criticals** |

### ⚠ SUPPLY-2 ALLOWLIST CORRECTION — do not dispatch it on the DPDP-B close-out's list
HANDOFF-CATCHUP reports that the DPDP-B close-out's SUPPLY-2 allowlist **names the wrong file**: root
`package.json` has **no `pnpm.overrides`**; the `esbuild "0.27.3"` pin lives in **`pnpm-workspace.yaml`**.
Granting the wrong file reproduces the **unsatisfiable-allowlist** failure DPDP-B already made once
(a controller error that wave). → SUPPLY-2's allowlist must be `.github/dependabot.yml`,
`pnpm-workspace.yaml`, `lazytopper/package.json`, `pnpm-lock.yaml`. **Flagged as the subagent's
verified finding, relayed — I have not opened these files.**

### ⚠ FOLD INTO SUPPLY-2: `tsx` is in the WRONG dependency section
`[FU-TSX-DECLARED-IN-DEVDEPENDENCIES]`. Collides on exact path (`lazytopper/package.json`) with
SUPPLY-2, so it goes there, not in its own lane. See the decision ledger for why this is more than
a one-line fix.

## DISJOINTNESS
- HANDOFF-CATCHUP: `handoff/**`
- EXPORT-PERF: `lazytopper/server/services/accountExport.cjs` + **exactly one** src path,
  `lazytopper/src/services/accountDataService.ts` + its tests
- CONTAINER-GATE: `.github/workflows/**`
- SUPPLY-2: `.github/dependabot.yml`, `pnpm-workspace.yaml`, `package.json` manifests, `pnpm-lock.yaml`
- ME-C (parallel, not mine): `lazytopper/src/**`

⚠ **THE ONE OVERLAP RISK, and the decision taken.** The brief says my lanes are "exact-path disjoint"
from ME-C. That is TRUE only under a constraint the brief does not state: EXPORT-PERF's allowlist
includes `lazytopper/src/services/accountDataService.ts`, which is **inside ME-C's `lazytopper/src/**`
prefix**. It is not prefix-disjoint; it is disjoint only file-by-file.
→ **Decision:** EXPORT-PERF is allowed **exactly one** path under `src/` — that service file — named
literally, no globs. It is explicitly FORBIDDEN `MeProgressPage.tsx` and `AccountDataControls.tsx`,
the two files ME-2 is most likely to touch (`#646` put `<AccountDataControls />` into
`MeProgressPage.tsx`). **Reason:** a glob allowlist here would have made a collision with ME-C
possible and invisible until merge.
✓ verified disjoint 2026-08-09 against `gh pr list --state open` (empty).

## VERIFIED BEFORE DISPATCH #1 (controller, metadata only — no product source read)
- `024db49` (#647) and `6ea6e59` (#649) — `git merge-base --is-ancestor <c> origin/base/approved-thru-437`
  → **both ANCESTORS**, and both sit BELOW `eeafb99b` (#650) in `git log --oneline`. **#650's
  `[CURRENT]` claim that they are "not on trunk" is FALSE.** Spec claim CONFIRMED.
- Five unrecorded commits all present on trunk: `#635 baf9b67a`, `#644 3cf01287`, `#645 3d6dce0c`,
  `#646 3d3a32a9`, `#648 376e30b0`. Spec claim CONFIRMED.
- `git ls-tree -r --name-only origin/base/approved-thru-437 -- handoff/` → **no
  `WAVE_STATE_WAVE_DPDP_B_ARCHIVE.md`**. (`ls-tree`, not `cat-file -e` — the latter reports false
  ABSENT on this platform.) Spec claim CONFIRMED. **Fourth single-disk exposure.**
- `handoff/WAVE_STATE_WAVE_DPDP_B_LIVE.md` on disk, untracked, **39,759 bytes**, mtime Aug 9 15:11.
- Note: `handoff/WAVE_STATE_ME_B_ARCHIVE.md` IS tracked on trunk; ME-B archived correctly. The gap
  is DPDP-B's alone.

## DECISIONS MADE THIS WAVE
- **Wrote `CONTROLLER_WAVE_CLOSEOUT.md` to disk before any dispatch.** Reason: it arrived as an
  attachment and was not on disk; two artefacts have nearly died this way.
- **Dispatched HANDOFF-CATCHUP and EXPORT-PERF concurrently rather than sequentially.** Reason: the
  brief sequences them only because HANDOFF-CATCHUP "corrects a record the others will be recorded
  in" — but the others are recorded in MY handoff draft, not in their own PRs, so the dependency is
  not real. EXPORT-PERF is an owner-observed production break on a legally-required flow and should
  not queue behind a docs lane. They are path-disjoint.
  → **RAM mitigation:** parallelism here is bounded by RAM, not file-disjointness (two concurrent
  `test:matrix:all` runs have OOM-killed this box). HANDOFF-CATCHUP is instructed to run only the
  docs gates locally and let CI carry the full bar, so the two lanes cannot collide on memory.
- **EXPORT-PERF gets one literal src path, not a glob** — see the overlap note above.
- **CONTAINER-GATE before SUPPLY-2** when the first two return. Reason: CONTAINER-GATE is the gate
  that would have caught the `tsx` boot crash, and SUPPLY-2's acceptance ("a Dependabot PR that
  opens and passes CI") is measured against a baseline CONTAINER-GATE makes trustworthy.

## FU ENTRIES COLLECTED
- `[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]` — dispatched to HANDOFF-CATCHUP to record
- `[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]` — dispatched to HANDOFF-CATCHUP to CLOSE, naming the mechanism
- `[FU-EXPORT-FETCH-NO-TIMEOUT]`, `[FU-EXPORT-502-READS-AS-NOT-BUILT]`,
  `[FU-ERASE-SEQUENTIAL-WALK-ABORT-RISK]` — dispatched to EXPORT-PERF
- `[FU-DEVDEPS-SHIP-TO-PRODUCTION]`, `[FU-BRIEF-INERT-MUTATION-SPECIFIED]` — queued for
  SUPPLY-2 / CONTAINER-GATE

## ⚠ CONTAINER-GATE RECOVERY BLOCK — read this if I die before the lane returns

**The subagent STALLED** — harness reported *"no progress for 600s (stream watchdog did not
recover)"*. Its last visible line: the PR-relevance classifier correctly flags a relevant PR, and it
was about to prove the **SKIP** path fires on a throwaway branch.

**What survived (verified by metadata only — I did not read its code):**
- Worktree `C:/Projects/LT-worktrees/container-gate`, tree **CLEAN**
- Branch `ci/wave-closeout-container-gate`, **one commit `a4791733`** —
  *"ci(container): build and boot the image, because nothing here ever did (CONTAINER-GATE)"*
- **NOT pushed** — `git ls-remote --heads origin 'ci/*'` returned empty. No PR.

**What did NOT survive: the EVIDENCE.** No report reached disk (the brief has it written after gates
pass, and gates never passed). The mutation result, the cost measurement and the per-sighting catch
analysis existed only in that agent's context. ★ **This is the standing rule failing in the one gap it
leaves open: "write the report to disk FIRST" means first-after-gates, and a lane can die BEFORE
gates.** → `[FU-SUBAGENT-DIES-BEFORE-GATES-LOSES-EVERYTHING]` — **the fix is a partial report written
at the first substantive finding, not at the first green gate.** I have told the resumed lane to do
exactly that before it does anything else.

### ⚠ CORRECTION — MY DIAGNOSIS OF THE STALL WAS WRONG (added after the lane returned)
I told the resumed lane not to re-enter *"whatever ran ten minutes with no output"*, assuming a Docker
build or a CI watch. **Both were wrong.** The lane reports the stall was **the harness's own Bash
safety classifier returning "temporarily unavailable"** — and that **no long-running local command was
ever started.** ★ **Docker is not even installed on this box** (`docker: command not found`), so no
local build was ever possible and nothing competed with `EXPORT-PERF`. **The stall was infrastructure,
not the lane's design.** Keeping the wrong version visible because the recovery instruction below was
written on it — **the outcome was right and the reason was wrong**, which is the failure mode this
project has a standing rule about.

**Recovery taken:** resumed the same agent from its transcript rather than dispatching fresh —
its context holds the evidence, and a fresh lane would have to re-derive what is already committed.
Instructed to (1) dump what it knows to disk first, (2) then continue, (3) not re-enter whatever ran
ten minutes with no output, and (4) treat a gate that cannot complete on a dev box as a **reportable
cost finding**, which is what the brief already asks about.

**If the resume also fails:** dispatch a fresh subagent pointed at commit `a4791733` in that worktree.
It must NOT rebuild from scratch — it must re-derive the evidence for what is already committed:
the tsx mutation going RED with the mutation proven applied, the measured cost delta, and the
per-sighting catch analysis. ⚠ **The unpushed branch is the only copy of that commit.**

## BLOCKED / OWNER DECISIONS OWED
- **Whether a DPDP export must inline the student's uploaded images at all.** Legal, not engineering.
  EXPORT-PERF is instructed to RAISE it and NOT decide it. Raise alongside `[FU-DPDP-GUARDIAN-CONSENT]`.

---

## HANDOFF DRAFT — prose, ready to paste

### Lane HANDOFF-CATCHUP — PR #651 (DRAFT), CI `31316045316` PASS on head `cb8fe445`
`handoff/` now describes trunk. `#650`'s `[CURRENT]` was demoted, not edited, and replaced: `#647`
and `#649` are on trunk and were being reported as unshipped. The five commits with no lane record
(`#635`, `#644`, `#645`, `#646`, `#648`) got one, sourced from the DPDP-B close-out rather than
reconstructed. **`WAVE_STATE_WAVE_DPDP_B_ARCHIVE.md` is now tracked**, byte-identical
(`38b00b1f71c5b958f1a53c57b8bbb014e43a9b16`, both sides, via `git hash-object`) — the fourth
single-disk exposure, and the first one closed before it needed rescuing.
Census: 6 files, `dropped=<empty>` on four; the two "dropped" headings on `CURRENT_STATE.md` and
`NEXT_ACTION.md` are the intended demotions, with their twins present in the after-set. A control
that deleted one heading reported **both** duplicate copies, so the census can fire.
Mojibake: `ADDED_LINES=735 HITS=0 CONTROL_INJECTED_DETECTED=true`, `enforced_hits=0`,
`report_only_hits=12` all pre-existing.

### ★ What this lane DISPROVED in its own spec — three corrections to my brief
1. **Defect 1 was STRUCTURAL, not carelessness.** `#650`'s claim was **TRUE when authored** (at
   `376e30b0`) and became false between authoring and merge. My brief presented it as simply false.
   → `[FU-HANDOFF-DOCS-PR-STALE-AT-MERGE]`: *a handoff PR not merged the same hour must re-check its
   own headline before merge.* **This is the more useful finding than the one I dispatched.**
2. **Defect 2 overstated it.** The five commits DO appear in `#650` by PR title — it flagged the gap
   itself. *"No lane record"* is right; *"no record anywhere"* is not.
3. **`[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]` was nearly right, not exact.** `step_solutions` **IS**
   declared — `lib/db/src/schema/stepSolutions.ts`, Drizzle `pgTable`, **zero importers**, and
   `drizzle-kit push` is manual and in no boot path. `generated_questions` has **both** a schema and
   a boot-time `CREATE TABLE IF NOT EXISTS`. **The remedy is one command, not schema work.** The cost
   conclusion stands; the mechanism I relayed did not.

### ★★ The most consequential thing found, and it is not what the lane was sent for
**`#644` merged with `tsx` in `devDependencies`, against the owner's explicit ruling** — recorded in
the DPDP-B close-out as *"that is a change request before merge."* **The ruling existed only on one
disk.** → `[FU-TSX-DECLARED-IN-DEVDEPENDENCIES]`.
**A ruling recorded only in an untracked state file is a ruling that does not exist.** That is the
same failure as the archive gap, one level up: it is not that the record was lost, it is that an
owner decision was silently not carried out and no gate could see it. **This is the wave's headline.**

### ★ `#647` got WORSE by merging
As a draft, "consumer with no producer" was a **branch constraint**. Merged, it is **shipped code no
student can reach**. Recorded as a live risk in four files, not a note.

### FU ids — new / closed / kept open
- **NEW:** `[FU-TSX-DECLARED-IN-DEVDEPENDENCIES]`, `[FU-HANDOFF-DOCS-PR-STALE-AT-MERGE]`
- **CLOSED:** `[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]` (mechanism named)
- **VERIFIED + REFINED:** `[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]`
- **CARRIED:** `[FU-TOPICHUB-CONCEPT-PRODUCER]`, `[FU-CONCEPT-LABEL-IS-THE-ONLY-CONCEPT-ID]`,
  `[FU-RETRY-NO-BUILD-CHUNK-YET]`, `[FU-DEVDEPS-SHIP-TO-PRODUCTION]`, `[FU-DPDP-GUARDIAN-CONSENT]`,
  `[FU-TSX1-NO-CONTAINER-GATE]`, `[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]`
- **SURFACE_TRACKER: no cell flips** — docs-only lane, ran no live verification. One of the two
  reasons the board refused a DPDP row is discharged (the lane record exists); the owner decision remains.

### ⚠ A DIRECT CONTRADICTION OF THE WAVE BRIEF — unresolved, owner's call
My brief states **"Railway's Wait-for-CI is back ON."** HANDOFF-CATCHUP reports it is **still OFF**,
and draws the consequence: *a merge now deploys with no check having passed.*
**I cannot adjudicate this — I do not read dashboards and neither claim is mine.** Both are on the
record with provenance. **It matters for SUPPLY-2**, whose brief tells the lane that a Dependabot
failure may be skipping a deploy — if Wait-for-CI is OFF, that reasoning does not hold.

### Decisions made, with the reason
- **`tsx`→`dependencies` folds into SUPPLY-2, not its own lane.** Exact-path collision on
  `lazytopper/package.json`; two lanes editing one manifest is how a lockfile race starts.
- **SUPPLY-2 is dispatched on a CORRECTED allowlist** (`pnpm-workspace.yaml`, not root
  `package.json`). Reason: the inherited list was unsatisfiable, and shipping an unsatisfiable
  allowlist is a failure this project has already paid for once.
- **CONTAINER-GATE dispatched before SUPPLY-2**, unchanged from dispatch #1's reasoning.

---

### Lane EXPORT-PERF — PR #652 (DRAFT), CI `31316880420` PASS on head `b9ece7da`
The DPDP export that ran ~120 s and died under the api-server now completes: **10374 ms → 810 ms**,
with **identical 667 I/O ops and 625 records** — the same work, not less work. A 5xx no longer tells
the student the feature does not exist, and the client now fails honestly on a timeout instead of
waiting on an upstream abort. ⚠ **Not accepted until a real download completes in production** on an
account with uploaded photos.

### ★★ What this lane DISPROVED — the spec sent it at the wrong bottleneck
1. **★★ Cause #1 was real but NOT DOMINANT.** Measured **MAX CONCURRENT I/O = 1** and **327 sequential
   round trips for 300 documents in ONE location.** The critical path was **O(documents), not
   O(locations)**. → **Fixing only the 29-location walk — exactly what the brief prescribed — would
   have left ~300 of 327 round trips untouched AND PASSED A LOCATION-LEVEL TEST.** A green suite over
   a still-broken flow. The lane fixed both levels. `[FU-EXPORT-GETALL-BATCHING]` NEW.
2. **★ The prescribed 5xx fix was necessary but INSUFFICIENT.** `classifyFailure` is only reached when
   the body **parses as JSON**. Production's 502 is an **HTML edge page**, so it hits the earlier
   `!parsed` return — **which is where `NOT_LIVE_MESSAGE` actually came from.** Fixed in both places,
   on the export **and** erase paths.
3. **`app.ts` is NOT under `lazytopper/server/`.** `proxyReq.on("error")` lives in
   `artifacts/api-server/src/app.ts`. My brief implied the wrong tree.
4. **The erasure claim was CONFIRMED, not disproved** — sequential walk plus one-at-a-time
   `delete`/`ref.delete`/`file.delete`. **Reported, not fixed**, as instructed.
   `[FU-ERASE-SEQUENTIAL-WALK-ABORT-RISK]` OPEN/CONFIRMED — **needs its own lane and a throwaway account.**

Gates: `tsc test` **caught a TS2493 the app config cannot see** — the separate-gate rule earning
itself again. 3 mutations one at a time, each restore sha-verified against the mutated file
(`feba1a22`), plus 2 revert-to-trunk red proofs.

### FU ids — new / closed / kept open
- **CLOSED:** `[FU-EXPORT-FETCH-NO-TIMEOUT]`, `[FU-EXPORT-502-READS-AS-NOT-BUILT]`
- **NEW:** `[FU-EXPORT-INLINE-BLOBS-LEGAL-CALL]`, `[FU-EXPORT-GETALL-BATCHING]`
- **OPEN/CONFIRMED:** `[FU-ERASE-SEQUENTIAL-WALK-ABORT-RISK]` · **referenced:** `[FU-DPDP-GUARDIAN-CONSENT]`

---

### Lane CONTAINER-GATE — PR #653 (DRAFT), CI `31318183353` Container Boot PASS 2m52s
The repo now **builds the image and boots the container**, and asserts the gateway actually started
from **inside** it. ★ **Added wall-clock cost: ZERO — observed, not modelled.** Baseline PR time
**6m57s median (n=10)** → **7m05s**; Container Boot ran **concurrently** and finished **4m13s
EARLIER** than Quality Gate. `docker build` was 150.5s of it on a **cold** cache; boot+assert+probes
**2.9s**. No cheaper variant needed on cost grounds, though relevance-gating is built in and proven
**both ways** (`src/`+`handoff/` → `WILL_RUN false`; any `package.json` → `WILL_RUN true`).
Shape: a **separate** workflow (GitHub runs workflows concurrently, so PR cost is `max()`, not `sum`)
with relevance classified **inside** the job — never a workflow-level `paths:` filter, because **a
required check that never runs strands a PR on "expected — waiting for status"**. The classifier emits
`skip`, never `relevant`, so it **fails OPEN**.

### ★★ What this lane disproved — including MY OWN correction
- **"All three sightings share one root cause" is FALSE.** Three different environments: deployed
  image, dev worktree, delayed child process. **Caught: 1:NO · 2:YES-but-LATENT · 3:NO.**
- ★★ **MY correction was ALSO wrong, and more confidently wrong than the spec.** I reasoned sighting 1
  (undeclared `tsx`) *would* go red in a booting container. **It does not.** `scheduleWarmup` fires
  `runWarmup` on a **45 000 ms `setTimeout`**, `runWarmup` **returns early unless `DATABASE_URL` is
  set**, its failure path is `logger.error` with **no `process.exit`**, and `healthz` is a static route
  touching neither. **A container boots green with `tsx` absent.** → **The Dockerfile premise I gave
  was right; the conclusion I drew from it was not.** Sighting 1 is already gated on trunk by
  `spawnedLoaderResolution.test.cjs`, confirmed EXECUTING this run (`# pass 5`).
  ★ **This is why the brief said "this is my reasoning, not a verified finding — test it."** The
  handling was correct; the reasoning was not. **Both belong in the record.**
- ★★ **The brief's ACCEPTANCE MUTATION tests code the lane did not write.** `remove tsx → RED` goes
  red on **pre-existing** trunk code. **An acceptance criterion satisfied by something you did not
  build does not test what you built.**
- ★★ **The brief's stated minimum bar contains a `MOUNT != LIVE` error.** *"AI Gateway started"* is
  **the PARENT's post-`spawn()` log**, not evidence the gateway booted. **Control-proven:** a log
  carrying the parent line but not the child's **FAILS** the lane's gate — **using the brief's line it
  would have gone GREEN.** The gate as specified would have been decorative.
- **The brief cited ONE `require('typescript')`. There are FIVE** — only `warmQuestionPool.cjs` guards
  it. `[FU-GATEWAY-UNGUARDED-TYPESCRIPT-REQUIRE]`
- **The same mutation against the container gate would be a FALSE RED** — a frozen install dies on
  `ERR_PNPM_OUTDATED_LOCKFILE` before reaching the `tsx` probe. **Recorded, not banked as evidence.**
- **Docker is not installed on this box.** Evidenced **entirely through CI, pre-merge** — the
  "unverifiable until merged" claim disproved again.

### FU ids — new
`[FU-DOCKERFILE-ENV-ORDER-UNDEFENDED]` · `[FU-GATEWAY-UNGUARDED-TYPESCRIPT-REQUIRE]` ·
`[FU-CONTAINER-GATE-NOT-REQUIRED-CHECK]` · `[FU-CONTAINER-GATE-TSX-MUTATION-IS-LOCKFILE-RED]` ·
carried `[FU-DEVDEPS-SHIP-TO-PRODUCTION]`

### ⚠⚠ #651 IS NOW IN THE EXACT POSITION IT DIAGNOSED
`[FU-HANDOFF-DOCS-PR-STALE-AT-MERGE]` — *a handoff PR not merged the same hour must re-check its own
headline before merge.* **#651 was authored before #652 and #653 existed and does not describe them.**
→ **Before #651 merges it must either cover this wave's own lanes or scope its headline honestly.**
Decide when SUPPLY-2 returns. **Do not let it merge stale — that is the finding it shipped.**

---

### Lane SUPPLY-2 — PR #654 (DRAFT), CI `31319023732` PASS on head `19a68ec0`
**57 of 121 advisories resolved** (baseline 0/121 measured as the scorer's own control) and **4/4
criticals** = 3 distinct GHSAs. `tsx` moved to `dependencies` — **the owner's ruling from Wave DPDP-B
is finally landed.** Of the criticals, **only `protobufjs` is reachable in this product** (loaded by
the live api-server via `firebase-admin`, parsing Google's own protobufs, **no student input**);
`vitest` and `websocket-driver` are not reachable, each disproved with a control.

**ROOT CAUSE, FROM THE LOG — the catalog hypothesis is DISPROVED.**
`security_update_not_possible {"dependency-name":"react-router", …}` (run `31306588583`, newer than
the scout's). `grep -in catalog` → **exit 1**, with a control proving the grep works. The real
mechanism is the job spec's **`"update-subdependencies": false`**.

### ★★ What this lane disproved — and the biggest one reframes the whole lane
1. ★★★ **THE ACCEPTANCE BAR WAS ALREADY MET ON 2026-08-03.** `#589` (dompurify) **opened and passed
   ALL FIVE checks — then was CLOSED UNMERGED by the owner.** **Dependabot is NOT universally
   broken:** 43 fail / 10 success in 60 runs. **It works for DIRECT deps and fails only on
   transitive.** → **Part of this backlog is TRIAGE, not tooling.** The wave premise — *Dependabot is
   broken, fix the root cause* — was **half wrong**, and the half that was wrong is the owner's own
   merge behaviour. `[FU-SUPPLY2-DEPENDABOT-PRS-CLOSED-UNMERGED]`
2. **`react-router` did NOT move when named** — `react-router-dom@7.14.0` pins it **EXACTLY**, so the
   **parent** had to move. **The scout's remedy table is wrong on that row.**
3. **`#594` proposed this exact vitest bump and FAILED** `ERR_PNPM_OUTDATED_LOCKFILE (lockfile 3.2.4,
   manifest 3.2.6)` — Dependabot edited the manifest **without** the lockfile, and **the exact pin
   forced that.** This PR passes that gate, mutation-proven.
4. ★ **PRODUCTION IS DEPLOYING.** Trunk `eeafb99b` shows *"Deployed to Railway" 12:02:54 today.*
   **DPDP-B's "production still cannot deploy" is STALE.**
5. `@vitest/ui` "absent": the scout's grep returned 0, **a broader pattern returns 2**. Conclusion
   holds; **the evidence was pattern-luck.** ★ A grep is only as good as its pattern — again.
6. `MSYS_NO_PATHCONV=1` (the `gh api` remedy in circulation) **breaks native Windows binaries** taking
   paths in the same shell. `[FU-SUPPLY2-MSYS-NOPATHCONV-BREAKS-NATIVE-TOOLS]`
7. ⚠ **The box is 23.77 GB, not the 7.8 GB every brief states — mine included.**
   `[FU-SUPPLY2-BOX-SIZE-STALE]` → **I serialised lanes partly on that stale number.** The constraint
   turned out moot (Docker was never installed), but **the reasoning was wrong and it is mine.**

**RAILWAY WAIT-FOR-CI: "I COULD NOT VERIFY"** — no CLI, no token, dashboard-only, absent from
`railway.json`. ★ **The one discriminating test failed to discriminate** (Railway deployed `eeafb99b`,
which was fully green — consistent with ON *or* OFF). **Nothing in the fix depends on the answer;
only the urgency framing does.** ★ This is the correct handling of an unresolvable contradiction and
it is exactly what the brief asked for.

**Config validated POSITIVELY**, in its strongest form: `yaml.safe_load(trunk) == yaml.safe_load(branch)`
→ `True` with **zero non-comment changed lines**, so behaviour is **provably unchanged**; plus a control
mutation proving the validator rejects a broken file. `target-branch` asserted **absent**.

### FU ids — new
`[FU-SUPPLY2-JSYAML-4X-PINNED-BY-ORVAL]` · `[FU-SUPPLY2-ESBUILD-OVERRIDE-PINS-VULNERABLE]` ·
`[FU-SUPPLY2-DEPENDABOT-PRS-CLOSED-UNMERGED]` · `[FU-SUPPLY2-LANE-OVERLAP-BLOCKS-DEPENDABOT]` ·
`[FU-SUPPLY2-FULL-SWEEP]` · `[FU-SUPPLY2-MSYS-NOPATHCONV-BREAKS-NATIVE-TOOLS]` ·
`[FU-SUPPLY2-BOX-SIZE-STALE]` · `[FU-DEVDEPS-SHIP-TO-PRODUCTION]` **carried, NOT closed —
`typescript` is still exposed**

---

## ⚠⚠ WAVE CLOSE PLAN — MERGE ORDER MATTERS, AND #651 IS NOT STALE THE WAY #650 WAS

**All four lanes are built. NONE are merged.** `handoff/` cannot describe trunk until they land, so
**Rule 0 is not yet satisfied and this wave is not closed.**

★ **The distinction that decides what to do with #651:** `#650` was **WRONG** — it asserted shipped
code was unshipped. **`#651` is merely INCOMPLETE** — authored before `#652`/`#653`/`#654` existed, it
makes **no claim about them at all.** ⚠ **Incomplete is safe to merge; wrong is not.** So `#651` does
**not** need rewriting, and rewriting it to describe three unmerged drafts would **recreate #650's
exact failure.**

**Recommended order:**
1. **Merge `#651` first**, while its statements are still only about `#635`–`#650`. It is green,
   docs-only, and its remote diff showed zero code/config files.
2. **Then ready + merge `#652`, `#653`, `#654`** (owner's step — `gh pr ready` is never an agent's).
3. **Then ONE closing handoff PR** covering this wave's four lanes, written from the HANDOFF DRAFT
   above — which is already written, in full, right here.

⚠ **If the product PRs merge BEFORE `#651`, its `[CURRENT]` becomes stale-at-merge** — the precise
failure it diagnosed as `[FU-HANDOFF-DOCS-PR-STALE-AT-MERGE]`. **Re-check its headline before merging
it in that case.**

### LIVE-VERIFY OWED (owner) — what to expect, so a correct result is not misread
Download `/api/account/export` in production on an account **with uploaded photos**. ⚠ **Check
Railway's active commit first.** Expect: completes, no 502; `recordsExported` non-zero;
**`"complete": false` is CORRECT** (`ok` should be `true`); **a `207` is the budget working as
designed** — read the disclosures and ask for `LT_EXPORT_BUDGET_MS` to be raised; `locations[]` in map
order. Both surfaces, one session carrying pre-change state.

### ★ CARRY FORWARD VERBATIM
- **The WIRE-2 dormancy block** must survive every prepend AND be restated in the new `[CURRENT]`.
  Re-derived as of trunk `eeafb99b`: `WIRE-2` (`#621`) already ENDED the `#578`/`#611`/`#617`
  dormancy. What is dormant NOW is different and must be stated as such:
  - `expectedMarks` is dormant until ME-2 ships.
  - **`#647` (TOPICHUB-1) is a consumer with no producer** — `navigation.ts` emits zero `concept=`.
    It is **dead code until ME-2 ships**. Record as a live risk, not a note.
- **The DPDP-A `[CURRENT]` headline is now out of date, and the demoted block must NOT be edited.**
  It said the erasure code "is not running in production". `#644` (TSX-1) landed, the gateway boots,
  and `#646` gave it a student-facing surface. State the change in the NEW `[CURRENT]` only.
