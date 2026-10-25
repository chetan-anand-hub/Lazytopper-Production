import { describe, expect, it, vi } from "vitest";
import { buildPackFiles, groupPackFiles, type BuildContext, type PackFile } from "./buildPackFiles";
import { chapterPackRows, countChapterQuestions, groupBySection, isExcludedFromPacks, isStepMarked, loadChapter, splitIntoParts, MAX_QUESTIONS_PER_DOC } from "./packContent";
import { PACK_CHAPTER_SLUGS, chaptersOfSubject, type OwnedPack } from "../../services/packs";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";

const owned = (packId: string, extra: Partial<OwnedPack> = {}): OwnedPack => {
  const [sku, target] = packId.split(":");
  return { packId, sku, target, pricePaidInr: 49, paidAt: 1, orderId: `order_${sku}`, ...extra };
};
const ctx = (packs: OwnedPack[], over: Partial<BuildContext> = {}): BuildContext => ({
  licensee: { name: "Asha Rao", email: "asha@example.in" },
  owned: packs,
  nowIso: () => "2026-10-27T00:00:00.000Z",
  ...over,
});
const ref = (p: OwnedPack) => ({ packId: p.packId, sku: p.sku as never, target: p.target });

describe("splitIntoParts", () => {
  it("keeps a list that fits whole and splits an over-60 list into equal-as-possible parts", () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => i);
    expect(splitIntoParts(mk(0))).toEqual([]);
    expect(splitIntoParts(mk(60))).toHaveLength(1);
    const p = splitIntoParts(mk(61));
    expect(p).toHaveLength(2);
    expect(p.flat()).toEqual(mk(61));
    expect(Math.max(...p.map((x) => x.length))).toBeLessThanOrEqual(MAX_QUESTIONS_PER_DOC);
    expect(splitIntoParts(mk(150))).toHaveLength(3);
  });
});

describe("chapter pack contents", () => {
  it("excludes figure-needing rows that have no bound figure, and nothing else is excluded by this rule", async () => {
    let excludedSeen = 0;
    for (const slug of ["triangles", "light-reflection-and-refraction"]) {
      await loadChapter(slug);
      const rows = chapterPackRows(slug);
      for (const q of rows) expect(isExcludedFromPacks(q), q.id).toBe(false);
      // any row that needs a figure and is in the pack has one bound
      for (const q of rows) if (q.requiresDiagram) expect(getFiguresForQuestion(q.id).length, q.id).toBeGreaterThan(0);
      expect(countChapterQuestions(slug)).toBe(rows.length);
      excludedSeen += 1;
    }
    expect(excludedSeen).toBe(2);
  });

  it("rows are in board order: section A..E, then step-marked before the rest, then id", async () => {
    await loadChapter("real-numbers");
    const rows = chapterPackRows("real-numbers");
    expect(rows.length).toBeGreaterThan(0);
    const order = "ABCDE";
    for (let i = 1; i < rows.length; i += 1) {
      const a = order.indexOf(rows[i - 1].section);
      const b = order.indexOf(rows[i].section);
      expect(a <= b, `${rows[i - 1].id} before ${rows[i].id}`).toBe(true);
      if (a === b && isStepMarked(rows[i - 1]) === isStepMarked(rows[i])) expect(rows[i - 1].id < rows[i].id).toBe(true);
    }
  });
});

