// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import { packPaperCode } from "./packPaperCode";
import { PACK_CHAPTER_SLUGS, type OwnedPack } from "../../services/packs";
import { loadLocalSessionRecords, writeSessionRecord, type SessionRecord } from "../../services/sessionRecords";
import { loadChapterTestPaper } from "../../services/chapterTestPaperStore";
import { pendingFromSessionRecords } from "../../components/home/pendingPapers";
import type { AuthUser } from "../../context/AuthContext";

const user = { uid: "u1", email: "a@b.in" } as unknown as AuthUser;
const owned = (packId: string): OwnedPack => {
  const [sku, target] = packId.split(":");
  return { packId, sku, target, pricePaidInr: 49, paidAt: 1, orderId: "order_1" };
};
const mk = (pack: OwnedPack, over: Partial<BuildContext> = {}) => {
  const exportPdf = vi.fn(async (..._a: unknown[]) => "ok");
  const ctx: BuildContext = {
    licensee: { name: "Asha", email: "asha@example.in" },
    owned: [pack],
    user,
    exportPdf,
    nowIso: () => "2026-10-27T00:00:00.000Z",
    ...over,
  };
  return { ctx, exportPdf };
};
const ref = (p: OwnedPack) => ({ packId: p.packId, sku: p.sku as never, target: p.target });

