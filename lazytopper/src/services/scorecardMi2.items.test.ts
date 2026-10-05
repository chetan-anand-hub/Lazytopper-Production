/**
 * SCORECARD-MI-1 PR-2 — one pin per behaviour item that is not a per-surface render
 * (those are in scorecardMi2.surfaces.test.tsx). Each `describe` names the item it pins.
 *
 *   (i)   acceptsV2  — every grading POST asks for the v2 grade; the signed-out free check
 *                      is sent byte-unchanged (its request shape is fixed — spec §1).
 *   (ii)  B9         — Chapter Test / Full Mock Section A is scored by the ONE shared
 *                      objective scorer (a LETTER pick against an option-text key), and the
 *                      objective row's loss is in marks: unanswered = not attempted.
 *   (iii) OR-LIVE L1 — two questions both printed "Q5" each keep their OWN detected text
 *                      (the rendered C&I path is pinned in the surfaces suite).
 *   (iv)  OR-LIVE L3 — a question whose only loss is a part NOT attempted creates NO Mistake
 *                      Intelligence entry, through the REAL Chapter Test, Full Mock,
 *                      Worksheet and Quick Practice services (the MI front door is real;
 *                      only the log store's write is spied). CONTROL: a typed mistake on the
 *                      same question writes exactly one entry.
 *   (v)   X of Y     — "1 of 3 graded", every not-graded question listed with its state; the
 *                      scorecard hero never folds a not-graded question into awarded/total.
 *
 * Each assertion is a DECISION: if one goes red, a ruling changed (or the code regressed).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { render, cleanup } from "@testing-library/react";

/* ── hoisted spies ──────────────────────────────────────────────────────────── */
const H = vi.hoisted(() => ({
  gradeWorksheet: vi.fn(),
  logMistakes: vi.fn(async (..._a: unknown[]) => {}),
  removeStable: vi.fn(async (..._a: unknown[]) => false),
  minted: 0,
}));

// The real aiClient (for the acceptsV2 wire pin) reads identity from here: no signed-in
// Firebase user → a paid call carries JSON only; `app` lets the free check mint its token.
// `firestoreDb: null` keeps every store write device-local (no network).
vi.mock("./firebaseClient", () => ({
  firebaseConfigured: true,
  firebaseProjectId: "scorecard-mi-2",
  app: {},
  authClient: { currentUser: null },
  firestoreDb: null,
  getPopupRedirectResolver: () => undefined,
  prewarmPopupRedirectResolver: () => {},
}));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: () => ({}),
  getLimitedUseToken: async () => ({ token: `limited-${++H.minted}` }),
  getToken: async () => ({ token: "cached-token" }),
  ReCaptchaEnterpriseProvider: class {},
}));
// The services' grade call is the network seam; everything downstream is real.
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a) };
});
// The MI log STORE's write is the observation point; the front door (recordMistake) is REAL.
vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return {
    ...actual,
    logMistakes: (...a: unknown[]) => H.logMistakes(...a),
    removeStableMistakeLog: (...a: unknown[]) => H.removeStable(...a),
  };
});
// Concept resolution reads the question bank; L3 is not about concepts.
vi.mock("./mistakeConcept", () => ({ conceptForBankQuestionId: () => undefined }));
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: () => "recorded",
    writeSessionPerQuestion: () => {},
    ensureWorksheetSessionCode: async () => ({ code: "WS-M-RN-01", name: "Real Numbers · Worksheet 1", kind: "single", sequence: 1 }),
  };
});
vi.mock("./worksheetSessionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./worksheetSessionStore")>();
  return { ...actual, saveWorksheetGrade: () => {}, listStoredWorksheetsLite: () => [] };
});

