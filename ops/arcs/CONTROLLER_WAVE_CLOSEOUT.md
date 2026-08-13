<!--
CONTROLLER PREAMBLE (added by the Wave CLOSEOUT controller on receipt; the body below is verbatim)
- Written to disk 2026-08-09. It was NOT on disk when the wave opened - it arrived as an ATTACHMENT.
  This is a CONTROLLER TRANSCRIPTION of an owner-supplied source, not the owner's original bytes.
- Trunk re-derived at receipt: eeafb99b0c437998067478f603af66d32e431b58 (matches the SHA in the body).
- Some emphasis markers arrived transport-corrupted ("a-hat"/"A-hat" sequences). They are
  DECORATIVE ONLY and carry no instruction. Read the words, ignore the marker glyphs.
- Nothing in the body was reworded, reordered, or removed.
- This file is UNTRACKED and must stay untracked. It is not part of any lane allowlist.
-->

# CONTROLLER - WAVE CLOSEOUT - FINISH THE OPEN FRONTS

**v1.0 - 2026-08-09 - trunk `eeafb99b` at authoring - RE-DERIVE IT.**
Read first: `LazyTopper_Controller_Subagent_Model.md`, then
`CONTROLLER_ADDENDUM_Context_Safeguards.md` (**v1.1 - mandatory**).

> **You never read product source, never run builds, never inspect diffs.**
> **Your lifetime is ONE WAVE.** Report `CONTEXT REMAINING: n%` in every message.
> **ME-C runs in parallel** on `lazytopper/src/**`. Your paths are `handoff/`, `.github/`,
> manifests, `Dockerfile`. Exact-path disjoint - **confirm with `gh pr list --state open` before every
> dispatch.**

---

## 0 - THREE LANES

```
HANDOFF-CATCHUP  --->  SUPPLY-2  --->  CONTAINER-GATE
```

Sequential only because `HANDOFF-CATCHUP` corrects a record the others will be recorded in. If it
is blocked, the other two may proceed.

---

## 1 - LANE HANDOFF-CATCHUP - `handoff/` is wrong, not merely stale

**Allowlist:** `handoff/**` only. Docs-only, self-mergeable under 6a.

### The three defects, verified on trunk `eeafb99b`

**1 - `#650`'s `[CURRENT]` is FALSE.** It reads:

> *"both lanes sit on GREEN DRAFT PRs that are **not on trunk** - trunk `376e30b0`"*

**`#647` (`024db49`) and `#649` (`6ea6e59`) merged BEFORE `#650` (`eeafb99b`).** They are on trunk.
**This is not the structural one-commit lag** - it is a substantive claim that student-facing code is
unshipped when it is shipped. **Correct it in a new `[CURRENT]`; demote `#650`'s rather than editing it.**

**2 - Five commits have NO lane record anywhere:** `#635`, `#644`, `#645`, `#646`, `#648`.
**`#646` shipped a student-facing DPDP surface with no lane record at all.**

**The source EXISTS. `handoff/WAVE_STATE_WAVE_DPDP_B_LIVE.md` is untracked in the main checkout**
and holds `[CURRENT]` prose, the lane table, every decision with its reason, and all FU ids.
**READ IT. Do NOT reconstruct from commit metadata** - reconstructing is exactly the gap
`[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]` names, and it is why `#646` has no record.

**Archive it as `handoff/WAVE_STATE_WAVE_DPDP_B_ARCHIVE.md` in this PR.** It is the **fourth**
single-disk exposure this project has had (Waves 4, 5A, 5G, now DPDP-B) and the first three all
needed rescuing after the fact. **Verify byte-identity with `git hash-object`, never with `git diff`.**

**3 - The production status changed and nothing records it.** The DPDP-A `[CURRENT]` headline says
*"a student can erase their own account, AND THE CODE IS NOT RUNNING IN PRODUCTION."* **It is running
now.** `TSX-1` (`#644`) landed and the gateway boots - deploy log: `Server listening :8080` /
`AI Gateway started :3001` / `/shared-api/healthz 200` / `Gemini: ON`. **`#646` then gave it a
student-facing surface.** **Do not edit the demoted block** - it is a dated record of what was known.
**State the change in the NEW `[CURRENT]`.**

