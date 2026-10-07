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
      "[1 mark] Convex mirrors always form virtual, erect and diminished images behind the mirror, regardless of the object's distance. The image position (between pole and focus) shifts as the object moves. Answer: (D)."
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
      "[1 mark] (a) When light travels from an optically rarer medium to an optically denser medium it bends towards the normal. Here n_B (1.8) > n_A (1.6), so the ray going from A to B bends towards the normal.",
      "[1 mark] (b) The speed of light v = c/n, so v is larger in a medium with smaller n. n_C (1.5) < n_B (1.8), so the speed of light increases when the ray travels from B to C."
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
      "[1 mark] (i) Refractive index of a medium with respect to air = (speed of light in air) / (speed of light in the medium). Since the speed of light in any material medium is always less than the speed of light in air, this ratio is always greater than 1.",
      "[1 mark] (ii) At the curved (semi-circular) face, the incident light ray is directed along a radius of the semicircle — it strikes the surface along the normal at that point. For normal incidence, the angle of incidence is 0°, so the refracted ray continues without deviation.",
      "[1 mark] (iii) When the ray reaches the flat top face and exits from the denser plastic back into rarer air, it bends AWAY from the normal (Snell's law: n_plastic·sin θ₁ = n_air·sin θ₂; since n_plastic > n_air, θ₂ > θ₁). The ray diagram shows the incident ray entering along the radius, going straight through, then bending away from the normal at the flat exit face."
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
    "questionText": "A thin lens has a focal length of magnitude 5 m. A real, inverted image is to be formed by this lens at a distance of 7 m from its optical centre.\n(i) What kind of lens is it? Give a reason.\n(ii) Show with calculation where the object should be placed.\n(iii) Draw a neatly labelled ray diagram of the image formation mentioned in (ii).\n\n[OR]\n\nA 10 cm long pencil is placed 5 cm in front of a concave mirror having a radius of curvature of 40 cm.\n(i) Determine the position of the image formed by this mirror.\n(ii) What is the size of the image?\n(iii) Draw a ray diagram to show the formation of the image as mentioned in part (i).",
    "options": [],
    "answer": "Main: (i) Convex lens. (ii) u = −17.5 m (object 17.5 m in front of the lens, beyond 2F). (iii) Ray diagram with object beyond 2F and real, inverted, diminished image. OR: (i) v = +6.67 cm (virtual image behind the mirror). (ii) Image size ≈ 13.3 cm (erect, enlarged). (iii) Ray diagram with object between P and F.",
    "solutionSteps": [
      "[1 mark] (i) Convex lens — only a converging lens forms a real, inverted image. [OR (i) working: f = −R/2 = −20 cm, u = −5 cm; mirror formula 1/v + 1/u = 1/f gives 1/v = −1/20 + 1/5 = 3/20.]",
      "[1 mark] (ii) Lens formula 1/f = 1/v − 1/u with f = +5 m, v = +7 m: 1/u = 1/7 − 1/5 = −2/35. [OR (i) result: v = +20/3 ≈ +6.67 cm, i.e. 6.67 cm behind the mirror — virtual and erect.]",
      "[1 mark] (ii) u = −35/2 = −17.5 m: the object is placed 17.5 m in front of the lens (beyond 2F, since 2f = 10 m). [OR (ii) m = −v/u = −(20/3)/(−5) = +4/3; image size h′ = (4/3) × 10 ≈ 13.3 cm (erect, enlarged).]",
      "[1 mark] (iii) Diagram: object beyond 2F₁; a ray parallel to the principal axis refracts through F₂ and a ray through the optical centre passes undeviated; they meet between F₂ and 2F₂ on the other side. [OR (iii) Diagram: object between P and F; a ray parallel to the axis reflects through F and a ray directed towards C reflects back along itself.]",
      "[1 mark] (iii) Correct arrows and labels (O, F, 2F, principal axis); image shown real, inverted, diminished. [OR (iii) reflected rays diverge; produced backwards (dotted) they meet behind the mirror — virtual, erect, enlarged image labelled.]"
    ],
    "finalAnswer": "Main: (i) Convex lens; (ii) u = −17.5 m; (iii) diagram. OR Alt: (i) v = +6.67 cm; (ii) image size ≈ 13.33 cm; (iii) ray diagram.",
    "isCompetencyBased": true,
    sourceOverride: "others",
  }
];
