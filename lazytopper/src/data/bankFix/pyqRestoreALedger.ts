// lazytopper/src/data/bankFix/pyqRestoreALedger.ts
//
// PYQ-RESTORE-A (2026-10-22) - the provenance ledger for withheld CBSE board PYQ rows repaired FROM THE ROW ITSELF and served
// again (class A of the controller's 216-row audit at trunk 49e82c5e), and for 2023-2025 PYQ rows re-filed to their true chapter.
//
// OWNER APPROVAL (22 Oct 2026, 23:15 IST): PYQ-RESTORE-A approved; this lane may edit question data under src/data/
// (questionBanks/class10/**, the withheld list, bankFix ledgers).
//
// CLASS A (this lane). A row is A when everything needed to repair it is already in the row: a symbol, exponent, fraction bar,
// degree/angle sign, ∥, △, π, Ω or table dash lost at PDF extraction that the row's own scheme working, key or options fix
// uniquely; merged or residue-laden steps; a "See marking scheme" placeholder whose stem is clean and whose answer is standard
// NCERT 2026-27 content. Rows that need the official paper to recover WORDING (a blank expression, a garbled option set, a
// stem with words dropped) are class B (PYQ-RESTORE-B) and stay withheld here; duplicates, bilingual copies and out-of-syllabus
// rows are class C and stay withheld.
//
// METHOD (every restored row).
//   1. Repair: the stem is restored to the official wording with only the lost glyphs put back (mark digits and page residue
//      dropped); MCQ options are restored glyph-for-glyph; `answer` / `finalAnswer` are rewritten clean; `solutionSteps` carry
//      "[N mark]" prefixes that sum to `marks`, at the CLAUDE.md §13 minimums (A 1 step, B 2, C 3, D 5, E 4). Where the
//      steps came from the official scheme they are kept; otherwise the marks are this lane's CBSE-style split (`stepMarks`).
//      OR rows answer both alternatives (the OR alternative in brackets in the last step).
//   2. Blind re-solve: each row was solved from the RESTORED STEM ALONE before the stored key was read, then compared
//      (`resolve`). A mismatch would keep the row withheld; none occurred among the rows listed as restored.
//   3. Syllabus: the row's content was checked against src/config/syllabus2026-27.ts and scripts/src/syllabusGuard.ts
//      (`syllabus`): no banned sub-topic label; no Pythagoras / converse / area-of-similar-triangles content (owner ruling 1);
//      irrationality proofs only for √2, √3, √5, a named prime, or √6 as a given surd (owner ruling R1).
// Row ids are never changed (Mistake Intelligence history keys on them).

export interface PyqRestoreAEntry {
  id: string;
  /** The row's file under src/data/questionBanks/class10/. */
  file: string;
  /** The row's paper reference (its `ncertRef`). */
  ref: string;
  verdict: "restored" | "refiled";
  /** `topicKey` before / after this lane (equal unless re-filed). */
  chapterBefore: string;
  chapterAfter: string;
  /** Why the row was withheld (the reason on its WITHHELD_QUESTION_IDS line), or why it was mis-filed. */
  before: string;
  /** What this lane changed. */
  fix: string;
  /** Fields this lane changed on the row. */
  fields: readonly string[];
  /** Blind re-solve from the restored stem, compared with the stored key. */
  resolve: string;
  /** The 2026-27 syllabus check. */
  syllabus: string;
}

