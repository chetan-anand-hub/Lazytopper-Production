# CONTENT_LANE_STATE.md — Fable content-orchestrator handoff

**Written:** 2026-07-10 · **Trunk at handoff:** `5ac4a44` (re-derive before you start — it moves).
**Why this file exists:** the outgoing orchestrator stopped at ~20–25% context after Task 1 rather than start
Task 2 depleted. A degraded orchestrator ships errors. A FRESH orchestrator resumes from this file.

## Where I stopped (state)
- **No task in flight. Working tree clean.**
- Branches `fix/bank-corrupt-objective-keys` (#352) and `docs/post-pr-352-corrupt-keys` (#354) MERGED and DELETED
  (local + remote + worktrees; verified empty via `git ls-remote --heads`).
- Trunk at `5ac4a44` plus whatever merged since — **re-derive `git rev-parse origin/base/approved-thru-437`**.

---

## Tasks COMPLETED (with PR numbers + what each proved)

### #342 — Biology "Life Processes" notes pilot (MERGED)
Proved the subject-adaptive note path end-to-end: `meta.subject:"biology"` + `third_tab.kind:"diagrams"` +
`examples[].kind:"process"`. `notes/specs/life-processes.json` — validator **VALID, all 9 rules, no `--force`**.
7 real NCERT figures extracted + eye-confirmed. (Notes lane is now schema-proven for physics/maths/biology.)

### #352 — [FU-BANK-CORRUPT-KEYS] repair corrupt objective answer keys (MERGED → `b9a7817`; docs #354 → `5ac4a44`)
Closed the live hole in PR #348's deterministic objective-scoring guarantee (objective = 0-or-FULL; a key that
doesn't resolve against `q.options` falls back to the model).
- **Defect list RE-DERIVED** with an AST scanner using the grader's OWN `normaliseOption` / `resolveOptionIndex` /
  `isObjectiveType` (from `lazytopper/server/routes/objectiveScoring.cjs` + `server/services/serverUtils.cjs`).
  **89 in-scope — NOT the ~101 estimated.** Re-deriving rather than trusting the estimate was correct; do the same
  for Task 2's counts.
- **76 fixed** = 61 corrupt MCQ keys (each question SOLVED, `q.answer` set to the EXACT text of the correct
  EXISTING option) + 15 Assertion-Reason rows given the 4 standard CBSE `options[]`.
- **`correctOption` was NEVER introduced. The answer key is `q.answer` (the option TEXT) and it MUST stay that way**
  — `correctOption` appears in 0/353 bank files; introducing it would silently break the grader.
- **61/76 fixes corroborated** by the row's original `finalAnswer` option-letter — **0 mismatches**.
- Method: 3 file-disjoint subagents (maths G1 / maths G2 / science) solved + edited their own files; orchestrator
  applied 4 manual corrections + verified. Grader `server/routes/*` byte-untouched.

---

## The 13 UNRESOLVED rows — and why they MUST stay unresolved
They live in **`docs/objective-answer-key-review-queue.md`** and are **deliberately unfixed**: corrupted/duplicated
options, or figure-dependent questions whose correct option cannot be established from the source text.

**A successor must NOT "helpfully" fill them in.** Anti-fabrication is absolute: **a fabricated answer key is worse
than a corrupt one.** A corrupt key fails LOUDLY into the model fallback; a wrong-but-confident key silently marks a
right answer wrong. These need a real-paper lookup or a teacher's eye → **[FU-BANK-KEY-REVIEW-QUEUE]**.

I **personally overrode two subagent "fixes" back to the manifest** — `PYQ-M-PROB-006` (keyed to an option
contaminated with the next section's rubric text) and `PYQ-M-PROB-010` (duplicated/garbled options) — rather than
accept plausible-but-unverified keys. **That is the standard: when in doubt, manifest.**

---

## Task queue (do IN ORDER; each is its own draft PR, owner-merged between; do NOT start until owner releases it)

### TASK 2 — [FU-CT-BANK-DEPTH] raise per-topic question depth — **NEXT, GATED**
Chapter Test is design-locked and needs enough questions per topic that two generated tests don't overlap heavily.
**The FIRST step is a DECISION, not execution: report the CURRENT per-topic question counts, then STOP for the owner
to set the depth floor.** Do NOT extract a single question before that number exists — extracting first guesses at
scope and wastes the lane. After the floor is set: CBSE-origin first, third-party TAGGED `source:"others"`,
step-marked solutions, `topicKey` matching `topics.ts`, `syllabusGuard.ts` re-read LIVE per chapter, all 10
checkpoint tests pass or no PR.

### TASK 3 — case-based / competency extraction (the thin 4-mark band)
Per `AGENT_FABLE_casebased_extraction_2026-07-04.md`. Full scenario + ALL sub-questions as **ONE set, never split**,
`format="Case-Based"`.

### Notes scaling — UNBLOCKED but NOT released
The notes **v1.2 template merged (#345)**, so notes scaling is no longer schema-blocked. A **notes-v1.3 polish**
(mindmap tree visibility + full-screen note modal) is queued AHEAD of it. Scaling awaits a **separate owner go** —
and if released, new notes MUST use the v1.2 template (per-step numeric marks; validator has 10 rules incl. the
Rule-10 sum check). See the `notes-generation-track` memory.

---

## STANDING RULES (full — you need nothing else)
- **You are an ORCHESTRATOR:** subagents do ALL heavy source-reading (PDFs, transcription); you assemble, gate, and
  open the PR. **Never load raw PDF pages into your own context.** Keep your context lean; hand off below ~20%.
- **Write ONLY:** `src/data/**`, `canonicalQuestionBank.ts`, `visualConceptRegistry.ts`, `public/visuals/**`,
  `docs/` manifests. **Never** components / pages / services / grader / notes.
- **`src/data` is GATED:** explicit owner authorization per PR; **stage explicitly (never `git add -A`).**
- **Re-derive the trunk tip + take a FRESH worktree per task.** A stale base nearly reverted a PR TWICE this week —
  **confirm `lazytopper/server/routes/objectiveScoring.cjs` exists on your branch before you start** (post-#348 marker).
- **One task → one draft PR → STOP** for owner review + merge. **Never self-merge. Never batch tasks.**
- **Anti-fabrication absolute.** Provenance tagged: CBSE-origin first (PYQ / sample / practice); third-party tagged
  `source:"others"`, **never mislabelled as CBSE**. Step-marked solutions. `topicKey` matches `topics.ts`.
  `syllabusGuard.ts` re-read LIVE per chapter. All 10 checkpoint tests pass or no PR.
- **The bank answer key is `q.answer` (option text). `correctOption` does not exist — never introduce it.**
- **Report per task:** before/after table · checkpoint results · `git diff --name-only` · manifest path ·
  remaining-context estimate.

## Pointers
- Memory: `content-lane-queue-2026-07` (this queue), `notes-generation-track` (notes lane), `worktree-removal-windows-lock`.
- Reports: `Desktop\diff\report-bank-corrupt-keys-2026-07-09.md`, `report-objective-scoring-uniform-2026-07-09.md` (#348).
- Grader contract to replicate for any objective-key work: `lazytopper/server/routes/objectiveScoring.cjs`.
