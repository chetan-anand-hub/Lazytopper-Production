import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "pair-of-linear-equations"
// Extraction date: 2026-05-24

export const PAIR_OF_LINEAR_EQUATIONS_APQ: CanonicalQuestion[] = [
  // PQ1 Q2 (Section A, MCQ, 1 mark) — REQUIRES-FIGURE
  { id: "APQ-M-PLE-001", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Equation from Graph", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The lines k1, k2 and k3 represent three different equations as shown in the graph. The solution of the equations represented by the lines k1 and k3 is x = 3 and y = 0 while the solution of the equations represented by the lines k2 and k3 is x = 4 and y = 1. Which of these is the equation of the line k3?",
    options: ["x − y = 3", "x − y = −3", "x + y = 3", "x + y = 1"],
    answer: "x − y = 3",
    solutionSteps: ["Both (3, 0) and (4, 1) lie on line k3. Check each option: x − y = 3 gives 3 − 0 = 3 ✓ and 4 − 1 = 3 ✓. Both points satisfy."],
    finalAnswer: "(a) x − y = 3",
    ncertRef: "APQ PQ1 Q2", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: graph of three lines k1, k2, k3 with intersection points marked." },

  // PQ2 Q3 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PLE-002", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Consistency from Coefficients", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Graphically, the pair of equations 6x − 3y + 10 = 0 and 2x − y + 9 = 0 represents two lines which are",
    options: ["intersecting at exactly one point", "intersecting at exactly two points", "coincident", "parallel"],
    answer: "parallel",
    solutionSteps: ["Compare ratios: a1/a2 = 6/2 = 3, b1/b2 = −3/−1 = 3, c1/c2 = 10/9.", "a1/a2 = b1/b2 ≠ c1/c2 ⟹ lines are parallel."],
    finalAnswer: "(d) parallel",
    ncertRef: "APQ PQ2 Q3", isCompetencyBased: false },

  // PQ2 Q16 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PLE-003", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Consistency Conditions", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Two linear equations in variables x and y are given below: a1·x + b1·y + c = 0 and a2·x + b2·y + c = 0. Which of the following pieces of information is independently sufficient to determine if a solution exists or not for this pair of linear equations? I. a1/b1 = a2/b2 = 1   II. a1/a2 = b1/b2   III. a1/a2 = a1/b1 ≠ 1   IV. a1/a2 ≠ b1/b2",
    options: ["IV only", "I and IV", "II and IV", "I and III"],
    answer: "I and IV",
    solutionSteps: ["IV alone: a1/a2 ≠ b1/b2 ⟹ unique solution exists (intersecting lines). Sufficient.", "I alone: a1/b1 = a2/b2 = 1 ⟹ a1 = b1 and a2 = b2, with same c. Lines coincident — infinitely many solutions. Sufficient.", "II alone: a1/a2 = b1/b2 means lines could be coincident or parallel — cannot decide. III gives partial info but not sufficient."],
    finalAnswer: "(b) I and IV",
    ncertRef: "APQ PQ2 Q16", isCompetencyBased: true },

  // PQ1 Q22 (Section B, Short, 2 marks)
  { id: "APQ-M-PLE-004", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Word Problem — Two Variables", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Kimaya and Heena started walking from the point P at the same moment in opposite directions on a 800 m long circular path. Kimaya walked to the club house at an average speed of 100 m/min and Heena walked to the badminton court at an average speed of 80 m/min. The length of the circular track between the clubhouse and the badminton court is 180 m. If Heena took 1 minute more than Kimaya to reach her destination, find the time taken by Heena to reach the badminton court.",
    answer: "Heena took 4 minutes.",
    solutionSteps: ["Let Kimaya's time = t1, Heena's time = t2. Given t2 − t1 = 1. Distances: x = 100·t1 (Kimaya), y = 80·t2 (Heena). Combined non-overlap path = 800 − 180 = 620 m, so x + y = 620.", "Substitute: 100·t1 + 80·t2 = 620. Use t1 = t2 − 1: 100(t2 − 1) + 80·t2 = 620 ⟹ 180·t2 = 720 ⟹ t2 = 4 minutes."],
    finalAnswer: "Heena took 4 minutes.",
    ncertRef: "APQ PQ1 Q22", isCompetencyBased: true },

  // PQ1 Q28 (Section C, Short, 3 marks)
  { id: "APQ-M-PLE-005", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Conditions for Solution Existence", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Given below is a pair of linear equations: 2x − my = 9 and 4x − ny = 9. Find at least one pair of the possible values of m and n, if exists, for which the above pair of linear equations has: (i) a unique solution (ii) infinitely many solutions (iii) no solution. OR (6, 0) and (0, 2) are two of the points of intersections of two lines represented by a pair of linear equations. (i) How many points of intersections does the pair of linear equations have in total? (ii) Find the equation that represents one of the lines.",
    answer: "(i) m=2, n=6 (any pair with m/n ≠ 1/2). (ii) Not feasible — same c. (iii) m=3, n=6. [OR] (i) infinitely many; (ii) x + 3y = 6.",
    solutionSteps: ["(i) Unique solution: a1/a2 ≠ b1/b2 ⟹ 2/4 ≠ m/n ⟹ m/n ≠ 1/2. E.g., m=2, n=6 gives equations 2x − 2y = 9, 4x − 6y = 9.", "(ii) Infinitely many solutions: a1/a2 = b1/b2 = c1/c2 ⟹ 2/4 = m/n = 9/9 = 1. But 1/2 ≠ 1 — required condition can never be satisfied. Not feasible.", "(iii) No solution: a1/a2 = b1/b2 ≠ c1/c2 ⟹ 2/4 = m/n ≠ 9/9 ⟹ m/n = 1/2 with m/n ≠ 1. E.g. m=3, n=6 gives 2x − 3y = 9, 4x − 6y = 9.", "[OR Part i] Two distinct points lie on both lines ⟹ lines are coincident — infinitely many points of intersection. [OR Part ii] Line through (6, 0) and (0, 2): 6a + 0 = c ⟹ a = c/6; 0 + 2b = c ⟹ b = c/2. So (c/6)x + (c/2)y = c, take c=6: x + 3y = 6."],
    finalAnswer: "See solutionSteps for all parts.",
    ncertRef: "APQ PQ1 Q28", isCompetencyBased: true },

  // PQ2 Q27 (Section C, Short, 3 marks)
  { id: "APQ-M-PLE-006", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Word Problem — Rectangle", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The area of a rectangle reduces by 160 m^2 if its length is increased by 5 m and breadth is reduced by 4 m. However, if the length is decreased by 10 m and breadth is increased by 2 m, then its area is decreased by 100 m^2. Find the dimensions of the rectangle. OR If 16 is subtracted from twice the greater of two positive numbers, the result is half the other number. If 1 is subtracted from half the greater number, the result is still half the other number. Find the two numbers.",
    answer: "Length = 60 m, Breadth = 20 m. [OR] Numbers are 10 and 8.",
    solutionSteps: ["Let length = x m and breadth = y m. From conditions: (x + 5)(y − 4) = xy − 160 and (x − 10)(y + 2) = xy − 100.", "Simplify: 4x − 5y = 140 and 2x − 10y = −80.", "Solve simultaneously: x = 60, y = 20. So length = 60 m, breadth = 20 m.", "[OR] Let numbers be x and y with x > y. From conditions: 2x − 16 = y/2 ⟹ 4x − y = 32. Also x/2 − 1 = y/2 ⟹ x − y = 2. Solving: x = 10, y = 8."],
    finalAnswer: "Length = 60 m, breadth = 20 m. [OR] Numbers: 10 and 8.",
    ncertRef: "APQ PQ2 Q27", isCompetencyBased: true },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q2 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PLE-007", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Consistency — Infinitely Many Solutions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a pair of linear equations: mx + 4y − 6 = 0 and ny − 12x + 12 = 0. For which of the following values of m and n do the above equations have infinitely many solutions?",
    options: ["m = -1 and n = 2", "m = -1 and n = 3", "m = 6 and n = -8", "m = 6 and n = -2"],
    answer: "m = 6 and n = -8",
    solutionSteps: ["Infinite solutions: a1/a2 = b1/b2 = c1/c2.", "Rewriting: m·x + 4y − 6 = 0 and −12·x + n·y + 12 = 0. Ratios: m/−12 = 4/n = −6/12 = −1/2.", "From 4/n = −1/2: n = −8. From m/−12 = −1/2: m = 6. Check: m = 6, n = −8."],
    finalAnswer: "(c) m = 6 and n = -8",
    ncertRef: "APQ PQ_2022 Q2", isCompetencyBased: true },

  // PQ_2022 Q21 (Section B, Short, 2 marks)
  { id: "APQ-M-PLE-008", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Common Point of Three Lines", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Check whether the three lines represented by the equations given below intersect at a common point. 2x + y - 1 = 0, 4x + 3y + 5 = 0, 5x + 4y + 8 = 0. Show your work.",
    answer: "Yes — all three lines intersect at (4, −7).",
    solutionSteps: ["Solve first two: 2x + y = 1 and 4x + 3y = −5. From first: y = 1 − 2x. Substitute: 4x + 3(1 − 2x) = −5 ⟹ 4x + 3 − 6x = −5 ⟹ −2x = −8 ⟹ x = 4, y = −7.", "Verify in third: 5(4) + 4(−7) + 8 = 20 − 28 + 8 = 0 ✓. All three lines pass through (4, −7)."],
    finalAnswer: "Yes — all three lines intersect at the common point (4, −7).",
    ncertRef: "APQ PQ_2022 Q21", isCompetencyBased: true },

  // PQ_2022 Q28 first variant (Section C, Short, 3 marks)
  { id: "APQ-M-PLE-009", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Line from Graph + Point of Intersection", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The graph of a line represented by the equation ax + y + 8 = 0 is shown in the figure. (i) Find the value of a. (ii) Find the point of intersection of this line with the line represented by the equation 4x − 3y − 14 = 0. Show your work.",
    answer: "(i) a = −2. (ii) Point of intersection (5, 2).",
    solutionSteps: ["(i) From the graph, the line passes through (e.g.) (4, 0). Substituting: 4a + 0 + 8 = 0 ⟹ a = −2.", "(ii) Equations: −2x + y + 8 = 0, i.e., y = 2x − 8; and 4x − 3y − 14 = 0. Substitute y: 4x − 3(2x − 8) − 14 = 0 ⟹ 4x − 6x + 24 − 14 = 0 ⟹ −2x = −10 ⟹ x = 5. y = 2(5) − 8 = 2.", "Point of intersection: (5, 2)."],
    finalAnswer: "(i) a = −2; (ii) (5, 2).",
    ncertRef: "APQ PQ_2022 Q28 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: graph showing the line ax + y + 8 = 0." },

  // PQ_2022 Q28 OR variant (Section C, Short, 3 marks)
  { id: "APQ-M-PLE-010", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Word Problem — Combo Prices", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Anuj and Safina started a new game zone consisting of two games — shooting and bowling. They released the following rate card: Solo 1 (bowling 1 round) = Rs 60; Solo 2 (shooting 1 round) = Rs 75; Combo 1 (3 shooting + 2 bowling) = Rs 285; Combo 2 (4 shooting + 5 bowling) = Rs 485. The price of shooting is same in both combos; price of bowling is same in both combos. How much more is the price for one round of bowling in the solo pack than in the combo packs?",
    answer: "Rs 15 more in solo pack than combo pack.",
    solutionSteps: ["Let combo shooting = x, combo bowling = y. From combos: 3x + 2y = 285 and 4x + 5y = 485.", "Solve: Multiply first by 5, second by 2: 15x + 10y = 1425, 8x + 10y = 970. Subtract: 7x = 455 ⟹ x = 65. Then y = (285 − 195)/2 = 45.", "Solo bowling = Rs 60; combo bowling = Rs 45. Difference = 60 − 45 = Rs 15."],
    finalAnswer: "Rs 15 more in solo pack.",
    ncertRef: "APQ PQ_2022 Q28 (OR variant)", isCompetencyBased: true },
];
