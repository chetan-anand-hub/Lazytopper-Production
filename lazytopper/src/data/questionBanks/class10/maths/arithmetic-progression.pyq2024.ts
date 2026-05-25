import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const ARITHMETIC_PROGRESSION_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-AP-001a", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "General", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If thesumoffirst m termsofanA.P.is same as sum ofits first n terms(m¹n),thenshowthatthesumofitsfirst(m+n)termsiszero.",
    answer: "2a(m −n) = d(n2 −m2) −d(n −m) ⇒2a = −d(m + n −1) or 2a + (m + n −1)d = 0 i. e. , Sm+n = 𝑚+𝑛 2 [2a + (m + n −1)d] =",
    solutionSteps: ["Sm = Sn", "m 2 [2a + (m −1)d = n 2 [2a + (n −1)d]", "2a(m −n) = d(n2 −m2) −d(n −m) ⇒2a = −d(m + n −1) or 2a + (m + n −1)d = 0 i. e. , Sm+n = 𝑚+𝑛 2 [2a + (m + n −1)d] ="],
    finalAnswer: "2a(m −n) = d(n2 −m2) −d(n −m) ⇒2a = −d(m + n −1) or 2a + (m + n −1)d = 0 i. e. , Sm+n = 𝑚+𝑛 2 [2a + (m + n −1)d] =",
    ncertRef: "PYQ 30/2/2 Q29(a)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "2" },
  { id: "PYQ-M-2024-AP-002a", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the sum of the first 14 terms of an A.P. is 1050 and the first term is 10, then find the 20th term and the nth term.",
    answer: "14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n",
    solutionSteps: ["14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n"],
    finalAnswer: "14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n",
    ncertRef: "PYQ 30/5/1 Q27(a)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-AP-002b", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The first term of an A.P. is 5, the last term is 45 and the sum of all the terms is 400. Find the number of terms and the common difference of the A.P.",
    answer: "n = 16 5 + 15d = 45 d = 40 15 or",
    solutionSteps: ["a = 5, an = 45", "Sn = 400 𝑛 2 (5 + 45) = 400", "n = 16 5 + 15d = 45 d = 40 15 or"],
    finalAnswer: "n = 16 5 + 15d = 45 d = 40 15 or",
    ncertRef: "PYQ 30/5/1 Q27(b)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
