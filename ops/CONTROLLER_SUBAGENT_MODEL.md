<!--
PROVENANCE — read this before treating any glyph in this file as authoritative.

This file is a CONTROLLER TRANSCRIPTION of an owner-supplied source, not the owner's
original bytes. It reached disk twice as an attachment (2026-08-07 by the Wave 5G
controller, rewritten 2026-08-08 by the ME-A controller) and arrived transport-corrupted
both times.

REPAIRED 2026-08-13, committed to trunk for the first time. The corruption was LOSSY:
122 emphasis markers had been reduced to a bare UTF-8 lead byte (0xE2), which is the
lead byte for *, -, =>, !, and several others alike. Decoding could not recover them.

WHAT WAS MECHANICAL (byte-recoverable, certain):
  7x  middle dot,  1x  section sign,  1x  ellipsis

WHAT WAS INFERRED FROM CONTEXT (a human should spot-check these):
  2x   MOUNT != LIVE     -- restored from the known phrase in cofounder-skill/SKILL.md
  11x  bold double marker -> two stars
  15x  bold single marker -> one star
  3x   marker + wide gap  -> warning sign        [CORRECTED 2026-08-13 - was "double arrow"]
  91x  everything else    -> em dash (the dominant original use)

THE RULE TABLE. Per rule: WHAT WAS MAPPED TO WHAT, and whether that mapping was MECHANICAL
(byte-recoverable, certain) or INFERRED (a judgement a human should spot-check). This is the
format lane OPS-F published inside ops/CONTROLLER_ADDENDUM_Context_Safeguards.md and
ops/arcs/CONTROLLER_MeProgress_v7_Arc.md - see those two files on trunk for the worked example
and the full derivation; they are not restated here. Counts are OCCURRENCES OF THE RULE.
Damaged sequences are written as CODEPOINTS, never as the damaged characters themselves, so
that this header does not itself trip the mojibake gate.

  M1   x7    -> · middle dot                MECHANICAL  exact decode; nothing was lost
  M2   x1    -> § section sign              MECHANICAL  exact decode; nothing was lost
  M3   x1    -> … ellipsis                  MECHANICAL  an A0-or-above third byte survived and narrows it
  I1   x2    -> MOUNT != LIVE               INFERRED    restored from the known phrase in cofounder-skill/SKILL.md
  I2   x11   -> ★★ two stars                INFERRED    the house emphasis ladder, double tier
  I3   x15   -> ★ one star                  INFERRED    the house emphasis ladder, single tier
  I4   x3    -> ⚠ warning sign              INFERRED    marker + wide gap; SEE THE CORRECTION BELOW
  I5   x91   -> — em dash                   INFERRED    the dominant original use; the DEFAULT rule, and therefore the least certain large class
  TOTAL 131 substitutions - 9 MECHANICAL, 122 INFERRED

