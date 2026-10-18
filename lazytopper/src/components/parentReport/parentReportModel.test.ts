// @vitest-environment node
/**
 * PARENT-REPORT-1 — every number on the parent report card comes from the shared read model.
 *
 * The fixtures go through the REAL `readStudyModel` (window `istWeek`) with only the Firestore
 * readers stubbed — the same seam the read model's own pins use — so a figure on the card is
 * the read model's figure, never a parallel aggregation. Pinned here:
 *   - the honest states: < 3 answers → empty (no figure); below Me's gate / incomplete history /
 *     an over-attributing log → activity (nothing named); above it → pattern;
 *   - the pattern figures: rows sum to the marks lost; chapters and next steps from real entries;
 *   - won back counts ONLY a later correct attempt;
 *   - IST week boundaries (IST midnights, incl. the IST-midnight rollover);
 *   - privacy: no question text, id, email or name unless chosen.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PracticeAttempt } from "../../services/practiceInsights";
import type { MistakeLogEntry, MistakeResolution } from "../../services/mistakeLogService";

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  mistakes: [] as MistakeLogEntry[],
  complete: true,
}));
vi.mock("../../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("../../services/sessionRecords", () => ({
  loadLocalSessionRecords: () => [],
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter(
      (e) => Date.parse(e.timestamp) >= startMs || (e.resolvedAt ? Date.parse(e.resolvedAt) >= startMs : false),
    ),
    complete: H.complete,
  }),
}));
vi.mock("../../services/studentProgressStore", () => ({ getActiveProgressUser: () => null }));
vi.mock("../../services/progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import { readStudyModel } from "../../services/progressReadModel";
import { windowRange } from "../../services/progressStore";
import { coachingLine, zeroMarksLost } from "../../lib/mistakeDisplay";
import {
  MIN_ANSWERS_FOR_REPORT,
  PARENT_REPORT_LINK,
  buildParentReport,
  firstNameOf,
  istWeekLabel,
  parentReportShareText,
} from "./parentReportModel";

/** Sunday 18 Oct 2026, 17:30 IST. The IST week is Mon 12 Oct 00:00 IST → now. */
const NOW = Date.parse("2026-10-18T12:00:00Z");
const WEEK_START = Date.parse("2026-10-11T18:30:00Z"); // 12 Oct 00:00 IST
const HOUR = 3600 * 1000;
const UID = "u-parent-report";
const SECRET = "SECRET-QUESTION-TEXT";

function attempt(i: number, hoursAgo: number, subject = "maths", scored = i % 3): PracticeAttempt {
  return {
    id: `a-${subject}-${i}`,
    timestamp: NOW - hoursAgo * HOUR,
    subject,
    topicKey: subject === "maths" ? "real-numbers" : "chemical-reactions-and-equations",
    topicName: subject === "maths" ? "Real Numbers" : "Chemical Reactions and Equations",
    questionId: `q-${subject}-${i}`,
    marksScored: scored,
    marksAvailable: 3,
    mode: "graded",
  } as unknown as PracticeAttempt;
}

/** A v2 mistake entry (marks by type, versioned), `hoursAgo` before NOW. */
function mistake(
  id: string,
  hoursAgo: number,
  topic: string,
  byType: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation", number>>,
  extra: Partial<MistakeLogEntry> = {},
): MistakeLogEntry {
  const m = { ...zeroMarksLost(), ...byType };
  const lost = m.conceptual + m.calculation + m.silly + m.presentation;
  return {
    id,
    timestamp: new Date(NOW - hoursAgo * HOUR).toISOString(),
    questionText: SECRET,
    questionId: `q-${id}`,
    topic,
    subject: "Maths",
    totalMarks: 3,
    marksLost: lost,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    marksLostByType: m,
    marksLostByTypeVersion: 1,
    ...extra,
  } as MistakeLogEntry;
}

/** Eight graded Maths answers this IST week: scored 0,1,2,0,1,2,0,1 of 3 → 7/24, 17 marks lost. */
const EIGHT = [1, 3, 5, 8, 13, 21, 30, 40].map((h, i) => attempt(i, h));
const ENTRIES = [
  mistake("m1", 5, "Real Numbers", { conceptual: 2 }),
  mistake("m2", 8, "Polynomials", { calculation: 1, silly: 1 }),
  mistake("m3", 13, "Real Numbers", { presentation: 1 }),
];

async function report(opts: { firstName?: string | null; nowMs?: number } = {}) {
  const model = await readStudyModel(UID, { window: "istWeek", tutor: false, nowMs: opts.nowMs ?? NOW });
  return { model, report: buildParentReport(model, { firstName: opts.firstName ?? null }) };
}

beforeEach(() => {
  H.attempts = [];
  H.mistakes = [];
  H.complete = true;
});

