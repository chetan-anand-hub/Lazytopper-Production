// @vitest-environment jsdom
/**
 * MCQ-TYPE-2 — DIFFERENTIAL CHARACTERIZATION of every Mistake Intelligence consumer.
 *
 * Owner ruling (23 Oct 2026, ~20:45 IST): a RIGHT MCQ with flawed uploaded working is saved to MI
 * as a mistake with 0 marks lost — a habit to fix. It counts in the mistake-TYPE counts and in the
 * careless-habit counts; it must NOT add marks lost anywhere, must NOT increment active gaps or the
 * wrong-answer log, and must NOT create a weak area on its own.
 *
 * Method: the SAME fixture student as miConsumers.characterization (src/test/miFixture.ts) is read
 * twice — once as is, once with three 0-mark habit entries added to its MI log (exactly the shape
 * recordMistake writes: typed, marksLost 0, every marksLostByType bucket 0, `habitOnly`). Every
 * consumer the characterization suite pins runs on both, and every figure must be IDENTICAL, except
 * the careless-habit COUNTS, which must go up by exactly the habits' careless types (their marks 0).
 * Only the cloud streams are mocked; the read model and every consumer are REAL.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { MI_FIXTURE_NOW, MI_FIXTURE_UID, bankIds, miFixtureStudent, type MiFixtureStreams } from "../test/miFixture";

const H = vi.hoisted(() => ({ s: null as unknown as MiFixtureStreams }));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.s.attempts.filter((a) => start === undefined || a.timestamp >= start).map((a) => ({ ...a })),
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => H.s.records.map((r) => ({ ...r })),
  getAllSessionPerQuestionFromCloud: async () => H.s.payloads.map((p) => ({ ...p })),
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.s.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs).map((e) => ({ ...e })),
    complete: true,
  }),
}));
vi.mock("./tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tutorSessionStore")>()),
  getTutorTurnsFromCloud: async () => ({ events: [], complete: true }),
}));

import { ME_DEFAULT_WINDOW, buildMistakeView, readStudyModel, type StudyReadModel } from "./progressReadModel";
import { splitPaperMarks } from "./meSplit";
import {
  ME_ROUTE_CTX,
  buildChapters,
  loadMeConceptRows,
  loadMeHome,
  meChapterPractisePath,
  mePaperScopeKey,
  mistakeLossByType,
  resetMeHomeMemo,
  type MeHomeReader,
} from "./meHomeSummary";
import { summarizeCareless, aggregateEntryMarks } from "./mistakeInsightsService";
import { computeMiCardSummary, miVoiceInputFor } from "../components/desktop/MistakeIntelCard";
import { assembleTutorBrief } from "../pages/tutor/tutorContextBrief";
import { areaEvidence, learningPathAreas, weakAreasFromModel } from "../pages/WeakAreaPracticePage";
import { buildParentReport } from "../components/parentReport/parentReportModel";
import { MARKS_LOST_BY_TYPE_VERSION, zeroMarksLost } from "../lib/mistakeDisplay";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { DesktopSubject } from "../lib/desktop/navigation";

const HOUR = 60 * 60 * 1000;

/** A 0-mark habit entry exactly as recordMistake writes it (MCQ-TYPE-2). */
function habit(id: string, o: { questionId: string; topic: string; subject: string; type: "conceptual" | "calculation" | "silly" | "presentation"; hoursAgo: number }): MistakeLogEntry {
  const counts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0, [o.type]: 1 };
  return {
    id,
    timestamp: new Date(MI_FIXTURE_NOW - o.hoursAgo * HOUR).toISOString(),
    questionText: "Which option is correct?",
    questionId: o.questionId,
    topic: o.topic,
    subject: o.subject,
    totalMarks: 1,
    marksLost: 0,
    mistakeCounts: counts,
    stepDetails: [{ stepNumber: 1, mistakeType: o.type, marksDeducted: 0 }],
    marksLostByType: zeroMarksLost(),
    marksLostByTypeVersion: MARKS_LOST_BY_TYPE_VERSION,
    habitOnly: true,
  } as MistakeLogEntry;
}

