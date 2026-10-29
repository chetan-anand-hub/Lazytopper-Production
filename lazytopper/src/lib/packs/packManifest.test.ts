import { describe, expect, it } from "vitest";
import { bundleSavingBase, packManifest, packSummaryRows, subjectSaving } from "./packManifest";
import { PACK_CHAPTER_SLUGS } from "../../services/packs";

describe("packManifest", () => {
  it("a chapter pack: question sheets A-E, two chapter tests and a worksheet, each with a key; Trigonometry carries both chapters", () => {
    const m = packManifest("pack_chapter", "trigonometry");
    expect(m.title).toBe("Chapter Pack · Trigonometry (Ch 8 + Ch 9)");
    expect(m.groups).toHaveLength(1);
    expect(m.groups[0].items.map((i) => i.label)).toEqual(["Question sheets, Sections A to E", "Chapter Test 1", "Chapter Test 2", "Worksheet"]);
    expect(m.groups[0].items.every((i) => i.withKey)).toBe(true);
    expect(m.papers).toBe(3);
    expect(packManifest("pack_chapter").groups[0].heading).toBe("Your chapter");
    expect(packManifest("pack_chapter", "not-a-chapter").chapterPacks).toBe(1);
  });
  it("a mock pack lists papers 1-8 for the subject; the Standard (041) pattern is named for Maths only", () => {
    const maths = packManifest("pack_mock", "maths");
    expect(maths.groups[0].items.map((i) => i.label)).toEqual(Array.from({ length: 8 }, (_, i) => `Mock paper ${i + 1}`));
    expect(maths.groups[0].items[0].detail).toContain("Standard (041)");
    const sci = packManifest("pack_mock", "science");
    expect(sci.groups[0].heading).toBe("Science mock papers");
    expect(sci.groups[0].items[0].detail).not.toContain("041");
    expect(maths.papers).toBe(8);
  });
  it("a subject pack is its chapters (grouped) plus its 8 mocks", () => {
    const m = packManifest("pack_subject", "science");
    expect(m.chapterPacks).toBe(13);
    expect(m.groups).toHaveLength(14);
    expect(m.groups[13].heading).toBe("Science mock papers");
    expect(m.papers).toBe(13 * 3 + 8);
    expect(packManifest("pack_subject", "maths").groups[0].chapter).toBeTruthy();
  });
  it("the bundle covers every chapter and 16 mocks, under its new name", () => {
    const m = packManifest("pack_bundle");
    expect(m.title).toBe("Maths + Science Bundle");
    expect(m.chapterPacks).toBe(PACK_CHAPTER_SLUGS.length);
    expect(m.mockPapers).toBe(16);
    expect(m.groups).toHaveLength(PACK_CHAPTER_SLUGS.length + 2);
    expect(m.papers).toBe(26 * 3 + 16);
  });

  it("savings are computed from the chapter-pack count, not typed: 13 x 49 + 99 - 199 = 537 for both subjects; the bundle's base is 2 x 199", () => {
    expect(subjectSaving("maths")).toBe(537);
    expect(subjectSaving("science")).toBe(537);
    expect(bundleSavingBase()).toBe(398);
  });
  it("summary rows follow the approved pop-up: counts shown only when known, Standard (041) for Maths only", () => {
    expect(packSummaryRows("pack_chapter", "real-numbers")[0].value).toBe("A\u2013E");
    expect(packSummaryRows("pack_chapter", "real-numbers", 120)[0].value).toMatch(/120 questions/);
    expect(packSummaryRows("pack_mock", "maths").map((r) => r.value)).toEqual(["8", "8", "80", "Standard (041)"]);
    expect(packSummaryRows("pack_mock", "science")).toHaveLength(3);
    expect(packSummaryRows("pack_subject", "maths").map((r) => r.value)).toEqual(["13", "8", "\u20b9537"]);
    expect(packSummaryRows("pack_subject", "science", 1234).some((r) => r.label === "Questions" && r.value === "1,234")).toBe(true);
    expect(packSummaryRows("pack_bundle").map((r) => r.value)).toEqual(["26", "27", "16", "\u20b9398"]);
  });
  it("a CBQ pack lists a marking-rules page and one group per chapter of the subject; the summary count is shown only when known", () => {
    const m = packManifest("pack_cbq", "science");
    expect(m.title).toBe("Science CBQ Pack");
    expect(m.groups[0].heading).toBe("Start here");
    expect(m.groups).toHaveLength(14);
    expect(m.chapterPacks).toBe(13);
    expect(packSummaryRows("pack_cbq", "maths")[0]).toEqual({ label: "Competency questions", value: "1,400+ CBQs" });
  });
});
