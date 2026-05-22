import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 8 (Introduction to Trigonometry) + Chapter 9 (Applications of Trigonometry)
// topicKey: "trigonometry" (single slug for both Ch8 and Ch9)
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (12 marks — highest-weight Maths chapter)
// IDs encode chapter (TRIG-N-NCERT-8-* for Ch8; TRIG-N-NCERT-9-* for Ch9)

export const TRIG_NCERT: CanonicalQuestion[] = [
  // ===================== CHAPTER 8: Introduction to Trigonometry =====================

  // ----- Examples / Exercise 8.1: Trigonometric Ratios -----
  { id: "TRIG-N-NCERT-8-SA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "In ∆ABC, right-angled at B, AB = 24 cm and BC = 7 cm. Determine sin A and cos A.",
    solutionSteps: [
      "Right-angled at B, so AC is the hypotenuse. By Pythagoras: AC² = AB² + BC² = 24² + 7² = 576 + 49 = 625.",
      "AC = 25 cm.",
      "For angle A: side opposite = BC = 7; side adjacent = AB = 24; hypotenuse = AC = 25.",
      "sin A = opposite / hypotenuse = BC / AC = 7/25.",
      "cos A = adjacent / hypotenuse = AB / AC = 24/25."
    ],
    finalAnswer: "sin A = 7/25, cos A = 24/25.",
    ncertRef: "NCERT Ex 8.1 Q1", isCompetencyBased: false,
    strategyHint: "Find the hypotenuse via Pythagoras first, then read sin/cos from the opposite/adjacent labels." },

  { id: "TRIG-N-NCERT-8-SA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If sin A = 3/4, calculate cos A and tan A.",
    solutionSteps: [
      "sin A = opposite/hypotenuse = 3/4, so let opposite = 3k and hypotenuse = 4k for some k > 0.",
      "By Pythagoras, adjacent² = hyp² − opp² = (4k)² − (3k)² = 16k² − 9k² = 7k².",
      "Adjacent = k√7.",
      "cos A = adjacent/hypotenuse = k√7 / 4k = √7 / 4.",
      "tan A = opposite/adjacent = 3k / (k√7) = 3/√7."
    ],
    finalAnswer: "cos A = √7/4, tan A = 3/√7.",
    ncertRef: "NCERT Ex 8.1 Q3", isCompetencyBased: true,
    strategyHint: "Set opp = 3k, hyp = 4k; the third side comes from Pythagoras." },

  { id: "TRIG-N-NCERT-8-SA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given 15 cot A = 8, find sin A and sec A.",
    solutionSteps: [
      "15 cot A = 8 ⇒ cot A = 8/15, so tan A = 15/8.",
      "tan A = opposite/adjacent = 15/8: let opposite = 15k, adjacent = 8k.",
      "Hypotenuse² = (15k)² + (8k)² = 225k² + 64k² = 289k² ⇒ hypotenuse = 17k.",
      "sin A = opposite/hypotenuse = 15k/17k = 15/17.",
      "sec A = hypotenuse/adjacent = 17k/8k = 17/8."
    ],
    finalAnswer: "sin A = 15/17, sec A = 17/8.",
    ncertRef: "NCERT Ex 8.1 Q4", isCompetencyBased: true,
    strategyHint: "Convert cot to a side-ratio (15/8), build the right triangle, get hypotenuse via Pythagoras." },

  { id: "TRIG-N-NCERT-8-LA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given sec θ = 13/12, calculate all other trigonometric ratios.",
    solutionSteps: [
      "sec θ = hypotenuse/adjacent = 13/12, so let hypotenuse = 13k and adjacent = 12k.",
      "By Pythagoras, opposite² = 13²k² − 12²k² = (169 − 144)k² = 25k² ⇒ opposite = 5k.",
      "cos θ = 1/sec θ = 12/13.",
      "sin θ = opposite/hypotenuse = 5k/13k = 5/13.",
      "tan θ = opposite/adjacent = 5k/12k = 5/12; cot θ = 12/5.",
      "cosec θ = hypotenuse/opposite = 13k/5k = 13/5."
    ],
    finalAnswer: "sin θ = 5/13, cos θ = 12/13, tan θ = 5/12, cot θ = 12/5, cosec θ = 13/5.",
    ncertRef: "NCERT Ex 8.1 Q5", isCompetencyBased: true,
    strategyHint: "Sec gives hyp/adj — set hyp = 13k, adj = 12k, get opp = 5k from Pythagoras, then read off all six ratios." },

  { id: "TRIG-N-NCERT-8-SA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If cot θ = 7/8, evaluate (1 + sin θ)(1 − sin θ) / [(1 + cos θ)(1 − cos θ)].",
    solutionSteps: [
      "(1 + sin θ)(1 − sin θ) = 1 − sin²θ = cos²θ.",
      "(1 + cos θ)(1 − cos θ) = 1 − cos²θ = sin²θ.",
      "So the expression equals cos²θ / sin²θ = cot²θ.",
      "Given cot θ = 7/8 ⇒ cot²θ = 49/64."
    ],
    finalAnswer: "49/64.",
    ncertRef: "NCERT Ex 8.1 Q7(i)", isCompetencyBased: true,
    strategyHint: "Use (1 − sin²θ) = cos²θ and (1 − cos²θ) = sin²θ — the whole thing collapses to cot²θ." },

  { id: "TRIG-N-NCERT-8-SA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In ∆ABC, right-angled at B, if tan A = 1/√3, find sin A cos C + cos A sin C.",
    solutionSteps: [
      "tan A = 1/√3 ⇒ ∠A = 30°, so ∠C = 60° (since the triangle is right-angled at B).",
      "sin A = sin 30° = 1/2; cos A = cos 30° = √3/2.",
      "sin C = sin 60° = √3/2; cos C = cos 60° = 1/2.",
      "sin A cos C + cos A sin C = (1/2)(1/2) + (√3/2)(√3/2) = 1/4 + 3/4 = 1."
    ],
    finalAnswer: "1.",
    ncertRef: "NCERT Ex 8.1 Q9(i)", isCompetencyBased: true,
    strategyHint: "tan A = 1/√3 ⇒ A = 30°. In a right triangle, A + C = 90°, so C = 60°." },

  { id: "TRIG-N-NCERT-8-MCQ-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following statements is true?",
    options: ["The value of tan A is always less than 1.", "sec A = 12/5 for some value of angle A.", "cos A is the abbreviation used for the cosecant of angle A.", "sin θ = 4/3 for some angle θ."],
    answer: "sec A = 12/5 for some value of angle A.",
    solutionSteps: [
      "(a) False — e.g. tan 60° = √3 > 1.",
      "(b) True — sec A = hyp/adj, and 12/5 > 1 is allowed since sec A ≥ 1.",
      "(c) False — 'cos' is cosine, not cosecant; cosec is the abbreviation for cosecant.",
      "(d) False — sin θ ≤ 1 always, so 4/3 is impossible."
    ],
    finalAnswer: "Option (b): sec A = 12/5 is possible.",
    ncertRef: "NCERT Ex 8.1 Q11", isCompetencyBased: true,
    strategyHint: "Remember sin/cos ≤ 1 and sec/cosec ≥ 1." },

  // ----- Exercise 8.2: Specific angles -----
  { id: "TRIG-N-NCERT-8-SA-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Evaluate sin 60° cos 30° + sin 30° cos 60°.",
    solutionSteps: [
      "sin 60° = √3/2, cos 30° = √3/2 ⇒ sin 60° · cos 30° = (√3/2)(√3/2) = 3/4.",
      "sin 30° = 1/2, cos 60° = 1/2 ⇒ sin 30° · cos 60° = (1/2)(1/2) = 1/4.",
      "Sum = 3/4 + 1/4 = 4/4 = 1."
    ],
    finalAnswer: "1.",
    ncertRef: "NCERT Ex 8.2 Q1(i)", isCompetencyBased: false,
    strategyHint: "This is the standard-angles expansion of sin(60° + 30°) = sin 90° = 1." },

  { id: "TRIG-N-NCERT-8-SA-007", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Evaluate 2 tan²45° + cos²30° − sin²60°.",
    solutionSteps: [
      "tan 45° = 1 ⇒ 2 tan²45° = 2(1)² = 2.",
      "cos 30° = √3/2 ⇒ cos²30° = 3/4.",
      "sin 60° = √3/2 ⇒ sin²60° = 3/4.",
      "Expression = 2 + 3/4 − 3/4 = 2."
    ],
    finalAnswer: "2.",
    ncertRef: "NCERT Ex 8.2 Q1(ii)", isCompetencyBased: false,
    strategyHint: "cos 30° and sin 60° are both √3/2 — their squares cancel." },

  { id: "TRIG-N-NCERT-8-MCQ-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The value of (2 tan 30°) / (1 + tan²30°) equals:",
    options: ["sin 60°", "cos 60°", "tan 60°", "sin 30°"],
    answer: "sin 60°",
    solutionSteps: [
      "tan 30° = 1/√3, so 2 tan 30° = 2/√3.",
      "1 + tan²30° = 1 + 1/3 = 4/3.",
      "Ratio = (2/√3) / (4/3) = (2/√3) × (3/4) = 6/(4√3) = 3/(2√3) = √3/2.",
      "√3/2 = sin 60°."
    ],
    finalAnswer: "sin 60° — option (a).",
    ncertRef: "NCERT Ex 8.2 Q2(i)", isCompetencyBased: true,
    strategyHint: "Direct substitution and simplification; the answer matches √3/2 = sin 60°." },

  { id: "TRIG-N-NCERT-8-SA-008", subject: "Maths", topicKey: "trigonometry", subtopic: "Ratios of Specific Angles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If tan(A + B) = √3 and tan(A − B) = 1/√3; 0° < A + B ≤ 90°, A > B, find A and B.",
    solutionSteps: [
      "tan(A + B) = √3 ⇒ A + B = 60°.",
      "tan(A − B) = 1/√3 ⇒ A − B = 30°.",
      "Adding: 2A = 90° ⇒ A = 45°.",
      "Subtracting: 2B = 30° ⇒ B = 15°."
    ],
    finalAnswer: "A = 45°, B = 15°.",
    ncertRef: "NCERT Ex 8.2 Q3", isCompetencyBased: true,
    strategyHint: "Read off the angles from standard tan values, then solve the two-equation system." },

  // ----- Exercise 8.3: Complementary angles -----
  { id: "TRIG-N-NCERT-8-SA-009", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Evaluate sin 18° / cos 72°.",
    solutionSteps: [
      "Use cos(90° − A) = sin A. Here cos 72° = cos(90° − 18°) = sin 18°.",
      "So sin 18° / cos 72° = sin 18° / sin 18° = 1."
    ],
    finalAnswer: "1.",
    ncertRef: "NCERT Ex 8.3 Q1(i)", isCompetencyBased: true,
    strategyHint: "Recognise 18° and 72° as complementary; rewrite cos 72° as sin 18°." },

  { id: "TRIG-N-NCERT-8-SA-010", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Show that cos 38° cos 52° − sin 38° sin 52° = 0.",
    solutionSteps: [
      "Note 38° and 52° are complementary (38° + 52° = 90°).",
      "Use cos 52° = cos(90° − 38°) = sin 38°.",
      "Use sin 52° = sin(90° − 38°) = cos 38°.",
      "Substitute: cos 38°·sin 38° − sin 38°·cos 38° = 0.",
      "Hence proved."
    ],
    finalAnswer: "LHS = 0 = RHS.",
    ncertRef: "NCERT Ex 8.3 Q2(ii)", isCompetencyBased: true,
    strategyHint: "Convert one of the pair using cos(90°−A) and sin(90°−A); the terms cancel." },

  { id: "TRIG-N-NCERT-8-SA-011", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If tan 2A = cot(A − 18°), where 2A is an acute angle, find the value of A.",
    solutionSteps: [
      "Use tan 2A = cot(90° − 2A).",
      "So cot(90° − 2A) = cot(A − 18°).",
      "Equate the arguments: 90° − 2A = A − 18°.",
      "108° = 3A ⇒ A = 36°."
    ],
    finalAnswer: "A = 36°.",
    ncertRef: "NCERT Ex 8.3 Q3", isCompetencyBased: true,
    strategyHint: "Convert tan to cot via tan θ = cot(90° − θ), then equate arguments." },

  { id: "TRIG-N-NCERT-8-SA-012", subject: "Maths", topicKey: "trigonometry", subtopic: "Complementary Angles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If sec 4A = cosec(A − 20°), where 4A is an acute angle, find the value of A.",
    solutionSteps: [
      "Use sec θ = cosec(90° − θ).",
      "So cosec(90° − 4A) = cosec(A − 20°).",
      "Equate arguments: 90° − 4A = A − 20°.",
      "110° = 5A ⇒ A = 22°."
    ],
    finalAnswer: "A = 22°.",
    ncertRef: "NCERT Ex 8.3 Q5", isCompetencyBased: true,
    strategyHint: "Convert sec to cosec using sec θ = cosec(90° − θ); equate arguments." },

  // ----- Exercise 8.4: Identities -----
  { id: "TRIG-N-NCERT-8-MCQ-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "9 sec²A − 9 tan²A equals:",
    options: ["1", "9", "8", "0"],
    answer: "9",
    solutionSteps: [
      "Factor: 9 sec²A − 9 tan²A = 9(sec²A − tan²A).",
      "Use the identity sec²A − tan²A = 1.",
      "So the expression = 9 × 1 = 9."
    ],
    finalAnswer: "9 — option (b).",
    ncertRef: "NCERT Ex 8.4 Q4(i)", isCompetencyBased: false,
    strategyHint: "Factor out 9 and apply sec²A − tan²A = 1." },

  { id: "TRIG-N-NCERT-8-MCQ-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "(sec A + tan A)(1 − sin A) equals:",
    options: ["sec A", "sin A", "cosec A", "cos A"],
    answer: "cos A",
    solutionSteps: [
      "(sec A + tan A)(1 − sin A) = (1/cos A + sin A/cos A)(1 − sin A) = [(1 + sin A)/cos A] · (1 − sin A).",
      "= (1 − sin²A) / cos A = cos²A / cos A = cos A."
    ],
    finalAnswer: "cos A — option (d).",
    ncertRef: "NCERT Ex 8.4 Q4(iii)", isCompetencyBased: true,
    strategyHint: "Combine into (1 + sin A)/cos A, then use (1 + sin A)(1 − sin A) = 1 − sin²A = cos²A." },

  { id: "TRIG-N-NCERT-8-LA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Prove the identity: cos A/(1 + sin A) + (1 + sin A)/cos A = 2 sec A.",
    solutionSteps: [
      "Take LHS and combine over a common denominator cos A · (1 + sin A):",
      "LHS = [cos²A + (1 + sin A)²] / [cos A (1 + sin A)].",
      "Expand numerator: cos²A + 1 + 2 sin A + sin²A = (cos²A + sin²A) + 1 + 2 sin A = 1 + 1 + 2 sin A = 2 + 2 sin A.",
      "= 2(1 + sin A).",
      "So LHS = 2(1 + sin A) / [cos A (1 + sin A)] = 2/cos A = 2 sec A = RHS.",
      "Hence proved."
    ],
    finalAnswer: "LHS = 2 sec A = RHS.",
    ncertRef: "NCERT Ex 8.4 Q5(ii)", isCompetencyBased: true,
    strategyHint: "Combine fractions, expand the numerator, and use sin²A + cos²A = 1." },

  { id: "TRIG-N-NCERT-8-LA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Identities", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Prove the identity: √[(1 + sin A)/(1 − sin A)] = sec A + tan A.",
    solutionSteps: [
      "Rationalise inside the square root by multiplying numerator and denominator by (1 + sin A):",
      "(1 + sin A)/(1 − sin A) = (1 + sin A)² / [(1 − sin A)(1 + sin A)] = (1 + sin A)² / (1 − sin²A) = (1 + sin A)² / cos²A.",
      "Take the (positive) square root: √[(1 + sin A)² / cos²A] = (1 + sin A) / cos A (taking +ve root since A acute).",
      "= 1/cos A + sin A/cos A = sec A + tan A.",
      "Hence LHS = sec A + tan A = RHS. Proved."
    ],
    finalAnswer: "LHS = sec A + tan A = RHS.",
    ncertRef: "NCERT Ex 8.4 Q5(vi)", isCompetencyBased: true,
    strategyHint: "Multiply inside the radical by (1 + sin A)/(1 + sin A) to get a perfect square over cos²A." },

  // ===================== CHAPTER 9: Applications of Trigonometry =====================

  // ----- Worked Examples Ch9 -----
  { id: "TRIG-N-NCERT-9-SA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A tower stands vertically on the ground. From a point on the ground, 15 m from the foot of the tower, the angle of elevation of the top of the tower is 60°. Find the height of the tower.",
    solutionSteps: [
      "Picture: right triangle with horizontal leg = 15 m (distance from point to tower foot), angle of elevation 60° at the observer's foot, vertical leg = height of tower h.",
      "tan 60° = opposite/adjacent = h / 15.",
      "tan 60° = √3, so √3 = h / 15.",
      "h = 15√3 m."
    ],
    finalAnswer: "Height of the tower = 15√3 m ≈ 25.98 m.",
    ncertRef: "NCERT Example 1 (Ch9)", isCompetencyBased: true,
    strategyHint: "Use tan(angle) = height/distance to the foot." },

  { id: "TRIG-N-NCERT-9-LA-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "From a point P on the ground, the angle of elevation of the top of a 10 m tall building is 30°. A flag is hoisted at the top of the building and the angle of elevation of the top of the flagstaff from P is 45°. Find the length of the flagstaff and the distance of the building from the point P. (Take √3 = 1.732.)",
    solutionSteps: [
      "Let A be the foot of the building, B the top of the building, D the top of the flagstaff; P is on the ground. AB = 10 m (building), BD = x (flagstaff). PA = distance from P to building foot.",
      "In right ∆PAB: tan 30° = AB/PA ⇒ 1/√3 = 10/PA ⇒ PA = 10√3 m = 10(1.732) = 17.32 m.",
      "In right ∆PAD: tan 45° = AD/PA = (10 + x)/PA. Since tan 45° = 1, AD = PA = 10√3.",
      "10 + x = 10√3 ⇒ x = 10√3 − 10 = 10(√3 − 1) = 10(1.732 − 1) = 10(0.732) = 7.32 m.",
      "So the flagstaff is 7.32 m long and the building is 17.32 m from P."
    ],
    finalAnswer: "Length of flagstaff = 7.32 m; distance of building from P = 17.32 m.",
    ncertRef: "NCERT Example 4 (Ch9)", isCompetencyBased: true,
    strategyHint: "Two right triangles share the same base PA — solve the simpler one (30°) first, then plug into the 45° one." },

  { id: "TRIG-N-NCERT-9-LA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The shadow of a tower standing on level ground is 40 m longer when the Sun's altitude is 30° than when it is 60°. Find the height of the tower.",
    solutionSteps: [
      "Let the tower be AB with height h, B the foot. Let BC = x (shadow at 60° altitude), BD = x + 40 (shadow at 30° altitude).",
      "In ∆ABC (right-angled at B), tan 60° = h/x ⇒ √3 = h/x ⇒ h = x√3.   …(1)",
      "In ∆ABD (right-angled at B), tan 30° = h/(x + 40) ⇒ 1/√3 = h/(x + 40) ⇒ h = (x + 40)/√3.   …(2)",
      "Equate (1) and (2): x√3 = (x + 40)/√3 ⇒ 3x = x + 40 ⇒ 2x = 40 ⇒ x = 20.",
      "Substitute back: h = 20√3 m."
    ],
    finalAnswer: "Height of the tower = 20√3 m ≈ 34.64 m.",
    ncertRef: "NCERT Example 5 (Ch9)", isCompetencyBased: true,
    strategyHint: "Two right triangles share the tower; write tan for each angle and eliminate x." },

  // ----- Exercise 9.1 -----
  { id: "TRIG-N-NCERT-9-SA-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A circus artist is climbing a 20 m long rope, which is tightly stretched and tied from the top of a vertical pole to the ground. Find the height of the pole if the rope makes an angle of 30° with the ground.",
    solutionSteps: [
      "Right triangle: hypotenuse = rope = 20 m; angle with ground = 30°; opposite side = height h.",
      "sin 30° = opposite/hypotenuse = h/20.",
      "1/2 = h/20 ⇒ h = 10."
    ],
    finalAnswer: "Height of the pole = 10 m.",
    ncertRef: "NCERT Ex 9.1 Q1", isCompetencyBased: true,
    strategyHint: "Rope is the hypotenuse; use sin for opposite/hypotenuse." },

  { id: "TRIG-N-NCERT-9-SA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A tree breaks due to a storm and the broken part bends so that the top of the tree touches the ground making an angle of 30° with it. The distance between the foot of the tree and the point where the top touches the ground is 8 m. Find the height of the tree.",
    solutionSteps: [
      "Let the unbroken part standing upright be BC = h (vertical), and the broken/leaning part CA = ℓ. The broken top touches the ground at A, 8 m from B (foot).",
      "Angle at A = 30°; right angle is at B.",
      "tan 30° = BC/BA ⇒ 1/√3 = h/8 ⇒ h = 8/√3 = 8√3/3 m.",
      "cos 30° = BA/CA ⇒ √3/2 = 8/ℓ ⇒ ℓ = 16/√3 = 16√3/3 m.",
      "Total height of tree = h + ℓ = 8√3/3 + 16√3/3 = 24√3/3 = 8√3 m."
    ],
    finalAnswer: "Height of the tree = 8√3 m ≈ 13.86 m.",
    ncertRef: "NCERT Ex 9.1 Q2", isCompetencyBased: true,
    strategyHint: "Original tree height = standing part + leaning part. Use tan for vertical part, cos for the hypotenuse (leaning part)." },

  { id: "TRIG-N-NCERT-9-SA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a tower from a point on the ground, which is 30 m from the foot of the tower, is 30°. Find the height of the tower.",
    solutionSteps: [
      "tan 30° = height/distance = h/30.",
      "1/√3 = h/30 ⇒ h = 30/√3 = 10√3 m."
    ],
    finalAnswer: "Height of the tower = 10√3 m ≈ 17.32 m.",
    ncertRef: "NCERT Ex 9.1 Q4", isCompetencyBased: true,
    strategyHint: "tan(elevation) = height / horizontal distance." },

  { id: "TRIG-N-NCERT-9-SA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A kite is flying at a height of 60 m above the ground. The string attached to the kite is temporarily tied to a point on the ground; the inclination of the string with the ground is 60°. Find the length of the string assuming no slack.",
    solutionSteps: [
      "Let string length = ℓ. Height of kite = 60 m. Angle of inclination with ground = 60°.",
      "sin 60° = opposite/hypotenuse = 60/ℓ.",
      "√3/2 = 60/ℓ ⇒ ℓ = 120/√3 = 40√3 m."
    ],
    finalAnswer: "Length of string = 40√3 m ≈ 69.28 m.",
    ncertRef: "NCERT Ex 9.1 Q5", isCompetencyBased: true,
    strategyHint: "String = hypotenuse; height = opposite to angle of inclination." },

  { id: "TRIG-N-NCERT-9-LA-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Elevation", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A 1.5 m tall boy is standing at some distance from a 30 m tall building. The angle of elevation from his eyes to the top of the building increases from 30° to 60° as he walks towards the building. Find the distance he walked towards the building.",
    solutionSteps: [
      "Height available above eye-level = 30 − 1.5 = 28.5 m.",
      "Let the initial horizontal distance from eye to top of building be x and final be y. Walking forward gives 30° → 60°.",
      "At 30°: tan 30° = 28.5/x ⇒ x = 28.5 √3.",
      "At 60°: tan 60° = 28.5/y ⇒ y = 28.5/√3 = 28.5√3/3 = 9.5√3.",
      "Distance walked = x − y = 28.5√3 − 9.5√3 = 19√3 m.",
      "Numerically ≈ 19 × 1.732 ≈ 32.9 m."
    ],
    finalAnswer: "Distance walked = 19√3 m ≈ 32.9 m.",
    ncertRef: "NCERT Ex 9.1 Q6", isCompetencyBased: true,
    strategyHint: "Work with the height ABOVE the eye level (30 − 1.5), not the full 30 m." },

  { id: "TRIG-N-NCERT-9-LA-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "From a point on the ground, the angles of elevation of the bottom and the top of a transmission tower fixed at the top of a 20 m high building are 45° and 60° respectively. Find the height of the tower.",
    solutionSteps: [
      "Let the building be AB = 20 m and the tower be BC = h on top of it. Let P be the point on the ground at distance d from A. ∠APB = 45° (to top of building) and ∠APC = 60° (to top of tower).",
      "In ∆PAB: tan 45° = 20/d ⇒ 1 = 20/d ⇒ d = 20 m.",
      "In ∆PAC: tan 60° = (20 + h)/d = (20 + h)/20.",
      "√3 = (20 + h)/20 ⇒ 20 + h = 20√3 ⇒ h = 20√3 − 20 = 20(√3 − 1).",
      "Numerically ≈ 20(0.732) ≈ 14.64 m."
    ],
    finalAnswer: "Height of the tower = 20(√3 − 1) m ≈ 14.64 m.",
    ncertRef: "NCERT Ex 9.1 Q7", isCompetencyBased: true,
    strategyHint: "Two angles from the same point ⇒ two right triangles sharing the same horizontal distance." },

  { id: "TRIG-N-NCERT-9-LA-005", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The angle of elevation of the top of a building from the foot of the tower is 30°, and the angle of elevation of the top of the tower from the foot of the building is 60°. If the tower is 50 m high, find the height of the building.",
    solutionSteps: [
      "Let the building be PQ (height = h) and the tower be RS (height = 50 m). The distance between their feet is d.",
      "From foot of tower (R), angle of elevation of top of building (P) = 30°: tan 30° = h/d ⇒ 1/√3 = h/d ⇒ d = h√3.   …(1)",
      "From foot of building (Q), angle of elevation of top of tower (S) = 60°: tan 60° = 50/d ⇒ √3 = 50/d ⇒ d = 50/√3.   …(2)",
      "Equate (1) and (2): h√3 = 50/√3 ⇒ 3h = 50 ⇒ h = 50/3.",
      "Numerically ≈ 16.67 m."
    ],
    finalAnswer: "Height of the building = 50/3 m ≈ 16.67 m.",
    ncertRef: "NCERT Ex 9.1 Q9", isCompetencyBased: true,
    strategyHint: "Two angles, two right triangles, same horizontal distance — equate d from each." },

  { id: "TRIG-N-NCERT-9-CB-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Depression", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "As observed from the top of a 75 m high lighthouse from sea-level, the angles of depression of two ships are 30° and 45° respectively. The ships are on the same side of the lighthouse and one ship is exactly behind the other.\n(a) Draw a clean labelled diagram in your mind/on rough work.\n(b) Find the horizontal distance from the foot of the lighthouse to each ship.\n(c) Hence find the distance between the two ships.",
    solutionSteps: [
      "Let the lighthouse be AB with A = top, B = foot, AB = 75 m. Let C and D be the two ships on the sea, with C nearer.",
      "Angle of depression from A to nearer ship C = 45° ⇒ angle ∠ACB (elevation from C to A) = 45°.",
      "Angle of depression from A to farther ship D = 30° ⇒ ∠ADB = 30°.",
      "In ∆ABC: tan 45° = 75/BC ⇒ 1 = 75/BC ⇒ BC = 75 m (distance from lighthouse to nearer ship).",
      "In ∆ABD: tan 30° = 75/BD ⇒ 1/√3 = 75/BD ⇒ BD = 75√3 m (distance to farther ship).",
      "Distance between the two ships = BD − BC = 75√3 − 75 = 75(√3 − 1) m ≈ 75(0.732) ≈ 54.9 m."
    ],
    finalAnswer: "Nearer ship at 75 m, farther ship at 75√3 m; distance between them = 75(√3 − 1) m ≈ 54.9 m.",
    ncertRef: "NCERT Ex 9.1 Q13", isCompetencyBased: true,
    strategyHint: "Angle of depression from the top = angle of elevation from the bottom (alternate angles)." },

  { id: "TRIG-N-NCERT-9-LA-006", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A 1.2 m tall girl spots a balloon moving with the wind in a horizontal line at a height of 88.2 m from the ground. The angle of elevation of the balloon from her eyes at any instant is 60°. After some time, the angle of elevation reduces to 30°. Find the distance travelled by the balloon during the interval.",
    solutionSteps: [
      "Effective vertical height above eye level = 88.2 − 1.2 = 87 m (balloon moves along this horizontal line).",
      "Let x₁ = horizontal distance from girl's eyes to balloon when angle = 60°; x₂ = horizontal distance when angle = 30°.",
      "At 60°: tan 60° = 87/x₁ ⇒ x₁ = 87/√3 = 29√3.",
      "At 30°: tan 30° = 87/x₂ ⇒ x₂ = 87√3.",
      "Distance travelled = x₂ − x₁ = 87√3 − 29√3 = 58√3 m.",
      "Numerically ≈ 58 × 1.732 ≈ 100.46 m."
    ],
    finalAnswer: "Distance travelled = 58√3 m ≈ 100.46 m.",
    ncertRef: "NCERT Ex 9.1 Q14", isCompetencyBased: true,
    strategyHint: "Subtract the girl's height before applying trig: working height = 88.2 − 1.2 = 87 m." },

  { id: "TRIG-N-NCERT-9-CB-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Angle of Depression", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A straight highway leads to the foot of a tower. A man standing at the top of the tower observes a car at an angle of depression of 30° approaching the foot of the tower with uniform speed. Six seconds later the angle of depression of the car becomes 60°.\n(a) If the height of the tower is h, find the distance from the foot at both observations.\n(b) Find the time taken by the car (from the second observation) to reach the foot of the tower.",
    solutionSteps: [
      "Let the tower have height h. Let the first car position be C₁ (depression 30°) and the second position be C₂ (depression 60°), with C₂ closer to the foot.",
      "Distance from foot at first observation: tan 30° = h / d₁ ⇒ d₁ = h√3.",
      "Distance from foot at second observation: tan 60° = h / d₂ ⇒ d₂ = h/√3.",
      "Distance covered in 6 seconds = d₁ − d₂ = h√3 − h/√3 = h(3 − 1)/√3 = 2h/√3.",
      "Speed = (2h/√3) / 6 = h/(3√3).",
      "Time to cover remaining distance d₂ = h/√3 at this speed = (h/√3) ÷ (h/(3√3)) = (h/√3) × (3√3/h) = 3 seconds."
    ],
    finalAnswer: "The car takes 3 more seconds (from the second observation) to reach the foot of the tower.",
    ncertRef: "NCERT Ex 9.1 Q15", isCompetencyBased: true,
    strategyHint: "Speed = (distance covered)/(time). Use that same speed to find remaining time = d₂/speed." },
];
