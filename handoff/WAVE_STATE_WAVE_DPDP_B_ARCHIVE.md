# WAVE DPDP-B STATE - updated 2026-08-09 (wave start)

TRUNK: **`baf9b67a8b460471bbddbad70243ec3a1e104baa`** (re-derived 2026-08-09 after EXPORT-1 returned;
moved forward from `f654dc64` via **#635**, which merged mid-wave. **EXPORT-1 caught my stale SHA --
re-derive before EVERY dispatch, exactly as the model says.**)

OPEN PRs (re-derived): **#644** (TSX-1, draft) - **#645** (EXPORT-1, draft). No ME-B PR. No handoff PR.
=> SETTINGS-1's `lazytopper/src/**` is exact-path disjoint from both.
CONTROLLER: Wave DPDP-B. Lifetime = ONE WAVE (ADDENDUM v1.1 Section 1). Stands down at close.

OPEN PRs at wave start (`gh pr list --state open`):
- #635 `docs/ops-standing-rules` -> `ops/AGENT_STANDING_RULES.md` (1 file, non-draft)
  => NO handoff PR open. NO ME-B PR open. No collision with any DPDP-B allowlist.

## TRUNK FACTS VERIFIED AT WAVE START (metadata only; controller read no product source)
| fact | how verified | result |
|---|---|---|
| #643 closed Wave DPDP-A | `git log origin/base/... --oneline` | HEAD = f654dc64 |
| #638 ERASE-1 on trunk | `git merge-base --is-ancestor 6f7da56e` | YES ancestor |
| #637 MI-CONCEPT-1 on trunk | `git merge-base --is-ancestor 92cc9fc4` | YES ancestor => SETTINGS-1 GATE CLEARED |
| #639 USERS-1 / #640 CLEARTEXT-1 | trunk log | 6ef083b5 / c9445a1e present |
| `.github/dependabot.yml` | `git ls-tree -r --name-only ... -- <path>` | PRESENT (see FINDING 1) |
| `Dockerfile`, `railway.json` | `git ls-tree -r` at root | BOTH PRESENT at repo root |
| docker CLI on this box | `docker --version` | **NOT INSTALLED** -- no local image boot is possible |
| Dependabot failures | `gh run list --workflow "Dependabot Updates"` | 6 failures all at 2026-08-09T00:21Z on trunk; older failures 08-08, 08-05 |

Failing Dependabot run IDs to open: `31285986176 31285986109 31285986107 31285986077 31285986076 31285986074`

## ** UPDATE 2026-08-09 (late): #644 MERGED. TRUNK = `3cf01287db446036464e97a7945c6d05749d36a4`

`#644` (TSX-1) is on trunk -- `tsx` declared at `lazytopper/package.json:159`. Verified: trunk log
shows `3cf01287 fix(deps): declare tsx ... (#644)` on top of `baf9b67a`.

**ONE FINAL LANE DISPATCHED: `EXPORT-1-CI-WIRE`.** Brief: `handoff/BRIEF_EXPORT-1-CI-WIRE.md`.
- **Owner granted a DELIBERATE EXCEPTION to the 27%-context floor** for this one dispatch, on the
  grounds that it is a three-line patch, it repairs **my own allowlist gap**, it unblocks `#645` which
  nobody can proceed past, and **this close-out was already SHA-verified on disk** (`4924855`,
  33,053 bytes) so nothing was at risk if I ran out mid-dispatch. **Recorded here because a floor
  exception should never be invisible in the record.**
- Scope: `lazytopper/package.json` ONLY, pushed to **`#645`'s existing branch**
  `feat/dpdp-b-export-1-data-export`. **No new PR. No lockfile.**
- Wires `test:server:account-export` + `...-route` into `test:matrix:all`, **before
  `test:ci:docs-lane`** -- the guard self-tests must stay at the **tail**
  (`guard_self_tests_run_at_matrix_tail`, asserted by `test:repo-boundary`).
- Acceptance: `test:ci:docs-lane` GREEN (the gate currently failing) + `test:repo-boundary` GREEN.
- ! **Diagnosis is the OWNER's, read from the gate and the diff, NOT from a CI log.** The lane was
  told to stop and report if the real cause is something else rather than force the patch to fit.

### RESULT: **PASS. `#645` IS NOW FULLY GREEN** (CI run `31305920616`, head `27270498`, all 6 checks).
1 file, 3 insertions / 1 deletion, `pnpm-lock.yaml` untouched -- **proved, not asserted**: a full
`pnpm install --frozen-lockfile` succeeded and `git status` still showed only `M lazytopper/package.json`.
`a15` now green **in CI**: *"14 server .test.cjs suites enumerated from disk, all wired."*
Tail order intact: *"chain=32 steps, tailStart=21, self-tests at 29,30,31"*, new links at 25/26.
** **THE `#644` CLOBBER HAZARD WAS REAL, NOT HYPOTHETICAL** -- `#644` had added
`test:server:spawned-loader-resolution` **at the exact insertion point**. Merge `0a01d907` preserved
it: script, chain link and the `tsx` dep all intact.

