// @vitest-environment jsdom
/**
 * MI-MODE-MARKS-1 — CHARACTERIZATION of every Mistake Intelligence consumer, on ONE fixture
 * student (src/test/miFixture.ts). Committed FIRST, green on trunk, and required to stay green
 * after the lane: a lane that changes what the read model RECORDS must not change what any
 * consumer SHOWS. A figure that moves here is a HOLD, never a test to "fix".
 *
 * Consumers pinned (each with the exact figures, labels, selected weak areas and action targets
 * it produces today):
 *   Me / Progress (hero split, chapters + their Practise target, concept rows, easy marks) ·
 *   Home's MI card (meHomeSummary) · the sidebar card (computeMiCardSummary + Ziggy's input) ·
 *   the Practice hub's weak-area entry (loadMeConceptRows) · the Tutor brief (assembleTutorBrief) ·
 *   weak-area practice (weakAreasFromModel + evidence) · the parent report · the paywall's
 *   checked-answer count · the share card · the scorecards (worksheet variant) · the worksheet
 *   panel's per-question MI · the loop's active gaps (wrong-answer log + the clean-drill decrement).
 *
 * Only the CLOUD streams are mocked; the read model and every consumer function are REAL.
 * The clock is pinned (fake Date only) so every window is deterministic.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { MI_FIXTURE_NOW, MI_FIXTURE_UID, miFixtureStudent, type MiFixtureStreams } from "../test/miFixture";

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
  meConceptPractisePath,
  meConceptRowsFrom,
  mePaperScopeKey,
  resetMeHomeMemo,
  type MeHomeReader,
} from "./meHomeSummary";
import { summarizeCareless } from "./mistakeInsightsService";
import { remainderSentence } from "../pages/MeProgressPage";
import { computeMiCardSummary, miVoiceInputFor } from "../components/desktop/MistakeIntelCard";
import { miVoiceFor } from "../components/guide/mi/miVoiceModel";
import { assembleTutorBrief } from "../pages/tutor/tutorContextBrief";
import { areaEvidence, areaStatus, emptyListGateMet, learningPathAreas, weakAreasFromModel } from "../pages/WeakAreaPracticePage";
import { buildParentReport } from "../components/parentReport/parentReportModel";
import { buildShareCardModel } from "../components/results/share/shareCardModel";
import { ALL_SHARE_FIXTURES } from "../test/shareFixtures";
import { worksheetScorecardVariant } from "../components/results/scorecardVariants";
import { gradeStateOf, paperMarksLost, questionChipType, questionMarksLost } from "../lib/mistakeDisplay";
import { recordAttempt } from "./practiceInsights";
import { getWrongConceptsForTopic, recordWrongAnswer } from "./adaptivePracticeEngine";
import { setActiveProgressUser } from "./studentProgressStore";
import type { DesktopSubject } from "../lib/desktop/navigation";
import type { WorksheetGradeResponse } from "../ai/aiClient";

const reader: MeHomeReader = (q) => readStudyModel(MI_FIXTURE_UID, q);
let ALL: StudyReadModel;
const SCOPED: Partial<Record<DesktopSubject, StudyReadModel>> = {};

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MI_FIXTURE_NOW);
  H.s = miFixtureStudent();
  // Sequential reads (a concurrent import of the lazily loaded bank lookup races under mocks).
  ALL = await readStudyModel(MI_FIXTURE_UID, { window: ME_DEFAULT_WINDOW, tutor: false });
  for (const p of ["Maths", "Science"] as const) {
    SCOPED[p] = await readStudyModel(MI_FIXTURE_UID, { window: ME_DEFAULT_WINDOW, subject: mePaperScopeKey(p), mistakes: false, tutor: false });
  }
}, 30_000);
afterAll(() => {
  vi.useRealTimers();
});
beforeEach(() => resetMeHomeMemo());

/** Me's own per-paper derivation (MeProgressPage): the paper's mistakes cut from the unscoped history. */
function mePaper(paper: DesktopSubject) {
  const paperMistakes = buildMistakeView(
    ALL.mistakes.entries,
    { start: ALL.range.start, end: ALL.range.end, subject: mePaperScopeKey(paper) },
    ALL.mistakes.complete,
  );
  const rung = ALL.progress.subjects.find((r) => r.key === mePaperScopeKey(paper)) ?? null;
  const split = splitPaperMarks(rung, paperMistakes.entries);
  const chapters = buildChapters(SCOPED[paper]!.progress.topics, paper, paperMistakes.byChapter).map((c) => ({
    key: c.key, label: c.label, lost: c.lost, gapType: c.gapType, practise: meChapterPractisePath(c, ME_ROUTE_CTX),
  }));
  const concepts = meConceptRowsFrom(SCOPED[paper]!.progress.concepts).map((r) => ({
    label: r.label, lost: r.lost, practise: meConceptPractisePath(paper, r),
  }));
  const careless = summarizeCareless(paperMistakes.entries);
  return { split, remainder: split ? remainderSentence(split) : null, chapters, concepts, careless };
}

