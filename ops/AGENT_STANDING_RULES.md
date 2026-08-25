
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

### ★★★ THE SPECIMEN FAMILY — ALL SEVENTEEN, INTO THE RULES AGENTS READ (Wave MI-INTEGRITY-3, 2026-08-25)

**Why these are here at all, in the owner's words:**

> *a finding in a report is a finding that dies with the report — that is the twenty-one-follow-ups lesson.*

Specimens 1-15 were on record in close-out reports and **in none of the rules any agent reads.** This
section ends that. **Specimens 1-8 are the pre-existing family: checks that MEASURE THE WRONG THING.**

**SOURCE, AND WHICH TABLE.** Taken from the table headed **"SPECIMEN NUMBERING — SETTLED BY THE OWNER.
THIS TABLE IS CANONICAL."** in
`C:\Users\Chetan\OneDrive\Desktop\diff\Wave MI Integrity 3\Report\CLOSEOUT_MI_INTEGRITY_3_CONTROLLER_C.md`
(53288 bytes; sha256 measured, begins `a58040899fd8df8e`).
⚠ **THAT FILE CONTAINS TWO SPECIMEN TABLES AND THE EARLIER ONE IS SUPERSEDED** — it has **11 and 12
TRANSPOSED.** The owner ruled: *"the PAIRING defect is #11; the dying-agent status is #12. It is the
subtlest and deserves the earlier slot."* **The earlier table reads like a complete list, which is
exactly specimen 11 committed on the specimens themselves: two true lists presented as one.**
⇒ **If you cite a specimen number, cite which table you read it from.**

