import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * polynomials — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Mathematics, Chapter 2.
 *
 * Source: CFPQ_Maths10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (39,567,003 bytes, 227 pages).
 *   Chapter 2 occupies pdf pages 12-26: the chapter title page on pdf page 12
 *   (printed folio 11), questions on pdf pages 13-19 (printed folios 12-18),
 *   the multiple-choice answer key on pdf page 20 (folio 19), and the
 *   step-marking rubrics on pdf pages 21-26 (folios 20-25).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — derived for this booklet
 *   in Chapter 1 by reading the printed folio off every page: 224 of 224
 *   folio-bearing pages give offset +1, with no discontinuity in the 227 pages.
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 2 MCQs (Q1-Q2) in the answer table on folio 19, and 15 rubric
 *             rows (3-17) across folios 20-25. 2 + 15 = 17 = the highest
 *             question number printed in the chapter. Contiguous, no gap, no
 *             repeat, no number in both tables. NO OFFSET.
 *   CONTENT — each pairing semantically locked, checked in both directions:
 *             rubric 4's "(x - √2)(x - 2√2)" only Q4's numerator; rubric 6's
 *             sum -5/2 and product -2 only Q6's 2x² + 5x - 4; rubric 9's
 *             "f(-2) = -14" and minimum -32 only Q9; rubric 10's "9-k/4 = -3/2"
 *             only Q10's (3 ± √k)/2; rubric 11's "7/2 units" only Q11. No
 *             rubric row read sensibly against any question but its own number.
 *   MARKS   — the [N] printed in each question's right margin against the
 *             rubric total, all 15 free-response rows:
 *               Q3 [2]=1+1 · Q4 [2]=1+1 · Q5 [1]=0.5+0.5 · Q6 [2]=0.5×4
 *               Q7 [3]=0.5+0.5+1+0.5+0.5 · Q8 [3]=0.5+0.5+1+1
 *               Q9 [5]=0.5+1+1.5+1+1 · Q10 [2]=1+0.5+0.5 · Q11 [2]=1+0.5+0.5
 *               Q12 [5]=0.5+2+0.5+0.5+0.5+1 · Q13 [3]=0.5+0.5+1+0.5+0.5
 *               Q14 [2]=1+0.5+0.5 · Q15 [1]=0.5+0.5 · Q16 [1]=1
 *               Q17 [2]=0.5+1+0.5
 *             15 of 15 agree.
 *   Result: NO OFFSET on any of the three checks. All three agree.
 *   Q1 and Q2 are MCQs: the booklet prints no margin [N] for the MCQ block and
 *   they have no rubric row, only an answer-table entry (Q1 -> option 1,
 *   Q2 -> option 1). They are recorded at `marks: 1`, the CBSE Section A value
 *   and the treatment the Science precedent gave its five MCQs — a convention
 *   applied, not a value read off the page.
 *
 * EXTRACTION METHOD: body text is vector curves; transcribed by eye from pages
 *   rendered at 200 dpi with pymupdf 1.27.2.3. No OCR. pdfplumber not used.
 *   The thin text layer was used ONLY to locate pages, never as a source — it
 *   substitutes U+019F for the "ti" ligature 59 times and is invisible to both
 *   a PUA scan and check:mojibake. See
 *   [FU-LIGATURE-SUBSTITUTION-INVISIBLE-TO-BOTH-SCANS] and the Chapter 1 header.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * NORMALISATION APPLIED — whitespace only. Words, numerals, symbols and option
 *   order are as printed.
 */

