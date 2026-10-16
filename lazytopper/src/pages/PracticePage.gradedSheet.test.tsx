// QP-GRADED-SHEET-1 — the REAL PracticePage: "Download graded answer sheet (PDF)" on the Quick
// Practice scorecard, live AND reopened (history / tutor return), through the SHARED graded-sheet
// export Chapter Test and Full Mock use. Shown only when >= 1 question is graded; the export gets
// the scorecard's own rows (marks, the picks, the tap-the-answer note). The download records nothing.
//
// Harness: the one of PracticePage.scorecardReturn.test.tsx (real record store, spied writes).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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
  recordMistake: vi.fn(),
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
