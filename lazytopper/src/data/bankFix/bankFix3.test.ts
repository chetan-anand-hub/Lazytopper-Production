// @vitest-environment node
/**
 * BANK-FIX-3 PR-A — pins over the ASSEMBLED bank (RAW_CANONICAL_QUESTION_BANK / canonicalQuestionBank),
 * never a source text-scan. The ledger is `BANK_FIX_3` (bankFix3Ledger.ts).
 *
 *   1. ids unchanged: every ledger id is still in the raw bank; ledger ids are unique.
 *   2. withheld => not served; restored => served and out of every withhold list / category map.
 *   3. changed rows are pinned to their final key / answer (and the removed text is gone).
 *   4. ruling 2: every Others row here is not PYQ and carries no year / set / isPYQ.
 *   5. no served row carries scratch-pad text in answer / finalAnswer / explanation / solutionSteps —
 *      with a mutation proof that the detector fires on the original snippets and on an injected row.
 *   6. step marks: the re-balanced rows' "[N mark]" prefixes sum to the row's marks.
 *   7. the restored rows carry a mapped, in-syllabus volume label (never "Conversion of Solids").
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import {
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  canonicalQuestionBank,
} from "../canonicalQuestionBank";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { conceptForSubtopic } from "../concepts/conceptLabelMap";
import { highlyProbableQuestions } from "../highlyProbableQuestions";
import { BANK_FIX_1_PR2_WITHHOLD_CATEGORY } from "./bankFix1Pr2Withholds";
import { BANK_FIX_3, BANK_FIX_3_RESTORED_IDS, SCRATCH_TEXT_RE } from "./bankFix3Ledger";

type Row = Record<string, unknown> & { id: string };
const raw = RAW_CANONICAL_QUESTION_BANK as unknown as Row[];
const bankById = new Map(raw.map((q) => [q.id, q]));
// HPQ rows name their stem `question`; expose it as questionText so one text check covers both surfaces.
const hpqById = new Map(
  highlyProbableQuestions.flatMap((b) => b.questions).map((q) => {
    const r = q as unknown as Row;
    return [r.id, { ...r, questionText: r.question } as Row] as const;
  }),
);
const rowOf = (e: { id: string; surface?: "hpq" }) => (e.surface === "hpq" ? hpqById.get(e.id) : bankById.get(e.id));
const rawById = bankById;
const served = canonicalQuestionBank as unknown as Row[];
const servedIds = new Set(served.map((q) => q.id));
const keyOf = (q: Row) => String(q.answer ?? q.finalAnswer ?? "");
const optionsOf = (q: Row) => (q.options as string[] | undefined) ?? [];
const textOf = (q: Row, fields: readonly string[]) =>
  fields.map((f) => (Array.isArray(q[f]) ? (q[f] as unknown[]).join("\n") : String(q[f] ?? ""))).join("\n");

/** Every scratch-text hit in the SOLUTION fields of the given rows. */
function scratchHits(rows: readonly Row[]): string[] {
  const out: string[] = [];
  for (const q of rows) {
    for (const f of ["answer", "finalAnswer", "explanation", "solutionSteps"]) {
      const v = q[f];
      (Array.isArray(v) ? v : [v]).forEach((t, i) => {
        if (typeof t === "string" && SCRATCH_TEXT_RE.test(t)) out.push(`${q.id}:${f}[${i}]`);
      });
    }
  }
  return out;
}

describe("BANK-FIX-3 · ledger and ids", () => {
  it("is non-vacuous and covers every verdict the lane used", () => {
    const by = (v: string) => BANK_FIX_3.filter((e) => e.verdict === v).length;
    expect(by("fixed")).toBe(14);
    expect(by("withheld")).toBe(2);
    expect(by("restored")).toBe(3);
    expect(by("held-for-resolve")).toBe(2);
    expect(by("flag-rejected")).toBe(7);
    expect(by("re-sourced-official")).toBe(1);
  });
  it("every ledger id is still on its surface (ids are never changed or deleted); ids are unique", () => {
    expect(BANK_FIX_3.filter((e) => !rowOf(e)).map((e) => e.id)).toEqual([]);
    expect(BANK_FIX_3.filter((e) => e.surface === "hpq").map((e) => e.id)).toEqual(["qe-comp-01"]);
    expect(new Set(BANK_FIX_3.map((e) => e.id)).size).toBe(BANK_FIX_3.length);
  });
});

