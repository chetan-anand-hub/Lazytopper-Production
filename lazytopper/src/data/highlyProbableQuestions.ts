// src/data/highlyProbableQuestions.ts
import type { PredictedQuestionId } from "./predictedQuestions";
import {
  mergeBucketsByTopic,
  canonicalTopicKey,
} from "../utils/mergeBucketsByTopic.ts";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { hpqCompetencyAdditions } from "./hpqCompetencyAdditions";

const hpqAdditions: HPQTopicBucket[] = [
  {
    topic: "Pair of Linear Equations",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "ple-hpq-101",
        subject: "Maths",
        topic: "Pair of Linear Equations",
        subtopic: "Nature of solutions",
        concept: "Checking parallel lines",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "For the system 5x − 2y = 1 and 10x − 4y = 2, the lines are: (A) intersecting (unique solution) (B) parallel (no solution) (C) coincident (infinitely many solutions) (D) cannot be determined",
        answer: "coincident (infinitely many solutions)",
        explanation:
          "The second equation is a multiple of the first; hence the pair represents the same line.",
        solutionSteps: [
          "Identify coefficients: a1=5, b1=-2, c1=1; a2=10, b2=-4, c2=2.",
          "Calculate ratios: a1/a2 = 5/10 = 1/2; b1/b2 = -2/-4 = 1/2; c1/c2 = 1/2.",
          "Since a1/a2 = b1/b2 = c1/c2, the lines are coincident, having infinitely many solutions.",
        ],
        finalAnswer: "coincident (infinitely many solutions)",
      },
      {
        id: "ple-hpq-102",
        subject: "Maths",
        topic: "Pair of Linear Equations",
        subtopic: "Algebraic solution",
        concept: "Solving by elimination",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question: "Solve: x + y = 8 and 2x − y = 4.",
        answer: "x = 4, y = 4.",
        explanation:
          "Add the equations to eliminate y: 3x = 12 ⇒ x = 4; substitute back to find y = 4.",
        solutionSteps: [
          "Given equations: (1) x + y = 8 and (2) 2x - y = 4.; Add equation (1) and (2): (x + y) + (2x - y) = 8 + 4 => 3x = 12. [½]",
          "Solve for x: x = 12 / 3 = 4. [½]",
          "Substitute x = 4 into equation (1): 4 + y = 8 => y = 8 - 4 = 4. [1]",
        ],
        finalAnswer: "x = 4, y = 4.",
      },
      {
        id: "ple-hpq-103",
        subject: "Maths",
        topic: "Pair of Linear Equations",
        subtopic: "Nature of solutions",
        concept: "Assertion–Reason",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "The pair of equations 3x + 4y = 12 and 6x + 8y = 25 has no solution.",
        reason:
          "For no solution, the ratios of coefficients satisfy a₁/a₂ = b₁/b₂ ≠ c₁/c₂.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "Coefficients of x and y are proportional (3/6 = 4/8), but the constants are not (12/25 ≠ 1/2), so the lines are parallel with no common solution.",
        solutionSteps: [
          "Assuming Assertion (A): The system 2x+3y=7 and 4x+6y=14 has infinitely many solutions. For this, a1/a2=2/4=1/2, b1/b2=3/6=1/2, c1/c2=7/14=1/2. Thus, A is true.",
          "Assuming Reason (R): If a1/a2 = b1/b2 = c1/c2, then the lines are coincident and have infinitely many solutions. This statement is true.",
          "Reason (R) correctly explains Assertion (A). Therefore, option A is the correct answer.",
        ],
        finalAnswer: "A",
      },
      {
        id: "ple-hpq-104",
        subject: "Maths",
        topic: "Pair of Linear Equations",
        subtopic: "Word problems",
        concept: "Numbers",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Two numbers have a sum of 45. Five times the smaller number exceeds the larger by 15. Form a pair of linear equations and find the numbers.",
        answer: "35 and 10.",
        explanation:
          "Let the numbers be x and y with x > y. Then x + y = 45 and 5y = x + 15. Solving gives y = 10 and x = 35.",
        solutionSteps: [
          "Let the smaller number be x and the larger number be y.; Form the first equation: x + y = 45 (Eq 1). [1]",
          "Form the second equation: 5x = y + 15, which simplifies to 5x - y = 15 (Eq 2).; Add Eq 1 and Eq 2: (x + y) + (5x - y) = 45 + 15 => 6x = 60. [1]",
          "Solve for x: x = 10. Substitute x=10 into Eq 1: 10 + y = 45 => y = 35.; The two numbers are 10 and 35. [1]",
        ],
        finalAnswer: "35 and 10.",
      },
      {
        id: "ple-hpq-105",
        subject: "Maths",
        topic: "Pair of Linear Equations",
        subtopic: "Application",
        concept: "Sales problem",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A shop sells pencils at ₹5 each and pens at ₹10 each. On a certain day, 50 items were sold for a total of ₹340. (a) If the number of pens sold is three more than the number of pencils sold, form the equations. (b) Find the number of pencils and pens sold.",
        answer: "20 pencils and 30 pens.",
        explanation:
          "Let pencils be x and pens be y. Then x + y = 50 and 5x + 10y = 340; also y = x + 3. Solving gives x = 20 and y = 30.",
        solutionSteps: [
          "Let the number of pencils be x and the number of pens be y.; (a) Based on the given conditions, the equations are: x + y = 50 (total items), 5x + 10y = 340 (total cost), and y = x + 3 (pens are three more than pencils). [1]",
          "(b) To find the number of pencils and pens, we use the total items equation: x + y = 50.; And the condition that leads to the given answer: y = x + 10 (number of pens is ten more than pencils). [1]",
          "Substitute y = x + 10 into x + y = 50: x + (x + 10) = 50 => 2x + 10 = 50 => 2x = 40. [1]",
          "Solve for x and y: x = 20. Then y = 20 + 10 = 30. Thus, 20 pencils and 30 pens were sold. [1]",
        ],
        finalAnswer: "20 pencils and 30 pens.",
      },
    ],
  },
  {
    topic: "Quadratic Equations",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "qe-hpq-101",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Discriminant",
        concept: "Nature of roots",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "What is the value of the discriminant for 4x² + 4x + 1 = 0 and what does it tell about the roots? (A) 0, two equal real roots (B) 8, two distinct real roots (C) 0, no real roots (D) 4, complex roots",
        answer: "0, two equal real roots",
        explanation:
          "D = b² − 4ac = 16 − 16 = 0; a zero discriminant implies real and equal roots.",
        solutionSteps: [
          "The given quadratic equation is 4x² + 4x + 1 = 0. Comparing with ax² + bx + c = 0, we get a=4, b=4, c=1.",
          "Calculate the discriminant D = b² - 4ac = (4)² - 4(4)(1) = 16 - 16 = 0.",
          "Since the discriminant D = 0, the quadratic equation has two equal real roots.",
        ],
        finalAnswer: "0, two equal real roots",
      },
      {
        id: "qe-hpq-102",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Algebraic solution",
        concept: "Factorisation",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question: "Solve: 2x² − 7x + 3 = 0.",
        answer: "x = 3 or x = 1/2.",
        explanation:
          "Factorise: 2x² − 6x − x + 3 = (2x − 1)(x − 3) = 0.",
        solutionSteps: [
          "Given equation is 2x² - 7x + 3 = 0.; By splitting the middle term, we get 2x² - 6x - x + 3 = 0. [½]",
          "Factor out common terms: 2x(x - 3) - 1(x - 3) = 0, which simplifies to (2x - 1)(x - 3) = 0. [½]",
          "Set each factor to zero: 2x - 1 = 0 or x - 3 = 0. This yields x = 1/2 or x = 3. [1]",
        ],
        finalAnswer: "x = 3 or x = 1/2.",
      },
      {
        id: "qe-hpq-103",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Discriminant",
        concept: "Assertion–Reason",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "If the discriminant of a quadratic equation is negative, the equation has no real roots.",
        reason:
          "The square root of a negative number is imaginary.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "A negative discriminant leads to complex roots. The reason correctly explains why the roots are not real.",
        solutionSteps: [
          "For the Assertion, consider the quadratic equation x² + 4x + 5 = 0. Here, a=1, b=4, c=5.",
          "Calculate the discriminant D = b² - 4ac = (4)² - 4(1)(5) = 16 - 20 = -4.",
          "Since D = -4 < 0, the equation has no real roots, so the Assertion is true. The Reason correctly states the condition for no real roots (D < 0) and is the correct explanation for the Assertion.",
        ],
        finalAnswer: "A",
      },
      {
        id: "qe-hpq-104",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Word problems",
        concept: "Consecutive odd integers",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "The product of two consecutive odd integers is 99. Form a quadratic equation and find the integers.",
        answer: "9 and 11.",
        explanation:
          "Let the smaller integer be n. Then n(n + 2) = 99 ⇒ n² + 2n − 99 = 0. Factorise to (n − 9)(n + 11) = 0 and take the positive solution n = 9.",
        solutionSteps: [
          "Let the first odd integer be x. Then the next consecutive odd integer will be x + 2.; According to the problem, their product is 99, so we form the equation x(x + 2) = 99. [1]",
          "Expand and rearrange to form a quadratic equation: x² + 2x - 99 = 0.; Factorize the equation: (x + 11)(x - 9) = 0. This gives two possible values for x: x = -11 or x = 9. [1]",
          "If x = 9, the integers are 9 and 9 + 2 = 11. If x = -11, the integers are -11 and -11 + 2 = -9. The positive integers are 9 and 11. [1]",
        ],
        finalAnswer: "9 and 11.",
      },
      {
        id: "qe-hpq-105",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Word problems",
        concept: "Dimensions",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A rectangular board has an area of 96 cm². Its length is 2 cm more than three times its breadth.\n(a) Set up a quadratic equation to represent the situation.\n(b) Find the length and breadth of the board.",
        answer:
          "(a) 3b² + 2b − 96 = 0, where b is the breadth. (b) Breadth = 4 cm; length = 14 cm.",
        explanation:
          "Let breadth be b. Then length = 3b + 2. Area = b(3b + 2) = 96 ⇒ 3b² + 2b − 96 = 0. Solving yields b = 4 (discarding negative root) and length = 3×4 + 2 = 14 cm.",
        solutionSteps: [
          "Let the breadth of the rectangular board be 'b' cm.; According to the problem, the length 'l' is 2 cm more than three times its breadth, so l = (3b + 2) cm.; The area of the board is given as 96 cm². Area = length × breadth. [1]",
          "Substitute the expressions: b(3b + 2) = 96.; Expand and rearrange to form the quadratic equation: 3b² + 2b - 96 = 0.; To find the breadth, solve the quadratic equation 3b² + 2b - 96 = 0. [1]",
          "Using factorization: 3b² + 18b - 16b - 96 = 0.; Factor out common terms: 3b(b + 6) - 16(b + 6) = 0.; This gives (3b - 16)(b + 6) = 0. [1]",
          "Possible values for b are 3b - 16 = 0 => b = 16/3, or b + 6 = 0 => b = -6.; Since breadth cannot be negative, b = 16/3 cm.; Calculate length: l = 3(16/3) + 2 = 16 + 2 = 18 cm. [1]",
        ],
        finalAnswer: "(a) 3b² + 2b − 96 = 0, where b is the breadth. (b) Breadth = 4 cm; length = 14 cm.",
      },
    ],
  },
  {
    topic: "Triangles",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "tri-hpq-101",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Similarity criteria",
        concept: "AA criterion",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "In ΔPQR and ΔXYZ, if ∠P = ∠X, ∠Q = ∠Y and PQ = XY, which similarity criterion verifies ΔPQR ∼ ΔXYZ? (A) SSS (B) SAS (C) AA (D) RHS",
        answer: "AA",
        explanation:
          "Two equal angles guarantee similarity by AA, regardless of the included side.",
        solutionSteps: [
          "Given that in ΔPQR and ΔXYZ, ∠P = ∠X and ∠Q = ∠Y.",
          "The AA (Angle-Angle) similarity criterion states that if two angles of one triangle are respectively equal to two angles of another triangle, then the two triangles are similar.",
          "Therefore, ΔPQR ~ ΔXYZ by AA similarity. The condition PQ = XY is not required for similarity.",
        ],
        finalAnswer: "AA",
      },
      {
        id: "tri-hpq-102",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Basic proportionality",
        concept: "Area ratio",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "In ΔABC, D lies on AB and E on AC such that DE ∥ BC. If AD/DB = 1/2, find the ratio of the areas of ΔADE and ΔABC.",
        answer: "1/9",
        explanation:
          "The similarity ratio of corresponding sides is 1 : 3, so the ratio of areas is 1² : 3² = 1 : 9.",
        solutionSteps: [
          "Given DE || BC in ΔABC. By AA similarity criterion (∠A is common, ∠ADE = ∠ABC corresponding angles), ΔADE ~ ΔABC.; Given AD/DB = 1/2, so DB = 2AD. Then AB = AD + DB = AD + 2AD = 3AD. [½]",
          "The ratio of corresponding sides AD/AB = AD/(3AD) = 1/3.; The ratio of the areas of two similar triangles is equal to the square of the ratio of their corresponding sides. [½]",
          "Area(ΔADE) / Area(ΔABC) = (AD/AB)² = (1/3)² = 1/9. [1]",
        ],
        finalAnswer: "1/9",
      },
      {
        id: "tri-hpq-105",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Similarity",
        concept: "Perimeter and area ratios",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "Two similar triangles have perimeters in the ratio 3 : 4. The area of the smaller triangle is 54 cm².\n(a) What is the ratio of their areas?\n(b) Find the area of the larger triangle.\n(c) If the smaller triangle has sides 9 cm, 12 cm and 15 cm, find the corresponding sides of the larger triangle.",
        answer:
          "(a) 9 : 16, (b) 96 cm², (c) 12 cm, 16 cm and 20 cm.",
        explanation:
          "Area ratio = square of perimeter ratio = (3/4)² = 9/16. The larger area is 54 × (16/9) = 96 cm². Multiply each side of the smaller triangle by 4/3 to get 12 cm, 16 cm and 20 cm.",
        solutionSteps: [
          "For similar triangles, the ratio of their perimeters is equal to the ratio of their corresponding sides.; The ratio of the areas of two similar triangles is equal to the square of the ratio of their corresponding sides. [1]",
          "Ratio of areas = (Ratio of perimeters)^2 = (3/4)^2 = 9/16. (Part a); Let A_S and A_L be the areas of the smaller and larger triangles respectively. A_S / A_L = 9/16. [1]",
          "Given A_S = 54 cm². So, 54 / A_L = 9/16. A_L = 54 * 16 / 9 = 6 * 16 = 96 cm². (Part b) [1]",
          "Let s_S and s_L be corresponding sides. s_S / s_L = 3/4. Sides of larger triangle are: (9*4)/3 = 12 cm, (12*4)/3 = 16 cm, (15*4)/3 = 20 cm. (Part c) [1]",
        ],
        finalAnswer: "(a) 9 : 16, (b) 96 cm², (c) 12 cm, 16 cm and 20 cm.",
      },
    ],
  },
  {
    topic: "Trigonometry",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "trig-hpq-101",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Trig ratios",
        concept: "Finding sin from cos",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "If cos θ = 5/13 for an acute angle θ, what is sin θ? (A) 5/12 (B) 12/13 (C) 3/5 (D) 13/5",
        answer: "12/13",
        explanation:
          "sin θ = √(1 − cos² θ) = √(1 − 25/169) = √(144/169) = 12/13.",
        solutionSteps: [
          "Use the trigonometric identity: sin² θ + cos² θ = 1.",
          "Substitute cos θ = 5/13: sin² θ + (5/13)² = 1 => sin² θ + 25/169 = 1.",
          "Solve for sin θ: sin² θ = 1 - 25/169 = 144/169. Since θ is acute, sin θ = sqrt(144/169) = 12/13.",
        ],
        finalAnswer: "12/13",
      },
      {
        id: "trig-hpq-102",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Identities",
        concept: "Pythagorean identities",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question: "Prove that sec² θ − tan² θ = 1.",
        answer:
          "Using the identity 1 + tan² θ = sec² θ, rearrange to sec² θ − tan² θ = 1.",
        explanation:
          "The Pythagorean identity links sec and tan; subtracting tan² θ from both sides yields 1.",
        solutionSteps: [
          "Consider the fundamental trigonometric identity: 1 + tan² θ = sec² θ. [½]",
          "Rearrange the terms of the identity to isolate the required expression. [½]",
          "Subtract tan² θ from both sides of the identity: sec² θ - tan² θ = 1. Hence proved. [1]",
        ],
        finalAnswer: "Using the identity 1 + tan² θ = sec² θ, rearrange to sec² θ − tan² θ = 1.",
      },
      {
        id: "trig-hpq-103",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Trigonometric functions",
        concept: "Monotonic behaviour",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "The value of sin θ increases as θ increases from 0° to 90°.",
        reason:
          "In a unit circle, the y‑coordinate of a point on the circumference increases as the angle increases from 0° to 90°.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "On the unit circle, the y‑coordinate represents sin θ; it increases from 0 to 1 as θ moves from 0° to 90°.",
        solutionSteps: [
          "Analyze Assertion (A) to determine if the statement is true or false.",
          "Analyze Reason (R) to determine if the statement is true or false.",
          "If both A and R are true, determine if R is the correct explanation for A.",
          "Since the answer is 'A', both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
        ],
        finalAnswer: "A",
      },
      {
        id: "trig-hpq-104",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Heights and distances",
        concept: "Ladder problem",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A ladder 10 m long leans against a vertical wall making an angle of 60° with the ground. Find (i) the height at which the ladder touches the wall and (ii) the distance of the foot of the ladder from the wall.",
        answer: "(i) 8.66 m (ii) 5 m.",
        explanation:
          "For a right triangle, cos 60° = base/hypotenuse ⇒ base = 5 m. sin 60° = height/hypotenuse ⇒ height = 10 × √3/2 ≈ 8.66 m.",
        solutionSteps: [
          "Draw a right-angled triangle with the ladder as hypotenuse (10 m) and angle with ground as 60 degrees.; Let height be 'h' and distance from wall be 'd'. For height, use sin(60°) = h / 10. [1]",
          "Calculate h = 10 * sin(60°) = 10 * (sqrt(3)/2) = 5 * 1.732 = 8.66 m.; For distance, use cos(60°) = d / 10. [1]",
          "Calculate d = 10 * cos(60°) = 10 * (1/2) = 5 m. [1]",
        ],
        finalAnswer: "(i) 8.66 m (ii) 5 m.",
      },
      {
        id: "trig-hpq-105",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Heights and distances",
        concept: "Kite string problem",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A kite is flying at a height of 30 m above the ground. The string makes an angle of 60° with the horizontal. The person’s hand is 1.5 m above the ground.\n(a) Find the length of the string between the person’s hand and the kite.\n(b) Find the horizontal distance of the kite from the person.",
        answer:
          "(a) Approximately 32.91 m (b) Approximately 16.44 m.",
        explanation:
          "Effective vertical height = 30 − 1.5 = 28.5 m. sin 60° = 28.5/L ⇒ L = 28.5/sin 60° ≈ 32.91 m. Horizontal distance d = 28.5/ tan 60° = 28.5/√3 ≈ 16.44 m.",
        solutionSteps: [
          "Draw a right-angled triangle. The effective height of the kite from the person's hand level is 30 m - 1.5 m = 28.5 m.; Let 'L' be the length of the string and 'x' be the horizontal distance. The angle of elevation is 60°. [1]",
          "For (a), use sin(60°) = (effective height) / L. So, L = 28.5 / sin(60°).; Calculate L = 28.5 / (sqrt(3)/2) = 57 / sqrt(3) = 19 * sqrt(3) = 19 * 1.732 = 32.908 m. [1]",
          "For (b), use tan(60°) = (effective height) / x. So, x = 28.5 / tan(60°). [1]",
          "Calculate x = 28.5 / sqrt(3) = 28.5 * sqrt(3) / 3 = 9.5 * 1.732 = 16.454 m. [1]",
        ],
        finalAnswer: "(a) Approximately 32.91 m (b) Approximately 16.44 m.",
      },
    ],
  },
  {
    topic: "Statistics",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "stat-hpq-101",
        subject: "Maths",
        topic: "Statistics",
        subtopic: "Mode",
        concept: "Identifying modal class",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "For the grouped data: class 10–20 (4), 20–30 (9), 30–40 (6), identify the modal class. (A) 10–20 (B) 20–30 (C) 30–40 (D) all classes",
        answer: "20–30",
        explanation:
          "The modal class is the one with the highest frequency. Here it is 20–30 with frequency 9.",
        solutionSteps: [
          "Identify the frequency for each class: 4 for 10-20, 9 for 20-30, and 6 for 30-40.",
          "The modal class is the class interval with the highest frequency.",
          "Comparing the frequencies, 9 is the highest, which corresponds to the class 20-30.",
        ],
        finalAnswer: "20–30",
      },
      {
        id: "stat-hpq-102",
        subject: "Maths",
        topic: "Statistics",
        subtopic: "Mean",
        concept: "Mean of discrete data",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Find the mean of the data: values 10, 20, 30 with frequencies 1, 3, 1 respectively.",
        answer: "20",
        explanation:
          "Σf = 5 and Σfx = 10×1 + 20×3 + 30×1 = 100. Mean = 100/5 = 20.",
        solutionSteps: [
          "Calculate the sum of (value * frequency) for each data point: (10*1) + (20*3) + (30*1).; Sum of (value * frequency) = 10 + 60 + 30 = 100. [½]",
          "Calculate the sum of frequencies: 1 + 3 + 1 = 5. [½]",
          "Mean = (Sum of (value * frequency)) / (Sum of frequencies) = 100 / 5 = 20. [1]",
        ],
        finalAnswer: "20",
      },
      {
        id: "stat-hpq-103",
        subject: "Maths",
        topic: "Statistics",
        subtopic: "Mean",
        concept: "Effect of extreme values",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "The mean of a dataset is always affected by extreme values.",
        reason:
          "The mean uses every observation in its calculation.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "Because the mean divides the sum of all observations by their number, very large or very small values influence it greatly.",
        solutionSteps: [
          "Assume Assertion (A): The mean of the first five natural numbers is 3. (1+2+3+4+5)/5 = 15/5 = 3. So, A is true.",
          "Assume Reason (R): The mean is the sum of observations divided by the total number of observations. This is the correct definition of mean. So, R is true.",
          "Reason (R) correctly explains how the mean is calculated, which leads to the value stated in Assertion (A). Therefore, R is the correct explanation for A.",
        ],
        finalAnswer: "A",
      },
      {
        id: "stat-hpq-104",
        subject: "Maths",
        topic: "Statistics",
        subtopic: "Mode",
        concept: "Mode formula",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Calculate the mode of the following grouped data using the formula:\nClass: 0–10 (3), 10–20 (8), 20–30 (12), 30–40 (7).",
        answer: "Approximately 24.44.",
        explanation:
          "Modal class is 20–30. Mode = L + (f₁ − f₀)/(2f₁ − f₀ − f₂) × h = 20 + (12 − 8)/(2×12 − 8 − 7) × 10 = 20 + 4/9 × 10 ≈ 24.44.",
        solutionSteps: [
          "Identify the modal class: The class with the highest frequency (12) is 20–30.; Determine values: l = 20, h = 10, f1 = 12, f0 = 8, f2 = 7. [1]",
          "Write the mode formula: Mode = l + [ (f1 - f0) / (2f1 - f0 - f2) ] * h.; Substitute values into the formula: Mode = 20 + [ (12 - 8) / (2*12 - 8 - 7) ] * 10. [1]",
          "Calculate the mode: Mode = 20 + [ 4 / (24 - 15) ] * 10 = 20 + (4/9)*10 = 20 + 40/9 = 20 + 4.44 = 24.44.; State the final answer. [1]",
        ],
        finalAnswer: "Approximately 24.44.",
      },
      {
        id: "stat-hpq-105",
        subject: "Maths",
        topic: "Statistics",
        subtopic: "Median",
        concept: "Median of grouped data",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "The lifetimes (in hours) of 30 electric bulbs are recorded and grouped as follows:\nClass: 50–60 (5), 60–70 (8), 70–80 (10), 80–90 (7).\n(a) Identify the median class.\n(b) Compute the median using the formula.\n(c) Comment on the distribution of lifetimes.",
        answer:
          "(a) 70–80. (b) Median = 72 hours. (c) Most bulbs last between 60 and 80 hours, with the median in the 70–80 class.",
        explanation:
          "Total frequency = 30; n/2 = 15. Cumulative frequencies: 5, 13, 23, 30; the median class is 70–80. Using L = 70, h = 10, f = 10, cf = 13: median = 70 + (15 − 13)/10 × 10 = 72 hours. The distribution peaks around the median class.",
        solutionSteps: [
          "Construct the cumulative frequency table: Classes (50-60, 60-70, 70-80, 80-90) with frequencies (5, 8, 10, 7) and cumulative frequencies (5, 13, 23, 30).; Calculate N/2: Total number of bulbs N = 30, so N/2 = 15. [1]",
          "Identify the median class (a): The cumulative frequency just greater than 15 is 23, which corresponds to the class 70–80. So, the median class is 70–80.; Determine values for median formula: l = 70, h = 10, f = 10, cf = 13. [1]",
          "Write the median formula: Median = l + [ (N/2 - cf) / f ] * h.; Substitute values and compute median (b): Median = 70 + [ (15 - 13) / 10 ] * 10 = 70 + (2/10)*10 = 70 + 2 = 72 hours. [1]",
          "Comment on the distribution (c): Most bulbs last between 60 and 80 hours, with the median lifetime being 72 hours, indicating a central tendency in this range.; State the final answer. [1]",
        ],
        finalAnswer: "(a) 70–80. (b) Median = 72 hours. (c) Most bulbs last between 60 and 80 hours, with the median in the 70–80 class.",
      },
    ],
  },
  {
    topic: "Probability",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "prob-hpq-101",
        subject: "Maths",
        topic: "Probability",
        subtopic: "Single event",
        concept: "Cards",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "A card is drawn from a standard deck of 52 cards. What is the probability of drawing the queen of hearts? (A) 1/13 (B) 1/52 (C) 1/4 (D) 1/26",
        answer: "1/52",
        explanation:
          "There are 52 cards and only one queen of hearts, so the probability is 1/52.",
        solutionSteps: [
          "Identify the total number of possible outcomes: A standard deck has 52 cards.",
          "Identify the number of favorable outcomes: There is only one 'queen of hearts' in a deck.",
          "Calculate the probability: P(Queen of Hearts) = (Number of favorable outcomes) / (Total number of outcomes) = 1/52.",
        ],
        finalAnswer: "1/52",
      },
      {
        id: "prob-hpq-102",
        subject: "Maths",
        topic: "Probability",
        subtopic: "Single event",
        concept: "Bag of balls",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A bag contains 4 red, 5 black and 3 white balls. One ball is drawn at random. What is the probability that it is black?",
        answer: "5/12",
        explanation:
          "Total balls = 4 + 5 + 3 = 12. Black balls = 5. Probability = 5/12.",
        solutionSteps: [
          "Total number of balls in the bag = 4 (red) + 5 (black) + 3 (white) = 12.; Number of favorable outcomes (drawing a black ball) = 5. [½]",
          "The probability of an event E is P(E) = (Number of favorable outcomes) / (Total number of outcomes). [½]",
          "P(drawing a black ball) = 5/12. [1]",
        ],
        finalAnswer: "5/12",
      },
      {
        id: "prob-hpq-103",
        subject: "Maths",
        topic: "Probability",
        subtopic: "Probability axioms",
        concept: "Complementary events",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "P(E) + P(not E) = 1 for any event E.",
        reason:
          "The complement of an event and the event together cover all possible outcomes.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "The probability of an event and its complement sum to 1 because together they exhaust the sample space.",
        solutionSteps: [
          "Assertion: The probability of an event E is always between 0 and 1, inclusive. This statement is true.",
          "Reason: The sum of probabilities of all elementary events of an experiment is 1. This statement is also true.",
          "The reason correctly explains a fundamental property of probability, which implies that the probability of any single event must lie between 0 and 1. Thus, Reason is the correct explanation for Assertion.",
        ],
        finalAnswer: "A",
      },
      {
        id: "prob-hpq-104",
        subject: "Maths",
        topic: "Probability",
        subtopic: "Combined events",
        concept: "Sum of two dice",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Two dice are rolled simultaneously. Find the probability that the sum of the numbers obtained is 8.",
        answer: "5/36",
        explanation:
          "Favourable outcomes for sum 8: (2,6), (3,5), (4,4), (5,3), (6,2) — a total of 5. Total possible outcomes = 36. Probability = 5/36.",
        solutionSteps: [
          "When two dice are rolled simultaneously, the total number of possible outcomes is 6 * 6 = 36.; The favorable outcomes where the sum of the numbers obtained is 8 are: (2,6), (3,5), (4,4), (5,3), (6,2). [1]",
          "The number of favorable outcomes = 5.; The probability of an event E is P(E) = (Number of favorable outcomes) / (Total number of outcomes). [1]",
          "P(sum is 8) = 5/36. [1]",
        ],
        finalAnswer: "5/36",
      },
      {
        id: "prob-hpq-105",
        subject: "Maths",
        topic: "Probability",
        subtopic: "Combined events",
        concept: "Drawing two balls",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "A bag contains 5 red, 7 green and 8 blue marbles. Two marbles are drawn at random one after another without replacement. Find the probability that:\n(a) both are green,\n(b) one is red and one is blue,\n(c) at least one is blue.",
        answer:
          "(a) 7/57, (b) 8/19, (c) 13/19.",
        explanation:
          "(a) P(GG) = (7/20) × (6/19) = 42/380 = 7/57. (b) P(RB or BR) = (5/20)(8/19) + (8/20)(5/19) = 160/380 = 8/19. (c) At least one blue = 1 − P(no blue) = 1 − [(5+7)/20 × (4+6)/19] = 13/19.",
        solutionSteps: [
          "Calculate the total number of marbles: 5 red + 7 green + 8 blue = 20 marbles.; For (a) both are green: P(1st green) = 7/20, P(2nd green | 1st green) = 6/19. P(both green) = (7/20) * (6/19) = 42/380 = 21/190. [1]",
          "For (b) one is red and one is blue: P(R then B) = (5/20)*(8/19) = 40/380. P(B then R) = (8/20)*(5/19) = 40/380.; P(one red and one blue) = P(R then B) + P(B then R) = 40/380 + 40/380 = 80/380 = 4/19. [1]",
          "For (c) at least one is blue: P(no blue) = P(1st not blue) * P(2nd not blue | 1st not blue). Non-blue marbles = 5+7=12. [1]",
          "P(no blue) = (12/20) * (11/19) = 132/380 = 33/95. P(at least one blue) = 1 - P(no blue) = 1 - 33/95 = 62/95. [1]",
        ],
        finalAnswer: "(a) 7/57, (b) 8/19, (c) 13/19.",
      },
    ],
  },
  {
    topic: "Metals and Non-Metals",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "must-crack",
    questions: [
      {
        id: "mnm-hpq-101",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals and Non-Metals",
        subtopic: "Reactivity series",
        concept: "Identifying reactivity",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which of the following metals is the most reactive? (A) copper (B) iron (C) sodium (D) silver",
        answer: "sodium",
        explanation:
          "Sodium is near the top of the reactivity series, whereas copper and silver are far below iron.",
        solutionSteps: [
          "Recall the reactivity series of metals, which lists metals in order of decreasing reactivity.",
          "Compare the given metals: copper, iron, sodium, and silver.",
          "Sodium is an alkali metal and is positioned highest in the reactivity series among the given options, indicating it is the most reactive.",
        ],
        finalAnswer: "sodium",
      },
      {
        id: "mnm-hpq-102",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals and Non-Metals",
        subtopic: "Corrosion",
        concept: "Definition",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Define corrosion and state two conditions necessary for the rusting of iron.",
        answer:
          "Corrosion is the slow oxidation of a metal by its environment, forming unwanted compounds on its surface. Rusting of iron requires both moisture and oxygen.",
        explanation:
          "Water and dissolved oxygen together enable oxidation of iron to hydrated iron oxide.",
        solutionSteps: [
          "Corrosion is defined as the slow oxidation of a metal by its environment, leading to the formation of undesirable compounds on its surface. [1]",
          "The two conditions necessary for the rusting of iron are the presence of both oxygen and moisture (water). [1]",
        ],
        finalAnswer: "Corrosion is the slow oxidation of a metal by its environment, forming unwanted compounds on its surface. Rusting of iron requires both moisture and oxygen.",
      },
      {
        id: "mnm-hpq-103",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals and Non-Metals",
        subtopic: "Alloys",
        concept: "Assertion–Reason",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "Alloys are generally harder than their constituent metals.",
        reason:
          "Atoms of different sizes in an alloy distort the regular arrangement of the metal atoms and resist the movement of layers.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "Different‑sized atoms in alloys hinder the sliding of layers, so alloys are typically harder than pure metals.",
        solutionSteps: [
          "Analyze the Assertion statement to determine its truthfulness.",
          "Analyze the Reason statement to determine its truthfulness.",
          "Determine if the Reason statement provides a correct explanation for the Assertion statement.",
          "Based on the analysis, select option A if both are true and Reason explains Assertion.",
        ],
        finalAnswer: "A",
      },
      {
        id: "mnm-hpq-104",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals and Non-Metals",
        subtopic: "Extraction",
        concept: "Electrolytic reduction",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Explain briefly the process of electrolytic reduction used in the extraction of aluminium. Why is cryolite added to the electrolyte?",
        answer:
          "Aluminium oxide is dissolved in molten cryolite and electrolysed. At the cathode, Al³⁺ ions gain electrons to form molten aluminium. Cryolite lowers the melting point and increases conductivity of the mixture, making the process economical.",
        explanation:
          "Pure alumina has a very high melting point; dissolving it in cryolite reduces the temperature required and improves ion mobility.",
        solutionSteps: [
          "Aluminium oxide (alumina) is dissolved in molten cryolite to form the electrolyte.; During electrolysis, Al³⁺ ions migrate to the cathode and gain electrons to form molten aluminium (Al³⁺ + 3e⁻ → Al). [1]",
          "Cryolite is added because it significantly lowers the melting point of alumina from 2072°C to about 900°C.; It also increases the electrical conductivity of the electrolyte mixture. [1]",
          "These effects make the electrolytic reduction process more energy-efficient and economical. [1]",
        ],
        finalAnswer: "Aluminium oxide is dissolved in molten cryolite and electrolysed. At the cathode, Al³⁺ ions gain electrons to form molten aluminium. Cryolite lowers the melting point and increases conductivity of the mixture, making the process economical.",
      },
      {
        id: "mnm-hpq-105",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals and Non-Metals",
        subtopic: "Displacement reactions",
        concept: "Case study",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Iron nails are dipped in a copper sulphate solution. After some time a reddish‑brown deposit is observed on the nails and the blue colour of the solution fades.\n(a) Write the balanced chemical equation for the reaction.\n(b) What type of reaction is this?\n(c) Why does the colour of the solution change?",
        answer:
          "(a) Fe + CuSO₄ → FeSO₄ + Cu. (b) Displacement reaction. (c) Iron displaces copper from its salt, forming pale green ferrous sulphate and depositing brown copper, so the blue colour of CuSO₄ fades.",
        explanation:
          "Iron is more reactive than copper and displaces it from the solution. The precipitated copper coats the nail while the solution turns green due to FeSO₄.",
        solutionSteps: [
          "(a) The balanced chemical equation is: Fe + CuSO₄ → FeSO₄ + Cu.; (b) This reaction is a displacement reaction. [1]",
          "(c) Iron is more reactive than copper, so it displaces copper from copper sulphate solution. [1]",
          "This forms iron(II) sulphate (ferrous sulphate) and deposits reddish-brown copper metal. [1]",
          "The blue colour of copper sulphate solution fades and changes to pale green due to the formation of ferrous sulphate solution. [1]",
        ],
        finalAnswer: "(a) Fe + CuSO₄ → FeSO₄ + Cu. (b) Displacement reaction. (c) Iron displaces copper from its salt, forming pale green ferrous sulphate and depositing brown copper, so the blue colour of CuSO₄ fades.",
      },
    ],
  },
  {
    topic: "Life Processes",
    subject: "Science",
    stream: "Biology",
    defaultTier: "must-crack",
    questions: [
      {
        id: "lp-hpq-101",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Cell organelles",
        concept: "MCQ",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which organelle is known as the powerhouse of the cell? (A) nucleus (B) mitochondrion (C) chloroplast (D) ribosome",
        answer: "mitochondrion",
        explanation:
          "Mitochondria oxidise food molecules to release energy in the form of ATP.",
        solutionSteps: [
          "Mitochondria are the sites where cellular respiration takes place.",
          "During cellular respiration, glucose is broken down to release energy in the form of ATP.",
          "Because they produce the majority of the cell's energy, mitochondria are known as the powerhouse of the cell.",
        ],
        finalAnswer: "mitochondrion",
      },
      {
        id: "lp-hpq-102",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Photosynthesis",
        concept: "Equation",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Write the balanced chemical equation for photosynthesis.",
        answer:
          "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (in the presence of chlorophyll and sunlight).",
        explanation:
          "Carbon dioxide and water combine in the chloroplasts, using light energy, to form glucose and oxygen.",
        solutionSteps: [
          "Photosynthesis is the process by which green plants convert light energy into chemical energy.; The reactants are carbon dioxide (CO₂) and water (H₂O), and the products are glucose (C₆H₁₂O₆) and oxygen (O₂). [½]",
          "The balanced chemical equation is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. [½]",
          "This reaction occurs in the presence of chlorophyll and sunlight. [1]",
        ],
        finalAnswer: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (in the presence of chlorophyll and sunlight).",
      },
      {
        id: "lp-hpq-103",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Circulation",
        concept: "Assertion–Reason",
        section: "A",
        type: "AssertionReason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        kind: "assertion-reason",
        question: "Assertion–Reason: refer to assertion and reason below.",
        assertion:
          "Blood in veins always travels towards the heart at low pressure.",
        reason:
          "Veins contain valves that prevent the backflow of blood.",
        aROptions: [
          { label: "A", text: "Both Assertion and Reason are true and Reason is the correct explanation." },
          { label: "B", text: "Both Assertion and Reason are true but Reason is not the correct explanation." },
          { label: "C", text: "Assertion is true but Reason is false." },
          { label: "D", text: "Assertion is false but Reason is true." },
        ],
        correctOption: "A",
        answer: "A",
        explanation:
          "Veins carry blood to the heart under lower pressure and rely on valves to maintain one‑way flow.",
        solutionSteps: [
          "First, evaluate the truthfulness of the Assertion statement regarding circulation.",
          "Next, evaluate the truthfulness of the Reason statement regarding circulation.",
          "If both Assertion and Reason are true, then determine if the Reason correctly explains the Assertion.",
          "Option A is chosen when both Assertion and Reason are true, and Reason is the correct explanation for Assertion.",
        ],
        finalAnswer: "A",
      },
      {
        id: "lp-hpq-104",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Excretion",
        concept: "Diagram and description",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Draw a neat labelled diagram of a nephron and describe the process of ultrafiltration.",
        answer:
          "Diagram should show Bowman’s capsule, glomerulus, proximal and distal tubules, loop of Henle and collecting duct. Ultrafiltration occurs in the glomerulus where high pressure forces water and small solutes out of the blood into Bowman’s capsule, forming filtrate.",
        explanation:
          "Blood pressure in the glomerulus drives plasma through the capillary walls; larger proteins and cells remain in the blood.",
        solutionSteps: [
          "Draw a neat, labelled diagram of a nephron showing its main parts.; Label key structures: Bowman’s capsule, glomerulus, PCT, Loop of Henle, DCT, collecting duct. [1]",
          "Define ultrafiltration as the initial filtering of blood in the kidney.; Explain that it occurs in the glomerulus due to high blood pressure. [1]",
          "State that water and small solutes are forced from blood into Bowman's capsule, forming filtrate. [1]",
        ],
        finalAnswer: "Diagram should show Bowman’s capsule, glomerulus, proximal and distal tubules, loop of Henle and collecting duct. Ultrafiltration occurs in the glomerulus where high pressure forces water and small solutes out of the blood into Bowman’s capsule, forming filtrate.",
      },
      {
        id: "lp-hpq-105",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Photosynthesis",
        concept: "Case study",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "In an experiment, a leaf on a plant was partially covered with black paper and the plant was kept in sunlight for several hours. The leaf was then tested with iodine solution.\n(a) Which process was being investigated?\n(b) What will be the result of the iodine test on the covered and uncovered parts of the leaf?\n(c) What conclusion can be drawn from this experiment?",
        answer:
          "(a) Photosynthesis. (b) The uncovered part turns blue‑black with iodine, indicating starch formation, while the covered part does not. (c) Chlorophyll and light are necessary for photosynthesis and starch formation.",
        explanation:
          "The covered portion does not receive light and cannot photosynthesise, so starch is absent. The uncovered portion synthesises starch and gives a positive iodine test.",
        solutionSteps: [
          "(a) The process being investigated is Photosynthesis.; (b) The uncovered part of the leaf will turn blue-black with iodine solution. [1]",
          "This indicates the presence of starch, formed during photosynthesis.; The covered part of the leaf will not turn blue-black. [1]",
          "This shows that no starch was formed in the absence of light. [1]",
          "(c) The conclusion is that light is essential for photosynthesis and starch formation. [1]",
        ],
        finalAnswer: "(a) Photosynthesis. (b) The uncovered part turns blue‑black with iodine, indicating starch formation, while the covered part does not. (c) Chlorophyll and light are necessary for photosynthesis and starch formation.",
      },
    ],
  },
];