### Also record
- **`[FU-STEP-SOLUTIONS-TABLE-NEVER-CREATED]`** - deploy log: `relation "step_solutions" does not
  exist` (42P01). **Nothing in the repo creates it** - every reference SELECTs/INSERTs/DELETEs; there
  is no `CREATE TABLE`. Contrast `generated_questions`, which has `ensureGeneratedQuestionsTable.cjs`
  called at boot and reported `ready` in the same log. **The cache fails soft** (`getCachedSolution`
  catches and returns `null`), so correctness is unaffected - **but every step solution has always
  been regenerated from Gemini.** A cost line, not a bug. Candidate for the unexplained August spend.
- **`[FU-DPDP-B-NO-CLOSEOUT-HANDED-OVER]`** - close it, naming the mechanism: *a controller standing
  down without a handoff must state the exact path of its close-out and that it is unarchived, as the
  LAST line of its final message.* One line among many is not a handover.
- **`#647` is a consumer with no producer.** `navigation.ts` emits **zero** `concept=` - verified.
  **It is dead code until ME-2 ships. Record it as a live risk, not a note.**

**Census by completeness, not uniqueness.** `scope:guard --mode docs` **before `git add`**.
`check:mojibake` **after staging** - `check-mojibake.cjs:63` uses `git ls-files` and is tracked-only.
`REPORT_ONLY_PREFIXES = ['handoff/']`, so a green here is **report-only** - run the injection control.

---

## 2 - LANE SUPPLY-2 - Dependabot at the root

**Fully specified on disk from Wave DPDP-B** - five briefs beside
`WAVE_STATE_WAVE_DPDP_B_LIVE.md`. **Read that spec; do not re-derive it.** Summary only:

**Owner ruling: fix the root cause. Security updates and automation stay ON.**

**Step one is to open a failing job log and read the actual error.** The pnpm-catalog hypothesis is
**the cofounder's inference from config, not from a log.** `pnpm-workspace.yaml` defines 17 catalog
entries; six packages reference `catalog:`. **If the log does not name catalog resolution, the fix
changes.**

**Prior scout findings to carry, not re-derive:** the six advisories are all **transitive**, and the
parents' existing semver ranges already permit the patched versions - **a targeted lockfile refresh
resolves them with no manifest surgery.** Take the **targeted** refresh, not `pnpm update -r`; the
sweep is a separate later PR against a known-good booting baseline.

**vitest -> 3.2.6** (one-line pin). Removes two of the four criticals. **Reject 4.x on this lane** -
a major test-framework bump makes any failure un-diagnosable.

**`[FU-DEVDEPS-SHIP-TO-PRODUCTION]` goes at the TOP of the report.** The Dockerfile installs
devDependencies and **deliberately does not prune**. **"Not reachable, it's a devDependency" is
FALSE for this project.** All 121 alerts must be assessed as a production surface.

**Also in scope, independent of Dependabot working: READ THE 4 CRITICAL ALERTS BY HAND** and report
what each is and whether it is reachable **in this product**. **The alert list is not the set** -
CodeQL flagged 4 of 6 `setItem` calls in `referralService.ts`.

**Correct `.github/dependabot.yml`'s own header** - it claims alerts and security updates are
"VERIFIED DISABLED" (both are enabled) and claims a tracked `lazytopper/package-lock.json` (absent).
**Mark it as a dated correction, not a silent edit.**

**Traps:** an unparseable `dependabot.yml` fails **silently** - "it did not error" proves nothing.
Dependabot reads config from the **default branch**, so a change is unverifiable until merged.
**Do NOT set `target-branch`** - it suppresses security updates.
**Manifest and `pnpm-lock.yaml` move together, always.**

> **ACCEPTANCE: a Dependabot security-update PR that ACTUALLY OPENS AND PASSES CI.** Not a config
> that parses, not a green suite.

---

## 3 - LANE CONTAINER-GATE - the highest-leverage item on the board

**Allowlist:** `.github/workflows/**` + any new script. **No product files.**

