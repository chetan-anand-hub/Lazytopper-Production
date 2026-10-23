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
    answer: "Class marks x_i = 35, 45, 55, 65, 75 for f_i = 6, 13, 8, 12, 11; Σf_i = 50. f_i × x_i = 210, 585, 440, 780, 825; Σ(f_i × x_i) = 2840. Mean = Σ(f_i × x_i) / Σf_i = 2840/50 = 56.8.",
    solutionSteps: ["[1 mark] Class marks x_i = 35, 45, 55, 65, 75 for f_i = 6, 13, 8, 12, 11; Σf_i = 50.", "[1 mark] f_i × x_i = 210, 585, 440, 780, 825; Σ(f_i × x_i) = 2840.", "[1 mark] Mean = Σ(f_i × x_i) / Σf_i = 2840/50 = 56.8."],
    finalAnswer: "Mean = 56.8.",
    ncertRef: "PYQ 30(B) Q31", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Compute median of the following data :\nMid-value : 115, 125, 135, 145, 155, 165, 175\nFrequency : 12, 15, 20, 16, 10, 16, 11",
    answer: "Median = 1135/8 or 141.8 (approx.)",
    solutionSteps: [
      "[1 mark] Mid-values differ by 10, so the class intervals are 110–120, 120–130, 130–140, 140–150, 150–160, 160–170, 170–180.",
      "[1 mark] Frequencies f: 12, 15, 20, 16, 10, 16, 11 (N = 100).",
      "[1 mark] Cumulative frequencies cf: 12, 27, 47, 63, 73, 89, 100.",
      "[0.5 marks] N/2 = 100/2 = 50, so the median class is 140 − 150 (l = 140, cf = 47, f = 16, h = 10).",
      "[1 mark] Median = l + ((N/2 − cf)/f) × h = 140 + ((50 − 47)/16) × 10.",
      "[0.5 marks] = 1135/8 or 141.8 (approx.).",
    ],
    finalAnswer: "Median = 1135/8 ≈ 141.8",
    ncertRef: "PYQ 30/5/3 Q33(b)", isCompetencyBased: true, pyqYear: "2026", pyqSet: "3",
  },
];