describe("PARENT-REPORT-1 · the IST week", () => {
  it("starts at the IST midnight six days before today's — not a rolling 168 hours", () => {
    expect(windowRange("istWeek", NOW)).toEqual({ start: WEEK_START, end: NOW });
    expect(NOW - WEEK_START).toBeLessThan(7 * 24 * HOUR);
  });

  it("IST-midnight rollover: 23:59 IST keeps Mon 12 Oct, 00:01 IST the next day moves to Tue 13 Oct", () => {
    const before = Date.parse("2026-10-18T18:29:00Z"); // 18 Oct 23:59 IST
    const after = Date.parse("2026-10-18T18:31:00Z"); // 19 Oct 00:01 IST
    expect(windowRange("istWeek", before).start).toBe(WEEK_START);
    expect(windowRange("istWeek", after).start).toBe(WEEK_START + 24 * HOUR);
    expect(istWeekLabel(windowRange("istWeek", before))).toBe("12 – 18 Oct 2026");
    expect(istWeekLabel(windowRange("istWeek", after))).toBe("13 – 19 Oct 2026");
  });

  it("labels across a month and a year in IST dates", () => {
    expect(istWeekLabel(windowRange("istWeek", Date.parse("2026-10-04T06:00:00Z")))).toBe("28 Sep – 4 Oct 2026");
    expect(istWeekLabel(windowRange("istWeek", Date.parse("2027-01-04T06:00:00Z")))).toBe("29 Dec 2026 – 4 Jan 2027");
  });

  it("an answer one second before the IST week is out; one at its first instant is in", async () => {
    H.attempts = [
      attempt(1, 2),
      attempt(2, 3),
      { ...attempt(3, 0), timestamp: WEEK_START } as PracticeAttempt,
      { ...attempt(4, 0), timestamp: WEEK_START - 1000 } as PracticeAttempt,
    ];
    const { report: r } = await report();
    expect(r.answersMarked).toBe(3);
  });
});

describe("PARENT-REPORT-1 · honest states", () => {
  it(`fewer than ${MIN_ANSWERS_FOR_REPORT} answers marked → the empty card: no figure anywhere`, async () => {
    H.attempts = [attempt(0, 2), attempt(1, 4)];
    H.mistakes = [mistake("m1", 2, "Real Numbers", { conceptual: 2 })];
    const { report: r } = await report();
    expect(r.state).toBe("empty");
    expect(r.marksLost).toBeNull();
    expect(r.typeRows).toEqual([]);
    expect(r.chapters).toEqual([]);
    expect(r.nextSteps).toEqual([]);
    expect(r.wonBack).toBeNull();
  });

  it("no data at all → empty (never a placeholder zero split)", async () => {
    const { report: r } = await report();
    expect(r).toMatchObject({ state: "empty", answersMarked: 0, testsTaken: 0, marksLost: null, typeRows: [] });
  });

  it("3–5 answers (below Me's gate) → activity: counts only, nothing named about why", async () => {
    H.attempts = [attempt(0, 2), attempt(1, 4), attempt(2, 6), attempt(3, 9)];
    H.mistakes = [mistake("m1", 2, "Real Numbers", { conceptual: 2 })];
    const { report: r } = await report();
    expect(r.state).toBe("activity");
    expect(r.answersMarked).toBe(4);
    expect(r.marksLost).toBeNull();
    expect(r.typeRows).toEqual([]);
    expect(r.chapters).toEqual([]);
    expect(r.nextSteps).toEqual([]);
  });

  it("an incomplete mistake history never names a pattern", async () => {
    H.attempts = EIGHT;
    H.mistakes = ENTRIES;
    H.complete = false;
    const { report: r } = await report();
    expect(r.state).toBe("activity");
    expect(r.typeRows).toEqual([]);
    expect(r.wonBack).toBeNull();
  });

  it("a log that names MORE marks than the graded stream lost → Me's split is unknown → nothing named", async () => {
    H.attempts = EIGHT; // 17 marks lost
    H.mistakes = [mistake("big", 3, "Real Numbers", { conceptual: 30 })];
    const { report: r } = await report();
    expect(r.state).toBe("activity");
    expect(r.typeRows).toEqual([]);
  });

  it("a second paper below Me's gate (both-papers rule) → nothing named", async () => {
    H.attempts = [...EIGHT, attempt(0, 2, "science"), attempt(1, 3, "science")];
    H.mistakes = ENTRIES;
    const { report: r } = await report();
    expect(r.state).toBe("activity");
    expect(r.answersMarked).toBe(10);
  });
});

