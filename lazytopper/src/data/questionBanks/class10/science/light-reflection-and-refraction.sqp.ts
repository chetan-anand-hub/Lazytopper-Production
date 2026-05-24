import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Light — Reflection and Refraction — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "light-reflection-and-refraction"
 * Section distribution: A=1, B=1, C=1, D=1
 */
export const LIGHT_REFLECTION_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-LIGHT-001",
    "subject": "Science",
    "topicKey": "light-reflection-and-refraction",
    "subtopic": "Image Formation by Convex Mirror",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "An object is placed in front of a convex mirror. Its image is formed:",
    "options": [
      "(A) at a distance equal to the object distance in front of the mirror.",
      "(B) at twice the distance of the object in front of the mirror.",
      "(C) half the distance of the object in front of the mirror.",
      "(D) behind the mirror and its position varies according to the object distance."
    ],
    "answer": "(D) behind the mirror and its position varies according to the object distance.",
    "solutionSteps": [
      "Convex mirrors always form virtual, erect and diminished images behind the mirror, regardless of the object's distance. The image position (between pole and focus) shifts as the object moves. Answer: (D)."
    ],
    "finalAnswer": "(D) behind the mirror; position varies with object distance.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-LIGHT-002",
    "subject": "Science",
    "topicKey": "light-reflection-and-refraction",
    "subtopic": "Refraction Direction and Speed of Light",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The refractive indices of three media are given below:\nMedium A: 1.6 | Medium B: 1.8 | Medium C: 1.5\nA ray of light is travelling from A to B and another ray is travelling from B to C.\n(a) In which of the two cases the refracted ray bends towards the normal?\n(b) In which case does the speed of light increase in the second medium?\nGive reasons for your answer.",
    "options": [],
    "answer": "(a) Ray bends towards normal when going A → B (n_B > n_A). (b) Speed of light increases when going B → C (n_C < n_B).",
    "solutionSteps": [
      "(a) When light travels from an optically rarer medium to an optically denser medium it bends towards the normal. Here n_B (1.8) > n_A (1.6), so the ray going from A to B bends towards the normal.",
      "(b) The speed of light v = c/n, so v is larger in a medium with smaller n. n_C (1.5) < n_B (1.8), so the speed of light increases when the ray travels from B to C."
    ],
    "finalAnswer": "(a) A → B (towards normal); (b) B → C (speed increases).",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-LIGHT-003",
    "subject": "Science",
    "topicKey": "light-reflection-and-refraction",
    "subtopic": "Refractive Index Reasoning and Semi-Circular Block",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "(i) Explain why the refractive index of any material with respect to air is always greater than 1.\n(ii) In the figure below, a light ray travels from air into the semi-circular plastic block. Give a reason why the ray does not deviate at the semi-circular boundary of the plastic block.\n(iii) Complete the ray diagram of the above scenario when the light ray comes out of the plastic block from the top flat end.",
    "options": [],
    "answer": "(i) Speed of light in any material < speed in air, so n = c/v > 1. (ii) Ray enters along the radius (normal incidence) at the curved face → no deviation. (iii) Ray bends away from the normal at the flat exit face (going to a rarer medium).",
    "solutionSteps": [
      "(i) Refractive index of a medium with respect to air = (speed of light in air) / (speed of light in the medium). Since the speed of light in any material medium is always less than the speed of light in air, this ratio is always greater than 1.",
      "(ii) At the curved (semi-circular) face, the incident light ray is directed along a radius of the semicircle — it strikes the surface along the normal at that point. For normal incidence, the angle of incidence is 0°, so the refracted ray continues without deviation.",
      "(iii) When the ray reaches the flat top face and exits from the denser plastic back into rarer air, it bends AWAY from the normal (Snell's law: n_plastic·sin θ₁ = n_air·sin θ₂; since n_plastic > n_air, θ₂ > θ₁). The ray diagram shows the incident ray entering along the radius, going straight through, then bending away from the normal at the flat exit face."
    ],
    "finalAnswer": "(i) n > 1 because v_medium < c. (ii) Normal incidence at curved face → no deviation. (iii) Bends away from normal at flat exit face.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-LIGHT-004",
    "subject": "Science",
    "topicKey": "light-reflection-and-refraction",
    "subtopic": "Lens / Concave Mirror — Image Position via Formula",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "The image shows a thin lens of focal length 5 m.\n(i) What is the kind of lens shown in the above figure?\n(ii) If a real inverted image is to be formed by this lens at a distance of 7 m from the optical centre, then show with calculation where should the object be placed?\n(iii) Draw a neatly labelled diagram of the image formation mentioned in (ii).\n\n[OR]\n\nA 10 cm long pencil is placed 5 cm in front of a concave mirror having a radius of curvature of 40 cm.\n(i) Determine the position of the image formed by this mirror.\n(ii) What is the size of the image?\n(iii) Draw a ray diagram to show the formation of the image as mentioned in part (i).",
    "options": [],
    "answer": "Main: (i) Convex lens. (ii) Object at u = −17.5 m (17.5 m on the left). (iii) Diagram with object beyond 2F. OR Alt: (i) Image at v = +6.67 cm behind mirror (virtual). (ii) Image size = (4/3)·10 ≈ 13.33 cm. (iii) Ray diagram with object between pole and focus.",
    "solutionSteps": [
      "Main (i): A real inverted image is produced only by a converging lens — hence the lens is a Convex lens.",
      "Main (ii): Lens formula: 1/f = 1/v − 1/u, with f = +5 m and v = +7 m (real image on opposite side). 1/u = 1/v − 1/f = 1/7 − 1/5 = (5 − 7)/35 = −2/35. So u = −35/2 = −17.5 m. Object is placed 17.5 m on the left of the convex lens.",
      "Main (iii): Ray diagram (two rays from object): one ray parallel to principal axis refracts through F on the other side; second ray through optical centre passes undeviated. Both meet to form a real, inverted, diminished image at v = +7 m. Object placed beyond 2F (since |u| = 17.5 > 2f = 10).",
      "OR (alternative i): Mirror formula 1/f = 1/v + 1/u with f = −20 cm (concave, half of R = 40 cm) and u = −5 cm. 1/v = 1/f − 1/u = −1/20 + 1/5 = (−1 + 4)/20 = 3/20. v = 20/3 ≈ +6.67 cm. Positive v → image is behind the mirror, so virtual and erect.",
      "OR (ii–iii): Magnification m = −v/u = −(20/3)/(−5) = 4/3. h₂ = m·h₁ = (4/3)·10 = 13.33 cm — image is enlarged (and erect). Ray diagram: object between pole P and focus F; two rays — one parallel (reflects through F), one through C (reflects back); diverging reflected rays appear to meet behind the mirror, giving virtual, erect, enlarged image."
    ],
    "finalAnswer": "Main: (i) Convex lens; (ii) u = −17.5 m; (iii) diagram. OR Alt: (i) v = +6.67 cm; (ii) image size ≈ 13.33 cm; (iii) ray diagram.",
    "isCompetencyBased": true
  }
];
