/**
 * scienceFigureVisuals.reachability.test.ts — a bound figure is only useful if the row it is bound
 * to is actually SERVED and actually REACHABLE from the surfaces that render figures.
 * Mirror of mathsFigureVisuals.reachability.test.ts for the FIG-SCI-1 batch, extended by FIG-SCI-2
 * (Foundation pack, chapter-wise booklets, board papers, sample papers, additional practice papers).
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
 *
 * FIG-SCI-2 adds six NEW prefixes (`/figures/{foundation,chapterwise,pyq,preboard,sqp,other}-science/`)
 * that nothing shipped under before, so its sub-batch is pinned separately (49 entries = 48 rows;
 * PYQ-S-2026-ELEC-011 prints TWO figures and is the one id allowed to resolve to two). Every other
 * assertion runs over the union, so a typo in either lane's entries is caught by the same checks.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { SCIENCE_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";
import { BOUND_BUT_WITHHELD } from "./scienceFigureVisuals";

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
const FIG_SCI_2_PREFIXES = [
  "/figures/foundation-science/", "/figures/chapterwise-science/", "/figures/pyq-science/",
  "/figures/preboard-science/", "/figures/sqp-science/", "/figures/other-science/",
];
const PREFIXES = [...FIG_SCI_1_PREFIXES, ...FIG_SCI_2_PREFIXES];
// The one FIG-SCI-2 row whose source prints two figures (V-I graph + circuit): two entries, in order.
const TWO_FIGURE_IDS = new Map<string, number>([["PYQ-S-2026-ELEC-011", 2]]);
// Bound by CFPQ-FIGURES-1 before this lane, under the same /figures/cfpq-science/ prefix.
const CFPQ_FIGURES_1_IDS = new Set([
  "CFPQ-S-ELEC-001", "CFPQ-S-ELEC-002", "CFPQ-S-ELEC-003", "CFPQ-S-ELEC-004", "CFPQ-S-ELEC-005",
  "CFPQ-S-ELEC-006", "CFPQ-S-ELEC-007", "CFPQ-S-ELEC-009", "CFPQ-S-ELEC-011", "CFPQ-S-ELEC-013",
  "CFPQ-S-ELEC-014", "CFPQ-S-ELEC-015",
]);
const batch = SCIENCE_FIGURE_VISUALS.filter(
  (f) => PREFIXES.some((p) => f.filePath.startsWith(p)) && !CFPQ_FIGURES_1_IDS.has(f.questionId ?? ""),
);
const batch1 = batch.filter((f) => FIG_SCI_1_PREFIXES.some((p) => f.filePath.startsWith(p)));
const batch2 = batch.filter((f) => FIG_SCI_2_PREFIXES.some((p) => f.filePath.startsWith(p)));

describe("FIG-SCI-1 + FIG-SCI-2 bindings are served and reachable", () => {
  it("the batch is present and is the size the two lanes shipped", () => {
    // 109 = 44 Item Bank Science + 34 NCERT Exemplar + 7 NCERT textbook + 24 CFPQ Science (FIG-SCI-1)
    // 109 -> 108 at LIGHT-FIX-1 (2026-09-11): LIGHT-EXMPLR-9-MCQ-004 withheld (answer-mismatch), its binding removed
    // 109 -> 108 at ELEC-FIX-1 (2026-09-11): CBE-S-ELEC-A-003 unbound (row withheld, crop kept on disk).
    // 108 -> 107 at MERGE-ELEC (2026-09-11): both removals land together (LIGHT-FIX-1 via #774 + ELEC-FIX-1) = 43 Item Bank + 33 Exemplar + 7 NCERT + 24 CFPQ.
    // 107 -> 105 at SYLLABUS-FIX-CONTENT PR-1 (2026-10-06): CBE-S-MAGN-E-001 and MAG-EXMPLR-12-MCQ-007 unbound (rows withheld, formative-only EMI / out-of-syllabus; crops kept on disk).
    // 105 -> 104 at QUICK-FIXES-1 PR-2 (2026-10-06): CFPQ-S-CARB-013 unbound (row withheld, owner ruling R6; crop kept on disk).
    // 104 -> 101 at BANK-FIX-1 PR-2 (2026-10-07): CBE-S-CTRL-E-001 (served; its bound figure does not match the question,
    // the fixed text is self-contained), CBE-S-MAGN-B-005 and CTRL-EXMPLR-6-SA-003 unbound (rows withheld). Crops kept on disk.
    // 101 -> 100 at BANK-FIX-1 PR-2 phase B (2026-10-07): CBE-S-CTRL-A-005 unbound (row withheld: the figure shows an
    // upright seedling and no light source, so the item is undecidable). Crop kept on disk.
    // 100 -> 99 at DIAGRAMS-1 PR-3 (2026-10-07): CBE-S-LGHT-E-001 unbound (incomplete crop: two parallel arrows, no lens;
    // the stem is self-contained after BANK-FIX). Row stays served; crop kept on disk.
    // 99 -> 100 at DIAGRAMS-1 PR-4 (2026-10-07): +1 NCERT Exemplar crop (CTRL-EXMPLR-6-MCQ-025, bound but withheld).
    // Each PR-4 binding is pinned one by one in scienceFigureVisuals.diagrams1.test.ts.
    expect(batch1).toHaveLength(100);
    // 49 = 3 Foundation + 12 chapter-wise + 17 board-paper (16 rows, ELEC-011 twice) + 13 preboard + 2 SQP + 2 APQ (FIG-SCI-2)
    // 49 -> 46 at LIGHT-FIX-1 stage 2 (2026-09-11): the 3 Foundation rows (FND-L-SPX-003/-004/-043) are
    // withheld as out-of-syllabus (beyond-board tier) and their bindings removed
    // 49 -> 47 at ELEC-FIX-1 (2026-09-11): PYQ-S-2025-ELEC-009 and PYQ-S-ELEC-004 unbound (rows withheld, crops kept on disk).
    // 46 -> 44 at MERGE-ELEC (2026-09-11): both removals land together (LIGHT-FIX-1 via #774 + ELEC-FIX-1) = 0 Foundation + 12 chapter-wise + 15 board-paper + 13 preboard + 2 SQP + 2 APQ.
    // 44 -> 43 at SYLLABUS-FIX-CONTENT PR-1 (2026-10-06): SCO-S-MAG-016 unbound (row withheld; crop kept on disk).
    // 43 -> 42 at QUICK-FIXES-1 PR-2 (2026-10-06): SQP-S-CC-002 unbound (row withheld, owner ruling R6; crop kept on disk).
    // 42 -> 39 at BANK-FIX-1 PR-2 (2026-10-07): PYQ-S-2026-EYE-002, SCO-S-CTRL-013 and SCO-S-EYE-007 unbound
    // (rows withheld: garbled / garbled / syllabus-excluded; crops kept on disk).
    // 39 -> 48 at DIAGRAMS-1 PR-3 (2026-10-07): +9 Light / Life Processes crops for 9 rows (7 board-paper 2023-2026 under
    // /figures/pyq-science/, 2 APQ 2023-24 under /figures/other-science/); counted from the registry after the merge with
    // BANK-FIX. 4 of the 9 are bound but withheld (BOUND_BUT_WITHHELD in scienceFigureVisuals.ts). Each binding is pinned
    // one by one in scienceFigureVisuals.diagrams1.test.ts.
    // 48 -> 39 at DIAGRAMS-1 PR-3 (2026-10-07): -9 at DIAGRAMS-1 PR-3 (2026-10-07): third-party chapter-wise booklet figures unbound (owner ruling)
    // 39 -> 40 at DIAGRAMS-1 PR-4 (2026-10-07): +1 board-paper crop (PYQ-S-2026-ENV-001, bound but withheld).
    expect(batch2).toHaveLength(40);
    // 147 -> 138: -9 at DIAGRAMS-1 PR-3 (2026-10-07): third-party chapter-wise booklet figures unbound (owner ruling)
    expect(batch).toHaveLength(100 + 40);
    // and the earlier lane's 12 cfpq entries are all still present under the shared prefix
    const earlier = SCIENCE_FIGURE_VISUALS.filter((f) => CFPQ_FIGURES_1_IDS.has(f.questionId ?? ""));
    expect(earlier).toHaveLength(12);
  });

  it("every binding names a SERVED question — in canonicalQuestionBank and not withheld", () => {
    // Declared exception: rows in BOUND_BUT_WITHHELD (scienceFigureVisuals.ts) carry a bound figure while BANK-FIX
    // withholds them; each has a stated reason, and a declared row that is actually served is itself a failure.
    const declared = (q: string | undefined) => Object.prototype.hasOwnProperty.call(BOUND_BUT_WITHHELD, q ?? "");
    const missing = batch.filter((f) => !served.has(f.questionId ?? "") && !declared(f.questionId));
    expect(missing.map((f) => f.questionId)).toEqual([]);
    const withheld = batch.filter((f) => WITHHELD_QUESTION_IDS.has(f.questionId ?? "") && !declared(f.questionId));
    expect(withheld.map((f) => f.questionId)).toEqual([]);
    expect(Object.keys(BOUND_BUT_WITHHELD).filter((q) => served.has(q))).toEqual([]);
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

  it("no FIG-SCI-1 / FIG-SCI-2 asset lives under the legacy /visuals/ path", () => {
    const legacy = SCIENCE_FIGURE_VISUALS.filter(
      (f) =>
        f.filePath.startsWith("/visuals/") &&
        /(itembank|exemplar|ncert|cfpq|foundation|chapterwise|pyq|preboard|sqp|other)-science/.test(f.filePath),
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
    // FIG-SCI-2: one id per source family resolves to exactly its one figure
    // (foundation-science: FND-L-SPX-003 was the control until LIGHT-FIX-1 stage 2 withheld it and
    // removed its binding — the family now has no entries, so the control is that the id resolves to NOTHING)
    expect(getFiguresForQuestion("FND-L-SPX-003")).toEqual([]);
    // SCO-S-ELEC-012 resolves to nothing since DIAGRAMS-1 PR-3 (2026-10-07): the chapter-wise booklet figures are unbound (owner ruling)
    expect(getFiguresForQuestion("SCO-S-ELEC-012")).toEqual([]);
    // probe PYQ-S-2025-ELEC-009 -> PYQ-S-2026-ELEC-012 at ELEC-FIX-1 (2026-09-11): -009 is withheld and unbound.
    expect(getFiguresForQuestion("PYQ-S-2026-ELEC-012").map((f) => f.filePath)).toEqual([
      "/figures/pyq-science/electricity/PYQ-S-2026-ELEC-012.webp",
    ]);
    expect(getFiguresForQuestion("SQP-S-2023-ELEC-A-002").map((f) => f.filePath)).toEqual([
      "/figures/preboard-science/electricity/SQP-S-2023-ELEC-A-002.webp",
    ]);
    expect(getFiguresForQuestion("APQ-S-EYE-003").map((f) => f.filePath)).toEqual([
      "/figures/other-science/human-eye-and-colourful-world/APQ-S-EYE-003.webp",
    ]);
    // the two-figure row resolves to BOTH its figures, in source order (graph first, circuit second)
    expect(getFiguresForQuestion("PYQ-S-2026-ELEC-011").map((f) => f.filePath)).toEqual([
      "/figures/pyq-science/electricity/PYQ-S-2026-ELEC-011.webp",
      "/figures/pyq-science/electricity/PYQ-S-2026-ELEC-011-2.webp",
    ]);
    // a bound row must resolve to exactly the figures its source prints (one, or the declared two) —
    // a duplicate entry would draw the same figure twice, a typo'd id would resolve to nothing
    const dup = batch.filter(
      (f) => getFiguresForQuestion(f.questionId).length !== (TWO_FIGURE_IDS.get(f.questionId ?? "") ?? 1),
    );
    expect(dup.map((f) => f.questionId)).toEqual([]);
  });
});
