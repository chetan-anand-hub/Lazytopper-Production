import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * TUTOR-FIX-2 T9 (tutor side) — `from=<worksheet code>&q=<bank id>` from a Worksheet scorecard builds
 * the returned-work opener from the REAL worksheet record + payload shapes (`buildWorksheetSessionRecord`
 * + the `ws:<code>` perQuestion payload, with an unreadable question in the results). Another account's
 * worksheet opens the normal tutor.
 */
const { getRecords, getPayload, callTutor, selectBank } = vi.hoisted(() => ({
  getRecords: vi.fn(),
  getPayload: vi.fn(),
  callTutor: vi.fn(),
  selectBank: vi.fn(),
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/sessionRecords")>()),
  getSessionRecordsFromCloud: getRecords,
  getSessionPerQuestion: getPayload,
}));
vi.mock("../../services/practiceInsights", () => ({ getAttemptsFromCloud: async () => [] }));
vi.mock("../../services/tutorSessionStore", () => ({
  loadTutorSessionLocal: () => null,
  loadTutorSessionFromCloud: async () => null,
  recordTutorTurn: () => undefined,
  saveTutorSession: () => undefined,
}));
vi.mock("../../ai/tutorClient", () => ({ callTutor }));
vi.mock("./tutorContextBrief", () => ({ assembleTutorBrief: async () => null }));
vi.mock("../../data/bankChapters/loader", () => ({ ensureBankChapters: async () => undefined }));
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: selectBank }));
vi.mock("./tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => null }));
vi.mock("./conceptVisualCatalogue", () => ({ catalogueFiguresForTopic: () => [] }));

import { useTutorSession } from "./useTutorSession";
import { buildWorksheetSessionRecord } from "../../services/sessionRecords";

const CODE = "WS-M-REALNUMBERS-07";
const q = (qNumber: number, id: string, marks: number) => ({
  qNumber, id, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks, questionText: `t${qNumber}`,
});
const WS = {
  worksheetId: "ws-7", createdAt: "2026-10-10", title: "Real Numbers", subject: "Maths", grade: "10", sectionFilter: "All",
  totalMarks: 6, code: CODE, questions: [q(1, "rn-a", 1), q(2, "rn-b", 3), q(3, "rn-c", 2)],
};
const graded = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber, ok: true, couldNotRead: false, totalMarks, marksAwarded, percentage: 0, annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
});
const RESPONSE = {
  ok: true, worksheetId: "ws-7",
  results: [graded(1, 1, 1), graded(2, 3, 1), { qNumber: 3, ok: false, couldNotRead: true, totalMarks: 2, marksAwarded: 0, percentage: 0 }],
  totalQuestions: 3, gradedCount: 2, pendingCount: 1, gradedMarksAwarded: 2, gradedMarksTotal: 4, worksheetTotalMarks: 6,
};
const wsRecord = (uid: string) => buildWorksheetSessionRecord(WS as never, RESPONSE as never, { code: CODE }, uid);

const render = () =>
  renderHook(() =>
    useTutorSession({
      user: { uid: "u1", isLocalSession: false } as never,
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      subject: "maths",
      language: "en",
      selfHref: "/tutor/10/Maths/real-numbers",
      fromRecordId: CODE,
      fromQuestionId: "rn-b",
    }),
  );
const opener = (r: ReturnType<typeof render>) => r.result.current.messages.filter((m) => m.kind === "return-result");

beforeEach(() => {
  getPayload.mockReset().mockImplementation(async (_uid: string, ref: string) =>
    ref === `ws:${CODE}` ? { ref, code: CODE, worksheetId: "ws-7", surface: "worksheet", gradedAt: 1, response: RESPONSE } : null,
  );
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockReturnValue([{ id: "rn-b", questionText: "Bank question B text" }]);
});
afterEach(cleanup);

describe("TUTOR-FIX-2 T9 · the tutor opens on a worksheet's question", () => {
  it("★★ a real worksheet record + ws: payload builds the opener and the one-shot returnedWork", async () => {
    getRecords.mockReset().mockResolvedValue([wsRecord("u1")]);
    const r = render();
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("Q2 on that Real Numbers set cost you 2 marks");
    act(() => r.result.current.send("Why?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({ question: "Bank question B text" });
  });

  it("★ another account's worksheet opens the normal tutor", async () => {
    getRecords.mockReset().mockResolvedValue([wsRecord("someone-else")]);
    const r = render();
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(opener(r)).toHaveLength(0);
  });
});
