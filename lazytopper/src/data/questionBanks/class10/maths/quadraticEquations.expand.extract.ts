import type { CanonicalQuestion } from "../../../predictionTypes";

// Bank-Expansion Batch 8 — quadratic-equations (Maths, Class 10) — EXTRACT-MAX pack.
// topicKey: "quadratic-equations"
// Sources (exhaustive Maths sweep; only genuinely net-new vs the live quad bank kept):
//   - Content folder-13 "Question Bank with Explanations MCQ type" / Math / Quadratic Equations.docx (Section A MCQ + worked solutions)
//   - Content "Classroom MODULES MATHEMATICS (10)" / Math-10th / Unit 1 solved examples (Ex.6, Ex.9, Ex.13, Ex.15) — Section C applications + a corrected discriminant range
// The NCERT Exemplar (Ex 4.1-4.4) and the NCERT chapter exercises are ALREADY in the live bank
// (QE-N-EXMPLR-*, QE-N-NCERT-*), so all exemplar-derived items were dropped as duplicates.
// The banked template "If the equation [q] has [nature] roots, then:" (QE-M18) and "the nature of the
// roots of [q]" (MCQ-003) saturate the discriminant-range / nature MCQ space, so those were dropped too.
// Syllabus: IN = standard form / factorisation / completing the square / quadratic formula /
// discriminant & nature of roots / word problems. Sum/product-of-roots (Vieta) items were rejected
// as out-of-scope for Class-10 quadratic-equations.
// Extraction date: 2026-07-13

