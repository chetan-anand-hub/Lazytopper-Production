// src/utils/mockEngineSource.test.ts
//
// AI-tier FU-RANK-MOCKS-HPQ — proves the soft AI-lower ranking PR2a added to the
// practice paths now also governs the MOCK selection primitives:
//   - Full Mock   -> unlimitedPaperEngine.weightedSelect
//   - Topic Mock  -> topicMockEngine.weightedShuffleByScore
// Both reuse PR2a's single SOURCE_MULTIPLIER via getSourceMultiplier (no fork).
//
// The two engine primitives are pure given their rng (no DOM/localStorage), so
// this runs DOM-free. (CI's quality-gate does NOT run vitest — run in Codespaces:
//   node node_modules/vitest/vitest.mjs run src/utils/mockEngineSource.test.ts )
//
// What it proves:
//   1. Tier order is soft: authentic 1.0 > predicted 0.6 > ai-generated 0.3, none 0.
//   2. Per slot, authentic is PREFERRED over equal-base AI (both engines).
//   3. SOFT: an authentic-thin / all-AI slot still fills with AI (never empty).
//   4. Count/structure integrity: selection only reorders — the candidate that
//      fills a slot is always returned while candidates remain.

import { describe, it, expect } from "vitest";
import type { CanonicalQuestion } from "../data/predictionTypes";
import {
  getSourceMultiplier,
  type CanonicalQuestionWithScore,
  type QuestionSource,
} from "../data/predictionCore";
import { weightedSelect } from "./unlimitedPaperEngine";
import { weightedShuffleByScore } from "./topicMockEngine";

// Minimal valid CanonicalQuestion carrying the runtime `_source` stamp that
// getAllQuestions() attaches at ingest.
function mk(
  id: string,
  source: QuestionSource,
  predictionScore = 4,
): CanonicalQuestionWithScore {
  return {
    id,
    subject: "Maths",
    topicKey: "Real Numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: `Q-${id}`,
    predictionScore,
    _source: source,
  };
}

// Deterministic LCG so the statistical assertions are reproducible.
function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

const sourceOf = (q: CanonicalQuestion): QuestionSource =>
  (q as CanonicalQuestionWithScore)._source ?? "authentic";

describe("SOURCE_MULTIPLIER tier order (reused by mocks)", () => {
  it("is soft and ordered authentic > predicted > ai, none zeroed", () => {
    const a = getSourceMultiplier(mk("a", "authentic"));
    const p = getSourceMultiplier(mk("p", "predicted"));
    const ai = getSourceMultiplier(mk("ai", "ai-generated"));
    expect(a).toBeGreaterThan(p);
    expect(p).toBeGreaterThan(ai);
    expect(ai).toBeGreaterThan(0); // soft — never excluded
  });
});

describe("Topic Mock — weightedShuffleByScore per-slot demotion", () => {
  it("ranks authentic ahead of predicted ahead of AI at equal base score", () => {
    // Constant rng removes the shuffle jitter so the source term is decisive.
    const rng = () => 0.5;
    const pool = [mk("ai", "ai-generated"), mk("pred", "predicted"), mk("auth", "authentic")];
    const ranked = weightedShuffleByScore(pool, rng);
    expect(ranked.map(sourceOf)).toEqual(["authentic", "predicted", "ai-generated"]);
  });

  it("SOFT: an all-AI section pool still ranks (and fills) every slot", () => {
    const rng = lcg(7);
    const pool = [mk("ai1", "ai-generated"), mk("ai2", "ai-generated"), mk("ai3", "ai-generated")];
    const ranked = weightedShuffleByScore(pool, rng);
    // No question dropped — structure/count preserved; the slot still fills.
    expect(ranked).toHaveLength(3);
    expect(ranked.every((q) => sourceOf(q) === "ai-generated")).toBe(true);
  });

  it("authentic-thin: the lone authentic leads, AI still present to fill the rest", () => {
    const rng = () => 0.5;
    const pool = [
      mk("ai1", "ai-generated"),
      mk("ai2", "ai-generated"),
      mk("auth", "authentic"),
      mk("ai3", "ai-generated"),
    ];
    const ranked = weightedShuffleByScore(pool, rng);
    expect(sourceOf(ranked[0])).toBe("authentic"); // preferred for slot 1
    expect(ranked).toHaveLength(4); // remaining slots still fillable by AI
    expect(ranked.slice(1).every((q) => sourceOf(q) === "ai-generated")).toBe(true);
  });
});

describe("Full Mock — weightedSelect per-slot demotion", () => {
  const emptyNeed = new Map<string, number>();

  it("prefers authentic over equal-base AI across many seeded draws", () => {
    let authPicks = 0;
    let aiPicks = 0;
    const rng = lcg(12345);
    for (let i = 0; i < 500; i++) {
      const pool = [mk("auth", "authentic"), mk("ai", "ai-generated")];
      const pick = weightedSelect(pool, new Set(), rng, emptyNeed, "Maths");
      expect(pick).toBeDefined(); // slot always fills
      if (sourceOf(pick as CanonicalQuestion) === "authentic") authPicks++;
      else aiPicks++;
    }
    // Soft but decisive: authentic should dominate the equal-base AI candidate.
    expect(authPicks).toBeGreaterThan(aiPicks * 3);
  });

  it("SOFT: an all-AI slot still fills (never returns undefined)", () => {
    const rng = lcg(99);
    const pool = [mk("ai1", "ai-generated"), mk("ai2", "ai-generated")];
    const pick = weightedSelect(pool, new Set(), rng, emptyNeed, "Maths");
    expect(pick).toBeDefined();
    expect(sourceOf(pick as CanonicalQuestion)).toBe("ai-generated");
  });

  it("authentic-thin: AI can still surface so every slot is fillable", () => {
    // 1 authentic + 12 AI, drawn without replacement: the first picks lean
    // authentic, but once it is used the remaining slots fill with AI.
    let sawAiPick = false;
    const rng = lcg(2024);
    const pool = [mk("auth", "authentic"), ...Array.from({ length: 12 }, (_, i) => mk(`ai${i}`, "ai-generated"))];
    const used = new Set<string>();
    for (let slot = 0; slot < 5; slot++) {
      const pick = weightedSelect(pool, used, rng, emptyNeed, "Maths");
      expect(pick).toBeDefined();
      const p = pick as CanonicalQuestion;
      used.add(p.id);
      if (sourceOf(p) === "ai-generated") sawAiPick = true;
    }
    // With only one authentic available, AI must fill the remaining 4 slots.
    expect(sawAiPick).toBe(true);
    expect(used.size).toBe(5); // five distinct slots filled — no slot left empty
  });
});
