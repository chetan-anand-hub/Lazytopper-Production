// Browser side of scripts/packPreviews/generatePackPreviews.ts: window.__genPreview(id, "questions" | "answers") saves one REAL pack PDF
// (the paid pipeline: buildPackFiles' own file builders + exportWorksheetPdf) for the preview set <id>.
import { PACK_PREVIEWS, previewChapterSlug } from "../../src/lib/packs/packPreviews";
import { chapterFiles, cbqFiles, mockFiles, type PackFile } from "../../src/lib/packs/buildPackFiles";
import { chaptersOfSubject, packIdOf, type OwnedPack, type PackSubject } from "../../src/services/packs";

declare global {
  interface Window {
    __previewIds?: string[];
    __genPreview?: (id: string, which: "questions" | "answers") => Promise<string>;
    /** Every string of the worksheet the last preview PDF was made from (for the syllabus-guard scan). */
    __lastText?: string;
  }
}

window.__previewIds = PACK_PREVIEWS.map((s) => s.id);
window.__genPreview = async (id, which) => {
  const spec = PACK_PREVIEWS.find((s) => s.id === id);
  if (!spec) throw new Error(`unknown preview ${id}`);
  const mod = await import("../../src/components/worksheet/worksheetPdfExport");
  const filename = `${id}-${which}.pdf`;
  const subject: PackSubject = spec.subject;
  const slug = previewChapterSlug(spec) ?? chaptersOfSubject(subject)[0];
  const target = spec.sku === "pack_chapter" ? slug : spec.sku === "pack_bundle" ? "all" : subject;
  const packId = packIdOf(spec.sku, target);
  // A fixed, plainly fake licensee: the same one the earlier hand-made previews carried ("Sample Student", order SAMPLE).
  const fallback: OwnedPack = { packId, sku: spec.sku, target, pricePaidInr: 0, paidAt: Date.parse("2026-10-25T00:00:00+05:30"), orderId: "SAMPLE" };
  const ctx = {
    licensee: { name: "Sample Student", email: "sample@lazytopper.com" },
    owned: [fallback],
    nowIso: () => "2026-10-25T00:00:00.000Z",
    exportPdf: (ws: Parameters<typeof mod.exportWorksheetPdf>[0], mode: "questions" | "answers", code?: string, opts?: Parameters<typeof mod.exportWorksheetPdf>[3]) => {
      window.__lastText = JSON.stringify(ws);
      return mod.exportWorksheetPdf(ws, mode, code, { ...opts, filename });
    },
  };
  const files: PackFile[] =
    spec.sku === "pack_mock"
      ? await mockFiles(subject, packId, spec.sku, ctx, fallback)
      : spec.sku === "pack_cbq"
      ? await cbqFiles(subject, packId, spec.sku, ctx, fallback)
      : await chapterFiles(slug, packId, spec.sku, ctx, fallback);
  const suffix = which === "questions" ? spec.questionsSuffix : spec.answersSuffix;
  const hit = files.find((f) => f.id.endsWith(`|${suffix}`) && (spec.sku === "pack_mock" || f.id.includes(`|${slug}|`)));
  if (!hit) throw new Error(`preview ${id}: no pack file ends with ${suffix}`);
  await hit.build();
  return filename;
};
