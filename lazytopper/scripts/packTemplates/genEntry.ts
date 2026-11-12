// Browser side of scripts/packTemplates/generatePackTemplates.ts (SERVER-PDF-1 PR-A).
//   window.__plan()                  -> every template + every bridge page set the shop can need, as plain JSON (renders nothing)
//   window.__renderTemplate(id)      -> renders ONE template with the REAL pack pipeline (buildPackFiles' own builders + the exporter's
//                                       `template` option); the PDF arrives as a browser download, the measured marks are returned
//   window.__renderBridge(data)      -> pages 2-3 of a file (one buyer variant) as a 2-page PDF, base64
// No auth, no Firestore, no licensee: the licensee is a placeholder and its text is never painted.
import { packIdOf, type OwnedPack, type PackSku, type PackSubject } from "../../src/services/packs";
import { buildPackFiles, type BuildContext } from "../../src/lib/packs/buildPackFiles";
import { planAll, planBridges, packUnits, templateIdForPackFile, templateUnits, type PackUnitsDef, type PlanBridge, type PlanFile, type TemplateUnit } from "../../src/lib/packs/packTemplatePlan";
import { PACK_SYLLABUS_EXCLUDED } from "../../src/lib/packs/packContent";
import type { TemplateMarks } from "../../src/components/worksheet/worksheetPdfExport";
import type { BridgePagesData } from "../../src/lib/packs/packBridge";

declare global {
  interface Window {
    __plan?: () => Promise<{ files: PlanFile[]; bridges: PlanBridge[]; packs: PackUnitsDef[] }>;
    __renderTemplate?: (templateId: string) => Promise<TemplateMarks>;
    __renderBridge?: (data: BridgePagesData) => Promise<string>;
  }
}

/** The drawn papers carry this stamp; the printed dates are blank in a template, so the value never reaches a page. */
const NOW_ISO = "2026-01-01T00:00:00.000Z";

function unitOf(templateId: string): TemplateUnit {
  const head = templateId.split("|")[0];
  if (head.startsWith("cbq-")) return { kind: "cbq", key: head.slice(4) as PackSubject };
  if (head.startsWith("mock-")) return { kind: "mocks", key: head.split("-")[1] as PackSubject };
  return { kind: "chapter", key: head };
}

function packOf(unit: TemplateUnit): { packId: string; sku: PackSku; target: string } {
  const sku: PackSku = unit.kind === "chapter" ? "pack_chapter" : unit.kind === "mocks" ? "pack_mock" : "pack_cbq";
  return { packId: packIdOf(sku, unit.key), sku, target: unit.key };
}

window.__plan = async () => {
  const files = await planAll(templateUnits());
  // Rows judged OUT of the 2026-27 syllabus never reach a pack file (packContent); a template that held one is refused here too.
  for (const f of files) {
    for (const ws of [f.ws, ...f.papers.map((p) => p.ws)]) {
      for (const q of ws?.questions ?? []) {
        if (PACK_SYLLABUS_EXCLUDED.has(q.id)) throw new Error(`template ${f.templateId} holds syllabus-excluded row ${q.id}`);
      }
    }
  }
  return { files, bridges: await planBridges(), packs: packUnits() };
};

window.__renderTemplate = async (templateId) => {
  const mod = await import("../../src/components/worksheet/worksheetPdfExport");
  const unit = unitOf(templateId);
  const ref = packOf(unit);
  const marks = mod.newPackTemplateMarks();
  const owned: OwnedPack = { ...ref, pricePaidInr: 0, paidAt: 0, orderId: "TEMPLATE" };
  const ctx: BuildContext = {
    licensee: { name: "Template", email: "template@lazytopper.com" },
    owned: [owned],
    nowIso: () => NOW_ISO,
    // pages 2-3 are blank placeholders in a template; this switch only makes the file reserve them
    bridge: { paidBoardPass: true },
    exportPdf: (ws, mode, code, opts) => mod.exportWorksheetPdf(ws, mode, code, { ...opts, template: { marks } }),
    exportSetsPdf: (sets, mode, opts) => mod.exportWorksheetSetsPdf(sets, mode, { ...opts, template: { marks } }),
  };
  const files = await buildPackFiles(ref, ctx);
  const file = files.find((f) => templateIdForPackFile(ref.packId, f.id) === templateId);
  if (!file) throw new Error(`unknown template ${templateId}`);
  await file.build();
  return marks;
};

window.__renderBridge = async (data) => {
  const [{ default: html2canvas }, { jsPDF }, mod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
    import("../../src/components/worksheet/worksheetPdfExport"),
  ]);
  const pages = await mod.renderBridgePages(data, html2canvas, 30000);
  if (pages.length !== mod.TEMPLATE_BRIDGE_PAGES) throw new Error("bridge_pages_missing");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(p.jpeg, "JPEG", 0, 0, 210, 297);
    for (const l of p.links) pdf.link(l.x, l.y, l.w, l.h, { url: l.url });
  });
  const uri = pdf.output("datauristring");
  return uri.slice(uri.indexOf("base64,") + 7);
};

