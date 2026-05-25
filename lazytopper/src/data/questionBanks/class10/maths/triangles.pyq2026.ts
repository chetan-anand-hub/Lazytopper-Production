import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2025-26 board exam
// Question papers + matched marking schemes (MS_X_041_Mathematics_30-x-x_2025-26) from CBSE
// topicKey: "triangles"
// Extraction date: 2026-05-25
// PDF tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed via probe)
// Coverage: 7 text-extractable Standard QPs (30/4/x, 30/5/x, 30(B)); 9 scanned QPs (30/1/x, 30/2/x, 30/3/x) skipped — require OCR; all 9 Maths Basic (430-x-x) skipped per scope
// Section A MCQ answers absent on 30/4/x MS (rendered as images by CBSE); kept where 30/5/x or 30(B) MS produced text.

export const TRIANGLES_PYQ_2026: CanonicalQuestion[] = [
  { id: "PYQ-M-2026-TRI-001", subject: "Maths", topicKey: "triangles", subtopic: "Similarity of Triangles", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Devansh proved that ABC ~ PQR using SAS similarity criteria. If he found C = R, then which of the following was proved true ?",
    options: ["AC AB = PR PQ", "BC AC = PR QR", "AC BC = PR PQ", "AC BC = PR QR"],
    answer: "୅େ ୆େ= ୔ୖ ୕ୖ",
    solutionSteps: ["Correct option: (d) ୅େ ୆େ= ୔ୖ ୕ୖ."],
    finalAnswer: "(d) ୅େ ୆େ= ୔ୖ ୕ୖ",
    ncertRef: "PYQ 30/5/1 Q5", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-TRI-002", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A circle is inscribed in a right triangle ABC, right angled at B. If the lengths of the two sides containing the right angle are 8 cm and 15 cm, find the radius of the incircle.",
    answer: "Thus, OPBQ is a square. ⇒ OP = PB = BQ = OQ = r Thus, AR = AP = 8 – r and CR = CQ = 15 – r Now, AC = AR + CR r = 3 cm",
    solutionSteps: ["AC = √(15)2 + (8)2 = 17 cm Let 'r' be the radius of the circle.", "Since, radius is perpendicular to the tangent through the point of contact. ∴ OP is perpendicular to AB and OQ is perpendicular to BC.", "Thus, OPBQ is a square. ⇒ OP = PB = BQ = OQ = r Thus, AR = AP = 8 – r and CR = CQ = 15 – r Now, AC = AR + CR r = 3 cm"],
    finalAnswer: "Thus, OPBQ is a square. ⇒ OP = PB = BQ = OQ = r Thus, AR = AP = 8 – r and CR = CQ = 15 – r Now, AC = AR + CR r = 3 cm",
    ncertRef: "PYQ 30(B) Q23", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-TRI-003", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "D is a point on the side BC of ABC such that CAB = CDA. Show that CA2 = CB CD.",
    answer: "DC AC = AC BC ⟹ AC2 = DC × BC or CA2 = CB × CD",
    solutionSteps: ["∆ADC ~ ∆BAC", "DC AC = AC BC ⟹ AC2 = DC × BC or CA2 = CB × CD"],
    finalAnswer: "DC AC = AC BC ⟹ AC2 = DC × BC or CA2 = CB × CD",
    ncertRef: "PYQ 30/4/1 Q22", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "1" },
  { id: "PYQ-M-2026-TRI-004", subject: "Maths", topicKey: "triangles", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In the given figure, point D divides the side BC of ABC in the ratio 1 : 2. Find length AD.",
    answer: "Coordinates of point D = ൬4 −4 3 , 2 + 2 3 ൰i. e. ൬0, 4 3൰ I 1  8 AD = (1 −0)+ (5 −4 3)= √130 3 units",
    solutionSteps: ["Coordinates of point D = ൬4 −4 3 , 2 + 2 3 ൰i. e. ൬0, 4 3൰ I 1  8 AD = (1 −0)+ (5 −4 3)= √130 3 units"],
    finalAnswer: "Coordinates of point D = ൬4 −4 3 , 2 + 2 3 ൰i. e. ൬0, 4 3൰ I 1  8 AD = (1 −0)+ (5 −4 3)= √130 3 units",
    ncertRef: "PYQ 30/5/3 Q21", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "3" },
  { id: "PYQ-M-2026-TRI-005", subject: "Maths", topicKey: "triangles", subtopic: "Similarity of Triangles", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Carom board is a very popular game. The board is a square of side length 65 cm. It has circular pockets in each corner. Ansh strikes a disc, kept at position P with a striker. The disc, hits the boundary of the board at R and goes straight to pocket at corner C. It is given that PS = 9 cm, PQ = 35 cm, BR = x, PRQ = and CRB = . Based on the above information, answer the following questions : (i) Using law of reflection i.e. PRT = CRT, prove that = . 1 (ii) Prove that PQR ~ CBR given that PQ is perpendicular to AB. 1 (iii) (a) Find the value of x using similarity of triangles. 2 OR (b) If Area PQR Area CBR = 2 2 CB PQ , then find the value of x.",
    answer: "𝑃𝑄 CB = 𝑄𝑅 BR ⟹ 35 65 = 65− 9 − 𝑥 𝑥 ⟹ 35𝑥 = 65 (56 – 𝑥) ⟹ 𝑥 = 36.4 cm",
    solutionSteps: ["(i) TR ⊥ AB", "𝛼 + ∠PRT = 𝜃 + ∠TRC As ∠PRT = ∠TRC, so 𝛼 = 𝜃 (ii) As 𝜃 = 𝛼, so ∠PRQ = ∠CRB and ∠PQR = ∠CBR = 900", "∆PQR ~ ∆CBR (iii) (a) ∆PQR ~ ∆CBR", "𝑃𝑄 CB = 𝑄𝑅 BR ⟹ 35 65 = 65− 9 − 𝑥 𝑥 ⟹ 35𝑥 = 65 (56 – 𝑥) ⟹ 𝑥 = 36.4 cm"],
    finalAnswer: "𝑃𝑄 CB = 𝑄𝑅 BR ⟹ 35 65 = 65− 9 − 𝑥 𝑥 ⟹ 35𝑥 = 65 (56 – 𝑥) ⟹ 𝑥 = 36.4 cm",
    ncertRef: "PYQ 30/4/2 Q38", isCompetencyBased: true,
    pyqYear: "2026", pyqSet: "2" },
];
