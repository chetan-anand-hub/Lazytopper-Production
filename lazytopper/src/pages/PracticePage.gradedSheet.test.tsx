// QP-GRADED-SHEET-1 — the REAL PracticePage: "Download graded answer sheet (PDF)" on the Quick
// Practice scorecard, live AND reopened (history / tutor return), through the SHARED graded-sheet
// export Chapter Test and Full Mock use. Shown only when >= 1 question is graded; the export gets
// the scorecard's own rows (marks, the picks, the tap-the-answer note). The download records nothing.
//
// Harness: the one of PracticePage.scorecardReturn.test.tsx (real record store, spied writes).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { authUser } = vi.hoisted(() => ({
  authUser: { current: null as null | { uid: string; isLocalSession: boolean; email?: string } },
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authUser.current, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));

const spies = vi.hoisted(() => ({
  recordAttempt: vi.fn(() => "recorded"),
  recordMistake: vi.fn(async () => ({ outcome: "logged" as const, bridged: false })),
  writeSessionRecord: vi.fn(),
  writeSessionPerQuestion: vi.fn(),
  exportPdf: vi.fn(async () => "file.pdf"),
  extraBankRows: [] as unknown[],
}));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: spies.recordAttempt,
}));
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: spies.recordMistake };
});
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (...a: Parameters<typeof actual.writeSessionRecord>) => {
      spies.writeSessionRecord(...a);
      return actual.writeSessionRecord(...a);
    },
    writeSessionPerQuestion: (...a: Parameters<typeof actual.writeSessionPerQuestion>) => {
      spies.writeSessionPerQuestion(...a);
      return actual.writeSessionPerQuestion(...a);
    },
  };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
