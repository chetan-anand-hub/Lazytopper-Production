// SYLLABUS-FIX-CODE F2 — the per-chapter "approx. N marks" chips derive from CBSE's unit
// marks (src/config/syllabus2026-27.ts) and sum to EXACTLY 80 per subject.
//
// Before F2 the chips were hand-typed and summed to 82 (Maths) / 79 (Science).

import { describe, it, expect } from "vitest";
import { SYLLABUS_2026_27, UNIT_MARKS } from "../../config/syllabus2026-27";
import { allDesktopTopics, deriveChapterMarks } from "./topics";

const SUBJECTS = [
  ["Maths", "maths"],
  ["Science", "science"],
] as const;

describe("F2 — chapter marks chips", () => {
  it.each(SUBJECTS)("%s chips sum to exactly 80, and each CBSE unit's chapters sum to its unit marks", (label, key) => {
    const topics = allDesktopTopics().filter((t) => t.subject === label);
    expect(topics.reduce((s, t) => s + t.weight, 0)).toBe(80);
    for (const unit of SYLLABUS_2026_27[key].units) {
      const sum = topics.filter((t) => (unit.chapters as readonly string[]).includes(t.slug)).reduce((s, t) => s + t.weight, 0);
      expect(sum, `${label} unit ${unit.unit}`).toBe(UNIT_MARKS[key][unit.unit]);
    }
    // Every board chapter of the subject has a chip, and only those.
    expect(topics.map((t) => t.slug).sort()).toEqual(SYLLABUS_2026_27[key].units.flatMap((u) => u.chapters).sort());
  });

  it("every chip is labelled 'approx. N marks' and equals its numeric weight", () => {
    for (const t of allDesktopTopics()) {
      expect(t.marks).toBe(`approx. ${t.weight} marks`);
      expect(t.weight).toBeGreaterThan(0);
    }
  });

  it("the split rule is deterministic largest-remainder within a unit (pinned values)", () => {
    const bySlug = new Map(allDesktopTopics().map((t) => [t.slug, t.weight]));
    // Unit II Algebra 20 over shares 6/6/6/5; Unit IV Geometry 15 over 7/6; Unit VI 10 over 4/7;
    // Unit V Natural Resources 5 (one chapter).
    expect(["polynomials", "pair-of-linear-equations", "quadratic-equations", "arithmetic-progression"].map((s) => bySlug.get(s))).toEqual([5, 5, 5, 5]);
    expect([bySlug.get("triangles"), bySlug.get("circles")]).toEqual([8, 7]);
    expect([bySlug.get("areas-related-to-circles"), bySlug.get("surface-areas-and-volumes")]).toEqual([4, 6]);
    expect(bySlug.get("our-environment")).toBe(5);
    // A zero-share unit still splits its marks exactly (evenly).
    const even = deriveChapterMarks("maths", new Map());
    expect([...even.values()].reduce((a, b) => a + b, 0)).toBe(80);
  });

  it("the Statistics blurb no longer advertises cumulative frequency curves (an OUT item)", () => {
    const stats = allDesktopTopics().find((t) => t.slug === "statistics")!;
    expect(stats.blurb).not.toMatch(/cumulative/i);
  });
});
