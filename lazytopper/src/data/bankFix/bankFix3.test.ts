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
 *   8. PR-B: the nine official-text-repaired rows the bf3b blind re-solve agreed with are SERVED (served bank, served id
 *      index, lazy chapter pool) with their bound figure; APQ-M-CIRC-009 (D37) and PYQ-M-2024-CIRC-011a stay withheld.
 * This file never reads the clock.
 */
import { beforeAll, describe, expect, it } from "vitest";
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
import { BANK_FIX_3, BANK_FIX_3_RESTORED_IDS, BANK_FIX_3_SERVED_AFTER_RESOLVE_IDS, SCRATCH_TEXT_RE } from "./bankFix3Ledger";
import { getFiguresForQuestion } from "../visualConceptRegistry";
import { BOUND_BUT_WITHHELD } from "../figures/mathsFigureVisuals";
import { bankRowMeta } from "../bankChapters/bankIdIndex";
import { ensureBankChapters, getBankRows } from "../bankChapters/loader";
import { resolveCanonicalSlug } from "../bankQuery";

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
    expect(by("fixed")).toBe(18);
    expect(by("withheld")).toBe(3);
    expect(by("restored")).toBe(2);
    expect(by("held-for-resolve")).toBe(0);
    expect(by("flag-rejected")).toBe(7);
    expect(by("re-sourced-official")).toBe(2);
    expect(by("official-text-repaired")).toBe(10);
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
    expect(w.map((e) => e.id)).toEqual(["Z3-QE-005", "Z3-QE-006", "SAV2P1-R02"]);
    for (const e of w) {
      expect(WITHHELD_QUESTION_IDS.has(e.id), e.id).toBe(true);
      expect(servedIds.has(e.id), e.id).toBe(false);
      expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get(e.id), e.id).toBe(e.category);
    }
    // D32: the kept official twin is served.
    expect(servedIds.has("SAV-N-EXEM2-12-LA-010")).toBe(true);
  });
  it("restored rows are served and in no withhold list or category map", () => {
    expect([...BANK_FIX_3_RESTORED_IDS].sort()).toEqual(["SAV-N-EXEM2-12-LA-010", "SAV2-R06"]);
    for (const id of BANK_FIX_3_RESTORED_IDS) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(false);
      expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.has(id), id).toBe(false);
      expect(servedIds.has(id), id).toBe(true);
    }
  });
  it("APQ-M-CIRC-009 had its answer fixed; its figure is bound (#1015) but it stays withheld (D37: the official item is inconsistent)", () => {
    expect(WITHHELD_QUESTION_IDS.has("APQ-M-CIRC-009")).toBe(true);
    expect(servedIds.has("APQ-M-CIRC-009")).toBe(false);
    expect(BANK_FIX_3.find((e) => e.id === "APQ-M-CIRC-009")?.resolve).toBe("official-inconsistent");
    expect(BOUND_BUT_WITHHELD["APQ-M-CIRC-009"]).toMatch(/D37.*53.13°.*∠K = 50°/);
  });
});

