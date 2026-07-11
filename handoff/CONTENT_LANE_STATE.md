# CONTENT_LANE_STATE.md — Fable notes-orchestrator handoff

**Written:** 2026-07-11 · **Lane:** notes generation (the ~30-chapter NCERT note fan-out).
**Trunk at handoff:** `308be871` (re-derive before you start — it moves: `git rev-parse origin/base/approved-thru-437`).
**Why this file exists:** a FRESH orchestrator resumes the notes lane from here. Operate per
`AGENT_FABLE_notes_orchestrator_2026-07-11.md` (delegate all NCERT reads to subagents; keep your own
context lean; enforce the six-gate stack; internal skeptic; never self-merge; every batch goes to a FRESH
independent Opus auditor, then owner merge). The one-time first-batch eyeball is DONE — batches now flow
gates → skeptic → PR + report → independent auditor → owner merge, no eyeball.

## THE GATE (Task 0, MERGED #362 + hardened since)
`notes/` has THREE deterministic checkers, all live-dependency-driven, no `--force`:
- `validate_spec.py` (schema v1.2, 10 rules).
- `verify_note_fidelity.py` — every NCERT verbatim literally present at its cited page (pymupdf; alnum
  skeleton match; 2D-typeset math emits an honest "math region not linearly verifiable" flag, never a
  silent pass). Page map = constant-offset detection (fixes low-numbered chapters). stdout forced UTF-8
  (Windows cp1252 print-crash fix, batch 2).
- `verify_note_conformance.py` — structure/discriminators/depth ≥ the subject's LOCKED exemplar.
  EXEMPLAR_BY_SUBJECT: physics→light, maths→quadratic-equations, biology→life-processes,
  **chemistry→chemical-reactions-and-equations** (locked in batch 2; tighter than the old ABS_MIN).
Each has a `--selftest` (3 goldens VALID, 6 `_test/` fixtures INVALID). Run all + `run_negative_tests.py`
as the golden-regression gate after ANY gate-script change. Always run gates with `PYTHONUTF8=1` on Windows.

## DONE (11 of 26 chapters) — all merged on trunk
- Goldens (pre-existing): light-reflection-and-refraction, life-processes, quadratic-equations.
- **Batch 1 (#365):** electricity, chemical-reactions-and-equations. (chemical-reactions is the LOCKED
  chemistry exemplar.)