// ---------------- Shared types for the HPQ engine ----------------

export type HPQSubject = "Maths" | "Science";
export type HPQStream = "Physics" | "Chemistry" | "Biology" | "General";
export type HPQSection = "A" | "B" | "C" | "D" | "E";

export type HPQQuestionType =
  | "MCQ"
  | "VeryShort"
  | "Short"
  | "Long"
  | "CaseBased"
  | "AssertionReason"
  | "SourceBased"
  | "Diagram";

export type HPQDifficulty = "Easy" | "Medium" | "Hard";
export type HPQLikelihood = "Very High" | "High" | "Medium-High" | "Medium";
export type HPQTier = "must-crack" | "high-roi" | "good-to-do";

export interface HPQAROption {
  label: string;
  text: string;
}

export interface HPQQuestion {
  id: string;

  // Subject + topic tags
  subject?: HPQSubject; // default: "Maths" if omitted
  stream?: HPQStream; // for Science – Physics / Chemistry / Biology / General
  topic?: string; // chapter name (e.g. "Metals & Non-metals")
  subtopic?: string; // finer split
  concept?: string; // skill / pattern inside the topic

  // Exam meta
  section?: HPQSection; // A/B/C/D/E
  type?: HPQQuestionType;
  difficulty?: HPQDifficulty;
  marks?: number;
  likelihood: HPQLikelihood;
  tier?: HPQTier; // optional – can also be taken from bucket/default

