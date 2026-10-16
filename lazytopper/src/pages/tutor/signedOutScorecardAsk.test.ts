import { describe, it, expect, beforeEach } from "vitest";
import {
  SIGNED_OUT_ASK_KEY,
  SIGNED_OUT_ASK_TTL_MS,
  SIGNUP_TO_ASK_COPY,
  composeSignedOutAskOpener,
  signedOutTutorPath,
  stashSignedOutAsk,
  takeSignedOutAsk,
} from "./signedOutScorecardAsk";
import { isSafeInternalPath } from "../../utils/safeInternalPath";
import { STUDENT_DATA_MAP } from "../../services/studentDataMap";

// TUTOR-FIX-2 T12 (2) — the signed-out scorecard's one-shot: the bank id + the student's pick
// ride sessionStorage (never the URL), are read back ONCE by the tutor for the same question,
// and the redirect target is exactly /tutor/10/<Subject>/<chapter>?source=scorecard&q=<id>.

const T0 = 1_760_000_000_000;

beforeEach(() => sessionStorage.clear());

describe("signedOutTutorPath", () => {
  it("★★ is the chapter tutor with source=scorecard and q=<bank id> only — no from, no free text", () => {
    const p = signedOutTutorPath({ subject: "Maths", topicKey: "real-numbers", grade: "10", questionId: "rn-mcq-07" });
    expect(p).toBe("/tutor/10/Maths/real-numbers?q=rn-mcq-07&source=scorecard");
    const sp = new URLSearchParams(p!.split("?")[1]);
    expect([...sp.keys()].sort()).toEqual(["q", "source"]);
  });

  it("★ an id with a colon is encoded, so Login's same-origin guard still accepts the target", () => {
    const p = signedOutTutorPath({ subject: "Science", topicKey: "electricity", questionId: "qn:3" })!;
    expect(p).toContain("q=qn%3A3");
    expect(isSafeInternalPath(p)).toBe(true);
  });
});

describe("the one-shot", () => {
  it("★★ stash -> take for the same q returns the pick and the question, then it is gone (consumed once)", () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "x = 2" }, T0);
    expect(takeSignedOutAsk("q-3", T0 + 1000)).toEqual({ q: "q-3", qNumber: 3, pick: "x = 2", at: T0 });
    expect(takeSignedOutAsk("q-3", T0 + 2000)).toBeNull();
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).toBeNull();
  });

  it("★ a different question does not consume it (it waits for its own hop)", () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "A" }, T0);
    expect(takeSignedOutAsk("q-9", T0)).toBeNull();
    expect(takeSignedOutAsk("q-3", T0)?.pick).toBe("A");
  });

  it("★ an expired or malformed one-shot is dropped, never used", () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "A" }, T0);
    expect(takeSignedOutAsk("q-3", T0 + SIGNED_OUT_ASK_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).toBeNull();
    sessionStorage.setItem(SIGNED_OUT_ASK_KEY, "{not json");
    expect(takeSignedOutAsk("q-3", T0)).toBeNull();
    expect(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)).toBeNull();
  });

  it("★★ the stored value holds only q, position, pick and time — never a uid", () => {
    stashSignedOutAsk({ q: "q-3", qNumber: 3, pick: "A" }, T0);
    const raw = JSON.parse(sessionStorage.getItem(SIGNED_OUT_ASK_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["at", "pick", "q", "qNumber"]);
  });

  it("the key is registered in the student data map", () => {
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain(SIGNED_OUT_ASK_KEY);
  });
});

describe("composeSignedOutAskOpener", () => {
  it("★★ names the question and the student's pick", () => {
    const o = composeSignedOutAskOpener({ q: "q-3", qNumber: 3, pick: "x = 2", at: T0 }, "Real Numbers", "Find the HCF of 96 and 404.");
    expect(o.text).toContain("Question 3");
    expect(o.text).toContain("Real Numbers");
    expect(o.text).toContain("Find the HCF of 96 and 404.");
    expect(o.text).toContain('You chose "x = 2"');
    expect(o.follow?.send).toContain('"x = 2"');
  });

  it("no bank text and no pick: still an honest opener, nothing invented", () => {
    const o = composeSignedOutAskOpener({ q: "q-3", qNumber: null, pick: null, at: T0 }, "Real Numbers", "");
    expect(o.text).toBe(
      "You asked about a question from your Real Numbers practice. Want to go through why the right answer is right, and where the trap is?",
    );
  });
});

it("the sign-up copy is the owner's line", () => {
  expect(SIGNUP_TO_ASK_COPY).toBe(
    "Sign up free to ask the tutor why you lost this mark - your 7-day trial starts when you sign up.",
  );
});
