import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "statistics"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const STATISTICS_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-STAT-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Calculate the mean of the following data : Class : 4 – 6 7 – 9 10 – 12 13 – 15 Frequency : 5 4 9 10",
    answer: "Class 4 – 6 7 – 9 10 – 12 13 – 15 Total fi 5 4 9 10 28 xi 5 8 11 14 fixi 25 32 99 140 296 Correct table Mean = 296 28 = 74 7 or 10.57 approx.",
    solutionSteps: ["Class 4 – 6 7 – 9 10 – 12 13 – 15 Total fi 5 4 9 10 28 xi 5 8 11 14 fixi 25 32 99 140 296 Correct table Mean = 296 28 = 74 7 or 10.57 approx."],
    finalAnswer: "Class 4 – 6 7 – 9 10 – 12 13 – 15 Total fi 5 4 9 10 28 xi 5 8 11 14 fixi 25 32 99 140 296 Correct table Mean = 296 28 = 74 7 or 10.57 approx.",
    ncertRef: "PYQ 30(B) Q31", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Mode", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The following table shows the ages of the patients admitted in a hospital during a year : Age (in years) 5 – 15 15 – 25 25 – 35 35 – 45 45 – 55 55 – 65 Number of patients 6 11 21 23 14 5 Find the mode and mean of the data given above.",
    answer: "Therefore, mode and mean of given data are 36.81 years and 35.375 years respectively.",
    solutionSteps: ["[1 mark] Prepare the table with mid-points xᵢ = 10, 20, 30, 40, 50, 60 and fᵢxᵢ = 60, 220, 630, 920, 700, 300; Σfᵢ = 80, Σfᵢxᵢ = 2830.", "[1 mark] Mean = Σfᵢxᵢ / Σfᵢ = 2830 / 80 = 35.375 years.", "[1 mark] Modal class = 35 – 45 (highest frequency 23); here l = 35, f₁ = 23, f₀ = 21, f₂ = 14, h = 10.", "[1 mark] Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h = 35 + ((23 − 21)/(46 − 21 − 14)) × 10 = 35 + (2/11) × 10.", "[1 mark] Mode = 35 + 1.82 = 36.82 years. Hence mean = 35.375 years and mode ≈ 36.82 years."],
    finalAnswer: "Therefore, mode and mean of given data are 36.81 years and 35.375 years respectively.",
    ncertRef: "PYQ 30/4/2 Q33", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "2" },
  { id: "PYQ-M-2024-STAT-003", subject: "Maths", topicKey: "statistics", subtopic: "Mean", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The following distribution shows the daily pocket allowance of children of a locality. The mean daily pocket allowance is < 36.10. Find the missing frequency, f. Daily pocket allowance (in <) 20 – 25 25 – 30 30 – 35 35 – 40 40 – 45 45 – 50 50 – 55 Number of children 7 6 9 13 f 5",
    answer: "Daily pocket allowance (in ₹) Number of children (𝑓𝑖) 𝑥𝑖 𝑥𝑖𝑓𝑖 20 – 25",
    solutionSteps: ["[1 mark] Table of mid-points xᵢ = 22.5, 27.5, 32.5, 37.5, 42.5, 47.5, 52.5 for classes 20–25 … 50–55; frequencies 7, 6, 9, 13, f, 5, 4 ⟹ Σfᵢ = 44 + f.", "[1 mark] Σfᵢxᵢ = 157.5 + 165 + 292.5 + 487.5 + 42.5f + 237.5 + 210 = 1550 + 42.5f.", "[1 mark] Mean formula: 36.10 = (1550 + 42.5f)/(44 + f).", "[1 mark] 36.10(44 + f) = 1550 + 42.5f ⟹ 1588.4 + 36.10f = 1550 + 42.5f ⟹ 6.4f = 38.4.", "[1 mark] f = 38.4 / 6.4 = 6. The missing frequency f = 6."],
    finalAnswer: "Missing frequency f = 6.",
    ncertRef: "PYQ 30/4/3 Q32", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "3" },
  { id: "PYQ-M-2024-STAT-004", subject: "Maths", topicKey: "statistics", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Vocational training complements traditional education by providing practical skills and handson experience. While education equips individuals with abroad knowledgebase,vocational trainingfocuseson jobspecificskills,enhancingemployabilitythusmakingthestudentself reliant. Keepingthisinview,a teachermade thefollowing tablegiving the frequency distribution of students/adults undergoing vocational trainingfromthetraininginstitute. ( ) 1519 2024 2529 3034 3539 4044 4549 5054 62 132 96 37 13 11 10 4 (i) ? 1 (ii) (a) 2 (b) 50 2 (iii) ,",
    answer: "(i) Modal class is 19.5 – 24.5 Lowe limit =19.5 1   (ii) (a) Age (in years) 14.5 19.5 19.5 24.5 24.5",
    solutionSteps: ["[1 mark] (i) Converting to continuous classes, the modal class (highest frequency 132) is 19.5 – 24.5; its lower limit = 19.5.", "[1 mark] (ii) For the modal class 19.5 – 24.5: l = 19.5, f₁ = 132, f₀ = 62, f₂ = 96, h = 5.", "[1 mark] (ii) Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h = 19.5 + ((132 − 62)/(264 − 62 − 96)) × 5 = 19.5 + (70/106) × 5.", "[1 mark] (ii) Mode = 19.5 + 3.30 = 22.80 (approx)."],
    finalAnswer: "Modal class = 19.5 – 24.5 (lower limit 19.5); Mode ≈ 22.80.",
    ncertRef: "PYQ 30/3/1 Q37", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-STAT-005", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Activities like running or cycling reduce stress and the risk of mental disorders like depression. Running helps build endurance. Children develop stronger bones and muscles and are less prone to gain weight. The physical education teacher of a school has decided to conduct an inter school running tournament in his school premises. The time taken by a group of students to run 100 m, was noted as follows : Time (in seconds) 0 – 20 20 – 40 40 – 60 60 – 80 80 – 100 Number of students 8 10 13 6 3 Based on the above, answer the following questions : (i) What is the median class of the above given data ? 1 (ii) (a) Find the mean time taken by the students to finish the race. 2 OR (b) Find the mode of the above given data. 2 (iii) How many students took time less than 60 seconds ?",
    answer: "(i) Correct Cummulative Frequency Median class = 40 – 60 (ii) (a) Correct table for xi and fixi Mean = 1720 40 = 43 OR (b) Modal class = 4060 Mode = 40 + (13−10) (26−10−6) × 20 = 46 (iii) 31 students took time less than 60 seconds ½ ½ 1½ ½ ½ 1 ½ 1 * * *",
    solutionSteps: ["[1 mark] (i) Cumulative frequencies are 8, 18, 31, 37, 40; N = 40, N/2 = 20, so the median class = 40 – 60.", "[1 mark] (ii)(a) Mid-points xᵢ = 10, 30, 50, 70, 90; Σfᵢxᵢ = 1720, Σfᵢ = 40 ⟹ Mean = 1720/40 = 43 seconds. [OR (b) modal class = 40 – 60.]", "[1 mark] (ii)(b) Mode = 40 + ((13 − 10)/(2×13 − 10 − 6)) × 20 = 40 + (3/10) × 20 = 46 seconds.", "[1 mark] (iii) Students taking less than 60 seconds = 8 + 10 + 13 = 31 students."],
    finalAnswer: "(i) Median class 40 – 60; (ii) Mean = 43 s OR Mode = 46 s; (iii) 31 students.",
    ncertRef: "PYQ 30/5/1 Q38", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
