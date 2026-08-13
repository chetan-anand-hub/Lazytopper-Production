<!--
CONTROLLER PREAMBLE (added by the Wave DPDP-B controller on receipt; the body below is the
owner's spec, faithfully preserved).
- Written to disk 2026-08-09. Trunk re-derived at receipt: f654dc645152049830c16645c6aeb2f6dd46b353
- The spec arrived as an ATTACHMENT with transport-corrupted emphasis glyphs (stray "a-hat"/
  "A-hat" sequences). Those markers are DECORATIVE ONLY and carry no instruction. They have been
  normalised to plain ASCII markers here. NO WORDING was changed, reordered, or removed.
- TWO CORRECTIONS the owner supplied on dispatch, which OVERRIDE the body below:
  (1) Section 7 says "check:mojibake scans TRACKED files only" and older notes call it
      "structurally blind to handoff/". THE BLINDNESS CLAIM IS FALSE AND SUPERSEDED. PR #571
      changed repoRoot to `git rev-parse --show-toplevel`, and check-mojibake.cjs:60 sets
      REPORT_ONLY_PREFIXES = ['handoff/'] and nothing else -- so cofounder-skill/, ops/ and all
      product paths ARE enforced. WHAT REMAINS TRUE: :63 uses `git ls-files`, so it is
      TRACKED-ONLY. A new file is invisible until staged, and "mojibake clean" claimed before
      `git add` is VACUOUS. STAGE BEFORE CLAIMING CLEAN.
  (2) Section 1 dependency note: #637 (MI-CONCEPT-1) is CONFIRMED on trunk (92cc9fc4, verified
      by `git merge-base --is-ancestor`), so SETTINGS-1's queue behind MI-CONCEPT-1 IS CLEARED.
