// src/config/solutionsPublishSafe.ts
//
// SOLUTIONS-1 (lane G; #973 D259 / D260 / D261) — the PUBLISH-SAFE allowlist for the public
// NCERT / NCERT Exemplar solutions pages, and the per-row verdict opt-in.
// SOLUTIONS-2 (owner 18 Oct 2026) — the 13 remaining Maths chapters, selected by
// `scripts/solutions/selectSolutions.ts` (deterministic rules + the verification ledger
// `solutions2Ledger.ts`) and written into the generated block below. The Triangles entry is
// SOLUTIONS-1's, changed only by SOLUTIONS-3.
// SOLUTIONS-3 (owner rulings, 18 Oct 2026) — (1) Assertion-Reason and case-based rows appear ONLY in
// each page's `boardPattern` section, labelled "CBSE board pattern" (neither book has AR items for
// 2026-27; they are a board-paper format), verified in `solutions3BoardLedger.ts`; the Triangles
// pilot's AR / case rows moved there. (2) TRI-N-EXMPLR-6-LA-001 and -SA-011 (now source "others")
// are off the Triangles page; they stay in the Practice Hub.
//
// ★ IDS ONLY. No row text lives here: the page reads the bank (the chapter loader), so a row
//   repaired in the bank is repaired on the page, and a row added to WITHHELD_QUESTION_IDS
//   later disappears from the page on the next build (the chapter module drops withheld rows).
// ★ D261 (cofounder, 14 Oct 14:00Z, trunk `1afc7020`): two independent verifiers solved every
//   candidate blind and checked key, steps, syllabus (2026-27), figures and options. The 5 HOLD
//   rows and the 12 syllabus-excluded rows are NOT here and must never be added without a new
//   decision on #973.
// ★ VERDICT OPT-IN (D260). MCQ / Assertion-Reason rows always get ✓ / ✗ (the page also checks
//   that exactly one option equals the key, else no verdict). A TYPED row gets a verdict ONLY
//   when it is listed below with `verdict: "value"`: its `finalAnswer` is one value + unit that
//   `compareAnswer` can compare. Proofs, yes/no-with-reason, multi-part and multi-value rows
//   are NOT opted in, ever: "never mark a correct student wrong; when in doubt, no verdict".
//   Eligibility is never inferred from the text ("Proved: ∠PQR = 90°" looks like a value).
//   SOLUTIONS-2 decides it BY CODE (`verdictEligibility` in selectSolutions.ts).
// ★ REGISTRATION. The published paths live in the light module `solutionsPages.ts` (re-exported
//   here); every registration (canonical, sitemap, prerender, heads, JSON-LD, llms.txt) derives
//   from `solutionsPaths()`. The head / breadcrumb / llms.txt strings are built below, one place.

import { solutionsPath, type SolutionsBook } from "./solutionsPages";

export {
  SOLUTIONS_BASE,
  SOLUTIONS_PAGES,
  isSolutionsRoute,
  parseSolutionsPath,
  solutionsPath,
  solutionsPaths,
  type SolutionsBook,
  type SolutionsPage,
} from "./solutionsPages";

export interface PublishSafeRow {
  readonly id: string;
  /** Typed final answer that is ONE comparable value (+ unit). Absent = no verdict. */
  readonly verdict?: "value";
}

export interface SolutionsChapter {
  /** URL slug. The canonical topics.ts slug, unless the bank chapter spans two NCERT chapters. */
  readonly slug: string;
  /** Bank chapter / topics.ts / notes slug, when it differs from `slug` (trigonometry → Ch 8 and Ch 9). */
  readonly bank?: string;
  readonly subject: "Maths";
  /** NCERT 2026-27 chapter number. */
  readonly chapter: number;
  /** NCERT Exemplar chapter number, when it differs from `chapter` (the Exemplar numbers its chapters differently). */
  readonly exemplarChapter?: number;
  readonly title: string;
  /** A shorter chapter name, used only when a head title / description would not fit its cap. */
  readonly shortTitle?: string;
  readonly decision: string;
  readonly ncert: readonly PublishSafeRow[];
  readonly exemplar: readonly PublishSafeRow[];
  /**
   * SOLUTIONS-3 (owner ruling 1, 18 Oct 2026): the "CBSE board pattern: Assertion-Reason and
   * case-based questions" section of each published book page. NOT book questions: the page shows
   * them in their own labelled section with their format, never their book reference. Absent = none.
   */
  readonly boardPattern?: {
    readonly ncert: readonly PublishSafeRow[];
    readonly exemplar: readonly PublishSafeRow[];
  };
}

/** The heading of the board-pattern section (one string: page, guard and prerender agree). */
export const BOARD_PATTERN_HEADING = "CBSE board pattern: Assertion-Reason and case-based questions";

const v = (id: string): PublishSafeRow => ({ id, verdict: "value" });
const r = (id: string): PublishSafeRow => ({ id });