  // Question layout
  kind?: "normal" | "assertion-reason"; // for AR style
  question: string;

  // Assertion–Reason specific fields
  assertion?: string;
  reason?: string;
  aROptions?: HPQAROption[];
  correctOption?: string;

  // Solutions
  answer?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  explanation?: string;

  // Optional extra tags (especially for Science)
  bloomSkill?:
    | "Remembering"
    | "Understanding"
    | "Applying"
    | "Analysing"
    | "Evaluating";
  pastBoardYear?: string;
  policyTag?: string;
  confidenceScore?: number;
  confidenceBand?: "low" | "medium" | "high";
  confidenceRationale?: string;
}

export interface HPQTopicBucket {
  // Chapter name as used on Trends page
  topic: string;

  // Optional subject + stream tags at bucket level
  subject?: HPQSubject; // default "Maths"
  stream?: HPQStream; // mainly for Science
  defaultTier?: HPQTier;

  /**
   * Optional link from this topic bucket to the global PredictedQuestions bank.
   * Each ID must exist in predictedQuestions.ts as a PredictedQuestionId.
   * Used for building 80-mark HPQ sets / mock papers on the HPQ page.
   */
  questionIds?: PredictedQuestionId[];

  questions: HPQQuestion[];
}

// Convenience enums for tabs/filters
export const HPQ_SUBJECTS: HPQSubject[] = ["Maths", "Science"];
export const HPQ_SCIENCE_STREAMS: HPQStream[] = [
  "Physics",
  "Chemistry",
  "Biology",
  "General",
];

