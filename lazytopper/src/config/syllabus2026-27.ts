/**
 * CBSE Class X 2026-27 (exam 2027) SYLLABUS REFERENCE — the ONE source of truth for
 * IN / OUT / FORMATIVE / LIMIT per chapter, unit marks and paper typology
 * (SYLLABUS-FIX-CODE F1, owner ruling 6).
 *
 * ★ GENERATED FILE — REGENERATE, NEVER HAND-EDIT.
 *   Source:  Desktop/diff/syllabus-scout-1/syllabus-2026-27.json
 *            (SYLLABUS-SCOUT-1, built 2026-10-06)
 *   sha256:  a757f2ed8bbb927391e9fb718a3b168ee4ff255018a66d69ddafc24075169213
 *   PDFs (cbseacademic.nic.in, the authority every page number below cites):
 *   - https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf
 *     sha256 d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5 (10 pages, retrieved 2026-10-06)
 *   - https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf
 *     sha256 1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37 (9 pages, retrieved 2026-10-06)
 *   Generated: 2026-10-06 by the A16 PR-1 generator (scratch script, not committed).
 *   Owner rulings of 2026-10-05 are applied by the generator and each resolved item
 *   carries a `ruling` note; every other AMBIGUOUS item is left AMBIGUOUS.
 *   Owner ruling of 2026-10-06 (A16 PR-2, applied to the TYPED reference only — the
 *   verbatim SYLLABUS_2026_27_SOURCE is untouched): atmospheric refraction moved from
 *   AMBIGUOUS to IN (human-eye-and-colourful-world); the colour of the Sun at
 *   sunrise/sunset stays OUT.
 *   Owner rulings R1–R7 of 2026-10-06 (QUICK-FIXES-1 PR-2, typed reference only; the
 *   verbatim SOURCE is untouched): R1 irrationality (same-method named-prime proofs IN;
 *   general-prime statements OUT), R2 centroid OUT, R3 combinations of plane figures OUT
 *   (sector/segment + its defining triangle or square IN; inscribed measures IN), R4
 *   empirical relation IN, R5 rancidity OUT, R6 naming carboxylic acids OUT, R7 Motor/EMI/
 *   Generator FORMATIVE. Each carries a `ruling` note; R1–R3 cite the evidence-rule check
 *   (Desktop/diff/b17-qf-pr2-evidence.md). No item is left AMBIGUOUS.
 *
 * Pure data module: it imports NOTHING from the app (no new import edges).
 *
 * EXPORTS
 *   SYLLABUS_2026_27_SOURCE      verbatim scout JSON (drop-in for the transitional
 *                                SYLLABUS_2026_27_SCOUT_FIXTURE — same shape, same content)
 *   SYLLABUS_2026_27             typed reference with the owner rulings applied
 *   BOARD_CHAPTER_KEYS           the 26 board-assessed chapter keys (app topicKeys)
 *   isBoardChapterKey(key)       true only for one of the 26
 *   SCOUT_SLUG_TO_APP_KEY        scout slug -> app key (null = no board key)
 *   UNIT_MARKS / chapterUnit / unitMarks / chapterUnitMarks   unit-marks lookup
 *   SYLLABUS_OUT / SYLLABUS_FORMATIVE / SYLLABUS_LIMITS / SYLLABUS_AMBIGUOUS   flat lists per subject
 *   FORMATIVE_ONLY_TOPICS        topics the PDF names as assessed only formatively
 *   PAPER_DESIGN                 the PDFs' own paper typology, page-cited
 */

/* ------------------------------------------------------------------ types */

export type SyllabusSubject = "maths" | "science";
export type ChapterStatus = "BOARD" | "FORMATIVE" | "OUT";

export interface SyllabusInItem {
  readonly item: string;
  readonly page: number;
  readonly pageSpan?: string;
  readonly quote?: string;
  readonly ruling?: string;
}
export interface SyllabusOutItem {
  readonly item: string;
  readonly page: number;
  readonly basis: string;
  readonly quote?: string;
  readonly confidence?: string;
  readonly ruling?: string;
}
export interface SyllabusFormativeItem {
  readonly item: string;
  readonly page: number;
  readonly quote: string;
  readonly ruling?: string;
}
export interface SyllabusLimit {
  readonly rule: string;
  readonly page: number;
  readonly quote?: string;
}
export interface SyllabusAmbiguous {
  readonly item: string;
  readonly page: number;
  readonly quote?: string;
  readonly workingReading: string;
}
export interface SyllabusResolved extends SyllabusAmbiguous {
  readonly ruling: string;
}
export interface SyllabusChapter {
  readonly key: string;
  readonly subject: SyllabusSubject;
  readonly unit: string | null;
  readonly page: number;
  readonly status: ChapterStatus;
  readonly in: readonly SyllabusInItem[];
  readonly out: readonly SyllabusOutItem[];
  readonly formative: readonly SyllabusFormativeItem[];
  readonly limits: readonly SyllabusLimit[];
  readonly ambiguous: readonly SyllabusAmbiguous[];
  /** Items the scout marked AMBIGUOUS that an owner ruling resolved. */
  readonly resolved: readonly SyllabusResolved[];
  readonly basis?: string | null;
  readonly alsoAt?: { readonly page: number; readonly quote: string };
}
export interface SyllabusUnit {
  readonly unit: string;
  readonly name: string;
  readonly marks: number;
  readonly chapters: readonly string[];
  readonly page: number;
  readonly note?: string;
  readonly formativeChapters?: readonly string[];
  readonly formativeSections?: readonly string[];
}
export interface SyllabusSubjectReference {
  readonly totalMarks: number;
  readonly internalAssessment: number;
  readonly units: readonly SyllabusUnit[];
  readonly chapters: readonly SyllabusChapter[];
  readonly paperDesign: { readonly ruling: string } & Readonly<Record<string, unknown>>;
  readonly crossCutting?: readonly { readonly status: string; readonly item: string; readonly page: number; readonly quote: string }[];
}

/* ------------------------------------------------------- typed reference */

