/**
 * TUTOR-FIX-2 (T2) — THE CHAPTER-CORRECT TUTOR BRIEF.
 *
 * Live (Part 0.4): the tutor on Trigonometry and on Real Numbers both said "100.5 marks lost" —
 * the brief's only figure was the PAPER total — and on Real Numbers it named no concept while Me
 * listed "Fundamental Theorem of Arithmetic" (the brief's concepts came from mistake rows that need
 * a bank questionId; Me's come from the graded answers). Here, for ONE fixture student:
 *   (2) Trigonometry and Real Numbers get DIFFERENT `chapter.marksLost`, each == Me's chapter row;
 *   (3) Real Numbers: graded answers on bank questions, mistakes WITHOUT a questionId → the brief
 *       still names "Fundamental Theorem of Arithmetic" with its 6 marks (Me's open-chapter row);
 *   (4) no chapter → no chapter block and NO extra read.
 * Only the CLOUD streams are mocked; the read model, Me's derivations and the brief are REAL.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  mistakes: [] as MistakeLogEntry[],
  attemptReads: 0,
  bank: {} as Record<string, { subtopic: string; section: string; topicKey: string }>,
}));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) => {
    H.attemptReads += 1;
    return H.attempts.filter((a) => start === undefined || a.timestamp >= start);
  },
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs),
    complete: true,
  }),
}));
vi.mock("./tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tutorSessionStore")>()),
  getTutorTurnsFromCloud: async () => ({ events: [], complete: true }),
}));
vi.mock("./progressBankIndex", () => ({
  conceptForQuestionId: (id: string | null | undefined) => (id ? H.bank[String(id)] ?? null : null),
}));
// Me's page module is imported for its pure derivations only (nothing here renders it).
vi.mock("../components/subscription/UpgradeSheet", () => ({ UpgradeSheet: () => null }));
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-chapter", displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: 0 }),
}));

import { readStudyModel } from "./progressReadModel";
import { buildChapters, splitPaperMarks, viewRowsFrom } from "../pages/MeProgressPage";
import { assembleTutorBrief } from "../pages/tutor/tutorContextBrief";
import { zeroMarksLost } from "../lib/mistakeDisplay";
import { createRequire } from "node:module";

// TUTOR-FIX-2 integration (BRIEF CONTRACT): lane A's server sanitiser + prompt, fed lane B's REAL brief.
const requireCjs = createRequire(import.meta.url);
const { normalizeBrief } = requireCjs("../../server/routes/tutor.cjs") as {
  normalizeBrief: (b: unknown) => Record<string, unknown> | null;
};
const { buildTutorSystemPrompt } = requireCjs("../../server/prompts/tutorSystemPrompt.cjs") as {
  buildTutorSystemPrompt: (args: Record<string, unknown>) => string;
};

const UID = "u-chapter";
const WINDOW = "month" as const;

let n = 0;
function attempt(agoH: number, topicKey: string, scored: number, available: number, onBank: boolean): PracticeAttempt {
  n += 1;
  const questionId = `${topicKey}-q${n}`;
  if (onBank) H.bank[questionId] = { subtopic: "HCF and LCM", section: "B", topicKey };
  return {
    id: `a${n}`,
    timestamp: NOW - agoH * HOUR,
    subject: "maths",
    topicKey,
    topicName: topicKey,
    questionId,
    marksScored: scored,
    marksAvailable: available,
    mode: "graded",
  } as unknown as PracticeAttempt;
}
function mistake(id: string, agoH: number, topic: string, marksLost: number, byType: Partial<ReturnType<typeof zeroMarksLost>>, questionId?: string): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - agoH * HOUR).toISOString(),
    questionText: "the student's own words — must never reach the brief",
    topic,
    subject: "Maths",
    totalMarks: 3,
    marksLost,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    marksLostByType: { ...zeroMarksLost(), ...byType },
    marksLostByTypeVersion: 1,
    ...(questionId ? { questionId } : {}),
  } as MistakeLogEntry;
}

beforeAll(() => {
  // Real Numbers: 8 graded answers on bank questions labelled "HCF and LCM" (the concept map rolls
  // that up to "Fundamental Theorem of Arithmetic"), 6 marks lost in all.
  const rn: Array<[number, number]> = [[1, 3], [2, 3], [1, 2], [3, 3], [2, 3], [1, 1], [2, 2], [2, 3]];
  // Trigonometry: 6 graded answers, not on the bank, 9 marks lost.
  const trig: Array<[number, number]> = [[0, 3], [1, 3], [2, 3], [0, 2], [1, 2], [3, 3]];
  H.attempts = [
    ...rn.map(([s, a], i) => attempt(2 + i * 20, "real-numbers", s, a, true)),
    ...trig.map(([s, a], i) => attempt(3 + i * 20, "trigonometry", s, a, false)),
  ];
  H.mistakes = [
    // Real Numbers — the live shape: NO questionId (a free-typed C&I / old entry), so the old brief
    // could resolve no concept from them.
    mistake("check-improve::CI1::t:aaa", 2, "Real Numbers", 2, { conceptual: 2 }),
    mistake("1727000000000-legacyRN", 42, "Real Numbers", 1, { calculation: 1 }),
    // Trigonometry — a worksheet question (synthetic id) and a Quick Practice bank question.
    mistake("worksheet::WS9::ws:WS9:q4", 3, "Trigonometry", 2, { presentation: 2 }, "ws:WS9:q4"),
    mistake("quick-practice::QP2::trig-bank-7", 43, "Trigonometry", 1, { conceptual: 1 }, "trig-bank-7"),
  ];
});

beforeEach(() => {
  H.attemptReads = 0;
});

const brief = (topicKey: string) => assembleTutorBrief({ uid: UID, topicKey, subject: "maths", window: WINDOW, nowMs: NOW });

describe("TUTOR-FIX-2 T2 — the brief is chapter-correct", () => {
  it("★ (2) Trigonometry and Real Numbers get DIFFERENT chapter marks — each == Me's chapter row, the paper total apart", async () => {
    const m = await readStudyModel(UID, { window: WINDOW, subject: "maths", nowMs: NOW });
    const me = buildChapters(m.progress.topics, "Maths", m.mistakes.byChapter);
    const rn = await brief("real-numbers");
    const trig = await brief("Trigonometry");
    expect(rn.chapter?.marksLost).toBe(6);
    expect(trig.chapter?.marksLost).toBe(9);
    expect(rn.chapter?.marksLost).toBe(me.find((c) => c.key === "real-numbers")?.lost);
    expect(trig.chapter?.marksLost).toBe(me.find((c) => c.key === "trigonometry")?.lost);
    // The paper total is labelled as the SUBJECT, and old servers keep their field.
    expect(rn.subject?.marksLost).toBe(15);
    expect(trig.subject?.marksLost).toBe(15);
    expect(rn.mistakes.marksLostRecent).toBe(15);
    expect(rn.windowLabel).toBe("last 30 days");
    expect(rn.chapter?.name).toBe("Real Numbers");
  });

  it("★ chapter split == Me's hero rule on the chapter (mapping: technique → examTechnique, unclassified → unrecorded)", async () => {
    const m = await readStudyModel(UID, { window: WINDOW, subject: "maths", nowMs: NOW });
    const rung = m.progress.topics.find((r) => r.key === "trigonometry");
    const split = splitPaperMarks(rung, m.mistakes.byChapter.trigonometry ?? [])!;
    const trig = await brief("trigonometry");
    expect(trig.chapter?.byGroup).toEqual({
      knowledge: split.knowledge,
      careless: split.careless,
      examTechnique: split.technique,
      notAttempted: split.notAttempted,
      unrecorded: split.unclassified,
    });
    expect(trig.chapter?.byGroup).toEqual({ knowledge: 1, careless: 0, examTechnique: 2, notAttempted: 0, unrecorded: 6 });
    expect(trig.chapter?.topGroup).toBe("examTechnique");
    expect((await brief("real-numbers")).chapter?.topGroup).toBe("knowledge");
  });

  it("★ (3) Real Numbers — mistakes without a bank questionId still yield 'Fundamental Theorem of Arithmetic' with 6 marks (Me's row)", async () => {
    const rn = await brief("real-numbers");
    expect(rn.chapter?.concepts).toEqual([{ name: "Fundamental Theorem of Arithmetic", marksLost: 6 }]);
    expect(rn.topic.weakConcepts).toEqual(["Fundamental Theorem of Arithmetic"]);
    // == Me's open-chapter concept rows (Me's own read for an open chapter).
    const scoped = await readStudyModel(UID, { window: WINDOW, topicKey: "real-numbers", mistakes: false, nowMs: NOW });
    expect(viewRowsFrom(scoped.progress.concepts).map((r) => ({ name: r.label, marksLost: r.lost }))).toEqual(rn.chapter?.concepts);
  });

  it("★ recent — up to 3 newest graded mistakes in the chapter: id, marks, group, surface, date; never the student's text", async () => {
    const trig = await brief("trigonometry");
    expect(trig.chapter?.recent).toEqual([
      { id: "Q4", marksLost: 2, group: "examTechnique", surface: "worksheet", date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      { id: "trig-bank-7", marksLost: 1, group: "knowledge", surface: "quick-practice", date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
    ]);
    const rn = await brief("real-numbers");
    expect(rn.chapter?.recent?.map((r) => [r.id, r.surface, r.group])).toEqual([
      ["#1", "check-improve", "knowledge"],
      ["#2", "unknown", "careless"],
    ]);
    expect(JSON.stringify(trig)).not.toMatch(/student's own words/);
  });

  it("★ (4) no chapter → no chapter block and no extra read; a chapter → exactly ONE extra read", async () => {
    const cold = await brief("");
    expect(cold.chapter).toBeUndefined();
    expect(H.attemptReads).toBe(1);
    H.attemptReads = 0;
    await brief("real-numbers");
    expect(H.attemptReads).toBe(2);
  });

  it("below Me's gate (a thin student) → no naming fields, only what Me shows", async () => {
    const keep = { attempts: H.attempts, mistakes: H.mistakes };
    H.attempts = [attempt(1, "real-numbers", 0, 3, true)];
    H.mistakes = [mistake("quick-practice::T::q1", 1, "Real Numbers", 3, { conceptual: 3 })];
    const thin = await brief("real-numbers");
    expect(thin.chapter).toBeUndefined();
    expect(thin.topic).toEqual({});
    expect(thin.mistakes).toEqual({});
    expect(thin.subject).toBeUndefined();
    expect(thin.hasData).toBe(false);
    expect(thin.windowLabel).toBe("last 30 days");
    H.attempts = keep.attempts;
    H.mistakes = keep.mistakes;
  });
});

describe("TUTOR-FIX-2 integration — the client brief survives the server sanitiser and reaches the prompt", () => {
  it("★ lane B's real brief -> normalizeBrief -> buildTutorSystemPrompt names chapter marks, split, concepts, recent and the window", async () => {
    const trig = await brief("trigonometry");
    const rn = await brief("real-numbers");
    // The sanitiser keeps every contract field the client sends (nothing renamed or dropped).
    const cleanTrig = normalizeBrief(JSON.parse(JSON.stringify(trig)))!;
    expect(cleanTrig.chapter).toEqual(trig.chapter);
    expect(cleanTrig.windowLabel).toBe(trig.windowLabel);
    expect(cleanTrig.subject).toEqual(trig.subject);

    const pTrig = buildTutorSystemPrompt({ topicLabel: "Trigonometry", subject: "maths", brief: cleanTrig });
    expect(pTrig).toContain("- Window: the last 30 days.");
    expect(pTrig).toContain("- This chapter (Trigonometry): 9 marks lost in the last 30 days.");
    expect(pTrig).toContain(
      "- Where those chapter marks went: concept/knowledge gaps 1, careless slips 0, exam technique (presentation, steps, units) 2, not attempted 0, no reason recorded 6.",
    );
    expect(pTrig).toContain("- Biggest loss group in this chapter: exam technique (presentation, steps, units).");
    expect(pTrig).toMatch(/Most recent graded questions in this chapter[^\n]*question Q4, worksheet, 2 marks lost, exam technique/);
    expect(pTrig).toMatch(/question trig-bank-7, quick-practice, 1 mark lost, concept\/knowledge gaps/);
    expect(pTrig).toContain("- Whole Maths subject (ALL chapters together, not just this one): 15 marks lost in the last 30 days.");

    const pRn = buildTutorSystemPrompt({ topicLabel: "Real Numbers", subject: "maths", brief: normalizeBrief(JSON.parse(JSON.stringify(rn))) });
    expect(pRn).toContain("- This chapter (Real Numbers): 6 marks lost in the last 30 days.");
    expect(pRn).toContain("- Concepts in this chapter that cost marks: Fundamental Theorem of Arithmetic (6 marks).");
    expect(pRn).not.toMatch(/student's own words/);
  });
});