describe("BANK-FIX-3 · withheld and restored", () => {
  it("withheld rows are in WITHHELD_QUESTION_IDS, categorised, and not served", () => {
    const w = BANK_FIX_3.filter((e) => e.verdict === "withheld");
    expect(w.map((e) => e.id)).toEqual(["Z3-QE-005", "Z3-QE-006"]);
    for (const e of w) {
      expect(WITHHELD_QUESTION_IDS.has(e.id), e.id).toBe(true);
      expect(servedIds.has(e.id), e.id).toBe(false);
      expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get(e.id), e.id).toBe("out-of-syllabus");
    }
  });
  it("restored rows are served and in no withhold list or category map", () => {
    expect([...BANK_FIX_3_RESTORED_IDS].sort()).toEqual(["SAV-N-EXEM2-12-LA-010", "SAV2-R06", "SAV2P1-R02"]);
    for (const id of BANK_FIX_3_RESTORED_IDS) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(false);
      expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.has(id), id).toBe(false);
      expect(servedIds.has(id), id).toBe(true);
    }
  });
  it("APQ-M-CIRC-009 had its answer fixed but stays withheld (figure not bound)", () => {
    expect(WITHHELD_QUESTION_IDS.has("APQ-M-CIRC-009")).toBe(true);
    expect(servedIds.has("APQ-M-CIRC-009")).toBe(false);
  });
});

describe("BANK-FIX-3 · changed rows are pinned to their final key / answer", () => {
  it("objective keys resolve (app resolver) to the pinned option", () => {
    const pinned = BANK_FIX_3.filter((e) => e.keyOptionIndex !== undefined);
    expect(pinned.length).toBe(11);
    const bad: string[] = [];
    for (const e of pinned) {
      const q = rawById.get(e.id)!;
      if (e.key !== undefined && String(q.answer) !== e.key) bad.push(`${e.id}: answer "${q.answer}" != "${e.key}"`);
      const idx = resolveCorrectOptionIndex(undefined, keyOf(q), optionsOf(q));
      if (idx !== e.keyOptionIndex) bad.push(`${e.id}: key resolves to ${idx}, pinned ${e.keyOptionIndex}`);
    }
    expect(bad).toEqual([]);
  });
  it("written keys carry their values; removed text is gone from the stem / answer / steps", () => {
    const bad: string[] = [];
    for (const e of BANK_FIX_3) {
      const q = rowOf(e)!;
      const sol = textOf(q, ["answer", "finalAnswer"]);
      for (const v of e.keyMustContain ?? []) if (!sol.includes(v)) bad.push(`${e.id}: missing ${v}`);
      const all = textOf(q, ["questionText", "answer", "finalAnswer", "explanation", "solutionSteps"]);
      for (const v of e.mustNotContain ?? []) if (all.includes(v)) bad.push(`${e.id}: still has ${v}`);
    }
    expect(bad).toEqual([]);
  });
  it("Z3-QE-002: four sub-parts, no maximum; APQ-M-CIRC-009 answer agrees with finalAnswer (c) 80°", () => {
    const z = rawById.get("Z3-QE-002")!;
    expect((String(z.questionText).match(/\((?:i|ii|iii|iv|v)\)/g) ?? [])).toEqual(["(i)", "(ii)", "(iii)", "(iv)"]);
    expect(String(z.finalAnswer)).toMatch(/\(iv\) 17 s$/);
    expect(textOf(z, ["questionText", "finalAnswer", "solutionSteps"])).not.toMatch(/maxim/i);
    const c = rawById.get("APQ-M-CIRC-009")!;
    expect(c.answer).toBe("80°");
    expect(String(c.finalAnswer)).toBe("(c) 80°");
  });
  it("held-for-resolve rows are unchanged (their keys stay until the blind re-solve rules)", () => {
    for (const e of BANK_FIX_3.filter((x) => x.verdict === "held-for-resolve")) {
      expect(rawById.get(e.id)!.answer, e.id).toBe(e.key);
    }
  });
});

describe("BANK-FIX-3 · ruling 2: Others rows are never PYQ / year-bearing", () => {
  it("every ledger row marked Others carries the override, no year / set / isPYQ, and is not PYQ", () => {
    const others = BANK_FIX_3.filter((e) => e.others);
    expect(others.length).toBe(13);
    const bad: string[] = [];
    for (const e of others) {
      const q = rawById.get(e.id)!;
      if (q.sourceOverride !== "others") bad.push(`${e.id}: no override`);
      if (q.pyqYear || q.pyqSet || q.isPYQ) bad.push(`${e.id}: year / set / isPYQ`);
      if (isPYQQuestion(q)) bad.push(`${e.id}: isPYQ`);
    }
    expect(bad).toEqual([]);
  });
});

describe("BANK-FIX-3 · no scratch-pad text is served", () => {
  it("no served row has scratch text in answer / finalAnswer / explanation / solutionSteps", () => {
    expect(served.length).toBeGreaterThan(9000);
    expect(scratchHits(served)).toEqual([]);
  });
  it("mutation proof: the detector fires on every original snippet this lane removed", () => {
    const removed = [
      "[1 mark] (a) Ca 1=1, O 2+2=3+1 wait: Ca(OH)₂ has 2 O",
      "4·x(x + 5) ⇒ 1800·5 = 4x² + 20x ⇒ wait: 360·[(x + 5) − x]",
      "From △ABC ~ △BCA (wait — use the third similarity)",
      "Wait — from △ACD ~ △ABC: AC/AB = CD/BC = AD/AC",
      "Medians AD = ½BC, PM = ½QR (wait, AD bisects BC at D",
      "Wait — combining with common denominator sinθ·cosθ·(sinθ−cosθ):",
      "Let me use a cleaner approach:",
      "Wait — let's factor more carefully:",
    ];
    expect(removed.filter((s) => !SCRATCH_TEXT_RE.test(s))).toEqual([]);
  });
  it("mutation proof: an injected scratch step in a served row is caught; content uses of 'wait' are not", () => {
    const victim = served.find((q) => q.id === "TRIG-PRF-D-003")!;
    const mutated = { ...victim, solutionSteps: [...(victim.solutionSteps as string[]), "Let me use a cleaner approach:"] };
    expect(scratchHits([mutated])).toEqual(["TRIG-PRF-D-003:solutionSteps[" + (victim.solutionSteps as string[]).length + "]"]);
    // Content, not scratch: a reflex arc "does not wait for the brain".
    expect(SCRATCH_TEXT_RE.test("the reflex arc in the spinal cord does not wait for the brain")).toBe(false);
    expect(SCRATCH_TEXT_RE.test("at least half the patients wait less than 20 minutes")).toBe(false);
  });
});