export const SYLLABUS_2026_27 = {
  "meta": {
    "title": "CBSE Class X 2026-27 (exam 2027) syllabus reference — SYLLABUS-SCOUT-1",
    "built": "2026-10-06",
    "builtBy": "SYLLABUS-SCOUT-1 (report-only)",
    "sourceFile": "Desktop/diff/syllabus-scout-1/syllabus-2026-27.json",
    "sourceSha256": "a757f2ed8bbb927391e9fb718a3b168ee4ff255018a66d69ddafc24075169213",
    "authority": [
      {
        "subject": "Mathematics (041 Standard & 241 Basic — one content list)",
        "url": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf",
        "sha256": "d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5",
        "pages": 10,
        "retrieved": "2026-10-06"
      },
      {
        "subject": "Science (086)",
        "url": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf",
        "sha256": "1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37",
        "pages": 9,
        "retrieved": "2026-10-06"
      }
    ],
    "statusVocabulary": {
      "IN": "named in the PDF content list — board-assessed",
      "OUT": "not named anywhere in the chapter's PDF content list (absence-based; the 'basis' says which page holds the full list it is absent from)",
      "FORMATIVE": "named by the PDF as 'assessed only formatively … without adding to summative assessments' — NOT in the year-end board exam; for a board-prep product this is OUT of practice/grading/recommendation",
      "LIMIT": "IN, but the PDF restricts its scope — content beyond the limit is OUT",
      "AMBIGUOUS": "PDF wording admits two readings; reported verbatim, scout's working reading stated, not used for high-confidence findings"
    },
    "notInThesePDFs": [
      "Per-CHAPTER marks: neither PDF gives marks per chapter, only per UNIT. Any 'marks per chapter' shown to students is a derivation, not CBSE's number.",
      "The '~50% competency-based / 20% MCQ / 30% SA+LA' split cited in CLAUDE.md §13 does not appear in either PDF. The Maths PDF gives a cognitive typology (p8-9); the Science PDF gives a competency split 50/30/20 (p9)."
    ],
    "rulings": {
      "r1": "Owner ruling 1 (2026-10-05): Pythagoras as a TOOL is IN (numeric use of a²+b²=c², e.g. tangent length, heights); proving or stating Pythagoras or its converse, or teaching it as a Class-X concept, is OUT.",
      "r2": "Owner ruling 2 (2026-10-05): melting/recasting (conversion of solids) is OUT.",
      "r3": "Owner ruling 3 (2026-10-05): lenses in contact (P = P1 + P2) is IN under 'Power of a lens'.",
      "r4": "Owner ruling 4 (2026-10-05): Heredity (Mendel, sex determination) is IN; Evolution is OUT of the board exam (FORMATIVE only).",
      "r5": "Owner ruling 5 (2026-10-05): any paper-share claim must cite the curriculum PDF's own typology (Maths p8 54/24/22; Science p9 50/30/20)."
    }
  },
  "maths": {
    "totalMarks": 80,
    "internalAssessment": 20,
    "units": [
      {
        "unit": "I",
        "name": "Number Systems",
        "marks": 6,
        "chapters": [
          "real-numbers"
        ],
        "page": 3
      },
      {
        "unit": "II",
        "name": "Algebra",
        "marks": 20,
        "chapters": [
          "polynomials",
          "pair-of-linear-equations",
          "quadratic-equations",
          "arithmetic-progression"
        ],
        "page": 3
      },
      {
        "unit": "III",
        "name": "Coordinate Geometry",
        "marks": 6,
        "chapters": [
          "coordinate-geometry"
        ],
        "page": 3
      },
      {
        "unit": "IV",
        "name": "Geometry",
        "marks": 15,
        "chapters": [
          "triangles",
          "circles"
        ],
        "page": 3
      },
      {
        "unit": "V",
        "name": "Trigonometry",
        "marks": 12,
        "chapters": [
          "trigonometry"
        ],
        "page": 3,
        "note": "Unit V = Introduction to Trigonometry + Trigonometric Identities + Heights and Distances (p6); the repo holds all three under one 'trigonometry' chapter"
      },
      {
        "unit": "VI",
        "name": "Mensuration",
        "marks": 10,
        "chapters": [
          "areas-related-to-circles",
          "surface-areas-and-volumes"
        ],
        "page": 3
      },
      {
        "unit": "VII",
        "name": "Statistics and Probability",
        "marks": 11,
        "chapters": [
          "statistics",
          "probability"
        ],
        "page": 3
      }
    ],
    "chapters": [
      {
        "key": "real-numbers",
        "subject": "maths",
        "unit": "I",
        "page": 3,
        "status": "BOARD",
        "in": [
          {
            "item": "Fundamental Theorem of Arithmetic — statements, illustrated through examples",
            "page": 3,
            "quote": "Fundamental Theorem of Arithmetic - statements after reviewing work done earlier and after illustrating and motivating through examples"
          },
          {
            "item": "Applying FTA to real-life problems (HCF/LCM by prime factorisation is the standard application)",
            "page": 3,
            "quote": "Applies Fundamental Theorem of Arithmetic to solve problems related to real life contexts."
          },
          {
            "item": "Proofs of irrationality of √2, √3, √5 and expressions built on them (e.g. 3 + 2√5)",
            "page": 3,
            "quote": "Proofs of irrationality of √2, √3, √5 … Prove algebraically the Irrationality of numbers like √2, √3, √5, 3 + 2√5 etc."
          },
          {
            "item": "Same-method irrationality proofs for the square root of a named prime (e.g. √7, √11) and expressions built from such surds (e.g. 6 − √7, 5 + 6√7)",
            "page": 3,
            "ruling": "Owner ruling R1, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): same-method irrationality proofs of the square root of a named prime (e.g. √7) and expressions built from such surds (e.g. 6 − √7, 5 + 6√7) are IN; √6 is IN only as a given surd inside such an expression proof (2024 board 30/5/1 Q26(b): prove (√2+√3)² irrational, given √6 irrational)."
          }
        ],
        "out": [
          {
            "item": "Euclid's division lemma / division algorithm (HCF by repeated division)",
            "page": 3,
            "basis": "absent from the full Real Numbers list on p3"
          },
          {
            "item": "Decimal expansions of rational numbers (terminating / non-terminating repeating; 2^m5^n denominator test)",
            "page": 3,
            "basis": "absent from the full Real Numbers list on p3"
          },
          {
            "item": "Irrationality statements or proofs for a general prime p and for composite surds (e.g. √p for any prime p, √p + √q, 'the square root of every prime is irrational', prove √15 irrational)",
            "page": 3,
            "basis": "the p3 list names √2, √3, √5 and expressions like 3 + 2√5; no 2024-26 board or SQP use of the general form",
            "ruling": "Owner ruling R1, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: general-prime statements or proofs (√p for any prime p, √p + √q, 'the square root of every prime is irrational') and from-scratch proofs for composite surds (e.g. √15) were not asked in any 2024-26 board text set or either SQP, so they are OUT."
          }
        ],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Irrationality proofs for surds other than √2, √3, √5 (e.g. √7, √11)",
            "page": 3,
            "quote": "numbers like √2, √3, √5, 3 + 2√5 etc.",
            "workingReading": "'like … etc.' admits same-method proofs for a named prime and expressions built from it (IN); general-prime statements and composite-surd proofs are OUT by the evidence rule.",
            "ruling": "Owner ruling R1, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): same-method irrationality proofs of the square root of a named prime (e.g. √7) and expressions built from such surds (e.g. 6 − √7, 5 + 6√7) are IN; √6 is IN only as a given surd inside such an expression proof (2024 board 30/5/1 Q26(b): prove (√2+√3)² irrational, given √6 irrational). Owner ruling R1, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: general-prime statements or proofs (√p for any prime p, √p + √q, 'the square root of every prime is irrational') and from-scratch proofs for composite surds (e.g. √15) were not asked in any 2024-26 board text set or either SQP, so they are OUT."
          }
        ]
      },
      {
        "key": "polynomials",
        "subject": "maths",
        "unit": "II",
        "page": 3,
        "status": "BOARD",
        "in": [
          {
            "item": "Zeros of a polynomial — graphically and algebraically",
            "page": 3,
            "quote": "Zeros of a polynomial … Find the zeros of polynomial graphically and algebraically"
          },
          {
            "item": "Relationship between zeros and coefficients of QUADRATIC polynomials (verify; form a quadratic from sum/product)",
            "page": 3,
            "quote": "Relationship between zeros and coefficients of quadratic polynomials."
          }
        ],
        "out": [
          {
            "item": "Zero–coefficient relationship for CUBIC polynomials (α+β+γ, αβ+βγ+γα, αβγ)",
            "page": 3,
            "basis": "p3 restricts the relationship to 'quadratic polynomials'"
          },
          {
            "item": "Division algorithm for polynomials (long division, finding remaining zeros by division)",
            "page": 3,
            "basis": "absent from the full Polynomials list on p3"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Zero–coefficient relationship: quadratic only",
            "page": 3
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "pair-of-linear-equations",
        "subject": "maths",
        "unit": "II",
        "page": 4,
        "status": "BOARD",
        "in": [
          {
            "item": "Graphical method; consistency / inconsistency",
            "page": 4,
            "quote": "Pair of linear equations in two variables and graphical method of their solution, consistency/inconsistency."
          },
          {
            "item": "Algebraic conditions for number of solutions (a1/a2 vs b1/b2 vs c1/c2)",
            "page": 4,
            "quote": "Algebraic conditions for number of solutions."
          },
          {
            "item": "Algebraic solution by substitution and by elimination",
            "page": 4,
            "quote": "Solution of a pair of linear equations in two variables algebraically - by substitution, by elimination."
          },
          {
            "item": "Simple situational problems",
            "page": 4,
            "quote": "Simple situational problems."
          }
        ],
        "out": [
          {
            "item": "Cross-multiplication method",
            "page": 4,
            "basis": "p4 names only 'by substitution, by elimination'"
          },
          {
            "item": "Equations reducible to a pair of linear equations (1/x, 1/y substitution etc.)",
            "page": 4,
            "basis": "absent from the full PLE list on p4"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Algebraic methods: substitution and elimination only; situational problems 'simple'",
            "page": 4
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "quadratic-equations",
        "subject": "maths",
        "unit": "II",
        "page": 4,
        "status": "BOARD",
        "in": [
          {
            "item": "Standard form ax²+bx+c=0, a≠0",
            "page": 4,
            "quote": "Standard form of a quadratic equation 𝑎𝑥2 + 𝑏𝑥+ 𝑐= 0, (𝑎≠0)."
          },
          {
            "item": "Solutions (only real roots) by factorisation and by the quadratic formula",
            "page": 4,
            "quote": "Solutions of quadratic equations (only real roots) by factorization, and by using quadratic formula."
          },
          {
            "item": "Discriminant and nature of roots",
            "page": 4,
            "quote": "Relationship between discriminant and nature of roots."
          },
          {
            "item": "Situational (day-to-day) problems",
            "page": 4,
            "quote": "Situational problems based on quadratic equations related to day-to-day activities to be incorporated"
          }
        ],
        "out": [
          {
            "item": "Solving by completing the square (as a method)",
            "page": 4,
            "basis": "p4 names only 'by factorization, and by using quadratic formula'"
          },
          {
            "item": "Finding complex/non-real roots",
            "page": 4,
            "basis": "p4 'only real roots' (deciding that NO real roots exist via D<0 is IN as nature of roots)"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Solution methods: factorisation and quadratic formula only; real roots only",
            "page": 4
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "arithmetic-progression",
        "subject": "maths",
        "unit": "II",
        "page": 4,
        "status": "BOARD",
        "in": [
          {
            "item": "Motivation for AP",
            "page": 4,
            "quote": "Motivation for studying Arithmetic Progression"
          },
          {
            "item": "Derivation of nth term and of sum of first n terms; application to daily-life problems",
            "page": 4,
            "quote": "Derivation of the nth term and sum of the first n terms of AP and their application in solving daily life problems."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "coordinate-geometry",
        "subject": "maths",
        "unit": "III",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Review of concepts of coordinate geometry",
            "page": 5,
            "quote": "Review: Concepts of coordinate geometry."
          },
          {
            "item": "Distance formula",
            "page": 5,
            "quote": "Distance formula."
          },
          {
            "item": "Section formula — internal division (mid-point is its special case)",
            "page": 5,
            "quote": "Section formula (internal division)."
          }
        ],
        "out": [
          {
            "item": "Area of a triangle from coordinates (and collinearity via zero area)",
            "page": 5,
            "basis": "absent from the full Coordinate Geometry list on p5"
          },
          {
            "item": "Section formula — external division",
            "page": 5,
            "basis": "p5 '(internal division)'"
          },
          {
            "item": "Centroid of a triangle from coordinates",
            "page": 5,
            "basis": "absent from the full Coordinate Geometry list on p5; no 2024-26 board or SQP use",
            "ruling": "Owner ruling R2, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: the centroid was not asked in any 2024-26 board text set or either SQP (medians were: 2025 30/1/3 Q25, SQP 2026-27 Q14), so it is OUT; Coordinate Geometry is distance + section formula (internal) only."
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Section formula: internal division only",
            "page": 5
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Centroid of a triangle from coordinates",
            "page": 5,
            "quote": "Section formula (internal division).",
            "workingReading": "derivable from the section formula but not named on p5 and not asked 2024-26; ruled OUT.",
            "ruling": "Owner ruling R2, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: the centroid was not asked in any 2024-26 board text set or either SQP (medians were: 2025 30/1/3 Q25, SQP 2026-27 Q14), so it is OUT; Coordinate Geometry is distance + section formula (internal) only."
          }
        ]
      },
      {
        "key": "triangles",
        "subject": "maths",
        "unit": "IV",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Definitions, examples, counter-examples of similar triangles",
            "page": 5,
            "quote": "Definitions, examples, counter examples of similar triangles."
          },
          {
            "item": "PROVE the Basic Proportionality Theorem",
            "page": 5,
            "quote": "(Prove) If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio."
          },
          {
            "item": "STATE (without proof) the converse of BPT",
            "page": 5,
            "quote": "State (without proof) If a line divides two sides of a triangle in the same ratio, the line is parallel to the third side."
          },
          {
            "item": "STATE (without proof) AAA similarity criterion",
            "page": 5,
            "quote": "State (without proof) If in two triangles, the corresponding angles are equal, their corresponding sides are proportional and the triangles are similar."
          },
          {
            "item": "STATE (without proof) SSS similarity criterion",
            "page": 5,
            "quote": "State (without proof) If the corresponding sides of two triangles are proportional, their corresponding angles are equal and the two triangles are similar."
          },
          {
            "item": "STATE (without proof) SAS similarity criterion",
            "page": 5,
            "quote": "State (without proof) If one angle of a triangle is equal to one angle of another triangle and the sides including these angles are proportional, the two triangles are similar."
          },
          {
            "item": "Apply BPT, its converse and the criteria in proofs and problems",
            "page": 5,
            "quote": "Prove Basic Proportionality theorem and applying the theorem and its converse in solving questions … Prove similarity of triangles using different similarity criteria"
          },
          {
            "item": "Using a²+b²=c² as a numeric TOOL (e.g. tangent length, heights and distances) — not as a Class-X theorem",
            "page": 5,
            "ruling": "Owner ruling 1 (2026-10-05): Pythagoras as a TOOL is IN (numeric use of a²+b²=c², e.g. tangent length, heights); proving or stating Pythagoras or its converse, or teaching it as a Class-X concept, is OUT."
          }
        ],
        "out": [
          {
            "item": "Ratio of areas of similar triangles (area theorem) and problems using it",
            "page": 5,
            "basis": "absent from the full Triangles list on p5"
          },
          {
            "item": "Pythagoras theorem and its converse (as Triangles content / proofs)",
            "page": 5,
            "basis": "absent from the full Triangles list on p5",
            "ruling": "Owner ruling 1 (2026-10-05): Pythagoras as a TOOL is IN (numeric use of a²+b²=c², e.g. tangent length, heights); proving or stating Pythagoras or its converse, or teaching it as a Class-X concept, is OUT."
          },
          {
            "item": "PROOFS of the converse of BPT, AAA, SSS, SAS criteria",
            "page": 5,
            "basis": "p5 says 'State (without proof)' for each — asking a student to prove them breaks the limit"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Only BPT is proved; converse BPT, AAA, SSS, SAS are stated without proof",
            "page": 5
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Using a²+b²=c² as an incidental tool (e.g. a right triangle in a height or distance computation)",
            "page": 5,
            "workingReading": "the Pythagoras THEOREM is not Class-X content, but the relation is prior knowledge (Class VII). Only rows that teach, prove or test the theorem or converse as a Triangles concept are findings.",
            "ruling": "Owner ruling 1 (2026-10-05): Pythagoras as a TOOL is IN (numeric use of a²+b²=c², e.g. tangent length, heights); proving or stating Pythagoras or its converse, or teaching it as a Class-X concept, is OUT."
          }
        ]
      },
      {
        "key": "circles",
        "subject": "maths",
        "unit": "IV",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Tangent to a circle at point of contact",
            "page": 6,
            "quote": "Tangent to a circle at point of contact."
          },
          {
            "item": "PROVE: tangent ⟂ radius at point of contact",
            "page": 6,
            "quote": "(Prove) The tangent at any point of a circle is perpendicular to the radius through the point of contact."
          },
          {
            "item": "PROVE: tangents from an external point are equal",
            "page": 6,
            "quote": "(Prove) The lengths of tangents drawn from an external point to a circle are equal."
          },
          {
            "item": "Apply tangents to various problems",
            "page": 6,
            "quote": "Applies the concept of tangents of circle to solve various problems."
          }
        ],
        "out": [
          {
            "item": "Constructions (division of a line segment, tangents to a circle, similar triangles) — the entire Constructions chapter",
            "page": 3,
            "basis": "no Constructions chapter in the Unit list p3-7"
          }
        ],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "trigonometry",
        "subject": "maths",
        "unit": "V",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Trigonometric ratios of an acute angle of a right triangle; proof of their existence (well defined)",
            "page": 6,
            "quote": "Trigonometric ratios of an acute angle of a right-angled triangle. Proof of their existence (well defined)"
          },
          {
            "item": "Ratios defined at 0° and 90°",
            "page": 6,
            "quote": "Motivate the ratios whichever are defined at 0° and 90°."
          },
          {
            "item": "Values at 30°, 45°, 60°",
            "page": 6,
            "quote": "Values of the trigonometric ratios of 30°, 45° and 60°."
          },
          {
            "item": "Relationships between the ratios (reciprocal, tan = sin/cos)",
            "page": 6,
            "quote": "Relationships between the ratios."
          },
          {
            "item": "Proof and applications of sin²A + cos²A = 1 (and the identities that follow from it); only simple identities",
            "page": 6,
            "quote": "Proof and applications of the identity sin2A + cos2A = 1. Only simple identities to be given. … Proves trigonometric identities using sin2A + cos2A = 1 and other identities"
          },
          {
            "item": "Heights and distances: angle of elevation / depression",
            "page": 6,
            "quote": "HEIGHTS AND DISTANCES: Angle of elevation, Angle of Depression."
          }
        ],
        "out": [
          {
            "item": "Trigonometric ratios of complementary angles (sin(90°−A) = cos A etc.) as a topic",
            "page": 6,
            "basis": "absent from the full Trigonometry list on p6; the syllabus names only acute-angle ratios, 0/90, 30/45/60, relationships, identities",
            "confidence": "high for 'complementary angles' as a NAMED technique — the guard (scripts/src/syllabusGuard.ts:79-81) already bans it; 'Relationships between the ratios' is read as reciprocal/quotient relations"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Identities: 'only simple identities to be given'",
            "page": 6
          },
          {
            "rule": "Heights & distances: at most TWO right triangles",
            "page": 6,
            "quote": "Problems should not involve more than two right triangles."
          },
          {
            "rule": "Heights & distances: angles of elevation/depression ONLY 30°, 45°, 60°",
            "page": 6,
            "quote": "Angles of elevation / depression should be only 30°, 45°, and 60°."
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "areas-related-to-circles",
        "subject": "maths",
        "unit": "VI",
        "page": 7,
        "status": "BOARD",
        "in": [
          {
            "item": "Area of sectors and segments of a circle",
            "page": 7,
            "quote": "Area of sectors and segments of a circle."
          },
          {
            "item": "Problems on areas and perimeter/circumference of those figures",
            "page": 7,
            "quote": "Problems based on areas and perimeter /circumference of the above said plane figures."
          },
          {
            "item": "Shaded regions made only of a sector or segment with the triangle or square that defines it, including a triangle or square minus the sectors at its vertices",
            "page": 7,
            "ruling": "Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: a shaded region made only of a sector or segment with the triangle or square that defines it is IN, including a triangle or square minus the sectors at its vertices (class c: 2024 board 30(B) Q25, SQP 2025-26 Q24(A), 2024 board 30/3/1 Q36(iii))."
          },
          {
            "item": "Measures of a circle inscribed in a square, or a square inscribed in a circle (no shaded region)",
            "page": 7,
            "ruling": "Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: measures of a circle inscribed in a square or a square inscribed in a circle, with no shaded region, are IN (class d: 2024 board 30/4/3 Q5; SQP 2025-26 Q7, visually-impaired alternative)."
          }
        ],
        "out": [
          {
            "item": "Areas of combinations of plane figures (circle parts with rectangles or other shapes, rings or annuli, a circle minus an inscribed square or triangle; the sector-or-segment exception is IN)",
            "page": 7,
            "basis": "p7 limits the chapter to sectors and segments ('the above said plane figures'); no 2024-26 board or SQP use",
            "ruling": "Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: areas of combinations of plane figures are OUT, including rings/annuli (class a: no 2024-26 Standard-paper or SQP item) and a circle minus an inscribed square or triangle (class b: none in the window; the nearest is the 2023 board 30/2/2 Q31)."
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "SEGMENT area: central angle 60°, 90°, 120° ONLY (sector area has no angle limit)",
            "page": 7,
            "quote": "(In calculating area of segment of a circle, problems should be restricted to central angle of 60°, 90° and 120° only."
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Areas of combinations of plane figures beyond sectors/segments (old NCERT 'combination' section)",
            "page": 7,
            "quote": "the above said plane figures",
            "workingReading": "'above said' = sectors and segments. Combinations of plane figures are OUT; a shaded region made only of a sector or segment with the triangle or square that defines it (incl. vertex sectors) and plain inscribed circle/square measures are IN.",
            "ruling": "Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: areas of combinations of plane figures are OUT, including rings/annuli (class a: no 2024-26 Standard-paper or SQP item) and a circle minus an inscribed square or triangle (class b: none in the window; the nearest is the 2023 board 30/2/2 Q31). Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: a shaded region made only of a sector or segment with the triangle or square that defines it is IN, including a triangle or square minus the sectors at its vertices (class c: 2024 board 30(B) Q25, SQP 2025-26 Q24(A), 2024 board 30/3/1 Q36(iii)). Owner ruling R3, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2), by the evidence rule: IN only if asked in a 2024-2026 CBSE board paper or the 2025-26/2026-27 SQP; evidence Desktop/diff/b17-qf-pr2-evidence.md: measures of a circle inscribed in a square or a square inscribed in a circle, with no shaded region, are IN (class d: 2024 board 30/4/3 Q5; SQP 2025-26 Q7, visually-impaired alternative)."
          }
        ]
      },
      {
        "key": "surface-areas-and-volumes",
        "subject": "maths",
        "unit": "VI",
        "page": 7,
        "status": "BOARD",
        "in": [
          {
            "item": "Surface areas and volumes of combinations of ANY TWO of: cubes, cuboids, spheres, hemispheres, right circular cylinders/cones",
            "page": 7,
            "quote": "Surface areas and volumes of combinations of any two of the following: cubes, cuboids, spheres, hemispheres and right circular cylinders/cones."
          }
        ],
        "out": [
          {
            "item": "Frustum of a cone",
            "page": 7,
            "basis": "not among the six solids listed on p7"
          },
          {
            "item": "Conversion of one solid into another (melting/recasting) as a topic",
            "page": 7,
            "basis": "absent from the full SAV list on p7",
            "confidence": "medium — guard bans it; a recasting row still only uses the volumes of listed solids",
            "ruling": "Owner ruling 2 (2026-10-05): melting/recasting (conversion of solids) is OUT."
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Combinations of at most TWO solids",
            "page": 7
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "statistics",
        "subject": "maths",
        "unit": "VII",
        "page": 7,
        "status": "BOARD",
        "in": [
          {
            "item": "Mean of grouped data — direct, assumed-mean and step-deviation methods",
            "page": 7,
            "quote": "Computes the mean, of a grouped frequency distribution using direct, assumed mean and step deviation method."
          },
          {
            "item": "Median and mode of grouped data (algebraic method)",
            "page": 7,
            "quote": "Computes the median and mode of grouped frequency distribution by algebraic method"
          },
          {
            "item": "Empirical relation 3 Median = Mode + 2 Mean, used as a tool",
            "page": 7,
            "ruling": "Owner ruling R4, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): the empirical relation 3 Median = Mode + 2 Mean is IN, used as a tool (NCERT-retained remark); encode only."
          }
        ],
        "out": [
          {
            "item": "Graphical representation of cumulative frequency (ogive; median from ogive)",
            "page": 7,
            "basis": "p7 says 'by algebraic method'; ogive absent from the list"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Bimodal situations to be avoided",
            "page": 7,
            "quote": "Mean, median and mode of grouped data (bimodal situation to be avoided)."
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Empirical relation 3 Median = Mode + 2 Mean",
            "page": 7,
            "workingReading": "not named on p7, but it is a tool for the named median/mode/mean of grouped data; ruled IN (as a tool).",
            "ruling": "Owner ruling R4, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): the empirical relation 3 Median = Mode + 2 Mean is IN, used as a tool (NCERT-retained remark); encode only."
          }
        ]
      },
      {
        "key": "probability",
        "subject": "maths",
        "unit": "VII",
        "page": 7,
        "status": "BOARD",
        "in": [
          {
            "item": "Classical definition of probability",
            "page": 7,
            "quote": "Classical definition of probability."
          },
          {
            "item": "Simple problems on the probability of an event",
            "page": 7,
            "quote": "Simple problems on finding the probability of an event."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [
          {
            "rule": "'Simple problems' only",
            "page": 7
          }
        ],
        "ambiguous": [],
        "resolved": []
      }
    ],
    "paperDesign": {
      "standard041": {
        "page": 8,
        "rememberingUnderstanding": {
          "marks": 43,
          "pct": 54
        },
        "applying": {
          "marks": 19,
          "pct": 24
        },
        "analysingEvaluatingCreating": {
          "marks": 18,
          "pct": 22
        }
      },
      "basic241": {
        "page": 9,
        "rememberingUnderstanding": {
          "marks": 60,
          "pct": 75
        },
        "applying": {
          "marks": 12,
          "pct": 15
        },
        "analysingEvaluatingCreating": {
          "marks": 8,
          "pct": 10
        }
      },
      "ruling": "Owner ruling 5 (2026-10-05): any paper-share claim must cite the curriculum PDF's own typology (Maths p8 54/24/22; Science p9 50/30/20)."
    }
  },
  "science": {
    "totalMarks": 80,
    "internalAssessment": 20,
    "units": [
      {
        "unit": "I",
        "name": "Chemical Substances – Nature and Behaviour",
        "marks": 25,
        "chapters": [
          "chemical-reactions-and-equations",
          "acids-bases-and-salts",
          "metals-and-non-metals",
          "carbon-and-its-compounds"
        ],
        "page": 4,
        "formativeChapters": [
          "periodic-classification-of-elements"
        ]
      },
      {
        "unit": "II",
        "name": "World of Living",
        "marks": 25,
        "chapters": [
          "life-processes",
          "control-and-coordination",
          "how-do-organisms-reproduce",
          "heredity"
        ],
        "page": 4,
        "formativeSections": [
          "Evolution"
        ]
      },
      {
        "unit": "III",
        "name": "Natural Phenomena",
        "marks": 12,
        "chapters": [
          "light-reflection-and-refraction",
          "human-eye-and-colourful-world"
        ],
        "page": 4
      },
      {
        "unit": "IV",
        "name": "Effects of Current",
        "marks": 13,
        "chapters": [
          "electricity",
          "magnetic-effects-of-electric-current"
        ],
        "page": 4,
        "formativeSections": [
          "Motor",
          "Electromagnetic Induction",
          "Electric Generator"
        ]
      },
      {
        "unit": "V",
        "name": "Natural Resources",
        "marks": 5,
        "chapters": [
          "our-environment"
        ],
        "page": 4
      }
    ],
    "chapters": [
      {
        "key": "chemical-reactions-and-equations",
        "subject": "science",
        "unit": "I",
        "page": 4,
        "status": "BOARD",
        "in": [
          {
            "item": "Chemical reactions, equations, balancing; types: combination, decomposition, displacement, double displacement, precipitation, endothermic/exothermic, oxidation and reduction",
            "page": 4,
            "quote": "Chemical reactions, Chemical equation, Balanced chemical equation, types of chemical reactions: combination, decomposition, displacement, double displacement, precipitation, endothermic exothermic reactions, oxidation and reduction."
          }
        ],
        "out": [
          {
            "item": "Rancidity (oxidation of fats and oils in food, and its prevention by antioxidants or nitrogen flushing)",
            "page": 4,
            "basis": "absent from the full Chemical Reactions list on p4",
            "ruling": "Owner ruling R5, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): rancidity is OUT (absent from the p4 Chemical Reactions content list); corrosion and its prevention stay IN under Metals and Non-metals (p5)."
          }
        ],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Rancidity (NCERT ch.1 'effects of oxidation in everyday life')",
            "page": 4,
            "workingReading": "not named on p4; corrosion IS named under Metals (p5). Ruled OUT; corrosion stays IN.",
            "ruling": "Owner ruling R5, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): rancidity is OUT (absent from the p4 Chemical Reactions content list); corrosion and its prevention stay IN under Metals and Non-metals (p5)."
          }
        ]
      },
      {
        "key": "periodic-classification-of-elements",
        "subject": "science",
        "unit": "I",
        "page": 4,
        "status": "FORMATIVE",
        "in": [],
        "out": [],
        "formative": [
          {
            "item": "Döbereiner's Triads, Newlands' Law of Octaves, Mendeléev's Periodic Table, Modern Periodic Table, trends (metallic/non-metallic properties)",
            "page": 4,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Periodic Classification of Elements: Döbereiner's Triads, Newlands' Law of Octaves, Mendeléev's Periodic Table, Modern Periodic Table and the Modern, Metallic and Non-metallic Properties."
          }
        ],
        "limits": [],
        "ambiguous": [],
        "resolved": [],
        "basis": null,
        "alsoAt": {
          "page": 6,
          "quote": "The topics Periodic Classification of Elements; … will not be assessed in the year-end examination."
        }
      },
      {
        "key": "acids-bases-and-salts",
        "subject": "science",
        "unit": "I",
        "page": 4,
        "status": "BOARD",
        "in": [
          {
            "item": "Acids/bases (H+/OH−), indicators, chemical properties, examples, uses, neutralisation, pH scale, importance of pH; preparation and uses of NaOH, bleaching powder, baking soda, washing soda, Plaster of Paris",
            "page": 4,
            "pageSpan": "4-5",
            "quote": "Acids and Bases – definitions in terms of furnishing of H+ and OH– ions, identification using indicators, chemical properties, examples and uses, neutralization, concept of pH scale (Definition relating to logarithm not required), importance of pH in everyday life; preparation and uses of Sodium Hydroxide, Bleaching Powder, Baking soda, Washing soda and Plaster of Paris."
          }
        ],
        "out": [
          {
            "item": "pH defined via logarithm (pH = −log[H+]) and log-based pH computations",
            "page": 4,
            "basis": "p4 '(Definition relating to logarithm not required)'"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "pH: no logarithmic definition",
            "page": 4
          }
        ],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "metals-and-non-metals",
        "subject": "science",
        "unit": "I",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Properties of metals and non-metals; reactivity series; ionic compounds (formation, properties); basic metallurgical processes; corrosion and prevention",
            "page": 5,
            "quote": "Properties of metals and non-metals; Reactivity series; Formation and properties of ionic compounds; Basic metallurgical processes; Corrosion and its prevention."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "carbon-and-its-compounds",
        "subject": "science",
        "unit": "I",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Covalent bonds; versatile nature of carbon; saturated/unsaturated hydrocarbons; homologous series; nomenclature (alkanes, alkenes, alkynes, halogens, alcohol, ketones, aldehydes); combustion, oxidation, addition, substitution; ethanol and ethanoic acid (only properties and uses); soaps and detergents",
            "page": 5,
            "quote": "Covalent bonds – formation and properties of covalent compounds, Versatile nature of carbon, Hydrocarbons – saturated and unsaturated Homologous series. Nomenclature of alkanes, alkenes, alkyne and carbon compounds containing functional groups (halogens, alcohol, ketones, aldehydes). Chemical properties of carbon compounds (combustion, oxidation, addition and substitution reaction). Ethanol and Ethanoic acid (only properties and uses), soaps and detergents."
          },
          {
            "item": "Identifying the -COOH (carboxylic acid) functional group, and natural acids such as methanoic acid in an ant sting",
            "page": 5,
            "ruling": "Owner ruling R6, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): naming carboxylic acids is OUT (the p5 nomenclature list names halogens, alcohol, ketones, aldehydes only); identifying the -COOH group and natural acids (e.g. methanoic acid in an ant sting) is IN; ethanoic acid's properties and uses stay IN."
          }
        ],
        "out": [
          {
            "item": "Nomenclature of carboxylic acids (naming an acid by the -oic acid suffix, e.g. propanoic or butanoic acid)",
            "page": 5,
            "basis": "the p5 nomenclature list names halogens, alcohol, ketones, aldehydes, not carboxylic acids",
            "ruling": "Owner ruling R6, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): naming carboxylic acids is OUT (the p5 nomenclature list names halogens, alcohol, ketones, aldehydes only); identifying the -COOH group and natural acids (e.g. methanoic acid in an ant sting) is IN; ethanoic acid's properties and uses stay IN."
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Ethanol and ethanoic acid: only properties and uses",
            "page": 5
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Carboxylic-acid functional-group nomenclature",
            "page": 5,
            "workingReading": "the nomenclature list names halogens, alcohol, ketones, aldehydes but not carboxylic acids. Ruled OUT for naming; identifying the -COOH group, natural acids and ethanoic acid's properties and uses stay IN.",
            "ruling": "Owner ruling R6, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): naming carboxylic acids is OUT (the p5 nomenclature list names halogens, alcohol, ketones, aldehydes only); identifying the -COOH group and natural acids (e.g. methanoic acid in an ant sting) is IN; ethanoic acid's properties and uses stay IN."
          }
        ]
      },
      {
        "key": "life-processes",
        "subject": "science",
        "unit": "II",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "'Living being'; nutrition, respiration, transport, excretion in plants and animals",
            "page": 5,
            "quote": "Life processes: 'Living Being'. Basic concept of nutrition, respiration, transport and excretion in plants and animals."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "control-and-coordination",
        "subject": "science",
        "unit": "II",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Tropic movements; plant hormones (intro); nervous system; voluntary, involuntary, reflex action; animal hormones",
            "page": 5,
            "quote": "Tropic movements in plants; Introduction of plant hormones; Control and co-ordination in animals: Nervous system; Voluntary, involuntary and reflex action; Chemical co-ordination: animal hormones."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "how-do-organisms-reproduce",
        "subject": "science",
        "unit": "II",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Asexual and sexual reproduction in animals and plants; reproductive health, family planning, safe sex vs HIV/AIDS, child bearing and women's health",
            "page": 5,
            "quote": "Reproduction in animals and plants (asexual and sexual) reproductive health - need and methods of family planning. Safe sex vs HIV/AIDS. Child bearing and women's health."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "heredity",
        "subject": "science",
        "unit": "II",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Heredity; Mendel's contribution — laws for inheritance of traits; sex determination (brief introduction)",
            "page": 5,
            "quote": "Heredity: Heredity; Mendel's contribution- Laws for inheritance of traits: Sex determination; brief introduction.",
            "ruling": "Owner ruling 4 (2026-10-05): Heredity (Mendel, sex determination) is IN; Evolution is OUT of the board exam (FORMATIVE only)."
          }
        ],
        "out": [],
        "formative": [
          {
            "item": "Evolution: acquired and inherited traits, speciation, evolution and classification, tracing evolutionary relationships, fossils, evolution by stages, human evolution",
            "page": 5,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Evolution: Acquired and Inherited Traits, Speciation, Evolution and Classification, Tracing Evolutionary Relationships, Fossils, Evolution by Stages, Human Evolution",
            "ruling": "Owner ruling 4 (2026-10-05): Heredity (Mendel, sex determination) is IN; Evolution is OUT of the board exam (FORMATIVE only)."
          }
        ],
        "limits": [
          {
            "rule": "Sex determination: brief introduction",
            "page": 5
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Note for Teachers lists 'Heredity and Evolution' as not assessed, while Unit II lists Heredity content as assessed",
            "page": 6,
            "quote": "1. The topics Periodic Classification of Elements; Heredity and Evolution; and Electric Effects of Electric Current will not be assessed in the year-end   examination.",
            "workingReading": "Unit II (p5) puts Heredity in the assessed body and only Evolution under the formative-only paragraph. Working reading: Heredity IN, Evolution FORMATIVE (as the spec directs). The Note is read as naming the NCERT chapter 'Heredity and Evolution' loosely.",
            "ruling": "Owner ruling 4 (2026-10-05): Heredity (Mendel, sex determination) is IN; Evolution is OUT of the board exam (FORMATIVE only)."
          }
        ]
      },
      {
        "key": "light-reflection-and-refraction",
        "subject": "science",
        "unit": "III",
        "page": 5,
        "status": "BOARD",
        "in": [
          {
            "item": "Reflection by curved surfaces; images by spherical mirrors; centre of curvature, principal axis, principal focus, focal length; mirror formula; magnification",
            "page": 5,
            "quote": "Reflection of light by curved surfaces; Images formed by spherical mirrors, centre of curvature, principal axis, principal focus, focal length, mirror formula (Derivation not required), magnification."
          },
          {
            "item": "Refraction; laws of refraction; refractive index",
            "page": 5,
            "quote": "Refraction; Laws of refraction, refractive index."
          },
          {
            "item": "Refraction by spherical lenses; images; lens formula; magnification; power of a lens",
            "page": 5,
            "quote": "Refraction of light by spherical lens; Image formed by spherical lenses; Lens formula (Derivation not required); Magnification. Power of a lens."
          },
          {
            "item": "Net power of lenses in contact, P = P1 + P2 (under 'Power of a lens')",
            "page": 5,
            "quote": "Power of a lens.",
            "ruling": "Owner ruling 3 (2026-10-05): lenses in contact (P = P1 + P2) is IN under 'Power of a lens'."
          }
        ],
        "out": [
          {
            "item": "Derivation of the mirror formula or lens formula",
            "page": 5,
            "basis": "p5 '(Derivation not required)' — twice"
          },
          {
            "item": "Beyond-Class-X optics: critical angle/TIR, lens-maker's formula, prism formula/minimum deviation, refraction at a single spherical surface, two-lens / mirror IMAGING systems (image of one element as the object of the next), inclined-mirror image counts, apparent depth computations",
            "page": 5,
            "basis": "absent from the full Unit III list on p5-6 (the repo already withholds many of these — canonicalQuestionBank.ts:1167-1205)"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Mirror and lens formula: use, no derivation",
            "page": 5
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Net power of lenses in contact, P = P1 + P2",
            "page": 5,
            "quote": "Power of a lens.",
            "workingReading": "REVISED 2026-10-06 after the bank-science sub-scout flagged CBSE's own SQP/competency items testing it: treated as IN under 'Power of a lens' (it sits in NCERT's power-of-a-lens section). Only sequential two-lens IMAGING is OUT. NOT a finding.",
            "ruling": "Owner ruling 3 (2026-10-05): lenses in contact (P = P1 + P2) is IN under 'Power of a lens'."
          }
        ]
      },
      {
        "key": "human-eye-and-colourful-world",
        "subject": "science",
        "unit": "III",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Functioning of the lens in the human eye; defects of vision and corrections; applications of spherical mirrors and lenses",
            "page": 6,
            "quote": "Functioning of a lens in human eye, defects of vision and their corrections, applications of spherical mirrors and lenses."
          },
          {
            "item": "Refraction through a prism; dispersion; scattering of light; daily-life applications",
            "page": 6,
            "quote": "Refraction of light through a prism, dispersion of light, scattering of light, applications in daily life (excluding colour of the sun at sunrise and sunset)."
          },
          {
            "item": "Atmospheric refraction (twinkling of stars, advance sunrise/delayed sunset) — kept; NOT the excluded colour of the Sun at sunrise/sunset",
            "page": 6,
            "ruling": "Owner ruling 2026-10-06: atmospheric refraction (twinkling, advance sunrise) kept, since it isn't the excluded 'colour of the Sun at sunrise/sunset'."
          }
        ],
        "out": [
          {
            "item": "Colour of the Sun at sunrise and sunset (reddening explained by scattering)",
            "page": 6,
            "basis": "p6 explicit exclusion",
            "quote": "(excluding colour of the sun at sunrise and sunset)"
          }
        ],
        "formative": [],
        "limits": [
          {
            "rule": "Scattering applications exclude the colour of the Sun at sunrise/sunset",
            "page": 6
          }
        ],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Atmospheric refraction (twinkling of stars, advance sunrise/delayed sunset)",
            "page": 6,
            "workingReading": "not named on p6 (only prism, dispersion, scattering, daily-life applications); reported, NOT a finding",
            "ruling": "Owner ruling 2026-10-06: atmospheric refraction (twinkling, advance sunrise) kept, since it isn't the excluded 'colour of the Sun at sunrise/sunset'."
          }
        ]
      },
      {
        "key": "electricity",
        "subject": "science",
        "unit": "IV",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Current, potential difference; Ohm's law; resistance, resistivity, factors; series and parallel; heating effect and applications; electric power; P–V–I–R",
            "page": 6,
            "quote": "Electric current, potential difference and electric current. Ohm's law; Resistance, Resistivity, Factors on which the resistance of a conductor depends. Series combination of resistors, parallel combination of resistors and its applications in daily life. Heating effect of electric current and its applications in daily life. Electric power, Interrelation between P, V, I and R."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "magnetic-effects-of-electric-current",
        "subject": "science",
        "unit": "IV",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Magnetic field and field lines; field due to straight conductor, coil, solenoid; force on current-carrying conductor; Fleming's LEFT-hand rule; direct current; alternating current and its frequency; advantage of AC over DC; domestic electric circuits",
            "page": 6,
            "quote": "Magnetic effects of current: Magnetic field, field lines, field due to a current carrying conductor, field due to current carrying coil or solenoid; Force on current carrying conductor, Fleming's Left Hand Rule, Direct current. Alternating current: frequency of AC. Advantage of AC over DC. Domestic electric circuits."
          }
        ],
        "out": [],
        "formative": [
          {
            "item": "Electric motor; electromagnetic induction (incl. Fleming's right-hand rule, galvanometer deflection by a moving magnet); electric generator",
            "page": 6,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Motor, Electromagnetic Induction, Electric Generator",
            "ruling": "Owner ruling R7, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): the p6 Note's 'Electric Effects of Electric Current' is read as Magnetic Effects: Motor, EMI, Generator, which are FORMATIVE only (as already applied)."
          }
        ],
        "limits": [],
        "ambiguous": [],
        "resolved": [
          {
            "item": "Note for Teachers names 'Electric Effects of Electric Current' as not assessed",
            "page": 6,
            "quote": "1. The topics Periodic Classification of Elements; Heredity and Evolution; and Electric Effects of Electric Current will not be assessed in the year-end   examination.",
            "workingReading": "no chapter is called that. Unit IV (p6) lists electricity and magnetic-effects content as assessed and puts only Motor/EMI/Generator under the formative paragraph. The Note means the formative Motor/EMI/Generator block. NOT used to mark Electricity or Magnetic Effects OUT.",
            "ruling": "Owner ruling R7, owner ruling 2026-10-06 (QUICK-FIXES-1 PR-2): the p6 Note's 'Electric Effects of Electric Current' is read as Magnetic Effects: Motor, EMI, Generator, which are FORMATIVE only (as already applied)."
          }
        ]
      },
      {
        "key": "our-environment",
        "subject": "science",
        "unit": "V",
        "page": 6,
        "status": "BOARD",
        "in": [
          {
            "item": "Ecosystem (components, food chains/webs, trophic levels); environmental problems; ozone depletion; waste production and solutions; biodegradable and non-biodegradable substances",
            "page": 6,
            "quote": "Our environment: Eco-system, Environmental problems, Ozone depletion, waste production and their solutions. Biodegradable and non-biodegradable substances."
          }
        ],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": []
      },
      {
        "key": "sources-of-energy",
        "subject": "science",
        "unit": null,
        "page": 4,
        "status": "OUT",
        "in": [],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": [],
        "basis": "No Sources of Energy content anywhere in Units I-V (p4-6); Unit V 'Natural Resources' = Our Environment only (p6)."
      },
      {
        "key": "management-of-natural-resources",
        "subject": "science",
        "unit": null,
        "page": 4,
        "status": "OUT",
        "in": [],
        "out": [],
        "formative": [],
        "limits": [],
        "ambiguous": [],
        "resolved": [],
        "basis": "No Management of Natural Resources content anywhere in Units I-V (p4-6); Unit V lists only 'Our environment' (p6)."
      }
    ],
    "paperDesign": {
      "page": 9,
      "knowledgeUnderstanding": 50,
      "application": 30,
      "formulateAnalyzeEvaluateCreate": 20,
      "internalChoicePct": 33,
      "typology": "VSA incl. objective, Assertion–Reasoning; SA; LA; Source/Case/Passage-based/Integrated",
      "ruling": "Owner ruling 5 (2026-10-05): any paper-share claim must cite the curriculum PDF's own typology (Maths p8 54/24/22; Science p9 50/30/20)."
    },
    "crossCutting": [
      {
        "status": "OUT",
        "item": "Content from NCERT 'boxes'",
        "page": 6,
        "quote": "The NCERT text books present information in boxes across the book. … However, the information in these boxes would not be assessed in the year-end examination."
      }
    ]
  }
} as const;

