import type { CanonicalQuestion } from "../../../predictionTypes";

export const COORD_EXPAND_EXTRACT: CanonicalQuestion[] = [
  {
    "id": "BX-COORD-EX-A-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "If the point (x, 4) lies on a circle whose centre is at the origin and radius is 5, then x =",
    "options": [
      "±5",
      "±3",
      "0",
      "±4"
    ],
    "answer": "±3",
    "solutionSteps": [
      "[1 mark] The point (x, 4) is at distance 5 from O(0, 0): x² + 4² = 5² ⇒ x² = 25 − 16 = 9 ⇒ x = ±3."
    ],
    "finalAnswer": "x = ±3.",
    "ncertRef": "Foundation MCQ Bank (Coordinate Geometry) Q1",
    "isCompetencyBased": true,
    "strategyHint": "A point lies on a circle of radius r centred at the origin ⇔ its distance from the origin equals r."
  },
  {
    "id": "BX-COORD-EX-A-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "A circle is drawn with the origin as centre passing through the point (13/2, 0). Which of the following points does NOT lie in the interior of the circle?",
    "options": [
      "(−3/4, 1)",
      "(2, 7/3)",
      "(5, −1/2)",
      "(−6, 5/2)"
    ],
    "answer": "(−6, 5/2)",
    "solutionSteps": [
      "[1 mark] Radius = distance of O(0,0) from (13/2, 0) = 6.5. A point is interior ⇔ its distance from O < 6.5. Distances: (−3/4,1)→1.25, (2,7/3)→√(85/9)≈3.07, (5,−1/2)→√(101)/2≈5.02 (all < 6.5), but (−6,5/2)→√(36+25/4)=√(169/4)=6.5 = radius, so it lies ON the circle, not inside."
    ],
    "finalAnswer": "(−6, 5/2) — it lies on the circle (distance 6.5 = radius), not in the interior.",
    "ncertRef": "Foundation MCQ Bank (Coordinate Geometry) Q46",
    "isCompetencyBased": true,
    "strategyHint": "Compute the radius, then compare each point's distance from the centre against it; distance = radius ⇒ on the circle, not interior."
  },
  {
    "id": "BX-COORD-EX-B-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "If A(5, p), B(1, 5), C(2, 1) and D(6, 2) are the vertices of a square ABCD, find the value of p.",
    "answer": "In square ABCD the two sides through A are AB and AD, so AB = AD ⇒ AB² = AD². AB² = (5−1)² + (p−5)² = 16 + (p−5)². AD² = (5−6)² + (p−2)² = 1 + (p−2)². Equate: 16 + p² − 10p + 25 = 1 + p² − 4p + 4 ⇒ 41 − 10p = 5 − 4p ⇒ 36 = 6p ⇒ p = 6.",
    "solutionSteps": [
      "[1 mark] Sides AB and AD are equal ⇒ AB² = AD²: (5−1)² + (p−5)² = (5−6)² + (p−2)², i.e. 16 + (p−5)² = 1 + (p−2)².",
      "[1 mark] Expand and simplify: 41 − 10p = 5 − 4p ⇒ 6p = 36 ⇒ p = 6."
    ],
    "finalAnswer": "p = 6.",
    "ncertRef": "Foundation MCQ Bank (Coordinate Geometry) Q28",
    "isCompetencyBased": true,
    "strategyHint": "Adjacent sides of a square are equal; equate the squared side-lengths through the vertex carrying the unknown."
  },
  {
    "id": "BX-COORD-EX-C-001",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "requiresDiagram": false,
    "questionText": "Prove that the distance between the points A(a cos θ + b sin θ, 0) and B(0, a sin θ − b cos θ) is √(a² + b²).",
    "answer": "AB² = (a cos θ + b sin θ − 0)² + (0 − (a sin θ − b cos θ))² = (a cos θ + b sin θ)² + (a sin θ − b cos θ)². Expanding: a²cos²θ + 2ab sinθ cosθ + b²sin²θ + a²sin²θ − 2ab sinθ cosθ + b²cos²θ. The cross terms cancel, leaving a²(cos²θ + sin²θ) + b²(sin²θ + cos²θ) = a² + b². Hence AB = √(a² + b²).",
    "solutionSteps": [
      "[1 mark] Apply the distance formula: AB² = (a cos θ + b sin θ)² + (a sin θ − b cos θ)².",
      "[1 mark] Expand both squares: a²cos²θ + 2ab sinθcosθ + b²sin²θ + a²sin²θ − 2ab sinθcosθ + b²cos²θ; the ±2ab sinθcosθ terms cancel.",
      "[1 mark] Group and use sin²θ + cos²θ = 1: a²(cos²θ + sin²θ) + b²(sin²θ + cos²θ) = a² + b². Therefore AB = √(a² + b²)."
    ],
    "finalAnswer": "AB = √(a² + b²).",
    "ncertRef": "Foundation MCQ Bank (Coordinate Geometry) Q18",
    "isCompetencyBased": true,
    "strategyHint": "Square the distance, expand fully so the cross terms cancel, then apply sin²θ + cos²θ = 1."
  },
  {
    "id": "BX-COORD-EX-C-002",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "If A(5, 3), B(11, −5) and P(12, y) are the vertices of a triangle right-angled at P, find the value(s) of y.",
    "answer": "Right angle at P ⇒ PA² + PB² = AB². AB² = (11−5)² + (−5−3)² = 36 + 64 = 100. PA² = (12−5)² + (y−3)² = 49 + (y−3)². PB² = (12−11)² + (y+5)² = 1 + (y+5)². So 49 + (y−3)² + 1 + (y+5)² = 100 ⇒ (y−3)² + (y+5)² = 50 ⇒ 2y² + 4y + 34 = 50 ⇒ 2y² + 4y − 16 = 0 ⇒ y² + 2y − 8 = 0 ⇒ (y + 4)(y − 2) = 0 ⇒ y = 2 or y = −4.",
    "solutionSteps": [
      "[1 mark] Right angle at P ⇒ by the converse of Pythagoras, PA² + PB² = AB². Compute AB² = 6² + (−8)² = 100.",
      "[1 mark] PA² = 7² + (y−3)² and PB² = 1² + (y+5)². Substitute: 49 + (y−3)² + 1 + (y+5)² = 100 ⇒ (y−3)² + (y+5)² = 50.",
      "[1 mark] Simplify to 2y² + 4y − 16 = 0 ⇒ y² + 2y − 8 = 0 ⇒ (y+4)(y−2) = 0 ⇒ y = 2 or y = −4."
    ],
    "finalAnswer": "y = 2 or y = −4.",
    "ncertRef": "Foundation MCQ Bank (Coordinate Geometry) Q56",
    "isCompetencyBased": true,
    "strategyHint": "The right angle sits at P, so PA and PB are the legs: set PA² + PB² = AB² and solve the resulting quadratic in y."
  },
  {
    "id": "BX-COORD-EX-C-004",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Section Formula",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "The mid-points of the sides of a triangle are (1, 2), (0, −1) and (2, −1). Find the coordinates of the vertices of the triangle.",
    "answer": "Let the vertices be A, B, C and let D, E, F be the mid-points of BC, CA, AB. Take D(0, −1) = mid BC, E(2, −1) = mid CA, F(1, 2) = mid AB. Then A = E + F − D = (2+1−0, −1+2−(−1)) = (3, 2). B = F + D − E = (1+0−2, 2+(−1)−(−1)) = (−1, 2). C = D + E − F = (0+2−1, −1+(−1)−2) = (1, −4). Check: mid AB = (1, 2) ✓, mid BC = (0, −1) ✓, mid CA = (2, −1) ✓.",
    "solutionSteps": [
      "[1 mark] Label mid-points D(0,−1)=mid BC, E(2,−1)=mid CA, F(1,2)=mid AB. Use A = E + F − D (each vertex equals the sum of the two adjacent side-midpoints minus the opposite one).",
      "[1 mark] A = (2+1−0, −1+2+1) = (3, 2); B = F + D − E = (1+0−2, 2−1+1) = (−1, 2).",
      "[1 mark] C = D + E − F = (0+2−1, −1−1−2) = (1, −4). Vertices: (3, 2), (−1, 2), (1, −4)."
    ],
    "finalAnswer": "Vertices: (3, 2), (−1, 2) and (1, −4).",
    "ncertRef": "Foundation Worksheet 14 (Co-ordinate Geometry) Level-I Q10",
    "isCompetencyBased": true,
    "strategyHint": "Each vertex = (sum of the two mid-points of the sides through it) − (mid-point of the opposite side)."
  },
  {
    "id": "BX-COORD-EX-C-005",
    "subject": "Maths",
    "topicKey": "coordinate-geometry",
    "subtopic": "Distance Formula",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "requiresDiagram": false,
    "questionText": "Find the coordinates of the circumcentre of the triangle whose vertices are (8, 6), (8, −2) and (2, −2). Also find its circumradius.",
    "answer": "Let the circumcentre be P(x, y), equidistant from all three vertices. PA² = PB²: (x−8)² + (y−6)² = (x−8)² + (y+2)² ⇒ (y−6)² = (y+2)² ⇒ −12y + 36 = 4y + 4 ⇒ 16y = 32 ⇒ y = 2. PB² = PC²: (x−8)² + (y+2)² = (x−2)² + (y+2)² ⇒ (x−8)² = (x−2)² ⇒ −16x + 64 = −4x + 4 ⇒ 12x = 60 ⇒ x = 5. Circumcentre (5, 2). Circumradius = distance from (5, 2) to (8, 6) = √(3² + 4²) = √25 = 5.",
    "solutionSteps": [
      "[1 mark] Let P(x, y) be equidistant from all vertices. From PA² = PB² with A(8,6), B(8,−2): (y−6)² = (y+2)² ⇒ 16y = 32 ⇒ y = 2.",
      "[1 mark] From PB² = PC² with B(8,−2), C(2,−2): (x−8)² = (x−2)² ⇒ 12x = 60 ⇒ x = 5. So the circumcentre is (5, 2).",
      "[1 mark] Circumradius = distance (5,2)→(8,6) = √(3² + 4²) = √25 = 5 units."
    ],
    "finalAnswer": "Circumcentre (5, 2); circumradius 5 units.",
    "ncertRef": "Foundation Worksheet 14 (Co-ordinate Geometry) Level-II Q2",
    "isCompetencyBased": true,
    "strategyHint": "The circumcentre is equidistant from all vertices; equate pairs of squared distances to get two linear equations, then find the radius."
  },
];
