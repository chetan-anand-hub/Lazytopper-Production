/**
 * GRADE-ROUTE-1 (A3) - read a LazyTopper paper code from an uploaded PDF DETERMINISTICALLY: the PDF's own metadata
 * (Title / Subject / Keywords) and the text layer of its first pages. No model call, no network, runs in the browser
 * before/independent of the question read, and survives a renamed file.
 *
 * pdf.js is loaded by dynamic import only when a PDF is actually present (own chunk, never the entry). Any failure
 * (not a PDF, encrypted, worker blocked, huge) -> an empty list: the page is unchanged. Image uploads: not handled here.
 */
export const PDF_TEXT_PAGES = 2;

export type PdfTextLoader = (bytes: Uint8Array) => Promise<{
  meta: Array<string | null | undefined>;
  pages: string[];
}>;

const loadWithPdfjs: PdfTextLoader = async (bytes) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerSrc } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  try {
    const md = await doc.getMetadata().catch(() => null);
    const info = (md?.info ?? {}) as Record<string, unknown>;
    const meta = ["Title", "Subject", "Keywords"].map((k) => (typeof info[k] === "string" ? (info[k] as string) : null));
    const pages: string[] = [];
    const last = Math.min(PDF_TEXT_PAGES, doc.numPages);
    for (let p = 1; p <= last; p += 1) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      page.cleanup();
      pages.push(content.items.map((it) => ("str" in it && typeof it.str === "string" ? it.str : "")).join(" "));
    }
    return { meta, pages };
  } finally {
    void task.destroy();
  }
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** The metadata strings and first-page text of an uploaded PDF (base64), for the code match. [] on any failure. */
export async function readPdfPaperText(
  base64: string | null | undefined,
  mime: string | null | undefined,
  load: PdfTextLoader = loadWithPdfjs,
): Promise<string[]> {
  if (!base64 || mime !== "application/pdf") return [];
  try {
    const { meta, pages } = await load(b64ToBytes(base64));
    return [...meta, ...pages].filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}
