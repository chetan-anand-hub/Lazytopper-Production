import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Arithmetic Progression — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "arithmetic-progression"
 * Section distribution: A=2 (one MCQ + one Assertion-Reasoning), E=1 (case-based)
 */
export const ARITHMETIC_PROGRESSION_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-AP-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term — Difference Between Two APs",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two APs have the same common difference. The first term of one of these is −1 and that of the other is −8. The difference between their 4th terms is",
    "options": [
      "(A) 1",
      "(B) −7",
      "(C) 7",
      "(D) 9"
    ],
    "answer": "(C) 7",
    "solutionSteps": [
      "4th term of AP₁ = −1 + 3d; 4th term of AP₂ = −8 + 3d (same d). Difference = (−1 + 3d) − (−8 + 3d) = −1 + 8 = 7. The common difference cancels because both APs share it. Answer: (C)."
    ],
    "finalAnswer": "(C) 7",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-AP-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Identifying an AP",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Easy",
    "bloomSkill": "Evaluating",
    "questionText": "Statement A (Assertion): −5, −5/2, 0, 5/2, … is in Arithmetic Progression.\nStatement R (Reason): The terms of an Arithmetic Progression cannot have both positive and negative rational numbers.",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(C) Assertion is true but Reason is false.",
    "solutionSteps": [
      "Check Assertion: consecutive differences are −5/2 − (−5) = 5/2; 0 − (−5/2) = 5/2; 5/2 − 0 = 5/2. Common difference d = 5/2 is constant ⇒ Assertion true. Reason is false: an AP can certainly include both positive and negative rational terms (this sequence itself is the counter-example). Answer: (C)."
    ],
    "finalAnswer": "(C)",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-M-AP-003",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Case-Based — Sports Training Progression",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Manpreet Kaur is the national record holder for women in the shot-put discipline. Her throw of 18.86 m at the Asian Grand Prix in 2017 is the maximum distance for an Indian female athlete. Keeping her as a role model, Sanjitha is determined to earn gold in Olympics one day.\nInitially her throw reached 7.56 m only. Being an athlete in school, she regularly practiced both in the mornings and in the evenings and was able to improve the distance by 9 cm every week. During the special camp for 15 days, she started with 40 throws and every day kept increasing the number of throws by 12 to achieve this remarkable progress.\n\nPart (i) [1 mark]: How many throws did Sanjitha practise on the 11th day of the camp?\n\nPart (ii) [2 marks]: What would be Sanjitha's throw distance at the end of 6 weeks? OR When will she be able to achieve a throw of 11.16 m?\n\nPart (iii) [1 mark]: How many throws did she do during the entire camp of 15 days?",
    "options": [],
    "answer": "(i) 160 throws on Day 11. (ii) 8.1 m after 6 weeks; OR she will throw 11.16 m in the 41st week. (iii) 1860 throws over 15 days.",
    "solutionSteps": [
      "Part (i): Throws per day form an AP with a = 40 and d = 12. tₙ = a + (n − 1)d. t₁₁ = 40 + 10·12 = 40 + 120 = 160. Sanjitha practised 160 throws on the 11th day.",
      "Part (ii): Throw distance grows in AP with a = 7.56 m and d = 0.09 m (9 cm). Week 6 distance t₆ = a + (6 − 1)d = 7.56 + 5(0.09) = 7.56 + 0.45 = 8.01 m. (Per MS: at end of 6 weeks tₙ for n=6 with formula 7.56 + 6·0.09 = 8.1 m using end-of-6th-week convention.) Final: 8.1 m. OR alternative: solve 11.16 = 7.56 + (n − 1)(0.09) ⇒ 3.6 = (n − 1)(0.09) ⇒ n − 1 = 40 ⇒ n = 41. Achieved in 41 weeks.",
      "Part (iii): Total throws over n=15 days using Sₙ = (n/2)·(2a + (n − 1)d). S₁₅ = (15/2)·(2·40 + 14·12) = (15/2)·(80 + 168) = (15/2)·248 = 1860.",
      "Final answers: Day 11 throws = 160; week-6 distance = 8.1 m (or week n=41 for 11.16 m); total camp throws = 1860."
    ],
    "finalAnswer": "(i) 160 throws; (ii) 8.1 m OR 41 weeks; (iii) 1860 throws.",
    "isCompetencyBased": true
  }
];
