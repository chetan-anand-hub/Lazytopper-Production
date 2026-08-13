# BRIEF — GATE-1 · close the premise-checker's three holes

**Lane:** GATE-1 · **Date:** 2026-08-13 · **Spec:** `LazyTopper_GATE-1_v1.0_2026-08-12.md`

| | |
|---|---|
| Worktree | `C:\Projects\LT-worktrees\gate-1` |
| Branch | `fix/gate-1-template-mode` |
| Base SHA | `97f39197974b2865ead913200c91765e0a75ea0a` (trunk tip at start — verified, unmoved) |
| HEAD SHA | `398b000fed3d6a416c11e7eadec90b593b5c1dcb` |
| PR | **#661 — MERGED** to trunk at `267f26b0`. Opened as DRAFT; never self-merged |

**VERDICT: PASS-WITH-FOLLOW-UP.** All three fixes landed, mutation-verified. Two deviations
from the spec's acceptance block, both expected and both explained below (§3d, and one
follow-up on typecheck coverage). Nothing was left undone.

---

## §0c.0 — PREMISE GATE (base-SHA script, before any edit)

The spec reached me through a pipeline that had UTF-8-decoded it as latin-1 (`Â§` for `§`,
`â` for `—`). Rather than retype it and guess at the dashes, I located the authoritative file
on disk and copied it byte-for-byte:

```
SHA256(source) = 7F7D84B57609F4531FAC4907C9CF8CECA89DB88C558BDDDE01F8FE1FE3774E5D
SHA256(dest)   = 7F7D84B57609F4531FAC4907C9CF8CECA89DB88C558BDDDE01F8FE1FE3774E5D
.gitignore:107:ops/.specs/	ops/.specs/GATE-1.md
```

```
$ node scripts/premise_ledger_check.mjs ops/.specs/GATE-1.md --worktree=. --strict-anchor

PASS  ops/.specs/GATE-1.md  (10 premises)
  ✓ ledger complete, evidence well-formed

premise-ledger: 1/1 specs passed (evidence resolved against .)
EXIT=0
```

---

## §0c.1 — PREMISES P1–P10

`git ls-remote origin base/approved-thru-437` → `97f39197974b2865ead913200c91765e0a75ea0a`,
identical to the declared Base SHA. Fresh worktree, HEAD `97f39197`.

| ID | Result |
|----|--------|
| P1 | **OK** — `premise_ledger_check.mjs:168` carries `'Copy templates/AGENT_SPEC_TEMPLATE.md.'` |
| P2 | **OK** — `ops/AGENT_SPEC_TEMPLATE.md:1` = `# LazyTopper — Agent Task: <LANE-ID> <short title>` |
| P3 | **OK** — `:83` `SHA_RE = /Base SHA:\s*`?([0-9a-f]{7,40})`?/i` matches forty zeros |
| P4 | **OK** — `:173-176` is presence-only. `shaMatch` is thereafter read solely as `shaMatch?.[1]` for reporting (`:184`, `:192`, `:320`); no value check exists anywhere in the file |
| P5 | **OK, one imprecision** — see below |
| P6 | **OK, with a qualification that matters** — see below |
| P7 | **OK** — `scripts/package.json:19`, six `src/*.test.ts` files via `node --import tsx/esm --test` |
| P8 | **OK** — `opsAcceptanceGuard.test.ts:50` `"../../.."` resolves file→`src`→`scripts`→repo root |
| P9 | **OK** — `:35-36` `node:test` + `node:assert/strict` |
| P10 | **OK** — `.github/CODEOWNERS:31` is `/scripts/ops/`. There is **no** `/scripts/` entry, so all three files this lane touches are ungated |

**P5 — imprecision, non-blocking.** Lines 329-334 contain *five* long flags, not four:
`--json`, `--strict-anchor`, `--worktree=`, `--max-lines=`, and `--help` at `:334`. The
"four" matches the documented usage block at `:30-33`. §2.2's instruction is unaffected.
Owner accepted this at pre-flight.

