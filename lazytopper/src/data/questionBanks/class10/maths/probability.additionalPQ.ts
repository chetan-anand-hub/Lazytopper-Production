import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf (+ MS Mathematics-PQ1_MS.pdf), Mathematics-PQ2.pdf (+ MS Mathematics-PQ2MS2.pdf)
// topicKey: "probability"
// Extraction date: 2026-05-24
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed)

export const PROBABILITY_APQ: CanonicalQuestion[] = [
  // PQ1 Q18 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PROB-001", subject: "Maths", topicKey: "probability", subtopic: "Theoretical Probability", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Ginny flipped a fair coin three times and tails came up each time. Ginny wants to flip the coin again. What is the probability of getting heads in the next coin flip?",
    options: ["0", "0.25", "0.5", "1"],
    answer: "0.5",
    solutionSteps: ["Each coin toss is an independent event — past outcomes do not affect future outcomes.", "For a fair coin, P(Heads) = 1/2 = 0.5 on every toss."],
    finalAnswer: "(c) 0.5",
    ncertRef: "APQ PQ1 Q18", isCompetencyBased: true,
    strategyHint: "Common misconception: 'gambler's fallacy' — independent events are not affected by prior outcomes." },

  // PQ2 Q18 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PROB-002", subject: "Maths", topicKey: "probability", subtopic: "Probability and Complement", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In an MCQ test, a student guesses the correct answer x out of y times. If the probability that the student guesses the answer to be wrong is 2/3 then what is the relation between x and y",
    options: ["y = 3x", "x = 3y", "3x = 2y", "2x = 3y"],
    answer: "y = 3x",
    solutionSteps: ["P(wrong) = 2/3 ⟹ P(correct) = 1 − 2/3 = 1/3.", "P(correct) = x/y = 1/3 ⟹ y = 3x."],
    finalAnswer: "(a) y = 3x",
    ncertRef: "APQ PQ2 Q18", isCompetencyBased: true },

  // PQ2 Q20 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-M-PROB-003", subject: "Maths", topicKey: "probability", subtopic: "Probability and Complement", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion(A): The probability of getting a bad egg in a lot of 400 is 0.035. The number of good eggs in the lot is 386. Reason(R): If the probability of an event is p, the probability of its complementary event will be 1-p",
    options: [
      "Both (A) and (R) are true and (R) is the correct explanation of (A).",
      "Both A and (R) are true and (R) is not the correct explanation of (A).",
      "(A) is true but (R) is false.",
      "(A) is false but (R) is true."
    ],
    answer: "Both (A) and (R) are true and (R) is the correct explanation of (A).",
    solutionSteps: ["P(bad egg) = 0.035 ⟹ Number of bad eggs = 0.035 × 400 = 14.", "P(good egg) = 1 − 0.035 = 0.965 (using complement rule).", "Number of good eggs = 400 − 14 = 386. Both A and R are true; R correctly explains A."],
    finalAnswer: "(a) Both (A) and (R) are true and (R) is the correct explanation of (A).",
    ncertRef: "APQ PQ2 Q20", isCompetencyBased: true },

  // PQ1 Q31 (Section C, Short, 3 marks)
  { id: "APQ-M-PROB-004", subject: "Maths", topicKey: "probability", subtopic: "Compound Events — Dice", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Naima is playing a game and has two identical 6-sided dice. The faces of the dice have 3 even numbers and 3 odd numbers. She has to roll the two dice simultaneously and has two options to choose from before rolling the dice. She wins a prize if: Option 1: the sum of the two numbers appearing on the top of the two dice is odd. Option 2: the product of the two numbers appearing on top of the two dice is odd. Which option should Naima choose so that her chances of winning a prize is higher?",
    answer: "Option 1 (sum odd) has probability 1/2; Option 2 (product odd) has probability 1/4. Naima should choose Option 1.",
    solutionSteps: ["Sum cases: odd+odd=even, odd+even=odd, even+odd=odd, even+even=even. P(sum odd) = 2/4 = 1/2.", "Product cases: odd×odd=odd, odd×even=even, even×odd=even, even×even=even. P(product odd) = 1/4.", "Compare: 1/2 > 1/4, so Naima should choose Option 1."],
    finalAnswer: "Option 1 — P(sum odd) = 1/2 > P(product odd) = 1/4.",
    ncertRef: "APQ PQ1 Q31", isCompetencyBased: true },

  // PQ2 Q31 (Section C, Short, 3 marks)
  { id: "APQ-M-PROB-005", subject: "Maths", topicKey: "probability", subtopic: "Probability — Deck of Cards", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "One card is drawn from a well shuffled deck of 52 cards. Find the probability of getting (i) a face card or a black card (ii) neither an ace nor a king (iii) a jack and a black card",
    answer: "(i) 32/52 or 8/13; (ii) 44/52 or 11/13; (iii) 2/52 or 1/26.",
    solutionSteps: ["(i) P(face card or black card) = 12/52 + 26/52 − 6/52 = 32/52 = 8/13.", "(ii) P(neither ace nor king) = 1 − (4/52 + 4/52) = 1 − 8/52 = 44/52 = 11/13.", "(iii) P(a jack and a black card) = 2/52 = 1/26."],
    finalAnswer: "(i) 8/13; (ii) 11/13; (iii) 1/26.",
    ncertRef: "APQ PQ2 Q31", isCompetencyBased: true,
    strategyHint: "Standard deck: 12 face cards (J,Q,K each suit), 26 black cards (clubs+spades), 6 black face cards." },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q18 (Section A, MCQ, 1 mark)
  { id: "APQ-M-PROB-006", subject: "Maths", topicKey: "probability", subtopic: "Probability — Marbles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "A bowl contains 3 red and 2 blue marbles. Roohi wants to pick a red marble. Which of the following changes could she make so that the probability of picking a red marble is greater than it was before? (i) Adding a red marble. (ii) Removing a blue marble. (iii) Adding 1 red and 1 blue marble.",
    options: ["only (i)", "only (i) and (ii)", "only (i) and (iii)", "(all of the above)"],
    answer: "only (i) and (ii)",
    solutionSteps: ["Starting: P(red) = 3/5 = 0.6.", "(i) Add red: 4/6 ≈ 0.67 > 0.6 ✓.", "(ii) Remove blue: 3/4 = 0.75 > 0.6 ✓.", "(iii) Add 1 red and 1 blue: 4/7 ≈ 0.57 < 0.6 ✗. Only (i) and (ii) increase the probability."],
    finalAnswer: "(b) only (i) and (ii)",
    ncertRef: "APQ PQ_2022 Q18", isCompetencyBased: true },

  // PQ_2022 Q31 (Section C, Short, 3 marks)
  { id: "APQ-M-PROB-007", subject: "Maths", topicKey: "probability", subtopic: "Probability — Weighted Dartboard", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A square dartboard has sections numbered 1 to 12. Smaller sections (1 to 8) have area 1/16 each; larger sections (9 to 12) have area 1/8 each. Arya: \"My dart will land on a composite number.\" Bashir: \"My dart will land on an even number.\" Cathy: \"My dart will land on a factor of 12.\" Calculate the probability of each and determine the winner.",
    answer: "Arya 9/16; Bashir 1/2; Cathy 7/16. Arya has highest chance.",
    solutionSteps: ["Composite numbers in 1-12: {4, 6, 8, 9, 10, 12}. Among small (1-8): 4, 6, 8 → 3 × (1/16). Among large (9-12): 9, 10, 12 → 3 × (1/8). P(Arya) = 3/16 + 3/8 = 3/16 + 6/16 = 9/16.", "Even numbers: {2, 4, 6, 8, 10, 12}. Small: 4 × (1/16); Large: 2 × (1/8). P(Bashir) = 4/16 + 2/8 = 4/16 + 4/16 = 8/16 = 1/2.", "Factors of 12: {1, 2, 3, 4, 6, 12}. Small: 5 × (1/16); Large: 1 × (1/8). P(Cathy) = 5/16 + 1/8 = 5/16 + 2/16 = 7/16.", "Compare: 9/16 > 8/16 > 7/16 ⟹ Arya wins."],
    finalAnswer: "Arya 9/16, Bashir 1/2, Cathy 7/16. Arya highest chance.",
    ncertRef: "APQ PQ_2022 Q31", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: square dartboard with sections numbered 1-12." },
];
