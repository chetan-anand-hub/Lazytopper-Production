// @vitest-environment node
/**
 * PYQ-RESTORE-1 - pins over the ASSEMBLED bank for the provenance ledger (pyqRestore1Ledger.ts),
 * run once per subject (PR-1 Maths, PR-2 Science).
 *
 *   1. ledger shape: one entry per id; every entry cites an official cbse.gov.in question paper and
 *      marking scheme with a 64-hex SHA-256; counts match the ledger's own COUNTS.
 *   2. restored rows (owner ruling (a)): served, carry the confirmed pyqYear / pyqSet and the ledger's
 *      paper reference, no `sourceOverride`, and are PYQ for both matchers and the Practice filter.
 *   3. kept-others rows: still `sourceOverride: "others"`, no year / set, never PYQ.
 *   4. labelled rows: every step carries a "[N mark]" prefix, the prefixes are exactly the ledger's
 *      `stepMarks`, and they sum to the row's marks.
 *   5. the served bank total is unchanged (no row added or withheld by this lane).
 */
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";

// PracticePage is imported only for its pure `questionMatchesFilters`; it reaches services/cbseExamDate,
// which reads the clock at module load. Stubbed exactly as bankFix1.pr2.test.ts does.
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

import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../canonicalQuestionBank";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { isPYQQuestion as engineIsPYQQuestion } from "../practiceSetGenerator";
import { questionMatchesFilters } from "../../pages/PracticePage";
import {
  PYQ_RESTORE_1_MATHS,
  PYQ_RESTORE_1_MATHS_COUNTS,
  PYQ_RESTORE_1_MATHS_SOURCES,
  PYQ_RESTORE_1_SCIENCE,
  PYQ_RESTORE_1_SCIENCE_COUNTS,
  PYQ_RESTORE_1_SCIENCE_SOURCES,
  PYQ_RESTORE_1_RESTORED_IDS,
} from "./pyqRestore1Ledger";

type Row = Record<string, unknown> & { id: string };
const bankById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as unknown as Row]));
const servedIds = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;

const SUBJECTS = [
  {
    name: "Maths",
    ledger: PYQ_RESTORE_1_MATHS,
    sources: PYQ_RESTORE_1_MATHS_SOURCES,
    counts: PYQ_RESTORE_1_MATHS_COUNTS,
    expected: { restored: 121, keptOthers: 15, labelled: 100, labelledYeared: 45 },
    ref: /^PYQ (30\/\d\/\d|30\(B\)) Q\d+(\([a-z]\))?$/,
    idPrefix: "PYQ-M-",
  },
  {
    name: "Science",
    ledger: PYQ_RESTORE_1_SCIENCE,
    sources: PYQ_RESTORE_1_SCIENCE_SOURCES,
    counts: PYQ_RESTORE_1_SCIENCE_COUNTS,
    expected: { restored: 81, keptOthers: 7, labelled: 98, labelledYeared: 79 },
    ref: /^PYQ 31\/\d\/\d Q\d+(\([a-z]\))?$/,
    idPrefix: "PYQ-S-",
  },
] as const;

