// @vitest-environment node
//
// Progress-Journey PR-1 — the ONE aggregation service. Runs in CI/Codespaces vitest.
// The two stores it reads (sessionRecords + the practiceInsights attempts stream) are
// mocked so the read-at-altitudes logic — per-surface history, pending nudge, activity
// counts, and the honest-or-silent before→now trend — is asserted in isolation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionRecord } from "./sessionRecords";
import type { PracticeAttempt } from "./practiceInsights";

let RECORDS: SessionRecord[] = [];
let ATTEMPTS: PracticeAttempt[] = [];

vi.mock("./sessionRecords", () => ({
  loadLocalSessionRecords: () => RECORDS,
}));
vi.mock("./practiceInsights", () => ({
  getAttempts: ({ start }: { start?: number } = {}) => ATTEMPTS.filter((a) => !start || a.timestamp >= start),
}));

import {
  getSurfaceHistory,
  getRecentSessions,
  getActivitySummary,
  getPendingSessions,
  getSubjectProgress,
  getTopicProgress,
} from "./progressStore";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-04T12:00:00.000Z").getTime();

function rec(over: Partial<SessionRecord>): SessionRecord {
  return {
    id: "WS-M-RN-01",
    worksheetId: "ws-abc",
    surface: "worksheet",
    title: "Real Numbers",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [],
    marksAwarded: 4,
    marksTotal: 6,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: NOW,
    perQuestionRef: "ws:WS-M-RN-01",
    dedupKey: "u1::WS-M-RN-01",
    ...over,
  };
}

function attempt(over: Partial<PracticeAttempt>): PracticeAttempt {
  return {
    id: "a",
    questionId: "q",
    topicKey: "real-numbers",
    subject: "maths",
    difficulty: "Medium",
    correct: true,
    marksScored: 1,
    marksAvailable: 4,
    mode: "graded",
    timestamp: NOW,
    ...over,
  } as PracticeAttempt;
}

beforeEach(() => {
  RECORDS = [];
  ATTEMPTS = [];
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("per-surface history + recent strip", () => {
  it("filters to one surface, newest-first", () => {
    RECORDS = [
      rec({ id: "WS-1", surface: "worksheet", gradedAt: NOW - 3 * DAY }),
      rec({ id: "CT-1", surface: "chapter-test", gradedAt: NOW - 1 * DAY }),
      rec({ id: "WS-2", surface: "worksheet", gradedAt: NOW - 1 * DAY }),
    ];
    const ws = getSurfaceHistory("worksheet");
    expect(ws.map((r) => r.id)).toEqual(["WS-2", "WS-1"]);
    expect(getSurfaceHistory("chapter-test").map((r) => r.id)).toEqual(["CT-1"]);
  });

  it("recent sessions span all surfaces, newest-first, capped", () => {
    RECORDS = [
      rec({ id: "A", gradedAt: NOW - 5 * DAY }),
      rec({ id: "B", gradedAt: NOW - 1 * DAY }),
      rec({ id: "C", gradedAt: NOW - 3 * DAY }),
    ];
    expect(getRecentSessions(null, 2).map((r) => r.id)).toEqual(["B", "C"]);
  });

  it("activity summary counts by surface (honest: practice is attempt-level)", () => {
    RECORDS = [
      rec({ id: "WS-1", surface: "worksheet" }),
      rec({ id: "WS-2", surface: "worksheet" }),
      rec({ id: "CT-1", surface: "chapter-test" }),
      rec({ id: "FM-1", surface: "full-mock" }),
    ];
    ATTEMPTS = [attempt({}), attempt({})];
    const s = getActivitySummary();
    expect(s).toMatchObject({ worksheets: 2, chapterTests: 1, fullMocks: 1, practiceAttempts: 2 });
  });
});

describe("Home ungraded nudge", () => {
  it("returns only sessions still awaiting a sheet (status ≠ graded)", () => {
    RECORDS = [
      rec({ id: "G", status: "graded" }),
      rec({ id: "P", status: "pending-upload" }),
      rec({ id: "PA", status: "partial" }),
    ];
    expect(getPendingSessions().map((r) => r.id).sort()).toEqual(["P", "PA"]);
  });
});

describe("rolled-up progress — honest-or-silent before→now", () => {
  it("is SILENT when a half is thin (< 3 measurable attempts)", () => {
    ATTEMPTS = [
      attempt({ timestamp: NOW - 20 * DAY, marksScored: 1 }),
      attempt({ timestamp: NOW - 2 * DAY, marksScored: 3 }),
    ];
    expect(getSubjectProgress("maths", "month")).toBeNull();
  });

  it("shows a marks-anchored before→now trend when both halves are data-backed", () => {
    ATTEMPTS = [
      // earlier half (before mid = NOW-15d): 3 low scores → 25%
      attempt({ timestamp: NOW - 25 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ timestamp: NOW - 22 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ timestamp: NOW - 18 * DAY, marksScored: 1, marksAvailable: 4 }),
      // later half: 3 high scores → 75%
      attempt({ timestamp: NOW - 10 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ timestamp: NOW - 5 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    const trend = getSubjectProgress("maths", "month");
    expect(trend).not.toBeNull();
    expect(trend!.before).toBe(25);
    expect(trend!.now).toBe(75);
    expect(trend!.delta).toBe(50);
    expect(trend!.sampleBefore).toBe(3);
    expect(trend!.sampleNow).toBe(3);
  });

  it("ignores attempts with no measurable marks", () => {
    ATTEMPTS = [
      attempt({ timestamp: NOW - 20 * DAY, marksAvailable: 0 }),
      attempt({ timestamp: NOW - 2 * DAY, marksAvailable: 0 }),
    ];
    expect(getSubjectProgress("maths", "month")).toBeNull();
  });

  it("topic progress narrows to one topicKey", () => {
    ATTEMPTS = [
      attempt({ topicKey: "real-numbers", timestamp: NOW - 100 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ topicKey: "real-numbers", timestamp: NOW - 90 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ topicKey: "real-numbers", timestamp: NOW - 80 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ topicKey: "real-numbers", timestamp: NOW - 20 * DAY, marksScored: 4, marksAvailable: 4 }),
      attempt({ topicKey: "real-numbers", timestamp: NOW - 10 * DAY, marksScored: 4, marksAvailable: 4 }),
      attempt({ topicKey: "real-numbers", timestamp: NOW - 5 * DAY, marksScored: 4, marksAvailable: 4 }),
      // a different topic that should be excluded
      attempt({ topicKey: "polynomials", timestamp: NOW - 5 * DAY, marksScored: 0, marksAvailable: 4 }),
    ];
    const trend = getTopicProgress("real-numbers", "4mo");
    expect(trend).not.toBeNull();
    expect(trend!.before).toBe(25);
    expect(trend!.now).toBe(100);
  });
});
