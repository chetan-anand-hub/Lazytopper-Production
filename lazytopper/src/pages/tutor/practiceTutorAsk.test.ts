import { describe, it, expect, beforeEach } from "vitest";
import {
  PRACTICE_ASK_KEY,
  PRACTICE_ASK_TTL_MS,
  composePracticeAskOpener,
  stashPracticeTutorAsk,
  takePracticeTutorAsk,
} from "./practiceTutorAsk";
import { SIGNED_OUT_ASK_KEY, stashSignedOutAsk, takeSignedOutAsk } from "./signedOutScorecardAsk";
import { buildTutorPath } from "./tutorPath";
import { STUDENT_DATA_MAP } from "../../services/studentDataMap";

// TUTOR-Q-1 (A) — Quick Practice's "Ask the tutor" one-shot: the question id + its number + the pick
// (option text) and the card's verdict ride THIS-TAB sessionStorage, are read back ONCE by the tutor
// for the same `q`, and the opener never contradicts the verdict.

const T0 = 1_760_000_000_000;
beforeEach(() => sessionStorage.clear());

describe("the one-shot", () => {
  it("★★ stash -> take for the same q returns it once, then it is gone", () => {
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "x = 2", correct: false }, T0);
    expect(takePracticeTutorAsk("rn-07", T0 + 1000)).toEqual({ q: "rn-07", qNumber: 3, pick: "x = 2", correct: false, at: T0 });
    expect(takePracticeTutorAsk("rn-07", T0 + 2000)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
  });

  it("★ a different question does not consume it (it waits for its own hop)", () => {
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "A", correct: true }, T0);
    expect(takePracticeTutorAsk("rn-09", T0)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).not.toBeNull();
    expect(takePracticeTutorAsk("rn-07", T0)?.pick).toBe("A");
  });

  it("★ a stale, future-dated or malformed one-shot is dropped, never used", () => {
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "A", correct: true }, T0);
    expect(takePracticeTutorAsk("rn-07", T0 + PRACTICE_ASK_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "A", correct: true }, T0 + 10 * 60_000);
    expect(takePracticeTutorAsk("rn-07", T0)).toBeNull();
    sessionStorage.setItem(PRACTICE_ASK_KEY, "{not json");
    expect(takePracticeTutorAsk("rn-07", T0)).toBeNull();
    expect(sessionStorage.getItem(PRACTICE_ASK_KEY)).toBeNull();
  });

  it("★★ a pick without a known verdict is never stored (the tutor must not guess right or wrong)", () => {
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "A", correct: null }, T0);
    expect(takePracticeTutorAsk("rn-07", T0)).toEqual({ q: "rn-07", qNumber: 3, pick: null, correct: null, at: T0 });
  });

  it("★★ it holds only the id, position, pick, verdict and time - never a uid or working", () => {
    stashPracticeTutorAsk({ q: "rn-07", qNumber: 3, pick: "A", correct: true }, T0);
    expect(Object.keys(JSON.parse(sessionStorage.getItem(PRACTICE_ASK_KEY)!)).sort()).toEqual(["at", "correct", "pick", "q", "qNumber"]);
  });

  it("★★ the key is registered in the student data map", () => {
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain(PRACTICE_ASK_KEY);
    expect(local.holds).toContain("lazytopper.practiceReturn.v1");
  });

  it("★★ the signed-out one-shot is a different key and is unaffected either way", () => {
    expect(PRACTICE_ASK_KEY).not.toBe(SIGNED_OUT_ASK_KEY);
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x" }, T0);
    stashPracticeTutorAsk({ q: "q-3", qNumber: 3, pick: "x", correct: false }, T0);
    expect(takePracticeTutorAsk("q-3", T0)?.correct).toBe(false);
    expect(takeSignedOutAsk("q-3", T0)).toEqual({ q: "q-3", qNumber: 3, pick: "x", at: T0 });
  });
});

describe("the tutor URL carries the question id", () => {
  it("★ buildTutorPath puts the bank id in ?q= beside the concept and the return ticket", () => {
    const p = buildTutorPath({ subject: "Maths", topicKey: "real-numbers", concept: "HCF", questionId: "rn-07", source: "practice", returnTo: "/practice/10/maths?topic=real-numbers" });
    expect(new URLSearchParams(p.split("?")[1]).get("q")).toBe("rn-07");
    expect(new URLSearchParams(p.split("?")[1]).get("concept")).toBe("HCF");
  });
});

describe("composePracticeAskOpener", () => {
  const base = { q: "rn-07", qNumber: 3, at: T0 };
  const text = "Find the HCF of 96 and 404.";

  it("★★ right pick: says it is right, names the question and the pick, never 'wrong'", () => {
    const o = composePracticeAskOpener({ ...base, pick: "4", correct: true }, "Real Numbers", text);
    expect(o.text).toBe(`You were on Question 3 from your Real Numbers practice: "${text}". You picked "4" — that's right. What would you like to go through?`);
    expect(o.text).not.toMatch(/wrong|isn't the right/i);
    expect(o.follow.label).toBe("Why is it right?");
    expect(o.follow.send).toBe(`Let's go through Question 3: why is "4" right, and what's the trap in the other options?`);
  });

  it("★★ wrong pick: says it is not the right option, never 'that's right'", () => {
    const o = composePracticeAskOpener({ ...base, pick: "2", correct: false }, "Real Numbers", text);
    expect(o.text).toBe(`You were on Question 3 from your Real Numbers practice: "${text}". You picked "2", which isn't the right option. Want to go through why, and where the trap is?`);
    expect(o.text).not.toMatch(/that's right/i);
    expect(o.follow.label).toBe("Why was I wrong?");
    expect(o.follow.send).toBe(`Let's go through Question 3: I chose "2". Why was that wrong?`);
  });

  it("★ not answered / written: names the question and asks what to go through; no verdict", () => {
    const o = composePracticeAskOpener({ ...base, pick: null, correct: null }, "Real Numbers", text);
    expect(o.text).toBe(`You were on Question 3 from your Real Numbers practice: "${text}". What would you like to go through?`);
    expect(o.text).not.toMatch(/picked|right|wrong/i);
    expect(o.follow).toEqual({ label: "Explain this question", send: "Let's go through Question 3 step by step." });
  });

  it("★ missing bank text: the question number only, nothing invented", () => {
    const o = composePracticeAskOpener({ ...base, pick: "2", correct: false }, "Real Numbers", "");
    expect(o.text).toBe(`You were on Question 3 from your Real Numbers practice. You picked "2", which isn't the right option. Want to go through why, and where the trap is?`);
  });

  it("★ no position: says 'a question' / 'this question'", () => {
    const o = composePracticeAskOpener({ ...base, qNumber: null, pick: null, correct: null }, "Real Numbers", "");
    expect(o.text).toContain("You were on a question from your Real Numbers practice.");
    expect(o.follow.send).toBe("Let's go through this question step by step.");
  });

  it("a long question is shortened, and the copy has no Hinglish or 'Missed you'", () => {
    const o = composePracticeAskOpener({ ...base, pick: null, correct: null }, "Real Numbers", "x ".repeat(400));
    expect(o.text.length).toBeLessThan(400);
    expect(o.text).toContain("…");
    expect(o.text).not.toMatch(/missed you|yaar|bhai/i);
  });
});
