import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "polynomials"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const POLYNOMIALS_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-POLY-001", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the zeroes of the polynomial p(x) = x² + (4/3)x − 4/3.",
    answer: "p(x) = (1/3)(3x² + 4x − 4) = (1/3)(3x² + 6x − 2x − 4) = (1/3)(3x − 2)(x + 2). Zeroes are 2/3 and −2.",
    solutionSteps: ["[1.5 marks] p(x) = (1/3)(3x² + 4x − 4) = (1/3)(3x² + 6x − 2x − 4) = (1/3)[3x(x + 2) − 2(x + 2)] = (1/3)(3x − 2)(x + 2).", "[0.5 marks] p(x) = 0 ⇒ 3x − 2 = 0 or x + 2 = 0 ⇒ zeroes are 2/3 and −2."],
    finalAnswer: "Zeroes are 2/3 and −2.",
    ncertRef: "PYQ 30/1/1 Q22", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1",
    },
  { id: "PYQ-M-2025-POLY-002", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the zeroes of the polynomial x² + ax + b are in the ratio 3 : 4, then prove that 12a² = 49b.",
    answer: "Let the zeroes be 3α and 4α. Then 3α + 4α = 7α = −a and 3α × 4α = 12α² = b. So 12a² = 12(−7α)² = 49 × 12α² = 49b.",
    solutionSteps: ["[1 mark] Let the zeroes be 3α and 4α. Sum of zeroes: 3α + 4α = 7α = −a. Product of zeroes: 3α × 4α = 12α² = b.","[1 mark] LHS = 12a² = 12(−7α)² = 49 × 12α² = 49b = RHS. Hence 12a² = 49b."],
    finalAnswer: "With zeroes 3α, 4α: 7α = −a and 12α² = b, so 12a² = 49 × 12α² = 49b.",
    ncertRef: "PYQ 30/1/2 Q21", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "2" },
  { id: "PYQ-M-2025-POLY-003", subject: "Maths", topicKey: "polynomials", subtopic: "Zeroes of Polynomial", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If p and q are zeroes of the polynomial p(y) = 21y² − y − 2, then find the value of (1 − p) . (1 − q).",
    answer: "18/21 or 6/7",
    solutionSteps: [
      "[0.5 marks] p + q = 1/21.",
      "[0.5 marks] p . q = −2/21.",
      "[0.5 marks] (1 − p)(1 − q) = 1 − (p + q) + pq = 1 − 1/21 − 2/21.",
      "[0.5 marks] = 18/21 or 6/7.",
    ],
    finalAnswer: "(1 − p)(1 − q) = 6/7",
    ncertRef: "PYQ 30/2/1 Q21", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
];
