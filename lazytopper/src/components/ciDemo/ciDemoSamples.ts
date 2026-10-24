/**
 * CI-SOFT-1 — the six "marked sample answers" the Check & Improve card animates.
 *
 * DISPLAY ONLY. Nothing here calls the grader or any AI: each entry is FIXED data — a board
 * question, a student-style answer with planted mistakes, and the marking of it — replayed as an
 * animation in the browser. No mark, mistake type, clamp or prompt of the real grader is read or
 * changed (CLAUDE.md §4a: no grading surface is reached).
 *
 * ★ BANK-FREE. /check-improve must not reach the question bank statically
 * (src/config/bankReach.guard.test.ts), so this file imports NO bank module. `bankId` / `bankFile`
 * name the row each question was copied from; ciDemoSamples.test.ts reads that bank file AS TEXT
 * and asserts `questionText` equals the row's text, so a bank edit fails the test, not a student.
 *
 * Scheme provenance: 1, 3, 4, 6 = CBSE marking schemes cited on /check-your-answer and verified
 * there; 2, 5 = pyqRestore1Ledger.ts MS lines; 3 = re-read by the cofounder from the official 2025
 * MS PDF (31/3/2 Q26: ½ given + formula, 1 substitution, ½ "= 48000 J"). The planted mistakes are
 * authored by LazyTopper — the student never existed, and the card says so.
 *
 * Marks are numbers (0.5); the "½" glyph is produced by formatMarks() for marks only, never in a line
 * of Byte's (the personality guide bans it there).
 */
import { zeroMarksLost, type MarksLostByType, type StoredMistakeType } from "../../lib/mistakeDisplay";

export type CiDemoKey = "circ" | "polyConcept" | "elec" | "chem" | "polySilly" | "light";

export interface CiDemoStep {
  /** The scheme point, as shown on the result. */
  point: string;
  max: number;
  awarded: number;
  /** Index into `lines`: the answer line the margin mark sits beside. */
  line: number;
  /** The mistake type when marks were lost; null = lost with no new mistake (follows from an earlier one) or nothing lost. */
  type: StoredMistakeType | null;
  /** Shown beside the chip when marks were lost. */
  note?: string;
  /** Index of the earlier step this lost mark FOLLOWS FROM (carried error): its lost marks join that step's bucket, with no second chip. */
  followsFrom?: number;
  /** Byte's line while this step is marked. */
  say: string;
}

export interface CiDemoSample {
  key: CiDemoKey;
  bankId: string;
  /** Relative to src/data/questionBanks/class10/ — read as TEXT by the test only. */
  bankFile: string;
  subject: "Maths" | "Science";
  chapter: string;
  marks: number;
  year: number;
  /** "CBSE 2024 · 30/5/1 · Q21(a)" */
  paper: string;
  questionText: string;
  /** A short stem for the pick tile (our wording; the full text is `questionText`). */
  tileStem: string;
  /** The student's handwritten lines. */
  lines: string[];
  /** Lines drawn as a faint placeholder rather than handwriting (e.g. "(no figure drawn)"). */
  ghostLines?: number[];
  steps: CiDemoStep[];
  /** Byte's line when the total appears. */
  summary: string;
  /** One line under "Where the marks went". */
  takeaway: string;
}

/** The order "Mark another question" walks. */
export const CI_DEMO_ORDER: readonly CiDemoKey[] = ["circ", "polyConcept", "elec", "chem", "polySilly", "light"];