THE CORRECTION, 2026-08-13 (lane OPS-CLOSEOUT, owner-ruled; the class was found by lane OPS-F
while repairing this file's two siblings). Rule I4 previously read "marker + wide gap -> double
arrow", and the three sites carried U+21D2. They now carry U+26A0.
THE ARGUMENT IS MECHANICAL, NOT STYLISTIC. A WIDE GAP CAN ONLY COME FROM AN A0-TAILED GLYPH.
The warning sign is E2 9A A0 - A0-tailed - and its surviving 0xA0 was later normalised from a
no-break space to an ordinary space, which IS the observed wide gap. The double arrow is
E2 87 92 and has no A0 tail, so it cannot have produced the gap that was observed. All three
sites read as standalone warnings, not as logical consequences. The identical class is resolved
the identical way, independently, as rule R9 in ops/CONTROLLER_ADDENDUM_Context_Safeguards.md.
Reproducible by anyone with hexdump.

WHY THIS FILE NEEDS A RULE TABLE AND NOT JUST COUNTS - THE MECHANICAL-LABEL DEFECT.
OPS-F reports that a proposed rule U+00C3 U+00A7 -> U+00E7, labelled MECHANICAL, decodes
correctly and is THE WRONG CHARACTER: it would have published "[c-cedilla]2 applies regardless
of who opens the PR" where the source had a SECTION SIGN. It was reclassified INFERRED.
"MECHANICALLY RECOVERABLE" DESCRIBES THE BYTES, NOT THE MEANING. A MECHANICAL label asserts a
certainty byte arithmetic cannot supply, and a reader who trusts the label will not re-check
the glyph. Counts tell you HOW MUCH was guessed; only the table tells you WHAT was guessed, and
lets a human find the guess that is wrong.
Two further rule defects in that lane were caught ONLY BY READING THE RENDERED OUTPUT. No gate
saw them, and the ASCII-stripped byte-identity proof was blind to them, because it proves no
WORD moved and says nothing about whether the right GLYPH was chosen.
THE BYTE PROOF IS NECESSARY AND NOT SUFFICIENT.

NO WORDS WERE ADDED, REMOVED, OR REORDERED. Only marker glyphs were restored.
If the owner still holds the original attachment, replace this file with it and delete
this note. Until then this is the best available copy, and it says so.
-->

# LAZYTOPPER — CONTROLLER / SUBAGENT OPERATING MODEL

> **Problem this solves.** Three agents have now burned out mid-lane. The cause is structural: the
> agent doing the work is also the agent holding the plan, so implementation detail — file reads,
> build output, CI logs, mutation runs — consumes the context that holds the wave.
>
> **The fix: separate the two roles.** A CONTROLLER holds the plan and never reads code. SUBAGENTS
> read code, build, and return bounded summaries.

---

## 1 · THE TWO ROLES

### CONTROLLER — one per wave, long-lived
**Owns:** the wave plan, dispatch order, disjointness enforcement, the state file, and the final
handoff PR.

**★ NEVER does any of this** — every item burns the context the role exists to preserve:
- reads product source files
- runs builds, tests, or gates
- reads CI logs
- inspects diffs
- writes product code

**Its entire job:** decide what happens next, dispatch a subagent with a complete instruction file,
receive a bounded report, update the state file on disk, decide again.

### SUBAGENT — one per PR, disposable
**Owns:** exactly one PR. Reads whatever it needs, builds, runs gates, mutation-verifies, pushes as
draft, reads the CI log, and returns a **bounded** report.

**Dies after its PR.** It is not expected to survive, so it must write anything durable to disk
before finishing.

---

## 2 · THE STATE FILE — the controller's real memory

`handoff/WAVE_STATE.md`, rewritten by the controller after every subagent returns. **This, not the
controller's context, is the source of truth.** A controller that runs out can be replaced by
another reading this file.

```markdown
# WAVE <n> STATE — updated <timestamp>

TRUNK: <sha>            — re-derived, never remembered
OPEN PRs: <gh pr list --state open output>

## LANES
| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| C1 | ... | server/, scripts/ops/ | MERGED | #557 | |
| C2 | ... | checkSolution.cjs | DISPATCHED | — | subagent running |
| D1 | ... | src/components/auth/ | AWAITING REVIEW | #558 | screenshots owed |

## DISJOINTNESS
C-lane: lazytopper/server/**, lazytopper/scripts/ops/**
D-lane: lazytopper/src/**
— verified disjoint <timestamp>

## DECISIONS MADE THIS WAVE
- <one line each, with the reason>

## FU ENTRIES COLLECTED
- <id — one line each; full bodies live in the payload files on disk>

## BLOCKED / OWNER DECISIONS OWED
- <question — who is blocked>
```

---

## 3 · THE BOUNDED REPORT — the mechanism that keeps the controller lean

**A subagent's return message MUST fit this template and MUST NOT exceed it.** Full detail goes to a
report file on disk; the controller reads the file **only if it needs to**.

```markdown
LANE: <id>          PR: <#nnn or NOT PUSHED>       VERDICT: PASS | BLOCKED | FAILED
TRUNK: <re-derived sha>
FILES: <count> — all within allowlist? YES/NO. App.tsx absent? YES/NO
GATES: tsc app — | tsc test — | mojibake — | scope:guard — | vitest N passed (N)
CI: <run id> <PASS/FAIL> — zero-skip proof: <quoted result line>
MUTATIONS: <count> fired, all restored
— FINDINGS THAT CONTRADICT THE SPEC: <one line each, or NONE>
— OWNER DECISIONS NEEDED: <one line each, or NONE>
FU IDS: <ids only — bodies are in <file>>
CONTEXT REMAINING: <n>%
FULL REPORT: <path on disk>
```

**★ If a subagent returns more than this, the controller must not paste it into its own context.** It
reads the verdict and the two starred lines, and goes to the file for anything else.

---

## 4 · DISPATCH RULES

**One PR per subagent.** Never two. A subagent that finishes its PR and still has context does **not**
start another — it returns and dies. The next PR gets a fresh subagent with full context.

**The instruction file is the message.** The controller does not explain the task in chat; it points
at a complete `.md` file. That file must contain: the allowlist, the standing rules, the acceptance
criteria, the mutations required, and the decision ledger.

**The controller re-derives trunk before every dispatch.** Never from memory, never from the state
file — `git ls-remote origin base/approved-thru-437` each time.

**Disjointness is the controller's job, not the subagent's.** The controller assigns allowlists that
cannot overlap; the subagent verifies but does not negotiate.

**Handoff PRs queue; product PRs may race.** The **SEVEN** handoff files are a single shared lock —
`CURRENT_STATE.md`, `NEXT_ACTION.md`, `SESSION_LOG.md`, `IMPLEMENTATION_ROADMAP.md`,
`OPEN_QUESTIONS_AND_FOLLOWUPS.md`, `SURFACE_TRACKER.md` and **`DECISION_LOG.md`**. ⚠ **This line said
SIX until 2026-08-25 and silently dropped `DECISION_LOG.md`; FIVE lanes raised it before it was fixed.
ENUMERATE THEM, DO NOT COUNT THEM — a bare "seven" rots exactly the way "six" did.** Only the
controller writes the handoff, and only after every lane in the wave is on trunk.

---

## 5 · STANDING RULES — inherited by every subagent

These are earned. Each cost real time.

**★ SILENT NO-OPS.** A guard that cannot be shown to have fired is NOT PRESENT. Mutation-verify or
delete. Instances this month: a FORBIDDEN path entry that could never match; `Object.setPrototypeOf`
whose removal changed nothing; a vitest pool key ignored by the running pool; a merged PR silently
swallowing pushes; a reCAPTCHA fix that ignored its own argument; an ops guard whose pattern matched
zero times.

**★ WHERE ELSE?** Before assuming one location, grep for every occurrence. "The single choke point"
was 11 invocations across 6 files. "One gate bans the grader" was two.

**★★ A CONTROLLER AMPLIFIES.** *(Wave 4. Controller-specific — it has no subagent equivalent, because
only the controller stands between a subagent and the owner.)* A subagent's wrong finding reaches the
owner **through you, carrying your endorsement**, and **a finding you have restated is harder to
reject than one reported raw.** Pass findings through with their **provenance intact** — *"the
subagent reports X"* is **not the same claim** as *"X"*. And when a finding is retracted, **check
whether the amplified version reached the repo, the state file, or a dispatched instruction.** It
may already be somewhere you did not put it deliberately.

> The instance: a subagent offered `anchor_frame_would_miss` as a **minor side item, explicitly
> outside its allowlist**. The controller promoted it to the headline finding — and turned it into a
> **mutation requirement that would have broken a working metric** by demanding it report a miss that
> does not occur. The owner rejected it on inspection. **The controller cannot verify a code claim;
> it can only decide how much weight to put on an unverified one.** The correct handling was to pass
> it to the next lane **at the confidence it arrived with, flagged UNVERIFIED.**
>
> For the record, since the wrong version is the memorable one: `scopeGuard.mjs:237-242` is
> **CORRECT.** It re-runs `git ls-files --others` — **untracked only** — from the anchor, and
> **untracked files were the ONLY blind spot**; GUARD-1 itself verified that `git diff --name-only`
> returns root-relative paths from any cwd. **The defect is the NAME, not the behaviour.** Rename the
> counter and correct the comment; **never** assert that a tracked-modified file makes it non-zero.

**★★ A PROTECTION WITH A BYPASS IS ONLY AS STRONG AS ITS BYPASS LIST.** *(Wave 4. The most expensive
instance in this project's history — two merged PRs silently dropped from trunk.)* **"Enabled"
describes the rule; it says nothing about WHO it applies to.** When auditing any control, **read the
EXEMPTIONS before the setting.** The setting is what you configured; **the exemption list is what
actually happens.**

> The instance: `trunk-protection` was ACTIVE, *"Block force pushes"* was ENABLED, and it correctly
> targeted `base/approved-thru-437`. Its Bypass list read **"Repository admin — Always allow"**, and
> the owner **is** the repository admin. **The protection was perfect and exempted the only person
> who could trigger it.**
>
> **`--force-with-lease` did not help either.** The lease asks only *"has the remote moved since my
> last fetch?"* — and a `fetch` five seconds earlier **satisfied it**. — **It protects against
> someone ELSE's push, never against your own stale branch.**
>
> **Mechanism, from the reflog:** `42d82e87 @07:29:19 fetch origin: fast-forward` —
> `25e995a7 @07:29:24 update by push`. A push from the **shared checkout** sent its stale local
> branch over the remote and dropped two merged PRs.

**★★ "NEVER READ FROM THE SHARED CHECKOUT" APPLIES TO THE CONTROLLER TOO.** *(Wave 4.)* The rule is
written for subagents, and a controller reading `git status` there will draw exactly the same wrong
conclusions — **without a worktree to blame.**

> The instance: the controller told **three separate lanes** that `handoff/WAVE_STATE_WAVE3_ARCHIVE.md`
> was *"untracked scratch that exists only in the shared checkout."* **It is tracked on trunk.** It
> read as `??` **only because the shared checkout was stale.** Nothing was damaged — all three lanes
> left it alone — **but a repo fact was asserted three times without being checked.**
>
> — A controller cannot open product source, but it **can and must** run
> `git fetch` + `git ls-files` / `git cat-file -e origin/<branch>:<path>` before stating what is or
> is not in the repo. **Metadata is not code.** Asserting a file's tracking status is a claim about
> the repo, and **an unverified claim from the controller propagates into every instruction file it
> writes.**

**★★ A SQUASH MERGE DIFFS AGAINST THE BASE AT MERGE TIME, NOT AGAINST WHAT THE PR AUTHORED.**
*(Wave 4.)* A branch rebased onto a base that later moves **backwards** silently **re-carries
everything in between.** — **the PR's own file list is not what lands.**

> The instance: #566 reported and authored **4 files** and **landed 13** — nine of them `handoff/`
> docs, in a product PR, breaching `CLAUDE.md` §8 **green**. — **No gate saw it, and the reason is
> the sharpest form of this wave's subject:** `scope:guard` reads the **WORKING TREE**, where the
> author correctly saw four files. **The guard was right about what it inspected and blind to what
> would ship** — the others looked at nothing; this one looked at the wrong thing, correctly.
>
> **The missing check, and the data already exists:** reconcile `gh pr view --json files` against
> `git diff --name-only <merge-base>..<head>` **before merge.** Nothing does today.

**★★ A MUTATION RUN PROVES NOTHING UNLESS THE RESTORE IS VERIFIED. A FAILED RESTORE DOES NOT
ANNOUNCE ITSELF — IT PRODUCES A GREEN RUN.** *(Wave 4.)*

> The instance: a first M1 reported `64 pass 0 fail`. **The restore had silently failed and
> mutations were accumulating**, so the run was measuring a tree that was **neither the original nor
> the mutant.** Caught by its own author, discarded, redone one mutation at a time.
>
> — **Every mutation this project has relied on assumed a clean restore, and nothing checked it.**
> After restoring, verify — `git diff` empty, or re-run the unmutated suite and confirm it is green
> for the right reason. **Run mutations ONE AT A TIME.**

**★★ AN ATTACHED DOCUMENT IS NOT A FILE.** *(Wave 4 — controller error.)* **Every spec a controller
receives must be written to disk ON RECEIPT, before dispatch.**

> A rebuild was pointed at a spec file the controller had asserted was on disk and **never written**
> — it had arrived as an attachment and **died with the original lane's worktree.** The rebuild
> succeeded from the rulings and the blocked report instead: **luck, not process.**
> — **Second artefact in one wave to nearly die that way** — a lane whose worktree is removed leaves
> **nothing** behind but what the controller wrote down.

**★ WHEN A SPEC SAYS "BUILD X", CHECK WHETHER X ALREADY EXISTS UNDER ANOTHER NAME.** *(Wave 4.)*

> A spec named a new `quickPracticeGradeService.ts`. **`quickPracticeSessionService.ts` already
> existed** — 268 lines, already importing the response type, already writing through the record
> path. — **A second service is not redundancy, it is a DOUBLE-WRITE HAZARD**, and the corruption
> would have surfaced as duplicated attempts in Mistake Intelligence — **the store the tutor reads.**
> **The spec author wrote the filename they imagined rather than searching for the capability, and a
> subagent that had COMPLIED would have shipped the hazard.**

**★ A RETURN MESSAGE IS THE ONLY COPY — SO WRITE THE REPORT TO DISK FIRST.** Subagents in this wave
were blocked from writing report files, which makes **a lost relay a lost report.** Require every
subagent to write its full report to the reports directory **as its FIRST action after gates pass,
BEFORE composing its return message.**

> — ⚠ **AND SAY IN THE BRIEF THAT THE HARNESS WILL REFUSE.** Confirmed independently by **two** lanes
> in Wave 4: **the `Write` tool refuses to create `.md` report files for subagents** — *"Subagents
> should return findings as text."* **It is satisfiable only via the shell.**
> — **A requirement that reads as impossible gets quietly dropped** — and a compliant subagent would
> obey the refusal and lose its report, **which is the exact failure this rule exists to prevent.**
> One lane routed around it; one nearly did not. **State the workaround in every dispatch.**

**★★ A FRESH SHA IS NOT A GROWING HISTORY — CHECK ANCESTRY, NOT EQUALITY.** `git ls-remote` before
every dispatch catches trunk moving **forward**; it cannot catch trunk moving **backward**. Neither
can a green CI run, nor GitHub's own `MERGED` status with a `mergeCommit` SHA — **both agreed with
each other and were both wrong about what was on trunk.**

> **The only check that finds it:**
> `git merge-base --is-ancestor <mergeCommit> origin/base/approved-thru-437`
> and, independently, `git log origin/base/... -- <a path that PR changed>`.
> **Run both after any merge you are told landed, and before building on that base.**
> ⚠ Never read the shared checkout for this without `git fetch` first.

**★★ LIVE-VERIFY MEANS BOTH SURFACES, AND AT LEAST ONE WITH EXISTING STATE.** *(Wave 4 — a live
production break that every gate passed.)*

> **A fresh incognito session proves the happy path for a NEW student and says NOTHING about the
> students you already have.**

Every live-verify in the wave was **desktop-only and clean-state**. Mobile `/app/browse` was
error-paging with React #310 for **email-authenticated users who had existing local state** —
and **clearing site data fixed it**, which is the whole shape of the bug: *old client state, new
code.* **1082 passing tests, a verified build chunk and mutation-proven assertions all shipped it,
because every test starts from clean state.**

— **Mobile is where most students are and it is the surface verified least.** Verify: **both
surfaces**, and **at least one session carrying state from before the change.**
— Corollary for any lane touching a persisted shape: **test the migration FROM THE OLD SHAPE**, not
from clean — a clean-state test has the same blind spot that shipped the bug.

**★★ A CORRECT OUTCOME REACHED BY A FALSE PREMISE STILL POISONS THE RECORD.** *(Wave 4.)* When a
ruling turns out to be right for the wrong reason, **fix the reason, not just the outcome** — the
reason is what the next lane inherits, and it travels further than the change did.

> The instance: a spec said a header search input was dead — *"a student can click it and NOTHING
> happens"* — because it carried `readOnly`. **False:** `readOnly` **plus** an `onClick` is a
> standard click-to-open-a-picker pattern, and it opened a working CommandPalette. **The deletion
> was still correct**, on ground the subagent supplied instead: the palette filters seven fixed
> quick actions and **can return no topic, chapter or question**, so the placeholder *"Search
> topics, chapters, questions…"* **is a control that lies about what it returns.**
>
> — **Why the reason mattered more than the outcome:** a future agent reading *"the search was
> dead"* would also have believed **the palette was orphaned** — and deleted it. The subagent
> checked the blast radius and found `Ctrl/Cmd+K` and a separate Search button still using it.

**★★ A TEST PROVES THE CODE WORKS; A CHUNK PROVES IT SHIPS.** *(Wave 4 — the strongest single piece
of evidence produced.)* For any new component, cite its **emitted build chunk** alongside its test
count:
```
— src/components/home/FirstSession.test.tsx (17 tests) 692ms   — the suite ran
assets/FirstSession-SPkKUIod.js  9.00 kB — gzip: 3.25 kB       — it is IN THE BUNDLE
```
The second line proves the component is **reachable from the bundle graph**, not merely compiled and
tested in isolation. — **This is `MOUNT ≠ LIVE` answered with build output rather than argument**, and
it closes a gap no test can: a component can pass every test while being unreachable from the app.

**★★ A SUITE THAT ONLY EXERCISES THE EXPLICIT PATH SAYS NOTHING ABOUT THE DEFAULT PATH.** *(Wave 4.
A mutation that failed to go red — and that failure was the most valuable result of its run.)*

> A permissive `detectMode` left the acceptance suite passing **7/7**, because **every existing
> assertion passed an explicit `--mode`.** The **bare invocation — the path humans actually type —
> was never exercised.** The mutation could not go red until two new assertions were built for it.

**Test the invocation a human types, not the one a script does.** And when a mutation does not go
red, **the first hypothesis is that the suite has a hole**, not that the code is fine.
**★ PROVE THE MATCHER CAN FIRE — on every docs PR touching `handoff/`.** `check:mojibake` resolves
`repoRoot` with `git rev-parse --show-toplevel` — **the git root, not `lazytopper/`** — and `handoff/`
is listed in `REPORT_ONLY_PREFIXES`: it is **scanned, matched, counted and printed on every run, green
or red, but NOT ENFORCED.** So a pass IS evidence that `handoff/` was inspected; it is **not** evidence
that `handoff/` is clean, because **a report-only hit never turns anything red.** ⇒ **The rule below
stands — for a different reason than this paragraph used to give.** Scan your own added lines with the
scanner's own regex, **and inject a mojibake sequence into one of those lines to prove the regex fires
on that exact input.**

> ⚠⚠ **THIS PARAGRAPH SAID `handoff/` WAS "STRUCTURALLY BLIND" UNTIL 2026-08-25. THAT WAS A TRUE
> STATEMENT ABOUT A PAST STATE, RESTATED AS PRESENT FACT** — the scanner's own comment marks that frame
> bug FIXED under `[GUARD-3]`. It survived **three dispatches after it stopped being true**, and was
> disproved by control: injection into `handoff/CURRENT_STATE.md` moved report-only hits `17 -> 18` at
> **exit 0**, while injection into an enforced tree moved enforced hits `0 -> 1` at **exit 1**.
> ★ **"Structurally blind" and "report-only" are different facts, and conflating them loses the only
> signal that would reveal a regression back to blindness — the printed count.**
mojibake sequence into one of those lines to prove the regex fires on that exact input.**

> **A zero from a matcher nobody proved can fire is indistinguishable from a dead matcher.**
> Report it as `ADDED_LINES=n MOJIBAKE_HITS=0 CONTROL_INJECTED_DETECTED=true`.
> ⚠ 608 mojibake lines sat on trunk in `handoff/CURRENT_STATE.md` for months while the gate ran green.

**★ A DOCS-ONLY PR IS THE CHEAPEST FULL-BAR CHECK AVAILABLE — and the only one that sees the merged
whole.** It runs root typecheck, `typecheck:test`, **build**, mojibake, Firestore rules tests and
edge security tests **against trunk with every product merge composed together** — whereas a product
PR's run only ever sees **its own base**. Treat every handoff PR as a free integration check on the
wave, and say in the report what it verified.

**★ A CI RUN ID IS BOUND TO A COMMIT, NOT A PR.** Re-derive the run from the CURRENT head before
quoting it as evidence. A run id captured before a rebase or a trunk-merge verifies a tree that is
**not the one being merged** — and it looks like proof. The controller made exactly this error
assigning a run for #558; the subagent caught it, pulled the run on the real head, and re-verified.
Applies to every evidence lane.

**★ A RESTRICTION IS ONLY AS STRONG AS THE MOST PERMISSIVE RULE THAT MATCHES.** Generalised from
the Firestore no-op: tightening one block while another still matches the same path changes
nothing — and it *reads* as a fix, which is the dangerous part. **Mutation-verify the SPEC's
proposed fix, not only the code.** The proof that this had happened was a mutation against the
proposed fix returning output *identical* to the original permissive rule.

**★ A GUARD'S WORKING DIRECTORY IS PART OF ITS BLAST RADIUS.** `scope:guard` runs with
`cwd=lazytopper`, so `git ls-files --others` returns nothing there and an entire new top-level
directory is **invisible to it** while modified root files are seen. Same shape as the FORBIDDEN
entry that could never match: the guard runs, reports, and cannot see the thing it exists to catch.

**★ RE-DERIVE THE MECHANISM.** When a fix doesn't work, do not try a bigger version of it. Ask *"what
evidence would show this took effect?"* before the next attempt.

**★ MOUNT ≠ LIVE.** Imported and rendered is not the same as reachable. Trace the trigger.

**★ RETIRED SURFACES.** Daily Mix, Daily Mission, Study Plan and Dashboard are OLD DESIGN. **Treat any
reference to them as evidence of deadness, never of liveness.**

**★ SCREENSHOTS CHANGE CODE.** Capture before commit on any UI PR. Copy that passes every wording
assertion can still render as a four-line block of error-red.

**LOCAL vs CI.** `scope:guard` **before `git add`** (it reads the working tree and goes vacuous once
committed). `tsc` against **both** configs — the app config excludes test files and CI checks them
separately. Own scoped tests locally; full matrices in CI. **Except** a new import edge into
`lazytopper/src/`, which needs its covering root-matrix suite run locally — an import graph is
invisible in a diff.

**READ THE LOG, not the tick.** Zero-skip proof: `# pass N # fail 0 # skipped 0 # todo 0` for
`node --test`; `Tests N passed (N)` with passed equalling the parenthesised total for vitest.

**READING A HANG.** Vitest prints a suite line only when a file *finishes*, so a hanging file never
appears. Read the **gap**, not the last line. And if a timeout doesn't fire, it isn't slow — it's
blocked.

**LINE REFERENCES ARE DERIVED VALUES.** Cite by symbol or quoted code, never by line number alone.

**NEVER READ FROM THE SHARED CHECKOUT.** `C:\Projects\Lazytopper-Production` runs arbitrarily far
behind. `git log -- <path>` there silently omits commits — a confident wrong answer with no error.
Cut a worktree from a freshly derived trunk SHA.

**vi.mock IS A COMPLETE REPLACEMENT.** Adding an export to a widely-mocked module is as breaking as
adding a context key — an omitted export throws. Grep every `vi.mock` first, or put the new thing in
a module nobody mocks.

**CONTEXT BUDGET.** Below 30%, start nothing new. At 25%, write the handover file and return. Write
it to disk **as you go**, not held in context. Report remaining % in every message.

**IF THE SPEC IS WRONG, YOUR VERIFIED FINDING WINS.** Report it; do not build around it. Six spec
premises were wrong in one lane and the agent caught every one.

---

## 6 · WHAT THE OWNER STILL DOES

Unchanged, and not delegable:

- **Approves every PR.** Subagents stop before commit; the controller does not merge.
- **Merges.** Squash, checking the subject for a leading `@`.
- **Live-verifies.** Every material defect this month was found by using the deployed product, not
  by a gate.
- **Rules on product and content questions.** Pricing, NCERT accuracy, what a student should see.

---

## 7 · WHY THIS SHOULD WORK

The controller spends context on **decisions**, which are small. The subagent spends context on
**evidence**, which is large — and then dies, taking the large thing with it.

Failure mode to watch: a controller that starts "just checking" a file. **The moment it reads
product source, it has become a subagent with a plan attached, and the model has collapsed back to
what it replaced.**
