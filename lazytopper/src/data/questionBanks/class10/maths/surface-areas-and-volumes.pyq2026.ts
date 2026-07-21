import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const SURFACE_AREAS_AND_VOLUMES_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-SAV-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A conical cavity of maximum volume is carved out from a wooden solid hemisphere of radius 10 cm. Curved surface area of the cavity carved out is (use = 3.14)",
    options: ["314 2 cm2", "314 cm2", "3140 3 cm2", "3140 2 cm2"],
    answer: "314 2 cm2",
    solutionSteps: ["Correct option: (a) 314√2 cm2."],
    finalAnswer: "(a) 314√2 cm2",
    ncertRef: "PYQ 30/5/1 Q7", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-SAV-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "From a solid cylinder whose height is 2.8 cm and radius 2.1 cm, a conical cavity of the same height and same radius is hollowed out. Find the volume and the total surface area of the remaining solid.",
    answer: "Height of cylinder (h) = 2.8 cm Radius of cylinder (r) = 2.1 cm Volume of remaining solid = 22 7 × 2.1 × 2.1× 2.8 – 1 3 × 22 7 × 2.1 × 2.1 × 2.8 = 25.872 cm3 Slant height (l) = √(2.1)2 + (2.8)2 = 3.5 cm Total surface area of the remaining solid = 2 × 22 7 × 2.1 × 2.8 + 22 7 × 2.1 × 3.5 + 22 7 × 2.1 × 2.1 = 73.92 cm2",
    solutionSteps: ["[1 mark] Given: height of cylinder h = 2.8 cm, radius r = 2.1 cm; the conical cavity has the same height and radius. Volume of remaining solid = volume of cylinder − volume of cone = πr²h − (1/3)πr²h = (2/3)πr²h.", "[1 mark] Volume = (2/3) × (22/7) × 2.1 × 2.1 × 2.8 = 25.872 cm³.", "[1 mark] Slant height of the cone l = √(r² + h²) = √((2.1)² + (2.8)²) = √12.25 = 3.5 cm.", "[1 mark] Total surface area of remaining solid = CSA of cylinder + CSA of cone + area of top circular base = 2πrh + πrl + πr² = 2 × (22/7) × 2.1 × 2.8 + (22/7) × 2.1 × 3.5 + (22/7) × 2.1 × 2.1.", "[1 mark] = 36.96 + 23.1 + 13.86 = 73.92 cm²."],
    finalAnswer: "Height of cylinder (h) = 2.8 cm Radius of cylinder (r) = 2.1 cm Volume of remaining solid = 22 7 × 2.1 × 2.1× 2.8 – 1 3 × 22 7 × 2.1 × 2.1 × 2.8 = 25.872 cm3 Slant height (l) = √(2.1)2 + (2.8)2 = 3.5 cm Total surface area of the remaining solid = 2 × 22 7 × 2.1 × 2.8 + 22 7 × 2.1 × 3.5 + 22 7 × 2.1 × 2.1 = 73.92 cm2",
    ncertRef: "PYQ 30(B) Q35", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-SAV-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A wall mounted lamp, made of fabric, is shown below. Lamp has cuboidal shape, open from top and bottom. A spherical bulb of diameter 7 cm is latched with a very thin rod. (Ignore the rod while making calculations.) Dimensions of the cuboid are 24 cm 12 cm 17 cm. of 24 (i) 1 (ii) 1 cm ? 1 (iii) (a) 2 cm 2 (iii) (b) 2 ____________ of 24 (i) Find the surface area of the bulb. 1 (ii) What could be the maximum diameter of the bulb if at least 1 cm space is left from each side ? 1 (iii) (a) Find the area of the fabric used if there is a fold of 2 cm on top and bottom edges. 2 OR (iii) (b) Find the space available inside the lamp.",
    answer: "(i) Surface area of the bulb = 4 × 22 7 × 7 2 × 7 2 = 154 cm (ii) Maximum diameter of the bulb = Minimum side length −2 cm = 12 −2 = 10 cm (iii) (a) With 2 cm extra cloth for top and bottom edges, new dimensions are 24 cm × 12 cm × 21 cm Area of fabric used = 2 × 21 × (24 + 12) = 1512 cm OR (iii) (b)Space available = 24 × 12 × 17 −4 3 × 22 7 × 7 2 × 7 2 × 7 2 = 4896 −539 3 = 14149 3 cmor 4716.3 cm(approx. )",
    solutionSteps: ["[1 mark] (i) Surface area of the spherical bulb = 4πr² = 4 × (22/7) × (7/2) × (7/2) = 154 cm².", "[1 mark] (ii) Maximum diameter of the bulb = minimum side length − 2 cm (1 cm space on each side) = 12 − 2 = 10 cm.", "[1 mark] (iii)(a) With a 2 cm fold on the top and bottom edges, the fabric dimensions become 24 cm × 12 cm × 21 cm; area of fabric used = lateral surface area = 2 × height × (length + breadth) = 2 × 21 × (24 + 12). [OR (iii)(b): Space available = volume of cuboid − volume of bulb = 24 × 12 × 17 − (4/3) × (22/7) × (7/2) × (7/2) × (7/2) = 4896 − 539/3.]", "[1 mark] (iii)(a) = 2 × 21 × 36 = 1512 cm². [OR (iii)(b): = 14149/3 cm³ or 4716.3 cm³ (approx.).]"],
    finalAnswer: "(i) Surface area of the bulb = 4 × 22 7 × 7 2 × 7 2 = 154 cm (ii) Maximum diameter of the bulb = Minimum side length −2 cm = 12 −2 = 10 cm (iii) (a) With 2 cm extra cloth for top and bottom edges, new dimensions are 24 cm × 12 cm × 21 cm Area of fabric used = 2 × 21 × (24 + 12) = 1512 cm OR (iii) (b)Space available = 24 × 12 × 17 −4 3 × 22 7 × 7 2 × 7 2 × 7 2 = 4896 −539 3 = 14149 3 cmor 4716.3 cm(approx. )",
    ncertRef: "PYQ 30/5/2 Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "2" },
];