** **24. MY PRESCRIBED MUTATION WAS INERT -- the lane caught it and built a working one.**
   Front-loading one of the two NEW entries **cannot** turn `test:repo-boundary` red:
   `guard_self_tests_run_at_matrix_tail` **pins only three names** (`scope-guard:blindspot`,
   `repo-boundary`, `mojibake`), so moving an ordinary link leaves chain length, `tailStart` and the
   self-test positions untouched. The lane ran a **positive control (M2)** that front-loaded a real
   self-test and **did** go red, quoting the injected value:
   *"guard_self_tests_run_at_matrix_tail: not in tail (or unwired): test:repo-boundary"*.
   Both mutations proven applied (`f63ba015` / `8fa22e31` != baseline `e66b143f`); restore verified
   **by full path** against `lazytopper/package.json`.
   => ** **LINK ORDER FOR ORDINARY ENTRIES IS A CONVENTION, NOT AN INVARIANT.** Nothing would have
   gone red had these two been appended after `test:mojibake`. **The mandated placement is still
   correct** -- the `&&`-masking argument stands -- **it is simply UNGUARDED.** This is the
   *"a guard that cannot be shown to have fired is NOT PRESENT"* rule pointed at a brief's own
   mutation recipe: **I specified a red that could never happen, and a compliant lane would have
   reported a green mutation as a passing gate.**

**OWNER DECISIONS FROM THIS LANE -- ALL RULED 2026-08-09:**
1. ** **RULED: ACCEPT ORDINARY LINK ORDER AS CONVENTION. DO NOT PIN IT.** Owner's reason, and it
   generalises: **pinning arbitrary ordering would be a guard that fails on harmless changes -- the
   FORBID-1 failure, pinning what the file did that day rather than what the ban protected.** The
   invariant that matters **is already pinned**: the self-tests run last, so tooling wobble cannot
   mask nineteen content gates. **Order among ordinary links is genuinely arbitrary, because any
   failure stops the `&&` chain wherever it sits.**
   ** **AND THE REAL FAULT WAS NOT ABOUT ORDERING -- IT WAS THE INERT MUTATION ITSELF.**
   **`[FU-BRIEF-INERT-MUTATION-SPECIFIED]` -- NEW RULE, OWNER-AUTHORED, BOUND FOR `SKILL.md`:**
   > **A brief must not specify a mutation without naming the assertion that would catch it.**
   > **If the author cannot say which check goes red, the mutation is DECORATIVE.**
   **This is the false-RED rule from the other end**: false-RED guards against a red that proves
   nothing; this guards against a red that can never happen. **My lane found it only because it built
   a positive control instead of reporting a green as a pass.**
2. **`#645` is green and still a DRAFT.** Un-drafting and merging are yours; the lane never ran
   `gh pr ready` and never merged.
3. `[FU-EXPORT-TS-MODULE-IN-BARE-WORKTREE]` -- `server/services/accountExport.test.cjs` fails 8/26
   with *"Cannot find module 'typescript'"* in a worktree with **no `node_modules`** (it loads the
   data map from TS source at runtime). Harmless in CI. ** **THIS IS THE THIRD SIGHTING OF THE SAME
   THREAD IN ONE WAVE** -- `tsx` (TSX-1), unguarded `require('typescript')` at `index.cjs:4`
   (EXPORT-1), and now this. **`[FU-DEVDEPS-SHIP-TO-PRODUCTION]` is the spine connecting them.**

## ** ESCALATED BY THE OWNER 2026-08-09 -- HE READ `index.cjs:4` HIMSELF

**`[FU-DEVDEPS-SHIP-TO-PRODUCTION]` IS NOW THE LOAD-BEARING FACT ABOUT THIS BACKEND, NOT A NOTE.**

> `index.cjs:4` is a **bare, unguarded `require('typescript')`** -- while **`firebase-admin` two lines
> below sits inside a `try`.** **`typescript` is a devDependency.**
> ** **THE GATEWAY CANNOT BOOT AT ALL UNLESS THE DOCKERFILE'S NO-PRUNE HOLDS.**

**Not "a devDependency might be unreachable" -- the backend's ability to start is contingent on a
Dockerfile comment that nothing tests.** Put it at the **TOP of SUPPLY-2's report**, and note it
reframes the remaining ~117 alerts: **every one is a production surface.**
=> This is also the strongest available argument for `[FU-TSX1-NO-CONTAINER-GATE]`: **nothing in this
repo builds the Docker image, so nothing can catch this.**

## ** OWNER'S SHARPENING OF THE `#644`-UNDERNEATH FINDING

`#644` had added `test:server:spawned-loader-resolution` **at the exact insertion point.** A lane that
skipped the merge would have **silently reverted the production fix inside a "wiring" patch** --
** **AND A REVERT DOES NOT CONFLICT. IT JUST DISAPPEARS.**
**That is the stale-base hazard in its most invisible form**, and it is why "get the base underneath
you first" is a correctness step, not hygiene.

## LANES
| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| TSX-1 | ~~make the gateway boot~~ **-> fix a warmup child that never ran** | `lazytopper/package.json`, `pnpm-lock.yaml`, `lazytopper/server/spawnedLoaderResolution.test.cjs` | **PASS-PENDING-BOOT, DRAFT** | **#644** | ** **DISPROVED THE WAVE'S CENTRAL DIAGNOSIS. #638's rollback cause is STILL UNIDENTIFIED.** Real but latent fix |
| SUPPLY-2-SCOUT | read the actual Dependabot error + the 4 critical alerts | **WROTE NOTHING (confirmed 0 files)** | **COMPLETE** | n/a | catalog hypothesis DISPROVED; report on disk |
| SUPPLY-2 | **RESHAPED: stale-lockfile refresh, NOT a dependabot.yml change** | `pnpm-lock.yaml` + `lazytopper/package.json` (vitest pin) + root `package.json` (esbuild override) + tests | BLOCKED | - | **HARD lockfile collision with TSX-1 -- must wait for TSX-1 to MERGE.** Also needs 2 owner rulings |
| EXPORT-1 | data export | `server/index.cjs`, `server/routes/accountExport.cjs`+test, `server/services/accountExport.cjs`+test | **PASS-PENDING-BOOT, DRAFT, CI RED on 1 line** | **#645** | ** **BLOCKED BY MY OWN ALLOWLIST ERROR** -- needs a 2-line `lazytopper/package.json` patch AFTER #644 merges |
| SETTINGS-1 | student-facing DPDP surface | 14 files under `lazytopper/src/**` + `docs/screenshots/` | **PASS-PENDING-LIVE, DRAFT, CI GREEN** | **#646** | ** **Found the REAL prefix escape -- and it was not the one I flagged.** No App.tsx blocker existed |

