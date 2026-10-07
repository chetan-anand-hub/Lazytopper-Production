/**
 * scienceFigureVisuals.c3.test.ts — pins every C3 DIAGRAMS PR-S1 binding (Electricity, Human Eye, Magnetic Effects,
 * Acids) one by one.
 *
 * ★ WHY. The figure binder is id-keyed and exact, and a WRONG figure is worse than none. Each entry below was cropped
 * from an official source (CBSE board paper 2023-2026 / CBSE Additional Practice Questions 2023-24 / CBSE CFPQ
 * Science) and eye-confirmed against its own SERVED row before it was written. This file makes a silent re-point, a
 * typo, a missing or oversized asset, a non-WebP file, a chapter mismatch, or a binding on a row that stopped being
 * served fail loudly. Source PDF + page are repeated on each pin; the eye-confirm table lives with the PR evidence.
 *
 * Every C3 row is SERVED: none is declared in BOUND_BUT_WITHHELD, and none may be. Rows deliberately NOT bound are
 * pinned too (the served part prints no figure); they must keep resolving to NO figure.
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

// [questionId, filePath] in registry order.
const C3_BINDINGS: ReadonlyArray<readonly [string, string]> = [
  ["PYQ-S-2026-ELEC-006", "/figures/pyq-science/electricity/PYQ-S-2026-ELEC-006.webp"], // 31-3-2.pdf (2026) p27 Q36
  ["PYQ-S-2026-ELEC-007", "/figures/pyq-science/electricity/PYQ-S-2026-ELEC-007.webp"], // 31-3-3.pdf (2026) p27 Q37(b)
  ["PYQ-S-2025-ELEC-005", "/figures/pyq-science/electricity/PYQ-S-2025-ELEC-005.webp"], // 31-1-1_Science.pdf (2025) p17 Q32
  ["PYQ-S-2024-ELEC-002", "/figures/pyq-science/electricity/PYQ-S-2024-ELEC-002.webp"], // 31_4_1_Science.pdf (2024) p27 Q39
  ["APQ-S-EYE-002", "/figures/other-science/human-eye-and-colourful-world/APQ-S-EYE-002.webp"], // Science-PQ.pdf p12 Q36
  ["PYQ-S-LIGHT-002", "/figures/pyq-science/human-eye-and-colourful-world/PYQ-S-LIGHT-002.webp"], // 31_4_1_ Science.pdf (2023) p13 Q25(A)
  ["CFPQ-S-EYE-010", "/figures/cfpq-science/human-eye-and-colourful-world/CFPQ-S-EYE-010.webp"], // CFPQ_Science10.pdf p96 Q10
  ["APQ-S-MAG-002", "/figures/other-science/magnetic-effects-of-electric-current/APQ-S-MAG-002.webp"], // Science-PQ.pdf p8 Q25 OR
  ["PYQ-S-2025-MAG-006", "/figures/pyq-science/magnetic-effects-of-electric-current/PYQ-S-2025-MAG-006.webp"], // 31-3-3_Science.pdf (2025) p17 Q32(b)
  ["PYQ-S-2025-MAG-007", "/figures/pyq-science/magnetic-effects-of-electric-current/PYQ-S-2025-MAG-007.webp"], // 31-2-1_Science.pdf (2025) p21 Q36(a)
  ["CFPQ-S-ABS-013", "/figures/cfpq-science/acids-bases-and-salts/CFPQ-S-ABS-013.webp"], // CFPQ_Science10.pdf p14 Q13
];

// Not bound on purpose — must resolve to no figure.
const C3_NOT_BOUND = [
  "PYQ-S-2026-ELEC-010", // NO-FIGURE: 31-3-3.pdf p29 Q39 — the served part (a) prints no figure; the figure-bearing OR (b) is not served
  "PYQ-S-2026-MAG-002", // NO-FIGURE: 31-3-1.pdf p29 Q39 — part (a) asks the student to DRAW; the figure-bearing OR (b) is not served
];

// The registry's display chapter for each canonical slug this PR binds into.
const CHAPTER_FOR_SLUG: Record<string, string> = {
  electricity: "Electricity",
  "human-eye-and-colourful-world": "Human Eye and Colourful World",
  "magnetic-effects-of-electric-current": "Magnetic Effects of Electric Current",
  "acids-bases-and-salts": "Acids, Bases and Salts",
};

// The title is the image alt text: it must describe the figure, never the generic "Source figure".
const isDescriptiveAlt = (t: string) => t.length >= 20 && !/^Source figure/i.test(t) && !t.includes('"');
const c3Paths = new Set(C3_BINDINGS.map(([, p]) => p));
const c3Entries = SCIENCE_FIGURE_VISUALS.filter((f) => c3Paths.has(f.filePath));

describe("C3 DIAGRAMS PR-S1 bindings (Electricity, Human Eye, Magnetic Effects, Acids) are exactly the eye-confirmed set", () => {
  it("the pinned set is the size this PR shipped: 11 figures for 11 rows", () => {
    expect(C3_BINDINGS).toHaveLength(11);
    expect(new Set(C3_BINDINGS.map(([q]) => q)).size).toBe(11);
    expect(c3Paths.size).toBe(11); // no crop is reused for two bindings
    expect(c3Entries).toHaveLength(11); // each pinned file is bound exactly once in the registry
  });

  it("each pinned question resolves to exactly its pinned figure", () => {
    const wrong = C3_BINDINGS.filter(
      ([q, p]) => JSON.stringify(getFiguresForQuestion(q).map((f) => f.filePath)) !== JSON.stringify([p]),
    );
    expect(wrong.map(([q]) => q)).toEqual([]);
  });

  it("every pinned question is SERVED (in the bank, not withheld) and none is declared bound-but-withheld", () => {
    expect(C3_BINDINGS.filter(([q]) => !served.has(q)).map(([q]) => q)).toEqual([]);
    expect(C3_BINDINGS.filter(([q]) => WITHHELD_QUESTION_IDS.has(q)).map(([q]) => q)).toEqual([]);
    const declared = Object.keys(BOUND_BUT_WITHHELD);
    expect(C3_BINDINGS.filter(([q]) => declared.includes(q)).map(([q]) => q)).toEqual([]);
  });

  it("every binding's chapter matches its row's chapter and asset folder", () => {
    const mismatched = c3Entries.filter((f) => {
      const row = served.get(f.questionId ?? "");
      if (!row) return true;
      const s = resolveCanonicalSlug(row.topicKey);
      return CHAPTER_FOR_SLUG[s] !== f.chapter || f.filePath.split("/")[3] !== s;
    });
    expect(mismatched.map((f) => `${f.questionId}:${f.chapter}:${f.filePath}`)).toEqual([]);
  });

  it("every entry has the registry's raster-figure shape and a descriptive alt text", () => {
    const bad = c3Entries.filter(
      (f) => f.subject !== "science" || f.isInteractive !== false || f.keywords.length !== 0 || !isDescriptiveAlt(f.title)
        || !f.filePath.startsWith("/figures/") || !f.filePath.endsWith(".webp")
        || f.filePath.split("/").pop() !== `${f.questionId}.webp`,
    );
    expect(bad.map((f) => f.id)).toEqual([]);
    expect(new Set(SCIENCE_FIGURE_VISUALS.map((f) => f.id)).size).toBe(SCIENCE_FIGURE_VISUALS.length);
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

  it("rows deliberately left unbound resolve to no figure", () => {
    expect(C3_NOT_BOUND.filter((q) => getFiguresForQuestion(q).length > 0)).toEqual([]);
  });

  it("no C3 binding is a third-party booklet (SCO/SCQ) row or lives under a legacy / chapter-wise path", () => {
    expect(C3_BINDINGS.filter(([q]) => /^SC[OQ]-/.test(q)).map(([q]) => q)).toEqual([]);
    expect([...c3Paths].filter((p) => p.startsWith("/visuals/") || p.includes("/chapterwise-science/"))).toEqual([]);
  });

  it("control: a bogus id resolves to nothing", () => {
    expect(getFiguresForQuestion("C3-DIAGRAMS-S1-NO-SUCH-ID")).toEqual([]);
  });
});
