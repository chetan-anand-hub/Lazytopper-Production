/**
 * SPEED-SITE-1a — the six ladder MCQs (ONE_MINUTE_STARTERS), copied here as the ladder shows them, so the
 * first-minute ladder paints with its question instead of waiting for a whole chapter bank (5 chunks, ~200 KB
 * compressed for Light) to download just to read one row. On /check-improve that question is the page's
 * Largest Contentful Paint for a signed-out visitor.
 *
 * NOT AUTHORED. Each entry is exactly what OneMinuteLadder used to build from the served bank row: the
 * questionText, the four options, the index of the stored answer, whyLine(solutionSteps) and the topic's
 * display name. oneMinuteStarters.test.ts loads every row from the assembled bank and asserts each field
 * equals its source, so a bank edit fails a test and never a student. Pure data: no bank import, so
 * /check-improve stays bank-free statically (src/config/bankReach.guard.test.ts).
 */
export interface StarterRow {
  question: string;
  options: readonly string[];
  /** Index of the stored answer among the options. */
  right: number;
  /** whyLine() of the row's stored solution: its own first step. */
  why: string;
  topicKey: string;
  topicName: string;
}

export const STARTER_ROWS: Readonly<Record<string, StarterRow>> = {
  "PYQ-M-QE-002": {
    question: "The roots of the equation x² + 3x − 10 = 0 are :",
    options: ["2, −5", "−2, 5", "2, 5", "−2, −5"],
    right: 0,
    why: "x² + 3x − 10 = x² + 5x − 2x − 10 = (x + 5)(x − 2) = 0 ⟹ x = 2 or x = −5.",
    topicKey: "quadratic-equations",
    topicName: "Quadratic Equations",
  },
  "PYQ-M-PROB-008": {
    question: "Two coins are tossed together. The probability of getting at least one tail is :",
    options: ["1/4", "1/2", "3/4", "1"],
    right: 2,
    why: "Outcomes HH, HT, TH, TT; at least one tail in 3 of them, so P = 3/4.",
    topicKey: "probability",
    topicName: "Probability",
  },
  "PYQ-M-2024-ARC-001": {
    question: "If the area of a sector is one-twelfth that of a complete circle, then the angle of the sector is :",
    options: ["36°", "30°", "60°", "45°"],
    right: 1,
    why: "θ/360° = 1/12 ⇒ θ = 360°/12 = 30°.",
    topicKey: "areas-related-to-circles",
    topicName: "Areas Related to Circles",
  },
  "PYQ-S-CHEM-004": {
    question: "The balanced chemical equation showing reaction between quicklime and water is :",
    options: ["2CaO + H2O → 2CaOH + H2 + Heat", "CaO + H2O → Ca(OH)2 + H2 + Heat", "CaO + H2O → Ca(OH)2 + Heat", "2CaO + 3H2O → 2Ca(OH)3 + O2 + Heat"],
    right: 2,
    why: "Quicklime (CaO) reacts vigorously with water to form slaked lime, calcium hydroxide, releasing heat: CaO(s) + H2O(l) → Ca(OH)2(aq) + Heat. No H2 or O2 is formed, and the equation is balanced (Ca 1, O 2, H 2 on each side).",
    topicKey: "chemical-reactions-and-equations",
    topicName: "Chemical Reactions & Equations",
  },
  "PYQ-S-2024-ACID-003": {
    question: "An aqueous solution of sodium chloride is prepared in distilled water. The pH of this solution is :",
    options: ["6", "8", "7", "3"],
    right: 2,
    why: "Sodium chloride is the salt of a strong acid (HCl) and a strong base (NaOH), so its solution in distilled water is neutral, pH = 7.",
    topicKey: "acids-bases-and-salts",
    topicName: "Acids Bases & Salts",
  },
  "PYQ-S-2024-LIGHT-003": {
    question: "The colour of light for which the refractive index of glass is minimum, is :",
    options: ["Red", "Yellow", "Green", "Violet"],
    right: 0,
    why: "Red light travels fastest in glass and is bent (deviated) the least by a prism, so the refractive index of glass is minimum for red and maximum for violet.",
    topicKey: "light-reflection-and-refraction",
    topicName: "Light - Reflection & Refraction",
  },
};