import { scoreObjectiveSection, buildChapterTestResponse, gradeChapterTestUpload } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeQuickPracticeBatch } from "./quickPracticeSessionService";
import { detectedTextForResult } from "../utils/checkImproveDetection";
import { __resetFreeCheckAppCheckForTests } from "./freeCheckClient";
import { NotGradedList } from "../components/results/GradeStateParts";
import ResultsScorecard from "../components/results/ResultsScorecard";
import { worksheetScorecardVariant } from "../components/results/scorecardVariants";
import {
  ANSWER_MISMATCH_COPY,
  COULD_NOT_READ_COPY,
  UNREAD_OPTION_COPY,
  zeroMarksLost,
  type MarksLostByType,
} from "../lib/mistakeDisplay";
import type {
  CheckSolutionAnnotatedStep,
  WorksheetGradeResponse,
  WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";

const USER = { uid: "u-pr2-items", isLocalSession: false } as never;
const mk = (over: Partial<MarksLostByType> = {}): MarksLostByType => ({ ...zeroMarksLost(), ...over });

beforeEach(() => {
  H.gradeWorksheet.mockReset();
  H.logMistakes.mockReset();
  H.logMistakes.mockResolvedValue(undefined);
  H.removeStable.mockReset();
  H.removeStable.mockResolvedValue(false);
  window.localStorage.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* ══ (i) acceptsV2 ════════════════════════════════════════════════════════════ */
describe("(i) acceptsV2 — every grading POST asks for the v2 grade; the free check is unchanged", () => {
  type Sent = { url: string; body: unknown };
  let sent: Sent[] = [];
  beforeEach(() => {
    sent = [];
    __resetFreeCheckAppCheckForTests();
    vi.stubGlobal("fetch", async (url: string, init: { body?: string }) => {
      sent.push({ url, body: init.body ? JSON.parse(init.body) : undefined });
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, results: [] }) };
    });
  });
  // The REAL client (this file mocks gradeWorksheet for the services below).
  const real = () => vi.importActual<typeof import("../ai/aiClient")>("../ai/aiClient");

  it("checkSolutionImage and gradeWorksheet POST `acceptsV2: true` beside the request, unchanged otherwise", async () => {
    const ai = await real();
    await ai.checkSolutionImage({ question: "Q", textAnswer: "an answer", marks: 3 });
    await ai.gradeWorksheet({ worksheetId: "w", questions: [{ qNumber: 1, marks: 2, questionText: "Q1" }] });
    expect(sent.map((s) => s.url)).toEqual(["/api/check-solution", "/api/grade-worksheet"]);
    expect(sent[0].body).toEqual({ question: "Q", textAnswer: "an answer", marks: 3, acceptsV2: true });
    expect(sent[1].body).toEqual({ worksheetId: "w", questions: [{ qNumber: 1, marks: 2, questionText: "Q1" }], acceptsV2: true });
  });

  it("the signed-out FREE check is sent byte-unchanged — NO acceptsV2 (spec §1, [FU-B15-FREECHECK-V2])", async () => {
    const ai = await real();
    await ai.checkSolutionImage({ question: "Q", textAnswer: "an answer" }, { freeCheck: true });
    await ai.gradeWorksheet({ worksheetId: "ci:x", questions: [] }, { freeCheck: true });
    expect(sent).toHaveLength(2);
    expect(sent[0].body).toEqual({ question: "Q", textAnswer: "an answer" });
    expect(sent[1].body).toEqual({ worksheetId: "ci:x", questions: [] });
    for (const s of sent) expect(Object.keys(s.body as object)).not.toContain("acceptsV2");
  });
});

/* ══ (ii) B9 — the shared objective scorer ═══════════════════════════════════ */
const OPTIONS = ["2", "root 2", "4", "8"];
const mcqQ = (qNumber: number, marks = 1): PersistedWorksheetQuestion => ({
  qNumber,
  id: `b9-${qNumber}`,
  subject: "Maths",
  topicKey: "real-numbers",
  topicLabel: "Real Numbers",
  section: "A",
  marks,
  questionText: `MCQ ${qNumber}`,
  options: OPTIONS,
  answer: "root 2",
});

