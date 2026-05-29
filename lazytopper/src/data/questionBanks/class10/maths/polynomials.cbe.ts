import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Polynomials — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10PS2, Maths10AS2, Maths10SS8, Maths10AR1, Maths10AKP10, Maths10RK1.
 * Topic group "Algebra" (10A1a — relationship between zeroes and coefficients of
 *   quadratic polynomials) mapped to CBSE chapter topicKey "polynomials".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=5, B=1.
 */
export const POLY_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-POLY-A-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The product of the zeroes of a quadratic polynomial 2x² − 5x + m is 4. Find the value of m.",
    "options": [],
    "answer": "m = 8",
    "solutionSteps": [
      "[1 mark] Product of zeroes = c/a = m/2. Given product = 4, so m/2 = 4 → m = 8."
    ],
    "finalAnswer": "m = 8",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-POLY-A-002",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If the sum of the zeroes of the quadratic polynomial 5x² − kx + 7 is 4, then find the value of 'k'.",
    "options": [
      "A. 20",
      "B. 21",
      "C. 18",
      "D. 19"
    ],
    "answer": "A. 20",
    "solutionSteps": [
      "[1 mark] Sum of zeroes = −b/a = k/5. Given sum = 4, so k/5 = 4 → k = 20. Answer: A."
    ],
    "finalAnswer": "A. 20",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-POLY-A-003",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If α and β are the zeroes of a polynomial x² − 4√3·x + 3, then find the value of α + β − αβ.",
    "options": [
      "A. 4√3",
      "B. −3",
      "C. 4√3 − 3",
      "D. −4√3 − 3"
    ],
    "answer": "C. 4√3 − 3",
    "solutionSteps": [
      "[1 mark] For x² − 4√3·x + 3: sum α+β = 4√3, product αβ = 3. So α+β−αβ = 4√3−3. Answer: C."
    ],
    "finalAnswer": "C. 4√3 − 3",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-POLY-A-004",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The sum of the zeroes of the quadratic polynomial x² + x − 12 is",
    "options": [
      "A. 1",
      "B. 12",
      "C. −1",
      "D. −12"
    ],
    "answer": "C. −1",
    "solutionSteps": [
      "[1 mark] Sum of zeroes = −b/a = −1/1 = −1. Answer: C."
    ],
    "finalAnswer": "C. −1",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-POLY-A-005",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Forming a Quadratic Polynomial from its Zeroes",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "What is the quadratic polynomial whose sum and product of zeroes are √2 and ⅓, respectively?",
    "options": [
      "A. 3x² − 3√2·x + 1",
      "B. 3x² + 3√2·x + 1",
      "C. 2x² + 3√2·x − 1",
      "D. 2x² + 3√2·x − 1"
    ],
    "answer": "A. 3x² − 3√2·x + 1",
    "solutionSteps": [
      "[1 mark] Polynomial with sum √2 and product ⅓ is k[x²−√2x+⅓]; taking k=3 gives 3x²−3√2x+1. Answer: A."
    ],
    "finalAnswer": "A. 3x² − 3√2·x + 1",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-POLY-B-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If α and β are the zeroes of the quadratic polynomial 2x² − 8x + 5, find the value of (α + 1/β) × (β + 1/α).",
    "options": [],
    "answer": "49/10",
    "solutionSteps": [
      "[1 mark] For 2x²−8x+5: sum α+β = 4, product αβ = 5/2.",
      "[1 mark] (α+1/β)(β+1/α) = αβ+2+1/(αβ) = 5/2+2+2/5 = 49/10."
    ],
    "finalAnswer": "49/10",
    "isCompetencyBased": false
  }
];
