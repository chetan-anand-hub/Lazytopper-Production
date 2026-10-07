import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2024-25 board exam
// Question papers + matched marking schemes (X_MS_041_Mathematics Standard_30-x-x_2024-25) from CBSE
// topicKey: "probability"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable Standard QPs (30/1/x, 30/2/x, 30/3/x); 10 scanned QPs (30/4/x, 30/5/x, 30/6/x, 30(B)) skipped — require OCR; Maths Basic (241) not in scope

export const PROBABILITY_PYQ_2025: CanonicalQuestion[] = [
  { id: "PYQ-M-2025-PROB-001", subject: "Maths", topicKey: "probability", subtopic: "General", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Assertion (A) : The probability of selecting a number at random from the numbers 1 to 20 is 1. Reason (R): For any event E, if P(E) = 1, then E is called a sure event.",
    options: ["Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).", "Both Assertion (A) and Reason (R) are true but Reason (R) is not the correct explanation of Assertion (A).", "Assertion (A) is true but Reason (R) is false.", "Assertion (A) is false but Reason (R) is true."],
    answer: "Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
    solutionSteps: ["Selecting a number from the numbers 1 to 20 always gives one of those numbers. So the event is certain and its probability is 1: A is true.", "R is the definition of a sure event (P(E) = 1), which is true. It explains why the probability in A is 1, so the answer is (a)."],
    finalAnswer: "(a) Both Assertion (A) and Reason (R) are true and Reason (R) is the correct explanation of Assertion (A).",
    ncertRef: "PYQ 30/1/1 Q19", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PROB-002", subject: "Maths", topicKey: "probability", subtopic: "Dice Probability", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two dice are thrown at the same time. Determine the probability that the difference of the numbers on the two dice is 2.",
    answer: "Total outcomes = 36. Outcomes with difference 2: (1,3), (3,1), (2,4), (4,2), (3,5), (5,3), (4,6), (6,4) = 8. P = 8/36 = 2/9.",
    solutionSteps: ["[1 mark] Total outcomes when two dice are thrown = 6 × 6 = 36.", "[1 mark] Favourable outcomes (difference 2): (1,3), (3,1), (2,4), (4,2), (3,5), (5,3), (4,6), (6,4) = 8.", "[1 mark] P(difference is 2) = 8/36 = 2/9."],
    finalAnswer: "2/9",
    ncertRef: "PYQ 30/1/1 Q31", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PROB-003", subject: "Maths", topicKey: "probability", subtopic: "Dice Probability", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two dice are rolled together. Find the probability of getting : (i) a multiple of 2 on one and a multiple of 3 on the other die. (ii) the product of two numbers on the top of the two dice is a perfect square number.",
    // Recovered from X_MS_041_Mathematics Standard_30-1-3_2024-25, p.10 (outcome lists and both
    // fractions confirmed word-by-word from glyph bboxes).
    answer: "Total outcomes = 36 (i) (2, 3), (2, 6), (3, 2), (3, 4), (3, 6), (4, 3), (4, 6), (6, 2), (6, 3), (6, 4), (6, 6) Number of outcomes having multiple of 2 on one die and a multiple of 3 on other die = 11 Hence, P(E) = 11/36 (ii) (1, 1), (2, 2), (3, 3), (1, 4), (4, 1), (4, 4), (5, 5), (6, 6) Number of outcomes having product of two numbers on the top of the dice is a perfect square number = 8 P(E) = 8/36 or 2/9",
    solutionSteps: ["Total outcomes = 36", "(i) (2, 3), (2, 6), (3, 2), (3, 4), (3, 6), (4, 3), (4, 6), (6, 2), (6, 3), (6, 4), (6, 6)", "Number of outcomes having multiple of 2 on one die and a multiple of 3 on other die = 11 Hence, P(E) = 11/36", "(ii) (1, 1), (2, 2), (3, 3), (1, 4), (4, 1), (4, 4), (5, 5), (6, 6)", "Number of outcomes having product of two numbers on the top of the dice is a perfect square number = 8 P(E) = 8/36 or 2/9"],
    finalAnswer: "(i) 11/36 (ii) 8/36 or 2/9",
    ncertRef: "PYQ 30/1/3 Q27", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "3" },
  { id: "PYQ-M-2025-PROB-004", subject: "Maths", topicKey: "probability", subtopic: "Coin Tossing", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Three unbiased coins are tossed simultaneously. Find the probability of getting : (a) exactly two tails (b) at least one head (c) at most two heads",
    // Recovered from X_MS_041_Mathematics Standard_30-3-1_2024-25, pp.12-13. The stored text had
    // dropped the leading HHH, HHT from the outcome list and carried a stray "13".
    answer: "Possible outcomes are HHH, HHT, HTH, HTT, THH, THT, TTH, TTT (a) P(exactly two tails) = 3/8 (b) P(atleast one head) = 7/8 (c) P(atmost two heads) = 7/8",
    solutionSteps: ["Possible outcomes are HHH, HHT, HTH, HTT, THH, THT, TTH, TTT", "(a) P(exactly two tails) = 3/8", "(b) P(atleast one head) = 7/8", "(c) P(atmost two heads) = 7/8"],
    finalAnswer: "(a) 3/8 (b) 7/8 (c) 7/8",
    ncertRef: "PYQ 30/3/1 Q30", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-M-2025-PROB-005", subject: "Maths", topicKey: "probability", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If 65% of the population has black eyes, 25% have brown eyes and the remaining have blue eyes, what is the probability that a person selected at random has : (a) blue eyes ? (b) brown or black eyes ?",
    answer: "Population with blue eyes = (100 − 65 − 25)% = 10%. (a) P(blue eyes) = 10/100 = 1/10. (b) P(brown or black eyes) = 90/100 = 9/10.",
    solutionSteps: ["[1 mark] Percentage with blue eyes = 100% − 65% − 25% = 10%.", "[1 mark] (a) P(blue eyes) = 10/100 = 1/10.", "[1 mark] (b) P(brown or black eyes) = (65 + 25)/100 = 90/100 = 9/10."],
    finalAnswer: "(a) 1/10 (b) 9/10",
    ncertRef: "PYQ 30/3/2 Q27", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PROB-006", subject: "Maths", topicKey: "probability", subtopic: "Card Probability", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "All face cards of spades are removed from a pack of 52 playing cards and the remaining pack is shuffled well. A card is then drawn at random from the remaining pack. Find the probability of getting : (a) a face card (b) an ace or a jack",
    answer: "Cards left = 52 − 3 = 49. (a) P(face card) = 9/49. (b) P(ace or jack) = (4 + 3)/49 = 7/49 = 1/7.",
    solutionSteps: ["[1 mark] Removing the 3 face cards of spades leaves 52 − 3 = 49 cards.", "[1 mark] (a) Face cards left = 12 − 3 = 9, so P(face card) = 9/49.", "[1 mark] (b) Aces = 4, jacks left = 3 (jack of spades removed), so P(ace or jack) = 7/49 = 1/7."],
    finalAnswer: "(a) 9/49 (b) 1/7",
    ncertRef: "PYQ 30/3/3 Q26", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PROB-007", subject: "Maths", topicKey: "pair-of-linear-equations", subtopic: "Word Problems", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A bag contains some red and blue balls. Ten percent of the red balls, when added to twenty percent of the blue balls, give a total of 24. If three times the number of red balls exceeds the number of blue balls by 20, find the number of red and blue balls.",
    answer: "Let the number of red balls be x and the number of blue balls be y. Then 10x/100 + 20y/100 = 24, i.e. x + 2y = 240 …(i). Also 3x − y = 20 …(ii). Solving (i) and (ii): x = 40, y = 100. Number of red balls = 40 and number of blue balls = 100.",
    solutionSteps: ["[1 mark] Let the number of red balls be x and the number of blue balls be y.", "[1 mark] 10% of red balls + 20% of blue balls = 24: (10x/100) + (20y/100) = 24 ⇒ x + 2y = 240 …(i).", "[1 mark] Three times the red balls exceeds the blue balls by 20: 3x − y = 20 …(ii).", "[1 mark] From (ii), y = 3x − 20; substitute in (i): x + 2(3x − 20) = 240 ⇒ 7x − 40 = 240 ⇒ 7x = 280 ⇒ x = 40.", "[1 mark] y = 3(40) − 20 = 100. Hence the number of red balls = 40 and the number of blue balls = 100."],
    finalAnswer: "Number of red balls = 40 and number of blue balls = 100.",
    ncertRef: "PYQ 30/1/3 Q33", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2025-PROB-008", competencyVerified: true, subject: "Maths", topicKey: "probability", subtopic: "Card Probability", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Rahul is a lucky charm for his cricket team. He has a jar of cards with numbers from 10 to 74. Before each match, he draws a card from the jar. If the card bears an even number, the team wins. If the number is even and divisible by 5, they win by a big margin. If the number is an odd number less than 30, they win by a small margin. And if the number is a prime number between 50 and 74, they lose. Answer the following questions if Rahul draws a card today : (i) What is the probability that Rahul draws a card with an even number ? 1 (ii) What is the probability that Rahul draws a card with an odd number less than 30 ? 1 (iii) (a) What is the probability that Rahul draws a card with a prime number between 50 and 74 ? 2 OR (b) What is the probability that Rahul draws a card with an even number divisible by 5 ? 2",
    // Recovered from X_MS_041_Mathematics Standard_30-2-1_2024-25, p.17.
    answer: "(i) Total possible outcomes = 74 – 10 + 1 = 65 P (even number) = 33/65 (ii) P (odd number less than 30) = 10/65 or 2/13 (iii) (a) Favourable outcomes are 53, 59, 61, 67, 71, 73 Number of favourable outcomes = 6 P (prime number between 50 and 74) = 6/65 OR (b) Favourable outcomes are 10, 20, 30, 40, 50, 60, 70 Number of favourble outcomes = 7 P (even number divisble by 5) = 7/65",
    solutionSteps: ["[1 mark] (i) Total possible outcomes = 74 − 10 + 1 = 65. Even numbers 10, 12, …, 74 number 33, so P(even) = 33/65.", "[1 mark] (ii) Odd numbers less than 30 are 11, 13, …, 29 (10 numbers), so P(odd < 30) = 10/65 = 2/13.", "[1 mark] (iii)(a) Prime numbers between 50 and 74 are 53, 59, 61, 67, 71, 73 — 6 favourable outcomes.", "[1 mark] (iii)(a) P(prime between 50 and 74) = 6/65. [OR (b) even numbers divisible by 5 are 10, 20, 30, 40, 50, 60, 70 (7 outcomes), so P = 7/65.]"],
    finalAnswer: "(i) P(even) = 33/65; (ii) P(odd < 30) = 2/13; (iii)(a) P(prime 50–74) = 6/65 OR (b) P(even divisible by 5) = 7/65.",
    ncertRef: "PYQ 30/2/1 Q37", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
];
