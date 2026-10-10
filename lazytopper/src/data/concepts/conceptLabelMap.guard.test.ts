// @vitest-environment node
/**
 * GUARD — BANK-FIX-1 PR-3: every SERVED (chapter, subtopic) label is either mapped to an
 * Exam Trends concept of the same chapter, a chapter-echo placeholder, or reviewed as
 * unmappable with a reason. A RATCHET:
 *   1. a NEW served label that is none of the three fails (map it, or review it);
 *   2. a STALE entry (mapped or reviewed label no longer served) fails;
 *   3. a mapped concept that is not verbatim in EXAM_TRENDS_CONCEPTS[chapter] fails;
 *   4. the counts may only improve (more mapped, fewer reviewed, higher row coverage).
 * The checks run as one pure function so the mutation controls below prove each can fail.
 * "Served" = the generated id index (bankIdIndex.generated.ts), which the bank-chapters
 * guard proves equals the served aggregator; labels are trimmed exactly as
 * progressBankIndex trims them.
 */
import { describe, it, expect } from "vitest";

import {
  BANK_ID_INDEX_ROWS,
  BANK_ID_INDEX_SUBTOPICS,
  BANK_ID_INDEX_TOPIC_KEYS,
} from "../bankChapters/bankIdIndex.generated";
import { BANK_CHAPTER_SLUGS } from "../bankChapters/chapterRegistry.generated";
import { class10MathTopicTrends } from "../class10MathTopicTrends";
import { class10ScienceTopicTrends } from "../class10ScienceTopicTrends";
import { isChapterEchoSubtopic as echoFromIndex } from "../../services/progressBankIndex";
import { isChapterEchoSubtopic as echoFromShape } from "../../services/progressBankShape";
import {
  CONCEPT_BY_LABEL,
  EXAM_TRENDS_CONCEPTS,
  UNMAPPED_LABELS_REVIEWED,
  conceptForSubtopic,
  type UnmappedLabelReview,
} from "./conceptLabelMap";

// ── RATCHET PINS (fix round 1, on trunk f52f8116). Improve them; never loosen them. ─────────────────────────
// CBQ-1 C3 (2026-10-07): two NEW served acids labels from the C3 science CBQs, both mapped (+2 -> 1517, tightened).
// The third C3 label was re-labelled to the existing "Acids with Metal Oxides"; reviewed max stays 458.
// 2026-10-10 BANK-FIX-5 (owner ruling): 1517 -> 1516. 'Current-Carrying Conductors' is unmapped while PYQ-S-2025-MAG-006
// is withheld (its figures are not bound); a DIAGRAMS lane that serves it again restores the line and 1517.
const MIN_MAPPED_LABELS = 1516;
const MAX_REVIEWED_LABELS = 458;
/** served rows whose label resolves to a concept / all served rows: 7722 / 9823. */
const MIN_ROWS_WITH_CONCEPT_FRACTION = 0.7861;

const isChapterEchoSubtopic = echoFromShape;

type Served = Map<string, Map<string, number>>; // chapter -> label -> served rows

function servedLabels(): Served {
  const out: Served = new Map();
  for (const [, t, s] of BANK_ID_INDEX_ROWS) {
    const ch = BANK_ID_INDEX_TOPIC_KEYS[t];
    const label = BANK_ID_INDEX_SUBTOPICS[s].trim();
    if (!out.has(ch)) out.set(ch, new Map());
    const m = out.get(ch)!;
    m.set(label, (m.get(label) ?? 0) + 1);
  }
  return out;
}

type Problem = { kind: string; chapter: string; label: string; detail?: string };

function auditMap(
  served: Served,
  concepts: Readonly<Record<string, readonly string[]>>,
  mapped: Readonly<Record<string, Readonly<Record<string, string>>>>,
  reviewed: Readonly<Record<string, Readonly<Record<string, UnmappedLabelReview>>>>,
): Problem[] {
  const problems: Problem[] = [];
  const has = (o: object | undefined, k: string) =>
    !!o && Object.prototype.hasOwnProperty.call(o, k);
  for (const [chapter, labels] of served) {
    if (!has(concepts, chapter)) problems.push({ kind: "unknown-chapter", chapter, label: "" });
    for (const label of labels.keys()) {
      if (isChapterEchoSubtopic(label)) continue;
      const m = has(mapped[chapter], label);
      const r = has(reviewed[chapter], label);
      if (!m && !r) problems.push({ kind: "unclassified", chapter, label });
      if (m && r) problems.push({ kind: "mapped-and-reviewed", chapter, label });
    }
  }
  for (const [kind, table] of [
    ["stale-mapped", mapped],
    ["stale-reviewed", reviewed],
  ] as const) {
    for (const [chapter, byLabel] of Object.entries(table)) {
      for (const label of Object.keys(byLabel)) {
        if (!served.get(chapter)?.has(label)) problems.push({ kind, chapter, label });
        if (isChapterEchoSubtopic(label)) problems.push({ kind: "echo-entry", chapter, label });
      }
    }
  }
  for (const [chapter, byLabel] of Object.entries(mapped)) {
    for (const [label, concept] of Object.entries(byLabel)) {
      if (!(concepts[chapter] ?? []).includes(concept))
        problems.push({ kind: "not-a-concept", chapter, label, detail: concept });
    }
  }
  return problems;
}

const SERVED = servedLabels();

