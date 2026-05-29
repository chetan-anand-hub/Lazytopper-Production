import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * circles — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "circles". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const CIRC_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-CIRC-B-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents to a Circle",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the given figure, AP and BP are tangents to a circle with centre O, such that AP = 5 cm and ∠APB = 60°. Find length of chord AB.",
    "options": [],
    "answer": "AB = 5 cm",
    "solutionSteps": [
      "[1 mark] Tangents from an external point are equal, so PA = PB. Hence ∠PAB = ∠PBA (angles opposite equal sides). By angle sum property of ∆PAB: 2∠PAB + 60° = 180° → ∠PAB = 60°.",
      "[1 mark] All three angles of ∆PAB are 60°, so it is equilateral. Therefore AB = AP = 5 cm. Length of chord AB is 5 cm."
    ],
    "finalAnswer": "AB = 5 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. From an external point P, two tangents PA and PB touch the circle at A and B, with AP = 5 cm and ∠APB = 60°. AB is the chord joining the points of contact."
  },
  {
    "id": "SP-M-2022-CIRC-C-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents to a Circle (Inscribed in Quadrilateral)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "In the given figure, a circle is inscribed in a quadrilateral ABCD in which ∠B = 90°. If AD = 23 cm, AB = 29 cm and DS = 5 cm, find the radius (r) of the circle.",
    "options": [],
    "answer": "r = 11 cm",
    "solutionSteps": [
      "[1 mark] The tangent is perpendicular to the radius at the point of contact, so ∠OPB = ∠OQB = 90°. With ∠B = 90° and OP = OQ = r, quadrilateral OQBP is a square.",
      "[1 mark] Tangents from an external point are equal: DR = DS = 5 cm and AQ = AR. Then AR = AD − DR = 23 − 5 = 18 cm, so AQ = 18 cm.",
      "[1 mark] BQ = AB − AQ = 29 − 18 = 11 cm. Since OQBP is a square, radius OQ = BQ = 11 cm."
    ],
    "finalAnswer": "r = 11 cm",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O inscribed in quadrilateral ABCD with ∠B = 90°. The circle touches the four sides at points P (on AB), Q (on BC), R (on AD) and S (on DC). AD = 23 cm, AB = 29 cm, DS = 5 cm; OP and OQ are radii to the contact points on AB and BC."
  },
  {
    "id": "SP-M-2022-CIRC-C-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents to a Circle (Parallelogram Proof)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "Prove that a parallelogram circumscribing a circle is a rhombus.",
    "options": [],
    "answer": "Parallelogram circumscribing a circle is a rhombus (proved)",
    "solutionSteps": [
      "[1 mark] Let ABCD be a parallelogram circumscribing a circle with centre O, touching the sides at P, Q, R, S. Tangents from an external point are equal: AP = AS, BP = BQ, CR = CQ, DR = DS.",
      "[1 mark] Adding these four equalities: AP + BP + CR + DR = AS + BQ + CQ + DS → AB + CD = AD + BC …(5).",
      "[1 mark] Since ABCD is a parallelogram, AB = CD and AD = BC. Substituting in (5): 2AB = 2AD → AB = AD. Hence all sides are equal, so ABCD is a rhombus. Proved."
    ],
    "finalAnswer": "Parallelogram circumscribing a circle is a rhombus (proved)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Parallelogram ABCD circumscribing a circle with centre O. The circle touches sides AB, BC, CD, DA at points P, Q, R, S respectively."
  }
];