export const SOLUTIONS_CHAPTERS: readonly SolutionsChapter[] = [
  {
    slug: "triangles",
    subject: "Maths",
    chapter: 6,
    title: "Triangles",
    decision: "D261",
    ncert: [
      r("TRI-N-NCERT-6-MCQ-001"),
      r("TRI-N-NCERT-6-MCQ-002"),
      r("TRI-N-NCERT-6-VSA-001"),
      v("TRI-N-NCERT-6-SA-001"), // EC = 2 cm
      r("TRI-N-NCERT-6-SA-002"), // "EF is not parallel to QR": yes/no with reason
      r("TRI-N-NCERT-6-SA-003"), // "Yes, EF ∥ QR": yes/no with reason
      v("TRI-N-NCERT-6-SA-005"), // tower = 42 m
      r("TRI-N-NCERT-6-LA-001"), // proof
      r("TRI-N-NCERT-6-LA-003"), // proof
      r("TRI-N-NCERT-6-LA-004"), // proof ("show that")
      r("TRI-N-NCERT-6-LA-005"), // proof ("show that")
      // SOLUTIONS-3 ruling 1: TRI-N-NCERT-6-AR-001 and -CB-001 moved to `boardPattern` below.
    ],
    exemplar: [
      r("TRI-N-EXMPLR-6-MCQ-003"),
      r("TRI-N-EXMPLR-6-MCQ-004"),
      r("TRI-N-EXMPLR-6-MCQ-005"),
      r("TRI-N-EXMPLR-6-MCQ-006"),
      r("TRI-N-EXMPLR-6-MCQ-007"),
      r("TRI-N-EXMPLR-6-SA-002"), // true/false with reason
      r("TRI-N-EXMPLR-6-SA-003"), // yes/no with reason
      r("TRI-N-EXMPLR-6-SA-005"), // true/false with reason
      r("TRI-N-EXMPLR-6-SA-006"), // yes/no with reason
      v("TRI-N-EXMPLR-6-SA-008"), // perimeter = 18 cm
      r("TRI-N-EXMPLR-6-SA-010"), // proof
      // SOLUTIONS-3 ruling 2: TRI-N-EXMPLR-6-SA-011 and -LA-001 (now source "others") removed; Practice Hub only.
      v("TRI-N-EXMPLR-6-SA-012"), // pole = 10 m
      r("TRI-N-EXMPLR-6-LA-003"), // two values (BC and EF)
      r("TRI-N-EXMPLR-6-LA-004"), // proof (BPT)
    ],
    // SOLUTIONS-3 ruling 1: the pilot's AR and case rows, labelled as CBSE board pattern (re-verified
    // in solutions3BoardLedger.ts), on the NCERT page as before.
    boardPattern: {
      ncert: [
        r("TRI-N-NCERT-6-AR-001"),
        r("TRI-N-NCERT-6-CB-001"), // case-based, four parts
      ],
      exemplar: [],
    },
  },
  // <SOLUTIONS-2:BEGIN> generated by scripts/solutions/selectSolutions.ts --write; do not hand-edit
  {
    slug: "real-numbers",
    subject: "Maths",
    chapter: 1,
    title: "Real Numbers",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("RN-N-NCERT-1-MCQ-001"),
      r("RN-N-NCERT-1-MCQ-002"),
      r("RN-N-NCERT-1-MCQ-005"),
      r("RN-N-NCERT-1-SA-001"), // not one comparable value
      r("RN-N-NCERT-1-SA-002"), // more than one value in the answer
      r("RN-N-NCERT-1-SA-003"), // more than one value in the answer
      r("RN-N-NCERT-1-SA-005"), // more than one value in the answer
      r("RN-N-NCERT-1-SA-006"), // more than one value in the answer
      r("RN-N-NCERT-1-SA-007"), // asks for more than one value
      r("RN-N-NCERT-1-SA-009"), // proof
      r("RN-N-NCERT-1-LA-002"), // proof
      r("RN-N-NCERT-1-LA-003"), // proof
      r("RN-N-NCERT-1-LA-004"), // proof
    ],
    exemplar: [
      r("RN-N-EXMPLR-1-MCQ-001"),
      r("RN-N-EXMPLR-1-MCQ-002"),
      r("RN-N-EXMPLR-1-MCQ-003"),
      r("RN-N-EXMPLR-1-MCQ-004"),
      r("RN-N-EXMPLR-1-SA-001"), // yes/no, true/false or verify, with reason
      r("RN-N-EXMPLR-1-SA-002"), // more than one value in the answer
      r("RN-N-EXMPLR-1-SA-003"), // more than one value in the answer
      r("RN-N-EXMPLR-1-SA-006"), // a relation, not one value
      r("RN-N-EXMPLR-1-LA-001"), // proof
    ],
    boardPattern: {
      ncert: [
        r("RN-N-NCERT-1-CB-001"), // case-based
      ],
      exemplar: [
        r("RN-N-EXMPLR-1-CB-001"), // case-based
      ],
    },
  },
  {
    slug: "polynomials",
    subject: "Maths",
    chapter: 2,
    title: "Polynomials",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("POLY-N-NCERT-2-MCQ-001"),
      r("POLY-N-NCERT-2-VSA-001"), // asks for more than one value
      r("POLY-N-NCERT-2-VSA-002"), // asks for more than one value
      r("POLY-N-NCERT-2-SA-001"), // yes/no, true/false or verify, with reason
      r("POLY-N-NCERT-2-SA-002"), // yes/no, true/false or verify, with reason
      r("POLY-N-NCERT-2-SA-004"), // asks for more than one value
    ],
    exemplar: [
      r("POLY-N-EXEM-2-MCQ-001"),
      r("POLY-N-EXEM-2-MCQ-003"),
      r("POLY-N-EXEM-2-MCQ-004"),
      r("POLY-N-EXEM-2-MCQ-006"),
      r("POLY-N-EXEM-2-MCQ-007"),
      r("POLY-N-EXEM-2-VSA-002"), // yes/no, true/false or verify, with reason
      r("POLY-N-EXEM-2-SA-001"), // yes/no, true/false or verify, with reason
      r("POLY-N-EXEM-2-SA-002"), // yes/no, true/false or verify, with reason
      r("POLY-N-EXEM-2-SA-003"), // yes/no, true/false or verify, with reason
    ],
    boardPattern: {
      ncert: [],
      exemplar: [
        r("POLY-N-EXEM-2-AR-001"),
        r("POLY-N-EXEM-2-AR-002"),
        r("POLY-N-EXEM-2-CB-001"), // case-based
      ],
    },
  },
  {
    slug: "pair-of-linear-equations",
    subject: "Maths",
    chapter: 3,
    title: "Pair of Linear Equations in Two Variables",
    shortTitle: "Pair of Linear Equations",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("PLE-N-NCERT-3-MCQ-001"),
      r("PLE-N-NCERT-3-MCQ-002"),
      r("PLE-N-NCERT-3-SA-001"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-002"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-003"), // more than one value in the answer
      r("PLE-N-NCERT-3-MCQ-005"),
      r("PLE-N-NCERT-3-SA-005"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-006"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-007"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-008"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-009"), // more than one value in the answer
      r("PLE-N-NCERT-3-SA-011"), // asks for more than one value
      r("PLE-N-NCERT-3-SA-012"), // asks for more than one value
      r("PLE-N-NCERT-3-LA-001"), // more than one value in the answer
      r("PLE-N-NCERT-3-LA-002"), // more than one value in the answer
      r("PLE-N-NCERT-3-LA-003"), // more than one value in the answer
    ],
    exemplar: [
      r("PLE-N-EXMPLR-3-MCQ-002"),
      r("PLE-N-EXMPLR-3-MCQ-003"),
      r("PLE-N-EXMPLR-3-MCQ-004"),
      r("PLE-N-EXMPLR-3-MCQ-006"),
      r("PLE-N-EXMPLR-3-MCQ-007"),
      r("PLE-N-EXMPLR-3-MCQ-008"),
      r("PLE-N-EXMPLR-3-MCQ-009"),
      r("PLE-N-EXMPLR-3-MCQ-010"),
      r("PLE-N-EXMPLR-3-MCQ-011"),
      r("PLE-N-EXMPLR-3-MCQ-012"),
      r("PLE-N-EXMPLR-3-VSA-001"), // yes/no, true/false or verify, with reason
      r("PLE-N-EXMPLR-3-VSA-002"), // yes/no, true/false or verify, with reason
      r("PLE-N-EXMPLR-3-VSA-003"), // yes/no, true/false or verify, with reason
      r("PLE-N-EXMPLR-3-VSA-004"), // yes/no, true/false or verify, with reason
      r("PLE-N-EXMPLR-3-SA-001"), // multi-part
      v("PLE-N-EXMPLR-3-SA-002"), // k = −6
      r("PLE-N-EXMPLR-3-SA-003"), // asks for more than one value
      r("PLE-N-EXMPLR-3-SA-004"), // yes/no, true/false or verify, with reason
      r("PLE-N-EXMPLR-3-SA-005"), // asks for more than one value
      r("PLE-N-EXMPLR-3-SA-007"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-001"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-002"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-003"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-004"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-005"), // more than one value in the answer
      r("PLE-N-EXMPLR-3-LA-006"), // more than one value in the answer
    ],
    boardPattern: {
      ncert: [
        r("PLE-N-NCERT-3-CB-001"), // case-based
        r("PLE-N-NCERT-3-CB-002"), // case-based
        r("PLE-N-NCERT-3-CB-003"), // case-based
      ],
      exemplar: [],
    },
  },
  {
    slug: "quadratic-equations",
    subject: "Maths",
    chapter: 4,
    title: "Quadratic Equations",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("QE-N-NCERT-4-MCQ-002"),
      r("QE-N-NCERT-4-MCQ-003"),
      r("QE-N-NCERT-4-MCQ-004"),
      r("QE-N-NCERT-4-SA-001"), // yes/no, true/false or verify, with reason
      r("QE-N-NCERT-4-SA-002"), // a relation, not one value
      r("QE-N-NCERT-4-SA-003"), // asks for more than one value
      r("QE-N-NCERT-4-SA-004"), // asks for more than one value
      r("QE-N-NCERT-4-SH-001"), // asks for more than one value
      r("QE-N-NCERT-4-SH-002"), // asks for more than one value
      r("QE-N-NCERT-4-SH-005"), // more than one value in the answer
      r("QE-N-NCERT-4-SH-006"), // more than one value in the answer
      r("QE-N-NCERT-4-SH-007"), // more than one value in the answer
      r("QE-N-NCERT-4-SH-008"), // asks for more than one value
      r("QE-N-NCERT-4-SH-009"), // more than one value in the answer
    ],
    exemplar: [
      r("QE-N-EXMPLR-4-MCQ-003"),
      r("QE-N-EXMPLR-4-MCQ-004"),
      r("QE-N-EXMPLR-4-MCQ-006"),
      r("QE-N-EXMPLR-4-MCQ-008"),
      r("QE-N-EXMPLR-4-MCQ-009"),
      r("QE-N-EXMPLR-4-MCQ-010"),
      r("QE-N-EXMPLR-4-VSA-002"), // yes/no, true/false or verify, with reason
      r("QE-N-EXMPLR-4-VSA-003"), // yes/no, true/false or verify, with reason
      r("QE-N-EXMPLR-4-VSA-004"), // yes/no, true/false or verify, with reason
      r("QE-N-EXMPLR-4-VSA-005"), // yes/no, true/false or verify, with reason
      r("QE-N-EXMPLR-4-SA-001"), // asks for more than one value
      r("QE-N-EXMPLR-4-SA-002"), // asks for more than one value
      r("QE-N-EXMPLR-4-SA-003"), // asks for more than one value
      r("QE-N-EXMPLR-4-SA-004"), // asks for more than one value
      r("QE-N-EXMPLR-4-SA-006"), // yes/no, true/false or verify, with reason
      r("QE-N-EXMPLR-4-SA-007"), // not one comparable value
      r("QE-N-EXMPLR-4-SA-008"), // not one comparable value
      r("QE-N-EXMPLR-4-LA-002"), // not one comparable value
      r("QE-N-EXMPLR-4-LA-003"), // asks for more than one value
      r("QE-N-EXMPLR-4-LA-004"), // not one comparable value
    ],
    boardPattern: {
      ncert: [
        r("QE-N-NCERT-4-AR-001"),
        r("QE-N-NCERT-4-AR-002"),
        r("QE-N-NCERT-4-CB-001"), // case-based
        r("QE-N-NCERT-4-CB-003"), // case-based
      ],
      exemplar: [
        r("QE-N-EXMPLR-4-AR-001"),
        r("QE-N-EXMPLR-4-AR-002"),
        r("QE-N-EXMPLR-4-CB-002"), // case-based
        r("QE-N-EXMPLR-4-CB-003"), // case-based
      ],
    },
  },
  {
    slug: "arithmetic-progression",
    subject: "Maths",
    chapter: 5,
    title: "Arithmetic Progressions",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("AP-N-NCERT-5-MCQ-001"),
      r("AP-N-NCERT-5-MCQ-002"),
      r("AP-N-NCERT-5-MCQ-003"),
      r("AP-N-NCERT-5-MCQ-004"),
      r("AP-N-NCERT-5-MCQ-005"),
      r("AP-N-NCERT-5-VSA-001"), // more than one value in the answer
      r("AP-N-NCERT-5-VSA-002"), // more than one value in the answer
      r("AP-N-NCERT-5-VSA-003"), // not one comparable value
      r("AP-N-NCERT-5-VSA-004"), // not one comparable value
      r("AP-N-NCERT-5-SA-001"), // more than one value in the answer
      v("AP-N-NCERT-5-SA-002"), // 31st term = 178
      v("AP-N-NCERT-5-SA-003"), // Sum = 1661
      r("AP-N-NCERT-5-SA-004"), // more than one value in the answer
      v("AP-N-NCERT-5-SA-005"), // Sum = 960
      v("AP-N-NCERT-5-SA-006"), // 20th term = 200
      r("AP-N-NCERT-5-LA-001"), // more than one value in the answer
      r("AP-N-NCERT-5-LA-002"), // multi-part
      r("AP-N-NCERT-5-LA-003"), // more than one value in the answer
    ],
    exemplar: [
      r("AP-N-EXEM-5-MCQ-001"),
      r("AP-N-EXEM-5-MCQ-002"),
      r("AP-N-EXEM-5-MCQ-003"),
      r("AP-N-EXEM-5-MCQ-004"),
      r("AP-N-EXEM-5-MCQ-005"),
      r("AP-N-EXEM-5-MCQ-006"),
      r("AP-N-EXEM-5-MCQ-007"),
      r("AP-N-EXEM-5-MCQ-008"),
      r("AP-N-EXEM-5-VSA-001"), // yes/no, true/false or verify, with reason
      r("AP-N-EXEM-5-VSA-002"), // yes/no, true/false or verify, with reason
      r("AP-N-EXEM-5-VSA-003"), // yes/no, true/false or verify, with reason
      v("AP-N-EXEM-5-SA-001"), // n = 1
      r("AP-N-EXEM-5-SA-002"), // asks for more than one value
      r("AP-N-EXEM-5-SA-003"), // more than one value in the answer
      r("AP-N-EXEM-5-SA-004"), // not one comparable value
      v("AP-N-EXEM-5-SA-005"), // k = 27
      r("AP-N-EXEM-5-SA-006"), // more than one value in the answer
      r("AP-N-EXEM-5-LA-001"), // more than one value in the answer
      r("AP-N-EXEM-5-LA-002"), // more than one value in the answer
      r("AP-N-EXEM2-5-MCQ-001"),
      r("AP-N-EXEM2-5-MCQ-002"),
      r("AP-N-EXEM2-5-MCQ-003"),
      r("AP-N-EXEM2-5-MCQ-004"),
      r("AP-N-EXEM2-5-MCQ-005"),
      r("AP-N-EXEM2-5-MCQ-007"),
      r("AP-N-EXEM2-5-MCQ-009"),
      r("AP-N-EXEM2-5-MCQ-010"),
      r("AP-N-EXEM2-5-VSA-001"), // yes/no, true/false or verify, with reason
      r("AP-N-EXEM2-5-VSA-002"), // more than one value in the answer
      r("AP-N-EXEM2-5-VSA-003"), // a relation, not one value
      r("AP-N-EXEM2-5-SA-001"), // more than one value in the answer
      r("AP-N-EXEM2-5-SA-002"), // more than one value in the answer
      r("AP-N-EXEM2-5-SA-003"), // more than one value in the answer
      r("AP-N-EXEM2-5-SA-004"), // asks for more than one value
      v("AP-N-EXEM2-5-SA-005"), // −78
      r("AP-N-EXEM2-5-SA-006"), // more than one value in the answer
      r("AP-N-EXEM2-5-SA-007"), // more than one value in the answer
      v("AP-N-EXEM2-5-SA-008"), // 1170
      v("AP-N-EXEM2-5-LA-001"), // S₂₀ = 970
      r("AP-N-EXEM2-5-LA-002"), // more than one value in the answer
      r("AP-N-EXEM2-5-LA-003"), // more than one value in the answer
    ],
    boardPattern: {
      ncert: [
        r("AP-N-NCERT-5-AR-001"),
        r("AP-N-NCERT-5-CB-002"), // case-based
      ],
      exemplar: [
        r("AP-N-EXEM-5-AR-001"),
        r("AP-N-EXEM-5-CB-001"), // case-based
      ],
    },
  },
  {
    slug: "coordinate-geometry",
    subject: "Maths",
    chapter: 7,
    title: "Coordinate Geometry",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("CG-N-NCERT-7-EX-001"), // not one comparable value
      r("CG-N-NCERT-7-EX-002"), // proof
      r("CG-N-NCERT-7-EX-004"), // a relation, not one value
      r("CG-N-NCERT-7-EX-005"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-006"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-007"), // not one comparable value
      r("CG-N-NCERT-7-EX-008"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-009"), // asks for more than one value
      v("CG-N-NCERT-7-EX-010"), // p = 7
      r("CG-N-NCERT-7-EX-012"), // not one comparable value
      r("CG-N-NCERT-7-EX-013"), // not one comparable value
      r("CG-N-NCERT-7-EX-015"), // approximate / rounded key
      r("CG-N-NCERT-7-EX-016"), // yes/no, true/false or verify, with reason
      r("CG-N-NCERT-7-EX-017"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-018"), // asks for more than one value
      r("CG-N-NCERT-7-EX-019"), // a relation, not one value
      r("CG-N-NCERT-7-EX-020"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-021"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-022"), // not one comparable value
      r("CG-N-NCERT-7-EX-023"), // asks for more than one value
      r("CG-N-NCERT-7-EX-024"), // more than one value in the answer
      r("CG-N-NCERT-7-EX-025"), // more than one value in the answer
    ],
    exemplar: [
      r("CG-N-EXMPLR-7-EX-001"),
      r("CG-N-EXMPLR-7-EX-002"),
      r("CG-N-EXMPLR-7-EX-003"),
      r("CG-N-EXMPLR-7-EX-004"),
      r("CG-N-EXMPLR-7-EX-005"),
      r("CG-N-EXMPLR-7-EX-007"),
      r("CG-N-EXMPLR-7-EX-008"),
      r("CG-N-EXMPLR-7-EX-009"),
      r("CG-N-EXMPLR-7-EX-011"),
      r("CG-N-EXMPLR-7-EX-014"), // yes/no, true/false or verify, with reason
      r("CG-N-EXMPLR-7-EX-015"), // yes/no, true/false or verify, with reason
      r("CG-N-EXMPLR-7-EX-016"), // more than one value in the answer
      v("CG-N-EXMPLR-7-EX-017"), // a = −3
      r("CG-N-EXMPLR-7-EX-020"), // more than one value in the answer
      r("CG-N-EXMPLR-7-EX-022"), // more than one value in the answer
      r("CG-N-EXEM2-7-MCQ-001"),
      r("CG-N-EXEM2-7-MCQ-003"),
      r("CG-N-EXEM2-7-MCQ-004"),
      r("CG-N-EXEM2-7-MCQ-005"),
      r("CG-N-EXEM2-7-VSA-001"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-002"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-003"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-004"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-005"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-006"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-VSA-007"), // yes/no, true/false or verify, with reason
      r("CG-N-EXEM2-7-SA-001"), // not one comparable value
      r("CG-N-EXEM2-7-SA-002"), // not one comparable value
      r("CG-N-EXEM2-7-SA-003"), // more than one value in the answer
      r("CG-N-EXEM2-7-SA-004"), // more than one value in the answer
      r("CG-N-EXEM2-7-SA-005"), // asks for more than one value
      r("CG-N-EXEM2-7-SA-006"), // ratio answer
      r("CG-N-EXEM2-7-SA-007"), // more than one value in the answer
      r("CG-N-EXEM2-7-SA-008"), // more than one value in the answer
      r("CG-N-EXEM2-7-SA-009"), // asks for more than one value
    ],
    boardPattern: {
      ncert: [
        r("CG-N-NCERT-7-EX-003"), // case-based
      ],
      exemplar: [
        r("CG-N-EXMPLR-7-EX-023"), // case-based
        r("CG-N-EXMPLR-7-EX-024"),
      ],
    },
  },
  {
    slug: "introduction-to-trigonometry",
    bank: "trigonometry",
    subject: "Maths",
    chapter: 8,
    title: "Introduction to Trigonometry",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("TRIG-N-NCERT-8-SA-001"), // more than one value in the answer
      r("TRIG-N-NCERT-8-SA-002"), // more than one value in the answer
      r("TRIG-N-NCERT-8-SA-003"), // more than one value in the answer
      r("TRIG-N-NCERT-8-LA-001"), // more than one value in the answer
      v("TRIG-N-NCERT-8-SA-004"), // 49/64
      v("TRIG-N-NCERT-8-SA-005"), // 1
      r("TRIG-N-NCERT-8-MCQ-001"),
      v("TRIG-N-NCERT-8-SA-006"), // 1
      v("TRIG-N-NCERT-8-SA-007"), // 2
      r("TRIG-N-NCERT-8-MCQ-002"),
      r("TRIG-N-NCERT-8-SA-008"), // more than one value in the answer
      r("TRIG-N-NCERT-8-MCQ-003"),
      r("TRIG-N-NCERT-8-MCQ-004"),
      r("TRIG-N-NCERT-8-LA-002"), // proof
      r("TRIG-N-NCERT-8-LA-003"), // proof
    ],
    exemplar: [
      r("TRIG-N-EXMPLR-8-MCQ-001"),
      r("TRIG-N-EXMPLR-8-MCQ-002"),
      r("TRIG-N-EXMPLR-8-MCQ-004"),
      r("TRIG-N-EXMPLR-8-MCQ-007"),
      r("TRIG-N-EXMPLR-8-MCQ-008"),
      r("TRIG-N-EXMPLR-8-MCQ-009"),
      r("TRIG-N-EXMPLR-8-MCQ-010"),
      r("TRIG-N-EXMPLR-8-MCQ-011"),
      r("TRIG-N-EXMPLR-8-SA-002"), // yes/no, true/false or verify, with reason
      r("TRIG-N-EXMPLR-8-SA-003"), // proof
      r("TRIG-N-EXMPLR-8-SA-004"), // proof
      v("TRIG-N-EXMPLR-8-SA-005"), // −1/2
      v("TRIG-N-EXMPLR-8-SA-006"), // 1
      r("TRIG-N-EXMPLR-8-SA-007"), // not one comparable value
      r("TRIG-N-EXMPLR-8-LA-002"), // proof
      r("TRIG-N-EXMPLR-8-LA-003"), // proof
    ],
  },
  {
    slug: "some-applications-of-trigonometry",
    bank: "trigonometry",
    subject: "Maths",
    chapter: 9,
    exemplarChapter: 8,
    title: "Some Applications of Trigonometry",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("TRIG-N-NCERT-9-SA-001"), // approximate / rounded key
      r("TRIG-N-NCERT-9-LA-001"), // more than one value in the answer
      r("TRIG-N-NCERT-9-LA-002"), // approximate / rounded key
      v("TRIG-N-NCERT-9-SA-002"), // Height of the pole = 10 m
      r("TRIG-N-NCERT-9-SA-003"), // approximate / rounded key
      r("TRIG-N-NCERT-9-SA-004"), // approximate / rounded key
      r("TRIG-N-NCERT-9-SA-005"), // approximate / rounded key
      r("TRIG-N-NCERT-9-LA-003"), // approximate / rounded key
      r("TRIG-N-NCERT-9-LA-004"), // approximate / rounded key
      r("TRIG-N-NCERT-9-LA-005"), // approximate / rounded key
      r("TRIG-N-NCERT-9-LA-006"), // approximate / rounded key
    ],
    exemplar: [
      r("TRIG-N-EXMPLR-9-MCQ-001"),
      r("TRIG-N-EXMPLR-9-SA-001"), // yes/no, true/false or verify, with reason
      r("TRIG-N-EXMPLR-9-SA-002"), // yes/no, true/false or verify, with reason
      r("TRIG-N-EXMPLR-9-SA-003"), // yes/no, true/false or verify, with reason
      r("TRIG-N-EXMPLR-9-SA-004"), // not one comparable value
      r("TRIG-N-EXMPLR-9-SA-006"), // not one comparable value
      r("TRIG-N-EXMPLR-9-LA-001"), // approximate / rounded key
      r("TRIG-N-EXMPLR-9-LA-003"), // approximate / rounded key
      r("TRIG-N-EXMPLR-9-LA-004"), // more than one value in the answer
      r("TRIG-N-EXMPLR-9-LA-005"), // approximate / rounded key
    ],
    boardPattern: {
      ncert: [],
      exemplar: [
        r("TRIG-N-EXMPLR-9-CB-002"), // case-based
      ],
    },
  },
  {
    slug: "circles",
    subject: "Maths",
    chapter: 10,
    exemplarChapter: 9,
    title: "Circles",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("CIRC-N-NCERT-10-MCQ-001"),
      r("CIRC-N-NCERT-10-MCQ-002"),
      r("CIRC-N-NCERT-10-MCQ-004"),
      r("CIRC-N-NCERT-10-VSA-001"), // multi-part
      v("CIRC-N-NCERT-10-VSA-002"), // Radius = 3 cm
      r("CIRC-N-NCERT-10-LA-002"), // proof
    ],
    exemplar: [
      r("CIRC-N-EXEM-10-MCQ-001"),
      r("CIRC-N-EXEM-10-MCQ-002"),
      r("CIRC-N-EXEM-10-MCQ-003"),
      r("CIRC-N-EXEM-10-MCQ-004"),
      r("CIRC-N-EXEM-10-MCQ-005"),
      r("CIRC-N-EXEM-10-MCQ-006"),
      r("CIRC-N-EXEM-10-VSA-001"), // yes/no, true/false or verify, with reason
      r("CIRC-N-EXEM-10-VSA-002"), // yes/no, true/false or verify, with reason
      r("CIRC-N-EXEM-10-VSA-003"), // yes/no, true/false or verify, with reason
      v("CIRC-N-EXEM-10-SA-001"), // Radius of inner circle = 3 cm
      r("CIRC-N-EXEM-10-SA-003"), // proof
      r("CIRC-N-EXEM-10-SA-005"), // proof
      v("CIRC-N-EXEM-10-LA-001"), // Perimeter of ∆PCD = 20 cm
      r("CIRC-N-EXEM-10-LA-002"), // proof
    ],
    boardPattern: {
      ncert: [],
      exemplar: [
        r("CIRC-N-EXEM-10-AR-001"),
        r("CIRC-N-EXEM-10-CB-001"), // case-based
      ],
    },
  },
  {
    slug: "areas-related-to-circles",
    subject: "Maths",
    chapter: 11,
    title: "Areas Related to Circles",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("ARC-N-NCERT-11-MCQ-002"),
      r("ARC-N-NCERT-11-MCQ-005"),
      r("ARC-N-NCERT-11-VSA-001"), // more than one value in the answer
      r("ARC-N-NCERT-11-VSA-002"), // approximate / rounded key
      r("ARC-N-NCERT-11-SA-001"), // multi-part
      r("ARC-N-NCERT-11-SA-002"), // approximation in the question
      r("ARC-N-NCERT-11-SA-003"), // approximation in the question
    ],
    exemplar: [
      r("ARC-N-EXEM-11-MCQ-001"),
      r("ARC-N-EXEM-11-MCQ-002"),
      r("ARC-N-EXEM-11-MCQ-004"),
      r("ARC-N-EXEM-11-MCQ-005"),
      r("ARC-N-EXEM-11-MCQ-006"),
      r("ARC-N-EXEM-11-VSA-001"), // yes/no, true/false or verify, with reason
      r("ARC-N-EXEM-11-VSA-002"), // yes/no, true/false or verify, with reason
      r("ARC-N-EXEM-11-VSA-003"), // yes/no, true/false or verify, with reason
      v("ARC-N-EXEM-11-SA-001"), // r = 33 cm
      r("ARC-N-EXEM-11-SA-002"), // not one comparable value
      r("ARC-N-EXEM-11-SA-003"), // not one comparable value
      r("ARC-N-EXEM-11-SA-004"), // not one comparable value
      r("ARC-N-EXEM-11-SA-005"), // approximate / rounded key
      r("ARC-N-EXEM-11-SA-006"), // approximate / rounded key
      r("ARC-N-EXEM-11-LA-001"), // approximation in the question
      r("ARC-N-EXEM-11-LA-002"), // not one comparable value
      r("ARC-N-EXEM2-11-MCQ-001"),
      r("ARC-N-EXEM2-11-MCQ-002"),
      r("ARC-N-EXEM2-11-MCQ-003"),
      r("ARC-N-EXEM2-11-MCQ-004"),
      r("ARC-N-EXEM2-11-VSA-001"), // more than one value in the answer
      r("ARC-N-EXEM2-11-VSA-003"), // more than one value in the answer
      r("ARC-N-EXEM2-11-VSA-004"), // more than one value in the answer
      r("ARC-N-EXEM2-11-VSA-005"), // more than one value in the answer
      r("ARC-N-EXEM2-11-VSA-006"), // more than one value in the answer
      r("ARC-N-EXEM2-11-SA-001"), // not one comparable value
      r("ARC-N-EXEM2-11-SA-002"), // not one comparable value
      r("ARC-N-EXEM2-11-SA-003"), // not one comparable value
      r("ARC-N-EXEM2-11-SA-005"), // approximation in the question
      r("ARC-N-EXEM2-11-SA-006"), // not one comparable value
      r("ARC-N-EXEM2-11-SA-008"), // approximate / rounded key
      r("ARC-N-EXEM2-11-SA-009"), // approximate / rounded key
      r("ARC-N-EXEM2-11-SA-010"), // not one comparable value
      r("ARC-N-EXEM2-11-SA-011"), // not one comparable value
      r("ARC-N-EXEM2-11-LA-002"), // more than one value in the answer
    ],
    boardPattern: {
      ncert: [],
      exemplar: [
        r("ARC-N-EXEM-11-AR-002"),
        r("ARC-N-EXEM-11-CB-001"), // case-based
      ],
    },
  },
  {
    slug: "surface-areas-and-volumes",
    subject: "Maths",
    chapter: 12,
    title: "Surface Areas and Volumes",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("SAV-N-NCERT-12-MCQ-001"),
      r("SAV-N-NCERT-12-VSA-001"), // more than one value in the answer
      r("SAV-N-NCERT-12-SA-001"), // approximation in the question
      r("SAV-N-NCERT-12-SA-004"), // approximation in the question
      r("SAV-N-NCERT-12-SA-005"), // approximation in the question
      r("SAV-N-NCERT-12-SA-006"), // approximation in the question
      r("SAV-N-NCERT-12-SA-007"), // approximation in the question
      r("SAV-N-NCERT-12-LA-004"), // approximation in the question
    ],
    exemplar: [
      r("SAV-N-EXMPLR-12-MCQ-011"),
      r("SAV-N-EXMPLR-12-MCQ-012"),
      r("SAV-N-EXMPLR-12-MCQ-013"),
      r("SAV-N-EXMPLR-12-VSA-001"), // yes/no, true/false or verify, with reason
      r("SAV-N-EXMPLR-12-VSA-002"), // yes/no, true/false or verify, with reason
      r("SAV-N-EXMPLR-12-SA-003"), // not one comparable value
      r("SAV-N-EXMPLR-12-SA-004"), // approximation in the question
      r("SAV-N-EXMPLR-12-SA-005"), // more than one value in the answer
      r("SAV-N-EXMPLR-12-LA-006"), // approximation in the question
      r("SAV-N-EXMPLR-12-LA-008"), // more than one value in the answer
      r("SAV-N-EXEM2-12-VSA-001"), // yes/no, true/false or verify, with reason
      v("SAV-N-EXEM2-12-LA-009"), // Height of the building = 4 m
      r("SAV-N-EXEM2-12-LA-011"), // not one comparable value
    ],
    boardPattern: {
      ncert: [
        r("SAV-N-NCERT-12-CB-001"), // case-based
      ],
      exemplar: [
        r("SAV-N-EXMPLR-12-AR-002"),
      ],
    },
  },
  {
    slug: "statistics",
    subject: "Maths",
    chapter: 13,
    title: "Statistics",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("STAT-N-NCERT-13-SA-002"), // not one comparable value
      r("STAT-N-NCERT-13-SA-003"), // approximate / rounded key
      r("STAT-N-NCERT-13-SA-004"), // approximate / rounded key
      r("STAT-N-NCERT-13-SA-005"), // approximate / rounded key
      v("STAT-N-NCERT-13-SA-006"), // Missing frequency f = 20
      r("STAT-N-NCERT-13-LA-001"), // more than one value in the answer
      r("STAT-N-NCERT-13-LA-002"), // more than one value in the answer
    ],
    exemplar: [
      r("STAT-N-EXEM-13-MCQ-001"),
      r("STAT-N-EXEM-13-MCQ-003"),
      r("STAT-N-EXEM-13-MCQ-005"),
      r("STAT-N-EXEM-13-VSA-001"), // yes/no, true/false or verify, with reason
      v("STAT-N-EXEM-13-SA-001"), // Mean = 35
      v("STAT-N-EXEM-13-SA-002"), // Mean = 5.5
      r("STAT-N-EXEM-13-SA-003"), // approximate / rounded key
      r("STAT-N-EXEM-13-SA-004"), // approximate / rounded key
      r("STAT-N-EXEM-13-SA-005"), // approximate / rounded key
      r("STAT-N-EXEM-13-SA-006"), // approximate / rounded key
      r("STAT-N-EXEM-13-LA-001"), // approximate / rounded key
      r("STAT-N-EXEM-13-LA-002"), // approximate / rounded key
      r("STAT-N-EXEM2-13-MCQ-001"),
      r("STAT-N-EXEM2-13-MCQ-002"),
      r("STAT-N-EXEM2-13-MCQ-003"),
      r("STAT-N-EXEM2-13-MCQ-004"),
      r("STAT-N-EXEM2-13-MCQ-005"),
      r("STAT-N-EXEM2-13-VSA-001"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-001"), // not one comparable value
      r("STAT-N-EXEM2-13-SA-002"), // not one comparable value
      r("STAT-N-EXEM2-13-SA-003"), // approximate / rounded key
      r("STAT-N-EXEM2-13-SA-004"), // not one comparable value
      r("STAT-N-EXEM2-13-SA-005"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-008"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-010"), // not one comparable value
    ],
    boardPattern: {
      ncert: [
        r("STAT-N-NCERT-13-CB-001"), // case-based
      ],
      exemplar: [],
    },
  },
  {
    slug: "probability",
    subject: "Maths",
    chapter: 14,
    exemplarChapter: 13,
    title: "Probability",
    decision: "SOLUTIONS-2 (owner 18 Oct)",
    ncert: [
      r("PROB-N-NCERT-14-MCQ-001"),
      r("PROB-N-NCERT-14-MCQ-002"),
      r("PROB-N-NCERT-14-MCQ-003"),
      r("PROB-N-NCERT-14-MCQ-004"),
      r("PROB-N-NCERT-14-MCQ-005"),
      r("PROB-N-NCERT-14-MCQ-006"),
      r("PROB-N-NCERT-14-VSA-001"), // multi-part
      r("PROB-N-NCERT-14-VSA-002"), // multi-part
      r("PROB-N-NCERT-14-VSA-003"), // more than one value in the answer
      r("PROB-N-NCERT-14-SA-001"), // multi-part
      r("PROB-N-NCERT-14-SA-002"), // multi-part
      r("PROB-N-NCERT-14-SA-003"), // multi-part
      r("PROB-N-NCERT-14-SA-004"), // multi-part
      r("PROB-N-NCERT-14-SA-005"), // a relation, not one value
    ],
    exemplar: [
      r("PROB-N-EXEM-14-MCQ-001"),
      r("PROB-N-EXEM-14-MCQ-002"),
      r("PROB-N-EXEM-14-MCQ-003"),
      r("PROB-N-EXEM-14-MCQ-004"),
      r("PROB-N-EXEM-14-MCQ-005"),
      r("PROB-N-EXEM-14-MCQ-006"),
      r("PROB-N-EXEM-14-MCQ-007"),
      r("PROB-N-EXEM-14-MCQ-008"),
      r("PROB-N-EXEM-14-VSA-001"), // multi-part
      r("PROB-N-EXEM-14-VSA-002"), // multi-part
      r("PROB-N-EXEM-14-SA-001"), // multi-part
      r("PROB-N-EXEM-14-SA-002"), // multi-part
      r("PROB-N-EXEM-14-SA-003"), // multi-part
      r("PROB-N-EXEM-14-SA-004"), // multi-part
      r("PROB-N-EXEM-14-SA-005"), // multi-part
      r("PROB-N-EXEM-14-LA-001"), // multi-part
      r("PROB-N-EXEM-14-LA-002"), // multi-part
    ],
    boardPattern: {
      ncert: [
        r("PROB-N-NCERT-14-AR-002"),
      ],
      exemplar: [],
    },
  },
  // <SOLUTIONS-2:END>
];