describe("conceptLabelMap — vocabulary", () => {
  it("covers exactly the 26 bank chapters, each with at least one concept", () => {
    const want = [...BANK_CHAPTER_SLUGS].sort();
    expect(Object.keys(EXAM_TRENDS_CONCEPTS).sort()).toEqual(want);
    expect(Object.keys(CONCEPT_BY_LABEL).sort()).toEqual(want);
    expect(Object.keys(UNMAPPED_LABELS_REVIEWED).sort()).toEqual(want);
    expect([...SERVED.keys()].sort()).toEqual(want);
    for (const ch of want) expect(EXAM_TRENDS_CONCEPTS[ch].length).toBeGreaterThan(0);
  });

  it("is read from the trends sources, not copied (every source concept appears once)", () => {
    const fromSources = [
      ...Object.values(class10MathTopicTrends.topics).flatMap((t) =>
        Object.keys(t.conceptWeightage),
      ),
      ...Object.values(class10ScienceTopicTrends.topics).flatMap((t) =>
        t.concepts.map((c) => c.name),
      ),
    ].sort();
    expect(Object.values(EXAM_TRENDS_CONCEPTS).flat().sort()).toEqual(fromSources);
  });

  it("uses the same chapter-echo predicate progressBankIndex exports", () => {
    expect(echoFromShape).toBe(echoFromIndex);
  });
});

describe("conceptLabelMap — ratchet over the served bank", () => {
  it("every served label is mapped, chapter-echo, or reviewed; nothing stale; concepts verbatim", () => {
    expect(auditMap(SERVED, EXAM_TRENDS_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([]);
  });

  it("counts only improve", () => {
    const mappedLabels = Object.values(CONCEPT_BY_LABEL).reduce((t, m) => t + Object.keys(m).length, 0);
    const reviewedLabels = Object.values(UNMAPPED_LABELS_REVIEWED).reduce(
      (t, m) => t + Object.keys(m).length,
      0,
    );
    let withConcept = 0;
    for (const [, t, s] of BANK_ID_INDEX_ROWS) {
      if (conceptForSubtopic(BANK_ID_INDEX_TOPIC_KEYS[t], BANK_ID_INDEX_SUBTOPICS[s].trim())) withConcept++;
    }
    expect(mappedLabels).toBeGreaterThanOrEqual(MIN_MAPPED_LABELS);
    expect(reviewedLabels).toBeLessThanOrEqual(MAX_REVIEWED_LABELS);
    expect(withConcept / BANK_ID_INDEX_ROWS.length).toBeGreaterThanOrEqual(MIN_ROWS_WITH_CONCEPT_FRACTION);
  });
});

describe("conceptLabelMap — mutation controls (each check can fail)", () => {
  const clone = (s: Served): Served => new Map([...s].map(([k, v]) => [k, new Map(v)]));

  it("a NEW served label with no entry is RED", () => {
    const s = clone(SERVED);
    s.get("electricity")!.set("Fake New Label", 1);
    expect(auditMap(s, EXAM_TRENDS_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "unclassified", chapter: "electricity", label: "Fake New Label" },
    ]);
  });

  it("a mapped concept that does not exist in the chapter is RED", () => {
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    const mapped = { ...CONCEPT_BY_LABEL, electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: "Not A Concept" } };
    expect(auditMap(SERVED, EXAM_TRENDS_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "not-a-concept", chapter: "electricity", label, detail: "Not A Concept" },
    ]);
  });

  it("a concept of ANOTHER chapter is RED", () => {
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    const other = EXAM_TRENDS_CONCEPTS["life-processes"][0];
    const mapped = { ...CONCEPT_BY_LABEL, electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: other } };
    expect(auditMap(SERVED, EXAM_TRENDS_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED).map((p) => p.kind)).toEqual([
      "not-a-concept",
    ]);
  });

  it("a label no longer served is RED (stale)", () => {
    const s = clone(SERVED);
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    s.get("electricity")!.delete(label);
    expect(auditMap(s, EXAM_TRENDS_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "stale-mapped", chapter: "electricity", label },
    ]);
  });

  it("a reviewed label that is also mapped is RED", () => {
    const [label] = Object.keys(UNMAPPED_LABELS_REVIEWED.electricity);
    const mapped = {
      ...CONCEPT_BY_LABEL,
      electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: EXAM_TRENDS_CONCEPTS.electricity[0] },
    };
    expect(auditMap(SERVED, EXAM_TRENDS_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED).map((p) => p.kind)).toEqual([
      "mapped-and-reviewed",
    ]);
  });
});

describe("conceptForSubtopic — verbatim lookup", () => {
  const [label, concept] = Object.entries(CONCEPT_BY_LABEL.electricity)[0];

  it("returns the mapped concept for the exact label", () => {
    expect(conceptForSubtopic("electricity", label)).toBe(concept);
  });

  it("never tidies the label (no trim, no case fold)", () => {
    expect(conceptForSubtopic("electricity", ` ${label}`)).toBeUndefined();
    expect(conceptForSubtopic("electricity", `${label} `)).toBeUndefined();
    expect(conceptForSubtopic("electricity", label.toUpperCase())).toBeUndefined();
  });

  it("is chapter-scoped and returns undefined for echo, reviewed, unknown and prototype keys", () => {
    expect(conceptForSubtopic("life-processes", label)).toBeUndefined();
    expect(conceptForSubtopic("electricity", "General")).toBeUndefined();
    expect(conceptForSubtopic("electricity", "Chapter Practice — Electricity")).toBeUndefined();
    expect(conceptForSubtopic("electricity", Object.keys(UNMAPPED_LABELS_REVIEWED.electricity)[0])).toBeUndefined();
    expect(conceptForSubtopic("not-a-chapter", label)).toBeUndefined();
    expect(conceptForSubtopic("electricity", "constructor")).toBeUndefined();
    expect(conceptForSubtopic("constructor", "toString")).toBeUndefined();
    expect(conceptForSubtopic("electricity", "")).toBeUndefined();
    expect(conceptForSubtopic(null, label)).toBeUndefined();
  });
});
