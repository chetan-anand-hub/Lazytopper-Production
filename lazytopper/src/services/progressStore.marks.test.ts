// @vitest-environment node
//
// MARKS-1 — the raw marks that `marksPercentOf` already computed and discarded, now
// carried through marksPercentOf → SplitTrend → RungTrend → ProgressTrend.
//
// WHY THIS SUITE EXISTS: the Me/Progress v7 page is denominated in MARKS, not
// percentages ("there are N marks on the table", "51 secured", "7 of 12 lost"). A
// percentage cannot be turned back into marks — 50% is 6/12 or 40/80 — so the two
// raw totals have to survive the aggregation instead of being thrown away at the
// ratio.
//
// THE HAZARD THIS SUITE IS BUILT AROUND: `sample` (a COUNT OF QUESTIONS) and the
// marks totals are different units that both look like "a number that goes up with
// more work". One 5-mark question is ONE point and FIVE marks. Every fixture below
// deliberately keeps the two far apart in value so that conflating them cannot pass
// — see the CONTROL block.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SessionRecord, SessionPerQuestionPayload } from "./sessionRecords";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { BankConcept } from "./progressBankIndex";

let RECORDS: SessionRecord[] = [];
let ATTEMPTS: PracticeAttempt[] = [];
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

import { getWindowedProgress, getTopicTrendFromCloud, getSubjectProgress } from "./progressStore";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-04T12:00:00.000Z").getTime();

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