## DISJOINTNESS
- TSX-1: `lazytopper/package.json`, `pnpm-lock.yaml`, `lazytopper/server/**`
- SUPPLY-2-SCOUT: none (read-only)
- ME-B (parallel arc): `src/pages/`, `src/lib/desktop/`, `src/pages/tutor/` -- no overlap with TSX-1
=> verified disjoint 2026-08-09 wave start. RE-CONFIRM with `gh pr list --state open` before every dispatch.

## DECISIONS MADE THIS WAVE
1. **SUPPLY-2 SPLIT IN TWO.** Reason: the brief allows SUPPLY-2 parallel with TSX-1 "unless TSX-1's
   fix lands in a manifest SUPPLY-2 also edits." TSX-1 MUST touch `pnpm-lock.yaml` (a manifest change
   without it fails all four `--frozen-lockfile` build paths); SUPPLY-2 option B touches it too. That
   is an exact-path collision, so the brief's "if they touch, sequence them" binds. Splitting off a
   **write-nothing scout** gets the brief's mandated "STEP ONE: read the actual error" done in
   parallel at zero collision risk, and defers only the editing half.
2. **TSX-1's acceptance is layered, and the split is stated honestly.** The brief says acceptance is a
   Railway boot. **No subagent can produce one** -- docker is not installed on this box, and Railway
   deploys are the owner's. So: the LANE owns the fix, the lockfile, and an explicit statement of
   whether it could reproduce the resolution failure locally at all; the **OWNER** owns the boot proof.
   The lane is forbidden from calling the lane PASS on a green suite -- the exact error being corrected.
3. **The "why did trianglesGrindContract.ts work?" question is a BLOCKING deliverable, not a nicety.**
   Per the brief: if the lane cannot explain it, its fix is a guess. If the lane CANNOT reproduce the
   failure locally, that non-reproduction is itself the answer to why ERASE-1's EXECUTED PASS passed,
   and it must be reported as a finding, not smoothed over.

4. **SUPPLY-2 IS A DIFFERENT LANE THAN THE BRIEF DESCRIBED.** The scout disproved the catalog
   hypothesis, so remedies A/B/C (all `dependabot.yml`/`pnpm-workspace.yaml` edits) are **inapplicable
   -- no config change can fix this.** The lane becomes a **lockfile refresh**. Consequence for
   sequencing: its allowlist is now `pnpm-lock.yaml` + two manifests, which is a **direct collision
   with TSX-1**, confirming decision 1 was right for a reason I did not have at the time. SUPPLY-2
   cannot dispatch until TSX-1 has **merged**, not merely returned.
5. **The referral finding is carried into SETTINGS-1, not spun into its own lane.** Reason: adding a
   fifth lane risks the wave, and the finding has a direct consequence for a lane already planned --
   see FINDINGS 5.

## FINDINGS THAT CONTRADICT A SPEC
1. **[FU-CONTROLLER-CATFILE-DOTPATH-FALSE-ABSENT]** -- controller-found, wave start.
   `LazyTopper_Controller_Subagent_Model.md` Section 5 tells controllers to verify repo facts with
   `git cat-file -e origin/<branch>:<path>`. **On Windows Git Bash it silently reports ABSENT for any
   path with a dot-leading segment** -- MSYS rewrites the argument before git sees it:
   `origin/base/approved-thru-437:.github/dependabot.yml` -> `origin\base\approved-thru-437;.github\dependabot.yml`,
   exit 128. A CONTROL on a genuinely-absent path returns the SAME exit code and message shape, so the
   two are indistinguishable. I reported `.github/dependabot.yml` ABSENT; it is PRESENT.
   REMEDY: `git ls-tree -r --name-only <rev> -- <path>` (unaffected) or `MSYS_NO_PATHCONV=1`.
   Blast radius: `.github/`, `.env*`, `.claude/`, `.vscode/` -- exactly the config paths a CI or
   supply-chain lane asks about.
2. **`check:mojibake` "structurally blind to handoff/" is FALSE and superseded** (owner-supplied,
   found by the DPDP-A controller). #571 moved repoRoot to `git rev-parse --show-toplevel`;
   `check-mojibake.cjs:60` sets `REPORT_ONLY_PREFIXES = ['handoff/']` and nothing else, so
   `cofounder-skill/`, `ops/` and product paths ARE enforced. STILL TRUE: `:63` uses `git ls-files`,
   so it is TRACKED-ONLY -- "mojibake clean" claimed before `git add` is VACUOUS. STAGE FIRST.

