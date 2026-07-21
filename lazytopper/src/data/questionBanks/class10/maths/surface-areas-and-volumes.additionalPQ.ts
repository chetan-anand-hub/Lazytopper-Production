import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-24

export const SURFACE_AREAS_AND_VOLUMES_APQ: CanonicalQuestion[] = [
  // PQ1 Q15 (Section A, MCQ, 1 mark)
  { id: "APQ-M-SAV-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Submerged Sphere — Water Level Rise", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A cuboid of base area P sq units is filled with water upto a height of Q units. A sphere of volume R cu units is dropped into the cuboid such that it is completely submerged. Which of these represents the increase in the height of water?",
    options: ["0 units", "R/P units", "R units", "Q + R/P units"],
    answer: "R/P units",
    solutionSteps: ["Volume of water displaced = volume of sphere = R cu units.", "Increase in water height × base area = R ⟹ height increase = R/P units."],
    finalAnswer: "(b) R/P units",
    ncertRef: "APQ PQ1 Q15", isCompetencyBased: true },

  // PQ2 Q12 (Section A, MCQ, 1 mark)
  { id: "APQ-M-SAV-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Joined Solids", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Two cubes each with 6 cm edge are joined end to end. The surface area of the resulting cuboid is",
    options: ["180 cm^2", "360 cm^2", "300 cm^2", "260 cm^2"],
    answer: "360 cm^2",
    solutionSteps: ["Resulting cuboid dimensions: 12 cm × 6 cm × 6 cm.", "Surface area = 2(lb + bh + lh) = 2(72 + 36 + 72) = 2 × 180 = 360 cm^2."],
    finalAnswer: "(b) 360 cm^2",
    ncertRef: "APQ PQ2 Q12", isCompetencyBased: false },

  // PQ2 Q13 (Section A, MCQ, 1 mark)
  { id: "APQ-M-SAV-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volumes of Sphere and Hemisphere", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A sphere of maximum volume is cut out from a solid hemisphere of radius 7 cm. Then the ratio of the volume of the original hemisphere to that of the cut-out sphere is",
    options: ["2 : 1", "16 : 1", "3 : 1", "4 : 1"],
    answer: "4 : 1",
    solutionSteps: ["Hemisphere radius R = 7. Max inscribed sphere has radius R/2 = 7/2 (largest sphere inside hemisphere has diameter = R).", "V(hemisphere)/V(sphere) = (2/3)πR^3 / [(4/3)π(R/2)^3] = (2/3)R^3 / [(4/3)·R^3/8] = (2/3)/(1/6) = 4."],
    finalAnswer: "(d) 4 : 1",
    ncertRef: "APQ PQ2 Q13", isCompetencyBased: true },

  // PQ1 Q24 (Section B, Short, 2 marks)
  { id: "APQ-M-SAV-004", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Cone — Slant Height Angle", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Shown is a right circular cone of volume 13,600 cm^3. Find the angle which the slant height makes with the base radius. (Note: Take π as 3, √2 as 1.4 and √3 as 1.7.) OR Shown are two right triangles. Find the length of the unknown side marked '?'.",
    answer: "60°. [OR] √2 cm.",
    solutionSteps: ["Volume = (1/3)π r^2 h = (1/3)(3)(20)(20) h = 400h = 13600 ⟹ h = 34 cm.", "tan θ = h/r = 34/20 = 1.7 = √3 ⟹ θ = 60°.", "[OR] sin 45° = 2/hypotenuse ⟹ hyp = 2√2. cos 60° = base/(2√2) ⟹ base = 2√2 · (1/2) = √2 cm."],
    finalAnswer: "60°. [OR] √2 cm.",
    ncertRef: "APQ PQ1 Q24", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants. Cone has base radius 20 cm." },

  // PQ2 Q30 (Section C, Short, 3 marks)
  { id: "APQ-M-SAV-005", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "CSA Ratio — Cylinder and Cone", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A right circular cylinder and a cone have equal bases and equal heights. If their curved surface areas are in the ratio 8 : 5, then find the ratio between the radius of their bases to their heights.",
    answer: "r : h = 3 : 4.",
    solutionSteps: ["CSA(cylinder)/CSA(cone) = 2πrh / πrl = 2h/l = 8/5 ⟹ h/l = 4/5.", "l = √(h^2 + r^2). h/√(h^2 + r^2) = 4/5 ⟹ h^2 / (h^2 + r^2) = 16/25 ⟹ r^2/h^2 = 9/16 ⟹ r/h = 3/4."],
    finalAnswer: "r : h = 3 : 4.",
    ncertRef: "APQ PQ2 Q30", isCompetencyBased: true },

  // PQ1 Q34 (Section D, Long, 5 marks)
  { id: "APQ-M-SAV-006", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Cylinders from Folded Sheets", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Two rectangular sheets of dimensions 45 cm × 155 cm are folded to make hollow right circular cylindrical pipes with exactly 1 cm overlap when sticking the ends. Sheet 1 is folded along its length, Sheet 2 along its width. Both pipes are closed on both ends. (i) Find the difference in curved surface areas of the two cylinders. (ii) Find the ratio of the volumes of the two cylinders formed. (Use π = 22/7.) OR (i) How many cylindrical cans (with the geometry shown) can be packed in a cubical container with no more cans fitting? (ii) If one can capacity = 539 ml, find the internal volume of the cubical container.",
    answer: "(i) 110 cm^2 difference. (ii) Ratio V1:V2 from MS. [OR] (i) 32 cans. (ii) 21952 cm^3.",
    solutionSteps: ["[1 mark] Variant 1 (i): Sheet 1 makes a pipe of height 155 cm; the 1 cm overlap wastes 155 × 1 = 155 cm². Sheet 2 makes a pipe of height 45 cm; overlap wastes 45 × 1 = 45 cm².", "[1 mark] Difference in curved surface area = 155 − 45 = 110 cm².", "[1 mark] (ii) Sheet 1 circumference = 45 − 1 = 44 cm ⟹ r₁ = 7 cm; Sheet 2 circumference = 155 − 1 = 154 cm ⟹ r₂ = 49/2 cm.", "[1 mark] (ii) Ratio of volumes V₁ : V₂ = (r₁²·h₁)/(r₂²·h₂) = (7²·155)/((49/2)²·45) = 124 : 441.", "[1 mark] OR variant: container side = 2p with 4 cans per direction ⟹ 4 × 4 × 2 = 32 cans; with can capacity 539 ml, p = 14 cm, cube side = 28 cm, internal volume = 28³ = 21952 cm³."],
    finalAnswer: "(i) Δ CSA = 110 cm^2; ratio from formula. [OR] 32 cans; 21952 cm^3.",
    ncertRef: "APQ PQ1 Q34", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants." },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q15 (Section A, MCQ, 1 mark)
  { id: "APQ-M-SAV-007", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "TSA — Cylinder + Hemisphere Equals Sphere", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Shown below is a solid made by joining a right circular cylinder and a hemisphere of equal radius (r cm). The total surface area of the solid is equal to the surface area of a sphere with twice the radius of this solid. Which of the following gives the height of the cylinder in the above solid?",
    options: ["6r cm", "6.5r cm", "7r cm", "7.5r cm"],
    answer: "6.5r cm",
    solutionSteps: ["TSA(solid) = 2πrh + 2πr^2 + πr^2 = 2πrh + 3πr^2 (cylinder CSA + base circle + hemisphere CSA; the joined face is internal).", "SA(sphere of radius 2r) = 4π(2r)^2 = 16πr^2.", "Equate: 2πrh + 3πr^2 = 16πr^2 ⟹ 2rh = 13r^2 ⟹ h = 6.5r cm."],
    finalAnswer: "(b) 6.5r cm",
    ncertRef: "APQ PQ_2022 Q15", isCompetencyBased: true },

  // PQ_2022 Q33 first variant (Section D, Long, 5 marks)
  { id: "APQ-M-SAV-008", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volume Estimation — Ice-cream Servings", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A restaurant stores ice-cream in a cuboidal box with a dispenser for filling cones. Dimensions: box 30 × 40 × 115 cm; cone r = 3.5 cm, h = 12 cm; hemispherical scoop on top has same r = 3.5 cm. How many desserts can be served? (Use π = 22/7.)",
    answer: "≈ 565 desserts.",
    solutionSteps: ["Volume of box = 30 × 40 × 115 = 1,38,000 cm^3.", "Volume of cone = (1/3)·π·r^2·h = (1/3)·(22/7)·12.25·12 = 154 cm^3.", "Volume of hemisphere = (2/3)·π·r^3 = (2/3)·(22/7)·42.875 ≈ 89.83 cm^3.", "Per serving = 154 + 89.83 ≈ 243.83 cm^3 ≈ 244 cm^3.", "Servings = 1,38,000 / 244 ≈ 565.57 ⟹ 565 desserts."],
    finalAnswer: "≈ 565 desserts.",
    ncertRef: "APQ PQ_2022 Q33 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: cuboidal box + ice-cream cone with hemispherical scoop." },

  // PQ_2022 Q33 OR variant (Section D, Long, 5 marks)
  { id: "APQ-M-SAV-009", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volume — Tanker, Cuboidal Tank, Spherical Matka", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A right-circular cylindrical water tanker (r = 1 m, h = 70 m) supplies water. Each colony has a cuboidal tank (7 × 2 × 3 m). Villages: 400 people fill spherical matkas (r = 21 cm). (i) How many colonies can one full tanker supply? (ii) If a tanker supplies 3 colonies then 400 matkas at a village, how much water (in m^3) does it supply? (Use π = 22/7.)",
    answer: "(i) 5 colonies. (ii) 142 m^3.",
    solutionSteps: ["[1 mark] Tanker volume = π·r²·h = (22/7)·1²·70 = 220 m³; cuboidal tank volume = 7·2·3 = 42 m³.", "[1 mark] (i) Number of colonies = 220 ÷ 42 = 5.23, so 5 colonies can be supplied completely.", "[1 mark] Matka (sphere) volume = (4/3)·π·r³ = (4/3)·(22/7)·(21)³ = 38,808 cm³ ≈ 0.0388 m³.", "[1 mark] (ii) Water for 3 colonies = 3 × 42 = 126 m³; water for 400 matkas = 400 × 0.0388 ≈ 16 m³.", "[1 mark] (ii) Total water supplied = 126 + 16 = 142 m³ (approx)."],
    finalAnswer: "(i) 5 colonies; (ii) ≈ 142 m^3.",
    ncertRef: "APQ PQ_2022 Q33 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: tanker + cuboidal tank + spherical matka." },
];