export const PYQ_RESTORE_A_MATHS: readonly PyqRestoreAEntry[] = [
  { id: "PYQ-M-RN-004", file: "maths/real-numbers.pyq.ts", ref: "PYQ 30/2/2 Q25", verdict: "restored", chapterBefore: "real-numbers", chapterAfter: "real-numbers", before: "garbled-extraction: exponent lost (4n for 4^n)", fix: "4n -> 4ⁿ and 22n -> 2²ⁿ in stem/answer; scheme steps merged into 2 marked steps", fields: ["questionText", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: 4ⁿ = 2²ⁿ has no prime factor 5, so it never ends in 0 (FTA)", syllabus: "IN: Fundamental Theorem of Arithmetic applied (Real Numbers, syllabus2026-27.ts)" },
  { id: "PYQ-M-2026-REALNUM-005", file: "maths/real-numbers.pyq2026.ts", ref: "PYQ 30(B) Q26", verdict: "restored", chapterBefore: "real-numbers", chapterAfter: "real-numbers", before: "garbled-extraction: fraction bar lost (2 + 3√5 7)", fix: "fraction restored: (2 + 3√5)/7 in stem and working; 3 marked steps", fields: ["questionText", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: (2 + 3√5)/7 = p/q gives √5 = (7p − 2q)/(3q), contradiction", syllabus: "IN: expression built on √5 (Real Numbers, syllabus2026-27.ts)" },
  { id: "PYQ-M-QE-004", file: "maths/quadratic-equations.pyq.ts", ref: "PYQ 30/5/3 Q10", verdict: "restored", chapterBefore: "quadratic-equations", chapterAfter: "quadratic-equations", before: "garbled-extraction: exponents flattened (x2 for x^2) in the options", fix: "x2 -> x² in the four options and key", fields: ["options", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: sum 6, product 7 ⇒ x² − 6x + 7 = 0, option (a)", syllabus: "IN: quadratic from roots (QE, syllabus2026-27.ts)" },
  { id: "PYQ-M-QE-008", file: "maths/quadratic-equations.pyq.ts", ref: "PYQ 30/4/3 Q26", verdict: "restored", chapterBefore: "quadratic-equations", chapterAfter: "quadratic-equations", before: "garbled-extraction: exponent flattened (px2)", fix: "px2 -> px², α2 -> α²; steps marked 0.5 + 1 + 0.5 + 1", fields: ["questionText", "answer", "solutionSteps"], resolve: "agree: α = 2/p and 6α² = 8/p ⇒ p = 3", syllabus: "IN: relation between roots and coefficients (QE, syllabus2026-27.ts)" },
  { id: "PYQ-M-AP-007", file: "maths/arithmetic-progression.pyq.ts", ref: "PYQ 30/2/1 Q32", verdict: "restored", chapterBefore: "arithmetic-progression", chapterAfter: "arithmetic-progression", before: "garbled: pua (the `answer` carried private-use glyphs and scheme tallies; stem and steps were clean)", fix: "`answer` rewritten clean from the row's own steps", fields: ["answer"], resolve: "agree: n² − 16n + 60 = 0 ⇒ n = 6 or 10 (7th-10th terms sum to 0)", syllabus: "IN: sum of n terms (AP, syllabus2026-27.ts)" },
  { id: "PYQ-M-2026-TRI-003", file: "maths/triangles.pyq2026.ts", ref: "PYQ 30/4/1 Q22", verdict: "restored", chapterBefore: "triangles", chapterAfter: "triangles", before: "garbled-extraction: triangle/angle/product symbols lost", fix: "△, ∠, ² and × restored; AA similarity proof in 2 marked steps", fields: ["questionText", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: △ADC ~ △BAC (AA) ⇒ CD/CA = CA/CB ⇒ CA² = CB × CD", syllabus: "IN: applying the AA criterion in a proof (Triangles, syllabus2026-27.ts); no Pythagoras, no area theorem" },
  { id: "PYQ-M-2025-POLY-002", file: "maths/polynomials.pyq2025.ts", ref: "PYQ 30/1/2 Q21", verdict: "restored", chapterBefore: "polynomials", chapterAfter: "polynomials", before: "garbled-extraction: exponents flattened (12a2 = 49b ambiguous)", fix: "x² / 12a² / α² restored; 2 marked steps", fields: ["questionText", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: 7α = −a, 12α² = b ⇒ 12a² = 49b", syllabus: "IN: quadratic zero-coefficient relation (Polynomials, syllabus2026-27.ts)" },
  { id: "PYQ-M-TRIG-010", file: "maths/trigonometry.pyq.ts", ref: "PYQ 30/5/2 Q34", verdict: "restored", chapterBefore: "trigonometry", chapterAfter: "trigonometry", before: "garbled-extraction: degree signs lost", fix: "60° and 30° restored in the stem (steps already marked)", fields: ["questionText"], resolve: "agree: x = 5√3 m, H = 15 m, P to top = 10√3 m", syllabus: "IN: heights and distances, 30°/60° (Trigonometry, syllabus2026-27.ts)" },
  { id: "PYQ-M-2024-TRIG-011a", file: "maths/trigonometry.pyq2024.ts", ref: "PYQ 30/4/2 Q21(a)", verdict: "restored", chapterBefore: "trigonometry", chapterAfter: "trigonometry", before: "garbled - evaluate expression token order destroyed", fix: "expression rebuilt from the scheme substitution; answer completed (67/12); 2 marked steps", fields: ["questionText", "answer", "solutionSteps", "finalAnswer"], resolve: "agree: 67/12", syllabus: "IN: standard values (Trigonometry, syllabus2026-27.ts)" },
  { id: "PYQ-M-2025-TRIG-005", file: "maths/trigonometry.pyq2025.ts", ref: "PYQ 30/3/1 Q37", verdict: "restored", chapterBefore: "trigonometry", chapterAfter: "trigonometry", before: "garbled-extraction: degree/angle signs lost, marks digits inline", fix: "30°, 45°, ∠PBA, ∠QBA restored, inline mark digits dropped; step (ii) reason corrected (90° − depression angle)", fields: ["questionText", "solutionSteps"], resolve: "agree: AQ = 50 m; ∠PBA = 60°, ∠QBA = 45°; PQ = 50(√3 − 1) m; OR 0.3 km/h", syllabus: "IN: heights and distances, 30°/45° (Trigonometry, syllabus2026-27.ts)" },
  { id: "PYQ-M-STAT-009", file: "maths/statistics.pyq.ts", ref: "PYQ 30/2/3 Q32", verdict: "restored", chapterBefore: "statistics", chapterAfter: "statistics", before: "garbled-extraction: class-interval dashes lost; wording broken", fix: "table rewritten with class dashes; 'Find the missing frequencies a and b' (the two unknowns of the table)", fields: ["questionText"], resolve: "agree: a = 5, b = 8", syllabus: "IN: mode of grouped data (Statistics, syllabus2026-27.ts)" },
  { id: "PYQ-M-2025-SAV-005", file: "maths/surface-areas-and-volumes.pyq2025.ts", ref: "PYQ 30/3/3 Q32", verdict: "restored", chapterBefore: "surface-areas-and-volumes", chapterAfter: "surface-areas-and-volumes", before: "garbled-extraction: pi symbol dropped (Take = 3.14)", fix: "π restored (Take π = 3·14)", fields: ["questionText"], resolve: "agree: V = 8π = 25.12 cm³; SA = 4π(2 + √2) ≈ 42.88 cm²", syllabus: "IN: combination of two solids (SAV, syllabus2026-27.ts); no frustum, no conversion" },
  { id: "PYQ-M-2025-STAT-003", file: "maths/statistics.pyq2025.ts", ref: "PYQ 30/1/3 Q34", verdict: "restored", chapterBefore: "statistics", chapterAfter: "statistics", before: "garbled-extraction: class-interval dashes lost in the table", fix: "table rewritten with class dashes", fields: ["questionText"], resolve: "agree: median = 144.5 + (3/12) × 9 = 146.75 mm", syllabus: "IN: median of grouped data (Statistics, syllabus2026-27.ts); no ogive" },
  { id: "PYQ-M-2025-STAT-006", file: "maths/statistics.pyq2025.ts", ref: "PYQ 30/3/1 Q38", verdict: "restored", chapterBefore: "statistics", chapterAfter: "statistics", before: "garbled-extraction: class-interval dashes lost in the table", fix: "table rewritten with class dashes and checked cell by cell against the bound official figure; inline mark digits dropped", fields: ["questionText"], resolve: "agree: modal class 600-800; median 5200/7 ≈ 742.9 mm; mean 775 mm; 10 subdivisions", syllabus: "IN: mean/median/mode of grouped data (Statistics, syllabus2026-27.ts)" },
];

/**
 * Rows this lane had repaired that PYQ-RESTORE-B (#1300, merged 10223b90) re-read from the OFFICIAL paper first. B's text wins
 * (owner/controller rule: on an overlap the paper-checked version stands); this lane neither re-edits nor duplicates them.
 * Kept-withheld rows that B served (2025-CG-003, 2025-REALNUM-003, 2025-TRIG-001, 2025-QE-001, 2024-REALNUM-004, CIRC-004,
 * QE-001, CG-002, TRI-001, 2026-TRI-005 - the class-B rows this lane left for the paper) are B's and leave the kept list below.
 */
export const PYQ_RESTORE_A_SUPERSEDED_BY_B: readonly string[] = ["PYQ-M-2024-REALNUM-005b", "PYQ-M-POLY-001", "PYQ-M-PLE-003", "PYQ-M-2026-QE-001", "PYQ-M-2025-POLY-003", "PYQ-M-TRIG-002", "PYQ-M-TRIG-003", "PYQ-M-TRIG-006", "PYQ-M-2024-TRIG-012", "PYQ-M-2025-STAT-004", "PYQ-M-2025-STAT-005"];

/** Rows of the 216 the audit called A (or borderline) that this lane kept withheld, with the reason. */
export const PYQ_RESTORE_A_MATHS_KEPT: Readonly<Record<string, string>> = {
  "PYQ-M-TRIG-007": "C: duplicate of PYQ-M-TRIG-006 (same question, set 30/4/2) with section residue",
  "PYQ-M-AP-003": "C: Hindi residue in (B); duplicate of the clean PYQ-M-AP-002",
  // re-derivation (resumed lane, 23 Oct): the other placeholder / garbled-option Maths rows, judged from the row
  "PYQ-M-STAT-007": "B: placeholder solution AND the stem's table has 6 classes but only 5 frequencies; the lost frequency is not in the row",
  "PYQ-M-CIRC-011": "B: placeholder solution; whether R lies on the major or minor arc (∠PRQ = 55° or 125°) is fixed only by the figure",
  "PYQ-M-2026-CIRC-003": "B: spliced probability solution; the radius '2 21 cm' cannot be read without the paper (21, 2√21 ...)",
};

export const PYQ_RESTORE_A_COUNTS = { mathsRestored: 14 } as const;
