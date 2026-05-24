import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Real Numbers — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "real-numbers"
 * Section distribution: A=1, B=1, C=1
 */
export const REAL_NUMBERS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-RN-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM via Prime Factorisation",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then the result obtained by dividing the product of the positive integers by the LCM (a, b) is",
    "options": [
      "(A) xy",
      "(B) xy²",
      "(C) x³y³",
      "(D) x²y²"
    ],
    "answer": "(B) xy²",
    "solutionSteps": [
      "Product ab = (x³y²)(xy³) = x⁴y⁵. LCM(a, b) = x³y³ (highest power of each prime). ab / LCM = x⁴y⁵ / x³y³ = xy². Note: ab/LCM equals HCF. Answer: (B)."
    ],
    "finalAnswer": "(B) xy²",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-RN-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Irrational Numbers — Proof by Contradiction",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Prove that √2 is an irrational number.",
    "options": [],
    "answer": "Proof by contradiction (shown).",
    "solutionSteps": [
      "Assume, to the contrary, that √2 is rational. Then √2 = a/b for some coprime integers a, b (b ≠ 0). So b√2 = a; squaring: 2b² = a².",
      "Thus 2 divides a², so 2 divides a. Write a = 2c for some integer c. Substitute: 2b² = 4c² ⇒ b² = 2c². So 2 divides b², hence 2 divides b.",
      "So both a and b are divisible by 2 — contradicting that a and b are coprime. The assumption is wrong, therefore √2 is irrational."
    ],
    "finalAnswer": "√2 is irrational (proved by contradiction).",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-RN-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF Application — Real-World Grouping",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "National Art convention got registrations from students from all parts of the country, of which 60 are interested in music, 84 are interested in dance and 108 students are interested in handicrafts. For optimum cultural exchange, organisers wish to keep them in minimum number of groups such that each group consists of students interested in the same artform and the number of students in each group is the same. Find the number of students in each group. Find the number of groups in each art form. How many rooms are required if each group will be allotted a room?",
    "options": [],
    "answer": "12 students per group; 5 + 7 + 9 = 21 groups; 21 rooms required.",
    "solutionSteps": [
      "Students per group = HCF(60, 84, 108). Prime factorise: 60 = 2² · 3 · 5; 84 = 2² · 3 · 7; 108 = 2² · 3³. HCF = 2² · 3 = 12.",
      "Number of groups: Music = 60/12 = 5; Dance = 84/12 = 7; Handicrafts = 108/12 = 9.",
      "Total rooms required = 5 + 7 + 9 = 21."
    ],
    "finalAnswer": "12 per group; 5/7/9 groups; 21 rooms.",
    "isCompetencyBased": true
  }
];
