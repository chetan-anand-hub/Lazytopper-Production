/**
 * SCORECARD-MI-1 PR-2 — the owner's answerMismatch addendum, pinned ONE SURFACE AT A TIME.
 *
 * The owner's sentence, VERBATIM (em dash included):
 *   "This answer doesn't seem to match the question — check you uploaded the right page"
 *
 * Every surface below is driven with a grade that says `answerMismatch: true` (and, as the
 * grader does, `marksAwarded: 0`). Each pin asserts three things for THAT question:
 *   1. the verbatim sentence is RENDERED;
 *   2. NO mark is shown for it (never a graded 0, never folded into the score);
 *   3. NOTHING is recorded for it — no Mistake Intelligence entry, no attempt, no session
 *      record on its own — while its graded siblings still are (the CONTROL that proves the
 *      recording path was live).
 *
 *   (a) Check & Improve — single (the REAL page, checkSolutionImage mocked) and multi (a
 *       2-question set, Q2 mismatched: Q1 recorded, Q2 not; "1 of 2 graded").
 *   (b) Practice — Quick Practice's batch service marks the entry `notGraded`, writes no MI
 *       for it, and the shared `notGradedAnswer` renders the sentence on the graded sheet.
 *   (c) Predicted Questions = SolutionChecker.
 *   (d) Chapter Test, (e) Full Mock, (f) Worksheets — the REAL grade service, then the
 *       scorecard (and, for worksheets, the graded PDF and the grade panel).
 *
 * Then the other honest states on the graded sheet, both PDFs and the C&I multi list:
 * couldNotRead and an unread option in the owner's words — R3 (controller, 2026-10-05):
 * couldNotRead ALWAYS says "retake the photo", even with objectiveResolved:false; "couldn't read
 * your option" is only an unresolved pick on an otherwise read page — a not-attempted step that never
 * reads "Incorrect −N", crossed-out work drawn APART (struck, outside the step list), the
 * rubric under its own heading and never inside the teacher's note — and OR-LIVE L1
 * through the rendered C&I multi path.
 *
 * HARNESS — the G3 pattern (gradeConsistency.pipeline.test.ts): an in-memory Firestore, the
 * network (aiClient detect / grade) replaced, the session and subscription hooks stubbed.
 * The MI front door and the attempt recorder are REAL, wrapped in call-through spies so a
 * pin can also say "never called".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

/* ── the in-memory Firestore + the network, hoisted so the module mocks can see them ── */
const H = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  return {
    store,
    auto: { n: 0 },
    auth: { user: null as null | Record<string, unknown>, loading: false },
    sub: {
      isPremium: true,
      isTrialExpired: false,
      hydrated: true,
      tier: "premium",
      isTrialActive: false,
      daysLeftInTrial: 0,
      startTrial: () => {},
      upgradeToPremium: () => {},
      status: { tier: "premium", plan: "monthly", trialStartDate: null, trialEndDate: null, premiumSince: null },
    },
    detectQuestion: vi.fn(),
    checkSolutionImage: vi.fn(),
    gradeWorksheet: vi.fn(),
  };
});

vi.mock("firebase/firestore", () => {
  type Ref = { __kind: "col" | "doc"; path: string; id?: string };
  type Q = { __kind: "query"; col: Ref; clauses: Array<{ t: string; a?: unknown; b?: unknown; c?: unknown }> };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const join = (segs: unknown[]) => segs.map(String).join("/");
  const collection = (base: unknown, ...segs: unknown[]): Ref => {
    const prefix = (base as Ref)?.__kind === "doc" ? (base as Ref).path + "/" : "";
    return { __kind: "col", path: prefix + join(segs) };
  };
  const doc = (base: unknown, ...segs: unknown[]): Ref => {
    if ((base as Ref)?.__kind === "col") {
      const id = segs.length ? String(segs[0]) : `auto${++H.auto.n}`;
      return { __kind: "doc", path: (base as Ref).path + "/" + id, id };
    }
    return { __kind: "doc", path: join(segs), id: String(segs[segs.length - 1]) };
  };
  const snap = (p: string, data: Record<string, unknown> | undefined) => ({
    id: p.split("/").pop() as string,
    ref: { path: p },
    exists: () => data !== undefined,
    data: () => clone(data),
  });
  const query = (col: Ref | Q, ...clauses: Q["clauses"]): Q =>
    (col as Q).__kind === "query" ? { ...(col as Q), clauses: [...(col as Q).clauses, ...clauses] } : { __kind: "query", col: col as Ref, clauses };
  return {
    initializeFirestore: () => ({ __fake: true }),
    getFirestore: () => ({ __fake: true }),
    collection,
    doc,
    query,
    where: (a: unknown, b: unknown, c: unknown) => ({ t: "where", a, b, c }),
    orderBy: (a: unknown, b: unknown = "asc") => ({ t: "orderBy", a, b }),
    limit: (a: unknown) => ({ t: "limit", a }),
    serverTimestamp: () => new Date().toISOString(),
    arrayUnion: (...v: unknown[]) => v,
    setDoc: async (ref: Ref, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      const prev = H.store.get(ref.path);
      H.store.set(ref.path, opts?.merge && prev ? { ...prev, ...clone(data) } : clone(data));
    },
    updateDoc: async (ref: Ref, data: Record<string, unknown>) => {
      H.store.set(ref.path, { ...(H.store.get(ref.path) ?? {}), ...clone(data) });
    },
    deleteDoc: async (ref: Ref) => {
      H.store.delete(ref.path);
    },
    addDoc: async (col: Ref, data: Record<string, unknown>) => {
      const ref = doc(col);
      H.store.set(ref.path, clone(data));
      return ref;
    },
    getDoc: async (ref: Ref) => snap(ref.path, H.store.get(ref.path)),
    getDocs: async (qOrCol: Ref | Q) => {
      const q: Q = (qOrCol as Q).__kind === "query" ? (qOrCol as Q) : { __kind: "query", col: qOrCol as Ref, clauses: [] };
      const prefix = q.col.path + "/";
      let rows = [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      for (const c of q.clauses) {
        if (c.t === "where") {
          const f = String(c.a);
          rows = rows.filter(([, d]) => {
            const x = d[f] as never;
            const v = c.c as never;
            return c.b === ">=" ? x >= v : c.b === "<=" ? x <= v : c.b === "==" ? x === v : c.b === "in" ? (v as unknown as unknown[]).includes(x) : true;
          });
        } else if (c.t === "orderBy") {
          const f = String(c.a);
          const dir = c.b === "desc" ? -1 : 1;
          rows.sort(([, a], [, b]) => ((a[f] as never) > (b[f] as never) ? 1 : (a[f] as never) < (b[f] as never) ? -1 : 0) * dir);
        } else if (c.t === "limit") rows = rows.slice(0, Number(c.a));
      }
      const docs = rows.map(([p, d]) => snap(p, d));
      return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn) };
    },
  };
});
vi.mock("./firebaseClient", () => ({
  firebaseConfigured: false,
  firebaseProjectId: "pr2-in-memory",
  firestoreDb: { __fake: true },
  authClient: null,
  app: null,
  getPopupRedirectResolver: () => undefined,
  prewarmPopupRedirectResolver: () => {},
}));
vi.mock("./usageClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./usageClient")>();
  return { ...actual, fetchUsageMe: async () => null };
});
vi.mock("../context/AuthContext", () => ({ useAuth: () => H.auth }));
// The entitlement gate: this file renders a gated page (Check & Improve). The student is
// premium (H.sub) AND the gate is stubbed the standard way (entitlementGating meta-guard).
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../components/auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: ReactNode }) => children,
  RequireAuth: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});
