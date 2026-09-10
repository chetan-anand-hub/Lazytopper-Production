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
];
