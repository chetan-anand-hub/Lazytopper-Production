# GAPS — concepts with NO fitting existing figure (feeds Opus Stage-3 AI gap-fill lane)

Fable curation lane, 2026-07-14. These are Topic Hub `boardEssentials` concept rows
where **no existing repo asset genuinely fits** (`best.kind: "none"`, `gap: true` in
`conceptFigureCatalogue.curated.ts`), OR where only a weak/partial/interactive-only
asset exists and a simple purpose-built figure would obviously help.

Precision-over-coverage rule: a wrong figure is a wrong explanation. Nothing below was
stretched to fill a row — each is an honest "no existing figure explains this concept."
This list is a **candidate queue for AI figure generation**, NOT an authored deliverable
(Fable authors no figures). Owner + Opus decide what actually gets generated.

## HARD GAPS (best.kind = "none" — no asset at all)

| # | Topic | Concept | Why no figure fits | A simple figure that would help |
|---|-------|---------|--------------------|---------------------------------|
| 1 | circles | Length of tangent from external point ℓ = √(d²−r²) | notes c5 figure_ref null; no bank/interactive shows the d/r/ℓ right triangle | Circle, centre O, external point P, radius r to contact T, right angle at T, hypotenuse OP = d, tangent ℓ labelled |
| 2 | areas-related-to-circles | Circumference & area recap (C = 2πr, A = πr²) | no notes/interactive targets bare C=2πr / A=πr²; bank ARC images are decorative photos | Circle with radius r marked, C and A formulae annotated |
| 3 | human-eye-and-colourful-world | Lens power P = 1/f (dioptre) | no figure/interactive depicts the P=1/f computation; correction figures show geometry not the formula | Lens with focal length f → dioptre scale, P = 1/f callout |
| 4 | human-eye-and-colourful-world | Atmospheric refraction (twinkling, advance sunrise, delayed sunset) | spec c5 figure_ref null; no interactive; rainbow interactive is a different phenomenon | Sun below horizon, bent ray through graded atmosphere, apparent vs real position |
| 5 | human-eye-and-colourful-world | Scattering of light (Tyndall, blue sky, red sun) | nothing addresses scattering; rainbow interactive is dispersion (spec pitfall warns against conflating) | Sunlight → air molecules, short-λ scattered (blue sky) / long-λ transmitted (red sun) |
| 6 | carbon-and-its-compounds | Functional groups (–OH, –CHO, –COOH, >C=O, –X) | no notes/bank figure; only a keyword-heuristic concept stub | Table/panel of the five functional groups with a representative structure each |
| 7 | carbon-and-its-compounds | Reactions of ethanol & ethanoic acid | equation-based (esterification/oxidation); live in notes Reactions tab, not as an image | Esterification + oxidation reaction schemes drawn as labelled structural equations |

## SOFT GAPS (a real asset exists but is interactive-only or partial — figure would strengthen)

| Topic | Concept | Current best | Note |
|-------|---------|--------------|------|
| triangles | Basic Proportionality Theorem (BPT) | interactive only | No static figure of DE∥BC dividing sides in ratio (notes Fig 6.10 not extracted). Static BPT figure would help. |
| triangles | Areas of similar triangles ∝ (sides)² | interactive only | Also flagged OUT of 2026-27 chapter scope — confirm before generating. |
| electricity | Electrical power (P = VI = I²R = V²/R) | interactive only | No static figure; formula-only concept. |
| electricity | Joule's heating (H = I²Rt) | interactive only | A heating-element / fuse figure would help. |
| life-processes | Transport in plants (xylem vs phloem) | leaf cross-section (partial) | Leaf section shows the bundle but is not a stem/root transport schematic; a xylem-vs-phloem transport diagram would fit better. |
| control-and-coordination | Tropisms (photo/geo/hydro/chemo) | interactive + 2 static | Static figures cover only photo/geo; no hydrotropism/chemotropism figure. |

## SCOPE FLAGS (not gaps — concept vs 2026-27 syllabus tension; owner to rule)

- **coordinate-geometry — "Area of a triangle from coordinates"**: notes `board_asks` says area-of-a-triangle was REMOVED from Class-10 2026-27; boardEssentials/topics.ts/fullFormulaUseMap still cite it. Curated to the collinearity interactive, but the ROW itself may be retired. Also: **both coordinate-geometry note-spec figure assets (`fig_distance_plane`, `fig_section_divide`) are generator specs that DO NOT EXIST on disk** — not referenced in the catalogue; if the notes pipeline renders them later they become the natural best for distance/section rows.
- **areas-related-to-circles — "Area of combinations of plane figures"**: notes says combinations are OUT of the trimmed 2026-27 chapter; interactive-only, arguably retired.
- **triangles — areas of similar triangles / Pythagoras proofs**: notes says the chapter stops at SAS; application items remain in the bank.
- **magnetic-effects — "Electric Motor and Generator" interactive**: OUT of the trimmed 2026-27 chapter; matches no boardEssentials row — do not attach.

## DATA-QUALITY FLAGS surfaced during curation (not figure gaps)
- Several bank figures carry PENDING-OWNER-VERIFICATION comments in `competency.z3.ts` and were NOT proposed as primary: Z3-TG-104 (150 vs 200 m datum), Z3-ARC-004 (2954 vs 2912 cm²), Z3-SAV-005 (bore-volume factor-of-10), Z3-SAV-006 (authored, pending teacher check).
- Many ARC/SAV/CG bank "figures" are decorative context photos, not teaching diagrams (e.g. z3-arc-001/002/003/005, z3-sav-004/005/006, z3-cg-001/003/005). Only the geometry-panel variants (…-2 second figures) were used.
