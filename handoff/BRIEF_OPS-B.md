# BRIEF — LANE `OPS-B` (Wave OPS-1) — preserve the lane reports and rulings

**Lane:** OPS-B · **Date:** 2026-08-13 · **Spec:** `ops/.specs/OPS-B.md` (gitignored)

| | |
|---|---|
| Worktree | `C:\Projects\LT-worktrees\ops-b` |
| Branch | `docs/ops-1-preserve-lane-reports` |
| Base SHA | `267f26b0f55cc35145ced5bfaf0b9ff4852be796` (re-derived via `git ls-remote`; unmoved from the controller's observation) |
| Files committed | **1** — this file |

> **VERDICT: PASS — with a finding that inverts the lane's founding premise.**
>
> **There are no lane reports in `handoff/` to preserve.** All 22 untracked `BRIEF_*.md`
> files there are **INSTRUCTION** dispatches; one is a **RULING**; one `SIGNAL_*` will not
> classify. **Zero are REPORTs.** The lane reports this wave set out to rescue are real, but
> they live **outside the repository**, in `C:\Users\Chetan\OneDrive\Desktop\diff\` — which is
> where `CLAUDE.md` §9/§11 tells every agent to put them.
>
> Committable set by the spec's own taxonomy (REPORT + RULING): **one file**, the ADDENDUM —
> and §3b's paired-authority rule blocks that one and routes it to the owner. So the honest
> outcome of "commit the rest" is **nothing but this report**.

---

## 1 · WHAT I ENUMERATED

Enumerated at worktree-cut time from the shared checkout at `267f26b0`, using
`git status --porcelain --untracked-files=all`, a filesystem `find`, and `git ls-files`
(to confirm none were already tracked):

- **23 files in scope:** 22 x `handoff/BRIEF_*.md` + 1 x `handoff/SIGNAL_*.md`.
- **0 files in scope in the repo root.**
- `BRIEF_OPS-A.md` / `BRIEF_OPS-B.md` / `BRIEF_OPS-C.md` / `BRIEF_OPS-D.md` were **absent**
  from that snapshot and were correctly excluded — my sibling lanes had not yet written them.
- None of the 23 was tracked at base. `git ls-files` filtered for `BRIEF_`/`SIGNAL_` returned empty.

The exact inventory, with md5 and byte size per file, was captured before any work began.

---

## 2 · THE CLASSIFICATION TABLE

One row per file. Evidence is a **quoted phrase from the file**, not an impression.

| # | file | class | evidence (quoted) |
|---|---|---|---|
| 1 | `BRIEF_ARRIVAL-1.md` | INSTRUCTION | *"You own exactly ONE PR. You push it as DRAFT and you die. Write your report to disk FIRST."* |
| 2 | `BRIEF_CONTAINER-GATE.md` | INSTRUCTION | *"**ALLOWED:**"* under an allowlist heading; *"Trunk at dispatch: `eeafb99b…` — re-derive it yourself"* |
| 3 | `BRIEF_EXPORT-1-CI-WIRE.md` | INSTRUCTION | *"Do the three edits, prove them, push, stop."* / *"**DO NOT OPEN A NEW PR.**"* |
| 4 | `BRIEF_EXPORT-1.md` | INSTRUCTION | *"## 0 - WHAT YOU ARE BUILDING AND WHY"* / *"TRUNK: `f654dc64…` -- RE-DERIVE IT YOURSELF, never trust this line."* |
| 5 | `BRIEF_EXPORT-PERF.md` | INSTRUCTION | *"## 0 · ALLOWLIST — three literal paths, no globs"* |
| 6 | `BRIEF_HANDOFF-CATCHUP.md` | INSTRUCTION | *"## 0 · ALLOWLIST — `handoff/**` ONLY"* |
| 7 | `BRIEF_HANDOFF_ME-A.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-09. The wave's closing act. ONE docs-only PR."* |
| 8 | `BRIEF_MARKS-1.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-08. Wave ME-A. One PR. You die after it."* |
| 9 | `BRIEF_ME-2.md` | INSTRUCTION | *"**This lane runs ALONE. It is large.** One PR, pushed as DRAFT, then you die."* |
| 10 | `BRIEF_ME-2_v2.md` | INSTRUCTION | *"## 2 · ALLOWLIST — exact paths, nothing else"*; *"authored by the ME-C controller 2026-08-09"* |
| 11 | `BRIEF_ME-2_v2_ADDENDUM_OWNER_RULINGS.md` | **RULING** | *"Six decisions were owed before `#655` merges. **All six are now ruled.**"*; header *"owner-ruled · amends `handoff/BRIEF_ME-2_v2.md` §6"*; six `## RULING n` headings |
| 12 | `BRIEF_MI-CONCEPT-1.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-08. Wave ME-A. One PR. You die after it."* |
| 13 | `BRIEF_OPS-LIFT-1.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-08, on an explicit owner ruling. One PR. You die after it."* |
| 14 | `BRIEF_RETRY-1.md` | INSTRUCTION | *"You own exactly ONE PR. Push as DRAFT and die. Write your report to disk FIRST."* |
| 15 | `BRIEF_SETTINGS-1.md` | INSTRUCTION | *"**Wave DPDP-B, final lane. Dispatched 2026-08-09.**"* / *"TRUNK: … -- RE-DERIVE IT."* |
| 16 | `BRIEF_SKILL_CARRYFORWARD_LESSON.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-09, on an explicit owner instruction. Tiny scope."* / *"**You are ADDING ONE COMMIT to it.** Do not open a new PR."* |
| 17 | `BRIEF_SUPPLY-2-SCOUT.md` | INSTRUCTION | *"**This is a READ-ONLY investigation.** You do not edit a single repo file, you do not create a branch, you do not push, you do not open a PR."* |
| 18 | `BRIEF_SUPPLY-2.md` | INSTRUCTION | *"## 0 · ALLOWLIST — ⚠ CORRECTED, do not use the one in the DPDP-B close-out"* |
| 19 | `BRIEF_TOPICHUB-1.md` | INSTRUCTION | *"One PR. Push as DRAFT and die. Report to disk FIRST."* |
| 20 | `BRIEF_TRENDS-MARKS-1-REFRESH.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-08. The LAST lane of Wave ME-A. One PR (an existing one). You die after it."* |
| 21 | `BRIEF_TRENDS-MARKS-1.md` | INSTRUCTION | *"Dispatched by the ME-A controller, 2026-08-08. Wave ME-A. One PR. You die after it."* |
| 22 | `BRIEF_TSX-1.md` | INSTRUCTION | *"**Wave DPDP-B, lane 1. Dispatched 2026-08-09.**"* / *"TRUNK: … -- RE-DERIVE IT YOURSELF, never trust this line."* |
| 23 | `SIGNAL_DPDP_SETTINGS-1_UNBLOCKED.md` | **UNCLASSIFIED** | *"# SIGNAL TO THE DPDP CONTROLLER — `SETTINGS-1` IS UNBLOCKED"*, *"**From:** the ME-A controller"* — see §4 |

**TOTALS: 0 REPORT · 1 RULING · 21 INSTRUCTION · 1 UNCLASSIFIED.**
**COMMITTED from this set: 0.** Plus this file = **1 file in the PR.**

### 2a · The trap that would have inverted this table

A marker grep is **not** a safe classifier here. Scanning for report markers
(`^LANE:`, `^VERDICT:`, `^GATES:`, `^CI:`, `^FULL REPORT`, `CONTEXT REMAINING`) scores
**5 hits on almost every INSTRUCTION file** — which would classify 21 dispatches as REPORTs.

The reason: **every instruction file embeds the return-message template it demands.** In
`BRIEF_MARKS-1.md` the hits sit inside a fenced block introduced by *"Then return ONLY this
bounded template"*, and the "report" lines are unfilled placeholders — the first reads
`LANE: MARKS-1        PR: <#nnn or NOT PUSHED>      VERDICT: PASS | BLOCKED | FAILED`.

A demanded report and a delivered report are byte-similar and semantically opposite. The
spec's instruction to **read the first 15 lines** is what discriminates them, and it is
correct precisely because the template always sits at the *end*.
→ `[FU-OPS-INSTRUCTION-TEMPLATE-DEFEATS-MARKER-GREP]`

---

## 3 · §3b — THE PAIRED-AUTHORITY RULE. VERIFIED, AND IT FIRES.

**The sentence exists.** In `handoff/BRIEF_ME-2_v2_ADDENDUM_OWNER_RULINGS.md`, in the
paragraph immediately under the title and dateline:

> Six decisions were owed before `#655` merges. **All six are now ruled.** Five are records; **ONE
> requires code.** Where this file conflicts with `BRIEF_ME-2_v2.md`, **this file wins.**

The dateline above it reads *"2026-08-09 · owner-ruled · amends `handoff/BRIEF_ME-2_v2.md` §6 · trunk `eeafb99b`"*.

**`handoff/BRIEF_ME-2_v2.md` exists** (untracked, 353 lines, md5 `0c6fa7540d4231136c96b5fc850b0076`).

So both limbs of §3b are live at once:

- **Limb 1 — "both must land or neither."** Satisfiable in principle.
- **Limb 2 — the genuine conflict.** The ADDENDUM classifies **RULING** (commit: YES). Its
  paired loser `BRIEF_ME-2_v2.md` classifies **INSTRUCTION** (commit: **NO**). §3b:
  *"you have a genuine conflict between two rules in this spec. **Do not resolve it. STOP,
  report it as an owner decision, and commit the rest.**"*

**I did not resolve it.** Neither file is committed. → **OWNER DECISION A**, below.

Worth the owner's attention: this is not a technicality. `BRIEF_ME-2_v2.md` opens by
declaring *"`handoff/BRIEF_ME-2.md` (v1) IS SUPERSEDED. DO NOT FOLLOW IT."* — so the pair
is really a **chain of three** (`ME-2` → `ME-2_v2` → `ADDENDUM`), each asserting precedence
over the last. Landing any subset puts a precedence claim on trunk pointing at a document
that is not there. → `[FU-OPS-ME2V2-PAIRED-AUTHORITY-UNRESOLVED]`

---

## 4 · THE UNCLASSIFIED FILE — and why I did not force it

`SIGNAL_DPDP_SETTINGS-1_UNBLOCKED.md` is a **cross-controller signal**, and the spec's
four-class taxonomy has no class for one. Measured against each class:

- **INSTRUCTION?** No. No allowlist, no acceptance criteria, no "you die after it", no PR to open.
- **RULING?** No. *"**From:** the ME-A controller"* — a controller, not the owner. It settles a
  scheduling dependency, not a question the owner was asked.
- **REPORT?** Closest, but it is not a record of what its author's own lane did. It is a
  message *to* another controller: *"`MI-CONCEPT-1` (#637) is ON TRUNK. `SETTINGS-1` is no longer
  blocked. You may dispatch it."*

**It is left uncommitted and listed, per §3a.** → **OWNER DECISION D.**

For the owner's input: this file carries **durable verified evidence** that exists nowhere else
I found — under *"## THE EVIDENCE — verified by the ME-A controller, not taken on report"* it
records the `git ls-remote` output, the `gh pr view 637` merge commit, an ancestry check, a
**content** proof (`git show` of `mistakeLogService.ts` showing `concept?:` and `questionId?:`),
and a production live-verification in both directions. That is preservation-worthy content in a
document that will not classify. A fifth class (**SIGNAL**) would resolve it cleanly.

---

## 5 · FINDINGS THAT CONTRADICT THE SPEC

### F1 — `BRIEF_GATE-1.md` is not in the repo. Right class, wrong place.

§3 offers it as *"reportedly a **REPORT** (branch, base SHA, HEAD SHA, PR number)"*.

**The class is exactly right. The location premise is wrong.** The file does not exist in the
repo root, in `handoff/`, anywhere else in the working tree, or in git history —
`git ls-files`, `git status -uall` and a filesystem `find` all return nothing.

It exists here:

```
C:\Users\Chetan\OneDrive\Desktop\diff\handover\Ops Session\BRIEF_GATE-1.md
```

— which is **the directory this very report must be copied to.** Its head confirms the class
beyond doubt: a table of *Worktree / Branch / Base SHA / HEAD SHA / PR*, with
*"PR | **#661 — DRAFT**, not merged, not self-approved"* and
*"**VERDICT: PASS-WITH-FOLLOW-UP.**"*

Per standing rule §6.3 — *"A correct outcome reached by a false premise still poisons the
record"* — the reason matters more than the verdict here, because the reason is F2.

### F2 — The founding premise is inverted: `handoff/BRIEF_*` are dispatches; the reports are outside the repo.

The lane is titled *"preserve the lane reports and rulings"* and §3 says the repo holds
*"roughly twenty untracked `BRIEF_*.md` files"* to be triaged for reports. The count is right
(22 + 1). **The kind is not.** Zero are reports.

The two locations are doing two different jobs, consistently, and `CLAUDE.md` is why:

| | in-repo `handoff/BRIEF_*.md` | `C:\Users\Chetan\OneDrive\Desktop\diff\` |
|---|---|---|
| what it holds | controller **dispatches** to lanes | lane **reports** |
| count found | 23 (22 BRIEF + 1 SIGNAL) | 200+ `AGENT_*` / `BRIEF_*` files incl. `BRIEF_GATE-1.md` |
| mandated by | ad-hoc controller practice | `CLAUDE.md` §9 — *"Save all reports longer than 30 lines to: `C:\Users\Chetan\OneDrive\Desktop\diff\`"* |

`CLAUDE.md` §11 closes it: *"Never write output files into `lazytopper/src/` or `handoff/`."*
**Agents have been following the standing instruction exactly.** The reports are not lost or
missing — they are where the doctrine sent them: on one local disk, outside version control,
outside CI, outside every guard, and outside any backup the repo provides.
→ `[FU-OPS-LANE-REPORTS-LIVE-OUTSIDE-THE-REPO]`, `[FU-OPS-HANDOFF-BRIEFS-ARE-INSTRUCTIONS-NOT-REPORTS]`

### F3 — The repo root holds zero `BRIEF_*.md`.

§3 says *"The repo root and `handoff/` hold roughly twenty untracked `BRIEF_*.md` files"*.
The root holds **none**. All 23 are in `handoff/`. The root instead holds 8 untracked
`CONTROLLER_*.md` files — including `CONTROLLER_BRIEF_WAVE_OPS-1.md`, which contains the
string `BRIEF` but does not match a `BRIEF_*` glob and is outside my allowlist either way.

### F4 — §5 of this lane's spec conflicts with `CLAUDE.md` §11.

§5 states *"Note: `handoff/BRIEF_OPS-B.md` is your report AND inside your allowlist. Commit it
with the PR."* `CLAUDE.md` §11 states *"Never write output files into `lazytopper/src/` or
`handoff/`."* This report is an output file in `handoff/`.

I **complied with the lane spec** — it is explicit, scoped, deliberate, and the controller owns
`handoff/`. But the conflict is real and it is the same governance question as F2, so it should
be settled deliberately rather than by whichever document an agent read last.
→ `[FU-OPS-CLAUDEMD-S11-VS-HANDOFF-REPORT-PATH]`

### F5 — Genuine durable records exist that no lane in this wave can preserve.

Outside my allowlist (`handoff/BRIEF_*.md`, new files only) but untracked and unpreserved:

- **5 x `handoff/WAVE_STATE_*_LIVE.md`** — `CLOSEOUT`, `ME_A`, `ME_B`, `ME_C`, `WAVE_DPDP_B`.
  These are wave close-out records. `BRIEF_SUPPLY-2.md` cites one of them as authoritative
  prior art: *"Prior spec on disk — READ IT, do not re-derive it: … the close-out beside it,
  `handoff/WAVE_STATE_WAVE_DPDP_B_LIVE.md`."* A file that another brief instructs a lane to
  **read as authority** is exactly the file that must not be untracked.
  (`WAVE_STATE_OPS_1_LIVE.md` is the controller's live file and is correctly excluded.)
- **8 x root `CONTROLLER_*.md`** — including `LazyTopper_Controller_Subagent_Model.md`, which
  **eleven of the 23 briefs instruct their lane to read as binding standing rules**
  (*"Read `LazyTopper_Controller_Subagent_Model.md` §5 (repo root) — every standing rule there
  binds you"*). The single most-cited authority document in the corpus is untracked.

→ `[FU-OPS-WAVE-STATE-AND-CONTROLLER-DOCS-UNPRESERVED]`

---

## 6 · MOJIBAKE — §3c

### 6a · The corpus (context for a follow-up lane)

Scanned all 23 candidate files with the scanner's **own** regex, lifted verbatim from
`lazytopper/scripts/check-mojibake.cjs`:

```js
const mojibakeRegex = /(?:\uFFFD|\u0393\u00C7|[\u00C2\u00C3\u00CE\u00CF\u00E2\u00F0][\u0080-\u00BF\u00C0-\u00FF\u2013-\u201F\u2020-\u2022\u2030\u2039\u203A\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC])/u;
```

**Result: `TOTAL_HITS=1` across `TOTAL_LINES=4599`.** 22 of the 23 files are clean.

The single hit is **`BRIEF_ME-2_v2.md` line 30 — and it is not a defect.** The line is a
*deliberate specimen*: it documents what the corruption looks like, quoting the corrupted
forms of an em dash and a middle dot so the next reader recognises them. That is precisely
the category `check-mojibake.cjs` documents in its own header as *"DELIBERATE MOJIBAKE
SPECIMENS quoted inside handoff entries that are LESSONS ABOUT MOJIBAKE … Correct content."*

**The corpus needs no cleanup. No follow-up lane is owed here** — which is itself the useful
answer to the question §3c asked ("so a follow-up lane knows the size of the job": the job is
zero).

### 6b · The required control — proving the matcher can fire

`check:mojibake` is REPORT-ONLY over `handoff/`, so its pass is no evidence about a handoff
file. I ran the three-step control against **my own added lines** instead:

1. **Scan.** All added lines in this PR scanned with the regex above.
2. **Inject.** A mojibake sequence (U+00C2 U+00B7 — the corrupted form of a middle dot) was
   written into one of those added lines and the regex re-run on that exact input. The matcher
   **fired**, reporting the injected line. It is alive, not merely silent.
3. **Restore.** Injection removed; the file verified **byte-identical** to its pre-injection
   state by md5 comparison. A failed restore does not announce itself — it produces a green
   run — so the restore was checked by hash, not by eye.

**`ADDED_LINES=332 MOJIBAKE_HITS=0 CONTROL_INJECTED_DETECTED=true`**

---

## 7 · GATES

| gate | result |
|---|---|
| `git branch --show-current` before commit | `docs/ops-1-preserve-lane-reports` — matches my own branch, not the shared checkout |
| `pnpm run scope:guard --mode docs` (pre-`git add`) | **PASS** — `SCOPE_GUARD_OK (mode=docs, lanes=docs)`, and `inspected=1 untracked=1` proves it was **not vacuous**: it classified the file rather than finding nothing to inspect |
| `npm run test:repo-boundary` | **PASS** — `unknown=0` (`Repo boundary acceptance PASSED (11/11)`; `docs=168`) |
| `git diff --check` | clean — no whitespace errors |
| `git diff --name-only 267f26b0` | `handoff/BRIEF_OPS-B.md` — one file, one addition, nothing else |
| Forbidden files | **none touched.** The six shared-lock files, `WAVE_STATE_OPS_1_LIVE.md`, everything under `ops/`, all product source, `lazytopper/**`, `scripts/**`, `lib/**` and `pnpm-lock.yaml` are all absent from the diff |
| CI | __CI2__ |

---

## 8 · FOLLOW-UPS

- **`[FU-OPS-LANE-REPORTS-LIVE-OUTSIDE-THE-REPO]`** — Every lane report this project has produced
  lives in `C:\Users\Chetan\OneDrive\Desktop\diff\` on one machine, because `CLAUDE.md` §9/§11
  says to put it there. They are outside version control, CI, the guard matrix and any backup.
  `BRIEF_GATE-1.md` — the report for `#661`, the very commit this wave is based on — is one of
  them. Decide the destination, then make `CLAUDE.md` say it.

- **`[FU-OPS-HANDOFF-BRIEFS-ARE-INSTRUCTIONS-NOT-REPORTS]`** — `handoff/BRIEF_*.md` is, in
  practice, a folder of controller **dispatches** (21 of 23). The `BRIEF_` prefix names two
  opposite document kinds across two locations. A naming split (`SPEC_`/`DISPATCH_` vs
  `REPORT_`) would make the OPS-B classification pass unnecessary next time, rather than
  merely repeatable.

- **`[FU-OPS-CLAUDEMD-S11-VS-HANDOFF-REPORT-PATH]`** — `CLAUDE.md` §11 forbids writing output
  files into `handoff/`; this lane's spec mandates exactly that. Settle it in `CLAUDE.md`.

- **`[FU-OPS-WAVE-STATE-AND-CONTROLLER-DOCS-UNPRESERVED]`** — 5 x `handoff/WAVE_STATE_*_LIVE.md`
  and 8 x root `CONTROLLER_*.md` remain untracked and outside every OPS-1 allowlist, including
  `LazyTopper_Controller_Subagent_Model.md`, which 11 of the 23 briefs cite as binding.

- **`[FU-OPS-INSTRUCTION-TEMPLATE-DEFEATS-MARKER-GREP]`** — Any future automated triage of these
  files must not grep for report markers: instruction files embed the report template they
  demand and score as REPORTs. Discriminate on the opening lines.

- **`[FU-OPS-ME2V2-PAIRED-AUTHORITY-UNRESOLVED]`** — The `ME-2` → `ME-2_v2` → `ADDENDUM`
  precedence chain is unresolved and nothing is on trunk. See §3.

---

## 9 · OWNER DECISIONS NEEDED

**A. The §3b conflict — it blocks the only committable file.** The ADDENDUM is a RULING and six
owner rulings are recorded nowhere else, including one that *"requires code"*. Its paired
document `BRIEF_ME-2_v2.md` is an INSTRUCTION, which the spec forbids committing. Options:
(i) land both, accepting one instruction file on trunk; (ii) land neither, leaving six owner
rulings untracked; (iii) extract the rulings into a standalone `RULINGS_*.md` that drops the
precedence claim. I did not choose — §3b forbids it.

**B. Where do lane reports live?** F2/F4. This is the question the whole wave is really about,
and every other decision here follows from it.

**C. The out-of-scope durable records.** F5 — 5 `WAVE_STATE_*` + 8 root `CONTROLLER_*`. No OPS-1
lane has them in its allowlist, so if OPS-1 closes as scoped they stay untracked.

**D. A fifth class for `SIGNAL_*`?** §4. It carries verified evidence found nowhere else and
will not fit the four classes.

**E. Should `BRIEF_GATE-1.md` be imported into `handoff/`?** It is a genuine REPORT and would be
committable — but it sits outside the repo and outside the enumeration §3a defines, so importing
it is a preservation decision, not a classification one. I left it where it is.