function withHabits(base: MiFixtureStreams): MiFixtureStreams {
  const rn = bankIds("real-numbers", 30, "A");
  const light = bankIds("light-reflection-and-refraction", 30, "A");
  return {
    ...base,
    mistakes: [
      ...base.mistakes,
      // two careless habits and one knowledge-gap habit; the conceptual one is on a chapter with no
      // other mistake in the window — if habits leaked into weak areas it would CREATE one there.
      habit("habit-1", { questionId: rn[rn.length - 1], topic: "Real Numbers", subject: "Maths", type: "calculation", hoursAgo: 3 }),
      habit("habit-2", { questionId: rn[rn.length - 2], topic: "Real Numbers", subject: "Maths", type: "silly", hoursAgo: 5 }),
      habit("habit-3", { questionId: light[light.length - 1] ?? "light-x", topic: "Polynomials", subject: "Maths", type: "conceptual", hoursAgo: 7 }),
    ],
  };
}

/** Every consumer the characterization suite pins, read from the CURRENT H.s. */
async function everything() {
  resetMeHomeMemo();
  const reader: MeHomeReader = (q) => readStudyModel(MI_FIXTURE_UID, q);
  const ALL: StudyReadModel = await readStudyModel(MI_FIXTURE_UID, { window: ME_DEFAULT_WINDOW, tutor: false });
  const SCOPED: Partial<Record<DesktopSubject, StudyReadModel>> = {};
  for (const p of ["Maths", "Science"] as const) {
    SCOPED[p] = await readStudyModel(MI_FIXTURE_UID, { window: ME_DEFAULT_WINDOW, subject: mePaperScopeKey(p), mistakes: false, tutor: false });
  }
  const mePaper = (paper: DesktopSubject) => {
    // Me's per-paper cut (MeProgressPage), habits passed along exactly as Me now does.
    const all = [...ALL.mistakes.entries, ...(ALL.mistakes.habits ?? [])];
    const view = buildMistakeView(all, { start: ALL.range.start, end: ALL.range.end, subject: mePaperScopeKey(paper) }, ALL.mistakes.complete);
    const rung = ALL.progress.subjects.find((r) => r.key === mePaperScopeKey(paper)) ?? null;
    return {
      split: splitPaperMarks(rung, view.entries),
      chapters: buildChapters(SCOPED[paper]!.progress.topics, paper, view.byChapter).map((c) => ({
        key: c.key, lost: c.lost, gapType: c.gapType, practise: meChapterPractisePath(c, ME_ROUTE_CTX),
      })),
      typeMarks: mistakeLossByType(view.entries),
      careless: summarizeCareless([...view.entries, ...(view.habits ?? [])]),
      habits: (view.habits ?? []).map((e) => e.id),
    };
  };
  const { habits: allHabits, ...mistakesWithoutHabits } = ALL.mistakes;
  return {
    allHabits: (allHabits ?? []).map((e) => e.id),
    mistakes: mistakesWithoutHabits,
    entryMarks: aggregateEntryMarks(ALL.mistakes.entries),
    progress: ALL.progress,
    maths: mePaper("Maths"),
    science: mePaper("Science"),
    home: (await loadMeHome(MI_FIXTURE_UID, 0, reader)).summary,
    card: computeMiCardSummary(ALL),
    voice: miVoiceInputFor({ kind: "with-data", summary: computeMiCardSummary(ALL) }),
    conceptRows: { maths: await loadMeConceptRows(MI_FIXTURE_UID, "Maths", 0, reader), science: await loadMeConceptRows(MI_FIXTURE_UID, "Science", 0, reader) },
    tutor: {
      maths: await assembleTutorBrief({ uid: MI_FIXTURE_UID, topicKey: "real-numbers", subject: "maths" }),
      polynomials: await assembleTutorBrief({ uid: MI_FIXTURE_UID, topicKey: "polynomials", subject: "maths" }),
    },
    weak: {
      all: weakAreasFromModel(ALL, "All"),
      maths: weakAreasFromModel(ALL, "Maths"),
      path: learningPathAreas(ALL, weakAreasFromModel(ALL, "All")),
      evidence: weakAreasFromModel(ALL, "All").map((a) => areaEvidence(ALL, a.topicKey)),
    },
    parent: buildParentReport(ALL, { firstName: "Asha" }),
    paywall: ALL.progress.activity.gradedAnswers,
  };
}

