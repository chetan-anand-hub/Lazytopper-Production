import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * pair-of-linear-equations — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "pair-of-linear-equations". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const PLE_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-PLE-A-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Conditions for Infinite Solutions",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If the system of equations 3x − y − 5 = 0, 6x − 2y + k = 0 has infinite solutions, then k is",
    "options": [
      "(a) 10",
      "(b) −10",
      "(c) 5",
      "(d) 2"
    ],
    "answer": "(b) −10",
    "solutionSteps": [
      "[1 mark] For infinite solutions a₁/a₂ = b₁/b₂ = c₁/c₂: 3/6 = −1/−2 = −5/k → 1/2 = −5/k → k = −10. Answer: (b)."
    ],
    "finalAnswer": "(b) −10",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-PLE-B-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Solving Linear Equations (Elimination)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Solve the pair of linear equations to find x and y: (3/2)x − (5/3)y = −2 and (x/3) + (y/2) = 13/6.",
    "options": [],
    "answer": "x = 2, y = 3",
    "solutionSteps": [
      "[1 mark] Clearing fractions: equation 1 becomes 9x − 10y = −12 …(1); equation 2 becomes 2x + 3y = 13 …(2). Multiply (1) by 3 and (2) by 10: 27x − 30y = −36 and 20x + 30y = 130.",
      "[1 mark] Adding: 47x = 94 → x = 2. Substituting in (1): 9(2) − 10y = −12 → −10y = −30 → y = 3. Therefore x = 2, y = 3."
    ],
    "finalAnswer": "x = 2, y = 3",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-PLE-C-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problems (Ages)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The age of the father is twice the sum of ages of his two children. After 20 years, his age will be equal to the sum of ages of his children. Find age of the father.",
    "options": [],
    "answer": "Father's age = 40 years",
    "solutionSteps": [
      "[1 mark] Let present ages of the two children be x and y. Present age of father = 2(x + y) …(1).",
      "[1 mark] After 20 years: father's age = 2(x + y) + 20 and sum of children's ages = (x + 20) + (y + 20). Given they are equal: 2(x + y) + 20 = x + y + 40.",
      "[1 mark] Simplifying: 2x + 2y + 20 = x + y + 40 → x + y = 20. Father's age = 2(x + y) = 2(20) = 40 years."
    ],
    "finalAnswer": "Father's age = 40 years",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-PLE-C-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problems (Fixed and Variable Charges)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The owner of a taxi company decides to run all the taxis on CNG fuel instead of petrol. The taxi charges in a city comprise a fixed charge together with the charge for the distance covered. For a journey of 13 km, the charge paid is ₹129 and for a journey of 22 km, the charge paid is ₹210. What will a person pay for travelling 32 km?",
    "options": [],
    "answer": "₹300",
    "solutionSteps": [
      "[1 mark] Let fixed charge = ₹x and charge per km = ₹y. Then x + 13y = 129 …(1) and x + 22y = 210 …(2).",
      "[1 mark] Subtracting (1) from (2): 9y = 81 → y = 9. Substituting in (1): x + 13(9) = 129 → x = 129 − 117 = 12.",
      "[1 mark] Charge for 32 km = x + 32y = 12 + 32(9) = 12 + 288 = ₹300."
    ],
    "finalAnswer": "₹300",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-PLE-D-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problems (Area of Rectangle)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "If in a rectangle, the length is increased and breadth reduced each by 2 units, the area is reduced by 28 sq units. If, however, the length is reduced by 1 unit and breadth increased by 2 units, the area increases by 33 sq units. Find the area of the rectangle.",
    "options": [],
    "answer": "Area = 253 sq units",
    "solutionSteps": [
      "[1 mark] Let length = x units and breadth = y units, so area = xy. First condition: (x + 2)(y − 2) = xy − 28.",
      "[1 mark] Expanding: xy − 2x + 2y − 4 = xy − 28 → −2x + 2y + 24 = 0 → 2x − 2y = 24 …(1).",
      "[1 mark] Second condition: (x − 1)(y + 2) = xy + 33 → xy + 2x − y − 2 = xy + 33 → 2x − y = 35 …(2).",
      "[1 mark] Subtracting (2) from (1): −y = 24 − 35 = −11 → y = 11. Substituting in (2): 2x − 11 = 35 → 2x = 46 → x = 23.",
      "[1 mark] Length = 23 units, breadth = 11 units. Area = l × b = 23 × 11 = 253 sq units."
    ],
    "finalAnswer": "Area = 253 sq units",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-PLE-D-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problems (Numbers)",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The sum of two numbers is 1000 and the difference between their squares is 144000. Find the numbers.",
    "options": [],
    "answer": "The numbers are 572 and 428",
    "solutionSteps": [
      "[1 mark] Let the two numbers be x and y. Then x + y = 1000 …(1).",
      "[1 mark] Also x² − y² = 144000 …(2).",
      "[1 mark] Factorise (2): (x − y)(x + y) = 144000. Using (1): 1000(x − y) = 144000 → x − y = 144 …(3).",
      "[1 mark] Adding (1) and (3): 2x = 1144 → x = 572.",
      "[1 mark] From (1): y = 1000 − 572 = 428. Hence the two numbers are 572 and 428."
    ],
    "finalAnswer": "The numbers are 572 and 428",
    "isCompetencyBased": false
  }
];
