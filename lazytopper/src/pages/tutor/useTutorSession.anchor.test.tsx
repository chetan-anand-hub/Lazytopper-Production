import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * TUTOR-ANCHOR-KEY-1 (a)(d) - whatever surface opened the tutor about a bank question (the tutor URL's `q`),
 * EVERY model request of that thread carries `anchorQuestion`: the full stem, the lettered options, the
 * official key and its letter, the solution steps, and the pick + verdict when the card had them.
 * The live defect: Quick Practice Q5 = CHEM-EXMPLR-1-MCQ-002, keyed "(i) and (iii)" (option C).
 */
const { callTutor, selectBank, localThread } = vi.hoisted(() => ({
  callTutor: vi.fn(),
  selectBank: vi.fn(),
  localThread: { value: null as unknown },
}));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: async () => [],
  getSessionPerQuestion: async () => null,
}));
vi.mock("../../services/practiceInsights", () => ({ getAttemptsFromCloud: async () => [] }));
vi.mock("../../services/tutorSessionStore", () => ({
  loadTutorSessionLocal: () => localThread.value,
  loadTutorSessionFromCloud: async () => null,
  recordTutorTurn: () => undefined,
  saveTutorSession: () => undefined,
}));
vi.mock("../../ai/tutorClient", () => ({ callTutor }));
vi.mock("./tutorContextBrief", () => ({ assembleTutorBrief: async () => null }));
vi.mock("../../data/bankChapters/loader", () => ({ ensureBankChapters: async () => undefined }));
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: selectBank }));
vi.mock("./tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => ({ questionText: "UNRELATED DEMO ROW", marks: 3 }) }));
vi.mock("./conceptVisualCatalogue", () => ({ catalogueFiguresForTopic: () => [] }));

import { useTutorSession } from "./useTutorSession";
import { stashPracticeTutorAsk as stashRaw } from "./practiceTutorAsk";
import { stashSignedOutAsk } from "./signedOutScorecardAsk";
import { practiceOwnerTag } from "../../lib/practice/practiceReturnSnapshot";
import { CHEM_REACTIONS_EXEMPLAR } from "../../data/questionBanks/class10/science/chemicalReactions.exemplar";

const QID = "CHEM-EXMPLR-1-MCQ-002";
const ROW = CHEM_REACTIONS_EXEMPLAR.find((q) => q.id === QID)!;
const USER = { uid: "u-new", isLocalSession: false } as never;

function render(args: { from?: string; q?: string } = {}) {
  return renderHook(() =>
    useTutorSession({
      user: USER,
      topicKey: "chemical-reactions-and-equations",
      topicLabel: "Chemical Reactions and Equations",
      subject: "science",
      language: "en",
      selfHref: "/tutor/10/Science/chemical-reactions-and-equations",
      fromRecordId: args.from,
      fromQuestionId: args.q,
    }),
  );
}
const opener = (r: ReturnType<typeof render>) => r.result.current.messages.filter((m) => m.kind === "return-result");
const settle = () => act(async () => { await new Promise((res) => setTimeout(res, 20)); });
const lastRequest = () => callTutor.mock.calls[callTutor.mock.calls.length - 1][0];

beforeEach(() => {
  sessionStorage.clear();
  localThread.value = null;
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockImplementation(() => [ROW]);
});
afterEach(cleanup);

describe("TUTOR-ANCHOR-KEY-1 · the tutor request carries the exact question and its key", () => {
  it("★★ (a) Quick Practice hop: full stem, 4 lettered options, key '(i) and (iii)' = C, the steps, the pick and its verdict", async () => {
    stashRaw({ q: QID, owner: practiceOwnerTag("u-new"), qNumber: 5, pick: "(iii) and (iv)", correct: false });
    const r = render({ q: QID });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("what's the right answer then"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    const a = callTutor.mock.calls[0][0].anchorQuestion;
    expect(a.id).toBe(QID);
    expect(a.questionText).toBe(ROW.questionText); // untruncated
    expect(a.options).toEqual(["A. (i) and (iv)", "B. (ii) and (iii)", "C. (i) and (iii)", "D. (iii) and (iv)"]);
    expect(a.answer).toBe("(i) and (iii)");
    expect(a.answerLetter).toBe("C");
    expect(a.solutionSteps).toEqual(ROW.solutionSteps);
    expect(a.studentPick).toBe("(iii) and (iv)");
    expect(a.verdict).toBe("wrong");
    // the unrelated concept demo is still sent, unchanged
    expect(callTutor.mock.calls[0][0].demoQuestion).toEqual({ questionText: "UNRELATED DEMO ROW", marks: 3 });
  });

  it("★★ it rides EVERY turn of the thread, not just the first", async () => {
    stashRaw({ q: QID, owner: practiceOwnerTag("u-new"), qNumber: 5, pick: "(iii) and (iv)", correct: false });
    const r = render({ q: QID });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("what's the right answer then"));
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(r.result.current.status).toBe("idle"));
    act(() => r.result.current.send("there are two correct options"));
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(2));
    expect(callTutor.mock.calls[1][0].anchorQuestion.answer).toBe("(i) and (iii)");
    expect(callTutor.mock.calls[1][0].anchorQuestion.answerLetter).toBe("C");
  });

  it("★★ a RESTORED thread keeps it (the opener's meta names the question and the tap)", async () => {
    localThread.value = {
      messages: [
        { role: "tutor", content: "You were on Question 5.", kind: "return-result", meta: { q: QID, pick: "(i) and (iii)", correct: true } },
        { role: "user", content: "why is it right?" },
        { role: "tutor", content: "Because." },
      ],
      pending: null,
    };
    const r = render(); // reopened with no q in the URL
    act(() => r.result.current.send("and the other options?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(lastRequest().anchorQuestion).toMatchObject({ id: QID, answerLetter: "C", studentPick: "(i) and (iii)", verdict: "right" });
  });

  it("★ a scorecard/paper hop (q in the URL, from= a record): the question is anchored even though no opener could be built", async () => {
    const r = render({ q: QID, from: "WS-1" });
    await settle();
    act(() => r.result.current.send("why was my answer marked wrong?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(lastRequest().anchorQuestion).toMatchObject({ id: QID, answer: "(i) and (iii)", answerLetter: "C" });
    expect(lastRequest().anchorQuestion.studentPick).toBeUndefined();
  });

  it("★ the signed-out scorecard hop is anchored too (a pick with no verdict is never sent)", async () => {
    stashSignedOutAsk({ q: QID, qNumber: 5, pick: "(iii) and (iv)" });
    const r = render({ q: QID });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("why?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    const a = lastRequest().anchorQuestion;
    expect(a.id).toBe(QID);
    expect(a.studentPick).toBeUndefined();
    expect(a.verdict).toBeUndefined();
  });

  it("★★ Answer Checker's own upload (q = qn:<n>, no bank row) and a cold entry carry NO anchor (D-TUT-8 unchanged)", async () => {
    selectBank.mockReturnValue([]);
    const r = render({ q: "qn:3", from: "CI-1" });
    await settle();
    act(() => r.result.current.send("why did I lose the mark?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(lastRequest().anchorQuestion).toBeNull();
    cleanup();
    callTutor.mockClear();
    const cold = render();
    act(() => cold.result.current.send("hello"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(lastRequest().anchorQuestion).toBeNull();
  });

  it("a newer opener that names no question (a Check & Improve return) retires the older anchor", async () => {
    localThread.value = {
      messages: [
        { role: "tutor", content: "Q5 opener", kind: "return-result", meta: { q: QID } },
        { role: "tutor", content: "You checked your own answer.", kind: "return-result" },
      ],
      pending: null,
    };
    const r = render({ q: QID });
    act(() => r.result.current.send("what next?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(lastRequest().anchorQuestion).toBeNull();
  });
});
