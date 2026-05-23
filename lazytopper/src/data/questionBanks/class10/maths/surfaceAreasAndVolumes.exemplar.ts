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

  { id: "SAV-N-EXMPLR-12-MCQ-006", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A hollow cube of internal edge 22 cm is filled with spherical marbles of diameter 0.5 cm and it is assumed that 1/8 space of the cube remains unfilled. Then the number of marbles that the cube can accommodate is",
    options: ["142296", "142396", "142496", "142596"],
    answer: "142296",
    solutionSteps: [
      "Volume of cube = 22³ = 10 648 cm³.",
      "Space filled by marbles = (1 − 1/8) × 10 648 = (7/8) × 10 648 = 9 317 cm³.",
      "Volume of one marble = (4/3)π(0.25)³ = (4/3)(22/7)(0.015625) = 88/(3 × 7 × 64) = 88/1344 ≈ 0.06548 cm³.",
      "Number of marbles = 9 317 / 0.06548 ≈ 1,42,296."
    ],
    finalAnswer: "1,42,296 marbles — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q8", isCompetencyBased: true,
    strategyHint: "Subtract the 1/8 unfilled space, then divide by one-marble volume." },

  { id: "SAV-N-EXMPLR-12-MCQ-007", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A metallic spherical shell of internal and external diameters 4 cm and 8 cm respectively is melted and recast into a cone of base diameter 8 cm. The height of the cone is",
    options: ["12 cm", "14 cm", "15 cm", "18 cm"],
    answer: "14 cm",
    solutionSteps: [
      "Volume of shell = (4/3)π(R³ − r³) = (4/3)π(4³ − 2³) = (4/3)π × 56 = (224/3)π cm³.",
      "Volume of cone = (1/3)πR²h = (1/3)π(4)²h = (16/3)πh cm³.",
      "Conservation of volume: (16/3)πh = (224/3)π → h = 224/16 = 14 cm."
    ],
    finalAnswer: "14 cm — option (B).",
    ncertRef: "Exemplar Ex 12.1 Q9", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-MCQ-008", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A solid piece of iron in the form of a cuboid of dimensions 49 cm × 33 cm × 24 cm is moulded to form a solid sphere. The radius of the sphere is",
    options: ["21 cm", "23 cm", "25 cm", "19 cm"],
    answer: "21 cm",
    solutionSteps: [
      "Volume of cuboid = 49 × 33 × 24 = 38 808 cm³.",
      "(4/3)πr³ = 38 808 → r³ = 38 808 × 3 / (4 × 22/7) = 38 808 × 21 / 88 = 9 261.",
      "r = ∛9 261 = 21 cm."
    ],
    finalAnswer: "21 cm — option (A).",
    ncertRef: "Exemplar Ex 12.1 Q10", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-MCQ-009", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A mason constructs a wall of dimensions 270 cm × 300 cm × 350 cm with bricks each of size 22.5 cm × 11.25 cm × 8.75 cm, assuming that 1/8 of the volume is occupied by mortar. The number of bricks used is",
    options: ["11100", "11200", "11000", "11300"],
    answer: "11200",
    solutionSteps: [
      "Volume of wall = 270 × 300 × 350 = 2,83,50,000 cm³.",
      "Brick portion (excluding mortar) = (7/8) × 2,83,50,000 = 2,48,06,250 cm³.",
      "Volume of one brick = 22.5 × 11.25 × 8.75 = 2 214.84375 cm³.",
      "Number of bricks = 2,48,06,250 / 2 214.84375 = 11 200."
    ],
    finalAnswer: "11 200 bricks — option (B).",
    ncertRef: "Exemplar Ex 12.1 Q11", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-MCQ-010", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Twelve solid spheres of the same size are made by melting a solid metallic cylinder of base diameter 2 cm and height 16 cm. The diameter of each sphere is",
    options: ["4 cm", "3 cm", "2 cm", "6 cm"],
    answer: "2 cm",
    solutionSteps: [
      "Volume of cylinder = πR²h = π(1)²(16) = 16π cm³.",
      "Volume of 12 spheres = 12 × (4/3)πr³ = 16πr³.",
      "Equate: 16πr³ = 16π → r³ = 1 → r = 1 cm → diameter = 2 cm."
    ],
    finalAnswer: "2 cm — option (C).",
    ncertRef: "Exemplar Ex 12.1 Q12", isCompetencyBased: true },

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

  { id: "SAV-N-EXMPLR-12-MCQ-014", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "During conversion of a solid from one shape to another, the volume of the new shape will",
    options: ["increase", "decrease", "remain unaltered", "be doubled"],
    answer: "remain unaltered",
    solutionSteps: [
      "Conversion (melting + recasting) only changes the shape; no material is added or removed.",
      "Hence the volume is conserved (remains unaltered)."
    ],
    finalAnswer: "Remain unaltered — option (C).",
    ncertRef: "Exemplar Ex 12.1 Q17", isCompetencyBased: false,
    strategyHint: "Mass and volume of the metal are conserved on melting/recasting." },

  { id: "SAV-N-EXMPLR-12-MCQ-015", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Volumes of two spheres are in the ratio 64 : 27. The ratio of their surface areas is",
    options: ["3 : 4", "4 : 3", "9 : 16", "16 : 9"],
    answer: "16 : 9",
    solutionSteps: [
      "V₁/V₂ = (r₁/r₂)³ = 64/27 → r₁/r₂ = 4/3.",
      "Surface area ratio = (r₁/r₂)² = (4/3)² = 16/9."
    ],
    finalAnswer: "16 : 9 — option (D).",
    ncertRef: "Exemplar Ex 12.1 Q20", isCompetencyBased: true,
    strategyHint: "Cube-root the volume ratio to get the radius ratio; then square for area." },

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

  { id: "SAV-N-EXMPLR-12-VSA-003", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "B", marks: 2, format: "VSA",
    difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "State whether true or false and justify: 'A solid ball is exactly fitted inside the cubical box of side a. The volume of the ball is (4/3)a³.'",
    solutionSteps: [
      "Ball fits exactly in cube → diameter of ball = a → radius r = a/2.",
      "Volume of ball = (4/3)πr³ = (4/3)π(a/2)³ = (4/3)π × a³/8 = πa³/6.",
      "This is NOT (4/3)a³ — it is πa³/6.",
      "Hence FALSE."
    ],
    finalAnswer: "False — volume is πa³/6, not (4/3)a³.",
    ncertRef: "Exemplar Ex 12.2 Q4", isCompetencyBased: true },

  // ===== Short Answer (Exercise 12.3, in-syllabus only) =====
  { id: "SAV-N-EXMPLR-12-SA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Three metallic solid cubes whose edges are 3 cm, 4 cm and 5 cm are melted and formed into a single cube. Find the edge of the cube so formed.",
    solutionSteps: [
      "Volume conserved: a³ = 3³ + 4³ + 5³ = 27 + 64 + 125 = 216 cm³.",
      "a = ∛216 = 6 cm."
    ],
    finalAnswer: "Edge of new cube = 6 cm.",
    ncertRef: "Exemplar Ex 12.3 Q1", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How many shots each having diameter 3 cm can be made from a cuboidal lead solid of dimensions 9 cm × 11 cm × 12 cm?",
    solutionSteps: [
      "Volume of cuboid = 9 × 11 × 12 = 1188 cm³.",
      "Volume of one shot (sphere, r = 1.5 cm) = (4/3)π(1.5)³ = (4/3)(22/7)(3.375) = 99/7 cm³.",
      "Number of shots = 1188 ÷ (99/7) = 1188 × 7 / 99 = 84."
    ],
    finalAnswer: "84 shots.",
    ncertRef: "Exemplar Ex 12.3 Q2", isCompetencyBased: true },

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

  { id: "SAV-N-EXMPLR-12-SA-007", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Marbles of diameter 1.4 cm are dropped into a cylindrical beaker of diameter 7 cm containing some water. Find the number of marbles that should be dropped into the beaker so that the water level rises by 5.6 cm. (Use π = 22/7)",
    solutionSteps: [
      "Rise in water = volume of marbles dropped.",
      "Volume of water raised = πR²h = (22/7)(3.5)²(5.6) = (22/7)(12.25)(5.6) = 215.6 cm³.",
      "Volume of one marble = (4/3)π(0.7)³ = (4/3)(22/7)(0.343) = (4 × 22 × 0.343)/(3 × 7) = 30.184/21 ≈ 1.4373 cm³.",
      "Number of marbles = 215.6 / 1.4373 = 150."
    ],
    finalAnswer: "150 marbles.",
    ncertRef: "Exemplar Ex 12.3 Q10", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-008", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How many spherical lead shots each of diameter 4.2 cm can be obtained from a solid rectangular lead piece with dimensions 66 cm, 42 cm and 21 cm? (Use π = 22/7)",
    solutionSteps: [
      "V(cuboid) = 66 × 42 × 21 = 58 212 cm³.",
      "V(one shot) = (4/3)π(2.1)³ = (4/3)(22/7)(9.261) = (4 × 22 × 9.261)/(3 × 7) = 814.968/21 ≈ 38.808 cm³.",
      "Number of shots = 58 212 / 38.808 = 1 500."
    ],
    finalAnswer: "1 500 shots.",
    ncertRef: "Exemplar Ex 12.3 Q11", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-009", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "How many spherical lead shots of diameter 4 cm can be made out of a solid cube of lead whose edge measures 44 cm? (Use π = 22/7)",
    solutionSteps: [
      "V(cube) = 44³ = 85 184 cm³.",
      "V(one shot) = (4/3)π(2)³ = (4/3)(22/7)(8) = 704/21 cm³.",
      "Number of shots = 85 184 / (704/21) = 85 184 × 21 / 704 = 2 541."
    ],
    finalAnswer: "2 541 shots.",
    ncertRef: "Exemplar Ex 12.3 Q12", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-010", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A wall 24 m long, 0.4 m thick and 6 m high is constructed with bricks each of dimensions 25 cm × 16 cm × 10 cm. If the mortar occupies (1/10)th of the volume of the wall, find the number of bricks used in constructing the wall.",
    solutionSteps: [
      "V(wall) = 24 × 0.4 × 6 = 57.6 m³ = 57 600 000 cm³.",
      "Brick portion = (9/10) × 57 600 000 = 51 840 000 cm³.",
      "V(one brick) = 25 × 16 × 10 = 4 000 cm³.",
      "Number of bricks = 51 840 000 / 4 000 = 12 960."
    ],
    finalAnswer: "12 960 bricks.",
    ncertRef: "Exemplar Ex 12.3 Q13", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-SA-011", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the number of metallic circular discs of base diameter 1.5 cm and height 0.2 cm that need to be melted to form a right circular cylinder of height 10 cm and diameter 4.5 cm.",
    solutionSteps: [
      "V(big cylinder) = π(2.25)²(10) = 50.625π cm³.",
      "V(one disc) = π(0.75)²(0.2) = π × 0.5625 × 0.2 = 0.1125π cm³.",
      "Number of discs = 50.625π / 0.1125π = 50.625 / 0.1125 = 450."
    ],
    finalAnswer: "450 discs.",
    ncertRef: "Exemplar Ex 12.3 Q14", isCompetencyBased: true },

  // ===== Long Answer (Exercise 12.4, in-syllabus only — frustum items skipped) =====
  { id: "SAV-N-EXMPLR-12-LA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A solid metallic hemisphere of radius 8 cm is melted and recast into a right circular cone of base radius 6 cm. Determine the height of the cone.",
    solutionSteps: [
      "V(hemisphere) = (2/3)πr³ = (2/3)π(8)³ = (2/3)π(512) = (1024/3)π cm³.",
      "V(cone) = (1/3)πR²h = (1/3)π(6)²h = 12πh cm³.",
      "Conservation: 12πh = (1024/3)π → h = 1024 / 36 = 256/9.",
      "h = 256/9 cm ≈ 28.44 cm."
    ],
    finalAnswer: "h = 256/9 cm ≈ 28.44 cm.",
    ncertRef: "Exemplar Ex 12.4 Q1", isCompetencyBased: true,
    strategyHint: "Set hemisphere volume = cone volume." },

  { id: "SAV-N-EXMPLR-12-LA-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A rectangular water tank of base 11 m × 6 m contains water up to a height of 5 m. If the water in the tank is transferred to a cylindrical tank of radius 3.5 m, find the height of the water level in the tank. (Use π = 22/7)",
    solutionSteps: [
      "V(water) = 11 × 6 × 5 = 330 m³.",
      "V(cylinder) = πR²H = (22/7)(3.5)²(H) = (22/7)(12.25)H = 38.5 H.",
      "Equate: 38.5 H = 330 → H = 330 / 38.5 = 60/7 m ≈ 8.57 m."
    ],
    finalAnswer: "Water level rises to H = 60/7 m ≈ 8.57 m.",
    ncertRef: "Exemplar Ex 12.4 Q2", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-LA-003", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Water flows at the rate of 10 m/minute through a cylindrical pipe 5 mm in diameter. How long would it take to fill a conical vessel whose diameter at the base is 40 cm and depth 24 cm? (Use π = 22/7)",
    solutionSteps: [
      "V(conical vessel) = (1/3)πR²h = (1/3)(22/7)(20)²(24) = (1/3)(22/7)(400)(24) = (22 × 400 × 24)/(3 × 7) = 2,11,200/21 cm³.",
      "Rate of flow: pipe radius = 2.5 mm = 0.25 cm; speed = 10 m/min = 1000 cm/min.",
      "Volume per minute = π(0.25)²(1000) = (22/7)(0.0625)(1000) = (22 × 62.5)/7 = 1375/7 cm³/min.",
      "Time = V(vessel) / (volume per minute) = (2,11,200/21) ÷ (1375/7) = (2,11,200/21) × (7/1375) = 2,11,200 / 4125 = 51.2 min.",
      "= 51 min 12 s."
    ],
    finalAnswer: "51 min 12 s (= 51.2 minutes).",
    ncertRef: "Exemplar Ex 12.4 Q5", isCompetencyBased: true,
    strategyHint: "Time = total volume ÷ volumetric flow rate." },

  { id: "SAV-N-EXMPLR-12-LA-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A heap of rice is in the form of a cone of diameter 9 m and height 3.5 m. Find the volume of the rice. How much canvas cloth is required to just cover the heap? (Use π = 22/7)",
    solutionSteps: [
      "Radius r = 4.5 m, height h = 3.5 m.",
      "V = (1/3)πr²h = (1/3)(22/7)(4.5)²(3.5) = (1/3)(22/7)(20.25)(3.5) = (22 × 20.25 × 3.5)/(21) = 1559.25/21 ≈ 74.25 m³.",
      "Slant height l = √(r² + h²) = √(20.25 + 12.25) = √32.5 ≈ 5.701 m.",
      "Canvas needed = CSA = πrl = (22/7)(4.5)(5.701) ≈ 80.62 m² (canvas just covers the heap, no base)."
    ],
    finalAnswer: "Volume ≈ 74.25 m³; canvas required ≈ 80.62 m².",
    ncertRef: "Exemplar Ex 12.4 Q6", isCompetencyBased: true,
    strategyHint: "Canvas = curved surface only (cone is sitting on the ground)." },

  { id: "SAV-N-EXMPLR-12-LA-005", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Water is flowing at the rate of 15 km/h through a pipe of diameter 14 cm into a cuboidal pond which is 50 m long and 44 m wide. In what time will the level of water in the pond rise by 21 cm? (Use π = 22/7)",
    solutionSteps: [
      "Required volume to rise pond level by 21 cm = 50 × 44 × 0.21 = 462 m³.",
      "Pipe radius = 7 cm = 0.07 m; speed = 15 km/h = 15 000 m/h.",
      "Volume of water per hour = π(0.07)²(15 000) = (22/7)(0.0049)(15 000) = (22 × 0.0049 × 15 000)/7.",
      "= (22 × 73.5)/7 = 1617/7 = 231 m³/h.",
      "Time = 462 / 231 = 2 hours."
    ],
    finalAnswer: "Time = 2 hours.",
    ncertRef: "Exemplar Ex 12.4 Q8", isCompetencyBased: true,
    strategyHint: "Volume needed ÷ volume per hour = hours." },

  { id: "SAV-N-EXMPLR-12-LA-006", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "16 glass spheres each of radius 2 cm are packed into a cuboidal box of internal dimensions 16 cm × 8 cm × 8 cm and then the box is filled with water. Find the volume of water filled in the box. (Use π = 22/7)",
    solutionSteps: [
      "V(box) = 16 × 8 × 8 = 1 024 cm³.",
      "V(one sphere) = (4/3)π(2)³ = (4/3)(22/7)(8) = 704/21 cm³.",
      "V(16 spheres) = 16 × (704/21) = 11 264/21 ≈ 536.38 cm³.",
      "V(water) = V(box) − V(spheres) = 1 024 − 536.38 ≈ 487.62 cm³."
    ],
    finalAnswer: "≈ 487.62 cm³ of water.",
    ncertRef: "Exemplar Ex 12.4 Q11", isCompetencyBased: true },

  { id: "SAV-N-EXMPLR-12-LA-007", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A cylindrical bucket of height 32 cm and base radius 18 cm is filled with sand. This bucket is emptied on the ground and a conical heap of sand is formed. If the height of the conical heap is 24 cm, find the radius and slant height of the heap. (Use π = 22/7)",
    solutionSteps: [
      "V(sand) = π(18)²(32) = 324 × 32 π = 10 368π cm³.",
      "V(cone) = (1/3)πr²(24) = 8πr².",
      "Equate: 8πr² = 10 368π → r² = 1 296 → r = 36 cm.",
      "Slant height l = √(r² + h²) = √(36² + 24²) = √(1 296 + 576) = √1 872 = 12√13 cm ≈ 43.27 cm."
    ],
    finalAnswer: "Radius = 36 cm; slant height = 12√13 cm ≈ 43.27 cm.",
    ncertRef: "Exemplar Ex 12.4 Q13", isCompetencyBased: true },

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

  { id: "SAV-N-EXMPLR-12-LA-009", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A hemispherical bowl of internal radius 9 cm is full of liquid. The liquid is to be filled into cylindrical-shaped bottles each of radius 1.5 cm and height 4 cm. How many bottles are needed to empty the bowl?",
    solutionSteps: [
      "V(bowl) = (2/3)πr³ = (2/3)π(9)³ = (2/3)π(729) = 486π cm³.",
      "V(one bottle) = πR²h = π(1.5)²(4) = π(2.25)(4) = 9π cm³.",
      "Number of bottles = 486π / 9π = 54."
    ],
    finalAnswer: "54 bottles.",
    ncertRef: "Exemplar Ex 12.4 Q16", isCompetencyBased: true },

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

  { id: "SAV-N-EXMPLR-12-CB-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "E", marks: 4, format: "Case-Based",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A children's pool 80 m long and 50 m broad is filled with water. 500 children jump into the pool together. The average displacement of water by one child is 0.04 m³.\n(i) Find the total volume of water displaced by all 500 children.\n(ii) Determine the rise in the water level (in cm) of the pool.",
    solutionSteps: [
      "(i) Volume displaced = 500 × 0.04 = 20 m³.",
      "(ii) Let rise = h metres. Then 80 × 50 × h = 20 → 4000 h = 20 → h = 0.005 m = 0.5 cm."
    ],
    finalAnswer: "(i) 20 m³ displaced;  (ii) water rises by 0.5 cm.",
    ncertRef: "Exemplar Ex 12.4 Q10", isCompetencyBased: true,
    strategyHint: "Total displacement = base area × rise; solve for rise." },

  // ===== Assertion-Reasoning =====
  { id: "SAV-N-EXMPLR-12-AR-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Conversion of Solids", section: "A", marks: 1, format: "Assertion-Reasoning",
    difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Assertion (A): When a metallic sphere is melted and recast into a cylinder, the volume of the cylinder equals the volume of the original sphere.\nReason (R): Melting and recasting changes the shape of a metallic object but conserves its mass and (assuming the density is unchanged) its volume.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: [
      "Assertion: When a metallic object is recast, volume is conserved → TRUE.",
      "Reason: Melting/recasting preserves mass; with unchanged density, volume is also preserved → TRUE.",
      "Reason directly explains Assertion. Hence option (A)."
    ],
    finalAnswer: "Option (A).",
    ncertRef: "Exemplar concept check (Ex 12.1 Q17)", isCompetencyBased: false },

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
