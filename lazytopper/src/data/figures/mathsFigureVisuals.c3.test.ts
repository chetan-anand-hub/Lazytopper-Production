/**
 * mathsFigureVisuals.c3.test.ts — pins every DIAGRAMS-1 C3 PR-D1 binding (Maths question figures) one by one.
 *
 * ★ WHY. The figure binder is id-keyed and exact, and a WRONG figure is worse than none. Each entry below is the
 * official paper's own embedded image (CBSE Additional Practice Questions 2023-24 / board paper 2026), extracted as-is
 * and eye-confirmed against its row's served stem before it was written. A silent re-point, a typo, a missing /
 * oversized / non-WebP asset, a chapter mismatch, or a row looked at and deliberately left unbound quietly gaining a
 * figure all fail here. Same checks as mathsFigureVisuals.diagrams1.test.ts (B's PR-1 pin), kept in a separate file so
 * neither lane edits the other's counts.
 *
 * BOUND_BUT_WITHHELD (C3): rows that would carry a bound figure while the bank withholds them. EMPTY in PR-D1: the 11
 * withheld C3 rows (areas-related-to-circles, polynomials, statistics) were cropped and eye-confirmed but NOT bound,
 * because the shared BOUND_BUT_WITHHELD list is closed over PR-1's pins by diagrams1.test.ts. They are pinned below as
 * C3_NOT_BOUND until that list can take them.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, RAW_CANONICAL_QUESTION_BANK } from "../canonicalQuestionBank";
import { MATHS_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";
import { BOUND_BUT_WITHHELD } from "./mathsFigureVisuals";

const PUBLIC = path.resolve(__dirname, "..", "..", "..", "public");
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const inBank = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));

// [questionId, filePath] in source order.
const C3_BINDINGS: ReadonlyArray<readonly [string, string]> = [
  ["APQ-M-SAV-004", "/figures/apq-maths/surface-areas-and-volumes/APQ-M-SAV-004.webp"], // Mathematics-PQ1.pdf p15 (xref 97)
  ["APQ-M-SAV-007", "/figures/apq-maths/surface-areas-and-volumes/APQ-M-SAV-007.webp"], // Mathematics-PQ_2022.pdf p7 (xref 50)
  ["PYQ-M-2026-SAV-003", "/figures/pyq-maths/surface-areas-and-volumes/PYQ-M-2026-SAV-003.webp"], // 1172-2_30-5-2 p21 (xref 200)
  ["PYQ-M-2026-AP-001", "/figures/pyq-maths/arithmetic-progression/PYQ-M-2026-AP-001.webp"], // 1171-1_30-4-1 p21 (xref 193)
];

// C3 rows bound while withheld (each must also be a key of the shared BOUND_BUT_WITHHELD). None in PR-D1.
const C3_BOUND_BUT_WITHHELD: readonly string[] = [];

// Looked at and deliberately NOT bound in PR-D1 — must keep resolving to NO figure.
const C3_NOT_BOUND = [
  "APQ-M-QE-003", // NO-MATCH: the printed figure (cuboid with water, two orientations) belongs to the OR part; the served row has no OR part
  // Withheld rows: cropped + eye-confirmed MATCH, binding held (the shared BOUND_BUT_WITHHELD list is closed over PR-1's pins)
  "APQ-M-ARC-001", "APQ-M-ARC-002", "APQ-M-ARC-003", "APQ-M-ARC-004", "APQ-M-ARC-006", "APQ-M-ARC-008", "APQ-M-ARC-010",
  "SQP-M-POLY-001", "APQ-M-POLY-001", "APQ-M-STAT-003", "APQ-M-STAT-008",
];

// `title` is rendered as the figure's <img alt>: it must DESCRIBE the figure, never be the generic placeholder.
const isDescriptiveAlt = (t: string) => t.length >= 20 && !/^Source figure/i.test(t) && !t.includes('"');
const slug = (chapter: string) => chapter.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const c3Paths = new Set(C3_BINDINGS.map(([, p]) => p));
const c3Entries = MATHS_FIGURE_VISUALS.filter((f) => c3Paths.has(f.filePath));

describe("DIAGRAMS-1 C3 PR-D1 bindings are exactly the eye-confirmed set", () => {
  it("the pinned set is the size this PR shipped: 4 figures for 4 rows", () => {
    expect(C3_BINDINGS).toHaveLength(4);
    expect(new Set(C3_BINDINGS.map(([q]) => q)).size).toBe(4);
    expect(c3Paths.size).toBe(C3_BINDINGS.length); // no crop is reused for two bindings
    expect(c3Entries).toHaveLength(C3_BINDINGS.length); // each pinned file is bound exactly once in the registry
  });

  it("each pinned question resolves to exactly its pinned figures, in source order", () => {
    const byQid = new Map<string, string[]>();
    for (const [q, p] of C3_BINDINGS) byQid.set(q, [...(byQid.get(q) ?? []), p]);
    const wrong = [...byQid].filter(([q, ps]) => JSON.stringify(getFiguresForQuestion(q).map((f) => f.filePath)) !== JSON.stringify(ps));
    expect(wrong.map(([q]) => q)).toEqual([]);
  });

  it("every pinned question EXISTS in the bank and is served, or is declared bound-but-withheld", () => {
    expect(C3_BINDINGS.filter(([q]) => !inBank.has(q)).map(([q]) => q)).toEqual([]);
    const undeclared = C3_BINDINGS.filter(([q]) => !served.has(q) && !C3_BOUND_BUT_WITHHELD.includes(q)).map(([q]) => q);
    expect(undeclared).toEqual([]);
    // the C3 withheld list is a subset of the shared registry list, holds only C3 pins, and none of them is served
    expect(C3_BOUND_BUT_WITHHELD.filter((q) => !Object.prototype.hasOwnProperty.call(BOUND_BUT_WITHHELD, q))).toEqual([]);
    expect(C3_BOUND_BUT_WITHHELD.filter((q) => !C3_BINDINGS.some(([b]) => b === q))).toEqual([]);
    expect(C3_BOUND_BUT_WITHHELD.filter((q) => served.has(q))).toEqual([]);
  });

  it("every binding's chapter matches its row's chapter", () => {
    const mismatched = c3Entries.filter((f) => {
      const row = inBank.get(f.questionId ?? "");
      return !row || resolveCanonicalSlug(row.topicKey) !== slug(f.chapter);
    });
    expect(mismatched.map((f) => `${f.questionId}:${f.chapter}`)).toEqual([]);
  });

  it("every entry has the registry's raster-figure shape and a descriptive alt", () => {
    const bad = c3Entries.filter(
      (f) => f.subject !== "maths" || f.isInteractive !== false || f.keywords.length !== 0 || !isDescriptiveAlt(f.title)
        || !f.filePath.startsWith("/figures/") || !f.filePath.endsWith(".webp"),
    );
    expect(bad.map((f) => f.id)).toEqual([]);
    expect(new Set(c3Entries.map((f) => f.id)).size).toBe(c3Entries.length);
  });

  it("every asset exists under lazytopper/public, is a real WebP file, and is at most 80 KB", () => {
    const problems: string[] = [];
    for (const [, p] of C3_BINDINGS) {
      const abs = path.join(PUBLIC, p.replace(/^\//, ""));
      if (!fs.existsSync(abs)) { problems.push(`missing ${p}`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP") problems.push(`not webp ${p}`);
      if (buf.length > 80 * 1024) problems.push(`too big ${p} ${buf.length}`);
    }
    expect(problems).toEqual([]);
  });

  it("rows looked at and deliberately left unbound resolve to no figure", () => {
    expect(C3_NOT_BOUND.filter((q) => getFiguresForQuestion(q).length > 0)).toEqual([]);
    expect(C3_NOT_BOUND.filter((q) => C3_BINDINGS.some(([b]) => b === q))).toEqual([]);
  });

  it("no C3 binding is a Z3 decorative-photo row or a /visuals/ asset", () => {
    expect(C3_BINDINGS.map(([q]) => q).filter((q) => q.startsWith("Z3-"))).toEqual([]);
    expect([...c3Paths].filter((p) => p.startsWith("/visuals/"))).toEqual([]);
  });

  it("control: a bogus id resolves to nothing", () => {
    expect(getFiguresForQuestion("DIAGRAMS-1-C3-NO-SUCH-ID")).toEqual([]);
  });
});