// Compile-time shape check (no runtime cost).
const _shape: { readonly maths: SyllabusSubjectReference; readonly science: SyllabusSubjectReference } = SYLLABUS_2026_27;
void _shape;

const SUBJECTS: Readonly<Record<SyllabusSubject, SyllabusSubjectReference>> = {
  maths: SYLLABUS_2026_27.maths,
  science: SYLLABUS_2026_27.science,
};

/* ------------------------------------------------------ board chapter keys */

/**
 * Scout slug -> the app's canonical topicKey (`lib/desktop/topics.ts` slugs, bank `topicKey`).
 * The 26 board chapters map 1:1 (identity). The three non-board slugs have no board key.
 */
export const SCOUT_SLUG_TO_APP_KEY = {
  "real-numbers": "real-numbers",
  "polynomials": "polynomials",
  "pair-of-linear-equations": "pair-of-linear-equations",
  "quadratic-equations": "quadratic-equations",
  "arithmetic-progression": "arithmetic-progression",
  "coordinate-geometry": "coordinate-geometry",
  "triangles": "triangles",
  "circles": "circles",
  "trigonometry": "trigonometry",
  "areas-related-to-circles": "areas-related-to-circles",
  "surface-areas-and-volumes": "surface-areas-and-volumes",
  "statistics": "statistics",
  "probability": "probability",
  "chemical-reactions-and-equations": "chemical-reactions-and-equations",
  "periodic-classification-of-elements": null,
  "acids-bases-and-salts": "acids-bases-and-salts",
  "metals-and-non-metals": "metals-and-non-metals",
  "carbon-and-its-compounds": "carbon-and-its-compounds",
  "life-processes": "life-processes",
  "control-and-coordination": "control-and-coordination",
  "how-do-organisms-reproduce": "how-do-organisms-reproduce",
  "heredity": "heredity",
  "light-reflection-and-refraction": "light-reflection-and-refraction",
  "human-eye-and-colourful-world": "human-eye-and-colourful-world",
  "electricity": "electricity",
  "magnetic-effects-of-electric-current": "magnetic-effects-of-electric-current",
  "our-environment": "our-environment",
  "sources-of-energy": null,
  "management-of-natural-resources": null
} as const;