// The MI front door and the attempt recorder stay REAL — wrapped so "never called" is provable.
vi.mock("./mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeIntelligence")>();
  return { ...actual, recordMistake: vi.fn(actual.recordMistake) };
});
vi.mock("./practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./practiceInsights")>();
  return { ...actual, recordAttempt: vi.fn(actual.recordAttempt) };
});

import DesktopCheckImprovePage from "../pages/desktop/DesktopCheckImprovePage";
import { SolutionChecker } from "../components/question/SolutionChecker";
import ResultsScorecard from "../components/results/ResultsScorecard";
import {
  fullMockScorecardVariant,
  quickPracticeGradedScorecardVariant,
  worksheetScorecardVariant,
} from "../components/results/scorecardVariants";
import { chapterTestScorecardVariant } from "../components/results/scorecardBankLenses";
import { WorksheetGradedPrintDoc } from "../components/worksheet/WorksheetGradedPrintDoc";
import WorksheetGradePanel from "../components/worksheet/WorksheetGradePanel";
import { CheckImproveGradedPrintDoc } from "../components/checkimprove/CheckImproveGradedPrintDoc";
import { buildGradedAnswer, marksDescriptor, notGradedAnswer } from "./gradedAnswerAssembly";
import { buildChapterTestResponse, gradeChapterTestUpload, scoreObjectiveSection } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import { gradeQuickPracticeBatch } from "./quickPracticeSessionService";
import { recordMistake } from "./mistakeIntelligence";
import { recordAttempt } from "./practiceInsights";
import { setActiveProgressUser } from "./studentProgressStore";
import {
  ANSWER_MISMATCH_COPY,
  COULD_NOT_READ_COPY,
  MARKS_HEADING,
  RUBRIC_HEADING,
  UNREAD_OPTION_COPY,
  WITHDRAWN_HEADING,
  zeroMarksLost,
  type MarksLostByType,
} from "../lib/mistakeDisplay";
import type {
  CheckSolutionAnnotatedStep,
  CheckSolutionResponse,
  WorksheetGradeResponse,
  WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";

/* ── fixtures ───────────────────────────────────────────────────────────────── */
const UID = "pr2-student";
const USER = { uid: UID, isLocalSession: false, email: null, phoneNumber: null, displayName: "PR-2 Student" };
const COPY = ANSWER_MISMATCH_COPY;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const mk = (over: Partial<MarksLostByType> = {}): MarksLostByType => ({ ...zeroMarksLost(), ...over });
const ZERO = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };

const step = (n: number, status: CheckSolutionAnnotatedStep["status"], over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep => ({
  stepNumber: n,
  description: `Step ${n} of the method`,
  studentWork: "",
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
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { ...ZERO },
  teacherNote: "",
  ...over,
});
/** A GRADED v2 answer that lost one mark to a calculation slip. */
const gradedRow = (qNumber: number, total = 3) =>
  row(qNumber, {
    totalMarks: total,
    marksAwarded: total - 1,
    percentage: Math.round(((total - 1) / total) * 100),
    annotatedSteps: [step(1, "correct", { marksAwarded: total - 1, studentWork: "the method" }), step(2, "incorrect", { marksDeducted: 1, mistakeType: "calculation", studentWork: "77" })],
    mistakeSummary: { ...ZERO, calculation: 1 },
    marksLostByType: mk({ calculation: 1 }),
  });
/** The v2 grade for an answer that does NOT match its question: 0 awarded, all buckets 0. */
const mismatchRow = (qNumber: number, total = 3) =>
  row(qNumber, { totalMarks: total, marksAwarded: 0, percentage: 0, answerMismatch: true, departureKind: "different-problem", marksLostByType: mk() });
const respOf = (results: WorksheetQuestionGrade[], worksheetTotalMarks?: number): WorksheetGradeResponse => {
  const graded = results.filter((r) => !r.couldNotRead && r.answerMismatch !== true && r.objectiveResolved !== false);
  return {
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: graded.length,
    pendingCount: results.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0),
    gradedMarksTotal: graded.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
    worksheetTotalMarks: worksheetTotalMarks ?? results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
  };
};
const singleMismatch: CheckSolutionResponse = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 0,
  percentage: 0,
  annotatedSteps: [],
  mistakeSummary: { ...ZERO },
  teacherNote: "",
  couldNotRead: false,
  answerMismatch: true,
  departureKind: "different-problem",
  marksLostByType: mk(),
};
const singleGraded: CheckSolutionResponse = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [step(1, "correct", { marksAwarded: 2 }), step(2, "incorrect", { marksDeducted: 1, mistakeType: "calculation" })],
  mistakeSummary: { ...ZERO, calculation: 1 },
  teacherNote: "",
  answerMismatch: false,
  marksLostByType: mk({ calculation: 1 }),
};
const paperQ = (qNumber: number, marks: number, section: string, over: Partial<PersistedWorksheetQuestion> = {}): PersistedWorksheetQuestion => ({
  qNumber,
  id: `pr2-${section}-${qNumber}`,
  subject: "Maths",
  topicKey: "real-numbers",
  topicLabel: "Real Numbers",
  section,
  marks,
  questionText: `Question ${qNumber}: show your working.`,
  ...over,
});
const paperOf = (id: string, questions: PersistedWorksheetQuestion[]): PersistedWorksheet => ({
  worksheetId: id,
  createdAt: "2026-10-05T09:00:00.000Z",
  title: `PR-2 ${id}`,
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: questions.reduce((s, q) => s + q.marks, 0),
  questions,
});
const UPLOAD = { imageBase64: "AAAA", imageMimeType: "application/pdf" };