**The problem, three sightings in one wave:**

| # | What | How it was found |
|---|---|---|
| 1 | `tsx` undeclared in `lazytopper/` | **Production boot crash.** `#638` merged, never ran |
| 2 | **Unguarded `require('typescript')` at `index.cjs:4`** - while `firebase-admin` two lines below sits in a `try`. `typescript` is a devDependency | Read during triage |
| 3 | `accountExport.test.cjs` fails 8/26 with `Cannot find module 'typescript'` in a bare worktree | A lane's own run |

**All three are the same root cause and NOTHING IN THE REPO BUILDS THE IMAGE, so nothing can catch
them.** Every gate runs in a dev worktree where the whole workspace resolves.

> **THE RUNG THIS PROJECT'S EVIDENCE LADDER WAS MISSING:**
> **A test proves the code works. A build chunk proves it ships. Only a boot proves it runs.**
> **An `EXECUTED PASS` is scoped to the environment that executed it.** ERASE-1's map-import proof
> was TRUE - in a dev worktree. **resolves-in-dev != resolves-in-the-deployed-image.**

**Build:** a CI job that **builds the Docker image and boots the container**, asserting the gateway
starts. Minimum bar - the log lines the real deploy emits:

```
Server listening (8080)
AI Gateway started (3001)
/shared-api/healthz -> 200
```

**Have the lane decide the shape and evidence it** - full image build may be too slow for every PR;
a `--frozen-lockfile` install in a clean container plus a boot may buy most of the value. **Scope it to
what actually catches sightings 1-3**, and prove it by mutation: **remove `tsx` from
`lazytopper/package.json` - the gate must go RED.** **If that mutation does not go red, the gate is
decorative** - `[FU-BRIEF-INERT-MUTATION-SPECIFIED]`, a mutation whose catching assertion cannot be
named is not a mutation.

**Cost is a real constraint.** Quality Gate already takes ~7 minutes and Railway lags trunk by at
least that. **If the lane finds a full image build doubles PR time, say so and propose a cheaper
variant** - a nightly, or a job gated on `server/**` and manifest changes only.

---

## 3b - LANE EXPORT-PERF - a DPDP flow a student cannot complete

**Allowlist:** `lazytopper/server/services/accountExport.cjs` /
`lazytopper/src/services/accountDataService.ts` / tests. **NOT `accountErasure.cjs`** - see below.

### The evidence, from the production deploy log
```
request aborted - id 8 - GET /api/account/export - res.statusCode: null - responseTime: 119978
```
**~120 s, then aborted.** **Nothing crashed.** The gateway was still working; something upstream gave
up, the connection died under the api-server, and `app.ts:77-80`'s `proxyReq.on("error")` returned
**502** to the browser. Owner-observed on a real account.

### The two causes, verified in code
| `accountExport.cjs:486` | `for (const step of plan())` - **29 map locations walked SEQUENTIALLY**, no concurrency |
| `accountExport.cjs:359` | `await file.download()` - **the student's handwriting photos are downloaded and inlined** |

The lane anticipated the shape: `:318` says *"an unbounded download is a way for a student to take
the gateway down by accident"*, and `caps` at `:348` DO skip oversized files **from metadata, before
transfer**. **The caps are not the problem. The sequential walk and the under-cap downloads are.**

### Fix, in this order
1. **Parallelise the Firestore walk.** Cheapest win, no legal question.
2. **Bound it server-side** - over budget -> **207 partial** naming what it could not read.
   `EXPORT-1` already handles 207 and the map already has a partial contract.
3. **Give the client a timeout** so it fails honestly instead of waiting on an upstream abort -
   `[FU-EXPORT-FETCH-NO-TIMEOUT]`. `AccountDataControls.tsx:84-85` is correct
   (`setExportBusy(false)` runs unconditionally after the await); the await simply never returned.
4. **Fix the 5xx copy.** A 502 currently falls through to *"This is not switched on yet."*
   **It IS switched on - it is slow. On a legally-required flow, telling a student the feature does
   not exist is the wrong side to err on.** Keep *"Nothing was changed."*; drop *"not switched on yet."*
   `[FU-EXPORT-502-READS-AS-NOT-BUILT]`. `accountDataService.ts` already handles 401/403, 429 and 503
   specifically - add the 5xx branch beside them.

