import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * START-HERE-1 §2.5 (tutor side) — arriving with `from=<record id>&q=<question id>` loads the
 * student's OWN record and opens on the question that lost marks, with the SAME one-shot
 * returnedWork the overlay path builds. Ignoring `from` must turn this RED; another account's
 * record, a record without the question, or no `from` at all must open the normal tutor.
 */
const { getRecords, getPayload, callTutor, selectBank, stored } = vi.hoisted(() => ({
  getRecords: vi.fn(),
  getPayload: vi.fn(),
  callTutor: vi.fn(),
  selectBank: vi.fn(),
  stored: { messages: [] as Array<{ role: string; content: string; kind?: string }> },
}));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: getRecords,
  getSessionPerQuestion: getPayload,
}));
vi.mock("../../services/practiceInsights", () => ({ getAttemptsFromCloud: async () => [] }));
vi.mock("../../services/tutorSessionStore", () => ({
  loadTutorSessionLocal: () => (stored.messages.length ? { messages: stored.messages, coverage: { worked: [], doubts: [] }, pending: null } : null),
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
const mcqLost = { qNumber: 2, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 0, percentage: 0 };
const record = (over: Record<string, unknown> = {}) => ({
  id: "QP-1",
  questionIds: ["q-a", "q-b"],
  dedupKey: "u1::QP-1",
  perQuestionRef: "qp:QP-1",
  ...over,
});

function render(args: { from?: string; q?: string; user?: unknown } = {}) {
  return renderHook(() =>
    useTutorSession({
      user: ("user" in args ? args.user : USER) as never,
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      subject: "maths",
      language: "en",
      selfHref: "/tutor/10/Maths/real-numbers",
      fromRecordId: args.from,
      fromQuestionId: args.q,
    }),
  );
}
const opener = (r: ReturnType<typeof render>) => r.result.current.messages.filter((m) => m.kind === "return-result");

beforeEach(() => {
  stored.messages = [];
  getRecords.mockReset().mockResolvedValue([record()]);
  getPayload.mockReset().mockResolvedValue({ ref: "qp:QP-1", response: { results: [mcqLost] } });
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockReturnValue([{ id: "q-b", questionText: "Bank question B text" }]);
});
afterEach(cleanup);

describe("START-HERE-1 · the tutor opens on the question from the scorecard", () => {
  it("★★ from+q: the student's own record opens the tutor on that question, with the marks from the record", async () => {
    const r = render({ from: "QP-1", q: "q-b" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("Q2 on that Real Numbers set cost you 1 mark");
    expect(r.result.current.returnFollow?.label).toBe("Why was I wrong?");
    expect(getRecords).toHaveBeenCalledWith("u1"); // the uid-scoped store
  });

  it("★★ the first model turn carries the SAME one-shot returnedWork: the verbatim bank question", async () => {
    const r = render({ from: "QP-1", q: "q-b" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("Why was it not option A?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({ question: "Bank question B text" });
  });

  it("★★ MUTATION GUARD: with no `from` the SAME stored record does nothing (ignoring `from` is RED)", async () => {
    const r = render({ q: "q-b" });
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(opener(r)).toHaveLength(0);
    expect(getRecords).not.toHaveBeenCalled();
    expect(r.result.current.returnFollow).toBeNull();
  });

  it("★★ another account's record opens the normal tutor, silently", async () => {
    getRecords.mockResolvedValue([record({ dedupKey: "someone-else::QP-1" })]);
    const r = render({ from: "QP-1", q: "q-b" });
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(opener(r)).toHaveLength(0);
  });

  it.each<[string, () => void, { from: string; q: string }]>([
    ["an id this student has no record of", () => getRecords.mockResolvedValue([]), { from: "QP-1", q: "q-b" }],
    ["a different record id", () => undefined, { from: "QP-OTHER", q: "q-b" }],
    ["a question the record does not hold", () => undefined, { from: "QP-1", q: "q-zzz" }],
  ])("a missing hop (%s) opens the normal tutor", async (_n, arrange, args) => {
    arrange();
    const r = render(args);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(opener(r)).toHaveLength(0);
    expect(r.result.current.messages).toHaveLength(0);
  });

  it("★ one-shot: a thread that already holds this opener is not given a second one", async () => {
    stored.messages = [{ role: "tutor", kind: "return-result", content: "Q2 on that Real Numbers set cost you 1 mark. Want to go through why the right answer is right, and where the trap is?" }];
    const r = render({ from: "QP-1", q: "q-b" });
    await act(async () => {
      await new Promise((res) => setTimeout(res, 30));
    });
    expect(opener(r)).toHaveLength(1);
  });

  it("a signed-out visitor reads nothing", async () => {
    const r = render({ from: "QP-1", q: "q-b", user: null });
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(getRecords).not.toHaveBeenCalled();
    expect(opener(r)).toHaveLength(0);
  });
});
