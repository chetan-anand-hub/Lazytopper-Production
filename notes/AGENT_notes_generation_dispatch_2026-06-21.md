# AGENT INSTRUCTION — Notes generation (parallel track) — verbatim-NCERT discipline + tutor-grounding
**For:** a FRESH agent in its OWN git worktree (parallel to the PR-E frontend track — different files, safe). **Date:** 2026-06-20.
**Author:** Claude (cofounder). **Owner:** Chetan.
**Rev 2026-06-21:** prototype reference list folded to the canonical **v2** filenames (see `LazyTopper_NoteProtos_INDEX_2026-06-21.md`). Supersedes the 2026-06-20 dispatch.
**Read FIRST (binding):** `LazyTopper_Notes_Methodology_Handoff_2026-06-09.md` (the full methodology — structure, provenance discipline, diagram extraction) + `AGENT_notes_generation_2026-06-09.md` (the original agent brief) + the **5 canonical v2 prototypes** as STRUCTURE references — the authoritative list is in `LazyTopper_NoteProtos_INDEX_2026-06-21.md`:
  - `LazyTopper_NoteProto_Physics_Light_v2_2026-06-21.html` (carries the real NCERT Fig 9.7b mirror + 9.10 slab)
  - `LazyTopper_NoteProto_Physics_Electricity_v2_2026-06-21.html`
  - `LazyTopper_NoteProto_Chemistry_ChemicalReactions_v2_2026-06-21.html`
  - `LazyTopper_NoteProto_Biology_LifeProcesses_v2_2026-06-21.html` (carries the real NCERT canal/heart/nephron figures)
  - `LazyTopper_NoteProto_Maths_QuadraticEquations_v2_2026-06-21.html`
  **Use ONLY these v2 files.** The old `light_note_FINAL.html`, `quadratics_note_FINAL.html`, and `*_2026-06-09` names are SUPERSEDED (the INDEX maps old→new). Do NOT enrich the old authored-SVG Light or the paraphrase copies.