/**
 * ⛔ SYLLABUS EXCLUSIONS — 3 of the 17 questions are NOT in this array.
 *
 * ★ THE RULE, FROM THE OFFICIAL SOURCE, SO NO LATER CHAPTER RE-LITIGATES IT.
 *   CBSE Class X Mathematics syllabus 2026-27 (cbseacademic.nic.in,
 *   SecPart1/Maths_SecP1X_2026-27.pdf), Unit II ALGEBRA, POLYNOMIALS, verbatim:
 *
 *     1. Zeros of a polynomial
 *     2. Relationship between zeros and coefficients of quadratic polynomials.
 *
 *   "Zeros of a polynomial" is UNQUALIFIED. The word "quadratic" appears
 *   exactly once, and only on the zeros-coefficients RELATIONSHIP. The division
 *   algorithm is absent from the document entirely.
 *
 *   ⇒ CBSE restricted ONE THING, not cubics. A question is NOT out of syllabus
 *   merely because it involves a cubic: finding zeroes of a cubic graphically
 *   or by the factor theorem is "Zeros of a polynomial" and is RETAINED.
 *   `scripts/src/syllabusGuard.ts` agrees — its ban list names the CUBIC
 *   zeroes-coefficient RELATIONSHIP and the DIVISION ALGORITHM, never "any
 *   cubic". THE BAN LIST IS NARROWER THAN "ANY CUBIC". (Owner ruling,
 *   2026-09-08, from the official PDF.)
 *
 * ★ AND THE LINE THAT DECIDES EACH CASE:
 *     A DELETED METHOD IN A QUESTION'S STEM EXCLUDES THE QUESTION.
 *     A DELETED METHOD IN AN ILLUSTRATIVE "For example:" RUBRIC ROUTE DOES NOT
 *     — the question stays, its solution is authored by an in-syllabus route to
 *     CBSE's identical answer, and the row is registered in
 *     POLY_CFPQ_AUTHORED_SOLUTION_IDS below.
 *
 *   Q7  (pdf page 16, folio 15) — id `CFPQ-M-POLY-007` UNUSED.
 *       Banned topic: "Relationship Between Zeroes and Coefficients of Cubic
 *       Polynomials". The stem says "Using the relationship between the zeroes
 *       and coefficients of a polynomial" of the CUBIC x³ - 2x² - 9x + k, and
 *       its rubric (folio 20) works exactly that: "Assumes the values of zeroes
 *       of q(x) as (-α), α and β" then "Writes the sum of zeroes as
 *       -α + α + β = 2". CBSE's own words, on a cubic. Unambiguous.
 *
 *   Q12 (pdf page 18, folio 17) — id `CFPQ-M-POLY-012` UNUSED.
 *       Banned topic: "Division Algorithm for Polynomials". THE STEM IS the
 *       division-algorithm identity: "x⁴ + ax³ + bx² + 2x + 3 = (x² - 2) q(x)
 *       - 2x - 3", i.e. dividend = divisor × quotient + remainder. Excluded on
 *       the STEM, not on the rubric — which is why Q13 and Q14 are NOT excluded
 *       (see below). The rubric (folios 22-23) prints a full long-division
 *       tableau.
 *
 *   Q16 (pdf page 19, folio 18) — id `CFPQ-M-POLY-016` UNUSED.
 *       Banned topic: "Zeroes and Coefficients of Cubic Polynomials". The stem
 *       shows two CUBIC graphs sharing the zeroes (-1), 0 and 1 and asks which
 *       student is right; the rubric (folio 25) turns on the factored form of a
 *       cubic with those zeroes, "k(x + 1)(x - 0)(x - 1) where k is an integer"
 *       — the zeroes-to-coefficients correspondence for a cubic. Owner-ruled.
 *
 * ⚠ THE GUARD CANNOT SEE THESE EXCLUSIONS, SO ITS PASS IS NOT THE EVIDENCE.
 *   `syllabusGuard.ts` matches the `subtopic:` field as an EXACT, full-string
 *   comparison and has no view of a question's mathematics. All three excluded
 *   questions would have passed it under a subtopic like "Zeros & Factorisation",
 *   and every row below passes it whatever its stem says. The guard is run as a
 *   floor. These exclusions were made by reading each question against the
 *   syllabus text quoted above, and all three are corroborated by CBSE's own
 *   wording in the stem or the rubric.
 *
 * ⚠ QUESTIONS KEPT THAT INVOLVE A CUBIC: Q13, Q14, Q15. Their stems are the
 *   retained material — the factor theorem (Q13: "when f(x) is divided by
 *   (x + 1), there is no remainder"; the rubric's own first line writes this as
 *   "f(-1) = 0"), a given zero (Q14: "One zero of f(x) = x³ - 3x² + 4 is 2"),
 *   and the geometrical meaning of zeroes (Q15: identify the polynomial from
 *   its graph). None states the division-algorithm identity and none uses the
 *   cubic zeroes-coefficient relationship.
 */