export const BOARD_CHAPTER_KEYS = [
  "real-numbers",
  "polynomials",
  "pair-of-linear-equations",
  "quadratic-equations",
  "arithmetic-progression",
  "coordinate-geometry",
  "triangles",
  "circles",
  "trigonometry",
  "areas-related-to-circles",
  "surface-areas-and-volumes",
  "statistics",
  "probability",
  "chemical-reactions-and-equations",
  "acids-bases-and-salts",
  "metals-and-non-metals",
  "carbon-and-its-compounds",
  "life-processes",
  "control-and-coordination",
  "how-do-organisms-reproduce",
  "heredity",
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
  "our-environment"
] as const;

export type BoardChapterKey = (typeof BOARD_CHAPTER_KEYS)[number];

const BOARD_KEY_SET: ReadonlySet<string> = new Set(BOARD_CHAPTER_KEYS);

/** True only for one of the 26 board-assessed chapter keys (exact match). */
export function isBoardChapterKey(key: string): key is BoardChapterKey {
  return BOARD_KEY_SET.has(key);
}

/* ----------------------------------------------------------- unit marks */

/** Unit -> marks, per subject (each subject sums to exactly 80). */
export const UNIT_MARKS: Readonly<Record<SyllabusSubject, Readonly<Record<string, number>>>> = {
  maths: Object.fromEntries(SYLLABUS_2026_27.maths.units.map((u) => [u.unit, u.marks])),
  science: Object.fromEntries(SYLLABUS_2026_27.science.units.map((u) => [u.unit, u.marks])),
};

