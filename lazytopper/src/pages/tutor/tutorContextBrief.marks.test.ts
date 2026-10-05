/**
 * SCORECARD-MI-1 PR-2 (B7) — the tutor brief's top type is the insight's, which is now the
 * biggest loss in MARKS whenever v2 entries exist, so the tutor coaches the real biggest loss.
 * The REAL mistakeInsightsService runs here; only the log READ (and the unrelated reads) are
 * mocked, so this proves the wiring end to end, not a retyped string.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

const h = vi.hoisted(() => ({ entries: [] as unknown[] }));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: vi.fn(async () => h.entries) }));
vi.mock("../../services/weakAreaAggregator", () => ({ getWeakAreas: () => ({ weakAreas: [] }) }));
vi.mock("../../services/progressStore", () => ({ getTopicTrendFromCloud: vi.fn(async () => null) }));
vi.mock("../../data/syllabus/canonicalTopicSlug", () => ({ resolveCanonicalSlug: (k: string) => k }));

import { assembleTutorBrief, describeBriefTopType, describeTopMistakeType, MARKS_BASIS_SUFFIX } from "./tutorContextBrief";
import { zeroMarksLost } from "../../lib/mistakeDisplay";

let seq = 0;
function entry(counts: Partial<MistakeLogEntry["mistakeCounts"]>, marks?: Partial<ReturnType<typeof zeroMarksLost>>): MistakeLogEntry {
  seq += 1;
  const base: MistakeLogEntry = {
    id: `e-${seq}`,
    timestamp: new Date(Date.UTC(2026, 9, 1, 9, seq)).toISOString(),
    questionText: "q",
    topic: "Real Numbers",
    subject: "maths",
    totalMarks: 3,
    marksLost: 1,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...counts },
    stepDetails: [],
  };
  return marks ? { ...base, marksLostByType: { ...zeroMarksLost(), ...marks }, marksLostByTypeVersion: 1 } : base;
}

const ARGS = { uid: "u-1", topicKey: "real-numbers", subject: "maths" as const };

beforeEach(() => {
  h.entries = [];
  seq = 0;
});

describe("B7 — the brief names the biggest loss in MARKS when the insight decided on marks", () => {
  it("★ a 3-mark concept gap vs two ½-mark silly slips → the tutor hears the knowledge gap", async () => {
    h.entries = [
      entry({ conceptual: 1 }, { conceptual: 3 }),
      entry({ silly: 1 }, { silly: 0.5 }),
      entry({ silly: 1 }, { silly: 0.5 }),
    ];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.mistakes.topType).toBe(`knowledge gap (concept gap)${MARKS_BASIS_SUFFIX}`);
    expect(brief.mistakes.topType).toBe("knowledge gap (concept gap)");
    expect(brief.hasData).toBe(true);
  });

  it("CONTROL — count-only entries: the same counts read exactly as before (no marks claim)", async () => {
    h.entries = [entry({ conceptual: 1 }), entry({ silly: 1 }), entry({ silly: 1 })];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.mistakes.topType).toBe("careless (silly slip)");
    expect(brief.mistakes.topType).not.toContain("marks");
  });

  it("marksLostRecent stays the sum of the entries' own marksLost (already marks)", async () => {
    h.entries = [entry({ silly: 1 }), entry({ silly: 1 }), entry({ conceptual: 1 })];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.mistakes.marksLostRecent).toBe(3);
  });
});

describe("describeBriefTopType — keeps describeTopMistakeType, adds only the basis", () => {
  it("marks basis adds the short suffix; counts / null do not; unknown stays raw", () => {
    expect(describeBriefTopType("presentation", "marks")).toBe("exam technique (presentation)");
    expect(describeBriefTopType("calculation", "counts")).toBe(describeTopMistakeType("calculation"));
    expect(describeBriefTopType("calculation", null)).toBe("careless (calculation slip)");
    expect(describeBriefTopType("", "marks")).toBe("");
  });
});
