import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 15 (current Ch 14 in NCERT 2024-25): Probability
// PDF file used: Maths15.pdf (old numbering) — verified Page 1 = "PROBABILITY"
// topicKey: "probability"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 — classical probability only (experimental probability skipped)
// Coverage: Ex 15.1 (mandatory exercise) + selected NCERT Examples 1–13.

export const PROB_NCERT: CanonicalQuestion[] = [
  // ===== Section A — MCQs (1 mark) =====
  { id: "PROB-N-NCERT-14-MCQ-001", subject: "Maths", topicKey: "probability", subtopic: "Range of Probability", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Which of the following CANNOT be the probability of an event?",
    options: ["2/3", "−1.5", "15%", "0.7"],
    answer: "−1.5",
    solutionSteps: ["A probability must satisfy 0 ≤ P(E) ≤ 1.", "−1.5 is negative, so it lies outside this range and cannot be a probability."],
    finalAnswer: "−1.5 — option (b).",
    ncertRef: "NCERT Ex 15.1 Q4", isCompetencyBased: false,
    strategyHint: "Reject any value < 0 or > 1." },

  { id: "PROB-N-NCERT-14-MCQ-002", subject: "Maths", topicKey: "probability", subtopic: "Complementary Events", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "If P(E) = 0.05, then P(not E) equals",
    options: ["0.05", "0.50", "0.95", "1.05"],
    answer: "0.95",
    solutionSteps: ["P(E) + P(not E) = 1.", "P(not E) = 1 − 0.05 = 0.95."],
    finalAnswer: "0.95 — option (c).",
    ncertRef: "NCERT Ex 15.1 Q5", isCompetencyBased: false },

  { id: "PROB-N-NCERT-14-MCQ-003", subject: "Maths", topicKey: "probability", subtopic: "Single Die", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A die is thrown once. The probability of getting an odd number is",
    options: ["1/6", "1/3", "1/2", "2/3"],
    answer: "1/2",
    solutionSteps: ["Total outcomes = 6 (faces 1–6).", "Favourable odd outcomes: 1, 3, 5 → 3 outcomes.", "P(odd) = 3/6 = 1/2."],
    finalAnswer: "1/2 — option (c).",
    ncertRef: "NCERT Ex 15.1 Q13(iii)", isCompetencyBased: false },

  { id: "PROB-N-NCERT-14-MCQ-004", subject: "Maths", topicKey: "probability", subtopic: "Playing Cards", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "One card is drawn from a well-shuffled deck of 52 cards. The probability that the card is an ace is",
    options: ["1/13", "1/4", "1/52", "4/13"],
    answer: "1/13",
    solutionSteps: ["A deck has 4 aces out of 52.", "P(ace) = 4/52 = 1/13."],
    finalAnswer: "1/13 — option (a).",
    ncertRef: "NCERT Example 4 (page 301)", isCompetencyBased: false },

  { id: "PROB-N-NCERT-14-MCQ-005", subject: "Maths", topicKey: "probability", subtopic: "Two Dice", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two dice (one blue and one grey) are thrown simultaneously. The probability that the sum of the two numbers appearing on top is 8 equals",
    options: ["5/36", "5/12", "1/8", "1/6"],
    answer: "5/36",
    solutionSteps: ["Total outcomes = 6 × 6 = 36.", "Favourable pairs (sum 8): (2,6), (3,5), (4,4), (5,3), (6,2) → 5 outcomes.", "P(sum = 8) = 5/36."],
    finalAnswer: "5/36 — option (a).",
    ncertRef: "NCERT Example 13(i) (page 307)", isCompetencyBased: true,
    strategyHint: "Enumerate ordered pairs systematically using the 6×6 grid." },

  { id: "PROB-N-NCERT-14-MCQ-006", subject: "Maths", topicKey: "probability", subtopic: "Two Coins", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two coins are tossed simultaneously. The probability of getting at least one head is",
    options: ["1/4", "1/2", "3/4", "1"],
    answer: "3/4",
    solutionSteps: ["Sample space: {HH, HT, TH, TT} — 4 outcomes.", "‘At least one head’ is favoured by HH, HT, TH → 3 outcomes.", "P(at least one head) = 3/4."],
    finalAnswer: "3/4 — option (c).",
    ncertRef: "NCERT Example 9 (page 304)", isCompetencyBased: true },

  // ===== Section A — Assertion-Reasoning (1 mark) =====
  { id: "PROB-N-NCERT-14-AR-001", subject: "Maths", topicKey: "probability", subtopic: "Sure and Impossible Events", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Assertion (A): The probability of getting an 8 when a single die is thrown is 0.\nReason (R): An event whose number of favourable outcomes is zero is called an impossible event and its probability is 0.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["A die shows faces 1–6 only; no face shows 8, so favourable outcomes = 0 and P = 0. A is true.", "R is the standard NCERT definition of impossible event. R is true.", "R explains exactly why A holds."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Section 15.2 (impossible events)", isCompetencyBased: false },

  { id: "PROB-N-NCERT-14-AR-002", subject: "Maths", topicKey: "probability", subtopic: "Complementary Events", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): If the probability of an event is 2/3, then the probability of its complement is 1/3.\nReason (R): For any event E, P(E) + P(not E) = 1.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["By R: P(not E) = 1 − 2/3 = 1/3. So A is true.", "R is the standard complementary-events identity — true.", "R is exactly the reason A holds."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Section 15.2 / Ex 15.1 Q1(i)", isCompetencyBased: true },

  // ===== Section B — Short Answer (2 marks) =====
  { id: "PROB-N-NCERT-14-VSA-001", subject: "Maths", topicKey: "probability", subtopic: "Sure and Impossible Events", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "A bag contains only lemon-flavoured candies. Malini takes out one candy without looking. Find the probability that she takes out (i) an orange-flavoured candy, (ii) a lemon-flavoured candy.",
    solutionSteps: ["(i) There are no orange-flavoured candies in the bag, so favourable outcomes = 0. P(orange) = 0 (impossible event).", "(ii) Every candy in the bag is lemon-flavoured, so P(lemon) = 1 (sure event)."],
    finalAnswer: "(i) 0; (ii) 1.",
    ncertRef: "NCERT Ex 15.1 Q6", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-VSA-002", subject: "Maths", topicKey: "probability", subtopic: "Coloured Balls", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A bag contains 3 red balls and 5 black balls. A ball is drawn at random. Find the probability that the ball drawn is (i) red, (ii) not red.",
    solutionSteps: ["Total balls = 3 + 5 = 8.", "(i) P(red) = 3/8.", "(ii) P(not red) = 1 − 3/8 = 5/8 (or directly 5 black/8 total)."],
    finalAnswer: "(i) 3/8; (ii) 5/8.",
    ncertRef: "NCERT Ex 15.1 Q8", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-VSA-003", subject: "Maths", topicKey: "probability", subtopic: "Coins", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why is tossing a coin considered a fair way of deciding which team should get the ball at the beginning of a football game?",
    solutionSteps: ["A coin is symmetrical and unbiased; tossing it at random gives either head or tail with equal probability 1/2.", "Since each team is equally likely to win the toss, no team has a built-in advantage.", "Hence the coin toss is a fair (impartial) way to assign the ball."],
    finalAnswer: "Because the two outcomes (head, tail) are equally likely, giving both teams an equal chance.",
    ncertRef: "NCERT Ex 15.1 Q3", isCompetencyBased: true },

  // ===== Section C — Short Answer (3 marks) =====
  { id: "PROB-N-NCERT-14-SA-001", subject: "Maths", topicKey: "probability", subtopic: "Marbles", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A box contains 5 red marbles, 8 white marbles and 4 green marbles. One marble is drawn at random. What is the probability that the marble drawn is (i) red, (ii) white, (iii) not green?",
    solutionSteps: ["Total marbles = 5 + 8 + 4 = 17.", "(i) P(red) = 5/17.", "(ii) P(white) = 8/17.", "(iii) P(not green) = 1 − 4/17 = 13/17."],
    finalAnswer: "(i) 5/17; (ii) 8/17; (iii) 13/17.",
    ncertRef: "NCERT Ex 15.1 Q9", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-SA-002", subject: "Maths", topicKey: "probability", subtopic: "Coins", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A piggy bank contains hundred 50p coins, fifty ₹1 coins, twenty ₹2 coins and ten ₹5 coins. One coin falls out at random. Find the probability that the coin (i) is a 50p coin, (ii) is not a ₹5 coin.",
    solutionSteps: ["Total coins = 100 + 50 + 20 + 10 = 180.", "(i) P(50p) = 100/180 = 5/9.", "(ii) Number of coins that are not ₹5 = 180 − 10 = 170. P(not ₹5) = 170/180 = 17/18."],
    finalAnswer: "(i) 5/9; (ii) 17/18.",
    ncertRef: "NCERT Ex 15.1 Q10", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-SA-003", subject: "Maths", topicKey: "probability", subtopic: "Playing Cards", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "One card is drawn from a well-shuffled deck of 52 cards. Find the probability of getting (i) a king of red colour, (ii) a face card, (iii) a red face card.",
    solutionSteps: ["(i) Red kings: king of hearts and king of diamonds → 2 favourable. P = 2/52 = 1/26.", "(ii) Face cards = J, Q, K of each suit × 4 suits = 12. P(face) = 12/52 = 3/13.", "(iii) Red face cards: J, Q, K of hearts + J, Q, K of diamonds = 6. P = 6/52 = 3/26."],
    finalAnswer: "(i) 1/26; (ii) 3/13; (iii) 3/26.",
    ncertRef: "NCERT Ex 15.1 Q14(i,ii,iii)", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-SA-004", subject: "Maths", topicKey: "probability", subtopic: "Numbered Discs", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A box contains 90 discs numbered 1 to 90. If one disc is drawn at random, find the probability that it bears (i) a two-digit number, (ii) a perfect square, (iii) a number divisible by 5.",
    solutionSteps: ["Total outcomes = 90.", "(i) Two-digit numbers from 10 to 90 → 81 outcomes. P = 81/90 = 9/10.", "(ii) Perfect squares ≤ 90: 1, 4, 9, 16, 25, 36, 49, 64, 81 → 9 outcomes. P = 9/90 = 1/10.", "(iii) Multiples of 5 from 5 to 90: 5, 10, …, 90. Count = 90/5 = 18. P = 18/90 = 1/5."],
    finalAnswer: "(i) 9/10; (ii) 1/10; (iii) 1/5.",
    ncertRef: "NCERT Ex 15.1 Q18", isCompetencyBased: true },

  { id: "PROB-N-NCERT-14-SA-005", subject: "Maths", topicKey: "probability", subtopic: "Defective Items", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "12 defective pens are accidentally mixed with 132 good ones. One pen is taken out at random. Find the probability that the pen taken out is a good one.",
    solutionSteps: ["Total pens = 12 + 132 = 144.", "Favourable (good) outcomes = 132.", "P(good) = 132/144 = 11/12."],
    finalAnswer: "P(good pen) = 11/12.",
    ncertRef: "NCERT Ex 15.1 Q16", isCompetencyBased: true },

  // ===== Section D — Long Answer (5 marks) =====
  { id: "PROB-N-NCERT-14-LA-001", subject: "Maths", topicKey: "probability", subtopic: "Two Dice", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Two dice (one blue and one grey) are thrown simultaneously. Find the probability that the sum on the two dice is (i) 8, (ii) 13, (iii) less than or equal to 12, (iv) 7, (v) at least 10.",
    solutionSteps: ["Total outcomes = 36.", "(i) Sum 8: (2,6),(3,5),(4,4),(5,3),(6,2) → 5. P = 5/36.", "(ii) Sum 13: impossible since max sum = 12. P = 0.", "(iii) All 36 outcomes have sum ≤ 12. P = 36/36 = 1.", "(iv) Sum 7: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) → 6. P = 6/36 = 1/6.", "(v) Sum ≥ 10: sums 10, 11, 12. Pairs: (4,6),(5,5),(6,4),(5,6),(6,5),(6,6) → 6. P = 6/36 = 1/6."],
    finalAnswer: "(i) 5/36; (ii) 0; (iii) 1; (iv) 1/6; (v) 1/6.",
    ncertRef: "NCERT Example 13 / Ex 15.1 Q22", isCompetencyBased: true,
    strategyHint: "Use the full 6×6 outcome grid and count favourable cells per event." },

  { id: "PROB-N-NCERT-14-LA-002", subject: "Maths", topicKey: "probability", subtopic: "Birthdays", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Savita and Hamida are friends. Ignoring leap years, find the probability that they have (i) different birthdays, (ii) the same birthday. Then for a group of three students where the probability that two students do not share the same birthday is 0.992, find the probability that the two students share the same birthday.",
    solutionSteps: ["Part 1: Savita's birthday is fixed (any one of 365 days). Hamida's birthday is equally likely on any of 365 days.", "(i) Hamida's birthday differs from Savita's in 364 ways out of 365. P(different) = 364/365.", "(ii) P(same) = 1 − 364/365 = 1/365.", "Part 2: P(two students do not share birthday) = 0.992.", "P(two students share birthday) = 1 − 0.992 = 0.008."],
    finalAnswer: "(i) 364/365; (ii) 1/365. Three-student case: P(same birthday) = 0.008.",
    ncertRef: "NCERT Example 6 (page 302) / Ex 15.1 Q7", isCompetencyBased: true },

  // ===== Section E — Case-Based (4 marks) =====
  { id: "PROB-N-NCERT-14-CB-001", subject: "Maths", topicKey: "probability", subtopic: "Playing Cards", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Five cards — the ten, jack, queen, king and ace of diamonds — are well-shuffled face down. One card is picked up at random.\n(i) What is the probability that the card is the queen?\n(ii) If the queen is drawn and put aside, what is the probability that the second card picked is an ace?\n(iii) If the queen is drawn and put aside, what is the probability that the second card picked is a queen?\n(iv) Are the events in (ii) and (iii) complementary? Justify briefly.",
    solutionSteps: ["(i) 5 equally likely cards, 1 queen → P = 1/5.", "(ii) After the queen is removed, 4 cards remain (10, J, K, A). 1 ace → P = 1/4.", "(iii) After removing the queen, 0 queens remain among the 4 cards → P = 0 (impossible event).", "(iv) Not complementary: complementary events have probabilities summing to 1, but here 1/4 + 0 = 1/4 ≠ 1. The events are mutually exclusive but their union is not the full sample space."],
    finalAnswer: "(i) 1/5; (ii) 1/4; (iii) 0; (iv) Not complementary.",
    ncertRef: "NCERT Ex 15.1 Q15", isCompetencyBased: true },

  // ===== Creating-level question =====
  { id: "PROB-N-NCERT-14-CRE-001", subject: "Maths", topicKey: "probability", subtopic: "Coloured Balls", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Creating",
    questionText: "Design a bag of red and white balls such that the probability of drawing a red ball is exactly 3/4 and the total number of balls is at most 12. Specify the contents and verify your design.",
    solutionSteps: ["Let r = red balls, w = white balls. We need r/(r + w) = 3/4 and r + w ≤ 12.", "From r/(r + w) = 3/4: 4r = 3(r + w) ⇒ r = 3w. So (r, w) = (3, 1), (6, 2), (9, 3) — first three satisfy r + w ≤ 12.", "Pick (r, w) = (9, 3): total 12 balls. P(red) = 9/12 = 3/4. ✓", "Alternative: (r, w) = (6, 2) with total 8 balls also works."],
    finalAnswer: "One valid design: 9 red and 3 white balls (total 12).",
    ncertRef: "NCERT-style design task", isCompetencyBased: true,
    strategyHint: "Set up the ratio equation, then enumerate solutions under the size cap." },
];
