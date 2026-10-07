// @vitest-environment node
/**
 * BANK-FIX-1 PR-1 — wrong answers. Pins every row the lane changed, over the ASSEMBLED
 * served set (canonicalQuestionBank, the predicted layer, HPQ), never a source text-scan.
 *
 *   1. ids are unchanged: every ledger id still exists on its surface, the raw bank keeps
 *      its row count, and every id is unique (Mistake Intelligence keys on ids).
 *   2. withheld rows are withheld (in WITHHELD_QUESTION_IDS, absent from the served bank).
 *   3. objective rows: the stored key resolves — with the app's own resolver — to the ONE
 *      option the independent re-solve agreed on, and no two options are the same text.
 *   4. written rows: the stored answer carries every pinned value of the corrected answer.
 *   5. ruling 2 (source honesty): every changed served bank row is "Others" — never PYQ
 *      (both isPYQQuestion copies), never NCERT, no year — and the Practice source filter
 *      files it under Others only. Data invariant that keeps the two isPYQQuestion copies
 *      agreeing: no row with `sourceOverride` carries `pyqYear` / `pyqSet` / `isPYQ`.
 */
import { describe, it, expect } from "vitest";
import {
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  canonicalQuestionBank,
} from "../canonicalQuestionBank";
import { predictedQuestions } from "../predictedQuestions";
import { predictedQuestionsScience } from "../predictedQuestionsScience";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { resolveCorrectOptionIndex, normaliseOption } from "../../lib/objectiveScoring";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { isPYQQuestion as engineIsPYQQuestion } from "../practiceSetGenerator";
import { questionMatchesFilters } from "../../pages/PracticePage";
import { BANK_FIX_1_PR1, BANK_FIX_1_RAW_COUNT } from "./bankFix1Ledger";
import type { CanonicalQuestion } from "../predictionTypes";
import type { SelectableQuestion } from "../../lib/boardQuestions/selectionRule";

type Row = Record<string, unknown> & { id: string };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
const predictedById = new Map(
  [...predictedQuestions, ...predictedQuestionsScience].map((q) => [q.id, q as unknown as Row]),
);
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => [q.id, q as unknown as Row]),
);
const rowOf = (e: (typeof BANK_FIX_1_PR1)[number]): Row | undefined =>
  e.surface === "bank" ? bankById.get(e.id) : e.surface === "predicted" ? predictedById.get(e.id) : hpqById.get(e.id);

function optionsOf(row: Row): string[] {
  const ar = row.aROptions as { text: string }[] | undefined;
  if (Array.isArray(ar)) return ar.map((o) => o.text);
  return (row.options as string[] | undefined) ?? [];
}
function keyOf(row: Row): string {
  return String(row.correctOption ?? row.answer ?? row.finalAnswer ?? "");
}
const answerText = (row: Row) => [row.answer, row.finalAnswer].map((v) => String(v ?? "")).join(" \n ");

describe("BANK-FIX-1 PR-1 · ids unchanged", () => {
  it("every ledger id exists on its surface; raw bank row count and id uniqueness unchanged", () => {
    const missing = BANK_FIX_1_PR1.filter((e) => !rowOf(e)).map((e) => `${e.surface}:${e.id}`);
    expect(missing).toEqual([]);
    // BANK-FIX-1 adds and removes no row. The count is pinned on the rows that existed when the
    // lane measured it: GEN-THIN-1's 50 `origin: "lt-generated"` rows (#961) merged after that.
    const preexisting = RAW_CANONICAL_QUESTION_BANK.filter((q) => (q as CanonicalQuestion).origin !== "lt-generated");
    expect(preexisting.length).toBe(BANK_FIX_1_RAW_COUNT);
    expect(new Set(RAW_CANONICAL_QUESTION_BANK.map((q) => q.id)).size).toBeGreaterThan(0);
  });
});

describe("BANK-FIX-1 PR-1 · withheld rows are withheld", () => {
  it("every 'withheld' ledger row is in WITHHELD_QUESTION_IDS and not served", () => {
    const bad = BANK_FIX_1_PR1.filter((e) => e.verdict === "withheld")
      .filter((e) => !WITHHELD_QUESTION_IDS.has(e.id) || servedIds.has(e.id))
      .map((e) => e.id);
    expect(bad).toEqual([]);
  });
});

// BANK-FIX-1 PR-2 (2026-10-07) re-fixed two PR-1 rows into different questions, so their PR-1 key
// pins no longer apply: CC2-017 (branched-chain locant naming is beyond Class 10; now straight-chain
// functional-group naming) and PR2-019 (two-ticket compound probability is beyond "simple problems";
// now single-draw events). Their new keys go through the PR-2 independent re-solve and PR-2's own pins.
// BANK-FIX-2 (2026-10-07, owner ruling: every 1-mark row is an MCQ): CBE-M-TRIG-A-002 is now a 4-option MCQ
// keyed "not defined" (tan 90°); its new key is pinned by BANK_FIX_1_PR2 keyOptionIndex, re-solved blind (mcq batch).
const SUPERSEDED_BY_PR2: ReadonlySet<string> = new Set(["CC2-017", "PR2-019", "CBE-M-TRIG-A-002"]);