/**
 * FIGURE CROPS — saved and mapped, DELIBERATELY NOT BOUND.
 *   Cropped from the same 200 dpi render pass, lossless WebP, each opened and
 *   eye-confirmed. All live under public/figures/cfpq-maths/polynomials/.
 *
 *   THE FIGURE IS THE QUESTION -> `requiresDiagram: true` + prose description:
 *     CFPQ-M-POLY-001.webp  pdf 13 (folio 12)  804x990  both curves labelled
 *       g(x) and h(x), roots at -2 and 2 marked, both vertices marked
 *     CFPQ-M-POLY-002.webp  pdf 14 (folio 13)  667x667  h(x) labelled, root at
 *       -2 marked, y-scale to -4
 *     CFPQ-M-POLY-003.webp  pdf 15 (folio 14)  684x694  gridded parabola,
 *       axes -5..5 and 10/5/-5 legible
 *     CFPQ-M-POLY-005.webp  pdf 16 (folio 15)  655x701  two polynomials, all
 *       three marked intersection points visible
 *     CFPQ-M-POLY-009.webp  pdf 17 (folio 16)  792x835  BOTH named labels
 *       legible — "Axis of symmetry" (dotted line + arrow) and "Vertex" — which
 *       the question asks about, so a crop missing them would be useless
 *     CFPQ-M-POLY-015.webp  pdf 18 (folio 17)  731x810  cubic graph, roots at
 *       -2 and 2 marked, axes -6..6 and 10..-2 legible
 *
 *   REFERENCE ONLY — the content is fully transcribed inline in the stem and the
 *   question is answerable without the image, so these rows do NOT set
 *   `requiresDiagram` (the Chapter 1 treatment of Q1's four-cell box):
 *     CFPQ-M-POLY-004.webp  pdf 15 (folio 14)  441x170  the displayed fraction
 *     CFPQ-M-POLY-010.webp  pdf 17 (folio 16)  659x116  the displayed zero form
 *
 *   No crop exists for Q16: that row is syllabus-excluded, so an asset for it
 *   would be an orphan. Eight assets, six of them bindable.
 *
 *   NOT BOUND — binding means editing `visualConceptRegistry.ts`, an existing
 *   file outside this lane's grant. CFPQ-FIGURES-1 binds from this mapping. A
 *   crop saved and mapped but unbound renders nothing and breaks nothing.
 *
 * De-duped against the whole bank: all 14 stems checked, 0 collisions.
 * WIRED — BANK-1 PR-2 added the import, the spread and the aggregation of
 *   `POLY_CFPQ_AUTHORED_SOLUTION_IDS` in `canonicalQuestionBank.ts`. Until then
 *   these rows sat on trunk reaching no student and no gate: a runtime import of
 *   the assembled bank returned ZERO rows with this id prefix. Committed is not live.
 */

const POLY_CFPQ_REF =
  "CBSE CFPQ Maths Class 10 Ch.2 — CFPQ_Maths10.pdf, questions pdf pp.13–19 (printed folios 12–18)";

const G_H_DESC =
  "Two upward parabolas drawn on the same axes, labelled g(x) (the darker curve) and h(x) (the lighter one). Both pass through the x-axis at exactly x = -2 and x = 2, where solid dots are marked. Both have their vertex on the y-axis below the origin, each marked with a dot; h(x)'s vertex lies noticeably lower than g(x)'s, so h(x) is the narrower, steeper curve. The x-axis is scaled -4, -2, 0, 2, 4.";

const H_ONLY_DESC =
  "A single upward parabola labelled h(x). It crosses the x-axis at x = -2, where a solid dot is marked, and its vertex sits at about y = -4. The x-axis is scaled -4, -3, -2, -1, 0, 1 and the y-axis 1, -1, -2, -3, -4. Only this part of the curve is shown; the second x-intercept is off the portion drawn.";

const GRID_PARABOLA_DESC =
  "An upward parabola drawn on a square grid with both axes shown. The x-axis is labelled -5, 0 and 5 and the y-axis 10, 5 and -5. The curve crosses the x-axis twice, once between -2 and -1 and once between 3 and 4, and its vertex lies below the x-axis at about y = -6.";

const TWO_POLY_DESC =
  "Two polynomials on the same axes: an upward parabola (darker) and a downward parabola (lighter). They intersect each other at two points, both marked with dots — one to the left of the y-axis above the x-axis, and one lying exactly ON the x-axis to the right of the origin. The downward curve's own maximum, on the y-axis, is also marked.";

const SYMMETRY_DESC =
  "An upward parabola with two x-intercepts marked by dots, one to the left of the y-axis and one to the right. A vertical dotted line runs through the lowest point of the curve; a leader arrow labels it 'Axis of symmetry'. A second leader arrow labels the lowest point of the curve 'Vertex'. The y-axis is drawn but not scaled.";