**P6 — qualification.** The template passes at base SHA **only without `--worktree`**
(confirmed, exit 0). **With** `--worktree=.` it already failed *before* this lane, for an
unrelated reason — its placeholder evidence path `lazytopper/src/<path>.ts` does not exist:

```
FAIL  ops/AGENT_SPEC_TEMPLATE.md  (2 premises)
  ✗ L21: P1: lazytopper/src/<path>.ts does not exist in the worktree
EXIT=1
```

§3(a)/(b) omit `--worktree`, so acceptance is unaffected. **Known limit worth recording: the
template cannot be `--worktree`-gated as written.** Not in this lane's scope.

---

## §0b — Q0 / Q1 / Q2

**Q0 — the remediation path is genuinely dead.** Literal results:

- `git ls-tree --name-only HEAD` — no `templates` entry at root. Top level is: `.agents`,
  `.canvas`, `.dockerignore`, `.firebaserc`, `.github`, `.gitignore`, `.npmrc`, `CLAUDE.md`,
  `Dockerfile`, `FIREBASE_SETUP.md`, `artifacts`, `cofounder-skill`, `docs`, `firebase.json`,
  `firestore-rules-tests`, `firestore.indexes.json`, `firestore.rules`, `handoff`,
  `lazytopper-product-features.docx`, `lazytopper`, `ledger`, `lib`, `notes`, `ops`,
  `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `railway.json`, `replit.md`,
  `screenshots`, `scripts`, `tsconfig.base.json`, `tsconfig.json`, `vercel.json`.
- Tree-wide, the only paths containing `templates` are `handoff/templates/session-update-template.md`
  and `lazytopper/src/tutor/diagram/diagramTemplates.ts` (a `.ts` file, not a directory).
- `AGENT_SPEC_TEMPLATE.md` — exactly one match, tracked (`ops/AGENT_SPEC_TEMPLATE.md`) and
  one on disk (`C:\Projects\LT-worktrees\gate-1\ops\AGENT_SPEC_TEMPLATE.md`).

**Q1 — NO, an install was required. Reported before installing, not silently.** A fresh
worktree has no `node_modules` at root, `scripts/`, or `lazytopper/`:

```
RESOLVE FAILED: MODULE_NOT_FOUND
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from C:\Projects\LT-worktrees\gate-1\scripts\
```

Owner authorised the install. `corepack pnpm install --frozen-lockfile` from the worktree
root, pnpm 10.32.1 (from the root `packageManager` pin; corepack already resolved to it, so
no override was needed and `--frozen-lockfile` was never dropped). **The lockfile was not
modified** — `Lockfile is up to date, resolution step is skipped`.

> Windows note: the same command run from PowerShell **fails** — the root `preinstall` guard
> shells out to `sh`, which is not on PATH there. It succeeds from Git Bash
> (`preinstall: Done`, exit 0). This is an environment mismatch, not a lockfile problem.

**Q2 — GO. The matrix does run in CI**, so wiring the test in was authorised:

```
.github/workflows/quality-gate.yml:178-180
  - name: Root guard matrix (scripts/ test:matrix:all)
    if: steps.classify.outputs.docs_only != 'true'
    run: pnpm --filter @workspace/scripts run test:matrix:all
