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
    questionText: "A conical cavity of maximum volume is carved out from a wooden solid hemisphere of radius 10 cm. Curved surface area of the cavity carved out is (use π = 3.14)",
    options: ["314√2 cm²", "314 cm²", "3140√3 cm²", "3140√2 cm²"],
    answer: "314√2 cm²",
    solutionSteps: ["Correct option: (a). Maximum cone: r = h = 10 cm, so l = √(10² + 10²) = 10√2 cm; CSA = πrl = 3.14 × 10 × 10√2 = 314√2 cm²."],
    finalAnswer: "(a) 314√2 cm²",
    ncertRef: "PYQ 30/5/1 Q7", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-SAV-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "From a solid cylinder whose height is 2.8 cm and radius 2.1 cm, a conical cavity of the same height and same radius is hollowed out. Find the volume and the total surface area of the remaining solid.",
    answer: "Volume of remaining solid = πr²h − (1/3)πr²h = (22/7) × 2.1 × 2.1 × 2.8 − (1/3) × (22/7) × 2.1 × 2.1 × 2.8 = 25.872 cm³. Slant height l = √(2.1² + 2.8²) = 3.5 cm. TSA of remaining solid = 2πrh + πrl + πr² = 36.96 + 23.1 + 13.86 = 73.92 cm².",
    solutionSteps: ["[1 mark] Given: height of cylinder h = 2.8 cm, radius r = 2.1 cm; the conical cavity has the same height and radius. Volume of remaining solid = volume of cylinder − volume of cone = πr²h − (1/3)πr²h = (2/3)πr²h.", "[1 mark] Volume = (2/3) × (22/7) × 2.1 × 2.1 × 2.8 = 25.872 cm³.", "[1 mark] Slant height of the cone l = √(r² + h²) = √((2.1)² + (2.8)²) = √12.25 = 3.5 cm.", "[1 mark] Total surface area of remaining solid = CSA of cylinder + CSA of cone + area of top circular base = 2πrh + πrl + πr² = 2 × (22/7) × 2.1 × 2.8 + (22/7) × 2.1 × 3.5 + (22/7) × 2.1 × 2.1.", "[1 mark] = 36.96 + 23.1 + 13.86 = 73.92 cm²."],
    finalAnswer: "Volume of remaining solid = 25.872 cm³; total surface area of remaining solid = 73.92 cm².",
    ncertRef: "PYQ 30(B) Q35", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-SAV-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A wall-mounted lamp is made of fabric. The lamp has a cuboidal shape, open from top and bottom, of length 24 cm, breadth 12 cm and height 17 cm. A spherical bulb of diameter 7 cm is latched inside it with a very thin rod. (Ignore the rod while making calculations; use π = 22/7.) Based on the above information, answer the following questions:\n(i) Find the surface area of the bulb.\n(ii) What could be the maximum diameter of the bulb if at least 1 cm space is left from each side?\n(iii) (a) Find the area of the fabric used if there is a fold of 2 cm on top and bottom edges.\nOR\n(iii) (b) Find the space available inside the lamp.",
    answer: "(i) Surface area of the bulb = 4 × (22/7) × (7/2) × (7/2) = 154 cm². (ii) Maximum diameter = minimum side − 2 cm = 12 − 2 = 10 cm. (iii)(a) With 2 cm fold at top and bottom, height = 21 cm; fabric area = 2 × 21 × (24 + 12) = 1512 cm². OR (iii)(b) Space available = 24 × 12 × 17 − (4/3) × (22/7) × (7/2)³ = 4896 − 539/3 = 14149/3 ≈ 4716.3 cm³.",
    solutionSteps: ["[1 mark] (i) Surface area of the spherical bulb = 4πr² = 4 × (22/7) × (7/2) × (7/2) = 154 cm².", "[1 mark] (ii) Maximum diameter of the bulb = minimum side length − 2 cm (1 cm space on each side) = 12 − 2 = 10 cm.", "[1 mark] (iii)(a) With a 2 cm fold on the top and bottom edges, the fabric dimensions become 24 cm × 12 cm × 21 cm; area of fabric used = lateral surface area = 2 × height × (length + breadth) = 2 × 21 × (24 + 12). [OR (iii)(b): Space available = volume of cuboid − volume of bulb = 24 × 12 × 17 − (4/3) × (22/7) × (7/2) × (7/2) × (7/2) = 4896 − 539/3.]", "[1 mark] (iii)(a) = 2 × 21 × 36 = 1512 cm². [OR (iii)(b): = 14149/3 cm³ or 4716.3 cm³ (approx.).]"],
    finalAnswer: "(i) 154 cm²; (ii) 10 cm; (iii)(a) 1512 cm² OR (iii)(b) 14149/3 cm³ ≈ 4716.3 cm³",
    ncertRef: "PYQ 30/5/2 Q38", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
