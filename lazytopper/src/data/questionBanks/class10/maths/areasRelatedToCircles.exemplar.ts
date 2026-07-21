import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 11: Area Related to Circles
// PDF file used: jeep211.pdf — verified Page 1 = "CHAPTER 11 AREA RELATED TO CIRCLES"
// topicKey: "areas-related-to-circles"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (full chapter in scope)
// Coverage: Exemplar 11.1 MCQs, 11.2 reasoning, 11.3 short answer, 11.4 long answer
//           (selected items).

export const ARC_EXEMPLAR: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "ARC-N-EXEM-11-MCQ-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sum of Areas of Circles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the sum of the areas of two circles with radii R₁ and R₂ equals the area of a circle of radius R, then",
    options: ["R₁ + R₂ = R", "R₁² + R₂² = R²", "R₁ + R₂ < R", "R₁² + R₂² < R²"],
    answer: "R₁² + R₂² = R²",
    solutionSteps: ["Equate areas: πR₁² + πR₂² = πR² ⇒ R₁² + R₂² = R²."],
    finalAnswer: "R₁² + R₂² = R² — option (b).",
    ncertRef: "Exemplar Ex 11.1 Q1", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-MCQ-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Sum of Circumferences", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the sum of the circumferences of two circles with radii R₁ and R₂ equals the circumference of a circle of radius R, then",
    options: ["R₁ + R₂ = R", "R₁ + R₂ > R", "R₁ + R₂ < R", "Nothing definite can be said"],
    answer: "R₁ + R₂ = R",
    solutionSteps: ["Equate circumferences: 2πR₁ + 2πR₂ = 2πR ⇒ R₁ + R₂ = R."],
    finalAnswer: "R₁ + R₂ = R — option (a).",
    ncertRef: "Exemplar Ex 11.1 Q2", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-MCQ-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Inscribed Triangle", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Area of the largest triangle that can be inscribed in a semi-circle of radius r is",
    options: ["r² sq. units", "(1/2)r² sq. units", "2r² sq. units", "√2·r² sq. units"],
    answer: "r² sq. units",
    solutionSteps: ["Largest triangle in a semicircle has the diameter (= 2r) as its base and the apex at the highest point above the diameter, with height = r.", "Area = (1/2) × base × height = (1/2) × 2r × r = r²."],
    finalAnswer: "r² sq. units — option (a).",
    ncertRef: "Exemplar Ex 11.1 Q4", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-MCQ-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Inscribed Circle", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The area of the circle that can be inscribed in a square of side 6 cm is",
    options: ["36π cm²", "18π cm²", "12π cm²", "9π cm²"],
    answer: "9π cm²",
    solutionSteps: ["Largest inscribed circle has diameter = side of square = 6 ⇒ radius 3 cm.", "Area = π × 3² = 9π cm²."],
    finalAnswer: "9π cm² — option (d).",
    ncertRef: "Exemplar Ex 11.1 Q7", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-MCQ-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Inscribed Square", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The area of the square that can be inscribed in a circle of radius 8 cm is",
    options: ["256 cm²", "128 cm²", "64√2 cm²", "64 cm²"],
    answer: "128 cm²",
    solutionSteps: ["Diagonal of inscribed square = diameter = 16 cm.", "Side × √2 = 16 ⇒ side = 16/√2 = 8√2.", "Area = (8√2)² = 64 × 2 = 128 cm²."],
    finalAnswer: "128 cm² — option (b).",
    ncertRef: "Exemplar Ex 11.1 Q8", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-MCQ-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Equal Circle from Areas", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The diameter of a circle whose area equals the sum of the areas of two circles of radii 24 cm and 7 cm is",
    options: ["31 cm", "25 cm", "62 cm", "50 cm"],
    answer: "50 cm",
    solutionSteps: ["Sum of areas: π(24² + 7²) = π(576 + 49) = 625π.", "If r = radius of new circle: πr² = 625π ⇒ r = 25.", "Diameter = 50 cm."],
    finalAnswer: "50 cm — option (d).",
    ncertRef: "Exemplar Ex 11.1 Q10", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "ARC-N-EXEM-11-AR-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Segment", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): Area of a segment of a circle is always area(sector) − area(triangle).\nReason (R): For the major segment, the triangle must be ADDED to the major sector, not subtracted.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(D) Assertion is false but Reason is true.",
    solutionSteps: ["A is FALSE — the 'sector − triangle' rule applies to the MINOR segment only.", "R is the correct adjustment for major segments — TRUE.", "Hence option (D)."],
    finalAnswer: "Option (D).",
    ncertRef: "Exemplar Sample Question 1 (Ex 11.2)", isCompetencyBased: true,
    strategyHint: "Minor and major segments need different decompositions." },

  { id: "ARC-N-EXEM-11-AR-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Equal Areas vs Equal Circumferences", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): If two circles have equal circumferences, then their areas are equal.\nReason (R): Both circumference and area are determined by the radius of a circle.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Equal circumferences ⇒ equal radii ⇒ equal areas. A true.", "R is the standard observation that one parameter (r) determines both — true.", "R is exactly why A holds."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Ex 11.2 Q12", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "ARC-N-EXEM-11-VSA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Inscribed Circle in Square", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Is the area of the circle inscribed in a square of side a cm equal to πa² cm²? Justify briefly.",
    solutionSteps: ["The inscribed circle has diameter = a, so radius = a/2.", "Area = π(a/2)² = πa²/4, not πa².", "Hence the statement is FALSE."],
    finalAnswer: "False; correct area is πa²/4.",
    ncertRef: "Exemplar Ex 11.2 Q1", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-VSA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Wheel Distance per Revolution", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A student says that the distance travelled by a circular wheel of diameter d cm in one revolution is 2πd cm. Is this correct? Justify briefly.",
    solutionSteps: ["Distance in one revolution = circumference = πd (since circumference = π × diameter).", "2πd is twice the circumference — incorrect.", "Hence the statement is FALSE."],
    finalAnswer: "False; correct distance per revolution is πd cm.",
    ncertRef: "Exemplar Ex 11.2 Q5", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-VSA-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Equal Arcs vs Equal Areas", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If two sectors of different circles have equal arc lengths, must they have equal areas? Justify briefly.",
    solutionSteps: ["Area of sector = (1/2) × r × arc length (using A = (1/2)rl).", "If arc lengths are equal but radii differ, the areas will differ (larger radius ⇒ larger area).", "Hence the statement is FALSE."],
    finalAnswer: "False; equal arc lengths do not force equal sector areas.",
    ncertRef: "Exemplar Ex 11.2 Q9", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "ARC-N-EXEM-11-SA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Equal Circle from Circumferences", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the radius of a circle whose circumference equals the sum of the circumferences of two circles of radii 15 cm and 18 cm.",
    solutionSteps: ["Sum of circumferences: 2π(15) + 2π(18) = 2π(33).", "If r is the new radius: 2πr = 2π × 33 ⇒ r = 33 cm."],
    finalAnswer: "r = 33 cm.",
    ncertRef: "Exemplar Ex 11.3 Q1", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-SA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Sector", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the area of a sector of a circle of radius 28 cm and central angle 45°.",
    solutionSteps: ["Area = (θ/360) × πr² = (45/360) × (22/7) × 28² = (1/8) × (22/7) × 784.", "= (1/8) × (22 × 112) = (1/8) × 2464 = 308 cm²."],
    finalAnswer: "Area = 308 cm².",
    ncertRef: "Exemplar Ex 11.3 Q3", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-SA-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Wheel Revolutions per Minute", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The wheel of a motor cycle has radius 35 cm. How many revolutions per minute must the wheel make to maintain a speed of 66 km/h?",
    solutionSteps: ["Circumference = 2π × 35 = 70 × (22/7) = 220 cm.", "Speed: 66 km/h = 66 × 1000 × 100 / 60 cm/min = 110000 cm/min.", "Revolutions per minute = 110000/220 = 500."],
    finalAnswer: "500 revolutions per minute.",
    ncertRef: "Exemplar Ex 11.3 Q4", isCompetencyBased: true,
    strategyHint: "Convert speed to cm/min, then divide by circumference." },

  { id: "ARC-N-EXEM-11-SA-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Grazing Area", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A cow is tied with a 14 m rope at the corner of a rectangular field of dimensions 20 m × 16 m. Find the area of the field in which the cow can graze.",
    solutionSteps: ["At a rectangle corner the cow grazes a quadrant of a circle of radius 14 m.", "Quadrant area = (1/4) × π × 14² = (1/4) × (22/7) × 196 = (1/4) × 616 = 154 m²."],
    finalAnswer: "Grazing area = 154 m².",
    ncertRef: "Exemplar Ex 11.3 Q5", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-SA-005", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Minor Segment", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the area of the minor segment of a circle of radius 14 cm, when the angle of the corresponding sector is 60°.",
    solutionSteps: ["Sector area = (60/360) × π × 14² = (1/6) × (22/7) × 196 = (22 × 28)/6 = 616/6 ≈ 102.67 cm².", "Triangle area (equilateral with side 14 since chord at 60° creates an equilateral triangle): (√3/4) × 14² = (√3/4) × 196 = 49√3 ≈ 84.87 cm².", "Minor segment = 102.67 − 84.87 ≈ 17.80 cm²."],
    finalAnswer: "Minor segment ≈ 17.80 cm².",
    ncertRef: "Exemplar Ex 11.3 Q10", isCompetencyBased: true },

  { id: "ARC-N-EXEM-11-SA-006", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Arc Length from Bent Wire", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A piece of wire 20 cm long is bent into the form of an arc of a circle subtending an angle of 60° at its centre. Find the radius of the circle.",
    solutionSteps: ["Arc length = (θ/360) × 2πr = (60/360) × 2πr = πr/3.", "Set πr/3 = 20 ⇒ r = 60/π.", "Using π = 22/7: r = 60 × 7/22 = 420/22 = 210/11 ≈ 19.09 cm."],
    finalAnswer: "r = 210/11 cm ≈ 19.09 cm.",
    ncertRef: "Exemplar Ex 11.3 Q16", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "ARC-N-EXEM-11-LA-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Major Segment", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A chord of a circle of radius 10 cm subtends an angle of 90° at the centre. Find the area of the corresponding major segment. (Use π = 3.14.)",
    solutionSteps: ["[1 mark] Setup: chord AB subtends 90° at centre O, radius r = 10 cm, so the major sector angle = 360° − 90° = 270°.", "[1 mark] Area of major sector = (270/360) × πr² = (3/4) × π × 100.", "[1 mark] = (3/4) × 3.14 × 100 = 235.5 cm².", "[1 mark] Triangle OAB (right-angled at O): area = (1/2) × 10 × 10 = 50 cm².", "[1 mark] Area of major segment = area of major sector + area of triangle = 235.5 + 50 = 285.5 cm²."],
    finalAnswer: "Major segment = 285.5 cm².",
    ncertRef: "Exemplar Sample Question 1 (Ex 11.4)", isCompetencyBased: true,
    strategyHint: "For a major segment, add the triangle to the major sector." },

  { id: "ARC-N-EXEM-11-LA-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Combinations of Plane Figures", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "With vertices A, B and C of a right triangle ABC (right-angled at B) as centres, arcs of radius 5 cm each are drawn. If AB = 14 cm, BC = 48 cm and CA = 50 cm, find the area of the shaded region inside the triangle but outside the three sectors.",
    solutionSteps: ["[1 mark] Verification: 14² + 48² = 196 + 2304 = 2500 = 50², so ΔABC is right-angled at B.", "[1 mark] Area of ΔABC = (1/2) × AB × BC = (1/2) × 14 × 48 = 336 cm².", "[1 mark] Each sector contributes (∠/360) × π × 5², and the total angle = ∠A + ∠B + ∠C = 180° (angle sum of a triangle).", "[1 mark] Total sector area = (180/360) × π × 25 = (1/2) × π × 25 = 12.5 × 3.14 = 39.25 cm².", "[1 mark] Shaded area = area of triangle − total sector area = 336 − 39.25 = 296.75 cm²."],
    finalAnswer: "Shaded area = 296.75 cm².",
    ncertRef: "Exemplar Sample Question 2 (Ex 11.4)", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "ARC-N-EXEM-11-CB-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Grazing Increase", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A calf is tied with a rope at the corner of a square grassy lawn of side 20 m. The rope was originally 6 m. The owner extends the rope to 11.5 m (an increase of 5.5 m).\n(i) What sector angle does the calf graze at each rope length (since it's a corner)?\n(ii) Find the area grazed with the old 6 m rope.\n(iii) Find the area grazed with the new 11.5 m rope.\n(iv) Find the increase in grazing area.",
    solutionSteps: ["(i) At the corner of a square the calf grazes a quadrant ⇒ angle 90°.", "(ii) Old area = (90/360) × π × 6² = (1/4) × (22/7) × 36 = 198/7 ≈ 28.29 m².", "(iii) New area = (1/4) × (22/7) × 11.5² = (1/4) × (22/7) × 132.25 = 2909.5/28 ≈ 103.91 m².", "(iv) Increase = (π/4)(11.5² − 6²) = (π/4)(17.5)(5.5) = (22/7) × (96.25)/4 = (22 × 96.25)/28 = 2117.5/28 ≈ 75.625 m²."],
    finalAnswer: "(i) 90°; (ii) ≈ 28.29 m²; (iii) ≈ 103.91 m²; (iv) ≈ 75.625 m².",
    ncertRef: "Exemplar Sample Question 3 (Ex 11.4)", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "ARC-N-EXEM-11-CRE-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Sector", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a sector of a circle whose area is exactly 11 cm² and whose central angle equals 45°. Specify the radius and the arc length, and verify your design.",
    solutionSteps: ["Area = (θ/360) × πr² ⇒ 11 = (45/360) × (22/7) × r² ⇒ 11 = (1/8)(22/7)r² ⇒ r² = 11 × 8 × 7/22 = 28.", "r = √28 = 2√7 cm ≈ 5.29 cm.", "Arc length = (45/360) × 2π × 2√7 = (1/8) × 2 × (22/7) × 2√7 = (88√7)/(56) = (11√7)/7 cm ≈ 4.16 cm.", "Verify: Area = (1/8) × (22/7) × 28 = (22 × 28)/(8 × 7) = (22 × 4)/8 = 11 cm² ✓."],
    finalAnswer: "Design: radius r = 2√7 cm, angle 45°, arc length (11√7)/7 cm, area exactly 11 cm².",
    ncertRef: "Exemplar-style design task", isCompetencyBased: true,
    strategyHint: "Solve A = (θ/360)πr² for r once A and θ are fixed." },
];
