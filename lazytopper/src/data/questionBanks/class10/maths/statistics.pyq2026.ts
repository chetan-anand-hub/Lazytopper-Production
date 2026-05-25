import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "statistics"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const STATISTICS_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-STAT-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the mean of the following distribution : Class 30 – 40 40 – 50 50 – 60 60 – 70 70 – 80 Frequency 6 13 8 12 11",
    answer: "Class Frequency (𝑓𝑖) 𝑥𝑖 𝑓𝑖𝑥𝑖 30 – 40 6 35 210 40 – 50 13 45 585 50 – 60 8 55 440 60 – 70 12 65 780 70 – 80 11 75 825 Total 50 2840 Correct table Mean = 2840 50 = 56.8",
    solutionSteps: ["Class Frequency (𝑓𝑖) 𝑥𝑖 𝑓𝑖𝑥𝑖 30 – 40 6 35 210 40 – 50 13 45 585 50 – 60 8 55 440 60 – 70 12 65 780 70 – 80 11 75 825 Total 50 2840 Correct table Mean = 2840 50 = 56.8"],
    finalAnswer: "Class Frequency (𝑓𝑖) 𝑥𝑖 𝑓𝑖𝑥𝑖 30 – 40 6 35 210 40 – 50 13 45 585 50 – 60 8 55 440 60 – 70 12 65 780 70 – 80 11 75 825 Total 50 2840 Correct table Mean = 2840 50 = 56.8",
    ncertRef: "PYQ 30(B) Q31", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "of 24 (b) Compute median of the following data : Midvalue : 115 125 135 145 155 165 175 Frequency : 12 15 20 16 10 16 11",
    answer: "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m",
    solutionSteps: ["(i) sin 30° = 1 2 = d y", "2d = y (ii) tan 45° = 1 = h WX = h 54", "h = 54 m (iii) (a) tan 30° = 1 √3 = d 54", "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m"],
    finalAnswer: "d = 18√3 m Height of the tank = h + d = ൫54 + 18√3൯ m OR (iii) (b) ∠WAC = 30°, tan 30° = 1 √3 = WC 54 ⟹WC = 18√3 m sin 45° = 1 √2 = h x ⇒x = h√2 ⇒x = 54√2 m",
    ncertRef: "PYQ 30/5/3 Q36", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "3" },
];