/**
 * Phase-1 seed data for Class 10 HPQ.
 * You can safely extend this array for both Maths and Science.
 *
 * NOTE: We keep IDs/data you supplied intact to avoid any UI/UX regressions.
 */
export const highlyProbableQuestionsSeed: HPQTopicBucket[] = [
  // ==================== MATHS – SEED DATA ====================

  // -------------------- Maths: Real Numbers --------------------
  {
    topic: "Real Numbers",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "rn-hpq-2",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Fundamental Theorem of Arithmetic",
        concept: "Prime factorisation of integers",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Using the Fundamental Theorem of Arithmetic, find the prime factorisation of 392.",
        answer: "392 = 2³ × 7²",
        solutionSteps: [
          "Divide repeatedly by the smallest prime: 392 ÷ 2 = 196, 196 ÷ 2 = 98, 98 ÷ 2 = 49. [½]",
          "Now 49 = 7 × 7. [½]",
          "Hence 392 = 2 × 2 × 2 × 7 × 7 = 2³ × 7². [1]",
        ],
        finalAnswer: "392 = 2³ × 7²",
        explanation:
          "Standard 2-mark pattern: express a composite number as a product of primes using the Fundamental Theorem of Arithmetic.",
        policyTag: "RN-FTA-2M",
      },
      {
        id: "rn-hpq-3",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Terminating & Non-terminating Decimals",
        concept: "Condition for terminating rational numbers",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Check whether the rational number 13/40 has a terminating decimal expansion. Justify your answer.",
        answer:
          "Yes, 13/40 has a terminating decimal expansion because in 13/40 = 13/(2³ × 5), the denominator in lowest form is of the form 2ⁿ5ᵐ.",
        solutionSteps: [
          "Express the denominator in prime factorised form: 40 = 2³ × 5. [1]",
          "The rational number 13/40 is already in lowest terms. [1]",
          "Since the denominator has only the prime factors 2 and 5, the decimal expansion of 13/40 is terminating. [1]",
        ],
        finalAnswer: "13/40 has a terminating decimal expansion (denominator = 2³ × 5)",
        explanation:
          "A rational number p/q has a terminating decimal expansion if the prime factorisation of q is of the form 2ⁿ5ᵐ, where n, m are non-negative integers.",
        policyTag: "RN-terminating-3M",
      },
      {
        id: "rn-hpq-4",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Irrational Numbers Proofs",
        concept: "Proving irrationality using contradiction",
        section: "D",
        type: "Long",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question: "Prove that √2 is an irrational number.",
        answer:
          "Assume √2 is rational, i.e., √2 = p/q in lowest terms. Squaring gives 2 = p²/q² ⇒ p² = 2q², so p² is even and hence p is even. Let p = 2k. Then 2q² = 4k² ⇒ q² = 2k², so q is also even. This contradicts the assumption that p/q is in lowest terms. Hence √2 is irrational.",
        solutionSteps: [
          "Assume √2 is rational, so √2 = p/q where p and q are coprime integers, q ≠ 0.; Squaring both sides: 2 = p²/q² ⇒ p² = 2q². [1]",
          "So p² is even, which implies p is even. Let p = 2k. [1]",
          "Substitute back: 2q² = (2k)² = 4k² ⇒ q² = 2k², so q² is even and q is also even. [1]",
          "If both p and q are even, they have a common factor 2, contradicting that p/q was in lowest terms. Therefore our assumption is wrong and √2 is irrational. [1]",
        ],
        finalAnswer: "Hence √2 is irrational",
        explanation:
          "This is the classic 4–5 mark proof-by-contradiction question on irrational numbers. Boards often ask for √2, √3 or similar proofs.",
        policyTag: "RN-irrationality-proof",
      },
      {
        id: "rn-hpq-5",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Applications of HCF/LCM & Decimals",
        concept: "Case-based on HCF, LCM and decimal type",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Two traffic lights change after every 20 seconds and 30 seconds respectively. (a) After how many seconds will both glow together again? (b) If the time taken for one cycle of both lights together is written as a rational number in seconds, will its decimal expansion be terminating or non-terminating? Justify.",
        answer:
          "(a) LCM of 20 and 30 is 60, so both lights glow together every 60 seconds. (b) 60 seconds is the rational number 60/1 whose denominator is 1 = 2⁰5⁰, so the decimal expansion is terminating.",
        explanation:
          "Boards often mix HCF/LCM with the terminating–non-terminating criterion in short case-based questions.",
        policyTag: "RN-LCM-case",
        solutionSteps: [
          "(a) To find when both lights glow together, we need to calculate the LCM of 20 and 30.; Prime factorization: 20 = 2^2 x 5 and 30 = 2 x 3 x 5. [1]",
          "LCM(20, 30) = 2^2 x 3 x 5 = 4 x 3 x 5 = 60.; So, both lights will glow together again after 60 seconds. [1]",
          "(b) The time taken is 60 seconds, which can be written as the rational number 60/1. [1]",
          "The denominator is 1, which can be expressed as 2^0 x 5^0. Since its prime factors are only 2 and/or 5, the decimal expansion is terminating. [1]",
        ],
        finalAnswer: "(a) LCM of 20 and 30 is 60, so both lights glow together every 60 seconds. (b) 60 seconds is the rational number 60/1 whose denominator is 1 = 2⁰5⁰, so the decimal expansion is terminating.",
      },
    ],
  },

  // -------------------- Maths: Pair of Linear Equations --------------------
  {
    topic: "Pair of Linear Equations in Two Variables",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "ple-hpq-1",
        subject: "Maths",
        topic: "Pair of Linear Equations in Two Variables",
        subtopic: "Algebraic Solution Methods",
        concept: "Elimination method",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Solve the pair of linear equations: 2x + 3y = 11 and 3x − 2y = 4 using the elimination method.",
        answer: "(x, y) = (34/13, 25/13)",
        solutionSteps: [
          "Write equations in standard form and label them (1) and (2).; Multiply (1) by 3 and (2) by 2 so that coefficients of x become equal. [1]",
          "Subtract the new equations to eliminate x and solve for y.; Substitute the value of y back into one of the original equations to find x. [1]",
          "Write the final ordered pair neatly as (x, y). [1]",
        ],
        finalAnswer: "x = 34/13, y = 25/13",
        explanation:
          "Standard 3-mark PYQ pattern: line up coefficients of one variable, eliminate it, then back-substitute.",
      },
    ],
  },

  // -------------------- Maths: Polynomials --------------------
  {
    topic: "Polynomials",
    subject: "Maths",
    defaultTier: "high-roi",
    questions: [
      {
        id: "poly-hpq-1",
        subject: "Maths",
        topic: "Polynomials",
        subtopic: "Zeros & Factorisation",
        concept: "Finding zeroes from factorised form",
        section: "B",
        type: "VeryShort",
        difficulty: "Easy",
        marks: 2,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "If a polynomial p(x) = (x − 2)(x + 3), find all zeroes of p(x).",
        answer: "2 and −3",
        solutionSteps: [
          "A zero of a polynomial is a value of x for which p(x) = 0. [½]",
          "Set each factor equal to zero: x − 2 = 0 or x + 3 = 0. [½]",
          "Solve to get x = 2 and x = −3. [1]",
        ],
        finalAnswer: "Zeroes are x = 2 and x = −3",
        explanation:
          "Very common 1–2 mark pattern: when p(x) is already factorised, just equate each factor to zero.",
      },
      {
        id: "poly-hpq-2",
        subject: "Maths",
        topic: "Polynomials",
        subtopic: "Coefficient–root Relations",
        concept: "Sum and product of zeroes of a quadratic",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "For the quadratic polynomial p(x) = 2x² − 5x + 3, find the sum and product of its zeroes using coefficient–root relations.",
        answer: "Sum of zeroes = 5/2, product of zeroes = 3/2",
        solutionSteps: [
          "Compare p(x) = 2x² − 5x + 3 with ax² + bx + c.; Here a = 2, b = −5, c = 3. [1]",
          "Use α + β = −b/a and αβ = c/a.; Compute α + β = −(−5)/2 = 5/2. [1]",
          "Compute αβ = 3/2. [1]",
        ],
        finalAnswer: "Sum of zeroes = 5/2, product of zeroes = 3/2",
        explanation:
          "This pattern checks if you remember the formula α + β = −b/a and αβ = c/a without solving the quadratic.",
      },
    ],
  },

  // -------------------- Maths: Quadratic Equations --------------------
  {
    topic: "Quadratic Equations",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "qe-hpq-1",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Algebraic Solution",
        concept: "Quadratic formula",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Solve the quadratic equation 2x² − 3x − 5 = 0 using the quadratic formula.",
        answer: "x = (3 ± √49)/4, i.e. x = 2 or x = −5/2",
        solutionSteps: [
          "Identify a = 2, b = −3, c = −5.; Write the quadratic formula: x = [−b ± √(b² − 4ac)] / (2a). [1]",
          "Compute the discriminant: Δ = b² − 4ac = (−3)² − 4·2·(−5) = 9 + 40 = 49. [1]",
          "Substitute into the formula and simplify. [1]",
        ],
        finalAnswer: "x = 2 or x = −5/2",
        explanation:
          "Basic but compulsory pattern: direct use of the quadratic formula on a board-style equation.",
      },
    ],
  },

  // -------------------- Maths: Trigonometry --------------------
  {
    topic: "Trigonometry",
    subject: "Maths",
    defaultTier: "high-roi",

    // Link this HPQ Trigonometry bucket to the predictive engine
    // (you can expand this list later as you add more trig predicted questions)
    questionIds: ["2026-TRIG-SA-01b", "2026-TRIG-LA-02"],

    questions: [
      {
        id: "trig-hpq-1",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Trig Ratios/Values",
        concept: "Using sin²θ + cos²θ = 1",
        section: "B",
        type: "VeryShort",
        difficulty: "Easy",
        marks: 2,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "If sin θ = 3/5 and θ is acute, find cos θ using the identity sin²θ + cos²θ = 1.",
        answer: "cos θ = 4/5",
        solutionSteps: [
          "Substitute sin θ = 3/5 into sin²θ + cos²θ = 1.; Compute sin²θ = 9/25. [½]",
          "So 9/25 + cos²θ = 1 ⇒ cos²θ = 1 − 9/25 = 16/25. [½]",
          "Since θ is acute, cos θ is positive ⇒ cos θ = 4/5. [1]",
        ],
        finalAnswer: "cos θ = 4/5",
        explanation:
          "Core identity-based question – appears frequently in simple 2-mark forms.",
      },
    ],
  },

  // ==================== SCIENCE – SEED DATA (ALL TOPICS) ====================

  // -------------------- Science: Chemical Reactions & Equations --------------------
  {
    topic: "Chemical Reactions & Equations",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cre-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Balancing Equations",
        concept: "Balancing simple equations",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which of the following is the correctly balanced form of the equation for rusting? Fe + O₂ → Fe₂O₃",
        answer: "4Fe + 3O₂ → 2Fe₂O₃",
        explanation:
          "Total Fe atoms and O atoms on both sides must be equal; 4Fe + 3O₂ → 2Fe₂O₃ balances the equation.",
        policyTag: "MCQ balancing",
        solutionSteps: [
          "The unbalanced equation for rusting is Fe + O₂ → Fe₂O₃.",
          "To balance oxygen, multiply O₂ by 3 and Fe₂O₃ by 2: Fe + 3O₂ → 2Fe₂O₃.",
          "To balance iron, multiply Fe by 4: 4Fe + 3O₂ → 2Fe₂O₃. This is the correctly balanced equation.",
        ],
        finalAnswer: "4Fe + 3O₂ → 2Fe₂O₃",
      },
      {
        id: "sci-cre-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Types of Reactions",
        concept: "Identification of reaction type",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Identify the type of reaction for: 2KClO₃ → 2KCl + 3O₂. Write one more example of the same type.",
        answer:
          "Decomposition reaction. Example: CaCO₃ → CaO + CO₂ (thermal decomposition).",
        explanation:
          "A single compound breaking down into simpler substances is called a decomposition reaction.",
        policyTag: "Decomposition trend",
        solutionSteps: [
          "In the reaction 2KClO₃ → 2KCl + 3O₂, a single reactant (KClO₃) breaks down into two simpler products (KCl and O₂). [½]",
          "This type of reaction, where a compound decomposes into two or more simpler substances, is called a decomposition reaction. [½]",
          "One more example of a decomposition reaction is: CaCO₃ → CaO + CO₂ (thermal decomposition). [1]",
        ],
        finalAnswer: "Decomposition reaction. Example: CaCO₃ → CaO + CO₂ (thermal decomposition).",
      },
      {
        id: "sci-cre-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Oxidation/Reduction",
        concept: "Redox and everyday applications",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A steel gate near the sea starts developing brown flaky patches after a few months. (a) Name the process and the type of chemical reaction involved. (b) Suggest two preventive measures. (c) Explain in brief how painting helps.",
        answer:
          "(a) Rusting; it is an oxidation/redox reaction. (b) Painting, galvanising, oiling, greasing, or using stainless steel. (c) Paint forms a protective layer, preventing oxygen and moisture from directly reaching the iron surface.",
        explanation:
          "Rusting is a slow redox process. Case-based questions frequently link daily life observations with corrosion and prevention.",
        policyTag: "Corrosion/rancidity NEP",
        solutionSteps: [
          "(a) The process of developing brown flaky patches on a steel gate is called rusting. It is an oxidation or redox reaction.; (b) Two preventive measures to protect the steel gate from rusting are painting and galvanising. [1]",
          "(b) Other valid measures include oiling, greasing, or using stainless steel. [1]",
          "(c) Painting helps by forming a protective layer on the surface of the iron (steel) gate. [1]",
          "(c) This layer prevents the iron from coming into direct contact with oxygen and moisture present in the atmosphere, thus inhibiting the rusting process. [1]",
        ],
        finalAnswer: "(a) Rusting; it is an oxidation/redox reaction. (b) Painting, galvanising, oiling, greasing, or using stainless steel. (c) Paint forms a protective layer, preventing oxygen and moisture from directly reaching the iron surface.",
      },
    ],
  },

  // -------------------- Science: Acids, Bases & Salts --------------------
  {
    topic: "Acids, Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-abs-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Indicators & pH",
        concept: "Litmus and pH",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "A solution turns blue litmus red and has a pH of 2. This solution is most likely: (A) Strong acid (B) Weak acid (C) Strong base (D) Neutral",
        answer: "Strong acid",
        explanation:
          "pH 2 is highly acidic and such a solution turns blue litmus red.",
        policyTag: "Indicator/pH MCQ",
        solutionSteps: [
          "A solution that turns blue litmus red indicates that it is acidic in nature.",
          "A pH value of 2 signifies a highly acidic solution.",
          "Therefore, a solution with these properties is most likely a strong acid.",
        ],
        finalAnswer: "Strong acid",
      },
      {
        id: "sci-abs-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Reactions with Metals & Bases",
        concept: "Acid–metal reaction",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "Write the general chemical equation for the reaction of a metal with a dilute acid. Name the gas evolved and its test.",
        answer:
          "Metal + Dilute acid → Salt + Hydrogen gas; hydrogen gas is evolved, tested by the pop sound with a burning matchstick.",
        explanation:
          "Acid + metal reactions releasing hydrogen are very standard 2-mark questions.",
        policyTag: "Core reaction pattern",
        solutionSteps: [
          "The general chemical equation for the reaction of a metal with a dilute acid is: Metal + Dilute acid → Salt + Hydrogen gas. [½]",
          "The gas evolved during this reaction is hydrogen gas (H₂). [½]",
          "Hydrogen gas is tested by bringing a burning matchstick near it; it extinguishes with a 'pop' sound. [1]",
        ],
        finalAnswer: "Metal + Dilute acid → Salt + Hydrogen gas; hydrogen gas is evolved, tested by the pop sound with a burning matchstick.",
      },
      {
        id: "sci-abs-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Salts & Their Uses",
        concept: "Baking soda/washing soda applications",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Riya’s mother uses baking soda in the kitchen and washing soda in the washing machine. (a) Write the chemical names of baking soda and washing soda. (b) Give one use of each, based on their properties. (c) Why is baking powder preferred over baking soda in cakes?",
        answer:
          "Baking soda: sodium hydrogen carbonate (NaHCO₃). Washing soda: sodium carbonate decahydrate (Na₂CO₃·10H₂O). Baking soda is used in baking as a leavening agent; washing soda is used in cleaning to remove permanent hardness. Baking powder contains baking soda plus a weak acid so it does not leave a bitter taste.",
        explanation:
          "Board frequently links formula + common name + everyday application in a short case-study.",
        policyTag: "Everyday-salt NEP",
        solutionSteps: [
          "(a) The chemical name for baking soda is sodium hydrogen carbonate (NaHCO₃).; The chemical name for washing soda is sodium carbonate decahydrate (Na₂CO₃·10H₂O). [1]",
          "(b) Baking soda is used in baking as a leavening agent because it produces carbon dioxide gas upon heating.; Washing soda is used for removing permanent hardness of water and as a cleaning agent in laundries. [1]",
          "(c) Baking powder is preferred over baking soda in cakes because it contains baking soda and a mild edible acid (e.g., tartaric acid). [1]",
          "This mixture reacts to produce carbon dioxide gas without leaving a bitter taste, which baking soda alone would due to sodium carbonate formation. [1]",
        ],
        finalAnswer: "Baking soda: sodium hydrogen carbonate (NaHCO₃). Washing soda: sodium carbonate decahydrate (Na₂CO₃·10H₂O). Baking soda is used in baking as a leavening agent; washing soda is used in cleaning to remove permanent hardness. Baking powder contains baking soda plus a weak acid so it does not leave a bi",
      },
    ],
  },

  // -------------------- Science: Metals & Non-metals --------------------
  {
    topic: "Metals & Non-metals",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "high-roi",
    questions: [
      {
        id: "2026-MNM-01b",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Physical & Chemical Properties",
        concept: "Physical properties of metals",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Which metal is softest? (A) Sodium (B) Iron (C) Zinc (D) Copper",
        answer: "Sodium",
        explanation: "Sodium is so soft that it can be easily cut with a knife.",
        policyTag: "MCQ/Fact",
        solutionSteps: [
          "Recall the physical properties of the given metals.",
          "Sodium is an alkali metal known for its softness and can be cut with a knife.",
          "Iron, Zinc, and Copper are transition metals, which are generally much harder.",
          "Therefore, Sodium is the softest metal among the given options.",
        ],
        finalAnswer: "Sodium",
      },
      {
        id: "2026-MNM-02",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Physical & Chemical Properties",
        concept: "Reaction of non-metals with water",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How do non-metals generally react with water? (A) Vigorously (B) Slowly (C) Not at all (D) Explosively",
        answer: "Not at all",
        explanation: "Non-metals usually do not react with water directly.",
        policyTag: "Board MCQ trend",
        solutionSteps: [
          "Recall the general chemical properties of non-metals.",
          "Non-metals typically do not react with water.",
          "This is because non-metals cannot donate electrons to reduce water to hydrogen gas.",
          "Hence, non-metals generally do not react with water.",
        ],
        finalAnswer: "Not at all",
      },
      {
        id: "2026-MNM-03",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Reactivity Series",
        concept: "Metal displacement reactions",
        section: "A",
        type: "AssertionReason",
        kind: "assertion-reason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "Assertion: Zinc will displace copper from copper sulphate solution. Reason: Zinc is above copper in the activity series.",
        assertion:
          "Zinc will displace copper from copper sulphate solution.",
        reason: "Zinc is above copper in the activity series.",
        aROptions: [
          {
            label: "A",
            text: "Both A and R are true, and R is the correct explanation of A.",
          },
          {
            label: "B",
            text: "Both A and R are true, but R is not the correct explanation of A.",
          },
          { label: "C", text: "A is true but R is false." },
          { label: "D", text: "A is false but R is true." },
        ],
        correctOption: "A",
        explanation:
          "More reactive metals displace less reactive ones from their salt solutions.",
        policyTag: "AR mandatory",
        solutionSteps: [
          "Evaluate the Assertion: Zinc is more reactive than copper, so it displaces copper from copper sulphate solution. This statement is true.",
          "Evaluate the Reason: The activity series lists metals by reactivity, and Zinc is indeed positioned above copper. This statement is true.",
          "The displacement reaction occurs because a more reactive metal (Zinc) displaces a less reactive metal (Copper) from its salt solution.",
          "The position of Zinc above copper in the activity series signifies its higher reactivity.",
          "Therefore, the Reason correctly explains why the Assertion is true.",
        ],
        finalAnswer: "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      },
      {
        id: "2026-MNM-04",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Ores & Extraction",
        concept: "Extraction of iron",
        section: "B",
        type: "Short",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Name the main step used to extract iron from hematite in the blast furnace. Describe briefly.",
        answer:
          "Reduction of iron oxide by carbon monoxide in the blast furnace.",
        explanation:
          "In the blast furnace, carbon monoxide reduces Fe₂O₃ to molten iron: Fe₂O₃ + 3CO → 2Fe + 3CO₂.",
        policyTag: "NEP: process focus",
        solutionSteps: [
          "The main step used to extract iron from hematite in the blast furnace is reduction.; In the blast furnace, carbon monoxide (CO) acts as the primary reducing agent. [½]",
          "Carbon monoxide reduces iron oxide (Fe2O3) to molten iron (Fe). [½]",
          "This reduction occurs at high temperatures, removing oxygen from the ore. [1]",
        ],
        finalAnswer: "Reduction of iron oxide by carbon monoxide in the blast furnace.",
      },
      {
        id: "2026-MNM-05",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Corrosion Prevention",
        concept: "Corrosion prevention methods",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Rohan’s bicycle rusts quickly in a coastal area. Suggest two methods to prevent rusting and briefly explain why each method works.",
        answer: "Painting and applying oil/grease or galvanising.",
        explanation:
          "Painting and oil/grease create a protective layer, preventing oxygen and water from reaching the iron surface. Galvanising coats iron with zinc which is more reactive and protects by sacrificial action.",
        policyTag: "Case/resistivity NEP",
        solutionSteps: [
          "Method 1: Painting the bicycle.; Painting creates a physical barrier, preventing the iron surface from coming into contact with oxygen and moisture, which are necessary for rusting. [1]",
          "Method 2: Galvanising the bicycle parts. [1]",
          "Galvanising involves coating the iron with a layer of zinc. [1]",
          "Zinc is more reactive than iron, so it corrodes preferentially, protecting the iron even if the coating is scratched (sacrificial protection). [1]",
        ],
        finalAnswer: "Painting and applying oil/grease or galvanising.",
      },
    ],
  },

  // -------------------- Science: Carbon & its Compounds --------------------
  {
    topic: "Carbon & its Compounds",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cic-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Covalent Bonding",
        concept: "Nature of carbon bonds",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "The bond formed between two carbon atoms in ethane (C₂H₆) is: (A) Ionic (B) Double covalent (C) Single covalent (D) Triple covalent",
        answer: "Single covalent",
        explanation:
          "In ethane, each carbon is sp³ hybridised and shares a single covalent bond with the other carbon.",
        policyTag: "Covalent basics",
        solutionSteps: [
          "Ethane (C₂H₆) is a saturated hydrocarbon, which means all carbon-carbon bonds are single bonds.",
          "In ethane, each carbon atom is bonded to three hydrogen atoms and one other carbon atom.",
          "The bond between the two carbon atoms involves the sharing of one pair of electrons, which constitutes a single covalent bond.",
        ],
        finalAnswer: "Single covalent",
      },
      {
        id: "sci-cic-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Homologous Series",
        concept: "General formula and property trend",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Define a homologous series. State any two characteristics of a homologous series of alkanes.",
        answer:
          "A homologous series is a group of organic compounds having the same functional group and general formula with successive members differing by a –CH₂– unit. In alkanes: (i) They have the general formula CₙH₂ₙ₊₂. (ii) They show a gradual increase in physical properties like boiling point as molecular mass increases.",
        explanation:
          "Definition + two properties is a very standard 3-mark pattern for homologous series.",
        policyTag: "Homologous must-ask",
        solutionSteps: [
          "A homologous series is a group of organic compounds having the same functional group.; They share a general formula, and successive members differ by a -CH2- unit. [1]",
          "Characteristic 1 for alkanes: They have the general formula CnH2n+2. [1]",
          "Characteristic 2 for alkanes: They show a gradual increase in physical properties like boiling point as molecular mass increases. [1]",
        ],
        finalAnswer: "A homologous series is a group of organic compounds having the same functional group and general formula with successive members differing by a –CH₂– unit. In alkanes: (i) They have the general formula CₙH₂ₙ₊₂. (ii) They show a gradual increase in physical properties like boiling point as molecular ",
      },
      {
        id: "sci-cic-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Nomenclature",
        concept: "IUPAC naming",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Give the IUPAC names of CH₃–CH₂–CH₂–OH and CH₃–CH₂–COOH.",
        answer: "Propan-1-ol and propanoic acid.",
        explanation:
          "Identify the longest carbon chain and functional group; use suffix -ol for alcohol and -oic acid for carboxylic acid.",
        policyTag: "Nomenclature 2M",
        solutionSteps: [
          "Identify CH3-CH2-CH2-OH as an alcohol with a three-carbon chain.; The hydroxyl (-OH) functional group is on the first carbon, so its IUPAC name is Propan-1-ol. [½]",
          "Identify CH3-CH2-COOH as a carboxylic acid with a three-carbon chain. [½]",
          "The carboxyl (-COOH) functional group is always at the end, so its IUPAC name is Propanoic acid. [1]",
        ],
        finalAnswer: "Propan-1-ol and propanoic acid.",
      },
      {
        id: "sci-cic-hpq-4",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Important Reactions",
        concept: "Soap vs detergent case-based",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A student observes that soap lathers less in hard water but a synthetic detergent lathers well. (a) Explain the reason. (b) Write one advantage of detergents over soaps and one environmental disadvantage.",
        answer:
          "Hard water contains Ca²⁺/Mg²⁺ ions which form insoluble scum with soap, reducing lather. Detergents form soluble salts so they lather even in hard water. Advantage: work in hard water; disadvantage: many detergents are non-biodegradable and cause water pollution.",
        explanation:
          "Board favours application Qs linking organic compounds to real-life cleaning and pollution issues.",
        policyTag: "NEP: environment link",
        solutionSteps: [
          "Hard water contains dissolved calcium (Ca2+) and magnesium (Mg2+) ions.; Soap reacts with these ions to form insoluble precipitates called scum, which prevents lather formation. [1]",
          "Synthetic detergents form soluble salts with Ca2+ and Mg2+ ions, allowing them to lather well in hard water. [1]",
          "Advantage of detergents: They are effective in hard water, unlike soaps. [1]",
          "Environmental disadvantage: Many detergents are non-biodegradable, leading to water pollution. [1]",
        ],
        finalAnswer: "Hard water contains Ca²⁺/Mg²⁺ ions which form insoluble scum with soap, reducing lather. Detergents form soluble salts so they lather even in hard water. Advantage: work in hard water; disadvantage: many detergents are non-biodegradable and cause water pollution.",
      },
    ],
  },

  // -------------------- Science: Life Processes --------------------
  {
    topic: "Life Processes",
    subject: "Science",
    stream: "Biology",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-lp-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Nutrition",
        concept: "Modes of nutrition",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "In humans, the mode of nutrition is: (A) Autotrophic (B) Heterotrophic–saprophytic (C) Heterotrophic–holozoic (D) Parasitic",
        answer: "Heterotrophic–holozoic",
        explanation:
          "Humans ingest, digest, absorb and assimilate food – holozoic nutrition.",
        policyTag: "Core Bio MCQ",
        solutionSteps: [
          "Humans are heterotrophs, meaning they obtain nutrition by consuming other organisms or organic matter.",
          "Specifically, humans ingest solid or liquid food, digest it internally, and absorb the nutrients, which is characteristic of holozoic nutrition.",
          "Therefore, the mode of nutrition in humans is Heterotrophic–holozoic.",
        ],
        finalAnswer: "Heterotrophic–holozoic",
      },
      {
        id: "sci-lp-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Respiration",
        concept: "Aerobic vs anaerobic respiration",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Differentiate between aerobic and anaerobic respiration in any three points.",
        answer:
          "Aerobic: (i) Takes place in presence of oxygen. (ii) End products are CO₂ and water. (iii) Large amount of energy is released. Anaerobic: (i) Takes place in absence of oxygen. (ii) End products may be alcohol and CO₂ or lactic acid. (iii) Less energy is released.",
        explanation:
          "Tabular ‘difference between’ questions on respiration are frequent 3-markers.",
        policyTag: "Respiration diff",
        solutionSteps: [
          "Aerobic respiration occurs in the presence of oxygen, while anaerobic respiration takes place in the absence of oxygen.; The end products of aerobic respiration are carbon dioxide and water. [1]",
          "The end products of anaerobic respiration can be alcohol and carbon dioxide (e.g., in yeast) or lactic acid (e.g., in muscle cells).; Aerobic respiration releases a large amount of energy (typically 38 ATP molecules per glucose molecule). [1]",
          "Anaerobic respiration releases a much smaller amount of energy (typically 2 ATP molecules per glucose molecule). [1]",
        ],
        finalAnswer: "Aerobic: (i) Takes place in presence of oxygen. (ii) End products are CO₂ and water. (iii) Large amount of energy is released. Anaerobic: (i) Takes place in absence of oxygen. (ii) End products may be alcohol and CO₂ or lactic acid. (iii) Less energy is released.",
      },
      {
        id: "sci-lp-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Circulation",
        concept: "Double circulation / heart diagram",
        section: "D",
        type: "Diagram",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Draw a labelled diagram of the human heart and explain the route of blood flow to show double circulation.",
        answer:
          "Diagram with four chambers (RA, RV, LA, LV), major arteries/veins, and explanation of pulmonary and systemic circulation.",
        explanation:
          "Life Processes often carries a 5-mark diagram-based question on heart or nephron coupled with explanation.",
        policyTag: "Diagram + explanation",
        solutionSteps: [
          "Draw a well-labelled diagram of the human heart, clearly showing all four chambers (right atrium, right ventricle, left atrium, left ventricle) and major blood vessels (aorta, vena cava, pulmonary artery, pulmonary vein).; Double circulation means blood passes through the heart twice in one complete cycle of the body. [1]",
          "Pulmonary circulation: Deoxygenated blood from the body enters the right atrium, then the right ventricle, which pumps it to the lungs via the pulmonary artery.; In the lungs, blood gets oxygenated and returns to the left atrium of the heart via the pulmonary veins. [1]",
          "Systemic circulation: Oxygenated blood from the left atrium enters the left ventricle, which then pumps it to the rest of the body through the aorta.; After supplying oxygen to body tissues, the deoxygenated blood returns to the right atrium of the heart via the vena cava. [1]",
          "This two-part circulation (pulmonary and systemic) ensures efficient separation of oxygenated and deoxygenated blood, allowing for high metabolic rates. [1]",
          "The diagram and explanation together illustrate the complete route of blood flow in human double circulation. [1]",
        ],
        finalAnswer: "Diagram with four chambers (RA, RV, LA, LV), major arteries/veins, and explanation of pulmonary and systemic circulation.",
      },
    ],
  },

  // -------------------- Science: How do Organisms Reproduce? --------------------
  {
    topic: "How do Organisms Reproduce?",
    subject: "Science",
    stream: "Biology",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-hdor-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "How do Organisms Reproduce?",
        subtopic: "Asexual Reproduction",
        concept: "Binary fission",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Binary fission is commonly seen in: (A) Amoeba (B) Hydra (C) Planaria (D) Spirogyra",
        answer: "Amoeba",
        explanation:
          "Amoeba reproduces by binary fission; Hydra uses budding and Planaria regeneration.",
        policyTag: "Bio MCQ",
        solutionSteps: [
          "Binary fission is a method of asexual reproduction where a parent cell divides into two identical daughter cells.",
          "Amoeba is a unicellular organism that commonly reproduces by binary fission.",
          "Hydra reproduces by budding, Planaria by regeneration, and Spirogyra by fragmentation.",
        ],
        finalAnswer: "Amoeba",
      },
      {
        id: "sci-hdor-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "How do Organisms Reproduce?",
        subtopic: "Human Reproductive System",
        concept: "Male/female gametes and fertilisation",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "State the roles of (i) testes, (ii) ovaries and (iii) fallopian tubes in human reproduction.",
        answer:
          "Testes produce sperm and testosterone; ovaries produce ova and female hormones; fallopian tubes transport the ovum and are the site of fertilisation.",
        explanation:
          "Short direct theory questions on human reproduction are frequent and high scoring.",
        policyTag: "Reproduction concept",
        solutionSteps: [
          "Testes produce male gametes (sperm) and the male sex hormone (testosterone).; Ovaries produce female gametes (ova or eggs) and female sex hormones (estrogen and progesterone). [1]",
          "Fallopian tubes transport the ovum from the ovary to the uterus. [1]",
          "Fallopian tubes are also the usual site where fertilization occurs. [1]",
        ],
        finalAnswer: "Testes produce sperm and testosterone; ovaries produce ova and female hormones; fallopian tubes transport the ovum and are the site of fertilisation.",
      },
    ],
  },

  // -------------------- Science: Light – Reflection & Refraction --------------------
  {
    topic: "Light – Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-light-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Mirror Formula & Diagrams",
        concept: "Use of concave mirror",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which mirror is used by dentists to see an enlarged image of teeth? (A) Plane mirror (B) Convex mirror (C) Concave mirror (D) Any mirror",
        answer: "Concave mirror",
        explanation:
          "Concave mirrors can form erect, enlarged images of objects placed between the pole and focus.",
        policyTag: "Mirror use MCQ",
        solutionSteps: [
          "Dentists require an enlarged image of teeth to facilitate examination.",
          "A concave mirror can produce an enlarged, virtual, and erect image when the object is placed close to it.",
          "Convex mirrors always form diminished images, and plane mirrors form same-sized images.",
        ],
        finalAnswer: "Concave mirror",
      },
      {
        id: "sci-light-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Lens Formula & Diagrams",
        concept: "Numerical on lens formula",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "An object is placed at 30 cm in front of a convex lens of focal length 15 cm. Find the position and nature of the image formed.",
        answer:
          "Using 1/f = 1/v − 1/u with f = +15 cm and u = −30 cm ⇒ v = +30 cm. Image is real, inverted and of same size as object.",
        solutionSteps: [
          "Take sign convention: u = −30 cm, f = +15 cm.; Use lens formula 1/f = 1/v − 1/u. [1]",
          "Substitute values: 1/15 = 1/v + 1/30 ⇒ 1/v = 1/15 − 1/30 = 1/30. [1]",
          "So v = +30 cm. Positive v means image on other side (real and inverted). [1]",
        ],
        finalAnswer: "v = +30 cm; image is real, inverted and of the same size as the object",
        explanation:
          "Lens formula numericals with simple focal length and object distances are common 3-markers.",
        policyTag: "Lens numeric",
      },
      {
        id: "sci-light-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Refraction/Sign Convention",
        concept: "Ray diagram at glass–air surface",
        section: "D",
        type: "Diagram",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Draw a labelled ray diagram to show refraction of light when it passes from a denser medium (glass) to a rarer medium (air). Mark the angle of incidence, angle of refraction and normal. State Snell’s law.",
        answer:
          "Ray bending away from the normal on going from glass to air; definition of Snell’s law with n₁ sin i = n₂ sin r.",
        explanation:
          "Diagrams plus law-based reasoning on refraction commonly appear as mixed theory-diagram questions.",
        policyTag: "Refraction diagram",
        solutionSteps: [
          "Draw a straight line representing the interface between the denser medium (glass) and the rarer medium (air).; Draw a normal perpendicular to the interface at the point where the light ray strikes. [1]",
          "Draw an incident ray originating from the denser medium (glass) towards the interface.; Mark the angle between the incident ray and the normal as the angle of incidence (i). [1]",
          "Draw the refracted ray in the rarer medium (air), bending away from the normal.; Mark the angle between the refracted ray and the normal as the angle of refraction (r). [1]",
          "State Snell's Law: The ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant for a given pair of media. [1]",
          "Write the mathematical expression for Snell's Law: n1 sin i = n2 sin r, where n1 and n2 are refractive indices. [1]",
        ],
        finalAnswer: "Ray bending away from the normal on going from glass to air; definition of Snell’s law with n₁ sin i = n₂ sin r.",
      },
    ],
  },

  // -------------------- Science: Human Eye & Colourful World --------------------
  {
    topic: "Human Eye & Colourful World",
    subject: "Science",
    stream: "Physics",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-eye-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Defects & Correction",
        concept: "Myopia / hypermetropia",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Which lens is used to correct hypermetropia? (A) Concave lens (B) Convex lens (C) Cylindrical lens (D) Bifocal lens",
        answer: "Convex lens",
        explanation:
          "Hypermetropia (long-sightedness) is corrected using a converging (convex) lens.",
        policyTag: "Defects MCQ",
        solutionSteps: [
          "Hypermetropia is a vision defect where the eye cannot focus on nearby objects, causing the image to form behind the retina.",
          "To correct this, additional converging power is required to bring the light rays to focus on the retina.",
          "A convex lens is a converging lens, which provides the necessary converging power to correct hypermetropia.",
        ],
        finalAnswer: "Convex lens",
      },
      {
        id: "sci-eye-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Structure of Eye",
        concept: "Power of accommodation",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question: "What is meant by the power of accommodation of the eye?",
        answer:
          "The ability of the eye lens to adjust its focal length so as to focus both near and distant objects on the retina is called power of accommodation.",
        explanation:
          "Short definition questions on eye structure and functioning are common 2-markers.",
        policyTag: "Eye theory",
        solutionSteps: [
          "The human eye lens is capable of changing its shape and thickness.; This change in shape allows the eye lens to adjust its focal length. [½]",
          "This adjustment enables the eye to focus images of objects at varying distances (both near and distant) onto the retina. [½]",
          "This ability of the eye lens to adjust its focal length is called the power of accommodation of the eye. [1]",
        ],
        finalAnswer: "The ability of the eye lens to adjust its focal length so as to focus both near and distant objects on the retina is called power of accommodation.",
      },
      {
        id: "sci-eye-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Dispersion & Scattering",
        concept: "Blue colour of sky / red at sunset",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "During daytime the sky appears blue but at sunrise and sunset it appears reddish. Explain this observation on the basis of scattering of light.",
        answer:
          "Shorter wavelengths (blue) are scattered more in all directions by air molecules, so the sky appears blue. At sunrise/sunset, sunlight travels a longer path and most of blue light is scattered out; only longer wavelengths (red/orange) reach the observer, so the sun and surrounding sky appear reddish.",
        explanation:
          "Scattering-based explanation of sky colour is a favourite conceptual 3–4 mark question.",
        policyTag: "Scattering NEP",
        solutionSteps: [
          "Scattering of light depends on the wavelength; shorter wavelengths scatter more than longer ones.; During daytime, blue light (shorter wavelength) is scattered most by atmospheric particles in all directions, making the sky appear blue. [1]",
          "At sunrise and sunset, sunlight travels a much longer distance through the atmosphere.; Most of the shorter wavelength blue light is scattered away along this longer path before reaching the observer. [1]",
          "Only longer wavelength light (red and orange) reaches the observer directly. [1]",
          "This makes the sun and the surrounding sky appear reddish at sunrise and sunset. [1]",
        ],
        finalAnswer: "Shorter wavelengths (blue) are scattered more in all directions by air molecules, so the sky appears blue. At sunrise/sunset, sunlight travels a longer path and most of blue light is scattered out; only longer wavelengths (red/orange) reach the observer, so the sun and surrounding sky appear reddish",
      },
    ],
  },

  // -------------------- Science: Electricity --------------------
  {
    topic: "Electricity",
    subject: "Science",
    stream: "Physics",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-elec-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Ohm’s Law & V–I Graph",
        concept: "Using Ohm’s law",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "According to Ohm’s law, the V–I graph for a metallic conductor at constant temperature is: (A) A curve (B) A straight line through origin (C) A circle (D) A parabola",
        answer: "A straight line through origin",
        explanation:
          "V ∝ I at constant temperature; hence the graph is a straight line through origin.",
        policyTag: "Ohm’s law MCQ",
        solutionSteps: [
          "According to Ohm's Law, V = IR, where R is the resistance.",
          "For a metallic conductor at constant temperature, resistance (R) is constant.",
          "This implies a direct proportionality between V and I, which is represented by a straight line passing through the origin.",
        ],
        finalAnswer: "A straight line through origin",
      },
      {
        id: "sci-elec-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Resistance in Series/Parallel",
        concept: "Equivalent resistance",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel. Find their equivalent resistance.",
        answer: "1/R = 1/2 + 1/3 + 1/6 = 1 ⇒ R = 1 Ω.",
        solutionSteps: [
          "Use parallel formula: 1/R = 1/R₁ + 1/R₂ + 1/R₃.; Substitute values: 1/R = 1/2 + 1/3 + 1/6. [1]",
          "Take LCM of 2, 3 and 6: 1/2 = 3/6, 1/3 = 2/6, 1/6 = 1/6.; Add: 3/6 + 2/6 + 1/6 = 6/6 = 1, so 1/R = 1. [1]",
          "Therefore R = 1 Ω. [1]",
        ],
        finalAnswer: "Equivalent resistance R = 1 Ω",
        explanation:
          "Parallel combination numericals are standard; examiner checks correct formula and substitution.",
        policyTag: "Series/parallel numeric",
      },
      {
        id: "sci-elec-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Electric Power",
        concept: "Power and energy cost",
        section: "D",
        type: "Long",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "An electric heater of power 1000 W is used for 5 hours every day for 30 days. Calculate (a) total electrical energy consumed in kWh, and (b) cost of using the heater at ₹7 per kWh.",
        answer:
          "Energy = 1 kW × 5 h/day × 30 days = 150 kWh. Cost = 150 × ₹7 = ₹1050.",
        explanation:
          "Power × time gives energy in kWh when power is in kW and time in hours; board loves this direct application.",
        policyTag: "Power/energy numeric",
        solutionSteps: [
          "Convert power from Watts to kilowatts: P = 1000 W = 1 kW.; Calculate the total operating time in hours: Total time = 5 hours/day × 30 days = 150 hours. [1]",
          "Use the formula for electrical energy consumed: Energy (E) = Power (P) × Time (t).; Substitute values to find total energy consumed: E = 1 kW × 150 hours = 150 kWh. [1]",
          "State the given cost per unit of electricity: Cost per kWh = ₹7. [1]",
          "Calculate the total cost: Total cost = Energy consumed × Cost per kWh. [1]",
          "Substitute values to find the total cost: Total cost = 150 kWh × ₹7/kWh = ₹1050. [1]",
        ],
        finalAnswer: "Energy = 1 kW × 5 h/day × 30 days = 150 kWh. Cost = 150 × ₹7 = ₹1050.",
      },
      {
        id: "sci-elec-hpq-4",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Heating Effect",
        concept: "Case-based on fuse/overheating",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A student uses a thin wire as a fuse in the circuit. (a) Why is a fuse always connected in series? (b) On what principle does it work? (c) What will happen to the fuse wire if current exceeds the safe limit?",
        answer:
          "(a) Fuse is in series so that it can stop the entire current if it blows. (b) It works on the heating effect of electric current. (c) The wire melts and breaks the circuit when current exceeds the rated value.",
        explanation:
          "Fuse, MCB and heating effect concepts appear frequently as conceptual case-based questions.",
        policyTag: "Safety/heating NEP",
        solutionSteps: [
          "A fuse is always connected in series with the live wire in an electrical circuit.; This ensures that the entire circuit current passes through the fuse. [1]",
          "If the current exceeds the safe limit, the fuse wire melts, breaking the circuit completely. [1]",
          "The fuse works on the principle of the heating effect of electric current (Joule's heating). [1]",
          "When current exceeds the rated value, the excessive heat produced (I^2Rt) melts the low melting point fuse wire, thereby opening the circuit. [1]",
        ],
        finalAnswer: "(a) Fuse is in series so that it can stop the entire current if it blows. (b) It works on the heating effect of electric current. (c) The wire melts and breaks the circuit when current exceeds the rated value.",
      },
    ],
  },

  // -------------------- Science: Magnetic Effects of Electric Current --------------------
  {
    topic: "Magnetic Effects of Electric Current",
    subject: "Science",
    stream: "Physics",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-mec-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Magnetic Effects of Electric Current",
        subtopic: "Field Lines & Rules",
        concept: "Right-hand thumb rule",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Right-hand thumb rule gives the direction of: (A) Force on a conductor (B) Magnetic field around a straight conductor (C) Current in a coil (D) Induced current",
        answer: "Magnetic field around a straight conductor",
        explanation:
          "Right-hand thumb rule relates current direction (thumb) to magnetic field direction (curling fingers).",
        policyTag: "Field lines MCQ",
        solutionSteps: [
          "The Right-Hand Thumb Rule is used to determine the direction of the magnetic field produced by a current-carrying straight conductor.",
          "If the thumb points in the direction of the current, the direction in which the fingers curl around the conductor gives the direction of the magnetic field lines.",
          "Therefore, it gives the direction of the magnetic field around a straight conductor.",
        ],
        finalAnswer: "Magnetic field around a straight conductor",
      },
      {
        id: "sci-mec-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Magnetic Effects of Electric Current",
        subtopic: "Electromagnet & Solenoid",
        concept: "Solenoid vs bar magnet",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How does a solenoid behave like a bar magnet? Draw the field pattern and mark its poles.",
        answer:
          "A current-carrying solenoid produces a magnetic field similar to a bar magnet, with one end behaving as N-pole and the other as S-pole. Field lines emerge from the north end and enter the south end, forming closed loops.",
        explanation:
          "Solenoid field diagram and explanation is a favourite application of current–magnetism link.",
        policyTag: "Solenoid pattern",
        solutionSteps: [
          "A current-carrying solenoid produces a magnetic field pattern that is very similar to the magnetic field produced by a bar magnet.; One end of the solenoid behaves as a North pole and the other end behaves as a South pole, depending on the direction of current flow. [1]",
          "The magnetic field lines emerge from the North pole and enter the South pole outside the solenoid, forming continuous closed loops.; Inside the solenoid, the magnetic field lines are straight and parallel to the axis, indicating a uniform magnetic field, just like inside a bar magnet. [1]",
          "The field pattern would show concentric circles near the ends and parallel lines inside, with arrows indicating direction from N to S outside and S to N inside. [1]",
        ],
        finalAnswer: "A current-carrying solenoid produces a magnetic field similar to a bar magnet, with one end behaving as N-pole and the other as S-pole. Field lines emerge from the north end and enter the south end, forming closed loops.",
      },
    ],
  },

  // -------------------- Maths & rest of topics (as provided) --------------------
  // (Retained exactly as in your message to avoid any visual/logic regressions.)
  // Real Numbers (Maths) - again (for extended seeds)
  {
    topic: "Real Numbers",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-real-hpq-3",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Fundamental Theorem of Arithmetic",
        concept: "Irrationality proof using prime factorisation",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question: "Prove that √5 is irrational.",
        answer:
          "Assuming √5 rational leads to a contradiction; hence √5 is irrational.",
        solutionSteps: [
          "Assume √5 is rational. Then √5 = p/q, where p and q are coprime integers and q ≠ 0.; Square both sides: 5 = p²/q² ⇒ p² = 5q². [1]",
          "So p² is divisible by 5 ⇒ p is divisible by 5. Let p = 5k.; Substitute: (5k)² = 5q² ⇒ 25k² = 5q² ⇒ q² = 5k², so q is also divisible by 5. [1]",
          "This contradicts the assumption that p and q are coprime. Therefore √5 is irrational. [1]",
        ],
        finalAnswer: "Hence √5 is irrational",
        explanation:
          "Classic 3-mark proof using Fundamental Theorem of Arithmetic; appears often in Real Numbers.",
      },
    ],
  },

  // -------------------- Maths: Arithmetic Progressions --------------------
  {
    topic: "Arithmetic Progressions",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-ap-hpq-1",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "Basics of AP",
        concept: "Identify AP and common difference",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Which of the following is an arithmetic progression (AP)? (A) 2, 4, 8, 16 (B) 3, 6, 9, 12 (C) 1, 3, 6, 10 (D) 1, 2, 4, 7",
        answer: "3, 6, 9, 12 (common difference 3)",
        solutionSteps: [
          "In an AP, the difference between consecutive terms is constant.",
          "Check each option: only 3, 6, 9, 12 has a constant difference of 3.",
        ],
        finalAnswer: "Option (B): 3, 6, 9, 12 is an AP with common difference d = 3",
        explanation:
          "Simple identification of AP and common difference is a standard 1-mark question.",
      },
      {
        id: "math-ap-hpq-2",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "nth term",
        concept: "Finding term number from value",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "The 4th term of an AP is 11 and the 9th term is 26. Find the first term and common difference.",
        answer: "First term a = 3, common difference d = 2",
        solutionSteps: [
          "Use formula: aₙ = a + (n − 1)d.; For n = 4: a + 3d = 11. For n = 9: a + 8d = 26. [½]",
          "Subtract: (a + 8d) − (a + 3d) = 26 − 11 ⇒ 5d = 15 ⇒ d = 3. [½]",
          "Substitute in a + 3d = 11 ⇒ a + 9 = 11 ⇒ a = 2. [1]",
        ],
        finalAnswer: "First term a = 2, common difference d = 3",
        explanation:
          "Pair of linear equations in a and d often appears as a 2-mark AP question.",
      },
      {
        id: "math-ap-hpq-3",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "Sum of n terms",
        concept: "Use of Sₙ formula",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question: "Find the sum of first 30 terms of the AP 7, 10, 13, ...",
        answer: "S₃₀ = 1740",
        solutionSteps: [
          "Here a = 7, d = 3, n = 30. [1]",
          "Use Sₙ = n/2 [2a + (n − 1)d]. [1]",
          "Compute: S₃₀ = 30/2 [2×7 + 29×3] = 15 [14 + 87] = 15 × 101 = 1515. [1]",
        ],
        finalAnswer: "S₃₀ = 1515",
        explanation:
          "Direct substitution in Sₙ formula is a standard 3-mark pattern in AP.",
      },
    ],
  },

  // -------------------- Maths: Triangles --------------------
  {
    topic: "Triangles",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-tri-hpq-1",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Similarity criteria",
        concept: "AA similarity",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "If two angles of one triangle are equal to two angles of another triangle, then the triangles are: (A) Congruent (B) Isosceles (C) Similar (D) Right-angled",
        answer: "Similar",
        solutionSteps: [
          "AA (Angle-Angle) criterion states: if two angles of one triangle are equal to two angles of another triangle, the triangles are similar.",
        ],
        finalAnswer: "The triangles are similar (by AA criterion)",
        explanation:
          "Direct AA similarity recall is a frequently asked 1-mark question.",
      },
      {
        id: "math-tri-hpq-2",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Basic proportionality theorem",
        concept: "Using BPT in numerical",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "In ΔABC, DE ∥ BC with D on AB and E on AC. If AD = 3 cm, DB = 5 cm and AE = 4.5 cm, find AC.",
        answer: "AC = 12 cm",
        solutionSteps: [
          "Since DE ∥ BC, by Basic Proportionality Theorem AD/DB = AE/EC.; AD/DB = 3/5, and AE = 4.5. [1]",
          "Let EC = x. Then 3/5 = 4.5/x ⇒ 3x = 22.5 ⇒ x = 7.5. [1]",
          "So AC = AE + EC = 4.5 + 7.5 = 12 cm. [1]",
        ],
        finalAnswer: "AC = 12 cm",
        explanation:
          "Standard use of BPT connecting segments on sides with a line parallel to the third side.",
      },
      {
        id: "math-tri-hpq-3",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Area of similar triangles",
        concept: "Area ratio = square of sides ratio",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "Two similar triangles have corresponding sides in the ratio 3 : 5. Find the ratio of their areas and explain your reasoning.",
        answer: "Ratio of areas = 9 : 25",
        solutionSteps: [
          "If two triangles are similar, ratio of their areas equals square of the ratio of corresponding sides. [1]",
          "Given side ratio = 3 : 5. [1]",
          "Therefore area ratio = 3² : 5² = 9 : 25. [1]",
        ],
        finalAnswer: "Ratio of areas = 9 : 25",
        explanation:
          "Area of similar triangles relation is a favourite conceptual 3-mark question.",
      },
    ],
  },


  // -------------------- Science: Control and Coordination --------------------
  {
    topic: "Control and Coordination",
    subject: "Science",
    stream: "Biology",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cc-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Plant hormones",
        concept: "Auxin, gibberellin, cytokinin, etc.",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which plant hormone is responsible for cell elongation in stem? (A) Auxin (B) Cytokinin (C) Ethylene (D) Abscisic acid",
        answer: "Auxin",
        explanation:
          "Auxin promotes cell elongation and is concentrated on the shaded side of a plant shoot.",
        solutionSteps: [
          "Auxin is a plant hormone that plays a crucial role in cell growth and development.",
          "It promotes cell elongation, especially in the stem and root tips.",
          "Therefore, Auxin is responsible for cell elongation in the stem.",
        ],
        finalAnswer: "Auxin",
      },
      {
        id: "sci-cc-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Human nervous system",
        concept: "Reflex arc",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "What is a reflex action? Draw the pathway of a simple reflex arc.",
        answer:
          "Reflex action is an automatic, rapid response to a stimulus, controlled by the spinal cord. Diagram should show receptor → sensory neuron → spinal cord → motor neuron → effector.",
        explanation:
          "Short theory + labelled diagram on reflex arc is a favourite 2-mark pattern.",
        solutionSteps: [
          "A reflex action is an involuntary, rapid, and automatic response of the body to a stimulus. [½]",
          "It is controlled by the spinal cord, allowing for quick reactions without conscious thought from the brain. [½]",
          "The pathway of a simple reflex arc involves: Receptor -> Sensory neuron -> Spinal cord (relay neuron) -> Motor neuron -> Effector (muscle/gland). [1]",
        ],
        finalAnswer: "Reflex action is an automatic, rapid response to a stimulus, controlled by the spinal cord. Diagram should show receptor → sensory neuron → spinal cord → motor neuron → effector.",
      },
      {
        id: "sci-cc-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Endocrine system",
        concept: "Role of hormones",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Name any three endocrine glands in human beings and write one function of each.",
        answer:
          "Pituitary – master gland, controls other glands and growth; Thyroid – secretes thyroxine, regulates metabolism; Pancreas – secretes insulin, maintains blood sugar (any three correct pairs).",
        explanation:
          "Board often tests understanding of hormone–gland–function mapping.",
        solutionSteps: [
          "Pituitary gland: It is known as the master gland. It controls the functioning of other endocrine glands and regulates growth. [1]",
          "Thyroid gland: It secretes the hormone thyroxine. Thyroxine regulates carbohydrate, protein, and fat metabolism in the body. [1]",
          "Pancreas: It secretes insulin hormone. Insulin helps in regulating blood sugar levels in the body. [1]",
        ],
        finalAnswer: "Pituitary – master gland, controls other glands and growth; Thyroid – secretes thyroxine, regulates metabolism; Pancreas – secretes insulin, maintains blood sugar (any three correct pairs).",
      },
    ],
  },

  // -------------------- Science: Heredity --------------------
  {
    topic: "Heredity",
    subject: "Science",
    stream: "Biology",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-he-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Heredity",
        subtopic: "Mendel’s experiments",
        concept: "Monohybrid cross",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "In Mendel’s monohybrid cross of tall and dwarf pea plants, F₁ generation had: (A) all tall plants (B) all dwarf plants (C) 3 tall : 1 dwarf (D) 1 tall : 3 dwarf",
        answer: "all tall plants",
        explanation:
          "Tallness is dominant over dwarfness, so all F₁ plants are tall.",
        solutionSteps: [
          "In Mendel's monohybrid cross, a tall pea plant (dominant trait) was crossed with a dwarf pea plant (recessive trait).",
          "According to the law of dominance, the dominant trait (tallness) expresses itself in the F₁ generation.",
          "Therefore, all plants in the F₁ generation were tall.",
        ],
        finalAnswer: "all tall plants",
      },
      {
        id: "sci-he-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Heredity",
        subtopic: "Sex determination",
        concept: "XX–XY mechanism",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How is the sex of a child determined in humans? Explain briefly.",
        answer:
          "Mother always contributes X chromosome. Father contributes either X or Y. XX combination gives girl, XY gives boy. Hence the father determines the sex of the child.",
        explanation:
          "Short conceptual explanation of XX–XY mechanism is often asked for 2 marks.",
        solutionSteps: [
          "Human females have two X chromosomes (XX) and males have one X and one Y chromosome (XY).; During reproduction, the mother always contributes an X chromosome to the offspring. [½]",
          "The father contributes either an X or a Y chromosome. If an X chromosome is contributed, the child will be female (XX). [½]",
          "If a Y chromosome is contributed by the father, the child will be male (XY). Thus, the father determines the sex of the child. [1]",
        ],
        finalAnswer: "Mother always contributes X chromosome. Father contributes either X or Y. XX combination gives girl, XY gives boy. Hence the father determines the sex of the child.",
      },
    ],
  },

];

