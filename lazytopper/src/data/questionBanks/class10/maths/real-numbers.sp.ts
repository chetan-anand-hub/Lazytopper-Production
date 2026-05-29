import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * real-numbers — CBSE Sample Papers (P5): Sample Paper Maths Standard 2022.
 * Extracted 2026-05-29 (Sprint 1). topicKey "real-numbers". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const RN_SP: CanonicalQuestion[] = [
  {
    "id": "SP-M-2022-RN-A-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Properties of Prime and Composite Numbers",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "If a and b are two odd prime numbers, then a² − b² is a",
    "options": [
      "(a) odd number.",
      "(b) even number.",
      "(c) composite number.",
      "(d) neither composite nor odd."
    ],
    "answer": "(c) composite number.",
    "solutionSteps": [
      "[1 mark] a² − b² = (a − b)(a + b). For two distinct odd primes, both factors are even (>1), so the product is divisible by more than 1 and itself — hence a composite number. Answer: (c)."
    ],
    "finalAnswer": "(c) composite number.",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-RN-A-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Factors and Divisibility",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "What is the smallest positive integer which should be multiplied with 6ⁿ (where n is a natural number) so that it ends with the digit 0?",
    "options": [
      "(a) No possible digit",
      "(b) 3",
      "(c) 5",
      "(d) 25"
    ],
    "answer": "(c) 5",
    "solutionSteps": [
      "[1 mark] A number ends with 0 only if it is divisible by 10 = 2 × 5. Since 6ⁿ = 2ⁿ·3ⁿ already contains the factor 2 but no factor 5, the smallest integer to supply the missing factor 5 is 5. Answer: (c)."
    ],
    "finalAnswer": "(c) 5",
    "isCompetencyBased": false
  },
  {
    "id": "SP-M-2022-RN-A-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM Relationship",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Statement A (Assertion): For any two positive integers p and q, HCF(p, q) × LCM(p, q) = p × q. Statement R (Reason): If HCF of two numbers is 5 and their product is 150, then their LCM is 40. Choose the correct option.",
    "options": [
      "(a) Both Assertion (A) and Reason (R) are true and Reason (R) is correct explanation of Assertion (A).",
      "(b) Both Assertion (A) and Reason (R) are true and Reason (R) is not correct explanation of Assertion (A).",
      "(c) Assertion (A) is true but Reason (R) is false.",
      "(d) Assertion (A) is false but Reason (R) is true."
    ],
    "answer": "(c) Assertion (A) is true but Reason (R) is false.",
    "solutionSteps": [
      "[1 mark] Assertion is the standard true result HCF × LCM = product. Reason: LCM = product/HCF = 150/5 = 30, not 40, so Reason is false. Hence Assertion true, Reason false. Answer: (c)."
    ],
    "finalAnswer": "(c) Assertion (A) is true but Reason (R) is false.",
    "isCompetencyBased": true
  },
  {
    "id": "SP-M-2022-RN-C-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Irrational Numbers (Proof by Contradiction)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Given that √5 is irrational, prove that 6 + 7√5 is irrational.",
    "options": [],
    "answer": "6 + 7√5 is irrational (proved by contradiction)",
    "solutionSteps": [
      "[1 mark] Assume, to the contrary, that 6 + 7√5 is rational. Then there exist coprime integers a and b (b ≠ 0) such that 6 + 7√5 = a/b.",
      "[1 mark] Rearranging: 7√5 = a/b − 6 = (a − 6b)/b, so √5 = (a − 6b)/(7b).",
      "[1 mark] Since a and b are integers, (a − 6b)/(7b) is rational, which makes √5 rational — contradicting the given that √5 is irrational. Hence our assumption is wrong and 6 + 7√5 is irrational."
    ],
    "finalAnswer": "6 + 7√5 is irrational (proved)",
    "isCompetencyBased": false
  }
];
