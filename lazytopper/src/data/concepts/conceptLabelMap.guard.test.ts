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
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";

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
  conceptKindOf,
  type UnmappedLabelReview,
} from "./conceptLabelMap";
import { TRACKING_CONCEPTS, TRACKING_CONCEPT_SOURCES } from "./trackingConcepts";

// ── RATCHET PINS (fix round 1, on trunk f52f8116). Improve them; never loosen them. ─────────────────────────
// CBQ-1 C3 (2026-10-07): two NEW served acids labels from the C3 science CBQs, both mapped (+2 -> 1517, tightened).
// The third C3 label was re-labelled to the existing "Acids with Metal Oxides"; reviewed max stays 458.
// 2026-10-10 BANK-FIX-5 (owner ruling): 1517 -> 1516. 'Current-Carrying Conductors' is unmapped while PYQ-S-2025-MAG-006
// is withheld (its figures are not bound); a DIAGRAMS lane that serves it again restores the line and 1517.
// 2026-10-10 BANK-FIX-6 (C2): 1516 -> 1514. "Trig Identity Proof — Multi-step" and "cos θ from Similar Right Triangles" are unserved while
// APQ-M-TRIG-016 and APQ-M-TRIG-011 are withheld (answer defined only by an image); B restores both lines and 1516 when it serves them again.
// 2026-10-10 BANK-UNWITHHOLD-1 (B): 1514 -> 1525 (+11). 21 figure rows served again bring 12 new labels: 11 mapped to existing Exam Trends
// concepts (incl. 'Current-Carrying Conductors', restored for PYQ-S-2025-MAG-006) and 1 reviewed concept-gap ('Benzene'; reviewed 456 -> 457, max stays 458).
// 2026-10-10 CONCEPT-MAP-FILL-1: 293 `concept-gap` labels (1,232 rows) now map to 33 TRACKING concepts (trackingConcepts.ts):
// mapped 1518 -> 1811, reviewed 456 -> 163, rows with a concept 8465 -> 9697 of 10592 (0.7992 -> 0.9155). The old pins
// (1514 / 458 / 0.7861) sat below the tip by 4 / 2 / 0.013; they are tightened to the exact new numbers.
// Rebased onto BANK-UNWITHHOLD-1 (#1066) at a863452f: B's +11 mapped and +1 reviewed ('Benzene') are added, so the final pins are
// mapped 1822, reviewed 164, rows with a concept 9716 of 10613 (0.91548), recomputed from the merged tip by runtime import.
// 2026-10-11 RULE5-BIND-1 (cofounder D68b, D74; merged onto CONCEPT-MAP-FILL-1 at 2b31f74a): 16 rows withheld. "Series Circuit Readings" is
// unserved while SCO-S-ELEC-012 (garbled wiring text) is withheld, so its line is deleted: mapped 1822 -> 1821 (-1). Reviewed stays 164.
// Rows with a concept 9716 of 10613 -> 9711 of 10597 (0.91639; the withheld rows leave the denominator), so that pin is tightened.
// All three recomputed from the merged tip by runtime import.
// Merged onto SQP-2026-27-Q10 (#1084, be60b739; trunk pin was 0.9153 for 9716 / 10614): +1 served row whose label is reviewed, so
// rows with a concept are 9711 of 10598 (0.91630) by runtime import; the 0.9163 pin still holds and is kept.
// 2026-10-11 CONCEPT-MAP-FILL-1 PR-2 (D79b): Areas Related to Circles is IN (SQP 2026-27 Q10) - its 28 `concept-gap` labels (43 rows) map to
// the tracking concept "Perimeter and Area of a Circle — A Review": mapped 1822 -> 1850, reviewed 164 -> 136, rows with a concept
// 9716 -> 9759 of 10613 (0.91548 -> 0.91953); with SQP-M-2026-ARC-001 (#1084) 9760 of 10614 (0.91954).
// 2026-10-11 SQP-2026-27-Q10 (#1084): +1 served row (SQP-M-2026-ARC-001, label 'Distance Covered by a Wheel' still reviewed until CONCEPT-MAP-FILL-1 PR-2 maps it): 9716 / 10614 = 0.91539; pin 0.9154 -> 0.9153, exactly what the one added row explains.
// 2026-10-11 CONCEPT-MAP-FILL-1 PR-2 merged onto #1084 (trunk dbefa15f): the Areas labels map, so 9760 / 10614 = 0.91954 -> pin 0.9195.
// 2026-10-11 CONCEPT-MAP-FILL-1 PR-2 merged onto RULE5-BIND-1 (#1074, trunk 2d7cc83c): Areas maps (+28 mapped, -28 reviewed) on top of
// #1074's -1 mapped; final pins measured by runtime import: mapped 1849,
// reviewed 136, rows with a concept 9755 of 10598 (0.92046) -> pin 0.9204.
// 2026-10-11 BANK-FIX-7 PR-2 (cofounder D80b; merged onto #1076, trunk ce1425f9): 3 rows served again (ELEC-NCERT-11-LA-002,
// PYQ-M-TRI-005, PYQ-S-2026-METAL-005). "Series Circuit Readings" is ELEC-NCERT-11-LA-002's label (served again, so its line is
// restored): mapped 1849 -> 1850 (+1). Reviewed stays 136. Two of the three rows carry a mapped concept; PYQ-M-TRI-005's label is the
// chapter-echo "General" (no concept), so rows with a concept go 9755 of 10598 -> 9757 of 10601 (0.92038) and the pin moves
// 0.9204 -> 0.9203 by exactly that row. All by runtime import on the merged tip.
// 13 Oct BANK-STEPS-1 PR-1 (cofounder D126): 183 paused rows leave the served bank (10601 -> 10418). They carried a concept more often than the rest,
// so rows with a concept go 9757 of 10601 (0.92038) -> 9576 of 10418 (0.91918): the pin moves 0.9203 -> 0.9191 (a repaired id returns to the count).
// 13 Oct BANK-STEPS-1 PR-2 (follow-up PAUSE, 73 more paused rows; cofounder D143): the two generic reviewed labels that no row serves any more
// (pair-of-linear-equations / acids-bases-and-salts) leave the reviewed list; the MAPPED label "Roots by Formula" STAYS in the map (mistakeConcept.ts resolves a
// stored mistake through it at read time) and is allowed to be un-served ONLY through PAUSED_LABELS below. Coverage pin 0.9191 -> 0.9189 (measured 0.91899).
// [FU-CONCEPTLABEL-RATCHET-RESTORE-BANKSTEPS]: each REPAIR PR that serves one of these rows again restores its reviewed label here, drops the PAUSED_LABELS entry and raises the pin back.
const MIN_MAPPED_LABELS = 1850;
/** Labels whose every row is paused by BANK-STEPS-1: allowed to be mapped while served by nothing. Pinned both ways in the tests below. */
const PAUSED_LABELS: ReadonlyArray<{ chapter: string; label: string }> = [
  // 14 Oct MATHS-UNKNOWN-OWNER-1 PR B (D3): PL2-R14 and SAV2-R16 serve again, so "Degree of Polynomial" and "Total Surface Area" have carriers and leave this list.
  // 17 Oct WITHHOLD-TRI-GDR-1 (#1222): the label's only row, LIGHT-EXMPLR-9-LA-002, is paused (object at F: NCERT 2026-27 Table 9.4
  // "Image would not be formed"). Its repair PR serves the row again and drops this entry.
  { chapter: "light-reflection-and-refraction", label: "Convex Lens — All Object Positions" },
];
const MAX_REVIEWED_LABELS = 136;
/** served rows whose label resolves to a concept / all served rows (see the dated comments above). */
// 13 Oct BANK-STEPS-1 PR-3 (PAUSE-3): 10268 served rows, measured 0.91858 -> pin 0.9189 -> 0.9185 (each REPAIR PR re-measures and raises it back).
// 14 Oct GARBLE-1 REWRITE-1 (A2): PYQ-M-2024-TRIG-018 and -020 serve again (label 'Trigonometric Identity Proofs' has a carrier, its PAUSED_LABELS entry is gone). Re-measured on the merged tree by runtime import: 10329 served, 0.92264 (this includes the rows #1145 restored) -> pin 0.9185 -> 0.9226.
// 14 Oct GARBLE-1 REWRITE-2 (A2): PYQ-M-2024-QE-002, -004b and -006a serve again (10329 -> 10332). Two carry a mapped concept ('Nature of Roots'); QE-002's label 'Sum and Product of Roots' is a reviewed unmapped label (other-chapter: polynomials), so it has none: 9530 of 10329 -> 9532 of 10332 (0.92257), and the pin moves 0.9226 -> 0.9225 by exactly that one row.
// 14 Oct MATHS-UNKNOWN-OWNER-1 (D3): 44 rows serve again (10419 -> 10463); QE2-049 re-serves "Roots by Formula", so its PAUSED_LABELS entry is gone (the paused-but-served control now uses polynomials / Degree of Polynomial). Pin left at 0.9225.
// 14 Oct SCI-BACKLOG-1 batch 1 (F): 19 Science rows serve again (+19, 10438 served), all with the unmapped "Chapter Practice" echo label, so none gains a concept: measured 9618 of 10438 = 0.92144 -> pin 0.9225 -> 0.9214 (the dilution by exactly those 19 rows; AUDIT-REQUEST names it for the cofounder).
// 17 Oct SCI-BACKLOG-1 batch 1 LANDED on trunk bf957004 (after UNKNOWN-OWNER A/B and #1222): re-measured by runtime import on the merged tree:
// 9728 of 10554 = 0.92174 (the same 19 concept-less rows on a larger bank) -> pin 0.9225 -> 0.9217 (the branch's 0.9214 was measured on 10438 rows).
const MIN_ROWS_WITH_CONCEPT_FRACTION = 0.9217;

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
  paused: ReadonlyArray<{ chapter: string; label: string }> = PAUSED_LABELS,
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
        const isServed = !!served.get(chapter)?.has(label);
        const isPaused = paused.some((p) => p.chapter === chapter && p.label === label);
        if (!isServed && !isPaused) problems.push({ kind, chapter, label });
        if (isServed && isPaused) problems.push({ kind: "paused-but-served", chapter, label });
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