let BASE: Awaited<ReturnType<typeof everything>>;
let HABIT: Awaited<ReturnType<typeof everything>>;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MI_FIXTURE_NOW);
  const base = miFixtureStudent();
  H.s = base;
  BASE = await everything();
  H.s = withHabits(base);
  HABIT = await everything();
}, 60_000);
afterAll(() => {
  vi.useRealTimers();
});
beforeEach(() => resetMeHomeMemo());

describe("MCQ-TYPE-2 · a 0-mark habit changes TYPE COUNTS only", () => {
  it("CONTROL: the habits are really in the read (they reach `mistakes.habits`, Maths only)", () => {
    expect(BASE.allHabits).toEqual([]);
    expect(HABIT.allHabits).toEqual(["habit-1", "habit-2", "habit-3"]);
    expect(HABIT.maths.habits).toEqual(["habit-1", "habit-2", "habit-3"]);
    expect(HABIT.science.habits).toEqual([]);
  });

  it("★ no marks lost anywhere: the live mistakes, their marks, groups, chapters and won-back are identical", () => {
    expect(HABIT.mistakes).toEqual(BASE.mistakes);
    expect(HABIT.entryMarks).toEqual(BASE.entryMarks);
    expect(HABIT.maths.split).toEqual(BASE.maths.split);
    expect(HABIT.maths.typeMarks).toEqual(BASE.maths.typeMarks);
    expect(HABIT.science.split).toEqual(BASE.science.split);
  });

  it("★ no gap and no weak area on its own: chapters, concept rows, weak areas, learning path and evidence are identical", () => {
    expect(HABIT.maths.chapters).toEqual(BASE.maths.chapters);
    expect(HABIT.science.chapters).toEqual(BASE.science.chapters);
    // Polynomials holds ONLY a (conceptual) habit: it must not appear as a chapter or a weak area.
    expect(HABIT.maths.chapters.some((c) => c.key === "polynomials" && c.lost > 0)).toBe(false);
    expect(HABIT.weak).toEqual(BASE.weak);
    expect(HABIT.conceptRows).toEqual(BASE.conceptRows);
  });

  it("★ every other consumer is identical: Home, the sidebar card + Ziggy's input, the tutor brief, the parent report, the paywall count, progress", () => {
    expect(HABIT.home).toEqual(BASE.home);
    expect(HABIT.card).toEqual(BASE.card);
    expect(HABIT.voice).toEqual(BASE.voice);
    expect(HABIT.tutor).toEqual(BASE.tutor);
    expect(HABIT.parent).toEqual(BASE.parent);
    expect(HABIT.paywall).toEqual(BASE.paywall);
    expect(HABIT.progress).toEqual(BASE.progress);
  });

  it("★ the careless-HABIT counts go up by exactly the careless habits; careless MARKS do not move", () => {
    expect(HABIT.maths.careless.marksLost).toBe(BASE.maths.careless.marksLost);
    expect(HABIT.maths.careless.calculationCount).toBe(BASE.maths.careless.calculationCount + 1);
    expect(HABIT.maths.careless.sillyCount).toBe(BASE.maths.careless.sillyCount + 1);
    expect(HABIT.maths.careless.count).toBe(BASE.maths.careless.count + 2);
    expect(HABIT.science.careless).toEqual(BASE.science.careless);
  });
});