describe("(ii) B9 — Section A is scored by the ONE shared objective scorer", () => {
  it("a LETTER pick '(b)' against an option-TEXT key is CORRECT (the old case-folding compare scored it 0)", () => {
    const s = scoreObjectiveSection([mcqQ(1)], { 1: "(b)" });
    expect(s.results[0]).toMatchObject({ qNumber: 1, selected: "(b)", correct: true, awarded: 1, total: 1 });
    expect(s.awarded).toBe(1);
    // the option text itself, any case, is the same pick
    expect(scoreObjectiveSection([mcqQ(1)], { 1: "Root 2" }).results[0].correct).toBe(true);
  });

  it("a wrong letter is 0; unanswered is 0 and not counted as answered", () => {
    const s = scoreObjectiveSection([mcqQ(1), mcqQ(2)], { 1: "(a)" });
    expect(s.results.map((r) => [r.correct, r.awarded])).toEqual([[false, 0], [false, 0]]);
    expect(s.answeredCount).toBe(1);
  });

  it("the objective ROW's loss is in marks: unanswered = NOT ATTEMPTED (its full marks); a wrong pick = reason not recorded; right = nothing", () => {
    const paper = { worksheetId: "ct-b9", totalMarks: 4, questions: [mcqQ(1), mcqQ(2), mcqQ(3, 2)] } as unknown as PersistedWorksheet;
    const objective = scoreObjectiveSection(paper.questions, { 1: "(b)", 3: "(d)" });
    const res = buildChapterTestResponse({ paper, objective, subjectiveQuestions: [], subjectiveResponse: null });
    const row = (n: number) => res.results.find((r) => r.qNumber === n)!;
    expect(row(1).marksLostByType).toEqual(mk());
    expect(row(1).marksAwarded).toBe(1);
    expect(row(2).marksAwarded).toBe(0);
    expect(row(2).marksLostByType).toEqual(mk({ unattempted: 1 }));
    expect(row(3).marksAwarded).toBe(0);
    expect(row(3).marksLostByType).toEqual(mk({ untyped: 2 }));
    expect(res.gradedMarksAwarded).toBe(1);
    expect(res.gradedMarksTotal).toBe(4);
  });
});

/* ══ (iii) OR-LIVE L1 — the detected text per OCCURRENCE ═════════════════════ */
describe("(iii) OR-LIVE L1 — two questions printed 'Q5' keep their OWN text", () => {
  const detected = [
    { questionNumber: 5, questionText: "Find the HCF of 96 and 404." },
    { questionNumber: 5, questionText: "Prove that root 3 is irrational." },
    { questionNumber: 6, questionText: "Solve 2x + 3 = 7." },
  ];
  it("the 1st and 2nd 'Q5' results get the 1st and 2nd 'Q5' texts; a unique number its own", () => {
    const results = [{ qNumber: 5 }, { qNumber: 5 }, { qNumber: 6 }];
    expect(results.map((_, i) => detectedTextForResult(detected, results, i))).toEqual([
      "Find the HCF of 96 and 404.",
      "Prove that root 3 is irrational.",
      "Solve 2x + 3 = 7.",
    ]);
  });
  it("an occurrence with no detected twin gets NO text — never another question's", () => {
    const results = [{ qNumber: 5 }, { qNumber: 5 }, { qNumber: 5 }];
    expect(detectedTextForResult(detected, results, 2)).toBeUndefined();
    expect(detectedTextForResult(detected, results, 7)).toBeUndefined();
    expect(detectedTextForResult(null, results, 0)).toBeUndefined();
  });
});

/* ══ (iv) OR-LIVE L3 — a part NOT attempted is never an MI entry ═════════════ */
const step = (n: number, status: CheckSolutionAnnotatedStep["status"], over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep => ({
  stepNumber: n,
  description: `Step ${n}`,
  studentWork: status === "unattempted" || status === "missing" ? "" : `work ${n}`,
  status,
  marksAwarded: 0,
  marksDeducted: 0,
  teacherAnnotation: "",
  mistakeType: null,
  correctedWorking: null,
  ...over,
});
const row = (qNumber: number, over: Partial<WorksheetQuestionGrade>): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: 4,
  marksAwarded: 2,
  percentage: 50,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
  ...over,
});
/** v2: part (i) fully right, part (ii) NOT attempted — its loss is all `unattempted`. */
const v2OnlyUnattempted = (q: number) =>
  row(q, {
    annotatedSteps: [step(1, "correct", { marksAwarded: 2 }), step(2, "unattempted", { marksDeducted: 2 })],
    marksLostByType: mk({ unattempted: 2 }),
  });
/** v1 (no marksLostByType): every marked step right except one "missing" that earned 0. */
const v1OnlyMissing = (q: number) =>
  row(q, { annotatedSteps: [step(1, "correct", { marksAwarded: 2 }), step(2, "missing", { marksDeducted: 2 })] });
/** CONTROL — the SAME question with a real, typed slip in part (i) (v2). */
const v2TypedSlip = (q: number) =>
  row(q, {
    marksAwarded: 1,
    percentage: 25,
    annotatedSteps: [step(1, "partial", { marksAwarded: 1, marksDeducted: 1, mistakeType: "calculation" }), step(2, "unattempted", { marksDeducted: 2 })],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    marksLostByType: mk({ calculation: 1, unattempted: 2 }),
  });
