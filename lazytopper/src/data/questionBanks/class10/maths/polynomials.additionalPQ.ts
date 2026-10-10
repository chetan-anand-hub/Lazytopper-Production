import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "polynomials"
// Extraction date: 2026-05-24
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed)

export const POLYNOMIALS_APQ: CanonicalQuestion[] = [
  // PQ1 Q1 (Section A, MCQ, 1 mark) — REQUIRES-FIGURE
  { id: "APQ-M-POLY-001", subject: "Maths", topicKey: "polynomials", subtopic: "Graph of Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Which of the following could be the graph of the polynomial (x − 1)^2(x + 2)?",
    options: ["Graph (a)", "Graph (b)", "Graph (c)", "Graph (d)"],
    answer: "Graph (c)",
    solutionSteps: ["[1 mark] Zeroes of (x − 1)²(x + 2) are x = 1 (repeated, so the graph touches the x-axis there without crossing) and x = −2 (crosses the x-axis); p(0) = (1)(2) = 2. Graph (a) crosses at both −2 and 1, graphs (b) and (d) touch the x-axis at a negative x and do not pass through (0, 2). Graph (c) crosses at −2, touches at 1 and passes through (0, 2), so it is the graph of the polynomial."],
    finalAnswer: "(c)",
    ncertRef: "APQ PQ1 Q1", isCompetencyBased: true,
 },

  // PQ2 Q1 (Section A, MCQ, 1 mark)
  { id: "APQ-M-POLY-002", subject: "Maths", topicKey: "polynomials", subtopic: "Quadratic from Zeroes", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A quadratic polynomial, the sum of whose zeroes is 0 and one zero is 4, is",
    options: ["x^2 − 16", "x^2 + 16", "x^2 + 4", "x^2 − 4"],
    answer: "x^2 − 16",
    solutionSteps: ["Sum of zeroes = 0 ⟹ other zero = −4. Product = 4 × (−4) = −16.", "Polynomial: x^2 − (sum)x + (product) = x^2 − 0·x − 16 = x^2 − 16."],
    finalAnswer: "(a) x^2 − 16",
    ncertRef: "APQ PQ2 Q1", isCompetencyBased: false },

  // PQ2 Q22 (Section B, Short, 2 marks)
  { id: "APQ-M-POLY-003", subject: "Maths", topicKey: "polynomials", subtopic: "Quadratic from Transformed Zeroes", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If α and β are the zeroes of x^2 − x − 2, form a quadratic polynomial whose zeroes are 2α + 1 and 2β + 1. OR If α and β are the zeroes of f(x) = 2x^2 + 5x + k such that α^2 + β^2 + αβ = 21/4, find the value of k.",
    answer: "Required polynomial: k(x^2 − 4x − 5). Alternative: k = 2.",
    solutionSteps: ["For x^2 − x − 2: α + β = 1, αβ = −2.", "Sum of new zeroes: (2α+1) + (2β+1) = 2(α+β) + 2 = 2(1) + 2 = 4. Product: (2α+1)(2β+1) = 4αβ + 2(α+β) + 1 = 4(−2) + 2(1) + 1 = −5.", "Required polynomial = k(x^2 − 4x − 5).", "[OR] For 2x^2+5x+k: α+β = −5/2, αβ = k/2. α^2+β^2+αβ = (α+β)^2 − αβ = 25/4 − k/2 = 21/4 ⟹ k/2 = 1 ⟹ k = 2."],
    finalAnswer: "k(x^2 − 4x − 5) [or] k = 2.",
    ncertRef: "APQ PQ2 Q22", isCompetencyBased: true },

  // PQ1 Q27 (Section C, Short, 3 marks)
  { id: "APQ-M-POLY-004", subject: "Maths", topicKey: "polynomials", subtopic: "Real-world Quadratic — Parabolic Path", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Riddhi throws a stone in the air such that it follows a parabolic path before it lands at P on the ground as depicted by the graph below. (i) The above graph is represented by a polynomial where the sum of its zeroes is 1 and the sum of the squares of its zeroes is 25. Find the coordinates of P and Q. (ii) If one unit on the graph represents 25 metres, how far from Riddhi does the stone land?",
    answer: "(i) P = (4, 0), Q = (−3, 0). (ii) 150 metres.",
    solutionSteps: ["Let polynomial be ax^2 + bx + c with zeroes α, β. Given α + β = 1, α^2 + β^2 = 25. Use (α+β)^2 = α^2 + β^2 + 2αβ ⟹ 1 = 25 + 2αβ ⟹ αβ = −12.", "By relations: b/a = −(α+β) = −1, c/a = αβ = −12. Take a = 1: polynomial = x^2 − x − 12 = (x − 4)(x + 3). Zeroes: x = 4 and x = −3.", "So P = (4, 0) and Q = (−3, 0). From the graph, Riddhi stands at x = −2, and the stone lands at P, x = 4. Horizontal distance = 4 − (−2) = 6 units = 6 × 25 m = 150 m."],
    finalAnswer: "P = (4, 0), Q = (−3, 0); distance = 150 m.",
    ncertRef: "APQ PQ1 Q27", isCompetencyBased: true,
    sourceOverride: "others", },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q1 (Section A, MCQ, 1 mark)
  { id: "APQ-M-POLY-005", subject: "Maths", topicKey: "polynomials", subtopic: "Factor from Polynomial Graph", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The graph of a polynomial p(x) passes through the points (-5, 0), (0, -40), (8, 0) and (5, -30). Which among the following is a factor of p(x)?",
    options: ["(x - 5)", "(x - 8)", "(x + 30)", "(x + 40)"],
    answer: "(x - 8)",
    solutionSteps: ["Zeros of p(x) are x-coordinates where graph crosses x-axis (y = 0). Points (−5, 0) and (8, 0) are on the x-axis ⟹ x = −5 and x = 8 are zeros.", "Factors corresponding to zeros: (x + 5) and (x − 8). From options, (x − 8) is a factor."],
    finalAnswer: "(b) (x - 8)",
    ncertRef: "APQ PQ_2022 Q1", isCompetencyBased: true },

  // PQ_2022 Q27 (Section C, Short, 3 marks)
  { id: "APQ-M-POLY-006", subject: "Maths", topicKey: "polynomials", subtopic: "Sum/Product of Zeroes Identities", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If m and n are zeroes of the polynomial (3x^2 - x - 2), find the values of the following without factorising the polynomial. (i) 1/m + 1/n (ii) m^2 + n^2",
    answer: "(i) −1/2. (ii) 13/9.",
    solutionSteps: ["From 3x^2 − x − 2: m + n = −(−1)/3 = 1/3; mn = −2/3.", "(i) 1/m + 1/n = (m + n)/mn = (1/3) / (−2/3) = −1/2.", "(ii) m^2 + n^2 = (m + n)^2 − 2mn = (1/3)^2 − 2(−2/3) = 1/9 + 4/3 = 1/9 + 12/9 = 13/9."],
    finalAnswer: "(i) −1/2; (ii) 13/9.",
    ncertRef: "APQ PQ_2022 Q27", isCompetencyBased: true },
];
