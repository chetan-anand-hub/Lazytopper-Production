import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Statistics — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   content reference 10S1a (Calculate mean, median and mode of grouped data).
 *   Items: Maths10AKP4a, Maths10SR9a, Maths10SR9b, Maths10AD6a, Maths10AD6b,
 *   Maths10ASR12, Maths10PR8b, Maths10AKP2, Maths10AKP3.
 *   (PDF item index mislabels 10S1a items under "Mensuration"; the body content
 *   reference 10S1a confirms these are Statistics — mean/median/mode of grouped data.)
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=1, B=1, C=7.
 * No banned concepts (step-deviation / ogive) appear in the extracted items.
 */
export const STAT_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-STAT-A-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Modal Class / Highest Frequency",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The Indian Council of Medical Research wants to analyse the age group of people affected by a certain disease. The table below shows the age distribution of patients with a certain disease admitted to a hospital.\nAge (in years) : Number of cases\n5–14 : 6\n15–24 : 11\n25–34 : 21\n35–44 : 23\n45–54 : 14\n55–64 : 5\nThe most highly affected age group is:",
    "options": [
      "i. 15–24",
      "ii. 25–34",
      "iii. 35–44",
      "iv. 55–64"
    ],
    "answer": "iii. 35–44",
    "solutionSteps": [
      "[1 mark] The most highly affected age group is the class with the highest frequency. The class 35–44 has the highest frequency (23), so the answer is (iii) 35–44."
    ],
    "finalAnswer": "iii. 35–44",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-STAT-B-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Modal Class of Grouped Data",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The table below gives the heights of 100 students (in cm) of a class.\nHeight : Number of students\n140–145 : 5\n150–155 : 15\n155–160 : 25\n160–165 : 30\n165–170 : 15\n170–175 : 10\nFind the modal class of the given data.",
    "options": [],
    "answer": "Modal class: 160–165",
    "solutionSteps": [
      "[1 mark] The modal class is the class interval with the largest frequency.",
      "[1 mark] The class 160–165 has the largest frequency (30), so the modal class is 160–165."
    ],
    "finalAnswer": "160–165",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-STAT-C-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Median of Grouped Data",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The table below gives the heights of 100 students (in cm) of a class.\nHeight : Number of students\n140–145 : 5\n150–155 : 15\n155–160 : 25\n160–165 : 30\n165–170 : 15\n170–175 : 10\nFind the median height of the students.",
    "options": [],
    "answer": "Median = 160.83 cm",
    "solutionSteps": [
      "[1 mark] Build the cumulative frequency table: 5, 20, 45, 75, 90, 100. N = 100, so N/2 = 50; the median class is 160–165 (cumulative frequency just exceeds 50 there).",
      "[1 mark] Apply the median formula with l = 160, cf = 45 (cumulative frequency before median class), f = 30, h = 5: Median = 160 + ((50 − 45) × 5) / 30.",
      "[1 mark] Median = 160 + 0.83 = 160.83 cm."
    ],
    "finalAnswer": "160.83 cm",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-STAT-C-002",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Mean of Grouped Data (Direct Method)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Rosy, a farmer, grew fifty baby corn by developing the method of organic farming in her field. On harvesting, she measured the lengths of the baby corns (to the nearest mm) and grouped the results as tabulated below.\nLength (in mm) : Number of baby corns\n30–39 : 5\n40–49 : 2\n50–59 : 6\n60–69 : 8\n70–79 : 9\n80–89 : 11\n90–99 : 6\n100–109 : 3\nFind the average length of baby corns using the direct method.",
    "options": [],
    "answer": "72.06 mm",
    "solutionSteps": [
      "[1 mark] Find the class marks xi (34.5, 44.5, 54.5, 64.5, 74.5, 84.5, 94.5, 104.5) and compute xi·fi for each class (172.5, 89, 327, 516, 670.5, 929.5, 576, 313.5).",
      "[1 mark] Apply the direct-method formula: mean (x̄) = Σ(xi·fi) / Σfi = 3603 / 50.",
      "[1 mark] mean = 72.06 mm."
    ],
    "finalAnswer": "72.06 mm",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-STAT-C-003",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Mode of Grouped Data",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Rosy, a farmer, grew fifty baby corn by developing the method of organic farming in her field. On harvesting, she measured the lengths of the baby corns (to the nearest mm) and grouped the results as tabulated below.\nLength (in mm) : Number of baby corns\n30–39 : 5\n40–49 : 2\n50–59 : 6\n60–69 : 8\n70–79 : 9\n80–89 : 11\n90–99 : 6\n100–109 : 3\nFind the modal length of baby corn.",
    "options": [],
    "answer": "82.36 mm",
    "solutionSteps": [
      "[1 mark] Convert to continuous class intervals and identify the modal class (highest frequency 11) as 79.5–89.5, with f0 = 9, f1 = 11, f2 = 6, l = 79.5, h = 10.",
      "[1 mark] Apply the mode formula: z = l + ((f1 − f0) / (2f1 − f0 − f2)) × h = 79.5 + ((11 − 9) / (22 − 9 − 6)) × 10.",
      "[1 mark] z = 79.5 + 2.86 = 82.36 mm."
    ],
    "finalAnswer": "82.36 mm",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-STAT-C-004",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Median of Grouped Data (from Cumulative Frequencies)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The table below shows the ages of persons who visited a museum on a certain day.\nAge (Years) : No. of persons\nLess than 10 : 3\nLess than 20 : 10\nLess than 30 : 22\nLess than 40 : 40\nLess than 50 : 54\nLess than 60 : 71\nFind the median age of the person visiting the museum.",
    "options": [],
    "answer": "Median = 37.5 years",
    "solutionSteps": [
      "[1 mark] Convert the 'less than' data to class frequencies and cumulative frequencies: 0–10 (3, cf 3), 10–20 (7, cf 10), 20–30 (12, cf 22), 30–40 (18, cf 40), 40–50 (14, cf 54), 50–60 (17, cf 71). N = 71, so N/2 = 35.5 → median class 30–40.",
      "[1 mark] Apply the median formula with l = 30, h = 10, f = 18, cf = 22: Median = 30 + ((35.5 − 22) / 18) × 10.",
      "[1 mark] Median = 30 + 7.5 = 37.5 years."
    ],
    "finalAnswer": "37.5 years",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-STAT-B-002",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Median of Grouped Data (from Cumulative Frequencies)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Given below is a table of marks obtained by 85 students in a class in a Mathematics assessment.\nMarks obtained by a student : Number of students\nBelow 10 : 5\nBelow 20 : 9\nBelow 30 : 17\nBelow 40 : 29\nBelow 50 : 45\nBelow 60 : 60\nBelow 70 : 70\nBelow 80 : 78\nBelow 90 : 83\nBelow 100 : 85\nFind the median marks.",
    "options": [],
    "answer": "48.75",
    "solutionSteps": [
      "[1 mark] Using the cumulative frequencies, (N+1)/2 = 86/2 = 43, so the median class is 40–50; here l = 40, cf = 29, f = 16, h = 10.",
      "[1 mark] Median = 40 + ((43 − 29) / 16) × 10 = 40 + 8.75 = 48.75."
    ],
    "finalAnswer": "48.75",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-STAT-C-006",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Mean of Ungrouped Observations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The mean of 25 observations is 48. If the mean of the first 13 observations is 42 and that of the last 13 observations is 53, find the 13th observation.",
    "options": [],
    "answer": "35",
    "solutionSteps": [
      "[1 mark] Mean of 25 observations = 48, so total of all 25 observations = 48 × 25 = 1200.",
      "[1 mark] Sum of first 13 observations = 42 × 13 = 546; sum of last 13 observations = 53 × 13 = 689.",
      "[1 mark] The 13th observation is counted in both groups, so 13th observation = 546 + 689 − 1200 = 35."
    ],
    "finalAnswer": "35",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-STAT-C-007",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Mean of a Frequency Distribution (Missing Frequencies)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The mean of the following distribution is 1.46. Find the values of p and q.\nNo. of Accident : No. of drivers\n0 : 46\n1 : p\n2 : q\n3 : 25\n4 : 10\n5 : 5\nTotal : 200",
    "options": [],
    "answer": "p = 76, q = 38",
    "solutionSteps": [
      "[1 mark] Using Σf = 200: 46 + p + q + 25 + 10 + 5 = 200, so p + q = 114.",
      "[1 mark] Compute Σfx = 0(46) + p + 2q + 75 + 40 + 25 = 368 − p (substituting q = 114 − p). Apply Mean = Σfx / Σf: 1.46 = (368 − p) / 200.",
      "[1 mark] 1.46 × 200 = 292 = 368 − p, so p = 76; then q = 114 − 76 = 38."
    ],
    "finalAnswer": "p = 76, q = 38",
    "isCompetencyBased": false
  }
];
