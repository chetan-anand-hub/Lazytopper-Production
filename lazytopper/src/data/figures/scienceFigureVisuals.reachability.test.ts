/**
 * scienceFigureVisuals.reachability.test.ts — a bound figure is only useful if the row it is bound
 * to is actually SERVED and actually REACHABLE from the surfaces that render figures.
 * Mirror of mathsFigureVisuals.reachability.test.ts for the FIG-SCI-1 batch.
 *
 * ★ WHY THIS FILE EXISTS. The binder is id-keyed and exact: a typo in `questionId` binds nothing
 * and fails silently — the product shows the stem with no figure, exactly as before, and every
 * gate stays green. A row can also be withheld (`WITHHELD_QUESTION_IDS`), or carry a topicKey no
 * surface filters on, in which case the figure is bound to a question no student is ever shown.
 * The asset can be missing from `public/`, which renders a broken <img>. tsc sees none of this.
 *
 * Every assertion runs against the ASSEMBLED, SERVED bank and the real filesystem:
 *   1. every FIG-SCI-1 binding names a question in `canonicalQuestionBank` (served, not withheld);
 *   2. that question's topicKey resolves to one of the canonical science slugs every practice
 *      surface filters on (same resolver bankQuery.test.ts uses for the whole bank), AND the
 *      topicKey segment of the filePath is that same slug — an asset filed under the wrong chapter
 *      still renders, so only this check would ever notice;
 *   3. the asset the binding points at exists under lazytopper/public;
 *   4. no FIG-SCI-1 asset lives under the legacy `/visuals/` path;
 *   5. controls: a bogus id resolves to nothing; one id from each of the four sources resolves
 *      to exactly its one figure.
 *
 * The batch is identified by filePath prefix, the way the maths test identifies its batch. The
 * `/figures/cfpq-science/` prefix is shared with the 12 entries CFPQ-FIGURES-1 shipped before this
 * lane (CFPQ-S-ELEC-001..007, 009, 011, 013..015), so those ids are named and excluded — the pin
 * below counts FIG-SCI-1's entries only.
 *
 * The batch is pinned by COUNT so a silent drop is loud. When the count moves, find out why before
 * editing it — a binding removed for a stated cause is fine, a typo is not.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { SCIENCE_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";

const PUBLIC = path.resolve(__dirname, "..", "..", "..", "public");
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const SCIENCE_SLUGS = new Set([
  "chemical-reactions-and-equations", "acids-bases-and-salts", "metals-and-non-metals",
  "carbon-and-its-compounds", "life-processes", "control-and-coordination",
  "how-do-organisms-reproduce", "heredity", "light-reflection-and-refraction",
  "human-eye-and-colourful-world", "electricity", "magnetic-effects-of-electric-current",
  "our-environment",
]);
const FIG_SCI_1_PREFIXES = [
  "/figures/itembank-science/", "/figures/exemplar-science/", "/figures/ncert-science/", "/figures/cfpq-science/",
];
// Bound by CFPQ-FIGURES-1 before this lane, under the same /figures/cfpq-science/ prefix.
const CFPQ_FIGURES_1_IDS = new Set([
  "CFPQ-S-ELEC-001", "CFPQ-S-ELEC-002", "CFPQ-S-ELEC-003", "CFPQ-S-ELEC-004", "CFPQ-S-ELEC-005",
  "CFPQ-S-ELEC-006", "CFPQ-S-ELEC-007", "CFPQ-S-ELEC-009", "CFPQ-S-ELEC-011", "CFPQ-S-ELEC-013",
  "CFPQ-S-ELEC-014", "CFPQ-S-ELEC-015",
]);
const batch = SCIENCE_FIGURE_VISUALS.filter(
  (f) => FIG_SCI_1_PREFIXES.some((p) => f.filePath.startsWith(p)) && !CFPQ_FIGURES_1_IDS.has(f.questionId ?? ""),
);

describe("FIG-SCI-1 bindings are served and reachable", () => {
  it("the batch is present and is the size this lane shipped", () => {
    // 109 = 44 Item Bank Science + 34 NCERT Exemplar + 7 NCERT textbook + 24 CFPQ Science
    expect(batch).toHaveLength(109);
    // and the earlier lane's 12 cfpq entries are all still present under the shared prefix
    const earlier = SCIENCE_FIGURE_VISUALS.filter((f) => CFPQ_FIGURES_1_IDS.has(f.questionId ?? ""));
    expect(earlier).toHaveLength(12);
  });

  it("every binding names a SERVED question — in canonicalQuestionBank and not withheld", () => {
    const missing = batch.filter((f) => !served.has(f.questionId ?? ""));
    expect(missing.map((f) => f.questionId)).toEqual([]);
    const withheld = batch.filter((f) => WITHHELD_QUESTION_IDS.has(f.questionId ?? ""));
    expect(withheld.map((f) => f.questionId)).toEqual([]);
  });

  it("every bound question resolves to a canonical science slug, and its asset is filed under that slug", () => {
    const bad = batch
      .map((f) => ({ f, q: served.get(f.questionId ?? "") }))
      .filter((x): x is { f: (typeof batch)[number]; q: NonNullable<typeof x.q> } => Boolean(x.q))
      .filter(({ f, q }) => {
        const slug = resolveCanonicalSlug(q.topicKey);
        const dirSlug = f.filePath.split("/")[3]; // /figures/<source>-science/<topicKey>/<ID>.webp
        return !SCIENCE_SLUGS.has(slug) || dirSlug !== slug;
      });
    expect(bad.map(({ f, q }) => `${q.id}:${q.topicKey}:${f.filePath}`)).toEqual([]);
  });

  it("every asset exists under lazytopper/public at the bound filePath", () => {
    const absent = batch.filter((f) => !fs.existsSync(path.join(PUBLIC, f.filePath.replace(/^\//, ""))));
    expect(absent.map((f) => f.filePath)).toEqual([]);
  });

  it("no FIG-SCI-1 asset lives under the legacy /visuals/ path", () => {
    const legacy = SCIENCE_FIGURE_VISUALS.filter(
      (f) => f.filePath.startsWith("/visuals/") && /(itembank|exemplar|ncert|cfpq)-science/.test(f.filePath),
    );
    expect(legacy).toEqual([]);
  });

  it("the resolver is exact: a bogus id yields nothing, one id per source yields exactly its one figure", () => {
    expect(getFiguresForQuestion("NOPE-000")).toEqual([]);
    expect(getFiguresForQuestion("CBE-S-ELEC-A-001").map((f) => f.filePath)).toEqual([
      "/figures/itembank-science/electricity/CBE-S-ELEC-A-001.webp",
    ]);
    expect(getFiguresForQuestion("LIGHT-EXMPLR-9-MCQ-016").map((f) => f.filePath)).toEqual([
      "/figures/exemplar-science/light-reflection-and-refraction/LIGHT-EXMPLR-9-MCQ-016.webp",
    ]);
    expect(getFiguresForQuestion("ELEC-NCERT-11-LA-006").map((f) => f.filePath)).toEqual([
      "/figures/ncert-science/electricity/ELEC-NCERT-11-LA-006.webp",
    ]);
    expect(getFiguresForQuestion("CFPQ-S-ELEC-008").map((f) => f.filePath)).toEqual([
      "/figures/cfpq-science/electricity/CFPQ-S-ELEC-008.webp",
    ]);
    // a bound row must resolve to ONE figure — a duplicate entry would draw the same figure twice
    const dup = batch.filter((f) => getFiguresForQuestion(f.questionId).length !== 1);
    expect(dup.map((f) => f.questionId)).toEqual([]);
  });
});