describe("BANK-FIX-3 · step marks", () => {
  const sumMarks = (q: Row) =>
    (q.solutionSteps as string[]).reduce((s, t) => s + Number(/^\[(\d+(?:\.\d+)?) marks?\]/.exec(t)?.[1] ?? NaN), 0);
  it("the re-balanced / edited rows with [N mark] prefixes sum to the row's marks", () => {
    for (const id of ["Z3-QE-002", "CHEM-NCERT-1-SA-008"]) {
      const q = rawById.get(id)!;
      expect(sumMarks(q), id).toBe(q.marks);
    }
    expect((rawById.get("Z3-QE-002")!.solutionSteps as string[]).length).toBe(4);
  });
});

describe("BANK-FIX-3 · restored rows carry a mapped in-syllabus volume label", () => {
  it("each restored row's subtopic maps to an Exam Trends concept and is not a conversion label", () => {
    for (const id of BANK_FIX_3_RESTORED_IDS) {
      const q = rawById.get(id)!;
      expect(q.topicKey, id).toBe("surface-areas-and-volumes");
      expect(conceptForSubtopic(String(q.topicKey), String(q.subtopic)), id).toBeTruthy();
      expect(String(q.subtopic), id).not.toMatch(/conversion|recast|transformation/i);
    }
  });
});

describe("BANK-FIX-3 · CI-1 sweep #1 rewrites", () => {
  it("qe-comp-01 (HPQ): four [1 mark] steps summing to 4; (iii) asks only for the equal root", () => {
    const q = hpqById.get("qe-comp-01")!;
    const steps = q.solutionSteps as string[];
    expect(steps.length).toBe(4);
    expect(steps.every((t) => t.startsWith("[1 mark]"))).toBe(true);
    expect(q.marks).toBe(4);
    expect(String(q.question)).not.toMatch(/greatest|maxim|highest/i);
  });
  it("2026-TRIG-P1-E-010: only standard angles, and at most two of them (two right triangles)", () => {
    const q = bankById.get("2026-TRIG-P1-E-010")!;
    const angles = [...String(q.questionText).matchAll(/(\d+) deg/g)].map((m) => Number(m[1]));
    expect(angles).toEqual([30, 60]);
    expect(textOf(q, ["questionText", "answer", "finalAnswer", "solutionSteps"])).not.toMatch(/tan of the new angle|tan new angle/);
  });
  it("APQ-M-TRIG-002: no complementary-angle conversion in the solution", () => {
    const q = bankById.get("APQ-M-TRIG-002")!;
    expect(textOf(q, ["solutionSteps", "explanation"])).not.toMatch(/cos ∠|90° − ∠UPQ/);
  });
  it("ARC-H04: the shaded region is the quadrant minus its OWN triangle OAB", () => {
    const q = bankById.get("ARC-H04")!;
    expect(String(q.questionText)).toMatch(/triangle OAB/);
    expect(String(q.finalAnswer)).toBe("(i) 9.625 cm² (ii) 3.5 cm²");
  });
});

describe("BANK-FIX-3 · PYQ-M-2025-SAV-004 is official again (CBSE 2025, 30/3/1 Q35)", () => {
  it("no override, official year / set, served as PYQ, steps on the official 1 + ½ + 1 + 1 + ½ + 1 scheme", () => {
    const q = bankById.get("PYQ-M-2025-SAV-004")!;
    expect(servedIds.has(q.id)).toBe(true);
    expect(q.sourceOverride).toBeUndefined();
    expect([q.pyqYear, q.pyqSet, q.ncertRef]).toEqual(["2025", "1", "PYQ 30/3/1 Q35"]);
    expect(isPYQQuestion(q)).toBe(true);
    const marks = (q.solutionSteps as string[]).map((t) => Number(/^\[(\d+(?:\.\d+)?) mark\]/.exec(t)?.[1]));
    expect(marks).toEqual([1, 0.5, 1, 1, 0.5, 1]);
    expect(q.marks).toBe(5);
    expect(conceptForSubtopic(String(q.topicKey), String(q.subtopic))).toBeTruthy();
  });
});
