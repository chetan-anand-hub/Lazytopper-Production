import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Circles — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "circles"
 * Section distribution: A=2, B=1, C=1
 */
export const CIRCLES_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-CI-001",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent–Chord Angle (Alternate Segment Theorem)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If O is centre of a circle and Chord PQ makes an angle 50° with the tangent PR at the point of contact P, then the angle subtended by the chord at the centre is",
    "options": [
      "(A) 130°",
      "(B) 100°",
      "(C) 50°",
      "(D) 30°"
    ],
    "answer": "(B) 100°",
    "solutionSteps": [
      "Angle between chord PQ and tangent PR at P = 50°. OP ⊥ PR (radius ⊥ tangent), so ∠OPQ = 90° − 50° = 40°. In isosceles Δ OPQ (OP = OQ = r), ∠OPQ = ∠OQP = 40°, so ∠POQ = 180° − 40° − 40° = 100°. Answer: (B)."
    ],
    "finalAnswer": "(B) 100°",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-CI-002",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangents from External Point — Quadrilateral Circumscribing a Circle",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A quadrilateral PQRS is drawn to circumscribe a circle. If PQ = 12 cm, QR = 15 cm and RS = 14 cm, then find the length of SP.",
    "options": [
      "(A) 15 cm",
      "(B) 14 cm",
      "(C) 12 cm",
      "(D) 11 cm"
    ],
    "answer": "(D) 11 cm",
    "solutionSteps": [
      "For a quadrilateral circumscribing a circle, opposite sides sum equally: PQ + RS = QR + SP. So 12 + 14 = 15 + SP ⇒ SP = 26 − 15 = 11 cm. Answer: (D)."
    ],
    "finalAnswer": "(D) 11 cm",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-CI-003",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Perimeter of Triangle Using Equal Tangents from External Point",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "From an external point P, two tangents, PA and PB are drawn to a circle with centre O. At a point E on the circle, a tangent is drawn to intersect PA and PB at C and D, respectively. If PA = 10 cm, find the perimeter of Δ PCD.",
    "options": [],
    "answer": "Perimeter of Δ PCD = 20 cm.",
    "solutionSteps": [
      "Tangents from a common external point are equal: PA = PB; CA = CE; DE = DB.",
      "Perimeter of Δ PCD = PC + CD + DP = PC + (CE + ED) + DP = PC + CA + BD + DP = (PC + CA) + (BD + DP) = PA + PB = 2·PA.",
      "Therefore perimeter = 2 × 10 = 20 cm."
    ],
    "finalAnswer": "Perimeter of Δ PCD = 20 cm.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-CI-004",
    "subject": "Maths",
    "topicKey": "circles",
    "subtopic": "Tangent Length and Radius — Chord with 30° to Radius",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "PA and PB are tangents drawn to a circle of centre O from an external point P. Chord AB makes an angle of 30° with the radius at the point of contact. If length of the chord is 6 cm, find the length of the tangent PA and the length of the radius OA.\n\n[OR]\n\nTwo tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ = 2 ∠OPQ.",
    "options": [],
    "answer": "Main: PA = 6 cm; OA = 2√3 cm. OR Alt: ∠PTQ = 2 ∠OPQ proved.",
    "solutionSteps": [
      "Main: ∠OAB = 30°. Radius ⊥ tangent gives ∠OAP = 90°, so ∠PAB = 90° − 30° = 60°. AP = BP (tangents from external point) ⇒ Δ PAB is isosceles, so ∠PAB = ∠PBA = 60°, giving ∠APB = 180° − 120° = 60°. Hence Δ PAB is equilateral with PA = PB = AB = 6 cm.",
      "In right Δ OAP, ∠OPA = 30° (half of 60°). tan 30° = OA/PA ⇒ (1/√3) = OA/6 ⇒ OA = 6/√3 = 2√3 cm.",
      "OR (alternative): Let ∠TPQ = θ. ∠TPO = 90° (radius ⊥ tangent) ⇒ ∠OPQ = 90° − θ. TP = TQ (tangents from T), so Δ TPQ is isosceles, ∠TQP = ∠TPQ = θ. In Δ TPQ, sum of angles: 2θ + ∠PTQ = 180° ⇒ ∠PTQ = 180° − 2θ = 2(90° − θ) = 2 ∠OPQ. Hence proved."
    ],
    "finalAnswer": "Main: PA = 6 cm, OA = 2√3 cm. OR Alt: proved.",
    "isCompetencyBased": false
  }
];
