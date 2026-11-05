/**
 * TUTOR-RETURN-SHEET-1 - the whole-paper Answer Checker grade persists the detected question texts
 * WITH its per-question payload (additive `questionTexts`, one per result row, aligned), through the
 * REAL persist path (DesktopCheckImprovePage -> persistCheckImproveSession -> writeSessionPerQuestion).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: true,
    isTrialExpired: false,
    hydrated: true,
    tier: "premium",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});
// The account writes a SIGNED-IN grade makes — stubbed so no Firestore is reached.
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: () => Promise.resolve({ outcome: "logged", bridged: false }) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    ensureCheckImproveSessionCode: (...a: unknown[]) => {
      const user = a[3] as { uid?: string } | null | undefined;
      if (!user?.uid) return (actual.ensureCheckImproveSessionCode as (...b: unknown[]) => unknown)(...a);
      return Promise.resolve({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 });
    },
    getSessionRecordsFromCloud: () => Promise.resolve([]),
  };
});
import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null };

const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    {
      stepNumber: 1,
      description: "Assume rational",
      studentWork: "Let root 2 = p/q",
      status: "partial",
      marksAwarded: 1,
      marksDeducted: 1,
      teacherAnnotation: "State co-prime.",
      mistakeType: "presentation",
      correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};
const TWO_QUESTIONS = {
  ...DETECTED,
  questions: [
    { questionNumber: 1, questionText: "Q-A", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "stated" },
  ],
};
const PAPER_GRADED = {
  ok: true,
  results: [
    { qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
    { qNumber: 2, couldNotRead: false, totalMarks: 3, ok: true, marksAwarded: 3, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
  ],
  totalQuestions: 2,
  gradedCount: 2,
  pendingCount: 0,
  gradedMarksAwarded: 4,
  gradedMarksTotal: 5,
  worksheetTotalMarks: 5,
};

function page(props: { overlay?: { onClose: () => void } } = {}) {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/login" element={<div data-testid="login-probe" />} />
      </Routes>
    </MemoryRouter>
  );
}


import { getSessionPerQuestion } from "../../services/sessionRecords";

async function typeAndReadQuestion(text = "Prove that root 2 is irrational.") {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: text } });
  const before = H.detectQuestion.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(before + 1));
  await act(async () => {});
}

function typeAnswer(value: string) {
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value } });
}

async function clickGrade() {
  const grade = await screen.findByRole("button", { name: /Grade my answer|Retry grading/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}


beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.sub.isPremium = true;
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset().mockResolvedValue(PAPER_GRADED);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TUTOR-RETURN-SHEET-1 - the persisted Answer Checker payload carries the question texts", () => {
  it("a 2-question paper stores two aligned texts", async () => {
    H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
      req.question === "Q-A" || req.question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : TWO_QUESTIONS,
    );
    const { container } = render(page());
    await typeAndReadQuestion("Two questions");
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
    await clickGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    await waitFor(async () => {
      const payload = await getSessionPerQuestion("u1", "ci:CI-M-REAL-02");
      expect(payload?.questionTexts).toEqual(["Q-A", "Q-B"]);
      expect(payload?.response.results).toHaveLength(2);
    });
  });
});

/* SCORECARD-SECTION-TYPE-1 - the paid read's detected SECTION and objective flag ride the saved response
   (stamped on each row, "as read from your paper"), through the real persist path, and the stored card
   restores the same lens. They are display only: NOT sent to the grader, no mark moves. */
