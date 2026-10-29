import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

/** TUTOR-MIND-1 (4): the first send waits (briefly) for the brief instead of racing it. */
const { callTutor, assemble } = vi.hoisted(() => ({ callTutor: vi.fn(), assemble: vi.fn() }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: async () => [], getSessionPerQuestion: async () => null }));
vi.mock("../../services/practiceInsights", () => ({ getAttemptsFromCloud: async () => [] }));
vi.mock("../../services/tutorSessionStore", () => ({
  loadTutorSessionLocal: () => null,
  loadTutorSessionFromCloud: async () => null,
  recordTutorTurn: () => undefined,
  saveTutorSession: () => undefined,
}));
vi.mock("../../ai/tutorClient", () => ({ callTutor }));
vi.mock("./tutorContextBrief", () => ({ assembleTutorBrief: assemble }));
vi.mock("../../data/bankChapters/loader", () => ({ ensureBankChapters: async () => undefined }));
vi.mock("../../data/bankQuery", () => ({ selectBankQuestions: () => [] }));
vi.mock("./tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => null }));
vi.mock("./conceptVisualCatalogue", () => ({ catalogueFiguresForTopic: () => [] }));

import { useTutorSession } from "./useTutorSession";

const USER = { uid: "u-new", isLocalSession: false } as never;
const BRIEF = { hasData: true, topic: {}, mistakes: {}, windowLabel: "last 30 days" };

beforeEach(() => {
  callTutor.mockReset().mockResolvedValue({ reply: "Sure.", offer: null });
});
afterEach(cleanup);

describe("first send vs a slow brief", () => {
  it("★ a send issued before the brief lands goes out WITH the brief", async () => {
    assemble.mockReset().mockImplementation(() => new Promise((res) => setTimeout(() => res(BRIEF), 250)));
    const r = renderHook(() =>
      useTutorSession({ user: USER, topicKey: "real-numbers", topicLabel: "Real Numbers", subject: "maths", language: "en", selfHref: "/tutor/10/Maths/real-numbers" }),
    );
    act(() => r.result.current.send("How am I doing?"));
    await waitFor(() => expect(callTutor).toHaveBeenCalled());
    expect(callTutor.mock.calls[0][0].brief).toEqual(BRIEF);
  });
});
