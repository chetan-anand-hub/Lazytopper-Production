import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Mathematics — Chapter 6: Triangles
// topicKey: "triangles"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27 (Ex 6.4 area-ratio theorem excluded)
// Coverage: Ex 6.1 (3) + Ex 6.2 (5) + Ex 6.3 (5) + Ex 6.5 (6) + Examples (3) = 22 questions
// In-scope: Similar Figures, BPT + converse, AA/SAS/SSS similarity, Pythagoras + converse.

export const TRI_NCERT: CanonicalQuestion[] = [
  // ===== Exercise 6.1 — Similar Figures =====
  { id: "TRI-N-NCERT-6-MCQ-001", subject: "Maths", topicKey: "triangles", subtopic: "Similar Figures", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Fill in the blank: All circles are ______.",
    options: ["congruent", "similar", "equal in area", "equilateral"],
    answer: "similar",
    solutionSteps: ["All circles have the same shape (a closed curve at constant distance from a centre).", "Two circles need not have the same radius, so they are not always congruent.", "Same shape but possibly different size → similar."],
    finalAnswer: "similar — option (b).",
    ncertRef: "NCERT Ex 6.1 Q1(i)", isCompetencyBased: false,
    strategyHint: "Same shape, any size = similar; same shape AND size = congruent." },

  { id: "TRI-N-NCERT-6-MCQ-002", subject: "Maths", topicKey: "triangles", subtopic: "Similar Figures", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Fill in the blank: All ______ triangles are similar.",
    options: ["isosceles", "equilateral", "right", "scalene"],
    answer: "equilateral",
    solutionSteps: ["Every equilateral triangle has all three angles equal to 60°.", "So any two equilateral triangles are equiangular → corresponding angles equal.", "By AAA similarity, all equilateral triangles are similar (regardless of side length).", "Isosceles triangles can have different vertex angles, so they are not always similar."],
    finalAnswer: "equilateral — option (b).",
    ncertRef: "NCERT Ex 6.1 Q1(iii)", isCompetencyBased: false },

  { id: "TRI-N-NCERT-6-VSA-001", subject: "Maths", topicKey: "triangles", subtopic: "Similar Figures", section: "B", marks: 2, format: "VSA", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "State the two conditions under which two polygons of the same number of sides are similar.",
    answer: "Two polygons of the same number of sides are similar if (i) their corresponding angles are equal AND (ii) their corresponding sides are in the same ratio (proportion). Both conditions must hold simultaneously — neither alone is sufficient (e.g., a square and a rectangle have equal angles but unequal side ratios; a square and a rhombus have equal side ratios but unequal angles).",
    solutionSteps: ["Condition (i): all pairs of corresponding angles must be equal.", "Condition (ii): all pairs of corresponding sides must be in the same ratio.", "Both conditions are necessary — a square vs rectangle satisfies (i) only and fails to be similar.", "A square vs rhombus satisfies (ii) only and fails to be similar."],
    finalAnswer: "Corresponding angles equal AND corresponding sides in the same ratio.",
    ncertRef: "NCERT Ex 6.1 Q1(iv)", isCompetencyBased: false },

  // ===== Exercise 6.2 — Basic Proportionality Theorem =====
  { id: "TRI-N-NCERT-6-SA-001", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "In △ABC, DE ∥ BC. If AD = 1.5 cm, DB = 3 cm and AE = 1 cm, find EC.",
    answer: "By the Basic Proportionality Theorem (BPT), since DE ∥ BC, AD/DB = AE/EC. Substituting: 1.5/3 = 1/EC, so EC = 3/1.5 = 2 cm.",
    solutionSteps: ["DE ∥ BC, so by BPT (Theorem 6.1): AD/DB = AE/EC.", "AD = 1.5, DB = 3, AE = 1; let EC = x.", "1.5/3 = 1/x ⇒ x = 3/1.5 = 2.", "Therefore EC = 2 cm."],
    finalAnswer: "EC = 2 cm.",
    ncertRef: "NCERT Ex 6.2 Q1(i)", isCompetencyBased: false,
    strategyHint: "DE ∥ BC ⇒ AD/DB = AE/EC (BPT). Substitute and solve." },

  { id: "TRI-N-NCERT-6-SA-002", subject: "Maths", topicKey: "triangles", subtopic: "Converse of BPT", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "E and F are points on the sides PQ and PR respectively of △PQR. For the case PE = 3.9 cm, EQ = 3 cm, PF = 3.6 cm and FR = 2.4 cm, state whether EF ∥ QR.",
    answer: "Compute the two ratios: PE/EQ = 3.9/3 = 1.3 and PF/FR = 3.6/2.4 = 1.5. Since 1.3 ≠ 1.5, PE/EQ ≠ PF/FR. By the converse of BPT (Theorem 6.2), a line divides two sides of a triangle in the same ratio iff it is parallel to the third side. As the ratios are unequal, EF is NOT parallel to QR.",
    solutionSteps: ["Compute PE/EQ = 3.9/3 = 1.3.", "Compute PF/FR = 3.6/2.4 = 1.5.", "Compare: 1.3 ≠ 1.5, so PE/EQ ≠ PF/FR.", "By converse of BPT, EF ∥ QR would require equal ratios.", "Therefore EF is NOT parallel to QR."],
    finalAnswer: "EF is not parallel to QR (ratios 1.3 and 1.5 are unequal).",
    ncertRef: "NCERT Ex 6.2 Q2(i)", isCompetencyBased: true,
    strategyHint: "Compute PE/EQ and PF/FR; equal ratios ⇒ parallel by converse of BPT." },

  { id: "TRI-N-NCERT-6-SA-003", subject: "Maths", topicKey: "triangles", subtopic: "Converse of BPT", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "In △PQR, E and F are points on PQ and PR with PE = 4 cm, QE = 4.5 cm, PF = 8 cm and RF = 9 cm. Is EF ∥ QR?",
    answer: "PE/EQ = 4/4.5 = 8/9 and PF/FR = 8/9. Since PE/EQ = PF/FR, by the converse of BPT (Theorem 6.2), EF ∥ QR.",
    solutionSteps: ["PE/EQ = 4/4.5 = 8/9.", "PF/FR = 8/9.", "Ratios are equal, so by converse of BPT, EF ∥ QR."],
    finalAnswer: "Yes, EF ∥ QR.",
    ncertRef: "NCERT Ex 6.2 Q2(ii)", isCompetencyBased: false },

  { id: "TRI-N-NCERT-6-LA-001", subject: "Maths", topicKey: "triangles", subtopic: "Similarity Proofs", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Using BPT, prove that a line drawn through the mid-point of one side of a triangle parallel to another side bisects the third side. (Mid-point Theorem)",
    answer: "Given: △ABC with D the mid-point of AB, and DE drawn parallel to BC meeting AC at E. To prove: E is the mid-point of AC, i.e., AE = EC. Proof: Since DE ∥ BC, by BPT, AD/DB = AE/EC. But D is the mid-point of AB, so AD = DB, giving AD/DB = 1. Hence AE/EC = 1, so AE = EC. Therefore E is the mid-point of AC, i.e., DE bisects the third side AC.",
    solutionSteps: ["Given: △ABC; D is the mid-point of AB; DE ∥ BC; E lies on AC.", "To prove: AE = EC (E is the mid-point of AC).", "Proof: DE ∥ BC ⇒ by BPT, AD/DB = AE/EC.", "D is the mid-point of AB ⇒ AD = DB ⇒ AD/DB = 1.", "Therefore AE/EC = 1 ⇒ AE = EC.", "Conclusion: E is the mid-point of AC, so the line through D parallel to BC bisects AC."],
    finalAnswer: "Proved: a line through the mid-point of one side parallel to another side bisects the third side.",
    ncertRef: "NCERT Ex 6.2 Q7 (Theorem 6.1 application)", isCompetencyBased: false,
    strategyHint: "Apply BPT, then use AD = DB to force AE = EC." },

  { id: "TRI-N-NCERT-6-LA-002", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "ABCD is a trapezium in which AB ∥ DC and its diagonals intersect at the point O. Show that AO/BO = CO/DO.",
    answer: "Given: trapezium ABCD with AB ∥ DC; diagonals AC and BD intersect at O. To prove: AO/BO = CO/DO. Construction: Through O, draw OE ∥ AB ∥ DC, meeting AD at E. Proof: In △ADC, since OE ∥ DC, by BPT: AE/ED = AO/OC. In △ABD (or using AB ∥ OE with OE ∥ DC, hence the same parallel through O), the parallel line gives BO/OD = AE/ED. Equating: AO/OC = BO/OD, which rearranges to AO/BO = CO/DO. (Alternative direct proof: △AOB and △COD have ∠OAB = ∠OCD and ∠OBA = ∠ODC (alternate angles since AB ∥ DC), so △AOB ~ △COD by AA. Hence AO/CO = BO/DO, i.e., AO/BO = CO/DO.)",
    solutionSteps: ["Given: trapezium ABCD with AB ∥ DC; diagonals meet at O.", "To prove: AO/BO = CO/DO.", "Proof (using similarity): In △AOB and △COD, ∠OAB = ∠OCD (alternate angles, AB ∥ DC).", "∠OBA = ∠ODC (alternate angles, AB ∥ DC).", "By AA similarity, △AOB ~ △COD ⇒ AO/CO = BO/DO.", "Cross-multiplying: AO·DO = BO·CO ⇒ AO/BO = CO/DO."],
    finalAnswer: "Proved: AO/BO = CO/DO via AA similarity of △AOB and △COD.",
    ncertRef: "NCERT Ex 6.2 Q9", isCompetencyBased: false,
    strategyHint: "Use AB ∥ DC ⇒ alternate angles ⇒ AA similarity of the two triangles formed by the diagonals." },

  // ===== Examples (Section 6.3 / 6.4) =====
  { id: "TRI-N-NCERT-6-LA-003", subject: "Maths", topicKey: "triangles", subtopic: "Similarity Proofs", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In △PQR, S and T lie on PQ and PR respectively such that PS/SQ = PT/TR and ∠PST = ∠PRQ. Prove that △PQR is isosceles.",
    answer: "Given: PS/SQ = PT/TR and ∠PST = ∠PRQ. To prove: △PQR is isosceles, i.e., PQ = PR. Proof: Since PS/SQ = PT/TR, by the converse of BPT (Theorem 6.2), ST ∥ QR. Hence ∠PST = ∠PQR (corresponding angles, ST ∥ QR). Combined with the given ∠PST = ∠PRQ, we get ∠PQR = ∠PRQ. Sides opposite equal angles in a triangle are equal, so PQ = PR. Therefore △PQR is isosceles.",
    solutionSteps: ["Given: PS/SQ = PT/TR and ∠PST = ∠PRQ.", "To prove: PQ = PR (△PQR is isosceles).", "Step 1: PS/SQ = PT/TR ⇒ by converse of BPT, ST ∥ QR.", "Step 2: ST ∥ QR ⇒ ∠PST = ∠PQR (corresponding angles).", "Step 3: Given ∠PST = ∠PRQ; combined with Step 2 ⇒ ∠PQR = ∠PRQ.", "Step 4: Sides opposite equal angles are equal ⇒ PQ = PR.", "Hence △PQR is isosceles."],
    finalAnswer: "Proved: △PQR is isosceles with PQ = PR.",
    ncertRef: "NCERT Example 3 (Ch 6)", isCompetencyBased: true,
    strategyHint: "Use converse of BPT to get ST ∥ QR, then corresponding angles to identify two equal angles." },

  // ===== Exercise 6.3 — Criteria for Similarity =====
  { id: "TRI-N-NCERT-6-SA-004", subject: "Maths", topicKey: "triangles", subtopic: "Criteria for Similarity", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the figure, △ODC ~ △OBA, ∠BOC = 125° and ∠CDO = 70°. Find ∠DOC, ∠DCO and ∠OAB.",
    answer: "DOB is a straight line, so ∠DOC + ∠BOC = 180°. Thus ∠DOC = 180° − 125° = 55°. In △DOC, ∠DOC + ∠OCD + ∠CDO = 180° (angle sum). So ∠DCO = 180° − 55° − 70° = 55°. Since △ODC ~ △OBA, corresponding angles are equal: ∠OAB = ∠OCD = 55° (the angle at A corresponds to the angle at C under the given similarity correspondence O↔O, D↔B, C↔A).",
    solutionSteps: ["DOB is a straight line ⇒ ∠DOC + ∠BOC = 180°.", "∠DOC = 180° − 125° = 55°.", "In △DOC: ∠DOC + ∠OCD + ∠CDO = 180°.", "∠DCO = 180° − 55° − 70° = 55°.", "△ODC ~ △OBA ⇒ ∠OAB = ∠OCD = 55° (corresponding angles)."],
    finalAnswer: "∠DOC = 55°, ∠DCO = 55°, ∠OAB = 55°.",
    ncertRef: "NCERT Ex 6.3 Q2", isCompetencyBased: false,
    strategyHint: "Use linear pair, then angle sum in △DOC, then the similarity correspondence." },

  { id: "TRI-N-NCERT-6-LA-004", subject: "Maths", topicKey: "triangles", subtopic: "Criteria for Similarity", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Diagonals AC and BD of a trapezium ABCD with AB ∥ DC intersect at the point O. Using a similarity criterion for two triangles, show that OA/OC = OB/OD.",
    answer: "Given: trapezium ABCD with AB ∥ DC; diagonals AC and BD meet at O. To prove: OA/OC = OB/OD. Proof: In △AOB and △COD: (1) ∠AOB = ∠COD (vertically opposite angles). (2) Since AB ∥ DC and AC is a transversal, ∠OAB = ∠OCD (alternate interior angles). By the AA similarity criterion, △AOB ~ △COD. Hence corresponding sides are proportional: OA/OC = OB/OD = AB/CD.",
    solutionSteps: ["Given: AB ∥ DC; diagonals AC, BD meet at O.", "To prove: OA/OC = OB/OD.", "Construction: none needed — work in △AOB and △COD.", "Proof: ∠AOB = ∠COD (vertically opposite angles).", "AB ∥ DC with transversal AC ⇒ ∠OAB = ∠OCD (alternate angles).", "By AA similarity criterion, △AOB ~ △COD.", "Corresponding sides are proportional ⇒ OA/OC = OB/OD."],
    finalAnswer: "Proved: OA/OC = OB/OD using AA similarity criterion.",
    ncertRef: "NCERT Ex 6.3 Q3", isCompetencyBased: false,
    strategyHint: "Vertically opposite + alternate interior angles ⇒ AA similarity." },

  { id: "TRI-N-NCERT-6-LA-005", subject: "Maths", topicKey: "triangles", subtopic: "Similarity Proofs", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "D is a point on the side BC of △ABC such that ∠ADC = ∠BAC. Show that CA² = CB · CD.",
    answer: "Given: D on BC with ∠ADC = ∠BAC. To prove: CA² = CB · CD. Proof: In △ADC and △BAC: (1) ∠ADC = ∠BAC (given). (2) ∠ACD = ∠BCA (common angle, i.e., the angle at C is shared). By AA similarity, △ADC ~ △BAC. Hence corresponding sides are proportional: CA/CB = CD/CA. Cross-multiplying: CA² = CB · CD.",
    solutionSteps: ["Given: D on BC; ∠ADC = ∠BAC.", "To prove: CA² = CB · CD.", "In △ADC and △BAC, ∠ADC = ∠BAC (given).", "∠ACD = ∠BCA = ∠C (common angle at vertex C).", "By AA similarity criterion, △ADC ~ △BAC.", "Corresponding sides: CA/CB = CD/CA (matching A↔B, D↔A, C↔C).", "Cross-multiplying: CA · CA = CB · CD ⇒ CA² = CB · CD."],
    finalAnswer: "Proved: CA² = CB · CD via △ADC ~ △BAC (AA similarity).",
    ncertRef: "NCERT Ex 6.3 Q13", isCompetencyBased: true,
    strategyHint: "Identify the common angle at C, use the given angle equality, then AA similarity." },

  { id: "TRI-N-NCERT-6-SA-005", subject: "Maths", topicKey: "triangles", subtopic: "Criteria for Similarity", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A vertical pole of length 6 m casts a shadow 4 m long on the ground, and at the same time a tower casts a shadow 28 m long. Find the height of the tower.",
    answer: "At the same time of day, the sun's rays make equal angles with the ground. The pole, its shadow, and the sun's ray form a right triangle similar to the one formed by the tower, its shadow, and the sun's ray (AA similarity: right angle and equal sun-angle). So the ratios of heights to shadows are equal: 6/4 = h/28, giving h = 6 × 28/4 = 42 m.",
    solutionSteps: ["Let the tower's height = h m. Both the pole and the tower are vertical, so each makes a 90° angle with the ground.", "The sun's rays hit both objects at the same angle of elevation.", "By AA similarity, △(pole, shadow, ray) ~ △(tower, shadow, ray).", "Therefore (pole height)/(pole shadow) = (tower height)/(tower shadow): 6/4 = h/28.", "h = 6 × 28/4 = 168/4 = 42.", "Height of the tower = 42 m."],
    finalAnswer: "Height of the tower = 42 m.",
    ncertRef: "NCERT Ex 6.3 Q15", isCompetencyBased: true,
    strategyHint: "Same-time-of-day ⇒ equal sun angles ⇒ AA similarity of the two right triangles." },

  // ===== Exercise 6.5 — Pythagoras Theorem =====
  { id: "TRI-N-NCERT-6-MCQ-003", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "Which of the following side-lengths form a right triangle?",
    options: ["7 cm, 24 cm, 25 cm", "3 cm, 8 cm, 6 cm", "50 cm, 80 cm, 100 cm", "13 cm, 12 cm, 6 cm"],
    answer: "7 cm, 24 cm, 25 cm",
    solutionSteps: ["Check 7, 24, 25: 7² + 24² = 49 + 576 = 625 = 25² ✓. Right triangle with hypotenuse 25.", "Check 3, 8, 6: largest is 8; 3² + 6² = 9 + 36 = 45 ≠ 64. Not a right triangle.", "Check 50, 80, 100: 50² + 80² = 2500 + 6400 = 8900 ≠ 10000. Not a right triangle.", "Check 13, 12, 6: largest is 13; 12² + 6² = 144 + 36 = 180 ≠ 169. Not a right triangle.", "Only option (a) is a right triangle."],
    finalAnswer: "7, 24, 25 — option (a). Hypotenuse = 25 cm.",
    ncertRef: "NCERT Ex 6.5 Q1", isCompetencyBased: false,
    strategyHint: "By converse of Pythagoras: triangle is right ⇔ (largest side)² = sum of squares of other two." },

  { id: "TRI-N-NCERT-6-LA-006", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "ABD is a triangle right-angled at A and AC ⊥ BD. Show that (i) AB² = BC · BD, (ii) AC² = BC · DC, (iii) AD² = BD · CD.",
    answer: "Given: △ABD right-angled at A, with AC ⊥ BD (C lies on BD). To prove: (i) AB² = BC · BD, (ii) AC² = BC · DC, (iii) AD² = BD · CD. Proof: By Theorem 6.7, the perpendicular from the right-angle vertex to the hypotenuse creates two triangles each similar to the original. So △ABC ~ △DBA (sharing ∠B, both have a right angle: at C and at A respectively) and △ACD ~ △BAD (sharing ∠D, both right-angled). From △ABC ~ △DBA: AB/DB = BC/BA ⇒ AB² = BC · BD. (i) ✓ From △ABC ~ △BCA (wait — use the third similarity): the two smaller triangles △ABC and △ACD are similar to each other; from △ABC ~ △DCA (correspondence A↔D, B↔C, C↔A): AC/DC = BC/AC ⇒ AC² = BC · DC. (ii) ✓ From △ACD ~ △BAD: AD/BD = CD/AD ⇒ AD² = BD · CD. (iii) ✓",
    solutionSteps: ["Given: △ABD with ∠A = 90°; AC ⊥ BD; C lies on BD.", "To prove: (i) AB² = BC · BD; (ii) AC² = BC · DC; (iii) AD² = BD · CD.", "Key result (Theorem 6.7): the foot of the altitude from the right angle creates three mutually similar triangles: △ABD, △CBA, △CAD.", "Proof of (i): △ABC and △DBA share ∠B; ∠ACB = ∠DAB = 90°. By AA, △ABC ~ △DBA. So AB/DB = BC/AB ⇒ AB² = BC · BD.", "Proof of (ii): The two smaller triangles △ABC and △ACD are both similar to △ABD, hence to each other (△ABC ~ △DCA with A↔D, B↔C, C↔A). So AC/DC = BC/AC ⇒ AC² = BC · DC.", "Proof of (iii): △ACD ~ △BAD (share ∠D; both have a right angle at C and A respectively). So AD/BD = CD/AD ⇒ AD² = BD · CD.", "All three results follow from Theorem 6.7."],
    finalAnswer: "Proved (i), (ii), (iii) using Theorem 6.7 (altitude from right-angle vertex creates similar sub-triangles).",
    ncertRef: "NCERT Ex 6.5 Q3", isCompetencyBased: true,
    strategyHint: "Identify the three similar triangles formed by the altitude from the right angle; each result is a side-ratio from one similarity pair." },

  { id: "TRI-N-NCERT-6-LA-007", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "ABC is an isosceles triangle right-angled at C. Prove that AB² = 2 AC².",
    answer: "Given: △ABC right-angled at C with AC = BC (isosceles). To prove: AB² = 2 AC². Proof: Since ∠C = 90°, by Pythagoras Theorem AB² = AC² + BC². The triangle is isosceles with AC = BC (the two legs are equal because the right angle is at C, making the other two angles each 45°, and equal angles imply equal opposite sides — but here we're given AC = BC). Substituting BC = AC: AB² = AC² + AC² = 2 AC².",
    solutionSteps: ["Given: △ABC right-angled at C; AC = BC (isosceles).", "To prove: AB² = 2 AC².", "Apply Pythagoras Theorem at the right angle C: AB² = AC² + BC².", "Use isosceles condition AC = BC: substitute BC = AC.", "AB² = AC² + AC² = 2 AC².", "Hence AB² = 2 AC², as required."],
    finalAnswer: "Proved: AB² = 2 AC².",
    ncertRef: "NCERT Ex 6.5 Q4", isCompetencyBased: false,
    strategyHint: "Pythagoras at the right angle + isosceles condition AC = BC." },

  { id: "TRI-N-NCERT-6-SA-006", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "ABC is an equilateral triangle of side 2a. Find each of its altitudes.",
    answer: "Drop an altitude AD from A onto BC; D is the foot. In an equilateral triangle, the altitude from any vertex bisects the opposite side, so BD = DC = a. △ABD is right-angled at D, with AB = 2a (hypotenuse) and BD = a. By Pythagoras: AD² = AB² − BD² = (2a)² − a² = 4a² − a² = 3a². So AD = a√3. Each altitude has length a√3.",
    solutionSteps: ["Let △ABC be equilateral with side 2a. Drop altitude AD ⊥ BC at D.", "In an equilateral triangle, the altitude bisects the base, so BD = DC = a.", "△ABD is right-angled at D with hypotenuse AB = 2a and one leg BD = a.", "By Pythagoras: AD² = AB² − BD² = 4a² − a² = 3a².", "AD = √(3a²) = a√3.", "By symmetry, every altitude has length a√3."],
    finalAnswer: "Each altitude = a√3.",
    ncertRef: "NCERT Ex 6.5 Q6", isCompetencyBased: false,
    strategyHint: "Altitude bisects the base in an equilateral triangle; apply Pythagoras to the half-triangle." },

  { id: "TRI-N-NCERT-6-SA-007", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A ladder 10 m long reaches a window 8 m above the ground. Find the distance of the foot of the ladder from the base of the wall.",
    answer: "Let the foot of the ladder be x m from the wall. The wall, the ground, and the ladder form a right triangle with hypotenuse 10 m (ladder) and vertical leg 8 m (height to the window). By Pythagoras: 10² = 8² + x², so x² = 100 − 64 = 36, giving x = 6 m.",
    solutionSteps: ["Let foot-to-wall distance = x m. Wall is vertical, ground is horizontal ⇒ right angle at base.", "Apply Pythagoras: (ladder)² = (height)² + (base)².", "10² = 8² + x² ⇒ 100 = 64 + x² ⇒ x² = 36 ⇒ x = 6 m."],
    finalAnswer: "Distance of foot from wall = 6 m.",
    ncertRef: "NCERT Ex 6.5 Q9", isCompetencyBased: true,
    strategyHint: "Ladder + wall + ground = right triangle; ladder is the hypotenuse." },

  { id: "TRI-N-NCERT-6-SA-008", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An aeroplane leaves an airport and flies due north at 1000 km/h. At the same time, another aeroplane leaves the same airport and flies due west at 1200 km/h. How far apart will the two planes be after 1½ hours?",
    answer: "Distance flown by the north-bound plane in 1.5 h = 1000 × 1.5 = 1500 km. Distance flown by the west-bound plane in 1.5 h = 1200 × 1.5 = 1800 km. North and west are perpendicular directions, so the airport and the two plane positions form a right triangle with legs 1500 km and 1800 km. By Pythagoras, distance between planes = √(1500² + 1800²) = √(2,250,000 + 3,240,000) = √5,490,000 = 300√61 km.",
    solutionSteps: ["North-bound plane: distance = 1000 × 1.5 = 1500 km.", "West-bound plane: distance = 1200 × 1.5 = 1800 km.", "North ⊥ West, so the two paths and the line between the planes form a right triangle with legs 1500 and 1800.", "By Pythagoras: separation² = 1500² + 1800² = 2,250,000 + 3,240,000 = 5,490,000.", "Separation = √5,490,000 = √(900 × 6100) = 30√6100 = 300√61 km (≈ 2343.07 km)."],
    finalAnswer: "Distance between the planes = 300√61 km (≈ 2343.07 km).",
    ncertRef: "NCERT Ex 6.5 Q11", isCompetencyBased: true,
    strategyHint: "Perpendicular paths ⇒ right triangle ⇒ Pythagoras on the two distances." },

  { id: "TRI-N-NCERT-6-MCQ-004", subject: "Maths", topicKey: "triangles", subtopic: "Converse of Pythagoras", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In △ABC, AB = 6√3 cm, AC = 12 cm and BC = 6 cm. The angle B is:",
    options: ["120°", "60°", "90°", "45°"],
    answer: "90°",
    solutionSteps: ["Compute squares: AB² = (6√3)² = 108; AC² = 144; BC² = 36.", "Check Pythagorean relation: AB² + BC² = 108 + 36 = 144 = AC².", "By the converse of Pythagoras Theorem, the angle opposite the longest side AC is a right angle.", "AC is opposite vertex B, so ∠B = 90°."],
    finalAnswer: "∠B = 90° — option (c).",
    ncertRef: "NCERT Ex 6.5 Q17", isCompetencyBased: true,
    strategyHint: "Compute squares; if (longest)² = sum of other two squares, the angle opposite the longest side is 90° (converse of Pythagoras)." },

  // ===== Assertion-Reasoning =====
  { id: "TRI-N-NCERT-6-AR-001", subject: "Maths", topicKey: "triangles", subtopic: "Similar Figures", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Assertion (A): All congruent figures are similar, but the converse is not true.\nReason (R): Two figures are similar if they have the same shape; they are congruent if they have the same shape and the same size.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["A: True. Congruent figures share shape and size — same shape ⇒ similar; but two similar figures can differ in size, so similar ⇏ congruent.", "R: True. Similarity = same shape; congruence = same shape AND same size.", "R directly explains why congruence implies similarity but not vice versa.", "Hence option (A)."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT §6.2 (Similar Figures)", isCompetencyBased: false },

  { id: "TRI-N-NCERT-6-AR-002", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): A triangle with sides 5 cm, 12 cm and 13 cm is a right triangle with the right angle opposite the side of length 13 cm.\nReason (R): In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides (Pythagoras Theorem) and the hypotenuse is opposite the right angle.",
    options: [
      "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
      "(B) Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion.",
      "(C) Assertion is true but Reason is false.",
      "(D) Assertion is false but Reason is true."
    ],
    answer: "(A) Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
    solutionSteps: ["Check A: 5² + 12² = 25 + 144 = 169 = 13². By converse of Pythagoras, the triangle is right-angled with hypotenuse 13. The right angle is opposite the hypotenuse. A is TRUE.", "Check R: Pythagoras Theorem and the hypotenuse-vs-right-angle relation are correctly stated. R is TRUE.", "R directly justifies A — the test (5² + 12² = 13²) plus 'hypotenuse opposite the right angle' is exactly the reasoning that A uses.", "Hence option (A)."],
    finalAnswer: "Option (A).",
    ncertRef: "NCERT Theorem 6.8 / 6.9 (Pythagoras + converse)", isCompetencyBased: true },

  // ===== Case-Based (Section E) =====
  { id: "TRI-N-NCERT-6-CB-001", subject: "Maths", topicKey: "triangles", subtopic: "Criteria for Similarity", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Case study: A girl of height 90 cm walks away from the base of a lamp-post at a speed of 1.2 m/s. The lamp is fixed at 3.6 m above the ground. Answer the following:\n(i) After 4 seconds, how far is the girl from the lamp-post (in metres)?\n(ii) Using similar triangles, write the relation between the girl's height, the lamp-post's height, the distance of the girl from the post, and the length of her shadow.\n(iii) Find the length of the girl's shadow after 4 seconds.\n(iv) Which similarity criterion is used to set up the two similar triangles?",
    answer: "(i) Distance from lamp-post = 1.2 × 4 = 4.8 m. (ii) Let AB = lamp-post (3.6 m), CD = girl (90 cm = 0.9 m), BD = distance from post (4.8 m), DE = shadow (x m). △ABE ~ △CDE (girl and lamp-post both vertical to the ground; common angle at E). The relation is AB/CD = BE/DE, i.e., 3.6/0.9 = (4.8 + x)/x. (iii) Solving: 4(x) = 4.8 + x ⇒ 3x = 4.8 ⇒ x = 1.6 m. The shadow is 1.6 m long. (iv) AA similarity criterion: both triangles have a right angle (vertical objects on horizontal ground) and share the angle at E (the tip of the shadow).",
    solutionSteps: ["(i) Distance from post in 4 s = speed × time = 1.2 × 4 = 4.8 m.", "(ii) Lamp-post AB and girl CD are both vertical ⇒ ∠B = ∠D = 90°. They share ∠E (the angle at the tip of the shadow). By AA, △ABE ~ △CDE.", "Corresponding sides: AB/CD = BE/DE, i.e., 3.6/0.9 = (BD + DE)/DE = (4.8 + x)/x.", "(iii) 3.6/0.9 = 4 ⇒ 4 = (4.8 + x)/x ⇒ 4x = 4.8 + x ⇒ 3x = 4.8 ⇒ x = 1.6 m.", "(iv) AA similarity criterion (right angle + shared angle at E)."],
    finalAnswer: "(i) 4.8 m; (ii) AB/CD = BE/DE; (iii) shadow = 1.6 m; (iv) AA similarity criterion.",
    ncertRef: "NCERT Example 7 (Ch 6)", isCompetencyBased: true,
    strategyHint: "Vertical objects + same sunlight/shadow tip ⇒ AA similarity. Set up and solve the proportion." },

  { id: "TRI-N-NCERT-6-CB-002", subject: "Maths", topicKey: "triangles", subtopic: "Pythagoras Theorem", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Case study: A guy wire attached to the top of a vertical pole of height 18 m is 24 m long, and the other end is fixed to a stake on the ground. Answer:\n(i) Name the right angle in the pole-wire-ground triangle.\n(ii) Identify the hypotenuse.\n(iii) How far from the base of the pole should the stake be driven so that the wire is taut? (Use Pythagoras.)\n(iv) If a second guy wire 30 m long is used from the same top, what would be the new distance of the stake from the base?",
    answer: "(i) The pole is vertical and the ground is horizontal, so the right angle is at the base of the pole. (ii) The guy wire (the slant side opposite the right angle) is the hypotenuse. (iii) Let the stake be x m from the base. By Pythagoras: x² + 18² = 24² ⇒ x² = 576 − 324 = 252 ⇒ x = √252 = 6√7 m ≈ 15.87 m. (iv) With a 30 m wire: x² + 18² = 30² ⇒ x² = 900 − 324 = 576 ⇒ x = 24 m.",
    solutionSteps: ["(i) Pole ⊥ ground at the base of the pole ⇒ right angle at the base.", "(ii) Hypotenuse = side opposite the right angle = the guy wire.", "(iii) Apply Pythagoras: (stake distance)² + (pole height)² = (wire length)². Let stake distance = x. x² + 18² = 24² ⇒ x² = 576 − 324 = 252 ⇒ x = 6√7 m ≈ 15.87 m.", "(iv) With wire = 30 m: x² + 18² = 30² ⇒ x² = 900 − 324 = 576 ⇒ x = 24 m."],
    finalAnswer: "(i) At the base of the pole. (ii) The guy wire. (iii) 6√7 m ≈ 15.87 m. (iv) 24 m.",
    ncertRef: "NCERT Ex 6.5 Q10", isCompetencyBased: true,
    strategyHint: "Vertical pole + horizontal ground + slanted wire = right triangle; wire is the hypotenuse." },
];
