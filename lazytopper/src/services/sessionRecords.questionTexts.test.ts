// TUTOR-RETURN-SHEET-1 - the Answer Checker's question texts ride the per-question payload (additive).
import { describe, it, expect, beforeEach } from "vitest";
import {
  boundedQuestionTexts,
  noteSessionQuestionTexts,
  writeSessionPerQuestion,
  getSessionPerQuestion,
  type SessionPerQuestionPayload,
} from "./sessionRecords";

const USER = { uid: "u-qt", isLocalSession: false } as never;
const response = { ok: true, results: [], gradedMarksAwarded: 0, gradedMarksTotal: 0, gradedCount: 0, totalQuestions: 0, pendingCount: 0 } as never;
const payload = (ref: string): SessionPerQuestionPayload => ({ ref, code: "CI-X", worksheetId: ref, surface: "check-improve", gradedAt: 1, response });

beforeEach(() => window.localStorage.clear());

describe("boundedQuestionTexts", () => {
  it("keeps one entry per row, trims, bounds length, and is undefined when nothing was detected", () => {
    expect(boundedQuestionTexts([])).toBeUndefined();
    expect(boundedQuestionTexts(["", undefined, "  "])).toBeUndefined();
    expect(boundedQuestionTexts([" a ", undefined, "b"])).toEqual(["a", "", "b"]);
    expect(boundedQuestionTexts(["x".repeat(6000)])?.[0]).toHaveLength(4000);
  });
});

describe("writeSessionPerQuestion + noteSessionQuestionTexts", () => {
  it("the noted texts are stored WITH the same payload, once", async () => {
    noteSessionQuestionTexts("ci:CI-X", ["Q one"]);
    writeSessionPerQuestion(USER, payload("ci:CI-X"));
    expect((await getSessionPerQuestion("u-qt", "ci:CI-X"))?.questionTexts).toEqual(["Q one"]);
    // consumed: the next write of that ref carries none
    writeSessionPerQuestion(USER, payload("ci:CI-X"));
    expect((await getSessionPerQuestion("u-qt", "ci:CI-X"))?.questionTexts).toBeUndefined();
  });
  it("a payload with nothing noted (every other surface) is unchanged", async () => {
    writeSessionPerQuestion(USER, payload("ws:WS-1"));
    expect(await getSessionPerQuestion("u-qt", "ws:WS-1")).not.toHaveProperty("questionTexts");
  });
});
