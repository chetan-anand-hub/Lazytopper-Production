// @vitest-environment node
/**
 * BANK-FIX-1 PR-2 — broken tagging, ambiguous keys, missing figures, fallback answers.
 * Pins over the ASSEMBLED served sets (canonicalQuestionBank, the predicted layer, HPQ, the promptD
 * fallback packs), never a source text-scan. The ledger (`BANK_FIX_1_PR2`) is measured: a runtime
 * dump of trunk against this branch.
 *
 *   1. ids unchanged: every non-withheld ledger id still exists on its surface; ids are unique;
 *      the only rows removed are the promptD "-D2" drill clones.
 *   2. withheld ⇒ not served (bank: WITHHELD_QUESTION_IDS; HPQ: HPQ_WITHHELD_IDS; promptD:
 *      PROMPT_D_WITHHELD_IDS).
 *   3. objective keys: the stored key resolves — with the app's resolver — to the option the
 *      independent solver chose; options are distinct.
 *   4. every served content-changed row was independently re-solved (`resolve` set).
 *   5. ruling 2: no Others row is PYQ (either matcher), NCERT or year-bearing.
 *   6. the audit checks, re-run as tests over the WHOLE served set: options on every MCQ / A-R;
 *      objective = 1 mark / Section A; no duplicate pair both served; promptD rows have a stem
 *      and an answer; no "-D2" id.
 *   7. served counts per chapter: the lane's totals, and today's served counts are at least the
 *      lane's "after" (a later lane that withholds a row lowers the floor with a dated comment).
 */
import { describe, expect, it, vi } from "vitest";

// PracticePage (imported only for its pure `questionMatchesFilters`) reaches services/cbseExamDate,
// which computes the board-exam date from the clock at module load. Nothing pinned here depends on
// the exam date, so that one module is stubbed: this file never reads the clock and stays out of
// the CI clock manifest.
vi.mock("../../services/cbseExamDate", () => ({
  CBSE_PHASE2_DATE: "",
  CBSE_PHASE2_END: "",
  predictCbseExamDate: () => "",
  predictCbsePhase2Date: () => "",
  predictCbsePhase2End: () => "",
  daysLeftFromIsoDate: () => 0,
  fetchCbseExamDate: async () => ({}),
  fetchCbsePhase1Date: () => ({}),
  fetchCbsePhase2Date: () => ({}),
  getPhaseDeadline: () => "",
  getCbseExamDateAdminOverride: () => null,
  setCbseExamDateAdminOverride: () => undefined,
  clearCbseExamDateAdminOverride: () => undefined,
}));

import {
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  canonicalQuestionBank,
} from "../canonicalQuestionBank";
import { predictedQuestions } from "../predictedQuestions";
import { predictedQuestionsScience } from "../predictedQuestionsScience";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { HPQ_WITHHELD_IDS } from "../hpqCompetencyAdditions";
import { PROMPT_D_WITHHELD_IDS, promptDPracticePacks } from "../promptDPracticePacks";
import { mapUnifiedQuestionToPractice } from "../../components/practice/practiceQuestionBuilder";
import { resolveCorrectOptionIndex, normaliseOptionKeepCase } from "../../lib/objectiveScoring";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { isPYQQuestion as engineIsPYQQuestion } from "../practiceSetGenerator";
import { questionMatchesFilters } from "../../pages/PracticePage";
import {
  BANK_FIX_1_PR2,
  BANK_FIX_1_PR2_DUPLICATE_PAIRS,
  BANK_FIX_1_PR2_SERVED_COUNTS,
  type BankFix1Pr2Entry,
} from "./bankFix1Ledger";
import { BANK_FIX_3_OFFICIAL_RESOURCED_IDS, BANK_FIX_3_RESTORED_IDS, BANK_FIX_3_SERVED_AFTER_RESOLVE_IDS, BANK_FIX_3_WITHHELD_BY_CHAPTER } from "./bankFix3Ledger";

type Row = Record<string, unknown> & { id: string };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const served = canonicalQuestionBank as unknown as Row[];
const servedIds = new Set(served.map((q) => q.id));
const predicted = [...predictedQuestions, ...predictedQuestionsScience] as unknown as Row[];
const predictedById = new Map(predicted.map((q) => [q.id, q]));
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => [q.id, q as unknown as Row]),
);
const promptDRows = (["maths", "science"] as const).flatMap((s) =>
  Object.values(promptDPracticePacks[s]).flatMap((p) => p.questions as unknown as Row[]),
);
const promptDById = new Map(promptDRows.map((q) => [q.id, q]));
const rowOf = (e: BankFix1Pr2Entry): Row | undefined =>
  e.surface === "bank"
    ? bankById.get(e.id)
    : e.surface === "predicted"
      ? predictedById.get(e.id)
      : e.surface === "hpq"
        ? hpqById.get(e.id)
        : promptDById.get(e.id);
