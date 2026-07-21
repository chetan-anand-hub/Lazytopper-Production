import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Mathematics (Standard 041)
// Papers: Mathematics-PQ1.pdf + MS, Mathematics-PQ2.pdf + MS
// topicKey: "triangles"
// Extraction date: 2026-05-24

export const TRIANGLES_APQ: CanonicalQuestion[] = [
  // PQ1 Q5 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-001", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Side Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "ΔPQR is shown. ST is drawn such that ∠PRQ = ∠STQ. If ST divides QR in a ratio of 2:3, then what is the length of ST?",
    options: ["10/3 cm", "8 cm", "12 cm", "40/3 cm"],
    answer: "8 cm",
    solutionSteps: ["∠PRQ = ∠STQ and ∠Q common ⟹ ΔQST ~ ΔQRP (AA).", "ST/PR = QT/QP = 2/5 (per ratio 2:3, so QT:TR = 2:3 ⟹ QT/QR = 2/5). With PR = 20 cm (from figure), ST = 2/5 × 20 = 8 cm."],
    finalAnswer: "(b) 8 cm",
    ncertRef: "APQ PQ1 Q5", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: triangle PQR with ST drawn." },

  // PQ1 Q6 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-002", subject: "Maths", topicKey: "triangles", subtopic: "Similarity vs Congruence", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Two scalene triangles are given. Anas: ΔPQR is similar to ΔCBA. Rishi: ΔPQR is congruent to ΔCBA. Which of them is/are correct?",
    options: ["Only Anas", "Only Rishi", "Both Anas and Rishi", "Neither of them, as two scalene triangles can never be similar or congruent."],
    answer: "Only Anas",
    solutionSteps: ["Per figure, the two scalene triangles have equal angles but different side lengths ⟹ similar but NOT congruent.", "Anas is correct. Note: order of vertices PQR ↔ CBA matches the angle correspondence."],
    finalAnswer: "(a) Only Anas",
    ncertRef: "APQ PQ1 Q6", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two scalene triangles with side measurements." },

  // PQ1 Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-003", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Harsha made a wind chime using a frame and metal rods. She punched 8 holes in the frame, each 2 cm apart, and then hung 6 metal rods from the frame. The ends of the metal rods are aligned over a line shown by the dotted line. If all of the rods are straight and not swaying, then what is the length of Rod P?",
    options: ["69/7 cm", "53/5 cm", "76/5 cm", "111/7 cm"],
    answer: "111/7 cm",
    solutionSteps: ["The setup forms similar triangles where the rod lengths increase linearly across the frame. Using basic proportionality with the dotted line meeting the rod ends.", "Per MS: Rod P = 111/7 cm."],
    finalAnswer: "(d) 111/7 cm",
    ncertRef: "APQ PQ1 Q7", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: wind chime with 8 holes and 6 rods aligned on a dotted line." },

  // PQ2 Q7 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-004", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Side Ratios", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If in two triangles, DEF and PQR, ∠D = ∠Q and ∠R = ∠E, then which of the following is not true?",
    options: ["EF/PR = DF/PQ", "EF/RP = DE/PQ", "DE/QR = DF/PQ", "EF/RP = DE/QR"],
    answer: "EF/RP = DE/PQ",
    solutionSteps: ["Given correspondences: D↔Q, E↔R (since ∠R = ∠E), F↔P. So ΔDEF ~ ΔQRP with sides DE/QR = EF/RP = DF/QP.", "Check options against this correspondence: (a) EF/PR = DF/PQ ⟹ EF/RP = DF/QP — true. (b) EF/RP = DE/PQ — RHS is DE/PQ not DE/QR — INCORRECT. (c) and (d) consistent."],
    finalAnswer: "(b) EF/RP = DE/PQ",
    ncertRef: "APQ PQ2 Q7", isCompetencyBased: true },

  // PQ2 Q8 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-005", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Parallelogram Application", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, PQRS is a parallelogram, if AT = AQ = 6 cm, AS = 3 cm and TS = 4 cm, then (find x, y).",
    options: ["x = 4, y = 5", "x = 2, y = 3", "x = 1, y = 2", "x = 3, y = 4"],
    answer: "x = 3, y = 4",
    solutionSteps: ["REQUIRES-FIGURE: details from PDF needed to set up similar triangles in the parallelogram.", "Per MS: x = 3, y = 4."],
    finalAnswer: "(d) x = 3, y = 4",
    ncertRef: "APQ PQ2 Q8", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: parallelogram PQRS with auxiliary point T and lengths." },

  // PQ2 Q23 (Section B, Short, 2 marks)
  { id: "APQ-M-TRI-006", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Proof", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In given figure, DB ⊥ BC, DE ⊥ AB and AC ⊥ BC. Prove that BE/DE = AC/BC. OR If AD and PM are the medians of triangles ABC and PQR respectively where ΔABC ~ ΔPQR, prove that AB/PQ = AD/PM.",
    answer: "Proved.",
    solutionSteps: ["[Variant 1] ∠DEB = ∠ACB = 90°. ∠ABC = 90° − ∠DBE; ∠BDE = 90° − ∠DBE ⟹ ∠ABC = ∠BDE. So ΔBDE ~ ΔABC (AA) ⟹ BE/AC = DE/BC ⟹ BE/DE = AC/BC.", "[Variant 2] ΔABC ~ ΔPQR ⟹ AB/PQ = BC/QR. Medians AD = ½BC, PM = ½QR (wait, AD bisects BC at D, so BD = ½BC; similarly QM = ½QR). AB/PQ = 2BD/(2QM) = BD/QM. With ∠B = ∠Q (similar triangles), ΔABD ~ ΔPQM (SAS), hence AB/PQ = AD/PM."],
    finalAnswer: "Both variants proved.",
    ncertRef: "APQ PQ2 Q23", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE for both variants." },

  // PQ2 Q33 (Section D, Long, 5 marks)
  { id: "APQ-M-TRI-007", subject: "Maths", topicKey: "triangles", subtopic: "Basic Proportionality Theorem — Statement and Application", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "State and prove Basic proportionality theorem. In ΔABC, if DE ∥ BC, AD = x, DB = x − 2, AE = x + 2 and EC = x − 1, then using the above result, find the value of x.",
    answer: "Statement, proof and x = 4.",
    solutionSteps: ["[1 mark] Statement: If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, then the other two sides are divided in the same ratio.", "[1 mark] Given and construction: In ΔABC, DE ∥ BC meets AB at D and AC at E. Join BE and CD; draw EM ⊥ AB and DN ⊥ AC.", "[1 mark] Proof (areas): ar(ΔADE)/ar(ΔBDE) = AD/DB (triangles on bases AD and DB with the same height EM); similarly ar(ΔADE)/ar(ΔCDE) = AE/EC.", "[1 mark] Since ΔBDE and ΔCDE are on the same base DE and between the same parallels DE and BC, ar(ΔBDE) = ar(ΔCDE). Therefore AD/DB = AE/EC.", "[1 mark] Application: x/(x − 2) = (x + 2)/(x − 1) ⟹ x(x − 1) = (x + 2)(x − 2) ⟹ x² − x = x² − 4 ⟹ x = 4."],
    finalAnswer: "BPT stated and proved; x = 4.",
    ncertRef: "APQ PQ2 Q33", isCompetencyBased: true },

  // PQ1 Q33 (Section D, Long, 5 marks)
  { id: "APQ-M-TRI-008", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Right Triangle Area", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In the figure, ΔABC is a right-angled triangle, such that: AC = 25 cm, PT ∥ AB and SR ∥ BC. Find the area of ΔPQR.",
    answer: "Area of ΔPQR = 32/3 cm^2.",
    solutionSteps: ["[1 mark] From the figure: RC = 50/5 = 10 cm and PC = 50/3 cm, so PR = PC − RC = 50/3 − 10 = 20/3 cm.", "[1 mark] Since QR ∥ BC (as SR ∥ BC), ΔPQR ~ ΔPTC by the Basic Proportionality Theorem, giving PR/CR = PQ/QT.", "[1 mark] Substitute: (20/3)/10 = PQ/8 ⟹ PQ = (20/3) × 8 / 10 = 16/3 cm.", "[1 mark] In right ΔPQR, by Pythagoras QR² = PR² − PQ² = (20/3)² − (16/3)² = (400 − 256)/9 = 144/9 ⟹ QR = 4 cm.", "[1 mark] Area of ΔPQR = ½ × QR × PQ = ½ × 4 × 16/3 = 32/3 cm²."],
    finalAnswer: "Area = 32/3 cm^2.",
    ncertRef: "APQ PQ1 Q33", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: right triangle ABC with internal lines PT and SR." },

  // ===== Mathematics-PQ_2022.pdf (2022-23 set, appended 2026-05-25) =====

  // PQ_2022 Q5 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-009", subject: "Maths", topicKey: "triangles", subtopic: "Similar Triangles — Word Application", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Sonali is standing on one side of a 7 m wide road. She wants to estimate the distance (D) between two light poles on the other side without crossing the road. Which of the following expressions represent D in terms of p and r?",
    options: ["7r/p m", "pr/7 m", "pr/(p+7) m", "r(p+7)/p m"],
    answer: "r(p+7)/p m",
    solutionSteps: ["Similar triangles from observed sight-lines: ratio of corresponding sides gives D/(p + 7) = r/p (where p is the distance from Sonali to the road and (p + 7) is her distance to the far poles).", "Solve: D = r(p + 7)/p m."],
    finalAnswer: "(d) r(p+7)/p m",
    ncertRef: "APQ PQ_2022 Q5", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: Sonali across 7 m road from light poles." },

  // PQ_2022 Q6 (Section A, MCQ, 1 mark)
  { id: "APQ-M-TRI-010", subject: "Maths", topicKey: "triangles", subtopic: "Similarity — Sufficient Conditions", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Shown are two triangles such that length of two sides of each is known. Along with the given information, which of these is sufficient to conclude whether ΔKLM is similar to ΔPQR? (i) ∠KLM = ∠PQR (ii) Ratio of KM:PR",
    options: ["only (i)", "only (ii)", "either (i) or (ii)", "(the given information is enough to conclude that ΔKLM ∼ ΔPQR as ratio of sides is known)"],
    answer: "either (i) or (ii)",
    solutionSteps: ["With two sides known on each triangle, (i) included angle = SAS similarity criterion ⟹ sufficient.", "(ii) Third side ratio added to two known sides = SSS similarity criterion ⟹ sufficient.", "Either condition alone is sufficient."],
    finalAnswer: "(c) either (i) or (ii)",
    ncertRef: "APQ PQ_2022 Q6", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two triangles ΔKLM and ΔPQR with side lengths." },

  // PQ_2022 Q34 (Section D, Long, 5 marks)
  { id: "APQ-M-TRI-011", subject: "Maths", topicKey: "triangles", subtopic: "Trapezium Area via Similar Triangles", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "In the figure below, ST || PQ. All measurements are in units. Prove that the area of the trapezium PQTS is [(1/2)(a + b)h] sq units.",
    answer: "Proved.",
    solutionSteps: ["In ΔPQR and ΔSTR: ∠PRQ = ∠SRT (common); ∠PQR = ∠STR (corresponding angles, ST || PQ). So ΔPQR ~ ΔSTR by AA criterion.", "Area of ΔPQR = (1/2)·b·(H + h); Area of ΔSTR = (1/2)·a·H.", "Area of trapezium PQTS = ΔPQR − ΔSTR = (1/2)·b·(H + h) − (1/2)·a·H = (1/2)·[(b − a)H + b·h].", "From similarity: (H + h)/H = b/a ⟹ H = a·h/(b − a).", "Substitute: Area = (1/2)·[(b − a)·a·h/(b − a) + b·h] = (1/2)·[a·h + b·h] = (1/2)·(a + b)·h. QED."],
    finalAnswer: "Area of trapezium PQTS = (1/2)(a + b)h.",
    ncertRef: "APQ PQ_2022 Q34", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: triangle PQR with parallel line ST inside." },
];
