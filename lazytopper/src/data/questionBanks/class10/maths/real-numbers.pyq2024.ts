import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "real-numbers"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const REAL_NUMBERS_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-REALNUM-001", subject: "Maths", topicKey: "real-numbers", subtopic: "LCM", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The LCM of 24, 36 and 60 in terms of their prime factors is :",
    options: ["22 × 3 × 5", "23 × 32", "23 × 32 × 5", "23 × 33 × 5 1430(B)"],
    answer: "23 × 32 × 5",
    solutionSteps: ["Correct option: (c) 23 × 32 × 5."],
    finalAnswer: "(c) 23 × 32 × 5",
    ncertRef: "PYQ 30(B) Q1", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-REALNUM-002", subject: "Maths", topicKey: "real-numbers", subtopic: "Divisibility", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Find the smallest number that is divisible by each of 8, 9 and 10.",
    answer: "smallest number divisible by each 8, 9 and 10 is 360.",
    solutionSteps: ["8 = 23 9 = 32 10 = 2 × 5 LCM (8, 9, 10) = 23 × 32 × 5 = 360", "smallest number divisible by each 8, 9 and 10 is 360."],
    finalAnswer: "smallest number divisible by each 8, 9 and 10 is 360.",
    ncertRef: "PYQ 30(B) Q21", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-REALNUM-003", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 3 is an irrational number.",
    answer: "p2 is divisible by 3 ⟹ p is divisible by 3  (i) ⟹ p = 3a, where 'a' is some integer 9a2 = 3q2 ⟹ q2 = 3a2 ⟹q2 is divisible by 3 ⟹ q is divisible by 3  (ii) (i) and (ii) leads to contradiction as 'p' and 'q' are coprime. ∴ √𝟑 is an irrational number.",
    solutionSteps: ["Let √𝟑 be a rational number.", "√𝟑= 𝐩 𝐪 , where q≠0 and p & q are coprime. 3q2 = p2", "p2 is divisible by 3 ⟹ p is divisible by 3  (i) ⟹ p = 3a, where 'a' is some integer 9a2 = 3q2 ⟹ q2 = 3a2 ⟹q2 is divisible by 3 ⟹ q is divisible by 3  (ii) (i) and (ii) leads to contradiction as 'p' and 'q' are coprime. ∴ √𝟑 is an irrational number."],
    finalAnswer: "p2 is divisible by 3 ⟹ p is divisible by 3  (i) ⟹ p = 3a, where 'a' is some integer 9a2 = 3q2 ⟹ q2 = 3a2 ⟹q2 is divisible by 3 ⟹ q is divisible by 3  (ii) (i) and (ii) leads to contradiction as 'p' and 'q' are coprime. ∴ √𝟑 is an irrational number.",
    ncertRef: "PYQ 30(B) Q26", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-REALNUM-004", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that 5 3 – 2 is an irrational number, given that 3 is an irrational number.",
    answer: "2−√3 5 is an irrational number. ½",
    solutionSteps: ["Assuming 2−√3 5 to be a rational number. 2−√3 5 = p q ,where p and q are integers & q ≠0 √3 = 2q−5p q Here RHS is rational but LHS is irrational.", "Therefore our assumption is wrong. ½ 1 ½ ½  12", "2−√3 5 is an irrational number. ½"],
    finalAnswer: "2−√3 5 is an irrational number. ½",
    ncertRef: "PYQ 30/4/1 Q30", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-REALNUM-005b", subject: "Maths", topicKey: "real-numbers", subtopic: "Irrationality Proof", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Prove that ( ) 2 2 3 + is an irrational number, given that 6 is an irrational number.",
    answer: "Our assumption is wrong. 5 + 2 6 = 2 ( 2 + 3) is an irrational number 1",
    solutionSteps: ["2 ( 2 + 3) = 2 + 3 +2 6 = 5 + 2 6 Let us assume, to the contrary, that 5 + 2 6 is rational 5 + 2 6 = a b", "a, b are integers, b 0 ∴√6 = a−5b 2b RHS is a rational number, whereas LHS is an irrational number.", "Our assumption is wrong. 5 + 2 6 = 2 ( 2 + 3) is an irrational number 1"],
    finalAnswer: "Our assumption is wrong. 5 + 2 6 = 2 ( 2 + 3) is an irrational number 1",
    ncertRef: "PYQ 30/5/1 Q26(b)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