const isServedOn = (e: BankFix1Pr2Entry) => (e.surface === "bank" ? servedIds.has(e.id) : !!rowOf(e));

function optionsOf(row: Row): string[] {
  const ar = row.aROptions as { text: string }[] | undefined;
  if (Array.isArray(ar)) return ar.map((o) => o.text);
  return (row.options as string[] | undefined) ?? [];
}
const keyOf = (row: Row) => String(row.correctOption ?? row.answer ?? row.finalAnswer ?? "");
const isObjectiveBankRow = (q: Row) => q.format === "MCQ" || q.format === "Assertion-Reasoning";

describe("BANK-FIX-1 PR-2 · ledger is non-vacuous", () => {
  it("covers every verdict the lane used", () => {
    const by = (v: BankFix1Pr2Entry["verdict"]) => BANK_FIX_1_PR2.filter((e) => e.verdict === v).length;
    expect(by("fixed")).toBeGreaterThan(500);
    expect(by("withheld")).toBeGreaterThan(180);
    expect(by("re-tagged")).toBeGreaterThan(250);
    expect(by("re-sourced")).toBeGreaterThan(200);
    expect(by("answer-written")).toBeGreaterThan(200);
    expect(by("clone-removed")).toBe(19);
    expect(BANK_FIX_1_PR2.filter((e) => e.others).length).toBeGreaterThan(800);
  });
});

