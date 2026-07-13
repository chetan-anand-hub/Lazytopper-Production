import type { CanonicalQuestion } from "../../../predictionTypes";

export const AP_EXPAND_CASE_E: CanonicalQuestion[] = [
  {
    "id": "BX-AP-E-002",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A city taxi charges ₹20 for the 1st kilometre and ₹12 more for each successive kilometre than the previous one. So the amounts charged for the 1st, 2nd, 3rd … km are ₹20, ₹32, ₹44, …\n(i) What is the first term of this AP?\n(ii) How much is charged for the 6th kilometre alone?\n(iii) For which kilometre is the charge ₹128?\n(iv) After how many kilometres does the total fare become ₹740?",
    "solutionSteps": [
      "[1 mark] The first term a = ₹20.",
      "[1 mark] a₆ = a + 5d = 20 + 5 × 12 = 20 + 60 = ₹80.",
      "[1 mark] 20 + (n − 1) × 12 = 128 ⇒ (n − 1) × 12 = 108 ⇒ n − 1 = 9 ⇒ n = 10, the 10th km.",
      "[1 mark] n/2 [40 + (n − 1)12] = 740 ⇒ 12n² + 28n − 1480 = 0 ⇒ 3n² + 7n − 370 = 0 ⇒ n = 10 km."
    ],
    "finalAnswer": "(i) a = ₹20; (ii) ₹80; (iii) 10th km; (iv) 10 km.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-003",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A newly planted sapling is 8 cm tall at the end of week 1, and it grows a steady 3 cm every week thereafter, giving heights 8, 11, 14, … cm.\n(i) What is the common difference of the height AP?\n(ii) What is the sapling's height at the end of week 10?\n(iii) In which week does the height first exceed 50 cm?\n(iv) In which week is the height exactly 38 cm?",
    "solutionSteps": [
      "[1 mark] d = 11 − 8 = 3 cm.",
      "[1 mark] a₁₀ = 8 + 9 × 3 = 8 + 27 = 35 cm.",
      "[1 mark] 8 + (n − 1)3 > 50 ⇒ (n − 1) > 14 ⇒ n ≥ 16; at week 16 height = 8 + 45 = 53 cm, so week 16.",
      "[1 mark] 8 + (n − 1)3 = 38 ⇒ (n − 1)3 = 30 ⇒ n − 1 = 10 ⇒ n = 11, week 11."
    ],
    "finalAnswer": "(i) d = 3 cm; (ii) 35 cm; (iii) week 16; (iv) week 11.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-004",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A pump delivers 5 litres of water in the 1st minute, and 4 litres more in each following minute than the minute before, i.e. 5, 9, 13, … litres.\n(i) How much water is delivered in the 1st minute?\n(ii) Find the total water delivered in the first 15 minutes.\n(iii) After how many minutes does the total delivered reach 230 litres?\n(iv) Is the per-minute delivery an AP? Justify.",
    "solutionSteps": [
      "[1 mark] Water in the 1st minute = a = 5 litres.",
      "[1 mark] S₁₅ = 15/2 [2 × 5 + 14 × 4] = 15/2 [10 + 56] = 15/2 × 66 = 15 × 33 = 495 litres.",
      "[1 mark] n/2 [10 + (n − 1)4] = 230 ⇒ 4n² + 6n − 460 = 0 ⇒ 2n² + 3n − 230 = 0 ⇒ n = 10 minutes.",
      "[1 mark] Yes; each minute's delivery exceeds the previous by a constant 4 litres, so it is an AP with d = 4."
    ],
    "finalAnswer": "(i) 5 litres; (ii) 495 litres; (iii) 10 minutes; (iv) Yes, AP with d = 4.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-005",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "To finish a 20-day reading challenge, Ravi reads 12 pages on day 1 and 4 pages more each following day than the day before.\n(i) What is the common difference of the daily-pages AP?\n(ii) How many pages does he read on the last (20th) day?\n(iii) Find the total number of pages he reads over the 20 days.\n(iv) On which day does he read exactly 60 pages?",
    "solutionSteps": [
      "[1 mark] d = 4 pages per day.",
      "[1 mark] Last term a₂₀ = 12 + 19 × 4 = 12 + 76 = 88 pages.",
      "[1 mark] S₂₀ = 20/2 (a + l) = 10 × (12 + 88) = 10 × 100 = 1000 pages.",
      "[1 mark] 12 + (n − 1)4 = 60 ⇒ (n − 1)4 = 48 ⇒ n − 1 = 12 ⇒ n = 13, day 13."
    ],
    "finalAnswer": "(i) d = 4; (ii) 88 pages; (iii) 1000 pages; (iv) day 13.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-006",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In a fitness plan, a trainee does 10 push-ups on day 1 and adds 2 more push-ups each day, giving 10, 12, 14, … per day.\n(i) How many push-ups are done on day 1?\n(ii) By how many push-ups does day 10 exceed day 5?\n(iii) How many push-ups are done on day 15?\n(iv) Find the total push-ups done in the first 12 days.",
    "solutionSteps": [
      "[1 mark] Day-1 push-ups = a = 10.",
      "[1 mark] a₁₀ − a₅ = (a + 9d) − (a + 4d) = 5d = 5 × 2 = 10 push-ups.",
      "[1 mark] a₁₅ = 10 + 14 × 2 = 10 + 28 = 38 push-ups.",
      "[1 mark] S₁₂ = 12/2 [2 × 10 + 11 × 2] = 6 [20 + 22] = 6 × 42 = 252 push-ups."
    ],
    "finalAnswer": "(i) 10; (ii) 10 more; (iii) 38; (iv) 252.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-007",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "While training for a run, Meera covers 3 km on day 1 and increases her distance by a fixed 2 km each day: 3, 5, 7, … km.\n(i) Is the daily-distance list an AP? Justify.\n(ii) What is the common difference?\n(iii) What distance does she cover on day 10?\n(iv) After how many days does her total distance reach 120 km?",
    "solutionSteps": [
      "[1 mark] Yes; consecutive differences 5 − 3 = 2 and 7 − 5 = 2 are constant, so it is an AP.",
      "[1 mark] d = 2 km.",
      "[1 mark] a₁₀ = 3 + 9 × 2 = 3 + 18 = 21 km.",
      "[1 mark] n/2 [6 + (n − 1)2] = 120 ⇒ n² + 2n − 120 = 0 ⇒ (n − 10)(n + 12) = 0 ⇒ n = 10 days."
    ],
    "finalAnswer": "(i) Yes, AP; (ii) d = 2 km; (iii) 21 km; (iv) 10 days.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-008",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A company offers a fresh recruit a starting annual salary of ₹18,000 with a fixed yearly increment of ₹1,500. The yearly salaries are ₹18000, ₹19500, ₹21000, …\n(i) What is the common difference of the salary AP?\n(ii) In which year does the salary first become ₹30,000?\n(iii) What is the salary in the 10th year?\n(iv) Find the total salary earned over the 10 years.",
    "solutionSteps": [
      "[1 mark] d = 19500 − 18000 = ₹1500.",
      "[1 mark] 18000 + (n − 1)1500 = 30000 ⇒ (n − 1)1500 = 12000 ⇒ n − 1 = 8 ⇒ n = 9, the 9th year.",
      "[1 mark] a₁₀ = 18000 + 9 × 1500 = 18000 + 13500 = ₹31,500.",
      "[1 mark] S₁₀ = 10/2 [2 × 18000 + 9 × 1500] = 5 [36000 + 13500] = 5 × 49500 = ₹2,47,500."
    ],
    "finalAnswer": "(i) ₹1500; (ii) 9th year; (iii) ₹31,500; (iv) ₹2,47,500.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-009",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "On a 10-day cycling tour, a rider covers 40 km on day 1 and 5 km more each day than the previous day: 40, 45, 50, … km.\n(i) What distance is covered on day 1?\n(ii) What distance is covered on day 7?\n(iii) Using the last day's distance, find the total distance of the whole tour.\n(iv) On which day does the daily distance first exceed 80 km?",
    "solutionSteps": [
      "[1 mark] Day-1 distance = a = 40 km.",
      "[1 mark] a₇ = 40 + 6 × 5 = 40 + 30 = 70 km.",
      "[1 mark] Last day a₁₀ = 40 + 9 × 5 = 85 km; total S₁₀ = 10/2 (40 + 85) = 5 × 125 = 625 km.",
      "[1 mark] 40 + (n − 1)5 > 80 ⇒ (n − 1) > 8 ⇒ n ≥ 10; day 10 gives 85 km, so day 10."
    ],
    "finalAnswer": "(i) 40 km; (ii) 70 km; (iii) 625 km; (iv) day 10.",
    "isCompetencyBased": true,
    "strategyHint": "For a total when the last term is known, use Sₙ = n/2 (a + l)."
  },
  {
    "id": "BX-AP-E-010",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "A machine bought for ₹1,00,000 loses a fixed ₹8,000 of value every year. Its values at the end of years 1, 2, 3, … are ₹92000, ₹84000, ₹76000, …\n(i) What is the common difference of the value AP?\n(ii) What is the machine's value at the end of year 5?\n(iii) At the end of which year is the value ₹36,000?\n(iv) By how much does the year-2 value exceed the year-6 value?",
    "solutionSteps": [
      "[1 mark] d = 84000 − 92000 = −₹8000.",
      "[1 mark] a₅ = 92000 + 4 × (−8000) = 92000 − 32000 = ₹60,000.",
      "[1 mark] 92000 + (n − 1)(−8000) = 36000 ⇒ (n − 1)8000 = 56000 ⇒ n − 1 = 7 ⇒ n = 8, end of year 8.",
      "[1 mark] a₂ − a₆ = (a + d) − (a + 5d) = −4d = −4 × (−8000) = ₹32,000."
    ],
    "finalAnswer": "(i) −₹8000; (ii) ₹60,000; (iii) year 8; (iv) ₹32,000.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-011",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A sports meet gives 12 cash prizes. The 1st prize is ₹3000 and each next prize is ₹150 less than the one before it: ₹3000, ₹2850, ₹2700, …\n(i) What is the common difference of the prize AP?\n(ii) What is the value of the smallest (12th) prize?\n(iii) Find the total prize money distributed.\n(iv) By how much does the 3rd prize exceed the 8th prize?",
    "solutionSteps": [
      "[1 mark] d = 2850 − 3000 = −₹150.",
      "[1 mark] a₁₂ = 3000 + 11 × (−150) = 3000 − 1650 = ₹1350.",
      "[1 mark] S₁₂ = 12/2 [2 × 3000 + 11 × (−150)] = 6 [6000 − 1650] = 6 × 4350 = ₹26,100.",
      "[1 mark] a₃ − a₈ = −5d = −5 × (−150) = ₹750."
    ],
    "finalAnswer": "(i) −₹150; (ii) ₹1350; (iii) ₹26,100; (iv) ₹750.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-012",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A fruit-seller stacks oranges in a pyramid: 25 in the bottom row, and each row above has one orange fewer: 25, 24, 23, …\n(i) How many oranges are in the bottom row?\n(ii) If the whole pyramid uses 270 oranges, how many rows are there?\n(iii) How many oranges are in the 8th row from the bottom?\n(iv) How many oranges are in the top row?",
    "solutionSteps": [
      "[1 mark] Bottom row = a = 25 oranges.",
      "[1 mark] n/2 [50 + (n − 1)(−1)] = 270 ⇒ n(51 − n) = 540 ⇒ n² − 51n + 540 = 0 ⇒ (n − 15)(n − 36) = 0 ⇒ n = 15 (n = 36 rejected).",
      "[1 mark] a₈ = 25 + 7 × (−1) = 25 − 7 = 18 oranges.",
      "[1 mark] Top row is the 15th: a₁₅ = 25 + 14 × (−1) = 25 − 14 = 11 oranges."
    ],
    "finalAnswer": "(i) 25; (ii) 15 rows; (iii) 18; (iv) 11.",
    "isCompetencyBased": true,
    "strategyHint": "Reject the root that makes a later term negative."
  },
  {
    "id": "BX-AP-E-013",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "For a concert, decorative bulbs are fixed in rows: 6 bulbs in row 1, and 4 more bulbs in each higher row: 6, 10, 14, …\n(i) What is the common difference of the bulb AP?\n(ii) In which row does the number of bulbs first exceed 40?\n(iii) Find the total number of bulbs in the first 8 rows.\n(iv) Which row has exactly 50 bulbs?",
    "solutionSteps": [
      "[1 mark] d = 10 − 6 = 4 bulbs.",
      "[1 mark] 6 + (n − 1)4 > 40 ⇒ (n − 1) > 8.5 ⇒ n ≥ 10; row 10 has 6 + 36 = 42 bulbs, so row 10.",
      "[1 mark] S₈ = 8/2 [12 + 7 × 4] = 4 [12 + 28] = 4 × 40 = 160 bulbs.",
      "[1 mark] 6 + (n − 1)4 = 50 ⇒ (n − 1)4 = 44 ⇒ n − 1 = 11 ⇒ n = 12, row 12."
    ],
    "finalAnswer": "(i) d = 4; (ii) row 10; (iii) 160; (iv) row 12.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-015",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In a potato race, 10 potatoes are placed in a line; a runner starts at a bucket, runs to a potato, brings it back, then goes for the next. The round-trip distances are 10, 16, 22, … m for the 1st, 2nd, 3rd … potato.\n(i) What is the common difference of the distance AP?\n(ii) What is the round-trip distance for the 5th potato?\n(iii) Find the total distance run to collect all 10 potatoes.\n(iv) How much farther is the 10th round trip than the 1st?",
    "solutionSteps": [
      "[1 mark] d = 16 − 10 = 6 m.",
      "[1 mark] a₅ = 10 + 4 × 6 = 10 + 24 = 34 m.",
      "[1 mark] S₁₀ = 10/2 [2 × 10 + 9 × 6] = 5 [20 + 54] = 5 × 74 = 370 m.",
      "[1 mark] a₁₀ − a₁ = 9d = 9 × 6 = 54 m."
    ],
    "finalAnswer": "(i) d = 6 m; (ii) 34 m; (iii) 370 m; (iv) 54 m more.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-016",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A phone is bought on an interest-free plan: the 1st monthly instalment is ₹500 and each next instalment is ₹50 more than the previous one: ₹500, ₹550, ₹600, …\n(i) What is the first instalment?\n(ii) What is the 12th instalment?\n(iii) After how many months does the total amount paid reach ₹7,250?\n(iv) Is the sequence of instalments an AP? Justify.",
    "solutionSteps": [
      "[1 mark] First instalment = a = ₹500.",
      "[1 mark] a₁₂ = 500 + 11 × 50 = 500 + 550 = ₹1050.",
      "[1 mark] n/2 [1000 + (n − 1)50] = 7250 ⇒ 50n² + 950n − 14500 = 0 ⇒ n² + 19n − 290 = 0 ⇒ n = 10 months.",
      "[1 mark] Yes; each instalment exceeds the previous by a constant ₹50, so it is an AP with d = 50."
    ],
    "finalAnswer": "(i) ₹500; (ii) ₹1050; (iii) 10 months; (iv) Yes, AP with d = 50.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-017",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "After sunset the temperature of a place is 30 °C in the 1st hour and falls a steady 2 °C each hour: 30, 28, 26, … °C.\n(i) What is the temperature in the 1st hour?\n(ii) What is the temperature in the 6th hour?\n(iii) In which hour is the temperature exactly 12 °C?\n(iv) In which hour does the temperature first fall below 15 °C?",
    "solutionSteps": [
      "[1 mark] Temperature in the 1st hour = a = 30 °C.",
      "[1 mark] a₆ = 30 + 5 × (−2) = 30 − 10 = 20 °C.",
      "[1 mark] 30 + (n − 1)(−2) = 12 ⇒ (n − 1)2 = 18 ⇒ n − 1 = 9 ⇒ n = 10, the 10th hour.",
      "[1 mark] 30 − (n − 1)2 < 15 ⇒ (n − 1)2 > 15 ⇒ n − 1 > 7.5 ⇒ n ≥ 9; hour 9 gives 30 − 16 = 14 °C, so the 9th hour."
    ],
    "finalAnswer": "(i) 30 °C; (ii) 20 °C; (iii) 10th hour; (iv) 9th hour.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-018",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A stadium stand has 25 rows. The 1st row has 20 seats and every next row has 3 more seats than the row in front: 20, 23, 26, …\n(i) What is the common difference of the seats AP?\n(ii) How many seats are in row 10?\n(iii) Given that the last (25th) row has 92 seats, find the total seating capacity.\n(iv) In which row does the number of seats first exceed 60?",
    "solutionSteps": [
      "[1 mark] d = 23 − 20 = 3 seats.",
      "[1 mark] a₁₀ = 20 + 9 × 3 = 20 + 27 = 47 seats.",
      "[1 mark] S₂₅ = 25/2 (a + l) = 25/2 (20 + 92) = 25/2 × 112 = 25 × 56 = 1400 seats.",
      "[1 mark] 20 + (n − 1)3 > 60 ⇒ (n − 1) > 13.33 ⇒ n ≥ 15; row 15 has 20 + 42 = 62 seats, so row 15."
    ],
    "finalAnswer": "(i) d = 3; (ii) 47; (iii) 1400; (iv) row 15.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-019",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Number of Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A teacher asks students to list all whole numbers between 100 and 300 that are divisible by 7. These numbers form the AP 105, 112, 119, …\n(i) What is the first such number?\n(ii) What is the last such number?\n(iii) How many such numbers are there?\n(iv) Find the sum of all these numbers.",
    "solutionSteps": [
      "[1 mark] The smallest multiple of 7 above 100 is 105, so a = 105.",
      "[1 mark] The largest multiple of 7 below 300 is 294, so l = 294.",
      "[1 mark] 105 + (n − 1)7 = 294 ⇒ (n − 1)7 = 189 ⇒ n − 1 = 27 ⇒ n = 28 numbers.",
      "[1 mark] S₂₈ = 28/2 (105 + 294) = 14 × 399 = 5586."
    ],
    "finalAnswer": "(i) 105; (ii) 294; (iii) 28; (iv) 5586.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-020",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A new shop's daily sales are ₹2500 on day 1 and rise by a fixed ₹200 each day: ₹2500, ₹2700, ₹2900, …\n(i) What is the common difference of the sales AP?\n(ii) What are the sales on day 15?\n(iii) Find the total sales over the first 10 days.\n(iv) After how many days does the total sales reach ₹43,200?",
    "solutionSteps": [
      "[1 mark] d = 2700 − 2500 = ₹200.",
      "[1 mark] a₁₅ = 2500 + 14 × 200 = 2500 + 2800 = ₹5300.",
      "[1 mark] S₁₀ = 10/2 [2 × 2500 + 9 × 200] = 5 [5000 + 1800] = 5 × 6800 = ₹34,000.",
      "[1 mark] n/2 [5000 + (n − 1)200] = 43200 ⇒ 200n² + 4800n − 86400 = 0 ⇒ n² + 24n − 432 = 0 ⇒ n = 12 days."
    ],
    "finalAnswer": "(i) ₹200; (ii) ₹5300; (iii) ₹34,000; (iv) 12 days.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-021",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In a nursery, saplings are planted in rows: 4 in row 1, 6 in row 2, 8 in row 3, and so on.\n(i) What is the first term of this AP?\n(ii) What is the common difference?\n(iii) How many saplings are in row 9?\n(iv) Which row has exactly 30 saplings?",
    "solutionSteps": [
      "[1 mark] First term a = 4 saplings.",
      "[1 mark] d = 6 − 4 = 2 saplings.",
      "[1 mark] a₉ = 4 + 8 × 2 = 4 + 16 = 20 saplings.",
      "[1 mark] 4 + (n − 1)2 = 30 ⇒ (n − 1)2 = 26 ⇒ n − 1 = 13 ⇒ n = 14, row 14."
    ],
    "finalAnswer": "(i) a = 4; (ii) d = 2; (iii) 20; (iv) row 14.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-022",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Steel pipes are stacked so that the bottom row has 21 pipes and each higher row has one pipe fewer: 21, 20, 19, …\n(i) Is the number of pipes per row an AP? Justify.\n(ii) How many pipes are in the 6th row from the bottom?\n(iii) Which row has exactly 12 pipes?\n(iv) Find the total number of pipes in the first 10 rows.",
    "solutionSteps": [
      "[1 mark] Yes; each row differs from the one below by a constant −1, so it is an AP with a = 21, d = −1.",
      "[1 mark] a₆ = 21 + 5 × (−1) = 21 − 5 = 16 pipes.",
      "[1 mark] 21 + (n − 1)(−1) = 12 ⇒ (n − 1) = 9 ⇒ n = 10, the 10th row.",
      "[1 mark] S₁₀ = 10/2 [2 × 21 + 9 × (−1)] = 5 [42 − 9] = 5 × 33 = 165 pipes."
    ],
    "finalAnswer": "(i) Yes, AP (d = −1); (ii) 16; (iii) 10th row; (iv) 165.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-023",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A sum of ₹1000 earns fixed simple interest so that the amount at the end of years 1, 2, 3, … is ₹1120, ₹1240, ₹1360, … (rising by ₹120 each year).\n(i) What is the amount at the end of year 1?\n(ii) In which year does the amount first exceed ₹2000?\n(iii) At the end of which year is the amount ₹1720?\n(iv) Find the sum of the year-end amounts over the first 5 years.",
    "solutionSteps": [
      "[1 mark] Amount after year 1 = a = ₹1120.",
      "[1 mark] 1120 + (n − 1)120 > 2000 ⇒ (n − 1)120 > 880 ⇒ n − 1 > 7.33 ⇒ n ≥ 9; year 9 gives ₹2080, so year 9.",
      "[1 mark] 1120 + (n − 1)120 = 1720 ⇒ (n − 1)120 = 600 ⇒ n − 1 = 5 ⇒ n = 6, end of year 6.",
      "[1 mark] S₅ = 5/2 [2 × 1120 + 4 × 120] = 5/2 [2240 + 480] = 5/2 × 2720 = ₹6800."
    ],
    "finalAnswer": "(i) ₹1120; (ii) year 9; (iii) year 6; (iv) ₹6800.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-024",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "An examination hall has 20 rows of seats. Row 1 has 12 seats and each next row has 6 more seats than the previous: 12, 18, 24, …\n(i) What is the common difference of the seats AP?\n(ii) How many rows have fewer than 60 seats?\n(iii) Find the total number of seats in all 20 rows.\n(iv) How many seats are in row 10?",
    "solutionSteps": [
      "[1 mark] d = 18 − 12 = 6 seats.",
      "[1 mark] 12 + (n − 1)6 < 60 ⇒ (n − 1) < 8 ⇒ n ≤ 8; so 8 rows (row 9 has exactly 60).",
      "[1 mark] S₂₀ = 20/2 [2 × 12 + 19 × 6] = 10 [24 + 114] = 10 × 138 = 1380 seats.",
      "[1 mark] a₁₀ = 12 + 9 × 6 = 12 + 54 = 66 seats."
    ],
    "finalAnswer": "(i) d = 6; (ii) 8 rows; (iii) 1380; (iv) 66.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-025",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "To wind down a savings account, a person withdraws ₹5000 in month 1 and ₹200 less each following month: ₹5000, ₹4800, ₹4600, …\n(i) What is the first withdrawal?\n(ii) By how much does the month-2 withdrawal exceed the month-7 withdrawal?\n(iii) After how many months does the total withdrawn reach ₹27,000?\n(iv) What is the withdrawal in that final month?",
    "solutionSteps": [
      "[1 mark] First withdrawal = a = ₹5000.",
      "[1 mark] a₂ − a₇ = −5d = −5 × (−200) = ₹1000.",
      "[1 mark] n/2 [10000 + (n − 1)(−200)] = 27000 ⇒ n² − 51n + 270 = 0 ⇒ (n − 6)(n − 45) = 0 ⇒ n = 6 months.",
      "[1 mark] a₆ = 5000 + 5 × (−200) = 5000 − 1000 = ₹4000."
    ],
    "finalAnswer": "(i) ₹5000; (ii) ₹1000; (iii) 6 months; (iv) ₹4000.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-026",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A braking car covers 40 m in the 1st second and 5 m less in each following second: 40, 35, 30, … m, until it stops.\n(i) What is the common difference?\n(ii) How much farther does it travel in the 1st second than in the 5th second?\n(iii) In which second does it cover exactly 10 m?\n(iv) Find the total distance covered in the first 8 seconds.",
    "solutionSteps": [
      "[1 mark] d = 35 − 40 = −5 m.",
      "[1 mark] a₁ − a₅ = −4d = −4 × (−5) = 20 m.",
      "[1 mark] 40 + (n − 1)(−5) = 10 ⇒ (n − 1)5 = 30 ⇒ n − 1 = 6 ⇒ n = 7, the 7th second.",
      "[1 mark] a₈ = 40 + 7 × (−5) = 5 m; S₈ = 8/2 (40 + 5) = 4 × 45 = 180 m."
    ],
    "finalAnswer": "(i) −5 m; (ii) 20 m; (iii) 7th second; (iv) 180 m.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-027",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A scholarship scheme pays ₹2000 in Class 6 and ₹500 more in each higher class: ₹2000, ₹2500, ₹3000, … up to Class 12.\n(i) What is the scholarship amount in Class 6?\n(ii) What is the amount in Class 12 (the 7th year of the scheme)?\n(iii) By how much does the Class 12 amount exceed the Class 6 amount?\n(iv) After how many classes does the total scholarship received reach ₹15,000?",
    "solutionSteps": [
      "[1 mark] Class-6 amount = a = ₹2000.",
      "[1 mark] Class 12 is the 7th term: a₇ = 2000 + 6 × 500 = 2000 + 3000 = ₹5000.",
      "[1 mark] a₇ − a₁ = 6d = 6 × 500 = ₹3000.",
      "[1 mark] n/2 [4000 + (n − 1)500] = 15000 ⇒ n² + 7n − 60 = 0 ⇒ (n − 5)(n + 12) = 0 ⇒ n = 5 classes."
    ],
    "finalAnswer": "(i) ₹2000; (ii) ₹5000; (iii) ₹3000; (iv) 5 classes.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-028",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "A village's population is 5000 in year 1 and grows by a fixed 250 people every year: 5000, 5250, 5500, …\n(i) Is the yearly population an AP? Justify.\n(ii) What is the common difference?\n(iii) What will the population be in year 8?\n(iv) In which year will the population be 8250?",
    "solutionSteps": [
      "[1 mark] Yes; the population increases by a constant 250 each year, so it is an AP.",
      "[1 mark] d = 5250 − 5000 = 250 people.",
      "[1 mark] a₈ = 5000 + 7 × 250 = 5000 + 1750 = 6750 people.",
      "[1 mark] 5000 + (n − 1)250 = 8250 ⇒ (n − 1)250 = 3250 ⇒ n − 1 = 13 ⇒ n = 14, year 14."
    ],
    "finalAnswer": "(i) Yes, AP; (ii) d = 250; (iii) 6750; (iv) year 14.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-029",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A honeycomb design grows in rings around a centre. The 1st ring has 6 cells and each further ring has 6 more cells than the ring inside it: 6, 12, 18, … There are 8 rings in all.\n(i) How many cells are in the 1st ring?\n(ii) How many cells are in the outermost (8th) ring?\n(iii) Using the outer ring, find the total number of cells in all 8 rings.\n(iv) Which ring has exactly 36 cells?",
    "solutionSteps": [
      "[1 mark] First ring cells = a = 6.",
      "[1 mark] a₈ = 6 + 7 × 6 = 6 + 42 = 48 cells.",
      "[1 mark] S₈ = 8/2 (a + l) = 4 (6 + 48) = 4 × 54 = 216 cells.",
      "[1 mark] 6 + (n − 1)6 = 36 ⇒ (n − 1)6 = 30 ⇒ n − 1 = 5 ⇒ n = 6, the 6th ring."
    ],
    "finalAnswer": "(i) 6; (ii) 48; (iii) 216; (iv) 6th ring.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-030",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A train starting from rest covers 6 m in the 1st second and 8 m more in each following second: 6, 14, 22, … m.\n(i) What is the common difference of this AP?\n(ii) What distance is covered in the 10th second?\n(iii) In which second does the distance first exceed 50 m?\n(iv) Find the total distance covered in the first 10 seconds.",
    "solutionSteps": [
      "[1 mark] d = 14 − 6 = 8 m.",
      "[1 mark] a₁₀ = 6 + 9 × 8 = 6 + 72 = 78 m.",
      "[1 mark] 6 + (n − 1)8 > 50 ⇒ (n − 1) > 5.5 ⇒ n ≥ 7; second 7 gives 6 + 48 = 54 m, so the 7th second.",
      "[1 mark] S₁₀ = 10/2 [2 × 6 + 9 × 8] = 5 [12 + 72] = 5 × 84 = 420 m."
    ],
    "finalAnswer": "(i) d = 8 m; (ii) 78 m; (iii) 7th second; (iv) 420 m.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-031",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A loan is repaid in 20 monthly instalments. The 1st instalment is ₹2000 and each next is ₹100 less than the one before: ₹2000, ₹1900, ₹1800, …\n(i) What is the first instalment?\n(ii) What is the last (20th) instalment?\n(iii) Find the total amount repaid over the 20 months.\n(iv) After how many months does the total repaid reach ₹9,000?",
    "solutionSteps": [
      "[1 mark] First instalment = a = ₹2000.",
      "[1 mark] a₂₀ = 2000 + 19 × (−100) = 2000 − 1900 = ₹100.",
      "[1 mark] S₂₀ = 20/2 [2 × 2000 + 19 × (−100)] = 10 [4000 − 1900] = 10 × 2100 = ₹21,000.",
      "[1 mark] n/2 [4000 + (n − 1)(−100)] = 9000 ⇒ n² − 41n + 180 = 0 ⇒ (n − 5)(n − 36) = 0 ⇒ n = 5 months."
    ],
    "finalAnswer": "(i) ₹2000; (ii) ₹100; (iii) ₹21,000; (iv) 5 months.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-032",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Cans are stacked in a triangular display: 1 can in the top row, 3 in the next, 5 in the next, and so on (odd numbers).\n(i) Is the number of cans per row an AP? Justify.\n(ii) How many cans are in the 5th row from the top?\n(iii) If 64 cans are used in total, how many rows are there?\n(iv) How many cans are in the bottom row of that stack?",
    "solutionSteps": [
      "[1 mark] Yes; 3 − 1 = 2 and 5 − 3 = 2 are constant, so it is an AP with a = 1, d = 2.",
      "[1 mark] a₅ = 1 + 4 × 2 = 1 + 8 = 9 cans.",
      "[1 mark] n/2 [2 × 1 + (n − 1)2] = 64 ⇒ n² = 64 ⇒ n = 8 rows.",
      "[1 mark] Bottom row is the 8th: a₈ = 1 + 7 × 2 = 15 cans."
    ],
    "finalAnswer": "(i) Yes, AP (d = 2); (ii) 9; (iii) 8 rows; (iv) 15.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-033",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "In a parade, a marching contingent narrows towards the back: the front row has 40 soldiers and each row behind has 4 fewer, forming 40, 36, 32, … over 10 rows.\n(i) How many soldiers are in the front row?\n(ii) What is the common difference?\n(iii) How many soldiers are in the 6th row?\n(iv) How many soldiers are in the last (10th) row?",
    "solutionSteps": [
      "[1 mark] Front-row soldiers = a = 40.",
      "[1 mark] d = 36 − 40 = −4 soldiers.",
      "[1 mark] a₆ = 40 + 5 × (−4) = 40 − 20 = 20 soldiers.",
      "[1 mark] a₁₀ = 40 + 9 × (−4) = 40 − 36 = 4 soldiers."
    ],
    "finalAnswer": "(i) 40; (ii) −4; (iii) 20; (iv) 4.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-034",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Number of Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A student writes down every multiple of 4 that lies between 10 and 250: 12, 16, 20, …, 248.\n(i) What is the common difference of this AP?\n(ii) How many such multiples are there?\n(iii) What is the last such multiple?\n(iv) Find the sum of all these multiples.",
    "solutionSteps": [
      "[1 mark] d = 16 − 12 = 4.",
      "[1 mark] 12 + (n − 1)4 = 248 ⇒ (n − 1)4 = 236 ⇒ n − 1 = 59 ⇒ n = 60 multiples.",
      "[1 mark] The last multiple is l = 248.",
      "[1 mark] S₆₀ = 60/2 (12 + 248) = 30 × 260 = 7800."
    ],
    "finalAnswer": "(i) d = 4; (ii) 60; (iii) 248; (iv) 7800.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-035",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "A garden is laid out in 15 rows of plants. Row 1 has 5 plants and each next row has 3 more than the previous: 5, 8, 11, …\n(i) What is the common difference of the plants AP?\n(ii) How many plants are in row 12?\n(iii) How many plants are in the middle (8th) row?\n(iv) Find the total number of plants in all 15 rows.",
    "solutionSteps": [
      "[1 mark] d = 8 − 5 = 3 plants.",
      "[1 mark] a₁₂ = 5 + 11 × 3 = 5 + 33 = 38 plants.",
      "[1 mark] For 15 rows the middle is the 8th row: a₈ = 5 + 7 × 3 = 5 + 21 = 26 plants.",
      "[1 mark] S₁₅ = 15/2 [2 × 5 + 14 × 3] = 15/2 [10 + 42] = 15/2 × 52 = 15 × 26 = 390 plants."
    ],
    "finalAnswer": "(i) d = 3; (ii) 38; (iii) 26; (iv) 390.",
    "isCompetencyBased": true,
    "strategyHint": "For an odd number of terms, the middle term is the (n+1)/2 th term."
  },
  {
    "id": "BX-AP-E-036",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A start-up's yearly profit grows uniformly. It earned ₹6000 in year 4 and ₹11000 in year 9, and the yearly profits form an AP.\n(i) What is the common difference?\n(ii) What was the profit in year 1 (the first term)?\n(iii) What will the profit be in year 12?\n(iv) After how many years does the total profit reach ₹75,000?",
    "solutionSteps": [
      "[1 mark] a₉ − a₄ = 5d ⇒ 11000 − 6000 = 5d ⇒ d = ₹1000.",
      "[1 mark] a₄ = a + 3d = 6000 ⇒ a = 6000 − 3000 = ₹3000.",
      "[1 mark] a₁₂ = 3000 + 11 × 1000 = ₹14,000.",
      "[1 mark] n/2 [6000 + (n − 1)1000] = 75000 ⇒ n² + 5n − 150 = 0 ⇒ (n − 10)(n + 15) = 0 ⇒ n = 10 years."
    ],
    "finalAnswer": "(i) ₹1000; (ii) ₹3000; (iii) ₹14,000; (iv) 10 years.",
    "isCompetencyBased": true,
    "strategyHint": "From two given terms, aₚ − a_q = (p − q)d gives d, then back-substitute for a."
  },
  {
    "id": "BX-AP-E-037",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Word Problems on AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A daily-wage worker is paid ₹300 on day 1, with the wage rising by a fixed ₹15 each day: ₹300, ₹315, ₹330, …\n(i) What is the wage on day 1?\n(ii) On which day is the wage exactly ₹420?\n(iii) On which day does the wage first exceed ₹450?\n(iv) After how many days does the total wages paid reach ₹3,675?",
    "solutionSteps": [
      "[1 mark] Day-1 wage = a = ₹300.",
      "[1 mark] 300 + (n − 1)15 = 420 ⇒ (n − 1)15 = 120 ⇒ n − 1 = 8 ⇒ n = 9, day 9.",
      "[1 mark] 300 + (n − 1)15 > 450 ⇒ (n − 1) > 10 ⇒ n ≥ 12; day 12 gives ₹465, so day 12.",
      "[1 mark] n/2 [600 + (n − 1)15] = 3675 ⇒ n² + 39n − 490 = 0 ⇒ (n − 10)(n + 49) = 0 ⇒ n = 10 days."
    ],
    "finalAnswer": "(i) ₹300; (ii) day 9; (iii) day 12; (iv) 10 days.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-038",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A floor design is made of square rings of tiles around a centre: the innermost ring uses 8 tiles and each outer ring uses 8 more than the ring inside it: 8, 16, 24, …\n(i) Is the number of tiles per ring an AP? Justify.\n(ii) What is the common difference?\n(iii) Find the total number of tiles in the first 6 rings.\n(iv) Which ring uses exactly 56 tiles?",
    "solutionSteps": [
      "[1 mark] Yes; 16 − 8 = 8 and 24 − 16 = 8 are constant, so it is an AP.",
      "[1 mark] d = 8 tiles.",
      "[1 mark] S₆ = 6/2 [2 × 8 + 5 × 8] = 3 [16 + 40] = 3 × 56 = 168 tiles.",
      "[1 mark] 8 + (n − 1)8 = 56 ⇒ (n − 1)8 = 48 ⇒ n − 1 = 6 ⇒ n = 7, the 7th ring."
    ],
    "finalAnswer": "(i) Yes, AP; (ii) d = 8; (iii) 168; (iv) 7th ring.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-039",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A patient's daily medicine dose is tapered: 50 mg on day 1 and 5 mg less each following day: 50, 45, 40, … mg.\n(i) What is the dose on day 1?\n(ii) What is the dose on day 6?\n(iii) On which day is the dose exactly 15 mg?\n(iv) Find the total medicine taken over the first 7 days.",
    "solutionSteps": [
      "[1 mark] Day-1 dose = a = 50 mg.",
      "[1 mark] a₆ = 50 + 5 × (−5) = 50 − 25 = 25 mg.",
      "[1 mark] 50 + (n − 1)(−5) = 15 ⇒ (n − 1)5 = 35 ⇒ n − 1 = 7 ⇒ n = 8, day 8.",
      "[1 mark] S₇ = 7/2 [2 × 50 + 6 × (−5)] = 7/2 [100 − 30] = 7/2 × 70 = 245 mg."
    ],
    "finalAnswer": "(i) 50 mg; (ii) 25 mg; (iii) day 8; (iv) 245 mg.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-040",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A curved auditorium is designed to seat 825 people. The 1st row has 20 seats and every next row has 5 more seats than the previous: 20, 25, 30, …\n(i) How many seats are in the 1st row?\n(ii) What is the common difference?\n(iii) How many rows are needed to seat exactly 825 people?\n(iv) How many seats are in the last row?",
    "solutionSteps": [
      "[1 mark] First-row seats = a = 20.",
      "[1 mark] d = 25 − 20 = 5 seats.",
      "[1 mark] n/2 [40 + (n − 1)5] = 825 ⇒ 5n² + 35n − 1650 = 0 ⇒ n² + 7n − 330 = 0 ⇒ (n − 15)(n + 22) = 0 ⇒ n = 15 rows.",
      "[1 mark] a₁₅ = 20 + 14 × 5 = 20 + 70 = 90 seats."
    ],
    "finalAnswer": "(i) 20; (ii) d = 5; (iii) 15 rows; (iv) 90.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-041",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Potted plants are arranged in 12 rows on a stepped stand: 3 pots in row 1 and 4 more in each higher row: 3, 7, 11, …\n(i) What is the common difference of the pots AP?\n(ii) How many pots are in row 10?\n(iii) Given the top (12th) row, find the total number of pots on the stand.\n(iv) Which row has exactly 27 pots?",
    "solutionSteps": [
      "[1 mark] d = 7 − 3 = 4 pots.",
      "[1 mark] a₁₀ = 3 + 9 × 4 = 3 + 36 = 39 pots.",
      "[1 mark] Top row a₁₂ = 3 + 11 × 4 = 47; total S₁₂ = 12/2 (3 + 47) = 6 × 50 = 300 pots.",
      "[1 mark] 3 + (n − 1)4 = 27 ⇒ (n − 1)4 = 24 ⇒ n − 1 = 6 ⇒ n = 7, row 7."
    ],
    "finalAnswer": "(i) d = 4; (ii) 39; (iii) 300; (iv) row 7.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-042",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "nth Term of AP",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A preheating oven is at 40 °C in the 1st minute and rises by a fixed 12 °C each minute: 40, 52, 64, … °C.\n(i) What is the temperature in the 1st minute?\n(ii) What is the temperature in the 8th minute?\n(iii) In which minute is the temperature exactly 160 °C?\n(iv) By how much does the temperature in the 10th minute exceed that in the 5th minute?",
    "solutionSteps": [
      "[1 mark] Temperature in the 1st minute = a = 40 °C.",
      "[1 mark] a₈ = 40 + 7 × 12 = 40 + 84 = 124 °C.",
      "[1 mark] 40 + (n − 1)12 = 160 ⇒ (n − 1)12 = 120 ⇒ n − 1 = 10 ⇒ n = 11, minute 11.",
      "[1 mark] a₁₀ − a₅ = 5d = 5 × 12 = 60 °C."
    ],
    "finalAnswer": "(i) 40 °C; (ii) 124 °C; (iii) minute 11; (iv) 60 °C.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-043",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A rope is cut into 9 pieces whose lengths are in AP. The shortest piece is 8 cm and the longest is 40 cm.\n(i) What is the length of the shortest piece?\n(ii) What is the length of the longest piece?\n(iii) Find the common difference of the lengths.\n(iv) Find the total length of the rope.",
    "solutionSteps": [
      "[1 mark] Shortest piece = a = 8 cm.",
      "[1 mark] Longest piece = l = a₉ = 40 cm.",
      "[1 mark] a₉ = a + 8d ⇒ 40 = 8 + 8d ⇒ 8d = 32 ⇒ d = 4 cm.",
      "[1 mark] S₉ = 9/2 (a + l) = 9/2 (8 + 40) = 9/2 × 48 = 9 × 24 = 216 cm."
    ],
    "finalAnswer": "(i) 8 cm; (ii) 40 cm; (iii) d = 4 cm; (iv) 216 cm.",
    "isCompetencyBased": true
  },
  {
    "id": "BX-AP-E-044",
    "subject": "Maths",
    "topicKey": "arithmetic-progression",
    "subtopic": "Sum of n Terms",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "During a construction pour, 30 bags of cement are used on day 1 and 8 more bags each following day than the day before: 30, 38, 46, …\n(i) What is the common difference of the bags AP?\n(ii) Find the total bags used in the first 5 days.\n(iii) After how many days does the total bags used reach 770?\n(iv) On which day does the daily use first exceed 100 bags?",
    "solutionSteps": [
      "[1 mark] d = 38 − 30 = 8 bags.",
      "[1 mark] S₅ = 5/2 [2 × 30 + 4 × 8] = 5/2 [60 + 32] = 5/2 × 92 = 230 bags.",
      "[1 mark] n/2 [60 + (n − 1)8] = 770 ⇒ 8n² + 52n − 1540 = 0 ⇒ 2n² + 13n − 385 = 0 ⇒ n = 11 days.",
      "[1 mark] 30 + (n − 1)8 > 100 ⇒ (n − 1) > 8.75 ⇒ n ≥ 10; day 10 gives 102 bags, so day 10."
    ],
    "finalAnswer": "(i) d = 8; (ii) 230; (iii) 11 days; (iv) day 10.",
    "isCompetencyBased": true
  },
];
