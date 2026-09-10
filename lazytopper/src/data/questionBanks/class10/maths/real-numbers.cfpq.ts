import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * real-numbers — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Mathematics, Chapter 1.
 *
 * Source: CFPQ_Maths10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (39,567,003 bytes, 227 pages).
 *   Chapter 1 occupies pdf pages 4-11: the chapter title page on pdf page 4
 *   (printed folio 3), questions on pdf pages 5-7 (printed folios 4-6), the
 *   multiple-choice answer key on pdf page 8 (folio 7), and the step-marking
 *   rubrics on pdf pages 9-11 (folios 8-10).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — re-derived for this
 *   booklet, not inherited: the printed folio was read off every page and
 *   compared with the pdf index; 224 of 224 folio-bearing pages give offset
 *   +1, with no discontinuity anywhere in the 227 pages. The three pages
 *   without a folio are the cover and the two back-matter pages.
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 4 MCQs (Q1-Q4) in the answer table on folio 7, and 10 rubric
 *             rows (5, 6, 7, 8, 9, 10, 11, 12, 13, 14) across folios 8-10.
 *             4 + 10 = 14 = the highest question number printed in the
 *             chapter. Contiguous, no gap, no repeat. NO OFFSET.
 *   CONTENT — each pairing semantically locked, checked in both directions:
 *             rubric 5 "Representation 1 is correct" answers only Q5, the
 *             only question offering two representations; rubric 7's HCF of
 *             825/675/450 only Q7's 8.25 m / 6.75 m / 4.50 m hall; rubric 8's
 *             84/21 = 4 and 231/21 = 11 only Q8's two fields; rubric 10's
 *             "13p + 13q = 91" only Q10's sum-91-HCF-13 pairs; rubric 13's
 *             "(n - 1)(n + 4)" only Q13's n² + 3n - 4. No rubric row read
 *             sensibly against any question other than its own number.
 *   MARKS   — the [N] printed in each question's right margin against the
 *             rubric total, all 10 free-response rows:
 *               Q5 [1]=1 · Q6 [2]=1+1 · Q7 [2]=1+1 · Q8 [2]=1+0.5+0.5
 *               Q9 [2]=1+1 · Q10 [3]=0.5+0.5+1+1 · Q11 [3]=1+1+1
 *               Q12 [3]=0.5+1+0.5+0.5+0.5 · Q13 [1]=0.5+0.5 · Q14 [1]=1
 *             10 of 10 agree. No conflict of the kind that withheld
 *             Chapter 12 Q12 of the Science booklet.
 *   Result: NO OFFSET on any of the three checks. All three agree.
 *
 * EXTRACTION METHOD: body text is vector curves; transcribed by eye from
 *   pages rendered at 200 dpi with pymupdf 1.27.2.3. No OCR. pdfplumber not
 *   used. The pdf DOES carry a thin text layer (folios, chapter titles,
 *   answer-key headings, the table of contents) and it was used ONLY to
 *   locate pages — never as a transcription source, because it is damaged:
 *   see the ligature note below.
 *
 * ⚠ THE TEXT LAYER IS DAMAGED AND BOTH SCANS REPORT IT CLEAN.
 *   The booklet's text layer contains ZERO private-use-area codepoints, yet
 *   it is corrupt: U+019F (LATIN CAPITAL LETTER O WITH MIDDLE TILDE) is
 *   substituted for the "ti" ligature 59 times, so the printed table of
 *   contents extracts as "QuesƟons", "EquaƟons", "StaƟsƟcs",
 *   "ConstrucƟons". U+019F is an ordinary Latin Extended-B codepoint, so a
 *   PUA scan reports 0 and check:mojibake (a UTF-8-as-Latin-1 pattern
 *   detector) does not match it either. Anything harvested from that layer
 *   would ship visibly wrong text past every gate.
 *   See [FU-LIGATURE-SUBSTITUTION-INVISIBLE-TO-BOTH-SCANS].
 *
 *   ⛔ THE FIVE U+019F CHARACTERS IN THIS HEADER ARE DELIBERATE EVIDENCE — DO NOT
 *   "TIDY" THEM. They are the four corrupted words the text layer actually
 *   yields, quoted so the next reader recognises this damage class in the
 *   wild. OWNER RULING 2026-09-07: they stay. This is the same defect-versus-
 *   subject distinction `scripts/check-mojibake.cjs` makes in its own comments
 *   for the 8 mojibake specimens in `handoff/`: mojibake is a DEFECT in
 *   product text and a legitimate SUBJECT in documentation about mojibake.
 *   Proven to be documentation and not product text: every student-facing
 *   field (questionText, options, answer, finalAnswer, solutionSteps,
 *   diagramDescription) scans clean for PUA, Latin Extended-B and U+FFFD,
 *   while the same detector finds 3 of 3 planted characters in a synthetic
 *   bad string. Deleting these five would destroy the evidence for the FU.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * NORMALISATION APPLIED — whitespace only. Words, numerals, symbols and
 *   option order are as printed. The booklet sets a space before some
 *   question marks ("divisible by p ?"); that space is closed up. Nothing
 *   else was touched.
 */

