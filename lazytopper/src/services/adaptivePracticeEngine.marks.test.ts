/**
 * SCORECARD-MI-1 PR-2 (B7) — `recordWrongAnswer`'s optional 5th parameter: the knowledge-gap
 * MARKS a v2 grade lost. Given (> 0), the entry accumulates `conceptualMarksLost`; absent, the
 * entry is written exactly as before (no marks field, none invented). The log stays version 1.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { clearWrongAnswer, loadWrongAnswerLog, recordWrongAnswer } from "./adaptivePracticeEngine";

const KEY = "triangles::similarity";

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("lazytopper.progress.active_uid.v1", "student-m");
});

describe("recordWrongAnswer — conceptual marks accumulate only when given", () => {
  it("★ two v2 wrongs (3 + 1.5 conceptual marks) accumulate 4.5 marks over 2 marked wrongs", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium", 3);
    recordWrongAnswer("q2", "triangles", "similarity", "Medium", 1.5);
    const log = loadWrongAnswerLog();
    expect(log.version).toBe(1);
    expect(log.entries[KEY]).toMatchObject({ count: 2, conceptualMarksLost: 4.5, conceptualMarksCount: 2 });
  });

  it("CONTROL — a count-only wrong writes NO marks field (byte-identical shape to before)", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium");
    const e = loadWrongAnswerLog().entries[KEY];
    expect(e.count).toBe(1);
    expect("conceptualMarksLost" in e).toBe(false);
    expect("conceptualMarksCount" in e).toBe(false);
    expect(Object.keys(e).sort()).toEqual(["conceptKey", "count", "difficulty", "questionId", "timestamp", "topicKey"]);
  });

  it("0 / negative / NaN marks are ignored (never an invented mark)", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium", 0);
    recordWrongAnswer("q2", "triangles", "similarity", "Medium", -2);
    recordWrongAnswer("q3", "triangles", "similarity", "Medium", Number.NaN);
    const e = loadWrongAnswerLog().entries[KEY];
    expect(e.count).toBe(3);
    expect(e.conceptualMarksLost).toBeUndefined();
  });

  it("MIXED — a count-only wrong after a marked one keeps the marks and adds only to count", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium", 2);
    recordWrongAnswer("q2", "triangles", "similarity", "Medium");
    expect(loadWrongAnswerLog().entries[KEY]).toMatchObject({ count: 2, conceptualMarksLost: 2, conceptualMarksCount: 1 });
  });
});

describe("clearWrongAnswer — the marks evidence falls with the count (recovery stays possible)", () => {
  it("a marked-only entry loses one wrong's average marks per clear, then is removed", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium", 3);
    recordWrongAnswer("q2", "triangles", "similarity", "Medium", 1);
    clearWrongAnswer("triangles", "similarity");
    expect(loadWrongAnswerLog().entries[KEY]).toMatchObject({ count: 1, conceptualMarksLost: 2, conceptualMarksCount: 1 });
    clearWrongAnswer("triangles", "similarity");
    expect(loadWrongAnswerLog().entries[KEY]).toBeUndefined();
  });

  it("on a mixed entry the count-only wrong is cleared first; marks stay until only marked wrongs remain", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium", 2);
    recordWrongAnswer("q2", "triangles", "similarity", "Medium");
    clearWrongAnswer("triangles", "similarity");
    expect(loadWrongAnswerLog().entries[KEY]).toMatchObject({ count: 1, conceptualMarksLost: 2, conceptualMarksCount: 1 });
  });

  it("CONTROL — a count-only entry clears exactly as before", () => {
    recordWrongAnswer("q1", "triangles", "similarity", "Medium");
    recordWrongAnswer("q2", "triangles", "similarity", "Medium");
    clearWrongAnswer("triangles", "similarity");
    const e = loadWrongAnswerLog().entries[KEY];
    expect(e.count).toBe(1);
    expect("conceptualMarksLost" in e).toBe(false);
  });
});
