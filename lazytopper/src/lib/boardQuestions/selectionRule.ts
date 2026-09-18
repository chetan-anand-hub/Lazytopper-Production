/**
 * selectionRule — THE deterministic rule that picks the board questions published
 * on every notes page (lane CBQ-TAB-1).
 *
 * This module is the SINGLE definition of the rule. It is consumed by exactly two
 * callers, and deliberately by NOTHING in the app:
 *   1. `scripts/generateBoardQuestions.ts` — emits `boardQuestions.generated.ts`.
 *   2. `boardQuestions.guard.test.ts`      — re-runs it against the LIVE bank and
 *                                            asserts the artifact still matches.
 *
 * ★ WHY THE APP DOES NOT IMPORT THIS FILE.
 * `<Note>` imports the GENERATED artifact only. Importing the live bank into the
 * note would pull `src/data/questionBanks/` — 11 MB across 413 files — into the
 * notes-page chunk on all 26 prerendered pages. That is the PERF-1 regression
 * already on record in this repo (topic hubs froze 10.6 s on one module-scope
 * line; main chunk 9,988 kB), and it would land on the exact surface this lane
 * exists to make fast and crawlable. The artifact is 59 kB. Keep it that way:
 * this module takes the bank as an ARGUMENT and imports none of it, so the
 * coupling cannot be reintroduced by accident.
 *
 * The rule itself is fixed by owner ruling and must not be "improved" in place —
 * changing it silently rewrites what 26 published pages say.
 */

import { isPublishable } from "../../../scripts/seo/publishability";

/** Questions published per topic. Owner ruling (a): N = 3, across all 26 topics. */
export const BOARD_QUESTION_COUNT = 3;

/**
 * ★ CODEPOINT ORDER — DO NOT "SIMPLIFY" THIS TO `localeCompare`. THIS IS LOAD-BEARING.
 *
 * `localeCompare` uses ICU collation, which varies with the Node build (small-icu
 * vs full-icu) and with the locale. The published selection would then differ
 * between machines, and the prerendered artifact would churn on every capture —
 * the precise failure this rule exists to prevent.
 *
 * This is not theoretical. 41 of the bank's 8,545 ids are lowercase
 * (`HE-D01a`, `OE-E01a`, `sci-phy-elec-3m-2026-01`, ...), and ICU interleaves case
 * while codepoint order does not. Measured 2026-09-18: codepoint and
 * `localeCompare` disagree at index 1762 of the qualifying pool under EVERY locale
 * tested (en-US, de-DE, sv-SE, tr-TR) — codepoint `SCO-S-ACID-001` vs locale
 * `sci-phy-elec-3m-2026-01`. The two comparators genuinely pick different
 * questions.
 *
 * `<` / `>` on strings is UTF-16 code-unit order, defined by the ECMAScript spec.
 * It is identical on every engine, every ICU build and every locale.
 */
export const compareById = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** The bank fields this rule reads. Structural on purpose — this module must not
 *  drag the bank's own type (and therefore the bank) into its consumers. */
export interface SelectableQuestion {
  id: string;
  subject: string;
  topicKey: string;
  questionText: string;
  marks: number;
  section: string;
  solutionSteps?: string[];
  pyqYear?: string;
  isCompetencyBased?: boolean;
  requiresDiagram?: boolean;
  answer?: string;
}

/** One published question, exactly as the note renders it. */
export interface BoardQuestionRow {
  id: string;
  questionText: string;
  marks: number;
  section: string;
  solutionSteps: readonly string[];
  /** Present only where the row genuinely carries a board year. Measured
   *  2026-09-18: 3 of the 78 selected rows do. §2.2 renders it only when present. */
  pyqYear?: string;
}

