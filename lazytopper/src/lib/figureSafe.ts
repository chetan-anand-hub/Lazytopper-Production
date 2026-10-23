// src/lib/figureSafe.ts
//
// FIGURES-ALL-SURFACES-1 PR-1 (cofounder decision 40a.3, issue #973).
//
// A question whose stem needs a SUPPLIED figure, and which has no figure bound to
// its id, cannot be answered by a student: "in the figure shown" with no figure on
// the page is a broken question. Worksheet, Chapter Test and Full Mock exclude such
// rows from their pools through this ONE predicate.
//
// This is Rule 5 of `scripts/seo/publishability.ts` and NOTHING ELSE. It reuses that
// file's exported pieces (`demandsSuppliedFigure`, `defaultHasBoundFigure`) so the
// definition of "demands a figure" and of "bound" can never drift between the SEO
// pages and the paper surfaces. The other publishability rules (provenance, step
// marks, step sums) are deliberately NOT applied here.

import {
  defaultHasBoundFigure,
  demandsFigureForRow,
} from "../../scripts/seo/publishability";

/**
 * D47c (2026-10-10, cofounder): REVIEWED FALSE POSITIVES of Rule 5. Rule 5 matches phrases, and for these rows the phrase does
 * not mean a figure the page must supply: the student draws it, every coordinate or table is printed in the stem, or "figure" is
 * only in the marking-scheme answer. Each id was read by an Opus reviewer AND blind re-solved from its printed text alone
 * (answer matched the stored key, question complete and unambiguous as printed) before it was listed here.
 *
 * ⚠ This is an ALLOW-LIST of specific rows, never a change to the matching: `demandsSuppliedFigure` is untouched, so any other row
 * (and every NEW row) with the same wording is still held back. Add an id only with a dated reason and a blind re-solve; the pin
 * test checks the list is still a subset of what Rule 5 flags and still unbound (a stale entry fails). It applies to the
 * paper surfaces (Worksheet, Chapter Test, Full Mock) only; the SEO publishability gate keeps its own Rule 5.
 */
export const RULE5_REVIEWED_NOT_NEEDED: Readonly<Record<string, string>> = {
  "EYE-EXMPLR-10-SA-005": "2026-10-10 B/D47c: \"figure\" only in the marking-scheme answer (student draws the two-prism set-up); blind re-solve agreed",
  "EYE-EXMPLR-10-LA-005": "2026-10-10 B/D47c: \"figure\" only in the marking-scheme answer (student draws the dispersion diagram); blind re-solve agreed",
  "Z3-CG-004": "2026-10-10 B/D47c: requiresDiagram set, but both distances and the route are printed (6 + 8 = 14 km vs 10 km); blind re-solve agreed",
  "CBE-M-STAT-B-001": "2026-10-10 B/D47c: the frequency table is printed in the stem; blind re-solve agreed (160-165)",
  "CBE-M-STAT-C-001": "2026-10-10 B/D47c: the frequency table is printed in the stem; blind re-solve agreed (160.83 cm)",
  "CBE-M-STAT-C-004": "2026-10-10 B/D47c: the frequency table is printed in the stem; blind re-solve agreed (37.5 years)",
  // PYQ-M-CIRC-012 left this list (BANK-RESIDUE-1, 2026-10-23): its only "figure" was the marking-scheme note "Correct figure 1 Mark",
  // which that lane deleted from the row, so Rule 5 no longer flags it and the entry would be dead weight.
  "PYQ-S-2024-LIGHT-009": "2026-10-10 B/D47c: object and mirror data are printed; part (b) asks the student to draw the ray; blind re-solve agreed",
  "LTG-S-MAG-209": "2026-10-10 B/D47c: compass and magnet set-up described in words; blind re-solve agreed",
  "LTG-M-ARC-272": "2026-10-10 B/D47c: radius, arc and angle data printed; blind re-solve agreed (300 deg, 110 m)",
};

/** The structural slice of a question this rule reads. */
export interface FigureCheckable {
  id: string;
  questionText: string;
  answer?: string;
  requiresDiagram?: boolean;
}

/**
 * True when the question demands a figure (the `requiresDiagram` flag, or stem /
 * answer text such as "in the figure shown") AND the id-keyed binder holds no
 * figure for it. Same text scan and same order as publishability Rule 5: the binder
 * is only asked when the text or flag demands a figure.
 */
export function needsMissingFigure(
  q: FigureCheckable,
  hasBoundFigure: (id: string) => boolean = defaultHasBoundFigure,
): boolean {
  if (Object.prototype.hasOwnProperty.call(RULE5_REVIEWED_NOT_NEEDED, q.id)) return false; // D47c: reviewed false positive
  const figureScan = `${q.questionText}\n${q.answer ?? ""}`;
  return Boolean(q.requiresDiagram || demandsFigureForRow(q.id, figureScan)) && !hasBoundFigure(q.id);
}
