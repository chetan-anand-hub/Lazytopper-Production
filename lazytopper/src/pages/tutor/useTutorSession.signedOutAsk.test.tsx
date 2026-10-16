import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * TUTOR-FIX-2 T12 (4) — a visitor who tapped "Ask the tutor why I lost this mark" while signed
 * out, signed up, and landed on /tutor/...?source=scorecard&q=<bank id> (NO from=): the tutor
 * opens on that question and the student's pick, read from the sessionStorage one-shot, ONCE.
 * No record is read (nothing was persisted), nothing is graded. Without the one-shot, or with a
 * from=, behaviour is unchanged.
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
import { SIGNED_OUT_ASK_KEY, stashSignedOutAsk } from "./signedOutScorecardAsk";

const USER = { uid: "u-new", isLocalSession: false } as never;

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
const settle = () => act(async () => { await new Promise((res) => setTimeout(res, 20)); });

beforeEach(() => {
  sessionStorage.clear();
  getRecords.mockReset().mockResolvedValue([]);
  getPayload.mockReset().mockResolvedValue(null);
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockReturnValue([{ id: "q-3", questionText: "Find the HCF of 96 and 404." }]);
});
afterEach(cleanup);

describe("TUTOR-FIX-2 T12 · the signed-out scorecard one-shot opens the tutor on the question", () => {
  it("★★ q + one-shot, no from: the opener names the question and the pick; no record is read", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("Question 3");
    expect(opener(r)[0].content).toContain("Find the HCF of 96 and 404.");
    expect(opener(r)[0].content).toContain('You chose "x = 2"');
    expect(r.result.current.returnFollow?.label).toBe("Why was I wrong?");
    expect(getRecords).not.toHaveBeenCalled();
    expect(getPayload).not.toHaveBeenCalled();
  });

  it("★★ consumed once: the one-shot is gone, and a second mount adds no opener", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).toBeNull();
    cleanup();
    const r2 = render({ q: "q-3" });
    await settle();
    expect(opener(r2)).toHaveLength(0);
  });

  it("★ the first model turn carries the bank question as one-shot returnedWork", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("Why not x = 2?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({ question: "Find the HCF of 96 and 404." });
  });

  it("★★ CONTROL: q with no one-shot opens the normal tutor (signed-in Stuck / deep links unchanged)", async () => {
    const r = render({ q: "q-3" });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(r.result.current.messages).toHaveLength(0);
  });

  it("★★ CONTROL: with from= the record path owns the hop; the one-shot is left untouched", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    const r = render({ q: "q-3", from: "QP-1" });
    await settle();
    expect(opener(r)).toHaveLength(0); // no such record -> normal tutor, as before
    expect(getRecords).toHaveBeenCalledWith("u-new");
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).not.toBeNull();
  });

  it("a one-shot for another question is not used", async () => {
    stashSignedOutAsk({ q: "q-9", qNumber: 9, pick: "B" });
    const r = render({ q: "q-3" });
    await settle();
    expect(opener(r)).toHaveLength(0);
  });

  it("still signed out: nothing is read or consumed", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    const r = render({ q: "q-3", user: null });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).not.toBeNull();
  });
});