// The SHARED graded-sheet export (Worksheet / Chapter Test / Full Mock): spied, nothing rasterised.
vi.mock("../components/worksheet/worksheetPdfExport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/worksheet/worksheetPdfExport")>();
  return { ...actual, exportGradedWorksheetPdf: spies.exportPdf };
});
const FIXTURE_TAG = Symbol.for("qpgs.fixture-read");
vi.mock("../data/bankChapters/loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/bankChapters/loader")>();
  return {
    ...actual,
    bankChaptersFor: (keys: Iterable<string | null | undefined>) =>
      Object.assign(actual.bankChaptersFor(keys), { [FIXTURE_TAG]: true }),
    getBankRows: (slugs: Iterable<string>) => {
      const rows = actual.getBankRows(slugs);
      return (slugs as unknown as Record<symbol, unknown>)[FIXTURE_TAG]
        ? [...rows, ...(spies.extraBankRows as typeof rows)]
        : rows;
    },
  };
});
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet: vi.fn(), checkSolutionImage: vi.fn() };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});
vi.mock("../analytics/analytics", async (importActual) => {
  const actual = await importActual<typeof import("../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: vi.fn(), trackPracticeGraded: vi.fn() };
});

import PracticePage from "./PracticePage";
import { UNTYPED_MARKS_NOTE } from "../lib/mistakeDisplay";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { gradeWorksheet } from "../ai/aiClient";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function mkItem(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Hard",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Bank step one of question ${n}.`],
    finalAnswer: `answer-${n}`,
    options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`],
    answer: `q${n}-correct`,
  } as unknown as PQ;
}

let lastLocation = "";
function LocationProbe() {
  const l = useLocation();
  lastLocation = `${l.pathname}${l.search}`;
  return null;
}

const ME = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const DOWNLOAD = /Download graded answer sheet \(PDF\)/;

type ExportArgs = {
  ws: { questions: { id: string; questionText: string }[] };
  response: { gradedMarksAwarded: number; gradedMarksTotal: number; results: { qNumber: number; marksAwarded?: number; pickedOption?: string }[] };
  name: string;
  code: string;
  coaching: string;
};
const lastExport = () => (spies.exportPdf.mock.calls.at(-1) as unknown as [ExportArgs])[0];

beforeEach(() => {
  window.localStorage.clear();
  authUser.current = ME;
  spies.exportPdf.mockClear();
  spies.writeSessionRecord.mockClear();
  spies.writeSessionPerQuestion.mockClear();
  spies.recordAttempt.mockClear();
  spies.recordMistake.mockClear();
  spies.extraBankRows = [mkItem(1), mkItem(2), mkItem(3)];
  lastLocation = "";
});
afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

async function renderAt(url: string, pool: PQ[]) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocationProbe />
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}
const SET_URL = (extra = "") => `/practice/10/maths?topic=real-numbers&count=3${extra}`;

/** Q1 wrong, Q2 right, Q3 wrong → the auto-offered scorecard. Returns the written record id. */
async function gradeSet() {
  await renderAt(SET_URL(), [mkItem(1), mkItem(2), mkItem(3)]);
  fireEvent.click(screen.getByText("q1-wrong"));
  fireEvent.click(screen.getByText("q2-correct"));
  fireEvent.click(screen.getByText("q3-wrong"));
  await waitFor(() => expect(spies.writeSessionRecord).toHaveBeenCalled());
  return (spies.writeSessionRecord.mock.calls.at(-1)![1] as { id: string }).id;
}

describe("QP-GRADED-SHEET-1 · the live Quick Practice scorecard", () => {
  it("★★ offers the download when >= 1 question is graded; the export gets the scorecard's rows", async () => {
    const recordId = await gradeSet();
    const btn = await screen.findByRole("button", { name: DOWNLOAD });
    const writesBefore = [spies.writeSessionRecord.mock.calls.length, spies.writeSessionPerQuestion.mock.calls.length,
      spies.recordAttempt.mock.calls.length, spies.recordMistake.mock.calls.length];
    fireEvent.click(btn);
    await waitFor(() => expect(spies.exportPdf).toHaveBeenCalledTimes(1));
    const a = lastExport();
    expect(a.code).toBe(recordId);
    expect(a.name).toMatch(/Practice set/);
    expect(a.response.gradedMarksAwarded).toBe(1);
    expect(a.response.gradedMarksTotal).toBe(3);
    expect(a.response.results.map((r) => [r.qNumber, r.marksAwarded, r.pickedOption])).toEqual([
      [1, 0, "q1-wrong"],
      [2, 1, "q2-correct"],
      [3, 0, "q3-wrong"],
    ]);
    expect(a.ws.questions.map((q) => q.id)).toEqual(["q-1", "q-2", "q-3"]);
    expect(a.ws.questions[0].questionText).toBe("Question 1: solve it.");
    // The scorecard's own tap-the-answer note travels to the sheet (marks were lost on taps).
    expect(a.coaching).toContain(UNTYPED_MARKS_NOTE);
    // ★ Display only: the download recorded nothing.
    expect([spies.writeSessionRecord.mock.calls.length, spies.writeSessionPerQuestion.mock.calls.length,
      spies.recordAttempt.mock.calls.length, spies.recordMistake.mock.calls.length]).toEqual(writesBefore);
  });

  it("★ CONTROL: nothing graded (0 attempted) ⇒ no download is offered", async () => {
    await renderAt(SET_URL(), [mkItem(1), mkItem(2)]);
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
    await screen.findByText(/nothing is counted against you/);
    expect(screen.queryByRole("button", { name: DOWNLOAD })).toBeNull();
  });
});

// ── The written-answer (batch-graded) scorecard ─────────────────────────────────────────────
function mkWritten(n: number): PQ {
  return {
    id: `w-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 3,
    section: "C",
    format: "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
    solutionSteps: [`Bank step one of question ${n}.`],
  } as unknown as PQ;
}
const writtenGrade = (qNumber: number) => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    { stepNumber: 1, description: "Substitute", studentWork: "14 x 75 = 1030", status: "incorrect",
      marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "14 x 75 is 1050.", mistakeType: "calculation", correctedWorking: null },
  ],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Method correct throughout.",
});
async function saveTypedFor(n: number) {
  const triggers = () => screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
  fireEvent.click(triggers()[n - 1]);
  const tabs = screen.getAllByRole("tab", { name: "Type my working" });
  fireEvent.click(tabs[tabs.length - 1]);
  const boxes = screen.getAllByLabelText("Type your working and answer");
  await act(async () => {
    fireEvent.change(boxes[boxes.length - 1], { target: { value: "x = 4 and x = -2" } });
  });
  fireEvent.click(await screen.findByTestId("qp-save-answer"));
  await screen.findByTestId("qp-saved-confirmation");
  fireEvent.click(triggers()[n - 1]);
}