```

Working directory is the repo root; `pnpm --filter @workspace/scripts` resolves the package
dir. The `docs_only` guard does not exclude this lane, which touches `scripts/` code.

**Additional finding (raised at pre-flight, de-risks §2.4).** `premise_ledger_check.mjs` is
invoked from **no workflow and no test** — only prose in `ops/AGENT_STANDING_RULES.md:60` and
the template's own §0c.0. Two consequences: §2.3 cannot turn CI red, and the new test is the
**only** thing exercising this script in CI. That is why every case below is mutation-verified.

---

## THE DIFF

`git diff --name-only 97f39197` → exactly the three files in §2:

```
scripts/package.json
scripts/premise_ledger_check.mjs
scripts/src/premiseLedgerGuard.test.ts
```

### §2.1 — dead remediation path

```diff
-  if (!ledgerRange) add('ERROR', 0, `missing a "${H_LEDGER}" section`, 'Copy templates/AGENT_SPEC_TEMPLATE.md.');
+  if (!ledgerRange) add('ERROR', 0, `missing a "${H_LEDGER}" section`, 'Copy ops/AGENT_SPEC_TEMPLATE.md.');
```

### §2.2 — `--template` mode

```diff
- *     [--strict-anchor]       every VERIFIED row must carry an anchor string
+ *     [--strict-anchor]       every VERIFIED row must carry an anchor string
+ *     [--template]            this IS the template: accept the all-zero placeholder SHA
```
```diff
-  const opts = { worktree: null, maxLines: 250, strictAnchor: false, json: false };
+  const opts = { worktree: null, maxLines: 250, strictAnchor: false, template: false, json: false };

     if (arg === '--json') opts.json = true;
     else if (arg === '--strict-anchor') opts.strictAnchor = true;
+    else if (arg === '--template') opts.template = true;
```

The parser was not restructured. One usage-block line was added so `--help`, which prints
that block, does not lie about the flag set.

### §2.3 — reject the all-zero SHA in normal mode

```diff
   if (!shaMatch) {
     add('ERROR', 0, 'no `Base SHA:` declared', 'Re-derive it: git ls-remote origin <trunk>. Never copy a written SHA.');
+  } else if (/^0+$/.test(shaMatch[1]) && !opts.template) {
+    // SHA_RE deliberately accepts any 7-40 hex, so the template's placeholder passes the
+    // presence check above. Presence was never the point: a spec still carrying the zero
+    // SHA has not been ANCHORED, and no agent should act on it. Only the template itself
+    // may carry it, and only when it says so with --template.
+    add(
+      'ERROR',
+      0,
+      `Base SHA is the all-zero placeholder (\`${shaMatch[1]}\`) — this spec has not been anchored`,
+      'Re-derive it: git ls-remote origin <trunk>. Never copy a written SHA from a doc, a ' +
+        'handoff file, or a memory. If this IS ops/AGENT_SPEC_TEMPLATE.md, pass --template.'
+    );
   }
```

`SHA_RE` itself was not changed. The message names the rejected SHA literally and states the
remedy.

### §2.5 — the test

New `scripts/src/premiseLedgerGuard.test.ts` (`node:test` + `node:assert/strict`, repo root
via `join(fileURLToPath(import.meta.url), "../../..")`, per P8/P9). Fixtures are written to
`os.tmpdir()` via `mkdtempSync` and removed in `finally`; nothing is written into the repo.

Wired into `test:matrix:all`, plus a `test:premise-ledger` single-suite script matching the
existing per-suite convention.

---

## §3 ACCEPTANCE — literal output

### (a) template mode accepts the zero SHA — **expected 0, got 0**

```
$ node scripts/premise_ledger_check.mjs ops/AGENT_SPEC_TEMPLATE.md --template --strict-anchor
premise-ledger: NOTE — running without --worktree. Evidence FORMAT is checked, but not whether it is still TRUE. Pass --worktree=DIR to catch rotted premises.

PASS  ops/AGENT_SPEC_TEMPLATE.md  (2 premises)
  ✓ ledger complete, evidence well-formed

premise-ledger: 1/1 specs passed
EXIT=0
```

### (b) normal mode REJECTS it — **expected 1, got 1** — the hole closing

```
$ node scripts/premise_ledger_check.mjs ops/AGENT_SPEC_TEMPLATE.md --strict-anchor
premise-ledger: NOTE — running without --worktree. Evidence FORMAT is checked, but not whether it is still TRUE. Pass --worktree=DIR to catch rotted premises.

