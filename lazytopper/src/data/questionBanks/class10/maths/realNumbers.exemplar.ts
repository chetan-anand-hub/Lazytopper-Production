import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics Exemplar — Chapter 1: Real Numbers
// topicKey: "real-numbers"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Euclid's Division Lemma/Algorithm excluded per syllabusGuard)
// Coverage: Ex 1.1 MCQs (in-syllabus only) + Ex 1.2 SAQs + Ex 1.3 LAQs (FTA, irrational
//           proofs, decimal expansions, HCF/LCM word problems). Ex 1.4 fully SKIPPED
//           (Euclid-lemma based). Items that depend on figures are also skipped.

export const RN_EXEMPLAR: CanonicalQuestion[] = [
  // ===== MCQs (Section A) =====
  { id: "RN-N-EXMPLR-1-MCQ-001", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is",
    options: ["xy", "xy²", "x³y³", "x²y²"],
    answer: "xy²",
    solutionSteps: ["HCF = product of the smallest powers of each common prime factor.", "For prime x: smaller power is min(3, 1) = 1 → x¹.", "For prime y: smaller power is min(2, 3) = 2 → y².", "HCF = x¹ × y² = xy²."],
    finalAnswer: "xy² — option (b).",
    ncertRef: "Exemplar Ex 1.1 Q6", isCompetencyBased: true,
    strategyHint: "HCF: MIN of exponents; LCM: MAX of exponents." },

  { id: "RN-N-EXMPLR-1-MCQ-002", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If two positive integers p and q can be expressed as p = ab² and q = a³b, where a, b are prime numbers, then LCM(p, q) is",
    options: ["ab", "a²b²", "a³b²", "a³b³"],
    answer: "a³b²",
    solutionSteps: ["LCM = product of greatest powers of all primes appearing in either number.", "For prime a: greatest power = max(1, 3) = 3 → a³.", "For prime b: greatest power = max(2, 1) = 2 → b².", "LCM = a³ × b² = a³b²."],
    finalAnswer: "a³b² — option (c).",
    ncertRef: "Exemplar Ex 1.1 Q7", isCompetencyBased: true },

  { id: "RN-N-EXMPLR-1-MCQ-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The product of a non-zero rational and an irrational number is",
    options: ["always irrational", "always rational", "rational or irrational", "one"],
    answer: "always irrational",
    solutionSteps: ["Suppose r (rational, ≠ 0) and i (irrational). If r × i were rational, say = s, then i = s/r would be rational (since s, r both rational, r ≠ 0).", "But i is irrational — contradiction. Hence r × i is irrational.", "This holds for ANY non-zero rational and ANY irrational → always irrational."],
    finalAnswer: "Always irrational — option (a).",
    ncertRef: "Exemplar Ex 1.1 Q8", isCompetencyBased: false,
    strategyHint: "Standard result: rational(≠0) × irrational = irrational." },

  { id: "RN-N-EXMPLR-1-MCQ-004", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The least number that is divisible by all the numbers from 1 to 10 (both inclusive) is",
    options: ["10", "100", "504", "2520"],
    answer: "2520",
    solutionSteps: ["The least number divisible by all of 1, 2, …, 10 is LCM(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).", "Prime factorisations: 8 = 2³ (highest power of 2); 9 = 3² (highest power of 3); 5 = 5; 7 = 7.", "LCM = 2³ × 3² × 5 × 7 = 8 × 9 × 5 × 7.", "= 72 × 35 = 2520."],
    finalAnswer: "2520 — option (d).",
    ncertRef: "Exemplar Ex 1.1 Q9", isCompetencyBased: true,
    strategyHint: "Take highest prime powers ≤ 10: 2³, 3², 5, 7." },

  { id: "RN-N-EXMPLR-1-MCQ-005", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The decimal expansion of the rational number 14587/1250 will terminate after how many decimal places?",
    options: ["one decimal place", "two decimal places", "three decimal places", "four decimal places"],
    answer: "four decimal places",
    solutionSteps: ["1250 = 2 × 5⁴. So 14587/1250 = 14587 / (2¹ × 5⁴).", "To make denominator a power of 10, multiply top and bottom by 2³: 14587/1250 = (14587 × 2³) / (2⁴ × 5⁴) = 116696/10000.", "10000 = 10⁴, so the decimal has 4 places: 116696/10000 = 11.6696.", "Hence it terminates after 4 decimal places."],
    finalAnswer: "Four decimal places — option (d).",
    ncertRef: "Exemplar Ex 1.1 Q10", isCompetencyBased: true,
    strategyHint: "Decimal places = max(power of 2, power of 5) in denominator (when in lowest terms)." },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "RN-N-EXMPLR-1-SA-001", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Analysing",
    questionText: "The numbers 525 and 3000 are both divisible only by 3, 5, 15, 25 and 75. What is HCF(525, 3000)? Justify your answer.",
    answer: "HCF(525, 3000) = 75. The HCF is the GREATEST positive integer that divides both numbers. From the given list of common divisors {3, 5, 15, 25, 75}, the largest is 75.",
    solutionSteps: ["Common divisors of 525 and 3000 are given: 3, 5, 15, 25, 75 (besides 1).", "HCF is the greatest among the common divisors.", "Greatest of {3, 5, 15, 25, 75} is 75.", "Hence HCF(525, 3000) = 75."],
    finalAnswer: "HCF(525, 3000) = 75.",
    ncertRef: "Exemplar Ex 1.2 Q6", isCompetencyBased: true,
    strategyHint: "HCF = largest of all common divisors." },

  { id: "RN-N-EXMPLR-1-SA-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Explain why 3 × 5 × 7 + 7 is a composite number.",
    answer: "3 × 5 × 7 + 7 = 7 × (3 × 5 + 1) = 7 × 16 = 112. Since 112 is a product of two integers each greater than 1 (namely 7 and 16), the number has factors other than 1 and itself, so it is composite.",
    solutionSteps: ["Factor 7 from both terms: 3 × 5 × 7 + 7 = 7 × (3 × 5 + 1) = 7 × 16.", "7 × 16 = 112. Both 7 > 1 and 16 > 1.", "A number that can be written as a product of two integers each greater than 1 has more than two factors → composite.", "Hence 3 × 5 × 7 + 7 = 112 is composite."],
    finalAnswer: "Composite (= 7 × 16 = 112).",
    ncertRef: "Exemplar Ex 1.2 Q7", isCompetencyBased: true,
    strategyHint: "Factor the common term out; if the result has 2 factors > 1, it is composite." },

  { id: "RN-N-EXMPLR-1-SA-003", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Can two numbers have 18 as their HCF and 380 as their LCM? Give reasons.",
    answer: "No. For any two positive integers, the HCF must always divide the LCM. Here HCF = 18 and LCM = 380. Check: 380 ÷ 18 = 21.11… which is NOT an integer, so 18 does not divide 380. Hence such a pair of numbers cannot exist.",
    solutionSteps: ["Theorem: HCF(a, b) always divides LCM(a, b) (every common factor divides every common multiple).", "Here, HCF = 18 and LCM = 380. Test if 18 | 380.", "380 / 18 = 21.111…, not an integer. So 18 does not divide 380.", "This violates the theorem. Hence no two numbers can have HCF = 18 and LCM = 380."],
    finalAnswer: "No — because 18 does not divide 380, but HCF must divide LCM.",
    ncertRef: "Exemplar Ex 1.2 Q8", isCompetencyBased: true,
    strategyHint: "HCF | LCM always — quick divisibility test." },

  { id: "RN-N-EXMPLR-1-SA-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Without actually performing the long division, find if 987/10500 will have a terminating or non-terminating (repeating) decimal expansion. Give reasons.",
    answer: "First reduce: gcd(987, 10500). 987 = 3 × 7 × 47 and 10500 = 2² × 3 × 5³ × 7. Common factor = 3 × 7 = 21. So 987/10500 = 47/500. Now 500 = 2² × 5³, which is of the form 2ⁿ × 5ᵐ. Hence the decimal expansion is TERMINATING.",
    solutionSteps: ["Factorise: 987 = 3 × 7 × 47; 10500 = 100 × 105 = (2² × 5²) × (3 × 5 × 7) = 2² × 3 × 5³ × 7.", "gcd(987, 10500) = 3 × 7 = 21. Reduce: 987/10500 = 47/500.", "47 is prime, 500 = 2² × 5³. gcd(47, 500) = 1, so 47/500 is in lowest terms.", "Denominator 500 = 2² × 5³ is of the form 2ⁿ × 5ᵐ → decimal expansion is TERMINATING."],
    finalAnswer: "Terminating (reduces to 47/500 where 500 = 2² × 5³).",
    ncertRef: "Exemplar Ex 1.2 Q9", isCompetencyBased: true,
    strategyHint: "Reduce to lowest terms first, then test denominator." },

  { id: "RN-N-EXMPLR-1-SA-005", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A rational number in its decimal expansion is 327.7081. What can you say about the prime factors of q when this number is expressed in the form p/q (in lowest terms)? Give reasons.",
    answer: "Since the decimal expansion terminates (after 4 places), p/q (in lowest terms) must have a denominator q whose only prime factors are 2 and 5. That is, q is of the form 2ⁿ × 5ᵐ for some non-negative integers n, m.",
    solutionSteps: ["327.7081 is a terminating decimal (it stops after 4 decimal places).", "By Theorem 1.5 of NCERT: if p/q (in lowest terms) has a terminating decimal, then q = 2ⁿ × 5ᵐ for non-negative integers n, m.", "So the prime factors of q can ONLY be 2 and/or 5.", "(Indeed, 327.7081 = 3277081/10000 = 3277081/(2⁴ × 5⁴), which confirms it.)"],
    finalAnswer: "q has only 2 and 5 as prime factors (q is of the form 2ⁿ × 5ᵐ).",
    ncertRef: "Exemplar Ex 1.2 Q10", isCompetencyBased: true,
    strategyHint: "Terminating decimal ⇒ denominator has primes only 2 and 5." },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "RN-N-EXMPLR-1-SA-006", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "On a morning walk, three persons step off together and their steps measure 40 cm, 42 cm and 45 cm, respectively. What is the minimum distance each should walk so that each can cover the same distance in complete steps?",
    answer: "Required distance = LCM(40, 42, 45) cm. 40 = 2³ × 5; 42 = 2 × 3 × 7; 45 = 3² × 5. LCM = 2³ × 3² × 5 × 7 = 2520 cm = 25.20 m.",
    solutionSteps: ["We need the smallest length that is a common multiple of 40, 42 and 45 — i.e., LCM.", "Prime factorisations: 40 = 2³ × 5; 42 = 2 × 3 × 7; 45 = 3² × 5.", "LCM = greatest power of each prime appearing = 2³ × 3² × 5 × 7.", "= 8 × 9 × 5 × 7 = 72 × 35 = 2520.", "Hence the minimum distance is 2520 cm = 25.20 m."],
    finalAnswer: "2520 cm (= 25.20 m).",
    ncertRef: "Exemplar Ex 1.3 Q12", isCompetencyBased: true,
    strategyHint: "'Same total distance in complete steps' ⇒ LCM of step sizes." },

  { id: "RN-N-EXMPLR-1-SA-007", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Write the denominator of the rational number 257/5000 in the form 2ᵐ × 5ⁿ, where m, n are non-negative integers. Hence write its decimal expansion, without actual division.",
    answer: "5000 = 2³ × 5⁴. So 257/5000 = 257/(2³ × 5⁴). Multiply numerator and denominator by 2 to make denominator 10⁴: 257/5000 = (257 × 2)/(2⁴ × 5⁴) = 514/10000 = 0.0514.",
    solutionSteps: ["Factorise 5000: 5000 = 5 × 1000 = 5 × 10³ = 5 × (2 × 5)³ = 5 × 2³ × 5³ = 2³ × 5⁴.", "So 257/5000 = 257/(2³ × 5⁴). Here m = 3, n = 4.", "To convert to a power-of-10 denominator, equalise the powers of 2 and 5. Powers needed: 2⁴, 5⁴. We have 2³ × 5⁴, so multiply top and bottom by 2.", "257/5000 = (257 × 2)/(2 × 2³ × 5⁴) = 514/(2⁴ × 5⁴) = 514/10000.", "514/10000 = 0.0514."],
    finalAnswer: "5000 = 2³ × 5⁴; decimal expansion = 0.0514.",
    ncertRef: "Exemplar Ex 1.3 Q13", isCompetencyBased: true,
    strategyHint: "Match powers of 2 and 5 to form 10ᵏ in the denominator." },

  { id: "RN-N-EXMPLR-1-SA-008", subject: "Maths", topicKey: "real-numbers", subtopic: "Fundamental Theorem of Arithmetic", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Show that 12ⁿ cannot end with the digit 0 or 5 for any natural number n.",
    answer: "12ⁿ = (2² × 3)ⁿ = 2²ⁿ × 3ⁿ. The only prime factors of 12ⁿ are 2 and 3. For a number to end with 0 or 5, it must be divisible by 5, i.e., its prime factorisation must contain the prime 5. Since 5 is not a factor of 12ⁿ, by the uniqueness of prime factorisation (FTA), 12ⁿ cannot end with the digit 0 or 5.",
    solutionSteps: ["Write 12 in prime factorised form: 12 = 2² × 3. So 12ⁿ = 2²ⁿ × 3ⁿ.", "A natural number ends with 0 ⇔ divisible by 10 = 2 × 5; ends with 5 ⇔ divisible by 5. Both cases require the prime 5 in the factorisation.", "By FTA, the prime factorisation of 12ⁿ is unique and contains only 2's and 3's — never a 5.", "Hence 12ⁿ has no factor of 5 → cannot end with 0 or 5 for any natural number n."],
    finalAnswer: "12ⁿ has no factor of 5 (it has only 2's and 3's) → cannot end with 0 or 5.",
    ncertRef: "Exemplar Ex 1.3 Q11", isCompetencyBased: true,
    strategyHint: "Ends-in-0 or ends-in-5 ⇒ must have prime 5; check FTA." },

  // ===== Section D — Long Answer / Proofs (5 marks) =====
  { id: "RN-N-EXMPLR-1-LA-001", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that √3 + √5 is irrational.",
    answer: "Assume, to the contrary, that √3 + √5 is rational. Say √3 + √5 = a, where a is rational. Then √5 = a − √3. Squaring both sides: 5 = a² − 2a√3 + 3, so 2a√3 = a² + 3 − 5 = a² − 2, giving √3 = (a² − 2)/(2a). Since a is rational and non-zero (clearly a > 0), (a² − 2)/(2a) is a ratio of two rationals with non-zero denominator, hence rational. So √3 would be rational. But √3 is irrational (NCERT Example 9). Contradiction. Hence √3 + √5 is irrational.",
    solutionSteps: ["Suppose, for contradiction, that √3 + √5 is rational. Let √3 + √5 = a, where a is rational.", "Isolate √5: √5 = a − √3.", "Square both sides: 5 = (a − √3)² = a² − 2a√3 + 3.", "Rearrange: 2a√3 = a² + 3 − 5 = a² − 2, so √3 = (a² − 2)/(2a).", "Since a is rational and a ≠ 0, the RHS is rational ⇒ √3 is rational. This contradicts the known fact that √3 is irrational. Hence √3 + √5 is irrational."],
    finalAnswer: "√3 + √5 is irrational (proof by contradiction).",
    ncertRef: "Exemplar Ex 1.3 Q10", isCompetencyBased: true,
    strategyHint: "Isolate one surd, square, and use irrationality of √3 (or √5)." },

  { id: "RN-N-EXMPLR-1-LA-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that √p + √q is irrational, where p and q are primes.",
    answer: "Assume, to the contrary, that √p + √q is rational. Say √p + √q = a, where a is rational. Then √q = a − √p. Squaring: q = a² − 2a√p + p, so 2a√p = a² + p − q, giving √p = (a² + p − q)/(2a). Since a, p, q are rational and a ≠ 0, the RHS is rational, so √p would be rational. But √p is irrational for any prime p (extension of NCERT Theorem 1.4). Contradiction. Hence √p + √q is irrational for any primes p, q.",
    solutionSteps: ["Suppose, for contradiction, that √p + √q is rational. Let √p + √q = a, with a rational (and clearly a > 0).", "Isolate one surd: √q = a − √p.", "Squaring: q = (a − √p)² = a² − 2a√p + p.", "Rearrange: 2a√p = a² + p − q, so √p = (a² + p − q)/(2a).", "Since p, q, a are rational and a ≠ 0, RHS is rational ⇒ √p is rational. This contradicts the fact that √p is irrational for any prime p. Hence √p + √q is irrational."],
    finalAnswer: "√p + √q is irrational for any primes p, q.",
    ncertRef: "Exemplar Ex 1.3 Q14", isCompetencyBased: true,
    strategyHint: "Generalisation of √3 + √5 proof — same template." },

  { id: "RN-N-EXMPLR-1-LA-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrational Numbers", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "Prove that 2 + √3 is irrational.",
    answer: "Assume, to the contrary, that 2 + √3 is rational. Let 2 + √3 = a where a is rational. Then √3 = a − 2, which is a difference of two rationals and is therefore rational. But √3 is irrational (NCERT Example 9). This contradiction shows that our assumption was wrong, so 2 + √3 is irrational.",
    solutionSteps: ["Suppose, for contradiction, that 2 + √3 is rational. Let 2 + √3 = a where a is rational.", "Isolate √3: √3 = a − 2.", "The RHS a − 2 is a difference of two rationals (a is rational, 2 is rational), hence rational.", "So √3 would be rational. But √3 is irrational (proved in NCERT Example 9).", "This is a contradiction. Hence 2 + √3 is irrational."],
    finalAnswer: "2 + √3 is irrational.",
    ncertRef: "Exemplar Sample Q3 (Section D)", isCompetencyBased: true,
    strategyHint: "Rational + irrational = irrational." },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "RN-N-EXMPLR-1-CB-001", subject: "Maths", topicKey: "real-numbers", subtopic: "HCF and LCM", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "On a morning walk in a park, three friends Akash, Bhavna and Chirag take steps of length 40 cm, 42 cm and 45 cm respectively. They start together from the same point.\n(i) After what minimum common distance will all three be in step together again?\n(ii) If Akash takes 1 step per second, how many seconds will he take to cover this minimum distance?",
    answer: "(i) Required distance = LCM(40, 42, 45). 40 = 2³ × 5; 42 = 2 × 3 × 7; 45 = 3² × 5. LCM = 2³ × 3² × 5 × 7 = 2520 cm = 25.2 m. (ii) Akash's step = 40 cm; number of his steps to cover 2520 cm = 2520/40 = 63 steps. At 1 step/sec, time = 63 seconds.",
    solutionSteps: ["(i) They will all be in step at distances that are multiples of each of 40, 42 and 45 cm. The minimum such common distance is LCM(40, 42, 45).", "Prime factorisations: 40 = 2³ × 5; 42 = 2 × 3 × 7; 45 = 3² × 5.", "LCM = 2³ × 3² × 5 × 7 = 8 × 9 × 5 × 7 = 2520 cm = 25.2 m.", "(ii) Akash's step = 40 cm. Number of steps for 2520 cm = 2520 / 40 = 63 steps. At 1 step per second, time = 63 × 1 = 63 seconds."],
    finalAnswer: "(i) 2520 cm = 25.2 m; (ii) 63 seconds.",
    ncertRef: "Exemplar Ex 1.3 Q12 (extended case)", isCompetencyBased: true,
    strategyHint: "Common stepping point ⇒ LCM. Then use distance/step-length for count." },

  { id: "RN-N-EXMPLR-1-CB-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Decimal Expansion", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A bank cashier records customer balances as rational numbers p/q in lowest terms. To display them digitally, terminating decimals are stored exactly, while non-terminating repeating ones are rounded.\n(i) For each fraction below, decide whether it can be stored exactly (terminating) or must be rounded (non-terminating repeating): (a) 17/200, (b) 11/75, (c) 13/3125.\n(ii) For (a), give the exact decimal expansion without long division.",
    answer: "(i)(a) 200 = 2³ × 5² → form 2ⁿ × 5ᵐ → TERMINATING (stored exactly). (b) 75 = 3 × 5² → has prime 3 ≠ 2, 5 → NON-TERMINATING repeating (must be rounded). (c) 3125 = 5⁵ → form 2ⁿ × 5ᵐ → TERMINATING (stored exactly). (ii) 17/200 = 17/(2³ × 5²). Multiply top and bottom by 5 to make denominator a power of 10: 17/200 = (17 × 5)/(2³ × 5³) = 85/1000 = 0.085.",
    solutionSteps: ["Theorem 1.6: a rational p/q in lowest terms has terminating decimal expansion iff q = 2ⁿ × 5ᵐ.", "(a) 17/200: gcd(17, 200) = 1 (17 prime). 200 = 2³ × 5². Of the form 2ⁿ × 5ᵐ → TERMINATING.", "(b) 11/75: gcd(11, 75) = 1. 75 = 3 × 5² has prime 3 ≠ 2, 5 → NON-TERMINATING repeating.", "(c) 13/3125: gcd(13, 3125) = 1. 3125 = 5⁵ = 2⁰ × 5⁵, of the form 2ⁿ × 5ᵐ → TERMINATING.", "(ii) 17/200 = 17/(2³ × 5²). Multiply top and bottom by 5¹ to balance powers: 17/200 = 85/(2³ × 5³) = 85/1000 = 0.085."],
    finalAnswer: "(i) (a) terminating; (b) non-terminating repeating; (c) terminating. (ii) 17/200 = 0.085.",
    ncertRef: "Exemplar Ex 1.2 Q9, Q10 (case-style)", isCompetencyBased: true,
    strategyHint: "Check denominator prime factorisation; balance 2's and 5's to convert to 10ᵏ." },
];
