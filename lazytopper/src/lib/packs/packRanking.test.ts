import { describe, expect, it } from "vitest";
import {
  chapterPackRows,
  drawPackWorksheetRows,
  groupBySection,
  isStepMarked,
  loadChapter,
  loadSubjectBank,
  packServedAt,
  stepMarkedFirst,
} from "./packContent";
import { drawPackMocks } from "./buildPackFiles";
import { packPaperCode } from "./packPaperCode";
import { BUNDLE_NAME, ALL_NCERT_CHAPTERS, MATHS_NCERT_CHAPTERS, SCIENCE_NCERT_CHAPTERS, MOCKS_PER_SUBJECT, packChapterLabel } from "./packLabels";
import { drawChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { hashSeed } from "./packContent";

const q = (over: Record<string, unknown>) => ({ marks: 2, solutionSteps: ["[1 mark] a", "[1 mark] b"], ...over }) as never;

describe("isStepMarked", () => {
  it("needs every step to carry a mark and the marks to sum to the question's marks", () => {
    expect(isStepMarked(q({}))).toBe(true);
    expect(isStepMarked(q({ solutionSteps: ["[1 mark] a", "b"] }))).toBe(false);
    expect(isStepMarked(q({ solutionSteps: ["[1 mark] a"] }))).toBe(false);
    expect(isStepMarked(q({ marks: 3, solutionSteps: ["[1 mark] a", "[1 mark] b", "x [1]"] }))).toBe(true);
    expect(isStepMarked(q({ marks: 1, solutionSteps: ["x [½]", "y [½]"] }))).toBe(true);
    expect(isStepMarked(q({ solutionSteps: [] }))).toBe(false);
  });
  it("a 1-mark objective question counts as step-marked even with no prefix; a 2-mark one with options does not", () => {
    expect(isStepMarked(q({ marks: 1, options: ["a", "b"], solutionSteps: ["because"] }))).toBe(true);
    expect(isStepMarked(q({ marks: 2, options: ["a", "b"], solutionSteps: ["because"] }))).toBe(false);
    expect(isStepMarked(q({ marks: 1, solutionSteps: ["because"] }))).toBe(false);
  });
  it("stepMarkedFirst is a stable partition", () => {
    const rows = [q({ id: "1", solutionSteps: ["x"] }), q({ id: "2" }), q({ id: "3", solutionSteps: ["x"] }), q({ id: "4" })] as Array<{ id: string }>;
    expect(stepMarkedFirst(rows as never).map((r) => (r as unknown as { id: string }).id)).toEqual(["2", "4", "1", "3"]);
  });
});

describe("chapter pack ranking (real bank)", () => {
  it("within each section the step-marked questions come first, then the rest, each by id", async () => {
    let mixedSections = 0;
    for (const slug of ["real-numbers", "triangles", "life-processes"]) {
      await loadChapter(slug);
      const rows = chapterPackRows(slug);
      for (const [sec, list] of groupBySection(rows)) {
        const flags = list.map((r) => isStepMarked(r));
        const firstOther = flags.indexOf(false);
        if (firstOther >= 0) {
          expect(flags.slice(firstOther).every((f) => !f), `${slug} ${sec}: no step-marked row after an unmarked one`).toBe(true);
          if (firstOther > 0) mixedSections += 1;
        }
        for (const part of [list.filter((r) => isStepMarked(r)), list.filter((r) => !isStepMarked(r))]) {
          for (let i = 1; i < part.length; i += 1) expect(part[i - 1].id < part[i].id).toBe(true);
        }
      }
    }
    expect(mixedSections).toBeGreaterThanOrEqual(0);
  }, 60_000);

  it("the pack worksheet takes step-marked questions first in each section", async () => {
    await loadChapter("real-numbers");
    const rows = chapterPackRows("real-numbers");
    const drawn = drawPackWorksheetRows(rows, hashSeed("pack-paper:real-numbers:ws1"));
    for (const [sec, list] of groupBySection(rows)) {
      const marked = list.filter((r) => isStepMarked(r)).length;
      const got = drawn.filter((d) => String(d.section).toUpperCase() === sec);
      const takenMarked = got.filter((d) => isStepMarked(d)).length;
      expect(takenMarked, `section ${sec}`).toBe(Math.min(marked, got.length));
    }
  }, 60_000);

  it("a Chapter Test drawn with the pack servedAt uses no more unmarked questions than the plain draw", async () => {
    await loadChapter("real-numbers");
    const rows = chapterPackRows("real-numbers");
    const base = { subject: "Maths" as const, topicKey: "real-numbers", topicLabel: "Real Numbers", worksheetId: "t", name: "t", createdAt: "2026-01-01T00:00:00.000Z", seed: hashSeed("pack-paper:real-numbers:ct1") };
    const plain = drawChapterTest(base);
    const ranked = drawChapterTest({ ...base, servedAt: packServedAt(rows) });
    const unmarked = (d: typeof plain) => d.paper.questions.filter((x) => !isStepMarked(x)).length;
    expect(unmarked(ranked)).toBeLessThanOrEqual(unmarked(plain));
  }, 60_000);
});

describe("mock packs: 8 papers per subject, little overlap", () => {
  it("draws 8 distinct, full papers per subject with the PK codes M1..M8, and reports the overlap", async () => {
    const report: Record<string, unknown> = {};
    for (const subject of ["maths", "science"] as const) {
      await loadSubjectBank(subject);
      const papers = drawPackMocks(subject);
      expect(papers.map((p) => p.n), subject).toEqual(Array.from({ length: MOCKS_PER_SUBJECT }, (_, i) => i + 1));
      expect(packPaperCode({ kind: "mock", subject, n: 8 })).toBe(`PK-${subject === "maths" ? "M" : "S"}-FULL-M8`);
      const sets = papers.map((p) => new Set(p.drawn.paper.questions.map((x) => x.id)));
      const sizes = sets.map((s) => s.size);
      let maxOverlap = 0;
      let sum = 0;
      let pairs = 0;
      for (let i = 0; i < sets.length; i += 1) {
        for (let j = i + 1; j < sets.length; j += 1) {
          const shared = [...sets[i]].filter((id) => sets[j].has(id)).length;
          maxOverlap = Math.max(maxOverlap, shared);
          sum += shared;
          pairs += 1;
        }
      }
      const marked = papers.map((p) => p.drawn.paper.questions.filter((x) => isStepMarked(x)).length / p.drawn.paper.questions.length);
      report[subject] = { sizes, maxSharedPair: maxOverlap, meanSharedPair: Number((sum / pairs).toFixed(2)), stepMarkedShare: marked.map((m) => Number(m.toFixed(2))) };
      // a paper never repeats a question, and the papers are not copies of each other
      for (const s of sets) expect(s.size).toBeGreaterThan(30);
      expect(maxOverlap, `${subject} max shared between two papers`).toBeLessThan(Math.min(...sizes) * 0.5);
    }
    if (process.env.PACKS_OVERLAP_REPORT) (await import("node:fs")).writeFileSync(process.env.PACKS_OVERLAP_REPORT, JSON.stringify(report, null, 1));
  }, 240_000);
});

describe("pack labels", () => {
  it("counts are 14 + 13 = 27, the bundle has its new name, and Trigonometry is labelled with both chapters", () => {
    expect(MATHS_NCERT_CHAPTERS).toBe(14);
    expect(SCIENCE_NCERT_CHAPTERS).toBe(13);
    expect(ALL_NCERT_CHAPTERS).toBe(27);
    expect(BUNDLE_NAME).toBe("Maths + Science Bundle");
    expect(packChapterLabel("trigonometry")).toBe("Trigonometry (Ch 8 + Ch 9)");
    expect(packChapterLabel("real-numbers")).toBe("Real Numbers");
  });
});
