import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "areas-related-to-circles"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const AREAS_RELATED_TO_CIRCLES_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-ARC-001", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Sector", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If a sector of a circle has an area of 40π sq. units and a central angle of 72°, the radius of the circle is :",
    options: ["200 units", "100 units", "20 units", "10√2 units"],
    answer: "10√2 units",
    solutionSteps: ["(72/360) × πr² = 40π ⇒ r²/5 = 40 ⇒ r² = 200 ⇒ r = 10√2 units. Correct option: (d) 10√2 units."],
    finalAnswer: "(d) 10√2 units",
    ncertRef: "PYQ 30/1/1 Q15", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-ARC-002", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Arc Length", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If an arc of a circle of diameter 10 cm subtends an angle of 144° at the centre of the circle, then the length of the arc is :",
    options: ["2π cm", "4π cm", "5π cm", "6π cm"],
    answer: "4π cm",
    solutionSteps: ["r = 5 cm; arc length = (144/360) × 2π × 5 = 4π cm. Correct option: (b) 4π cm."],
    finalAnswer: "(b) 4π cm",
    ncertRef: "PYQ 30/2/3 Q3", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-ARC-003", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Sector", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the area of a sector of circle of radius 36 cm is 54π cm², then the length of the corresponding arc of the sector is :",
    options: ["8π cm", "6π cm", "4π cm", "3π cm"],
    answer: "3π cm",
    solutionSteps: ["Area of sector = (1/2) × l × r ⇒ 54π = (1/2) × l × 36 ⇒ l = 3π cm. Correct option: (d) 3π cm."],
    finalAnswer: "(d) 3π cm",
    ncertRef: "PYQ 30/3/1 Q13", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-ARC-004", subject: "Maths", topicKey: "areas-related-to-circles", subtopic: "Area of Sector", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A brooch is a decorative piece often worn on clothing like jackets, blouses or dresses to add elegance. Made from precious metals and decorated with gemstones, brooches come in many shapes and designs. One such brooch is made with silver wire in the form of a circle with diameter 35 mm. The wire is also used in making 5 diameters which divide the circle into 10 equal sectors as shown in the figure. Based on the above given information, answer the following questions : (i) Find the central angle of each sector. (ii) Find the length of the arc ACB. (iii) (a) Find the area of each sector of the brooch. OR (iii) (b) Find the total length of the silver wire used. (Use π = 22/7)",
    answer: "(i) 36° (ii) arc ACB = 11 mm (iii)(a) area of each sector = 385/4 = 96.25 mm² OR (iii)(b) total silver wire = 110 + 175 = 285 mm",
    solutionSteps: ["[1 mark] (i) The circle is divided into 10 equal sectors, so the central angle of each sector = 360°/10 = 36°.", "[1 mark] (ii) Radius r = 35/2 mm. Length of arc ACB = (1/10) × 2πr = (1/10) × 2 × (22/7) × (35/2) = 11 mm.", "[1 mark] (iii)(a) Area of each sector = (1/10) × πr² = (1/10) × (22/7) × (35/2) × (35/2).", "[1 mark] (iii)(a) = (1/10) × (22/7) × (1225/4) = 385/4 = 96.25 mm². [OR (b) total silver wire = 2πr + 5 × 35 = 2 × (22/7) × (35/2) + 175 = 110 + 175 = 285 mm.]"],
    finalAnswer: "(i) 36°; (ii) arc ACB = 11 mm; (iii)(a) area of each sector = 96.25 mm² OR (b) total silver wire = 285 mm.",
    ncertRef: "PYQ 30/1/1 Q37", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
