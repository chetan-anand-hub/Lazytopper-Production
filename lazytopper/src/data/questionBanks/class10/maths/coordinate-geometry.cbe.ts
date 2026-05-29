import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Coordinate Geometry — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10RK8, Maths10RM7a, Maths10RM7b, Maths10SK10a, Maths10SK10b.
 * Topic group "Coordinate Geometry" (10G3a — section formula / distance formula / midpoint).
 *   Maths10RK8 is mis-filed in the index under 10T3a (heights & distances) but its question
 *   is a genuine section-formula (trisection) problem; mapped here to topicKey
 *   "coordinate-geometry". Maths10RM7 and Maths10SK10 are likewise distance/midpoint-formula
 *   items carried under trigonometry/Class-9 codes.
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=1, B=2, C=2.
 * SKIPPED: Maths10SR6 (plain 4-mark, no valid section), Maths10SS4 (plain 4-mark, no valid section).
 */
export const CG_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-CG-C-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Section Formula (Trisection)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The line segment joining A(2, 1) and B(5, −8) is trisected at the points P and Q. If P is closer to point A and lies on the line 2x − y + k = 0, find the value of k.",
    "options": [],
    "answer": "k = −8",
    "solutionSteps": [
      "[1 mark] P (closer to A) divides AB in the ratio m₁:m₂ = AP:PB = 1:2, with A(2, 1) and B(5, −8).",
      "[1 mark] By the section formula, P = ((1×5 + 2×2)/(1+2), (1×(−8) + 2×1)/(1+2)) = (9/3, −6/3) = (3, −2).",
      "[1 mark] Since P(3, −2) lies on 2x − y + k = 0: 2(3) − (−2) + k = 0 → 6 + 2 + k = 0 → k = −8."
    ],
    "finalAnswer": "k = −8",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-CG-C-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula (Real-Life Context)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two friends Seema and Aditya study at a boarding school in Shimla. During Christmas vacations, both decided to go to their hometowns, represented by Town A and Town B respectively in the figure. Town A and Town B are connected by trains from the same station C in Shimla. Using the coordinates A(1, 7), B(4, 2) and C(−4, 4), determine who will travel the larger distance to reach their hometown.",
    "options": [],
    "answer": "Aditya will travel the larger distance (BC = √68 > AC = √34).",
    "solutionSteps": [
      "[1 mark] Read the coordinates from the figure: A(1, 7), B(4, 2), station C(−4, 4).",
      "[1 mark] Distance AC = √[(1 − (−4))² + (7 − 4)²] = √(5² + 3²) = √34 units.",
      "[1 mark] Distance BC = √[(4 − (−4))² + (2 − 4)²] = √(8² + 2²) = √68 units; since √68 > √34, Aditya travels the larger distance."
    ],
    "finalAnswer": "Aditya travels the larger distance (BC = √68 units > AC = √34 units).",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Coordinate grid showing station C(−4, 4) connected by rail lines to Town A(1, 7) and Town B(4, 2)."
  },
  {
    "id": "CBE-M-CG-B-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Midpoint Formula (Real-Life Context)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Seema and Aditya plan to meet at a location situated at a point D which is at the mid-point of the line joining the points representing Town A(1, 7) and Town B(4, 2). Find the coordinates of D.",
    "options": [],
    "answer": "D = (2.5, 5.5)",
    "solutionSteps": [
      "[1 mark] D is the mid-point of AB, so D = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ((1 + 4)/2, (7 + 2)/2).",
      "[1 mark] D = (5/2, 9/2) = (2.5, 5.5)."
    ],
    "finalAnswer": "D = (2.5, 5.5)",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Coordinate grid showing Town A(1, 7) and Town B(4, 2) with point D marked at the midpoint of segment AB."
  },
  {
    "id": "CBE-M-CG-B-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula (Distance from Origin)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Ajay, Bhigu, and Colin always want to sit in a row in the classroom. Bhigu considers the centre of the class as the origin and marks their seating positions on a coordinate grid, with point A at (2, 2). What is the distance of point A from the origin?",
    "options": [],
    "answer": "2√2 units",
    "solutionSteps": [
      "[1 mark] Apply the distance formula from the origin O(0, 0) to A(2, 2): OA = √[(2 − 0)² + (2 − 0)²].",
      "[1 mark] OA = √(2² + 2²) = √(4 + 4) = √8 = 2√2 units."
    ],
    "finalAnswer": "2√2 units",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Coordinate grid with origin at the centre of the classroom showing seating positions, with point A plotted at (2, 2)."
  },
  {
    "id": "CBE-M-CG-A-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula (Distance Between Two Points)",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "On Bhigu's classroom seating grid, point B is at (3, 0) and point C is at (−1, −2). What is the distance between B and C?",
    "options": [],
    "answer": "2√5 units",
    "solutionSteps": [
      "[1 mark] BC = √[(−1 − 3)² + (−2 − 0)²] = √[(−4)² + (−2)²] = √(16 + 4) = √20 = 2√5 units."
    ],
    "finalAnswer": "2√5 units",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Coordinate grid with origin at the centre of the classroom showing seating positions, with point B at (3, 0) and point C at (−1, −2)."
  }
];
