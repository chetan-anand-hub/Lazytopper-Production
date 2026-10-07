/**
 * mathsFigureVisuals.diagrams1.test.ts — pins every DIAGRAMS-1 PR-1 binding (Circles + Triangles) one by one.
 *
 * ★ WHY. The figure binder is id-keyed and exact, and a WRONG figure is worse than none. Each entry below was cropped
 * from an official source (CBSE board paper / Additional Practice Questions / sample paper / NCERT) and eye-confirmed
 * against its own row before it was written. This file makes a silent re-point, a typo, a missing or oversized asset,
 * a non-WebP file, a chapter mismatch, or a re-bound WRONG / decorative id fail loudly. The eye-confirm table (source
 * PDF, page, clip, what was matched) lives with the PR evidence; the trailing comment on each pin repeats source+page.
 *
 * Rows deliberately NOT bound are pinned too: two Exemplar rows whose stem contradicts the official figure, and two
 * AI-pack rows with no official figure found (they wait for a computed builder). They must keep resolving to NO figure.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { MATHS_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";

const PUBLIC = path.resolve(__dirname, "..", "..", "..", "public");
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const inBank = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));

// Bound rows that the bank currently WITHHOLDS. A binding on a withheld row is harmless (no student sees it) and is
// expected while BANK-FIX-1 PR-2 withholds rows for their missing figure: it lands, the figure is already bound, and
// the controller un-withholds rows one by one. Empty on trunk today. After BANK-FIX merges, list the withheld ids here
// (DIAGRAMS-1 PR-1 post-bankfix plan); a row listed here that is actually served fails, so the list cannot go stale.
const BOUND_BUT_WITHHELD: readonly string[] = [];

// [questionId, filePath] in source order (a row with two figures lists both, main figure first).
const PR1_BINDINGS: ReadonlyArray<readonly [string, string]> = [
  ["PYQ-M-CIRC-001", "/figures/pyq-maths/circles/PYQ-M-CIRC-001.webp"], // 30_2_1_Maths Standard.pdf p9
  ["PYQ-M-CIRC-006", "/figures/pyq-maths/circles/PYQ-M-CIRC-006.webp"], // 30_4_3 Maths Standard.pdf p7
  ["PYQ-M-CIRC-007", "/figures/pyq-maths/circles/PYQ-M-CIRC-007.webp"], // 30_5_1_Maths Standard.pdf p9
  ["PYQ-M-CIRC-009", "/figures/pyq-maths/circles/PYQ-M-CIRC-009.webp"], // 30_2_1_Maths Standard.pdf p13
  ["PYQ-M-CIRC-010", "/figures/pyq-maths/circles/PYQ-M-CIRC-010.webp"], // 30_5_1_Maths Standard.pdf p13
  ["PYQ-M-CIRC-013", "/figures/pyq-maths/circles/PYQ-M-CIRC-013.webp"], // 30_2_1_Maths Standard.pdf p17
  ["PYQ-M-TRI-002", "/figures/pyq-maths/triangles/PYQ-M-TRI-002.webp"], // 30_2_2_Maths Standard.pdf p5
  ["PYQ-M-TRI-003", "/figures/pyq-maths/triangles/PYQ-M-TRI-003.webp"], // 30_2_3_Maths Standard.pdf p5
  ["PYQ-M-TRI-004", "/figures/pyq-maths/triangles/PYQ-M-TRI-004.webp"], // 30_5_1_Maths Standard.pdf p5
  ["PYQ-M-2024-TRI-002", "/figures/pyq-maths/triangles/PYQ-M-2024-TRI-002.webp"], // 30-5-1(Mathematics Standard).pdf p9
  ["PYQ-M-2024-CIRC-002", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-002.webp"], // 30-2-2(Mathematics Standard).pdf p5 (embedded image)
  ["PYQ-M-2024-CIRC-003", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-003.webp"], // 30-3-1(Mathematics Standard).pdf p9 (embedded image)
  ["PYQ-M-2024-CIRC-004", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-004.webp"], // 30-4-1(Mathematics Standard).pdf p9
  ["PYQ-M-2024-CIRC-005", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-005.webp"], // 30-4-2(Mathematics Standard).pdf p5
  ["PYQ-M-2024-CIRC-006", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-006.webp"], // 30-5-1(Mathematics Standard).pdf p9
  ["PYQ-M-2024-CIRC-010a", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-010a.webp"], // 30-2-1(Mathematics Standard).pdf p17 (embedded image)
  ["PYQ-M-2024-CIRC-011a", "/figures/pyq-maths/circles/PYQ-M-2024-CIRC-011a.webp"], // 30-2-2(Mathematics Standard).pdf p15 (embedded image)
  ["PYQ-M-2025-CIRC-006", "/figures/pyq-maths/circles/PYQ-M-2025-CIRC-006.webp"], // 30-3-1_Mathematics Standard.pdf p15
  ["PYQ-M-2025-CIRC-007", "/figures/pyq-maths/circles/PYQ-M-2025-CIRC-007.webp"], // 30-3-3_Mathematics Standard.pdf p15
  ["PYQ-M-2026-TRI-004", "/figures/pyq-maths/triangles/PYQ-M-2026-TRI-004.webp"], // 1172-3_30-5-3  (Mathematics Standard).pdf p13
  ["PYQ-M-2026-CIRC-002", "/figures/pyq-maths/circles/PYQ-M-2026-CIRC-002.webp"], // 1171-1_30-4-1  (Mathematics Standard).pdf p15
  ["PYQ-M-2026-CIRC-005", "/figures/pyq-maths/circles/PYQ-M-2026-CIRC-005.webp"], // 1171-1_30-4-1  (Mathematics Standard).pdf p17
  ["APQ-M-TRI-001", "/figures/apq-maths/triangles/APQ-M-TRI-001.webp"], // Mathematics-PQ1.pdf p5
  ["APQ-M-TRI-003", "/figures/apq-maths/triangles/APQ-M-TRI-003.webp"], // Mathematics-PQ1.pdf p6
  ["APQ-M-TRI-005", "/figures/apq-maths/triangles/APQ-M-TRI-005.webp"], // Mathematics-PQ2.pdf p2
  ["APQ-M-TRI-006", "/figures/apq-maths/triangles/APQ-M-TRI-006.webp"], // Mathematics-PQ2.pdf p4
  ["APQ-M-TRI-009", "/figures/apq-maths/triangles/APQ-M-TRI-009.webp"], // Mathematics-PQ_2022.pdf p3
  ["APQ-M-TRI-010", "/figures/apq-maths/triangles/APQ-M-TRI-010.webp"], // Mathematics-PQ_2022.pdf p3
  ["APQ-M-CIRC-001", "/figures/apq-maths/circles/APQ-M-CIRC-001.webp"], // Mathematics-PQ1.pdf p7
  ["APQ-M-CIRC-002", "/figures/apq-maths/circles/APQ-M-CIRC-002.webp"], // Mathematics-PQ1.pdf p8
  ["APQ-M-CIRC-005", "/figures/apq-maths/circles/APQ-M-CIRC-005.webp"], // Mathematics-PQ1.pdf p14
  ["APQ-M-CIRC-007", "/figures/apq-maths/circles/APQ-M-CIRC-007.webp"], // Mathematics-PQ1.pdf p19
  ["APQ-M-CIRC-007", "/figures/apq-maths/circles/APQ-M-CIRC-007-2.webp"], // Mathematics-PQ1.pdf p19
  ["APQ-M-CIRC-009", "/figures/apq-maths/circles/APQ-M-CIRC-009.webp"], // Mathematics-PQ_2022.pdf p5
  ["APQ-M-CIRC-010", "/figures/apq-maths/circles/APQ-M-CIRC-010.webp"], // Mathematics-PQ_2022.pdf p9
  ["APQ-M-CIRC-011", "/figures/apq-maths/circles/APQ-M-CIRC-011.webp"], // Mathematics-PQ_2022.pdf p12
  ["SQP-M-TRI-003", "/figures/sqp-maths/triangles/SQP-M-TRI-003.webp"], // MathsStandard-SQP.pdf p7 (embedded image)
  ["CIRC-N-NCERT-10-MCQ-003", "/figures/ncert-maths/circles/CIRC-N-NCERT-10-MCQ-003.webp"], // jemh110.pdf p8
  ["CIR-M05", "/figures/ncert-maths/circles/CIR-M05.webp"], // jemh110.pdf p9 (NCERT Fig. 10.13; stem = NCERT Ex 10.2 Q9 verbatim)
];

// Not bound on purpose — must resolve to no figure.
const PR1_NOT_BOUND = [
  "TRI-N-EXMPLR-6-SA-011", // NO-MATCH: stem says "C on segment BD"; Exemplar Fig. 6.12 has D on AB
  "TRI-N-EXMPLR-6-LA-002", // NO-MATCH: stem says AB and CD intersect at P; Exemplar Fig. 6.16 has AC and BD crossing at P
  "CIR-E09", "CIR-E19", // AI pack: no official figure found for these two stems (wait for a computed circle+tangent builder)
];

// Census 2026-10-07 Appendix 3: bound figures BANK-FIX-1 PR-2 found WRONG. PR-1 must never bind any of them.
const CENSUS_WRONG_IDS = [
  "CTRL-EXMPLR-6-SA-003", "Z3-CG-004", "Z3-ARC-004", "CBE-M-STAT-B-001", "CBE-M-STAT-C-001", "CBE-S-CTRL-A-005",
  "CBE-S-CTRL-E-001", "CBE-S-MAGN-B-005", "PB-M-1-TRIG-C-001", "APQ-M-TRI-008", "SCO-S-CTRL-013", "SCO-S-EYE-007",
  "PYQ-M-2026-POLY-005", "PYQ-S-2026-EYE-002",
];

// `title` is rendered as the figure's <img alt>: it must DESCRIBE the figure, never be the generic placeholder.
const isDescriptiveAlt = (t: string) => t.length >= 20 && !/^Source figure/i.test(t) && !t.includes('"');
const slug = (chapter: string) => chapter.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const pr1Paths = new Set(PR1_BINDINGS.map(([, p]) => p));
const pr1Entries = MATHS_FIGURE_VISUALS.filter((f) => pr1Paths.has(f.filePath));

describe("DIAGRAMS-1 PR-1 bindings (Circles + Triangles) are exactly the eye-confirmed set", () => {
  it("the pinned set is the size this PR shipped: 39 figures for 38 rows", () => {
    expect(PR1_BINDINGS).toHaveLength(39);
    expect(new Set(PR1_BINDINGS.map(([q]) => q)).size).toBe(38);
    expect(pr1Paths.size).toBe(39); // no crop is reused for two bindings
    expect(pr1Entries).toHaveLength(39); // each pinned file is bound exactly once in the registry
  });

  it("each pinned question resolves to exactly its pinned figures, in source order", () => {
    const byQid = new Map<string, string[]>();
    for (const [q, p] of PR1_BINDINGS) byQid.set(q, [...(byQid.get(q) ?? []), p]);
    const wrong = [...byQid].filter(([q, ps]) => JSON.stringify(getFiguresForQuestion(q).map((f) => f.filePath)) !== JSON.stringify(ps));
    expect(wrong.map(([q]) => q)).toEqual([]);
  });

  it("every pinned question EXISTS in the bank and is served, or is declared in BOUND_BUT_WITHHELD", () => {
    const absent = PR1_BINDINGS.filter(([q]) => !inBank.has(q)).map(([q]) => q);
    expect(absent).toEqual([]);
    const undeclared = PR1_BINDINGS.filter(([q]) => !served.has(q) && !BOUND_BUT_WITHHELD.includes(q)).map(([q]) => q);
    expect(undeclared).toEqual([]);
    const stale = BOUND_BUT_WITHHELD.filter((q) => served.has(q) || !WITHHELD_QUESTION_IDS.has(q));
    expect(stale).toEqual([]); // declared withheld but actually served (or not withheld at all)
    expect(BOUND_BUT_WITHHELD.filter((q) => !PR1_BINDINGS.some(([b]) => b === q))).toEqual([]);
  });

  it("every binding's chapter matches its row's chapter (served or withheld)", () => {
    const mismatched = pr1Entries.filter((f) => {
      const row = inBank.get(f.questionId ?? "");
      return !row || resolveCanonicalSlug(row.topicKey) !== slug(f.chapter);
    });
    expect(mismatched.map((f) => `${f.questionId}:${f.chapter}`)).toEqual([]);
  });

  it("every entry has the registry's raster-figure shape", () => {
    const bad = pr1Entries.filter(
      (f) => f.subject !== "maths" || f.isInteractive !== false || f.keywords.length !== 0 || !isDescriptiveAlt(f.title)
        || !f.filePath.startsWith("/figures/") || !f.filePath.endsWith(".webp"),
    );
    expect(bad.map((f) => f.id)).toEqual([]);
    expect(new Set(pr1Entries.map((f) => f.id)).size).toBe(pr1Entries.length);
  });

  it("every asset exists under lazytopper/public, is a real WebP file, and is at most 80 KB", () => {
    const problems: string[] = [];
    for (const [, p] of PR1_BINDINGS) {
      const abs = path.join(PUBLIC, p.replace(/^\//, ""));
      if (!fs.existsSync(abs)) { problems.push(`missing ${p}`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP") problems.push(`not webp ${p}`);
      if (buf.length > 80 * 1024) problems.push(`too big ${p} ${buf.length}`);
    }
    expect(problems).toEqual([]);
  });

  it("rows deliberately left unbound resolve to no figure", () => {
    const bound = PR1_NOT_BOUND.filter((q) => getFiguresForQuestion(q).length > 0);
    expect(bound).toEqual([]);
  });

  it("no PR-1 binding re-binds a census WRONG id or a Z3 decorative-photo row", () => {
    const qids = PR1_BINDINGS.map(([q]) => q);
    expect(qids.filter((q) => CENSUS_WRONG_IDS.includes(q))).toEqual([]);
    expect(qids.filter((q) => q.startsWith("Z3-"))).toEqual([]);
    expect([...pr1Paths].filter((p) => p.startsWith("/visuals/"))).toEqual([]); // Z3 stock photos live under /visuals/
  });

  it("control: a bogus id resolves to nothing", () => {
    expect(getFiguresForQuestion("DIAGRAMS-1-NO-SUCH-ID")).toEqual([]);
  });
});
