import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Pair of Linear Equations in Two Variables — CBSE CBE Item Bank, Maths Class 10.
 * Source: Item-Bank--Maths---Class-10.pdf (British Council / CBSE, September 2021),
 *   items Maths10SS7, Maths10AR8a, Maths10RK5a, Maths10RK5b, Maths10RK2,
 *   Maths10PS8a, Maths10PS8b (original 7), plus Maths10SK8, Maths10RK6a/b/c,
 *   Maths10SK7a/b, Maths10SS5b, Maths10SS6b, Maths10RM8b (Sprint-1 completion).
 *   Content refs 10A2a/10A2b/10A2c.
 * topicKey "pair-of-linear-equations". Extracted 2026-05-29 (Sprint 1).
 * SKIPPED (out-of-schema / banned):
 *   - Maths10AR8b: 6-mark graph sub-part → no valid CBSE section.
 *   - Maths10GS6: plain non-case 4-mark item → E reserved for case-based.
 *   - Maths10SS5a / Maths10SS6a / Maths10RM8a: 4-mark non-case sub-parts.
 *   - Maths10RK1: index mis-tagged 10A2a but its content block is 10A1a (polynomials).
 * Section distribution: A=5, B=6, C=4.
 */
export const PLE_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-M-PLE-A-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Graphical Solution of Linear Equations",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The solution for the given system of equations 4x − y = 4 and 3x + 2y = 14, from the graph shown, can be determined as:",
    "options": [
      "A. (0, 7)",
      "B. (2, 4)",
      "C. (4, 1)",
      "D. (1, 0)"
    ],
    "answer": "B. (2, 4)",
    "solutionSteps": [
      "[1 mark] The solution of a pair of linear equations is the point where their graphs intersect. The two lines meet at (2, 4), so the solution is (2, 4). Answer: B."
    ],
    "finalAnswer": "B. (2, 4)",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two straight lines plotted on the same x–y axes: 4x − y = 4 and 3x + 2y = 14. The lines intersect at the point (2, 4)."
  },
  {
    "id": "CBE-M-PLE-A-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Conditions for Parallel Lines",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "If the lines 3x + 2ky − 2 = 0 and 2x + 5y + 1 = 0 are parallel, then the value of k is",
    "options": [
      "A. 4/15",
      "B. 15/4",
      "C. 4/5",
      "D. 5/4"
    ],
    "answer": "B. 15/4",
    "solutionSteps": [
      "[1 mark] Lines are parallel when a₁/a₂ = b₁/b₂ ≠ c₁/c₂. So 3/2 = 2k/5 ⟹ k = 15/4. Answer: B."
    ],
    "finalAnswer": "B. 15/4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-A-003",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Formulating Linear Equations from a Word Problem",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "Two numbers, x and y (x > y), have a difference of 6 and an average of 4. Frame a pair of linear equations in two variables.",
    "options": [],
    "answer": "x − y = 6 and x + y = 8",
    "solutionSteps": [
      "[1 mark] Difference gives x − y = 6; average gives (x + y)/2 = 4, i.e. x + y = 8."
    ],
    "finalAnswer": "x − y = 6 and x + y = 8",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-B-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Conditions for Consistency of Linear Equations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Given below are three equations; a pair of them have infinitely many solutions. Find the pair among the three equations:\n(i) 3x − 2y = 4\n(ii) 6x + 2y = 8\n(iii) 12x − 4y = 16",
    "options": [],
    "answer": "Equations (i) and (iii)",
    "solutionSteps": [
      "[1 mark] A pair has infinitely many solutions when a₁/a₂ = b₁/b₂ = c₁/c₂. Test the pairs by comparing coefficient ratios.",
      "[1 mark] For (i) and (iii): 3/12 = −2/−4 = 4/16 = 1/4, so all three ratios are equal. Hence the pair (i) and (iii) has infinitely many solutions."
    ],
    "finalAnswer": "Equations (i) and (iii)",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-B-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Formulating Linear Equations from a Word Problem",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Two numbers, x and y (x > y), have a difference of 6 and an average of 4. Determine the values of the two numbers.",
    "options": [],
    "answer": "x = 7, y = 1",
    "solutionSteps": [
      "[1 mark] From the conditions, x − y = 6 and x + y = 8. Adding the two equations gives 2x = 14.",
      "[1 mark] So x = 7, and then y = 8 − 7 = 1. The numbers are 7 and 1."
    ],
    "finalAnswer": "x = 7, y = 1",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-C-001",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Graphical Solution of Linear Equations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "For the given pair of linear equations 2x + y = 6 and 2x = y + 2, draw the graph of the two equations on the same graph paper.",
    "options": [],
    "answer": "The two lines intersect at the point (2, 2).",
    "solutionSteps": [
      "[1 mark] For 2x + y = 6, find points: (0, 6) and (3, 0).",
      "[1 mark] For 2x = y + 2 (i.e. 2x − y = 2), find points: (1, 0) and (0, −2).",
      "[1 mark] Plot the points and draw both straight lines; they intersect at (2, 2)."
    ],
    "finalAnswer": "Lines intersect at (2, 2).",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Two straight lines on the same graph paper: 2x + y = 6 (through (0,6) and (3,0)) and 2x − y = 2 (through (1,0) and (0,−2)), intersecting at (2, 2)."
  },
  {
    "id": "CBE-M-PLE-C-002",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Graphical Solution of Linear Equations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "The lines 2x + y = 6 and 2x = y + 2 are drawn on a graph. Find the ratio of the areas of the two triangles formed by these lines with the x-axis and with the y-axis.",
    "options": [],
    "answer": "1 : 4",
    "solutionSteps": [
      "[1 mark] Triangle formed with the x-axis has vertices A(2, 2), B(1, 0) and C(3, 0); its area = 2 sq units.",
      "[1 mark] Triangle formed with the y-axis has vertices A(2, 2), D(0, 6) and E(0, −2); its area = 8 sq units.",
      "[1 mark] Ratio of areas = 2 : 8 = 1 : 4."
    ],
    "finalAnswer": "1 : 4",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-A-004",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The taxi charges in a city consist of a fixed charge together with the charge for the distance covered. For a distance of 10 km, the charge paid is Rs 105, and for a journey of 15 km, the charge paid is Rs 155. What are the fixed charges and the charge per kilometre?",
    "options": [],
    "answer": "Fixed charge Rs 5, charge per km Rs 10",
    "solutionSteps": [
      "[1 mark] Let the fixed charge be x and the charge per km be y. Then x + 10y = 105 and x + 15y = 155. Solving gives y = 10 and, on substitution, x = 5. So the fixed charge is Rs 5 and the charge per km is Rs 10."
    ],
    "finalAnswer": "Fixed charge Rs 5, charge per km Rs 10",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-A-005",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "The ticket charge for an amusement park is Rs 150 for children and Rs 400 for adults. Compute the total amount collected if 415 children and 150 adults visited the park.",
    "options": [],
    "answer": "Rs 122250",
    "solutionSteps": [
      "[1 mark] Total amount = 415 × 150 + 150 × 400 = 62250 + 60000 = Rs 122250."
    ],
    "finalAnswer": "Rs 122250",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-B-003",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Algebraic Methods — Substitution",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Solve 2x − y − 3 = 0 and 4x − y − 5 = 0 using the substitution method. Show your working.",
    "options": [],
    "answer": "x = 1, y = −1",
    "solutionSteps": [
      "[1 mark] From the first equation, y = 2x − 3. Substitute into the second: 4x − (2x − 3) − 5 = 0, which gives x = 1.",
      "[1 mark] Then y = 2(1) − 3 = −1. So x = 1 and y = −1."
    ],
    "finalAnswer": "x = 1, y = −1",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-M-PLE-B-004",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ram and Sham are two friends, each owning a rectangular plot. Ram's plot has a perimeter of 50 m and Sham's plot has a perimeter of 100 m. Sham's plot has a length twice that of Ram's plot and a breadth 5 m more than that of Ram's plot. The linear equations for the plots are x + y = 25 and 2x + y = 45, where x m is the length and y m is the breadth of Ram's plot. Find the dimensions of Ram's plot.",
    "options": [],
    "answer": "Length = 20 m, breadth = 5 m",
    "solutionSteps": [
      "[1 mark] Solve x + y = 25 and 2x + y = 45 by elimination; subtracting gives x = 20.",
      "[1 mark] Substituting back gives y = 5. So Ram's plot has length 20 m and breadth 5 m."
    ],
    "finalAnswer": "Length = 20 m, breadth = 5 m",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-B-005",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ram and Sham are two friends, each owning a rectangular plot. Ram's plot has a perimeter of 50 m and Sham's plot has a perimeter of 100 m. Sham's plot has a length twice that of Ram's plot and a breadth 5 m more than that of Ram's plot. Given that Ram's plot has length 20 m and breadth 5 m, find the dimensions of Sham's plot.",
    "options": [],
    "answer": "Length = 40 m, breadth = 10 m",
    "solutionSteps": [
      "[1 mark] Sham's length is twice Ram's length: 2 × 20 = 40 m.",
      "[1 mark] Sham's breadth is 5 m more than Ram's breadth: 5 + 5 = 10 m. So Sham's plot has length 40 m and breadth 10 m."
    ],
    "finalAnswer": "Length = 40 m, breadth = 10 m",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-B-006",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "At Mehrangarh Fort, the normal-hours fare per person is Rs 50 for a horse ride and Rs 100 for an elephant ride; the peak-hours fare per person is Rs 150 for a horse ride and Rs 200 for an elephant ride. Rahul and his friends hired 11 horses and 14 elephants. On their second visit they hired the same number of rides but in peak hours. Calculate the increase in charges they have to pay due to peak hours.",
    "options": [],
    "answer": "Rs 2500",
    "solutionSteps": [
      "[1 mark] Peak-hours total = 150 × 11 + 200 × 14 = 1650 + 2800 = Rs 4450; normal-hours total = Rs 1950.",
      "[1 mark] Increase in charges = 4450 − 1950 = Rs 2500."
    ],
    "finalAnswer": "Rs 2500",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-B-007",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The ticket charge for an amusement park is Rs 150 for children and Rs 400 for adults. How much would be collected if 300 children and 350 adults visited the park?",
    "options": [],
    "answer": "Rs 185000",
    "solutionSteps": [
      "[1 mark] Express the amount in two variables: amount = 150x + 400y, where x is the number of children and y the number of adults.",
      "[1 mark] Amount = 150 × 300 + 400 × 350 = 45000 + 140000 = Rs 185000."
    ],
    "finalAnswer": "Rs 185000",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-C-003",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Ram and Sham are two friends, each owning a rectangular plot. Ram is the owner of a rectangular plot whose perimeter is 50 m and Sham is the owner of a rectangular plot whose perimeter is 100 m. Sham's plot has a length twice that of Ram's plot and a breadth 5 m more than that of Ram's plot. Write the linear equations for both the plots.",
    "options": [],
    "answer": "x + y = 25 and 2x + y = 45",
    "solutionSteps": [
      "[1 mark] Let x m be the length and y m be the breadth of Ram's plot; then 2x m is the length and (y + 5) m is the breadth of Sham's plot.",
      "[1 mark] Apply the perimeter formula: 2(x + y) = 50 and 2(2x + y + 5) = 100.",
      "[1 mark] Simplify to get x + y = 25 and 2x + y = 45."
    ],
    "finalAnswer": "x + y = 25 and 2x + y = 45",
    "isCompetencyBased": true
  },
  {
    "id": "CBE-M-PLE-C-004",
    "subject": "Maths",
    "topicKey": "pair-of-linear-equations",
    "subtopic": "Real-Life Problems on Linear Equations",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The taxi charges in a city consist of a fixed charge together with the charge for the distance covered. For a distance of 10 km, the charge paid is Rs 105, and for a journey of 15 km, the charge paid is Rs 155. How much does a person have to pay for travelling a distance of 25 km?",
    "options": [],
    "answer": "Rs 255",
    "solutionSteps": [
      "[1 mark] Let the fixed charge be x and the charge per km be y. Then x + 10y = 105 and x + 15y = 155.",
      "[1 mark] Solving the pair gives y = 10 and x = 5.",
      "[1 mark] Charge for 25 km = x + 25y = 5 + 25 × 10 = Rs 255."
    ],
    "finalAnswer": "Rs 255",
    "isCompetencyBased": true
  }
];
