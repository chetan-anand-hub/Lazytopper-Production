import type { CanonicalQuestion } from '../../../predictionTypes';

// =============================================================================
// Source: NCERT Class 10 Mathematics Exemplar — Chapter 11 (Areas Related to Circles)
// PDF file used: jeep211.pdf (Exemplar) · Answer key cross-checked vs jeep2an.pdf
// topicKey: "areas-related-to-circles"
// Extraction date: 2026-06-18 · Bank Expansion Phase 1, Batch 2.
//
// PROVENANCE / THE DECOUPLE:
//   • QUESTION text = AUTHENTIC, verbatim from the Exemplar PDF.
//   • SOLUTION = AI-GENERATED, step-marked, PENDING OWNER VERIFICATION.
//     solutionSource: "ai-generated" for EVERY id (all ids registered in
//     AI_GENERATED_SOLUTION_IDS in canonicalQuestionBank.ts). Each finalAnswer was
//     cross-checked vs the official Exemplar answer key; the WORKED STEPS are AI and
//     the owner (examiner-of-record) must verify them before merge. (π = 22/7 unless
//     a question states π = 3.14.)
//
// SYLLABUS (CBSE 2026-27): Areas Related to Circles is in-syllabus (no banned
//   subtopic). DROPPED — figure-locked "shaded region" items that cannot be solved
//   without the figure: Ex 11.3 Q2,6,7,8,9,11,12,13,15; Ex 11.4 Q6,17.
// Net-new only: deduped vs repo (existing refs Ex11.1 Q1,2,4,7,8,10; Ex11.2 Q1,5,9,12;
//   Ex11.3 Q1,3,4,5,10,16; Ex11.4 Sample Qs are NOT repeated).
// Section↔marks by honest complexity (A=1, B=2, C=3, D=5); every solutionStep is
//   `[N mark]`-prefixed and the prefixes sum to marks.
// =============================================================================

