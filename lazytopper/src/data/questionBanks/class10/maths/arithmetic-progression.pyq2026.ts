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
    solutionSteps: ["[1 mark] (i) Dots: 4, 8, 12, 16, … Each term exceeds the previous by the same amount (8 − 4 = 12 − 8 = 4), so the numbers form an A.P. with first term a = 4 and common difference d = 4.", "[1 mark] (ii) nth term: aₙ = a + (n − 1)d = 4 + (n − 1)4 = 4n.", "[1 mark] (iii)(a) Total dots in n squares = Sₙ = n/2 [2a + (n − 1)d] = n/2 [8 + 4(n − 1)] = 2n² + 2n. Given Sₙ = 220: 2n² + 2n = 220 → n² + n − 110 = 0 → (n + 11)(n − 10) = 0.", "[1 mark] Rejecting n = −11, n = 10; so 10 squares are formed. [OR (iii)(b) 2n² + 2n = 100 → n² + n − 50 = 0; discriminant = 1 + 200 = 201, which is not a perfect square, so n is not a natural number — it is NOT possible to complete n squares using exactly 100 dots.]"],
    finalAnswer: "(i) A.P. with a = 4, d = 4; (ii) aₙ = 4n; (iii)(a) 10 squares [OR (b) not possible — n² + n − 50 = 0 has no natural-number solution].",
    ncertRef: "PYQ 30/4/1 Q37", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
