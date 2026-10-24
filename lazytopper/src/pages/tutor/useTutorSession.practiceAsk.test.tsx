import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * TUTOR-Q-1 (A) - a signed-in student who tapped Quick Practice's "Ask the tutor about this concept"
 * lands on /tutor/...?source=practice&q=<bank id> (NO from=): the tutor opens ON that question - its
 * number, the pick and the verdict the card showed - from a this-tab one-shot, ONCE. Never on the
 * scorecard (from=) path, never from a signed-out one-shot, never without the one-shot.
 * (Adapted from the signed-out hop's suite: TUTOR-FIX-2 T12 (4) — a visitor who tapped "Ask the tutor why I lost this mark" while signed
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
import { PRACTICE_ASK_KEY, stashPracticeTutorAsk as stashRaw } from "./practiceTutorAsk";
import { practiceOwnerTag } from "../../lib/practice/practiceReturnSnapshot";

// The signed-in account of these tests is "u-new"; the one-shot is stamped with its opaque owner tag.
const stashPracticeTutorAsk = (a: Omit<Parameters<typeof stashRaw>[0], "owner">, owner = practiceOwnerTag("u-new")) =>
  stashRaw({ ...a, owner });

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

describe("TUTOR-Q-1 · Quick Practice's ask opens the tutor on the question", () => {
  it("★★ a RIGHT pick: the opener says it is right, names the question; no record is read", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "4", correct: true });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    const text = opener(r)[0].content;
    expect(text).toContain("Question 3");
    expect(text).toContain("Find the HCF of 96 and 404.");
    expect(text).toContain("that's right");
    expect(text).not.toMatch(/wrong|isn't the right/);
    expect(r.result.current.returnFollow?.label).toBe("Why is it right?");
    expect(getRecords).not.toHaveBeenCalled();
    expect(getPayload).not.toHaveBeenCalled();
  });

  it("★★ a WRONG pick: the opener says it is not the right option and never 'that's right'", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("which isn't the right option");
    expect(opener(r)[0].content).not.toContain("that's right");
    expect(r.result.current.returnFollow?.label).toBe("Why was I wrong?");
  });

  it("★ NOT answered: names the question, claims nothing", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3 });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).not.toMatch(/picked|right|wrong/);
    expect(r.result.current.returnFollow?.label).toBe("Explain this question");
  });

  it("★ the first model turn carries the bank question as one-shot returnedWork", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    act(() => r.result.current.send("Why not 2?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({ question: "Find the HCF of 96 and 404." });
  });

  it("★★ consumed once: the one-shot is gone and a second mount adds no opener", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
    cleanup();
    const r2 = render({ q: "q-3" });
    await settle();
    expect(opener(r2)).toHaveLength(0);
  });

  it("★★ CONTROL: q with no one-shot opens the normal tutor (Stuck? / deep links unchanged)", async () => {
    const r = render({ q: "q-3" });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(r.result.current.messages).toHaveLength(0);
  });

  it("★★ ANOTHER account's one-shot (same tab) opens no practice opener and is removed", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false }, practiceOwnerTag("someone-else"));
    const r = render({ q: "q-3" });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
  });

  it("★★ with from= the scorecard path owns the hop; the practice one-shot is DELETED unread (no later second opener)", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3", from: "QP-1" });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(getRecords).toHaveBeenCalledWith("u-new");
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
  });

  it("★★ a signed-out one-shot for the same question keeps its own opener (never two openers)", async () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" });
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "4", correct: true });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    await settle();
    expect(opener(r)).toHaveLength(1);
    expect(opener(r)[0].content).toContain('You chose "x = 2"');
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull(); // skipped one-shot is deleted
  });

  it("a one-shot for another question is not used", async () => {
    stashPracticeTutorAsk({ q: "q-9", qNumber: 9, pick: "B", correct: true });
    const r = render({ q: "q-3" });
    await settle();
    expect(opener(r)).toHaveLength(0);
  });

  it("still signed out: nothing is read or consumed", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3", user: null });
    await settle();
    expect(opener(r)).toHaveLength(0);
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).not.toBeNull();
  });

  it("no bank text for the row: the opener names the question number only", async () => {
    selectBank.mockReturnValue([]);
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(opener(r)).toHaveLength(1));
    expect(opener(r)[0].content).toContain("You were on Question 3 from your Real Numbers practice. You picked");
  });
});
