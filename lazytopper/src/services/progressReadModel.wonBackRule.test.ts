// @vitest-environment node
/**
 * ME-ENGINE-1 PR-1 — THE WON-BACK RULE (owner ruling, 2026-10-06, verbatim):
 *
 *   "confirm, and pin with a test, that "marks won back" counts ONLY later-correct-attempt (a new
 *    attempt by the student). Mistakes resolved by re-grade or re-grade-not-attempted leave the
 *    live counts (as now), but never count as won back and never show as improvement."
 *
 * ONE fixture: the same mistake (same entry, same graded answers), resolved three ways. For each,
 * assert the WON-BACK figure (count + marks) and the IMPROVEMENT figures (the gated before→now
 * trend delta and the ungated total) — a resolution never moves the graded stream, so the trend
 * and total are identical to the unresolved student in every case; only a later correct attempt
 * is won back.
 *
 * Mutation this file turns RED: count re-grade resolutions as won back (`isWonBack` true for
 * "re-grade" / "re-grade-not-attempted").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry, MistakeResolution } from "./mistakeLogService";

const H = vi.hoisted(() => ({ attempts: [] as PracticeAttempt[], mistakes: [] as MistakeLogEntry[] }));
vi.mock("./practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("./sessionRecords", () => ({
  loadLocalSessionRecords: () => [],
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter(
      (e) => Date.parse(e.timestamp) >= startMs || (e.resolvedAt ? Date.parse(e.resolvedAt) >= startMs : false),
    ),
    complete: true,
  }),
}));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));
vi.mock("./progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import { READ_WINDOWS, readStudyModel, subjectRungOf } from "./progressReadModel";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const HOUR = 3600 * 1000;

/** Eight graded Maths answers in the last two days — a gated trend exists for every window but today. */
const ATTEMPTS: PracticeAttempt[] = [1, 3, 5, 8, 13, 21, 30, 40].map(
  (h, i) =>
    ({
      id: `a${i}`, timestamp: NOW - h * HOUR, subject: "maths", topicKey: "real-numbers", topicName: "Real Numbers",
      questionId: `b${i}`, marksScored: i % 3, marksAvailable: 3, mode: "graded",
    }) as unknown as PracticeAttempt,
);

/** THE mistake: 2 marks lost on b1, 30 hours ago. */
function theMistake(resolvedBy?: MistakeResolution): MistakeLogEntry {
  return {
    id: "quick-practice::S1::b1",
    timestamp: new Date(NOW - 30 * HOUR).toISOString(),
    questionText: "Q", questionId: "b1", topic: "Real Numbers", subject: "Maths",
    totalMarks: 3, marksLost: 2,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
    ...(resolvedBy ? { resolvedAt: new Date(NOW - 2 * HOUR).toISOString(), resolvedBy } : {}),
  };
}

async function figures(resolvedBy?: MistakeResolution) {
  H.mistakes = [theMistake(resolvedBy)];
  const out: Record<string, { wonBack: { count: number; marks: number }; live: number; delta: number | null; lost: number | null }> = {};
  for (const window of READ_WINDOWS) {
    const m = await readStudyModel("u-wb", { window, subject: "maths", nowMs: NOW });
    const both = await readStudyModel("u-wb", { window, nowMs: NOW });
    out[window] = {
      wonBack: m.mistakes.wonBack,
      live: m.mistakes.entries.length,
      delta: subjectRungOf(both.progress, "maths")?.delta ?? null,
      lost: m.progress.totals?.marksLost ?? null,
    };
  }
  return out;
}

beforeEach(() => {
  H.attempts = ATTEMPTS;
});

describe("WON-BACK RULE (owner ruling 2026-10-06) — only a later correct attempt is won back; a re-grade never is", () => {
  it("★ won back counts ONLY later-correct-attempt; re-grade and re-grade-not-attempted count 0 and never show as improvement", async () => {
    const baseline = await figures(undefined);
    const later = await figures("later-correct-attempt");
    const regrade = await figures("re-grade");
    const regradeNa = await figures("re-grade-not-attempted");

    // Precondition: a gated trend exists, so "never shows as improvement" is measured, not vacuous.
    expect(baseline.week.delta).not.toBeNull();

    for (const w of READ_WINDOWS) {
      // (1) later correct attempt — WON BACK (resolved 2 h ago: inside every window, incl. today)
      expect(later[w].wonBack).toEqual({ count: 1, marks: 2 });
      // (2) re-grade — 0 won back
      expect(regrade[w].wonBack).toEqual({ count: 0, marks: 0 });
      // (3) re-grade not attempted — 0 won back
      expect(regradeNa[w].wonBack).toEqual({ count: 0, marks: 0 });

      // IMPROVEMENT figures: no resolution moves the trend delta or the window total.
      for (const v of [later, regrade, regradeNa]) {
        expect(v[w].delta).toBe(baseline[w].delta);
        expect(v[w].lost).toBe(baseline[w].lost);
      }

      // LIVE counts "as now": a re-grade leaves the live mistakes; a later attempt does not erase
      // the earlier loss (it still stands where it happened) — the mistake is only in windows that
      // reach back 30 h, i.e. not today.
      expect(regrade[w].live).toBe(0);
      expect(regradeNa[w].live).toBe(0);
      expect(later[w].live).toBe(baseline[w].live);
    }
  });
});
