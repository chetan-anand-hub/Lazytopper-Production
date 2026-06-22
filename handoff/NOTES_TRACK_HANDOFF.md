# Notes-generation track — HANDOFF (Step-1 kit + prototypes + Light exemplar complete; enrich 4 more next)

**Last updated:** 2026-06-22 · **Notes content merged:** #282 (squash `de2a616`, 2026-06-21 13:42Z); trunk tip `a9eac09` (after the parallel worksheet #283/#284/#285 + PYQ-symbol #286/#287 work).
For the next notes agent. This is a **parallel CONTENT track** (like the worksheet track), separate from the Topic Hub product queue. **Step 1 — the locked kit + 5 v2 prototypes + the Light reference exemplar — is DONE and merged (#282).** Content-generation ONLY; **UI wiring (a React `<Note>` component / route) is a separate future PR**, not part of this track yet. **Never self-merge content; stop for owner review per note.**

## 1. What this track is
Generate Class-10 CBSE chapter notes from the **official NCERT 2026-27 PDFs**, in the locked LazyTopper note grammar, with **verbatim-NCERT-definition discipline** (these notes are tutor infrastructure — the tutor leads with the exact NCERT wording). Verbatim accuracy + correct-edition cites + eye-confirmed figures **over speed**. Honest empty/flag beats fabrication.

## 2. State of play (#282 — merged)
14 files, ALL under `notes/` (content-generation only, no app wiring; gates + CI GREEN; owner-merged):
- **`lazytopper_notes_kit.py`** — locked renderer + figure toolkit (`ncert_figure`/`clean_watermark`/`refill_rect`). Verified running (`python lazytopper_notes_kit.py` regenerates ELEC+CHEM into `out/` with the Download-PDF button).
- **5 v2 prototypes** — `LazyTopper_NoteProto_*_v2_2026-06-21.html`: Light, Electricity, Chemical Reactions, Life Processes (**carries 3 real NCERT figures — don't drop them**), Quadratic Equations.
- **`light_note_ENRICHED_v2_2026-06-21.html`** — the FINISHED reference exemplar / template for the standard: 6 verbatim NCERT definition cards + 8-term key-terms cluster, 4 real NCERT worked examples, 3 real NCERT figures (incl. **Fig 9.9 New Cartesian Sign Convention**), AUTHORED-vs-NCERT legend, full source ledger; cites reconciled directly against **NCERT Reprint 2026-27, Class 10 Science, Ch 9** (`jesc109.pdf`).
- Track docs: `LazyTopper_NoteProtos_INDEX_2026-06-21.md` (canonical record), `LazyTopper_Light_CiteMap_2026-06-21.md`, the 06-21 dispatch + v2 brief, `AGENT_message_all_flags_2026-06-21.md` (owner's binding rulings), `HANDOFF_notes_track_2026-06-21.md` (the detailed working handoff), `report-notes-light-enrichment-v2-2026-06-21.md`.

## 3. DECISION + NEXT (gated order — owner-authorized separately, do NOT reorder)
**Decision (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** component fed by a structured **note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — **NOT standalone HTML**. The tutor and PR-F both consume the spec as data. **Step 2 authors specs (JSON), not HTML.** The Step-1 prototypes (HTML) become the seed for the Light reference spec.

1. **`notes/validate_spec.py`** — a source-required validator to note-spec **schema v1.1**: rejects any unsourced verbatim / example / NCERT-figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count. This gate is what makes the ~35-note fan-out safe to parallelize.
2. **Content PR (under `notes/`):** commit `specs/light-reflection-and-refraction.json` (validated reference spec) + the schema-v1.1 doc + `validate_spec.py`; evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift.
3. **Then in parallel:** **PR-F** (the `<Note>` component + Topic Hub wiring — reads `notes/specs`+`notes/assets`, writes `src/`) built on the Light spec, AND **Step-2 spec authoring** (the 4 prototype enrichments — Electricity jesc111 / Chemical Reactions jesc101 / Life Processes jesc105 [keep its 3 figures] / Quadratic Equations — → ~35 notes), validator-gated. Author the figure-bearing content from the official PDFs; eye-confirm every crop (rasterize → look at PNG → pick box → look at crop → adjust); batch by subject; stop for owner review per batch.

**Do NOT start Step-2 generation or PR-F before the validator + content PR land.**

## 4. Toolchain / environment (READY)
- Python: PyMuPDF, ftfy, numpy, PIL — installed.
- **Official 2026-27 NCERT books:** `C:\Users\Chetan\OneDrive\Desktop\NCERT Books\` → `Mathematics class 10\` + `Science class 10\`. Science chapters bundled in `jesc1dd.zip`, extracted to `Science class 10\_unzipped\` (jesc101…jesc113 + answers `jesc1an` + prelims `jesc1ps`). **Map files by CONTENT, never filename.** Key map: jesc101=Chemical Reactions (Ch1) · jesc105=Life Processes (Ch5) · jesc109=Light (Ch9) · jesc111=Electricity (Ch11) · jesc112=Magnetic Effects (Ch12). Maths chapters in `Mathematics class 10\` are **not yet unzipped/mapped** → [FU-NOTES-MATHS-MAP].
- `Rationalised (1).pdf` = NCERT's official removed-content note; cross-check scope against it AND `scripts/src/syllabusGuard.ts` (repo stays authoritative; flag disagreements).

## 5. Standing rulings (apply to EVERY note — from `notes/AGENT_message_all_flags_2026-06-21.md`)
- **Cite against the official 2026-27 PDFs**; stamp "NCERT Reprint 2026-27, Class 10 [Science|Maths], Ch N" in every ledger. Re-cite directly from the file (don't trust transcription).
- **Show the real NCERT figure** when a "rigorous core" tab states a convention NCERT illustrates (owner override of the authored-SVG bucket — e.g. the sign-convention figure).
- **`magnetic-effects` = GENERATE, TRIMMED** — magnetic field, field lines, field due to current-carrying conductor/solenoid, right-hand rule, force on a conductor. **EXCLUDE Motor / EMI / Generator** (formative). Re-read `syllabusGuard.ts` for the exact retained sub-topics first.
- **Re-read `scripts/src/syllabusGuard.ts` per chapter and copy the EXACT banned keywords** (never from memory; CLAUDE.md §5). Deleted/banned topics (heredity-and-evolution, magnetic-effects beyond the trimmed set, etc.) must never appear. A note's `topic_key` must match `topics.ts` (which collapses the two trig keys into one `trigonometry`).
- **Stamp hygiene:** on finishing a file, flip its first-line comment "enrichment PENDING" → "Step-1 enrichment DONE (verbatim + page-cite + source-ledger + authored-marking)".

## 6. Open / watch-outs
- **[FU-NOTES-INTEGRATION] — RESOLVED (settled, owner-approved):** notes ship as a shared React `<Note spec={…}/>` fed by a structured note-spec (`notes/specs/<topic_key>.json`), NOT standalone HTML; the tutor + PR-F consume the spec as data; Step 2 authors specs (JSON). The note-spec schema (v1.1) + `<Note>` contract are the foundation — see §3 for the gated build order (validator → content PR → PR-F + Step-2). The schema/spec/validator files are the NEXT task, specced separately — do NOT create them as part of a docs PR.
- **[FU-NOTES-MATHS-MAP]:** Maths NCERT folder not yet content-mapped.
- Archived (do NOT enrich): everything in `notes/_superseded_2026-06-21/`.
- **Worktree isolation mandatory** (CLAUDE.md §2a); confirm `git branch --show-current` before every commit. `git worktree remove` errors "Permission denied" on Windows (node_modules lock) but de-registers anyway; `rm -rf` the dir, then `git worktree prune`.
