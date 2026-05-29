import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * magnetic-effects-of-electric-current — CBSE Sample Papers (P5): Science SQP 2022-23 + OnBoard 2023.
 * Extracted 2026-05-29 (Sprint 1). topicKey "magnetic-effects-of-electric-current". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const MAGN_SP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-2023-MAGN-A-001",
    "subject": "Science",
    "topicKey": "magnetic-effects-of-electric-current",
    "subtopic": "Magnetic field lines",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Which of the following statements is incorrect regarding magnetic field lines? (a) The direction of the magnetic field lines at a point is taken to be the direction in which the N-pole of a magnetic compass needle points. (b) Magnetic field lines are formed as closed curves. (c) If the magnetic field lines are parallel and equidistant, they show zero field strength. (d) The relative strength of the magnetic field is shown by the degree of closeness of the lines.",
    "options": [
      "(a) The direction of the magnetic field lines at a point is taken to be the direction in which the N-pole of a magnetic compass needle points.",
      "(b) Magnetic field lines are formed as closed curves.",
      "(c) If the magnetic field lines are parallel and equidistant, they show zero field strength.",
      "(d) The relative strength of the magnetic field is shown by the degree of closeness of the lines."
    ],
    "answer": "(c) If the magnetic field lines are parallel and equidistant, they show zero field strength.",
    "solutionSteps": [
      "[1 mark] Correct option (c) is incorrect: parallel and equidistant magnetic field lines represent a uniform (constant, non-zero) magnetic field, not zero field strength; the other statements are correct."
    ],
    "finalAnswer": "(c) If the magnetic field lines are parallel and equidistant, they show zero field strength.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-2023-MAGN-A-002",
    "subject": "Science",
    "topicKey": "magnetic-effects-of-electric-current",
    "subtopic": "Electromagnets — core material",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): A steel core is used for making an electromagnet. Reason (R): Steel gets permanently magnetised when the current flows through the coil wound around it. Select the appropriate option.",
    "options": [
      "(a) Both A and R are true and R is the correct explanation of A.",
      "(b) Both A and R are true but R is not the correct explanation of A.",
      "(c) A is true but R is false.",
      "(d) A is false but R is true."
    ],
    "answer": "(d) A is false but R is true.",
    "solutionSteps": [
      "[1 mark] Correct option (d): soft iron, not steel, is used as the core of an electromagnet because it loses magnetism when the current is switched off (so A is false); steel does get permanently magnetised, which is why it is unsuitable for electromagnets (R true)."
    ],
    "finalAnswer": "(d) A is false but R is true.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-2023-MAGN-C-001",
    "subject": "Science",
    "topicKey": "magnetic-effects-of-electric-current",
    "subtopic": "Electromagnetic induction in a coil",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "A coil made up of copper metal is connected to a galvanometer. What changes will be observed if a bar magnet is a. pushed inside the coil with its N-pole entering first? b. held at rest inside the coil? c. pulled out again?",
    "options": [],
    "answer": "a. A momentary deflection is seen, showing a momentary induced current. b. No deflection, since there is no change in magnetic flux and no current is induced. c. A momentary deflection in the opposite direction, showing induced current in the opposite direction.",
    "solutionSteps": [
      "[1 mark] a. When the N-pole is pushed into the coil, a momentary deflection is observed in the galvanometer, indicating that a momentary (induced) current is generated in the coil.",
      "[1 mark] b. When the magnet is held at rest inside the coil, there is no deflection in the galvanometer, signifying that no current is produced (no change in magnetic flux).",
      "[1 mark] c. When the magnet is pulled out of the coil, a deflection in the opposite direction is observed, implying the induced current is now in the opposite direction."
    ],
    "finalAnswer": "a. Momentary deflection (induced current). b. No deflection (no current). c. Momentary deflection in the opposite direction (current reversed).",
    "isCompetencyBased": true
  },
  {
    "id": "SP-S-2023-MAGN-A-001",
    "subject": "Science",
    "topicKey": "magnetic-effects-of-electric-current",
    "subtopic": "Magnetic Field Lines",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): The direction of magnetic field lines, outside the magnet, is from the north pole to the south pole. Reason (R): The north pole of a magnet always has a stronger magnetic field around it than the south pole. Options: a. Both A and R are true, and R is the correct explanation of A. b. Both A and R are true, and R is not the correct explanation of A. c. A is true but R is false. d. A is false but R is true.",
    "options": [
      "a. Both A and R are true, and R is the correct explanation of A.",
      "b. Both A and R are true, and R is not the correct explanation of A.",
      "c. A is true but R is false.",
      "d. A is false but R is true."
    ],
    "answer": "c. A is true but R is false.",
    "solutionSteps": [
      "[1 mark] Correct option is (c). Assertion is true: outside a magnet the field lines run from the north pole to the south pole. Reason is false: both poles of a magnet have equal strength."
    ],
    "finalAnswer": "c. A is true but R is false.",
    "isCompetencyBased": true
  }
];
