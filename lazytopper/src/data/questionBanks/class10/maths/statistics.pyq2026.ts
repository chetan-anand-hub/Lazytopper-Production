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
  { id: "PYQ-M-2026-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Compute the median of the following data:\nMid-value : Frequency\n115 : 12\n125 : 15\n135 : 20\n145 : 16\n155 : 10\n165 : 16\n175 : 11",
    answer: "Median = 141.875 (≈ 141.88)",
    solutionSteps: ["[1 mark] Mid-values differ by 10, so the classes are 110–120, 120–130, 130–140, 140–150, 150–160, 160–170, 170–180; cumulative frequencies 12, 27, 47, 63, 73, 89, 100; N = 100.", "[1 mark] N/2 = 50; the cf just greater than 50 is 63, so the median class is 140–150 (l = 140, cf = 47, f = 16, h = 10).", "[1 mark] Median = l + ((N/2 − cf)/f) × h = 140 + (3/16) × 10 = 140 + 1.875 = 141.875 ≈ 141.88."],
    finalAnswer: "Median ≈ 141.88",
    ncertRef: "PYQ 30/5/3 Q36", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