export interface ChapterUnitInfo {
  readonly subject: SyllabusSubject;
  readonly unit: string;
  readonly unitName: string;
  /** Marks for the WHOLE unit — the PDFs give no per-chapter marks. */
  readonly unitMarks: number;
  readonly page: number;
}

const CHAPTER_UNIT: ReadonlyMap<string, ChapterUnitInfo> = new Map(
  (["maths", "science"] as const).flatMap((subject) =>
    SUBJECTS[subject].units.flatMap((u) =>
      u.chapters.map((key) => [key, { subject, unit: u.unit, unitName: u.name, unitMarks: u.marks, page: u.page }] as const),
    ),
  ),
);

/** Board chapter key -> its CBSE unit (null for any key outside the 26). */
export function chapterUnit(key: string): ChapterUnitInfo | null {
  return isBoardChapterKey(key) ? CHAPTER_UNIT.get(key) ?? null : null;
}

/** (subject, unit) -> unit marks (null if no such unit). */
export function unitMarks(subject: SyllabusSubject, unit: string): number | null {
  return UNIT_MARKS[subject][unit] ?? null;
}

/** Board chapter key -> the marks of the unit it belongs to (null outside the 26). */
export function chapterUnitMarks(key: string): number | null {
  return chapterUnit(key)?.unitMarks ?? null;
}

/* ------------------------------------------------------------ flat lists */

export interface FlatSyllabusRow {
  readonly key: string;
  readonly item: string;
  readonly page: number;
  readonly ruling?: string;
}

const flat = (
  subject: SyllabusSubject,
  pick: (c: SyllabusChapter) => readonly { item?: string; rule?: string; page: number; ruling?: string }[],
): readonly FlatSyllabusRow[] =>
  SUBJECTS[subject].chapters.flatMap((c) =>
    pick(c).map((x) => ({
      key: c.key,
      item: (x.item ?? x.rule) as string,
      page: x.page,
      ...(x.ruling ? { ruling: x.ruling } : {}),
    })),
  );

/** Whole chapters that are not board-assessed, as one OUT / FORMATIVE row each. */
const wholeChapter = (subject: SyllabusSubject, status: ChapterStatus): readonly FlatSyllabusRow[] =>
  SUBJECTS[subject].chapters
    .filter((c) => c.status === status)
    .map((c) => ({ key: c.key, item: `WHOLE CHAPTER: ${c.key}`, page: c.page }));

const bySubject = (fn: (s: SyllabusSubject) => readonly FlatSyllabusRow[]) => ({ maths: fn("maths"), science: fn("science") });

/** Everything OUT of the 2026-27 board syllabus (items + whole chapters + cross-cutting). */
export const SYLLABUS_OUT: Readonly<Record<SyllabusSubject, readonly FlatSyllabusRow[]>> = bySubject((s) => [
  ...flat(s, (c) => c.out),
  ...wholeChapter(s, "OUT"),
  ...(SUBJECTS[s].crossCutting ?? [])
    .filter((x) => x.status === "OUT")
    .map((x) => ({ key: "*", item: x.item, page: x.page })),
]);

/** Everything assessed ONLY formatively (not in the year-end board exam). */
export const SYLLABUS_FORMATIVE: Readonly<Record<SyllabusSubject, readonly FlatSyllabusRow[]>> = bySubject((s) => [
  ...flat(s, (c) => c.formative),
  ...wholeChapter(s, "FORMATIVE"),
]);

/** IN, but scope-limited — content beyond the limit is OUT. */
export const SYLLABUS_LIMITS: Readonly<Record<SyllabusSubject, readonly FlatSyllabusRow[]>> = bySubject((s) =>
  flat(s, (c) => c.limits),
);

/** Still AMBIGUOUS after the owner rulings — NOT findings; do not act on them. */
export const SYLLABUS_AMBIGUOUS: Readonly<Record<SyllabusSubject, readonly FlatSyllabusRow[]>> = bySubject((s) =>
  flat(s, (c) => c.ambiguous),
);

/* ----------------------------------------------------- formative-only topics */

export interface FormativeOnlyTopic {
  readonly name: string;
  /** The board chapter it sits under, or null for a whole non-board chapter. */
  readonly parentKey: BoardChapterKey | null;
  /** Scout slug for a whole formative chapter. */
  readonly slug?: string;
  readonly page: number;
  readonly alsoPage?: number;
}

/** Topics the Science PDF names as "assessed only formatively" (p4-6). Maths has none. */
export const FORMATIVE_ONLY_TOPICS: readonly FormativeOnlyTopic[] = [
  {
    "name": "Periodic Classification of Elements",
    "parentKey": null,
    "slug": "periodic-classification-of-elements",
    "page": 4,
    "alsoPage": 6
  },
  {
    "name": "Evolution",
    "parentKey": "heredity",
    "page": 5
  },
  {
    "name": "Electric Motor",
    "parentKey": "magnetic-effects-of-electric-current",
    "page": 6
  },
  {
    "name": "Electromagnetic Induction",
    "parentKey": "magnetic-effects-of-electric-current",
    "page": 6
  },
  {
    "name": "Electric Generator",
    "parentKey": "magnetic-effects-of-electric-current",
    "page": 6
  }
];

/* ------------------------------------------------------------ paper design */

/** The PDFs' own paper typology (owner ruling 5) — cite these, never a "~50% competency" claim. */
export const PAPER_DESIGN = {
  maths: SYLLABUS_2026_27.maths.paperDesign,
  science: SYLLABUS_2026_27.science.paperDesign,
} as const;

/* ------------------------------------------------- verbatim source (compat) */

/**
 * The scout JSON, VERBATIM (JSON.stringify sha256 a2041b659a1fa0b920fee4fbcc8ebdfd3dc87d920de6302cd4456c33d0f17f60).
 * Drop-in replacement for `SYLLABUS_2026_27_SCOUT_FIXTURE`
 * (lib/boardQuestions/syllabus2026-27.scoutFixture.ts): same shape and content, so
 * `selectionRule.ts`'s item-index phrase table resolves identically. Owner rulings are
 * NOT applied here — read `SYLLABUS_2026_27` for the ruled reference.
 */
