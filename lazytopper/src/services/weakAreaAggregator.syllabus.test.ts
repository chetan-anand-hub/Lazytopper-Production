import { describe, it, expect, beforeEach, vi } from "vitest";
import { BOARD_CHAPTER_KEYS } from "../config/syllabus2026-27";

/**
 * SYLLABUS-FIX-CODE F7 — the weak-area engine evaluates the 26 board chapters of the
 * 2026-27 syllabus reference. The older 25-chapter canonical list folded Human Eye into
 * Light, so a Human Eye mistake never surfaced as a weak area.
 *
 * Only the stores are mocked; the topic-key resolvers and the syllabus reference are real.
 */

const h = vi.hoisted(() => ({
  wrongEntries: {} as Record<string, { topicKey: string; conceptKey: string; count: number }>,
}));

vi.mock("./practiceInsights", () => ({ loadInsights: () => ({ attempts: [] }) }));
vi.mock("./adaptivePracticeEngine", () => ({
  loadWrongAnswerLog: () => ({ version: 1, entries: h.wrongEntries }),
}));
vi.mock("./topicHubMastery", () => ({
  loadTopicMasterySnapshot: (topicKey: string) => ({ topicKey, nodes: {} }),
}));
vi.mock("./mockScoreHistory", () => ({ getMockTopicScores: () => new Map() }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));

import { getWeakAreas } from "./weakAreaAggregator";

function seedWrong(topicKey: string) {
  h.wrongEntries[`${topicKey}::c`] = { topicKey, conceptKey: `${topicKey}-concept`, count: 1 };
}

beforeEach(() => {
  h.wrongEntries = {};
});

describe("weak areas read the 26 board chapters (F7)", () => {
  it("a Human Eye mistake surfaces Human Eye as a weak area", () => {
    seedWrong("human-eye-and-colourful-world");
    const { weakAreas } = getWeakAreas({ limit: 50 });
    const he = weakAreas.find((w) => w.topicKey === "human-eye-and-colourful-world");
    expect(he).toMatchObject({ topicName: "Human Eye", subject: "Science", wrongCount: 1 });
    expect(weakAreas).toHaveLength(1);
  });

  it("the evaluated chapter list is exactly the 26 board keys (non-board keys never surface)", () => {
    for (const k of BOARD_CHAPTER_KEYS) seedWrong(k);
    seedWrong("sources-of-energy");
    seedWrong("periodic-classification-of-elements");
    const { weakAreas, totalWeak } = getWeakAreas({ limit: 100 });
    expect(totalWeak).toBe(26);
    expect(weakAreas.map((w) => w.topicKey).sort()).toEqual([...BOARD_CHAPTER_KEYS].sort());
  });

  it("subject comes from the reference's units (13 Maths, 13 Science)", () => {
    for (const k of BOARD_CHAPTER_KEYS) seedWrong(k);
    const { weakAreas } = getWeakAreas({ limit: 100 });
    expect(weakAreas.filter((w) => w.subject === "Maths")).toHaveLength(13);
    expect(weakAreas.filter((w) => w.subject === "Science")).toHaveLength(13);
    expect(getWeakAreas({ subject: "Science", limit: 100 }).weakAreas.map((w) => w.topicKey)).toContain(
      "human-eye-and-colourful-world",
    );
  });
});
