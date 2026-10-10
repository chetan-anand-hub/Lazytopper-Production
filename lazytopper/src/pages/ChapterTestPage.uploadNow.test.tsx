// DECISION 54b pin - Chapter Test "upload RIGHT AWAY" must keep working next to "Upload later":
// submit -> scorecard -> "Upload written answers for full result" -> ChapterTestUploadPanel -> grade ->
// the record the submit wrote becomes GRADED under the SAME code (one record, not two).
// RED if ChapterTestUploadPanel is unmounted from the results phase, or gradeChapterTestUpload stops
// writing the full record.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
// The QR hand-off fills the SAME state the file input fills - the shortest honest way to put a file on the panel.
vi.mock("../components/qr/QrAnswerHandoff", () => ({
  default: ({ onImageReceived }: { onImageReceived: (v: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" onClick={() => onImageReceived({ imageBase64: "JVBERi0xLjQ=", imageMimeType: "application/pdf" })}>
      qr-deliver
    </button>
  ),
}));
const calls = vi.hoisted(() => ({ reqs: [] as Array<{ worksheetId: string; questions: Array<{ qNumber: number; marks: number }> }> }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    gradeWorksheet: async (req: { worksheetId: string; questions: Array<{ qNumber: number; marks: number }> }) => {
      calls.reqs.push(req);
      const total = req.questions.reduce((a, q) => a + q.marks, 0);
      return {
        ok: true,
        worksheetId: req.worksheetId,
        results: req.questions.map((q) => ({
          qNumber: q.qNumber, ok: true, couldNotRead: false, totalMarks: q.marks, marksAwarded: q.marks, percentage: 100,
          annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
        })),
        totalQuestions: req.questions.length, gradedCount: req.questions.length, pendingCount: 0,
        gradedMarksAwarded: total, gradedMarksTotal: total, worksheetTotalMarks: total,
      };
    },
  };
});

import ChapterTestPage from "./ChapterTestPage";
import { loadLocalSessionRecords } from "../services/sessionRecords";

beforeEach(() => {
  window.localStorage.clear();
  calls.reqs = [];
});
afterEach(() => cleanup());

describe("D54b pin · Chapter Test: submit then upload IMMEDIATELY -> graded on the SAME record", () => {
  it("★★ the record the submit wrote ('partial', objective only) becomes 'graded' under the same code; one record; the grade call carries that paper's worksheetId", async () => {
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));

    // the submit wrote the partial record
    let code = "";
    let worksheetId = "";
    await waitFor(() => {
      const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "chapter-test");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("partial");
      code = rec[0].id;
      worksheetId = rec[0].worksheetId;
    });

    // "Upload now": the scorecard's primary action opens the upload step, the student uploads and grades
    fireEvent.click(await screen.findByRole("button", { name: /Upload written answers for full result/ }));
    fireEvent.click(await screen.findByRole("button", { name: "qr-deliver" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my written answers/ }));

    await waitFor(() => {
      const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "chapter-test");
      expect(rec).toHaveLength(1); // the SAME record, not a second one
      expect(rec[0].id).toBe(code);
      expect(rec[0].status).toBe("graded");
    }, { timeout: 15000 });
    expect(calls.reqs).toHaveLength(1);
    expect(calls.reqs[0].worksheetId).toBe(worksheetId);
  }, 60000);
});
