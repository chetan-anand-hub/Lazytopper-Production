// @vitest-environment node
/**
 * PYQ-RESTORE-A - pins over the ASSEMBLED bank for the ledger (pyqRestoreALedger.ts).
 *
 *   1. ledger shape: one entry per id, the stated file holds the row, `ref` is the row's ncertRef, counts are non-vacuous.
 *   2. restored rows: served (not withheld), still PYQ (pyqYear, no Others override), every step "[N mark]"-prefixed and
 *      summing to the row's marks, at least the CLAUDE.md §13 step minimum for its section, publishable, and free of the
 *      extraction residue that withheld them (private-use glyphs, placeholder answers, scheme tallies).
 *   3. kept rows: still withheld.
 *   4. blind re-solve results: the key each restored row now carries is pinned.
 */
import { describe, expect, it, vi } from "vitest";

// PracticePage reaches services/cbseExamDate, which reads the clock at module load. Stubbed exactly as pyqRestore1.test.ts does.
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

import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank, AI_GENERATED_QUESTION_IDS } from "../canonicalQuestionBank";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { questionMatchesFilters } from "../../pages/PracticePage";
import { isPublishable } from "../../../scripts/seo/publishability";
import { PYQ_RESTORE_A_MATHS, PYQ_RESTORE_A_MATHS_KEPT, PYQ_RESTORE_A_COUNTS, PYQ_RESTORE_A_SCIENCE, PYQ_RESTORE_A_REFILED, PYQ_RESTORE_A_SCIENCE_KEPT } from "./pyqRestoreALedger";

type Row = Record<string, unknown> & { id: string; marks: number; section?: string; questionText: string };
const RAW = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const SERVED = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;
const MIN_STEPS: Record<string, number> = { A: 1, B: 2, C: 3, D: 5, E: 4 };
// the residue that withheld these rows: private-use glyphs, placeholders, scheme tallies, page stamps
const RESIDUE = /[-]|See marking scheme|Refer to (the )?(official )?CBSE|½ ½|X_086_|SECTION\s*[–-]\s*[A-E]\b|MARKING SCHEME/;

