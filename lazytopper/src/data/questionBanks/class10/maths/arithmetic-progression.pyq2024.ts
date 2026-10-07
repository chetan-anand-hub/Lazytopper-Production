import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "arithmetic-progression"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const ARITHMETIC_PROGRESSION_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-AP-001a", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the sum of the first m terms of an A.P. is the same as the sum of its first n terms (m ≠ n), then show that the sum of its first (m + n) terms is zero.",
    answer: "Since Sₘ = Sₙ with m ≠ n, 2a + (m + n − 1)d = 0, hence S₍ₘ₊ₙ₎ = ((m + n)/2)[2a + (m + n − 1)d] = 0.",
    solutionSteps: ["[1 mark] Sₘ = Sₙ ⇒ (m/2)[2a + (m − 1)d] = (n/2)[2a + (n − 1)d] ⇒ 2a(m − n) + d[(m² − n²) − (m − n)] = 0.", "[1 mark] Dividing by (m − n) ≠ 0: 2a + d(m + n − 1) = 0.", "[1 mark] S₍ₘ₊ₙ₎ = ((m + n)/2)[2a + (m + n − 1)d] = ((m + n)/2) × 0 = 0. Hence proved."],
    finalAnswer: "S₍ₘ₊ₙ₎ = 0 (shown)",
    ncertRef: "PYQ 30/2/2 Q29(a)", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-M-2024-AP-002a", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Sum of n Terms", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "If the sum of the first 14 terms of an A.P. is 1050 and the first term is 10, then find the 20th term and the nth term.",
    answer: "14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n",
    solutionSteps: ["14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n"],
    finalAnswer: "14 2 (20 + 13𝑑) = 1050 d = 10 a20 = 10 + 19 × 10 = 200 an = 10 + (n − 1) 10 = 10n",
    ncertRef: "PYQ 30/5/1 Q27(a)", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-AP-002b", subject: "Maths", topicKey: "arithmetic-progression", subtopic: "Common Difference", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The first term of an A.P. is 5, the last term is 45 and the sum of all the terms is 400. Find the number of terms and the common difference of the A.P.",
    answer: "n = 16, d = 8/3",
    solutionSteps: ["[1 mark] a = 5, l = 45, Sₙ = (n/2)(a + l) ⇒ 400 = (n/2)(5 + 45) = 25n.", "[1 mark] n = 16.", "[1 mark] l = a + (n − 1)d ⇒ 45 = 5 + 15d ⇒ d = 40/15 = 8/3."],
    finalAnswer: "n = 16, d = 8/3",
    ncertRef: "PYQ 30/5/1 Q27(b)", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
