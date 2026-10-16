import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * TUTOR-FIX-2 T13 — `tutor_first_message` fires ONCE per thread: on the first message a student
 * sends into a thread that holds no student turn yet; never again in that thread, and never for a
 * reopened thread that already has one. Coarse params only (subject + chapter slug), no text.
 * + [FU-PRACTICE-COUNT-PASSTHROUGH]: the practice overlay's seed carries the count the student asked for.
 */
const { track, callTutor, stored } = vi.hoisted(() => ({
  track: vi.fn(),
  callTutor: vi.fn(),
  stored: { messages: [] as Array<{ role: string; content: string; kind?: string }> },
}));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: track }));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: async () => [],
  getSessionPerQuestion: async () => null,
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
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: () => [] }));
vi.mock("./tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => null }));
vi.mock("./conceptVisualCatalogue", () => ({ catalogueFiguresForTopic: () => [] }));

import { useTutorSession, __resetFirstTutorMessageForTests } from "./useTutorSession";

const USER = { uid: "u1", isLocalSession: false } as never;
const render = (topicKey = "trigonometry") =>
  renderHook(() =>
    useTutorSession({
      user: USER,
      topicKey,
      topicLabel: "Trigonometry",
      subject: "maths",
      language: "English",
      selfHref: `/tutor/10/maths/${topicKey}`,
    }),
  );
const firstMessageCalls = () => track.mock.calls.filter((c) => c[0] === "tutor_first_message");

beforeEach(() => {
  stored.messages = [];
  track.mockReset();
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  __resetFirstTutorMessageForTests();
});
afterEach(cleanup);

describe("T13 · tutor_first_message, once per thread", () => {
  it("★★ the first message in a fresh thread fires it once, with subject + chapter only", async () => {
    const r = render();
    act(() => r.result.current.send("Why is sin 30 a half?"));
    await waitFor(() => expect(r.result.current.status).toBe("idle"));
    act(() => r.result.current.send("And cos 60?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(2));
    expect(firstMessageCalls()).toEqual([["tutor_first_message", { subject: "maths", chapter: "trigonometry" }]]);
  });

  it("a reopened thread that already holds a student turn never fires it", async () => {
    stored.messages = [
      { role: "user", content: "earlier" },
      { role: "tutor", content: "reply" },
    ];
    const r = render();
    act(() => r.result.current.send("back again"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(firstMessageCalls()).toEqual([]);
  });

  it("a different chapter is a different thread", async () => {
    const a = render("trigonometry");
    act(() => a.result.current.send("q1"));
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(1));
    cleanup();
    const b = render("real-numbers");
    act(() => b.result.current.send("q2"));
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(2));
    expect(firstMessageCalls().map((c) => c[1])).toEqual([
      { subject: "maths", chapter: "trigonometry" },
      { subject: "maths", chapter: "real-numbers" },
    ]);
  });
});

describe("[FU-PRACTICE-COUNT-PASSTHROUGH] · the overlay seed carries the student's count", () => {
  it("default 2; 'Test me with 5 questions' → 5", async () => {
    const r = render();
    expect(new URL(`https://x${r.result.current.quickPracticeHref}`).searchParams.get("count")).toBe("2");
    act(() => r.result.current.send("Test me with 5 questions"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(new URL(`https://x${r.result.current.quickPracticeHref}`).searchParams.get("count")).toBe("5");
  });
});
