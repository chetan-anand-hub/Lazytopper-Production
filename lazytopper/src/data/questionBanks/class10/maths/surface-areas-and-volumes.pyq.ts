import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2022-23 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2022-23) from CBSE
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable QPs (30/2/x, 30/4/x, 30/5/x); 6 scanned QPs (30/1/x, 30/6/x) and 30-B-5 skipped — require OCR

export const SURFACE_AREAS_AND_VOLUMES_PYQ: CanonicalQuestion[] = [
  { id: "PYQ-M-SAV-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the area of the base of a cone is 51 cm2 and its volume is 85 cm3, then the vertical height of the cone is given as :",
    options: ["6 5 cm", "3 5 cm", "2 5 cm", "5 cm"],
    answer: "5 cm",
    solutionSteps: ["Correct option: (d) 5 cm."],
    finalAnswer: "(d) 5 cm",
    ncertRef: "PYQ 30/2/3 Q6", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
  { id: "PYQ-M-SAV-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A student was asked to make a model shaped like a cylinder with two cones attached to its ends by using a thin aluminium sheet. The diameter of the model is 3 cm and its total length is 12 cm. If each cone has a height of 2 cm, find the volume of air contained in the model.",
    answer: "Radius of each cone = Radius of cylinder = 2 3 cm Height of each cone 'H' = 2 cm Height of cylinder 'h' = 12 – 4 = 8 cm Volume of air = Volume of cylinder + Volume of 2 cones = r2h + 2 3 1 r2H = r2     + H 3 2 h = 7 22  2 3  2 3     + 2 3 2 8 = 7 22  4 9  3 28 = 66 cm3 1 1 𝟏 𝟐+1",
    solutionSteps: [
      "[1 mark] Given: diameter = 3 cm ⇒ radius r = 3/2 cm (same for the cylinder and each cone); height of each cone H = 2 cm.",
      "[1 mark] Height of cylinder h = total length − 2 × cone height = 12 − 2(2) = 8 cm.",
      "[1 mark] Volume of air = volume of cylinder + volume of 2 cones = πr²h + 2 × (1/3)πr²H = πr²(h + 2H/3).",
      "[1 mark] Substitute: = (22/7) × (3/2)² × (8 + 2×2/3) = (22/7) × (9/4) × (28/3).",
      "[1 mark] = (22/7) × (9/4) × (28/3) = 66 cm³."
    ],
    finalAnswer: "Volume of air = 66 cm³",
    ncertRef: "PYQ 30/4/1 Q34", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-SAV-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "From a solid cylinder of height 20 cm and diameter 12 cm, a conical cavity of height 8 cm and radius 6 cm is hallowed out. Find the total surface area of the remaining solid.",
    answer: "Height of cylinder h = 20 cm radius of cylinder = 6 cm = Radius of cone Height of cone = 8 cm Slant height l = 2 2 6 8 + = 36 64 + = 10 cm Surface area of remaining solid = CSA of cylinder + CSA of cone + Area of base of cylinder = 2rh + rl + r2 = r[2h + l + r] = 7 22  6[2  20 + 10 + 6] = 7 22  6  56 = 1056 cm2 𝟏 𝟐 1 1+1+1",
    solutionSteps: [
      "[1 mark] Given: cylinder height h = 20 cm, radius r = 12/2 = 6 cm; conical cavity of height 8 cm and radius 6 cm (equal to the cylinder’s radius).",
      "[1 mark] Slant height of cone l = √(r² + 8²) = √(6² + 8²) = √(36 + 64) = 10 cm.",
      "[1 mark] TSA of remaining solid = CSA of cylinder + CSA of cone + area of base of cylinder = 2πrh + πrl + πr² = πr(2h + l + r).",
      "[1 mark] Substitute: = (22/7) × 6 × (2×20 + 10 + 6) = (22/7) × 6 × 56.",
      "[1 mark] = (22/7) × 336 = 1056 cm²."
    ],
    finalAnswer: "Total surface area of remaining solid = 1056 cm²",
    ncertRef: "PYQ 30/4/2 Q32", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "2" },
  { id: "PYQ-M-SAV-004", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A wooden article was made by scooping out a hemisphere from each end of a solid cylinder, as shown in the figure. If the height of the cylinder is 10 cm and its base is of radius 3.5 cm, find the total surface area of the article.",
    answer: "Height of cylinder = 10 cm 16  Radius of cylinder = radius of hemisphere = 3·5 = 2 7 cm Total surface area of the article = CSA of cylinder + CSA of 2 hemispheres = 2rh + 2 × 2r2 = 2r(h + 2r) = 2 × 7 22 × 2 7 (10 + 2 × 2 7 ) = 22 × 17 = 374 cm2 1 1 𝟏 𝟐+1",
    solutionSteps: [
      "[1 mark] Given: cylinder height h = 10 cm, radius r = 3.5 cm = 7/2 cm (equal to the radius of each hemisphere).",
      "[1 mark] Since a hemisphere is scooped from each flat end, TSA of the article = CSA of cylinder + CSA of 2 hemispheres.",
      "[1 mark] TSA = 2πrh + 2 × 2πr² = 2πr(h + 2r).",
      "[1 mark] Substitute: = 2 × (22/7) × (7/2) × (10 + 2×3.5) = 22 × 17.",
      "[1 mark] = 22 × 17 = 374 cm²."
    ],
    finalAnswer: "Total surface area of the article = 374 cm²",
    ncertRef: "PYQ 30/4/3 Q33", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
  { id: "PYQ-M-SAV-005", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "In a coffee shop, coffee is served in two types of cups. One is cylindrical in shape with diameter 7 cm and height 14 cm and the other is hemispherical with diameter 21 cm. Based on the above, answer the following questions : (i) Find the area of the base of the cylindrical cup. 1 (ii) (a) What is the capacity of the hemispherical cup ? 2 OR (ii) (b) Find the capacity of the cylindrical cup. 2 (iii) What is the curved surface area of the cylindrical cup ? 1 àH$aU AÜ``Z",
    answer: "(i) Area of base of the cylindrical cup = 22 7 × 7 2 × 7 2 = 77 2 or 38.5 ∴ Area of base of the cylindrical cup is 77 2 or 38.5 cm2 (ii) (a) Capacity of hemispherical cup = 2 3 × 22 7 × 21 2 × 21 2 × 21 2 = 4851 2 or 2425.5 ∴ Capacity of hemispherical cup is 4851 2 cm3 or 2425.5 cm3 OR (ii) (b) Capacity of cylindrical cup = 22 7 × (7)2 × 14 = 539 ∴ Capacity of cylindrical cup is 539 cm3 (iii) External Curved surface area of cylindrical cup = 2 × 22 7 × 7 2 ×14 = 308 ∴ External Curved surface area of cylindrical cup is 308 cm2",
    solutionSteps: [
      "[1 mark] (i) Base area of cylindrical cup (r = 7/2 cm) = πr² = (22/7) × (7/2) × (7/2) = 77/2 = 38.5 cm².",
      "[1 mark] (ii)(a) Capacity of hemispherical cup (r = 21/2 cm) = (2/3)πr³ = (2/3) × (22/7) × (21/2) × (21/2) × (21/2).",
      "[1 mark] = 4851/2 = 2425.5 cm³.   [OR (ii)(b) Capacity of cylindrical cup = πr²h = (22/7) × (7/2)² × 14 = 539 cm³.]",
      "[1 mark] (iii) Curved surface area of cylindrical cup = 2πrh = 2 × (22/7) × (7/2) × 14 = 308 cm²."
    ],
    finalAnswer: "(i) 38.5 cm²; (ii)(a) 2425.5 cm³ [OR (ii)(b) 539 cm³]; (iii) 308 cm²",
    ncertRef: "PYQ 30/2/1 Q37", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
];
