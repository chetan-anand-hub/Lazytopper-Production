import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "coordinate-geometry"
// Extraction date: 2026-05-24

export const COORDINATE_GEOMETRY_APQ: CanonicalQuestion[] = [
  // PQ1 Q4 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CG-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The coordinates of the centre of the circle, O, and a point on the circle, N, are shown in the figure. What is the radius of the circle?",
    options: ["√0.4 units", "2 units", "4 units", "√42.4 units"],
    answer: "2 units",
    solutionSteps: ["Radius = distance from centre to point on circle, computed via distance formula on the coordinates shown in the figure.", "Per MS: radius = 2 units."],
    finalAnswer: "(b) 2 units",
    ncertRef: "APQ PQ1 Q4", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: coordinates of O and N from PDF." },

  // PQ1 Q20 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-M-CG-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Equidistant Points — Locus", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "P(−2, 5) and Q(2, −1) are two points on the coordinate plane. Assertion (A): The midpoint (0, 2) is the only point equidistant from P and Q. Reason (R): There are many points (x, y) where (x + 2)^2 + (y − 5)^2 = (x − 2)^2 + (y + 1)^2 are equidistant from P and Q.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation for (A).",
      "Both (A) and (R) are true and (R) is not the correct explanation for (A).",
      "(A) is true but (R) is false.",
      "(A) is false but (R) is true."
    ],
    answer: "(A) is false but (R) is true.",
    solutionSteps: ["Set of all points equidistant from P and Q is the perpendicular bisector of PQ — an entire line, not a single point. So A is FALSE.", "The equation (x+2)^2 + (y−5)^2 = (x−2)^2 + (y+1)^2 simplifies to 2x − 3y + 6 = 0, the perpendicular-bisector line. Many (x, y) satisfy it. R is TRUE."],
    finalAnswer: "(d) (A) is false but (R) is true.",
    ncertRef: "APQ PQ1 Q20", isCompetencyBased: true },

  // PQ2 Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CG-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The distance between two points A and B, on a graph is given as √(10^2 + 7^2). The coordinates of A are (−4, 3). Given that the point B lies in the first quadrant, then all the possible x-coordinates of point B are",
    options: ["multiple of 2", "multiple of 3", "multiple of 5", "multiple of 6"],
    answer: "multiple of 3",
    solutionSteps: ["AB^2 = 10^2 + 7^2 = 149. For B = (x, y) in first quadrant, (x − (−4))^2 + (y − 3)^2 = 149.", "Testing integer solutions with x > 0, y > 0: pairs like (x+4, y−3) summing of squares to 149. Per MS, the valid x-values are multiples of 3."],
    finalAnswer: "(b) multiple of 3",
    ncertRef: "APQ PQ2 Q14", isCompetencyBased: true },

  // PQ2 Q15 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CG-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Parallelogram — Fourth Vertex", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If A(1, 2), B(4, 3) and C(6, 6) are the three vertices of a parallelogram ABCD, then the coordinates of the fourth vertex D are",
    options: ["(1/2, 4)", "(7/2, 5)", "(3, 4)", "(3, 5)"],
    answer: "(3, 5)",
    solutionSteps: ["In parallelogram ABCD, diagonals AC and BD bisect each other.", "Midpoint of AC = ((1 + 6)/2, (2 + 6)/2) = (7/2, 4). This is also midpoint of BD.", "Let D = (x, y). (4 + x)/2 = 7/2 ⟹ x = 3. (3 + y)/2 = 4 ⟹ y = 5. D = (3, 5)."],
    finalAnswer: "(d) (3, 5)",
    ncertRef: "APQ PQ2 Q15", isCompetencyBased: true },

  // PQ1 Q37 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-CG-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula — Real-world", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In the game of archery, a bow is used to shoot arrows at a target board divided into 4 concentric circular sections on a coordinate grid. (i) After shooting two arrows, Rohan scored 25 points. Write one set of coordinates for each arrow that landed on the target. (ii) If one player's arrow lands on (2, 2.5), how many points will be awarded? (iii) One of Rohan's arrow landed on (1.2, 1.6). He wants his second arrow to land on the line joining the origin and first arrow such that he gets 10 points for it. Find one possible pair of coordinates of the second arrow. OR (iii) An arrow landed on the boundary and is worth 20 points. The coordinates were of the form (m, −m). Find all such coordinates.",
    answer: "(i) e.g. (1.5, 0) [20 pts] and (3.5, 0) [5 pts]. (ii) 5 points. (iii) (1.8, 2.4). [OR] (√2, −√2) and (−√2, √2).",
    solutionSteps: ["(i) Need two arrows summing to 25 — e.g. 20+5, so two coords inside radii consistent. Example: (1.5, 0) and (3.5, 0).", "(ii) Distance from origin = √(4 + 6.25) = √10.25 ≈ 3.2 units — falls in 5-point ring.", "(iii) First arrow distance from origin: √(1.44 + 2.56) = √4 = 2. For 10 points the second arrow must lie on boundary at radius 3, on the same line through origin and (1.2, 1.6). Using section formula with ratio 2:1: (x, y) such that (2x/3, 2y/3) = (1.2, 1.6) ⟹ x = 1.8, y = 2.4.", "[OR] Distance from origin to (m, −m) = √(2m^2) = 2 (boundary radius for 20 pts) ⟹ 2m^2 = 4 ⟹ m = ±√2. Coordinates: (√2, −√2) and (−√2, √2)."],
    finalAnswer: "(i) sample (1.5, 0), (3.5, 0); (ii) 5 pts; (iii) (1.8, 2.4) [or] (±√2, ∓√2).",
    ncertRef: "APQ PQ1 Q37", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: target board with 4 concentric circles and point values." },

  // PQ2 Q38 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-CG-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Centroid, Triangle Type, Area, Section Formula", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Students of Class X are allotted a rectangular plot for gardening. Saplings are planted on the boundary 1 m apart. A triangular grassy lawn PQR is on the plot. (i) If a tree is planted at the centroid of ΔPQR, find its coordinates. (ii) What type of triangle is formed by the grassy lawn? (iii) Find the area of the plot in which the students have to sow seeds. OR (iii) If a special flowering plant is planted at the point dividing CQ in the ratio 2:3, find the coordinates.",
    answer: "(i) (17/3, 10/3). (ii) Isosceles right triangle. (iii) 110.5 m^2. [OR] (11, 31/5).",
    solutionSteps: ["From figure: P(3, 3), Q(8, 2), R(6, 5). (i) Centroid = ((3+8+6)/3, (3+2+5)/3) = (17/3, 10/3).", "(ii) Compute sides: PR = √(9+4) = √13; QR = √(4+9) = √13; PQ = √(25+1) = √26. PR = QR and PR^2 + QR^2 = 13 + 13 = 26 = PQ^2 ⟹ isosceles right triangle.", "(iii) Plot 13 × 9 = 117 m^2; ΔPQR area = ½ × √13 × √13 = 13/2 = 6.5 m^2. Sowing area = 117 − 6.5 = 110.5 m^2.", "[OR] With C(13, 9), Q(8, 2), section formula 2:3: ((2·8 + 3·13)/5, (2·2 + 3·9)/5) = (55/5, 31/5) = (11, 31/5)."],
    finalAnswer: "(i) (17/3, 10/3); (ii) isosceles right; (iii) 110.5 m^2 [or] (11, 31/5).",
    ncertRef: "APQ PQ2 Q38", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: rectangular plot with triangle PQR and labelled coordinates." },
];
