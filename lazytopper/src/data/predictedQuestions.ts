// src/data/predictedQuestions.ts

import type { Class10TopicKey } from "./class10MathTopicTrends";
import { predictedQuestionsAdditions } from "./predictedQuestionsAdditions";

// Match the difficulty language we already use
export type DifficultyKey = "Easy" | "Medium" | "Hard";

export type QuestionKind =
  | "MCQ"
  | "Short"
  | "Assertion-Reasoning"
  | "Case-Based";

// ✅ Sections A–E (E = case-study)
export type SectionKey = "A" | "B" | "C" | "D" | "E";

export type BloomSkill =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analysing"
  | "Evaluating"
  | "Creating";

export interface PredictedQuestion {
  id: string;
  topicKey: Class10TopicKey;
  subtopic: string;
  kind: QuestionKind;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;
  questionText: string;
  options?: string[]; // empty/undefined for subjective
  answer: string;
  explanation: string;

  // 🌱 Socratic / AI-tutor fields (optional for now)
  solutionSteps?: string[];
  finalAnswer?: string;
  strategyHint?: string;

  // 🔎 Predictive-engine metadata (optional)
  pastBoardYear?: string;
  policyTag?: string;
}

// ---------------------------------------------------------------------------
// Seed bank: “board-flavoured, high-probability” questions.
// ---------------------------------------------------------------------------