/* ── store read-outs ───────────────────────────────────────────────────────── */
type Doc = Record<string, unknown> & { path: string };
const docsUnder = (prefix: string): Doc[] =>
  [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")).map(([p, d]) => ({ path: p, ...d }));
const miEntries = () => docsUnder(`learnerProfiles/${UID}/mistakeLogs/`);
const records = () => docsUnder(`sessionRecords/${UID}/records/`);
const attempts = () => docsUnder(`practiceInsights/${UID}/attempts/`);
const flush = () => new Promise((r) => setTimeout(r, 60));
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** One card on the scorecard's graded sheet, by its "Question N" label. */
const gaCard = (root: ParentNode, label: string): HTMLElement => {
  const c = Array.from(root.querySelectorAll<HTMLElement>(".lt-sc__ga")).find((x) => text(x.querySelector(".lt-sc__ga-n")).startsWith(label));
  if (!c) throw new Error(`no graded-sheet card "${label}"`);
  return c;
};

/* ── harness ───────────────────────────────────────────────────────────────── */
beforeEach(() => {
  H.store.clear();
  H.auto.n = 0;
  window.localStorage.clear();
  setActiveProgressUser(UID);
  H.auth = { user: USER, loading: false };
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset();
  vi.mocked(recordMistake).mockClear();
  vi.mocked(recordAttempt).mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCheckImprove() {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function readQuestion(q: string) {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: q } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
}
async function pressGrade() {
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}
const SINGLE_Q = "Prove that the square root of 2 is irrational.";
async function runCiSingle(body: CheckSolutionResponse) {
  H.detectQuestion.mockResolvedValue({
    ok: true,
    detectedMarks: 3,
    detectedSubject: "Maths",
    detectedTopic: null,
    marksSource: "stated",
    questions: [{ questionNumber: 1, questionText: SINGLE_Q, marks: 3, marksSource: "stated" }],
  });
  H.checkSolutionImage.mockResolvedValue(clone(body));
  renderCheckImprove();
  await readQuestion(SINGLE_Q);
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "My working, as written on the page." } });
  await pressGrade();
  await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
}
type DetectedQ = { n: number; text: string; marks: number };
async function runCiMulti(qs: DetectedQ[], body: WorksheetGradeResponse) {
  H.detectQuestion.mockImplementation(async (req: { question?: string }) => {
    if (qs.some((q) => q.text === req.question)) return { ok: true, detectedTopic: null, detectedSubject: null };
    return {
      ok: true,
      detectedMarks: qs[0].marks,
      detectedSubject: "Maths",
      detectedTopic: null,
      marksSource: "stated",
      questions: qs.map((q) => ({ questionNumber: q.n, questionText: q.text, marks: q.marks, marksSource: "stated" })),
    };
  });
  H.gradeWorksheet.mockResolvedValue(clone(body));
  const out = renderCheckImprove();
  await readQuestion("Whole question paper");
  const answerInput = out.container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(answerInput, { target: { files: [new File(["png"], "answers.png", { type: "image/png" })] } });
  await pressGrade();
  await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
  return out;
}

/* ══ (a) CHECK & IMPROVE ══════════════════════════════════════════════════════ */
describe("(a) Check & Improve — single answer that does not match its question (rendered page)", () => {
  it("shows the owner's sentence, no mark, and records NOTHING (no MI entry, no attempt, no session record)", async () => {
    await runCiSingle(singleMismatch);
    const view = await screen.findByTestId("ci-single-not-graded");
    const notice = view.querySelector('[data-grade-state="answer-mismatch"]');
    expect(text(notice)).toBe(COPY);
    expect(text(view)).toContain("Nothing was marked, scored 0 or saved for this answer.");
    // no mark: no score ring, no percentage, no scorecard
    expect(text(view)).not.toMatch(/\b0\s*\/\s*3\b|\b0%/);
    expect(document.querySelector(".lt-sc__card")).toBeNull();
    await flush();
    expect(recordMistake).not.toHaveBeenCalled();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(miEntries()).toHaveLength(0);
    expect(attempts()).toHaveLength(0);
    expect(records()).toHaveLength(0);
  }, 30000);

  it("CONTROL — the SAME page with a GRADED answer records its MI entry, attempt and session record", async () => {
    await runCiSingle(singleGraded);
    await waitFor(() => expect(records()).toHaveLength(1));
    await waitFor(() => expect(miEntries()).toHaveLength(1));
    await waitFor(() => expect(attempts()).toHaveLength(1));
    expect(recordMistake).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("ci-single-not-graded")).toBeNull();
  }, 30000);
});