describe("SCORECARD-SECTION-TYPE-1 - the detected section persists with the Answer Checker paper", () => {
  it("stamps section / basis / read type on the persisted rows, keeps the grader's marks, and the restored card shows the lens", async () => {
    H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
      req.question === "Q-A" || req.question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : {
            ...TWO_QUESTIONS,
            questions: [
              { questionNumber: 1, questionText: "Q-A", marks: 1, marksSource: "section", section: "A", objective: true },
              { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "inferred", section: "C", objective: false },
            ],
          },
    );
    const { container } = render(page());
    await typeAndReadQuestion("Two questions");
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
    await clickGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    // display only: the grade request carries no section from the read
    const sent = H.gradeWorksheet.mock.calls[0][0] as { questions: Array<{ section?: string }> };
    expect(sent.questions.map((q) => q.section)).toEqual([undefined, undefined]);
    let payload: Awaited<ReturnType<typeof getSessionPerQuestion>> = null;
    await waitFor(async () => {
      payload = await getSessionPerQuestion("u1", "ci:CI-M-REAL-02");
      expect(payload?.response.results).toHaveLength(2);
    });
    const rows = payload!.response.results;
    expect(rows.map((r) => [r.section, r.sectionBasis, r.format])).toEqual([
      ["A", "read", "objective"],
      ["C", "check", "written"],
    ]);
    // the grader's marks and mistake data are untouched
    expect(rows.map((r) => r.marksAwarded)).toEqual([1, 3]);
    expect(rows[0].mistakeSummary).toEqual(PAPER_GRADED.results[0].mistakeSummary);
    // the restored card carries the lens
    const { storedCheckImproveScorecardVariant } = await import("../../components/results/scorecardVariants");
    const restored = storedCheckImproveScorecardVariant(
      { id: "CI-M-REAL-02", surface: "check-improve", marksAwarded: 4, marksTotal: 5, status: "graded", topicSource: "inferred", title: "T", fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } } as never,
      { gradedDateLabel: "x", response: payload!.response, onDone: () => {} },
    );
    expect(restored.sectionLens!.map((r) => [r.section, r.check])).toEqual([["A", false], ["C", true]]);
    expect(restored.sectionLensNote).toContain("as read from your paper");
    expect(restored.typeLens!.map((r) => r.label)).toEqual(["MCQ / Assertion-Reason", "Written"]);
  });
});

/* GRADE-MARKS-1 - the Answer Checker whole paper: the paid read asks detect for section marks, the
   confirm step lets the student correct each question's marks BEFORE grading (the edit is what the
   grade request sends), a guessed mark is flagged, and the paper summary states the FINAL marks.
   (Kept in this file: it grades on the same real page with the same mocks.) */
// Q19 / Q20 / Q21 of a sectioned paper: Q20 sits on a page with no header and its mark was guessed.
const GM_PAPER = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [
    { questionNumber: 1, questionText: "Q1 MCQ", marks: 1, marksSource: "section", section: "A", objective: true, offersOptions: true },
    { questionNumber: 2, questionText: "Q2 MCQ", marks: 1, marksSource: "section", section: "A", objective: true, offersOptions: true },
    { questionNumber: 20, questionText: "Prove that root 5 is irrational.", marks: 5, marksSource: "inferred", section: "C" },
  ],
};
const gmRow = (qNumber: number, marksAwarded: number, totalMarks: number, objective = false) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: 0, objective,
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
});
// The final (clamped) rows: both MCQs right (2/2), Q20 2/3. The model's own summary says "1 out of 2".
const GM_GRADED = {
  ok: true,
  results: [gmRow(1, 1, 1, true), gmRow(2, 1, 1, true), gmRow(20, 2, 3)],
  totalQuestions: 3, gradedCount: 3, pendingCount: 0,
  gradedMarksAwarded: 4, gradedMarksTotal: 5, worksheetTotalMarks: 5,
  summary: "You scored 1 out of 2 marks on these objective questions. Always state the assumption first in a proof.",
};