export function solutionsChapter(slug: string): SolutionsChapter | null {
  return SOLUTIONS_CHAPTERS.find((c) => c.slug === slug) ?? null;
}

/** The solutions chapter for an NCERT book row (topics.ts slug + NCERT chapter number), or null. */
export function solutionsChapterForNcert(bankSlug: string, chapter: number): SolutionsChapter | null {
  return SOLUTIONS_CHAPTERS.find((c) => (c.bank ?? c.slug) === bankSlug && c.chapter === chapter) ?? null;
}

/** The bank chapter (and notes / topics.ts slug) a solutions chapter reads. */
export function bankSlugOf(ch: SolutionsChapter): string {
  return ch.bank ?? ch.slug;
}

/** The chapter number as the book in question numbers it. */
export function bookChapterNo(ch: SolutionsChapter, book: SolutionsBook): number {
  return book === "exemplar" ? (ch.exemplarChapter ?? ch.chapter) : ch.chapter;
}

/** A book page exists only when it has at least one allowlisted id (never an empty page). */
export function hasBook(ch: SolutionsChapter, book: SolutionsBook): boolean {
  return ch[book].length > 0;
}

/** The published books of a chapter, NCERT first. */
export function booksOf(ch: SolutionsChapter): SolutionsBook[] {
  return (["ncert", "exemplar"] as const).filter((b) => hasBook(ch, b));
}

