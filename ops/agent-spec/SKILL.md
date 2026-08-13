---
name: agent-spec
description: Writes LazyTopper agent instruction files with a gated §0 PREMISE LEDGER, and reviews agent reports against it. Use this skill WHENEVER you are about to write, revise, or review an instruction for a Claude Code agent, a lane task, a controller brief, or any spec that tells another model what to do in the chetan-anand-hub/Lazytopper-Production repo — and also whenever you are about to assert a fact about that repo in a spec, a review, or a recommendation. Trigger it even when the user does not ask for it: any mention of writing an agent prompt, a lane task, a task file, a handoff spec, "send this to Claude Code", reviewing an agent report or PR claim, or any sentence of yours that would state what some file or function currently does, means this skill applies. It replaces the prose premise-verification doctrine in cofounder-skill/SKILL.md with a mechanism.
---

# Agent Spec — premise-first instruction writing

Every spec asserts things about the repo. When one of those assertions is wrong, the whole
lane chases a bug that does not exist. That has happened enough times to be the dominant
failure mode: *nine wrong cofounder claims in a single lane, and every correction came from
someone RUNNING A COMMAND instead of reasoning.*

The doctrine was written down five separate times in `cofounder-skill/SKILL.md` and kept
failing. **Naming a failure mode does not immunise you against it.** So this skill is not
more doctrine. It is a template plus a gate that exits non-zero.

## The rule

> **A spec may state a repo fact only if the ledger row for it cites `file:line` you
> actually read, in a clean worktree, at a named SHA. Everything else is a QUESTION for
> the agent, never a conclusion.**

## Procedure

**1. Re-derive the SHA yourself.** `git ls-remote origin base/approved-thru-437` — it is
unauthenticated, so you never wait for the owner. Never trust a written SHA, including one
in a handoff doc or in a skill file.

**2. List the premises before writing the spec.** Draft the ledger first. Anything the task
depends on gets a row: what the code currently does, which function is called, what the
data shape is, which gate runs, what a prior PR landed. If a claim is not worth a row, the
spec must not lean on it.

**3. Verify each one by reading.** Fresh `git worktree add --detach <sha>`, or
`git show <sha>:<path>`. Then fill the row: the lines, an **anchor** (a literal substring
on those lines), and how you verified. Rows you cannot fill stay `UNVERIFIED` — that is a
success, not a gap.

**4. Route the unverified ones into §0b as questions.** Phrased as a question the agent
answers with evidence. A spec that supplies a conclusion it could not verify is the exact
artefact this skill exists to prevent.

**5. Run the gate.**
```bash
node scripts/premise_ledger_check.mjs <spec.md> --worktree=<clean tree> --strict-anchor
```
Non-zero means the spec does not ship. Fix the ledger, not the check.

**6. Emit the file** to `/mnt/user-data/outputs/` as
`LazyTopper_<Lane>_v<N.N>_<YYYY-MM-DD>.md`, from `ops/AGENT_SPEC_TEMPLATE.md` on trunk.
One instruction file per task — the file *is* the message. Embed dispatch, authorization
and decisions inside it; never split them into a chat message that arrives separately and
rots.

## Reviewing an agent report

Same ledger, other direction. The report's claims are premises now.

- Re-run §0c yourself against the branch. **Reports are claims, not proof.**
- Verify by **content on trunk** before SHA arithmetic: `git show <trunk>:<path>`, then grep
  for the thing that shipped. It is the only check immune to merge strategy and a stale clone.
- When the agent contradicts the spec with `file:line`, the agent is probably right. Verify,
  own it plainly, and correct the ledger in the same turn.

## Why the anchor column exists

`path:line` rots. Lines move; the citation stays confidently wrong. The anchor is a literal
substring the gate re-resolves with `--worktree`, so a premise that *was* true and has since
changed fails loudly instead of silently misleading the next lane. This is the same shape as
a derived value outliving the facts it came from — pin the bounds in a check, never the
number in prose.

## What the gate refuses

| Refused | Because |
|---|---|
| Missing §0 / §0b / §0c | The structure is the mechanism |
| No `Base SHA:` | A spec not anchored to a SHA cannot be re-verified |
| `VERIFIED` without `path:line` | A bare filename is not evidence |
| "How verified" saying *grep, search, named, doc comment, memory, assumed, the report says* | Those are inference, not reading. A `grep -l` hit is not an import; a variable's name is not its source |
| `UNVERIFIED` carrying evidence, or missing from §0b | An unverified premise must reach the agent as a question |
| Anchor absent from the cited lines (`--worktree`) | The premise has rotted |
| Spec over 250 lines | Spec size, not agent judgement, pushed three lanes past the context floor |
| **No input files** | An honest skip in CI is still a green build. If a check matters, its absence must FAIL |

## Where things live

- **Gate:** `scripts/premise_ledger_check.mjs` — **one copy, in the repo.** This skill does
  not bundle a duplicate. Two copies of one truth is the drift that got `references/`
  deleted. **What makes it fire is §0c.0 of the template — the agent runs the gate on its
  own instruction file as its FIRST command.** Nothing in CI can see a spec, because a spec
  is never in a PR: `grep -rn "premise_ledger" .github/ package.json` returns nothing.
  `scripts/src/premiseLedgerGuard.test.ts` pins the checker's behaviour in CI; it does not
  and cannot gate a spec.
- **Template:** `ops/AGENT_SPEC_TEMPLATE.md` **in the repo** — not bundled beside this
  file. Same one-copy rule as the gate.
- **Volatile state** (trunk SHA, lane status, open follow-ups) lives in `handoff/` and is
  read live, never from memory. Read the relevant lane doc *before* writing a task for that
  lane: `BANK_EXPANSION_LANE_STATE.md`, `CONTENT_LANE_STATE.md`, `NOTES_TRACK_HANDOFF.md`,
  `WORKSHEET_TRACK_HANDOFF.md`.

## When a premise turns out wrong

Fix the ledger, say so plainly, move on. No over-apology. Then route the lesson:

- **Can its absence fail a build?** → make it a check, and **delete the prose it replaces**.
- **Does it shape an artefact at the moment of use?** → the template, not the doctrine.
- **Neither?** → `cofounder-skill/SKILL.md`, under its line budget, which means something
  else comes out in the same commit.

A lesson that stays prose makes every future session slower and fires no more reliably than
the last four copies did.