describe("Me / Progress", () => {
  it("Maths: hero split, chapters (Me's Start here + its Practise target), concept rows, easy marks", () => {
    expect(mePaper("Maths")).toMatchInlineSnapshot(`
      {
        "careless": {
          "calculationCount": 2,
          "count": 3,
          "hasData": true,
          "marksLost": 4,
          "sillyCount": 1,
        },
        "chapters": [
          {
            "gapType": "conceptual",
            "key": "real-numbers",
            "label": "Real Numbers",
            "lost": 17,
            "practise": "/practice/10/Maths?topic=real-numbers&backLabel=Back+to+Real+Numbers&source=me&returnTo=%2Fme",
          },
        ],
        "concepts": [
          {
            "label": "Fundamental Theorem of Arithmetic",
            "lost": 11,
            "practise": "/practice/10/Maths?scope=full-subject&backLabel=Back+to+Me+%2F+Progress&source=me&returnTo=%2Fme",
          },
        ],
        "remainder": "No mistake type is recorded for these marks — some may be questions you did not attempt. Tap-the-answer questions record which option you chose, not why. To see whether a lost mark was a concept gap or a slip, check a written answer.",
        "split": {
          "available": 36,
          "careless": 5,
          "knowledge": 7,
          "lost": 25,
          "notAttempted": 3,
          "secured": 11,
          "splitKnown": true,
          "technique": 2,
          "unclassified": 8,
        },
      }
    `);
  });
  it("Science: the same, on the alias-spelt chapter and the chapter test", () => {
    expect(mePaper("Science")).toMatchInlineSnapshot(`
      {
        "careless": {
          "calculationCount": 2,
          "count": 4,
          "hasData": true,
          "marksLost": 3,
          "sillyCount": 2,
        },
        "chapters": [
          {
            "gapType": null,
            "key": "light-reflection-and-refraction",
            "label": "Light - Reflection & Refraction",
            "lost": 8,
            "practise": "/practice/10/Science?topic=light-reflection-and-refraction&backLabel=Back+to+Light+-+Reflection+%26+Refraction&source=me&returnTo=%2Fme",
          },
          {
            "gapType": null,
            "key": "chemical-reactions-and-equations",
            "label": "Chemical Reactions & Equations",
            "lost": 5,
            "practise": "/practice/10/Science?topic=chemical-reactions-and-equations&backLabel=Back+to+Chemical+Reactions+%26+Equations&source=me&returnTo=%2Fme",
          },
        ],
        "concepts": [
          {
            "label": "Balancing Equations & Types of Reactions",
            "lost": 5,
            "practise": "/practice/10/Science?scope=full-subject&backLabel=Back+to+Me+%2F+Progress&source=me&returnTo=%2Fme",
          },
        ],
        "remainder": "No mistake type is recorded for these marks — some may be questions you did not attempt. Tap-the-answer questions record which option you chose, not why. To see whether a lost mark was a concept gap or a slip, check a written answer.",
        "split": {
          "available": 24,
          "careless": 4,
          "knowledge": 2,
          "lost": 13,
          "notAttempted": 1,
          "secured": 11,
          "splitKnown": true,
          "technique": 2,
          "unclassified": 4,
        },
      }
    `);
  });
});