const BOOK_NAME: Readonly<Record<SolutionsBook, string>> = {
  ncert: "NCERT Solutions",
  exemplar: "NCERT Exemplar Solutions",
};
const BOOK_SHORT: Readonly<Record<SolutionsBook, string>> = {
  ncert: "NCERT Solutions",
  exemplar: "NCERT Exemplar",
};
const BOOK_ADJ: Readonly<Record<SolutionsBook, string>> = {
  ncert: "NCERT",
  exemplar: "NCERT Exemplar",
};

export function solutionsBookName(book: SolutionsBook): string {
  return BOOK_NAME[book];
}

/** The page's h1 (and, when it fits, its head title). */
export function solutionsTitle(book: SolutionsBook, ch: SolutionsChapter): string {
  return `${BOOK_NAME[book]} Class 10 ${ch.subject} Chapter ${bookChapterNo(ch, book)} ${ch.title}`;
}

export const SOLUTIONS_HEAD_TITLE_CAP = 60;
export const SOLUTIONS_HEAD_DESCRIPTION_CAP = 155;

/**
 * The head title: the h1 when it fits 60 characters, else the first shorter form that does
 * ("Ch" for "Chapter", then without "Maths" / "Class 10" / with the short title while the full
 * book name still fits, then the short book name).
 * THROWS when none fits: shorter text, never a cap exception.
 */