describe("buildPackFiles — chapter", () => {
  it("lists section question + key files, two chapter tests and a worksheet, grouped under the chapter", async () => {
    const pack = owned("pack_chapter:real-numbers");
    const files = await buildPackFiles(ref(pack), ctx([pack]));
    await loadChapter("real-numbers");
    const secs = groupBySection(chapterPackRows("real-numbers"));
    const labels = files.map((f) => f.label);
    for (const [sec, list] of secs) {
      const parts = splitIntoParts(list).length;
      const n = labels.filter((l) => l.startsWith(`Section ${sec} ·`)).length;
      expect(n, `section ${sec}`).toBe(parts * 2);
    }
    expect(labels).toContain("Worksheet · Questions");
    expect(labels).toContain("Worksheet · Answer key");
    expect(labels).toContain("Chapter Test 1 · Questions");
    expect(labels).toContain("Chapter Test 2 · Answer key");
    expect(groupPackFiles(files).map((g) => g.group)).toEqual(["Real Numbers"]);
    expect(new Set(files.map((f) => f.filename)).size).toBe(files.length); // unique file names
    const aq = files.find((f) => f.label.startsWith("Section A · Questions"));
    expect(aq?.filename).toMatch(/^LazyTopper-Real-Numbers-Section-A(-Part-1-of-\d)?-Questions\.pdf$/);
  });

  it("splits a section over 60 questions into 'Part k of n'", async () => {
    // find the biggest section across the Maths chapters
    let best: { slug: string; sec: string; n: number } | null = null;
    for (const slug of chaptersOfSubject("maths")) {
      await loadChapter(slug);
      for (const [sec, list] of groupBySection(chapterPackRows(slug))) if (!best || list.length > best.n) best = { slug, sec, n: list.length };
    }
    expect(best).not.toBeNull();
    expect(best!.n, "the bank has a section over 60, otherwise this test proves nothing").toBeGreaterThan(MAX_QUESTIONS_PER_DOC);
    const pack = owned(`pack_chapter:${best!.slug}`);
    const files = await buildPackFiles(ref(pack), ctx([pack]));
    const parted = files.filter((f) => new RegExp(`^Section ${best!.sec} · Questions \\(Part \\d of \\d\\)$`).test(f.label));
    expect(parted.length).toBeGreaterThanOrEqual(2);
    expect(parted[0].filename).toMatch(/-Part-1-of-\d-Questions\.pdf$/);
  });

  it("is deterministic: the same packId yields the same question ids in every drawn file, twice", async () => {
    const pack = owned("pack_chapter:triangles");
    const capture = async () => {
      const seen: Record<string, string[]> = {};
      const exportPdf = vi.fn(async (ws: { questions: Array<{ id: string }> }, mode: string, _c?: string, opts?: { filename?: string }) => {
        seen[`${opts?.filename}|${mode}`] = ws.questions.map((q) => q.id);
        return "x";
      });
      const files = await buildPackFiles(ref(pack), ctx([pack], { exportPdf: exportPdf as never }));
      for (const f of files) await f.build();
      return seen;
    };
    const a = await capture();
    const b = await capture();
    expect(Object.keys(a).length).toBeGreaterThan(4);
    expect(a).toEqual(b);
    // a different packId draws differently somewhere (chapter tests / worksheet are seeded by packId)
    const other = owned("pack_subject:maths");
    const files = await buildPackFiles({ packId: other.packId, sku: "pack_chapter", target: "triangles" } as never, ctx([other]));
    expect(files.length).toBeGreaterThan(0);
  });

  it("build() passes the licensee, the covering order, a cover and the filename to the exporter, and never the download limit", async () => {
    const chapter = owned("pack_chapter:triangles", { orderId: "order_CH" });
    const subj = owned("pack_subject:maths", { orderId: "order_SUBJ" });
    const exportPdf = vi.fn(async () => "x");
    const onDownload = vi.fn();
    const files = await buildPackFiles(ref(chapter), ctx([chapter, subj], { exportPdf: exportPdf as never, onDownload }));
    const f = files.find((x) => x.label === "Worksheet · Answer key") as PackFile;
    await f.build();
    expect(exportPdf).toHaveBeenCalledTimes(1);
    const [ws, mode, code, opts] = exportPdf.mock.calls[0] as unknown as [{ createdAt: string; title: string }, string, unknown, Record<string, unknown>];
    expect(mode).toBe("answers");
    expect(code).toBe("PK-M-TRI-WS"); // PACKS-GRADE-1: paper-shaped files print their pack code
    expect(ws.createdAt).toBe("2026-10-27T00:00:00.000Z");
    expect(opts.licensee).toEqual({ name: "Asha Rao", email: "asha@example.in", orderId: "order_CH" });
    expect(opts.filename).toBe(f.filename);
    expect(opts.cover).toMatchObject({ kicker: expect.stringContaining("WORKSHEET") });
    expect(onDownload).toHaveBeenCalledWith("pack_chapter");
  });
});

