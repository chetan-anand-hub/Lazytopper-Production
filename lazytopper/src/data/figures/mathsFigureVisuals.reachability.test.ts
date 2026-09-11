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
    expect(batch).toHaveLength(88);
  });

  it("every binding names a SERVED question — in canonicalQuestionBank and not withheld", () => {
    const missing = batch.filter((f) => !served.has(f.questionId ?? ""));
    expect(missing.map((f) => f.questionId)).toEqual([]);
    const withheld = batch.filter((f) => WITHHELD_QUESTION_IDS.has(f.questionId ?? ""));
    expect(withheld.map((f) => f.questionId)).toEqual([]);
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
    // a bound row must resolve to ONE figure — a duplicate entry would draw the same figure twice
    const dup = batch.filter((f) => getFiguresForQuestion(f.questionId).length !== 1);
    expect(dup.map((f) => f.questionId)).toEqual([]);
  });
});