export const CI_DEMO_SAMPLES: Readonly<Record<CiDemoKey, CiDemoSample>> = {
  circ: {
    key: "circ",
    bankId: "PYQ-M-2024-CIRC-008a",
    bankFile: "maths/circles.pyq2024.ts",
    subject: "Maths",
    chapter: "Circles",
    marks: 2,
    year: 2024,
    paper: "CBSE 2024 · 30/5/1 · Q21(a)",
    questionText:
      "If two tangents inclined at an angle of 60° are drawn to a circle of radius 3 cm, then find the length of each tangent.",
    tileStem: "Two tangents at 60° to a circle of radius 3 cm. Find the length of each tangent.",
    lines: ["(no figure drawn)", "∠APO = 60°/2 = 30°", "tan 30° = OA/AP ⇒ 1/√3 = 3/AP", "AP = 3/√3 = √3 cm"],
    ghostLines: [0],
    steps: [
      {
        point: "Correct figure",
        max: 0.5,
        awarded: 0,
        line: 0,
        type: "presentation",
        note: "No figure drawn. This scheme gives the figure its own half mark.",
        say: "No figure. The scheme gives half a mark for it, so that half is gone.",
      },
      { point: "∠APO = 30°", max: 0.5, awarded: 0.5, line: 1, type: null, say: "Angle APO = 30°. Half a mark." },
      {
        point: "tan 30° = 1/√3 = 3/AP",
        max: 0.5,
        awarded: 0.5,
        line: 2,
        type: null,
        say: "The tan 30° line is right. Another half mark.",
      },
      {
        point: "AP = 3√3 cm",
        max: 0.5,
        awarded: 0,
        line: 3,
        type: "calculation",
        note: "Wrote √3 cm. 3 ÷ (1/√3) = 3√3 cm.",
        say: "3 ÷ (1/√3) is 3√3, not √3. A calculation slip costs the last half.",
      },
    ],
    summary: "1 out of 2. The method was right: a missing figure and one slip cost the mark.",
    takeaway: "No concept gap: the method was right. These marks come back with care, not new learning.",
  },
  polyConcept: {
    key: "polyConcept",
    bankId: "PYQ-M-2024-POLY-004",
    bankFile: "maths/polynomials.pyq2024.ts",
    subject: "Maths",
    chapter: "Polynomials",
    marks: 2,
    year: 2024,
    paper: "CBSE 2024 · 30/5/2 · Q21",
    questionText:
      "If α and β are zeroes of the quadratic polynomial p(x) = x² − 5x + 4, then find the value of 1/α + 1/β − 2αβ.",
    tileStem: "α and β are zeroes of x² − 5x + 4. Find 1/α + 1/β − 2αβ.",
    lines: ["α + β = 5", "αβ = 4", "1/α + 1/β = 1/(α + β) = 1/5", "1/α + 1/β − 2αβ = 1/5 − 8 = −39/5"],
    steps: [
      { point: "α + β = 5", max: 0.5, awarded: 0.5, line: 0, type: null, say: "α + β = 5. Half a mark." },
      { point: "αβ = 4", max: 0.5, awarded: 0.5, line: 1, type: null, say: "αβ = 4. Another half mark." },
      {
        point: "1/α + 1/β = (α + β)/αβ",
        max: 0.5,
        awarded: 0,
        line: 2,
        type: "conceptual",
        note: "Wrote 1/(α + β). The identity is (α + β)/αβ = 5/4.",
        say: "1/α + 1/β is not 1/(α + β). That is a concept gap, and its half mark goes.",
      },
      {
        point: "= 5/4 − 8 = −27/4",
        max: 0.5,
        awarded: 0,
        line: 3,
        type: null,
        note: "Follows from the line above. Not counted as a second mistake.",
        followsFrom: 2,
        say: "The last line follows from that slip, so it is not counted as a new mistake.",
      },
    ],
    summary: "1 out of 2. One concept gap, counted once. Learn this identity and both marks come back.",
    takeaway: "One concept gap, charged once. The line that followed from it was not charged again.",
  },
  elec: {
    key: "elec",
    bankId: "PYQ-S-2025-ELEC-004",
    bankFile: "science/electricity.pyq2025.ts",
    subject: "Science",
    chapter: "Electricity",
    marks: 2,
    year: 2025,
    paper: "CBSE 2025 · 31/3/2 · Q26",
    questionText:
      "A voltage source sends a current of 2 A to a resistor of 40 Ω connected across it for 5 minutes. Calculate the electrical energy supplied by the source.",
    tileStem: "A source sends 2 A through a 40 Ω resistor for 5 minutes. Find the energy supplied.",
    lines: ["I = 2 A, R = 40 Ω, t = 5 min = 300 s", "E = I²Rt", "= (2)² × 40 × 300", "= 48000"],
    steps: [
      {
        point: "Given values (t = 300 s) and E = I²Rt",
        max: 0.5,
        awarded: 0.5,
        line: 1,
        type: null,
        say: "Values listed, minutes turned into seconds, formula written. Half a mark.",
      },
      {
        point: "(2)² × 40 × 300",
        max: 1,
        awarded: 1,
        line: 2,
        type: null,
        say: "The substitution is right. A whole mark.",
      },
      {
        point: "E = 48000 J",
        max: 0.5,
        awarded: 0,
        line: 3,
        type: "presentation",
        note: "No unit. A final answer without its unit (J) loses half a mark.",
        say: "48000 what? Without J, the final half mark goes.",
      },
    ],
    summary: "One and a half out of 2. Everything was right except the missing unit.",
    takeaway: "Exam technique only: write the unit with every final answer.",
  },
  chem: {
    key: "chem",
    bankId: "PYQ-S-2025-CHEMRXN-006",
    bankFile: "science/chemicalReactions.pyq2025.ts",
    subject: "Science",
    chapter: "Chemical reactions",
    marks: 2,
    year: 2025,
    paper: "CBSE 2025 · 31/1/3 · Q26",
    questionText:
      "Translate the following statements into chemical equations and then balance them : (a) Nitric acid reacts with calcium hydroxide to form calcium nitrate and water. (b) Sodium chloride reacts with silver nitrate to form silver chloride and sodium nitrate.",
    tileStem: "Write and balance: nitric acid + calcium hydroxide, and sodium chloride + silver nitrate.",
    lines: ["(a) HNO₃ + Ca(OH)₂ → Ca(NO₃)₂ + H₂O", "(b) NaCl + AgNO₃ → AgCl + NaNO₃"],
    steps: [
      {
        point: "(a) 2HNO₃ + Ca(OH)₂ → Ca(NO₃)₂ + 2H₂O",
        max: 1,
        awarded: 0.5,
        line: 0,
        type: "calculation",
        note: "Right chemicals, not balanced: count H and O on both sides. The scheme deducts half a mark.",
        say: "Right chemicals, but the atoms don't balance. The scheme takes half a mark.",
      },
      {
        point: "(b) NaCl + AgNO₃ → AgCl + NaNO₃",
        max: 1,
        awarded: 1,
        line: 1,
        type: null,
        say: "Part (b) is balanced. A whole mark.",
      },
    ],
    summary: "One and a half out of 2. Count the atoms on both sides before moving on.",
    takeaway: "A careless slip: balance every equation before you move on.",
  },
  polySilly: {
    key: "polySilly",
    bankId: "PYQ-M-2024-POLY-003",
    bankFile: "maths/polynomials.pyq2024.ts",
    subject: "Maths",
    chapter: "Polynomials",
    marks: 2,
    year: 2024,
    paper: "CBSE 2024 · 30/5/1 · Q23",
    questionText: "If α, β are zeroes of the polynomial p(x) = 5x² – 6x + 1, then find the value of α + β + αβ.",
    tileStem: "α, β are zeroes of 5x² − 6x + 1. Find α + β + αβ.",
    lines: ["α + β = −(−6)/5 = 6/5", "αβ = 1/5", "α + β + αβ = 6/5 + 1/6", "= 41/30"],
    steps: [
      { point: "α + β = 6/5", max: 0.5, awarded: 0.5, line: 0, type: null, say: "α + β = 6/5. Half a mark." },
      { point: "αβ = 1/5", max: 0.5, awarded: 0.5, line: 1, type: null, say: "αβ = 1/5. Another half mark." },
      {
        point: "α + β + αβ = 6/5 + 1/5 = 7/5",
        max: 1,
        awarded: 0,
        line: 2,
        type: "silly",
        note: "αβ = 1/5 was copied as 1/6. The method was right.",
        say: "αβ was 1/5 one line up, then copied as 1/6. A silly slip costs a whole mark.",
      },
    ],
    summary: "1 out of 2, lost to one copying slip. Re-reading each line catches it.",
    takeaway: "A careless slip: this student already knew the method.",
  },
  light: {
    key: "light",
    bankId: "PYQ-S-2024-LIGHT-007",
    bankFile: "science/lightReflection.pyq2024.ts",
    subject: "Science",
    chapter: "Light",
    marks: 2,
    year: 2024,
    paper: "CBSE 2024 · 31/5/3 · Q25",
    questionText:
      "The linear magnification produced by a spherical mirror is + 3. Based on this statement answer the following questions : (a) What is the type of mirror ? (b) Where is the object located ? (c) List two properties of the image formed (other than the size/magnification).",
    tileStem: "A mirror's magnification is +3. Which mirror? Where is the object? Two image properties.",
    lines: ["(a) Concave mirror", "(b) Between F and C", "(c) Virtual, erect"],
    steps: [
      { point: "(a) Concave mirror", max: 0.5, awarded: 0.5, line: 0, type: null, say: "Concave mirror. Half a mark." },
      {
        point: "(b) Between pole and focus",
        max: 0.5,
        awarded: 0,
        line: 1,
        type: "conceptual",
        note: "Between F and C gives a real, inverted image. For +3 the object is between P and F.",
        say: "Between F and C gives a real, inverted image. For +3 the object sits between P and F.",
      },
      {
        point: "(c) Any two: virtual, erect, behind the mirror",
        max: 1,
        awarded: 1,
        line: 2,
        type: null,
        say: "Two correct properties. A whole mark.",
      },
    ],
    summary: "One and a half out of 2. One concept gap: where the object sits for a virtual image.",
    takeaway: "A concept gap: worth revising where the object sits for each kind of image.",
  },
};

