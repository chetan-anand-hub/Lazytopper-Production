/**
 * MOMENTS-3 — Ziggy's aha: shows on its TRUE trigger (a repeated mistake type stops, on real records),
 * never otherwise. Fabricated or insufficient data → nothing.
 */
import { describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "../../services/sessionRecords";
import { AHA_COPY, ahaFor, ahaLines } from "./ahaModel";
import { MISTAKE_TYPE_LABEL } from "../../lib/mistakeDisplay";
import { scoreGuidePlan } from "./scoreGuideModel";
import type { ScorecardVariant } from "../results/scorecardVariants";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 1, 12, 0);

function rec(id: string, daysAgo: number, four: Partial<SessionRecord["fourType"]>, over: Partial<SessionRecord> = {}): SessionRecord {
  const fourType = { conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...four };
  return {
    id,
    worksheetId: "ws",
    surface: "worksheet",
    title: "t",
    subject: "maths",
    topicKeys: [],
    questionIds: [],
    marksAwarded: 12,
    marksTotal: 20,
    status: "graded",
    fourType,
    sectionBreakdown: null,
    gradedAt: NOW - daysAgo * DAY,
    perQuestionRef: id,
    dedupKey: id,
    ...over,
  };
}

const prior = [rec("WS-1", 6, { calculation: 2 }), rec("WS-2", 3, { calculation: 1, silly: 1 })];
const newest = rec("WS-3", 0, { silly: 1 }); // typed output present, no calculation slips
const ask = (records: SessionRecord[], over: Partial<Parameters<typeof ahaFor>[0]> = {}) =>
  ahaFor({ records, resultId: "WS-3", now: NOW, ...over });

describe("ahaFor — the true trigger", () => {
  it("★ calculation slips in 2 earlier results, none in the newest, which has typed output → aha(calculation)", () => {
    expect(ask([...prior, newest])).toEqual({ type: "calculation" });
  });

  it("a perfect newest result (nothing lost) also establishes it", () => {
    expect(ask([...prior, rec("WS-3", 0, {}, { marksAwarded: 20, marksTotal: 20 })])).toEqual({ type: "calculation" });
  });

  it("★ only ONE earlier result had the type → nothing", () => {
    expect(ask([prior[0], rec("WS-2", 3, { silly: 1 }), newest])).toBeNull();
  });

  it("the newest still has the type → nothing", () => {
    expect(ask([...prior, rec("WS-3", 0, { calculation: 1 })])).toBeNull();
  });

  it("★ marks were lost but nothing was typed → the absence is unproven → nothing", () => {
    expect(ask([...prior, rec("WS-3", 0, {})])).toBeNull();
  });

  it("the result on screen must be the NEWEST graded one (an older re-opened scorecard shows nothing)", () => {
    expect(ask([...prior, newest, rec("WS-4", -1, { silly: 1 })])).toBeNull();
    expect(ask([...prior, newest], { resultId: "WS-2" })).toBeNull();
    expect(ask([...prior, newest], { resultId: null })).toBeNull();
  });

  it("only graded, counting, ≥ 5-mark results of ONE subject count", () => {
    const sci = (r: SessionRecord) => ({ ...r, subject: "science" as const });
    expect(ask([sci(prior[0]), sci(prior[1]), newest])).toBeNull(); // earlier results are another subject
    expect(ask([{ ...prior[0], status: "partial" }, prior[1], newest])).toBeNull();
    expect(ask([{ ...prior[0], surface: "quick-practice" }, prior[1], newest])).toBeNull(); // non-counting
    expect(ask([{ ...prior[0], marksTotal: 2 }, prior[1], newest])).toBeNull();
    expect(ask([...prior, { ...newest, marksTotal: 3, marksAwarded: 1 }])).toBeNull();
    expect(ask([...prior, { ...newest, status: "partial" }])).toBeNull();
  });

  it("a mixed Maths + Science paper is skipped", () => {
    const mixed = { ...newest, questionTopics: [{ qNumber: 1, subject: "maths" as const, topicSlug: "a" }, { qNumber: 2, subject: "science" as const, topicSlug: "b" }] };
    expect(ask([...prior, mixed])).toBeNull();
  });

  it("once per type per week: shown 2 days ago → rests; 8 days ago → may show again", () => {
    expect(ask([...prior, newest], { lastShown: { calculation: NOW - 2 * DAY } })).toBeNull();
    expect(ask([...prior, newest], { lastShown: { calculation: NOW - 8 * DAY } })).toEqual({ type: "calculation" });
  });

  it("no records at all → nothing", () => {
    expect(ask([])).toBeNull();
  });
});

