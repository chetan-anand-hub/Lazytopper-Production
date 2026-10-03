// src/services/assemblePagesPdf.ts
//
// SEVERAL PAGES, ONE UPLOAD (UPLOAD-2, owner ruling R6 / R8).
//
// A solution often runs to several pages. The student photographs each page; this
// assembles them ON THE DEVICE into ONE multi-page PDF — one JPEG per page, in tray
// order — and every grader path already reads a PDF natively, page by page.
//
// ★ WHY A PDF AND NEVER A STITCHED IMAGE (cofounder ruling, 4 Oct). A tall stitched
// image is downscaled along its LONG edge: four pages stitched at a 2,000 px cap leave
// each page ~500 px tall, and the handwriting becomes unreadable. A PDF keeps every
// page at its own full long edge — never below PHOTO_MIN_LONG_EDGE (1,600 px).
//
// The size budget is spent TOGETHER: when the pages do not fit, every page steps down
// one rung at the same time (quality first, then the 1,600 px floor) rather than one
// page being crushed to make room for the others.
//
// `jspdf` is loaded ONLY here and ONLY via dynamic import(), so it never rides in the
// page bundle — it is fetched the moment a second page is added, not before.

import {
  PHOTO_MAX_LONG_EDGE,
  PHOTO_MIN_LONG_EDGE,
  base64ByteLength,
  base64ToBytes,
  bytesToBase64,
} from "./preparePhoto";
import { MAX_UPLOAD_PAGES, PAGES_PDF_TARGET_BYTES } from "./uploadLimits";