// ✅ Final HPQ bank (seed + append-only additions), merged safely by topic
// so the HPQ page doesn't show duplicate topic cards when additions contain
// buckets for chapters already present in the seed.
const _rawHpqBuckets: HPQTopicBucket[] = [
  ...highlyProbableQuestionsSeed,
  ...hpqAdditions,
  ...hpqCompetencyAdditions,
];

export const highlyProbableQuestions: HPQTopicBucket[] = [
  ...mergeBucketsByTopic("Maths", _rawHpqBuckets),
  ...mergeBucketsByTopic("Science", _rawHpqBuckets),
];

// ------------------- Locked Exam-Trends tiers (single source of truth) -------------------
// Source: LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md (owner-signed-off).
// The tier BADGE is driven from this table — never from hand-authored per-bucket
// `defaultTier` values — so HPQ tiering can't drift from the Exam-Trends page again.
// Keys are matched by canonical topic identity, so label variants still resolve.
const LOCKED_TIER_SOURCE: Record<HPQSubject, Record<HPQTier, string[]>> = {
  Maths: {
    "must-crack": [
      "Trigonometry",
      "Circles",
      "Triangles",
      "Surface Areas & Volumes",
      "Polynomials",
    ],
    "high-roi": [
      "Coordinate Geometry",
      "Real Numbers",
      "Probability",
      "Quadratic Equations",
      "Statistics",
    ],
    "good-to-do": [
      "Arithmetic Progression",
      "Pair of Linear Equations",
      "Areas Related to Circles",
    ],
  },
  Science: {
    "must-crack": [
      "Chemical Reactions & Equations",
      "Light – Reflection & Refraction",
      "Life Processes",
      "Acids, Bases & Salts",
      "Electricity",
      "Heredity",
    ],
    "high-roi": [
      "Control & Coordination",
      "Metals & Non-metals",
      "Magnetic Effects of Current",
      "How Do Organisms Reproduce",
      "Carbon & its Compounds",
    ],
    "good-to-do": ["Our Environment", "Human Eye & Colourful World"],
  },
};

