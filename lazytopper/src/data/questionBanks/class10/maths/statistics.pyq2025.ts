import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "statistics"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const STATISTICS_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-STAT-001", subject: "Maths", topicKey: "statistics", subtopic: "Mode", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "in the following table, if the mean of the given data is 18. Hence find the mode. Daily Allowance Number of Children 11 13 7 13 15 6 15 17 9 17 19 13 19 21 f 21 23 5 23 25 4 3 4 3 4=12",
    answer: "f = 20 modal class is 19 – 21 mode = 19 + 20−13 40−13−5 × 3 = 19.95 approx.",
    solutionSteps: ["Daily Allowance 𝑥𝑖 𝑓𝑖 𝑓𝑖𝑥𝑖 11 – 13 12 7 84 13 – 15 14 6 84 15 – 17 16 9 144 17 – 19 18 13 234 19 – 21 20 f 20f 21 – 23 22 5 110 23 – 25 24 4 96 Total 44 + f 752 + 20f Correct table Mean = 752+20f 44+f", "18 = 752+20f 44+f", "f = 20 modal class is 19 – 21 mode = 19 + 20−13 40−13−5 × 3 = 19.95 approx."],
    finalAnswer: "f = 20 modal class is 19 – 21 mode = 19 + 20−13 40−13−5 × 3 = 19.95 approx.",
    ncertRef: "PYQ 30/1/1 Q35", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-M-2025-STAT-002", subject: "Maths", topicKey: "statistics", subtopic: "Mode", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The following frequency distribution gives the monthly consumption of electricity of 68 consumers of a locality. Find the mean and mode of the data : Monthly Consumption (in units) Number of Consumers 65 85 4 85 105 5 105 125 13 125 145 20 145 165 14 165 185 8 185 205",
    answer: "Mean = 137.06 units and Mode = 135.77 units 1",
    solutionSteps: ["Monthly Consumption (in units) 𝑓𝑖 𝑥𝑖 𝑢𝑖= 𝑥𝑖−135 ℎ 𝑓𝑖𝑢𝑖 6585 4 75 3 12 85105 5 95 2 10 105125 13 115 1 13 125145 20 135=a 0 0 145165 14 155 1 14 165185 8 175 2 16 185205 4 195 3 12 Total 68 7 Correct Table 1½  14 Mean = 135 + 7 68 × 20 = 137.06 Modal Class is 125145 Mode = 125 + ( 20 −13 40−13−14) × 20 = 135.77", "Hence", "Mean = 137.06 units and Mode = 135.77 units 1"],
    finalAnswer: "Mean = 137.06 units and Mode = 135.77 units 1",
    ncertRef: "PYQ 30/1/2 Q33", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "2" },
  { id: "PYQ-M-2025-STAT-003", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The lengths of 40 leaves of a plant are measured correct to the nearest millimetre, and the data obtained is represented in the following table : Length (in mm) Number of Leaves 118 126 3 127 135 5 136 144 9 145 153 12 154 162 5 163 171 4 172 180 2 Find the median length of the leaves.",
    answer: "Hence, median length is 146.75 mm",
    solutionSteps: ["Length (mm) 𝑓𝑖 cf 117.5 – 126.5 3 3 126.5 – 135.5 5 8 135.5 – 144.5 9 17 144.5 – 153.5 12 29 153.5 – 162.5 5 34 162.5 – 171.5 4 38 171.5 – 180.5 2 40 Correct Table Median class = 144.5 – 153.5 Median = 144.5 + 20−17 12 × 9 = 146.75", "Hence, median length is 146.75 mm"],
    finalAnswer: "Hence, median length is 146.75 mm",
    ncertRef: "PYQ 30/1/3 Q34", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "3" },
  { id: "PYQ-M-2025-STAT-004", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the mean and median for the following data : Classes Frequency 5 15 2 15 25 3 25 35 5 35 45 7 45 55 4 55 65 2 65 75",
    answer: "Classes frequency (fi) xi fi xi cf 5 – 15 15 – 25 25 – 35 35 – 45 45 – 55 55 – 65 65 – 75 2 3 5 7 4 2 2 10 20 30 40 50 60 70 20 60 150 280 200 120 140 2 5 10 17 21 23 25 Total 25 970 Correct table Mean = 970 25 = 38.8 Median class is 35 – 45 Median = 35 + ( 25 2 −10 7 ) ×10 = 270 7 or 38.57 approx.",
    solutionSteps: ["Classes frequency (fi) xi fi xi cf 5 – 15 15 – 25 25 – 35 35 – 45 45 – 55 55 – 65 65 – 75 2 3 5 7 4 2 2 10 20 30 40 50 60 70 20 60 150 280 200 120 140 2 5 10 17 21 23 25 Total 25 970 Correct table Mean = 970 25 = 38.8 Median class is 35 – 45 Median = 35 + ( 25 2 −10 7 ) ×10 = 270 7 or 38.57 approx."],
    finalAnswer: "Classes frequency (fi) xi fi xi cf 5 – 15 15 – 25 25 – 35 35 – 45 45 – 55 55 – 65 65 – 75 2 3 5 7 4 2 2 10 20 30 40 50 60 70 20 60 150 280 200 120 140 2 5 10 17 21 23 25 Total 25 970 Correct table Mean = 970 25 = 38.8 Median class is 35 – 45 Median = 35 + ( 25 2 −10 7 ) ×10 = 270 7 or 38.57 approx.",
    ncertRef: "PYQ 30/2/2 Q34", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "2" },
  { id: "PYQ-M-2025-STAT-005", subject: "Maths", topicKey: "statistics", subtopic: "Mode", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the Mean and Mode of the following data : Class Frequency 4 8 2 8 12 12 12 16 15 16 20 25 20 24 18 24 28 12 28 32 13 32 36",
    answer: "Class frequency (fi) xi ui = 𝑥𝑖−22 4 fi ui 4 – 8 8 – 12 12 – 16 16 – 20 20 – 24 24 – 28 28 – 32 32 – 36 2 12 15 25 18 12 13 3 6 10 14 18 22 = a 26 30 34 – 4 – 3 – 2 – 1 0 1 2 3 – 8 – 36 – 30 – 25 0 12 26 9 Total 100 – 52 Correct table Mean = 22 + (− 52) 100 × 4 = 19.92 Modal Class is 16 – 20 Mode = 16 + ( 25−15 2×25−15−18) × 4 = 312 17 or 18.35 approx.",
    solutionSteps: ["Class frequency (fi) xi ui = 𝑥𝑖−22 4 fi ui 4 – 8 8 – 12 12 – 16 16 – 20 20 – 24 24 – 28 28 – 32 32 – 36 2 12 15 25 18 12 13 3 6 10 14 18 22 = a 26 30 34 – 4 – 3 – 2 – 1 0 1 2 3 – 8 – 36 – 30 – 25 0 12 26 9 Total 100 – 52 Correct table Mean = 22 + (− 52) 100 × 4 = 19.92 Modal Class is 16 – 20 Mode = 16 + ( 25−15 2×25−15−18) × 4 = 312 17 or 18.35 approx."],
    finalAnswer: "Class frequency (fi) xi ui = 𝑥𝑖−22 4 fi ui 4 – 8 8 – 12 12 – 16 16 – 20 20 – 24 24 – 28 28 – 32 32 – 36 2 12 15 25 18 12 13 3 6 10 14 18 22 = a 26 30 34 – 4 – 3 – 2 – 1 0 1 2 3 – 8 – 36 – 30 – 25 0 12 26 9 Total 100 – 52 Correct table Mean = 22 + (− 52) 100 × 4 = 19.92 Modal Class is 16 – 20 Mode = 16 + ( 25−15 2×25−15−18) × 4 = 312 17 or 18.35 approx.",
    ncertRef: "PYQ 30/2/3 Q34", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "3" },
  { id: "PYQ-M-2025-STAT-006", subject: "Maths", topicKey: "statistics", subtopic: "Median", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The India Meteorological Department observes seasonal and annual rainfall every year in different subdivisions of our country. It helps them to compare and analyse the results. The table below shows subdivisions wise seasonal (monsoon) rainfall (in mm) in 2023. Rainfall (mm) No. of Subdivisions 200 400 3 400 600 4 600 800 7 800 1000 4 1000 1200 3 1200 1400 3 Based on the information given above, answer the following questions : (i) Write the modal class. 1 (ii) (a) Find the median of the given data. 2 OR (b) Find the mean rainfall in the season. 2 (iii) If a subdivision having at least 800 mm rainfall during monsoon season is considered a good rainfall subdivision, then how many subdivisions had good rainfall ?",
    answer: "(i) Modal Class = 600 −800 (ii)(a) Rainfall (mm) No. of Subdivisions (𝒇𝒊) 𝒄𝒇 200−400 3 3 400−600 4 7 600−800 7 14 800−1000 4 18 1000−1200 3 21 1200−1400 3 24 N = 24 Median Class = 600 −800 Median = 600 + 12 −7 7 × 200 = 5200 7 or 742.8 mm (𝑎𝑝𝑝𝑟𝑜𝑥. ) 𝟏 Correct table ½ mark ½ ½ ½  22 OR (ii)(b) Rainfall (mm) No. of Sub divisions (𝒇𝒊) 𝒙𝒊 𝒇𝒊 𝒙𝒊 200−400 3 300 900 400−600 4 500 2000 600−800 7 700 4900 800−1000 4 900 3600 1000−1200 3 1100 3300 1200−1400 3 1300 3900 ∑𝒇𝒊= 𝟐𝟒 ∑𝒇𝒊 𝒙𝒊= 𝟏𝟖𝟔𝟎𝟎 Mean = 18600 24 = 775 ∴Mean rainfall = 775 mm (iii) Required number of sub −divisions = 4 + 3 + 3 = 10 Correct table 1 Mark 𝟏",
    solutionSteps: ["(i) Modal Class = 600 −800 (ii)(a) Rainfall (mm) No. of Subdivisions (𝒇𝒊) 𝒄𝒇 200−400 3 3 400−600 4 7 600−800 7 14 800−1000 4 18 1000−1200 3 21 1200−1400 3 24 N = 24 Median Class = 600 −800 Median = 600 + 12 −7 7 × 200 = 5200 7 or 742.8 mm (𝑎𝑝𝑝𝑟𝑜𝑥. ) 𝟏 Correct table ½ mark ½ ½ ½  22 OR (ii)(b) Rainfall (mm) No. of Sub divisions (𝒇𝒊) 𝒙𝒊 𝒇𝒊 𝒙𝒊 200−400 3 300 900 400−600 4 500 2000 600−800 7 700 4900 800−1000 4 900 3600 1000−1200 3 1100 3300 1200−1400 3 1300 3900 ∑𝒇𝒊= 𝟐𝟒 ∑𝒇𝒊 𝒙𝒊= 𝟏𝟖𝟔𝟎𝟎 Mean = 18600 24 = 775 ∴Mean rainfall = 775 mm (iii) Required number of sub −divisions = 4 + 3 + 3 = 10 Correct table 1 Mark 𝟏"],
    finalAnswer: "(i) Modal Class = 600 −800 (ii)(a) Rainfall (mm) No. of Subdivisions (𝒇𝒊) 𝒄𝒇 200−400 3 3 400−600 4 7 600−800 7 14 800−1000 4 18 1000−1200 3 21 1200−1400 3 24 N = 24 Median Class = 600 −800 Median = 600 + 12 −7 7 × 200 = 5200 7 or 742.8 mm (𝑎𝑝𝑝𝑟𝑜𝑥. ) 𝟏 Correct table ½ mark ½ ½ ½  22 OR (ii)(b) Rainfall (mm) No. of Sub divisions (𝒇𝒊) 𝒙𝒊 𝒇𝒊 𝒙𝒊 200−400 3 300 900 400−600 4 500 2000 600−800 7 700 4900 800−1000 4 900 3600 1000−1200 3 1100 3300 1200−1400 3 1300 3900 ∑𝒇𝒊= 𝟐𝟒 ∑𝒇𝒊 𝒙𝒊= 𝟏𝟖𝟔𝟎𝟎 Mean = 18600 24 = 775 ∴Mean rainfall = 775 mm (iii) Required number of sub −divisions = 4 + 3 + 3 = 10 Correct table 1 Mark 𝟏",
    ncertRef: "PYQ 30/3/1 Q38", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
];