/** The copy the card owns (cofounder-approved 24 Oct 2026; byte-for-byte). */
export const CI_DEMO_COPY = {
  l1: "Pick a board question. I'll mark a student's answer to it, step by step.",
  l2: "One tap · no writing · 10 seconds",
  l3: "Sample answer · not yours · mistakes planted on purpose · written by LazyTopper",
  l4: "Here is a student-style answer. Watch the red pen.",
  l9: "Your own answer gets marked exactly like this. Want to try one?",
} as const;

export function sampleTotal(s: CiDemoSample): number {
  return s.steps.reduce((n, st) => n + st.awarded, 0);
}

/** Marks as a student reads them: 0.5 → "½", 1.5 → "1½", 2 → "2". Marks only, never a line of Byte's. */
export function formatMarks(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}

/** One red-pen step every 1.8 s. */
export const CI_DEMO_STEP_MS = 1800;

export function sampleLabel(s: CiDemoSample): string {
  return `CBSE board question (${s.year}) · ${s.chapter}`;
}

/**
 * The marks the sample lost, per mistake type, in the product's own `MarksLostByType` shape — what
 * the real scorecard's "Where your marks went" block (MarksLostLines) is fed, so its parts sum to the
 * marks lost (G3).
 *
 * A lost step with `type: null` and `followsFrom` (sample 2's last line: "Follows from the line
 * above. Not counted as a second mistake.") adds its lost marks to the SAME bucket as the step it
 * follows from: one concept gap, charged once, no second chip. It is never put in `untyped`
 * ("Marks lost, reason not recorded") — its reason IS recorded.
 */
export function sampleMarksLost(s: CiDemoSample): MarksLostByType {
  const out = zeroMarksLost();
  for (const st of s.steps) {
    if (st.awarded >= st.max) continue;
    const type = st.type ?? (st.followsFrom !== undefined ? s.steps[st.followsFrom]?.type ?? null : null);
    if (type) out[type] += st.max - st.awarded;
  }
  return out;
}
