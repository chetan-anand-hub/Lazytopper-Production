import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 13 in 2018-19 edition (= Chapter 12 in CBSE 2026-27 syllabus): Surface Areas and Volumes
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Frustum of Cone excluded per syllabusGuard)
// Note: source PDF is numbered Ch13, but the CBSE 2026-27 syllabus renumbers this content to Ch12; IDs and topicKey reflect the new numbering
// Coverage: Examples 1-11 + Exercises 13.1, 13.2, 13.3 (combinations of solids and conversion). Examples 12-14, Exercise 13.4 (Frustum) and Exercise 13.5 (optional) omitted.

export const SAV_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQ / Assertion-Reasoning (1m) =====
  { id: "SAV-N-NCERT-12-MCQ-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Two cubes each of volume 64 cm³ are joined end to end. The surface area of the resulting cuboid is",
    options: ["128 cm²", "160 cm²", "192 cm²", "256 cm²"],
    answer: "160 cm²",
    solutionSteps: [
      "Side of each cube = ∛64 = 4 cm.",
      "When joined end to end, the resulting cuboid has dimensions l × b × h = 8 × 4 × 4 cm.",
      "Surface area = 2(lb + bh + hl) = 2(8·4 + 4·4 + 4·8) cm² = 2(32 + 16 + 32) cm² = 2 × 80 cm² = 160 cm²."
    ],
    finalAnswer: "160 cm² — option (B).",
    ncertRef: "NCERT Ex 13.1 Q1", isCompetencyBased: false,
    strategyHint: "Two equal cubes joined make a cuboid of side 2a × a × a; compute its surface area, not the sum of cube surfaces." },

  { id: "SAV-N-NCERT-12-MCQ-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "A", marks: 1, format: "MCQ",
    difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A solid is in the shape of a cone standing on a hemisphere with both radii equal to 1 cm and the height of the cone equal to its radius. The volume of the solid (in terms of π) is",
    options: ["(1/3)π cm³", "(2/3)π cm³", "π cm³", "(4/3)π cm³"],
    answer: "π cm³",
    solutionSteps: [
      "Hemisphere: r = 1 cm → V₁ = (2/3)πr³ = (2/3)π cm³.",
      "Cone: r = 1 cm, h = 1 cm → V₂ = (1/3)πr²h = (1/3)π cm³.",
      "Total volume = (2/3)π + (1/3)π = π cm³."
    ],
    finalAnswer: "π cm³ — option (A).",
    ncertRef: "NCERT Ex 13.2 Q1", isCompetencyBased: false,
    strategyHint: "Add hemisphere volume (2/3)πr³ and cone volume (1/3)πr²h; with r = h = 1 they combine to exactly π." },

  { id: "SAV-N-NCERT-12-AR-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "A", marks: 1, format: "Assertion-Reasoning",
    difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Assertion (A): For a playing top shaped like a cone surmounted by a hemisphere of the same radius, the total surface area equals CSA of the cone plus CSA of the hemisphere. Reason (R): When two solids are joined along a common circular face, both flat circular faces are hidden inside the joint and only the curved surfaces remain exposed.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: [
      "From Example 1 (lattu) the textbook explicitly writes: TSA of toy = CSA of hemisphere + CSA of cone.",
      "This is because the cone's flat base and the hemisphere's flat base coincide and are not part of the outer surface.",
      "Hence Assertion is true and the Reason correctly explains it."
    ],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Example 1 (concept §13.2)", isCompetencyBased: false,
    strategyHint: "Whenever two solids meet along a common circle, subtract both circle areas — only the curved surfaces are counted." },

  { id: "SAV-N-NCERT-12-AR-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "A", marks: 1, format: "Assertion-Reasoning",
    difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Assertion (A): When two basic solids are joined together, the volume of the combined solid is simply the sum of the volumes of the constituent solids. Reason (R): While joining solids, no volume is lost at the interface even though some surface area disappears.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: [
      "Textbook §13.3 explicitly says: 'The volume of the solid formed by joining two basic solids will actually be the sum of the volumes of the constituents.'",
      "Surface areas at the interface are hidden, but the interior solid material is fully retained.",
      "Hence A is true and R correctly explains A."
    ],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT §13.3", isCompetencyBased: false,
    strategyHint: "Key distinction: surface areas merge (some are hidden); volumes simply add." },

  // ===== Section B — VSA / Short (2m) =====
  { id: "SAV-N-NCERT-12-VSA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "B", marks: 2, format: "VSA",
    difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A cubical block of side 7 cm is surmounted by a hemisphere. What is the greatest diameter the hemisphere can have? Find the surface area of the solid. (Take π = 22/7.)",
    solutionSteps: [
      "Greatest possible diameter = side of the cube = 7 cm, so radius r = 3.5 cm.",
      "SA of solid = TSA of cube − base area of hemisphere + CSA of hemisphere = 6a² − πr² + 2πr² = 6a² + πr².",
      "= 6(7)² + (22/7)(3.5)² cm² = 294 + (22/7)(12.25) cm² = 294 + 38.5 cm² = 332.5 cm²."
    ],
    finalAnswer: "Greatest diameter = 7 cm; surface area = 332.5 cm².",
    ncertRef: "NCERT Ex 13.1 Q4", isCompetencyBased: false,
    strategyHint: "Greatest hemisphere fitting on a cube face has diameter equal to the cube's edge; subtract the covered circle and add the curved dome." },

  { id: "SAV-N-NCERT-12-SA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "B", marks: 2, format: "Short",
    difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A medicine capsule is in the shape of a cylinder with two hemispheres stuck to each of its ends. The length of the entire capsule is 14 mm and the diameter of the capsule is 5 mm. Find its surface area. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 5/2 = 2.5 mm. Cylindrical length = 14 − 2(2.5) = 9 mm.",
      "SA = CSA of cylinder + CSA of two hemispheres = 2πrh + 4πr² = 2πr(h + 2r).",
      "= 2 × (22/7) × 2.5 × (9 + 5) mm² = 2 × (22/7) × 2.5 × 14 mm² = 220 mm²."
    ],
    finalAnswer: "Surface area of capsule = 220 mm².",
    ncertRef: "NCERT Ex 13.1 Q6", isCompetencyBased: true,
    strategyHint: "Capsule = cylinder + 2 hemispheres (= 1 full sphere of same radius); use 2πrh + 4πr²." },

  // ===== Section C — Short (3m) =====
  { id: "SAV-N-NCERT-12-SA-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Rasheed got a playing top (lattu) which is shaped like a cone surmounted by a hemisphere. The entire top is 5 cm in height and the diameter of the top is 3.5 cm. Find the area he has to colour. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 3.5/2 = 1.75 cm. Height of cone h = 5 − 1.75 = 3.25 cm.",
      "Slant height l = √(r² + h²) = √(1.75² + 3.25²) = √(3.0625 + 10.5625) = √13.625 ≈ 3.7 cm.",
      "Area to colour = CSA of hemisphere + CSA of cone = 2πr² + πrl = πr(2r + l).",
      "= (22/7) × 1.75 × (3.5 + 3.7) cm² = (22/7) × 1.75 × 7.2 cm² ≈ 39.6 cm²."
    ],
    finalAnswer: "Area to be coloured ≈ 39.6 cm².",
    ncertRef: "NCERT Example 1", isCompetencyBased: true,
    strategyHint: "Height of cone = total height − radius (because hemisphere's flat side sits on cone base); use πr(2r + l)." },

  { id: "SAV-N-NCERT-12-SA-005", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A vessel is in the form of a hollow hemisphere mounted by a hollow cylinder. The diameter of the hemisphere is 14 cm and the total height of the vessel is 13 cm. Find the inner surface area of the vessel. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 14/2 = 7 cm. Height of cylindrical part h = 13 − 7 = 6 cm.",
      "Inner SA = CSA of hemisphere + CSA of cylinder = 2πr² + 2πrh = 2πr(r + h).",
      "= 2 × (22/7) × 7 × (7 + 6) cm² = 2 × 22 × 13 cm² = 572 cm²."
    ],
    finalAnswer: "Inner surface area = 572 cm².",
    ncertRef: "NCERT Ex 13.1 Q2", isCompetencyBased: true,
    strategyHint: "Cylinder height = total height − hemisphere radius; only inner curved surfaces are counted (vessel is hollow, top open)." },

  { id: "SAV-N-NCERT-12-SA-006", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A toy is in the form of a cone of radius 3.5 cm mounted on a hemisphere of the same radius. The total height of the toy is 15.5 cm. Find the total surface area of the toy. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 3.5 cm. Height of cone h = 15.5 − 3.5 = 12 cm.",
      "Slant height l = √(r² + h²) = √(12.25 + 144) = √156.25 = 12.5 cm.",
      "TSA = CSA of cone + CSA of hemisphere = πrl + 2πr² = πr(l + 2r).",
      "= (22/7) × 3.5 × (12.5 + 7) cm² = (22/7) × 3.5 × 19.5 cm² = 11 × 19.5 cm² = 214.5 cm²."
    ],
    finalAnswer: "Total surface area of toy = 214.5 cm².",
    ncertRef: "NCERT Ex 13.1 Q3", isCompetencyBased: true,
    strategyHint: "Height of cone = total height − radius; use πr(l + 2r) with l = √(r² + h²)." },

  { id: "SAV-N-NCERT-12-SA-007", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "C", marks: 3, format: "Short",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Rachel, an engineering student, was asked to make a model shaped like a cylinder with two cones attached at its two ends by using a thin aluminium sheet. The diameter of the model is 3 cm and its length is 12 cm. If each cone has a height of 2 cm, find the volume of air contained in the model. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 3/2 = 1.5 cm. Length of cylinder h = 12 − 2(2) = 8 cm. Cone height h_c = 2 cm.",
      "Volume = πr²h + 2 × (1/3)πr²h_c = πr²[h + (2/3)h_c].",
      "= (22/7)(1.5)²[8 + 4/3] cm³ = (22/7)(2.25)(28/3) cm³.",
      "= (22 × 2.25 × 28)/(7 × 3) cm³ = 1386/21 cm³ = 66 cm³."
    ],
    finalAnswer: "Volume of air in model = 66 cm³.",
    ncertRef: "NCERT Ex 13.2 Q2", isCompetencyBased: true,
    strategyHint: "Cylinder length excludes the two cone heights; add cylinder volume to both cone volumes." },

  // ===== Section D — Long (5m) =====
  { id: "SAV-N-NCERT-12-LA-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A wooden toy rocket is in the shape of a cone mounted on a cylinder. The height of the entire rocket is 26 cm, while the height of the conical part is 6 cm. The base of the conical portion has a diameter of 5 cm, while the base diameter of the cylindrical portion is 3 cm. If the conical portion is to be painted orange and the cylindrical portion yellow, find the area painted with each colour. (Use π = 3.14.)",
    solutionSteps: [
      "Cone: radius r = 2.5 cm, height h = 6 cm; slant height l = √(2.5² + 6²) = √(6.25 + 36) = √42.25 = 6.5 cm.",
      "Cylinder: radius r' = 1.5 cm, height h' = 26 − 6 = 20 cm.",
      "Cone base is wider than cylinder top, so a ring of the cone's base is also exposed.",
      "Orange area = CSA of cone + (base of cone − base of cylinder) = πrl + πr² − π(r')² = π[(2.5)(6.5) + 2.5² − 1.5²] = π[16.25 + 6.25 − 2.25] = π × 20.25 = 3.14 × 20.25 = 63.585 cm².",
      "Yellow area = CSA of cylinder + base of cylinder = 2πr'h' + π(r')² = πr'(2h' + r') = 3.14 × 1.5 × (40 + 1.5) = 4.71 × 41.5 = 195.465 cm²."
    ],
    finalAnswer: "Orange (cone) area = 63.585 cm²; yellow (cylinder) area = 195.465 cm².",
    ncertRef: "NCERT Example 3", isCompetencyBased: true,
    strategyHint: "Since cone's base is wider than cylinder's top, add the ring (πr² − πr'²) to the cone's CSA; cylinder gets its CSA plus its bottom circle." },

  { id: "SAV-N-NCERT-12-LA-004", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "D", marks: 5, format: "Long",
    difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A gulab jamun contains sugar syrup up to about 30% of its volume. Find approximately how much syrup would be found in 45 gulab jamuns, each shaped like a cylinder with two hemispherical ends, with length 5 cm and diameter 2.8 cm. (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 2.8/2 = 1.4 cm. Cylinder length = 5 − 2(1.4) = 2.2 cm.",
      "Volume of one gulab jamun = πr²h + (4/3)πr³ = πr²[h + (4/3)r] = (22/7)(1.4)²[2.2 + (4/3)(1.4)] cm³.",
      "= (22/7)(1.96)[2.2 + 1.8667] cm³ ≈ (22/7)(1.96)(4.0667) cm³ ≈ 25.0507 cm³.",
      "Volume of 45 gulab jamuns ≈ 45 × 25.0507 cm³ ≈ 1127.28 cm³.",
      "Syrup (30%) = 0.30 × 1127.28 ≈ 338 cm³."
    ],
    finalAnswer: "Approximate syrup in 45 gulab jamuns ≈ 338 cm³.",
    ncertRef: "NCERT Ex 13.2 Q3", isCompetencyBased: true,
    strategyHint: "Each jamun = cylinder + 2 hemispheres (= 1 sphere); use πr²h + (4/3)πr³, then take 30%." },

  // ===== Section E — Case-Based (4m) =====
  { id: "SAV-N-NCERT-12-CB-001", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Surface Area of Combined Solids", section: "E", marks: 4, format: "Case-Based",
    difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A tent is in the shape of a cylinder surmounted by a conical top. The height and diameter of the cylindrical part are 2.1 m and 4 m respectively, and the slant height of the conical top is 2.8 m. (i) Find the area of the canvas required for making the tent (the base of the tent is NOT covered with canvas). (ii) Find the cost of the canvas at ₹500 per m². (Take π = 22/7.)",
    solutionSteps: [
      "Radius r = 4/2 = 2 m. Cylinder height h = 2.1 m. Cone slant l = 2.8 m.",
      "Canvas area = CSA of cylinder + CSA of cone = 2πrh + πrl = πr(2h + l).",
      "= (22/7)(2)(2 × 2.1 + 2.8) m² = (22/7)(2)(4.2 + 2.8) m² = (22/7)(2)(7) m² = 44 m².",
      "Cost = 44 × ₹500 = ₹22,000."
    ],
    finalAnswer: "Canvas area = 44 m²; total cost = ₹22,000.",
    ncertRef: "NCERT Ex 13.1 Q7", isCompetencyBased: true,
    strategyHint: "Base is open, so only CSA of cylinder + CSA of cone count; then multiply by the rate." },

  { id: "SAV-N-NCERT-12-CB-002", subject: "Maths", topicKey: "surface-areas-and-volumes",
    subtopic: "Volume of Combined Solids", section: "E", marks: 4, format: "Case-Based",
    difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A vessel is in the form of an inverted cone of height 8 cm and top radius 5 cm, open at the top and filled with water to the brim. Lead shots — each a sphere of radius 0.5 cm — are dropped in, and one-fourth of the water flows out. Find the number of lead shots dropped into the vessel. (Take π = 22/7.)",
    solutionSteps: [
      "Volume of the cone (water initially) = (1/3)πR²H = (1/3)π(5)²(8) cm³ = 200π/3 cm³.",
      "Water displaced = (1/4) × cone volume = (1/4)(200π/3) = 50π/3 cm³.",
      "Volume of one lead shot = (4/3)π(0.5)³ = (4/3)π(0.125) = π/6 cm³.",
      "Number of shots = (50π/3) ÷ (π/6) = (50π/3)(6/π) = 100."
    ],
    finalAnswer: "Number of lead shots = 100.",
    ncertRef: "NCERT Ex 13.2 Q5", isCompetencyBased: true,
    strategyHint: "Displaced water = (1/4) of cone volume = N × (volume of one sphere); solve for N." },

];
