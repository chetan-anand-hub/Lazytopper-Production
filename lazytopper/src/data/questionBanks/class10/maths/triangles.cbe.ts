import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Triangles — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10GS3, Maths10AD10, Maths10PS7, Maths10SR7a/b, Maths10AD1,
 *   Maths10ASR11a, Maths10PR6a/b, Maths10ASR4, Maths10AKP6, Maths10ASR7a/b,
 *   Maths10SR4, Maths10PS6, Maths10AKP9, Maths10PR7b.
 * Content references 10G1a, 10G1c, 10G1e, 10G1f, 10G1g, 10G1h (similarity, Basic
 *   Proportionality Theorem, area-ratio of similar triangles, Pythagoras, proofs) all
 *   mapped to CBSE chapter topicKey "triangles".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=4, B=5, C=7.
 */
export const TRI_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-TRI-A-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In the figure, ST is parallel to QR. What is the length of SP?",
    "options": [
      "A. 2 cm",
      "B. 3 cm",
      "C. 4 cm",
      "D. 4.5 cm"
    ],
    "answer": "D. 4.5 cm",
    "solutionSteps": [
      "[1 mark] △PTS ∼ △PRQ since ST ∥ QR. By BPT, TP/RT = SP/QS, so SP/QS = TP/RT → SP = (TP/RT) × QS = (3/2) × 3 = 4.5 cm. Answer: D."
    ],
    "finalAnswer": "D. 4.5 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle PQR with point S on side PQ and point T on side PR, segment ST drawn parallel to base QR. Marked lengths: TP = 3 cm, QS = 3 cm, RT = 2 cm. SP is to be found. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-TRI-A-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, QR is parallel to ST. QR = a, QS = b, SP = c and ST = x. The correct relationship between x, a, b and c is given as",
    "options": [
      "A. x = ac / (a + b)",
      "B. x = bc / (a + b)",
      "C. x = ac / (b + c)",
      "D. x = bc / (a − b)"
    ],
    "answer": "C. x = ac / (b + c)",
    "solutionSteps": [
      "[1 mark] △PST ∼ △PQR (QR ∥ ST). So ST/QR = SP/QP → x/a = c/(b + c) → x = ac/(b + c). Answer: C."
    ],
    "finalAnswer": "C. x = ac / (b + c)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle PQR with point S on side PQ and point T on side PR; segment ST is parallel to base QR. Marked: QR = a, QS = b, SP = c, ST = x. Diagram not to scale."
  },
  {
    "id": "CBE-M-TRI-A-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In the figure, AB ∥ CD ∥ EF, with AC = 12 cm, BD = 9 cm, DF = 6 cm and CE = x. Given that x = 8 cm, find AE.",
    "options": [],
    "answer": "AE = 20 cm",
    "solutionSteps": [
      "[1 mark] AE = AC + CE = 12 + 8 = 20 cm."
    ],
    "finalAnswer": "AE = 20 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Three parallel lines AB ∥ CD ∥ EF cut by two transversals. On one transversal the points are A, C, E (with AC = 12 cm, CE = x = 8 cm); on the other transversal the points are B, D, F (with BD = 9 cm, DF = 6 cm). AE is to be found. This is part (b) of the item; part (a) establishes x = 8 cm."
  },
  {
    "id": "CBE-M-TRI-A-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A point O in the interior of a rectangle PQRS is joined with each of the vertices P, Q, R and S. Then OP² + OR² is",
    "options": [
      "A. OQ × OS",
      "B. OQ² + OS²",
      "C. OQ + OS",
      "D. OQ² / OS²"
    ],
    "answer": "B. OQ² + OS²",
    "solutionSteps": [
      "[1 mark] Drop perpendiculars from O to the four sides, creating right triangles. Then OP² + OR² = (OA² + AP²) + (OB² + BR²) and OQ² + OS² = (OB² + AQ² ) + (OA² + CS²); using the equal segments on opposite sides gives OP² + OR² = OQ² + OS². Answer: B."
    ],
    "finalAnswer": "B. OQ² + OS²",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Rectangle PQRS with an interior point O joined to all four vertices P, Q, R, S. To evaluate, perpendiculars are dropped from O to the four sides meeting them at points A, B, C, D, forming right-angled triangles with OP, OQ, OR, OS as hypotenuses."
  },
  {
    "id": "CBE-M-TRI-B-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, line BC is drawn parallel to DE to intersect side AD and EA of triangle ABC at distinct points B and C. Given that AB = x cm, BD = 5 cm, BC = 3 cm and DE = 8 cm, find the value of x.",
    "options": [],
    "answer": "x = 3 cm",
    "solutionSteps": [
      "[1 mark] Since BC ∥ DE, the triangles are similar, so AB/AD = BC/DE → x/(x + 5) = 3/8.",
      "[1 mark] Cross-multiplying: 8x = 3(x + 5) → 8x = 3x + 15 → 5x = 15 → x = 3 cm."
    ],
    "finalAnswer": "x = 3 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle ADE with BC ∥ DE, where B lies on AD and C lies on AE. Marked lengths: AB = x cm, BD = 5 cm, BC = 3 cm, DE = 8 cm. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-TRI-B-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similarity in Right Triangles",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "In △PQR, ∠PQR = 90° and QS ⊥ PR. Prove that △PSQ ∼ △QSR.",
    "options": [],
    "answer": "△PSQ ∼ △QSR (proved via AA similarity)",
    "solutionSteps": [
      "[1 mark] In △PSQ and △PQR: ∠PSQ = ∠PQR (each 90°) and ∠QPS = ∠QPR (common). So △PSQ ∼ △PQR (AA). Similarly △QSR ∼ △PQR (AA).",
      "[1 mark] Since both △PSQ and △QSR are similar to △PQR, by transitivity △PSQ ∼ △QSR. Hence proved."
    ],
    "finalAnswer": "△PSQ ∼ △QSR",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Right triangle PQR with the right angle at Q (∠PQR = 90°). QS is the perpendicular dropped from Q to the hypotenuse PR, meeting it at S. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-TRI-B-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, AB ∥ CD ∥ EF, with AC = 12 cm, BD = 9 cm, DF = 6 cm and CE = x. Find x.",
    "options": [],
    "answer": "x = 8 cm",
    "solutionSteps": [
      "[1 mark] Join BE meeting CD at P. In △ABE, PC ∥ AB, so by BPT EP/PB = EC/CA …(i). In △BEF, PD ∥ EF, so EP/PB = FD/DB …(ii). From (i) and (ii): EC/CA = FD/DB.",
      "[1 mark] So x/12 = 6/9 → x = (6 × 12)/9 = 8 cm."
    ],
    "finalAnswer": "x = 8 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Three parallel lines AB ∥ CD ∥ EF cut by two transversals. On one transversal: points A, C, E with AC = 12 cm and CE = x. On the other transversal: points B, D, F with BD = 9 cm and DF = 6 cm. Construction: join BE meeting CD at P."
  },
  {
    "id": "CBE-M-TRI-B-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "From an external point P, the length of the tangent PA to a circle is 8 cm. The distance from the centre O to the external point P is 10 cm. Find the diameter of the circle.",
    "options": [],
    "answer": "12 cm",
    "solutionSteps": [
      "[1 mark] OA ⊥ AP (radius is perpendicular to the tangent at the point of contact). By Pythagoras Theorem, OP² = OA² + AP² → OA = √(10² − 8²) = √(100 − 64) = √36 = 6 cm = radius.",
      "[1 mark] Diameter = 2r = 2 × 6 = 12 cm."
    ],
    "finalAnswer": "12 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. P is an external point. PA is a tangent of length 8 cm touching the circle at A, so OA (the radius) is perpendicular to PA. OP = 10 cm. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-TRI-B-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Pythagoras Theorem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Find the perimeter of an isosceles right triangle, the length of whose hypotenuse is 10 cm.",
    "options": [],
    "answer": "10(√2 + 1) cm",
    "solutionSteps": [
      "[1 mark] Let each of the two equal legs be a. By Pythagoras Theorem, a² + a² = 10² → 2a² = 100 → a² = 50 → a = 5√2 cm.",
      "[1 mark] Perimeter = a + a + hypotenuse = 5√2 + 5√2 + 10 = 10(√2 + 1) cm."
    ],
    "finalAnswer": "10(√2 + 1) cm",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-TRI-C-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "A line intersects sides PQ and PR of △PQR at A and B, respectively, and is parallel to QR, as shown in the figure. Prove that AQ/PQ = BR/PR.",
    "options": [],
    "answer": "AQ/PQ = BR/PR (proved using the Basic Proportionality Theorem)",
    "solutionSteps": [
      "[1 mark] Given: △PQR in which line AB intersects PQ at A and PR at B, with AB ∥ QR. To prove: AQ/PQ = BR/PR.",
      "[1 mark] Since AB ∥ QR, by the Basic Proportionality (Thales) Theorem, PA/AQ = PB/BR, hence PQ/PA = PR/PB and so PA/PQ = PB/PR.",
      "[1 mark] Then (PQ − AQ)/PQ = (PR − BR)/PR → 1 − AQ/PQ = 1 − BR/PR → AQ/PQ = BR/PR. Hence proved."
    ],
    "finalAnswer": "AQ/PQ = BR/PR",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle PQR with A on side PQ and B on side PR; segment AB is drawn parallel to base QR. Diagram not to scale."
  },
  {
    "id": "CBE-M-TRI-C-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Converse of Basic Proportionality Theorem",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In the figure, PR ∥ AC and PQ ∥ AB. Prove that QR ∥ BC.",
    "options": [],
    "answer": "QR ∥ BC (proved using the converse of the Basic Proportionality Theorem)",
    "solutionSteps": [
      "[1 mark] Since PR ∥ AC, applying the Basic Proportionality Theorem in △OAC gives CP/PA = OR/RC …(1).",
      "[1 mark] Since PQ ∥ AB, applying the Basic Proportionality Theorem in △OAB gives CQ/QB = CP/PA …(2).",
      "[1 mark] From (1) and (2), CQ/QB = OR/RC, so by the converse of the Basic Proportionality Theorem, QR ∥ BC. Hence proved."
    ],
    "finalAnswer": "QR ∥ BC",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A configuration with point O and triangle ABC. Points P, Q, R lie such that PR ∥ AC and PQ ∥ AB. The figure shows segments OA, OB, OC with P, Q, R as intersection points. To prove QR ∥ BC."
  },
  {
    "id": "CBE-M-TRI-C-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In the figure, PR ∥ AC and PQ ∥ AB (and QR ∥ BC). Prove that △ABC ∼ △PQR.",
    "options": [],
    "answer": "△ABC ∼ △PQR (proved by AA similarity)",
    "solutionSteps": [
      "[1 mark] PR ∥ AC gives ∠ORP = ∠OCA …(1) and QR ∥ BC gives ∠ORP = ∠OCB …(2); subtracting, ∠PRQ = ∠ACB …(3).",
      "[1 mark] PQ ∥ AB gives ∠OQP = ∠OBA …(4) and QR ∥ BC gives ∠OQR = ∠OBC …(5); subtracting, ∠PQR = ∠ABC …(6).",
      "[1 mark] From (3) and (6), two pairs of corresponding angles are equal, so △ABC ∼ △PQR by the AA similarity criterion. Hence proved."
    ],
    "finalAnswer": "△ABC ∼ △PQR",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A configuration with point O and triangle ABC. Points P, Q, R lie such that PR ∥ AC, PQ ∥ AB and QR ∥ BC. The figure shows segments OA, OB, OC with P, Q, R as intersection points. To prove △ABC ∼ △PQR."
  },
  {
    "id": "CBE-M-TRI-C-004",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, BA, FE and CD are parallel lines. Given that EG = 5 cm, GC = 10 cm, AB = 15 cm and DC = 18 cm, calculate EF.",
    "options": [],
    "answer": "EF = 9 cm",
    "solutionSteps": [
      "[1 mark] In △EFG and △CDG: ∠GFE = ∠GDC (alternate interior angles, EF ∥ DC with FD transversal) and ∠EGF = ∠CGD (vertically opposite angles). So △EFG ∼ △CDG by the AA similarity criterion.",
      "[1 mark] Corresponding sides are in the same ratio: EF/EG = CD/CG.",
      "[1 mark] EF/5 = 18/10 → EF = (18 × 5)/10 = 9 cm."
    ],
    "finalAnswer": "EF = 9 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Three parallel lines BA ∥ FE ∥ CD. Segments AB and DC act as the parallel sides; E, F, G, C, D are configured so that EF and CD are corresponding sides of similar triangles △EFG and △CDG meeting at G. Marked: EG = 5 cm, GC = 10 cm, AB = 15 cm, DC = 18 cm. Diagram not to scale."
  },
  {
    "id": "CBE-M-TRI-C-005",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, BA, FE and CD are parallel lines. Given that EG = 5 cm, GC = 10 cm, AB = 15 cm, DC = 18 cm and EF = 9 cm, calculate AC.",
    "options": [],
    "answer": "AC = 25 cm",
    "solutionSteps": [
      "[1 mark] In △CAB and △CEF: ∠CAB = ∠CEF (corresponding angles, AB ∥ EF with AC transversal) and ∠C = ∠C (common). So △CAB ∼ △CEF by the AA similarity criterion.",
      "[1 mark] Corresponding sides are in the same ratio: AC/CE = AB/EF, where CE = GC + EG = 10 + 5 = 15 cm.",
      "[1 mark] AC/15 = 15/9 → AC = (15 × 15)/9 = 25 cm."
    ],
    "finalAnswer": "AC = 25 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Three parallel lines BA ∥ FE ∥ CD (same figure as the previous part). Triangles △CAB and △CEF share vertex C with AB ∥ EF. Marked: EG = 5 cm, GC = 10 cm, AB = 15 cm, DC = 18 cm, EF = 9 cm (from part a), CE = 15 cm. Diagram not to scale."
  },
  {
    "id": "CBE-M-TRI-C-006",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Area Ratio of Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, △DPQ ∼ △DEF, ar(△DEF) = 144 cm², ar(△DPQ) = 196 cm² and DP = 24.5 cm. Find the length of DE.",
    "options": [],
    "answer": "DE = 21 cm",
    "solutionSteps": [
      "[1 mark] For similar triangles, ratio of areas = ratio of squares of corresponding sides. So (DP/DE)² = ar(△DPQ)/ar(△DEF) = 196/144.",
      "[1 mark] Taking square roots, DP/DE = 14/12.",
      "[1 mark] So DE = DP × 12/14 = 24.5 × 12/14 = 21 cm."
    ],
    "finalAnswer": "DE = 21 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two similar triangles △DPQ and △DEF sharing vertex D, with PQ and EF as corresponding sides (P, Q lying on DE, DF respectively). Given ar(△DEF) = 144 cm², ar(△DPQ) = 196 cm², DP = 24.5 cm. Diagram not drawn to scale."
  },
  {
    "id": "CBE-M-TRI-C-007",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In the figure, AB ⊥ BC, DE ⊥ AC and GF ⊥ BC. Prove that △ADE ∼ △GCF.",
    "options": [],
    "answer": "△ADE ∼ △GCF (proved by AA similarity)",
    "solutionSteps": [
      "[1 mark] In △ADE and △ACB: ∠A = ∠A (common) and ∠AED = ∠ABC (each 90°). So △ADE ∼ △ACB (AA) …(i).",
      "[1 mark] In △ACB and △GCF: ∠C = ∠C (common) and ∠ABC = ∠GFC (each 90°). So △ACB ∼ △GCF (AA) …(ii).",
      "[1 mark] From (i) and (ii), by transitivity of similarity, △ADE ∼ △GCF. Hence proved."
    ],
    "finalAnswer": "△ADE ∼ △GCF",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A configuration with points A, B, C, D, E, F, G where AB ⊥ BC, DE ⊥ AC and GF ⊥ BC. D and E lie so that DE is perpendicular to AC; G and F lie so that GF is perpendicular to BC. To prove △ADE ∼ △GCF. Diagram not to scale."
  }
];
