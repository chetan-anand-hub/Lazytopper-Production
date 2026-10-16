// src/services/meSplit.ts
//
// TUTOR-FIX-2 (T2) — Me/Progress's pure marks derivations, MOVED here VERBATIM from
// pages/MeProgressPage.tsx so the Tutor brief can apply the SAME functions without importing the
// page (MeProgressPage re-exports every name, so its callers and tests are unchanged). Nothing
// here was rewritten: the bodies are the page's, byte for byte, and Me's existing tests pin them.

import type { RungTrend } from "./progressStore";
import type { MistakeLogEntry } from "./mistakeLogService";
import { mistakeLossByGroup, rungNamesWeakness } from "./progressReadModel";

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Marks LOST on a rung, or null when the rung carries no marks at all.
 *
 * ABSENCE IS MEANINGFUL. The mistake-type rung is a composition SHARE and carries no
 * marks denominator; coercing that absence to 0 would print "0 of 0 marks", which is
 * an invented figure. Returning null keeps the caller silent instead.
 */
export function lostMarksOf(rung: RungTrend): number | null {
  const available = rung.marksAvailable;
  const scored = rung.marksScored;
  if (typeof available !== "number" || typeof scored !== "number") return null;
  if (!Number.isFinite(available) || !Number.isFinite(scored)) return null;
  return Math.max(0, round1(available - scored));
}

export interface PaperSplit {
  available: number;
  secured: number;
  lost: number;
  careless: number;
  knowledge: number;
  /** SCORECARD-MI-1 — exam technique (presentation), its own group. */
  technique: number;
  /**
   * SCORECARD-MI-1 PR-2 — marks the v2 grader recorded as NOT ATTEMPTED (its `unattempted`
   * bucket). Never a mistake and never folded into a group. Known only from entries that carry
   * `marksLostByType`; a count-only entry never contributes here (0, not a guess).
   */
  notAttempted: number;
  /** The honest remainder: lost marks with no mistake type recorded (see `splitPaperMarks`). */
  unclassified: number;
  /**
   * False when the mistake log attributes MORE marks than the graded stream says
   * were lost. The two streams are deduplicated differently, so this can happen;
   * when it does we show WHAT was lost and refuse to say WHY rather than clamp a
   * number into shape.
   */
  splitKnown: boolean;
}

/**
 * The hero split. `rung` is the subject rung for the chosen paper (the graded stream,
 * which owns the denominators); `logs` are that paper's mistake-log entries, which
 * own the careless/knowledge attribution.
 *
 * TWO KINDS OF ENTRY, NEVER MIXED UP (SCORECARD-MI-1 PR-2, B7 / G5):
 *   - an entry that carries GRADER-CORE-1 v2 marks (`entryMarksLost`) is split by THOSE
 *     marks, grouped by lib/mistakeDisplay (`groupMarks`): knowledge = conceptual, technique =
 *     presentation, careless = calculation + silly, notAttempted = unattempted. Its "reason
 *     not recorded" marks stay in the remainder;
 *   - a count-only entry (every entry written before PR-2) keeps today's rule: the step
 *     deductions the grader wrote on typed steps. It is never given an unattempted figure or
 *     any other invented mark.
 *
 * `unclassified` is the honest remainder: lost marks with no mistake type on record. It is
 * whatever the graded stream lost that the log does not name — marks the grader gave no
 * reason for ([FU-GRADER-DEDUCTION-WITHOUT-TYPE], a v2 `untyped` bucket), binary one-markers,
 * and, on count-only entries, questions or parts the student did not attempt. It does NOT
 * claim which; OR-LIVE L5 caught the old sentence asserting "the grader took these marks",
 * which is false for an unanswered MCQ. It is never a dumping ground and it is never the
 * place to hide a rounding difference.
 */
export function splitPaperMarks(
  rung: RungTrend | null | undefined,
  logs: MistakeLogEntry[],
): PaperSplit | null {
  // ME-ENGINE-1 PR-2b — Me's gate for naming a weakness is the read model's ONE predicate, which
  // the Tutor brief also asks (imported by both, never copied).
  if (!rungNamesWeakness(rung)) return null;
  const available = rung.marksAvailable;
  const secured = rung.marksScored;

  const lost = Math.max(0, round1(available - secured));
  // ME-ENGINE-1 PR-1 — THE one group split (services/progressReadModel), the same function the
  // sidebar widget's "biggest loss" reads once it joins: v2 entries by their own marks, legacy count-only
  // entries by their step deductions, as stored. `untyped` (v2 marks the grader gave no reason
  // for) belongs to the remainder, but is counted so a log that names more lost marks than the
  // graded stream holds is caught by the same over-attribution check below.
  const byGroup = mistakeLossByGroup(logs);
  let careless = byGroup.careless;
  let knowledge = byGroup.knowledge;
  let technique = byGroup.technique;
  let notAttempted = byGroup.notAttempted;
  let untyped = byGroup.untyped;
  // SCORECARD-MI-1 PR-2 (H11) — marks lost ONLY to work not attempted (a wholly unattempted
  // question, or one whose only loss is unwritten parts) have NO MI entry by design (OR-LIVE
  // L3), so the log above can never name them. The graded stream now does: an attempt carries
  // `notAttempted` (the MI front door's own predicate), and the rung sums those marks. They
  // leave "no reason recorded" and show as "Not attempted". Never double counted: such a
  // question has no MI entry, and an entry's own `unattempted` marks belong to questions that
  // DID lose marks to work. Absent on the rung (every pre-PR-2 attempt) → nothing added.
  const rungNotAttempted = Number(rung.marksNotAttempted);
  if (Number.isFinite(rungNotAttempted) && rungNotAttempted > 0) notAttempted += rungNotAttempted;
  careless = round1(careless);
  knowledge = round1(knowledge);
  technique = round1(technique);
  notAttempted = round1(notAttempted);
  untyped = round1(untyped);

  if (careless + knowledge + technique + notAttempted + untyped > lost + 0.05) {
    return {
      available: round1(available),
      secured: round1(secured),
      lost,
      careless: 0,
      knowledge: 0,
      technique: 0,
      notAttempted: 0,
      unclassified: lost,
      splitKnown: false,
    };
  }
  return {
    available: round1(available),
    secured: round1(secured),
    lost,
    careless,
    knowledge,
    technique,
    notAttempted,
    unclassified: Math.max(0, round1(lost - careless - knowledge - technique - notAttempted)),
    splitKnown: true,
  };
}

export interface ViewRow {
  key: string;
  label: string;
  lost: number;
}

/** A deeper-analysis view: rungs with real lost marks, worst first. */
export function viewRowsFrom(rungs: RungTrend[]): ViewRow[] {
  const rows: ViewRow[] = [];
  for (const rung of rungs) {
    const lost = lostMarksOf(rung);
    if (lost === null || lost <= 0) continue;
    rows.push({ key: rung.key, label: rung.label || rung.key, lost });
  }
  return rows.sort((a, b) => b.lost - a.lost);
}
