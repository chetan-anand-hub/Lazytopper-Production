// A17 owner ruling 6 (GRADING-JOBS-1) — the Tutor's system prompt never states a mastery figure,
// even when an older client still sends `masteryPercent` / `masteryState` in the brief.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTutorSystemPrompt } = require("../../../server/prompts/tutorSystemPrompt.cjs");

const base = { topicLabel: "Real Numbers", subject: "maths" };

describe("ruling 6 — no mastery line in the tutor prompt", () => {
  it("★ a brief carrying masteryPercent 0 (an older client) → no 'Mastery' line, no '0%'", () => {
    const prompt: string = buildTutorSystemPrompt({
      ...base,
      brief: { hasData: true, topic: { masteryPercent: 0, masteryState: "weak", trend: "stable" }, mistakes: {} },
    });
    expect(prompt).not.toMatch(/mastery on this topic/i);
    expect(prompt).not.toMatch(/about 0%/);
    expect(prompt).toContain("- Recent direction on this topic: stable.");
  });

  it("CONTROL — the real facts in the same brief are still written", () => {
    const prompt: string = buildTutorSystemPrompt({
      ...base,
      brief: { hasData: true, topic: { weakConcepts: ["Euclid's division lemma"] }, mistakes: { topType: "careless (silly slip)" } },
    });
    expect(prompt).toContain("- Sub-topics that have cost marks: Euclid's division lemma.");
    expect(prompt).toContain("- Most common recent slip: careless (silly slip) mistakes.");
  });
});
