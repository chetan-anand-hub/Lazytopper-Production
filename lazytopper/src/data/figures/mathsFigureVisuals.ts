// Raster source figures for MATHS questions — the array half of the id-keyed
// figure binder, split out of visualConceptRegistry.ts by BANK-1 PR-1 so the
// Maths and Science figure-binding lanes can edit figures without sharing a
// single path. visualConceptRegistry.ts imports and re-exports this array, and
// getFiguresForQuestion() still concatenates it with SCIENCE_FIGURE_VISUALS in
// the same order — the split is behaviour-neutral and was proved so by dumping
// getFiguresForQuestion for all 128 bound question ids before and after.
//
// ⛔ MOVED VERBATIM, NOT RETYPED. Every entry below is byte-identical to the one
// that lived in visualConceptRegistry.ts. A retyped figure entry is a silently
// wrong binding, and a wrong figure is worse than none.
//
// ⚠ THIS FILE IS READ AS TEXT, NOT ONLY AS A MODULE.
// scripts/ops/tutor_visual_catalogue_acceptance.mjs regex-parses the
// filePath/questionId pairs below straight out of the source. A re-export is
// invisible to a consumer that never imports — see [FU-NON-IMPORTING-CONSUMERS].
// If this file is renamed, moved, or its entry shape changes, that gate must be
// updated in the SAME commit or it silently stops seeing any figure at all.
import type { VisualConcept } from "../visualConceptRegistry";

