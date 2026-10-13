// src/services/shrinkPdf.ts
//
// UPLOAD-SHRINK-1 PR-1 — a big SCANNED PDF is shrunk ON THE STUDENT'S DEVICE before it travels.
//
// ★ THE RULE (owner): NO LOSS IN WHAT THE GRADER CAN READ. Every decision below errs toward sending the
// original. A shrink that cannot be shown to be safe is not done; the file goes up as it is, and a failure
// here NEVER blocks an upload.
//
// WHAT IT DOES
//   - Only a picked PDF larger than SHRINK_TRIGGER_BYTES is considered. Everything else returns untouched.
//   - A TYPED PDF (it has a real text layer) is left alone: detect reads that layer on the server and it is
//     exact (checkSolution.cjs `extractPdfText`). The one exception is a typed PDF over the 7 MB ceiling, which
//     is rasterised rather than refused (telemetry says the text layer was dropped).
//   - A SCANNED PDF is rendered page by page with pdf.js, then re-encoded through the EXISTING
//     `assemblePagesPdf` pipeline on a stricter ladder: long edge >= 2000 px and JPEG quality >= 0.75, walking
//     down from 2400 px / 0.85 only until the file is under SHRINK_TARGET_BYTES.
//   - Floor reached and still over the target: the floor version is sent only if it is SMALLER than the
//     original, otherwise the original (the picker guard still enforces the 7 MB ceiling on it).
//   - A hard time budget (SHRINK_BUDGET_MS) and a per-page projection after page 1 send the original instead
//     of making a slow phone wait; telemetry records `shrink_timeout`.
//
// ★ WHY THE TRIGGER IS 3 MB AND NOT 2 MB (cofounder D144: the shrink must save more bytes than it costs).
// pdf.js is fetched only on this path. Measured transfer sizes of the LEGACY build (the one that runs on old
// Android WebViews): core 523,774 B raw / 151,438 B gzip / 126,707 B brotli, worker 1,321,307 B raw /
// 392,144 B gzip / 322,590 B brotli — about 0.54 MB gzip (0.45 MB brotli) before jsPDF, which the page tray
// already lazy-loads. A shrunk file lands near SHRINK_TARGET_BYTES (2 MB), so the saving is about
// (size - 2 MB). For that to beat ~0.6 MB of code the file must be over ~2.6 MB; 3 MB leaves margin. The
// arithmetic is pinned in shrinkPdf.test.ts.
//
// ★ THE TEXT-LAYER PROBE NEEDS THE WORKER. pdf.js parses in its worker, so `getTextContent` cannot run without
// it. To keep typed PDFs from fetching 1.3 MB at all in the common case, `classifyPdfBytes` first scans the raw
// bytes: a PDF that names a /Font is typed, and is returned untouched without loading pdf.js. Only a PDF with
// no /Font in its readable bytes (a scan, or one whose objects sit in compressed streams) loads pdf.js, and the
// page-1 probe then decides.

import { MAX_UPLOAD_PDF_BYTES } from "./uploadLimits";
import {
  assemblePagesPdf,
  PagesTooLargeError,
  canvasReencoder,
  type PageReencoder,
  type PdfPageInput,
} from "./assemblePagesPdf";

/** Below this a picked PDF is not touched: the code to shrink it costs more to download than the bytes saved. */
export const SHRINK_TRIGGER_BYTES = 3 * 1024 * 1024;
/** The size the shrink aims under. */
export const SHRINK_TARGET_BYTES = 2 * 1024 * 1024;
/** The quality floor, stricter than the page tray's (1,600 px / 0.4): NEVER shrink below it to hit a target. */
export const SHRINK_FLOOR_LONG_EDGE = 2000;
export const SHRINK_FLOOR_QUALITY = 0.75;
/** Walk down from 2400 px / 0.85, only until the file is under the target. Every rung is at or above the floor. */
export const SHRINK_RUNGS: ReadonlyArray<readonly [number, number]> = [
  [2400, 0.85],
  [2400, 0.8],
  [2400, 0.75],
  [2200, 0.8],
  [2200, 0.75],
  [2000, 0.8],
  [2000, 0.75],
];
/** Hard cap on the whole shrink; past it (or projected past it after page 1) the original is sent. */
export const SHRINK_BUDGET_MS = 20_000;
/** Pages are rendered once at this edge and quality, then the ladder re-encodes from them. */
const SOURCE_LONG_EDGE = 2400;
const SOURCE_QUALITY = 0.92;
/** A paper longer than this is not shrunk (memory on a cheap phone): the original is sent. */
export const SHRINK_MAX_PAGES = 40;