/** CONTROL — the v1 twin: a typed wrong step beside the missing one. */
const v1TypedSlip = (q: number) =>
  row(q, {
    marksAwarded: 1,
    percentage: 25,
    annotatedSteps: [step(1, "incorrect", { marksDeducted: 1, mistakeType: "calculation" }), step(2, "correct", { marksAwarded: 1 }), step(3, "missing", { marksDeducted: 2 })],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  });

const respOf = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0),
  gradedMarksTotal: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
  worksheetTotalMarks: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
});
const paperOf = (id: string): PersistedWorksheet => ({
  worksheetId: id,
  createdAt: "2026-10-05T09:00:00.000Z",
  title: `L3 ${id}`,
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 8,
  questions: [1, 2].map((n) => ({
    qNumber: n,
    id: `l3-${id}-${n}`,
    subject: "Maths",
    topicKey: "real-numbers",
    topicLabel: "Real Numbers",
    section: "D",
    marks: 4,
    questionText: `L3 question ${n}`,
  })),
});
const UPLOAD = { imageBase64: "AAAA", imageMimeType: "application/pdf" };

type Run = (id: string, body: WorksheetGradeResponse) => Promise<Array<{ qNumber: number; mistakeOutcome: string }>>;
const SURFACES: Array<[string, Run]> = [
  [
    "Chapter Test (chapterTestGradeService)",
    async (id, body) => {
      H.gradeWorksheet.mockResolvedValue(body);
      const paper = paperOf(id);
      const out = await gradeChapterTestUpload({ user: USER, paper, code: `CT-${id}`, subject: "maths", topicKey: "real-numbers", objective: scoreObjectiveSection([], {}), subjectiveQuestions: paper.questions, upload: UPLOAD });
      return out.miOutcomes;
    },
  ],
  [
    "Full Mock (fullMockGradeService)",
    async (id, body) => {
      H.gradeWorksheet.mockResolvedValue(body);
      const paper = paperOf(id);
      const out = await gradeFullMockUpload({ user: USER, paper, code: `FM-${id}`, subject: "maths", objective: scoreObjectiveSection([], {}), subjectiveQuestions: paper.questions, upload: UPLOAD });
      return out.miOutcomes;
    },
  ],
  [
    "Worksheet (worksheetGradeService)",
    async (id, body) => {
      H.gradeWorksheet.mockResolvedValue(body);
      const out = await gradeWorksheetAndRecord(USER, paperOf(id), UPLOAD);
      return out.miOutcomes;
    },
  ],
  [
    "Quick Practice (gradeQuickPracticeBatch)",
    async (id, body) => {
      const answers = [1, 2].map((n) => ({ questionId: `bank-${id}-${n}`, qNumber: n, marks: 4, questionText: `L3 question ${n}`, topicLabel: "Real Numbers", topicKey: "real-numbers", imageBase64: "IMG" }));
      const out = await gradeQuickPracticeBatch({ worksheetId: `qp-${id}`, subject: "Maths", answers, user: USER, grade: async () => body });
      return out.miOutcomes;
    },
  ],
];

describe("(iv) OR-LIVE L3 — a question whose ONLY loss is a part not attempted creates NO MI entry", () => {
  for (const [name, run] of SURFACES) {
    it(`${name}: v2 'unattempted' part and v1 'missing' part → no entry, outcome not-attempted`, async () => {
      const outcomes = await run(`na-${name.slice(0, 2)}`, respOf([v2OnlyUnattempted(1), v1OnlyMissing(2)]));
      // liveness: both questions reached the MI front door
      expect(outcomes.map((o) => o.qNumber)).toEqual([1, 2]);
      expect(outcomes.map((o) => o.mistakeOutcome)).toEqual(["skipped-not-attempted", "skipped-not-attempted"]);
      expect(H.logMistakes).not.toHaveBeenCalled();
    });

    it(`${name}: CONTROL — a real typed slip on the same questions DOES write one entry each`, async () => {
      const outcomes = await run(`ctl-${name.slice(0, 2)}`, respOf([v2TypedSlip(1), v1TypedSlip(2)]));
      expect(outcomes.map((o) => o.mistakeOutcome)).toEqual(["logged", "logged"]);
      expect(H.logMistakes).toHaveBeenCalledTimes(2);
      const entries = H.logMistakes.mock.calls.map((c) => c[1] as { marksLost: number; mistakeCounts: Record<string, number>; marksLostByType?: MarksLostByType; marksLostByTypeVersion?: number });
      expect(entries.map((e) => e.mistakeCounts.calculation)).toEqual([1, 1]);
      // the v2 entry carries its versioned marks (the not-attempted part is IN the record, never a mistake)
      expect(entries[0].marksLostByType).toEqual(mk({ calculation: 1, unattempted: 2 }));
      expect(entries[0].marksLostByTypeVersion).toBe(1);
      // the v1 entry is count-only — never given invented marks
      expect(entries[1].marksLostByType).toBeUndefined();
    });
  }
});

