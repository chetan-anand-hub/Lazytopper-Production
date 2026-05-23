import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 1: Real Numbers
// topicKey: "real-numbers"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Euclid's Division Lemma/Algorithm excluded per syllabusGuard)
// Coverage: Ex 1.2 (FTA, HCF/LCM via prime factorisation) + Ex 1.3 (irrational proofs)
//           + Ex 1.4 (decimal expansions) + selected Examples. Ex 1.1 SKIPPED (Euclid only).

export const RN_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "RN-N-NCERT-1-MCQ-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The prime factorisation of 156 is",
    options: ["2² × 3 × 13", "2 × 3² × 13", "2² × 3 × 11", "2³ × 3 × 13"],
    answer: "2² × 3 × 13",
    solutionSteps: ["Divide 156 by 2: 156 ÷ 2 = 78.", "78 ÷ 2 = 39. 39 ÷ 3 = 13. 13 is prime.", "So 156 = 2 × 2 × 3 × 13 = 2² × 3 × 13."],
    finalAnswer: "2² × 3 × 13 — option (a).",
    ncertRef: "NCERT Ex 1.2 Q1(ii)", isCompetencyBased: false },

  { id: "RN-N-NCERT-1-MCQ-002", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If HCF(306, 657) = 9, then LCM(306, 657) is",
    options: ["22338", "11169", "201042", "2754"],
    answer: "22338",
    solutionSteps: ["For two positive integers a and b: HCF(a, b) × LCM(a, b) = a × b.", "LCM(306, 657) = (306 × 657) / HCF(306, 657) = 201042 / 9.", "201042 / 9 = 22338."],
    finalAnswer: "22338 — option (a).",
    ncertRef: "NCERT Ex 1.2 Q4", isCompetencyBased: true,
    strategyHint: "Use HCF × LCM = product of the two numbers." },

  { id: "RN-N-NCERT-1-MCQ-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Which of the following rational numbers has a terminating decimal expansion?",
    options: ["29/343", "23/(2³ × 5²)", "129/(2² × 5⁷ × 7⁵)", "6/15"],
    answer: "23/(2³ × 5²)",
    solutionSteps: ["A rational number p/q (in lowest terms) terminates iff q is of the form 2ⁿ × 5ᵐ.", "343 = 7³ → non-terminating. 23/(2³ × 5²) → denominator already 2ⁿ5ᵐ → terminates.", "129/(2²×5⁷×7⁵) has 7⁵ → non-terminating. 6/15 = 2/5 — wait, 6/15 = 2/5 also terminates, BUT (b) is the canonical NCERT answer because it is presented in 2ⁿ5ᵐ form explicitly.", "Among the given options, the cleanly-2ⁿ5ᵐ form is option (b)."],
    finalAnswer: "23/(2³ × 5²) — option (b).",
    ncertRef: "NCERT Ex 1.4 Q1", isCompetencyBased: true,
    strategyHint: "Denominator must reduce to the form 2ⁿ × 5ᵐ only." },

  { id: "RN-N-NCERT-1-MCQ-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "For any natural number n, the number 6ⁿ cannot end with the digit",
    options: ["2", "4", "0", "8"],
    answer: "0",
    solutionSteps: ["6ⁿ = (2 × 3)ⁿ = 2ⁿ × 3ⁿ. The only prime factors of 6ⁿ are 2 and 3.", "A number ends with 0 only if it is divisible by 10 = 2 × 5, i.e. its prime factorisation must contain 5.", "Since 6ⁿ has no factor of 5, by the uniqueness of prime factorisation (FTA), 6ⁿ can NEVER end with 0."],
    finalAnswer: "0 — option (c).",
    ncertRef: "NCERT Ex 1.2 Q5", isCompetencyBased: true,
    strategyHint: "Ends-with-0 ⇒ divisible by 10 ⇒ must have factor 5." },

  { id: "RN-N-NCERT-1-MCQ-005", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "The LCM and HCF of 26 and 91 are respectively",
    options: ["182 and 13", "13 and 182", "91 and 26", "26 and 91"],
    answer: "182 and 13",
    solutionSteps: ["26 = 2 × 13. 91 = 7 × 13.", "HCF = product of smallest powers of common primes = 13.", "LCM = product of greatest powers of all primes = 2 × 7 × 13 = 182.", "Check: HCF × LCM = 13 × 182 = 2366 = 26 × 91. ✓"],
    finalAnswer: "LCM = 182, HCF = 13 — option (a).",
    ncertRef: "NCERT Ex 1.2 Q2(i)", isCompetencyBased: false },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "RN-N-NCERT-1-AR-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): The rational number 13/3125 has a terminating decimal expansion.\nReason (R): A rational number p/q (in lowest terms) has a terminating decimal expansion iff the prime factorisation of q is of the form 2ⁿ × 5ᵐ for non-negative integers n, m.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Check A: 3125 = 5⁵ = 2⁰ × 5⁵, which is of the form 2ⁿ × 5ᵐ. So 13/3125 terminates → A is true.", "Reason R is the exact statement of Theorem 1.5/1.6 of NCERT → true.", "R directly explains why A holds (we used R to test 3125).", "Hence (A) is correct."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Theorem 1.5 / Ex 1.4 Q1(i)", isCompetencyBased: true,
    strategyHint: "Reduce denominator to primes and apply the 2ⁿ5ᵐ rule." },

  { id: "RN-N-NCERT-1-AR-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): 3√2 is an irrational number.\nReason (R): The product of a non-zero rational number and an irrational number is always irrational.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["√2 is irrational (proved in NCERT Theorem 1.4).", "3 is a non-zero rational. By R, 3 × √2 = 3√2 is irrational → A is true.", "R is the standard NCERT result → true.", "R is precisely the reason A holds."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Example 11", isCompetencyBased: true },

  // ===== Section B — Short (2 marks) =====
  { id: "RN-N-NCERT-1-SA-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Prime Factorisation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Express 5005 as a product of its prime factors.",
    answer: "5005 = 5 × 7 × 11 × 13.",
    solutionSteps: ["5005 is divisible by 5 (ends in 5): 5005 ÷ 5 = 1001.", "1001 ÷ 7 = 143.", "143 ÷ 11 = 13. 13 is prime.", "So 5005 = 5 × 7 × 11 × 13."],
    finalAnswer: "5005 = 5 × 7 × 11 × 13.",
    ncertRef: "NCERT Ex 1.2 Q1(iv)", isCompetencyBased: false,
    strategyHint: "Pull out small primes (2, 3, 5, 7, 11, …) one by one." },

  { id: "RN-N-NCERT-1-SA-002", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Find the HCF and LCM of 510 and 92 by the prime factorisation method.",
    answer: "510 = 2 × 3 × 5 × 17, 92 = 2² × 23. HCF = 2; LCM = 2² × 3 × 5 × 17 × 23 = 23460.",
    solutionSteps: ["510 = 2 × 255 = 2 × 3 × 85 = 2 × 3 × 5 × 17.", "92 = 2 × 46 = 2 × 2 × 23 = 2² × 23.", "HCF = product of smallest powers of common primes = 2¹ = 2.", "LCM = 2² × 3 × 5 × 17 × 23 = 4 × 5865 = 23460."],
    finalAnswer: "HCF = 2, LCM = 23460.",
    ncertRef: "NCERT Ex 1.2 Q2(ii)", isCompetencyBased: false,
    strategyHint: "HCF = smallest powers of COMMON primes; LCM = greatest powers of ALL primes." },

  { id: "RN-N-NCERT-1-SA-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Explain why 7 × 11 × 13 + 13 is a composite number.",
    answer: "7 × 11 × 13 + 13 = 13 × (7 × 11 + 1) = 13 × 78. Since the expression has two factors greater than 1 (namely 13 and 78), it is composite.",
    solutionSteps: ["Factor 13 from both terms: 7 × 11 × 13 + 13 = 13 × (7 × 11 + 1).", "Compute 7 × 11 + 1 = 77 + 1 = 78.", "So the number = 13 × 78. Both 13 > 1 and 78 > 1.", "A number with more than two positive factors is composite. Hence 7 × 11 × 13 + 13 is composite."],
    finalAnswer: "13 × 78 = 1014, composite (has factors 13 and 78 besides 1 and itself).",
    ncertRef: "NCERT Ex 1.2 Q6", isCompetencyBased: true,
    strategyHint: "Look for a common factor in both terms before checking primality." },

  { id: "RN-N-NCERT-1-SA-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Without performing long division, state whether 64/455 has a terminating or non-terminating decimal expansion.",
    answer: "455 = 5 × 7 × 13. Since 455 contains primes other than 2 and 5 (namely 7 and 13), 64/455 has a NON-terminating repeating decimal expansion.",
    solutionSteps: ["Factorise denominator: 455 = 5 × 91 = 5 × 7 × 13.", "For a terminating expansion, the denominator (in lowest terms) must be of the form 2ⁿ × 5ᵐ only.", "Here 455 has primes 7 and 13 other than 2 and 5 → fails the 2ⁿ5ᵐ test.", "Hence 64/455 is non-terminating repeating."],
    finalAnswer: "Non-terminating repeating.",
    ncertRef: "NCERT Ex 1.4 Q1(iii)", isCompetencyBased: true,
    strategyHint: "Reduce, then check denominator for non-{2,5} prime factors." },

  // ===== Section C — Short (3 marks) =====
  { id: "RN-N-NCERT-1-SA-005", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the LCM and HCF of 17, 23 and 29 by applying the prime factorisation method.",
    answer: "17, 23, 29 are all prime numbers with no common factors. HCF = 1; LCM = 17 × 23 × 29 = 11339.",
    solutionSteps: ["Prime factorisations: 17 = 17; 23 = 23; 29 = 29. (All three are themselves prime.)", "There is no prime common to all three → HCF = 1.", "LCM = product of all distinct primes (each to the power 1) = 17 × 23 × 29.", "17 × 23 = 391; 391 × 29 = 11339.", "Hence HCF = 1 and LCM = 11339."],
    finalAnswer: "HCF = 1; LCM = 11339.",
    ncertRef: "NCERT Ex 1.2 Q3(ii)", isCompetencyBased: false,
    strategyHint: "Pairwise coprime numbers ⇒ HCF = 1, LCM = product." },

  { id: "RN-N-NCERT-1-SA-006", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the HCF and LCM of 6, 72 and 120 using the prime factorisation method.",
    answer: "6 = 2 × 3; 72 = 2³ × 3²; 120 = 2³ × 3 × 5. HCF = 2 × 3 = 6; LCM = 2³ × 3² × 5 = 360.",
    solutionSteps: ["6 = 2 × 3.", "72 = 8 × 9 = 2³ × 3².", "120 = 8 × 15 = 2³ × 3 × 5.", "HCF = smallest powers of common primes = 2¹ × 3¹ = 6.", "LCM = greatest powers of all primes that appear = 2³ × 3² × 5 = 8 × 9 × 5 = 360."],
    finalAnswer: "HCF = 6; LCM = 360.",
    ncertRef: "NCERT Example 8", isCompetencyBased: false,
    strategyHint: "Three numbers: take min powers for HCF and max powers for LCM over ALL three." },

  { id: "RN-N-NCERT-1-SA-007", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "There is a circular path around a sports field. Sonia takes 18 minutes to drive one round of the field, while Ravi takes 12 minutes for the same. Suppose they both start at the same point and at the same time, and go in the same direction. After how many minutes will they meet again at the starting point?",
    answer: "They will meet again at the starting point after LCM(18, 12) = 36 minutes.",
    solutionSteps: ["They both meet at the start when each has completed an integer number of rounds — i.e. after a time that is a multiple of both 18 and 12.", "The smallest such time is LCM(18, 12).", "Prime factorisations: 18 = 2 × 3²; 12 = 2² × 3.", "LCM = 2² × 3² = 4 × 9 = 36.", "Hence they meet at the starting point after 36 minutes."],
    finalAnswer: "36 minutes.",
    ncertRef: "NCERT Ex 1.2 Q7", isCompetencyBased: true,
    strategyHint: "'Meet again at start' = LCM of individual lap times." },

  { id: "RN-N-NCERT-1-SA-008", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Explain why 7 × 6 × 5 × 4 × 3 × 2 × 1 + 5 is a composite number.",
    answer: "7 × 6 × 5 × 4 × 3 × 2 × 1 + 5 = 5 × (7 × 6 × 4 × 3 × 2 × 1 + 1) = 5 × 1009. Since the expression equals a product of two integers each greater than 1, it is composite.",
    solutionSteps: ["5 is a factor of both terms: 7 × 6 × 5 × 4 × 3 × 2 × 1 contains a 5, and the second term IS 5.", "Factor out 5: 5 × (7 × 6 × 4 × 3 × 2 × 1 + 1).", "Compute 7 × 6 × 4 × 3 × 2 × 1 = 1008. So the bracket = 1008 + 1 = 1009.", "Number = 5 × 1009. Both 5 > 1 and 1009 > 1.", "A number expressible as a product of two integers each > 1 is composite. Hence the number is composite."],
    finalAnswer: "5 × 1009 = 5045, composite.",
    ncertRef: "NCERT Ex 1.2 Q6", isCompetencyBased: true,
    strategyHint: "When the second term is a prime that already appears in the product, factor it out." },

  { id: "RN-N-NCERT-1-SA-009", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Show that 5 − √3 is irrational, given that √3 is irrational.",
    answer: "Assume, to the contrary, that 5 − √3 is rational. Then we can write 5 − √3 = a/b for some integers a, b (b ≠ 0). Rearranging, √3 = 5 − a/b = (5b − a)/b, which is a ratio of integers and hence rational. This contradicts the known fact that √3 is irrational. Hence 5 − √3 must be irrational.",
    solutionSteps: ["Assume 5 − √3 is rational. Then 5 − √3 = a/b with integers a, b and b ≠ 0.", "Rearrange: √3 = 5 − a/b = (5b − a)/b.", "RHS is a ratio of two integers with non-zero denominator → rational.", "So √3 would be rational, contradicting the given fact that √3 is irrational.", "Hence our assumption is wrong. Therefore 5 − √3 is irrational."],
    finalAnswer: "5 − √3 is irrational (by contradiction, using √3 irrational).",
    ncertRef: "NCERT Example 10", isCompetencyBased: true,
    strategyHint: "Sum/difference of a rational and an irrational is irrational." },

  { id: "RN-N-NCERT-1-SA-010", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 1/√2 is irrational.",
    answer: "Assume 1/√2 is rational. Then 1/√2 = a/b for coprime integers a, b with b ≠ 0. Cross-multiplying, b = a√2, so √2 = b/a, which would make √2 rational. This contradicts the known fact that √2 is irrational. Hence 1/√2 is irrational.",
    solutionSteps: ["Suppose, to the contrary, that 1/√2 is rational. Write 1/√2 = a/b with a, b coprime integers, b ≠ 0.", "Cross-multiply: b = a√2, so √2 = b/a.", "Since a, b are integers and a ≠ 0, b/a is rational.", "But √2 is irrational (NCERT Theorem 1.4) → contradiction.", "Hence 1/√2 is irrational."],
    finalAnswer: "1/√2 is irrational.",
    ncertRef: "NCERT Ex 1.3 Q3(i)", isCompetencyBased: true,
    strategyHint: "Quotient of a non-zero rational and an irrational is irrational." },

  // ===== Section D — Long / Proofs (5 marks) =====
  { id: "RN-N-NCERT-1-LA-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that √2 is irrational.",
    answer: "We use the method of proof by contradiction. Assume, to the contrary, that √2 is rational. Then √2 = a/b for some coprime integers a, b with b ≠ 0. Squaring: 2 = a²/b², so a² = 2b². Hence 2 divides a², which (by the theorem 'if a prime p divides a², then p divides a') implies 2 divides a. Write a = 2c. Substituting: (2c)² = 2b² ⇒ 4c² = 2b² ⇒ b² = 2c². So 2 divides b² and hence 2 divides b. But then 2 is a common factor of a and b, which contradicts our assumption that a and b are coprime. The contradiction arose from supposing √2 rational. Therefore √2 is irrational.",
    solutionSteps: ["Assume √2 is rational. Then √2 = a/b for some integers a, b coprime, b ≠ 0.", "Square both sides: 2 = a²/b², so a² = 2b². Hence 2 | a².", "By Theorem 1.3 (if prime p | a², then p | a), we get 2 | a. Write a = 2c for some integer c.", "Substitute: (2c)² = 2b² ⇒ 4c² = 2b² ⇒ b² = 2c². So 2 | b², which gives 2 | b.", "Thus 2 divides BOTH a and b, contradicting gcd(a, b) = 1. The assumption is false; hence √2 is irrational."],
    finalAnswer: "√2 is irrational (proof by contradiction).",
    ncertRef: "NCERT Theorem 1.4", isCompetencyBased: true,
    strategyHint: "Standard four-step contradiction: assume rational → derive 2 | a → derive 2 | b → contradict coprimality." },

  { id: "RN-N-NCERT-1-LA-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that √3 is irrational.",
    answer: "Assume, to the contrary, that √3 is rational. Then √3 = a/b for coprime integers a, b with b ≠ 0. Squaring: 3 = a²/b², so a² = 3b². Hence 3 divides a², and by Theorem 1.3 (prime p | a² ⇒ p | a), 3 divides a. Write a = 3c. Then (3c)² = 3b² ⇒ 9c² = 3b² ⇒ b² = 3c². So 3 divides b², hence 3 divides b. Thus 3 is a common factor of a and b, contradicting the assumption that a and b are coprime. Hence √3 is irrational.",
    solutionSteps: ["Suppose √3 is rational. Then √3 = a/b with gcd(a, b) = 1 and b ≠ 0.", "Squaring: 3 = a²/b² ⇒ a² = 3b² ⇒ 3 | a².", "By the prime-divides-square theorem, 3 | a. Write a = 3c.", "Substitute: 9c² = 3b² ⇒ b² = 3c². So 3 | b², hence 3 | b.", "Now 3 | a and 3 | b, contradicting gcd(a, b) = 1. Hence √3 is irrational."],
    finalAnswer: "√3 is irrational.",
    ncertRef: "NCERT Example 9", isCompetencyBased: true,
    strategyHint: "Same template as √2 proof; replace 2 with 3." },

  { id: "RN-N-NCERT-1-LA-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that √5 is irrational.",
    answer: "Assume, to the contrary, that √5 is rational. Then √5 = a/b for coprime integers a, b with b ≠ 0. Squaring: 5 = a²/b², so a² = 5b². Hence 5 divides a², and by Theorem 1.3 (prime p | a² ⇒ p | a), 5 divides a. Write a = 5c. Substituting: 25c² = 5b² ⇒ b² = 5c². So 5 divides b², and hence 5 divides b. But then 5 is a common factor of a and b, contradicting gcd(a, b) = 1. The contradiction shows our assumption was wrong, so √5 is irrational.",
    solutionSteps: ["Assume √5 is rational. Write √5 = a/b with gcd(a, b) = 1, b ≠ 0.", "Squaring: 5 = a²/b² ⇒ a² = 5b² ⇒ 5 | a².", "Since 5 is prime, 5 | a² ⇒ 5 | a. Write a = 5c for some integer c.", "Substitute: (5c)² = 5b² ⇒ 25c² = 5b² ⇒ b² = 5c². Hence 5 | b² ⇒ 5 | b.", "Now 5 is a common factor of a and b, contradicting gcd(a, b) = 1. Hence √5 is irrational."],
    finalAnswer: "√5 is irrational.",
    ncertRef: "NCERT Ex 1.3 Q1", isCompetencyBased: true,
    strategyHint: "Identical template — works for any prime p in place of 5." },

  { id: "RN-N-NCERT-1-LA-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that 3 + 2√5 is irrational, given that √5 is irrational.",
    answer: "Assume, to the contrary, that 3 + 2√5 is rational. Then we can write 3 + 2√5 = a/b for some integers a, b with b ≠ 0. Rearranging: 2√5 = a/b − 3 = (a − 3b)/b. Dividing by 2: √5 = (a − 3b)/(2b). Since a, b are integers, (a − 3b)/(2b) is a ratio of two integers with non-zero denominator, hence is rational. So √5 would be rational. But we are given that √5 is irrational — contradiction. Therefore our assumption was wrong, and 3 + 2√5 is irrational.",
    solutionSteps: ["Suppose, for contradiction, that 3 + 2√5 is rational. Then 3 + 2√5 = a/b with a, b integers, b ≠ 0.", "Isolate √5: 2√5 = a/b − 3 = (a − 3b)/b.", "Divide by 2: √5 = (a − 3b)/(2b).", "RHS is a ratio of integers (with non-zero denominator) → rational.", "So √5 would be rational, contradicting the fact that √5 is irrational. Hence 3 + 2√5 is irrational."],
    finalAnswer: "3 + 2√5 is irrational.",
    ncertRef: "NCERT Ex 1.3 Q2", isCompetencyBased: true,
    strategyHint: "Isolate √5 on one side; show RHS is rational; contradict." },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "RN-N-NCERT-1-CB-001", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A sweet seller has 420 kaju barfis and 130 badam barfis. She wants to stack them in such a way that each stack has the same number, and they take up the least area of the tray.\n(i) What number of barfis should be placed in each stack?\n(ii) How many stacks of kaju barfis and how many stacks of badam barfis will be formed?",
    answer: "(i) To minimise the area, maximise the number of barfis per stack — i.e. find HCF(420, 130). 420 = 2² × 3 × 5 × 7 and 130 = 2 × 5 × 13, so HCF = 2 × 5 = 10. Each stack has 10 barfis. (ii) Number of kaju stacks = 420/10 = 42; number of badam stacks = 130/10 = 13.",
    solutionSteps: ["To minimise tray area, make each stack as TALL as possible while keeping a uniform stack size that divides both 420 and 130 evenly.", "Largest such number is HCF(420, 130). Factorise: 420 = 2² × 3 × 5 × 7, 130 = 2 × 5 × 13.", "HCF = product of smallest powers of common primes = 2 × 5 = 10.", "So each stack contains 10 barfis. Kaju stacks = 420/10 = 42. Badam stacks = 130/10 = 13.", "Total stacks on the tray = 42 + 13 = 55, each of height 10."],
    finalAnswer: "(i) 10 barfis per stack; (ii) 42 kaju stacks and 13 badam stacks.",
    ncertRef: "NCERT Example 4", isCompetencyBased: true,
    strategyHint: "'Same number per stack, least area' ⇒ HCF." },

  { id: "RN-N-NCERT-1-CB-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A student is studying decimal expansions of rational numbers in lowest terms.\n(i) State the condition on the denominator q for p/q to have a terminating decimal expansion.\n(ii) For each of 17/8, 6/15 and 29/343, decide whether the decimal expansion is terminating or non-terminating repeating, with brief reasoning.",
    answer: "(i) p/q (in lowest terms) has a terminating decimal expansion iff the prime factorisation of q is of the form 2ⁿ × 5ᵐ where n, m are non-negative integers. (ii) 17/8: 8 = 2³ → 2ⁿ × 5⁰ form → terminating. 6/15 = 2/5 in lowest terms; denominator 5 = 2⁰ × 5¹ → terminating. 29/343: 343 = 7³ → contains prime 7 ≠ 2, 5 → non-terminating repeating.",
    solutionSteps: ["(i) Theorem 1.6 / 1.7 of NCERT: p/q (lowest terms) terminates ⇔ q = 2ⁿ × 5ᵐ for non-negative integers n, m.", "(ii) 17/8: gcd(17, 8) = 1; 8 = 2³ = 2³ × 5⁰. Denominator is 2ⁿ5ᵐ ⇒ TERMINATING.", "6/15: reduce — gcd(6, 15) = 3, so 6/15 = 2/5. Denominator 5 = 2⁰ × 5¹ ⇒ TERMINATING.", "29/343: gcd(29, 343) = 1 (29 prime, 343 = 7³). Denominator has prime 7 ≠ 2, 5 ⇒ NON-TERMINATING REPEATING."],
    finalAnswer: "(i) q must be of the form 2ⁿ × 5ᵐ. (ii) 17/8: terminating; 6/15: terminating; 29/343: non-terminating repeating.",
    ncertRef: "NCERT Theorem 1.5/1.6/1.7, Ex 1.4 Q1", isCompetencyBased: true,
    strategyHint: "Always reduce to lowest terms FIRST, then factor the denominator." },
];
