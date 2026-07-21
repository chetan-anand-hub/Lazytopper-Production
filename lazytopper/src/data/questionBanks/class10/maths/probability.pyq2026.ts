import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "probability"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const PROBABILITY_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-PROB-001", subject: "Maths", topicKey: "probability", subtopic: "Ball Probability", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A bag contains 25 balls. Some of them are yellow and others are green. One ball is drawn at random. If probability of getting a green ball is 3/5, then find the number of yellow balls.",
    // Recovered from MS_X_041_Mathematics_30-5-1_2025-26, p.9. The stored text stopped at the
    // stacked-fraction line break, dropping the final "= 10".
    answer: "P(getting a yellow ball) = 1 − P(getting a green ball) ⟹ (Number of yellow balls)/25 = 1 − 3/5 = 2/5 ⟹ Number of yellow balls = 25 × 2/5 = 10",
    solutionSteps: ["P(getting a yellow ball) = 1 − P(getting a green ball)", "(Number of yellow balls)/25 = 1 − 3/5 = 2/5", "⟹ Number of yellow balls = 25 × 2/5 = 10"],
    finalAnswer: "Number of yellow balls = 10",
    ncertRef: "PYQ 30/5/1 Q25", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-PROB-002", subject: "Maths", topicKey: "probability", subtopic: "Ball Probability", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    // questionText: the ratio was stored as "4 5", but the source QP
    // (1171-1_30-4-1 (Mathematics Standard).pdf, p.17) stacks 5 ABOVE 4 (glyph bboxes: 5 at
    // y=149.4, 4 at y=166.3, same x) — i.e. 5/4, not 4/5. As stored the question was unsolvable:
    // only 5/4 yields the marking scheme's m = 12.
    questionText: "A bag contains 30 balls out of which 'm' number of balls are blue in colour. (i) Find the probability that a ball drawn at random from the bag is not blue. (ii) If 6 more blue balls are added in the bag, then the probability of drawing a blue ball will be 5/4 times the probability of drawing a blue ball in the first case. Find the value of m.",
    // Recovered from MS_X_041_Mathematics_30-4-1_2025-26, p.14.
    answer: "(i) P(ball drawn is not blue) = (30 − m)/30 or 1 − m/30 (ii) Total number of balls now = 36 Number of blue balls now = m + 6 P(ball drawn is blue) = (m+6)/36 According to question, (m+6)/36 = 5/4 × m/30 ⟹ m = 12",
    solutionSteps: ["(i) P(ball drawn is not blue) = (30 − m)/30 or 1 − m/30", "(ii) Total number of balls now = 36 Number of blue balls now = m + 6", "P(ball drawn is blue) = (m+6)/36", "According to question, (m+6)/36 = 5/4 × m/30 ⟹ m = 12"],
    finalAnswer: "m = 12",
    ncertRef: "PYQ 30/4/1 Q30", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-PROB-003", subject: "Maths", topicKey: "probability", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Raghav has a collection of balls of different colours. He has a total of 35 balls in his basket out of which seven are black in colour and eight are yellow in colour. Out of remaining balls, some are white and the rest are red. Based on the above, answer the following questions : (a) If the probability of drawing a red ball at random from the basket is three times that of a white ball, then find the number of red balls in the basket. (b) Find the probability of drawing a ball at random from the basket which is either a black or a white ball.",
    answer: "x = 5 Number of white balls = 5 and number of red balls = 15 (b) P (a black ball) = 7 35 P (a white ball) = 5 35 P (either a black or a white ball) = 7+5 35 = 12",
    solutionSteps: ["Total number of balls = 35 Number of black balls = 7 Number of yellow balls = 8 (a) Number of white and red balls = 35 – 15 = 20 Let number of white balls = x, then number of red balls = (20 – x) Since", "P (a red ball) = 3 × P (a white ball),", "20 − 𝑥 35 = 3 × 𝑥 35", "x = 5 Number of white balls = 5 and number of red balls = 15 (b) P (a black ball) = 7 35 P (a white ball) = 5 35 P (either a black or a white ball) = 7+5 35 = 12"],
    finalAnswer: "x = 5 Number of white balls = 5 and number of red balls = 15 (b) P (a black ball) = 7 35 P (a white ball) = 5 35 P (either a black or a white ball) = 7+5 35 = 12",
    ncertRef: "PYQ 30(B) Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
];