export function solutionsHeadTitle(book: SolutionsBook, ch: SolutionsChapter): string {
  const n = bookChapterNo(ch, book);
  const s = ch.shortTitle ?? ch.title;
  // The full book name ("… Solutions") is kept as long as any form with it fits; only then the short one.
  const ladder = [
    solutionsTitle(book, ch),
    `${BOOK_NAME[book]} Class 10 ${ch.subject} Ch ${n} ${ch.title}`,
    `${BOOK_NAME[book]} Class 10 Ch ${n} ${ch.title}`,
    `${BOOK_NAME[book]} Class 10 ${ch.subject} Ch ${n} ${s}`,
    `${BOOK_NAME[book]} Class 10 Ch ${n} ${s}`,
    `${BOOK_NAME[book]} Ch ${n} ${ch.title}`,
    `${BOOK_NAME[book]} Ch ${n} ${s}`,
    `${BOOK_SHORT[book]} Class 10 ${ch.subject} Ch ${n} ${ch.title}`,
    `${BOOK_SHORT[book]} Class 10 Ch ${n} ${ch.title}`,
    `${BOOK_SHORT[book]} Ch ${n} ${ch.title}`,
    `${BOOK_SHORT[book]} Class 10 Ch ${n} ${s}`,
  ];
  const fit = ladder.find((t) => t.length <= SOLUTIONS_HEAD_TITLE_CAP);
  if (!fit) throw new Error(`solutions: no head title for ${solutionsPath(book, ch.slug)} fits ${SOLUTIONS_HEAD_TITLE_CAP} characters`);
  return fit;
}

