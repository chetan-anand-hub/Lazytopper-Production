// @vitest-environment node
//
// Progress-Journey PR-1 — the ONE aggregation service. Runs in CI/Codespaces vitest.
// The two stores it reads (sessionRecords + the practiceInsights attempts stream) are
// mocked so the read-at-altitudes logic — per-surface history, pending nudge, activity
// counts, and the honest-or-silent before→now trend — is asserted in isolation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionRecord, SessionPerQuestionPayload } from "./sessionRecords";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { BankConcept } from "./progressBankIndex";

// Device-local mirrors (the SYNC sync-export path).
let RECORDS: SessionRecord[] = [];
let ATTEMPTS: PracticeAttempt[] = [];
// Durable CLOUD streams (the cross-device getWindowedProgress path). Kept SEPARATE
// from the local mirrors so a test can prove getWindowedProgress reads the cloud —
// no localStorage-only dependence.
let CLOUD_RECORDS: SessionRecord[] = [];
let CLOUD_ATTEMPTS: PracticeAttempt[] = [];
let PAYLOADS: SessionPerQuestionPayload[] = [];
let MISTAKES: MistakeLogEntry[] = [];
let BANK: Record<string, BankConcept> = {};
let ACTIVE_UID: string | null = "u1";

vi.mock("./sessionRecords", () => ({
  loadLocalSessionRecords: () => RECORDS,
  getSessionRecordsFromCloud: async () => CLOUD_RECORDS,
  getAllSessionPerQuestionFromCloud: async () => PAYLOADS,
}));
vi.mock("./practiceInsights", () => ({
  getAttempts: ({ start }: { start?: number } = {}) => ATTEMPTS.filter((a) => !start || a.timestamp >= start),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    CLOUD_ATTEMPTS.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("./mistakeLogService", () => ({
  getMistakeLogs: async () => MISTAKES,
}));
vi.mock("./studentProgressStore", () => ({
  getActiveProgressUser: () => ACTIVE_UID,
}));
vi.mock("./progressBankIndex", () => ({
  conceptForQuestionId: (id: string | null | undefined) => (id ? BANK[String(id)] ?? null : null),
  isChapterEchoSubtopic: (s: string | null | undefined) => {
    const v = String(s || "").trim().toLowerCase();
    return !v || v === "general" || v.startsWith("chapter practice");
  },
  normalizeSection: (s: string | null | undefined) => {
    const raw = String(s || "").trim();
    const m = raw.match(/\b([A-E])\b/i);
    return m ? m[1].toUpperCase() : raw;
  },
}));

import {
  getSurfaceHistory,
  getRecentSessions,
  getActivitySummary,
  getPendingSessions,
  getSubjectProgress,
  getTopicProgress,
  getWindowedProgress,
  getTopicTrendFromCloud,
  isShortSpan,
} from "./progressStore";
// REAL modules (deliberately unmocked): the canonical resolver chain the engine uses
// — so the key-mismatch regression proves the actual vocabularies converge.
import { resolveCanonicalTopicKey } from "../data/syllabus/topicAliasMap";
import { desktopTopicsBySubject } from "../lib/desktop/topics";

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
  CLOUD_RECORDS = [];
  CLOUD_ATTEMPTS = [];
  PAYLOADS = [];
  MISTAKES = [];
  BANK = {};
  ACTIVE_UID = "u1";
  vi.setSystemTime(NOW);
});

// ── getWindowedProgress fixtures ──────────────────────────────────────────────
function cloudAttempt(over: Partial<PracticeAttempt>): PracticeAttempt {
  return attempt(over);
}
function payload(ref: string, results: Array<{ qNumber: number; couldNotRead?: boolean; totalMarks: number; marksAwarded?: number }>): SessionPerQuestionPayload {
  return {
    ref,
    code: ref,
    worksheetId: "ws-x",
    surface: "worksheet",
    gradedAt: NOW,
    // Only `results` is read by the aggregator; the rest of the response is unused.
    response: { results } as unknown as SessionPerQuestionPayload["response"],
  };
}
function mistake(over: Partial<MistakeLogEntry>): MistakeLogEntry {
  return {
    id: "m",
    timestamp: new Date(NOW).toISOString(),
    questionText: "Q",
    topic: "real-numbers",
    subject: "maths",
    totalMarks: 4,
    marksLost: 2,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    ...over,
  };
}
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

// ══════════════════════════════════════════════════════════════════════════════
// PR-B — cross-device, multi-rung windowed aggregation
// ══════════════════════════════════════════════════════════════════════════════
describe("getWindowedProgress — cross-device (no localStorage-only dependence)", () => {
  it("reads the DURABLE cloud streams, not the device-local mirrors", async () => {
    // Local mirrors are EMPTY; only the cloud streams carry data.
    RECORDS = [];
    ATTEMPTS = [];
    CLOUD_ATTEMPTS = [
      cloudAttempt({ timestamp: NOW - 25 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 22 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 18 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 10 * DAY, marksScored: 3, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 5 * DAY, marksScored: 3, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // A real before→now arc appears — proving it came from the CLOUD, not localStorage.
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0]).toMatchObject({ key: "maths", before: 25, now: 75, delta: 50 });
    expect(wp.activity.practiceAttempts).toBe(6);
  });

  it("returns an honest empty for a signed-out / anonymous / no-uid read (never a fake curve)", async () => {
    ACTIVE_UID = null;
    CLOUD_ATTEMPTS = [cloudAttempt({ timestamp: NOW - 1 * DAY })];
    const wp = await getWindowedProgress(null, "month", undefined, NOW);
    expect(wp.subjects).toEqual([]);
    expect(wp.topics).toEqual([]);
    expect(wp.mistakeTypes).toEqual([]);
    expect(wp.activity.practiceAttempts).toBe(0);

    const anon = await getWindowedProgress("anonymous", "month", undefined, NOW);
    expect(anon.subjects).toEqual([]);
  });
});

describe("getWindowedProgress — honest-or-silent PER RUNG", () => {
  it("every rung is SILENT when a half is thin (< 3 measurable points)", async () => {
    CLOUD_ATTEMPTS = [
      cloudAttempt({ timestamp: NOW - 20 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    CLOUD_RECORDS = [rec({ id: "WS-1", gradedAt: NOW - 2 * DAY, questionIds: ["b1"] })];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toEqual([]);
    expect(wp.topics).toEqual([]);
    expect(wp.concepts).toEqual([]);
    expect(wp.sections).toEqual([]);
    expect(wp.mistakeTypes).toEqual([]);
  });
});

describe("getWindowedProgress — concept + section rungs (bank-matched only)", () => {
  it("resolves QP attempts by bank id; suppresses chapter-echo; silent for unknown ids", async () => {
    BANK = {
      b1: { subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" },
      b2: { subtopic: "Chapter Practice — Real Numbers", section: "B", topicKey: "real-numbers" }, // echo → suppressed
      // b3 has NO bank row → unknowable (never fabricated)
    };
    const mk = (id: string, ts: number, scored: number) =>
      cloudAttempt({ questionId: id, timestamp: ts, marksScored: scored, marksAvailable: 4 });
    CLOUD_ATTEMPTS = [
      mk("b1", NOW - 25 * DAY, 1),
      mk("b1", NOW - 22 * DAY, 1),
      mk("b1", NOW - 18 * DAY, 1),
      mk("b1", NOW - 10 * DAY, 3),
      mk("b1", NOW - 5 * DAY, 3),
      mk("b1", NOW - 1 * DAY, 3),
      mk("b2", NOW - 20 * DAY, 1),
      mk("b2", NOW - 2 * DAY, 4),
      mk("b3", NOW - 2 * DAY, 4),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // Only the concept-grained subtopic survives; the echo + unknown id are silent.
    expect(wp.concepts.map((c) => c.key)).toEqual(["HCF and LCM"]);
    expect(wp.concepts[0]).toMatchObject({ before: 25, now: 75 });
    // Section A resolves from the same b1 attempts.
    expect(wp.sections.map((s) => s.key)).toEqual(["A"]);
  });

  it("joins worksheet record + payload marks by questionId; C&I (questionIds:[]) stays silent", async () => {
    BANK = { w1: { subtopic: "Similar Triangles", section: "C", topicKey: "triangles" } };
    // Six graded worksheet questions on w1, split before/now, all bank-matched.
    const wsRec = (id: string, ts: number) =>
      rec({ id, surface: "worksheet", gradedAt: ts, questionIds: ["w1"], perQuestionRef: `ws:${id}` });
    CLOUD_RECORDS = [
      wsRec("WS-1", NOW - 25 * DAY),
      wsRec("WS-2", NOW - 22 * DAY),
      wsRec("WS-3", NOW - 18 * DAY),
      wsRec("WS-4", NOW - 10 * DAY),
      wsRec("WS-5", NOW - 5 * DAY),
      wsRec("WS-6", NOW - 1 * DAY),
      // A Check & Improve record — questionIds:[] → concept unknowable, must be silent.
      rec({ id: "CI-1", surface: "check-improve", gradedAt: NOW - 2 * DAY, questionIds: [], perQuestionRef: "ci:CI-1" }),
    ];
    PAYLOADS = [
      payload("ws:WS-1", [{ qNumber: 1, totalMarks: 4, marksAwarded: 1 }]),
      payload("ws:WS-2", [{ qNumber: 1, totalMarks: 4, marksAwarded: 1 }]),
      payload("ws:WS-3", [{ qNumber: 1, totalMarks: 4, marksAwarded: 1 }]),
      payload("ws:WS-4", [{ qNumber: 1, totalMarks: 4, marksAwarded: 3 }]),
      payload("ws:WS-5", [{ qNumber: 1, totalMarks: 4, marksAwarded: 3 }]),
      payload("ws:WS-6", [{ qNumber: 1, totalMarks: 4, marksAwarded: 3 }]),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.concepts.map((c) => c.key)).toEqual(["Similar Triangles"]);
    expect(wp.concepts[0]).toMatchObject({ before: 25, now: 75 });
    expect(wp.sections.map((s) => s.key)).toEqual(["C"]);
  });

  it("omits a record whose payload length does not match its questionIds (no mis-attribution)", async () => {
    BANK = { w1: { subtopic: "Similar Triangles", section: "C", topicKey: "triangles" } };
    CLOUD_RECORDS = [
      rec({ id: "WS-1", surface: "worksheet", gradedAt: NOW - 5 * DAY, questionIds: ["w1", "w2"], perQuestionRef: "ws:WS-1" }),
    ];
    // Payload has ONE result but the record claims TWO questionIds → skipped.
    PAYLOADS = [payload("ws:WS-1", [{ qNumber: 1, totalMarks: 4, marksAwarded: 4 }])];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.concepts).toEqual([]);
  });

  it("a topic-scoped read never leaks another topic's subtopic via the RECORD path", async () => {
    // A real-numbers worksheet (same subject, different topic). Records are subject-
    // filtered, not topic-filtered, so it reaches the concept builder — the per-question
    // topicKey guard must keep its "HCF and LCM" out of a triangles-scoped view.
    BANK = { r1: { subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" } };
    const days = [25, 22, 18, 10, 5, 1];
    CLOUD_RECORDS = days.map((d, i) =>
      rec({
        id: `WS-${i}`,
        surface: "worksheet",
        subject: "maths",
        topicKeys: ["real-numbers"],
        gradedAt: NOW - d * DAY,
        questionIds: ["r1"],
        perQuestionRef: `ws:WS-${i}`,
      }),
    );
    PAYLOADS = days.map((_, i) => payload(`ws:WS-${i}`, [{ qNumber: 1, totalMarks: 4, marksAwarded: 2 }]));
    // Enough data to FORM a concept row if it leaked — assert it does NOT.
    const scoped = await getWindowedProgress("u1", "month", { topicKey: "triangles" }, NOW);
    expect(scoped.concepts).toEqual([]);
    // Sanity: the SAME data, scoped to its OWN topic, does surface the concept.
    const own = await getWindowedProgress("u1", "month", { topicKey: "real-numbers" }, NOW);
    expect(own.concepts.map((c) => c.key)).toEqual(["HCF and LCM"]);
  });
});

describe("getWindowedProgress — mistake-type rung (composition share, idempotent, honest)", () => {
  const ft = (o: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation", number>>) => ({
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
    ...o,
  });

  it("computes the four-type COMPOSITION share before→now (of typed mistakes)", async () => {
    CLOUD_RECORDS = [
      // before: mistakes are 50% conceptual / 50% calculation
      rec({ id: "B1", gradedAt: NOW - 25 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1, calculation: 1 }) }),
      rec({ id: "B2", gradedAt: NOW - 22 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1, calculation: 1 }) }),
      rec({ id: "B3", gradedAt: NOW - 18 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1, calculation: 1 }) }),
      // now: mistakes shifted to 50% silly / 50% presentation (careless)
      rec({ id: "N1", gradedAt: NOW - 10 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ silly: 1, presentation: 1 }) }),
      rec({ id: "N2", gradedAt: NOW - 5 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ silly: 1, presentation: 1 }) }),
      rec({ id: "N3", gradedAt: NOW - 1 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ silly: 1, presentation: 1 }) }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    const byKey = Object.fromEntries(wp.mistakeTypes.map((m) => [m.key, m]));
    expect(byKey.conceptual).toMatchObject({ before: 50, now: 0, delta: -50 });
    expect(byKey.calculation).toMatchObject({ before: 50, now: 0 });
    expect(byKey.silly).toMatchObject({ before: 0, now: 50, delta: 50 });
    expect(wp.mistakeTypes).toHaveLength(4);
  });

  it("REGRESSION: pending/partial records in a half → SILENT, never a fabricated 'mistakes fell' trend", async () => {
    CLOUD_RECORDS = [
      // before: 3 fully-graded worksheets with real conceptual mistakes
      rec({ id: "B1", gradedAt: NOW - 25 * DAY, status: "graded", questionIds: ["q1", "q2"], fourType: ft({ conceptual: 2 }) }),
      rec({ id: "B2", gradedAt: NOW - 22 * DAY, status: "graded", questionIds: ["q1", "q2"], fourType: ft({ conceptual: 2 }) }),
      rec({ id: "B3", gradedAt: NOW - 18 * DAY, status: "graded", questionIds: ["q1", "q2"], fourType: ft({ conceptual: 2 }) }),
      // now: 3 SUBMITTED-BUT-NOT-UPLOADED papers — full 40-Q questionIds, zeroed fourType.
      // These must be EXCLUDED (status !== graded); before the fix they injected a
      // 0/120 denominator and faked "conceptual fell to zero".
      rec({ id: "N1", gradedAt: NOW - 10 * DAY, status: "pending-upload", questionIds: Array(40).fill("q"), fourType: ft({}) }),
      rec({ id: "N2", gradedAt: NOW - 5 * DAY, status: "pending-upload", questionIds: Array(40).fill("q"), fourType: ft({}) }),
      rec({ id: "N3", gradedAt: NOW - 1 * DAY, status: "partial", questionIds: Array(40).fill("q"), fourType: ft({}) }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // now-half has 0 fully-graded records → honest silence, not a fabricated curve.
    expect(wp.mistakeTypes).toEqual([]);
  });

  it("is SILENT when a half has graded records but zero typed mistakes (no composition to show)", async () => {
    CLOUD_RECORDS = [
      rec({ id: "B1", gradedAt: NOW - 25 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1 }) }),
      rec({ id: "B2", gradedAt: NOW - 22 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1 }) }),
      rec({ id: "B3", gradedAt: NOW - 18 * DAY, status: "graded", questionIds: ["q"], fourType: ft({ conceptual: 1 }) }),
      // now: 3 graded, but a clean streak — zero mistakes → composition undefined → silent
      rec({ id: "N1", gradedAt: NOW - 10 * DAY, status: "graded", questionIds: ["q"], fourType: ft({}) }),
      rec({ id: "N2", gradedAt: NOW - 5 * DAY, status: "graded", questionIds: ["q"], fourType: ft({}) }),
      rec({ id: "N3", gradedAt: NOW - 1 * DAY, status: "graded", questionIds: ["q"], fourType: ft({}) }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.mistakeTypes).toEqual([]);
  });
});

