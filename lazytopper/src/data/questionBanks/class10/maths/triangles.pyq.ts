import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2022-23 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2022-23) from CBSE
// topicKey: "triangles"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable QPs (30/2/x, 30/4/x, 30/5/x); 6 scanned QPs (30/1/x, 30/6/x) and 30-B-5 skipped — require OCR

export const TRIANGLES_PYQ: CanonicalQuestion[] = [
  { id: "PYQ-M-TRI-001", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, DE BC. If AD = 2 units, DB = AE = 3 units and EC = x units, then the value of x is :",
    options: ["2", "3", "5", "2"],
    answer: "9 2",
    solutionSteps: ["Correct option: (d) 9 2."],
    finalAnswer: "(d) 9 2",
    ncertRef: "PYQ 30/2/1 Q12", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-TRI-002", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, AB PQ. If AB = 6 cm, PQ = 2 cm and OB = 3 cm, then the length of OP is :",
    options: ["9 cm", "3 cm", "4 cm", "1 cm"],
    answer: "1 cm",
    solutionSteps: ["Correct option: (d) 1 cm."],
    finalAnswer: "(d) 1 cm",
    ncertRef: "PYQ 30/2/2 Q6", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "2" },
  { id: "PYQ-M-TRI-003", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, A = C, AB = 6 cm, AP = 12 cm, CP = 4 cm. Then length of CD is :",
    options: ["2 cm", "6 cm", "8 cm", "18 cm"],
    answer: "2 cm 1",
    solutionSteps: ["Correct option: (a) 2 cm 1."],
    finalAnswer: "(a) 2 cm 1",
    ncertRef: "PYQ 30/2/3 Q4", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
  { id: "PYQ-M-TRI-004", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, DE BC. The value of x is :",
    options: ["6", "12·5", "8", "10"],
    answer: "10",
    solutionSteps: ["Correct option: (d) 10."],
    finalAnswer: "(d) 10",
    ncertRef: "PYQ 30/5/1 Q4", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-TRI-005", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "(A) D is a point on the side BC of a triangle ABC such that ∠ADC = ∠BAC, prove that CA2 = CB.CD 5 OR (B) If AD and PM are medians of triangles ABC and PQR, respectively where ∆ABC ~ ∆PQR, prove that AB AD PQ PM = .",
    answer: "Sol.  ABC   PQR 1 mark for correct figure 17  AD and AM are medians of  ABC and  PQR respectively.  ABC   PQR  PQ AB = QR BC PQ AB = QM 2 BD 2 PQ AB = QM BD Also  B =  Q ( ABC   PQR)   ABD   PQM (SAS similarly)  𝑨𝑩 𝑷𝑸= 𝑨𝑫 𝑷𝑴",
    solutionSteps: [
      "[1 mark] (A) Diagram: triangle ABC with D a point on side BC such that ∠ADC = ∠BAC; given figure drawn correctly.",
      "[1 mark] In △CBA and △CDA: ∠C = ∠C (common) and ∠BAC = ∠ADC (given).",
      "[1 mark] Therefore △CBA ~ △CDA by the AA similarity criterion.",
      "[1 mark] Corresponding sides of similar triangles are proportional: CA/CD = CB/CA.",
      "[1 mark] Cross-multiplying, CA² = CB · CD. Hence proved. [OR (B): since △ABC ~ △PQR, AB/PQ = BC/QR = 2BD/2QM = BD/QM; also ∠B = ∠Q, so △ABD ~ △PQM (SAS similarity), giving AB/PQ = AD/PM. Hence proved.]"
    ],
    finalAnswer: "(A) CA² = CB·CD, proved by AA similarity. [OR (B) AB/PQ = AD/PM, proved via SAS similarity of △ABD and △PQM.]",
    ncertRef: "PYQ 30/4/1 Q33", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "1" },
  { id: "PYQ-M-TRI-006", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Jagdish has a field which is in the shape of a right angled triangle AQC. He wants to leave a space in the form of a square PQRS inside the field for growing wheat and the remaining for growing vegetables (as shown in the figure). In the field, there is a pole marked as O. Based on the above information, answer the following questions : (i) Taking O as origin, coordinates of P are (–200, 0) and of Q are (200, 0). PQRS being a square, what are the coordinates of R and S ? 1 (ii) (a) What is the area of square PQRS ? 2 OR (b) What is the length of diagonal PR in square PQRS ? 2 (iii) If S divides CA in the ratio K:1, what is the value of K, where point A is (200, 800) ? 1 16",
    answer: "(i) R(200, 400), S(– 200, 400) 𝟏 𝟐+ 𝟏 𝟐 23  (ii) (a) side PQ = (200+200) m = 400 m Area of square PQRS = 400  400 = 160000 sq. units OR (ii) (b) Diagonal PR = 2 2 ) 400 ( ) 400 ( + = √3200 or 400 2 (iii) 𝐶(−600,0); 𝐴(200,800);𝑆(−200,400) S divides CA in the ratio 𝑘: 1 −200 = 𝑘(200)+1(−600) 𝑘+1 ⟹𝑘=",
    solutionSteps: [
      "[1 mark] (i) PQRS is a square of side PQ = 400 m, so R = (200, 400) and S = (−200, 400).",
      "[1 mark] (ii)(a) Side PQ = (200 + 200) m = 400 m. [OR (ii)(b) Diagonal PR = √(400² + 400²).]",
      "[1 mark] (ii)(a) Area of square PQRS = 400 × 400 = 160000 sq m. [OR (ii)(b) PR = √320000 = 400√2 m.]",
      "[1 mark] (iii) C(−600, 0), A(200, 800), S(−200, 400): S divides CA in the ratio k : 1 ⇒ −200 = (k·200 + 1·(−600))/(k + 1) ⇒ 200k − 600 = −200k − 200 ⇒ 400k = 400 ⇒ k = 1."
    ],
    finalAnswer: "(i) R(200, 400), S(−200, 400); (ii)(a) 160000 sq m [OR (b) 400√2 m]; (iii) k = 1.",
    ncertRef: "PYQ 30/4/3 Q38", isCompetencyBased: true,
    pyqYear: "2023", pyqSet: "3" },
];