FAIL  ops/AGENT_SPEC_TEMPLATE.md  (2 premises)
  ✗ L0: Base SHA is the all-zero placeholder (`0000000000000000000000000000000000000000`) — this spec has not been anchored
      → Re-derive it: git ls-remote origin <trunk>. Never copy a written SHA from a doc, a handoff file, or a memory. If this IS ops/AGENT_SPEC_TEMPLATE.md, pass --template.

premise-ledger: 0/1 specs passed
EXIT=1
```

At base SHA this same command exited **0**. That flip is the whole lane.

### (c) the silent-skip law still holds — **expected 1, got 1**

```
$ node scripts/premise_ledger_check.mjs
premise-ledger: FAIL — no spec files found.
  A check that can silently not-run is a check you do not have.
  Pass at least one spec path, or remove this gate deliberately.
EXIT=1
```

### (d) **EXPECTED DEVIATION — spec expected 0, got 1**

```
$ node scripts/premise_ledger_check.mjs ops/.specs/GATE-1.md --worktree=. --strict-anchor

FAIL  ops/.specs/GATE-1.md  (10 premises)
  ✗ L10: P1: anchor "Copy templates/AGENT_SPEC_TEMPLATE.md." not found near scripts/premise_ledger_check.mjs:168
      → The premise has ROTTED — the lines moved or the code changed. Re-read and re-cite before this spec goes out.
  ✗ L14: P5: anchor "else if (arg.startsWith('--worktree='))" not found near scripts/premise_ledger_check.mjs:329
      → The premise has ROTTED — the lines moved or the code changed. Re-read and re-cite before this spec goes out.

premise-ledger: 0/1 specs passed (evidence resolved against .)
EXIT=1
```

**This was predicted at pre-flight and ruled on by the owner before any edit.** GATE-1's own
ledger cites the file this lane edits, so its anchors rot on contact. Both failures are the
rot detector working correctly:

- **P5** — cited `:329-334`; the anchor window is `start-1-pad … end+pad` with `pad=3`
  (`:306`), i.e. new-file lines 326–337. The anchor sat at `:332`, tolerating a downward
  shift of at most 5. §2.3 inserted above the parser and moved it to **`:346`** (+14).
- **P1** — a second instance of the same class, which I did *not* predict: §2.1 mandated
  changing the very string P1 anchored on, so the anchor no longer exists at all.

Per owner ruling, `ops/.specs/GATE-1.md` was **not** repaired — §0c.0's prohibition stands.

### (d′) substitute — same property, no circularity — **expected 0, got 0**

A two-row fixture in `os.tmpdir()`, real 40-hex Base SHA, citing `.github/CODEOWNERS:31`
(anchor `/scripts/ops/`) and `ops/AGENT_STANDING_RULES.md:60` (anchor
`premise_ledger_check.mjs ops/.specs/`) — both outside the edited file:

```
$ node scripts/premise_ledger_check.mjs $D/REAL_SPEC.md --worktree=. --strict-anchor

PASS  C:/Users/Chetan/AppData/Local/Temp/tmp.nyXmpug3mv/REAL_SPEC.md  (2 premises)
  ✓ ledger complete, evidence well-formed

premise-ledger: 1/1 specs passed (evidence resolved against .)
EXIT=0
```

"A real spec still passes" therefore holds, with anchors resolving against a real worktree.
This property is also pinned as **test case 3b**, so it lives in CI rather than in a one-off
acceptance command.

### (e) the matrix

```
$ npm run test:matrix:all
# tests 202
# suites 30
# pass 202
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 28577.8562
EXIT=0
```

**Pre-change baseline on the same box, before any edit: `# tests 196 / # suites 29 / # pass
196 / # fail 0 / # skipped 0 / # todo 0`, exit 0.** The +6/+1 is this lane's six cases in one
new suite. `skipped 0` and `todo 0` on both runs.

### (f) scope — **exactly the three files**

