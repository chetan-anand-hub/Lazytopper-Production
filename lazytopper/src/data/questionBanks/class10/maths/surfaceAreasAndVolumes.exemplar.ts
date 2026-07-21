import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 12: Surface Areas and Volumes
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Frustum of Cone excluded per syllabusGuard)
// Coverage: Exemplar MCQs (Ex 12.1) — frustum items skipped (Q7, Q13, Q18, Q19) —
// + True/False (Ex 12.2, frustum items skipped) + SA (Ex 12.3, frustum items skipped)
// + LA (Ex 12.4, frustum items skipped).

export const SAV_EXEMPLAR: CanonicalQuestion[] = [
  // ===== MCQs (Exercise 12.1, in-syllabus only) =====
  { id: "SAV-N-EXMPLR-12-MCQ-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A cylindrical pencil sharpened at one edge is the combination of",
    options: [
      "a cone and a cylinder",
      "frustum of a cone and a cylinder",
      "a hemisphere and a cylinder",
      "two cylinders"
    ],
    answer: "a cone and a cylinder",
    solutionSteps: [
      "A sharpened pencil has a cylindrical body and a conical (tapering) tip.",
      "Hence it is a combination of a cylinder + a cone."
    ],
    finalAnswer: "A cone and a cylinder — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q1", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-MCQ-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A surahi is the combination of",
    options: [
      "a sphere and a cylinder",
      "a hemisphere and a cylinder",
      "two hemispheres",
      "a cylinder and a cone"
    ],
    answer: "a sphere and a cylinder",
    solutionSteps: [
      "A surahi has a spherical body (the round pot) and a long cylindrical neck.",
      "So: sphere + cylinder."
    ],
    finalAnswer: "A sphere and a cylinder — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q2", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-MCQ-003", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A plumbline (sahul) is the combination of",
    options: [
      "a cone and a cylinder",
      "a hemisphere and a cone",
      "frustum of a cone and a cylinder",
      "sphere and cylinder"
    ],
    answer: "a hemisphere and a cone",
    solutionSteps: [
      "A plumb-bob has a rounded (hemispherical) top tapering to a pointed (conical) bottom.",
      "Hence it is a hemisphere + a cone."
    ],
    finalAnswer: "A hemisphere and a cone — option (B).",
    ncertRef: "Exemplar Ex 12.1 Q3", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-MCQ-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The shape of a gilli, in the gilli-danda game, is a combination of",
    options: [
      "two cylinders",
      "a cone and a cylinder",
      "two cones and a cylinder",
      "two cylinders and a cone"
    ],
    answer: "two cones and a cylinder",
    solutionSteps: [
      "A gilli has a small cylindrical middle and two conical ends (the tapered tips).",
      "Hence: cylinder + 2 cones."
    ],
    finalAnswer: "Two cones and a cylinder — option (C).",
    ncertRef: "Exemplar Ex 12.1 Q5", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-MCQ-005", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A shuttle cock used for playing badminton has the shape of the combination of",
    options: [
      "a cylinder and a sphere",
      "a cylinder and a hemisphere",
      "a sphere and a cone",
      "frustum of a cone and a hemisphere"
    ],
    answer: "frustum of a cone and a hemisphere",
    solutionSteps: [
      "The cork of a shuttle is a hemisphere, and the feathered part has the form of a frustum of a cone.",
      "However, the frustum lies OUTSIDE the CBSE 2026-27 syllabus — so this question is included only as a vocabulary check.",
      "By the standard textbook description: frustum + hemisphere."
    ],
    finalAnswer: "Frustum of a cone and a hemisphere — option (D). (Identification only — frustum is out of syllabus for problem solving.)",
    ncertRef: "Exemplar Ex 12.1 Q6", isCompetencyBased: false,
    strategyHint: "Identification-only; you will not be asked to compute frustum surface area or volume." },

  { id: "SAV-N-EXMPLR-12-MCQ-011", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A medicine-capsule is in the shape of a cylinder of diameter 0.5 cm with two hemispheres stuck to each of its ends. The length of the entire capsule is 2 cm. The capacity of the capsule is",
    options: ["0.36 cm³", "0.35 cm³", "0.34 cm³", "0.33 cm³"],
    answer: "0.36 cm³",
    solutionSteps: [
      "Radius r = 0.25 cm; cylinder length h = 2 − 2(0.25) = 1.5 cm.",
      "V = πr²h + (4/3)πr³ = π(0.0625)(1.5) + (4/3)π(0.015625) = π[0.09375 + 0.02083].",
      "= π × 0.11458 ≈ 3.14 × 0.11458 ≈ 0.36 cm³."
    ],
    finalAnswer: "0.36 cm³ — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q14", isCompetencyBased: true,
    strategyHint: "Capsule = cylinder + sphere (two hemispheres = one sphere)." },

  { id: "SAV-N-EXMPLR-12-MCQ-012", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "If two solid hemispheres of same base radius r are joined together along their bases, then the curved surface area of this new solid is",
    options: ["4πr²", "6πr²", "3πr²", "8πr²"],
    answer: "4πr²",
    solutionSteps: [
      "Two hemispheres joined along their bases form a complete sphere.",
      "Surface area of a sphere = 4πr².",
      "(The two flat circles are joined and are no longer exposed.)"
    ],
    finalAnswer: "4πr² — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q15", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-MCQ-013", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A right circular cylinder of radius r cm and height h cm (h > 2r) just encloses a sphere of diameter",
    options: ["r cm", "2r cm", "h cm", "2h cm"],
    answer: "2r cm",
    solutionSteps: [
      "The sphere must fit inside the cylinder, so its diameter is limited by the cylinder's diameter.",
      "Cylinder diameter = 2r. The condition h > 2r ensures the sphere also fits in height.",
      "Hence the largest enclosed sphere has diameter 2r."
    ],
    finalAnswer: "2r cm — option (B).",
    ncertRef: "Exemplar Ex 12.1 Q16", isCompetencyBased: false },

  // ===== True/False (Ex 12.2, in-syllabus only) =====
  { id: "SAV-N-EXMPLR-12-VSA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "B", marks: 2, format: "VSA",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "State whether true or false and justify: 'Two identical solid hemispheres of equal base radius r cm are stuck together along their bases. The total surface area of the combination is 6πr².'",
    solutionSteps: [
      "Joining two hemispheres along their flat bases gives a sphere of radius r.",
      "Surface area of a sphere = 4πr² (NOT 6πr²).",
      "So the statement is FALSE."
    ],
    finalAnswer: "False — the combined solid is a sphere, whose surface area is 4πr², not 6πr².",
    ncertRef: "Exemplar Ex 12.2 Q1", isCompetencyBased: false },

  { id: "SAV-N-EXMPLR-12-VSA-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "B", marks: 2, format: "VSA",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "State whether true or false and justify: 'A solid cylinder of radius r and height h is placed over another cylinder of the same height and radius. The total surface area of the shape so formed is 4πrh + 4πr².'",
    solutionSteps: [
      "Stacking the two cylinders gives a single cylinder of radius r and total height 2h.",
      "TSA = 2πr(2h) + 2πr² = 4πrh + 2πr² (top + bottom circles only).",
      "The given expression has 4πr² (two extra circles) — that's wrong.",
      "Hence FALSE."
    ],
    finalAnswer: "False — TSA is 4πrh + 2πr², not 4πrh + 4πr².",
    ncertRef: "Exemplar Ex 12.2 Q2", isCompetencyBased: true },

  // ===== Short Answer (Exercise 12.3, in-syllabus only) =====
  { id: "SAV-N-EXMPLR-12-SA-003", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Two identical cubes each of volume 64 cm³ are joined together end to end. What is the surface area of the resulting cuboid?",
    solutionSteps: [
      "Edge of each cube = ∛64 = 4 cm.",
      "Resulting cuboid: l × b × h = 8 × 4 × 4 cm.",
      "TSA = 2(lb + bh + hl) = 2(32 + 16 + 32) = 2 × 80 = 160 cm²."
    ],
    finalAnswer: "160 cm²",
    ncertRef: "Exemplar Ex 12.3 Q5", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "From a solid cube of side 7 cm, a conical cavity of height 7 cm and radius 3 cm is hollowed out. Find the volume of the remaining solid. (Use π = 22/7)",
    solutionSteps: [
      "V(cube) = 7³ = 343 cm³.",
      "V(cone) = (1/3)πr²h = (1/3)(22/7)(9)(7) = (22 × 9)/3 = 66 cm³.",
      "V(remaining) = 343 − 66 = 277 cm³."
    ],
    finalAnswer: "277 cm³",
    ncertRef: "Exemplar Ex 12.3 Q6", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-005", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two cones with the same base radius 8 cm and height 15 cm are joined together along their bases. Find the surface area of the shape so formed. (Use π = 22/7)",
    solutionSteps: [
      "Joining two cones along their bases hides both circular faces; only the two slant surfaces remain.",
      "Slant height l = √(r² + h²) = √(8² + 15²) = √(64 + 225) = √289 = 17 cm.",
      "SA = 2 × CSA(cone) = 2 × πrl = 2 × (22/7)(8)(17) = 2 × 2992/7 = 5984/7 ≈ 854.86 cm²."
    ],
    finalAnswer: "≈ 854.86 cm² (i.e., 5984/7 cm²).",
    ncertRef: "Exemplar Ex 12.3 Q7", isCompetencyBased: true,
    strategyHint: "When two cones are joined base-to-base, both flat circles vanish — only 2 × πrl remains." },

  { id: "SAV-N-EXMPLR-12-SA-006", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An ice cream cone full of ice cream has radius 5 cm and height 10 cm. Calculate the volume of ice cream, given that its (1/6)th part is left unfilled with ice cream. (Use π = 22/7)",
    solutionSteps: [
      "Assume the ice-cream forms a cone + a hemispherical scoop on top, both of radius 5 cm. Cone height = 10 cm.",
      "V(cone) = (1/3)π(5)²(10) = (250/3)π cm³.  V(hemisphere) = (2/3)π(5)³ = (250/3)π cm³.",
      "Total apparent volume = (250/3)π + (250/3)π = (500/3)π cm³.",
      "Ice cream actually present = (5/6) × (500/3)π = (2500/18)π = (1250/9)π = (1250/9)(22/7) ≈ 436.51 cm³."
    ],
    finalAnswer: "≈ 436.51 cm³ of ice cream.",
    ncertRef: "Exemplar Ex 12.3 Q9", isCompetencyBased: true,
    strategyHint: "Cone + scoop, then take 5/6 of that volume." },

  // ===== Long Answer (Exercise 12.4, in-syllabus only — frustum items skipped) =====
  { id: "SAV-N-EXMPLR-12-LA-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A heap of rice is in the form of a cone of diameter 9 m and height 3.5 m. Find the volume of the rice. How much canvas cloth is required to just cover the heap? (Use π = 22/7)",
    solutionSteps: [
      "[1 mark] Given: diameter = 9 m → radius r = 4.5 m, height h = 3.5 m. Formulae: V = (1/3)πr²h and CSA = πrl.",
      "[1 mark] Substituting: V = (1/3)(22/7)(4.5)²(3.5) = (1/3)(22/7)(20.25)(3.5) = 1559.25/21.",
      "[1 mark] Volume of rice V ≈ 74.25 m³.",
      "[1 mark] Slant height l = √(r² + h²) = √(20.25 + 12.25) = √32.5 ≈ 5.701 m.",
      "[1 mark] Canvas needed = CSA = πrl = (22/7)(4.5)(5.701) ≈ 80.62 m² (canvas just covers the curved heap, no base)."
    ],
    finalAnswer: "Volume ≈ 74.25 m³; canvas required ≈ 80.62 m².",
    ncertRef: "Exemplar Ex 12.4 Q6", isCompetencyBased: true,
    strategyHint: "Canvas = curved surface only (cone is sitting on the ground)." },

  { id: "SAV-N-EXMPLR-12-LA-006", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "16 glass spheres each of radius 2 cm are packed into a cuboidal box of internal dimensions 16 cm × 8 cm × 8 cm and then the box is filled with water. Find the volume of water filled in the box. (Use π = 22/7)",
    solutionSteps: [
      "[1 mark] Setup: V(water) = V(cuboidal box) − V(16 spheres); sphere volume formula V = (4/3)πr³.",
      "[1 mark] V(box) = 16 × 8 × 8 = 1 024 cm³.",
      "[1 mark] V(one sphere) = (4/3)(22/7)(2)³ = (4/3)(22/7)(8) = 704/21 cm³.",
      "[1 mark] V(16 spheres) = 16 × (704/21) = 11 264/21 ≈ 536.38 cm³.",
      "[1 mark] V(water) = 1 024 − 536.38 ≈ 487.62 cm³."
    ],
    finalAnswer: "≈ 487.62 cm³ of water.",
    ncertRef: "Exemplar Ex 12.4 Q11", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-LA-008", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A rocket is in the form of a right circular cylinder closed at the lower end and surmounted by a cone with the same radius as that of the cylinder. The diameter and height of the cylinder are 6 cm and 12 cm, respectively. If the slant height of the conical portion is 5 cm, find the total surface area and volume of the rocket. (Use π = 3.14)",
    solutionSteps: [
      "Radius r = 3 cm; cylinder height h₁ = 12 cm; cone slant l = 5 cm → cone height h₂ = √(l² − r²) = √(25 − 9) = 4 cm.",
      "TSA = CSA(cylinder) + area(bottom circle of cylinder) + CSA(cone) = 2πrh₁ + πr² + πrl.",
      "= 2(3.14)(3)(12) + (3.14)(9) + (3.14)(3)(5) = 226.08 + 28.26 + 47.10 = 301.44 cm².",
      "V = V(cylinder) + V(cone) = πr²h₁ + (1/3)πr²h₂ = (3.14)(9)(12) + (1/3)(3.14)(9)(4).",
      "= 339.12 + 37.68 = 376.80 cm³."
    ],
    finalAnswer: "TSA = 301.44 cm²;  V = 376.80 cm³.",
    ncertRef: "Exemplar Ex 12.4 Q14", isCompetencyBased: true,
    strategyHint: "Rocket bottom is closed → include cylinder bottom circle; the top is replaced by the cone." },

  // ===== Case-Based =====
  { id: "SAV-N-EXMPLR-12-CB-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "E", marks: 4, format: "Case-Based",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A wooden pen-stand is in the shape of a cuboid 10 cm × 5 cm × 4 cm. Four conical depressions (radius 0.5 cm, depth 2.1 cm) are made on the top to hold pens, and one cubical depression of edge 3 cm is made to hold pins.\n(i) Compute the total volume removed from the cuboid by all five depressions.\n(ii) Find the volume of wood remaining in the pen-stand. (Use π = 22/7)",
    solutionSteps: [
      "V(cuboid) = 10 × 5 × 4 = 200 cm³.",
      "V(one conical depression) = (1/3)π(0.5)²(2.1) = (1/3)(22/7)(0.25)(2.1) = (22 × 0.25 × 2.1)/(3 × 7) = 11.55/21 = 0.55 cm³.",
      "V(4 conical depressions) = 4 × 0.55 = 2.2 cm³.  V(cubical depression) = 3³ = 27 cm³.",
      "(i) Total removed = 2.2 + 27 = 29.2 cm³.",
      "(ii) V(wood remaining) = 200 − 29.2 = 170.8 cm³."
    ],
    finalAnswer: "(i) 29.2 cm³ removed;  (ii) 170.8 cm³ of wood remaining.",
    ncertRef: "Exemplar Ex 12.4 Q20", isCompetencyBased: true,
    strategyHint: "Subtract depressions from the cuboid volume." },

  // ===== Assertion-Reasoning =====
  { id: "SAV-N-EXMPLR-12-AR-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "A", marks: 1, format: "Assertion-Reasoning",
    difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Assertion (A): Two solid hemispheres of equal base radius r joined together along their bases have a total surface area of 4πr².\nReason (R): The combined solid is a sphere of radius r.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: [
      "Two hemispheres glued along their flat circular bases form a sphere — Reason is TRUE.",
      "Surface area of a sphere of radius r = 4πr² — Assertion is TRUE.",
      "Reason gives the explanation for Assertion. Hence option (A)."
    ],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar Ex 12.1 Q15 + Ex 12.2 Q1 cross-check", isCompetencyBased: false },
];
