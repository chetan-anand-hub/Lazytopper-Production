import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "areas-related-to-circles"
// Extraction date: 2026-05-24

export const AREAS_RELATED_TO_CIRCLES_APQ: CanonicalQuestion[] = [
  // PQ1 Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Arc Length from Area", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circle with radius 6 cm is shown. The area of the shaded region in the circle is (some fraction) of the area of the circle. What is the length of the circle's minor arc?",
    options: ["16π/3 cm", "20π/3 cm", "16π cm", "20π cm"],
    answer: "16π/3 cm",
    solutionSteps: ["From figure, shaded sector subtends angle θ. Per MS, minor arc length = 16π/3 cm."],
    finalAnswer: "(a) 16π/3 cm",
    ncertRef: "APQ PQ1 Q13", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circle with shaded sector and angle." },

  // PQ1 Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Circular Sectors — Inscribed Polygon", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A regular pentagon is inscribed in a circle with centre O, of radius 5 cm. What is the area of the shaded part of the circle?",
    options: ["2π cm^2", "4π cm^2", "5π cm^2", "10π cm^2"],
    answer: "10π cm^2",
    solutionSteps: ["Total area of circle = π·5^2 = 25π. Per MS, the shaded area corresponds to particular sectors / leftover region equal to 10π cm^2."],
    finalAnswer: "(d) 10π cm^2",
    ncertRef: "APQ PQ1 Q14", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: regular pentagon inscribed in circle." },

  // PQ2 Q11 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Segment", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, the area of the segment ACB is",
    options: ["r^2/4 (π − 2)", "r^2/4 (π + 2)", "r^2/4 (π − 1)", "r^2/4 (π + 1)"],
    answer: "r^2/4 (π − 2)",
    solutionSteps: ["The figure shows a quarter-circle segment. Area of quadrant = πr^2/4. Area of right-isosceles triangle = r^2/2.", "Segment area = πr^2/4 − r^2/2 = r^2/4 · (π − 2)."],
    finalAnswer: "(a) r^2/4 (π − 2)",
    ncertRef: "APQ PQ2 Q11", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: quarter-circle segment ACB." },

  // PQ1 Q25 (Section B, Short, 2 marks)
  { id: "APQ-M-ARC-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector and Triangle Areas — Rhombus", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "ABCD is a rhombus with side 3 cm. Two arcs are drawn from points A and C respectively such that the radius equals the side of the rhombus. If BD is a line of symmetry for the figure, then find the area of the shaded part of the figure in terms of π. OR Wasim made a model of Pac-Man with area 120π cm^2 and mouth angle 60° at the centre. Find the minimum length of ribbon needed for the entire boundary in terms of π.",
    answer: "3π − 9√3/2 cm^2. [OR] (20π + 24) cm.",
    solutionSteps: ["Area of sector ABD = (60/360) · π · 3^2 = 3π/2 cm^2 (since ABCD rhombus with line BD ⟹ angle 60° symmetry).", "Area of ΔABD = (√3/4) · 3^2 = 9√3/4 cm^2.", "Shaded = 2 · (sector − triangle) = 2 · (3π/2 − 9√3/4) = 3π − 9√3/2 cm^2.", "[OR] Area = 120π = (300/360) · π · r^2 ⟹ r = 12. Ribbon = arc + 2 radii = (300/360)(2π·12) + 24 = 20π + 24 cm."],
    finalAnswer: "3π − 9√3/2 cm^2. [OR] (20π + 24) cm.",
    ncertRef: "APQ PQ1 Q25", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants." },

  // PQ2 Q36 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-ARC-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector and Triangle Areas — Trophy Shield", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The trophy shield Akshi received is made of a glass sector DOC supported by identical wooden right triangles ΔDAO and ΔCOB. AO = 7 cm and AO : DA = 1 : √3. (Use √3 = 1.73). (i) Find ∠DOC. (ii) Find the area of the wooden triangles. (iii) Find the area of the shape formed by the glass portion. OR (iii) Find the length of tape needed for the boundary of the glass portion.",
    answer: "(i) 60°. (ii) 84.77 cm^2. (iii) 102.67 cm^2. [OR] 42.67 cm.",
    solutionSteps: ["(i) tan ∠DOA = AD/AO = √3/1 ⟹ ∠DOA = 60°. By symmetry ∠COB = 60°, so ∠DOC = 180° − 120° = 60°.", "(ii) Each wooden triangle: ½ × 7 × 7√3 = 49√3/2 ≈ 42.385. Two triangles: ~84.77 cm^2.", "(iii) DO: cos 60° = AO/DO ⟹ DO = 14 cm. Area of sector DOC = (60/360) · π · 14^2 = 196π/6 ≈ 102.67 cm^2.", "[OR] Tape = arc DC + DO + OC = (60/360)(2π·14) + 14 + 14 = 14π/3 + 28 ≈ 14.67 + 28 = 42.67 cm."],
    finalAnswer: "(i) 60°; (ii) 84.77 cm^2; (iii) 102.67 cm^2 [or] 42.67 cm.",
    ncertRef: "APQ PQ2 Q36", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: trophy shield with sector DOC and triangles." },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector — Length Calculation", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a sector of a circle with centre P. All lengths are measured in cm. What is the length of PE?",
    options: ["3 cm", "3.5 cm", "4 cm", "4.5 cm"],
    answer: "4 cm",
    solutionSteps: ["Per MS answer key: option (c) 4 cm."],
    finalAnswer: "(c) 4 cm",
    ncertRef: "APQ PQ_2022 Q7", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: sector of circle with centre P and labelled lengths." },

  // PQ_2022 Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-007", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector Area — Sufficient Conditions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In the figure below, a unit square ROST is inscribed in a circular sector with centre O. Along with the above information, which of these is SUFFICIENT to find the area of sector POQ?",
    options: ["area of the square ROST", "radius of sector POQ", "arc length PQ", "(the given information is sufficient)"],
    answer: "arc length PQ",
    solutionSteps: ["Per MS answer key: option (c). The arc length PQ (combined with known geometric relations to the inscribed unit square) suffices to determine both radius and angle, hence sector area."],
    finalAnswer: "(c) arc length PQ",
    ncertRef: "APQ PQ_2022 Q13", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: unit square inscribed in circular sector." },

  // PQ_2022 Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-008", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector Area — Fibonacci Grid", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13... Shown is a representation of the first few terms in a unit square grid. The terms represent side lengths. What is the area of the shaded sector?",
    options: ["4π sq units", "16π sq units", "48π sq units", "64π sq units"],
    answer: "16π sq units",
    solutionSteps: ["Per MS answer key: option (b) 16π sq units. The shaded quarter-sector has radius 8 (a Fibonacci term in the spiral); area = (1/4)·π·8^2 = 16π."],
    finalAnswer: "(b) 16π sq units",
    ncertRef: "APQ PQ_2022 Q14", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: Fibonacci spiral in unit square grid." },

  // PQ_2022 Q25 first variant (Section B, Short, 2 marks)
  { id: "APQ-M-ARC-009", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Arc Length — Chord Subtending 60°", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A 3.5 cm chord subtends an angle of 60° at the centre of a circle. What is the arc length of the minor sector? (Use π = 22/7.)",
    answer: "Arc length = 11/3 cm (≈ 3.67 cm).",
    solutionSteps: ["Triangle OMN with OM = ON (radii) and ∠MON = 60° ⟹ equilateral triangle (angles opposite equal sides equal, all 60°). So OM = ON = MN = 3.5 cm.", "Radius r = 3.5 = 7/2 cm. Arc length = (60°/360°) × 2π × r = (1/6) × 2 × (22/7) × (7/2) = 22/6 = 11/3 cm."],
    finalAnswer: "11/3 cm.",
    ncertRef: "APQ PQ_2022 Q25 (first variant)", isCompetencyBased: true },

  // PQ_2022 Q25 OR variant (Section B, Short, 2 marks)
  { id: "APQ-M-ARC-010", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Segment Area — Semicircle in Semicircle", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A semicircle MON is inscribed in another semicircle. Radius OL of the larger semicircle is 6 cm. Find the area of the shaded segment in terms of π. Draw a rough figure and show your steps.",
    answer: "Area = 9(π − 2) cm^2.",
    solutionSteps: ["From figure: ∠MON = 90°. Sector MON area in larger semicircle = (90°/360°) × π × 6^2 = 9π cm^2.", "Triangle MON area = (1/2) × 6 × 6 = 18 cm^2.", "Shaded segment area = sector − triangle = 9π − 18 = 9(π − 2) cm^2."],
    finalAnswer: "9(π − 2) cm^2.",
    ncertRef: "APQ PQ_2022 Q25 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: smaller semicircle MON inscribed in larger semicircle, radius OL = 6." },
];
