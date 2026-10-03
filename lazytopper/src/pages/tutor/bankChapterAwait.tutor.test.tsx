// BANK-SPLIT-1 PR-2 (L4) — route await guard: the tutor's demo question.
//
// Each tutor turn carries a verified bank question for "see how it's solved" (Fix 4),
// read from the per-chapter cache. On a cold cache, a message sent straight away must
// await the chapter before picking the demo. Remove that await and the pick reads an
// unloaded chapter, throws BankChapterNotLoadedError, the turn errors, no call goes out: RED.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const H = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock("../../ai/tutorClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/tutorClient")>();
  return {
    ...actual,
    callTutor: async (args: Record<string, unknown>) => {
      H.calls.push(args);
      return { reply: "ok" };
    },
  };
});
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import { useTutorSession } from "./useTutorSession";
import { __resetBankChaptersForTest, isBankChapterLoaded } from "../../data/bankChapters/loader";

beforeEach(() => {
  H.calls.length = 0;
  window.localStorage.clear();
  __resetBankChaptersForTest();
});

describe("L4 route await — tutor demo question", () => {
  it("★ a message sent on a cold cache waits for the chapter and carries a real bank demo question", async () => {
    const { result } = renderHook(() =>
      useTutorSession({
        user: null,
        topicKey: "triangles",
        topicLabel: "Triangles",
        subject: "maths",
        language: "en",
        selfHref: "/tutor/10/maths/triangles",
      }),
    );
    expect(isBankChapterLoaded("triangles")).toBe(false);
    act(() => {
      result.current.send("Show me how to solve one");
    });
    await waitFor(() => expect(H.calls.length).toBe(1), { timeout: 60000 });
    expect(result.current.error).toBeNull();
    const demo = H.calls[0].demoQuestion as { questionText?: string } | null;
    expect(demo, "the turn must carry the verified bank demo question").not.toBeNull();
    expect(typeof demo?.questionText).toBe("string");
    expect(isBankChapterLoaded("triangles")).toBe(true);
  }, 90000);
});
