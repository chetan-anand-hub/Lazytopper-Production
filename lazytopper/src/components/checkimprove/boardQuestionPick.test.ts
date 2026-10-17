import { describe, it, expect, beforeAll } from "vitest";
import { ensureBankSubject, getBankRowsForSubject, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { syllabusExclusion } from "../../lib/boardQuestions/selectionRule";
import {
  boardTryLabel,
  boardTryText,
  chooseBoardTryRow,
  isBoardTryRow,
  isOfferableRow,
  pickBoardTryQuestion,
  type BoardTryRow,
} from "./boardQuestionPick";

/**
 * ACTIVATION-2 D — "Try a board question" fills ONE real CBSE board question, never a fabricated
 * or pre-graded sample. Pinned against the REAL served bank (withheld rows are not served).
 */
const SUBJECTS = ["Maths", "Science"] as const;
const served: Record<string, BoardTryRow[]> = {};

beforeAll(async () => {
  for (const s of SUBJECTS) {
    await ensureBankSubject(s);
    served[s] = getBankRowsForSubject(s) as unknown as BoardTryRow[];
  }
}, 120_000);

const GOOD: BoardTryRow = {
  id: "PYQ-S-2025-ELEC-004",
  subject: "Science",
  topicKey: "electricity",
  section: "B",
  marks: 2,
  format: "Short",
  questionText: "A voltage source sends a current of 2 A to a resistor of 40 Ω connected across it for 5 minutes. Calculate the electrical energy supplied by the source.",
  solutionSteps: ["[1 mark] E = I²Rt", "[1 mark] = 48000 J"],
  pyqYear: "2025",
  ncertRef: "PYQ 31/3/2 Q26",
};

describe("ACTIVATION-2 D · the board-question rule", () => {
  it("accepts a clean written Section B/C board row of 2-3 marks", () => {
    expect(isBoardTryRow(GOOD)).toBe(true);
  });

  it.each([
    ["an MCQ", { format: "MCQ", options: ["a", "b", "c", "d"] }],
    ["a 1-mark row", { marks: 1 }],
    ["a 5-mark row", { marks: 5 }],
    ["a Section E row", { section: "E" }],
    ["a row whose source was not confirmed", { sourceOverride: "others" }],
    ["a row with no board year", { pyqYear: undefined }],
    ["a non-board paper (SQP)", { ncertRef: "SQP 2024-25 Q22" }],
    ["a row needing a figure", { questionText: "In the given figure, O is the centre of the circle. Prove that PA = PB always holds." }],
    ["an internal-choice row", { questionText: "(a) Define electric power. OR (b) State Ohm's law and write its formula clearly." }],
    ["a row with a mark bled into the text", { questionText: "An object is placed 30 cm from a lens of focal length 15 cm. 3 Use lens formula to find v." }],
    ["a row with unmarked steps", { solutionSteps: ["E = I²Rt"] }],
  ])("rejects %s", (_n, patch) => {
    expect(isBoardTryRow({ ...GOOD, ...(patch as Partial<BoardTryRow>) })).toBe(false);
  });

  it.each([
    ["a LazyTopper-generated row", { origin: "lt-generated" }],
    ["an authored row", { questionProvenance: "authored" }],
    ["a row outside the 2026-27 syllabus", { topicKey: "trigonometry", questionText: "Evaluate sin (90° − A) cos A + cos (90° − A) sin A for an acute angle A." }],
  ])("the RUNTIME rule also rejects %s", (_n, patch) => {
    expect(isOfferableRow(GOOD)).toBe(true);
    expect(isOfferableRow({ ...GOOD, ...(patch as Partial<BoardTryRow>) })).toBe(false);
    expect(chooseBoardTryRow([{ ...GOOD, ...(patch as Partial<BoardTryRow>) }], new Set(), 1)).toBeNull();
  });

  it("fills the row's own words plus its real marks, and labels the source honestly", () => {
    expect(boardTryText(GOOD)).toBe(`${String(GOOD.questionText)} [2]`);
    expect(boardTryLabel(GOOD)).toBe("CBSE board question (2025) · Electricity");
  });

  it("is deterministic for a rotation and avoids an excluded id while another is left", () => {
    const other = { ...GOOD, id: "PYQ-S-2025-ELEC-003" };
    const a = chooseBoardTryRow([GOOD, other], new Set(), 7);
    expect(chooseBoardTryRow([GOOD, other], new Set(), 7)).toBe(a);
    expect(chooseBoardTryRow([GOOD, other], new Set([String(a!.id)]), 7)).not.toBe(a);
  });
});

describe("ACTIVATION-2 D · against the REAL served bank", () => {
  it.each(SUBJECTS)("%s has board questions to offer, every one a served, non-AI board row", (subject) => {
    const pool = served[subject].filter(isBoardTryRow).filter((r) => !isAiGeneratedBankId(String(r.id)));
    expect(pool.length).toBeGreaterThanOrEqual(3);
    for (const r of pool) {
      expect(String(r.subject)).toBe(subject);
      expect(String(r.ncertRef)).toMatch(/^PYQ\b/);
      expect([2, 3]).toContain(Number(r.marks));
      // Never a LazyTopper-generated or authored row (the module does not read these internal
      // provenance fields - GEN-THIN-1 - so the live bank is pinned here instead).
      expect(r.origin, String(r.id)).not.toBe("lt-generated");
      expect(r.questionProvenance, String(r.id)).not.toBe("authored");
      // Inside the 2026-27 syllabus by the notes' own board-question recogniser.
      expect(syllabusExclusion(r as never), String(r.id)).toBeNull();
    }
  });

  it.each(SUBJECTS)("%s: the pick is a served row, word for word", async (subject) => {
    const q = await pickBoardTryQuestion({ subject, rotation: 1 });
    expect(q).not.toBeNull();
    const row = served[subject].find((r) => String(r.id) === q!.id);
    expect(row).toBeDefined(); // served (withheld rows are absent from the served list)
    expect(q!.text).toBe(`${String(row!.questionText).trim()} [${Number(row!.marks)}]`);
    expect(q!.label).toMatch(/^CBSE board question \(\d{4}\)/);
  });
});
