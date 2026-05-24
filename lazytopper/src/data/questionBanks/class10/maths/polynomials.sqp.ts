import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Polynomials — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "polynomials"
 * Section distribution: A=1, C=1
 */
export const POLYNOMIALS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-POLY-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Zeroes of a Linear Polynomial",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The given linear polynomial y = f(x) has",
    "options": [
      "(A) 2 zeros",
      "(B) 1 zero and the zero is '3'",
      "(C) 1 zero and the zero is '4'",
      "(D) No zero"
    ],
    "answer": "(B) 1 zero and the zero is '3'",
    "solutionSteps": [
      "A linear polynomial y = f(x) is a straight line and has exactly one zero — the x-intercept. From the given graph, the line crosses the x-axis at x = 3, so the zero is 3. Answer: (B)."
    ],
    "finalAnswer": "(B) 1 zero and the zero is '3'",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-POLY-002",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If α, β are zeroes of quadratic polynomial 5x² + 5x + 1, find the value of:\n(i) α² + β²\n(ii) α⁻¹ + β⁻¹",
    "options": [],
    "answer": "(i) α² + β² = 3/5; (ii) α⁻¹ + β⁻¹ = −5",
    "solutionSteps": [
      "For P(x) = 5x² + 5x + 1, sum of zeroes α + β = −b/a = −5/5 = −1; product αβ = c/a = 1/5.",
      "(i) α² + β² = (α + β)² − 2αβ = (−1)² − 2(1/5) = 1 − 2/5 = 3/5.",
      "(ii) α⁻¹ + β⁻¹ = 1/α + 1/β = (α + β)/(αβ) = (−1)/(1/5) = −5."
    ],
    "finalAnswer": "(i) 3/5; (ii) −5",
    "isCompetencyBased": true
  }
];
