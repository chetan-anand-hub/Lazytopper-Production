import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "trigonometry"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const TRIGONOMETRY_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-TRIG-001", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A kite is flying at a height of 60 m above the ground level. Ravi, standing on the roof of a house, is holding the string straight and observes the angle of elevation of the kite as 30°. From the bottom of the same building, the angle of elevation of the kite is 45°. Find the length of the string and the height of the roof from the ground. (Use √3 = 1.73)",
    answer: "Length of the string = 40√3 m ≈ 69.2 m; height of the roof = (60 − 20√3) m ≈ 25.4 m",
    solutionSteps: ["[1 mark] Let K be the kite, KG = 60 m its height above the ground, T the bottom and R the top (roof) of the building; S is the point on KG level with the roof, so SR = GT and KS = 60 − TR.", "[1 mark] From T: tan 45° = KG/GT ⇒ 1 = 60/GT ⇒ GT = 60 m, so SR = 60 m.", "[1 mark] From R: tan 30° = KS/SR ⇒ 1/√3 = KS/60 ⇒ KS = 20√3 m ≈ 34.6 m.", "[1 mark] Height of roof TR = 60 − 20√3 = 60 − 34.6 = 25.4 m.", "[1 mark] sin 30° = KS/KR ⇒ 1/2 = 20√3/KR ⇒ KR = 40√3 = 69.2 m. Length of string = 69.2 m; height of roof = 25.4 m."],
    finalAnswer: "Length of the string = 69.2 m; height of the roof from the ground = 25.4 m",
    ncertRef: "PYQ 30/4/1 Q34", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2026-TRIG-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Elevated water storage tanks are built to store and supply water to nearby colonies. In the diagram given above, AB is an elevated water tank and CD is a nearby multistorey building. The building is 54 metres away from the water tank.\nFrom a window (W) of the building, the angle of elevation of top of the tank is 45° and angle of depression of its foot is 30°.\n(i) Write a relation between d (the height of window) and y.\n(ii) Determine the value of h.\n(iii) (a) Determine height of the water tank.\nOR\n(iii) (b) Find the value of x and height of the window above ground level.",
    answer: "(i) sin 30° = d/y ⇒ y = 2d; (ii) h = 54 m; (iii)(a) d = 18√3 m, height of the tank = h + d = (54 + 18√3) m [OR (b) height of window WC = 18√3 m, x = 54√2 m].",
    solutionSteps: ["[1 mark] (i) sin 30° = d/y ⇒ 1/2 = d/y ⇒ y = 2d.", "[1 mark] (ii) tan 45° = h/WX = h/54 = 1 ⇒ h = 54 m.", "[1 mark] (iii)(a) tan 30° = d/54 = 1/√3 ⇒ d = 54/√3 = 18√3 m. [OR (b) ∠WAC = 30°, tan 30° = WC/54 = 1/√3 ⇒ WC = 18√3 m, the height of the window above ground level.]", "[1 mark] (iii)(a) Height of the tank = h + d = (54 + 18√3) m. [OR (b) sin 45° = h/x = 1/√2 ⇒ x = h√2 = 54√2 m.]"],
    finalAnswer: "(i) sin 30° = d/y ⇒ y = 2d; (ii) h = 54 m; (iii)(a) d = 18√3 m, height of the tank = h + d = (54 + 18√3) m [OR (b) height of window WC = 18√3 m, x = 54√2 m].",
    ncertRef: "PYQ 30/5/1 Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
