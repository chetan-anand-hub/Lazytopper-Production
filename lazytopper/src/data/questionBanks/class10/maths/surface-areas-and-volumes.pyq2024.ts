import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "surface-areas-and-volumes"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const SURFACE_AREAS_AND_VOLUMES_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-SAV-001", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A) : The area of canvas cloth required to just cover a heap of rice in the form of a cone of diameter 14 m and height 24 m is 175 π sq.m. Reason (R) : The curved surface area of a cone of radius r and slant height l is π r l.",
    options: ["Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).", "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).", "Assertion (A) is true but Reason (R) is false.", "Assertion (A) is false but Reason (R) is true."],
    answer: "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
    solutionSteps: ["Correct option: (a) Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of the Assertion (A).."],
    finalAnswer: "(a) Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of the Assertion (A).",
    ncertRef: "PYQ 30(B) Q19", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-SAV-002", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The ratio of total surface area of a solid hemisphere to the square of its radius is :",
    options: ["2π : 1", "4π : 1", "3π : 1", "1 : 4π"],
    answer: "3π : 1",
    solutionSteps: ["Correct option: (c) 3π:1."],
    finalAnswer: "(c) 3π:1",
    ncertRef: "PYQ 30/4/1 Q9", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-SAV-003", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Surface Area of Solids", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two identical solid cubes of side 'a' are joined end to end. The total surface area of the resulting cuboid is:",
    options: ["6a²", "10a²", "5a²", "4a²"],
    answer: "10a²",
    solutionSteps: ["The cuboid is 2a × a × a; TSA = 2(2a·a + a·a + 2a·a) = 10a² (or 2 × 6a² − 2a² for the two hidden faces). Correct option: (b) 10a²."],
    finalAnswer: "(b) 10a²",
    ncertRef: "PYQ 30/4/3 Q8", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-SAV-004a", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The interior of a building is in the form of a cylinder of base radius 12 m and height 3.5 m, surmounted by a cone of equal base and slant height 14 m. Find the internal curved surface area of the building.",
    answer: "Internal CSA of the building = 2πrh + πrl = 2 × (22/7) × 12 × 3.5 + (22/7) × 12 × 14 = 264 + 528 = 792 m²",
    solutionSteps: ["[1 mark] Given: cylindrical part with base radius r = 12 m and height h = 3.5 m, surmounted by a cone of equal base radius r = 12 m and slant height l = 14 m.", "[1 mark] Internal CSA of the building = CSA of cylinder + CSA of cone = 2πrh + πrl.", "[1 mark] CSA of cylinder = 2 × (22/7) × 12 × 3.5 = 264 m².", "[1 mark] CSA of cone = (22/7) × 12 × 14 = 528 m².", "[1 mark] Internal curved surface area of the building = 264 + 528 = 792 m²."],
    finalAnswer: "Internal curved surface area of the building = 792 m²",
    ncertRef: "PYQ 30(B) Q34(a)", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-SAV-005", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Combination of Solids", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A wooden article was made by scooping out a hemisphere from each end of a solid cylinder, as shown in the figure. If the height of the cylinder is 5·8 cm and its base is of radius 2·1 cm, find the total surface area of the article.",
    answer: "CSA of cylinder = 2 × (22/7) × 2.1 × 5.8 = 76.56 cm²; CSA of two hemispheres = 4 × (22/7) × 2.1 × 2.1 = 55.44 cm²; Total surface area of the article = 76.56 + 55.44 = 132 cm²",
    solutionSteps: ["[1 mark] Given: cylinder of height h = 5.8 cm and base radius r = 2.1 cm, with a hemisphere of radius 2.1 cm scooped out from each end. Total surface area of the article = CSA of cylinder + CSA of the two hemispheres.", "[1 mark] CSA of cylinder = 2πrh = 2 × (22/7) × 2.1 × 5.8.", "[1 mark] = 76.56 cm².", "[1 mark] CSA of two hemispheres = 2 × 2πr² = 4 × (22/7) × 2.1 × 2.1 = 55.44 cm².", "[1 mark] Total surface area of the article = 76.56 + 55.44 = 132 cm²."],
    finalAnswer: "Total surface area of the article = 132 cm²",
    ncertRef: "PYQ 30/5/1 Q35", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-SAV-006", subject: "Maths", topicKey: "surface-areas-and-volumes", subtopic: "Volume of Solids", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Tamperproof tetrapacked milk guarantees both freshness and security. This milk ensures uncompromised quality, preserving the nutritional values within and making it a reliable choice for health-conscious individuals. 500 mL milk is packed in a cuboidal container of dimensions 15 cm × 8 cm × 5 cm. These milk packets are then packed in cuboidal cartons of dimensions 30 cm × 32 cm × 15 cm. Based on the above given information, answer the following questions:\n(i) Find the volume of the cuboidal carton.\n(ii) (a) Find the total surface area of a milk packet.\nOR\n(ii) (b) How many milk packets can be filled in a carton?\n(iii) How much milk can the cylindrical cup of radius 5 cm and height 7 cm (as shown in the figure) hold? (Use π = 22/7)",
    answer: "(i) Volume of the carton = 30 × 32 × 15 = 14400 cm³ (ii) (a) Total surface area of a milk packet = 2(15×8 + 8×5 + 5×15) = 470 cm² OR (b) Number of packets = 14400/600 = 24 (iii) Capacity of the cup = (22/7) × 5 × 5 × 7 = 550 cm³ or 550 mL",
    solutionSteps: ["[1 mark] (i) Volume of cuboidal carton = 30 × 32 × 15 = 14400 cm³.", "[1 mark] (ii)(a) Total surface area of a milk packet = 2(lb + bh + hl) = 2(15×8 + 8×5 + 5×15) = 2(120 + 40 + 75). [OR (ii)(b): Number of packets = volume of carton ÷ volume of one packet = (30×32×15)/(15×8×5).]", "[1 mark] (ii)(a) = 2 × 235 = 470 cm². [OR (ii)(b): = 14400/600 = 24 milk packets.]", "[1 mark] (iii) Capacity of the cylindrical cup = πr²h = (22/7) × 5 × 5 × 7 = 550 cm³ or 550 mL."],
    finalAnswer: "(i) Volume of the carton = 30 × 32 × 15 = 14400 cm³ (ii) (a) Total surface area of a milk packet = 2(15×8 + 8×5 + 5×15) = 470 cm² OR (b) Number of packets = 14400/600 = 24 (iii) Capacity of the cup = (22/7) × 5 × 5 × 7 = 550 cm³ or 550 mL",
    ncertRef: "PYQ 30/4/1 Q38", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
