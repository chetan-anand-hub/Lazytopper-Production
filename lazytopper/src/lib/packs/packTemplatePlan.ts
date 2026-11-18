/**
 * packTemplatePlan - SERVER-PDF-1 PR-A. Which pack PDFs are made once in CI ("templates"), and how each is identified.
 *
 * A pack's files are NOT per pack: a chapter's files are the same whether the buyer owns the Chapter Pack, the Subject Pack or the
 * Bundle (only the page 2-3 header and the printed order id differ, and both are handled outside the template). So the plan is made
 * of 30 UNITS: 26 chapters, 2 mock sets, 2 CBQ sets, and every pack is a concatenation of units.
 *
 *   templateId  the file's id with its pack stripped: `real-numbers|sec-A-1-questions`, `mock-maths-3-answers`,
 *               `cbq-maths|pack_cbq:maths|intro`-style ids are avoided: a CBQ file is `cbq-<subject>|<tail>`.
 *   groupId     what "Download all (ZIP)" zips: one chapter, one subject's mocks, one CBQ chapter (+ the CBQ start page).
 *
 * PURE data: reading the plan renders nothing and needs no licensee. The generator (scripts/packTemplates) renders each entry; the
 * server (PR-B) reads the manifest built from it. `templateIdForPackFile` is the one rule both sides use to map a buyer's file id.
 */
import { chaptersOfSubject, PACK_CHAPTER_SLUGS, PACK_SUBJECTS, packIdOf, type OwnedPack, type PackSku } from "../../services/packs";
import { buildPackFiles, type PackRef } from "./buildPackFiles";
import { templateIdForPackFile, type PackUnitsDef, type PlanBridge, type PlanFile, type PlanPaper, type TemplateUnit } from "./packTemplateCore";
export * from "./packTemplateCore";

/** The 30 units, in the order buildPackFiles lists them: chapters of Maths then Science, then each subject's mocks, then CBQ. */
export function templateUnits(): TemplateUnit[] {
  const out: TemplateUnit[] = [];
  for (const slug of PACK_CHAPTER_SLUGS) out.push({ kind: "chapter", key: slug });
  for (const s of PACK_SUBJECTS) out.push({ kind: "mocks", key: s });
  for (const s of PACK_SUBJECTS) out.push({ kind: "cbq", key: s });
  return out;
}

function packRefOf(unit: TemplateUnit): PackRef {
  const sku: PackSku = unit.kind === "chapter" ? "pack_chapter" : unit.kind === "mocks" ? "pack_mock" : "pack_cbq";
  return { packId: packIdOf(sku, unit.key), sku, target: unit.key };
}

/** The packs of the shop, as {packId, units}: a pack's files are its units' files in this order. */
export function packUnits(): PackUnitsDef[] {
  const out: PackUnitsDef[] = [];
  const add = (sku: Exclude<PackSku, "test_series">, target: string, units: TemplateUnit[]) => out.push({ packId: packIdOf(sku, target), sku, target, units });
  for (const slug of PACK_CHAPTER_SLUGS) add("pack_chapter", slug, [{ kind: "chapter", key: slug }]);
  for (const s of PACK_SUBJECTS) add("pack_mock", s, [{ kind: "mocks", key: s }]);
  for (const s of PACK_SUBJECTS) {
    add("pack_subject", s, [...chaptersOfSubject(s).map((slug): TemplateUnit => ({ kind: "chapter", key: slug })), { kind: "mocks", key: s }]);
  }
  add("pack_bundle", "all", [...PACK_CHAPTER_SLUGS.map((slug): TemplateUnit => ({ kind: "chapter", key: slug })), ...PACK_SUBJECTS.map((s): TemplateUnit => ({ kind: "mocks", key: s }))]);
  for (const s of PACK_SUBJECTS) add("pack_cbq", s, [{ kind: "cbq", key: s }]);
  return out;
}

function groupOf(unit: TemplateUnit, tail: string): string {
  if (unit.kind === "chapter") return unit.key;
  if (unit.kind === "mocks") return `mocks-${unit.key}`;
  const first = tail.split("|")[0];
  return first === "intro" ? `cbq-${unit.key}-start` : `cbq-${unit.key}-${first}`;
}

/** A file's inputs as plain data. `owned` is irrelevant to a template (the order id is stamped per buyer), so none is passed. */
export async function planUnit(unit: TemplateUnit): Promise<PlanFile[]> {
  const ref = packRefOf(unit);
  const placeholder: OwnedPack = { packId: ref.packId, sku: ref.sku, target: ref.target, pricePaidInr: 0, paidAt: 0, orderId: "TEMPLATE" };
  const files = await buildPackFiles(ref, {
    licensee: { name: "Template", email: "template@lazytopper.com" },
    owned: [placeholder],
    exportPdf: async () => "",
    exportSetsPdf: async () => "",
    bridge: { paidBoardPass: true },
  });
  return files.map((f) => {
    const templateId = templateIdForPackFile(ref.packId, f.id) as string;
    const tail = f.id.slice(ref.packId.length + 1);
    const papers: PlanPaper[] = f.source.papers.map((p) => {
      const { code, ...reg } = p.reg;
      return { code, reg, ws: p.ws() };
    });
    return {
      templateId,
      unit,
      groupId: groupOf(unit, tail),
      group: f.group,
      label: f.label,
      filename: f.filename,
      mode: f.source.mode,
      codes: papers.map((p) => p.code),
      ...(f.source.cover ? { cover: f.source.cover } : {}),
      hasBridge: Boolean(f.source.bridgeData),
      papers,
      ...(f.source.ws && papers.length === 0 ? { ws: f.source.ws() } : {}),
    } as PlanFile;
  });
}

export async function planAll(units: readonly TemplateUnit[] = templateUnits()): Promise<PlanFile[]> {
  const out: PlanFile[] = [];
  for (const u of units) out.push(...(await planUnit(u)));
  return out;
}

/** The bridge data of each file as each of the 33 packs shows it (a chapter file's header reads "Maths Subject Pack" inside the Subject Pack). */
export async function planBridges(): Promise<PlanBridge[]> {
  const out: PlanBridge[] = [];
  for (const p of packUnits()) {
    const ref: PackRef = { packId: p.packId, sku: p.sku, target: p.target };
    const placeholder: OwnedPack = { packId: p.packId, sku: p.sku, target: p.target, pricePaidInr: 0, paidAt: 0, orderId: "TEMPLATE" };
    const files = await buildPackFiles(ref, {
      licensee: { name: "Template", email: "template@lazytopper.com" },
      owned: [placeholder],
      exportPdf: async () => "",
      exportSetsPdf: async () => "",
      bridge: { paidBoardPass: true },
    });
    for (const f of files) {
      const templateId = templateIdForPackFile(p.packId, f.id);
      if (templateId && f.source.bridgeData) out.push({ packId: p.packId, templateId, data: f.source.bridgeData(false) });
    }
  }
  return out;
}
