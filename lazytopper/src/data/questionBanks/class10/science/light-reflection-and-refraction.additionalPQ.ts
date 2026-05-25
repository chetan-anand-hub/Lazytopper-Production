import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "light-reflection-and-refraction"
// Extraction date: 2026-05-25

export const LIGHT_REFLECTION_APQ: CanonicalQuestion[] = [
  // Science-PQ Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIGHT-001", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Concave Mirror — Image Position", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "When an object was kept at position X in front of a concave mirror, an enlarged and virtual image was formed. Which among the following identifies 'X' correctly?",
    options: [
      "anywhere between the centre of curvature and principal focus",
      "anywhere between the pole and principal focus",
      "exactly at the centre of curvature",
      "exactly at the principal focus"
    ],
    answer: "anywhere between the pole and principal focus",
    solutionSteps: ["For a concave mirror, virtual and enlarged image is formed only when the object is between the pole (P) and the principal focus (F)."],
    finalAnswer: "(b) anywhere between the pole and principal focus",
    ncertRef: "APQ Science-PQ Q13", isCompetencyBased: false },

  // Science-PQ Q24 (Section B, Short, 2 marks)
  { id: "APQ-S-LIGHT-002", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Convex Mirror — Search Mirror Application", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Search mirrors are mirrors that are used to look for hidden objects underneath the cars. The hidden objects can be easily spotted as the mirror provides a wider field of view. (a) What type of mirrors are generally used to make search mirrors? (b) With the help of a ray diagram describe the nature of image formed by the type of mirror identified in (a).",
    answer: "(a) Convex mirrors. (b) Virtual, erect, diminished image.",
    solutionSteps: ["(a) Convex mirrors — they diverge light and provide a wider field of view than plane or concave mirrors.", "(b) Image formed by a convex mirror is always virtual, erect, and diminished. Ray diagram: object in front; one ray parallel to axis appears to diverge from focus behind mirror; another ray towards centre of curvature reflects back along itself. Image forms behind mirror, between pole and focus."],
    finalAnswer: "(a) Convex mirror; (b) virtual, erect, diminished.",
    ncertRef: "APQ Science-PQ Q24", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: ray diagram for convex mirror." },

  // Science-PQ Q31 (Section C, Short, 3 marks)
  { id: "APQ-S-LIGHT-003", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Refractive Index — Speed of Light", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Absolute refractive indices of two media P and Q are 1.33 (nP) and 2.52 (nQ) respectively. The speed of light in medium P is 2 × 10^8 m/s. (a) What would be the speed of light in medium Q (vQ)? (b) If the angle of incidence for a ray of light travelling from medium P to Q is 0°, then what will be the path of light in medium Q?",
    answer: "(a) vQ ≈ 1.056 × 10^8 m/s. (b) Travels undeviated.",
    solutionSteps: ["nP = c/vP; nQ = c/vQ. Ratio: nP/nQ = vQ/vP ⟹ 1.33/2.52 = vQ / (2 × 10^8).", "vQ = (1.33 × 2 × 10^8) / 2.52 = 2.66 / 2.52 × 10^8 ≈ 1.056 × 10^8 m/s.", "(b) At normal incidence (angle of incidence = 0°), light enters perpendicular to the interface and travels undeviated (no refraction)."],
    finalAnswer: "(a) ~1.056 × 10^8 m/s; (b) undeviated.",
    ncertRef: "APQ Science-PQ Q31", isCompetencyBased: true },
];