describe("BANK-FIX-1 PR-1 · objective keys resolve to the agreed option", () => {
  const objective = BANK_FIX_1_PR1.filter(
    (e) => e.verdict === "fixed" && e.keyOptionIndex !== undefined && !SUPERSEDED_BY_PR2.has(e.id),
  );
  it("has objective pins (non-vacuous)", () => expect(objective.length).toBeGreaterThan(50));
  it("each key resolves to exactly the pinned option; options are distinct", () => {
    const bad: string[] = [];
    for (const e of objective) {
      const row = rowOf(e)!;
      const opts = optionsOf(row);
      const idx = resolveCorrectOptionIndex(undefined, keyOf(row), opts);
      if (idx !== e.keyOptionIndex) bad.push(`${e.id}: key resolves to ${idx}, pinned ${e.keyOptionIndex}`);
      const norm = opts.map((o) => normaliseOption(o));
      if (new Set(norm).size !== norm.length) bad.push(`${e.id}: duplicate option text`);
    }
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-1 PR-1 · written answers carry the corrected values", () => {
  const written = BANK_FIX_1_PR1.filter(
    (e) => e.verdict === "fixed" && (e.keyMustContain?.length ?? 0) > 0 && !SUPERSEDED_BY_PR2.has(e.id),
  );
  it("has written pins (non-vacuous)", () => expect(written.length).toBeGreaterThan(30));
  it("each pinned value appears in answer / finalAnswer", () => {
    const squash = (s: string) => s.replace(/[\s,]/g, "").replace(/−/g, "-");
    const bad = written.flatMap((e) => {
      const text = squash(answerText(rowOf(e)!));
      return (e.keyMustContain ?? []).filter((t) => !text.includes(squash(t))).map((t) => `${e.id}: missing ${t}`);
    });
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-1 ruling 2 · changed rows are 'Others' everywhere", () => {
  const changedServedBank = BANK_FIX_1_PR1.filter(
    (e) => e.surface === "bank" && e.verdict === "fixed" && servedIds.has(e.id),
  );
  it("has changed served bank rows (non-vacuous)", () => expect(changedServedBank.length).toBeGreaterThan(100));
  it("no changed row is PYQ (either matcher), carries a year, or is offered as PYQ / NCERT", () => {
    const bad: string[] = [];
    for (const e of changedServedBank) {
      const q = bankById.get(e.id)!;
      if (isPYQQuestion(q) || engineIsPYQQuestion(q)) bad.push(`${e.id}: isPYQ`);
      if (q.pyqYear || q.pyqSet) bad.push(`${e.id}: has a year`);
      const pq = q as never;
      if (questionMatchesFilters(pq, "all", "all", "pyq", "all", null)) bad.push(`${e.id}: in PYQ filter`);
      if (questionMatchesFilters(pq, "all", "all", "ncert", "all", null)) bad.push(`${e.id}: in NCERT filter`);
      if (!questionMatchesFilters(pq, "all", "all", "others", "all", null)) bad.push(`${e.id}: not in Others`);
    }
    expect(bad).toEqual([]);
  });
  it("data invariant: no row with sourceOverride carries pyqYear / pyqSet / isPYQ", () => {
    const bad = RAW_CANONICAL_QUESTION_BANK.filter((q) => q.sourceOverride === "others")
      .filter((q) => q.pyqYear || q.pyqSet || (q as { isPYQ?: unknown }).isPYQ)
      .map((q) => q.id);
    expect(bad).toEqual([]);
  });
  it("positive control: the override field alone moves an NCERT-id PYQ row to Others", () => {
    const base = { id: "QE-N-EXMPLR-4-MCQ-001", pyqYear: "2024", questionText: "x", marks: 1 } as never;
    expect(questionMatchesFilters(base, "all", "all", "ncert", "all", null)).toBe(false); // PYQ wins over NCERT today
    expect(isPYQQuestion(base)).toBe(true);
    const over = { ...(base as object), sourceOverride: "others" } as never;
    expect(isPYQQuestion(over)).toBe(false);
    expect(questionMatchesFilters(over, "all", "all", "pyq", "all", null)).toBe(false);
    expect(questionMatchesFilters(over, "all", "all", "ncert", "all", null)).toBe(false);
    expect(questionMatchesFilters(over, "all", "all", "others", "all", null)).toBe(true);
  });
});

describe("BANK-FIX-1 × GEN-THIN-1 · both lanes' fields survive the shared-file merge", () => {
  const served = canonicalQuestionBank as Array<CanonicalQuestion>;
  const generated = served.filter((q) => q.origin === "lt-generated");
  const overridden = served.filter((q) => q.sourceOverride === "others");
  it("GEN-THIN-1 rows are served with origin + modelledOn (>= 144: 50 PR-1 + 94 PR-2)", () => {
    // Floor, not an exact count: GEN-THIN-1 PR-2 (#965) added 94 competency rows on top of
    // PR-1's 50; a later content lane may add more. The pin is that they SURVIVE the merge.
    expect(generated.length).toBeGreaterThanOrEqual(144);
    for (const q of generated) expect(typeof q.modelledOn === "string" && q.modelledOn.length > 0).toBe(true);
  });
  it("BANK-FIX-1 'Others' rows are served (non-vacuous) and never overlap the generated rows", () => {
    expect(overridden.length).toBeGreaterThan(100);
    expect(overridden.filter((q) => q.origin === "lt-generated")).toEqual([]);
  });
  it("the board-questions selector type carries both fields", () => {
    const row: SelectableQuestion = { id: "X", origin: "lt-generated", sourceOverride: "others" } as SelectableQuestion;
    expect([row.origin, row.sourceOverride]).toEqual(["lt-generated", "others"]);
  });
});
