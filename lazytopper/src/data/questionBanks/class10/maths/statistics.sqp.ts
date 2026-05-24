import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Statistics — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "statistics"
 * Section distribution: A=1, C=1, D=1
 */
export const STATISTICS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-STAT-001",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Modal Class from Cumulative Frequency Distribution",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The upper limit of the modal class of the given distribution is:\nHeight (in cm): Below 140, Below 145, Below 150, Below 155, Below 160, Below 165\nNumber of girls: 4, 11, 29, 40, 46, 51",
    "options": [
      "(A) 165",
      "(B) 160",
      "(C) 155",
      "(D) 150"
    ],
    "answer": "(D) 150",
    "solutionSteps": [
      "Convert cumulative to class frequencies: 135–140: 4; 140–145: 7; 145–150: 18; 150–155: 11; 155–160: 6; 160–165: 5. Maximum frequency 18 occurs in class 145–150. Upper limit of modal class = 150. Answer: (D)."
    ],
    "finalAnswer": "(D) 150",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-STAT-002",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Mean of Grouped Data — Assumed Mean Method",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The length of 40 leaves of a plant are measured correct to nearest millimetre, and the data obtained is represented in the following table.\nLength (in mm): 118–126, 127–135, 136–144, 145–153, 154–162, 163–171, 172–180\nNumber of leaves: 3, 5, 9, 12, 5, 4, 2\nFind the mean length of the leaves.",
    "options": [],
    "answer": "Mean length ≈ 146.975 mm.",
    "solutionSteps": [
      "Convert to continuous classes (subtract 0.5 from lower limit, add 0.5 to upper): 117.5–126.5, 126.5–135.5, …, 171.5–180.5. Class midpoints: 122, 131, 140, 149, 158, 167, 176. Frequencies: 3, 5, 9, 12, 5, 4, 2.",
      "Use assumed mean method with a = 149, h = 9. Deviations d = x − a: −27, −18, −9, 0, 9, 18, 27. Compute fd: −81, −90, −81, 0, 45, 72, 54. Σf = 40; Σfd = −81.",
      "Mean = a + (Σfd / Σf) = 149 + (−81/40) = 149 − 2.025 = 146.975 mm. Average length of the leaves = 146.975 mm."
    ],
    "finalAnswer": "Mean ≈ 146.975 mm.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-STAT-003",
    "subject": "Maths",
    "topicKey": "statistics",
    "subtopic": "Median and Mode of Grouped Data with Unknown Frequencies",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "The median of the following data is 50. Find the values of 'p' and 'q', if the sum of all frequencies is 90. Also find the mode of the data.\nMarks obtained: 20–30, 30–40, 40–50, 50–60, 60–70, 70–80, 80–90\nNumber of students: p, 15, 25, 20, q, 8, 10",
    "options": [],
    "answer": "p = 5, q = 7; Mode ≈ 46.67.",
    "solutionSteps": [
      "Sum of frequencies: p + 15 + 25 + 20 + q + 8 + 10 = 90 ⇒ p + q + 78 = 90 ⇒ p + q = 12.",
      "Cumulative frequencies: p, p+15, p+40, p+60, p+q+60, p+q+68, p+q+78. Median = 50 lies in class 50–60 (modal-median class), so l = 50, h = 10, f = 20, cf (before median class) = p + 40, n/2 = 45.",
      "Median formula: Median = l + ((n/2 − cf)/f)·h ⇒ 50 = 50 + ((45 − (p + 40))/20)·10 ⇒ ((45 − p − 40)/20)·10 = 0 ⇒ 5 − p = 0 ⇒ p = 5. Hence q = 12 − 5 = 7.",
      "Mode: highest frequency is f₁ = 25 in class 40–50, so l = 40, h = 10, f₀ = 15 (previous), f₂ = 20 (next). Mode = l + ((f₁ − f₀)/(2f₁ − f₀ − f₂))·h.",
      "Mode = 40 + ((25 − 15)/(50 − 15 − 20))·10 = 40 + (10/15)·10 = 40 + 100/15 = 40 + 6.67 ≈ 46.67."
    ],
    "finalAnswer": "p = 5, q = 7; Mode ≈ 46.67.",
    "isCompetencyBased": true
  }
];
