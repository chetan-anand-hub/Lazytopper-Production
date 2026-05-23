import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 10: Circles
// topicKey: "circles"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (full chapter in scope — tangents to a circle)
// Coverage: Theorems 10.1 and 10.2, Examples 1–3, Ex 10.1 and Ex 10.2.

export const CIRC_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "CIRC-N-NCERT-10-MCQ-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A tangent PQ at a point P of a circle of radius 5 cm meets a line through the centre O at a point Q so that OQ = 12 cm. Length PQ is",
    options: ["12 cm", "13 cm", "8.5 cm", "√119 cm"],
    answer: "√119 cm",
    solutionSteps: ["By Theorem 10.1, OP ⊥ PQ at the point of contact.", "In right ∆OPQ, by Pythagoras: PQ² = OQ² − OP² = 12² − 5² = 144 − 25 = 119.", "PQ = √119 cm."],
    finalAnswer: "√119 cm — option (d).",
    ncertRef: "NCERT Ex 10.1 Q3", isCompetencyBased: false,
    strategyHint: "OP ⊥ PQ ⇒ right triangle ⇒ Pythagoras." },

  { id: "CIRC-N-NCERT-10-MCQ-002", subject: "Maths", topicKey: "circles", subtopic: "Radius from Tangent Length", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "From a point Q, the length of the tangent to a circle is 24 cm and the distance of Q from the centre is 25 cm. The radius of the circle is",
    options: ["7 cm", "12 cm", "15 cm", "24.5 cm"],
    answer: "7 cm",
    solutionSteps: ["Let P be the point of contact and O the centre. OP ⊥ PQ.", "OP² = OQ² − PQ² = 25² − 24² = 625 − 576 = 49.", "OP = 7 cm."],
    finalAnswer: "7 cm — option (a).",
    ncertRef: "NCERT Ex 10.2 Q1", isCompetencyBased: false },

  { id: "CIRC-N-NCERT-10-MCQ-003", subject: "Maths", topicKey: "circles", subtopic: "Angle Between Tangents", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In a figure, TP and TQ are two tangents to a circle with centre O so that ∠POQ = 110°. Then ∠PTQ equals",
    options: ["60°", "70°", "80°", "90°"],
    answer: "70°",
    solutionSteps: ["OP ⊥ TP and OQ ⊥ TQ ⇒ ∠OPT = ∠OQT = 90°.", "Quadrilateral OPTQ has angle sum 360°: ∠POQ + ∠PTQ + 90° + 90° = 360°.", "∠PTQ = 360° − 110° − 180° = 70°."],
    finalAnswer: "70° — option (b).",
    ncertRef: "NCERT Ex 10.2 Q2", isCompetencyBased: true,
    strategyHint: "Sum of angles in quadrilateral OPTQ is 360°." },

  { id: "CIRC-N-NCERT-10-MCQ-004", subject: "Maths", topicKey: "circles", subtopic: "Angle Between Tangents", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Tangents PA and PB from a point P to a circle with centre O are inclined to each other at an angle of 80°. Then ∠POA equals",
    options: ["50°", "60°", "70°", "80°"],
    answer: "50°",
    solutionSteps: ["By Theorem 10.2, PA = PB, and ∆OPA ≅ ∆OPB. So ∠OPA = ∠OPB = 40°.", "∠OAP = 90° (radius ⊥ tangent).", "In ∆OPA: ∠POA = 180° − 90° − 40° = 50°."],
    finalAnswer: "50° — option (a).",
    ncertRef: "NCERT Ex 10.2 Q3", isCompetencyBased: true },

  { id: "CIRC-N-NCERT-10-MCQ-005", subject: "Maths", topicKey: "circles", subtopic: "Number of Tangents", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The number of tangents that can be drawn from an external point to a circle is",
    options: ["1", "2", "3", "Infinitely many"],
    answer: "2",
    solutionSteps: ["From a point outside the circle, exactly two tangents can be drawn (NCERT Section 10.3).", "From a point on the circle, exactly one tangent. From inside, none."],
    finalAnswer: "2 — option (b).",
    ncertRef: "NCERT Section 10.3", isCompetencyBased: false },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "CIRC-N-NCERT-10-AR-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent ⊥ Radius", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): A tangent to a circle is perpendicular to the radius at the point of contact.\nReason (R): The shortest distance from a point to a line is along the perpendicular.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["A is the statement of NCERT Theorem 10.1 — true.", "R is a standard geometric fact — true.", "The NCERT proof of Theorem 10.1 uses R: among all distances OP, OQ, OR… from O to the tangent line, OP is the shortest, hence OP ⊥ tangent. So R explains A."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Theorem 10.1 (page 208)", isCompetencyBased: true },

  { id: "CIRC-N-NCERT-10-AR-002", subject: "Maths", topicKey: "circles", subtopic: "Equal Tangents", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The lengths of the tangents from an external point to a circle are equal.\nReason (R): Two right triangles formed by the radius, the line to the external point, and the two tangents are congruent by RHS.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["A is NCERT Theorem 10.2 — true.", "The standard proof shows ∆OQP ≅ ∆ORP by RHS (right angles at the tangent ends, equal radii OQ = OR, common hypotenuse OP). R is true.", "R is exactly the construction used to prove A."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Theorem 10.2 (page 211)", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "CIRC-N-NCERT-10-VSA-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Definitions", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Fill in: (i) A tangent to a circle intersects it in ___ point(s). (ii) A line intersecting a circle in two points is called a ___. (iii) A circle can have ___ parallel tangents at the most. (iv) The common point of a tangent and the circle is called the ___.",
    solutionSteps: ["(i) Exactly one point — by definition of a tangent.", "(ii) A secant.", "(iii) Two parallel tangents at the most — one on each side of the centre.", "(iv) The point of contact."],
    finalAnswer: "(i) one; (ii) secant; (iii) two; (iv) point of contact.",
    ncertRef: "NCERT Ex 10.1 Q2", isCompetencyBased: false },

  { id: "CIRC-N-NCERT-10-VSA-002", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The length of a tangent from a point A at distance 5 cm from the centre of the circle is 4 cm. Find the radius of the circle.",
    solutionSteps: ["Let r be the radius and P the point of contact. Then OP ⊥ AP and OA = 5, AP = 4.", "In right ∆OPA: r² = OA² − AP² = 25 − 16 = 9.", "r = 3 cm."],
    finalAnswer: "Radius = 3 cm.",
    ncertRef: "NCERT Ex 10.2 Q6", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "CIRC-N-NCERT-10-SA-001", subject: "Maths", topicKey: "circles", subtopic: "Concentric Circles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two concentric circles are of radii 5 cm and 3 cm. Find the length of the chord of the larger circle which touches the smaller circle.",
    solutionSteps: ["Let AB be the chord of the larger circle touching the smaller circle at P. Then OP ⊥ AB and OP = 3 (radius of smaller circle).", "OA = 5 (radius of larger).", "In right ∆OPA: AP² = 5² − 3² = 16 ⇒ AP = 4 cm.", "Since OP ⊥ AB, P bisects AB: AB = 2 × AP = 8 cm."],
    finalAnswer: "Chord length = 8 cm.",
    ncertRef: "NCERT Ex 10.2 Q7", isCompetencyBased: true,
    strategyHint: "The perpendicular from the centre bisects the chord." },

  { id: "CIRC-N-NCERT-10-SA-002", subject: "Maths", topicKey: "circles", subtopic: "Equal Tangents", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "Prove that the tangents drawn at the ends of a diameter of a circle are parallel.",
    solutionSteps: ["Let AB be a diameter and let l, m be tangents at A and B respectively.", "By Theorem 10.1, OA ⊥ l and OB ⊥ m.", "Since A, O, B are collinear (AB is a diameter), both l and m are perpendicular to the line AB.", "Two lines perpendicular to the same line are parallel ⇒ l ∥ m."],
    finalAnswer: "Proved: tangents at the ends of a diameter are parallel.",
    ncertRef: "NCERT Ex 10.2 Q4", isCompetencyBased: true },

  { id: "CIRC-N-NCERT-10-SA-003", subject: "Maths", topicKey: "circles", subtopic: "Tangents at Chord Ends", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "PQ is a chord of length 8 cm of a circle of radius 5 cm. The tangents at P and Q intersect at a point T. Find the length TP.",
    solutionSteps: ["Join OT meeting PQ at R. ∆TPQ is isosceles (TP = TQ), so OT bisects PQ at R ⇒ PR = 4.", "In ∆OPR: OR² = OP² − PR² = 25 − 16 = 9 ⇒ OR = 3.", "In ∆OPT, OP ⊥ PT. Using similar triangles or Pythagoras: TP × OR = OP × PR? More directly: TP/OP = PR/OR (from ∆TRP ∼ ∆PRO).", "TP = (PR × OP)/OR = (4 × 5)/3 = 20/3 cm."],
    finalAnswer: "TP = 20/3 cm.",
    ncertRef: "NCERT Example 3 (page 213)", isCompetencyBased: true },

  { id: "CIRC-N-NCERT-10-SA-004", subject: "Maths", topicKey: "circles", subtopic: "Circumscribed Quadrilateral", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "A quadrilateral ABCD is drawn to circumscribe a circle. Prove that AB + CD = AD + BC.",
    solutionSteps: ["Let the circle touch AB, BC, CD, DA at P, Q, R, S respectively.", "From equal tangents: AP = AS, BP = BQ, CR = CQ, DR = DS.", "AB + CD = (AP + PB) + (CR + RD) and AD + BC = (AS + SD) + (BQ + QC).", "Substituting equal tangent pairs gives AB + CD = AD + BC."],
    finalAnswer: "Proved: opposite sides of the circumscribed quadrilateral are equal in pairs of sums.",
    ncertRef: "NCERT Ex 10.2 Q8", isCompetencyBased: true,
    strategyHint: "Use the equal-tangents theorem at each vertex." },

  { id: "CIRC-N-NCERT-10-SA-005", subject: "Maths", topicKey: "circles", subtopic: "Tangents from External Point", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Two tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ = 2∠OPQ.",
    solutionSteps: ["Let ∠PTQ = θ. TP = TQ (equal tangents), so ∆TPQ is isosceles.", "∠TPQ = ∠TQP = (180° − θ)/2 = 90° − θ/2.", "OP ⊥ TP ⇒ ∠OPT = 90°.", "∠OPQ = ∠OPT − ∠TPQ = 90° − (90° − θ/2) = θ/2 = (1/2)∠PTQ.", "Hence ∠PTQ = 2∠OPQ."],
    finalAnswer: "Proved: ∠PTQ = 2∠OPQ.",
    ncertRef: "NCERT Example 2 (page 212)", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "CIRC-N-NCERT-10-LA-001", subject: "Maths", topicKey: "circles", subtopic: "Triangle Circumscribing Circle", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A triangle ABC is drawn to circumscribe a circle of radius 4 cm such that the segments BD and DC into which BC is divided by the point of contact D are of lengths 8 cm and 6 cm respectively. Find the sides AB and AC.",
    solutionSteps: ["Let the circle touch AB at F and AC at E. Then BD = BF = 8, DC = CE = 6, and let AF = AE = x.", "Area of ∆ABC by Heron-like decomposition using incircle: Area = r × s where s = semi-perimeter.", "Sides: AB = 8 + x, AC = 6 + x, BC = 14. s = (8 + x + 6 + x + 14)/2 = 14 + x.", "Compute area another way using ∆OBC, ∆OCA, ∆OAB each with height = r = 4: Area = (1/2)×4×(BC + CA + AB) = 2 × 2s = 4s? Actually Area = r·s.", "Also Area² = s(s − a)(s − b)(s − c) where a = BC = 14, b = CA = 6 + x, c = AB = 8 + x. s = 14 + x.", "s − a = x, s − b = 8, s − c = 6.", "(rs)² = s(s − a)(s − b)(s − c) ⇒ r²s = (s − a)(s − b)(s − c).", "16(14 + x) = x × 8 × 6 = 48x ⇒ 16x + 224 = 48x ⇒ 32x = 224 ⇒ x = 7.", "AB = 8 + 7 = 15 cm and AC = 6 + 7 = 13 cm."],
    finalAnswer: "AB = 15 cm and AC = 13 cm.",
    ncertRef: "NCERT Ex 10.2 Q12", isCompetencyBased: true,
    strategyHint: "Combine 'equal tangents' with Area = r·s and Heron's formula." },

  { id: "CIRC-N-NCERT-10-LA-002", subject: "Maths", topicKey: "circles", subtopic: "Parallelogram Circumscribing Circle", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that the parallelogram circumscribing a circle is a rhombus.",
    solutionSteps: ["Let ABCD be a parallelogram circumscribing a circle, touching AB, BC, CD, DA at P, Q, R, S.", "By equal tangents: AP = AS, BP = BQ, CQ = CR, DR = DS.", "AB + CD = (AP + PB) + (CR + RD) = (AS + SD) + (BQ + QC) = AD + BC.", "Since ABCD is a parallelogram, AB = CD and AD = BC. So 2AB = 2AD ⇒ AB = AD.", "Hence all sides AB = BC = CD = DA, i.e., ABCD is a rhombus."],
    finalAnswer: "Proved: a parallelogram that circumscribes a circle is a rhombus.",
    ncertRef: "NCERT Ex 10.2 Q11", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "CIRC-N-NCERT-10-CB-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length Application", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circular pulley of radius 5 cm is fitted in a frame. A rope is wound on the pulley and a person holds the rope at a point T such that the distance OT from the centre of the pulley equals 13 cm. The rope is taut and acts as a tangent from T to the circle, touching at point P.\n(i) What angle does OP make with TP?\n(ii) Find the length TP of the rope from T to the point of contact.\n(iii) If a second rope from T touches the pulley at Q, what is TQ?\n(iv) Find ∠PTQ if ∠POQ = 110° using the angle-sum property of OPTQ.",
    solutionSteps: ["(i) OP ⊥ TP by Theorem 10.1 ⇒ ∠OPT = 90°.", "(ii) In right ∆OPT: TP² = OT² − OP² = 169 − 25 = 144 ⇒ TP = 12 cm.", "(iii) TQ = TP = 12 cm (equal tangents from external point — Theorem 10.2).", "(iv) Quadrilateral OPTQ has angles 90° at P, 90° at Q. Sum 360°: ∠PTQ = 360° − 90° − 90° − 110° = 70°."],
    finalAnswer: "(i) 90°; (ii) 12 cm; (iii) 12 cm; (iv) 70°.",
    ncertRef: "NCERT Theorems 10.1, 10.2 applied", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "CIRC-N-NCERT-10-CRE-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length Application", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a circle of radius r and place an external point T such that the angle between the two tangents from T is exactly 60°. Specify r, OT, the tangent length, and verify your design.",
    solutionSteps: ["Let r be any positive radius — pick r = 3 cm. Let ∠PTQ = 60°. Since OT bisects ∠PTQ, ∠OTP = 30°.", "In right ∆OPT: sin 30° = OP/OT ⇒ OT = r/sin 30° = 3/0.5 = 6 cm.", "Tangent length TP = OT × cos 30° = 6 × (√3/2) = 3√3 cm. (Equivalently, TP² = OT² − OP² = 36 − 9 = 27.)", "Verification: ∠PTQ = 2 × 30° = 60° ✓; equal tangents TP = TQ = 3√3 cm; r = 3 cm; OT = 6 cm."],
    finalAnswer: "Design: r = 3 cm, OT = 6 cm, TP = TQ = 3√3 cm.",
    ncertRef: "NCERT-style design task", isCompetencyBased: true,
    strategyHint: "Choose r freely, then use OT = r/sin(half-angle)." },
];
