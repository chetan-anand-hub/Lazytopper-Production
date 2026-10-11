// @vitest-environment node
/**
 * BANK-FIX-6 - one table-driven pin over the ledger (`BANK_FIX_6`), read through the app's own assembled data
 * (served bank, predicted maps, HPQ buckets), never a source text-scan. Per entry / group:
 *   - the id still resolves on its surface (ids are never changed); a withheld entry is withheld and not served;
 *   - A  HPQ rows: exactly one "[1 mark]" step + a finalAnswer;      B  HPQ MCQs: 4 unique options, the key letter points at the
 *     stored answer, and no "(A)" text is left in the stem;          C  HPQ rows: a non-empty finalAnswer;
 *   - D/E/H bank rows whose steps changed: every step carries ONE leading mark token and no other, the non-OR steps sum to `marks`
 *     (a partial OR may total less than `marks`, never more);
 *   - H: no changed served row carries "REQUIRES-FIGURE" / "Per MS" in any field (the all-rows ratchet is servedPlaceholders.guard);
 *   - the decisions: APQ-M-ARC-006 is (D) 4.5 cm; the four Exemplar carbon keys are (c)/(d)/(c)/(d); the Exemplar neuron-labelling
 *     keys; 2026-SAV-CASE-09 states pi = 3.14; sci-chem-comp-02 is B; PYQ-M-2026-SAV-003 stays an Others row without pyqYear.
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { predictedQuestionsById } from "../predictedQuestions";
import { predictedQuestionsScience } from "../predictedQuestionsScience";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { HPQ_WITHHELD_IDS } from "../hpqCompetencyAdditions";
import { BANK_FIX_6 } from "./bankFix6Ledger";

type Row = Record<string, unknown> & { id: string };
const rawById = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const servedIds = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const predictedById = new Map<string, Row>([
  ...Object.values(predictedQuestionsById as unknown as Record<string, Row>).map((q) => [q.id, q] as const),
  ...(predictedQuestionsScience as unknown as Row[]).map((q) => [q.id, q] as const),
]);
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => [(q as unknown as Row).id, q as unknown as Row] as const),
);
const rowOf = (e: (typeof BANK_FIX_6)[number]) =>
  e.surface === "bank" ? rawById.get(e.id) : e.surface === "predicted" ? predictedById.get(e.id) : hpqById.get(e.id);
const group = (g: string) => BANK_FIX_6.filter((e) => e.group === g && e.verdict === "fixed");
const steps = (q: Row) => ((q.solutionSteps as string[] | undefined) ?? []).map(String);

const LEAD = /^\[([^\]]*?)\s*marks?\]\s*(OR\b)?/i;
const ANY_MARK_TOKEN = /\[[\d.½ +]+\s*marks?\]/gi;
const markValue = (t: string) => t.replace(/½/g, "0.5").split("+").reduce((a, x) => a + parseFloat(x), 0);

describe("BANK-FIX-6 ledger", () => {
  it("has unique entries and every id resolves on its surface", () => {
    expect(new Set(BANK_FIX_6.map((e) => e.id)).size).toBe(BANK_FIX_6.length);
    expect(BANK_FIX_6.filter((e) => !rowOf(e) && !(e.surface === "hpq" && e.verdict === "withheld")).map((e) => e.id)).toEqual([]);
  });

  it("a withheld entry is in WITHHELD_QUESTION_IDS and not served; a fixed bank row is not silently withheld by this lane", () => {
    const withheld = BANK_FIX_6.filter((e) => e.verdict === "withheld");
    expect(
      withheld.filter((e) => (e.surface === "hpq" ? !HPQ_WITHHELD_IDS.has(e.id) || hpqById.has(e.id) : !WITHHELD_QUESTION_IDS.has(e.id) || servedIds.has(e.id))).map((e) => e.id),
    ).toEqual([]);
    for (const id of ["TRI-N-EXMPLR-6-LA-002", "APQ-M-TRIG-011", "APQ-M-TRIG-016"]) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
    }
  });
});

describe("BANK-FIX-6 groups A / B / C (HPQ)", () => {
  it.each(group("A").filter((e) => e.id !== "sci-chem-comp-02").map((e) => [e.id]))("A %s: one [1 mark] step and a finalAnswer", (id) => {
    const q = hpqById.get(id) as Row;
    expect(steps(q)).toHaveLength(1);
    expect(steps(q)[0].startsWith("[1 mark]")).toBe(true);
    expect(String(q.finalAnswer ?? "").trim().length).toBeGreaterThan(0);
  });

  it.each(group("B").map((e) => [e.id]))("B %s: 4 unique options, the key letter is the stored answer, stem has no inline options", (id) => {
    const q = hpqById.get(id) as Row;
    const options = q.options as string[];
    expect(options).toHaveLength(4);
    expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(4);
    const idx = "ABCD".indexOf(String(q.correctOption));
    expect(idx).toBeGreaterThanOrEqual(0);
    const answer = String(q.answer).toLowerCase().replace(/^\([a-d]\)\s*/, "");
    expect(answer.includes(options[idx].toLowerCase()), `${id}: key option "${options[idx]}" vs answer "${q.answer}"`).toBe(true);
    expect(/\(A\)|\(a\)/.test(String(q.question))).toBe(false);
  });

  it.each(BANK_FIX_6.filter((e) => (e.group === "C" || e.group === "A") && e.id !== "sci-chem-comp-02").map((e) => [e.id]))("C %s: finalAnswer is present", (id) => {
    expect(String((hpqById.get(id) as Row).finalAnswer ?? "").trim().length).toBeGreaterThan(0);
  });

  it("sci-chem-comp-02 is withheld (three blind solves split A/B; cofounder DECISION 45a) and not served", () => {
    expect(hpqById.has("sci-chem-comp-02")).toBe(false);
    expect(HPQ_WITHHELD_IDS.has("sci-chem-comp-02")).toBe(true);
  });
});