describe("Home's MI card (meHomeSummary) and the sidebar card", () => {
  it("Home: Me's paper, Me's split, per-type marks, biggest-win chapter and concepts", async () => {
    const { summary } = await loadMeHome(MI_FIXTURE_UID, 0, reader);
    expect(summary).toMatchInlineSnapshot(`
      {
        "concepts": [
          {
            "chapter": "real-numbers",
            "key": "real-numbers|Fundamental Theorem of Arithmetic",
            "label": "Fundamental Theorem of Arithmetic",
            "lost": 11,
            "practisePath": "/practice/10/Maths?scope=full-subject&backLabel=Back+to+Me+%2F+Progress&source=me&returnTo=%2Fme",
          },
        ],
        "hasTyped": true,
        "lost": 25,
        "paper": "Maths",
        "split": {
          "available": 36,
          "careless": 5,
          "knowledge": 7,
          "lost": 25,
          "notAttempted": 3,
          "secured": 11,
          "splitKnown": true,
          "technique": 2,
          "unclassified": 8,
        },
        "topChapter": {
          "key": "real-numbers",
          "label": "Real Numbers",
          "lost": 17,
          "practisePath": "/practice/10/Maths?topic=real-numbers&backLabel=Back+to+Real+Numbers&source=me&returnTo=%2Fme",
        },
        "typeMarks": {
          "calculation": 4,
          "conceptual": 7,
          "presentation": 2,
          "silly": 1,
        },
      }
    `);
  });
  it("sidebar: checked answers, marks lost, the biggest loss, and what Ziggy is given to say", () => {
    const summary = computeMiCardSummary(ALL);
    const input = miVoiceInputFor({ kind: "with-data", summary });
    expect({ summary, input, voice: miVoiceFor(input) }).toMatchInlineSnapshot(`
      {
        "input": {
          "kind": "with-data",
          "namesWeakness": true,
          "topLoss": {
            "amount": "9 marks",
            "group": "knowledge",
          },
        },
        "summary": {
          "checkedCount": 17,
          "namesWeakness": true,
          "topLoss": {
            "amount": "9 marks",
            "basis": "marks",
            "group": "knowledge",
            "label": "Knowledge gap",
          },
          "totalMarksLost": 38,
        },
        "voice": {
          "kind": "ziggy",
          "line": "9 marks went where I didn't get the idea yet.",
          "pose": "confused",
          "state": "knowledge",
        },
      }
    `);
  });
});

describe("Practice hub — 'My weak areas' entry (loadMeConceptRows)", () => {
  it("both papers: Me's concept rows and their Practise targets", async () => {
    const maths = await loadMeConceptRows(MI_FIXTURE_UID, "Maths", 0, reader);
    const science = await loadMeConceptRows(MI_FIXTURE_UID, "Science", 0, reader);
    expect({ maths, science }).toMatchInlineSnapshot(`
      {
        "maths": [
          {
            "chapter": "real-numbers",
            "key": "real-numbers|Fundamental Theorem of Arithmetic",
            "label": "Fundamental Theorem of Arithmetic",
            "lost": 11,
            "practisePath": "/practice/10/Maths?scope=full-subject&backLabel=Back+to+Me+%2F+Progress&source=me&returnTo=%2Fme",
          },
        ],
        "science": [
          {
            "chapter": "chemical-reactions-and-equations",
            "key": "chemical-reactions-and-equations|Balancing Equations & Types of Reactions",
            "label": "Balancing Equations & Types of Reactions",
            "lost": 5,
            "practisePath": "/practice/10/Science?scope=full-subject&backLabel=Back+to+Me+%2F+Progress&source=me&returnTo=%2Fme",
          },
        ],
      }
    `);
  });
});

