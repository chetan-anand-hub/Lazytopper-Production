// Browser side of scripts/packTemplates/generatePackTemplates.ts (SERVER-PDF-1 PR-A).
//   window.__plan()                  -> every template + every bridge page set the shop can need, as plain JSON (renders nothing)
//   window.__renderTemplate(id)      -> renders ONE template with the REAL pack pipeline (buildPackFiles' own builders + the exporter's
//                                       `template` option); the PDF arrives as a browser download, the measured marks are returned
//   window.__renderBridge(data)      -> pages 2-3 of a file (one buyer variant) as a 2-page PDF, base64
// No auth, no Firestore, no licensee: the licensee is a placeholder and its text is never painted.
// The SAME global stylesheet a buyer's browser has (main.tsx imports it): the Fraunces @font-face, its metric-matched fallback and the
// `* { margin: 0; padding: 0; box-sizing: border-box }` reset the print documents were laid out against.
import "../../src/styles.css";
import { packIdOf, type OwnedPack, type PackSku, type PackSubject } from "../../src/services/packs";
import { buildPackFiles, type BuildContext } from "../../src/lib/packs/buildPackFiles";
import { canonicalJson } from "../../src/lib/packs/packTemplateCore";
import { planAll, planBridges, packUnits, templateIdForPackFile, templateUnits, type PackUnitsDef, type PlanBridge, type PlanFile, type TemplateUnit } from "../../src/lib/packs/packTemplatePlan";
import { PACK_SYLLABUS_EXCLUDED } from "../../src/lib/packs/packContent";
import { PINNED_FONTS } from "../../src/lib/packs/packTemplateFonts";
import { getFiguresForQuestion } from "../../src/data/visualConceptRegistry";
import { printFigureSrc } from "../../src/components/worksheet/printFigures";
import type { TemplateMarks } from "../../src/components/worksheet/worksheetPdfExport";
import type { BridgePagesData } from "../../src/lib/packs/packBridge";

/** What `__renderTemplate` returns: the measured marks, and the digest of the worksheets the exporter was actually handed (see `planPaintedPapers`). */
export interface RenderedTemplate {
  marks: TemplateMarks;
  paintedSha256: string;
}

declare global {
  interface Window {
    __plan?: () => Promise<{ files: PlanFile[]; bridges: PlanBridge[]; packs: PackUnitsDef[] }>;
    __renderTemplate?: (templateId: string) => Promise<RenderedTemplate>;
    __renderBridge?: (data: BridgePagesData) => Promise<string>;
  }
}

/**
 * Every pinned family/weight must be LOADED before anything is rasterised: html2canvas paints with whatever face is ready, and a fresh
 * page's lazily-declared @font-face may not be. A face that did not load fails the render (a template in a fallback font is worse than none).
 */
async function ensureFonts(): Promise<void> {
  for (const f of PINNED_FONTS) {
    const spec = `${f.weight} 16px "${f.family}"`;
    const faces = await document.fonts.load(spec, "Aa0 Real Numbers");
    if (faces.length === 0 || faces.some((x) => x.status !== "loaded")) throw new Error(`font not loaded: ${spec}`);
  }
  await document.fonts.ready;
}

const figureHashes = new Map<string, Promise<string>>();
const hex = (digest: ArrayBuffer): string => Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Text(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
async function sha256OfUrl(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`figure image missing: ${src} (${res.status})`);
  return hex(await crypto.subtle.digest("SHA-256", await res.arrayBuffer()));
}

/** The official figures each file prints (registry lookup by question id, as the print document does) + their image hashes. */
async function figuresOf(f: PlanFile): Promise<NonNullable<PlanFile["figures"]>> {
  const out: NonNullable<PlanFile["figures"]> = [];
  for (const ws of [f.ws, ...f.papers.map((p) => p.ws)]) {
    for (const q of ws?.questions ?? []) {
      for (const fig of getFiguresForQuestion(q.id)) {
        const src = printFigureSrc(fig.filePath);
        if (!figureHashes.has(src)) figureHashes.set(src, sha256OfUrl(src));
        out.push({ questionId: q.id, id: fig.id, filePath: fig.filePath, sha256: await (figureHashes.get(src) as Promise<string>) });
      }
    }
  }
  return out;
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
  for (const f of files) f.figures = await figuresOf(f);
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
  await ensureFonts();
  const mod = await import("../../src/components/worksheet/worksheetPdfExport");
  const unit = unitOf(templateId);
  const ref = packOf(unit);
  const marks = mod.newPackTemplateMarks();
  const painted: unknown[] = []; // every worksheet the exporter is handed, in order (N3: compared with the plan by the generator)
  const owned: OwnedPack = { ...ref, pricePaidInr: 0, paidAt: 0, orderId: "TEMPLATE" };
  const ctx: BuildContext = {
    licensee: { name: "Template", email: "template@lazytopper.com" },
    owned: [owned],
    nowIso: () => NOW_ISO,
    // pages 2-3 are blank placeholders in a template; this switch only makes the file reserve them
    bridge: { paidBoardPass: true },
    exportPdf: (ws, mode, code, opts) => {
      painted.push(ws);
      return mod.exportWorksheetPdf(ws, mode, code, { ...opts, template: { marks } });
    },
    exportSetsPdf: (sets, mode, opts) => {
      for (const x of sets) painted.push(x.ws);
      return mod.exportWorksheetSetsPdf(sets, mode, { ...opts, template: { marks } });
    },
  };
  const files = await buildPackFiles(ref, ctx);
  const file = files.find((f) => templateIdForPackFile(ref.packId, f.id) === templateId);
  if (!file) throw new Error(`unknown template ${templateId}`);
  await file.build();
  return { marks, paintedSha256: await sha256Text(canonicalJson(painted)) };
};

window.__renderBridge = async (data) => {
  await ensureFonts();
  const [{ default: html2canvas }, { jsPDF }, mod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
    import("../../src/components/worksheet/worksheetPdfExport"),
  ]);
  const pages = await mod.renderBridgePages(data, html2canvas, 30000, true);
  if (pages.length !== mod.TEMPLATE_BRIDGE_PAGES) throw new Error("bridge_pages_missing");
  const pdf = new jsPDF(mod.pdfCtorOptions(true));
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(p.jpeg, "JPEG", 0, 0, 210, 297);
    for (const l of p.links) pdf.link(l.x, l.y, l.w, l.h, { url: l.url });
  });
  const uri = pdf.output("datauristring");
  return uri.slice(uri.indexOf("base64,") + 7);
};