describe("BANK-FIX-1 PR-2 · ids unchanged", () => {
  it("every kept ledger id exists on its surface; ledger keys are unique", () => {
    const kept = BANK_FIX_1_PR2.filter((e) => e.verdict !== "withheld" && e.verdict !== "clone-removed");
    expect(kept.filter((e) => !rowOf(e)).map((e) => `${e.surface}:${e.id}`)).toEqual([]);
    const keys = BANK_FIX_1_PR2.map((e) => `${e.surface}:${e.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("withheld bank rows keep their id in the raw bank (ids are never deleted)", () => {
    const gone = BANK_FIX_1_PR2.filter((e) => e.surface === "bank" && e.verdict === "withheld" && !bankById.has(e.id));
    expect(gone.map((e) => e.id)).toEqual([]);
  });
  it("the only removed rows are promptD '-D2' clones", () => {
    const removed = BANK_FIX_1_PR2.filter((e) => e.verdict === "clone-removed");
    expect(removed.every((e) => e.surface === "promptD" && /-D2$/.test(e.id))).toBe(true);
  });
});

describe("BANK-FIX-1 PR-2 · withheld rows are withheld", () => {
  it("every 'withheld' ledger row is in its surface's withhold set and not served", () => {
    // BANK-FIX-3 (2026-10-07, owner ruling 10:21Z): the three SAV liquid-transfer rows are served again.
    // BANK-FIX-3 PR-B: nine figure-bound rows repaired to the official wording are served after the bf3b blind re-solve.
    const servedAgain = (id: string) => BANK_FIX_3_RESTORED_IDS.has(id) || BANK_FIX_3_SERVED_AFTER_RESOLVE_IDS.has(id);
    const bad = BANK_FIX_1_PR2.filter((e) => e.verdict === "withheld" && !(e.surface === "bank" && servedAgain(e.id))).filter((e) => {
      const set = e.surface === "bank" ? WITHHELD_QUESTION_IDS : e.surface === "hpq" ? HPQ_WITHHELD_IDS : PROMPT_D_WITHHELD_IDS;
      return !set.has(e.id) || isServedOn(e) || !e.category;
    });
    expect(bad.map((e) => `${e.surface}:${e.id}`)).toEqual([]);
  });
});

describe("BANK-FIX-1 PR-2 · objective keys resolve to the solver's option", () => {
  const objective = BANK_FIX_1_PR2.filter((e) => e.keyOptionIndex !== undefined);
  it("has objective pins (non-vacuous)", () => expect(objective.length).toBeGreaterThan(150));
  it("each key resolves to exactly the pinned option; options are distinct", () => {
    const bad: string[] = [];
    for (const e of objective) {
      const row = rowOf(e)!;
      const opts = optionsOf(row);
      const idx = resolveCorrectOptionIndex(undefined, keyOf(row), opts);
      if (idx !== e.keyOptionIndex) bad.push(`${e.id}: key resolves to ${idx}, pinned ${e.keyOptionIndex}`);
      // Case-preserving: genetics options ("TT and tt" / "Tt and tt") differ only by case, and the
      // grader compares case-sensitively exactly then (objectiveScoring C5).
      const norm = opts.map((o) => normaliseOptionKeepCase(o));
      if (new Set(norm).size !== norm.length) bad.push(`${e.id}: duplicate option text`);
    }
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-1 PR-2 · every served content change was independently re-solved", () => {
  it("fixed / answer-written rows that are served carry a re-solve outcome", () => {
    const bad = BANK_FIX_1_PR2.filter((e) => (e.verdict === "fixed" || e.verdict === "answer-written") && isServedOn(e) && !e.resolve);
    expect(bad.map((e) => `${e.surface}:${e.id}`)).toEqual([]);
  });
  it("no row is still owed a blind re-check (BANK-FIX-2 REFIX2 rows re-checked 3/3 equivalent, refix3)", () => {
    expect(BANK_FIX_1_PR2.filter((e) => e.resolve === "pending-recheck").map((e) => e.id)).toEqual([]);
    const refix2 = ["HEY-M02", "ME-M14", "REPR-NCERT-7-SA-013"];
    expect(refix2.map((id) => BANK_FIX_1_PR2.find((e) => e.id === id)?.resolve)).toEqual(refix2.map(() => "agree-after-refix"));
  });
});

describe("BANK-FIX-1 PR-2 · ruling 2: Others rows are never PYQ / NCERT / year-bearing", () => {
  // BANK-FIX-3 (2026-10-07): PYQ-M-2025-SAV-004 verified verbatim against the official 30/3/1 paper — official again.
  const others = BANK_FIX_1_PR2.filter((e) => e.others && e.surface === "bank" && servedIds.has(e.id) && !BANK_FIX_3_OFFICIAL_RESOURCED_IDS.has(e.id));
  it("has served Others rows (non-vacuous)", () => expect(others.length).toBeGreaterThan(800));
  it("no Others row is PYQ (either matcher), carries a year, or is offered as PYQ / NCERT", () => {
    const bad: string[] = [];
    for (const e of others) {
      const q = bankById.get(e.id)!;
      if (q.sourceOverride !== "others") bad.push(`${e.id}: no override`);
      if (isPYQQuestion(q as never) || engineIsPYQQuestion(q as never)) bad.push(`${e.id}: isPYQ`);
      if (q.pyqYear || q.pyqSet || q.isPYQ) bad.push(`${e.id}: has a year / isPYQ`);
      const pq = q as never;
      if (questionMatchesFilters(pq, "all", "all", "pyq", "all", null)) bad.push(`${e.id}: in PYQ filter`);
      if (questionMatchesFilters(pq, "all", "all", "ncert", "all", null)) bad.push(`${e.id}: in NCERT filter`);
      if (!questionMatchesFilters(pq, "all", "all", "others", "all", null)) bad.push(`${e.id}: not in Others`);
    }
    expect(bad).toEqual([]);
  });
  it("positive control: the override alone files a year-bearing row under Others", () => {
    // The rows above carry no year, so they would pass even if a matcher ignored the override;
    // this control fails the moment isPYQQuestion or the Practice filter stops honouring it.
    // (The engine copy in practiceSetGenerator does NOT read the override — it is kept in agreement
    // by the data invariant below: an override row never carries a year / set / isPYQ.)
    const over = { id: "OEX-B-001", pyqYear: "2015", questionText: "x", marks: 2, sourceOverride: "others" } as never;
    expect(isPYQQuestion(over)).toBe(false);
    expect(questionMatchesFilters(over, "all", "all", "pyq", "all", null)).toBe(false);
    expect(questionMatchesFilters(over, "all", "all", "others", "all", null)).toBe(true);
  });
  it("data invariant (keeps both isPYQQuestion copies agreeing): no override row carries pyqYear / pyqSet / isPYQ", () => {
    const bad = RAW_CANONICAL_QUESTION_BANK.filter((q) => q.sourceOverride === "others")
      .filter((q) => q.pyqYear || q.pyqSet || (q as { isPYQ?: unknown }).isPYQ)
      .map((q) => q.id);
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-1 PR-2 · the audit checks, re-run over the whole served set", () => {
  it("every served bank MCQ / A-R has at least two options", () => {
    const objective = served.filter(isObjectiveBankRow);
    expect(objective.length).toBeGreaterThan(3000);
    expect(objective.filter((q) => optionsOf(q).length < 2).map((q) => q.id)).toEqual([]);
  });
  it("every served bank MCQ / A-R is 1 mark, Section A", () => {
    const bad = served.filter(isObjectiveBankRow).filter((q) => q.marks !== 1 || q.section !== "A");
    expect(bad.map((q) => `${q.id}:${q.marks}${q.section}`)).toEqual([]);
  });
  it("BANK-FIX-2 (owner ruling, GUARD-3 G9): every served 1-mark bank row is an MCQ / A-R with >= 4 options and a key that is one of them", () => {
    // The 1-mark population is the CBSE Section A: a written 1-mark answer has no fair auto-grade, so
    // every one is a 4-option MCQ or an Assertion-Reason row with the 4 standard options.
    const oneMark = served.filter((q) => Number(q.marks) === 1);
    expect(oneMark.length).toBeGreaterThan(3000);
    expect(oneMark.filter((q) => optionsOf(q).length < 4).map((q) => `${q.id}:${optionsOf(q).length}`)).toEqual([]);
    const unresolved = oneMark.filter((q) => resolveCorrectOptionIndex(undefined, keyOf(q), optionsOf(q)) < 0);
    expect(unresolved.map((q) => q.id)).toEqual([]);
  });
  it("predicted layer: every Assertion-Reason row has options, and every row with options is 1 mark", () => {
    const ar = predicted.filter((q) => /^\s*Assertion\b/i.test(String(q.questionText ?? q.question ?? "")));
    expect(ar.length).toBeGreaterThan(10);
    expect(ar.filter((q) => optionsOf(q).length < 2).map((q) => q.id)).toEqual([]);
    expect(predicted.filter((q) => optionsOf(q).length >= 2 && q.marks !== 1).map((q) => q.id)).toEqual([]);
  });
  it("no duplicate pair is both served; the kept twin is served", () => {
    expect(BANK_FIX_1_PR2_DUPLICATE_PAIRS.length).toBeGreaterThan(40);
    const both = BANK_FIX_1_PR2_DUPLICATE_PAIRS.filter(([a, b]) => servedIds.has(a) && servedIds.has(b));
    expect(both).toEqual([]);
    expect(BANK_FIX_1_PR2_DUPLICATE_PAIRS.filter(([, keep]) => !servedIds.has(keep)).map(([, k]) => k)).toEqual([]);
  });
  it("every promptD fallback row is served with a non-empty stem and an answer", () => {
    expect(promptDRows.length).toBeGreaterThan(200);
    const bad = promptDRows
      .map((q) => mapUnifiedQuestionToPractice(q, q.id))
      .filter((p) => !p.questionText.trim() || !String(p.answer ?? "").trim())
      .map((p) => p.id);
    expect(bad).toEqual([]);
  });
  it("no promptD '-D2' drill clone is served", () => {
    expect(promptDRows.filter((q) => /-D2$/.test(q.id)).map((q) => q.id)).toEqual([]);
  });
});

describe("BANK-FIX-1 PR-2 · served counts per chapter", () => {
  it("records all 26 chapters; the bank delta equals the lane's bank withholds", () => {
    expect(BANK_FIX_1_PR2_SERVED_COUNTS.length).toBe(26);
    const delta = BANK_FIX_1_PR2_SERVED_COUNTS.reduce((s, c) => s + c.bank[0] - c.bank[1], 0);
    expect(delta).toBe(BANK_FIX_1_PR2.filter((e) => e.surface === "bank" && e.verdict === "withheld").length);
    const pd = BANK_FIX_1_PR2_SERVED_COUNTS.reduce((s, c) => s + c.promptD[0] - c.promptD[1], 0);
    expect(pd).toBe(BANK_FIX_1_PR2.filter((e) => e.surface === "promptD" && (e.verdict === "withheld" || e.verdict === "clone-removed")).length);
  });
  it("today's served bank count per chapter is at least the lane's 'after'", () => {
    const now = new Map<string, number>();
    for (const q of served) now.set(String(q.topicKey), (now.get(String(q.topicKey)) ?? 0) + 1);
    // BANK-FIX-3 (2026-10-07): Z3-QE-005 / Z3-QE-006 withheld (maximisation) lower the quadratic-equations floor by 2.
    const floor = (c: { chapter: string; bank: readonly [number, number] }) => c.bank[1] - (BANK_FIX_3_WITHHELD_BY_CHAPTER[c.chapter] ?? 0);
    const short = BANK_FIX_1_PR2_SERVED_COUNTS.filter((c) => (now.get(c.chapter) ?? 0) < floor(c));
    expect(short.map((c) => `${c.chapter}: ${now.get(c.chapter) ?? 0} < ${floor(c)}`)).toEqual([]);
  });
});
