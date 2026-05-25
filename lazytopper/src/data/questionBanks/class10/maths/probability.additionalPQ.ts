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
];
