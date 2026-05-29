import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Quadratic Equations — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10RK3, Maths10PS10, Maths10RM5 (a, b), Maths10PS3, Maths10SS9,
 *   Maths10AR10, Maths10SK9.
 * Content Reference codes: 10A3a (solve by factorisation / quadratic formula),
 *   10A3b (discriminant & nature of roots), 10A3c (real-life quadratic problems).
 * Mapped to CBSE chapter topicKey "quadratic-equations".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=3, B=2, C=2, E=1.
 */
export const QE_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-QE-A-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Roots of a Quadratic Equation",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If ½ is a root of the quadratic equation x² − mx − 5/4 = 0, then the value of m is:",
    "options": [
      "A. 2",
      "B. −2",
      "C. −3",
      "D. 3"
    ],
    "answer": "B. −2",
    "solutionSteps": [
      "[1 mark] Substitute x = ½ into x² − mx − 5/4 = 0: (½)² − m(½) − 5/4 = 0 → ¼ − m/2 − 5/4 = 0 → m = −2. Answer: B."
    ],
    "finalAnswer": "B. −2",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-A-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Find the nature of the roots for the quadratic equation x² − 3x + 11 = 0",
    "options": [
      "A. No roots",
      "B. No real roots",
      "C. Two equal roots",
      "D. Two distinct real roots"
    ],
    "answer": "B. No real roots",
    "solutionSteps": [
      "[1 mark] Discriminant b² − 4ac = (−3)² − 4(1)(11) = 9 − 44 = −44 < 0, so there are no real roots. Answer: B."
    ],
    "finalAnswer": "B. No real roots",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-A-003",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The values of k for which the quadratic equation 2x² − kx + k = 0 has equal roots are:",
    "options": [
      "A. 8 and 2",
      "B. 0 and 2",
      "C. −8 and 0",
      "D. 0 and 8"
    ],
    "answer": "D. 0 and 8",
    "solutionSteps": [
      "[1 mark] For equal roots the discriminant b² − 4ac = 0: k² − 4(2)(k) = 0 → k² − 8k = 0 → k(k − 8) = 0 → k = 0 or k = 8. Answer: D."
    ],
    "finalAnswer": "D. 0 and 8",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-B-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Find the nature of the roots of the quadratic equation: 3x² + 5x − 7 = 0",
    "options": [],
    "answer": "Real and unequal",
    "solutionSteps": [
      "[1 mark] Find the discriminant b² − 4ac = (5)² − 4(3)(−7) = 25 + 84 = 109.",
      "[1 mark] Since the discriminant = 109 > 0, the roots are real and unequal."
    ],
    "finalAnswer": "Real and unequal",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-B-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Real-Life Quadratic Problems",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Kapoor Travel Agency has sent an AC bus and a minibus with passengers on a trip to Shimla. The AC bus travels at x km/hr while the minibus travels at a speed of 10 km/hr more than the AC bus. The AC bus took 2 hrs more than the minibus in covering 600 km. How much time did the minibus take to travel 600 km? (Take the speed of the AC bus as 50 km/hr.)",
    "options": [],
    "answer": "10 hours",
    "solutionSteps": [
      "[1 mark] Speed of minibus = 50 + 10 = 60 km/hr.",
      "[1 mark] Time taken = distance ÷ speed = 600 ÷ 60 = 10 hours."
    ],
    "finalAnswer": "10 hours",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-QE-C-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "For which value(s) of k will the roots of 6x² + 6 = 4kx be real and equal?",
    "options": [],
    "answer": "k = 3 or k = −3",
    "solutionSteps": [
      "[1 mark] Rewrite as 6x² − 4kx + 6 = 0 and identify a = 6, b = −4k, c = 6.",
      "[1 mark] For real and equal roots, b² − 4ac = 0: (−4k)² − 4(6)(6) = 0 → 16k² − 144 = 0 → 16(k² − 9) = 0.",
      "[1 mark] (k + 3)(k − 3) = 0 → k = 3 or k = −3."
    ],
    "finalAnswer": "k = 3 or k = −3",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-C-002",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Nature of Roots (Discriminant)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Write the nature of roots of the quadratic equation 4x² + 4√3·x + 3 = 0.",
    "options": [],
    "answer": "Real and equal",
    "solutionSteps": [
      "[1 mark] Identify the coefficients a = 4, b = 4√3, c = 3 and set up b² − 4ac.",
      "[1 mark] b² − 4ac = (4√3)² − 4(4)(3) = 48 − 48 = 0.",
      "[1 mark] Since the discriminant = 0, the roots are real and equal."
    ],
    "finalAnswer": "Real and equal",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-QE-E-001",
    "subject": "Maths",
    "topicKey": "quadratic-equations",
    "subtopic": "Real-Life Quadratic Problems",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "Kapoor Travel Agency has sent an AC bus and a minibus with passengers on a trip to Shimla. The AC bus travels at x km/hr while the minibus travels at a speed of 10 km/hr more than the AC bus. The AC bus took 2 hrs more than the minibus in covering 600 km. What is the speed of the AC bus?",
    "options": [],
    "answer": "50 km/hr",
    "solutionSteps": [
      "[1 mark] Express the condition: speed of minibus = (x + 10) km/hr; AC bus time − minibus time = 2, i.e. 600/x − 600/(x + 10) = 2.",
      "[1 mark] Frame the quadratic equation: 600(x + 10) − 600x = 2x(x + 10) → 6000 = 2x² + 20x → x² + 10x − 3000 = 0.",
      "[1 mark] Factorise: x² + 60x − 50x − 3000 = 0 → (x + 60)(x − 50) = 0.",
      "[1 mark] x = 50 or x = −60; reject the negative value, so the speed of the AC bus = 50 km/hr."
    ],
    "finalAnswer": "50 km/hr",
    "isCompetencyBased": true
  }
];
