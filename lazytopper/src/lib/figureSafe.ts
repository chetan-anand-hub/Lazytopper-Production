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
  demandsSuppliedFigure,
} from "../../scripts/seo/publishability";

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
  const figureScan = `${q.questionText}\n${q.answer ?? ""}`;
  return Boolean(q.requiresDiagram || demandsSuppliedFigure(figureScan)) && !hasBoundFigure(q.id);
}