- ONE CONTROLLER FINDING added on receipt, see Section 9 (appended by the controller, clearly
  marked as NOT part of the owner's spec).
-->

# CONTROLLER - WAVE DPDP-B - CLOSE THE DPDP FRONT

**v1.0 - 2026-08-09 - trunk `6f7da56e` at authoring -- RE-DERIVE IT.**
Read first: `LazyTopper_Controller_Subagent_Model.md`, then
`CONTROLLER_ADDENDUM_Context_Safeguards.md` (**v1.1 - mandatory**).
Background: `CONTROLLER_DPDP_Arc.md` Section 0 for the data-map facts.

> - **You never read product source, never run builds, never inspect diffs.**
> - **Your lifetime is ONE WAVE.** Report `CONTEXT REMAINING: n%` in every message.
> -- **Nothing DPDP-shaped should remain open after this wave.**

---

## 0 - *** PRODUCTION CANNOT DEPLOY. THIS IS LANE 1.

**`#638` (ERASE-1) is merged and has NEVER RUN.** Its deployment crashed on boot and Railway rolled it
back. Production serves the `#639` build.

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /app/lazytopper/
```

**Verified on trunk:** `tsx` is declared **only** in `artifacts/api-server/package.json`
(`"tsx": "catalog:"`). It is **absent from `lazytopper/package.json` and the root.** pnpm workspaces
isolate dependencies per package, so the gateway cannot resolve it. **The Dockerfile does NOT prune**
(`# do NOT run --prod / prune`) -- this is an **undeclared** dependency, not a stripped one.

** **The mechanism, and it is the rung this project's evidence ladder was missing:**

> **A test proves the code works. A build chunk proves it ships. Only a boot proves it runs.**

> ### !!! CORRECTION 2026-08-09, applied by the DPDP-B controller after lane TSX-1 (#644) reported.
> **THE PARAGRAPH BELOW IS DISPROVED. It is retained, not deleted, so the reasoning stays legible.**
>
> **`tsx` CANNOT have caused #638's rollback**, on four grounds TSX-1 evidenced by EXECUTION:
> the `runWarmup()` spawn **predates #638** (`be86cd94`) and #638 changed nothing under `artifacts/`;
> it fires **45s AFTER boot** and only if `DATABASE_URL` is set; its stderr goes to `logger.warn`
> with **no `process.exit`**, so it cannot kill the process; and `/shared-api/healthz` is a **static
> route touching neither child.**
>
> **ERASE-1's `EXECUTED PASS` WAS VALID AND WOULD STILL HOLD IN THE CONTAINER.** It tested the
> **tsx-free** CJS path (`require.extensions['.ts']` via typescript+vm). TSX-1 proved this by running
> both loads from the gateway's cwd **with `tsx` unresolvable**: `STUDENT_DATA_MAP length=29`. The
> `tsx` need belongs to a **different process** -- an ESM child at `cwd=/app/lazytopper`, where
> `require.extensions` cannot serve `await import()`.
>
> **And the failure was never hidden by the environment.** TSX-1 reproduced it byte-for-byte, first
> try, in a clean worktree. **Nobody had ever run the command.**
>
> ** **WHAT SURVIVES:** *a test proves the code works; a build chunk proves it ships; only a boot
> proves it runs* -- still true, still worth keeping, and it motivates `FU-TSX1-NO-CONTAINER-GATE`
> (nothing in this repo builds the Docker image, so no gate can catch a boot failure).
> ** **WHAT DOES NOT:** the accusation against ERASE-1. **It did not do the thing it was blamed for.**
> Fix the reason, not just the outcome -- the reason is what the next lane inherits.
> ** **#638's ROLLBACK CAUSE REMAINS UNIDENTIFIED. Do not read a green deploy of #644 as fixing it.**

ERASE-1's `MAP IMPORT IN SERVER PROCESS: EXECUTED PASS` was **true** -- in a dev worktree, where every
workspace dependency resolves. It never executed in the production image. **An `EXECUTED PASS` is
scoped to the environment that executed it**, and a lane-blocking proof run in the wrong environment
reads exactly like a met requirement.

=> **Every lane in this wave that adds a runtime import to a server MUST state which image it executed
in.** Making the proof mandatory was not enough; nobody specified where.

> ! **RAILWAY'S "WAIT FOR CI" IS CURRENTLY OFF** -- the owner disabled it to get past `SUPPLY-2`'s
> blocker. **A merge now deploys with no check having passed.** Tell him to restore it the moment
> `SUPPLY-2` lands. **Say this in your handoff.**

---

## 1 - THE WAVE - FOUR LANES

```
TSX-1  ---->  the #638 live-verify (OWNER)  ----
SUPPLY-2 -------------------------------------+---->  EXPORT-1  ---->  SETTINGS-1
```

**TSX-1 first, always.** Nothing backend ships until the gateway boots.
**SUPPLY-2 may run in parallel with TSX-1** -- `.github/` and manifests are disjoint from
`lazytopper/package.json`... ! **unless TSX-1's fix lands in a manifest SUPPLY-2 also edits.**
**Confirm exact paths before parallelising; if they touch, sequence them.**

- **Disjointness is by EXACT PATH** -- `lane_overlap.mjs:112`. ! **ME-B is running in parallel** on
`src/pages/`, `src/lib/desktop/`, `src/pages/tutor/`. **Confirm with `gh pr list --state open` before
every dispatch.**

---

## 2 - LANE TSX-1 - make the gateway boot

**Allowlist:** `lazytopper/package.json` - `pnpm-lock.yaml` - **or** `lazytopper/server/**` if the
lane proves a better fix - tests.

**The obvious fix is one line** -- declare `tsx` in `lazytopper/package.json`. - **But have the lane
decide, not assume.** Two alternatives it should weigh and evidence:

- **Pre-compile the map** so the gateway loads JSON or `.js` at boot and needs no TS loader at all.
  -> Removes a runtime dependency from a server process, which is strictly better if cheap.
- **Move the loader** to a package that already has `tsx`.

! **A manifest change WITHOUT a matching `pnpm-lock.yaml` update fails the Vercel build too.** All
four build paths use `--frozen-lockfile`.

- **The gateway already loads `trianglesGrindContract.ts` at boot through the same hook.** The lane
must explain **why that one worked and this one did not** -- if it cannot, its fix is a guess.

> ### !!! CORRECTED 2026-08-09 (DPDP-B controller, after TSX-1 #644). **THE PREMISE ABOVE IS FALSE.**
> **BOTH files load fine through the same tsx-free CJS `require.extensions['.ts']` hook.** There was
> no "one worked and one did not" to explain. TSX-1 proved it by executing both from the gateway's
> cwd with `tsx` unresolvable (`STUDENT_DATA_MAP length=29`). The `tsx` failure lives in a **different
> process** -- `runWarmup()`'s spawned ESM child.
> The question was still worth ASKING: it is what made the lane execute both paths instead of
> assuming, and that is how the false premise was caught. **A good question built on a wrong premise
> is not a wasted question -- but the premise must not be inherited.**
> ! Two further corrections from the same lane: **`tsx` is declared in TWO importers**
> (`artifacts/api-server` **and** `scripts`), not "only" the former. And **option B above is
> mis-framed** -- the map needs no loader at all; `canonicalQuestionBank.ts` (8,543 questions) does.

> ** **ACCEPTANCE IS A SUCCESSFUL RAILWAY BOOT. NOT A GREEN SUITE.** The report must quote the
> healthcheck succeeding and the deploy reaching Active. **Anything less repeats the exact failure
> this lane exists to fix.**

**Then the owner completes `#638`'s live-verify** -- the abandoned QR upload. That fixture still
exists: `qrUploadSlots` doc with `uid: bYa4guLDHlSQXBEaHyZTeOGXOSr2`, and
`qr-uploads/bYa4guLDHlSQXBEaHyZTeOGXOSr2/`. **Nothing sweeps it but a pickup or a new mint.**
- **Until then, ERASE-1's status is: merged, undeployed, ZERO live verification.** Not "28 of 29" --
nothing has run. **Say it that way.**

---

## 3 - LANE SUPPLY-2 - Dependabot, fixed at the root

**Allowlist:** `.github/dependabot.yml` - `pnpm-workspace.yaml` - affected `package.json` files -
`pnpm-lock.yaml` - tests.

**THE OWNER'S RULING: fix the root cause. Security updates and automation are important and stay
ON.** Turning alerts off is **not** an option.

**The symptom:** six Dependabot Update workflow runs fail on trunk (`re2`, `nanoid`, `dompurify`,
`react-router`, `js-yaml`, `hono`), each in ~1m35s. ~~**Railway gates deploys on the branch check
suite, so a bot failure blocks every production deploy**~~ -- visible only as a "Skipped" badge.

> ### !!! RETRACTED BY THE OWNER, 2026-08-09. **THE RETRACTION IS HIS, NOT A LANE'S ERROR.**
> The struck claim was an **over-generalisation from a single instance.** What was actually observed
> was **ONE** skipped deployment -- `fc4ed9d5`, whose Details pane showed #638's commit message and
> the banner *"CI check suite failed."* That one observation was generalised to a universal.
>
> **THE ACCURATE STATEMENT:** *Railway gated the deploy of #638 on THAT COMMIT'S check suite.*
> **Whether it gates every commit that way is UNKNOWN** -- and it is not knowable from an agent's
> seat. The SUPPLY-2 scout's counter-evidence is better than the original claim: the six advisories
> attach to `6f7da56e`, while trunk HEAD `f654dc64` is **green, combined status success**.
> ** **DO NOT LET ANY LANE INHERIT THE UNIVERSAL.** Owner is checking the Railway setting.
>
> ** **THIS DOES NOT DOWNGRADE SUPPLY-2.** It is worth doing under every answer: the repo's own
> `overrides` pin `esbuild: "0.27.3"`, **below** the patched 0.28.1 -- a self-inflicted vulnerability
> independent of what Railway gates on. **And see `[FU-DEVDEPS-SHIP-TO-PRODUCTION]` in Section 9.**

**The hypothesis -- VERIFY IT FIRST, do not build on it.** The repo uses **pnpm catalogs**:
`pnpm-workspace.yaml` defines 17 catalog entries and **six packages reference `catalog:`**
(`artifacts/lazytopper-app` alone has 16). Dependabot's `npm_and_yarn` updater may be unable to
resolve that protocol.

** **STEP ONE IS TO OPEN A FAILING JOB LOG AND READ THE ACTUAL ERROR.** If it does not name catalog
resolution, this hypothesis is wrong and everything below changes. **This came from the cofounder's
inference, not from a log.**

**Then choose, with evidence:**

| | |
|---|---|
| **A - Check current Dependabot support for pnpm catalogs** | **Do this first.** Five minutes of current documentation. If a flag or newer ecosystem setting exists, A-C below are unnecessary |
| **B - Un-catalogue security-relevant packages** | Explicit versions in each manifest. ! Creates two conventions -- needs a stated rule for which packages are which |
| **C - Scope `directory:`** to trees without `catalog:` refs | `lazytopper/` and the root are clean. Only works if the relevant packages live there |

**! Two traps documented in the config file itself:**
1. **An unparseable `dependabot.yml` fails SILENTLY.** "It did not error" proves nothing.
2. **Dependabot reads the config from the DEFAULT BRANCH**, so a change is unverifiable until merged.
   **Expect to merge, then observe.**
3. ! **Do NOT set `target-branch`** -- it would suppress security updates, the exact capability being
   protected.

> ** **ACCEPTANCE: a Dependabot security-update PR that ACTUALLY OPENS AND PASSES CI.** Not a config
> that parses, not a green suite.

**Also in scope, and it does not depend on Dependabot working: READ THE 4 CRITICAL ALERTS BY HAND.**
112 alerts, 4 critical, 40 high, unread. **Report what each critical actually is and whether it is
reachable in this product** -- a `notes/*.html` prototype and a live server path are not the same
finding. **This is ahead of payments on the critical path.**

- **The alert list is not the set.** CodeQL flagged **4 of 6** `setItem` calls in
`referralService.ts`. Anyone auditing from an alert list covers four and believes they are done.

---

## 4 - LANE EXPORT-1 - data export

**Depends on TSX-1 (the server must boot).** ! **Registers in `index.cjs` -- an exact-path collision
with anything else touching it. Sequence, do not parallelise.**

**Build** -- driven by `STUDENT_DATA_MAP`'s `exportable` flag. **Reuse ERASE-1's map-walker; do not
author a second.** **One location is `exportable: false`** -- exclude it **and disclose the
exclusion**, rather than pretending it does not exist. Include the `third-party-unreachable` entry as
a disclosure line.

Machine-readable **and legible to a parent.**

**Tests** -- every `exportable: true` location appears - the `exportable: false` one does not **and is
disclosed** (CONTROL both ways) - an empty account exports a valid, honest, empty file.

---

## 5 - LANE SETTINGS-1 - the student-facing surface

**Depends on EXPORT-1. This is the lane that makes DPDP real for a student.**

** **Until it ships, erasure and export are reachable only by an authenticated API call -- no student
can use either.** That is the sharpest dormancy on the board.

**Build**
- **Download my data** -> EXPORT-1. **Delete my account** -> ERASE-1.
- ** **A confirmation flow proportionate to an irreversible act on a minor's account.**
  Type-to-confirm, a plain statement of what is deleted, and **an explicit line that the AI provider
  retains what it retains** (the `third-party-unreachable` entry). **Do not soften it.**
- **The browser half:** clear `localStorage['lazytopper.*']` -- the one `client-local` location.
  ! **`mistakeLogService.ts` owns `lazytopper.mistakeLogs.v1` and was changed by `#637`.** Read it as
  it is on trunk now.
- After erasure the student is signed out and cannot re-enter a half-deleted account.

**Tests** -- the flow cannot be completed accidentally - the local keys are actually cleared (CONTROL:
a key outside the `lazytopper.*` prefix survives) - the third-party disclosure is pinned by copy
assertion - a cancelled flow deletes nothing.

**OWNER LIVE-VERIFY:** the whole thing on a real throwaway account, **on a phone, at 360px**, then
confirmed in the Firebase Console.

---

## 6 - CARRY, DO NOT CLOSE
- **`[FU-DPDP-GUARDIAN-CONSENT]`** -- ! **escalated as a launch-blocking LEGAL question.** India's DPDP
  Act treats under-18 data as a child's data and requires verifiable parental consent. **Every
  LazyTopper student is in that class**, so this may reach signup, not just deletion. **Neither you
  nor a lane rules on it. The owner does.**
- **`[FU-DPDP-USERS-COLLECTION-UNDECLARED]`** -- closed by `#639`; `users` stays listed in the map until
  production is verified empty. **De-listing is the one move that could make a future erasure lie.**

---

## 7 - STANDING - every lane inherits

**** THE EVIDENCE LADDER** (Section 0). **Any lane adding a runtime import to a server states which
image it executed in.**
**SHOW THE EVIDENCE, NOT THE CONCLUSION.** **NEVER `head`/`grep -c` ON AN EXISTENCE QUESTION.**
**ENUMERATE THE SET.** **A COUNT IS READ AT THE TIME, NEVER CARRIED -- including from this brief.**
**NO FALSE REDS** -- require the failure to quote the injected value, plus a pre-mutation green and a
did-it-actually-run assertion. ! Five REDs once came from `ENOENT` on an extensionless `.bin/vitest`.
**`scope:guard` IS VACUOUS ON AN UPDATE-ONLY LANE** -- reproduce the authoring condition in a
throwaway worktree.
**THE MAP IS THE SPEC.** Iterate `STUDENT_DATA_MAP`; a hardcoded list drifts the day someone adds a
collection.
**A ZERO-MATCH DELETE MUST NOT REPORT SUCCESS.** ! `qrUploadSlots` keys uid as a **field**, not a doc
id.
**RESTORE BY BYTE SNAPSHOT AND SHA.** **`scope:guard` BEFORE `git add`.** ! **`check:mojibake`
scans TRACKED files only.** (See PREAMBLE correction (1): the "blind to handoff/" half of this rule
is FALSE and superseded; the tracked-only half is TRUE. STAGE BEFORE CLAIMING CLEAN.)
**NEVER read or push from `C:\Projects\Lazytopper-Production`.**
**PUSH AS DRAFT. Never `gh pr ready`, never merge.**
! **Railway lags trunk.** Before reporting anything missing in production, **check Railway's active
commit.** A 404 was already misread as a missing route once today.

**IF THIS SPEC IS WRONG, YOUR VERIFIED FINDING WINS.** `DPDP-1` disproved its own dispatch spec on
Razorpay and Resend; ERASE-1's scout collapsed a two-surface question into a false dichotomy. **Expect
to do the same to this one.**

---

## 8 - RULE 0 - THE HANDOFF

**A wave is closed when `handoff/` describes trunk.** Archive first and alone, **verified by SHA**.
Exactly one un-superseded `[CURRENT]`; prepends proven by a **per-file heading census**.
** **RE-DERIVE THE DORMANCY BLOCK -- do not copy it.** `WIRE-2` (`#621`) already ended `#578`, `#611`
and `#617`; `gradeQuickPracticeBatch` is **invoked** at `PracticePage.tsx:2223`.
`[FU-HANDOFF-DORMANCY-BLOCK-STALE-CARRYFORWARD]` -- **carry forward verbatim never means carry forward
unchecked.**
! **Before opening a handoff PR, run `gh pr list --state open`.** If ME-B's is open, hand it your
close-out and stand down. **Exactly one at any moment.**
**And say plainly in the handoff whether Railway's Wait-for-CI has been restored.**

---

## 9 - CONTROLLER-APPENDED FINDING (NOT part of the owner's spec)

**[FU-CONTROLLER-CATFILE-DOTPATH-FALSE-ABSENT]** -- found by the DPDP-B controller at wave start,
2026-08-09, while verifying trunk facts.

`LazyTopper_Controller_Subagent_Model.md` Section 5 instructs controllers to use
`git cat-file -e origin/<branch>:<path>` "before stating what is or is not in the repo". **On Windows
Git Bash this command silently reports ABSENT for any path whose segment after the colon begins with
a dot.** MSYS path conversion rewrites the argument before git sees it.

Observed, with control:

```
$ git cat-file -e "origin/base/approved-thru-437:.github/dependabot.yml"
fatal: Not a valid object name origin\base\approved-thru-437;.github\dependabot.yml   # exit 128

$ git cat-file -e "origin/base/approved-thru-437:.github/NOPE_NOT_REAL.yml"           # CONTROL
fatal: Not a valid object name origin\base\approved-thru-437;.github\NOPE_NOT_REAL.yml # exit 128
```

The colon became `;` and the slashes became `\`. **A genuinely-missing path and a mangled one are
indistinguishable** -- same exit code, same message shape. `.github/dependabot.yml` IS present on
trunk; the command said it was not. Seven non-dot paths in the same loop returned correct results.

**REMEDY -- use either:**
- `git ls-tree -r --name-only <rev> -- <path>` (unaffected; this is the instrument of record), or
- `MSYS_NO_PATHCONV=1 git cat-file -e "<rev>:<path>"` (verified exit 0 on the same input).

**Why it matters beyond this wave:** it hits `.github/`, `.env*`, `.claude/`, `.vscode/` -- exactly
the config paths a supply-chain or CI lane asks about. A controller following the operating model's
own advice gets a false ABSENT and propagates it into every instruction file it writes.