function payload(
  ref: string,
  results: Array<{ qNumber: number; couldNotRead?: boolean; totalMarks: number; marksAwarded?: number }>,
): SessionPerQuestionPayload {
  return {
    ref,
    code: ref,
    worksheetId: "ws-x",
    surface: "worksheet",
    gradedAt: NOW,
    response: { results } as unknown as SessionPerQuestionPayload["response"],
  };
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
afterEach(() => {
  vi.useRealTimers();
});

/**
 * SIX measurable attempts on one subject/topic, split 3/3 at the activity median.
 * The mark values are chosen so NO total coincides with a point count:
 *   before half → 1/4, 2/4, 3/4   =  6 scored of 12 available, 3 points, pct 50
 *   now half    → 4/5, 4/5, 5/5   = 13 scored of 15 available, 3 points, pct 86.7
 *   whole       →                    19 scored of 27 available, 6 points
 * 3 ≠ 12, 3 ≠ 15, 3 ≠ 13, 3 ≠ 6 — so a suite that confused points with marks
 * cannot go green on these numbers.
 */
function seedSixAttempts(): void {
  CLOUD_ATTEMPTS = [
    attempt({ id: "a1", questionId: "b1", marksScored: 1, marksAvailable: 4, timestamp: NOW - 20 * DAY }),
    attempt({ id: "a2", questionId: "b2", marksScored: 2, marksAvailable: 4, timestamp: NOW - 18 * DAY }),
    attempt({ id: "a3", questionId: "b3", marksScored: 3, marksAvailable: 4, timestamp: NOW - 16 * DAY }),
    attempt({ id: "a4", questionId: "b4", marksScored: 4, marksAvailable: 5, timestamp: NOW - 6 * DAY }),
    attempt({ id: "a5", questionId: "b5", marksScored: 4, marksAvailable: 5, timestamp: NOW - 4 * DAY }),
    attempt({ id: "a6", questionId: "b6", marksScored: 5, marksAvailable: 5, timestamp: NOW - 2 * DAY }),
  ];
}

describe("MARKS-1 — raw marks reach the rungs", () => {
  it("a subject rung carries the marks its attempts actually scored", async () => {
    seedSixAttempts();
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);

    expect(wp.subjects).toHaveLength(1);
    const maths = wp.subjects[0];
    expect(maths.key).toBe("maths");

    // Whole-window totals — the "N marks on the table" / "N secured" numbers.
    expect(maths.marksScored).toBe(19);
    expect(maths.marksAvailable).toBe(27);
    // Per-half, mirroring sampleBefore/sampleNow.
    expect(maths.marksScoredBefore).toBe(6);
    expect(maths.marksAvailableBefore).toBe(12);
    expect(maths.marksScoredNow).toBe(13);
    expect(maths.marksAvailableNow).toBe(15);
  });

  it("the whole-window totals are exactly the two halves summed (no double count, no dropped half)", async () => {
    seedSixAttempts();
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    const t = wp.subjects[0];

    expect(t.marksScored).toBe((t.marksScoredBefore ?? 0) + (t.marksScoredNow ?? 0));
    expect(t.marksAvailable).toBe((t.marksAvailableBefore ?? 0) + (t.marksAvailableNow ?? 0));
    // …and they agree with the percentage that was already being reported: the
    // percentage is the ratio OF these two numbers, so this pins them to the
    // pre-existing, independently-derived `now` value.
    expect(Math.round(((t.marksScoredNow ?? 0) / (t.marksAvailableNow ?? 1)) * 1000) / 10).toBe(t.now);
    expect(Math.round(((t.marksScoredBefore ?? 0) / (t.marksAvailableBefore ?? 1)) * 1000) / 10).toBe(t.before);
  });

  it("marks reach the topic AND concept rungs, matching the payload marks a session recorded", async () => {
    // Bank-matched questions so the concept rung resolves. This is the "7 of 12
    // lost" per-concept figure the v7 page renders.
    BANK = {
      k1: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
      k2: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
      k3: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
      k4: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
      k5: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
      k6: { subtopic: "Euclid's division lemma", section: "B", topicKey: "real-numbers" },
    };
    CLOUD_ATTEMPTS = [
      attempt({ id: "a1", questionId: "k1", marksScored: 0, marksAvailable: 2, timestamp: NOW - 20 * DAY }),
      attempt({ id: "a2", questionId: "k2", marksScored: 1, marksAvailable: 2, timestamp: NOW - 18 * DAY }),
      attempt({ id: "a3", questionId: "k3", marksScored: 1, marksAvailable: 2, timestamp: NOW - 16 * DAY }),
      attempt({ id: "a4", questionId: "k4", marksScored: 2, marksAvailable: 2, timestamp: NOW - 6 * DAY }),
      attempt({ id: "a5", questionId: "k5", marksScored: 2, marksAvailable: 2, timestamp: NOW - 4 * DAY }),
      attempt({ id: "a6", questionId: "k6", marksScored: 1, marksAvailable: 2, timestamp: NOW - 2 * DAY }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);

    const topic = wp.topics.find((t) => t.key === "real-numbers");
    expect(topic).toBeDefined();
    expect(topic!.marksScored).toBe(7);
    expect(topic!.marksAvailable).toBe(12); // → "7 of 12" — 5 marks lost

    const concept = wp.concepts.find((c) => c.key === "Euclid's division lemma");
    expect(concept).toBeDefined();
    expect(concept!.marksScored).toBe(7);
    expect(concept!.marksAvailable).toBe(12);

    const section = wp.sections.find((s) => s.key === "B");
    expect(section).toBeDefined();
    expect(section!.marksScored).toBe(7);
    expect(section!.marksAvailable).toBe(12);
  });

  it("the ProgressTrend end of the chain carries marks too (cloud topic read + sync subject read)", async () => {
    seedSixAttempts();
    const cloud = await getTopicTrendFromCloud("real-numbers", "month", "u1", NOW);
    expect(cloud.trend).not.toBeNull();
    expect(cloud.trend!.marksScored).toBe(19);
    expect(cloud.trend!.marksAvailable).toBe(27);

    // The device-local sync fast-path reads the OTHER stream (getAttempts).
    ATTEMPTS = CLOUD_ATTEMPTS;
    const sync = getSubjectProgress("maths", "month", "u1");
    expect(sync).not.toBeNull();
    expect(sync!.marksScored).toBe(19);
    expect(sync!.marksAvailable).toBe(27);
  });
});

describe("MARKS-1 CONTROL — `sample` is POINTS, and adding marks did not turn it into marks", () => {
  // This is the control the whole lane hangs on. `sampleBefore`/`sampleNow` are
  // counts of measurable QUESTIONS. If a future change (or a mutation) makes
  // marksPercentOf return marks as `sample`, these assertions must fail — the
  // fixtures above guarantee the two units never share a value.
  it("sampleBefore/sampleNow stay question counts, not mark totals", async () => {
    seedSixAttempts();
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    const t = wp.subjects[0];

    expect(t.sampleBefore).toBe(3);
    expect(t.sampleNow).toBe(3);

    // Stated as an inequality as well as a value, so the failure message says WHY:
    // these are different units and must never coincide on this fixture.
    expect(t.sampleNow).not.toBe(t.marksAvailableNow); // 3 vs 15
    expect(t.sampleNow).not.toBe(t.marksScoredNow); //    3 vs 13
    expect(t.sampleBefore).not.toBe(t.marksAvailableBefore); // 3 vs 12
    expect(t.sampleBefore).not.toBe(t.marksScoredBefore); //    3 vs 6
  });

  it("no pre-existing field moved: before/now/delta/spanDays are what they were", async () => {
    seedSixAttempts();
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    const t = wp.subjects[0];

    expect(t.before).toBe(50); //   6/12
    expect(t.now).toBe(86.7); //   13/15
    expect(t.delta).toBe(36.7);
    expect(t.spanDays).toBe(18); // NOW-20d → NOW-2d
    expect(t.key).toBe("maths");
    expect(t.label).toBe("Maths");
  });

  it("the mistake-type rung OMITS the marks fields — it has no marks denominator", async () => {
    // A composition share (%) of typed mistakes is not a score. Absent is the
    // honest value; a 0 here would render as an invented "0 of 0 marks".
    CLOUD_RECORDS = [
      rec({ id: "R1", gradedAt: NOW - 20 * DAY, fourType: { conceptual: 2, calculation: 0, silly: 1, presentation: 0 } }),
      rec({ id: "R2", gradedAt: NOW - 18 * DAY, fourType: { conceptual: 2, calculation: 0, silly: 1, presentation: 0 } }),
      rec({ id: "R3", gradedAt: NOW - 16 * DAY, fourType: { conceptual: 2, calculation: 0, silly: 1, presentation: 0 } }),
      rec({ id: "R4", gradedAt: NOW - 6 * DAY, fourType: { conceptual: 0, calculation: 1, silly: 3, presentation: 0 } }),
      rec({ id: "R5", gradedAt: NOW - 4 * DAY, fourType: { conceptual: 0, calculation: 1, silly: 3, presentation: 0 } }),
      rec({ id: "R6", gradedAt: NOW - 2 * DAY, fourType: { conceptual: 0, calculation: 1, silly: 3, presentation: 0 } }),
    ];
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);

    expect(wp.mistakeTypes.length).toBeGreaterThan(0); // the rung really is present
    for (const row of wp.mistakeTypes) {
      expect(row.marksScored).toBeUndefined();
      expect(row.marksAvailable).toBeUndefined();
      expect(row.marksScoredBefore).toBeUndefined();
      expect(row.marksAvailableNow).toBeUndefined();
    }
    // CONTROL for the control: a marks rung in the SAME read does carry them, so
    // "undefined everywhere" cannot be what this assertion is really measuring.
    seedSixAttempts();
    const wp2 = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp2.subjects[0].marksAvailable).toBe(27);
  });
});

