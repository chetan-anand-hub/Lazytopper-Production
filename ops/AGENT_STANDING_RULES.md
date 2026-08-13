
---

## STANDING RULES (all lanes, all agents)

### Test proportionality
Before writing any test ask: "if this failed in six months, would it tell me
something I'd want to know?"

FULL DISCIPLINE (mutation-verified, failing output captured) when the test pins
a DECISION: a product promise (advertised quota vs enforced cap), a safety
property (account enumeration, minors' data, fail-closed), a derived value whose
inputs live elsewhere (spend cap to ceiling), an invariant a future change could
silently break (App.tsx zero-diff, one [CURRENT] marker), or a correctness fix.
Never thin these.

THIN (one or two assertions, no ceremony) when the test only re-verifies the
framework: that a logger logs, a getter gets, a library does what it documents.

THE TEST: does it encode a judgement someone made, or does it check that
JavaScript still works? Pin the first, thin the second. If unsure, keep it and
say so in your report.

### Local vs CI test split
WHY: the owner machine has 7.8GB RAM. Two agents running test:matrix:all
concurrently OOM-killed the editor and lost two sessions. The full matrix
already runs in CI on every PR.

RUN LOCALLY: scope:guard PRE-COMMIT (reads the working tree, CI cannot run it
meaningfully); tsc --noEmit; check:mojibake; YOUR OWN changed test files, scoped;
MUTATION runs scoped to the affected file only.

RUN IN CI, never locally: test:matrix:all; full vitest across src; convergence
and overlay acceptance gates; every commit-scoped base...HEAD gate.

WORKFLOW: local set, then commit and PUSH as DRAFT (pushing is what runs CI, and
it means an OOM cannot destroy your work). Wait for CI. READ THE LOG. Report
local output, CI log evidence, PR link. Wait for owner approval. No self-merge.

THE BLIND SPOT THIS CREATES: a suite that is present, wired and SKIPPED reports
green, and this repo has shipped exactly that. For every suite you rely on,
quote the invocation line AND the result line proving it EXECUTED. For
node --test that is "# pass N  # fail 0  # skipped 0  # todo 0" -- the skipped
and todo counts matter, not the pass count. "CI was green" is not a
verification.

Any local vitest run uses --poolOptions.threads.maxThreads=2.

WHAT THIS DOES NOT CHANGE: nothing merges unverified. Only WHERE gates run and
WHO watches them.

### The premise gate — your first command, every lane

Every instruction file you receive carries a `§0 PREMISE LEDGER`: the claims the spec
depends on, each with `file:line` evidence and an anchor string. Before you read the task,
open a file, or think about the problem:

1. Save the instruction file VERBATIM to `ops/.specs/<LANE-ID>.md` (gitignored).
2. From the worktree root, run:
   `node scripts/premise_ledger_check.mjs ops/.specs/<LANE-ID>.md --worktree=. --strict-anchor`
3. Paste the full output including the exit code.
4. Non-zero → STOP and report. Do not repair the spec; a broken ledger is the author's
   defect and the author must see it.

**If the instruction file has no §0 ledger at all, that is the defect.** Report it and stop.
Do not proceed on an unledgered spec however clear the task looks, and do not write the
ledger yourself — you would be certifying premises you did not author.

WHY THIS IS A COMMAND AND NOT A HABIT: the discipline of verifying premises before writing a
spec has been stated in the cofounder skill five separate times and failed anyway. Eight
specs were authored in one day and the checker was run on none of them, because nothing made
it run. Meanwhile every wrong premise that day was caught by a lane, not by the author.
Prose is a hope; a check is a fact. This runs because it is step one, not because someone
remembered.

WHAT THE GATE DOES NOT DO: it checks that evidence is well-formed and that anchors still
resolve against the tree. It cannot check whether a claim is TRUE. That is §0c.1, and it is
still yours. A gate that passed is not a premise that holds.

### ★★★ ONLY A BOOT PROVES IT RUNS (2026-08-09, Wave DPDP-A — the missing rung, plus two rules about what evidence is NOT)

**MIGRATED HERE FROM `cofounder-skill/SKILL.md` by Wave OPS-1 on 2026-08-13 — moved, not copied.**
They were written into the cofounder skill on the stated grounds that this file *"DOES NOT EXIST ON
TRUNK (`#635` is open and failing its repo-boundary check)"*. **That was false within hours of being
written**: `#635` merged 2026-08-09 as `baf9b67a8b460471bbddbad70243ec3a1e104baa`, an ancestor of
`base/approved-thru-437`. All three are agent-facing execution rules, so this is their audience's file.
`SKILL.md` now points here and does not restate them — **no rule is written in both**, which discharges
`[FU-DOCS-STANDING-RULES-TWO-HOMES]`.

- **★★★ THE EVIDENCE LADDER GAINS A RUNG: A TEST PROVES THE CODE WORKS. A BUILD CHUNK PROVES IT SHIPS.
  ONLY A BOOT PROVES IT RUNS.** Named beneath `MOUNT ≠ LIVE`, one level lower than this project had ever
  gone: **RESOLVES-IN-DEV ≠ RESOLVES-IN-THE-DEPLOYED-IMAGE.**
  - **The instance:** `#638` shipped a server route that imports a `.ts` data map at runtime. Its deployment
    **crashed on boot** — `Cannot find package 'tsx' imported from /app/lazytopper/` — and Railway rolled it
    back, so production kept serving the previous build. `tsx` was declared in one workspace package and
    never in the gateway; **pnpm workspaces isolate dependencies per package.**
  - ★★ **THE PART THAT GENERALISES IS NOT THE BUG.** This was **not** a lane that skipped its proof. A scout
    flagged the premise as *inference, not an executed import*; the controller **promoted it to
    lane-blocking**; the lane ran it and reported `MAP IMPORT IN SERVER PROCESS: EXECUTED PASS` — **and that
    report was true.** It executed in a **dev worktree**, where every workspace dependency resolves.
  - ➜ ★★ **MAKING A PROOF MANDATORY IS NOT ENOUGH — THE BRIEF NEVER SAID WHERE IT HAD TO RUN.** *A
    lane-blocking proof executed in the wrong environment reads exactly like a met requirement*, and nothing
    downstream can tell the two apart.
  - ➜ **OPERATIONAL FORM, ATTACH IT TO THE BRIEF: any lane that adds a runtime import to a server must state
    WHICH IMAGE it executed in.** An `EXECUTED PASS` is scoped to the environment that executed it.
  - ➜ **And the acceptance test for the fix is a SUCCESSFUL BOOT, not a green suite.** No gate in this
    repository can produce that evidence — which is the whole reason the rung was missing.

- **★★ THE ALERT LIST IS NOT THE SET.** CodeQL flagged **4 of the 6** `setItem` calls in
  `referralService.ts`. **Anyone remediating from the alert list covers four, believes they are done, and
  ships.** The guard that landed audits all six, because it enumerated the set **from the file** rather than
  from the tool's output.
  - ➜ **Generalises to every scanner this project uses** — CodeQL, Dependabot, lint, the ops matrices.
    **A scanner reports what its rules match, which is never the same claim as "here is the set."**
  - ➜ **It recurred the same day, in the same file:** `Math.random()` in a **user-facing** referral code — a
    flat `CLAUDE.md` §7 violation — sits on trunk **unflagged by anything.**
  - ➜ **Same family as *a zero from something nobody proved can fire*.** When a tool returns N, the question
    is not "are these N real" but **"what is N a count OF."**

- **★★ A RULE AGAINST FALSE REDS — the inverse defence this project never had.** A year of rules against
  false GREENS, and nothing against the mirror image: a mutation harness `execFileSync`-ing the
  **extensionless `.bin/vitest`** returned `ENOENT`, **which reads exactly like a failing test. Five false
  reds** were recorded as evidence before anyone looked.
  - ➜ **THE FAILURE MUST QUOTE THE INJECTED VALUE.** If the red does not contain the thing you injected, it
    is not evidence about your mutation.
  - ➜ **Plus a pre-mutation GREEN and a did-it-actually-run assertion**, and the existing
    `mutated-sha ≠ baseline-sha` precondition to prove the mutation LANDED.
  - ➜ ★ **A mutation that "fails" for a reason unrelated to the mutation is as worthless as one that never
    landed** — and it is more dangerous, because it *looks* like the strongest evidence a lane can produce.
  - ⚠ **Corollary seen the same wave: a suite that fails to COLLECT looks nothing like a suite that fails an
    ASSERTION, and only one of them is evidence.** A `vi.mock` TDZ fault degraded a mutation run into a
    collection error that a green tree had hidden.

### Evidence hygiene (Wave OPS-1, 2026-08-13)

**Every rule below carries the command that establishes it.** A conclusion without its recipe is
unre-checkable — the same class of defect as a bare line number. Re-run the command; if your result
differs from the one recorded here, **your measurement wins and this file is what you correct.**

- **★★ THE PREMISE GATE'S ONLY ENFORCEMENT POINT IS YOUR REFUSAL. NOTHING IN CI CAN SEE A SPEC.** An
  instruction file is never in a PR: `ops/.specs/` is gitignored (`git check-ignore -v
  ops/.specs/<LANE>.md` → `.gitignore:107:ops/.specs/`), so no workflow has an artefact to inspect.
  - **Establishing command** (re-run 2026-08-13) — evidence the claim, which is that no SPEC is ever
    available to CI, not that CI never touches the checker:
    ```
    git ls-files 'ops/.specs/'                       # → nothing: no spec is ever committed
    git check-ignore -v ops/.specs/<LANE>.md         # → .gitignore:107:ops/.specs/
    ```
  - ⚠ **CI DOES invoke the checker — it simply never has a spec to point it at.** Do not read the claim
    above as "nothing runs it". `scripts/src/premiseLedgerGuard.test.ts` `spawnSync`s
    `scripts/premise_ledger_check.mjs`, and `scripts/package.json:20` lists that test in
    `test:matrix:all`, which `.github/workflows/quality-gate.yml:180` runs on every non-docs PR
    (`if: steps.classify.outputs.docs_only != 'true'`). Its inputs are `ops/AGENT_SPEC_TEMPLATE.md` and
    throwaway `mkdtempSync` fixtures, so it pins the CHECKER'S BEHAVIOUR and still gates no spec.
    Measured at this SHA: `node --experimental-strip-types --test src/premiseLedgerGuard.test.ts` →
    `# pass 6  # fail 0  # skipped 0  # todo 0`.
    - **This bullet previously read** *"No workflow, no npm script, no hook invokes
      `scripts/premise_ledger_check.mjs`"*, **and that was false.** It was established by
      `grep -rn "premise_ledger" .github/ package.json`, which searches `.github/` and the ROOT
      `package.json` only — so it cannot reach `scripts/package.json`, and the chain runs through an
      npm script NAME (`test:matrix:all`) that contains the string "premise" nowhere. A grep whose
      reach is narrower than the claim it supports returns a true "no output" under a false sentence.
      One invocation that does span it: `grep -rn "premise\|test:matrix:all" package.json
      scripts/package.json .github/workflows/quality-gate.yml`.
  - ➜ **So a lane that skips step one of THE PREMISE GATE is invisible to every gate and to any reviewer
    reading CI.** The gate holds because the agent runs it and pastes the exit code, and for no other
    reason. **Paste the exit code even when it is zero** — an unquoted gate and an unrun gate are the same
    artefact to everyone downstream.
  - ⚠ **It cuts the other way too: a spec that arrives with no `§0 PREMISE LEDGER` must be REFUSED, because
    nothing downstream will refuse it for you.** The lane that wrote this rule ran the checker on its own
    instruction file and got `FAIL … 0/1 specs passed`, exit 1 — from a wave dispatched the day after the
    gate landed. **Authors are not exempt from the gate they commissioned.**

- **★★ ANCHORS ROT TWO WAYS — the cited lines move, AND the anchor text itself gets edited.** The GATE-1
  lane predicted the first and was surprised by the second. `--strict-anchor` only proves the anchor string
  still *resolves*; it cannot prove the anchored text still *says what the spec claims about it*.
  - **Establishing command:** locate by text, never by number — `grep -n "<anchor phrase>" <file>` — then
    compare the line it reports against the line the spec cited. **Where they disagree, the text wins.**
  - ➜ **And report which one you used.** This lane's spec cited `cofounder-skill/SKILL.md:287` and the
    claim genuinely was at 287, because trunk had not moved since the spec was written. **A line number
    that happens to still resolve is indistinguishable from one that was re-derived** — only saying which
    method you used makes the difference visible.

- **★★ ERROR-PATH STRINGS ARE UNREACHABLE BY EVERY PASSING TEST.** A remediation string only prints on
  failure, so a suite that is green has never rendered it. `scripts/premise_ledger_check.mjs` shipped
  pointing at **`templates/AGENT_SPEC_TEMPLATE.md`, a path that never existed**, and every green run
  agreed with it.
  - **Establishing commands (both re-run 2026-08-13):** `grep -rn "templates/AGENT_SPEC_TEMPLATE" .` →
    **no output** — the dead string was removed by `#661`. The live remediation now reads
    `Copy ops/AGENT_SPEC_TEMPLATE.md.` and that file is tracked:
    `git ls-tree -r origin/base/approved-thru-437 -- ops/` lists `ops/AGENT_SPEC_TEMPLATE.md`.
  - ➜ **The general form: assert that remediation paths RESOLVE.** For every path named in an error or
    remediation string, `git ls-tree` (or `test -f`) it in the same suite that covers the happy path. A
    fixture that only exercises success can prove the tool ACCEPTS; it can never prove what it says when
    it REJECTS.

- **★★ `core.autocrlf=true` — THE GIT-FOR-WINDOWS DEFAULT — MAKES `git archive` EMIT CRLF.** Blobs are LF
  in this repo and there is no `.gitattributes` anywhere (`ls .gitattributes ops/.gitattributes
  cofounder-skill/.gitattributes` → all missing), so nothing overrides the local config. Any tarball,
  codeload export or byte-comparison taken on a Windows box is line-ending-shifted from what CI sees.
  - **Establishing command** (counts CR *bytes*, on the 78-line `ops/AGENT_STANDING_RULES.md` at `#661`):
    ```
    for v in false input true; do
      git -c core.autocrlf=$v archive HEAD ops/AGENT_STANDING_RULES.md | tar -xO \
        | node -e "let b=[];process.stdin.on('data',d=>b.push(d)).on('end',()=>{const x=Buffer.concat(b);let c=0;for(const y of x)if(y===13)c++;console.log(c)})"
    done
    ```
    **Measured: `false` → CR=0, `input` → CR=0, `true` → CR=78** (one per line). Your own count will differ
    with the file — the shape, not the number, is the rule.
  - ⚠ **And do not detect CRLF with grep.** `grep -c $'\r' <file>` returns **0 on a demonstrably CRLF file**
    under Git-Bash on Windows; the same file measures **643 CR bytes** in Node. **Count CR bytes, not grep
    lines** — a CRLF check that silently reports clean is worse than no check.

- **★★ `git hash-object` NORMALISES CRLF ONLY WHEN `autocrlf` IS `true` OR `input`.** With `false` it
  reports a real, content-identical difference as a hash mismatch. **A hash comparison is therefore
  config-dependent, and the config is not in the report** — this is the same defect as a hash quoted
  without its recipe.
  - **Establishing command** (identical three-line content, LF vs CRLF):
    ```
    git -c core.autocrlf=<v> hash-object --path=<real/path.md> --stdin < lf.txt
    git -c core.autocrlf=<v> hash-object --path=<real/path.md> --stdin < crlf.txt
    ```
    **Measured: `false` → `de980441c3ab…` vs `b5eff5721aa4…` (DIFFERENT); `input` and `true` → identical
    (`de980441c3ab…`).**
  - ➜ **LF-normalise explicitly, then hash.** Do not rely on the ambient setting, and **state the setting
    you hashed under** whenever you quote a hash as evidence.

### ★★ A STOP CONDITION MUST QUOTE THE TEXT IT GUARDS, NEVER PARAPHRASE IT (Wave OPS-1, 2026-08-13)

**A STOP condition must quote the text it guards, never paraphrase it.**

`[FU-SPEC-GUARD-MIS-SUMMARISES-WHAT-IT-GUARDS]` — owner-accepted 2026-08-13, filed as its own class.

**WHY THIS IS A CLASS OF ITS OWN AND NOT A BULLET UNDER EVIDENCE HYGIENE.** Every previously-recorded
false signal in this project came from an INSTRUMENT: a guard that could not fire, a matcher blind to a
directory, a grep that is not a CRLF detector, a gate vacuous on untracked files. In the owner's words,
this one was

> *a false RED originating in the spec, with no faulty instrument anywhere. Every prior instance was a
> tool misreporting; this one was the author.*

**There was no faulty instrument.** The spec paraphrased the thing it was guarding, the paraphrase and the
original disagreed, and so a correct tool reported a real mismatch — against a condition the author had
never actually stated. Nothing downstream can tell that apart from a genuine failure: the lane sees a red,
the instrument is behaving perfectly, and the defect is in the sentence that commissioned the check.

- **Establishing command** — run it on every STOP condition you write, against the file it guards:
  ```
  grep -Fn "<the exact string the STOP condition quotes>" <the file the condition guards>
  ```
  **Zero hits means you are guarding text that does not exist.** `-F` is load-bearing: without it, a
  paraphrase containing regex metacharacters can match something it does not equal, which turns this
  check into one more instrument that cannot fire.
- ➜ **Quote, then cite.** Paste the guarded text verbatim into the condition and name its file. A
  condition that describes the guarded text in the author's own words is a derived value with nothing
  re-checking it — **the same defect as a bare line number**, one level up.
- ➜ **It binds the AUTHOR, and a lane cannot discharge it.** The lane re-reads a correct instrument
  reporting a real mismatch, so re-running anything only reproduces the red. Only the author, comparing
  their own words against the source before dispatch, can catch it.
- ➜ **Applies to acceptance criteria and allowlists too**, not just literal STOP blocks — any spec
  sentence a lane is expected to check something against.
- ⚠ **The same defect one level down is a CITATION that under-describes what it is evidence for.** The
  blind `grep -rn "premise_ledger" .github/ package.json` corrected in this same wave (see *Evidence
  hygiene* above, and `ops/agent-spec/SKILL.md`) is the identical failure: the author summarising the
  evidence instead of quoting it, and the summary reaching less far than the claim it supports.
