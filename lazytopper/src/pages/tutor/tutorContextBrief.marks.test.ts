/**
 * SCORECARD-MI-1 PR-2 (B7), as re-wired by ME-ENGINE-1 PR-2 — the tutor brief names the biggest
 * loss in MARKS, and it is the SAME split Me/Progress's hero shows: the shared read model's ONE
 * group split (`mistakeLossByGroup`) over the paper's live synced mistakes in Me's window. v2
 * entries count by their own marks; legacy count-only entries by the step deductions the grader
 * wrote, as stored. `marksLostRecent` is Me's "marks on the table" (the model's ungated total).
 *
 * The REAL read model runs; only the cloud streams are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import type { PracticeAttempt } from "../../services/practiceInsights";

const NOW = Date.UTC(2026, 9, 6, 6, 0); // 11:30 IST
const HOUR = 60 * 60 * 1000;

const h = vi.hoisted(() => ({ entries: [] as unknown[], attempts: [] as unknown[] }));
vi.mock("../../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/practiceInsights")>()),
  getAttemptsFromCloud: async () => h.attempts,
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async () => ({ entries: h.entries, complete: true }),
}));
vi.mock("../../services/progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import { assembleTutorBrief, describeBriefTopType, describeTopMistakeType } from "./tutorContextBrief";
import { readStudyModel } from "../../services/progressReadModel";
import { zeroMarksLost } from "../../lib/mistakeDisplay";

let seq = 0;
function entry(counts: Partial<MistakeLogEntry["mistakeCounts"]>, marks?: Partial<ReturnType<typeof zeroMarksLost>>, steps?: MistakeLogEntry["stepDetails"]): MistakeLogEntry {
  seq += 1;
  const base: MistakeLogEntry = {
    id: `quick-practice::S::q${seq}`,
    timestamp: new Date(NOW - seq * HOUR).toISOString(),
    questionText: "q",
    topic: "Real Numbers",
    subject: "maths",
    totalMarks: 3,
    marksLost: 1,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...counts },
    stepDetails: steps ?? [],
  };
  return marks ? { ...base, marksLostByType: { ...zeroMarksLost(), ...marks }, marksLostByTypeVersion: 1 } : base;
}

/** Eight graded Maths answers this week → Me's Maths hero is shown (the gate is met). */
function gatedAttempts(): PracticeAttempt[] {
  return [1, 3, 6, 10, 15, 22, 30, 40].map(
    (agoH, i) =>
      ({
        id: `a${i}`,
        timestamp: NOW - agoH * HOUR,
        subject: "maths",
        topicKey: "real-numbers",
        topicName: "Real Numbers",
        questionId: `b${i}`,
        marksScored: 1,
        marksAvailable: 3,
        mode: "graded",
      }) as unknown as PracticeAttempt,
  );
}

const ARGS = { uid: "u-1", topicKey: "real-numbers", subject: "maths" as const, window: "week" as const, nowMs: NOW };

beforeEach(() => {
  h.entries = [];
  h.attempts = gatedAttempts();
  seq = 0;
});

describe("B7 — the brief names Me's biggest loss in MARKS (the model's one group split)", () => {
  it("★ a 3-mark concept gap vs two ½-mark silly slips → the tutor hears the knowledge gap", async () => {
    h.entries = [entry({ conceptual: 1 }, { conceptual: 3 }), entry({ silly: 1 }, { silly: 0.5 }), entry({ silly: 1 }, { silly: 0.5 })];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.mistakes.topType).toBe("knowledge gap");
    expect(brief.hasData).toBe(true);
  });

  it("legacy count-only entries: split by the step deductions as stored (Me's rule), never by counts", async () => {
    // Two careless COUNTS, but the grader's deductions put more marks on the concept gap.
    h.entries = [
      entry({ conceptual: 1 }, undefined, [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }]),
      entry({ silly: 1 }, undefined, [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 0.5 }]),
      entry({ silly: 1 }, undefined, [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 0.5 }]),
    ];
    expect((await assembleTutorBrief(ARGS)).mistakes.topType).toBe("knowledge gap");
  });

  it("marksLostRecent is Me's \"marks on the table\" — the model's ungated total for the paper", async () => {
    h.entries = [entry({ silly: 1 }, { silly: 1 })];
    const brief = await assembleTutorBrief(ARGS);
    const model = await readStudyModel("u-1", { window: "week", subject: "maths", nowMs: NOW });
    expect(brief.mistakes.marksLostRecent).toBe(model.progress.totals!.marksLost);
    expect(brief.mistakes.marksLostRecent).toBe(16); // 8 answers × (3 − 1)
  });

  it("below Me's gate (fewer than 6 graded answers) → no top type and no marks figure", async () => {
    h.attempts = gatedAttempts().slice(0, 3);
    h.entries = [entry({ conceptual: 1 }, { conceptual: 3 })];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.mistakes).toEqual({});
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
