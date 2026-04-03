// src/data/predictedQuestions.ts

import type { Class10TopicKey } from "./class10MathTopicTrends";

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
const predictedQuestionsAdditions: PredictedQuestion[] = [
  // ===== Pair of Linear Equations (must‑crack) =====
  {
    id: "2026-PLE-MCQ-07",
    topicKey: "Pair of Linear Equations",
    subtopic: "Graphical Solutions/Nature",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Analysing",
    questionText:
      "For the system of equations 4x − 5y = 1 and 8x − 10y = 3, choose the correct statement about its solution set:",
    options: [
      "Exactly one solution",
      "Infinitely many solutions",
      "No solution",
      "It depends on values of x and y",
    ],
    answer: "No solution",
    explanation:
      "Doubling the first equation gives 8x − 10y = 2, which conflicts with 8x − 10y = 3. The lines are parallel and never meet.",
  },
  {
    id: "2026-PLE-MCQ-08",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "Solve the system x + y = 5 and 2x + 3y = 12. What is the value of x?",
    options: ["1", "2", "3", "4"],
    answer: "3",
    explanation:
      "From x + y = 5 we get y = 5 − x. Substitute into 2x + 3(5 − x) = 12 and solve for x = 3.",
  },
  {
    id: "2026-PLE-SA-09",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A taxi service charges ₹10 per kilometre for the first 5 km and ₹8 per kilometre thereafter. A passenger pays ₹90 for a ride of 10 km. Form a pair of linear equations to find the kilometres charged at each rate and solve them.",
    answer: "5 km at ₹10 per km and 5 km at ₹8 per km.",
    explanation:
      "Let x and y be the kilometres charged at ₹10 and ₹8 respectively. Then x + y = 10 (total distance) and 10x + 8y = 90 (total fare). Solving gives x = 5 and y = 5.",
    solutionSteps: [
      "Let x km be charged at ₹10 and y km at ₹8.",
      "Form equations: x + y = 10 and 10x + 8y = 90.",
      "Subtract 8 times the first equation from the second: 2x = 10 ⇒ x = 5.",
      "Hence y = 5 from x + y = 10.",
    ],
    strategyHint:
      "Translate the charges into equations and use elimination to solve.",
  },
  {
    id: "2026-PLE-SA-10",
    topicKey: "Pair of Linear Equations",
    subtopic: "Algebraic Solution Methods",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Solve the following pair of equations using substitution: 3x + 2y = 12 and 2x + y = 7.",
    answer: "x = 2, y = 3.",
    explanation:
      "From 2x + y = 7 we get y = 7 − 2x. Substitute into 3x + 2y = 12 to obtain 3x + 2(7 − 2x) = 12 ⇒ 3x + 14 − 4x = 12 ⇒ −x = −2 ⇒ x = 2 and y = 3.",
    solutionSteps: [
      "Make y the subject: y = 7 − 2x.",
      "Substitute into 3x + 2y = 12.",
      "Simplify and solve for x.",
      "Back‑substitute to find y.",
    ],
  },
  {
    id: "2026-PLE-AR-11",
    topicKey: "Pair of Linear Equations",
    subtopic: "Graphical Solutions/Nature",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The pair of equations 3x − 2y + 4 = 0 and 9x − 6y + 12 = 0 has infinitely many solutions.\nReason (R): For two linear equations a₁x + b₁y + c₁ = 0 and a₂x + b₂y + c₂ = 0, the condition for infinitely many solutions is \\((\\frac{a₁}{a₂} = \\frac{b₁}{b₂} = \\frac{c₁}{c₂})\\).",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The second equation is a multiple of the first, so both represent the same line, giving infinitely many solutions. The stated condition correctly identifies coincident lines.",
  },
  {
    id: "2026-PLE-CASE-12",
    topicKey: "Pair of Linear Equations",
    subtopic: "Word & Application Problems",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two inlet pipes A and B can fill a water tank in different times, and there is a leak at the bottom. Pipe A alone can fill the tank in 10 hours. When both pipes A and B are opened together, they fill the tank in 6 hours. However, because of a leak, the tank actually takes 8 hours to fill when both pipes are open.\n(a) Write two linear equations in x and y if x hours is the time taken by pipe B alone to fill the tank and y hours is the time taken by the leak alone to empty it.\n(b) Solve the equations to find x and y.",
    answer:
      "Pipe B alone can fill the tank in 15 hours and the leak alone would empty it in 24 hours.",
    explanation:
      "Let the filling rates be 1/10, 1/x and the leak emptying rate be 1/y per hour. Without the leak: 1/10 + 1/x = 1/6. With the leak: 1/10 + 1/x − 1/y = 1/8. Solving gives 1/x = 1/15 and 1/y = 1/24.",
    solutionSteps: [
      "Assign rates: pipe A = 1/10, pipe B = 1/x, leak = 1/y.",
      "Without leak: 1/10 + 1/x = 1/6.",
      "With leak: 1/10 + 1/x − 1/y = 1/8.",
      "Subtract the first equation from the second to eliminate 1/x and solve for 1/y.",
      "Back‑substitute to find 1/x.",
    ],
    strategyHint: "Convert times to rates and form equations for the combined rates.",
  },

  // ===== Quadratic Equations (must‑crack) =====
  {
    id: "2026-QE-MCQ-07",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the quadratic equation 2x² − 3x + 5 = 0, what is the nature of its roots?",
    options: [
      "Real and distinct",
      "Real and equal",
      "No real roots",
      "Imaginary and equal",
    ],
    answer: "No real roots",
    explanation:
      "Discriminant D = (−3)² − 4·2·5 = 9 − 40 = −31 < 0; therefore the roots are not real.",
  },
  {
    id: "2026-QE-MCQ-08",
    topicKey: "Quadratic Equations",
    subtopic: "Coefficient–root Relations",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the equation x² − 7x + 10 = 0, what is the product of its roots?",
    options: ["7", "10", "−10", "−7"],
    answer: "10",
    explanation:
      "For ax² + bx + c = 0, product of roots = c/a. Here c = 10 and a = 1, so the product is 10.",
  },
  {
    id: "2026-QE-SA-09",
    topicKey: "Quadratic Equations",
    subtopic: "Algebraic Solution",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Solve the quadratic equation 3t² − 2t − 1 = 0 using the quadratic formula.",
    answer: "t = 1 or t = −1/3.",
    explanation:
      "Identify a = 3, b = −2, c = −1. Discriminant D = b² − 4ac = 16. Using t = [−b ± √D]/(2a) gives t = [2 ± 4]/6 ⇒ t = 1 or −1/3.",
    solutionSteps: [
      "Compute D = (−2)² − 4·3·(−1) = 16.",
      "Apply t = [−(−2) ± √16]/(2·3) = [2 ± 4]/6.",
      "Simplify to get t = 1 or t = −1/3.",
    ],
    strategyHint:
      "Apply the quadratic formula when factorisation is not obvious.",
  },
  {
    id: "2026-QE-SA-10",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A farmer wishes to fence a rectangular field such that its length is 20 m more than its breadth. If the area of the field is 300 m², form a quadratic equation in the breadth and find the dimensions of the field.",
    answer: "Breadth = 10 m and length = 30 m.",
    explanation:
      "Let breadth = x m, then length = x + 20. Area = x(x + 20) = 300 ⇒ x² + 20x − 300 = 0. Solving gives x = 10 (positive root), hence length = 30 m.",
    solutionSteps: [
      "Let breadth be x and length be x + 20.",
      "Write x(x + 20) = 300 to model the area.",
      "Rearrange to x² + 20x − 300 = 0.",
      "Solve to obtain x = 10 (positive value) and length = x + 20 = 30.",
    ],
    strategyHint:
      "Translate the statement into algebra and solve the resulting quadratic.",
  },
  {
    id: "2026-QE-AR-11",
    topicKey: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): The quadratic equation x² + 4x + 5 = 0 has no real roots.\nReason (R): A quadratic equation ax² + bx + c = 0 has real roots only when the discriminant b² − 4ac is non‑negative.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "For x² + 4x + 5, D = 16 − 20 = −4 < 0, so there are no real roots. The discriminant test exactly determines whether roots are real.",
  },
  {
    id: "2026-QE-CASE-12",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A rectangular garden measures 40 m by 30 m. A path of uniform width runs around the inside of the garden. The area of the path is 476 m². Let x metres be the width of the path.\n(a) Write a quadratic equation in x that models the situation.\n(b) Solve the equation to find the width of the path (give your answer correct to two decimal places).",
    answer:
      "The quadratic equation is 4x² − 140x + 476 = 0 and the path is approximately 3.81 m wide.",
    explanation:
      "Area of garden = 40 × 30 = 1200 m²; area of inner rectangle = (40 − 2x)(30 − 2x). Difference = 476 ⇒ 1200 − (40 − 2x)(30 − 2x) = 476. Simplifying yields 4x² − 140x + 476 = 0. Solving gives x ≈ 3.81 m.",
    solutionSteps: [
      "Let inner dimensions be (40 − 2x) and (30 − 2x).",
      "Set 40×30 − (40 − 2x)(30 − 2x) = 476.",
      "Expand and rearrange to 4x² − 140x + 476 = 0.",
      "Use the quadratic formula: x = [140 ± √(140² − 4·4·476)]/(8).",
      "Choose the positive root and round to two decimal places (≈ 3.81 m).",
    ],
    strategyHint:
      "Express areas in terms of x and apply the quadratic formula.",
  },

  // ===== Triangles (must‑crack) =====
  {
    id: "2026-TRI-MCQ-05",
    topicKey: "Triangles",
    subtopic: "Similarity Criteria",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If ΔABC ∼ ΔDEF with \\(\\\\frac{AB}{DE} = \\\\frac{AC}{DF})\\, which of the following is true?",
    options: ["∠A = ∠D", "∠A = ∠E", "∠A = ∠F", "No relation"],
    answer: "∠A = ∠D",
    explanation:
      "The pairs AB:DE and AC:DF correspond, so vertex A matches with D. Therefore ∠A = ∠D.",
  },
  {
    id: "2026-TRI-SA-07",
    topicKey: "Triangles",
    subtopic: "BPT (Basic Proportionality Theorem)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In ΔABC, DE ∥ BC intersects AB at D and AC at E. If AD = 3 cm, DB = 2 cm and AC = 10 cm, find the length of AE.",
    answer: "AE = 6 cm.",
    explanation:
      "By BPT, AD/DB = AE/EC. Let AE = x. Then EC = 10 − x. So 3/2 = x/(10 − x) ⇒ 30 − 3x = 2x ⇒ x = 6 cm.",
    solutionSteps: [
      "Let AE = x ⇒ EC = 10 − x.",
      "Apply BPT: 3/2 = x/(10 − x).",
      "Cross‑multiply and solve for x.",
    ],
    strategyHint: "Relate the segments using the Basic Proportionality Theorem.",
  },
  {
    id: "2026-TRI-AR-09",
    topicKey: "Triangles",
    subtopic: "Similarity Criteria",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): If two sides of one triangle are proportional to two sides of another triangle and the included angles are equal, the triangles are similar.\nReason (R): By the SAS similarity criterion, two triangles are similar when the ratio of two pairs of corresponding sides is equal and the included angles are equal.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The statement describes exactly the SAS criterion: two sides in proportion and the included angle equal implies similarity.",
  },
  // ===== Trigonometry (must‑crack) =====
  {
    id: "2026-TRIG-MCQ-09",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Evaluate sin 30° × cos 60° + tan 45°.",
    options: ["1/2", "1", "5/4", "3/4"],
    answer: "5/4",
    explanation:
      "sin 30° = 1/2 and cos 60° = 1/2, so their product is 1/4. tan 45° = 1; thus 1/4 + 1 = 5/4.",
  },
  {
    id: "2026-TRIG-MCQ-10",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If tan θ = 3/4 for an acute angle θ, then sec θ equals:",
    options: ["5/4", "4/3", "5/3", "3/5"],
    answer: "5/4",
    explanation:
      "sec² θ = 1 + tan² θ = 1 + 9/16 = 25/16 ⇒ sec θ = 5/4.",
  },
  {
    id: "2026-TRIG-SA-11",
    topicKey: "Trigonometry",
    subtopic: "Trig Identities/Proofs",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Prove that \\(\\\\frac{1 - \\\\cos θ}{1 + \\\\cos θ} = \\\\tan^2\\\\frac{θ}{2}\\).",
    answer:
      "Using 1 − cos θ = 2 sin²(θ/2) and 1 + cos θ = 2 cos²(θ/2), the given expression simplifies to tan²(θ/2).",
    explanation:
      "Express the numerator and denominator using the half‑angle identities. Cancelling factors gives tan²(θ/2).",
    solutionSteps: [
      "Recall: 1 − cos θ = 2 sin²(θ/2) and 1 + cos θ = 2 cos²(θ/2).",
      "Substitute into the fraction.",
      "Simplify to obtain tan²(θ/2).",
    ],
    strategyHint:
      "Use half‑angle identities for 1 ± cos θ.",
  },
  {
    id: "2026-TRIG-SA-12",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From the top of a 15 m high tower, the angle of depression of a car on the road is 30°. Find the distance of the car from the foot of the tower. (Take \\(\\\\sqrt{3} = 1.732\\).",
    answer: "Approximately 25.98 m.",
    explanation:
      "Let the horizontal distance be d. tan 30° = 15/d ⇒ 1/√3 = 15/d ⇒ d = 15√3 ≈ 25.98 m.",
    solutionSteps: [
      "Draw a right triangle with height 15 m and base d.",
      "Use tan 30° = 1/√3 = 15/d.",
      "Solve for d = 15√3.",
      "Substitute √3 = 1.732 to find d ≈ 25.98 m.",
    ],
    strategyHint:
      "Relate the angle of depression to the angle of elevation and apply the tangent ratio.",
  },
  {
    id: "2026-TRIG-AR-13",
    topicKey: "Trigonometry",
    subtopic: "Trig Ratios/Values",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): sin(90° − θ) = cos θ for all θ.\nReason (R): In a right triangle, exchanging the roles of the adjacent and opposite sides for complementary angles gives the cofunction identity.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "The cofunction identity follows from considering complementary angles in a right triangle. The reason clearly explains the assertion.",
  },
  {
    id: "2026-TRIG-CASE-14",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A vertical pole 12 m high casts a shadow 4√3 m long on level ground. At the same time, a nearby tower casts a shadow 12√3 m long.\n(a) Find the angle of elevation of the Sun.\n(b) Calculate the height of the tower. (Take \\(\\\\sqrt{3} = 1.732\\).",
    answer:
      "Angle of elevation of the Sun = 60°; height of the tower = 36 m.",
    explanation:
      "For the pole: tan θ = 12/(4√3) = √3 ⇒ θ = 60°. For the tower with shadow 12√3 m, tan 60° = √3 = height/(12√3) ⇒ height = 12√3 × √3 = 36 m.",
    solutionSteps: [
      "Compute tan θ = 12/(4√3) = √3 and deduce θ = 60°.",
      "Let the tower height be h. Write tan 60° = √3 = h/(12√3).",
      "Solve: h = 12√3 × √3 = 36 m.",
    ],
    strategyHint:
      "Use the same angle of elevation for both objects since observations are simultaneous.",
  },

  // ===== Statistics (must‑crack) =====
  {
    id: "2026-STAT-MCQ-07",
    topicKey: "Statistics",
    subtopic: "Mode of Grouped Data",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Given a frequency distribution with class intervals 0–10 (5), 10–20 (10) and 20–30 (15), the modal class is:",
    options: ["0–10", "10–20", "20–30", "Cannot be determined"],
    answer: "20–30",
    explanation:
      "The modal class has the greatest frequency. Here 20–30 has the highest frequency (15).",
  },
  {
    id: "2026-STAT-MCQ-08",
    topicKey: "Statistics",
    subtopic: "Median of Grouped Data",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For the same distribution (0–10: 5, 10–20: 10, 20–30: 15), the median class is:",
    options: ["0–10", "10–20", "20–30", "Cannot be determined"],
    answer: "10–20",
    explanation:
      "Total frequency is 30. The median (15th observation) lies in the class whose cumulative frequency reaches at least 15: the class 10–20.",
  },
  {
    id: "2026-STAT-SA-09",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Calculate the mean of the following data: values 2, 4, 6 and 8 have frequencies 3, 5, 4 and 2 respectively.",
    answer: "Mean ≈ 4.71.",
    explanation:
      "Σf = 14 and Σf x = 2·3 + 4·5 + 6·4 + 8·2 = 66. Mean = 66/14 ≈ 4.71.",
    solutionSteps: [
      "Total frequency = 3 + 5 + 4 + 2 = 14.",
      "Sum of products = 6 + 20 + 24 + 16 = 66.",
      "Mean = 66 ÷ 14 ≈ 4.71.",
    ],
    strategyHint:
      "Use the direct formula \\(\\\\bar{x} = \\\\frac{\\\\Sigma f_i x_i}{\\\\Sigma f_i}\\).",
  },
  {
    id: "2026-STAT-SA-10",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Use the step deviation method to compute the mean of the following grouped data:\nClass: 0–10, 10–20, 20–30, 30–40\nFrequency: 4, 6, 10, 8.",
    answer: "Mean ≈ 22.86.",
    explanation:
      "Midpoints: 5, 15, 25, 35; assumed mean A = 25; class width h = 10. d_i = (m_i − 25)/10: −2, −1, 0, 1. Σfd = −6 and Σf = 28. Mean = 25 + (−6/28) × 10 ≈ 22.86.",
    solutionSteps: [
      "List midpoints and choose A = 25, h = 10.",
      "Compute deviations and multiply by frequencies.",
      "Find Σfd = −6 and Σf = 28.",
      "Substitute into \\(\\\\bar{x} = A + \\\\frac{\\\\Sigma fd}{\\\\Sigma f} × h\\).",
    ],
    strategyHint:
      "Choose a convenient assumed mean to simplify calculations.",
  },
  {
    id: "2026-STAT-AR-11",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): In any dataset, the mode is the value with the highest frequency.\nReason (R): For a grouped frequency distribution, the class interval with the greatest frequency is called the modal class.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "Mode represents the most frequent observation. In grouped data, the class with highest frequency is termed the modal class.",
  },
  {
    id: "2026-STAT-CASE-12",
    topicKey: "Statistics",
    subtopic: "Mean (Step Deviation)",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A company records the daily wages of its 20 workers as follows:\nClass (₹): 100–120, 120–140, 140–160, 160–180, 180–200\nFrequency: 2, 5, 8, 3, 2\n(a) Identify the modal class.\n(b) Estimate the mean daily wage using the step‑deviation method.\n(c) Comment on the wage distribution.",
    answer:
      "(a) The modal class is 140–160. (b) Mean ≈ ₹148. (c) Wages cluster around the middle class; most workers earn between ₹140 and ₹160, indicating moderate dispersion.",
    explanation:
      "The highest frequency is 8 in the 140–160 class. Taking A = 150 and h = 20 yields Σfd = −2 and Σf = 20, so mean = 150 + (−2/20) × 20 = 148. The distribution peaks in the middle class.",
    solutionSteps: [
      "Midpoints: 110, 130, 150, 170, 190; assumed mean A = 150; h = 20.",
      "Calculate d_i and Σfd = −2; Σf = 20.",
      "Mean = 150 + (−2/20) × 20 = 148.",
      "Identify modal class as the one with highest frequency (140–160).",
      "Discuss that most frequencies lie near the middle class.",
    ],
    strategyHint:
      "Apply step‑deviation and interpret both mean and modal class.",
  },

  // ===== Probability (must‑crack) =====
  {
    id: "2026-PROB-MCQ-09",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "A fair coin is tossed once. What is the probability of getting a tail?",
    options: ["0", "1/2", "1", "2"],
    answer: "1/2",
    explanation:
      "There are two equally likely outcomes (H or T). Only one is a tail, so probability = 1/2.",
  },
  {
    id: "2026-PROB-MCQ-10",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "A fair die is rolled once. What is the probability of getting a prime number?",
    options: ["1/3", "1/2", "2/3", "1/6"],
    answer: "1/2",
    explanation:
      "Prime outcomes on a die are 2, 3 and 5. There are 3 favourable outcomes out of 6, so the probability is 3/6 = 1/2.",
  },
  {
    id: "2026-PROB-SA-11",
    topicKey: "Probability",
    subtopic: "Single Event Probability",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A bag contains 3 red balls, 5 white balls and 7 blue balls. A ball is drawn at random. Find the probability that it is (i) white, (ii) not red.",
    answer: "(i) 1/3, (ii) 4/5.",
    explanation:
      "Total balls = 15. (i) White balls = 5 ⇒ probability = 5/15 = 1/3. (ii) Not red = 5 + 7 = 12 ⇒ probability = 12/15 = 4/5.",
    solutionSteps: [
      "Compute total balls = 3 + 5 + 7 = 15.",
      "For (i), favourable outcomes = 5 ⇒ probability = 5/15.",
      "For (ii), favourable outcomes = 12 ⇒ probability = 12/15.",
    ],
    strategyHint:
      "Count favourable outcomes and divide by total outcomes.",
  },
  {
    id: "2026-PROB-SA-12",
    topicKey: "Probability",
    subtopic: "Combined/Word Problem Probability",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Two coins are tossed simultaneously. Find the probability of getting (i) exactly one head, (ii) at most one head, and (iii) at least one head.",
    answer: "(i) 1/2, (ii) 3/4, (iii) 3/4.",
    explanation:
      "Sample space = {HH, HT, TH, TT}. Exactly one head in HT or TH: probability = 2/4. At most one head includes HT, TH, TT: probability = 3/4. At least one head includes HH, HT, TH: probability = 3/4.",
    solutionSteps: [
      "List all possible outcomes.",
      "Count favourable outcomes for each event.",
      "Divide by total outcomes (4).",
    ],
    strategyHint:
      "Enumerate outcomes for two coin tosses and classify them by number of heads.",
  },
  {
    id: "2026-PROB-AR-13",
    topicKey: "Probability",
    subtopic: "Probability Axioms",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): The probability of an event always lies between 0 and 1.\nReason (R): The number of favourable outcomes for an event cannot exceed the total number of equally likely outcomes.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "An event's probability is a ratio of non-negative counts to total outcomes and therefore cannot exceed 1. The reason explains why the ratio is bounded.",
  },
  {
    id: "2026-PROB-CASE-14",
    topicKey: "Probability",
    subtopic: "Combined/Word Problem Probability",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A box contains 6 green pens, 4 blue pens and 5 black pens. Two pens are drawn at random one after the other without replacement. Find the probability that:\n(a) both pens are green,\n(b) one pen is green and the other is blue,\n(c) none of the pens is black.",
    answer: "(a) 1/7, (b) 8/35, (c) 3/7.",
    explanation:
      "Total pens = 15. (a) P(GG) = (6/15) x (5/14) = 1/7. (b) P(GB or BG) = (6/15)(4/14) + (4/15)(6/14) = 8/35. (c) Non-black pens = 10 => P(both non-black) = (10/15) x (9/14) = 3/7.",
    solutionSteps: [
      "Count total pens and identify favourable outcomes for each event.",
      "Calculate probabilities sequentially without replacement.",
      "Sum probabilities for (b) where order matters.",
    ],
    strategyHint:
      "Adjust the denominator after the first draw and consider both orders for mixed draws.",
  },

  // ===== Real Numbers (high-roi) =====
  {
    id: "2026-RN-MCQ-03",
    topicKey: "Real Numbers",
    subtopic: "Euclid's Division Algorithm",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText: "The HCF of 42 and 56 is:",
    options: ["7", "8", "14", "6"],
    answer: "14",
    explanation:
      "Applying Euclid's algorithm: 56 = 42 x 1 + 14 and 42 = 14 x 3 + 0, giving HCF = 14.",
  },
  {
    id: "2026-RN-MCQ-04",
    topicKey: "Real Numbers",
    subtopic: "Decimal Expansions",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Which of the following rational numbers has a terminating decimal expansion?",
    options: ["2/15", "3/7", "14/125", "1/11"],
    answer: "14/125",
    explanation:
      "A fraction has a terminating decimal expansion when its denominator (in lowest terms) has only the prime factors 2 or 5. 125 = 5^3, so 14/125 qualifies.",
  },
  {
    id: "2026-RN-SA-05",
    topicKey: "Real Numbers",
    subtopic: "Euclid's Division Algorithm",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Use Euclid's division lemma to find the HCF of 135 and 225 and express it as a linear combination of 135 and 225.",
    answer: "HCF = 45 and 45 = 2 x 135 - 225.",
    explanation:
      "Applying Euclid's algorithm: 225 = 135 x 1 + 90; 135 = 90 x 1 + 45; 90 = 45 x 2 + 0, so HCF = 45. Back-substituting gives 45 = 135 - (225 - 135) = 2 x 135 - 225.",
    solutionSteps: [
      "Perform Euclid's algorithm to find the HCF.",
      "Express the remainder relation: 45 = 135 - 90 and 90 = 225 - 135.",
      "Substitute to get 45 = 2 x 135 - 225.",
    ],
    strategyHint:
      "After finding the HCF, work backwards to express it as a linear combination.",
  },
  {
    id: "2026-RN-AR-06",
    topicKey: "Real Numbers",
    subtopic: "Irrational Numbers & Proofs",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): \\(\\\\sqrt{5}\\) is an irrational number.\nReason (R): The square root of any prime number is irrational.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "Prime factors of 5 cannot be paired to form a rational square. The Fundamental Theorem of Arithmetic shows that √p is irrational for any prime p.",
  },

  // ===== Polynomials (high‑roi) =====
  {
    id: "2026-POLY-MCQ-05",
    topicKey: "Polynomials",
    subtopic: "Coefficient–root Relations",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "If one zero of the cubic polynomial f(x) = x³ − 4x² + 3x is 0, what is the sum of the other two zeroes?",
    options: ["1", "3", "4", "5"],
    answer: "4",
    explanation:
      "Sum of all zeroes = coefficient of x² with sign changed = 4. One zero is 0, so the sum of the remaining two zeroes is 4.",
  },
  {
    id: "2026-POLY-MCQ-06",
    topicKey: "Polynomials",
    subtopic: "Factor Theorem",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Which of the following is a factor of the polynomial x³ + x² − 4x − 4?",
    options: ["x − 1", "x + 1", "x − 2", "x + 2"],
    answer: "x + 1",
    explanation:
      "Substitute x = −1: (−1)³ + (−1)² − 4(−1) − 4 = −1 + 1 + 4 − 4 = 0, so x + 1 is a factor by the Factor Theorem.",
  },
  {
    id: "2026-POLY-SA-07",
    topicKey: "Polynomials",
    subtopic: "Zeros & Factorisation",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Divide the polynomial p(x) = x⁴ − 5x³ + 7x − 3 by x² − 2 and find the quotient and remainder.",
    answer: "Quotient = x² − 5x + 2; Remainder = 1 − 3x.",
    explanation:
      "Perform polynomial long division. After dividing term by term, the quotient is x² − 5x + 2 and the remainder is 1 − 3x.",
    solutionSteps: [
      "Arrange p(x) and the divisor in descending powers.",
      "Divide the highest degree term and subtract repeatedly.",
      "Stop when the degree of the remainder is less than that of the divisor.",
    ],
    strategyHint:
      "Align like terms carefully during polynomial division.",
  },
  {
    id: "2026-POLY-CASE-08",
    topicKey: "Polynomials",
    subtopic: "Zeros & Factorisation",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "The polynomial f(x) = x³ − 6x² + 11x − 6 models the number of organisms in a culture dish (in millions) after x hours.\n(a) Factorise f(x) completely.\n(b) Find the times at which the population becomes zero.\n(c) Discuss which of these times are meaningful.",
    answer:
      "(a) f(x) = (x − 1)(x − 2)(x − 3). (b) The roots are x = 1, 2 and 3 hours. (c) All three roots are positive and correspond to possible times when the population could become zero.",
    explanation:
      "By testing small integers, f(1) = f(2) = f(3) = 0. Factorising gives (x − 1)(x − 2)(x − 3). The positive roots represent times at which the population would be zero; negative times are not meaningful.",
    solutionSteps: [
      "Evaluate f(1), f(2) and f(3) to find zeros.",
      "Use synthetic division or repeated factorisation to obtain f(x) = (x − 1)(x − 2)(x − 3).",
      "Interpret the positive roots in the context of time.",
    ],
    strategyHint:
      "Test small integer values to identify factors and relate roots to real‑world contexts.",
  },

  // ===== Arithmetic Progression (high‑roi) =====
  {
    id: "2026-AP-MCQ-05",
    topicKey: "Arithmetic Progression",
    subtopic: "nth Term",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "What is the 10th term of the arithmetic progression 3, 8, 13, …?",
    options: ["48", "45", "50", "53"],
    answer: "48",
    explanation:
      "First term a = 3 and common difference d = 5. 10th term = a + 9d = 3 + 45 = 48.",
  },
  {
    id: "2026-AP-MCQ-06",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "Find the sum of the first 20 terms of the arithmetic progression 2, 5, 8, …. (Assume n ≥ 1).",
    options: ["400", "610", "620", "590"],
    answer: "610",
    explanation:
      "a = 2, d = 3. Sₙ = n/2[2a + (n − 1)d] ⇒ S₂₀ = 10[4 + 57] = 610.",
  },
  {
    id: "2026-AP-SA-07",
    topicKey: "Arithmetic Progression",
    subtopic: "nth Term",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In an arithmetic progression, the 5th term is 22 and the 13th term is 46. Find the first term and the common difference.",
    answer: "First term = 10, common difference = 3.",
    explanation:
      "Let a be the first term and d be the common difference. Then a + 4d = 22 and a + 12d = 46. Subtracting gives 8d = 24 ⇒ d = 3; substituting back gives a = 10.",
    solutionSteps: [
      "Write equations: a + 4d = 22 and a + 12d = 46.",
      "Subtract to eliminate a and solve for d.",
      "Substitute d into one equation to find a.",
    ],
    strategyHint:
      "Use the nth‑term formula and solve the resulting system.",
  },
  {
    id: "2026-AP-AR-08",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Assertion (A): In any arithmetic progression, the sum of terms equidistant from the beginning and the end is the same.\nReason (R): For an arithmetic progression, each pair of equidistant terms adds up to the sum of the first and last terms.",
    answer:
      "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    explanation:
      "In an AP, the k‑th term from the beginning and the k‑th term from the end are a + (k − 1)d and l − (k − 1)d. Their sum is a + l, independent of k.",
  },

  // ===== Coordinate Geometry (high‑roi) =====
  {
    id: "2026-CG-MCQ-08",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "The distance between the points (2, −3) and (−4, 5) is:",
    options: ["2√13", "10", "√52", "8"],
    answer: "10",
    explanation:
      "Distance = √[(2 + 4)² + (−3 − 5)²] = √[6² + (−8)²] = √100 = 10.",
  },
  {
    id: "2026-CG-MCQ-09",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "If a point (x, 4) is equidistant from (2, −1) and (−2, 3), then x equals:",
    options: ["1", "2", "3", "4"],
    answer: "3",
    explanation:
      "Equate squares of distances: (x − 2)² + 25 = (x + 2)² + 1 ⇒ −4x + 29 = 4x + 5 ⇒ x = 3.",
  },
  {
    id: "2026-CG-SA-10",
    topicKey: "Coordinate Geometry",
    subtopic: "Section Formula",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the coordinates of the point that divides the line segment joining A(2, 3) and B(8, 5) internally in the ratio 3 : 2.",
    answer: "The point is (28/5, 21/5) or (5.6, 4.2).",
    explanation:
      "Using the section formula: x = (3×8 + 2×2)/5 = 28/5, y = (3×5 + 2×3)/5 = 21/5.",
    solutionSteps: [
      "Label A(x₁, y₁) = (2,3) and B(x₂, y₂) = (8,5); m:n = 3:2.",
      "Apply section formula: x = (m x₂ + n x₁)/(m + n), y = (m y₂ + n y₁)/(m + n).",
      "Compute x and y to get (28/5, 21/5).",
    ],
    strategyHint:
      "Multiply the coordinates by the opposite segment lengths and divide by the total parts.",
  },
  {
    id: "2026-CG-CASE-11",
    topicKey: "Coordinate Geometry",
    subtopic: "Distance Formula",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Given triangle P(1, 1), Q(4, 5) and R(7, 1):\n(a) Show that PQ = QR.\n(b) Find the area of ΔPQR using the coordinate method.\n(c) State the type of triangle PQR is.",
    answer:
      "(a) PQ = QR = 5 units. (b) Area of ΔPQR = 12 square units. (c) ΔPQR is an isosceles triangle.",
    explanation:
      "Compute PQ = √[(4 − 1)² + (5 − 1)²] = 5 and QR = √[(7 − 4)² + (1 − 5)²] = 5. Using the determinant formula, area = ½|1(5 − 1) + 4(1 − 1) + 7(1 − 5)| = 12. Two equal sides imply an isosceles triangle.",
    solutionSteps: [
      "Use the distance formula to show PQ and QR both equal 5.",
      "Use the coordinate area formula to compute area.",
      "Conclude that the triangle is isosceles.",
    ],
    strategyHint:
      "Compute side lengths and use the determinant method for area.",
  },

  // ===== Circles (high‑roi) =====
  {
    id: "2026-CIRC-MCQ-08",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "From a point A, a tangent AT is drawn to a circle with centre O and radius r. If OA = 13 cm and AT = 12 cm, the radius r is:",
    options: ["5 cm", "12 cm", "13 cm", "25 cm"],
    answer: "5 cm",
    explanation:
      "Right triangle OAT gives OA² = OT² + AT² ⇒ 13² = r² + 12² ⇒ r² = 25 ⇒ r = 5 cm.",
  },
  {
    id: "2026-CIRC-MCQ-09",
    topicKey: "Circles",
    subtopic: "Tangent Theorems & Proofs",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two tangents PA and PB are drawn to a circle from an external point P. If chord AB subtends an angle of 60° at the centre, then ∠APB equals:",
    options: ["30°", "60°", "90°", "120°"],
    answer: "120°",
    explanation:
      "The angle between tangents is supplementary to the central angle subtended by the chord: ∠APB = 180° − 60° = 120°.",
  },
  {
    id: "2026-CIRC-SA-10",
    topicKey: "Circles",
    subtopic: "Tangent Properties",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "From an external point P, tangents PT and PS are drawn to a circle with centre O. If OP = 25 cm and PT = 24 cm, find the radius of the circle.",
    answer: "7 cm.",
    explanation:
      "OT ⟂ PT. In ΔOPT: OP² = PT² + OT² ⇒ 25² = 24² + r² ⇒ r = 7 cm.",
    solutionSteps: [
      "Recognise that OT is perpendicular to PT at T.",
      "Apply the Pythagoras theorem in ΔOPT.",
      "Substitute OP = 25 and PT = 24 to find r.",
    ],
    strategyHint:
      "Use the property that tangents from an external point are equal and perpendicular to the radius.",
  },
  {
    id: "2026-CIRC-CASE-11",
    topicKey: "Circles",
    subtopic: "Number/Type of Tangents",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A circle has radius 5 cm. Two chords are drawn at distances of 4 cm and 3 cm from the centre.\n(a) Find the length of each chord.\n(b) Which chord is longer and why?",
    answer:
      "(a) The chord at 4 cm from the centre is 6 cm; the chord at 3 cm is 8 cm. (b) The chord closer to the centre (3 cm away) is longer.",
    explanation:
      "Chord length = 2√(r² − d²). For d = 4: 2√(25 − 16) = 6 cm. For d = 3: 2√(25 − 9) = 8 cm. The closer chord subtends a larger arc and is longer.",
    solutionSteps: [
      "Use chord length formula L = 2√(r² − d²).",
      "Compute lengths for d = 4 and d = 3.",
      "Compare and explain why the chord nearer the centre is longer.",
    ],
    strategyHint:
      "Remember the relationship between distance from the centre and chord length.",
  },

  // ===== Surface Areas and Volumes (high‑roi) =====
  {
    id: "2026-SAV-MCQ-06",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "What is the volume of a sphere of radius 3 cm? (Take π = 22/7)",
    options: [
      "36π cm³",
      "72π cm³",
      "113 1/7 cm³",
      "452/7 cm³",
    ],
    answer: "113 1/7 cm³",
    explanation:
      "Volume = \\((4/3)πr³ = (4/3) × (22/7) × 27 = 792/7 ≈ 113\\\\frac{1}{7}\\\\).",
  },
  {
    id: "2026-SAV-MCQ-07",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "If the ratio of the surface areas of two spheres is 16 : 25, the ratio of their volumes is:",
    options: ["4 : 5", "8 : 15", "64 : 125", "16 : 25"],
    answer: "64 : 125",
    explanation:
      "Surface area ratio = (r₁/r₂)² = 16/25 ⇒ r₁/r₂ = 4/5. Volume ratio = (r₁/r₂)³ = (4/5)³ = 64/125.",
  },
  {
    id: "2026-SAV-SA-08",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Combination/Transformation",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A metal sphere of radius 10 cm is melted and recast into small cones, each of radius 2.5 cm and height 8 cm. How many such cones can be formed? (Use π in your answer.)",
    answer: "80 cones.",
    explanation:
      "Volume of sphere = \\((4/3)π(10)³ = 4000/3 π\\\\). Volume of one cone = \\((1/3)π(2.5)² × 8 = 50/3 π\\\\). Number of cones = (4000/3)/(50/3) = 80.",
    solutionSteps: [
      "Compute sphere volume: \\((4/3)π(10)³\\\\).",
      "Compute cone volume: \\((1/3)π(2.5)² × 8\\\\).",
      "Divide V_s by V_c.",
    ],
    strategyHint:
      "Conservation of volume applies when recasting shapes.",
  },
  {
    id: "2026-SAV-CASE-09",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A cylindrical water tank of radius 1.5 m and height 5 m has to be painted both inside and outside, leaving the top open. The cost of painting is ₹120 per square metre. Calculate the total cost.",
    answer: "Approximately ₹13,020.",
    explanation:
      "Outer curved surface area + base = 2πrh + πr² = 17.25π m². Inner curved surface area + base = 17.25π m². Total area = 34.5π m² ≈ 108.5 m² (taking π ≈ 3.14). Cost ≈ 108.5 × 120 ≈ ₹13,020.",
    solutionSteps: [
      "Calculate outer curved surface: 2πrh = 2π×1.5×5 = 15π.",
      "Calculate area of base: πr² = 2.25π.",
      "Total outer + inner surface (excluding top) = 2 × (15π + 2.25π) = 34.5π.",
      "Convert to decimal using π ≈ 3.14 and multiply by ₹120.",
    ],
    strategyHint:
      "Paint both inner and outer surfaces except the open top.",
  },

  // ===== Constructions (good‑to‑do) =====
  {
    id: "2026-CONST-MCQ-04",
    topicKey: "Constructions",
    subtopic: "Divide Segment",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "To divide a given line segment AB into 4 equal parts using ruler and compass, how many equal divisions should be marked on an auxiliary ray?",
    options: ["2", "3", "4", "5"],
    answer: "4",
    explanation:
      "To divide a segment into n equal parts, mark n equal arcs on the auxiliary ray. Therefore 4 equal marks are required.",
  },
  {
    id: "2026-CONST-SA-05",
    topicKey: "Constructions",
    subtopic: "Divide Segment",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Construct a line segment PQ of length 8 cm and divide it internally in the ratio 3 : 2 using only a straightedge and compass. Describe the steps and justify your construction.",
    answer:
      "Draw PQ = 8 cm. Draw an acute ray PR. Mark five equal segments on PR. Join the fifth mark to Q. Through the third mark draw a line parallel to this, meeting PQ at S. Then PS:PQ = 3:5 and SQ:PQ = 2:5, so S divides PQ in the ratio 3:2.",
    explanation:
      "Using equal divisions and drawing a parallel line ensures that corresponding segments are proportional (Basic Proportionality Theorem). Hence PS:SQ = 3:2.",
    solutionSteps: [
      "Draw PQ = 8 cm and an acute ray PR.",
      "On PR, mark five equal divisions (since 3 + 2 = 5 parts).",
      "Join the fifth division point to Q.",
      "Through the third division point, draw a line parallel to this connecting line to meet PQ at S.",
      "PS:PQ = 3:5 ⇒ PS = 4.8 cm and SQ = 3.2 cm.",
    ],
    strategyHint:
      "Divide the auxiliary ray into total parts equal to the sum of the ratio terms.",
  },

  // ===== Areas Related to Circles (good‑to‑do) =====
  {
    id: "2026-ARC-MCQ-03",
    topicKey: "Areas Related to Circles",
    subtopic: "Sectors and Segments",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "Find the area of a sector of a circle with radius 7 cm and angle 60°. (Take π = 22/7.)",
    options: ["77 cm²", "154/3 cm²", "77/3 cm²", "154 cm²"],
    answer: "77/3 cm²",
    explanation:
      "Area = (60/360) × πr² = (1/6) × 22/7 × 49 = 154/6 = 77/3 cm².",
  },
  {
    id: "2026-ARC-SA-04",
    topicKey: "Areas Related to Circles",
    subtopic: "Composite Figures",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A running track consists of two straight sections each of length 50 m joined by two semicircles of radius 20 m. Find the total length of the track and the area enclosed by it. (Take π = 3.14.)",
    answer:
      "Length ≈ 225.6 m; Area ≈ 3,256 m².",
    explanation:
      "Length: two semicircles make a full circle of circumference 2πr = 40π m; adding straight sections gives 40π + 100 ≈ 125.6 + 100 = 225.6 m. Area: rectangle 50 × 40 = 2,000 m² plus circle area πr² = 3.14 × 400 = 1,256 m²; total ≈ 3,256 m².",
    solutionSteps: [
      "Compute the circular part: circumference = 2π×20 = 40π m.",
      "Add the two straight segments (100 m).",
      "For area, combine the area of the rectangle (50 × 40) and the area of the full circle (π×20²).",
      "Use π = 3.14 for numerical results.",
    ],
    strategyHint:
      "Break the track into simple geometric shapes: a rectangle and a circle.",
  },
  {
    id: "2026-TRIG-LA-13",
    topicKey: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "From the top of a tower, the angle of depression of two objects on the same straight line with the foot of the tower are 45° and 30°. If the two objects are 40 m apart, find the height of the tower and the distance of the nearer object from the foot of the tower.",
    answer:
      "Let nearer distance = x m, farther distance = x + 40 m. tan45° = h/x gives h = x. tan30° = h/(x+40) gives h = (x+40)/√3. Equating: x = (x+40)/√3 ⇒ x(√3−1)=40 ⇒ x = 20(√3+1). Height h = 20(√3+1) m.",
    finalAnswer:
      "Height of tower = 20(√3+1) m and distance of nearer object from foot = 20(√3+1) m.",
    explanation:
      "Board-style 5-mark application that combines two depression angles with a shared-height setup.",
    solutionSteps: [
      "Draw a labelled diagram with tower AB and points C (nearer) and D (farther) on horizontal line through B.",
      "Use angle of depression = angle of elevation to write ∠ACB = 45° and ∠ADB = 30°.",
      "Assume BC = x, so BD = x + 40 and AB = h.",
      "From triangle ABC: tan45° = h/x ⇒ h = x.",
      "From triangle ABD: tan30° = h/(x+40) ⇒ h = (x+40)/√3.",
      "Equate both values of h and solve for x.",
      "State h and BC clearly with units.",
    ],
    strategyHint:
      "For two observations on one line, create two tan equations using the same height variable.",
    policyTag: "Trigonometry 5-mark competency application",
    pastBoardYear: "2024",
  },

  {
    id: "2026-CG-LA-05",
    topicKey: "Coordinate Geometry",
    subtopic: "Area of Triangle & Collinearity",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the area of the triangle formed by the points A(2, −1), B(3, 4) and C(−2, 3). Also determine whether the points P(1, 1), Q(3, 5) and R(−1, −3) are collinear.",
    answer:
      "Area = ½|2(4−3) + 3(3−(−1)) + (−2)((−1)−4)| = ½|2+12+10| = 12 sq units. For P,Q,R: ½|1(5−(−3))+3((−3)−1)+(−1)(1−5)| = ½|8−12+4| = 0, so collinear.",
    finalAnswer: "Area of triangle ABC = 12 sq units; P, Q, R are collinear.",
    explanation:
      "Use the coordinate geometry formula for area of a triangle using vertices. If the area is zero, the points are collinear.",
    solutionSteps: [
      "Apply area formula: ½|x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|.",
      "Substitute A(2,−1), B(3,4), C(−2,3).",
      "Compute and simplify to get area.",
      "Repeat for P(1,1), Q(3,5), R(−1,−3).",
      "If area = 0, state that the points are collinear.",
    ],
    strategyHint: "For collinearity, show that the area of the triangle formed by the three points is zero.",
    pastBoardYear: "2023",
    policyTag: "Coordinate Geometry 5-mark area & collinearity",
  },

  {
    id: "2026-AP-LA-03",
    topicKey: "Arithmetic Progression",
    subtopic: "Sum of n Terms & Applications",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The sum of first n terms of an AP is given by Sₙ = 3n² + 5n. Determine the AP and find its 20th term. Also find the sum of its first 15 terms.",
    answer:
      "aₙ = Sₙ − Sₙ₋₁ = 3n²+5n − 3(n−1)²−5(n−1) = 6n+2. So a₁ = 8, d = 6. The 20th term = 8+19×6 = 122. S₁₅ = 3(225)+5(15) = 675+75 = 750.",
    finalAnswer: "AP: 8, 14, 20, ...; a₂₀ = 122; S₁₅ = 750.",
    explanation:
      "Find the nth term by computing Sₙ − Sₙ₋₁, then identify a and d. Use these to find specific terms and sums.",
    solutionSteps: [
      "Find a₁ = S₁ = 3+5 = 8.",
      "Find a₂ = S₂ − S₁ = (12+10) − 8 = 14.",
      "Common difference d = a₂ − a₁ = 6.",
      "General term aₙ = 8 + (n−1)×6 = 6n + 2.",
      "Compute a₂₀ = 6(20)+2 = 122.",
      "Compute S₁₅ using the given formula.",
    ],
    strategyHint: "When sum is given as a formula, use aₙ = Sₙ − Sₙ₋₁ to extract the AP.",
    pastBoardYear: "2022",
    policyTag: "AP 5-mark sum formula application",
  },

  {
    id: "2026-RN-LA-03",
    topicKey: "Real Numbers",
    subtopic: "HCF & LCM Applications",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Three alarm clocks ring at intervals of 4, 7 and 14 minutes respectively. If they ring together at 6:00 AM, when will they next ring together? Also prove that √5 is irrational.",
    answer:
      "LCM(4,7,14) = 28 minutes. They ring together next at 6:28 AM. For √5: assume √5 = p/q, then 5q² = p², so 5|p, let p = 5k, then q² = 5k², so 5|q. This contradicts p/q being in lowest terms.",
    finalAnswer: "Next ring together at 6:28 AM; √5 is irrational (proved by contradiction).",
    explanation:
      "LCM gives the interval at which all three clocks synchronise. Irrationality of √5 follows the standard proof by contradiction.",
    solutionSteps: [
      "Find prime factorisations: 4=2², 7=7, 14=2×7.",
      "LCM = 2²×7 = 28 minutes.",
      "Add 28 minutes to 6:00 AM.",
      "For irrationality: assume √5 = p/q in lowest terms.",
      "Square both sides and derive contradiction.",
      "Conclude √5 is irrational.",
    ],
    strategyHint: "Combine an LCM word problem with a standard irrationality proof for 5 marks.",
    pastBoardYear: "2024",
    policyTag: "Real Numbers 5-mark combined LCM + irrationality",
  },

  {
    id: "2026-CIRCLE-LA-02",
    topicKey: "Circles",
    subtopic: "Tangent Proofs & Properties",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Prove that the tangent at any point of a circle is perpendicular to the radius through the point of contact. Using this result, find the length of the tangent drawn from an external point 13 cm away from the centre of a circle of radius 5 cm.",
    answer:
      "Proof: If tangent is not perpendicular, then the foot of the perpendicular from the centre would be shorter than the radius, contradicting that the point lies on the circle. Length = √(13²−5²) = √(169−25) = √144 = 12 cm.",
    finalAnswer: "Tangent ⊥ radius (proved); tangent length = 12 cm.",
    explanation:
      "Standard theorem proof followed by a numerical application using Pythagoras' theorem in the right triangle formed by centre, external point, and point of tangency.",
    solutionSteps: [
      "State the theorem and draw a labelled diagram.",
      "Assume tangent is not perpendicular and derive contradiction.",
      "Hence tangent is perpendicular to radius.",
      "For numerical: OA = 13 cm (distance), OB = 5 cm (radius).",
      "In right triangle OBA: AB² = OA² − OB².",
      "AB = √(169−25) = 12 cm.",
    ],
    strategyHint: "Always prove the theorem first, then apply Pythagoras for the numerical part.",
    pastBoardYear: "2023",
    policyTag: "Circles 5-mark theorem + numerical",
  },

  {
    id: "2026-STAT-LA-02",
    topicKey: "Statistics",
    subtopic: "Mean, Median, Mode of Grouped Data",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The following data gives the distribution of total monthly household expenditure (in ₹) of 200 families:\n0–1000: 24, 1000–2000: 40, 2000–3000: 33, 3000–4000: 28, 4000–5000: 30, 5000–6000: 22, 6000–7000: 16, 7000–8000: 7.\nFind the median expenditure and the modal class.",
    answer:
      "N/2 = 100. Cumulative frequencies: 24, 64, 97, 125, ... Median class is 3000–4000. Median = 3000 + ((100−97)/28)×1000 = 3000 + 107.14 ≈ ₹3107.14. Modal class: 1000–2000 (highest frequency 40).",
    finalAnswer: "Median ≈ ₹3107.14; Modal class = 1000–2000.",
    explanation:
      "Use the median formula for grouped data and identify the modal class as the class with highest frequency.",
    solutionSteps: [
      "Write cumulative frequencies.",
      "Find N/2 = 100 and identify median class.",
      "Apply median formula: l + ((N/2 − cf)/f) × h.",
      "Substitute values and compute.",
      "Identify modal class as the class with maximum frequency.",
    ],
    strategyHint: "Build the CF column carefully; the median class is the first class whose CF ≥ N/2.",
    pastBoardYear: "2024",
    policyTag: "Statistics 5-mark median + mode grouped data",
  },

  {
    id: "2026-PROB-LA-02",
    topicKey: "Probability",
    subtopic: "Classical Probability Applications",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A bag contains 5 red, 4 white and 3 black balls. A ball is drawn at random. Find the probability that the ball drawn is: (i) red (ii) not black (iii) either red or white. If two more red balls are added to the bag, find the new probability of drawing a red ball.",
    answer:
      "Total = 12. (i) P(red) = 5/12, (ii) P(not black) = 9/12 = 3/4, (iii) P(red or white) = 9/12 = 3/4. With 2 more red: total = 14, red = 7, P(red) = 7/14 = 1/2.",
    finalAnswer: "P(red)=5/12, P(not black)=3/4, P(red or white)=3/4, new P(red)=1/2.",
    explanation:
      "Apply classical probability formula P(E) = favourable outcomes / total outcomes for each part.",
    solutionSteps: [
      "Count total balls: 5+4+3 = 12.",
      "P(red) = 5/12.",
      "P(not black) = (5+4)/12 = 9/12 = 3/4.",
      "P(red or white) = 9/12 = 3/4.",
      "After adding 2 red: total = 14, red = 7.",
      "New P(red) = 7/14 = 1/2.",
    ],
    strategyHint: "Count favourable and total outcomes carefully for each sub-part.",
    pastBoardYear: "2023",
    policyTag: "Probability 5-mark multi-part",
  },

  {
    id: "2026-POLY-LA-03",
    topicKey: "Polynomials",
    subtopic: "Zeroes & Coefficients",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "If α and β are zeroes of the quadratic polynomial f(x) = x² − x − 2, find a polynomial whose zeroes are 2α + 1 and 2β + 1. Also verify the relationship between zeroes and coefficients of the new polynomial.",
    answer:
      "f(x) = x²−x−2 ⇒ α+β = 1, αβ = −2. New zeroes: 2α+1 and 2β+1. Sum = 2(α+β)+2 = 4. Product = (2α+1)(2β+1) = 4αβ+2(α+β)+1 = −8+2+1 = −5. Polynomial: x²−4x−5. Verify: sum = 4/1 = 4 ✓, product = −5/1 = −5 ✓.",
    finalAnswer: "Required polynomial: x² − 4x − 5.",
    explanation:
      "Use sum and product of zeroes of the original polynomial to compute sum and product of new zeroes, then form the new polynomial.",
    solutionSteps: [
      "Find α+β and αβ from original polynomial.",
      "Compute sum of new zeroes: 2(α+β)+2.",
      "Compute product of new zeroes: 4αβ+2(α+β)+1.",
      "Form polynomial: x² − (sum)x + (product).",
      "Verify using relationship between zeroes and coefficients.",
    ],
    strategyHint: "Express new zeroes in terms of old ones and use Vieta's formulas.",
    pastBoardYear: "2022",
    policyTag: "Polynomials 5-mark zeroes transformation",
  },

  {
    id: "2026-TRIANGLE-LA-03",
    topicKey: "Triangles",
    subtopic: "BPT & Similar Triangles",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "State and prove the Basic Proportionality Theorem (Thales' Theorem). Using this theorem, in △ABC, if DE ∥ BC, AD = 4 cm, DB = 5 cm and AE = 8 cm, find EC.",
    answer:
      "BPT: If a line is drawn parallel to one side of a triangle, it divides the other two sides proportionally. Proof uses equal area triangles. AD/DB = AE/EC ⇒ 4/5 = 8/EC ⇒ EC = 10 cm.",
    finalAnswer: "EC = 10 cm (with BPT proof).",
    explanation:
      "Standard CBSE theorem proof followed by direct application of the proportionality result.",
    solutionSteps: [
      "State BPT clearly.",
      "Draw triangle with DE ∥ BC.",
      "Prove using area ratios of triangles with same base and between parallels.",
      "Apply result: AD/DB = AE/EC.",
      "Substitute values and solve for EC.",
    ],
    strategyHint: "BPT proof always uses equal-base-equal-height area argument.",
    pastBoardYear: "2024",
    policyTag: "Triangles 5-mark theorem + application",
  },

  {
    id: "2026-SA-LA-03",
    topicKey: "Surface Areas and Volumes",
    subtopic: "Combination of Solids",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A solid is in the shape of a cone surmounted on a hemisphere. The radius of each is 3.5 cm and the total height of the solid is 9.5 cm. Find the total surface area of the solid. (Take π = 22/7)",
    answer:
      "Height of cone = 9.5 − 3.5 = 6 cm. Slant height l = √(6²+3.5²) = √(36+12.25) = √48.25 ≈ 6.95 cm. CSA of cone = πrl = 22/7 × 3.5 × 6.95 ≈ 76.45 cm². CSA of hemisphere = 2πr² = 2×22/7×3.5² = 77 cm². Total = 76.45+77 = 153.45 cm².",
    finalAnswer: "Total surface area ≈ 153.45 cm².",
    explanation:
      "For combined solids, add CSA of cone (no base) and CSA of hemisphere (no flat face) since they share the circular face.",
    solutionSteps: [
      "Find height of cone = total height − radius of hemisphere.",
      "Calculate slant height of cone using Pythagoras.",
      "Find CSA of cone = πrl.",
      "Find CSA of hemisphere = 2πr².",
      "Total surface area = CSA of cone + CSA of hemisphere.",
    ],
    strategyHint: "In combined solids, exclude the common circular face from the total.",
    pastBoardYear: "2023",
    policyTag: "Surface Areas 5-mark combined solid",
  },

  {
    id: "2026-QE-LA-05",
    topicKey: "Quadratic Equations",
    subtopic: "Word/Application Problems",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train.",
    answer:
      "Let speed = x km/h. Time = 360/x. New time = 360/(x+5). 360/x − 360/(x+5) = 1. Solving: 360×5 = x(x+5) ⇒ x²+5x−1800=0 ⇒ (x+45)(x−40)=0. x = 40 km/h.",
    finalAnswer: "Speed of the train = 40 km/h.",
    explanation:
      "Classic board-style speed-distance-time word problem that reduces to a quadratic equation.",
    solutionSteps: [
      "Let speed be x km/h, time = 360/x hours.",
      "With increased speed: time = 360/(x+5) hours.",
      "Set up equation: 360/x − 360/(x+5) = 1.",
      "Cross-multiply and simplify to get quadratic.",
      "Solve and reject negative root.",
      "State speed with units.",
    ],
    strategyHint: "Speed-distance-time problems always give a quadratic; set up time difference equation.",
    pastBoardYear: "2022",
    policyTag: "QE 5-mark speed-distance application",
  },
];

// --- Helper exports for lookup & type-safety -----------------------------

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

