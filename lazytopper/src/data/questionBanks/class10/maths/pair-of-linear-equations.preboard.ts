import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * pair-of-linear-equations — CBSE Maths Standard Preboard Sample Papers SP1 & SP2 (Class X, Code 041).
 * Source: 776_STD SP1.pdf + 777_STD SP2.pdf (unsolved papers; worked solutions
 * generated in CBSE marking style, Sprint 1 follow-up, 2026-05-29). topicKey "pair-of-linear-equations".
 * Section D (4-mark) items omitted — 4 marks maps to no valid CBSE section. pyqYear OMITTED.
 */
export const PLE_PREBOARD: CanonicalQuestion[] = [
  {
    "id": "PB-M-2-PLE-C-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Word Problem (Two Variables)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A part of the monthly hostel charge is fixed and the remaining depends on the number of days one has taken food in the mess. When Swati takes food for 20 days, she has to pay Rs. 3,000 as hostel charges, whereas Mansi who takes food for 25 days pays Rs. 3,500 as hostel charges. Find the fixed charges and the cost of food per day.",
    "options": [],
    "answer": "Fixed charge = Rs. 1000, cost of food per day = Rs. 100.",
    "solutionSteps": [
      "[1 mark] Let the fixed charge be Rs. x and the cost of food per day be Rs. y. Then x + 20y = 3000 and x + 25y = 3500.",
      "[1 mark] Subtracting the first equation from the second: 5y = 500 → y = 100.",
      "[1 mark] Substituting y = 100 in x + 20y = 3000: x + 2000 = 3000 → x = 1000. Fixed charge = Rs. 1000, cost of food per day = Rs. 100."
    ],
    "finalAnswer": "Fixed charge = Rs. 1000; cost of food per day = Rs. 100.",
    "isCompetencyBased": false
  }
];