/** The head description (<= 155 characters; THROWS when no form fits). */
export function solutionsHeadDescription(book: SolutionsBook, ch: SolutionsChapter): string {
  const n = bookChapterNo(ch, book);
  const lead = (t: string) => `Step-by-step ${BOOK_ADJ[book]} solutions for Class 10 ${ch.subject} Chapter ${n} ${t}.`;
  const tail = " Try each question first, then see the full solution, free.";
  const ladder = [
    `${lead(ch.title)}${tail} No account needed.`,
    `${lead(ch.title)}${tail}`,
    `${lead(ch.title)} Try each question first, then see the full solution.`,
    `${lead(ch.shortTitle ?? ch.title)}${tail}`,
  ];
  const fit = ladder.find((t) => t.length <= SOLUTIONS_HEAD_DESCRIPTION_CAP);
  if (!fit) throw new Error(`solutions: no head description for ${solutionsPath(book, ch.slug)} fits ${SOLUTIONS_HEAD_DESCRIPTION_CAP}`);
  return fit;
}

/** The BreadcrumbList name of the page (Home › NCERT Books › this). */
export function solutionsBreadcrumbName(book: SolutionsBook, ch: SolutionsChapter): string {
  return `${BOOK_NAME[book]} Chapter ${bookChapterNo(ch, book)} ${ch.title}`;
}

