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
    questionText: "A kite is flying at a height of 60 m above the ground level. Ravi, standing at the roof of the house is holding the string straight and observes the angle of elevation of kite as 30º. From the bottom of the same building, the angle of elevation of kite is 45º. Find the length of the string and height of roof from the ground. (Use 3 = 1.73)",
    answer: "KS = 20√3 m or 34.6 m Hence, TR = (60 – 20√3) m = 60 – 34.6 = 25.4 m Also, sin 300 = 1 2 = KS KR = 20√3 KR ⟹ KR = 40√3 = 69.2 m ∴ Length of the string = 69.2 m and height of roof from the ground = 25.4 m",
    solutionSteps: ["Let K be the position of kite and TR is the height of building.", "Correct figure I 1  18", "tan 450 = 1 = 60 GT", "GT = 60 m Also, tan 300 = 1 √3 = KS SR", "KS = 20√3 m or 34.6 m Hence, TR = (60 – 20√3) m = 60 – 34.6 = 25.4 m Also, sin 300 = 1 2 = KS KR = 20√3 KR ⟹ KR = 40√3 = 69.2 m ∴ Length of the string = 69.2 m and height of roof from the ground = 25.4 m"],
    finalAnswer: "KS = 20√3 m or 34.6 m Hence, TR = (60 – 20√3) m = 60 – 34.6 = 25.4 m Also, sin 300 = 1 2 = KS KR = 20√3 KR ⟹ KR = 40√3 = 69.2 m ∴ Length of the string = 69.2 m and height of roof from the ground = 25.4 m",
    ncertRef: "PYQ 30/4/1 Q34", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-TRIG-002", subject: "Maths", topicKey: "trigonometry", subtopic: "Heights and Distances", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Elevated water storage tanks are built to store and supply water to nearby colonies. In the diagram given above, AB is an elevated water tank and CD is a nearby multistorey building. The building is 54 metres away from the water tank. From a window (W) of the building, the angle of elevation of top of the tank is 45 and angle of depression of its foot is 30. (i) Write a relation between d (the height of window) and y. 1 (ii) Determine the value of h. 1 (iii) (a) Determine height of the water tank. 2 OR (iii) (b) Find the value of x and height of the window above ground level.",
    answer: "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m",
    solutionSteps: ["(i) sin 30° = 1 2 = d y", "2d = y (ii) tan 45° = 1 = h WX = h 54", "h = 54 m (iii) (a) tan 30° = 1 √3 = d 54", "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m"],
    finalAnswer: "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m",
    ncertRef: "PYQ 30/5/1 Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
