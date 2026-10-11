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
    solutionSteps: ["[1 mark] The radii to the 5 vertices of the regular pentagon divide the circle into 5 congruent sectors, each of area (1/5)·π·5² = 5π cm². From the figure, the shaded part is one complete sector, plus the triangle of a second sector and the segment of a third sector; a triangle and a segment from congruent sectors together make one full sector. So shaded area = 2 × 5π = 10π cm²."],
    finalAnswer: "(d) 10π cm^2",
    ncertRef: "APQ PQ1 Q14", isCompetencyBased: true,
 },

  // PQ2 Q11 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Segment", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, the area of the segment ACB is",
    options: ["r^2/4 (π − 2)", "r^2/4 (π + 2)", "r^2/4 (π − 1)", "r^2/4 (π + 1)"],
    answer: "r^2/4 (π − 2)",
    solutionSteps: ["[1 mark] From the figure, ∠AOB = 90° and OA = OB = r. Area of segment ACB = area of sector OACB − area of △OAB = (90°/360°)πr² − (1/2)·r·r = πr²/4 − r²/2 = (r²/4)(π − 2)."],
    finalAnswer: "(a) r^2/4 (π − 2)",
    ncertRef: "APQ PQ2 Q11", isCompetencyBased: true,
 },

  // PQ1 Q25 (Section B, Short, 2 marks)
  { id: "APQ-M-ARC-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector and Triangle Areas — Rhombus", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "ABCD is a rhombus with side 3 cm. Two arcs are drawn from points A and C respectively such that the radius equals the side of the rhombus. If BD is a line of symmetry for the figure, then find the area of the shaded part of the figure in terms of π. OR Wasim made a model of Pac-Man with area 120π cm^2 and mouth angle 60° at the centre. Find the minimum length of ribbon needed for the entire boundary in terms of π.",
    answer: "3π − 9√3/2 cm^2. [OR] (20π + 24) cm.",
    solutionSteps: ["[1 mark] From the figure, ∠DAB = 60° and the arc through D and B is drawn with centre A, radius 3 cm. Area of sector ABD = (60/360) × π × 3² = 3π/2 cm²; △ABD has AB = AD = 3 cm and ∠A = 60°, so it is equilateral: area = (√3/4) × 3² = 9√3/4 cm². [OR Let the radius be r cm; the model is a sector of angle 360° − 60° = 300°: 120π = (300/360) × π × r² ⇒ r² = 144 ⇒ r = 12 cm.]", "[1 mark] BD is a line of symmetry, so the shaded part = 2 × (area of sector ABD − area of △ABD) = 2 × (3π/2 − 9√3/4) = (3π − 9√3/2) cm². [OR Ribbon length = arc length + 2 radii = (300/360) × 2 × π × 12 + 24 = (20π + 24) cm.]"],
    finalAnswer: "3π − 9√3/2 cm^2. [OR] (20π + 24) cm.",
    ncertRef: "APQ PQ1 Q25", isCompetencyBased: true,
 },

  // PQ2 Q36 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-ARC-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector and Triangle Areas — Trophy Shield", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The trophy shield Akshi received is made of a glass sector DOC supported by identical wooden right triangles ΔDAO and ΔCOB. AO = 7 cm and AO : DA = 1 : √3. (Use √3 = 1.73). (i) Find ∠DOC. (ii) Find the area of the wooden triangles. (iii) Find the area of the shape formed by the glass portion. OR (iii) Find the length of tape needed for the boundary of the glass portion.",
    answer: "(i) 60°. (ii) 84.77 cm^2. (iii) 102.67 cm^2. [OR] 42.67 cm.",
    solutionSteps: ["(i) tan ∠DOA = AD/AO = √3/1 ⟹ ∠DOA = 60°. By symmetry ∠COB = 60°, so ∠DOC = 180° − 120° = 60°.", "(ii) Each wooden triangle: ½ × 7 × 7√3 = 49√3/2 ≈ 42.385. Two triangles: ~84.77 cm^2.", "(iii) DO: cos 60° = AO/DO ⟹ DO = 14 cm. Area of sector DOC = (60/360) · π · 14^2 = 196π/6 ≈ 102.67 cm^2.", "[OR] Tape = arc DC + DO + OC = (60/360)(2π·14) + 14 + 14 = 14π/3 + 28 ≈ 14.67 + 28 = 42.67 cm."],
    finalAnswer: "(i) 60°; (ii) 84.77 cm^2; (iii) 102.67 cm^2 [or] 42.67 cm.",
    ncertRef: "APQ PQ2 Q36", isCompetencyBased: true,
 },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector — Length Calculation", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a sector of a circle with centre P. All lengths are measured in cm. What is the length of PE?",
    options: ["3 cm", "3.5 cm", "4 cm", "4.5 cm"],
    answer: "4.5 cm",
    solutionSteps: ["[1 mark] From the grid, P is at 0 and R at 6 on the x-axis, so the radius PR = 6 cm; Q lies on the arc, so PQ = 6 cm, and Q is at x = 4. E lies on PQ at x = 3. Since E is on the straight line PQ, PE/PQ = 3/4, so PE = (3/4) × 6 = 4.5 cm."],
    finalAnswer: "(d) 4.5 cm",
    ncertRef: "APQ PQ_2022 Q7", isCompetencyBased: true,
 },

  // PQ_2022 Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-007", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector Area — Sufficient Conditions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In the figure below, a unit square ROST is inscribed in a circular sector with centre O. Along with the above information, which of these is SUFFICIENT to find the area of sector POQ?",
    options: ["area of the square ROST", "radius of sector POQ", "arc length PQ", "(the given information is sufficient)"],
    answer: "arc length PQ",
    solutionSteps: ["[1 mark] The unit square ROST is inscribed with its vertex O at the centre, so the opposite vertex T lies on the arc and the radius OT = diagonal = √(1² + 1²) = √2 units. The radius is therefore already known, so the area of the square (A, which is 1 sq unit) or the radius (B) adds nothing new; what is still unknown is the sector angle ∠POQ. If arc PQ = l is known, then l = (θ/360°) × 2πr fixes θ, and area of sector POQ = ½ × l × r = l/√2 sq units. Hence option (c)."],
    finalAnswer: "(c) arc length PQ",
    ncertRef: "APQ PQ_2022 Q13", isCompetencyBased: true,
 },

  // PQ_2022 Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-M-ARC-008", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector Area — Fibonacci Grid", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13... Shown is a representation of the first few terms in a unit square grid. The terms represent side lengths. What is the area of the shaded sector?",
    options: ["4π sq units", "16π sq units", "48π sq units", "64π sq units"],
    answer: "16π sq units",
    solutionSteps: ["[1 mark] The squares in the grid have sides 1, 1, 2, 3, 5, and the next Fibonacci term is 3 + 5 = 8. From the figure, the shaded quarter-circle is drawn inside the 8 × 8 square, so its radius is 8 units. Area = (1/4) × π × 8² = 16π sq units."],
    finalAnswer: "(b) 16π sq units",
    ncertRef: "APQ PQ_2022 Q14", isCompetencyBased: true,
 },

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
    solutionSteps: ["[0.5 mark] Rough figure: join O to M and N. MN is a diameter of the smaller semicircle and O lies on that semicircle, so ∠MON = 90°; OM = ON = OL = 6 cm (radii of the larger semicircle).", "[0.5 mark] Area of sector MON = (90°/360°) × π × 6² = 9π cm².", "[0.5 mark] Area of △MON = (1/2) × 6 × 6 = 18 cm².", "[0.5 mark] Area of shaded segment = 9π − 18 = 9(π − 2) cm²."],
    finalAnswer: "9(π − 2) cm^2.",
    ncertRef: "APQ PQ_2022 Q25 (OR variant)", isCompetencyBased: true,
 },
];
