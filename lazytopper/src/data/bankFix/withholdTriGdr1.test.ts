// @vitest-environment node
//
// WITHHOLD-TRI-GDR-1 (17 Oct 2026, cofounder session 01Sqfd9w; owner approval 17 Oct 12:08 IST) - pins this lane's withholds.
//
// B: GDR-L-CBJ-011 ("object at the focus of a convex lens") keys the image as "real, inverted and highly enlarged" at infinity.
//    NCERT jesc109 (Reprint 2026-27), p.152, Table 9.4, row "At focus F1": "At infinity" / "Image would not be formed".
//    Same pause as D252 on the unmerged fix/sci-backlog-1-f-b3; here it is withheld on trunk until the text + figure repair.
//    Mechanism (as that branch does it, byte-identical lines): the id in the BANK-STEPS-1 PAUSE block of WITHHELD_QUESTION_IDS + a
//    `paused` WRONG-CONTENT entry in bankSteps1Ledger.ts (bankSteps1.test.ts (c) and computedFigures.provenance.test.ts require both).
// A: none of the 12 Triangles rows D261 excluded from the solutions page is withheld here. Each was read against owner
//    ruling 1 (syllabus2026-27.ts: Pythagoras as a numeric TOOL is IN) and none states or proves Pythagoras, the area theorem or
//    the angle bisector theorem; they are reported to the cofounder as QUESTIONs instead (PR body).
//
// Import-based: the served bank, the Chapter Test draw, the Worksheet topic pools and the Full Mock pools are built from the
// real modules, never from file text.
import { describe, expect, it } from "vitest";
import "../../test/preloadBankChapters";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { getBankRows } from "../bankChapters/loader";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";
import { drawChapterTest, isEligibleForChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT, buildUnionPool, fullMockChapterWeights, sectionPool } from "../../components/fullmock/fullMockBlueprint";
import { getTopics, planWorksheet } from "../../components/worksheet/worksheetModel";

/** This lane's withholds: id -> the chapter slug whose pools must exclude it. */
//    Reviewer siblings (same wrong claim, object AT F; NCERT Table 9.4 convex lens / Table 9.1 concave mirror): GDR-L-NUM-019,
//    GDR-L-CBJ-018, LTG-S-LIGHT-278, LIGHT-EXMPLR-9-LA-002, LT-H01, LT2-043, FND-L-SPM-026 - same PAUSE block + `paused` ledger pattern.
const LIGHT = { subject: "Science", slug: "light-reflection-and-refraction" } as const;
const WITHHELD_HERE = new Map<string, { subject: "Maths" | "Science"; slug: string }>(
  ["GDR-L-CBJ-011", "GDR-L-NUM-019", "GDR-L-CBJ-018", "LTG-S-LIGHT-278", "LIGHT-EXMPLR-9-LA-002", "LT-H01", "LT2-043", "FND-L-SPM-026"]
    .map((id) => [id, LIGHT]),
);

const SERVED = new Set(canonicalQuestionBank.map((q) => q.id));
const RAW = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const FIXED_CREATED_AT = "2026-01-01T00:00:00.000Z";
const SEEDS = Array.from({ length: 30 }, (_, i) => ((i + 1) * 2654435761) >>> 0);

describe("WITHHOLD-TRI-GDR-1 - the served bank", () => {
  it.each([...WITHHELD_HERE.keys()])("%s is in the raw bank, in WITHHELD_QUESTION_IDS and not served", (id) => {
    expect(RAW.has(id), `${id} must exist in the raw bank (withhold, never delete)`).toBe(true);
    expect(WITHHELD_QUESTION_IDS.has(id)).toBe(true);
    expect(SERVED.has(id)).toBe(false);
  });

  it("the served bank drops by exactly the raw rows withheld here (no bank-wide total is pinned)", () => {
    const servedWithoutThisLane = RAW_CANONICAL_QUESTION_BANK.filter((q) => !WITHHELD_QUESTION_IDS.has(q.id) || WITHHELD_HERE.has(q.id));
    const rawRowsHere = RAW_CANONICAL_QUESTION_BANK.filter((q) => WITHHELD_HERE.has(q.id)).length;
    expect(rawRowsHere).toBe(WITHHELD_HERE.size); // each id names exactly one raw row
    expect(canonicalQuestionBank.length).toBe(servedWithoutThisLane.length - rawRowsHere);
  });

  it("the chapter loader no longer returns a withheld row", () => {
    for (const [id, { slug }] of WITHHELD_HERE) {
      expect(getBankRows([slug]).some((q) => q.id === id), id).toBe(false);
    }
  });

  it("Triangles and Light still serve questions", () => {
    expect(getBankRows(["triangles"]).length).toBeGreaterThan(0);
    expect(getBankRows(["light-reflection-and-refraction"]).length).toBeGreaterThan(0);
  });
});

describe("WITHHOLD-TRI-GDR-1 - Chapter Test / Worksheet / Full Mock pools exclude the withheld rows", () => {
  it.each([...WITHHELD_HERE])("%s: no Chapter Test draw on its chapter contains it (30 seeds)", (id, { subject, slug }) => {
    let drawn = 0;
    for (const seed of SEEDS) {
      const t = drawChapterTest({ subject, topicKey: slug, topicLabel: slug, worksheetId: "ct-wh", createdAt: FIXED_CREATED_AT, seed });
      drawn += t.paper.questions.length;
      expect(t.paper.questions.map((q) => q.id), `seed ${seed}`).not.toContain(id);
    }
    expect(drawn).toBeGreaterThan(0);
  });

  it.each([...WITHHELD_HERE])("%s: absent from every Worksheet topic pool of its subject", (id, { subject }) => {
    let pooled = 0;
    for (const t of getTopics(subject)) {
      const plan = planWorksheet({ subject, scope: "topic", topics: [t], requested: 10 });
      const ids = (plan.pools.get(t.key) ?? []).map((q) => q.id);
      pooled += ids.length;
      expect(ids, t.key).not.toContain(id);
    }
    expect(pooled).toBeGreaterThan(0);
  });

  it.each([...WITHHELD_HERE])("%s: absent from the Full Mock union pool and every section pool", (id, { subject, slug }) => {
    const slugs = new Set(fullMockChapterWeights(subject).map((c) => c.slug));
    expect(slugs.has(slug)).toBe(true);
    const pool = buildUnionPool(subject, slugs);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.map((q) => q.id)).not.toContain(id);
    for (const spec of FM_BLUEPRINT) expect(sectionPool(pool, spec.section).map((q) => q.id), spec.section).not.toContain(id);
  });

  it("CONTROL: every raw row resolves to its chapter, and the pool checks are not vacuous (some would be Chapter-Test eligible if served)", () => {
    for (const [id, { slug }] of WITHHELD_HERE) expect(resolveCanonicalSlug(RAW.get(id)!.topicKey), id).toBe(slug);
    expect([...WITHHELD_HERE.keys()].filter((id) => isEligibleForChapterTest(RAW.get(id)!)).length).toBeGreaterThan(0);
    expect(isEligibleForChapterTest(RAW.get("GDR-L-CBJ-011")!)).toBe(true);
  });
});