describe("(a) Check & Improve — a 2-question paper, Q2 does not match its question (rendered page)", () => {
  const QS: DetectedQ[] = [
    { n: 1, text: "Find the HCF of 96 and 404 by prime factorisation.", marks: 3 },
    { n: 2, text: "Prove that 3 + 2 root 5 is irrational.", marks: 3 },
  ];
  it("Q1 is recorded, Q2 is not; the scorecard and the paper name Q2 in the owner's words; '1 of 2 graded'; no mark for Q2", async () => {
    await runCiMulti(QS, respOf([gradedRow(1), mismatchRow(2)], 6));
    await waitFor(() => expect(records()).toHaveLength(1));
    await waitFor(() => expect(miEntries()).toHaveLength(1));
    await flush();
    const code = String(records()[0].id);
    // recorded: Q1 only — MI, attempt and the front door itself
    expect(miEntries().map((e) => e.questionId)).toEqual([`ci:${code}:q1`]);
    expect(vi.mocked(recordMistake).mock.calls.map((c) => c[2].questionId)).toEqual([`ci:${code}:q1`]);
    expect(vi.mocked(recordAttempt).mock.calls.map((c) => c[1].questionId)).toEqual([`ci:${code}:q1`]);
    expect(attempts()).toHaveLength(1);
    // the session record's score is the GRADED subtotal — Q2 never folded in
    expect(records()[0]).toMatchObject({ marksAwarded: 2, marksTotal: 3, status: "partial" });

    // the scorecard (opened on grade): hero over graded only; the pending strip names Q2
    const card = document.querySelector(".lt-sc__card")!;
    expect(card).not.toBeNull();
    expect(text(card.querySelector(".lt-sc__big"))).toBe("2 / 3");
    expect(text(card.querySelector(".lt-sc__desc"))).toContain("across 1 of 2");
    const pend = Array.from(card.querySelectorAll(".lt-sc__pend"));
    expect(pend.map((p) => text(p))).toEqual([`Q2: ${COPY}`]);

    // the paper underneath: "1 of 2 graded", Q2 listed with its state
    const ng = document.querySelector('[data-testid="not-graded-list"]')!;
    expect(text(ng)).toContain("1 of 2 graded");
    expect(text(ng.querySelector('li[data-grade-state="answer-mismatch"]'))).toBe(`Q2: ${COPY}`);
    // Q2's own card: the sentence, "Not marked", and no mark
    const notice = document.querySelector('p.lt-gsp__state[data-grade-state="answer-mismatch"]')!;
    expect(text(notice)).toBe(COPY);
    const q2card = notice.parentElement!;
    expect(text(q2card)).toContain("Not marked");
    expect(text(q2card)).not.toMatch(/\b0\s*\/\s*3\b/);

    // the graded sheet (PDF on screen): Q2 pending, "not marked", the sentence
    fireEvent.click(screen.getByRole("button", { name: "Read on screen" }));
    await waitFor(() => expect(document.querySelector(".lt-cigp")).not.toBeNull());
    const pdfQ2 = document.querySelector('.lt-cigp__q--pending .lt-cigp__pendnote[data-grade-state="answer-mismatch"]')!;
    expect(text(pdfQ2)).toContain(COPY);
    // no mark on its pill (it reads "pending" — see the report: markPill's "not marked" branch is unreachable)
    expect(text(pdfQ2.closest(".lt-cigp__q")!.querySelector(".lt-cigp__qmk"))).toMatch(/^(pending|not marked)$/);
  }, 45000);
});

/* ══ (b) PRACTICE (Quick Practice) ═══════════════════════════════════════════ */
describe("(b) Practice — Quick Practice batch: the mismatched answer is not graded, not recorded, and says so", () => {
  // ⚠ DEFERRED: PracticePage.tsx (the page that turns `entry.notGraded` into a graded-sheet
  // row) is file-reserved by another lane right now, so the PAGE wiring is not pinned here.
  // What IS pinned: the service's state (`entry.notGraded`) and the shared row builder the page
  // will call (`notGradedAnswer`), rendered through the real scorecard.
  it("entry.notGraded === 'answer-mismatch', no MI write for it, its sibling written; the sheet shows the sentence and no mark", async () => {
    const answers = [1, 2].map((n) => ({
      questionId: `bank-qp-${n}`,
      qNumber: n,
      marks: 3,
      questionText: `QP question ${n}`,
      topicLabel: "Real Numbers",
      topicKey: "real-numbers",
      imageBase64: "IMG",
    }));
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-pr2-mm",
      subject: "Maths",
      answers,
      user: USER as never,
      grade: async () => respOf([gradedRow(1), mismatchRow(2)]),
    });
    expect(out.outcome).toBe("graded");
    expect(out.entries[1].notGraded).toBe("answer-mismatch");
    expect(out.entries[1].graded).toBeUndefined();
    expect(out.entries[0].notGraded).toBeUndefined();
    expect(out.entries[0].graded?.marksAwarded).toBe(2);
    // recorded: Q1 only
    expect(out.miOutcomes.map((o) => o.qNumber)).toEqual([1]);
    expect(vi.mocked(recordMistake).mock.calls.map((c) => c[2].questionId)).toEqual(["bank-qp-1"]);
    expect(vi.mocked(recordAttempt).mock.calls.map((c) => c[1].questionId)).toEqual(["bank-qp-1"]);
    await flush();
    expect(miEntries().map((e) => e.questionId)).toEqual(["bank-qp-1"]);

    // the graded sheet the page builds (shared assembly), through the real scorecard
    const g1 = out.entries[0].graded!;
    const sheet = [
      buildGradedAnswer({ label: "Question 1", descriptor: marksDescriptor(3, false), objective: false, marksAwarded: g1.marksAwarded, totalMarks: g1.totalMarks, teacherNote: g1.teacherNote, mistakeSummary: g1.mistakeSummary, annotatedSteps: g1.annotatedSteps, marksLostByType: g1.marksLostByType }),
      notGradedAnswer("Question 2", marksDescriptor(3, false), { answerMismatch: out.entries[1].notGraded === "answer-mismatch" }),
    ];
    const variant = quickPracticeGradedScorecardVariant({ marksAwarded: 2, marksTotal: 3, gradedCount: 1, totalQuestions: 2, answers: sheet });
    const { container } = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
    const q2 = gaCard(container, "Question 2");
    expect(text(q2.querySelector(".lt-sc__ga-ungraded b"))).toBe(COPY);
    expect(text(q2.querySelector(".lt-sc__ga-ungraded"))).toContain("Nothing has been marked, scored 0 or saved for it.");
    expect(q2.querySelector(".lt-sc__ga-score")).toBeNull();
    // CONTROL — the graded sibling DOES show its mark
    expect(text(gaCard(container, "Question 1").querySelector(".lt-sc__ga-score"))).toBe("2 / 3");
  });
});

/* ══ (c) PREDICTED QUESTIONS = SolutionChecker ════════════════════════════════ */
describe("(c) Predicted Questions (SolutionChecker) — an answer that does not match its question", () => {
  const PROPS = { question: "Prove that root 2 is irrational.", marks: 3, subject: "Maths", topic: "real-numbers" };
  const cacheKey = (qid: string) => `lazytopper.checkResult.v2.${UID}:${qid}`;
  async function check(body: CheckSolutionResponse, qid: string) {
    H.checkSolutionImage.mockResolvedValue(clone(body));
    render(<SolutionChecker {...PROPS} questionId={qid} />);
    fireEvent.click(screen.getByRole("tab", { name: "Type my working" }));
    fireEvent.change(screen.getByLabelText("Type your working and answer"), { target: { value: "my working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
  }

  it("the sentence renders; no score, no 'saved' label; recordMistake/recordAttempt never called; nothing cached", async () => {
    await check(singleMismatch, "qid-pr2-mm");
    const notice = await screen.findByText(COPY);
    expect(notice.getAttribute("data-grade-state")).toBe("answer-mismatch");
    expect(screen.queryByText("/3")).toBeNull();
    expect(screen.queryByText(/Checked and saved/)).toBeNull();
    await flush();
    expect(recordMistake).not.toHaveBeenCalled();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(cacheKey("qid-pr2-mm"))).toBeNull();
    expect(miEntries()).toHaveLength(0);
  });

  it("CONTROL — a GRADED answer shows its score, is recorded and is cached", async () => {
    await check(singleGraded, "qid-pr2-ok");
    expect(await screen.findByText("/3")).toBeInTheDocument();
    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(1));
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(cacheKey("qid-pr2-ok"))).not.toBeNull();
    expect(screen.queryByText(COPY)).toBeNull();
  });
});