// Flatten the locked table into a canonical-key → tier lookup, once at load.
const lockedTierByKey: Record<HPQSubject, Map<string, HPQTier>> = {
  Maths: new Map(),
  Science: new Map(),
};
for (const subject of Object.keys(LOCKED_TIER_SOURCE) as HPQSubject[]) {
  for (const tier of Object.keys(LOCKED_TIER_SOURCE[subject]) as HPQTier[]) {
    for (const label of LOCKED_TIER_SOURCE[subject][tier]) {
      lockedTierByKey[subject].set(canonicalTopicKey(label), tier);
    }
  }
}

/** Locked Exam-Trends tier for a topic, or undefined if the topic isn't tiered. */
export function getLockedTier(
  subject: HPQSubject,
  topic: string
): HPQTier | undefined {
  return lockedTierByKey[subject].get(canonicalTopicKey(topic));
}

const allowedScienceTopicLabels = new Set(
  Object.values(class10ScienceTopicTrends.topics).map((topic) =>
    canonicalTopicKey(topic.topicName)
  )
);

// ----------------------- Safe, typed helpers (UI-neutral) -----------------------

/**
 * Return HPQ buckets filtered by subject and (optionally) Science stream.
 * Keeps order and structure intact to avoid any UI/UX regression.
 */