describe("PARENT-REPORT-1 · the pattern card — every figure from the read model", () => {
  it("answers, marks lost, the type rows (summing to the loss), chapters and next steps", async () => {
    H.attempts = EIGHT;
    H.mistakes = ENTRIES;
    const { model, report: r } = await report();
    expect(r.state).toBe("pattern");
    expect(r.weekLabel).toBe("12 – 18 Oct 2026");
    expect(r.answersMarked).toBe(model.progress.totals?.answers);
    expect(r.answersMarked).toBe(8);
    expect(r.testsTaken).toBe(0);
    // 24 available − 7 scored.
    expect(r.marksLost).toBe(17);
    expect(r.marksLost).toBe(model.progress.totals?.marksLost);

    const rows = Object.fromEntries(r.typeRows.map((x) => [x.key, x.marks]));
    expect(rows).toEqual({ untyped: 12, conceptual: 2, calculation: 1, silly: 1, presentation: 1 });
    expect(r.typeRows.reduce((s, x) => s + x.marks, 0)).toBe(r.marksLost);
    // Most marks first; the fixed type order breaks the 1-mark tie.
    expect(r.typeRows.map((x) => x.key)).toEqual(["untyped", "conceptual", "calculation", "silly", "presentation"]);
    expect(r.typeRows.find((x) => x.key === "conceptual")?.label).toBe("Concept gap");

    expect(r.chapters.map((c) => [c.key, c.marks])).toEqual([
      ["real-numbers", 3],
      ["polynomials", 2],
    ]);
    expect(r.chapters[0].label).toMatch(/Real Numbers/);

    // The product's own coaching sentences: knowledge 2 and careless 2 tie → owner order, then technique.
    const practise = r.chapters[0].label;
    const line = (types: Partial<ReturnType<typeof zeroMarksLost>>) =>
      coachingLine({ marksAwarded: 0, marksTotal: 0, counts: null, marks: { ...zeroMarksLost(), ...types }, practiseWhat: practise });
    expect(r.nextSteps).toEqual([
      line({ conceptual: 2 }),
      line({ calculation: 1, silly: 1 }),
      line({ presentation: 1 }),
    ]);
    expect(r.nextSteps[1]).toBe("You already know this: 2 marks to gain — slow down and check each line.");
  });

  it("won back = ONLY a later correct attempt, inside the IST week; a re-grade never counts", async () => {
    H.attempts = EIGHT;
    const resolved = (id: string, by: MistakeResolution, hoursAgo: number) =>
      mistake(id, 50, "Real Numbers", { conceptual: 1 }, { resolvedAt: new Date(NOW - hoursAgo * HOUR).toISOString(), resolvedBy: by });
    H.mistakes = [
      ...ENTRIES,
      resolved("w1", "later-correct-attempt", 4),
      resolved("w2", "re-grade", 4),
      resolved("w3", "later-correct-attempt", 24 * 8), // resolved before this IST week
    ];
    const { report: r } = await report();
    expect(r.wonBack).toEqual({ count: 1, marks: 1 });
  });
});

describe("PARENT-REPORT-1 · privacy", () => {
  it("the report and the share text carry no question text, id or email — and no name unless chosen", async () => {
    H.attempts = EIGHT;
    H.mistakes = ENTRIES;
    const { report: anon } = await report();
    const blob = JSON.stringify(anon);
    expect(blob).not.toContain(SECRET);
    expect(blob).not.toContain("q-m1");
    expect(blob).not.toContain(UID);
    expect(anon.firstName).toBeNull();
    const text = parentReportShareText(anon);
    expect(text).toBe(`My weekly LazyTopper report — where marks are being lost (12 – 18 Oct 2026). ${PARENT_REPORT_LINK}`);

    const { report: named } = await report({ firstName: "Aarav Kumar" });
    expect(named.firstName).toBe("Aarav");
    expect(JSON.stringify(named)).not.toContain("Kumar");
    expect(parentReportShareText(named)).toContain("Aarav's weekly");
  });

  it("first name: letters of the first word only; an email, phone or handle is never shown", () => {
    expect(firstNameOf("  Aarav Kumar ")).toBe("Aarav");
    expect(firstNameOf("आरव शर्मा")).toBe("आरव");
    expect(firstNameOf("chetan.anand@gmail.com")).toBeNull();
    expect(firstNameOf("+919876543210")).toBeNull();
    expect(firstNameOf("student_42")).toBeNull();
    expect(firstNameOf("")).toBeNull();
    expect(firstNameOf(null)).toBeNull();
  });

  it("the link a parent opens is a public page tagged parent_share — no child data in it", () => {
    const u = new URL(PARENT_REPORT_LINK);
    expect(u.hostname).toBe("www.lazytopper.com");
    expect(u.searchParams.get("utm_source")).toBe("parent_share");
    expect([...u.searchParams.keys()].sort()).toEqual(["utm_campaign", "utm_medium", "utm_source"]);
  });
});
