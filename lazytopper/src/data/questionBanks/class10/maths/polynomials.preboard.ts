import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * polynomials — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "polynomials".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const POLY_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-POLY-A-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Relationship Between Zeroes and Coefficients",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "If α and β are the zeroes of the quadratic polynomial ax² + bx + c, then",
    "options": ["α + β = b/a and αβ = c/a", "α + β = −b/c and αβ = a/c", "α + β = −b/a and αβ = c/a", "α + β = −c/a and αβ = b/a"],
    "answer": "α + β = −b/a and αβ = c/a",
    "solutionSteps": [
      "[1 mark] α + β = −b/a and αβ = c/a — for ax² + bx + c, sum of zeroes = −b/a and product = c/a."
    ],
    "finalAnswer": "α + β = −b/a and αβ = c/a",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-POLY-C-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Forming a Quadratic Polynomial from its Zeroes",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Quadratic polynomial 2x² − 3x + 1 has zeroes as α and β. Now form a quadratic polynomial whose zeroes are 3α and 3β.",
    "options": [],
    "answer": "2x² − 9x + 9 (or any scalar multiple)",
    "solutionSteps": [
      "[1 mark] For 2x² − 3x + 1: α + β = −(−3)/2 = 3/2 and αβ = 1/2.",
      "[1 mark] New zeroes 3α and 3β: sum = 3(α + β) = 3 × 3/2 = 9/2; product = 9αβ = 9 × 1/2 = 9/2.",
      "[1 mark] Required polynomial = x² − (sum)x + (product) = x² − (9/2)x + 9/2. Multiplying by 2: 2x² − 9x + 9."
    ],
    "finalAnswer": "2x² − 9x + 9",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-POLY-A-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Number of Zeroes of a Polynomial",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "A quadratic polynomial can have at most 2 zeroes. A cubic polynomial can have at most",
    "options": ["2 zeroes", "4 zeroes", "6 zeroes", "3 zeroes"],
    "answer": "3 zeroes",
    "solutionSteps": [
      "[1 mark] 3 zeroes — the number of zeroes cannot exceed the degree, which is 3 for a cubic."
    ],
    "finalAnswer": "3 zeroes",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-POLY-C-001",
    "subject": "Maths",
    "topicKey": "polynomials",
    "subtopic": "Forming a Polynomial from Transformed Zeroes",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If α and β are the zeroes of the polynomial 6y² − 7y + 2, find a quadratic polynomial whose zeroes are 1/α and 1/β.",
    "options": [],
    "answer": "2x² − 7x + 6 (or any non-zero multiple).",
    "solutionSteps": [
      "[1 mark] For 6y² − 7y + 2: sum α + β = −(−7)/6 = 7/6 and product αβ = 2/6 = 1/3.",
      "[1 mark] New sum = 1/α + 1/β = (α + β)/(αβ) = (7/6)/(1/3) = (7/6) × 3 = 7/2. New product = 1/(αβ) = 1/(1/3) = 3.",
      "[1 mark] Required polynomial = x² − (sum)x + (product) = x² − (7/2)x + 3; multiplying by 2 to clear fractions gives 2x² − 7x + 6."
    ],
    "finalAnswer": "2x² − 7x + 6",
    "isCompetencyBased": false
  }
];
