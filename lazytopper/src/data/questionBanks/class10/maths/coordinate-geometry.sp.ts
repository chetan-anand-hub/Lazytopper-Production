import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * coordinate-geometry — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "coordinate-geometry". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const CG_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-CG-A-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Collinearity of Points",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If points A(x, 2), B(−3, −4) and C(7, −5) are collinear, then x is",
    "options": [
      "(a) 63",
      "(b) 23",
      "(c) 60",
      "(d) −63"
    ],
    "answer": "(d) −63",
    "solutionSteps": [
      "[1 mark] For collinear points the area of triangle = 0: x(−4 − (−5)) + (−3)(−5 − 2) + 7(2 − (−4)) = 0 → x(1) + (−3)(−7) + 7(6) = 0 → x + 21 + 42 = 0 → x = −63. Answer: (d)."
    ],
    "finalAnswer": "(d) −63",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-CG-A-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Centroid of a Triangle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If origin is the centroid of a triangle whose vertices are A(a, b), B(b, c) and C(c, a), then the value of a + b + c is",
    "options": [
      "(a) 1",
      "(b) 2",
      "(c) 0",
      "(d) 3"
    ],
    "answer": "(c) 0",
    "solutionSteps": [
      "[1 mark] Centroid x-coordinate = (a + b + c)/3 = 0 (origin) → a + b + c = 0. Answer: (c)."
    ],
    "finalAnswer": "(c) 0",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-CG-A-003",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Section Formula",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Statement A (Assertion): The point (−1, 6) divides the line segment joining the points (−3, 10) and (6, −8) in the ratio 2 : 7 internally. Statement R (Reason): Given three points A, B and C form an equilateral triangle, then AB = BC = AC. Choose the correct option.",
    "options": [
      "(a) Both Assertion (A) and Reason (R) are true and Reason (R) is correct explanation of Assertion (A).",
      "(b) Both Assertion (A) and Reason (R) are true and Reason (R) is not correct explanation of Assertion (A).",
      "(c) Assertion (A) is true but Reason (R) is false.",
      "(d) Assertion (A) is false but Reason (R) is true."
    ],
    "answer": "(b) Both Assertion (A) and Reason (R) are true and Reason (R) is not correct explanation of Assertion (A).",
    "solutionSteps": [
      "[1 mark] By section formula with ratio 2:7: x = (2·6 + 7·(−3))/9 = (12 − 21)/9 = −1; y = (2·(−8) + 7·10)/9 = (−16 + 70)/9 = 6. So Assertion is true. The Reason (definition of equilateral triangle) is also a true statement but unrelated to the Assertion, so it is not the correct explanation. Answer: (b)."
    ],
    "finalAnswer": "(b) Both Assertion (A) and Reason (R) are true and Reason (R) is not correct explanation of Assertion (A).",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-CG-B-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula and Medians",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Find the lengths of the medians of the triangle whose vertices are (3, −1), (5, 3) and (7, −3).",
    "options": [],
    "answer": "Medians are 5 units, 5 units and √10 units",
    "solutionSteps": [
      "[1 mark] Let A(3, −1), B(5, 3), C(7, −3). Mid-points: D of AC = (5, −2), E of BC = (6, 0), F of BA = (4, 1).",
      "[1 mark] Median BD = √[(5−5)² + (−2−3)²] = √25 = 5 units; median CF = √[(4−7)² + (1+3)²] = √(9+16) = 5 units; median AE = √[(6−3)² + (0+1)²] = √(9+1) = √10 units."
    ],
    "finalAnswer": "Medians are 5 units, 5 units and √10 units",
    "isCompetencyBased": false
  }
];
