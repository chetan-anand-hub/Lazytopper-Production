/**
 * A17 owner ruling 6 (GRADING-JOBS-1) — the Tutor is never told an invented mastery figure.
 * The weak-area aggregator reports a `masteryPercent` (0 for a topic with no graded work) and a
 * `masteryState`; neither is a real mastery measure, so the brief must not carry them, and they
 * must never make `hasData` true on their own. Only the reads are mocked: the real
 * assembleTutorBrief runs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ weakAreas: [] as unknown[], entries: [] as unknown[] }));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: vi.fn(async () => h.entries) }));
vi.mock("../../services/weakAreaAggregator", () => ({ getWeakAreas: () => ({ weakAreas: h.weakAreas }) }));
vi.mock("../../services/progressStore", () => ({ getTopicTrendFromCloud: vi.fn(async () => null) }));
vi.mock("../../data/syllabus/canonicalTopicSlug", () => ({ resolveCanonicalSlug: (k: string) => k }));

import { assembleTutorBrief } from "./tutorContextBrief";

const ARGS = { uid: "u-1", topicKey: "real-numbers", subject: "maths" as const };

beforeEach(() => {
  h.weakAreas = [];
  h.entries = [];
});

describe("ruling 6 — no mastery figure reaches the Tutor brief", () => {
  it("★ a weak-area row carrying ONLY masteryPercent 0 / masteryState → no mastery field, hasData false", async () => {
    h.weakAreas = [{ topicKey: "real-numbers", masteryPercent: 0, masteryState: "weak", weakConcepts: [] }];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.topic).not.toHaveProperty("masteryPercent");
    expect(brief.topic).not.toHaveProperty("masteryState");
    expect(JSON.stringify(brief)).not.toMatch(/mastery/i);
    expect(brief.hasData).toBe(false);
  });

  it("a non-zero mastery value is not sent either", async () => {
    h.weakAreas = [{ topicKey: "real-numbers", masteryPercent: 72, masteryState: "developing" }];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.topic.masteryPercent).toBeUndefined();
    expect(brief.topic.masteryState).toBeUndefined();
    expect(brief.hasData).toBe(false);
  });

  it("CONTROL — real weak concepts on the same row still reach the brief and make hasData true", async () => {
    h.weakAreas = [{ topicKey: "real-numbers", masteryPercent: 0, masteryState: "weak", weakConcepts: ["HCF by prime factorisation"] }];
    const brief = await assembleTutorBrief(ARGS);
    expect(brief.topic.weakConcepts).toEqual(["HCF by prime factorisation"]);
    expect(brief.topic.masteryPercent).toBeUndefined();
    expect(brief.hasData).toBe(true);
  });
});