/**
 * The practice subject for a topic, as the practice ROUTE spells it.
 *
 * ⚠ This is derived from the BANK (`q.subject`), never from the note spec.
 * `NoteMeta.subject` has FOUR values (physics | chemistry | biology | maths), and
 * `normaliseSubject` (practiceQuestionBuilder.ts:325-329) maps anything that is not
 * "science"/"sci" to Maths WITHOUT ERRORING. Deriving the CTA subject from the note
 * spec would therefore serve maths questions on a physics note, silently. The bank's
 * `subject` is already exactly "Maths" | "Science"; every one of the 26 topics maps
 * to exactly one of them (asserted by the guard test).
 */
export type PracticeSubject = "maths" | "science";

export interface BoardQuestionTopic {
  subject: PracticeSubject;
  questions: readonly BoardQuestionRow[];
}

export type BoardQuestionArtifact = Readonly<Record<string, BoardQuestionTopic>>;

export const toPracticeSubject = (bankSubject: string): PracticeSubject =>
  bankSubject.toLowerCase() === "science" ? "science" : "maths";

/**
 * §2.3 — EXACTLY these filters, and no others.
 *
 * ★ `AI_GENERATED_SOLUTION_IDS` is deliberately NOT consulted. Owner ruling (b),
 * 2026-09-17: the bank was built with proper scrutiny and AI-generated SOLUTIONS
 * are included. It is a DIFFERENT id-set from `AI_GENERATED_QUESTION_IDS`, which IS
 * an exclusion. Do not "fix" this by adding the solution set — that would empty
 * topics that the owner has ruled publishable.
 */
export function qualifies(
  q: SelectableQuestion,
  aiQuestionIds: ReadonlySet<string>,
  withheldIds: ReadonlySet<string>,
): boolean {
  if (q.isCompetencyBased !== true) return false;
  if (aiQuestionIds.has(q.id)) return false;
  if (withheldIds.has(q.id)) return false;
  return isPublishable(q, aiQuestionIds).ok;
}

/**
 * Run the rule over a bank. Returns topics in codepoint order, each with its
 * `BOARD_QUESTION_COUNT` questions in codepoint id order.
 *
 * Throws — loudly, naming the topic — if any topic cannot be filled. §2.5: the
 * scout measured 26/26 at N=3, so a shortfall means the bank MOVED and the owner
 * must know. This throw runs at BUILD time (generator) and in CI (guard test),
 * never in the browser: a throw on a prerendered page would not fail a build, it
 * would paint the error boundary — the soft-404 mechanism already on record here.
 */
export function selectBoardQuestions(
  bank: readonly SelectableQuestion[],
  aiQuestionIds: ReadonlySet<string>,
  withheldIds: ReadonlySet<string>,
  count: number = BOARD_QUESTION_COUNT,
): BoardQuestionArtifact {
  const topics = [...new Set(bank.map((q) => q.topicKey))].sort(compareById);
  const out: Record<string, BoardQuestionTopic> = {};
  const short: string[] = [];

  for (const topicKey of topics) {
    const pool = bank
      .filter((q) => q.topicKey === topicKey && qualifies(q, aiQuestionIds, withheldIds))
      .sort((a, b) => compareById(a.id, b.id));

    if (pool.length < count) {
      short.push(`${topicKey} (${pool.length} of ${count})`);
      continue;
    }

    out[topicKey] = {
      subject: toPracticeSubject(pool[0].subject),
      questions: pool.slice(0, count).map((q) => {
        const row: BoardQuestionRow = {
          id: q.id,
          questionText: q.questionText,
          marks: q.marks,
          section: q.section,
          solutionSteps: [...(q.solutionSteps ?? [])],
        };
        if (q.pyqYear) row.pyqYear = q.pyqYear;
        return row;
      }),
    };
  }

  if (short.length > 0) {
    throw new Error(
      `CBQ-TAB-1: ${short.length} topic(s) cannot be filled at N=${count}: ${short.join(", ")}. ` +
        `The bank has moved. Do NOT render fewer and do NOT fall back silently — ` +
        `re-run the generator and have the owner review the shortfall.`,
    );
  }

  return out;
}
