# LazyTopper — Agent Task: <LANE-ID> <short title>
**v1.0 · <YYYY-MM-DD> · supersedes: <prior file, or "nothing (new lane)">**

<!--
  TEMPLATE. Copy this, fill it, delete every angle-bracket placeholder.
  Gated by scripts/premise_ledger_check.mjs. Keep the finished spec under 250 lines:
  spec size, not agent judgement, is what pushed three lanes past the context floor.
-->

## §0 PREMISE LEDGER

Base SHA: `0000000000000000000000000000000000000000`
<!-- REPLACE with the real tip, re-derived via `git ls-remote`. NEVER copy a written SHA
     from a doc, a handoff file, or a memory. A spec still carrying the zero SHA has not
     been anchored and no agent should act on it. -->>

Every claim this spec depends on. **If it is not in this table, the spec must not rely on it.**

| ID | Claim | Evidence | Anchor | How verified | Status |
|----|-------|----------|--------|--------------|--------|
| P1 | <what the spec assumes is true> | `lazytopper/src/<path>.ts:185-195` | `<literal substring on those lines>` | read the lines in a clean worktree @ base SHA | VERIFIED |
| P2 | <something the author could not establish> | — | — | — | UNVERIFIED |

What the gate enforces:

- `VERIFIED` requires `path:line` or `path:start-end`. **A bare filename is not evidence.**
- "How verified" may not say *grep, search, named, doc comment, memory, assumed, the report
  says, the skill says*. Those describe inference, not reading. A `grep -l` hit proves a
  string exists; it does not prove an import. A variable's NAME is not its source.
- The **anchor** is a literal substring on the cited lines. It is the only part of the
  citation that survives the lines moving — `--worktree` re-resolves it and fails if the
  premise has ROTTED. A `path:line` with no anchor is a derived value with no recipe.
- `UNVERIFIED` requires a blank evidence cell **and** a matching QUESTION in §0b.

## §0b OPEN PREMISES — YOU MUST ESTABLISH THESE BEFORE WORK

<!-- If there are none, write "None." Do not delete this section. -->

- **P2 — QUESTION:** <ask it as a question, never as a conclusion>. Establish it, report the
  `file:line` you read, and STOP if the answer changes the shape of this task.

## §0c PRE-FLIGHT — BEFORE ANY EDIT

### §0c.0 — RUN THE PREMISE GATE. THIS IS YOUR FIRST COMMAND.

Before reading the task, before opening a file, before thinking about the problem:

1. Save this instruction file **VERBATIM** to `ops/.specs/<LANE-ID>.md` in your worktree.
   Do not summarise it, reflow it, or fix its typos. Byte-for-byte. (`ops/.specs/` is
   gitignored — it never enters a commit.)
2. From the **worktree root** (not `lazytopper/`), run:

   ```bash
   node scripts/premise_ledger_check.mjs ops/.specs/<LANE-ID>.md --worktree=. --strict-anchor
   ```

3. Paste the **full output**, including the invocation line and the exit code.
4. **Exit 0** → continue to §0c.1. **Non-zero** → STOP and report. Do not repair the spec
   yourself; a broken ledger is the author's defect and the author must see it.

**If this instruction file has no §0 PREMISE LEDGER at all, that is itself the defect.**
Report it and stop. Do not proceed on an unledgered spec, however clear the task looks, and
do not write the ledger yourself — you would be certifying premises you did not author.

### §0c.1 — RE-CHECK THE PREMISES YOURSELF

The gate checks structure and whether anchors still resolve. It cannot check whether a claim
is *true*. You can.

1. `git ls-remote origin <trunk branch>` — report the tip. If it differs from the Base SHA,
   say so and STOP.
2. `git worktree add --detach <sha>` — a **fresh** tree. Never `git checkout <ref> -- <path>`
   into an existing tree: it does not delete files the ref removed, so deleted files linger
   as ghosts and every later search finds them.
3. For each `VERIFIED` row: open the cited lines and confirm the claim, not just the anchor.
   Report `P1 OK` or `P1 MISMATCH — <what you actually found>`.
4. Answer every §0b question with `file:line` evidence.
5. **STOP and report.** Do not begin the task until the owner confirms.

A premise that fails here is a finding, not a nuisance. **When an agent contradicts the spec
with `file:line` evidence, the agent is usually right.**

## §1 AUTHORIZATION & SCOPE

- **Owner has authorized:** <exact paths, or "nothing beyond the files in §2">
- **Branch:** `<lane branch>` from `<base sha>` · fresh worktree
- **Commit/push:** <AUTHORIZED / ASK FIRST> · **Merge: never self-merge**
- **GATED (needs explicit authorization above):** `lazytopper/src/lib/desktop/`, `lazytopper/src/data/`
- **FORBIDDEN:** `Welcome.tsx`, `App.tsx`, `DesktopShell.tsx`, `main.tsx`, `vite.config.ts`,
  `firebase.json`, `firestore.rules`, `predictionTypes.ts`

## §2 THE TASK

<What to change and why. Reference premises by ID — "because P1, the pool already contains
every canonical row" — so every step traces back to evidence.>

**Files you may touch:** <exact list>
**Files that must stay byte-identical:** <exact list>

## §3 GATES

Per the standing rules, run the LOCAL set here and let CI run the matrix.

```bash
cd lazytopper && npx tsc -p tsconfig.app.json --noEmit   # NEVER bare tsc — root has files:[]
corepack pnpm install --frozen-lockfile                  # pnpm, not npm
pnpm run build
git diff --check
git diff --name-only <base sha>                          # must be EXACTLY the §2 file list
```

**A gate that cannot run here is a FAILURE to report, never a silent skip.** For every suite
you rely on, quote the invocation line AND the result line proving it EXECUTED — for
`node --test` that is `# pass N # fail 0 # skipped 0 # todo 0`. The skipped and todo counts
are the point, not the pass count. "CI was green" is not a verification.

Beware the inverse too: a tooling error can produce failures that read exactly like failing
tests. Before reporting a RED, show a pre-change green and prove the assertion actually ran.

## §4 REPORT

Save to `<path>`. Must contain: branch + HEAD SHA · the §0c.0 gate output verbatim · the
§0c.1 premise results · the diff of each changed hunk · every gate's real output ·
`git diff --name-only` · anything you could not verify · **VERDICT: PASS / HOLD**.

Do not commit or push beyond §1. The owner byte-reviews this against its true base.

## §5 LIVE-VERIFY (owner only)

<Static gates are necessary, not sufficient. Anything touching auth, grading, persistence,
the gateway, or a rendered figure needs one real owner round-trip before it is "done".
A boot is what proves it runs.>

- [ ] <concrete step, on the stable Vercel URL>
