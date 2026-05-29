import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Real Numbers — CBSE CBE Item Bank (Competency-based education for CBSE), Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10GS1, Maths10SR1, Maths10AS9, Maths10SR5, Maths10AKP5, Maths10MM1,
 *   Maths10MM2, Maths10PR5a, Maths10PR5b, Maths10PR1, Math10MM9, Maths10MM10, Maths10ASR5.
 * Content References 10N1a (Fundamental Theorem of Arithmetic — prime factorisation/HCF/LCM)
 *   and 10N1c (apply FTA to real-life contexts) mapped to CBSE chapter topicKey "real-numbers".
 * Extracted: 2026-05-29 (Sprint 1 — CBSE Official). pyqYear OMITTED (item-bank, not PYQ).
 * SKIPPED: all 10N1d items (decimal representation / terminating decimals) — banned from
 *   2026-27 syllabus. Maths10PS1 also skipped (despite 10N1a tag, it tests terminating
 *   decimal expansion). Maths10AD8 skipped — 4 non-case marks map to no valid section.
 * Section distribution: A=5, B=6, C=2.
 */
export const RN_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-RN-A-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Prime Factorisation (Fundamental Theorem of Arithmetic)",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Express 255 as a product of prime factors.",
    "options": [],
    "answer": "255 = 3 × 5 × 17",
    "solutionSteps": [
      "[1 mark] By prime factorisation, 255 = 3 × 5 × 17."
    ],
    "finalAnswer": "255 = 3 × 5 × 17",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-RN-A-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Three cubical warehouses of volume 165 m³, 195 m³ and 285 m³ are to be used for storage. What is the volume of the greatest cubical box that can be kept in the warehouse so that no space is left vacant?",
    "options": [
      "A. 6 m³",
      "B. 15 m³",
      "C. 5 m³",
      "D. 3 m³"
    ],
    "answer": "B. 15 m³",
    "solutionSteps": [
      "[1 mark] Required volume = HCF(165, 195, 285) = 15 m³. Answer: B."
    ],
    "finalAnswer": "B. 15 m³",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-A-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Shilpi wants to organize a party. She has 36 kiwis and 60 oranges at home and decided to distribute them equally among all. She decides to add 42 apples also. In this case, how many maximum guests can she invite?",
    "options": [
      "A. 6",
      "B. 12",
      "C. 120",
      "D. 180"
    ],
    "answer": "A. 6",
    "solutionSteps": [
      "[1 mark] Maximum guests = HCF(36, 60, 42) = 6. Answer: A."
    ],
    "finalAnswer": "A. 6",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-A-004",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Shweta wants to organize a party. She has 336 guavas and 54 oranges at home and decided to distribute them equally among all. How many maximum guests can she invite?",
    "options": [
      "A. 6",
      "B. 9",
      "C. 56",
      "D. 3024"
    ],
    "answer": "A. 6",
    "solutionSteps": [
      "[1 mark] 336 = 56 × 6 and 54 = 9 × 6, so HCF(336, 54) = 6 = maximum guests. Answer: A."
    ],
    "finalAnswer": "A. 6",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-A-005",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "LCM in Real-Life Context",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "There are five bells placed at different swings in a park, which toll at intervals of 2, 3, 5, 6, and 10 minutes, respectively. They all toll together when the park is open for visitors at 10:00 AM. How many more times do they all toll together till the park is closed at 8:00 PM?",
    "options": [
      "A. 10",
      "B. 20",
      "C. 30",
      "D. 60"
    ],
    "answer": "B. 20",
    "solutionSteps": [
      "[1 mark] LCM(2, 3, 5, 6, 10) = 30, so the bells toll together every 30 minutes. From 10:00 AM to 8:00 PM is 10 hours = 600 minutes; 600 ÷ 30 = 20 more times. Answer: B."
    ],
    "finalAnswer": "B. 20",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-B-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "Prime Factorisation — Sum of Exponents",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Find the sum of exponents of prime factors in the prime factorization of 21600.",
    "options": [],
    "answer": "10",
    "solutionSteps": [
      "[1 mark] Prime factorisation of 21600 = 2⁵ × 3³ × 5².",
      "[1 mark] Sum of exponents = 5 + 3 + 2 = 10."
    ],
    "finalAnswer": "10",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-RN-B-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "LCM in Real-Life Context",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "LED light arrangements are made in a marriage function. Yellow lights will flicker every 3 seconds, red lights will flicker every 4 seconds, and green lights will flicker every 5 seconds. How many times will all the three lights flicker together in 30 minutes?",
    "options": [],
    "answer": "30 times",
    "solutionSteps": [
      "[1 mark] LCM(3, 4, 5) = 60, so all three lights flicker together every 60 seconds = 1 minute.",
      "[1 mark] In 30 minutes the lights flicker together 30 ÷ 1 = 30 times."
    ],
    "finalAnswer": "30 times",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-B-003",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF Remainder in Real-Life Context",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Radha has 30 English books and 54 Mathematics books which she stacks so that each stack has the same number of books of a single subject (the minimum number of stacks). Her friend, Sona, brings 70 Science books and arranges them in the same manner with the same number of books in each stack as for English and Mathematics. How many Science books are left over after they are arranged in stacks of the same number as for English and Mathematics?",
    "options": [],
    "answer": "4 Science books",
    "solutionSteps": [
      "[1 mark] The number of books per stack is HCF(30, 54) = 6, so 70 ÷ 6 = 11 remainder 4.",
      "[1 mark] Therefore 4 Science books are left over."
    ],
    "finalAnswer": "4 Science books",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-B-004",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "LCM in Real-Life Context",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The traffic lights at three different road crossings change after every 48 sec, 72 sec and 108 sec respectively. If they all change simultaneously at 9:20:00 hrs, when will they again change simultaneously?",
    "options": [],
    "answer": "9:27:12 hrs",
    "solutionSteps": [
      "[1 mark] LCM(48, 72, 108) = 432 seconds.",
      "[½ mark] 432 seconds = 7 min 12 sec.",
      "[½ mark] 9 hr 20 min 0 sec + 7 min 12 sec = 9:27:12 hrs."
    ],
    "finalAnswer": "9:27:12 hrs",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-B-005",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In a conference, the number of participants in the Army, Navy, and Airforce are 60, 84 and 108, respectively. Find the minimum number of rooms required if the same number of participants are to be seated in each room and all of them being in the same department.",
    "options": [],
    "answer": "21 rooms",
    "solutionSteps": [
      "[1 mark] HCF(60, 84, 108) = 12 participants per room.",
      "[1 mark] Number of rooms = (60 + 84 + 108) ÷ 12 = 252 ÷ 12 = 21."
    ],
    "finalAnswer": "21 rooms",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-B-006",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Bhargav has 455 erasers and 210 pencils. He wants to distribute them in groups, each with the same combination of erasers and pencils, with none left over. What is the greatest number of groups Bhargav can distribute?",
    "options": [],
    "answer": "35 groups",
    "solutionSteps": [
      "[1 mark] 455 = 5 × 7 × 13 and 210 = 2 × 3 × 5 × 7.",
      "[1 mark] HCF(455, 210) = 5 × 7 = 35, so the greatest number of groups is 35."
    ],
    "finalAnswer": "35 groups",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-C-001",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "There are 156, 208 and 260 students in groups A, B, and C respectively. Buses are hired for an educational trip. Find the minimum number of buses to be hired if all buses have the same number of students.",
    "options": [],
    "answer": "12 buses",
    "solutionSteps": [
      "[1 mark] To minimise the number of buses, the number of students per bus must be the largest common factor, i.e. HCF(156, 208, 260).",
      "[1 mark] 156 = 2² × 3 × 13, 208 = 2⁴ × 13, 260 = 2² × 5 × 13, so HCF = 2² × 13 = 52 students per bus.",
      "[1 mark] Number of buses = (156 + 208 + 260) ÷ 52 = 624 ÷ 52 = 12."
    ],
    "finalAnswer": "12 buses",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-RN-C-002",
    "subject": "Maths",
    "topicKey": "real-numbers",
    "subtopic": "HCF in Real-Life Context",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Radha has 30 English books and 54 Mathematics books. She wants to stack them in such a way that each stack has the same number of books of a single subject. Find the minimum number of stacks possible in this arrangement.",
    "options": [],
    "answer": "14 stacks",
    "solutionSteps": [
      "[1 mark] 30 = 2 × 3 × 5 and 54 = 2 × 3 × 3 × 3, so HCF(30, 54) = 2 × 3 = 6 books per stack.",
      "[1 mark] Number of English stacks = 30 ÷ 6 = 5 and Mathematics stacks = 54 ÷ 6 = 9.",
      "[1 mark] Total stacks = 5 + 9 = 14."
    ],
    "finalAnswer": "14 stacks",
    "isCompetencyBased": true
  }
];
