import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "statistics"
// Extraction date: 2026-05-24

export const STATISTICS_APQ: CanonicalQuestion[] = [
  // PQ1 Q16 (Section A, MCQ, 1 mark)
  { id: "APQ-M-STAT-001", subject: "Maths", topicKey: "statistics", subtopic: "Modal Class — Grouped Data", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Sweety, Nitesh, and Ashraf visited a hospital for their annual body checkup, which included a blood pressure evaluation. Sweety: 121 mmHg, Nitesh: 147 mmHg, Ashraf: 160 mmHg. The table depicts the systolic blood pressure ranges (115-125: 10, 125-135: 9, 135-145: 12, 145-155: 19, 155-165: 10). Who among the three friends has a blood pressure reading that falls in the modal class?",
    options: ["Sweety", "Nitesh", "Ashraf", "Both Sweety and Ashraf"],
    answer: "Nitesh",
    solutionSteps: ["Modal class = class with highest frequency. Frequencies: 10, 9, 12, 19, 10 — highest is 19 in class 145-155.", "Nitesh's reading is 147 mmHg, which lies in 145-155. So Nitesh is in the modal class."],
    finalAnswer: "(b) Nitesh",
    ncertRef: "APQ PQ1 Q16", isCompetencyBased: true },

  // PQ2 Q17 (Section A, MCQ, 1 mark)
  { id: "APQ-M-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Mean–Median–Mode Relation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "If mode of some data is 7 and their mean is also 7 then their median is",
    options: ["10", "9", "8", "7"],
    answer: "7",
    solutionSteps: ["Empirical relation: Mode = 3·Median − 2·Mean ⟹ 7 = 3·Median − 14 ⟹ Median = 7."],
    finalAnswer: "(d) 7",
    ncertRef: "APQ PQ2 Q17", isCompetencyBased: true },

  // PQ1 Q17 (Section A, MCQ, 1 mark)
  { id: "APQ-M-STAT-003", subject: "Maths", topicKey: "statistics", subtopic: "Median and Class Frequencies", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The table depicts the weight of the students of class 6. There are 18 students that weigh above the median weight. If there are no students with the same weight as median weight, how many students weigh between the range of 37 - 40 kgs?",
    options: ["5", "7", "18", "31"],
    answer: "5",
    solutionSteps: ["[1 mark] No student weighs exactly the median weight and 18 students weigh above it, so 18 weigh below it: total = 36 students. From the table, 25-28: 6, 28-31: 8, 31-34: 7, 34-37: 10, so 6 + 8 + 7 + 10 = 31 students weigh 25-37 kg. Students weighing 37-40 kg = 36 − 31 = 5."],
    finalAnswer: "(a) 5",
    ncertRef: "APQ PQ1 Q17", isCompetencyBased: true,
 },

  // PQ1 Q35 (Section D, Long, 5 marks)
  { id: "APQ-M-STAT-004", competencyVerified: true, subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A car assembly unit assembles a limited number of cars daily, depending on the prevailing demand. The table presents an analysis: cars assembled per day (0-4: 33 days, 4-8: 18 days, 8-12: 21 days, 12-16: 11 days, 16-20: 7 days). (i) If the demand of the cars is doubled, estimate how many cars on an average should be assembled per day to meet the increased demand? (ii) At least on how many days, less than average number of cars were assembled?",
    answer: "(i) ~15 cars per day. (ii) At least 33 days.",
    solutionSteps: ["[1 mark] Class marks xᵢ: 2, 6, 10, 14, 18; frequencies fᵢ: 33, 18, 21, 11, 7; Σfᵢ = 90.", "[1 mark] Σfᵢ·xᵢ = 33·2 + 18·6 + 21·10 + 11·14 + 7·18 = 66 + 108 + 210 + 154 + 126 = 664.", "[1 mark] Mean = Σfᵢxᵢ/Σfᵢ = 664/90 ≈ 7.38 cars per day.", "[1 mark] (i) For doubled demand, average required = 2 × 7.38 ≈ 14.76 ≈ 15 cars per day.", "[1 mark] (ii) The mean 7.38 lies in class 4-8; all 33 days in class 0-4 had fewer than 7.38 cars assembled, so on at least 33 days production was below average."],
    finalAnswer: "(i) ~15 cars/day; (ii) at least 33 days.",
    ncertRef: "APQ PQ1 Q35", isCompetencyBased: true },

  // PQ2 Q32 (Section D, Long, 5 marks)
  { id: "APQ-M-STAT-005", subject: "Maths", topicKey: "statistics", subtopic: "Median and Mode of Grouped Data", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The marks obtained by 80 students of Class X in a mock test of Mathematics are given below:\nMarks 0 and above: 80; 10 and above: 77; 20 and above: 72; 30 and above: 65; 40 and above: 55; 50 and above: 43; 60 and above: 28; 70 and above: 16; 80 and above: 10; 90 and above: 8 (maximum marks 100).\nFind the median and the mode of the data.\nOR\nIf the mean of the following frequency distribution is 91, find the missing frequencies x and y. (Classes 0-30: 12, 30-60: 21, 60-90: x, 90-120: 52, 120-150: y, 150-180: 11; Total = 150.)",
    answer: "Median = 52, Mode = 55. [OR] x = 34, y = 20.",
    solutionSteps: ["Convert 'and above' to class-frequencies: 0-10:3, 10-20:5, 20-30:7, 30-40:10, 40-50:12, 50-60:15, 60-70:12, 70-80:6, 80-90:2, 90-100:8. n = 80 ⟹ n/2 = 40. Cumulative frequencies build up to 37 (at 40-50), then 52 (at 50-60). Median class = 50-60.", "Median = 50 + [(40 − 37)/15] × 10 = 50 + 2 = 52.", "Modal class = 50-60 (highest frequency 15). Mode = 50 + [(15 − 12)/(2·15 − 12 − 12)] × 10 = 50 + 30/6 = 55.", "[OR] Class marks: 15, 45, 75, 105, 135, 165. Σfi·xi = 12·15 + 21·45 + 75x + 52·105 + 135y + 11·165 = 180 + 945 + 75x + 5460 + 135y + 1815 = 8400 + 75x + 135y. Σfi = 96 + x + y = 150 ⟹ x + y = 54.", "Mean = 91: (8400 + 75x + 135y)/150 = 91 ⟹ 75x + 135y = 5250 ⟹ 5x + 9y = 350. Solving with x + y = 54: x = 34, y = 20."],
    finalAnswer: "Median = 52, Mode = 55. [OR] x = 34, y = 20.",
    ncertRef: "APQ PQ2 Q32", isCompetencyBased: true,
    sourceOverride: "others", },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q12 (Section A, MCQ, 1 mark)
  { id: "APQ-M-STAT-006", subject: "Maths", topicKey: "statistics", subtopic: "Mode from Symmetric Grouped Frequency", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "The marks obtained by a set of students in an exam are recorded in a grouped frequency table. The maximum number of students are found to be in the range of (70-80) marks. If the number of students in the ranges before and after the (70-80) range are equal, which of the following is the mode of the data?",
    options: ["70 marks", "75 marks", "80 marks", "(mode cannot be found as frequency is not given)"],
    answer: "75 marks",
    solutionSteps: ["Mode formula: Mode = L + [(f1 − f0)/(2f1 − f0 − f2)] × h. Given f0 = f2 (frequencies before/after equal). So denominator = 2f1 − 2f0 = 2(f1 − f0); numerator = f1 − f0.", "Ratio = (f1 − f0) / [2(f1 − f0)] = 1/2. Mode = 70 + (1/2) × 10 = 75."],
    finalAnswer: "(b) 75 marks",
    ncertRef: "APQ PQ_2022 Q12", isCompetencyBased: true },

  // PQ_2022 Q17 (Section A, MCQ, 1 mark)
  { id: "APQ-M-STAT-007", subject: "Maths", topicKey: "statistics", subtopic: "Median — Finding Missing Frequency", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The heights of plants in Dipti's garden are recorded in the table given below. Classes: 0-20 (2x), 20-40 (4), 40-60 (4x), 60-80 (8), 80-100 (4). Median = 55 cm. Which of the following is the value of x?",
    options: ["1", "2", "8", "(the value of x cannot be found without knowing the total number of plants)"],
    answer: "2",
    solutionSteps: ["[1 mark] N = 2x + 4 + 4x + 8 + 4 = 6x + 16, so N/2 = 3x + 8. Median 55 lies in class 40–60: l = 40, cf = 2x + 4, f = 4x, h = 20. Median = l + ((N/2 − cf)/f) × h gives 55 = 40 + ((3x + 8 − 2x − 4)/4x) × 20, so 15 = 5(x + 4)/x, 15x = 5x + 20, x = 2. Hence option (b)."],
    finalAnswer: "(b) 2",
    ncertRef: "APQ PQ_2022 Q17", isCompetencyBased: true },

  // PQ_2022 Q35 (Section D, Long, 5 marks)
  { id: "APQ-M-STAT-008", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data — Two Groups Comparison", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The pyramid graph shows the ages of 548 Members of Parliament (MPs) in the 17th Lok Sabha. On an average, how much younger is a female MP than a male MP? Round your answer to the nearest whole number.",
    answer: "Female MPs are on average 6 years younger.",
    solutionSteps: ["[3.5 mark] From the pyramid graph, class marks xᵢ = 30, 40, 50, 60, 70, 80, 90 for 25-35 ... 85-95. Female MPs fᵢ = 4, 17, 24, 20, 12, 3, 0 (Σfᵢ = 80), fᵢxᵢ = 120, 680, 1200, 1200, 840, 240, 0 (Σfᵢxᵢ = 4280). Male MPs mᵢ = 7, 42, 114, 143, 125, 27, 10 (Σmᵢ = 468), mᵢxᵢ = 210, 1680, 5700, 8580, 8750, 2160, 900 (Σmᵢxᵢ = 27980).", "[0.5 mark] Mean age of female MPs = 4280/80 = 53.5 years.", "[0.5 mark] Mean age of male MPs = 27980/468 ≈ 59.8 years.", "[0.5 mark] Difference = 59.8 − 53.5 = 6.3 years, which rounds to 6 years; a female MP is on average about 6 years younger than a male MP."],
    finalAnswer: "≈ 6 years.",
    ncertRef: "APQ PQ_2022 Q35", isCompetencyBased: true,
 },
];
