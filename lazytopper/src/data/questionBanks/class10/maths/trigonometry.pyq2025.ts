import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "trigonometry"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const TRIGONOMETRY_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-TRIG-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If tan A = √3; where A is an acute angle, then find the value of sin² A/(1 + cos² A).",
    answer: "3/5",
    solutionSteps: [
      "[0.5 marks] tan A = √3 = tan 60° ⟹ A = 60°.",
      "[1 mark] sin² A/(1 + cos² A) = sin² 60°/(1 + cos² 60°) = (√3/2)²/(1 + (1/2)²) = (3/4)/(5/4).",
      "[0.5 marks] = 3/5.",
    ],
    finalAnswer: "3/5",
    ncertRef: "PYQ 30/2/1 Q23", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-M-2025-TRIG-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If 4k = tan² 60° − 2 cosec² 30° − 2 tan² 30°, then find the value of k.",
    answer: "k = −17/12",
    solutionSteps: ["[1.5 marks] 4k = (√3)² − 2(2)² − 2(1/√3)² = 3 − 8 − 2/3 = −17/3", "[0.5 marks] Therefore k = (−17/3) ÷ 4 = −17/12"],
    finalAnswer: "k = −17/12",
    ncertRef: "PYQ 30/3/1 Q21", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1",
  },
  { id: "PYQ-M-2025-TRIG-003", subject: "Maths", topicKey: "trigonometry", subtopic: "Trigonometric Ratios of Specific Angles", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "If tan A + cot A = 6, then find the value of tan²A + cot²A − 4.",
    answer: "30",
    solutionSteps: ["[1 mark] (tan A + cot A)² = 36 ⇒ tan²A + cot²A + 2 tan A cot A = 36; since tan A cot A = 1, tan²A + cot²A = 34.", "[1 mark] ∴ tan²A + cot²A − 4 = 34 − 4 = 30."],
    finalAnswer: "30",
    ncertRef: "PYQ 30/3/3 Q21", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "3",
  },
  { id: "PYQ-M-2025-TRIG-004", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Amrita stood near the base of a lighthouse, gazing up at its towering height. She measured the angle of elevation to the top and found it to be 60°. Then, she climbed a nearby observation deck, 40 metres higher than her original position and noticed the angle of elevation to the top of lighthouse to be 45°.\nBased on the above given information, answer the following questions :\n(i) If CD is h metres, find the distance BD in terms of 'h'.\n(ii) Find distance BC in terms of 'h'.\n(iii) (a) Find the height CE of the lighthouse [Use √3 = 1·73]\nOR\n(iii) (b) Find distance AE, if AC = 100 m.",
    answer: "(i) BD = h m; (ii) BC = √2h m; (iii)(a) CE = 94.6 m [OR (b) AE = 50 m]",
    solutionSteps: [
      "[1 mark] (i) In right ∆BDC, h/BD = tan 45° = 1 (½ mark) ⟹ BD = h m (½ mark).",
      "[1 mark] (ii) h/BC = sin 45° = 1/√2 (½ mark) ⟹ BC = √2h m (½ mark).",
      "[1 mark] (iii)(a) AE = BD = h and CE = h + 40, so tan 60° = EC/AE ⟹ √3 = (h + 40)/h.",
      "[1 mark] ⟹ h = 40/(√3 − 1) = 20(√3 + 1) = 20 × 2.73 = 54.6 m (½ mark), so CE = 54.6 + 40 = 94.6 m (½ mark). [OR (iii)(b): cos 60° = AE/AC ⟹ 1/2 = AE/100 (1 mark) ⟹ AE = 50 m (1 mark).]",
    ],
    finalAnswer: "(i) BD = h m; (ii) BC = √2h m; (iii)(a) CE = 94.6 m [OR (iii)(b) AE = 50 m]",
    ncertRef: "PYQ 30/1/1 Q38", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-M-2025-TRIG-005", competencyVerified: true, subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A lighthouse stands tall on a cliff by the sea, watching over ships that pass by. One day a ship is seen approaching the shore and from the top of the lighthouse, the angles of depression of the ship are observed to be 30 and 45 as it moves from point P to point Q. The height of the lighthouse is 50 metres. Based on the information given above, answer the following questions : (i) Find the distance of the ship from the base of the lighthouse when it is at point Q, where the angle of depression is 45 . 1 (ii) Find the measures of PBA and QBA. 1 (iii) (a) Find the distance travelled by the ship between points P and Q. 2 OR (b) If the ship continues moving towards the shore and takes 10 minutes to travel from Q to A, calculate the speed of the ship in km/h, from Q to A. 2",
    answer: "(i) In ΔAQB, tan 45° = 50/AQ ⟹ AQ = 50 m (ii) ∠PBA = 60°, ∠QBA = 45° (iii) (a) In ΔAPB, tan 30° = 50/AP ⟹ AP = 50√3 m; PQ = 50√3 − 50 = 50(√3 − 1) m ≈ 36.6 m OR (b) Speed of the ship = 50 m in 10 min = 0.3 km/h",
    solutionSteps: ["[1 mark] (i) The angle of depression 45° equals ∠AQB. In right triangle AQB, tan 45° = AB/AQ ⟹ 1 = 50/AQ ⟹ AQ = 50 m.", "[1 mark] (ii) The angle of depression equals the angle of elevation, so ∠QBA = 45° and ∠PBA = 90° − 30° = 60°.", "[1 mark] (iii)(a) In right triangle APB, tan 30° = AB/AP ⟹ 1/√3 = 50/AP ⟹ AP = 50√3 m.", "[1 mark] (iii)(a) Distance travelled PQ = AP − AQ = 50√3 − 50 = 50(√3 − 1) ≈ 36.6 m. [OR (b): speed from Q to A = 50 m in 10 min = 5 m/min = 0.3 km/h.]"],
    finalAnswer: "(i) AQ = 50 m; (ii) ∠PBA = 60°, ∠QBA = 45°; (iii)(a) PQ = 50(√3 − 1) ≈ 36.6 m [OR (b) speed Q to A = 0.3 km/h].",
    ncertRef: "PYQ 30/3/1 Q37", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
];