describe.each(SUBJECTS)("PYQ-RESTORE-1 · $name", ({ name, ledger, sources, counts, expected, ref, idPrefix }) => {
  it("ledger shape: one entry per id, official sources with SHA-256", () => {
    expect(new Set(ledger.map((e) => e.id)).size).toBe(ledger.length);
    const bad: string[] = [];
    for (const e of ledger) {
      if (!e.id.startsWith(idPrefix)) bad.push(`${e.id}: not a ${name} row`);
      for (const [u, h] of [[e.qp, e.qpSha256], [e.ms, e.msSha256]] as const) {
        if (!/^https:\/\/www\.cbse\.gov\.in\/cbsenew\/(question-paper|[Mm]arking-[Ss]cheme)\/20\d\d\/X\/[^#]+\.zip#.+\.pdf$/.test(u)) bad.push(`${e.id}: url ${u}`);
        if (!/^[0-9a-f]{64}$/.test(h)) bad.push(`${e.id}: sha ${h}`);
        if ((sources as Record<string, string>)[u] !== h) bad.push(`${e.id}: source table disagrees for ${u}`);
      }
      if (!ref.test(e.ref)) bad.push(`${e.id}: ref ${e.ref}`);
      if (!/^20(23|24|25|26)$/.test(e.year)) bad.push(`${e.id}: year ${e.year}`);
      if (!e.qp.includes(`/question-paper/${e.year}/`) || !e.ms.toLowerCase().includes(`/marking-scheme/${e.year}/`)) bad.push(`${e.id}: paper year`);
    }
    expect(bad).toEqual([]);
  });

  it("counts match the ledger (non-vacuous)", () => {
    const n = (v: string) => ledger.filter((e) => e.verdict === v).length;
    expect(n("restored")).toBe(counts.restored);
    expect(n("kept-others")).toBe(counts.keptOthers);
    expect(n("labelled")).toBe(counts.labelledYeared);
    expect(ledger.filter((e) => e.stepMarks).length).toBe(counts.labelled);
    expect(counts).toEqual(expected);
  });

  it("ruling (a): restored rows are served, year / set / reference confirmed, no override, PYQ everywhere", () => {
    const bad: string[] = [];
    for (const e of ledger.filter((x) => x.verdict === "restored")) {
      const q = bankById.get(e.id);
      if (!q) { bad.push(`${e.id}: missing`); continue; }
      if (!servedIds.has(e.id)) bad.push(`${e.id}: not served`);
      if (q.sourceOverride !== undefined) bad.push(`${e.id}: still has sourceOverride`);
      if (q.pyqYear !== e.year || q.pyqSet !== e.set) bad.push(`${e.id}: year/set ${String(q.pyqYear)}/${String(q.pyqSet)}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if (!isPYQQuestion(q as never) || !engineIsPYQQuestion(q as never)) bad.push(`${e.id}: not PYQ`);
      if (!questionMatchesFilters(q as never, "all", "all", "pyq", "all", null)) bad.push(`${e.id}: not in the PYQ filter`);
      if (questionMatchesFilters(q as never, "all", "all", "others", "all", null)) bad.push(`${e.id}: still in Others`);
      if (!PYQ_RESTORE_1_RESTORED_IDS.has(e.id)) bad.push(`${e.id}: not in RESTORED_IDS`);
    }
    expect(bad).toEqual([]);
  });

  it("kept-others rows stay Others with no year", () => {
    const bad: string[] = [];
    for (const e of ledger.filter((x) => x.verdict === "kept-others")) {
      const q = bankById.get(e.id)!;
      if (q.sourceOverride !== "others") bad.push(`${e.id}: no override`);
      if (q.pyqYear || q.pyqSet) bad.push(`${e.id}: has a year`);
      if (isPYQQuestion(q as never)) bad.push(`${e.id}: isPYQ`);
    }
    expect(bad).toEqual([]);
  });

  it("every labelled row is fully step-marked with the ledger's marks, summing to its marks", () => {
    const bad: string[] = [];
    for (const e of ledger.filter((x) => x.stepMarks)) {
      const q = bankById.get(e.id)!;
      const steps = (q.solutionSteps as string[] | undefined) ?? [];
      const marks = steps.map((s) => Number(STEP.exec(s)?.[1] ?? NaN));
      if (marks.some((m) => !Number.isFinite(m))) bad.push(`${e.id}: unlabelled step`);
      if (JSON.stringify(marks) !== JSON.stringify(e.stepMarks)) bad.push(`${e.id}: marks ${marks.join(",")} != ledger ${e.stepMarks!.join(",")}`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - Number(q.marks)) > 1e-9) bad.push(`${e.id}: sum != ${String(q.marks)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("PYQ-RESTORE-1 · both subjects", () => {
  it("RESTORED_IDS is exactly the restored rows of both ledgers", () => {
    expect(PYQ_RESTORE_1_RESTORED_IDS.size).toBe(121 + 81);
  });
  it("served bank total is at least this lane's 10,580 (measured before and after this lane)", () => {
    // A floor, not an exact count: a later lane that adds rows must not break this pin; a lane
    // that withholds rows lowers the floor with a dated comment.
    // 18 Oct WITHHOLD-METAL-007: PYQ-S-2026-METAL-007 withheld (misfiled Biology row), measured by import 10580 -> 10579.
    // 19 Oct REFILE-PYQ2026-1: METAL-007 re-filed to control-and-coordination and served again, measured by import 10579 -> 10580.
    expect(canonicalQuestionBank.length).toBeGreaterThanOrEqual(10580);
  });
});

// Controller rulings on the PR-1 (#1236) review, applied in PR-2 (2026-10-18).
describe("PYQ-RESTORE-1 · #1236 review rulings", () => {
  it("PYQ-M-2024-TRIG-002 options read as the official 30/2/1 paper prints them", () => {
    const q = bankById.get("PYQ-M-2024-TRIG-002")!;
    expect(q.options).toEqual([
      "Both Assertion (A) and Reason (R) are true. Reason (R) is the correct explanation of Assertion (A).",
      "Both Assertion (A) and Reason (R) are true. Reason (R) does not give correct explanation of (A).",
      "Assertion (A) is true but Reason (R) is not true.",
      "Assertion (A) is not true but Reason (R) is true.",
    ]);
    expect(q.answer).toBe((q.options as string[])[0]);
  });
  it("PYQ-M-AP-001 key carries no stray mark digit", () => {
    const q = bankById.get("PYQ-M-AP-001")!;
    expect(q.finalAnswer).toBe("(b) 3");
    expect(q.solutionSteps).toEqual(["[1 mark] Correct option: (b) 3."]);
  });
  it("PYQ-M-2026-STAT-002 stays Others (kept-others, no year)", () => {
    expect(PYQ_RESTORE_1_MATHS.find((e) => e.id === "PYQ-M-2026-STAT-002")?.verdict).toBe("kept-others");
    expect(bankById.get("PYQ-M-2026-STAT-002")?.pyqYear).toBeUndefined();
  });
});

// Controller ruling (#1248 review): PYQ-S-2026-CHEMRXN-009 is withheld (bilingual column bleed, not
// served), so this lane leaves it exactly as it was. The hash is of the row as it stood on trunk
// 095277e5; a later re-extraction lane that repairs the row updates this pin deliberately.
describe("PYQ-RESTORE-1 · CHEMRXN-009 left unchanged", () => {
  const ID = "PYQ-S-2026-CHEMRXN-009";
  it("is withheld, not served, and in neither ledger", () => {
    expect(WITHHELD_QUESTION_IDS.has(ID)).toBe(true);
    expect(servedIds.has(ID)).toBe(false);
    expect([...PYQ_RESTORE_1_MATHS, ...PYQ_RESTORE_1_SCIENCE].some((e) => e.id === ID)).toBe(false);
  });
  it("row content is byte-for-byte what trunk had (no step labels added)", () => {
    const q = bankById.get(ID)!;
    expect(q).toBeDefined();
    expect((q.solutionSteps as string[]).some((s) => STEP.test(s))).toBe(false);
    expect(createHash("sha256").update(JSON.stringify(q)).digest("hex")).toBe("27393ea348c35450974c16029cfea64e2648b54e14feb9e7ece98e23c6ea2c56");
  });
});

// #1248 review nits: no doubled full stop in any ledger row's steps; MAG-004 rewritten per scheme mark.
describe("PYQ-RESTORE-1 · #1248 review nits", () => {
  it("no ledger row's solutionSteps contain a doubled full stop", () => {
    const bad: string[] = [];
    for (const e of [...PYQ_RESTORE_1_MATHS, ...PYQ_RESTORE_1_SCIENCE]) {
      const steps = (bankById.get(e.id)?.solutionSteps as string[] | undefined) ?? [];
      if (steps.some((s) => /(?<!\.)\.\.(?!\.)/.test(s))) bad.push(e.id);
    }
    expect(bad).toEqual([]);
  });
  it("PYQ-S-2025-MAG-004 has one step per scheme mark, parts (a) x3, (b) x2, (c) x1", () => {
    const steps = bankById.get("PYQ-S-2025-MAG-004")!.solutionSteps as string[];
    expect(steps.map((s) => s.match(/^\[0\.5 marks\] \(([abc])\)/)?.[1])).toEqual(["a", "a", "a", "b", "b", "c"]);
  });
});