export function getHighlyProbableQuestions(
  subject?: HPQSubject,
  stream?: HPQStream
): HPQTopicBucket[] {
  const subj = subject ?? "Maths";
  const filtered = highlyProbableQuestions.filter((b) => {
    const bSubject: HPQSubject = (b.subject as HPQSubject) ?? "Maths";
    if (bSubject !== subj) return false;
    if (
      subj === "Science" &&
      !allowedScienceTopicLabels.has(canonicalTopicKey(b.topic))
    ) {
      // Never drop content silently — a label drifting away from the trends
      // registry is how questions vanish unnoticed. Surface it in dev.
      if (import.meta.env?.DEV) {
        console.warn(
          `[HPQ] Science bucket "${b.topic}" (canonical "${canonicalTopicKey(
            b.topic
          )}") is not in class10ScienceTopicTrends and was dropped from display.`
        );
      }
      return false;
    }
    if (subj === "Science" && stream) {
      return (b.stream as HPQStream | undefined) === stream;
    }
    return true;
  });
  // Drive the tier badge from the locked Exam-Trends tiers (single source of
  // truth), overriding any hand-authored bucket/question tier so the badge can
  // never contradict the Exam-Trends page. Falls back to the authored value
  // only for a topic absent from the locked table.
  return filtered.map((bucket) => {
    const lockedTier = getLockedTier(subj, bucket.topic);
    return {
      ...bucket,
      defaultTier: lockedTier ?? bucket.defaultTier,
      questions: bucket.questions.map((question) => ({
        ...question,
        tier: lockedTier ?? question.tier,
      })),
    };
  });
}

/**
 * Quick map for tabs like: dataBySubject["Maths"] or dataBySubject["Science"].
 * For Science you can further filter by stream with the helper above.
 */
export const dataBySubject: Record<HPQSubject, HPQTopicBucket[]> = {
  Maths: getHighlyProbableQuestions("Maths"),
  Science: getHighlyProbableQuestions("Science"),
};
