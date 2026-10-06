// SYLLABUS-FIX-CODE F6 — prediction + Exam Trends follow CBSE's 2026-27 syllabus.
//
// The OUT / FORMATIVE lists are READ from the one reference
// (src/config/syllabus2026-27.ts, owner ruling 6). These pins prove:
//   1. every F1 Maths OUT row is paired with subtopic-label fragments, and no pairing is
//      stale (so a change to F1 fails here instead of drifting);
//   2. the formative-only list the predicates read IS F1's;
//   3. no OUT or formative-only concept survives in a prediction OUTPUT: every
//      historical archetype that names one scores 0 in BOTH scorers, and the guaranteed
//      archetypes, rotation pairs and Exam Trends concept lists hold none;
//   4. IN labels that merely LOOK similar (owner ruling 1: Pythagoras as a tool; converse
//      of BPT used, not proved; word problems "reducible to quadratics") are NOT excluded.

import { describe, it, expect } from "vitest";
import { FORMATIVE_ONLY_TOPICS, SYLLABUS_OUT } from "../config/syllabus2026-27";
import {
  CBSE_HISTORICAL_ARCHETYPES,
  MATHS_DELETED_CHAPTERS_2026_27,
  MATHS_OUT_SUBTOPIC_FRAGMENTS,
  SCIENCE_DELETED_CHAPTERS_2026_27,
  isMathsDeletedFor2026_27,
  isScienceDeletedFor2026_27,
} from "./cbseHistoricalArchetypes";
import { compute5SignalScore } from "./cbse5SignalScoring";
import { scoreTopicRecurrenceConfidence } from "./probabilisticScoring";
import { getCanonicalHistoricalDataset } from "./historicalDataset";
import { getGuaranteedArchetypes } from "./guaranteedArchetypes";
import { getAllRotationPairs } from "./rotationPairTracker";
import { class10MathTopicTrends } from "../data/class10MathTopicTrends";

const TARGET_YEAR = 2027;

const isDeleted = (subject: "Maths" | "Science", topic: string, subtopic: string) =>
  subject === "Maths" ? isMathsDeletedFor2026_27(topic, subtopic) : isScienceDeletedFor2026_27(topic, subtopic);

describe("F6 — the Maths deletion config is the real F1 OUT list", () => {
  it("every F1 Maths OUT row has at least one subtopic fragment, and no fragment entry is stale", () => {
    const f1Items = SYLLABUS_OUT.maths.map((r) => r.item);
    expect(f1Items.length).toBeGreaterThan(0);
    for (const item of f1Items) {
      expect(MATHS_OUT_SUBTOPIC_FRAGMENTS[item]?.length ?? 0, `no fragment for F1 OUT row: ${item}`).toBeGreaterThan(0);
    }
    expect(Object.keys(MATHS_OUT_SUBTOPIC_FRAGMENTS).sort()).toEqual([...f1Items].sort());
  });

  it("deletedSubtopicKeywords is exactly the deduped fragments of the F1 rows; no Maths chapter is deleted whole", () => {
    const expected = [...new Set(SYLLABUS_OUT.maths.flatMap((r) => MATHS_OUT_SUBTOPIC_FRAGMENTS[r.item]))];
    expect(MATHS_DELETED_CHAPTERS_2026_27.deletedSubtopicKeywords).toEqual(expected);
    expect(MATHS_DELETED_CHAPTERS_2026_27.deletedTopics).toEqual([]);
  });

  it.each([
    ["Triangles", "Area Ratio in Similar Triangles"],
    ["Triangles", "Pythagoras/Converse"],
    ["Coordinate Geometry", "Area of Triangle"],
    ["Real Numbers", "Euclid's Division Lemma"],
    ["Trigonometry", "Trigonometric Ratios of Complementary Angles"],
    ["Surface Areas and Volumes", "Melting and Recasting"],
    ["Statistics", "Ogive"],
  ])("OUT: %s / %s is excluded", (topic, subtopic) => {
    expect(isMathsDeletedFor2026_27(topic, subtopic)).toBe(true);
  });

  it.each([
    ["Triangles", "Converse of BPT"],
    ["Triangles", "BPT (Basic Proportionality Theorem)"],
    ["Quadratic Equations", "Word Problems Reducible to Quadratics"],
    ["Trigonometry", "Pythagorean identities (sin²θ+cos²θ=1)"],
    ["Coordinate Geometry", "Distance Formula (collinearity check)"],
    ["Areas Related to Circles", "Ratio of Areas (Equal Perimeter)"],
    ["Surface Areas and Volumes", "Combination of Solids"],
  ])("IN: %s / %s is NOT excluded", (topic, subtopic) => {
    expect(isMathsDeletedFor2026_27(topic, subtopic)).toBe(false);
  });
});