describe("MARKS-1 — honest empties (no invented zeros)", () => {
  it("an empty window returns no rungs at all — not rungs reading 0 marks", async () => {
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toEqual([]);
    expect(wp.topics).toEqual([]);
    expect(wp.concepts).toEqual([]);
    expect(wp.sections).toEqual([]);
    expect(wp.mistakeTypes).toEqual([]);
    expect(wp.activitySpanDays).toBeNull();
  });

  it("a window too thin for a trend stays SILENT rather than reporting a marks total", async () => {
    // FIVE measurable points — one short of MIN_HALF_SAMPLE*2. Real marks exist,
    // but the rung is still omitted: partial marks are not a trend.
    seedSixAttempts();
    CLOUD_ATTEMPTS = CLOUD_ATTEMPTS.slice(0, 5);
    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toEqual([]);
    expect(wp.topics).toEqual([]);
    // CONTROL: the sixth point is all that separates silence from a rung — so the
    // emptiness above is the thinness rule firing, not a broken fixture.
    seedSixAttempts();
    const wp2 = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp2.subjects).toHaveLength(1);
    expect(wp2.subjects[0].marksAvailable).toBe(27);
  });

  it("signed out → honest empty, never a fabricated marks curve", async () => {
    seedSixAttempts();
    ACTIVE_UID = null;
    const wp = await getWindowedProgress(null, "month", undefined, NOW);
    expect(wp.subjects).toEqual([]);
    expect(wp.mistakeLog).toEqual({ loggedInWindow: 0 });
  });
});

