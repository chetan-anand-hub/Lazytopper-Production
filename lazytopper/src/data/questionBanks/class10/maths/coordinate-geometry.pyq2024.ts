import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "coordinate-geometry"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const COORDINATE_GEOMETRY_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-CG-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The perpendicular bisector of the line segment joining the points A(−1, 3) and B(2, 4) cuts the y-axis at:",
    options: ["(0, 5)", "(0, – 5)", "(0, 4)", "(0, – 4)"],
    answer: "(0, 5)",
    solutionSteps: ["A point (0, y) on the perpendicular bisector is equidistant from A and B: (0+1)² + (y−3)² = (0−2)² + (y−4)² ⇒ 1 + y² − 6y + 9 = 4 + y² − 8y + 16 ⇒ 2y = 10 ⇒ y = 5. Correct option: (a) (0, 5)."],
    finalAnswer: "(a) (0, 5)",
    ncertRef: "PYQ 30(B) Q7", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-CG-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Coordinates of Vertices", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The fourth vertex D of a parallelogram ABCD whose three vertices are A(– 2, 3), B(6, 7) and C(8, 3) is :",
    options: ["(0, 1)", "(0, – 1)", "(– 1, 0)", "(1, 0)"],
    answer: "(0, – 1)",
    solutionSteps: ["Correct option: (b) (0,-1)."],
    finalAnswer: "(b) (0,-1)",
    ncertRef: "PYQ 30/4/1 Q16", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-CG-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A) : Midpoint of a line segment divides the line segment in the ratio 1 : 1. Reason (R) : The ratio in which the point (– 3, k) divides the line segment joining the points (– 5, 4) and (– 2, 3) is 1 : 2.",
    options: ["Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).", "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).", "Assertion (A) is true but Reason (R) is false.", "Assertion (A) is false but Reason (R) is true."],
    answer: "Assertion (A) is true but Reason (R) is false.",
    solutionSteps: ["Correct option: (c) Assertion (A) is true but Reason (R) is false 1."],
    finalAnswer: "(c) Assertion (A) is true but Reason (R) is false 1",
    ncertRef: "PYQ 30/4/1 Q19", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-CG-004a", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the ratio in which the point P(– 4, 6) divides the line segment joining the points A(– 6, 10) and B(3, – 8).",
    answer: "P divides AB in the ratio 2 : 7.",
    solutionSteps: ["[1 mark] Let P divide AB in the ratio k : 1. By the section formula, x-coordinate of P = (3k − 6)/(k + 1) = −4.", "[1 mark] 3k − 6 = −4k − 4 ⇒ 7k = 2 ⇒ k = 2/7. Hence the required ratio is 2 : 7."],
    finalAnswer: "P divides AB in the ratio 2 : 7.",
    ncertRef: "PYQ 30/5/1 Q24(a)", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-CG-005a", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In what ratio does the x-axis divide the line segment joining the points (2, −3) and (5, 6)? Also, find the coordinates of the point of intersection.",
    answer: "Ratio 1 : 2; point of intersection (3, 0).",
    solutionSteps: ["[1 mark] Let the x-axis divide the segment in the ratio k : 1 at the point (x, 0). Then y-coordinate: (6k − 3)/(k + 1) = 0.", "[1 mark] 6k − 3 = 0 ⇒ k = 1/2, so the required ratio is 1 : 2.", "[1 mark] x = (1×5 + 2×2)/(1 + 2) = 9/3 = 3. The point of intersection is (3, 0)."],
    finalAnswer: "Ratio 1 : 2; point of intersection (3, 0).",
    ncertRef: "PYQ 30/3/2 Q28(a)", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-CG-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Distance Formula", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Ryan, from a very young age, was fascinated by the twinkling of stars and the vastness of space. He always dreamt of becoming an astronaut one day. So he started to sketch his own rocket designs on the graph sheet. One such design is given below : Based on the above, answer the following questions : (i) Find the midpoint of the segment joining F and G. 1 (ii) (a) What is the distance between the points A and C ? 2 OR (b) Find the coordinates of the point which divides the line segment joining the points A and B in the ratio 1 : 3 internally. 2 (iii) What are the coordinates of the point D ?",
    answer: "(3, 7 2) (iii) D(2, 5)",
    solutionSteps: [
      "[1 mark] (i) Midpoint of FG = ((−3+1)/2, (0+4)/2) = (−1, 2).",
      "[1 mark] (ii)(a) Distance AC = √[(−1−3)² + (−2−4)²] = √[16 + 36] = √52.",
      "[1 mark] (ii)(a) AC = √52 = 2√13 units. [OR (b) the point dividing AB in the ratio 1:3 internally is (3, 7/2).]",
      "[1 mark] (iii) The coordinates of the point D are (2, 5)."
    ],
    finalAnswer: "(i) (−1, 2); (ii)(a) AC = 2√13 units [OR (b) (3, 7/2)]; (iii) D(2, 5).",
    ncertRef: "PYQ 30/4/3 Q38", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "3" },
  { id: "PYQ-M-2024-CG-007", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A garden is in the shape of a square. The gardener grew saplings of Ashoka tree on the boundary of the garden at the distance of 1 m from each other. He wants to decorate the garden with rose plants. He chose a triangular region inside the garden to grow rose plants. In the above situation, the gardener took help from the students of class 10. They made a chart for it which looks like the given figure.\nBased on the above, answer the following questions :\n(i) If A is taken as origin, what are the coordinates of the vertices of △PQR ?\n(ii) (a) Find distances PQ and QR.\nOR\n(b) Find the coordinates of the point which divides the line segment joining points P and R in the ratio 2 : 1 internally.\n(iii) Find out if △PQR is an isosceles triangle.",
    answer: "(i) P(4, 6), Q(3, 2), R(6, 5); (ii)(a) PQ = √17 m, QR = √18 = 3√2 m [OR (b) (16/3, 16/3)]; (iii) PR = √5 m; PQ ≠ QR ≠ PR, so △PQR is not isosceles.",
    solutionSteps: ["[1 mark] (i) Taking A as origin, from the chart: P(4, 6), Q(3, 2), R(6, 5).", "[1 mark] (ii)(a) PQ = √[(4 − 3)² + (6 − 2)²] = √(1 + 16) = √17 m. [OR (b) The point dividing PR in the ratio 2 : 1 is ((2 × 6 + 1 × 4)/3, (2 × 5 + 1 × 6)/3).]", "[1 mark] (ii)(a) QR = √[(3 − 6)² + (2 − 5)²] = √(9 + 9) = √18 = 3√2 m. [OR (b) = (16/3, 16/3).]", "[1 mark] (iii) PR = √[(4 − 6)² + (6 − 5)²] = √5 m. PQ = √17, QR = √18 and PR = √5 are all unequal, so △PQR is not an isosceles triangle."],
    finalAnswer: "(i) P(4, 6), Q(3, 2), R(6, 5); (ii)(a) PQ = √17 m, QR = √18 = 3√2 m [OR (b) (16/3, 16/3)]; (iii) PR = √5 m; PQ ≠ QR ≠ PR, so △PQR is not isosceles.",
    ncertRef: "PYQ 30/5/1 Q37", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
