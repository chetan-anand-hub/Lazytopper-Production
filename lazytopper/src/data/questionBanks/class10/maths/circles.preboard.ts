import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * circles — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "circles".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const CIRC_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-1-CIRC-A-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Intersecting Chords of a Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two chords AB and CD of a circle intersect at E such that AE = 2.4 cm, BE = 3.2 cm and CE = 1.6 cm. The length of DE is",
    "options": [
      "(a) 1.6 cm",
      "(b) 3.2 cm",
      "(c) 4.8 cm",
      "(d) 6.4 cm"
    ],
    "answer": "(c) 4.8 cm",
    "solutionSteps": [
      "[1 mark] By the intersecting chords property, AE × BE = CE × DE → 2.4 × 3.2 = 1.6 × DE → 7.68 = 1.6 × DE → DE = 4.8 cm. Answer: (c)."
    ],
    "finalAnswer": "(c) 4.8 cm",
    "isCompetencyBased": false
  },
  {
    "id": "PB-M-1-CIRC-C-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents to a Circle",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "ABC is a triangle. A circle touches side AB and side AC produced and side BC at X, Y and Z respectively. Show that AX = ½ × perimeter of △ABC.",
    "options": [],
    "answer": "Proved: AX = ½ (perimeter of △ABC)",
    "solutionSteps": [
      "[1 mark] Tangents drawn from an external point to a circle are equal. From A: AX = AY. From B: BX = BZ. From C: CY = CZ.",
      "[1 mark] Perimeter = AB + BC + CA = (AX − BX) + (BZ + ZC) + (CY − AY)... arranged as: AX + AY = (AB + BX) + (AC + CY) = AB + BZ + AC + CZ = AB + (BZ + ZC) + AC = AB + BC + CA.",
      "[1 mark] Since AX = AY, we get 2 AX = AB + BC + CA = perimeter of △ABC. Therefore AX = ½ × perimeter of △ABC. Hence proved."
    ],
    "finalAnswer": "AX = ½ × (perimeter of △ABC) (proved)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Triangle ABC with a circle (excircle opposite A) lying outside the triangle beyond side BC. The circle touches side AB at X, touches side AC produced beyond C at Y, and touches side BC at Z. Tangent segments AX and AY from A, BX and BZ from B, CY and CZ from C are equal in pairs."
  },
  {
    "id": "PB-M-2-CIRC-C-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent to a Circle / Angle Properties",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the figure, PQ is a tangent to a circle with centre O at point B, and A is a point on the circle. If ∠OAB = 30°, find ∠ABP and ∠AOB.",
    "options": [],
    "answer": "∠ABP = 60°, ∠AOB = 120°.",
    "solutionSteps": [
      "[1 mark] OA and OB are radii, so OA = OB and ∆OAB is isosceles; hence ∠OBA = ∠OAB = 30°.",
      "[1 mark] The tangent PQ at B is perpendicular to the radius OB, so ∠OBP = 90°. Therefore ∠ABP = ∠OBP − ∠OBA = 90° − 30° = 60°.",
      "[1 mark] In ∆OAB, ∠AOB = 180° − ∠OAB − ∠OBA = 180° − 30° − 30° = 120°."
    ],
    "finalAnswer": "∠ABP = 60°, ∠AOB = 120°.",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A circle with centre O. A tangent line PQ touches the circle at point B (P to the left, Q to the right). A is another point on the circle; chords OA, OB (radii) and AB are drawn. The angle ∠OAB = 30° is marked at A; ∠OBP between radius OB and tangent BP is 90°."
  }
];