export const SYLLABUS_2026_27_SOURCE = {
  "_meta": {
    "title": "CBSE Class X 2026-27 (exam 2027) syllabus reference — SYLLABUS-SCOUT-1",
    "built": "2026-10-06",
    "builtBy": "SYLLABUS-SCOUT-1 (report-only)",
    "authority": [
      {
        "subject": "Mathematics (041 Standard & 241 Basic — one content list)",
        "url": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf",
        "sha256": "d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5",
        "pages": 10,
        "retrieved": "2026-10-06",
        "localCopy": "Desktop/diff/syllabus-scout-1/pdfs/Maths_SecP1X_2026-27.pdf (+ .txt, pymupdf 1.27.2.3 per-page text)"
      },
      {
        "subject": "Science (086)",
        "url": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf",
        "sha256": "1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37",
        "pages": 9,
        "retrieved": "2026-10-06",
        "localCopy": "Desktop/diff/syllabus-scout-1/pdfs/Science_SecP1_2026-27.pdf (+ .txt)"
      }
    ],
    "statusVocabulary": {
      "IN": "named in the PDF content list — board-assessed",
      "OUT": "not named anywhere in the chapter's PDF content list (absence-based; the 'basis' says which page holds the full list it is absent from)",
      "FORMATIVE": "named by the PDF as 'assessed only formatively … without adding to summative assessments' — NOT in the year-end board exam; for a board-prep product this is OUT of practice/grading/recommendation",
      "LIMIT": "IN, but the PDF restricts its scope — content beyond the limit is OUT",
      "AMBIGUOUS": "PDF wording admits two readings; reported verbatim, scout's working reading stated, not used for high-confidence findings"
    },
    "notInThesePDFs": [
      "Per-CHAPTER marks: neither PDF gives marks per chapter, only per UNIT. Any 'marks per chapter' shown to students is a derivation, not CBSE's number.",
      "The '~50% competency-based / 20% MCQ / 30% SA+LA' split cited in CLAUDE.md §13 does not appear in either PDF. The Maths PDF gives a cognitive typology (p8-9); the Science PDF gives a competency split 50/30/20 (p9)."
    ]
  },
  "maths": {
    "totalMarks": 80,
    "internalAssessment": 20,
    "units": [
      {
        "unit": "I",
        "name": "Number Systems",
        "marks": 6,
        "chapters": [
          "real-numbers"
        ],
        "page": 3
      },
      {
        "unit": "II",
        "name": "Algebra",
        "marks": 20,
        "chapters": [
          "polynomials",
          "pair-of-linear-equations",
          "quadratic-equations",
          "arithmetic-progression"
        ],
        "page": 3
      },
      {
        "unit": "III",
        "name": "Coordinate Geometry",
        "marks": 6,
        "chapters": [
          "coordinate-geometry"
        ],
        "page": 3
      },
      {
        "unit": "IV",
        "name": "Geometry",
        "marks": 15,
        "chapters": [
          "triangles",
          "circles"
        ],
        "page": 3
      },
      {
        "unit": "V",
        "name": "Trigonometry",
        "marks": 12,
        "chapters": [
          "trigonometry"
        ],
        "note": "Unit V = Introduction to Trigonometry + Trigonometric Identities + Heights and Distances (p6); the repo holds all three under one 'trigonometry' chapter",
        "page": 3
      },
      {
        "unit": "VI",
        "name": "Mensuration",
        "marks": 10,
        "chapters": [
          "areas-related-to-circles",
          "surface-areas-and-volumes"
        ],
        "page": 3
      },
      {
        "unit": "VII",
        "name": "Statistics and Probability",
        "marks": 11,
        "chapters": [
          "statistics",
          "probability"
        ],
        "page": 3
      }
    ],
    "paperDesign": {
      "standard041": {
        "page": 8,
        "rememberingUnderstanding": {
          "marks": 43,
          "pct": 54
        },
        "applying": {
          "marks": 19,
          "pct": 24
        },
        "analysingEvaluatingCreating": {
          "marks": 18,
          "pct": 22
        }
      },
      "basic241": {
        "page": 9,
        "rememberingUnderstanding": {
          "marks": 60,
          "pct": 75
        },
        "applying": {
          "marks": 12,
          "pct": 15
        },
        "analysingEvaluatingCreating": {
          "marks": 8,
          "pct": 10
        }
      }
    },
    "chapters": [
      {
        "slug": "real-numbers",
        "unit": "I",
        "page": 3,
        "in": [
          {
            "item": "Fundamental Theorem of Arithmetic — statements, illustrated through examples",
            "page": 3,
            "quote": "Fundamental Theorem of Arithmetic - statements after reviewing work done earlier and after illustrating and motivating through examples"
          },
          {
            "item": "Applying FTA to real-life problems (HCF/LCM by prime factorisation is the standard application)",
            "page": 3,
            "quote": "Applies Fundamental Theorem of Arithmetic to solve problems related to real life contexts."
          },
          {
            "item": "Proofs of irrationality of √2, √3, √5 and expressions built on them (e.g. 3 + 2√5)",
            "page": 3,
            "quote": "Proofs of irrationality of √2, √3, √5 … Prove algebraically the Irrationality of numbers like √2, √3, √5, 3 + 2√5 etc."
          }
        ],
        "out": [
          {
            "item": "Euclid's division lemma / division algorithm (HCF by repeated division)",
            "basis": "absent from the full Real Numbers list on p3"
          },
          {
            "item": "Decimal expansions of rational numbers (terminating / non-terminating repeating; 2^m5^n denominator test)",
            "basis": "absent from the full Real Numbers list on p3"
          }
        ],
        "limits": [],
        "ambiguous": [
          {
            "item": "Irrationality proofs for surds other than √2, √3, √5 (e.g. √7, √11)",
            "page": 3,
            "quote": "numbers like √2, √3, √5, 3 + 2√5 etc.",
            "workingReading": "'like … etc.' admits same-method proofs; NOT a finding. Corrects the cofounder's 'only √2, √3, √5'."
          }
        ]
      },
      {
        "slug": "polynomials",
        "unit": "II",
        "page": 3,
        "in": [
          {
            "item": "Zeros of a polynomial — graphically and algebraically",
            "page": 3,
            "quote": "Zeros of a polynomial … Find the zeros of polynomial graphically and algebraically"
          },
          {
            "item": "Relationship between zeros and coefficients of QUADRATIC polynomials (verify; form a quadratic from sum/product)",
            "page": 3,
            "quote": "Relationship between zeros and coefficients of quadratic polynomials."
          }
        ],
        "out": [
          {
            "item": "Zero–coefficient relationship for CUBIC polynomials (α+β+γ, αβ+βγ+γα, αβγ)",
            "basis": "p3 restricts the relationship to 'quadratic polynomials'"
          },
          {
            "item": "Division algorithm for polynomials (long division, finding remaining zeros by division)",
            "basis": "absent from the full Polynomials list on p3"
          }
        ],
        "limits": [
          {
            "rule": "Zero–coefficient relationship: quadratic only",
            "page": 3
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "pair-of-linear-equations",
        "unit": "II",
        "page": 4,
        "in": [
          {
            "item": "Graphical method; consistency / inconsistency",
            "page": 4,
            "quote": "Pair of linear equations in two variables and graphical method of their solution, consistency/inconsistency."
          },
          {
            "item": "Algebraic conditions for number of solutions (a1/a2 vs b1/b2 vs c1/c2)",
            "page": 4,
            "quote": "Algebraic conditions for number of solutions."
          },
          {
            "item": "Algebraic solution by substitution and by elimination",
            "page": 4,
            "quote": "Solution of a pair of linear equations in two variables algebraically - by substitution, by elimination."
          },
          {
            "item": "Simple situational problems",
            "page": 4,
            "quote": "Simple situational problems."
          }
        ],
        "out": [
          {
            "item": "Cross-multiplication method",
            "basis": "p4 names only 'by substitution, by elimination'"
          },
          {
            "item": "Equations reducible to a pair of linear equations (1/x, 1/y substitution etc.)",
            "basis": "absent from the full PLE list on p4"
          }
        ],
        "limits": [
          {
            "rule": "Algebraic methods: substitution and elimination only; situational problems 'simple'",
            "page": 4
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "quadratic-equations",
        "unit": "II",
        "page": 4,
        "in": [
          {
            "item": "Standard form ax²+bx+c=0, a≠0",
            "page": 4,
            "quote": "Standard form of a quadratic equation 𝑎𝑥2 + 𝑏𝑥+ 𝑐= 0, (𝑎≠0)."
          },
          {
            "item": "Solutions (only real roots) by factorisation and by the quadratic formula",
            "page": 4,
            "quote": "Solutions of quadratic equations (only real roots) by factorization, and by using quadratic formula."
          },
          {
            "item": "Discriminant and nature of roots",
            "page": 4,
            "quote": "Relationship between discriminant and nature of roots."
          },
          {
            "item": "Situational (day-to-day) problems",
            "page": 4,
            "quote": "Situational problems based on quadratic equations related to day-to-day activities to be incorporated"
          }
        ],
        "out": [
          {
            "item": "Solving by completing the square (as a method)",
            "basis": "p4 names only 'by factorization, and by using quadratic formula'"
          },
          {
            "item": "Finding complex/non-real roots",
            "basis": "p4 'only real roots' (deciding that NO real roots exist via D<0 is IN as nature of roots)"
          }
        ],
        "limits": [
          {
            "rule": "Solution methods: factorisation and quadratic formula only; real roots only",
            "page": 4
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "arithmetic-progression",
        "unit": "II",
        "page": 4,
        "in": [
          {
            "item": "Motivation for AP",
            "page": 4,
            "quote": "Motivation for studying Arithmetic Progression"
          },
          {
            "item": "Derivation of nth term and of sum of first n terms; application to daily-life problems",
            "page": 4,
            "quote": "Derivation of the nth term and sum of the first n terms of AP and their application in solving daily life problems."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "coordinate-geometry",
        "unit": "III",
        "page": 5,
        "in": [
          {
            "item": "Review of concepts of coordinate geometry",
            "page": 5,
            "quote": "Review: Concepts of coordinate geometry."
          },
          {
            "item": "Distance formula",
            "page": 5,
            "quote": "Distance formula."
          },
          {
            "item": "Section formula — internal division (mid-point is its special case)",
            "page": 5,
            "quote": "Section formula (internal division)."
          }
        ],
        "out": [
          {
            "item": "Area of a triangle from coordinates (and collinearity via zero area)",
            "basis": "absent from the full Coordinate Geometry list on p5"
          },
          {
            "item": "Section formula — external division",
            "basis": "p5 '(internal division)'"
          }
        ],
        "limits": [
          {
            "rule": "Section formula: internal division only",
            "page": 5
          }
        ],
        "ambiguous": [
          {
            "item": "Centroid of a triangle from coordinates",
            "page": 5,
            "quote": "Section formula (internal division).",
            "workingReading": "derivable from the section formula but not named; NOT a finding"
          }
        ]
      },
      {
        "slug": "triangles",
        "unit": "IV",
        "page": 5,
        "in": [
          {
            "item": "Definitions, examples, counter-examples of similar triangles",
            "page": 5,
            "quote": "Definitions, examples, counter examples of similar triangles."
          },
          {
            "item": "PROVE the Basic Proportionality Theorem",
            "page": 5,
            "quote": "(Prove) If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio."
          },
          {
            "item": "STATE (without proof) the converse of BPT",
            "page": 5,
            "quote": "State (without proof) If a line divides two sides of a triangle in the same ratio, the line is parallel to the third side."
          },
          {
            "item": "STATE (without proof) AAA similarity criterion",
            "page": 5,
            "quote": "State (without proof) If in two triangles, the corresponding angles are equal, their corresponding sides are proportional and the triangles are similar."
          },
          {
            "item": "STATE (without proof) SSS similarity criterion",
            "page": 5,
            "quote": "State (without proof) If the corresponding sides of two triangles are proportional, their corresponding angles are equal and the two triangles are similar."
          },
          {
            "item": "STATE (without proof) SAS similarity criterion",
            "page": 5,
            "quote": "State (without proof) If one angle of a triangle is equal to one angle of another triangle and the sides including these angles are proportional, the two triangles are similar."
          },
          {
            "item": "Apply BPT, its converse and the criteria in proofs and problems",
            "page": 5,
            "quote": "Prove Basic Proportionality theorem and applying the theorem and its converse in solving questions … Prove similarity of triangles using different similarity criteria"
          }
        ],
        "out": [
          {
            "item": "Ratio of areas of similar triangles (area theorem) and problems using it",
            "basis": "absent from the full Triangles list on p5"
          },
          {
            "item": "Pythagoras theorem and its converse (as Triangles content / proofs)",
            "basis": "absent from the full Triangles list on p5"
          },
          {
            "item": "PROOFS of the converse of BPT, AAA, SSS, SAS criteria",
            "basis": "p5 says 'State (without proof)' for each — asking a student to prove them breaks the limit"
          }
        ],
        "limits": [
          {
            "rule": "Only BPT is proved; converse BPT, AAA, SSS, SAS are stated without proof",
            "page": 5
          }
        ],
        "ambiguous": [
          {
            "item": "Using a²+b²=c² as an incidental tool (e.g. a right triangle in a height or distance computation)",
            "page": 5,
            "workingReading": "the Pythagoras THEOREM is not Class-X content, but the relation is prior knowledge (Class VII). Only rows that teach, prove or test the theorem or converse as a Triangles concept are findings."
          }
        ]
      },
      {
        "slug": "circles",
        "unit": "IV",
        "page": 6,
        "in": [
          {
            "item": "Tangent to a circle at point of contact",
            "page": 6,
            "quote": "Tangent to a circle at point of contact."
          },
          {
            "item": "PROVE: tangent ⟂ radius at point of contact",
            "page": 6,
            "quote": "(Prove) The tangent at any point of a circle is perpendicular to the radius through the point of contact."
          },
          {
            "item": "PROVE: tangents from an external point are equal",
            "page": 6,
            "quote": "(Prove) The lengths of tangents drawn from an external point to a circle are equal."
          },
          {
            "item": "Apply tangents to various problems",
            "page": 6,
            "quote": "Applies the concept of tangents of circle to solve various problems."
          }
        ],
        "out": [
          {
            "item": "Constructions (division of a line segment, tangents to a circle, similar triangles) — the entire Constructions chapter",
            "basis": "no Constructions chapter in the Unit list p3-7"
          }
        ],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "trigonometry",
        "unit": "V",
        "page": 6,
        "in": [
          {
            "item": "Trigonometric ratios of an acute angle of a right triangle; proof of their existence (well defined)",
            "page": 6,
            "quote": "Trigonometric ratios of an acute angle of a right-angled triangle. Proof of their existence (well defined)"
          },
          {
            "item": "Ratios defined at 0° and 90°",
            "page": 6,
            "quote": "Motivate the ratios whichever are defined at 0° and 90°."
          },
          {
            "item": "Values at 30°, 45°, 60°",
            "page": 6,
            "quote": "Values of the trigonometric ratios of 30°, 45° and 60°."
          },
          {
            "item": "Relationships between the ratios (reciprocal, tan = sin/cos)",
            "page": 6,
            "quote": "Relationships between the ratios."
          },
          {
            "item": "Proof and applications of sin²A + cos²A = 1 (and the identities that follow from it); only simple identities",
            "page": 6,
            "quote": "Proof and applications of the identity sin2A + cos2A = 1. Only simple identities to be given. … Proves trigonometric identities using sin2A + cos2A = 1 and other identities"
          },
          {
            "item": "Heights and distances: angle of elevation / depression",
            "page": 6,
            "quote": "HEIGHTS AND DISTANCES: Angle of elevation, Angle of Depression."
          }
        ],
        "out": [
          {
            "item": "Trigonometric ratios of complementary angles (sin(90°−A) = cos A etc.) as a topic",
            "basis": "absent from the full Trigonometry list on p6; the syllabus names only acute-angle ratios, 0/90, 30/45/60, relationships, identities",
            "confidence": "high for 'complementary angles' as a NAMED technique — the guard (scripts/src/syllabusGuard.ts:79-81) already bans it; 'Relationships between the ratios' is read as reciprocal/quotient relations"
          }
        ],
        "limits": [
          {
            "rule": "Identities: 'only simple identities to be given'",
            "page": 6
          },
          {
            "rule": "Heights & distances: at most TWO right triangles",
            "page": 6,
            "quote": "Problems should not involve more than two right triangles."
          },
          {
            "rule": "Heights & distances: angles of elevation/depression ONLY 30°, 45°, 60°",
            "page": 6,
            "quote": "Angles of elevation / depression should be only 30°, 45°, and 60°."
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "areas-related-to-circles",
        "unit": "VI",
        "page": 7,
        "in": [
          {
            "item": "Area of sectors and segments of a circle",
            "page": 7,
            "quote": "Area of sectors and segments of a circle."
          },
          {
            "item": "Problems on areas and perimeter/circumference of those figures",
            "page": 7,
            "quote": "Problems based on areas and perimeter /circumference of the above said plane figures."
          }
        ],
        "out": [],
        "limits": [
          {
            "rule": "SEGMENT area: central angle 60°, 90°, 120° ONLY (sector area has no angle limit)",
            "page": 7,
            "quote": "(In calculating area of segment of a circle, problems should be restricted to central angle of 60°, 90° and 120° only."
          }
        ],
        "ambiguous": [
          {
            "item": "Areas of combinations of plane figures beyond sectors/segments (old NCERT 'combination' section)",
            "page": 7,
            "quote": "the above said plane figures",
            "workingReading": "'above said' = sectors and segments; combination problems built from sectors/segments + basic shapes are routine board items. NOT a finding unless a segment angle breaks the limit."
          }
        ]
      },
      {
        "slug": "surface-areas-and-volumes",
        "unit": "VI",
        "page": 7,
        "in": [
          {
            "item": "Surface areas and volumes of combinations of ANY TWO of: cubes, cuboids, spheres, hemispheres, right circular cylinders/cones",
            "page": 7,
            "quote": "Surface areas and volumes of combinations of any two of the following: cubes, cuboids, spheres, hemispheres and right circular cylinders/cones."
          }
        ],
        "out": [
          {
            "item": "Frustum of a cone",
            "basis": "not among the six solids listed on p7"
          },
          {
            "item": "Conversion of one solid into another (melting/recasting) as a topic",
            "basis": "absent from the full SAV list on p7",
            "confidence": "medium — guard bans it; a recasting row still only uses the volumes of listed solids"
          }
        ],
        "limits": [
          {
            "rule": "Combinations of at most TWO solids",
            "page": 7
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "statistics",
        "unit": "VII",
        "page": 7,
        "in": [
          {
            "item": "Mean of grouped data — direct, assumed-mean and step-deviation methods",
            "page": 7,
            "quote": "Computes the mean, of a grouped frequency distribution using direct, assumed mean and step deviation method."
          },
          {
            "item": "Median and mode of grouped data (algebraic method)",
            "page": 7,
            "quote": "Computes the median and mode of grouped frequency distribution by algebraic method"
          }
        ],
        "out": [
          {
            "item": "Graphical representation of cumulative frequency (ogive; median from ogive)",
            "basis": "p7 says 'by algebraic method'; ogive absent from the list"
          }
        ],
        "limits": [
          {
            "rule": "Bimodal situations to be avoided",
            "page": 7,
            "quote": "Mean, median and mode of grouped data (bimodal situation to be avoided)."
          }
        ],
        "ambiguous": [
          {
            "item": "Empirical relation 3 Median = Mode + 2 Mean",
            "page": 7,
            "workingReading": "not named; NOT a finding"
          }
        ]
      },
      {
        "slug": "probability",
        "unit": "VII",
        "page": 7,
        "in": [
          {
            "item": "Classical definition of probability",
            "page": 7,
            "quote": "Classical definition of probability."
          },
          {
            "item": "Simple problems on the probability of an event",
            "page": 7,
            "quote": "Simple problems on finding the probability of an event."
          }
        ],
        "out": [],
        "limits": [
          {
            "rule": "'Simple problems' only",
            "page": 7
          }
        ],
        "ambiguous": []
      }
    ]
  },
  "science": {
    "totalMarks": 80,
    "internalAssessment": 20,
    "units": [
      {
        "unit": "I",
        "name": "Chemical Substances – Nature and Behaviour",
        "marks": 25,
        "chapters": [
          "chemical-reactions-and-equations",
          "acids-bases-and-salts",
          "metals-and-non-metals",
          "carbon-and-its-compounds"
        ],
        "formativeChapters": [
          "periodic-classification-of-elements"
        ],
        "page": 4
      },
      {
        "unit": "II",
        "name": "World of Living",
        "marks": 25,
        "chapters": [
          "life-processes",
          "control-and-coordination",
          "how-do-organisms-reproduce",
          "heredity"
        ],
        "formativeSections": [
          "Evolution"
        ],
        "page": 4
      },
      {
        "unit": "III",
        "name": "Natural Phenomena",
        "marks": 12,
        "chapters": [
          "light-reflection-and-refraction",
          "human-eye-and-colourful-world"
        ],
        "page": 4
      },
      {
        "unit": "IV",
        "name": "Effects of Current",
        "marks": 13,
        "chapters": [
          "electricity",
          "magnetic-effects-of-electric-current"
        ],
        "formativeSections": [
          "Motor",
          "Electromagnetic Induction",
          "Electric Generator"
        ],
        "page": 4
      },
      {
        "unit": "V",
        "name": "Natural Resources",
        "marks": 5,
        "chapters": [
          "our-environment"
        ],
        "page": 4
      }
    ],
    "paperDesign": {
      "page": 9,
      "knowledgeUnderstanding": 50,
      "application": 30,
      "formulateAnalyzeEvaluateCreate": 20,
      "internalChoicePct": 33,
      "typology": "VSA incl. objective, Assertion–Reasoning; SA; LA; Source/Case/Passage-based/Integrated"
    },
    "crossCutting": [
      {
        "status": "OUT",
        "item": "Content from NCERT 'boxes'",
        "page": 6,
        "quote": "The NCERT text books present information in boxes across the book. … However, the information in these boxes would not be assessed in the year-end examination."
      }
    ],
    "chapters": [
      {
        "slug": "chemical-reactions-and-equations",
        "unit": "I",
        "page": 4,
        "in": [
          {
            "item": "Chemical reactions, equations, balancing; types: combination, decomposition, displacement, double displacement, precipitation, endothermic/exothermic, oxidation and reduction",
            "page": 4,
            "quote": "Chemical reactions, Chemical equation, Balanced chemical equation, types of chemical reactions: combination, decomposition, displacement, double displacement, precipitation, endothermic exothermic reactions, oxidation and reduction."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": [
          {
            "item": "Rancidity (NCERT ch.1 'effects of oxidation in everyday life')",
            "page": 4,
            "workingReading": "not named on p4; corrosion IS named under Metals (p5). Reported, NOT a finding."
          }
        ]
      },
      {
        "slug": "periodic-classification-of-elements",
        "unit": "I",
        "page": 4,
        "status": "FORMATIVE",
        "formative": [
          {
            "item": "Döbereiner's Triads, Newlands' Law of Octaves, Mendeléev's Periodic Table, Modern Periodic Table, trends (metallic/non-metallic properties)",
            "page": 4,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Periodic Classification of Elements: Döbereiner's Triads, Newlands' Law of Octaves, Mendeléev's Periodic Table, Modern Periodic Table and the Modern, Metallic and Non-metallic Properties."
          }
        ],
        "alsoAt": {
          "page": 6,
          "quote": "The topics Periodic Classification of Elements; … will not be assessed in the year-end examination."
        }
      },
      {
        "slug": "acids-bases-and-salts",
        "unit": "I",
        "page": 4,
        "in": [
          {
            "item": "Acids/bases (H+/OH−), indicators, chemical properties, examples, uses, neutralisation, pH scale, importance of pH; preparation and uses of NaOH, bleaching powder, baking soda, washing soda, Plaster of Paris",
            "page": "4-5",
            "quote": "Acids and Bases – definitions in terms of furnishing of H+ and OH– ions, identification using indicators, chemical properties, examples and uses, neutralization, concept of pH scale (Definition relating to logarithm not required), importance of pH in everyday life; preparation and uses of Sodium Hydroxide, Bleaching Powder, Baking soda, Washing soda and Plaster of Paris."
          }
        ],
        "out": [
          {
            "item": "pH defined via logarithm (pH = −log[H+]) and log-based pH computations",
            "basis": "p4 '(Definition relating to logarithm not required)'"
          }
        ],
        "limits": [
          {
            "rule": "pH: no logarithmic definition",
            "page": 4
          }
        ],
        "ambiguous": []
      },
      {
        "slug": "metals-and-non-metals",
        "unit": "I",
        "page": 5,
        "in": [
          {
            "item": "Properties of metals and non-metals; reactivity series; ionic compounds (formation, properties); basic metallurgical processes; corrosion and prevention",
            "page": 5,
            "quote": "Properties of metals and non-metals; Reactivity series; Formation and properties of ionic compounds; Basic metallurgical processes; Corrosion and its prevention."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "carbon-and-its-compounds",
        "unit": "I",
        "page": 5,
        "in": [
          {
            "item": "Covalent bonds; versatile nature of carbon; saturated/unsaturated hydrocarbons; homologous series; nomenclature (alkanes, alkenes, alkynes, halogens, alcohol, ketones, aldehydes); combustion, oxidation, addition, substitution; ethanol and ethanoic acid (only properties and uses); soaps and detergents",
            "page": 5,
            "quote": "Covalent bonds – formation and properties of covalent compounds, Versatile nature of carbon, Hydrocarbons – saturated and unsaturated Homologous series. Nomenclature of alkanes, alkenes, alkyne and carbon compounds containing functional groups (halogens, alcohol, ketones, aldehydes). Chemical properties of carbon compounds (combustion, oxidation, addition and substitution reaction). Ethanol and Ethanoic acid (only properties and uses), soaps and detergents."
          }
        ],
        "out": [],
        "limits": [
          {
            "rule": "Ethanol and ethanoic acid: only properties and uses",
            "page": 5
          }
        ],
        "ambiguous": [
          {
            "item": "Carboxylic-acid functional-group nomenclature",
            "page": 5,
            "workingReading": "the nomenclature list names halogens, alcohol, ketones, aldehydes but not carboxylic acids, while ethanoic acid is IN; NOT a finding"
          }
        ]
      },
      {
        "slug": "life-processes",
        "unit": "II",
        "page": 5,
        "in": [
          {
            "item": "'Living being'; nutrition, respiration, transport, excretion in plants and animals",
            "page": 5,
            "quote": "Life processes: 'Living Being'. Basic concept of nutrition, respiration, transport and excretion in plants and animals."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "control-and-coordination",
        "unit": "II",
        "page": 5,
        "in": [
          {
            "item": "Tropic movements; plant hormones (intro); nervous system; voluntary, involuntary, reflex action; animal hormones",
            "page": 5,
            "quote": "Tropic movements in plants; Introduction of plant hormones; Control and co-ordination in animals: Nervous system; Voluntary, involuntary and reflex action; Chemical co-ordination: animal hormones."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "how-do-organisms-reproduce",
        "unit": "II",
        "page": 5,
        "in": [
          {
            "item": "Asexual and sexual reproduction in animals and plants; reproductive health, family planning, safe sex vs HIV/AIDS, child bearing and women's health",
            "page": 5,
            "quote": "Reproduction in animals and plants (asexual and sexual) reproductive health - need and methods of family planning. Safe sex vs HIV/AIDS. Child bearing and women's health."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "heredity",
        "unit": "II",
        "page": 5,
        "in": [
          {
            "item": "Heredity; Mendel's contribution — laws for inheritance of traits; sex determination (brief introduction)",
            "page": 5,
            "quote": "Heredity: Heredity; Mendel's contribution- Laws for inheritance of traits: Sex determination; brief introduction."
          }
        ],
        "formative": [
          {
            "item": "Evolution: acquired and inherited traits, speciation, evolution and classification, tracing evolutionary relationships, fossils, evolution by stages, human evolution",
            "page": 5,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Evolution: Acquired and Inherited Traits, Speciation, Evolution and Classification, Tracing Evolutionary Relationships, Fossils, Evolution by Stages, Human Evolution"
          }
        ],
        "limits": [
          {
            "rule": "Sex determination: brief introduction",
            "page": 5
          }
        ],
        "ambiguous": [
          {
            "item": "Note for Teachers lists 'Heredity and Evolution' as not assessed, while Unit II lists Heredity content as assessed",
            "page": 6,
            "quote": "1. The topics Periodic Classification of Elements; Heredity and Evolution; and Electric Effects of Electric Current will not be assessed in the year-end   examination.",
            "workingReading": "Unit II (p5) puts Heredity in the assessed body and only Evolution under the formative-only paragraph. Working reading: Heredity IN, Evolution FORMATIVE (as the spec directs). The Note is read as naming the NCERT chapter 'Heredity and Evolution' loosely."
          }
        ]
      },
      {
        "slug": "light-reflection-and-refraction",
        "unit": "III",
        "page": 5,
        "in": [
          {
            "item": "Reflection by curved surfaces; images by spherical mirrors; centre of curvature, principal axis, principal focus, focal length; mirror formula; magnification",
            "page": 5,
            "quote": "Reflection of light by curved surfaces; Images formed by spherical mirrors, centre of curvature, principal axis, principal focus, focal length, mirror formula (Derivation not required), magnification."
          },
          {
            "item": "Refraction; laws of refraction; refractive index",
            "page": 5,
            "quote": "Refraction; Laws of refraction, refractive index."
          },
          {
            "item": "Refraction by spherical lenses; images; lens formula; magnification; power of a lens",
            "page": 5,
            "quote": "Refraction of light by spherical lens; Image formed by spherical lenses; Lens formula (Derivation not required); Magnification. Power of a lens."
          }
        ],
        "out": [
          {
            "item": "Derivation of the mirror formula or lens formula",
            "basis": "p5 '(Derivation not required)' — twice"
          },
          {
            "item": "Beyond-Class-X optics: critical angle/TIR, lens-maker's formula, prism formula/minimum deviation, refraction at a single spherical surface, two-lens / mirror IMAGING systems (image of one element as the object of the next), inclined-mirror image counts, apparent depth computations",
            "basis": "absent from the full Unit III list on p5-6 (the repo already withholds many of these — canonicalQuestionBank.ts:1167-1205)"
          }
        ],
        "limits": [
          {
            "rule": "Mirror and lens formula: use, no derivation",
            "page": 5
          }
        ],
        "ambiguous": [
          {
            "item": "Net power of lenses in contact, P = P1 + P2",
            "page": 5,
            "quote": "Power of a lens.",
            "workingReading": "REVISED 2026-10-06 after the bank-science sub-scout flagged CBSE's own SQP/competency items testing it: treated as IN under 'Power of a lens' (it sits in NCERT's power-of-a-lens section). Only sequential two-lens IMAGING is OUT. NOT a finding."
          }
        ]
      },
      {
        "slug": "human-eye-and-colourful-world",
        "unit": "III",
        "page": 6,
        "in": [
          {
            "item": "Functioning of the lens in the human eye; defects of vision and corrections; applications of spherical mirrors and lenses",
            "page": 6,
            "quote": "Functioning of a lens in human eye, defects of vision and their corrections, applications of spherical mirrors and lenses."
          },
          {
            "item": "Refraction through a prism; dispersion; scattering of light; daily-life applications",
            "page": 6,
            "quote": "Refraction of light through a prism, dispersion of light, scattering of light, applications in daily life (excluding colour of the sun at sunrise and sunset)."
          }
        ],
        "out": [
          {
            "item": "Colour of the Sun at sunrise and sunset (reddening explained by scattering)",
            "basis": "p6 explicit exclusion",
            "quote": "(excluding colour of the sun at sunrise and sunset)"
          }
        ],
        "limits": [
          {
            "rule": "Scattering applications exclude the colour of the Sun at sunrise/sunset",
            "page": 6
          }
        ],
        "ambiguous": [
          {
            "item": "Atmospheric refraction (twinkling of stars, advance sunrise/delayed sunset)",
            "page": 6,
            "workingReading": "not named on p6 (only prism, dispersion, scattering, daily-life applications); reported, NOT a finding"
          }
        ]
      },
      {
        "slug": "electricity",
        "unit": "IV",
        "page": 6,
        "in": [
          {
            "item": "Current, potential difference; Ohm's law; resistance, resistivity, factors; series and parallel; heating effect and applications; electric power; P–V–I–R",
            "page": 6,
            "quote": "Electric current, potential difference and electric current. Ohm's law; Resistance, Resistivity, Factors on which the resistance of a conductor depends. Series combination of resistors, parallel combination of resistors and its applications in daily life. Heating effect of electric current and its applications in daily life. Electric power, Interrelation between P, V, I and R."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "magnetic-effects-of-electric-current",
        "unit": "IV",
        "page": 6,
        "in": [
          {
            "item": "Magnetic field and field lines; field due to straight conductor, coil, solenoid; force on current-carrying conductor; Fleming's LEFT-hand rule; direct current; alternating current and its frequency; advantage of AC over DC; domestic electric circuits",
            "page": 6,
            "quote": "Magnetic effects of current: Magnetic field, field lines, field due to a current carrying conductor, field due to current carrying coil or solenoid; Force on current carrying conductor, Fleming's Left Hand Rule, Direct current. Alternating current: frequency of AC. Advantage of AC over DC. Domestic electric circuits."
          }
        ],
        "formative": [
          {
            "item": "Electric motor; electromagnetic induction (incl. Fleming's right-hand rule, galvanometer deflection by a moving magnet); electric generator",
            "page": 6,
            "quote": "The following topics are included in the syllabus but will be assessed only formatively … Motor, Electromagnetic Induction, Electric Generator"
          }
        ],
        "limits": [],
        "ambiguous": [
          {
            "item": "Note for Teachers names 'Electric Effects of Electric Current' as not assessed",
            "page": 6,
            "quote": "1. The topics Periodic Classification of Elements; Heredity and Evolution; and Electric Effects of Electric Current will not be assessed in the year-end   examination.",
            "workingReading": "no chapter is called that. Unit IV (p6) lists electricity and magnetic-effects content as assessed and puts only Motor/EMI/Generator under the formative paragraph. Working reading: the Note means the formative Motor/EMI/Generator block. NOT used to mark Electricity or Magnetic Effects OUT."
          }
        ]
      },
      {
        "slug": "our-environment",
        "unit": "V",
        "page": 6,
        "in": [
          {
            "item": "Ecosystem (components, food chains/webs, trophic levels); environmental problems; ozone depletion; waste production and solutions; biodegradable and non-biodegradable substances",
            "page": 6,
            "quote": "Our environment: Eco-system, Environmental problems, Ozone depletion, waste production and their solutions. Biodegradable and non-biodegradable substances."
          }
        ],
        "out": [],
        "limits": [],
        "ambiguous": []
      },
      {
        "slug": "sources-of-energy",
        "status": "OUT",
        "basis": "No Sources of Energy content anywhere in Units I-V (p4-6); Unit V 'Natural Resources' = Our Environment only (p6)."
      },
      {
        "slug": "management-of-natural-resources",
        "status": "OUT",
        "basis": "No Management of Natural Resources content anywhere in Units I-V (p4-6); Unit V lists only 'Our environment' (p6)."
      }
    ]
  },
  "correctionsToCofounderExtraction": [
    {
      "line": "Real Numbers: … irrationality of √2, √3, √5 only",
      "correction": "p3 Explanation column: 'numbers like √2, √3, √5, 3 + 2√5 etc.' — not 'only'. Same-method proofs and expressions like 3+2√5 are IN."
    },
    {
      "line": "Trigonometry: ratios of an acute angle …",
      "correction": "p6 adds 'Proof of their existence (well defined)' — IN, missing from the extraction."
    },
    {
      "line": "Trig identity sin²A + cos²A = 1 with only simple identities",
      "correction": "p6 Explanation: 'Proves trigonometric identities using sin2A + cos2A = 1 and other identities' — the derived identities (1+tan²A = sec²A, 1+cot²A = cosec²A) are IN."
    },
    {
      "line": "Statistics: mean, median, mode of grouped data (bimodal avoided)",
      "correction": "Correct, and p7 also fixes the METHODS: mean by direct, assumed-mean and step-deviation; median and mode by algebraic method (ogive therefore OUT)."
    },
    {
      "line": "Areas Related to Circles: segment problems only for 60°, 90°, 120°",
      "correction": "Correct. The limit is on SEGMENTS only; sector areas at any angle are IN."
    },
    {
      "line": "Note for Teachers names 'Heredity and Evolution'",
      "correction": "The same Note ALSO names 'Electric Effects of Electric Current' — a second ambiguity the extraction did not report (p6)."
    },
    {
      "line": "AP: nth term, sum of n terms, applications",
      "correction": "p4 says 'Derivation of the nth term and sum of the first n terms' — the derivations are IN."
    },
    {
      "line": "Pair of Linear Equations",
      "correction": "p4 also limits situational problems to 'Simple situational problems'."
    },
    {
      "line": "Science Light",
      "correction": "Light items match; p5 also lists 'Refraction; Laws of refraction, refractive index' and centre of curvature/principal axis/focus explicitly."
    },
    {
      "line": "Science marks",
      "correction": "Correct (25/25/12/13/5 = 80, p4). Internal assessment 20 = Periodic 5 + Multiple 5 + Portfolio 5 + Practical 5 (p9)."
    },
    {
      "line": "Maths marks",
      "correction": "Correct (6/20/6/15/12/10/11 = 80, p3). Standard and Basic share ONE content list; they differ only in question-paper typology (p8 vs p9)."
    }
  ]
} as const;
