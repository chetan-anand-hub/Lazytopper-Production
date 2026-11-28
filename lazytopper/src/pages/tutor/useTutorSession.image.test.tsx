import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/**
 * (header kept for the shared mock set) TUTOR-FIX-2 T13 — `tutor_first_message` fires ONCE per thread: on the first message a student
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

const IMG = { imageBase64: "AAAA", imageMimeType: "image/jpeg" as const };

beforeEach(() => {
  stored.messages = [];
  track.mockReset();
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
  __resetFirstTutorMessageForTests();
});
afterEach(cleanup);

describe("TUTOR-IMAGE-1 session", () => {
  it("send() says whether the message was accepted: false while a turn is in flight", async () => {
    let release: (v: unknown) => void = () => {};
    callTutor.mockReset().mockImplementation(() => new Promise((r) => { release = r; }));
    const r = render();
    let first = false;
    let second = true;
    act(() => { first = r.result.current.send("one", IMG); });
    act(() => { second = r.result.current.send("two"); });
    expect(first).toBe(true);
    expect(second).toBe(false);
    await act(async () => { release({ reply: "ok", offer: null }); });
  });

  it("the photo goes to the server on the turn that carried it", async () => {
    const r = render();
    act(() => { r.result.current.send("Solve this", IMG); });
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(1));
    const sent = callTutor.mock.calls[0][0].messages;
    expect(sent[sent.length - 1].image).toEqual(IMG);
  });

  it.each(["invalid_image", "tutor_image_disabled"])("a refused photo (%s) is dropped from the failed turn, so Retry never resends its bytes", async (code) => {
    callTutor.mockReset().mockRejectedValueOnce(Object.assign(new Error("We couldn't use that photo."), { code })).mockResolvedValue({ reply: "ok", offer: null });
    const r = render();
    act(() => { r.result.current.send("Solve this", IMG); });
    await waitFor(() => expect(r.result.current.status).toBe("error"));
    const last = r.result.current.messages[r.result.current.messages.length - 1];
    expect(last.image).toBeUndefined();
    expect(last.hasImage).toBe(true);
    expect(last.content).toBe("Solve this");
    act(() => r.result.current.retry());
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(callTutor.mock.calls[1][0].messages)).not.toContain("AAAA");
  });

  it("an ordinary failure keeps the photo for Retry", async () => {
    callTutor.mockReset().mockRejectedValueOnce(new Error("The tutor is unavailable right now.")).mockResolvedValue({ reply: "ok", offer: null });
    const r = render();
    act(() => { r.result.current.send("Solve this", IMG); });
    await waitFor(() => expect(r.result.current.status).toBe("error"));
    act(() => r.result.current.retry());
    await waitFor(() => expect(callTutor).toHaveBeenCalledTimes(2));
    const sent = callTutor.mock.calls[1][0].messages;
    expect(sent[sent.length - 1].image).toEqual(IMG);
  });
});
