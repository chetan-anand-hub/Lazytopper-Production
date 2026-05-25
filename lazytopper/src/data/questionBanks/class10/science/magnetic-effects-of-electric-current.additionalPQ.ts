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

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q19 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-MAG-003", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Domestic Electric Circuits — Earth Wire and Current Rating", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A): One circuit with 15 A current rating is used for appliances such as geysers and air coolers. Reason (R): Appliances with metallic body are connected to an earth wire with low resistance.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "Both A and R are true, but R is not the correct explanation of A.",
    solutionSteps: ["A is true: high-power appliances (geysers, air coolers) draw large currents — they are served by a separate 15 A circuit (vs ~5 A circuit for bulbs/fans).", "R is true: metallic-body appliances are earthed through a low-resistance earth wire to safely conduct away leakage current and prevent shocks.", "However, R explains the SAFETY of metallic appliances, not why a 15 A circuit is used. Hence R is true but does NOT explain A."],
    finalAnswer: "(b) Both A and R are true, but R is not the correct explanation of A.",
    ncertRef: "APQ Science-PQ2 Q19", isCompetencyBased: true },

  // Science-PQ2 Q25 first variant (Section B, Short, 2 marks)
  { id: "APQ-S-MAG-004", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Right-Hand Thumb Rule — Current Loop", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Imagine a current-carrying circular loop of wire on the plane of your answer sheet. The magnetic field inside the loop is into the plane of the paper. (i) What must be the direction of the current in the loop? (ii) State the rule used here.",
    answer: "(i) Clockwise. (ii) Right-hand thumb rule.",
    solutionSteps: ["(i) Using the right-hand thumb rule: if the magnetic field inside the loop is INTO the plane of the paper, point the right-hand thumb in that direction; fingers curl in the direction of current flow — CLOCKWISE in the plane of the paper.", "(ii) The rule used is the RIGHT-HAND THUMB RULE: imagine holding a current-carrying conductor in your right hand with the thumb pointing in the direction of current; the fingers wrap around the conductor in the direction of the magnetic field lines."],
    finalAnswer: "(i) Clockwise current; (ii) right-hand thumb rule.",
    ncertRef: "APQ Science-PQ2 Q25 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q25 OR variant (Section B, Short, 2 marks)
  { id: "APQ-S-MAG-005", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Fleming's Left-Hand Rule and Force on Conductor", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "(a) State the rule to determine the direction of the force experienced by a current-carrying straight conductor placed in a magnetic field which is perpendicular to it. (b) When will the magnitude of the displacement of the rod be the largest?",
    answer: "(a) Fleming's left-hand rule. (b) When current is perpendicular to magnetic field.",
    solutionSteps: ["(a) FLEMING'S LEFT-HAND RULE: stretch the forefinger, middle finger and thumb of the left hand mutually perpendicular to each other. If the forefinger points in the direction of the MAGNETIC FIELD and the middle finger points in the direction of CURRENT, then the THUMB indicates the direction of the FORCE / motion of the conductor.", "(b) The displacement (and force F = B I L sin θ) of the rod is LARGEST when sin θ = 1 ⟹ θ = 90°, i.e., when the direction of current is at RIGHT ANGLES to the direction of the magnetic field."],
    finalAnswer: "(a) Fleming's left-hand rule; (b) when current ⟂ magnetic field.",
    ncertRef: "APQ Science-PQ2 Q25 (OR variant)", isCompetencyBased: true },

  // Science-PQ2 Q33 (Section C, Short, 3 marks)
  { id: "APQ-S-MAG-006", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Solenoid Magnetic Field; Overloading Precautions", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "(a) Draw the pattern of the magnetic field lines around a current-carrying solenoid. (b) Mention two precautions that should be taken to avoid the overloading of domestic electric circuits.",
    answer: "(a) Solenoid field — parallel inside, looped outside (similar to bar magnet). (b) Avoid connecting too many devices in one socket; avoid using faulty appliances.",
    solutionSteps: ["(a) Magnetic field of a solenoid: INSIDE the solenoid, magnetic field lines are PARALLEL straight lines (uniform, strong field). OUTSIDE, the lines curve and run from one end (north pole) to the other (south pole) — similar to a bar magnet's field pattern. Mark direction of current and direction of field lines.", "(b) Precaution 1: Do NOT connect too many devices in the same socket — avoids drawing excessive current through one circuit.", "(b) Precaution 2: Do NOT connect faulty appliances in the socket. (Also valid: do not run multiple high-power devices simultaneously on the same circuit.)"],
    finalAnswer: "(a) Solenoid field — parallel inside, looped outside like bar magnet; (b) avoid overloading single socket and avoid faulty appliances.",
    ncertRef: "APQ Science-PQ2 Q33", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: solenoid magnetic-field-line pattern with current and field directions." },
];