export const QUADRATIC_EQUATIONS_EXPAND_EXTRACT: CanonicalQuestion[] = [
  // ===== Section A: MCQ (1 mark) =====
  { id: "BX-QUAD-EX-A-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If 2 is a root of the equation x² + ax + 12 = 0 and the equation x² + ax + q = 0 has two equal roots, then the value of q is:",
    options: ["16", "12", "20", "8"],
    answer: "16",
    solutionSteps: ["[0.5 mark] Since 2 is a root of x² + ax + 12 = 0: (2)² + 2a + 12 = 0 ⇒ 4 + 2a + 12 = 0 ⇒ a = −8.", "[0.5 mark] For x² + ax + q = 0 to have equal roots, D = a² − 4q = 0 ⇒ (−8)² − 4q = 0 ⇒ 64 = 4q ⇒ q = 16."],
    finalAnswer: "q = 16.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-A-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the equation x² + 2(k + 2)x + 9k = 0 has two equal roots, then the value(s) of k is/are:",
    options: ["1 or 4", "2 or 3", "1 or 8", "4 or 6"],
    answer: "1 or 4",
    solutionSteps: ["[0.5 mark] Equal roots ⇒ D = b² − 4ac = 0 with b = 2(k + 2), a = 1, c = 9k: [2(k + 2)]² − 4(9k) = 0 ⇒ 4(k² + 4k + 4) − 36k = 0.", "[0.5 mark] 4k² − 20k + 16 = 0 ⇒ k² − 5k + 4 = 0 ⇒ (k − 1)(k − 4) = 0 ⇒ k = 1 or k = 4."],
    finalAnswer: "k = 1 or k = 4.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-A-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If the roots of the equation 5x² − kx + 1 = 0 are real and distinct, then:",
    options: ["k > 2√5 or k < −2√5", "−2√5 < k < 2√5", "k = ±2√5", "only k < 2√5"],
    answer: "k > 2√5 or k < −2√5",
    solutionSteps: ["[0.5 mark] Real and distinct ⇒ D = b² − 4ac > 0. Here D = (−k)² − 4(5)(1) = k² − 20 > 0.", "[0.5 mark] k² > 20 ⇒ |k| > 2√5 ⇒ k > 2√5 or k < −2√5."],
    finalAnswer: "k > 2√5 or k < −2√5.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-A-004", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If the equation (a² + b²)x² − 2(ac + bd)x + (c² + d²) = 0 has equal roots, then:",
    options: ["ad = bc", "ab = cd", "ac = bd", "bd = √(ac)"],
    answer: "ad = bc",
    solutionSteps: ["[0.5 mark] Equal roots ⇒ D = 0. D = 4(ac + bd)² − 4(a² + b²)(c² + d²) = −4(a²d² − 2abcd + b²c²) = −4(ad − bc)².", "[0.5 mark] −4(ad − bc)² = 0 ⇒ ad − bc = 0 ⇒ ad = bc."],
    finalAnswer: "ad = bc.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-A-005", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Each of a and b can take the values 1, 2, 3 or 4. The number of equations of the form ax² + bx + 1 = 0 having real roots is:",
    options: ["7", "6", "10", "12"],
    answer: "7",
    solutionSteps: ["[0.5 mark] Real roots ⇒ D = b² − 4a ≥ 0 (here c = 1). For b = 4: a ≤ 4 (4 values); b = 3: a ≤ 2 (2 values); b = 2: a ≤ 1 (1 value); b = 1: none.", "[0.5 mark] Total number of valid (a, b) pairs = 4 + 2 + 1 = 7."],
    finalAnswer: "7 equations.", isCompetencyBased: true },

  // BX-QUAD-EX-A-006 removed (skeptic distinctness drop: cosmetic clone of banked QE2-050 — same k²=36, same ±6). Id gap left intentionally.

  { id: "BX-QUAD-EX-A-007", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "If both the equations x² + kx + 64 = 0 and x² − 8x + k = 0 have real roots, then the positive value of k is:",
    options: ["16", "8", "4", "12"],
    answer: "16",
    solutionSteps: ["[0.5 mark] x² + kx + 64 = 0 has real roots ⇒ k² − 256 ≥ 0 ⇒ k ≥ 16 or k ≤ −16. x² − 8x + k = 0 has real roots ⇒ 64 − 4k ≥ 0 ⇒ k ≤ 16.", "[0.5 mark] The only positive value satisfying both k ≥ 16 and k ≤ 16 is k = 16."],
    finalAnswer: "k = 16.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-A-008", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The value of c for which the equation ax² + 2bx + c = 0 has equal roots is:",
    options: ["b²/a", "b²/(4a)", "a²/b", "2b²/a"],
    answer: "b²/a",
    solutionSteps: ["[0.5 mark] Equal roots ⇒ D = (2b)² − 4ac = 4b² − 4ac = 0.", "[0.5 mark] 4ac = 4b² ⇒ c = b²/a."],
    finalAnswer: "c = b²/a.", isCompetencyBased: false },

  { id: "BX-QUAD-EX-A-009", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Roots of a Quadratic Equation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If x = 3 is a solution of the equation 3x² + (k − 1)x + 9 = 0, then the value of k is:",
    options: ["−11", "−7", "−9", "−13"],
    answer: "−11",
    solutionSteps: ["[0.5 mark] Substitute x = 3: 3(9) + (k − 1)(3) + 9 = 0 ⇒ 27 + 3k − 3 + 9 = 0.", "[0.5 mark] 3k + 33 = 0 ⇒ k = −11."],
    finalAnswer: "k = −11.", isCompetencyBased: false },

  { id: "BX-QUAD-EX-A-010", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The length of a rectangular field exceeds its breadth by 8 m and its area is 240 m². The breadth of the field is:",
    options: ["12 m", "20 m", "16 m", "30 m"],
    answer: "12 m",
    solutionSteps: ["[0.5 mark] Let breadth = x m and length = (x + 8) m. Area: x(x + 8) = 240 ⇒ x² + 8x − 240 = 0.", "[0.5 mark] (x + 20)(x − 12) = 0 ⇒ x = 12 (breadth cannot be negative). Breadth = 12 m."],
    finalAnswer: "Breadth = 12 m.", isCompetencyBased: true },

  // ===== Section B: Short (2 marks) =====
  { id: "BX-QUAD-EX-B-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Using the discriminant, state whether the roots of 4x² − 4x + 1 = 0 are real and equal, and find them if they are.",
    options: [],
    answer: "D = 0, so the roots are real and equal; the repeated root is x = 1/2.",
    solutionSteps: ["[1 mark] a = 4, b = −4, c = 1. D = (−4)² − 4(4)(1) = 16 − 16 = 0.", "[1 mark] Since D = 0, the roots are real and equal; the repeated root is x = −b/2a = 4/8 = 1/2."],
    finalAnswer: "Real and equal roots; x = 1/2 (repeated).", isCompetencyBased: false },

  { id: "BX-QUAD-EX-B-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find k if the equation 9x² + 6kx + 4 = 0 possesses two equal roots.",
    options: [],
    answer: "D = (6k)² − 4(9)(4) = 36k² − 144 = 0 ⇒ k² = 4 ⇒ k = ±2.",
    solutionSteps: ["[1 mark] Equal roots ⇒ D = (6k)² − 4(9)(4) = 36k² − 144 = 0.", "[1 mark] 36k² = 144 ⇒ k² = 4 ⇒ k = ±2."],
    finalAnswer: "k = ±2.", isCompetencyBased: false },

  { id: "BX-QUAD-EX-B-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Discriminant and Nature of Roots", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Find the range of values of k for which the equation x² + 5kx + 16 = 0 has no real roots.",
    options: [],
    answer: "25k² − 64 < 0 ⇒ k² < 64/25 ⇒ −8/5 < k < 8/5.",
    solutionSteps: ["[1 mark] No real roots ⇒ D = (5k)² − 4(1)(16) = 25k² − 64 < 0.", "[1 mark] k² < 64/25 ⇒ |k| < 8/5 ⇒ −8/5 < k < 8/5."],
    finalAnswer: "−8/5 < k < 8/5.", isCompetencyBased: false },

  // ===== Section C: Short (3 marks) =====
  { id: "BX-QUAD-EX-C-001", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A dealer sells a toy for ₹24 and gains as much percent as the cost price (in rupees) of the toy. Find the cost price of the toy.",
    options: [],
    answer: "Let CP = ₹x. Then x + x²/100 = 24 ⇒ x² + 100x − 2400 = 0 ⇒ (x + 120)(x − 20) = 0 ⇒ x = 20.",
    solutionSteps: ["[1 mark] Let the cost price be ₹x. Gain% = x, so gain = x × (x/100) = x²/100, and selling price = x + x²/100.", "[1 mark] Given SP = 24: x + x²/100 = 24 ⇒ x² + 100x − 2400 = 0 ⇒ (x + 120)(x − 20) = 0.", "[1 mark] x = 20 (cost price cannot be negative). The cost price of the toy is ₹20."],
    finalAnswer: "Cost price = ₹20.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-C-002", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Solution by Factorisation", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Solve for x: 1/(a + b + x) = 1/a + 1/b + 1/x, where a + b + x ≠ 0 and a, b, x ≠ 0.",
    options: [],
    answer: "The equation reduces to (x + a)(x + b) = 0, so x = −a or x = −b.",
    solutionSteps: ["[1 mark] Transpose 1/x: 1/(a + b + x) − 1/x = 1/a + 1/b ⇒ [x − (a + b + x)] / [x(a + b + x)] = (a + b)/(ab) ⇒ −(a + b)/[x(a + b + x)] = (a + b)/(ab).", "[1 mark] Since a + b ≠ 0, cancel (a + b): −1/[x(a + b + x)] = 1/(ab) ⇒ x(a + b + x) + ab = 0 ⇒ x² + ax + bx + ab = 0.", "[1 mark] x(x + a) + b(x + a) = 0 ⇒ (x + a)(x + b) = 0 ⇒ x = −a or x = −b."],
    finalAnswer: "x = −a or x = −b.", isCompetencyBased: false },

  { id: "BX-QUAD-EX-C-003", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A girl is twice as old as her sister. Four years hence, the product of their ages (in years) will be 160. Find their present ages.",
    options: [],
    answer: "Sister x, girl 2x: (x + 4)(2x + 4) = 160 ⇒ x² + 6x − 72 = 0 ⇒ (x + 12)(x − 6) = 0 ⇒ x = 6.",
    solutionSteps: ["[1 mark] Let the sister's present age be x years; then the girl's age = 2x years. Four years hence they are (x + 4) and (2x + 4).", "[1 mark] (x + 4)(2x + 4) = 160 ⇒ 2x² + 12x + 16 = 160 ⇒ x² + 6x − 72 = 0.", "[1 mark] (x + 12)(x − 6) = 0 ⇒ x = 6 (age > 0). Sister is 6 years and the girl is 12 years old."],
    finalAnswer: "Sister = 6 years, girl = 12 years.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-C-004", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The sum of the ages of a father and his son is 45 years. Five years ago, the product of their ages (in years) was 124. Determine their present ages.",
    options: [],
    answer: "Son x, father 45 − x: (x − 5)(40 − x) = 124 ⇒ x² − 45x + 324 = 0 ⇒ (x − 9)(x − 36) = 0 ⇒ x = 9.",
    solutionSteps: ["[1 mark] Let the son's present age be x years; father's age = (45 − x) years. Five years ago they were (x − 5) and (40 − x).", "[1 mark] (x − 5)(40 − x) = 124 ⇒ 40x − x² − 200 + 5x = 124 ⇒ x² − 45x + 324 = 0.", "[1 mark] (x − 9)(x − 36) = 0 ⇒ x = 9 (son) ⇒ father = 36. Present ages: son 9 years, father 36 years."],
    finalAnswer: "Son = 9 years, father = 36 years.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-C-005", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The length of a rectangular plot is 2 m more than three times its breadth. If the area of the plot is 120 m², find its length and breadth.",
    options: [],
    answer: "Breadth x, length 3x + 2: x(3x + 2) = 120 ⇒ 3x² + 2x − 120 = 0 ⇒ (3x + 20)(x − 6) = 0 ⇒ x = 6.",
    solutionSteps: ["[1 mark] Let breadth = x m; then length = (3x + 2) m. Area: x(3x + 2) = 120 ⇒ 3x² + 2x − 120 = 0.", "[1 mark] Split the middle term: 3x² + 20x − 18x − 120 = 0 ⇒ x(3x + 20) − 6(3x + 20) = 0 ⇒ (3x + 20)(x − 6) = 0.", "[1 mark] x = 6 (breadth > 0); length = 3(6) + 2 = 20. Breadth = 6 m, length = 20 m."],
    finalAnswer: "Breadth = 6 m, length = 20 m.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-C-006", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A two-digit number is such that the product of its digits is 18. When 63 is subtracted from the number, the digits interchange their places. Find the number.",
    options: [],
    answer: "Digits t and u with tu = 18 and (10t + u) − 63 = 10u + t ⇒ t − u = 7 ⇒ u² + 7u − 18 = 0 ⇒ u = 2, t = 9. Number = 92.",
    solutionSteps: ["[1 mark] Let the tens digit be t and the units digit u, so the number = 10t + u. Given t·u = 18 and (10t + u) − 63 = 10u + t.", "[1 mark] From the second condition: 9t − 9u = 63 ⇒ t − u = 7 ⇒ t = u + 7. Substitute in t·u = 18: (u + 7)u = 18 ⇒ u² + 7u − 18 = 0.", "[1 mark] (u + 9)(u − 2) = 0 ⇒ u = 2 (a digit) ⇒ t = 9. The number is 92 (check: 92 − 63 = 29 ✓)."],
    finalAnswer: "The number is 92.", isCompetencyBased: true },

  { id: "BX-QUAD-EX-C-007", subject: "Maths", topicKey: "quadratic-equations", subtopic: "Word Problems on Quadratic Equations", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Two trains leave a station at the same time, the first travelling due west and the second due north. The first train travels 5 km/h faster than the second. After 2 hours they are 50 km apart. Find the speed of each train.",
    options: [],
    answer: "Second x, first x + 5: (2x)² + [2(x + 5)]² = 50² ⇒ x² + 5x − 300 = 0 ⇒ (x + 20)(x − 15) = 0 ⇒ x = 15.",
    solutionSteps: ["[1 mark] Let the second train's speed be x km/h; the first train's = (x + 5) km/h. In 2 hours they cover 2x km (north) and 2(x + 5) km (west) at right angles.", "[1 mark] By Pythagoras: (2x)² + [2(x + 5)]² = 50² ⇒ 4x² + 4(x + 5)² = 2500 ⇒ 8x² + 40x + 100 = 2500 ⇒ x² + 5x − 300 = 0.", "[1 mark] (x + 20)(x − 15) = 0 ⇒ x = 15 (speed > 0). Second train = 15 km/h and first train = 20 km/h."],
    finalAnswer: "Second train 15 km/h, first train 20 km/h.", isCompetencyBased: true },
];
