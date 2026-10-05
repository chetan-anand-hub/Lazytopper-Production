import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * SCORECARD-MI-1 PR-2 (B7) — the weak-area wrong-answer clause weighs CONCEPTUAL MARKS where a
 * wrong-answer entry carries them, and the COUNT where it does not (identical to before for
 * every pre-PR-2 entry). The ×5 weight and the 30 cap are unchanged; no other clause moved.
 * Harness mirrors weakAreaAggregator.saturation.test.ts (which still pins the count path).
 */

const h = vi.hoisted(() => ({
  attempts: [] as Array<{ topicKey: string; correct: boolean; timestamp: number }>,
  wrongEntries: {} as Record<string, Record<string, unknown>>,
}));

vi.mock("./practiceInsights", () => ({ loadInsights: () => ({ attempts: h.attempts }) }));
vi.mock("./adaptivePracticeEngine", () => ({
  loadWrongAnswerLog: () => ({ version: 1, entries: h.wrongEntries }),
}));
vi.mock("./topicHubMastery", () => ({
  loadTopicMasterySnapshot: (topicKey: string) => ({ topicKey, nodes: {} }),
}));
vi.mock("./mockScoreHistory", () => ({ getMockTopicScores: () => new Map() }));
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

import { getWeakAreas, wrongAnswerEvidenceUnits } from "./weakAreaAggregator";
import type { WrongAnswerEntry } from "./adaptivePracticeEngine";

const scoreOf = (topicKey: string) =>
  getWeakAreas({ limit: 20 }).weakAreas.find((w) => w.topicKey === topicKey)?.confidenceScore;

/** n attempts, all right — so the accuracy clause never fires and +15 never rides along. */
function practised(topicKey: string, n = 2) {
  for (let i = 0; i < n; i++) h.attempts.push({ topicKey, correct: true, timestamp: Date.now() });
}

beforeEach(() => {
  h.attempts = [];
  h.wrongEntries = {};
});

describe("B7 — conceptual MARKS weigh the wrong-answer evidence where an entry carries them", () => {
  it("★ one wrong worth 3 conceptual marks scores 15 (by count it would be 5 and not qualify)", () => {
    practised("triangles");
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "similarity", count: 1, conceptualMarksLost: 3, conceptualMarksCount: 1 };
    expect(scoreOf("triangles")).toBe(15);
    // CONTROL — the same single wrong WITHOUT marks: 5, under the strict `> 5` bar.
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "similarity", count: 1 };
    expect(scoreOf("triangles")).toBeUndefined();
  });

  it("a ½-mark concept gap weighs less than a 3-mark one (marks, not counts, order the topics)", () => {
    practised("triangles");
    practised("electricity");
    h.wrongEntries.a = { topicKey: "triangles", conceptKey: "c", count: 2, conceptualMarksLost: 1.5, conceptualMarksCount: 2 };
    h.wrongEntries.b = { topicKey: "electricity", conceptKey: "c", count: 2, conceptualMarksLost: 4, conceptualMarksCount: 2 };
    // by count both would score 10 — by marks 7.5 → 8 and 20
    expect(scoreOf("triangles")).toBe(8);
    expect(scoreOf("electricity")).toBe(20);
    expect(getWeakAreas({ limit: 20 }).weakAreas.map((w) => w.topicKey)).toEqual(["electricity", "triangles"]);
  });

  it("a MIXED entry keeps a count unit for each count-only wrong on it", () => {
    practised("triangles");
    // 3 wrongs: 1 carried 2 conceptual marks, 2 were count-only → 2 + 2 = 4 units → 20
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "c", count: 3, conceptualMarksLost: 2, conceptualMarksCount: 1 };
    expect(scoreOf("triangles")).toBe(20);
  });

  it("the 30 cap is unchanged", () => {
    practised("triangles");
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "c", count: 2, conceptualMarksLost: 12, conceptualMarksCount: 2 };
    expect(scoreOf("triangles")).toBe(30);
  });

  it("wrongCount still reports the COUNT of wrongs (marks never relabelled as a count)", () => {
    practised("triangles");
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "c", count: 1, conceptualMarksLost: 5, conceptualMarksCount: 1 };
    expect(getWeakAreas({ limit: 20 }).weakAreas[0]?.wrongCount).toBe(1);
  });
});

describe("G5 — entries without marks are weighed exactly as before (count)", () => {
  it("count fallback unchanged: count 2 → 10, count 50 → capped 30", () => {
    practised("triangles");
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "c", count: 2 };
    expect(scoreOf("triangles")).toBe(10);
    h.wrongEntries.w = { topicKey: "triangles", conceptKey: "c", count: 50 };
    expect(scoreOf("triangles")).toBe(30);
  });

  it("junk / zero / absent marks fall back to the count — never an invented figure", () => {
    const base = { questionId: "q", topicKey: "t", conceptKey: "c", difficulty: "Medium", timestamp: 1, count: 3 } as WrongAnswerEntry;
    expect(wrongAnswerEvidenceUnits(base)).toBe(3);
    expect(wrongAnswerEvidenceUnits({ ...base, conceptualMarksLost: 0 })).toBe(3);
    expect(wrongAnswerEvidenceUnits({ ...base, conceptualMarksLost: Number.NaN })).toBe(3);
    expect(wrongAnswerEvidenceUnits({ ...base, conceptualMarksLost: "4" as unknown as number })).toBe(3);
    expect(wrongAnswerEvidenceUnits({ ...base, conceptualMarksLost: 4, conceptualMarksCount: 3 })).toBe(4);
  });
});

/* SCORECARD-MI-1 PR-2 (H7, GA-21) — owner ruling 2026-10-05: ONLY knowledge-gap marks lower a
 * chapter's accuracy toward a weak area (attemptWeakAreaOutcome). A careless-only or an
 * exam-technique-only loss is not a weakness; an attempt without marks is judged as before. */
describe("GA-21 — the accuracy clause counts only knowledge-gap losses", () => {
  const lossy = (topicKey: string, n: number, m: Record<string, number>) => {
    for (let i = 0; i < n; i++) {
      h.attempts.push({
        topicKey, correct: false, timestamp: Date.now(), marksScored: 2, marksAvailable: 3,
        marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m },
        marksLostByTypeVersion: 1,
      } as (typeof h.attempts)[number]);
    }
  };

  it("★ careless-only losses never make a chapter weak", () => {
    lossy("triangles", 3, { calculation: 0.5, silly: 0.5 });
    expect(scoreOf("triangles")).toBeUndefined();
  });

  it("★ exam-technique-only losses never make a chapter weak", () => {
    lossy("triangles", 3, { presentation: 1 });
    expect(scoreOf("triangles")).toBeUndefined();
  });

  it("CONTROL — knowledge-gap losses DO (accuracy 0% over 3 judged attempts → 18)", () => {
    lossy("triangles", 3, { conceptual: 1 });
    expect(scoreOf("triangles")).toBe(18);
  });

  it("CONTROL — attempts without marks are judged as before (correct:false → a miss)", () => {
    for (let i = 0; i < 3; i++) h.attempts.push({ topicKey: "triangles", correct: false, timestamp: Date.now() });
    expect(scoreOf("triangles")).toBe(18);
  });
});