export type ShrinkOutcome =
  | "small" // not a PDF over the trigger: untouched
  | "typed" // has a text layer: untouched, the server reads the layer
  | "typed-rasterised" // typed but over the ceiling: rasterised, text layer dropped
  | "shrunk" // under the target on the ladder
  | "floor" // the floor version, smaller than the original but still over the target
  | "kept-original" // nothing smaller was found
  | "timeout" // budget hit or projected: original
  | "error"; // anything went wrong: original

export interface ShrinkReport {
  outcome: ShrinkOutcome;
  beforeBytes: number;
  afterBytes: number;
  pages: number;
  ms: number;
  /** True when a typed PDF's text layer was dropped (only "typed-rasterised"). */
  textLayerDropped: boolean;
  /** Why a shrink fell back to the original (outcome "error" only): a short message, never file content. */
  error?: string;
  /** The ladder rung that was kept, when one was. */
  rung?: { longEdge: number; quality: number } | null;
}

/** What the shrink needs from a PDF engine. Injected so tests (and the node eval) need no browser. */
export interface PdfDocumentHandle {
  numPages: number;
  firstPageHasText(): Promise<boolean>;
  /** Render page `index` (0-based) with its long edge at `longEdge` px, as a JPEG at `quality`. */
  renderPage(index: number, longEdge: number, quality: number): Promise<PdfPageInput>;
  destroy(): void;
}
export type OpenPdf = (bytes: Uint8Array) => Promise<PdfDocumentHandle>;

export interface ShrinkOptions {
  open?: OpenPdf;
  /** Re-encoder for the ladder (default: the canvas one the page tray uses). */
  reencode?: PageReencoder;
  assemble?: typeof assemblePagesPdf;
  now?: () => number;
  budgetMs?: number;
  /** Called after each rendered page: (done, total). */
  onProgress?: (done: number, total: number) => void;
  onReport?: (report: ShrinkReport) => void;
}

export interface ShrinkResult {
  file: File;
  report: ShrinkReport;
}

class ShrinkTimeout extends Error {
  constructor() {
    super("shrink budget exceeded");
    this.name = "ShrinkTimeout";
  }
}

export type PdfByteClass = "typed" | "scanned" | "unknown";

/**
 * A cheap look at the raw bytes, before pdf.js is loaded. PDF objects can sit in compressed streams, so the
 * ABSENCE of a /Font proves nothing; its PRESENCE does. Only "typed" is acted on without pdf.js.
 */
export function classifyPdfBytes(bytes: Uint8Array): PdfByteClass {
  const text = new TextDecoder("latin1").decode(bytes);
  if (/\/Type\s*\/Font\b|\/Font\s*<<|\/Font\s+\d+\s+\d+\s+R/.test(text)) return "typed";
  if (/\/ObjStm\b/.test(text)) return "unknown";
  return /\/Subtype\s*\/Image\b/.test(text) ? "scanned" : "unknown";
}

function toPdfFile(bytes: Uint8Array, name: string): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], name, { type: "application/pdf" });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** The pdf.js engine, loaded ONLY here and ONLY by dynamic import(), so it never rides in a page bundle. The
 *  LEGACY build is used so an old Android WebView can run it; any failure falls back to the original file. */
export const openWithPdfjs: OpenPdf = async (bytes) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerSrc } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  // pdf.js transfers (detaches) the buffer it is given: hand it a copy so the original bytes stay usable.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    async firstPageHasText() {
      const page = await doc.getPage(1);
      const content = await page.getTextContent();
      page.cleanup();
      return content.items.some((it) => "str" in it && typeof it.str === "string" && it.str.trim().length > 0);
    },
    async renderPage(index, longEdge, quality) {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = longEdge / Math.max(base.width, base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      const data = canvas.toDataURL("image/jpeg", quality).split(",")[1] || "";
      const out = { base64: data, mimeType: "image/jpeg", width: canvas.width, height: canvas.height };
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      return out;
    },
    destroy() {
      void task.destroy();
    },
  };
};

/**
 * Shrink a picked PDF if (and only if) it is big, scanned, and the shrink is provably smaller. Never throws:
 * every failure returns the original file.
 */