describe("Tutor brief (assembleTutorBrief — the tutor's MI context)", () => {
  it("Real Numbers (Maths) and Light (Science)", async () => {
    const maths = await assembleTutorBrief({ uid: MI_FIXTURE_UID, topicKey: "real-numbers", subject: "maths" });
    const science = await assembleTutorBrief({ uid: MI_FIXTURE_UID, topicKey: "light-reflection-and-refraction", subject: "science" });
    expect({ maths, science }).toMatchInlineSnapshot(`
      {
        "maths": {
          "chapter": {
            "byGroup": {
              "careless": 0,
              "examTechnique": 2,
              "knowledge": 7,
              "notAttempted": 3,
              "unrecorded": 5,
            },
            "concepts": [
              {
                "marksLost": 11,
                "name": "Fundamental Theorem of Arithmetic",
              },
            ],
            "marksLost": 17,
            "name": "Real Numbers",
            "recent": [
              {
                "date": "2026-10-20",
                "group": "knowledge",
                "id": "RN-E02",
                "marksLost": 2,
                "surface": "unknown",
              },
              {
                "date": "2026-10-19",
                "group": "knowledge",
                "id": "RN-E03",
                "marksLost": 2,
                "surface": "unknown",
              },
              {
                "date": "2026-10-18",
                "group": "knowledge",
                "id": "RN-E04",
                "marksLost": 2,
                "surface": "unknown",
              },
            ],
            "topGroup": "knowledge",
          },
          "hasData": true,
          "mistakes": {
            "marksLostRecent": 25,
            "topType": "knowledge gap",
          },
          "subject": {
            "marksLost": 25,
          },
          "topic": {
            "trend": "improving",
            "weakConcepts": [
              "Fundamental Theorem of Arithmetic",
            ],
          },
          "windowLabel": "last 30 days",
        },
        "science": {
          "chapter": {
            "byGroup": {
              "careless": 2,
              "examTechnique": 2,
              "knowledge": 2,
              "notAttempted": 0,
              "unrecorded": 2,
            },
            "marksLost": 8,
            "name": "Light - Reflection & Refraction",
            "recent": [
              {
                "date": "2026-10-20",
                "group": "knowledge",
                "id": "LT-E01",
                "marksLost": 1,
                "surface": "unknown",
              },
              {
                "date": "2026-10-18",
                "group": "knowledge",
                "id": "LT-E02",
                "marksLost": 1,
                "surface": "unknown",
              },
              {
                "date": "2026-10-17",
                "group": "careless",
                "id": "LT-E03",
                "marksLost": 1,
                "surface": "unknown",
              },
            ],
            "topGroup": "knowledge",
          },
          "hasData": true,
          "mistakes": {
            "marksLostRecent": 13,
            "topType": "careless",
          },
          "subject": {
            "marksLost": 13,
          },
          "topic": {
            "trend": "stable",
          },
          "windowLabel": "last 30 days",
        },
      }
    `);
  });
});

describe("Weak-area practice (selection + evidence)", () => {
  it("All / Maths / Science lists, learning-path input, evidence and status", () => {
    const all = weakAreasFromModel(ALL, "All");
    expect({
      gate: { All: emptyListGateMet(ALL, "All"), Maths: emptyListGateMet(ALL, "Maths"), Science: emptyListGateMet(ALL, "Science") },
      all,
      maths: weakAreasFromModel(ALL, "Maths").map((a) => a.topicKey),
      science: weakAreasFromModel(ALL, "Science").map((a) => a.topicKey),
      path: learningPathAreas(ALL, all),
      evidence: all.map((a) => ({ key: a.topicKey, evidence: areaEvidence(ALL, a.topicKey), status: areaStatus(areaEvidence(ALL, a.topicKey)) })),
    }).toMatchInlineSnapshot(`
      {
        "all": [
          {
            "marksLost": 17,
            "subject": "Maths",
            "topicKey": "real-numbers",
            "topicName": "Real Numbers",
            "weakConcepts": [
              {
                "key": "real-numbers|Fundamental Theorem of Arithmetic",
                "label": "Fundamental Theorem of Arithmetic",
              },
            ],
          },
          {
            "marksLost": 8,
            "subject": "Science",
            "topicKey": "light-reflection-and-refraction",
            "topicName": "Light - Reflection & Refraction",
            "weakConcepts": [],
          },
          {
            "marksLost": 5,
            "subject": "Science",
            "topicKey": "chemical-reactions-and-equations",
            "topicName": "Chemical Reactions & Equations",
            "weakConcepts": [
              {
                "key": "chemical-reactions-and-equations|Balancing Equations & Types of Reactions",
                "label": "Balancing Equations & Types of Reactions",
              },
            ],
          },
        ],
        "evidence": [
          {
            "evidence": {
              "accuracy": 32,
              "attempts": 14,
              "lostShare": 0.68,
              "marksLost": 17,
            },
            "key": "real-numbers",
            "status": "Critical",
          },
          {
            "evidence": {
              "accuracy": 43,
              "attempts": 8,
              "lostShare": 0.5714285714285714,
              "marksLost": 8,
            },
            "key": "light-reflection-and-refraction",
            "status": "Needs Work",
          },
          {
            "evidence": {
              "accuracy": 50,
              "attempts": 6,
              "lostShare": 0.5,
              "marksLost": 5,
            },
            "key": "chemical-reactions-and-equations",
            "status": "Needs Work",
          },
        ],
        "gate": {
          "All": true,
          "Maths": true,
          "Science": true,
        },
        "maths": [
          "real-numbers",
        ],
        "path": [
          {
            "difficulty": "Easy",
            "focusConcepts": [
              "Fundamental Theorem of Arithmetic",
            ],
            "subject": "Maths",
            "topicKey": "real-numbers",
            "topicName": "Real Numbers",
          },
          {
            "difficulty": "Medium",
            "focusConcepts": [],
            "subject": "Science",
            "topicKey": "light-reflection-and-refraction",
            "topicName": "Light - Reflection & Refraction",
          },
          {
            "difficulty": "Medium",
            "focusConcepts": [
              "Balancing Equations & Types of Reactions",
            ],
            "subject": "Science",
            "topicKey": "chemical-reactions-and-equations",
            "topicName": "Chemical Reactions & Equations",
          },
        ],
        "science": [
          "light-reflection-and-refraction",
          "chemical-reactions-and-equations",
        ],
      }
    `);
  });
});

