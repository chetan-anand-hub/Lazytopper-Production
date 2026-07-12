import type { CanonicalQuestion } from "../../../predictionTypes";

export const RN_EXTRACT2: CanonicalQuestion[] = [
  {
    "id": "RNX2-A-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The LCM of the smallest two-digit composite number and the smallest composite number is",
    "options": [
      "4",
      "10",
      "20",
      "40"
    ],
    "answer": "20",
    "solutionSteps": [
      "[1 mark] Smallest two-digit composite number = 10 = 2 x 5; smallest composite number = 4 = 2^2. LCM = 2^2 x 5 = 20."
    ],
    "finalAnswer": "20",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-A-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "For what least value of the natural number n is 24^n divisible by 10? Justify your answer.",
    "options": [],
    "answer": "No natural number n makes 24^n divisible by 10.",
    "solutionSteps": [
      "[1 mark] 24^n = (2^3 x 3)^n = 2^(3n) x 3^n. Its prime factorisation contains no factor 5, and a number is divisible by 10 only if it has both 2 and 5 as factors. By the uniqueness of the Fundamental Theorem of Arithmetic, 24^n can never be divisible by 10 — there is no such value of n."
    ],
    "finalAnswer": "No value of n exists.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-A-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Assertion (A): There is no natural number n for which 4^n ends with the digit zero.\nReason (R): A number ends with the digit zero if and only if its prime factorisation contains both 2 and 5 as factors.\nChoose the correct option:",
    "options": [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is not the correct explanation of A",
      "A is true but R is false",
      "A is false but R is true"
    ],
    "answer": "Both A and R are true and R is the correct explanation of A",
    "solutionSteps": [
      "[1 mark] 4^n = 2^(2n) has only the prime 2 and no factor 5, so by R it can never end with 0 — A is true. R correctly states the terminal-zero condition and directly explains A. Hence both are true and R explains A."
    ],
    "finalAnswer": "(a) Both A and R are true and R is the correct explanation of A",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-A-004",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If n = 2^3 x 3^4 x 5^4 x 7, then the number of consecutive zeros at the end of n is",
    "options": [
      "2",
      "3",
      "4",
      "7"
    ],
    "answer": "3",
    "solutionSteps": [
      "[1 mark] A terminal zero needs a pair of factors 2 and 5, so the number of trailing zeros = min(power of 2, power of 5) = min(3, 4) = 3."
    ],
    "finalAnswer": "3",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-B-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Is it possible that the HCF and LCM of two numbers are 24 and 540 respectively? Justify your answer.",
    "options": [],
    "answer": "No, it is not possible.",
    "solutionSteps": [
      "[1 mark] For any two positive integers, the HCF always divides the LCM (the LCM is a multiple of the HCF).",
      "[1 mark] Here 540 / 24 = 22.5, which is not an integer, so 24 does not divide 540. Hence such a pair of numbers cannot exist."
    ],
    "finalAnswer": "No — 24 does not divide 540, so it is impossible.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-B-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Write the smallest number which is divisible by both 306 and 657.",
    "options": [],
    "answer": "22338",
    "solutionSteps": [
      "[1 mark] Prime factorise: 306 = 2 x 3^2 x 17 and 657 = 3^2 x 73. The required smallest number is LCM(306, 657).",
      "[1 mark] LCM = 2 x 3^2 x 17 x 73 = 22338."
    ],
    "finalAnswer": "22338",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-B-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "\"The product of three consecutive positive integers is divisible by 6.\" Is this statement true or false? Justify your answer.",
    "options": [],
    "answer": "True",
    "solutionSteps": [
      "[1 mark] Among any three consecutive positive integers, at least one is even (a multiple of 2) and exactly one is a multiple of 3.",
      "[1 mark] Therefore the product contains both 2 and 3 as factors, so it is divisible by 2 x 3 = 6. The statement is TRUE."
    ],
    "finalAnswer": "True — the product always has 2 and 3 as factors, hence is divisible by 6.",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-C-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Fundamental Theorem of Arithmetic",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Using prime factorisation, find the LCM of 2520 and 10530. Which property of the Fundamental Theorem of Arithmetic makes this factorisation unique?",
    "options": [],
    "answer": "294840",
    "solutionSteps": [
      "[1 mark] Prime factorise: 2520 = 2^3 x 3^2 x 5 x 7 and 10530 = 2 x 3^4 x 5 x 13.",
      "[1 mark] LCM = product of the highest power of each prime = 2^3 x 3^4 x 5 x 7 x 13 = 294840.",
      "[1 mark] The Fundamental Theorem of Arithmetic guarantees that the prime factorisation of each number is unique (apart from the order of the factors), so the LCM obtained this way is well-defined."
    ],
    "finalAnswer": "LCM(2520, 10530) = 294840",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-C-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ashok has two vessels containing 720 mL and 405 mL of milk respectively. The milk in each vessel is poured into glasses of equal capacity, filled to the brim. Find the minimum number of glasses that can be filled with all the milk.",
    "options": [],
    "answer": "25 glasses",
    "solutionSteps": [
      "[1 mark] For the fewest glasses the capacity must be the largest volume that measures both amounts exactly, i.e. HCF(720, 405).",
      "[1 mark] 720 = 2^4 x 3^2 x 5 and 405 = 3^4 x 5, so HCF = 3^2 x 5 = 45 mL.",
      "[1 mark] Number of glasses = 720/45 + 405/45 = 16 + 9 = 25 glasses."
    ],
    "finalAnswer": "25 glasses (each of 45 mL)",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-C-004",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A merchant has 120 litres of oil of one kind, 180 litres of another kind and 240 litres of a third kind. He wants to sell the oil by filling all three kinds into tins of equal capacity. What is the greatest capacity of such a tin, and how many tins are needed?",
    "options": [],
    "answer": "60 litres; 9 tins",
    "solutionSteps": [
      "[1 mark] The greatest capacity that measures all three volumes exactly is HCF(120, 180, 240).",
      "[1 mark] 120 = 2^3 x 3 x 5, 180 = 2^2 x 3^2 x 5, 240 = 2^4 x 3 x 5, so HCF = 2^2 x 3 x 5 = 60 litres.",
      "[1 mark] Tins = 120/60 + 180/60 + 240/60 = 2 + 3 + 4 = 9 tins."
    ],
    "finalAnswer": "Greatest capacity = 60 litres; 9 tins needed",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
  {
    "id": "RNX2-C-006",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF and LCM by Prime Factorisation",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In a school, class X has two sections A and B with 32 and 36 students respectively. Determine the minimum number of books required for the class library so that they can be distributed equally among all students of section A, or equally among all students of section B.",
    "options": [],
    "answer": "288 books",
    "solutionSteps": [
      "[1 mark] The number must be divisible by both 32 and 36, so the minimum is LCM(32, 36).",
      "[1 mark] 32 = 2^5 and 36 = 2^2 x 3^2.",
      "[1 mark] LCM = 2^5 x 3^2 = 288 books."
    ],
    "finalAnswer": "288 books",
    "isCompetencyBased": false,
    "requiresDiagram": false
  },
];
