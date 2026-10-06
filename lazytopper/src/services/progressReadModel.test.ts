// @vitest-environment node
/**
 * ME-ENGINE-1 PR-1 — the ONE shared read model (services/progressReadModel).
 *
 * The CLOUD streams are mocked at their read functions (attempts, session records + payloads,
 * the mistake history); everything above them — `getWindowedProgress`, the window maths, the
 * canonicaliser, the mistake view — is REAL.
 *
 * Mutations this file turns RED:
 *   M2 — `today` computed on the UTC calendar day instead of the IST one;
 *   M4 — "tests taken" counting a pending-upload / partial record.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PracticeAttempt } from "./practiceInsights";
import type { SessionRecord } from "./sessionRecords";
import type { MistakeLogEntry } from "./mistakeLogService";

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  records: [] as SessionRecord[],
  mistakes: [] as MistakeLogEntry[],
  cloudReads: 0,
}));

vi.mock("./practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) => {
    H.cloudReads += 1;
    return H.attempts.filter((a) => start === undefined || a.timestamp >= start);
  },
}));
vi.mock("./sessionRecords", () => ({
  loadLocalSessionRecords: () => [],
  getSessionRecordsFromCloud: async () => H.records,
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return {
    ...actual,
    getMistakeLogs: async () => [],
    // Mirrors the real union: logged since start, OR resolved since start.
    getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
      entries: H.mistakes.filter(
        (e) => Date.parse(e.timestamp) >= startMs || (e.resolvedAt ? Date.parse(e.resolvedAt) >= startMs : false),
      ),
      complete: true,
    }),
  };
});
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => "someone-else" }));
vi.mock("./progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import {
  READ_WINDOWS,
  boardChapterKey,
  buildMistakeView,
  isLegacyMistakeEntry,
  mistakeSubjectOf,
  readStudyModel,
} from "./progressReadModel";
import { istDayStartMs, windowRange } from "./progressStore";

const UID = "u-rm";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (s: string) => Date.parse(s);

function attempt(ts: number, over: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: `a-${ts}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: ts,
    subject: "maths",
    topicKey: "real-numbers",
    topicName: "Real Numbers",
    questionId: "",
    marksScored: 1,
    marksAvailable: 2,
    mode: "graded",
    ...over,
  } as unknown as PracticeAttempt;
}
function record(gradedAt: number, over: Partial<SessionRecord>): SessionRecord {
  return {
    id: `r-${gradedAt}-${Math.random().toString(36).slice(2, 6)}`,
    worksheetId: `w-${gradedAt}`,
    surface: "worksheet",
    subject: "maths",
    status: "graded",
    gradedAt,
    questionIds: [],
    topicKeys: [],
    perQuestionRef: "",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    ...over,
  } as unknown as SessionRecord;
}
function mistake(id: string, ts: number, over: Partial<MistakeLogEntry> = {}): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(ts).toISOString(),
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

beforeEach(() => {
  H.attempts = [];
  H.records = [];
  H.mistakes = [];
  H.cloudReads = 0;
});

/* ── today = the IST calendar day (M2) ─────────────────────────────────────── */
describe("today is the calendar day in IST (Asia/Kolkata, UTC+05:30)", () => {
  it("istDayStartMs lands on the IST midnight", () => {
    // 19:00Z on 6 Oct is 00:30 IST on 7 Oct → the day began at 18:30Z on 6 Oct.
    expect(istDayStartMs(at("2026-10-06T19:00:00Z"))).toBe(at("2026-10-06T18:30:00Z"));
    // 18:00Z on 6 Oct is 23:30 IST on 6 Oct → the day began at 18:30Z on 5 Oct.
    expect(istDayStartMs(at("2026-10-06T18:00:00Z"))).toBe(at("2026-10-05T18:30:00Z"));
  });

  it("★ just AFTER IST midnight (still the previous UTC day's evening): only answers since 00:00 IST count", async () => {
    const NOW = at("2026-10-06T19:00:00Z"); // 00:30 IST, 7 Oct
    H.attempts = [
      attempt(at("2026-10-06T18:45:00Z")), // 00:15 IST 7 Oct — today
      attempt(at("2026-10-06T18:00:00Z")), // 23:30 IST 6 Oct — yesterday (but the SAME UTC day)
      attempt(at("2026-10-06T10:00:00Z")), // 15:30 IST 6 Oct — yesterday (the same UTC day)
    ];
    const m = await readStudyModel(UID, { window: "today", nowMs: NOW });
    expect(m.range.start).toBe(at("2026-10-06T18:30:00Z"));
    expect(m.progress.totals?.answers).toBe(1);
    expect(m.progress.activity.gradedAnswers).toBe(1);
  });

  it("★ just BEFORE IST midnight: answers from the previous UTC day's evening are TODAY in IST", async () => {
    const NOW = at("2026-10-06T18:00:00Z"); // 23:30 IST, 6 Oct
    H.attempts = [
      attempt(at("2026-10-05T19:00:00Z")), // 00:30 IST 6 Oct — today (a DIFFERENT UTC day)
      attempt(at("2026-10-05T18:00:00Z")), // 23:30 IST 5 Oct — yesterday
    ];
    const m = await readStudyModel(UID, { window: "today", nowMs: NOW });
    expect(m.progress.totals?.answers).toBe(1);
  });

  it("a mistake logged yesterday-in-IST is not today's, one logged after 00:00 IST is", async () => {
    const NOW = at("2026-10-06T19:00:00Z");
    H.mistakes = [
      mistake("quick-practice::S1::b1", at("2026-10-06T18:40:00Z")),
      mistake("quick-practice::S2::b2", at("2026-10-06T18:20:00Z")),
    ];
    const m = await readStudyModel(UID, { window: "today", nowMs: NOW });
    expect(m.mistakes.entries.map((e) => e.id)).toEqual(["quick-practice::S1::b1"]);
  });

  it("the rolling windows are 7 / 14 / 30 / 120 days back from now", () => {
    const NOW = at("2026-10-06T12:00:00Z");
    expect(READ_WINDOWS).toEqual(["today", "week", "2wk", "month", "4mo"]);
    expect(windowRange("week", NOW).start).toBe(NOW - 7 * DAY);
    expect(windowRange("2wk", NOW).start).toBe(NOW - 14 * DAY);
    expect(windowRange("month", NOW).start).toBe(NOW - 30 * DAY);
    expect(windowRange("4mo", NOW).start).toBe(NOW - 120 * DAY);
  });
});

