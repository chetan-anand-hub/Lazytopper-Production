// @vitest-environment node
/**
 * BANK-FIX-5 PR-1 — pins over the APP's own assembled data (never a source text-scan). Ledger: `BANK_FIX_5`.
 *
 *   1. ids unchanged: every ledger id resolves on its surface; ids unique; 36 entries; APQ-S-EYE-002 absent.
 *   2. withheld => in WITHHELD_QUESTION_IDS and not served; every fixed bank row is served and not withheld.
 *   3. fixed rows carry their key and none of the removed text.
 *   4. step marks: "[N mark] " prefixes sum to the row's marks.
 *   5. ruling 2: official re-keyed rows are Others with no pyqYear / pyqSet / isPYQ; LT-authored rows are not Others.
 *   6. stem pins for the two ruled stem edits.
 *   7. every fixed row's blind re-solve agreed.
 *   8. no scratch-pad text in any fixed row's solution fields.
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { predictedQuestionsById } from "../predictedQuestions";
import { predictedQuestionsScience } from "../predictedQuestionsScience";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { BANK_FIX_5, BANK_FIX_5_WITHHELD_IDS } from "./bankFix5Ledger";
import { SCRATCH_TEXT_RE } from "./bankFix3Ledger";

type Row = Record<string, unknown> & { id: string };
const bankById = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const servedIds = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const predictedById = new Map<string, Row>([
  ...Object.values(predictedQuestionsById as unknown as Record<string, Row>).map((q) => [q.id, q] as const),
  ...(predictedQuestionsScience as unknown as Row[]).map((q) => [q.id, q] as const),
]);
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => [(q as unknown as Row).id, q as unknown as Row] as const),
);
const rowOf = (e: { id: string; surface: string }): Row | undefined =>
  e.surface === "bank" ? bankById.get(e.id) : e.surface === "predicted" ? predictedById.get(e.id) : hpqById.get(e.id);
const stemOf = (q: Row) => String(q.questionText ?? q.question ?? "");
const flat = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v === undefined || v === null ? [] : [String(v)]);
const keyText = (q: Row) => String(q.answer ?? q.finalAnswer ?? "");
const keyTexts = (q: Row) => [String(q.answer ?? ""), String(q.finalAnswer ?? "")];
const solutionText = (q: Row) =>
  [stemOf(q), ...flat(q.answer), ...flat(q.finalAnswer), ...flat(q.explanation), ...flat(q.solutionSteps)].join("\n");
const fixed = BANK_FIX_5.filter((e) => e.verdict === "fixed");
const withheld = BANK_FIX_5.filter((e) => e.verdict === "withheld");

describe("BANK-FIX-5 · ledger and ids", () => {
  it("is non-vacuous: 36 entries across all three surfaces", () => {
    expect(BANK_FIX_5.length).toBe(36);
    expect(fixed.length).toBeGreaterThan(0);
    expect(withheld.length).toBeGreaterThan(0);
    for (const s of ["bank", "predicted", "hpq"]) expect(BANK_FIX_5.some((e) => e.surface === s), s).toBe(true);
  });
  it("every ledger id resolves on its surface; ids unique; APQ-S-EYE-002 is excluded", () => {
    expect(BANK_FIX_5.filter((e) => !rowOf(e)).map((e) => `${e.surface}:${e.id}`)).toEqual([]);
    expect(new Set(BANK_FIX_5.map((e) => e.id)).size).toBe(BANK_FIX_5.length);
    expect(BANK_FIX_5.some((e) => e.id === "APQ-S-EYE-002")).toBe(false);
  });
});

describe("BANK-FIX-5 · withheld and served", () => {
  it("withheld rows are in WITHHELD_QUESTION_IDS and not served", () => {
    expect(withheld.length).toBe(BANK_FIX_5_WITHHELD_IDS.size);
    for (const e of withheld) {
      expect(e.surface, e.id).toBe("bank");
      expect(WITHHELD_QUESTION_IDS.has(e.id), e.id).toBe(true);
      expect(servedIds.has(e.id), e.id).toBe(false);
    }
  });
  it("every fixed bank row is served and not withheld", () => {
    const bank = fixed.filter((e) => e.surface === "bank");
    expect(bank.length).toBeGreaterThan(0);
    for (const e of bank) {
      expect(servedIds.has(e.id), e.id).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(e.id), e.id).toBe(false);
    }
  });
});

describe("BANK-FIX-5 · fixed rows carry the corrected key", () => {
  it("keyMustContain appears in answer or finalAnswer; mustNotContain is gone everywhere", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const e of fixed) {
      const q = rowOf(e)!;
      const key = q.answer !== undefined && q.answer !== null ? keyText(q) : String(q.finalAnswer ?? "");
      const both = keyTexts(q).join("\n");
      for (const s of e.keyMustContain ?? []) {
        checked++;
        if (!key.includes(s) && !both.includes(s)) bad.push(`${e.id}: key lacks "${s}"`);
      }
      const text = solutionText(q);
      for (const s of e.mustNotContain ?? []) {
        checked++;
        if (text.includes(s)) bad.push(`${e.id}: still carries "${s}"`);
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-5 · step marks", () => {
  it("every step starts with [N mark(s)] and the N's sum to the row's marks", () => {
    const bad: string[] = [];
    let n = 0;
    for (const e of fixed) {
      const q = rowOf(e)!;
      const steps = flat(q.solutionSteps);
      if (steps.length === 0) {
        bad.push(`${e.id}: no solutionSteps`);
        continue;
      }
      let sum = 0;
      for (const s of steps) {
        const m = /^\[(\d+(?:\.\d+)?) marks?\] /.exec(s);
        if (!m) bad.push(`${e.id}: step without mark prefix: ${s.slice(0, 40)}`);
        else sum += Number(m[1]);
      }
      n++;
      if (Math.abs(sum - Number(q.marks)) > 1e-9) bad.push(`${e.id}: steps sum ${sum} != marks ${String(q.marks)}`);
    }
    expect(n).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-5 · ruling 2 (official re-keyed rows are Others)", () => {
  it("others:true rows carry sourceOverride 'others' and no pyqYear / pyqSet / isPYQ", () => {
    const others = fixed.filter((e) => e.others);
    expect(others.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const e of others) {
      const q = rowOf(e)!;
      if (q.sourceOverride !== "others") bad.push(`${e.id}: sourceOverride ${String(q.sourceOverride)}`);
      for (const f of ["pyqYear", "pyqSet", "isPYQ"]) if (q[f] !== undefined) bad.push(`${e.id}: carries ${f}`);
    }
    expect(bad).toEqual([]);
  });
  it("lt-authored entries are not Others", () => {
    const lt = BANK_FIX_5.filter((e) => e.origin === "lt-authored");
    expect(lt.length).toBeGreaterThan(0);
    expect(lt.filter((e) => e.others).map((e) => e.id)).toEqual([]);
  });
});

describe("BANK-FIX-5 · stem pins and re-solve", () => {
  it("exactly the two ruled stem edits, with their pinned text", () => {
    expect(BANK_FIX_5.filter((e) => e.stemChanged).map((e) => e.id).sort()).toEqual(["2026-AB-SA-06", "2026-AP-SA-02"]);
    expect(stemOf(predictedById.get("2026-AP-SA-02")!)).toContain("sum is 185");
    expect(stemOf(predictedById.get("2026-AB-SA-06")!)).toContain("unlabelled beaker");
  });
  it("every fixed entry's blind re-solve agreed", () => {
    expect(fixed.filter((e) => e.resolve !== "agree").map((e) => e.id)).toEqual([]);
  });
});

describe("BANK-FIX-5 · no scratch text", () => {
  it("no fixed row carries scratch-pad text in answer / finalAnswer / explanation / solutionSteps", () => {
    const hits: string[] = [];
    let scanned = 0;
    for (const e of fixed) {
      const q = rowOf(e)!;
      for (const f of ["answer", "finalAnswer", "explanation", "solutionSteps"]) {
        flat(q[f]).forEach((t, i) => {
          scanned++;
          if (SCRATCH_TEXT_RE.test(t)) hits.push(`${e.id}:${f}[${i}]`);
        });
      }
    }
    expect(scanned).toBeGreaterThan(0);
    expect(hits).toEqual([]);
  });
});
