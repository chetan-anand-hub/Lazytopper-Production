// @vitest-environment jsdom
//
// MI-Loop Stage 2 PR 2 — loop-closer proof.
// Runs against MOCKED/LOCAL stores only: no Firebase config is present in the
// test env, so `firestoreDb` is null and every write stays in jsdom localStorage
// (no live credentials, per the secret-handling rule).
import { beforeEach, describe, expect, it } from "vitest";
import { recordAttempt } from "./practiceInsights";
import { recordWrongAnswer, getWrongConceptsForTopic } from "./adaptivePracticeEngine";
import { setActiveProgressUser } from "./studentProgressStore";
import { normalizeTopicKey } from "../utils/topicResolver";

const user = { uid: "u1" } as never;

const gaps = (label: string) =>
  getWrongConceptsForTopic(normalizeTopicKey(label) || label).reduce((s, e) => s + e.count, 0);

// Mirror the recordMistake bridge increment (free-typed graded → topic-level entry):
// recordWrongAnswer(`graded:${tk}`, tk, tk, "Medium") with tk = normalizeTopicKey(label).
function bridgeIncrement(label: string) {
  const tk = normalizeTopicKey(label) || label;
  recordWrongAnswer(`graded:${tk}`, tk, tk, "Medium");
}

describe("loop-closer: a correct attempt shrinks the active gap (key-matched)", () => {
  beforeEach(() => {
    localStorage.clear();
    setActiveProgressUser("u1");
  });

  it("decrements via the HUMAN label, clamps at 0, on two topics; wrong does not shrink", () => {
    bridgeIncrement("Real Numbers");
    bridgeIncrement("Real Numbers"); // count 2
    bridgeIncrement("Polynomials"); // count 1
    expect(gaps("Real Numbers")).toBe(2);
    expect(gaps("Polynomials")).toBe(1);

    // A WRONG attempt must NOT shrink anything.
    expect(
      recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "w0", marksScored: 1, marksAvailable: 5, mode: "graded" }),
    ).toBe("recorded");
    expect(gaps("Real Numbers")).toBe(2);

    // Clean correct drill on Real Numbers (distinct question text → no dedup).
    expect(
      recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "c1", marksScored: 5, marksAvailable: 5, mode: "graded" }),
    ).toBe("recorded");
    expect(gaps("Real Numbers")).toBe(1);
    recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "c2", marksScored: 5, marksAvailable: 5, mode: "graded" });
    expect(gaps("Real Numbers")).toBe(0);
    // Clamp: further correct attempts never go negative.
    recordAttempt(user, { subject: "Maths", topic: "Real Numbers", question: "c3", marksScored: 5, marksAvailable: 5, mode: "graded" });
    expect(gaps("Real Numbers")).toBe(0);

    // Second topic shrinks independently (guards key-matching on > 1 topic).
    expect(gaps("Polynomials")).toBe(1);
    recordAttempt(user, { subject: "Maths", topic: "Polynomials", question: "p1", marksScored: 3, marksAvailable: 3, mode: "graded" });
    expect(gaps("Polynomials")).toBe(0);
  });

  it("resolves when the surface passes a canonical slug as topicKey (desktop Check & Improve)", () => {
    bridgeIncrement("Real Numbers");
    expect(gaps("Real Numbers")).toBe(1);
    recordAttempt(user, { subject: "Maths", topic: "Real Numbers", topicKey: "real-numbers", question: "x1", marksScored: 5, marksAvailable: 5, mode: "graded" });
    expect(gaps("Real Numbers")).toBe(0);
  });
});
