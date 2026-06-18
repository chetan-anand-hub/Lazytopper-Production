import type { CanonicalQuestion } from '../../../predictionTypes';

// =============================================================================
// Source: NCERT Class 10 Mathematics Exemplar — Chapter 13 (Statistics & Probability)
// PDF file used: jeep213.pdf (Statistics items only) · Answer key vs jeep2an.pdf
// topicKey: "statistics"
// Extraction date: 2026-06-18 · Bank-Expansion Phase 1, Batch 1.
//
// PROVENANCE / THE DECOUPLE:
//   • QUESTION text = AUTHENTIC, verbatim from the Exemplar PDF (pymupdf sort=True
//     + ftfy). Distribution tables transcribed exactly; any reconstructed math is
//     marked `// ⚠ RECON` for the owner's fidelity spot-check.
//   • SOLUTION = AI-GENERATED, step-marked, PENDING OWNER VERIFICATION.
//     solutionSource: "ai-generated" for EVERY id (all ids registered in
//     AI_GENERATED_SOLUTION_IDS in canonicalQuestionBank.ts). Each finalAnswer was
//     cross-checked against the official Exemplar answer key — but the WORKED STEPS
//     are AI and the owner (examiner-of-record) must verify them before merge.
//
// SYLLABUS (CBSE 2026-27): Ogive / cumulative-frequency GRAPH is BANNED — Ex 13.1
//   Q5 (abscissa of intersection of less-than/more-than ogives) is EXCLUDED.
//   Cumulative-frequency TABLES are in-syllabus and retained. Step-deviation is IN.
// SCOPE: Probability items (Ex 13.1 Q12–26, Ex 13.2 Q5–14, Ex 13.3 Q19–42) belong
//   to a separate topicKey ("probability") and are NOT in this Statistics batch.
// Net-new only: deduped vs repo (existing refs Ex13.1 Q3,4,6,8,11; Ex13.2 Q2,3,4;
//   Ex13.3 Q1,2,3,15,16,18 are NOT repeated).
// NOTE: Statistics LA Exercise 13.4 (answer key shows 51.75, 48.41, 31 yrs, ...)
//   is NOT in jeep213.pdf's extractable text — deferred to a later top-up.
// solutionSteps: every step `[N mark]`-prefixed; prefixes sum to marks.
// =============================================================================