/** The page's line in public/llms.txt (scripts/solutions/writeLlmsSolutions.ts writes them). */
export function solutionsLlmsLine(book: SolutionsBook, ch: SolutionsChapter, origin: string): string {
  const n = bookChapterNo(ch, book);
  const url = `${origin}${solutionsPath(book, ch.slug)}`;
  const what =
    book === "ncert"
      ? `the NCERT textbook questions of Chapter ${n} with step-by-step solutions; try each question first, then see the full solution`
      : `NCERT Exemplar questions of Chapter ${n} with step-by-step solutions`;
  return `- [${solutionsTitle(book, ch)}](${url}): ${what}`;
}

/** Every published page's llms.txt line, in `solutionsPaths()` order. */
export function solutionsLlmsLines(origin: string): string[] {
  return SOLUTIONS_CHAPTERS.flatMap((ch) => booksOf(ch).map((b) => solutionsLlmsLine(b, ch, origin)));
}

/** The chapter and book for a published path, or null (unknown slug, or a book with no rows). */
export function solutionsPageFor(path: string): { book: SolutionsBook; ch: SolutionsChapter } | null {
  const m = /^\/(ncert-solutions|ncert-exemplar)\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  const book: SolutionsBook = m[1] === "ncert-solutions" ? "ncert" : "exemplar";
  const ch = solutionsChapter(m[2]);
  return ch && hasBook(ch, book) ? { book, ch } : null;
}

