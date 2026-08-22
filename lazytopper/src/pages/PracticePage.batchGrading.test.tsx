// PracticePage — WIRE-2 · the COLLECT-AND-BATCH flow, end to end on the real page.
//
// ════════════════════════════════════════════════════════════════════════════
// ★★ THIS IS THE SUITE THAT ANSWERS "MOUNT ≠ LIVE". #578 (per-question answer images)
// and #611 (`gradeQuickPracticeBatch`) both shipped fully tested and CALLED BY NOTHING.
// Every assertion below drives the REAL PracticePage through the REAL service, so a
// green here means the seam is REACHED, not merely importable.
// ════════════════════════════════════════════════════════════════════════════
//
// ★ NO NEW ROUTER. The page is mounted at a seed location inside the ONE MemoryRouter a
// test tree owns — the same harness `PracticePage.scorecardFeed.test.tsx` uses. #490 was
// a nested <MemoryRouter> inside the app's always-present <BrowserRouter> IN PRODUCT
// CODE, which error-paged every student; `#601`'s guard pins exactly one router. Nothing
// here wraps anything in a second one.
//
// ★ EVERY "no API call" ASSERTION HAS A CONTROL THAT DOES CALL. A zero on a spy is
// equally green when the seam was never reached, when the import is wrong, and when the
// module is broken.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const { TEST_USER } = vi.hoisted(() => ({
  TEST_USER: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: TEST_USER, loading: false, getToken: async () => "tok" }),
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

// ── The observation points ──────────────────────────────────────────────────
// THE grader. `gradeQuickPracticeBatch` defaults to `gradeWorksheet`, so counting calls
// on THIS spy counts calls on the real production seam.
// ★ `vi.hoisted` because `vi.mock` factories are hoisted above every const in the file.
const { gradeWorksheet, checkSolutionImage } = vi.hoisted(() => ({
  gradeWorksheet: vi.fn(),
  // The per-question grader — the path this lane REMOVES from Quick Practice. Every
  // "no API call" assertion checks BOTH spies, because a page that quietly kept calling
  // per question would still satisfy a check on the batch spy alone.
  checkSolutionImage: vi.fn(),
}));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, gradeWorksheet, checkSolutionImage };
});

// Mistake Intelligence — the moat. Spied, not replaced.
// ★ TYPED TO THE REAL SIGNATURES. An untyped `vi.fn()` types `mock.calls` as `[][]`, so
// every `calls[0][2]` read is a TS2493 empty-tuple error — GREEN under tsconfig.app.json
// (which excludes tests) and RED in CI's separate `typecheck:test` step.
const { recordMistake, recordAttempt } = vi.hoisted(() => ({
  recordMistake: vi.fn<
    (
      user: unknown,
      gradeResult: unknown,
      context: { subject: string; topic: string; question?: string; questionId?: string },
    ) => Promise<{ outcome: "logged"; bridged: boolean }>
  >(async () => ({ outcome: "logged" as const, bridged: false })),
  recordAttempt: vi.fn<
    (user: unknown, ctx: { questionId?: string; mode: string; marksScored: number; marksAvailable: number }) => string
  >(() => "recorded"),
}));
vi.mock("../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mistakeIntelligence")>();
  return { ...actual, recordMistake };
});
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt,
}));

// The two durable WRITE seams — #606's contract is asserted on these.
const { writeSessionRecord, writeSessionPerQuestion } = vi.hoisted(() => ({
  writeSessionRecord: vi.fn<
    (user: unknown, record: { questionIds: string[]; surface: string; perQuestionRef: string; id: string }) => string
  >(() => "recorded"),
  writeSessionPerQuestion: vi.fn<
    (
      user: unknown,
      payload: { surface: string; response: { results: Array<{ qNumber: number; marksAwarded?: number }> } },
    ) => void
  >(),
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion };
});

// Rotation forced to 0 so the DISPLAYED slice is deterministic. Everything else in the
// service — the classification, the one-call property, the MI feed, the 402 branch —
// is the real thing.
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
// ★★ THE CAP IS READ, NEVER RE-TYPED — the same module the page reads, so a drift in
// `src/config/gradingLimits.ts` moves the test and the product together. ⚠ NOT from
// `../ai/aiClient`: this file mocks that module, and a VALUE import from a mocked module
// throws "No X export is defined on the mock".
import { MAX_BATCH_UPLOADS } from "../config/gradingLimits";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

