import type { CanonicalQuestion } from '../../../predictionTypes';

// =============================================================================
// Source: NCERT Class 10 Mathematics Exemplar — Chapter 7 (Coordinate Geometry)
// PDF file used: jeep207.pdf (Exemplar) · Answer key cross-checked vs jeep2an.pdf
// topicKey: "coordinate-geometry"
// Extraction date: 2026-06-18 · Bank Expansion Phase 1, Batch 2.
//
// PROVENANCE / THE DECOUPLE:
//   • QUESTION text = AUTHENTIC, verbatim from the Exemplar PDF (pymupdf sort=True
//     + ftfy). Math reconstructed only where the PDF flattened it; reconstructed
//     items are marked `// ⚠ RECON` for the owner's fidelity spot-check.
//   • SOLUTION = AI-GENERATED, step-marked, PENDING OWNER VERIFICATION.
//     solutionSource: "ai-generated" for EVERY id (all ids registered in
//     AI_GENERATED_SOLUTION_IDS in canonicalQuestionBank.ts). Each finalAnswer was
//     cross-checked against the official Exemplar answer key; the WORKED STEPS are
//     AI and the owner (examiner-of-record) must verify them before merge.
//
// SYLLABUS (CBSE 2026-27): "Area of a Triangle in Coordinate Geometry" is BANNED —
//   EXCLUDED every area-of-triangle item (Ex 7.1 Q7, Q18; Ex 7.3 Q9, Q16, Q17;
//   Ex 7.4 Q2, Q4). Collinearity items solvable only via the area formula are also
//   dropped/flagged; the ones kept here use distance/section/slope methods only.
//   Coordinate Geometry retains: Distance Formula, Section Formula, Mid-point.
// DROPPED — figure-locked: Ex 7.1 Q15 (Fig 7.1), Ex 7.4 Q5 (Fig 7.4).
// DROPPED — unrecoverable options: Ex 7.1 Q16 (option coordinates flattened in PDF).
// Net-new only: deduped vs repo (existing refs Ex7.1 Q1-5,7-11,19,20; Ex7.2 Q3,7,9;
//   Ex7.3 Q2,4,7,9,10; Ex7.4 Q1,2,6; Sample Q2 MCQ + SA are NOT repeated).
// Section↔marks by honest complexity (A=1, B=2, C=3, D=5); every solutionStep is
//   `[N mark]`-prefixed and the prefixes sum to marks.
// =============================================================================