/** The vocabulary a label may map to: the chapter's Exam Trends concepts PLUS its tracking concepts. */
const ALL_CONCEPTS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.keys(EXAM_TRENDS_CONCEPTS).map((ch) => [
    ch,
    [...EXAM_TRENDS_CONCEPTS[ch as keyof typeof EXAM_TRENDS_CONCEPTS], ...TRACKING_CONCEPTS[ch as keyof typeof TRACKING_CONCEPTS]],
  ]),
);

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
    expect(auditMap(SERVED, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([]);
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

describe("conceptLabelMap — PAUSED_LABELS (BANK-STEPS-1)", () => {
  it("each paused label is carried ONLY by withheld ids, and by at least one", () => {
    for (const { chapter, label } of PAUSED_LABELS) {
      const carriers = (RAW_CANONICAL_QUESTION_BANK as unknown as Array<{ id: string; topicKey: string; subtopic: string }>).filter(
        (q) => resolveCanonicalSlug(q.topicKey) === chapter && String(q.subtopic).trim() === label,
      );
      expect(carriers.length, `${chapter} / ${label}`).toBeGreaterThan(0);
      expect(carriers.filter((q) => !WITHHELD_QUESTION_IDS.has(q.id)).map((q) => q.id), `${chapter} / ${label}`).toEqual([]);
    }
  });

  it("a paused label is still mapped (the read-time lookup keeps working)", () => {
    for (const { chapter, label } of PAUSED_LABELS) expect(conceptForSubtopic(chapter, label), label).toBeTruthy();
  });
});

describe("conceptLabelMap — mutation controls (each check can fail)", () => {
  it("removing a label from PAUSED_LABELS is RED (stale-mapped)", () => {
    expect(auditMap(SERVED, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED, []).map((p) => p.kind)).toEqual(PAUSED_LABELS.map(() => "stale-mapped"));
    for (const one of PAUSED_LABELS) {
      const rest = PAUSED_LABELS.filter((x) => x !== one);
      expect(auditMap(SERVED, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED, rest).map((p) => p.label), one.label).toEqual([one.label]);
    }
  });

  it("a paused label that is served again is RED (paused-but-served): the cue to remove it from PAUSED_LABELS", () => {
    // The control adds its own paused entry for a label the served bank carries (PAUSED_LABELS holds no served label);
    // the real PAUSED_LABELS stay in the list so their genuinely unserved labels do not also report stale-mapped.
    const paused = [...PAUSED_LABELS, { chapter: "polynomials", label: "Degree of Polynomial" }];
    expect(auditMap(SERVED, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED, paused).map((p) => p.kind)).toEqual(["paused-but-served"]);
  });

  const clone = (s: Served): Served => new Map([...s].map(([k, v]) => [k, new Map(v)]));

  it("a NEW served label with no entry is RED", () => {
    const s = clone(SERVED);
    s.get("electricity")!.set("Fake New Label", 1);
    expect(auditMap(s, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "unclassified", chapter: "electricity", label: "Fake New Label" },
    ]);
  });

  it("a mapped concept that does not exist in the chapter is RED", () => {
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    const mapped = { ...CONCEPT_BY_LABEL, electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: "Not A Concept" } };
    expect(auditMap(SERVED, ALL_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "not-a-concept", chapter: "electricity", label, detail: "Not A Concept" },
    ]);
  });

  it("a concept of ANOTHER chapter is RED", () => {
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    const other = EXAM_TRENDS_CONCEPTS["life-processes"][0];
    const mapped = { ...CONCEPT_BY_LABEL, electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: other } };
    expect(auditMap(SERVED, ALL_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED).map((p) => p.kind)).toEqual([
      "not-a-concept",
    ]);
  });

  it("a label no longer served is RED (stale)", () => {
    const s = clone(SERVED);
    const [label] = Object.keys(CONCEPT_BY_LABEL.electricity);
    s.get("electricity")!.delete(label);
    expect(auditMap(s, ALL_CONCEPTS, CONCEPT_BY_LABEL, UNMAPPED_LABELS_REVIEWED)).toEqual([
      { kind: "stale-mapped", chapter: "electricity", label },
    ]);
  });

  it("a reviewed label that is also mapped is RED", () => {
    const [label] = Object.keys(UNMAPPED_LABELS_REVIEWED.electricity);
    const mapped = {
      ...CONCEPT_BY_LABEL,
      electricity: { ...CONCEPT_BY_LABEL.electricity, [label]: EXAM_TRENDS_CONCEPTS.electricity[0] },
    };
    expect(auditMap(SERVED, ALL_CONCEPTS, mapped, UNMAPPED_LABELS_REVIEWED).map((p) => p.kind)).toEqual([
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

describe("tracking concepts (CONCEPT-MAP-FILL-1)", () => {
  const pairs = Object.entries(TRACKING_CONCEPTS).flatMap(([ch, names]) => names.map((n) => [ch, n] as const));

  it("covers the 26 bank chapters, at most 8 per chapter, and never repeats an Exam Trends name", () => {
    expect(Object.keys(TRACKING_CONCEPTS).sort()).toEqual([...BANK_CHAPTER_SLUGS].sort());
    for (const [ch, names] of Object.entries(TRACKING_CONCEPTS)) {
      expect(names.length, ch).toBeLessThanOrEqual(8);
      expect(new Set(names).size, `${ch}: each tracking concept appears once`).toBe(names.length);
      for (const n of names) expect(EXAM_TRENDS_CONCEPTS[ch as keyof typeof EXAM_TRENDS_CONCEPTS], `${ch}/${n}`).not.toContain(n);
    }
    expect(pairs.length).toBe(34);
  });

  it.each(pairs)("%s / %s carries a cited source and at least one mapped label", (ch, name) => {
    expect(TRACKING_CONCEPT_SOURCES[ch as keyof typeof TRACKING_CONCEPT_SOURCES][name]).toMatch(/NCERT|CBSE|Owner ruling/);
    const mapped = Object.values(CONCEPT_BY_LABEL[ch as keyof typeof CONCEPT_BY_LABEL]).filter((c) => c === name);
    expect(mapped.length).toBeGreaterThan(0);
  });

  it("a tracking concept shows its kind; an Exam Trends concept shows its own; nothing else has one", () => {
    expect(conceptKindOf("metals-and-non-metals", "Alloys")).toBe("tracking");
    expect(conceptKindOf("metals-and-non-metals", EXAM_TRENDS_CONCEPTS["metals-and-non-metals"][0])).toBe("exam-trends");
    expect(conceptKindOf("metals-and-non-metals", "Not A Concept")).toBeUndefined();
    expect(conceptKindOf("electricity", "Alloys")).toBeUndefined();
    expect(conceptKindOf("not-a-chapter", "Alloys")).toBeUndefined();
    expect(conceptKindOf(null, "Alloys")).toBeUndefined();
  });

  // 3 labels per newly covered chapter. Before this lane each of these returned undefined (reviewed concept-gap).
  const PINS: ReadonlyArray<readonly [string, string, string]> = [
    ["areas-related-to-circles", "Area of a Circle", "Perimeter and Area of a Circle — A Review"],
    ["areas-related-to-circles", "Circumference of a Circle", "Perimeter and Area of a Circle — A Review"],
    ["areas-related-to-circles", "Wheels and Revolutions", "Perimeter and Area of a Circle — A Review"],
    ["metals-and-non-metals", "Extraction of Metals", "Basic Metallurgical Processes"],
    ["metals-and-non-metals", "Chemical Properties", "Chemical Properties of Metals and Non-metals"],
    ["metals-and-non-metals", "Physical Properties", "Physical Properties of Metals and Non-metals"],
    ["acids-bases-and-salts", "Neutralisation", "Understanding the Chemical Properties of Acids and Bases"],
    ["acids-bases-and-salts", "Reactions of Acids and Bases", "Understanding the Chemical Properties of Acids and Bases"],
    ["acids-bases-and-salts", "Reactions", "Understanding the Chemical Properties of Acids and Bases"],
    ["carbon-and-its-compounds", "Soaps and Detergents", "Soaps and Detergents"],
    ["carbon-and-its-compounds", "Chemical Properties", "Chemical Properties of Carbon Compounds"],
    ["carbon-and-its-compounds", "Covalent Bonding", "Bonding in Carbon: The Covalent Bond"],
    ["magnetic-effects-of-electric-current", "AC Frequency", "Direct Current and Alternating Current"],
    ["magnetic-effects-of-electric-current", "Advantages of AC over DC", "Direct Current and Alternating Current"],
    ["magnetic-effects-of-electric-current", "Force on Current-carrying Conductor", "Force on a Current-carrying Conductor in a Magnetic Field"],
    ["control-and-coordination", "Hormones in Animals", "Hormones in Animals"],
    ["control-and-coordination", "Hormones", "Hormones in Animals"],
    ["control-and-coordination", "Endocrine Glands", "Hormones in Animals"],
    ["electricity", "Electric Current", "Electric Current and Circuit"],
    ["electricity", "Factors Affecting Resistance", "Factors on Which the Resistance of a Conductor Depends"],
    ["electricity", "Resistivity", "Factors on Which the Resistance of a Conductor Depends"],
    ["human-eye-and-colourful-world", "Dispersion of Light", "Dispersion of White Light by a Glass Prism"],
    ["human-eye-and-colourful-world", "Dispersion", "Dispersion of White Light by a Glass Prism"],
    ["human-eye-and-colourful-world", "Refraction through a Prism", "Refraction of Light through a Prism"],
    ["light-reflection-and-refraction", "Laws of Reflection", "Reflection of Light"],
    ["light-reflection-and-refraction", "Plane Mirror", "Reflection of Light"],
    ["light-reflection-and-refraction", "Plane Mirrors", "Reflection of Light"],
    ["life-processes", "Plant Transport", "Transportation in Plants"],
    ["life-processes", "Plant Excretion", "Excretion in Plants"],
    ["life-processes", "Transpiration", "Transportation in Plants"],
    ["how-do-organisms-reproduce", "DNA Copying", "Do Organisms Create Exact Copies of Themselves?"],
    ["how-do-organisms-reproduce", "DNA Copying and Variation", "Do Organisms Create Exact Copies of Themselves?"],
    ["how-do-organisms-reproduce", "Variation", "Do Organisms Create Exact Copies of Themselves?"],
    ["heredity", "Variation", "Accumulation of Variation during Reproduction"],
    ["heredity", "Genes and Chromosomes", "How Traits Get Expressed"],
    ["heredity", "Expression of Traits", "How Traits Get Expressed"],
    ["our-environment", "Ecological Systems", "Ecosystem and Its Components"],
    ["our-environment", "Ecosystem — producers, consumers, decomposers", "Ecosystem and Its Components"],
    ["our-environment", "Decomposers", "Ecosystem and Its Components"],
    ["triangles", "Right-Triangle Lengths (a² + b² = c² as a tool)", "Right-Triangle Lengths (a² + b² = c² as a tool)"],
    ["statistics", "Empirical Relationship", "Empirical Relationship between Mean, Median and Mode"],
    ["statistics", "Empirical Relation between Mean, Median and Mode", "Empirical Relationship between Mean, Median and Mode"],
    ["statistics", "Empirical Relationship Between Mean, Median and Mode", "Empirical Relationship between Mean, Median and Mode"],
  ];
  it.each(PINS)("%s: %j resolves to the tracking concept %j", (ch, label, concept) => {
    expect(conceptForSubtopic(ch, label)).toBe(concept);
    expect(conceptKindOf(ch, concept)).toBe("tracking");
  });

  it("no chapter is below 90% of its non-echo served rows mapped (target of the lane)", () => {
    const tot = new Map<string, { rows: number; mapped: number }>();
    for (const [, t, sIdx] of BANK_ID_INDEX_ROWS) {
      const ch = BANK_ID_INDEX_TOPIC_KEYS[t];
      const label = BANK_ID_INDEX_SUBTOPICS[sIdx].trim();
      if (isChapterEchoSubtopic(label)) continue;
      const x = tot.get(ch) ?? { rows: 0, mapped: 0 };
      x.rows++;
      if (conceptForSubtopic(ch, label)) x.mapped++;
      tot.set(ch, x);
    }
    // (areas-related-to-circles was the one exception, ~85%, until D79b ruled the review content IN and PR-2 built its concept.)
    for (const [ch, x] of tot) expect(x.mapped / x.rows, ch).toBeGreaterThanOrEqual(0.9);
  });
});