/** An MCQ (structured options, correct answer = option 0) or a written question. */
function mkItem(n: number, withOptions: boolean): PQ {
  const base = {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: withOptions ? 1 : 3,
    section: withOptions ? "A" : "C",
    format: withOptions ? "mcq" : "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
  };
  return (withOptions
    ? { ...base, options: [`q${n}-correct`, `q${n}-wrong`, `q${n}-c`, `q${n}-d`], answer: `q${n}-correct` }
    : base) as unknown as PQ;
}

const okGrade = (qNumber: number, over: Record<string, unknown> = {}) => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    {
      stepNumber: 2, description: "Substitute", studentWork: "14 x 75 = 1030",
      status: "incorrect", marksAwarded: 0, marksDeducted: 1,
      teacherAnnotation: "14 x 75 evaluated as 1030, not 1050.",
      mistakeType: "calculation", correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Method correct throughout.",
  ...over,
});

const okBatch = (results: ReturnType<typeof okGrade>[]) => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0),
  gradedMarksTotal: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
  worksheetTotalMarks: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
});

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
  gradeWorksheet.mockReset();
  checkSolutionImage.mockReset();
  recordMistake.mockClear();
  recordAttempt.mockClear();
  writeSessionRecord.mockClear();
  writeSessionPerQuestion.mockClear();
});

/** Build a 3-question set on the FULL-PAGE preset path. `overlay` mounts the same page
 *  the tutor panel mounts — same component, one router, no nesting. */