const predictedQuestionsBase: PredictedQuestion[] = [
  // ========== REAL NUMBERS (HIGH-ROI) ==========

  {
    id: "2026-RN-SA-01",
    topicKey: "Real Numbers",
    subtopic: "Euclid’s Division Lemma",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Using Euclid’s division lemma, show that the square of any positive integer is either of the form 3m or 3m + 1 for some integer m.",
    answer:
      "If n = 3q or 3q + 1 or 3q + 2, then n² is of the form 3m or 3m + 1.",
    finalAnswer:
      "Every perfect square is of the form 3m or 3m + 1 (never 3m + 2).",
    explanation:
      "Take n = 3q, 3q + 1 or 3q + 2. Then n² = 9q², 9q² + 6q + 1, or 9q² + 12q + 4. The first two can be written as 3m or 3m + 1. The last becomes 3(3q² + 4q + 1) + 1, so it is also 3m + 1. So n² is either 3m or 3m + 1.",
    solutionSteps: [
      "By Euclid’s lemma, any integer n can be written as 3q, 3q + 1 or 3q + 2.",
      "Compute n² for each case.",
      "Factor out 3 wherever possible and identify the remainder.",
      "Show that the remainder is only 0 or 1 (never 2).",
      "Conclude that n² is of the form 3m or 3m + 1.",
    ],
    strategyHint:
      "Express n in terms of 3q + r and then square; the pattern of remainders appears automatically.",
    pastBoardYear: "2023",
    policyTag: "Number theory pattern/Euclid lemma",
  },

  {
    id: "2026-RN-SA-02",
    topicKey: "Real Numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Using the Fundamental Theorem of Arithmetic, prove that 5√3 is an irrational number.",
    answer: "5√3 is irrational.",
    finalAnswer: "5√3 is irrational.",
    explanation:
      "Assume 5√3 is rational. Then √3 is also rational (divide by 5), which contradicts the known fact that √3 is irrational from its prime factorisation. Hence 5√3 is irrational.",
    solutionSteps: [
      "Assume, for contradiction, that 5√3 is rational.",
      "Write 5√3 = p/q in lowest terms.",
      "Divide both sides by 5 to get √3 = p/(5q), which is rational.",
      "Recall that √3 is known to be irrational as 3 has an odd power of prime in its factorisation.",
      "This contradiction shows our assumption was wrong.",
      "Therefore, 5√3 must be irrational.",
    ],
    strategyHint:
      "To prove irrationality, assume rational, simplify, and reach a contradiction with a known irrational.",
    pastBoardYear: "2022",
    policyTag: "Irrationality proof/standard pattern",
  },

  // ========== POLYNOMIALS (HIGH-ROI) ==========

  {
    id: "2026-POLY-MCQ-01",
    topicKey: "Polynomials",
    subtopic: "Zeroes & Coefficients",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "If α and β are the zeroes of quadratic polynomial 2x² − 5x + 3, then α + β equals:",
    options: ["5/2", "5/3", "2/5", "3/2"],
    answer: "5/2",
    explanation:
      "For ax² + bx + c, sum of zeroes = −b/a. Here a = 2, b = −5 ⇒ α + β = −(−5)/2 = 5/2.",
    solutionSteps: [
      "Recall: For ax² + bx + c, sum of zeroes = −b/a.",
      "Identify a = 2 and b = −5.",
      "Substitute to get α + β = −(−5)/2.",
      "Simplify to obtain 5/2.",
    ],
    strategyHint: "Use sum and product of zeroes formula; no factorisation needed.",
    pastBoardYear: "2024",
    policyTag: "Formula based MCQ/Polynomials",
  },

  {
    id: "2026-POLY-SA-02",
    topicKey: "Polynomials",
    subtopic: "Factor Theorem",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Using the Factor Theorem, show that x − 2 is a factor of the polynomial p(x) = x³ − 4x² + x + 6 and hence factorise p(x) completely.",
    answer: "p(x) = (x − 2)(x + 1)(x − 3).",
    finalAnswer: "x³ − 4x² + x + 6 = (x − 2)(x + 1)(x − 3).",
    explanation:
      "Check p(2): 8 − 16 + 2 + 6 = 0, so x − 2 is a factor. Divide p(x) by (x − 2) to get x² − 2x − 3. Factorise x² − 2x − 3 as (x + 1)(x − 3).",
    solutionSteps: [
      "Compute p(2) by substituting x = 2 into p(x).",
      "Since p(2) = 0, x − 2 is a factor by Factor Theorem.",
      "Use long division or synthetic division to divide p(x) by (x − 2).",
      "Obtain the quotient x² − 2x − 3.",
      "Factorise x² − 2x − 3 as (x + 1)(x − 3).",
      "Combine to get full factorisation.",
    ],
    strategyHint:
      "After verifying a factor using the Factor Theorem, always divide to simplify the remaining quadratic.",
    pastBoardYear: "2023",
    policyTag: "Polynomial factorisation/Factor theorem",
  },

  // ========== PAIR OF LINEAR EQUATIONS (MUST-CRACK) ==========

  {
    id: "2026-PLE-MCQ-01",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "If 2x + 3y = 11 and 3x − 2y = 4, then the value of y − x is:",
    options: ["1", "2", "3", "4"],
    answer: "2",
    explanation: "Solving gives x = 2, y = 4, so y − x = 4 − 2 = 2.",
    solutionSteps: [
      "Write the system: 2x + 3y = 11 and 3x − 2y = 4.",
      "Use elimination to remove one variable.",
      "Solve for the remaining variable.",
      "Back-substitute to find the second variable.",
      "Compute y − x.",
    ],
    strategyHint: "Eliminate x or y by multiplying equations suitably.",
    pastBoardYear: "2023",
    policyTag: "NEP-2020/MCQ emphasis/Must-crack",
  },

  {
    id: "2026-PLE-SA-02",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The sum of two numbers is 70. Three times the smaller number exceeds the larger by 10. Find the numbers using the method of elimination.",
    answer: "Smaller number = 20, larger number = 50.",
    finalAnswer: "The numbers are 20 and 50.",
    explanation:
      "Let numbers be x and y with x > y. x + y = 70, 3y = x + 10. Substitute x = 70 − y in the second equation to solve for y, then find x.",
    solutionSteps: [
      "Let the numbers be x and y with x > y.",
      "Use x + y = 70 and 3y = x + 10.",
      "Express x from the first equation and substitute in the second.",
      "Solve for y, then for x.",
      "State both numbers clearly.",
    ],
    strategyHint:
      "Convert the word problem into two linear equations, then use substitution.",
    pastBoardYear: "2022",
    policyTag: "Algebra word-problem/Standard board flavour",
  },

  {
    id: "2026-PLE-SA-03",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Solve the following pair of equations using substitution: x + 2y = 7, 3x − y = 8.",
    answer: "x = 3, y = 2.",
    finalAnswer: "x = 3, y = 2.",
    explanation:
      "From x + 2y = 7, x = 7 − 2y. Substitute into 3x − y = 8 and solve.",
    solutionSteps: [
      "Make x the subject from x + 2y = 7.",
      "Substitute into the second equation.",
      "Simplify to get an equation in y.",
      "Find y and then back-substitute to get x.",
    ],
    strategyHint: "Always isolate a variable from the simpler equation.",
    pastBoardYear: "2021",
    policyTag: "Basic substitution method/1–2 mark pattern",
  },

  {
    id: "2026-PLE-LA-04",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The sum of the numerator and denominator of a fraction is 11. If 2 is added to the numerator and 3 is added to the denominator, the new fraction becomes 3/4. Find the original fraction.",
    answer: "The original fraction is 5/6.",
    finalAnswer: "Original fraction = 5/6.",
    explanation:
      "Let fraction be x/y. x + y = 11 and (x + 2)/(y + 3) = 3/4. Cross-multiply and solve the linear pair to get x = 5, y = 6.",
    solutionSteps: [
      "Let the fraction be x/y and form x + y = 11.",
      "Use (x + 2)/(y + 3) = 3/4 and cross-multiply.",
      "Simplify to obtain a second linear equation.",
      "Solve the pair of equations.",
      "Identify x and y as numerator and denominator.",
    ],
    strategyHint:
      "Translate the fraction condition into an equation using cross-multiplication.",
    pastBoardYear: "2020",
    policyTag: "Classic 4–5 mark linear word problem",
  },

  // ========== QUADRATIC EQUATIONS (MUST-CRACK) ==========

  {
    id: "2026-QE-MCQ-01",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For what value of k does the equation 3x² + 6x + k = 0 have equal roots?",
    options: ["k = 0", "k = 1", "k = 3", "k = 6"],
    answer: "k = 3",
    finalAnswer: "k = 3.",
    explanation:
      "Equal roots when D = 0. Here D = 6² − 4·3·k = 36 − 12k. Set 36 − 12k = 0 to get k = 3.",
    solutionSteps: [
      "Recall: equal roots when D = b² − 4ac = 0.",
      "Identify a = 3, b = 6, c = k.",
      "Compute D = 36 − 12k.",
      "Set D = 0 and solve for k.",
    ],
    strategyHint: "Immediately use discriminant condition instead of solving fully.",
    pastBoardYear: "2025",
    policyTag: "NEP-2020/MCQ/Discriminant focus",
  },

  {
    id: "2026-QE-LA-02",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The product of two consecutive positive integers is 156. Form a quadratic equation and find the integers.",
    answer: "The integers are 12 and 13.",
    finalAnswer: "Required integers: 12 and 13.",
    explanation:
      "Let smaller integer be n. Then n(n + 1) = 156 ⇒ n² + n − 156 = 0. Factorise as (n + 13)(n − 12) = 0. Take n = 12 (positive).",
    solutionSteps: [
      "Let the smaller integer be n; next is n + 1.",
      "Write n(n + 1) = 156.",
      "Bring all terms to one side to form a quadratic equation.",
      "Factorise or use the quadratic formula.",
      "Reject negative solution and keep the positive n.",
      "State the two consecutive integers.",
    ],
    strategyHint:
      "Translate product of consecutive integers directly into n(n + 1).",
    pastBoardYear: "2023",
    policyTag: "Application word problem/Medium difficulty",
  },

  {
    id: "2026-QE-SA-03",
    topicKey: "Quadratic Equations",
    subtopic: "Algebraic Solution",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText: "Solve the equation 2x² − 7x + 3 = 0 by factorisation.",
    answer: "x = 3 or x = 1/2.",
    finalAnswer: "x = 3 or x = 1/2.",
    explanation:
      "Split −7x into −x − 6x, factorise to (2x − 1)(x − 3) = 0, giving x = 1/2 or 3.",
    solutionSteps: [
      "Write 2x² − 7x + 3 as 2x² − x − 6x + 3.",
      "Group terms and factorise to get (2x − 1)(x − 3) = 0.",
      "Set each factor equal to zero.",
      "Solve for x in each case.",
    ],
    strategyHint:
      "Choose two numbers whose product is a·c and sum is b to split the middle term.",
    pastBoardYear: "2022",
    policyTag: "Algebraic solution/Factorisation practice",
  },

  {
    id: "2026-QE-LA-04",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A teacher gives students the quadratic equation ax² + 5x + 6 = 0 and asks them to find the values of a for which the equation has (i) real and distinct roots, (ii) real and equal roots, and (iii) no real roots. Answer all three parts.",
    answer:
      "(i) a < 25/24 for real and distinct roots, (ii) a = 25/24 for real and equal roots, (iii) a > 25/24 for no real roots.",
    finalAnswer:
      "a < 25/24 ⇒ distinct roots; a = 25/24 ⇒ equal roots; a > 25/24 ⇒ no real roots.",
    explanation:
      "D = 5² − 4·a·6 = 25 − 24a. For D > 0, a < 25/24; for D = 0, a = 25/24; for D < 0, a > 25/24.",
    solutionSteps: [
      "Compute D = 25 − 24a.",
      "Use D > 0 to get inequality for distinct roots.",
      "Use D = 0 for equal roots.",
      "Use D < 0 for no real roots.",
      "Solve each case separately and summarise.",
    ],
    strategyHint:
      "Change only the condition on D; the expression 25 − 24a stays the same.",
    pastBoardYear: "2024",
    policyTag: "Case-based/Discriminant concept integration",
  },

  // ========== ARITHMETIC PROGRESSION (HIGH-ROI) ==========

  {
    id: "2026-AP-MCQ-01",
    topicKey: "Arithmetic Progression",
    subtopic: "General Term",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "In an AP, the first term is 7 and common difference is 3. The 10th term is:",
    options: ["34", "37", "28", "40"],
    answer: "34",
    explanation:
      "Use aₙ = a + (n − 1)d = 7 + 9 × 3 = 7 + 27 = 34.",
    solutionSteps: [
      "Write the formula aₙ = a + (n − 1)d.",
      "Substitute a = 7, d = 3, n = 10.",
      "Simplify to get the 10th term.",
    ],
    strategyHint: "Remember that the first term corresponds to n = 1.",
    pastBoardYear: "2022",
    policyTag: "Direct formula MCQ/AP",
  },

  {
    id: "2026-AP-SA-02",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "How many terms of the AP 5, 8, 11, ... must be taken so that the sum is 155?",
    answer: "10 terms.",
    finalAnswer: "10 terms of the AP are needed.",
    explanation:
      "Here a = 5, d = 3. Let n terms have sum 155. Sₙ = n/2[2a + (n − 1)d] = 155. Solve n/2[10 + 3(n − 1)] = 155 ⇒ n(3n + 7) = 310 ⇒ 3n² + 7n − 310 = 0 ⇒ n = 10.",
    solutionSteps: [
      "Identify a = 5, d = 3.",
      "Use Sₙ = n/2[2a + (n − 1)d].",
      "Substitute Sₙ = 155 and simplify to get a quadratic in n.",
      "Solve the quadratic equation.",
      "Reject negative root and keep positive integer n.",
    ],
    strategyHint:
      "Sum questions often reduce to a quadratic; check that n is a positive integer.",
    pastBoardYear: "2023",
    policyTag: "AP sum/board pattern",
  },

  // ========== COORDINATE GEOMETRY (HIGH-ROI) ==========

  {
    id: "2026-CG-MCQ-01",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The distance between points (3, 4) and (0, 0) is:",
    options: ["3", "4", "5", "7"],
    answer: "5",
    explanation:
      "Distance = √[(3 − 0)² + (4 − 0)²] = √(9 + 16) = √25 = 5.",
    solutionSteps: [
      "Apply distance formula: √[(x₂ − x₁)² + (y₂ − y₁)²].",
      "Substitute (3,4) and (0,0).",
      "Simplify inside the square root and then take the root.",
    ],
    strategyHint:
      "Recognise the classic 3–4–5 right triangle pattern for quick mental calculation.",
    pastBoardYear: "2021",
    policyTag: "Direct formula MCQ/Distance",
  },

  {
    id: "2026-CG-SA-02",
    topicKey: "Coordinate Geometry",
    subtopic: "Section Formula",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the coordinates of the point which divides the line segment joining (2, −3) and (8, 9) in the ratio 1 : 2 internally.",
    answer: "(6, 5)",
    finalAnswer: "The required point is (6, 5).",
    explanation:
      "Use internal section formula: ( (m₂x₁ + m₁x₂)/(m₁ + m₂), (m₂y₁ + m₁y₂)/(m₁ + m₂) ). With m₁:m₂ = 1:2, we get (6, 5).",
    solutionSteps: [
      "Let A(2, −3), B(8, 9) and point P divide AB in ratio 1:2.",
      "Use section formula for internal division.",
      "Compute x-coordinate of P.",
      "Compute y-coordinate of P.",
      "Write final coordinates.",
    ],
    strategyHint:
      "Keep the ratio order consistent with which point you assign m₁ and m₂.",
    pastBoardYear: "2023",
    policyTag: "Section formula standard",
  },

  // ========== TRIGONOMETRY (MUST-CRACK) ==========

  {
    id: "2026-TRIG-SA-01",
    topicKey: "Trigonometry",
    subtopic: "Trig Identities/Proofs",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Prove that (1 − tan²θ) / (1 + tan²θ) = cos 2θ, for all θ for which both sides are defined.",
    answer: "The identity holds true.",
    finalAnswer:
      "For all admissible θ, (1 − tan²θ)/(1 + tan²θ) = cos 2θ.",
    explanation:
      "Convert tanθ to sinθ/cosθ, simplify using sin²θ + cos²θ = 1 and recognise cos²θ − sin²θ as cos 2θ.",
    solutionSteps: [
      "Start with LHS: (1 − tan²θ)/(1 + tan²θ).",
      "Write tanθ as sinθ/cosθ.",
      "Simplify numerator and denominator separately.",
      "Use sin²θ + cos²θ = 1 to simplify.",
      "Recognise cos²θ − sin²θ as cos 2θ.",
    ],
    strategyHint:
      "For trig identities, convert everything to sine and cosine first.",
    pastBoardYear: "2023",
    policyTag: "Identity proof/Trig algebra",
  },

  {
    id: "2026-TRIG-LA-02",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From the top of a 15 m high tower, the angle of elevation of the top of a vertical flagstaff is 30° and the angle of depression of its foot is 45°. Find the height of the flagstaff. (Take √3 ≈ 1.732.)",
    answer: "Height of flagstaff ≈ 23.7 m.",
    finalAnswer: "Height of flagstaff ≈ 23.7 m.",
    explanation:
      "Let distance between tower and flagstaff be x. Using tan 45° gives x = 15. Using tan 30° = (h − 15)/15 gives h ≈ 23.7 m.",
    solutionSteps: [
      "Draw the figure with two right triangles sharing the horizontal distance.",
      "Use tan 45° for the lower triangle to get x = 15 m.",
      "Use tan 30° = (h − 15)/15 for the upper triangle.",
      "Solve for h − 15, then add 15 to get h.",
      "Approximate using √3 ≈ 1.732.",
    ],
    strategyHint:
      "Separate the problem into two right triangles with a common base.",
    pastBoardYear: "2022",
    policyTag: "Heights & distances/Two-position angle",
  },

  {
    id: "2026-TRIG-MCQ-03",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText: "The value of sin 60° − cos 30° is:",
    options: ["0", "1/2", "√3/2", "1"],
    answer: "0",
    finalAnswer: "0.",
    explanation:
      "sin 60° = √3/2 and cos 30° = √3/2, so their difference is 0.",
    solutionSteps: [
      "Recall standard values for sin 60° and cos 30°.",
      "Subtract and simplify.",
    ],
    strategyHint: "Memorise the standard trig table for 0°, 30°, 45°, 60°, 90°.",
    pastBoardYear: "2021",
    policyTag: "Single-step MCQ/Standard values",
  },

  {
    id: "2026-TRIG-SA-04",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Without using tables, evaluate: (2 sin 30° + 3 cos 60°) / (sin 45° + cos 45°).",
    answer: "5/(2√2)",
    finalAnswer: "The value is 5/(2√2).",
    explanation:
      "sin 30° = 1/2, cos 60° = 1/2, sin 45° = cos 45° = 1/√2. Numerator = 2·1/2 + 3·1/2 = 5/2. Denominator = 1/√2 + 1/√2 = √2. So the value is (5/2)/√2 = 5/(2√2).",
    solutionSteps: [
      "Substitute standard values of sin and cos.",
      "Compute the numerator.",
      "Compute the denominator.",
      "Divide numerator by denominator and simplify.",
    ],
    strategyHint:
      "Break such expressions into numerator and denominator pieces first.",
    pastBoardYear: "2020",
    policyTag: "Trig value manipulation/Medium level",
  },

  {
    id: "2026-TRIG-LA-05",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A boy is standing at a point A on level ground such that the angle of elevation of the top of a school building is 45°. When he walks 20 m closer to the building to a point B, the angle of elevation becomes 60°. Draw a rough figure and find the height of the building, correct to one decimal place.",
    answer: "Height of the building ≈ 27.3 m.",
    finalAnswer: "Height of the building ≈ 27.3 m.",
    explanation:
      "Let height be h and initial distance x. From tan 45° = h/x, h = x. From B, tan 60° = h/(x − 20) gives √3 = x/(x − 20). Solve for x and then h.",
    solutionSteps: [
      "Draw two positions A and B and the vertical building.",
      "Let AB = 20 m and initial distance from building be x.",
      "Use tan 45° = h/x to get h = x.",
      "Use tan 60° = h/(x − 20) and substitute h = x.",
      "Solve for x and thus for h.",
      "Round the height to one decimal place.",
    ],
    strategyHint:
      "Most two-position problems reduce to solving two tan equations in two unknowns.",
    pastBoardYear: "2024",
    policyTag: "Case-based/Heights & distances/Two angles",
  },

  // ========== CIRCLES (HIGH-ROI) ==========

  {
    id: "2026-CIRC-SA-01",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Prove that the tangent at any point of a circle is perpendicular to the radius through the point of contact.",
    answer:
      "The tangent at a point on a circle is perpendicular to the radius through that point.",
    finalAnswer:
      "If OP is radius and PT is tangent at P, then OP ⟂ PT.",
    explanation:
      "Join the centre O to the point of contact P. Any other point Q on the tangent has OQ > OP, so OP is the shortest distance from O to the tangent. Hence OP ⟂ tangent at P.",
    solutionSteps: [
      "Consider circle with centre O and tangent at P touching circle.",
      "Join OP and any other segment OQ to a point Q on the tangent.",
      "Use the property that the shortest distance from a point to a line is the perpendicular.",
      "Show that OP is the shortest distance.",
      "Conclude that OP ⟂ tangent at P.",
    ],
    strategyHint:
      "Think of shortest distance from a point to a line being the perpendicular segment.",
    pastBoardYear: "2023",
    policyTag: "Tangents/radius property",
  },

  // ========== AREAS RELATED TO CIRCLES (GOOD-TO-DO) ==========

  {
    id: "2026-ARC-SA-01",
    topicKey: "Areas Related to Circles",
    subtopic: "Sector & Segment",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the area of a sector of a circle with radius 7 cm and central angle 120°. (Use π = 22/7.)",
    answer: "Approx. 51.3 cm².",
    finalAnswer: "Area of the sector = 51.3 cm² (approx.).",
    explanation:
      "Sector area = (θ/360) × πr² = 120/360 × 22/7 × 49 = (1/3) × 154 = 51.3 cm².",
    solutionSteps: [
      "Use formula for area of a sector: (θ/360) × πr².",
      "Substitute θ = 120°, r = 7 cm.",
      "Simplify the fraction and multiply.",
      "Round if required.",
    ],
    strategyHint:
      "120° is one-third of 360°, so area is one-third of full circle area.",
    pastBoardYear: "2022",
    policyTag: "Sector area/basic computation",
  },

  // ========== SURFACE AREAS AND VOLUMES (HIGH-ROI) ==========

  {
    id: "2026-SAV-SA-01",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Combination of Solids",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A solid toy is in the form of a hemisphere of radius 3.5 cm mounted on a right circular cone of height 4 cm and same base radius. Find the total surface area of the toy. (Use π = 22/7.)",
    answer: "Total surface area ≈ 131.9 cm².",
    finalAnswer: "Total surface area of the toy ≈ 131.9 cm².",
    explanation:
      "Total surface area = curved surface area of cone + curved surface area of hemisphere. Compute slant height of cone using √(r² + h²), then add both areas.",
    solutionSteps: [
      "Identify radius r = 3.5 cm and height of cone h = 4 cm.",
      "Compute slant height l = √(r² + h²).",
      "Find curved surface area of cone: πrl.",
      "Find curved surface area of hemisphere: 2πr².",
      "Add both to get total surface area.",
    ],
    strategyHint:
      "Do not include base area of cone; hemisphere covers it.",
    pastBoardYear: "2023",
    policyTag: "Combination of solids/Surface area",
  },

  // ========== STATISTICS (MUST-CRACK) ==========

  {
    id: "2026-STAT-SA-01",
    topicKey: "Statistics",
    subtopic: "Mean of Grouped Data",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The following table shows the marks obtained by 40 students in a test. Using the assumed mean method, find the mean marks.\n\nClass: 0–10, 10–20, 20–30, 30–40, 40–50\nFrequency: 4, 6, 14, 10, 6",
    answer: "Mean marks = 28.5.",
    finalAnswer: "Mean marks ≈ 28.5.",
    explanation:
      "Find midpoints, take assumed mean 25 or 30, compute deviations and f·d, then use mean formula for assumed mean method.",
    solutionSteps: [
      "Write class intervals and find class marks (midpoints).",
      "Choose a convenient assumed mean A (e.g., 25 or 30).",
      "Compute deviation d = (xᵢ − A)/h and fᵢdᵢ.",
      "Use mean formula: x̄ = A + (Σfᵢdᵢ / Σfᵢ) × h.",
      "Substitute values and compute x̄.",
    ],
    strategyHint:
      "Assumed mean method reduces calculations by shifting origin and scale.",
    pastBoardYear: "2022",
    policyTag: "Grouped data mean/Assumed mean method",
  },

  {
    id: "2026-STAT-CASE-01",
    topicKey: "Statistics",
    subtopic: "Mean/Median/Mode",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A teacher collects weekly test scores for five students: 18, 20, 15, 22, 15. Find the mode, median, and mean of the data.",
    answer: "Mode = 15, Median = 18, Mean = 18.",
    finalAnswer: "Mode = 15, Median = 18, Mean = 18.",
    explanation:
      "Arrange in ascending order: 15, 15, 18, 20, 22. Mode is 15, median is 18, and mean is 90/5 = 18.",
    solutionSteps: [
      "List the data and arrange in ascending order.",
      "Identify the most frequent value as the mode.",
      "Take the middle value as the median.",
      "Compute the sum of all values and divide by 5 for the mean.",
    ],
    strategyHint:
      "For small data sets, order the numbers first; it makes all three measures easy to see.",
    pastBoardYear: "2023",
    policyTag: "Case-based mandatory, NEP 2020/Statistics",
  },

  // ========== PROBABILITY (MUST-CRACK) ==========

  {
    id: "2026-PROB-MCQ-01",
    topicKey: "Probability",
    subtopic: "Classical Probability",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "A card is drawn at random from a well-shuffled pack of 52 playing cards. The probability of getting a king is:",
    options: ["1/26", "1/13", "1/52", "4/13"],
    answer: "1/13",
    explanation:
      "There are 4 kings in 52 cards. Probability = 4/52 = 1/13.",
    solutionSteps: [
      "Count favourable outcomes (4 kings).",
      "Total outcomes = 52.",
      "Use probability formula P(E) = favourable/total.",
    ],
    strategyHint: "Remember there are 4 cards of each denomination.",
    pastBoardYear: "2021",
    policyTag: "Basic probability/Single-event",
  },

  {
    id: "2026-PROB-SA-02",
    topicKey: "Probability",
    subtopic: "Complementary Events",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "A bag contains 5 red and 3 blue balls. One ball is drawn at random. What is the probability that the ball drawn is not blue?",
    answer: "5/8",
    finalAnswer: "Probability = 5/8.",
    explanation:
      "There are 3 blue balls, so probability of blue is 3/8. Probability of not blue = 1 − 3/8 = 5/8. Alternatively, directly favourable red outcomes 5 out of 8.",
    solutionSteps: [
      "Total balls = 5 + 3 = 8.",
      "Favourable outcomes for 'not blue' are red balls = 5.",
      "Compute probability as 5/8.",
      "Or use P(not blue) = 1 − P(blue).",
    ],
    strategyHint:
      "Sometimes complementary probability (1 − P(E)) is quicker.",
    pastBoardYear: "2023",
    policyTag: "Simple complementary probability",
  },

  // -------- END OF PART 1/2 --------
   // ===== MORE: POLYNOMIALS =====
  {
    id: "2026-POLY-MCQ-02",
    topicKey: "Polynomials",
    subtopic: "Relationship Between Coefficients and Zeros",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If α and β are zeroes of x² − 7x + 12, then αβ equals:",
    options: ["7", "−12", "12", "−7"],
    answer: "12",
    explanation:
      "Product of zeroes for ax²+bx+c is c/a. Here c = 12, a = 1 ⇒ αβ = 12.",
    pastBoardYear: "2024",
    policyTag: "Formula-based MCQ",
  },
  {
    id: "2026-POLY-AR-03",
    topicKey: "Polynomials",
    subtopic: "Zeros & Graph Behaviour",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The graph of y = (x−2)(x−5) cuts the x-axis at two points. Reason (R): A quadratic with two distinct real zeroes has its graph intersecting the x-axis at two distinct points.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "The roots are x = 2 and x = 5 (distinct). Distinct real roots imply two x-intercepts.",
    pastBoardYear: "2023",
    policyTag: "AR/Graph link to roots",
  },
  {
    id: "2026-POLY-CASE-04",
    topicKey: "Polynomials",
    subtopic: "Factor Theorem & Modelling",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A rectangular garden’s area (in m²) varies with its length x (m) as p(x)=x³−10x²+29x−20, for a fixed perimeter scheme. A contractor claims (x−1) and (x−4) are factors. (i) Verify both factors. (ii) Factorise p(x) completely. (iii) Find all possible integer lengths.",
    answer:
      "(i) p(1)=0, p(4)=0. (ii) p(x)=(x−1)(x−4)(x−5). (iii) x ∈ {1,4,5} (check feasibility).",
    explanation:
      "Use Factor Theorem for x = 1, 4, then divide to obtain the third factor x−5.",
    pastBoardYear: "2022",
    policyTag: "Case-based/realistic context",
  },

  // ===== MORE: PAIR OF LINEAR EQUATIONS =====
  {
    id: "2026-PLE-AR-05",
    topicKey: "Pair of Linear Equations",
    subtopic: "Consistency & Graphical Meaning",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The system 2x+3y=7 and 4x+6y=14 has infinitely many solutions. Reason (R): If a₁/a₂ = b₁/b₂ = c₁/c₂, the pair is consistent and dependent.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Second equation is a multiple of the first; hence infinitely many solutions.",
    pastBoardYear: "2021",
    policyTag: "AR/Consistency conditions",
  },
  {
    id: "2026-PLE-CASE-06",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word Problems/Two Variables",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A school canteen sells samosas and idlis. On a day, 120 items were sold for ₹1,020. A samosa costs ₹9 and an idli costs ₹6. (i) Form linear equations. (ii) Solve to find quantities sold of each.",
    answer:
      "Let x,y be samosas,idlis: x+y=120; 9x+6y=1020 ⇒ x=60, y=60.",
    explanation:
      "Solve the linear pair using elimination/substitution.",
    pastBoardYear: "2024",
    policyTag: "Contextual/standard pair",
  },

  // ===== MORE: QUADRATIC EQUATIONS =====
  {
    id: "2026-QE-AR-05",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The equation x²−6x+11=0 has no real roots. Reason (R): If D=b²−4ac<0, the quadratic has complex (non-real) roots.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "D=36−44=−8<0 ⇒ no real roots.",
    pastBoardYear: "2023",
    policyTag: "AR/Discriminant test",
  },
  {
    id: "2026-QE-SA-06",
    topicKey: "Quadratic Equations",
    subtopic: "Forming Equations",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Creating",
    questionText:
      "Form the quadratic equation whose roots are 3 and −2. Verify by expanding.",
    answer:
      "Equation: (x−3)(x+2)=0 ⇒ x²−x−6=0.",
    explanation:
      "Sum=1, product=−6 ⇒ x²−(sum)x+(product)=0 ⇒ x²−x−6=0.",
    pastBoardYear: "2021",
    policyTag: "Roots→Equation construction",
  },

  // ===== MORE: ARITHMETIC PROGRESSION =====
  {
    id: "2026-AP-AR-03",
    topicKey: "Arithmetic Progression",
    subtopic: "nth Term & Sum",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): If the 10th term of an AP is 25 and the 20th term is 45, then the common difference is 2. Reason (R): In any AP, aₙ = a + (n−1)d.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "a+9d=25 and a+19d=45 ⇒ 10d=20 ⇒ d=2.",
    pastBoardYear: "2022",
    policyTag: "AR/AP nth-term relation",
  },
  {
    id: "2026-AP-CASE-04",
    topicKey: "Arithmetic Progression",
    subtopic: "Applications",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A staircase has steps whose heights (in cm) form an AP: 14, 15, 16, ... If the top step is 20 cm high, how many steps are there? What is the total height climbed?",
    answer:
      "d=1, last term=20 ⇒ n such that a+(n−1)d=20 ⇒ 14+(n−1)=20 ⇒ n=7. Total height Sₙ = n/2(2a+(n−1)d)=7/2(28+6)=7/2·34=119 cm.",
    explanation:
      "Use nth term for count; then AP sum for total height.",
    pastBoardYear: "2024",
    policyTag: "Practical AP modelling",
  },

  // ===== MORE: TRIANGLES =====
  {
    id: "2026-TRI-MCQ-03",
    topicKey: "Triangles",
    subtopic: "Area Ratio & Similarity",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "If two triangles are similar with side ratio 3:5, then the ratio of their areas is:",
    options: ["3:5", "5:3", "9:25", "25:9"],
    answer: "9:25",
    explanation:
      "Area ratio equals square of side ratio ⇒ (3/5)²=9/25.",
    pastBoardYear: "2021",
    policyTag: "Direct similarity fact",
  },
  {
    id: "2026-TRI-SA-04",
    topicKey: "Triangles",
    subtopic: "Midpoint/Parallel Line Theorems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In ΔABC, D and E are midpoints of AB and AC respectively. Prove that DE ∥ BC and DE = (1/2)·BC.",
    answer:
      "DE ∥ BC and DE = (1/2)·BC.",
    explanation:
      "Midpoint theorem: segment joining midpoints of two sides is parallel to the third side and half of it.",
    pastBoardYear: "2023",
    policyTag: "Theorem application",
  },

  // ===== MORE: COORDINATE GEOMETRY =====
  {
    id: "2026-CG-MCQ-03",
    topicKey: "Coordinate Geometry",
    subtopic: "Area of Triangle (Coordinates)",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Area of the triangle with vertices (0,0), (4,0), (0,3) is:",
    options: ["6", "7", "12", "3"],
    answer: "6",
    explanation:
      "Right triangle with legs 4 and 3: area = 1/2·4·3=6.",
    pastBoardYear: "2022",
    policyTag: "Direct area computation",
  },
  {
    id: "2026-CG-SA-04",
    topicKey: "Coordinate Geometry",
    subtopic: "Collinearity Test",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Check whether the points (1,2), (3,6), (5,10) are collinear.",
    answer:
      "Yes, they are collinear.",
    explanation:
      "Area of triangle using determinant is zero (or equal slopes). Slopes 2→6 is 2; 6→10 is 2.",
    pastBoardYear: "2023",
    policyTag: "Collinearity via slope/area",
  },

  // ===== MORE: CIRCLES =====
  {
    id: "2026-CIRC-SA-02",
    topicKey: "Circles",
    subtopic: "Tangent-Secant Theorem",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From an external point P, a tangent PT and a secant PAB are drawn to a circle with centre O. Prove that PT² = PA·PB.",
    answer: "PT² = PA·PB.",
    explanation:
      "Power of a point theorem (tangent-secant).",
    pastBoardYear: "2021",
    policyTag: "Standard tangent-secant relation",
  },
  {
    id: "2026-CIRC-AR-03",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): Tangents drawn from an external point to a circle are equal in length. Reason (R): The triangles formed by radii to the points of contact are congruent right triangles.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "OP ⟂ PT at point of contact; use congruence to show equality.",
    pastBoardYear: "2022",
    policyTag: "AR/Equal tangents",
  },

  // ===== MORE: AREAS RELATED TO CIRCLES =====
  {
    id: "2026-ARC-MCQ-02",
    topicKey: "Areas Related to Circles",
    subtopic: "Sector & Segment",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If arc length of a circle is L for central angle θ (in radians), then area of the sector is:",
    options: ["Lr", "L/2", "1/2·r·L", "r²/L"],
    answer: "1/2·r·L",
    explanation:
      "Area of sector = (1/2)·r·L (when θ is in radians).",
    pastBoardYear: "2021",
    policyTag: "Sector formula (radian form)",
  },

  // ===== MORE: SURFACE AREAS & VOLUMES =====
  {
    id: "2026-SAV-SA-02",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Frustum/Combination",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A bucket is in the shape of a frustum of a cone with top radius 14 cm, bottom radius 7 cm and height 20 cm. Find its volume. (Use π = 22/7.)",
    answer:
      "Volume = (1/3)πh(R²+Rr+r²) = (1/3)·(22/7)·20·(196+98+49) = (20·22/21)·343 ≈ 7,180 cm³.",
    explanation:
      "Apply frustum volume formula with R=14, r=7, h=20.",
    pastBoardYear: "2024",
    policyTag: "Frustum formula application",
  },

  // ===== MORE: STATISTICS =====
  {
    id: "2026-STAT-SA-02",
    topicKey: "Statistics",
    subtopic: "Median of Grouped Data",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Using the median formula for grouped data, find the median of the distribution:\nClass: 0–10, 10–20, 20–30, 30–40, 40–50\nFrequency: 5, 9, 14, 8, 4",
    answer:
      "Median class: 20–30; median ≈ 24.3 (approx.).",
    explanation:
      "Find cumulative frequencies; locate n/2; use median formula: L + [(n/2−cf)/f]·h.",
    pastBoardYear: "2023",
    policyTag: "Grouped median",
  },
  {
    id: "2026-STAT-AR-03",
    topicKey: "Statistics",
    subtopic: "Mode (Grouped Data)",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): For grouped data, the modal class is the class with highest frequency. Reason (R): The mode of grouped data is given by the empirical formula Mode ≈ L + [(f₁−f₀)/(2f₁−f₀−f₂)]·h.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Highest frequency decides modal class; formula estimates the mode within that class.",
    pastBoardYear: "2022",
    policyTag: "AR/Mode estimation",
  },

  // ===== MORE: PROBABILITY =====
  {
    id: "2026-PROB-MCQ-03",
    topicKey: "Probability",
    subtopic: "Complement & Union",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If P(A)=0.3 and P(B)=0.5 and A,B are mutually exclusive, then P(A∪B)=?",
    options: ["0.2", "0.5", "0.8", "0.15"],
    answer: "0.8",
    explanation:
      "Mutually exclusive ⇒ P(A∪B)=P(A)+P(B)=0.3+0.5=0.8.",
    pastBoardYear: "2021",
    policyTag: "Basic addition rule",
  },
  {
    id: "2026-PROB-SA-04",
    topicKey: "Probability",
    subtopic: "Without Replacement (Simple)",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A bag contains 4 red and 2 blue balls. Two balls are drawn without replacement. Find the probability that both are red.",
    answer:
      "P = (4/6)·(3/5)=2/5.",
    explanation:
      "First red: 4/6; then red: 3/5. Multiply.",
    pastBoardYear: "2024",
    policyTag: "Two-step probability",
  },

  // ===== APPLICATIONS OF TRIGONOMETRY (Heights & Distances) =====
  {
    id: "2026-TRIG-APP-MCQ-06",
    topicKey: "Trigonometry",
    subtopic: "Heights & Distances (single angle)",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "If the angle of elevation of the top of a tower from a point on level ground is 30° and the distance from the point to the foot of the tower is 20 m, the height of the tower is:",
    options: ["10 m", "20/√3 m", "20√3 m", "10√3 m"],
    answer: "20/√3 m",
    explanation:
      "tan 30° = h/20 ⇒ 1/√3 = h/20 ⇒ h = 20/√3.",
    policyTag: "Direct single-angle model",
  },
  {
    id: "2026-TRIG-APP-SA-07",
    topicKey: "Trigonometry",
    subtopic: "Two-positions method",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From a point A on the ground, the angle of elevation of the top of a vertical tower is 45°. On walking 14 m towards the tower to a point B, the angle becomes 60°. Find the height of the tower (√3 ≈ 1.732).",
    answer: "≈ 24.2 m",
    explanation:
      "Let height = h, initial distance = x. tan45° ⇒ h=x. tan60° ⇒ h/(x−14)=√3. Substitute h=x to get x/(x−14)=√3 ⇒ x≈24.2 ⇒ h≈24.2.",
    policyTag: "Two-position standard",
  },
  {
    id: "2026-TRIG-APP-CASE-08",
    topicKey: "Trigonometry",
    subtopic: "Mixed angles (elevation & depression)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "From the top of a lighthouse, the angles of depression of two boats on the same straight line with the base are 30° and 45°. If the lighthouse is 40 m high, find the distance between the boats.",
    answer:
      "Let distances from foot be x (for 30°) and y (for 45°). x=40/ tan30°=40√3; y=40/ tan45°=40. Distance = 40(√3 − 1) m.",
    explanation:
      "Use tan for depression angles w.r.t. horizontal, distances on same line.",
    policyTag: "Depression pair",
  },

  // ===== CONSTRUCTIONS =====
  {
    id: "2026-CONST-SA-01",
    topicKey: "Constructions",
    subtopic: "Divide a line segment",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Describe the steps of construction to divide a line segment AB in the ratio 3:5 using a compass and straightedge.",
    answer:
      "Draw a ray AX making an acute angle with AB; mark 8 equal points A1...A8 on AX; join A8 to B; draw through A3 a line parallel to A8B meeting AB at P; AP:PB = 3:5.",
    explanation:
      "Uses basic proportionality via parallel lines.",
    policyTag: "Steps-only board style",
  },
  {
    id: "2026-CONST-SA-02",
    topicKey: "Constructions",
    subtopic: "Construct a triangle similar to a given triangle",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Construct a triangle similar to a given ΔABC with scale factor 3/2 (enlargement). Write steps.",
    answer:
      "Draw a ray from A; mark 2+1=3 equal segments; join second point to C; draw parallel through third point to obtain C′; similarly obtain B′; ΔAB′C′ ~ ΔABC with factor 3/2.",
    explanation:
      "Use intercept theorem to scale sides proportionally.",
    policyTag: "Similarity construction",
  },
  {
    id: "2026-CONST-AR-03",
    topicKey: "Constructions",
    subtopic: "Tangent to circle",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): To draw tangents from an external point P to a circle with centre O, one constructs the circle with OP as diameter. Reason (R): The right angle in a semicircle ensures the constructed points are points of tangency.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Radial right angle gives tangent condition.",
    policyTag: "AR/tangent construction",
  },

  // ===== COORDINATE GEOMETRY (Richer sets) =====
  {
    id: "2026-CG-CASE-05",
    topicKey: "Coordinate Geometry",
    subtopic: "Section + Distance (combo)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A(2,−1) and B(8,5). P divides AB internally in ratio 2:1. (i) Find P. (ii) Find distance AP. (iii) If Q is the midpoint of PB, find coordinates of Q.",
    answer:
      "(i) P( (1×2 + 2×8)/3, (1×(−1) + 2×5)/3 ) = (6, 3). (ii) AP = √[(6−2)²+(3+1)²]=√(16+16)=√32=4√2. (iii) Q midpoint of P(6,3) and B(8,5) ⇒ (7,4).",
    explanation:
      "Apply section formula, then distance and midpoint formulae.",
    policyTag: "Multi-skill combo",
  },
  {
    id: "2026-CG-SA-06",
    topicKey: "Coordinate Geometry",
    subtopic: "Triangle area (determinant)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find k if the points (k,1), (2,3) and (4,7) are collinear.",
    answer:
      "Area = 0 ⇒ | k 1 1; 2 3 1; 4 7 1 | = 0 ⇒ k=−2.",
    explanation:
      "Use determinant area formula for collinearity.",
    policyTag: "Determinant method",
  },

  // ===== CIRCLES (More patterns) =====
  {
    id: "2026-CIRC-CASE-04",
    topicKey: "Circles",
    subtopic: "Chord subtended angle",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "In a circle with centre O, chord AB subtends ∠AOB = 120°. (i) Show that arc length AB is (2πR)/3. (ii) Prove that the perpendicular from O to AB bisects AB. (iii) If radius is 6 cm, find area of sector AOB.",
    answer:
      "(i) θ=120° ⇒ (2πR)(120/360)=(2πR)/3. (ii) Radius ⟂ chord at midpoint. (iii) Area sector = (120/360)πR² = (1/3)π·36 = 12π cm².",
    explanation:
      "Use central angle relations and sector area formula.",
    policyTag: "Central angle + sector",
  },
  {
    id: "2026-CIRC-AR-05",
    topicKey: "Circles",
    subtopic: "Angle in the same segment",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): Angles in the same segment of a circle are equal. Reason (R): They subtend the same chord and intercept the same arc.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Same chord ⇒ same intercepted arc ⇒ equal subtended angles.",
    policyTag: "Segment theorem",
  },

  // ===== SURFACE AREAS & VOLUMES (Richer) =====
  {
    id: "2026-SAV-MCQ-03",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Right circular cylinder",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The curved surface area of a cylinder of radius r and height h is:",
    options: ["πr²h", "2πrh", "πrh", "2πr²h"],
    answer: "2πrh",
    explanation:
      "CSA (lateral area) of cylinder is 2πrh.",
    policyTag: "Direct formula",
  },
  {
    id: "2026-SAV-SA-04",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Spheres & Hemispheres (combo)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A solid iron sphere of radius 6 cm is melted and recast into solid spheres each of radius 3 cm. Find the number of small spheres formed.",
    answer:
      "Volume ratio = (4/3)π·6³ : (4/3)π·3³ = 216 : 27 = 8 ⇒ 8 spheres.",
    explanation:
      "Volume is conserved during recasting.",
    policyTag: "Volume conservation",
  },

  // ===== STATISTICS (Richer) =====
  {
    id: "2026-STAT-MCQ-03",
    topicKey: "Statistics",
    subtopic: "Mean/Median/Mode basics",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following is not a measure of central tendency?",
    options: ["Mean", "Median", "Mode", "Range"],
    answer: "Range",
    explanation:
      "Range measures dispersion, not central tendency.",
    policyTag: "Basics check",
  },
  {
    id: "2026-STAT-SA-04",
    topicKey: "Statistics",
    subtopic: "Ogive interpretation (qualitative)",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "A ‘less than’ ogive for marks of 100 students shows that 60 students scored below 40. Interpret the median approximately from the graph if the curve crosses 50 on the cumulative axis at 42 marks.",
    answer:
      "Median ≈ 42 marks.",
    explanation:
      "Median corresponds to N/2 on cumulative frequency; read x-value.",
    policyTag: "Ogive reading",
  },

  // ===== PROBABILITY (Richer) =====
  {
    id: "2026-PROB-AR-05",
    topicKey: "Probability",
    subtopic: "Independence",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): When two fair coins are tossed, events ‘first coin is Head’ and ‘second coin is Head’ are independent. Reason (R): The outcome of one coin does not affect the outcome of the other.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Sample space factorises; independence holds.",
    policyTag: "Independence concept",
  },
  {
    id: "2026-PROB-CASE-06",
    topicKey: "Probability",
    subtopic: "Conditional probability (simple counts)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A class has 12 boys and 8 girls. Two students are selected at random without replacement. (i) Find P(both girls). (ii) Find P(second is girl | first is boy). (iii) Which is more likely: both girls or a girl then a boy (in that order)?",
    answer:
      "(i) (8/20)·(7/19)=56/380=14/95. (ii) 8/19. (iii) Girl→Boy: (8/20)·(12/19)=96/380=24/95 > 14/95.",
    explanation:
      "Compute sequential probabilities; compare fractions.",
    policyTag: "Without replacement + conditional",
  },

  // ===== POLYNOMIALS (extra board-flavour) =====
  {
    id: "2026-POLY-AR-03X",
    topicKey: "Polynomials",
    subtopic: "Zeroes & Graph link",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): If a quadratic polynomial has exactly one zero, its graph touches the x-axis at one point. Reason (R): Discriminant D=0 implies a repeated real root and the parabola is tangent to the x-axis.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "D=0 ⇒ equal roots ⇒ the vertex lies on x-axis; tangent contact.",
    policyTag: "Graph-root relation",
  },
  {
    id: "2026-POLY-CASE-04X",
    topicKey: "Polynomials",
    subtopic: "Remainder & Factor use",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A cubic p(x) leaves remainders 2, −4 when divided by (x−1) and (x+1) respectively. (i) Find p(1) and p(−1). (ii) If (x−2) is a factor and p has integer coefficients, find p(x) up to a leading constant k and determine k if p(0)=−8.",
    answer:
      "(i) p(1)=2, p(−1)=−4. (ii) p(x)=k(x−2)(x−1)(x+1)+ax+b form collapses to k(x−2)(x−1)(x+1). Using p(0)=−8 ⇒ −2k = −8 ⇒ k=4; hence p(x)=4(x−2)(x−1)(x+1).",
    explanation:
      "Remainder theorem + given factor; use p(0) to fix k.",
    policyTag: "Remainder+factor synthesis",
  },

  // ===== PAIR OF LINEAR EQUATIONS (coverage extension) =====
  {
    id: "2026-PLE-AR-05X",
    topicKey: "Pair of Linear Equations",
    subtopic: "Consistency/Graph",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): If two linear equations represent parallel distinct lines, the system has no solution. Reason (R): For such pairs, a1/a2 = b1/b2 ≠ c1/c2.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Parallel distinct lines never intersect; ratio condition captures inconsistency.",
    policyTag: "Consistency criteria",
  },
  {
    id: "2026-PLE-CASE-06X",
    topicKey: "Pair of Linear Equations",
    subtopic: "Graph+Word mix",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A bus and a bike start from the same point. After t hours, their distances are given by d₁=40t and d₂=25t+15. (i) Find when they meet. (ii) If the bike increases speed by 5 km/h, re-calc meeting time.",
    answer:
      "(i) 40t=25t+15 ⇒ 15t=15 ⇒ t=1 h. (ii) New d₂=30t+15; 40t=30t+15 ⇒ 10t=15 ⇒ t=1.5 h.",
    explanation:
      "Form linear equations in t; solve directly.",
    policyTag: "Linear modeling",
  },

  // ===== QUADRATIC EQUATIONS (extra practice) =====
  {
    id: "2026-QE-SA-05",
    topicKey: "Quadratic Equations",
    subtopic: "Roots sum & product",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If α and β are the roots of x² − 7x + 12 = 0, find (i) α+β and (ii) αβ. Hence evaluate α²+β².",
    answer:
      "α+β=7, αβ=12; α²+β²=(α+β)²−2αβ=49−24=25.",
    explanation:
      "Use sum/product of roots identities; expand and substitute.",
    policyTag: "Roots identities",
  },

  // ===== ARITHMETIC PROGRESSION (richer cases) =====
  {
    id: "2026-AP-AR-03X",
    topicKey: "Arithmetic Progression",
    subtopic: "nth term vs sum",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): For a positive AP, if Sₙ is linear in n, then d=0. Reason (R): Sₙ=n/2[2a+(n−1)d] is quadratic in n unless d=0.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Only d=0 collapses quadratic term; otherwise Sₙ grows quadratically.",
    policyTag: "AP growth logic",
  },
  {
    id: "2026-AP-CASE-04X",
    topicKey: "Arithmetic Progression",
    subtopic: "Applications blend",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A stadium has 25 rows. The first row has 18 seats, each row has 3 more seats than the previous. (i) Find seats in the 25th row. (ii) Find total seats in the stadium.",
    answer:
      "(i) a=18, d=3 ⇒ a₂₅=18+24×3=90. (ii) S₂₅=25/2[2×18+(25−1)×3]=25/2[36+72]=25/2×108=1350.",
    explanation:
      "Use aₙ and Sₙ formulae with given a,d.",
    policyTag: "Worded AP sum",
  },

  // ===== TRIANGLES (theorems + similarity) =====
  {
    id: "2026-TRI-AR-03",
    topicKey: "Triangles",
    subtopic: "Similarity criteria",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): If two angles of one triangle are equal to two angles of another triangle, the triangles are similar. Reason (R): In triangles, the sum of interior angles is 180°.",
    answer:
      "A is true; R is true; and R is the correct explanation of A.",
    explanation:
      "AA-criterion holds because third angle also equals; 180° sum ensures it.",
    policyTag: "AA-similarity",
  },
  {
    id: "2026-TRI-CASE-04",
    topicKey: "Triangles",
    subtopic: "BPT + ratios",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "In ΔABC, D and E are midpoints of AB and AC respectively. (i) Prove DE ∥ BC. (ii) If AB=12 cm, AC=16 cm, find DE and the ratio of areas of ΔADE and ΔABC.",
    answer:
      "(i) Midpoint theorem ⇒ DE ∥ BC. (ii) DE=BC/2 (or use similarity); area ratio (ADE:ABC)=1:4.",
    explanation:
      "Midpoint theorem + similarity scaling on sides and areas.",
    policyTag: "Midpoint theorem usage",
  },

  // ===== COORDINATE GEOMETRY (finishing touches) =====
  {
    id: "2026-CG-AR-07",
    topicKey: "Coordinate Geometry",
    subtopic: "Slope & parallel/perpendicular",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): Lines with slopes m₁ and m₂ are perpendicular if m₁·m₂ = −1. Reason (R): The product of slopes equals −1 when angle between them is 90°.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Slope–angle relation gives perpendicularity condition.",
    policyTag: "Slope criteria",
  },

  // ===== TRIGONOMETRY (identities + proofs) =====
  {
    id: "2026-TRIG-AR-06",
    topicKey: "Trigonometry",
    subtopic: "Identities",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): For any angle θ where defined, 1+tan²θ = sec²θ. Reason (R): Dividing sin²θ+cos²θ=1 by cos²θ gives tan²θ+1=sec²θ.",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Direct derivation from Pythagorean identity.",
    policyTag: "Core identity",
  },

  // ===== CIRCLES (quick MCQ + tangent-secant) =====
  {
    id: "2026-CIRC-MCQ-06",
    topicKey: "Circles",
    subtopic: "Angle subtended by diameter",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The angle subtended by a diameter at any point on the circle is:",
    options: ["30°", "45°", "60°", "90°"],
    answer: "90°",
    explanation:
      "Angle in a semicircle is a right angle.",
    policyTag: "Thales theorem",
  },
  {
    id: "2026-CIRC-SA-07",
    topicKey: "Circles",
    subtopic: "Tangent-secant theorem",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From a point P outside a circle, PT is tangent and PAB is a secant cutting the circle at A and B. Prove that PT² = PA·PB.",
    answer:
      "Power of a point: PT²=PA×PB.",
    explanation:
      "Equal angles subtend equal arcs; similar triangles yield the relation.",
    policyTag: "Power of a point",
  },

  // ===== AREAS RELATED TO CIRCLES (extra) =====
  {
    id: "2026-ARC-AR-02",
    topicKey: "Areas Related to Circles",
    subtopic: "Sector/segment logic",
    kind: "Assertion-Reasoning",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): The area of a sector is proportional to its central angle. Reason (R): A full circle corresponds to 360° and area πr².",
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Direct proportionality from (θ/360)πr².",
    policyTag: "Sector formula reasoning",
  },

  // ===== SURFACE AREAS & VOLUMES (case study) =====
  {
    id: "2026-SAV-CASE-05",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Frustum/real-life",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A bucket is in the shape of a frustum of a cone with top radius 14 cm, bottom radius 7 cm, and height 20 cm. (i) Find its curved surface area. (ii) If filled with water, find the volume of water it can hold. (Use π=22/7.)",
    answer:
      "(i) l=√(h²+(R−r)²)=√(400+49)=√449. CSA=π(R+r)l. (ii) Volume=(1/3)πh(R²+Rr+r²). Substitute values to compute.",
    explanation:
      "Use frustum formulae for CSA and volume with given R,r,h.",
    policyTag: "Frustum board-pattern",
  },

  // ===== STATISTICS (grouped median/mode) =====
  {
    id: "2026-STAT-SA-05",
    topicKey: "Statistics",
    subtopic: "Median of grouped data",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the median of the following grouped data using the median formula: Classes: 0–10,10–20,20–30,30–40,40–50 with frequencies 5, 7, 12, 9, 7.",
    answer:
      "Compute cumulative frequencies, locate median class (N/2), then use median formula: L + [(N/2 − cf)/f]×h.",
    explanation:
      "Standard median-of-grouped-data procedure.",
    policyTag: "Grouped median",
  },
  {
    id: "2026-STAT-SA-06",
    topicKey: "Statistics",
    subtopic: "Mode (grouped)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "For grouped data with modal class frequency f₁ = 18, preceding f₀ = 12, succeeding f₂ = 10, class width h = 5 and lower boundary L = 20, find the mode.",
    answer:
      "Mode = L + [(f₁−f₀)/(2f₁−f₀−f₂)]×h = 20 + [(6)/(36−22)]×5 = 20 + (6/14)×5 ≈ 22.14.",
    explanation:
      "Apply the grouped mode formula with given frequencies.",
    policyTag: "Grouped mode",
  },

  // ===== PROBABILITY (finishing touches) =====
  {
    id: "2026-PROB-SA-07",
    topicKey: "Probability",
    subtopic: "Cards/dice blend",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A card is drawn from a deck and a fair die is rolled. Find the probability that the card is a heart and the die shows an odd number.",
    answer:
      "P(heart)=13/52=1/4; P(odd on die)=3/6=1/2; Independent ⇒ total = 1/4×1/2=1/8.",
    explanation:
      "Independent events product rule.",
    policyTag: "Compound independent events",
  },
  {
    id: "2026-PROB-MCQ-08",
    topicKey: "Probability",
    subtopic: "Mutually exclusive vs independent",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "If P(A)=0.5, P(B)=0.3 and A,B are mutually exclusive, then P(A∪B) is:",
    options: ["0.2", "0.5", "0.3", "0.8"],
    answer: "0.8",
    explanation:
      "Mutually exclusive ⇒ P(A∪B)=P(A)+P(B)=0.8.",
    policyTag: "Basic properties",
  },
];
// --- Helper exports for lookup & type-safety -----------------------------

// All valid IDs from the predictedQuestions bank
export const predictedQuestions: PredictedQuestion[] = [
  ...predictedQuestionsBase,
  ...predictedQuestionsAdditions,
];

export type PredictedQuestionId = (typeof predictedQuestions)[number]["id"];

// Fast lookup by id: predictedQuestionsById["2026-TRIG-SA-01"] → full question object
export const predictedQuestionsById: Record<PredictedQuestionId, PredictedQuestion> =
  predictedQuestions.reduce((acc, q) => {
    acc[q.id as PredictedQuestionId] = q;
    return acc;
  }, {} as Record<PredictedQuestionId, PredictedQuestion>);