/* ══ (d) CHAPTER TEST, (e) FULL MOCK — the real service, then the scorecard ═══ */
const MCQ = paperQ(1, 1, "A", { options: ["2", "root 2", "4", "8"], answer: "root 2" });
const CT_QS = [MCQ, paperQ(2, 3, "C"), paperQ(3, 3, "C")];

async function assertTestScorecard(container: HTMLElement) {
  // hero: graded only — Q1 1/1 + Q2 2/3; Q3 (mismatch) neither a 0 nor in the total
  expect(text(container.querySelector(".lt-sc__big"))).toBe("3 / 4");
  expect(text(container.querySelector(".lt-sc__desc"))).toContain("across 2 of 3");
  // the pending strip names Q3 in the owner's words, and nothing reads "couldn't be read"
  expect(Array.from(container.querySelectorAll(".lt-sc__pend")).map((p) => text(p))).toEqual([`Q3: ${COPY}`]);
  // the graded sheet: Q3's row title IS the sentence, and it carries no mark
  const q3 = gaCard(container, "Question 3");
  expect(text(q3.querySelector(".lt-sc__ga-ungraded b"))).toBe(COPY);
  expect(q3.querySelector(".lt-sc__ga-score")).toBeNull();
  expect(text(gaCard(container, "Question 2").querySelector(".lt-sc__ga-score"))).toBe("2 / 3");
  // B7 — "Where your marks went" in MARKS over the GRADED questions only (Q2's 1 mark)
  expect(text(container.querySelector('[data-testid="sc-marks-heading"]'))).toBe(MARKS_HEADING);
  expect(container.querySelector('[data-testid="sc-marks-lost"]')!.getAttribute("data-lost")).toBe("1");
  expect(container.querySelector('[data-group="careless"]')!.getAttribute("data-marks")).toBe("1");
}

describe("(d) Chapter Test — a written answer that does not match its question", () => {
  it("the real service records nothing for it; the scorecard names it and shows no mark", async () => {
    const paper = paperOf("ct-pr2-mm", CT_QS);
    const objective = scoreObjectiveSection([MCQ], { 1: "(b)" });
    H.gradeWorksheet.mockResolvedValue(respOf([gradedRow(2), mismatchRow(3)]));
    const out = await gradeChapterTestUpload({ user: USER as never, paper, code: "CT-M-RN-01", subject: "maths", topicKey: "real-numbers", objective, subjectiveQuestions: CT_QS.slice(1), upload: UPLOAD });
    expect(out.ok).toBe(true);
    expect(out.miOutcomes.map((o) => o.qNumber)).toEqual([2]);
    expect(vi.mocked(recordMistake).mock.calls.map((c) => c[2].questionId)).toEqual(["ct:ct-pr2-mm:q2"]);
    expect(vi.mocked(recordAttempt).mock.calls.map((c) => c[1].questionId)).toEqual(["ct:ct-pr2-mm:q2"]);
    await flush();
    expect(miEntries().map((e) => e.questionId)).toEqual(["ct:ct-pr2-mm:q2"]);

    const variant = chapterTestScorecardVariant({ name: "Real Numbers · Test #1", code: "CT-M-RN-01", response: out.response, phase: "full", questions: CT_QS });
    const { container } = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
    await assertTestScorecard(container);
  });
});

/** The "By section" lens rows ("C · SA" → "2/3"), as the scorecard prints them. */
const sectionRows = (container: HTMLElement) =>
  Object.fromEntries(
    Array.from(container.querySelectorAll(".lt-sc__seclens-row")).map((r) => [text(r.querySelector(".lt-sc__seclens-lbl")), text(r.querySelector(".lt-sc__seclens-mk"))]),
  );

// Found by this suite (PR-2): the lens builders skipped only `r.couldNotRead`, so an answer that
// does not match its question (couldNotRead:false, answerMismatch:true, 0 awarded) was FOLDED
// into its section as 0 of N ("2/6" instead of "2/3"). Fixed in scorecardVariants.ts /
// scorecardBankLenses.ts (every lens skips `!isGradedQuestion(r)`); these pins keep it fixed.
describe("(d)/(e) the BY-SECTION lens never folds a not-graded question in as a 0", () => {
  const response = () =>
    buildChapterTestResponse({
      paper: paperOf("lens-pr2", CT_QS),
      objective: scoreObjectiveSection([MCQ], { 1: "(b)" }),
      subjectiveQuestions: CT_QS.slice(1),
      subjectiveResponse: respOf([gradedRow(2), mismatchRow(3)]),
    });
  it("Chapter Test: section C reads Q2's 2/3 — the mismatched Q3 (0 of 3) is not in it", () => {
    const variant = chapterTestScorecardVariant({ name: "T", code: "CT-L", response: response(), phase: "full", questions: CT_QS });
    const rows = sectionRows(render(<ResultsScorecard variant={variant} onClose={() => {}} />).container);
    expect(Object.values(rows)).toContain("2/3");
    expect(Object.values(rows)).not.toContain("2/6");
  });
  it("Full Mock: section C reads Q2's 2/3 — the mismatched Q3 (0 of 3) is not in it", () => {
    const variant = fullMockScorecardVariant({ name: "M", code: "FM-L", response: response(), phase: "full", questions: CT_QS });
    const rows = sectionRows(render(<ResultsScorecard variant={variant} onClose={() => {}} />).container);
    expect(Object.values(rows)).toContain("2/3");
    expect(Object.values(rows)).not.toContain("2/6");
  });
});