beforeEach(() => {
  // Pin the clock ourselves (the record builders stamp gradedAt/savedAt): CLOCK_GUARD leaves a pinned Date alone.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T10:00:00.000Z"));
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("packPaperCode", () => {
  it("has the PK- shape, never collides with in-app prefixes, and is unique across every chapter", () => {
    const codes = new Set<string>();
    for (const slug of PACK_CHAPTER_SLUGS) {
      for (const kind of ["ct1", "ct2", "ws"] as const) {
        const c = packPaperCode({ kind, chapter: slug });
        expect(c).toMatch(/^PK-[MS]-[A-Z0-9]+-(CT1|CT2|WS)(-V2)?$/);
        codes.add(c);
      }
    }
    expect(codes.size).toBe(PACK_CHAPTER_SLUGS.length * 3);
    expect(packPaperCode({ kind: "mock", subject: "science", n: 3 })).toBe("PK-S-FULL-M3");
  });

  it("only the three corrected graded papers carry a -V2 suffix", () => {
    const v2: string[] = [];
    for (const slug of PACK_CHAPTER_SLUGS) for (const kind of ["ct1", "ct2", "ws"] as const) if (packPaperCode({ kind, chapter: slug }).endsWith("-V2")) v2.push(packPaperCode({ kind, chapter: slug }));
    for (const subject of ["maths", "science"] as const) for (let n = 1; n <= 8; n += 1) if (packPaperCode({ kind: "mock", subject, n }).endsWith("-V2")) v2.push(packPaperCode({ kind: "mock", subject, n }));
    expect(v2.sort()).toEqual(["PK-M-PO-WS-V2", "PK-S-FULL-M5-V2", "PK-S-MEOE-WS-V2"]);
  });
});

describe("pack papers join the existing download -> pending -> upload path", () => {
  it("a Chapter Test download prints its code, files a pending record and a stored paper with solutions", async () => {
    const pack = owned("pack_chapter:real-numbers");
    const { ctx, exportPdf } = mk(pack);
    const files = await buildPackFiles(ref(pack), ctx);
    const ct1q = files.find((f) => f.label === "Chapter Test 1 · Questions")!;
    expect(ct1q.code).toBe("PK-M-RN-CT1");
    await ct1q.build();
    expect(exportPdf.mock.calls[0][2]).toBe("PK-M-RN-CT1");

    const rec = loadLocalSessionRecords("u1").find((r) => r.id === "PK-M-RN-CT1")!;
    expect(rec.surface).toBe("chapter-test");
    expect(rec.status).toBe("pending-upload");
    expect(rec.topicKeys).toContain("real-numbers");

    const pending = pendingFromSessionRecords(loadLocalSessionRecords("u1"));
    const row = pending.find((p) => p.code === "PK-M-RN-CT1")!;
    expect(row.surface).toBe("chapter-test");
    expect(row.href).toContain("/chapter-test/10/Maths/real-numbers");
    expect(row.href).toContain("PK-M-RN-CT1");

    const stored = await loadChapterTestPaper(user, "PK-M-RN-CT1");
    expect(stored?.downloaded).toBe(true);
    expect(stored!.paper.questions.length).toBeGreaterThan(0);
    for (const q of stored!.paper.questions) expect(q.solutionSteps?.length ?? 0, String(q.id)).toBeGreaterThan(0);
  });

  it("the key of the same paper carries the same code; a re-download keeps one record", async () => {
    const pack = owned("pack_chapter:real-numbers");
    const { ctx, exportPdf } = mk(pack);
    const files = await buildPackFiles(ref(pack), ctx);
    const key = files.find((f) => f.label === "Chapter Test 1 · Answer key")!;
    await key.build();
    await key.build();
    expect(exportPdf.mock.calls.every((c) => c[2] === "PK-M-RN-CT1")).toBe(true);
    expect(loadLocalSessionRecords("u1").filter((r) => r.id === "PK-M-RN-CT1")).toHaveLength(1);
  });

  it("the Worksheet files a worksheet-surface pending record", async () => {
    const pack = owned("pack_chapter:triangles");
    const { ctx } = mk(pack);
    const f = (await buildPackFiles(ref(pack), ctx)).find((x) => x.label === "Worksheet · Questions")!;
    expect(f.code).toBe("PK-M-TRI-WS");
    await f.build();
    const rec = loadLocalSessionRecords("u1").find((r) => r.id === "PK-M-TRI-WS")!;
    expect(rec.surface).toBe("worksheet");
    expect(rec.status).toBe("pending-upload");
  });

  it("a Full Mock files a full-mock pending record", async () => {
    const pack = owned("pack_mock:science");
    const { ctx } = mk(pack);
    const f = (await buildPackFiles(ref(pack), ctx)).find((x) => x.label === "Mock 2 · Questions")!;
    expect(f.code).toBe("PK-S-FULL-M2");
    await f.build();
    const rec = loadLocalSessionRecords("u1").find((r) => r.id === "PK-S-FULL-M2")!;
    expect(rec.surface).toBe("full-mock");
    expect(rec.subject).toBe("science");
    expect(rec.status).toBe("pending-upload");
  });

  it("the same paper has the same code and questions whichever covering pack sold it", async () => {
    const a = owned("pack_chapter:real-numbers");
    const b = owned("pack_subject:maths");
    const ids = async (p: OwnedPack) => {
      const { ctx } = mk(p);
      const f = (await buildPackFiles(ref(p), ctx)).find((x) => x.label === "Chapter Test 2 · Questions")!;
      localStorage.clear();
      await f.build();
      return { code: f.code, ids: loadLocalSessionRecords("u1").find((r) => r.id === f.code)?.questionIds };
    };
    expect(await ids(a)).toEqual(await ids(b));
  });

  it("never replaces a graded record", async () => {
    const pack = owned("pack_chapter:real-numbers");
    const { ctx } = mk(pack);
    const f = (await buildPackFiles(ref(pack), ctx)).find((x) => x.label === "Chapter Test 1 · Questions")!;
    await f.build();
    const rec = loadLocalSessionRecords("u1").find((r) => r.id === "PK-M-RN-CT1")!;
    writeSessionRecord(user, { ...rec, status: "graded", marksAwarded: 7, marksTotal: 20 } as SessionRecord);
    await f.build();
    const after = loadLocalSessionRecords("u1").find((r) => r.id === "PK-M-RN-CT1")!;
    expect(after.status).toBe("graded");
    expect(after.marksAwarded).toBe(7);
  });

  it("question-bank section files get no code and no record; signed-out downloads still work", async () => {
    const pack = owned("pack_chapter:real-numbers");
    const { ctx, exportPdf } = mk(pack);
    const sec = (await buildPackFiles(ref(pack), ctx)).find((x) => x.label.startsWith("Section A · Questions"))!;
    expect(sec.code).toBeUndefined();
    await sec.build();
    expect(exportPdf.mock.calls[0][2]).toBeUndefined();
    expect(loadLocalSessionRecords("u1")).toHaveLength(0);

    const { ctx: anon, exportPdf: ex2 } = mk(pack, { user: null });
    const ct = (await buildPackFiles(ref(pack), anon)).find((x) => x.label === "Chapter Test 1 · Questions")!;
    await ct.build();
    expect(ex2).toHaveBeenCalledTimes(1);
    expect(loadLocalSessionRecords("u1")).toHaveLength(0);
  });

  // PACK-SYLLABUS-1 (owner ruling 5 Nov 2026): the three corrected graded papers print `<old code>-V2`. A student holding the OLD
  // PDF keeps grading against the copy saved under the OLD code; a re-download of the corrected paper files a separate record.
  it.each([
    ["pack_chapter:polynomials", "Worksheet · Questions", "PK-M-PO-WS", "worksheet"],
    ["pack_chapter:magnetic-effects-of-electric-current", "Worksheet · Questions", "PK-S-MEOE-WS", "worksheet"],
    ["pack_mock:science", "Mock 5 · Questions", "PK-S-FULL-M5", "full-mock"],
  ] as const)("%s %s: the corrected paper files under %s-V2 and leaves the old-code record alone", async (packId, label, oldCode, surface) => {
    const pack = owned(packId);
    const { ctx, exportPdf } = mk(pack);
    const f = (await buildPackFiles(ref(pack), ctx)).find((x) => x.label === label)!;
    expect(f.code).toBe(`${oldCode}-V2`);
    await f.build();
    expect(exportPdf.mock.calls[0][2]).toBe(`${oldCode}-V2`);
    // The student's existing paper under the OLD code, already graded (modelled on the record just filed).
    const filed = loadLocalSessionRecords("u1").find((r) => r.id === `${oldCode}-V2`)!;
    writeSessionRecord(user, { ...filed, id: oldCode, status: "graded", marksAwarded: 11, marksTotal: 20, questionIds: ["OLD-1", "OLD-2"] } as SessionRecord);
    await f.build(); // a re-download of the corrected paper
    const recs = loadLocalSessionRecords("u1");
    const old = recs.find((r) => r.id === oldCode)!;
    expect(old.status).toBe("graded");
    expect(old.marksAwarded).toBe(11);
    expect(old.questionIds).toEqual(["OLD-1", "OLD-2"]);
    const fresh = recs.find((r) => r.id === `${oldCode}-V2`)!;
    expect(fresh.status).toBe("pending-upload");
    expect(fresh.surface).toBe(surface);
    const row = pendingFromSessionRecords(recs).find((p) => p.code === `${oldCode}-V2`)!;
    expect(row).toBeTruthy();
    expect(row.code.startsWith("PK-")).toBe(true);
    expect(row.href).toContain(`${oldCode}-V2`);
  });
});