async function buildSet(pool: PQ[], opts: { overlay?: () => void; count?: number } = {}) {
  mockBuild.mockResolvedValue(pool);
  setMatchMediaMatches(true);
  const view = render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${opts.count ?? 3}`]}>
      <Routes>
        <Route
          path="/practice/:grade/:subject"
          element={opts.overlay ? <PracticePage overlay={{ onClose: opts.overlay }} /> : <PracticePage />}
        />
        <Route path="*" element={<div data-testid="elsewhere" />} />
      </Routes>
    </MemoryRouter>,
  );
  // ★ The AUTO-BUILD entry (a topic in the URL), not the preset chooser: "Quick drill"
  // commits marks=1, which would filter out every 3-mark written question this suite is
  // about. Same page, same code path for everything under test.
  await screen.findAllByText(/^Question \d+: solve it\.$/);
  return view;
}

/** Every answer-panel trigger, in DISPLAYED order. A card whose panel is already open
 *  reads "Hide answer box", so both labels are matched to keep the index stable. */
function answerTriggers(): HTMLElement[] {
  return screen.getAllByRole("button", { name: /^(Answer this question|Hide answer box)$/ });
}

/** Open question `n`'s answer panel and attach a PHOTO, then save it.
 *  ★ AMEND-621: typed working now has a channel too — see `saveTypedFor` and §12. */
async function saveAPhotoFor(n: number) {
  fireEvent.click(answerTriggers()[n - 1]);

  const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
  const input = inputs[inputs.length - 1];
  const file = new File(["working-bytes"], "working.jpg", { type: "image/jpeg" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  const save = await screen.findByTestId("qp-save-answer");
  fireEvent.click(save);
  await screen.findByTestId("qp-saved-confirmation");
  // Collapse the panel again so the next question's trigger index is unambiguous.
  fireEvent.click(answerTriggers()[n - 1]);
}

/** ★★ AMEND-621 — open question `n`'s panel, switch to the TYPE tab, type working and
 *  save it. NO photo is ever attached, which is the whole point: before this lane a
 *  typed-only answer was short-circuited to `typed-no-channel` and never sent. */
async function saveTypedFor(n: number, text = "x = 4 and x = -2") {
  fireEvent.click(answerTriggers()[n - 1]);
  const tabs = screen.getAllByRole("tab", { name: "Type my working" });
  fireEvent.click(tabs[tabs.length - 1]);
  const boxes = screen.getAllByLabelText("Type your working and answer");
  await act(async () => {
    fireEvent.change(boxes[boxes.length - 1], { target: { value: text } });
  });
  fireEvent.click(await screen.findByTestId("qp-save-answer"));
  await screen.findByTestId("qp-saved-confirmation");
  fireEvent.click(answerTriggers()[n - 1]);
}

function finish() {
  fireEvent.click(screen.getByRole("button", { name: /Finish session/i }));
}

// ---------------------------------------------------------------------------
// 1 + 2 · SAVING COSTS NOTHING, AND NEITHER DOES AN MCQ
// ---------------------------------------------------------------------------
describe("1-2 · nothing grades while the student works", () => {
  it("★ saving an answer stores it and makes NO API call (neither grader)", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);

    // POSITIVE: the confirmation is on screen, at the moment of doubt. (`saveAPhotoFor`
    // collapses the panel afterwards to keep trigger indices stable, so re-open it.)
    fireEvent.click(answerTriggers()[0]);
    expect(screen.getByText("Saved. Graded when you finish.")).toBeInTheDocument();
    // NEGATIVE, with the control below proving these spies can fire.
    expect(gradeWorksheet).not.toHaveBeenCalled();
    expect(checkSolutionImage).not.toHaveBeenCalled();
  });

  it("★ CONTROL: the SAME grader spy DOES fire once the student confirms at Finish", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
  });

  it("★ a bare MCQ option is scored LOCALLY — no API call, and no confirmation step", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    // Nothing written ⇒ no confirmation, no grade CTA, and today's scorecard instead.
    await waitFor(() => expect(document.querySelector(".lt-sc__big")).toBeTruthy());
    expect(screen.queryByTestId("qp-confirm")).toBeNull();
    expect(gradeWorksheet).not.toHaveBeenCalled();
    expect(checkSolutionImage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3 · ★★ INCLUSION IS BY WORKING, NEVER BY TYPE — BOTH DIRECTIONS
// ---------------------------------------------------------------------------
describe("3 · batch inclusion is decided by working", () => {
  it("★★ an MCQ WITH working IS batched; the SAME MCQ without working is NOT", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1, { totalMarks: 1, marksAwarded: 0 })]));
    // Q1 and Q2 are identical MCQs. Only Q1 gets working.
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    fireEvent.click(screen.getByText("q2-wrong"));
    await saveAPhotoFor(1);

    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));

    const req = gradeWorksheet.mock.calls[0][0] as {
      questions: Array<{ qNumber: number; objective?: boolean }>;
      uploads: Array<{ qNumber: number }>;
    };
    // IN: the MCQ that carries working…
    expect(req.uploads.map((u) => u.qNumber)).toEqual([1]);
    expect(req.questions.map((q) => q.qNumber)).toEqual([1]);
    // …forwarded as OBJECTIVE, so the server's deterministic 0/full clamp governs the
    // mark and the working is read for the mistake type only.
    expect(req.questions[0].objective).toBe(true);
    // OUT: the identical MCQ with only a click. Same TYPE, different EVIDENCE.
    expect(req.questions.map((q) => q.qNumber)).not.toContain(2);
  });

  it("★ a written question the student SKIPPED is not batched, and is not scored 0", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));

    const req = gradeWorksheet.mock.calls[0][0] as { questions: Array<{ qNumber: number }> };
    expect(req.questions.map((q) => q.qNumber)).toEqual([1]);
    // And the durable record omits them rather than padding a fabricated 0.
    await waitFor(() => expect(writeSessionPerQuestion).toHaveBeenCalledTimes(1));
    const payload = writeSessionPerQuestion.mock.calls[0][1];
    expect(payload.response.results.map((r) => r.qNumber)).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// 4-6 · THE CONFIRMATION STEP, AND THE CALL COUNT
// ---------------------------------------------------------------------------
describe("4-6 · confirm once, call once", () => {
  it("★ the confirmation NAMES every unanswered question", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();

    const confirm = await screen.findByTestId("qp-confirm");
    // NAMED, not counted — a student who forgot one would otherwise pay for a second call.
    expect(within(confirm).getByText(/Q2 and Q3 have nothing saved/)).toBeInTheDocument();
    expect(
      within(confirm).getByRole("button", { name: "Go back and add Q2, Q3" }),
    ).toBeInTheDocument();
    expect(within(confirm).getByRole("button", { name: "Grade my 1 answer" })).toBeInTheDocument();
  });

  it("★★ EXACTLY ONE grade call for a session with THREE written answers", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1), okGrade(2), okGrade(3)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    await saveAPhotoFor(2);
    await saveAPhotoFor(3);
    finish();

    const cta = await screen.findByTestId("qp-grade-batch");
    expect(cta.textContent).toContain("Grade my 3 answers");
    fireEvent.click(cta);
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));

    // THREE answers, ONE call, three uploads in it.
    const req = gradeWorksheet.mock.calls[0][0] as { uploads: Array<{ qNumber: number }> };
    expect(req.uploads.map((u) => u.qNumber)).toEqual([1, 2, 3]);
    expect(gradeWorksheet).toHaveBeenCalledTimes(1);
    expect(checkSolutionImage).not.toHaveBeenCalled();
    // ★ EVERY RETURNED qNumber WAS ONE WE SENT.
    const sent = new Set(req.uploads.map((u) => u.qNumber));
    for (const r of okBatch([okGrade(1), okGrade(2), okGrade(3)]).results) {
      expect(sent.has(r.qNumber)).toBe(true);
    }
  });

  it("★★ ZERO grade calls when nothing has written working", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    fireEvent.click(screen.getByText("q2-wrong"));
    fireEvent.click(screen.getByText("q3-correct"));
    // Every question attempted ⇒ the scorecard auto-offers; no Finish tap needed.
    await waitFor(() => expect(document.querySelector(".lt-sc__big")).toBeTruthy());
    expect(gradeWorksheet).toHaveBeenCalledTimes(0);
    expect(checkSolutionImage).toHaveBeenCalledTimes(0);
  });
});

// ---------------------------------------------------------------------------
// 8 + 10 · THE MOAT AND THE RECORD
// ---------------------------------------------------------------------------
describe("8+10 · MI is fed, and #606's contract holds", () => {
  it("★★ the BATCHED path records mistakes to the MI store", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1), okGrade(2)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    await saveAPhotoFor(2);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));

    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(2));
    expect(recordMistake.mock.calls.map((c) => c[2].questionId)).toEqual(["q-1", "q-2"]);
    // The score twin too — accuracy needs the marks, not just the mistakes.
    const graded = recordAttempt.mock.calls.filter((c) => c[1].mode === "graded");
    expect(graded.map((c) => c[1].questionId)).toEqual(["q-1", "q-2"]);
  });

  it("★ ONE record, ONE payload, EVERY displayed id on the record, results sparse", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));

    await waitFor(() => expect(writeSessionRecord).toHaveBeenCalledTimes(1));
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(1);
    const record = writeSessionRecord.mock.calls[0][1];
    // EVERY DISPLAYED id …
    expect(record.questionIds).toEqual(["q-1", "q-2", "q-3"]);
    expect(record.surface).toBe("quick-practice");
    // … while the PAYLOAD stays sparse (a batch grades a subset).
    const payload = writeSessionPerQuestion.mock.calls[0][1];
    expect(payload.response.results).toHaveLength(1);
    expect(payload.response.results[0].marksAwarded).toBe(2);
    expect(payload.surface).toBe("quick-practice");
  });
});

// ---------------------------------------------------------------------------
// 9 · ★★ THE 402 OPENS THE UPGRADE SHEET — NOT SILENCE, NOT A RED BOX
// ---------------------------------------------------------------------------
describe("9 · a 402 at Finish", () => {
  it("★★ opens the upgrade sheet, keeps the free marks, and shows NO error box", async () => {
    const err = Object.assign(new Error("This is a Premium feature."), {
      name: "PremiumRequiredError", feature: "grade_worksheet", tier: "free", trialEndedAt: null,
    });
    gradeWorksheet.mockRejectedValue(err);
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));

    // POSITIVE: the sheet is on screen. (`UpgradeSheet` renders a dialog with its own copy.)
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Premium|Unlock|upgrade/i);
    });
    // NOT silence: something changed on screen.
    // NOT a red box: the confirmation's own error slot stays empty.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("★ CONTROL: an ordinary grader outage DOES show the error box, and no upgrade sheet copy", async () => {
    gradeWorksheet.mockRejectedValue(new Error("network down"));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not grade your answers/i);
  });
});

// ---------------------------------------------------------------------------
// 11 · ★ THE OVERLAY RETURN TICKET SURVIVES BOTH NEW SCREENS
// ---------------------------------------------------------------------------
describe("11 · the tutor round-trip", () => {
  it("★ the return affordance is on the CONFIRMATION step and on the GRADED sheet", async () => {
    const onClose = vi.fn();
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)], { overlay: onClose });
    await saveAPhotoFor(1);
    finish();

    // SCREEN 1 — the confirmation.
    const confirm = await screen.findByTestId("qp-confirm");
    const ticketOnConfirm = within(confirm).getByRole("button", { name: "Back to your tutor" });
    expect(ticketOnConfirm).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("qp-grade-batch"));

    // SCREEN 2 — the graded sheet. Same ticket, one tap, no browser Back.
    // ⚠ SCOPED TO THE SCORECARD'S OWN MENU. The overlay chrome ALSO carries a
    // "Back to your tutor →" button at all times, so an unscoped query matches two and a
    // `getBy` would throw — and "fixing" that with `getAllBy[0]` would have asserted the
    // CHROME's button while the scorecard's row was missing. The row is the claim.
    const ticketRow = await waitFor(() => {
      const row = screen
        .getAllByRole("button", { name: /Back to your tutor/i })
        .find((b) => b.className.includes("lt-sc__mi"));
      if (!row) throw new Error("the graded sheet has no return row yet");
      return row;
    });
    expect(within(ticketRow).getByText("Back")).toBeInTheDocument();
    fireEvent.click(ticketRow);
    expect(onClose).toHaveBeenCalled();
  });

  it("★ CONTROL: on a DIRECT visit there is no return ticket on either screen", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(within(confirm).queryByRole("button", { name: /Back to your tutor/i })).toBeNull();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    await screen.findByText("Diagnosed from your working");
    expect(screen.queryAllByRole("button", { name: /Back to your tutor/i })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// COPY · the labels the owner ruled on, verbatim
// ---------------------------------------------------------------------------
describe("copy · the owner's wording", () => {
  it("★ the outer trigger reads 'Answer this question', never 'Check my answer'", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    expect(screen.getAllByRole("button", { name: "Answer this question" }).length).toBe(3);
    expect(screen.queryByRole("button", { name: "Check my answer" })).toBeNull();
  });

  it("★ the panel tells the student when grading happens, BEFORE they save", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    expect(
      screen.getAllByText(/Save your working .* everything is graded together when you finish/).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Answer this question" })[0]);
    expect(
      screen.getByText("Upload or type your working — graded at the end of the session"),
    ).toBeInTheDocument();
  });

  it("★ the graded sheet says DIAGNOSED, not 'Ready to grade' — the grading has happened", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    // PRE-grade the confirmation legitimately says "Ready to grade" …
    expect(within(await screen.findByTestId("qp-confirm")).getByText("Ready to grade")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    // … and POST-grade the sheet says what actually happened.
    await waitFor(() => {
      expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ready to grade")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12 · ★★ AMEND-621 — TYPED WORKING IS GRADED, AND THE CAP IS NAMED
//
// The acceptance bar is NOT "the classifier returns batch" — it is a typed answer
// appearing in the BATCH PAYLOAD and coming back MARKED on the sheet. Every test here
// goes through the real page: type, save, Finish, confirm, grade.
// ---------------------------------------------------------------------------
describe("12 · typed working rides the batch (AMEND-621)", () => {
  it("★★ a TYPED answer with no photo reaches the grader's PAYLOAD, verbatim", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1, "x = 4 and x = -2");
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    const sent = gradeWorksheet.mock.calls[0][0] as {
      questions: { qNumber: number; textAnswer?: string }[];
      uploads?: unknown[];
    };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([1]);
    expect(sent.questions[0].textAnswer).toBe("x = 4 and x = -2");
    // ★ It rode inside the question's own block — it added no image part.
    expect(sent.uploads ?? []).toEqual([]);
  });

  it("★ it is COUNTED in 'Grade my N answers'", async () => {
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1);
    finish();
    expect(await screen.findByRole("button", { name: "Grade my 1 answer" })).toBeInTheDocument();
    // CONTROL — a SECOND typed answer moves the count, so the "1" was not a constant.
    fireEvent.click(screen.getByRole("button", { name: /^(Keep practising this set|Go back and add )/ }));
    await saveTypedFor(2, "y = 9");
    finish();
    expect(await screen.findByRole("button", { name: "Grade my 2 answers" })).toBeInTheDocument();
  });

  it("★★ the typed answer comes back MARKED on the graded sheet — not 'not graded'", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());
    // A real mark for the typed answer, and the honest-ungraded copy is absent.
    expect(screen.getByText("Question 1")).toBeInTheDocument();
    expect(screen.queryByText("Typed working is not graded yet")).toBeNull();
    expect(screen.queryByText("Not included in this grade")).toBeNull();
  });

  it("★★ NO SURFACE tells a student typed working will not be graded", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1);
    // (a) at the moment of saving — the panel's own confirmation (reopen the panel the
    // helper collapsed; this is the surface the student is looking at right after saving)
    fireEvent.click(answerTriggers()[0]);
    expect(within(await screen.findByTestId("qp-saved-confirmation")).getByText("Saved. Graded when you finish."))
      .toBeInTheDocument();
    const notGraded = /not graded|photograph this working|not gradeable/i;
    expect(document.body.textContent).not.toMatch(notGraded);
    // (b) at the confirmation step
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(confirm.textContent).not.toMatch(notGraded);
    // ★ CONTROL — the row RENDERS, and it names the working honestly as typed.
    expect(within(confirm).getByText("Typed · 3 marks")).toBeInTheDocument();
    // (c) on the graded sheet
    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(notGraded);
  });

  it("★ CONTROL — a bare MCQ pick is STILL not batched; the by-working rule survives", async () => {
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(await screen.findByRole("button", { name: /q1-correct/ }));
    finish();
    // No confirmation step at all → no grade call is even reachable.
    expect(screen.queryByTestId("qp-confirm")).toBeNull();
    expect(gradeWorksheet).not.toHaveBeenCalled();
  });

  it("★★ EXACTLY ONE grade call for a session mixing typed and photographed working", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1), okGrade(2), okGrade(3)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1);
    await saveAPhotoFor(2);
    await saveTypedFor(3, "z = 1");
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());
    expect(gradeWorksheet).toHaveBeenCalledTimes(1);
    expect(checkSolutionImage).not.toHaveBeenCalled();
    const sent = gradeWorksheet.mock.calls[0][0] as {
      questions: { qNumber: number; textAnswer?: string }[];
      uploads?: { qNumber: number }[];
    };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([1, 2, 3]);
    expect(sent.questions.map((q) => q.textAnswer)).toEqual(["x = 4 and x = -2", undefined, "z = 1"]);
    expect(sent.uploads?.map((u) => u.qNumber)).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// 13 · ★★ THE UPLOAD CAP — a 400 never reaches the student, and the held-back
//      questions are NAMED. The server keeps its own refusal; this is the courtesy.
// ---------------------------------------------------------------------------
describe("13 · above the photo cap the excluded set is named, never a bare 400", () => {
  const bigPool = Array.from({ length: MAX_BATCH_UPLOADS + 2 }, (_, i) => mkItem(i + 1, false));

  it("★★ two photos over the cap: the cap is graded, the surplus is NAMED, no error is shown", async () => {
    gradeWorksheet.mockResolvedValue(
      okBatch(Array.from({ length: MAX_BATCH_UPLOADS }, (_, i) => okGrade(i + 1))),
    );
    await buildSet(bigPool, { count: MAX_BATCH_UPLOADS + 2 });
    for (let n = 1; n <= MAX_BATCH_UPLOADS + 2; n += 1) await saveAPhotoFor(n);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    // ★ NAMED, not counted — the same shape the unanswered list already uses.
    expect(within(confirm).getByText(
      new RegExp("One grade takes up to " + MAX_BATCH_UPLOADS + " answer photos\\. Q" +
        (MAX_BATCH_UPLOADS + 1) + " and Q" + (MAX_BATCH_UPLOADS + 2) + " are saved and not included"),
    )).toBeInTheDocument();
    expect(within(confirm).getByRole("button", { name: "Grade my " + MAX_BATCH_UPLOADS + " answers" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByTestId("qp-grade-batch"));
    await waitFor(() => expect(gradeWorksheet).toHaveBeenCalledTimes(1));
    // ★ The payload is LEGAL — the server's 400 boundary is never crossed.
    const sent = gradeWorksheet.mock.calls[0][0] as { uploads?: unknown[] };
    expect(sent.uploads).toHaveLength(MAX_BATCH_UPLOADS);
    // ★ ASSERT POSITIVELY: the sheet rendered, and the held-back ones say so honestly.
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());
    expect(screen.getAllByText("Not included in this grade")).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
  }, 120_000);

  it("★ CONTROL — a session AT the cap excludes nothing and names nothing", async () => {
    gradeWorksheet.mockResolvedValue(
      okBatch(Array.from({ length: MAX_BATCH_UPLOADS }, (_, i) => okGrade(i + 1))),
    );
    await buildSet(bigPool.slice(0, MAX_BATCH_UPLOADS), { count: MAX_BATCH_UPLOADS });
    for (let n = 1; n <= MAX_BATCH_UPLOADS; n += 1) await saveAPhotoFor(n);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(confirm.textContent).not.toMatch(/not included/i);
    expect(within(confirm).getByRole("button", { name: "Grade my " + MAX_BATCH_UPLOADS + " answers" }))
      .toBeInTheDocument();
  }, 120_000);
});

// ---------------------------------------------------------------------------
// 14 · ★★ NO RAW `\uXXXX` ESCAPE REACHES A STUDENT'S SCREEN.
//
// Found by a SCREENSHOT, not by an assertion: the confirmation step rendered the six
// literal characters `·` where a middle dot belonged. `\uXXXX` is a JS escape and
// decodes inside a string or template literal — but a JSX TEXT NODE is not a string
// literal, so `<span>Saved · free</span>` renders the backslash. `PracticePage.tsx`
// is written with `\uXXXX` escapes throughout, which makes this a standing trap in this
// file specifically, and TWO instances were live: the one this lane added and
// `"Marked now · free"`, which #621 shipped. Both now sit inside string literals.
//
// ★ This asserts the RENDERED text, so it catches the class, not the two instances.
// ---------------------------------------------------------------------------
describe("14 · no raw unicode escape reaches the student", () => {
  const RAW_ESCAPE = /\\u[0-9a-fA-F]{4}/;

  it("★★ the confirmation step renders no literal \\uXXXX — and the middle dots are real", async () => {
    await buildSet([mkItem(1, true), mkItem(2, false), mkItem(3, false)]);
    // An MCQ pick lights the "Marked now · free" label (#621's own instance) …
    fireEvent.click(await screen.findByRole("button", { name: /q1-correct/ }));
    // … and a photo lights the "Ready to grade" rows.
    await saveAPhotoFor(2);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(confirm.textContent ?? "").not.toMatch(RAW_ESCAPE);
    // ★ CONTROL — the labels that carry a middle dot DID render, with a real one, so the
    // clean scan above is not merely a screen with nothing on it.
    expect(within(confirm).getByText("Marked now · free")).toBeInTheDocument();
    expect(within(confirm).getByText(/^Photo · 3 marks$/)).toBeInTheDocument();
  });

  it("★★ the over-cap rows render no literal \\uXXXX either", async () => {
    await buildSet(
      Array.from({ length: MAX_BATCH_UPLOADS + 1 }, (_, i) => mkItem(i + 1, false)),
      { count: MAX_BATCH_UPLOADS + 1 },
    );
    for (let n = 1; n <= MAX_BATCH_UPLOADS + 1; n += 1) await saveAPhotoFor(n);
    finish();
    const confirm = await screen.findByTestId("qp-confirm");
    expect(confirm.textContent ?? "").not.toMatch(RAW_ESCAPE);
    // CONTROL — the held-back row is on screen, with its real middle dot.
    expect(within(confirm).getByText("Saved · not in this grade")).toBeInTheDocument();
  }, 120_000);

  it("★ the graded sheet renders no literal \\uXXXX", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveTypedFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());
    expect(document.body.textContent ?? "").not.toMatch(RAW_ESCAPE);
  });
});

// ---------------------------------------------------------------------------
// 13 · QP-COMBINED · 6a THE NONSENSE LINE, AND 7a THE STEP BLOCK
// ---------------------------------------------------------------------------
// ⚠⚠ NOTHING IN THIS REPO PINNED EITHER BEHAVIOUR BEFORE THIS BLOCK. All four
// PracticePage suites were 35/35 GREEN both BEFORE and AFTER the two-flag change that
// fixes 6a and ships 7a — which is precisely why `#696` needed a 1440px SCREENSHOT to
// find 6a at all, after 199 assertions, a clean build, a verified bundle and two proven
// mutations had passed. These are the assertions that would have caught it.

/** A fully-correct grade: full marks, every step clean, and a teacher note that is the
 *  VERDICT ("Fully correct.") rather than a lost-mark explanation. ★ This fixture is the
 *  whole of 6a: with `lostFromStepsOnly` unset, that note leaks into `lostDetail`. */
const cleanGrade = (qNumber: number) =>
  okGrade(qNumber, {
    marksAwarded: 3,
    totalMarks: 3,
    percentage: 100,
    teacherNote: "Fully correct.",
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    annotatedSteps: [
      {
        stepNumber: 1,
        description: "Set up and solve",
        studentWork: "14 x 75 = 1050",
        status: "correct",
        marksAwarded: 3,
        marksDeducted: 0,
        teacherAnnotation: "",
        mistakeType: null,
        correctedWorking: null,
      },
    ],
  });

describe("13 · 6a — a student who got it RIGHT is not told where the mark went", () => {
  it("★★ 6a — a FULLY CORRECT answer renders NO 'Where the mark went' line at all", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([cleanGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());

    // ⚠ THE DEFECT, STATED AS AN ASSERTION. Before the two flags `lostDetail` fell back to
    // `teacherNote` — which is ALREADY rendered as the row's verdict — so this sheet read
    // "Where the mark went: Fully correct." to a student who lost nothing.
    expect(screen.queryByText(/Where the mark went/)).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(/Where the mark went/);

    // ★★ AND IT IS PRINTED ONCE, NOT TWICE. The second half of 6a was the SAME sentence
    // appearing under two different labels; counting occurrences is what pins that.
    const body = document.body.textContent ?? "";
    expect(body.split("Fully correct.").length - 1).toBe(1);
  });

  it("★ CONTROL — an answer that DID lose marks still shows the line, from the STEP not the note", async () => {
    // ⚠ WITHOUT THIS CONTROL the test above would pass just as well if the row, the sheet
    // or the whole scorecard had vanished. `okGrade` loses a mark at step 2 and carries a
    // DIFFERENT teacherNote ("Method correct throughout."), so this also proves WHICH
    // source the detail comes from: the step annotation, never the overall note.
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());

    expect(screen.getByText(/Where the mark went/)).toBeInTheDocument();
    expect(document.body.textContent ?? "").toMatch(/14 x 75 evaluated as 1030, not 1050\./);
  });
});