export async function shrinkPdf(file: File, opts: ShrinkOptions = {}): Promise<ShrinkResult> {
  const now = opts.now ?? (() => Date.now());
  const started = now();
  const budget = opts.budgetMs ?? SHRINK_BUDGET_MS;
  const base: ShrinkReport = {
    outcome: "small",
    beforeBytes: file.size,
    afterBytes: file.size,
    pages: 0,
    ms: 0,
    textLayerDropped: false,
  };
  const finish = (outcome: ShrinkOutcome, out: File, extra: Partial<ShrinkReport> = {}): ShrinkResult => {
    const report: ShrinkReport = { ...base, ...extra, outcome, afterBytes: out.size, ms: now() - started };
    try {
      opts.onReport?.(report);
    } catch {
      /* telemetry never blocks an upload */
    }
    return { file: out, report };
  };

  if (file.type !== "application/pdf" || file.size <= SHRINK_TRIGGER_BYTES) return finish("small", file);

  let handle: PdfDocumentHandle | null = null;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const klass = classifyPdfBytes(bytes);
    const overCeiling = file.size > MAX_UPLOAD_PDF_BYTES;
    if (klass === "typed" && !overCeiling) return finish("typed", file);

    handle = await (opts.open ?? openWithPdfjs)(bytes);
    base.pages = handle.numPages;
    if (handle.numPages < 1 || handle.numPages > SHRINK_MAX_PAGES) return finish("kept-original", file);

    let typed = klass === "typed";
    if (!typed) typed = await handle.firstPageHasText();
    if (typed && !overCeiling) return finish("typed", file);

    const deadline = started + budget;
    const check = () => {
      if (now() > deadline) throw new ShrinkTimeout();
    };

    // Render once at the top of the ladder. After page 1 project the whole job and give up early if it cannot
    // finish inside the budget (a slow phone must never be made to wait for a shrink).
    const sources: PdfPageInput[] = [];
    for (let i = 0; i < handle.numPages; i += 1) {
      check();
      const t0 = now();
      sources.push(await handle.renderPage(i, SOURCE_LONG_EDGE, SOURCE_QUALITY));
      if (i === 0) {
        const projected = (now() - t0) * handle.numPages;
        if (projected > budget) throw new ShrinkTimeout();
      }
      opts.onProgress?.(i + 1, handle.numPages);
    }
    handle.destroy();
    handle = null;

    const baseReencode = opts.reencode ?? canvasReencoder;
    const reencode: PageReencoder = async (p, edge, q) => {
      check();
      return baseReencode(p, edge, q);
    };
    const assemble = opts.assemble ?? assemblePagesPdf;
    const common = { reencode, maxPages: SHRINK_MAX_PAGES } as const;
    const name = file.name;
    const dropped = typed;

    let chosen: { bytes: Uint8Array; outcome: ShrinkOutcome; rung: { longEdge: number; quality: number } | null } | null = null;
    try {
      const out = await assemble(sources, { ...common, rungs: SHRINK_RUNGS, capBytes: SHRINK_TARGET_BYTES });
      chosen = { bytes: b64ToBytes(out.base64), outcome: "shrunk", rung: rungOf(out.pages[0]) };
    } catch (err) {
      if (!(err instanceof PagesTooLargeError)) throw err;
      // The floor is reached and the file is still over the target: send the floor version only if it is smaller
      // than the original.
      const floor: ReadonlyArray<readonly [number, number]> = [[SHRINK_FLOOR_LONG_EDGE, SHRINK_FLOOR_QUALITY]];
      try {
        const out = await assemble(sources, { ...common, rungs: floor, capBytes: file.size - 1 });
        chosen = { bytes: b64ToBytes(out.base64), outcome: "floor", rung: { longEdge: SHRINK_FLOOR_LONG_EDGE, quality: SHRINK_FLOOR_QUALITY } };
      } catch (err2) {
        if (!(err2 instanceof PagesTooLargeError)) throw err2;
      }
    }

    if (!chosen || chosen.bytes.byteLength >= file.size) return finish("kept-original", file);
    if (dropped) {
      // A typed PDF is rasterised only to fit the ceiling: if it still does not, send the original (the guard refuses it).
      if (chosen.bytes.byteLength > MAX_UPLOAD_PDF_BYTES) return finish("kept-original", file);
      return finish("typed-rasterised", toPdfFile(chosen.bytes, name), { textLayerDropped: true, rung: chosen.rung });
    }
    return finish(chosen.outcome, toPdfFile(chosen.bytes, name), { rung: chosen.rung });
  } catch (err) {
    return err instanceof ShrinkTimeout
      ? finish("timeout", file)
      : finish("error", file, { error: String(err instanceof Error ? err.message : err).slice(0, 160) });
  } finally {
    try {
      handle?.destroy();
    } catch {
      /* already gone */
    }
  }
}

function rungOf(page: { width: number; height: number; quality: number | null } | undefined) {
  if (!page || page.quality == null) return null;
  return { longEdge: Math.max(page.width, page.height), quality: page.quality };
}