/* ── tests taken = GRADED only (G10, M4) ───────────────────────────────────── */
describe("G10 — a test counts as taken only once it is graded", () => {
  it("★ pending-upload and partial records are not tests taken", async () => {
    const NOW = at("2026-10-06T12:00:00Z");
    H.records = [
      record(NOW - DAY, { surface: "worksheet", status: "graded" }),
      record(NOW - DAY, { surface: "worksheet", status: "pending-upload" }),
      record(NOW - DAY, { surface: "chapter-test", status: "partial" }),
      record(NOW - DAY, { surface: "full-mock", status: "graded" }),
    ];
    const m = await readStudyModel(UID, { window: "week", nowMs: NOW });
    expect(m.progress.activity).toMatchObject({ worksheets: 1, chapterTests: 0, fullMocks: 1 });
  });
});

/* ── the ungated total beside the gated trend (G4) ─────────────────────────── */
describe("G4 — an ungated window total sits beside the gated trend", () => {
  it("2 answers: the trend is silent (gate unchanged), the total is there WITH its n", async () => {
    const NOW = at("2026-10-06T12:00:00Z");
    H.attempts = [attempt(NOW - DAY, { marksScored: 1, marksAvailable: 3 }), attempt(NOW - 2 * DAY, { marksScored: 2, marksAvailable: 2 })];
    const m = await readStudyModel(UID, { window: "week", subject: "maths", nowMs: NOW });
    expect(m.progress.subjects).toEqual([]); // < 3 points per half → silent, as before
    expect(m.progress.totals).toEqual({ marksScored: 3, marksAvailable: 5, marksLost: 2, marksNotAttempted: 0, answers: 2 });
  });

  it("CONTROL — once the gate passes, the gated subject rung and the ungated total are the SAME marks", async () => {
    const NOW = at("2026-10-06T12:00:00Z");
    H.attempts = [1, 2, 3, 4, 5, 6, 7].map((d) => attempt(NOW - d * HOUR, { marksScored: d % 3, marksAvailable: 3 }));
    const m = await readStudyModel(UID, { window: "week", nowMs: NOW });
    const rung = m.progress.subjects.find((r) => r.key === "maths");
    expect(rung).toBeTruthy();
    expect(rung?.marksAvailable).toBe(m.progress.subjectTotals.maths?.marksAvailable);
    expect(rung?.marksScored).toBe(m.progress.subjectTotals.maths?.marksScored);
  });
});