describe("Parent report and paywall", () => {
  it("parent report over the fixture's month read", () => {
    const report = buildParentReport(ALL, { firstName: "Asha" });
    expect(JSON.parse(JSON.stringify(report))).toMatchInlineSnapshot(`
      {
        "activityReason": null,
        "answersMarked": 32,
        "chapters": [
          {
            "key": "real-numbers",
            "label": "Real Numbers",
            "marks": 10,
          },
          {
            "key": "light-reflection-and-refraction",
            "label": "Light - Reflection & Refraction",
            "marks": 6,
          },
          {
            "key": "polynomials",
            "label": "Polynomials",
            "marks": 6,
          },
        ],
        "firstName": "Asha",
        "marksLost": 38,
        "nextSteps": [
          "Learn this: 9 marks to gain — practise Real Numbers until the method is yours.",
          "You already know this: 9 marks to gain — slow down and check each line.",
          "The quickest wins: 4 marks to gain — write the formula, the units and the conclusion every time.",
        ],
        "state": "pattern",
        "testsTaken": 1,
        "typeRows": [
          {
            "hindi": "कारण दर्ज नहीं",
            "key": "untyped",
            "label": "Marks lost, reason not recorded",
            "marks": 12,
          },
          {
            "hindi": "कॉन्सेप्ट समझने में कमी",
            "key": "conceptual",
            "label": "Concept gap",
            "marks": 9,
          },
          {
            "hindi": "गणना में गलती",
            "key": "calculation",
            "label": "Calculation slip",
            "marks": 6,
          },
          {
            "hindi": "लिखने का तरीका (स्टेप, यूनिट)",
            "key": "presentation",
            "label": "Presentation",
            "marks": 4,
          },
          {
            "hindi": "सवाल छोड़ दिया",
            "key": "not-attempted",
            "label": "Not attempted",
            "marks": 4,
          },
          {
            "hindi": "लापरवाही की गलती",
            "key": "silly",
            "label": "Silly slip",
            "marks": 3,
          },
        ],
        "weekLabel": "20 Sep – 20 Oct 2026",
        "wonBack": null,
      }
    `);
  });
  it("paywall: the checked-answer count it prints (progress.activity.gradedAnswers)", () => {
    expect(ALL.progress.activity.gradedAnswers).toMatchInlineSnapshot(`17`);
  });
});

