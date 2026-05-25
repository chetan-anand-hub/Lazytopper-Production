import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const ARITHMETIC_PROGRESSION_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-AP-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "nth Term", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "'Kolam' is a decorative art which is made with rice flour in South Indian States. It is drawn on grid pattern of dots. One such art work is shown below. Observe the given figure carefully. There are 4 dots in first square, 8 dots in second square, 12 dots in third square and so on. Based on the above, answer the following questions : (i) Show that number of dots given above form an A.P. Write the first term and common difference. 1 (ii) Write nth term of the A.P. formed. 1 (iii) (a) The pattern is expanded on a large ground. If total 220 dots are used, then find the number of squares formed. 2 OR (b) Is it possible to complete n number of squares using 100 dots ? If yes, then find the value of n.",
    answer: "Mode = 45 + 14−11 28−11−10 × 15 = 45 + 3 ×15 7 = 51.4 (approx.)",
    solutionSteps: ["5 1 11 45 – 60 14 52.5 0 0 60 – 75 10 67.5 1 10 75 – 90 7 82.5 2 14 90 – 105 6 97.5 3 18 Total 60 3 I 2  20", "Mean = 𝑥̅ = 52.5 + 15 × 3 60 = 53.25 Modal Class = 45 – 60", "Mode = 45 + 14−11 28−11−10 × 15 = 45 + 3 ×15 7 = 51.4 (approx.)"],
    finalAnswer: "Mode = 45 + 14−11 28−11−10 × 15 = 45 + 3 ×15 7 = 51.4 (approx.)",
    ncertRef: "PYQ 30/4/1 Q37", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