describe("BANK-FIX-6 step marks (groups D / E / H)", () => {
  const stepRows = BANK_FIX_6.filter((e) => e.surface === "bank" && e.verdict === "fixed" && e.fields.includes("solutionSteps"));
  it("there are step-changing entries to check", () => {
    expect(stepRows.length).toBeGreaterThan(30);
  });
  it.each(stepRows.map((e) => [e.id]))("%s: one leading mark token per step, non-OR steps sum to marks", (id) => {
    const q = rawById.get(id) as Row;
    const marks = Number(q.marks);
    let main = 0;
    let alt = 0;
    for (const s of steps(q)) {
      const m = LEAD.exec(s);
      expect(m, `${id}: step without a leading mark token: ${s.slice(0, 60)}`).not.toBeNull();
      expect((s.match(ANY_MARK_TOKEN) ?? []).length, `${id}: extra mark token in: ${s.slice(0, 60)}`).toBe(1);
      if (m?.[2]) alt += markValue(m[1]);
      else main += markValue(m?.[1] ?? "0");
    }
    expect(main, `${id}: non-OR steps`).toBeCloseTo(marks, 5);
    expect(alt, `${id}: OR steps`).toBeLessThanOrEqual(marks + 1e-9);
  });
});

describe("BANK-FIX-6 placeholders and decisions", () => {
  const PLACEHOLDER = /REQUIRES-FIGURE|Per MS\b/i;
  it("no served ledger row shows REQUIRES-FIGURE / Per MS in any field", () => {
    const bad = BANK_FIX_6.filter((e) => e.surface === "bank" && servedIds.has(e.id)).filter((e) =>
      PLACEHOLDER.test(JSON.stringify(rawById.get(e.id))),
    );
    expect(bad.map((e) => e.id)).toEqual([]);
  });

  it("APQ-M-ARC-006 is (D) 4.5 cm per PQ_2022 MS", () => {
    const q = rawById.get("APQ-M-ARC-006") as Row;
    expect(String(q.answer)).toContain("4.5");
    expect(JSON.stringify(q.finalAnswer)).toContain("4.5");
  });

  it("Exemplar carbon keys follow the Exemplar answer key: 005 (c), 010 (d), 016 (c), 023 (d)", () => {
    const keys: Record<string, string> = {
      "CARB-EXMPLR-4-MCQ-005": "c",
      "CARB-EXMPLR-4-MCQ-010": "d",
      "CARB-EXMPLR-4-MCQ-016": "c",
      "CARB-EXMPLR-4-MCQ-023": "d",
    };
    for (const [id, letter] of Object.entries(keys)) {
      const q = rawById.get(id) as Row;
      expect(String(q.finalAnswer).toLowerCase(), id).toContain(`(${letter})`);
    }
  });

  it("Exemplar neuron / reflex-arc labelling keys follow the Exemplar (no extra labels)", () => {
    const a1 = String((rawById.get("CTRL-EXMPLR-6-SA-001") as Row).answer).toLowerCase();
    expect(a1).toContain("sensory neuron");
    expect(a1).toContain("spinal cord");
    expect(a1).toContain("motor neuron");
    const a5 = String((rawById.get("CTRL-EXMPLR-6-SA-005") as Row).answer).toLowerCase();
    for (const part of ["dendrite", "cell body", "axon", "nerve ending"]) expect(a5, part).toContain(part);
    expect(a5).not.toContain("schwann");
  });

  it("2026-SAV-CASE-09 states pi = 3.14 and its key uses it", () => {
    const q = predictedById.get("2026-SAV-CASE-09") as Row;
    expect(String(q.questionText)).toContain("π = 3.14");
    expect(String(q.finalAnswer)).toContain("12,999.60");
  });

  it("rows marked 'figure binding needed' stay WITHHELD and are not served (DECISION 44b.3)", () => {
    const NEEDS_FIGURE = [
      // BANK-UNWITHHOLD-1 (2026-10-10): CARB-EXMPLR-4-MCQ-010/-016/-022/-023 left this list. Their figures are bound
      // (DIAGRAMS-RESUME-B Science census, eye-confirmed) and a blind re-solve from stem + figure matched the key.
      "PYQ-S-2026-ACID-012", "PYQ-S-MAG-002", "PYQ-S-ELEC-001", "PYQ-S-2026-MAG-001", "PYQ-S-2026-CHEMRXN-013",
      "PYQ-M-2024-CG-007", "PYQ-M-2026-TRIG-002", "TRI-N-EXMPLR-6-LA-002", "APQ-M-TRIG-011", "APQ-M-TRIG-016",
    ];
    expect(NEEDS_FIGURE.filter((id) => !WITHHELD_QUESTION_IDS.has(id) || servedIds.has(id))).toEqual([]);
  });

  it("PYQ-M-2026-SAV-003 stays an Others row without pyqYear (BANK-FIX-1 ruling 2)", () => {
    const q = rawById.get("PYQ-M-2026-SAV-003") as Row;
    expect(q.sourceOverride).toBe("others");
    expect(q.pyqYear).toBeUndefined();
  });

  it("PYQ-S-2026-CHEMRXN-011 is filed under acids-bases-and-salts; CHEMRXN-013 under life-processes", () => {
    expect((rawById.get("PYQ-S-2026-CHEMRXN-011") as Row).topicKey).toBe("acids-bases-and-salts");
    expect((rawById.get("PYQ-S-2026-CHEMRXN-013") as Row).topicKey).toBe("life-processes");
  });
});
