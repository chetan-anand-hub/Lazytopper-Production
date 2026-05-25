import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "circles"
// Extraction date: 2026-05-24

export const CIRCLES_APQ: CanonicalQuestion[] = [
  // PQ1 Q8 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CIRC-001", subject: "Maths", topicKey: "circles", subtopic: "Tangent and Two Circles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two circles with centres O and N touch each other at point P as shown. O, P and N are collinear. The radius of the circle with centre O is twice that of the circle with centre N. OX is a tangent to the circle with centre N, and OX = 18 cm. What is the radius of the circle with centre N?",
    options: ["18/√2 cm", "9 cm", "9/√2 cm", "18/√10 cm"],
    answer: "9/√2 cm",
    solutionSteps: ["Let radius of N = r ⟹ radius of O = 2r. Distance ON = 2r + r = 3r (touching externally). Wait: per figure, NX ⊥ OX (tangent). In right ΔONX with hypotenuse ON = 3r, side NX = r, OX = 18.", "By Pythagoras: ON^2 = OX^2 + NX^2 ⟹ (3r)^2 = 18^2 + r^2 ⟹ 9r^2 − r^2 = 324 ⟹ 8r^2 = 324 ⟹ r^2 = 81/2 ⟹ r = 9/√2 cm."],
    finalAnswer: "(c) 9/√2 cm",
    ncertRef: "APQ PQ1 Q8", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two touching circles with tangent OX." },

  // PQ1 Q9 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CIRC-002", subject: "Maths", topicKey: "circles", subtopic: "Tangents — Perimeter of Polygon", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a circle with centre O having tangents at points P, T and S. If QR = 12 cm and the radius of the circle is 7 cm, what is the perimeter of the polygon PQTRSO?",
    options: ["26 cm", "31 cm", "38 cm", "(cannot say with the given information.)"],
    answer: "38 cm",
    solutionSteps: ["OP = OS = 7 cm (radii). Tangents from external Q: QP = QT; from R: RT = RS. So QP + QT + RT + RS = QR + (QT + RT) where QT + RT = QR = 12.", "Hmm: QT and RT are along the same tangent line through T; QT + RT = QR = 12. Per MS: perimeter = OP + PQ + QT + TR + RS + SO = 7 + PQ + 12 + RS + 7 = 26 + (PQ + RS). With tangent lengths summing to QR = 12, total = 38."],
    finalAnswer: "(c) 38 cm",
    ncertRef: "APQ PQ1 Q9", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circle with tangents at P, T, S and points Q, R outside." },

  // PQ2 Q9 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CIRC-003", subject: "Maths", topicKey: "circles", subtopic: "Tangent Length", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "AT is a tangent to the circle with centre O such that OT = 4 cm and ∠OTA = 30°. Then AT is equal to",
    options: ["4 cm", "2 cm", "2√3 cm", "4√3 cm"],
    answer: "2√3 cm",
    solutionSteps: ["Tangent property: OA ⊥ AT, so ∠OAT = 90°.", "In right ΔOAT: cos 30° = AT/OT ⟹ AT = OT · cos 30° = 4 · (√3/2) = 2√3 cm."],
    finalAnswer: "(c) 2√3 cm",
    ncertRef: "APQ PQ2 Q9", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: tangent AT to circle with centre O." },

  // PQ2 Q24 (Section B, Short, 2 marks)
  { id: "APQ-M-CIRC-004", subject: "Maths", topicKey: "circles", subtopic: "Tangents to Incircle of Quadrilateral", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circle is inscribed in a quadrilateral ABCD in which ∠B = 90°. If AD = 23 cm, AB = 29 cm and DS = 5 cm, find the radius r of the circle.",
    answer: "r = 11 cm.",
    solutionSteps: ["From tangent lengths from external point: DR = DS = 5 cm; AR = AD − DR = 23 − 5 = 18 cm. AQ = AR = 18 cm; QB = AB − AQ = 29 − 18 = 11 cm.", "In quadrilateral OQBP: ∠B = 90° and ∠OQB = ∠OPB = 90° (tangent-radius). So OQBP is a square with side OQ = OP = r. Hence r = QB = 11 cm."],
    finalAnswer: "r = 11 cm.",
    ncertRef: "APQ PQ2 Q24", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: inscribed circle in quadrilateral with right angle at B." },

  // PQ1 Q23 (Section B, Short, 2 marks)
  { id: "APQ-M-CIRC-005", subject: "Maths", topicKey: "circles", subtopic: "Tangents and Parallel Sides", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Shown below is a circle with centre O and three tangents drawn at points A, E and C. AE is a diameter of the circle. The tangents intersect at points B and D. Based on the above information, evaluate whether the following statement is true or false. Justify your answer. \"At least one pair of opposite sides of AEDB is parallel.\"",
    answer: "True.",
    solutionSteps: ["Tangent at A is perpendicular to radius OA. Tangent at E is perpendicular to radius OE.", "Since AE is a diameter, OA and OE are collinear ⟹ the two tangents (AB and ED) are both perpendicular to the same line AE ⟹ AB ∥ ED. So opposite sides AB and ED of quadrilateral AEDB are parallel — statement TRUE."],
    finalAnswer: "True — AB ∥ ED (both perpendicular to diameter AE).",
    ncertRef: "APQ PQ1 Q23", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circle with tangents at A, E, C and intersection points B, D." },

  // PQ2 Q28 (Section C, Short, 3 marks)
  { id: "APQ-M-CIRC-006", subject: "Maths", topicKey: "circles", subtopic: "Tangents from External Point — Angle", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Two tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ = 2 ∠OPQ.",
    answer: "Proved.",
    solutionSteps: ["Let ∠PTQ = θ. Tangents from external point: TP = TQ ⟹ ΔTPQ is isosceles. So ∠TPQ = ∠TQP = (180° − θ)/2 = 90° − θ/2.", "OP ⊥ PT (tangent ⊥ radius) ⟹ ∠OPT = 90°.", "∠OPQ = ∠OPT − ∠TPQ = 90° − (90° − θ/2) = θ/2 = ½ × ∠PTQ. Hence ∠PTQ = 2 ∠OPQ."],
    finalAnswer: "∠PTQ = 2 ∠OPQ (proved).",
    ncertRef: "APQ PQ2 Q28", isCompetencyBased: true },

  // PQ1 Q29 (Section C, Short, 3 marks)
  { id: "APQ-M-CIRC-007", subject: "Maths", topicKey: "circles", subtopic: "Tangent Proof via Congruence", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In the given figure, PQ is the diameter of the circle with centre O. R is a point on the boundary of the circle, at which a tangent is drawn. A line segment is drawn parallel to PR through O, such that it intersects the tangent at S. Show that SQ is a tangent to the circle. OR Shown below is a circle with centre O. Tangents are drawn at points A and C, such that they intersect at point B. If OA ⊥ OC, then show that quadrilateral OABC is a square.",
    answer: "Both proven.",
    solutionSteps: ["[Variant 1] Since OR is the radius and RS is tangent: OR ⊥ RS. OS ∥ PR ⟹ ∠OPR = ∠ROS (corresponding angles); also ∠OPR = ∠ORP (isosceles OP = OR).", "ΔORS ≅ ΔOQS by SAS (OS = OS common, OR = OQ radii, ∠ROS = ∠QOS by exterior-angle relation). Hence ∠OQS = ∠ORS = 90°, so SQ is tangent to the circle at Q.", "[Variant 2] AB = BC (tangents from external point). OA = OC (radii). ∠BAO = ∠BCO = 90° (tangent ⊥ radius). With OA ⊥ OC (∠AOC = 90°), quadrilateral OABC has all four 90° angles and OA = AB = BC = OC ⟹ square."],
    finalAnswer: "SQ is a tangent. [OR] OABC is a square.",
    ncertRef: "APQ PQ1 Q29", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants." },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q8 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CIRC-008", subject: "Maths", topicKey: "circles", subtopic: "Tangent Configuration — Two External Points", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A circle is drawn. Two points are marked outside the circle such that only 3 tangents can be drawn to the circle using these two points. Which of the following is true based on the above information?",
    options: [
      "All 3 tangents are equal in length.",
      "Both the points lie on one of the tangents.",
      "The tangents and the circle have two common points in total.",
      "(such a situation is not possible as with 2 points, there will be 4 tangents to the circle)"
    ],
    answer: "Both the points lie on one of the tangents.",
    solutionSteps: ["Normally each external point gives 2 tangents = 4 total. For exactly 3 tangents, one tangent must be shared by both points ⟹ both points lie on the same tangent line."],
    finalAnswer: "(b) Both the points lie on one of the tangents.",
    ncertRef: "APQ PQ_2022 Q8", isCompetencyBased: true },

  // PQ_2022 Q9 (Section A, MCQ, 1 mark)
  { id: "APQ-M-CIRC-009", subject: "Maths", topicKey: "circles", subtopic: "Tangent Lengths — Geometry", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Shown below is a circle with 3 tangents KQ, KP and LM. QL = 2 cm and KL = 6 cm. PM = (1/2)KL. What is the measure of ∠LMK?",
    options: ["50°", "65°", "80°", "(cannot be uniquely determined with the given information)"],
    answer: "(cannot be uniquely determined with the given information)",
    solutionSteps: ["Per MS answer key: option (c) 80°. (NB: published MS gives 80°; without the figure the configuration cannot be fully reconstructed in text.)"],
    finalAnswer: "(c) 80°",
    ncertRef: "APQ PQ_2022 Q9", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circle with 3 tangents KQ, KP, LM and labelled lengths." },

  // PQ_2022 Q22 (Section B, Short, 2 marks)
  { id: "APQ-M-CIRC-010", subject: "Maths", topicKey: "circles", subtopic: "Inscribed Angle and Tangent — ∠OQN", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown below is a circle with centre O. NQ is a tangent to the circle. Find the measure of ∠OQN. Show your work and give valid reasons.",
    answer: "∠OQN = 40°.",
    solutionSteps: ["Inscribed-angle theorem: angle at centre = 2 × angle at circumference. So ∠NOP = 2 × 25° = 50°.", "Radius ⊥ tangent: ∠ONQ = 90°. In ΔONQ: ∠OQN = 180° − (50° + 90°) = 40°."],
    finalAnswer: "∠OQN = 40°.",
    ncertRef: "APQ PQ_2022 Q22", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circle with tangent NQ and angle 25° at circumference." },

  // PQ_2022 Q29 first variant (Section C, Short, 3 marks)
  { id: "APQ-M-CIRC-011", subject: "Maths", topicKey: "circles", subtopic: "Circle Inscribed in Two Squares — Radius", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Shown below is a circle and 2 congruent squares (PQRS & QTUR). ST, SU and UT are tangents to the circle. The side length of the square is 10 cm. Find the radius of the circle.",
    answer: "Radius r = 15 − 5√5 cm.",
    solutionSteps: ["Let radius = x cm. With NVUW = square: WU = UV = x cm.", "In ΔSUT (right): ST = √(20^2 + 10^2) = √500 = 10√5 cm.", "VT = 10 − x; by tangent property YT = VT. Also SY = SW: 20 − x = 10√5 − (10 − x).", "Solve: 20 − x = 10√5 − 10 + x ⟹ 30 − 10√5 = 2x ⟹ x = 15 − 5√5 cm."],
    finalAnswer: "r = 15 − 5√5 cm.",
    ncertRef: "APQ PQ_2022 Q29 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two congruent squares with inscribed circle and tangents." },

  // PQ_2022 Q29 OR variant (Section C, Short, 3 marks)
  { id: "APQ-M-CIRC-012", subject: "Maths", topicKey: "circles", subtopic: "Common Tangent — Two Semicircles", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "M and N are the centres of two semi-circles having radii 9 cm and 16 cm respectively. ST is a common tangent. Find the length of PQ. Draw a rough figure, show your work and give valid reasons.",
    answer: "PQ = 24 cm.",
    solutionSteps: ["Join MP, NQ — both perpendicular to tangent at points of contact. Draw MR ∥ PQ inside the trapezium MPQN.", "RN = NQ − MR = 16 − 9 = 7 cm; MN = 9 + 16 = 25 cm (sum of radii since tangent is between).", "In right ΔMRN by Pythagoras: MR = √(MN^2 − RN^2) = √(625 − 49) = √576 = 24 cm.", "Since MRQP is a rectangle: PQ = MR = 24 cm."],
    finalAnswer: "PQ = 24 cm.",
    ncertRef: "APQ PQ_2022 Q29 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two semicircles with common tangent ST and chord PQ." },
];
