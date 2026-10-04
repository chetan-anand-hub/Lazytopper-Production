// src/components/worksheet/WorksheetGradePanel.gradeStages.test.tsx
//
// LOW-END-1 PR-2 (R2) on the Worksheet grade panel, rendered for real:
//   · the stages the transport reports reach the student — Uploading NN% -> Sent ✓ ->
//     Grading… -> Done, and "You're offline — we'll send it when you're back";
//   · ★ a failed grade NEVER shows the raw platform message. The panel used to render
//     `err.message` verbatim, which on a dropped connection is the browser's
//     "Failed to fetch" (spec R2: "Worksheet's 'Failed to fetch' first").
//   · on a phone, the panel's picker takes a PDF too, so it says "Gallery or files".
//
// MUTATION (M8, run alone, restore verified by an empty `git diff`): put back
// `setError(err instanceof Error ? err.message : …)` in WorksheetGradePanel's catch ->
// "★ a dropped connection" RED (the alert reads "Failed to fetch").

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { GradingStage } from "../../ai/gradingTransport";

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

describe("LOW-END-1 R2 · Worksheet grade panel", () => {
  it("★ a dropped connection shows a plain sentence — never 'Failed to fetch'", async () => {
    gradeWorksheetAndRecord.mockRejectedValue(new TypeError("Failed to fetch"));
    fireEvent.click(renderWithFile());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toMatch(/failed to fetch/i);
    expect(alert.textContent).toMatch(/couldn.t grade your worksheet just now/i);
    expect(alert.textContent).toMatch(/still here/);
  });

  it("a GradingNetworkError (the transport gave up) shows its own plain sentence", async () => {
    const err = Object.assign(new Error("We couldn't send your answer — the connection dropped. Your answer is still here — please try again."), {
      name: "GradingNetworkError",
    });
    gradeWorksheetAndRecord.mockRejectedValue(err);
    fireEvent.click(renderWithFile());
    expect((await screen.findByRole("alert")).textContent).toBe(err.message);
  });

  it("★ the transport's stages reach the button — Uploading NN% -> Sent ✓ -> Grading… (and offline) — then Done", async () => {
    let onStage: ((s: GradingStage) => void) | undefined;
    let finish: (v: unknown) => void = () => {};
    gradeWorksheetAndRecord.mockImplementation((_u: unknown, _ws: unknown, _up: unknown, opts?: { onStage?: (s: GradingStage) => void }) => {
      onStage = opts?.onStage;
      return new Promise((resolve) => { finish = resolve; });
    });
    const grade = renderWithFile();
    fireEvent.click(grade);
    await waitFor(() => expect(onStage).toBeTypeOf("function"));
    const button = () => screen.getByRole("button", { name: /Uploading|Sent|Grading|offline/ });
    act(() => onStage!({ kind: "offline" }));
    expect(button().textContent).toBe("You're offline — we'll send it when you're back");
    act(() => onStage!({ kind: "uploading", percent: 42 }));
    expect(button().textContent).toBe("Uploading 42%");
    act(() => onStage!({ kind: "sent" }));
    expect(button().textContent).toBe("Sent ✓");
    act(() => onStage!({ kind: "grading" }));
    expect(button().textContent).toBe("Grading…");
    act(() => onStage!({ kind: "done" }));
    await act(async () => {
      finish({
        response: {
          ok: true,
          worksheetId: "ws-1",
          results: [],
          totalQuestions: 1,
          gradedCount: 0,
          pendingCount: 1,
          gradedMarksAwarded: 0,
          gradedMarksTotal: 0,
          worksheetTotalMarks: 3,
        },
        miOutcomes: [],
      });
    });
    expect((await screen.findAllByRole("status")).some((n) => n.textContent === "✓ Done")).toBe(true);
  });

  it("on a phone, the picker takes a PDF too, so it says 'Gallery or files'", () => {
    stubPointer(true);
    render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);
    expect(screen.getByTestId("wg-photo-gallery").textContent).toContain("Gallery or files");
    expect(screen.queryByText(/Choose from gallery/)).toBeNull();
  });
});