| # | specimen | mechanism |
|---|---|---|
| **1-6** | **the six earliest — RECORDED, BUT NEVER NUMBERED** | ⚠ **no document assigns the numbers 1-6 to any six instances.** See "THE #1-#6 GAP" below, which names every candidate instead of guessing |
| **7** | **a drift check scoped to NAMED CLAUSES** | asked after three named corrections, found all three intact, and **returned CLEAN over a prompt missing half its rules** — *"blind to the eight nobody thought to name"* |
| **8** | **a path-scoped search reported without its scope** | an `src/`-scoped enumeration missed a live **server** consumer that puts weak areas in front of **PARENTS**. ★ **The scout caught and reported this against itself** |
| **9** | **a test that PINNED THE DEFECT AS DOCTRINE** | measures the RIGHT thing, **records the WRONG ANSWER AS EXPECTED** — a test that DEFENDS the bug |
| **10** | **a binary that never ran** | dead `.bin/tsc` symlink, no output, piped to a counter -> 0; **zero is indistinguishable from a true negative** |
| **11** | **a citation under-describing what it is evidence for** | two rows, **both TRUE**, grepped with DIFFERENT patterns, presented side by side as comparable. **NEITHER NUMBER IS FALSE — THE COMPARISON IS THE LIE** |
| **12** | **a dying agent's last line reads like success** | `<result>` "Complete. Writing the final report." vs `<status> failed` |
| **13** | **a status word matched as a substring of DATA** | "skipped" matched TEST NAMES containing `skipped-error` — **the matcher fires correctly and means nothing** |
| **14** | **a green whose referent has since changed** | `lane-overlap` is bound to **the set of open PRs at the instant it ran**; observed in BOTH directions |
| **15** | **a partial check set is not a verdict** (the owner's) | reading a red as "and everything else passed" while some checks **have not reported** |

**THE ANSWERS, paired to the specimen each one defeats:**
- **#9 ➜ A TEST CAN BE GREEN *BECAUSE* IT ENCODES THE BUG.** When a test asserts current behaviour,
  ask what it would take to make it fail; if the answer is "fixing the defect", it is not a test.
- **#10 ➜ PROVE THE BINARY IS LIVE BEFORE TRUSTING ITS SILENCE.** `--version`, non-empty output.
  ⚠ **A PIPED COMMAND EXITS WITH THE EXIT CODE OF THE LAST STAGE** — `missing-binary | wc -l` exits 0
  and prints `0`. Capture `${PIPESTATUS[0]}`, or do not pipe.
- **#11 ➜ AN ENUMERATION YOU CAN CHECK BEATS A COUNT YOU MUST TRUST.** Name the members. A count is a
  derived value with nothing re-checking it. **This specimen defeats every single-row defence** — no
  control, no mutation, no ruler-stating, no scope-naming catches it, because each row passes every
  defence INDIVIDUALLY and **the defect exists only in the RELATION BETWEEN TWO TRUE FACTS.**
- **#12 ➜ READ `<status>`, NOT `<result>`.** An agent that died mid-sentence still emits a confident
  last line.
- **#13 ➜ THE ZERO-SKIP PROOF IS THE ABSENCE OF A SEGMENT, NOT THE ABSENCE OF A WORD.** vitest renders
  skips as an extra summary segment (`Tests 5 skipped | 1877 passed`); **`Tests N passed (N)` with no
  such segment is the proof.** Grepping for "skipped" false-positives on test names.
- **#14 ➜ A GREEN IS BOUND TO THE STATE THAT PRODUCED IT.** State WHEN it ran and against WHAT. **Do
  not read a stale green as a current fact** — and the converse is equally live: a PERSISTENT RED can
  be about a commit that no longer exists.
- **#15 ➜ A PARTIAL CHECK SET IS NOT A VERDICT.** Before concluding anything from a run, confirm every
  check has REPORTED. Reading a red as "everything else passed" is the same error as reading a green
  tick as a log.
- **THE WHOLE FAMILY ➜ PROVE COLLECTION, NOT ABSENCE OF FAILURE.** *"205 is not an absence of failures
  until you know 205 things ran."*

**TWO MORE, OWNER-NUMBERED, ADDED 2026-08-25:**
- **#16 — A GREP ON ONE FILE IS NOT AN ENUMERATION.** A scout concluded from a **single-file** grep
  that `ScorecardGradedAnswer.steps` was never populated. **It is populated**, at
  `gradedAnswerAssembly.ts:192`. ⇒ **A grep's silence is scoped to what it searched.** The answer:
  **enumerate the consumers and OPEN them.** ★ The scout **caught this against itself**, which is
  why the rest of that report carries weight.
- **#17 — WHEN YOUR COUNT DISAGREES WITH ANOTHER AGENT'S, COMPARE THE RULERS BEFORE THE NUMBERS.**
  Two agents checked the same question during an erratum verification; one returned **1** and one
  returned **0**. **BOTH NUMBERS WERE TRUE.** One pattern carried a third term the other did not,
  and that term matched the checking agent's **own surrounding prose** — not the thing they were
  both looking for. ⇒ **Two greps with different patterns are not two measurements of one thing.**
  ⚠ **Had the discrepancy been relayed as a discrepancy, it would have travelled as an INVENTED
  CONFLICT CARRYING AN ENDORSEMENT, and it would have been believed.** ★ **What stopped it was
  looking at WHAT MATCHED before calling it a disagreement.**
  ⇒ **Kin to #11, one level up:** there the defect lives in the relation between two true ROWS;
  here, in the relation between two true COUNTS **OF DIFFERENT QUESTIONS**.

**⚠⚠ THE #1-#6 GAP — NAMED, NOT PADDED.**
**Specimens #7 through #17 are individually sourced above. #1-#6 are NOT, and this section will not
pretend otherwise.** The canonical table collapses them to one row — *"the pre-existing eight |
checks that measure the wrong thing"* — and the close-out that introduced #7 and #8 says only that
*"Six specimens were on record"*, **without listing them.** They have lived in reports and close-outs
the whole time; **no document found assigns the numbers 1-6 to any six instances.**

⇒ ★★ **AN ENUMERATION YOU CAN CHECK BEATS A COUNT YOU MUST TRUST, and that cuts both ways: a padded
list of eight would be worse than an honest six, because the next reader could not tell which entries
were real.** So the recorded instances of the family are carried below **WITH THEIR SOURCES AND
WITHOUT NUMBERS**, and the numbering is left open for the owner.

**RECORDED INSTANCES OF THE FAMILY — ELEVEN, FROM TWO SOURCES THAT DO NOT OVERLAP AT ALL:**

*From `ops/CONTROLLER_SUBAGENT_MODEL.md` §5, the SILENT NO-OPS bullet ("instances this month"):*
- a `FORBIDDEN` path entry that **could never match**
- `Object.setPrototypeOf` whose **removal changed nothing**
- a **vitest pool key ignored by the running pool**
- a **merged PR silently swallowing pushes**
- a **reCAPTCHA fix that ignored its own argument**
- an **ops guard whose pattern matched zero times**

*From the Wave MI-INTEGRITY-7 record, a five-row table titled "how it lies":*
- **`isDeparture`** — read but never declared: a control that **cannot fire**; always false
- **`tsc -p tsconfig.app.json`** with `include:["src"]` and no `allowJs` — **exits 0 without ever
  seeing the edited file**
- **a piped gate** — `$?` is the last pipe element, so it **exits 0 unconditionally**
- **a mutation that fails to apply** — produces a GREEN run **indistinguishable from a caught one**
- **a run id read as a verdict** — spans multiple attempts; the CLI reports the latest, silently

⚠ **THESE TWO LISTS SHARE NOT ONE ENTRY.** Eleven distinct instances, and the canonical numbering
selects six. **Which six is not recoverable from any document available, and guessing would commit
specimen #11 on the specimens themselves** — two true lists presented as one. ⇒ **OWNER DECISION
OWED: which six are #1-#6, or should the numbering be re-based on this enumeration?**

### ★★ A MERGE COUNT IS NOT A COMMIT COUNT ON THIS REPO (owner ruling, 2026-08-25)

**This repository SQUASH-MERGES.** Therefore `git log --merges <a>..<b>` returns **0** on a range that
contains real work, while `git rev-list --count <a>..<b>` returns the actual drift.

- **Establishing command** — both, always, never one alone:
  ```
  git log --merges f75e8356..65b6c0e2 | wc -l     # -> 0
  git rev-list --count f75e8356..65b6c0e2         # -> 7
  ```
  *(Re-derived by lane `HANDOFF-MI9` at base `65b6c0e2` on 2026-08-25: `0` and `7`.)*
- ➜ **Anyone reasoning about drift from merge counts on this repo will be wrong every time**, and the
  wrongness is silent — `0` is a perfectly plausible answer that no error message contradicts.
- ⚠ **This is specimen 10's shape at the repository level:** a zero produced by a command that cannot
  produce anything else here is **indistinguishable from a true negative.**
- ➜ **A squash-merged PR head is also never an ancestor of trunk**, so `git merge-base --is-ancestor`
  is the WRONG merge test here. Verify by CONTENT on trunk, or against the PR's `mergeCommit`.

### ★★ "ON DISK" IS NOT A LOCATION (owner ruling, 2026-08-25)

`[FU-ON-DISK-IS-NOT-A-LOCATION]` — **third instance, same author.**

**A path named in one dispatch and omitted from the next is the same failure as no path at all.** An
agent told a file is "on disk" has been given a property, not an address, and must then guess — and a
guess that lands in the shared checkout reads a tree that lags trunk.

- **THE STANDING SPEC-STAGING FOLDER IS `C:\Projects\LT-specs\<WAVE>\`.**
- ➜ **State absolute paths in full, always** — in dispatches, in specs, in reports, and inside the
  report about the report.
- ➜ **A relative path is only a location if the reader's working directory is also stated.** Subagent
  threads reset their working directory between calls, so a relative path is not durable there at all.

### ★★★ `check:mojibake` AND `handoff/` — SETTLED BY CONTROL (Wave MI-INTEGRITY-3, 2026-08-25)

**THE ANSWER: `check:mojibake` DOES reach `handoff/`.** It scans it, counts it, and prints the count on
every run. **`handoff/` is REPORT-ONLY, not unreachable.**

⛔ **The claim that it is "structurally blind to `handoff/`" is FALSE on trunk `65b6c0e2`.** It was TRUE
of an older revision, was fixed under the `[GUARD-3]` tag, and **survived as a restated fact in three
dispatches after it stopped being true.**

- `repoRoot` is `git rev-parse --show-toplevel` — **the git root**, not `lazytopper/`.
- `handoff/` is listed in `REPORT_ONLY_PREFIXES`: hits there are **detected, printed and counted, but
  do not fail the gate.** Everything else is ENFORCED by default, so a new top-level tree fails safe.
- ➜ **"STRUCTURALLY BLIND" AND "REPORT-ONLY" ARE NOT THE SAME FACT.** Blind means the bytes were never
  read. Report-only means they were read, matched, and deliberately not enforced. **Conflating them
  loses the only signal that would reveal a regression back to blindness** — the printed count.

- **THE CONTROL THAT SETTLED IT** — reading the source establishes intent; only injection establishes
  behaviour. **A zero from a matcher nobody proved can fire is indistinguishable from a dead matcher.**
  ```
  baseline                         enforced_hits=0  report_only_hits=17   exit 0
  inject into handoff/CURRENT_STATE.md
                                   enforced_hits=0  report_only_hits=18   exit 0   <- SEEN, not enforced
  revert; git status --porcelain empty; grep -c returns 0
  inject into ops/AGENT_STANDING_RULES.md   (outside REPORT_ONLY_PREFIXES)
                                   enforced_hits=1  report_only_hits=17   exit 1   <- ENFORCED, build red
  revert; baseline re-measured identical
  ```
  **Both directions matter.** The `handoff/` injection alone would not show that the enforcing side is
  alive; the `ops/` injection alone would not show that `handoff/` is reached.
- ➜ **The probe LIFTED THE LIVE REGEX OUT OF THE SCANNER at runtime rather than re-typing it.** A
  re-typed copy proves only that your copy fires. And it was checked in **both** directions —
  `REGEX_MATCHES_CONTROL=true`, `REGEX_MATCHES_PLAIN_ASCII=false` — because **a matcher that fires on
  everything is not a matcher.**