export const ARC_EXEMPLAR2: CanonicalQuestion[] = [
  // ===== Section A — MCQs (Exercise 11.1, 1 mark) =====
  { id: "ARC-N-EXEM2-11-MCQ-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Circle vs Square (Equal Perimeter)", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the circumference of a circle and the perimeter of a square are equal, then",
    options: ["Area of the circle = Area of the square", "Area of the circle > Area of the square", "Area of the circle < Area of the square", "Nothing definite can be said about the relation between the areas of the circle and square."],
    answer: "Area of the circle > Area of the square",
    solutionSteps: ["[1 mark] For a fixed perimeter the circle encloses the maximum area; with 2πr = 4a one gets area of circle πr² and area of square π²r²/4, and since π < 4 the circle's area is larger — option (B)."],
    finalAnswer: "Area of the circle > Area of the square — option (B).",
    ncertRef: "Exemplar Ex 11.1 Q3", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-MCQ-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Ratio of Areas (Equal Perimeter)", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If the perimeter of a circle is equal to that of a square, then the ratio of their areas is",
    options: ["22 : 7", "14 : 11", "7 : 22", "11 : 14"],
    answer: "14 : 11",
    solutionSteps: ["[1 mark] 2πr = 4a ⇒ a = πr/2; ratio of areas = πr² : a² = πr² : π²r²/4 = 4 : π = 4 : 22/7 = 28 : 22 = 14 : 11 — option (B)."],
    finalAnswer: "14 : 11 — option (B).",
    ncertRef: "Exemplar Ex 11.1 Q5", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-MCQ-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Combined Area of Circles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "It is proposed to build a single circular park equal in area to the sum of areas of two circular parks of diameters 16 m and 12 m in a locality. The radius of the new park would be",
    options: ["10 m", "15 m", "20 m", "24 m"],
    answer: "10 m",
    solutionSteps: ["[1 mark] Radii are 8 m and 6 m; equating areas, πR² = π(8²) + π(6²) ⇒ R² = 64 + 36 = 100 ⇒ R = 10 m — option (A)."],
    finalAnswer: "10 m — option (A).",
    ncertRef: "Exemplar Ex 11.1 Q6", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-MCQ-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Combined Circumference", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The radius of a circle whose circumference is equal to the sum of the circumferences of the two circles of diameters 36 cm and 20 cm is",
    options: ["56 cm", "42 cm", "28 cm", "16 cm"],
    answer: "28 cm",
    solutionSteps: ["[1 mark] Radii are 18 cm and 10 cm; equating circumferences, 2πR = 2π(18) + 2π(10) ⇒ R = 28 cm — option (C)."],
    finalAnswer: "28 cm — option (C).",
    ncertRef: "Exemplar Ex 11.1 Q9", isCompetencyBased: true },

  // ===== Section B — Short Answer with Reasoning (Exercise 11.2, 2 marks) =====
  { id: "ARC-N-EXEM2-11-VSA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Square Circumscribing a Circle", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Evaluating",
    questionText: "Will it be true to say that the perimeter of a square circumscribing a circle of radius a cm is 8a cm? Give reasons for your answer.",
    solutionSteps: ["[1 mark] A square circumscribing a circle has side equal to the circle's diameter = 2a cm.", "[1 mark] So its perimeter = 4 × 2a = 8a cm — the statement is True."],
    finalAnswer: "True — the side is 2a, so the perimeter is 8a cm.",
    ncertRef: "Exemplar Ex 11.2 Q2", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-VSA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Squares Inscribed/Circumscribing a Circle", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "In Fig 11.3, a square is inscribed in a circle of diameter d and another square is circumscribing the circle. Is the area of the outer square four times the area of the inner square? Give reasons for your answer.",
    solutionSteps: ["[1 mark] The inner (inscribed) square has diagonal d, so its side is d/√2 and area d²/2; the outer (circumscribing) square has side d and area d².", "[1 mark] Outer area ÷ inner area = d² ÷ (d²/2) = 2, not 4 — the statement is False (the outer square is twice, not four times)."],
    finalAnswer: "False — the outer square's area is twice (not four times) the inner square's.",
    ncertRef: "Exemplar Ex 11.2 Q3", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-VSA-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Segment vs Sector", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Is it true to say that area of a segment of a circle is less than the area of its corresponding sector? Why?",
    solutionSteps: ["[1 mark] For a minor segment, area = area of sector − area of the triangle, which is indeed less than the sector.", "[1 mark] But for a major segment the triangle's area is added to the major sector, so the major segment exceeds its sector; hence the statement is not true in general (only for a minor segment)."],
    finalAnswer: "Not always — it is true only for a minor segment, not a major one.",
    ncertRef: "Exemplar Ex 11.2 Q4", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-VSA-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Distance in One Revolution", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "In covering a distance s metres, a circular wheel of radius r metres makes s/(2πr) revolutions. Is this statement true? Why?",
    solutionSteps: ["[1 mark] In one revolution a wheel covers a distance equal to its circumference, 2πr metres.", "[1 mark] So the number of revolutions to cover s metres is s ÷ (2πr) = s/(2πr) — the statement is True."],
    finalAnswer: "True — distance per revolution is 2πr, so revolutions = s/(2πr).",
    ncertRef: "Exemplar Ex 11.2 Q6", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-VSA-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area vs Circumference (Numerical)", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "The numerical value of the area of a circle is greater than the numerical value of its circumference. Is this statement true? Why?",
    solutionSteps: ["[1 mark] Area = πr² and circumference = 2πr; πr² > 2πr ⇔ r > 2.", "[1 mark] So it holds only when r > 2 (for r < 2 the circumference is numerically greater, for r = 2 they are equal) — the statement is not always true; it depends on the radius."],
    finalAnswer: "Not always — it is true only when the radius r > 2; it depends on r.",
    ncertRef: "Exemplar Ex 11.2 Q7", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-VSA-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Equal Areas ⇒ Equal Circumferences", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Evaluating",
    questionText: "Areas of two circles are equal. Is it necessary that their circumferences are equal? Why?",
    solutionSteps: ["[1 mark] Equal areas ⇒ πr₁² = πr₂² ⇒ r₁ = r₂ (radii are positive).", "[1 mark] Equal radii ⇒ equal circumferences (2πr₁ = 2πr₂) — yes, it is necessary."],
    finalAnswer: "Yes — equal areas force equal radii, hence equal circumferences.",
    ncertRef: "Exemplar Ex 11.2 Q13", isCompetencyBased: true },

  // ===== Section C — Short Answer (Exercise 11.3 / 11.4, 3 marks) =====
  { id: "ARC-N-EXEM2-11-SA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of a Circular Path (Ring)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circular park is surrounded by a road 21 m wide. If the radius of the park is 105 m, find the area of the road.",
    solutionSteps: ["[1 mark] Inner radius (park) = 105 m; outer radius (park + road) = 105 + 21 = 126 m.", "[1 mark] Area of road = π(R² − r²) = (22/7)(126² − 105²) = (22/7)(15876 − 11025) = (22/7)(4851).", "[1 mark] = 22 × 693 = 15246 m²."],
    finalAnswer: "Area of the road = 15246 m².",
    ncertRef: "Exemplar Ex 11.3 Q14", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area and Cost of Fencing", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The area of a circular playground is 22176 m². Find the cost of fencing this ground at the rate of Rs 50 per metre.",
    solutionSteps: ["[1 mark] πr² = 22176 ⇒ r² = 22176 × 7/22 = 7056 ⇒ r = 84 m.", "[1 mark] Circumference = 2πr = 2 × (22/7) × 84 = 528 m.", "[1 mark] Cost of fencing = 528 × Rs 50 = Rs 26400."],
    finalAnswer: "Rs 26400.",
    ncertRef: "Exemplar Ex 11.4 Q1", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Revolutions of Wheels", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The diameters of front and rear wheels of a tractor are 80 cm and 2 m respectively. Find the number of revolutions that the rear wheel will make in covering a distance in which the front wheel makes 1400 revolutions.",
    solutionSteps: ["[1 mark] Distance covered by the front wheel = 1400 × π × 80 cm (circumference = π × diameter).", "[1 mark] Rear wheel diameter = 200 cm, so its revolutions = (1400 × π × 80) ÷ (π × 200).", "[1 mark] = 1400 × 80 / 200 = 560 revolutions."],
    finalAnswer: "560 revolutions.",
    ncertRef: "Exemplar Ex 11.4 Q2", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of a Segment", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the area of the segment of a circle of radius 12 cm whose corresponding sector has a central angle of 60°. (Use π = 3.14)",
    solutionSteps: ["[1 mark] Area of sector = (60/360) × π × 12² = (1/6) × 3.14 × 144 = 75.36 cm².", "[1 mark] The triangle formed by the two radii and the chord is equilateral (the included angle is 60°), with area (√3/4)(12²) = 36√3 cm².", "[1 mark] Area of segment = sector − triangle = (75.36 − 36√3) cm² ≈ 13.04 cm²."],
    finalAnswer: "(75.36 − 36√3) cm² ≈ 13.04 cm².",
    ncertRef: "Exemplar Ex 11.4 Q4", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of a Circular Path + Cost", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circular pond is 17.5 m in diameter. It is surrounded by a 2 m wide path. Find the cost of constructing the path at the rate of Rs 25 per m². (Use π = 3.14)",
    solutionSteps: ["[1 mark] Pond radius = 8.75 m; outer radius (pond + path) = 8.75 + 2 = 10.75 m.", "[1 mark] Area of path = π(10.75² − 8.75²) = 3.14 × (115.5625 − 76.5625) = 3.14 × 39 = 122.46 m².", "[1 mark] Cost = 122.46 × Rs 25 = Rs 3061.50."],
    finalAnswer: "Rs 3061.50.",
    ncertRef: "Exemplar Ex 11.4 Q5", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of a Sector from Arc Length", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the area of the sector of a circle of radius 5 cm, if the corresponding arc length is 3.5 cm.",
    solutionSteps: ["[1 mark] Area of a sector = (1/2) × radius × arc length.", "[1 mark] = (1/2) × 5 × 3.5 = 8.75 cm²."],
    finalAnswer: "8.75 cm².",
    ncertRef: "Exemplar Ex 11.4 Q8", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-007", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Rhombus Inscribed in a Circle", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "All the vertices of a rhombus lie on a circle. Find the area of the rhombus, if area of the circle is 1256 cm². (Use π = 3.14)",
    solutionSteps: ["[1 mark] A rhombus whose vertices are concyclic must be a square, so its diagonals are equal to the circle's diameter.", "[1 mark] πr² = 1256 ⇒ r² = 1256/3.14 = 400 ⇒ r = 20, so each diagonal = 40 cm.", "[1 mark] Area of rhombus = (1/2) d₁ d₂ = (1/2)(40)(40) = 800 cm²."],
    finalAnswer: "800 cm².",
    ncertRef: "Exemplar Ex 11.4 Q12", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-008", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area Swept by a Clock Hand", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The length of the minute hand of a clock is 5 cm. Find the area swept by the minute hand during the time period 6:05 a.m. and 6:40 a.m.",
    solutionSteps: ["[1 mark] In 35 minutes the minute hand sweeps an angle of (35/60) × 360° = 210°.", "[1 mark] Area = (210/360) × (22/7) × 5² = (7/12) × (22/7) × 25 = 275/6 = 45 5/6 cm²."],
    finalAnswer: "45 5/6 cm² (≈ 45.83 cm²).",
    ncertRef: "Exemplar Ex 11.4 Q14", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-009", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector: Area to Radius and Arc", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Area of a sector of central angle 200° of a circle is 770 cm². Find the length of the corresponding arc of this sector.",
    solutionSteps: ["[1 mark] (200/360) × (22/7) × r² = 770 ⇒ (5/9)(22/7) r² = 770 ⇒ r² = 770 × 9 × 7/(5 × 22) = 441 ⇒ r = 21 cm.", "[1 mark] Arc length = (200/360) × 2 × (22/7) × 21 = (5/9) × 132.", "[1 mark] = 660/9 = 73 1/3 cm."],
    finalAnswer: "73 1/3 cm (≈ 73.33 cm).",
    ncertRef: "Exemplar Ex 11.4 Q15", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-010", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Revolutions of a Wheel", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the number of revolutions made by a circular wheel of area 1.54 m² in rolling a distance of 176 m.",
    solutionSteps: ["[1 mark] πr² = 1.54 ⇒ r² = 1.54 × 7/22 = 0.49 ⇒ r = 0.7 m, so circumference = 2 × (22/7) × 0.7 = 4.4 m.", "[1 mark] Number of revolutions = 176 ÷ 4.4 = 40."],
    finalAnswer: "40 revolutions.",
    ncertRef: "Exemplar Ex 11.4 Q18", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-SA-011", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sector and Major Sector", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the difference of the areas of a sector of angle 120° and its corresponding major sector of a circle of radius 21 cm.",
    solutionSteps: ["[1 mark] Minor sector (120°) = (120/360) × (22/7) × 21² = (1/3) × 1386 = 462 cm².", "[1 mark] Major sector = area of circle − minor sector = 1386 − 462 = 924 cm².", "[1 mark] Difference = 924 − 462 = 462 cm²."],
    finalAnswer: "462 cm².",
    ncertRef: "Exemplar Ex 11.4 Q20", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "ARC-N-EXEM2-11-LA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Grazing Area (Triangle + Sectors)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Sides of a triangular field are 15 m, 16 m and 17 m. With the three corners of the field a cow, a buffalo and a horse are tied separately with ropes of length 7 m each to graze in the field. Find the area of the field which cannot be grazed by the three animals.",
    solutionSteps: ["[1 mark] Semi-perimeter s = (15 + 16 + 17)/2 = 24 m.", "[1 mark] By Heron's formula, area of the field = √(24 × 9 × 8 × 7) = √12096 = 24√21 m².", "[1 mark] The three grazed sectors have radius 7 m and their angles are the three interior angles, summing to 180°.", "[1 mark] Total grazed area = (180/360) × (22/7) × 7² = (1/2) × 154 = 77 m².", "[1 mark] Area that cannot be grazed = (24√21 − 77) m² ≈ 32.0 m²."],
    finalAnswer: "(24√21 − 77) m² ≈ 32.0 m².",
    ncertRef: "Exemplar Ex 11.4 Q3", isCompetencyBased: true },

  { id: "ARC-N-EXEM2-11-LA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sectors of Two Circles (Compare)", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The central angles of two sectors of circles of radii 7 cm and 21 cm are respectively 120° and 40°. Find the areas of the two sectors as well as the lengths of the corresponding arcs. What do you observe?",
    solutionSteps: ["[1 mark] Sector 1 (r = 7, 120°) area = (120/360) × (22/7) × 7² = (1/3) × 154 = 154/3 cm².", "[1 mark] Sector 2 (r = 21, 40°) area = (40/360) × (22/7) × 21² = (1/9) × 1386 = 154 cm².", "[1 mark] Arc 1 = (120/360) × 2 × (22/7) × 7 = (1/3) × 44 = 44/3 cm.", "[1 mark] Arc 2 = (40/360) × 2 × (22/7) × 21 = (1/9) × 132 = 44/3 cm.", "[1 mark] Observation: the two arc lengths are equal (44/3 cm each) although the sector areas (154/3 cm² and 154 cm²) are different — equal arcs need not give equal areas."],
    finalAnswer: "Areas 154/3 cm² and 154 cm²; both arcs 44/3 cm — equal arc lengths but unequal areas.",
    ncertRef: "Exemplar Ex 11.4 Q16", isCompetencyBased: true },
];
