/**
 * mathsFigureVisuals.reachability.test.ts — a bound figure is only useful if the row it is bound
 * to is actually SERVED and actually REACHABLE from the surfaces that render figures.
 *
 * ★ WHY THIS FILE EXISTS. The binder is id-keyed and exact: a typo in `questionId` binds nothing
 * and fails silently — the product shows the stem with no figure, exactly as before, and every
 * gate stays green. A row can also be withheld (`WITHHELD_QUESTION_IDS`), or carry a topicKey no
 * surface filters on, in which case the figure is bound to a question no student is ever shown.
 * The asset can be missing from `public/`, which renders a broken <img>. tsc sees none of this.
 *
 * Every assertion runs against the ASSEMBLED, SERVED bank and the real filesystem:
 *   1. every FIG-MATHS-1 binding names a question in `canonicalQuestionBank` (served, not withheld);
 *   2. that question's topicKey resolves to one of the canonical slugs every practice surface
 *      filters on (same resolver bankQuery.test.ts uses for the whole bank);
 *   3. the asset the binding points at exists under lazytopper/public;
 *   4. no FIG-MATHS-1 asset lives under the legacy `/visuals/` path;
 *   5. controls: a bogus id resolves to nothing; a batch id resolves to exactly one figure.
 *
 * The batch is pinned by COUNT so a silent drop is loud. When the count moves, find out why before
 * editing it — a binding removed for a stated cause is fine, a typo is not.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { MATHS_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";
import { BOUND_BUT_WITHHELD } from "./mathsFigureVisuals";

const PUBLIC = path.resolve(__dirname, "..", "..", "..", "public");
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const MATHS_SLUGS = new Set([
  "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
  "arithmetic-progression", "triangles", "coordinate-geometry", "trigonometry",
  "circles", "areas-related-to-circles", "surface-areas-and-volumes", "statistics", "probability",
]);
const FIG_MATHS_1_PREFIXES = [
  "/figures/itembank-maths/", "/figures/apq-maths/", "/figures/preboard-maths/", "/figures/sqp-maths/",
  "/figures/pyq-maths/", "/figures/ncert-maths/", "/figures/exemplar-maths/",
];
const batch = MATHS_FIGURE_VISUALS.filter((f) => FIG_MATHS_1_PREFIXES.some((p) => f.filePath.startsWith(p)));

describe("FIG-MATHS-1 bindings are served and reachable", () => {
  it("the batch is present and is the size this lane shipped", () => {
    // 88 = 49 Item Bank + 13 Additional Practice + 4 preboard + 7 sample paper + 11 board papers + 3 NCERT + 1 Exemplar
    // 90 -> 86 at SYLLABUS-FIX-CONTENT PR-1 (2026-10-06): bindings of 4 withheld rows removed (CBE-M-SAV-D-001,
    // CBE-M-TRI-A-004, CBE-M-TRI-C-006, SP-M-2022-TRI-A-003; Z3-TG-110 is outside this batch). Crops kept on disk.
    // 86 -> 82 at QUICK-FIXES-1 PR-2 (2026-10-06): bindings of 4 withheld rows removed (CBE-M-ARC-C-001, CBE-M-ARC-C-002,
    // CBE-M-ARC-E-001, PYQ-M-ARC-005; owner ruling R3). Crops kept on disk.
    // 82 -> 79 at BANK-FIX-1 PR-2 (2026-10-07): bindings removed for APQ-M-TRI-008, PB-M-1-TRIG-C-001 and
    // PYQ-M-2026-POLY-005 (rows withheld: figure / limit). Z3-ARC-004 (withheld, figure) is also
    // unbound but sits outside this batch (/visuals/). Crops kept on disk.
    // 79 -> 77 at BANK-FIX-1 PR-2 phase B (2026-10-07): CBE-M-STAT-B-001 and CBE-M-STAT-C-001 unbound (figure pass: the stem
    // is self-contained and the figure contradicts it or is decorative; rows stay served). Z3-CG-004's two figures are
    // unbound too, outside this batch (/visuals/). Crops kept on disk.
    // 77 -> 116 at DIAGRAMS-1 PR-1 (2026-10-07, merged over BANK-FIX): +39 Circles/Triangles crops for 38 rows (board
    // papers, APQ, SQP, NCERT, Exemplar). PYQ-M-2024-CIRC-011a's binding was dropped (BANK-FIX withholds it as a
    // duplicate of 010a). They share the /figures/<source>-maths/ prefixes this batch filters on; each binding is pinned one by one in
    // mathsFigureVisuals.diagrams1.test.ts. APQ-M-CIRC-007 carries two figures (main + OR part).
    // 116 -> 123 at DIAGRAMS-1 PR-6 (2026-10-07): +7 Trigonometry / Coordinate Geometry crops for 5 rows (APQ, board paper),
    // pinned one by one in mathsFigureVisuals.diagrams1.test.ts. APQ-M-TRIG-010 carries three figures (parts i, iii, OR iii).
    expect(batch).toHaveLength(123); // count history in the comments above; CBE-M-CG-A-001 / -B-002 (Item Bank p230) are inside the 82
  });

  it("every binding names a SERVED question — in canonicalQuestionBank and not withheld", () => {
    // Declared exception: rows in BOUND_BUT_WITHHELD (mathsFigureVisuals.ts) carry a bound figure while BANK-FIX
    // withholds them; each has a stated reason, and a declared row that is actually served is itself a failure.
    const declared = (q: string | undefined) => Object.prototype.hasOwnProperty.call(BOUND_BUT_WITHHELD, q ?? "");
    const missing = batch.filter((f) => !served.has(f.questionId ?? "") && !declared(f.questionId));
    expect(missing.map((f) => f.questionId)).toEqual([]);
    const withheld = batch.filter((f) => WITHHELD_QUESTION_IDS.has(f.questionId ?? "") && !declared(f.questionId));
    expect(withheld.map((f) => f.questionId)).toEqual([]);
    expect(Object.keys(BOUND_BUT_WITHHELD).filter((q) => served.has(q))).toEqual([]);
  });

  it("every bound question resolves to a canonical maths slug, so every topic-filtered surface reaches it", () => {
    const bad = batch
      .map((f) => served.get(f.questionId ?? ""))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .filter((q) => !MATHS_SLUGS.has(resolveCanonicalSlug(q.topicKey)));
    expect(bad.map((q) => `${q.id}:${q.topicKey}`)).toEqual([]);
  });

  it("every asset exists under lazytopper/public at the bound filePath", () => {
    const absent = batch.filter((f) => !fs.existsSync(path.join(PUBLIC, f.filePath.replace(/^\//, ""))));
    expect(absent.map((f) => f.filePath)).toEqual([]);
  });

  it("no FIG-MATHS-1 asset lives under the legacy /visuals/ path", () => {
    const legacy = MATHS_FIGURE_VISUALS.filter(
      (f) => f.filePath.startsWith("/visuals/") && /(itembank|apq|preboard|sqp|pyq|ncert|exemplar)-maths/.test(f.filePath),
    );
    expect(legacy).toEqual([]);
  });

  it("the resolver is exact: a bogus id yields nothing, a batch id yields exactly its one figure", () => {
    expect(getFiguresForQuestion("FIG-MATHS-1-NO-SUCH-ID")).toEqual([]);
    expect(getFiguresForQuestion("CBE-M-TRI-A-001").map((f) => f.filePath)).toEqual([
      "/figures/itembank-maths/triangles/CBE-M-TRI-A-001.webp",
    ]);
    // a bound row must resolve to ONE figure — a duplicate entry would draw the same figure twice.
    // Declared exception (DIAGRAMS-1 PR-1): APQ-M-CIRC-007's stem carries an OR part with its own printed figure, so
    // it binds two DIFFERENT crops in source order. Any other multi-figure row must be declared here deliberately.
    // DIAGRAMS-1 PR-6: APQ-M-TRIG-010 prints a separate figure for part (i), part (iii) and the OR part (iii).
    const MULTI_FIGURE: Record<string, number> = { "APQ-M-CIRC-007": 2, "APQ-M-TRIG-010": 3 };
    const dup = batch.filter((f) => getFiguresForQuestion(f.questionId).length !== (MULTI_FIGURE[f.questionId ?? ""] ?? 1));
    expect(dup.map((f) => f.questionId)).toEqual([]);
    for (const qid of Object.keys(MULTI_FIGURE)) {
      const paths = getFiguresForQuestion(qid).map((f) => f.filePath);
      expect(new Set(paths).size).toBe(paths.length); // two crops, never the same file twice
    }
  });
});