/**
 * The published rows of one book, in allowlist order: allowlist ∩ the SERVED rows given
 * (the chapter loader's rows, which never include a withheld id). An allowlisted id that is
 * not served (withheld later, or removed) is simply absent — never a placeholder.
 */
export function publishedRows<Q extends { id: string }>(
  served: readonly Q[],
  chapter: SolutionsChapter,
  book: SolutionsBook,
): Array<{ q: Q; safe: PublishSafeRow }> {
  const byId = new Map(served.map((q) => [q.id, q] as const));
  const out: Array<{ q: Q; safe: PublishSafeRow }> = [];
  for (const safe of chapter[book]) {
    const q = byId.get(safe.id);
    if (q) out.push({ q, safe });
  }
  return out;
}

/** SOLUTIONS-3: the board-pattern rows of one book page, allowlist ∩ served (same contract as `publishedRows`). */
export function boardPatternRows<Q extends { id: string }>(
  served: readonly Q[],
  chapter: SolutionsChapter,
  book: SolutionsBook,
): Array<{ q: Q; safe: PublishSafeRow }> {
  const byId = new Map(served.map((q) => [q.id, q] as const));
  const out: Array<{ q: Q; safe: PublishSafeRow }> = [];
  for (const safe of chapter.boardPattern?.[book] ?? []) {
    const q = byId.get(safe.id);
    if (q) out.push({ q, safe });
  }
  return out;
}

/** "Assertion-Reason" / "Case-based" for a board-pattern card (from the row's format; options mean AR). */
export function boardPatternLabel(q: { format?: string; options?: readonly string[] | null }): string {
  if (/assertion/i.test(String(q.format ?? "")) || (Array.isArray(q.options) && q.options.length > 0)) return "Assertion-Reason";
  return "Case-based";
}
