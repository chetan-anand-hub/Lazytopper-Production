import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * coordinate-geometry — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "coordinate-geometry".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const CG_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-CG-A-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Equation of a Line through Two Points",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The points (7, 2) and (−1, 0) lie on a line",
    "options": [
      "(a) 7y = 3x − 7",
      "(b) 4y = x + 1",
      "(c) y = 7x + 7",
      "(d) x = 4y + 1"
    ],
    "answer": "(b) 4y = x + 1",
    "solutionSteps": [
      "[1 mark] Test (b) 4y = x + 1: for (7, 2): 4(2) = 8 and 7 + 1 = 8 ✓; for (−1, 0): 4(0) = 0 and −1 + 1 = 0 ✓. Both points satisfy it. Answer: (b)."
    ],
    "finalAnswer": "(b) 4y = x + 1",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-CG-A-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Section Formula",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ratio in which the line 3x + 4y = 7 divides the line segment joining the points (1, 2) and (−2, 1) is",
    "options": [
      "(a) 3 : 5",
      "(b) 4 : 6",
      "(c) 4 : 9",
      "(d) None of these"
    ],
    "answer": "(c) 4 : 9",
    "solutionSteps": [
      "[1 mark] Let the ratio be k : 1. The dividing point is ((−2k+1)/(k+1), (k+2)/(k+1)). Substituting in 3x + 4y = 7: 3(−2k+1) + 4(k+2) = 7(k+1) → −6k + 3 + 4k + 8 = 7k + 7 → −2k + 11 = 7k + 7 → 9k = 4 → k = 4/9. Ratio = 4 : 9. Answer: (c)."
    ],
    "finalAnswer": "(c) 4 : 9",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-CG-B-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "If the point P(x, y) is equidistant from the points Q(a + b, b − a) and R(a − b, a + b), then prove that bx = ay.",
    "options": [],
    "answer": "Proved that bx = ay",
    "solutionSteps": [
      "[1 mark] P is equidistant from Q and R ⇒ PQ = PR ⇒ PQ² = PR²: (x − (a+b))² + (y − (b−a))² = (x − (a−b))² + (y − (a+b))².",
      "[1 mark] Expanding: −2x(a+b) + (a+b)² − 2y(b−a) + (b−a)² = −2x(a−b) + (a−b)² − 2y(a+b) + (a+b)². The squared terms (a+b)² and (b−a)²/(a−b)² cancel pairwise, leaving −2x(a+b) − 2y(b−a) = −2x(a−b) − 2y(a+b) → −2bx − 2by + 2ay = 2bx − 2ay − 2by... simplifying: −x(a+b) − y(b−a) = −x(a−b) − y(a+b) → −2bx + 2ay = 0 → bx = ay. Hence proved."
    ],
    "finalAnswer": "bx = ay (proved)",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-CG-A-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If the points A(4, 3) and B(x, 5) are on the circle with centre O(2, 3), then the value of x is",
    "options": [
      "(a) 0",
      "(b) 1",
      "(c) 2",
      "(d) 3"
    ],
    "answer": "(c) 2",
    "solutionSteps": [
      "[1 mark] A and B lie on the circle, so OA = OB. OA² = (4−2)² + (3−3)² = 4. OB² = (x−2)² + (5−3)² = (x−2)² + 4. Setting OB² = OA²: (x−2)² + 4 = 4 → (x−2)² = 0 → x = 2. Answer: (c)."
    ],
    "finalAnswer": "(c) 2",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-2-CG-B-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula (Type of Triangle)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Prove that the points (3, 0), (6, 4) and (−1, 3) are the vertices of a right-angled isosceles triangle.",
    "options": [],
    "answer": "AB = CA = 5, BC = 5√2 and AB² + CA² = BC²; hence right-angled isosceles.",
    "solutionSteps": [
      "[1 mark] Let A(3,0), B(6,4), C(−1,3). AB = √[(6−3)² + (4−0)²] = √(9+16) = √25 = 5. CA = √[(3−(−1))² + (0−3)²] = √(16+9) = √25 = 5. BC = √[(6−(−1))² + (4−3)²] = √(49+1) = √50 = 5√2.",
      "[1 mark] Since AB = CA = 5, the triangle is isosceles. Also AB² + CA² = 25 + 25 = 50 = BC², so by the converse of the Pythagoras theorem the angle at A is 90°. Hence the triangle is right-angled isosceles."
    ],
    "finalAnswer": "AB = CA = 5, BC = 5√2; right-angled isosceles triangle (right angle at A).",
    "isCompetencyBased": false
  }
];
