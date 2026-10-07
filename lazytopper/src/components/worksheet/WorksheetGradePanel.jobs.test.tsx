// src/components/worksheet/WorksheetGradePanel.jobs.test.tsx
//
// GRADING-JOBS-1 J2 on the Worksheet panel, rendered for real (service mocked):
//   · the grade opts into a background job for THIS worksheet (one sessionStorage slot);
//   · rows land one by one — a provisional row shows no mark;
//   · a reload mid-poll resumes the SAME stored job (resumeOnly, no file needed);
//   · an interruption keeps the marked rows and "Grade the remaining N" re-grades only those.
//
// MUTATION M3 (do not persist / resume the job) turns "a reload mid-poll…" RED.
//
// Scoped run:
//   pnpm exec vitest run src/components/worksheet/WorksheetGradePanel.jobs.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  __setGradingJobTimersForTests,
  GradingJobInterruptedError,
  type GradingJobOptions,
  type GradingJobRow,
  type StoredGradingJob,
} from "../../ai/gradingJobs";

const gradeWorksheetAndRecord = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }),
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false }),
}));
vi.mock("../../services/worksheetGradeService", () => ({
  gradeWorksheetAndRecord: (...args: unknown[]) => gradeWorksheetAndRecord(...args),
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetGrade: () => null,
  listStoredWorksheetsLite: () => [],
}));
// The QR handoff fills the SAME state the file input fills — the shortest honest way to
// put a file on the panel without a canvas.
vi.mock("../qr/QrAnswerHandoff", () => ({
  default: ({ onImageReceived }: { onImageReceived: (v: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" onClick={() => onImageReceived({ imageBase64: "JVBERi0xLjQ=", imageMimeType: "application/pdf" })}>
      qr-deliver
    </button>
  ),
}));

import WorksheetGradePanel from "./WorksheetGradePanel";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const WS = {
  worksheetId: "ws-1",
  createdAt: "2026-10-04T00:00:00.000Z",
  title: "AP worksheet",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [
    {
      qNumber: 1,
      id: "q1",
      subject: "Maths",
      topicKey: "arithmetic-progressions",
      topicLabel: "Arithmetic Progressions",
      section: "C",
      marks: 3,
      questionText: "Find the 10th term of the AP 3, 7, 11, …",
    },
  ],
} as PersistedWorksheet;

function stubPointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(pointer: coarse)" ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderWithFile() {
  render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "qr-deliver" }));
  return screen.getByRole("button", { name: /Grade my answers/ });
}

beforeEach(() => {
  gradeWorksheetAndRecord.mockReset();
  stubPointer(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});


const SLOT_KEY = "lazytopper.gradingJob.v1.worksheet:ws-1";
const JOB_ID = "c".repeat(40);
const RESPONSE = {
  response: {
    ok: true,
    worksheetId: "ws-1",
    results: [{ qNumber: 1, totalMarks: 3, marksAwarded: 2, percentage: 67, couldNotRead: false, annotatedSteps: [] }],
    totalQuestions: 1,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 3,
    worksheetTotalMarks: 3,
  },
  miOutcomes: [],
};
const row = (index: number, final: boolean, extra: Partial<GradingJobRow> = {}) =>
  ({ index, final, qNumber: index + 1, totalMarks: 3, marksAwarded: 2, percentage: 67, couldNotRead: false, ...extra }) as GradingJobRow;
type JobOpts = { job?: GradingJobOptions };

describe("J2 · Worksheet panel — background grade", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    __setGradingJobTimersForTests({ now: () => 5_000 });
  });
  afterEach(() => {
    __setGradingJobTimersForTests({ now: null });
    window.sessionStorage.clear();
  });

  it("opts in with this worksheet's slot, and shows rows as they land (provisional = no mark)", async () => {
    let opts: JobOpts | undefined;
    let finish: (v: unknown) => void = () => {};
    gradeWorksheetAndRecord.mockImplementation((_u: unknown, _ws: unknown, _up: unknown, o?: JobOpts) => {
      opts = o;
      return new Promise((resolve) => { finish = resolve; });
    });
    fireEvent.click(renderWithFile());
    await waitFor(() => expect(opts?.job).toBeDefined());
    expect(opts!.job!.paperKey).toBe("ws-1");
    expect(opts!.job!.resumeOnly).toBeUndefined();
    act(() => opts!.job!.onProgress!({ state: "running", total: 2, done: 2, rows: [row(0, true), row(1, false)] }));
    const items = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-final"));
    expect(items[0].textContent).toContain("2 / 3");
    expect(items[1].textContent).toContain("Provisional");
    expect(items[1].textContent).not.toContain("2 / 3");
    await act(async () => finish(RESPONSE));
    expect(screen.queryByTestId("grading-job-rows")).toBeNull();
  });

  it("★ a reload mid-poll resumes the SAME stored job — resumeOnly, with no file on the panel", async () => {
    const stored: StoredGradingJob = { v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 1, submittedAt: 4_000, paperKey: "ws-1" };
    window.sessionStorage.setItem(SLOT_KEY, JSON.stringify(stored));
    let opts: JobOpts | undefined;
    gradeWorksheetAndRecord.mockImplementation((_u: unknown, _ws: unknown, _up: unknown, o?: JobOpts) => {
      opts = o;
      return Promise.resolve(RESPONSE);
    });
    render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    await waitFor(() => expect(gradeWorksheetAndRecord).toHaveBeenCalledTimes(1));
    expect(opts!.job!.resumeOnly).toBe(true);
    expect(opts!.job!.store.read()?.jobId).toBe(JOB_ID);
  });

  it("CONTROL: with nothing stored, mounting grades nothing", async () => {
    render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    await act(async () => {});
    expect(gradeWorksheetAndRecord).not.toHaveBeenCalled();
  });

  it("an interruption keeps the marked rows; 'Grade the remaining N' re-grades only those (continueFrom)", async () => {
    const err = new GradingJobInterruptedError([row(0, true), row(1, true, { couldNotRead: true, marksAwarded: 0, notGraded: "interrupted" as never })], "ws-1");
    gradeWorksheetAndRecord.mockRejectedValueOnce(err).mockResolvedValueOnce(RESPONSE);
    fireEvent.click(renderWithFile());
    const remaining = await screen.findByRole("button", { name: "Grade the remaining 1 question" });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(remaining);
    await waitFor(() => expect(gradeWorksheetAndRecord).toHaveBeenCalledTimes(2));
    const second = gradeWorksheetAndRecord.mock.calls[1][3] as JobOpts;
    expect(second.job!.continueFrom).toBe(err);
  });
});
