// QP-UPLOAD-LATER — Quick Practice's "upload written answers later", on the REAL page through
// the REAL services. Only the network is stubbed (the grader seam `gradeWorksheet`, Firestore
// off, so the snapshot lives in this device's localStorage).
//   1. Graded scorecard with written questions left unanswered → "Upload later" writes the
//      record NOW and a snapshot; the practice page lists it under "Awaiting your written answers".
//   2. The later upload re-serves ONLY the waiting questions, grades them under the SAME
//      worksheetId (MI submission id → replace, no duplicate), records them (owner ruling),
//      re-writes the SAME record id, and clears the snapshot.
//   3. Signed out: nothing kept, honest copy.
// ★ ONE ROUTER — the single-MemoryRouter harness PracticePage.fairUse.test.tsx uses.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const auth = vi.hoisted(() => ({
  user: { uid: "student-1", isLocalSession: false, email: "s@x.com" } as Record<string, unknown> | null,
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "trial" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return {
    ...actual,
    paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
  };
});

const { gradeWorksheet, recordMistake, writeSessionRecord } = vi.hoisted(() => ({
  gradeWorksheet: vi.fn(),
  recordMistake: vi.fn(async () => ({ outcome: "logged", bridged: false })),
  writeSessionRecord: vi.fn(() => "recorded"),
}));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet };
});
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake };
});
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion: vi.fn() };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";

/** QP-WORKING-AFTER-1 — Finish with written questions that have no saved working opens the gate
 *  first; these flows test what comes AFTER it, so they take its "Skip — show my scorecard". */
function skipFinishGate() {
  const skip = screen.queryByTestId("qp-gate-skip");
  if (skip) fireEvent.click(skip);
}


