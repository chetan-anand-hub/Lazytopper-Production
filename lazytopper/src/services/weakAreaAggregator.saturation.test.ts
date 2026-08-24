import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * WEAK-AREA-SATURATION — a topic qualifies on EVIDENCE, never on absence of data.
 *
 * Before this lane the score charged every student, on every one of the 26 canonical
 * chapters, for a retired system's silence:
 *   masteryPercent < 50      -> +(50 - 0) * 0.4 = +20   (mastery store has no live writer)
 *   attemptData.total === 0  -> +15                     (absence)
 *   masteryState === "unseen"-> +10                     (mastery store has no live writer)
 * = 45 against a threshold of `> 5`, so EVERY chapter was a weak area for EVERY
 * student, permanently — and the same summary reaches PARENTS via the share route.
 *
 * The two mastery clauses are REMOVED (not re-weighted). "Never attempted" still
 * contributes +15 to the score but can no longer qualify a topic on its own.
 */

const h = vi.hoisted(() => ({
  attempts: [] as Array<{ topicKey: string; correct: boolean; timestamp: number }>,
  wrongEntries: {} as Record<string, { topicKey: string; conceptKey: string; count: number }>,
  masteryNodes: {} as Record<string, Record<string, { state: string }>>,
  mockScores: new Map<string, { avgPercent: number; attempts: number }>(),
}));

vi.mock("./practiceInsights", () => ({ loadInsights: () => ({ attempts: h.attempts }) }));
vi.mock("./adaptivePracticeEngine", () => ({
  loadWrongAnswerLog: () => ({ version: 1, entries: h.wrongEntries }),
}));
vi.mock("./topicHubMastery", () => ({
  loadTopicMasterySnapshot: (topicKey: string) => ({
    topicKey,
    nodes: h.masteryNodes[topicKey] || {},
  }),
}));
vi.mock("./mockScoreHistory", () => ({ getMockTopicScores: () => h.mockScores }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../utils/topicResolver", () => ({ normalizeTopicKey: (k: string) => k }));
vi.mock("../data/syllabus/canonicalTopicSlug", () => ({ resolveCanonicalSlug: (k: string) => k }));
vi.mock("../data/syllabus/cbse10Canonical", () => ({
  canonicalChapters: [
    { canonicalSlug: "triangles", subjectId: "maths" },
    { canonicalSlug: "electricity", subjectId: "science" },
  ],
}));

import { getWeakAreas } from "./weakAreaAggregator";

const keysOf = (limit = 20) => getWeakAreas({ limit }).weakAreas.map((w) => w.topicKey);
const scoreOf = (topicKey: string) =>
  getWeakAreas({ limit: 20 }).weakAreas.find((w) => w.topicKey === topicKey)?.confidenceScore;

/** n attempts on `topicKey`, `correct` of them right. */
function seedAttempts(topicKey: string, total: number, correct: number) {
  for (let i = 0; i < total; i++) {
    h.attempts.push({ topicKey, correct: i < correct, timestamp: Date.now() });
  }
}

beforeEach(() => {
  h.attempts = [];
  h.wrongEntries = {};
  h.masteryNodes = {};
  h.mockScores = new Map();
});

describe("CONTROL — the harness can produce a weak area at all", () => {
  it("a topic with logged wrong answers IS returned, so an empty result is a real negative", () => {
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "similarity", count: 3 };
    // evidence = min(3*5, 30) = 15  ->  15 > 0 and 15 > 5  -> qualifies
    expect(keysOf()).toContain("triangles");
  });
});

describe("CASE 1 — a student with NO data does not get the topic as a weak area", () => {
  it("returns an EMPTY list for a brand-new student (every chapter qualified before)", () => {
    const summary = getWeakAreas({ limit: 20 });
    expect(summary.weakAreas).toEqual([]);
    expect(summary.totalWeak).toBe(0);
  });

  it("the never-attempted +15 cannot qualify a topic ALONE", () => {
    // total === 0 fires +15, which is > 5. Before the gate that alone qualified.
    expect(keysOf()).not.toContain("triangles");
    expect(keysOf()).not.toContain("electricity");
  });

  it("mastery no longer influences qualification AT ALL — removed, not re-weighted", () => {
    // A fully-mastered store and an empty store must both yield silence when there
    // is no evidence. Under the old code the empty store scored 45 and even the
    // mastered store still scored 15, so both were weak areas.
    h.masteryNodes.triangles = { n1: { state: "mastered" }, n2: { state: "mastered" } };
    expect(keysOf()).toEqual([]);
    h.masteryNodes.triangles = { n1: { state: "unseen" }, n2: { state: "unseen" } };
    expect(keysOf()).toEqual([]);
  });
});

describe("CASE 2 — a student with real mistakes DOES get the topic (regression guard)", () => {
  it("wrong answers alone qualify the topic", () => {
    h.wrongEntries.w1 = { topicKey: "electricity", conceptKey: "ohms-law", count: 2 };
    seedAttempts("electricity", 2, 2); // perfect on what they attempted
    // evidence = min(2*5, 30) = 10 ; total > 0 so no +15  -> score 10
    expect(keysOf()).toContain("electricity");
    expect(scoreOf("electricity")).toBe(10);
  });

  it("poor accuracy alone qualifies the topic", () => {
    seedAttempts("triangles", 10, 3); // accuracy 30
    // evidence = (60 - 30) * 0.3 = 9  -> score 9
    expect(keysOf()).toContain("triangles");
    expect(scoreOf("triangles")).toBe(9);
  });

  it("a poor mock score alone qualifies the topic", () => {
    h.mockScores.set("triangles", { avgPercent: 10, attempts: 1 });
    seedAttempts("triangles", 2, 2);
    // evidence = (50 - 10) * 0.25 = 10  -> score 10
    expect(keysOf()).toContain("triangles");
    expect(scoreOf("triangles")).toBe(10);
  });

  it("mistakes on a topic the student never formally practised still qualify", () => {
    // The wrong-answer log and the practice-attempt log are separate stores, so a
    // topic can carry evidence while totalAttempts is 0. Evidence is what qualifies
    // it; the +15 rides along in the score but is not what let it in.
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "similarity", count: 2 };
    expect(keysOf()).toContain("triangles");
    expect(scoreOf("triangles")).toBe(25); // 10 evidence + 15 never-attempted
  });
});

