import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * quadratic-equations — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "quadratic-equations".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const QE_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-QE-A-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Roots of a Quadratic Equation",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If ½ is a root of the equation x² + kx − 5/4 = 0, then the value of k is",
    "options": [
      "(a) 2",
      "(b) −2",
      "(c) 1/4",
      "(d) 1/2"
    ],
    "answer": "(a) 2",
    "solutionSteps": [
      "[1 mark] Substitute x = ½: (½)² + k(½) − 5/4 = 0 → 1/4 + k/2 − 5/4 = 0 → k/2 = 5/4 − 1/4 = 1 → k = 2. Answer: (a)."
    ],
    "finalAnswer": "(a) 2",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-QE-A-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Solving a Quadratic Equation",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Find the positive root of 3x² + 6 = 9.",
    "options": [],
    "answer": "x = 1",
    "solutionSteps": [
      "[1 mark] 3x² + 6 = 9 → 3x² = 3 → x² = 1 → x = ±1. The positive root is x = 1."
    ],
    "finalAnswer": "x = 1",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-QE-A-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The value(s) of k for which the quadratic equation 2x² − kx + k = 0 has equal roots is/are",
    "options": [
      "(a) 0",
      "(b) 4",
      "(c) 8",
      "(d) 0, 8"
    ],
    "answer": "(d) 0, 8",
    "solutionSteps": [
      "[1 mark] For equal roots, discriminant = 0: (−k)² − 4(2)(k) = 0 → k² − 8k = 0 → k(k − 8) = 0 → k = 0 or k = 8. Answer: (d)."
    ],
    "finalAnswer": "(d) 0, 8",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-QE-A-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Roots of a Quadratic Equation",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If one root of the quadratic equation 6x² − x − k = 0 is 2/3, then find the value of k.",
    "options": [],
    "answer": "k = 2",
    "solutionSteps": [
      "[1 mark] Substitute x = 2/3: 6(2/3)² − (2/3) − k = 0 → 6(4/9) − 2/3 − k = 0 → 8/3 − 2/3 − k = 0 → 2 − k = 0 → k = 2."
    ],
    "finalAnswer": "k = 2",
    "isCompetencyBased": false
  }
];