export const STAT_EXEMPLAR2: CanonicalQuestion[] = [
  // ===== Section A — MCQs (Exercise 13.1, 1 mark) =====
  { id: "STAT-N-EXEM2-13-MCQ-001", subject: "Maths", topicKey: "statistics", subtopic: "Assumed Mean Deviations", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "In the formula x̄ = a + (Σfᵢdᵢ)/(Σfᵢ), for finding the mean of grouped data the dᵢ's are deviations from a of",
    options: ["lower limits of the classes", "upper limits of the classes", "mid points of the classes", "frequencies of the class marks"],
    answer: "mid points of the classes",
    solutionSteps: ["[1 mark] In the assumed-mean method dᵢ = xᵢ − a, where xᵢ is the class mark (mid point) of the iᵗʰ class; so the deviations are taken from the mid points — option (C)."],
    finalAnswer: "mid points of the classes — option (C).",
    ncertRef: "Exemplar Ex 13.1 Q1", isCompetencyBased: false },

  { id: "STAT-N-EXEM2-13-MCQ-002", subject: "Maths", topicKey: "statistics", subtopic: "Grouped Mean Assumption", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "While computing mean of grouped data, we assume that the frequencies are",
    options: ["evenly distributed over all the classes", "centred at the classmarks of the classes", "centred at the upper limits of the classes", "centred at the lower limits of the classes"],
    answer: "centred at the classmarks of the classes",
    solutionSteps: ["[1 mark] The grouped-mean formula treats each class's frequency as concentrated at its class mark (mid point); hence option (B)."],
    finalAnswer: "centred at the classmarks of the classes — option (B).",
    ncertRef: "Exemplar Ex 13.1 Q2", isCompetencyBased: false },

  { id: "STAT-N-EXEM2-13-MCQ-003", subject: "Maths", topicKey: "statistics", subtopic: "Median Class (Inclusive Classes)", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Consider the following frequency distribution: Class 0-5 → 13, 6-11 → 10, 12-17 → 15, 18-23 → 8, 24-29 → 11. The upper limit of the median class is",
    options: ["17", "17.5", "18", "18.5"],
    answer: "17.5",
    solutionSteps: ["[1 mark] n = 57, so n/2 = 28.5; converting to continuous classes the cumulative frequencies are 13, 23, 38, 46, 57, so the median class is 12-17 (continuous 11.5-17.5), whose upper limit is 17.5 — option (B)."],
    finalAnswer: "17.5 — option (B).",
    ncertRef: "Exemplar Ex 13.1 Q7", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-MCQ-004", subject: "Maths", topicKey: "statistics", subtopic: "Median and Modal Class", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Consider the data: Class 65-85 → 4, 85-105 → 5, 105-125 → 13, 125-145 → 20, 145-165 → 14, 165-185 → 7, 185-205 → 4. The difference of the upper limit of the median class and the lower limit of the modal class is",
    options: ["0", "19", "20", "38"],
    answer: "20",
    solutionSteps: ["[1 mark] n = 67, n/2 = 33.5; cumulative frequencies 4, 9, 22, 42, ... give median class 125-145 (upper limit 145), and the maximum frequency 20 gives modal class 125-145 (lower limit 125), so the difference = 145 − 125 = 20 — option (C)."],
    finalAnswer: "20 — option (C).",
    ncertRef: "Exemplar Ex 13.1 Q9", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-MCQ-005", subject: "Maths", topicKey: "statistics", subtopic: "Cumulative Count", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The times, in seconds, taken by 150 athletes to run a 110 m hurdle race are tabulated: 13.8-14 → 2, 14-14.2 → 4, 14.2-14.4 → 5, 14.4-14.6 → 71, 14.6-14.8 → 48, 14.8-15 → 20. The number of athletes who completed the race in less than 14.6 seconds is",
    options: ["11", "71", "82", "130"],
    answer: "82",
    solutionSteps: ["[1 mark] 'Less than 14.6 s' adds the frequencies of all classes up to 14.4-14.6: 2 + 4 + 5 + 71 = 82 — option (C)."],
    finalAnswer: "82 — option (C).",
    ncertRef: "Exemplar Ex 13.1 Q10", isCompetencyBased: true },

  // ===== Section B — Short Answer with Reasoning (Exercise 13.2, 2 marks) =====
  { id: "STAT-N-EXEM2-13-VSA-001", subject: "Maths", topicKey: "statistics", subtopic: "Median: Grouped vs Ungrouped", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "The median of an ungrouped data and the median calculated when the same data is grouped are always the same. Do you think that this is a correct statement? Give reason.",
    solutionSteps: ["[1 mark] No, it is not always correct.", "[1 mark] The grouped-median formula assumes the observations in each class are uniformly (equally) spaced within the class, which is generally only an approximation, so the two medians need not coincide."],
    finalAnswer: "Not always — the grouped-median formula assumes uniform distribution within classes, so the values can differ.",
    ncertRef: "Exemplar Ex 13.2 Q1", isCompetencyBased: true },

  // ===== Section C — Short Answer (Exercise 13.3, 3 marks) =====
  { id: "STAT-N-EXEM2-13-SA-001", subject: "Maths", topicKey: "statistics", subtopic: "Mean (Inclusive Classes)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The following table gives the number of pages written by Sarika for completing her own book for 30 days: 16-18 → 1 day, 19-21 → 3, 22-24 → 4, 25-27 → 9, 28-30 → 13. Find the mean number of pages written per day.",
    solutionSteps: ["[1 mark] Class marks (mid points) are 17, 20, 23, 26, 29 and Σfᵢ = 30.", "[1 mark] Σfᵢxᵢ = 1×17 + 3×20 + 4×23 + 9×26 + 13×29 = 17 + 60 + 92 + 234 + 377 = 780.", "[1 mark] Mean = 780/30 = 26 pages per day."],
    finalAnswer: "Mean = 26 pages per day.",
    ncertRef: "Exemplar Ex 13.3 Q4", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-002", subject: "Maths", topicKey: "statistics", subtopic: "Mean (Inclusive Classes)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The daily income of a sample of 50 employees are tabulated as follows: 1-200 → 14, 201-400 → 15, 401-600 → 14, 601-800 → 7. Find the mean daily income of employees.",
    solutionSteps: ["[1 mark] Converting to continuous classes, the class marks are 100.5, 300.5, 500.5, 700.5 and Σfᵢ = 50.", "[1 mark] Σfᵢxᵢ = 14×100.5 + 15×300.5 + 14×500.5 + 7×700.5 = 1407 + 4507.5 + 7007 + 4903.5 = 17825.", "[1 mark] Mean = 17825/50 = ₹356.5."],
    finalAnswer: "Mean daily income = ₹356.5.",
    ncertRef: "Exemplar Ex 13.3 Q5", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-003", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An aircraft has 120 passenger seats. The number of seats occupied during 100 flights is given: 100-104 → 15, 104-108 → 20, 108-112 → 32, 112-116 → 18, 116-120 → 15. Determine the mean number of seats occupied over the flights.",
    solutionSteps: ["[1 mark] Class marks are 102, 106, 110, 114, 118 and Σfᵢ = 100.", "[1 mark] Σfᵢxᵢ = 15×102 + 20×106 + 32×110 + 18×114 + 15×118 = 1530 + 2120 + 3520 + 2052 + 1770 = 10992.", "[1 mark] Mean = 10992/100 = 109.92 seats."],
    finalAnswer: "Mean number of seats occupied ≈ 109.92.",
    ncertRef: "Exemplar Ex 13.3 Q6", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-004", subject: "Maths", topicKey: "statistics", subtopic: "Mean of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The weights (in kg) of 50 wrestlers are recorded: 100-110 → 4, 110-120 → 14, 120-130 → 21, 130-140 → 8, 140-150 → 3. Find the mean weight of the wrestlers.",
    solutionSteps: ["[1 mark] Class marks are 105, 115, 125, 135, 145 and Σfᵢ = 50.", "[1 mark] Σfᵢxᵢ = 4×105 + 14×115 + 21×125 + 8×135 + 3×145 = 420 + 1610 + 2625 + 1080 + 435 = 6170.", "[1 mark] Mean = 6170/50 = 123.4 kg."],
    finalAnswer: "Mean weight = 123.4 kg.",
    ncertRef: "Exemplar Ex 13.3 Q7", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-005", subject: "Maths", topicKey: "statistics", subtopic: "Mean and Interpretation", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "The mileage (km per litre) of 50 cars of the same model was tested: 10-12 → 7, 12-14 → 12, 14-16 → 18, 16-18 → 13. Find the mean mileage. The manufacturer claimed that the mileage of the model was 16 km/litre. Do you agree with this claim?",
    solutionSteps: ["[1 mark] Class marks are 11, 13, 15, 17 and Σfᵢ = 50.", "[1 mark] Σfᵢxᵢ = 7×11 + 12×13 + 18×15 + 13×17 = 77 + 156 + 270 + 221 = 724, so mean = 724/50 = 14.48 km/l.", "[1 mark] No — the mean mileage (14.48 km/l) is about 1.52 km/l less than the claimed 16 km/l, so the claim is not justified."],
    finalAnswer: "Mean ≈ 14.48 km/l; No, the claim of 16 km/l is not justified.",
    ncertRef: "Exemplar Ex 13.3 Q8", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-006", subject: "Maths", topicKey: "statistics", subtopic: "Frequency from Cumulative (less-than)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The following table shows the cumulative frequency distribution of marks of 800 students: Below 10 → 10, Below 20 → 50, Below 30 → 130, Below 40 → 270, Below 50 → 440, Below 60 → 570, Below 70 → 670, Below 80 → 740, Below 90 → 780, Below 100 → 800. Construct a frequency distribution table for the data.",
    solutionSteps: ["[1 mark] Each class frequency is the difference of successive 'below' cumulative frequencies.", "[1 mark] 0-10 → 10, 10-20 → 40, 20-30 → 80, 30-40 → 140, 40-50 → 170.", "[1 mark] 50-60 → 130, 60-70 → 100, 70-80 → 70, 80-90 → 40, 90-100 → 20 (total 800)."],
    finalAnswer: "0-10:10, 10-20:40, 20-30:80, 30-40:140, 40-50:170, 50-60:130, 60-70:100, 70-80:70, 80-90:40, 90-100:20.",
    ncertRef: "Exemplar Ex 13.3 Q10", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-007", subject: "Maths", topicKey: "statistics", subtopic: "Frequency from Cumulative (more-than)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Form the frequency distribution table from the following data: More than or equal to 0 → 34, ≥10 → 32, ≥20 → 30, ≥30 → 27, ≥40 → 23, ≥50 → 17, ≥60 → 11, ≥70 → 6, ≥80 → 4 (Marks out of 90).",
    solutionSteps: ["[1 mark] Each class frequency is the difference of successive 'more-than-or-equal-to' cumulative frequencies.", "[1 mark] 0-10 → 34−32 = 2, 10-20 → 2, 20-30 → 3, 30-40 → 4, 40-50 → 6.", "[1 mark] 50-60 → 6, 60-70 → 5, 70-80 → 2, 80-90 → 4 (total 34)."],
    finalAnswer: "0-10:2, 10-20:2, 20-30:3, 30-40:4, 40-50:6, 50-60:6, 60-70:5, 70-80:2, 80-90:4.",
    ncertRef: "Exemplar Ex 13.3 Q11", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-008", subject: "Maths", topicKey: "statistics", subtopic: "Unknown Cumulative Frequencies", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the unknown entries a, b, c, d, e, f in the following distribution of heights of students (Total 50): 150-155 → freq 12, cf a; 155-160 → freq b, cf 25; 160-165 → freq 10, cf c; 165-170 → freq d, cf 43; 170-175 → freq e, cf 48; 175-180 → freq 2, cf f.",
    solutionSteps: ["[1 mark] a = 12 (first cumulative frequency equals the first frequency); from a + b = 25, b = 13.", "[1 mark] c = 25 + 10 = 35; from c + d = 43, d = 8.", "[1 mark] from 43 + e = 48, e = 5; and f = 48 + 2 = 50 (= total)."],
    finalAnswer: "a = 12, b = 13, c = 35, d = 8, e = 5, f = 50.",
    ncertRef: "Exemplar Ex 13.3 Q12", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-009", subject: "Maths", topicKey: "statistics", subtopic: "Frequency from Cumulative (less-than)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given below is a cumulative frequency distribution showing the marks secured by 50 students of a class: Below 20 → 17, Below 40 → 22, Below 60 → 29, Below 80 → 37, Below 100 → 50. Form the frequency distribution table for the data.",
    solutionSteps: ["[1 mark] Each class frequency is the difference of successive 'below' cumulative frequencies.", "[1 mark] 0-20 → 17, 20-40 → 22−17 = 5, 40-60 → 29−22 = 7.", "[1 mark] 60-80 → 37−29 = 8, 80-100 → 50−37 = 13 (total 50)."],
    finalAnswer: "0-20:17, 20-40:5, 40-60:7, 60-80:8, 80-100:13.",
    ncertRef: "Exemplar Ex 13.3 Q14", isCompetencyBased: true },

  { id: "STAT-N-EXEM2-13-SA-010", subject: "Maths", topicKey: "statistics", subtopic: "Mode of Grouped Data", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The monthly income of 100 families are given as below: 0-5000 → 8, 5000-10000 → 26, 10000-15000 → 41, 15000-20000 → 16, 20000-25000 → 3, 25000-30000 → 3, 30000-35000 → 2, 35000-40000 → 1. Calculate the modal income.",
    solutionSteps: ["[1 mark] The maximum frequency 41 is in 10000-15000, so the modal class is 10000-15000 with l = 10000, h = 5000, f₁ = 41, f₀ = 26, f₂ = 16.", "[1 mark] Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂)) × h = 10000 + ((41 − 26)/(82 − 26 − 16)) × 5000.", "[1 mark] = 10000 + (15/40) × 5000 = 10000 + 1875 = ₹11875."],
    finalAnswer: "Modal income = ₹11875.",
    ncertRef: "Exemplar Ex 13.3 Q17", isCompetencyBased: true },
];