describe("MARKS-1 — reads data written BEFORE this change (old shape, not clean state)", () => {
  // This lane adds fields to a COMPUTED return type; it changes no persisted shape.
  // The migration risk is therefore entirely on the READ side: history that was
  // written by older code must still produce correct marks. A clean-state test
  // would not see this path at all.
  it("record-only history that predates the durable attempts subcollection still yields marks", async () => {
    // Sessions written before #403: a SessionRecord + its per-question payload, with
    // NO attempts stream behind them. The union path has to reconstruct the marks
    // from `payload.results[].marksAwarded / .totalMarks`.
    CLOUD_ATTEMPTS = [];
    CLOUD_RECORDS = [
      rec({
        id: "OLD-WS-1",
        worksheetId: "ws-old-1",
        perQuestionRef: "ws:OLD-WS-1",
        gradedAt: NOW - 20 * DAY,
        questionIds: ["k1", "k2", "k3"],
      }),
      rec({
        id: "OLD-WS-2",
        worksheetId: "ws-old-2",
        perQuestionRef: "ws:OLD-WS-2",
        gradedAt: NOW - 4 * DAY,
        questionIds: ["k4", "k5", "k6"],
      }),
    ];
    PAYLOADS = [
      payload("ws:OLD-WS-1", [
        { qNumber: 1, totalMarks: 4, marksAwarded: 1 },
        { qNumber: 2, totalMarks: 4, marksAwarded: 2 },
        { qNumber: 3, totalMarks: 4, marksAwarded: 3 },
      ]),
      payload("ws:OLD-WS-2", [
        { qNumber: 1, totalMarks: 5, marksAwarded: 4 },
        { qNumber: 2, totalMarks: 5, marksAwarded: 4 },
        { qNumber: 3, totalMarks: 5, marksAwarded: 5 },
      ]),
    ];

    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0].marksScored).toBe(19); // 1+2+3 + 4+4+5
    expect(wp.subjects[0].marksAvailable).toBe(27); // 4*3 + 5*3
    expect(wp.subjects[0].sampleNow).toBe(3); // still POINTS, on the legacy path too
  });

  it("an attempt stored without the newer optional fields still contributes its marks", async () => {
    // A pre-change PracticeAttempt: no topicKey (only the older topicName), no
    // questionId. It must still reach the SUBJECT rung with its marks intact, and
    // stay honestly silent on the topic rung.
    const legacy = (over: Partial<PracticeAttempt>): PracticeAttempt =>
      ({
        id: over.id,
        subject: "maths",
        correct: true,
        marksScored: over.marksScored,
        marksAvailable: over.marksAvailable,
        timestamp: over.timestamp,
      }) as unknown as PracticeAttempt;

    CLOUD_ATTEMPTS = [
      legacy({ id: "o1", marksScored: 1, marksAvailable: 4, timestamp: NOW - 20 * DAY }),
      legacy({ id: "o2", marksScored: 2, marksAvailable: 4, timestamp: NOW - 18 * DAY }),
      legacy({ id: "o3", marksScored: 3, marksAvailable: 4, timestamp: NOW - 16 * DAY }),
      legacy({ id: "o4", marksScored: 4, marksAvailable: 5, timestamp: NOW - 6 * DAY }),
      legacy({ id: "o5", marksScored: 4, marksAvailable: 5, timestamp: NOW - 4 * DAY }),
      legacy({ id: "o6", marksScored: 5, marksAvailable: 5, timestamp: NOW - 2 * DAY }),
    ];

    const wp = await getWindowedProgress("u1", "month", undefined, NOW);
    expect(wp.subjects).toHaveLength(1);
    expect(wp.subjects[0].marksScored).toBe(19);
    expect(wp.subjects[0].marksAvailable).toBe(27);
    expect(wp.subjects[0].before).toBe(50); // pre-existing field, unmoved
    expect(wp.topics).toEqual([]); // no resolvable topic → honestly silent
  });
});