describe("provenance", () => {
  it("carries pyqYear / pyqSet / sourceOverride from the bank row onto pack questions", async () => {
    await loadChapter("real-numbers");
    const rows = chapterPackRows("real-numbers");
    const withYear = rows.find((r) => r.pyqYear);
    expect(withYear, "the chapter has a PYQ row").toBeTruthy();
    const pack = owned("pack_chapter:real-numbers");
    const seen: Array<{ id: string; pyqYear?: string }> = [];
    const exportPdf = vi.fn(async (ws: { questions: Array<{ id: string; pyqYear?: string }> }) => {
      seen.push(...ws.questions);
      return "x";
    });
    const files = await buildPackFiles(ref(pack), ctx([pack], { exportPdf: exportPdf as never }));
    for (const f of files.filter((x) => x.label.startsWith("Section"))) await f.build();
    expect(seen.find((q) => q.id === withYear!.id)?.pyqYear).toBe(withYear!.pyqYear);
  });
});

describe("no licensee email, no PDF", () => {
  it("build() throws before the exporter is ever called", async () => {
    const pack = owned("pack_chapter:triangles");
    const exportPdf = vi.fn(async () => "x");
    for (const email of ["", "   "]) {
      const files = await buildPackFiles(ref(pack), ctx([pack], { licensee: { name: "A", email }, exportPdf: exportPdf as never }));
      await expect(files[0].build()).rejects.toThrow("licensee_unavailable");
    }
    expect(exportPdf).not.toHaveBeenCalled();
  });
});

describe("buildPackFiles — mock, subject, bundle", () => {
  it("a mock pack is 8 papers, each with a key", async () => {
    const pack = owned("pack_mock:maths");
    const files = await buildPackFiles(ref(pack), ctx([pack]));
    expect(files).toHaveLength(16);
    expect(files.map((f) => f.label).slice(0, 2)).toEqual(["Mock 1 · Questions", "Mock 1 · Answer key"]);
    expect(groupPackFiles(files).map((g) => g.group)).toEqual(["Maths mock papers"]);
  });

  it("8 mock papers (paper + key) are built for EACH subject from the real bank", async () => {
    for (const subject of ["maths", "science"] as const) {
      const pack = owned(`pack_mock:${subject}`);
      const files = await buildPackFiles(ref(pack), ctx([pack]));
      expect(files, subject).toHaveLength(16);
      for (let n = 1; n <= 8; n += 1) {
        expect(files.map((f) => f.label), `${subject} mock ${n}`).toEqual(expect.arrayContaining([`Mock ${n} · Questions`, `Mock ${n} · Answer key`]));
      }
    }
  }, 120_000);

  it("a subject pack is its 13 chapters (grouped) plus its mocks; the bundle is both subjects", async () => {
    const pack = owned("pack_subject:science");
    const files = await buildPackFiles(ref(pack), ctx([pack]));
    const groups = groupPackFiles(files).map((g) => g.group);
    expect(groups).toHaveLength(14);
    expect(groups[13]).toBe("Science mock papers");
    expect(files.some((f) => f.label.startsWith("Mock 8"))).toBe(true);
    // chapters the pack covers carry the SUBJECT pack's order on their files
    const bundle = owned("pack_bundle:all");
    const bundleFiles = await buildPackFiles(ref(bundle), ctx([bundle]));
    expect(groupPackFiles(bundleFiles).map((g) => g.group)).toHaveLength(26 + 2);
    expect(PACK_CHAPTER_SLUGS).toHaveLength(26);
  }, 120_000);
});