/* ── the mistake view: live, resolved, won back, legacy ────────────────────── */
describe("G7 — mistakes are resolved, never deleted; won back is counted per window", () => {
  const NOW = at("2026-10-06T12:00:00Z");
  beforeEach(() => {
    H.mistakes = [
      mistake("quick-practice::LIVE::b1", NOW - 2 * DAY, { marksLost: 2 }),
      mistake("quick-practice::REGRADE::b2", NOW - 3 * DAY, { marksLost: 1, resolvedAt: new Date(NOW - DAY).toISOString(), resolvedBy: "re-grade" }),
      mistake("quick-practice::NA::b3", NOW - 3 * DAY, { marksLost: 3, resolvedAt: new Date(NOW - DAY).toISOString(), resolvedBy: "re-grade-not-attempted" }),
      mistake("quick-practice::LATER::b4", NOW - 4 * DAY, { marksLost: 1.5, resolvedAt: new Date(NOW - HOUR).toISOString(), resolvedBy: "later-correct-attempt" }),
      // made 40 days ago, won back today
      mistake("quick-practice::OLD::b5", NOW - 40 * DAY, { marksLost: 4, resolvedAt: new Date(NOW - HOUR).toISOString(), resolvedBy: "later-correct-attempt" }),
    ];
  });

  it("★ live = logged in the window and not replaced by a re-grade; a later-won-back mistake still counts where it happened", async () => {
    const m = await readStudyModel(UID, { window: "week", nowMs: NOW });
    expect(m.mistakes.entries.map((e) => e.id)).toEqual(["quick-practice::LIVE::b1", "quick-practice::LATER::b4"]);
    expect(m.mistakes.marksLost).toBe(3.5);
  });

  it("★ marks won back per window — by re-grade and by a later attempt, never a not-attempted re-grade", async () => {
    const week = await readStudyModel(UID, { window: "week", nowMs: NOW });
    expect(week.mistakes.wonBack).toEqual({
      count: 3,
      marks: 6.5,
      byRegrade: { count: 1, marks: 1 },
      byLaterAttempt: { count: 2, marks: 5.5 },
    });
    // TODAY (IST day of 12:00Z = 17:30 IST): only the two resolved an hour ago.
    const today = await readStudyModel(UID, { window: "today", nowMs: NOW });
    expect(today.mistakes.wonBack).toMatchObject({ count: 2, marks: 5.5 });
  });

  it("★ a LEGACY count-only entry is read exactly as stored and labelled legacy", async () => {
    const legacy = mistake("1727000000000-abc123", NOW - DAY);
    H.mistakes = [legacy];
    const snapshot = JSON.parse(JSON.stringify(legacy));
    const m = await readStudyModel(UID, { window: "week", nowMs: NOW });
    expect(m.mistakes.legacyCount).toBe(1);
    expect(isLegacyMistakeEntry(m.mistakes.entries[0])).toBe(true);
    expect(m.mistakes.entries[0]).toEqual(snapshot);
    expect(m.mistakes.byGroup).toMatchObject({ knowledge: 2, legacyEntries: 1, v2Entries: 0, notAttempted: 0, untyped: 0 });
  });
});

/* ── one subject split, one topic key set ──────────────────────────────────── */
describe("one subject split, one canonicaliser (the 26 board chapters)", () => {
  it("a mistake's free-text subject maps to ONE paper; an unknown one is in no paper", () => {
    expect(mistakeSubjectOf("Mathematics")).toBe("maths");
    expect(mistakeSubjectOf("maths")).toBe("maths");
    expect(mistakeSubjectOf("Science")).toBe("science");
    expect(mistakeSubjectOf("")).toBeNull();
    const end = Date.now();
    const v = buildMistakeView(
      [mistake("a", end - 1, { subject: "Mathematics" }), mistake("b", end - 1, { subject: "" })],
      { start: end - DAY, end, subject: "maths" },
      true,
    );
    expect(v.entries.map((e) => e.id)).toEqual(["a"]);
  });

  it("boardChapterKey resolves every spelling to one of the 26 keys, or ''", () => {
    expect(boardChapterKey("Heredity and Evolution")).toBe("heredity");
    expect(boardChapterKey("heredity-and-evolution")).toBe("heredity");
    expect(boardChapterKey("How do Organisms Reproduce?")).toBe("how-do-organisms-reproduce");
    expect(boardChapterKey("reproduction")).toBe("how-do-organisms-reproduce");
    expect(boardChapterKey("Pair of Linear Equations in Two Variables")).toBe("pair-of-linear-equations");
    expect(boardChapterKey("Sources of Energy")).toBe(""); // not a 2026-27 board chapter
    expect(boardChapterKey("")).toBe("");
  });

  it("mistakes group into board-chapter buckets only", async () => {
    const NOW = at("2026-10-06T12:00:00Z");
    H.mistakes = [
      mistake("x1", NOW - DAY, { topic: "Heredity and Evolution", subject: "Science" }),
      mistake("x2", NOW - DAY, { topic: "Sources of Energy", subject: "Science" }),
    ];
    const m = await readStudyModel(UID, { window: "week", subject: "science", nowMs: NOW });
    expect(Object.keys(m.mistakes.byChapter)).toEqual(["heredity"]);
    expect(m.mistakes.entries).toHaveLength(2); // still a Science mistake — just no chapter
  });

  it("a chapter outside the 26 scopes to NOTHING — it never widens into an unscoped read", async () => {
    const NOW = at("2026-10-06T12:00:00Z");
    H.attempts = [attempt(NOW - DAY)];
    const m = await readStudyModel(UID, { window: "week", topicKey: "sources-of-energy", nowMs: NOW });
    expect(m.progress.totals).toBeNull();
    expect(m.mistakes.entries).toEqual([]);
    expect(H.cloudReads).toBe(0);
  });

  it("no uid is never 'the active user': nothing is read", async () => {
    H.attempts = [attempt(Date.now() - DAY)];
    const m = await readStudyModel(null, { window: "week" });
    expect(H.cloudReads).toBe(0);
    expect(m.progress.totals).toBeNull();
  });
});
