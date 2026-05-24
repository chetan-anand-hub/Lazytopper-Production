import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Magnetic Effects of Electric Current — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "magnetic-effects-of-electric-current"
 * Section distribution: A=1 (AR)
 */
export const MAGNETIC_EFFECTS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-MAG-001",
    "subject": "Science",
    "topicKey": "magnetic-effects-of-electric-current",
    "subtopic": "Magnetic Field Around Current-Carrying Conductor",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Assertion: A compass needle is placed near a current carrying wire. The deflection of the compass needle decreases when the magnitude of the current in the wire is increased.\nReason: The strength of a magnetic field at a point near the conductor increases on increasing the current.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(D) Assertion is false but Reason is true.",
    "solutionSteps": [
      "Reason is true — magnetic field strength B around a straight wire ∝ I (Biot–Savart / Ampère). However, the Assertion is false: a stronger field actually INCREASES the deflection of the compass needle, not decreases it. Hence A is false, R is true. Answer: (D)."
    ],
    "finalAnswer": "(D)",
    "isCompetencyBased": false
  }
];
