import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "magnetic-effects-of-electric-current"
// Extraction date: 2026-05-25

export const MAGNETIC_EFFECTS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q19 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-MAG-001", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field around a Straight Conductor", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): Iron filings scattered around a straight current carrying conductor in a plane perpendicular to the length of the conductor, arrange themselves in concentric circles. Reason (R): Magnetic field has both magnitude and direction.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, and R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "Both A and R are true, and R is not the correct explanation of A.",
    solutionSteps: ["A is true: the magnetic field lines around a straight current-carrying conductor form concentric circles in a plane perpendicular to the wire (Oersted's experiment).", "R is true: magnetic field is a vector quantity with both magnitude and direction. But R doesn't explain WHY the field is circular — that's due to the symmetry of the current configuration, not because B is a vector."],
    finalAnswer: "(b) Both A and R are true, and R is not the correct explanation of A.",
    ncertRef: "APQ Science-PQ Q19", isCompetencyBased: true },

  // Science-PQ Q25 OR variant (Section B, Short, 2 marks)
  { id: "APQ-S-MAG-002", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field inside a Solenoid", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "A helical coil whose length is greater than its diameter is connected to a battery (as shown). (a) How does the magnetic field at point P compare with the magnetic field at point Q? Justify your answer. (b) State one way in which the strength of the magnetic field inside a current carrying helical coil can be changed.",
    answer: "(a) Same at P and Q (uniform field inside solenoid). (b) Change number of turns or current.",
    solutionSteps: ["(a) The helical coil acts as a solenoid. Inside a solenoid (length >> diameter), the magnetic field is UNIFORM and consists of parallel straight lines. So magnetic field at P = magnetic field at Q.", "(b) To change the strength: (i) increase/decrease the number of turns per unit length, OR (ii) increase/decrease the current through the coil. (Also: insert an iron core to dramatically increase B.)"],
    finalAnswer: "(a) Same; (b) change turns or current.",
    ncertRef: "APQ Science-PQ Q25 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: helical coil/solenoid with points P, Q labelled." },
];