/**
 * ⛔ SYLLABUS EXCLUSIONS — 4 of the 14 questions are NOT in this array.
 *
 * The booklet is dated 13 Nov 2022, BEFORE the rationalisation that the live
 * `scripts/src/syllabusGuard.ts` (year "2026-27") encodes. Euclid's Division
 * Lemma / Algorithm is OUT of the 2026-27 Class X Real Numbers syllabus. Four
 * questions test exactly it, and their ids are left unused:
 *
 *   Q4  (pdf page 5, folio 4) — id `CFPQ-M-REALNUM-004` UNUSED.
 *       Banned topic: "Euclid's Division Lemma".
 *       THE SOURCE'S OWN WORDS FIRST. Q11's official rubric (pdf page 10,
 *       folio 9) — seven questions later in this same chapter — reads:
 *         "Euclid's Division Lemma states that the remainder is always
 *          less than the divisor"
 *       Q4's statement (iii) is "r is DEFINITELY less than q", i.e. that
 *       property verbatim; its (i) "r CANNOT be (p - q)" and (ii) "r CAN
 *       either be q or (p - q)" restate the same bound as distractors. So
 *       CBSE, in its own words and inside this chapter, classifies this
 *       content as Euclid's Division Lemma. The exclusion rests on that
 *       citation, NOT on this lane's reading of the mathematics.
 *       ★ OWNER RULING 2026-09-07: EXCLUDE — DO NOT RE-LITIGATE. Q4 was
 *       first put to the owner as the one judgement call of the four,
 *       because an MCQ carries no rubric row of its own to name its topic.
 *       The ruling upgraded it: an MCQ inherits the classification the
 *       booklet gives the same property elsewhere in the same chapter, and
 *       Q11's rubric supplies it. That makes Q4 the BEST-documented of the
 *       four exclusions, not the weakest. The id stays reserved and unused,
 *       so reinstating the row is a one-line change if a later syllabus
 *       check ever says otherwise.
 *
 *   Q6  (pdf page 6, folio 5) — id `CFPQ-M-REALNUM-006` UNUSED.
 *       Banned topic: "Euclid's Division Algorithm". The stem itself says
 *       "Find the HCF ... using Euclid's division algorithm", and its rubric
 *       (folio 8) works the algorithm explicitly. Unambiguous.
 *
 *   Q11 (pdf page 7, folio 6) — id `CFPQ-M-REALNUM-011` UNUSED.
 *       Banned topic: "Euclid's Division Lemma". Its own official rubric
 *       (folio 9) names it twice: "Euclid's Division Lemma states that the
 *       remainder is always less than the divisor".
 *
 *   Q12 (pdf page 7, folio 6) — id `CFPQ-M-REALNUM-012` UNUSED.
 *       Banned topic: "Euclid's Division Lemma". Its rubric (folios 9-10)
 *       opens "uses Euclid's division lemma with divisor as 3" and later
 *       "equivalent by Euclid's division lemma".
 *
 * ⚠ THE GUARD CANNOT SEE THESE EXCLUSIONS, SO ITS PASS IS NOT THE EVIDENCE.
 *   `syllabusGuard.ts` matches the `subtopic:` field as an EXACT, full-string
 *   comparison. It has no view of a question's mathematics. Every row below
 *   would pass it whatever the stem said, and the four questions above would
 *   have passed it too had they been included under an innocuous subtopic.
 *   The guard is run as a floor, never quoted as proof: the exclusions above
 *   were made by reading each question against the 2026-27 syllabus, and
 *   three of the four are corroborated by the booklet's own rubric wording.
 *
 * ⚠ VERBATIM SOURCE DEFECT, NOT CORRECTED: Q4's stem reads "Let p and q be
 *   two natural numbes such that p > q" — "numbes" for "numbers", confirmed
 *   by eye at 500 dpi. Q4 is excluded on syllabus grounds above, so the typo
 *   ships nowhere; it is recorded because the defect is real and the next
 *   lane to touch this page should not think it a transcription slip.
 *
 * FIGURE CROPS — saved and mapped, DELIBERATELY NOT BOUND.
 *   Cropped from the same 200 dpi render pass, lossless WebP, eye-confirmed:
 *
 *     CFPQ-M-REALNUM-005 -> public/figures/cfpq-maths/real-numbers/CFPQ-M-REALNUM-005.webp
 *       from pdf page 6 (folio 5), 1226x474 px. Confirmed: both boxes, both
 *       "Real numbers" headings, all six set labels legible (Natural numbers,
 *       Whole numbers, Integers, Rational numbers, Irrational numbers) and
 *       BOTH captions "Representation 1" / "Representation 2" — which the
 *       answer names explicitly. No body text bled into the box.
 *
 *     CFPQ-M-REALNUM-001 -> public/figures/cfpq-maths/real-numbers/CFPQ-M-REALNUM-001.webp
 *       from pdf page 5 (folio 4), 357x130 px. The four-cell display box
 *       showing k/2, k, 7k, k³. REFERENCE ONLY — the four expressions are
 *       transcribed inline in the stem and are re-listed in the options, so
 *       the question is fully answerable without the image and the row does
 *       NOT set `requiresDiagram`. Confirmed: all four cells legible, no bleed.
 *
 *   NOT BOUND — binding means editing `visualConceptRegistry.ts`, which is
 *   outside this lane's grant. CFPQ-FIGURES-1 binds from this mapping. A crop
 *   saved and mapped but unbound renders nothing and breaks nothing.
 *
 * De-duped against the whole bank: all 10 stems checked, 0 collisions.
 * WIRED — BANK-1 PR-2 added the import and the spread in `canonicalQuestionBank.ts`,
 *   together with `REALNUM_CFPQ_AUTHORED_SOLUTION_IDS` below. Until then these rows
 *   sat on trunk reaching no student and no gate: a runtime import of the assembled
 *   bank returned ZERO rows with this id prefix. Committed is not live.
 */