describe("BANK-FIX-3 · changed rows are pinned to their final key / answer", () => {
  it("objective keys resolve (app resolver) to the pinned option", () => {
    const pinned = BANK_FIX_3.filter((e) => e.keyOptionIndex !== undefined);
    expect(pinned.length).toBe(17);
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
  it("REP-M13 / PLE-N01 (blind re-solve agreed with the key): one [1 mark] step for option (a), no other option letter", () => {
    for (const [id, fa] of [["REP-M13", "Both A and R are true, and R is the correct explanation of A."], ["PLE-N01", "Parallel lines"]] as const) {
      const q = rawById.get(id)!;
      const steps = q.solutionSteps as string[];
      expect(steps.length, id).toBe(1);
      expect(steps[0].startsWith("[1 mark] (a)"), id).toBe(true);
      expect(steps[0], id).not.toMatch(/\(([b-dB-D])\)/);
      expect(q.finalAnswer, id).toBe(fa);
      expect(q.answer, id).toBe(fa);
    }
  });
});

describe("BANK-FIX-3 · ruling 2: Others rows are never PYQ / year-bearing", () => {
  it("every ledger row marked Others carries the override, no year / set / isPYQ, and is not PYQ", () => {
    const others = BANK_FIX_3.filter((e) => e.others);
    expect(others.length).toBe(12);
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
  it.each([
    ["2026-TRIG-P1-E-010", [30, 60]],
    ["2026-TRIG-P1-E-001", [45, 30]],
    ["2026-TRIG-P1-E-005", [60, 30]],
    ["2026-TRIG-P1-E-008", [45, 30]],
  ] as const)("%s: only standard angles, and at most two of them (two right triangles)", (id, want) => {
    const q = bankById.get(id)!;
    const angles = [...String(q.questionText).matchAll(/(\d+) deg/g)].map((m) => Number(m[1]));
    expect(angles).toEqual([...want]);
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

describe("BANK-FIX-3 PR-B · official-text repair of the figure-bound withheld rows", () => {
  const repaired = BANK_FIX_3.filter((e) => e.verdict === "official-text-repaired" || e.id === "APQ-M-CIRC-009");
  const stepMarks = (q: Row) => (q.solutionSteps as string[]).map((t) => Number(/^\[(\d+(?:\.\d+)?) marks?\] /.exec(t)?.[1] ?? NaN));
  it("covers exactly the eleven PR-B rows", () => {
    expect(repaired.map((e) => e.id).sort()).toEqual([
      "APQ-M-CIRC-009", "PYQ-M-2024-CIRC-003", "PYQ-M-2024-CIRC-010a", "PYQ-M-2024-CIRC-011a", "PYQ-M-2026-TRI-004",
      "PYQ-M-CIRC-006", "PYQ-M-CIRC-007", "PYQ-M-CIRC-013", "PYQ-M-TRI-002", "PYQ-M-TRI-003", "PYQ-M-TRI-004",
    ]);
  });
  const SERVED_NINE = [
    "PYQ-M-2024-CIRC-003", "PYQ-M-2024-CIRC-010a", "PYQ-M-2026-TRI-004", "PYQ-M-CIRC-006", "PYQ-M-CIRC-007",
    "PYQ-M-CIRC-013", "PYQ-M-TRI-002", "PYQ-M-TRI-003", "PYQ-M-TRI-004",
  ];
  const STILL_WITHHELD = ["APQ-M-CIRC-009", "PYQ-M-2024-CIRC-011a"];
  beforeAll(async () => {
    await ensureBankChapters(SERVED_NINE.map((id) => String(rawById.get(id)!.topicKey)));
  });
  it("the bf3b re-solve agreed on exactly nine rows; the ledger marks them agree", () => {
    expect([...BANK_FIX_3_SERVED_AFTER_RESOLVE_IDS].sort()).toEqual(SERVED_NINE);
    expect(repaired.filter((e) => e.resolve === "agree").map((e) => e.id).sort()).toEqual(SERVED_NINE);
  });
  it("the nine are SERVED: out of every withhold list / category map / BOUND_BUT_WITHHELD, in the served id index and the chapter pool", () => {
    const bad: string[] = [];
    for (const id of SERVED_NINE) {
      const q = rawById.get(id)!;
      if (WITHHELD_QUESTION_IDS.has(id)) bad.push(`${id}: in WITHHELD_QUESTION_IDS`);
      if (BANK_FIX_1_PR2_WITHHOLD_CATEGORY.has(id)) bad.push(`${id}: in the category map`);
      if (Object.prototype.hasOwnProperty.call(BOUND_BUT_WITHHELD, id)) bad.push(`${id}: in BOUND_BUT_WITHHELD`);
      if (!servedIds.has(id)) bad.push(`${id}: not in canonicalQuestionBank`);
      if (bankRowMeta(id)?.topicKey !== q.topicKey) bad.push(`${id}: not in the served id index`);
      const slug = resolveCanonicalSlug(String(q.topicKey));
      if (!getBankRows([slug]).some((r) => r.id === id)) bad.push(`${id}: not in the ${slug} chapter pool`);
    }
    expect(bad).toEqual([]);
  });
  it("APQ-M-CIRC-009 and PYQ-M-2024-CIRC-011a stay withheld and are not served", () => {
    for (const id of STILL_WITHHELD) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(servedIds.has(id), id).toBe(false);
      expect(bankRowMeta(id), id).toBeNull();
    }
    expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get("APQ-M-CIRC-009")).toBe("figure");
    expect(BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get("PYQ-M-2024-CIRC-011a")).toBe("duplicate");
  });
  it("stems carry the restored official symbols and no extraction residue", () => {
    const bad: string[] = [];
    for (const e of repaired) {
      const q = rawById.get(e.id)!;
      const stem = String(q.questionText);
      for (const v of e.stemMustContain ?? []) if (!stem.includes(v)) bad.push(`${e.id}: stem missing ${v}`);
      const all = textOf(q, ["questionText", "options", "answer", "finalAnswer", "solutionSteps"]);
      if (/[\u00d0\ue000-\uf8ff\u0d6c\u0d70]|\d ?o\b|\b3 OR\b|\s=\s=\s/u.test(all)) bad.push(`${e.id}: residue`);
    }
    expect(bad).toEqual([]);
  });
  it("official rows stay official: no Others override; PYQ rows keep year / set and are PYQ", () => {
    for (const e of repaired) {
      const q = rawById.get(e.id)!;
      expect(q.sourceOverride, e.id).toBeUndefined();
      if (e.id.startsWith("PYQ-")) {
        expect(q.pyqYear && q.pyqSet, e.id).toBeTruthy();
        expect(isPYQQuestion(q), e.id).toBe(true);
      }
    }
  });
  it("[N mark] step prefixes sum to the row's marks (official ½ steps as 0.5)", () => {
    for (const e of repaired) {
      const q = rawById.get(e.id)!;
      const m = stepMarks(q);
      expect(m.every((x) => Number.isFinite(x)), e.id).toBe(true);
      expect(m.reduce((a, b) => a + b, 0), e.id).toBe(q.marks);
    }
    expect(stepMarks(rawById.get("PYQ-M-CIRC-013")!)).toEqual([1, 1, 0.5, 0.5]);
    expect(stepMarks(rawById.get("PYQ-M-2024-CIRC-010a")!)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(stepMarks(rawById.get("PYQ-M-2026-TRI-004")!)).toEqual([1, 1]);
  });
  it("every row but the 011a duplicate resolves to its bound official figure", () => {
    for (const e of repaired) {
      const n = getFiguresForQuestion(e.id).length;
      expect(n, e.id).toBe(e.id === "PYQ-M-2024-CIRC-011a" ? 0 : 1);
    }
  });
  it("PYQ-M-2026-TRI-004 is coordinate geometry with a mapped in-syllabus label", () => {
    const q = rawById.get("PYQ-M-2026-TRI-004")!;
    expect([q.topicKey, q.subtopic]).toEqual(["coordinate-geometry", "Section Formula and Distance Formula"]);
    expect(conceptForSubtopic(String(q.topicKey), String(q.subtopic))).toBeTruthy();
    // Served under coordinate geometry, never triangles.
    expect(getBankRows(["coordinate-geometry"]).some((r) => r.id === q.id)).toBe(true);
    expect(getBankRows(["triangles"]).some((r) => r.id === q.id)).toBe(false);
  });
});
