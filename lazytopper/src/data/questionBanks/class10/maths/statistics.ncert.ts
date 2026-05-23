import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 14: Statistics
// topicKey: "statistics"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Ogive / Graph–Ogive excluded per syllabusGuard)
// Coverage: Sections 14.2 (Mean — three methods), 14.3 (Mode), 14.4 (Median),
//           Examples 1–8, Ex 14.1 (mean), 14.2 (mode), 14.3 (median).
//           NO ogive construction/reading items.

export const STAT_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "STAT-N-NCERT-13-MCQ-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "In the formula x̄ = a + (Σfᵢdᵢ / Σfᵢ) for the mean of grouped data, the dᵢ’s are deviations from a of the",
    options: ["lower limits of the classes", "upper limits of the classes", "mid-points (class marks) of the classes", "frequencies of the class marks"],
    answer: "mid-points (class marks) of the classes",
    solutionSteps: ["In the assumed-mean method we set dᵢ = xᵢ − a where xᵢ is the class mark of the iᵗʰ class.", "Hence dᵢ is the deviation from a of the class mid-point."],
    finalAnswer: "Class mid-points — option (c).",
    ncertRef: "NCERT Section 14.2 (assumed mean)", isCompetencyBased: false },

  { id: "STAT-N-NCERT-13-MCQ-002", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "While computing the mean of grouped data, we assume that the frequencies are",
    options: ["evenly distributed over all the classes", "centred at the class marks of the classes", "centred at the upper limits of the classes", "centred at the lower limits of the classes"],
    answer: "centred at the class marks of the classes",
    solutionSteps: ["The standard assumption in the direct method (and its variants) is that each class's frequency is concentrated at its mid-point (class mark)."],
    finalAnswer: "Centred at class marks — option (b).",
    ncertRef: "NCERT Section 14.2 (direct method)", isCompetencyBased: false },

  { id: "STAT-N-NCERT-13-MCQ-003", subject: "Maths", topicKey: "statistics", subtopic: "Median of Grouped Data", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "For grouped data, the class whose cumulative frequency is greater than (and nearest to) n/2 is called the",
    options: ["mean class", "median class", "modal class", "cumulative class"],
    answer: "median class",
    solutionSteps: ["In the median formula for grouped data, the class containing the (n/2)ᵗʰ observation is the median class."],
    finalAnswer: "Median class — option (b).",
    ncertRef: "NCERT Section 14.4", isCompetencyBased: false },

  { id: "STAT-N-NCERT-13-MCQ-004", subject: "Maths", topicKey: "statistics", subtopic: "Mode of Grouped Data", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The modal class of a grouped frequency distribution is",
    options: ["the class with the highest cumulative frequency", "the class with the highest frequency", "the class containing the mean", "the class containing the median"],
    answer: "the class with the highest frequency",
    solutionSteps: ["By definition, the modal class is the class with the maximum frequency.", "The mode is then found by applying the formula inside that class."],
    finalAnswer: "Class with highest frequency — option (b).",
    ncertRef: "NCERT Section 14.3", isCompetencyBased: false },

  { id: "STAT-N-NCERT-13-MCQ-005", subject: "Maths", topicKey: "statistics", subtopic: "Empirical Relationship", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the mean of a distribution is 62 and the mode is 52, then the median (by the empirical relationship) is approximately",
    options: ["57", "58.67", "60", "62"],
    answer: "58.67",
    solutionSteps: ["Empirical: 3·Median = Mode + 2·Mean = 52 + 2 × 62 = 52 + 124 = 176.", "Median = 176/3 ≈ 58.67."],
    finalAnswer: "≈ 58.67 — option (b).",
    ncertRef: "NCERT Section 14.4 (empirical remark)", isCompetencyBased: true,
    strategyHint: "Use 3·Median = Mode + 2·Mean." },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "STAT-N-NCERT-13-AR-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The choice of assumed mean 'a' in the assumed-mean method does not change the final value of the mean.\nReason (R): The assumed-mean and step-deviation methods are algebraic re-arrangements of the direct method and therefore yield the same mean.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Activity 1 in NCERT (page 265) confirms A.", "R is the standard NCERT remark — true.", "R is the reason A holds."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Section 14.2 / Activity 1", isCompetencyBased: true },

  { id: "STAT-N-NCERT-13-AR-002", subject: "Maths", topicKey: "statistics", subtopic: "Median of Grouped Data", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The median formula for grouped data is l + ((n/2 − cf)/f) × h.\nReason (R): cf in this formula is the cumulative frequency of the median class itself.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(C) Assertion is true but Reason is false.",
    solutionSteps: ["A is the standard NCERT formula — true.", "R is FALSE: cf is the cumulative frequency of the class PRECEDING the median class, not the median class itself."],
    finalAnswer: "Option (C).",
    ncertRef: "NCERT Section 14.4", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "STAT-N-NCERT-13-VSA-001", subject: "Maths", topicKey: "statistics", subtopic: "Class Mark", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the class mark of the class interval 10 – 25.",
    solutionSteps: ["Class mark = (Lower limit + Upper limit) / 2.", "= (10 + 25)/2 = 35/2 = 17.5."],
    finalAnswer: "Class mark = 17.5.",
    ncertRef: "NCERT Section 14.2 (Table 14.3)", isCompetencyBased: false },

  { id: "STAT-N-NCERT-13-VSA-002", subject: "Maths", topicKey: "statistics", subtopic: "Cumulative Frequency", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Frequencies of five classes are 5, 3, 4, 3 and 3. Form the cumulative frequency (less-than type) values for these five classes.",
    solutionSteps: ["Add running totals: 5, 5 + 3 = 8, 8 + 4 = 12, 12 + 3 = 15, 15 + 3 = 18.", "Cumulative frequencies: 5, 8, 12, 15, 18."],
    finalAnswer: "Cumulative frequencies: 5, 8, 12, 15, 18.",
    ncertRef: "NCERT Section 14.4 (Table 14.13)", isCompetencyBased: false },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "STAT-N-NCERT-13-SA-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the mean of the following frequency distribution: Class 0-2 has 1, 2-4 has 2, 4-6 has 1, 6-8 has 5, 8-10 has 6, 10-12 has 2, 12-14 has 3.",
    solutionSteps: ["Class marks: 1, 3, 5, 7, 9, 11, 13. Frequencies: 1, 2, 1, 5, 6, 2, 3. Σf = 20.", "Σfᵢxᵢ = 1×1 + 2×3 + 1×5 + 5×7 + 6×9 + 2×11 + 3×13 = 1 + 6 + 5 + 35 + 54 + 22 + 39 = 162.", "Mean = 162/20 = 8.1."],
    finalAnswer: "Mean = 8.1 plants per house.",
    ncertRef: "NCERT Ex 14.1 Q1", isCompetencyBased: true,
    strategyHint: "Direct method since class marks are small." },

  { id: "STAT-N-NCERT-13-SA-002", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the mean daily wage from: Daily wages (₹) 500-520 has 12 workers, 520-540 has 14, 540-560 has 8, 560-580 has 6, 580-600 has 10. (Use step-deviation, a = 550, h = 20.)",
    solutionSteps: ["Class marks: 510, 530, 550, 570, 590. uᵢ = (xᵢ − 550)/20 = −2, −1, 0, 1, 2.", "Σfᵢ = 50. Σfᵢuᵢ = 12×(−2) + 14×(−1) + 8×0 + 6×1 + 10×2 = −24 − 14 + 0 + 6 + 20 = −12.", "Mean = a + h × (Σfu/Σf) = 550 + 20 × (−12/50) = 550 − 4.8 = ₹545.20."],
    finalAnswer: "Mean daily wage = ₹545.20.",
    ncertRef: "NCERT Ex 14.1 Q2", isCompetencyBased: true },

  { id: "STAT-N-NCERT-13-SA-003", subject: "Maths", topicKey: "statistics", subtopic: "Mode of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the mode of: Family size 1-3 has 7 families, 3-5 has 8, 5-7 has 2, 7-9 has 2, 9-11 has 1.",
    solutionSteps: ["Max frequency is 8 ⇒ modal class is 3-5. l = 3, h = 2, f₁ = 8, f₀ = 7, f₂ = 2.", "Mode = l + [(f₁ − f₀)/(2f₁ − f₀ − f₂)] × h = 3 + [(8 − 7)/(16 − 7 − 2)] × 2 = 3 + (1/7) × 2 = 3 + 2/7.", "Mode ≈ 3 + 0.286 = 3.286."],
    finalAnswer: "Mode ≈ 3.286.",
    ncertRef: "NCERT Example 5 (page 273)", isCompetencyBased: true },

  { id: "STAT-N-NCERT-13-SA-004", subject: "Maths", topicKey: "statistics", subtopic: "Mode of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the mode of: Lifetime (hours) 0-20 has 10, 20-40 has 35, 40-60 has 52, 60-80 has 61, 80-100 has 38, 100-120 has 29.",
    solutionSteps: ["Modal class is 60-80 (max freq = 61). l = 60, h = 20, f₁ = 61, f₀ = 52, f₂ = 38.", "Mode = 60 + [(61 − 52)/(122 − 52 − 38)] × 20 = 60 + (9/32) × 20 = 60 + 180/32.", "= 60 + 5.625 ≈ 65.625 hours."],
    finalAnswer: "Modal lifetime ≈ 65.625 hours.",
    ncertRef: "NCERT Ex 14.2 Q2", isCompetencyBased: true },

  { id: "STAT-N-NCERT-13-SA-005", subject: "Maths", topicKey: "statistics", subtopic: "Median of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the median height of 51 girls from: <140 → 4, <145 → 11, <150 → 29, <155 → 40, <160 → 46, <165 → 51.",
    solutionSteps: ["Convert to frequencies: classes below 140 → 4, 140-145 → 7, 145-150 → 18, 150-155 → 11, 155-160 → 6, 160-165 → 5. n = 51, n/2 = 25.5.", "Median class is 145-150 (cf 29 first crosses 25.5). l = 145, cf = 11, f = 18, h = 5.", "Median = 145 + [(25.5 − 11)/18] × 5 = 145 + (14.5 × 5)/18 = 145 + 72.5/18 ≈ 145 + 4.03 = 149.03 cm."],
    finalAnswer: "Median height = 149.03 cm.",
    ncertRef: "NCERT Example 7 (page 283)", isCompetencyBased: true,
    strategyHint: "Convert 'less-than' table to class frequencies before applying the median formula." },

  { id: "STAT-N-NCERT-13-SA-006", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The mean of the following distribution is ₹18. Find the missing frequency f. Daily pocket allowance (₹) 11-13 → 7, 13-15 → 6, 15-17 → 9, 17-19 → 13, 19-21 → f, 21-23 → 5, 23-25 → 4.",
    solutionSteps: ["Class marks: 12, 14, 16, 18, 20, 22, 24. Σfᵢxᵢ = 7×12 + 6×14 + 9×16 + 13×18 + 20f + 5×22 + 4×24 = 84 + 84 + 144 + 234 + 20f + 110 + 96 = 752 + 20f.", "Σfᵢ = 7 + 6 + 9 + 13 + f + 5 + 4 = 44 + f.", "Mean = (752 + 20f)/(44 + f) = 18 ⇒ 752 + 20f = 18(44 + f) = 792 + 18f.", "2f = 40 ⇒ f = 20."],
    finalAnswer: "Missing frequency f = 20.",
    ncertRef: "NCERT Ex 14.1 Q3", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "STAT-N-NCERT-13-LA-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean Mode Median Comparison", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "For monthly electricity consumption (in units): 65-85 → 4, 85-105 → 5, 105-125 → 13, 125-145 → 20, 145-165 → 14, 165-185 → 8, 185-205 → 4. Find the median, mean and mode of the data and compare them.",
    solutionSteps: ["n = 68, n/2 = 34. Cumulative frequencies: 4, 9, 22, 42, 56, 64, 68. Median class 125-145 (cf 42 first ≥ 34). l = 125, cf = 22, f = 20, h = 20. Median = 125 + ((34 − 22)/20) × 20 = 125 + 12 = 137.", "Mean by direct method: class marks 75, 95, 115, 135, 155, 175, 195. Σfx = 4×75 + 5×95 + 13×115 + 20×135 + 14×155 + 8×175 + 4×195 = 300 + 475 + 1495 + 2700 + 2170 + 1400 + 780 = 9320. Mean = 9320/68 ≈ 137.06.", "Mode: max freq 20 ⇒ modal class 125-145. l = 125, f₁ = 20, f₀ = 13, f₂ = 14, h = 20. Mode = 125 + ((20 − 13)/(40 − 13 − 14)) × 20 = 125 + (7/13) × 20 ≈ 125 + 10.77 ≈ 135.77.", "Mean (137.06) ≈ Median (137) > Mode (135.77). The three measures are close, indicating a roughly symmetric distribution centred near 136."],
    finalAnswer: "Mean ≈ 137.06, Median = 137, Mode ≈ 135.77 — distribution near-symmetric.",
    ncertRef: "NCERT Ex 14.3 Q1", isCompetencyBased: true,
    strategyHint: "Compute all three and compare; near-equality suggests symmetry." },

  { id: "STAT-N-NCERT-13-LA-002", subject: "Maths", topicKey: "statistics", subtopic: "Median of Grouped Data", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The median of the following data is 525 and the total frequency is 100. Find x and y. 0-100 → 2, 100-200 → 5, 200-300 → x, 300-400 → 12, 400-500 → 17, 500-600 → 20, 600-700 → y, 700-800 → 9, 800-900 → 7, 900-1000 → 4.",
    solutionSteps: ["Sum of given frequencies + x + y = 76 + x + y = 100 ⇒ x + y = 24 …(i).", "Median = 525 lies in 500-600 (l = 500, f = 20, cf preceding = 36 + x, h = 100, n/2 = 50).", "525 = 500 + [(50 − (36 + x))/20] × 100 ⇒ 25 = (14 − x) × 5 ⇒ 14 − x = 5 ⇒ x = 9.", "From (i): y = 24 − 9 = 15."],
    finalAnswer: "x = 9, y = 15.",
    ncertRef: "NCERT Example 8 (page 285)", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "STAT-N-NCERT-13-CB-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A school's environment club surveys SO₂ concentration (in ppm) for 30 localities. Concentration of SO₂: 0.00-0.04 → 4, 0.04-0.08 → 9, 0.08-0.12 → 9, 0.12-0.16 → 2, 0.16-0.20 → 4, 0.20-0.24 → 2.\n(i) Find the class mark of the class 0.04-0.08.\n(ii) Find Σfᵢ and Σfᵢxᵢ.\n(iii) Find the mean SO₂ concentration.\n(iv) Which method did you use and why?",
    solutionSteps: ["(i) Class mark = (0.04 + 0.08)/2 = 0.06.", "(ii) Class marks: 0.02, 0.06, 0.10, 0.14, 0.18, 0.22. Σfᵢ = 30. Σfᵢxᵢ = 4×0.02 + 9×0.06 + 9×0.10 + 2×0.14 + 4×0.18 + 2×0.22 = 0.08 + 0.54 + 0.90 + 0.28 + 0.72 + 0.44 = 2.96.", "(iii) Mean = 2.96/30 ≈ 0.099 ppm.", "(iv) Direct method — class marks are small, multiplication is easy and exact."],
    finalAnswer: "(i) 0.06; (ii) Σf = 30, Σfx = 2.96; (iii) Mean ≈ 0.099 ppm; (iv) Direct method.",
    ncertRef: "NCERT Ex 14.1 Q7", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "STAT-N-NCERT-13-CRE-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a grouped frequency distribution of 30 observations in five equal classes of width 10 starting at 0, such that the mean is exactly 25. Specify the frequencies and verify.",
    solutionSteps: ["Classes 0-10, 10-20, 20-30, 30-40, 40-50; class marks 5, 15, 25, 35, 45.", "Let frequencies be f₁, f₂, f₃, f₄, f₅ with Σf = 30 and Σfx = 25 × 30 = 750.", "Try f₁ = 3, f₂ = 6, f₃ = 12, f₄ = 6, f₅ = 3 (symmetric around mark 25). Σf = 30. ✓", "Σfx = 3×5 + 6×15 + 12×25 + 6×35 + 3×45 = 15 + 90 + 300 + 210 + 135 = 750. Mean = 750/30 = 25. ✓"],
    finalAnswer: "Frequencies 3, 6, 12, 6, 3 give mean 25 exactly.",
    ncertRef: "NCERT-style design task", isCompetencyBased: true,
    strategyHint: "A symmetric design around the target class mark naturally gives the target mean." },
];
