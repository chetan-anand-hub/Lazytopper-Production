/**
 * MCQ-TYPE-2 (FU-MCQ-HABIT-COUNT-READERS) — the insights readers and the 0-MARK HABIT.
 *
 * A right MCQ with flawed working is saved as a habit (marksLost 0, `habitOnly`). It counts in the
 * TYPE COUNTS (`mistakeCounts`, the per-type count trend, the careless-habit counts) and nowhere
 * else: the checked total, marks, the top type, hotspots and enough-data read the live mistakes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({ entries: [] as Array<Record<string, unknown>> }));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async (_uid: string, _days: number, o: { includeHabits?: boolean } = {}) =>
    H.entries.filter((e) => o.includeHabits === true || e.habitOnly !== true),
}));

import { getCarelessInsight, getMistakeInsights, getMistakeTrend, getTopicMistakeHotspots } from "./mistakeInsightsService";

let n = 0;
function entry(type: "conceptual" | "silly" | "calculation", marks: number, o: { habit?: boolean; topic?: string; hoursAgo?: number } = {}) {
  n += 1;
  return {
    id: `i${n}`,
    timestamp: new Date(Date.now() - (o.hoursAgo ?? 2) * 3600_000).toISOString(),
    questionText: `q${n}`,
    topic: o.topic ?? "Real Numbers",
    subject: "Maths",
    totalMarks: o.habit ? 1 : 3,
    marksLost: marks,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, [type]: 1 },
    stepDetails: [{ stepNumber: 1, mistakeType: type, marksDeducted: o.habit ? 0 : marks }],
    marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, [type]: marks },
    marksLostByTypeVersion: 1,
    ...(o.habit ? { habitOnly: true } : {}),
  };
}

const LIVE = () => [entry("conceptual", 2), entry("conceptual", 1), entry("calculation", 1)];
const HABITS = () => [entry("silly", 0, { habit: true, topic: "Polynomials" }), entry("calculation", 0, { habit: true, topic: "Polynomials" })];

beforeEach(() => {
  H.entries = [];
});

describe("insights readers — a habit counts in TYPE COUNTS only", () => {
  it("★ getMistakeInsights: mistakeCounts gain the habits; checked total, marks, top type, hotspot and enough-data do not move", async () => {
    H.entries = LIVE();
    const base = await getMistakeInsights("u", 7);
    H.entries = [...LIVE(), ...HABITS()];
    const withHabits = await getMistakeInsights("u", 7);
    expect(withHabits.mistakeCounts).toEqual({ ...base.mistakeCounts, silly: base.mistakeCounts.silly + 1, calculation: base.mistakeCounts.calculation + 1 });
    const { mistakeCounts: _a, ...restBase } = base;
    const { mistakeCounts: _b, ...restHabit } = withHabits;
    expect(restHabit).toEqual(restBase);
    // Polynomials holds only habits: never a hotspot
    expect(await getTopicMistakeHotspots("u", 7)).toEqual(expect.not.arrayContaining([expect.objectContaining({ topic: "Polynomials" })]));
  });

  it("★ habits alone: no checked answers, no marks, not enough data, no top type — only counts", async () => {
    H.entries = HABITS();
    const r = await getMistakeInsights("u", 7);
    expect(r).toMatchObject({ totalChecked: 0, totalMarksLost: 0, topMistakeType: null, topHotspot: null, hasEnoughData: false });
    expect(r.mistakeCounts).toEqual({ conceptual: 0, calculation: 1, silly: 1, presentation: 0 });
  });

  it("★ getCarelessInsight: careless COUNTS gain the habits; careless MARKS do not", async () => {
    H.entries = LIVE();
    const base = await getCarelessInsight("u", 7);
    H.entries = [...LIVE(), ...HABITS()];
    const c = await getCarelessInsight("u", 7);
    expect(c.marksLost).toBe(base.marksLost);
    expect([c.calculationCount, c.sillyCount, c.count]).toEqual([base.calculationCount + 1, base.sillyCount + 1, base.count + 2]);
  });

  it("getMistakeTrend: the marks trend (direction, overall change) is unchanged by habits", async () => {
    const prev = [entry("conceptual", 4, { hoursAgo: 24 * 10 })];
    H.entries = [...LIVE(), ...prev];
    const base = await getMistakeTrend("u", 7, 7);
    H.entries = [...LIVE(), ...prev, ...HABITS()];
    const t = await getMistakeTrend("u", 7, 7);
    expect([t.direction, t.overallPctChange]).toEqual([base.direction, base.overallPctChange]);
  });
});