export const CG_EXEMPLAR2: CanonicalQuestion[] = [
  // ===== Section A — MCQs (Exercise 7.1, 1 mark) =====
  { id: "CG-N-EXEM2-7-MCQ-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Perimeter via Distance Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The perimeter of a triangle with vertices (0, 4), (0, 0) and (3, 0) is",
    options: ["5", "12", "11", "7 + √5"],
    answer: "12",
    solutionSteps: ["[1 mark] The side lengths are 4 (from (0,4) to (0,0)), 3 (from (0,0) to (3,0)) and 5 (from (0,4) to (3,0), since √(3²+4²)=5); perimeter = 4 + 3 + 5 = 12 — option (B)."],
    finalAnswer: "12 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q6", isCompetencyBased: false },

  { id: "CG-N-EXEM2-7-MCQ-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Point Dividing a Segment", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the point P (2, 1) lies on the line segment joining points A (4, 2) and B (8, 4), then",
    options: ["AP = (1/3) AB", "AP = PB", "PB = (1/3) AB", "AP = (1/2) AB"],
    answer: "AP = (1/2) AB",
    solutionSteps: ["[1 mark] AP = √((4−2)²+(2−1)²) = √5 and AB = √((8−4)²+(4−2)²) = √20 = 2√5, so AP = (1/2) AB — option (D)."],
    finalAnswer: "AP = (1/2) AB — option (D).",
    ncertRef: "Exemplar Ex 7.1 Q12", isCompetencyBased: false },

  // ⚠ RECON: P (a/3, 4) — the fraction a/3 was flattened in the PDF; reconstructed.
  { id: "CG-N-EXEM2-7-MCQ-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Mid-point Formula", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If P (a/3, 4) is the mid-point of the line segment joining the points Q (−6, 5) and R (−2, 3), then the value of a is",
    options: ["−4", "−12", "12", "−6"],
    answer: "−12",
    solutionSteps: ["[1 mark] The mid-point of Q(−6,5) and R(−2,3) is ((−6−2)/2, (5+3)/2) = (−4, 4); equating x-coordinates, a/3 = −4, so a = −12 — option (B)."],
    finalAnswer: "−12 — option (B).",
    ncertRef: "Exemplar Ex 7.1 Q13", isCompetencyBased: false },

  { id: "CG-N-EXEM2-7-MCQ-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Perpendicular Bisector", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The perpendicular bisector of the line segment joining the points A (1, 5) and B (4, 6) cuts the y-axis at",
    options: ["(0, 13)", "(0, −13)", "(0, 12)", "(13, 0)"],
    answer: "(0, 13)",
    solutionSteps: ["[1 mark] A point (0, y) on the y-axis equidistant from A and B satisfies 1²+(y−5)² = 4²+(y−6)²; expanding, 1+y²−10y+25 = 16+y²−12y+36, so 2y = 26 and y = 13, giving (0, 13) — option (A)."],
    finalAnswer: "(0, 13) — option (A).",
    ncertRef: "Exemplar Ex 7.1 Q14", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-MCQ-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Intercepts and Mid-point", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A line intersects the y-axis and x-axis at the points P and Q, respectively. If (2, −5) is the mid-point of PQ, then the coordinates of P and Q are, respectively",
    options: ["(0, −5) and (2, 0)", "(0, 10) and (−4, 0)", "(0, 4) and (−10, 0)", "(0, −10) and (4, 0)"],
    answer: "(0, −10) and (4, 0)",
    solutionSteps: ["[1 mark] Let P = (0, b) on the y-axis and Q = (a, 0) on the x-axis; the mid-point is (a/2, b/2) = (2, −5), so a = 4 and b = −10, giving P(0, −10) and Q(4, 0) — option (D)."],
    finalAnswer: "P(0, −10) and Q(4, 0) — option (D).",
    ncertRef: "Exemplar Ex 7.1 Q17", isCompetencyBased: true },

  // ===== Section B — Short Answer with Reasoning (Exercise 7.2, 2 marks) =====
  { id: "CG-N-EXEM2-7-VSA-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Similar Triangles (Coordinates)", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: ΔABC with vertices A (−2, 0), B (2, 0) and C (0, 2) is similar to ΔDEF with vertices D (−4, 0), E (4, 0) and F (0, 4).",
    solutionSteps: ["[1 mark] The sides of ΔABC are AB = 4, BC = 2√2, CA = 2√2; the sides of ΔDEF are DE = 8, EF = 4√2, FD = 4√2.", "[1 mark] Each side of ΔDEF is exactly twice the corresponding side of ΔABC, so the triangles are similar (SSS) — the statement is True."],
    finalAnswer: "True — all three pairs of sides are in the ratio 1 : 2.",
    ncertRef: "Exemplar Ex 7.2 Q1", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Point on a Segment", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: Point P (−4, 2) lies on the line segment joining the points A (−4, 6) and B (−4, −6).",
    solutionSteps: ["[1 mark] A, B and P all have x-coordinate −4, so they are collinear on the vertical line x = −4.", "[1 mark] Since 2 lies between −6 and 6, P is between A and B — the statement is True."],
    finalAnswer: "True — P lies on x = −4 between A and B.",
    ncertRef: "Exemplar Ex 7.2 Q2", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Perpendicular Bisector", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: Point P (0, 2) is the point of intersection of the y-axis and the perpendicular bisector of the line segment joining the points A (−1, 1) and B (3, 3).",
    solutionSteps: ["[1 mark] A point on the perpendicular bisector is equidistant from A and B; PA = √((−1)²+(1−2)²) = √2 and PB = √(3²+(3−2)²) = √10.", "[1 mark] Since PA ≠ PB, P is not on the perpendicular bisector — the statement is False."],
    finalAnswer: "False — PA = √2 ≠ √10 = PB.",
    ncertRef: "Exemplar Ex 7.2 Q4", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Parallelogram Test (Mid-points)", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: Points A (4, 3), B (6, 4), C (5, −6) and D (−3, 5) are the vertices of a parallelogram.",
    solutionSteps: ["[1 mark] A quadrilateral is a parallelogram iff its diagonals bisect each other, i.e. mid-point of AC = mid-point of BD.", "[1 mark] Mid-point of AC = (4.5, −1.5) but mid-point of BD = (1.5, 4.5); they differ, so the statement is False."],
    finalAnswer: "False — the diagonals AC and BD do not bisect each other.",
    ncertRef: "Exemplar Ex 7.2 Q6", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Perpendicular Bisector", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: The point A (2, 7) lies on the perpendicular bisector of the line segment joining the points P (6, 5) and Q (0, −4).",
    solutionSteps: ["[1 mark] A lies on the perpendicular bisector iff AP = AQ; AP = √((6−2)²+(5−7)²) = √20 and AQ = √((0−2)²+(−4−7)²) = √125.", "[1 mark] Since AP ≠ AQ, A is not on the perpendicular bisector — the statement is False."],
    finalAnswer: "False — AP = √20 ≠ √125 = AQ.",
    ncertRef: "Exemplar Ex 7.2 Q8", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Point and Circle", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: The point P (−2, 4) lies on a circle of radius 6 and centre C (3, 5).",
    solutionSteps: ["[1 mark] P lies on the circle iff CP = radius = 6; CP = √((3−(−2))²+(5−4)²) = √(25+1) = √26.", "[1 mark] Since √26 ≈ 5.1 ≠ 6 (in fact CP < 6, so P is inside), the statement is False."],
    finalAnswer: "False — CP = √26 ≠ 6 (P lies inside the circle).",
    ncertRef: "Exemplar Ex 7.2 Q11", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-VSA-007", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Rectangle Test (Coordinates)", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating",
    questionText: "State whether the following statement is true or false and justify: The points A (−1, −2), B (4, 3), C (2, 5) and D (−3, 0) in that order form a rectangle.",
    solutionSteps: ["[1 mark] Mid-point of AC = (0.5, 1.5) = mid-point of BD, so the diagonals bisect each other (it is a parallelogram).", "[1 mark] Also AC = √(3²+7²) = √58 and BD = √(7²+3²) = √58 are equal diagonals, so it is a rectangle — the statement is True."],
    finalAnswer: "True — diagonals bisect each other and are equal (√58).",
    ncertRef: "Exemplar Ex 7.2 Q12", isCompetencyBased: true },

  // ===== Section C — Short Answer (Exercise 7.3, 3 marks) =====
  { id: "CG-N-EXEM2-7-SA-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Type of Triangle (Distances)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Name the type of triangle formed by the points A (−5, 6), B (−4, −2) and C (7, 5).",
    solutionSteps: ["[1 mark] AB = √((−4+5)²+(−2−6)²) = √(1+64) = √65.", "[1 mark] BC = √((7+4)²+(5+2)²) = √(121+49) = √170 and CA = √((7+5)²+(5−6)²) = √(144+1) = √145.", "[1 mark] All three sides are unequal (√65, √170, √145), so it is a scalene triangle."],
    finalAnswer: "Scalene triangle.",
    ncertRef: "Exemplar Ex 7.3 Q1", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-002", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Type of Quadrilateral (Distances)", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "What type of a quadrilateral do the points A (2, −2), B (7, 3), C (11, −1) and D (6, −6) taken in that order, form?",
    solutionSteps: ["[1 mark] Sides: AB = √(5²+5²) = √50, BC = √(4²+(−4)²) = √32, CD = √((−5)²+(−5)²) = √50, DA = √((−4)²+(4)²) = √32 — opposite sides equal (AB = CD, BC = DA).", "[1 mark] Diagonals: AC = √(9²+1²) = √82 and BD = √((−1)²+(−9)²) = √82 are equal.", "[1 mark] Adjacent sides AB ≠ BC but diagonals are equal and opposite sides equal ⇒ it is a rectangle."],
    finalAnswer: "Rectangle.",
    ncertRef: "Exemplar Ex 7.3 Q3", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-003", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Equidistant Points (Perp. Bisector)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Find a point which is equidistant from the points A (−5, 4) and B (−1, 6). How many such points are there?",
    solutionSteps: ["[1 mark] A point equidistant from A and B lies on the perpendicular bisector of AB; the mid-point of AB is ((−5−1)/2, (4+6)/2) = (−3, 5), which is one such point.", "[1 mark] Setting PA² = PB² for P(x,y): (x+5)²+(y−4)² = (x+1)²+(y−6)² simplifies to 8x + 4y + 4 = 0, i.e. 2x + y + 1 = 0.", "[1 mark] Every point on the line 2x + y + 1 = 0 is equidistant from A and B, so there are infinitely many such points (e.g. (−3, 5))."],
    finalAnswer: "(−3, 5) is one such point; infinitely many lie on 2x + y + 1 = 0.",
    ncertRef: "Exemplar Ex 7.3 Q5", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-004", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Point on x-axis (Perp. Bisector)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the coordinates of the point Q on the x-axis which lies on the perpendicular bisector of the line segment joining the points A (−5, −2) and B (4, −2). Name the type of triangle formed by the points Q, A and B.",
    solutionSteps: ["[1 mark] A and B have equal y-coordinates, so the perpendicular bisector of AB is the vertical line x = (−5+4)/2 = −1/2.", "[1 mark] On the x-axis (y = 0), this gives Q = (−1/2, 0).", "[1 mark] Since Q is on the perpendicular bisector, QA = QB, so ΔQAB is an isosceles triangle."],
    finalAnswer: "Q = (−1/2, 0); ΔQAB is isosceles.",
    ncertRef: "Exemplar Ex 7.3 Q6", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-005", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Equidistant Point + Distance", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If the point A (2, −4) is equidistant from P (3, 8) and Q (−10, y), find the values of y. Also find distance PQ.",
    solutionSteps: ["[1 mark] AP = AQ ⇒ AP² = AQ²; AP² = (3−2)²+(8+4)² = 1+144 = 145 and AQ² = (−10−2)²+(y+4)² = 144+(y+4)².", "[1 mark] 145 = 144 + (y+4)² ⇒ (y+4)² = 1 ⇒ y = −3 or y = −5.", "[1 mark] For y = −3: PQ = √((3+10)²+(8+3)²) = √290; for y = −5: PQ = √((13)²+(13)²) = 13√2."],
    finalAnswer: "y = −3 or −5; PQ = √290 or 13√2 respectively.",
    ncertRef: "Exemplar Ex 7.3 Q8", isCompetencyBased: true },

  // ⚠ RECON: P (3/4, 5/12), A (1/2, 3/2) — fractions flattened in the PDF; reconstructed.
  { id: "CG-N-EXEM2-7-SA-006", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula (Ratio)", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the ratio in which the point P (3/4, 5/12) divides the line segment joining the points A (1/2, 3/2) and B (2, −5).",
    solutionSteps: ["[1 mark] Let P divide AB in the ratio k : 1; then by the section formula the x-coordinate is (2k + 1/2)/(k+1) = 3/4.", "[1 mark] Cross-multiplying: 4(2k + 1/2) = 3(k+1) ⇒ 8k + 2 = 3k + 3 ⇒ 5k = 1 ⇒ k = 1/5.", "[1 mark] So P divides AB in the ratio 1 : 5 (the y-coordinate check: (−5·(1/5) + (3/2))/(6/5) = (1/2)/(6/5) = 5/12 ✓)."],
    finalAnswer: "1 : 5.",
    ncertRef: "Exemplar Ex 7.3 Q11", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-007", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Mid-point + Distance", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If (a, b) is the mid-point of the line segment joining the points A (10, −6) and B (k, 4) and a − 2b = 18, find the value of k and the distance AB.",
    solutionSteps: ["[1 mark] Mid-point: a = (10+k)/2 and b = (−6+4)/2 = −1.", "[1 mark] a − 2b = 18 ⇒ a − 2(−1) = 18 ⇒ a = 16 ⇒ (10+k)/2 = 16 ⇒ k = 22.", "[1 mark] AB = √((22−10)²+(4+6)²) = √(144+100) = √244 = 2√61."],
    finalAnswer: "k = 22 and AB = 2√61.",
    ncertRef: "Exemplar Ex 7.3 Q13", isCompetencyBased: true },

  // ⚠ RECON: PR = (3/5) PQ — the fraction was flattened in the PDF; reconstructed.
  { id: "CG-N-EXEM2-7-SA-008", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Section Formula (Point on Segment)", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the coordinates of the point R on the line segment joining the points P (−1, 3) and Q (2, 5) such that PR = (3/5) PQ.",
    solutionSteps: ["[1 mark] PR = (3/5) PQ means R divides PQ in the ratio PR : RQ = 3 : 2.", "[1 mark] By the section formula, R = ((3·2 + 2·(−1))/5, (3·5 + 2·3)/5).", "[1 mark] = ((6−2)/5, (15+6)/5) = (4/5, 21/5)."],
    finalAnswer: "R = (4/5, 21/5).",
    ncertRef: "Exemplar Ex 7.3 Q18", isCompetencyBased: true },

  { id: "CG-N-EXEM2-7-SA-009", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Ratio in which a Line Divides a Segment", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Find the ratio in which the line 2x + 3y − 5 = 0 divides the line segment joining the points (8, −9) and (2, 1). Also find the coordinates of the point of division.",
    solutionSteps: ["[1 mark] Let the line divide the segment in ratio k : 1; the point of division is ((2k+8)/(k+1), (k−9)/(k+1)).", "[1 mark] Substituting into 2x + 3y − 5 = 0: 2(2k+8) + 3(k−9) − 5(k+1) = 0 ⇒ 4k+16+3k−27−5k−5 = 0 ⇒ 2k − 16 = 0 ⇒ k = 8.", "[1 mark] Ratio = 8 : 1; point = ((16+8)/9, (8−9)/9) = (24/9, −1/9) = (8/3, −1/9)."],
    finalAnswer: "8 : 1; point of division (8/3, −1/9).",
    ncertRef: "Exemplar Ex 7.3 Q20", isCompetencyBased: true },

  // ===== Section D — Long Answer (Exercise 7.4, 5 marks) =====
  { id: "CG-N-EXEM2-7-LA-001", subject: "Maths", topicKey: "coordinate-geometry", subtopic: "Medians and Centroid", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "The points A (x₁, y₁), B (x₂, y₂) and C (x₃, y₃) are the vertices of ΔABC. (i) The median from A meets BC at D. Find the coordinates of the point D. (ii) Find the coordinates of the point P on AD such that AP : PD = 2 : 1. (iii) Find the coordinates of points Q and R on medians BE and CF respectively such that BQ : QE = 2 : 1 and CR : RF = 2 : 1. (iv) What are the coordinates of the centroid of the triangle ABC?",
    solutionSteps: ["[1 mark] (i) D is the mid-point of BC: D = ((x₂+x₃)/2, (y₂+y₃)/2).", "[1 mark] (ii) P divides AD in ratio 2 : 1, so P = ((2·(x₂+x₃)/2 + 1·x₁)/3, (2·(y₂+y₃)/2 + 1·y₁)/3) = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3).", "[1 mark] (iii) E is mid-point of CA = ((x₁+x₃)/2,(y₁+y₃)/2); Q divides BE in 2:1 ⇒ Q = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3).", "[1 mark] Similarly F is mid-point of AB and R divides CF in 2:1 ⇒ R = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3) — so P, Q, R coincide.", "[1 mark] (iv) The centroid is that common point: ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3)."],
    finalAnswer: "D = ((x₂+x₃)/2,(y₂+y₃)/2); P = Q = R = centroid = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3).",
    ncertRef: "Exemplar Ex 7.4 Q3", isCompetencyBased: true },
];
