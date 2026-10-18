import { describe, it, expect, beforeAll } from "vitest";
import { ensureBankSubject, getBankRowsForSubject, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { syllabusExclusion } from "../../lib/boardQuestions/selectionRule";
import {
  boardTryLabel,
  boardTryText,
  chooseBoardTryRow,
  isBoardTryRow,
  isOfferableRow,
  needsFigureOrTable,
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

/** BOARD-TRY-WIDEN-1 (owner ruling (b), 2026-10-18): a Section D long answer of 5 marks is offered too. */
const GOOD_D: BoardTryRow = {
  id: "PYQ-M-2025-SAV-004",
  subject: "Maths",
  topicKey: "surface-areas-and-volumes",
  section: "D",
  marks: 5,
  format: "Long",
  questionText: "A vessel is in the form of an inverted cone. Its height is 8 cm and the radius of its top, which is open, is 5 cm. It is filled with water up to the brim. When lead shots, each of which is a sphere of radius 0.5 cm, are dropped into the vessel, one-fourth of the water flows out. Find the number of lead shots dropped in the vessel.",
  solutionSteps: [
    "[1 mark] Volume of water in the cone = (1/3)πr²h = (1/3) × π × 5² × 8",
    "[0.5 mark] = 200π/3 cm³.",
    "[1 mark] Volume that flows out = (1/4) × (200π/3) = 50π/3 cm³.",
    "[1 mark] Volume of one lead shot = (4/3)π(1/2)³",
    "[0.5 mark] = π/6 cm³.",
    "[1 mark] Number of lead shots = (50π/3) ÷ (π/6) = 100.",
  ],
  pyqYear: "2025",
  ncertRef: "PYQ 30/3/1 Q35",
};

describe("ACTIVATION-2 D · the board-question rule", () => {
  it("accepts a clean written Section B/C board row of 2-3 marks", () => {
    expect(isBoardTryRow(GOOD)).toBe(true);
  });

  it("accepts a clean written Section D long answer of 5 marks (BOARD-TRY-WIDEN-1)", () => {
    expect(isBoardTryRow(GOOD_D)).toBe(true);
    expect(isOfferableRow(GOOD_D)).toBe(true);
    expect(boardTryText(GOOD_D)).toBe(`${String(GOOD_D.questionText)} [5]`);
    expect(boardTryLabel(GOOD_D)).toBe("CBSE board question (2025) · Surface Areas and Volumes");
  });

  it.each([
    ["a Section D row of 3 marks", { marks: 3 }],
    ["a Section D row that is not a long answer", { format: "Short" }],
    ["a Section D row with options", { options: ["a", "b", "c", "d"] }],
    ["a Section D row over 400 characters", { questionText: `${String(GOOD_D.questionText)} ${"Show all the working clearly. ".repeat(3)}` }],
    ["a Section D row needing a figure", { questionText: "In the given figure, a solid is made of a cylinder with a cone on top. Find its total surface area and volume." }],
    ["a Section D internal-choice row", { questionText: "(a) Find the volume of a cone of radius 7 cm and height 24 cm. OR (b) Find the curved surface area of a hemisphere of radius 7 cm." }],
    ["a Section D row with an unmarked step", { solutionSteps: ["[1 mark] V = (1/3)πr²h", "Number of lead shots = 100"] }],
    ["a Section D row whose source was not confirmed", { sourceOverride: "others" }],
  ])("still rejects %s", (_n, patch) => {
    expect(isBoardTryRow({ ...GOOD_D, ...(patch as Partial<BoardTryRow>) })).toBe(false);
  });

  it.each([
    ["an MCQ", { format: "MCQ", options: ["a", "b", "c", "d"] }],
    ["a 1-mark row", { marks: 1 }],
    ["a 5-mark Section B row", { marks: 5 }],
    ["a 5-mark long answer outside Section D", { marks: 5, format: "Long" }],
    ["a 2-3 mark row moved to Section D", { section: "D" }],
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

  // BOARD-TRY-WIDEN-1 follow-up: the named predicate, on stems copied from served bank rows.
  it.each([
    ["graphically (PYQ-M-2026-PLE-003)", "Solve the system of linear equations : x = 4 and 3x - 2y = 6 graphically."],
    ["graphical method (PYQ-M-2026-PLE-004)", "Use graphical method to solve the system of linear equations : y = -3 and x + 2y = 4."],
    ["the given electric circuit (PYQ-S-2026-ELEC-006)", "Consider the given electric circuit : Calculate the following : (a) Total resistance of the circuit (b) The electric current drawn from the battery (c) Potential difference between points P and Q"],
    ["a following frequency distribution with an a : b table (PYQ-M-STAT-006)", "Find the mean of the following frequency distribution:\nClasses : Frequency\n25-30 : 14\n30-35 : 22\n35-40 : 16\n40-45 : 6"],
    ["an a : b table with no cue word", "Find the mode of the data.\n0-10 : 5\n10-20 : 8\n20-30 : 12"],
    ["given below", "The marks obtained by 30 students are given below. Find the median marks."],
    ["the table below", "Find the mean from the table below."],
    ["draw the graph", "Draw the graph of x + y = 5 and find where it meets the x-axis."],
    ["an ogive", "Draw a less than type ogive for the data and find the median."],
    ["shown in the figure", "In the right triangle shown in the figure, find the length of AC."],
    ["Fig.", "In Fig. 3, PQ is a tangent to the circle at P. Find angle OQP."],
    ["inline class intervals", "Find the mean when the classes 0-10, 10-20, 20-30, 30-40 have frequencies 3, 5, 9, 3."],
  ])("needsFigureOrTable catches %s", (_n, text) => {
    expect(needsFigureOrTable(text)).toBe(true);
    expect(isBoardTryRow({ ...GOOD, questionText: text })).toBe(false);
  });

  it.each([
    ["an inline ratio (PYQ-M-RN-006)", "Two numbers are in the ratio 2 : 3 and their LCM is 180. What is the HCF of these numbers ?"],
    ["two inline ratios (PYQ-M-2025-SAV-003)", "If the radii of the bases of a cylinder and a cone are in the ratio 3 : 4 and their heights are in the ratio 2 : 3, find the ratio of their volumes."],
    ["a colon list (PYQ-S-ACID-010 opening)", "Consider the following salts : (i) YCl (ii) NH4X (iii) ZCO3 (a) What would be the pH of the salt solution if in YCl, Y is sodium ? Give reason for your answer."],
    ["tangents drawn (PYQ-M-CIRC-014)", "Prove that the angle between the two tangents drawn from an external point to a circle is supplementary to the angle subtended by the line segment joining the points of contact at the centre."],
    ["a mirror problem (PYQ-S-2025-LIGHT-017)", "A convex mirror used for rear view on an automobile has a focal length of 15 m. If a 3 m high bus is located at 60 m from the mirror, use mirror formula to determine the position and size of the image of the bus as seen in the mirror."],
  ])("needsFigureOrTable leaves %s alone", (_n, text) => {
    expect(needsFigureOrTable(text)).toBe(false);
    expect(isBoardTryRow({ ...GOOD, questionText: text })).toBe(true);
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
      // Section B/C at 2-3 marks, or Section D at 5 marks (BOARD-TRY-WIDEN-1) - never another mix.
      if (String(r.section).trim() === "D") expect(Number(r.marks), String(r.id)).toBe(5);
      else expect([2, 3], String(r.id)).toContain(Number(r.marks));
      expect(String(r.questionText).trim().length, String(r.id)).toBeLessThanOrEqual(400);
      // Never a LazyTopper-generated or authored row (the module does not read these internal
      // provenance fields - GEN-THIN-1 - so the live bank is pinned here instead).
      expect(r.origin, String(r.id)).not.toBe("lt-generated");
      expect(r.questionProvenance, String(r.id)).not.toBe("authored");
      // Inside the 2026-27 syllabus by the notes' own board-question recogniser.
      expect(syllabusExclusion(r as never), String(r.id)).toBeNull();
    }
  });

  it("Section D long answers are really on offer (BOARD-TRY-WIDEN-1, non-vacuous)", () => {
    // 7 offerable Section D rows measured on trunk 6e588408 (Maths 6, Science 1), 2026-10-18.
    const d = SUBJECTS.flatMap((s) => served[s].filter(isOfferableRow).filter((r) => !isAiGeneratedBankId(String(r.id))))
      .filter((r) => String(r.section).trim() === "D");
    expect(d.length).toBeGreaterThanOrEqual(5);
    for (const r of d) {
      expect(Number(r.marks), String(r.id)).toBe(5);
      expect(String(r.format), String(r.id)).toMatch(/^long$/i);
    }
  });

  /**
   * BOARD-TRY-WIDEN-1 follow-up: rows a student cannot answer from plain text are not offered.
   * These seven served rows passed every other rule and WERE offered before needsFigureOrTable
   * (accepted pool on trunk 3a6e8323 + this branch, 2026-10-18: Maths 94 -> 88, Science 43 -> 42).
   */
  const VISUAL_ROWS: ReadonlyArray<[string, string]> = [
    ["Maths", "PYQ-M-STAT-006"], // "Find the mean of the following frequency distribution:" + "a : b" table
    ["Maths", "PYQ-M-STAT-010"], // "... is given below:" + table
    ["Maths", "PYQ-M-2025-STAT-002"], // "The following frequency distribution gives ..." + table
    ["Maths", "PYQ-M-2026-PLE-003"], // "... graphically."
    ["Maths", "PYQ-M-2026-PLE-004"], // "Use graphical method ..."
    ["Maths", "PYQ-M-2026-PLE-005"], // "Use graphical method ..."
    ["Science", "PYQ-S-2026-ELEC-006"], // "Consider the given electric circuit : ..."
  ];
  it.each(VISUAL_ROWS)("%s: the served row %s needs a figure / graph / table and is not offered", (subject, id) => {
    const row = served[subject].find((r) => String(r.id) === id);
    expect(row, id).toBeDefined(); // non-vacuous: the real row is still served
    expect(needsFigureOrTable(String(row!.questionText))).toBe(true);
    expect(isBoardTryRow(row!)).toBe(false);
    expect(isOfferableRow(row!)).toBe(false);
  });

  // Real text-only rows, several with an inline "a : b" ratio, are still offered.
  it.each([
    ["Maths", "PYQ-M-RN-006"], // "Two numbers are in the ratio 2 : 3 ..."
    ["Maths", "PYQ-M-2026-REALNUM-001"], // "... in the ratio 3 : 5 ..."
    ["Maths", "PYQ-M-2025-SAV-003"], // "... in the ratio 3 : 4 ... in the ratio 2 : 3 ..."
    ["Maths", "PYQ-M-CIRC-015"],
    ["Maths", "PYQ-M-2025-SAV-004"],
    ["Science", "PYQ-S-ACID-010"], // "Consider the following salts : ..."
    ["Science", "PYQ-S-2025-LIGHT-017"],
    ["Science", "PYQ-S-2025-ELEC-004"],
  ])("%s: the text-only served row %s is still offered", (subject, id) => {
    const row = served[subject].find((r) => String(r.id) === id);
    expect(row, id).toBeDefined();
    expect(needsFigureOrTable(String(row!.questionText))).toBe(false);
    expect(isOfferableRow(row!)).toBe(true);
  });

  it.each(SUBJECTS)("%s: the pool is still wide enough after the figure/table rule", (subject) => {
    // The picker needs only ONE row to fill the box, but "Try another" rotates through the pool,
    // so the floor is 20 per subject (measured 2026-10-18: Maths 88, Science 42).
    const pool = served[subject].filter(isOfferableRow).filter((r) => !isAiGeneratedBankId(String(r.id)));
    expect(pool.length).toBeGreaterThanOrEqual(20);
    for (const r of pool) expect(needsFigureOrTable(String(r.questionText)), String(r.id)).toBe(false);
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