describe("(e) Full Mock — a written answer that does not match its question", () => {
  it("the real service records nothing for it; the scorecard names it and shows no mark", async () => {
    const paper = paperOf("fm-pr2-mm", CT_QS);
    const objective = scoreObjectiveSection([MCQ], { 1: "(b)" });
    H.gradeWorksheet.mockResolvedValue(respOf([gradedRow(2), mismatchRow(3)]));
    const out = await gradeFullMockUpload({ user: USER as never, paper, code: "FM-M-01", subject: "maths", objective, subjectiveQuestions: CT_QS.slice(1), upload: UPLOAD });
    expect(out.ok).toBe(true);
    expect(out.miOutcomes.map((o) => o.qNumber)).toEqual([2]);
    expect(vi.mocked(recordMistake).mock.calls.map((c) => c[2].questionId)).toEqual(["fm:fm-pr2-mm:q2"]);
    await flush();
    expect(miEntries().map((e) => e.questionId)).toEqual(["fm:fm-pr2-mm:q2"]);

    const variant = fullMockScorecardVariant({ name: "Maths · Mock #1", code: "FM-M-01", response: out.response, phase: "full", questions: CT_QS });
    const { container } = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
    await assertTestScorecard(container);
  });
});

/* ══ (f) WORKSHEETS — service, scorecard, graded PDF, grade panel ═════════════ */
describe("(f) Worksheets — an answer that does not match its question", () => {
  it("records nothing for it; the scorecard, the graded PDF and the grade panel each say so with no mark", async () => {
    const ws = paperOf("ws-pr2-mm", [paperQ(1, 3, "C"), paperQ(2, 3, "C")]);
    H.gradeWorksheet.mockResolvedValue(respOf([gradedRow(1), mismatchRow(2)]));
    const out = await gradeWorksheetAndRecord(USER as never, ws, UPLOAD);
    expect(out.miOutcomes.map((o) => o.qNumber)).toEqual([1]);
    expect(vi.mocked(recordMistake).mock.calls.map((c) => c[2].questionId)).toEqual(["ws:ws-pr2-mm:q1"]);
    await flush();
    expect(miEntries().map((e) => e.questionId)).toEqual(["ws:ws-pr2-mm:q1"]);

    // the scorecard
    const variant = worksheetScorecardVariant({ name: "Real Numbers · Worksheet 1", code: "WS-M-RN-01", response: out.response, downloading: false, onRead: () => {}, onDownload: () => {} });
    const sc = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
    expect(text(sc.container.querySelector(".lt-sc__big"))).toBe("2 / 3");
    expect(Array.from(sc.container.querySelectorAll(".lt-sc__pend")).map((p) => text(p))).toEqual([`Q2: ${COPY}`]);
    sc.unmount();

    // the graded PDF
    const pdf = render(<WorksheetGradedPrintDoc ws={ws} response={out.response} name="Real Numbers · Worksheet 1" code="WS-M-RN-01" coaching="" />);
    const note = pdf.container.querySelector('.lt-gp__q--pending .lt-gp__pendnote[data-grade-state="answer-mismatch"]')!;
    expect(text(note)).toContain(COPY);
    expect(text(note.closest(".lt-gp__q")!.querySelector(".lt-gp__qmk"))).toMatch(/^(pending|not marked)$/);
    expect(text(pdf.container.querySelector('.lt-gp__pending[data-grade-state="answer-mismatch"]'))).toContain("1 answer not marked");
    pdf.unmount();

    // the grade panel — restores the saved grade on mount, as a revisit does
    const panel = render(
      <MemoryRouter>
        <WorksheetGradePanel ws={ws} />
      </MemoryRouter>,
    );
    const pq = await waitFor(() => {
      const el = panel.container.querySelector('.lt-wg__q--pending[data-grade-state="answer-mismatch"]');
      expect(el).not.toBeNull();
      return el!;
    });
    expect(text(pq.querySelector(".lt-wg__qpending"))).toBe(COPY);
    expect(pq.querySelector(".lt-wg__qscore")).toBeNull();
    expect(text(pq)).not.toMatch(/\b0\s*\/\s*3\b/);
    // CONTROL — the graded sibling shows its mark
    expect(text(panel.container.querySelector(".lt-wg__qscore"))).toBe("2/3");
  });
});

/* ══ the other honest states: graded sheet, both PDFs, the C&I multi list ═════ */
const STRUCK = "STRUCK WORK Q1 x = 7";
const RUBRIC_A = "RUBRIC POINT A correct formula";
const NOTE = "TEACHER NOTE Q1 check the arithmetic.";
/** Q1 graded v2 (a typed slip, a crossed-out attempt, an unattempted part, a rubric);
 *  Q2 unreadable; Q3 an unread option AS A'S CONTRACT SENDS IT (couldNotRead:true +
 *  objectiveResolved:false — R3: "retake the photo"); Q4 does not match its question;
 *  Q5 an unread option on an otherwise READ page (couldNotRead:false + objectiveResolved:false). */
const KS: WorksheetGradeResponse = respOf(
  [
    row(1, {
      totalMarks: 5,
      marksAwarded: 2,
      percentage: 40,
      annotatedSteps: [
        step(1, "correct", { marksAwarded: 2, studentWork: "the formula, written out" }),
        step(2, "incorrect", { marksDeducted: 1, mistakeType: "calculation", studentWork: "the sum came to 77" }),
        step(3, "withdrawn", { studentWork: STRUCK, marksAvailable: 0 }),
        step(4, "unattempted", { marksDeducted: 2 }),
      ],
      mistakeSummary: { ...ZERO, calculation: 1 },
      teacherNote: NOTE,
      marksLostByType: mk({ calculation: 1, unattempted: 2 }),
      rubric: [
        { point: RUBRIC_A, marks: 2 },
        { point: "RUBRIC POINT B conclusion with unit", marks: 3 },
      ],
    }),
    { qNumber: 2, couldNotRead: true, totalMarks: 2 },
    row(3, { totalMarks: 1, marksAwarded: 0, percentage: 0, couldNotRead: true, objectiveResolved: false, objective: true }),
    mismatchRow(4),
    row(5, { totalMarks: 1, marksAwarded: 0, percentage: 0, couldNotRead: false, objectiveResolved: false, objective: true }),
  ],
  12,
);
const KS_QS = [paperQ(1, 5, "D"), paperQ(2, 2, "B"), paperQ(3, 1, "A"), paperQ(4, 3, "C"), paperQ(5, 1, "A")];
/** Each not-graded KS question's state and the owner's words for it (R3 decides Q3). */
const KS_NOT_GRADED: Array<[number, string, string]> = [
  [2, "could-not-read", COULD_NOT_READ_COPY],
  [3, "could-not-read", COULD_NOT_READ_COPY],
  [4, "answer-mismatch", COPY],
  [5, "unread-option", UNREAD_OPTION_COPY],
];