**This instruction ADDS the discipline the prototypes predate** (the methodology doc's §A.2/§E.2 flag it) + the new tutor-grounding requirement.

## ⚠️ WORKTREE ISOLATION (mandatory)
```
git fetch origin
git worktree add C:/Projects/LT-worktrees/notes-gen -b feat/notes-generation origin/base/approved-thru-437
cd C:/Projects/LT-worktrees/notes-gen
```
Before stage/commit: `git branch --show-current` MUST = `feat/notes-generation`; ABORT if not. This runs PARALLEL to the PR-E frontend track — different files, no collision, but stay in your own worktree.

## ★ NCERT SOURCE (owner-supplied path)
The NCERT Class 10 textbook PDFs (Reprint 2026-27) are at:
`C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\ncert books`
Extract ALL definitions/figures/examples from THESE real PDFs. PyMuPDF (`import fitz`) only — pdfplumber is RETIRED (produces `(cid:NNNN)` on CBSE subset fonts). The 2026-27 reprint carries a diagonal "© NCERT / not to be republished" watermark requiring cleanup (luminance thresholding for line art; saturation-aware for colour biological figures; `refill_rect` to restore grey fills) — per the methodology §A.4.

## ★ THE NEW HARD REQUIREMENT — VERBATIM NCERT DEFINITIONS (this is why this instruction exists)
The prototypes used FAITHFUL PARAPHRASES, not verbatim text (methodology §A.2 admits this). That is now INSUFFICIENT, for two reasons:
1. **CBSE rewards the EXACT NCERT wording** for one-mark definitions — a student who memorizes a paraphrase loses marks.
2. **★ These notes are the TUTOR's knowledge source.** The LazyTopper tutor (in design now) will be GROUNDED in these notes — it pulls the verbatim NCERT definition, leads with it, and tells the student "memorize this exact wording." If the note carries a paraphrase, the tutor would teach the wrong thing. So verbatim definitions are not just student-facing — they are TUTOR INFRASTRUCTURE.

**Requirement:** for every definition-bearing concept, the note must include the **VERBATIM NCERT definition** — quoted exactly, with a **page citation** — clearly marked as "the exact wording CBSE wants — memorise this." The friendly 15-year-old-level explanation comes AFTER, as a separate element ("here's what that means..."). NEVER present a paraphrase as the NCERT definition. If the exact NCERT text for a concept can't be located, FLAG it (honest gap) rather than substitute a paraphrase-as-verbatim.

## CARRY-FORWARD DISCIPLINE (from the methodology — enforce, don't relax)
- **Source ledger + page citations:** every extracted definition/figure/example carries its NCERT page cite. (The prototypes lacked this — §A.2/§E.2. Add it.)
- **Anti-fabrication ABSOLUTE:** real NCERT definitions/figures/examples only. AI-authored pedagogical scaffolding (Big Idea, "where tested" pills, strategies, pitfalls, mind-map) is allowed BUT must be marked as authored, never presented as NCERT fact. Honest empty/flag beats fabrication.
- **★ SyllabusGuard FIRST:** before generating ANY note, re-read `scripts/src/syllabusGuard.ts` and copy the EXACT banned keywords. NEVER generate a note for a deleted/banned topic (e.g. heredity-and-evolution, magnetic-effects/EMI formative, periodic classification, sources of energy, etc. — but read the file, don't trust this list). topicKey must match `topics.ts` exactly (kebab-case).
- **Diagram sourcing (3 buckets, per methodology §A.4):** ray diagrams + complex/biological figures → NCERT extraction (rasterize page → tight per-figure crop, confirmed by eye — no reliable auto-crop); simple labelled schematics → authored SVG; data-plottable graphs → generated SVG. Keep NCERT labels intact (no relabeling). Honest-substitution pattern if a gestured figure doesn't exist in NCERT (use a real adjacent figure, re-caption accurately).
- **The note structure (the fixed spine):** follow the prototypes' template — Note / Mindmap / [subject-adaptive third tab: Maths→Proof, Physics→Rules/Derivations, Chemistry→Reactions, Biology→Diagrams]. PDF/print via `window.print()` + print stylesheet.

## ★ ADD THE "WHERE STUDENTS LOSE MARKS" LAYER (consistency with worksheet answer keys)
Where the prototypes have a "pitfalls" element, ensure it carries REAL common CBSE mistakes for that concept (sign errors, missing units, unconcluded proofs, wrong exact-wording) — anti-fabrication strict: a real pitfall or none, never an invented plausible-sounding one. (This matches the worksheet answer-key §11.1 discipline — same teacher's-edge layer.)

## SCOPE / SEQUENCING
- **STEP 1 — enrich the 5 canonical v2 prototypes** (the `LazyTopper_NoteProto_*_v2_2026-06-21.html` set; see the INDEX) to the verbatim-definition + page-cite + source-ledger standard FIRST. These become the REFERENCE EXEMPLARS for the rest. (Owner-agreed back-fill.) **Enrich the v2 figure-bearing bases, NOT the superseded `*_FINAL`/`06-09` files** — the Light exemplar regressed once by enriching `light_note_FINAL.html` (authored SVG) instead of the NCERT-figure base, silently dropping the real figures.
- **STEP 2 — generate the remaining ~35 topics** to that same standard, using `lazytopper_notes_kit.py` + the methodology. Batch them (e.g. by subject) for owner review — do NOT dump 35 at once.
- Output format matches the prototypes (HTML notes + any data spec the kit produces). Where these notes get wired into the product (Topic Hub Notes containers, PR-F) is a SEPARATE frontend task — this track GENERATES the content; it does not wire the UI.

## ANTI-OVER-PARALLELISM NOTE
This is a CONTENT track (no live round-trip), so it's the most parallel-safe — but it produces a lot for owner review. Batch by subject; stop for owner review per batch; don't generate all 35 before any review. Quality (verbatim accuracy) > speed.

## GATES / REVIEW
- No code gates (content), but: confirm syllabusGuard re-read + banned topics excluded; confirm every definition is verbatim + page-cited (spot-checkable against the NCERT PDF); confirm no fabricated definitions/figures/pitfalls; confirm diagrams are real-NCERT or honestly-authored-and-marked.
- Owner reviews each batch for NCERT-accuracy (the owner is a teacher — he verifies the definitions match the book).
- Docs/content may be committed per the methodology's handling, but FLAG anything that touches `src/` or product wiring (that's PR-F, not this track).

## STOP FOR OWNER
Per batch: present the enriched/generated notes for owner NCERT-accuracy review. Do NOT mass-generate without review. The verbatim definitions especially need owner eyes (they become tutor infrastructure — wrong wording propagates to the tutor).