describe("Per-grade consumers: scorecards, worksheet panel, share card", () => {
  const response = () => H.s.payloads[0].response as unknown as WorksheetGradeResponse;
  it("scorecard (worksheet variant over the fixture chapter test's unified response)", () => {
    const v = worksheetScorecardVariant({ name: "Fixture", code: "WS-S-CR-01", response: response(), downloading: false, onRead: () => {}, onDownload: () => {} });
    expect(JSON.parse(JSON.stringify(v))).toMatchInlineSnapshot(`
      {
        "actions": [
          {
            "disabled": false,
            "label": "Read your graded worksheet",
            "tone": "ghost",
          },
          {
            "busy": false,
            "busyLabel": "Preparing PDF…",
            "disabled": false,
            "label": "Download graded sheet",
            "tone": "primary",
          },
        ],
        "allPending": null,
        "fourType": {
          "calculation": 2,
          "conceptual": 0,
          "presentation": 0,
          "silly": 0,
        },
        "marksLost": {
          "byType": {
            "calculation": 2,
            "conceptual": 0,
            "presentation": 0,
            "silly": 0,
            "unattempted": 1,
            "untyped": 2,
          },
          "lost": 5,
          "unsplitCount": 0,
        },
        "pending": null,
        "score": {
          "awarded": 5,
          "gradedCount": 6,
          "kind": "marks",
          "total": 10,
          "totalQuestions": 6,
        },
        "subtitle": "WS-S-CR-01 · graded just now",
        "surface": "worksheet",
        "title": "Fixture",
      }
    `);
  });
  it("worksheet panel: per-question grade state, marks lost, chip type and the paper's split", () => {
    const rows = response().results.map((q) => ({ q: q.qNumber, state: gradeStateOf(q), lost: questionMarksLost(q), chip: questionChipType(q) }));
    expect({ rows, paper: paperMarksLost(response().results) }).toMatchInlineSnapshot(`
      {
        "paper": {
          "byType": {
            "calculation": 2,
            "conceptual": 0,
            "presentation": 0,
            "silly": 0,
            "unattempted": 1,
            "untyped": 2,
          },
          "lost": 5,
          "unsplitCount": 0,
        },
        "rows": [
          {
            "chip": null,
            "lost": {
              "calculation": 0,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 0,
              "untyped": 1,
            },
            "q": 1,
            "state": "graded",
          },
          {
            "chip": null,
            "lost": {
              "calculation": 0,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 0,
              "untyped": 1,
            },
            "q": 2,
            "state": "graded",
          },
          {
            "chip": null,
            "lost": {
              "calculation": 0,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 1,
              "untyped": 0,
            },
            "q": 3,
            "state": "graded",
          },
          {
            "chip": null,
            "lost": {
              "calculation": 0,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 0,
              "untyped": 0,
            },
            "q": 4,
            "state": "graded",
          },
          {
            "chip": "calculation",
            "lost": {
              "calculation": 1,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 0,
              "untyped": 0,
            },
            "q": 5,
            "state": "graded",
          },
          {
            "chip": "calculation",
            "lost": {
              "calculation": 1,
              "conceptual": 0,
              "presentation": 0,
              "silly": 0,
              "unattempted": 0,
              "untyped": 0,
            },
            "q": 6,
            "state": "graded",
          },
        ],
      }
    `);
  });
  it("share card: every share fixture's model", () => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ALL_SHARE_FIXTURES)) out[k] = JSON.parse(JSON.stringify(buildShareCardModel(v, { dateLabel: "20 Oct 2026" })));
    expect(out).toMatchInlineSnapshot(`
      {
        "FX_ALL_ZERO": {
          "awarded": 40,
          "biggest": null,
          "byte": {
            "key": "clean",
            "line": "Zero marks lost to mistakes. Bas, keep this streak going!",
            "pose": "cheer",
          },
          "context": "Light",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=chapter_test",
          "mi": "marks",
          "noMistakeLoss": true,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 0,
              "label": "Concept gap",
              "marks": 0,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Calculation slip",
              "marks": 0,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Silly slip",
              "marks": 0,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Presentation",
              "marks": 0,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "chapter-test",
          "surfaceLabel": "Chapter Test",
          "total": 40,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Board-ready vibes! Full josh.",
            "mood": "great",
            "pose": "excited",
          },
        },
        "FX_CI_SINGLE": {
          "awarded": 2,
          "biggest": {
            "count": 1,
            "kind": "calculation",
            "label": "Calculation slip",
            "marks": 1,
          },
          "byte": {
            "key": "calculation",
            "line": "Calculation slips cost 1 mark. Check every step again, yaar!",
            "pose": "explain",
          },
          "context": "Quadratic Equations",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=check_improve",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 0,
              "label": "Concept gap",
              "marks": 0,
              "type": "conceptual",
            },
            {
              "biggest": true,
              "count": 1,
              "label": "Calculation slip",
              "marks": 1,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Silly slip",
              "marks": 0,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Presentation",
              "marks": 0,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "check-improve",
          "surfaceLabel": "Check & Improve",
          "total": 3,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Good going! A few marks to grab back.",
            "mood": "mixed",
            "pose": "determined",
          },
        },
        "FX_COUNT_ONLY": {
          "awarded": 14,
          "biggest": {
            "count": 2,
            "kind": "silly",
            "label": "Silly slip",
            "marks": null,
          },
          "byte": {
            "key": "counts",
            "line": "Most mistakes: Silly slip (2). Fix these first!",
            "pose": "explain",
          },
          "context": "Real Numbers",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=worksheet",
          "mi": "counts",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 1,
              "label": "Concept gap",
              "marks": null,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Calculation slip",
              "marks": null,
              "type": "calculation",
            },
            {
              "biggest": true,
              "count": 2,
              "label": "Silly slip",
              "marks": null,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Presentation",
              "marks": null,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "worksheet",
          "surfaceLabel": "Worksheet",
          "total": 20,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Good going! A few marks to grab back.",
            "mood": "mixed",
            "pose": "determined",
          },
        },
        "FX_FOUR_TYPES": {
          "awarded": 14,
          "biggest": {
            "count": 3,
            "kind": "silly",
            "label": "Silly slip",
            "marks": 3,
          },
          "byte": {
            "key": "silly",
            "line": "Silly slips cost 3 marks. Check signs and copying again!",
            "pose": "explain",
          },
          "context": "Real Numbers",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=worksheet",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0.5,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 2,
              "label": "Concept gap",
              "marks": 1.5,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 1,
              "label": "Calculation slip",
              "marks": 0.5,
              "type": "calculation",
            },
            {
              "biggest": true,
              "count": 3,
              "label": "Silly slip",
              "marks": 3,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 1,
              "label": "Presentation",
              "marks": 0.5,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "worksheet",
          "surfaceLabel": "Worksheet",
          "total": 20,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Good going! A few marks to grab back.",
            "mood": "mixed",
            "pose": "determined",
          },
        },
        "FX_GREAT": {
          "awarded": 38,
          "biggest": {
            "count": 1,
            "kind": "silly",
            "label": "Silly slip",
            "marks": 1,
          },
          "byte": {
            "key": "silly",
            "line": "Silly slips cost 1 mark. Check signs and copying again!",
            "pose": "explain",
          },
          "context": "Light",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=chapter_test",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 0,
              "label": "Concept gap",
              "marks": 0,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Calculation slip",
              "marks": 0,
              "type": "calculation",
            },
            {
              "biggest": true,
              "count": 1,
              "label": "Silly slip",
              "marks": 1,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 1,
              "label": "Presentation",
              "marks": 1,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "chapter-test",
          "surfaceLabel": "Chapter Test",
          "total": 40,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Board-ready vibes! Full josh.",
            "mood": "great",
            "pose": "excited",
          },
        },
        "FX_HIDE": {
          "awarded": 30,
          "biggest": {
            "count": null,
            "kind": "unattempted",
            "label": "Not attempted",
            "marks": 30,
          },
          "byte": {
            "key": "unattempted",
            "line": "Blank answers cost 30 marks. Even the right formula earns marks!",
            "pose": "point",
          },
          "context": "Science",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=full_mock",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 30,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 3,
              "label": "Concept gap",
              "marks": 10,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 2,
              "label": "Calculation slip",
              "marks": 5,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 2,
              "label": "Silly slip",
              "marks": 3,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 2,
              "label": "Presentation",
              "marks": 2,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "full-mock",
          "surfaceLabel": "Full Mock",
          "total": 80,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Some answers left blank. Next time, attempt them all!",
            "mood": "hide",
            "pose": "hide",
          },
        },
        "FX_LOW": {
          "awarded": 30,
          "biggest": {
            "count": 9,
            "kind": "conceptual",
            "label": "Concept gap",
            "marks": 30,
          },
          "byte": {
            "key": "conceptual",
            "line": "Concept gaps cost 30 marks. Revise the idea, then try again!",
            "pose": "explain",
          },
          "context": "Maths",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=full_mock",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": true,
              "count": 9,
              "label": "Concept gap",
              "marks": 30,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 4,
              "label": "Calculation slip",
              "marks": 8,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 5,
              "label": "Silly slip",
              "marks": 6,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 6,
              "label": "Presentation",
              "marks": 6,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "full-mock",
          "surfaceLabel": "Full Mock",
          "total": 80,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Oops! Every mark lost here can be won back.",
            "mood": "oops",
            "pose": "oops",
          },
        },
        "FX_OBJECTIVE_ONLY": {
          "awarded": 3,
          "biggest": null,
          "byte": {
            "key": "objective-wrong",
            "line": "Tap answers show what you chose, not why. Check a written one!",
            "pose": "explain",
          },
          "context": null,
          "coverage": {
            "graded": 5,
            "total": 6,
          },
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=quick_practice",
          "mi": "objective",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": {
            "right": 3,
            "wrong": 2,
          },
          "rows": null,
          "showMascots": true,
          "size": "story",
          "surface": "quick-practice",
          "surfaceLabel": "Quick Practice",
          "total": 5,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Good going! A few marks to grab back.",
            "mood": "mixed",
            "pose": "determined",
          },
        },
        "FX_PARTIAL_QP": {
          "awarded": 3,
          "biggest": null,
          "byte": {
            "key": "objective-clean",
            "line": "Every tap answer right! Ab ek written answer try karo.",
            "pose": "cheer",
          },
          "context": null,
          "coverage": {
            "graded": 3,
            "total": 10,
          },
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=quick_practice",
          "mi": "objective",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": {
            "right": 3,
            "wrong": 0,
          },
          "rows": null,
          "showMascots": true,
          "size": "story",
          "surface": "quick-practice",
          "surfaceLabel": "Quick Practice",
          "total": 3,
          "untypedMarks": 0,
          "ziggy": {
            "line": "Good start! Finish the rest to see your full score.",
            "mood": "keepgoing",
            "pose": "determined",
          },
        },
        "FX_PENDING": {
          "awarded": 6,
          "biggest": null,
          "byte": {
            "key": "none",
            "line": "Check a written answer to see where your marks go.",
            "pose": "explain",
          },
          "context": "Triangles",
          "coverage": {
            "graded": 3,
            "total": 5,
          },
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=check_improve",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 0,
              "label": "Concept gap",
              "marks": 0,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 2,
              "label": "Calculation slip",
              "marks": 2,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Silly slip",
              "marks": 0,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Presentation",
              "marks": 0,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "check-improve",
          "surfaceLabel": "Check & Improve",
          "total": 10,
          "untypedMarks": 2,
          "ziggy": {
            "line": "Good start! Finish the rest to see your full score.",
            "mood": "keepgoing",
            "pose": "determined",
          },
        },
        "FX_UNTYPED_BIGGEST": {
          "awarded": 30,
          "biggest": null,
          "byte": {
            "key": "none",
            "line": "Check a written answer to see where your marks go.",
            "pose": "explain",
          },
          "context": "Light",
          "coverage": null,
          "dateLabel": "20 Oct 2026",
          "firstName": null,
          "link": "https://www.lazytopper.com/check-your-answer?utm_source=share&utm_medium=scorecard&utm_campaign=chapter_test",
          "mi": "marks",
          "noMistakeLoss": false,
          "notAttemptedMarks": 0,
          "objective": null,
          "rows": [
            {
              "biggest": false,
              "count": 1,
              "label": "Concept gap",
              "marks": 2,
              "type": "conceptual",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Calculation slip",
              "marks": 0,
              "type": "calculation",
            },
            {
              "biggest": false,
              "count": 1,
              "label": "Silly slip",
              "marks": 1,
              "type": "silly",
            },
            {
              "biggest": false,
              "count": 0,
              "label": "Presentation",
              "marks": 0,
              "type": "presentation",
            },
          ],
          "showMascots": true,
          "size": "story",
          "surface": "chapter-test",
          "surfaceLabel": "Chapter Test",
          "total": 40,
          "untypedMarks": 7,
          "ziggy": {
            "line": "Good going! A few marks to grab back.",
            "mood": "mixed",
            "pose": "determined",
          },
        },
      }
    `);
  });
});

describe("The loop's Measure leg — active gaps (wrong-answer log)", () => {
  it("two concept gaps on Real Numbers; a clean, fully correct drill clears one; a wrong one clears none", () => {
    localStorage.clear();
    setActiveProgressUser(MI_FIXTURE_UID);
    const gaps = () => getWrongConceptsForTopic("real-numbers").reduce((s, e) => s + e.count, 0);
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    const before = gaps();
    const user = { uid: MI_FIXTURE_UID } as never;
    recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "loop-wrong", marksScored: 1, marksAvailable: 3, mode: "graded" });
    const afterWrong = gaps();
    recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "loop-right", marksScored: 3, marksAvailable: 3, mode: "graded" });
    expect({ before, afterWrong, afterClean: gaps() }).toMatchInlineSnapshot(`
      {
        "afterClean": 1,
        "afterWrong": 2,
        "before": 2,
      }
    `);
  });
});
