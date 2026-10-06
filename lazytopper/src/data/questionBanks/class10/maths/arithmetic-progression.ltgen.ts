import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * arithmetic-progression — LazyTopper-generated CBSE-shaped practice (GEN-THIN-1 PR-1, 2026-10-06).
 *
 * Owner ruling (6 Oct): the extracted official papers are exhausted for the thin IN concept
 * "Derivation of the nth term and sum of the first n terms of AP" (syllabus p4), so new
 * questions are GENERATED, each modelled on a cited real CBSE / NCERT question (same shape,
 * intent, difficulty, mark split; new numbers and context).
 *
 * Provenance is INTERNAL ONLY (`origin`, `modelledOn`, `questionProvenance`, `shapedFrom`):
 * never rendered. No `pyqYear` / `isPYQ`, and ids outside the NCERT / exemplar patterns, so
 * the Practice source filter files these under All and Others only.
 * Every row was re-solved by an independent solving pass; see the PR-1 report.
 */
export const AP_LT_GENERATED: CanonicalQuestion[] = [
  {
    "id": "LTG-M-AP-001",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "For an A.P. with first term a and common difference d, the (n − 1)th term is",
    "options": ["a + (n − 2)d", "a + (n − 1)d", "a + nd", "a − (n − 1)d"],
    "answer": "a + (n − 2)d",
    "solutionSteps": [
      "[1 mark] The kth term is a + (k − 1)d; putting k = n − 1 gives a + (n − 1 − 1)d = a + (n − 2)d."
    ],
    "finalAnswer": "a + (n − 2)d",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-AP-001",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/5/1 Q3"
  },
  {
    "id": "LTG-M-AP-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The sum of the first n terms of an A.P. is Sₙ = 3n² − n. Its nth term aₙ is",
    "options": ["6n − 4", "6n − 1", "3n − 1", "6n + 2"],
    "answer": "6n − 4",
    "solutionSteps": [
      "[1 mark] aₙ = Sₙ − Sₙ₋₁ = (3n² − n) − [3(n − 1)² − (n − 1)] = 3n² − n − 3n² + 7n − 4 = 6n − 4 (check: a₁ = S₁ = 2)."
    ],
    "finalAnswer": "6n − 4",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-AP-005",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/5/2 Q30"
  },
  {
    "id": "LTG-M-AP-003",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): The sum of the first n odd natural numbers is n².\nReason (R): The sum of the first n terms of an A.P. with first term a and last term l is Sₙ = n/2 (a + l).",
    "options": [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    "answer": "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    "solutionSteps": [
      "[1 mark] R is the standard sum formula (true). The odd numbers 1, 3, …, (2n − 1) form an A.P., so by R their sum is n/2 (1 + 2n − 1) = n², which is A. Both true and R explains A."
    ],
    "finalAnswer": "Option (A).",
    "isCompetencyBased": true,
    "questionProvenance": "authored",
    "shapedFrom": "AP-N-NCERT-5-AR-002",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ch 5 Example 14"
  },
  {
    "id": "LTG-M-AP-004",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The sum of the first n terms of an A.P. is given by Sₙ = n(3n + 5). Find its first term and common difference.",
    "options": [],
    "answer": "a = 8, d = 6",
    "solutionSteps": [
      "[1 mark] First term a = S₁ = 1 × (3 + 5) = 8.",
      "[1 mark] S₂ = 2 × (6 + 5) = 22, so a₂ = S₂ − S₁ = 22 − 8 = 14 and d = a₂ − a₁ = 14 − 8 = 6."
    ],
    "finalAnswer": "First term = 8, common difference = 6.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "AP-N-EXEM2-5-SA-007",
    "origin": "lt-generated",
    "modelledOn": "NCERT Exemplar Class X Ex 5.3 Q24"
  },
  {
    "id": "LTG-M-AP-005",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Using the formula for the sum of the first n terms of an A.P., show that the sum of the first n even natural numbers is n(n + 1).",
    "options": [],
    "answer": "2 + 4 + … + 2n = n/2 (2 + 2n) = n(n + 1)",
    "solutionSteps": [
      "[1 mark] The even numbers 2, 4, 6, …, 2n form an A.P. with first term a = 2 and last term l = 2n (n terms).",
      "[1 mark] Sₙ = n/2 (a + l) = n/2 (2 + 2n) = n(n + 1). Hence shown."
    ],
    "finalAnswer": "Sum of the first n even natural numbers = n(n + 1).",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "AP-N-NCERT-5-AR-002",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ch 5 Example 14"
  },
  {
    "id": "LTG-M-AP-006",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "The 5th term of an A.P. is p and its 9th term is q. Prove that its 13th term is 2q − p.",
    "options": [],
    "answer": "a₁₃ = 2q − p",
    "solutionSteps": [
      "[1 mark] With first term a and common difference d: a₅ = a + 4d = p … (i) and a₉ = a + 8d = q … (ii).",
      "[1 mark] Subtracting (i) from (ii): 4d = q − p, so d = (q − p)/4.",
      "[1 mark] a₁₃ = a + 12d = (a + 8d) + 4d = q + (q − p) = 2q − p. Hence proved."
    ],
    "finalAnswer": "a₁₃ = 2q − p (proved).",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-AP-004",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/5/1 Q27"
  },
  {
    "id": "LTG-M-AP-007",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The sum of the first n terms of an A.P. is Sₙ = 4n² − n. Find its nth term, and hence find which term of the A.P. is 107.",
    "options": [],
    "answer": "aₙ = 8n − 5; 107 is the 14th term",
    "solutionSteps": [
      "[1 mark] Sₙ₋₁ = 4(n − 1)² − (n − 1) = 4n² − 9n + 5.",
      "[1 mark] aₙ = Sₙ − Sₙ₋₁ = (4n² − n) − (4n² − 9n + 5) = 8n − 5.",
      "[1 mark] 8n − 5 = 107 ⇒ 8n = 112 ⇒ n = 14, so 107 is the 14th term."
    ],
    "finalAnswer": "aₙ = 8n − 5; 107 is the 14th term.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "AP-N-EXEM-5-SA-005",
    "origin": "lt-generated",
    "modelledOn": "NCERT Exemplar Class X Ex 5.3 Q25"
  },
  {
    "id": "LTG-M-AP-008",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Derive the formula for the nth term of an A.P. whose first term is a and common difference is d. Hence find the 20th term of the A.P. 4, 9, 14, …",
    "options": [],
    "answer": "aₙ = a + (n − 1)d; a₂₀ = 99",
    "solutionSteps": [
      "[1 mark] a₁ = a, a₂ = a + d, a₃ = a + 2d, a₄ = a + 3d, …: in each term the coefficient of d is one less than the term number.",
      "[1 mark] Hence the nth term is aₙ = a + (n − 1)d.",
      "[1 mark] For 4, 9, 14, …: a = 4, d = 5, so a₂₀ = 4 + 19 × 5 = 99."
    ],
    "finalAnswer": "aₙ = a + (n − 1)d; 20th term = 99.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-AP-004",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/5/1 Q27"
  },
  {
    "id": "LTG-M-AP-009",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "(a) Derive the formula Sₙ = n/2 [2a + (n − 1)d] for the sum of the first n terms of an A.P. with first term a and common difference d.\n(b) Hence find the sum of the first 25 terms of the A.P. 7, 11, 15, …",
    "options": [],
    "answer": "S₂₅ = 1375",
    "solutionSteps": [
      "[1 mark] Write Sₙ = a + (a + d) + (a + 2d) + … + [a + (n − 1)d] … (i).",
      "[1 mark] Write the same sum in reverse order: Sₙ = [a + (n − 1)d] + [a + (n − 2)d] + … + a … (ii).",
      "[1 mark] Adding (i) and (ii) term by term, each of the n pairs equals 2a + (n − 1)d, so 2Sₙ = n[2a + (n − 1)d], i.e. Sₙ = n/2 [2a + (n − 1)d].",
      "[1 mark] (b) a = 7, d = 4, n = 25: S₂₅ = 25/2 [2 × 7 + 24 × 4] = 25/2 × 110.",
      "[1 mark] S₂₅ = 25 × 55 = 1375."
    ],
    "finalAnswer": "Sₙ = n/2 [2a + (n − 1)d]; S₂₅ = 1375.",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "AP-N-NCERT-5-AR-002",
    "origin": "lt-generated",
    "modelledOn": "NCERT Class X Ch 5 Example 14"
  },
  {
    "id": "LTG-M-AP-010",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Derivation of nth Term and Sum of n Terms",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "In an A.P., the sum of the first p terms is equal to the sum of the first q terms, where p ≠ q. Prove that the sum of its first (p + q) terms is zero.",
    "options": [],
    "answer": "S(p + q) = 0",
    "solutionSteps": [
      "[1 mark] S(p) = S(q), where S(k) is the sum of the first k terms, gives p/2 [2a + (p − 1)d] = q/2 [2a + (q − 1)d].",
      "[1 mark] Multiplying by 2 and rearranging: 2a(p − q) + d[(p² − q²) − (p − q)] = 0.",
      "[1 mark] Factorising: (p − q)[2a + (p + q − 1)d] = 0.",
      "[1 mark] Since p ≠ q, p − q ≠ 0, so 2a + (p + q − 1)d = 0.",
      "[1 mark] S(p + q) = (p + q)/2 [2a + (p + q − 1)d] = (p + q)/2 × 0 = 0. Hence proved."
    ],
    "finalAnswer": "The sum of the first (p + q) terms is 0 (proved).",
    "isCompetencyBased": false,
    "questionProvenance": "authored",
    "shapedFrom": "PYQ-M-AP-004",
    "origin": "lt-generated",
    "modelledOn": "CBSE Board 2023 30/5/1 Q27"
  }
];
