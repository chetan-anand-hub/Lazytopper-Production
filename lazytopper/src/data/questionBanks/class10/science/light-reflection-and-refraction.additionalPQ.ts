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

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIGHT-004", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Refractive Index — Speed of Light Calculation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The light enters from air to glass having refractive index 1.5. The speed of light in glass is:",
    options: ["3 × 10^8 m/s", "2 × 10^8 m/s", "1.5 × 10^8 m/s", "2.25 × 10^8 m/s"],
    answer: "2 × 10^8 m/s",
    solutionSteps: ["Refractive index n = c / v ⟹ v = c / n.", "v = (3 × 10^8 m/s) / 1.5 = 2 × 10^8 m/s."],
    finalAnswer: "(b) 2 × 10^8 m/s",
    ncertRef: "APQ Science-PQ2 Q13", isCompetencyBased: false },

  // Science-PQ2 Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-S-LIGHT-005", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Convex Mirror — Sign Conventions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Remembering",
    questionText: "For a convex mirror, the image distance (v) = 5 cm, focal length (f) = 10 cm and height of the image (hi) = 7.5 cm. The correct representation according to sign conventions is:",
    options: [
      "v = -5 cm, f = -10 cm and hi = -7.5 cm",
      "v = -5 cm, f = +10 cm and hi = -7.5 cm",
      "v = +5 cm, f = -10 cm and hi = +7.5 cm",
      "v = +5 cm, f = +10 cm and hi = +7.5 cm"
    ],
    answer: "v = +5 cm, f = +10 cm and hi = +7.5 cm",
    solutionSteps: ["For a convex mirror, the image formed is virtual (behind the mirror) and erect.", "Distances measured opposite to incident light (behind mirror) are POSITIVE — so v = +5 cm. Focal length is also behind mirror ⟹ f = +10 cm.", "Erect (upright) images have POSITIVE height ⟹ hi = +7.5 cm."],
    finalAnswer: "(d) v = +5 cm, f = +10 cm and hi = +7.5 cm",
    ncertRef: "APQ Science-PQ2 Q14", isCompetencyBased: false },

  // Science-PQ2 Q31 first variant (Section C, Short, 3 marks)
  { id: "APQ-S-LIGHT-006", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Convex Lens — Image Position and Magnification", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A 4 cm tall object is placed perpendicular to the principal axis of a convex lens of focal length 20 cm. The distance of the object from the lens is 15 cm. Find the nature, position and size of the image formed.",
    answer: "v = -60 cm; hi = +16 cm; image virtual, erect, magnified.",
    solutionSteps: ["Given: ho = 4 cm, u = -15 cm, f = +20 cm. Using lens formula 1/v - 1/u = 1/f.", "1/v = 1/f + 1/u = 1/20 + 1/(-15) = 3/60 - 4/60 = -1/60 ⟹ v = -60 cm.", "Magnification m = v/u = -60 / -15 = +4. So hi = m × ho = 4 × 4 = +16 cm.", "Nature: image is VIRTUAL, ERECT and MAGNIFIED (formed on the same side as the object, 60 cm from the lens)."],
    finalAnswer: "v = -60 cm, hi = +16 cm; virtual, erect, magnified image.",
    ncertRef: "APQ Science-PQ2 Q31 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q31 OR variant (Section C, Short, 3 marks)
  { id: "APQ-S-LIGHT-007", subject: "Science", topicKey: "light-reflection-and-refraction", subtopic: "Concave Lens — Image Distance and Ray Diagram", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An object is placed at a distance of 60 cm from a concave lens of focal length 30 cm. (a) Use the lens formula to find the distance of image from the lens. (b) Draw a ray diagram to justify your answer in part (a).",
    answer: "(a) v = -20 cm (image on same side as object). (b) Ray diagram of concave lens.",
    solutionSteps: ["Given: u = -60 cm, f = -30 cm (concave lens, negative focal length). Lens formula: 1/v - 1/u = 1/f.", "1/v = 1/f + 1/u = -1/30 + (-1/60) = -2/60 - 1/60 = -3/60 = -1/20 ⟹ v = -20 cm.", "(a) Image distance is 20 cm on the SAME side as the object — a diminished, virtual, erect image.", "(b) Ray diagram: one ray parallel to principal axis diverges after passing through lens, appearing to come from focus on object side; another ray through optical centre passes undeviated. Their backward extensions meet on the object side, between optical centre and focus, giving a diminished virtual image."],
    finalAnswer: "(a) v = -20 cm; (b) ray diagram showing virtual, erect, diminished image on object side.",
    ncertRef: "APQ Science-PQ2 Q31 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: ray diagram for concave lens with object at 60 cm and focal length 30 cm." },
];