const CUBIC_GRAPH_DESC =
  "The graph of a cubic. Coming up from the bottom left it crosses the x-axis at x = -2 (marked with a dot), rises to a local maximum of about 9.5 just left of the y-axis, meets the y-axis at 8, falls to touch the x-axis at x = 2 (marked with a dot) without crossing it, and then rises steeply. The x-axis is scaled -6, -4, -2, 0, 2, 4, 6 and the y-axis 10, 8, 6, 4, 2, -2.";

export const POLYNOMIALS_CFPQ: CanonicalQuestion[] = [
  // pdf-page 13 (folio 12) — Q1. Key: pdf-page 20 (folio 19), option 1.
  {
    id: "CFPQ-M-POLY-001",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Graph & Type of Polynomial",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Shown below are the parts of graphs of two polynomials, g(x) and h(x). When h(x) is divided by (x - 3), the remainder is k.\n\nWhich of these is true for the remainder when g(x) is divided by (x - 3)?",
    options: ["It is less than k.", "It is equal to k.", "It is more than k.", "(cannot conclude without knowing the polynomials)"],
    answer: "It is less than k.",
    solutionSteps: [
      "[1 mark] Correct option: (1) It is less than k. By the remainder theorem the remainder on dividing by (x - 3) is the value of the polynomial at x = 3, so the two remainders are g(3) and h(3) = k. Both curves pass through the same two x-intercepts, -2 and 2, but h(x) is the narrower, steeper curve, so to the right of x = 2 it has already climbed above g(x). At x = 3 the h(x) curve is therefore higher, giving g(3) < h(3) = k.",
    ],
    finalAnswer: "It is less than k.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: G_H_DESC,
  },
  // pdf-page 14 (folio 13) — Q2. Key: pdf-page 20 (folio 19), option 1.
  {
    id: "CFPQ-M-POLY-002",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Shown below is a part of the graph of a polynomial h(x).\n\nOn dividing h(x) by which of the following will the remainder be zero?\n\ni) (x - 2)\nii) (x + 2)\niii) (x - 4)\niv) (x + 4)",
    options: ["only ii)", "only i) and iii)", "only ii) and iv)", "(cannot be determined without knowing the polynomial h(x))"],
    answer: "only ii)",
    solutionSteps: [
      "[1 mark] Correct option: (1) only ii). A division leaves remainder zero exactly when the divisor is a factor, i.e. when the corresponding value is a zero of h(x). The graph crosses the x-axis at x = -2, so (x + 2) is a factor. No zero is shown at x = 2, x = 4 or x = -4 on the part of the graph drawn, so none of i), iii) or iv) can be claimed.",
    ],
    finalAnswer: "only ii)",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: H_ONLY_DESC,
  },
  // pdf-page 15 (folio 14) — Q3, margin [2]. Rubric: pdf-page 21 (folio 20), 1 + 1.
  {
    id: "CFPQ-M-POLY-003",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Coefficient–root Relations",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Creating",
    questionText:
      "Write a quadratic polynomial whose sum of zeros is less than that of the polynomial shown in the graph above.",
    answer: "Any quadratic whose zeroes sum to less than 1 — for example x² + 3x - 5.",
    solutionSteps: [
      "[1 mark] Identifies the sum of the zeroes of the given polynomial as 3 - 2 = 1, reading the two x-intercepts off the graph.",
      "[1 mark] Writes a quadratic polynomial whose sum of zeroes is less than 1. For example, x² + 3x - 5 = 0.",
    ],
    finalAnswer: "For example x² + 3x - 5, whose zeroes sum to -3, which is less than 1.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: GRID_PARABOLA_DESC,
  },
  // pdf-page 15 (folio 14) — Q4, margin [2]. Rubric: pdf-page 21 (folio 20), 1 + 1.
  {
    id: "CFPQ-M-POLY-004",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "(x² - 3√2x + 4)/(x - √2) ; x ≠ √2\n\nAt how many points does the graph of the above expression intersect the x-axis? Show your work.",
    answer: "Exactly one point.",
    solutionSteps: [
      "[1 mark] Factorises the numerator to write the given expression as (x - √2)(x - 2√2)/(x - √2).",
      "[1 mark] Writes that the above expression simplifies to x - 2√2, whose graph intersects the x-axis at exactly one point.",
    ],
    finalAnswer: "Exactly one point — the expression simplifies to x - 2√2.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 16 (folio 15) — Q5, margin [1]. Rubric: pdf-page 21 (folio 20), 0.5 + 0.5.
  {
    id: "CFPQ-M-POLY-005",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Graph & Type of Polynomial",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two polynomials are shown in the graph below.\n\nFind the number of zeroes that are common to both the polynomials. Explain your answer.",
    answer: "1",
    solutionSteps: [
      "[0.5 mark] Finds the number of zeroes that are common to both the polynomials as 1.",
      "[0.5 mark] Explains the answer. For example, the two polynomials intersect at 2 points but only 1 of them lies on the x-axis, and a common zero requires a shared point that is on the x-axis.",
    ],
    finalAnswer: "1 common zero — the curves meet at two points but only one of those lies on the x-axis.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: TWO_POLY_DESC,
  },
  // pdf-page 16 (folio 15) — Q6, margin [2]. Rubric: pdf-page 21 (folio 20), 0.5 × 4.
  {
    id: "CFPQ-M-POLY-006",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Coefficient–root Relations",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "p and q are zeroes of the polynomial 2x² + 5x - 4.\n\nWithout finding the actual values of p and q, evaluate (1 - p)(1 - q). Show your steps.",
    answer: "3/2",
    solutionSteps: [
      "[0.5 mark] Expands (1 - p)(1 - q) to get 1 - (p + q) + pq.",
      "[0.5 mark] Finds the sum of the zeroes as -5/2.",
      "[0.5 mark] Finds the product of the zeroes as -4/2 = -2.",
      "[0.5 mark] Uses the above steps to find the value of (1 - p)(1 - q) as 1 - (-5/2) - 2 = 3/2.",
    ],
    finalAnswer: "(1 - p)(1 - q) = 3/2",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 16 (folio 15) — Q8, margin [3]. Rubric: pdf-page 22 (folio 21), 0.5 + 0.5 + 1 + 1.
  {
    id: "CFPQ-M-POLY-008",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Coefficient–root Relations",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "p(x) = ax² - 8x + 3, where a is a non-zero real number. One zero of p(x) is 3 times the other zero.\n\ni) Find the value of a. Show your work.\nii) What is the shape of the graph of p(x)? Give a reason for your answer.",
    answer: "i) a = 4. ii) An open upward parabola, because a is positive.",
    solutionSteps: [
      "[0.5 mark] i) Assumes the roots of p(x) to be α and β to write the relation α = 3β.",
      "[0.5 mark] Writes the sum of the roots as 4β = 8/a to get β as 2/a.",
      "[1 mark] Writes the product of the roots as 3β² = 3/a to get a as 4.",
      "[1 mark] ii) Writes that, since a is positive, the graph of p(x) is an open upward parabola, or opens upwards like a U.",
    ],
    finalAnswer: "a = 4; the graph is an open upward parabola because a > 0.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 17 (folio 16) — Q9, margin [5]. Rubric: pdf-page 22 (folio 21), 0.5 + 1 + 1.5 + 1 + 1.
  {
    id: "CFPQ-M-POLY-009",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "f(x) = 2x² - 4x + k, where k is a non-zero real number. When f(x) is divided by (x + 2), it leaves a remainder of (-14).\n\ni) Find the zeroes of f(x).\nii) Shown below is the graph of f(x). The vertex is the minimum value of f(x) and the dotted line drawn through the vertex is the axis of symmetry of the graph.\n\nAt what point does the axis of symmetry intersect the x-axis? Find the minimum value of f(x).\n\nShow your steps.",
    answer: "i) The zeroes are -3 and 5. ii) The axis of symmetry meets the x-axis at (1, 0), and the minimum value of f(x) is -32.",
    solutionSteps: [
      "[0.5 mark] i) Writes that, since the remainder of f(x)/(x + 2) is -14, therefore f(-2) = -14.",
      "[1 mark] Uses the above step to write the equation as 2(-2)² - 4(-2) + k = -14 and finds the value of k as -30.",
      "[1.5 marks] Factorises f(x) as (2x + 6)(x - 5) and finds the zeroes as -3 and 5.",
      "[1 mark] ii) Finds the point at which the axis of symmetry intersects the x-axis as the average of the two zeroes: (-3 + 5)/2 = 1.",
      "[1 mark] Finds the minimum value of f(x) as f(1) = 2(1)² - 4(1) - 30 = -32.",
    ],
    finalAnswer: "Zeroes -3 and 5; the axis of symmetry meets the x-axis at x = 1; the minimum value is -32.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: SYMMETRY_DESC,
  },
  // pdf-page 17 (folio 16) — Q10, margin [2]. Rubric: pdf-page 23 (folio 22), 1 + 0.5 + 0.5.
  {
    id: "CFPQ-M-POLY-010",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Coefficient–root Relations",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "p(x) = 2x² - 6x - 3. The two zeroes are of the form:\n\n(3 ± √k)/2 ; where k is a real number\n\nUse the relationship between the zeroes and coefficients of a polynomial to find the value of k. Show your steps.",
    answer: "k = 15",
    solutionSteps: [
      "[1 mark] Writes the equation for the product of zeroes as ((3 + √k)/2)((3 - √k)/2) = -3/2.",
      "[0.5 mark] Simplifies the above equation and writes (9 - k)/4 = -3/2.",
      "[0.5 mark] Solves the above equation and finds the value of k as 15.",
    ],
    finalAnswer: "k = 15",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 17 (folio 16) — Q11, margin [2]. Rubric: pdf-page 23 (folio 22), 1 + 0.5 + 0.5.
  {
    id: "CFPQ-M-POLY-011",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeroes by Factorisation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Find the distance between the zeroes of the polynomial f(x) = 2x² - x - 6. Show your steps.",
    answer: "7/2 units",
    solutionSteps: [
      "[1 mark] Factorises f(x) as (x - 2)(2x + 3).",
      "[0.5 mark] Writes f(x) = 0 and finds the coordinates of the zeroes as (2, 0) and (-3/2, 0). (The rubric awards full marks if only the zeroes of f(x) are written.)",
      "[0.5 mark] Finds the distance between the zeroes as 7/2 units.",
    ],
    finalAnswer: "7/2 units",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 18 (folio 17) — Q13, margin [3]. Rubric: pdf-page 24 (folio 23), 0.5+0.5+1+0.5+0.5.
  // ★ AUTHORED SOLUTION ROUTE — see POLY_CFPQ_AUTHORED_SOLUTION_IDS below.
  {
    id: "CFPQ-M-POLY-013",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "f(x) = x³ - ax² + (a - 3)x + 6, where a is a non-zero real number. When f(x) is divided by (x + 1), there is no remainder.\n\nIf f(x) is completely factorisable, find the zeroes of f(x). Show your steps.",
    answer: "The zeroes are -1, 2 and 3.",
    solutionSteps: [
      "[0.5 mark] Writes that, since f(x) is divisible by (x + 1), f(-1) = 0, and finds the value of a as 4.",
      "[0.5 mark] Uses the above step and writes f(x) as x³ - 4x² + x + 6.",
      "[1 mark] Since (x + 1) is a factor, writes f(x) = (x + 1)(x² + bx + c) and compares coefficients: b + 1 = -4 gives b = -5, and c = 6; the x-coefficient checks as c + b = 6 - 5 = 1. The quotient is therefore x² - 5x + 6.",
      "[0.5 mark] Factorises the quotient as (x - 2)(x - 3).",
      "[0.5 mark] Finds the zeroes of f(x) as (-1), 2 and 3.",
    ],
    finalAnswer: "a = 4 and the zeroes of f(x) are -1, 2 and 3.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 18 (folio 17) — Q14, margin [2]. Rubric: pdf-page 25 (folio 24), 1 + 0.5 + 0.5.
  // ★ AUTHORED SOLUTION ROUTE — see POLY_CFPQ_AUTHORED_SOLUTION_IDS below.
  {
    id: "CFPQ-M-POLY-014",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "One zero of f(x) = x³ - 3x² + 4 is 2.\n\nAt how many points will the graph of f(x) intersect the x-axis? Show your steps.",
    answer: "Two points.",
    solutionSteps: [
      "[1 mark] Since 2 is a zero, (x - 2) is a factor. Writes f(x) = (x - 2)(x² + bx + c) and compares coefficients: b - 2 = -3 gives b = -1, and -2c = 4 gives c = -2; the x-coefficient checks as c - 2b = -2 + 2 = 0. The quotient is therefore x² - x - 2.",
      "[0.5 mark] Factorises the quotient as (x - 2)(x + 1).",
      "[0.5 mark] Concludes from the above step that the graph of f(x) intersects the x-axis at two points, since f(x) = (x - 2)²(x + 1) has only the two distinct zeroes 2 and -1.",
    ],
    finalAnswer: "Two points — f(x) = (x - 2)²(x + 1), whose distinct zeroes are 2 and -1.",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
  // pdf-page 18 (folio 17) — Q15, margin [1]. Rubric: pdf-page 26 (folio 25), 0.5 + 0.5.
  {
    id: "CFPQ-M-POLY-015",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Graph & Type of Polynomial",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Students of a class were shown the graph below.\n\nBased on their answers, they were divided into two groups. Group 1 said the graph represented a quadratic polynomial whereas group 2 said the graph represented a cubic polynomial.\n\ni) Which group was correct?\nii) Write the polynomial represented by the graph.",
    answer: "i) Group 2. ii) (x - 2)²(x + 2)",
    solutionSteps: [
      "[0.5 mark] i) Writes that group 2 was correct.",
      "[0.5 mark] ii) Writes the polynomial represented by the graph as (x - 2)²(x + 2).",
    ],
    finalAnswer: "Group 2 was correct; the polynomial is (x - 2)²(x + 2).",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
    requiresDiagram: true,
    diagramDescription: CUBIC_GRAPH_DESC,
  },
  // pdf-page 19 (folio 18) — Q17, margin [2]. Rubric: pdf-page 26 (folio 25), 0.5 + 1 + 0.5.
  {
    id: "CFPQ-M-POLY-017",
    subject: "Maths",
    topicKey: "polynomials",
    subtopic: "Zeros & Factorisation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "p(x) = (x + 3)² - 2(x - c); where c is a constant.\n\nIf p(x) is divisible by x, find the value of c. Show your steps.",
    answer: "c = -9/2",
    solutionSteps: [
      "[0.5 mark] Writes the given polynomial as p(x) = x² + 9 + 4x + 2c.",
      "[1 mark] Writes that, if p(x) is divisible by x, p(0) = 0. (Equivalently: writes that the remainder of p(x)/x, which is 9 + 2c, should be 0.)",
      "[0.5 mark] Finds the value of c as -9/2.",
    ],
    finalAnswer: "c = -9/2",
    isCompetencyBased: true,
    ncertRef: POLY_CFPQ_REF,
  },
];

/**
 * THE DECOUPLE — provenance of every `solutionSteps` array above.
 *
 * Two MCQs (Q1, Q2) carry authored reasoning, because the official key on pdf
 * page 20 gives an option index and nothing else — the same situation, and the
 * same treatment, as the five MCQs in `electricity.cfpq.ts`.
 *
 * ★ AND TWO FREE-RESPONSE ROWS CARRY AN AUTHORED ROUTE, WHICH IS THE UNUSUAL
 *   PART AND IS RECORDED HERE RATHER THAN LEFT SILENT.
 *   For Q13 and Q14 the official rubric reaches the quotient by POLYNOMIAL LONG
 *   DIVISION, printing a full tableau in each case — a method deleted from the
 *   2026-27 syllabus (see the exclusions block above). In BOTH rubrics the
 *   tableau is introduced by the words "For example:", i.e. CBSE offers it as
 *   ONE route, not the required one, and the marks are awarded for the QUOTIENT
 *   and the ZEROES, not for the tableau. Q13's rubric in fact opens with the
 *   factor theorem itself — "since f(x) is divisible by (x + 1), f(-1) = 0".
 *
 *   So these two rows reproduce the stem, the marks and CBSE's final answers
 *   EXACTLY, and replace only the illustrative working with an in-syllabus
 *   route — comparing coefficients of (x + 1)(x² + bx + c), respectively
 *   (x - 2)(x² + bx + c). Both reach CBSE's identical quotient (x² - 5x + 6 and
 *   x² - x - 2) and identical zeroes ((-1), 2, 3; and two distinct
 *   intersections), each verified by the coefficient-consistency check shown in
 *   the steps. Marks land on the same milestones and sum to the same totals,
 *   3 and 2.
 *
 *   THE RULE THIS FOLLOWS: a deleted method in a question's STEM excludes the
 *   question (that is why Q12 is excluded); a deleted method in an illustrative
 *   "For example:" rubric route does not. Owner ruling, 2026-09-08.
 */
export const POLY_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-M-POLY-001",
  "CFPQ-M-POLY-002",
  "CFPQ-M-POLY-013",
  "CFPQ-M-POLY-014",
];
