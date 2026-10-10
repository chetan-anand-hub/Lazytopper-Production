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
 *   (iv)  OR-LIVE L3 + controller rulings R1/R2 (2026-10-05) — through the REAL Chapter Test,
 *                      Full Mock, Worksheet and Quick Practice services (the MI front door is
 *                      real; only the log store's write is spied):
 *                        - a v2 loss made only of the SERVER's `unattempted` bucket, and a v1
 *                          question where EVERY step is "missing" with 0 awarded → NO entry;
 *                        - a v1 question with ONE untyped "missing" part (the rest correct) → an
 *                          entry (its loss is "reason not recorded", never "Not attempted");
 *                        - a "missing" step the grader TYPED → an entry, with its type.
 *                      CONTROL: a typed mistake on the same question writes exactly one entry.
 *   (v)   X of Y     — "1 of 3 graded", every not-graded question listed with its state; the
 *                      scorecard hero never folds a not-graded question into awarded/total.
 *   (vi)  notGraded  — A's PR-3 field (OWNER-APPROVED 2026-10-05): out of the score, "X of Y
 *                      graded", the owner's sentence per reason, no MI entry and no attempt
 *                      through the REAL CT / FM / WS / QP services; absent / null = graded.
 *   (vii) W2         — the C&I history card says "Some pages couldn't be read" ONLY when every
 *                      not-graded question was an unreadable page; else "Some answers weren't
 *                      graded"; an older record (no field) reads exactly as before.
 *   (viii) N1        — a RE-GRADE, through the REAL Worksheet service, of a paper recorded BEFORE
 *                      the identity key adds no second attempt (same result: nothing; a new
 *                      result: replaced). The cache-restore trigger: SolutionChecker.transition.
 *   (ix)  N7         — the paper-level mismatch line on both graded sheets is the owner's
 *                      sentence, verbatim.
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
    resolveStableMistakeLog: (...a: unknown[]) => H.removeStable(...a),
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
import { singleCheckToWorksheetResponse } from "./checkImproveGradeService";
import { getAttempts, saveInsights } from "./practiceInsights";
import { legacyAttemptKey } from "./attemptDedupKey";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import { CheckImproveGradedPrintDoc } from "../components/checkimprove/CheckImproveGradedPrintDoc";
import CheckImproveHistoryPanel from "../components/checkimprove/CheckImproveHistoryPanel";
import { buildCheckImproveSessionRecord, type SessionRecord } from "./sessionRecords";
import { detectedTextForResult } from "../utils/checkImproveDetection";
import { __resetFreeCheckAppCheckForTests } from "./freeCheckClient";
import { NotGradedList } from "../components/results/GradeStateParts";
import ResultsScorecard from "../components/results/ResultsScorecard";
import { worksheetScorecardVariant } from "../components/results/scorecardVariants";
import {
  ANSWER_MISMATCH_COPY,
  COULD_NOT_READ_COPY,
  NOT_GRADED_TRY_AGAIN_COPY,
  NOT_GRADED_WITHHELD_COPY,
  UNREAD_OPTION_COPY,
  coachingLine,
  gradeStateCopy,
  gradeStateOf,
  mismatchSummaryLine,
  paperGradedTotals,
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
/** v1: the WHOLE question not attempted — every marked step "missing", nothing awarded. */
const v1AllMissing = (q: number) =>
  row(q, { marksAwarded: 0, percentage: 0, annotatedSteps: [step(1, "missing", { marksDeducted: 2 }), step(2, "missing", { marksDeducted: 2 })] });
/** v2: a "missing" step the grader TYPED presentation 0.5 (a missing unit) — R1 keeps its type. */
const v2TypedMissing = (q: number) =>
  row(q, {
    marksAwarded: 3.5,
    percentage: 88,
    annotatedSteps: [step(1, "correct", { marksAwarded: 3.5 }), step(2, "missing", { marksDeducted: 0.5, mistakeType: "presentation" })],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
    marksLostByType: mk({ presentation: 0.5 }),
  });
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

type LoggedEntry = { marksLost: number; mistakeCounts: Record<string, number>; marksLostByType?: MarksLostByType; marksLostByTypeVersion?: number };

describe("(iv) OR-LIVE L3 / R1 / R2 — only a part the SERVER calls unattempted (or a wholly unattempted v1 question) creates NO MI entry", () => {
  for (const [name, run] of SURFACES) {
    it(`${name}: v2 'unattempted' part and a v1 question with EVERY step 'missing' → no entry, outcome not-attempted`, async () => {
      const outcomes = await run(`na-${name.slice(0, 2)}`, respOf([v2OnlyUnattempted(1), v1AllMissing(2)]));
      // liveness: both questions reached the MI front door
      expect(outcomes.map((o) => o.qNumber)).toEqual([1, 2]);
      expect(outcomes.map((o) => o.mistakeOutcome)).toEqual(["skipped-not-attempted", "skipped-not-attempted"]);
      expect(H.logMistakes).not.toHaveBeenCalled();
    });

    // R1/R2 (controller, 2026-10-05): ONE untyped "missing" part on an otherwise attempted v1
    // answer is NOT "Not attempted" — its loss is "reason not recorded", an MI entry; and a
    // "missing" step the grader TYPED keeps its type and its entry.
    it(`${name}: R1/R2 — a v1 untyped 'missing' part (rest correct) and a v2 TYPED 'missing' step each DO write an entry`, async () => {
      const outcomes = await run(`r12-${name.slice(0, 2)}`, respOf([v1OnlyMissing(1), v2TypedMissing(2)]));
      expect(outcomes.map((o) => o.qNumber)).toEqual([1, 2]);
      expect(outcomes.map((o) => o.mistakeOutcome)).toEqual(["logged", "logged"]);
      expect(H.logMistakes).toHaveBeenCalledTimes(2);
      const entries = H.logMistakes.mock.calls.map((c) => c[1] as LoggedEntry);
      // v1: the whole loss, count-only — no invented marks, no invented type
      expect(entries[0].marksLost).toBe(2);
      expect(entries[0].marksLostByType).toBeUndefined();
      expect(Object.values(entries[0].mistakeCounts).reduce((s, n) => s + n, 0)).toBe(0);
      // v2 typed "missing": the type is KEPT — in its marks and in its count
      expect(entries[1].marksLost).toBe(0.5);
      expect(entries[1].marksLostByType).toEqual(mk({ presentation: 0.5 }));
      expect(entries[1].marksLostByTypeVersion).toBe(1);
      expect(entries[1].mistakeCounts.presentation).toBe(1);
    });

    it(`${name}: CONTROL — a real typed slip on the same questions DOES write one entry each`, async () => {
      const outcomes = await run(`ctl-${name.slice(0, 2)}`, respOf([v2TypedSlip(1), v1TypedSlip(2)]));
      expect(outcomes.map((o) => o.mistakeOutcome)).toEqual(["logged", "logged"]);
      expect(H.logMistakes).toHaveBeenCalledTimes(2);
      const entries = H.logMistakes.mock.calls.map((c) => c[1] as LoggedEntry);
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

  // R3 (controller, 2026-10-05): couldNotRead ALWAYS wins ("retake the photo"); "couldn't read your
  // option" is ONLY an unresolved pick on an otherwise READ page (couldNotRead false).
  it("R3 — NotGradedList: an unread OPTION on a read page says the option copy; couldNotRead + objectiveResolved:false says 'retake the photo'", () => {
    const r = [
      row(1, { totalMarks: 1, marksAwarded: 0, couldNotRead: false, objectiveResolved: false, objective: true }),
      row(2, { totalMarks: 1, marksAwarded: 0, couldNotRead: true, objectiveResolved: false, objective: true }),
    ];
    const { container } = render(createElement(NotGradedList, { results: r }));
    expect(container.textContent).toContain("0 of 2 graded");
    const items = Array.from(container.querySelectorAll("li"));
    expect(items.map((li) => li.getAttribute("data-grade-state"))).toEqual(["unread-option", "could-not-read"]);
    expect(items[0].textContent).toBe(`Q1: ${UNREAD_OPTION_COPY}`);
    expect(items[1].textContent).toBe(`Q2: ${COULD_NOT_READ_COPY}`);
  });

  it("R3 — the scorecard pending strip names an unread OPTION (read page) and an unreadable objective apart, never folded", () => {
    const rs: WorksheetQuestionGrade[] = [
      row(1, { totalMarks: 3, marksAwarded: 2, percentage: 67 }),
      row(2, { totalMarks: 1, marksAwarded: 0, percentage: 0, couldNotRead: false, objectiveResolved: false, objective: true }),
      row(3, { totalMarks: 1, marksAwarded: 0, percentage: 0, couldNotRead: true, objectiveResolved: false, objective: true }),
    ];
    const response: WorksheetGradeResponse = { ok: true, results: rs, totalQuestions: 3, gradedCount: 1, pendingCount: 2, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 5 };
    const variant = worksheetScorecardVariant({ name: "Real Numbers · Worksheet 2", code: "WS-M-RN-02", response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const { baseElement: container } = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
    expect(container.querySelector(".lt-sc__big")!.textContent!.replace(/\s+/g, " ").trim()).toBe("2 / 3");
    const items = Array.from(container.querySelectorAll(".lt-sc__pend--item")).map((e) => [e.getAttribute("data-grade-state"), e.textContent]);
    expect(items).toEqual([
      ["unread-option", `Q2: ${UNREAD_OPTION_COPY}`],
      ["could-not-read", `Q3: ${COULD_NOT_READ_COPY}`],
    ]);
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
    const { baseElement: container } = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
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

/* ══ (vi) notGraded — A's PR-3 field, OWNER-APPROVED 2026-10-05 ═══════════════
 * A question the server did NOT grade (`notGraded` non-null) is out of the score ("X of Y
 * graded"), named in the owner's words, and records nothing: no MI entry, no attempt. Absent /
 * null is graded normally, so the order of the two merges does not matter. */
const notGradedRow = (q: number, reason: NonNullable<WorksheetQuestionGrade["notGraded"]>, over: Partial<WorksheetQuestionGrade> = {}) =>
  // Shaped like a REAL graded slip (marks, a typed step, a summary) so a leak would score it,
  // log it and record an attempt — only the server's notGraded verdict says otherwise.
  row(q, {
    marksAwarded: 0,
    percentage: 0,
    annotatedSteps: [step(1, "incorrect", { marksDeducted: 4, mistakeType: "conceptual" })],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    marksLostByType: mk({ conceptual: 4 }),
    notGraded: reason,
    ...over,
  });

describe("(vi) notGraded — out of the score, the owner's words, nothing recorded", () => {
  it("the ONE predicate: each reason is not graded with its approved sentence; absent / null is graded", () => {
    expect(gradeStateOf(row(1, {}))).toBe("graded");
    expect(gradeStateOf(row(1, { notGraded: null }))).toBe("graded");
    expect(gradeStateOf(notGradedRow(1, "unreadable"))).toBe("could-not-read");
    expect(gradeStateCopy(notGradedRow(1, "unreadable"))).toBe("We couldn't read this answer — retake the photo");
    for (const reason of ["timeout", "error"] as const) {
      expect(gradeStateOf(notGradedRow(1, reason))).toBe("not-graded");
      expect(gradeStateCopy(notGradedRow(1, reason))).toBe("We couldn't grade this question this time — please try again");
    }
    expect(gradeStateCopy(notGradedRow(1, "withheld"))).toBe("We couldn't grade this answer reliably — please try again");
    // a reason this client does not know yet is still NOT graded (never a 0), told to try again
    expect(gradeStateCopy(row(1, { notGraded: "later-reason" as never }))).toBe(NOT_GRADED_TRY_AGAIN_COPY);
    expect(NOT_GRADED_WITHHELD_COPY).toBe("We couldn't grade this answer reliably — please try again");
  });

  it("X of Y graded — Chapter Test totals exclude it, count it pending and keep it in the paper total", () => {
    const paper = paperOf("ng-ct");
    const subjective: WorksheetGradeResponse = respOf([notGradedRow(1, "timeout"), row(2, { totalMarks: 4, marksAwarded: 3, percentage: 75 })]);
    const out = buildChapterTestResponse({ paper, objective: scoreObjectiveSection([], {}), subjectiveQuestions: paper.questions, subjectiveResponse: subjective });
    expect([out.gradedCount, out.totalQuestions, out.pendingCount]).toEqual([1, 2, 1]);
    expect([out.gradedMarksAwarded, out.gradedMarksTotal, out.worksheetTotalMarks]).toEqual([3, 4, 8]);
    expect(paperGradedTotals(out.results)).toEqual({ awarded: 3, total: 4, gradedCount: 1, notGradedCount: 1 });
    // the single C&I adapter: nothing graded, one pending, the question's marks still in the paper total
    const single = singleCheckToWorksheetResponse({ ...notGradedRow(1, "withheld"), ok: true, totalMarks: 4, marksAwarded: 0, percentage: 0, annotatedSteps: [], teacherNote: "" } as never);
    expect([single.gradedCount, single.pendingCount, single.gradedMarksTotal, single.worksheetTotalMarks]).toEqual([0, 1, 0, 4]);
    expect(single.results[0].notGraded).toBe("withheld");
  });

  it("the scorecard: hero '3 / 4' across 1 of 3, each notGraded Q named with its sentence, never called unreadable", () => {
    const rs: WorksheetQuestionGrade[] = [
      row(1, { totalMarks: 4, marksAwarded: 3, percentage: 75 }),
      notGradedRow(2, "timeout"),
      notGradedRow(3, "withheld", { totalMarks: 2 }),
    ];
    const response: WorksheetGradeResponse = { ok: true, results: rs, totalQuestions: 3, gradedCount: 1, pendingCount: 2, gradedMarksAwarded: 3, gradedMarksTotal: 4, worksheetTotalMarks: 10 };
    const variant = worksheetScorecardVariant({ name: "Real Numbers · Worksheet 3", code: "WS-M-RN-03", response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const { baseElement: container } = render(createElement(ResultsScorecard, { variant, onClose: () => {} }));
    expect(container.querySelector(".lt-sc__big")!.textContent!.replace(/\s+/g, " ").trim()).toBe("3 / 4");
    expect(container.querySelector(".lt-sc__desc")!.textContent).toContain("across 1 of 3");
    const pend = Array.from(container.querySelectorAll(".lt-sc__pend")).map((e) => [e.getAttribute("data-grade-state"), e.textContent]);
    expect(pend).toEqual([
      ["not-graded", "Q2: We couldn't grade this question this time — please try again"],
      ["not-graded", "Q3: We couldn't grade this answer reliably — please try again"],
    ]);
    expect(container.textContent).not.toContain("couldn’t be read");
    expect(container.textContent).not.toMatch(/3 \/ (8|10)/);
    // the coaching line names them and never asks to re-upload a page that was read
    const line = coachingLine({ marksAwarded: 3, marksTotal: 4, counts: null, pendingCount: 2, notGradedCount: 2 });
    // W1 (controller wording ruling, 2026-10-05) — verbatim, plural
    expect(line).toContain("2 answers couldn't be graded this time — they're not in your score. Please try again.");
    expect(line).not.toContain("Re-upload");
  });

  it("the C&I graded sheet never claims 'All answers read and graded' over a notGraded question", () => {
    const qs = [row(1, { totalMarks: 4, marksAwarded: 3 }), notGradedRow(2, "error")];
    const { container } = render(createElement(CheckImproveGradedPrintDoc, { code: "CI-M-RN-01", name: "Real Numbers · Check & Improve paper", questions: qs, gradedMarksAwarded: 3, gradedMarksTotal: 4, pendingCount: 1, coaching: "" }));
    expect(container.textContent).not.toContain("All answers read and graded");
    expect(container.querySelector('.lt-cigp__pending[data-grade-state="not-graded"]')!.textContent).toBe(
      // W1 — verbatim, singular
      "1 answer couldn't be graded this time — it's not in your score. Please try again.",
    );
    expect(container.textContent).not.toContain("pages pending");
  });

  for (const [name, run] of SURFACES) {
    it(`${name}: a notGraded question writes NO MI entry and NO attempt; CONTROL: the graded slip beside it writes one of each`, async () => {
      const outcomes = await run(`ng-${name.slice(0, 2)}`, respOf([notGradedRow(1, "timeout"), v2TypedSlip(2)]));
      expect(H.logMistakes).toHaveBeenCalledTimes(1);
      expect(outcomes.filter((o) => o.mistakeOutcome === "logged").map((o) => o.qNumber)).toEqual([2]);
      const attempts = getAttempts();
      expect(attempts).toHaveLength(1);
      expect(attempts[0].marksScored).toBe(1);
    });
  }

  it("Quick Practice keeps the server's reason on the entry, so the sheet says THAT sentence", async () => {
    const answers = [1, 2].map((n) => ({ questionId: `bank-ngqp-${n}`, qNumber: n, marks: 4, questionText: `Q ${n}`, topicLabel: "Real Numbers", topicKey: "real-numbers", imageBase64: "IMG" }));
    const out = await gradeQuickPracticeBatch({ worksheetId: "qp-ng", subject: "Maths", answers, user: USER, grade: async () => respOf([notGradedRow(1, "withheld"), v2TypedSlip(2)]) });
    expect(out.outcome).toBe("graded");
    const entries = (out as unknown as { entries: Array<{ graded?: unknown; notGraded?: string; notGradedReason?: string }> }).entries;
    expect([entries[0].graded, entries[0].notGraded, entries[0].notGradedReason]).toEqual([undefined, "not-graded", "withheld"]);
    expect(entries[1].notGraded).toBeUndefined();
  });
});

/* ══ (vii) W2 — the C&I history card names what was not graded (controller ruling 2026-10-05) ══ */
describe("(vii) W2 — 'Some pages couldn't be read' only when EVERY not-graded question was an unreadable page", () => {
  const ciResp = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => {
    const graded = results.filter((r) => gradeStateOf(r) === "graded");
    return { ok: true, results, totalQuestions: results.length, gradedCount: graded.length, pendingCount: results.length - graded.length, gradedMarksAwarded: graded.reduce((a, r) => a + (Number(r.marksAwarded) || 0), 0), gradedMarksTotal: graded.reduce((a, r) => a + (Number(r.totalMarks) || 0), 0), worksheetTotalMarks: results.reduce((a, r) => a + (Number(r.totalMarks) || 0), 0) };
  };
  const recOf = (code: string, results: WorksheetQuestionGrade[]) =>
    buildCheckImproveSessionRecord({ code, title: code, subject: "maths", topicSlug: "real-numbers", topicSource: "confirmed", response: ciResp(results), uid: "u-w2" });
  const cardText = (records: SessionRecord[]) => {
    const { container } = render(createElement(CheckImproveHistoryPanel, { records, loading: false, defaultSubject: "maths", onOpen: () => {}, onClose: () => {} }));
    const out = Array.from(container.querySelectorAll('[data-testid="ci-hcard-partial"]')).map((e) => e.textContent);
    cleanup();
    return out;
  };

  it("the record carries the fact: all unreadable → true; an unreadable page beside a mismatch / a notGraded → false; fully graded → absent", () => {
    expect(recOf("CI-M-W2-01", [row(1, {}), row(2, { couldNotRead: true, totalMarks: 2 }), notGradedRow(3, "unreadable")]).notGradedAllUnread).toBe(true);
    expect(recOf("CI-M-W2-02", [row(1, {}), row(2, { couldNotRead: true, totalMarks: 2 }), row(3, { answerMismatch: true, marksAwarded: 0 })]).notGradedAllUnread).toBe(false);
    expect(recOf("CI-M-W2-03", [row(1, {}), notGradedRow(2, "timeout")]).notGradedAllUnread).toBe(false);
    expect("notGradedAllUnread" in recOf("CI-M-W2-04", [row(1, {}), row(2, {})])).toBe(false);
  });

  it("the card: a mismatch or a notGraded → 'Some answers weren't graded'; all unreadable → 'Some pages couldn't be read'", () => {
    expect(cardText([recOf("CI-M-W2-05", [row(1, {}), row(2, { answerMismatch: true, marksAwarded: 0 })])])).toEqual([
      "Some answers weren’t graded on this session — the score shows the graded portion only.",
    ]);
    expect(cardText([recOf("CI-M-W2-06", [row(1, {}), notGradedRow(2, "withheld")])])).toEqual([
      "Some answers weren’t graded on this session — the score shows the graded portion only.",
    ]);
    expect(cardText([recOf("CI-M-W2-07", [row(1, {}), row(2, { couldNotRead: true, totalMarks: 2 })])])).toEqual([
      "Some pages couldn’t be read on this session — the score shows the graded portion only.",
    ]);
  });

  it("an OLDER record (no field: before PR-2 an unreadable page was the only not-graded state) reads exactly as before", () => {
    const old = recOf("CI-M-W2-08", [row(1, {}), row(2, { couldNotRead: true, totalMarks: 2 })]);
    delete (old as { notGradedAllUnread?: boolean }).notGradedAllUnread;
    expect(cardText([old])).toEqual(["Some pages couldn’t be read on this session — the score shows the graded portion only."]);
  });
});

/* ══ (viii) N1 — the transition, through the REAL re-grade trigger (verifier N1, fix round 2026-10-05) ══ */
describe("(viii) N1 — re-grading a worksheet recorded BEFORE the identity key never adds a second attempt", () => {
  /** Turn the store into what the PRE-change code left: time-based local ids + the old score-keyed
   *  keys in the device's `seen` list. */
  const toPreChange = (withOldKeys: boolean) => {
    const now = getAttempts();
    saveInsights({ attempts: now.map((a, i) => ({ ...a, id: `${a.questionId}-real-numbers-legacy${i}` })) });
    localStorage.setItem(
      "lazytopper.attempt.dedup.v1",
      JSON.stringify(withOldKeys ? now.map((a) => legacyAttemptKey("u-pr2-items", { questionId: a.questionId }, Number(a.marksScored), Number(a.marksAvailable))) : []),
    );
  };
  const q1 = (awarded: number) => row(1, { marksAwarded: awarded, percentage: awarded * 25, annotatedSteps: [step(1, "partial", { marksAwarded: awarded, marksDeducted: 4 - awarded, mistakeType: "calculation" })], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, marksLostByType: mk({ calculation: 4 - awarded }) });
  const q2 = () => row(2, { marksAwarded: 4, percentage: 100, marksLostByType: mk() });

  it("★ the SAME result re-graded → still ONE attempt per question; a CHANGED result → replaced, still ONE (latest)", async () => {
    H.gradeWorksheet.mockResolvedValue(respOf([q1(1), q2()]));
    await gradeWorksheetAndRecord(USER, paperOf("n1-ws"), UPLOAD);
    expect(getAttempts()).toHaveLength(2);
    toPreChange(true);
    await gradeWorksheetAndRecord(USER, paperOf("n1-ws"), UPLOAD);
    expect(getAttempts()).toHaveLength(2);
    H.gradeWorksheet.mockResolvedValue(respOf([q1(3), q2()]));
    await gradeWorksheetAndRecord(USER, paperOf("n1-ws"), UPLOAD);
    const all = getAttempts();
    expect(all).toHaveLength(2);
    expect(all.map((a) => a.marksScored).sort()).toEqual([3, 4]);
  });

  it("CONTROL — the same re-grade WITHOUT the old keys doubles every question (the transition guard is what holds it at one)", async () => {
    H.gradeWorksheet.mockResolvedValue(respOf([q1(1), q2()]));
    await gradeWorksheetAndRecord(USER, paperOf("n1-ctl"), UPLOAD);
    toPreChange(false);
    await gradeWorksheetAndRecord(USER, paperOf("n1-ctl"), UPLOAD);
    expect(getAttempts()).toHaveLength(4);
  });
});

/* ══ (ix) N7 — the paper-level mismatch line is the owner's sentence, verbatim ══════════════════ */
describe("(ix) N7 — both graded sheets name a mismatched answer in the owner's words, never a paraphrase", () => {
  const mism = row(2, { totalMarks: 3, marksAwarded: 0, percentage: 0, answerMismatch: true, marksLostByType: mk() });
  it("★ the worksheet sheet, the C&I sheet and the panel's line all carry ANSWER_MISMATCH_COPY verbatim", () => {
    const response: WorksheetGradeResponse = { ok: true, results: [row(1, { totalMarks: 4, marksAwarded: 3 }), mism], totalQuestions: 2, gradedCount: 1, pendingCount: 1, gradedMarksAwarded: 3, gradedMarksTotal: 4, worksheetTotalMarks: 7 };
    const ws = render(createElement(WorksheetGradedPrintDoc, { ws: paperOf("n7"), response, name: "Real Numbers · Worksheet 1", code: "WS-M-RN-01", coaching: "" }));
    expect(ws.container.querySelector('.lt-gp__pending[data-grade-state="answer-mismatch"]')!.textContent).toContain(`1 answer not marked: ${ANSWER_MISMATCH_COPY}.`);
    cleanup();
    const ci = render(createElement(CheckImproveGradedPrintDoc, { code: "CI-M-RN-01", name: "Real Numbers · Check & Improve paper", questions: [row(1, { totalMarks: 4, marksAwarded: 3 }), mism], gradedMarksAwarded: 3, gradedMarksTotal: 4, pendingCount: 1, coaching: "" }));
    expect(ci.container.querySelector('.lt-cigp__pending[data-grade-state="answer-mismatch"]')!.textContent).toContain(`1 answer not marked: ${ANSWER_MISMATCH_COPY}.`);
    expect(mismatchSummaryLine(2)).toBe(`2 answers not marked: ${ANSWER_MISMATCH_COPY}.`);
  });
});
