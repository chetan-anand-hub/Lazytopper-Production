import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Exemplar Class 10 Mathematics — Chapter 7: Coordinate Geometry
// topicKey: "coordinate-geometry"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27
// Coverage: Exemplar Exercise 7.1 (MCQ), 7.2 (T/F), 7.3 (SA), 7.4 (LA) — only
// in-syllabus items (Distance, Section, Midpoint, Area-of-Triangle, Collinearity).

export const CG_EXEMPLAR: CanonicalQuestion[] = [
  // ===== Exercise 7.1 — MCQ =====
  { id: "CG-N-EXMPLR-7-EX-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The distance of the point P(2, 3) from the x-axis is",
    options: ["2", "3", "1", "5"],
    answer: "3",
    solutionSteps: ["The distance of any point (x, y) from the x-axis equals |y|.", "For P(2, 3), |y| = 3."],
    finalAnswer: "3 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q1", isCompetencyBased: false,
    strategyHint: "Distance from x-axis = |y|; distance from y-axis = |x|." },

  { id: "CG-N-EXMPLR-7-EX-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The distance between the points A(0, 6) and B(0, −2) is",
    options: ["6", "8", "4", "2"],
    answer: "8",
    solutionSteps: ["Both points lie on the y-axis (x = 0).", "Distance = |6 − (−2)| = 8."],
    finalAnswer: "8 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q2", isCompetencyBased: false },

  { id: "CG-N-EXMPLR-7-EX-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The distance of the point P(−6, 8) from the origin is",
    options: ["8", "2√7", "10", "6"],
    answer: "10",
    solutionSteps: ["Distance from origin = √(x² + y²).", "= √((−6)² + 8²) = √(36 + 64) = √100 = 10."],
    finalAnswer: "10 — option (C).",
    ncertRef: "Exemplar Ex 7.1 Q3", isCompetencyBased: false },

  { id: "CG-N-EXMPLR-7-EX-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The distance between the points (0, 5) and (−5, 0) is",
    options: ["5", "5√2", "2√5", "10"],
    answer: "5√2",
    solutionSteps: ["d = √[(−5 − 0)² + (0 − 5)²] = √(25 + 25) = √50.", "√50 = √(25 · 2) = 5√2."],
    finalAnswer: "5√2 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q4", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "AOBC is a rectangle whose three vertices are A(0, 3), O(0, 0) and B(5, 0). The length of its diagonal is",
    options: ["5", "3", "√34", "4"],
    answer: "√34",
    solutionSteps: ["The fourth vertex C = (5, 3).", "Diagonal OC (or AB) = √(5² + 3²) = √(25 + 9) = √34.", "All diagonals of a rectangle are equal."],
    finalAnswer: "√34 — option (C).",
    ncertRef: "Exemplar Ex 7.1 Q5", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Area of Triangle from Coordinates", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The area of a triangle with vertices A(3, 0), B(7, 0) and C(8, 4) is",
    options: ["14", "28", "8", "6"],
    answer: "8",
    solutionSteps: ["Δ = (1/2)|x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|.", "= (1/2)|3(0−4) + 7(4−0) + 8(0−0)| = (1/2)|−12 + 28 + 0| = (1/2)(16) = 8."],
    finalAnswer: "8 sq units — option (C).",
    ncertRef: "Exemplar Ex 7.1 Q7", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-007", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The points (−4, 0), (4, 0), (0, 3) are the vertices of a",
    options: ["right triangle", "isosceles triangle", "equilateral triangle", "scalene triangle"],
    answer: "isosceles triangle",
    solutionSteps: ["AB = √[(4−(−4))² + 0] = 8. AC = √[(0+4)² + (3−0)²] = √(16+9) = 5. BC = √[(0−4)² + (3−0)²] = √(16+9) = 5.", "AC = BC = 5 but AB = 8 ≠ AC. Two sides equal → isosceles, not equilateral.", "Check Pythagoras: AC² + BC² = 25 + 25 = 50 ≠ 64 = AB² → not right-angled."],
    finalAnswer: "Isosceles triangle — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q8", isCompetencyBased: true,
    strategyHint: "Compute all 3 sides, then check both 'two-equal' and 'Pythagoras' conditions." },

  { id: "CG-N-EXMPLR-7-EX-008", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The point which divides the line segment joining (7, −6) and (3, 4) in ratio 1 : 2 internally lies in the",
    options: ["I quadrant", "II quadrant", "III quadrant", "IV quadrant"],
    answer: "IV quadrant",
    solutionSteps: ["By section formula, x = (1·3 + 2·7)/(1+2) = 17/3, y = (1·4 + 2·(−6))/3 = −8/3.", "Point ≈ (5.67, −2.67) → x > 0, y < 0 → IV quadrant."],
    finalAnswer: "IV quadrant — option (D).",
    ncertRef: "Exemplar Ex 7.1 Q9", isCompetencyBased: true,
    strategyHint: "Quadrant: (+,+)=I, (−,+)=II, (−,−)=III, (+,−)=IV." },

  { id: "CG-N-EXMPLR-7-EX-009", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Midpoint Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The point which lies on the perpendicular bisector of the line segment joining the points A(−2, −5) and B(2, 5) is",
    options: ["(0, 0)", "(0, 2)", "(2, 0)", "(−2, 0)"],
    answer: "(0, 0)",
    solutionSteps: ["The perpendicular bisector of AB passes through the midpoint of AB.", "Midpoint = ((−2+2)/2, (−5+5)/2) = (0, 0).", "Hence (0, 0) lies on the perpendicular bisector."],
    finalAnswer: "(0, 0) — option (A).",
    ncertRef: "Exemplar Ex 7.1 Q10", isCompetencyBased: false },

  { id: "CG-N-EXMPLR-7-EX-010", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Midpoint Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The fourth vertex D of a parallelogram ABCD whose three vertices are A(−2, 3), B(6, 7) and C(8, 3) is",
    options: ["(0, 1)", "(0, −1)", "(−1, 0)", "(1, 0)"],
    answer: "(0, −1)",
    solutionSteps: ["Diagonals of a parallelogram bisect each other ⇒ mid(AC) = mid(BD).", "Mid(AC) = ((−2+8)/2, (3+3)/2) = (3, 3).", "Let D = (x, y). Mid(BD) = ((6+x)/2, (7+y)/2) = (3, 3).", "Solve: 6 + x = 6 → x = 0; 7 + y = 6 → y = −1.", "D = (0, −1)."],
    finalAnswer: "(0, −1) — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q11", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-011", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the distance between the points (4, p) and (1, 0) is 5, then the value of p is",
    options: ["4 only", "± 4", "−4 only", "0"],
    answer: "± 4",
    solutionSteps: ["d² = (4 − 1)² + (p − 0)² = 9 + p². Set = 25 → p² = 16 → p = ±4."],
    finalAnswer: "± 4 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q19", isCompetencyBased: true,
    strategyHint: "p² = k yields two roots ±√k unless additional constraints are given." },

  { id: "CG-N-EXMPLR-7-EX-012", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Collinearity", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the points A(1, 2), O(0, 0) and C(a, b) are collinear, then",
    options: ["a = b", "a = 2b", "2a = b", "a = −b"],
    answer: "2a = b",
    solutionSteps: ["Collinearity ⇒ area of △AOC = 0.", "(1/2)|1(0 − b) + 0(b − 2) + a(2 − 0)| = 0 ⇒ −b + 2a = 0 ⇒ 2a = b."],
    finalAnswer: "2a = b — option (C).",
    ncertRef: "Exemplar Ex 7.1 Q20", isCompetencyBased: true,
    strategyHint: "Collinearity ⇔ area = 0; expand the determinant and simplify." },

  // ===== Exercise 7.2 — Reasoning (True/False) =====
  { id: "CG-N-EXMPLR-7-EX-013", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Collinearity", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State whether the following statement is true or false, justifying your answer: The points (0, 5), (0, −9) and (3, 6) are collinear.",
    answer: "False. Two of the points (0, 5) and (0, −9) lie on the y-axis (x = 0), but the third point (3, 6) has x = 3 ≠ 0. So the three points cannot lie on the same line (which would have to be the y-axis). Confirm via area: (1/2)|0((−9) − 6) + 0(6 − 5) + 3(5 − (−9))| = (1/2)|0 + 0 + 42| = 21 ≠ 0. Not collinear.",
    solutionSteps: ["Points (0, 5) and (0, −9) both have x = 0 → they lie on the y-axis.", "Point (3, 6) has x = 3 ≠ 0 → it is NOT on the y-axis.", "Hence the three points cannot be collinear.", "Verify by area: (1/2)|0(−9−6) + 0(6−5) + 3(5+9)| = (1/2)(42) = 21 ≠ 0."],
    finalAnswer: "False — area of triangle = 21 ≠ 0.",
    ncertRef: "Exemplar Ex 7.2 Q3", isCompetencyBased: true,
    strategyHint: "Two points sharing an axis but third not → automatic non-collinearity." },

  { id: "CG-N-EXMPLR-7-EX-014", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State whether the following statement is true or false, justifying your answer: A circle has its centre at the origin and a point P(5, 0) lies on it. The point Q(6, 8) lies outside the circle.",
    answer: "True. Radius = OP = √(5² + 0²) = 5. Distance OQ = √(6² + 8²) = √(36 + 64) = √100 = 10. Since OQ = 10 > 5 = radius, the point Q lies OUTSIDE the circle.",
    solutionSteps: ["Radius = distance from centre (origin) to P(5, 0) = 5.", "Compute OQ = √(6² + 8²) = √100 = 10.", "OQ = 10 > 5 = r → Q lies outside the circle."],
    finalAnswer: "True — OQ = 10 > radius 5.",
    ncertRef: "Exemplar Ex 7.2 Q7", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-015", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State whether the following statement is true or false, justifying your answer: Point P(5, −3) is one of the two points of trisection of the line segment joining the points A(7, −2) and B(1, −5).",
    answer: "True. Trisection points divide AB in ratios 1:2 and 2:1. Point dividing in ratio 1:2: ((1·1 + 2·7)/3, (1·(−5) + 2·(−2))/3) = (15/3, −9/3) = (5, −3). This matches P(5, −3) exactly. Hence P is the trisection point nearer to A.",
    solutionSteps: ["The trisection point closer to A divides AB in 1:2.", "P = ((1·1 + 2·7)/3, (1·(−5) + 2·(−2))/3) = ((1+14)/3, (−5−4)/3) = (5, −3).", "This equals the given P(5, −3) → statement is true."],
    finalAnswer: "True — P divides AB in ratio 1 : 2.",
    ncertRef: "Exemplar Ex 7.2 Q9", isCompetencyBased: true },

  // ===== Exercise 7.3 — Short Answer =====
  { id: "CG-N-EXMPLR-7-EX-016", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the points on the x-axis which are at a distance of 2√5 from the point (7, −4). How many such points are there?",
    answer: "Let the point on x-axis be P(x, 0). Then PA² = (2√5)² = 20 where A = (7, −4). (x − 7)² + (0 − (−4))² = 20 ⇒ (x − 7)² + 16 = 20 ⇒ (x − 7)² = 4 ⇒ x − 7 = ±2 ⇒ x = 9 or x = 5. There are TWO such points: (9, 0) and (5, 0).",
    solutionSteps: ["Point on x-axis = P(x, 0). PA = 2√5 ⇒ PA² = 20.", "(x − 7)² + (0 + 4)² = 20.", "(x − 7)² + 16 = 20 → (x − 7)² = 4 → x − 7 = ±2.", "x = 9 or x = 5. Two points: (9, 0) and (5, 0)."],
    finalAnswer: "(9, 0) and (5, 0) — two points.",
    ncertRef: "Exemplar Ex 7.3 Q2", isCompetencyBased: true,
    strategyHint: "Square both sides, get a quadratic in x → typically two solutions." },

  { id: "CG-N-EXMPLR-7-EX-017", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the value of a if the distance between the points A(−3, −14) and B(a, −5) is 9 units.",
    answer: "AB² = (a − (−3))² + (−5 − (−14))² = (a + 3)² + 81. Given AB = 9 ⇒ AB² = 81. So (a + 3)² + 81 = 81 ⇒ (a + 3)² = 0 ⇒ a + 3 = 0 ⇒ a = −3.",
    solutionSteps: ["AB² = (a + 3)² + (−5 + 14)² = (a + 3)² + 81.", "Given AB = 9 ⇒ AB² = 81 → (a + 3)² = 0.", "a + 3 = 0 → a = −3."],
    finalAnswer: "a = −3.",
    ncertRef: "Exemplar Ex 7.3 Q4", isCompetencyBased: false },

  { id: "CG-N-EXMPLR-7-EX-018", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Collinearity", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the value of m if the points (5, 1), (−2, −3) and (8, 2m) are collinear.",
    answer: "Collinearity ⇒ area = 0. (1/2)|5(−3 − 2m) + (−2)(2m − 1) + 8(1 − (−3))| = 0. Expand: 5(−3 − 2m) + (−2)(2m − 1) + 8(4) = −15 − 10m − 4m + 2 + 32 = −14m + 19 = 0 ⇒ m = 19/14.",
    solutionSteps: ["Collinearity ⇒ x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂) = 0.", "5(−3 − 2m) + (−2)(2m − 1) + 8(1 + 3) = 0.", "−15 − 10m − 4m + 2 + 32 = 0 → −14m + 19 = 0.", "m = 19/14."],
    finalAnswer: "m = 19/14.",
    ncertRef: "Exemplar Ex 7.3 Q7", isCompetencyBased: true },

  { id: "CG-N-EXMPLR-7-EX-019", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Area of Triangle from Coordinates", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the area of the triangle whose vertices are (−8, 4), (−6, 6) and (−3, 9).",
    answer: "Area = (1/2)|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = (1/2)|(−8)(6 − 9) + (−6)(9 − 4) + (−3)(4 − 6)| = (1/2)|(−8)(−3) + (−6)(5) + (−3)(−2)| = (1/2)|24 − 30 + 6| = (1/2)(0) = 0. Area = 0 → the three points are COLLINEAR; no triangle is actually formed.",
    solutionSteps: ["Δ = (1/2)|(−8)(6 − 9) + (−6)(9 − 4) + (−3)(4 − 6)|.", "= (1/2)|24 − 30 + 6| = (1/2)(0) = 0.", "Area = 0 ⇒ the three points are collinear → no triangle."],
    finalAnswer: "0 sq units — the points are collinear.",
    ncertRef: "Exemplar Ex 7.3 Q9", isCompetencyBased: true,
    strategyHint: "If area-formula yields 0, the 'triangle' is actually collinear points." },

  { id: "CG-N-EXMPLR-7-EX-020", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In what ratio does the x-axis divide the line segment joining the points (−4, −6) and (−1, 7)? Find the coordinates of the point of division.",
    answer: "Let the x-axis divide the segment in ratio k : 1. y-coord by section formula: y = (7k + (−6))/(k+1). On x-axis y = 0 ⇒ 7k − 6 = 0 ⇒ k = 6/7. Ratio = 6 : 7. x-coord: x = ((−1)(6) + (−4)(7))/(6+7) = (−6 − 28)/13 = −34/13. Point of division: (−34/13, 0).",
    solutionSteps: ["Let ratio = k : 1. y = (7k − 6)/(k+1).", "x-axis ⇒ y = 0 → 7k = 6 → k = 6/7.", "Ratio = 6 : 7.", "x = (6(−1) + 7(−4))/(6+7) = (−6 − 28)/13 = −34/13.", "Point: (−34/13, 0)."],
    finalAnswer: "Ratio 6 : 7; point (−34/13, 0).",
    ncertRef: "Exemplar Ex 7.3 Q10", isCompetencyBased: true },

  // ===== Exercise 7.4 — Long Answer =====
  { id: "CG-N-EXMPLR-7-EX-021", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Area of Triangle from Coordinates", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A(6, 1), B(8, 2) and C(9, 4) are three vertices of a parallelogram ABCD. If E is the midpoint of DC, find the area of △ADE.",
    answer: "Step 1 — Find D. Diagonals of parallelogram ABCD bisect each other: mid(AC) = mid(BD). Mid(AC) = ((6+9)/2, (1+4)/2) = (15/2, 5/2). Let D(x, y). Mid(BD) = ((8+x)/2, (2+y)/2) = (15/2, 5/2). Solve: 8 + x = 15 → x = 7; 2 + y = 5 → y = 3. So D = (7, 3). Step 2 — Find E = midpoint of DC. E = ((7+9)/2, (3+4)/2) = (8, 7/2). Step 3 — Area of △ADE with A(6, 1), D(7, 3), E(8, 7/2): (1/2)|6(3 − 7/2) + 7(7/2 − 1) + 8(1 − 3)| = (1/2)|6(−1/2) + 7(5/2) + 8(−2)| = (1/2)|−3 + 35/2 − 16| = (1/2)|−6/2 + 35/2 − 32/2| = (1/2)|−3/2| = 3/4 sq units.",
    solutionSteps: ["Diagonals bisect: mid(AC) = mid(BD).", "Mid(AC) = (15/2, 5/2). Let D = (x, y): (8+x)/2 = 15/2 → x = 7; (2+y)/2 = 5/2 → y = 3. So D = (7, 3).", "E = mid(DC) = ((7+9)/2, (3+4)/2) = (8, 7/2).", "Area(△ADE) = (1/2)|6(3 − 7/2) + 7(7/2 − 1) + 8(1 − 3)|.", "= (1/2)|−3 + 35/2 − 16| = (1/2)|−3/2| = 3/4 sq units."],
    finalAnswer: "Area(△ADE) = 3/4 sq units.",
    ncertRef: "Exemplar Ex 7.4 Q2", isCompetencyBased: true,
    strategyHint: "Get the missing vertex via 'diagonals bisect', then apply area formula." },

  { id: "CG-N-EXMPLR-7-EX-022", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If (−4, 3) and (4, 3) are two vertices of an equilateral triangle, find the coordinates of the third vertex, given that the origin lies in the interior of the triangle.",
    answer: "Let A(−4, 3), B(4, 3), and C(x, y) be the third vertex. AB = √[(4 − (−4))² + 0²] = 8. For an equilateral triangle, AC = BC = AB = 8. AC² = (x + 4)² + (y − 3)² = 64 … (i). BC² = (x − 4)² + (y − 3)² = 64 … (ii). Subtract (ii) from (i): (x + 4)² − (x − 4)² = 0 ⇒ 16x = 0 ⇒ x = 0. Substitute in (i): 16 + (y − 3)² = 64 ⇒ (y − 3)² = 48 ⇒ y − 3 = ±4√3 ⇒ y = 3 + 4√3 or y = 3 − 4√3. The origin (0, 0) must lie INSIDE the triangle. Since AB is at y = 3 (above the x-axis), the third vertex must be BELOW the segment AB to contain the origin; i.e., y < 3 ⇒ y = 3 − 4√3 (≈ 3 − 6.93 = −3.93). Third vertex: C = (0, 3 − 4√3).",
    solutionSteps: ["Side AB = 8 (both endpoints have y = 3).", "Let C(x, y). For equilateral: AC = BC = 8.", "AC² = BC² gives (x+4)² = (x−4)² → 16x = 0 → x = 0 (C lies on perpendicular bisector of AB).", "Substitute x = 0 in AC² = 64: 16 + (y−3)² = 64 → (y−3)² = 48 → y = 3 ± 4√3.", "AB lies on the line y = 3. For origin to be interior, C must be BELOW AB → y < 3 → y = 3 − 4√3.", "Therefore C = (0, 3 − 4√3)."],
    finalAnswer: "C = (0, 3 − 4√3).",
    ncertRef: "Exemplar Ex 7.4 Q1", isCompetencyBased: true,
    strategyHint: "Third vertex of equilateral lies on perpendicular bisector; pick the side that contains the required interior point." },

  // ===== Case-Based =====
  { id: "CG-N-EXMPLR-7-EX-023", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Ayush starts walking from his house to office. Instead of going to the office directly, he goes to a bank first, from there to his daughter's school and then reaches the office. House is at H(2, 4), bank at K(5, 8), school at S(13, 14) and office at O(13, 26). All coordinates are in km. (i) Find HK and KS and SO. (ii) Find the direct distance HO from house to office. (iii) What is the extra distance Ayush travels compared to going directly?",
    answer: "(i) HK = √[(5 − 2)² + (8 − 4)²] = √(9 + 16) = √25 = 5 km. KS = √[(13 − 5)² + (14 − 8)²] = √(64 + 36) = √100 = 10 km. SO = √[(13 − 13)² + (26 − 14)²] = √(0 + 144) = 12 km. (ii) Direct HO = √[(13 − 2)² + (26 − 4)²] = √(121 + 484) = √605 = √(121 · 5) = 11√5 km ≈ 24.6 km. (iii) Total distance via bank and school = 5 + 10 + 12 = 27 km. Extra distance = 27 − 11√5 ≈ 27 − 24.6 = 2.4 km (exactly 27 − 11√5 km).",
    solutionSteps: ["HK = √[(5−2)² + (8−4)²] = √(9 + 16) = 5 km.", "KS = √[(13−5)² + (14−8)²] = √(64 + 36) = 10 km.", "SO = √[0 + (26−14)²] = 12 km. Total path = 5 + 10 + 12 = 27 km.", "Direct HO = √[11² + 22²] = √(121 + 484) = √605 = 11√5 km ≈ 24.6 km.", "Extra distance = 27 − 11√5 km ≈ 2.4 km."],
    finalAnswer: "(i) HK=5, KS=10, SO=12 km. (ii) HO = 11√5 km. (iii) Extra = (27 − 11√5) km ≈ 2.4 km.",
    ncertRef: "Exemplar Ex 7.4 Q6", isCompetencyBased: true,
    strategyHint: "Apply distance formula to each leg, then compare path-sum with direct distance." },

  // ===== Assertion-Reasoning =====
  { id: "CG-N-EXMPLR-7-EX-024", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Midpoint Formula", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The midpoint of the line segment joining A(−2, 8) and B(−6, −4) is (−4, 2).\nReason (R): The midpoint of a segment joining (x₁, y₁) and (x₂, y₂) is ((x₁ + x₂)/2, (y₁ + y₂)/2).",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Reason R states the standard midpoint formula — true.", "Apply R to A(−2, 8) and B(−6, −4): ((−2 + (−6))/2, (8 + (−4))/2) = (−8/2, 4/2) = (−4, 2). So A is true.", "R is exactly the formula used to derive A → R is the correct explanation of A.", "Hence option (A)."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Sample Q2 (MCQ)", isCompetencyBased: true,
    strategyHint: "Compute the midpoint using R; if it matches A and R justifies it → (A)." },

  { id: "CG-N-EXMPLR-7-EX-025", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Collinearity", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The points (4, 5), (7, 6) and (6, 3) are not collinear.\nReason (R): Three points are collinear if and only if the area of the triangle formed by them is zero.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["R is a standard true result.", "Test A using area: (1/2)|4(6 − 3) + 7(3 − 5) + 6(5 − 6)| = (1/2)|12 − 14 − 6| = (1/2)(8) = 4 ≠ 0.", "Since area = 4 ≠ 0, the points are NOT collinear → A is true.", "R is the criterion that directly justifies A.", "Hence option (A)."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Sample Q2 (SA Reasoning)", isCompetencyBased: true,
    strategyHint: "Compute area; non-zero area = non-collinear." },
];
