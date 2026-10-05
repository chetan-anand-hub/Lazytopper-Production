/**
 * SCORECARD-MI-1 PR-2 (B7) — Mistake Intelligence's top type is the BIGGEST LOSS IN MARKS
 * whenever the window holds v2 entries (`marksLostByType` + `marksLostByTypeVersion: 1`); a
 * count-only window keeps today's count-based answer, labelled "counts", and is never given
 * invented marks (G5).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MistakeLogEntry } from "./mistakeLogService";

const h = vi.hoisted(() => ({ entries: [] as unknown[] }));
vi.mock("./mistakeLogService", () => ({
  getMistakeLogs: vi.fn(async () => h.entries),
}));

import { getMistakeInsights, getRecommendedNextActions, topTypeByMarks } from "./mistakeInsightsService";
import { zeroMarksLost } from "../lib/mistakeDisplay";

type Bucket = "conceptual" | "calculation" | "silly" | "presentation" | "unattempted" | "untyped";
let seq = 0;
/** A COUNT-ONLY entry (every entry written before PR-2). */
function countOnly(counts: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation", number>>, marksLost = 1): MistakeLogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    timestamp: new Date(Date.UTC(2026, 9, 1, 10, seq)).toISOString(),
    questionText: "q",
    topic: "Real Numbers",
    subject: "maths",
    totalMarks: 3,
    marksLost,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...counts },
    stepDetails: [],
  };
}
/** A v2 entry: the same counts PLUS the grader's marks per bucket, versioned. */
function v2(counts: Parameters<typeof countOnly>[0], marks: Partial<Record<Bucket, number>>): MistakeLogEntry {
  const m = { ...zeroMarksLost(), ...marks };
  const lost = Object.values(m).reduce((s, n) => s + n, 0);
  return { ...countOnly(counts, lost), marksLostByType: m, marksLostByTypeVersion: 1 };
}

beforeEach(() => {
  h.entries = [];
  seq = 0;
});

describe("B7 — the top type comes from MARKS when the window holds v2 entries", () => {
  it("★ one 3-mark concept gap beats two ½-mark silly slips (counts would say silly)", async () => {
    h.entries = [
      v2({ conceptual: 1 }, { conceptual: 3 }),
      v2({ silly: 1 }, { silly: 0.5 }),
      v2({ silly: 1 }, { silly: 0.5 }),
    ];
    const mi = await getMistakeInsights("u", 14);
    // CONTROL — the counts genuinely disagree: silly 2 vs conceptual 1.
    expect(mi.mistakeCounts.silly).toBeGreaterThan(mi.mistakeCounts.conceptual);
    expect(mi.topMistakeType).toBe("conceptual");
    expect(mi.topMistakeBasis).toBe("marks");
    expect(mi.marksLostByType).toEqual({ ...zeroMarksLost(), conceptual: 3, silly: 1 });
    expect(mi.totalMarksLost).toBe(4);
  });

  it("CONTROL — the very same counts WITHOUT marks still pick silly, labelled counts", async () => {
    h.entries = [countOnly({ conceptual: 1 }), countOnly({ silly: 1 }), countOnly({ silly: 1 })];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.topMistakeType).toBe("silly");
    expect(mi.topMistakeBasis).toBe("counts");
    expect(mi.marksLostByType).toBeNull();
  });

  it("the recommended action follows the marks-based top type (learn the concept)", async () => {
    h.entries = [
      v2({ conceptual: 1 }, { conceptual: 3 }),
      v2({ silly: 1 }, { silly: 0.5 }),
      v2({ silly: 1 }, { silly: 0.5 }),
    ];
    const actions = await getRecommendedNextActions("u", 14);
    expect(actions[0]?.type).toBe("learn");
  });
});

describe("G5 — count-only entries stay counts and are never given marks", () => {
  it("a count-only window: today's count-based answer, no marks figure at all", async () => {
    h.entries = [countOnly({ calculation: 2 }, 2), countOnly({ presentation: 1 }, 1), countOnly({ calculation: 1 }, 1)];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.topMistakeType).toBe("calculation");
    expect(mi.topMistakeBasis).toBe("counts");
    expect(mi.marksLostByType).toBeNull();
    // totalMarksLost is each entry's own marksLost (already marks), summed as stored.
    expect(mi.totalMarksLost).toBe(4);
  });

  it("an entry with marksLostByType but NO version is count-only (never read as marks)", async () => {
    const unversioned = { ...countOnly({ silly: 3 }), marksLostByType: { ...zeroMarksLost(), conceptual: 9 } } as MistakeLogEntry;
    h.entries = [unversioned];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.marksLostByType).toBeNull();
    expect(mi.topMistakeType).toBe("silly");
    expect(mi.topMistakeBasis).toBe("counts");
  });

  it("MIXED window: marks decide; the count-only entries add NO invented marks", async () => {
    h.entries = [
      v2({ presentation: 1 }, { presentation: 1 }),
      countOnly({ silly: 5 }, 5),
      countOnly({ calculation: 4 }, 4),
    ];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.topMistakeType).toBe("presentation");
    expect(mi.topMistakeBasis).toBe("marks");
    // ONLY the v2 entry's marks — the 5 silly / 4 calculation counts were not turned into marks.
    expect(mi.marksLostByType).toEqual({ ...zeroMarksLost(), presentation: 1 });
  });

  it("v2 entries that name no mistake mark (not attempted / reason not recorded) fall back to counts, labelled counts", async () => {
    h.entries = [v2({}, { unattempted: 2 }), v2({}, { untyped: 1 }), countOnly({ conceptual: 1 })];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.marksLostByType).toEqual({ ...zeroMarksLost(), unattempted: 2, untyped: 1 });
    expect(mi.topMistakeType).toBe("conceptual");
    expect(mi.topMistakeBasis).toBe("counts");
  });

  it("nothing names a type → null type, null basis", async () => {
    h.entries = [v2({}, { unattempted: 1 })];
    const mi = await getMistakeInsights("u", 14);
    expect(mi.topMistakeType).toBeNull();
    expect(mi.topMistakeBasis).toBeNull();
  });
});

describe("ties break by the owner's group order, then the type order inside the group", () => {
  it("knowledge before technique before careless; calculation before silly", () => {
    expect(topTypeByMarks({ ...zeroMarksLost(), conceptual: 1, calculation: 1 })).toBe("conceptual");
    expect(topTypeByMarks({ ...zeroMarksLost(), presentation: 1, silly: 1 })).toBe("presentation");
    expect(topTypeByMarks({ ...zeroMarksLost(), silly: 2, calculation: 2 })).toBe("calculation");
    expect(topTypeByMarks({ ...zeroMarksLost(), silly: 2.5, calculation: 2 })).toBe("silly");
    expect(topTypeByMarks({ ...zeroMarksLost(), unattempted: 5, untyped: 5 })).toBeNull();
  });
});