--- AS REPORTED BY THE SETTINGS-1 LANE (#646), provenance intact. ---

** **18. THE REAL LOCALSTORAGE PREFIX ESCAPE IS `lazyTopper.vibeMode` -- CAPITAL T.** I dispatched
   this lane hunting a `?ref=`-shaped escape. **`?ref=` is SAFE** -- `"lazytopper.refstore."` is
   concatenated at the FRONT, so no URL param can escape it (proven through the real
   `captureIncomingReferral`/`creditPendingReferral` chain with 11 hostile values, each first
   asserting the chain actually wrote the key, plus a control showing the probe catches a key that
   DOES escape). **The actual escape is VibeToggle's legacy `lazyTopper.vibeMode`, which a
   case-sensitive `lazytopper.` sweep walks straight past.** Sweep made case-insensitive; both
   spellings pinned. `[FU-DPDP-VIBEMODE-LEGACY-KEY-CASE]`
   => ** **THE HYPOTHESIS WAS WRONG AND THE HUNT WAS RIGHT.** A student erasing their account would
   have kept a stale key while being told their data was gone. **Chasing a specific suspect found a
   different, real one -- that is the argument for naming a suspect at all.**
19. **THE EXPECTED App.tsx BLOCKER DOES NOT EXIST.** `/me` **IS** the account surface: `/settings` was
   RETIRED and `/profile` redirects there. Already routed under `RequireAuth`, already reachable from
   the mobile BottomNav profile icon and the desktop header avatar. **No forbidden file was needed.**
   => I braced for a blocker that a single re-derivation dissolved. **Cheap to brace for, but the
   lane's first act should be to check, not to plan around it.**
20. ** **INCIDENT, SELF-CAUGHT AND SELF-REPORTED: A MUTATION RESTORE WROTE ITS BACKUP OVER THE WRONG
   FILE, THEN "VERIFIED" THE HASH AGAINST THAT SAME WRONG FILE -- AND REPORTED `VERIFIED`.** Cause: a
   `shift` before `cp "$1"` in the lane's own script. It clobbered a test file. **Caught by a red
   control**; source restored to its exact baseline hash, test file rewritten, all 5 mutations re-run
   on the final tree with a tripwire hashing all 6 lane files.
   ** **SHARPER FORM OF THE STANDING RULE, AND IT BELONGS IN THE OPERATING MODEL:** *"verify the
   restore"* is not enough -- **VERIFY THE RESTORE AGAINST THE FILE YOU ACTUALLY MUTATED.** A restore
   verified against the wrong file produces a confident `VERIFIED` and a corrupted tree, which is the
   exact shape of the Wave 4 failure the rule was written for. **The lane reported this against its
   own interest; that is why it is in the record.**
21. ** **SCREENSHOTS CHANGED CODE THREE TIMES** -- the standing rule earning its place again:
   a duplicated disclosure heading; **the BottomNav painted over the dialog, hiding the input and BOTH
   buttons** -- and `z-index: 60` and `9999` behaved **IDENTICALLY**, because
   `<main class="animate-float-up">` carries a **transform, which traps `fixed` descendants** (fixed
   by `createPortal`); and post-portal the confirm button rendered **white-on-white** because the CSS
   tokens were scoped to `.lt-acct`. `[FU-DPDP-MODAL-TRANSFORM-ANCESTOR]`
   ** **EVERY ONE OF THESE PASSED THE WORDING ASSERTIONS.** A student would have met an invisible
   confirm button on a legally-required flow.
22. **`scope:guard --mode product` FAILS this lane; `--mode mixed` is correct** -- `docs/screenshots/**`
   is the `trackedTooling` lane, and `CLAUDE.md` Section 6 sanctions `mixed`. **Any future UI lane that
   captures screenshots inherits this.**
23. **Check `a15` verified INAPPLICABLE by RUNNING it**, not assumed -- it enumerates 11 server
   `.test.cjs` from disk and `.ts`/`.tsx` are invisible to it. **The correct handling of my warning:
   test the claim rather than trust either side of it.**

--- AS REPORTED BY THE EXPORT-1 LANE (#645), provenance intact. ---

** **13. CONTROLLER ERROR -- I WROTE AN UNSATISFIABLE ALLOWLIST. This one is mine.**
   I granted EXPORT-1 two new `server/**/*.test.cjs` files and **forbade `lazytopper/package.json`.**
   But `test:ci:docs-lane` check **a15** enumerates server test files **from disk** and fails CI
   unless each is wired into `test:matrix:all` **in that exact forbidden file.** The allowlist could
   not be satisfied. **#644 hit the identical constraint and edited THE SAME LINE**, so I also created
   a collision between my own two lanes.
   ** The lane **stopped and reported instead of quietly widening scope** -- the correct behaviour, and
   the reason this is a 2-line follow-up rather than a merge conflict. Patch is in #645's body and
   report Section 1. **APPLY AFTER #644 MERGES.** `[FU-EXPORT-WIRE-MATRIX-CHAIN]`
   => **LESSON FOR THE NEXT CONTROLLER: a new server `.test.cjs` ALWAYS drags `lazytopper/package.json`
   into the allowlist. Grant it, or sequence the lanes that need it.**
** **14. THE #638 ROLLBACK CAUSE IS NOT IN THE GATEWAY AT ALL -- the search space just narrowed sharply.**
   Lane reports: **a gateway boot crash CANNOT fail the Railway healthcheck.** `/shared-api/healthz`
   is served by **api-server's Express router**; the gateway is a **restarting child**. So neither
   TSX-1's warmup child nor anything else in the gateway can explain the rollback.
   **Three more boot hazards found in `index.cjs`, none of which can hang** (it looked specifically):
   - `require('typescript')` at line 4, **top-level and UNGUARDED -- and it is a devDependency.**
     ** **SAME FAILURE CLASS AS TSX-1's `tsx`, one `--prod` from firing.** This is
     `[FU-DEVDEPS-SHIP-TO-PRODUCTION]` biting a second time in one wave.
   - **11 `.ts` modules transpiled AND EXECUTED at boot behind no try/catch** (measured, not
     estimated); **4 are transitive and named nowhere in `index.cjs`.**
   - `server.listen` has **no `'error'` handler**, and there is **no `process.on('uncaughtException')`
     or `'unhandledRejection'` anywhere.**
   `[FU-GATEWAY-TYPESCRIPT-RUNTIME-DEP]` `[FU-GATEWAY-BOOT-TS-REQUIRE-UNGUARDED]`
   `[FU-GATEWAY-LISTEN-NO-ERROR-HANDLER]`
15. **"1 exportable:false" and "1 third-party" ARE THE SAME ROW** (`third-party.gemini`), not two --
   re-derived, `SAME ROW? true`. Both my briefs and `CONTROLLER_DPDP_Arc.md` Section 0 read as if they
   were two. **Read literally it invites either a duplicated disclosure, or a future
   exportable:false-but-not-third-party row being SILENTLY OMITTED.** Lane evaluates the two
   predicates **independently** and proves it with a fixture map splitting them into four cases.
16. **The export payload must NOT go through `sendJson`** -- its `redactErrorDetails` rewrites the
   value of any key named `details`/`detail`/`stack`/`trace`/... and **stops at depth 8**, so it would
   corrupt a student's own fields **inconsistently**. **Latent today, not present** (lane grepped
   `lazytopper/src`: no persisted shape carries such a field) -- **demonstrated by test so nobody
   tidies it back.** Errors still go through `sendJson`.
17. **The lane rejected its own mutation as too weak.** M2 first went red for a WEAKER reason than it
   would have claimed (a status assertion fired before the leak assertion). It added a standalone
   outcome-only leak test with a positive control rather than bank the red. ** **This is the
   behaviour the mutation rules exist to produce, and it was self-caught.**

--- AS REPORTED BY THE TSX-1 LANE (#644), provenance intact. Controller has not verified; these are
    code claims. But note this lane REPRODUCED the failure and executed both load paths, so its
    evidence is execution, not inspection. ---

** **9. PRODUCTION IS STILL DOWN AND WE DO NOT KNOW WHY. THIS SUPERSEDES SECTION 0 OF THE BRIEF.**
   The lane reports `tsx` **cannot** have caused #638's rollback:
   - the `runWarmup()` spawn **predates #638** (`be86cd94`); #638 changed nothing under `artifacts/`;
   - it fires **45s AFTER boot** and **only if `DATABASE_URL` is set**;
   - its stderr goes to `logger.warn` with **no `process.exit`** -- it cannot kill the process;
   - `/shared-api/healthz` is a **static route touching neither child**.
   The lane searched for a real boot crash and **found none** (it cleared the `qrInternals`
   default-param candidate: `__internals` IS exported, boot shape returns cleanly, `mapLoadError` null).
   => ** **DO NOT READ A GREEN DEPLOY OF #644 AS FIXING THE ROLLBACK.** The owner must supply the FIRST
   error line and the healthcheck result from the actual failed deployment. **Nobody but the owner has
   that log, so this is a hard block on diagnosing the real cause.**
10. **THE "EXECUTED PASS IN THE WRONG ENVIRONMENT" DIAGNOSIS IS WRONG FOR THIS INSTANCE.** ERASE-1's
   proof tested the **tsx-free CJS path** (`require.extensions['.ts']` via typescript+vm) and would
   still hold inside the container. Lane proved it by executing both loads from the gateway's cwd
   **with `tsx` unresolvable**: `STUDENT_DATA_MAP length=29`. The tsx failure is a **different
   process** -- an ESM child at `cwd=/app/lazytopper`, and `require.extensions` cannot serve
   `await import()`.
   ** **THE GENERAL LESSON ("only a boot proves it runs") SURVIVES AND IS STILL WORTH KEEPING. THE
   SPECIFIC ACCUSATION AGAINST ERASE-1 DOES NOT.** Fix the reason, not just the outcome -- the reason
   is what the next lane inherits. ERASE-1 did not do the thing it was blamed for.
11. **The failure was NOT hidden by the dev environment.** The lane reproduced it byte-for-byte, first
   try, in a clean worktree install. **Nothing concealed it -- nobody had ever run the command.** That
   is a weaker and more embarrassing failure mode than "it only breaks in prod", and it argues for a
   container/boot gate in CI (`FU-TSX1-NO-CONTAINER-GATE`) rather than for more environment ceremony.
12. **Two smaller brief corrections from the same lane:** `tsx` is declared in **TWO** importers
   (`artifacts/api-server` **and** `scripts`), not "only" the former. And brief option B was
   mis-framed -- **the map needs no loader at all**; it is `canonicalQuestionBank.ts` (8,543
   questions) that does.

--- the following are AS REPORTED BY THE SUPPLY-2 SCOUT, provenance intact. The controller has not
    verified them and cannot: they are code/CI claims. Weight them as a single lane's findings. ---

3. **THE PNPM-CATALOG HYPOTHESIS IS DISPROVED** -- the scout reports four independent grounds: the
   word "catalog" appears nowhere in the failure; none of the six packages is among the catalog's
   **18** keys (the brief carried 17); Dependabot has supported pnpm catalogs **GA since 2025-02-04**;
   and the real error is `security_update_not_possible` -- e.g. for `re2`,
   *"latest-resolvable-version 1.24.0 / lowest-non-vulnerable-version 1.26.1"*, all six identical in
   form. Reported cause: **all six are TRANSITIVE deps declared by no manifest** (proven with a
   passing control case), so `pnpm update <pkg> -r` is a no-op, and **Dependabot cannot update
   transitive deps for pnpm** (dependabot-core #13177).
   => **Remedies A, B and C in the brief are all inapplicable. No `dependabot.yml` change fixes this.**
   Reported remedy "D": refresh the stale `pnpm-lock.yaml` -- the parents' EXISTING semver ranges
   already permit every patched version. Two exceptions need a one-line manifest edit: `vitest` is
   **exact-pinned** `"3.2.4"`, and the repo's own `overrides` pin `esbuild: "0.27.3"`, **below** the
   patched 0.28.1 -- i.e. the repo is pinning itself to a vulnerable version.
4. ! **"A bot failure blocks every production deploy" IS TOO STRONG** -- scout reports the six
   failures attach to `6f7da56e` (PR #638), **not** to trunk HEAD, and that trunk HEAD `f654dc64` is
   GREEN (quality-gate / Analyze / state-board all success, combined status success). So the block is
   **commit-specific and intermittent**, not universal.
   ** **BUT the scout explicitly COULD NOT VERIFY Railway's actual gating rule -- no Railway access.**
   So the brief's premise is weakened, NOT disproved. **The owner has direct evidence here that no
   agent has** (he disabled Wait-for-CI because of this). **Owner confirmation owed; do not let this
   be recorded as "the brief was wrong."**
5. ** **A LIVE SECURITY SITE THAT NEITHER TOOL FLAGGED, AND IT HAS A CONSEQUENCE FOR SETTINGS-1.**
   Scout confirms CodeQL flagged **4 of 6** `setItem` calls in `referralService.ts` (lines 49/55/91/170,
   alerts #17-#20) and missed 142 and 169 -- those two are benign for that rule. **But a third site
   neither tool flagged:** line 142 writes the **unbounded, unvalidated `?ref=` URL param** to
   localStorage (validated only by `startsWith("LT-")`), and that value **later becomes part of a
   localStorage KEY** (75 -> 91), reachable live via `App.tsx:558` on every `?ref=` visit.
   ** **CONSEQUENCE THE SCOUT DID NOT DRAW AND I AM DRAWING: SETTINGS-1's browser-half erasure clears
   `localStorage['lazytopper.*']` BY PREFIX. If an attacker- or user-controlled URL param can shape a
   key, SETTINGS-1 MUST PROVE those keys still fall under the `lazytopper.*` prefix -- otherwise the
   erasure silently misses them and we tell a minor their data is gone when it is not.** This goes in
   SETTINGS-1's brief as a required test with a CONTROL.
6. **Stale/incorrect figures, all read from the run by the scout:** alert count is **121, not 112**
   (4 critical / 45 high / 59 medium / 13 low; 116 of 121 transitive). The **"4 criticals" are only
   THREE distinct vulnerabilities** -- vitest is double-counted (#222 and #145, same GHSA, lockfile vs
   manifest rows). And `.github/dependabot.yml`'s own header claims alerts and security updates are
   *"VERIFIED DISABLED"* -- **both are ENABLED now**; the header also claims
   `lazytopper/package-lock.json` is tracked, which is false.
7. **The MSYS path-mangling trap is WIDER than I found it.** I hit it on `git cat-file`; the scout hit
   it on **`gh api`** -- `gh api "/repos/..."` was rewritten to `C:/Program Files/Git/repos/...`.
   Remedy there: `MSYS_NO_PATHCONV=1` **and drop the leading slash**. Same root cause, two different
   tools -- so `[FU-CONTROLLER-CATFILE-DOTPATH-FALSE-ABSENT]` should be generalised beyond git.
8. **`vitest` IS SHIPPED TO RAILWAY** -- scout reports the Dockerfile installs devDependencies and
   deliberately does not prune. Reachability of the vitest CVE is still NO (`@vitest/ui` is not
   installed at all, no `--ui`/`--api` in any script), but **the "no prune" fact now has two
   consequences in this wave** -- it is also the reason TSX-1's missing `tsx` is an UNDECLARED
   dependency rather than a stripped one.

## BLOCKED / OWNER DECISIONS OWED
## OWNER RULINGS RECEIVED 2026-08-09 -- BINDING ON SUPPLY-2

**R1 - SUPPLY-2 SCOPE = (c) TARGETED NOW, FULL SWEEP AS A SEPARATE LATER PR.**
Reason (controller's, owner endorsed the phrasing): targeted keeps the boot signal clean; the sweep
then runs against a **known-good booting baseline**, which is the only condition under which its
result is interpretable.
** **OWNER ADDED A SECOND, MECHANICAL REASON: option (b) was never merely risky -- it was BLOCKED.**
`pnpm-lock.yaml` is an exact path, TSX-1 is editing it, and `lane_overlap.mjs:112` compares exact
membership. **A lockfile-touching SUPPLY-2 cannot run concurrently with TSX-1 at all. SUPPLY-2
sequences after TSX-1 MERGES regardless of the R3 answer.**
! **CONSTRAINT: a manifest change without a matching `pnpm-lock.yaml` update fails the Vercel build
too. Both move together, ALWAYS.**

**R2 - VITEST TARGET = (a) 3.2.6.** Two of four criticals removed for a one-line diff -- best ratio on
the board. (b) rejected: a major test-framework bump on the PR unblocking production makes any
failure un-diagnosable. (c) rejected: "unreachable" resting on `@vitest/ui` staying uninstalled is
one `pnpm add` from false.

**R3 - RAILWAY GATING = (c) HOLD PRIORITY OPEN.** Sequence EXPORT-1 next after TSX-1. Owner will
check the Railway setting himself.
** **THE OWNER RETRACTED HIS OWN CLAIM AND THE RETRACTION IS ON THE RECORD:** he said *"a bot failure
blocks every production deploy."* What he actually observed was **one** skipped deployment --
`fc4ed9d5`, whose Details pane showed #638's commit message and the banner *"CI check suite failed."*
He generalised from a single instance to a universal. **The accurate statement is: Railway gated the
deploy of #638 on THAT COMMIT'S check suite. Whether it gates every commit that way is UNKNOWN.**
=> Record it as unknown. **Do not let any lane inherit the universal.**

## ** [FU-DEVDEPS-SHIP-TO-PRODUCTION] -- OWNER-OPENED. GOES AT THE TOP OF SUPPLY-2'S REPORT.

**`devDependencies` ARE in the production image.** The Docker install is unfiltered and the no-prune
is deliberate and documented.

** **=> "NOT REACHABLE, IT'S A devDependency" IS FALSE FOR THIS PROJECT.** That is the default
assumption most alert triage runs on, and **it is wrong here.** **Every one of the 121 alerts must be
assessed as a PRODUCTION surface, whichever manifest section it sits in.** It changes how the
remaining ~117 are read, and it is exactly the kind of premise that would otherwise be **inherited
silently by every future security lane.**

**Consequence the owner drew for TSX-1:** the Dockerfile explicitly anticipates *"tsx if/when added"*
-- **but declare `tsx` in `dependencies`, NOT `devDependencies`.** It is a genuine runtime need for
the gateway, and **depending on "we never prune" makes correctness contingent on a comment nobody is
testing.** => **VERIFY #644 DECLARED IT IN `dependencies`; if it went to `devDependencies`, that is a
change request before merge.**

## OTHER BLOCKED / OWNER DECISIONS OWED
- **Railway "Wait for CI" is OFF.** The owner disabled it to get past the SUPPLY-2 blocker. A merge
  right now deploys with no check having passed. **Restore it the moment SUPPLY-2 lands.** This must
  be stated plainly in the handoff either way.
- **ERASE-1 (#638) live-verify is the owner's and is BLOCKED on TSX-1.** Status to state as-is:
  **merged, undeployed, ZERO live verification.** NOT "28 of 29" -- nothing has run.
  Fixture still present for it: `qrUploadSlots` doc with `uid: bYa4guLDHlSQXBEaHyZTeOGXOSr2` and
  `qr-uploads/bYa4guLDHlSQXBEaHyZTeOGXOSr2/`. Nothing sweeps it but a pickup or a new mint.
- **[FU-DPDP-GUARDIAN-CONSENT]** -- carried, NOT closed. Launch-blocking LEGAL question: DPDP treats
  under-18 data as a child's data requiring verifiable parental consent, and every LazyTopper student
  is in that class -- so it may reach SIGNUP, not just deletion. Neither controller nor lane rules on
  it. **The owner does.**
- **[FU-DPDP-USERS-COLLECTION-UNDECLARED]** -- closed by #639. `users` STAYS LISTED in the map until
  production is verified empty. De-listing is the one move that could make a future erasure lie.

## HANDOFF DRAFT - prose, ready to paste
*(Appended after every subagent returns -- ADDENDUM v1.1 Section 2. No lane may be dispatched until the
previous lane's paragraph is in this section.)*

### ** READ THIS BEFORE OPENING ANY HANDOFF PR -- WHY I DID NOT OPEN ONE

** **NO LANE OF WAVE DPDP-B IS ON TRUNK. #644, #645 and #646 are all OPEN DRAFTS awaiting the owner.**
Trunk moved during the wave only via **#635** (an unrelated ops-docs PR).

**Rule 0 says a wave is closed when `handoff/` describes trunk.** A handoff PR opened now would
**describe work that has not landed** -- it would be false on the day it was written. And it would sit
open while three product PRs merge, which is the **documented stale-base hazard**: a docs PR left open
while trunk moves can silently revert another lane.

=> **THE CORRECT MOVE IS TO STAND DOWN WITH THE CLOSE-OUT WRITTEN, NOT TO OPEN A PREMATURE PR.**
The addendum's 25% floor assumes the wave's lanes have merged. Mine have not, so its precondition is
unmet. **This file IS the bounded close-out.** Whoever opens the handoff PR -- a fresh controller, or
me if the owner merges while I still have context -- writes it FROM THE TEXT BELOW, after
`gh pr list --state open` confirms no other handoff PR is open.

### [CURRENT] Wave DPDP-B - a student can find the door, but nobody has opened it yet

**Three PRs are built, gated and unmerged, and together they are the whole DPDP front.** `#646` gives
a student a real **Download my data** and **Delete my account** on `/me`, with a type-to-confirm flow
proportionate to an irreversible act on a minor's account and **an explicit, un-softened line that the
AI provider retains what it retains.** `#645` builds the export that feeds it, driven by
`STUDENT_DATA_MAP` and **disclosing what it excluded rather than pretending it does not exist.** `#644`
declares the `tsx` the spawned warmup child has needed since `be86cd94`.

** **WHAT A STUDENT CAN ACTUALLY DO TODAY: NOTHING. All three are drafts, and `#638`'s erasure route
is merged but UNDEPLOYED with ZERO live verification.** The wave built the door; it is not yet hung.

** **AND PRODUCTION STILL CANNOT DEPLOY FOR A REASON NOBODY HAS IDENTIFIED.** The `tsx` diagnosis was
disproved by the lane sent to act on it. **Two lanes have now independently cleared the gateway** --
`#645` established that a gateway boot crash **cannot fail the Railway healthcheck at all**, because
`/shared-api/healthz` is served by api-server's Express router and the gateway is a restarting child.
**The first error line from `#638`'s failed deployment is the only remaining input, and only the owner
has it.**

### Lanes
| lane | PR | what it changed | what it disproved |
|---|---|---|---|
| SETTINGS-1 | **#646** (draft, CI GREEN run `31301114584`, 1701 tests) | the student-facing DPDP surface on `/me` -- 14 files, screenshots at 360px | **the escape it was sent to find.** `?ref=` is SAFE (prefix concatenated at the front); the real escape is **`lazyTopper.vibeMode` -- capital T**, invisible to a case-sensitive sweep. Also: **no App.tsx blocker existed**; `/me` was already the routed account surface |
| EXPORT-1 | **#645** (draft, CI red on ONE wiring line) | map-driven export reusing ERASE-1's walker unmodified | **my allowlist** -- unsatisfiable as written (check `a15` forces `lazytopper/package.json`). Also: `exportable:false` and `third-party` are **ONE ROW, not two**; `sendJson` would have **corrupted a student's own fields** |
| TSX-1 | **#644** (draft, CI GREEN) | declared `tsx`; new `spawnedLoaderResolution.test.cjs` | **the wave's founding diagnosis.** `tsx` cannot have caused #638's rollback; ERASE-1's `EXECUTED PASS` was **valid**; and the failure was never hidden by the dev environment -- **nobody had ever run the command** |
| SUPPLY-2-SCOUT | none (read-only) | nothing | **the pnpm-catalog hypothesis, four ways.** The six failures are `security_update_not_possible` on **transitive** deps; no `dependabot.yml` change could ever have fixed it |

### Lanes
| lane | PR | what it changed | what it disproved |
|---|---|---|---|
| TSX-1 | **#644** (draft) | declared `tsx` in `lazytopper/package.json` + lockfile + a new `spawnedLoaderResolution.test.cjs`. Fixes `runWarmup()`'s spawned ESM child, which **has never run** since `be86cd94` | ** **THE WAVE BRIEF'S ENTIRE SECTION 0 DIAGNOSIS.** `tsx` cannot have caused #638's rollback; `trianglesGrindContract.ts` and `studentDataMap.ts` both load through the same tsx-free CJS hook; ERASE-1's `EXECUTED PASS` was VALID and would still hold in the container; the failure was never reproduced-only-in-prod -- it reproduced locally first try, because **nobody had ever run the command** |
| SUPPLY-2-SCOUT | none (read-only) | nothing -- investigation only | **the pnpm-catalog hypothesis, four ways.** The six Dependabot failures are `security_update_not_possible` on **transitive** deps that no manifest declares; Dependabot cannot update transitive deps for pnpm at all. **No `dependabot.yml` change could ever have fixed it** -- the brief's three candidate remedies were all inapplicable. Also: alerts are 121 not 112, the "4 criticals" are 3 distinct vulns, and only ONE (protobufjs, via firebase-admin on the live api-server) is reachable in the product |

### FU ids - new / closed / kept open
- NEW: `[FU-CONTROLLER-CATFILE-DOTPATH-FALSE-ABSENT]` (see FINDINGS 1; **generalise beyond git --
  the scout hit the same MSYS mangling on `gh api`**)
- NEW from the scout: `FU-SUPPLY2-LOCKFILE-STALE`, `FU-SUPPLY2-VITEST-EXACT-PIN`,
  `FU-SUPPLY2-ESBUILD-OVERRIDE-PINS-VULNERABLE`, `FU-SUPPLY2-DEPENDABOT-YML-HEADER-STALE`,
  `FU-SUPPLY2-PNPM-TRANSITIVE-UNSUPPORTED`, `FU-SUPPLY2-REFERRAL-UNBOUNDED-URL-PARAM`,
  `FU-SUPPLY2-DEPLOY-BLOCK-SCOPE` -- bodies in
  `C:\Users\Chetan\OneDrive\Desktop\diff\report-supply-2-scout-2026-08-09.md`
- KEPT OPEN: `[FU-DPDP-GUARDIAN-CONSENT]` -- owner ruling owed, launch-blocking
- CLOSED by #639: `[FU-DPDP-USERS-COLLECTION-UNDECLARED]` (map entry RETAINED deliberately)

### Decisions made, with the reason
- (see DECISIONS MADE THIS WAVE above -- copy with reasons intact, not just verdicts)

### CARRY FORWARD VERBATIM -- BUT RE-CHECK, NEVER COPY BLIND
- The dormancy block in `CURRENT_STATE.md`. **RE-DERIVE IT.** `WIRE-2` (#621) already ended #578,
  #611 and #617; `gradeQuickPracticeBatch` IS invoked at `PracticePage.tsx:2223`.
  `[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` -- carry forward verbatim never means carry
  forward unchecked.
- **Whether Railway's Wait-for-CI has been restored.** State it plainly either way.

## WHICH ARTEFACTS ARE THE CONTROLLER'S OWN EXTRACT
- `CONTROLLER_WAVE_DPDP_B.md` and `CONTROLLER_DPDP_Arc.md` at repo root were **written to disk by me
  on receipt** from owner attachments. Wording preserved; corrupted decorative glyphs normalised to
  ASCII; preambles and any `[CONTROLLER NOTE:]` markers are **MINE, not the owner's**. The owner's
  authored source is the attachment, not these files.
- This state file is mine.
