import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "polynomials"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const POLYNOMIALS_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-POLY-001", subject: "Maths", topicKey: "polynomials", subtopic: "Quadratic Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The graph of a quadratic polynomial f(x) passes through (5,0), (0, –1) and (–2, 0). The two factors of the polynomial are",
    options: ["(x + 2), (x – 5)", "(x + 5), (x – 2)", "(x + 1), (x – 5)", "(x – 1), (x + 2)"],
    answer: "(x + 2), (x – 5)",
    solutionSteps: ["Correct option: (a) (x + 2), (x – 5)."],
    finalAnswer: "(a) (x + 2), (x – 5)",
    ncertRef: "PYQ 30(B) Q2", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-POLY-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the zeroes of a polynomial p(x) are –3 and 8, then p(x) equals",
    options: ["x² + 5x − 4", "(x + 3)(−x + 8)", "a(x² + 5x − 24)", "x² − 24"],
    answer: "(x + 3)(−x + 8)",
    solutionSteps: ["(x + 3)(−x + 8) = 0 gives x = −3 or x = 8, the required zeroes; the other options do not have zeroes −3 and 8 (option (c) has zeroes 3 and −8). Correct option: (b)."],
    finalAnswer: "(b) (x + 3)(−x + 8)",
    ncertRef: "PYQ 30/5/1 Q3", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-POLY-003", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the quadratic polynomial the sum of whose zeroes is 1 and their product is −12. Hence find the zeroes of the polynomial.",
    answer: "x² − x − 12; zeroes 4 and −3",
    solutionSteps: ["Required polynomial = x² − (sum)x + product = x² − x − 12.", "x² − x − 12 = (x − 4)(x + 3), so the zeroes are 4 and −3."],
    finalAnswer: "Polynomial x² − x − 12; zeroes are 4 and −3.",
    ncertRef: "PYQ 30(B) Q22", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-POLY-004", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "While playing badminton, Ravi sees a barrier chain hung between two posts at the edge of the walkway of a street. It hangs in the shape of a parabola. Based on the above information, answer the following questions:\n(a) Which type of polynomial (linear, quadratic, cubic etc.) is graphically represented by a parabola?\n(b) If the polynomial represented by the parabola intersects the x-axis at –2 and 3 and the y-axis at –3, write the zeroes of the polynomial.\n(c) Find the expression for the above polynomial.\nOR\n(c) If the zeroes of a quadratic polynomial are –5 and 3, find its expression.",
    answer: "(a) Quadratic (b) −2 and 3 (c) p(x) = k(x + 2)(x − 3) = k(x² − x − 6); y-intercept −3 ⇒ −6k = −3 ⇒ k = 1/2, so p(x) = (1/2)(x² − x − 6) OR (c) g(x) = (x + 5)(x − 3) = x² + 2x − 15",
    solutionSteps: ["[1 mark] (a) A parabola graphically represents a quadratic polynomial.", "[1 mark] (b) The zeroes are the x-coordinates of the points where the parabola meets the x-axis, i.e. –2 and 3.", "[1 mark] (c) With zeroes –2 and 3: p(x) = k(x + 2)(x – 3) = k(x² – x – 6), k ≠ 0.", "[1 mark] It meets the y-axis at –3: p(0) = –6k = –3 ⇒ k = 1/2, so p(x) = (1/2)(x² – x – 6). [OR (c) With zeroes –5 and 3: g(x) = (x + 5)(x – 3) = x² + 2x – 15.]"],
    finalAnswer: "(a) Quadratic; (b) zeroes are –2 and 3; (c) p(x) = (1/2)(x² – x – 6) [OR g(x) = x² + 2x – 15].",
    ncertRef: "PYQ 30(B) Q36", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-POLY-005", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "An arch of a railway bridge, built on Chenab riverbed, is shown in the above diagram. It is a parabolic arch connecting two hills at P and Q. If the parabolic curve is represented by the polynomial p(x) = –0.0025x2 – 0.025x + 136. Observe the diagram and based on above information, answer the following questions : (i) Write the coordinates of point A. 1 (ii) Find the span of the arch. 1 (iii) (a) Write the zeroes of the polynomial using diagram and verify the relationship between sum of zeroes and polynomials. 2 OR (iii) (b) Find the values of p(x) at x = 100 and x = –100. Are they same ?",
    answer: "(i) At x = 0, p(x) = 136 ∴Coordinates of point A = (0,136) (ii) Span of the arch = 238.5 + 228.5 = 467 units (iii) (a) Zeroes of the polynomial are 228.5 and −238.5 Sum of zeroes = −10 = −−0.025 −0.0025 = −coefficient of x coefficient of x OR (iii) (b) p(100) = 108.5 p(−100) = 113.5 ∴p(100) ≠p(−100)",
    solutionSteps: ["[1 mark] (i) Point A lies on the y-axis, so x = 0: p(0) = 136. Coordinates of A = (0, 136).", "[1 mark] (ii) Span of the arch = distance between the two x-intercepts = 238.5 + 228.5 = 467 units.", "[1 mark] (iii)(a) From the diagram, the zeroes of p(x) are 228.5 and −238.5; sum of zeroes = 228.5 + (−238.5) = −10.", "[1 mark] Verification: −(coefficient of x)/(coefficient of x²) = −(−0.025)/(−0.0025) = −10 = sum of zeroes — relationship verified. [OR (iii)(b) p(100) = −0.0025(100)² − 0.025(100) + 136 = −25 − 2.5 + 136 = 108.5; p(−100) = −25 + 2.5 + 136 = 113.5. Since 108.5 ≠ 113.5, p(100) ≠ p(−100) — they are not the same.]"],
    finalAnswer: "(i) At x = 0, p(x) = 136 ∴Coordinates of point A = (0,136) (ii) Span of the arch = 238.5 + 228.5 = 467 units (iii) (a) Zeroes of the polynomial are 228.5 and −238.5 Sum of zeroes = −10 = −−0.025 −0.0025 = −coefficient of x coefficient of x OR (iii) (b) p(100) = 108.5 p(−100) = 113.5 ∴p(100) ≠p(−100)",
    ncertRef: "PYQ 30/5/1 Q36", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