/** One page as the tray holds it: an already-prepared photo (≤ 2,000 px, JPEG or PNG). */
export interface PdfPageInput {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

/** One page as it went into the PDF. */
export interface EncodedPage {
  base64: string;
  width: number;
  height: number;
}

/** Re-encode a page at (long edge, quality). Injected so tests can run without a canvas. */
export type PageReencoder = (page: PdfPageInput, longEdge: number, quality: number) => Promise<EncodedPage>;

/** The rungs, tried in order, applied to EVERY page at once. Quality steps down at the
 *  full long edge first, then the edge drops to the 1,600 px floor — and never below. */
export const PDF_RUNGS: ReadonlyArray<readonly [number, number]> = [
  [PHOTO_MAX_LONG_EDGE, 0.85],
  [PHOTO_MAX_LONG_EDGE, 0.75],
  [PHOTO_MAX_LONG_EDGE, 0.65],
  [PHOTO_MAX_LONG_EDGE, 0.55],
  [PHOTO_MIN_LONG_EDGE, 0.65],
  [PHOTO_MIN_LONG_EDGE, 0.55],
  [PHOTO_MIN_LONG_EDGE, 0.45],
  [PHOTO_MIN_LONG_EDGE, 0.4],
];

/** What a student reads when even the floor cannot fit. */
export const PAGES_TOO_LARGE_MESSAGE =
  "These pages are too much to send in one go. Try fewer pages, or a closer photo of each answer.";

export class PagesTooLargeError extends Error {
  constructor() {
    super(PAGES_TOO_LARGE_MESSAGE);
    this.name = "PagesTooLargeError";
  }
}

export interface AssembledPdf {
  base64: string;
  bytes: number;
  pageCount: number;
  /** Each page as embedded, in order. */
  pages: Array<{ width: number; height: number; quality: number | null }>;
}

/** PDF page width in points (A4 width); each page's height follows its photo. */
const PAGE_WIDTH_PT = 595.28;
/** Per-page structural overhead used to skip building a PDF that cannot fit. */
const PER_PAGE_OVERHEAD = 1024;

function longEdgeOf(p: { width: number; height: number }): number {
  return Math.max(p.width, p.height);
}

/** The default re-encoder: decode the prepared page (small — ≤ 2,000 px) and draw it
 *  at the rung's long edge and quality. */
export const canvasReencoder: PageReencoder = async (page, longEdge, quality) => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("We couldn't prepare one of your pages. Try taking it again."));
    el.src = `data:${page.mimeType};base64,${page.base64}`;
  });
  const scale = Math.min(1, longEdge / Math.max(page.width, page.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(page.width * scale));
  canvas.height = Math.max(1, Math.round(page.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("We couldn't prepare your pages on this device.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return {
    base64: canvas.toDataURL("image/jpeg", quality).split(",")[1] || "",
    width: canvas.width,
    height: canvas.height,
  };
};

type JsPdfModule = typeof import("jspdf");

/**
 * Assemble 2..8 prepared pages into ONE PDF under the cap. Throws PagesTooLargeError
 * (a student-worded message) when even the floor does not fit.
 */
export async function assemblePagesPdf(
  pages: PdfPageInput[],
  opts: {
    capBytes?: number;
    reencode?: PageReencoder;
    loadJsPdf?: () => Promise<JsPdfModule>;
  } = {},
): Promise<AssembledPdf> {
  if (pages.length === 0) throw new Error("Add a page first.");
  if (pages.length > MAX_UPLOAD_PAGES) throw new Error(`At most ${MAX_UPLOAD_PAGES} pages per upload.`);
  const capBytes = opts.capBytes ?? PAGES_PDF_TARGET_BYTES;
  const reencode = opts.reencode ?? canvasReencoder;
  const loadJsPdf = opts.loadJsPdf ?? (() => import("jspdf"));

  // Rung 0: every page exactly as the photo step prepared it (no second encode) — as
  // long as it is a JPEG within the long-edge cap. A PNG screenshot is re-encoded: a PDF
  // page is a JPEG.
  const asPrepared = pages.every((p) => p.mimeType === "image/jpeg" && longEdgeOf(p) <= PHOTO_MAX_LONG_EDGE);
  const candidates: Array<() => Promise<{ encoded: EncodedPage[]; quality: number | null }>> = [];
  if (asPrepared) {
    candidates.push(async () => ({
      encoded: pages.map((p) => ({ base64: p.base64, width: p.width, height: p.height })),
      quality: null,
    }));
  }
  for (const [edge, quality] of PDF_RUNGS) {
    candidates.push(async () => {
      const encoded: EncodedPage[] = [];
      // One page at a time: never more than one decoded page in memory.
      for (const p of pages) {
        encoded.push(await reencode(p, Math.min(edge, longEdgeOf(p)), quality));
      }
      return { encoded, quality };
    });
  }

  let jspdf: JsPdfModule | null = null;
  for (const candidate of candidates) {
    const { encoded, quality } = await candidate();
    const estimate =
      encoded.reduce((sum, e) => sum + base64ByteLength(e.base64), 0) + PER_PAGE_OVERHEAD * encoded.length;
    if (estimate > capBytes) continue;
    jspdf = jspdf ?? (await loadJsPdf());
    const pdfBytes = buildPdf(jspdf, encoded);
    if (pdfBytes.byteLength > capBytes) continue;
    return {
      base64: bytesToBase64(pdfBytes),
      bytes: pdfBytes.byteLength,
      pageCount: encoded.length,
      pages: encoded.map((e) => ({ width: e.width, height: e.height, quality })),
    };
  }
  throw new PagesTooLargeError();
}

function buildPdf(mod: JsPdfModule, encoded: EncodedPage[]): Uint8Array {
  const { jsPDF } = mod;
  let doc: InstanceType<typeof jsPDF> | null = null;
  for (const page of encoded) {
    const w = PAGE_WIDTH_PT;
    const h = (PAGE_WIDTH_PT * page.height) / Math.max(1, page.width);
    const orientation = w > h ? "landscape" : "portrait";
    if (!doc) {
      doc = new jsPDF({ unit: "pt", format: [w, h], orientation, compress: true });
    } else {
      doc.addPage([w, h], orientation);
    }
    doc.addImage(base64ToBytes(page.base64), "JPEG", 0, 0, w, h, undefined, "NONE");
  }
  if (!doc) throw new Error("Add a page first.");
  return new Uint8Array(doc.output("arraybuffer"));
}
