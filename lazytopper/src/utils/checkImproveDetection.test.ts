// @vitest-environment node
//
// Claim 2 — auto-detect marks/subject/topic in Check & Improve.
// The grader now determines the topic; this helper canonicalises that detected
// topic into a real topics.ts key for storage (so MI attribution stays clean) and
// applies honest fallbacks. The marks-extraction itself is an LLM-prompt concern
// (not deterministically unit-testable); this locks the deterministic half: the
// detected topic/subject → canonical context mapping.
import { describe, expect, it } from "vitest";
import {
  resolveDetectedGradeTopic,
  buildConfirmedDetection,
  clampDetectedMarks,
} from "./checkImproveDetection";

describe("resolveDetectedGradeTopic — canonicalises the AI-detected topic", () => {
  it("maps a canonical slug to its topic + subject", () => {
    const r = resolveDetectedGradeTopic({
      detectedTopic: "light-reflection-and-refraction",
      detectedSubject: "Science",
    });
    expect(r.topicSlug).toBe("light-reflection-and-refraction");
    expect(r.subject).toBe("Science");
    expect(r.topicName).toBeTruthy();
  });

  it("canonicalises a non-kebab spelling via the shared resolver (Fix A)", () => {
    // The AI might echo a PascalCase abbreviation; it must still land on the
    // canonical key, not be stored as a fragmenting variant.
    const r = resolveDetectedGradeTopic({
      detectedTopic: "MagneticEffects",
      detectedSubject: "Science",
    });
    expect(r.topicSlug).toBe("magnetic-effects-of-electric-current");
    expect(r.subject).toBe("Science");
  });

  it("prefers the resolved topic's subject over a mismatched detectedSubject", () => {
    const r = resolveDetectedGradeTopic({
      detectedTopic: "quadratic-equations",
      detectedSubject: "Science", // wrong; the resolved topic is authoritative
    });
    expect(r.topicSlug).toBe("quadratic-equations");
    expect(r.subject).toBe("Maths");
  });

  it("falls back to no topicKey (full-subject) when the topic is null/unknown", () => {
    const nullTopic = resolveDetectedGradeTopic({
      detectedTopic: null,
      detectedSubject: "Maths",
    });
    expect(nullTopic.topicSlug).toBe("");
    expect(nullTopic.topicName).toBe("");
    expect(nullTopic.subject).toBe("Maths");

    const unknownTopic = resolveDetectedGradeTopic({
      detectedTopic: "totally-made-up-xyz",
      detectedSubject: "Science",
    });
    expect(unknownTopic.topicSlug).toBe("");
    expect(unknownTopic.subject).toBe("Science"); // honest fallback to AI subject
  });

  it("defaults subject to Maths when nothing resolves", () => {
    const r = resolveDetectedGradeTopic({ detectedTopic: null, detectedSubject: null });
    expect(r.subject).toBe("Maths");
    expect(r.topicSlug).toBe("");
  });
});

describe("clampDetectedMarks — CBSE single-question range [1,6]", () => {
  it("passes valid marks through (rounded)", () => {
    expect(clampDetectedMarks(3)).toBe(3);
    expect(clampDetectedMarks(5)).toBe(5);
    expect(clampDetectedMarks(4.6)).toBe(5);
    expect(clampDetectedMarks("2")).toBe(2);
  });
  it("falls back to 3 for out-of-range / non-numeric", () => {
    expect(clampDetectedMarks(0)).toBe(3);
    expect(clampDetectedMarks(8)).toBe(3);
    expect(clampDetectedMarks(-1)).toBe(3);
    expect(clampDetectedMarks(null)).toBe(3);
    expect(clampDetectedMarks("abc")).toBe(3);
  });
});

describe("buildConfirmedDetection — detection → confirmed state for grading", () => {
  it("canonicalises the topic and clamps the marks", () => {
    const c = buildConfirmedDetection({
      detectedMarks: 5,
      detectedSubject: "Science",
      detectedTopic: "MagneticEffects", // non-kebab; must canonicalise (Fix A)
      marksSource: "stated",
    });
    expect(c.topicSlug).toBe("magnetic-effects-of-electric-current");
    expect(c.subject).toBe("Science");
    expect(c.marks).toBe(5);
    expect(c.marksSource).toBe("stated");
    expect(c.topicName).toBeTruthy();
  });

  it("clamps an out-of-range detected mark and keeps an honest topic fallback", () => {
    const c = buildConfirmedDetection({
      detectedMarks: 99,
      detectedSubject: "Maths",
      detectedTopic: null,
      marksSource: "inferred",
    });
    expect(c.marks).toBe(3); // clamped
    expect(c.topicSlug).toBe(""); // full-subject, not invented
    expect(c.subject).toBe("Maths");
    expect(c.marksSource).toBe("inferred");
  });
});