/* ══ (v) X of Y graded ════════════════════════════════════════════════════════ */
describe("(v) 'X of Y graded' — not-graded questions are listed, never folded into the score", () => {
  const results: Array<WorksheetQuestionGrade> = [
    row(1, { totalMarks: 3, marksAwarded: 2, percentage: 67 }),
    row(2, { totalMarks: 3, marksAwarded: 0, percentage: 0, answerMismatch: true, marksLostByType: mk() }),
    row(3, { totalMarks: 2, couldNotRead: true }),
  ];

  it("NotGradedList: '1 of 3 graded', each not-graded Q listed by number with its own state", () => {
    const { container } = render(createElement(NotGradedList, { results }));
    const list = container.querySelector('[data-testid="not-graded-list"]');
    expect(list).not.toBeNull();
    expect(list!.textContent).toContain("1 of 3 graded");
    const items = Array.from(list!.querySelectorAll("li"));
    expect(items.map((li) => li.getAttribute("data-grade-state"))).toEqual(["answer-mismatch", "could-not-read"]);
    expect(items[0].textContent).toBe(`Q2: ${ANSWER_MISMATCH_COPY}`);
    expect(items[1].textContent).toBe(`Q3: ${COULD_NOT_READ_COPY}`);
    // the graded question is never in the not-graded list
    expect(list!.textContent).not.toContain("Q1:");
  });

  it("NotGradedList names an unread OPTION in the owner's words", () => {
    const r = [row(1, { totalMarks: 1, marksAwarded: 0, couldNotRead: true, objectiveResolved: false, objective: true })];
    const { container } = render(createElement(NotGradedList, { results: r }));
    expect(container.textContent).toContain("0 of 1 graded");
    expect(container.textContent).toContain(`Q1: ${UNREAD_OPTION_COPY}`);
  });

  it("CONTROL — every question graded → NotGradedList renders nothing", () => {
    const { container } = render(createElement(NotGradedList, { results: [results[0]] }));
    expect(container.querySelector('[data-testid="not-graded-list"]')).toBeNull();
  });

  it("the scorecard hero is the GRADED subtotal ('2 / 3', 1 of 3) and the pending strip names the mismatch apart", () => {
    const response: WorksheetGradeResponse = {
      ok: true,
      results,
      totalQuestions: 3,
      gradedCount: 1,
      pendingCount: 2,
      gradedMarksAwarded: 2,
      gradedMarksTotal: 3,
      worksheetTotalMarks: 8,
    };
    const variant = worksheetScorecardVariant({ name: "Real Numbers · Worksheet 1", code: "WS-M-RN-01", response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const { container } = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
    const big = container.querySelector(".lt-sc__big")!.textContent!.replace(/\s+/g, " ").trim();
    expect(big).toBe("2 / 3");
    expect(container.querySelector(".lt-sc__desc")!.textContent).toContain("across 1 of 3");
    const pend = Array.from(container.querySelectorAll(".lt-sc__pend")).map((e) => e.textContent ?? "");
    // one unreadable page, and the mismatched Q2 named with the owner's sentence
    // the unreadable one is counted AND named with its state; the mismatch is named apart
    expect(pend).toHaveLength(3);
    expect(pend[0]).toContain("1 question couldn’t be read");
    expect(pend[1]).toBe(`Q2: ${ANSWER_MISMATCH_COPY}`);
    expect(pend[2]).toMatch(/^Q\d+: We couldn't read this answer — retake the photo$/);
    // never folded: no "2 / 6", "2 / 8" or a 0-out-of anything for the mismatch
    expect(container.textContent).not.toMatch(/2 \/ (6|8)/);
  });
});