// =============================================================================
// RASTER SOURCE FIGURES — extracted exam diagrams/tables/photos, one or more per
// question, bound by questionId (NOT keyword heuristics). These are deliberately
// kept OUT of MATHS_VISUALS/concepts so they never pollute the interactive-
// explainer keyword scoring; resolve them only via getFiguresForQuestion().
// filePath points at a committed raster under public/visuals; isInteractive:false.
// Source: Z3 Competency bank (see questionBanks/.../competency.z3.ts). The render
// surface (QuestionVisualAid) shows these as <img>, in source order.
//
// ⛔ 53 Z3 BINDINGS WERE REMOVED HERE, AND THE GAP IS DELIBERATE.
// An audit opened all 171 bindings against their questions (CFPQ-FIGURES-1). 53 Z3
// entries pointed at DECORATIVE STOCK PHOTOGRAPHS carrying none of their question's
// data — a lawnmower on a Pair-of-Linear-Equations row, a lighthouse at night on a
// trigonometry row — while every Z3 row sets `requiresDiagram: true`, i.e. declares
// the figure essential. A student was shown a photograph and asked to compute.
//
// ★ THE EVIDENCE THAT A REAL DIAGRAM IS MISSING RATHER THAN NEVER INTENDED:
// Statistics. All four of its questions carry a real frequency table, and its five
// decorative images sit BESIDE those tables. Same lane, same period, both patterns.
// So decoration was never meant to BE the figure — the working diagram is absent on
// these 53 rows. Omission, not house style.
//
// The ASSETS ARE NOT DELETED and `requiresDiagram` was NOT touched: these rows were
// already unpublishable, and unbinding turns a hidden wrong figure into a KNOWN gap.
// Re-binding is a one-line change per row once a real diagram exists.
// See [FU-Z3-DECORATIVE-PHOTOS-BOUND-AS-FIGURES].
//
// ⚠ AND WHY THIS WAS MISSED FOR SO LONG: it is ID-KEYED. An exact questionId match
// looks deliberate, so a reviewer assumes someone checked. Nobody had.
// =============================================================================
export const MATHS_FIGURE_VISUALS: VisualConcept[] = [
  { id: "maths-real-numbers-fig-z3-rn-003", title: "Source figure", chapter: "Real Numbers", subject: "maths", filePath: "/visuals/maths/real-numbers/z3-rn-003.webp", keywords: [], isInteractive: false, questionId: "Z3-RN-003" },
  { id: "maths-quadratic-equations-fig-z3-qe-006", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-006.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-006" },
  { id: "maths-quadratic-equations-fig-z3-qe-007", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-007.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-007" },
  { id: "maths-quadratic-equations-fig-z3-qe-010", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-010.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-010" },
  { id: "maths-arithmetic-progression-fig-z3-ap-010", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-010.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-010" },
  { id: "maths-triangles-fig-z3-tr-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-001.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-001" },
  { id: "maths-triangles-fig-z3-tr-006", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-006.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-006" },
  { id: "maths-triangles-fig-z3-tr-007", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-007.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-007" },
  { id: "maths-triangles-fig-z3-tr-010", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-010.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-010" },
  { id: "maths-coordinate-geometry-fig-z3-cg-002", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-002.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-002" },
  { id: "maths-coordinate-geometry-fig-z3-cg-002-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-002" },
  { id: "maths-coordinate-geometry-fig-z3-cg-004", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-004.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-004" },
  { id: "maths-coordinate-geometry-fig-z3-cg-004-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-004-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-004" },
  { id: "maths-coordinate-geometry-fig-z3-cg-006", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-006.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-006" },
  { id: "maths-coordinate-geometry-fig-z3-cg-006-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-006-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-006" },
  { id: "maths-coordinate-geometry-fig-z3-cg-007", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-007.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-007" },
  { id: "maths-coordinate-geometry-fig-z3-cg-008", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-008.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-008" },
  { id: "maths-coordinate-geometry-fig-z3-cg-008-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-008-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-008" },
  { id: "maths-coordinate-geometry-fig-z3-cg-009", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-009.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-009" },
  { id: "maths-coordinate-geometry-fig-z3-cg-010", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-010.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-010" },
  { id: "maths-trigonometry-fig-z3-tg-001", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-001.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-001" },
  { id: "maths-trigonometry-fig-z3-tg-003", title: "Source figure 1", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-003.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-003" },
  { id: "maths-trigonometry-fig-z3-tg-003-2", title: "Source figure 2", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-003-2.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-003" },
  { id: "maths-trigonometry-fig-z3-tg-004", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-004.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-004" },
  { id: "maths-trigonometry-fig-z3-tg-006", title: "Source figure 1", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-006.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-006" },
  { id: "maths-trigonometry-fig-z3-tg-006-2", title: "Source figure 2", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-006-2.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-006" },
  { id: "maths-trigonometry-fig-z3-tg-007", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-007.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-007" },
  { id: "maths-trigonometry-fig-z3-tg-010", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-010.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-010" },
  { id: "maths-trigonometry-fig-z3-tg-101", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-101.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-101" },
  { id: "maths-trigonometry-fig-z3-tg-104", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-104.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-104" },
  { id: "maths-trigonometry-fig-z3-tg-106", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-106.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-106" },
  { id: "maths-trigonometry-fig-z3-tg-109", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-109.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-109" },
  { id: "maths-trigonometry-fig-z3-tg-110", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-110.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-110" },
  { id: "maths-circles-fig-z3-ci-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/visuals/maths/circles/z3-ci-001.webp", keywords: [], isInteractive: false, questionId: "Z3-CI-001" },
  { id: "maths-areas-circles-fig-z3-arc-001", title: "Source figure 1", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-001.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-001" },
  { id: "maths-areas-circles-fig-z3-arc-001-2", title: "Source figure 2", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-001-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-001" },
  { id: "maths-areas-circles-fig-z3-arc-004", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-004.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-004" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-005", title: "Source figure 1", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-005.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-005" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-005-2", title: "Source figure 2", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-005-2.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-005" },
  { id: "maths-statistics-fig-z3-st-002", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-002.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-002" },
  { id: "maths-statistics-fig-z3-st-002-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-002" },
  { id: "maths-statistics-fig-z3-st-003", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-003.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-003" },
  { id: "maths-statistics-fig-z3-st-003-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-003-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-003" },
  { id: "maths-statistics-fig-z3-st-004", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-004.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-004" },
  { id: "maths-statistics-fig-z3-st-004-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-004-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-004" },
  { id: "maths-statistics-fig-z3-st-005", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-3", title: "Source figure 3", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-3.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-4", title: "Source figure 4", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-4.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-probability-fig-z3-pr-001", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-001.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-001" },
  { id: "maths-probability-fig-z3-pr-001-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-001-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-001" },
  { id: "maths-probability-fig-z3-pr-002", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-002.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-002" },
  { id: "maths-probability-fig-z3-pr-002-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-002" },
  { id: "maths-probability-fig-z3-pr-006", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-006.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-006" },
  { id: "maths-probability-fig-z3-pr-007", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-007.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-007" },
  { id: "maths-probability-fig-z3-pr-007-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-007-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-007" },
  { id: "maths-probability-fig-z3-pr-008", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-008.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-008" },
  { id: "maths-probability-fig-z3-pr-008-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-008-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-008" },
  { id: "maths-probability-fig-z3-pr-010", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-010.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-010" },
  { id: "maths-probability-fig-z3-pr-010-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-010-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-010" },
  // ---------------------------------------------------------------------------
  // CBSE CFPQ MATHS — figures where THE FIGURE IS THE QUESTION (CFPQ-FIGURES-1 PR-1).
  // Each row sets `requiresDiagram: true` and cannot be answered without its image;
  // until now the product showed the question and no figure. The crops were made and
  // eye-confirmed by CFPQ-MATHS-1 at 200 dpi during transcription and left unbound
  // because binding meant editing a file outside that lane's grant.
  //
  // ⚠ filePath points at `/figures/cfpq-maths/...`, NOT `/visuals/...`. The assets
  // already sit under lazytopper/public, which is the root both Vite and
  // tutor_visual_catalogue_acceptance.mjs resolve against, so nothing was copied.
  //
  // Every binding below was eye-confirmed against its question before it was written:
  // the image opened, the stem read, and every label the question names checked legible.
  // pdf pages are of CFPQ_Maths10.pdf. A wrong binding is worse than none.
  { id: "maths-real-numbers-fig-cfpq-m-realnum-005", title: "Source figure", chapter: "Real Numbers", subject: "maths", filePath: "/figures/cfpq-maths/real-numbers/CFPQ-M-REALNUM-005.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-REALNUM-005" },
  { id: "maths-polynomials-fig-cfpq-m-poly-001", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-001.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-001" },
  { id: "maths-polynomials-fig-cfpq-m-poly-002", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-002.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-002" },
  { id: "maths-polynomials-fig-cfpq-m-poly-003", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-003.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-003" },
  { id: "maths-polynomials-fig-cfpq-m-poly-005", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-005.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-005" },
  { id: "maths-polynomials-fig-cfpq-m-poly-009", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-009.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-009" },
  { id: "maths-polynomials-fig-cfpq-m-poly-015", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-015.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-015" },
  // CBSE CFPQ MATHS — REFERENCE-ONLY figures (CFPQ-FIGURES-1 PR-1, second commit).
  // ⚠ THESE THREE ROWS ARE A DIFFERENT CASE FROM THE SEVEN ABOVE and are kept apart
  // deliberately. Their content is transcribed inline in the stem, they do NOT set
  // `requiresDiagram`, and they are ALREADY PUBLISHABLE — so nothing about their
  // status can change, and none of them was ever in the figure-held set. Binding
  // them shows a student the printed figure beside the transcribed text, which is
  // strictly better than text alone, and that is the whole of the benefit.
  // Same eye-confirmation standard as the seven: a wrong binding is worse than none.
  { id: "maths-real-numbers-fig-cfpq-m-realnum-001", title: "Source figure", chapter: "Real Numbers", subject: "maths", filePath: "/figures/cfpq-maths/real-numbers/CFPQ-M-REALNUM-001.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-REALNUM-001" },
  { id: "maths-polynomials-fig-cfpq-m-poly-004", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-004.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-004" },
  { id: "maths-polynomials-fig-cfpq-m-poly-010", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/cfpq-maths/polynomials/CFPQ-M-POLY-010.webp", keywords: [], isInteractive: false, questionId: "CFPQ-M-POLY-010" },
  // ===========================================================================
  // FIG-MATHS-1 — 88 AUTHENTIC FIGURES CROPPED FROM THE SOURCE DOCUMENTS THE ROWS
  // WERE EXTRACTED FROM. No SVG was authored and nothing was drawn by hand: every
  // file under /figures/<source>-maths/ is a 200 dpi lossless WebP crop (pymupdf
  // 1.27.2.3, no OCR, no pdfplumber) of the printed figure, eye-confirmed against
  // its question before this line was written — stem read, image opened, every
  // label the question names checked legible. The trailing comment on each entry
  // records the source PDF and 1-based page so a future audit can re-open it.
  // Rows the sources print NO figure for were left unbound and are listed in the
  // FIG-MATHS-1 report, never guessed. Zero pinned counts move: isPublishable does
  // not consult this binder (PR-3 of CFPQ-FIGURES-1 is the escape).
  // ===========================================================================
  // --- CBSE / BRITISH COUNCIL ITEM BANK, MATHS CLASS 10 (Item-Bank--Maths---Class-10.pdf, Sept 2021) (49) ---
  // Each figure is the item's own 'Sources and diagrams' box, cropped at 200 dpi.
  { id: "maths-areas-related-to-circles-fig-cbe-m-arc-a-002", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/itembank-maths/areas-related-to-circles/CBE-M-ARC-A-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-ARC-A-002" }, // Item-Bank--Maths---Class-10.pdf p113
  { id: "maths-areas-related-to-circles-fig-cbe-m-arc-c-001", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/itembank-maths/areas-related-to-circles/CBE-M-ARC-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-ARC-C-001" }, // Item-Bank--Maths---Class-10.pdf p120
  { id: "maths-areas-related-to-circles-fig-cbe-m-arc-c-002", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/itembank-maths/areas-related-to-circles/CBE-M-ARC-C-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-ARC-C-002" }, // Item-Bank--Maths---Class-10.pdf p120
  { id: "maths-areas-related-to-circles-fig-cbe-m-arc-e-001", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/itembank-maths/areas-related-to-circles/CBE-M-ARC-E-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-ARC-E-001" }, // Item-Bank--Maths---Class-10.pdf p116
  { id: "maths-circles-fig-cbe-m-circ-a-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-A-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-A-001" }, // Item-Bank--Maths---Class-10.pdf p94
  { id: "maths-circles-fig-cbe-m-circ-a-002", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-A-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-A-002" }, // Item-Bank--Maths---Class-10.pdf p98
  { id: "maths-circles-fig-cbe-m-circ-b-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-B-001" }, // Item-Bank--Maths---Class-10.pdf p96
  { id: "maths-circles-fig-cbe-m-circ-b-002", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-B-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-B-002" }, // Item-Bank--Maths---Class-10.pdf p100
  { id: "maths-circles-fig-cbe-m-circ-b-003", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-B-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-B-003" }, // Item-Bank--Maths---Class-10.pdf p103
  { id: "maths-circles-fig-cbe-m-circ-c-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-C-001" }, // Item-Bank--Maths---Class-10.pdf p101
  { id: "maths-circles-fig-cbe-m-circ-c-002", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-C-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-C-002" }, // Item-Bank--Maths---Class-10.pdf p105
  { id: "maths-circles-fig-cbe-m-circ-d-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/itembank-maths/circles/CBE-M-CIRC-D-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CIRC-D-001" }, // Item-Bank--Maths---Class-10.pdf p107
  { id: "maths-coordinate-geometry-fig-cbe-m-cg-b-001", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/figures/itembank-maths/coordinate-geometry/CBE-M-CG-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CG-B-001" }, // Item-Bank--Maths---Class-10.pdf p224
  { id: "maths-coordinate-geometry-fig-cbe-m-cg-c-002", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/figures/itembank-maths/coordinate-geometry/CBE-M-CG-C-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CG-C-002" }, // Item-Bank--Maths---Class-10.pdf p224
  { id: "maths-coordinate-geometry-fig-cbe-m-cg-a-001", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/figures/itembank-maths/coordinate-geometry/CBE-M-CG-A-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CG-A-001" }, // Item-Bank--Maths---Class-10.pdf p230
  { id: "maths-coordinate-geometry-fig-cbe-m-cg-b-002", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/figures/itembank-maths/coordinate-geometry/CBE-M-CG-B-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-CG-B-002" }, // Item-Bank--Maths---Class-10.pdf p230
  { id: "maths-pair-of-linear-equations-fig-cbe-m-ple-a-001", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/figures/itembank-maths/pair-of-linear-equations/CBE-M-PLE-A-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-PLE-A-001" }, // Item-Bank--Maths---Class-10.pdf p19
  { id: "maths-probability-fig-cbe-m-prob-b-002", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/figures/itembank-maths/probability/CBE-M-PROB-B-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-PROB-B-002" }, // Item-Bank--Maths---Class-10.pdf p191
  { id: "maths-statistics-fig-cbe-m-stat-a-001", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/itembank-maths/statistics/CBE-M-STAT-A-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-STAT-A-001" }, // Item-Bank--Maths---Class-10.pdf p164
  { id: "maths-statistics-fig-cbe-m-stat-b-001", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/itembank-maths/statistics/CBE-M-STAT-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-STAT-B-001" }, // Item-Bank--Maths---Class-10.pdf p166
  { id: "maths-statistics-fig-cbe-m-stat-c-001", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/itembank-maths/statistics/CBE-M-STAT-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-STAT-C-001" }, // Item-Bank--Maths---Class-10.pdf p166
  { id: "maths-surface-areas-and-volumes-fig-cbe-m-sav-b-001", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/itembank-maths/surface-areas-and-volumes/CBE-M-SAV-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-SAV-B-001" }, // Item-Bank--Maths---Class-10.pdf p122
  { id: "maths-surface-areas-and-volumes-fig-cbe-m-sav-c-001", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/itembank-maths/surface-areas-and-volumes/CBE-M-SAV-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-SAV-C-001" }, // Item-Bank--Maths---Class-10.pdf p122
  { id: "maths-surface-areas-and-volumes-fig-cbe-m-sav-c-002", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/itembank-maths/surface-areas-and-volumes/CBE-M-SAV-C-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-SAV-C-002" }, // Item-Bank--Maths---Class-10.pdf p128
  { id: "maths-surface-areas-and-volumes-fig-cbe-m-sav-c-003", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/itembank-maths/surface-areas-and-volumes/CBE-M-SAV-C-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-SAV-C-003" }, // Item-Bank--Maths---Class-10.pdf p128
  { id: "maths-surface-areas-and-volumes-fig-cbe-m-sav-d-001", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/itembank-maths/surface-areas-and-volumes/CBE-M-SAV-D-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-SAV-D-001" }, // Item-Bank--Maths---Class-10.pdf p91
  { id: "maths-triangles-fig-cbe-m-tri-a-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-A-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-A-001" }, // Item-Bank--Maths---Class-10.pdf p67
  { id: "maths-triangles-fig-cbe-m-tri-a-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-A-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-A-002" }, // Item-Bank--Maths---Class-10.pdf p75
  { id: "maths-triangles-fig-cbe-m-tri-a-003", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-A-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-A-003" }, // Item-Bank--Maths---Class-10.pdf p84
  { id: "maths-triangles-fig-cbe-m-tri-a-004", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-A-004.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-A-004" }, // Item-Bank--Maths---Class-10.pdf p86
  { id: "maths-triangles-fig-cbe-m-tri-b-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-B-001" }, // Item-Bank--Maths---Class-10.pdf p71
  { id: "maths-triangles-fig-cbe-m-tri-b-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-B-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-B-002" }, // Item-Bank--Maths---Class-10.pdf p77
  { id: "maths-triangles-fig-cbe-m-tri-b-003", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-B-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-B-003" }, // Item-Bank--Maths---Class-10.pdf p84
  { id: "maths-triangles-fig-cbe-m-tri-b-004", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-B-004.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-B-004" }, // Item-Bank--Maths---Class-10.pdf p88
  { id: "maths-triangles-fig-cbe-m-tri-c-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-001" }, // Item-Bank--Maths---Class-10.pdf p69
  { id: "maths-triangles-fig-cbe-m-tri-c-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-002" }, // Item-Bank--Maths---Class-10.pdf p73
  { id: "maths-triangles-fig-cbe-m-tri-c-003", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-003" }, // Item-Bank--Maths---Class-10.pdf p73
  { id: "maths-triangles-fig-cbe-m-tri-c-004", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-004.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-004" }, // Item-Bank--Maths---Class-10.pdf p79
  { id: "maths-triangles-fig-cbe-m-tri-c-005", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-005.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-005" }, // Item-Bank--Maths---Class-10.pdf p79
  { id: "maths-triangles-fig-cbe-m-tri-c-006", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-006.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-006" }, // Item-Bank--Maths---Class-10.pdf p81
  { id: "maths-triangles-fig-cbe-m-tri-c-007", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/itembank-maths/triangles/CBE-M-TRI-C-007.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRI-C-007" }, // Item-Bank--Maths---Class-10.pdf p82
  { id: "maths-trigonometry-fig-cbe-m-trig-b-001", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-001" }, // Item-Bank--Maths---Class-10.pdf p197
  { id: "maths-trigonometry-fig-cbe-m-trig-b-002", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-002.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-002" }, // Item-Bank--Maths---Class-10.pdf p199
  { id: "maths-trigonometry-fig-cbe-m-trig-b-003", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-003.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-003" }, // Item-Bank--Maths---Class-10.pdf p199
  { id: "maths-trigonometry-fig-cbe-m-trig-b-005", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-005.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-005" }, // Item-Bank--Maths---Class-10.pdf p206
  { id: "maths-trigonometry-fig-cbe-m-trig-b-008", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-008.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-008" }, // Item-Bank--Maths---Class-10.pdf p221
  { id: "maths-trigonometry-fig-cbe-m-trig-b-009", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-009.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-009" }, // Item-Bank--Maths---Class-10.pdf p221
  { id: "maths-trigonometry-fig-cbe-m-trig-b-010", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-B-010.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-B-010" }, // Item-Bank--Maths---Class-10.pdf p221
  { id: "maths-trigonometry-fig-cbe-m-trig-c-001", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-C-001.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-C-001" }, // Item-Bank--Maths---Class-10.pdf p197
  { id: "maths-trigonometry-fig-cbe-m-trig-c-004", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-C-004.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-C-004" }, // Item-Bank--Maths---Class-10.pdf p215
  { id: "maths-trigonometry-fig-cbe-m-trig-c-005", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/itembank-maths/trigonometry/CBE-M-TRIG-C-005.webp", keywords: [], isInteractive: false, questionId: "CBE-M-TRIG-C-005" }, // Item-Bank--Maths---Class-10.pdf p215
  // --- CBSE ADDITIONAL PRACTICE QUESTIONS 2023-24 (Mathematics-PQ1.pdf / Mathematics-PQ_2022.pdf) (13) ---
  // Figures printed inside the question cell; the MCQ graphs print on the page after their stem.
  { id: "maths-areas-related-to-circles-fig-apq-m-arc-007", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/apq-maths/areas-related-to-circles/APQ-M-ARC-007.webp", keywords: [], isInteractive: false, questionId: "APQ-M-ARC-007" }, // Mathematics-PQ_2022.pdf p6
  { id: "maths-coordinate-geometry-fig-apq-m-cg-001", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/figures/apq-maths/coordinate-geometry/APQ-M-CG-001.webp", keywords: [], isInteractive: false, questionId: "APQ-M-CG-001" }, // Mathematics-PQ1.pdf p5
  { id: "maths-pair-of-linear-equations-fig-apq-m-ple-001", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/figures/apq-maths/pair-of-linear-equations/APQ-M-PLE-001.webp", keywords: [], isInteractive: false, questionId: "APQ-M-PLE-001" }, // Mathematics-PQ1.pdf p4
  { id: "maths-pair-of-linear-equations-fig-apq-m-ple-009", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/figures/apq-maths/pair-of-linear-equations/APQ-M-PLE-009.webp", keywords: [], isInteractive: false, questionId: "APQ-M-PLE-009" }, // Mathematics-PQ_2022.pdf p11
  { id: "maths-polynomials-fig-apq-m-poly-004", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/apq-maths/polynomials/APQ-M-POLY-004.webp", keywords: [], isInteractive: false, questionId: "APQ-M-POLY-004" }, // Mathematics-PQ1.pdf p17
  { id: "maths-statistics-fig-apq-m-stat-007", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/apq-maths/statistics/APQ-M-STAT-007.webp", keywords: [], isInteractive: false, questionId: "APQ-M-STAT-007" }, // Mathematics-PQ_2022.pdf p8
  { id: "maths-triangles-fig-apq-m-tri-008", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/apq-maths/triangles/APQ-M-TRI-008.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRI-008" }, // Mathematics-PQ1.pdf p21
  { id: "maths-triangles-fig-apq-m-tri-011", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/apq-maths/triangles/APQ-M-TRI-011.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRI-011" }, // Mathematics-PQ_2022.pdf p15
  { id: "maths-trigonometry-fig-apq-m-trig-002", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/apq-maths/trigonometry/APQ-M-TRIG-002.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRIG-002" }, // Mathematics-PQ1.pdf p9
  { id: "maths-trigonometry-fig-apq-m-trig-008", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/apq-maths/trigonometry/APQ-M-TRIG-008.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRIG-008" }, // Mathematics-PQ1.pdf p19
  { id: "maths-trigonometry-fig-apq-m-trig-011", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/apq-maths/trigonometry/APQ-M-TRIG-011.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRIG-011" }, // Mathematics-PQ_2022.pdf p5
  { id: "maths-trigonometry-fig-apq-m-trig-013", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/apq-maths/trigonometry/APQ-M-TRIG-013.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRIG-013" }, // Mathematics-PQ_2022.pdf p8
  { id: "maths-trigonometry-fig-apq-m-trig-016", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/apq-maths/trigonometry/APQ-M-TRIG-016.webp", keywords: [], isInteractive: false, questionId: "APQ-M-TRIG-016" }, // Mathematics-PQ_2022.pdf p13
  // --- PREBOARD SAMPLE PAPERS SP1/SP2 (776_STD SP1.pdf, 777_STD SP2.pdf) (4) ---
  // Only the 4 rows whose paper prints a figure; the other 7 preboard rows are text-only in the source.
  { id: "maths-areas-related-to-circles-fig-pb-m-2-arc-a-003", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/preboard-maths/areas-related-to-circles/PB-M-2-ARC-A-003.webp", keywords: [], isInteractive: false, questionId: "PB-M-2-ARC-A-003" }, // 777_STD SP2.pdf p2
  { id: "maths-circles-fig-pb-m-2-circ-c-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/preboard-maths/circles/PB-M-2-CIRC-C-001.webp", keywords: [], isInteractive: false, questionId: "PB-M-2-CIRC-C-001" }, // 777_STD SP2.pdf p4
  { id: "maths-triangles-fig-pb-m-2-tri-b-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/preboard-maths/triangles/PB-M-2-TRI-B-002.webp", keywords: [], isInteractive: false, questionId: "PB-M-2-TRI-B-002" }, // 777_STD SP2.pdf p3
  { id: "maths-trigonometry-fig-pb-m-1-trig-c-001", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/figures/preboard-maths/trigonometry/PB-M-1-TRIG-C-001.webp", keywords: [], isInteractive: false, questionId: "PB-M-1-TRIG-C-001" }, // 776_STD SP1.pdf p4
  // --- SAMPLE PAPER MATHS STANDARD 2022 (6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf) (7) ---
  // Figures printed under their stems in the question paper (never from the answer booklet).
  { id: "maths-areas-related-to-circles-fig-sp-m-2022-arc-e-001", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/sqp-maths/areas-related-to-circles/SP-M-2022-ARC-E-001.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-ARC-E-001" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p6
  { id: "maths-circles-fig-sp-m-2022-circ-b-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/sqp-maths/circles/SP-M-2022-CIRC-B-001.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-CIRC-B-001" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p4
  { id: "maths-circles-fig-sp-m-2022-circ-c-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/sqp-maths/circles/SP-M-2022-CIRC-C-001.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-CIRC-C-001" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p5
  { id: "maths-triangles-fig-sp-m-2022-tri-a-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/sqp-maths/triangles/SP-M-2022-TRI-A-002.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-TRI-A-002" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p2
  { id: "maths-triangles-fig-sp-m-2022-tri-a-003", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/sqp-maths/triangles/SP-M-2022-TRI-A-003.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-TRI-A-003" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p2
  { id: "maths-triangles-fig-sp-m-2022-tri-b-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/sqp-maths/triangles/SP-M-2022-TRI-B-001.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-TRI-B-001" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p4
  { id: "maths-triangles-fig-sp-m-2022-tri-d-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/sqp-maths/triangles/SP-M-2022-TRI-D-001.webp", keywords: [], isInteractive: false, questionId: "SP-M-2022-TRI-D-001" }, // 6386f9c507fe4_Sample_Paper_-_Math_10_(Standard)_2022.pdf p6
  // --- CBSE BOARD PAPERS 2023-2026 (the set each row cites, e.g. 30/4/3) (11) ---
  // Case-study figures cropped to the data figure only; decorative photographs excluded.
  { id: "maths-areas-related-to-circles-fig-pyq-m-2025-arc-004", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/pyq-maths/areas-related-to-circles/PYQ-M-2025-ARC-004.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2025-ARC-004" }, // 30-1-1_Mathematics Standard.pdf p25
  { id: "maths-areas-related-to-circles-fig-pyq-m-arc-005", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/pyq-maths/areas-related-to-circles/PYQ-M-ARC-005.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-ARC-005" }, // 30_2_2_Maths Standard.pdf p17
  { id: "maths-polynomials-fig-pyq-m-2026-poly-005", title: "Source figure", chapter: "Polynomials", subject: "maths", filePath: "/figures/pyq-maths/polynomials/PYQ-M-2026-POLY-005.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2026-POLY-005" }, // 1172-1_30-5-1  (Mathematics Standard).pdf p21
  { id: "maths-statistics-fig-pyq-m-2025-stat-006", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/pyq-maths/statistics/PYQ-M-2025-STAT-006.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2025-STAT-006" }, // 30-3-1_Mathematics Standard.pdf p23
  { id: "maths-statistics-fig-pyq-m-stat-006", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/pyq-maths/statistics/PYQ-M-STAT-006.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-STAT-006" }, // 30_5_1_Maths Standard.pdf p17
  { id: "maths-statistics-fig-pyq-m-stat-008", title: "Source figure", chapter: "Statistics", subject: "maths", filePath: "/figures/pyq-maths/statistics/PYQ-M-STAT-008.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-STAT-008" }, // 30_2_1_Maths Standard.pdf p17
  { id: "maths-surface-areas-and-volumes-fig-pyq-m-2024-sav-005", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/pyq-maths/surface-areas-and-volumes/PYQ-M-2024-SAV-005.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2024-SAV-005" }, // 30-5-1(Mathematics Standard).pdf p19
  { id: "maths-surface-areas-and-volumes-fig-pyq-m-2024-sav-006", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/pyq-maths/surface-areas-and-volumes/PYQ-M-2024-SAV-006.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2024-SAV-006" }, // 30-4-1(Mathematics Standard).pdf p23
  { id: "maths-surface-areas-and-volumes-fig-pyq-m-sav-004", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/figures/pyq-maths/surface-areas-and-volumes/PYQ-M-SAV-004.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-SAV-004" }, // 30_4_3 Maths Standard.pdf p11
  { id: "maths-triangles-fig-pyq-m-2024-tri-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/pyq-maths/triangles/PYQ-M-2024-TRI-001.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-2024-TRI-001" }, // 30-4-1(Mathematics Standard).pdf p7
  { id: "maths-triangles-fig-pyq-m-tri-006", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/pyq-maths/triangles/PYQ-M-TRI-006.webp", keywords: [], isInteractive: false, questionId: "PYQ-M-TRI-006" }, // 30_4_3 Maths Standard.pdf p15
  // --- NCERT CLASS 10 MATHEMATICS TEXTBOOK (rationalised 2023-24 chapter PDFs) (3) ---
  // Caption-anchored: the figure directly above its own 'Fig. N.NN' caption.
  { id: "maths-circles-fig-cir-prf-d-005", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/figures/ncert-maths/circles/CIR-PRF-D-005.webp", keywords: [], isInteractive: false, questionId: "CIR-PRF-D-005" }, // ncert-book-class-10-maths-chapter-10.pdf p9
  { id: "maths-triangles-fig-tri-n-ncert-6-sa-004", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/ncert-maths/triangles/TRI-N-NCERT-6-SA-004.webp", keywords: [], isInteractive: false, questionId: "TRI-N-NCERT-6-SA-004" }, // ncert-book-class-10-maths-chapter-6.pdf p23
  { id: "maths-triangles-fig-tri-prf-c-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/figures/ncert-maths/triangles/TRI-PRF-C-002.webp", keywords: [], isInteractive: false, questionId: "TRI-PRF-C-002" }, // ncert-book-class-10-maths-chapter-6.pdf p24
  // --- NCERT EXEMPLAR MATHEMATICS (jeep211.pdf) (1) ---
  // Fig 11.3, the square-in-circle-in-square figure beside Exercise 11.2 Q3.
  { id: "maths-areas-related-to-circles-fig-arc-n-exem2-11-vsa-002", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/figures/exemplar-maths/areas-related-to-circles/ARC-N-EXEM2-11-VSA-002.webp", keywords: [], isInteractive: false, questionId: "ARC-N-EXEM2-11-VSA-002" }, // jeep211.pdf p4
];