describe("honest states — the scorecard's graded sheet", () => {
  const renderSheet = () => {
    const variant = chapterTestScorecardVariant({ name: "Real Numbers · Test #2", code: "CT-M-RN-02", response: KS, phase: "full", questions: KS_QS });
    return render(<ResultsScorecard variant={variant} onClose={() => {}} />).container;
  };

  it("couldNotRead / unread option / mismatch each say the owner's words, with no mark (R3: couldNotRead + objectiveResolved:false → 'retake the photo')", () => {
    const c = renderSheet();
    for (const [n, , copy] of KS_NOT_GRADED) {
      const card = gaCard(c, `Question ${n}`);
      expect(text(card.querySelector(".lt-sc__ga-ungraded b"))).toBe(copy);
      expect(card.querySelector(".lt-sc__ga-score")).toBeNull();
    }
  });

  it("a NOT-ATTEMPTED step reads 'Not attempted', never 'Incorrect −N' (CONTROL: the slip shows −1)", () => {
    const q1 = gaCard(renderSheet(), "Question 1");
    const rows = Array.from(q1.querySelectorAll(".lt-sc__gstlist > li"));
    const byStep = (n: number) => rows.find((r) => text(r.querySelector(".lt-sc__gst-n")) === `Step ${n}`)!;
    expect(text(byStep(4))).toContain("Not attempted");
    expect(text(byStep(4))).not.toMatch(/incorrect/i);
    expect(byStep(4).querySelector(".lt-sc__gst-mk")).toBeNull();
    expect(text(byStep(2).querySelector(".lt-sc__gst-mk"))).toBe("−1");
  });

  it("crossed-out work is drawn APART (struck, under its heading) and NOT inside the step list", () => {
    const q1 = gaCard(renderSheet(), "Question 1");
    const struck = q1.querySelector('[data-testid="grade-withdrawn"]')!;
    expect(struck).not.toBeNull();
    expect(text(struck)).toContain(WITHDRAWN_HEADING);
    expect(text(struck.querySelector("s"))).toBe(STRUCK);
    expect(text(q1.querySelector(".lt-sc__gsteps"))).not.toContain(STRUCK);
    expect(Array.from(q1.querySelectorAll(".lt-sc__gst-n")).map((e) => text(e))).toEqual(["Step 1", "Step 2", "Step 4"]);
  });

  it("the rubric sits under 'How this was marked' and NEVER inside the teacher's note", () => {
    const q1 = gaCard(renderSheet(), "Question 1");
    const rubric = q1.querySelector('[data-testid="grade-rubric"]')!;
    expect(text(rubric)).toContain(RUBRIC_HEADING);
    expect(text(rubric)).toContain(RUBRIC_A);
    const verdict = q1.querySelector(".lt-sc__ga-verdict")!;
    expect(text(verdict)).toBe(NOTE);
    expect(verdict.contains(rubric)).toBe(false);
    expect(text(rubric)).not.toContain(NOTE);
  });
});

describe("honest states — the worksheet graded PDF", () => {
  const renderPdf = () => render(<WorksheetGradedPrintDoc ws={paperOf("ws-ks", KS_QS)} response={KS} name="KS" code="WS-KS" coaching="" />).container;

  it("couldNotRead / unread option / mismatch each say the owner's words; none carries a mark (R3)", () => {
    const c = renderPdf();
    const notes = Array.from(c.querySelectorAll(".lt-gp__q--pending .lt-gp__pendnote"));
    const noteOf = (n: number) => notes.find((e) => text(e.closest(".lt-gp__q")!.querySelector(".lt-gp__qn")) === String(n));
    expect(notes).toHaveLength(KS_NOT_GRADED.length);
    for (const [n, state, copy] of KS_NOT_GRADED) {
      expect(noteOf(n)?.getAttribute("data-grade-state")).toBe(state);
      expect(text(noteOf(n))).toContain(copy);
    }
    for (const n of notes) expect(text(n.closest(".lt-gp__q")!.querySelector(".lt-gp__qmk"))).toMatch(/^(pending|not marked)$/);
  });

  it("Not attempted carries no deduction; struck work is apart; the rubric is not inside the note", () => {
    const c = renderPdf();
    const q1 = Array.from(c.querySelectorAll(".lt-gp__q")).find((q) => text(q.querySelector(".lt-gp__qn")) === "1")!;
    const stp = Array.from(q1.querySelectorAll(".lt-gp__stp"));
    const s4 = stp.find((s) => text(s.querySelector(".lt-gp__stepn")) === "Step 4")!;
    expect(text(s4.querySelector(".lt-gp__stbadge"))).toBe("Not attempted");
    expect(s4.querySelector(".lt-gp__stmk")).toBeNull();
    expect(text(s4)).not.toMatch(/incorrect|−/i);
    expect(text(q1.querySelector(".lt-gp__steps"))).not.toContain(STRUCK);
    expect(text(q1.querySelector('[data-testid="grade-withdrawn"] s'))).toBe(STRUCK);
    const rubric = q1.querySelector('[data-testid="grade-rubric"]')!;
    expect(text(rubric)).toContain(RUBRIC_HEADING);
    const fb = q1.querySelector(".lt-gp__fb")!;
    expect(text(fb)).toBe(NOTE);
    expect(text(fb)).not.toContain(RUBRIC_A);
    expect(fb.contains(rubric)).toBe(false);
  });
});

