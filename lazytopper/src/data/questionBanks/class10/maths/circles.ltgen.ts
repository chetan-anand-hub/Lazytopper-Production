import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * circles — LazyTopper-generated CBSE-shaped practice (GEN-THIN-1 PR-1, 2026-10-06).
 *
 * Thin IN concept: "(Prove) The lengths of tangents drawn from an external point to a circle
 * are equal" (syllabus p6) and its use. Each row is modelled on a cited real CBSE / NCERT
 * question (same shape and intent; new figures, numbers and context). Every figure is fully
 * described in words, so no diagram is needed.
 *
 * Provenance is INTERNAL ONLY (`origin`, `modelledOn`, `questionProvenance`, `shapedFrom`):
 * never rendered. No `pyqYear` / `isPYQ`; ids outside the NCERT / exemplar patterns.
 */
export const CIRCLES_LT_GENERATED: CanonicalQuestion[] = [
  {
    "id": "LTG-M-CIRC-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "PA and PB are tangents drawn from an external point P to a circle with centre O, touching it at A and B. If ∠PAB = 65°, then ∠APB is",
    "options": ["50°", "65°", "115°", "130°"],
    "answer": "50°",
    "solutionSteps": [
      "[1 mark] PA = PB (tangents from an external point), so ∠PBA = ∠PAB = 65° and ∠APB = 180° − 2 × 65° = 50°."
    ],
    "finalAnswer": "50°",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "SQP-M-CI-003",
    "origin": "lt-generated",
    "modelledOn": "CBSE Sample Question Paper 2023-24 Maths Standard (Circles)"
  },
  {
    "id": "LTG-M-CIRC-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): If a circle touches all four sides AB, BC, CD and DA of a quadrilateral ABCD, then AB + CD = AD + BC.\nReason (R): The lengths of the tangents drawn from an external point to a circle are equal.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "[1 mark] R is the equal-tangents theorem (true). Splitting each side at its point of contact and pairing the equal tangent segments from A, B, C and D gives AB + CD = AD + BC, so A is true and follows from R."
    ],
    "finalAnswer": "Option (A).",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-CIRC-002",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/2/1 Q19"
  },
  {
    "id": "LTG-M-CIRC-003",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "TP and TQ are tangents drawn from an external point T to a circle, touching it at P and Q. A third tangent touches the circle at R, a point on the minor arc PQ, and meets TP at A and TQ at B. If TP = 13 cm, find the perimeter of △TAB.",
    "options": [],
    "answer": "26 cm",
    "solutionSteps": [
      "[1 mark] Equal tangents: AR = AP (from A) and BR = BQ (from B), so AB = AR + RB = AP + BQ.",
      "[1 mark] Perimeter of △TAB = TA + AB + BT = (TA + AP) + (BQ + BT) = TP + TQ = 13 + 13 = 26 cm (TQ = TP)."
    ],
    "finalAnswer": "Perimeter of △TAB = 26 cm.",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "SQP-M-CI-003",
    "origin": "lt-generated",
    "modelledOn": "CBSE Sample Question Paper 2023-24 Maths Standard (Circles)"
  },
  {
    "id": "LTG-M-CIRC-004",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A circle touches all four sides of a quadrilateral PQRS. If PQ = 9 cm, QR = 7 cm and RS = 5 cm, find PS.",
    "options": [],
    "answer": "PS = 7 cm",
    "solutionSteps": [
      "[1 mark] Using equal tangents from P, Q, R and S, the sums of opposite sides are equal: PQ + RS = QR + PS.",
      "[1 mark] 9 + 5 = 7 + PS ⇒ PS = 7 cm."
    ],
    "finalAnswer": "PS = 7 cm",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "CIRC-N-NCERT-10-AR-002",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Theorem 10.2"
  },
  {
    "id": "LTG-M-CIRC-005",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "PA and PB are tangents from an external point P to a circle with centre O, touching it at A and B, and ∠APB = 80°. Find ∠OPA, giving reasons.",
    "options": [],
    "answer": "∠OPA = 40°",
    "solutionSteps": [
      "[1 mark] In △OAP and △OBP: OA = OB (radii), OP is common and ∠OAP = ∠OBP = 90° (tangent ⟂ radius), so △OAP ≅ △OBP (RHS).",
      "[1 mark] Hence ∠OPA = ∠OPB (CPCT), so ∠OPA = ½ × 80° = 40°."
    ],
    "finalAnswer": "∠OPA = 40°",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "CIR-PRF-D-002",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2025 30/1/1 (Theorem 10.2 proof with application)"
  },
  {
    "id": "LTG-M-CIRC-006",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "PA and PB are tangents drawn from an external point P to a circle with centre O, touching it at A and B. Prove that OP is the perpendicular bisector of the chord AB.",
    "options": [],
    "answer": "OP ⟂ AB and OP bisects AB (proved)",
    "solutionSteps": [
      "[1 mark] In △OAP and △OBP: OA = OB (radii), OP common, ∠OAP = ∠OBP = 90° (tangent ⟂ radius) ⇒ △OAP ≅ △OBP (RHS), so PA = PB and ∠APO = ∠BPO (CPCT).",
      "[1 mark] Let OP meet AB at M. In △PAM and △PBM: PA = PB, ∠APM = ∠BPM and PM is common ⇒ △PAM ≅ △PBM (SAS).",
      "[1 mark] So AM = BM and ∠AMP = ∠BMP; as they form a linear pair, each is 90°. Hence OP is the perpendicular bisector of AB."
    ],
    "finalAnswer": "OP is the perpendicular bisector of AB (proved).",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-CIRC-014",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/4/1 Q28"
  },
  {
    "id": "LTG-M-CIRC-007",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A circle is inscribed in △ABC, touching AB at P, BC at Q and CA at R. If AB = 10 cm, BC = 8 cm and CA = 12 cm, find AP, BQ and CR.",
    "options": [],
    "answer": "AP = 7 cm, BQ = 3 cm, CR = 5 cm",
    "solutionSteps": [
      "[1 mark] Equal tangents: AP = AR = x, BP = BQ = y, CQ = CR = z. Then x + y = 10, y + z = 8, z + x = 12.",
      "[1 mark] Adding: 2(x + y + z) = 30 ⇒ x + y + z = 15.",
      "[1 mark] z = 15 − 10 = 5, x = 15 − 8 = 7, y = 15 − 12 = 3. So AP = 7 cm, BQ = 3 cm, CR = 5 cm."
    ],
    "finalAnswer": "AP = 7 cm, BQ = 3 cm, CR = 5 cm.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "SQP-M-CI-003",
    "origin": "lt-generated",
    "modelledOn": "CBSE Sample Question Paper 2023-24 Maths Standard (Circles)"
  },
  {
    "id": "LTG-M-CIRC-008",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The tangents at the ends P and Q of a chord PQ of a circle with centre O meet at T. (i) Prove that ∠TPQ = ∠TQP. (ii) If ∠PTQ = 50°, find ∠TPQ and ∠OPQ.",
    "options": [],
    "answer": "∠TPQ = 65°, ∠OPQ = 25°",
    "solutionSteps": [
      "[1 mark] (i) TP = TQ (tangents from the external point T), so △TPQ is isosceles and ∠TPQ = ∠TQP.",
      "[1 mark] (ii) ∠TPQ = (180° − 50°)/2 = 65°.",
      "[1 mark] ∠OPT = 90° (tangent ⟂ radius), so ∠OPQ = 90° − 65° = 25°."
    ],
    "finalAnswer": "∠TPQ = 65°, ∠OPQ = 25°.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-CIRC-014",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/4/1 Q28"
  },
  {
    "id": "LTG-M-CIRC-009",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "(a) Prove that the lengths of the tangents drawn from an external point to a circle are equal.\n(b) Hence: a circle with centre O is inscribed in a triangle ABC, right-angled at B, with AB = 8 cm and BC = 6 cm. Find the radius of the circle.",
    "options": [],
    "answer": "r = 2 cm",
    "solutionSteps": [
      "[1 mark] (a) Given a circle with centre O and tangents PA, PB from an external point P touching it at A and B; to prove PA = PB. Join OA, OB, OP.",
      "[1 mark] In △OAP and △OBP: OA = OB (radii), OP = OP (common), ∠OAP = ∠OBP = 90° (tangent ⟂ radius) ⇒ △OAP ≅ △OBP (RHS).",
      "[1 mark] Hence PA = PB (CPCT).",
      "[1 mark] (b) AC = √(8² + 6²) = 10 cm (right angle at B). Let the circle touch AB, BC, CA at P, Q, R with radius r. OPBQ is a square, so BP = BQ = r, AR = AP = 8 − r and CR = CQ = 6 − r.",
      "[1 mark] AC = AR + RC ⇒ 10 = (8 − r) + (6 − r) ⇒ 2r = 4 ⇒ r = 2 cm."
    ],
    "finalAnswer": "(a) PA = PB (proved); (b) r = 2 cm.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "CIR-PRF-D-002",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2025 30/1/1 (Theorem 10.2 proof with application)"
  },
  {
    "id": "LTG-M-CIRC-010",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "(a) Prove that the two tangents drawn from an external point to a circle are equally inclined to the line joining that point to the centre.\n(b) From a point T, 13 cm from the centre O of a circle of radius 5 cm, tangents TA and TB are drawn. Find the length of TA and the length of the chord AB.",
    "options": [],
    "answer": "TA = 12 cm, AB = 120/13 cm",
    "solutionSteps": [
      "[1 mark] (a) Let TA and TB be tangents from T touching the circle at A and B; to prove ∠OTA = ∠OTB. Join OA, OB, OT.",
      "[1 mark] In △OAT and △OBT: OA = OB (radii), OT common, ∠OAT = ∠OBT = 90° ⇒ △OAT ≅ △OBT (RHS), so ∠OTA = ∠OTB (CPCT).",
      "[1 mark] (b) ∠OAT = 90°, so TA = √(13² − 5²) = √144 = 12 cm.",
      "[1 mark] TA = TB and OT bisects ∠ATB, so OT is perpendicular to AB at its mid-point M. Area of △OAT: ½ × OA × TA = ½ × OT × AM ⇒ 5 × 12 = 13 × AM ⇒ AM = 60/13 cm.",
      "[1 mark] AB = 2 × AM = 120/13 cm (≈ 9.23 cm)."
    ],
    "finalAnswer": "TA = 12 cm; AB = 120/13 cm ≈ 9.23 cm.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "CIR-PRF-D-002",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2025 30/1/1 (Theorem 10.2 proof with application)"
  }
];
