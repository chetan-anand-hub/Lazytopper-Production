# HANDOFF — Notes-generation track (2026-06-21)

**For:** the fresh agent (full context) that continues this track · **Owner:** Chetan
**Branch / worktree:** `feat/notes-generation` (off trunk `883e904`) · worktree `C:/Projects/LT-worktrees/notes-gen`
**Binding rulings (read first):** `AGENT_message_all_flags_2026-06-21.md` (owner's rulings on every flag) + `LazyTopper_Light_CiteMap_2026-06-21.md` (Light edition cite-map). These override the older briefs where they differ.

---

## 1. What this track is
Generate Class-10 CBSE chapter notes from the **official NCERT 2026-27 PDFs**, in the locked LazyTopper note grammar, with **verbatim-NCERT-definition discipline** (these notes are tutor infrastructure — the tutor leads with the exact NCERT wording). Content track, parallel to the PR-E frontend track. **Never self-merge content; stop for owner review per note.**

## 2. DONE — Light = the finished reference exemplar
`light_note_ENRICHED_v2_2026-06-21.html` (in `…\diff\`) is **complete**:
- 6 verbatim NCERT definition cards + 8-term key-terms cluster (all quotes verified char-for-char), each marked "📖 memorise" with page cite + a separate plain-English line.
- 4 **real NCERT** worked examples (Example 9.2 p.144, Example 9.4 p.156, in-text Q2 p.150, in-text Q3 p.158) — verbatim problem + NCERT's own solution.
- 3 **real NCERT figures**: Fig 9.7(b) concave mirror (concept 1), Fig 9.10 glass slab (concept 4), **Fig 9.9 New Cartesian Sign Convention** (Rules tab, above the rule cards).
- AUTHORED-vs-NCERT legend; every scaffolding section tagged AUTHORED; full source ledger.
- **Cites reconciled to NCERT Reprint 2026-27 (Ch 9)**, verified directly against `jesc109.pdf` (not hand-transcribed). Two cite-map estimates corrected on direct check: principal focus = **p.136** (not p.139), refractive-index in-text Q = **p.150** (not p.149).
- Stamp flipped to "Step-1 enrichment DONE … cites reconciled to 2026-27".

**Use Light as the template for the standard** (structure, provenance tags, ledger, edition stamp).

## 3. Canonical file set (all in `…\diff\`)
- `lazytopper_notes_kit.py` — locked renderer + figure toolkit (`ncert_figure`/`clean_watermark`/`refill_rect`). **Verified running**: `python lazytopper_notes_kit.py` → regenerates ELEC+CHEM into `out/` with the Download-PDF button.
- 5 v2 prototypes `LazyTopper_NoteProto_*_v2_2026-06-21.html` (Light, Electricity, Chemical Reactions, Life Processes, Quadratics). **Enrich the v2 figure-bearing bases, never `_FINAL`/`_06-09` copies** (archived in `_superseded_2026-06-21/`). Life Processes carries **3** real NCERT figures — don't drop them.
- `LazyTopper_NoteProtos_INDEX_2026-06-21.md` (canonical record), 06-21 dispatch + v2 brief, the cite-map, the agent-message rulings.
- Reports: `report-notes-light-enrichment-v2-2026-06-21.md`, this handoff.

## 4. Toolchain / environment (READY)
- Python: PyMuPDF 1.27.2.3, ftfy, numpy 2.4.6, PIL 12.2.0 — all installed.
- **Official 2026-27 NCERT books:** `C:\Users\Chetan\OneDrive\Desktop\NCERT Books\` → `Mathematics class 10\` and `Science class 10\` (note: folder names differ from the message's `\maths\`/`\science\`). The science chapters are bundled in `jesc1dd.zip`; I extracted them to `Science class 10\_unzipped\` (jesc101…jesc113 + answers `jesc1an` + prelims `jesc1ps`). **Map files by CONTENT, never filename.** Verified-by-content map of the extracted science chapters:
  | file | chapter |
  |---|---|
  | jesc101 | Chemical Reactions & Equations (Ch 1) |
  | jesc102 | Acids, Bases and Salts (Ch 2) |
  | jesc103 | Metals and Non-metals (Ch 3) |
  | jesc104 | **Carbon and its Compounds (Ch 4)** — gap now closed |
  | jesc105 | Life Processes (Ch 5) |
  | jesc106 | Control and Coordination (Ch 6) |
  | jesc107 | How do Organisms Reproduce? (Ch 7) |
  | jesc108 | Heredity (Ch 8) |
  | jesc109 | **Light – Reflection and Refraction (Ch 9)** |
  | jesc110 | The Human Eye & the Colourful World (Ch 10) |
  | jesc111 | Electricity (Ch 11) |
  | jesc112 | Magnetic Effects of Electric Current (Ch 12) |
  | jesc113 | Our Environment (Ch 13) |
  - `Rationalised (1).pdf` = NCERT's official removed-content note; cross-check scope against it AND `scripts/src/syllabusGuard.ts` (repo stays authoritative; flag any disagreement). Maths chapters are in `Mathematics class 10\` (not yet unzipped/mapped — do that when you reach Maths).

## 5. NEXT (for the fresh agent)
1. Enrich the other four v2 prototypes to the Light standard, **one at a time, STOP for owner review per note**:
   **Electricity** (jesc111, Ch 11) · **Chemical Reactions** (jesc101, Ch 1) · **Life Processes** (jesc105, Ch 5, keep its 3 figures) · **Quadratic Equations** (Maths). Enrich the figure-bearing v2 base; preserve figures.
2. Then **Step 2** — the ~35 remaining topics via the kit (`ncert_figure` for Bucket-A figures; eye-confirm every crop: rasterize → look at PNG → pick box → look at crop → adjust). Batch by subject, stop for owner review per batch.

## 6. Standing rulings to apply to EVERY note (from the agent-message)
- **Cite against the official 2026-27 PDFs**; stamp "NCERT Reprint 2026-27, Class 10 [Science|Maths], Ch N" in every ledger. Re-cite directly from the file (don't trust transcription).
- **Show the real NCERT figure** when a "rigorous core" tab states a convention NCERT illustrates (owner override of the authored-SVG bucket — e.g. the sign-convention figure).
- **Magnetic Effects of Electric Current = GENERATE, trimmed**: magnetic field, field lines, field due to current-carrying conductor/solenoid, right-hand rule, force on a conductor. **Exclude Motor / EMI / Generator** (formative). Re-read `syllabusGuard.ts` for exact retained sub-topics first.
- **Stamp hygiene:** when you finish enriching a file, flip its first-line comment "enrichment PENDING" → "Step-1 enrichment DONE (verbatim + page-cite + source-ledger + authored-marking)".
- Verbatim accuracy + correct-edition cites + eye-confirmed figures **over speed**. Real pitfalls only. Honest empty/flag beats fabrication. Re-read `syllabusGuard.ts` per chapter; `topic_key` must match `topics.ts`.

## 7. Reconciliation method (reusable — how Light's cites were fixed)
For any note whose cites came from a non-2026-27 source: extract the official chapter PDF per-page text (PyMuPDF), substring-search each verbatim quote to get its printed page, pin example numbers by the label immediately preceding the problem text, then swap cites with an asserted script (exact-count replacements + regex for prose blocks). See `report-notes-light-enrichment-v2-2026-06-21.md`. Light's source text was already 2026-27-stable, so only chapter/example/page numbers changed.

## 8. Open / watch-outs
- Maths chapters in `Mathematics class 10\` not yet content-mapped.
- `topics.ts` collapses intro-trig + applications into one `trigonometry` topic (repo wins over the brief's two trig keys).
- Archived (do not enrich): everything in `_superseded_2026-06-21/`.