describe("honest states — the Check & Improve graded PDF", () => {
  const renderPdf = () =>
    render(
      <CheckImproveGradedPrintDoc
        code="CI-KS"
        name="KS"
        questions={KS.results.map((r) => ({ ...r, totalMarks: Number(r.totalMarks) || 0, marksAwarded: r.marksAwarded ?? undefined }))}
        gradedMarksAwarded={KS.gradedMarksAwarded}
        gradedMarksTotal={KS.gradedMarksTotal}
        pendingCount={KS.pendingCount}
        coaching=""
      />,
    ).container;

  it("couldNotRead / unread option / mismatch each say the owner's words; none carries a mark (R3)", () => {
    const c = renderPdf();
    const notes = Array.from(c.querySelectorAll(".lt-cigp__q--pending .lt-cigp__pendnote"));
    const noteOf = (n: number) => notes.find((e) => text(e.closest(".lt-cigp__q")!.querySelector(".lt-cigp__qn")) === String(n));
    expect(notes).toHaveLength(KS_NOT_GRADED.length);
    for (const [n, state, copy] of KS_NOT_GRADED) {
      expect(noteOf(n)?.getAttribute("data-grade-state")).toBe(state);
      expect(text(noteOf(n))).toContain(copy);
    }
    for (const n of notes) expect(text(n.closest(".lt-cigp__q")!.querySelector(".lt-cigp__qmk"))).toMatch(/^(pending|not marked)$/);
  });

  it("Not attempted carries no deduction; struck work is apart; the rubric is not inside the note", () => {
    const c = renderPdf();
    const q1 = Array.from(c.querySelectorAll(".lt-cigp__q")).find((q) => text(q.querySelector(".lt-cigp__qn")) === "1")!;
    const st = Array.from(q1.querySelectorAll(".lt-cigp__step"));
    const s4 = st.find((s) => text(s.querySelector(".lt-cigp__stepn")) === "Step 4")!;
    expect(text(s4.querySelector(".lt-cigp__stbadge"))).toBe("Not attempted");
    expect(s4.querySelector(".lt-cigp__stmk")).toBeNull();
    expect(text(q1.querySelector(".lt-cigp__steps"))).not.toContain(STRUCK);
    expect(text(q1.querySelector('[data-testid="grade-withdrawn"] s'))).toBe(STRUCK);
    const rubric = q1.querySelector('[data-testid="grade-rubric"]')!;
    expect(text(rubric)).toContain(RUBRIC_HEADING);
    const note = q1.querySelector(".lt-cigp__note")!;
    expect(text(note)).toContain(NOTE);
    expect(text(note)).not.toContain(RUBRIC_A);
    expect(note.contains(rubric)).toBe(false);
  });
});

describe("honest states — the Check & Improve multi list (rendered page)", () => {
  const QS: DetectedQ[] = [
    { n: 1, text: "Find the 20th term of the AP 3, 7, 11, and so on.", marks: 5 },
    { n: 2, text: "State Euclid's division lemma.", marks: 2 },
    { n: 3, text: "Which of these is irrational? (a) 2 (b) root 2", marks: 1 },
    { n: 4, text: "Find the zeroes of the quadratic polynomial x squared minus 4.", marks: 3 },
    { n: 5, text: "Which of these is rational? (a) root 3 (b) 4", marks: 1 },
  ];
  it("each not-graded question says its own words (R3); 1 of 5 graded; Q1's steps keep the struck work and the rubric apart", async () => {
    await runCiMulti(QS, KS);
    await waitFor(() => expect(records()).toHaveLength(1));
    const ng = document.querySelector('[data-testid="not-graded-list"]')!;
    expect(text(ng)).toContain("1 of 5 graded");
    // the list names each not-graded question with its own state, in question order
    expect(Array.from(ng.querySelectorAll("li")).map((li) => [li.getAttribute("data-grade-state"), text(li)])).toEqual(
      KS_NOT_GRADED.map(([n, state, copy]) => [state, `Q${n}: ${copy}`]),
    );
    const notices = Array.from(document.querySelectorAll("p.lt-gsp__state"));
    expect(notices.map((n) => [n.getAttribute("data-grade-state"), text(n)])).toEqual(KS_NOT_GRADED.map(([, state, copy]) => [state, copy]));
    for (const n of notices) {
      const card = n.parentElement!;
      expect(text(card)).toContain("Not marked");
      expect(text(card)).not.toMatch(/\b0\s*\/\s*\d/);
    }
    // Q1 — expand the working
    fireEvent.click(screen.getAllByRole("button", { name: /Show step-by-step working/ })[0]);
    const struck = await waitFor(() => {
      const el = document.querySelector('[data-testid="grade-withdrawn"]');
      expect(el).not.toBeNull();
      return el!;
    });
    expect(text(struck.querySelector("s"))).toBe(STRUCK);
    const q1card = struck.parentElement!.parentElement!;
    // the struck work appears ONCE (in its block) — it is not drawn as a step
    expect(text(q1card).split(STRUCK).length - 1).toBe(1);
    expect(text(q1card)).not.toContain("Step 3");
    expect(text(q1card)).toContain("Step 4");
    // not attempted: no "−2" anywhere on Q1; CONTROL: the slip's −1 is there
    expect(text(q1card)).not.toContain("−2");
    expect(text(q1card)).toContain("−1");
    // the rubric is apart from the teacher's note
    const rubric = q1card.querySelector('[data-testid="grade-rubric"]')!;
    expect(text(rubric)).toContain(RUBRIC_HEADING);
    const noteP = Array.from(q1card.querySelectorAll("p")).find((p) => text(p) === NOTE)!;
    expect(noteP).toBeTruthy();
    expect(noteP.contains(rubric)).toBe(false);
    // MI: only the graded question
    await waitFor(() => expect(miEntries()).toHaveLength(1));
    expect(String(miEntries()[0].questionId)).toMatch(/:q1$/);
  }, 45000);
});

/* ══ OR-LIVE L1 — through the rendered C&I multi path ═══════════════════════ */
describe("OR-LIVE L1 — two questions printed 'Q5' keep their OWN text (rendered C&I multi path)", () => {
  const QS: DetectedQ[] = [
    { n: 5, text: "Find the HCF of 96 and 404.", marks: 3 },
    { n: 5, text: "Prove that root 3 is irrational.", marks: 3 },
  ];
  it("MI and the graded sheet carry each question's own text", async () => {
    await runCiMulti(QS, respOf([gradedRow(5), gradedRow(5)]));
    await waitFor(() => expect(miEntries()).toHaveLength(2));
    const code = String(records()[0].id);
    const byId = new Map(miEntries().map((e) => [String(e.questionId), String(e.questionText)]));
    expect(byId.get(`ci:${code}:q5`)).toBe(QS[0].text);
    expect(byId.get(`ci:${code}:q5#2`)).toBe(QS[1].text);
    // the graded sheet on screen (the PDF's props builder)
    fireEvent.click(screen.getByRole("button", { name: "Read on screen" }));
    await waitFor(() => expect(document.querySelector(".lt-cigp")).not.toBeNull());
    expect(Array.from(document.querySelectorAll(".lt-cigp__qtext")).map((e) => text(e))).toEqual([QS[0].text, QS[1].text]);
  }, 45000);
});