// file -> ids, read as modules (never as text)
const packs = import.meta.glob("../questionBanks/class10/*/*.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const FILE_OF = new Map<string, string>();
for (const [path, mod] of Object.entries(packs)) {
  const file = path.replace("../questionBanks/class10/", "");
  for (const v of Object.values(mod)) if (Array.isArray(v)) for (const q of v as Row[]) if (q && typeof q.id === "string" && !FILE_OF.has(q.id)) FILE_OF.set(q.id, file);
}

describe("PYQ-RESTORE-A · ledger", () => {
  it("one entry per id, Maths PYQ rows, in the stated file, ref = the row's ncertRef; counts non-vacuous", () => {
    const ids = PYQ_RESTORE_A_MATHS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(PYQ_RESTORE_A_COUNTS.mathsRestored);
    expect(PYQ_RESTORE_A_COUNTS.mathsRestored).toBe(13);
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_A_MATHS) {
      const q = RAW.get(e.id);
      if (!q) { bad.push(`${e.id}: missing`); continue; }
      if (!e.id.startsWith("PYQ-M-")) bad.push(`${e.id}: not a Maths PYQ`);
      if (FILE_OF.get(e.id) !== e.file) bad.push(`${e.id}: file ${String(FILE_OF.get(e.id))} != ${e.file}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if (q.topicKey !== e.chapterAfter) bad.push(`${e.id}: topicKey ${String(q.topicKey)}`);
      if (!e.resolve.startsWith("agree:")) bad.push(`${e.id}: blind re-solve did not agree`);
      if (e.fields.length === 0 || e.before.length < 10 || e.syllabus.length < 10) bad.push(`${e.id}: thin entry`);
      if (PYQ_RESTORE_A_MATHS_KEPT[e.id]) bad.push(`${e.id}: both restored and kept`);
    }
    expect(bad).toEqual([]);
  });
});

describe("PYQ-RESTORE-A · restored rows hold in the assembled bank", () => {
  it("served, PYQ, step-marked to their marks at the §13 minimum, publishable, residue-free", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_A_MATHS) {
      const q = RAW.get(e.id)!;
      if (WITHHELD_QUESTION_IDS.has(e.id) || !SERVED.has(e.id)) bad.push(`${e.id}: not served`);
      if (!q.pyqYear || q.sourceOverride !== undefined || !isPYQQuestion(q as never)) bad.push(`${e.id}: not PYQ`);
      if (!questionMatchesFilters(q as never, "all", "all", "pyq", "all", null)) bad.push(`${e.id}: not in the PYQ filter`);
      const steps = (q.solutionSteps as string[] | undefined) ?? [];
      const marks = steps.map((s) => Number(STEP.exec(s)?.[1] ?? NaN));
      if (marks.some((m) => !Number.isFinite(m))) bad.push(`${e.id}: unlabelled step`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - Number(q.marks)) > 1e-9) bad.push(`${e.id}: steps do not sum to ${q.marks}`);
      if (steps.length < (MIN_STEPS[String(q.section)] ?? 1)) bad.push(`${e.id}: ${steps.length} steps < §13 minimum for section ${String(q.section)}`);
      const v = isPublishable(q as never, AI_GENERATED_QUESTION_IDS);
      if (!v.ok) bad.push(`${e.id}: not publishable (${v.reason})`);
      const text = [q.questionText, ...((q.options as string[] | undefined) ?? []), String(q.answer ?? ""), String(q.finalAnswer ?? ""), ...steps].join("\n");
      if (RESIDUE.test(text)) bad.push(`${e.id}: residue ${RESIDUE.exec(text)![0]}`);
      if (Array.isArray(q.options) && q.options.length && !(q.options as string[]).includes(String(q.answer))) bad.push(`${e.id}: MCQ key is not an option`);
      if (/\bOR\b/.test(q.questionText) && !/\bOR\b/.test(String(q.answer))) bad.push(`${e.id}: OR row answers one alternative`);
    }
    expect(bad).toEqual([]);
  });

  it("the rows the audit named carry the repaired notation", () => {
    expect(RAW.get("PYQ-M-RN-004")!.questionText).toContain("4ⁿ");
    expect(RAW.get("PYQ-M-2026-REALNUM-005")!.questionText).toContain("(2 + 3√5)/7");
    expect(RAW.get("PYQ-M-2026-TRI-003")!.questionText).toBe("D is a point on the side BC of △ABC such that ∠CAB = ∠CDA. Show that CA² = CB × CD.");
  });

  it("blind re-solve keys are pinned", () => {
    const fin = (id: string) => `${String(RAW.get(id)!.finalAnswer ?? "")} ${String(RAW.get(id)!.answer ?? "")}`;
    expect(fin("PYQ-M-QE-004")).toContain("x² – 6x + 7 = 0");
    expect(fin("PYQ-M-QE-008")).toContain("p = 3");
    expect(fin("PYQ-M-STAT-009")).toContain("b = 8");
    expect(fin("PYQ-M-2025-STAT-003")).toContain("146.75");
    expect(fin("PYQ-M-2025-STAT-006")).toContain("775");
  });
});

describe("PYQ-RESTORE-A · rows kept out", () => {
  it("every kept row is still withheld", () => {
    for (const id of Object.keys(PYQ_RESTORE_A_MATHS_KEPT)) {
      expect(RAW.has(id), id).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(id), `${id} must stay withheld`).toBe(true);
    }
  });
});

describe("PYQ-RESTORE-A part 2 · Science ledger", () => {
  it("one entry per id across restored + re-filed, in the stated file, ref = ncertRef, chapterAfter = topicKey; counts non-vacuous", () => {
    const all = [...PYQ_RESTORE_A_SCIENCE, ...PYQ_RESTORE_A_REFILED];
    const ids = all.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PYQ_RESTORE_A_SCIENCE.length).toBe(PYQ_RESTORE_A_COUNTS.scienceRestored);
    expect(PYQ_RESTORE_A_REFILED.length).toBe(PYQ_RESTORE_A_COUNTS.refiled);
    expect(PYQ_RESTORE_A_COUNTS.scienceRestored).toBe(66);
    expect(PYQ_RESTORE_A_COUNTS.refiled).toBe(14);
    const bad: string[] = [];
    for (const e of all) {
      const q = RAW.get(e.id);
      if (!q) { bad.push(`${e.id}: missing`); continue; }
      if (q.subject !== "Science") bad.push(`${e.id}: not Science`);
      if (FILE_OF.get(e.id) !== e.file) bad.push(`${e.id}: file ${String(FILE_OF.get(e.id))} != ${e.file}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)}`);
      if (q.topicKey !== e.chapterAfter) bad.push(`${e.id}: topicKey ${String(q.topicKey)} != ${e.chapterAfter}`);
      if (e.verdict === "restored" && !e.resolve.startsWith("agree:")) bad.push(`${e.id}: blind re-solve did not agree`);
      if (e.verdict === "refiled" && e.chapterBefore === e.chapterAfter) bad.push(`${e.id}: re-filed to the same chapter`);
      if (PYQ_RESTORE_A_SCIENCE_KEPT[e.id] && e.verdict === "restored") bad.push(`${e.id}: both restored and kept`);
    }
    expect(bad).toEqual([]);
  });

  it("restored Science rows: served, step-marked to their marks at the §13 minimum, publishable, residue-free, OR answered", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_A_SCIENCE) {
      const q = RAW.get(e.id)!;
      if (WITHHELD_QUESTION_IDS.has(e.id) || !SERVED.has(e.id)) bad.push(`${e.id}: not served`);
      if (e.id.startsWith("PYQ-") && (!q.pyqYear || q.sourceOverride !== undefined || !isPYQQuestion(q as never))) bad.push(`${e.id}: not PYQ`);
      const steps = (q.solutionSteps as string[] | undefined) ?? [];
      const marks = steps.map((s) => Number(STEP.exec(s)?.[1] ?? NaN));
      if (marks.some((m) => !Number.isFinite(m))) bad.push(`${e.id}: unlabelled step`);
      if (Math.abs(marks.reduce((a, b) => a + b, 0) - Number(q.marks)) > 1e-9) bad.push(`${e.id}: steps do not sum to ${q.marks}`);
      if (steps.length < (MIN_STEPS[String(q.section)] ?? 1)) bad.push(`${e.id}: ${steps.length} steps < §13 minimum for section ${String(q.section)}`);
      const v = isPublishable(q as never, AI_GENERATED_QUESTION_IDS);
      if (!v.ok) bad.push(`${e.id}: not publishable (${v.reason})`);
      const text = [q.questionText, ...((q.options as string[] | undefined) ?? []), String(q.answer ?? ""), String(q.finalAnswer ?? ""), ...steps].join("\n");
      if (RESIDUE.test(text)) bad.push(`${e.id}: residue ${RESIDUE.exec(text)![0]}`);
      if (/\b(\d+\s+){2,}\d+\s*$|X_\d|Page-|\*{6}/.test(text)) bad.push(`${e.id}: tally/page residue`);
      if (Array.isArray(q.options) && q.options.length && !(q.options as string[]).includes(String(q.answer))) bad.push(`${e.id}: MCQ key is not an option`);
      if (/\bOR\b/.test(q.questionText) && !/\bOR\b/.test(String(q.answer))) bad.push(`${e.id}: OR row answers one alternative`);
    }
    expect(bad).toEqual([]);
  });

  it("re-filed rows sit in their true chapter; served ones are served there, withheld ones stay withheld", () => {
    const bad: string[] = [];
    for (const e of PYQ_RESTORE_A_REFILED) {
      const q = RAW.get(e.id)!;
      if (q.topicKey !== e.chapterAfter) bad.push(`${e.id}: ${q.topicKey}`);
      const keptOut = e.resolve.startsWith("n/a: row stays withheld");
      if (keptOut !== WITHHELD_QUESTION_IDS.has(e.id)) bad.push(`${e.id}: withheld state changed`);
    }
    expect(bad).toEqual([]);
  });

  it("blind re-solve keys and repaired notation are pinned", () => {
    const fin = (id: string) => `${String(RAW.get(id)!.finalAnswer ?? "")} ${String(RAW.get(id)!.answer ?? "")}`;
    expect(fin("PYQ-S-CHEM-010")).toContain("3MnO2 + 4Al → 3Mn + 2Al2O3");
    expect(fin("PYQ-S-LIGHT-013")).toContain("37.5");
    expect(fin("PYQ-S-LIGHT-014")).toContain("2.25 × 10⁸");
    expect(fin("PYQ-S-LIGHT-015")).toContain("−0.4 m");
    expect(RAW.get("PYQ-S-LIGHT-015")!.questionText).toContain("− 2·5 D");
    expect(fin("PYQ-S-ELEC-005")).toContain("60/11");
    expect(fin("PYQ-S-ENV-003")).toContain("5000 J");
    expect(fin("PYQ-S-2025-ELEC-008")).toContain("1.1 × 10⁻⁶ Ω m");
    expect(fin("PYQ-S-2025-LIGHT-009")).toContain("−20 cm");
    expect(fin("PYQ-S-2026-HERED-011")).toContain("9 : 3 : 3 : 1");
    expect(fin("PYQ-S-2026-HERED-007")).toContain("25%");
    expect(String(RAW.get("PYQ-S-2025-LIGHT-007")!.answer)).toBe("(9/4) × 10⁸ m/s");
    expect(String(RAW.get("PYQ-S-2026-LIFEP-006")!.answer)).toContain("Lactic acid");
    expect(fin("PYQ-S-2024-CHEMRXN-014")).toContain("2Pb(NO3)2 → 2PbO + 4NO2 + O2");
  });

  it("kept-out Science rows are still withheld", () => {
    for (const id of Object.keys(PYQ_RESTORE_A_SCIENCE_KEPT)) {
      expect(RAW.has(id), id).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(id), `${id} must stay withheld`).toBe(true);
    }
  });
});
