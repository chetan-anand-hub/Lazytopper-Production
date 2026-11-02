/**
 * packSampleBuild - makes ONE free sample PDF (PACK-SAMPLE-1). HEAVY and LAZY-ONLY: it reaches the question bank, html2canvas and
 * jsPDF, so it is imported only by the generator page (`scripts/samples/gen.html`) and the tests, never by the app.
 *
 * It is the paid pipeline, not a copy of it: the real file list of the pack comes from `chapterFiles` / `mockFiles` / `cbqFiles`
 * (the functions `buildPackFiles` calls), the page is built by `makeFile(...).build()` and rendered by `exportWorksheetPdf`. The
 * only differences are the ones a sample needs: the exporter is given `sample` (page 1 only, "Sample" marking, the price line)
 * and NO buyer, and the pack's own cover is dropped.
 */
import { chapterFiles, cbqFiles, mockFiles, type PackFile } from "./buildPackFiles";
import { sampleLine, sampleMeta, type PackSampleSpec } from "./packSamples";
import { chaptersOfSubject, packIdOf, PACK_PRICE_INR, type PackSubject } from "../../services/packs";

/** The real file of the pack the sample page is taken from. */
export async function pickSampleFile(spec: PackSampleSpec, exportPdf: NonNullable<Parameters<typeof chapterFiles>[3]["exportPdf"]>): Promise<PackFile> {
  const subject: PackSubject = spec.target === "science" ? "science" : "maths";
  const chapter = chaptersOfSubject(subject)[spec.chapterIndex] ?? chaptersOfSubject(subject)[0];
  const packTarget = spec.sku === "pack_chapter" ? chapter : spec.sku === "pack_bundle" ? "all" : subject;
  const packId = packIdOf(spec.sku, packTarget);
  const ctx = {
    // buildPackFiles refuses to build without a licensee e-mail; the sample exporter below drops it, so nothing is printed.
    licensee: { name: "LazyTopper sample", email: "sample@lazytopper.com" },
    owned: [],
    exportPdf,
  };
  const files =
    spec.sku === "pack_mock"
      ? await mockFiles(subject, packId, spec.sku, ctx)
      : spec.sku === "pack_cbq"
      ? await cbqFiles(subject, packId, spec.sku, ctx)
      : await chapterFiles(chapter, packId, spec.sku, ctx);
  const hit = files.find((f) => f.id.endsWith(`|${spec.fileSuffix}`));
  if (!hit) throw new Error(`sample ${spec.id}: no pack file ends with ${spec.fileSuffix}`);
  return hit;
}

/** Builds the sample and has the browser save `<id>.pdf`; resolves to that file name. */
export async function buildPackSample(spec: PackSampleSpec): Promise<string> {
  const mod = await import("../../components/worksheet/worksheetPdfExport");
  const line = sampleLine(spec.sku, spec.target);
  const filename = `${spec.id}.pdf`;
  const exportPdf = (ws: Parameters<typeof mod.exportWorksheetPdf>[0], mode: "questions" | "answers", code?: string) =>
    mod.exportWorksheetPdf(ws, mode, code, { filename, sample: { line, meta: sampleMeta(spec.sku, spec.target, PACK_PRICE_INR[spec.sku]) } });
  const file = await pickSampleFile(spec, exportPdf);
  await file.build();
  return filename;
}
