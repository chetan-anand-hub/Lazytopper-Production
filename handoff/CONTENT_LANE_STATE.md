# CONTENT_LANE_STATE.md — Fable notes-orchestrator handoff

**Written:** 2026-07-11 · **Lane:** notes generation (the ~30-chapter NCERT note fan-out).
**Trunk at handoff:** `cbc561c` (re-derive before you start — it moves: `git rev-parse origin/base/approved-thru-437`).
**STATUS: the fan-out is COMPLETE — all 26 chapters specced; all auditor-PASS.** Batches 1–4 MERGED
(#365/#368/#370/#371, each auditor-PASS). Batch 5 (#372) is all-4-chapters auditor-PASS and
owner-mergeable (heredity was REJECTed on one within-syllabus genetics line, fixed, and re-audited PASS).
Nothing left to author or verify — the only remaining step is the owner merging #372.
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

- **Batch 3 (#370):** carbon-and-its-compounds, control-and-coordination, pair-of-linear-equations,
  arithmetic-progression, triangles, coordinate-geometry. Auditor PASS.

## THE FAN-OUT IS COMPLETE — all 26 chapters specced, all auditor-PASS
- **Batch 4 (PR #371, MERGED, auditor PASS):** trigonometry, circles, areas-related-to-circles,
  surface-areas-and-volumes, statistics. On trunk.
- **Batch 5 (PR #372, all-4 auditor-PASS, owner-mergeable):** probability, our-environment,
  heredity (evolution-trimmed), magnetic-effects-of-electric-current (motor/generator-trimmed).
  The two trimmed chapters' deleted-content boundaries passed the independent auditor's own greps + source
  checks clean. Heredity was REJECTed on ONE within-syllabus genetics line (concepts[c3] named the PARENTAL
  phenotypes as the F2 "new combinations" for the RRyy×rrYY cross — a semantic error no static gate catches);
  fixed to the true recombinants (round-yellow & wrinkled-green, matching the example/formula_strip/Fig 8.5),
  re-verified VALID, re-audited PASS. PR #372 is marked ready, CLEAN, MERGEABLE.
- **Nothing left to author or verify — the only remaining step is the owner merging #372.** If you inherit
  here and #372 is already merged, the notes lane is fully closed (26/26 on trunk).

## HOW THE TWO TRIMMED CHAPTERS WERE HANDLED (reference, now done)
- **heredity** (`heredity`, ch8 jesc108): the 2026-27 PDF is already titled just "Heredity" (evolution half
  deleted). def_heredity/def_inheritance_rules were drawn from the SAFE upper part of p.129 to avoid the
  §8.1 evolution-bridge sentence at that page's bottom; Fig 8.1 (evolution tree) not used; zero evolution
  matches by grep.
- **magnetic-effects-of-electric-current** (ch12 jesc112): Fleming's-left-hand-rule verbatim TRUNCATED before
  the deleted "electric motor, electric generator…" sentence; only Fleming's LEFT-hand rule; zero
  motor/generator/induction matches by grep (only the in-syllabus "electromagnet").

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