describe("CASE 3 — a student with a perfect record does NOT get the topic (recovery)", () => {
  it("a flawless topic is absent even though mastery is permanently unseen", () => {
    seedAttempts("triangles", 20, 20); // accuracy 100, no wrong answers
    h.mockScores.set("triangles", { avgPercent: 95, attempts: 2 });
    expect(keysOf()).not.toContain("triangles");
  });

  it("recovery is possible: the topic drops out once the mistakes are cleared", () => {
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "similarity", count: 3 };
    seedAttempts("triangles", 10, 10);
    expect(keysOf()).toContain("triangles");
    h.wrongEntries = {}; // student fixed them
    expect(keysOf()).not.toContain("triangles");
  });
});

describe("CASE 4 — every evidence clause contributes exactly as before", () => {
  it("the three evidence clauses sum unchanged: 9 + 10 + 5 = 24", () => {
    seedAttempts("triangles", 10, 3); //                  accuracy 30 -> (60-30)*0.3 = 9
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "c", count: 2 }; // min(10,30) = 10
    h.mockScores.set("triangles", { avgPercent: 30, attempts: 1 }); //     (50-30)*0.25 = 5
    expect(scoreOf("triangles")).toBe(24);
  });

  it("the wrong-answer contribution is still capped at 30", () => {
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "c", count: 50 };
    seedAttempts("triangles", 2, 2);
    expect(scoreOf("triangles")).toBe(30); // min(50*5, 30)
  });

  it("the accuracy clause still requires at least two attempts", () => {
    seedAttempts("triangles", 1, 0); // accuracy 0 but only ONE attempt
    expect(keysOf()).not.toContain("triangles"); // clause does not fire -> no evidence
  });

  it("the never-attempted +15 still contributes to the score once evidence exists", () => {
    h.wrongEntries.w1 = { topicKey: "electricity", conceptKey: "c", count: 2 };
    expect(scoreOf("electricity")).toBe(25); // 10 + 15
  });
});

describe("CASE 5 — mixed evidence behaves as the EXISTING clauses dictate", () => {
  it("a single wrong answer scores 5, which does not clear the strict `> 5` bar", () => {
    // Reported, not invented: the threshold is a strict `>`, so exactly 5 is out.
    // Pre-existing behaviour; this lane did not change it.
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "c", count: 1 };
    seedAttempts("triangles", 2, 2);
    expect(scoreOf("triangles")).toBeUndefined();
  });

  it("good accuracy plus logged mistakes still qualifies on the mistakes", () => {
    seedAttempts("triangles", 10, 8); // accuracy 80 -> accuracy clause does NOT fire
    h.wrongEntries.w1 = { topicKey: "triangles", conceptKey: "c", count: 2 };
    expect(scoreOf("triangles")).toBe(10); // wrong-answer clause only
  });

  it("only the topic with evidence is returned; the other stays silent", () => {
    seedAttempts("triangles", 10, 2); // accuracy 20 -> (60-20)*0.3 = 12
    expect(keysOf()).toEqual(["triangles"]); // electricity has no evidence
  });

  it("topics are still ordered by descending confidence", () => {
    h.wrongEntries.a = { topicKey: "triangles", conceptKey: "c", count: 1 };
    seedAttempts("triangles", 10, 3); // 9 + 5 = 14
    h.wrongEntries.b = { topicKey: "electricity", conceptKey: "c", count: 6 };
    seedAttempts("electricity", 2, 2); // min(30, 30) = 30
    expect(keysOf()).toEqual(["electricity", "triangles"]);
  });
});
