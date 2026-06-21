# Report — Notes track, STEP 1 exemplar #1: Light (re-pointed onto v2 base)

**Date:** 2026-06-21 · **Track:** notes-generation (parallel content track)
**Branch / worktree:** `feat/notes-generation` @ `883e904` · `C:/Projects/LT-worktrees/notes-gen`
**Deliverable:** `…\diff\light_note_ENRICHED_v2_2026-06-21.html`
**Built on:** `LazyTopper_NoteProto_Physics_Light_v2_2026-06-21.html` (the canonical v2 figure-bearing base — preserved, untouched)
**Supersedes:** `light_note_ENRICHED_2026-06-21.html` (my first pass, built on the wrong `_FINAL` base — now archived in `_superseded_2026-06-21/`)
**Status:** STOP for owner NCERT-accuracy review (no self-merge; nothing committed).

---

## The regression that was fixed
My first enrichment was built on `light_note_FINAL.html` — the authored-SVG base with **no NCERT figures**. The canonical base is the **v2** file, which carries the real **NCERT Fig 9.7(b) concave mirror** and **Fig 9.10 glass slab** extractions. I re-pointed the entire enrichment onto the v2 base; **both NCERT figures are preserved** (validated: 2 base64 images intact). Going forward I enrich only the v2 figure-bearing bases.

## What the exemplar establishes (unchanged from the first pass, now on the right base)
- **Paraphrased definitions → verbatim.** 6 verbatim NCERT definition cards + 8-term key-terms cluster, each with a "📖 memorise this exact wording" badge, page cite, and a *separate* plain-English line.
- **Invented numericals → real NCERT.** 4 real NCERT items (Example 10.2 p.170–171, Example 10.4 p.182–183, in-text Q2 p.176, in-text Q3 p.184) — verbatim problem + NCERT's own solution + cite.
- AUTHORED-vs-NCERT legend; every scaffolding section tagged `AUTHORED`; full **Source Ledger** (now including both real figures + the edition split); concepts 1 & 4 figures left intact.

## Verification (automated)
- 16/16 quotes verified char-for-char vs the source PDF (prior pass); structure 10/10 sections balanced; 6 def cards; KaTeX `$` even; **2 NCERT base64 figures preserved**; Download-PDF button intact; zero fabricated content; `drawRay` is harmless dead code (not called on load).
- Syllabus: re-read `syllabusGuard.ts` — Light has no banned sub-topics; key matches `topics.ts`.

## Environment / Step-2 readiness (now complete)
- `pip install pymupdf numpy pillow` done → **PyMuPDF 1.27.2.3, numpy 2.4.6, PIL 12.2.0**.
- **Kit verified:** `python lazytopper_notes_kit.py` regenerates `out/electricity_KIT.html` + `out/chemical_reactions_KIT.html` with the Download-PDF button. The locked renderer + figure toolkit (`ncert_figure`/`clean_watermark`/`refill_rect`) is wired and ready for Step 2.
- Housekeeping: 11 superseded files archived to `…\diff\_superseded_2026-06-21\` (old prototypes, old 06-20 briefs, my first-pass enrichment). Canonical set left in `diff/`.

## ⚑ Flags for owner
1. **Edition split (figures vs text).** Verbatim text + page cites are from the **2022-23** chapter-10 PDF (Light = Ch 10, pp.160–186); the v2 figures are labelled **Fig 9.7(b) / Fig 9.10** (rationalised Ch 9 edition). Content is edition-stable so the quotes hold, but figure numbers and text page-cites are from different reprints. Noted in the in-note ledger; you're sourcing the 2026-27 reprints to reconcile.
2. **Figures inherited, not re-verified this pass** — they came with the v2 base. With the kit now running, Step-2 can re-extract with eye-confirmed crops + recorded crop boxes if you want them re-certified.
3. **Carbon (chapter-4) PDF still genuinely absent** — you're sourcing it before Chemistry in Step 2.
4. **`magnetic-effects` doctrine conflict** still open (generate trimmed vs skip).
5. **Eye-confirm capability for Step-2 figures:** I can rasterize NCERT pages to PNG via the kit; I can read those PNGs back to inspect crops (the rasterize→look→crop→look loop the kit requires). Confirmed feasible.
6. Three older note drafts (`light_note_prototype.html`, `quadratics_note_prototype.html`, `quadratics_note_prototype_v2.html`) were NOT in the index's superseded table, so I left them — say if you want them archived.

## VERDICT: PASS-WITH-FOLLOW-UP — Light v2 exemplar ready; awaiting owner sign-off on the standard before enriching the other 4 v2 prototypes (Electricity, Chemical Reactions, Life Processes, Quadratics) or starting Step 2.