const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function mkItem(n: number): PQ {
  return {
    id: `q-${n}`, questionText: `Question ${n}: solve it.`, marks: 3, section: "C", format: "vsa",
    difficulty: "Easy", subtopic: "seed", topicKey: "real-numbers",
  } as unknown as PQ;
}
const okGrade = (qNumber: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Good.",
});
const okBatch = (qs: number[]) => ({
  ok: true, results: qs.map(okGrade), totalQuestions: qs.length, gradedCount: qs.length, pendingCount: 0,
  gradedMarksAwarded: 2 * qs.length, gradedMarksTotal: 3 * qs.length, worksheetTotalMarks: 3 * qs.length,
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth.user = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
  recordMistake.mockClear();
  writeSessionRecord.mockClear();
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/practice/10/maths?topic=real-numbers&count=3"]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function buildSet() {
  mockBuild.mockResolvedValue([mkItem(1), mkItem(2), mkItem(3)]);
  setMatchMediaMatches(true);
  renderPage();
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}
const triggers = () => screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
async function typeAndSave(scope: HTMLElement, text: string) {
  const tabs = within(scope).getAllByRole("tab", { name: "Type my working" });
  fireEvent.click(tabs[tabs.length - 1]);
  const boxes = within(scope).getAllByLabelText("Type your working and answer");
  await act(async () => {
    fireEvent.change(boxes[boxes.length - 1], { target: { value: text } });
  });
  fireEvent.click(within(scope).getByTestId("qp-save-answer"));
  await within(scope).findByTestId("qp-saved-confirmation");
}
async function saveTypedFor(n: number) {
  fireEvent.click(triggers()[n - 1]);
  await typeAndSave(document.body, `answer ${n}`);
  fireEvent.click(triggers()[n - 1]);
}

describe("QP-UPLOAD-LATER · Quick Practice", () => {
  it("★★ graded scorecard → Upload later writes the record + snapshot; the strip lists it; the later grade replaces the SAME record", async () => {
    gradeWorksheet.mockResolvedValueOnce(okBatch([1]));
    await buildSet();
    await saveTypedFor(1);
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i })); skipFinishGate(); // QP-WORKING-AFTER-1 — past the gate
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const firstWorksheetId = (gradeWorksheet.mock.calls[0][0] as { worksheetId: string }).worksheetId;

    // Graded scorecard: Q2 + Q3 (written, nothing saved) can be uploaded later.
    const later = await screen.findByTestId("qp-upload-later");
    expect(screen.getByTestId("qp-upload-later-block").textContent).toContain("Q2, Q3 are not checked yet");
    // FOLLOWUPS-4 A — Q1 was graded, so "your marks so far" is true here (today's sentence).
    expect(screen.getByTestId("qp-upload-later-block").textContent).toContain(
      "Q2, Q3 are not checked yet. Upload later saves your marks so far now; write your answers on paper and upload them when you're ready.",
    );
    await waitFor(() => expect(writeSessionRecord).toHaveBeenCalled());
    const recordId = (writeSessionRecord.mock.calls.at(-1) as unknown as [unknown, { id: string }])[1].id;
    writeSessionRecord.mockClear();
    fireEvent.click(later);
    // The record is written NOW, same id; the snapshot is on this device.
    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect((writeSessionRecord.mock.calls[0] as unknown as [unknown, { id: string }])[1].id).toBe(recordId);
    const stored = JSON.parse(window.localStorage.getItem("lazytopper.qp.papers.v1.student-1") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].code).toBe(recordId);
    expect(stored[0].pending.map((p: { qNumber: number }) => p.qNumber)).toEqual([2, 3]);
    expect((await screen.findByTestId("qp-upload-later-notice")).textContent).toContain("Saved for later");
    expect(screen.queryByTestId("qp-upload-later")).toBeNull();

    // The practice page lists it under "Awaiting your written answers".
    const strip = await screen.findByTestId("qp-awaiting-strip");
    expect(strip.textContent).toContain("2 written questions waiting");

    // The later upload: ONLY Q2 + Q3 are re-served.
    fireEvent.click(within(strip).getByTestId("qp-awaiting-open"));
    const panel = await screen.findByTestId("qp-later-panel");
    // Review nit 2: no MCQ was answered in this set, so the panel never claims MCQ marks are saved.
    expect(panel.textContent).not.toMatch(/MCQ marks/);
    expect(within(panel).getAllByTestId("qp-later-question").map((el) => el.textContent?.slice(0, 10))).toEqual([
      "Question 2",
      "Question 3",
    ]);
    const [q2, q3] = within(panel).getAllByTestId("qp-later-question");
    // FOLLOWUPS-4 B — the panel has no steps to show, so it offers no "Show steps".
    expect(within(panel).queryByRole("button", { name: /Show steps|Hide steps/ })).toBeNull();
    expect(within(panel).queryByTestId("practice-mentor-cta")).toBeNull();
    // Served through PracticeQuestionCard (the gated render path): its own trigger opens the box.
    fireEvent.click(within(q2).getByRole("button", { name: "Answer this question" }));
    fireEvent.click(within(q3).getByRole("button", { name: "Answer this question" }));
    await typeAndSave(q2, "later answer 2");
    await typeAndSave(q3, "later answer 3");
    recordMistake.mockClear();
    writeSessionRecord.mockClear();
    gradeWorksheet.mockResolvedValueOnce(okBatch([2, 3]));
    fireEvent.click(within(panel).getByTestId("qp-later-grade"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(2));
    const req = gradeWorksheet.mock.calls[1][0] as { worksheetId: string; questions: { qNumber: number }[] };
    expect(req.worksheetId).toBe(firstWorksheetId);
    expect(req.questions.map((q) => q.qNumber)).toEqual([2, 3]);
    // Recorded to MI (owner ruling) under the SAME submission id → replace, never a duplicate.
    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(2));
    for (const call of recordMistake.mock.calls as unknown as Array<[unknown, unknown, { submissionId: string }]>) {
      expect(call[2].submissionId).toBe(firstWorksheetId);
    }
    // The SAME record id, re-written; the snapshot cleared.
    await waitFor(() => expect(writeSessionRecord).toHaveBeenCalledTimes(1));
    expect((writeSessionRecord.mock.calls[0] as unknown as [unknown, { id: string }])[1].id).toBe(recordId);
    expect(JSON.parse(window.localStorage.getItem("lazytopper.qp.papers.v1.student-1") || "[]")).toEqual([]);
    expect((await within(panel).findByRole("status")).textContent).toContain("Graded.");
  }, 60000);

  it("★ nothing attempted: the set is kept, but the notice never claims marks went to history (review nit 1)", async () => {
    await buildSet();
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i })); skipFinishGate(); // QP-WORKING-AFTER-1 — past the gate
    // FOLLOWUPS-4 A [FU-QP-UPLOAD-LATER-PRETAP-COPY] — nothing attempted ⇒ there are no "marks so
    // far", so the line under the button never claims them.
    await screen.findByTestId("qp-upload-later");
    const preTap = screen.getByTestId("qp-upload-later-block").textContent || "";
    expect(preTap).toContain(
      "Q1, Q2, Q3 are not checked yet. Upload later saves this set; write your answers on paper and upload them when you're ready.",
    );
    expect(preTap).not.toContain("marks so far");
    fireEvent.click(await screen.findByTestId("qp-upload-later"));
    const notice = (await screen.findByTestId("qp-upload-later-notice")).textContent || "";
    expect(notice).toContain("Your set is saved. Upload your written answers when you're ready.");
    expect(notice).not.toContain("in your history now");
    // Nothing scored → no record, but the snapshot holds the set.
    expect(writeSessionRecord).not.toHaveBeenCalled();
    const stored = JSON.parse(window.localStorage.getItem("lazytopper.qp.papers.v1.student-1") || "[]");
    expect(stored[0].pending.map((p: { qNumber: number }) => p.qNumber)).toEqual([1, 2, 3]);
  }, 60000);

  it("★ signed out: Upload later keeps nothing and says so", async () => {
    auth.user = null;
    await buildSet();
    fireEvent.click(screen.getByRole("button", { name: /Finish session/i })); skipFinishGate(); // QP-WORKING-AFTER-1 — past the gate
    fireEvent.click(await screen.findByTestId("qp-upload-later"));
    expect((await screen.findByTestId("qp-upload-later-notice")).textContent).toContain(
      "Sign in to keep this set and upload your written answers later. Nothing from this set is kept on this device.",
    );
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(Object.keys(window.localStorage).filter((k) => k.startsWith("lazytopper.qp.papers"))).toEqual([]);
    expect(screen.queryByTestId("qp-awaiting-strip")).toBeNull();
  }, 60000);
});
