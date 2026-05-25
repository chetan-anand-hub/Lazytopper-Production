import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "trigonometry"
// Extraction date: 2026-05-24

export const TRIGONOMETRY_APQ: CanonicalQuestion[] = [
  // PQ1 Q10 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRIG-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trig Identity cosec(θ) and sec(90°−θ)", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a table with values of cosecant and secant of different angles. θ = 35° or 65°; cosec θ = P or 1.1; sec(90° − θ) = 1.7 or Q. What are the values of P and Q respectively?",
    options: ["1/1.7 and 1/1.1", "1.1 and 1.7", "1.7 and 1.1", "(cannot be found with the given information)"],
    answer: "1.7 and 1.1",
    solutionSteps: ["Identity: sec(90° − θ) = cosec θ. So for θ = 35°: sec(90° − 35°) = sec 55° = cosec 35° = P. Given sec(90° − θ) for θ = 35° row = 1.7, so P = 1.7.", "For θ = 65°: cosec 65° = 1.1 (given). Q = sec(90° − 65°) = sec 25° = cosec 65° = 1.1."],
    finalAnswer: "(c) 1.7 and 1.1",
    ncertRef: "APQ PQ1 Q10", isCompetencyBased: true },

  // PQ1 Q11 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRIG-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Sine of an Angle in a Square", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the figure, PQRS is a square. What is the value of sin ∠SPT?",
    options: ["8/17", "8/15", "15/17", "(cannot be found with the given information)"],
    answer: "8/17",
    solutionSteps: ["From figure: triangle SPT with given sides yields a 8-15-17 right-triangle relation.", "Per MS: sin ∠SPT = 8/17."],
    finalAnswer: "(a) 8/17",
    ncertRef: "APQ PQ1 Q11", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: square PQRS with diagonals or auxiliary point T." },

  // PQ1 Q12 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRIG-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Identifying Error in Trig Proof", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Shown below is a solved trigonometric problem. In which step is there an error in solving?",
    options: ["Step 1", "Step 2", "Step 3", "There is no error."],
    answer: "Step 1",
    solutionSteps: ["Per MS: the error is in step 1 of the solution shown in the PDF."],
    finalAnswer: "(a) Step 1",
    ncertRef: "APQ PQ1 Q12", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: solved trigonometric problem with three steps shown in PDF." },

  // PQ2 Q10 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRIG-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Trig Ratios Manipulation", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If 4 cot θ − 5 = 0, then the value of (5 sin θ − 4 cos θ) / (5 sin θ + 4 cos θ) is",
    options: ["5/3", "5/6", "0", "1/6"],
    answer: "0",
    solutionSteps: ["cot θ = 5/4 ⟹ cos θ / sin θ = 5/4 ⟹ 4 cos θ = 5 sin θ.", "Numerator: 5 sin θ − 4 cos θ = 5 sin θ − 5 sin θ = 0. Whole expression = 0."],
    finalAnswer: "(c) 0",
    ncertRef: "APQ PQ2 Q10", isCompetencyBased: true },

  // PQ2 Q19 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-M-TRIG-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Max Value of Trig Expression", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Assertion(A): Maximum value of 1/sec θ + 1/cosec θ is 1. Reason(R): Maximum value of both sin θ and cos θ is 1.",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation of (A).",
      "Both A and (R) are true and (R) is not the correct explanation of (A).",
      "(A) is true but (R) is false.",
      "(A) is false but (R) is true."
    ],
    answer: "(A) is false but (R) is true.",
    solutionSteps: ["1/sec θ + 1/cosec θ = cos θ + sin θ. Max value of (cos θ + sin θ) = √2 (not 1). So A is FALSE.", "Max value of sin θ and cos θ individually is 1 — R is TRUE."],
    finalAnswer: "(d) (A) is false but (R) is true.",
    ncertRef: "APQ PQ2 Q19", isCompetencyBased: true },

  // PQ2 Q25 (Section B, Short, 2 marks)
  { id: "APQ-M-TRIG-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Evaluating Trig Expression", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If sin A − cos A = 0 for some acute angle A, then find the value of 2 tan^2 A + 1/cosec^2 A + 1.",
    answer: "7/2.",
    solutionSteps: ["sin A = cos A ⟹ tan A = 1 ⟹ A = 45°.", "2 tan^2 45° + 1/cosec^2 45° + 1 = 2(1)^2 + sin^2 45° + 1 = 2 + (1/√2)^2 + 1 = 2 + 1/2 + 1 = 7/2."],
    finalAnswer: "7/2.",
    ncertRef: "APQ PQ2 Q25", isCompetencyBased: false },

  // PQ2 Q29 (Section C, Short, 3 marks)
  { id: "APQ-M-TRIG-007", subject: "Maths", topicKey: "trigonometry", subtopic: "Trig Identity Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that: (sin^4 θ − cos^4 θ + 1) cosec^2 θ = 2. OR If sin x + cosec x = 2, then find the value of sin^19 x + cosec^20 x.",
    answer: "Identity proved [or] sin^19 x + cosec^20 x = 2.",
    solutionSteps: ["LHS = (sin^4 θ − cos^4 θ + 1) cosec^2 θ = [(sin^2 θ − cos^2 θ)(sin^2 θ + cos^2 θ) + 1] cosec^2 θ = (sin^2 θ − cos^2 θ + 1) cosec^2 θ.", "= (2 sin^2 θ) cosec^2 θ (using 1 − cos^2 θ = sin^2 θ) = 2.", "[OR] sin x + 1/sin x = 2 ⟹ sin^2 x − 2 sin x + 1 = 0 ⟹ (sin x − 1)^2 = 0 ⟹ sin x = 1. Then cosec x = 1, so sin^19 x + cosec^20 x = 1 + 1 = 2."],
    finalAnswer: "Proved [or] 2.",
    ncertRef: "APQ PQ2 Q29", isCompetencyBased: true },

  // PQ1 Q30 (Section C, Short, 3 marks)
  { id: "APQ-M-TRIG-008", subject: "Maths", topicKey: "trigonometry", subtopic: "Trig Construction in Semicircle", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Shown is a semicircle of radius 1 unit. Make necessary constructions and show the trig relation in the figure.",
    answer: "Geometric construction proof.",
    solutionSteps: ["Draw radius OR with R on the diameter PQ. In ΔRPO: sin θ = RP/OR ⟹ RP = sin θ (since OR = 1).", "Also cos θ = PO/OR ⟹ PO = cos θ.", "Using these in ΔRPQ, the required relation follows by elementary trigonometry."],
    finalAnswer: "Relations sin θ = RP and cos θ = PO established in unit-radius semicircle.",
    ncertRef: "APQ PQ1 Q30", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: semicircle with radius 1 and constructed angle θ." },

  // PQ2 Q34 (Section D, Long, 5 marks)
  { id: "APQ-M-TRIG-009", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances — Angle of Depression", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A man on the top of a vertical tower observes a car moving at a uniform speed coming directly towards it. If it takes 12 minutes for the angle of depression to change from 30° to 45°, how soon after this will the car reach the tower? Give your answer to nearest minutes. (Use √3 = 1.73). OR If the angle of elevation of a cloud from a point 10 metres above a lake is 30° and the angle of depression of its reflection in the lake is 60°, find the height of the cloud from the surface of the lake.",
    answer: "~16 minutes. [OR] 20 m.",
    solutionSteps: ["Let speed = x km/h ⟹ DC = 12x metres (m if x is m/min). In ΔABC, tan 30° = AB/BC ⟹ BC = √3·AB.", "In ΔABD, tan 45° = AB/BD ⟹ BD = AB.", "DC = BC − BD = (√3 − 1)·AB ⟹ AB = 12x/(√3 − 1). Time from D to B = BD/x = AB/x = 12/(√3 − 1) = 6(√3 + 1) ≈ 16 minutes.", "[OR] Let cloud at height h above lake, observer at 10 m. Let horizontal distance = x. In elevation triangle: tan 30° = (h − 10)/x. In depression triangle (to reflection): tan 60° = (h + 10)/x. Divide: tan 60°/tan 30° = (h + 10)/(h − 10) ⟹ 3 = (h + 10)/(h − 10) ⟹ 3h − 30 = h + 10 ⟹ h = 20 m."],
    finalAnswer: "~16 minutes [or] cloud height = 20 m.",
    ncertRef: "APQ PQ2 Q34", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants." },

  // PQ1 Q38 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-TRIG-010", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances — Real-world Drone", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A drone with high resolution camera can fly up to 100 m height above ground level. David rode an open jeep into a forest. (i) David stopped the drone at horizontal distance 5√3 m from the top of a tall tree, vertical distance 65 m below its max range. Angle of elevation of drone from tree-top was 30°. Find the height of the tree. (ii) The drone was flying at 30√3 m height when it spotted a zebra below. It travelled 30 m and saw the zebra at angle of depression θ. Find θ. (iii) After 2 minutes, both stopped; given the position figure, find the average speed of the drone. OR (iii) The angle of depression from drone to tiger changed from 30° to 45° in 3 seconds. Find the average speed of the tiger. (Use √3 = 1.73.)",
    answer: "(i) 30 m. (ii) 60°. (iii) ~10.42 m/s. [OR] ~13.14 m/s.",
    solutionSteps: ["(i) Vertical distance from tree-top to drone = 5√3 · tan 30° = 5√3 · (1/√3) = 5 m. Tree height = 100 − 65 − 5 = 30 m.", "(ii) tan θ = 30√3 / 30 = √3 ⟹ θ = 60°.", "(iii) Drone covered horizontal distance corresponding to jeep covering 10 m/s × 120 s = 1200 m, plus additional 50 m. Total drone horizontal = 1250 m in 120 s ⟹ 1250/120 = 10.42 m/s.", "[OR] Initial horizontal x = 54√3 · tan 30° = 54√3 · (1/√3) = 54 m. Final = 54√3 · tan 45° = 54√3 m. Distance covered by tiger = 54√3 − 54 ≈ 39.42 m in 3 s ⟹ speed ≈ 13.14 m/s."],
    finalAnswer: "(i) 30 m; (ii) 60°; (iii) ~10.42 m/s [or] ~13.14 m/s.",
    ncertRef: "APQ PQ1 Q38", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for all sub-parts." },
];