describe("13 · 7a — the step block, and its honest empty state", () => {
  it("★★ 7a — an answer WITH written working renders the per-step block", async () => {
    gradeWorksheet.mockResolvedValue(okBatch([okGrade(1)]));
    await buildSet([mkItem(1, false), mkItem(2, false), mkItem(3, false)]);
    await saveAPhotoFor(1);
    finish();
    fireEvent.click(await screen.findByTestId("qp-grade-batch"));
    await waitFor(() => expect(screen.getByText("Diagnosed from your working")).toBeInTheDocument());

    // The block, the student's OWN working, and the per-step annotation beside it.
    expect(screen.getByText("Your working, step by step")).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__gsteps")).toBeTruthy();
    expect(document.body.textContent ?? "").toMatch(/14 x 75 = 1030/);
  });

  it("⚠ 7a — an MCQ answered with NO working shows NO step block and NO placeholder (D-PROG-2)", async () => {
    // A bare option click is scored LOCALLY and never batched, so there are no steps to
    // show. ★ That is legitimate — D-PROG-2, not a gap to fill — so the block must render
    // NOTHING AT ALL: no heading, no empty panel, no zeros.
    await buildSet([mkItem(1, true), mkItem(2, true), mkItem(3, true)]);
    fireEvent.click(screen.getByText("q1-correct"));
    finish();
    await waitFor(() => expect(document.querySelector(".lt-sc__big")).toBeTruthy());

    expect(screen.queryByText("Your working, step by step")).toBeNull();
    expect(document.querySelector(".lt-sc__gsteps")).toBeNull();
    expect(screen.queryByText(/Where the mark went/)).toBeNull();
  });
});