const REAL_NUMBERS_CFPQ_REF =
  "CBSE CFPQ Maths Class 10 Ch.1 — CFPQ_Maths10.pdf, questions pdf pp.5–7 (printed folios 4–6)";

const SET_DIAGRAM_DESC =
  "Two side-by-side box diagrams of the real number system, captioned 'Representation 1' and 'Representation 2', each headed 'Real numbers'. Representation 1 is a rectangle split into two adjoining regions: the left region is labelled 'Rational numbers' and holds three nested circles, 'Integers' containing 'Whole numbers' containing 'Natural numbers'; the right region is a separate compartment labelled 'Irrational numbers'. Representation 2 is a single rectangle holding five ellipses nested one inside the next, from the innermost outwards: 'Natural numbers', 'Whole numbers', 'Integers', 'Rational numbers', 'Irrational numbers'.";

export const REAL_NUMBERS_CFPQ: CanonicalQuestion[] = [
  // pdf-page 5 (folio 4) — Q1. Key: pdf-page 8 (folio 7), option 3.
  {
    id: "CFPQ-M-REALNUM-001",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Let p be a prime number and k be a positive integer.\n\nIf p divides k², then which of these is DEFINITELY divisible by p?\n\nk/2 | k | 7k | k³",
    options: ["only k", "only k and 7k", "only k, 7k and k³", "all - k/2, k, 7k and k³"],
    answer: "only k, 7k and k³",
    solutionSteps: [
      "[1 mark] Correct option: (3) only k, 7k and k³. Since p is prime and p divides k², p must itself divide k. Then 7k and k³ are multiples of k, so p divides both of them as well. k/2 need not even be an integer, so it is not definitely divisible by p.",
    ],
    finalAnswer: "only k, 7k and k³",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 5 (folio 4) — Q2. Key: pdf-page 8 (folio 7), option 2.
  {
    id: "CFPQ-M-REALNUM-002",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "√n is a natural number such that n > 1.\n\nWhich of these can DEFINITELY be expressed as a product of primes?\n\ni) √n\nii) n\niii) √n/2",
    options: [
      "only ii)",
      "only i) and ii)",
      "all - i), ii) and iii)",
      "(cannot be determined without knowing n)",
    ],
    answer: "only i) and ii)",
    solutionSteps: [
      "[1 mark] Correct option: (2) only i) and ii). √n is given to be a natural number and n > 1, so √n is at least 2 and n = (√n)² is a natural number greater than 1; by the Fundamental Theorem of Arithmetic each of them has a prime factorisation. √n/2 need not be an integer at all, so it cannot definitely be written as a product of primes.",
    ],
    finalAnswer: "only i) and ii)",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 5 (folio 4) — Q3. Key: pdf-page 8 (folio 7), option 3.
  {
    id: "CFPQ-M-REALNUM-003",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "HCF and LCM",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "The HCF of k and 93 is 31, where k is a natural number.\n\nWhich of these CAN be true for SOME VALUES of k?\n\ni) k is a multiple of 31.\nii) k is a multiple of 93.\niii) k is an even number.\niv) k is an odd number.",
    options: [
      "only ii) and iii)",
      "only i), ii) and iii)",
      "only i), iii) and iv)",
      "all - i), ii), iii) and iv)",
    ],
    answer: "only i), iii) and iv)",
    solutionSteps: [
      "[1 mark] Correct option: (3) only i), iii) and iv). HCF(k, 93) = 31 forces 31 to divide k, so i) must hold. If k were a multiple of 93 = 3 × 31 then the HCF would be 93, not 31, so ii) is impossible. k = 62 is even and k = 31 is odd, and each gives HCF 31 with 93, so iii) and iv) can each be true for some values of k.",
    ],
    finalAnswer: "only i), iii) and iv)",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 6 (folio 5) — Q5, margin [1]. Rubric: pdf-page 9 (folio 8), 1 mark.
  {
    id: "CFPQ-M-REALNUM-005",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Irrational Numbers",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Evaluating",
    questionText:
      "Two representations of real numbers are shown below.\n\nWhich one is correct?",
    answer: "Representation 1",
    solutionSteps: [
      "[1 mark] Writes that Representation 1 is correct. In Representation 1 the rational numbers and the irrational numbers are two separate regions that together make up the real numbers, with the natural numbers inside the whole numbers inside the integers inside the rationals. Representation 2 is wrong because it nests the rational numbers inside the irrational numbers, and no rational number is irrational.",
    ],
    finalAnswer: "Representation 1",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: SET_DIAGRAM_DESC,
  },
  // pdf-page 6 (folio 5) — Q7, margin [2]. Rubric: pdf-page 9 (folio 8), 1 + 1.
  {
    id: "CFPQ-M-REALNUM-007",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "HCF and LCM",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A dining hall has a length of 8.25 m, breadth of 6.75 m, and height of 4.50 m. What is the length of the longest unmarked ruler that can exactly measure the three dimensions of the hall? Show your steps and give valid reasons.",
    answer: "75 cm, that is 0.75 m",
    solutionSteps: [
      "[1 mark] Identifies and reasons that the length of the longest ruler should be equal to the HCF of the three lengths.",
      "[1 mark] Finds the HCF of the three numbers, working in centimetres: 825 = 3 × 5² × 11, 675 = 3³ × 5², 450 = 2 × 3² × 5², so the highest common factor is 3 × 5² = 75. Mentions the length of the longest ruler as 75 cm or 0.75 m. (The rubric awards 0.5 marks if the length is correct but the unit is incorrect.)",
    ],
    finalAnswer: "75 cm (0.75 m)",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 6 (folio 5) — Q8, margin [2]. Rubric: pdf-page 9 (folio 8), 1 + 0.5 + 0.5.
  {
    id: "CFPQ-M-REALNUM-008",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "HCF and LCM",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "GrowMore Plantations have two rectangular fields of the same width but different lengths. They are required to plant 84 trees in the smaller field and 231 trees in the larger field. In both fields, the trees will be planted in the same number of rows but in different numbers of columns.\n\ni) What is the most number of rows that can be planted in this arrangement? Show your work.\nii) If the trees are planted in the number of rows obtained in part (i), how many columns will each field have?",
    answer:
      "i) 21 rows. ii) 4 columns in the smaller field and 11 columns in the larger field.",
    solutionSteps: [
      "[1 mark] i) Identifies that the number of rows for the two fields must be the HCF of 84 and 231, and applies an appropriate method to find the HCF as 21.",
      "[0.5 mark] ii) Finds the number of columns in the smaller field as 84/21 = 4.",
      "[0.5 mark] Finds the number of columns in the larger field as 231/21 = 11.",
    ],
    finalAnswer: "21 rows; 4 columns in the smaller field and 11 in the larger field.",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 6 (folio 5) — Q9, margin [2]. Rubric: pdf-page 9 (folio 8), 1 + 1.
  {
    id: "CFPQ-M-REALNUM-009",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "HCF and LCM",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "M and N are positive integers such that M = p²q³r and N = p³q², where p, q, r are prime numbers.\n\nFind LCM(M, N) and HCF(M, N).",
    answer: "LCM(M, N) = p³q³r and HCF(M, N) = p²q²",
    solutionSteps: [
      "[1 mark] Finds LCM(M, N) as p³q³r, taking the highest power of each prime that occurs in either number.",
      "[1 mark] Finds HCF(M, N) as p²q², taking the lowest power of each prime common to both numbers.",
    ],
    finalAnswer: "LCM(M, N) = p³q³r; HCF(M, N) = p²q²",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 6 (folio 5) — Q10, margin [3]. Rubric: pdf-page 10 (folio 9), 0.5 + 0.5 + 1 + 1.
  {
    id: "CFPQ-M-REALNUM-010",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "HCF and LCM",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Find all pairs of positive integers whose sum is 91 and HCF is 13. Show your work.",
    answer: "13 and 78, 26 and 65, 39 and 52",
    solutionSteps: [
      "[0.5 mark] Assumes the pair of numbers to be x and y. Writes that, since HCF(x, y) = 13, x and y will be of the form x = 13p and y = 13q, where p and q are co-primes.",
      "[0.5 mark] Uses the given information and writes x + y = 91, so 13p + 13q = 91, which gives p + q = 7.",
      "[1 mark] Finds all possible values of p and q as 1 and 6, 2 and 5, 3 and 4.",
      "[1 mark] Finds all possible values of x and y as 13 and 78, 26 and 65, 39 and 52.",
    ],
    finalAnswer: "The pairs are 13 and 78, 26 and 65, and 39 and 52.",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 7 (folio 6) — Q13, margin [1]. Rubric: pdf-page 11 (folio 10), 0.5 + 0.5.
  {
    id: "CFPQ-M-REALNUM-013",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "(n² + 3n - 4) can be expressed as a product of only 2 prime factors where n is a natural number.\n\nFind the value(s) of n for which the given expression is an even composite number. Show your work and give valid reasons.",
    answer: "n = 3",
    solutionSteps: [
      "[0.5 mark] Factorises the given expression as (n - 1)(n + 4).",
      "[0.5 mark] Writes that, for the above to be an even composite number, one of the factors has to be 2 and hence (n - 1) = 2, giving n = 3.",
    ],
    finalAnswer: "n = 3",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
  // pdf-page 7 (folio 6) — Q14, margin [1]. Rubric: pdf-page 11 (folio 10), 1 mark.
  {
    id: "CFPQ-M-REALNUM-014",
    subject: "Maths",
    topicKey: "real-numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "The prime factorisation of a prime number is the number itself.\n\nHow many factors and prime factors does the square of a prime number have?",
    answer: "3 factors and 1 prime factor",
    solutionSteps: [
      "[1 mark] For the square of a prime number: number of factors = 3 and number of prime factors = 1. (The rubric awards 0.5 marks for each correct number.)",
    ],
    finalAnswer: "3 factors and 1 prime factor",
    isCompetencyBased: true,
    ncertRef: REAL_NUMBERS_CFPQ_REF,
  },
];

/**
 * THE DECOUPLE — provenance of every `solutionSteps` array above.
 *
 * ⚠ THIS ARRAY WAS MISSING UNTIL THE WIRING PR, AND ITS ABSENCE WAS A CLAIM.
 * The convention arrived with Chapter 2 (`polynomials.cfpq.ts`), so this chapter
 * shipped declaring nothing — which reads as "every step here is rubric-derived",
 * and that is false. Three rows carry reasoning this repo wrote.
 *
 * WHICH THREE, AND HOW THEY WERE IDENTIFIED — from PROVENANCE, not from format.
 * Every row above carries a source annotation, and the annotation is the
 * discriminator: a row citing `Key:` has only the official answer key, which on
 * folio 7 gives an option index and nothing else, so its reasoning had to be
 * authored. A row citing `Rubric:` is CBSE's own step-marking, transcribed.
 * Exactly three rows cite `Key:` — Q1, Q2 and Q3, the chapter's surviving MCQs.
 * (Q4, the fourth MCQ, is excluded on syllabus grounds; see the exclusions block.)
 *
 * ★ THE METHOD WAS VALIDATED BEFORE IT WAS TRUSTED. Chapter 2 carries the same
 * annotation AND declares its array explicitly. Applying this same `Key:` test to
 * Chapter 2 selects Q1 and Q2 — exactly the two rows its own DECOUPLE block names
 * as authored. A rule that predicts the declared answer where one exists is what
 * makes it usable here, where one did not.
 *
 * Chapter 1 needs three ids and not four. `POLY_CFPQ_AUTHORED_SOLUTION_IDS` holds
 * four because it covers TWO causes — its two MCQs, plus Q13 and Q14 whose rubric
 * route used polynomial long division and was replaced with an in-syllabus route.
 * This chapter has no authored-route rows: its Euclid questions were excluded
 * outright rather than re-routed, so `-004`, `-006`, `-011` and `-012` stay
 * reserved and unused.
 */
export const REALNUM_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-M-REALNUM-001",
  "CFPQ-M-REALNUM-002",
  "CFPQ-M-REALNUM-003",
];
