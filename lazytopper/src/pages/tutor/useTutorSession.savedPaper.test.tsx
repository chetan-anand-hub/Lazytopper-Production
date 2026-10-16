import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * FOLLOWUPS-1 B (tutor side) — `from=<record id>&q=<bank id>` from a Chapter Test / Full Mock /
 * Worksheet scorecard builds the SAME returned-work opener from that surface's perQuestion payload
 * (uid-scoped: another account's record, or a misaligned payload, opens the normal tutor).
 */
const { getRecords, getPayload, callTutor, selectBank } = vi.hoisted(() => ({
  getRecords: vi.fn(),
  getPayload: vi.fn(),
  callTutor: vi.fn(),
  selectBank: vi.fn(),
}));
vi.mock("../../services/sessionRecords", () => ({
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

const USER = { uid: "u1", isLocalSession: false } as never;
const g = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: 0,
});
const record = (surface: string, over: Record<string, unknown> = {}) => ({
  id: "P-1",
  surface,
  questionIds: ["q-a", "q-b"],
  dedupKey: "u1::P-1",
  perQuestionRef: "x:P-1",
  ...over,
});
const render = () =>
  renderHook(() =>
    useTutorSession({
      user: USER,
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      subject: "maths",
      language: "en",
      selfHref: "/tutor/10/Maths/real-numbers",
      fromRecordId: "P-1",
      fromQuestionId: "q-b",
    }),
  );
const opener = (r: ReturnType<typeof render>) => r.result.current.messages.filter((m) => m.kind === "return-result");
const settle = () => act(async () => {
  await new Promise((res) => setTimeout(res, 20));
});

beforeEach(() => {
  getPayload.mockReset().mockResolvedValue({ response: { results: [g(1, 1, 1), g(2, 3, 1)] } });
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockReturnValue([{ id: "q-b", questionText: "Bank question B text" }]);
});
afterEach(cleanup);

describe("FOLLOWUPS-1 B · the tutor opens on a saved paper's question", () => {
  it.each(["chapter-test", "full-mock", "worksheet"])("★★ %s: the record's payload builds the opener + the one-shot returnedWork", async (surface) => {
    getRecords.mockReset().mockResolvedValue([record(surface)]);
    const r = render();
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("Q2 on that Real Numbers set cost you 2 marks");
    act(() => r.result.current.send("Why?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({ question: "Bank question B text" });
    expect(getRecords).toHaveBeenCalledWith("u1");
  });

  it("★ another account's saved paper opens the normal tutor", async () => {
    getRecords.mockReset().mockResolvedValue([record("full-mock", { dedupKey: "someone-else::P-1" })]);
    const r = render();
    await settle();
    expect(opener(r)).toHaveLength(0);
  });

  it("★ a payload that does not align 1:1 with the record's ids opens the normal tutor", async () => {
    getRecords.mockReset().mockResolvedValue([record("chapter-test", { questionIds: ["q-x", "q-a", "q-b"] })]);
    const r = render();
    await settle();
    expect(opener(r)).toHaveLength(0);
  });
});
