import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import type { TutorTurn } from "../../ai/tutorClient";

/**
 * TUTOR-MIND-1 (A) / G1 — a reopened thread keeps its question context.
 * Repro: Quick Practice -> "Ask the tutor why I lost this mark" -> reload /tutor/... -> "Why was I wrong?".
 * Before: the opener persisted but the question text lived in an in-memory ref, so the reopened
 * thread went to the model with returnedWork null ("I don't have the text of Q1").
 * Now: the persisted opener carries `meta.q` (+ the pick), and a reopened thread with no one-shot and
 * no `from=` rebuilds returnedWork from OUR bank by that id, adds no opener, and sends it on the
 * next turn.
 */
const { callTutor, selectBank, saved, stored } = vi.hoisted(() => ({
  callTutor: vi.fn(),
  selectBank: vi.fn(),
  saved: [] as Array<{ messages: unknown[] }>,
  stored: { session: null as null | { messages: unknown[] } },
}));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: async () => [],
  getSessionPerQuestion: async () => null,
}));
vi.mock("../../services/practiceInsights", () => ({ getAttemptsFromCloud: async () => [] }));
vi.mock("../../services/tutorSessionStore", () => ({
  loadTutorSessionLocal: () => null,
  loadTutorSessionFromCloud: async () => stored.session,
  recordTutorTurn: () => undefined,
  saveTutorSession: (_u: unknown, doc: { messages: unknown[] }) => {
    saved.push(doc);
  },
}));
vi.mock("../../ai/tutorClient", () => ({ callTutor }));
vi.mock("./tutorContextBrief", () => ({ assembleTutorBrief: async () => null }));
vi.mock("../../data/bankChapters/loader", () => ({ ensureBankChapters: async () => undefined }));
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: selectBank }));
vi.mock("./tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => null }));
vi.mock("./conceptVisualCatalogue", () => ({ catalogueFiguresForTopic: () => [] }));

import { useTutorSession } from "./useTutorSession";
import { stashPracticeTutorAsk } from "./practiceTutorAsk";
import { practiceOwnerTag } from "../../lib/practice/practiceReturnSnapshot";
import { latestReturnMeta, returnMetaOf } from "./tutorReturnMeta";

const USER = { uid: "u-new", isLocalSession: false } as never;
function render(args: { q?: string } = {}) {
  return renderHook(() =>
    useTutorSession({
      user: USER,
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      subject: "maths",
      language: "en",
      selfHref: "/tutor/10/Maths/real-numbers",
      fromQuestionId: args.q,
    }),
  );
}
const openers = (r: ReturnType<typeof render>) => r.result.current.messages.filter((m) => m.kind === "return-result");
const settle = () => act(async () => { await new Promise((res) => setTimeout(res, 30)); });

const OPENER: TutorTurn = {
  role: "tutor",
  content: "You were on Question 3 from your Real Numbers practice.",
  kind: "return-result",
  meta: { q: "q-3", pick: "2", correct: false },
};

beforeEach(() => {
  sessionStorage.clear();
  saved.length = 0;
  stored.session = null;
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  selectBank.mockReset().mockReturnValue([{ id: "q-3", questionText: "Find the HCF of 96 and 404." }]);
});
afterEach(cleanup);

describe("tutorReturnMeta (pure)", () => {
  it("bounds the meta and drops an empty id", () => {
    expect(returnMetaOf("", "x")).toBeUndefined();
    const m = returnMetaOf("q".repeat(500), "p".repeat(900), true)!;
    expect(m.q.length).toBe(120);
    expect(m.pick!.length).toBe(200);
    expect(m.correct).toBe(true);
    expect(returnMetaOf("q-1", null, true)).toEqual({ q: "q-1" }); // no pick -> no verdict
    expect(returnMetaOf("q-1", "x = 2", null)).toEqual({ q: "q-1" }); // a pick without its verdict -> neither
  });
  it("only the NEWEST return-result decides; one without a question clears the older one", () => {
    const noQ: TutorTurn = { role: "tutor", content: "c&i", kind: "return-result" };
    expect(latestReturnMeta([OPENER])).toEqual(OPENER.meta);
    expect(latestReturnMeta([OPENER, noQ])).toBeNull();
  });
});

describe("TUTOR-MIND-1 (A) · the opener persists its question, a reload restores the context", () => {
  it("★ the persisted practice opener carries meta {q, pick, correct} from our bank/ask", async () => {
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "2", correct: false, owner: practiceOwnerTag("u-new") });
    const r = render({ q: "q-3" });
    await waitFor(() => expect(openers(r)).toHaveLength(1));
    const persisted = saved.at(-1)!.messages as TutorTurn[];
    expect(persisted.find((m) => m.kind === "return-result")?.meta).toEqual({ q: "q-3", pick: "2", correct: false });
  });

  it("★★ reload with NO one-shot and NO from=: returnedWork is rebuilt and the next turn carries it; no second opener", async () => {
    stored.session = { messages: [OPENER] };
    const r = render();
    await waitFor(() => expect(r.result.current.messages).toHaveLength(1));
    await settle();
    act(() => r.result.current.send("Why was I wrong?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    // TUTOR-MIND-1 (7): the stored tap rides, and the context is flagged as restored (an EARLIER marked question).
    expect(callTutor.mock.calls[0][0].returnedWork).toEqual({
      question: "Find the HCF of 96 and 404.",
      restored: true,
      pick: "2",
      pickCorrect: false,
    });
    expect(openers(r)).toHaveLength(1);
  });

  it("★ a send issued straight after the thread restores still waits for the question context", async () => {
    stored.session = { messages: [OPENER] };
    const r = render();
    await waitFor(() => expect(r.result.current.messages).toHaveLength(1));
    act(() => r.result.current.send("Why was I wrong?")); // no settle: races the bank lookup
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toMatchObject({ question: "Find the HCF of 96 and 404.", restored: true });
  });

  it("CONTROL — an old opener without meta restores nothing (returnedWork stays null)", async () => {
    const { meta: _meta, ...old } = OPENER;
    void _meta;
    stored.session = { messages: [old] };
    const r = render();
    await waitFor(() => expect(r.result.current.messages).toHaveLength(1));
    await settle();
    act(() => r.result.current.send("Why was I wrong?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toBeNull();
  });

  it("an id the bank no longer holds restores nothing and adds nothing", async () => {
    selectBank.mockReturnValue([]);
    stored.session = { messages: [OPENER] };
    const r = render();
    await waitFor(() => expect(r.result.current.messages).toHaveLength(1));
    await settle();
    act(() => r.result.current.send("Why was I wrong?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].returnedWork).toBeNull();
    expect(openers(r)).toHaveLength(1);
  });
});
