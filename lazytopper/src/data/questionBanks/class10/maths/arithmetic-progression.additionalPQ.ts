import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-24

export const ARITHMETIC_PROGRESSION_APQ: CanonicalQuestion[] = [
  // PQ2 Q5 (Section A, MCQ, 1 mark)
  { id: "APQ-M-AP-001", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of First n Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the sum of first n odd natural numbers is equal to k times the sum of first n even natural numbers, then k is equal to",
    options: ["(n+1)/(2n)", "(2n)/(n+1)", "(n+1)/n", "n/(n+1)"],
    answer: "n/(n+1)",
    solutionSteps: ["Sum of first n odd naturals = n^2. Sum of first n even naturals = n(n + 1).", "k × n(n + 1) = n^2 ⟹ k = n^2 / [n(n+1)] = n/(n+1)."],
    finalAnswer: "(d) n/(n+1)",
    ncertRef: "APQ PQ2 Q5", isCompetencyBased: true },

  // PQ2 Q6 (Section A, MCQ, 1 mark)
  { id: "APQ-M-AP-002", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Difference of nth Terms", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Two APs have the same common difference. The first term of one of these is −1 and that of the other is −8. Then the difference between their 4th terms is",
    options: ["−1", "−8", "7", "−9"],
    answer: "7",
    solutionSteps: ["a4 = a + 3d. Difference of 4th terms = (a1 + 3d) − (a2 + 3d) = a1 − a2 = −1 − (−8) = 7."],
    finalAnswer: "(c) 7",
    ncertRef: "APQ PQ2 Q6", isCompetencyBased: true },

  // PQ1 Q36 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-AP-003", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "AP — Real-world Application", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "An interior designer, Sana, hired two painters, Manan and Bhima to make paintings for her buildings. Both painters were asked to make 50 different paintings each. Manan asked for Rs 6000 for the first painting, and an increment of Rs 200 for each following painting. Bhima asked for Rs 4000 for the first painting, and an increment of Rs 400 for each following painting. (i) How much money did Manan get for his 25th painting? (ii) How much money did Bhima get in all? (iii) If both Manan and Bhima make paintings at the same pace, find the first painting for which Bhima will get more money than Manan. OR (iii) Sana's friend Aarti hired Manan and Bhima to make paintings at the same rates. Aarti had both make the same number of paintings, and paid them the exact same amount in total. How many paintings did Aarti get each painter to make?",
    answer: "(i) Rs 10,800. (ii) Rs 6,90,000. (iii) From 12th painting (Bhima > Manan). [OR] 21 paintings.",
    solutionSteps: ["(i) Manan: a = 6000, d = 200; a25 = 6000 + 24 × 200 = Rs 10,800.", "(ii) Bhima: S50 = 50/2 × [2(4000) + 49(400)] = 25 × [8000 + 19600] = 25 × 27600 = Rs 6,90,000.", "(iii) Set Manan's nth = Bhima's nth: 6000 + (n−1)·200 = 4000 + (n−1)·400 ⟹ 2000 = (n−1)·200 ⟹ n = 11. At n=11 they tie; from n=12 onwards Bhima earns more. First painting where Bhima > Manan = 12th.", "[OR] Sn(Manan) = Sn(Bhima): n/2[2(6000) + (n−1)·200] = n/2[2(4000) + (n−1)·400]. Simplify: 12000 + (n−1)·200 = 8000 + (n−1)·400 ⟹ 4000 = (n−1)·200 ⟹ n = 21."],
    finalAnswer: "(i) Rs 10,800; (ii) Rs 6,90,000; (iii) 12th painting [or] 21 paintings.",
    ncertRef: "APQ PQ1 Q36", isCompetencyBased: true },

  // PQ2 Q37 (Section E, Case-Based, 4 marks)
  { id: "APQ-M-AP-004", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "AP — Real-world Application", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A school auditorium has to be constructed with a capacity of 2000 people. The chairs are arranged in a concave shape facing the stage in such a way that each succeeding row has 5 seats more than the previous one. (i) If the first row has 15 seats, how many seats will be there in 12th row? (ii) If there are 15 rows in the auditorium, how many seats in the middle row? (iii) If total 1875 guests are there, how many rows will be needed? OR (iii) If 1250 guests are there, how many rows will be left blank out of 30 total rows?",
    answer: "(i) 70 seats. (ii) 50 seats (8th row). (iii) 25 rows. [OR] 10 rows left blank.",
    solutionSteps: ["(i) a = 15, d = 5; a12 = 15 + 11 × 5 = 70.", "(ii) Middle row of 15 = 8th row; a8 = 15 + 7 × 5 = 50.", "(iii) Sum Sn = 1875: n/2 × [2(15) + (n−1)·5] = 1875 ⟹ n^2 + 5n − 750 = 0 ⟹ (n − 25)(n + 30) = 0 ⟹ n = 25.", "[OR] Sn = 1250: n/2 × [30 + (n−1)·5] = 1250 ⟹ n^2 + 5n − 500 = 0 ⟹ (n − 20)(n + 25) = 0 ⟹ n = 20. Rows left blank = 30 − 20 = 10."],
    finalAnswer: "(i) 70; (ii) 50; (iii) 25 rows [or] 10 left blank.",
    ncertRef: "APQ PQ2 Q37", isCompetencyBased: true },
];