- **Batch 2 (#368):** real-numbers, polynomials, human-eye-and-colourful-world, acids-bases-and-salts,
  how-do-organisms-reproduce, metals-and-non-metals. Auditor PASS; both gate changes validated.

## IN FLIGHT — Batch 3 (branch `feat/notes-batch3`, 6 chapters, readers dispatched)
carbon-and-its-compounds (chem), control-and-coordination (bio), pair-of-linear-equations (maths),
arithmetic-progression (maths), triangles (maths), coordinate-geometry (maths).
Process per chapter: reader authors spec+figures → orchestrator re-runs all 3 gates → adversarial SKEPTIC
(separate instance) → fix any skeptic finding → when all green, batch PR + verification report → FRESH
independent auditor. If you inherit mid-batch: check `notes/specs/` in the worktree for which specs exist,
re-run the 3 gates on each, and dispatch skeptics for any not yet skeptic-verified.

## REMAINING AFTER BATCH 3 (9 chapters → ~2 batches)
- **Batch 4 (maths, ~5):** trigonometry (ch8, jemh108), circles (ch10, jemh110),
  areas-related-to-circles (ch11, jemh111), surface-areas-and-volumes (ch12, jemh112),
  statistics (ch13, jemh113).
- **Batch 5 (final, ~4):** probability (ch14, jemh114), our-environment (ch13 sci, jesc113), and the TWO
  trimmed chapters (below).

## TWO CHAPTERS NEED EXTRA SYLLABUS-TRIMMING CARE (owner directive — call them out at the TOP of their
   batch's verification report so the auditor scrutinises them first):
- **heredity** (slug `heredity`, NOT `heredity-and-evolution`; ch8 science, jesc108). CBSE DELETED the
  evolution half. Keep OUT everything downstream of heredity/inheritance: Darwin/natural selection,
  speciation, "basis for evolution," homologous/analogous/vestigial ORGANS, fossils, evolution-by-stages.
  When a verbatim's NCERT sentence continues into evolution content, TRUNCATE before it (the reproduction
  spec already did this with "basis for evolution" — that's the pattern). Re-read syllabusGuard.ts LIVE.
- **magnetic-effects-of-electric-current** (slug `magnetic-effects-of-electric-current`; ch12 sci,
  jesc112). Deletions here too (electric motor/generator details; Fleming's-rule scope varies). Re-read the
  guard LIVE for THIS chapter and honour its banned list exactly; do NOT carry full-chapter NCERT unfiltered.

## PER-CHAPTER BANNED EXCLUSIONS ALREADY KNOWN (maths, from syllabusGuard SURFACE_BANNED_PHRASES)
trigonometry → "Trigonometric Ratios of Complementary Angles"; surface-areas-and-volumes → "Frustum of a
Cone", "Conversion of Solids"; statistics → "Ogive", "Cumulative Frequency Graph/Curve"; circles →
"Construction of Tangents". Batch 3: pair-of-linear-equations → "Cross-Multiplication Method";
coordinate-geometry → "Area of a Triangle in Coordinate Geometry"; triangles → "Construction of Similar
Triangles" + "Division of a Line Segment". Always re-read the guard LIVE per chapter — do not trust this
list from memory.

## CONVENTIONS / GOTCHAS discovered (carry forward)
- **Generated-figure webps are NOT committed.** `bucket:"generated"` figures declare `asset`+`generator`
  +`params` and render at runtime; the merged golden quadratic-equations ships its generated figure without
  a webp. Only commit `bucket:"ncert"` extraction webps. Stage EXPLICITLY (never `git add -A`); exclude
  `notes/__pycache__/` and generated webps.
- **Figures:** extract with the kit (`rasterize`→`.crop`→`clean_watermark`), save WebP, then READ the webp
  to EYE-CONFIRM (right figure, clean, no body-text bleed) before shipping. Faint residual © watermarks on
  colour figures are acceptable IF disclosed in the figure `clean`/`note` field and labels stay legible.
- **`page_pdf`** is a provenance annotation only (the gate uses the authoritative printed `ncert_page`);
  0-based is the batch-1 convention (human-eye drifted to 1-based — cosmetic, flagged, not fixed).
- **Process/authored examples:** biology process examples + any authored practice prompt must prefix
  `problem_verbatim` with "[authored prompt]" so fidelity SKIPS them (never mislabel authored as NCERT).
- **Any gate-script change** → surface at the TOP of the verification report for the auditor's first
  scrutiny (batch-2 precedent: cp1252 print fix + chemistry-mapping tightening).
- Reports go to `C:\Users\Chetan\OneDrive\Desktop\diff\report-notes-batch<N>-verification-*.md`.
- Worktree per batch: `C:/Projects/LT-worktrees/notes-batch<N>` off re-derived trunk; branch
  `feat/notes-batch<N>`. Windows `git worktree remove` hits a lock gotcha but de-registers anyway.
- CI on a batch PR runs `quality-gate` + `lane-overlap` (both must be green); notes python gates are NOT in
  CI (run them locally). A batch PR of new `notes/` files is normally MERGEABLE even a few commits behind
  base (infra/other-lane commits don't touch `notes/`); no rebase needed unless a real `notes/` overlap.

## STANDING RULES
Anti-fabrication ABSOLUTE; verbatim NCERT only (verbatim/plain strictly separate); honest empty over
padding. topicKey = exact `lib/desktop/topics.ts` slug. syllabusGuard.ts re-read LIVE per chapter. One Fable
orchestrator only. Never self-merge. Hand off below ~20% context by refreshing THIS file.

## POINTERS
Briefs: `AGENT_FABLE_notes_orchestrator_2026-07-11.md`, `AGENT_notes_TASKS_2026-07-11.md`,
`AGENT_notes_INDEPENDENT_AUDIT_2026-07-11.md`. Schema: `notes/NoteSpec_Schema.md`. Memory:
`notes-generation-track`, `content-lane-queue-2026-07`.
