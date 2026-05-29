import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * polynomials — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "polynomials". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const POLY_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-POLY-A-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If α and β are roots of polynomial 2x² − 5x + 2, then αβ is",
    "options": [
      "(a) 0",
      "(b) 4",
      "(c) 1",
      "(d) 2"
    ],
    "answer": "(c) 1",
    "solutionSteps": [
      "[1 mark] Product of zeroes αβ = c/a = 2/2 = 1. Answer: (c)."
    ],
    "finalAnswer": "(c) 1",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-POLY-C-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Forming a Polynomial from Reciprocal Zeroes",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If α and β are zeroes of the polynomial 6y² − 7y + 2, find the quadratic polynomial whose zeroes are 1/α and 1/β.",
    "options": [],
    "answer": "p(x) = x² − (7/2)x + 3",
    "solutionSteps": [
      "[1 mark] For 6y² − 7y + 2: sum of zeroes α + β = −b/a = 7/6 and product αβ = c/a = 2/6 = 1/3.",
      "[1 mark] Sum of new zeroes = 1/α + 1/β = (α + β)/(αβ) = (7/6)/(1/3) = 7/2. Product of new zeroes = 1/(αβ) = 1/(1/3) = 3.",
      "[1 mark] Required polynomial = x² − (sum)x + (product) = x² − (7/2)x + 3."
    ],
    "finalAnswer": "p(x) = x² − (7/2)x + 3",
    "isCompetencyBased": false
  }
];