### ONE QUESTION THE LANE MUST NOT DECIDE
**Whether to stop inlining the blobs at all.** An image the student uploaded is data they already
have; listing paths and sizes may satisfy the obligation without a multi-megabyte payload.
**That is a legal call, not an engineering one. RAISE IT TO THE OWNER** alongside
`[FU-DPDP-GUARDIAN-CONSENT]`. Do not change what the export contains.

> **ACCEPTANCE IS A REAL DOWNLOAD COMPLETING IN PRODUCTION**, on an account with uploaded photos.
> Not a green suite. **Only a boot proves it runs** - and only a completed download proves this.

**ERASURE HAS THE SAME SHAPE AND IS IRREVERSIBLE.** Verified: `accountErasure.cjs:451`/`:467`
walk the plan sequentially, and `:329`, `:342`, `:359` delete one ref, one doc and one file at a time.
**A mid-walk abort leaves a half-erased account.** **Report this as a finding; do NOT fix erasure in
this lane** - it is destructive, it needs its own live-verify on a throwaway account, and bundling it
would make a failure un-diagnosable. `[FU-ERASE-SEQUENTIAL-WALK-ABORT-RISK]`.

---

## 4 - STANDING - earned this session, every lane inherits

**THE EVIDENCE LADDER** (3). **Any lane adding a runtime import to a server states which image
it executed in.**
**SHOW THE EVIDENCE, NOT THE CONCLUSION** - paste the command and its literal output, and state what
proves it could have found the thing. If you cannot show it, say *"I could not verify."*
**NEVER `head`, NEVER `grep -c`, ON AN EXISTENCE QUESTION.** **A grep is only as good as its
pattern** - a sweep for `no PR` missed two hits spelled `unPR'd`.
**ENUMERATE THE SET.** **A COUNT IS READ AT THE TIME, NEVER CARRIED - including from this brief.**
**NO FALSE REDS** - require the failure to quote the injected value, plus a pre-mutation green and a
did-it-actually-run assertion.
**NO INERT MUTATIONS** - a brief must not specify a mutation without naming the assertion that would
catch it. If you cannot say which check goes red, **build a positive control or drop it.**
**VERIFY THE RESTORE AGAINST THE FILE YOU ACTUALLY MUTATED.** A restore verified against the wrong
file yields a confident VERIFIED and a corrupted tree.
**A HASH QUOTED WITHOUT ITS RECIPE** is a derived value no later lane can re-check.
**`scope:guard` IS VACUOUS ON AN UPDATE-ONLY LANE** - reproduce the authoring condition in a
throwaway worktree.
**GET THE BASE UNDERNEATH YOU - a revert does not conflict, it just disappears.** `#644` had added
a script at the exact insertion point `#645` needed; a lane that skipped the merge would have silently
reverted the production fix inside a "wiring" patch. **That makes it a correctness step, not hygiene.**
**CARRY FORWARD VERBATIM NEVER MEANS CARRY FORWARD UNCHECKED.**
**NEVER read or push from `C:\Projects\Lazytopper-Production`.**
**PUSH AS DRAFT. Never `gh pr ready`, never merge** - except docs-only under 6a.

---

## 5 - RULE 0

**A wave is closed when `handoff/` describes trunk.** Archive first and alone, **verified by SHA**.
Exactly one un-superseded `[CURRENT]`; prepends proven by a **per-file heading census**.
**RE-DERIVE THE DORMANCY BLOCK.** As of trunk: `expectedMarks` is dormant until ME-2; **`#647` is
dead code until ME-2 ships its producer.** `WIRE-2` (`#621`) already ended `#578`/`#611`/`#617`.
**Before opening a handoff PR, run `gh pr list --state open`.** If ME-C's is open, hand it your
close-out and stand down. **Exactly one at any moment.**
**If you stand down without a handoff, the LAST line of your final message must be the exact path
of your close-out and the fact that it is unarchived.** That rule exists because DPDP-B's wasn't.