describe("ahaLines + the scorecard plan", () => {
  it("the lines name the type and carry no digit", () => {
    const l = ahaLines({ type: "calculation" });
    expect(l.ziggy).toBe(AHA_COPY.ziggy.replace("{name}", MISTAKE_TYPE_LABEL.calculation));
    expect(l.ziggy + l.byte).not.toMatch(/\d/);
  });

  const variant: ScorecardVariant = {
    surface: "worksheet",
    title: "Quadratic Equations - Mixed Worksheet",
    subtitle: "WS-3",
    score: { kind: "marks", awarded: 14, total: 20, gradedCount: 4, totalQuestions: 4 },
    actions: [],
  };

  it("★ a fact → Ziggy (aha) then Byte (a proud cheer); no fact → today's lines", () => {
    const plain = scoreGuidePlan(variant)!;
    expect(plain.aha).toBeNull();
    expect(plain.ziggy.pose).not.toBe("aha");
    const p = scoreGuidePlan(variant, { aha: { type: "silly" } })!;
    expect(p.aha).toBe("silly");
    expect(p.ziggy.pose).toBe("aha");
    expect(p.ziggy.text).toContain("Silly slip");
    expect(p.byte.pose).toBe("cheer");
  });

  it("a low-score scene keeps its own beat (no aha on top of comfort)", () => {
    const low = { ...variant, score: { kind: "marks" as const, awarded: 4, total: 20, gradedCount: 4, totalQuestions: 4 } };
    const p = scoreGuidePlan(low, { aha: { type: "silly" } })!;
    expect(p.scene).toBe("comfort");
    expect(p.aha).toBeNull();
  });
});

describe("MOMENTS-3 · PERF-3 and analytics hygiene", () => {
  it("the festival ids the (eager) model uses are exactly the rig's FESTIVAL_PROPS", async () => {
    const { FESTIVAL_PROPS } = await import("./rigProps");
    const { festivalPropsAt } = await import("./companion/festival");
    expect(festivalPropsAt(Date.UTC(2026, 10, 8, 6))).toEqual(FESTIVAL_PROPS);
  });

  it("the new emotions report under their OWN ids, never an older moment's", async () => {
    const { COMPANION_EVENT_ID } = await import("./companion/companionModel");
    expect(COMPANION_EVENT_ID.examWeek).toBe("c_exam_week");
    expect(COMPANION_EVENT_ID.breathe).toBe("c_breathe_test");
    expect(COMPANION_EVENT_ID.examWeek).not.toBe(COMPANION_EVENT_ID.countdown);
  });
});

describe("MOMENTS-3 review nits - the clock seam, the preview, reduced motion", () => {
  it("★ currentAha never reads the clock when there is no history (so no unrelated suite becomes clock-sensitive)", async () => {
    const { currentAha } = await import("./ahaModel");
    const spy = vi.spyOn(Date, "now");
    try {
      expect(currentAha("WS-1")).toBeNull(); // no active progress user in this suite
      expect(currentAha(null)).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("noteAhaShown does not mark the student's week under an admin preview", async () => {
    window.localStorage.setItem("lazytopper.guidePreview", JSON.stringify({ arm: "guide", until: Date.now() + 7 * DAY }));
    const m = await import("./ahaModel");
    const store = await import("../../services/studentProgressStore");
    const before = JSON.stringify(Object.entries(window.localStorage));
    vi.spyOn(store, "getActiveProgressUser").mockReturnValue("u1");
    m.noteAhaShown("silly", Date.now());
    expect(JSON.stringify(Object.entries(window.localStorage))).toBe(before);
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("the Ziggy line uses the display module's label and stays within the word and '!' limits", () => {
    const l = ahaLines({ type: "calculation" });
    expect(l.ziggy).toBe("Aha! No Calculation slip this time. It showed up in your earlier results.");
    expect(l.ziggy.split(/\s+/).length).toBeLessThanOrEqual(18);
    expect((l.ziggy.match(/!/g) ?? []).length).toBe(1);
  });
});