describe("F6 — formativeOnlyTopics is READ from F1 and excluded", () => {
  it("the predicate's formative list is F1's FORMATIVE_ONLY_TOPICS", () => {
    expect([...SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics]).toEqual(FORMATIVE_ONLY_TOPICS.map((t) => t.name));
  });

  it.each([
    ["Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction"],
    ["Magnetic Effects of Electric Current", "Electric Generator"],
    ["Heredity", "Evolution"],
    ["Periodic Classification of Elements", ""],
  ])("formative-only: %s / %s is excluded", (topic, subtopic) => {
    expect(isScienceDeletedFor2026_27(topic, subtopic)).toBe(true);
  });

  it("IN magnetism labels are NOT excluded", () => {
    expect(isScienceDeletedFor2026_27("Magnetic Effects of Electric Current", "Fleming's Left-Hand Rule (Motor Effect)")).toBe(false);
    expect(isScienceDeletedFor2026_27("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines")).toBe(false);
  });
});

describe("F6 — no OUT / formative concept in a prediction output", () => {
  const outArchetypes = CBSE_HISTORICAL_ARCHETYPES.filter((a) => isDeleted(a.subject, a.topic, a.subtopic));
  const historicalItems = getCanonicalHistoricalDataset().items;

  it("the OUT archetypes the scout named are caught (area ratio, the theorem, coordinate area, motor/EMI)", () => {
    const labels = new Set(outArchetypes.map((a) => a.subtopic));
    for (const l of [
      "Area Ratio in Similar Triangles",
      "Pythagoras/Converse",
      "Area of Triangle",
      "Electric Motor & Electromagnetic Induction",
    ]) {
      expect(labels.has(l), `${l} must be excluded`).toBe(true);
    }
    expect(outArchetypes.filter((a) => a.subtopic === "Electric Motor & Electromagnetic Induction").length).toBe(9);
    expect(outArchetypes.filter((a) => a.subtopic === "Area of Triangle").length).toBe(4);
  });

  it("every OUT / formative archetype scores 0 in compute5SignalScore and in the recurrence scorer", () => {
    for (const a of outArchetypes) {
      const five = compute5SignalScore(
        {
          subject: a.subject,
          topic: a.topic,
          subtopic: a.subtopic,
          marks: a.marks,
          format: a.format,
          bloom: a.bloom,
          difficulty: "Medium",
        },
        TARGET_YEAR,
      );
      expect(five.compositeScore, `${a.subject}/${a.topic}/${a.subtopic}`).toBe(0);
      const rec = scoreTopicRecurrenceConfidence({
        input: {
          subject: a.subject,
          topic: a.topic,
          subtopic: a.subtopic,
          marks: a.marks,
          format: a.format,
          bloom: a.bloom,
        } as Parameters<typeof scoreTopicRecurrenceConfidence>[0]["input"],
        context: { targetYear: TARGET_YEAR, policyRegime: "nep_competency_2023_plus" },
        historicalItems,
      });
      expect(rec.posterior, `${a.subject}/${a.topic}/${a.subtopic}`).toBe(0);
    }
  });

  it("guaranteed archetypes and rotation pairs name no OUT / formative concept", () => {
    for (const subject of ["Maths", "Science"] as const) {
      for (const g of getGuaranteedArchetypes(subject)) {
        expect(isDeleted(subject, g.topic, g.subtopic), `${g.topic}/${g.subtopic}`).toBe(false);
      }
      for (const p of getAllRotationPairs(subject)) {
        expect(isDeleted(subject, p.topic, p.subtopicA), `${p.topic}/${p.subtopicA}`).toBe(false);
        expect(isDeleted(subject, p.topic, p.subtopicB), `${p.topic}/${p.subtopicB}`).toBe(false);
        expect(`${p.subtopicA} ${p.subtopicB}`).not.toMatch(/transformation/i);
      }
    }
  });

  it("Exam Trends' Maths concept lists hold no OUT concept (no area ratio, no theorem concept, no melting/recasting)", () => {
    const topics = class10MathTopicTrends.topics as Record<string, { conceptWeightage: Record<string, number> }>;
    for (const [topic, meta] of Object.entries(topics)) {
      for (const concept of Object.keys(meta.conceptWeightage)) {
        expect(isMathsDeletedFor2026_27(topic, concept), `${topic}/${concept}`).toBe(false);
        expect(concept).not.toMatch(/transformation/i);
      }
      const sum = Object.values(meta.conceptWeightage).reduce((a, b) => a + b, 0);
      expect(sum, `${topic} concept weights`).toBe(100);
    }
  });
});
