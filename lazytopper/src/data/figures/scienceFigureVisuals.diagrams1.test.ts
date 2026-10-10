/**
 * scienceFigureVisuals.diagrams1.test.ts — pins every DIAGRAMS-1 PR-3 binding (Light + Life Processes) one by one.
 *
 * ★ WHY. The figure binder is id-keyed and exact, and a WRONG figure is worse than none. Each entry below was cropped
 * from an official source (CBSE board paper 2023-2026 / CBSE Additional Practice Questions 2023-24) and eye-confirmed against its own row before it was written.
 * This file makes a silent re-point, a typo, a missing or oversized asset, a non-WebP file, a chapter mismatch, or a
 * re-bound WRONG / decorative id fail loudly. The eye-confirm table (source PDF, page, clip, what was matched) lives
 * with the PR evidence; the trailing comment on each pin repeats source + page.
 *
 * Rows deliberately NOT bound are pinned too (no official printed figure, a non-official source, or a figure that would
 * give the answer away); they must keep resolving to NO figure. Bound rows that BANK-FIX withholds are declared, with a
 * reason, in BOUND_BUT_WITHHELD (scienceFigureVisuals.ts); a declared row that is in fact served fails.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonicalQuestionBank, RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { SCIENCE_FIGURE_VISUALS, getFiguresForQuestion } from "../visualConceptRegistry";
import { resolveCanonicalSlug } from "../bankQuery";
import { BOUND_BUT_WITHHELD as BOUND_BUT_WITHHELD_REASONS } from "./scienceFigureVisuals";

const PUBLIC = path.resolve(__dirname, "..", "..", "..", "public");
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const inBank = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const BOUND_BUT_WITHHELD: readonly string[] = Object.keys(BOUND_BUT_WITHHELD_REASONS);

// [questionId, filePath] in source order.
const PR3_BINDINGS: ReadonlyArray<readonly [string, string]> = [
  ["PYQ-S-2026-LIGHT-004", "/figures/pyq-science/light-reflection-and-refraction/PYQ-S-2026-LIGHT-004.webp"], // 31-2-1.pdf p27
  ["PYQ-S-2026-LIGHT-006", "/figures/pyq-science/light-reflection-and-refraction/PYQ-S-2026-LIGHT-006.webp"], // 31-2-2.pdf p27
  ["PYQ-S-2026-LIGHT-007", "/figures/pyq-science/light-reflection-and-refraction/PYQ-S-2026-LIGHT-007.webp"], // 31-3-1.pdf p25
  ["PYQ-S-2025-LIGHT-005", "/figures/pyq-science/light-reflection-and-refraction/PYQ-S-2025-LIGHT-005.webp"], // 31-2-1_Science.pdf (2025) p9
  ["PYQ-S-2026-LIFEP-004", "/figures/pyq-science/life-processes/PYQ-S-2026-LIFEP-004.webp"], // 1190-1_31-4-1_Science.pdf p5
  ["PYQ-S-LIFE-002", "/figures/pyq-science/life-processes/PYQ-S-LIFE-002.webp"], // 31_2_1_Science.pdf (2023) p7
  ["PYQ-S-2024-LIFEP-007", "/figures/pyq-science/life-processes/PYQ-S-2024-LIFEP-007.webp"], // 31_5_1_Science.pdf (2024) p21
  ["APQ-S-LIFE-002", "/figures/other-science/life-processes/APQ-S-LIFE-002.webp"], // Science-PQ.pdf p4
  ["APQ-S-LIFE-012", "/figures/other-science/life-processes/APQ-S-LIFE-012.webp"], // Science-PQ2.pdf p9
];

// Not bound on purpose — must resolve to no figure.
const PR3_NOT_BOUND = [
  "PYQ-S-2024-LIGHT-009", // NOT-FOUND: 31_4_3_Science.pdf (2024) p21 Q36 prints no figure; the OR part asks the student to DRAW
  "FND-L-QB-130", // OUT: Foundation study-package row (not an official source)
  "LP-M11", // OUT: AI-pack row; no official figure exists
  "SQP-S-LIGHT-004", // DROPPED: BANK-FIX made the stem self-contained and the SQP lens figure gives away part (i) 'what kind of lens'
  "SCO-S-LIFE-003", "SCO-S-LIFE-011", "SCO-S-LIFE-020", // DROPPED: only source is the cbse.online / rava.org.in booklet, not official
  "CBE-S-LGHT-E-001", // UNBOUND (trunk binding removed): Item Bank crop shows two parallel arrows and no lens; stem self-contained after BANK-FIX
];

// Census 2026-10-07 Appendix 3: bound figures BANK-FIX-1 PR-2 found WRONG. PR-3 must never bind any of them.
const CENSUS_WRONG_IDS = [
  "CTRL-EXMPLR-6-SA-003", "Z3-CG-004", "Z3-ARC-004", "CBE-M-STAT-B-001", "CBE-M-STAT-C-001", "CBE-S-CTRL-A-005",
  "CBE-S-CTRL-E-001", "CBE-S-MAGN-B-005", "PB-M-1-TRIG-C-001", "APQ-M-TRI-008", "SCO-S-CTRL-013", "SCO-S-EYE-007",
  "PYQ-M-2026-POLY-005", "PYQ-S-2026-EYE-002",
];

// The registry's display chapter for each canonical slug this PR binds into.
const CHAPTER_FOR_SLUG: Record<string, string> = {
  "light-reflection-and-refraction": "Light - Reflection & Refraction",
  "life-processes": "Life Processes",
};

// The title is the image alt text: it must describe the figure, never the generic "Source figure".
const isDescriptiveAlt = (t: string) => t.length >= 20 && !/^Source figure/i.test(t) && !t.includes('"');
const pr3Paths = new Set(PR3_BINDINGS.map(([, p]) => p));
const pr3Entries = SCIENCE_FIGURE_VISUALS.filter((f) => pr3Paths.has(f.filePath));

describe("DIAGRAMS-1 PR-3 bindings (Light + Life Processes) are exactly the eye-confirmed set", () => {
  it("the pinned set is the size this PR shipped: 9 figures for 9 rows (after the BANK-FIX merge)", () => {
    expect(PR3_BINDINGS).toHaveLength(9);
    expect(new Set(PR3_BINDINGS.map(([q]) => q)).size).toBe(9);
    expect(pr3Paths.size).toBe(9); // no crop is reused for two bindings
    expect(pr3Entries).toHaveLength(9); // each pinned file is bound exactly once in the registry
  });

  it("each pinned question resolves to exactly its pinned figure", () => {
    const wrong = PR3_BINDINGS.filter(
      ([q, p]) => JSON.stringify(getFiguresForQuestion(q).map((f) => f.filePath)) !== JSON.stringify([p]),
    );
    expect(wrong.map(([q]) => q)).toEqual([]);
  });

  it("every pinned question EXISTS in the bank and is served, or is declared in BOUND_BUT_WITHHELD", () => {
    expect(PR3_BINDINGS.filter(([q]) => !inBank.has(q)).map(([q]) => q)).toEqual([]);
    const undeclared = PR3_BINDINGS.filter(([q]) => !served.has(q) && !BOUND_BUT_WITHHELD.includes(q)).map(([q]) => q);
    expect(undeclared).toEqual([]);
    const stale = BOUND_BUT_WITHHELD.filter((q) => served.has(q) || !WITHHELD_QUESTION_IDS.has(q));
    expect(stale).toEqual([]); // declared withheld but actually served (or not withheld at all)
    // every declared row is bound by PR-3 or PR-4 (the PR-4 rows are pinned in the PR-4 block below), or is a C3 PR-S1
    // row pinned in scienceFigureVisuals.c3.test.ts. 2026-10-10 (B-21, LANE_RULES §8 amendment, +1 id):
    // PYQ-S-2025-MAG-006, withheld by BANK-FIX-5 (#1041) after C3 bound it.
    const C3_DECLARED = ["PYQ-S-2025-MAG-006"];
    expect(BOUND_BUT_WITHHELD.filter((q) => ![...PR3_BINDINGS, ...PR4_BINDINGS].some(([b]) => b === q) && !C3_DECLARED.includes(q))).toEqual([]);
  });

  it("every binding's chapter matches its row's chapter and asset folder (served or withheld)", () => {
    const mismatched = pr3Entries.filter((f) => {
      const row = inBank.get(f.questionId ?? "");
      if (!row) return true;
      const s = resolveCanonicalSlug(row.topicKey);
      return CHAPTER_FOR_SLUG[s] !== f.chapter || f.filePath.split("/")[3] !== s;
    });
    expect(mismatched.map((f) => `${f.questionId}:${f.chapter}:${f.filePath}`)).toEqual([]);
  });

  it("every entry has the registry's raster-figure shape", () => {
    const bad = pr3Entries.filter(
      (f) => f.subject !== "science" || f.isInteractive !== false || f.keywords.length !== 0 || !isDescriptiveAlt(f.title)
        || !f.filePath.startsWith("/figures/") || !f.filePath.endsWith(".webp")
        || f.filePath.split("/").pop() !== `${f.questionId}.webp`,
    );
    expect(bad.map((f) => f.id)).toEqual([]);
    expect(new Set(SCIENCE_FIGURE_VISUALS.map((f) => f.id)).size).toBe(SCIENCE_FIGURE_VISUALS.length);
  });

  it("every asset exists under lazytopper/public, is a real WebP file, and is at most 80 KB", () => {
    const problems: string[] = [];
    for (const [, p] of PR3_BINDINGS) {
      const abs = path.join(PUBLIC, p.replace(/^\//, ""));
      if (!fs.existsSync(abs)) { problems.push(`missing ${p}`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP") problems.push(`not webp ${p}`);
      if (buf.length > 80 * 1024) problems.push(`too big ${p} ${buf.length}`);
    }
    expect(problems).toEqual([]);
  });

  it("rows deliberately left unbound resolve to no figure", () => {
    expect(PR3_NOT_BOUND.filter((q) => getFiguresForQuestion(q).length > 0)).toEqual([]);
  });

  it("no PR-3 binding re-binds a census WRONG id or a Z3 decorative-photo row", () => {
    const qids = PR3_BINDINGS.map(([q]) => q);
    expect(qids.filter((q) => CENSUS_WRONG_IDS.includes(q))).toEqual([]);
    expect(qids.filter((q) => q.startsWith("Z3-"))).toEqual([]);
    expect([...pr3Paths].filter((p) => p.startsWith("/visuals/"))).toEqual([]); // Z3 stock photos live under /visuals/
  });

  it("the 9 third-party chapter-wise booklet figures are unbound (owner ruling)", () => {
    const ids = [
      "SCO-S-CTRL-011", "SCO-S-ELEC-012", "SCO-S-ELEC-013", "SCQ-S-ELEC-032", "SCQ-S-REPR-041",
      "SCQ-S-EYE-036", "SCO-S-LIFE-009", "SCO-S-LIGHT-005", "SCQ-S-MAG-029",
    ];
    expect(ids.filter((q) => getFiguresForQuestion(q).length > 0)).toEqual([]);
    expect(SCIENCE_FIGURE_VISUALS.filter((f) => f.filePath.includes("/chapterwise-science/"))).toEqual([]);
  });

  it("control: a bogus id resolves to nothing", () => {
    expect(getFiguresForQuestion("DIAGRAMS-1-PR3-NO-SUCH-ID")).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DIAGRAMS-1 PR-4 — Science question figures for the four biology chapters (Control & Coordination, Reproduction,
// Heredity, Our Environment; scope set by the controller 2026-10-07). Same contract as PR-3 above.
// Source + page + what was matched for every row: Desktop/diff/b20/pr4/manifest.csv + eye-confirm.md.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// [questionId, filePath] in source order (a row with two printed figures has two consecutive pins).
const PR4_BINDINGS: ReadonlyArray<readonly [string, string]> = [
  ["CTRL-EXMPLR-6-MCQ-025", "/figures/exemplar-science/control-and-coordination/CTRL-EXMPLR-6-MCQ-025.webp"], // jeep107.pdf (Exemplar) p5 Fig. 7.1
  ["PYQ-S-2026-ENV-001", "/figures/pyq-science/our-environment/PYQ-S-2026-ENV-001.webp"], // 31-2-1.pdf (2026) p7 Q6
];

// Not bound on purpose — must resolve to no figure. Reasons in the manifest (SKIP-BOOKLET / NOT-FOUND / SKIP-BROKEN / WRONG list).
const PR4_NOT_BOUND = [
  // third-party chapter-wise booklet rows with no identical item in any official source on disk (owner ruling 13:0xZ)
  "SCO-S-CTRL-011", "SCQ-S-CTRL-027", "SCO-S-CTRL-012", "SCQ-S-REPR-041", "SCO-S-REPR-014", "SCO-S-REPR-015",
  "SCQ-S-HERED-043", "SCQ-S-HERED-042", "SCO-S-ENV-015", "SCO-S-ENV-017",
  "HERED-EXMPLR-8-LA-002", // NOT-FOUND: Exemplar Q44 prints the cross as typeset text, already carried in the stem; no drawing exists
  "CTRL-EXMPLR-6-SA-003", // census Appendix 3 WRONG id: never re-bound
];

const PR4_CHAPTER_FOR_SLUG: Record<string, string> = {
  "control-and-coordination": "Control and Coordination",
  "how-do-organisms-reproduce": "How do Organisms Reproduce?",
  heredity: "Heredity",
  "our-environment": "Our Environment",
};

const pr4Paths = new Set(PR4_BINDINGS.map(([, p]) => p));
const pr4Entries = SCIENCE_FIGURE_VISUALS.filter((f) => pr4Paths.has(f.filePath));
const pr4Ids = [...new Set(PR4_BINDINGS.map(([q]) => q))];
// file name = <questionId>.webp for a row's first figure, <questionId>-<n>.webp for its n-th
const fileStemOk = (q: string, p: string) =>
  /^[A-Z0-9-]+$/.test(q) && ["", "-2", "-3", "-4"].some((n) => p.endsWith(`/${q}${n}.webp`));

describe("DIAGRAMS-1 PR-4 bindings (C&C, Reproduction, Heredity, Our Environment) are exactly the eye-confirmed set", () => {
  it("the pinned set is the size this PR shipped", () => {
    expect(PR4_BINDINGS).toHaveLength(2);
    expect(pr4Ids).toHaveLength(2);
    expect(pr4Paths.size).toBe(PR4_BINDINGS.length); // no crop is reused for two bindings
    expect(pr4Entries).toHaveLength(PR4_BINDINGS.length); // each pinned file is bound exactly once in the registry
    expect(pr4Ids.filter((q) => PR3_BINDINGS.some(([b]) => b === q))).toEqual([]); // no overlap with PR-3
  });

  it("each pinned question resolves to exactly its pinned figures, in source order", () => {
    const wrong = pr4Ids.filter((q) => {
      const want = PR4_BINDINGS.filter(([b]) => b === q).map(([, p]) => p);
      return JSON.stringify(getFiguresForQuestion(q).map((f) => f.filePath)) !== JSON.stringify(want);
    });
    expect(wrong).toEqual([]);
  });

  it("every pinned question EXISTS in the bank and is served, or is declared in BOUND_BUT_WITHHELD", () => {
    expect(pr4Ids.filter((q) => !inBank.has(q))).toEqual([]);
    expect(pr4Ids.filter((q) => !served.has(q) && !BOUND_BUT_WITHHELD.includes(q))).toEqual([]);
  });

  it("every binding's chapter matches its row's chapter and asset folder (served or withheld)", () => {
    const mismatched = pr4Entries.filter((f) => {
      const row = inBank.get(f.questionId ?? "");
      if (!row) return true;
      const s = resolveCanonicalSlug(row.topicKey);
      return PR4_CHAPTER_FOR_SLUG[s] !== f.chapter || f.filePath.split("/")[3] !== s;
    });
    expect(mismatched.map((f) => `${f.questionId}:${f.chapter}:${f.filePath}`)).toEqual([]);
  });

  it("every entry has the registry's raster-figure shape and a descriptive alt text", () => {
    const bad = pr4Entries.filter(
      (f) => f.subject !== "science" || f.isInteractive !== false || f.keywords.length !== 0 || !isDescriptiveAlt(f.title)
        || !f.filePath.startsWith("/figures/") || !f.filePath.endsWith(".webp") || !fileStemOk(f.questionId ?? "", f.filePath)
        || f.filePath.includes("/chapterwise-science/") || f.filePath.includes("/foundation-science/"),
    );
    expect(bad.map((f) => f.id)).toEqual([]);
  });

  it("every asset exists under lazytopper/public, is a real WebP file, and is at most 80 KB", () => {
    const problems: string[] = [];
    for (const [, p] of PR4_BINDINGS) {
      const abs = path.join(PUBLIC, p.replace(/^\//, ""));
      if (!fs.existsSync(abs)) { problems.push(`missing ${p}`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP") problems.push(`not webp ${p}`);
      if (buf.length > 80 * 1024) problems.push(`too big ${p} ${buf.length}`);
    }
    expect(problems).toEqual([]);
  });

  it("rows deliberately left unbound resolve to no figure", () => {
    expect(PR4_NOT_BOUND.filter((q) => getFiguresForQuestion(q).length > 0)).toEqual([]);
    expect(PR4_NOT_BOUND.filter((q) => pr4Ids.includes(q))).toEqual([]);
  });

  it("no PR-4 binding re-binds a census WRONG id, a Z3 decorative row, or a booklet-only SCO/SCQ row", () => {
    expect(pr4Ids.filter((q) => CENSUS_WRONG_IDS.includes(q))).toEqual([]);
    expect(pr4Ids.filter((q) => q.startsWith("Z3-"))).toEqual([]);
    expect([...pr4Paths].filter((p) => p.startsWith("/visuals/"))).toEqual([]);
    // an SCO/SCQ row may be bound only through an OFFICIAL paper's crop, never from the booklet folder
    expect(pr4Entries.filter((f) => /^SC[OQ]-/.test(f.questionId ?? "") && !/\/(pyq|sqp|other|exemplar|ncert|itembank|cfpq)-science\//.test(f.filePath)).map((f) => f.id)).toEqual([]);
  });
});
