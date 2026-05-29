import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Probability — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10SM7, Maths10PS4, Maths10AS4, Maths10AKP7, Maths10GS2, Maths10SR3,
 *   Maths10NK4, Maths10SM4, Maths10DP6, Maths10PR8(c), Maths10AKP11, Maths10ASR3,
 *   Maths10PR4.
 * Content References 10S2a (probabilities of equally likely outcomes) and 10S2b
 *   (probabilities of an event in simple problems) mapped to topicKey "probability".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * Section distribution: A=11, B=3.
 */
export const PROB_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-PROB-A-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Complement of an Event",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In the large box full of doughnuts, 13 of the 52 doughnuts are chocolate, and the rest are strawberry doughnuts. Leena takes a doughnut from the box at random. Find the probability that Leena's doughnut is not chocolate.",
    "options": [],
    "answer": "3/4",
    "solutionSteps": [
      "[1 mark] Number not chocolate = 52 − 13 = 39, so P(not chocolate) = 39/52 = 3/4. (Accept 39/52.)"
    ],
    "finalAnswer": "3/4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-002",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Complement of an Event",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "If R is the event that it will rain tomorrow, such that P(R) = 0.03, then P(R̅) =",
    "options": [
      "A. 0.07",
      "B. 0.09",
      "C. 0.79",
      "D. 0.97"
    ],
    "answer": "D. 0.97",
    "solutionSteps": [
      "[1 mark] P(R̅) = 1 − P(R) = 1 − 0.03 = 0.97. Answer: D."
    ],
    "finalAnswer": "D. 0.97",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-003",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability from Number Cards",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Cards numbered 7 to 40 were put in a box. Anish selects a card at random. What is the probability that the selected card is a multiple of 7?",
    "options": [
      "A. 34/7",
      "B. 5/34",
      "C. 6/35",
      "D. 7/35"
    ],
    "answer": "B. 5/34",
    "solutionSteps": [
      "[1 mark] Total possible outcomes = 34; multiples of 7 are 7, 14, 21, 28, 35 → 5 favourable. P = 5/34. Answer: B."
    ],
    "finalAnswer": "B. 5/34",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-004",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability with a Deck of Cards",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "From a well-shuffled deck of playing cards a card is drawn at random. What is the probability for the card to be a face card?",
    "options": [],
    "answer": "12/52",
    "solutionSteps": [
      "[1 mark] There are 12 face cards in a standard deck, so P(a face card) = 12/52."
    ],
    "finalAnswer": "12/52",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-005",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Range of Probability Values",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Which of the following cannot be the probability of an event?",
    "options": [
      "i. −5/7",
      "ii. 0",
      "iii. 19%",
      "iv. 1"
    ],
    "answer": "i. −5/7",
    "solutionSteps": [
      "[1 mark] Probability cannot be less than 0, so −5/7 cannot be the probability of an event. Answer: (i)."
    ],
    "finalAnswer": "i. −5/7",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-006",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability with a Deck of Cards",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If all cards of diamond are removed from the deck, find the probability that a card drawn at random from the deck is a red jack.",
    "options": [],
    "answer": "1/39",
    "solutionSteps": [
      "[1 mark] After removing all 13 diamond cards: 52 − 13 = 39 cards remain. Only 1 red jack remains (jack of hearts), so P(a red jack) = 1/39."
    ],
    "finalAnswer": "1/39",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-007",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability with a Deck of Cards",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "From a well-shuffled deck of playing cards a card is drawn at random. What is the probability that the card drawn is a jack or an ace?",
    "options": [],
    "answer": "8/52",
    "solutionSteps": [
      "[1 mark] There are 4 aces and 4 jacks, so 8 favourable cards. P(a jack or an ace) = 8/52."
    ],
    "finalAnswer": "8/52",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-008",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Complement of an Event",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A card is drawn at random from a pack of well-shuffled 52 cards. What is the probability that the card drawn is not an ace?",
    "options": [
      "A. 1/13",
      "B. 4/13",
      "C. 9/13",
      "D. 12/13"
    ],
    "answer": "D. 12/13",
    "solutionSteps": [
      "[1 mark] There are 4 aces, so 48 non-ace cards. P(not an ace) = 48/52 = 12/13. Answer: D."
    ],
    "finalAnswer": "D. 12/13",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-009",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability with a Deck of Cards",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "What is the probability of choosing a black card or a ten from a deck of playing cards?",
    "options": [
      "A. 1/2",
      "B. 7/13",
      "C. 1/13",
      "D. 2/13"
    ],
    "answer": "7/13",
    "solutionSteps": [
      "[1 mark] Black cards = 26, plus the two red tens = 28 favourable cards. P = 28/52 = 7/13."
    ],
    "finalAnswer": "7/13",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-010",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability from Number Cards",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "T-shirts marked with numbers 2 to 101 are placed in a box. Sarita is fond of numbers which are perfect squares. When her turn comes, she randomly takes out a T-shirt from this box; what is the probability of getting her favourite T-shirt?",
    "options": [
      "A. 9/100",
      "B. 3/10",
      "C. 1/10",
      "D. 19/100"
    ],
    "answer": "A. 9/100",
    "solutionSteps": [
      "[1 mark] Perfect squares from 2 to 101 are 4, 9, 16, 25, 36, 49, 64, 81, 100 → 9 of them. Total T-shirts = (101 − 2) + 1 = 100. P(perfect square) = 9/100. Answer: A."
    ],
    "finalAnswer": "A. 9/100",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-011",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability from Number Cards",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "A bag contains 10 cards. Each card is labelled with a different number from 1 to 10. A card is chosen from the bag at random. Write down the probability that the chosen card is of a prime number.",
    "options": [],
    "answer": "2/5",
    "solutionSteps": [
      "[1 mark] Primes from 1 to 10 are 2, 3, 5, 7 → 4 favourable out of 10. P(prime) = 4/10 = 2/5."
    ],
    "finalAnswer": "2/5",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-012",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability of an Event in Simple Problems",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A number x is chosen at random from the numbers −2, −1, 0, 1, 2. Then the probability of x² < 2 is",
    "options": [
      "A. 1/5",
      "B. 2/5",
      "C. 3/5",
      "D. 4/5"
    ],
    "answer": "C. 3/5",
    "solutionSteps": [
      "[1 mark] Values with x² < 2 are x = −1, 0, 1 → 3 favourable out of 5. P(x² < 2) = 3/5. Answer: C."
    ],
    "finalAnswer": "C. 3/5",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-013",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Tossing Coins",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Two fair coins are tossed together. What is the probability of getting at least one head?",
    "options": [
      "A. 25%",
      "B. 50%",
      "C. 75%",
      "D. 100%"
    ],
    "answer": "C. 75%",
    "solutionSteps": [
      "[1 mark] Sample space = {HH, HT, TH, TT}; outcomes with at least one head = 3. P = 3/4 = 75%. Answer: C."
    ],
    "finalAnswer": "C. 75%",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-A-014",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Coin and Die Combined",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A coin is tossed, and a die is rolled simultaneously. What is the probability of getting a head or an even number in the event?",
    "options": [
      "A. 0.25",
      "B. 0.5",
      "C. 0.75",
      "D. 1"
    ],
    "answer": "C. 0.75",
    "solutionSteps": [
      "[1 mark] Sample space = {H1,…,H6, T1,…,T6} = 12 outcomes. Favourable (head or even number) = H1, H2, H3, H4, H5, H6, T2, T4, T6 = 9 outcomes. P = 9/12 = 3/4 = 0.75. Answer: C."
    ],
    "finalAnswer": "C. 0.75",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-B-001",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability as a Fraction in Lowest Terms",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In the large box full of doughnuts, 13 of the 52 doughnuts are chocolate, and the rest are strawberry doughnuts. Leena takes a doughnut from the box at random. Find the probability that Leena's doughnut is chocolate. Give your answer as a fraction in its lowest terms.",
    "options": [],
    "answer": "1/4",
    "solutionSteps": [
      "[1 mark] Correct probability in any form: P(chocolate) = 13/52.",
      "[1 mark] Express in lowest terms: 13/52 = 1/4."
    ],
    "finalAnswer": "1/4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PROB-B-002",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability in a Game (Spinner)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Diwali Fest is an annual South Asian arts & culture festival produced by the Diwali Celebration Society. In the Diwali fest, a game is played with a fair spinner (shown). The numbers on the spinner are 2, 5, 7, 9, 12, 16. Sometimes the owner will invite a player who does not win with the spinner to throw the dice as a free bonus. What is the probability that a player will get a special prize because the spinner stops on a perfect square? Show your working.",
    "options": [],
    "answer": "1/3",
    "solutionSteps": [
      "[1 mark] Identify perfect squares among 2, 5, 7, 9, 12, 16: these are 9 and 16 → 2 favourable out of 6.",
      "[1 mark] P(perfect square) = 2/6 = 1/3 (or 0.33)."
    ],
    "finalAnswer": "1/3",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A fair circular spinner divided into six equal sectors labelled with the numbers 2, 5, 7, 9, 12 and 16."
  },
  {
    "id": "CBE-M-PROB-B-003",
    "subject": "Maths",
    "topicKey": "probability",
    "subtopic": "Probability in a Game (Die)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the Diwali fest game, if the player gets a chance to throw a dice (as a free bonus after not winning with the fair spinner), what is the probability of getting a multiple of 2 on the dice? Show your working.",
    "options": [],
    "answer": "1/2",
    "solutionSteps": [
      "[1 mark] Identify outcomes that are multiples of 2 on a die: 2, 4 and 6 → 3 favourable out of 6.",
      "[1 mark] P(multiple of 2) = 3/6 = 1/2 (or 0.5)."
    ],
    "finalAnswer": "1/2",
    "isCompetencyBased": true
  }
];