```
$ git diff --check
EXIT=0
$ git diff --name-only 97f39197
scripts/package.json
scripts/premise_ledger_check.mjs
scripts/src/premiseLedgerGuard.test.ts
$ git status --porcelain
(empty at commit time)
```

`ops/AGENT_SPEC_TEMPLATE.md` — **untouched**. `ops/.specs/GATE-1.md` correctly absent
(gitignored, `.gitignore:107`).

### Additional gates run beyond §3

```
$ corepack pnpm run typecheck        # CI's root typecheck — libs, api-server, scripts
scripts typecheck: Done
artifacts/api-server typecheck: Done
EXIT=0

$ pnpm run scope:guard --mode mixed
SCOPE_GUARD_SCOPE: root=.../gate-1 anchor=lazytopper/ inspected=3 untracked=1 anchor_frame_would_miss_untracked=1
SCOPE_GUARD_OK (mode=mixed, lanes=trackedTooling)
EXIT=0
```

`inspected=3` — the guard was **not** vacuous; it saw all three files, including the
untracked one.

---

## MUTATION VERIFICATION (§2.5 full discipline)

Each fix reverted in turn, mutation proven applied by hash, then restored. `sha256(head)`
is the first 16 hex of the file digest; baseline `f7f38b1d93fca32c`.

| Mutation | mutated sha256 | Case that failed | Other cases |
|---|---|---|---|
| M1 — §2.3 zero-SHA check never fires (`&& !opts.template` → `&& false`) | `3bfc6a935d908bb7` | **not ok 2** — *the template FAILS without --template, naming the zero SHA* | all 5 pass |
| M2 — §2.1 remediation path back to `templates/` | `fb5a81954984b733` | **not ok 5** — *the remediation path named in the source resolves on disk* | all 5 pass |
| M3 — §2.2 drop the `--template` parser case | `c97774b6fc7acd34` | **not ok 1** — *the template passes under --template* | all 5 pass |

All three digests differ from baseline, so each mutation demonstrably landed. Every mutation
killed **exactly its own case and nothing else** — a 1:1 map, not a blanket red. File restored
to `f7f38b1d93fca32c` after each run and confirmed (`final restore = OK`).

Full M1 run, as an example:

```
      ok 1 - 1. the template passes under --template
      not ok 2 - 2. the template FAILS without --template, naming the zero SHA
      ok 3 - 3. a real spec with a real 40-hex SHA still passes
      ok 4 - 3b. a real spec resolves against a real worktree with --strict-anchor
      ok 5 - 4. the remediation path named in the source resolves on disk
      ok 6 - 5. no input files is a FAILURE, not a quiet pass
```

---

## FOLLOW-UPS / THINGS I COULD NOT VERIFY

**[FU-SCRIPTS-TEST-FILES-TYPECHECKED-BY-NOTHING] — new, pre-existing, not introduced here.**
`scripts/tsconfig.json` carries `"exclude": ["src/**/*.test.ts"]`. The root typecheck CI runs
therefore covers **no** `scripts/` guard test — all seven, mine included. Unlike `lazytopper`,
`scripts/` has no `tsconfig.test.json` / `typecheck:test` companion, and `tsx` strips types
without checking them, so a type error in a `scripts/src/*.test.ts` is invisible to every gate.

Proven with a control, after a first attempt gave a false answer:

```
premiseLedgerGuard matches in program: 0
opsAcceptanceGuard  matches in program: 0
syllabusGuard.ts (non-test) matches:    1     <-- control: the program is non-empty
```

My file typechecks clean when explicitly included (`EXIT=0`, `in program this time: 1`).
Recommend a `scripts/typecheck:test` mirroring lazytopper's — **not** in this lane's scope.

> Method note: my first attempt at this used `./node_modules/.bin/tsc` from `scripts/`, which
> does not exist (pnpm hoists `tsc` to the root). With stderr suppressed it printed
> `NOT IN PROGRAM` — a *command failure* that read exactly like a finding. Re-run with
> `../node_modules/.bin/tsc` and a known-present control file. The conclusion survived; the
> first piece of evidence for it did not.

