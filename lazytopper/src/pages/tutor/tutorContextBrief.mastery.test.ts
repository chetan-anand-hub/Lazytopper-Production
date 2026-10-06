/**
 * A17 owner ruling 6 (GRADING-JOBS-1) + ME-ENGINE-1 PR-2 — the Tutor is never told an invented
 * mastery figure, and no per-concept PERCENTAGE either: the brief carries only fields that are
 * real, measured figures from the shared read model.
 *
 * Since ME-ENGINE-1 PR-2 the brief reads `readStudyModel` (no device-local weak areas). Only the
 * CLOUD streams are mocked; the read model and the brief are REAL.
 *
 * ★ GUARD — mutation it turns RED: reintroduce a mastery field (e.g. `brief.topic.masteryPercent
 *   = …` in `briefFromModel`, or any `mastery` read in tutorContextBrief.ts) → both the runtime
 *   key allow-list and the source scan fail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { PracticeAttempt } from "../../services/practiceInsights";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

const NOW = Date.UTC(2026, 9, 6, 6, 0); // 11:30 IST — far from an IST midnight
const HOUR = 60 * 60 * 1000;

const h = vi.hoisted(() => ({ attempts: [] as unknown[], mistakes: [] as unknown[] }));
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
  getMistakeLogHistoryFromCloud: async () => ({ entries: h.mistakes, complete: true }),
}));
vi.mock("../../services/progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import { assembleTutorBrief } from "./tutorContextBrief";
import { READ_WINDOWS } from "../../services/progressReadModel";

let n = 0;
function attempt(agoH: number, scored: number, available: number): PracticeAttempt {
  n += 1;
  return {
    id: `a${n}`,
    timestamp: NOW - agoH * HOUR,
    subject: "maths",
    topicKey: "real-numbers",
    topicName: "Real Numbers",
    questionId: `q${n}`,
    marksScored: scored,
    marksAvailable: available,
    mode: "graded",
  } as unknown as PracticeAttempt;
}
function mistake(id: string, agoH: number, over: Partial<MistakeLogEntry> = {}): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - agoH * HOUR).toISOString(),
    questionText: "Q",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost: 2,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
    ...over,
  };
}

/** The ONLY keys the brief may carry — every one a real, measured figure (or a label). */
const ALLOWED_TOPIC_KEYS = ["trend", "weakConcepts"];
const ALLOWED_MISTAKE_KEYS = ["topType", "marksLostRecent"];

beforeEach(() => {
  n = 0;
  // A rich student: a gated Maths rung, a chapter rung, named concepts — every field fires.
  h.attempts = [0.5, 2, 5, 9, 14, 20, 30, 44].map((agoH, i) => attempt(agoH, i % 3, 3));
  h.mistakes = [
    mistake("quick-practice::A::q1", 1, { concept: "HCF by prime factorisation" }),
    mistake("quick-practice::A::q2", 6, { concept: "Irrationality proofs", marksLost: 1 }),
  ];
});

describe("ruling 6 + ME-ENGINE-1 PR-2 — no mastery or percentage field reaches the Tutor brief", () => {
  it("★ GUARD — every window × paper: only the allowed keys, nothing named mastery or percent", async () => {
    for (const window of READ_WINDOWS) {
      for (const subject of ["maths", "science", ""] as const) {
        const brief = await assembleTutorBrief({ uid: "u-1", topicKey: "real-numbers", subject, window, nowMs: NOW });
        for (const k of Object.keys(brief.topic)) expect(ALLOWED_TOPIC_KEYS, `${window}/${subject} topic.${k}`).toContain(k);
        for (const k of Object.keys(brief.mistakes)) expect(ALLOWED_MISTAKE_KEYS, `${window}/${subject} mistakes.${k}`).toContain(k);
        expect(JSON.stringify(brief)).not.toMatch(/mastery|percent/i);
      }
    }
  });

  it("★ GUARD — the brief's source reads and writes no mastery field and no device-local weak area", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const code = readFileSync(path.join(here, "tutorContextBrief.ts"), "utf8")
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) // comments may explain the ruling
      .join("\n");
    expect(code).not.toMatch(/mastery/i);
    expect(code).not.toMatch(/getWeakAreas|weakAreaAggregator|loadWrongAnswerLog|mockScoreHistory|getMistakeInsights/);
  });

  it("CONTROL — the same rich fixture DOES produce real figures (the guard is not vacuous)", async () => {
    const brief = await assembleTutorBrief({ uid: "u-1", topicKey: "real-numbers", subject: "maths", window: "week", nowMs: NOW });
    expect(brief.topic.weakConcepts).toEqual(["HCF by prime factorisation", "Irrationality proofs"]);
    expect(brief.topic.trend).toBeDefined();
    expect(brief.mistakes.topType).toBe("knowledge gap");
    expect(typeof brief.mistakes.marksLostRecent).toBe("number");
    expect(brief.hasData).toBe(true);
  });

  it("a thin student (below Me's gate, no concepts) → no figure at all, hasData false", async () => {
    h.attempts = [attempt(1, 0, 3)];
    h.mistakes = [mistake("quick-practice::B::q1", 1)];
    const brief = await assembleTutorBrief({ uid: "u-1", topicKey: "real-numbers", subject: "maths", window: "week", nowMs: NOW });
    expect(brief).toEqual({ hasData: false, topic: {}, mistakes: {} });
  });

  it("signed out → the empty brief, nothing read", async () => {
    expect(await assembleTutorBrief({ uid: null, topicKey: "real-numbers", subject: "maths" })).toEqual({
      hasData: false,
      topic: {},
      mistakes: {},
    });
  });
});
