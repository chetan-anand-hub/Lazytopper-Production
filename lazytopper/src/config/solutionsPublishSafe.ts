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
  /**
   * SOLUTIONS-SCI-2: the row's answer is a bound solution figure (an eye-checked NCERT crop or a
   * computed ray diagram, `src/diagrams/registry`), shown in the solution. Set only by the Science
   * selection script; the page renders <SolutionFigure> for these rows and no other.
   */
  readonly figure?: true;
}

export interface SolutionsChapter {
  /** URL slug. The canonical topics.ts slug, unless the bank chapter spans two NCERT chapters. */
  readonly slug: string;
  /** Bank chapter / topics.ts / notes slug, when it differs from `slug` (trigonometry → Ch 8 and Ch 9). */
  readonly bank?: string;
  readonly subject: "Maths" | "Science";
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
const f = (id: string): PublishSafeRow => ({ id, figure: true });

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
      r("STAT-N-EXEM-13-MCQ-004"),
      r("STAT-N-EXEM-13-MCQ-005"),
      r("STAT-N-EXEM-13-MCQ-006"),
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
      r("STAT-N-EXEM2-13-SA-006"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-007"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-008"), // more than one value in the answer
      r("STAT-N-EXEM2-13-SA-009"), // more than one value in the answer
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
  // <SOLUTIONS-SCI:BEGIN> generated by scripts/solutions/selectScienceSolutions.ts --write; do not hand-edit
  {
    slug: "chemical-reactions-and-equations",
    subject: "Science",
    chapter: 1,
    title: "Chemical Reactions and Equations",
    shortTitle: "Chemical Reactions",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("CHEM-NCERT-1-VSA-001"), // not one comparable value
      r("CHEM-NCERT-1-SA-003"), // multi-part
      r("CHEM-NCERT-1-VSA-003"), // more than one value in the answer
      r("CHEM-NCERT-1-VSA-004"), // not one comparable value
      r("CHEM-NCERT-1-MCQ-002"),
      r("CHEM-NCERT-1-MCQ-003"),
      r("CHEM-NCERT-1-SA-007"), // multi-part
      r("CHEM-NCERT-1-VSA-005"), // not one comparable value
      r("CHEM-NCERT-1-SA-014"), // not one comparable value
      r("CHEM-NCERT-1-VSA-006"), // more than one value in the answer
    ],
    exemplar: [
      r("CHEM-EXMPLR-1-MCQ-001"),
      r("CHEM-EXMPLR-1-MCQ-004"),
      r("CHEM-EXMPLR-1-MCQ-005"),
      r("CHEM-EXMPLR-1-MCQ-010"),
      r("CHEM-EXMPLR-1-MCQ-013"),
      r("CHEM-EXMPLR-1-MCQ-016"),
      r("CHEM-EXMPLR-1-SA-001"), // multi-part
      r("CHEM-EXMPLR-1-SA-004"), // asks for more than one value
      r("CHEM-EXMPLR-1-SA-005"), // more than one value in the answer
      r("CHEM-EXMPLR-1-SA-020"), // more than one value in the answer
    ],
  },
  {
    slug: "acids-bases-and-salts",
    subject: "Science",
    chapter: 2,
    title: "Acids, Bases and Salts",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("ACID-NCERT-2-VSA-002"), // not one comparable value
      r("ACID-NCERT-2-VSA-005"), // more than one value in the answer
      r("ACID-NCERT-2-VSA-007"), // not one comparable value
      r("ACID-NCERT-2-VSA-008"), // more than one value in the answer
      r("ACID-NCERT-2-VSA-009"), // asks for more than one value
      r("ACID-NCERT-2-VSA-010"), // not one comparable value
      r("ACID-NCERT-2-SA-004"), // not one comparable value
      r("ACID-NCERT-2-VSA-014"), // not one comparable value
      r("ACID-NCERT-2-MCQ-001"),
      r("ACID-NCERT-2-MCQ-002"),
      r("ACID-NCERT-2-MCQ-004"),
      r("ACID-NCERT-2-SA-006"), // multi-part
      r("ACID-NCERT-2-VSA-017"), // asks for more than one value
      r("ACID-NCERT-2-VSA-020"), // more than one value in the answer
      r("ACID-NCERT-2-VSA-021"), // not one comparable value
    ],
    exemplar: [
      r("ACID-EXMPLR-2-MCQ-001"),
      r("ACID-EXMPLR-2-MCQ-002"),
      r("ACID-EXMPLR-2-MCQ-004"),
      r("ACID-EXMPLR-2-MCQ-007"),
      r("ACID-EXMPLR-2-MCQ-009"),
      r("ACID-EXMPLR-2-MCQ-010"),
      r("ACID-EXMPLR-2-MCQ-012"),
      r("ACID-EXMPLR-2-MCQ-013"),
      r("ACID-EXMPLR-2-MCQ-014"),
      r("ACID-EXMPLR-2-MCQ-016"),
      r("ACID-EXMPLR-2-MCQ-017"),
      r("ACID-EXMPLR-2-MCQ-019"),
      r("ACID-EXMPLR-2-MCQ-028"),
      r("ACID-EXMPLR-2-MCQ-029"),
      r("ACID-EXMPLR-2-MCQ-030"),
      r("ACID-EXMPLR-2-SA-005"), // not one comparable value
    ],
  },
  {
    slug: "metals-and-non-metals",
    subject: "Science",
    chapter: 3,
    title: "Metals and Non-metals",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("METAL-NCERT-3-VSA-001"), // multi-part
      r("METAL-NCERT-3-MCQ-001"),
      r("METAL-NCERT-3-MCQ-003"),
      r("METAL-NCERT-3-VSA-009"), // more than one value in the answer
      r("METAL-NCERT-3-VSA-010"), // more than one value in the answer
    ],
    exemplar: [
      r("METAL-EXMPLR-3-MCQ-002"),
      r("METAL-EXMPLR-3-MCQ-003"),
      r("METAL-EXMPLR-3-MCQ-004"),
      r("METAL-EXMPLR-3-MCQ-006"),
      r("METAL-EXMPLR-3-MCQ-007"),
      r("METAL-EXMPLR-3-MCQ-008"),
      r("METAL-EXMPLR-3-MCQ-009"),
      r("METAL-EXMPLR-3-MCQ-012"),
      r("METAL-EXMPLR-3-MCQ-017"),
      r("METAL-EXMPLR-3-MCQ-018"),
      r("METAL-EXMPLR-3-MCQ-019"),
      r("METAL-EXMPLR-3-MCQ-020"),
      r("METAL-EXMPLR-3-MCQ-023"),
      r("METAL-EXMPLR-3-MCQ-024"),
      r("METAL-EXMPLR-3-MCQ-025"),
      r("METAL-EXMPLR-3-MCQ-026"),
      r("METAL-EXMPLR-3-MCQ-028"),
      r("METAL-EXMPLR-3-MCQ-030"),
      r("METAL-EXMPLR-3-MCQ-031"),
      r("METAL-EXMPLR-3-MCQ-034"),
      r("METAL-EXMPLR-3-MCQ-035"),
      r("METAL-EXMPLR-3-SA-002"), // multi-part
      r("METAL-EXMPLR-3-SA-004"), // more than one value in the answer
      r("METAL-EXMPLR-3-SA-006"), // asks for more than one value
      r("METAL-EXMPLR-3-SA-008"), // multi-part
      r("METAL-EXMPLR-3-SA-011"), // more than one value in the answer
      r("METAL-EXMPLR-3-SA-016"), // asks for more than one value
      r("METAL-EXMPLR-3-SA-018"), // more than one value in the answer
      r("METAL-EXMPLR-3-SA-020"), // asks for more than one value
      r("METAL-EXMPLR-3-SA-022"), // not one comparable value
      r("METAL-EXMPLR-3-LONG-005"), // asks for more than one value
    ],
  },
  {
    slug: "carbon-and-its-compounds",
    subject: "Science",
    chapter: 4,
    title: "Carbon and its Compounds",
    shortTitle: "Carbon Compounds",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("CARB-NCERT-4-VSA-004"), // more than one value in the answer
      r("CARB-NCERT-4-MCQ-001"),
      r("CARB-NCERT-4-MCQ-002"),
      r("CARB-NCERT-4-MCQ-003"),
      r("CARB-NCERT-4-SA-004"), // more than one value in the answer
      r("CARB-NCERT-4-LONG-003"), // more than one value in the answer
    ],
    exemplar: [
      r("CARB-EXMPLR-4-MCQ-004"),
      r("CARB-EXMPLR-4-MCQ-007"),
      r("CARB-EXMPLR-4-MCQ-008"),
      r("CARB-EXMPLR-4-MCQ-009"),
      r("CARB-EXMPLR-4-MCQ-012"),
      r("CARB-EXMPLR-4-MCQ-014"),
      r("CARB-EXMPLR-4-MCQ-015"),
      r("CARB-EXMPLR-4-MCQ-017"),
      r("CARB-EXMPLR-4-MCQ-019"),
      r("CARB-EXMPLR-4-MCQ-021"),
      r("CARB-EXMPLR-4-MCQ-026"),
      r("CARB-EXMPLR-4-MCQ-027"),
      r("CARB-EXMPLR-4-SA-006"), // multi-part
      r("CARB-EXMPLR-4-SA-007"), // more than one value in the answer
      r("CARB-EXMPLR-4-SA-009"), // asks for more than one value
      r("CARB-EXMPLR-4-SA-010"), // not one comparable value
      r("CARB-EXMPLR-4-SA-015"), // multi-part
      r("CARB-EXMPLR-4-LONG-006"), // asks for more than one value
    ],
  },
  {
    slug: "life-processes",
    subject: "Science",
    chapter: 5,
    exemplarChapter: 6,
    title: "Life Processes",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("LIFE-NCERT-5-SA-001"), // not one comparable value
      r("LIFE-NCERT-5-MCQ-001"),
      r("LIFE-NCERT-5-MCQ-002"),
      r("LIFE-NCERT-5-MCQ-003"),
      r("LIFE-NCERT-5-SA-006"), // not one comparable value
      r("LIFE-NCERT-5-SA-007"), // more than one value in the answer
      r("LIFE-NCERT-5-SA-008"), // a relation, not one value
    ],
    exemplar: [
      r("LIFE-EXMPLR-5-MCQ-001"),
      r("LIFE-EXMPLR-5-MCQ-035"),
      r("LIFE-EXMPLR-5-SA-005"), // yes/no, true/false or verify, with reason
      r("LIFE-EXMPLR-5-SA-006"), // more than one value in the answer
      r("LIFE-EXMPLR-5-SA-010"), // more than one value in the answer
      r("LIFE-EXMPLR-5-SA-012"), // multi-part
      r("LIFE-EXMPLR-5-SA-017"), // not one comparable value
      r("LIFE-EXMPLR-5-SA-020"), // multi-part
      r("LIFE-EXMPLR-5-SA-025"), // multi-part
    ],
  },
  {
    slug: "control-and-coordination",
    subject: "Science",
    chapter: 6,
    exemplarChapter: 7,
    title: "Control and Coordination",
    shortTitle: "Control & Coordination",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("CTRL-NCERT-6-SA-004"), // more than one value in the answer
      r("CTRL-NCERT-6-SA-008"), // not one comparable value
      r("CTRL-NCERT-6-MCQ-001"),
      r("CTRL-NCERT-6-MCQ-003"),
      r("CTRL-NCERT-6-SA-012"), // not one comparable value
    ],
    exemplar: [
      r("CTRL-EXMPLR-6-MCQ-001"),
      r("CTRL-EXMPLR-6-MCQ-002"),
      r("CTRL-EXMPLR-6-MCQ-006"),
      r("CTRL-EXMPLR-6-MCQ-007"),
      r("CTRL-EXMPLR-6-MCQ-008"),
      r("CTRL-EXMPLR-6-MCQ-010"),
      r("CTRL-EXMPLR-6-MCQ-012"),
      r("CTRL-EXMPLR-6-MCQ-013"),
      r("CTRL-EXMPLR-6-MCQ-014"),
      r("CTRL-EXMPLR-6-MCQ-015"),
      r("CTRL-EXMPLR-6-MCQ-018"),
      r("CTRL-EXMPLR-6-MCQ-019"),
      r("CTRL-EXMPLR-6-MCQ-021"),
      r("CTRL-EXMPLR-6-MCQ-023"),
      r("CTRL-EXMPLR-6-MCQ-026"),
      r("CTRL-EXMPLR-6-MCQ-028"),
      r("CTRL-EXMPLR-6-MCQ-029"),
      r("CTRL-EXMPLR-6-MCQ-031"),
      r("CTRL-EXMPLR-6-MCQ-032"),
      r("CTRL-EXMPLR-6-MCQ-033"),
      r("CTRL-EXMPLR-6-SA-007"), // not one comparable value
      r("CTRL-EXMPLR-6-SA-010"), // multi-part
    ],
  },
  {
    slug: "how-do-organisms-reproduce",
    subject: "Science",
    chapter: 7,
    exemplarChapter: 8,
    title: "How do Organisms Reproduce?",
    shortTitle: "Reproduction",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("REPR-NCERT-7-SA-001"), // more than one value in the answer
      r("REPR-NCERT-7-SA-007"), // more than one value in the answer
      r("REPR-NCERT-7-SA-011"), // more than one value in the answer
      r("REPR-NCERT-7-MCQ-001"),
      r("REPR-NCERT-7-MCQ-002"),
    ],
    exemplar: [
      r("REPR-EXMPLR-7-MCQ-001"),
      r("REPR-EXMPLR-7-MCQ-003"),
      r("REPR-EXMPLR-7-MCQ-004"),
      r("REPR-EXMPLR-7-MCQ-005"),
      r("REPR-EXMPLR-7-MCQ-007"),
      r("REPR-EXMPLR-7-MCQ-009"),
      r("REPR-EXMPLR-7-MCQ-015"),
      r("REPR-EXMPLR-7-MCQ-016"),
      r("REPR-EXMPLR-7-MCQ-017"),
      r("REPR-EXMPLR-7-MCQ-020"),
      r("REPR-EXMPLR-7-MCQ-021"),
      r("REPR-EXMPLR-7-MCQ-022"),
      r("REPR-EXMPLR-7-MCQ-025"),
      r("REPR-EXMPLR-7-MCQ-026"),
      r("REPR-EXMPLR-7-SA-002"), // more than one value in the answer
      r("REPR-EXMPLR-7-SA-011"), // more than one value in the answer
      r("REPR-EXMPLR-7-SA-019"), // more than one value in the answer
    ],
  },
  {
    slug: "heredity",
    subject: "Science",
    chapter: 8,
    exemplarChapter: 9,
    title: "Heredity",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [],
    exemplar: [
      r("HERED-EXMPLR-8-MCQ-001"),
      r("HERED-EXMPLR-8-MCQ-003"),
      r("HERED-EXMPLR-8-MCQ-006"),
      r("HERED-EXMPLR-8-MCQ-007"),
      r("HERED-EXMPLR-8-MCQ-008"),
      r("HERED-EXMPLR-8-MCQ-010"),
      r("HERED-EXMPLR-8-SA-004"), // more than one value in the answer
      r("HERED-EXMPLR-8-SA-005"), // multi-part
      r("HERED-EXMPLR-8-SA-007"), // more than one value in the answer
    ],
  },
  {
    slug: "light-reflection-and-refraction",
    subject: "Science",
    chapter: 9,
    exemplarChapter: 10,
    title: "Light – Reflection and Refraction",
    shortTitle: "Light",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("LIGHT-NCERT-9-SA-001"), // not one comparable value
      r("LIGHT-NCERT-9-SA-002"), // sign convention: ± forms are both correct
      r("LIGHT-NCERT-9-SA-003"), // more than one value in the answer
      r("LIGHT-NCERT-9-SA-004"), // more than one value in the answer
      r("LIGHT-NCERT-9-LA-001"), // more than one value in the answer
      r("LIGHT-NCERT-9-LA-002"), // more than one value in the answer
      r("LIGHT-NCERT-9-SA-005"), // not one comparable value
      r("LIGHT-NCERT-9-SA-007"), // not one comparable value
      r("LIGHT-NCERT-9-SA-010"), // approximate / rounded key
      r("LIGHT-NCERT-9-LA-004"), // asks for more than one value
      r("LIGHT-NCERT-9-LA-005"), // asks for more than one value
      r("LIGHT-NCERT-9-SA-011"), // more than one value in the answer
      r("LIGHT-NCERT-9-LA-006"), // asks for more than one value
      r("LIGHT-NCERT-9-SA-012"), // not one comparable value
      r("LIGHT-NCERT-9-MCQ-001"),
      r("LIGHT-NCERT-9-MCQ-002"),
      r("LIGHT-NCERT-9-MCQ-003"),
      r("LIGHT-NCERT-9-MCQ-004"),
      r("LIGHT-NCERT-9-MCQ-005"),
      r("LIGHT-NCERT-9-MCQ-006"),
      f("LIGHT-NCERT-9-LA-007"), // answer shown with its bound solution figure
      f("LIGHT-NCERT-9-LA-010"), // answer shown with its bound solution figure
      f("LIGHT-NCERT-9-LA-011"), // answer shown with its bound solution figure
      r("LIGHT-NCERT-9-LA-012"), // more than one value in the answer
      r("LIGHT-NCERT-9-LA-013"), // more than one value in the answer
      r("LIGHT-NCERT-9-LA-014"), // more than one value in the answer
      r("LIGHT-NCERT-9-SA-014"), // more than one value in the answer
      r("LIGHT-NCERT-9-SA-015"), // more than one value in the answer
    ],
    exemplar: [
      r("LIGHT-EXMPLR-9-MCQ-001"),
      r("LIGHT-EXMPLR-9-MCQ-002"),
      r("LIGHT-EXMPLR-9-MCQ-008"),
      r("LIGHT-EXMPLR-9-MCQ-009"),
      r("LIGHT-EXMPLR-9-MCQ-010"),
      r("LIGHT-EXMPLR-9-MCQ-012"),
      r("LIGHT-EXMPLR-9-MCQ-018"),
      r("LIGHT-EXMPLR-9-MCQ-019"),
      r("LIGHT-EXMPLR-9-SA-001"), // multi-part
      r("LIGHT-EXMPLR-9-SA-003"), // more than one value in the answer
      r("LIGHT-EXMPLR-9-SA-008"), // more than one value in the answer
      f("LIGHT-EXMPLR-9-LA-001"), // answer shown with its bound solution figure
      f("LIGHT-EXMPLR-9-LA-004"), // answer shown with its bound solution figure
      f("LIGHT-EXMPLR-9-LA-005"), // answer shown with its bound solution figure
      r("LIGHT-EXMPLR-9-LA-006"), // more than one value in the answer
      r("LIGHT-EXMPLR-9-LA-008"), // more than one value in the answer
    ],
  },
  {
    slug: "human-eye-and-colourful-world",
    subject: "Science",
    chapter: 10,
    exemplarChapter: 11,
    title: "The Human Eye and the Colourful World",
    shortTitle: "Human Eye",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("EYE-NCERT-10-SA-001"), // not one comparable value
      r("EYE-NCERT-10-SA-002"), // a relation, not one value
      r("EYE-NCERT-10-SA-003"), // more than one value in the answer
      r("EYE-NCERT-10-SA-004"), // not one comparable value
      r("EYE-NCERT-10-MCQ-001"),
      r("EYE-NCERT-10-MCQ-002"),
      r("EYE-NCERT-10-MCQ-003"),
      r("EYE-NCERT-10-MCQ-004"),
      r("EYE-NCERT-10-SA-005"), // multi-part
      r("EYE-NCERT-10-SA-006"), // more than one value in the answer
      r("EYE-NCERT-10-SA-008"), // more than one value in the answer
      r("EYE-NCERT-10-SA-010"), // more than one value in the answer
      r("EYE-NCERT-10-SA-011"), // more than one value in the answer
      r("EYE-NCERT-10-SA-012"), // more than one value in the answer
    ],
    exemplar: [
      r("EYE-EXMPLR-10-MCQ-001"),
      r("EYE-EXMPLR-10-MCQ-002"),
      r("EYE-EXMPLR-10-MCQ-006"),
      r("EYE-EXMPLR-10-MCQ-007"),
      r("EYE-EXMPLR-10-MCQ-009"),
      r("EYE-EXMPLR-10-MCQ-011"),
      r("EYE-EXMPLR-10-MCQ-012"),
      r("EYE-EXMPLR-10-MCQ-013"),
      r("EYE-EXMPLR-10-SA-003"), // asks for more than one value
      r("EYE-EXMPLR-10-SA-007"), // yes/no, true/false or verify, with reason
      r("EYE-EXMPLR-10-SA-008"), // more than one value in the answer
      r("EYE-EXMPLR-10-SA-009"), // more than one value in the answer
      r("EYE-EXMPLR-10-LA-006"), // not one comparable value
    ],
  },
  {
    slug: "electricity",
    subject: "Science",
    chapter: 11,
    exemplarChapter: 12,
    title: "Electricity",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("ELEC-NCERT-11-SA-001"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-003"), // approximate / rounded key
      v("ELEC-NCERT-11-SA-004"), // Q = 300 C
      r("ELEC-NCERT-11-SA-005"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-007"), // not one comparable value
      v("ELEC-NCERT-11-SA-008"), // W = 24 J
      r("ELEC-NCERT-11-SA-009"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-010"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-011"), // not one comparable value
      r("ELEC-NCERT-11-SA-014"), // multi-part
      v("ELEC-NCERT-11-SA-015"), // I₂ = 8 A
      v("ELEC-NCERT-11-SA-016"), // R₂ = 1 Ω
      r("ELEC-NCERT-11-LA-003"), // multi-part
      r("ELEC-NCERT-11-SA-018"), // multi-part
      r("ELEC-NCERT-11-LA-004"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-019"), // more than one value in the answer
      r("ELEC-NCERT-11-LA-005"), // multi-part
      r("ELEC-NCERT-11-SA-020"), // multi-part
      r("ELEC-NCERT-11-SA-021"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-022"), // not one comparable value
      r("ELEC-NCERT-11-SA-023"), // more than one value in the answer
      v("ELEC-NCERT-11-SA-024"), // V = 20 V
      v("ELEC-NCERT-11-SA-026"), // P = 110 W
      r("ELEC-NCERT-11-LA-010"), // not one comparable value
      r("ELEC-NCERT-11-MCQ-001"),
      r("ELEC-NCERT-11-MCQ-002"),
      r("ELEC-NCERT-11-MCQ-003"),
      r("ELEC-NCERT-11-MCQ-004"),
      r("ELEC-NCERT-11-LA-011"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-028"), // more than one value in the answer
      r("ELEC-NCERT-11-SA-029"), // approximate / rounded key
      r("ELEC-NCERT-11-SA-030"), // not one comparable value
      r("ELEC-NCERT-11-LA-013"), // multi-part
      r("ELEC-NCERT-11-SA-031"), // approximate / rounded key
      r("ELEC-NCERT-11-LA-014"), // more than one value in the answer
      r("ELEC-NCERT-11-LA-015"), // multi-part
      r("ELEC-NCERT-11-SA-032"), // approximate / rounded key
      r("ELEC-NCERT-11-SA-033"), // not one comparable value
    ],
    exemplar: [
      r("ELEC-EXMPLR-11-MCQ-004"),
      r("ELEC-EXMPLR-11-MCQ-010"),
      r("ELEC-EXMPLR-11-MCQ-012"),
      r("ELEC-EXMPLR-11-MCQ-016"),
      r("ELEC-EXMPLR-11-SA-003"), // not one comparable value
      r("ELEC-EXMPLR-11-SA-004"), // more than one value in the answer
      r("ELEC-EXMPLR-11-LA-002"), // more than one value in the answer
      r("ELEC-EXMPLR-11-SA-005"), // not one comparable value
      r("ELEC-EXMPLR-11-LA-003"), // more than one value in the answer
      r("ELEC-EXMPLR-11-SA-006"), // more than one value in the answer
      r("ELEC-EXMPLR-11-LA-005"), // yes/no, true/false or verify, with reason
      r("ELEC-EXMPLR-11-LA-007"), // more than one value in the answer
      r("ELEC-EXMPLR-11-LA-008"), // not one comparable value
      r("ELEC-EXMPLR-11-LA-009"), // not one comparable value
    ],
  },
  {
    slug: "magnetic-effects-of-electric-current",
    subject: "Science",
    chapter: 12,
    exemplarChapter: 13,
    title: "Magnetic Effects of Electric Current",
    shortTitle: "Magnetic Effects",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("MAG-NCERT-12-SA-002"), // not one comparable value
      r("MAG-NCERT-12-MCQ-001"),
      r("MAG-NCERT-12-SA-005"), // more than one value in the answer
      r("MAG-NCERT-12-SA-006"), // approximate / rounded key
      r("MAG-NCERT-12-SA-008"), // not one comparable value
      r("MAG-NCERT-12-MCQ-005"),
      r("MAG-NCERT-12-SA-009"), // yes/no, true/false or verify, with reason
      r("MAG-NCERT-12-SA-010"), // more than one value in the answer
      r("MAG-NCERT-12-SA-012"), // not one comparable value
      r("MAG-NCERT-12-SA-013"), // more than one value in the answer
      r("MAG-NCERT-12-SA-014"), // more than one value in the answer
    ],
    exemplar: [],
  },
  {
    slug: "our-environment",
    subject: "Science",
    chapter: 13,
    exemplarChapter: 15,
    title: "Our Environment",
    decision: "SOLUTIONS-SCI (owner 6 Nov)",
    ncert: [
      r("OE-NCERT-13-MCQ-001"),
      r("OE-NCERT-13-MCQ-002"),
      r("OE-NCERT-13-SA-008"), // more than one value in the answer
      r("OE-NCERT-13-SA-009"), // more than one value in the answer
      r("OE-NCERT-13-SA-010"), // more than one value in the answer
      r("OE-NCERT-13-SA-013"), // more than one value in the answer
    ],
    exemplar: [],
  },
  // <SOLUTIONS-SCI:END>
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
    // SOLUTIONS-SCI: reached only when nothing above fits (never for a Maths page on trunk).
    `${BOOK_SHORT[book]} Class 10 ${ch.subject} Ch ${n} ${s}`,
  ];
  // SOLUTIONS-SCI-1 review: a Science head title always says "Class 10 Science" (a shorter title,
  // never a dropped subject). Maths keeps its ladder unchanged.
  const forms = ch.subject === "Science" ? ladder.filter((t) => t.includes(` Class 10 ${ch.subject} `)) : ladder;
  const fit = forms.find((t) => t.length <= SOLUTIONS_HEAD_TITLE_CAP);
  if (!fit) throw new Error(`solutions: no head title for ${solutionsPath(book, ch.slug)} fits ${SOLUTIONS_HEAD_TITLE_CAP} characters`);
  return fit;
}

/** The head description (<= 155 characters; THROWS when no form fits). */
export function solutionsHeadDescription(book: SolutionsBook, ch: SolutionsChapter): string {
  const n = bookChapterNo(ch, book);
  // #1605 review: "How do Organisms Reproduce?" ends its own sentence (never "Reproduce?.").
  const lead = (t: string) => `Step-by-step ${BOOK_ADJ[book]} solutions for Class 10 ${ch.subject} Chapter ${n} ${t}${/[?.!]$/.test(t) ? "" : "."}`;
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

/**
 * "Assertion-Reason" / "Case-based" for a board-pattern card, decided by the row's ACTUAL format
 * (`format` names Assertion-Reason, or the id is an -AR- row) — never by "has options": a case-based
 * row with an MCQ sub-part must not be labelled Assertion-Reason.
 */
export function boardPatternLabel(q: { id?: string; format?: string }): string {
  if (/assertion/i.test(String(q.format ?? "")) || /-AR-\d+$/.test(String(q.id ?? ""))) return "Assertion-Reason";
  return "Case-based";
}

// ---------------------------------------------------------------------------------------------
// SOLUTIONS-SCI (owner approval, 6 Nov 2026) — the NCERT Science book references.
//
// The Science bank writes its NCERT references in three book forms: an in-text question
// ("In-text Q1 §11.1", "In-text Q2 (after §5.2)", "In-text Q1 after Example 9.2"), a worked
// example ("Example 11.3") and a chapter-end exercise ("Exercise Q7"). ONE parser serves the
// selection script (a reference it cannot parse is not published) and the page (the card label and
// the grouping), so the page can never show a reference the selection did not accept.
// ---------------------------------------------------------------------------------------------

export type ScienceRefKind = "intext" | "example" | "exercise";

export interface ScienceRef {
  kind: ScienceRefKind;
  /** Chapter number named in the reference (null for "Exercise Qn", which names none). */
  chapter: number | null;
  /** Section path for an in-text question ("11.6.1"), example number ("11.3"), or null. */
  at: string | null;
  /** Question number (in-text / exercise) or example number's second part. */
  n: number;
}

const INTEXT_SECTION = /^In-text Q(\d+) (?:\(after §(\d+(?:\.\d+)+)\)|§(\d+(?:\.\d+)+))$/;
const INTEXT_AFTER_EXAMPLE = /^In-text Q(\d+) after Example (\d+\.\d+)$/;
const EXAMPLE = /^Example (\d+)\.(\d+)$/;
const EXERCISE = /^Exercise Q(\d+)$/;

/** The parsed reference, or null when the bank's reference is not one of the book forms. */
export function parseScienceRef(ref: string | undefined): ScienceRef | null {
  const r = String(ref ?? "").trim();
  let m = INTEXT_SECTION.exec(r);
  if (m) {
    const at = m[2] ?? m[3];
    return { kind: "intext", chapter: Number(at.split(".")[0]), at, n: Number(m[1]) };
  }
  m = INTEXT_AFTER_EXAMPLE.exec(r);
  if (m) return { kind: "intext", chapter: Number(m[2].split(".")[0]), at: `Example ${m[2]}`, n: Number(m[1]) };
  m = EXAMPLE.exec(r);
  if (m) return { kind: "example", chapter: Number(m[1]), at: `${m[1]}.${m[2]}`, n: Number(m[2]) };
  m = EXERCISE.exec(r);
  if (m) return { kind: "exercise", chapter: null, at: null, n: Number(m[1]) };
  return null;
}

/** The card label of a Science book reference ("In-text Q1 · Section 11.1"), or null when unparseable. */
export function scienceRefLabel(ref: string | undefined): string | null {
  const r = parseScienceRef(ref);
  if (!r) return null;
  if (r.kind === "example") return `Example ${r.at}`;
  if (r.kind === "exercise") return `Exercise Q${r.n}`;
  return r.at?.startsWith("Example") ? `In-text Q${r.n} · after ${r.at}` : `In-text Q${r.n} · Section ${r.at}`;
}

export const SCIENCE_GROUP_TITLES: Readonly<Record<ScienceRefKind, string>> = {
  intext: "In-text questions",
  example: "Worked examples",
  exercise: "Chapter-end exercises",
};

/**
 * The page's Science groups, in book order of kind (in-text, examples, exercises), each sorted by
 * its own book number. A row whose reference does not parse is dropped (the selection never
 * publishes one; this keeps the page from inventing a group for it).
 */
export function scienceGroups<T extends { q: { ncertRef?: string } }>(rows: readonly T[]): Array<{ title: string; rows: T[] }> {
  const keyed = rows.flatMap((row) => {
    const r = parseScienceRef(row.q.ncertRef);
    return r ? [{ row, r }] : [];
  });
  const sectionKey = (at: string | null) => (at ?? "").replace(/^Example /, "").split(".").map(Number);
  const cmp = (a: ScienceRef, b: ScienceRef) => {
    const x = sectionKey(a.at);
    const y = sectionKey(b.at);
    for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
      const d = (x[i] ?? 0) - (y[i] ?? 0);
      if (d) return d;
    }
    return a.n - b.n;
  };
  return (["intext", "example", "exercise"] as const)
    .map((kind) => ({
      title: SCIENCE_GROUP_TITLES[kind],
      rows: keyed.filter((k) => k.r.kind === kind).sort((a, b) => cmp(a.r, b.r)).map((k) => k.row),
    }))
    .filter((g) => g.rows.length > 0);
}

// ---------------------------------------------------------------------------------------------
// SOLUTIONS-SCI-1 review (6 Nov 2026) — two page rules for SCIENCE pages only (the Maths pages and
// their prerender stay byte-identical):
//   (1) an objective row (MCQ / 1 mark) is 0 or full marks (CLAUDE.md §13), so its steps are shown
//       WITHOUT "[N mark]" prefixes;
//   (2) the hint (step 1) is offered only when it does not give the answer away.
// ---------------------------------------------------------------------------------------------

const STEP_MARK_PREFIX = /^\s*\[\s*\d+(?:\.\d+)?\s*marks?\s*\]\s*/i;

/** A step without its leading "[N mark]" prefix. */
export function stripStepMark(step: string): string {
  return String(step).replace(STEP_MARK_PREFIX, "");
}

/** MCQ or a 1-mark item: scored 0 or full on the answer alone. */
export function isObjectiveRow(q: { options?: readonly string[]; marks?: number }): boolean {
  return (Array.isArray(q.options) && q.options.length > 0) || Number(q.marks) === 1;
}

const norm = (s: string) =>
  stripStepMark(String(s ?? ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const STOP = new Set(["the", "and", "for", "are", "was", "with", "from", "that", "this", "its", "into", "has", "have", "which", "when", "than", "then", "only"]);
const contentWords = (s: string) => norm(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w));

/** Step 1 is a SETUP (a nudge): the given data, or a formula / law written with a symbol ("V = IR", "R ∝ l"). */
const SETUP_STEP = /^\s*(?:\[[^\]]*\]\s*)?given\b|(?:^|[^\p{L}])\p{L}[\p{L}\p{N}_₀-₉ᵢ']{0,3}\s*[=∝]/iu;
/** A definition / meaning / nature question: its first line is its answer. */
const DEFINITION_QUESTION =
  /\bwhat (?:is|are) (?:meant by|the meaning of)\b|\bdefine\b|\bdefinition of\b|\bwhat does\b[^?]{0,80}\bmean\b|\bmeaning of\b|\bnature of\b|\bnature and\b/i;
/** Step 1 already answers a part: "(a) …", "(i) …". */
const PART_ANSWER = /^\s*(?:\[[^\]]*\]\s*)?\((?:[a-e]|i{1,3}|iv|v)\)/i;
const numbersIn = (s: string) => new Set((String(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number));

/**
 * True when step 1 must NOT be offered as a hint (Science pages; review of #1602: "hints never
 * reveal"). A hint is offered only on a COMPUTATIONAL question (it gives numbers), when step 1 is a
 * SETUP (given data, or a formula / law) that does
 * not start a part's answer, names no answer or option, does not contain the correct option (or its
 * word stems), the final answer, most of the final answer's words, or a final-answer number that the
 * question itself does not contain. Theory rows, whose step 1 is always content, get no hint.
 */
export function hintRevealsAnswer(q: {
  solutionSteps?: readonly string[];
  options?: readonly string[];
  answer?: string;
  finalAnswer?: string;
  questionText?: string;
}): boolean {
  const first = String(q.solutionSteps?.[0] ?? "");
  if (!first.trim()) return true;
  // Only a COMPUTATIONAL question (it gives numbers) gets a setup hint: on a conceptual question the
  // law in step 1 ("R ∝ l", "P = VI = I²R") IS the answer.
  if (!/\d/.test(String(q.questionText ?? ""))) return true;
  // #1605 review, item 2: a number in the question does not make it computational. A definition or
  // "nature of" question is answered by its first line ("refractive index 2.42 means …").
  if (DEFINITION_QUESTION.test(String(q.questionText ?? ""))) return true;
  // A solution of three steps or fewer: its first step is a third of the answer or more.
  if ((q.solutionSteps?.length ?? 0) <= 3) return true;
  // Step 1 already names a word of the final answer that the question does not ("concave").
  const askedWords = new Set(contentWords(String(q.questionText ?? "")));
  const firstWords = new Set(contentWords(first));
  if (contentWords(String(q.finalAnswer ?? "")).some((w) => w.length >= 5 && !askedWords.has(w) && firstWords.has(w))) return true;
  if (!SETUP_STEP.test(first) || PART_ANSWER.test(first)) return true;
  // Review of #1605 (b): a step 1 that already states a conclusion ("Therefore R_p is less than the
  // smallest resistance") gives most of the answer away.
  if (/\b(?:therefore|hence|thus|less than|greater than|more than)\b/i.test(first)) return true;
  const asked = numbersIn(String(q.questionText ?? ""));
  const finalNums = [...numbersIn(String(q.finalAnswer ?? ""))].filter((n) => !asked.has(n));
  const firstNums = numbersIn(stripStepMark(first));
  if (finalNums.some((n) => firstNums.has(n))) return true;
  if (/\banswer\b|\boption\s*\(?[a-e]\)?/i.test(first)) return true;
  const hay = ` ${norm(first)} `;
  if (Array.isArray(q.options) && q.options.length > 0) {
    const key = norm(String(q.answer ?? ""));
    if (key && hay.includes(` ${key} `)) return true;
    // Word stems too: "excretory system" gives away the option "excretion".
    const stem = (w: string) => w.slice(0, Math.max(5, Math.min(w.length - 2, 7)));
    const keyWords = contentWords(String(q.answer ?? ""));
    const firstStems = contentWords(first).map(stem);
    if (keyWords.length > 0 && keyWords.every((w) => firstStems.some((f) => f.startsWith(stem(w)) || stem(w).startsWith(f)))) return true;
  }
  const fin = norm(String(q.finalAnswer ?? "").replace(/\s*[—-]\s*option\s*\([a-e]\)\s*$/i, ""));
  if (fin && hay.includes(` ${fin} `)) return true;
  const words = [...new Set(contentWords(String(q.finalAnswer ?? "")))];
  if (words.length > 0) {
    const have = new Set(contentWords(first));
    const shared = words.filter((w) => have.has(w)).length;
    if (shared / words.length >= 0.6) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// SOLUTIONS-SCI-3 (owner instruction, 6 Nov 2026) — the NCERT Exemplar SCIENCE book references.
//
// The Exemplar Science book numbers its questions straight through each chapter (Q1 … Qn) in three
// sections: Multiple Choice, Short Answer, Long Answer. The bank writes the reference as
// "Exemplar Ex 6.1 Q1 (MCQ)", "Exemplar Ex 4.1 Q1", "Exemplar MCQ Q1", "Exemplar SA Q19",
// "Exemplar Q13", "Exemplar Q25 (LA)" or "Exemplar Ex 1.2 Q20a (SA)": ONE parser reads them all
// for the selection script and the page. The "Ex N." number, when written, is the Exemplar
// chapter (old numbering) and must match the chapter's Exemplar chapter.
// ---------------------------------------------------------------------------------------------

export type ScienceExemplarSection = "mcq" | "sa" | "la";

export interface ScienceExemplarRef {
  /** Exemplar chapter named in the reference ("Ex 6.1" → 6), or null. */
  chapter: number | null;
  section: ScienceExemplarSection;
  /** Question number (the book numbers straight through the chapter). */
  n: number;
  /** A sub-part written with the number ("a", "b–d"), or null. */
  part: string | null;
}

const EXEMPLAR_SCI_REF =
  /^Exemplar (?:Ex (\d+)\.\d+ )?(?:(MCQ|SA|LA) )?Q(\d+)([a-z](?:[–-][a-z])?)?(?: \((MCQ|SA|LA)\))?$/;

/** The parsed Exemplar Science reference, or null. The section comes from the reference, else the row's format. */
export function parseScienceExemplarRef(ref: string | undefined, format?: string): ScienceExemplarRef | null {
  const m = EXEMPLAR_SCI_REF.exec(String(ref ?? "").trim());
  if (!m) return null;
  const tag = (m[2] ?? m[5] ?? "").toLowerCase();
  const f = String(format ?? "").toLowerCase();
  const section: ScienceExemplarSection | null =
    tag === "mcq" || tag === "sa" || tag === "la"
      ? tag
      : /mcq/.test(f)
        ? "mcq"
        : /long/.test(f)
          ? "la"
          : /short|vsa/.test(f)
            ? "sa"
            : null;
  if (!section) return null;
  return { chapter: m[1] ? Number(m[1]) : null, section, n: Number(m[3]), part: m[4] ?? null };
}

export const SCIENCE_EXEMPLAR_GROUP_TITLES: Readonly<Record<ScienceExemplarSection, string>> = {
  mcq: "Multiple choice questions",
  sa: "Short answer questions",
  la: "Long answer questions",
};

/** "Exemplar Q12", "Exemplar Q20(a)": the card label of an Exemplar Science row, or null. */
export function scienceExemplarRefLabel(ref: string | undefined, format?: string): string | null {
  const r = parseScienceExemplarRef(ref, format);
  return r ? `Exemplar Q${r.n}${r.part ? `(${r.part})` : ""}` : null;
}

/** The Exemplar page's groups (MCQ, short answer, long answer), each in question-number order. */
export function scienceExemplarGroups<T extends { q: { ncertRef?: string; format?: string } }>(
  rows: readonly T[],
): Array<{ title: string; rows: T[] }> {
  const keyed = rows.flatMap((row) => {
    const r = parseScienceExemplarRef(row.q.ncertRef, row.q.format);
    return r ? [{ row, r }] : [];
  });
  return (["mcq", "sa", "la"] as const)
    .map((section) => ({
      title: SCIENCE_EXEMPLAR_GROUP_TITLES[section],
      rows: keyed
        .filter((k) => k.r.section === section)
        .sort((a, b) => a.r.n - b.r.n || String(a.r.part).localeCompare(String(b.r.part)))
        .map((k) => k.row),
    }))
    .filter((g) => g.rows.length > 0);
}
