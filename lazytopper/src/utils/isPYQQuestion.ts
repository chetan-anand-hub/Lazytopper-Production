// src/utils/isPYQQuestion.ts
//
// BANK-SPLIT-1 PR-2 (L1). The engine-layer PYQ matcher, in a BANK-FREE module.
//
// Chapter Test and Full Mock (via balancedMockDraw / fullMockBlueprint) imported this
// 9-line predicate from data/practiceSetGenerator.ts, and that one import pulled
// predictionCore, both predicted layers and probabilisticScoring into both pages. They
// import it from here now. The original in practiceSetGenerator.ts stays where it is
// (that file is frozen by the quick-practice overlay gate) and is NOT re-exported from
// here; isPYQQuestion.parity.test.ts proves the two agree on fixtures and on every bank row.
//
// K2H-8f: honours both the explicit `isPYQ` flag (used by P4 PYQ extraction once it
// lands) and the populated `pyqYear` field (current bank tagging convention,
// e.g. "2022", "2023", "30/1/1"). Either form qualifies as PYQ — accepting
// both avoids the format-mismatch failure described in K2H-8f Cause A.
export function isPYQQuestion(q: unknown): boolean {
  if (!q || typeof q !== "object") return false;
  const cast = q as { isPYQ?: unknown; pyqYear?: unknown };
  if (cast.isPYQ === true) return true;
  const year = cast.pyqYear;
  if (typeof year === "string" && year.trim().length > 0) return true;
  if (typeof year === "number" && Number.isFinite(year)) return true;
  return false;
}