describe("QP-GRADED-SHEET-1 · the written-answer (batch-graded) Quick Practice scorecard", () => {
  it("★★ an answer the grader could not read is on the sheet as NOT graded (no mark), header says Quick Practice", async () => {
    vi.mocked(gradeWorksheet).mockResolvedValue({
      ok: true,
      results: [writtenGrade(1), writtenGrade(2), { qNumber: 3, couldNotRead: true, totalMarks: 3 }],
      totalQuestions: 3, gradedCount: 2, pendingCount: 1,
      gradedMarksAwarded: 4, gradedMarksTotal: 6, worksheetTotalMarks: 9,
    } as unknown as Awaited<ReturnType<typeof gradeWorksheet>>);
    await renderAt(SET_URL(), [mkWritten(1), mkWritten(2), mkWritten(3)]);
    for (const n of [1, 2, 3]) await saveTypedFor(n);
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    // The scorecard lists Q3 as not graded (an ungraded row, no mark) — and the sheet must too.
    const btn = await screen.findByRole("button", { name: DOWNLOAD });
    expect(document.querySelectorAll('[data-grade-state="could-not-read"], [data-state="could-not-read"]').length
      + (document.body.textContent?.match(/Question 3/g)?.length ?? 0)).toBeGreaterThan(0);
    fireEvent.click(btn);
    await waitFor(() => expect(spies.exportPdf).toHaveBeenCalledTimes(1));
    const a = lastExport() as ExportArgs & { kindLabel?: string; response: { pendingCount: number } };
    expect(a.kindLabel).toBe("Quick Practice");
    // Totals untouched (Q3 is never scored); Q3 is present as a non-scored row.
    expect(a.response.gradedMarksAwarded).toBe(4);
    expect(a.response.gradedMarksTotal).toBe(6);
    expect(a.response.pendingCount).toBe(1);
    const q3 = a.response.results.find((r) => r.qNumber === 3) as { couldNotRead?: boolean; marksAwarded?: number };
    expect(q3).toMatchObject({ couldNotRead: true });
    expect(q3.marksAwarded).toBeUndefined();
    // Rendered through the shared doc: the pending line, never "All N questions read and graded".
    const { WorksheetGradedPrintDoc } = await import("../components/worksheet/WorksheetGradedPrintDoc");
    cleanup();
    const { container } = render(<WorksheetGradedPrintDoc {...(a as unknown as Parameters<typeof WorksheetGradedPrintDoc>[0])} />);
    expect(container.textContent).toContain("1 question pending");
    expect(container.textContent).not.toMatch(/read and graded/);
    expect(container.textContent).toContain("Quick Practice · 3 questions · 9 marks");
  }, 120_000);
});

describe("QP-GRADED-SHEET-1 · the reopened Quick Practice scorecard (history / tutor return)", () => {
  it("★★ a reopened session offers the download, built from the STORED payload + the bank rows", async () => {
    const recordId = await gradeSet();
    cleanup();
    spies.exportPdf.mockClear();
    await renderAt(SET_URL(`&review=${recordId}`), [mkItem(1), mkItem(2), mkItem(3)]);
    expect(await screen.findByText(new RegExp(`${recordId} ·`))).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: DOWNLOAD }));
    await waitFor(() => expect(spies.exportPdf).toHaveBeenCalledTimes(1));
    const a = lastExport();
    expect(a.code).toBe(recordId);
    expect(a.response.results.map((r) => [r.qNumber, r.marksAwarded, r.pickedOption])).toEqual([
      [1, 0, "q1-wrong"],
      [2, 1, "q2-correct"],
      [3, 0, "q3-wrong"],
    ]);
    expect(a.ws.questions.map((q) => q.questionText)).toEqual([
      "Question 1: solve it.", "Question 2: solve it.", "Question 3: solve it.",
    ]);
    expect(a.coaching).toContain(UNTYPED_MARKS_NOTE);
  });
});
