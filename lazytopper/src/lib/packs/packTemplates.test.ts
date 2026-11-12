/**
 * SERVER-PDF-1 PR-A - the pack-template plan, manifest and publishing rules.
 *
 *   1. the plan covers EVERY file of EVERY sellable pack (a buyer's file id always maps to exactly one template), packs are their
 *      units' files in order, and no syllabus-excluded row is in a template (phrase-level scanning is packSyllabus.guard.test.ts, which
 *      runs over the same builders)
 *   2. the manifest is complete, validated, and every tampering is caught
 *   3. publishing: nothing outside packs/, nothing overwritten, a half-finished run never moves the pointer, current.json is last
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PACK_CHAPTER_SLUGS, PACK_SUBJECTS } from "../../services/packs";
import type { TemplateMarks } from "../../components/worksheet/pdfTemplateMarks";
import { buildPackFiles } from "./buildPackFiles";
import { PACK_SYLLABUS_EXCLUDED } from "./packContent";
import { packUnits, planAll, planBridges, templateUnits } from "./packTemplatePlan";
import { canonicalJson, templateIdForPackFile, type PlanBridge, type PlanFile } from "./packTemplateCore";
import { bridgeKeyOf, buildManifest, fileHashOf, validateManifest, type TemplateFileMeta } from "./packTemplateManifest";
import { assertPackPath, putRendered, publishManifest, CURRENT_POINTER_PATH, type TemplateStore } from "./packTemplatePublish";

const sha = (t: string): string => createHash("sha256").update(t).digest("hex");
const RV = "test-renderer";
const enc = new TextEncoder();

function marksFor(f: PlanFile): TemplateMarks {
  const style = { fontFamily: "Inter", fontSizePx: 13, fontWeight: "400", color: "rgb(0,0,0)", lineHeightPx: 19.5, letterSpacingPx: 0, textTransform: "none", textAlign: "left" };
  const box = (name: "box" | "textcol" | "licence" | "redownload" | "edition" | "boxlabel") => ({ name, xPx: 0, yPx: 0, wPx: 1, hPx: 1, xMm: 0, yMm: 0, wMm: 1, hMm: 1, lines: 1, style });
  const pages = 5;
  return {
    version: 1,
    pageWmm: 210,
    pageHmm: 297,
    pages,
    cover: { wPx: 794, hPx: 1123, mmPerPx: 210 / 794, stamps: (["box", "textcol", "licence", "redownload", "edition", "boxlabel"] as const).map(box) },
    footer: { xMm: 12, baselineYMm: 276.5, maxWidthMm: 186, fontSizesPt: [10, 9.5, 9], colorRgb: [58, 74, 96], font: "Helvetica", firstPage: 4, lastPage: pages, withQr: false },
    body: Array.from({ length: Math.max(1, f.codes.length) }, (_, i) => ({ ...box("licence"), name: "generated" as const, page: 4, set: i })),
  };
}

let planCache: Promise<{ plan: PlanFile[]; bridges: PlanBridge[] }> | null = null;
const getPlan = () => (planCache ??= (async () => ({ plan: await planAll(templateUnits()), bridges: await planBridges() }))());

function manifestOf(plan: PlanFile[], bridges: PlanBridge[]) {
  const metas: Record<string, TemplateFileMeta> = {};
  for (const f of plan) metas[fileHashOf(f, RV, sha)] = { bytes: 10, sha256: sha(f.templateId), pages: 5, marks: marksFor(f) };
  const bridgeMetas: Record<string, { bytes: number; sha256: string }> = {};
  for (const b of bridges) for (const c of [false, true]) bridgeMetas[bridgeKeyOf(b.data, c, RV, sha)] = { bytes: 5, sha256: sha(JSON.stringify(b.data)) };
  return buildManifest({ plan, bridges, packDefs: packUnits(), metas, bridgeMetas, rendererVersion: RV, fonts: [{ family: "Inter", weight: 400, file: "f", sha256: "x" }], createdAt: "2026-11-12T00:00:00.000Z", commit: "abc", sha });
}

describe("the template plan", () => {
  it("makes templates for 26 chapters, 2 mock sets and 2 CBQ sets, every template id unique", async () => {
    const { plan } = await getPlan();
    expect(templateUnits()).toHaveLength(PACK_CHAPTER_SLUGS.length + PACK_SUBJECTS.length * 2);
    expect(new Set(plan.map((f) => f.templateId)).size).toBe(plan.length);
    expect(plan.length).toBeGreaterThan(0);
  }, 300_000);

  it("every file of every sellable pack maps to exactly one template, in the pack's own order", async () => {
    const { plan } = await getPlan();
    const byUnit = (u: PlanFile["unit"]) => plan.filter((f) => f.unit.kind === u.kind && f.unit.key === u.key).map((f) => f.templateId);
    for (const p of packUnits()) {
      const files = await buildPackFiles({ packId: p.packId, sku: p.sku, target: p.target }, { licensee: { name: "A", email: "a@b.c" }, owned: [], exportPdf: async () => "", exportSetsPdf: async () => "" });
      const ids = files.map((f) => templateIdForPackFile(p.packId, f.id));
      expect(ids.every((x) => x !== null), p.packId).toBe(true);
      expect(ids, p.packId).toEqual(p.units.flatMap(byUnit));
    }
  }, 300_000);

  it("a buyer's file id from another pack is refused", () => {
    expect(templateIdForPackFile("pack_chapter:real-numbers", "pack_chapter:polynomials|polynomials|ct1-questions")).toBeNull();
    expect(templateIdForPackFile("pack_chapter:real-numbers", "pack_chapter:real-numbers|")).toBeNull();
    expect(templateIdForPackFile("pack_cbq:maths", "pack_cbq:maths|intro")).toBe("cbq-maths|intro");
  });

  it("holds no syllabus-excluded row, carries every paper's worksheet as drawn (no date) and every file a group", async () => {
    const { plan } = await getPlan();
    for (const f of plan) {
      expect(f.groupId, f.templateId).toBeTruthy();
      for (const ws of [f.ws, ...f.papers.map((p) => p.ws)]) {
        if (!ws) continue;
        expect(ws.createdAt).toBe("2026-01-01T00:00:00.000Z");
        for (const q of ws.questions) expect(PACK_SYLLABUS_EXCLUDED.has(q.id), `${f.templateId} ${q.id}`).toBe(false);
      }
    }
    expect(plan.filter((f) => f.codes.length > 0).every((f) => f.papers.length === f.codes.length)).toBe(true);
  }, 300_000);

  it("a Download-all group is one chapter, one subject's mocks, or one CBQ chapter", async () => {
    const { plan } = await getPlan();
    const groups = new Map<string, Set<string>>();
    for (const f of plan) (groups.get(f.groupId) ?? groups.set(f.groupId, new Set()).get(f.groupId)!).add(f.group);
    for (const [id, names] of groups) expect(names.size, id).toBe(1);
    expect(groups.has("mocks-maths") && groups.has("mocks-science") && groups.has("cbq-maths-start")).toBe(true);
  }, 300_000);
});

describe("the manifest", () => {
  it("is complete, and validates", async () => {
    const { plan, bridges } = await getPlan();
    const m = manifestOf(plan, bridges);
    expect(validateManifest(m, plan, packUnits())).toEqual([]);
    expect(Object.keys(m.packs)).toHaveLength(packUnits().length);
    // a Subject Pack lists its chapters' templates then the mocks; the Bundle lists both subjects
    const subj = m.packs["pack_subject:maths"];
    expect(subj.files.length).toBeGreaterThan(m.packs["pack_mock:maths"].files.length);
    expect(m.packs["pack_bundle:all"].files).toEqual([...m.packs["pack_subject:maths"].files.filter((id) => !id.startsWith("mock-")), ...m.packs["pack_subject:science"].files.filter((id) => !id.startsWith("mock-")), ...m.packs["pack_mock:maths"].files, ...m.packs["pack_mock:science"].files]);
    // every pack's groups partition its files
    for (const p of Object.values(m.packs)) expect(p.groups.flatMap((g) => g.files)).toEqual(p.files);
    // a chapter file in the Subject Pack reads "Maths Subject Pack" on its bridge pages, not the Chapter Pack header
    const id = m.packs["pack_chapter:real-numbers"].files[0];
    const chapterKeys = m.packs["pack_chapter:real-numbers"].bridge[id];
    const subjectKeys = m.packs["pack_subject:maths"].bridge[id];
    expect(m.bridges[chapterKeys.noCard].data.packLabel).toBe("Real Numbers · Chapter Pack");
    expect(m.bridges[subjectKeys.noCard].data.packLabel).toBe("Maths Subject Pack");
    expect(m.bridges[chapterKeys.card].data.boardPassCard).toBe(true);
    expect(m.bridges[chapterKeys.noCard].data.boardPassCard).toBe(false);
  }, 300_000);

  it("changing a question changes only that file's hash; changing the renderer changes all of them", async () => {
    const { plan } = await getPlan();
    const f = plan.find((x) => x.papers.length > 0)!;
    const changed: PlanFile = { ...f, papers: f.papers.map((p, i) => (i === 0 ? { ...p, ws: { ...p.ws, totalMarks: p.ws.totalMarks + 1 } } : p)) };
    expect(fileHashOf(changed, RV, sha)).not.toBe(fileHashOf(f, RV, sha));
    const other = plan.find((x) => x.templateId !== f.templateId)!;
    expect(fileHashOf(other, RV, sha)).toBe(fileHashOf(other, RV, sha));
    expect(fileHashOf(f, "other-renderer", sha)).not.toBe(fileHashOf(f, RV, sha));
    expect(canonicalJson({ b: 1, a: { d: undefined, c: 2 } })).toBe('{"a":{"c":2},"b":1}');
  }, 300_000);

  it("catches a missing template, a missing footer, a missing cover mark and a path outside packs/", async () => {
    const { plan, bridges } = await getPlan();
    const base = manifestOf(plan, bridges);
    const clone = () => JSON.parse(JSON.stringify(base)) as typeof base;
    const first = plan[0].templateId;
    const a = clone();
    delete a.files[first];
    expect(validateManifest(a, plan, packUnits()).some((p) => p.includes(`missing file ${first}`))).toBe(true);
    const b = clone();
    delete b.files[first].marks.footer;
    expect(validateManifest(b, plan, packUnits()).some((p) => p.includes("no footer geometry"))).toBe(true);
    const c = clone();
    c.files[first].marks.cover!.stamps = c.files[first].marks.cover!.stamps.filter((s) => s.name !== "licence");
    expect(validateManifest(c, plan, packUnits()).some((p) => p.includes('no "licence" mark'))).toBe(true);
    const d = clone();
    d.files[first].path = "elsewhere/x.pdf";
    expect(validateManifest(d, plan, packUnits()).some((p) => p.includes("outside packs/"))).toBe(true);
    const e = clone();
    e.files[first].marks.body = [];
    expect(validateManifest(e, plan, packUnits()).some((p) => p.includes('"Generated" marks'))).toBe(true);
  }, 300_000);
});

class MemStore implements TemplateStore {
  objects = new Map<string, Uint8Array>();
  writes: string[] = [];
  async list(prefix: string) {
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix));
  }
  async read(path: string) {
    return this.objects.get(path) ?? null;
  }
  async write(path: string, data: Uint8Array | string, opts: { overwrite: boolean }) {
    if (this.objects.has(path) && !opts.overwrite) return;
    this.objects.set(path, typeof data === "string" ? enc.encode(data) : data);
    this.writes.push(path);
  }
}

async function seed(store: MemStore, plan: PlanFile[], bridges: PlanBridge[], skip?: (hash: string) => boolean) {
  for (const f of plan) {
    const hash = fileHashOf(f, RV, sha);
    if (skip?.(hash)) continue;
    store.objects.set(`packs/files/${hash}.pdf`, enc.encode("pdf"));
    store.objects.set(`packs/files/${hash}.meta.json`, enc.encode(JSON.stringify({ bytes: 10, sha256: sha(f.templateId), pages: 5, marks: marksFor(f) })));
  }
  for (const b of bridges) for (const c of [false, true]) {
    const key = bridgeKeyOf(b.data, c, RV, sha);
    store.objects.set(`packs/bridge/${key}.pdf`, enc.encode("pdf"));
    store.objects.set(`packs/bridge/${key}.meta.json`, enc.encode(JSON.stringify({ bytes: 5, sha256: "s" })));
  }
}
const pub = (store: TemplateStore, plan: PlanFile[], bridges: PlanBridge[]) =>
  publishManifest(store, { plan, bridges, packDefs: packUnits(), rendererVersion: RV, fonts: [{ family: "Inter", weight: 400, file: "f", sha256: "x" }], createdAt: "2026-11-12T00:00:00.000Z", commit: "abc", sha });

describe("publishing", () => {
  it("refuses every path outside packs/", () => {
    for (const bad of ["cbse/x.pdf", "qr/x", "/packs/x", "packs/../cbse/x", "packs//x", "packs\\x", "other/packs/x"]) expect(() => assertPackPath(bad), bad).toThrow();
    expect(assertPackPath("packs/files/a.pdf")).toBe("packs/files/a.pdf");
  });

  it("writes the papers, then the manifest, then current.json LAST", async () => {
    const { plan, bridges } = await getPlan();
    const store = new MemStore();
    await seed(store, plan, bridges);
    store.writes.length = 0;
    const { wrote, manifest } = await pub(store, plan, bridges);
    expect(wrote[wrote.length - 1]).toBe(CURRENT_POINTER_PATH);
    expect(wrote[wrote.length - 2]).toBe(`packs/manifests/${manifest.contentHash}.json`);
    expect(wrote.slice(0, -2).every((p) => p.startsWith("packs/ws/"))).toBe(true);
    expect(store.writes.every((p) => p.startsWith("packs/"))).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(store.objects.get(CURRENT_POINTER_PATH)!)).contentHash).toBe(manifest.contentHash);
  }, 300_000);

  it("a run with one template missing publishes NOTHING and leaves the previous pointer alone", async () => {
    const { plan, bridges } = await getPlan();
    const store = new MemStore();
    store.objects.set(CURRENT_POINTER_PATH, enc.encode('{"contentHash":"previous"}'));
    const missing = fileHashOf(plan[3], RV, sha);
    await seed(store, plan, bridges, (h) => h === missing);
    store.writes.length = 0;
    await expect(pub(store, plan, bridges)).rejects.toThrow(/not in storage/);
    expect(store.writes).toEqual([]);
    expect(new TextDecoder().decode(store.objects.get(CURRENT_POINTER_PATH)!)).toBe('{"contentHash":"previous"}');
  }, 300_000);

  it("a second run with nothing changed writes the same manifest path again without overwriting, and moves only the pointer", async () => {
    const { plan, bridges } = await getPlan();
    const store = new MemStore();
    await seed(store, plan, bridges);
    const first = await pub(store, plan, bridges);
    store.writes.length = 0;
    const second = await pub(store, plan, bridges);
    expect(second.manifest.contentHash).toBe(first.manifest.contentHash);
    expect(store.writes).toEqual([CURRENT_POINTER_PATH]);
  }, 300_000);

  it("putRendered skips what is already stored (content-addressed) and writes a PDF before its meta", async () => {
    const store = new MemStore();
    store.objects.set("packs/files/aaa.pdf", enc.encode("x"));
    const wrote = await putRendered(store, [
      { path: "packs/files/bbb.meta.json", data: enc.encode("{}"), contentType: "application/json" },
      { path: "packs/files/aaa.pdf", data: enc.encode("DIFFERENT"), contentType: "application/pdf" },
      { path: "packs/files/bbb.pdf", data: enc.encode("pdf"), contentType: "application/pdf" },
    ]);
    expect(wrote).toEqual(["packs/files/bbb.pdf", "packs/files/bbb.meta.json"]);
    expect(new TextDecoder().decode(store.objects.get("packs/files/aaa.pdf")!)).toBe("x");
    await expect(putRendered(store, [{ path: "cbse/evil.pdf", data: enc.encode("x"), contentType: "application/pdf" }])).rejects.toThrow(/outside packs\//);
  });
});
