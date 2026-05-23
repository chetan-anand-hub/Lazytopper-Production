import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 9: Circles
// PDF file used: jeep209.pdf — verified Page 1 = "CHAPTER 9 CIRCLES"
// topicKey: "circles"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (full chapter in scope — tangents to a circle)
// Coverage: Exemplar 9.1 MCQs, 9.2 True/False reasoning, 9.3 Short Answer, 9.4 Long Answer.

export const CIRC_EXEMPLAR: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "CIRC-N-EXEM-10-MCQ-001", subject: "Maths", topicKey: "circles", subtopic: "Concentric Circles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If radii of two concentric circles are 4 cm and 5 cm, then the length of each chord of one circle which is tangent to the other circle is",
    options: ["3 cm", "6 cm", "9 cm", "1 cm"],
    answer: "6 cm",
    solutionSteps: ["Let AB be a chord of the larger circle tangent to the smaller circle at P. OP ⊥ AB, OP = 4.", "OA = 5. In right ∆OPA: AP² = 25 − 16 = 9 ⇒ AP = 3.", "AB = 2 × AP = 6 cm."],
    finalAnswer: "6 cm — option (b).",
    ncertRef: "Exemplar Ex 9.1 Q1", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-MCQ-002", subject: "Maths", topicKey: "circles", subtopic: "Angle Between Tangents", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If two tangents inclined at an angle 60° are drawn to a circle of radius 3 cm, then the length of each tangent is",
    options: ["(3/2)√3 cm", "6 cm", "3 cm", "3√3 cm"],
    answer: "3√3 cm",
    solutionSteps: ["Let T be the external point. OT bisects the 60° angle, so ∠OTP = 30°.", "In right ∆OPT (right-angled at P): tan 30° = OP/TP ⇒ TP = OP/tan 30° = 3/(1/√3) = 3√3 cm."],
    finalAnswer: "3√3 cm — option (d).",
    ncertRef: "Exemplar Ex 9.1 Q9", isCompetencyBased: true,
    strategyHint: "Use half the angle at the external point inside the right triangle." },

  { id: "CIRC-N-EXEM-10-MCQ-003", subject: "Maths", topicKey: "circles", subtopic: "Quadrilateral PQOR Area", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "From a point P at a distance of 13 cm from the centre O of a circle of radius 5 cm, the pair of tangents PQ and PR are drawn. The area of the quadrilateral PQOR is",
    options: ["60 cm²", "65 cm²", "30 cm²", "32.5 cm²"],
    answer: "60 cm²",
    solutionSteps: ["PQ = √(13² − 5²) = √144 = 12 cm. Similarly PR = 12 cm.", "Each of ∆PQO and ∆PRO is right-angled with legs 5 and 12.", "Area of one such triangle = (1/2) × 5 × 12 = 30 cm².", "Area(PQOR) = 2 × 30 = 60 cm²."],
    finalAnswer: "60 cm² — option (a).",
    ncertRef: "Exemplar Ex 9.1 Q4", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-MCQ-004", subject: "Maths", topicKey: "circles", subtopic: "Tangent–Chord Angle", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "AB is a chord of a circle and AOC is its diameter such that ∠ACB = 50°. If AT is the tangent to the circle at A, then ∠BAT equals",
    options: ["65°", "60°", "50°", "40°"],
    answer: "50°",
    solutionSteps: ["∠ABC = 90° (angle in a semicircle), so in ∆ABC: ∠BAC = 180° − 90° − 50° = 40°.", "AT ⊥ AC (radius OA along AC ⇒ tangent ⊥ radius). So ∠OAT = 90°.", "∠BAT = ∠OAT − ∠BAC = 90° − 40° = 50°."],
    finalAnswer: "50° — option (c).",
    ncertRef: "Exemplar Ex 9.1 Q3", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-MCQ-005", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "AT is a tangent to a circle with centre O such that OT = 4 cm and ∠OTA = 30°. Then AT equals",
    options: ["4 cm", "2 cm", "2√3 cm", "4√3 cm"],
    answer: "2√3 cm",
    solutionSteps: ["In right ∆OAT (right angle at A): cos 30° = AT/OT.", "AT = 4 × cos 30° = 4 × (√3/2) = 2√3 cm."],
    finalAnswer: "2√3 cm — option (c).",
    ncertRef: "Exemplar Ex 9.1 Q6", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-MCQ-006", subject: "Maths", topicKey: "circles", subtopic: "Angle at Centre and Tangent", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If PA and PB are tangents to the circle with centre O such that ∠APB = 50°, then ∠OAB equals",
    options: ["25°", "30°", "40°", "50°"],
    answer: "25°",
    solutionSteps: ["PA = PB (equal tangents), so ∆PAB is isosceles with ∠PAB = ∠PBA = (180° − 50°)/2 = 65°.", "OA ⊥ PA ⇒ ∠OAP = 90°.", "∠OAB = ∠OAP − ∠BAP = 90° − 65° = 25°."],
    finalAnswer: "25° — option (a).",
    ncertRef: "Exemplar Ex 9.1 Q8", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "CIRC-N-EXEM-10-AR-001", subject: "Maths", topicKey: "circles", subtopic: "Angle Between Tangents", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): If the angle between two tangents drawn from an external point P to a circle of radius a is 90°, then OP = a√2.\nReason (R): In the right triangle formed by O, the point of contact and P, the angle at P is half the angle between the tangents.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["By R, the angle at P in the half-triangle is 45°. So sin 45° = a/OP ⇒ OP = a/sin 45° = a√2 — matches A.", "R is the standard 'OP bisects angle between tangents' result — true.", "R directly leads to A."],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Ex 9.2 Q5", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-AR-002", subject: "Maths", topicKey: "circles", subtopic: "Angle Between Tangents", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Assertion (A): If a chord AB subtends an angle of 60° at the centre of a circle, then the angle between the tangents at A and B is also 60°.\nReason (R): The angle between two tangents drawn from an external point is supplementary to the angle subtended by the chord of contact at the centre.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(D) Assertion is false but Reason is true.",
    solutionSteps: ["By R: angle between tangents = 180° − 60° = 120°, not 60°. So A is false.", "R is a standard NCERT result (Ex 10.2 Q10) — true."],
    finalAnswer: "Option (D).",
    ncertRef: "Exemplar Ex 9.2 Q1", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "CIRC-N-EXEM-10-VSA-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length Bound", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Is the statement 'The length of the tangent from an external point P on a circle with centre O is always less than OP' true? Justify briefly.",
    solutionSteps: ["Let P be external, T the point of contact. Then OT ⊥ PT, so in right ∆OTP, OP is the hypotenuse.", "Hypotenuse > each leg ⇒ PT < OP.", "Hence the statement is TRUE."],
    finalAnswer: "True; PT < OP because OP is the hypotenuse.",
    ncertRef: "Exemplar Ex 9.2 Q3", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-VSA-002", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length Bound", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Is it true that the length of the tangent from an external point on a circle is always greater than the radius of the circle? Justify with a counter-example.",
    solutionSteps: ["Take a circle of radius 5 and an external point P with OP = 6. Tangent length = √(36 − 25) = √11 ≈ 3.32, which is LESS than radius 5.", "Hence the statement is FALSE."],
    finalAnswer: "False; counter-example r = 5, OP = 6 gives tangent ≈ 3.32 < 5.",
    ncertRef: "Exemplar Ex 9.2 Q2", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-VSA-003", subject: "Maths", topicKey: "circles", subtopic: "Parallel Tangents", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Can the angle between two tangents drawn from an external point be 0°? Justify.",
    solutionSteps: ["If the angle were 0°, the two tangent rays would coincide, giving only one tangent from the external point.", "But from an external point, exactly two distinct tangents exist (NCERT Section 10.3). So the angle is strictly positive.", "Hence the statement is FALSE."],
    finalAnswer: "False; two distinct tangents make a strictly positive angle.",
    ncertRef: "Exemplar Ex 9.2 Q4", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "CIRC-N-EXEM-10-SA-001", subject: "Maths", topicKey: "circles", subtopic: "Concentric Circles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Out of two concentric circles, the radius of the outer circle is 5 cm and the chord AC of length 8 cm is a tangent to the inner circle. Find the radius of the inner circle.",
    solutionSteps: ["Let P be the point of contact on the inner circle. OP ⊥ AC and bisects AC at P, so AP = 4 cm.", "In right ∆OPA: OP² = OA² − AP² = 25 − 16 = 9.", "OP = 3 cm — the radius of the inner circle."],
    finalAnswer: "Radius of inner circle = 3 cm.",
    ncertRef: "Exemplar Ex 9.3 Q1", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-SA-002", subject: "Maths", topicKey: "circles", subtopic: "Cyclic Quadrilateral PQOR", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Two tangents PQ and PR are drawn from an external point P to a circle with centre O. Prove that QORP is a cyclic quadrilateral.",
    solutionSteps: ["∠OQP = ∠ORP = 90° (radius ⊥ tangent).", "Sum of opposite angles: ∠OQP + ∠ORP = 90° + 90° = 180°.", "A quadrilateral with opposite angles summing to 180° is cyclic.", "Hence QORP is cyclic."],
    finalAnswer: "Proved: QORP is cyclic.",
    ncertRef: "Exemplar Ex 9.3 Q2", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-SA-003", subject: "Maths", topicKey: "circles", subtopic: "Tangent–External Distance", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If from an external point B of a circle with centre O, two tangents BC and BD are drawn such that ∠DBC = 120°, prove that BO = 2BC.",
    solutionSteps: ["BO bisects ∠DBC, so ∠OBC = 60°. ∠OCB = 90° (radius ⊥ tangent).", "In right ∆OCB: cos 60° = BC/BO ⇒ BC = BO × (1/2).", "Hence BO = 2BC. Also BC + BD = 2BC = BO."],
    finalAnswer: "Proved: BO = 2BC (and BC + BD = BO).",
    ncertRef: "Exemplar Ex 9.3 Q3", isCompetencyBased: true,
    strategyHint: "OB bisects the angle between equal tangents." },

  { id: "CIRC-N-EXEM-10-SA-004", subject: "Maths", topicKey: "circles", subtopic: "Bisecting Arc", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "A chord PQ of a circle is parallel to the tangent drawn at a point R of the circle. Prove that R bisects the arc PRQ.",
    solutionSteps: ["Let O be the centre. OR is perpendicular to the tangent at R, and since the tangent is parallel to PQ, OR ⊥ PQ.", "A perpendicular from the centre to a chord bisects the chord, so OR bisects PQ.", "The perpendicular from the centre also bisects the corresponding arc: arc PR = arc RQ.", "Hence R bisects the arc PRQ."],
    finalAnswer: "Proved: R is the midpoint of arc PRQ.",
    ncertRef: "Exemplar Ex 9.3 Q8", isCompetencyBased: true },

  { id: "CIRC-N-EXEM-10-SA-005", subject: "Maths", topicKey: "circles", subtopic: "Two Concentric Circles", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "If d₁ and d₂ (with d₂ > d₁) are the diameters of two concentric circles and c is the length of a chord of the larger circle that is tangent to the smaller circle, prove that d₂² = c² + d₁².",
    solutionSteps: ["Let the chord AB of the larger circle touch the smaller circle at C. Then OC ⊥ AB and OC = d₁/2.", "OA = d₂/2 (radius of larger). C is the midpoint of AB, so CB = c/2.", "In right ∆OCB: OC² + CB² = OB² ⇒ (d₁/2)² + (c/2)² = (d₂/2)².", "Multiply by 4: d₁² + c² = d₂². Hence d₂² = c² + d₁²."],
    finalAnswer: "Proved: d₂² = c² + d₁².",
    ncertRef: "Exemplar Sample Question 1 (page 106)", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "CIRC-N-EXEM-10-LA-001", subject: "Maths", topicKey: "circles", subtopic: "Triangle Perimeter", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "From an external point P, two tangents PA and PB are drawn to a circle with centre O. At a point E on the circle, the tangent intersects PA at C and PB at D. If PA = 10 cm, find the perimeter of triangle PCD.",
    solutionSteps: ["By equal tangents: PA = PB = 10, CA = CE, DB = DE.", "Perimeter(PCD) = PC + CD + DP = PC + (CE + ED) + DP.", "Substitute CE = CA and ED = DB: Perimeter = PC + CA + DB + DP = (PC + CA) + (DP + DB) = PA + PB = 10 + 10 = 20.", "Therefore the perimeter of ∆PCD is 20 cm."],
    finalAnswer: "Perimeter of ∆PCD = 20 cm.",
    ncertRef: "Exemplar Ex 9.4 Q3", isCompetencyBased: true,
    strategyHint: "Repeatedly substitute equal-tangent lengths to collapse the perimeter to PA + PB." },

  { id: "CIRC-N-EXEM-10-LA-002", subject: "Maths", topicKey: "circles", subtopic: "Tangent at Diameter", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "AB is a diameter and AC is a chord of a circle with centre O such that ∠BAC = 30°. The tangent at C intersects extended AB at a point D. Prove that BC = BD.",
    solutionSteps: ["∠ACB = 90° (angle in a semicircle). In ∆ABC: ∠ABC = 180° − 90° − 30° = 60°.", "OC ⊥ CD (tangent ⊥ radius), so ∠OCD = 90°.", "∠OCB = ∠OBC (isosceles, OC = OB = radius), and ∠OBC = 60°. So ∠OCB = 60°.", "∠BCD = ∠OCD − ∠OCB = 90° − 60° = 30°.", "Exterior angle at B in ∆BCD: ∠OBC = 60° = ∠BDC + ∠BCD ⇒ ∠BDC = 60° − 30° = 30°.", "Thus ∠BCD = ∠BDC = 30° ⇒ ∆BCD is isosceles ⇒ BC = BD."],
    finalAnswer: "Proved: BC = BD.",
    ncertRef: "Exemplar Ex 9.4 Q8", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "CIRC-N-EXEM-10-CB-001", subject: "Maths", topicKey: "circles", subtopic: "Triangle Perimeter via Tangents", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A is a point at a distance 13 cm from the centre O of a circle of radius 5 cm. AP and AQ are tangents to the circle at P and Q. A tangent BC drawn at a point R on the minor arc PQ intersects AP at B and AQ at C.\n(i) Find AP.\n(ii) Are BP and BR equal? Why?\n(iii) Are CQ and CR equal? Why?\n(iv) Find the perimeter of ∆ABC.",
    solutionSteps: ["(i) In right ∆OPA: AP² = OA² − OP² = 169 − 25 = 144 ⇒ AP = 12 cm.", "(ii) BP and BR are tangents from the same external point B ⇒ BP = BR.", "(iii) Similarly CQ = CR.", "(iv) Perimeter(ABC) = AB + BC + CA = AB + (BR + RC) + CA = AB + BP + CQ + CA = (AB + BP) + (CA + CQ) = AP + AQ = 12 + 12 = 24 cm."],
    finalAnswer: "(i) AP = 12 cm; (ii) Yes (equal tangents from B); (iii) Yes (equal tangents from C); (iv) Perimeter = 24 cm.",
    ncertRef: "Exemplar Ex 9.4 Q14", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "CIRC-N-EXEM-10-CRE-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length Application", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Construct a configuration consisting of a circle of radius 6 cm and an external point P from which the two tangents are perpendicular to each other. Find OP, the tangent length, and verify your construction.",
    solutionSteps: ["If the two tangents are perpendicular, the angle between them is 90°. So the half-angle at P is 45°.", "In the right triangle formed by O, the point of contact and P: sin 45° = r/OP ⇒ OP = 6/sin 45° = 6√2 cm.", "Tangent length = OP × cos 45° = 6√2 × (√2/2) = 6 cm.", "Verification: r² + (tangent)² = OP² ⇒ 36 + 36 = 72 = (6√2)². ✓"],
    finalAnswer: "Design: r = 6 cm, OP = 6√2 cm, tangent length = 6 cm.",
    ncertRef: "Exemplar-style design task", isCompetencyBased: true },
];
