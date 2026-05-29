import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Circles — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10AS3, Maths10MM8, Maths10PR2, Maths10MM6a, Maths10MM6b,
 *   Maths10MM7, Maths10ASR6, Maths10AD9.
 * Content Reference 10G2a (tangent ⊥ radius at point of contact) and 10G2b
 *   (equal tangents from an external point) — CBSE chapter topicKey "circles".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=2, B=3, C=2, D=1.
 * NOTE: every item is figure-dependent (requiresDiagram:true); see diagramDescription.
 */
export const CIRC_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-CIRC-A-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Perpendicular to Radius",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "PT is tangent to the circle of radius 7 cm. If OP = 11 cm, then find the length of the tangent, correct to 1 decimal place.",
    "options": [
      "A. 4.0 cm",
      "B. 8.5 cm",
      "C. 13.0 cm",
      "D. 18.0 cm"
    ],
    "answer": "B. 8.5 cm",
    "solutionSteps": [
      "[1 mark] OA ⊥ PA (tangent ⊥ radius), so OP² = OA² + PA² → 11² = 7² + PA² → PA² = 121 − 49 = 72 → PA = √72 ≈ 8.5 cm. Answer: B."
    ],
    "finalAnswer": "B. 8.5 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O and radius 7 cm. An external point P with OP = 11 cm. PT is a tangent from P touching the circle at the point of contact; the radius to the point of contact is perpendicular to PT. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-CIRC-A-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Perpendicular to Radius",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In the given diagram, OT = 4 cm is the radius of the circle with centre O, and a tangent PT is drawn from a point P such that PT = 15 cm. The length of OP to correct two decimal places is",
    "options": [
      "A. 11.00 cm",
      "B. 10.44 cm",
      "C. 15.52 cm",
      "D. 19.00 cm"
    ],
    "answer": "C. 15.52 cm",
    "solutionSteps": [
      "[1 mark] The tangent from an external point is perpendicular to the radius at the point of contact, so in right △OTP, OP = √(PT² + OT²) = √(15² + 4²) = √(225 + 16) = √241 ≈ 15.52 cm. Answer: C."
    ],
    "finalAnswer": "C. 15.52 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O and radius OT = 4 cm, where T is the point of contact. A tangent PT = 15 cm is drawn from an external point P. The radius OT is perpendicular to the tangent PT, forming right triangle OTP."
  },
  {
    "id": "CBE-M-CIRC-B-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents and Angles in a Circle",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, O is the centre, PQ and PR are the two tangents, RQ is the chord. If ∠RPQ = 30°, then find ∠RQP and ∠RSQ.",
    "options": [],
    "answer": "∠RQP = 75°, ∠RSQ = 75°",
    "solutionSteps": [
      "[1 mark] ∠QOP = 180° − 30° = 150°. In △ORQ, OQ = OR (radii) so ∠OQR = ∠ORQ = 15° (angle sum property); ∠OQP = 90° (tangent ⊥ radius), giving ∠RQP = 90° − 15° = 75°.",
      "[1 mark] ∠RSQ = 75° (angle at the centre is double the angle at the remaining circumference)."
    ],
    "finalAnswer": "∠RQP = 75°, ∠RSQ = 75°",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. From an external point P, two tangents PQ and PR touch the circle at Q and R respectively. RQ is a chord. ∠RPQ = 30°. S is a point on the major arc QR (the angle ∠RSQ is the angle subtended by chord RQ at the circumference). Radii OQ and OR are drawn. Not drawn to scale."
  },
  {
    "id": "CBE-M-CIRC-B-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Perpendicular to Radius",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two concentric circles of radii a and b (a > b) are given. Find the length of the chord of the larger circle which touches the smaller circle.",
    "options": [],
    "answer": "2√(a² − b²)",
    "solutionSteps": [
      "[1 mark] The chord of the larger circle touches the smaller circle, so the radius b drawn to the point of contact is perpendicular to the chord and bisects it. By Pythagoras in the right triangle, (half-chord)² = a² − b², so half-chord d = √(a² − b²).",
      "[1 mark] Length of the chord = 2d = 2√(a² − b²)."
    ],
    "finalAnswer": "2√(a² − b²)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two concentric circles with common centre, the larger of radius a and the smaller of radius b (a > b). A chord of the larger circle is drawn so that it touches (is tangent to) the smaller circle at its midpoint. The radius b to the point of contact is perpendicular to the chord, forming a right triangle with hypotenuse a, one leg b, and the other leg equal to half the chord length d."
  },
  {
    "id": "CBE-M-CIRC-B-003",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Perpendicular to Radius",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the given figure, PQ is a chord of a circle with centre O, and PT is a tangent. If ∠QPT = 60°, find ∠PRQ.",
    "options": [],
    "answer": "∠PRQ = 120°",
    "solutionSteps": [
      "[1 mark] ∠OPT = 90° (tangent at any point of a circle is perpendicular to the radius). Given ∠QPT = 60°, so ∠OPQ = 90° − 60° = 30°.",
      "[1 mark] In △OPQ, OP = OQ (radii) so ∠OQP = ∠OPQ = 30°, giving ∠POQ = 180° − 30° − 30° = 120° (angle sum property). Hence the reflex/subtended angle ∠PRQ = 120°."
    ],
    "finalAnswer": "∠PRQ = 120°",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. PQ is a chord. PT is a tangent to the circle at P, with ∠QPT = 60°. R is a point on the circle so that ∠PRQ is the angle subtended by chord PQ. Radii OP and OQ are drawn; OP is perpendicular to tangent PT. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-CIRC-C-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In the figure, two circles touch each other externally at C, and AB is a common tangent of the circles, then find ∠ACB.",
    "options": [],
    "answer": "∠ACB = 90°",
    "solutionSteps": [
      "[1 mark] Draw the common tangent at the common point C; let N be the point where this common tangent intersects AB.",
      "[1 mark] CN = AN and CN = BN (the lengths of tangents drawn from an external point to a circle are equal), so △ANC and △BNC are isosceles.",
      "[1 mark] Angles opposite equal sides are equal: ∠NCA = ∠NAC and ∠NCB = ∠NBC. In △ABC, ∠NCA + ∠NCB + ∠NAC + ∠NBC = 180°, so 2(∠NCA + ∠NCB) = 180° → ∠ACB = ∠NCA + ∠NCB = 90°."
    ],
    "finalAnswer": "∠ACB = 90°",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two circles touching each other externally at point C. AB is a common (external) tangent touching one circle at A and the other at B. The common tangent at the point of contact C meets line AB at point N. Triangle ABC is formed with the angle ∠ACB to be found."
  },
  {
    "id": "CBE-M-CIRC-C-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Perpendicular to Radius",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In the figure, line l touches the circle with centre O at point P. Q is the mid-point of radius OP. RS is a chord through Q such that RS is parallel to line l. If RS = 12 cm, find the radius of the circle.",
    "options": [],
    "answer": "Radius = 4√3 cm",
    "solutionSteps": [
      "[1 mark] OP is perpendicular to the tangent l, and since RS ∥ l, OP is perpendicular to chord RS. The perpendicular from the centre to a chord bisects it, so QS = ½ × RS = 6 cm.",
      "[1 mark] Let the radius OP = r. Since Q is the mid-point of OP, OQ = r/2. In right △OQS, OS² = OQ² + QS² → r² = (r/2)² + 6².",
      "[1 mark] r² − r²/4 = 36 → 3r²/4 = 36 → r² = 48 → r = 4√3 cm."
    ],
    "finalAnswer": "Radius = 4√3 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. Line l is tangent to the circle at point P, so radius OP is perpendicular to l. Q is the mid-point of OP. A chord RS passes through Q parallel to line l (and hence perpendicular to OP), with RS = 12 cm, so Q bisects RS. Right triangle OQS is formed. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-CIRC-D-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Equal Tangents from an External Point",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In an amusement park, a triangular path ABC circumscribing a circular pond centred at O with radius 8 m is to be constructed, as shown in the figure. The tangent lengths from B are 12 m and from C are 16 m. Find the cost of fencing the triangular path at the rate of Rs 55 per metre.",
    "options": [],
    "answer": "Cost of fencing = Rs 4620",
    "solutionSteps": [
      "[1 mark] Apply the circle theorems: tangent lengths from an external point are equal, so PB = QB = 12 m, RC = QC = 16 m and AP = AR = x (say); also the radius (8 m) is perpendicular to each tangent at the point of contact.",
      "[1 mark] Find ar(△ABC) as the sum of areas of △AOB, △BOC and △AOC: ar(△ABC) = ½ × 8 × (perimeter) = ½ × 8 × 2(28 + x) = 8(28 + x) sq m. … (1)",
      "[1 mark] Using Heron's formula with semi-perimeter s = (28 + x): ar(△ABC) = √[s(s−a)(s−b)(s−c)] = √[(28 + x) · x · 12 · 16] = 4√[(28 + x) · x · 12] sq m. … (2)",
      "[1 mark] Equate (1) and (2): 8(28 + x) = 4√[(28 + x) · x · 12]; squaring gives 4(28 + x)² = 12x(28 + x) → (28 + x)(28 + x − 3x) = 0 → x = 14 (reject x = −28). So perimeter = 2(28 + x) = 84 m.",
      "[1 mark] Cost of fencing = Rs 55 × 84 = Rs 4620."
    ],
    "finalAnswer": "Cost of fencing = Rs 4620",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A circular pond with centre O and radius 8 m is inscribed in (circumscribed by) a triangular path ABC, so each side of the triangle is tangent to the circle. The points of contact are P (on AB), Q (on BC) and R (on CA). The tangent segment from B is 12 m and from C is 16 m. Radii OP, OQ, OR (each 8 m) are perpendicular to the respective sides. Diagram not drawn to scale."
  }
];