describe("GRADE-MARKS-1 - Answer Checker paper marks", () => {
  beforeEach(() => {
    H.detectQuestion.mockReset().mockImplementation(async (req: { question?: string }) =>
      req.question === "Whole paper" ? GM_PAPER : { ok: true, detectedTopic: null, detectedSubject: null },
    );
    H.gradeWorksheet.mockReset().mockResolvedValue(GM_GRADED);
  });

  it("asks for section marks, flags the guess, sends the student's corrected marks, and the summary states the final marks", async () => {
    const { container } = render(page());
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Whole paper" } });
    fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(H.detectQuestion.mock.calls[0][0]).toMatchObject({ sectionMarks: true, keySource: true });

    expect(await screen.findByText("Check: we guessed 5")).toBeTruthy();
    // §13: the MCQs are read-only (a 1-mark, 0-or-full question is never re-marked).
    expect(screen.queryByLabelText("Marks for Q1")).toBeNull();
    expect(screen.getByTestId("paper-marks-editor").textContent).toContain("Total: 7 marks");
    fireEvent.change(screen.getByLabelText("Marks for Q20"), { target: { value: "3" } });
    expect(screen.queryByText(/Check: we guessed/)).toBeNull();
    expect(screen.getByTestId("paper-marks-editor").textContent).toContain("Total: 5 marks");

    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
    const grade = await screen.findByRole("button", { name: /Grade my answer|Retry grading/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = H.gradeWorksheet.mock.calls[0][0] as { questions: Array<{ qNumber: number; marks: number }> };
    expect(sent.questions.map((q) => [q.qNumber, q.marks])).toEqual([[1, 1], [2, 1], [20, 3]]);
    // The request carries no new field: the section letter is display-only (never a grading signal).
    for (const q of sent.questions) expect(q).not.toHaveProperty("section");

    await waitFor(() => expect(screen.getByText(/On the objective questions: 2 out of 2 marks\./)).toBeTruthy());
    expect(document.body.textContent).not.toContain("1 out of 2 marks on these objective questions");
    expect(document.body.textContent).toContain("Always state the assumption first in a proof.");
  });
});

describe("GRADE-MARKS-1 R4 - the single-question marks chip is locked at 1 for a detect-objective question", () => {
  it("an MCQ read as 2 marks is shown and SENT as 1; the 1-6 chip is not offered", async () => {
    H.detectQuestion.mockReset().mockResolvedValue({
      ok: true, detectedMarks: 2, detectedSubject: "Maths", detectedTopic: "polynomials", marksSource: "inferred", detectedObjective: true,
      questions: [{ questionNumber: 1, questionText: "Which is a zero of x^2 - 5x + 6? a) 1 b) 2 c) 4 d) 5", marks: 2, marksSource: "inferred", objective: true, offersOptions: true }],
    });
    render(page());
    await typeAndReadQuestion("Which is a zero of x^2 - 5x + 6? a) 1 b) 2 c) 4 d) 5");
    expect(document.body.textContent).toContain("1 mark");
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByTestId("ci-marks-locked")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "3" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    typeAnswer("My answer is option b) 2");
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    expect((H.checkSolutionImage.mock.calls[0][0] as { marks: number }).marks).toBe(1);
  });
});

describe("GRADE-MARKS-1 S1 - a detect-objective question WITHOUT an option list stays editable", () => {
  it("a wrongly-flagged 5-mark proof keeps 5, is editable, and is sent as a WRITTEN question (objective false)", async () => {
    H.detectQuestion.mockReset().mockImplementation(async (req: { question?: string }) =>
      req.question === "Whole paper"
        ? { ok: true, detectedMarks: 1, detectedSubject: "Maths", detectedTopic: "real-numbers", marksSource: "stated",
            questions: [
              { questionNumber: 1, questionText: "Q1 MCQ", marks: 1, marksSource: "section", objective: true, offersOptions: true },
              { questionNumber: 22, questionText: "Prove that root 5 is irrational.", marks: 5, marksSource: "section", objective: true, offersOptions: false },
            ] }
        : { ok: true, detectedTopic: null, detectedSubject: null },
    );
    H.gradeWorksheet.mockReset().mockResolvedValue({ ok: true, results: [gmRow(1, 1, 1, true), gmRow(22, 3, 5)], totalQuestions: 2, gradedCount: 2, pendingCount: 0, gradedMarksAwarded: 4, gradedMarksTotal: 6, worksheetTotalMarks: 6, summary: "" });
    const { container } = render(page());
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Whole paper" } });
    fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect((screen.getByLabelText("Marks for Q22") as HTMLInputElement).value).toBe("5");
    expect(screen.queryByLabelText("Marks for Q1")).toBeNull();
    expect(screen.getByTestId("paper-marks-editor").textContent).toContain("Total: 6 marks");
    const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(answerInput, { target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] } });
    await clickGrade();
    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = (H.gradeWorksheet.mock.calls[0][0] as { questions: Array<{ qNumber: number; marks: number; objective: boolean }> }).questions;
    expect(sent.map((q) => [q.qNumber, q.marks, q.objective])).toEqual([[1, 1, true], [22, 5, false]]);
  });
});