describe("getWindowedProgress — idempotency + timestamp normalization", () => {
  it("collapses duplicate cross-device mistakeLog entries (enrichment counted once)", async () => {
    const dup = { questionText: "Q7", totalMarks: 4, marksLost: 2, mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 } };
    MISTAKES = [
      mistake({ id: "device-a", timestamp: new Date(NOW - 2 * DAY).toISOString(), ...dup }),
      mistake({ id: "device-b", timestamp: new Date(NOW - 2 * DAY).toISOString(), ...dup }), // same content, 2nd device
      mistake({ id: "other", timestamp: new Date(NOW - 3 * DAY).toISOString(), questionText: "Q8" }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // 3 raw rows → 2 distinct (the cross-device dup collapses).
    expect(wp.mistakeLog.loggedInWindow).toBe(2);
  });

  it("mistakeLog duplicates do NOT touch the mistake-type composition (share uses idempotent fourType)", async () => {
    const ft = (conceptual: number) => ({ conceptual, calculation: 0, silly: 0, presentation: 0 });
    CLOUD_RECORDS = [
      rec({ id: "B1", gradedAt: NOW - 25 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
      rec({ id: "B2", gradedAt: NOW - 22 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
      rec({ id: "B3", gradedAt: NOW - 18 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
      rec({ id: "N1", gradedAt: NOW - 10 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
      rec({ id: "N2", gradedAt: NOW - 5 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
      rec({ id: "N3", gradedAt: NOW - 1 * DAY, status: "graded", questionIds: ["q"], fourType: ft(1) }),
    ];
    // A flood of duplicate mistakeLog rows must not touch the composition share
    // (which is derived from the idempotent sessionRecords.fourType, not mistakeLog).
    MISTAKES = Array.from({ length: 20 }, (_, i) =>
      mistake({ id: `dup-${i}`, timestamp: new Date(NOW - 2 * DAY).toISOString() }),
    );
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    const conceptual = wp.mistakeTypes.find((m) => m.key === "conceptual")!;
    expect(conceptual.before).toBe(100); // 100% of typed mistakes are conceptual, both halves
    expect(conceptual.now).toBe(100);
  });

  it("windows mistakeLog by its ISO-string timestamp (normalized to epoch ms)", async () => {
    MISTAKES = [
      mistake({ id: "in", timestamp: new Date(NOW - 3 * DAY).toISOString() }), // inside 30d
      mistake({ id: "out", timestamp: new Date(NOW - 45 * DAY).toISOString(), questionText: "old" }), // outside
      mistake({ id: "bad", timestamp: "not-a-date", questionText: "corrupt" }), // unparseable → skipped
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.mistakeLog.loggedInWindow).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PR-B-v2 — the engine fixes (canonical keys · unified stream · activity-median)
// ══════════════════════════════════════════════════════════════════════════════

/** Six measurable attempts on one topic — 3 earlier (25%) then 3 later (100%). */
function seedSixAttempts(topicKey: string, daysAgo = [100, 90, 80, 20, 10, 5]): PracticeAttempt[] {
  return daysAgo.map((d, i) =>
    attempt({
      id: `a-${topicKey}-${i}`,
      topicKey,
      timestamp: NOW - d * DAY,
      marksScored: i < 3 ? 1 : 4,
      marksAvailable: 4,
    }),
  );
}

describe("PR-B-v2 — ONE canonical topic vocabulary ([FU-PROG-TOPIC-KEY-MISMATCH])", () => {
  it("REGRESSION: a recorded attempt is FOUND for EVERY topics.ts slug, under BOTH vocabularies", () => {
    // Registry-driven (not a hardcoded list): every desktop topic, both subjects.
    const slugs = [...desktopTopicsBySubject("Maths"), ...desktopTopicsBySubject("Science")].map(
      (t) => t.slug,
    );
    expect(slugs.length).toBeGreaterThanOrEqual(26);
    for (const slug of slugs) {
      ATTEMPTS = seedSixAttempts(slug);
      // The write-side spelling (recordAttempt's canonical slug)…
      expect(getTopicProgress(slug, "4mo"), `write-side ${slug}`).not.toBeNull();
      // …and the READ-side spelling the Topic Hub passes (normalizeTopicKey →
      // resolveCanonicalTopicKey — the aliasMap vocabulary that used to match ZERO rows
      // on 5 of 26 topics).
      const hubSpelling = resolveCanonicalTopicKey(slug);
      expect(getTopicProgress(hubSpelling, "4mo"), `hub-side ${slug} → ${hubSpelling}`).not.toBeNull();
    }
  });

  it("the five divergent-vocabulary topics match across the write/read boundary", () => {
    const pairs: Array<[write: string, read: string]> = [
      ["arithmetic-progression", "arithmetic-progressions"],
      ["heredity", "heredity-and-evolution"],
      ["how-do-organisms-reproduce", "reproduction"],
      ["light-reflection-and-refraction", "light-reflection-and-refraction-incl-human-eye-prism"],
      ["pair-of-linear-equations", "pair-of-linear-equations-in-two-variables"],
    ];
    for (const [write, read] of pairs) {
      ATTEMPTS = seedSixAttempts(write);
      expect(getTopicProgress(read, "4mo"), `${write} read as ${read}`).not.toBeNull();
    }
  });

  it("legacy label-keyed attempts (pre-#363) bucket with slug-keyed ones", () => {
    ATTEMPTS = [
      ...seedSixAttempts("Real Numbers", [100, 90, 80]).slice(0, 3),
      ...seedSixAttempts("real-numbers", [100, 90, 80, 20, 10, 5]).slice(3),
    ];
    const t = getTopicProgress("real-numbers", "4mo");
    expect(t).not.toBeNull();
    expect(t!.sampleBefore).toBe(3);
    expect(t!.sampleNow).toBe(3);
  });

  it("getWindowedProgress groups both vocabularies into ONE canonical topic row", async () => {
    CLOUD_ATTEMPTS = [
      ...seedSixAttempts("heredity").slice(0, 3),
      ...seedSixAttempts("heredity-and-evolution").slice(3),
    ];
    const wp = await getWindowedProgress("u1", "4mo", undefined, NOW);
    expect(wp.topics).toHaveLength(1);
    expect(wp.topics[0]).toMatchObject({ key: "heredity", sampleBefore: 3, sampleNow: 3 });
  });
});

describe("PR-B-v2 — the unified graded stream ([FU-PROG-DATA-COMPLETENESS])", () => {
  it("(spec A) a Chapter Test — INCLUDING its objective Section A — feeds the subject and topic trends", async () => {
    BANK = {
      b1: { subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" },
      b2: { subtopic: "Irrationality proofs", section: "C", topicKey: "real-numbers" },
      b3: { subtopic: "Decimal expansions", section: "D", topicKey: "real-numbers" },
    };
    CLOUD_ATTEMPTS = [
      // earlier half: 3 Quick-Practice attempts
      cloudAttempt({ id: "q1", questionId: "", topicKey: "real-numbers", timestamp: NOW - 25 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q2", questionId: "", topicKey: "real-numbers", timestamp: NOW - 22 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q3", questionId: "", topicKey: "real-numbers", timestamp: NOW - 18 * DAY, marksScored: 1, marksAvailable: 4 }),
      // the CT's SUBJECTIVE questions — fanned through recordAttempt at grade time
      // with the synthetic ct: ids (the dedup key the union relies on).
      cloudAttempt({ id: "s2", questionId: "ct:ws-ct1:q2", topicKey: "real-numbers", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 3 }),
      cloudAttempt({ id: "s3", questionId: "ct:ws-ct1:q3", topicKey: "real-numbers", timestamp: NOW - 2 * DAY, marksScored: 2, marksAvailable: 5 }),
    ];
    CLOUD_RECORDS = [
      rec({
        id: "CT-1",
        surface: "chapter-test",
        worksheetId: "ws-ct1",
        topicKeys: ["real-numbers"],
        gradedAt: NOW - 2 * DAY,
        questionIds: ["b1", "b2", "b3"],
        perQuestionRef: "ct:CT-1",
      }),
    ];
    PAYLOADS = [
      payload("ct:CT-1", [
        { qNumber: 1, totalMarks: 1, marksAwarded: 1 }, // OBJECTIVE — never fanned as an attempt
        { qNumber: 2, totalMarks: 3, marksAwarded: 3 }, // subjective — already an attempt → dedup
        { qNumber: 3, totalMarks: 5, marksAwarded: 2 }, // subjective — already an attempt → dedup
      ]),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // 3 earlier + exactly 3 now (2 fanned attempts + the 1 objective payload point —
    // NOT 5: the two subjective questions must count once).
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0]).toMatchObject({ key: "maths", sampleBefore: 3, sampleNow: 3 });
    // The topic rung sees the CT work too (the arc was blind to this before v2).
    expect(wp.topics).toHaveLength(1);
    expect(wp.topics[0]).toMatchObject({ key: "real-numbers", sampleBefore: 3, sampleNow: 3 });
  });

  it("record-only history (no attempts at all) still yields a trend — heals pre-#403 sessions", async () => {
    BANK = { w1: { subtopic: "Similar Triangles", section: "C", topicKey: "triangles" } };
    const days = [25, 22, 18, 10, 5, 1];
    CLOUD_ATTEMPTS = []; // the durable attempts subcollection did not exist yet
    CLOUD_RECORDS = days.map((d, i) =>
      rec({
        id: `WS-${i}`,
        surface: "worksheet",
        worksheetId: `ws-${i}`,
        topicKeys: ["triangles"],
        gradedAt: NOW - d * DAY,
        questionIds: ["w1"],
        perQuestionRef: `ws:WS-${i}`,
      }),
    );
    PAYLOADS = days.map((d, i) =>
      payload(`ws:WS-${i}`, [{ qNumber: 1, totalMarks: 4, marksAwarded: d > 14 ? 1 : 3 }]),
    );
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0]).toMatchObject({ before: 25, now: 75 });
    expect(wp.topics[0]).toMatchObject({ key: "triangles", before: 25, now: 75 });
  });

  it("(spec E) C&I's dual write counts ONCE — its attempts stay, its record is skipped", async () => {
    CLOUD_ATTEMPTS = [
      cloudAttempt({ id: "q1", questionId: "", timestamp: NOW - 25 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q2", questionId: "", timestamp: NOW - 22 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q3", questionId: "", timestamp: NOW - 18 * DAY, marksScored: 1, marksAvailable: 4 }),
      // The C&I session's 3 per-question attempts (C&I uploads carry no questionId).
      cloudAttempt({ id: "c1", questionId: "", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
      cloudAttempt({ id: "c2", questionId: "", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
      cloudAttempt({ id: "c3", questionId: "", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    // The SAME session's record (the dual write) — even with a payload present it
    // must contribute NOTHING to the marks rungs.
    CLOUD_RECORDS = [
      rec({ id: "CI-1", surface: "check-improve", gradedAt: NOW - 2 * DAY, questionIds: [], perQuestionRef: "ci:CI-1", marksAwarded: 9, marksTotal: 12 }),
    ];
    PAYLOADS = [payload("ci:CI-1", [{ qNumber: 1, totalMarks: 12, marksAwarded: 9 }])];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0]).toMatchObject({ sampleBefore: 3, sampleNow: 3 }); // NOT 4/6
  });

  // ── LOCKED §1a as amended: QP's record is NON-COUNTING ──────────────────────
  // These mirror the ratified C&I "dual write counts ONCE" property above. QP is the
  // sharper case: unlike C&I (questionIds:[]), a QP record carries REAL BANK IDS and a
  // payload, so it would resolve through conceptForQuestionId and land in the very same
  // buckets its attempts already filled. PROGRESS_COUNTING_SURFACES is what stops it.
  it("(§1a amended) QP's dual write counts ONCE — its attempts stay, its record is skipped", async () => {
    const mk = (id: string, ts: number, scored: number) =>
      cloudAttempt({ questionId: id, timestamp: ts, marksScored: scored, marksAvailable: 4 });
    CLOUD_ATTEMPTS = [
      mk("b1", NOW - 25 * DAY, 1),
      mk("b1", NOW - 22 * DAY, 1),
      mk("b1", NOW - 18 * DAY, 1),
      mk("b1", NOW - 10 * DAY, 3),
      mk("b1", NOW - 5 * DAY, 3),
      mk("b1", NOW - 1 * DAY, 3),
    ];
    // The SAME session's record — real bank ids + a payload, i.e. every ingredient the
    // record path needs to double-count. It must contribute NOTHING.
    CLOUD_RECORDS = [
      rec({
        id: "QP-M-REAL-abc12345",
        surface: "quick-practice",
        gradedAt: NOW - 1 * DAY,
        questionIds: ["b1"],
        perQuestionRef: "qp:QP-M-REAL-abc12345",
        marksAwarded: 3,
        marksTotal: 4,
      }),
    ];
    PAYLOADS = [payload("qp:QP-M-REAL-abc12345", [{ qNumber: 1, totalMarks: 4, marksAwarded: 3 }])];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    // 6 attempts in, 6 counted — the record adds no 7th point anywhere.
    expect(wp.subjects[0]).toMatchObject({ sampleBefore: 3, sampleNow: 3 }); // NOT 3/4
    expect(wp.topics[0]).toMatchObject({ sampleBefore: 3, sampleNow: 3 });
  });

  it("(§1a amended) a QP record NEVER reaches the concept/section rungs", async () => {
    BANK = { b1: { subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" } };
    const mk = (id: string, ts: number, scored: number) =>
      cloudAttempt({ questionId: id, timestamp: ts, marksScored: scored, marksAvailable: 4 });
    CLOUD_ATTEMPTS = [
      mk("b1", NOW - 25 * DAY, 1),
      mk("b1", NOW - 22 * DAY, 1),
      mk("b1", NOW - 18 * DAY, 1),
      mk("b1", NOW - 10 * DAY, 3),
      mk("b1", NOW - 5 * DAY, 3),
      mk("b1", NOW - 1 * DAY, 3),
    ];
    const withoutRecord = await getWindowedProgress("u1", "month", undefined, NOW);
    // Identical data + a QP record on the SAME bank id. buildConceptSectionRungs'
    // guard is a deny-list naming only "check-improve", so nothing there excludes QP —
    // only the winRecords boundary does. This asserts the boundary holds.
    CLOUD_RECORDS = [
      rec({
        id: "QP-M-REAL-abc12345",
        surface: "quick-practice",
        gradedAt: NOW - 1 * DAY,
        questionIds: ["b1"],
        perQuestionRef: "qp:QP-M-REAL-abc12345",
      }),
    ];
    PAYLOADS = [payload("qp:QP-M-REAL-abc12345", [{ qNumber: 1, totalMarks: 4, marksAwarded: 3 }])];
    const withRecord = await getWindowedProgress("u1", "month", undefined, NOW);
    // The whole point, stated as an equality: the numbers are IDENTICAL before/after
    // for the same data. Not "close" — identical.
    expect(withRecord.concepts).toEqual(withoutRecord.concepts);
    expect(withRecord.sections).toEqual(withoutRecord.sections);
    expect(withRecord.subjects).toEqual(withoutRecord.subjects);
    expect(withRecord.topics).toEqual(withoutRecord.topics);
    expect(withRecord.mistakeTypes).toEqual(withoutRecord.mistakeTypes);
    expect(withRecord.activity).toEqual(withoutRecord.activity);
  });

  it("(§1a amended) QP records never inflate the activity counts", async () => {
    CLOUD_RECORDS = [
      rec({ id: "WS-1", surface: "worksheet", gradedAt: NOW - 2 * DAY }),
      rec({ id: "QP-M-REAL-a", surface: "quick-practice", gradedAt: NOW - 2 * DAY, questionIds: ["b1"] }),
      rec({ id: "QP-M-REAL-b", surface: "quick-practice", gradedAt: NOW - 1 * DAY, questionIds: ["b2"] }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.activity).toMatchObject({ worksheets: 1, chapterTests: 0, fullMocks: 0 });
  });

  it("a worksheet question fanned as an attempt is never re-added from its record", async () => {
    BANK = { w1: { subtopic: "Similar Triangles", section: "C", topicKey: "triangles" } };
    CLOUD_ATTEMPTS = [
      cloudAttempt({ id: "q1", questionId: "", timestamp: NOW - 25 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q2", questionId: "", timestamp: NOW - 22 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q3", questionId: "", timestamp: NOW - 18 * DAY, marksScored: 1, marksAvailable: 4 }),
      cloudAttempt({ id: "q4", questionId: "", timestamp: NOW - 5 * DAY, marksScored: 3, marksAvailable: 4 }),
      cloudAttempt({ id: "q5", questionId: "", timestamp: NOW - 4 * DAY, marksScored: 3, marksAvailable: 4 }),
      // The worksheet's single question, fanned at grade time with its synthetic id.
      cloudAttempt({ id: "w", questionId: "ws:ws-abc:q1", timestamp: NOW - 1 * DAY, marksScored: 4, marksAvailable: 4 }),
    ];
    CLOUD_RECORDS = [
      rec({ id: "WS-9", surface: "worksheet", worksheetId: "ws-abc", gradedAt: NOW - 1 * DAY, questionIds: ["w1"], perQuestionRef: "ws:WS-9" }),
    ];
    PAYLOADS = [payload("ws:WS-9", [{ qNumber: 1, totalMarks: 4, marksAwarded: 4 }])];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects[0]).toMatchObject({ sampleBefore: 3, sampleNow: 3 }); // NOT 3/4
  });
});

describe("PR-B-v2 — activity-median window model ([FU-PROG-WINDOW-MODEL], Option B)", () => {
  it("(spec C) a wider window never shows less than a narrower one under recent-heavy practice", () => {
    // All practice in the last 6 days — the calendar-midpoint model showed a 2wk trend
    // but went SILENT on month/4mo (older calendar half empty). Backwards + confusing.
    ATTEMPTS = [
      attempt({ id: "r1", timestamp: NOW - 6 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "r2", timestamp: NOW - 5 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "r3", timestamp: NOW - 4 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "r4", timestamp: NOW - 3 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "r5", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "r6", timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    const wk2 = getSubjectProgress("maths", "2wk");
    const mo = getSubjectProgress("maths", "month");
    const mo4 = getSubjectProgress("maths", "4mo");
    expect(wk2).not.toBeNull();
    expect(mo).not.toBeNull();
    expect(mo4).not.toBeNull();
    // The wider windows contain the same points → the same honest trend.
    expect(mo).toMatchObject({ before: wk2!.before, now: wk2!.now, sampleBefore: 3, sampleNow: 3 });
    expect(mo4).toMatchObject({ before: wk2!.before, now: wk2!.now });
  });

  it("(spec D) all-recent practice yields a LABELED short-term trend, not silence", async () => {
    ATTEMPTS = [
      attempt({ id: "d1", timestamp: NOW - 3 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "d2", timestamp: NOW - 3 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "d3", timestamp: NOW - 2 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "d4", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "d5", timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "d6", timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    const t = getSubjectProgress("maths", "month");
    expect(t).not.toBeNull(); // never silence-that-looks-broken
    expect(t!.spanDays).toBeLessThanOrEqual(3);
    expect(isShortSpan("month", t!.spanDays)).toBe(true); // → the honest label fires

    // The async arc carries the same label data.
    CLOUD_ATTEMPTS = ATTEMPTS;
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toHaveLength(1);
    expect(wp.activitySpanDays).not.toBeNull();
    expect(isShortSpan("month", wp.activitySpanDays)).toBe(true);
  });

  it("a genuinely window-spread trend is NOT flagged short-span", () => {
    ATTEMPTS = [
      attempt({ id: "s1", timestamp: NOW - 28 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "s2", timestamp: NOW - 24 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "s3", timestamp: NOW - 19 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "s4", timestamp: NOW - 12 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "s5", timestamp: NOW - 6 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "s6", timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    const t = getSubjectProgress("maths", "month");
    expect(t).not.toBeNull();
    expect(isShortSpan("month", t!.spanDays)).toBe(false);
  });

  it("stays honest-or-silent below 6 measurable points", () => {
    ATTEMPTS = [
      attempt({ id: "t1", timestamp: NOW - 5 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "t2", timestamp: NOW - 4 * DAY, marksScored: 1, marksAvailable: 4 }),
      attempt({ id: "t3", timestamp: NOW - 3 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "t4", timestamp: NOW - 2 * DAY, marksScored: 3, marksAvailable: 4 }),
      attempt({ id: "t5", timestamp: NOW - 1 * DAY, marksScored: 3, marksAvailable: 4 }),
    ];
    expect(getSubjectProgress("maths", "month")).toBeNull();
  });
});

describe("PR-B-v2 — getTopicTrendFromCloud (Topic Hub cross-device read + running-accuracy points)", () => {
  it("returns the before→now trend AND real per-answer points from the CLOUD stream (device-local empty)", async () => {
    ATTEMPTS = []; // device-local mirror empty — proves the cloud read
    CLOUD_ATTEMPTS = seedSixAttempts("real-numbers");
    const t = await getTopicTrendFromCloud("real-numbers", "4mo", "u1", NOW);
    expect(t.trend).not.toBeNull();
    expect(t.trend!).toMatchObject({ before: 25, now: 100 });
    expect(t.points).toHaveLength(6);
    expect(t.points[0].pct).toBe(25); // oldest first — real scores, never a fitted line
    expect(t.points[5].pct).toBe(100);
  });

  it("shows honest points (no trend) from as few as 2 graded answers", async () => {
    CLOUD_ATTEMPTS = seedSixAttempts("real-numbers").slice(4); // just 2 recent answers
    const t = await getTopicTrendFromCloud("real-numbers", "4mo", "u1", NOW);
    expect(t.trend).toBeNull(); // the delta stays honest-or-silent
    expect(t.points).toHaveLength(2); // but the student SEES their real recent scores
  });

  it("matches the Topic Hub's aliasMap spelling (key-mismatch regression, cloud path)", async () => {
    CLOUD_ATTEMPTS = seedSixAttempts("heredity");
    const t = await getTopicTrendFromCloud("heredity-and-evolution", "4mo", "u1", NOW);
    expect(t.trend).not.toBeNull();
  });

  it("caps the points and keeps them oldest→newest", async () => {
    CLOUD_ATTEMPTS = Array.from({ length: 15 }, (_, i) =>
      cloudAttempt({ id: `p${i}`, topicKey: "real-numbers", timestamp: NOW - (15 - i) * DAY, marksScored: 2, marksAvailable: 4 }),
    );
    const t = await getTopicTrendFromCloud("real-numbers", "4mo", "u1", NOW);
    expect(t.points).toHaveLength(12);
    for (let i = 1; i < t.points.length; i++) {
      expect(t.points[i].ts).toBeGreaterThanOrEqual(t.points[i - 1].ts);
    }
  });

  it("returns an honest empty for a signed-out read (never a fake curve)", async () => {
    ACTIVE_UID = null;
    CLOUD_ATTEMPTS = seedSixAttempts("real-numbers");
    const t = await getTopicTrendFromCloud("real-numbers", "4mo", null, NOW);
    expect(t.trend).toBeNull();
    expect(t.points).toEqual([]);
  });
});
