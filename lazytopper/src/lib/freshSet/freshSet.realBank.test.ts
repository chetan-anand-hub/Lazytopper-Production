// FRESH-SET-TESTS — the owner requirement on the REAL bank: every Chapter Test, Full Mock and
// Worksheet a student takes is a unique set, not a repeat of what they've had.
//
// RED on trunk (cd05b95a): the blueprints took no served history, so three consecutive draws
// repeated questions (measured: Chapter Test 187 of 1170 rows across 26 chapters, Full Mock
// 1-3 per paper, Worksheet 323 of 1950). Each draw here feeds the previous papers back in the
// way the pages do (served log -> servedAtFor) and asserts zero overlap while the pool lasts,
// the blueprint unchanged, and least-recently-served reuse once a pool is exhausted.

import { describe, it, expect } from "vitest";
import "../../test/preloadBankChapters";
import { drawChapterTest, CT_BLUEPRINT, type DrawnChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { drawFullMock, FM_BLUEPRINT, type DrawnFullMock } from "../../components/fullmock/fullMockBlueprint";
import { planWorksheet, generateFromPlan, getTopics } from "../../components/worksheet/worksheetModel";
import { aiCapFor } from "../../components/worksheet/worksheetShape";
import { isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { selectBankQuestions } from "../../data/bankQuery";
import { desktopTopicsBySubject } from "../desktop/topics";
import { chapterTestSectionFor } from "../../components/chaptertest/chapterTestBlueprint";
import { isCbq } from "../cbq/cbqClassification";
import { freshnessLine, servedAtFor, MOST_SERVED_SHARE, type ServedEntry, type ServedSurface } from "./servedHistory";

/** A pinned paper date — the draws never read the clock in this suite. */
const CREATED = "2026-10-23T00:00:00.000Z";

const overlapWithEarlier = (papers: string[][], k: number) => {
  const earlier = new Set(papers.slice(0, k).flat());
  return papers[k].filter((id) => earlier.has(id)).length;
};

/** Three consecutive sets, each drawn with the earlier ones as served history. */
function threeInARow<T>(
  surface: ServedSurface,
  scope: string,
  drawOne: (servedAt: Map<string, number>, i: number) => T,
  idsOf: (t: T) => string[],
): { sets: T[]; ids: string[][] } {
  const log: ServedEntry[] = [];
  const sets: T[] = [];
  const ids: string[][] = [];
  for (let i = 0; i < 3; i += 1) {
    const t = drawOne(servedAtFor({ surface, log }), i);
    sets.push(t);
    ids.push(idsOf(t));
    log.push({ surface, scope, ids: idsOf(t), at: 1000 + i });
  }
  return { sets, ids };
}

const lineFor = (d: DrawnChapterTest) =>
  freshnessLine({
    repeats: d.repeatCount,
    total: d.paper.questions.length,
    hasHistory: d.hasServedHistory,
    servedShare: d.servedShare,
    repeatSections: d.repeatSections,
    scopeNoun: "chapter",
    setNoun: "test",
  });
const ctIds = (d: DrawnChapterTest) => d.paper.questions.map((q) => String(q.id));
const ctDraw = (subject: "Maths" | "Science", slug: string, name: string, seed: number, servedAt?: Map<string, number>) =>
  drawChapterTest({ subject, topicKey: slug, topicLabel: name, worksheetId: "ct-fresh", seed, servedAt, createdAt: CREATED });

describe("Chapter Test — three in a row never repeat while the chapter has unseen questions", () => {
  const chapters = [...desktopTopicsBySubject("Maths"), ...desktopTopicsBySubject("Science")];

  it("★★ every chapter (26, Carbon included): 0 overlap across 3 consecutive tests", () => {
    expect(chapters.length).toBeGreaterThanOrEqual(26);
    expect(chapters.some((c) => c.slug === "carbon-and-its-compounds")).toBe(true);
    const offenders: string[] = [];
    for (const c of chapters) {
      const subject = c.subject as "Maths" | "Science";
      const { sets, ids } = threeInARow(
        "chapter-test",
        c.slug,
        (servedAt, i) => ctDraw(subject, c.slug, c.name, 1000 + i * 7919, servedAt),
        ctIds,
      );
      const rep = overlapWithEarlier(ids, 1) + overlapWithEarlier(ids, 2);
      if (rep > 0) offenders.push(`${c.slug}:${rep}`);
      for (const d of sets) expect(d.repeatCount).toBe(0);
    }
    expect(offenders).toEqual([]);
  });

  it("★★ the blueprint is unchanged: section counts, Section A/C marks, CBQ share as without history", () => {
    for (const slug of ["carbon-and-its-compounds", "real-numbers", "trigonometry", "electricity", "probability", "life-processes"]) {
      const c = chapters.find((x) => x.slug === slug)!;
      const subject = c.subject as "Maths" | "Science";
      const { sets } = threeInARow(
        "chapter-test",
        slug,
        (servedAt, i) => ctDraw(subject, slug, c.name, 31 + i * 101, servedAt),
        ctIds,
      );
      for (const [i, d] of sets.entries()) {
        const plain = ctDraw(subject, slug, c.name, 31 + i * 101); // no history = the trunk draw
        expect(d.blueprint.map((r) => r.actualCount)).toEqual(plain.blueprint.map((r) => r.actualCount));
        expect(d.blueprint.map((r) => r.section)).toEqual(CT_BLUEPRINT.map((s) => s.section));
        const row = (s: string) => d.blueprint.find((r) => r.section === s)!;
        expect(row("A").actualMarks).toBe(row("A").actualCount);
        expect(row("C").actualMarks).toBe(3 * row("C").actualCount);
        expect(d.objectiveCount + d.subjectiveCount).toBe(d.paper.questions.length);
        expect(d.totalMarks).toBe(d.paper.questions.reduce((s, q) => s + q.marks, 0));
        if (plain.cbqShortfall === 0) expect(d.cbqShortfall).toBe(0);
        expect(d.paper.questions.map((q) => q.section).join("")).toMatch(/^A*B*C*D*$/);
      }
    }
  });

  it("★ an exhausted chapter reuses the LEAST-recently-served questions, keeps the blueprint, and says so", () => {
    const slug = "carbon-and-its-compounds";
    const all = selectBankQuestions({ subject: "Science", topicKeys: [slug] });
    // Every question of the chapter served; the first half long ago, the second half recently.
    const half = Math.floor(all.length / 2);
    const servedAt = new Map(all.map((q, i) => [String(q.id), i < half ? 1_000 + i : 9_000_000 + i]));
    const d = ctDraw("Science", slug, "Carbon", 77, servedAt);
    const plain = ctDraw("Science", slug, "Carbon", 77);
    expect(d.blueprint.map((r) => r.actualCount)).toEqual(plain.blueprint.map((r) => r.actualCount));
    expect(d.repeatCount).toBe(d.paper.questions.length);
    expect(d.hasServedHistory).toBe(true);
    // Least-recently-served first: the paper leans on the long-ago half.
    const old = d.paper.questions.filter((q) => (servedAt.get(String(q.id)) ?? 0) < 9_000_000).length;
    expect(old).toBeGreaterThan(d.paper.questions.length / 2);
    // All of the chapter served -> "most of this chapter" is true here.
    expect(d.servedShare).toBe(1);
    expect(lineFor(d)?.text).toMatch(/^You've done most of this chapter's questions/);
  });

  it("★★ a long run (14 Polynomials tests): a row repeats ONLY when its section had no unseen row of its CBQ class left, and then least-recently-served first", () => {
    const slug = "polynomials";
    const all = selectBankQuestions({ subject: "Maths", topicKeys: [slug] });
    const log: ServedEntry[] = [];
    const problems: string[] = [];
    for (let t = 0; t < 14; t += 1) {
      const servedAt = servedAtFor({ surface: "chapter-test", log });
      const d = ctDraw("Maths", slug, "Polynomials", 900 + t * 7919, servedAt);
      const onPaper = new Set(d.paper.questions.map((q) => String(q.id)));
      for (const q of d.paper.questions) {
        const id = String(q.id);
        const at = servedAt.get(id);
        if (at === undefined) continue; // not a repeat
        const row = all.find((r) => String(r.id) === id)!;
        const sameCell = all.filter(
          (r) => chapterTestSectionFor(r) === q.section && isCbq(r) === isCbq(row) && !onPaper.has(String(r.id)),
        );
        const unseenLeft = sameCell.filter((r) => !servedAt.has(String(r.id))).length;
        const olderLeft = sameCell.filter((r) => (servedAt.get(String(r.id)) ?? Infinity) < at).length;
        if (unseenLeft > 0) problems.push(`test ${t + 1}: ${id} (${q.section}, cbq=${isCbq(row)}) repeated with ${unseenLeft} unseen left`);
        else if (olderLeft > 0) problems.push(`test ${t + 1}: ${id} (${q.section}) not least-recently-served (${olderLeft} older left)`);
      }
      // The honest line is true to the measured share every time.
      const line = lineFor(d);
      if (d.repeatCount > 0 && d.servedShare < MOST_SERVED_SHARE) {
        expect(line?.text).toMatch(/^\d+ questions? repeats? from your earlier tests — the unseen ones in (that section|those sections) ran out\.$/);
      }
      if (line?.text.startsWith("You've done most")) expect(d.servedShare).toBeGreaterThanOrEqual(MOST_SERVED_SHARE);
      log.push({ surface: "chapter-test", scope: slug, ids: [...onPaper], at: 1000 + t });
    }
    expect(problems).toEqual([]);
  });
});

describe("Full Mock — three in a row never repeat per section while the subject has unseen questions", () => {
  const fmIds = (d: DrawnFullMock) => d.paper.questions.map((q) => String(q.id));
  for (const subject of ["Maths", "Science"] as const) {
    it(`★★ ${subject}: 0 overlap in every section; sections, counts, 80 marks and unit marks unchanged`, () => {
      const { sets, ids } = threeInARow(
        "full-mock",
        subject,
        (servedAt, i) =>
          drawFullMock({ subject, worksheetId: "fm", code: "FM", name: "FM", seed: 4242 + i * 104729, servedAt, createdAt: CREATED }),
        fmIds,
      );
      for (const sec of FM_BLUEPRINT.map((s) => s.section)) {
        const bySec = sets.map((d) => d.paper.questions.filter((q) => q.section === sec).map((q) => String(q.id)));
        expect(overlapWithEarlier(bySec, 1) + overlapWithEarlier(bySec, 2)).toBe(0);
      }
      expect(overlapWithEarlier(ids, 1) + overlapWithEarlier(ids, 2)).toBe(0);
      for (const [i, d] of sets.entries()) {
        const plain = drawFullMock({ subject, worksheetId: "fm", code: "FM", name: "FM", seed: 4242 + i * 104729, createdAt: CREATED });
        expect(d.blueprint.map((r) => [r.section, r.actualCount, r.actualMarks])).toEqual(
          plain.blueprint.map((r) => [r.section, r.actualCount, r.actualMarks]),
        );
        expect(d.totalMarks).toBe(plain.totalMarks);
        expect(d.unitMarks.map((u) => u.actual)).toEqual(plain.unitMarks.map((u) => u.actual));
        expect(d.unitMarksExact).toBe(plain.unitMarksExact);
        if (plain.cbqShortfall === 0) expect(d.cbqShortfall).toBe(0);
        expect(d.repeatCount).toBe(0);
      }
    }, 600_000); // six real-bank Full Mock draws (each walks the whole subject pool)
  }
});

describe("Worksheet — three sheets in a row never repeat while the chapter has unseen questions", () => {
  const CHAPTERS: Array<["Maths" | "Science", string]> = [
    ["Science", "carbon-and-its-compounds"],
    ["Maths", "real-numbers"],
    ["Maths", "trigonometry"],
    ["Maths", "quadratic-equations"],
    ["Science", "electricity"],
    ["Science", "life-processes"],
    ["Science", "chemical-reactions-and-equations"],
  ];
  for (const [subject, key] of CHAPTERS) {
    it(`★★ ${key}: 0 overlap across 3 sheets of 25; same section shape and AI cap as without history`, () => {
      const t = getTopics(subject).find((x) => x.key === key)!;
      const plan = planWorksheet({ subject, scope: "topic", topics: [t], requested: 25 });
      const sectionsOf = (qs: Array<{ section?: unknown }>) => {
        const m: Record<string, number> = {};
        for (const q of qs) m[String(q.section)] = (m[String(q.section)] ?? 0) + 1;
        return m;
      };
      const { sets, ids } = threeInARow(
        "worksheet",
        subject,
        (servedAt, i) => generateFromPlan(plan, { seed: 77 + i * 131, servedAt }),
        (qs) => qs.map((q) => String(q.id)),
      );
      expect(overlapWithEarlier(ids, 1) + overlapWithEarlier(ids, 2)).toBe(0);
      for (const [i, qs] of sets.entries()) {
        const plain = generateFromPlan(plan, { seed: 77 + i * 131 });
        expect(qs).toHaveLength(plain.length);
        expect(sectionsOf(qs)).toEqual(sectionsOf(plain));
        const ai = qs.filter((q) => isAiGeneratedBankId(q.id)).length;
        expect(ai).toBeLessThanOrEqual(Math.max(aiCapFor(qs.length), plain.filter((q) => isAiGeneratedBankId(q.id)).length));
      }
    });
  }

  it("★★ Probability after ONE sheet: any repeat is reported truthfully, never as 'most of this chapter'", () => {
    const t = getTopics("Maths").find((x) => x.key === "probability")!;
    const plan = planWorksheet({ subject: "Maths", scope: "topic", topics: [t], requested: 25 });
    const poolIds = [...plan.pools.values()].flat().map((q) => String(q.id));
    for (let k = 0; k < 6; k += 1) {
      const first = generateFromPlan(plan, { seed: 300 + k });
      const servedAt = servedAtFor({
        surface: "worksheet",
        log: [{ surface: "worksheet", scope: "Maths", ids: first.map((q) => String(q.id)), at: 1 }],
      });
      const second = generateFromPlan(plan, { seed: 900 + k, servedAt });
      const repeats = second.filter((q) => servedAt.has(String(q.id)));
      const share = poolIds.filter((id) => servedAt.has(id)).length / new Set(poolIds).size;
      expect(share).toBeLessThan(MOST_SERVED_SHARE);
      const line = freshnessLine({
        repeats: repeats.length,
        total: second.length,
        hasHistory: true,
        servedShare: share,
        repeatSections: new Set(repeats.map((q) => String(q.section))).size,
        scopeNoun: "chapter",
        setNoun: "worksheet",
      });
      expect(line?.text ?? "").not.toMatch(/most of this chapter/);
    }
  });

  it("★ seeded: the same seed and history draw the same sheet (no Math.random)", () => {
    const t = getTopics("Maths").find((x) => x.key === "polynomials")!;
    const plan = planWorksheet({ subject: "Maths", scope: "topic", topics: [t], requested: 20 });
    const a = generateFromPlan(plan, { seed: 5 }).map((q) => q.id);
    const b = generateFromPlan(plan, { seed: 5 }).map((q) => q.id);
    expect(a).toEqual(b);
  });
});
