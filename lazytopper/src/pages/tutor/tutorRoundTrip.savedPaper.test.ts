import { describe, it, expect } from "vitest";
import type { SessionRecord, SessionPerQuestionPayload } from "../../services/sessionRecords";
import {
  findScorecardQuestion,
  isSavedPaperRecord,
  savedPaperQuestionHop,
  searchWithoutReview,
  withScorecardReviewParam,
} from "./tutorRoundTrip";

// FOLLOWUPS-1 B — the saved-paper hop (Chapter Test / Full Mock / Worksheet records).
const g = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: 0,
});
const payload = (n: number) => ({ response: { results: Array.from({ length: n }, (_, i) => g(i + 1, 2, 0)) } }) as unknown as SessionPerQuestionPayload;
const rec = (surface: string, questionIds: string[]) => ({ surface, questionIds }) as unknown as SessionRecord;

describe("savedPaperQuestionHop", () => {
  it("★ names the question by its id at qNumber - 1, with the chapter topicOf gives", () => {
    expect(savedPaperQuestionHop(rec("chapter-test", ["a", "b"]), payload(2).response, 2, (id) => `ch-${id}`))
      .toEqual({ questionId: "b", topicKey: "ch-b" });
  });
  it("★ no single chapter known -> null (no button)", () => {
    expect(savedPaperQuestionHop(rec("full-mock", ["a", "b"]), payload(2).response, 2, () => null)).toBeNull();
  });
  it("★ ids that do not align 1:1 with the stored results -> null (never a mis-attributed question)", () => {
    expect(savedPaperQuestionHop(rec("full-mock", ["a"]), payload(2).response, 1, () => "x")).toBeNull();
    expect(savedPaperQuestionHop(rec("full-mock", ["a", "b"]), null, 1, () => "x")).toBeNull();
    expect(savedPaperQuestionHop(rec("full-mock", ["a", "b"]), payload(2).response, 3, () => "x")).toBeNull();
  });
});

describe("findScorecardQuestion · saved papers", () => {
  it("★★ CT / FM / WS records resolve the question by position when the payload aligns", () => {
    for (const s of ["chapter-test", "full-mock", "worksheet"]) {
      expect(isSavedPaperRecord(rec(s, []))).toBe(true);
      expect(findScorecardQuestion(rec(s, ["a", "b"]), payload(2), "b")?.qNumber).toBe(2);
    }
  });
  it("★ a misaligned payload or a question with no stored result opens the normal tutor", () => {
    expect(findScorecardQuestion(rec("chapter-test", ["a", "b"]), payload(3), "b")).toBeNull();
    expect(findScorecardQuestion(rec("full-mock", ["a", "b"]), null, "a")).toBeNull();
  });
  it("CONTROL: a Quick Practice record keeps its old behaviour (a hop with no stored result still resolves)", () => {
    expect(isSavedPaperRecord(rec("quick-practice", []))).toBe(false);
    expect(findScorecardQuestion(rec("quick-practice", ["a", "b"]), null, "b")).toEqual({ qNumber: 2, result: null });
  });
});

describe("review param helpers", () => {
  it("returnTo keeps the page query; the host strips the param once", () => {
    const back = withScorecardReviewParam("/full-mock/10/Maths" + searchWithoutReview("?review=OLD&x=1"), "FM-M-02");
    expect(back).toBe("/full-mock/10/Maths?x=1&review=FM-M-02");
    expect(searchWithoutReview("?review=FM-M-02")).toBe("");
    expect(searchWithoutReview("?a=1&review=X")).toBe("?a=1");
  });
});