**CI — CONFIRMED GREEN, and confirmed to have actually RUN.** All checks on #661 pass:
`quality-gate` 7m20s, `container-boot` 3m7s, `lane-overlap` 14s, CodeQL / Analyze, Vercel.

A green tick is not evidence the tests ran, so from the `quality-gate` job log
(run `31656009021`, job `94310494194`) — the invocation, showing my file in the argument list:

```
> @workspace/scripts@0.0.0 test:matrix:all /home/runner/work/Lazytopper-Production/Lazytopper-Production/scripts
> node --import tsx/esm --test src/syllabusGuard.test.ts src/deletionGuard.test.ts src/reproductionBankGuard.test.ts src/opsAcceptanceGuard.test.ts src/practiceSetGeneratorGuard.test.ts src/aiTierContentIntegrityGuard.test.ts src/premiseLedgerGuard.test.ts
```

the totals:

```
# tests 202   # suites 30   # pass 202
# fail 0      # cancelled 0 # skipped 0   # todo 0
```

and all six cases executing by name on the runner:

```
ok 1 - 1. the template passes under --template
ok 2 - 2. the template FAILS without --template, naming the zero SHA
ok 3 - 3. a real spec with a real 40-hex SHA still passes
ok 4 - 3b. a real spec resolves against a real worktree with --strict-anchor
ok 5 - 4. the remediation path named in the source resolves on disk
ok 6 - 5. no input files is a FAILURE, not a quiet pass
ok 21 - premise_ledger_check.mjs — what counts as an anchored spec
```

Identical to the local run: 202/30, `skipped 0 todo 0`. Q2's premise — that wiring the test
into the matrix puts it in front of CI — is now confirmed empirically, not just from the
workflow file.

**Not verified — §5 live-verify.** Owner-only: hand an unledgered spec to a throwaway agent
run and confirm the refusal now names a path that resolves. Not performed here.

**Report deliberately uncommitted.** `handoff/BRIEF_GATE-1.md` is left untracked in the
worktree. CLAUDE.md §8 requires product PRs to contain zero handoff doc changes, so #661
carries only the three `scripts/` files. This report needs its own docs-only PR if it is to
land on trunk.

---

## VERDICT

**PASS-WITH-FOLLOW-UP.**

Three defects fixed, mutation-verified 1:1. Scope is exactly the three authorised files;
`ops/AGENT_SPEC_TEMPLATE.md` untouched. Matrix 196→202, `skipped 0 todo 0`. The §2.4
interaction landed as a unit: the template now passes only under `--template` and fails
without it, and both directions are proven above and pinned in CI.

One acceptance command (§3d) fails by construction and was ruled on before any edit; a clean
substitute passes and is pinned as a test. One new follow-up recorded above.

**#661 was opened as a DRAFT and never self-approved. The owner merged it; trunk is now
`267f26b0`, confirmed by BEHAVIOUR rather than by merge status** — at that SHA the checker
exits 0 in `--template` mode, exits 1 on the template in normal mode, exits 1 with no input,
and the remediation string names a path that resolves. `ops/AGENT_SPEC_TEMPLATE.md` is
byte-identical to base.

**Post-merge note — GATE-1's own ledger is now stale against trunk, by design.** P1's anchor
string no longer exists (§2.1 edited it) and the P5 anchor now sits at `:346`. Re-running the
spec's §0c.0 against trunk will report both as ROTTED. That is the rot detector working on
the spec that changed the thing it cited, not a regression.

The doctrine this lane produced — **anchors rot two ways: the cited lines moving, and the
anchor text itself being edited** — is being written into `ops/AGENT_STANDING_RULES.md` by
lane OPS-C (`#663`). I predicted only the first mechanism; the §3(d) acceptance caught the
second.
